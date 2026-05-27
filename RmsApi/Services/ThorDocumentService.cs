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
            // Reset stream position to ensure we read from the beginning
            if (fileStream.CanSeek)
            {
                fileStream.Position = 0;
            }

            // Read the entire file into a byte array to avoid stream position issues
            using var memoryStream = new MemoryStream();
            await fileStream.CopyToAsync(memoryStream);
            var fileBytes = memoryStream.ToArray();

            _logger.LogInformation("THOR: Preparing upload for '{FileName}', size = {Size} bytes", fileName, fileBytes.Length);

            if (fileBytes.Length == 0)
            {
                _logger.LogError("THOR: File '{FileName}' has 0 bytes — nothing to upload", fileName);
                return null;
            }

            using var content = new MultipartFormDataContent();
            var byteContent = new ByteArrayContent(fileBytes);

            // Send correct MIME type based on extension — THOR Python docs show this explicitly
            // e.g. ('file',('sample_file.txt',open(...),'text/plain'))
            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            var mimeType = ext switch
            {
                ".pdf" => "application/pdf",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".txt" => "text/plain",
                ".rtf" => "application/rtf",
                _ => "application/octet-stream"
            };
            byteContent.Headers.ContentType = new MediaTypeHeaderValue(mimeType);

            // Make filename unique for THOR — it rejects duplicates
            var uniqueFileName = $"{Guid.NewGuid():N}{ext}";
            content.Add(byteContent, "file", uniqueFileName);

            // Log first bytes for debugging
            var headerHex = BitConverter.ToString(fileBytes, 0, Math.Min(16, fileBytes.Length));
            _logger.LogInformation("THOR: Uploading as '{UniqueName}', first bytes: {Header}", uniqueFileName, headerHex);

            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/thor/doc/upload_document")
            {
                Content = content
            };
            request.Headers.TryAddWithoutValidation("Authorization", _apiKey);

            var response = await _httpClient.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("THOR upload response ({StatusCode}): {Response}",
                response.StatusCode, json.Length > 500 ? json[..500] : json);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("THOR upload failed: HTTP {StatusCode} — {Response}", response.StatusCode, json);
                return null;
            }

            var result = JsonSerializer.Deserialize<ThorApiResponse<ThorUploadResult>>(json, JsonOpts);
            return result?.Result != null
                ? new ThorUploadResponse { JobId = result.Result.JobId, FileName = result.Result.FileName }
                : null;
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
            request.Headers.Add("Access-Control-Allow-Origin", "*");
            request.Headers.Add("access-control-allow-credentials", "true");

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
