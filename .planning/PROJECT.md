# Recruitment Management System (RMS)

## What This Is

A full-stack Recruitment Management System built to handle job postings, candidate applications, and multi-step interview evaluations. It enables HR admins and consultants to manage the entire hiring pipeline from job creation to final candidate scoring.

## Core Value

Streamlined, trackable candidate evaluation through customizable, multi-step interview pipelines.

## Requirements

### Validated

- ✓ [JWT Authentication] — existing (Admin/Consultant roles)
- ✓ [Job Position Management] — existing (Create/Update/List detailed job requirements)
- ✓ [Dynamic Interview Steps] — existing (Configurable evaluation steps per job)
- ✓ [Candidate Pipeline] — existing (Track candidates through stages: New → InProgress → Recruited → Rejected)
- ✓ [Evaluation System] — existing (Score candidates across predefined categorized questions)
- ✓ [Dashboard Analytics] — existing (Global stats, pipeline funnel, recent activity)

### Active

- [ ] Define the next major feature or enhancement (Waiting on user request)

### Out of Scope

- [N/A at this stage] — Pending further scope definition

## Context

- **Frontend**: React 18, Vite, TypeScript, React Router, Axios. Runs on `localhost:5173`.
- **Backend**: ASP.NET Core 8 Web API, Entity Framework Core. Runs on `localhost:5275`.
- **Database**: SQL Server (`RMS_DB`) with BCrypt password hashing.
- Features are separated by role: `Admin` (can create jobs/candidates) and `Consultant` (can participate in evaluations).

## Constraints

- **Tech Stack**: Must adhere to React/TypeScript frontend and .NET 8 / EF Core backend.
- **Auth**: Must maintain the existing JWT Bearer token implementation (12-hour expiry).
- **Schema**: Database expansions must map to the existing 6-table relational structure (Users, Jobs, Steps, Candidates, Interviews, Evaluations).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Deduce requirements from structure | Fast-tracked project setup using previous codebase mapping | — Pending |

---
*Last updated: 2026-03-10 after project initialization*
