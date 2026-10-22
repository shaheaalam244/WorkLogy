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



