# Stack Recommendations

## Core Stack

- **Frontend**: React 18 with Vite
  - Rationale: Established fast frontend tooling with an enormous ecosystem.
  - Confidence: High
  
- **Language**: TypeScript
  - Rationale: Crucial for DTO alignment with the backend and strong typing across state boundaries.
  - Confidence: High

- **Backend API**: ASP.NET Core 8 
  - Rationale: High-performance, mature enterprise backend ecosystem. Current infrastructure runs on it.
  - Confidence: High

- **ORM**: Entity Framework Core 8
  - Rationale: Native C# integration for SQL Server. Facilitates rapid data modeling and robust migrations.
  - Confidence: High

- **Database**: SQL Server (`RMS_DB`)
  - Rationale: Matches existing deployment and integrates perfectly with EF Core.
  - Confidence: High

## Anti-Patterns (What NOT to use)
- **Do not introduce GraphQL or gRPC** for this iteration. Stick to the REST controllers.
- **Avoid heavy global state libraries** (like Redux) unless strictly necessary; prefer React Context (like the existing `AuthContext`) or lightweight solutions like Zustand if scaling is needed.
