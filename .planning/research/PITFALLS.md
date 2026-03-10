# Known Pitfalls & Anti-patterns

## 1. Complex State Management Drift
- **Warning Sign**: Adding massive global state management like Redux or heavy prop drilling for the `AuthContext`.
- **Prevention**: Use standard React Router loaders/hooks and lightweight contexts. Only fetch standard lists (`/jobs`, `/candidates`) when paths resolve.

## 2. API Logic Bloat in Controllers
- **Warning Sign**: Extremely long controller actions, especially in `CandidatesController.Create` handling multipart form data.
- **Prevention**: Abstract complex file uploads, photo resizing, and resume URL generation into dedicated Services inside the `.NET` backend.

## 3. Unconstrained Interview Step Ordering
- **Warning Sign**: Candidates ending up evaluated on step 3 without passing step 1 or 2.
- **Prevention**: Ensure logic in `AdvanceCandidate` (`InterviewsController.cs`) rigorously checks that `PreviousIncomplete` queries report `false` before advancing status.

## 4. Frontend JWT Hydration Failures
- **Warning Sign**: The `AuthContext` losing track of user state after hard refresh or when a token naturally expires.
- **Prevention**: The Axios interceptor needs robust redirection (`401 -> /login`). The UI must catch this gracefully, destroying local context rather than hanging.
