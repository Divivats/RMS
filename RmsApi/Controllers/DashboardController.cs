using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RmsApi.Data;
using RmsApi.DTOs;

namespace RmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _db;

        public DashboardController(AppDbContext db) => _db = db;

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var totalJobs = await _db.JobPositions.CountAsync();
            var openJobs = await _db.JobPositions.CountAsync(j => j.Status == "Open");
            var totalCandidates = await _db.Candidates.CountAsync();
            var hired = await _db.Candidates.CountAsync(c => c.Status == "Recruited");
            var active = await _db.Candidates.CountAsync(c => c.Status == "InProgress" || c.Status == "New");
            var rejected = await _db.Candidates.CountAsync(c => c.Status == "Rejected");

            return Ok(new DashboardStatsDto
            {
                TotalJobs = totalJobs,
                OpenJobs = openJobs,
                TotalCandidates = totalCandidates,
                HiredCandidates = hired,
                ActiveCandidates = active,
                RejectedCandidates = rejected,
                HiringRate = totalCandidates > 0 ? Math.Round((double)hired / totalCandidates * 100, 1) : 0
            });
        }

        [HttpGet("recent-activity")]
        public async Task<IActionResult> GetRecentActivity()
        {
            var recent = await _db.CandidateInterviews
                .Include(ci => ci.Candidate)
                    .ThenInclude(c => c!.JobPosition)
                .Include(ci => ci.InterviewStep)
                .Where(ci => ci.CompletedAt != null)
                .OrderByDescending(ci => ci.CompletedAt)
                .Take(10)
                .Select(ci => new RecentActivityDto
                {
                    CandidateName = ci.Candidate!.FullName,
                    CandidatePhoto = ci.Candidate.PhotoUrl,
                    JobTitle = ci.Candidate.JobPosition!.Title,
                    Action = $"Completed {ci.InterviewStep!.StepName}",
                    Status = ci.Status,
                    Timestamp = ci.CompletedAt!.Value
                }).ToListAsync();

            // Also include newly created candidates
            var newCandidates = await _db.Candidates
                .Include(c => c.JobPosition)
                .OrderByDescending(c => c.CreatedAt)
                .Take(5)
                .Select(c => new RecentActivityDto
                {
                    CandidateName = c.FullName,
                    CandidatePhoto = c.PhotoUrl,
                    JobTitle = c.JobPosition!.Title,
                    Action = "Applied",
                    Status = c.Status,
                    Timestamp = c.CreatedAt
                }).ToListAsync();

            var all = recent.Concat(newCandidates).OrderByDescending(a => a.Timestamp).Take(10).ToList();
            return Ok(all);
        }

        [HttpGet("pipeline")]
        public async Task<IActionResult> GetPipeline()
        {
            var newCount = await _db.Candidates.CountAsync(c => c.Status == "New");
            var inProgress = await _db.Candidates.CountAsync(c => c.Status == "InProgress");
            var recruited = await _db.Candidates.CountAsync(c => c.Status == "Recruited");
            var rejected = await _db.Candidates.CountAsync(c => c.Status == "Rejected");

            var pipeline = new List<PipelineStageDto>
            {
                new() { StageName = "New Applicants", Count = newCount },
                new() { StageName = "In Progress", Count = inProgress },
                new() { StageName = "Recruited", Count = recruited },
                new() { StageName = "Rejected", Count = rejected }
            };

            return Ok(pipeline);
        }
    }
}
