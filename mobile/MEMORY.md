# WorkLogy Mobile Applications — Engineering Memory & Technical Decisions (`mobile/MEMORY.md`)

This document preserves durable architecture decisions, verified backend API contracts, core business rules, and bug post-mortems for the **WorkLogy Mobile Applications**.

---

## 1. Durable Architecture Decisions (Do Not Reverse)

1. **Independent App Directories (`mobile/customer-app` & `mobile/vendor-app`)**:
   - Both mobile projects operate as self-contained Expo/React Native projects with independent `package.json` manifests.
   - We strictly avoid monorepo workspace linking (`npm workspaces` or Lerna symlinks) because React Native Metro bundler symlink resolution causes version collisions and packaging failures.
2. **Universal In-Memory SecureStore Fallback**:
   - `expo-secure-store` requires native keychain modules that are absent in headless Node.js unit tests and CI runners.
   - `src/storage/secureStorage.ts` wraps `expo-secure-store` with dynamic import and maintains an in-memory key-value map fallback. This guarantees test suites never fail on missing native keychains.
3. **State-Driven Navigation Containers**:
   - Rather than introducing complex third-party native navigation libraries with binary linking requirements, both apps use state-driven navigation containers (`CustomerNavigator.tsx` and `VendorNavigator.tsx`) managing tab switches, push/pop route history, and parameter passing.
4. **Local Asset Bundling for Photography**:
   - All 33 trade photography assets reside in `src/assets/services/` of each mobile app and are imported via `src/utils/serviceImages.ts`. This ensures offline visual resilience and eliminates remote image loading latency or CDN bandwidth costs.
5. **Strict Web Frontend Isolation**:
   - The web frontend (`frontend/`) and admin dashboard are in production use. Mobile tasks must **never** touch web files, Tailwind configurations, or web dependencies.

---

## 2. Authoritative API Conventions & Endpoint Contracts

All mobile requests target the central Express API (`/api/*`):

| Domain | Method | Route | Auth | Payload / Parameters | Response Structure |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/login` | Public | `{ email, password }` | `{ success: true, token, user }` |
| **Auth** | `POST` | `/api/auth/register` | Public | `{ name, email, phone, password, role }` | `{ success: true, token, user }` |
| **Auth** | `GET` | `/api/auth/me` | Bearer | Header token | `{ success: true, user }` |
| **Auth** | `PATCH`| `/api/auth/role` | Bearer | `{ role: 'customer' \| 'vendor' }` | `{ success: true, user, token }` |
| **Catalog**| `GET` | `/api/categories` | Public | None | `{ success: true, count, categories: [] }` |
| **Jobs** | `POST` | `/api/jobs` | Customer | `{ category, title, description, address, urgency, pricing }` | `{ success: true, job }` |
| **Jobs** | `GET` | `/api/jobs/my-jobs` | Customer | `?status=open` | `{ success: true, count, jobs: [] }` |
| **Jobs** | `GET` | `/api/jobs/open` | Bearer | `?urgency=emergency&category=slug` | `{ success: true, count, jobs: [] }` (Addresses masked) |
| **Jobs** | `GET` | `/api/jobs/:id` | Bearer | Route param `:id` | `{ success: true, job }` |
| **Emergency**| `POST`| `/api/jobs/:id/claim-instant`| Vendor | None | `{ success: true, message, booking }` or `409 Conflict` |
| **Proposals**| `POST`| `/api/applications` | Vendor | `{ jobId, proposedAmount, coverLetter, estimatedDuration, materialCharges }` | `{ success: true, message }` |
| **Proposals**| `GET` | `/api/applications/vendor`| Vendor | None | `{ success: true, count, applications: [] }` |
| **Bookings** | `GET` | `/api/bookings/my-bookings`| Bearer | `?status=in_progress` | `{ success: true, count, bookings: [] }` |
| **Bookings** | `GET` | `/api/bookings/:id` | Bearer | Route param `:id` | `{ success: true, booking }` |
| **Bookings** | `PATCH`| `/api/bookings/:id/status` | Bearer | `{ status: 'on_the_way' \| 'arrived' }` | `{ success: true, message, booking }` |
| **Arrival OTP**| `POST`| `/api/bookings/:id/verify-arrival-otp`| Vendor | `{ otp: '123456' }` | `{ success: true, message, booking }` |
| **Sign-Off** | `POST` | `/api/bookings/:id/complete-signoff` | Vendor | `{ feedback }` | `{ success: true, message, booking }` |
| **Vendor Profile**| `GET`| `/api/vendors/profile/me` | Vendor | None | `{ success: true, vendor: VendorProfile }` |
| **Vendor Profile**| `PUT`| `/api/vendors/profile/me` | Vendor | `{ businessName, bio, serviceAreas, experienceYears }` | `{ success: true, vendor }` |
| **Availability**| `PUT` | `/api/vendors/availability` | Vendor | `{ isAvailableNow: boolean }` | `{ success: true, availability }` |
| **Earnings** | `GET` | `/api/vendors/earnings` | Vendor | None | `{ success: true, earnings: { netTotal, pendingEscrow, completedJobsCount } }` |
| **Ledger** | `GET` | `/api/vendors/transactions` | Vendor | `?status=held_in_escrow` | `{ success: true, count, transactions: [] }` |
| **KYC Docs** | `POST` | `/api/vendors/verification` | Vendor | `{ idType, documentUrl, statutoryConsent }` | `{ success: true, message }` |
| **Notifications**| `GET`| `/api/notifications` | Bearer | None | `{ success: true, count, notifications: [] }` |
| **Notifications**| `GET`| `/api/notifications/unread-count`| Bearer | None | `{ success: true, count: number }` |
| **Notifications**| `PATCH`| `/api/notifications/read-all`| Bearer | None | `{ success: true }` |
| **Chat** | `GET` | `/api/chat/conversations/:id/messages` | Bearer | Route param `:id` | `{ success: true, messages: [] }` |
| **Chat** | `POST` | `/api/chat/messages` | Bearer | `{ receiverId, text, conversationId }` | `{ success: true, message }` |

---

## 3. Confirmed Business Rules & Guardrails

1. **Address Privacy Masking**:
   - Open tenders returned by `/api/jobs/open` MUST mask customer street addresses, house numbers, and exact GPS coordinates to contractors.
   - The UI displays only the locality and approximate distance: `📍 Near Gomti Nagar (~2.4 km away)`.
   - Full address details are revealed **only** to the specific contractor confirmed for that booking.
2. **First-Acceptance-Wins (FCFS) Emergency Dispatch**:
   - Claiming an emergency lead uses atomic database locking: `Job.findOneAndUpdate({ _id, status: { $in: ['open', 'dispatching'] }, selectedVendor: null })`.
   - The winning vendor receives `HTTP 200 OK` and a created booking with a generated 6-digit Arrival OTP.
   - Any concurrent second contractor attempting to claim receives `HTTP 409 Conflict: "This job has already been accepted by another professional."`
   - Real-time `job_taken` broadcast immediately removes the lead from all other contractor screens.
3. **6-Digit Physical Arrival OTP Verification**:
   - The customer's mobile screen generates and displays a secure 6-digit Arrival OTP (`booking.arrivalOtp`).
   - The technician inputs the code via the Arrival Verification dialog upon reaching the physical site.
   - The backend validates the code via `POST /api/bookings/:id/verify-arrival-otp`, transitions status to `in_progress`, and sets `isOtpVerified: true`.
4. **100% Escrow Protection & Weekly Settlements**:
   - Payments are deposited into escrow upon booking confirmation.
   - WorkLogy deducts a transparent 10% platform service fee upon sign-off.
   - Net earnings are automatically disbursed to the contractor's verified bank account every Monday via NEFT/IMPS.

---

## 4. Resolved Bugs & Technical Post-Mortems

1. **React Object Rendering Crash in Emergency Leads**:
   - *Problem*: Runtime exception `Objects are not valid as a React child (found: object with keys {_id, slug, icon, name})`.
   - *Cause*: `jobAPI.getEmergencyLeads()` populated `category` as an object `{ _id, slug, name }` instead of a string slug, which was rendered directly inside JSX spans `<Text>{lead.category}</Text>`.
   - *Fix*: Created safe formatter `typeof category === 'object' ? category.name : category` and used category slug resolvers across all job cards.
2. **React 19 Named Export Type Mismatch**:
   - *Problem*: `src/screens/EarningsScreen.tsx` encountered `TS2305: Module '"react"' has no exported member 'Fragment'`.
   - *Cause*: React 19 type definitions strictness under React Native Expo bundler.
   - *Fix*: Replaced raw `Fragment` keys with dedicated React Native `<View key={item._id || index}>` wrapper elements.
3. **Booking Status Enum Mismatch**:
   - *Problem*: TypeScript error `TS2367: This comparison appears to be unintentional` when comparing `booking.status === 'completion_pending'`.
   - *Cause*: `types/index.ts` Booking interface only defined 9 statuses, missing `completion_pending`, `scheduled`, `assigned`, and `awaiting_confirmation`.
   - *Fix*: Aligned `Booking.status` in `types/index.ts` with all 11 backend status enums.
4. **Vendor Card Undeclared Reference Error**:
   - *Problem*: `ReferenceError: isVendor is not defined` in `VendorCard.jsx`.
   - *Cause*: `isVendor` variable was referenced before being extracted from `useAuth().user`.
   - *Fix*: Explicitly declared `const isVendor = user?.role === 'vendor';` in card root.

---

## 5. Prohibited Actions & Invariant Guarantees

- **NEVER** introduce mock data into production API clients.
- **NEVER** hardcode production database URIs or JWT secrets into mobile client code.
- **NEVER** edit files in `frontend/` when executing mobile tasks.
- **NEVER** bypass backend RBAC authorization checks.
