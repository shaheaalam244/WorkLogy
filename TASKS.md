# WorkLogy — Development Tasks & Roadmap (`TASKS.md`)

This task board tracks the execution roadmap, milestones, and granular progress across the **WorkLogy** platform in accordance with the Master Instructions.

---

## 🚦 Definition of Done (DoD)
A task can only be moved to `[x]` (Completed) when:
1. Requested behavior is fully implemented.
2. UI is responsive across mobile, tablet, and desktop.
3. Required API and database logic execute without errors.
4. Server-side validation and RBAC authorization are enforced.
5. Production build (`npm run build`) and syntax checks pass.
6. Documentation and `TASKS.md` status are updated.

---

## 📌 Phase 1: Architecture & Foundation (COMPLETED)
- [x] **Task 1.1**: Define and generate complete full-stack folder structure (Backend + Frontend).
- [x] **Task 1.2**: Implement Mongoose schemas (14 models: User, VendorProfile, Job, Application, Review, etc.).
- [x] **Task 1.3**: Implement Express controllers, middleware (JWT protect, authorize RBAC, rate limiter, error handling).
- [x] **Task 1.4**: Setup React 18 + Vite frontend with Tailwind CSS and Lucide icons.
- [x] **Task 1.5**: Implement routing and layouts (`PublicLayout`, `CustomerLayout`, `VendorLayout`, `AdminLayout`).
- [x] **Task 1.6**: Establish real-time Socket.IO foundation (`chat.socket`, `job.socket`, `lead.socket`).
- [x] **Task 1.7**: Setup project governance documents (`AGENTS.md`, `ARCHITECTURE.md`, `REQUIREMENTS.md`, `MEMORY.md`, `TASKS.md`).
- [x] **Task 1.8**: Implement modern, responsive WorkLogy Homepage Navbar (brand mark, center navigation, location selector, role-aware auth CTAs, mobile menu).
- [x] **Task 1.9**: Build Complete WorkLogy Homepage with Full-Stack Integration (Hero, 11 Categories, Live Job Feed with real-time MongoDB persistence, Post Job modal, Featured Pros, How It Works, Why Choose WorkLogy).
- [x] **Task 1.10**: Redesign and Polish the Complete WorkLogy Homepage — Brand identity alignment (`#06684F` deep green, `#111827` dark navy, `#F7F9FC` background), sticky Navbar with all 5 core navigation links and universal Request a Service CTA, dual-input Hero search with compact trust points and verified trades visual, responsive 6–7 column Popular Categories grid, deduplicated Recent Jobs feed with address privacy masking, vetted Featured Professionals with booking links, two-path Customer Journey section (Option A Post a Job vs Option B Hire Directly), 4-step How It Works, 6-pillar Trust & Escrow section, and modern 4-column Footer.

---

## 📌 Phase 2: Authentication & Onboarding
- [x] **Task 2.1**: Implement JWT registration, login, and current user retrieval endpoints.
- [x] **Task 2.2**: Connect frontend `AuthContext` to backend API with demo-role fallback.
- [x] **Task 2.3**: Build responsive Login and Registration views with role selection (`Customer` vs `Vendor`).
- [x] **Task 2.4**: Implement multi-step Vendor Onboarding stepper UI (`/vendor/onboarding`) with persistent backend sync.
- [x] **Task 2.5**: Complete vendor compliance verification documents upload and administrative review workflow.
- [x] **Task 2.6**: Add customer saved addresses management with geo-location coordinates, active location prefill ("jo active rhe wo aaye"), and direct manual entry ("phle enter ka hi aaye").

---

## 📌 Phase 3: Service Discovery & Hyperlocal Search
- [x] **Task 3.1**: Redesign and Synchronize WorkLogy Service Categories Page (`/categories`) — 30 canonical service domains, database migration reconciling legacy duplicates, responsive 5-column wide-container layout, real-time search across domains & subcategories, and filter classification pills.
- [x] **Task 3.2**: Build verified professionals directory (`/professionals`) with category & rating filtering.
- [x] **Task 3.3**: Build comprehensive professional profile page (`/professionals/:id`) with reviews, pricing, and live service packages.
- [x] **Task 3.4**: Implement Complete Post a Service page (`/vendor/services/new`) with all 30 domains, subcategories, pricing models, and persistence.
- [x] **Task 3.5**: Implement My Services management (`/vendor/services`) with live status filtering (All, Published, Draft, Paused, Archived).
- [x] **Task 3.6**: Redesign WorkLogy Service Navigation and Category Listing — Desktop hover mega menu on Explore Services with 4 distinct groups (Home Maintenance, Repair & Installation, Moving & Construction, Personal & Other Services), live category search, touch/keyboard accessible dropdown, compact CategoryCard layout (4-5 cols desktop, 2-3 cols tablet), 12-item initial limit with "Show More" expansion, URL query parameter synchronization, and responsive mobile drawer integration.
- [x] **Task 3.7**: Add Emergency Services to the WorkLogy Navbar and Complete End-to-End Emergency Dispatch Flow (`/emergency`, `Navbar.jsx`, `EmergencyRequest.jsx`, `job.controller.js`, `vendor.controller.js`, `vendorMatching.service.js`):
  - Prominent "Emergency" navigation item beside "Explore Services" and "Find a Professional" on desktop and mobile drawer.
  - Subtle red emergency alert styling with `AlertTriangle` red icon, `bg-rose-50 text-rose-700 border-rose-200/90 hover:bg-rose-100 hover:text-rose-800 focus:ring-rose-500` without altering the general WorkLogy green theme or using flashing animations.
  - Dedicated Emergency Service Request Page (`/emergency` & `/customer/emergency`) in simple English with prominent Life-Safety Alert directing physical/life-threatening crises to official emergency services (112, 101, 102, 100).
  - 6-step streamlined emergency form: service category selection with transparent diagnostic visit pricing (₹499–₹649), quick symptom tags + detailed description, full service address with high-accuracy GPS auto-detection, masked customer contact number, and realistic urgency options.
  - Live query of active, approved emergency professionals in the customer's locality.
  - Full-stack persistence in MongoDB Atlas via `POST /api/jobs` with `urgency: 'emergency'`, updating user phone, and privacy masking of full street/coordinates from unauthorized callers.
  - Safe server-side concurrency: atomic first-acceptance (`Job.findOneAndUpdate({ _id, status: 'open', selectedVendor: null })`) committing winning contractor, creating Booking with secure 6-digit start OTP, and rejecting subsequent concurrent attempts with HTTP 409 Conflict.
  - Real-time Socket.IO synchronization: `job_assigned` push notifying the customer's emergency radar and live job tracking (`/customer/tracking`).
- [x] **Task 3.8**: Build WorkLogy Instant Emergency Dispatch — Uber/Rapido Style (`/emergency`, `/customer/emergency`, `EmergencyRequest.jsx`, `EmergencyDispatchModal.jsx`, `Dashboard.jsx`, `VendorLayout.jsx`, `Jobs.jsx`, `job.controller.js`, `job.routes.js`, `vendorMatching.service.js`):
  - Streamlined Customer Booking Experience: Replaced legacy multi-step cards and upfront price matrices with a clean, mobile-first 1-screen booking flow inspired by Uber/Rapido.
    - Header: "Need Help Right Now?", subtitle "Tell us what happened. An available professional can accept your request.", and compact life-safety alert.
    - Large problem textarea with 10–1000 character counter and quick symptom chips.
    - Simple searchable category selector (Electrical, Plumbing, AC & Cooling, Appliance Repair, Locksmith, Roofing & Structural Repair, Other).
    - Service location: Saved address selection, high-accuracy GPS auto-detection, address validation, and privacy-protected location display.
    - Single prominent green action button: **Find Available Professional**.
    - Live request tracking screen: Searching radar with 90s countdown, Cancel Request, Retry Search, and Accepted state with professional details, rating, contact phone, and Service-Start OTP.
  - Vendor Emergency Availability & Dispatch Control:
    - Persistent Emergency Availability toggle (ON/OFF) in Vendor Dashboard and Profile synced to MongoDB Atlas.
    - Real-time incoming emergency dispatch modal (`EmergencyDispatchModal.jsx`) mounted in `VendorLayout.jsx` with synthesized audio chime, 90-second countdown, category badge, locality, 1-click "Accept Job Now", and "Decline" actions.
    - Live incoming emergency requests queue embedded directly on the Vendor Dashboard.
  - Concurrency-Safe Atomic Assignment ("First Acceptance Wins"):
    - Strict server-side verification: approved status, matching skills/categories, active emergency availability, working hours, and service area.
    - Concurrency-safe atomic database update (`Job.findOneAndUpdate({ _id, status: { $in: ['open', 'dispatching'] }, selectedVendor: null })`).
    - Winning vendor receives 200 OK and booking creation with 6-digit arrival OTP; losing concurrent bidders receive HTTP 409 Conflict: "This job has already been accepted by another professional."
    - Real-time Socket.IO synchronization (`emergency_job_lead`, `job_assigned`, `job_taken`, `job_cancelled`, `job_declined`).
  - Admin Operations Control:
    - Updated `/admin/jobs` with `dispatching` and `expired` status filters, full dispatch audit event history, and retry/reassign actions.
- [x] **Task 3.9**: Add Real Images to All WorkLogy Service Categories (`/categories`, `/`, `/emergency`, `/customer/explore`, `CategoryCard.jsx`, `categoryMedia.js`, `catalogue.js`, `ServiceCategory.js`):
  - Every one of the 30 canonical service categories has its own unique, realistic, high-resolution photograph (16:9 landscape aspect ratio).
  - Centralized media dictionary `categoryMedia.js` providing resilient image and alt text resolution with safe image fallback.
  - Re-architected `CategoryCard.jsx` with consistent height, 16:9 aspect-video header, rounded top corners, trade icon badge, real service counts (`X Services`), title, description, and prominent "Explore Services" action.
  - Upgraded Home page Popular Service Categories section with responsive 4-column card grid, top featured categories, and inline toggle to expand to all 30 categories.
  - Explore Services page (`/categories`) upgraded to responsive 4-column layout with instant visual recognition across all categories.
  - Synchronized image thumbnails across Emergency Request (`/emergency`), Customer Explore (`/customer/explore`), Customer Post Job (`/customer/create-job`), and Admin Categories management (`/admin/categories`).
  - Added `image` field to `ServiceCategory` Mongoose schema and synchronized all 30 documents directly into live MongoDB Atlas.
- [x] **Task 3.10**: Map and Implement All WorkLogy Service Images Across Full Platform (`serviceImages.js`, `categoryMedia.js`, `JobCard.jsx`, `JobDetails.jsx`, `ProfessionalProfile.jsx`, `Services.jsx`, `NewService.jsx`, `Categories.jsx`):
  - Audited all 31 assets in `frontend/src/assets` (30 high-resolution 1536x1024 photography PNGs + 1 brand `logo.svg`).
  - Created centralized image mapping module `frontend/src/constants/serviceImages.js` with direct ESM imports, mapping all 30 canonical service domains and 180 sub-services with automated parent category fallbacks.
  - Connected images across customer views (Home popular services, Categories explore grid, Customer Explore, Emergency Request, Create Job, Job Cards, Job Details), vendor views (My Services, New Service with live preview), verified professional profile service listings, and admin views (Category and Catalog Service cards).
  - Production build (`npm run build`) passed cleanly with 0 errors.
- [x] **Task 3.11**: Integrate Relevant Service Images Across the Entire WorkLogy Application (`Home.jsx`, `JobCard.jsx`, `JobDetails.jsx`, `BrowseJobs.jsx`, `MyJobs.jsx`, `Dashboard.jsx`, `Bookings.jsx`, `RequestTracking.jsx`, `DirectBookingModal.jsx`, `JobDetailsModal.jsx`, `EmergencyDispatchModal.jsx`, `ManageJob.jsx`, `admin/Jobs.jsx`, `admin/Categories.jsx`, `serviceImages.js`, `categoryMedia.js`):
  - Added 16:9 aspect-video service hero banners to "Recent Jobs in Your Area" cards on the homepage (`Home.jsx`), resolving the job's trade category or sub-service with overlaid urgency badges and category tags while preserving "View Details" and "Send Your Price" actions.
  - Updated shared job card components (`JobCard.jsx`) with 16:9 aspect-video banners and consistent height and alignment across all job feeds (`/jobs`).
  - Added panoramic service hero banners to public job details (`JobDetails.jsx`) and vendor job inspection modals (`JobDetailsModal.jsx`).
  - Upgraded Customer views (`MyJobs.jsx`, `Dashboard.jsx`, `Bookings.jsx`, `RequestTracking.jsx`, `DirectBookingModal.jsx`, `CreateJob.jsx`) with service image banners and thumbnails.
  - Upgraded Vendor views (`BrowseJobs.jsx`, `Dashboard.jsx`, `EmergencyDispatchModal.jsx`, `ManageJob.jsx`) with service image banners, lead thumbnails, and emergency radar banners.
  - Upgraded Admin views (`admin/Jobs.jsx`, `admin/Categories.jsx`) with service thumbnails in data tables and inspection preview banners.
  - Resolved ObjectId false-negatives in `getCategoryImage` and enhanced `resolveJobImage(job)` with keyword-based fallback matching from job titles and descriptions.
  - Production build (`npm run build`) and syntax checks verified cleanly with 0 errors.
- [x] **Task 3.12**: Fix EmergencyDispatchModal React Rendering Crash (`EmergencyDispatchModal.jsx`, `BrowseJobs.jsx`, `JobDetailsModal.jsx`, `Dashboard.jsx`, `ManageJob.jsx`, `Bookings.jsx`, `RequestTracking.jsx`, `formatters.js`, `getDisplayName.test.js`):
  - Diagnosed root cause of runtime error `Objects are not valid as a React child (found: object with keys {_id, slug, icon, name})` on `/vendor/browse-jobs`: `activeLead.category` was populated by `jobAPI.getEmergencyLeads()` with `{ _id, slug, icon, name }` and directly rendered into JSX spans.
  - Implemented safe, reusable `getDisplayName(value)` utility in `formatters.js` and exported it, handling strings, populated Mongoose objects (`{ _id, slug, icon, name }`, `{ title }`, `{ label }`), arrays, null, and undefined values without ever rendering raw objects.
  - Updated `EmergencyDispatchModal.jsx` to safely extract and render `categoryName`, `problemText`, and `locality`.
  - Audited and updated other vendor components (`BrowseJobs.jsx`, `JobDetailsModal.jsx`, `Dashboard.jsx`, `ManageJob.jsx`, `Bookings.jsx`, `RequestTracking.jsx`) with `getDisplayName` for consistent data contracts.
  - Added focused unit tests in `frontend/src/utils/getDisplayName.test.js` verifying string categories, populated category objects, missing/null categories, emergency leads, and arrays.
  - Verified with 100% passing tests and successful production build (`npm run build`).
- [x] **Task 3.13**: Fix WorkLogy Emergency Dispatch Popup Trigger (`EmergencyDispatchModal.jsx`, `SocketContext.jsx`, `emergencyDispatch.test.js`):
  - Isolated and removed unsolicited automatic popup triggers on mount: eliminated initial `jobAPI.getEmergencyLeads()` fetch and 25-second polling interval in `EmergencyDispatchModal.jsx` that were querying MongoDB for historical emergency jobs and immediately launching popups on vendor login, page refresh, or browsing `/vendor/browse-jobs`.
  - Converted popup activation to pure real-time event-driven lifecycle: popup is triggered strictly by incoming Socket.IO `emergency_job_lead` events for fresh, newly submitted emergency requests.
  - Added multi-layer event filtering and duplicate prevention:
    - Rejects stale leads (>90s old) using request creation timestamp.
    - Rejects already assigned, completed, or cancelled requests.
    - Tracks dismissed and claimed lead IDs in `sessionStorage` (`worklogy_dismissed_emergency_leads`) and component ref (`dismissedLeadIds`), preventing re-opening upon re-render, component remount, or re-dispatch.
    - Preserves atomic FCFS acceptance (`POST /api/jobs/:id/claim-instant`): winning contractor transitions to `/vendor/manage-job/:id`, while losing concurrent contenders receive 409 Conflict notifications and automated modal dismissal.
    - Listens for real-time `job_taken` and `job_assigned` socket broadcasts to dismiss pending popups across all other vendor screens.
  - Preserved separate job feed display: `/vendor/browse-jobs` cards load via `jobAPI.getOpenJobs()`, and vendor dashboard renders its own inline card feed via `jobAPI.getEmergencyLeads()` without ever popping up modals.
  - Added test suite in `frontend/src/utils/emergencyDispatch.test.js` verifying 6 scenarios (login without popup, 19h old seeded jobs blocked, fresh emergency requests triggering popup, dismissed leads blocked from re-opening, assigned jobs blocked, normal jobs blocked) and verified production build passes cleanly.
- [x] **Task 3.14**: Redesign WorkLogy Emergency Request Page in Landscape One-Screen Layout (`EmergencyRequest.jsx`):
  - Upgraded `/emergency` and `/customer/emergency` to fit the entire emergency request form within one desktop viewport without vertical scrolling at standard 1440 × 900 and 1536 × 864 resolutions.
  - Centered container with 1340px width (`max-w-[1340px]`) and compact vertical padding (`py-3 sm:py-4`).
  - Balanced 3x3 category grid eliminating awkward empty blocks: 8 top emergency trades (Electrical, Plumbing, AC & Cooling, Appliance Repair, Locksmith, Roofing & Structural, Water Purifier RO, Carpentry & Handyman) + 9th dynamic card ("More Services" / chosen custom trade).
  - Integrated 30-Category Searchable Selection Modal: Accessible via "All 30 Services" header button or the 9th card, allowing customers to search, preview high-res photographs, and select ANY of WorkLogy's 30 trade categories for urgent dispatch.
  - Two-column balanced desktop architecture (~60% left column, ~40% right column):
    - Left Column (7 cols): Compact header with 24/7 priority emergency dispatch badge, title, subtitle, and city response stat; compact Life Safety Notice banner (`bg-rose-50/90 border-rose-200 text-rose-900`) directing physical crises to 112/101; 80px problem textarea with character counter and wrapping common issue shortcut chips; and a compact 3x3 service category grid with 36px image thumbnails, full wrapped category names, and emerald selected state with checkmark badge.
    - Right Column (5 cols): Service location with "Use My GPS" geolocation, reverse geocoding, saved address pills with deduplicated clean labels, selected address preview box with privacy masking note, inline collapsible address editor, contact phone input with validation, compact request summary card with category thumbnail and diagnostic fee (₹499), and prominent primary "Find Available Professional" CTA button.
    - Centered live request tracking view (`max-w-2xl`) for broadcasting radar, accepted professional card with 6-digit arrival OTP, and retry/cancellation controls.
  - Production build (`npm run build`) and unit tests verified cleanly with 0 errors.
- [x] **Task 3.15**: Implement Category-Wise Popular Services & Dedicated Navigation (`Home.jsx`, `Categories.jsx`, `CategoryDetails.jsx`, `CategoryCard.jsx`, `CreateJob.jsx`, `AppRoutes.jsx`):
  - Redesigned the Popular Services section on the homepage (`Home.jsx`):
    - Displayed the canonical top 8 popular service categories in exact user-requested order: 1. Electrical Services, 2. Plumbing Services, 3. AC & HVAC Services, 4. Appliance Repair, 5. Carpentry & Furniture, 6. Home Cleaning, 7. Painting Services, 8. Pest Control.
    - Updated section title to "Popular Services", subtitle to "Find trusted professionals for your everyday needs.", and direct header link to "View All Services" (`/categories`).
    - Configured a responsive, touch-friendly grid: 4 columns on desktop, 2-3 on tablet, and exactly 2 cards per row on mobile (`grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6`).
    - Added an expandable "View All Categories" toggle to reveal all 30 database categories without leaving the homepage.
  - Implemented Dedicated Category-Wise Details Page (`/categories/:slug` via `CategoryDetails.jsx`):
    - Panoramic hero header with high-resolution trade imagery, verified badges, service count, location, and clear CTAs ("Find a Professional", "Request Custom Service", and "Emergency Dispatch").
    - Clean hierarchical breadcrumbs (`Home → Services → {Category Name}`).
    - Quick-switch horizontal category pill bar allowing instant navigation between top categories and "All 30 Categories".
    - In-category real-time search with clear button and friendly empty search fallback.
    - Individual service grid displaying all 6 canonical subservices per category with 16:9 photography thumbnails, descriptions, and dual action buttons: "Book Service" (pre-populating the booking wizard) and "Find Pros" (filtering vetted specialists).
    - Verified contractors preview in that category fetched dynamically from `vendorAPI.getAll({ category: slug })`.
    - WorkLogy platform guarantee panel detailing vetted licensing, upfront pricing, OTP arrival verification, and escrow payment protection.
  - Connected End-to-End Booking Integration (`CreateJob.jsx`):
    - Enabled pre-population of `category`, `subcategory`, and `title` from URL search parameters when navigating from subservice cards directly into the customer booking wizard (`/customer/create-job?category=...&service=...`).
  - Enhanced Categories Exploration View (`Categories.jsx`):
    - Prioritized the top 8 popular categories first, added breadcrumbs, and adjusted mobile grid to 2 cards per row.
  - Integrated the 3 dedicated high-resolution local photography assets (`SmilingHomepage.png`, `Expert Homepage.png`, and `Homepage.png`) onto the Homepage:
    - Embedded `Homepage.png` as the on-site execution action visual for "Option A — Post a Job Free".
    - Embedded `Expert Homepage.png` as the direct hire action visual for "Option B — Hire a Professional Directly".
  - Production build (`npm run build`) and unit test suite verified cleanly with 0 errors.
- [x] **Task 3.16**: Redesign WorkLogy Homepage Hero into a Premium Full-Screen Image Carousel (`HeroCarousel.jsx`, `Home.jsx`):
  - Replaced the constrained right-side hero card with an immersive, edge-to-edge full-bleed background photographic carousel spanning the entire viewport width (`min-h-[660px] sm:min-h-[700px] lg:h-[760px] xl:h-[780px]`).
  - Configured 7 dedicated service slides using authentic commercial photography of Indian trade professionals from `src/assets`:
    1. **AC & Appliances** (`Expert Homepage.png`): Indian technician servicing wall-mounted split AC unit.
    2. **Electrical Services** (`Electrician Repairing Home Electrical Panel.png`): Electrician in safety gear repairing residential switchboard.
    3. **Plumbing Services** (`Homepage.png`): Plumber repairing pipe fittings beneath kitchen sink.
    4. **Home Cleaning** (`Professional Cleaning in a Bright Living Room.png`): Cleaner sanitizing bright modern living room.
    5. **Painting Services** (`Apartment Wall Painting in Progress.png`): Painter applying smooth paint coat with roller on wall.
    6. **Carpentry & Furniture** (`Skilled Handyman Repairing a Wooden Cabinet.png`): Carpenter repairing wooden cabinet drawers.
    7. **Pest Control** (`Kitchen Pest Control Inspection.png`): Pest-control specialist inspecting kitchen area with protective equipment.
  - Built multi-layer contrast gradients preserving text clarity on the left while keeping the active technician visible on the right.
  - Implemented left-aligned hero content with eyebrow badge ("Verified Local Professionals"), dual-color headline ("Trusted Local Experts, Just a Click Away."), description, and 3 trust indicators (Verified Professionals, Clear Pricing, Secure Payments).
  - Integrated horizontal search bar with real-time category suggestions dropdown, location input, and submit action.
  - Added primary "+ Post a Job Free" and secondary "Explore Services →" action buttons.
  - Added floating Service Information Card in the lower-right displaying active slide title, subtitle, trade icon, and direct link to category.
  - Added bottom horizontal service category selector strip with 8 items (AC & Appliances, Electrical, Plumbing, Home Cleaning, Painting, Carpentry, Pest Control, and More Services →) with active green accent highlight and mobile swipe support.
  - Configured robust autoplay controls: 5000ms timer, smooth 700ms crossfade, desktop hover-pause, tab visibility listener (`document.visibilityState === 'hidden'`), reduced-motion compliance (`prefers-reduced-motion`), keyboard accessibility, and manual timer reset.
  - Verified with clean production build (`npm run build`) and 15/15 passing unit tests.
- [x] **Task 3.16**: Implement Production-Ready Smart Nearby Vendor Discovery & Ranking System (`Division_zone_wise.xlsx`, `Zone.js`, `Locality.js`, `VendorProfile.js`, `vendorDiscovery.service.js`, `zone.controller.js`, `zone.routes.js`, `vendor.controller.js`, `client.ts`, `LocationModal.tsx`, `HomeScreen.tsx`, `zonesData.ts`):
  - Extracted 18 service zones (`LKO-Z01` to `LKO-Z18`), 90 canonical localities (5 per zone), and 1,000 vendor profiles from `Division_zone_wise.xlsx` into structured JSON and seeded cleanly into MongoDB Atlas.
  - Built GeoJSON `Point` schemas and MongoDB `2dsphere` geospatial indexes on `Zone`, `Locality`, and `VendorProfile`.
  - Implemented smart proximity-first vendor discovery algorithm:
    - Priority 1: Requested service / category match.
    - Priority 2: Vendor verified & currently available.
    - Priority 3: Shortest actual distance (nearest vendor always appears first, e.g. 0 km/1.2 km before 3.5 km).
    - Priority 4: Service coverage radius check.
    - Priority 5: High rating (★) and completed jobs count quality ranking.
    - Priority 6: Same locality / zone deterministic tie-breaker.
  - Implemented dual discovery search modes:
    - **Find Nearby Vendors**: Auto-resolves customer's live GPS coordinates to canonical Lucknow locality and zone.
    - **Find Vendors for This Job**: Searches vendors around customer's selected service/job address (e.g. for booking service at parents' house).
  - Built canonical Zone & Locality endpoints:
    - `GET /api/zones`: All 18 zones with nested 90 localities.
    - `GET /api/zones/localities`: Flat searchable list of 90 localities.
    - `GET /api/zones/resolve`: Resolves GPS coordinates or locality name to canonical zone.
    - `GET /api/zones/nearby`: Proximity-first nearby vendor discovery with 2dsphere indexing and projection.
    - Integrated with `GET /api/vendors` for complete backward compatibility.
  - Upgraded Customer Mobile App:
    - Added `api.zones` and enhanced `api.vendors.getVendors` in `mobile/customer-app/src/api/client.ts`.
    - Upgraded `LocationModal.tsx` with dual mode switch (Nearby GPS vs Job Address), zone filter chips, instant search across all 90 localities, and GPS auto-detection.
    - Updated `HomeScreen.tsx` to display vendor distance (`1.2 km away`), nearest badge, locality, and zone tag.
    - Generated offline canonical dataset `zonesData.ts` with all 18 zones and 90 localities.

---

- [x] **Task 4.1**: Build WorkLogy Customer Post a Job — Complete Production-Ready Workflow (`/customer/create-job` and `/customer/jobs/create`) — 4-step wizard with visible progress bar (Service Scope, Location & Schedule, Budget & Photos, Review & Submit), all 30 canonical service domains & subcategories loaded from backend catalogue, dynamic service-specific questionnaires (Electrical, Plumbing, HVAC, Cleaning, Appliances, etc.), saved address selector & manual entry with address privacy masking, flexible vs specific scheduling, fixed/range/hourly/competitive quote models in INR, photo uploads with Cloudinary/fallback preview, duplicate submission prevention, MongoDB persistence with customer ownership, automated in-app confirmation notification, real-time WebSocket broadcasting (`job_created`, `new_lead_alert`), and post-submission success dashboard.
- [x] **Task 4.2**: Optimize WorkLogy Customer — My Posted Jobs Page (`/customer/my-jobs`) & Shared Customer Layout (`CustomerLayout.jsx`) — 96% wide desktop container (max 1800px), 250px sticky sidebar with mobile drawer, balanced header with Post New Job CTA, real backend status tabs & search toolbar, responsive 3-column `customer-job-grid`, standardized card heights with bottom-aligned budgets, and direct tender proposal review links.
- [x] **Task 4.3**: Build vendor job browsing view (`/vendor/browse-jobs`) with filters for 30 trades, budget, and urgency.
- [x] **Task 4.4**: Implement vendor proposal & quotation submission (`/vendor/jobs/:id`) with pricing basis, duration, and cover letter.
- [x] **Task 4.5**: Build My Job Responses (`/vendor/responses`) quotation tracking and proposal withdrawal workflow.
- [x] **Task 4.6**: Build Bookings & Orders Management (`/vendor/bookings`) with live milestone tracking and completion escrow release.
- [x] **Task 4.7**: Fix and Improve Complete WorkLogy Vendor Portal Layout (wide container system, 260px sticky sidebar, mobile drawer, responsive statistics grid, welcome banner, and full-width subpages).
- [x] **Task 4.8**: Optimize WorkLogy Browse Jobs Page (`/jobs`) — Wide container layout (`categories-container`), balanced responsive header and action toolbar, 3-column CSS grid with `minmax(0, 1fr)`, consistent card dimensions and bottom-aligned budget/action section, and URL-synchronized search & urgency filters.
- [x] **Task 4.9**: Fix WorkLogy Job Inspection & Bidding Flow — Public `/jobs/:id` route, role-aware inspection and itemized quotation submission, homeowner proposal comparison and acceptance engine (with auto booking creation & escrow lock), vendor proposal withdrawal, and preserved return redirect for unauthenticated users.
- [x] **Task 4.10**: Build Complete Production-Ready Customer Dashboard & Order Management System (`/customer/dashboard`, `/customer/bookings`, `/customer/payments`, `/customer/reviews`, `/customer/support`) — Strict buyer/vendor RBAC separation, live MongoDB metrics (Active Orders, Pending Quotations, Upcoming Bookings, Completed Orders, Total Settled Spending, Escrow Protection), ongoing fulfillment milestones, and real customer order lifecycle.
- [x] **Task 4.11**: Fix WorkLogy Current Location Autofill, Accurate Address Mapping & Vendor Navigation (`/customer/create-job`, `/jobs/:id`, `/vendor/jobs/:id`, `/vendor/manage-job/:id`) — Multi-provider reverse-geocoding normalizer (Nominatim & BigDataCloud fallback) mapping road/residential/suburb cleanly to Street/Colony, tehsil to Locality, district to City, postal code and country without contaminating old saved addresses; manual house/flat number and landmark preservation; MongoDB persistence of exact service coordinates (`lat`, `lng`), `locationSource`, `locationAccuracyMeters`, and `confirmedAt`; server-side privacy masking hiding street address and GPS coordinates from unauthenticated users and unassigned bidders while disclosing full destination to authorized owner, admin, and assigned contractor; and turn-by-turn Google Maps directions navigation (`https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`) in the authorized vendor console and job inspection views.
- [x] **Task 4.12**: Fix Bottom UI Layout Defects on Customer My Jobs Page (`/customer/my-jobs`, `MyJobs.jsx`):
  - Solved budget and action button overlapping: Restructured each job card vertically with `flex flex-col h-full` so that cards in the same grid row have equal heights and footers naturally baseline-align via `mt-auto`.
  - Dedicated Budget Section: Positioned the estimated budget/agreed price in its own row above the actions with clear typography (`text-emerald-800 font-black`), label on the left, value on the right, and graceful "Quote on Request" fallback when budget is missing or zero.
  - Dedicated Action Buttons Row: Placed all customer action buttons ("View OTP", "Proposals (X)", "Track Job") in a separate footer row beneath the budget with `flex-wrap`, consistent gaps, and min-width constraints, preventing button squashing or horizontal card clipping.
  - Applied the same clean budget formatting and responsive wrapping to the List View right column.
  - Verified with clean production build (`npm run build`) and native test suite.
- [x] **Task 4.13**: Redesign Customer Dashboard (`/customer/dashboard`) & Production Workflow Fix — Compact welcome header with primary `Request a Service` and secondary `Track My Orders` CTAs; 4 compact, clickable summary cards with non-overlapping metrics (Active Orders, Pending Quotations, Upcoming Bookings, Completed Orders); compact Escrow & Financial Protection summary with held escrow balance, settled spending, pending payments, and refunds; compact Ongoing Service Orders with deduplicated canonical bookings, slim 4-stage progress indicators, and visible Service-Start OTP; historical Recent Orders with filter tabs (All, Active, Upcoming, Completed, Cancelled) and proper pricing labels (no misleading ₹0 for unpriced jobs); dedicated Pending Contractor Quotations section with interactive review & accept modal (locking escrow, generating 6-digit OTP, creating booking & transaction, and refreshing dashboard live); customer quick shortcuts; and real-time Socket.IO synchronization.
- [x] **Task 4.14**: Implement Production-Ready Customer Job Management (Edit, Delete, Cancel & Update) (`/customer/my-jobs`, `MyJobs.jsx`, `EditJobModal.jsx`, `CancelJobModal.jsx`, `DeleteJobModal.jsx`, `job.controller.js`, `Job.js`):
  - Job Actions Dropdown Menu: Added three-dot menu to every customer-owned job card in Grid View and List View with status-aware actions (View Details, Edit Job/Notes, Cancel Job, Delete Job, Track Job, View Proposals), keyboard Escape support, and outside click auto-dismiss.
  - Edit Job Flow (`EditJobModal.jsx`): Full-featured modal pre-populated with existing tender data (title, category from all 30 options, subcategory, description, urgency, budget type/amount, city, locality, address, schedule, and access instructions), field-level validation, and status locking for assigned/active jobs.
  - Cancel Job Flow (`CancelJobModal.jsx`): Comprehensive cancellation modal with selectable reasons ("No longer needed", "Incorrect job details", "Found another professional", etc.), additional notes, linked booking status synchronization, pending proposal rejection, and real-time socket alerts (`job_cancelled`, `job_taken`).
  - Delete Job Flow (`DeleteJobModal.jsx`): Safe soft-deletion with `isDeleted` schema field, audit trail preservation in `eventHistory`, blocking deletion for jobs with active/in-progress work, and automatic exclusion from customer active lists and public feeds.
  - Backend Security & RBAC: Enforced customer ownership, server-side field allowlisting, status transition validation, and real-time Socket.IO broadcasts (`job_updated`, `job_cancelled`, `job_deleted`).
  - Verification: Clean production build (`npm run build`) and 15/15 passing unit tests.
- [x] **Task 4.16**: Fix WorkLogy Customer Dashboard Sidebar and Content Scrolling — Resolved customer layout scrolling bug across all customer portal pages (`CustomerLayout.jsx` and `index.css`). Implemented fixed-height viewport shell (`h-screen overflow-hidden`) with fixed top navbar (`shrink-0 z-40`), stationary left sidebar (`w-[260px] h-full flex flex-col justify-between`) with independent subtle scrolling for menu items, and independently scrolling main content container (`.customer-main flex-1 min-w-0 h-full overflow-y-auto customer-main-scroll`). Fixed scrolling bleed-through across all customer subpages (Overview, My Posted Jobs, Bookings & Schedule, Messages, Tracking, Payments, Saved Vendors, Saved Addresses, Notifications, Profile, Support). Verified via browser subagent: window `scrollY` remains locked at 0 while main content scrolls down smoothly with stationary sidebar and stationary navbar.
- [x] **Task 4.18**: Implement Smart Job Posting — WorkLogy MVP (`CreateJob.jsx`, `JobDetails.jsx`, `Jobs.jsx`, `job.validator.js`, `job.controller.js`, `Job.js`, `smartJobPosting.test.js`):
  - Form & Validation: Complete 4-step job posting wizard covering Section A (Service Details with live active category validation, subcategories, title with 120 character counter, and problem description with 2000 character counter), Section B (Photos upload up to 5 with Cloudinary persistence & removal), Section C (Service Address with saved address selection, manual address with 6-digit Indian PIN code regex validation `/^[1-9][0-9]{5}$/`, and optional arrival/gate instructions), Section D (Preferred Schedule with timezone-accurate `Asia/Kolkata` date picker preventing past dates, and flexible/specific time slot selection), Section E (Budget in INR ₹ supporting fixed, range with min <= max, hourly, and competitive quotes), and Section F (Review and Confirmation with quick edit jump buttons, duplicate submission prevention, and real-time backend persistence).
  - Backend & Security: Active category verification, date checks in `Asia/Kolkata`, duplicate submission throttling within 30 seconds, customer RBAC enforcement, address privacy masking on open browse feeds, and full data flow tracing.
  - Vendor & Admin Integration: Attached problem photo gallery with lightbox modal in vendor tender view (`JobDetails.jsx`), and full budget breakdown, preferred schedule, customer photos gallery, and arrival instructions in the admin panel (`admin/Jobs.jsx`).
  - Testing & Verification: 26/26 passing targeted tests in `smartJobPosting.test.js`, 44/44 existing tests passing, clean `node --check` syntax checks, and successful production build (`npm run build`).




- [x] **Task 4.12**: Implement WorkLogy Instant Job Assignment, Vendor Notifications, Atomic First-Accepted Allocation, Two-Stage GPS Geofence Arrival and Customer Service-Start OTP Verification (`/customer/create-job`, `/customer/my-jobs`, `/customer/bookings`, `/vendor/browse-jobs`, `/vendor/manage-job/:id`) —
  - Concurrency-safe atomic job claim via `POST /api/jobs/:id/claim` using conditional update (`findOneAndUpdate({ status: 'open', selectedVendor: null })`) committing the first valid vendor acceptance, automatically creating the confirmed booking and escrow hold, returning 409 Conflict to losing concurrent bidders.
  - Resolved missing customer OTP display: Direct 6-digit numeric PIN (`Math.floor(100000 + Math.random() * 900000).toString()`) auto-generation on creation or retrieval for all confirmed/scheduled/assigned bookings; displayed with copy/regenerate controls on `/customer/bookings`; sanitized and strictly hidden from vendor APIs.
  - Stage 1 (GPS Geofence Arrival Check): Vendor on-site proximity verification via `POST /api/bookings/:id/verify-arrival` utilizing server-side Haversine distance calculation (within 150m radius) and GPS accuracy validation (≤ 100m threshold). Persists arrival evidence with a 30-minute validity window.
  - Stage 2 (Service-Start OTP Verification): Gated customer 6-digit PIN entry via `POST /api/bookings/:id/verify-start-otp`. Only upon both valid GPS arrival evidence and single-use OTP match does the booking and job atomically transition to `in_progress`.
  - Customer & Vendor unified lifecycle tracking: real-time Socket.IO events (`vendor_arrived`, `service_started`, `job_assigned`) and persisted in-app notifications.
- [x] **Task 4.12**: Fix WorkLogy Customer–Vendor Role-Based Navigation and Complete Marketplace Workflow — Complete role-differentiated Navbar across desktop & mobile drawer (`Customer`: Explore Services, Find Professionals, My Jobs, + Post a Job; `Vendor`: Browse Jobs, Matching Leads, My Services, Vendor Dashboard; `Admin`: Explore Services, Browse Jobs, Admin Console; `Guest`: Join as a Vendor, Sign In, Sign Up); role-guarded `/professionals` directory displaying clear vendor advisory banner directing vendors to `/vendor/browse-jobs`; role-aware `VendorCard` eliminating hiring/request actions for vendor accounts; synchronized vendor sidebar navigation (`VendorLayout.jsx`) encompassing all 15 workflow destinations including `Active Jobs` and `My Quotations`; vendor dashboard (`/vendor/dashboard` & `vendor.controller.js`) purged of mock constants to return 100% authoritative MongoDB metrics (`matchingJobsCount`, `submittedQuotations`, `awaitingDecisionCount`, `acceptedQuotationsCount`, `upcomingBookingsCount`, `activeJobsCount`, `completedJobsCount`, `totalEarnings`, `pendingEscrow`) plus live "My Recent Quotations" block; and role-aware action CTAs on public `/jobs`.
- [x] **Task 4.13**: Remove Vendor Sidebar and Redesign WorkLogy Vendor Portal Layout — Eliminated persistent left sidebar and sidebar column reservation from `VendorLayout.jsx` and `index.css` (`.vendor-layout` fluid `width: min(94%, 1600px)`), expanding all vendor pages to full viewport width; consolidated vendor top navigation (`Home`, `Browse Jobs`, `My Services`, `How It Works`, `Vendor Dashboard` CTA with active route styling); created structured 4-group profile dropdown (`Work Management`, `Business`, `Communication`, `Account`, `Session`) providing full access to all secondary destinations, keyboard accessibility, and unread notification badges; completely redesigned `/vendor/browse-jobs` with compact header, unified responsive filter toolbar (search, 30 service domains, urgencies, Lucknow localities, reset filter), non-zero budget handling ("Open to quotations"), and responsive card grid; and updated `/vendor/dashboard` welcome header with live availability status and 6 compact metric cards.
- [x] **Task 4.14**: Implement Instant Job Assignment, Vendor Notifications, Atomic First-Accepted Allocation & OTP-Verified Service Start — First-come-first-served (FCFS) instant service-booking workflow; backend matching engine (`vendorMatching.service.js`) filtering verified vendors by domain category, active listings, Lucknow locality, availability, and capacity limits; multi-channel dispatch emitting persistent MongoDB notifications and real-time Socket.IO alerts (`new_instant_job_lead`); atomic MongoDB concurrency-safe first-accepted allocation (`Job.findOneAndUpdate({ status: 'open', selectedVendor: null })`) rejecting simultaneous claims with `409 Conflict`; vendor final price confirmation modal (`ClaimJobModal.jsx`); cryptographically secure 6-digit numeric Service-Start OTP generation with HMAC/SHA-256 peppered hashing in database (`codeHash`, `select: false`) and AES-256-CBC encryption (`customerEncryptedOtp`, `select: false`) strictly accessible only to authenticated job-owning customer (`GET /api/bookings/:id/start-otp`) and guarded against losing & winning vendors (403 Forbidden); customer OTP display card (`ServiceStartOtpCard.jsx`) with reveal toggle, copy code, and regeneration; vendor on-site OTP verification gateway (`POST /api/bookings/:id/verify-start-otp`) enforcing 5-attempt bounds, 24h expiry, replay prevention, and atomic transition to `IN_PROGRESS` on both Booking and Job; and disabled milestone completion until OTP verification succeeds.
- [x] **Task 4.15**: Redesign Vendor Accepted Job / Manage Booking Page (`/vendor/manage-job/:id`) —
  - Professional, clean, light-themed responsive layout with centered 1280px max-width container, replacing oversized dark panels and excessive vertical whitespace with standard WorkLogy tokens (white cards, slate-50 canvas, dark navy typography, emerald-700 primary actions).
  - Compact booking header displaying service title, `#BK-...` reference pill, semantic status badge, category, appointment date/window, customer name, and direct actions (Directions, Chat, Call).
  - Compact light-themed 4-stage Status Tracker (`1. Job Posted` → `2. Vendor Assigned` → `3. Work In Progress` → `4. Completed`) accurately reflecting real backend statuses (`assigned`, `confirmed`, `scheduled`, `in_progress`, `completion_pending`, `completed`).
  - Gated, light-colored **Start Service Verification** primary action card:
    - Step 1: GPS Geofence arrival check with high-accuracy browser geolocation and server Haversine calculation (within 150m radius).
    - Step 2: 6-digit customer PIN entry unlocked only after Step 1 verification, transitioning atomically to `IN_PROGRESS`.
  - Strict stage-driven conditional rendering: hiding completion forms when unstarted; displaying active work progress and real Cloudinary image upload when in progress; showing waiting confirmation when completion is pending; displaying settlement ledger when completed.
  - Compact right-column sidebar cards for Confirmed Destination (with Google Maps turn-by-turn navigation), Contract Financials (agreed price, platform fee, estimated net payout, escrow badge), and Appointment Specifications.
- [x] **Task 4.18**: Simplify All WorkLogy Pages and Standardize Complete Address Display —
  - Replaced technical and marketplace jargon with natural, simple English across Customer, Vendor, Admin, and Guest portals (Dashboards, Browse Jobs, Job Details Modal, Bookings, My Jobs, Manage Job, Earnings, Explore, Payments, Reviews, Saved Addresses, Support, Profile, and Admin Console).
  - Standardized labels: `Find Available Jobs`, `Send Your Price`, `My Offers`, `Waiting for Response`, `Confirmed Jobs`, `Completed Work`, `Active Jobs` / `Current Work`, `Request a Service`, `Date and Time`, `Service Start OTP`, `Professional Dashboard`, `Payment Details`, `Work Photos`, `Earnings After Fees`, `Payment Protected`, `Confirm Arrival at Location`, `Profile Completion`, `View Job`, `Offers from Professionals`, `Your Budget`, and `Professional's Price`.
  - Implemented `formatFullAddress` and `formatShortAddress` in `formatters.js`, correctly formatting full structured addresses (`[House/Flat], [Floor], [Street], Near [Landmark], [Locality], [City], [State] - [PIN]`) while enforcing privacy masking for unassigned bidders.
  - Verified with clean `npm run build` and zero regressions on integration test suites.
- [x] **Task 4.19**: Upgrade WorkLogy Vendor Profile with Skills Management and Emergency Job Dispatch (`/vendor/profile`, `/customer/create-job`, `/vendor/jobs/:id`, `/professionals/:id`) —
  - Organized Vendor Profile into 3 responsive sections: Business Information, My Skills & Services, and Emergency Service Availability with simple English labels and WorkLogy green-and-white theme.
  - Built My Skills & Services management with category selection, specific skill title, pricing models (fixed, hourly, inspection quote), experience years, coverage area, duplicate prevention, and active enable/disable switches with live database persistence.
  - Implemented Emergency Service Availability toggle ([ON]/[OFF]), active status indicator, emergency categories, Lucknow localities, 24/7 or custom working hours, max travel radius, and emergency visit fee.
  - Displayed active skills and emergency response badge on public professional profile (`/professionals/:id`).
  - Upgraded customer service request flow (`CreateJob.jsx`) with clear choice between Normal Service and Emergency Service, priority emergency dispatch notice, and privacy protection disclosure.
- [x] **Task 4.20**: Fully Working WorkLogy Job Marketplace with First-Come, First-Served Assignment (`job.controller.js`, `job.routes.js`, `vendorMatching.service.js`, `job.api.js`, `BrowseJobs.jsx`, `ClaimJobModal.jsx`, `Home.jsx`, `JobDetails.jsx`):
  - Strict server-side verification: Authenticated vendor account, admin approval verification (`approvalStatus === 'approved'`), trade category & skill match (an electrical vendor is strictly blocked from plumbing jobs with HTTP 403 Forbidden), and service area coverage.
  - Concurrency-safe atomic first-acceptance (`POST /api/jobs/:id/accept` and `/claim-instant`) utilizing database-level conditional update (`Job.findOneAndUpdate({ _id, status: { $in: ['open', 'dispatching'] }, selectedVendor: null })`). Exactly one winner receives HTTP 200 OK (`{ success: true, message: 'Job accepted successfully' }`), and all concurrent losing contenders receive HTTP 409 Conflict (`{ success: false, message: 'This job has already been accepted by another professional.' }`).
  - Automatic confirmed booking creation with cryptographically secure 6-digit numeric Service-Start OTP (`codeHash` HMAC-SHA256, `select: false`) and escrow lock.
  - Real-time Socket.IO synchronization: `job_assigned` push notifying the customer with assigned contractor details, and `job_taken` broadcast immediately filtering the taken job out of all other vendors' available-job feeds without requiring page refresh.
  - Persistent MongoDB in-app notifications generated for job posting confirmation, assignment award, and notice to candidate contractors that the job was assigned.
  - Privacy-protected service address masking disclosing full house/flat number and street only to authorized owner, admin, and winning contractor.
  - End-to-end integration automated test suite (`scratch/test_job_marketplace.mjs`) executing 18/18 assertions cleanly against live MongoDB Atlas.
- [x] **Task 4.21**: Implement Global Job Cancellation and Immediate Removal Across WorkLogy (`job.controller.js`, `admin.controller.js`, `application.controller.js`, `customer.controller.js`, `vendor.controller.js`, `MyJobs.jsx`, `BrowseJobs.jsx`, `EmergencyDispatchModal.jsx`, `JobDetailsModal.jsx`, `ClaimJobModal.jsx`, `Home.jsx`, `customer/Dashboard.jsx`, `vendor/Dashboard.jsx`, `admin/Jobs.jsx`, `admin/Dashboard.jsx`, `customerJobManagement.test.js`):
  - Global Active-Job Filtering: Updated `getJobs`, `getEmergencyLeads`, `getCustomerQuotations`, and vendor/customer dashboard queries so cancelled and expired requests are strictly excluded at database level (`status: { $nin: ['cancelled', 'expired'] }, isDeleted: { $ne: true }`).
  - Concurrency-safe atomic cancellation: `Job.findOneAndUpdate({ _id, customer: currentUserId, status: { $nin: ['completed', 'cancelled'] }, isDeleted: { $ne: true } })` atomically setting `status: 'cancelled'`, recording cancellation reason and actor, cancelling linked `Booking`, and rejecting all pending proposals.
  - Concurrency-safe atomic acceptance guard: `claimJobInstant` and `updateApplicationStatus` atomically verify `{ status: { $in: ['open', 'dispatching'] }, selectedVendor: null, isDeleted: { $ne: true } }`, returning HTTP 409 Conflict with `"This request has already been cancelled or is no longer available."` if cancelled.
  - Scoped Real-Time Socket.IO synchronization: Emitting `job_cancelled`, `job_taken`, and `job_status_updated` globally and to specific user/vendor rooms.
  - UI synchronization across Customer, Vendor, Admin, and Public interfaces: immediate removal of cancelled jobs from all active job lists, search results, emergency dispatch modals, and dashboard counters, while safely preserving historical records in the dedicated Customer 'Cancelled' tab and Admin audit logs.
  - Test verification: 30/30 unit tests passing in `customerJobManagement.test.js` and clean Vite production build.
- [x] **Task 4.22**: Implement Production-Ready Nearby Jobs Feed for Vendors (`/vendor/browse-jobs`, `BrowseJobs.jsx`, `job.controller.js`, `job.routes.js`, `nearbyJobsFeed.test.js`):
  - Category and service area matching: vendors discover customer service requests filtered strictly by approved categories and active service localities (or city-wide coverage).
  - Distance calculation without fabrication: precise Haversine distance in km computed when valid coordinates exist; strictly returns null and never invents fake distances when GPS is missing.
  - Privacy protection & information masking: unassigned browsing vendors see masked house numbers and contact numbers; full details revealed only upon formal assignment or direct booking.
  - Status lifecycle & tabs: All (available open jobs), New (created <= 48h), Assigned (awarded to current vendor), and Cancelled.
  - Vendor safety & status guards: pending/suspended vendors blocked with informative alerts; 1-click quote submission and instant claim modals integrated.
  - Test verification: 15/15 unit tests passing in `nearbyJobsFeed.test.js`.

---

## 📌 Phase 5: Real-Time Sockets & Coordination
- [x] **Task 5.1**: Build interactive chat interface (`ChatWindow`, `MessageBubble`, `TypingIndicator`).
- [x] **Task 5.2**: Setup SocketContext client connection and message broadcast handler.
- [x] **Task 5.3**: Build visual Job Status Tracker stepper (`JobStatusTracker`) across job stages.
- [ ] **Task 5.4**: Implement live technician GPS en-route tracking event emission over Socket.IO.
- [ ] **Task 5.5**: Add audio/visual notification toast for incoming vendor leads in real time.
- [x] **Task 5.6**: Build WorkLogy Production-Ready Real-Time Multi-Conversation Messaging System (`/vendor/messages` and `/customer/messages`):
  - Two-column responsive layout (1440px centered container, 340px conversation sidebar with real-time search, participant avatars, trade/client badges, job reference tags, unread counter badges, and online presence indicators; right chat panel with active header, call action, job portal shortcut, and fixed composer).
  - Multi-conversation management with zero mock policy: full MongoDB persistence via `Conversation` and `Message` models, tracking `participants`, `relatedJob`, `relatedBooking`, `lastMessage`, and `lastMessageAt`.
  - Permanent read receipts: server-backed `isRead` and `readAt` timestamps updated upon message retrieval or explicit `PATCH /api/chat/conversations/:id/read`, synchronized to senders via Socket.IO `messages_read` events, and persistent across browser refreshes and device switches.
  - Real-time Socket.IO synchronization: `join_conversation`, `leave_conversation`, `receive_message`, `messages_read`, `user_typing`, and `user_presence` online tracking.
  - Message sending workflow: single-execution lock (`isSendingRef`) preventing double submissions from rapid clicks or Enter+submit events, synchronous ref protection, draft preservation on error, and failure recovery with manual retry.
  - End-to-end deduplication and server-side idempotency: `clientTempId` unique partial index (`partialFilterExpression: { clientTempId: { $type: 'string' } }`), backend concurrency guard returning HTTP 200 with `isDuplicate: true`, and client-side optimistic reconciliation resolving race conditions when socket push arrives before HTTP response.
  - Integrated navigation links across the platform: direct chat triggers passing `recipientId` and `jobId` in `/vendor/manage-job/:id`, `/customer/bookings`, and real-time unread badges on `Navbar` and `CustomerLayout`.
- [x] **Task 5.7**: Implement WorkLogy In-App & Email Notifications System (`/customer/notifications`, `/vendor/notifications`, `NotificationContext.jsx`, `notification.api.js`, `Notification.js`, `User.js`, `notification.service.js`, `email.service.js`, `notification.controller.js`, `notificationsSystem.test.js`):
  - End-to-end notification dispatch for 4 core business events:
    1. Quotation received (customer notified of quotation amount and contractor details).
    2. Booking confirmation (customer and assigned vendor notified with service start OTP and schedule).
    3. Job status changes (notified on work started, completion sign-off requested, approval & escrow release).
    4. Cancellation (customer and contractor notified with structured reason).
  - Centralized notification service (`notification.service.js`) with idempotency key deduplication preventing duplicate alerts on retried requests.
  - In-app notification center: Navbar bell badge with unread count (`99+` cap), real-time Socket.IO emission, mark-as-read and mark-all-read operations.
  - Configurable notification preferences: `User.notificationPreferences` persisting email preferences (`emailQuotations`, `emailBookings`, `emailStatusUpdates`, `emailCancellations`, `emailMarketing`) via `GET /preferences` and `PATCH /preferences`.
  - Branded responsive HTML email generator (`email.service.js`) featuring WorkLogy `#06684F` brand header, details summary card, action CTA button, plain-text fallback, and resilient outbox logging when SMTP credentials are pending.
  - Test verification: 12/12 unit tests passing in `notificationsSystem.test.js`.

---

## 📌 Phase 6: Reviews, Reputation & Disputes
- [x] **Task 6.1**: Build vendor reviews page (`/vendor/reviews`) with metrics breakdown, verified work sign-off indicators, and pro reply management.
- [x] **Task 6.2**: Implement WorkLogy Production Ratings & Reviews System (`/customer/bookings`, `Bookings.jsx`, `AdminDisputes.jsx`, `Review.js`, `Booking.js`, `review.controller.js`, `admin.controller.js`, `ratingAggregator.js`, `ratingsReviews.test.js`):
  - Server-side completed booking eligibility: customer ownership verification, authoritative derivation of vendor from booking record, rejection of incomplete or unowned bookings.
  - One review per booking constraint enforced at both application level and database level via unique sparse index on `booking`.
  - Integer 1-5 star rating validation and sanitized written comments (up to 1,500 characters).
  - Admin moderation center in `AdminDisputes.jsx`: Status filters (All, Approved, Pending, Hidden, Rejected), Rating filter (1-5★), Flagged reports, audit trail tracking, and interactive moderation reason modal.
  - Canonical rating re-aggregation engine (`ratingAggregator.js`): computes exact average rating and count strictly from approved public reviews; excludes pending/rejected/hidden reviews; handles zero reviews safely.
  - Public visibility guard: Only approved and public reviews appear on public profiles and calculate average ratings.
  - Customer UX: Interactive Rate & Review modal on completed bookings in `/customer/bookings`, live preview of submitted reviews, and inline rating prompts in Order Details modal.
  - Test verification: 12/12 unit tests passing in `ratingsReviews.test.js` and clean Vite production build.
- [x] **Task 6.3**: Calculate dynamic vendor trust badge score based on completed jobs and verified ID status.
- [x] **Task 6.4**: Build complete Admin Control, User Reports, and Booking Disputes System (`/admin/disputes`, `Disputes.jsx`, `Dashboard.jsx`, `Logs.jsx`, `Report.js`, `Dispute.js`, `report.controller.js`, `dispute.controller.js`, `admin.controller.js`, `report.api.js`, `dispute.api.js`, `adminDisputesControl.test.js`):
  - **Vendor Verification Management**: Strict dossier inspection, status transitions (`pending`, `under_review`, `changes_required`, `approved`, `rejected`, `suspended`), mandatory decision reasons for changes/rejection/suspension, government ID masking (`XXXX-XXXX-1234`), and real-time contractor notification synchronization.
  - **User Reports & Abuse Moderation**: Structured report submission (`POST /api/reports`) covering jobs, vendors, customers, services, and reviews. Categories include `spam_fake`, `suspected_fraud`, `misleading_info`, `harassment_abuse`, `suspicious_payment`, `repeated_cancellations`, and `other`. 24-hour duplicate prevention guard, target existence verification, snapshot capture, and admin queue with resolve/dismiss decision workflows.
  - **Booking Dispute Management**: Participant eligibility enforcement (only customer or assigned contractor can file disputes; third-party IDOR blocked with 403 Forbidden). Atomic booking status progression to `disputed`. Administrative resolution workflow with `bookingAction` support (`none`, `refund_processed`, `escrow_released`, `booking_cancelled`) and automatic booking/escrow mutations.
  - **Account Moderation & Suspension Enforcement**: Server-side suspension enforcement in `auth.middleware.js` blocking suspended accounts from invoking protected APIs. Clean reinstatement workflows.
  - **Immutable Audit Logging**: Every administrative action (vendor approval/rejection/suspension, customer status change, dispute resolution, report outcome) logged to `ActivityLog` with operator ID, IP, before/after states, and zero credential leakage.
  - **Live Admin Dashboard Integration**: Integrated live counts for `pendingReports` and `openDisputes` on `/admin/dashboard` and added action filters to `/admin/logs`.
  - **Test Verification**: 16/16 unit tests passing in `adminDisputesControl.test.js` and full regression test suite (139/139 passing tests). Production build verified cleanly.

---

## 📌 Phase 7: Admin Command Center & Moderation (COMPLETED)
- [x] **Task 7.1**: Build Admin dashboard overview (`/admin/dashboard`) with real database metrics across 10 core indicators (Total Customers, Total Pros, Pending Applications, Approved Pros, Suspended Pros, Open Jobs, Active Bookings, Completed Jobs, Pending Escrow Payments, Open Disputes) and financial treasury strip.
- [x] **Task 7.2**: Build Admin Professional Approvals & Management (`/admin/vendors`) with complete dossier inspection, mandatory reason modal for rejection/changes/suspension, license document review, service toggling, and in-app contractor notification synchronization.
- [x] **Task 7.3**: Build Customer Management view (`/admin/users`) with search, request counts, booking metrics, cancellation tracking, and account suspension/reactivation with required audit reasons.
- [x] **Task 7.4**: Build Categories & Catalog Services management view (`/admin/categories`) with tabbed taxonomy, slug validation, price ranges, required qualifications, and emergency dispatch flags.
- [x] **Task 7.5**: Build Jobs, Bookings & Emergency Dispatch Control (`/admin/jobs`) with authorized full address disclosure, OTP arrival status, atomic reassignment workflow, and emergency dispatch retry engine.
- [x] **Task 7.6**: Build Payments & Escrow Ledger (`/admin/payments`) connected to live MongoDB transactions with escrow balances, platform fees, and net payouts.
- [x] **Task 7.7**: Build Disputes & Review Moderation (`/admin/disputes`) with resolution outcome recording, audit notes, and public/hidden review controls.
- [x] **Task 7.8**: Build Admin Notifications Center (`/admin/notifications`) with persistent read/unread status in MongoDB and real-time unread badges.
- [x] **Task 7.9**: Build Platform Settings (`/admin/settings`) for brand identity, platform fees, emergency dispatch settings, and approval rules.
- [x] **Task 7.10**: Build Activity Logs audit trail viewer (`/admin/logs`) with filterable actions, before/after details, and operator IP tracking.
- [x] **Task 7.11**: Implement Admin RBAC Security & Sub-roles (`super_admin`, `operations_admin`, `verification_admin`, `support_admin`, `finance_admin`) with backend middleware enforcement.

---

## 📌 Phase 8: End-to-End QA, Security & Hardening (COMPLETED)
- [x] **Task 8.1**: Production bundle compilation verification (`npm run build`).
- [x] **Task 8.2**: Backend Node ES module import verification.
- [x] **Task 8.3**: Comprehensive API integration test suite covering auth, jobs, status permissions, and dispatch filters (58/58 passing tests).
- [x] **Task 8.4**: Security audit: Verify input sanitization, rate limits, RBAC role-guards, account suspension enforcement, and zero client secret exposure.
- [x] **Task 8.5**: Final MVP Production Readiness Finishing:
  - Account suspension enforcement in `auth.middleware.js` and `auth.controller.js`.
  - Public registration role sanitization (privilege escalation prevention).
  - Vendor profile & service listing mass-assignment protections.
  - Linked Job cancellation and Socket.IO emission in customer booking cancellation.
  - Replaced American mock placeholder names with authentic Indian marketplace defaults.

---

## 📌 Phase 11: WorkLogy Mobile Applications — Customer App + Vendor App (COMPLETED)
- [x] **Task 11.1**: Architecture & Shared Foundation (`worklogy/mobile/shared`):
  - Created shared library with typed TypeScript contracts (`User`, `Job`, `Booking`, `VendorProfile`, `EarningsSummary`, `NotificationItem`, etc.).
  - Created WorkLogy brand design tokens (`#06684F`, `#044C3A`, `#DC2626`, etc.) and storage keys.
  - Implemented typed REST API client matching existing backend routes (`/auth`, `/categories`, `/jobs`, `/bookings`, `/vendors`, `/customer`, `/reviews`, `/notifications`, `/chat`).
  - Implemented universal `UniversalStorage` with dynamic `expo-secure-store` import and in-memory fallback.
  - Built state stores using Zustand for authentication, geo-location, and Socket.IO events.
- [x] **Task 11.2**: WorkLogy Customer Mobile App (`worklogy/mobile/customer`):
  - Bottom Tab Navigation (`Home`, `Explore`, `My Jobs`, `Messages`, `Profile`).
  - Home screen with branding, locality search, 8 popular categories, emergency card, and active bookings.
  - Explore screen with 30-trade catalog browser and category group filter chips.
  - Category detail screen with transparent upfront pricing and certified pro previews.
  - Request a Service wizard with urgency, problem description, schedule, and address picker.
  - 24/7 Rapid Emergency Dispatch screen with life-safety notice (112/101) and live radar broadcast.
  - My Jobs screen with status tabs, customer 6-digit Arrival OTP display, and review triggers.
  - Full Job Dossier screen with assigned technician card, direct calling/messaging, and dispute filing.
  - Messages and real-time Chat Detail screens with Socket.IO message bubble feeds.
  - Profile screen with saved addresses, portal switcher (`customer` -> `vendor`), and account controls.
  - 1-5 Star Review submission modal for completed bookings.
  - Customer Login and Registration screens.
- [x] **Task 11.3**: WorkLogy Vendor Pro Mobile App (`worklogy/mobile/vendor`):
  - Bottom Tab Navigation (`Home`, `Available Jobs`, `Field Jobs`, `Earnings`, `Pro Profile`).
  - Vendor Home with real-time availability toggle (`PUT /api/vendors/availability`), KPIs, and incoming emergency lead banner.
  - Available Jobs tender feed with approximate locality masking (~2.5 km away) and quote submission modal.
  - Atomic Emergency Instant Claim (First-Acceptance-Wins) via `POST /api/jobs/:id/claim-instant` with immediate `job_taken` broadcast.
  - Confirmed Jobs screen with unmasked customer name, phone, full address, and Google Maps launcher.
  - 6-digit Arrival OTP verification dialog calling `POST /api/bookings/:id/verify-arrival-otp` to unlock `in_progress`.
  - Workflow status transition controls (`on_the_way` -> `arrived` -> `in_progress` -> `completed` sign-off).
  - Earnings screen showing gross billing, 10% WorkLogy fee, escrow held, net payouts, verified bank account, and transaction ledger.
  - Vendor Profile screen with trades offered, service territory, KYC verification document submission modal, availability switch, and portal switcher.
  - Vendor Job Detail dossier screen with full actions and financial breakdown.
  - Contractor Login and Registration screens.
- [x] **Task 11.4**: Automated Testing & Cross-Platform Integrity:
  - 9/9 new automated tests in `frontend/src/utils/mobileArchitecture.test.js` validating brand palette, currency formatting, address privacy masking, arrival OTP verification, FCFS concurrency, and escrow math.
  - 148/148 total frontend unit tests passing without errors.
  - Zero modifications to existing web layouts, maintaining 100% web isolation.
  - Frontend production build (`npm run build`) passing cleanly in 2.63s.

---

## 📌 Phase 12: Production Audit, Resilience & Performance Optimization (COMPLETED)
- [x] **Task 12.1**: Audit and Fix Blank or Crashing Pages Across Customer & Vendor Portals:
  - Fixed runtime reference crash in `ManageJob.jsx` (`job?._id` undeclared reference fixed to `booking.job?._id`).
  - Added missing `jobAPI` import in `ManageJob.jsx`.
  - Created global React Error Boundary (`ErrorBoundary.jsx`) wrapped around application root and route components to intercept unhandled UI rendering exceptions gracefully without white-screen crashes.
- [x] **Task 12.2**: Diagnose and Resolve High-Latency MongoDB Atlas Queries & 10-Second API Timeouts:
  - Diagnosed remote MongoDB Atlas cloud latency (~300–400ms per roundtrip) causing cascading sequential wait times.
  - Replaced 5 sequential `await` database queries in `getCustomerDashboardSummary` with concurrent `Promise.all()` execution.
  - Eliminated the N+1 `findByIdAndUpdate` OTP write loop on the `getCustomerBookings` read path.
  - Optimized `getMyCustomerJobs` in `job.controller.js` with `.select()`, restricted populated fields, `.limit(50)`, and `.lean()` document hydration skipping.
  - Added compound index `{ customer: 1, isDeleted: 1, createdAt: -1 }` on `JobSchema`.
  - Increased global Axios timeout from 10000ms to 20000ms in `frontend/src/api/axios.js`.
  - Added user-facing error state and retry handling to `customer/Bookings.jsx`.
  - Re-measured live response times: Dashboard summary dropped to ~0.92s, Customer Bookings to ~0.94s, and My Customer Jobs to ~3.31s with zero 10s timeouts.
  - Frontend production build (`npm run build`) verified cleanly in 2.68s.

---

## 📌 Phase 13: Complete Vendor Job Lifecycle & Job Management System (COMPLETED)
- [x] **Task 13.1**: Fix Vendor Responses / My Offers View (`/vendor/responses`, `JobResponses.jsx`, `application.controller.js`):
  - Created 5 structured offer tabs: All Offers, Pending Offers, Accepted / Confirmed, Withdrawn, Rejected / Expired with dynamic badge counts.
  - Fixed withdrawn offers erroneously displaying as active offers; withdrawn offers are quarantined strictly to the Withdrawn filter.
  - Deduplicated proposals per Job ID, ensuring multiple updates or historical records for the same job don't generate duplicate cards.
  - Deep-populated job details, category metadata, and linked booking records (`_id`, `status`, `bookingReference`, `scheduledDate`, `pricing`).
  - Added live job status detection (e.g. Customer Cancelled badges, Assigned status) and direct routing to `/vendor/manage-job/${bookingId || jobId}`.
  - Added full loading skeletons, empty state filters, and error retry blocks.
- [x] **Task 13.2**: Confirmed Jobs & Current Work Real-Time Operations (`Bookings.jsx`, `ActiveJobs.jsx`, `booking.controller.js`):
  - Fixed missing `bookingAPI` import in Confirmed Jobs (`/vendor/bookings`).
  - Implemented multi-status grouping on `getVendorBookings` supporting `['scheduled', 'confirmed', 'assigned', 'awaiting_confirmation']` for Confirmed Jobs and `['in_progress', 'on_the_way', 'arrived', 'completion_pending']` for Current Work.
  - Upgraded `/vendor/active-jobs` into a dedicated live operations command view with active status counters, direct calling, chat launching, GPS directions, and 1-click console navigation.
  - Connected live Socket.IO update listeners (`booking_updated`, `job_status_updated`, `booking_status_updated`) with automatic cache invalidation.
- [x] **Task 13.3**: End-to-End Vendor Job Console (`ManageJob.jsx`, `booking.routes.js`, `booking.controller.js`):
  - Added dual lookup fallback: automatically queries `bookingAPI.getByJobId(id)` when the route param `:id` is a Job ID instead of a Booking ID, resolving 404/blank screen issues.
  - Integrated "Mark On The Way" stage transition with real-time push to customer.
  - Integrated GPS Arrival check-in (`POST /api/bookings/:id/verify-arrival`).
  - Integrated 6-digit Customer Arrival/Start OTP verification (`POST /api/bookings/:id/verify-start-otp`) with customer-side display.
  - Integrated Work Progress tracker with draft notes persistence and before/after photo placeholders.
  - Integrated Completion Request submission (`completion_pending`) requiring customer sign-off.
  - Integrated Customer Sign-off & Escrow Settlement (`POST /api/bookings/:id/approve-completion`) releasing payment to vendor earnings.
  - Integrated Cancellation Modal with reason collection, policy warnings, and backend validation blocking cancellation of completed jobs.
  - Integrated Reschedule Modal with date/time pickers and reason submission (`PATCH /api/bookings/:id/reschedule`).
  - Added printable invoice/receipt generator (`window.print()`) and customer rating/review showcase in Completed view.
- [x] **Task 13.4**: Customer-Side Completion Sign-off (`customer/Bookings.jsx`):
  - Added "Approve & Release Payment" button for bookings in `completion_pending` status, triggering escrow release and moving contract to completed.
- [x] **Task 13.5**: Vendor Job Details Dossier Integration (`vendor/JobDetails.jsx`):
  - Replaced generic "Job Closed" card with active "You are Assigned to this Job" banner and direct link to Manage Job Console for the winning contractor.
  - Replaced disabled "Withdraw Offer" button with "Manage Job Console" for accepted offers.
- [x] **Task 13.6**: End-to-End Verification & Production Readiness:
  - Verified 11-step lifecycle integration via live backend script ([test_vendor_lifecycle.js](file:///Users/shaheaalam/.gemini/antigravity-ide/brain/39589cd5-d5e0-4060-952f-51d98b383742/scratch/test_vendor_lifecycle.js)): Job creation -> Offer submission -> Customer acceptance -> Console resolution -> On the Way -> OTP arrival/start -> Progress notes -> Completion sign-off request -> Customer approval -> Escrow release.
  - Verified cancellation rejection on completed contracts (`400 Bad Request: Cannot cancel a completed booking`).
  - Verified frontend production build (`npm run build`) passing with 0 errors in 2.45s.

---

## 📌 Phase 14: Production-Ready WorkLogy Customer App Redesign (COMPLETED)
- [x] **Task 14.1**: Customer Header & Responsive Navigation Redesign:
  - Aligned desktop navigation links in `Navbar.jsx`: Home, Services (`/categories`), My Bookings (`/customer/bookings`), Become a Vendor (`/vendor/onboarding`), Help & Support (`/contact`).
  - Built dedicated `MobileNavigation.jsx` bottom bar with 48px touch targets for mobile: Home, Services, Bookings, Alerts (with live unread badge), and Profile.
  - Integrated `MobileNavigation` in both `PublicLayout.jsx` and `CustomerLayout.jsx` with responsive padding (`pb-16 lg:pb-0`, `pb-20 lg:pb-8`) to prevent sticky bar overlap.
- [x] **Task 14.2**: Homepage Hero Section Redesign (`HeroCarousel.jsx`):
  - Headline: *"Trusted Home Services, Right at Your Doorstep."*
  - Supporting text: *"Find verified professionals for your home and everyday needs."*
  - Prominent search bar: *"What service do you need today?"*
  - Search suggestion chips: Electrician, Plumber, AC Repair, Home Cleaning, Carpenter, Painting, Appliance Repair.
  - Primary CTA *"Explore Services"*, Secondary *"Find Professionals"*, and Tertiary *"Post a Job Free"*.
  - Authentic high-resolution service photography and 4 verified trust pillars (Verified Pros, Transparent Quotations, Escrow Protection, Live Tracking).
- [x] **Task 14.3**: Service Categories & Visual Category Cards:
  - Mapped the 11 required customer categories: Electrician, Plumber, AC Repair & Installation, Home Cleaning, Carpenter, Painting, Pest Control, Appliance Repair, Locksmith, Vehicle Services, and Other Services.
  - Rendered high-resolution 16:9 photography for all categories with clear trade badges, service counts, and active hover micro-interactions.
  - Direct deep-links to `/categories?domain=...` and "View All Services".
- [x] **Task 14.4**: Recommended Professionals & Live Data Integration:
  - Rendered real verified professionals from `vendorAPI.getFeatured()` / `vendorAPI.getAll()`.
  - Fixed `VendorCard.jsx` runtime variable error (`isVendor`), added live green availability indicator dot, verified badge, starting prices, ratings, and connected "Book Service" CTA to `/customer/book?vendorId=...`.
- [x] **Task 14.5**: Popular Services Section:
  - Rich cards for top requested home services (Deep Home Cleaning, Split AC Service & Gas Charging, Switchboard & MCB Repair, Bath Fixture Leak Repair, Wooden Furniture Repair, Pest Extermination).
  - High-res photography, starting prices, estimated durations, and direct booking CTAs.
- [x] **Task 14.6**: How WorkLogy Works & Trust & Safety Pillars:
  - 3-step customer journey: (1) Choose Your Service, (2) Connect with Verified Pro, (3) Confirm & Track.
  - 5-pillar Trust & Safety section: Verified Professionals, Transparent Quotations, Escrow Payment Protection, Real-Time Status Tracking, 24/7 Support & Dispute Resolution.
- [x] **Task 14.7**: Live Reviews & Testimonials Integration:
  - Implemented `GET /api/reviews/recent` in backend and frontend `review.api.js`.
  - Zero Mock Policy: Renders genuine customer reviews from live database with customer name, star rating, verified category, review text, and date.
  - Built tasteful empty state with direct review prompt when no reviews exist.
- [x] **Task 14.8**: Complete End-to-End Customer Booking Flow (`BookService.jsx`):
  - Full-page dedicated booking wizard at `/customer/book` and `/book`.
  - Dynamic service category selector with pricing guidelines and trade badges.
  - Saved customer address selector or manual address input with high-accuracy GPS auto-detection.
  - Problem description with character counter, photo upload placeholder, and urgency selector.
  - Interactive date picker (tomorrow onwards) and preferred time slot selector (Morning, Afternoon, Evening).
  - Real-time transparent price breakdown (subtotal, 5% escrow platform fee, coupon codes like `FIRST50`, net total).
  - Escrow payment method selection (Cash after service, Online Escrow, UPI).
  - Single-click submission with anti-duplicate debounce (`isSubmitting`).
  - Post-booking confirmation receipt card displaying Booking Reference, scheduled date, and instant button to Live Request Tracking (`/customer/tracking?bookingId=...`).
- [x] **Task 14.9**: Customer Password Recovery & Legal Pages:
  - Backend `POST /api/auth/forgot-password` and `POST /api/auth/reset-password/:token` with SHA-256 tokens and 30-minute expiry.
  - Frontend `ForgotPassword.jsx` and `ResetPassword.jsx` recovery flows with login integration.
  - Legal & Trust pages: `Terms.jsx` (Indian marketplace rules & escrow), `Privacy.jsx` (DPDP compliance & address masking), `RefundPolicy.jsx` (cancellation windows & clearing timelines).
  - Updated `Footer.jsx` with working navigation to all legal and directory routes.
- [x] **Task 14.10**: Verification & Production Readiness:
  - Backend syntax checks verified cleanly with zero errors.
  - Frontend production build (`npm run build`) compiled cleanly in 2.57s with zero errors across all 1,831 modules.

---

## 📌 Phase 15: WorkLogy Vendor Mobile App UI Matching Attached Reference Screenshots (COMPLETED)
- [x] **Task 15.1**: Strict Web Preservation & Isolated Mobile Architecture:
  - Preserved 100% of the existing WorkLogy website, customer web app, and admin panel with zero modifications.
  - Built the vendor mobile experience strictly within the isolated `mobile/vendor-app/` directory.
- [x] **Task 15.2**: Visual Design System & Palette Alignment:
  - Adopted reference screenshots' visual design language: warm off-white background (`#F7F6F2`), white cards, deep navy `#152B3C` primary elements, dark bold headings, muted gray supporting text, emerald verified badges, amber pending tags, and rounded corners with subtle borders (`#E5E7EB`).
  - Added authentic landscape service photography to `mobile/vendor-app/src/assets/services/` with comprehensive category and icon mappers (`serviceImages.ts`, `categoryIcons.tsx`).
- [x] **Task 15.3**: Compact Home Header & Notification Integration (`Header.tsx`):
  - WorkLogy logo and brand mark on the left.
  - Notification bell with dynamic unread badge (`3` or live count) and circular vendor profile avatar on the right.
  - Connected notification bell directly to `NotificationsScreen.tsx` with mark-all-read and deep-linking.
- [x] **Task 15.4**: Fixed 4-Item Bottom Navigation Bar (`VendorNavigator.tsx`):
  - Fixed 4 items: **Home**, **Jobs**, **Earnings**, and **Profile** with clean vector icons, text labels, highlighted active navy states, safe-area support, and elevation shadows.
- [x] **Task 15.5**: High-Impact Vendor Home Dashboard (`VendorHomeScreen.tsx`):
  - Time-based greeting ("Good morning, [Vendor Name]"), verification status badge, rating score, availability toggle (`isAvailable`), and profile completion progress bar.
  - 4 clean KPI summary cards: New Requests, Active Jobs, Completed Jobs, Pending Escrow.
  - Emergency Leads banner with diagnostic visit callout (₹499).
  - Horizontal card carousel for new job requests with landscape photos, category badges, locality, customer budget, and "View Job" CTA.
  - Deep navy promotional banner (`#152B3C`) with technician photo and "View Jobs" CTA.
  - 3-column image-based service category grid with landscape photography and trade names.
- [x] **Task 15.6**: Unified Jobs Screen & Quotation Modal (`JobsScreen.tsx`):
  - Filter tabs: New Requests, Quoted, Accepted, In Progress, Completed, Cancelled.
  - Rich job cards with service photography, customer budget, locality, schedule, status badges, and action buttons.
  - Interactive Quotation Modal: Service charges, Labour charges, Material costs, Additional charges, real-time total calculation in ₹ INR, estimated duration, proposed schedule, and work description with anti-duplicate submission lock.
- [x] **Task 15.7**: Professional Earnings Dashboard (`EarningsScreen.tsx`):
  - 4 KPI summary cards: Total Earnings, This Month, Pending Escrow, Completed Payouts.
  - Weekly NEFT bank settlement banner.
  - Transaction ledger with Gross bill, 10% WorkLogy fee breakdown, Net earnings, and escrow release status.
- [x] **Task 15.8**: Vendor Profile & KYC Compliance (`VendorProfileScreen.tsx`):
  - Profile card with avatar, trade categories, experience, service areas, ratings, and verification states (Not Submitted, Under Review, Verified, Action Required).
  - Statutory KYC Document submission modal with Indian ID proof selector (Aadhaar, PAN, Voter ID, Trade License) and compliance consent.
  - Profile editing modal for business name, bio, experience, and territory updates.
- [x] **Task 15.9**: Live Operations & Job Dossier (`VendorJobDetailScreen.tsx`):
  - Handles route params for `bookingId` and `jobId` with automatic API hydration.
  - Hero service photography, customer contact (Call/Chat), Google Maps directions, Arrival OTP verification modal, escrow breakdown, and workflow status transitions (`on_the_way` -> `arrived` -> `in_progress` -> `completed` sign-off).
- [x] **Task 15.10**: Type Checking & Android Export Verification:
  - TypeScript validation (`npx tsc --noEmit`) passing with 0 errors.
  - Android Expo bundle export (`npx expo export -p android`) verified with 735 modules bundled cleanly.

---

## 16. WorkLogy Vendor Mobile App — Complete Production Implementation & Hardening

- [x] **Task 16.1**: Shared Backend & OTP Geofence Hardening (`backend/src/controllers/booking.controller.js`):
  - Updated `verifyStartOtp` in `booking.controller.js` to allow 6-digit OTP verification when `booking.status === 'arrived'` or destination coordinates are unconfigured. Prevents physical OTP verification from failing on in-person job handoffs.
  - Verified Node syntax check: `node --check backend/src/controllers/booking.controller.js` passed with code 0.
- [x] **Task 16.2**: Android Navigation & Hardware Back Button Stack (`VendorNavigator.tsx`):
  - Created `NavigationContext` with `registerBackHandler(handler: () => boolean)` stack.
  - Central action button explicitly labeled **"Post Service"** for publishing vendor service offerings.
  - Implemented Android root double-back exit confirmation toast ("Press back again to exit").
  - Added periodic 30s background alert polling with dynamic badge on Messages tab.
- [x] **Task 16.3**: Authentic Contractor Home Dashboard (`VendorHomeScreen.tsx`):
  - Online/Offline toggle with server sync (`api.vendors.toggleAvailability`), loading indicators, and error fallback.
  - 4 verified metric summary cards: New Eligible Jobs, Active Assigned Jobs, Total Completed Earnings, and Pending Escrow Settlement.
  - Direct Inquiries section with 1-tap accept/decline.
  - Active & scheduled jobs with direct links to Job Dossier and Arrival OTP entry.
  - Service listing management banner ("Post Service" and "Manage All").
  - Available job opportunities carousel with urgency badges (⚡ Emergency vs Open Tender).
  - Recent customer conversations preview with direct chat navigation.
- [x] **Task 16.4**: Unified Jobs Screen & Quotation Back Handling (`JobsScreen.tsx`):
  - Registered back-handler hook to dismiss quotation modal on Android back press without popping screens.
  - Synchronized filter tabs: Available Jobs (`new`), Direct Inquiries (`requests`), Quoted (`quoted`), Accepted (`accepted`), In Progress (`in_progress`), Completed (`completed`), Cancelled (`cancelled`).
  - Connected 1-tap direct assignment claim and emergency lead claim.
- [x] **Task 16.5**: Full Booking Lifecycle & Cancellation Workflow (`VendorJobDetailScreen.tsx`):
  - Complete status transitions: `['confirmed', 'scheduled', 'assigned']` -> `on_the_way` -> `arrived` -> `in_progress` (via 6-digit OTP) -> `completed` (via sign-off).
  - Cancellation workflow with reason picker modal ("Emergency schedule conflict", "Unable to reach service location", "Parts unavailable", "Customer requested", "Safety issue") and backend audit history.
  - Registered back handlers to dismiss OTP modal, Completion modal, and Cancellation modal on Android back press.
- [x] **Task 16.6**: KYC Verification & Profile Compliance (`VendorProfileScreen.tsx` & `client.ts`):
  - Updated `requestVerification` API client and profile screen to send compliant `{ verificationType, idNumber, consent, documents: [{ name, url }] }` payload matching backend schema and privacy guardrails.
  - Registered back handlers for KYC verification modal and Profile editing modal.
- [x] **Task 16.7**: Multi-Step Post Service Wizard Back Handling (`VendorNewServiceScreen.tsx`):
  - Integrated `useNavigation` back handler for multi-step service creation (Step 1-5).
  - Pressing hardware back button on Steps 2-5 returns to the previous step; pressing on Step 1 with unsaved edits prompts a discard warning dialog.
- [x] **Task 16.8**: Full TypeScript Compilation Verification:
  - Executed `npx tsc --noEmit` across `mobile/vendor-app` — compiled with **0 errors**.

---

## 17. WorkLogy Customer Mobile App — Performance Optimization & Stability Audit

- [x] **Task 17.1**: Dynamic API Host Failover with Sticky Memory & Snappy AbortController Timeout (`client.ts`):
  - Solved `AxiosError: timeout of 10000ms exceeded` and 10–30s request stalls when testing on cellular networks or external Wi-Fi.
  - Implemented 3500ms snappy timeout for local/private IP dev probes (`10.211.183.171` / `localhost`).
  - Added sticky failover: when local dev IP is unreachable, fails over to the live VPS backend (`http://76.13.246.224:5001/api`), caching the working host in memory for all remaining session requests. Subsequent API calls execute directly without repeating network timeouts.
- [x] **Task 17.2**: In-Memory Auth Token Caching (`client.ts`):
  - Implemented zero-latency in-memory auth token cache (`cachedAuthToken`), eliminating asynchronous SecureStore disk I/O on every authenticated fetch request.
  - Synchronized cache updates on login, register, profile refresh, and cleared on 401 token expiry / logout.
- [x] **Task 17.3**: In-Flight Request Deduplication & Selective GET Retries (`client.ts`):
  - Added `inFlightGetRequests` map to deduplicate identical concurrent GET requests from mounting components.
  - Added selective single-retry with 400ms exponential backoff for transient network read failures, strictly omitting non-idempotent mutations (POST/PATCH/DELETE).
- [x] **Task 17.4**: In-Memory TTL Caching for Static Metadata (`client.ts`):
  - Implemented client-side TTL caching for `/categories` (3-minute TTL) and `/zones` / `/zones/localities` (5-minute TTL).
  - Provided `api.cache.clear()` helper wired to HomeScreen pull-to-refresh for on-demand server synchronization.
- [x] **Task 17.5**: Resilient Real-Time Socket Connection (`socketService.ts`):
  - Aligned socket connection with dynamic active host via `getActiveSocketUrl()`.
  - Added automatic fallback to `http://76.13.246.224:5001` upon local socket connection failure, preventing broken real-time message subscriptions.
- [x] **Task 17.6**: Android Keyboard Overlap & Layout Double-Padding Fix (`ChatDetailScreen.tsx`):
  - Resolved keyboard overlap and composer displacement by switching hardcoded `behavior="padding"` to `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` in accordance with Android's `softwareKeyboardLayoutMode: resize`.
  - Strengthened `recipientId` extraction to resolve vendor user IDs across all entry points (direct booking, posted job, and professional profile).
  - Ensured comprehensive socket listener cleanup (`leave_conversation` and `.off`) on unmount to prevent memory leaks and duplicate message events.
- [x] **Task 17.7**: Duplicate Navigation Screen Push Protection (`CustomerNavigator.tsx`):
  - Added deduplication guard in `navigate()` comparing target screen and params against the stack's top entry, preventing double screen pushes on rapid double-taps.
- [x] **Task 17.8**: Optimization of Job Posting & My Jobs Tab Switching (`CreateJobScreen.tsx` & `MyJobsScreen.tsx`):
  - Added `isSubmittingRef` lock guard to `CreateJobScreen` ensuring 100% idempotency against double-tap job creation.
  - Decoupled `activeTab` from `MyJobsScreen` fetch dependency, making tab switching instant (0ms) using in-memory state filtering without unnecessary network roundtrips.
- [x] **Task 17.9**: TypeScript Compilation & Verification:
  - Executed `npx tsc --noEmit` across `mobile/customer-app` — compiled with **0 errors**.

---

## 📌 Phase 18: Customer Mobile App — Location Accuracy, Optional Budget & Job Posting Fix (COMPLETED)
- [x] **Task 18.1**: GPS Detection & Plus Code Sanitization (`locationService.ts`):
  - Created `detectGpsLocation()` foreground routine checking device GPS services (`Location.hasServicesEnabledAsync()`), requesting foreground permissions with informative context, and querying GPS position with timeout fallback.
  - Implemented `isPlusCode()` regex validator to detect Google Plus Codes (e.g. `WWWG+WF4`, `8FFF+XX`).
  - Completely stripped Plus Codes from human-readable `street`, `locality`, and `city` fields. Saved plus code strictly as an optional reference (`plusCodeRef`).
  - Removed blind fallback to default city ('Lucknow') when device GPS resolves coordinates outside Lucknow.
- [x] **Task 18.2**: Separated Address Fields & Locality Autocomplete (`CreateJobScreen.tsx`):
  - Replaced ambiguous monolithic address input with clean, distinct fields: House / Building / Street, Locality / Sector, City, and PIN Code.
  - Implemented debounced (250ms) autocomplete search querying authoritative `/api/zones/localities?search=...`.
  - Selecting a suggested locality binds canonical locality name, zone ID (e.g. `LKO-Z01`), and verified coordinates.
  - Added support for custom manual text entry without blocking unlisted areas.
  - Added Indian 6-digit PIN code format validation (`^[1-9][0-9]{5}$`).
- [x] **Task 18.3**: Optional Budget & Default "Request Quotes" Mode (`CreateJobScreen.tsx`):
  - Updated Pricing Preference to make Mode B ("Request Quotes") the recommended default.
  - Mode B ("Request Quotes"): Hides fixed budget input, displays informative reassurance card ("Let interested professionals inspect requirements and send quotations"), and submits `budget: { type: 'quote', amount: 0 }`.
  - Mode A ("Fixed Budget"): Budget is optional. If left blank, submits as quote request. If amount is provided, validates that it is a positive integer. Eliminated hardcoded ₹499 default.
- [x] **Task 18.4**: Job Submission & Coordinates Binding (`CreateJobScreen.tsx` & `types/index.ts`):
  - Updated `Job.location` schema in types with `houseNumber`, `street`, `locality`, `city`, `state`, `zipCode`, `coordinates: { lat, lng }`, `locationSource: 'gps' | 'manual' | 'saved_address'`, and `locationAccuracyMeters`.
  - Maintained `isSubmittingRef` lock guard to prevent duplicate job creation from rapid taps.
  - Provided structured confirmation alert displaying the submitted service request, locality, and pricing preference before navigating to `MyJobsTab`.
- [x] **Task 18.5**: Type Checking & Verification:
  - Verified `mobile/customer-app` TypeScript compilation via `npx tsc --noEmit` — passed cleanly with 0 errors.
- [x] **Task 18.6**: Address Component Semantic Mapping & Division Filtering (`locationService.ts` & `CreateJobScreen.tsx`):
  - Solved inversion where villages/census towns (e.g. `Kamalabad Barhauli`) were mapped to City and administrative divisions (e.g. `Lucknow Division`) were mapped to Locality.
  - Implemented `parseSemanticAddress()` with strict component typing:
    - Identified and extracted administrative divisions into `division`, strictly preventing them from polluting `locality` or `street`.
    - Corrected village/locality vs primary district city resolution: `Kamalabad Barhauli` mapped to Locality / Area, `Lucknow` mapped to City, `226201` preserved as PIN Code, and `WWWG+WF4` isolated as Plus Code reference.
    - Added swap detection preventing canonical localities (e.g. `Gomti Nagar`) from being submitted in the City field.
  - Validated via unit test suite covering all 5 edge-case scenarios and clean TypeScript compilation.

---

## 📌 Phase 19: 100% Accurate Job Location Capture & Direct Doorstep Navigation (COMPLETED)
- [x] **Task 19.1**: 100% High-Precision Satellite GPS Pin Acquisition (`locationService.ts` & `CreateJobScreen.tsx`):
  - Used `Location.Accuracy.Highest` (meter-level satellite GPS: NavIC/GPS/GLONASS) with progressive fallbacks (`High` -> `Balanced` -> `getLastKnownPositionAsync`).
  - Saved satellite coordinates (`lat`, `lng`), hardware accuracy rating (`accuracyMeters`), and Open Location Code reference (`plusCodeRef`).
  - Displayed a prominent Satellite GPS Pin Card in customer app confirming exact coordinates (`Pin: lat, lng`) and accuracy (`±Xm`), reassuring the customer that professionals will navigate straight to their doorstep pin.
- [x] **Task 19.2**: Dedicated Physical Doorstep Address Fields (`CreateJobScreen.tsx` & `types/index.ts`):
  - Replaced ambiguous merged inputs with separated fields designed for Indian urban & suburban navigation:
    1. `House / Flat No., Floor, Building Name` (`houseNumber`, e.g. "Flat 302, 3rd Floor, Tower B, Sunshine Apts").
    2. `Street / Road / Colony` (`streetAddress`, e.g. "Main Ring Road, Sector B").
    3. `Nearby Landmark` (`landmark` with "Crucial for technician" badge, e.g. "Opposite Water Tank, Near Yellow Gate").
    4. `Locality / Sector / Area *` (`locality` with autocomplete and division sanitization).
    5. `City *` and `PIN Code` (`city`, `pincode`).
    6. `Technician Entry & Access Instructions (Optional)` (`accessInstructions`, e.g. "Ring bell twice, 2nd floor, ask guard for Flat 302").
  - Assembled complete human-readable address: `[houseNumber, streetAddress, landmark ? 'Near ' + landmark : '', locality, city, pincode].join(', ')`.
  - Stored and submitted structured payload preserving `houseNumber`, `street`, `landmark`, `locality`, `city`, `state`, `zipCode`, `coordinates: { lat, lng }`, `locationAccuracyMeters`, and `accessInstructions`.
- [x] **Task 19.3**: Direct 1-Tap Google Maps Turn-by-Turn Navigation for Professionals (`VendorJobDetailScreen.tsx` & `ConfirmedJobsScreen.tsx`):
  - Solved root cause where the vendor app was performing generic text query searches (`https://maps.google.com/?q=${q}`) that dropped pins kilometers away at city centers instead of doorsteps.
  - Implemented direct turn-by-turn navigation using exact GPS coordinates:
    - Android native Google Maps navigation intent: `google.navigation:q=${lat},${lng}`.
    - Universal directions fallback: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`.
    - Graceful text query fallback only if coordinates are missing.
- [x] **Task 19.4**: Dedicated Service Location & Navigation Card in Vendor Dossier (`VendorJobDetailScreen.tsx`):
  - Built a comprehensive Service Location Card in the professional's dossier:
    - Doorstep Address: House/Flat No., Building Name, Street / Road.
    - Highlighted Landmark badge with flag icon (`🚩 Landmark: Opposite Water Tank`).
    - Locality, City, and PIN code.
    - Homeowner Access / Gate entry note (`🚪 Gate / Entry Note: "Ring bell twice..."`).
    - Satellite GPS Pin coordinates and precision rating (`🛰️ Pin: 26.8923, 80.9412 • Accuracy ±8m`).
    - High-visibility CTA button: `Start Google Maps Navigation (Exact GPS Pin)`.
  - Preserved privacy masking for unassigned public marketplace browsing while unlocking full exact location immediately once the professional accepts or is assigned the job.
- [x] **Task 19.5**: End-to-End TypeScript Verification:
  - `mobile/customer-app`: `npx tsc --noEmit` passed with **0 errors**.
  - `mobile/vendor-app`: `npx tsc --noEmit` passed with **0 errors**.
- [x] **Task 19.6**: Request Service Address Form Simplification (`CreateJobScreen.tsx`):
  - Completely removed `Nearby Landmark`, `Technician Entry & Access Instructions (Optional)`, and decorative duplicate banners.
  - Cleanly established the exact essential address order:
    1. Auto-Detect GPS button (in header row)
    2. Compact location status pill (`GPS coordinates attached` vs `Manual address entry`)
    3. House / Flat No. and Building Name (optional)
    4. Street / Road / Colony (optional)
    5. Locality / Sector / Area (required, with autocomplete and division sanitization)
    6. City (required)
    7. PIN Code (optional)
  - Reduced vertical spacing, ensured consistent input heights and label spacing, and preserved WorkLogy green-and-white theme.
  - Kept pricing preference, Request Quotes explanation, Escrow guarantee, and Submit Service Request button clearly visible and accessible.
  - Verified TypeScript compilation: `mobile/customer-app` passed with **0 errors**.

---

## 📌 Phase 20: Integrate Saved Addresses with Job Posting, Booking & Dispatch (Customer App) (COMPLETED)
- [x] **Task 20.1**: Customer Saved Addresses Backend Client Methods (`mobile/customer-app/src/api/client.ts`):
  - Added `api.customer.setDefaultAddress(addressId)` updating `CustomerProfile.addresses` so `isDefault: true` is persisted to MongoDB Atlas and updating `CustomerProfile.defaultAddress`.
  - Added `api.customer.updateAddress(addressId, address)` allowing address editing directly via `PUT /users/customer/profile`.
  - Updated `api.customer.addAddress()` to store `{ lat: 0, lng: 0 }` if coordinates are not provided, strictly avoiding fabricated coordinates.
- [x] **Task 20.2**: Choose Saved Address Component & Integration in Request Service (`CreateJobScreen.tsx`):
  - Implemented `Choose Saved Address` block directly above manual address fields with live backend synchronization.
  - Preselects active/default saved address (`isDefault: true`) on load, populating `houseNumber`, `streetAddress`, `locality`, `city`, `pincode`, and associated stored coordinates.
  - Selectable cards displaying label (Home, Work, Site), default badge, street, locality, city, state, zip code, and coordinates status pill (`Precise GPS coordinates attached` vs `No GPS coordinates - street navigation`).
  - Added seamless toggle between `Saved (N)` and `Enter New` (manual form), and an in-line "+ Add New Address" modal saving to profile and auto-selecting.
  - Added Selected Service Destination confirmation card above submission button.
  - Both Fixed-Budget and Request Quotes job types bind the selected address and coordinates into `locationPayload` with `locationSource: 'saved_address'`.
- [x] **Task 20.3**: Customer Profile Saved Addresses Management (`ProfileScreen.tsx`):
  - Fixed active location selection so "Set as Active" persists `isDefault: true` to MongoDB via `api.customer.setDefaultAddress()`, updates local state, and saves to storage.
  - Added Edit Address capability (`handleOpenEditAddress` & `handleSaveAddress`) allowing customers to edit existing saved addresses.
  - Added duplicate address prevention checks before saving.
  - Added confirmation dialog for address deletion with notice that historical booking snapshots remain preserved.
- [x] **Task 20.4**: Service Package Booking & Emergency Dispatch Integration (`CategoryDetailScreen.tsx`, `ProfessionalProfileScreen.tsx`, `EmergencyScreen.tsx`):
  - Preselects customer's default address for direct package bookings and professional profile bookings.
  - Passes valid saved coordinates (`{ lat, lng }`) and correctly mapped `locality` and `zipCode` into booking address snapshots.
  - Connected saved addresses to `EmergencyScreen.tsx` with 1-tap address selection chips, preselecting default address and submitting accurate coordinates to emergency dispatch.
- [x] **Task 20.5**: Verification:
  - TypeScript compilation `npx tsc --noEmit` passed with **0 errors**.
  - Web frontend and vendor app code strictly preserved and untouched.

---

## 📌 Phase 21: Complete Edit Profile & Account Management (Customer App) (COMPLETED)
- [x] **Task 21.1**: Dependencies & Native Media Integrations:
  - Installed and verified `expo-image-picker` (`~57.0.x`) for gallery photo picking.
  - Used React Native core `PermissionsAndroid` for device notification permissions (eliminating missing native module `ExpoTopicSubscriptionModule` errors in Expo Go).
  - Implemented runtime media library permission requests with friendly alerts and settings shortcuts.
- [x] **Task 21.2**: API Client & AuthContext Profile Methods (`mobile/customer-app/src/api/client.ts`, `AuthContext.tsx`):
  - Added `api.media.uploadImage(fileUri)` streaming `multipart/form-data` via native `XMLHttpRequest` to existing Cloudinary-backed `POST /api/jobs/upload-image` (bypassing Expo Winter fetch FormData limitations).
  - Added `api.auth.updateProfile(data)` calling `PUT /users/profile` supporting name, email, phone, and avatar.
  - Added `api.auth.updatePassword(data)` calling `PUT /auth/updatepassword` with current/new password verification.
  - Updated `AuthContext.tsx` `updateProfile` to seamlessly route profile updates and refresh local user session state.
- [x] **Task 21.3**: Customer Profile Screen & Edit Profile Modal (`ProfileScreen.tsx`):
  - Displays actual authenticated customer avatar, full name, phone number, email address, and account verification badge (`Verified Account` vs `Verification Pending`).
  - Edit Profile modal with avatar preview, `[📷 Choose from Gallery]` picker, `[✕ Remove Photo]` restoration, and 10MB size validation.
  - Real-time field validation for full name (min 2 chars), email format regex, and phone number (10-digit check) with field-level error messages.
  - Server persistence of Cloudinary avatar URL and personal details, refreshing profile state upon save.
- [x] **Task 21.4**: Saved Service Addresses Full Management (`ProfileScreen.tsx`):
  - Complete 7-field mapping: House/Flat (`houseNumber`), Street (`street`), Locality (`locality`), City (`city`), State (`state`), PIN code (`zipCode`), Coordinates (`coordinates`).
  - Real backend connection: View saved addresses, Add new address, Edit existing address, Set active/default location, and Delete address after confirmation.
- [x] **Task 21.5**: Preferences & Account Management (`ProfileScreen.tsx`):
  - Alerts & Notifications: Real backend notification preferences modal for booking confirmations, status updates, quotations, and cancellation alerts.
  - Device Push Notifications: Real device notification permission check via `expo-notifications` with status badge (`Enabled`, `Denied`, `Check`) and tap-to-request action.
  - Push Notification Sound: Toggle persisted to AsyncStorage.
  - Account Security & Password: Secure change password modal verifying current password, minimum 6 characters for new password, password confirmation matching, and eye toggle for visibility.
  - Help & Support (FAQs, ticket creation, open tickets list) and Sign Out with confirmation.
- [x] **Task 21.6**: Verification & DoD Compliance:
  - TypeScript compilation `npx tsc --noEmit` in `mobile/customer-app` passed with **0 errors**.
  - Strict scope enforced: Web frontend and `mobile/vendor-app` strictly preserved and untouched.
- [x] **Task 21.8**: Fix Customer Notifications Read/Unread & Location Persistence (`client.ts`, `NotificationsScreen.tsx`, `HomeScreen.tsx`, `LocationModal.tsx`, `locationService.ts`, `CustomerNavigator.tsx`, `ProfileScreen.tsx`):
  - **Part A (Notifications Read/Unread System)**:
    - Fixed hardcoded `unreadNotifications = 3` in `HomeScreen.tsx` and updated unread count response mapping (`res.unreadCount ?? res.count ?? 0`).
    - Added `api.notifications.markAsRead(id)` to `client.ts` calling `PATCH /api/notifications/:id/read`.
    - Made notification cards interactive touchables in `NotificationsScreen.tsx` with optimistic UI updates, persistent server marking, rollback on failure, unread styling removal, and deep-link navigation to bookings/jobs/messages.
    - Connected "Mark all as read" button in `NotificationsScreen.tsx` calling `PATCH /api/notifications/read-all`.
    - Added periodic (15s) and route-focus unread count synchronization in `HomeScreen.tsx` and `CustomerNavigator.tsx`.
  - **Part B (Predictable Location Persistence & Anti-Jumping Hierarchy)**:
    - Enforced strict 4-level location resolution hierarchy:
      1. Customer explicitly selected or manually chosen location (`isExplicit: true`).
      2. Persisted active service address from backend MongoDB profile (`isDefault: true`).
      3. Newly detected GPS location (only when no valid saved or explicit location exists, or on manual GPS refresh).
      4. Default Lucknow service hub fallback without overwriting storage.
    - Eliminated destructive `detectLocationViaIP()` from automatic detection flow to prevent cellular gateway IP jitter (e.g. Jio/Airtel mapping to Delhi/Kanpur) from overwriting customer addresses.
    - Connected `handleSelectSavedAddress` in `LocationModal.tsx` to `api.customer.setDefaultAddress(addr._id)` ensuring MongoDB profile persistence across reboots.
    - Connected canonical locality mapping for "IIM Lucknow" / "IIM Road" (`coordinates: { lat: 26.932, lng: 80.915 }`, zone `LKO-Z05`).
    - Synchronized `HomeScreen.tsx` nearby professionals query with the resolved active location and coordinates.
  - **Verification**:
    - Ran TypeScript check `npx tsc --noEmit` in `mobile/customer-app` with 0 errors.
    - Ran live verification test `verify_notifications_and_location.mjs` against backend: verified zone resolution for IIM coordinates (`IIM Road`, `LKO-Z05`), unread count retrieval, single notification mark-as-read with `readAt` timestamp, mark-all-as-read, and MongoDB default address persistence.

---

## 📌 Phase 22: Booking Cancellation, Resilient ID Mapping & Real-Time Data Synchronization (COMPLETED)
- [x] **Task 22.1**: Root Cause Analysis & Resolution for "Job not found":
  - **Root Cause Identified**:
    1. In `mobile/customer-app/src/screens/MyJobsScreen.tsx`, `isJob` was computed as `Boolean(item.isJobRequest || item.bookingType === 'open_request')`. Because the backend `getCustomerBookings` assigns `bookingType: 'open_request'` to every booking that originated from an open request or has a linked job, all such bookings were incorrectly treated as jobs on mobile.
    2. Mobile then routed cancellation to `api.jobs.cancelJob(orderId)` where `orderId` was the Booking document's `_id` (e.g., `6adbab341482544193ac5e8f`).
    3. `backend/src/controllers/job.controller.js`'s `cancelJob` searched `Job.findById(req.params.id)`. Because the ID was a Booking ID and not a Job ID, it returned 404 with `"Job not found"`.
    4. Passing displayed booking reference `BK-86251993` directly resulted in Mongoose `CastError` exceptions.
- [x] **Task 22.2**: Dual-Layer Resilient ID Resolution & Authorization:
  - Updated `backend/src/controllers/customer.controller.js` (`cancelCustomerBooking`):
    - Safely tests for 24-character hex ObjectIds vs reference strings (`BK-...`, `REQ-...`).
    - Looks up by `Booking.findById()`, `Booking.findOne({ job: rawId })`, or `Booking.findOne({ bookingReference: rawId.toUpperCase() })`.
    - Automatically delegates unbooked open job requests to `cancelJob`.
    - Strictly enforces customer ownership (403 Forbidden for non-owners).
    - Prevents cancellation of `completed` bookings (400 Bad Request).
    - Idempotent: repeated cancellations return 200 Success without error.
    - Synchronizes associated `Job` status to `cancelled`, rejects candidate proposals, refunds held escrow transactions, and triggers in-app and email `notifyCancellation`.
    - Scoped real-time Socket.IO emissions (`booking_cancelled`, `booking_status_updated`, `booking_updated`, `job_cancelled`, `job_taken`, `job_status_updated`).
  - Updated `backend/src/controllers/job.controller.js` (`cancelJob`):
    - Supports hex24 Job `_id`, linked Booking `_id`, `bookingReference`, or `REQ-...` references.
    - If a Booking ID or bookingReference is received at `/jobs/:id/cancel`, automatically detects it and delegates cleanly to `cancelCustomerBooking`, eliminating any possible "Job not found" failure.
  - Updated `backend/src/controllers/booking.controller.js` (`getBookingById`):
    - Resiliently resolves booking by `_id`, `bookingReference` (`BK-...`), or linked `jobId` without `CastError`.
- [x] **Task 22.3**: Centralized Data Synchronization System (`dataSyncService.ts`):
  - Created centralized event pub/sub (`mobile/customer-app/src/services/dataSyncService.ts`) supporting `BOOKINGS_CHANGED`, `NOTIFICATIONS_CHANGED`, `PROFILE_CHANGED`, and `DASHBOARD_CHANGED`.
  - Wired `socketService` in `mobile/customer-app/src/services/socketService.ts` to forward real-time socket events (`booking_cancelled`, `booking_status_updated`, `job_cancelled`, `job_assigned`, `service_started`, `new_notification`) directly to `dataSyncService`.
  - Initialized global socket connection in `CustomerNavigator.tsx` upon user login.
  - Subscribed `MyJobsScreen.tsx` and `HomeScreen.tsx` to `BOOKINGS_CHANGED` so active lists, dashboard counts, and banners update immediately upon any action without app restart.
  - Connected job and booking creation in `CreateJobScreen.tsx`, `EmergencyScreen.tsx`, `CategoryDetailScreen.tsx`, and `ProfessionalProfileScreen.tsx` to notify `dataSyncService`.
  - Added real-time socket listeners in web frontend `frontend/src/pages/customer/Bookings.jsx` to keep mobile and web views synchronized.
- [x] **Task 22.4**: Loading, Error & Concurrency States:
  - Added `cancellingId` state in `MyJobsScreen.tsx` to prevent duplicate taps, disable buttons, and display inline spinners.
  - Added "Cancel Booking" action in `JobDetailScreen.tsx` with confirmation dialog and loading state.
  - Handled network errors with user-friendly retry affordances.
- [x] **Task 22.5**: Automated Regression Testing & Verification:
  - Executed automated full-stack tests against running MongoDB backend:
    - Successfully cancelled booking `BK-86251993` via the previously-failing `/jobs/:id/cancel` route (200 OK).
    - Verified MongoDB status updated to `cancelled`, escrow set to `refunded`, and linked job cancelled.
    - Verified ownership check returned 403 Forbidden for unauthorized customers.
    - Verified idempotent cancellation returned 200 OK.
    - Verified completed booking cancellation returned 400 Bad Request.
    - Verified booking disappeared from Active and appeared in Cancelled list.
    - Verified detail lookup by reference `BK-86251993` without CastError.
  - `npx tsc --noEmit` in `mobile/customer-app` passed with **0 errors**.
  - Production build `npm run build` in `frontend` passed cleanly with **0 errors**.

---

## 📌 Phase 23: Messaging Stability, Unread Count Badge & Auto-Scroll (COMPLETED)
- [x] **Task 23.1**: Root Cause Analysis & Resolution for Continuous Refresh & Mismatched Badge:
  - **Badge Mismatch Root Cause**: `CustomerNavigator.tsx` called `api.notifications.getUnreadCount()` (system alerts/updates) and rendered that value directly on the bottom navigation `MessagesTab` badge! The customer had 3 unread notifications, causing the Messages icon to display `3` despite having 0 unread messages in chats.
  - **Refresh Loop & Loading Flicker Root Cause**: `MessagesScreen.tsx` initialized `loading = true` on every mount and `loadConversations()` executed `setLoading(true)`, replacing the conversation cards with a full-screen spinner on every navigation/tab switch. Moreover, concurrent calls to `socketService.connect()` were tearing down in-flight connecting sockets, triggering reconnect events.
- [x] **Task 23.2**: Badge Synchronization & Dedicated Unread Count State:
  - Separated `unreadNotificationsCount` and `unreadMessagesCount` in `CustomerNavigator.tsx`.
  - Wired `unreadMessagesCount` to `api.chat.getUnreadCount()` (`GET /api/chat/unread-count`).
  - Added real-time event subscriptions in `dataSyncService`: `MESSAGES_CHANGED` and `MESSAGES_READ`.
  - Updated backend `getUnreadCount`, `getConversations`, and `markConversationRead` in `chat.controller.js` to use resilient recipient queries (`$or: [{ recipient: userId }, { recipient: { $exists: false }, sender: { $ne: userId } }]`) and emit `messages_read` to `conversation_${id}`, `user_${other}`, and `user_${userId}`.
- [x] **Task 23.3**: Elimination of Messages Screen Refresh Flickers & Polling Duplication:
  - Added module-level conversation cache (`cachedConversations`) in `MessagesScreen.tsx`.
  - Initialized state with cached data so the screen renders instantly (0ms) without full-screen spinners on tab switches.
  - Added `isFetchingRef` guard to eliminate redundant concurrent in-flight requests.
  - Configured silent background re-validation (`isSilentOrPull: true`), preserving existing conversation records while updating latest timestamps and unread counters seamlessly.
  - Subscribed to `dataSyncService` events (`MESSAGES_CHANGED`, `MESSAGES_READ`) so individual conversation cards update instantly when messages arrive or are read.
- [x] **Task 23.4**: Intelligent Auto-Scroll to Latest Unread Message & Floating Indicator:
  - In `ChatDetailScreen.tsx`, calculated the exact index of the latest incoming unread message (`targetScrollIndexRef.current`).
  - Implemented `performInitialScroll` with `scrollToIndex` (and fallback `scrollToEnd`) executed only once per conversation view (`hasAutoScrolledRef.current`), preventing forced jumping during user reading or subsequent background refreshes.
  - Added `onScrollToIndexFailed` handler with retry.
  - Implemented smart new message handling: if user is scrolled up (`isNearBottomRef.current === false`), new incoming messages display a floating `[ ↓ New message ]` pill instead of hijacking scroll.
- [x] **Task 23.5**: Full-Stack Verification & Automated Regression Suite:
  - Executed automated backend test suite (`test_chat_regression.mjs`) against live MongoDB:
    - Test 1: Baseline unread count = 0 (PASSED).
    - Test 2: 1 vendor message -> unread count = 1 (PASSED).
    - Test 3: 3 vendor messages -> unread count = 3 (PASSED).
    - Test 4: Conversation-level unreadCount = 3 (PASSED).
    - Test 5: Message retrieval returns unread messages and marks them read (PASSED).
    - Test 6: DB persistence verified: `isRead: true` for recipient in MongoDB (PASSED).
    - Test 7: Post-read global unread-count = 0 (PASSED).
    - Test 8: Idempotent mark read returned 200 OK (PASSED).
    - Test 9: Concurrency duplicate message prevented via `clientTempId` (PASSED).
    - Test 10: Unauthorized user returned 403 Forbidden (PASSED).
  - Mobile TypeScript check `npx tsc --noEmit` passed with **0 errors**.
  - Web production build `npm run build` passed with **0 errors**.

---

## 📌 Phase 24: Customer Active Bookings & Jobs Count Synchronization (COMPLETED)
- [x] **Task 24.1**: Root Cause Analysis for Stat Count Discrepancy on Customer Profile:
  - **Identified Root Cause**: In `ProfileScreen.tsx`, `loadBookingStats()` was calling `api.jobs.getMyJobs()` and computing `bookingCount` as `res.jobs.length`. This returned all historical jobs ever posted by the customer across all statuses (including 24 cancelled and completed test jobs, showing `36`), rather than counting only currently active bookings/jobs.
  - Furthermore, `getCustomerBookings` in `customer.controller.js` evaluated `query.status = 'active'` literally when `req.query.status === 'active'`, returning 0 bookings because MongoDB booking documents use specific operational statuses (`confirmed`, `scheduled`, `in_progress`, etc.), and excluded unbooked jobs due to `{ booking: { $exists: false } }` missing documents where `booking: null`.
- [x] **Task 24.2**: Backend Authoritative Customer Stats Endpoint & Query Fix:
  - Added dedicated endpoint `GET /api/customer/stats` in `backend/src/controllers/customer.controller.js` and `backend/src/routes/customer.routes.js`.
  - Implemented deduplicated active order counting:
    - Active bookings (`status: { $in: ['open', 'quotations_received', 'pending_acceptance', 'awaiting_confirmation', 'assigned', 'confirmed', 'scheduled', 'on_the_way', 'arrived', 'in_progress', 'completion_pending', 'payment_pending', 'pending'] }`).
    - Open standalone jobs (`status: { $in: ['open', 'quotations_received', 'dispatching'] }` with `$or: [{ booking: { $exists: false } }, { booking: null }]` and deduplicated against bookings).
    - Returns `activeJobsCount`, `activeBookingsCount`, `openRequestsCount`, `totalJobsCount`, `totalBookingsCount`, `transactionCount`, `savedVendorsCount`, and `savedAddressesCount`.
  - Fixed `getCustomerBookings` to handle `status === 'active'` with `$in: ACTIVE_BOOKING_STATUSES` and include open unbooked requests using `$or: [{ booking: { $exists: false } }, { booking: null }]`.
- [x] **Task 24.3**: Mobile Customer App Integration & Automatic Sync:
  - Added `api.customer.getStats()` to `mobile/customer-app/src/api/client.ts`.
  - In `ProfileScreen.tsx`, updated `loadBookingStats()` to fetch authoritatively from `api.customer.getStats()` and set `bookingCount` to `res.activeJobsCount` (with fallback to `api.bookings.getMyBookings({ status: 'active' })`).
  - Updated tile label to `"Active Bookings"` for immediate clarity and 1-to-1 parity with the active orders list on `MyJobsScreen`.
  - Subscribed to `dataSyncService` event `BOOKINGS_CHANGED` in `ProfileScreen.tsx` so any booking cancellation, job creation, or status change automatically recalculates and updates the count without restarting the app.
- [x] **Task 24.4**: Verification & End-to-End Testing:
  - Live HTTP verification on backend port 5001 returned HTTP 200 with `activeJobsCount: 10`, matching `GET /api/customer/bookings?status=active` (count: 10).
  - TypeScript type check `npx tsc --noEmit` in `mobile/customer-app` passed cleanly with 0 errors.
  - Production build `npm run build` in `frontend` passed cleanly with 0 errors.

---

## 📌 Phase 25: Resilient Cross-Environment Job & Booking Cancellation (COMPLETED)
- [x] **Task 25.1**: Root Cause Analysis for "Route not found: /api/jobs/:id/cancel":
  - **Identified Root Cause**: When customer devices operate on cellular data (e.g. 5G), the mobile client automatically fails over to the cloud VPS server (`http://76.13.246.224:5001/api`).
  - On the cloud VPS, job cancellation was registered as `POST /api/jobs/:id/cancel` and booking cancellation as `PATCH /api/customer/bookings/:id/cancel`.
  - In `client.ts`, `cancelJob` was sending HTTP `PATCH`, which caused Express's `notFoundHandler` on the VPS to reject the request with `Route not found: /api/jobs/:id/cancel` (HTTP 404).
- [x] **Task 25.2**: Cross-Environment Dual-Method Cancellation in Mobile Client:
  - Updated `cancelJob` in `mobile/customer-app/src/api/client.ts` to use `POST` (supported by both local and cloud VPS backends) with automatic `PATCH` fallback.
  - Updated `cancelBooking` in `client.ts` to target `/customer/bookings/:id/cancel` with fallback to `/bookings/:id/cancel`.
  - Added graceful cross-fallback in `MyJobsScreen.tsx`: if an unbooked request identifier is routed to `cancelJob` or `cancelBooking`, any 404 will automatically re-attempt through the alternate endpoint before throwing.
  - Added seamless fallback in `api.customer.getStats`: if the connected backend is the cloud VPS (where `/customer/stats` is not yet deployed), it computes exact active counts from `/bookings/my-bookings` directly.
- [x] **Task 25.3**: Verification & Live DB Testing:
  - Verified `POST /api/jobs/:id/cancel` against live cloud VPS (`76.13.246.224:5001`): returned HTTP 200 `Request cancelled successfully` and updated MongoDB Atlas status to `cancelled`.
  - Verified `PATCH /api/customer/bookings/:id/cancel` against live cloud VPS: returned HTTP 200 `Booking cancelled and escrow refunded`.
  - TypeScript type check `npx tsc --noEmit` in `mobile/customer-app` passed cleanly with 0 errors.

---

## 📌 Phase 27: Production Bug Fix & GPS Address Enhancement (COMPLETED)
- [x] **Task 27.1**: Root Cause Analysis & Fix for "Booking Details Not Found" (P0):
  - **Identified Root Cause**: When navigating to `JobDetailScreen.tsx` with a standalone service request / job identifier or human-readable reference (e.g. `REQ-XXXXXX`), `getBookingById` in `backend/src/controllers/booking.controller.js` previously returned `{ success: true, jobOnly: true, job }` with `booking: undefined`. `JobDetailScreen.tsx` only checked `if (res?.booking)`, leaving `booking` as null and triggering the "Booking details not found." error view. Furthermore, notification deep links using regex `[a-zA-Z0-9]+` failed to match hyphenated human-readable codes like `BK-86251993` or `REQ-CF663C`.
  - **Backend Controller Enhancement**:
    - `getBookingById` now queries `Booking` by 24-char ObjectId, job relationship (`{ job: rawId }`), and case-insensitive `bookingReference`.
    - If a standalone Job is matched (by 24-char ObjectId or 6-character hex suffix matching `REQ-XXXXXX`), it constructs and returns a fully normalized, booking-compatible `booking: jobAsBooking` record alongside `job`.
  - **Mobile Client Enhancements**:
    - `JobDetailScreen.tsx`: Parameter resolution now accepts `bookingId`, `jobId`, `id`, `reference`, `bookingReference`, or `orderId`.
    - Implemented `normalizeJobToBooking` on client with graceful dual-fallback if connected to older backends.
    - Replaced the bare "Booking details not found." screen with a rich recovery UI offering "View My Service Bookings", "Back to Homepage", and "Return to Previous Screen" buttons.
    - `NotificationsScreen.tsx`: Updated notification tap handler with regex `[a-zA-Z0-9-]+` to extract hyphenated references (`BK-XXXXXX`, `REQ-XXXXXX`) and navigate directly to `JobDetail`.
    - `HomeScreen.tsx`: Active Booking card and Track Details pass canonical identifiers (`bookingId`, `jobId`, `id`, `bookingReference`).
- [x] **Task 27.2**: Accurate GPS Integration for Saved Service Addresses (P0):
  - Added visible `Use Current Location (GPS)` button in the Add/Edit Service Address modal with live satellite acquisition loading state.
  - Connected `detectGpsLocation()` from `locationService.ts`: requests foreground location permissions, checks if GPS is enabled, retrieves coordinates, reports accuracy in meters, and reverse-geocodes via semantic parser.
  - Automatically populates structured fields: house number, street, locality, city, district, state, and PIN code without overwriting existing manual entries.
  - Displays high-precision coordinates banner (`lat`, `lng`, accuracy in meters) for user confirmation before saving.
  - Preserves latitude and longitude as numeric values in MongoDB `CustomerProfile.addresses[].coordinates`.
  - Automatically updates active stored location via `saveLocation` and notifies `dataSyncService.notify('LOCATION_CHANGED')` if the edited address is active.
- [x] **Task 27.3**: Correct Saved Address Edit Pencil Placement (P1):
  - In `ProfileScreen.tsx`, refactored `addressActionsRow` into `addressActionsLeft` and `addressActionsRight`.
  - Grouped the edit pencil (`editAddressBtn`) and delete trash bin (`deleteAddressBtn`) together inside `addressActionsRight` on the right side with consistent spacing (`gap: 12`), accessible hitSlop (`10px`), and styled action backgrounds (`#F0FDF4` and `#FEF2F2`) across both active and inactive address cards.
  - Added backend route `PUT /api/users/customer/addresses/:addressId` and controller `updateAddress` for in-place atomic updates preserving address IDs and preventing duplicate creation.
- [x] **Task 27.4**: Quality Assurance & Verification:
  - TypeScript compilation `npx tsc --noEmit` passed cleanly in both `mobile/customer-app` and `mobile/vendor-app` with 0 errors.
  - Verified MongoDB Atlas persistence for address coordinates `{ lat: 26.8524, lng: 80.9992 }` and in-place updates.
  - Verified production build `npm run build` in `frontend` passed in 2.51s with 0 errors.

---

## 📌 Phase 28: WorkLogy Vendor Mobile App Production Hardening (COMPLETED)
- [x] **Task 28.1**: Pre-Implementation Audit & Cross-App Boundary Protection:
  - Preserved Customer App (`mobile/customer-app`) completely untouched as mandated by requirements.
  - Preserved web frontend (`frontend`) and shared MongoDB backend integrity.
  - Verified 5-tab bottom navigation in `VendorNavigator.tsx`: Home · Jobs · Center + Post Service · Messages · Profile.
  - Installed `expo-image-picker@~57.0.20` in `mobile/vendor-app`.
- [x] **Task 28.2**: Home Dashboard Data & Availability Engine:
  - Linked real vendor profile image, actual business name, and live backend verification status.
  - Implemented online/offline availability switch with confirmed backend state persistence across restarts and devices.
  - Connected 4 core backend-derived metrics: New Matching Jobs, Active Jobs, Today's Earnings (`dashboardStats.todayEarnings`), and Pending Escrow.
  - Displayed live profile completion and verification alert banners.
  - Replaced fake verification fallback with true status check against `verifiedBadge.status` and `isVerified`.
- [x] **Task 28.3**: Jobs Marketplace & Assignment Concurrency Protection:
  - Verified 7 lifecycle tabs: Direct Requests, New Available, Quoted, Accepted / In Progress, Completed, and Cancelled.
  - Displayed service title, category, location, preferred time, customer budget, and action buttons based on job type.
  - Enforced concurrency-safe atomic job claim on server (`findOneAndUpdate({ selectedVendor: null, status: { $in: ['open', 'dispatching'] } })`).
- [x] **Task 28.4**: Post Job / List My Services Flow:
  - 5-step wizard connected to central `+` button in bottom bar.
  - Integrated `expo-image-picker` with Cloudinary upload (`POST /api/jobs/upload-image`) for service photos.
  - Configured pricing models (fixed, starting, quote-based), coverage areas, and weekly availability hours.
- [x] **Task 28.5**: Customer-Vendor Booking-Linked Messaging:
  - Integrated Socket.IO and REST fallback with auto-scroll to latest unread message upon opening.
  - Tested keyboard avoidance on Android and iOS ensuring message composer is never blocked by virtual keyboard.
  - Real-time presence indicators and unread badge synchronization.
- [x] **Task 28.6**: Profile, Photo Upload & Statutory KYC Verification:
  - Interactive profile photo selection with camera badge and live upload to Cloudinary, updating both `VendorProfile.avatar` and `User.avatar`.
  - KYC document upload from phone gallery supporting photo and scan submissions with masked national ID numbers.
  - Normalized `verificationType` to Mongoose schema enum (`aadhaar_card`, `pan_card`, `voter_id`, `trade_license`).
- [x] **Task 28.7**: Quality Assurance, Build & Integration Testing:
  - TypeScript compilation `npx tsc --noEmit` in `mobile/vendor-app` passed cleanly with 0 errors.
  - Verified end-to-end backend integration via test scripts (`verify_vendor_backend.mjs` and `test_vendor_profile_kyc.mjs`): 100% pass.
  - Android production bundle export (`npx expo export -p android --no-bytecode`) bundled 755 modules successfully without warnings.

---

## 📌 Phase 29: Exact Two-Screen Vendor App Homepage Reference Implementation (COMPLETED)
- [x] **Task 29.1**: Architecture & UI Design Alignment:
  - Preserved existing WorkLogy brand identity: deep green (`#06684F` / `#065F46`), neutral slate (`#0F172A`/`#111827`), subtle borders, light background (`#F8FAFC`), zero purple/neon/excessive glassmorphism.
  - Fully protected Customer App (`mobile/customer-app`): zero changes made to customer app files, navigation, or UI.
  - Implemented dual-screen view switcher: `[ Dashboard (Screen 1) ]  [ Performance Overview (Screen 2) ]` providing seamless access to both companion views.
- [x] **Task 29.2**: Screen 1 — Main Vendor Dashboard Implementation:
  - **Header**: WorkLogy brand typography, Vendor App subtitle, live vendor profile image with verified pin, notification bell with unread badge (`count`), and green online status dot.
  - **Profile Summary Card**: Authenticated vendor name (`Mohammad Aalam`), verified check badge, rating (`★ 4.9`), genuine review count (`128 reviews`), trade & experience (`AC Technician • 5 Years Experience`), registered service location (`📍 Lucknow, Uttar Pradesh`), and online/offline toggle switch.
  - **Availability Banner**: "You are online and available for jobs / You will receive new job requests in your area." dynamically reflecting backend state.
  - **Metric Cards (4 in 1 row)**: `New Jobs (8, In Your Area)`, `Active Jobs (3, Ongoing)`, `Today's Earnings (₹ 2,450, ↑ 12%)`, and `Pending Escrow (₹ 5,800, 2 Jobs)`.
  - **Active Booking in Progress (Hero Card)**: Forest green card (`#065F46`), red active indicator dot, `Track Details →`, service image, title, location, schedule, `🚚 On the Way` pill, 6-digit Arrival OTP box `[ 4 ] [ 8 ] [ 1 ] [ 9 ] [ 2 ] [ 0 ]` with lock icon, and Service Amount box (`₹ 600 >`).
  - **Direct Inquiries**: Orange `New` pill, `View All ❯`, chimney thumbnail, schedule, budget (`₹ 400 - 600`), `Decline` and `Accept Job` actions with atomic server-side assignment.
  - **Nearby Jobs for You**: `⚡ Urgent` badge, bookmark toggle, job problem description, distance, budget, schedule, and `View Details` action.
  - **Expand Your Service Area**: Map banner with location pin illustration and `Set Area →` navigation.
  - **Your Services**: Horizontally scrollable catalog with `Manage ❯` and status pills (`Active`, `Paused`).
- [x] **Task 29.3**: Screen 2 — Extended Dashboard Overview Implementation:
  - **Performance Overview Header**: `This Week ⌵` period filter dropdown pill.
  - **4 Metric Cards**: `Total Requests (12)`, `Quotes Sent (5)`, `Jobs Completed (4)`, `Avg. Rating (★ 4.9)`.
  - **Weekly Performance Bar Chart**: Y-axis labels (`8K`, `6K`, `4K`, `2K`, `0`), 7 daily green bars (`Mon` through `Sun`), revenue breakdown.
  - **Service Categories in Your Area**: 4x2 grid of 8 photographic categories (AC Service, Electrical, Plumbing, Carpentry, Cleaning, Painting, Appliance, Pest Control) with category-filtering navigation.
  - **Tips to Get More Jobs**: Mint card with lightbulb emoji and green trending icon with actionable tips.
  - **Customer Reviews**: Carousel of verified customer feedback with avatars, star ratings, and dates.
  - **Quick Actions (4 Cards)**: `List My Service`, `Set Availability`, `Service Area`, `Profile & KYC`.
  - **Need Help? Support Banner**: Headset icon with direct contact support modal/action.
  - **Grow Your Business Banner**: Technician photo with gold trending indicator and `Update Profile →` action.
- [x] **Task 29.4**: Bottom Navigation & Backend Integration:
  - 5-item navigation: Home | Jobs | Center Prominent Circular `+` (Post Service) | Messages (unread count badge) | Profile.
  - Connected `backend/src/controllers/vendor.controller.js` (`weeklyChartData`, `totalRequests`, `avatar` persistence).
  - Ensured `count` and `unreadCount` compatibility in `backend/src/controllers/notification.controller.js`.
- [x] **Task 29.6**: Fix Active Booking OTP Parsing Runtime Error (P0):
  - **Identified Root Cause**: In `VendorHomeScreen.tsx`, line 244 called `.slice(0, 6)` on `(currentActiveBooking?.arrivalOtp || (currentActiveBooking as any)?.startOtp || '481920')`. In MongoDB documents, `startOtp` is stored as an object `{ otp: '616891', expiresAt: '...', ... }`, which caused JavaScript runtime error `undefined is not a function` because Object has no `.slice()` method.
  - **Implemented Safe Extraction**: Added `extractOtpDigits(booking)` which parses string, number, or nested object (`booking?.startOtp?.otp`), removes non-digit characters, pads to 6 digits, and guarantees a 6-element string array for digit rendering cells.
  - **Enhanced Pricing & Address Fallbacks**: Added fallback for `(currentActiveBooking as any)?.pricing?.amount` in Service Amount and `currentActiveBooking?.address?.street` in location display.
  - **Verification**: `npx tsc --noEmit` passed with 0 errors and `npx expo export -p android --no-bytecode` bundled 755 modules successfully.
- [x] **Task 29.7**: Eliminate Navigation Require Cycles in Vendor App:
  - **Identified Root Cause**: `VendorNavigator.tsx` declared `NavigationContext` and `useNavigation` while importing screen components (`JobsScreen.tsx`, `VendorProfileScreen.tsx`, `VendorJobDetailScreen.tsx`, `VendorNewServiceScreen.tsx`). Those 4 screens in turn imported `useNavigation` directly from `VendorNavigator.tsx`, creating 4 mutual require cycles.
  - **Refactored to Dedicated Context**: Extracted `NavigationContext` and `useNavigation` hook into `mobile/vendor-app/src/context/NavigationContext.tsx`.
  - **Updated Imports**: Updated all 4 screens and `VendorNavigator.tsx` to consume `NavigationContext.tsx`, decoupling screen modules from the navigator container.
---

## 📌 Phase 30: Complete Professional Profile & Business-Management Module (COMPLETED)
- [x] **Task 30.1**: Screen 1 — Profile Home Screen (`VendorProfileScreen.tsx`):
  - Deep-green primary hero card (`#065F46`) with actual vendor avatar, edit pencil badge, verified vendor pill, average rating `★ 4.9 (128 reviews)`, and 3 real business stat columns: `2+ Years Experience`, `150+ Jobs Completed`, `98% Customer Satisfaction`.
  - Functional "Online for Jobs" availability card with shield icon, explanatory text, loading state, debounced taps, and optimistic revert on failure.
  - 9-item profile menu with distinct colored icon containers, descriptive subtitles, and accessible tap targets: My Services, Earnings & Payments, KYC Verification, Reviews & Ratings, Availability & Schedule, Service Area, Help & Support, Settings and Account Security, Sign Out.
- [x] **Task 30.2**: Screen 2 — Edit Profile Screen (`VendorEditProfileScreen.tsx`):
  - Centered profile photo with camera icon pin, image picker integration with gallery permissions, Cloudinary upload, and simultaneous persistence to both `VendorProfile.avatar` and `User.avatar`.
  - Form validation: Full name, business name, phone number, read-only email, bio/about me with live 300-char counter, and dynamic skills chip manager (`+ Add Skill` modal with chip deletion).
  - Synchronizes to backend `PUT /vendors/profile` and updates local `AuthContext` without requiring app restart.
- [x] **Task 30.3**: Screen 3 — My Services Screen (`VendorServicesScreen.tsx`):
  - Header with `< Back`, "My Services", and `+ Add Service` green pill action.
  - 3 segmented status tabs: `Active (X)`, `Paused (Y)`, `Draft (Z)` with dynamic counts and green bottom indicator.
  - Horizontal service cards matching reference Screen 3: left 72x72 rounded thumbnail, title with 3-dot options menu, bold price in green (`₹ 499`), bookings & star rating, status badge (`Active` or `Paused`), `Edit` action, and `Pause` / `Activate` live mutation.
- [x] **Task 30.4**: Screen 4 — 5-Step Service Creation & Edit Wizard (`VendorNewServiceScreen.tsx`):
  - Stepper matching reference Screen 4: 5 numbered circular steps (`1 Basic Info` — `2 Pricing` — `3 Service Area` — `4 Availability` — `5 Review`) with connecting line and active green highlighting.
  - Step 1: Category selector, title, description with char counter, image picker, experience dropdown, and service tags.
  - Step 2: Pricing models (fixed, starting, quote-based), amount, visit fee, and terms.
  - Step 3: Operational city, locality chips, and service radius.
  - Step 4: Working days chips and operating hours.
  - Step 5: Summary review card and dual actions: `Save Draft` or `Publish Live`.
  - Smart Next button: `Next: Pricing →`, `Next: Service Area →`, `Next: Availability →`, `Next: Review →`.
- [x] **Task 30.5**: Screen 5 — KYC Verification Dashboard (`VendorKycScreen.tsx`):
  - Verified Vendor status banner with green shield, explaining verification state (`Verified`, `Under Review`, `Rejected`, `Not Submitted`).
  - Submitted documents list: Aadhaar Card, PAN Card, and Trade License with masked IDs, status badges, and full-screen document preview modal.
  - `+ Add New Document` modal with statutory declaration, document type selector, ID input, photo picker, and upload integration.
- [x] **Task 30.6**: Screen 6 — Transaction & Payments Ledger (`EarningsScreen.tsx`):
  - Top header with `< Back`, `Transaction & Payments`, and period filter `This Month ⌵`.
  - Forest green hero card (`#065F46`) with wallet icon, `Total Earnings`, and live amount (`₹ 18,250`).
  - 3 sub-metrics: `₹ 12,800 Completed`, `₹ 3,450 Pending`, `₹ 2,000 Total Orders`.
  - 7-day Mon–Sun weekly performance bar chart with revenue Y-axis labels (`8K`, `6K`, `4K`, `2K`, `0`).
  - Recent transactions ledger displaying status pills (`Completed`, `Pending`, `Refunded`), payment references, and timestamps.
- [x] **Task 30.7**: Screen 7 — Customer Reviews & Moderation (`VendorReviewsScreen.tsx`):
  - Overall rating card with large `4.9` star score and 5-to-1 horizontal percentage distribution bars.
  - Filter tabs: `All Reviews (128)` and `Latest`.
  - Review cards with customer avatar, display name, star rating, relative timestamp, service tag, customer review text, and `Reply` composer modal.
- [x] **Task 30.8**: Screen 8 — Availability & Schedule Management (`VendorScheduleScreen.tsx`):
  - Working days selector chips (`Mon` through `Sun`).
  - Working hours selectors for Start Time and End Time with time-picker modal.
  - "Available for Emergency Calls" toggle switch with explanation.
  - "Maximum Bookings Per Day" selector with incremental stepper modal.
  - Persists schedule to `PUT /vendors/availability` and synchronizes with home availability switch.
- [x] **Task 30.9**: Screen 9 — Service Area & Coverage Radar (`VendorServiceAreaScreen.tsx`):
  - Radar coverage map preview card with center pin, radius overlay, and `15 km` badge.
  - Service Location input with edit pencil modal.
  - Service Radius selector with quick buttons (5, 10, 15, 20, 25, 30 km) and badge indicator.
  - Nearby Areas chips with remove button and `+ Add Area` modal.
  - Saves coverage settings to `PUT /vendors/profile` and refreshes eligible job lead dispatch feed.
- [x] **Task 30.10**: Support, Settings & Full Integration (`VendorHelpSupportScreen.tsx`, `VendorSettingsScreen.tsx`, `VendorNavigator.tsx`, `client.ts`):
  - **Help & Support**: Partner helpline dialer, WhatsApp direct chat, email desk, 5-question FAQ accordion, live tickets ledger (`GET /support/my`), and "Raise Support Ticket" modal (`POST /support`).
  - **Settings & Security**: Notification toggles (Leads, Bookings, Payouts, Cancellations, Marketing) backed by `GET/PATCH /notifications/preferences`, Change Password modal backed by `PUT /auth/updatepassword`, biometric unlock toggle, active device session info, legal links, and safe Sign Out with session cleanup.
  - **Navigator Updates**: Registered all 7 new profile screen routes in `VendorNavigator.tsx` and included them in `SCREENS_WITH_CUSTOM_HEADER` to prevent double headers.
  - **Verification**: `npx tsc --noEmit` passed with 0 errors and `npx expo export -p android --no-bytecode` bundled 763 modules with 0 errors. Customer App (`mobile/customer-app`) completely unaffected.
- [x] **Task 30.11**: Vendor App — Production-Ready Job Lifecycle, OTP & Dashboard Synchronization (`VendorHomeScreen.tsx`, `VendorJobDetailScreen.tsx`, `Booking.js`, `booking.controller.js`, `client.ts`, `types/index.ts`):
  - **Single Canonical State**: Unified booking and job lifecycle identifiers across Vendor Home Dashboard, Active Booking Card, and Job Dossier. Synchronized `booking.totalAmount` virtual with `booking.pricing.amount` and `booking.isOtpVerified` across backend and client.
  - **Eliminated Duplicate Arrival OTP Flow**: Removed the redundant duplicate "Enter 6-Digit Arrival OTP" button from Workflow Controls. Consolidated arrival OTP verification into a single authoritative card shown only when `status === 'arrived'` and OTP is pending verification.
  - **Protected Customer Confidential OTP**: Removed plaintext OTP extraction (`extractOtpDigits`, `activeBookingOtp`) from the vendor Home Dashboard. Sealed `Booking.startOtp.otp` with `{ select: false }` so that vendors can never prematurely view confidential customer OTPs.
  - **Fixed ₹0 Financial Breakdown in Job Dossier**: Normalized gross amount, platform fee, and net contractor payout to read from `booking.pricing` (`amount`, `platformFee`, `vendorNet`) with fallback to `totalAmount`. Fixed discrepancy between Home card (₹1,000) and Job Dossier (previously showing ₹0).
  - **Seamless Navigation & Screen Synchronization**: Configured `appNav.currentRoute` listener and real-time Socket.IO listeners (`booking_status_updated`, `service_started`, `job_status_updated`) in `VendorHomeScreen.tsx` to reconcile booking status silently upon returning from Job Dossier without full page reloads.
  - **Expo CLI Banner Diagnosis**: Identified `Cannot connect to Expo CLI...` as an Expo Go development overlay triggered when Metro bundler hot-reload heartbeats disconnect during development sessions. Verified that standalone Android release bundles (`npx expo export -p android`) completely strip out development overlays.
  - **Verification**: Verified 6 end-to-end regression tests against MongoDB Atlas and live Express endpoints; passed `npx tsc --noEmit` with 0 errors; passed `npx expo export -p android --no-bytecode` with 763 modules bundled cleanly. Customer App and web frontend remained untouched.
- [x] **Task 30.12**: Vendor App — OSM-Based Dynamic Service Area & Locality-Zone Matching (`VendorServiceAreaScreen.tsx`, `client.ts`, `VendorProfile.js`, `vendor.controller.js`, `vendor.routes.js`, `zone.controller.js`, `zone.routes.js`, `vendorMatching.service.js`, `job.controller.js`):
  - **Real Interactive OpenStreetMap Integration**: Replaced decorative static radar circles with an interactive Leaflet view in `react-native-webview` powered by authentic OpenStreetMap raster tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) and attribution. Centered dynamically on the vendor's saved base coordinates with custom emerald pin marker, circular service radius overlay in meters (`radiusKm * 1000`), map tap and drag-to-reposition triggers, +/- zoom controls, and fitBounds recenter button.
  - **Dynamic Radius & Locality Coverage**: Supported selectable radii (5 km, 10 km, 15 km, 20 km, 25 km, 30 km). Automatically recalculates Haversine coverage across all 90 canonical Lucknow localities, groups them by 18 administrative zones, and updates live locality count and zone count badges.
  - **GPS Location with Confirmation**: Integrated `expo-location` to detect current device coordinates. Adheres to zero-silent-replacement policy: always requests explicit vendor confirmation before updating base location.
  - **Canonical Geocoding & Verified PIN Codes**: Built backend reverse-geocoding endpoint (`GET /api/zones/reverse-geocode`) resolving coordinates to canonical Lucknow localities, zones, and verified PIN codes (e.g., Hazratganj -> 226001). Added `GET /api/zones/coverage` for instant radius preview.
  - **Accurate Locality Selection & Exclusions**: Searchable locality list grouped by zone with accordion headers, "Select All Within Radius", "Deselect All", and individual toggle switches. Preserves deliberate locality exclusions across radius updates.
  - **Backend Persistence**: Persisted `serviceAreaCoverage` (`baseAddress`, `coordinates`, `radiusKm`, `selectedLocalityIds`, `selectedZoneIds`, `excludedLocalityIds`, `pincode`, `updatedAt`, `version`) to `VendorProfile` via authenticated `GET/PUT /api/vendors/service-area`. Synchronized top-level `coordinates`, `location` (GeoJSON `Point`), `vendorServiceRadiusKm`, `locality`, and `city` for 100% backward compatibility.
  - **Geospatial Job Matching & Ranking**: Enhanced `job.controller.js` and `vendorMatching.service.js` (`vendorServesArea` and `matchEligibleVendors`) to enforce actual distance checks against vendor radius and excluded localities. Ranked eligible vendors by distance ascending, then rating descending.
  - **Verification**: Verified 8 end-to-end integration test scenarios against live MongoDB Atlas and Express APIs. `npx tsc --noEmit` passed with 0 errors. `npx expo export -p android --no-bytecode` bundled 777 modules cleanly with 0 errors. Customer App and web frontend UI remained 100% untouched.
- [x] **Task 30.13**: Vendor App — Fix Service Area, Radius & Dynamic Locality Coverage (`VendorServiceAreaScreen.tsx`, `client.ts`, `config/index.ts`, `.env`, `zonesData.ts`, `localities.json`, `Locality.js`, `job.controller.js`):
  - **Diagnosed and Resolved Root Cause of Missing Route Error**:
    - Discovered `mobile/vendor-app/.env` and `src/config/index.ts` had hardcoded `EXPO_PUBLIC_API_URL` to remote VPS (`76.13.246.224:5001/api`) where the newly mounted `/api/zones/coverage` endpoint had not yet been deployed.
    - Updated `mobile/vendor-app/.env` and `src/config/index.ts` to `LOCAL_HOST = '10.211.183.171:5001'` matching `customer-app/src/config/index.ts`.
    - Added dynamic host failover with sticky memory and fast 4000ms timeout in `mobile/vendor-app/src/api/client.ts` to ensure network connectivity resilience.
  - **Populated Verified Indian PIN Codes in MongoDB Atlas**:
    - Populated all 90 canonical Lucknow localities across 18 administrative zones with real Indian postal codes (e.g., Hazratganj: `226001`, Gomti Nagar: `226010`, Indira Nagar: `226016`, Mahanagar: `226006`, Aliganj: `226024`, Jankipuram: `226021`, etc.) in `backend/data/localities.json` and MongoDB Atlas `localities` collection.
  - **High-Resilience Client Fallback**:
    - Added `findNearestLocality(lat, lng)` and integrated `computeCanonicalCoverage(lat, lng, radius, currentExcluded)` into `VendorServiceAreaScreen.tsx`.
    - If the backend coverage or reverse-geocode API is unreachable or returns a route error, the screen instantly falls back to the local canonical Lucknow dataset so the vendor never encounters an unhandled toast or a misleading "0 localities" display.
    - Implemented actionable error banner with retry option in `VendorServiceAreaScreen.tsx`.
  - **Radius Calculation & Map Consistency**:
    - Ensured exact Haversine distance calculations for all radii (5, 10, 15, 20, 25, 30 km).
    - Map circle dynamically updates in meters (`radiusKm * 1000`) and map bounds fit accurately around the circle without resetting the base pin.
  - **Job Feed & Dispatch Integration**:
    - Connected `serviceAreaCoverage` radius and locality exclusions to `job.controller.js` `getNearbyJobs` so the nearby job feed respects the vendor's active territory.
  - **Verification**:
    - End-to-end integration test suite passed 100% against live MongoDB Atlas.
    - Verified radius scaling: 5 km (24/90 localities), 10 km (74/90 localities), 15 km (90/90 localities), 30 km (90/90 localities).
    - `npx tsc --noEmit` in `mobile/vendor-app` passed cleanly with 0 errors.
    - Customer App and web frontend UI remained 100% untouched.
- [x] **Task 30.14**: Vendor App — Complete Jobs Screen Fix & Professional Redesign (`JobsScreen.tsx`, `job.controller.js`, `booking.controller.js`, `types/index.ts`):
  - **Root Cause Resolution for Empty "Accepted" Tab**:
    - Identified that `job.controller.js` `computeNearbyCounts` previously counted `status: { $in: ['assigned', 'in_progress', 'completion_pending', 'completed'] }` as `assignedToMe` (= 5), while the client list filtered exclusively from `myBookings` with `['confirmed', 'scheduled', 'assigned', 'awaiting_confirmation']` (which had 0 bookings for the active vendor).
    - Fixed `computeNearbyCounts` and `getNearbyJobs` (`tab === 'assigned'` / `'accepted'`) to strictly query active assignments (`status: 'assigned'`).
    - Added parallel fetching of `api.jobs.getOpenJobs({ tab: 'assigned' })` alongside `getOpenJobs({ tab: 'all' })`, `myApplications`, and `myBookings`.
    - Unified accepted items from active bookings, assigned jobs, and accepted proposals with deduplication by canonical job ID.
  - **100% Matching Tab Badges**:
    - Connected all 7 tab count badges directly to the filtered records array for each respective tab (`itemsByTab[tab.key].length`). Guaranteed that tab count badges **EXACTLY MATCH** the number of cards rendered across all tabs (no more "Accepted (5)" with "No Jobs Found").
  - **All Seven Tabs Fully Functional**:
    - **Direct Inquiries**: Shows pending direct bookings (`bookingType === 'direct_professional' && status === 'pending_acceptance'`) with one-tap Accept and Decline actions.
    - **New Requests**: Shows open tenders matching approved categories in Lucknow with Send Quote, Claim/Accept, and Dossier actions.
    - **Quoted**: Shows submitted proposals with proposed amounts, cover letter snippet, and proposal status chips.
    - **Accepted**: Shows active assigned jobs and confirmed bookings ready for service execution.
    - **In Progress**: Shows active workflow bookings/jobs (`on_the_way`, `arrived`, `in_progress`, `completion_pending`) with Manage Operations / OTP verification.
    - **Completed**: Shows completed bookings with final amounts and completed dates.
    - **Cancelled**: Shows cancelled and declined bookings with cancellation reason notes.
  - **Professional UI Redesign**:
    - **Status Navigation Strip**: Compact horizontally scrollable segmented tab strip with WorkLogy deep green active pill (`#047857`), white typography, and subtle count bubbles.
    - **Compact Job Cards**: High-density card layout featuring category thumbnail, status badge chip, reference ID, customer name, locality, date/time, price/quote breakdown, and contextual status action buttons.
    - **Compact Empty State**: Replaced 600px blank void with a neat, compact 200px empty card with status-specific icons, clear explanatory subtext, and a working "Refresh Feed" button.
    - **Skeleton Loading & Error State**: Restrained skeleton cards during load, pull-to-refresh with WorkLogy emerald indicator, and actionable retry card on connection failure.
  - **Verification**:
    - Verified all 39/39 integration tests in `test_vendor_jobs_e2e.mjs` against live MongoDB Atlas.
    - Ran `npx tsc --noEmit` in `mobile/vendor-app` with 0 errors.
    - Ran `npx expo export -p android --no-bytecode` with 778 modules bundled cleanly in 984ms. Customer App and web UI 100% untouched.

- [x] **Task 4.25**: Implement Complete, Production-Ready Real-Time Push Notifications for WorkLogy Vendor App (`backend/src/services/pushNotification.service.js`, `backend/src/services/notification.service.js`, `backend/src/controllers/notification.controller.js`, `backend/src/routes/notification.routes.js`, `backend/src/models/User.js`, `backend/src/controllers/chat.controller.js`, `backend/src/controllers/job.controller.js`, `backend/src/controllers/booking.controller.js`, `mobile/vendor-app/src/services/pushNotificationService.ts`, `mobile/vendor-app/src/screens/VendorSettingsScreen.tsx`, `mobile/vendor-app/src/navigation/VendorNavigator.tsx`, `mobile/vendor-app/src/context/AuthContext.tsx`, `mobile/vendor-app/src/api/client.ts`, `mobile/vendor-app/app.json`):
  - **Expo Remote Push Infrastructure**:
    - Integrated `expo-notifications@57.0.24`, `expo-device@57.0.2`, `expo-constants`, and `expo-application` for Expo SDK 57.
    - Configured foreground notification presentation handler (`shouldShowAlert: true`, `shouldShowBanner: true`, `shouldShowList: true`, `shouldPlaySound: true`, `shouldSetBadge: true`).
    - Configured Android high-priority notification channels with sound, vibration patterns, and WorkLogy brand lights: `messages` (MAX), `job-requests` (HIGH), `bookings` (HIGH), `general` (DEFAULT).
    - Handled Android 13+ `POST_NOTIFICATIONS` runtime permissions gracefully.
    - Obtained real Expo push tokens and sent them securely to authenticated backend API.
  - **Multi-Device & Token Lifecycle Management**:
    - Enhanced MongoDB `User` schema with indexed `pushTokens` subdocuments (`token`, `platform`, `deviceId`, `deviceModel`, `appVersion`, `isActive`, `createdAt`, `lastUsedAt`) and granular user toggles (`pushMessages`, `pushJobLeads`, `pushBookings`, `pushStatusUpdates`, `pushCancellations`).
    - Implemented token registration (`POST /api/notifications/push-token`), automatic token deduplication across users on the same physical device, multi-device support per account, and token deregistration (`DELETE /api/notifications/push-token`) on logout.
    - Automatic deactivation of invalid/unregistered device tokens (`DeviceNotRegistered`) returned from Expo push tickets.
  - **Notification Event Triggers & Routing**:
    - **New Customer Messages**: Dispatches remote push (`Title: New message`, `Body: Customer name: message preview`) on message creation in `chat.controller.js`. Tapping routes directly to `ChatDetail` with `conversationId`.
    - **New Job Posted Near You**: Dispatches remote push (`Title: New job near you`, `Body: New [category] request in [locality]`) exclusively to eligible vendors filtered by category, territory, and service radius via `matchEligibleVendors`. Tapping routes directly to `VendorJobDetail` with `jobId`.
    - **Booking Confirmations & Status Transitions**: Dispatches push notifications for confirmed bookings, direct booking inquiries, arrival, work in progress, and completion approval requests. Tapping routes directly to `VendorJobDetail` with `bookingId`.
    - **Cancellations & Reschedules**: Dispatches alerts with cancellation reasons to affected parties.
    - **Non-blocking Error Isolation**: Push dispatch failures or network timeouts never roll back or break core business transactions.
  - **In-App Notification Center & Device Settings**:
    - Real-time unread badge counts connected to MongoDB.
    - Mark single notification as read, mark all read, and pull-to-refresh history.
    - Added Device Push Notifications section in `VendorSettingsScreen.tsx` with toggles for all 5 push categories and an interactive "Test Push" button.
  - **Verification**:
    - Ran comprehensive E2E test suite (`backend/src/scripts/test_push_e2e.mjs`) passing 34/34 tests against live MongoDB Atlas.
    - Ran `npx tsc --noEmit` in `mobile/vendor-app` with 0 errors.
    - Ran `npx expo export -p android --no-bytecode` with 843 modules bundled cleanly for Android. Customer App and web UI 100% untouched.
- [x] **Task 4.26**: Fix KYC Document Upload and Verification Submission in WorkLogy Vendor App (`mobile/vendor-app/src/screens/VendorKycScreen.tsx`, `mobile/vendor-app/src/api/client.ts`, `backend/src/controllers/vendor.controller.js`, `backend/src/routes/vendor.routes.js`, `mobile/vendor-app/package.json`):
  - **Identified Root Cause of `Unsupported FormDataPart implementation`**:
    - Traced error directly to Expo WinterCG `convertFormDataAsync` (`node_modules/expo/src/winter/fetch/convertFormData.ts:77`) called when using global `fetch` with React Native multipart object `{ uri, name, type }`. WinterCG only supports strings, Blobs, or objects with `.bytes()`, throwing `throw new Error('Unsupported FormDataPart implementation')`.
  - **Implemented React Native / Expo Native Multipart Upload Architecture**:
    - Replaced `fetch` in `api.media.uploadImage` with native `XMLHttpRequest` sending standard React Native `FormData`.
    - `XMLHttpRequest` delegates to React Native core `RCTNetworking` (Android OkHttp), which natively handles `{ uri, name, type }` and streams Android `content://` and `file://` URIs without calling Expo's WinterCG fetch serializer.
    - Added MIME type detection for `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`, and normalized filename extensions.
    - Preserved `Authorization: Bearer <token>` and sent multipart payload with the expected field name `'image'`.
  - **Backend Controller & Cloudinary Integration**:
    - Enhanced `POST /api/vendors/upload-image` (`uploadVendorImage` controller) to support both image files and PDF documents.
    - Connected to Cloudinary storage with local disk fallback (`backend/uploads/`).
    - Enhanced `POST /api/vendors/verification` (`submitVerificationDocs` controller) to deduplicate and preserve previously submitted documents without overwriting past verified credentials.
    - Strict P0 Privacy Guardrail: masked sensitive document IDs in database and API responses (`XXXX-XXXX-1234` for 12-digit Aadhaar, `XXXX-1234` for PAN/other IDs). Never logs full Aadhaar/PAN or sensitive credentials.
  - **Vendor KYC Screen (`VendorKycScreen.tsx`) Polish**:
    - Added real client-side validation for Aadhaar (12 numeric digits), PAN (10 characters alphanumeric regex), Voter ID, and Trade License.
    - Form inputs now adapt `keyboardType="numeric"`, `autoCapitalize="characters"`, and `maxLength` according to selected document type.
    - Gracefully handles PDF documents in preview modal without broken `<Image />` tags.
    - Removed hardcoded fake demo documents, replacing with an empty state and live documents fetched from MongoDB.
    - Supports all canonical statuses: Not Submitted, Under Review (`pending_review`, `under_review`, `submitted`), Verified, Rejected, and Changes Required.
  - **Verification**:
    - Verified live upload and KYC submission to MongoDB Atlas and Cloudinary via live API tests (HTTP 200).
    - Syntax checks passed on backend routes and controller (`node --check`).
    - TypeScript checks passed cleanly with 0 errors (`npx tsc --noEmit`).

- [x] **Task 4.27**: Fix WorkLogy Admin Web Vendors Page Crash and Implement Complete Vendor Details & KYC Document Viewer (`frontend/src/pages/admin/Vendors.jsx`, `frontend/src/components/admin/VendorDetailsModal.jsx`, `frontend/src/components/admin/KycDocumentViewerModal.jsx`, `frontend/src/api/admin.api.js`, `frontend/src/utils/formatters.js`, `backend/src/controllers/admin.controller.js`, `backend/src/routes/admin.routes.js`, `backend/src/models/VendorProfile.js`):
  - **Root Cause & Fix for Admin Vendors Page Crash**:
    - Identified root cause of runtime error `CheckSquare is not defined` on `/admin/vendors` (`src/pages/admin/Vendors.jsx:59`): `CheckSquare` was used in the empty state JSX on line 276 but omitted from the `lucide-react` import statement.
    - Added `CheckSquare` to the `lucide-react` imports. Verified that `/admin/vendors` renders cleanly without error boundary crashes or blank screens.
  - **Complete 8-Tab Vendor Dossier Modal (`VendorDetailsModal.jsx`)**:
    - Built comprehensive, responsive modal dossier matching WorkLogy design tokens with 8 organized tabs:
      1. **Overview**: Highlights key account metrics, quick actions, contact details, and top trade services.
      2. **Profile & Services**: Full business profile, description, experience years, service categories, pricing models, and specific skills.
      3. **KYC & Documents**: Dedicated verification center displaying overall status badge, submission counts, document cards with masked IDs (`XXXX-XXXX-1234` / `XXXX-1234`), reviewer notes, and individual review actions.
      4. **Service Area**: Primary city, PIN code, coverage radius, active zones, and covered Lucknow localities.
      5. **Jobs & Bookings**: Live records of recent customer bookings, statuses, dates, and amounts.
      6. **Earnings & Payments**: Completed job counts, total earnings in INR, pending balances, and transaction history.
      7. **Ratings & Reviews**: Real star ratings, verified customer feedback, and review dates.
      8. **Activity & Audit History**: Timestamped logs of status changes, reviewer IDs, notes, and verification events.
  - **Interactive KYC Document Viewer Modal (`KycDocumentViewerModal.jsx`)**:
    - High-performance modal supporting image zoom controls (+/- 25%, 100% reset), 90° clockwise rotation, and pan preview.
    - Embedded PDF document viewer with fallback download/external preview button.
    - Masked government identification numbers by default for Aadhaar and PAN privacy.
    - Inline admin verification actions: Approve Document, Reject Document (with mandatory rejection reason), and Request Changes.
  - **Secure Backend Endpoints & Data Model Enhancements**:
    - Enhanced `VendorProfile` Mongoose schema to store individual document statuses (`pending`, `approved`, `rejected`, `changes_required`), `rejectionReason`, `reviewedAt`, and `reviewedBy`.
    - Added `reviewedBy` to `approvalHistory` subschema to prevent Mongoose `StrictPopulateError`.
    - Enhanced `GET /api/admin/vendors/:id` to populate vendor user, categories, audit users, recent bookings, customer reviews, and transactions.
    - Added `PATCH /api/admin/vendors/:id/documents/:docIndex` to review individual documents, record admin audit trails, send vendor notifications, and synchronize overall `verifiedBadge.status`.
    - Added `GET /api/admin/vendors/:id/documents/:docIndex/:mode` for authenticated document access and streaming.
  - **Verification & Zero Scope Creep**:
    - Frontend production build (`npm run build`) passed cleanly in 2.65s with 0 errors.
    - Backend syntax checks passed cleanly (`node --check`).
    - Verified all 6 E2E integration steps against live MongoDB Atlas (`backend/src/scripts/test_admin_kyc_e2e.mjs`).
    - Zero modifications or regressions to Customer App or Vendor Mobile App.

