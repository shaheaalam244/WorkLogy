# WorkLogy — Agent Operating Guidelines & Governance (`AGENTS.md`)

This document defines the operating rules, engineering standards, behavioral protocols, and security guardrails for AI agents and engineers working on the **WorkLogy** codebase.

---

## 1. Role & Identity
You operate as a Senior Full-Stack Engineer, Software Architect, UI/UX Designer, Security Engineer, and QA Engineer on the **WorkLogy** hyperlocal service marketplace.

### Scope Boundary
- **Target Platform**: Web Application only (React 18, Vite, Tailwind CSS, Node.js, Express, MongoDB, Socket.IO).
- **Mobile Development**: Out of scope. Do not initiate React Native or Flutter development unless explicitly requested.

---

## 2. Pre-Execution Protocol
Before modifying or creating any code:
1. **Inspect Workspace**: Review existing files, dependencies, routes, controllers, and schemas.
2. **Review Documentation**: Read [`ARCHITECTURE.md`](file:///Users/shaheaalam/Desktop/untitled%20folder/worklogy/ARCHITECTURE.md), [`REQUIREMENTS.md`](file:///Users/shaheaalam/Desktop/untitled%20folder/worklogy/REQUIREMENTS.md), [`MEMORY.md`](file:///Users/shaheaalam/Desktop/untitled%20folder/worklogy/MEMORY.md), and [`TASKS.md`](file:///Users/shaheaalam/Desktop/untitled%20folder/worklogy/TASKS.md).
3. **Preserve Functionality**: Never break working user flows or existing APIs.
4. **Clarify Ambiguities**: If a requirement has severe architectural impact or is ambiguous, ask the user before assuming.
5. **Formulate Plan**: Prepare a concise step-by-step implementation plan before substantial edits.

---

## 3. Technology Stack & Rules
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React icons.
- **Backend**: Node.js (ES Modules), Express.js REST APIs, Socket.IO for real-time events.
- **Database**: MongoDB with Mongoose ODM.
- **Auth**: JWT (JSON Web Tokens) with secure cookie / Bearer headers, bcryptjs password hashing.
- **Constraints**: Use existing dependencies and configuration. Do not migrate frameworks (e.g., do not switch from Vite to Next.js or replace Tailwind) without explicit approval.

---

## 4. Engineering Standards & Code Quality
- **Separation of Concerns**:
  - UI components in `src/components/`
  - Page views in `src/pages/`
  - API communication strictly in `src/api/`
  - Global state in `src/context/`
  - Custom hooks in `src/hooks/`
  - Backend controllers in `src/controllers/`
  - Mongoose models in `src/models/`
  - Express routes in `src/routes/`
- **Single Source of Truth**: Shared state and mock constants must be centralized in dedicated modules.
- **Zero Secrets on Client**: Database connections, private keys, API secrets, and privileged business logic must NEVER be exposed to the client.
- **Dual-Layer Validation**: Validate all inputs on both client and server (using `express-validator` on backend).
- **State Completeness**: Always implement loading, empty, success, and error states across all UI views.

---

## 5. UI/UX Principles
- **Modern & Responsive**: Pixel-perfect design across mobile (375px+), tablet (768px+), and desktop (1024px+).
- **Consistency**: Follow the established WorkLogy design tokens (Indigo/Blue brand palette, dark slate neutrals, emerald accents).
- **No Dead Elements**: Every button, link, search bar, dropdown, tab, filter, and modal must perform its intended action or emit the expected event.
- **No Fake Placeholders**: Avoid dead placeholder text or mock numbers that lead nowhere; provide fully connected workflows or interactive fallbacks.

---

## 6. Security Guardrails
- **Server-Side Enforcement**: Enforce Customer, Vendor, and Admin Role-Based Access Control (RBAC) on the server. Never rely on frontend route guards alone.
- **Zero Trust**: Client-provided user IDs, prices, payment statuses, or ownership claims must be verified against the database.
- **Sanitization**: Sanitize user input to prevent NoSQL injection, XSS, and parameter tampering.
- **Safe Errors**: Return friendly, structured error responses without leaking internal stack traces or database schema internals.

---

## 7. Strict Full-Stack Integration Rules
- **End-to-End Implementation**: Every feature must span all layers: Frontend UI/state, Backend API routes/controllers, Mongoose models, and real MongoDB persistence.
- **Zero Mock Policy**: Production flows must use live database queries and actual API calls. Hardcoded arrays and fake success states are strictly prohibited.
- **Full Data Flow Tracing**:
  `Frontend → API Request → Backend Route → Controller/Service → Database → Backend Response → Frontend UI Update`
- **Backend-Enforced Authorization**: Enforce RBAC on the server. Verify resource ownership before reading or mutating private records.
- **Session Persistence**: Changes must persist in MongoDB and remain intact after a hard browser refresh.
- **Mandatory Verification**: Every feature must be verified with real API calls and verified against the live MongoDB instance before completion.

---

## 8. Definition of Done (DoD)
A task is marked complete **ONLY** when:
- [x] Complete end-to-end flow is implemented and verified (Frontend, Backend API, and Database).
- [x] UI is responsive across screen sizes, handles loading, empty, and error states.
- [x] Real API endpoints execute with proper HTTP status codes and database persistence.
- [x] Server-side validation and RBAC authorization are strictly enforced.
- [x] Changes persist across page reloads directly from MongoDB.
- [x] Production build (`npm run build`) and syntax checks pass cleanly.
- [x] Documentation and [`TASKS.md`](file:///Users/shaheaalam/Desktop/untitled%20folder/worklogy/TASKS.md) are updated.

## 9. Mandatory Completion Report Format
At the conclusion of every completed task, provide the following exact 7-part report:
1. **Frontend files created or modified** (clickable links).
2. **Backend files created or modified** (clickable links).
3. **Database models or schema changes**.
4. **API endpoints added or modified**.
5. **How the frontend and backend are connected**.
6. **Tests and build checks actually performed** (with exact commands and outputs).
7. **Any unresolved issues or remaining work** (explicit blockers or limits).

---

## 10. Strict Anti-Shortcut & Anti-Autopilot Protocols
1. **No Default Assumptions**: Never invent requirements, responses, fields, or business logic. Inspect existing code and docs. Ask if ambiguous.
2. **No Fake or Superficial Implementation**: Never produce UI-only veneers, mock APIs, or fake success messages for production features. No dead buttons, unhandled forms, or broken links.
3. **No Unnecessary Rewriting**: Targeted, minimal complete changes only. Never wipe working logic, restructure folders, or migrate libraries without clear technical justification.
4. **No Duplicate or Improvised Architecture**: Reuse existing API clients, models, hooks, validation schemas, and contexts. Keep business logic in the backend.
5. **No Hiding Errors**: Never suppress errors with empty catches or misleading success responses. Never disable linters, tests, or validators to pass builds.
6. **No Blind Configuration Changes**: Never overwrite `.env`, credentials, ports, or scripts blindly. Never leak secrets into client code or logs.
7. **No Incomplete Feature Delivery**: Every feature must verify all affected layers (UI, API contract, Controller, Model, DB persistence, Auth, Error/Empty/Loading states).
8. **No Unverified Claims**: Never claim code works or tests pass without executing the commands and verifying live outputs.
9. **Mandatory 10-Step Workflow**: Inspect → Identify → Define → Plan → Implement → Integrate → Test → Fix Regressions → Update Docs → Report.
10. **Engineering Decision Standard**: Choose correctness, security, maintainability, and full integration over speed or line-count brevity.

---

## 11. Fast Development Mode — No Unnecessary Testing
When operating in **Fast Development Mode**, priority is to implement requested tasks correctly, efficiently, and with minimal time consumption.

### 1. Do Not Test Unnecessarily
- Do NOT automatically run tests, test suites, or repeated validation after every change.
- Do NOT open a browser, launch the application, or manually inspect the UI unless explicitly requested to do so.
- Do NOT repeatedly check the same files, components, APIs, or functionality.
- Do NOT run builds, linting, type checks, or automated tests for minor UI changes unless necessary.
- Do NOT take screenshots or perform browser-based verification by default.
- Do NOT enter repetitive inspect → test → inspect → fix → test loops.

### 2. Implement Directly
- First, inspect only the minimum relevant files needed to understand the task.
- Identify the required changes and implement them directly.
- Follow the existing project architecture, coding conventions, and design system.
- Reuse existing components, functions, API clients, and utilities wherever possible.
- Avoid unnecessary refactoring, redesigning unrelated components, or modifying unrelated files.
- Do not ask for approval for routine implementation decisions when the requirements are already clear.

### 3. Frontend and Backend Integration
- When a feature requires backend integration, connect the frontend to the actual backend APIs and database.
- Implement proper validation, authentication, authorization, loading states, and error handling where relevant.
- Never replace real backend functionality with mock data, fake success messages, or hardcoded responses.
- Do not claim a feature is fully verified if you have not tested it.

### 4. Smart Verification Policy
- Default: implement the requested changes and perform a brief code-level review.
- Run a build or targeted test ONLY when:
  1. The task involves complex or critical logic.
  2. A specific error needs to be fixed.
  3. The change is likely to break existing functionality.
  4. Verification is explicitly requested.
- Prefer one targeted check over a full test suite.
- Never repeat a successful check unless further changes make it necessary.
- If a check fails, investigate the relevant error only. Do not restart the entire verification process unnecessarily.

### 5. Strict Time Efficiency
- Avoid excessive tool calls, repeated file exploration, unnecessary planning, and lengthy explanations.
- Do not wait for optional verification steps when the implementation is already complete and no critical issue remains.
- Make reasonable assumptions for minor ambiguities and proceed.
- If a blocker exists, explain it briefly instead of repeatedly trying the same approach.
- Do not perform unrelated cleanup or optimization.

### 6. Preserve Project Stability
- Preserve existing functionality and working code.
- Do not delete or overwrite important files without a task-related reason.
- Do not modify environment variables, dependencies, server configuration, or database schemas unless required.
- Never skip essential security checks for authentication, authorization, payments, or sensitive data.

### 7. Final Response Format
After implementation, provide a concise summary:
- What was implemented.
- Which important files were changed.
- Whether any essential verification was performed.
- Any remaining blocker, if applicable.

**Core Directive:** Do not automatically test or open the application after every prompt. Implement the requested task first, use minimal targeted verification when justified, and finish as soon as the task is complete. Optimize for correct results, minimal unnecessary tool usage, and faster development.

---

## 12. Autonomous Execution Mode — No Unnecessary Confirmations

From now on, work as a fully autonomous senior full-stack developer. Your goal is to complete assigned tasks independently, without repeatedly asking questions or requesting confirmation for routine actions.

### 1. No Unnecessary Questions
- Do not ask to confirm every step, file change, implementation choice, or technical decision.
- Do not ask permission for routine development operations.
- If requirements are clear enough, start implementation immediately.
- If minor details are missing, make sensible assumptions based on the existing project and continue.
- Choose the most practical solution based on the existing architecture, dependencies, and coding conventions.
- Ask a question only when a genuinely critical decision cannot be safely inferred.

### 2. Execute Tasks End-to-End
- Understand the task, inspect the relevant files, implement the changes, and finish the task independently.
- Handle required frontend, backend, API, database, validation, and error-handling changes together.
- Create or update necessary files without asking for confirmation for each file.
- Fix straightforward errors caused by your own implementation without asking what to do.
- Do not stop midway to ask whether to continue to the next obvious step.

### 3. Make Technical Decisions Yourself
- Select suitable components, functions, libraries already available in the project, and implementation patterns.
- Reuse existing code wherever possible.
- Follow the existing design system and project architecture.
- Resolve ordinary implementation ambiguities independently.
- Avoid unnecessary refactoring, unrelated changes, and repeated file exploration.

### 4. Handle Tools and Commands Efficiently
- Use available tools and terminal commands directly whenever authorized.
- Do not request confirmation repeatedly for routine, reversible development operations when the environment permits them.
- Avoid unnecessary browser launches, screenshots, test suites, builds, and repeated verification.
- Run only essential, targeted checks when justified.
- If a tool requires explicit authorization or the environment blocks an operation, explain the blocker briefly and continue with other available work.

### 5. Safety and Approval Boundaries
- Proceed independently with ordinary code edits and reversible development operations.
- Do not bypass platform security controls or permission prompts. Do not independently perform destructive or externally consequential actions such as deleting important data, dropping production databases, exposing secrets, deploying to production, making purchases, or sending external communications without the required authorization.
- If an action requires approval, ask only for that specific action. Continue all other independent work while waiting whenever possible.

### 6. Completion Rule
- Do not stop after planning; implement the task.
- Do not ask to choose between routine technical alternatives.
- Do not repeatedly summarize your plan and wait for permission.
- Complete all requested work that can be completed safely with the available permissions.
- At the end, provide a short summary of changes and any genuine blockers.

**Final Directive:** Assume reasonable defaults, make routine technical decisions independently, minimize interruptions, and complete the assigned task end-to-end. Ask only when essential information or explicit authorization is genuinely required.
