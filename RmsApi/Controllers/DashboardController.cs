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
        public async Task<IActionResult> GetStats([FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo)
        {
            var jobsQuery = _db.JobPositions.AsQueryable();
            var candidatesQuery = _db.Candidates.Where(c => c.Status != "Onboarded");

            // Date filter — default to current year
            if (dateFrom.HasValue)
            {
                jobsQuery = jobsQuery.Where(j => j.CreatedAt >= dateFrom.Value);
                candidatesQuery = candidatesQuery.Where(c => c.CreatedAt >= dateFrom.Value);
            }
            else
            {
                var yearStart = new DateTime(DateTime.UtcNow.Year, 1, 1);
                jobsQuery = jobsQuery.Where(j => j.CreatedAt >= yearStart);
                candidatesQuery = candidatesQuery.Where(c => c.CreatedAt >= yearStart);
            }

            if (dateTo.HasValue)
            {
                var dateToEnd = dateTo.Value.Date.AddDays(1);
                jobsQuery = jobsQuery.Where(j => j.CreatedAt < dateToEnd);
                candidatesQuery = candidatesQuery.Where(c => c.CreatedAt < dateToEnd);
            }

            var totalJobs = await jobsQuery.CountAsync();
            var openJobs = await jobsQuery.CountAsync(j => j.Status == "Open");
            var totalCandidates = await candidatesQuery.CountAsync();
            var hired = await candidatesQuery.CountAsync(c => c.Status == "Recruited");
            var active = await candidatesQuery.CountAsync(c => c.Status == "InProgress" || c.Status == "New");
            var rejected = await candidatesQuery.CountAsync(c => c.Status == "Rejected");

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
        public async Task<IActionResult> GetRecentActivity([FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo)
        {
            var interviewQuery = _db.CandidateInterviews
                .Include(ci => ci.Candidate)
                    .ThenInclude(c => c!.JobPosition)
                .Include(ci => ci.InterviewStep)
                .Where(ci => ci.CompletedAt != null);

            // Date filter — default to current year
            if (dateFrom.HasValue)
                interviewQuery = interviewQuery.Where(ci => ci.CompletedAt >= dateFrom.Value);
            else
                interviewQuery = interviewQuery.Where(ci => ci.CompletedAt!.Value.Year >= DateTime.UtcNow.Year);

            if (dateTo.HasValue)
            {
                var dateToEnd = dateTo.Value.Date.AddDays(1);
                interviewQuery = interviewQuery.Where(ci => ci.CompletedAt < dateToEnd);
            }

            var recent = await interviewQuery
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
            var newCandQuery = _db.Candidates
                .Include(c => c.JobPosition)
                .AsQueryable();

            if (dateFrom.HasValue)
                newCandQuery = newCandQuery.Where(c => c.CreatedAt >= dateFrom.Value);
            else
                newCandQuery = newCandQuery.Where(c => c.CreatedAt.Year >= DateTime.UtcNow.Year);

            if (dateTo.HasValue)
            {
                var dateToEnd = dateTo.Value.Date.AddDays(1);
                newCandQuery = newCandQuery.Where(c => c.CreatedAt < dateToEnd);
            }

            var newCandidates = await newCandQuery
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
        public async Task<IActionResult> GetPipeline([FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo)
        {
            var query = _db.Candidates.AsQueryable();

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

            var newCount = await query.CountAsync(c => c.Status == "New");
            var inProgress = await query.CountAsync(c => c.Status == "InProgress");
            var recruited = await query.CountAsync(c => c.Status == "Recruited");
            var rejected = await query.CountAsync(c => c.Status == "Rejected");

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
