# WorkLogy Mobile Applications — Project Handover & Memory (`mobile/MEMORY.md`)

This document tracks implementation status, verified API contracts, key technical decisions, and operational knowledge for the **WorkLogy Mobile Applications**.

---

## 1. Project Directory Structure

```text
worklogy/mobile/
├── customer-app/          # Standalone Customer Expo React Native project
├── vendor-app/            # Standalone Vendor Pro Expo React Native project
├── AGENTS.md              # Operating guidelines for mobile coding agents
├── ARCHITECTURE.md        # Technical architecture and workflow designs
├── MEMORY.md              # Project handover log (this document)
├── README.md              # Setup and execution guide
├── REQUIREMENTS.md        # Functional and non-functional specifications
└── TASKS.md               # Prioritized development checklist
```

---

## 2. Confirmed & Reused Backend API Contracts

All endpoints were verified against the live Express backend controllers:

| Category | Endpoint | Method | Verified Payload / Behavior |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth/login` | `POST` | `{ email, password }` -> Returns `{ success, token, user }` |
| **Auth** | `/api/auth/register` | `POST` | `{ name, email, phone, password, role }` -> Returns `{ success, token, user }` |
| **Auth** | `/api/auth/me` | `GET` | Bearer Token -> Returns `{ success, user }` |
| **Auth** | `/api/auth/role` | `PATCH` | `{ role }` -> Updates active portal role |
| **Catalog** | `/api/categories` | `GET` | Returns 30 canonical trade domains with subcategories and icons |
| **Jobs** | `/api/jobs` | `POST` | `{ category, title, description, address, urgency, pricing }` -> Creates Job |
| **Jobs** | `/api/jobs/my-jobs` | `GET` | Returns customer's jobs |
| **Jobs** | `/api/jobs/open` | `GET` | Returns nearby open tenders (with masked customer address) |
| **Emergency** | `/api/jobs/:id/claim-instant`| `POST`| First-acceptance-wins claim. Returns `{ success: true, booking }` or `409 Conflict` |
| **Bookings** | `/api/bookings/my-bookings` | `GET` | Returns full booking list with customer/vendor population |
| **Bookings** | `/api/bookings/:id/status` | `PATCH` | `{ status: 'on_the_way' | 'arrived' }` -> Updates job state |
| **Arrival OTP** | `/api/bookings/:id/verify-arrival-otp`| `POST`| `{ otp: '482910' }` -> Sets `isOtpVerified: true`, status `in_progress` |
| **Sign-Off** | `/api/bookings/:id/complete-signoff` | `POST`| `{ feedback }` -> Records work notes & triggers escrow release |
| **Vendor** | `/api/vendors/availability` | `PUT` | `{ isAvailableNow: boolean }` -> Toggles online dispatch radar |
| **Vendor** | `/api/vendors/earnings` | `GET` | Returns `{ lifetimeGross, platformFees, netTotal, pendingEscrow, settledToBank }` |
| **Vendor** | `/api/vendors/transactions` | `GET` | Returns ledger array with gross, fee, net amounts, and settlement status |
| **Vendor** | `/api/vendors/verification` | `POST` | `{ idType, documentUrl, statutoryConsent }` -> Submits KYC for admin review |
| **Reviews** | `/api/reviews` | `POST` | `{ booking, rating, comment }` -> Submits verified review (1 per booking) |
| **Chat** | `/api/chat/messages` | `GET`/`POST` | Live chat messages between customer and contractor |

---

## 3. Important Architectural Decisions

1. **Strict Web Isolation**: Neither mobile project touches `frontend/` or `backend/`. No shared node_modules workspaces or monorepo tools were introduced to eliminate dependency drift.
2. **Standard Folder Symmetry**: Both `customer-app/` and `vendor-app/` follow identical directory structures (`api`, `assets`, `components`, `config`, `constants`, `context`, `hooks`, `navigation`, `screens`, `services`, `storage`, `theme`, `types`, `utils`).
3. **Universal Secure Storage**: Wrapped `expo-secure-store` with dynamic import and an in-memory Map fallback. This guarantees that test scripts, CI pipelines, and simulators never crash on missing native keychains.
4. **State-Driven Universal Navigation**: Clean custom state-driven router container implementing tab bars, stack push/pop history, and parameter passing without native library linking headaches.
5. **No Secrets on Client**: `EXPO_PUBLIC_API_URL` is used strictly for public API base URLs. Sensitive signing credentials and database URIs remain server-side.

---

## 4. Verification History

- **Mobile Architecture Tests**: 9/9 passing (`worklogy/frontend/src/utils/mobileArchitecture.test.js`).
- **Web Frontend Regression**: 148/148 passing across 31 test suites (`node --test src/utils/*.test.js`).
- **Web Production Build**: Passing cleanly in 2.63s (`npm run build` in `worklogy/frontend`).
