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
            });

            modelBuilder.Entity<CandidateInterview>(e =>
            {
                e.HasOne(ci => ci.Candidate).WithMany(c => c.CandidateInterviews).HasForeignKey(ci => ci.CandidateId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(ci => ci.InterviewStep).WithMany().HasForeignKey(ci => ci.InterviewStepId).OnDelete(DeleteBehavior.NoAction);
                e.HasOne(ci => ci.ConductedBy).WithMany().HasForeignKey(ci => ci.ConductedById).OnDelete(DeleteBehavior.NoAction);
            });

            modelBuilder.Entity<CandidateEvaluation>(e =>
            {
                e.HasOne(ce => ce.CandidateInterview).WithMany(ci => ci.Evaluations).HasForeignKey(ce => ce.CandidateInterviewId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(ce => ce.EvaluationQuestion).WithMany().HasForeignKey(ce => ce.EvaluationQuestionId).OnDelete(DeleteBehavior.NoAction);
            });
        }
    }
}
