# WorkLogy Mobile Applications — Agent Operating Guidelines & Governance (`mobile/AGENTS.md`)

This document defines the operating rules, engineering standards, behavioral protocols, and security guardrails for AI agents and engineers working on the **WorkLogy Mobile Applications** (`customer-app` and `vendor-app`).

---

## 1. Scope Boundary & Core Principles

- **Dedicated Directory Only**: All mobile code, assets, configuration, and documentation must reside strictly inside `worklogy/mobile/customer-app/` or `worklogy/mobile/vendor-app/`.
- **Zero Web & Backend Interference**: The existing web frontend (`worklogy/frontend`) and backend API (`worklogy/backend`) are production-ready. Never modify, refactor, rename, move, or delete web files or backend database models.
- **Single Source of Truth**: Mobile applications must connect to the existing Express backend REST APIs and Socket.IO infrastructure. Never create a separate mobile backend, duplicate business rules, or introduce fake mock datasets.
- **Self-Contained Applications**: Both `customer-app` and `vendor-app` are independent Expo/React Native projects. Each must remain independently installable, runnable, and buildable without requiring monorepo tooling or shared package links.

---

## 2. Pre-Execution Protocol for Mobile Developers

Before writing or editing mobile code:
1. **Inspect Before Changing**: Inspect the existing backend routes in `backend/src/routes/` and controllers in `backend/src/controllers/` to verify endpoint paths and payload contracts.
2. **Never Assume an API Exists**: If an endpoint is missing or returns different fields, document the gap in `mobile/MEMORY.md` and propose a backward-compatible change before writing code.
3. **Preserve Customer vs Vendor Role Isolation**: Enforce RBAC on both client screens and backend authorization. A customer must never access vendor job management, and a vendor must never submit customer reviews for their own work.
4. **Preserve Address Masking Rules**: Tenders in open vendor feeds must mask full street addresses (showing only locality/distance). Full addresses are disclosed only to the specifically assigned contractor.

---

## 3. Technology Stack & Coding Standards

- **Framework**: React Native 0.74+ with Expo SDK 51+ and TypeScript.
- **Styling**: React Native `StyleSheet.create` following the canonical WorkLogy design palette (`#06684F` Deep Green primary, `#044C3A` dark green, `#0F172A` navy text, `#DC2626` emergency red).
- **Icons & Primitives**: Pure React Native components (`View`, `Text`, `TouchableOpacity`, `FlatList`, `Modal`, `Switch`, `TextInput`, `ActivityIndicator`) with zero DOM/HTML leakage.
- **State Management**: React Context / Hooks (`AuthContext`, `useAuth`) and lightweight store modules.
- **Storage**: `Expo SecureStore` with in-memory fallback for secure persistence of JWT tokens and session data.
- **Real-Time Communication**: `socket.io-client` for live emergency broadcast, instant claim notification, and direct chat.
- **Forms & Formatting**: Typed TypeScript schemas, standard Indian currency (INR ₹) formatting, and standard date/time helpers.

---

## 4. Security & Production Quality Guardrails

1. **Zero Secrets in Client**: Never place backend API secret keys, database credentials, or signing secrets in the mobile codebase.
2. **Environment Configuration**: Configure API URLs via `EXPO_PUBLIC_API_URL` in `.env`. Default to `http://localhost:5001/api` in simulators and local LAN IP (`http://192.168.x.x:5001/api`) for physical devices.
3. **Arrival OTP Verification**: Technicians must verify the 6-digit customer Arrival OTP via `POST /api/bookings/:id/verify-arrival-otp` to transition jobs to `in_progress`. Never bypass or simulate OTP validation.
4. **Atomic Concurrency (FCFS)**: Emergency service dispatches use server-authoritative atomic claims (`POST /api/jobs/:id/claim-instant`). Client state must respect conflict responses (HTTP 409) and dismiss taken jobs immediately.
5. **State Completeness**: Always implement loading, empty, error, and offline retry states across every mobile screen.

---

## 5. Verification Protocol

Before declaring any mobile task complete:
1. Run TypeScript check (`npx tsc --noEmit`) in the relevant mobile app directory.
2. Run Expo development server check (`npx expo start --dry-run` or validation script).
3. Verify that the web frontend (`worklogy/frontend`) passes tests (`node --test src/utils/*.test.js`) and builds cleanly (`npm run build`).
4. Update `mobile/TASKS.md` and `mobile/MEMORY.md`.
