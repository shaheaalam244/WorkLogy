# WorkLogy Mobile Applications — Implementation Task Backlog (`mobile/TASKS.md`)

This document is the authoritative engineering backlog for the **WorkLogy Customer Mobile App** (`customer-app`) and **WorkLogy Vendor Pro Mobile App** (`vendor-app`).

Every task is uniquely identified, strictly prioritized, and mapped to requirements in [`mobile/REQUIREMENTS.md`](file:///Users/shaheaalam/Desktop/worklogy/mobile/REQUIREMENTS.md). A task is marked **Done** ONLY after verifying its acceptance criteria against live code and backend contracts.

---

## 🚦 Definition of Done (DoD) Criteria

A backlog item transitions to **Done** if and only if:
1. **End-to-End Implementation**: The feature is implemented with typed TypeScript without placeholder stubs or fake mocked arrays.
2. **Strict Client Isolation**: All code changes reside exclusively within `mobile/customer-app/` or `mobile/vendor-app/`.
3. **Zero Web & Backend Regression**: No unauthorized modifications to `frontend/` (web portals) or `backend/` models and API contracts.
4. **Authoritative Backend Persistence**: Data mutates and persists in the central MongoDB Atlas database via Express REST endpoints and Socket.IO events.
5. **Robust State Handling**: Handles loading, empty, success, and error states gracefully with user feedback.
6. **Passing Verification**: TypeScript compilation (`npx tsc --noEmit`) and Expo bundling export pass cleanly with zero errors.

---

## 📊 Backlog Summary Matrix

| Category | Total Tasks | Done | In Progress | Todo | Blocked |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Phase 1: Architecture & Isolation (P0)** | 6 | 6 | 0 | 0 | 0 |
| **Phase 2: Customer Mobile App Core (P1)** | 17 | 17 | 0 | 0 | 0 |
| **Phase 3: Vendor Mobile App Core (P1)** | 12 | 12 | 0 | 0 | 0 |
| **Phase 4: Shared Mobile Architecture (P1)** | 5 | 5 | 0 | 0 | 0 |
| **Phase 5: Enhanced Field Capabilities (P2)** | 4 | 0 | 0 | 4 | 0 |
| **Phase 6: Future Scale & Localization (P3)** | 3 | 0 | 0 | 3 | 0 |
| **Total** | **47** | **40** | **0** | **7** | **0** |

---

## 📌 Phase 1: Architecture, Isolation & Security Foundation (P0)

### TSK-MOB-001: Mobile Workspace Isolation & Multi-App Directory Structure
- **Title**: Establish completely independent directory boundaries for Customer and Vendor apps
- **Priority**: P0
- **Relevant Area**: Shared Mobile Architecture / Tooling
- **Problem Statement**: Standard npm workspace configurations and monorepo symlinks trigger Metro bundler file resolution collisions and duplicate React/React Native package errors.
- **Expected Behavior**: Two completely decoupled directories (`mobile/customer-app/` and `mobile/vendor-app/`) with their own independent `package.json`, `app.json`, `tsconfig.json`, and `node_modules`.
- **Dependencies**: None.
- **Implementation Scope**: Root `mobile/` directory setup, independent package manifests, distinct Expo app slugs (`worklogy-customer` and `worklogy-vendor`).
- **Acceptance Criteria**: Running `npx expo start` in one directory operates without resolving modules or dependencies from the sibling app directory.
- **Test Requirements**: Verify independent `package.json` files; verify Metro bundler starts cleanly in both apps.
- **Status**: Done

---

### TSK-MOB-002: Mobile Project Governance Documentation Architecture
- **Title**: Create authoritative mobile project documentation suite
- **Priority**: P0
- **Relevant Area**: Architecture & Documentation
- **Problem Statement**: Without centralized contracts, autonomous agents risk making conflicting architectural choices, inventing fake APIs, or breaking the web application.
- **Expected Behavior**: Six authoritative documentation files (`AGENTS.md`, `ARCHITECTURE.md`, `MEMORY.md`, `README.md`, `REQUIREMENTS.md`, `TASKS.md`) defining verified facts, contracts, and workflows.
- **Dependencies**: Deep repository inspection of backend routes, models, and controllers.
- **Implementation Scope**: Create and maintain all 6 markdown specifications under `mobile/`.
- **Acceptance Criteria**: Documentation provides unambiguous app boundaries, non-negotiable website protection rules, verified endpoint matrices, and traceable requirements.
- **Test Requirements**: Cross-document consistency review; verify all internal file paths and links.
- **Status**: Done

---

### TSK-MOB-003: Universal Secure Storage Engine with Dynamic In-Memory Fallback
- **Title**: Build cross-environment token storage adapter
- **Priority**: P0
- **Relevant Area**: Shared Mobile Architecture (`src/storage/secureStorage.ts`)
- **Problem Statement**: `expo-secure-store` throws unhandled runtime crashes when executed in web browser previews, Node test environments, or non-native runtimes.
- **Expected Behavior**: Storage adapter dynamically checks native runtime capabilities, utilizing `Expo SecureStore` on physical/emulator devices and falling back gracefully to memory maps in web/test runners.
- **Dependencies**: `expo-secure-store`
- **Implementation Scope**: Implement `secureStorage` wrapper with `getItemAsync`, `setItemAsync`, and `deleteItemAsync` in both mobile apps.
- **Acceptance Criteria**: Session tokens persist across app launches on iOS/Android and do not crash in Expo Web or Node tests.
- **Test Requirements**: Verify silent login token retrieval and fallback memory retention.
- **Status**: Done

---

### TSK-MOB-004: Centralized Typed API Client & Axios Interceptor Architecture
- **Title**: Implement typed REST client with automatic JWT bearer hydration
- **Priority**: P0
- **Relevant Area**: Shared Mobile Architecture (`src/api/client.ts`)
- **Problem Statement**: Manual header injection across screens leads to missing auth tokens, inconsistent timeout handling, and unformatted network exceptions.
- **Expected Behavior**: Pre-configured Axios instance with 15s timeout, base URL resolution, and an asynchronous request interceptor that auto-injects `Authorization: Bearer <token>` from secure storage.
- **Dependencies**: `axios`, `src/storage/secureStorage.ts`
- **Implementation Scope**: Create `src/api/client.ts` in both mobile apps with typed methods for auth, jobs, bookings, and profile endpoints.
- **Acceptance Criteria**: Authenticated requests automatically attach valid tokens; 401 Unauthorized responses trigger session expiration handling.
- **Test Requirements**: Inspect request headers on outgoing API calls; verify bearer injection.
- **Status**: Done

---

### TSK-MOB-005: Strict Web Frontend Protection & Regression Guard
- **Title**: Enforce zero-modification boundary for existing web application
- **Priority**: P0
- **Relevant Area**: Web Frontend Protection (`frontend/`)
- **Problem Statement**: Modifying shared backend models or introducing breaking API contract changes can inadvertently crash the production web marketplace.
- **Expected Behavior**: The existing web frontend (`frontend/`) remains 100% untouched and functional across customer, vendor, and admin portals.
- **Dependencies**: Existing Vite web application.
- **Implementation Scope**: Maintain strict file isolation rules in `mobile/AGENTS.md` and verify no frontend code edits occur during mobile tasks.
- **Acceptance Criteria**: Git diff on `frontend/` remains clean; web unit tests (148/148) and production build (`npm run build`) pass cleanly.
- **Test Requirements**: Execute `npm run build` in `frontend/`.
- **Status**: Done

---

### TSK-MOB-006: Central Backend Single-Source-of-Truth Reusability
- **Title**: Connect mobile apps directly to existing Express backend and MongoDB
- **Priority**: P0
- **Relevant Area**: Backend & Database Architecture
- **Problem Statement**: Duplicating backend logic or building parallel mobile databases creates data desynchronization and invalidates business rules.
- **Expected Behavior**: Both mobile apps consume the exact same Express REST endpoints on port 5001 and MongoDB Atlas database as the web application.
- **Dependencies**: Central Express server (`backend/src/server.js`).
- **Implementation Scope**: Map all mobile operations directly to existing controllers (`auth.controller.js`, `job.controller.js`, `booking.controller.js`, `application.controller.js`).
- **Acceptance Criteria**: A job created in the Customer Mobile App is immediately visible in the Web Admin and Vendor Mobile App.
- **Test Requirements**: Verify database persistence of mobile-originated requests in MongoDB.
- **Status**: Done

---

## 📌 Phase 2: Customer Mobile App Core (P1)

### TSK-MOB-007: Customer Authentication & Session State Management
- **Title**: Build Customer Login, Registration, and silent session hydration
- **Priority**: P1
- **Relevant Area**: Customer Mobile App (`src/screens/LoginScreen.tsx`, `RegisterScreen.tsx`, `AuthContext.tsx`)
- **Problem Statement**: Customers need secure sign-up, sign-in, and persistent session recovery without repetitive credential prompts.
- **Expected Behavior**: Customers register with name, email, phone, password, or login with credentials. Session token persists in `SecureStore` and auto-hydrates via `GET /api/auth/me`.
- **Dependencies**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `secureStorage`.
- **Implementation Scope**: Form validation, error state displays, token storage, and context state provider.
- **Acceptance Criteria**: Valid login navigates to Home tab; invalid credentials show error banner; app cold restart retains user session.
- **Test Requirements**: Verify token persistence in `secureStorage`; verify `npx tsc --noEmit`.
- **Status**: Done

---

### TSK-MOB-008: Customer 5-Tab Navigation Shell
- **Title**: Implement native customer bottom navigation bar
- **Priority**: P1
- **Relevant Area**: Customer Mobile App (`src/navigation/CustomerNavigator.tsx`)
- **Problem Statement**: Customers require seamless transitions between discovery, search, bookings, messaging, and account management.
- **Expected Behavior**: Fixed bottom tab bar with 5 items: Home, Explore, My Jobs, Messages, and Profile, with active state color indicators (`#2563EB`) and icon badges.
- **Dependencies**: `@expo/vector-icons`, React Native core components.
- **Implementation Scope**: State-driven navigation router with tab switching and modal sub-screen overlays.
- **Acceptance Criteria**: Tapping any tab switches the active screen without unmounting global auth context; active tab displays highlighted icon and text.
- **Test Requirements**: Verify navigation state transitions; verify clean type compilation.
- **Status**: Done

---

### TSK-MOB-009: Customer Home Feed & Interactive Service Discovery
- **Title**: Build Home Screen with search, categories grid, and emergency CTA
- **Priority**: P1
- **Relevant Area**: Customer Mobile App (`src/screens/HomeScreen.tsx`)
- **Problem Statement**: Customers need quick discovery of popular services, category browsing, and prominent emergency service access.
- **Expected Behavior**: Displays brand header, location pill, live search bar, 24/7 Rapid Emergency banner (₹499), 3x3 category grid with high-resolution imagery, and active booking card.
- **Dependencies**: `GET /api/categories`, `GET /api/bookings/my-bookings`.
- **Implementation Scope**: Category rendering, search filter logic, pull-to-refresh integration, and emergency screen launcher.
- **Acceptance Criteria**: Search filters categories in real-time; pull-to-refresh re-queries categories and active bookings from backend.
- **Test Requirements**: Verify component rendering; verify `npx tsc --noEmit`.
- **Status**: Done

---

### TSK-MOB-010: 30-Trade Service Directory & Subservice Catalog
- **Title**: Build 30-category Explore Screen and Subservice Details view
- **Priority**: P1
- **Relevant Area**: Customer Mobile App (`src/screens/ExploreScreen.tsx`, `CategoryDetailScreen.tsx`)
- **Problem Statement**: Customers need to explore all 30 canonical trades with transparent pricing and detailed service package breakdowns.
- **Expected Behavior**: Explore screen displays all 30 trades classified into 4 groups (Home Maintenance, Repair & Installation, Moving & Construction, Personal & Other). Selecting a trade opens Category Details with subservice price cards and included services.
- **Dependencies**: `GET /api/categories`, `GET /api/categories/:slug`, local photography assets.
- **Implementation Scope**: Group filtering chips, responsive list layout, subservice cards with upfront pricing in ₹ INR.
- **Acceptance Criteria**: All 30 trades render their corresponding local PNG photography; selecting a subservice pre-selects the category in the job creation wizard.
- **Test Requirements**: Verify all 33 image imports in `serviceImages.ts`; verify type checks.
- **Status**: Done

---

### TSK-MOB-011: Standard Service Request Creation Wizard
- **Title**: Build multi-step job creation form with address and schedule selection
- **Priority**: P1
- **Relevant Area**: Customer Mobile App (`src/screens/CreateJobScreen.tsx`)
- **Problem Statement**: Customers must be able to specify exact service requirements, location, urgency, and preferred appointment slots.
- **Expected Behavior**: Customer inputs job title, category, description, urgency (Normal vs High), service address (street, city, pincode), and appointment date/time.
- **Dependencies**: `POST /api/jobs`, `AuthContext`.
- **Implementation Scope**: Validation on form inputs, API payload mapping, loading indicator during submission, and redirection to My Jobs.
- **Acceptance Criteria**: Form validates required fields; successful submission creates job in MongoDB with status `open`, emits socket lead, and redirects to My Jobs tab.
- **Test Requirements**: Verify API call payload structure; verify TypeScript types.
- **Status**: Done

---

### TSK-MOB-012: 24/7 Rapid Emergency Dispatch Radar Screen
- **Title**: Build instant emergency dispatch interface with animated radar
- **Priority**: P1
- **Relevant Area**: Customer Mobile App (`src/screens/EmergencyScreen.tsx`)
- **Problem Statement**: Urgent home breakdowns (electrical faults, gas leaks, water bursts) require rapid single-tap dispatch with guaranteed upfront diagnostic pricing.
- **Expected Behavior**: Screen presents life-safety emergency guidance (112/101), emergency trade selection (Electrician, Plumber, Locksmith, AC Repair), ₹499 visit guarantee, and animated radar broadcast animation.
- **Dependencies**: `POST /api/jobs` (`urgency: 'emergency'`).
- **Implementation Scope**: Radar pulse animation, immediate dispatch trigger, and emergency broadcast dispatch handler.
- **Acceptance Criteria**: Emergency job is created with `urgency: 'emergency'`; server triggers live socket broadcast to eligible local vendors.
- **Test Requirements**: Verify emergency urgency flag in payload; verify clean compilation.
- **Status**: Done

---

### TSK-MOB-013: Customer Job Dossier & Cryptographic Arrival OTP Display
- **Title**: Build My Jobs screen with live tracking and secure 6-digit OTP
- **Priority**: P1
- **Relevant Area**: Customer Mobile App (`src/screens/MyJobsScreen.tsx`, `JobDetailScreen.tsx`)
- **Problem Statement**: Customers must track assigned technicians in real time and securely verify physical contractor arrival before work starts.
- **Expected Behavior**: My Jobs lists active and past bookings. Active jobs display assigned contractor details, call button, status tracker, and prominent 6-digit Arrival OTP.
- **Dependencies**: `GET /api/bookings/my-bookings`, `GET /api/bookings/:id`.
- **Implementation Scope**: Booking card list, filter chips (All, Active, Completed), status stepper, and Arrival OTP security banner.
- **Acceptance Criteria**: Arrival OTP is rendered in bold 24pt text; status advances in real time as contractor updates field status.
- **Test Requirements**: Verify booking status mapping across all 11 lifecycle statuses.
- **Status**: Done

---

### TSK-MOB-014: Customer Real-Time Chat & Direct Contractor Messaging
- **Title**: Build production-ready in-app messaging interface & technician chat with Socket.IO live stream
- **Priority**: P1
- **Relevant Area**: Customer Mobile App (`src/screens/MessagesScreen.tsx`, `ChatDetailScreen.tsx`)
- **Problem Statement**: Customers need to coordinate with assigned service professionals regarding gate access, parking, or specific repair details, with safe status bar spacing, search/filter, presence, and verified booking context.
- **Expected Behavior**: Real-time conversations list with unread counter, search filter, active presence indicators, service/booking tags, and empty/loading states. Full Chat Detail screen with vendor avatar, verified badge, call action, booking context banner, date separators, multiline keyboard-avoiding composer, pagination, idempotent message dispatch (`clientTempId`), and live Socket.IO synchronisation.
- **Dependencies**: `GET /api/chat/conversations`, `GET /api/chat/conversations/:id/messages`, `POST /api/chat/messages`, `PATCH /api/chat/conversations/:id/read`, `GET /api/chat/unread-count`, Socket.IO client.
- **Implementation Scope**: Modernized `MessagesScreen.tsx`, `ChatDetailScreen.tsx`, and `VendorChatDetailScreen.tsx`. Configured Android `softwareKeyboardLayoutMode: resize` in `app.json`, `KeyboardAvoidingView behavior="padding"` with 0 offset to avoid keyboard overlapping message composer or recent messages, dynamic keyboard-aware bottom padding (preventing duplicate insets when keyboard opens), scroll tracking via `isNearBottomRef`, multiline input support, and back navigation dismiss handling.
- **Acceptance Criteria**: Messages load dynamically for authenticated customer; search and all/unread filters filter conversations; real-time socket events (`receive_message`, `messages_read`, `user_presence`) update the inbox and chat detail; sent messages persist to MongoDB and update Vendor app; tapping the composer opens soft keyboard with message composer sitting directly above keyboard; messages list shrinks without hiding latest messages; Android hardware Back navigates step-by-step; TypeScript passes with 0 errors.
- **Test Requirements**: Execute `npx tsc --noEmit` and verify live messaging flows.
- **Status**: Done

---

### TSK-MOB-015: Customer Service Review & Star Rating Modal
- **Title**: Build post-completion review and rating dialog
- **Priority**: P1
- **Relevant Area**: Customer Mobile App (`src/screens/ReviewModalScreen.tsx`)
- **Problem Statement**: Platform quality depends on verified customer feedback for completed jobs.
- **Expected Behavior**: Modal allows customers to select 1 to 5 star rating, write comments, and submit feedback for completed bookings.
- **Dependencies**: `POST /api/reviews` (body: `{ bookingId, rating, comment }`).
- **Implementation Scope**: Star rating selector component, text review input, submission loader, and error handling.
- **Acceptance Criteria**: Review submits to backend, updates contractor's public rating in MongoDB, and closes modal with success toast.
- **Test Requirements**: Verify rating validation (1–5 integer) and API submission.
- **Status**: Done

---

### TSK-MOB-016: Production-Ready Customer Profile & Account Management
- **Title**: Build production customer profile, address management, escrow dossier, notification preferences, and support desk
- **Priority**: P1
- **Relevant Area**: Customer Mobile App (`src/screens/ProfileScreen.tsx`, `src/api/client.ts`, `src/types/index.ts`, `src/context/AuthContext.tsx`)
- **Problem Statement**: Customer profile screen previously showed generic fallbacks ("C", "Customer", fake "VERIFIED CUSTOMER"), an overlapping settings cog button, static dummy addresses, missing profile editing, and unconnected notification toggles.
- **Expected Behavior**: Profile screen displays real customer profile photo (with initials fallback), verified name, email, phone, genuine verification status (only when verified), member since date, Edit Profile modal (with `PUT /api/auth/updatedetails`), dedicated service address manager (add, delete, select active dispatch address via `POST /api/users/customer/addresses`), notification preferences modal (`PATCH /api/notifications/preferences`), persistent push sound toggle, escrow payments and transactions dossier (`GET /api/customer/transactions`), support desk with 24/7 hotline and dispute ticket creation (`POST /api/support`), contractor portal switch explanation dialog, and reliable sign out.
- **Dependencies**: `GET /api/auth/me`, `PUT /api/auth/updatedetails`, `GET /api/users/customer/profile`, `POST /api/users/customer/addresses`, `DELETE /api/users/customer/addresses/:id`, `GET /api/customer/transactions`, `GET/PATCH /api/notifications/preferences`, `GET /api/support/my`, `POST /api/support`, `secureStorage`.
- **Implementation Scope**: Full rewrite of `ProfileScreen.tsx` with 6 interactive modals, real backend API integration, safe-area-aware header with manual refresh, and zero mock data.
- **Acceptance Criteria**: Live profile edits persist to backend; addresses persist in MongoDB subdocuments; transactions reflect real escrow records; logout purges tokens and redirects cleanly; passes TypeScript check and Expo export.
- **Test Requirements**: Run `npx tsc --noEmit` and `npx expo export --dump-sourcemap`.
- **Status**: Done

---

## 📌 Phase 3: Vendor Mobile App Core (P1)

### TSK-MOB-017: Vendor Authentication & Business Registration
- **Title**: Build Vendor Login, Registration, and business profile onboarding
- **Priority**: P1
- **Relevant Area**: Vendor Mobile App (`src/screens/VendorLoginScreen.tsx`, `VendorRegisterScreen.tsx`, `AuthContext.tsx`)
- **Problem Statement**: Service professionals need dedicated onboarding capturing business trade details and provisioned with `'vendor'` role.
- **Expected Behavior**: Contractor registers with name, business name, trade category, email, phone, and password. Successful registration creates vendor account and loads Vendor Dashboard.
- **Dependencies**: `POST /api/auth/register` (`role: 'vendor'`), `POST /api/auth/login`.
- **Implementation Scope**: Registration form with trade selection, credential validation, token persistence, and role verification.
- **Acceptance Criteria**: Successful login sets vendor session; non-vendor users are prevented from entering vendor dashboard.
- **Test Requirements**: Verify role check during login; verify `npx tsc --noEmit`.
- **Status**: Done

---

### TSK-MOB-018: Vendor 5-Destination Navigation Architecture with Center Action FAB
- **Title**: Implement dedicated vendor pro bottom navigation shell with center Post Job / Add Service FAB and Customer Messages
- **Priority**: P1
- **Relevant Area**: Vendor Mobile App (`src/navigation/VendorNavigator.tsx`, `src/screens/VendorMessagesScreen.tsx`)
- **Problem Statement**: Service professionals need direct access to customer inquiries, quick service/job publishing via a prominent center button, and persistent routing without confusing customer job posting with vendor service listings.
- **Expected Behavior**: Fixed bottom tab bar with 5 items: Home, Jobs, Center Prominent Circular `+` FAB Button, Messages, and Profile. Center `+` button opens quick action sheet to "Add a Service Offering" (`VendorNewService`) or "Browse & Claim Open Jobs" (`JobsTab`). Earnings relocated to Dashboard and Profile with genuine transaction metrics.
- **Dependencies**: `@expo/vector-icons`, React Native Safe Area Context, live chat APIs.
- **Implementation Scope**: 5-destination navigation bar, raised center floating action button, quick actions modal, dedicated customer messages inbox, and route persistence.
- **Acceptance Criteria**: Seamless navigation between all 5 destinations; prominent circular FAB launches creation action sheet; Messages connects to MongoDB chat collections; Earnings remains accessible with real numbers.
- **Test Requirements**: Clean compilation with `npx tsc --noEmit`; integration tests for chat and route switching.
- **Status**: Done

---

### TSK-MOB-019: Vendor Operations Dashboard & Live Dispatch Availability Toggle
- **Title**: Build Vendor Home Screen with persistent availability switch and incoming leads
- **Priority**: P1
- **Relevant Area**: Vendor Mobile App (`src/screens/VendorHomeScreen.tsx`, `src/screens/VendorProfileScreen.tsx`, `backend/src/controllers/vendor.controller.js`)
- **Problem Statement**: Availability toggle previously crashed with validation error when turning OFF due to Mongoose subdocument spread mutation corrupting hours schema.
- **Expected Behavior**: Header with contractor name, verification badge, and Online/Offline toggle. Active toggle updates `PUT /api/vendors/availability` atomically. Safely mutates `vendor.availability.isAvailableNow` without schema corruption. Preserves status across page navigations and reloads.
- **Dependencies**: `GET /api/vendors/profile/me`, `PUT /api/vendors/availability`, `GET /api/jobs/open`.
- **Implementation Scope**: Availability toggle switch with loading indicator, optimistic update rollback on failure, and server-side persistence.
- **Acceptance Criteria**: Toggling availability updates database immediately; turning OFF updates vendor dispatch eligibility; persists on return; verified via live API test suite.
- **Test Requirements**: Verify API call to `PUT /api/vendors/availability` (ON and OFF); verify `npx tsc --noEmit`.
- **Status**: Done

---

### TSK-MOB-020: Masked Available Tender Board & Quotation Filter Tabs
- **Title**: Build open tender feed with customer privacy masking, live Web parity, and 7 status tabs
- **Priority**: P1
- **Relevant Area**: Vendor Mobile App (`src/screens/JobsScreen.tsx`)
- **Problem Statement**: Available customer jobs were visible on Web but showing "No Jobs Found" on Vendor Mobile App due to missing auth handling, swallowed exceptions, unhandled trade category configuration status, and restrictive 48h age filtering on tab='new'.
- **Expected Behavior**: Feed synchronizes directly with backend `GET /api/jobs/nearby?tab=all`, displaying the same real published customer jobs as the Web portal. 7 filter tabs: Direct Inquiries, New Requests, Quoted, Accepted, In Progress, Completed, Cancelled. Rich cards show category badge, urgency pill (⚡ Emergency), customer locality, schedule, budget, Send Quote, Accept Job, and View Dossier actions. Provides explicit configuration banners when vendor lacks trade categories or service area.
- **Dependencies**: `GET /api/jobs/nearby`, `GET /api/applications/vendor`, `GET /api/bookings`.
- **Implementation Scope**: Synchronized live query (`tab=all`), authenticated header with vendor initials, configuration status banners (`missing_categories`, `missing_service_area`), persistent storage via `expo-secure-store`, zero-swallow error boundary, and full E2E data flow verification.
- **Acceptance Criteria**: Web-created jobs appear instantly in mobile "New Requests"; address privacy masking preserved; ineligible vendors blocked with 403; real MongoDB persistence verified across both platforms.
- **Test Requirements**: 13-step end-to-end verification script (`verify_job_sync_e2e.mjs`) passing cleanly; `npx tsc --noEmit` passing with 0 errors.
- **Status**: Done

---

### TSK-MOB-021: Interactive Quotation & Bid Submission Modal
- **Title**: Build itemized quotation builder with labor, parts, and travel fees
- **Priority**: P1
- **Relevant Area**: Vendor Mobile App (`src/screens/JobsScreen.tsx`)
- **Problem Statement**: Transparent estimates require itemized pricing rather than arbitrary lump sums.
- **Expected Behavior**: Modal allows contractor to enter Service Charge, Labor Charge, Material/Parts Cost, and Travel Fee. Computes total ₹ INR dynamically. Captures proposed date, estimated duration, and work notes.
- **Dependencies**: `POST /api/applications` (body: `{ jobId, proposedAmount, coverLetter, estimatedDuration, materialCharges }`).
- **Implementation Scope**: Numeric input fields, auto-calculating total sum, anti-duplicate submission lock, and success feedback.
- **Acceptance Criteria**: Validates proposed amount > 0; submits application to backend; marks job as "Quoted" in UI.
- **Test Requirements**: Verify calculation logic and API submission payload.
- **Status**: Done

---

### TSK-MOB-022: Atomic First-Acceptance-Wins (FCFS) Emergency Claim Workflow
- **Title**: Implement single-tap atomic claim for rapid emergency jobs
- **Priority**: P1
- **Relevant Area**: Vendor Mobile App (`src/screens/JobsScreen.tsx`, `VendorHomeScreen.tsx`, `src/api/client.ts`)
- **Problem Statement**: Emergency jobs require instant technician assignment without waiting for customer quote comparisons, while preventing duplicate conflicting assignments.
- **Expected Behavior**: Emergency leads display "Accept Emergency Call (₹499)" button. Tapping invokes `POST /api/jobs/:id/claim-instant`. First contractor claims job atomically; subsequent bidders receive 409 Conflict.
- **Dependencies**: `POST /api/jobs/:id/claim-instant`, atomic database update in backend.
- **Implementation Scope**: Instant claim button handler, optimistic UI lock, 409 Conflict error handling, and redirection to confirmed job dossier.
- **Acceptance Criteria**: Successful claim assigns job and opens booking dossier; losing claim displays alert "Job already claimed by another contractor".
- **Test Requirements**: Test concurrency handling; verify TypeScript types.
- **Status**: Done

---

### TSK-MOB-023: Unmasked Assigned Job Dossier & Turn-by-Turn Navigation Launcher
- **Title**: Build Confirmed Job Detail Screen with unmasked address and Google Maps
- **Priority**: P1
- **Relevant Area**: Vendor Mobile App (`src/screens/VendorJobDetailScreen.tsx`, `ConfirmedJobsScreen.tsx`)
- **Problem Statement**: Once officially assigned, technicians need the customer's full address, direct phone access, and map navigation.
- **Expected Behavior**: Unmasks full customer address, house number, and phone. Provides one-tap "Call Customer" and "Navigate via Google Maps" (`Linking.openURL`).
- **Dependencies**: `GET /api/bookings/:id`.
- **Implementation Scope**: Full customer dossier card, contact actions, map intent launcher, and field workflow progression controls.
- **Acceptance Criteria**: Address is unmasked only for confirmed bookings; tapping Navigate launches Google Maps app or web URL.
- **Test Requirements**: Verify `Linking.openURL` intent formatting; verify `npx tsc --noEmit`.
- **Status**: Done

---

### TSK-MOB-024: Cryptographic Physical Arrival OTP Verification Workflow
- **Title**: Build on-site Arrival OTP verification dialog
- **Priority**: P1
- **Relevant Area**: Vendor Mobile App (`src/screens/VendorJobDetailScreen.tsx`)
- **Problem Statement**: To eliminate fraudulent check-ins, technicians cannot start work without physically verifying the customer's 6-digit OTP.
- **Expected Behavior**: Technician prompts customer for the 6-digit OTP displayed on their screen, enters it into the OTP dialog, and submits to `POST /api/bookings/:id/verify-arrival-otp`. Successful verification unlocks status transition to `in_progress`.
- **Dependencies**: `POST /api/bookings/:id/verify-arrival-otp` (body: `{ otp }`).
- **Implementation Scope**: 6-digit input dialog, server verification call, invalid OTP error prompt, and status unlock.
- **Acceptance Criteria**: Valid OTP unlocks work start; invalid OTP displays error without altering job status.
- **Test Requirements**: Test with correct and incorrect OTP payloads; verify `npx tsc --noEmit`.
- **Status**: Done

---

### TSK-MOB-025: Sequential Field Status Progression & Completion Sign-Off
- **Title**: Build sequential field status machine and completion handoff
- **Priority**: P1
- **Relevant Area**: Vendor Mobile App (`src/screens/VendorJobDetailScreen.tsx`)
- **Problem Statement**: Field operations must follow a strict, orderly workflow with clear audit checkpoints.
- **Expected Behavior**: Technician advances status sequentially: `confirmed` -> `on_the_way` -> `arrived` -> `in_progress` -> `completion_pending` -> `completed`. Marking completion captures repair notes and submits completion sign-off.
- **Dependencies**: `PATCH /api/bookings/:id/status`, `POST /api/bookings/:id/complete-signoff`.
- **Implementation Scope**: Status step indicator, context-sensitive action buttons, completion sign-off modal with notes input.
- **Acceptance Criteria**: Disallows skipping intermediate statuses; emits real-time status update to customer.
- **Test Requirements**: Verify valid status transitions against the 11-status lifecycle matrix.
- **Status**: Done

---

### TSK-MOB-026: Vendor Financials & Platform Fee Escrow Breakdown
- **Title**: Build Earnings Screen with 10% platform fee ledger
- **Priority**: P1
- **Relevant Area**: Vendor Mobile App (`src/screens/EarningsScreen.tsx`)
- **Problem Statement**: Contractors need transparent visibility into gross earnings, platform commission deductions, pending escrow, and bank settlements.
- **Expected Behavior**: Displays 4 KPI cards (Total Earnings, This Month Net, Pending Escrow, Completed Payouts). Transaction ledger itemizes Gross Bill, 10% WorkLogy Fee deduction, and Net Payout in ₹ INR. Includes verified bank payout account details.
- **Dependencies**: `GET /api/vendors/earnings`, `GET /api/vendors/transactions`.
- **Implementation Scope**: Financial metric cards, transaction list with mathematical reconciliation, bank account card, and payout status badges.
- **Acceptance Criteria**: Mathematical calculation holds: Net Payout = Gross - 10%; escrow status indicates release criteria.
- **Test Requirements**: Verify currency formatting in ₹ INR; verify `npx tsc --noEmit`.
- **Status**: Done

---

## 📌 Phase 4: Shared Mobile Architecture & Offline Assets (P1)

### TSK-MOB-027: Statutory KYC Verification Document Submission Workflow
- **Title**: Build contractor identity verification modal
- **Priority**: P1
- **Relevant Area**: Vendor Mobile App (`src/screens/VendorProfileScreen.tsx`)
- **Problem Statement**: Hyperlocal safety requires verified contractors with statutory ID documents (Aadhaar, PAN, Voter ID, Trade License).
- **Expected Behavior**: Contractor selects document type, enters government ID number, confirms compliance declaration, and submits to the admin verification queue via `POST /api/vendors/verification`.
- **Dependencies**: `POST /api/vendors/verification`.
- **Implementation Scope**: Document type dropdown, ID number input, statutory consent checkbox, and submitted state badge.
- **Acceptance Criteria**: Submitting marks contractor status as `'submitted'`; prevents contractor from self-marking verified.
- **Test Requirements**: Verify validation rules and API submission.
- **Status**: Done

---

### TSK-MOB-028: High-Resolution Offline Photography Asset Bundling
- **Title**: Bundle 33 local service trade images across both mobile applications
- **Priority**: P1
- **Relevant Area**: Shared Mobile Architecture (`src/assets/services/`, `src/utils/serviceImages.ts`)
- **Problem Statement**: Relying on remote CDNs for service icons results in white boxes, slow loading, and broken visual experiences during intermittent Indian mobile connectivity.
- **Expected Behavior**: All 33 service trade photographs are bundled locally as PNG assets in both `customer-app` and `vendor-app`. Image helper maps category slugs to static assets synchronously.
- **Dependencies**: Local image files in `src/assets/services/`.
- **Implementation Scope**: Asset directory structure, 33 static requires, and typed image resolver dictionary.
- **Acceptance Criteria**: Zero network requests required to display category photography; offline mode renders full imagery without visual placeholders.
- **Test Requirements**: Verify all 33 asset requires compile cleanly without missing file errors.
- **Status**: Done

---

### TSK-MOB-029: In-App Notification Center & Unread Badge Architecture
- **Title**: Build notification center and header bell badge
- **Priority**: P1
- **Relevant Area**: Shared Mobile Architecture (`NotificationsScreen.tsx`, `Header.tsx`)
- **Problem Statement**: Users must be alerted immediately when job leads arrive, quotes are submitted, or status transitions occur.
- **Expected Behavior**: Header bell icon displays red counter badge with unread count. Tapping opens Notifications Screen showing categorized alerts (leads, quotes, payments, system). "Mark all as read" clears badge.
- **Dependencies**: `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/read-all`.
- **Implementation Scope**: Header badge component, notification feed layout, unread count polling, and mark-as-read handler.
- **Acceptance Criteria**: Unread count badge matches server count; tapping "Mark all read" updates badge to 0.
- **Test Requirements**: Verify notification fetching and badge update logic.
- **Status**: Done

---

### TSK-MOB-030: Cross-Platform Build & TypeScript Compilation Pipeline
- **Title**: Ensure zero-error TypeScript validation and Expo production export
- **Priority**: P1
- **Relevant Area**: Tooling & Quality Assurance
- **Problem Statement**: Type errors and bundler misconfigurations block EAS production builds and cause runtime crashes on physical devices.
- **Expected Behavior**: Both `mobile/customer-app` and `mobile/vendor-app` execute `npx tsc --noEmit` and `npx expo export` with zero errors.
- **Dependencies**: `typescript`, `@expo/cli`.
- **Implementation Scope**: Full type check passes across all screens, navigation, and API clients in both mobile apps.
- **Acceptance Criteria**: TypeScript compiler emits zero diagnostics; Expo bundler exports clean production JS bundles.
- **Test Requirements**: Execute `npx tsc --noEmit` in both apps; execute `npx expo export -p android --no-bytecode` in `vendor-app`.
- **Status**: Done

---

### TSK-MOB-038: Universal Safe Area Inset & System Status Bar Layout Architecture
- **Title**: Dynamic status bar safe insets and bottom navigation clearances across mobile apps
- **Priority**: P0
- **Relevant Area**: Shared Mobile Architecture (`SafeAreaProvider`, `useSafeAreaInsets`, Navigation & Screen Headers)
- **Problem Statement**: Modern edge-to-edge Android/iOS rendering caused status bar icons (time, battery, network) to overlap the WorkLogy brand logo, action icons, and profile headers. Fixed bottom tab bars covered the lowest elements on scrollable screens.
- **Expected Behavior**: Content starts comfortably below the device status bar using dynamic `insets.top` (`Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0)`). Bottom tab bars and scrollable containers preserve 100dp clearance to ensure uninterrupted interaction with buttons and actions.
- **Dependencies**: `react-native-safe-area-context`.
- **Implementation Scope**: Root `SafeAreaProvider` configuration in `App.tsx` of both apps; dynamic top and bottom insets across shared navigation containers (`CustomerNavigator.tsx`, `VendorNavigator.tsx`, `Header.tsx`); custom header adaptations in `HomeScreen.tsx`, `ExploreScreen.tsx`, `MessagesScreen.tsx`, `ProfileScreen.tsx`, `JobDetailScreen.tsx`, `ChatDetailScreen.tsx`, `VendorProfileScreen.tsx`, `VendorChatDetailScreen.tsx`.
- **Acceptance Criteria**: Headers render completely below device cutouts/notches and status bars; bottom actions (Sign Out, Submit, Composer) are never clipped or occluded; builds pass cleanly.
- **Test Requirements**: `npx tsc --noEmit` and `npx expo export --dump-sourcemap` in both mobile apps.
- **Status**: Done

---

### TSK-MOB-039: Complete Vendor Service Listing & Customer Direct Booking System
- **Title**: Build vendor skill listing, pricing/availability configuration, customer discovery, and direct booking workflow
- **Priority**: P1
- **Relevant Area**: Vendor App (`VendorServicesScreen.tsx`, `VendorNewServiceScreen.tsx`, `JobsScreen.tsx`) & Customer App (`ProfessionalProfileScreen.tsx`, `ExploreScreen.tsx`)
- **Problem Statement**: Vendors previously had no dedicated mobile interface to list their skilled trades, configure pricing models, specify travel radiuses, or manage working hours. Customers could discover categories but lacked direct access to individual published service offerings and one-tap direct bookings.
- **Expected Behavior**: Vendors can view all published/paused/draft services, create services with a 5-step wizard (Info, Pricing, Coverage, Availability, Preview & Publish), edit, pause, and delete services. Customers discover published services and can book vendors directly. Incoming direct booking inquiries (`pending_acceptance`) appear in the vendor's `JobsScreen` with instant Accept and Decline actions, with acceptance generating secure 6-digit service-start OTPs and triggering status progression.
- **Dependencies**: Backend endpoints `GET /api/vendors/services`, `POST /api/vendors/services`, `PUT /api/vendors/services/:id`, `PATCH /api/vendors/services/:id/status`, `DELETE /api/vendors/services/:id`, `POST /api/bookings/direct`, `PATCH /api/bookings/:id/respond`.
- **Implementation Scope**: `VendorServicesScreen.tsx`, `VendorNewServiceScreen.tsx`, `VendorNavigator.tsx`, `VendorHomeScreen.tsx`, `VendorProfileScreen.tsx`, `JobsScreen.tsx`, `ProfessionalProfileScreen.tsx`, `types/index.ts`, and `client.ts` in both mobile apps.
- **Acceptance Criteria**: All 13 acceptance tests pass: service creation, MongoDB persistence, editing price/description, customer discovery, vendor profile catalog view, direct booking submission, vendor inquiry acceptance with OTP generation, service pausing, and strict RBAC authorization.
- **Test Requirements**: Automated 13-point end-to-end integration test executed via live backend API; `npx tsc --noEmit` cleanly passing in both mobile apps.
- **Status**: Done

---

## 📌 Phase 5: Enhanced Field Capabilities & Offline Sync (P2)

### TSK-MOB-031: Native Push Notification Delivery Engine via Expo Push
- **Title**: Implement native background push notifications for high-priority dispatches
- **Priority**: P2
- **Relevant Area**: Shared Mobile Architecture (`src/services/pushNotifications.ts`)
- **Problem Statement**: When the app is backgrounded or device is locked, contractors may miss time-sensitive emergency broadcasts and customers may miss arrival alerts.
- **Expected Behavior**: Client registers device push token with `POST /api/notifications/push-token`. Backend triggers native push notifications on job assignment, emergency broadcasts, and arrival.
- **Dependencies**: `expo-notifications`, `expo-device`, backend push service.
- **Implementation Scope**: Push token registration hook, notification handler configuration, and deep-link routing on notification tap.
- **Acceptance Criteria**: Backgrounded app receives system tray notification; tapping notification deep-links to specific job dossier.
- **Test Requirements**: Test on physical iOS and Android hardware using Expo Go / development client.
- **Status**: Todo

---

### TSK-MOB-032: Interactive Map View & Live Technician Geolocation Tracking
- **Title**: Integrate native map view with live GPS coordinates
- **Priority**: P2
- **Relevant Area**: Shared Mobile Architecture (`src/components/LiveTrackingMap.tsx`)
- **Problem Statement**: Customers currently rely on status badges; visual live tracking on a map provides greater reassurance during `on_the_way` status.
- **Expected Behavior**: Embedded native map rendering customer destination marker, technician live location marker, and estimated arrival time (ETA).
- **Dependencies**: `react-native-maps`, `expo-location`, backend location stream via Socket.IO.
- **Implementation Scope**: Native map component integration, location permission handling, socket coordinate listener, and polyline route display.
- **Acceptance Criteria**: Technician location updates smoothly on customer map during `on_the_way` state; permissions gracefully degrade if denied.
- **Test Requirements**: Physical device testing with simulated GPS route playback.
- **Status**: Todo

---

### TSK-MOB-033: Offline Local Cache & Optimistic Mutation Sync
- **Title**: Build resilient local database caching for intermittent Indian mobile networks
- **Priority**: P2
- **Relevant Area**: Shared Mobile Architecture (`src/storage/offlineCache.ts`)
- **Problem Statement**: Subways, basements, and rural service areas often have spotty 4G/5G, causing empty screen states when browsing jobs or booking histories.
- **Expected Behavior**: Category lists, active bookings, and profile data are cached locally via `AsyncStorage` or SQLite. App renders cached records immediately while fetching live updates in the background.
- **Dependencies**: `@react-native-async-storage/async-storage` or `expo-sqlite`.
- **Implementation Scope**: Stale-while-revalidate caching layer, offline indicator banner, and queued action sync on network reconnect.
- **Acceptance Criteria**: App displays previously loaded bookings and categories in airplane mode; automatically synchronizes when network is restored.
- **Test Requirements**: Test app launch and navigation in offline mode.
- **Status**: Todo

---

### TSK-MOB-034: Biometric Authentication (FaceID / Fingerprint) Login
- **Title**: Add biometric authentication for fast contractor re-authentication
- **Priority**: P2
- **Relevant Area**: Shared Mobile Architecture (`src/services/biometrics.ts`)
- **Problem Statement**: Service professionals in the field need quick access to active jobs without repeatedly typing alphanumeric passwords.
- **Expected Behavior**: If device supports biometrics (FaceID / TouchID / Android Biometric Prompt), app offers biometric sign-in to unlock stored credentials.
- **Dependencies**: `expo-local-authentication`.
- **Implementation Scope**: Biometric hardware check, biometric prompt launcher, and secure keychain unlock.
- **Acceptance Criteria**: Successful fingerprint/face scan authenticates user immediately; failed scan falls back to password.
- **Test Requirements**: Test on biometric-enabled physical hardware.
- **Status**: Todo

---

## 📌 Phase 6: Future Scale, Multilingual & Diagnostics (P3)

### TSK-MOB-035: Multilingual Localization (Hindi, Hinglish & Regional Languages)
- **Title**: Implement i18n localization for Indian vernacular service professionals
- **Priority**: P3
- **Relevant Area**: Shared Mobile Architecture (`src/i18n/`)
- **Problem Statement**: Many skilled blue-collar service professionals in Tier 2/3 Indian cities prefer Hindi or regional languages over English.
- **Expected Behavior**: Language selector in Profile allowing instant toggle between English, Hindi (हिंदी), and Hinglish. UI strings adapt dynamically without app restart.
- **Dependencies**: `i18next`, `react-i18next`.
- **Implementation Scope**: Translation JSON bundles, translation hook integration across all screens, and persistent language preference in `SecureStore`.
- **Acceptance Criteria**: All headings, buttons, and status badges translate accurately into selected language; RTL/LTR layout preservation.
- **Test Requirements**: Verify language toggle updates all visible text nodes across customer and vendor apps.
- **Status**: Todo

---

### TSK-MOB-036: In-App Video Calling & Remote Pre-Service Diagnostic Consultations
- **Title**: Integrate WebRTC / Agora video calling for remote diagnosis
- **Priority**: P3
- **Relevant Area**: Shared Mobile Architecture (`src/screens/VideoConsultScreen.tsx`)
- **Problem Statement**: Certain appliance or plumbing repairs can be assessed remotely before dispatching a physical technician, saving travel time and clarifying required replacement parts.
- **Expected Behavior**: Customer and contractor can initiate a secure in-app video consultation to inspect breakdown symptoms prior to physical visit.
- **Dependencies**: Agora RTC SDK or WebRTC native module, backend room token generator.
- **Implementation Scope**: Video call screen, camera/mic controls, call invitation socket signaling, and diagnostic notes capture.
- **Acceptance Criteria**: Two-way encrypted video and audio connection established between customer and assigned pro.
- **Test Requirements**: Test two-device video session latency and media permissions.
- **Status**: Todo

---

### TSK-MOB-037: Voice-Activated Service Search & Regional Audio Prompts
- **Title**: Build voice search in Hindi and English for customer accessibility
- **Priority**: P3
- **Relevant Area**: Customer Mobile App (`src/components/VoiceSearchBar.tsx`)
- **Problem Statement**: Voice search significantly reduces friction for elderly or non-tech-savvy customers requesting home repairs.
- **Expected Behavior**: Microphone button in search bar captures voice input (e.g., "Bijli mistri chahiye" or "AC servicing"), converts speech to text, and navigates to the matching category.
- **Dependencies**: `expo-speech` or Google Speech-to-Text API.
- **Implementation Scope**: Voice recording modal, audio transcription client, and keyword-to-category matching algorithm.
- **Acceptance Criteria**: Voice input correctly identifies canonical category and auto-filters explore results.
- **Test Requirements**: Test speech transcription accuracy with common Hindi and English home repair terms.
- **Status**: Todo

---

### TSK-MOB-038: Full Production Data Parity, Shared Backend & Play Store Readiness
- **Title**: Synchronize Customer and Vendor Mobile Apps with shared MongoDB database & Web platform
- **Priority**: P0
- **Relevant Area**: Full-Stack Parity & Production Readiness
- **Problem Statement**: Customer and Vendor mobile apps experienced data isolation due to route mismatches (`/jobs/my-jobs`, `/jobs/open`, `/bookings/my-bookings` RBAC restrictions, location regex splitting), hardcoded pro fallback arrays, and localhost production URLs.
- **Expected Behavior**: Customer and Vendor apps display the exact same 42 real jobs, 30 service categories, 8 approved verified professionals, published services, and booking lifecycles as the Web platform without modifying `frontend/`.
- **Implementation Scope**:
  1. Backend routes (`job.routes.js`, `booking.routes.js`) updated with backward-compatible aliases (`/open`, `/my-jobs`, dual-role `/my-bookings`, `/complete-signoff`).
  2. Location regex in `vendor.controller.js` enhanced to handle multi-part locality strings (`"Lucknow, Gomti Nagar"`).
  3. `createDirectBooking` updated to accept either `VendorProfile._id` or `User._id`.
  4. Hardcoded fallback arrays removed from Customer `HomeScreen.tsx`; real published services and verified professionals bound to live database records.
  5. `MyJobsScreen.tsx` updated to support all lifecycle statuses and job request orders.
  6. Environment configurations updated in both mobile apps to ensure production builds never use localhost URLs.
- **Acceptance Criteria**: 100% data parity between Web and Mobile; TypeScript checks (`npx tsc --noEmit`) pass with 0 errors; full 19-assertion E2E test suite passes cleanly.
- **Test Requirements**: Automated multi-platform lifecycle E2E test suite passing with 0 failures.
- **Status**: Done

---

### TSK-MOB-039: Fix WorkLogy Mobile App Splash Screen — Single Logo, Correct Branding & Smooth Startup
- **Title**: Unified WorkLogy Splash Screen with Smooth Fade-In/Scale-Up Animation & Eliminated Duplicate Branding
- **Priority**: P0
- **Relevant Area**: Mobile Branding & App Startup Lifecycle
- **Problem Statement**:
  1. A duplicate splash screen was observed on Android: Screen 1 displayed an old green square icon with a white "W" and "WorkLogy Pro", along with Expo Go development banners ("Loading from 10.211.183.171:8082...", "New update available, downloading..."). Screen 2 displayed the blue-and-green icon by itself at a smaller scale.
  2. The root cause was that `app.json`'s `icon` (`./src/assets/icon.png`), `adaptive-icon.png`, and `favicon.png` still retained the legacy green "W" asset and `"WorkLogy Pro"` name, which Expo Go uses when bootstrapping its container before transferring the bundle.
  3. The React Native splash component also lacked the prominent scale, the brand name "WorkLogy", the tagline "Trusted Local Services", and the subtle entrance/exit animation.
- **Expected Behavior**: Single consistent WorkLogy identity throughout startup. Native splash and animated React Native splash view share the exact same `#FFFFFF` background, centered prominent logo, "WorkLogy" brand name, and "Trusted Local Services" tagline. Subtle fade-in and scale-up entrance animation plays for 1.4s, session restoration completes in parallel, and the splash smoothly fades out over 250ms to reveal the already-rendered initial screen.
- **Implementation Scope**:
  1. Replaced `icon.png`, `adaptive-icon.png` (with Android safe zone padding), and `favicon.png` with official WorkLogy logo assets.
  2. Generated high-resolution 1242x2436 `splash.png` with `#FFFFFF` background, prominent centered WorkLogy logo, "WorkLogy" title, and "Trusted Local Services" tagline.
  3. Updated `app.json` in both apps to unified `"name": "WorkLogy"`, `splash.backgroundColor: "#FFFFFF"`, and `adaptiveIcon.backgroundColor: "#FFFFFF"`.
  4. Built animated `WorklogySplashScreen.tsx` component with `Animated` API (subtle logo scale from 0.92 to 1.0, logo fade-in, text slide-up & fade-in, 1.4s minimum display time, and 250ms smooth fade-out).
  5. Mounted `WorklogySplashScreen` as an absolute overlay (`...StyleSheet.absoluteFill, zIndex: 99999`) in both navigators so the destination screen renders underneath and appears seamlessly without flashes or route jumping.
- **Acceptance Criteria**: Single brand identity; no legacy green "W" icon; "WorkLogy" brand name and "Trusted Local Services" tagline present; smooth animated transition; existing auth flows preserved; TypeScript and Android Metro production bundles passing with 0 errors.
- **Test Requirements**: Automated script verification of assets and configuration, TypeScript check (`npx tsc --noEmit`), and Android release export bundling (`npx expo export --platform android`).
- **Status**: Done

---

### TSK-MOB-041: Single Authoritative Native Splash Screen & Elimination of Secondary JS Splash
- **Title**: Permanently eliminate duplicate JavaScript splash screen and establish single native splash startup
- **Priority**: P0
- **Relevant Area**: Mobile Startup Flow & Native Splash Lifecycle
- **Problem Statement**:
  1. The app had a duplicate splash screen experience: an initial native launch screen was followed by a custom JavaScript animated screen (`WorklogySplashScreen.tsx`) with an artificial 1.4-second timer.
  2. The custom React component caused an unwanted second branded screen to display before revealing the app.
  3. Development loading messages (`Loading from 10.211.183.171:8082...`, `New update available, downloading...`) appeared during Expo Go bundle download over LAN.
- **Expected Behavior**: Single authoritative native splash screen. On launch, Android OS / Expo native splash displays `splash.png` (official WorkLogy logo, "WorkLogy" title, and "Trusted Local Services" on `#FFFFFF`). `SplashScreen.preventAutoHideAsync()` holds this native splash while background session restore runs. Once authentication state is determined (`isLoading === false`), `SplashScreen.hideAsync()` is invoked directly to transition straight into the destination screen (`VendorHomeTab` or `VendorLogin`) with zero intermediate screens, zero duplicate logos, and zero arbitrary delays.
- **Implementation Scope**:
  1. Removed custom JavaScript `WorklogySplashScreen.tsx` component from `VendorNavigator.tsx` and `CustomerNavigator.tsx`.
  2. Replaced duplicate splash timer with direct lifecycle synchronization: native splash is held via `SplashScreen.preventAutoHideAsync()` during `restoreSession()` and dismissed via `SplashScreen.hideAsync()` the moment session restoration resolves.
  3. Configured `app.json` with explicit `android.splash` and `expo-splash-screen` native plugin options matching `#FFFFFF` background.
  4. Verified native Android prebuild artifacts (`Theme.App.SplashScreen`, `values/colors.xml`, `values/styles.xml`, `drawable/splashscreen_logo.png`).
- **Acceptance Criteria**: Single native splash screen on startup; no secondary JS splash screen; existing authentication and session restoration preserved; TypeScript and Android production bundle exports pass with 0 errors.
- **Status**: Done

---

### TSK-MOB-042: Expo Go Client Cache Invalidation & Isolated Asset Key Manifest Configuration
- **Title**: Force cache invalidation of obsolete green "W" icon in Expo Go client via isolated asset key manifests
- **Priority**: P0
- **Relevant Area**: Expo Go Bundling, Asset Serving & Cache Invalidation
- **Problem Statement**:
  1. In the Expo Go development client on Android, the bundle download screen (`Loading from 10.211.183.171:8082...`, `New update available, downloading...`) cached the obsolete green "W" icon from an earlier session in the device's internal OkHttp/Glide disk cache.
  2. Even after replacing `icon.png` and updating `app.json` name to "WorkLogy", Expo Go displayed the updated name "WorkLogy" but continued reading the old cached bitmap keyed to the identical URL path (`./src/assets/icon.png`).
- **Expected Behavior**: Expo Go client requests a fresh, un-cached icon URL from the Metro bundler; production standalone builds (`npx expo export`) bundle clean 1024x1024 WorkLogy assets with zero references to obsolete files.
- **Implementation Scope**:
  1. Created isolated asset filenames: `worklogy-app-icon.png`, `worklogy-adaptive-icon.png`, and `worklogy-splash.png` in both `customer-app` and `vendor-app`.
  2. Updated `app.json` `expo.icon`, `expo.android.adaptiveIcon.foregroundImage`, `expo.splash.image`, and `expo-notifications` icon paths in both apps to reference the new versioned filenames.
  3. Verified Metro manifest outputs `iconUrl` pointing to `worklogy-app-icon.png`.
  4. Documented clear instructions for clearing Expo Go's local Android disk cache.
- **Acceptance Criteria**: Metro manifests on ports 8081 and 8082 emit fresh `worklogy-app-icon.png` URLs; standalone production export succeeds cleanly; TypeScript passes with 0 errors.
- **Status**: Done

---

### TSK-MOB-043: Elimination of Nested Double-Box Logo Containers & Large Prominent Artwork Alignment
- **Title**: Remove duplicate rounded-square containers and scale single approved WorkLogy artwork to match outer container dimensions
- **Priority**: P0
- **Relevant Area**: Splash Screen Asset Processing & Mobile Brand Architecture
- **Problem Statement**:
  1. The splash/loading screen displayed two nested rounded-square containers: an outer container rendered by the Android launcher/Expo Go card view, and an inner container with drop shadow caused by embedding a padded master card inside the icon and splash assets.
  2. The blue-and-green service-professional logo was visually undersized within the inner container rather than filling the area.
- **Expected Behavior**: Single WorkLogy logo displayed on clean white `#FFFFFF` background. The approved blue-and-green artwork fills the container at the prominent visual scale of the outer container. No redundant inner/outer container nesting, no card shadow artifact, and clean centered "WorkLogy" and "Trusted Local Services" text.
- **Implementation Scope**:
  1. Extracted pixel-pure blue-and-green logo artwork (house, worker, wrench) from master asset, eliminating the white rounded card border and drop shadow.
  2. Generated 1024x1024 `worklogy-app-icon-v2.png` with the clean logo scaled to 860px (84% fill) directly on `#FFFFFF`.
  3. Generated 1024x1024 `worklogy-adaptive-icon-v2.png` with the clean logo scaled to 680px within the Android adaptive icon safe zone.
  4. Generated 1242x2436 `worklogy-splash-v2.png` featuring the prominent 640x609px logo, bold "WorkLogy" navy title (`#0F172A`, 86px), and muted slate tagline (`#64748B`, 44px) centered with balanced optical spacing.
  5. Updated `app.json` in both apps with `-v2` filenames for immediate device cache invalidation.
- **Acceptance Criteria**: Single large logo visible without nested squircle borders; visual size matches outer container; `WorkLogy` and `Trusted Local Services` properly aligned; TypeScript and Android production bundle exports pass with 0 errors.
- **Status**: Done

---

### TSK-MOB-044: Final Professional Marketplace Splash Screen & Value Proposition Typography
- **Title**: Production-ready balanced WorkLogy Pro splash screen with value propositions, trust indicators, and smooth lifecycle fade
- **Priority**: P0
- **Relevant Area**: Mobile Branding & App Launch Lifecycle
- **Problem Statement**:
  1. The splash screen displayed a single logo and app title in a vast empty white space, lacking marketing polish, brand value communication, and marketplace identity.
- **Expected Behavior**: Balanced, modern, professional launch screen featuring:
  - Approved blue-and-green WorkLogy handyman/house logo.
  - Heading: **WorkLogy Pro** in bold dark navy `#0F172A`.
  - Tagline: **Your Skills. More Opportunities.** in WorkLogy green `#059669`.
  - Supporting message: "Connect with local customers. Grow your business." in slate `#475569`.
  - Subtle trust/value points with micro-icons: "Trusted Professionals" and "Local Jobs. Real Opportunities.".
  - Clean white `#FFFFFF` canvas with balanced vertical spacing and status-bar inset respect.
  - Zero artificial delay; immediate 220ms smooth fade into destination screen once session restoration resolves.
- **Implementation Scope**:
  1. Generated 1242x2436 native splash bitmap `worklogy-splash-v3.png` with full typography, vector shield and briefcase trust icons, and pure white background.
  2. Rebuilt `WorklogySplashScreen.tsx` React Native component with `@expo/vector-icons` Ionicons (`shield-checkmark`, `briefcase`), matching typography, and immediate dismissal on `isReady`.
  3. Integrated `WorklogySplashScreen` seamlessly into `VendorNavigator.tsx`, replacing the plain placeholder with an overlay that dissolves directly into `VendorHomeTab` or `VendorLogin`.
  4. Updated `mobile/vendor-app/app.json` `splash.image` to `worklogy-splash-v3.png`.
- **Acceptance Criteria**: Single approved WorkLogy logo; brand name "WorkLogy Pro"; tagline "Your Skills. More Opportunities."; supporting message and trust indicators correctly rendered and vertically balanced; zero artificial delay; clean TypeScript and Android release bundle export.
- **Status**: Done

---

### TSK-MOB-045: Elimination of Dual Consecutive Splash Screens & Unified Single Startup Lifecycle
- **Title**: Permanently eliminate Screen 1 (logo-only with "WorkLogy") and establish single authoritative Screen 2 startup experience
- **Priority**: P0
- **Relevant Area**: App Startup Architecture & Expo Splash Lifecycle
- **Problem Statement**:
  1. On cold launch, two different splash screens were observed consecutively: Screen 1 displaying a large logo with only "WorkLogy", followed by Screen 2 displaying "WorkLogy Pro", tagline, supporting text, and trust indicators.
- **Expected Behavior**: Only ONE single consistent splash screen matching Screen 2. Screen 1 must never appear.
  - Native splash: Plain white `#FFFFFF` background with the approved WorkLogy logo centered at matching coordinates. Zero text.
  - In-app branded splash: Displays the complete Screen 2 design (logo, "WorkLogy Pro", "Your Skills. More Opportunities.", "Connect with local customers. Grow your business.", and trust points).
  - Transition: Seamless handoff from native splash logo into the in-app branded splash, dissolving smoothly (220ms) into the resolved screen with zero artificial delays.
- **Implementation Scope**:
  1. Generated `native-splash.png` (plain `#FFFFFF` background with approved WorkLogy logo centered at identical vertical offset `y ≈ 36%`, no text).
  2. Configured `app.json` `splash.image` and `android.splash.image` to `native-splash.png`.
  3. Updated `app.json` `name` to `"WorkLogy Pro"`.
  4. Rebuilt `WorklogySplashScreen.tsx` to mount seamlessly over the native splash, hide native splash on mount, and fade out immediately when `isReady` (`!isLoading`) resolves.
  5. Verified Android production release export and TypeScript checks with 0 errors.
- **Acceptance Criteria**: Zero occurrences of Screen 1; only Screen 2 displays with full branding; smooth 220ms fade into destination; production build passes cleanly.
- **Status**: Done

---

### TSK-MOB-046: Customer App Production Audit & Profile Screen Clean-up
- **Title**: Remove Backend Server Environment row and modal from Customer Profile while ensuring complete production readiness
- **Priority**: P0
- **Relevant Area**: Customer Profile, Account & Security Architecture
- **Problem Statement**:
  1. The Customer Profile displayed an internal development/failover row: "Backend Server Environment", "Auto (Local with VPS Failover)" with a server switcher modal.
  2. Customers should never see internal server configurations or VPS failover options in a consumer marketplace.
  3. The entire Customer Profile needed a comprehensive end-to-end verification (addresses, notification permissions, sound toggle, password update, support tickets, role switcher, logout) without touching or causing regressions to the finalized Vendor App.
- **Expected Behavior**:
  - Customer Profile "Preferences & Account" card cleanly presents consumer rows: Alerts & Notifications, Device Push Notifications, Push Notification Sound, and Account Security & Password.
  - No internal server row, status badge, or switcher modal in customer UI.
  - Sub-loaders (`loadInitialData`, addresses, stats, tickets) guarded against unauthenticated execution.
  - Address selection integrity maintained (GPS never silently overwrites explicit saved address).
  - Background server failover and multi-host ping client remain intact under the hood.
  - Vendor App strictly untouched.
- **Implementation Scope**:
  1. Removed `showServerModal`, server pinging states, and server switcher methods from `mobile/customer-app/src/screens/ProfileScreen.tsx`.
  2. Removed the "Backend Server Environment" `TouchableOpacity` block from the Preferences card.
  3. Removed Modal 8 (Server Switcher Modal) and associated unused server stylesheet rules.
  4. Preserved underlying API client failover architecture in `mobile/customer-app/src/api/client.ts` and `src/config/index.ts`.
  5. Verified all Customer Profile integrations: address management, notification permissions (Android 33+), push sound persistence, password update (`PUT /api/auth/updatepassword`), support ticket creation (`POST /api/support`), role switching (`switchRole('vendor')`), and secure logout.
  6. Verified Vendor App files remain completely untouched.
  7. Tested clean compilation with `tsc --noEmit` and production Android bundle export with `expo export --platform android`.
- **Acceptance Criteria**: Zero internal server UI visible to customers; uniform card borders and dividers; robust address and auth workflows; clean builds; vendor app untouched.
- **Status**: Done

---

### TSK-MOB-047: Easy Job Posting, Address Persistence & Verified Reviews Production Fix
- **Title**: Streamline job posting flow, enable seamless address persistence from jobs/profile, and resolve verified reviews booking validation error
- **Priority**: P0
- **Relevant Area**: Customer Service Booking, Address Management & Verified Reviews Lifecycle
- **Problem Statement**:
  1. The Request Service form was overly complex and technical for customers, lacking search over the 30 canonical service categories and quick task suggestion chips.
  2. Addresses from completed bookings were not saved to customer profile, requiring customers to repeatedly re-enter their address.
  3. Attempting to submit a review from completed jobs or vendor profile failed with `"Booking reference is required to submit a verified review. No unreviewed completed booking was found with this professional."` because the client sent `{ booking: bookingId }` while the backend controller expected `req.body.bookingId` or `req.params.bookingId`, and lacked fallback resolution by `job` ID or `vendorId`.
- **Expected Behavior**:
  1. **7-Step Streamlined Job Posting Flow (`CreateJobScreen.tsx`)**:
     - Searchable category picker covering all 30 canonical categories (`api.categories.getAll()`) with instant task/subcategory chips.
     - Service needed title (click-to-fill chips) + clear description + optional photo attachments (< 5MB).
     - Standard Schedule vs Urgent (Today / ASAP) selection.
     - Get Quotes (Compare Bids) vs Fixed Budget (₹) selection.
     - Address form with saved address chips, GPS auto-detect, and destination summary box.
     - "Save this address for future bookings" checkbox with label selection (`Home` | `Work` | `Other`).
     - Compact review summary card + primary "Post Service Request" with in-flight guard, backend address saving, and navigation to `JobDetailScreen`.
  2. **Authoritative Address Persistence**:
     - Backend `addAddress` upserts `CustomerProfile` if not present, normalizes input strings, prevents duplicate address entries, and manages `isDefault` flags.
     - Mounted `/api/customer/addresses` and `/api/users/customer/addresses` routes.
     - Direct "Save Address to Profile" button on `JobDetailScreen` allows saving completed service location to profile.
  3. **Verified Reviews End-to-End Fix**:
     - Backend `createReview` accepts `bookingId || req.body.bookingId || req.body.booking`, resolves bookings by `job` ID or `bookingReference`, and falls back to completed customer bookings for `vendorId`.
     - Marks `Job.hasReview = true` upon review creation.
     - Client `ReviewModalScreen` pre-checks booking eligibility (`checkEligibility`), handles star ratings (1-5) with qualitative descriptions, and submits both `bookingId` and `booking`.
  4. **Strict Isolation**: `mobile/vendor-app/` remains 100% untouched.
- **Implementation Scope**:
  1. Updated backend controllers: [`backend/src/controllers/user.controller.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/controllers/user.controller.js), [`backend/src/controllers/review.controller.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/controllers/review.controller.js).
  2. Updated backend routes: [`backend/src/routes/user.routes.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/routes/user.routes.js), [`backend/src/routes/customer.routes.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/routes/customer.routes.js).
  3. Updated customer app API client: [`mobile/customer-app/src/api/client.ts`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/api/client.ts).
  4. Rebuilt [`mobile/customer-app/src/screens/CreateJobScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/CreateJobScreen.tsx).
  5. Enhanced [`mobile/customer-app/src/screens/ReviewModalScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/ReviewModalScreen.tsx).
  6. Enhanced [`mobile/customer-app/src/screens/JobDetailScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/JobDetailScreen.tsx).
  7. Enhanced [`mobile/customer-app/src/screens/MyJobsScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/MyJobsScreen.tsx).
  8. Verified TypeScript compilation and Android release bundle export with 0 errors.
- **Acceptance Criteria**: Seamless 7-step job posting; automatic address profile persistence; review submission succeeds; zero vendor-app changes; clean builds.
- **Status**: Done

---

### TSK-MOB-048: Verified Review Published Lifecycle, Done Navigation & Discard Popup Elimination
- **Title**: Implement explicit 4-state review form lifecycle, eliminate discard confirmation loop on published reviews, and fix Done / View on Profile navigation
- **Priority**: P0
- **Relevant Area**: Customer Verified Reviews Lifecycle & Modal Navigation
- **Problem Statement**:
  1. After publishing a review, tapping "Done" on the "Review Published!" success dialog failed to leave the screen or triggered the "Discard Review?" prompt because the navigation handler saw unsubmitted text (`comment.length > 0`) and lacked a published state flag.
  2. Tapping "View on Profile" returned to the review modal upon clicking Back, instead of returning to the completed booking dossier.
  3. Network failures or racing submissions could trigger duplicate reviews or leave the customer in an inconsistent state.
- **Expected Behavior**:
  1. **Explicit 4-State Lifecycle Machine**:
     - `editing`: Unsaved draft changes trigger "Discard Review?" on back press/cancel.
     - `submitting`: In-flight submission guards prevent accidental repeated taps or navigation.
     - `published`: Once the backend confirms review creation (or reconciles a duplicate), discard confirmation is permanently disabled.
     - `closing`: Concurrency guard prevents duplicate navigation actions.
  2. **Done Navigation**:
     - Tapping "Done" closes the success dialog and immediately pops the review screen (`navigation.goBack(true)`).
     - Dispatches `BOOKINGS_CHANGED`, `REVIEWS_CHANGED`, and `PROFILE_CHANGED` sync events.
     - Never displays "Discard Review?".
  3. **View on Profile Navigation**:
     - Tapping "View on Profile" replaces `ReviewModal` with `ProfessionalProfile` (`navigation.replace('ProfessionalProfile', { vendorId })`).
     - Pressing Back from the professional's profile returns to the completed booking or bookings list, never back to the review form.
  4. **Duplicate Protection & Reconciliation**:
     - UI disables the submit button during in-flight requests.
     - Backend reconciles duplicate review submissions (409 `REVIEW_ALREADY_EXISTS`), setting `booking.hasReview = true` and `Job.hasReview = true`.
     - Transient network errors preserve entered rating and comment so user never loses their text.
  5. **Strict Isolation**: `mobile/vendor-app/` remains 100% untouched.
- **Implementation Scope**:
  1. Updated [`backend/src/controllers/review.controller.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/controllers/review.controller.js) with duplicate review reconciliation and model sync.
  2. Overhauled [`mobile/customer-app/src/screens/ReviewModalScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/ReviewModalScreen.tsx) with explicit lifecycle states (`editing`, `submitting`, `published`, `closing`), single-exit execution, and non-blocking back handler.
  3. Updated [`mobile/customer-app/src/screens/JobDetailScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/JobDetailScreen.tsx) and [`mobile/customer-app/src/screens/MyJobsScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/MyJobsScreen.tsx) to listen for `hasReview` payloads and update UI instantly.
  4. Added `REVIEWS_CHANGED` to [`mobile/customer-app/src/services/dataSyncService.ts`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/services/dataSyncService.ts).
  5. Added `review?: any;` to `Booking` interface in [`mobile/customer-app/src/types/index.ts`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/types/index.ts).
  6. Verified TypeScript compilation and Android release bundle export with 0 errors.
- **Acceptance Criteria**: "Done" cleanly finishes and leaves the review screen; "Discard Review?" never appears after publishing; "View on Profile" replaces review screen; Vendor App untouched.
- **Status**: Done

---

### TSK-MOB-049: Customer App Home Header Official WorkLogy Logo Integration
- **Title**: Replace legacy home icon emblem with transparent official WorkLogy logo in Customer Home header
- **Priority**: P1
- **Relevant Area**: Customer App Branding & Header UI (`HomeScreen.tsx`)
- **Problem Statement**:
  1. The Customer App Home screen displayed a generic blue square with a home icon and a dot next to the "WorkLogy" text.
  2. The header lacked the official WorkLogy branding (blue-and-green house, technician, and wrench).
- **Expected Behavior**:
  1. Replace the generic home emblem with the official WorkLogy logo asset.
  2. Maintain authentic aspect ratio, true RGBA transparency, and professional vertical alignment with the "WorkLogy" title.
  3. Ensure zero layout shifts or visual clipping; preserve all other Home screen controls, buttons, categories, and carousel.
  4. Vendor App remains strictly untouched.
- **Implementation Scope**:
  1. Sourced and processed the official WorkLogy transparent asset into [`mobile/customer-app/src/assets/worklogybgremove.png`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/assets/worklogybgremove.png).
  2. Updated [`mobile/customer-app/src/screens/HomeScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/HomeScreen.tsx) to import and render `WORKLOGY_HEADER_LOGO` with `width: 42, height: 40, resizeMode: 'contain'`, aligned with `WorkLogy` title text.
  3. Removed obsolete `logoEmblem` and `logoPinDot` elements from `HomeScreen.tsx`.
  4. Verified TypeScript checks (`tsc --noEmit`) and Android Expo production export with 0 errors.
- **Acceptance Criteria**: Official WorkLogy logo cleanly renders immediately before "WorkLogy" with transparency; no white box or checkerboard; home screen controls intact; vendor app untouched.
- **Status**: Done

---

### TSK-MOB-050: Production-Ready Customer Mobile App OTP Authentication & Step-by-Step Onboarding
- **Title**: Implement production-grade mobile OTP sign-in, session persistence, and step-by-step onboarding in Customer App
- **Priority**: P0
- **Relevant Area**: Customer Mobile App Authentication & User Onboarding
- **Problem Statement**:
  1. The Customer Mobile App previously used legacy email/password inputs with a hardcoded demo account, contrary to modern consumer app patterns and mobile number-first workflows.
  2. Customers lacked a frictionless OTP login experience mirroring the finalized Vendor Pro App.
  3. New customer registrations required manual step-by-step profile and address setup without breaking on navigation or app restart.
  4. Backend authentication routes (`/api/auth/otp/send` and `/api/auth/otp/verify`) were coupled to vendors and needed safe generalization without regressing the Vendor App.
- **Expected Behavior**:
  1. **Screen 1 — Welcome / Login**:
     - Official WorkLogy logo branding, heading "Welcome to WorkLogy", and subtitle.
     - India (+91) country code pill and 10-digit mobile number input with inline validation.
     - Primary button "Continue with OTP" with disabled state and loading indicators.
     - Terms of Service and Privacy Policy interactive modals.
     - Zero hardcoded demo credentials or private numbers.
  2. **Screen 2 — Dedicated OTP Verification**:
     - Masked mobile number with "Change number" action returning to edit phone.
     - 6-digit visual OTP boxes with auto-submit upon entering 6 digits.
     - 60-second cooldown countdown and enabled "Resend OTP".
     - Backend timing-safe verification, rate limiting, and replay attack prevention.
     - Dev mode auto-fill banner for instant local development and testing.
  3. **Screen 3 — Customer Profile Setup**:
     - Step 1 of 2 indicator.
     - Full name (required) with validation (min 2 characters).
     - Optional email with format validation.
     - Optional profile photo picker using `expo-image-picker` with Cloudinary/local upload.
     - "Continue" and "Skip for now" actions.
  4. **Screen 4 — First Service Address (Optional)**:
     - Step 2 of 2 indicator.
     - GPS auto-detection button ("Use Current Location") with `expo-location` reverse geocoding.
     - Form: House/Flat No., Street, Locality, City, PIN Code, Label (Home/Work/Other pills), default address toggle.
     - "Save & Continue" persists address to MongoDB and marks onboarding complete.
     - "Skip for now" marks onboarding complete and immediately navigates to Customer Home.
  5. **Session Persistence & Resumption**:
     - 90-day server sessions in `Session` model, 15-minute JWT access tokens, and rotating refresh tokens in `secureStorage`.
     - Silent refresh on token expiration; clean session restoration on app restart.
     - Returning customers bypass onboarding and land directly on Customer Home with profile and addresses loaded.
     - Partially onboarded customers resume from their exact incomplete step.
  6. **Strict Isolation & Zero Regression**:
     - `mobile/vendor-app/` strictly untouched.
     - All vendor OTP endpoints remain 100% backward-compatible.
- **Implementation Scope**:
  1. Updated [`backend/src/models/CustomerProfile.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/models/CustomerProfile.js) with `onboardingStep` enum (`profile_pending`, `address_pending`, `completed`).
  2. Generalized [`backend/src/controllers/auth.controller.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/controllers/auth.controller.js) (`sendLoginOtp` and `verifyLoginOtp`) to support both `customer` and `vendor` roles with independent challenge scopes, customer auto-provisioning, session creation, and tokens.
  3. Sanitized email and profile updates in [`backend/src/controllers/user.controller.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/controllers/user.controller.js).
  4. Added `REFRESH_TOKEN` to `STORAGE_KEYS` in [`mobile/customer-app/src/constants/index.ts`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/constants/index.ts).
  5. Updated [`mobile/customer-app/src/api/client.ts`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/api/client.ts) with `sendOtp`, `verifyOtp`, `refreshToken`, `logout`, and `customer.updateProfile`.
  6. Upgraded [`mobile/customer-app/src/context/AuthContext.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/context/AuthContext.tsx) with OTP lifecycle, `onboardingStep` state machine, silent token renewal, and step completion methods.
  7. Replaced [`mobile/customer-app/src/screens/LoginScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/LoginScreen.tsx) with modern Screen 1 Welcome/Login with official logo and OTP request.
  8. Created [`mobile/customer-app/src/screens/OtpVerificationScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/OtpVerificationScreen.tsx) for 6-digit OTP entry and resend.
  9. Created [`mobile/customer-app/src/screens/CustomerOnboardingProfileScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/CustomerOnboardingProfileScreen.tsx) for name, optional email, and photo setup.
  10. Created [`mobile/customer-app/src/screens/CustomerOnboardingAddressScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/CustomerOnboardingAddressScreen.tsx) for GPS auto-detection, address inputs, and label selection.
  11. Updated [`mobile/customer-app/src/navigation/CustomerNavigator.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/navigation/CustomerNavigator.tsx) to register routes, hide bottom tab bar on auth/onboarding screens, and manage session restoration navigation.
  12. Updated [`mobile/customer-app/src/screens/ProfileScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/ProfileScreen.tsx) logout handler to reset to `Login`.
  13. Verified with live API curl tests (new customer creation, invalid OTP, cooldown rate limits, replay protection, profile update, address creation, returning customer login, token rotation, and vendor backward compatibility).
  14. Verified clean TypeScript compilation in both apps and Android production bundle export (`npx expo export --platform android --dev false`).
- **Acceptance Criteria**: Full OTP authentication and step-by-step onboarding works end-to-end; returning customer lands on Home; Vendor App remains 100% functional and untouched.
- **Status**: Done

---

### TSK-MOB-051: Customer App Login UI Polish, Guest Mode Browsing & Mandatory Auth Gates
- **Title**: Production-ready Customer App login UI polish, seamless guest browsing, and mandatory authentication gates for booking and job posting
- **Priority**: P0
- **Relevant Area**: Customer Mobile App Authentication & Guest Flow Gates
- **Problem Statement**:
  1. The Customer App required a production-grade UI polish for its Welcome/Login screen matching top consumer apps: clean spacing, balanced official logo, responsive card layout, interactive terms/privacy modals, and active green CTA states.
  2. First-time users should be able to explore the app as guests without being immediately forced to log in.
  3. All actions involving transactions or customer mutations (posting a job, booking a service/package, hiring a verified professional, or emergency dispatch) must be strictly gated with an authentication challenge.
  4. When an unauthenticated guest attempts a protected action, the user's intended action and form inputs must be safely preserved so they can resume immediately after OTP verification without retyping or duplicate charges.
- **Expected Behavior**:
  1. **Polished Welcome/Login Screen**:
     - Official WorkLogy logo centered at 76x76 with clean spacing.
     - Heading "Welcome to WorkLogy" and subtitle "Book trusted local professionals in just a few steps."
     - Mobile input card with India (+91) country flag and inline 10-digit validation (`/^[6-9]\d{9}$/`).
     - "Continue with OTP" button styled with `#059669` green background upon valid number entry.
     - "Skip for now" pill button with helper text: "Explore services without signing in. Sign-in is required when you book or post a job."
     - Responsive trust badge row: "Verified Experts", "Escrow Protected", "Instant Quotes".
     - Interactive "Terms of Service" and "Privacy Policy" links opening clean bottom-sheet dialogs.
  2. **Guest Mode Browsing**:
     - Tapping "Skip for now" navigates to Customer Home (`HomeTab`) in guest mode without creating a fake session or saving dummy tokens.
     - Guests can freely browse categories, service listings, search professionals, view technician profiles, reviews, and rates.
  3. **Mandatory Authentication Gates**:
     - Protected actions are intercepted via `promptAuthGate({ screen, params, message, title })`:
       - "+ Post Job" tab button in bottom navigation bar.
       - "Submit Service Request" in `CreateJobScreen`.
       - "Book Now" / direct booking in `ProfessionalProfileScreen`.
       - Package direct booking and custom job post in `CategoryDetailScreen`.
       - "Book Plumber", "Book now", and "Post a Job Now" banners on `HomeScreen`.
       - Emergency broadcast in `EmergencyScreen`.
     - Displays an elegant `<AuthGateModal />` bottom sheet explaining why authentication is needed.
     - Tapping "Continue with OTP" navigates to `LoginScreen` with target action stored in `pendingAction`.
  4. **Seamless Action Resumption**:
     - Upon successful OTP verification (and onboarding address confirmation/skip), the app checks `pendingAction`.
     - If a pending action exists, it resumes navigation to the exact screen with pre-filled parameters.
     - `CreateJobScreen` pre-fills in-progress category, title, description, address, budget, and urgency from state params.
     - Never automatically executes charges or irreversible actions without explicit customer review.
  5. **Strict Security & Zero Vendor App Regression**:
     - Server-side RBAC endpoints strictly enforce authentication on `/api/jobs`, `/api/bookings/direct`, and customer mutation routes.
     - `mobile/vendor-app/` remains 100% untouched.
- **Implementation Scope**:
  1. Enhanced [`mobile/customer-app/src/context/AuthContext.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/context/AuthContext.tsx) with `isGuest`, `pendingAction`, `setPendingAction`, `clearPendingAction`, `authGateModal`, `promptAuthGate`, and `closeAuthGate`.
  2. Created [`mobile/customer-app/src/components/AuthGateModal.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/components/AuthGateModal.tsx) with shield icon, trust pills, "Continue with OTP", and "Maybe later".
  3. Polished [`mobile/customer-app/src/screens/LoginScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/LoginScreen.tsx) with responsive layout, dynamic button state, guest pill, trust row, and Terms & Privacy modals.
  4. Updated [`mobile/customer-app/src/screens/OtpVerificationScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/OtpVerificationScreen.tsx) and [`mobile/customer-app/src/screens/CustomerOnboardingAddressScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/CustomerOnboardingAddressScreen.tsx) to resume `pendingAction` upon completion.
  5. Updated [`mobile/customer-app/src/navigation/CustomerNavigator.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/navigation/CustomerNavigator.tsx) to mount `<AuthGateModal />` and gate the center "+ Post Job" tab for guests.
  6. Updated [`mobile/customer-app/src/screens/HomeScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/HomeScreen.tsx), [`mobile/customer-app/src/screens/CreateJobScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/CreateJobScreen.tsx), [`mobile/customer-app/src/screens/ProfessionalProfileScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/ProfessionalProfileScreen.tsx), [`mobile/customer-app/src/screens/CategoryDetailScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/CategoryDetailScreen.tsx), and [`mobile/customer-app/src/screens/EmergencyScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/EmergencyScreen.tsx) with authentication gates.
  7. Verified TypeScript checks in both mobile apps (`tsc --noEmit`) with 0 errors.
  8. Verified Android bundle compilation (`npx expo export --platform android --dev false`).
- **Acceptance Criteria**: Login UI is polished with guest option and terms/privacy; guests can browse services and profiles; booking and job posting prompt authentication; pending actions resume post-login; Vendor App completely untouched.
- **Status**: Done

---

### TSK-MOB-052: MSG91 SMS OTP Production Integration & Zero-Mock Enforcement
- **Title**: Production-grade MSG91 SMS OTP delivery, server-side verification, zero-mock enforcement, and session provisioning for WorkLogy Customer App
- **Priority**: P0
- **Relevant Area**: Customer Mobile Authentication & Provider SMS Gateway Integration
- **Problem Statement**:
  1. The Customer App previously had dev-mode OTP autofill banners, client-visible `debugCode` responses, and local mock OTP generation paths.
  2. Production requirements mandate real SMS OTP delivery via MSG91's official SMS service under Indian DLT regulations.
  3. Client-side security requires that sensitive secrets (MSG91 AuthKey, DLT templates, JWT signing keys) must NEVER exist on the mobile client.
  4. The solution must support both official MSG91 OTP API (REST) and MSG91 OTP Widget token validation while maintaining zero native breaking dependencies on Expo SDK 57 and zero regressions to the finalized Vendor App.
- **Expected Behavior**:
  1. **Strict Zero-Mock Enforcement**:
     - Removed all `debugCode` parameters, mock banners, and fake local success paths from the Customer App.
     - Customer mobile requests cannot succeed unless real SMS dispatch is confirmed by MSG91.
     - Unconfigured MSG91 returns HTTP 503 `SMS_SERVICE_UNCONFIGURED` without mock fallback.
  2. **Official MSG91 Integration**:
     - Real OTP dispatch via MSG91 v5 OTP API (`POST https://control.msg91.com/api/v5/otp?template_id=...&mobile=91...`).
     - Real OTP verification via MSG91 server verification API (`GET https://control.msg91.com/api/v5/otp/verify?otp=...&mobile=91...`).
     - Real OTP retry via MSG91 retry API (`GET https://control.msg91.com/api/v5/otp/retry?authkey=...&retrytype=text&mobile=91...`).
     - Server-side MSG91 OTP Widget token validation (`POST /api/auth/otp/verify-widget`) calling MSG91's `verifyAccessToken`.
  3. **WorkLogy Authenticated Session**:
     - Verified customer mobile numbers provision a 90-day server `Session` in MongoDB.
     - Issues finite 15-minute JWT access tokens and rotating refresh tokens stored securely in `expo-secure-store`.
  4. **Mobile Native SMS Autofill**:
     - `OtpVerificationScreen` implements `autoComplete="sms-otp"` and `textContentType="oneTimeCode"` on the hidden input for native Android SMS autofill.
  5. **Vendor App Preservation**:
     - `mobile/vendor-app/` remains 100% untouched and fully backward-compatible.
- **Implementation Scope**:
  1. Created [`backend/src/services/msg91.service.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/services/msg91.service.js) handling `sendOtp`, `verifyOtp`, `retryOtp`, and `verifyAccessToken`.
  2. Updated [`backend/src/models/OtpChallenge.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/models/OtpChallenge.js) with `provider` and `reqId` fields, and cleaned duplicate schema index.
  3. Updated [`backend/src/models/Session.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/models/Session.js) cleaned duplicate schema index.
  4. Updated [`backend/src/utils/sms.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/utils/sms.js) with MSG91 official provider integration and stripped debug codes from customer flow.
  5. Updated [`backend/src/controllers/auth.controller.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/controllers/auth.controller.js) with MSG91 dispatch, remote verification, and `verifyWidgetAccessToken`.
  6. Registered `POST /api/auth/otp/verify-widget` in [`backend/src/routes/auth.routes.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/routes/auth.routes.js).
  7. Updated [`backend/.env.example`](file:///Users/shaheaalam/Desktop/worklogy/backend/.env.example) and [`backend/.env`](file:///Users/shaheaalam/Desktop/worklogy/backend/.env) with MSG91 configuration keys.
  8. Cleaned [`mobile/customer-app/src/screens/LoginScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/LoginScreen.tsx) and [`mobile/customer-app/src/screens/OtpVerificationScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/OtpVerificationScreen.tsx) of `debugCode` and mock UI banners.
  9. Added `autoComplete="sms-otp"` and `textContentType="oneTimeCode"` to OTP input in [`mobile/customer-app/src/screens/OtpVerificationScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/OtpVerificationScreen.tsx).
  10. Updated [`mobile/customer-app/src/context/AuthContext.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/context/AuthContext.tsx) and [`mobile/customer-app/src/api/client.ts`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/api/client.ts).
  11. Verified with integration test suite (6/6 tests passing) and live MSG91 API checks.
  12. Verified clean TypeScript compilation in both apps (`tsc --noEmit`) and Expo Android production bundle export (`npx expo export --platform android --dev false`).
- **Acceptance Criteria**: MSG91 real OTP integration is live on server; zero mock code in production paths; session establishment verified; Vendor App 100% untouched.
- **Status**: Done

---

### TSK-MOB-053: Customer App Keyboard Focus Fix & Vendor App Auth Resilience
- **Title**: Fix Customer App Mobile Number Keyboard Opening & Vendor App Session Warning / Route 404 Resolution
- **Priority**: P0
- **Relevant Area**: Mobile Authentication & UI Touch Reliability
- **Problem Statement**:
  1. On the Customer App Login screen, tapping the mobile number input area failed to open the Android soft keyboard due to an unfocused `View` wrapper without press forwarding, `paddingVertical: 0` collapsing the touch area, and `keyboardType="phone-pad"` lacking `showSoftInputOnFocus`.
  2. On the Vendor App Login screen, users with registered contractor numbers (e.g. `7572076103`) encountered an incorrect error: "No registered contractor account found for this number. Please register as a new partner." whenever the local backend was offline and the request fell back to the VPS which returned HTTP 404 Route Not Found, falsely matching `err?.status === 404`.
  3. A persistent yellow/black dev LogBox banner (`[AuthContext] Session restore note: Invalid or expired...`) displayed across the bottom of the screen due to an unhandled `console.warn` during expired session checks.
- **Expected Behavior**:
  1. Tapping anywhere inside the mobile number input container reliably focuses the `TextInput` and brings up the numeric keyboard.
  2. The input properly supports cursor placement, editing, selection, and deletion with green selection color.
  3. The bottom developer warning banner is suppressed in production screens and expired sessions are cleared cleanly without user alerts.
  4. Vendor login error only displays "No registered contractor account found" when the backend explicitly returns `code === 'NOT_REGISTERED'`, and correctly reports server connection issues when 404 route errors occur.
  5. The backend server explicitly binds to `0.0.0.0:${PORT}` and handles mobile requests from local LAN devices.
- **Implementation Scope**:
  1. Updated [`mobile/customer-app/src/screens/LoginScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/LoginScreen.tsx):
     - Wrapped `phoneInputRow` with a `Pressable` that forwards taps directly to `phoneInputRef.current?.focus()`.
     - Attached `ref={phoneInputRef}` to `TextInput`.
     - Configured `keyboardType="number-pad"` and `showSoftInputOnFocus={true}`.
     - Updated `styles.phoneInput` with `height: '100%'`, `flex: 1`, `paddingVertical: Platform.OS === 'android' ? 0 : 12`, and `textAlignVertical: 'center'`.
  2. Updated [`mobile/customer-app/src/screens/OtpVerificationScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/screens/OtpVerificationScreen.tsx):
     - Added `showSoftInputOnFocus={true}` to prevent keyboard auto-dismiss on Android.
  3. Updated [`mobile/vendor-app/src/context/AuthContext.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/vendor-app/src/context/AuthContext.tsx):
     - Replaced `console.warn` with `console.log` during session restoration to suppress React Native LogBox toasts.
     - Added clean token storage cleanup on 401/403 session errors.
  4. Updated [`mobile/vendor-app/src/screens/VendorLoginScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/vendor-app/src/screens/VendorLoginScreen.tsx):
     - Decoupled `err?.status === 404` from `err?.data?.code === 'NOT_REGISTERED'` to prevent false unregistered user errors.
  5. Updated [`backend/src/server.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/server.js):
     - Explicitly bound server to `0.0.0.0:${PORT}`.
     - Verified live connectivity from both localhost and LAN IP `10.211.183.171:5001`.
- **Acceptance Criteria**: Tapping phone row opens keyboard reliably; Vendor 404 no longer triggers false unregistered error; dev session warnings suppressed; backend responds with real MSG91 SMS OTP.
- **Status**: Done

---

### TSK-MOB-054: Eliminate Chat 401 Polling Loops & Enforce Secure Production OTP Logging
- **Title**: Eliminate Unauthenticated Chat Polling in Vendor App & Secure Backend OTP Diagnostic Logging
- **Priority**: P0
- **Relevant Area**: Vendor Authentication, Navigation Security & SMS Provider Hardening
- **Problem Statement**:
  1. `mobile/vendor-app/src/navigation/VendorNavigator.tsx` unconditionally triggered `api.chat.getUnreadCount()` immediately on mount and on a 20-second interval regardless of authentication status. When users were on `VendorLogin` or session restoration was in-flight, this caused continuous `GET /api/chat/unread-count 401` console spam and unnecessary network consumption.
  2. Plaintext OTP codes were being printed in server logs (`🔔 [WorkLogy OTP] ...`), violating production security standards.
  3. Phone numbers were logged unmasked in diagnostic traces.
  4. MSG91 SMS OTP requests were returning HTTP 200 from the provider's entry API, but actual GSM delivery was held in pending status by Indian telecom compliance (`pauseReason: 'code: 211'` - DLT Template ID Missing, balance `0`).
- **Expected Behavior**:
  1. `VendorNavigator` only polls unread messages and notifications when `user?._id` is actively authenticated. Unauthenticated states reset counts to 0 and cancel interval polling.
  2. All diagnostic logs mask mobile numbers (`+91 ******XXXX`) and never print raw OTP codes.
  3. API responses never leak OTP codes or mock parameters (`debugCode` eliminated).
  4. Real MSG91 provider status and balance are inspected and verified via official delivery log APIs.
- **Implementation Scope**:
  1. Updated [`mobile/vendor-app/src/navigation/VendorNavigator.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/vendor-app/src/navigation/VendorNavigator.tsx):
     - Added guard `if (!user?._id) return;` to `fetchUnread`.
     - Guarded `setInterval(fetchUnread, 20000)` and socket connections behind active `user?._id`.
  2. Updated [`backend/src/controllers/auth.controller.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/controllers/auth.controller.js):
     - Removed all plaintext OTP console logs.
     - Enforced masked logging (`+91 ******${normalizedPhone.slice(-4)}`).
     - Removed `debugCode` from JSON API responses.
  3. Updated [`backend/src/utils/sms.js`](file:///Users/shaheaalam/Desktop/worklogy/backend/src/utils/sms.js):
     - Removed plaintext OTP logging and stripped `debugCode`.
  4. Verified provider status via official MSG91 delivery report API (`/api/v5/report/logs/p/otp`) and route balance API (`balance.php`).
- **Acceptance Criteria**: Zero 401 polling loops when unauthenticated; zero plaintext OTPs in logs or API responses; all phone numbers masked; exact MSG91 delivery failure reason (`code: 211`) documented.
- **Status**: Done

---

### TSK-MOB-055: WorkLogy Vendor App — Fix Splash Screen Sequence & Eliminate Old Custom Splash
- **Title**: Eliminate Unwanted Slogan Splash & Enforce Strict Two-Stage Startup Sequence in WorkLogy Vendor App
- **Priority**: P0
- **Relevant Area**: Vendor App Startup Lifecycle & Native Splash Handoff
- **Problem Statement**:
  1. The Vendor App displayed 3 splash screens plus a glitch:
     - 1. Native WorkLogy Pro logo splash
     - 2. Unwanted old custom slogan splash ("WorkLogy Pro", "Your Skills. More Opportunities.", trust badges)
     - 3. Homepage flash
     - 4. Promotional image (`WorkLogy vendor splash.png`) appearing briefly
     - 5. Settle on Vendor Login
  2. The custom slogan splash was obsolete and conflicting with the native splash.
  3. `history` in `VendorNavigator.tsx` initialized with `VendorHomeTab`, causing premature mounting and render flashes of `VendorHomeScreen` during startup.
- **Expected Behavior**:
  - Exactly TWO splash screens:
    1. First: Existing Native WorkLogy Pro logo splash (`native-splash.png`).
    2. Second: Full-screen promotional image `WorkLogy vendor splash.png` (only custom splash screen in JavaScript).
    3. Destination: Directly to `VendorHomeTab` (if authenticated) or `VendorLogin` (if unauthenticated).
  - ZERO homepage flash before promotional splash.
  - Promotional image never appears after homepage.
  - Zero old slogan text or trust badges.
  - Edge-to-edge dark green (`#043821`) presentation with responsive `contain` layout preserving logo, technician faces, and icons across all Android aspect ratios (9:16, 19.5:9, 20:9, tablets).
- **Implementation Scope**:
  1. Rewrote [`mobile/vendor-app/src/components/WorklogySplashScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/vendor-app/src/components/WorklogySplashScreen.tsx):
     - Completely removed the old Stage 1 custom logo & slogan UI ("Your Skills. More Opportunities.", trust badges, `WORKLOGY_LOGO`).
     - Rendered ONLY `WorkLogy vendor splash.png` edge-to-edge in `#043821` container with matching `#043821` translucent status bar.
     - Connected `onLoadEnd` to dismiss the native splash screen smoothly via `SplashScreen.hideAsync()` once the promotional image is ready to render.
     - Single 2.2s minimum display timer combined with `isReady` (`!isLoading`) gate and 5.0s safety timeout.
  2. Updated [`mobile/vendor-app/src/navigation/VendorNavigator.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/vendor-app/src/navigation/VendorNavigator.tsx):
     - Initialized `history` dynamically to prevent premature mounting of `VendorHomeScreen` when unauthenticated.
     - Rendered `<View style={styles.splashPlaceholder} />` while `!splashFinished && isLoading`, preventing any underlying screen flash or unauthenticated API calls.
     - Guarded `showNavHeader` and bottom bar behind `splashFinished`.
     - Controlled splash completion with module-level `hasVendorSplashCompletedOnce` guard.
- **Acceptance Criteria**: Strict 2-stage sequence (Native Logo -> Full-Screen Promotional Splash -> Direct Destination); zero old slogan screens; zero homepage flash; zero promotional splash after homepage; passes `tsc --noEmit` and `expo export --platform android`.
- **Status**: Done

---

### TSK-MOB-056: WorkLogy Vendor Splash — Seamless Background & Responsive Production Implementation
- **Title**: Seamless Edge-to-Edge Background Integration & Responsive Multi-Screen Layout for Vendor Promotional Splash
- **Priority**: P0
- **Relevant Area**: Vendor App Startup UI & Responsive Poster Rendering
- **Problem Statement**:
  1. In `media_1793446594708_7a84f8f3.jpg`, the promotional splash displayed as a centered floating box (`resizeMode="contain"`), resulting in 158px empty green blocks at the top and bottom on 20:9 devices.
  2. The bottom of the artwork terminated with a sharp horizontal cut between the light floor/technician trousers and the container background, breaking visual immersion.
- **Expected Behavior**:
  - The entire splash screen appears as one continuous, professionally composed full-screen poster.
  - Natural top and bottom background extension with zero visible separation, horizontal lines, or empty color blocks.
  - WorkLogy logo and house branding remain 100% visible near top, under the translucent status bar (`#014B2D`).
  - All 3 technicians in green uniforms and all 6 service trade icons remain 100% visible on both short (9:16) and tall (19.5:9, 20:9, 21:9) displays.
  - Zero distortion, stretching, or artificial letterboxing.
- **Implementation Scope**:
  1. Created production high-resolution seamless artwork [`mobile/vendor-app/src/assets/worklogy-vendor-splash-seamless.png`](file:///Users/shaheaalam/Desktop/worklogy/mobile/vendor-app/src/assets/worklogy-vendor-splash-seamless.png) (1024 × 2275, 9:20 ratio), naturally extending the top emerald gradient and seamlessly blending the bottom trousers into deep dark forest green (`#011A10`) using smoothstep curve interpolation. Original source file [`WorkLogy vendor splash.png`](file:///Users/shaheaalam/Desktop/worklogy/mobile/vendor-app/src/assets/WorkLogy%20vendor%20splash.png) preserved 100% intact.
  2. Updated [`mobile/vendor-app/src/components/WorklogySplashScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/vendor-app/src/components/WorklogySplashScreen.tsx):
     - Implemented dynamic aspect ratio-aware layout computation using `useMemo` and `Dimensions.get('window')`.
     - Standard to tall phones (9:16, 19.5:9, 20:9) anchor to top (`top: 0, left: 0`) with 100% screen width, letting extra bottom dark green height extend seamlessly without cropping the logo, technician heads, or trade icons.
     - Ultra-tall phones (21:9) match screen height with centered horizontal alignment.
     - Wide screens / tablets center horizontally while matching height.
     - Set status bar to `#014B2D` matching exact top gradient.
  3. Updated [`mobile/vendor-app/src/navigation/VendorNavigator.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/vendor-app/src/navigation/VendorNavigator.tsx) `splashPlaceholder` to `#01381F`.
- **Acceptance Criteria**: Zero horizontal line or rectangular border; edge-to-edge dark emerald composition; logo and all 3 technicians fully visible across 9:16, 19.5:9, 20:9, and tablets; clean `tsc --noEmit` and `expo export --platform android`.
- **Status**: Done

---

### TSK-MOB-057: WorkLogy Vendor Splash — Bottom Branding & Value Proposition Typography
- **Title**: Add Premium Headings, Value Proposition & Trust Badges to Vendor Splash Bottom Area
- **Priority**: P0
- **Relevant Area**: Vendor App Startup UI & Typography Design
- **Problem Statement**:
  1. The bottom seamless dark green area beneath the technicians' artwork was empty and lacked direct promotional branding and contractor value messaging.
  2. The splash screen needed a balanced, premium typography composition directly under the technicians without overlapping tools, toolbelts, or overflowing the screen on smaller devices.
- **Expected Behavior**:
  - Main Heading: "Your Skills. More Opportunities." in pure white `#FFFFFF` (`fontWeight: 800`).
  - Subheading: "Grow Your Business with WorkLogy" in subtle light-green accent `#34D399` (`fontWeight: 700`).
  - Description: "Connect with nearby customers, discover local jobs and build your professional reputation." in soft white/grey `#E2E8F0`.
  - Trust Highlights: "Trusted Professionals" and "More Local Opportunities" with small green Ionicons badges (`shield-checkmark` and `briefcase`).
  - The dark green background continues seamlessly with zero cards, borders, or boxes.
  - Adaptive font sizes and padding across compact (<720px), medium (720-880px), and tall (>=880px) Android screens.
  - Safe-area aware (`useSafeAreaInsets`) so navigation bars / gesture pills never clip text.
  - Existing artwork, native splash, and 2-stage splash sequence preserved.
- **Implementation Scope**:
  1. Updated [`mobile/vendor-app/src/components/WorklogySplashScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/vendor-app/src/components/WorklogySplashScreen.tsx):
     - Integrated `useSafeAreaInsets()` and adaptive typography styling.
     - Positioned `bottomContent` in the lower seamless dark green area with `pointerEvents="none"`.
     - Added Main Heading, Subheading, Description, and Trust Highlights row with subtle emerald circular icon backdrops.
  2. Verified TypeScript compiler checks and Android Expo release exports.
- **Acceptance Criteria**: Seamless typography integration; zero overlap with technicians or toolbelts; zero clipping on navigation bars; passes `tsc --noEmit` and `expo export --platform android`.
- **Status**: Done

---

### TSK-MOB-058: WorkLogy Customer Splash Screen Sequence & Old Custom Splash Removal
- **Title**: Eliminate Duplicate Intermediate Splash, Login Flash, and Implement Authoritative Two-Stage Splash Sequence in Customer App
- **Priority**: P0
- **Relevant Area**: Customer App Startup UI & Navigation Lifecycle
- **Problem Statement**:
  1. Customer App previously displayed an unwanted custom intermediate splash (WorkLogy logo with "Trusted Local Services") after native splash.
  2. The underlying `LoginScreen` ("Welcome to WorkLogy" / "Book trusted local professionals...") flashed briefly between splash stages.
  3. The promotional image `WorkLogy Customer Splash.png` appeared after the login screen was already visible.
  4. Multiple competing splash dismissals existed between `CustomerNavigator.tsx` and `WorklogySplashScreen.tsx`.
- **Expected Behavior**:
  - Strict 2-stage splash sequence:
    1. First: Existing native WorkLogy logo splash (`native-splash.png` on `#FFFFFF`).
    2. Second: Full-screen customer promotional splash (`WorkLogy Customer Splash.png`) displayed for 2.0–2.5 seconds or until authentication restoration completes.
    3. Third: Direct transition to destination (`HomeTab` if authenticated, onboarding if profile incomplete, or `Login` screen with guest browsing support).
  - Never flash `LoginScreen` or `HomeScreen` before or between splash screens.
  - Zero old custom logo/slogan splash screens.
  - Responsive edge-to-edge layout across 9:16, 19.5:9, 20:9, and tablet devices matching `#EAD8C7` warm beige background.
  - Promotional splash runs strictly once per cold launch.
  - Vendor App must remain completely untouched.
- **Implementation Scope**:
  1. Rewrote [`mobile/customer-app/src/components/WorklogySplashScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/components/WorklogySplashScreen.tsx):
     - Completely removed old Stage 1 custom logo & slogan UI ("Trusted Local Services", `WORKLOGY_LOGO`, duplicate entrance animations).
     - Rendered ONLY `WorkLogy Customer Splash.png` with `resizeMode="contain"` inside `#EAD8C7` edge-to-edge container.
     - Configured translucent `StatusBar` with `backgroundColor="#EAD8C7"` and `barStyle="dark-content"`.
     - Connected `onLoadEnd` to `SplashScreen.hideAsync()` so the native splash screen smoothly transfers to the promotional image without white flash.
     - Implemented single authoritative 2.2s display timer and 5.0s safety timeout.
  2. Updated [`mobile/customer-app/src/navigation/CustomerNavigator.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/navigation/CustomerNavigator.tsx):
     - Removed redundant `SplashScreen.hideAsync()` call from navigator `useEffect`.
     - Guarded `showNavHeader` and `bottomBar` behind `splashFinished`.
     - Rendered `<View style={styles.splashPlaceholder} />` with `#EAD8C7` background while `!splashFinished && isLoading`, preventing any premature rendering or flash of `LoginScreen`.
     - Controlled splash completion with module-level `hasCustomerSplashCompletedOnce` guard.
- **Acceptance Criteria**: Strict 2-stage sequence (Native Logo -> Customer Promotional Splash -> Main App Destination); zero intermediate logo splash; zero login flash; zero promotional splash after homepage; passes `tsc --noEmit` and `expo export --platform android`.
- **Status**: Done

---

### TSK-MOB-059: WorkLogy Customer Splash — Seamless Background & Responsive Production Implementation
- **Title**: Seamless Edge-to-Edge Background Integration & Responsive Multi-Screen Layout for Customer Promotional Splash
- **Priority**: P0
- **Relevant Area**: Customer App Startup UI & Responsive Poster Rendering
- **Problem Statement**:
  1. The Customer promotional splash originally displayed with `resizeMode="contain"`, leaving letterbox empty blocks at the top and bottom on modern 19.5:9 and 20:9 Android displays.
  2. The image terminated with a visible horizontal separation where the bottom table/carpet met the container background.
- **Expected Behavior**:
  - The entire splash screen appears as one continuous, professionally composed full-screen poster.
  - Natural top and bottom background extension with zero visible separation, horizontal lines, or empty color blocks.
  - WorkLogy logo and house branding remain 100% visible near the top under the translucent status bar (`#E8D9CA`).
  - The smiling couple and all 5 service trade bubbles remain in full prime view across 9:16, 19.5:9, 20:9, 21:9, and tablets.
  - Zero distortion, stretching, or artificial letterboxing.
  - Vendor App remains completely untouched.
- **Implementation Scope**:
  1. Created production high-resolution seamless artwork [`mobile/customer-app/src/assets/worklogy-customer-splash-seamless.png`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/assets/worklogy-customer-splash-seamless.png) (1024 × 2275, 9:20 ratio), naturally extending the ceiling beam upward and seamlessly blending the bottom coffee table and carpet into a warm honey-oak/taupe living room floor gradient (`#CDA687` to `#AF8A6C`) using smoothstep interpolation. Original source file [`WorkLogy Customer Splash.png`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/assets/WorkLogy%20Customer%20Splash.png) preserved 100% intact.
  2. Updated [`mobile/customer-app/src/components/WorklogySplashScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/components/WorklogySplashScreen.tsx):
     - Implemented dynamic aspect ratio-aware layout computation using `useMemo` and `Dimensions.get('window')`.
     - Standard to tall phones (9:16, 19.5:9, 20:9) anchor to top (`top: 0, left: 0`) with 100% screen width, letting the seamless living room floor flow to the bottom edge without cropping the logo, couple, or service bubbles.
     - Ultra-tall phones (21:9) match screen height with centered horizontal alignment.
     - Wide screens / tablets fit height and center horizontally.
     - Set status bar to `#E8D9CA` matching exact top ceiling gradient with `barStyle="dark-content"`.
  3. Updated [`mobile/customer-app/src/navigation/CustomerNavigator.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/navigation/CustomerNavigator.tsx) `splashPlaceholder` to `#E8D9CA`.
- **Acceptance Criteria**: Zero horizontal line or rectangular border; edge-to-edge warm home interior composition; logo, couple, and all 5 service bubbles fully visible across 9:16, 19.5:9, 20:9, and tablets; passes `tsc --noEmit` and `expo export --platform android`.
- **Status**: Done

---

### TSK-MOB-060: WorkLogy Customer Splash — Bottom Branding & Value Proposition Typography
- **Title**: Add Premium Headings, Value Proposition & Trust Badges to Customer Splash Bottom Area
- **Priority**: P0
- **Relevant Area**: Customer App Startup UI & Typography Design
- **Problem Statement**:
  1. The bottom warm honey-oak/taupe floor area beneath the coffee table artwork was empty and lacked direct customer branding and value proposition messaging.
  2. The splash screen needed a balanced, premium typography composition directly under the coffee table without overlapping the couple, the coffee table, or overflowing the screen on compact devices.
- **Expected Behavior**:
  - Main Heading: "Your Home, Our Responsibility." in bold dark green `#123D2C` (`fontWeight: 800`).
  - Subheading: "Trusted Help, Just a Tap Away." in medium-bold green `#16845D` (`fontWeight: 700`).
  - Description: "From repairs to home care, find trusted professionals for every need." in muted warm dark grey `#554B43` (`fontWeight: 500`).
  - Trust Highlights: "Verified Professionals", "Quick & Easy Booking", and "Complete Home Solutions" with subtle green Ionicons badges (`shield-checkmark`, `flash`, and `home`).
  - Seamlessly embedded in the warm living room floor tone with zero cards, borders, or boxes.
  - Adaptive font sizes and padding across compact (<720px), medium (720-880px), and tall (>=880px) Android screens.
  - Safe-area aware (`useSafeAreaInsets`) so navigation bars / gesture pills never clip text.
  - Existing artwork, native splash, and 2-stage splash sequence preserved.
  - Vendor App remains completely untouched.
- **Implementation Scope**:
  1. Updated [`mobile/customer-app/src/components/WorklogySplashScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/customer-app/src/components/WorklogySplashScreen.tsx):
     - Integrated `useSafeAreaInsets()` and adaptive typography sizing.
     - Positioned `bottomContent` in the lower warm taupe area with `pointerEvents="none"`.
     - Added Main Heading, Subheading, Description, and Trust Highlights row with subtle emerald circular icon backdrops.
  2. Verified TypeScript compiler checks and Android Expo release exports.
- **Acceptance Criteria**: Seamless typography integration; zero overlap with couple or coffee table; zero clipping on navigation bars; passes `tsc --noEmit` and `expo export --platform android`.
- **Status**: Done

---

### TSK-MOB-061: WorkLogy Vendor App OTP Verification UI & AutoFill
- **Title**: Six-Box OTP Verification Screen with Android SMS AutoFill, Multi-Digit Paste, and Auto-Advance
- **Priority**: P0
- **Relevant Area**: Vendor App Authentication & Onboarding Flow
- **Problem Statement**:
  1. The Vendor App previously used a single input displaying masked dots or grouped characters (`• • • • • •`), creating a visual discrepancy with the Customer App OTP verification interface.
  2. Automatic SMS OTP autofill, clipboard paste parsing across 6 discrete digits, and seamless backspace navigation across boxes were missing.
- **Expected Behavior**:
  - Header: Back button with hitSlop, centered title "Verification", matching Customer App.
  - Security Icon: 72x72 rounded container (borderRadius 20, `#F0FDF4`, border `#DCFCE7`) with `chatbubble-ellipses` green icon (`#08765A`).
  - Typography: Heading "Verify your mobile number", subheading "Enter the 6-digit code sent via SMS to".
  - Phone Row: Pill badge with masked number (`+91 ******XXXX`) and "Change number" action navigating back.
  - Six Discrete Boxes: Exactly 6 boxes in a horizontal row (`[ ][ ][ ][ ][ ][ ]`), displaying centered 22px bold digits with smooth focus indicator (green border `#08765A`, subtle green background when filled `#F0FDF4`, red on error `#DC2626`).
  - SMS AutoFill & Multi-Digit Paste: `textContentType="oneTimeCode"` and `autoComplete="sms-otp"` on first box; `handleChangeText` intercepts multi-digit strings (up to 6 digits) and distributes them cleanly across all 6 boxes.
  - Focus Navigation: Auto-advances to the next box upon typing; backspace navigates to and clears the previous box if the current box is empty.
  - Auto-Submission: Once all 6 boxes are filled, automatically triggers verification with `isSubmittingRef` guard against duplicate calls.
  - Primary Action Button: Full-width "Verify & Continue" button with forward arrow and loading spinner.
  - Resend OTP: Countdown timer ("Resend in Xs") transitioning to active "Resend OTP" button that re-invokes `sendOtp(phone, purpose)`.
  - Customer App and backend MSG91 integration remain completely untouched.
- **Implementation Scope**:
  1. Completely rewrote [`mobile/vendor-app/src/screens/VendorOtpVerificationScreen.tsx`](file:///Users/shaheaalam/Desktop/worklogy/mobile/vendor-app/src/screens/VendorOtpVerificationScreen.tsx):
     - **Resolved Screen Flickering Root Cause**: Replaced multiple native `TextInput` instances with a single authoritative hidden `TextInput` (`maxLength={6}`, `keyboardType="number-pad"`, `textContentType="oneTimeCode"`, `autoComplete="sms-otp"`), coupled with memoized visual cells (`OtpBoxes`). This eliminates Android `InputMethodService` soft-keyboard reconnects, window resize jitter, and subpixel border redraws.
     - **Isolated Resend Countdown**: Extracted the 1-second interval timer into `ResendCountdownSection` wrapped in `React.memo`, preventing the main verification screen and inputs from re-rendering every second.
     - **Static Dimensions & Elevation**: Locked box border width (1.5px) and eliminated dynamic elevation toggling during typing to prevent Android hardware layer invalidation and white/black redraw flashes.
     - **SMS AutoFill & Paste**: Supports immediate single-keystroke entry, multi-digit paste, and native Android SMS AutoFill via native `oneTimeCode` handler.
     - **Single Verification Execution**: Maintained `isSubmittingRef` duplicate request guard and automatic submission upon the 6th digit.
     - **Visual Parity**: Centered "Verification" header, emerald chat bubble icon (72×72), masked phone badge (`+91 ******XXXX`), "Change number" action, and "Verify & Continue" button.
  2. Verified TypeScript compiler checks (`npx tsc --noEmit`) and Android bundle export (`npx expo export --platform android`) cleanly with 0 errors.
- **Acceptance Criteria**: Exact 6-box OTP layout matching Customer App; zero screen flickering or keyboard jumping during manual entry; isolated countdown timer; automatic SMS OTP autofill; multi-digit paste support; passes `tsc --noEmit` and `expo export --platform android`.
- **Status**: Done
