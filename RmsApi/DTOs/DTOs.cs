namespace RmsApi.DTOs
{
    // Auth
    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public int UserId { get; set; }
    }

    // Job Position
    public class CreateJobPositionRequest
    {
        public string JobId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string? Location { get; set; }
        public string ManagerName { get; set; } = string.Empty;
        public int NumberOfPositions { get; set; } = 1;
        public int InterviewStepCount { get; set; } = 1;
        public string? Description { get; set; }
        public string? Requirements { get; set; }
        public decimal? SalaryRangeMin { get; set; }
        public decimal? SalaryRangeMax { get; set; }
        public List<InterviewStepDto> InterviewSteps { get; set; } = new();
    }

    public class InterviewStepDto
    {
        public int StepNumber { get; set; }
        public string StepName { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class JobPositionListDto
    {
        public int Id { get; set; }
        public string JobId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string? Location { get; set; }
        public string ManagerName { get; set; } = string.Empty;
        public int NumberOfPositions { get; set; }
        public int InterviewStepCount { get; set; }
        public string Status { get; set; } = string.Empty;
        public int TotalCandidates { get; set; }
        public int HiredCandidates { get; set; }
        public int ActiveCandidates { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class JobPositionDetailDto : JobPositionListDto
    {
        public string? Description { get; set; }
        public string? Requirements { get; set; }
        public decimal? SalaryRangeMin { get; set; }
        public decimal? SalaryRangeMax { get; set; }
        public string? CreatedByName { get; set; }
        public List<InterviewStepDto> InterviewSteps { get; set; } = new();
        public List<CandidateListDto> Candidates { get; set; } = new();
    }

    // Candidate
    public class CandidateListDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? PhotoUrl { get; set; }
        public string? CurrentCompany { get; set; }
        public string? CurrentPosition { get; set; }
        public decimal? ExperienceYears { get; set; }
        public decimal? AlphaCoderScore { get; set; }
        public string Status { get; set; } = string.Empty;
        public int CurrentStepNumber { get; set; }
        public int TotalSteps { get; set; }
        public string? JobTitle { get; set; }
        public string? JobId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CandidateDetailDto : CandidateListDto
    {
        public string? ResumeUrl { get; set; }
        public string? Skills { get; set; }
        public string? Notes { get; set; }
        public string? Department { get; set; }
        public string? ManagerName { get; set; }
        public int JobPositionId { get; set; }
        public List<CandidateInterviewDto> Interviews { get; set; } = new();
    }

    public class CandidateInterviewDto
    {
        public int Id { get; set; }
        public int StepNumber { get; set; }
        public string StepName { get; set; } = string.Empty;
        public string? StepDescription { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? InterviewDate { get; set; }
        public string? InterviewerName { get; set; }
        public decimal? OverallRating { get; set; }
        public string? Comments { get; set; }
        public string? ConductedByName { get; set; }
        public DateTime? CompletedAt { get; set; }
        public List<EvaluationDto> Evaluations { get; set; } = new();
    }

    public class EvaluationDto
    {
        public int Id { get; set; }
        public int QuestionId { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Remarks { get; set; }
    }

    public class EvaluationQuestionDto
    {
        public int Id { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int SortOrder { get; set; }
    }

    // Interview Advance
    public class AdvanceInterviewRequest
    {
        public int CandidateId { get; set; }
        public int StepNumber { get; set; }
        public string Status { get; set; } = "Passed"; // Passed or Failed
        public DateTime? InterviewDate { get; set; }
        public string? InterviewerName { get; set; }
        public string? Comments { get; set; }
        public decimal? OverallRating { get; set; }
        public List<EvaluationItemRequest> Evaluations { get; set; } = new();
    }

    public class EvaluationItemRequest
    {
        public int QuestionId { get; set; }
        public int Rating { get; set; }
        public string? Remarks { get; set; }
    }

    // Dashboard
    public class DashboardStatsDto
    {
        public int TotalJobs { get; set; }
        public int OpenJobs { get; set; }
        public int TotalCandidates { get; set; }
        public int HiredCandidates { get; set; }
        public int ActiveCandidates { get; set; }
        public int RejectedCandidates { get; set; }
        public double HiringRate { get; set; }
    }

    public class RecentActivityDto
    {
        public string CandidateName { get; set; } = string.Empty;
        public string? CandidatePhoto { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }

    public class PipelineStageDto
    {
        public string StageName { get; set; } = string.Empty;
        public int Count { get; set; }
    }
}
