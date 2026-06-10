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
    public class InterviewsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public InterviewsController(AppDbContext db) => _db = db;

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpGet("questions")]
        public async Task<IActionResult> GetQuestions()
        {
            var questions = await _db.EvaluationQuestions
                .Where(q => q.IsActive)
                .OrderBy(q => q.SortOrder)
                .Select(q => new EvaluationQuestionDto
                {
                    Id = q.Id,
                    QuestionText = q.QuestionText,
                    Category = q.Category,
                    SortOrder = q.SortOrder
                }).ToListAsync();

            return Ok(questions);
        }

        [HttpGet("candidate/{candidateId}")]
        public async Task<IActionResult> GetCandidateInterviews(int candidateId)
        {
            var interviews = await _db.CandidateInterviews
                .Include(ci => ci.InterviewStep)
                .Include(ci => ci.Evaluations).ThenInclude(e => e.EvaluationQuestion)
                .Include(ci => ci.ConductedBy)
                .Where(ci => ci.CandidateId == candidateId)
                .OrderBy(ci => ci.StepNumber)
                .Select(ci => new CandidateInterviewDto
                {
                    Id = ci.Id,
                    StepNumber = ci.StepNumber,
                    StepName = ci.InterviewStep!.StepName,
                    StepDescription = ci.InterviewStep.Description,
                    Status = ci.Status,
                    InterviewDate = ci.InterviewDate,
                    InterviewerName = ci.InterviewerName,
                    OverallRating = ci.OverallRating,
                    Comments = ci.Comments,
                    ConductedByName = ci.ConductedBy != null ? ci.ConductedBy.FullName : null,
                    CompletedAt = ci.CompletedAt,
                    Evaluations = ci.Evaluations.Select(e => new EvaluationDto
                    {
                        Id = e.Id,
                        QuestionId = e.EvaluationQuestionId,
                        QuestionText = e.EvaluationQuestion!.QuestionText,
                        Category = e.EvaluationQuestion.Category,
                        Rating = e.Rating,
                        Remarks = e.Remarks
                    }).ToList()
                }).ToListAsync();

            return Ok(interviews);
        }

        [HttpGet("evaluation/{interviewId}")]
        public async Task<IActionResult> GetEvaluation(int interviewId)
        {
            var interview = await _db.CandidateInterviews
                .Include(ci => ci.InterviewStep)
                .Include(ci => ci.Evaluations).ThenInclude(e => e.EvaluationQuestion)
                .Include(ci => ci.ConductedBy)
                .Include(ci => ci.Candidate)
                .FirstOrDefaultAsync(ci => ci.Id == interviewId);

            if (interview == null) return NotFound();

            return Ok(new CandidateInterviewDto
            {
                Id = interview.Id,
                StepNumber = interview.StepNumber,
                StepName = interview.InterviewStep!.StepName,
                StepDescription = interview.InterviewStep.Description,
                Status = interview.Status,
                InterviewDate = interview.InterviewDate,
                InterviewerName = interview.InterviewerName,
                OverallRating = interview.OverallRating,
                Comments = interview.Comments,
                ConductedByName = interview.ConductedBy?.FullName,
                CompletedAt = interview.CompletedAt,
                Evaluations = interview.Evaluations.Select(e => new EvaluationDto
                {
                    Id = e.Id,
                    QuestionId = e.EvaluationQuestionId,
                    QuestionText = e.EvaluationQuestion!.QuestionText,
                    Category = e.EvaluationQuestion.Category,
                    Rating = e.Rating,
                    Remarks = e.Remarks
                }).ToList()
            });
        }

        [HttpPost("advance")]
        [Authorize(Roles = "Admin,Consultant")]
        public async Task<IActionResult> AdvanceCandidate([FromBody] AdvanceInterviewRequest request)
        {
            var candidate = await _db.Candidates
                .Include(c => c.JobPosition)
                .FirstOrDefaultAsync(c => c.Id == request.CandidateId);

            if (candidate == null) return NotFound(new { message = "Candidate not found" });

            var interview = await _db.CandidateInterviews
                .FirstOrDefaultAsync(ci => ci.CandidateId == request.CandidateId && ci.StepNumber == request.StepNumber);

            if (interview == null) return NotFound(new { message = "Interview step not found" });

            if (interview.Status != "Pending")
                return BadRequest(new { message = "This interview step has already been completed" });

            // Check previous steps are all completed
            var previousIncomplete = await _db.CandidateInterviews
                .AnyAsync(ci => ci.CandidateId == request.CandidateId
                    && ci.StepNumber < request.StepNumber
                    && ci.Status == "Pending");

            if (previousIncomplete)
                return BadRequest(new { message = "Previous interview steps must be completed first" });

            // Update interview
            interview.Status = request.Status;
            interview.InterviewDate = request.InterviewDate ?? DateTime.UtcNow;
            interview.InterviewerName = request.InterviewerName;
            interview.OverallRating = request.OverallRating;
            interview.Comments = request.Comments;
            interview.ConductedById = GetUserId();
            interview.CompletedAt = DateTime.UtcNow;

            // Save evaluations
            foreach (var eval in request.Evaluations)
            {
                _db.CandidateEvaluations.Add(new CandidateEvaluation
                {
                    CandidateInterviewId = interview.Id,
                    EvaluationQuestionId = eval.QuestionId,
                    Rating = eval.Rating,
                    Remarks = eval.Remarks
                });
            }

            // Update candidate status
            if (request.Status == "Failed")
            {
                candidate.Status = "Rejected";
                candidate.CurrentStepNumber = request.StepNumber;
            }
            else
            {
                candidate.CurrentStepNumber = request.StepNumber;

                if (request.StepNumber >= candidate.JobPosition!.InterviewStepCount)
                {
                    candidate.Status = "Recruited";
                }
                else
                {
                    candidate.Status = "InProgress";
                }
            }

            candidate.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Interview step completed", candidateStatus = candidate.Status });
        }
    }
}
