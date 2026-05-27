using System.Text.Json;

namespace RmsApi.Services
{
    /// <summary>
    /// Orchestrates the full ATS scoring pipeline:
    /// 1. Extract text from resume via THOR RAG API
    /// 2. Run deterministic keyword scoring (instant)
    /// 3. Run AI semantic analysis via SEMCAT (async)
    /// 4. Combine with 50/50 weighting
    /// Reports separate status for THOR and SEMCAT services.
    /// </summary>
    public class AtsOrchestrator
    {
        private readonly ResumeParserService _parser;
        private readonly AtsScoringService _scorer;
        private readonly SemcatAiService _aiService;
        private readonly ILogger<AtsOrchestrator> _logger;

        public AtsOrchestrator(
            ResumeParserService parser,
            AtsScoringService scorer,
            SemcatAiService aiService,
            ILogger<AtsOrchestrator> logger)
        {
            _parser = parser;
            _scorer = scorer;
            _aiService = aiService;
            _logger = logger;
        }

        /// <summary>
        /// Full pipeline: file → THOR text extraction → deterministic + AI → combined result.
        /// </summary>
        public async Task<AtsResult> ScoreResumeAsync(
            Stream resumeFile, string fileName,
            string? jobDescription, string? jobRequirements)
        {
            // 1. Extract text from resume via THOR
            var extraction = await _parser.ExtractTextAsync(resumeFile, fileName);

            if (!extraction.Success)
            {
                _logger.LogError("Resume text extraction failed for {FileName}: {Error}", fileName, extraction.ErrorMessage);
                return new AtsResult
                {
                    Status = "Error",
                    ThorStatus = extraction.ThorUnavailable ? "Unavailable" : "Error",
                    SemcatStatus = "Pending",
                    StatusMessage = extraction.ErrorMessage ?? "Failed to extract text from resume."
                };
            }

            var resumeText = extraction.Text;

            if (string.IsNullOrWhiteSpace(resumeText))
            {
                return new AtsResult
                {
                    Status = "Error",
                    ThorStatus = "Error",
                    SemcatStatus = "Pending",
                    StatusMessage = "No text could be extracted from the resume file."
                };
            }

            return await ScoreFromTextAsync(resumeText, jobDescription, jobRequirements);
        }

        /// <summary>
        /// Score from already-extracted resume text (used for re-scoring).
        /// THOR is not needed here since text is already available.
        /// </summary>
        public async Task<AtsResult> ScoreFromTextAsync(
            string resumeText, string? jobDescription, string? jobRequirements)
        {
            // 2. Deterministic scoring (instant)
            var deterministicResult = _scorer.CalculateScore(resumeText, jobDescription, jobRequirements);
            _logger.LogInformation("Deterministic ATS score: {Score}", deterministicResult.Score);

            // 3. AI semantic analysis (may take 2-10s, may fail)
            AiAnalysisResult? aiResult = null;
            try
            {
                aiResult = await _aiService.AnalyzeResumeAsync(resumeText, jobDescription, jobRequirements);
                if (aiResult != null)
                    _logger.LogInformation("AI semantic score: {Score}", aiResult.SemanticScore);
                else
                    _logger.LogWarning("SEMCAT AI returned null — model may be offline");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AI analysis failed, marking as unavailable");
            }

            // 4. Combine scores
            if (aiResult != null)
            {
                // Both engines available → blend sub-scores per category for richer analysis
                // Skills: blend deterministic skills match with AI matched_skills count
                var aiSkillsScore = (aiResult.MatchedSkills?.Count ?? 0) > 0
                    ? Math.Min(100m, ((aiResult.MatchedSkills!.Count) / Math.Max(1m, aiResult.MatchedSkills.Count + (aiResult.MissingSkills?.Count ?? 0))) * 100)
                    : aiResult.SemanticScore; // fallback to overall score
                var blendedSkills = (deterministicResult.SkillsMatch * 0.5) + ((double)aiSkillsScore * 0.5);

                // Experience: blend deterministic experience match with AI experience_relevance
                var blendedExperience = (deterministicResult.ExperienceMatch * 0.5) + ((double)aiResult.ExperienceRelevance * 0.5);

                // Education: blend deterministic education match with AI education_relevance
                var blendedEducation = (deterministicResult.EducationMatch * 0.5) + ((double)aiResult.EducationRelevance * 0.5);

                // Keywords: deterministic keyword density only (AI doesn't have an equivalent)
                var blendedKeywords = deterministicResult.KeywordDensity;

                // Final score: weighted average of blended sub-scores using same weights as deterministic
                // Skills 35% | Experience 25% | Education 20% | Keywords 15% | Certs 5%
                var finalScore = Math.Round(
                    (decimal)(blendedSkills * 0.35 + blendedExperience * 0.25 +
                              blendedEducation * 0.20 + blendedKeywords * 0.15) +
                    (deterministicResult.Score * 0.05m), // certs component from deterministic
                    2);
                finalScore = Math.Min(100, Math.Max(0, finalScore));

                // Merge matched/missing skills from both engines
                var allMatchedSkills = (deterministicResult.MatchedKeywords ?? new())
                    .Concat(aiResult.MatchedSkills ?? new())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(s => s)
                    .ToList();

                var allMissingSkills = (deterministicResult.MissingKeywords ?? new())
                    .Concat(aiResult.MissingSkills ?? new())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Where(s => !allMatchedSkills.Contains(s, StringComparer.OrdinalIgnoreCase)) // remove if matched by other engine
                    .OrderBy(s => s)
                    .ToList();

                var details = new AtsScoreDetailsJson
                {
                    DeterministicBreakdown = new DeterministicBreakdownJson
                    {
                        SkillsMatch = Math.Round(blendedSkills, 2),
                        ExperienceMatch = Math.Round(blendedExperience, 2),
                        EducationMatch = Math.Round(blendedEducation, 2),
                        KeywordDensity = Math.Round(blendedKeywords, 2)
                    },
                    MatchedKeywords = allMatchedSkills,
                    MissingKeywords = allMissingSkills,
                    AiAnalysis = new AiAnalysisJson
                    {
                        SemanticScore = aiResult.SemanticScore,
                        Strengths = aiResult.Strengths,
                        Weaknesses = aiResult.Weaknesses,
                        MissingSkills = aiResult.MissingSkills ?? new(),
                        MatchedSkills = aiResult.MatchedSkills ?? new(),
                        RoleFitSummary = aiResult.RoleFitSummary,
                        ImprovementSuggestions = aiResult.ImprovementSuggestions,
                        ExperienceRelevance = aiResult.ExperienceRelevance,
                        EducationRelevance = aiResult.EducationRelevance
                    }
                };

                return new AtsResult
                {
                    FinalScore = finalScore,
                    DeterministicScore = deterministicResult.Score,
                    AiScore = aiResult.SemanticScore,
                    ResumeText = resumeText,
                    DetailsJson = JsonSerializer.Serialize(details, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        WriteIndented = false
                    }),
                    Status = "Scored",
                    ThorStatus = "Success",
                    SemcatStatus = "Success",
                    StatusMessage = "Full ATS analysis complete (deterministic + AI blended per category)"
                };
            }
            else
            {
                // AI unavailable → no final score, store deterministic only
                var details = new AtsScoreDetailsJson
                {
                    DeterministicBreakdown = new DeterministicBreakdownJson
                    {
                        SkillsMatch = deterministicResult.SkillsMatch,
                        ExperienceMatch = deterministicResult.ExperienceMatch,
                        EducationMatch = deterministicResult.EducationMatch,
                        KeywordDensity = deterministicResult.KeywordDensity
                    },
                    MatchedKeywords = deterministicResult.MatchedKeywords,
                    MissingKeywords = deterministicResult.MissingKeywords,
                    AiAnalysis = null
                };

                return new AtsResult
                {
                    FinalScore = null,
                    DeterministicScore = deterministicResult.Score,
                    AiScore = null,
                    ResumeText = resumeText,
                    DetailsJson = JsonSerializer.Serialize(details, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        WriteIndented = false
                    }),
                    Status = "Unavailable",
                    ThorStatus = "Success",
                    SemcatStatus = "Unavailable",
                    StatusMessage = "SEMCAT AI (SEM_GO120) is currently unavailable. Deterministic score ready — use Re-score when AI is online."
                };
            }
        }
    }

    // ── Result classes ──

    public class AtsResult
    {
        public decimal? FinalScore { get; set; }
        public decimal? DeterministicScore { get; set; }
        public decimal? AiScore { get; set; }
        public string? ResumeText { get; set; }
        public string? DetailsJson { get; set; }
        public string Status { get; set; } = "Pending"; // Scored, Unavailable, Error
        public string ThorStatus { get; set; } = "Pending"; // Success, Unavailable, Error
        public string SemcatStatus { get; set; } = "Pending"; // Success, Unavailable, Error, Pending
        public string? StatusMessage { get; set; }
    }

    // ── JSON serialization models for AtsScoreDetails column ──

    public class AtsScoreDetailsJson
    {
        public DeterministicBreakdownJson DeterministicBreakdown { get; set; } = new();
        public List<string> MatchedKeywords { get; set; } = new();
        public List<string> MissingKeywords { get; set; } = new();
        public AiAnalysisJson? AiAnalysis { get; set; }
    }

    public class DeterministicBreakdownJson
    {
        public double SkillsMatch { get; set; }
        public double ExperienceMatch { get; set; }
        public double EducationMatch { get; set; }
        public double KeywordDensity { get; set; }
    }

    public class AiAnalysisJson
    {
        public decimal SemanticScore { get; set; }
        public List<string> Strengths { get; set; } = new();
        public List<string> Weaknesses { get; set; } = new();
        public List<string> MissingSkills { get; set; } = new();
        public List<string> MatchedSkills { get; set; } = new();
        public string RoleFitSummary { get; set; } = "";
        public List<string> ImprovementSuggestions { get; set; } = new();
        public decimal ExperienceRelevance { get; set; }
        public decimal EducationRelevance { get; set; }
    }
}
