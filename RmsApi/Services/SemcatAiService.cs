using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace RmsApi.Services
{
    /// <summary>
    /// Integration with locally-hosted SEMCAT GPT OSS 120B (SEM_GO120) model.
    /// Sends resume + JD text for semantic AI analysis.
    /// </summary>
    public class SemcatAiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;
        private readonly string _apiKey;
        private readonly string _modelName;
        private readonly ILogger<SemcatAiService> _logger;

        public SemcatAiService(HttpClient httpClient, IConfiguration config, ILogger<SemcatAiService> logger)
        {
            _httpClient = httpClient;
            _baseUrl = config["Semcat:BaseUrl"] ?? "http://166.79.26.108:2048/semcat";
            _apiKey = config["Semcat:ApiKey"] ?? "";
            _modelName = config["Semcat:ModelName"] ?? "SEM_GO120";
            _logger = logger;

            _httpClient.Timeout = TimeSpan.FromSeconds(60); // 120B can be slow
        }

        /// <summary>
        /// Check if the SEMCAT API is reachable and the model is available.
        /// </summary>
        public async Task<bool> IsAvailableAsync()
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"{_baseUrl}/get_models");
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);

                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode) return false;

                var json = await response.Content.ReadAsStringAsync();
                return json.Contains(_modelName, StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Send resume + JD to the AI model for semantic ATS analysis.
        /// Returns structured analysis or null if unavailable.
        /// </summary>
        public async Task<AiAnalysisResult?> AnalyzeResumeAsync(string resumeText, string? jobDescription, string? jobRequirements)
        {
            try
            {
                var messages = BuildAtsPrompt(resumeText, jobDescription ?? "", jobRequirements ?? "");

                var payload = new
                {
                    messages = messages,
                    mdl_name = _modelName,
                    max_tokens = 2048,
                    temperature = 0.2
                };

                var jsonPayload = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/get_answer")
                {
                    Content = content
                };
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);

                // Read streamed response fully
                using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
                response.EnsureSuccessStatusCode();

                var fullResponse = new StringBuilder();
                using var stream = await response.Content.ReadAsStreamAsync();
                using var reader = new StreamReader(stream);

                var buffer = new char[1024];
                int bytesRead;
                while ((bytesRead = await reader.ReadAsync(buffer, 0, buffer.Length)) > 0)
                {
                    fullResponse.Append(buffer, 0, bytesRead);
                }

                var responseText = fullResponse.ToString().Trim();
                _logger.LogInformation("SEMCAT AI raw response length: {Length}", responseText.Length);

                return ParseAiResponse(responseText);
            }
            catch (TaskCanceledException)
            {
                _logger.LogWarning("SEMCAT AI request timed out");
                return null;
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(ex, "SEMCAT AI is unreachable");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SEMCAT AI analysis failed");
                return null;
            }
        }

        private List<Dictionary<string, string>> BuildAtsPrompt(string resumeText, string jd, string requirements)
        {
            // Truncate resume text if too long (to avoid token limits)
            if (resumeText.Length > 8000)
                resumeText = resumeText[..8000] + "\n[... truncated]";

            var systemPrompt = @"You are an expert ATS (Applicant Tracking System) resume analyzer.

CRITICAL OUTPUT RULES:
1. You MUST respond with ONLY a single valid JSON object.
2. Do NOT include any text before or after the JSON.
3. Do NOT wrap the JSON in markdown code blocks (no ```json or ```).
4. Every string value MUST be enclosed in double quotes.
5. Every property name MUST be enclosed in double quotes.
6. Every array element MUST be separated by a comma.
7. Every property MUST be separated by a comma.
8. Do NOT include trailing commas before ] or }.
9. Numbers must be plain integers (no quotes, no letters after them).
10. The response must be parseable by a strict JSON parser.

Required JSON schema — follow EXACTLY:

{
  ""semantic_score"": 75,
  ""strengths"": [""strength 1"", ""strength 2"", ""strength 3""],
  ""weaknesses"": [""weakness 1"", ""weakness 2""],
  ""missing_skills"": [""skill 1"", ""skill 2""],
  ""matched_skills"": [""skill 1"", ""skill 2"", ""skill 3""],
  ""role_fit_summary"": ""One paragraph summary of candidate fit."",
  ""improvement_suggestions"": [""suggestion 1"", ""suggestion 2""],
  ""experience_relevance"": 80,
  ""education_relevance"": 70
}

Field rules:
- semantic_score: integer 0-100, overall semantic match percentage
- strengths: array of 3-5 strings, key strengths for this role
- weaknesses: array of 2-4 strings, areas where candidate falls short
- missing_skills: array of strings, skills from JD not found in resume
- matched_skills: array of strings, skills that match between resume and JD
- role_fit_summary: single string, one paragraph recruiter-style summary
- improvement_suggestions: array of 2-4 strings, actionable suggestions
- experience_relevance: integer 0-100
- education_relevance: integer 0-100

Be objective. Do NOT inflate scores. Output ONLY the JSON object, nothing else.";

            var userPrompt = $@"=== JOB DESCRIPTION ===
{jd}

=== JOB REQUIREMENTS ===
{requirements}

=== CANDIDATE RESUME ===
{resumeText}

Analyze this resume against the job description. Respond with ONLY a valid JSON object matching the schema above. No explanations, no markdown, no extra text — just the JSON.";

            return new List<Dictionary<string, string>>
            {
                new() { { "role", "system" }, { "content", systemPrompt } },
                new() { { "role", "user" }, { "content", userPrompt } }
            };
        }

        private AiAnalysisResult? ParseAiResponse(string responseText)
        {
            try
            {
                // Try to extract JSON from the response (in case model adds extra text)
                var jsonStart = responseText.IndexOf('{');
                var jsonEnd = responseText.LastIndexOf('}');

                if (jsonStart < 0 || jsonEnd < 0 || jsonEnd <= jsonStart)
                {
                    // Try to recover: if response looks like truncated JSON (has "score" but no opening brace)
                    if (responseText.Contains("score") && responseText.Contains("}"))
                    {
                        _logger.LogWarning("SEMCAT response appears truncated — missing opening brace. Attempting recovery.");
                        // Prepend opening brace and try to reconstruct
                        var recovered = "{\"semantic_" + responseText;
                        jsonStart = recovered.IndexOf('{');
                        jsonEnd = recovered.LastIndexOf('}');
                        if (jsonStart >= 0 && jsonEnd > jsonStart)
                        {
                            responseText = recovered;
                        }
                        else
                        {
                            // Last resort: extract score via regex
                            var scoreMatch = Regex.Match(responseText, @"score""\s*:\s*(\d+)");
                            if (scoreMatch.Success && decimal.TryParse(scoreMatch.Groups[1].Value, out var fallbackScore))
                            {
                                _logger.LogInformation("Regex fallback from truncated response, score: {Score}", fallbackScore);
                                return new AiAnalysisResult { SemanticScore = fallbackScore };
                            }
                            _logger.LogWarning("No JSON found in AI response: {Response}", responseText[..Math.Min(200, responseText.Length)]);
                            return null;
                        }
                    }
                    else
                    {
                        _logger.LogWarning("No JSON found in AI response: {Response}", responseText[..Math.Min(200, responseText.Length)]);
                        return null;
                    }
                }

                var jsonStr = responseText[jsonStart..(jsonEnd + 1)];

                // Log raw JSON for debugging
                _logger.LogInformation("SEMCAT raw JSON (first 500 chars): {Json}", jsonStr[..Math.Min(500, jsonStr.Length)]);

                // ── Sanitize common LLM JSON issues ──

                // Fix unquoted property names: word_name: → "word_name":
                jsonStr = Regex.Replace(jsonStr, @"(?<=[\{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:", "\"$1\":");

                // Fix single-quoted strings: 'value' → "value"
                jsonStr = Regex.Replace(jsonStr, @"(?<=:\s*)'([^']*)'", "\"$1\"");

                // Fix missing commas between string array elements: "value1"\n  "value2" → "value1",\n  "value2"
                // Matches: closing quote, optional whitespace/newlines, opening quote (without comma between)
                jsonStr = Regex.Replace(jsonStr, @"""\s*\r?\n(\s*)""", "\",\n$1\"");

                // Fix missing commas between } and {, or ] and [ 
                jsonStr = Regex.Replace(jsonStr, @"}\s*\n(\s*){", "},\n$1{");
                jsonStr = Regex.Replace(jsonStr, @"]\s*\n(\s*)\[", "],\n$1[");

                // Fix trailing commas before } or ]: ,} → } and ,] → ]
                jsonStr = Regex.Replace(jsonStr, @",\s*([}\]])", "$1");

                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                    NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString
                };

                try
                {
                    return JsonSerializer.Deserialize<AiAnalysisResult>(jsonStr, options);
                }
                catch (JsonException firstEx)
                {
                    // Fallback 1: try stripping all newlines and re-fixing
                    _logger.LogWarning("First JSON parse failed, attempting aggressive cleanup: {Error}", firstEx.Message);
                    try
                    {
                        var cleaned = Regex.Replace(jsonStr, @"\s+", " ");
                        // Fix missing commas between adjacent strings
                        cleaned = Regex.Replace(cleaned, @"""\s+""", @""", """);
                        // Fix numbers followed by letters (garbled LLM output): 88s" → 88, "s
                        cleaned = Regex.Replace(cleaned, @"(\d+)\s*([a-zA-Z])", "$1, \"$2");
                        return JsonSerializer.Deserialize<AiAnalysisResult>(cleaned, options);
                    }
                    catch (JsonException)
                    {
                        // Fallback 2: extract just the semantic_score via regex
                        _logger.LogWarning("Aggressive cleanup also failed. Extracting semantic_score via regex fallback.");
                        var scoreMatch = Regex.Match(jsonStr, @"""semantic_score""\s*:\s*(\d+\.?\d*)");
                        if (scoreMatch.Success && decimal.TryParse(scoreMatch.Groups[1].Value, out var score))
                        {
                            _logger.LogInformation("Regex fallback extracted semantic_score: {Score}", score);
                            return new AiAnalysisResult { SemanticScore = score };
                        }
                        _logger.LogError("Could not extract semantic_score from garbled LLM response");
                        return null;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse AI JSON response");
                return null;
            }
        }
    }

    public class AiAnalysisResult
    {
        [JsonPropertyName("semantic_score")]
        public decimal SemanticScore { get; set; }

        [JsonPropertyName("strengths")]
        public List<string> Strengths { get; set; } = new();

        [JsonPropertyName("weaknesses")]
        public List<string> Weaknesses { get; set; } = new();

        [JsonPropertyName("missing_skills")]
        public List<string> MissingSkills { get; set; } = new();

        [JsonPropertyName("matched_skills")]
        public List<string> MatchedSkills { get; set; } = new();

        [JsonPropertyName("role_fit_summary")]
        public string RoleFitSummary { get; set; } = "";

        [JsonPropertyName("improvement_suggestions")]
        public List<string> ImprovementSuggestions { get; set; } = new();

        [JsonPropertyName("experience_relevance")]
        public decimal ExperienceRelevance { get; set; }

        [JsonPropertyName("education_relevance")]
        public decimal EducationRelevance { get; set; }
    }
}
