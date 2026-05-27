using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using RmsApi.Data;
using RmsApi.DTOs;
using RmsApi.Models;
using RmsApi.Services;

namespace RmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CandidatesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;
        private readonly AtsOrchestrator _ats;

        public CandidatesController(AppDbContext db, IWebHostEnvironment env, AtsOrchestrator ats)
        {
            _db = db;
            _env = env;
            _ats = ats;
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? status,
            [FromQuery] int? jobPositionId, [FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo)
        {
            var query = _db.Candidates
                .Include(c => c.JobPosition)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(c => c.FullName.Contains(search) || c.Email.Contains(search));

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(c => c.Status == status);

            if (jobPositionId.HasValue)
                query = query.Where(c => c.JobPositionId == jobPositionId.Value);

            // Date filter — default to current year
            if (dateFrom.HasValue)
                query = query.Where(c => c.CreatedAt >= dateFrom.Value);
            else
                query = query.Where(c => c.CreatedAt.Year >= DateTime.UtcNow.Year);

            if (dateTo.HasValue)
            {
                var dateToEnd = dateTo.Value.Date.AddDays(1);
                query = query.Where(c => c.CreatedAt < dateToEnd);
            }

            var candidates = await query.OrderByDescending(c => c.CreatedAt).Select(c => new CandidateListDto
            {
                Id = c.Id,
                FullName = c.FullName,
                Email = c.Email,
                Phone = c.Phone,
                PhotoUrl = c.PhotoUrl,
                CurrentCompany = c.CurrentCompany,
                CurrentPosition = c.CurrentPosition,
                ExperienceYears = c.ExperienceYears,
                AlphaCoderScore = c.AlphaCoderScore,
                Status = c.Status,
                CurrentStepNumber = c.CurrentStepNumber,
                TotalSteps = c.JobPosition!.InterviewStepCount,
                JobTitle = c.JobPosition.Title,
                JobId = c.JobPosition.JobId,
                AtsScore = c.AtsScore,
                CreatedAt = c.CreatedAt
            }).ToListAsync();

            return Ok(candidates);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var c = await _db.Candidates
                .Include(x => x.JobPosition)
                    .ThenInclude(j => j!.InterviewSteps.OrderBy(s => s.StepNumber))
                .Include(x => x.CandidateInterviews.OrderBy(i => i.StepNumber))
                    .ThenInclude(ci => ci.Evaluations)
                    .ThenInclude(e => e.EvaluationQuestion)
                .Include(x => x.CandidateInterviews)
                    .ThenInclude(ci => ci.ConductedBy)
                .Include(x => x.CandidateInterviews)
                    .ThenInclude(ci => ci.InterviewStep)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (c == null) return NotFound();

            // Determine ATS status
            string atsStatus;
            if (c.AtsScore != null) atsStatus = "Scored";
            else if (c.AtsDeterministicScore != null) atsStatus = "Unavailable";
            else if (c.ResumeUrl != null || c.ResumeTextContent != null) atsStatus = "Pending";
            else atsStatus = "NoResume";

            var dto = new CandidateDetailDto
            {
                Id = c.Id,
                FullName = c.FullName,
                Email = c.Email,
                Phone = c.Phone,
                PhotoUrl = c.PhotoUrl,
                ResumeUrl = c.ResumeUrl,
                CurrentCompany = c.CurrentCompany,
                CurrentPosition = c.CurrentPosition,
                ExperienceYears = c.ExperienceYears,
                Skills = c.Skills,
                AlphaCoderScore = c.AlphaCoderScore,
                Notes = c.Notes,
                Status = c.Status,
                CurrentStepNumber = c.CurrentStepNumber,
                TotalSteps = c.JobPosition!.InterviewStepCount,
                JobTitle = c.JobPosition.Title,
                JobId = c.JobPosition.JobId,
                JobPositionId = c.JobPositionId,
                Department = c.JobPosition.Department,
                ManagerName = c.JobPosition.ManagerName,
                CreatedAt = c.CreatedAt,
                // Education
                Education10thSchool = c.Education10thSchool,
                Education10thPercentage = c.Education10thPercentage,
                Education12thSchool = c.Education12thSchool,
                Education12thPercentage = c.Education12thPercentage,
                EducationCollegeName = c.EducationCollegeName,
                EducationCollegeDegree = c.EducationCollegeDegree,
                EducationCollegeCGPA = c.EducationCollegeCGPA,
                // ATS
                AtsScore = c.AtsScore,
                AtsDeterministicScore = c.AtsDeterministicScore,
                AtsAiScore = c.AtsAiScore,
                AtsScoreDetails = c.AtsScoreDetails,
                AtsStatus = atsStatus,
                Interviews = c.JobPosition.InterviewSteps.Select(step =>
                {
                    var interview = c.CandidateInterviews.FirstOrDefault(ci => ci.StepNumber == step.StepNumber);
                    return new CandidateInterviewDto
                    {
                        Id = interview?.Id ?? 0,
                        StepNumber = step.StepNumber,
                        StepName = step.StepName,
                        StepDescription = step.Description,
                        Status = interview?.Status ?? "Pending",
                        InterviewDate = interview?.InterviewDate,
                        InterviewerName = interview?.InterviewerName,
                        OverallRating = interview?.OverallRating,
                        Comments = interview?.Comments,
                        ConductedByName = interview?.ConductedBy?.FullName,
                        CompletedAt = interview?.CompletedAt,
                        Evaluations = interview?.Evaluations.Select(e => new EvaluationDto
                        {
                            Id = e.Id,
                            QuestionId = e.EvaluationQuestionId,
                            QuestionText = e.EvaluationQuestion?.QuestionText ?? "",
                            Category = e.EvaluationQuestion?.Category ?? "",
                            Rating = e.Rating,
                            Remarks = e.Remarks
                        }).ToList() ?? new List<EvaluationDto>()
                    };
                }).ToList()
            };

            return Ok(dto);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromForm] string fullName, [FromForm] string email,
            [FromForm] string? phone, [FromForm] string? currentCompany, [FromForm] string? currentPosition,
            [FromForm] decimal? experienceYears, [FromForm] string? skills, [FromForm] decimal? alphaCoderScore,
            [FromForm] string? notes, [FromForm] int jobPositionId, IFormFile? photo, IFormFile? resume,
            [FromForm] string? education10thSchool, [FromForm] decimal? education10thPercentage,
            [FromForm] string? education12thSchool, [FromForm] decimal? education12thPercentage,
            [FromForm] string? educationCollegeName, [FromForm] string? educationCollegeDegree,
            [FromForm] decimal? educationCollegeCGPA)
        {
            var job = await _db.JobPositions.FindAsync(jobPositionId);
            if (job == null) return BadRequest(new { message = "Job position not found" });

            string? photoUrl = null;
            if (photo != null)
            {
                var uploadsDir = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
                Directory.CreateDirectory(uploadsDir);
                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(photo.FileName)}";
                var filePath = Path.Combine(uploadsDir, fileName);
                using var stream = new FileStream(filePath, FileMode.Create);
                await photo.CopyToAsync(stream);
                photoUrl = $"/uploads/{fileName}";
            }

            // Save resume file
            string? resumeUrl = null;
            if (resume != null)
            {
                var resumesDir = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "resumes");
                Directory.CreateDirectory(resumesDir);
                var resumeFileName = $"{Guid.NewGuid()}{Path.GetExtension(resume.FileName)}";
                var resumePath = Path.Combine(resumesDir, resumeFileName);
                using (var rStream = new FileStream(resumePath, FileMode.Create))
                {
                    await resume.CopyToAsync(rStream);
                }
                resumeUrl = $"/uploads/resumes/{resumeFileName}";
            }

            var candidate = new Candidate
            {
                FullName = fullName,
                Email = email,
                Phone = phone,
                PhotoUrl = photoUrl,
                ResumeUrl = resumeUrl,
                CurrentCompany = currentCompany,
                CurrentPosition = currentPosition,
                ExperienceYears = experienceYears,
                Skills = skills,
                AlphaCoderScore = alphaCoderScore,
                Notes = notes,
                JobPositionId = jobPositionId,
                Status = "New",
                CreatedById = GetUserId(),
                Education10thSchool = education10thSchool,
                Education10thPercentage = education10thPercentage,
                Education12thSchool = education12thSchool,
                Education12thPercentage = education12thPercentage,
                EducationCollegeName = educationCollegeName,
                EducationCollegeDegree = educationCollegeDegree,
                EducationCollegeCGPA = educationCollegeCGPA
            };

            _db.Candidates.Add(candidate);
            await _db.SaveChangesAsync();

            // Create interview records for each step
            var steps = await _db.InterviewSteps
                .Where(s => s.JobPositionId == jobPositionId)
                .OrderBy(s => s.StepNumber)
                .ToListAsync();

            foreach (var step in steps)
            {
                _db.CandidateInterviews.Add(new CandidateInterview
                {
                    CandidateId = candidate.Id,
                    InterviewStepId = step.Id,
                    StepNumber = step.StepNumber,
                    Status = "Pending"
                });
            }

            await _db.SaveChangesAsync();

            // Run ATS scoring if resume was uploaded — read from the saved file on disk
            if (resume != null && resumeUrl != null)
            {
                try
                {
                    var savedResumePath = Path.Combine(
                        _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
                        resumeUrl.TrimStart('/'));
                    using var atsStream = new FileStream(savedResumePath, FileMode.Open, FileAccess.Read);
                    var atsResult = await _ats.ScoreResumeAsync(atsStream, resume.FileName, job.Description, job.Requirements);
                    candidate.AtsScore = atsResult.FinalScore;
                    candidate.AtsDeterministicScore = atsResult.DeterministicScore;
                    candidate.AtsAiScore = atsResult.AiScore;
                    candidate.ResumeTextContent = atsResult.ResumeText;
                    candidate.AtsScoreDetails = atsResult.DetailsJson;
                    await _db.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    // ATS failure should not block candidate creation
                    Console.WriteLine($"[ATS] Scoring failed for candidate {candidate.Id}: {ex.Message}");
                }
            }

            return CreatedAtAction(nameof(GetById), new { id = candidate.Id }, new { id = candidate.Id });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromForm] string fullName, [FromForm] string email,
            [FromForm] string? phone, [FromForm] string? currentCompany, [FromForm] string? currentPosition,
            [FromForm] decimal? experienceYears, [FromForm] string? skills, [FromForm] decimal? alphaCoderScore,
            [FromForm] string? notes, IFormFile? photo, IFormFile? resume,
            [FromForm] string? education10thSchool, [FromForm] decimal? education10thPercentage,
            [FromForm] string? education12thSchool, [FromForm] decimal? education12thPercentage,
            [FromForm] string? educationCollegeName, [FromForm] string? educationCollegeDegree,
            [FromForm] decimal? educationCollegeCGPA)
        {
            var candidate = await _db.Candidates.Include(c => c.JobPosition).FirstOrDefaultAsync(c => c.Id == id);
            if (candidate == null) return NotFound();

            candidate.FullName = fullName;
            candidate.Email = email;
            candidate.Phone = phone;
            candidate.CurrentCompany = currentCompany;
            candidate.CurrentPosition = currentPosition;
            candidate.ExperienceYears = experienceYears;
            candidate.Skills = skills;
            candidate.AlphaCoderScore = alphaCoderScore;
            candidate.Notes = notes;
            candidate.Education10thSchool = education10thSchool;
            candidate.Education10thPercentage = education10thPercentage;
            candidate.Education12thSchool = education12thSchool;
            candidate.Education12thPercentage = education12thPercentage;
            candidate.EducationCollegeName = educationCollegeName;
            candidate.EducationCollegeDegree = educationCollegeDegree;
            candidate.EducationCollegeCGPA = educationCollegeCGPA;
            candidate.UpdatedAt = DateTime.UtcNow;

            if (photo != null)
            {
                var uploadsDir = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
                Directory.CreateDirectory(uploadsDir);
                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(photo.FileName)}";
                var filePath = Path.Combine(uploadsDir, fileName);
                using var stream = new FileStream(filePath, FileMode.Create);
                await photo.CopyToAsync(stream);
                candidate.PhotoUrl = $"/uploads/{fileName}";
            }

            // Handle resume upload + re-score
            if (resume != null)
            {
                var resumesDir = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "resumes");
                Directory.CreateDirectory(resumesDir);
                var resumeFileName = $"{Guid.NewGuid()}{Path.GetExtension(resume.FileName)}";
                var resumePath = Path.Combine(resumesDir, resumeFileName);
                using (var rStream = new FileStream(resumePath, FileMode.Create))
                {
                    await resume.CopyToAsync(rStream);
                }
                candidate.ResumeUrl = $"/uploads/resumes/{resumeFileName}";

                try
                {
                    // Read from saved file on disk — IFormFile stream may be consumed
                    using var atsStream = new FileStream(resumePath, FileMode.Open, FileAccess.Read);
                    var atsResult = await _ats.ScoreResumeAsync(atsStream, resume.FileName,
                        candidate.JobPosition?.Description, candidate.JobPosition?.Requirements);
                    candidate.AtsScore = atsResult.FinalScore;
                    candidate.AtsDeterministicScore = atsResult.DeterministicScore;
                    candidate.AtsAiScore = atsResult.AiScore;
                    candidate.ResumeTextContent = atsResult.ResumeText;
                    candidate.AtsScoreDetails = atsResult.DetailsJson;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ATS] Re-scoring failed for candidate {id}: {ex.Message}");
                }
            }

            await _db.SaveChangesAsync();
            return Ok(new { id = candidate.Id });
        }

        /// <summary>
        /// Upload or replace a resume for an existing candidate and auto-score.
        /// </summary>
        [HttpPost("{id}/upload-resume")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UploadResume(int id, IFormFile resume)
        {
            var candidate = await _db.Candidates.Include(c => c.JobPosition).FirstOrDefaultAsync(c => c.Id == id);
            if (candidate == null) return NotFound();
            if (resume == null) return BadRequest(new { message = "No resume file provided" });

            var ext = Path.GetExtension(resume.FileName).ToLowerInvariant();
            if (ext != ".pdf" && ext != ".docx" && ext != ".txt")
                return BadRequest(new { message = "Only PDF, DOCX, and TXT files are supported" });

            // Save file
            var resumesDir = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "resumes");
            Directory.CreateDirectory(resumesDir);
            var resumeFileName = $"{Guid.NewGuid()}{ext}";
            var resumePath = Path.Combine(resumesDir, resumeFileName);
            using (var rStream = new FileStream(resumePath, FileMode.Create))
            {
                await resume.CopyToAsync(rStream);
            }
            candidate.ResumeUrl = $"/uploads/resumes/{resumeFileName}";

            // Score — read from saved file on disk (IFormFile stream may be consumed after CopyToAsync)
            try
            {
                using var atsStream = new FileStream(resumePath, FileMode.Open, FileAccess.Read);
                var atsResult = await _ats.ScoreResumeAsync(atsStream, resume.FileName,
                    candidate.JobPosition?.Description, candidate.JobPosition?.Requirements);

                candidate.AtsScore = atsResult.FinalScore;
                candidate.AtsDeterministicScore = atsResult.DeterministicScore;
                candidate.AtsAiScore = atsResult.AiScore;
                candidate.ResumeTextContent = atsResult.ResumeText;
                candidate.AtsScoreDetails = atsResult.DetailsJson;
                candidate.UpdatedAt = DateTime.UtcNow;

                await _db.SaveChangesAsync();

                return Ok(new
                {
                    id = candidate.Id,
                    atsScore = atsResult.FinalScore,
                    atsDeterministicScore = atsResult.DeterministicScore,
                    atsAiScore = atsResult.AiScore,
                    status = atsResult.Status,
                    thorStatus = atsResult.ThorStatus,
                    semcatStatus = atsResult.SemcatStatus,
                    message = atsResult.StatusMessage,
                    details = atsResult.DetailsJson
                });
            }
            catch (Exception ex)
            {
                await _db.SaveChangesAsync(); // still save the resume URL
                return Ok(new
                {
                    id = candidate.Id,
                    atsScore = (decimal?)null,
                    status = "Error",
                    thorStatus = "Error",
                    semcatStatus = "Pending",
                    message = $"Resume saved but scoring failed: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Re-score an existing candidate's resume against the current job description.
        /// Useful when the JD changes or when the AI model becomes available.
        /// </summary>
        [HttpPost("{id}/rescore-ats")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RescoreAts(int id)
        {
            var candidate = await _db.Candidates.Include(c => c.JobPosition).FirstOrDefaultAsync(c => c.Id == id);
            if (candidate == null) return NotFound();

            if (string.IsNullOrWhiteSpace(candidate.ResumeTextContent))
            {
                if (!string.IsNullOrWhiteSpace(candidate.ResumeUrl))
                {
                    try
                    {
                        var relativePath = candidate.ResumeUrl.TrimStart('/');
                        var rootDir = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                        var absolutePath = Path.Combine(rootDir, relativePath);

                        if (System.IO.File.Exists(absolutePath))
                        {
                            using var stream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read);
                            var fileName = Path.GetFileName(absolutePath);
                            var atsResult = await _ats.ScoreResumeAsync(stream, fileName,
                                candidate.JobPosition?.Description, candidate.JobPosition?.Requirements);

                            if (atsResult.Status == "Error")
                            {
                                return BadRequest(new { message = $"No resume text found, and parsing the existing resume file failed: {atsResult.StatusMessage}" });
                            }

                            candidate.AtsScore = atsResult.FinalScore;
                            candidate.AtsDeterministicScore = atsResult.DeterministicScore;
                            candidate.AtsAiScore = atsResult.AiScore;
                            candidate.ResumeTextContent = atsResult.ResumeText;
                            candidate.AtsScoreDetails = atsResult.DetailsJson;
                            candidate.UpdatedAt = DateTime.UtcNow;

                            await _db.SaveChangesAsync();

                            return Ok(new
                            {
                                id = candidate.Id,
                                atsScore = atsResult.FinalScore,
                                atsDeterministicScore = atsResult.DeterministicScore,
                                atsAiScore = atsResult.AiScore,
                                status = atsResult.Status,
                                thorStatus = atsResult.ThorStatus,
                                semcatStatus = atsResult.SemcatStatus,
                                message = atsResult.StatusMessage,
                                details = atsResult.DetailsJson
                            });
                        }
                        else
                        {
                            return BadRequest(new { message = $"No resume text found, and the registered resume file could not be found on disk: {candidate.ResumeUrl}" });
                        }
                    }
                    catch (Exception ex)
                    {
                        return BadRequest(new { message = $"No resume text found, and attempt to read existing resume file failed: {ex.Message}" });
                    }
                }

                return BadRequest(new { message = "No resume text or file found. Please upload a resume first." });
            }

            try
            {
                var atsResult = await _ats.ScoreFromTextAsync(
                    candidate.ResumeTextContent,
                    candidate.JobPosition?.Description,
                    candidate.JobPosition?.Requirements);

                candidate.AtsScore = atsResult.FinalScore;
                candidate.AtsDeterministicScore = atsResult.DeterministicScore;
                candidate.AtsAiScore = atsResult.AiScore;
                candidate.AtsScoreDetails = atsResult.DetailsJson;
                candidate.UpdatedAt = DateTime.UtcNow;

                await _db.SaveChangesAsync();

                return Ok(new
                {
                    id = candidate.Id,
                    atsScore = atsResult.FinalScore,
                    atsDeterministicScore = atsResult.DeterministicScore,
                    atsAiScore = atsResult.AiScore,
                    status = atsResult.Status,
                    thorStatus = atsResult.ThorStatus,
                    semcatStatus = atsResult.SemcatStatus,
                    message = atsResult.StatusMessage,
                    details = atsResult.DetailsJson
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Re-scoring failed: {ex.Message}" });
            }
        }
    }
}
