-- ============================================
-- RMS - Recruitment Management System
-- Database Creation Script
-- Run this in SQL Server Management Studio
-- ============================================

-- Create the database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'RMS_DB')
BEGIN
    CREATE DATABASE RMS_DB;
END
GO

USE RMS_DB;
GO

-- ============================================
-- Users Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
BEGIN
    CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        FullName NVARCHAR(150) NOT NULL,
        Email NVARCHAR(256) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(512) NOT NULL,
        Role NVARCHAR(50) NOT NULL CHECK (Role IN ('Admin', 'Consultant')),
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL
    );
END
GO

-- ============================================
-- Job Positions Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='JobPositions' AND xtype='U')
BEGIN
    CREATE TABLE JobPositions (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        JobId NVARCHAR(50) NOT NULL UNIQUE,
        Title NVARCHAR(200) NOT NULL,
        Department NVARCHAR(150) NOT NULL,
        Location NVARCHAR(200) NULL,
        ManagerName NVARCHAR(150) NOT NULL,
        NumberOfPositions INT NOT NULL DEFAULT 1,
        InterviewStepCount INT NOT NULL DEFAULT 1,
        Description NVARCHAR(MAX) NULL,
        Requirements NVARCHAR(MAX) NULL,
        SalaryRangeMin DECIMAL(18,2) NULL,
        SalaryRangeMax DECIMAL(18,2) NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'Open' CHECK (Status IN ('Open', 'Closed', 'OnHold')),
        CreatedById INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT FK_JobPositions_CreatedBy FOREIGN KEY (CreatedById) REFERENCES Users(Id)
    );
END
GO

-- ============================================
-- Interview Steps Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='InterviewSteps' AND xtype='U')
BEGIN
    CREATE TABLE InterviewSteps (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        JobPositionId INT NOT NULL,
        StepNumber INT NOT NULL,
        StepName NVARCHAR(200) NOT NULL,
        Description NVARCHAR(500) NULL,
        CONSTRAINT FK_InterviewSteps_JobPosition FOREIGN KEY (JobPositionId) REFERENCES JobPositions(Id) ON DELETE CASCADE,
        CONSTRAINT UQ_InterviewSteps_JobStep UNIQUE (JobPositionId, StepNumber)
    );
END
GO

-- ============================================
-- Candidates Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Candidates' AND xtype='U')
BEGIN
    CREATE TABLE Candidates (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        FullName NVARCHAR(200) NOT NULL,
        Email NVARCHAR(256) NOT NULL,
        Phone NVARCHAR(50) NULL,
        PhotoUrl NVARCHAR(500) NULL,
        ResumeUrl NVARCHAR(500) NULL,
        CurrentCompany NVARCHAR(200) NULL,
        CurrentPosition NVARCHAR(200) NULL,
        ExperienceYears DECIMAL(4,1) NULL,
        Skills NVARCHAR(MAX) NULL,
        AlphaCoderScore DECIMAL(5,2) NULL,
        Notes NVARCHAR(MAX) NULL,
        JobPositionId INT NOT NULL,
        CurrentStepNumber INT NOT NULL DEFAULT 0,
        Status NVARCHAR(50) NOT NULL DEFAULT 'New' CHECK (Status IN ('New', 'InProgress', 'Recruited', 'Rejected')),
        CreatedById INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT FK_Candidates_JobPosition FOREIGN KEY (JobPositionId) REFERENCES JobPositions(Id),
        CONSTRAINT FK_Candidates_CreatedBy FOREIGN KEY (CreatedById) REFERENCES Users(Id)
    );
END
GO

-- ============================================
-- Candidate Interviews Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CandidateInterviews' AND xtype='U')
BEGIN
    CREATE TABLE CandidateInterviews (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        CandidateId INT NOT NULL,
        InterviewStepId INT NOT NULL,
        StepNumber INT NOT NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Passed', 'Failed')),
        InterviewDate DATETIME2 NULL,
        InterviewerName NVARCHAR(200) NULL,
        OverallRating DECIMAL(3,1) NULL,
        Comments NVARCHAR(MAX) NULL,
        ConductedById INT NULL,
        CompletedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_CandidateInterviews_Candidate FOREIGN KEY (CandidateId) REFERENCES Candidates(Id) ON DELETE CASCADE,
        CONSTRAINT FK_CandidateInterviews_Step FOREIGN KEY (InterviewStepId) REFERENCES InterviewSteps(Id),
        CONSTRAINT FK_CandidateInterviews_ConductedBy FOREIGN KEY (ConductedById) REFERENCES Users(Id)
    );
END
GO

-- ============================================
-- Evaluation Questions Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EvaluationQuestions' AND xtype='U')
BEGIN
    CREATE TABLE EvaluationQuestions (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        QuestionText NVARCHAR(500) NOT NULL,
        Category NVARCHAR(100) NOT NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1
    );
END
GO

-- ============================================
-- Candidate Evaluations Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CandidateEvaluations' AND xtype='U')
BEGIN
    CREATE TABLE CandidateEvaluations (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        CandidateInterviewId INT NOT NULL,
        EvaluationQuestionId INT NOT NULL,
        Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
        Remarks NVARCHAR(500) NULL,
        CONSTRAINT FK_CandidateEvals_Interview FOREIGN KEY (CandidateInterviewId) REFERENCES CandidateInterviews(Id) ON DELETE CASCADE,
        CONSTRAINT FK_CandidateEvals_Question FOREIGN KEY (EvaluationQuestionId) REFERENCES EvaluationQuestions(Id)
    );
END
GO

-- ============================================
-- Seed Data
-- ============================================

-- Seed Users (passwords are BCrypt hashed)
-- hr@rms.com / Admin@123
-- consultant@rms.com / Consult@123
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'hr@rms.com')
BEGIN
    INSERT INTO Users (FullName, Email, PasswordHash, Role)
    VALUES ('Sarah Mitchell', 'hr@rms.com', '$2a$11$7fqjGIK0beJAjN0aINBin.gH1spzLiLhy6OIe369cjkMCCM1ytZuS', 'Admin');
END

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'consultant@rms.com')
BEGIN
    INSERT INTO Users (FullName, Email, PasswordHash, Role)
    VALUES ('James Parker', 'consultant@rms.com', '$2a$11$98MwcKYcTrEJHjbLInA.2uj2oY3ZNvsUbNvpGnKpGPIhZBudxJK3m', 'Consultant');
END
GO

-- Seed Evaluation Questions
IF NOT EXISTS (SELECT 1 FROM EvaluationQuestions)
BEGIN
    INSERT INTO EvaluationQuestions (QuestionText, Category, SortOrder) VALUES
    ('Technical knowledge relevant to the role', 'Technical Skills', 1),
    ('Problem-solving and analytical ability', 'Technical Skills', 2),
    ('Coding/practical assessment performance', 'Technical Skills', 3),
    ('Understanding of domain-specific concepts', 'Technical Skills', 4),
    ('Verbal communication clarity', 'Communication', 5),
    ('Ability to articulate thoughts and ideas', 'Communication', 6),
    ('Active listening and responsiveness', 'Communication', 7),
    ('Team collaboration and interpersonal skills', 'Behavioral', 8),
    ('Adaptability and willingness to learn', 'Behavioral', 9),
    ('Leadership potential and initiative', 'Behavioral', 10),
    ('Alignment with company values and culture', 'Cultural Fit', 11),
    ('Motivation and enthusiasm for the role', 'Cultural Fit', 12),
    ('Long-term career alignment', 'Cultural Fit', 13),
    ('Professionalism and presentation', 'Overall', 14),
    ('Overall recommendation for the candidate', 'Overall', 15);
END
GO

PRINT 'RMS Database created and seeded successfully.';
GO
