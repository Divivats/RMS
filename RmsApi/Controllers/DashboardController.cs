using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
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

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        private string GetUserRole() => User.FindFirstValue(ClaimTypes.Role)!;

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats([FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo)
        {
            var role = GetUserRole();
            var userId = GetUserId();

            if (role == "ProjectManager")
                return Ok(await GetPMStats(userId, dateFrom, dateTo));
            if (role == "MD")
                return Ok(await GetMDStats(dateFrom, dateTo));

            // Admin / Consultant — existing behavior but only for Active jobs
            return Ok(await GetAdminStats(dateFrom, dateTo));
        }

        private async Task<DashboardStatsDto> GetPMStats(int userId, DateTime? dateFrom, DateTime? dateTo)
        {
            var jobsQuery = _db.JobPositions.Where(j => j.CreatedById == userId);
            jobsQuery = ApplyDateFilter(jobsQuery, dateFrom, dateTo);

            var totalJobs = await jobsQuery.CountAsync();
            var pending = await jobsQuery.CountAsync(j => j.ApprovalStatus == "PendingMDApproval");
            var approved = await jobsQuery.CountAsync(j => j.ApprovalStatus == "MDApproved" || j.ApprovalStatus == "Active");
            var rejected = await jobsQuery.CountAsync(j => j.ApprovalStatus == "MDRejected");
            var active = await jobsQuery.CountAsync(j => j.ApprovalStatus == "Active");

            // Candidate stats across PM's active jobs
            var activeJobIds = await jobsQuery.Where(j => j.ApprovalStatus == "Active").Select(j => j.Id).ToListAsync();
            var candidatesQuery = _db.Candidates.Where(c => activeJobIds.Contains(c.JobPositionId) && c.Status != "Onboarded");
            var totalCandidates = await candidatesQuery.CountAsync();
            var hired = await candidatesQuery.CountAsync(c => c.Status == "Recruited");

            return new DashboardStatsDto
            {
                TotalJobs = totalJobs,
                OpenJobs = active,
                TotalCandidates = totalCandidates,
                HiredCandidates = hired,
                ActiveCandidates = await candidatesQuery.CountAsync(c => c.Status == "InProgress" || c.Status == "New"),
                RejectedCandidates = await candidatesQuery.CountAsync(c => c.Status == "Rejected"),
                HiringRate = totalCandidates > 0 ? Math.Round((double)hired / totalCandidates * 100, 1) : 0,
                PendingApproval = pending,
                ApprovedJobs = approved,
                RejectedJobs = rejected
            };
        }

        private async Task<DashboardStatsDto> GetMDStats(DateTime? dateFrom, DateTime? dateTo)
        {
            var jobsQuery = _db.JobPositions.AsQueryable();
            jobsQuery = ApplyDateFilter(jobsQuery, dateFrom, dateTo);

            // MD only cares about jobs that go through approval
            var pending = await jobsQuery.CountAsync(j => j.ApprovalStatus == "PendingMDApproval");
            var approved = await jobsQuery.CountAsync(j => j.ApprovalStatus == "MDApproved" || j.ApprovalStatus == "Active");
            var rejected = await jobsQuery.CountAsync(j => j.ApprovalStatus == "MDRejected");
            var totalJobs = await jobsQuery.CountAsync();
            var active = await jobsQuery.CountAsync(j => j.ApprovalStatus == "Active");

            // Candidate stats across all active jobs (read-only visibility)
            var activeJobIds = await jobsQuery.Where(j => j.ApprovalStatus == "Active").Select(j => j.Id).ToListAsync();
            var candidatesQuery = _db.Candidates.Where(c => activeJobIds.Contains(c.JobPositionId) && c.Status != "Onboarded");
            var totalCandidates = await candidatesQuery.CountAsync();
            var hired = await candidatesQuery.CountAsync(c => c.Status == "Recruited");

            return new DashboardStatsDto
            {
                TotalJobs = totalJobs,
                OpenJobs = active,
                TotalCandidates = totalCandidates,
                HiredCandidates = hired,
                ActiveCandidates = await candidatesQuery.CountAsync(c => c.Status == "InProgress" || c.Status == "New"),
                RejectedCandidates = await candidatesQuery.CountAsync(c => c.Status == "Rejected"),
                HiringRate = totalCandidates > 0 ? Math.Round((double)hired / totalCandidates * 100, 1) : 0,
                PendingApproval = pending,
                ApprovedJobs = approved,
                RejectedJobs = rejected
            };
        }

        private async Task<DashboardStatsDto> GetAdminStats(DateTime? dateFrom, DateTime? dateTo)
        {
            var jobsQuery = _db.JobPositions.Where(j => j.ApprovalStatus == "Active");
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
            var rejectedCandidates = await candidatesQuery.CountAsync(c => c.Status == "Rejected");

            // Also include count of jobs pending admin activation
            var pendingActivation = await _db.JobPositions.CountAsync(j => j.ApprovalStatus == "MDApproved");

            return new DashboardStatsDto
            {
                TotalJobs = totalJobs,
                OpenJobs = openJobs,
                TotalCandidates = totalCandidates,
                HiredCandidates = hired,
                ActiveCandidates = active,
                RejectedCandidates = rejectedCandidates,
                HiringRate = totalCandidates > 0 ? Math.Round((double)hired / totalCandidates * 100, 1) : 0,
                PendingApproval = pendingActivation
            };
        }

        private IQueryable<Models.JobPosition> ApplyDateFilter(IQueryable<Models.JobPosition> query, DateTime? dateFrom, DateTime? dateTo)
        {
            if (dateFrom.HasValue)
                query = query.Where(j => j.CreatedAt >= dateFrom.Value);
            else
                query = query.Where(j => j.CreatedAt.Year >= DateTime.UtcNow.Year);

            if (dateTo.HasValue)
            {
                var dateToEnd = dateTo.Value.Date.AddDays(1);
                query = query.Where(j => j.CreatedAt < dateToEnd);
            }
            return query;
        }

        [HttpGet("recent-activity")]
        public async Task<IActionResult> GetRecentActivity([FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo)
        {
            var role = GetUserRole();
            var userId = GetUserId();

            var interviewQuery = _db.CandidateInterviews
                .Include(ci => ci.Candidate)
                    .ThenInclude(c => c!.JobPosition)
                .Include(ci => ci.InterviewStep)
                .Where(ci => ci.CompletedAt != null);

            // PM/MD: filter to their relevant jobs
            if (role == "ProjectManager")
            {
                interviewQuery = interviewQuery.Where(ci => ci.Candidate!.JobPosition!.CreatedById == userId);
            }
            else if (role != "MD")
            {
                // Admin/Consultant: only active jobs
                interviewQuery = interviewQuery.Where(ci => ci.Candidate!.JobPosition!.ApprovalStatus == "Active");
            }

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

            if (role == "ProjectManager")
                newCandQuery = newCandQuery.Where(c => c.JobPosition!.CreatedById == userId);
            else if (role != "MD")
                newCandQuery = newCandQuery.Where(c => c.JobPosition!.ApprovalStatus == "Active");

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
            var role = GetUserRole();
            var userId = GetUserId();

            var query = _db.Candidates.Include(c => c.JobPosition).AsQueryable();

            if (role == "ProjectManager")
                query = query.Where(c => c.JobPosition!.CreatedById == userId);
            else if (role != "MD")
                query = query.Where(c => c.JobPosition!.ApprovalStatus == "Active");

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
