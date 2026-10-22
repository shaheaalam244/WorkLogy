# WorkLogy Mobile Applications — Architecture & System Design (`mobile/ARCHITECTURE.md`)

This document defines the high-level architecture, directory patterns, data flow contracts, and integration models for the **WorkLogy Mobile Applications**.

---

## 1. System Overview & Two-App Architecture

```text
                               ┌──────────────────────────────────────────────┐
                               │       WorkLogy Central Backend API           │
                               │   Node.js • Express • MongoDB • Socket.IO    │
                               └──────────────────────┬───────────────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       │ REST APIs & Real-Time WebSocket Events                      │
                       ▼                                                             ▼
        ┌──────────────────────────────┐                             ┌──────────────────────────────┐
        │     Customer Mobile App      │                             │      Vendor Pro Mobile App   │
        │   (mobile/customer-app)      │                             │     (mobile/vendor-app)      │
        ├──────────────────────────────┤                             ├──────────────────────────────┤
        │ • 30-Category Discovery      │                             │ • Online / Offline Toggle    │
        │ • Service Request Wizard     │                             │ • Nearby Tenders Feed (Masked│
        │ • 24/7 Rapid Emergency Radar │                             │ • FCFS Emergency Claim ⚡     │
        │ • Arrival OTP Display        │                             │ • Full Disclosed Dossier     │
        │ • Real-Time Client Chat      │                             │ • 6-Digit OTP Arrival Check  │
        │ • 1-5 Star Review Modal      │                             │ • Completion Sign-off        │
        │ • Customer Profile & Address │                             │ • Earnings & Escrow Ledger   │
        └──────────────────────────────┘                             └──────────────────────────────┘
```

Both mobile applications are completely isolated React Native / Expo projects residing in `worklogy/mobile/`. They share the canonical backend database as their single source of truth and respect existing business logic without duplication.

---

## 2. Directory Layout & Structure

Both apps strictly adhere to the standard directory layout:

```text
worklogy/mobile/
├── customer-app/
│   ├── src/
│   │   ├── api/          # Typed HTTP API client (calls /api/*)
│   │   ├── assets/       # App icons, splash images, brand vectors
│   │   ├── components/   # Reusable UI primitives (Badges, Cards, Skeletons)
│   │   ├── config/       # Environment & base URL resolvers
│   │   ├── constants/    # Design tokens, storage keys, socket event names
│   │   ├── context/      # AuthContext for session state
│   │   ├── hooks/        # useAuth and custom reactivity hooks
│   │   ├── navigation/   # CustomerNavigator (Tab bar + Stack routing)
│   │   ├── screens/      # All 13 Customer screens (Home, Explore, Jobs, etc.)
│   │   ├── services/     # Socket.IO connection manager & push listeners
│   │   ├── storage/      # SecureStore token storage with in-memory fallback
│   │   ├── theme/        # Colors, typography, spacing tokens
│   │   ├── types/        # TypeScript contracts for jobs, bookings, user
│   │   └── utils/        # Currency (INR ₹), date, status badge formatters
│   ├── App.tsx           # Application root & safe area provider
│   ├── app.json          # Expo configuration & bundle identifiers
│   ├── package.json      # Independent dependencies
│   ├── tsconfig.json     # TypeScript strict configuration
│   └── .env.example      # Sample environment variables
│
└── vendor-app/
    ├── src/
    │   ├── api/          # Typed HTTP API client (calls /api/*)
    │   ├── assets/       # App icons, splash images, brand vectors
    │   ├── components/   # Reusable UI primitives (KPI cards, Modals)
    │   ├── config/       # Environment & base URL resolvers
    │   ├── constants/    # Design tokens, storage keys, socket event names
    │   ├── context/      # AuthContext for session state
    │   ├── hooks/        # useAuth and custom reactivity hooks
    │   ├── navigation/   # VendorNavigator (Tab bar + Stack routing)
    │   ├── screens/      # All 10 Vendor screens (Home, Tenders, Earnings, etc.)
    │   ├── services/     # Socket.IO connection manager & push listeners
    │   ├── storage/      # SecureStore token storage with in-memory fallback
    │   ├── theme/        # Colors, typography, spacing tokens
    │   ├── types/        # TypeScript contracts for jobs, bookings, user
    │   └── utils/        # Currency (INR ₹), date, status badge formatters
    ├── App.tsx           # Application root & safe area provider
    ├── app.json          # Expo configuration & bundle identifiers
    ├── package.json      # Independent dependencies
    ├── tsconfig.json     # TypeScript strict configuration
    └── .env.example      # Sample environment variables
```

---

## 3. Authentication & RBAC Boundaries

1. **Authentication Mechanism**: Standard JWT (JSON Web Tokens) issued upon `POST /api/auth/login` or `POST /api/auth/register`.
2. **Secure Token Storage**: The JWT token is securely saved in `Expo SecureStore` under the key `worklogy_auth_token`. On subsequent app launches, `restoreSession()` fetches `/api/auth/me` to hydrate the user profile.
3. **Role Enforcement**:
   - `Customer App`: Accesses `/api/jobs/my-jobs`, `/api/bookings/my-bookings`, `/api/reviews`. Restricted from vendor tender feeds or contractor management.
   - `Vendor App`: Accesses `/api/jobs/open`, `/api/vendors/availability`, `/api/vendors/earnings`, `/api/bookings/:id/verify-arrival-otp`. Enforces vendor verification status and role checks on the backend.

---

## 4. Critical Business Workflows

### A. Address Privacy & Masking Rules
- **Tender Feed (`AvailableJobsScreen`)**: Contractors only see approximate localities (e.g. `Near Sector 62, Noida (~2.4 km away)`). Exact customer house numbers and street addresses remain masked to protect homeowner privacy.
- **Confirmed Assignments (`ConfirmedJobsScreen`)**: Once a booking is assigned to a specific contractor, the full address (`houseNumber`, `street`, `landmark`, `pincode`) is unmasked alongside direct customer calling and messaging controls.

### B. First-Acceptance-Wins (FCFS) Emergency Dispatch
1. Customer initiates an emergency request via `EmergencyScreen`.
2. Backend receives `POST /api/jobs` with `urgency: 'emergency'` and broadcasts an `emergency_broadcast` WebSocket event to all nearby, available certified vendors.
3. Technicians receive a high-priority alert on `VendorHomeScreen` and `AvailableJobsScreen`.
4. The first contractor to tap **"Accept Emergency Call Now ⚡"** claims the assignment atomically via `POST /api/jobs/:id/claim-instant`.
5. Once claimed, the server broadcasts `job_taken` over Socket.IO, which immediately dismisses the prompt on all other contractor devices. If a second vendor attempts to claim simultaneously, the server responds with `HTTP 409 Conflict`.

### C. 6-Digit Physical Arrival OTP Verification
1. When a booking is confirmed, the customer is assigned a secure 6-digit Arrival OTP (`booking.arrivalOtp`).
2. The technician travels to the customer's location and requests the code upon physical arrival.
3. The technician inputs the code via the **"Enter Arrival OTP 🔑"** modal, calling `POST /api/bookings/:id/verify-arrival-otp`.
4. Only upon successful cryptographic match does the server mark `isOtpVerified: true` and transition the job status to `in_progress`.

### D. Financials & Transparent Escrow
All payments are secured in escrow. The Vendor App displays:
- **Lifetime Gross Billing**: Total customer amount.
- **WorkLogy Platform Fee**: Transparent 5–10% deduction.
- **Pending Escrow**: Value of active jobs awaiting completion.
- **Net Disbursed**: Automated weekly NEFT settlements to verified bank accounts every Monday.

---

## 5. Network & API Configuration

| Environment | Base URL Pattern | Note |
| :--- | :--- | :--- |
| **Simulator (iOS)** | `http://localhost:5001/api` | Direct localhost loopback |
| **Emulator (Android)**| `http://10.0.2.2:5001/api` | Android host loopback alias |
| **Physical Device (Expo Go)** | `http://192.168.x.x:5001/api` | Reachable LAN IP of development machine |
| **Staging / Production** | `https://api.worklogy.in/api` | Fully qualified HTTPS endpoint |

The base URL is loaded through `config/index.ts` from `EXPO_PUBLIC_API_URL`.
