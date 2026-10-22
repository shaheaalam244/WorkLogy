# WorkLogy — Product Requirements Specification (`REQUIREMENTS.md`)

This document outlines the detailed functional and non-functional requirements for the **WorkLogy** hyperlocal services marketplace.

---

## 1. Executive Summary & Domain Scope

WorkLogy is a hyperlocal marketplace built to streamline the discovery, dispatch, coordination, and fulfillment of home and commercial trade services.

### Core Service Trades Covered:
1. **Electrical**: Wiring, circuit repairs, appliance installations, lighting fixtures.
2. **Plumbing**: Pipe leaks, sanitary fittings, drain unclogging, water heater maintenance.
3. **HVAC & AC**: Air conditioner servicing, gas refilling, duct cleaning, thermostat repair.
4. **Carpentry**: Custom woodwork, furniture repairs, door lock installations.
5. **Painting**: Interior/exterior wall painting, waterproofing, touch-ups.
6. **Cleaning & Sanitation**: Deep house cleaning, sofa/carpet shampooing, disinfection.
7. **Appliance Repair**: Refrigerator, washing machine, microwave, and TV repair.

---

## 2. User Personas

| Persona | Role | Core Objectives & Pain Points |
| :--- | :--- | :--- |
| **Customer (Consumer)** | `customer` | Needs immediate or scheduled skilled trade help. Desires transparent pricing, verified technicians, real-time arrival tracking, and secure fulfillment. |
| **Vendor (Service Pro)** | `vendor` | Independent contractor or local business seeking qualified nearby job leads, predictable dispatch, transparent commission rates, and direct communication with clients. |
| **Administrator** | `admin` | Platform operator managing identity verification, dispute escalation, catalog moderation, audit oversight, and revenue tracking. |

---

## 3. Functional Requirements by Epic

### Epic 1: Identity, Authentication & Profile Management
- **FR-1.1**: Email & password authentication with secure JWT issuance and encrypted cookie / header handling.
- **FR-1.2**: Role assignment during registration (`customer` or `vendor`). Admin accounts are provisioned via database seed or elevated permissions.
- **FR-1.3**: Customer profile management: multiple address entries with geo-coordinates, contact details, emergency phone number.
- **FR-1.4**: Demo login switch for immediate evaluation of Customer, Vendor, and Admin user journeys.

### Epic 2: Vendor Onboarding & Trust Verification
- **FR-2.1**: Multi-step onboarding stepper: Business name, bio, experience years, trade specialization, hourly rates, service radius.
- **FR-2.2**: Document upload for identity proof (Govt ID, Trade License, Insurance Certificate).
- **FR-2.3**: Verification lifecycle: `pending` ➔ `verified` or `rejected` with admin rejection reasons.
- **FR-2.4**: Verified badge display on all public and booking interfaces for verified professionals.

### Epic 3: Hyperlocal Discovery & Search
- **FR-3.1**: Geo-filtered service discovery based on user city, zip code, or latitude/longitude radius.
- **FR-3.2**: Multi-criteria filtering: Service category, verified status, hourly rate bounds, rating threshold (4.0+), and availability.
- **FR-3.3**: Service catalog browsing with fixed vs variable pricing guidelines for each trade.

### Epic 4: Dual Job Dispatch Model
WorkLogy supports two engagement mechanisms:
1. **Direct Booking (`JobRequest`)**:
   - Customer directly books a specific verified technician based on calendar availability.
   - Technician receives instant push/socket notification to accept or decline within 15 minutes.
2. **Open Marketplace Bidding (`Job` & `Application`)**:
   - Customer posts a job with photos, description, budget range, address, and urgency level.
   - Matching vendors within the geographic service area receive lead alerts.
   - Vendors submit competitive proposals (`Applications`) detailing price, turnaround time, and cover note.
   - Customer compares proposals and selects the winning vendor.

### Epic 5: Real-Time Communication & Live Tracking
- **FR-5.1**: One-on-one encrypted chat between assigned customer and vendor per active job.
- **FR-5.2**: Typing indicators, read receipts, and real-time message streaming via Socket.IO.
- **FR-5.3**: Live job status progression:
  `Requested` ➔ `Assigned` ➔ `Vendor En Route` ➔ `In Progress` ➔ `Completed` ➔ `Paid & Closed`.

### Epic 6: Ratings, Reviews & Trust System
- **FR-6.1**: Verified reviews: Reviews can only be submitted after a job has reached `completed` status.
- **FR-6.2**: Detailed rating breakdown: Overall score (1-5 stars), Punctuality, Quality of Work, and Value for Money.
- **FR-6.3**: Aggregate score calculation updated automatically on the vendor's public profile.

### Epic 7: Dispute Resolution & Escalation
- **FR-7.1**: Dispute filing capability for both parties within 48 hours of job completion.
- **FR-7.2**: Dispute statuses: `opened`, `under_review`, `resolved`, `refunded`.
- **FR-7.3**: Admin arbitration console to review conversation logs, job deliverables, and issue refunds or vendor warnings.

### Epic 8: Admin Command Center
- **FR-8.1**: Platform metrics dashboard: Total bookings, gross GMV, active vendors, completion rates.
- **FR-8.2**: Vendor verification review queue with document preview and one-click approve/reject actions.
- **FR-8.3**: Service category and service area management (adding cities, setting minimum rate floors).
- **FR-8.4**: Audit activity log tracking all sensitive actions (role changes, dispute resolutions, account suspensions).

---

## 4. Non-Functional Requirements

### 4.1 Security
- Passwords hashed with `bcryptjs` (work factor 10).
- Stateless JWT auth with role authorization middleware on all protected endpoints.
- Server-side parameter sanitization and express-validator checks.
- Rate limiting to protect against brute-force and DoS attacks.

### 4.2 Performance
- Frontend initial page load < 1.5 seconds via Vite code-splitting and asset compression.
- REST API response time < 150ms for indexed MongoDB queries.
- WebSocket message latency < 50ms over local network.

### 4.3 Usability & Design
- Responsive layouts tested on mobile (375px+), tablet (768px+), and desktop (1024px+).
- Clean, accessible contrast ratios adhering to WCAG 2.1 AA standards.
- Micro-animations for feedback, modal transitions, and interactive controls.
