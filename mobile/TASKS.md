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
| **Phase 2: Customer Mobile App Core (P1)** | 10 | 10 | 0 | 0 | 0 |
| **Phase 3: Vendor Mobile App Core (P1)** | 11 | 11 | 0 | 0 | 0 |
| **Phase 4: Shared Mobile Architecture (P1)** | 5 | 5 | 0 | 0 | 0 |
| **Phase 5: Enhanced Field Capabilities (P2)** | 4 | 0 | 0 | 4 | 0 |
| **Phase 6: Future Scale & Localization (P3)** | 3 | 0 | 0 | 3 | 0 |
| **Total** | **39** | **32** | **0** | **7** | **0** |

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
