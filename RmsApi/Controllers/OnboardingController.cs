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
    public class OnboardingController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        public OnboardingController(AppDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        /// <summary>Move a recruited candidate to onboarding</summary>
        [HttpPost("move")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> MoveToOnboarding([FromBody] MoveToOnboardingRequest request)
        {
            var candidate = await _db.Candidates.FindAsync(request.CandidateId);
            if (candidate == null) return NotFound(new { message = "Candidate not found" });
            if (candidate.Status != "Recruited") return BadRequest(new { message = "Only recruited candidates can be moved to onboarding" });

            // Check if already onboarded
            if (await _db.OnboardingRecords.AnyAsync(o => o.CandidateId == request.CandidateId))
                return BadRequest(new { message = "Candidate is already onboarded" });

            var record = new OnboardingRecord
            {
                CandidateId = request.CandidateId,
                Type = request.Type,
                GhrId = request.GhrId,
                KnoxId = request.KnoxId,
                ProjectLead = request.ProjectLead,
                ProjectManager = request.ProjectManager,
                DateOfJoining = request.DateOfJoining,
                Department = request.Department ?? candidate.JobPosition?.Department,
                Designation = request.Designation,
                EvaluationMonths = request.Type == "Employee" ? 6 : request.EvaluationMonths,
                CreatedById = GetUserId()
            };

            _db.OnboardingRecords.Add(record);
            await _db.SaveChangesAsync();

            // Create milestones
            var months = record.EvaluationMonths;
            for (int i = 1; i <= months; i++)
            {
                _db.OnboardingMilestones.Add(new OnboardingMilestone
                {
                    OnboardingRecordId = record.Id,
                    MonthNumber = i,
                    UnlocksAt = record.DateOfJoining.AddDays(i * 30),
                    Status = "Pending"
                });
            }

            // Update candidate status
            candidate.Status = "Onboarded";
            candidate.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(new { id = record.Id, message = "Candidate moved to onboarding successfully" });
        }

        /// <summary>Promote completed intern to employee probation</summary>
        [HttpPost("{id}/promote")]
        public async Task<IActionResult> PromoteToEmployee(int id)
        {
            var internRecord = await _db.OnboardingRecords
                .Include(o => o.Candidate)
                .Include(o => o.Milestones)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (internRecord == null) return NotFound();
            if (internRecord.Type != "Intern") return BadRequest(new { message = "Only interns can be promoted" });
            if (internRecord.Milestones.Any(m => m.Status != "Completed"))
                return BadRequest(new { message = "All evaluation months must be completed first" });

            // Mark intern record as completed
            internRecord.Status = "Completed";
            internRecord.UpdatedAt = DateTime.UtcNow;

            // Create new employee record for the same candidate
            var empRecord = new OnboardingRecord
            {
                CandidateId = internRecord.CandidateId,
                Type = "Employee",
                GhrId = internRecord.GhrId,
                KnoxId = internRecord.KnoxId,
                ProjectLead = internRecord.ProjectLead,
                ProjectManager = internRecord.ProjectManager,
                DateOfJoining = DateTime.UtcNow,
                Department = internRecord.Department,
                Designation = internRecord.Designation,
                EvaluationMonths = 6,
                CreatedById = GetUserId()
            };

            _db.OnboardingRecords.Add(empRecord);
            await _db.SaveChangesAsync();

            // Create 6 employee milestones
            for (int i = 1; i <= 6; i++)
            {
                _db.OnboardingMilestones.Add(new OnboardingMilestone
                {
                    OnboardingRecordId = empRecord.Id,
                    MonthNumber = i,
                    UnlocksAt = empRecord.DateOfJoining.AddDays(i * 30),
                    Status = "Pending"
                });
            }

            await _db.SaveChangesAsync();
            return Ok(new { id = empRecord.Id, message = "Intern promoted to employee probation" });
        }

        /// <summary>Complete probation — accept or reject</summary>
        [HttpPost("{id}/complete")]
        public async Task<IActionResult> CompleteProbation(int id, [FromBody] CompleteProbationRequest request)
        {
            var record = await _db.OnboardingRecords
                .Include(o => o.Milestones)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (record == null) return NotFound();
            if (record.Milestones.Any(m => m.Status != "Completed"))
                return BadRequest(new { message = "All milestones must be completed first" });

            record.Status = request.Accepted ? "Completed" : "Terminated";
            record.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { id = record.Id, status = record.Status });
        }

        /// <summary>Get all onboarding records with optional date filter</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? type, [FromQuery] string? search,
            [FromQuery] string? status, [FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo)
        {
            var query = _db.OnboardingRecords
                .Include(o => o.Candidate)
                .Include(o => o.Milestones)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(type))
                query = query.Where(o => o.Type == type);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(o => o.Status == status);

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(o => o.Candidate!.FullName.Contains(search) || (o.GhrId != null && o.GhrId.Contains(search)));

            // Date filter — default to current year
            if (dateFrom.HasValue)
                query = query.Where(o => o.DateOfJoining >= dateFrom.Value);
            else
                query = query.Where(o => o.DateOfJoining.Year >= DateTime.UtcNow.Year);

            if (dateTo.HasValue)
                query = query.Where(o => o.DateOfJoining <= dateTo.Value);

            var records = await query.OrderByDescending(o => o.CreatedAt).Select(o => new OnboardingListDto
            {
                Id = o.Id,
                CandidateId = o.CandidateId,
                FullName = o.Candidate!.FullName,
                PhotoUrl = o.Candidate.PhotoUrl,
                Email = o.Candidate.Email,
                Type = o.Type,
                GhrId = o.GhrId,
                Department = o.Department,
                Designation = o.Designation,
                DateOfJoining = o.DateOfJoining,
                EvaluationMonths = o.EvaluationMonths,
                CompletedMilestones = o.Milestones.Count(m => m.Status == "Completed"),
                Status = o.Status,
                CreatedAt = o.CreatedAt
            }).ToListAsync();

            return Ok(records);
        }

        /// <summary>Get onboarding stats with optional date filter</summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats([FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo)
        {
            var records = _db.OnboardingRecords.AsQueryable();

            if (dateFrom.HasValue)
                records = records.Where(o => o.DateOfJoining >= dateFrom.Value);
            else
                records = records.Where(o => o.DateOfJoining.Year >= DateTime.UtcNow.Year);

            if (dateTo.HasValue)
                records = records.Where(o => o.DateOfJoining <= dateTo.Value);

            var stats = new
            {
                TotalEmployees = await records.CountAsync(o => o.Type == "Employee"),
                ActiveEmployees = await records.CountAsync(o => o.Type == "Employee" && o.Status == "Active"),
                TotalInterns = await records.CountAsync(o => o.Type == "Intern"),
                ActiveInterns = await records.CountAsync(o => o.Type == "Intern" && o.Status == "Active"),
                Completed = await records.CountAsync(o => o.Status == "Completed"),
                Total = await records.CountAsync()
            };
            return Ok(stats);
        }

        /// <summary>Get onboarding detail</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var o = await _db.OnboardingRecords
                .Include(r => r.Candidate)
                .Include(r => r.Milestones.OrderBy(m => m.MonthNumber))
                .FirstOrDefaultAsync(r => r.Id == id);

            if (o == null) return NotFound();

            var today = DateTime.UtcNow.Date;
            var dto = new OnboardingDetailDto
            {
                Id = o.Id,
                CandidateId = o.CandidateId,
                FullName = o.Candidate!.FullName,
                PhotoUrl = o.Candidate.PhotoUrl,
                Email = o.Candidate.Email,
                Phone = o.Candidate.Phone,
                Type = o.Type,
                GhrId = o.GhrId,
                KnoxId = o.KnoxId,
                ProjectLead = o.ProjectLead,
                ProjectManager = o.ProjectManager,
                Department = o.Department,
                Designation = o.Designation,
                DateOfJoining = o.DateOfJoining,
                EvaluationMonths = o.EvaluationMonths,
                CompletedMilestones = o.Milestones.Count(m => m.Status == "Completed"),
                Status = o.Status,
                CreatedAt = o.CreatedAt,
                Skills = o.Candidate.Skills,
                ExperienceYears = o.Candidate.ExperienceYears,
                CurrentCompany = o.Candidate.CurrentCompany,
                Education10thSchool = o.Candidate.Education10thSchool,
                Education10thPercentage = o.Candidate.Education10thPercentage,
                Education12thSchool = o.Candidate.Education12thSchool,
                Education12thPercentage = o.Candidate.Education12thPercentage,
                EducationCollegeName = o.Candidate.EducationCollegeName,
                EducationCollegeDegree = o.Candidate.EducationCollegeDegree,
                EducationCollegeCGPA = o.Candidate.EducationCollegeCGPA,
                Milestones = o.Milestones.Select(m => new MilestoneDto
                {
                    Id = m.Id,
                    MonthNumber = m.MonthNumber,
                    BuddyReportUrl = m.BuddyReportUrl,
                    OneToOneReportUrl = m.OneToOneReportUrl,
                    MidTermReportUrl = m.MidTermReportUrl,
                    PerformanceRating = m.PerformanceRating,
                    PerformanceRemarks = m.PerformanceRemarks,
                    Status = m.Status,
                    UnlocksAt = m.UnlocksAt,
                    IsUnlocked = today >= m.UnlocksAt.Date,
                    IsMidTermMonth = m.MonthNumber % 3 == 0,
                    CompletedAt = m.CompletedAt
                }).ToList()
            };

            return Ok(dto);
        }

        /// <summary>Update onboarding record (Admin only)</summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateOnboardingRequest request)
        {
            var record = await _db.OnboardingRecords.FindAsync(id);
            if (record == null) return NotFound();

            if (request.GhrId != null) record.GhrId = request.GhrId;
            if (request.KnoxId != null) record.KnoxId = request.KnoxId;
            if (request.ProjectLead != null) record.ProjectLead = request.ProjectLead;
            if (request.ProjectManager != null) record.ProjectManager = request.ProjectManager;
            if (request.Department != null) record.Department = request.Department;
            if (request.Designation != null) record.Designation = request.Designation;
            if (request.Status != null) record.Status = request.Status;
            record.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(new { id = record.Id });
        }

        /// <summary>Upload document for a milestone</summary>
        [HttpPost("milestone/{id}/upload")]
        public async Task<IActionResult> UploadMilestoneDoc(int id, [FromForm] string docType, IFormFile file)
        {
            var milestone = await _db.OnboardingMilestones
                .Include(m => m.OnboardingRecord)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (milestone == null) return NotFound();
            if (DateTime.UtcNow.Date < milestone.UnlocksAt.Date)
                return BadRequest(new { message = "This milestone is not yet unlocked" });

            // Save file
            var uploadsDir = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "onboarding");
            Directory.CreateDirectory(uploadsDir);
            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine(uploadsDir, fileName);
            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);
            var url = $"/uploads/onboarding/{fileName}";

            switch (docType.ToLower())
            {
                case "buddy": milestone.BuddyReportUrl = url; break;
                case "onetoone": milestone.OneToOneReportUrl = url; break;
                case "midterm": milestone.MidTermReportUrl = url; break;
                default: return BadRequest(new { message = "Invalid document type. Use: buddy, onetoone, midterm" });
            }

            // Check if milestone is now complete
            CheckMilestoneCompletion(milestone);
            await _db.SaveChangesAsync();

            return Ok(new { url, status = milestone.Status });
        }

        /// <summary>Update milestone performance rating</summary>
        [HttpPut("milestone/{id}")]
        public async Task<IActionResult> UpdateMilestone(int id, [FromBody] UpdateMilestoneRequest request)
        {
            var milestone = await _db.OnboardingMilestones.FindAsync(id);
            if (milestone == null) return NotFound();
            if (DateTime.UtcNow.Date < milestone.UnlocksAt.Date)
                return BadRequest(new { message = "This milestone is not yet unlocked" });

            if (request.PerformanceRating.HasValue)
                milestone.PerformanceRating = request.PerformanceRating.Value;
            if (request.PerformanceRemarks != null)
                milestone.PerformanceRemarks = request.PerformanceRemarks;

            CheckMilestoneCompletion(milestone);
            await _db.SaveChangesAsync();

            return Ok(new { id = milestone.Id, status = milestone.Status });
        }

        private void CheckMilestoneCompletion(OnboardingMilestone milestone)
        {
            bool isMidTermMonth = milestone.MonthNumber % 3 == 0;
            bool hasBasics = milestone.BuddyReportUrl != null && milestone.OneToOneReportUrl != null && milestone.PerformanceRating != null;
            bool hasMidTerm = !isMidTermMonth || milestone.MidTermReportUrl != null;

            if (hasBasics && hasMidTerm)
            {
                milestone.Status = "Completed";
                milestone.CompletedAt = DateTime.UtcNow;
            }
        }
    }

    public class UpdateMilestoneRequest
    {
        public int? PerformanceRating { get; set; }
        public string? PerformanceRemarks { get; set; }
    }

    public class CompleteProbationRequest
    {
        public bool Accepted { get; set; }
    }
}
