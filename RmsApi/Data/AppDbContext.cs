using Microsoft.EntityFrameworkCore;
using RmsApi.Models;

namespace RmsApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<JobPosition> JobPositions => Set<JobPosition>();
        public DbSet<InterviewStep> InterviewSteps => Set<InterviewStep>();
        public DbSet<Candidate> Candidates => Set<Candidate>();
        public DbSet<CandidateInterview> CandidateInterviews => Set<CandidateInterview>();
        public DbSet<EvaluationQuestion> EvaluationQuestions => Set<EvaluationQuestion>();
        public DbSet<CandidateEvaluation> CandidateEvaluations => Set<CandidateEvaluation>();
        public DbSet<OnboardingRecord> OnboardingRecords => Set<OnboardingRecord>();
        public DbSet<OnboardingMilestone> OnboardingMilestones => Set<OnboardingMilestone>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(e =>
            {
                e.HasIndex(u => u.Email).IsUnique();
            });

            modelBuilder.Entity<JobPosition>(e =>
            {
                e.HasIndex(j => j.JobId).IsUnique();
                e.HasOne(j => j.CreatedBy).WithMany().HasForeignKey(j => j.CreatedById).OnDelete(DeleteBehavior.NoAction);
                e.Property(j => j.SalaryRangeMin).HasPrecision(18, 2);
                e.Property(j => j.SalaryRangeMax).HasPrecision(18, 2);
            });

            modelBuilder.Entity<InterviewStep>(e =>
            {
                e.HasIndex(s => new { s.JobPositionId, s.StepNumber }).IsUnique();
                e.HasOne(s => s.JobPosition).WithMany(j => j.InterviewSteps).HasForeignKey(s => s.JobPositionId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Candidate>(e =>
            {
                e.HasOne(c => c.JobPosition).WithMany(j => j.Candidates).HasForeignKey(c => c.JobPositionId).OnDelete(DeleteBehavior.NoAction);
                e.HasOne(c => c.CreatedBy).WithMany().HasForeignKey(c => c.CreatedById).OnDelete(DeleteBehavior.NoAction);
                e.Property(c => c.ExperienceYears).HasPrecision(18, 2);
                e.Property(c => c.AlphaCoderScore).HasPrecision(18, 2);
                e.Property(c => c.Education10thPercentage).HasPrecision(18, 2);
                e.Property(c => c.Education12thPercentage).HasPrecision(18, 2);
                e.Property(c => c.EducationCollegeCGPA).HasPrecision(18, 2);
                e.Property(c => c.AtsScore).HasPrecision(18, 2);
                e.Property(c => c.AtsDeterministicScore).HasPrecision(18, 2);
                e.Property(c => c.AtsAiScore).HasPrecision(18, 2);
            });

            modelBuilder.Entity<CandidateInterview>(e =>
            {
                e.HasOne(ci => ci.Candidate).WithMany(c => c.CandidateInterviews).HasForeignKey(ci => ci.CandidateId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(ci => ci.InterviewStep).WithMany().HasForeignKey(ci => ci.InterviewStepId).OnDelete(DeleteBehavior.NoAction);
                e.HasOne(ci => ci.ConductedBy).WithMany().HasForeignKey(ci => ci.ConductedById).OnDelete(DeleteBehavior.NoAction);
                e.Property(ci => ci.OverallRating).HasPrecision(18, 2);
            });

            modelBuilder.Entity<CandidateEvaluation>(e =>
            {
                e.HasOne(ce => ce.CandidateInterview).WithMany(ci => ci.Evaluations).HasForeignKey(ce => ce.CandidateInterviewId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(ce => ce.EvaluationQuestion).WithMany().HasForeignKey(ce => ce.EvaluationQuestionId).OnDelete(DeleteBehavior.NoAction);
            });

            // Onboarding
            modelBuilder.Entity<OnboardingRecord>(e =>
            {
                e.HasOne(o => o.Candidate).WithMany().HasForeignKey(o => o.CandidateId).OnDelete(DeleteBehavior.NoAction);
                e.HasOne(o => o.CreatedBy).WithMany().HasForeignKey(o => o.CreatedById).OnDelete(DeleteBehavior.NoAction);
            });

            modelBuilder.Entity<OnboardingMilestone>(e =>
            {
                e.HasIndex(m => new { m.OnboardingRecordId, m.MonthNumber }).IsUnique();
                e.HasOne(m => m.OnboardingRecord).WithMany(o => o.Milestones).HasForeignKey(m => m.OnboardingRecordId).OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
