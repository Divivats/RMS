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
    public class JobPositionsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public JobPositionsController(AppDbContext db) => _db = db;

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        private string GetUserRole() => User.FindFirstValue(ClaimTypes.Role)!;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? status)
        {
            var query = _db.JobPositions
                .Include(j => j.Candidates)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(j => j.Title.Contains(search) || j.JobId.Contains(search) || j.Department.Contains(search));

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(j => j.Status == status);

            var jobs = await query.OrderByDescending(j => j.CreatedAt).Select(j => new JobPositionListDto
            {
                Id = j.Id,
                JobId = j.JobId,
                Title = j.Title,
                Department = j.Department,
                Location = j.Location,
                ManagerName = j.ManagerName,
                NumberOfPositions = j.NumberOfPositions,
                InterviewStepCount = j.InterviewStepCount,
                Status = j.Status,
                TotalCandidates = j.Candidates.Count,
                HiredCandidates = j.Candidates.Count(c => c.Status == "Recruited"),
                ActiveCandidates = j.Candidates.Count(c => c.Status == "InProgress" || c.Status == "New"),
                CreatedAt = j.CreatedAt
            }).ToListAsync();

            return Ok(jobs);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var job = await _db.JobPositions
                .Include(j => j.InterviewSteps.OrderBy(s => s.StepNumber))
                .Include(j => j.Candidates)
                .Include(j => j.CreatedBy)
                .FirstOrDefaultAsync(j => j.Id == id);

            if (job == null) return NotFound();

            var dto = new JobPositionDetailDto
            {
                Id = job.Id,
                JobId = job.JobId,
                Title = job.Title,
                Department = job.Department,
                Location = job.Location,
                ManagerName = job.ManagerName,
                NumberOfPositions = job.NumberOfPositions,
                InterviewStepCount = job.InterviewStepCount,
                Status = job.Status,
                Description = job.Description,
                Requirements = job.Requirements,
                SalaryRangeMin = job.SalaryRangeMin,
                SalaryRangeMax = job.SalaryRangeMax,
                CreatedByName = job.CreatedBy?.FullName,
                CreatedAt = job.CreatedAt,
                TotalCandidates = job.Candidates.Count,
                HiredCandidates = job.Candidates.Count(c => c.Status == "Recruited"),
                ActiveCandidates = job.Candidates.Count(c => c.Status == "InProgress" || c.Status == "New"),
                InterviewSteps = job.InterviewSteps.Select(s => new InterviewStepDto
                {
                    StepNumber = s.StepNumber,
                    StepName = s.StepName,
                    Description = s.Description
                }).ToList(),
                Candidates = job.Candidates.Select(c => new CandidateListDto
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
                    TotalSteps = job.InterviewStepCount,
                    JobTitle = job.Title,
                    JobId = job.JobId,
                    CreatedAt = c.CreatedAt
                }).ToList()
            };

            return Ok(dto);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateJobPositionRequest request)
        {
            if (await _db.JobPositions.AnyAsync(j => j.JobId == request.JobId))
                return BadRequest(new { message = "Job ID already exists" });

            var job = new JobPosition
            {
                JobId = request.JobId,
                Title = request.Title,
                Department = request.Department,
                Location = request.Location,
                ManagerName = request.ManagerName,
                NumberOfPositions = request.NumberOfPositions,
                InterviewStepCount = request.InterviewStepCount,
                Description = request.Description,
                Requirements = request.Requirements,
                SalaryRangeMin = request.SalaryRangeMin,
                SalaryRangeMax = request.SalaryRangeMax,
                CreatedById = GetUserId()
            };

            _db.JobPositions.Add(job);
            await _db.SaveChangesAsync();

            // Create interview steps
            if (request.InterviewSteps.Any())
            {
                foreach (var step in request.InterviewSteps)
                {
                    _db.InterviewSteps.Add(new InterviewStep
                    {
                        JobPositionId = job.Id,
                        StepNumber = step.StepNumber,
                        StepName = step.StepName,
                        Description = step.Description
                    });
                }
            }
            else
            {
                // Create default steps based on count
                for (int i = 1; i <= request.InterviewStepCount; i++)
                {
                    _db.InterviewSteps.Add(new InterviewStep
                    {
                        JobPositionId = job.Id,
                        StepNumber = i,
                        StepName = $"Interview Round {i}",
                        Description = $"Round {i} of the interview process"
                    });
                }
            }

            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = job.Id }, new { id = job.Id });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateJobPositionRequest request)
        {
            var job = await _db.JobPositions.FindAsync(id);
            if (job == null) return NotFound();

            job.Title = request.Title;
            job.Department = request.Department;
            job.Location = request.Location;
            job.ManagerName = request.ManagerName;
            job.NumberOfPositions = request.NumberOfPositions;
            job.Description = request.Description;
            job.Requirements = request.Requirements;
            job.SalaryRangeMin = request.SalaryRangeMin;
            job.SalaryRangeMax = request.SalaryRangeMax;
            job.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(new { id = job.Id });
        }

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateJobStatusRequest request)
        {
            var job = await _db.JobPositions.FindAsync(id);
            if (job == null) return NotFound();

            job.Status = request.Status;
            job.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(new { id = job.Id, status = job.Status });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var job = await _db.JobPositions.Include(j => j.Candidates).FirstOrDefaultAsync(j => j.Id == id);
            if (job == null) return NotFound();
            if (job.Candidates.Any())
                return BadRequest(new { message = "Cannot delete a job position that has candidates" });

            _db.JobPositions.Remove(job);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
