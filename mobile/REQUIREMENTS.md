# WorkLogy Mobile Applications — Product Requirements Specification (`mobile/REQUIREMENTS.md`)

This document defines the functional and non-functional requirements for the **WorkLogy Customer Mobile App** (`customer-app`) and **WorkLogy Vendor Pro Mobile App** (`vendor-app`).

Every requirement is uniquely identified and audited against the active codebase and backend API contracts.

---

## 1. Authentication & Session Management

### REQ-AUTH-001: Customer Registration & Token Hydration
- **User Role**: Customer
- **Expected Behavior**: Customer signs up with full name, email, phone number, and password. Upon successful registration, the client receives a JWT and user object, stores the token in `SecureStore`, and transitions to the Home tab.
- **Backend Dependency**: `POST /api/auth/register` (body: `{ name, email, phone, password, role: 'customer' }`)
- **Validation & Authorization Rules**: Email must be unique and valid format. Password must have minimum 6 characters. Name cannot be blank.
- **Acceptance Criteria**: Form displays field-level errors on invalid input. Duplicate email returns user-friendly error. Successful creation sets session state and redirects.
- **Current Status**: **Implemented** (`customer-app/src/screens/RegisterScreen.tsx`)

### REQ-AUTH-002: Vendor Registration with Business Details
- **User Role**: Vendor
- **Expected Behavior**: Contractor registers with business name, owner name, email, phone number, and password. Account is provisioned with role `'vendor'`.
- **Backend Dependency**: `POST /api/auth/register` (body: `{ name, email, phone, password, role: 'vendor' }`)
- **Validation & Authorization Rules**: Minimum 6 character password. Valid phone number.
- **Acceptance Criteria**: Successful registration transitions vendor directly into Vendor Home dashboard with `'unverified'` verification state.
- **Current Status**: **Implemented** (`vendor-app/src/screens/VendorRegisterScreen.tsx`)

### REQ-AUTH-003: Login & Silent Session Hydration
- **User Role**: Shared (Customer & Vendor)
- **Expected Behavior**: User logs in with email and password. On subsequent app cold launches, the stored token is sent to `/api/auth/me` to hydrate the user profile without re-prompting credentials.
- **Backend Dependency**: `POST /api/auth/login`, `GET /api/auth/me`
- **Validation & Authorization Rules**: Invalid password returns 401 Unauthorized. Expired tokens are purged from `SecureStore`.
- **Acceptance Criteria**: Token restores session state. Expired token cleanly presents Login screen.
- **Current Status**: **Implemented** (`AuthContext.tsx` in both apps)

### REQ-AUTH-004: Role Switching & Clean Logout
- **User Role**: Shared
- **Expected Behavior**: User can switch their active portal mode via `PATCH /api/auth/role` or perform a clean logout that clears `SecureStore` tokens and resets app state.
- **Backend Dependency**: `PATCH /api/auth/role`, `secureStorage.removeItem`
- **Acceptance Criteria**: Tapping logout clears session immediately; navigating back to protected views without auth redirects to Login.
- **Current Status**: **Implemented** (`ProfileScreen.tsx` in both apps)

---

## 2. Customer Experience

### REQ-CUST-001: Customer Home Feed & Service Search
- **User Role**: Customer
- **Expected Behavior**: Displays compact WorkLogy brand header, location selector, real-time search bar, 3x3 service categories grid, featured repair card with technician imagery, and popular services horizontal carousel.
- **Backend Dependency**: `GET /api/categories`, `GET /api/bookings/my-bookings`, `GET /api/notifications/unread-count`
- **Acceptance Criteria**: Search bar filters categories and services. Pull-to-refresh reloads live categories and active orders.
- **Current Status**: **Implemented** (`customer-app/src/screens/HomeScreen.tsx`)

### REQ-CUST-002: Service Location Selection & Manual Override
- **User Role**: Customer
- **Expected Behavior**: Displays current delivery locality (e.g., "Noida, Sector 62"). Tapping opens `LocationModal` allowing manual city/locality selection or GPS auto-detection, persisted in `SecureStore`.
- **Backend Dependency**: Local storage key `worklogy_saved_location`
- **Acceptance Criteria**: Changing location updates the header display and filters recommended services accordingly.
- **Current Status**: **Implemented** (`customer-app/src/components/LocationModal.tsx`)

### REQ-CUST-003: Customer Job Dossier & Arrival OTP Display
- **User Role**: Customer
- **Expected Behavior**: Customer views their scheduled or active bookings. Active bookings show the 6-digit cryptographic Arrival OTP, direct call button, assigned contractor profile, and real-time status tracker.
- **Backend Dependency**: `GET /api/bookings/my-bookings`, `GET /api/bookings/:id`
- **Acceptance Criteria**: 6-digit OTP is prominent and visible only to the authenticated customer. Direct phone dialer opens with contractor number.
- **Current Status**: **Implemented** (`customer-app/src/screens/JobDetailScreen.tsx`, `MyJobsScreen.tsx`)

---

## 3. Vendor Experience

### REQ-VEND-001: Vendor Dashboard & Live Dispatch Toggle
- **User Role**: Vendor
- **Expected Behavior**: Displays compact header with WorkLogy logo, unread notification badge (`3`), search bar with filter sliders, 3x3 trade category grid, featured repair banner with technician imagery, and popular services carousel. Includes an Online/Offline availability toggle that updates `PUT /api/vendors/availability`.
- **Backend Dependency**: `GET /api/vendors/profile/me`, `PUT /api/vendors/availability`, `GET /api/jobs/open`
- **Acceptance Criteria**: Switching toggle updates dispatch status in MongoDB. Offline state excludes vendor from live broadcasts.
- **Current Status**: **Implemented** (`vendor-app/src/screens/VendorHomeScreen.tsx`)

### REQ-VEND-002: Masked Tender Feed & Filter Tabs
- **User Role**: Vendor
- **Expected Behavior**: Displays open service tenders with 6 structured filter tabs (`New Requests`, `Quoted`, `Accepted`, `In Progress`, `Completed`, `Cancelled`).
- **Backend Dependency**: `GET /api/jobs/open`, `GET /api/applications/vendor`, `GET /api/bookings/my-bookings`
- **Acceptance Criteria**: Open tenders mask exact house numbers and street names. Tapping "Send Quotation" launches the interactive quotation modal.
- **Current Status**: **Implemented** (`vendor-app/src/screens/JobsScreen.tsx`)

### REQ-VEND-003: Unmasked Assignment Dossier & Map Navigation
- **User Role**: Vendor
- **Expected Behavior**: Once a job is officially confirmed/assigned to the vendor, the full customer address, phone number, and special instructions are unmasked. Single-tap launches Google Maps navigation (`maps.google.com/?q=...`) and direct phone calling.
- **Backend Dependency**: `GET /api/bookings/:id`
- **Acceptance Criteria**: Address unmasks only for the assigned contractor. Google Maps opens coordinates or formatted address.
- **Current Status**: **Implemented** (`vendor-app/src/screens/VendorJobDetailScreen.tsx`)

---

## 4. Service Discovery & Catalog

### REQ-DISC-001: 30 Canonical Trade Categories Catalog
- **User Role**: Customer
- **Expected Behavior**: Customers can browse all 30 canonical service domains grouped into 4 distinct classifications (Home Maintenance, Repair & Installation, Moving & Construction, Personal & Other).
- **Backend Dependency**: `GET /api/categories`
- **Acceptance Criteria**: Every category displays high-resolution landscape photography, subservice counts, and upfront pricing indicators.
- **Current Status**: **Implemented** (`customer-app/src/screens/ExploreScreen.tsx`)

### REQ-DISC-002: Category Detail & Subservice Pricing Cards
- **User Role**: Customer
- **Expected Behavior**: Selecting a category displays subservice packages with transparent starting prices (e.g., "Switchboard Repair - ₹199"), what's included, estimated duration, and certified pro previews.
- **Backend Dependency**: `GET /api/categories/:slug`
- **Acceptance Criteria**: Clicking a subservice auto-populates the service request wizard.
- **Current Status**: **Implemented** (`customer-app/src/screens/CategoryDetailScreen.tsx`)

---

## 5. Job Creation & Dispatch

### REQ-JOB-001: Standard Service Request Wizard
- **User Role**: Customer
- **Expected Behavior**: Multi-step booking form capturing category, subservice, problem description, urgency (Normal vs High), service address, and preferred date/time slot.
- **Backend Dependency**: `POST /api/jobs`
- **Validation & Authorization Rules**: Title must be at least 5 characters. Address must have street, city, and 6-digit Indian pincode.
- **Acceptance Criteria**: Persists to MongoDB, emits `new_job_lead` event, and generates a tracking card in "My Jobs".
- **Current Status**: **Implemented** (`customer-app/src/screens/CreateJobScreen.tsx`)

### REQ-JOB-002: 24/7 Rapid Emergency Dispatch Radar
- **User Role**: Customer
- **Expected Behavior**: Single-screen emergency dispatch with life-safety disclaimer (112/101), trade selection, transparent diagnostic visit pricing (₹499), and live radar broadcast animation.
- **Backend Dependency**: `POST /api/jobs` (with `urgency: 'emergency'`)
- **Acceptance Criteria**: Server broadcasts `emergency_broadcast` WebSocket event to all available certified local contractors within territory.
- **Current Status**: **Implemented** (`customer-app/src/screens/EmergencyScreen.tsx`)

---

## 6. Offers & Quotation Booking

### REQ-QUOT-001: Interactive Quotation Submission
- **User Role**: Vendor
- **Expected Behavior**: Contractors can submit detailed quotations specifying Service Fee, Labour Charges, Material/Parts Cost, and Travel Fee. Total amount is calculated dynamically in ₹ INR with proposed schedule and work description.
- **Backend Dependency**: `POST /api/applications` (body: `{ jobId, proposedAmount, coverLetter, estimatedDuration, materialCharges }`)
- **Validation & Authorization Rules**: Contractor must have an approved profile. Proposed amount must be greater than 0. Anti-duplicate submission prevents multiple clicks.
- **Acceptance Criteria**: Quotation is stored in MongoDB, updates proposal count, and alerts the customer via notification.
- **Current Status**: **Implemented** (`vendor-app/src/screens/JobsScreen.tsx`)

### REQ-QUOT-002: Customer Offer Acceptance & Contract Creation
- **User Role**: Customer
- **Expected Behavior**: Customer reviews incoming vendor proposals with ratings, price breakdown, and proposed schedule. Accepting an offer creates a confirmed `Booking` with an escrow deposit lock.
- **Backend Dependency**: `POST /api/applications/:id/status` (status: `'accepted'`)
- **Acceptance Criteria**: Confirms assignment, locks the job from further bids, generates 6-digit Arrival OTP, and notifies the winning vendor.
- **Current Status**: **Implemented** (`customer-app/src/screens/MyJobsScreen.tsx`)

### REQ-QUOT-003: Atomic First-Acceptance-Wins (FCFS) Emergency Claim
- **User Role**: Vendor
- **Expected Behavior**: Emergency broadcast leads display an instant claim button. The first available technician to tap claims the lead atomically.
- **Backend Dependency**: `POST /api/jobs/:id/claim-instant`
- **Validation & Authorization Rules**: Atomic database update: `Job.findOneAndUpdate({ _id, status: 'open', selectedVendor: null })`.
- **Acceptance Criteria**: Winning contractor receives 200 OK and Booking creation with 6-digit Arrival OTP. Losing concurrent bidders receive HTTP 409 Conflict with message "This job has already been accepted by another professional."
- **Current Status**: **Implemented** (`vendor-app/src/api/client.ts`, `JobsScreen.tsx`)

---

## 7. Work Lifecycle & Field Execution

### REQ-WORK-001: Sequential Field Status Progression
- **User Role**: Vendor
- **Expected Behavior**: Assigned contractor advances work status through sequential states:
  `confirmed` $\rightarrow$ `on_the_way` $\rightarrow$ `arrived` $\rightarrow$ `in_progress` $\rightarrow$ `completion_pending` $\rightarrow$ `completed`.
- **Backend Dependency**: `PATCH /api/bookings/:id/status`
- **Acceptance Criteria**: Status transitions trigger real-time push updates to the customer's tracking screen.
- **Current Status**: **Implemented** (`vendor-app/src/screens/VendorJobDetailScreen.tsx`)

### REQ-WORK-002: Cryptographic Arrival OTP Verification
- **User Role**: Vendor
- **Expected Behavior**: Technician cannot transition job to `in_progress` without inputting the customer's 6-digit Arrival OTP. Submitting OTP verifies match on the server.
- **Backend Dependency**: `POST /api/bookings/:id/verify-arrival-otp` (body: `{ otp: '123456' }`)
- **Validation & Authorization Rules**: Server checks `booking.arrivalOtp === otp`. Incorrect code returns 400 Bad Request.
- **Acceptance Criteria**: Successful verification sets `isOtpVerified: true` and transitions status to `in_progress`.
- **Current Status**: **Implemented** (`vendor-app/src/screens/VendorJobDetailScreen.tsx`)

### REQ-WORK-003: Completion Sign-off & Escrow Release Request
- **User Role**: Vendor
- **Expected Behavior**: Technician marks work complete and enters warranty/repair notes. Job moves to `completion_pending`.
- **Backend Dependency**: `POST /api/bookings/:id/complete-signoff`
- **Acceptance Criteria**: Prompts customer to verify physical work and release escrow payment.
- **Current Status**: **Implemented** (`vendor-app/src/screens/VendorJobDetailScreen.tsx`)

---

## 8. Payments & Escrow Ledger

### REQ-PAY-001: 100% Escrow Payment Protection
- **User Role**: Shared
- **Expected Behavior**: Customer payments are deposited into escrow. Funds remain locked until customer sign-off or administrative dispute resolution.
- **Backend Dependency**: `Booking.pricing.paymentStatus` (`held_in_escrow`)
- **Acceptance Criteria**: Vendor UI indicates "Held in Escrow" with clear release conditions.
- **Current Status**: **Implemented** (`EarningsScreen.tsx`, `JobDetailScreen.tsx`)

### REQ-PAY-002: Vendor Financials & Platform Commission Breakdown
- **User Role**: Vendor
- **Expected Behavior**: Vendor views 4 financial metrics: Total Lifetime Earnings, This Month Net, Pending Escrow, and Completed Payouts. Transaction ledger displays Gross Bill, 10% WorkLogy Fee deduction, and Net Take-Home Pay.
- **Backend Dependency**: `GET /api/vendors/earnings`, `GET /api/vendors/transactions`
- **Acceptance Criteria**: Mathematical reconciliation: $\text{Net Take-Home} = \text{Gross Amount} - 10\% \text{ Platform Fee}$.
- **Current Status**: **Implemented** (`vendor-app/src/screens/EarningsScreen.tsx`)

---

## 9. Messaging & Notifications

### REQ-COMM-001: Real-Time In-App Messaging
- **User Role**: Shared
- **Expected Behavior**: Customer and contractor can exchange text messages once a job is confirmed. Messages persist in MongoDB and stream live via Socket.IO.
- **Backend Dependency**: `GET /api/chat/conversations/:id/messages`, `POST /api/chat/messages`
- **Acceptance Criteria**: New messages render as incoming/outgoing bubbles in real time without screen refresh.
- **Current Status**: **Implemented** (`ChatDetailScreen.tsx` in both apps)

### REQ-COMM-002: Notification Inbox & Unread Badge Count
- **User Role**: Shared
- **Expected Behavior**: Bell icon in header displays red badge with unread count. Tapping opens `NotificationsScreen` with job leads, quotes, and payment updates.
- **Backend Dependency**: `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/read-all`
- **Acceptance Criteria**: Tapping a notification navigates directly to the referenced job dossier. "Mark all as read" clears badges.
- **Current Status**: **Implemented** (`NotificationsScreen.tsx` in both apps)

---

## 10. Profile & Verification (KYC)

### REQ-PROF-001: Statutory KYC Identity Document Submission
- **User Role**: Vendor
- **Expected Behavior**: Contractor can submit government ID proof (Aadhaar Card, PAN Card, Voter ID, Trade License) and compliance consent to the administrative queue.
- **Backend Dependency**: `POST /api/vendors/verification`
- **Validation & Authorization Rules**: ID number cannot be blank. Consent must be true.
- **Acceptance Criteria**: Profile reflects `'submitted'` status. Frontend cannot mark itself verified independently.
- **Current Status**: **Implemented** (`vendor-app/src/screens/VendorProfileScreen.tsx`)

### REQ-PROF-002: Business Profile & Service Territory Management
- **User Role**: Vendor
- **Expected Behavior**: Contractor updates business name, bio, years of experience, and service territories (e.g., "Gomti Nagar, Aliganj, Hazratganj").
- **Backend Dependency**: `PUT /api/vendors/profile/me`
- **Acceptance Criteria**: Updates persist in MongoDB Atlas and display across contractor cards.
- **Current Status**: **Implemented** (`vendor-app/src/screens/VendorProfileScreen.tsx`)

---

## 11. Security & Privacy

### REQ-SEC-001: Role-Based Access Control (RBAC)
- **User Role**: Shared
- **Expected Behavior**: Server strictly validates that customers cannot access contractor management endpoints (`/api/vendors/*`) and contractors cannot post reviews for their own jobs.
- **Backend Dependency**: `protect`, `authorize('customer' | 'vendor' | 'admin')`
- **Acceptance Criteria**: Unauthorized requests return HTTP 403 Forbidden.
- **Current Status**: **Implemented** (Backend Middleware + API Clients)

### REQ-SEC-002: Customer Address Privacy Masking
- **User Role**: Vendor
- **Expected Behavior**: Open tender feeds mask full street addresses and house numbers. Only the assigned contractor can view unmasked delivery addresses.
- **Backend Dependency**: `job.controller.js` projection / masking logic
- **Acceptance Criteria**: Network payloads for open jobs exclude street/house number fields.
- **Current Status**: **Implemented** (`job.controller.js`, `JobsScreen.tsx`)

---

## 12. Reliability, Performance & Accessibility

### REQ-NFR-001: Zero Web Frontend Regression
- **User Role**: Platform
- **Expected Behavior**: Zero modifications to web frontend source code, styles, or routes during mobile tasks.
- **Acceptance Criteria**: Web unit tests (148/148) and production build (`npm run build`) pass cleanly.
- **Current Status**: **Implemented & Enforced**

### REQ-NFR-002: Offline Visual Resilience
- **User Role**: Shared
- **Expected Behavior**: All 33 service category photos are bundled locally in `src/assets/services/`. Offline devices render full imagery without white boxes or broken image links.
- **Acceptance Criteria**: Bundled assets load instantaneously with zero network dependencies.
- **Current Status**: **Implemented** (`serviceImages.ts` in both apps)

### REQ-NFR-003: Mobile Touch Targets & Contrast
- **User Role**: Shared
- **Expected Behavior**: All interactive buttons, tabs, and switches maintain a minimum 44×44pt touch target and WCAG AA contrast against `#F7F6F2` backgrounds.
- **Acceptance Criteria**: Verified on mobile touch screen previews and emulators.
- **Current Status**: **Implemented**
