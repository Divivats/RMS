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
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? status,
            [FromQuery] string? approvalStatus,
            [FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo)
        {
            var role = GetUserRole();
            var userId = GetUserId();

            var query = _db.JobPositions
                .Include(j => j.Candidates)
                .AsQueryable();

            // Role-based filtering
            if (role == "ProjectManager")
            {
                // PM sees only their own jobs
                query = query.Where(j => j.CreatedById == userId);
            }
            else if (role == "MD")
            {
                // MD sees jobs pending their approval + jobs they've already approved
                query = query.Where(j => j.ApprovalStatus == "PendingMDApproval"
                    || j.ApprovalStatus == "MDApproved"
                    || j.ApprovalStatus == "MDRejected"
                    || j.ApprovalStatus == "Active");
            }
            else
            {
                // Admin/Consultant see only Active (fully approved) jobs
                query = query.Where(j => j.ApprovalStatus == "Active");
            }

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(j => j.Title.Contains(search) || j.JobId.Contains(search) || j.Department.Contains(search));

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(j => j.Status == status);

            if (!string.IsNullOrWhiteSpace(approvalStatus))
                query = query.Where(j => j.ApprovalStatus == approvalStatus);

            // Date filter — default to current year
            if (dateFrom.HasValue)
                query = query.Where(j => j.CreatedAt >= dateFrom.Value);
            else
                query = query.Where(j => j.CreatedAt.Year >= DateTime.UtcNow.Year);

            if (dateTo.HasValue)
            {
                var dateToEnd = dateTo.Value.Date.AddDays(1);
                query = query.Where(j => j.CreatedAt < dateToEnd);
            }

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
                ApprovalStatus = j.ApprovalStatus,
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
                .Include(j => j.ApprovedByMD)
                .Include(j => j.ApprovedByAdmin)
                .FirstOrDefaultAsync(j => j.Id == id);

            if (job == null) return NotFound();

            // Access control: PM can only see their own jobs
            var role = GetUserRole();
            var userId = GetUserId();
            if (role == "ProjectManager" && job.CreatedById != userId)
                return Forbid();

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
                ApprovalStatus = job.ApprovalStatus,
                Description = job.Description,
                Requirements = job.Requirements,
                SalaryRangeMin = job.SalaryRangeMin,
                SalaryRangeMax = job.SalaryRangeMax,
                CreatedByName = job.CreatedBy?.FullName,
                ApprovalComments = job.ApprovalComments,
                ApprovedByMDName = job.ApprovedByMD?.FullName,
                ApprovedByMDAt = job.ApprovedByMDAt,
                ApprovedByAdminName = job.ApprovedByAdmin?.FullName,
                ApprovedByAdminAt = job.ApprovedByAdminAt,
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
        [Authorize(Roles = "Admin,ProjectManager")]
        public async Task<IActionResult> Create([FromBody] CreateJobPositionRequest request)
        {
            if (await _db.JobPositions.AnyAsync(j => j.JobId == request.JobId))
                return BadRequest(new { message = "Job ID already exists" });

            var role = GetUserRole();

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
                CreatedById = GetUserId(),
                // PM-created jobs go to approval; Admin-created jobs are immediately Active
                ApprovalStatus = role == "ProjectManager" ? "PendingMDApproval" : "Active"
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

            // If PM created → notify all MD users
            if (role == "ProjectManager")
            {
                var pmUser = await _db.Users.FindAsync(GetUserId());
                var mdUsers = await _db.Users.Where(u => u.Role == "MD" && u.IsActive).ToListAsync();
                foreach (var md in mdUsers)
                {
                    _db.Notifications.Add(new Notification
                    {
                        UserId = md.Id,
                        Title = "New Job for Approval",
                        Message = $"{pmUser?.FullName} submitted \"{job.Title}\" ({job.JobId}) for your approval.",
                        Type = "JobSubmitted",
                        RelatedEntityType = "JobPosition",
                        RelatedEntityId = job.Id
                    });
                }
                await _db.SaveChangesAsync();
            }

            return CreatedAtAction(nameof(GetById), new { id = job.Id }, new { id = job.Id });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,ProjectManager")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateJobPositionRequest request)
        {
            var job = await _db.JobPositions.FindAsync(id);
            if (job == null) return NotFound();

            var role = GetUserRole();

            // PM can only edit their own jobs that are Draft or Rejected
            if (role == "ProjectManager")
            {
                if (job.CreatedById != GetUserId())
                    return Forbid();
                if (job.ApprovalStatus != "Draft" && job.ApprovalStatus != "MDRejected")
                    return BadRequest(new { message = "You can only edit jobs in Draft or Rejected status." });
            }

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

        // ── Approval Workflow Endpoints ──

        /// <summary>PM submits (or resubmits) a job for MD approval</summary>
        [HttpPost("{id}/submit")]
        [Authorize(Roles = "ProjectManager")]
        public async Task<IActionResult> SubmitForApproval(int id)
        {
            var job = await _db.JobPositions.FindAsync(id);
            if (job == null) return NotFound();
            if (job.CreatedById != GetUserId())
                return Forbid();
            if (job.ApprovalStatus != "Draft" && job.ApprovalStatus != "MDRejected")
                return BadRequest(new { message = "Job can only be submitted from Draft or Rejected status." });

            job.ApprovalStatus = "PendingMDApproval";
            job.ApprovalComments = null;
            job.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // Notify all MDs
            var pmUser = await _db.Users.FindAsync(GetUserId());
            var mdUsers = await _db.Users.Where(u => u.Role == "MD" && u.IsActive).ToListAsync();
            foreach (var md in mdUsers)
            {
                _db.Notifications.Add(new Notification
                {
                    UserId = md.Id,
                    Title = "Job Resubmitted for Approval",
                    Message = $"{pmUser?.FullName} resubmitted \"{job.Title}\" ({job.JobId}) for your approval.",
                    Type = "JobSubmitted",
                    RelatedEntityType = "JobPosition",
                    RelatedEntityId = job.Id
                });
            }
            await _db.SaveChangesAsync();

            return Ok(new { id = job.Id, approvalStatus = job.ApprovalStatus });
        }

        /// <summary>MD approves a job</summary>
        [HttpPost("{id}/approve")]
        [Authorize(Roles = "MD")]
        public async Task<IActionResult> Approve(int id, [FromBody] ApprovalActionRequest? request)
        {
            var job = await _db.JobPositions.Include(j => j.CreatedBy).FirstOrDefaultAsync(j => j.Id == id);
            if (job == null) return NotFound();
            if (job.ApprovalStatus != "PendingMDApproval")
                return BadRequest(new { message = "Job is not pending MD approval." });

            var mdUserId = GetUserId();
            job.ApprovalStatus = "MDApproved";
            job.ApprovalComments = request?.Comments;
            job.ApprovedByMDId = mdUserId;
            job.ApprovedByMDAt = DateTime.UtcNow;
            job.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var mdUser = await _db.Users.FindAsync(mdUserId);

            // Notify all Admins
            var adminUsers = await _db.Users.Where(u => u.Role == "Admin" && u.IsActive).ToListAsync();
            foreach (var admin in adminUsers)
            {
                _db.Notifications.Add(new Notification
                {
                    UserId = admin.Id,
                    Title = "Job Approved by MD",
                    Message = $"{mdUser?.FullName} approved \"{job.Title}\" ({job.JobId}). Please review and activate.",
                    Type = "JobApproved",
                    RelatedEntityType = "JobPosition",
                    RelatedEntityId = job.Id
                });
            }

            // Notify the PM who created the job
            if (job.CreatedBy != null)
            {
                _db.Notifications.Add(new Notification
                {
                    UserId = job.CreatedById,
                    Title = "Your Job Was Approved by MD",
                    Message = $"\"{job.Title}\" ({job.JobId}) has been approved by {mdUser?.FullName}. Awaiting HR activation.",
                    Type = "JobApproved",
                    RelatedEntityType = "JobPosition",
                    RelatedEntityId = job.Id
                });
            }

            await _db.SaveChangesAsync();
            return Ok(new { id = job.Id, approvalStatus = job.ApprovalStatus });
        }

        /// <summary>MD rejects a job (sends back to PM)</summary>
        [HttpPost("{id}/reject")]
        [Authorize(Roles = "MD")]
        public async Task<IActionResult> Reject(int id, [FromBody] ApprovalActionRequest request)
        {
            var job = await _db.JobPositions.Include(j => j.CreatedBy).FirstOrDefaultAsync(j => j.Id == id);
            if (job == null) return NotFound();
            if (job.ApprovalStatus != "PendingMDApproval")
                return BadRequest(new { message = "Job is not pending MD approval." });

            job.ApprovalStatus = "MDRejected";
            job.ApprovalComments = request.Comments;
            job.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var mdUser = await _db.Users.FindAsync(GetUserId());

            // Notify the PM
            _db.Notifications.Add(new Notification
            {
                UserId = job.CreatedById,
                Title = "Job Rejected by MD",
                Message = $"\"{job.Title}\" ({job.JobId}) was rejected by {mdUser?.FullName}. Comments: {request.Comments ?? "None"}",
                Type = "JobRejected",
                RelatedEntityType = "JobPosition",
                RelatedEntityId = job.Id
            });
            await _db.SaveChangesAsync();

            return Ok(new { id = job.Id, approvalStatus = job.ApprovalStatus });
        }

        /// <summary>Admin activates an MD-approved job (makes it visible to HR/Consultants)</summary>
        [HttpPost("{id}/activate")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Activate(int id, [FromBody] ApprovalActionRequest? request)
        {
            var job = await _db.JobPositions.Include(j => j.CreatedBy).FirstOrDefaultAsync(j => j.Id == id);
            if (job == null) return NotFound();
            if (job.ApprovalStatus != "MDApproved")
                return BadRequest(new { message = "Job must be approved by MD before activation." });

            var adminUserId = GetUserId();
            job.ApprovalStatus = "Active";
            job.ApprovalComments = request?.Comments;
            job.ApprovedByAdminId = adminUserId;
            job.ApprovedByAdminAt = DateTime.UtcNow;
            job.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var adminUser = await _db.Users.FindAsync(adminUserId);

            // Notify PM
            _db.Notifications.Add(new Notification
            {
                UserId = job.CreatedById,
                Title = "Job Activated",
                Message = $"\"{job.Title}\" ({job.JobId}) has been activated by {adminUser?.FullName}. It is now live for recruitment.",
                Type = "JobActivated",
                RelatedEntityType = "JobPosition",
                RelatedEntityId = job.Id
            });

            // Notify all MDs
            var mdUsers = await _db.Users.Where(u => u.Role == "MD" && u.IsActive).ToListAsync();
            foreach (var md in mdUsers)
            {
                _db.Notifications.Add(new Notification
                {
                    UserId = md.Id,
                    Title = "Job Activated by HR",
                    Message = $"\"{job.Title}\" ({job.JobId}) has been activated by {adminUser?.FullName}.",
                    Type = "JobActivated",
                    RelatedEntityType = "JobPosition",
                    RelatedEntityId = job.Id
                });
            }

            // Notify all Consultants
            var consultantUsers = await _db.Users.Where(u => u.Role == "Consultant" && u.IsActive).ToListAsync();
            foreach (var consultant in consultantUsers)
            {
                _db.Notifications.Add(new Notification
                {
                    UserId = consultant.Id,
                    Title = "New Job Position Activated",
                    Message = $"\"{job.Title}\" ({job.JobId}) is now live for recruitment. Activated by {adminUser?.FullName}.",
                    Type = "JobActivated",
                    RelatedEntityType = "JobPosition",
                    RelatedEntityId = job.Id
                });
            }

            await _db.SaveChangesAsync();
            return Ok(new { id = job.Id, approvalStatus = job.ApprovalStatus });
        }

        /// <summary>Admin sends an MD-approved job back to MD for re-review</summary>
        [HttpPost("{id}/send-back")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SendBack(int id, [FromBody] ApprovalActionRequest request)
        {
            var job = await _db.JobPositions.FirstOrDefaultAsync(j => j.Id == id);
            if (job == null) return NotFound();
            if (job.ApprovalStatus != "MDApproved")
                return BadRequest(new { message = "Can only send back jobs that are MD-approved." });

            job.ApprovalStatus = "PendingMDApproval";
            job.ApprovalComments = request.Comments;
            job.ApprovedByMDId = null;
            job.ApprovedByMDAt = null;
            job.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var adminUser = await _db.Users.FindAsync(GetUserId());

            // Notify all MDs
            var mdUsers = await _db.Users.Where(u => u.Role == "MD" && u.IsActive).ToListAsync();
            foreach (var md in mdUsers)
            {
                _db.Notifications.Add(new Notification
                {
                    UserId = md.Id,
                    Title = "Job Sent Back for Review",
                    Message = $"{adminUser?.FullName} sent \"{job.Title}\" ({job.JobId}) back for review. Comments: {request.Comments ?? "None"}",
                    Type = "JobSentBack",
                    RelatedEntityType = "JobPosition",
                    RelatedEntityId = job.Id
                });
            }

            // Notify PM
            _db.Notifications.Add(new Notification
            {
                UserId = job.CreatedById,
                Title = "Job Sent Back by HR",
                Message = $"\"{job.Title}\" ({job.JobId}) was sent back to MD for review by {adminUser?.FullName}.",
                Type = "JobSentBack",
                RelatedEntityType = "JobPosition",
                RelatedEntityId = job.Id
            });

            await _db.SaveChangesAsync();
            return Ok(new { id = job.Id, approvalStatus = job.ApprovalStatus });
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
