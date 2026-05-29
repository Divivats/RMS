using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace RmsApi.Services
{
    /// <summary>
    /// Integration with Samsung THOR RAG API for document text extraction.
    /// Uploads documents, waits for processing, then extracts full text via LLM prompt.
    /// Handles NASCA DRM-protected files because THOR runs on a trusted corporate server.
    /// </summary>
    public class ThorDocumentService
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;
        private readonly string _apiKey;
        private readonly ILogger<ThorDocumentService> _logger;

        // Polling config
        private const int PollIntervalMs = 2000;   // 2 seconds between polls
        private const int MaxPollAttempts = 45;     // 45 × 2s = 90 seconds max wait

        public ThorDocumentService(HttpClient httpClient, IConfiguration config, ILogger<ThorDocumentService> logger)
        {
            _httpClient = httpClient;
            _baseUrl = (config["Thor:BaseUrl"] ?? "http://thor-api.a-sol.samsungsmartwork.net").TrimEnd('/');
            _apiKey = config["Thor:ApiKey"] ?? "";
            _logger = logger;

            _httpClient.Timeout = TimeSpan.FromSeconds(120);
        }

        // ════════════════════════════════════════
        //  Public API
        // ════════════════════════════════════════

        /// <summary>
        /// Full pipeline: Upload file → wait for processing → extract text → delete from THOR.
        /// Returns the extracted resume text.
        /// </summary>
        public async Task<ThorExtractionResult> ExtractTextFromFileAsync(Stream fileStream, string fileName)
        {
            // 1. Upload document
            _logger.LogInformation("THOR: Uploading document '{FileName}'...", fileName);
            var uploadResult = await UploadDocumentAsync(fileStream, fileName);

            if (uploadResult == null || string.IsNullOrEmpty(uploadResult.JobId))
            {
                return new ThorExtractionResult
                {
                    Success = false,
                    ErrorMessage = "THOR upload failed — the API did not return a job ID."
                };
            }

            _logger.LogInformation("THOR: Upload successful, job_id={JobId}", uploadResult.JobId);

            try
            {
                // 2. Wait for processing
                _logger.LogInformation("THOR: Waiting for document processing...");
                var status = await WaitForProcessingAsync(uploadResult.JobId);

                if (status != "SUCCESS")
                {
                    return new ThorExtractionResult
                    {
                        Success = false,
                        ErrorMessage = $"THOR document processing failed with status: {status}"
                    };
                }

                _logger.LogInformation("THOR: Document processed successfully, extracting text...");

                // 3. Extract text via RAG prompt
                var text = await ExtractTextAsync(uploadResult.JobId);

                if (string.IsNullOrWhiteSpace(text))
                {
                    return new ThorExtractionResult
                    {
                        Success = false,
                        ErrorMessage = "THOR returned empty text after extraction."
                    };
                }

                _logger.LogInformation("THOR: Extracted {Length} characters from '{FileName}'", text.Length, fileName);

                return new ThorExtractionResult
                {
                    Success = true,
                    ExtractedText = text,
                    JobId = uploadResult.JobId
                };
            }
            finally
            {
                // 4. Always try to delete from THOR after extraction (cleanup)
                try
                {
                    await DeleteDocumentAsync(uploadResult.JobId);
                    _logger.LogInformation("THOR: Cleaned up document {JobId} from THOR", uploadResult.JobId);
                }
                catch (Exception ex)
                {
                    // Non-fatal — if delete fails, just log and move on
                    _logger.LogWarning(ex, "THOR: Failed to delete document {JobId} from THOR (non-fatal)", uploadResult.JobId);
                }
            }
        }

        /// <summary>
        /// Check if THOR API is reachable.
        /// </summary>
        public async Task<bool> IsAvailableAsync()
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"{_baseUrl}/thor/doc/get_files");
                request.Headers.TryAddWithoutValidation("Authorization", _apiKey);

                var response = await _httpClient.SendAsync(request);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        // ════════════════════════════════════════
        //  THOR API — Upload Document
        // ════════════════════════════════════════

        private async Task<ThorUploadResponse?> UploadDocumentAsync(Stream fileStream, string fileName)
        {
            if (fileStream.CanSeek) fileStream.Position = 0;

            using var memoryStream = new MemoryStream();
            await fileStream.CopyToAsync(memoryStream);
            var fileBytes = memoryStream.ToArray();

            _logger.LogInformation("THOR: Preparing upload for '{FileName}', size = {Size} bytes", fileName, fileBytes.Length);

            if (fileBytes.Length == 0)
            {
                _logger.LogError("THOR: File '{FileName}' has 0 bytes — nothing to upload", fileName);
                return null;
            }

            var headerHex = BitConverter.ToString(fileBytes, 0, Math.Min(16, fileBytes.Length));
            _logger.LogInformation("THOR: Uploading '{FileName}', first bytes: {Header}", fileName, headerHex);

            // ── Use Python requests for upload (proven to work with THOR's FastAPI) ──
            // .NET HttpClient is incompatible with THOR's server regardless of header settings.
            var tempFilePath = Path.Combine(Path.GetTempPath(), $"thor_{Guid.NewGuid():N}{Path.GetExtension(fileName)}");
            try
            {
                await File.WriteAllBytesAsync(tempFilePath, fileBytes);

                // Find thor_upload.py script
                var scriptPath = Path.Combine(AppContext.BaseDirectory, "thor_upload.py");
                if (!File.Exists(scriptPath))
                    scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "thor_upload.py");

                if (!File.Exists(scriptPath))
                {
                    _logger.LogError("THOR: thor_upload.py not found");
                    return null;
                }

                _logger.LogInformation("THOR: Using Python upload via {ScriptPath}", scriptPath);

                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "python",
                    Arguments = $"\"{scriptPath}\" \"{tempFilePath}\" \"{_apiKey}\" \"{_baseUrl}\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = System.Diagnostics.Process.Start(psi);
                if (process == null)
                {
                    _logger.LogError("THOR: Failed to start Python process");
                    return null;
                }

                var stdout = await process.StandardOutput.ReadToEndAsync();
                var stderr = await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();

                _logger.LogInformation("THOR: Python upload result: {Output}", stdout);
                if (!string.IsNullOrEmpty(stderr))
                    _logger.LogWarning("THOR: Python stderr: {Stderr}", stderr);

                if (process.ExitCode != 0 || string.IsNullOrWhiteSpace(stdout))
                {
                    _logger.LogError("THOR: Python upload failed (exit code {ExitCode})", process.ExitCode);
                    return null;
                }

                var pyResult = JsonSerializer.Deserialize<PythonUploadResult>(stdout, JsonOpts);
                if (pyResult == null || !pyResult.Success || string.IsNullOrEmpty(pyResult.JobId))
                {
                    _logger.LogError("THOR upload failed via Python: {Error}", pyResult?.Error ?? "Unknown error");
                    return null;
                }

                _logger.LogInformation("THOR: Upload SUCCESS — job_id={JobId}", pyResult.JobId);
                return new ThorUploadResponse { JobId = pyResult.JobId, FileName = pyResult.Filename ?? fileName };
            }
            finally
            {
                try { if (File.Exists(tempFilePath)) File.Delete(tempFilePath); } catch { }
            }
        }

        // ════════════════════════════════════════
        //  THOR API — Poll File Status
        // ════════════════════════════════════════

        private async Task<string> WaitForProcessingAsync(string jobId)
        {
            for (int attempt = 0; attempt < MaxPollAttempts; attempt++)
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"{_baseUrl}/thor/doc/file_status/{jobId}");
                request.Headers.TryAddWithoutValidation("Authorization", _apiKey);

                var response = await _httpClient.SendAsync(request);
                var json = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    var result = JsonSerializer.Deserialize<ThorApiResponse<ThorFileStatusResult>>(json, JsonOpts);
                    var status = result?.Result?.Status ?? "UNKNOWN";

                    _logger.LogInformation("THOR: file_status poll #{Attempt}: {Status}", attempt + 1, status);

                    if (status == "SUCCESS") return "SUCCESS";
                    if (status == "FAILURE") return "FAILURE";

                    // Still processing (PENDING, STARTED) — wait and retry
                }
                else
                {
                    _logger.LogWarning("THOR: file_status poll #{Attempt} failed: HTTP {StatusCode}", attempt + 1, response.StatusCode);
                }

                await Task.Delay(PollIntervalMs);
            }

            _logger.LogError("THOR: Timed out waiting for document processing after {MaxAttempts} attempts", MaxPollAttempts);
            return "TIMEOUT";
        }

        // ════════════════════════════════════════
        //  THOR API — Extract Text via get_answer
        // ════════════════════════════════════════

        private async Task<string> ExtractTextAsync(string jobId)
        {
            var payload = new
            {
                prompt = "Extract and return ALL text content from this document exactly as it appears. " +
                         "Preserve the original formatting, sections, headings, bullet points, and structure. " +
                         "Do not summarize, interpret, or modify any content — return the complete raw text.",
                file_job_id = new[] { jobId },
                language = "english"
            };

            var jsonPayload = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/thor/prompt/get_answer")
            {
                Content = content
            };
            request.Headers.TryAddWithoutValidation("Authorization", _apiKey);

            // THOR streams the response as text/plain
            using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogError("THOR get_answer failed: HTTP {StatusCode} — {Response}", response.StatusCode, errorBody);
                return "";
            }

            // Read the streaming response fully
            var sb = new StringBuilder();
            using var stream = await response.Content.ReadAsStreamAsync();
            using var reader = new StreamReader(stream);

            var buffer = new char[4096];
            int bytesRead;
            while ((bytesRead = await reader.ReadAsync(buffer, 0, buffer.Length)) > 0)
            {
                sb.Append(buffer, 0, bytesRead);
            }

            return sb.ToString().Trim();
        }

        // ════════════════════════════════════════
        //  THOR API — Delete Document (cleanup)
        // ════════════════════════════════════════

        private async Task DeleteDocumentAsync(string jobId)
        {
            // Try DELETE endpoint (common REST pattern) — may or may not exist
            var request = new HttpRequestMessage(HttpMethod.Delete, $"{_baseUrl}/thor/doc/delete_document/{jobId}");
            request.Headers.TryAddWithoutValidation("Authorization", _apiKey);

            try
            {
                var response = await _httpClient.SendAsync(request);
                _logger.LogInformation("THOR delete response: HTTP {StatusCode}", response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "THOR delete endpoint not available (this is expected if THOR doesn't support DELETE)");
            }
        }

        // ════════════════════════════════════════
        //  JSON Models
        // ════════════════════════════════════════

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        };

        private class ThorApiResponse<T>
        {
            [JsonPropertyName("status")]
            public string Status { get; set; } = "";

            [JsonPropertyName("result")]
            public T? Result { get; set; }
        }

        private class ThorUploadResult
        {
            [JsonPropertyName("job_id")]
            public string JobId { get; set; } = "";

            [JsonPropertyName("filename")]
            public string FileName { get; set; } = "";
        }

        private class ThorFileStatusResult
        {
            [JsonPropertyName("file_name")]
            public string FileName { get; set; } = "";

            [JsonPropertyName("status")]
            public string Status { get; set; } = "";
        }

        private class ThorUploadResponse
        {
            public string JobId { get; set; } = "";
            public string FileName { get; set; } = "";
        }

        private class PythonUploadResult
        {
            [JsonPropertyName("success")]
            public bool Success { get; set; }

            [JsonPropertyName("status_code")]
            public int StatusCode { get; set; }

            [JsonPropertyName("job_id")]
            public string JobId { get; set; } = "";

            [JsonPropertyName("filename")]
            public string? Filename { get; set; }

            [JsonPropertyName("error")]
            public string Error { get; set; } = "";
        }
    }

    // ── Public result model ──

    public class ThorExtractionResult
    {
        public bool Success { get; set; }
        public string ExtractedText { get; set; } = "";
        public string? JobId { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
