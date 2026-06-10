namespace RmsApi.Models
{
    public class User
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = "Consultant";
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    public class JobPosition
    {
        public int Id { get; set; }
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
        public string Status { get; set; } = "Open";
        public int CreatedById { get; set; }
        public User? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Approval workflow
        public string ApprovalStatus { get; set; } = "Active";
        public string? ApprovalComments { get; set; }
        public int? ApprovedByMDId { get; set; }
        public User? ApprovedByMD { get; set; }
        public DateTime? ApprovedByMDAt { get; set; }
        public int? ApprovedByAdminId { get; set; }
        public User? ApprovedByAdmin { get; set; }
        public DateTime? ApprovedByAdminAt { get; set; }

        public ICollection<InterviewStep> InterviewSteps { get; set; } = new List<InterviewStep>();
        public ICollection<Candidate> Candidates { get; set; } = new List<Candidate>();
    }

    public class InterviewStep
    {
        public int Id { get; set; }
        public int JobPositionId { get; set; }
        public JobPosition? JobPosition { get; set; }
        public int StepNumber { get; set; }
        public string StepName { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class Candidate
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? PhotoUrl { get; set; }
        public string? ResumeUrl { get; set; }
        public string? CurrentCompany { get; set; }
        public string? CurrentPosition { get; set; }
        public decimal? ExperienceYears { get; set; }
        public string? Skills { get; set; }
        public decimal? AlphaCoderScore { get; set; }
        public string? Notes { get; set; }

        // Education
        public string? Education10thSchool { get; set; }
        public decimal? Education10thPercentage { get; set; }
        public string? Education12thSchool { get; set; }
        public decimal? Education12thPercentage { get; set; }
        public string? EducationCollegeName { get; set; }
        public string? EducationCollegeDegree { get; set; }
        public decimal? EducationCollegeCGPA { get; set; }

        public int JobPositionId { get; set; }
        public JobPosition? JobPosition { get; set; }
        public int CurrentStepNumber { get; set; } = 0;
        public string Status { get; set; } = "New";
        public int CreatedById { get; set; }
        public User? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // ATS Score
        public decimal? AtsScore { get; set; }
        public decimal? AtsDeterministicScore { get; set; }
        public decimal? AtsAiScore { get; set; }
        public string? ResumeTextContent { get; set; }
        public string? AtsScoreDetails { get; set; }

        public ICollection<CandidateInterview> CandidateInterviews { get; set; } = new List<CandidateInterview>();
    }

    public class CandidateInterview
    {
        public int Id { get; set; }
        public int CandidateId { get; set; }
        public Candidate? Candidate { get; set; }
        public int InterviewStepId { get; set; }
        public InterviewStep? InterviewStep { get; set; }
        public int StepNumber { get; set; }
        public string Status { get; set; } = "Pending";
        public DateTime? InterviewDate { get; set; }
        public string? InterviewerName { get; set; }
        public decimal? OverallRating { get; set; }
        public string? Comments { get; set; }
        public int? ConductedById { get; set; }
        public User? ConductedBy { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<CandidateEvaluation> Evaluations { get; set; } = new List<CandidateEvaluation>();
    }

    public class EvaluationQuestion
    {
        public int Id { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int SortOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
    }

    public class CandidateEvaluation
    {
        public int Id { get; set; }
        public int CandidateInterviewId { get; set; }
        public CandidateInterview? CandidateInterview { get; set; }
        public int EvaluationQuestionId { get; set; }
        public EvaluationQuestion? EvaluationQuestion { get; set; }
        public int Rating { get; set; }
        public string? Remarks { get; set; }
    }

    // ── Onboarding Models ──

    public class OnboardingRecord
    {
        public int Id { get; set; }
        public int CandidateId { get; set; }
        public Candidate? Candidate { get; set; }
        public string Type { get; set; } = "Employee"; // Employee or Intern
        public string? GhrId { get; set; }
        public string? KnoxId { get; set; }
        public string? ProjectLead { get; set; }
        public string? ProjectManager { get; set; }
        public DateTime DateOfJoining { get; set; }
        public string? Department { get; set; }
        public string? Designation { get; set; }
        public int EvaluationMonths { get; set; } = 6;
        public string Status { get; set; } = "Active";
        public int CreatedById { get; set; }
        public User? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public ICollection<OnboardingMilestone> Milestones { get; set; } = new List<OnboardingMilestone>();
    }

    public class OnboardingMilestone
    {
        public int Id { get; set; }
        public int OnboardingRecordId { get; set; }
        public OnboardingRecord? OnboardingRecord { get; set; }
        public int MonthNumber { get; set; }
        public string? BuddyReportUrl { get; set; }
        public string? OneToOneReportUrl { get; set; }
        public string? MidTermReportUrl { get; set; }
        public int? PerformanceRating { get; set; }
        public string? PerformanceRemarks { get; set; }
        public string Status { get; set; } = "Pending";
        public DateTime UnlocksAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    // ── Notification Model ──

    public class Notification
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User? User { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? RelatedEntityType { get; set; }
        public int? RelatedEntityId { get; set; }
        public bool IsRead { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
