# Features Analysis

## Table Stakes (Must-Have)
- **Role-based JWT Authentication** (Admin & Consultant roles).
- **Job Position Management**: Creation, updating, and viewing of openings.
- **Candidate Pool Management**: Upload applications, resumes, and assign to a specific Job Position.
- **Dynamic Interview Pipelines**: Customizable evaluation steps linked to specific job roles.
- **Candidate Scoring/Evaluation**: Ability to score individuals on multiple pre-defined criteria (1-5 star ratings).
- **Dashboard Tracking**: Broad project views (Open jobs, Active candidates, Hiring rate).

## Differentiators (Competitive Advantage)
- **Automated Score Calculation** (e.g. `AlphaCoderScore`) directly linked to specific coding assessments.
- **Multi-role Evaluation Workflow**: Enforcing step-by-step sequential interviews wherein candidates cannot progress if prior steps are uncompleted.
- **Resume Parsing & External AI Screening**: Potential to auto-parse PDF resumes and feed into candidate context via an LLM prior to consultant interviews.

## Anti-Features (Do NOT Build)
- Internal instant messaging/chat app between Consultants. This dilutes the system.
- Full scale payroll management; RMS should pass recruited candidates downstream to dedicated HR software.
