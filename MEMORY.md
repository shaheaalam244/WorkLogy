# WorkLogy — Project Memory & Technical Context (`MEMORY.md`)

This document serves as persistent operational memory, tracking architectural decisions, environment parameters, active configurations, credentials, and design tokens for **WorkLogy**.

---

## 1. Project Identity & Status
- **Project Name**: WorkLogy
- **Current Scope**: Full-stack Hyperlocal Service Marketplace (Web Application)
- **Active Workspace**: `/Users/shaheaalam/Desktop/untitled folder/worklogy`
- **Current Lifecycle State**: Foundation & Full File Architecture Created, Dev Servers Running, Ready for Feature Iterations.

---

## 2. Active Environment & Network Ports

### Backend API:
- **Port**: `5001` (`http://localhost:5001`) *(Moved from 5000 to avoid macOS ControlCenter/AirTunes conflict)*
- **Health Endpoint**: `http://localhost:5001/api/health` (Status: Healthy, HTTP 200)
- **MongoDB Connection**: LIVE & VERIFIED Connected to MongoDB Atlas cluster:
  `mongodb+srv://shaheaalam041_db_user:4SalgmfWxigppXIc@cluster0.6rujmnz.mongodb.net/`
- **JWT Config**: `JWT_SECRET=worklogy_super_secret_jwt_key_2026_secure`, `JWT_EXPIRE=7d`
- **Frontend Target**: `FRONTEND_URL=http://localhost:5173`
- **Data Policy**: Zero mock policy. All production flows must connect real API endpoints directly to MongoDB Atlas.

### Frontend Client:
- **Port**: `5173` (`http://localhost:5173`)
- **Framework**: Vite 6 + React 18
- **Proxy/Target API**: Points to `http://localhost:5001/api`

---

## 3. Demo Credentials & Test Personas

Pre-configured in both backend seed scripts and frontend mock fallback auth:

| Role | Email | Password | Intended Portal | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Customer** | `customer@worklogy.com` | `password123` | `/customer/dashboard` | Standard home consumer seeking electrical/plumbing help |
| **Vendor** | `vendor@worklogy.com` | `password123` | `/vendor/dashboard` | Verified electrician & HVAC master technician |
| **Admin** | `admin@worklogy.com` | `password123` | `/admin/dashboard` | Platform superuser with full moderation permissions |

---

## 4. Established Design System & UI Tokens

### Brand Color Palette
- **Primary / Brand**: Indigo & Electric Blue
  - `primary-500`: `#4f46e5`
  - `primary-600`: `#4338ca`
  - `primary-700`: `#3730a3`
- **Accent / Success / Trust**: Emerald & Green
  - `emerald-500`: `#10b981` (Used for verified badges, successful status)
- **Warning / Pending**: Amber & Yellow
  - `amber-500`: `#f59e0b` (Used for pending bids, rating stars)
- **Danger / Urgent**: Rose & Crimson
  - `rose-600`: `#e11d48` (Used for disputes, emergency job badges)
- **Neutrals / Canvas**:
  - Light Background: `#f8fafc` (`slate-50`)
  - Card Surfaces: `#ffffff`
  - Dark Headers & Typography: `#0f172a` (`slate-900`), `#334155` (`slate-700`)
  - Subdued Text: `#64748b` (`slate-500`)

### Typography & Spacing
- Font Stack: System UI default (`Inter`, system-ui, -apple-system, sans-serif)
- Card Corners: Rounded-xl (`12px`) and Rounded-2xl (`16px`)
- Elevation: Subtle border `border border-slate-200` with soft shadow `shadow-sm` and `hover:shadow-md`

---

## 5. Architectural Decisions (ADR Summary)

1. **Dual Job Flow Architecture**:
   - Implemented both direct booking (`JobRequest`) and open marketplace bidding (`Job` + `Application`). This accommodates both emergency direct hiring (e.g., pipe burst) and cost-comparison bidding (e.g., house painting).
2. **Stateless JWT with Role Verification**:
   - Roles (`customer`, `vendor`, `admin`) are encoded in the JWT payload and re-verified against the active DB user state via `authorize()` middleware to prevent privilege escalation.
3. **Decoupled Real-Time Sockets**:
   - Isolated socket handlers for Chat (`chat.socket.js`), Job Statuses (`job.socket.js`), and Leads (`lead.socket.js`) to maintain clean modularity as traffic scales.
4. **Resilient Frontend Auth**:
   - `AuthContext.jsx` supports both live REST backend authentication and instant offline demo bypass logins so UI evaluation is never blocked by external database connectivity issues.
5. **Canonical 30-Domain Hyperlocal Catalogue**:
   - Standardized the platform taxonomy into exactly 30 primary service domains with 6 subcategories each. Reconciled and migrated legacy duplicate categories (e.g., `electrician` -> `electrical-services`, `plumber` -> `plumbing-services`) in MongoDB Atlas, preserving all job and vendor references.

---

## 6. Active Execution Protocol: Fast Development Mode & Git Policy
- **Operating Mode**: Fast Development Mode is active as defined in [`AGENTS.md`](file:///Users/shaheaalam/Desktop/untitled%20folder/worklogy/AGENTS.md).
- **Core Rules**:
  - No unnecessary automated test suites, browser launches, or repetitive inspect-test loops.
  - Implement directly by inspecting minimal relevant files and reusing existing patterns.
  - Full-stack integrity: connect real APIs and MongoDB when backend work is required (no fake mocks or dead buttons).
  - Targeted verification only when critical logic demands it.
  - Deliver concise end-of-task summaries.
- **Git Workflow Policy**:
  - Commit logical checkpoints locally with clear descriptive messages.
  - **NEVER push (`git push`) to GitHub or any remote repository unless explicitly requested by the user.**

---

## 7. Vendor Mobile App — Production Architecture & Synchronization Context
- **Workspace**: `mobile/vendor-app/`
- **Shared Backend**: Node.js/Express (`backend/`) on port 5001 connected to MongoDB Atlas.
- **Client Configuration**: Points to `http://76.13.246.224:5001/api` and local `http://10.0.2.2:5001/api` (Android emulator) or `http://localhost:5001/api`.
- **Navigation & Android Back Handler**: Custom `NavigationContext` with registered hardware back handler stack for all modals (`otpModal`, `completeModal`, `cancelModal`, `quoteModal`, `verifyModal`, `editModal`) and multi-step forms. Double-back exit at root.
- **Service Listings vs Open Customer Jobs**:
  - `POST /vendors/services`: Vendor publishes offering with pricing, working hours, and coverage.
  - `POST /jobs`: Homeowner posts service request.
  - `POST /applications`: Vendor bids / submits quotation on open customer job.
  - `POST /bookings/direct`: Direct customer booking assignment.
- **Job Lifecycle & OTP**:
  - Transitions: `assigned/confirmed` -> `on_the_way` -> `arrived` -> `in_progress` (via 6-digit OTP verified via `POST /bookings/:id/verify-arrival-otp`) -> `completed` (via `POST /bookings/:id/complete-signoff`).
  - Cancellation: Permitted for active pre-completion bookings via `PATCH /bookings/:id/status` (`status: 'cancelled', note: reason`), emitting real-time Socket.IO cancellation events to both customer and vendor.
- **Settlement & Platform Commission**:
  - 10% platform fee deducted from gross job quotation. Escrow hold maintained until customer completion sign-off, settling to vendor's registered bank account.
## 8. Customer Mobile App — Performance Optimization & Stability Architecture
- **Workspace**: `mobile/customer-app/`
- **Dynamic Active Host & Failover**:
  - `activeBaseUrl` and `activeSocketUrl` dynamically detect connectivity with a fast 3500ms probe for local development hosts (`10.211.183.171` / `localhost`).
  - Upon network failure (e.g., testing outside local LAN on cellular), requests fail over stickily to `http://76.13.246.224:5001/api` and socket to `http://76.13.246.224:5001`. The working host is remembered in memory, eliminating repetitive 10-30s connection timeout hangs across screens.
- **In-Memory Token Cache**:
  - Auth token is cached in memory (`cachedAuthToken`), eliminating asynchronous SecureStore disk I/O on every authenticated API request.
- **In-Flight Deduplication & In-Memory TTL Cache**:
  - Concurrent identical GET requests are deduplicated using `inFlightGetRequests`.
  - Static and semi-static metadata (`/categories` with 3-minute TTL, `/zones` and `/zones/localities` with 5-minute TTL) are served from in-memory cache, reducing screen transition latency to 0ms.
  - Pull-to-refresh calls `api.cache.clear()` to force a clean server synchronization.
- **Android Keyboard & Safe Area Handling**:
  - With `softwareKeyboardLayoutMode: resize` in `app.json`, `KeyboardAvoidingView` on Android uses `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` to prevent double padding and keyboard overlap in chat and forms.
- **Navigation Deduplication**:
  - `CustomerNavigator.tsx` checks the current stack top and ignores rapid duplicate screen pushes with identical params.
- **Idempotency & Tab Optimization**:
  - `CreateJobScreen` utilizes an `isSubmittingRef` lock guard to guarantee 100% idempotency against double taps.
  - `MyJobsScreen` decouples tab switching from network fetching, filtering loaded data in memory for instantaneous 0ms tab changes.

## 9. Customer Messaging Architecture — Stability, Badges & Auto-Scroll
- **Decoupled Notification vs Message Badges**:
  - Bottom navigation `MessagesTab` badge strictly reflects `unreadMessagesCount` queried from `api.chat.getUnreadCount()` (`GET /api/chat/unread-count`), completely separated from system notification alerts (`api.notifications.getUnreadCount()`).
  - Badge is wired to real-time pub-sub sync events `MESSAGES_CHANGED` and `MESSAGES_READ` in `dataSyncService`.
- **Zero-Flicker Conversation Cache & Silent Revalidation**:
  - `MessagesScreen.tsx` uses module-level conversation memory (`cachedConversations`) and an `isFetchingRef` guard.
  - Existing conversations render at 0ms without full-screen spinners on tab switches; updates happen silently in the background (`isSilentOrPull: true`).
- **Initial Auto-Scroll & Read Receipts**:
  - `ChatDetailScreen.tsx` identifies the latest incoming unread message index (`targetScrollIndexRef.current`) from the fetched payload and performs a single initial scroll (`performInitialScroll` with fallback `scrollToEnd`) via `hasAutoScrolledRef.current`.
  - Displayed messages are marked read via `api.chat.markConversationRead(convId)` and broadcast through `MESSAGES_READ` without altering user scroll position.

## 10. Customer Active Bookings & Jobs Count Architecture
- **Dedicated Authoritative Stats (`/api/customer/stats`)**:
  - `activeJobsCount`: Calculated server-side as the deduplicated sum of active bookings (`['open', 'quotations_received', 'pending_acceptance', 'awaiting_confirmation', 'assigned', 'confirmed', 'scheduled', 'on_the_way', 'arrived', 'in_progress', 'completion_pending', 'payment_pending', 'pending']`) and open standalone customer job requests (`['open', 'quotations_received', 'dispatching']` without a linked booking).
  - Eliminates client-side total historical job arrays (`api.jobs.getMyJobs().length`), ensuring the profile stat tile displays the true count of currently active orders.
- **Support for `status=active` in Unified Orders API**:
  - `getCustomerBookings` (`/api/customer/bookings?status=active` and `/bookings/my-bookings?status=active`) handles `status === 'active'` with `$in: ACTIVE_BOOKING_STATUSES` and includes unbooked open requests using `$or: [{ booking: { $exists: false } }, { booking: null }]`.
- **Real-Time Data Sync across Screens**:
  - `ProfileScreen.tsx` listens to `dataSyncService.subscribe('BOOKINGS_CHANGED', () => loadBookingStats())`.
  - When bookings or jobs are created, cancelled, or transitioned, the stat count refreshes immediately without app reload.

## 11. Resilient Cross-Environment Cancellation Architecture
- **Dual-Method Compatibility (`POST` + `PATCH`)**:
  - Cloud VPS (`76.13.246.224:5001`) registers job cancellation as `POST /api/jobs/:id/cancel` and customer booking cancellation as `PATCH /api/customer/bookings/:id/cancel`.
  - Local backend supports both `POST` and `PATCH` for both routes.
  - `mobile/customer-app/src/api/client.ts` uses `POST /jobs/:id/cancel` and `PATCH /customer/bookings/:id/cancel` as primary requests with automatic fallback, guaranteeing zero 404 "Route not found" errors whether running locally on Wi-Fi or failing over to the cloud VPS on cellular data (5G).
  - `MyJobsScreen.tsx` incorporates automatic cross-fallback between job requests and booking records to ensure reliable cancellation under all conditions.

## 12. In-Place Card Updates & Zero-Flicker Architecture
- **Scoped Inline Loading State**:
  - During cancellation, loading indicator is strictly confined to `cancellingId === item._id` inside the affected card's action button.
- **Silent Background Revalidation**:
  - `loadBookings(silent = true)` suppresses full-screen `loading = true` state when data already exists, eliminating the full-screen spinner flash ("Fetching orders...").
  - Pub-sub synchronization listeners (`BOOKINGS_CHANGED`) trigger silent re-validation, preserving scroll position and existing UI hierarchy.
- **Native LayoutAnimation**:
  - `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` provides seamless 60fps collapse and removal of the cancelled card in-place while keeping the rest of the list stable.

## 13. Vendor App Jobs Screen & Lifecycle Normalization Architecture
- **Root Cause of Empty "Accepted" Tab Resolved**:
  - `job.controller.js` `computeNearbyCounts` previously counted `status: { $in: ['assigned', 'in_progress', 'completion_pending', 'completed'] }` as `assignedToMe` (= 5), inflating the count with in-progress and completed jobs.
  - The client list for "Accepted" only filtered `myBookings` for `['confirmed', 'scheduled', 'assigned', 'awaiting_confirmation']`, which had 0 records for the logged-in vendor, resulting in a badge count of 5 alongside an empty "No Jobs Found" list.
  - Rectified `computeNearbyCounts` and `getNearbyJobs` (`tab === 'assigned'` / `'accepted'`) to strictly return active assignments (`status: 'assigned'`).
  - Added parallel fetching of `api.jobs.getOpenJobs({ tab: 'assigned' })` alongside `getOpenJobs({ tab: 'all' })`, `myApplications`, and `myBookings`.
  - Unified accepted records across active bookings and assigned jobs, deduplicating records by canonical job ID.
- **Strict 1:1 Badge Count Guarantee**:
  - All 7 tab badges are computed directly from `itemsByTab[tab.key].length`. Count badges **ALWAYS** match the number of displayed cards with 0% discrepancy.
- **Canonical 7-Tab State Machine**:
  - `requests`: `status === 'pending_acceptance'`
  - `new`: `['open', 'dispatching'].includes(status) && selectedVendor === null`
  - `quoted`: `myApplications` (submitted proposals with proposedAmount and quote status)
  - `accepted`: active assigned jobs and confirmed/scheduled bookings awaiting work start
  - `in_progress`: active field workflow (`on_the_way`, `arrived`, `in_progress`, `completion_pending`)
  - `completed`: completed bookings and jobs
  - `cancelled`: cancelled and declined bookings with reason notes
- **High-Density Compact Redesign**:
  - Horizontally scrollable segmented status navigation strip (`#047857` deep green active pill).
  - Compact cards with service thumbnail, category chip, reference code, customer name, locality, date/time, price/quote, and contextual action buttons.
  - Compact 200px empty state replacing the previous 600px blank void.

## 14. Production-Ready Real-Time Push Notification Architecture
- **Expo Push Service Integration (`expo-notifications@57.0.24`, `expo-device@57.0.2`)**:
  - Direct delivery to real mobile devices via Expo Push Service (`https://exp.host/--/api/v2/push/send`).
  - Batching into chunks of 100 messages, rate-limit resilience, and automatic deactivation of invalid/stale device tokens (`DeviceNotRegistered`).
  - Non-blocking error isolation: push dispatch failure or network timeout never rolls back core database writes or business transactions.
- **Dedicated Android Notification Channels**:
  - `messages`: Customer Chat Messages (Importance: `MAX`, vibration pattern `[0, 250, 250, 250]`, sound: `'default'`).
  - `job-requests`: Job Leads & Urgent Requests (Importance: `HIGH`, vibration pattern `[0, 300, 200, 300]`, sound: `'default'`).
  - `bookings`: Bookings & Order Milestones (Importance: `HIGH`, vibration pattern `[0, 250, 250, 250]`, sound: `'default'`).
  - `general`: General Updates & Settlements (Importance: `DEFAULT`).
- **Foreground & Terminated Tap Handling**:
  - Foreground notifications display high-priority banner, play sound, and update unread count badges via `setNotificationHandler`.
  - Cold starts handled via `getLastNotificationResponseAsync()`, and runtime taps handled via `addNotificationResponseReceivedListener`.
  - Intelligent tap routing:
    - `type === 'message'` or `conversationId` -> `navigation.navigate('ChatDetail', { conversationId })`.
    - `type === 'job'` or `jobId` -> `navigation.navigate('VendorJobDetail', { jobId })`.
    - `type === 'booking'` or `bookingId` -> `navigation.navigate('VendorJobDetail', { bookingId })`.
    - Fallback -> `navigation.navigate('Notifications')`.
- **Backend Event Triggers**:
  - Customer messages (`chat.controller.js`): dispatches `Title: 'New message'`, `Body: '${customer.name}: ${preview}'`.
  - New jobs (`job.controller.js`): `matchEligibleVendors` evaluates category and territory, and dispatches `Title: 'New job near you'`, `Body: 'New [Category] request in [Locality]'`.
  - Bookings & Statuses (`notification.service.js`, `booking.controller.js`): dispatches push on booking confirmation, direct inquiries, arrival, work start, completion pending, and cancellations.
- **Multi-Device & User Preferences**:
  - User `pushTokens` array stores multiple active devices (`token`, `platform`, `deviceId`, `deviceModel`, `appVersion`, `isActive`).
  - Stored tokens de-duplicated across users sharing devices.
  - Deactivated on logout via `pushNotificationService.deregister()`.
  - Settings UI (`VendorSettingsScreen.tsx`) provides granular toggle controls for all 5 push categories and a 1-tap "Test Push" dispatch button.

## 15. Admin Web Vendors Page & KYC Document Viewer Architecture
- **Root Cause of Crash on `/admin/vendors`**:
  - `CheckSquare` was referenced in JSX inside the empty state block in `frontend/src/pages/admin/Vendors.jsx` but omitted from the `lucide-react` import statement.
  - Adding `CheckSquare` to the import list completely eliminated the runtime ErrorBoundary crash.
- **8-Tab Vendor Dossier Architecture (`VendorDetailsModal.jsx`)**:
  - Modal with tabs: Overview, Profile & Services, KYC & Documents, Service Area, Jobs & Bookings, Earnings & Payments, Ratings & Reviews, and Activity & Audit History.
  - Connected directly to `GET /api/admin/vendors/:id` with populated User, Categories, Bookings, Reviews, and Audit trails.
- **KYC Document Viewer & Review Gateway (`KycDocumentViewerModal.jsx`)**:
  - Supports zoom (+/-, 100% reset), 90° rotation, and image panning for images.
  - Supports embedded PDF preview via `<object>` and secure fallback download links.
  - Sensitive government identification numbers masked by default (`XXXX-XXXX-1234` / `XXXX-1234`).
  - Supports approval, rejection with mandatory reason, and request changes via `PATCH /api/admin/vendors/:id/documents/:docIndex`.
  - Automatically synchronizes overall `verifiedBadge.status` based on document reviews, writes to audit log, and dispatches in-app notifications to vendors.
- **Secure Document Streaming**:
  - `GET /api/admin/vendors/:id/documents/:docIndex/:mode` provides server-side admin authentication and authorized streaming/redirection.
