using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using RmsApi.Data;
using RmsApi.DTOs;
using RmsApi.Models;

namespace RmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CandidatesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        public CandidatesController(AppDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? status, [FromQuery] int? jobPositionId)
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
            [FromForm] string? notes, [FromForm] int jobPositionId, IFormFile? photo)
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

            var candidate = new Candidate
            {
                FullName = fullName,
                Email = email,
                Phone = phone,
                PhotoUrl = photoUrl,
                CurrentCompany = currentCompany,
                CurrentPosition = currentPosition,
                ExperienceYears = experienceYears,
                Skills = skills,
                AlphaCoderScore = alphaCoderScore,
                Notes = notes,
                JobPositionId = jobPositionId,
                Status = "New",
                CreatedById = GetUserId()
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
            return CreatedAtAction(nameof(GetById), new { id = candidate.Id }, new { id = candidate.Id });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromForm] string fullName, [FromForm] string email,
            [FromForm] string? phone, [FromForm] string? currentCompany, [FromForm] string? currentPosition,
            [FromForm] decimal? experienceYears, [FromForm] string? skills, [FromForm] decimal? alphaCoderScore,
            [FromForm] string? notes, IFormFile? photo)
        {
            var candidate = await _db.Candidates.FindAsync(id);
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

            await _db.SaveChangesAsync();
            return Ok(new { id = candidate.Id });
        }
    }
}
