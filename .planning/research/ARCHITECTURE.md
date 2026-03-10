# Architectural Conventions

## Components & Boundaries

- **Client Layer (React/Vite)**
  - Responsible for: UI rendering, routing, localized state management, and user interaction.
  - Talks to: API Layer exclusively via Axios generic service modules (`services/api.ts`).
  - Auth context is driven by a generic React Context (`AuthContext.tsx`) managing a JWT in `localStorage`.

- **API Layer (.NET 8 Web API)**
  - Responsible for: Stateless request handling, JWT verification (`[Authorize]`), business logic, and request/response serialization mapping using specific DTO classes.
  - Boundary: Only endpoints exposed in `Controllers/` are reachable from the Client.

- **Persistence Layer (Entity Framework Core & SQL Server)**
  - Responsible for: Database state, relations, cascading deletes.
  - Data Flow: Controllers interact with `AppDbContext`, traversing standard DbSet generic models.

## Expected Patterns

- **DTO Mapping**: Direct model access is restricted from the controllers. Requests enter via Request DTOs and leave via Response DTOs.
- **Sequential Evaluations**: Candidate progression happens via state machine validation checks in `InterviewsController`. Earlier steps must be resolved before proceeding.

## Future Considerations
- Introducing a caching layer (e.g. Redis) for dashboard stats as user count grows.
- Establishing a dedicated Application layer/Service layer in `.NET` if controller business logic expands.
