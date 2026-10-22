# WorkLogy Mobile Applications — Requirements Specification (`mobile/REQUIREMENTS.md`)

This document defines the functional and non-functional requirements for the **WorkLogy Customer App** and **WorkLogy Vendor App**.

---

## 1. Functional Requirements — Customer Mobile App (`customer-app`)

### 1.1 Authentication & Session
- **REQ-C-101**: Customers must be able to sign up with name, email, phone number, and password.
- **REQ-C-102**: Customers must be able to sign in using their registered email and password.
- **REQ-C-103**: JWT tokens must be securely stored in device SecureStore and automatically restored on subsequent launches.
- **REQ-C-104**: Customers must be able to switch their active portal to Vendor mode or log out cleanly.

### 1.2 Service Exploration & Catalog
- **REQ-C-105**: Customers can browse the full 30-trade service catalog grouped into canonical domains (Home Maintenance, Repair & Installation, Moving & Construction, Personal & Other).
- **REQ-C-106**: Customers can view individual service details, upfront pricing cards, and previews of verified certified professionals.
- **REQ-C-107**: Real-time keyword search across all trades, categories, and subservices.

### 1.3 Service Booking & Requests
- **REQ-C-108**: Customers can create service requests specifying title, description, address, preferred schedule date/time, and urgency level.
- **REQ-C-109**: Customers can choose between Fixed Price or Competitive Quotation modes.
- **REQ-C-110**: Requests must persist in MongoDB via `POST /api/jobs`.

### 1.4 24/7 Rapid Emergency Dispatch
- **REQ-C-111**: Customers can trigger an emergency service request in a single streamlined screen with prominent life-safety notices (112/101).
- **REQ-C-112**: Emergency requests must emit an `emergency_broadcast` WebSocket event and be offered to available local contractors.
- **REQ-C-113**: Emergency bookings carry standard emergency diagnostic fees (₹499) and transparent status radars.

### 1.5 Job Tracking, Arrival OTP & Sign-off
- **REQ-C-114**: Active bookings must display a cryptographic 6-digit Arrival OTP (`booking.arrivalOtp`) visible only to the customer.
- **REQ-C-115**: Customers disclose this OTP to the technician only upon physical arrival at the premises.
- **REQ-C-116**: Customers can cancel eligible pending jobs with real-time backend synchronization.
- **REQ-C-117**: Customers can submit a 1-to-5 star rating and review with comments upon verified job completion.

---

## 2. Functional Requirements — Vendor Pro Mobile App (`vendor-app`)

### 2.1 Authentication & Profile
- **REQ-V-201**: Contractors must be able to log in or register with their business/trade name, primary category, and contact details.
- **REQ-V-202**: Role-based access control (RBAC) must strictly prohibit vendors from accessing customer-only endpoints or reviewing their own services.
- **REQ-V-203**: Vendors can submit KYC identity documents (Aadhaar, PAN, Trade License) to the administrative verification queue.

### 2.2 Availability Management
- **REQ-V-204**: Authorized contractors can toggle their live job availability (Online vs Offline).
- **REQ-V-205**: Toggling availability immediately updates the backend dispatch state via `PUT /api/vendors/availability`. Offline vendors are excluded from live broadcasts.

### 2.3 Nearby Tenders & Address Masking
- **REQ-V-206**: Vendors can view open jobs matching their trade and geographic locality.
- **REQ-V-207**: **Address Masking**: Open tender cards must obscure exact house numbers and street names (showing only `City (~2.5 km away)`).
- **REQ-V-208**: Vendors can submit competitive quotations/proposals for quote-based tenders.

### 2.4 First-Acceptance-Wins (FCFS) Emergency Claim
- **REQ-V-209**: Incoming emergency leads display a high-priority alert card with title, locality, and fee.
- **REQ-V-210**: The first technician to claim the job wins atomically via `POST /api/jobs/:id/claim-instant`. Subsequent attempts receive `HTTP 409 Conflict`.
- **REQ-V-211**: A `job_taken` WebSocket broadcast immediately dismisses the prompt on other contractor devices.

### 2.5 Confirmed Jobs & Field Work
- **REQ-V-212**: Full customer address and phone number are unmasked only after official assignment to that contractor.
- **REQ-V-213**: Technicians can launch Google Maps navigation and direct customer phone calls with a single tap.
- **REQ-V-214**: **Arrival OTP Verification**: Technicians must enter the customer's 6-digit OTP via `POST /api/bookings/:id/verify-arrival-otp` to transition the job to `in_progress`.
- **REQ-V-215**: Technicians transition job status (`on_the_way` -> `arrived` -> `in_progress` -> `completed` sign-off).

### 2.6 Financials & Escrow Ledger
- **REQ-V-216**: Vendors view lifetime gross revenue, 10% platform fee deduction, pending escrow, and net settled payouts directly from live database records.
- **REQ-V-217**: Vendors can view transaction history including gross amounts, deductions, net earnings, and settlement status.

---

## 3. Non-Functional Requirements

- **NFR-1 (Web Protection)**: Zero modifications to existing web frontend source code, styles, routes, or backend schemas.
- **NFR-2 (Performance)**: App initial load time under 2 seconds; list scrolling at 60 FPS using optimized `FlatList` implementations.
- **NFR-3 (Offline Resilience)**: Gracefully handle network dropouts with retry prompts and clean error banners.
- **NFR-4 (Security)**: All tokens stored in `SecureStore`; no sensitive credentials logged or stored in plain storage.
- **NFR-5 (Accessibility)**: Minimum touch targets of 44x44pt; high-contrast text conforming to WCAG AA guidelines.
