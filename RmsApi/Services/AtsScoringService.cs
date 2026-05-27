using System.Text.RegularExpressions;

namespace RmsApi.Services
{
    /// <summary>
    /// Production-quality deterministic ATS scoring engine.
    /// Features: skill synonym resolution, word-boundary matching,
    /// comprehensive tech phrase library, certification detection,
    /// and weighted multi-category scoring.
    /// </summary>
    public class AtsScoringService
    {
        // ════════════════════════════════════════
        //  Static Data — Stop Words
        // ════════════════════════════════════════

        private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
        {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
            "by", "from", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
            "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall",
            "can", "need", "must", "it", "its", "this", "that", "these", "those", "i", "we",
            "you", "he", "she", "they", "me", "him", "her", "us", "them", "my", "your", "his",
            "our", "their", "what", "which", "who", "whom", "where", "when", "why", "how",
            "all", "each", "every", "both", "few", "more", "most", "other", "some", "such",
            "no", "not", "only", "own", "same", "so", "than", "too", "very", "just", "about",
            "above", "after", "again", "also", "any", "as", "because", "before", "below",
            "between", "during", "if", "into", "new", "now", "over", "then", "through",
            "under", "up", "out", "well", "work", "working", "experience", "role", "position",
            "able", "strong", "good", "etc", "using", "used", "including", "preferred",
            "required", "requirements", "minimum", "years", "year", "looking", "responsible",
            "knowledge", "understanding", "familiarity", "proficiency", "expertise",
            "excellent", "proven", "plus", "ideal", "candidate", "skills", "skill",
            "company", "team", "join", "based", "will", "make", "like", "get", "set",
            "one", "two", "three", "ensure", "develop", "support", "provide", "within",
            "across", "related", "relevant", "key", "best", "high", "level", "based"
        };

        // ════════════════════════════════════════
        //  Static Data — Skill Synonyms (variant → canonical)
        // ════════════════════════════════════════

        private static readonly Dictionary<string, string> SkillCanonical = BuildCanonicalMap();

        private static Dictionary<string, string> BuildCanonicalMap()
        {
            // Each array: first entry is the canonical form, rest are aliases
            var groups = new string[][]
            {
                // Languages
                new[] { "javascript", "js", "es6", "es2015", "es2016", "es2017", "ecmascript" },
                new[] { "typescript", "ts" },
                new[] { "python", "py", "python3", "python2" },
                new[] { "c#", "csharp", "c-sharp" },
                new[] { "c++", "cpp", "cplusplus" },
                new[] { "golang", "go lang" },
                new[] { "ruby", "rb" },
                new[] { "kotlin", "kt" },
                new[] { "objective-c", "objc", "obj-c" },
                new[] { "swift" },
                new[] { "rust", "rs" },
                new[] { "scala" },

                // Frontend
                new[] { "react", "react.js", "reactjs" },
                new[] { "angular", "angular.js", "angularjs", "angular2" },
                new[] { "vue", "vue.js", "vuejs" },
                new[] { "next.js", "nextjs", "next" },
                new[] { "nuxt.js", "nuxtjs", "nuxt" },
                new[] { "svelte", "sveltejs" },
                new[] { "jquery", "j-query" },
                new[] { "html", "html5" },
                new[] { "css", "css3" },
                new[] { "sass", "scss" },
                new[] { "tailwindcss", "tailwind", "tailwind css" },
                new[] { "bootstrap", "bootstrap5" },
                new[] { "webpack", "web pack" },

                // Backend
                new[] { "node.js", "nodejs", "node" },
                new[] { "express.js", "expressjs", "express" },
                new[] { "asp.net", "aspnet", "asp.net core", "aspnet core" },
                new[] { ".net", "dotnet", ".net core", "dotnet core", ".net framework" },
                new[] { "spring boot", "springboot", "spring-boot" },
                new[] { "spring", "spring framework" },
                new[] { "django", "django rest framework", "drf" },
                new[] { "flask" },
                new[] { "fastapi", "fast api" },
                new[] { "ruby on rails", "rails", "ror" },
                new[] { "laravel" },
                new[] { "entity framework", "ef core", "ef" },

                // Databases
                new[] { "sql server", "mssql", "ms sql", "microsoft sql server", "sqlserver" },
                new[] { "postgresql", "postgres", "psql", "pgsql" },
                new[] { "mysql", "my sql", "mariadb" },
                new[] { "mongodb", "mongo", "mongo db" },
                new[] { "redis" },
                new[] { "elasticsearch", "elastic search", "elastic" },
                new[] { "cassandra", "apache cassandra" },
                new[] { "dynamodb", "dynamo db", "amazon dynamodb" },
                new[] { "oracle", "oracle db", "oracle database" },
                new[] { "sqlite", "sq lite" },
                new[] { "neo4j", "neo 4j" },
                new[] { "cosmosdb", "cosmos db", "azure cosmos" },

                // Cloud
                new[] { "aws", "amazon web services", "amazon cloud" },
                new[] { "azure", "microsoft azure", "ms azure" },
                new[] { "gcp", "google cloud", "google cloud platform" },
                new[] { "heroku" },
                new[] { "digitalocean", "digital ocean" },

                // DevOps / Infra
                new[] { "docker", "containerization" },
                new[] { "kubernetes", "k8s", "kube" },
                new[] { "terraform", "tf" },
                new[] { "ansible" },
                new[] { "jenkins" },
                new[] { "github actions", "gh actions" },
                new[] { "gitlab ci", "gitlab ci/cd" },
                new[] { "ci/cd", "cicd", "continuous integration", "continuous deployment" },
                new[] { "nginx", "engine x" },
                new[] { "apache" },
                new[] { "linux", "unix", "ubuntu", "centos", "debian", "rhel" },

                // Data / ML
                new[] { "machine learning", "ml" },
                new[] { "deep learning", "dl" },
                new[] { "artificial intelligence", "ai" },
                new[] { "natural language processing", "nlp" },
                new[] { "computer vision", "cv" },
                new[] { "tensorflow", "tf", "tensor flow" },
                new[] { "pytorch", "py torch" },
                new[] { "scikit-learn", "sklearn", "scikit learn" },
                new[] { "pandas", "pd" },
                new[] { "numpy", "np" },
                new[] { "data science", "data analytics" },
                new[] { "power bi", "powerbi" },
                new[] { "tableau" },
                new[] { "apache spark", "spark", "pyspark" },
                new[] { "hadoop", "apache hadoop" },
                new[] { "apache kafka", "kafka" },

                // Mobile
                new[] { "react native", "react-native", "rn" },
                new[] { "flutter" },
                new[] { "android", "android sdk" },
                new[] { "ios", "iphone", "ipad" },
                new[] { "xamarin" },
                new[] { "ionic" },

                // Tools / Practices
                new[] { "git", "github", "gitlab", "bitbucket", "version control" },
                new[] { "jira", "atlassian jira" },
                new[] { "confluence" },
                new[] { "figma" },
                new[] { "postman" },
                new[] { "swagger", "openapi" },
                new[] { "rest api", "restful", "rest", "web api" },
                new[] { "graphql", "graph ql" },
                new[] { "grpc", "g rpc" },
                new[] { "microservices", "microservice", "micro services", "microservices architecture" },
                new[] { "agile", "agile methodology", "scrum", "kanban" },
                new[] { "tdd", "test driven development" },
                new[] { "bdd", "behavior driven development" },
                new[] { "unit testing", "unit tests" },
                new[] { "integration testing", "integration tests" },
                new[] { "selenium", "cypress", "playwright" },
                new[] { "oop", "object oriented programming", "object oriented" },
                new[] { "design patterns", "design pattern" },
                new[] { "solid", "solid principles" },
                new[] { "data structures", "dsa", "data structures and algorithms", "algorithms" },
                new[] { "system design" },
                new[] { "rabbitmq", "rabbit mq" },

                // Security
                new[] { "oauth", "oauth2", "oauth 2.0" },
                new[] { "jwt", "json web token" },
                new[] { "ssl", "tls", "https" },
                new[] { "encryption", "cryptography" },

                // Messaging
                new[] { "azure service bus", "service bus" },
                new[] { "amazon sqs", "sqs" },
                new[] { "amazon sns", "sns" },
            };

            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var group in groups)
            {
                var canonical = group[0];
                foreach (var alias in group)
                {
                    if (!map.ContainsKey(alias))
                        map[alias] = canonical;
                }
            }
            return map;
        }

        // ════════════════════════════════════════
        //  Static Data — Multi-word Tech Phrases
        // ════════════════════════════════════════

        private static readonly string[] TechPhrases = new[]
        {
            // These are checked as substrings in the text
            "machine learning", "deep learning", "data science", "artificial intelligence",
            "natural language processing", "computer vision", "neural network",
            "rest api", "web api", "graphql api",
            "asp.net core", "asp.net", ".net core", ".net framework", "entity framework",
            "sql server", "visual studio", "vs code", "visual studio code",
            "power bi", "azure devops", "ci/cd", "continuous integration",
            "unit testing", "integration testing", "test driven",
            "agile methodology", "scrum master", "project management", "team lead",
            "full stack", "front end", "back end", "frontend", "backend", "fullstack",
            "react.js", "node.js", "vue.js", "angular.js", "next.js", "nuxt.js",
            "spring boot", "ruby on rails", "amazon web services",
            "google cloud", "google cloud platform", "microsoft azure",
            "problem solving", "data structures", "object oriented",
            "version control", "microservices architecture", "event driven",
            "react native", "design patterns", "solid principles",
            "system design", "domain driven", "clean architecture",
            "azure functions", "aws lambda", "serverless",
            "azure devops", "github actions", "gitlab ci",
            "apache kafka", "apache spark", "message queue",
            "load balancing", "high availability", "fault tolerance",
            "code review", "pull request", "pair programming",
            "responsive design", "cross browser", "mobile first",
            "single page application", "progressive web app",
            "third party integration", "api integration",
            "database design", "database optimization", "query optimization",
            "performance tuning", "scalability", "distributed systems",
            "container orchestration", "infrastructure as code",
        };

        // ════════════════════════════════════════
        //  Static Data — Certification Patterns
        // ════════════════════════════════════════

        private static readonly string[] CertificationPatterns = new[]
        {
            "aws certified", "azure certified", "google certified",
            "aws solutions architect", "aws developer", "aws sysops",
            "az-900", "az-104", "az-204", "az-305", "az-400",
            "dp-900", "dp-100", "dp-203", "dp-300",
            "ai-900", "ai-102",
            "gcp associate", "gcp professional",
            "certified kubernetes", "cka", "ckad",
            "pmp", "prince2", "itil",
            "scrum master", "csm", "psm",
            "cisco", "ccna", "ccnp",
            "comptia", "security+", "network+",
            "istqb", "certified tester",
            "ocjp", "oracle certified",
            "microsoft certified", "mcsa", "mcse",
            "salesforce certified", "salesforce administrator",
            "certified ethical hacker", "ceh",
            "togaf", "cobit",
            "safe agilist", "safe certified",
            "terraform associate", "hashicorp certified",
        };

        // ════════════════════════════════════════
        //  Static Data — Education Fields
        // ════════════════════════════════════════

        private static readonly Dictionary<string, int> DegreeLevel = new(StringComparer.OrdinalIgnoreCase)
        {
            // Doctorate level (5)
            {"phd", 5}, {"ph.d", 5}, {"doctorate", 5}, {"doctoral", 5},
            // Master level (4)
            {"master", 4}, {"masters", 4}, {"mba", 4}, {"m.tech", 4}, {"mtech", 4},
            {"m.sc", 4}, {"msc", 4}, {"m.s.", 4}, {"ms", 4}, {"m.e.", 4}, {"me", 4},
            {"mca", 4}, {"m.c.a", 4}, {"m.a.", 4}, {"m.com", 4}, {"mcom", 4},
            {"pgdm", 4}, {"post graduate", 4}, {"postgraduate", 4},
            // Bachelor level (3)
            {"bachelor", 3}, {"bachelors", 3}, {"b.tech", 3}, {"btech", 3},
            {"b.sc", 3}, {"bsc", 3}, {"b.e.", 3}, {"be", 3}, {"b.s.", 3}, {"bs", 3},
            {"bca", 3}, {"b.c.a", 3}, {"b.a.", 3}, {"ba", 3}, {"b.com", 3}, {"bcom", 3},
            {"b.b.a", 3}, {"bba", 3}, {"undergraduate", 3}, {"under graduate", 3},
            // Diploma level (2)
            {"diploma", 2}, {"associate", 2}, {"polytechnic", 2},
            // Certification level (1)
            {"certification", 1}, {"certified", 1}, {"certificate", 1},
        };

        private static readonly string[] TechFields = new[]
        {
            "computer science", "computer engineering", "software engineering",
            "information technology", "information systems", "data science",
            "artificial intelligence", "machine learning", "electronics",
            "electrical engineering", "mathematics", "statistics",
            "computational", "cyber security", "information security",
        };

        // ════════════════════════════════════════
        //  Main Scoring Entry Point
        // ════════════════════════════════════════

        public DeterministicScoreResult CalculateScore(string resumeText, string? jobDescription, string? jobRequirements)
        {
            if (string.IsNullOrWhiteSpace(resumeText))
                return new DeterministicScoreResult { Score = 0, MatchedKeywords = new(), MissingKeywords = new() };

            var jdText = $"{jobDescription ?? ""} {jobRequirements ?? ""}".Trim();
            if (string.IsNullOrWhiteSpace(jdText))
                return new DeterministicScoreResult { Score = 0, MatchedKeywords = new(), MissingKeywords = new() };

            var resumeLower = resumeText.ToLowerInvariant();
            var jdLower = jdText.ToLowerInvariant();

            // Extract and normalize keywords from both
            var jdKeywords = ExtractKeywords(jdText);
            var resumeKeywords = ExtractKeywords(resumeText);

            // Normalize keywords through synonym map
            var jdNormalized = NormalizeKeywordSet(jdKeywords);
            var resumeNormalized = NormalizeKeywordSet(resumeKeywords);

            // ── Category Scoring ──
            var skillsScore = ScoreSkillsMatch(resumeLower, resumeNormalized, jdNormalized);       // 35%
            var experienceScore = ScoreExperienceMatch(resumeLower, jdLower);                       // 25%
            var educationScore = ScoreEducationMatch(resumeLower, jdLower);                         // 20%
            var keywordScore = ScoreKeywordOverlap(resumeNormalized, jdNormalized);                 // 15%
            var certScore = ScoreCertifications(resumeLower, jdLower);                              // 5%

            // Compute matched/missing using normalized forms
            var matched = jdNormalized
                .Where(k => ContainsKeyword(resumeLower, k) || resumeNormalized.Contains(k))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(k => k)
                .ToList();

            var missing = jdNormalized
                .Where(k => !ContainsKeyword(resumeLower, k) && !resumeNormalized.Contains(k))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(k => k)
                .ToList();

            var finalScore = Math.Round(
                (skillsScore * 0.35) + (experienceScore * 0.25) +
                (educationScore * 0.20) + (keywordScore * 0.15) +
                (certScore * 0.05), 2);

            finalScore = Math.Min(100, Math.Max(0, finalScore));

            return new DeterministicScoreResult
            {
                Score = (decimal)finalScore,
                SkillsMatch = Math.Round(skillsScore, 2),
                ExperienceMatch = Math.Round(experienceScore, 2),
                EducationMatch = Math.Round(educationScore, 2),
                KeywordDensity = Math.Round(keywordScore, 2),
                MatchedKeywords = matched,
                MissingKeywords = missing
            };
        }

        // ════════════════════════════════════════
        //  Keyword Extraction & Normalization
        // ════════════════════════════════════════

        /// <summary>
        /// Extracts meaningful keywords from text.
        /// Includes single words (>2 chars), tech phrases, and certifications.
        /// </summary>
        private HashSet<string> ExtractKeywords(string text)
        {
            var lowerText = text.ToLowerInvariant();

            // Single-word keywords
            var words = Regex.Split(lowerText, @"[^\w#+.\-/]+")
                .Where(w => w.Length > 2 && !StopWords.Contains(w) && !double.TryParse(w, out _))
                .Select(w => w.Trim('.', '-', '/'))
                .Where(w => w.Length > 2)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            // Multi-word tech phrases found in text
            foreach (var phrase in TechPhrases)
            {
                if (lowerText.Contains(phrase))
                    words.Add(phrase);
            }

            // Certifications found in text
            foreach (var cert in CertificationPatterns)
            {
                if (lowerText.Contains(cert))
                    words.Add(cert);
            }

            return words;
        }

        /// <summary>
        /// Normalizes a keyword set through the synonym map.
        /// Returns canonical forms for all recognized skills.
        /// </summary>
        private HashSet<string> NormalizeKeywordSet(HashSet<string> keywords)
        {
            var normalized = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var keyword in keywords)
            {
                if (SkillCanonical.TryGetValue(keyword, out var canonical))
                    normalized.Add(canonical);
                else
                    normalized.Add(keyword);
            }

            return normalized;
        }

        /// <summary>
        /// Checks if text contains a keyword using word boundaries for single words,
        /// or substring match for multi-word phrases.
        /// Prevents "java" from matching "javascript".
        /// </summary>
        private bool ContainsKeyword(string textLower, string keyword)
        {
            if (string.IsNullOrWhiteSpace(keyword)) return false;

            var keywordLower = keyword.ToLowerInvariant();

            // Multi-word phrases: substring match is fine (context prevents false positives)
            if (keywordLower.Contains(' ') || keywordLower.Contains('.') || keywordLower.Contains('#')
                || keywordLower.Contains('+') || keywordLower.Contains('/'))
            {
                return textLower.Contains(keywordLower);
            }

            // Single words: use word-boundary matching
            try
            {
                return Regex.IsMatch(textLower, $@"\b{Regex.Escape(keywordLower)}\b");
            }
            catch
            {
                return textLower.Contains(keywordLower);
            }
        }

        // ════════════════════════════════════════
        //  Category Scoring
        // ════════════════════════════════════════

        /// <summary>
        /// Skills matching (35%): compares JD skills against resume skills
        /// with synonym resolution and word-boundary matching.
        /// </summary>
        private double ScoreSkillsMatch(string resumeLower, HashSet<string> resumeNorm, HashSet<string> jdNorm)
        {
            if (!jdNorm.Any()) return 50; // No JD = neutral

            int matched = 0;
            int total = jdNorm.Count;

            foreach (var jdSkill in jdNorm)
            {
                // Direct normalized match
                if (resumeNorm.Contains(jdSkill))
                {
                    matched++;
                    continue;
                }

                // Also check raw text for the JD keyword (catches things not extracted as keywords)
                if (ContainsKeyword(resumeLower, jdSkill))
                {
                    matched++;
                    continue;
                }

                // Check all aliases of this canonical form
                foreach (var kvp in SkillCanonical)
                {
                    if (kvp.Value.Equals(jdSkill, StringComparison.OrdinalIgnoreCase)
                        && ContainsKeyword(resumeLower, kvp.Key))
                    {
                        matched++;
                        break;
                    }
                }
            }

            return (matched / (double)total) * 100;
        }

        /// <summary>
        /// Experience matching (25%): extracts years of experience from both texts
        /// and compares. Handles multiple patterns for year mentions.
        /// </summary>
        private double ScoreExperienceMatch(string resumeLower, string jdLower)
        {
            // Multiple regex patterns for experience mentions
            var expPatterns = new[]
            {
                @"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)?",
                @"(?:experience|exp)\s*[:.\-]\s*(\d+)\+?\s*(?:years?|yrs?)?",
                @"(\d+)\+?\s*(?:years?|yrs?)\s+(?:in|of|with)",
                @"minimum\s+(\d+)\s*(?:years?|yrs?)",
                @"at\s+least\s+(\d+)\s*(?:years?|yrs?)",
            };

            // Extract required years from JD
            int requiredYears = 0;
            foreach (var pattern in expPatterns)
            {
                var match = Regex.Match(jdLower, pattern);
                if (match.Success && int.TryParse(match.Groups[1].Value, out var yrs) && yrs < 50)
                {
                    requiredYears = Math.Max(requiredYears, yrs);
                }
            }

            if (requiredYears == 0) return 70; // JD doesn't specify → neutral

            // Extract candidate's experience from resume
            int candidateYears = 0;
            foreach (var pattern in expPatterns)
            {
                var matches = Regex.Matches(resumeLower, pattern);
                foreach (Match m in matches)
                {
                    if (int.TryParse(m.Groups[1].Value, out var yrs) && yrs < 50)
                        candidateYears = Math.Max(candidateYears, yrs);
                }
            }

            // Also try to count years from employment dates (2018-2023 = 5 years)
            var dateRangePattern = @"(?:20\d{2}|19\d{2})\s*[-–—to]+\s*(?:20\d{2}|19\d{2}|present|current|now)";
            var dateMatches = Regex.Matches(resumeLower, dateRangePattern, RegexOptions.IgnoreCase);
            int yearsFromDates = 0;
            foreach (Match dm in dateMatches)
            {
                var years = Regex.Matches(dm.Value, @"(20\d{2}|19\d{2})");
                if (years.Count >= 2)
                {
                    int start = int.Parse(years[0].Value);
                    int end = int.Parse(years[1].Value);
                    yearsFromDates += Math.Max(0, end - start);
                }
                else if (dm.Value.Contains("present") || dm.Value.Contains("current") || dm.Value.Contains("now"))
                {
                    var startYear = Regex.Match(dm.Value, @"(20\d{2}|19\d{2})");
                    if (startYear.Success)
                        yearsFromDates += DateTime.UtcNow.Year - int.Parse(startYear.Value);
                }
            }
            candidateYears = Math.Max(candidateYears, yearsFromDates);

            if (candidateYears == 0) return 25; // No experience found
            if (candidateYears >= requiredYears) return 100;
            if (candidateYears >= requiredYears - 1) return 85; // Close enough (1 year short)

            return Math.Min(100, (candidateYears / (double)requiredYears) * 100);
        }

        /// <summary>
        /// Education matching (20%): compares education level and field of study.
        /// </summary>
        private double ScoreEducationMatch(string resumeLower, string jdLower)
        {
            // ── Degree level matching ──
            int jdMaxLevel = 0;
            int resumeMaxLevel = 0;

            foreach (var (term, level) in DegreeLevel)
            {
                if (ContainsKeyword(jdLower, term)) jdMaxLevel = Math.Max(jdMaxLevel, level);
                if (ContainsKeyword(resumeLower, term)) resumeMaxLevel = Math.Max(resumeMaxLevel, level);
            }

            double levelScore;
            if (jdMaxLevel == 0) levelScore = 70; // JD doesn't specify
            else if (resumeMaxLevel >= jdMaxLevel) levelScore = 100;
            else if (resumeMaxLevel == 0) levelScore = 15;
            else levelScore = (resumeMaxLevel / (double)jdMaxLevel) * 100;

            // ── Field of study matching ──
            double fieldScore = 60; // Default if JD doesn't specify a field

            bool jdMentionsField = false;
            bool resumeHasMatchingField = false;

            foreach (var field in TechFields)
            {
                if (jdLower.Contains(field))
                {
                    jdMentionsField = true;
                    if (resumeLower.Contains(field))
                    {
                        resumeHasMatchingField = true;
                        break;
                    }
                }
            }

            if (jdMentionsField)
            {
                fieldScore = resumeHasMatchingField ? 100 : 30;
            }

            // Combined: 70% degree level, 30% field match
            return (levelScore * 0.70) + (fieldScore * 0.30);
        }

        /// <summary>
        /// Keyword overlap (15%): measures the percentage of JD keywords
        /// found in the resume using normalized forms.
        /// </summary>
        private double ScoreKeywordOverlap(HashSet<string> resumeNorm, HashSet<string> jdNorm)
        {
            if (!jdNorm.Any()) return 50;

            int overlap = jdNorm.Count(jk =>
                resumeNorm.Any(rk => rk.Equals(jk, StringComparison.OrdinalIgnoreCase)));

            return (overlap / (double)jdNorm.Count) * 100;
        }

        /// <summary>
        /// Certification matching (5%): checks if the resume contains
        /// relevant certifications mentioned in the JD.
        /// </summary>
        private double ScoreCertifications(string resumeLower, string jdLower)
        {
            // Find certifications mentioned in JD
            var jdCerts = CertificationPatterns.Where(c => jdLower.Contains(c)).ToList();

            if (!jdCerts.Any())
            {
                // JD doesn't require certs — give bonus if resume has any
                var resumeHasAnyCert = CertificationPatterns.Any(c => resumeLower.Contains(c));
                return resumeHasAnyCert ? 80 : 50; // Bonus for having certs
            }

            // JD requires certs — check how many the candidate has
            int matched = jdCerts.Count(c => resumeLower.Contains(c));
            return (matched / (double)jdCerts.Count) * 100;
        }
    }

    // ════════════════════════════════════════
    //  Result Model
    // ════════════════════════════════════════

    public class DeterministicScoreResult
    {
        public decimal Score { get; set; }
        public double SkillsMatch { get; set; }
        public double ExperienceMatch { get; set; }
        public double EducationMatch { get; set; }
        public double KeywordDensity { get; set; }
        public List<string> MatchedKeywords { get; set; } = new();
        public List<string> MissingKeywords { get; set; } = new();
    }
}
