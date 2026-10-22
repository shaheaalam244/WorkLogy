# Worklogy - Full Stack Service Marketplace Platform

Worklogy is a full-stack on-demand service marketplace and job dispatch application connecting customers, verified vendors (contractors & professionals), and platform administrators with real-time updates and live chat.

---

## 📁 Project Architecture

```text
worklogy/
├── backend/
│   ├── package.json
│   ├── .env
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── config/        # db.js, cloudinary.js, socket.js
│       ├── models/        # 14 Mongoose Models (User, Job, Review, Chat, etc.)
│       ├── controllers/   # 13 Express Controllers
│       ├── routes/        # 12 API Route Handlers
│       ├── middleware/    # Auth (JWT), RBAC, Upload (Multer), Validation, Rate Limiter
│       ├── validators/    # Express-validator schemas
│       ├── sockets/       # Socket.IO handlers for Chat, Jobs, Leads
│       └── utils/         # Token generation, activity logging, geo-filtering
│
└── frontend/              # React 18 + Vite + Tailwind CSS + Lucide Icons
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── api/           # Axios instance & domain-specific API clients
        ├── context/       # AuthContext (JWT & demo login) & SocketContext
        ├── hooks/         # useAuth, useSocket, useLocation
        ├── routes/        # AppRoutes, ProtectedRoute, RoleRoute
        ├── layouts/       # PublicLayout, CustomerLayout, VendorLayout, AdminLayout
        ├── components/    # Common UI, Cards, Chat, Job Tracking, Vendor Onboarding
        ├── pages/
        │   ├── public/    # Home, Categories, Professionals, Jobs, Auth (10 pages)
        │   ├── customer/  # Customer portal, tracking, job creation, messaging (12 pages)
        │   ├── vendor/    # Vendor portal, calendar, earnings, proposals (15 pages)
        │   └── admin/     # Admin command center, users, categories, analytics (8 pages)
        └── utils/         # Formatters, constants, helpers
```

---

## 🚀 Quick Start Guide

### 1. Backend Setup

```bash
cd worklogy/backend

# Install dependencies (already pre-installed)
npm install

# Start development server
npm run dev
# The API will run on http://localhost:5000
```

> **Backend Environment (.env):**
> Pre-configured with defaults for local development:
> - `PORT=5000`
> - `MONGO_URI=mongodb://localhost:27017/worklogy`
> - `JWT_SECRET=worklogy_super_secret_jwt_key_2026`
> - `CLIENT_URL=http://localhost:5173`

---

### 2. Frontend Setup

```bash
cd worklogy/frontend

# Install dependencies (already pre-installed)
npm install

# Start Vite dev server
npm run dev
# Access the web app at http://localhost:5173
```

---

## 👥 Demo Logins & Roles

The frontend includes mock/demo authentication support for instant testing:

| Role | Email | Password | Access Portal |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@worklogy.com` | `password123` | Customer Dashboard (`/customer/dashboard`) |
| **Vendor** | `vendor@worklogy.com` | `password123` | Vendor Hub (`/vendor/dashboard`) |
| **Admin** | `admin@worklogy.com` | `password123` | Admin Command Center (`/admin/dashboard`) |
