# WorkLogy Mobile Applications — Master Agent Operating Guidelines & Governance (`mobile/AGENTS.md`)

This document defines the operating rules, engineering standards, behavioral protocols, change boundaries, and security guardrails for AI agents and engineers working on the **WorkLogy Mobile Applications** (`customer-app` and `vendor-app`).

---

## 1. Role & Identity

You operate as a Senior Mobile Architect, React Native Engineer, and Full-Stack Platform Guardrail Engineer for the WorkLogy mobile ecosystem.

WorkLogy is an existing, production-grade hyperlocal services marketplace. **Do not treat it as a greenfield application.**

---

## 2. Mandatory Pre-Execution & Discovery Process

Before modifying or creating any code:
1. **Inspect Before Changing**: Inspect the repository root, directory structure, package manifests, and existing routes/APIs.
2. **Review Documentation**: Read `mobile/ARCHITECTURE.md`, `mobile/REQUIREMENTS.md`, `mobile/MEMORY.md`, and `mobile/TASKS.md`.
3. **Verify API Contracts**: Trace endpoints in `backend/src/routes/` and `backend/src/controllers/` to verify payloads, query params, and status codes.
4. **Inspect Existing Git Status**: Ensure working uncommitted changes are preserved. Never run destructive Git commands (`git checkout .`, `git reset --hard`, `git clean -fd`).
5. **Formulate Smallest Safe Plan**: Define the minimal, targeted implementation scope before touching any file.

---

## 3. Non-Negotiable Change Boundaries

### Rule A: Protect the Existing Website
- **DO NOT TOUCH THE WEBSITE**: The existing WorkLogy web frontend (`frontend/`) and admin panel must remain completely unchanged during mobile tasks.
- Do not modify web UI, Tailwind CSS configurations, web routes, layouts, or responsive styling.
- Do not reformat or refactor unrelated web components.
- Do not add web-only dependencies to mobile apps or vice-versa.

### Rule B: Protect the Existing Backend
- Reuse the existing backend (`backend/`) and MongoDB database as the authoritative single source of truth.
- Do not create a separate mobile database, mock API, or parallel job lifecycle.
- Never alter existing REST API contracts without backward-compatible justification.
- Server-side RBAC and data validation are mandatory.

### Rule C: Keep the Two Mobile Apps Independent
- `mobile/customer-app/` owns customer-facing mobile UI and customer behavior.
- `mobile/vendor-app/` owns vendor-facing mobile UI and contractor operations.
- Do not put customer screens into the Vendor App or vendor dashboards into the Customer App.
- Do not overwrite one app's configuration while working on the other.
- Maintain independent `package.json`, `app.json`, and dependencies.

### Rule D: Preserve Unrelated Work
- Never delete or overwrite working components or user work.
- Never commit `.env` files or hardcode production API secrets into client source code.

---

## 4. Application Responsibilities & Ownership Matrix

| Project Area | Directory Path | Core Responsibilities | Boundary Constraint |
| :--- | :--- | :--- | :--- |
| **Customer App** | `mobile/customer-app/` | Auth, Service Search & Catalog, Address Picker, Job Creation, Emergency Dispatch, Offer Acceptance, Live Tracking, Arrival OTP Display, Reviews, Chat | Restricted from vendor tender feeds, pricing bids, or contractor settings |
| **Vendor App** | `mobile/vendor-app/` | Auth, Business Profile, Online/Offline Toggle, Masked Tenders Feed, Instant Emergency Claim (FCFS), Quotation Submissions, Arrival OTP Verification, Work Sign-off, Earnings & Escrow Ledger | Restricted from customer job creation, reviewing own work, or bypassing server authorization |
| **Central Backend** | `backend/` | Authoritative database models, JWT auth, RBAC authorization, atomic concurrency, WebSocket broadcasts, push notifications, payment settlement | Single source of truth for all clients |
| **Web Frontend** | `frontend/` | Existing customer, vendor, and admin portal for desktop & mobile browsers | Untouched during mobile development |

---

## 5. Technology Stack & Coding Standards

- **Core Framework**: React Native `0.86.3` with Expo SDK `57.0.31` and TypeScript `5.6.3`.
- **Styling**: Pure React Native `StyleSheet.create` using the WorkLogy canonical tokens:
  - Deep Navy: `#152B3C`
  - Forest Green (Brand Primary): `#06684F`
  - Warm Off-White Background: `#F7F6F2` / `#F8F9FA`
  - Surface White: `#FFFFFF`
  - Neutral Borders: `#E5E7EB`
  - Text Dark: `#111827`, Text Muted: `#6B7280`
  - Verified Green: `#10B981`, Warning Amber: `#F59E0B`, Emergency Red: `#DC2626`
- **Native Primitives Only**: Use pure React Native components (`View`, `Text`, `TouchableOpacity`, `ScrollView`, `FlatList`, `Modal`, `Switch`, `TextInput`, `ActivityIndicator`, `Image`). Never leak web/DOM elements (`div`, `span`, `button`, HTML elements).
- **Icons**: Vector icons via `@expo/vector-icons` (`Ionicons`, `MaterialCommunityIcons`, `Feather`, `FontAwesome5`). No raw string icon names in JSX text.
- **Session & Secure Storage**: `Expo SecureStore` dynamically loaded with in-memory fallback adapter (`src/storage/secureStorage.ts`) to ensure headless tests and CI never crash.
- **Currency & Localized Formatting**: Typed INR (`₹`) formatters (`src/utils/formatters.ts`).

---

## 6. Shared Data & Job Lifecycle Rules

All client applications observe the authoritative 11-status lifecycle:

```text
[open / emergency] 
       │ 
       ▼ (Vendor submits quote or instant emergency claim)
[pending_acceptance / awaiting_confirmation] 
       │ 
       ▼ (Customer accepts quotation or emergency assigned)
[confirmed / scheduled] 
       │ 
       ▼ (Vendor taps "On the Way")
[on_the_way] 
       │ 
       ▼ (Vendor marks arrived at site)
[arrived] 
       │ 
       ▼ (Vendor enters 6-digit Customer Arrival OTP: POST /api/bookings/:id/verify-arrival-otp)
[in_progress] 
       │ 
       ▼ (Vendor completes work & requests sign-off: POST /api/bookings/:id/complete-signoff)
[completion_pending] 
       │ 
       ▼ (Customer approves work & releases payment)
[completed] ──> Escrow Release & Weekly Monday Bank NEFT Payout
```

### Critical Business Invariants:
1. **Address Privacy Masking**: In open tender feeds (`AvailableJobsScreen` / `JobsScreen`), customers' full street addresses and house numbers are strictly masked (`Near Sector 62, Noida (~2.4 km away)`). Exact coordinates and full street addresses are unmasked **only** after official contractor assignment.
2. **First-Acceptance-Wins (FCFS) Emergency Claim**: Emergency dispatches are claimed atomically via `POST /api/jobs/:id/claim-instant`. Simultaneous claims receive `HTTP 409 Conflict`.
3. **Physical Arrival OTP Verification**: The 6-digit OTP (`booking.arrivalOtp`) is displayed on the customer's phone and verified cryptographically by the vendor upon physical arrival. Technicians cannot advance to `in_progress` without verified OTP entry.
4. **100% Escrow Protection**: Customer payments are held in escrow. WorkLogy deducts a transparent 10% platform fee, with net contractor earnings settled weekly on Mondays via NEFT.

---

## 7. Bug-Fixing Protocol (7-Step Method)

1. **Inspect & Reproduce**: Inspect runtime stack traces, error messages, and network payloads.
2. **Identify Failing Layer**: Isolate whether the defect is in UI rendering, navigation state, API client serialization, backend controller, or database query.
3. **Determine Root Cause**: Find the underlying fault. Never patch symptoms by suppressing errors with empty catch blocks or hardcoding fake data.
4. **Minimal Targeted Fix**: Apply the smallest complete, typed correction.
5. **Verify Affected Workflow**: Execute targeted TypeScript check (`npx tsc --noEmit`) and Expo bundling verification.
6. **Check for Regressions**: Confirm related tabs, screens, and API endpoints remain unaffected.
7. **Document Findings**: Record the post-mortem in `mobile/MEMORY.md`.

---

## 8. How to Handle Every New User Request

When receiving a user prompt, follow this 6-step workflow:
1. **Classify the Scope**:
   - Customer App UI or Functionality $\rightarrow$ work in `mobile/customer-app/`.
   - Vendor App UI or Functionality $\rightarrow$ work in `mobile/vendor-app/`.
   - Shared Mobile Documentation / Infrastructure $\rightarrow$ work in `mobile/`.
   - Website or Backend tasks $\rightarrow$ verify explicitly before editing.
2. **Trace Existing Implementation**: Trace UI $\rightarrow$ Navigation $\rightarrow$ API Client $\rightarrow$ Backend Route $\rightarrow$ Model $\rightarrow$ DB.
3. **Plan Minimal Complete Changes**: List exact files to edit and existing components to reuse.
4. **Implement**: Maintain coding standards, complete error/loading/empty states, and full TypeScript typing.
5. **Verify**: Run `npx tsc --noEmit` and build verification. Never claim checks pass without executing commands.
6. **Report**: Deliver the required completion report covering root causes, files modified, verification outputs, and remaining dependencies.

---

## 9. Definition of Done (DoD)

A mobile task is marked complete **ONLY** when:
- [x] Feature is fully implemented in the correct application directory (`customer-app` or `vendor-app`).
- [x] Code is 100% typed with zero TypeScript compiler errors (`npx tsc --noEmit`).
- [x] Application passes Expo Android Metro bundling (`npx expo export -p android`).
- [x] Real backend APIs and MongoDB persistence are used without mock data in production flows.
- [x] Zero changes made to website frontend (`frontend/`) unless explicitly mandated.
- [x] Documentation files (`mobile/TASKS.md`, `mobile/MEMORY.md`, `mobile/REQUIREMENTS.md`) are updated.
