# Research Summary

## Core Stack
- **Frontend**: React 18, Vite, TypeScript, Axios
- **Backend**: ASP.NET Core 8 Web API
- **Persistence**: SQL Server, Entity Framework Core 8

## Feature Priorities
1. **Strong Table Stakes**: Role-based access (Admin/Consultant), robust Job/Candidate lifecycle tracking, and dynamic interview pipelines.
2. **Differentiators**: Hard-gated sequential interview steps and explicit scoring logic via predefined metric questions.

## Architectural Constraints
- Keep state boundary sharp: strictly typed DTOs must govern communication between the React Client and `.NET` API. 
- Controllers currently handle business logic directly. If expanding, logic should be refactored into a cleaner service layer.
- Rely on EF Core mapping for relationship management.

## Critical Risks
- **Controller Bloat**: Specifically `CandidatesController` with file-upload handling.
- **State Machining**: Potential issues around interview step order validation; it's critical that `.NET` enforces strict sequential stage advancement so a candidate doesn't skip steps.
- **Token Expiry UX**: Managing precise JWT ejection handling when users' 12-hour session lapses, ensuring graceful redirection.
