using System.Text;
using System.Text.RegularExpressions;

namespace RmsApi.Services
{
    /// <summary>
    /// Resume text extraction service using Samsung THOR RAG API.
    /// All document types (PDF, DOCX, TXT) are processed by THOR.
    /// After extraction, text is normalized for accurate ATS scoring.
    /// </summary>
    public class ResumeParserService
    {
        private readonly ThorDocumentService _thor;
        private readonly ILogger<ResumeParserService> _logger;

        public ResumeParserService(ThorDocumentService thor, ILogger<ResumeParserService> logger)
        {
            _thor = thor;
            _logger = logger;
        }

        /// <summary>
        /// Extract text from a resume file using THOR RAG API.
        /// Returns clean, normalized text suitable for ATS analysis.
        /// Throws if THOR is unavailable or extraction fails.
        /// </summary>
        public async Task<ResumeExtractionResult> ExtractTextAsync(Stream fileStream, string fileName)
        {
            var extension = Path.GetExtension(fileName).ToLowerInvariant();

            if (extension != ".pdf" && extension != ".docx" && extension != ".txt")
            {
                return new ResumeExtractionResult
                {
                    Success = false,
                    ErrorMessage = $"File type '{extension}' is not supported. Use PDF, DOCX, or TXT."
                };
            }

            try
            {
                // Send to THOR for text extraction
                var thorResult = await _thor.ExtractTextFromFileAsync(fileStream, fileName);

                if (!thorResult.Success)
                {
                    _logger.LogError("THOR extraction failed for {FileName}: {Error}", fileName, thorResult.ErrorMessage);
                    return new ResumeExtractionResult
                    {
                        Success = false,
                        ThorUnavailable = thorResult.ErrorMessage?.Contains("THOR") == true,
                        ErrorMessage = thorResult.ErrorMessage ?? "Text extraction failed."
                    };
                }

                // Normalize extracted text for ATS scoring
                var normalized = NormalizeText(thorResult.ExtractedText);
                _logger.LogInformation("Extracted {CharCount} chars from {FileName} ({Extension}) via THOR",
                    normalized.Length, fileName, extension);

                return new ResumeExtractionResult
                {
                    Success = true,
                    Text = normalized
                };
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "THOR API is unreachable for {FileName}", fileName);
                return new ResumeExtractionResult
                {
                    Success = false,
                    ThorUnavailable = true,
                    ErrorMessage = "THOR document processing service is currently unavailable. Please try again later."
                };
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "THOR request timed out for {FileName}", fileName);
                return new ResumeExtractionResult
                {
                    Success = false,
                    ThorUnavailable = true,
                    ErrorMessage = "THOR document processing timed out. Please try again."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to extract text from {FileName}", fileName);
                return new ResumeExtractionResult
                {
                    Success = false,
                    ErrorMessage = $"Failed to extract text: {ex.Message}"
                };
            }
        }

        // ════════════════════════════════════════
        //  Text Normalization
        // ════════════════════════════════════════

        /// <summary>
        /// Cleans extracted text: fixes encoding artifacts, normalizes whitespace,
        /// standardizes tech terms for better ATS matching.
        /// </summary>
        private string NormalizeText(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "";

            // ── Fix PDF encoding artifacts ──
            text = text.Replace("\u00A0", " ");   // Non-breaking space
            text = text.Replace("\u200B", "");     // Zero-width space
            text = text.Replace("\u200C", "");     // Zero-width non-joiner
            text = text.Replace("\u200D", "");     // Zero-width joiner
            text = text.Replace("\uFEFF", "");     // BOM

            // ── Fix ligatures (common in PDF fonts) ──
            text = text.Replace("\uFB01", "fi");
            text = text.Replace("\uFB02", "fl");
            text = text.Replace("\uFB03", "ffi");
            text = text.Replace("\uFB04", "ffl");
            text = text.Replace("\uFB00", "ff");

            // ── Normalize quotes and dashes ──
            text = text.Replace("\u2018", "'");    // Left single quote
            text = text.Replace("\u2019", "'");    // Right single quote / apostrophe
            text = text.Replace("\u201C", "\"");   // Left double quote
            text = text.Replace("\u201D", "\"");   // Right double quote
            text = text.Replace("\u2013", "-");    // En-dash
            text = text.Replace("\u2014", "-");    // Em-dash
            text = text.Replace("\u2022", "•");    // Bullet
            text = text.Replace("\u25CF", "•");    // Black circle (used as bullet)
            text = text.Replace("\u25CB", "•");    // White circle
            text = text.Replace("\u25AA", "•");    // Small black square
            text = text.Replace("\u25A0", "•");    // Black square
            text = text.Replace("\u2023", "•");    // Triangular bullet
            text = text.Replace("\u27A2", "•");    // Arrow bullet

            // ── Normalize tech term formatting ──
            text = Regex.Replace(text, @"\bC\s*#\b", "C#");
            text = Regex.Replace(text, @"\bC\s*\+\s*\+\b", "C++");
            text = Regex.Replace(text, @"\.NET\s+Core", ".NET Core", RegexOptions.IgnoreCase);
            text = Regex.Replace(text, @"ASP\s*\.\s*NET", "ASP.NET", RegexOptions.IgnoreCase);
            text = Regex.Replace(text, @"\bNode\s*\.\s*js\b", "Node.js", RegexOptions.IgnoreCase);
            text = Regex.Replace(text, @"\bReact\s*\.\s*js\b", "React.js", RegexOptions.IgnoreCase);
            text = Regex.Replace(text, @"\bVue\s*\.\s*js\b", "Vue.js", RegexOptions.IgnoreCase);
            text = Regex.Replace(text, @"\bNext\s*\.\s*js\b", "Next.js", RegexOptions.IgnoreCase);

            // ── Clean whitespace ──
            text = Regex.Replace(text, @"[ \t]+", " ");           // Collapse horizontal whitespace
            text = Regex.Replace(text, @"^\s+$", "", RegexOptions.Multiline); // Remove blank-only lines
            text = Regex.Replace(text, @"\n{4,}", "\n\n\n");      // Cap consecutive newlines at 3

            // ── Fix common OCR / extraction errors ──
            text = Regex.Replace(text, @"\bl\b(?=ndia)", "I");    // "lndia" → "India"
            text = Regex.Replace(text, @"(?<=\d),(?=\d{3}\b)", ","); // Keep number commas

            return text.Trim();
        }
    }

    /// <summary>
    /// Result of resume text extraction.
    /// </summary>
    public class ResumeExtractionResult
    {
        public bool Success { get; set; }
        public string Text { get; set; } = "";
        public bool ThorUnavailable { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
