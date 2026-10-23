# WorkLogy Mobile Applications — Verified Architecture & Technical Design (`mobile/ARCHITECTURE.md`)

This document provides the authoritative architectural blueprint, verified directory structures, data flow models, and technical contracts for the **WorkLogy Mobile Applications** (`customer-app` and `vendor-app`).

---

## 1. System Overview & Multi-Client Architecture

WorkLogy operates a unified full-stack ecosystem where multiple client platforms communicate with a single authoritative Node.js/Express backend and MongoDB Atlas database.

```text
                                  ┌──────────────────────────────────────────────┐
                                  │          WorkLogy Central Backend            │
                                  │    Node.js (ESM) • Express • MongoDB Atlas   │
                                  │          Socket.IO (Port 5001)               │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                         ┌───────────────────────────────┼──────────────────────────────┐
                         ▼                               ▼                              ▼
          ┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
          │      Web Application        │  │     Customer Mobile App     │  │      Vendor Mobile App      │
          │         (frontend/)         │  │   (mobile/customer-app/)    │  │    (mobile/vendor-app/)     │
          ├─────────────────────────────┤  ├─────────────────────────────┤  ├─────────────────────────────┤
          │ • React 18 + Vite           │  │ • React Native 0.86 + Expo  │  │ • React Native 0.86 + Expo  │
          │ • Tailwind CSS              │  │ • 5-Tab Navigation          │  │ • 4-Tab Navigation          │
          │ • Public Portal & Admin     │  │ • 30 Trade Catalog Discovery│  │ • Online/Offline Toggle     │
          │ • Customer & Vendor Web     │  │ • Job Creation & Emergency  │  │ • Masked Tender Feed        │
          │ • Desktop & Mobile Web      │  │ • 6-Digit Arrival OTP View  │  │ • FCFS Emergency Claim      │
          │                             │  │ • Review & Escrow Tracking  │  │ • Arrival OTP Verification  │
          │                             │  │                             │  │ • Escrow Earnings Ledger    │
          └─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
```

---

## 2. Verified Repository Structure

```text
/Users/shaheaalam/Desktop/worklogy/
├── backend/                   # Express REST API, Mongoose Models, Socket.IO Server (Port 5001)
├── frontend/                  # React 18 + Vite Customer/Vendor/Admin Web App (Port 5173)
├── mobile/
│   ├── AGENTS.md              # Master operating rules & governance for mobile coding agents
│   ├── ARCHITECTURE.md        # This document: Verified mobile technical architecture
│   ├── MEMORY.md              # Durable engineering decisions, API contracts & bug post-mortems
│   ├── README.md              # Developer setup, execution, and build guide
│   ├── REQUIREMENTS.md        # Granular functional & non-functional requirements (REQ-C/REQ-V)
│   ├── TASKS.md               # Prioritized implementation backlog & status
│   │
│   ├── customer-app/          # Standalone Customer Expo Project
│   │   ├── src/
│   │   │   ├── api/           # client.ts (Typed HTTP calls to /api/*)
│   │   │   ├── assets/        # icons, splash, services/ (33 high-res PNG photography assets)
│   │   │   ├── components/    # Header.tsx, LocationModal.tsx, UI badges
│   │   │   ├── config/        # index.ts (EXPO_PUBLIC_API_URL resolver)
│   │   │   ├── constants/     # Storage keys, design tokens
│   │   │   ├── context/       # AuthContext.tsx (User state, login, register, logout)
│   │   │   ├── hooks/         # useAuth.ts
│   │   │   ├── navigation/    # CustomerNavigator.tsx (5 tabs: Home, Search, Post Job, Messages, Profile)
│   │   │   ├── screens/       # 14 Customer Screens (HomeScreen, CategoryDetail, CreateJob, Emergency, etc.)
│   │   │   ├── services/      # socket.ts (Socket.IO client integration)
│   │   │   ├── storage/       # secureStorage.ts (SecureStore with in-memory fallback)
│   │   │   ├── theme/         # colors.ts (WorkLogy palette tokens)
│   │   │   ├── types/         # index.ts (TypeScript interfaces for Job, Booking, User)
│   │   │   └── utils/         # categoryIcons.tsx, serviceImages.ts, formatters.ts
│   │   ├── App.tsx            # Root component with SafeAreaProvider & StatusBar
│   │   ├── app.json           # Expo manifest (bundle: com.worklogy.customer)
│   │   ├── package.json       # Expo SDK 57, React Native 0.86, React 19
│   │   └── tsconfig.json      # TypeScript compiler configuration
│   │
│   └── vendor-app/            # Standalone Vendor Pro Expo Project
│       ├── src/
│       │   ├── api/           # client.ts (Typed HTTP calls to /api/*)
│       │   ├── assets/        # icons, splash, services/ (33 high-res PNG photography assets)
│       │   ├── components/    # Header.tsx, KPI cards, Status badges
│       │   ├── config/        # index.ts (EXPO_PUBLIC_API_URL resolver)
│       │   ├── constants/     # Storage keys, design tokens
│       │   ├── context/       # AuthContext.tsx (Vendor auth state, availability sync)
│       │   ├── hooks/         # useAuth.ts
│       │   ├── navigation/    # VendorNavigator.tsx (4 tabs: Home, Jobs, Earnings, Profile)
│       │   ├── screens/       # 11 Vendor Screens (VendorHomeScreen, JobsScreen, Earnings, Dossier, etc.)
│       │   ├── services/      # socket.ts (Socket.IO client integration)
│       │   ├── storage/       # secureStorage.ts (SecureStore with in-memory fallback)
│       │   ├── theme/         # colors.ts (Deep navy, warm off-white, forest green palette)
│       │   ├── types/         # index.ts (TypeScript interfaces for Job, Booking, VendorProfile)
│       │   └── utils/         # categoryIcons.tsx, serviceImages.ts, formatters.ts
│       ├── App.tsx            # Root component with SafeAreaView & dark-content StatusBar
│       ├── app.json           # Expo manifest (bundle: com.worklogy.vendor)
│       ├── package.json       # Expo SDK 57, React Native 0.86, React 19
│       └── tsconfig.json      # TypeScript compiler configuration
```

---

## 3. Technology Stack & Core Dependencies

Both mobile projects use identical, modern React Native dependencies:

| Dependency | Version | Purpose |
| :--- | :--- | :--- |
| `expo` | `~57.0.31` | Managed Expo SDK environment, asset loading, build tooling |
| `react` | `19.2.3` | Core UI library |
| `react-native` | `0.86.3` | Native runtime primitives |
| `@expo/vector-icons` | `^15.1.1` | Vector icon families (Ionicons, MaterialCommunityIcons, Feather, FontAwesome5) |
| `socket.io-client` | `^4.8.1` | Real-time WebSocket connection to backend for instant leads & messaging |
| `expo-status-bar` | `~57.0.1` | Native status bar styling control |
| `typescript` | `~5.6.3` | Static type checking and strict interface adherence |

---

## 4. Navigation Architecture

Both applications use clean, state-driven router containers that provide zero-native-linking overhead, deep stack history, and type-safe route parameters.

### Customer App Navigation (`CustomerNavigator.tsx`)
- **Fixed 5-Item Bottom Navigation Bar**:
  1. `HomeTab`: Brand header, search, 3x3 category grid, featured repairs card, popular services carousel.
  2. `SearchTab` (`ExploreTab`): Full 30-category directory with trade group filtering.
  3. `PostJobTab` (`CreateJob`): Multi-step service request wizard.
  4. `MessagesTab`: Real-time conversation list and customer-vendor chat.
  5. `ProfileTab`: Saved addresses, account details, active role switcher.
- **Stack Screens**: `CategoryDetail`, `Emergency`, `MyJobs`, `JobDetail`, `ChatDetail`, `Notifications`, `ReviewModal`, `Login`, `Register`.

### Vendor App Navigation (`VendorNavigator.tsx`)
- **Fixed 4-Item Bottom Navigation Bar**:
  1. `VendorHomeTab`: Compact header, online/offline availability switch, 3x3 category grid, featured repair card, popular services carousel.
  2. `JobsTab`: Unified tender manager with 6 filter tabs (`new`, `quoted`, `accepted`, `in_progress`, `completed`, `cancelled`) and interactive Quotation Modal.
  3. `EarningsTab`: 4 KPI financial cards, Monday NEFT settlement notice, 10% platform fee transaction ledger.
  4. `ProfileTab`: Contractor profile card, KYC statutory verification modal, business editing, territory controls.
- **Stack Screens**: `Notifications`, `VendorJobDetail`, `ChatDetail`, `VendorLogin`, `VendorRegister`.

---

## 5. Authentication & Session Management

1. **JWT Auth Protocol**: Login (`POST /api/auth/login`) or Register (`POST /api/auth/register`) issues a cryptographically signed JWT token with a 30-day validity window.
2. **Universal Secure Storage Adapter** (`src/storage/secureStorage.ts`):
   - Dynamically loads `expo-secure-store` when available on native devices.
   - Transparently falls back to an in-memory key-value map in headless/Node test environments.
   - Prevents keychain crashes during CI, test runs, and headless scripts.
3. **Session Restoration**: On app launch, `AuthProvider` reads `worklogy_auth_token` and calls `GET /api/auth/me`. If valid, user state is hydrated; if expired (401), tokens are cleared and the user is redirected to the login view.
4. **Role Isolation**:
   - Customers receive role `'customer'` and are restricted by backend middleware `authorize('vendor')`.
   - Vendors receive role `'vendor'` and must maintain an approved profile record (`VendorProfile`) to submit quotations.

---

## 6. Shared API Client & Network Architecture

Both apps communicate with the central backend via `src/api/client.ts`:

- **Base URL Resolution** (`src/config/index.ts`): Reads `process.env.EXPO_PUBLIC_API_URL`.
  - iOS Simulator: `http://localhost:5001/api`
  - Android Emulator: `http://10.0.2.2:5001/api`
  - Physical Devices: `http://<LAN_IP>:5001/api`
  - Staging/Production: `https://api.worklogy.in/api`
- **Automatic Bearer Token Injection**: Every request with `requiresAuth: true` pulls the token from `secureStorage` and appends `Authorization: Bearer <token>`.
- **Structured Error Handling**: HTTP error responses (`400`, `401`, `403`, `404`, `409`, `500`) are parsed and re-thrown with human-readable error messages extracted from `response.data.message` or `response.data.error`.

---

## 7. Shared Data Model & The 11 Job Statuses

All clients observe the central MongoDB `Job` and `Booking` lifecycle:

| Status Enum | Meaning & Business Rule | Customer Action | Vendor Action |
| :--- | :--- | :--- | :--- |
| `open` | Tender broadcast to eligible local contractors | Can cancel | Can submit quote or instant claim |
| `pending_acceptance` | Quotation submitted by contractor | Can accept / reject quote | Can withdraw proposal |
| `awaiting_confirmation`| Customer selected quote; payment held in escrow | Review price breakdown | Await contract lock |
| `confirmed` / `scheduled`| Contract confirmed; 6-digit Arrival OTP generated | View scheduled time & OTP | View unmasked address; Start Journey |
| `on_the_way` | Contractor en route to service location | Track live status; Prepare OTP | Launch Google Maps navigation |
| `arrived` | Contractor arrived physically at site | Disclose 6-digit Arrival OTP | Enter 6-digit OTP into dialog |
| `in_progress` | Arrival OTP verified; work underway | Observe progress | Perform service; record work notes |
| `completion_pending` | Contractor marked work complete | Review work & Approve Sign-off | Await customer approval |
| `completed` | Sign-off confirmed; escrow released | Submit 1–5 Star Review | View earnings in ledger |
| `cancelled` | Request cancelled before execution | View cancellation policy | View cancellation reason |
| `disputed` | Dispute filed for arbitration | Contact WorkLogy Support | Provide work evidence to admin |

---

## 8. Real-Time WebSocket Infrastructure

Powered by `socket.io-client` connecting to `http://<host>:5001`:

- `emergency_broadcast`: Emitted when an emergency job is posted; received by nearby available vendors.
- `job_taken`: Emitted upon atomic first-acceptance of an emergency lead; immediately dismisses the lead on all other contractor screens.
- `booking_confirmed`: Notifies the winning vendor that their quote was accepted.
- `job_status_updated`: Pushes state changes (`on_the_way`, `arrived`, `in_progress`, `completed`) to customer tracking screens in real time.
- `chat_message`: Delivers live chat bubbles between customer and technician.

---

## 9. Image & Asset Management Architecture

1. **Authentic Photography Assets**:
   - 33 high-resolution landscape PNG assets stored in `src/assets/services/` for every canonical trade category (Electrician, Plumber, AC Repair, Cleaning, Carpenter, Painting, Locksmith, etc.).
   - Homepage heroes (`Expert Homepage.png`, `SmilingHomepage.png`, `Homepage.png`).
2. **Category Media Mappers**:
   - `src/utils/serviceImages.ts`: Resolves category slugs and trade keywords to local bundled assets with resilient fallback to `Homepage.png`.
   - `src/utils/categoryIcons.tsx`: Maps canonical trade categories to native vector icons with custom background colors and icons. Guarantees zero raw-string rendering crashes.

---

## 10. Verified Build, Test & Lint Commands

### Customer Mobile App (`mobile/customer-app/`):
```bash
# 1. Type check
npx tsc --noEmit

# 2. Local dev server
npx expo start

# 3. Android Metro bundle verification
npx expo export -p android --no-bytecode
```

### Vendor Mobile App (`mobile/vendor-app/`):
```bash
# 1. Type check
npx tsc --noEmit

# 2. Local dev server
npx expo start

# 3. Android Metro bundle verification
npx expo export -p android --no-bytecode
```

### Web Frontend Regressions (`frontend/`):
```bash
# 1. Unit tests
node --test src/utils/*.test.js

# 2. Production build
npm run build
```

---

## 11. Known Technical Constraints & Distinctions

1. **Physical Device Network Binding**: Physical mobile devices running Expo Go cannot reach `localhost:5001`. The development computer's LAN IP (e.g. `192.168.1.15:5001`) must be specified in `.env`.
2. **React 19 Export Compatibility**: React 19 types deprecate certain top-level namespace properties (`React.Fragment`). Use pure `View` containers or named imports to preserve bundler stability.
3. **Atomic Concurrency Boundary**: Instant emergency claims are strictly server-authoritative (`Job.findOneAndUpdate({ _id, status: 'open', selectedVendor: null })`). Frontend clients must gracefully handle `HTTP 409 Conflict`.
