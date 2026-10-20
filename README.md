# Coffee Ninja — Customer Inquiry Management System

A reliable, full-stack customer inquiry management application built for **Coffee Ninja (Pvt) Ltd**. This application enables staff members to sign in, record customer inquiries, search and filter their assigned inquiries, and manage each inquiry through its operational lifecycle with atomic optimistic concurrency control.

---

## Technical Stack

| Layer | Technology | Key Highlights |
|---|---|---|
| **Frontend** | React 19, Vite 8, React Router 7 | Responsive vanilla CSS design system, accessible form validation with Zod, session cookie persistence |
| **Backend** | Node.js v20, Express 5 | REST API, parameterized SQL queries, centralized error handling |
| **Database** | PostgreSQL 16 (Docker) | Host port `5433`, indexed foreign keys with `ON DELETE RESTRICT`, ACID transactions |
| **Authentication** | `express-session`, `connect-pg-simple`, `bcryptjs` | Server-managed sessions stored in PostgreSQL, session regeneration on login, `httpOnly` cookies |
| **Validation** | `Zod` | Decoupled client-side and server-side schemas, regex email/phone contact validation |
| **Automated Testing** | `Vitest`, `Supertest`, React Testing Library | Real HTTP assertions against an isolated test database (`coffee_ninja_test`) |

---

## Core Architecture & Engineering Highlights

1. **Strict Ownership Isolation**:
   - Each staff member can only view, search, and update customer inquiries they personally recorded.
   - Ownership is enforced directly in SQL queries (`WHERE created_by = $userId`), not in memory.
   - Accessing another employee's inquiry returns **HTTP 404 Not Found** (rather than 403 Forbidden) to avoid revealing the existence of other records.
2. **Operational Status Lifecycle**:
   - Allowed transitions: `New` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved`, and `Resolved` $\rightarrow$ `In Progress` (reopening).
   - Unsupported transitions (e.g. `New` $\rightarrow$ `Resolved` directly) are rejected with **HTTP 422 Unprocessable Content**.
   - Same-status requests are handled idempotently without unnecessary database mutations or version increments.
3. **Atomic Optimistic Concurrency Control (OCC)**:
   - Every inquiry record maintains an integer `version` column.
   - Status updates require sending the expected version. The server acquires a row lock (`SELECT ... FOR UPDATE`) within a PostgreSQL transaction.
   - If the version is stale (e.g. two browser tabs viewing the same inquiry), the update is rejected with **HTTP 409 Conflict**. The frontend renders a conflict banner with a **"Reload Latest Data"** action.
4. **Data Integrity**:
   - The relationship between `staff_users` and `inquiries` uses `ON DELETE RESTRICT`. Customer inquiry records are permanent operational assets that cannot disappear automatically if a staff user is deleted.

---

## Seeded Staff Accounts

The database includes two pre-seeded staff accounts for testing and demonstration:

| Employee Name | Email Address | Password | Role |
|---|---|---|---|
| **Sarah Jenkins** | `sarah@coffeeninja.com` | `NinjaPass123!` | Staff Member (seeded with initial inquiries) |
| **Alex Rivera** | `alex@coffeeninja.com` | `NinjaPass123!` | Staff Member (isolated account) |

---

## Prerequisites

- **Node.js**: v20.20.2 or later
- **npm**: v10.8.2 or later
- **Docker & Docker Compose**: For running PostgreSQL 16 on host port `5433` (or local PostgreSQL 16)

---

## Getting Started & Local Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd customer-inquiry-management
```

### 2. Environment Configuration
Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```

`server/.env` contents:
```ini
PORT=4000
NODE_ENV=development
SESSION_SECRET=coffee_ninja_dev_session_secret_change_in_production
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/coffee_ninja
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/coffee_ninja_test
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=coffee_ninja
```

### 3. Start PostgreSQL Database via Docker
Start the PostgreSQL container (mapped to host port `5433`):
```bash
docker compose up -d
```
Verify the container is healthy:
```bash
docker ps --filter "name=coffee_ninja_db"
```

### 4. Install Dependencies
Install dependencies for both backend and frontend:
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
cd ..
```

### 5. Run Database Migration and Seeding
Initialize the database schema, indexes, session store, and seed accounts:
```bash
cd server
npm run db:seed
cd ..
```
*(This command is idempotent and safe to run multiple times).*

### 6. Start the Development Servers

**Terminal 1 (Backend API - Port 4000)**:
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend Client - Port 5173)**:
```bash
cd client
npm run dev
```

Open **`http://localhost:5173`** in your browser to access the application.

---

## API Reference

All protected endpoints require an active session cookie (`coffee_ninja_sid`).

| Method | Endpoint | Access | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/ping` | Public | Preserved server heartbeat | `200` |
| `GET` | `/api/health` | Public | Live PostgreSQL connectivity check | `200`, `503` |
| `POST` | `/api/auth/login` | Public | Authenticates staff member, sets session cookie | `200`, `401`, `422` |
| `POST` | `/api/auth/logout` | Authenticated | Destroys session in PostgreSQL, clears cookie | `200` |
| `GET` | `/api/auth/me` | Authenticated | Retrieves current authenticated staff profile | `200`, `401` |
| `GET` | `/api/inquiries` | Authenticated | Lists inquiries owned by current user (`?search=&status=`) | `200`, `400`, `401` |
| `POST` | `/api/inquiries` | Authenticated | Creates a new inquiry (`customer_name`, `contact`, `subject`, `description`) | `201`, `401`, `422` |
| `GET` | `/api/inquiries/:id` | Authenticated | Gets details of an inquiry owned by current user | `200`, `400`, `401`, `404` |
| `PATCH` | `/api/inquiries/:id/status`| Authenticated | Updates inquiry status with OCC version checking | `200`, `400`, `401`, `404`, `409`, `422` |

---

## Running Automated Tests & Quality Checks

### Backend Automated Tests
Tests real HTTP requests and database interactions against an isolated test database (`coffee_ninja_test`):
```bash
cd server
npm test
```
*Coverage*:
- `TEST 1`: Rejects unauthenticated requests (`401 Unauthorized`).
- `TEST 2`: Enforces ownership security and tenant isolation (`404 Not Found` across users).
- `TEST 3`: Backend input validation rejects invalid payloads (`422 Unprocessable Entity`).
- `TEST 4`: State machine validates allowed transitions and rejects invalid jumps.
- `TEST 5`: Optimistic Concurrency Control rejects stale version updates (`409 Conflict`).

### Frontend Automated Tests
Tests component interactions using React Testing Library in JSDOM:
```bash
cd client
npm test
```
*Coverage*:
- `TEST 1`: Form validation displaying field-level errors on empty submit.
- `TEST 2`: User interaction, disabled submit button while in-flight, and navigation.
- `TEST 3`: Stale data conflict handling (HTTP 409) displaying reload action and refreshing state.

### Frontend Linting & Production Build
```bash
cd client
npm run lint    # ESLint check (0 errors, 0 warnings)
npm run build   # Production bundle verification
```

---

## Project Structure

```
customer-inquiry-management/
├── docker-compose.yml         # PostgreSQL 16 on port 5433:5432
├── .gitignore                 # Root ignore for secrets, logs, node_modules
├── .env.example               # Root configuration template
├── README.md                  # Project setup and documentation
├── DECISIONS.md               # Architecture and engineering decision log
├── DEMO_SCRIPT.md             # 3-5 minute demonstration outline
├── server/
│   ├── .env.example           # Server env template
│   ├── package.json           # Express dependencies and scripts
│   ├── vitest.config.js       # Vitest configuration for backend
│   ├── src/
│   │   ├── index.js           # Server entry point, session middleware, routes
│   │   ├── db/
│   │   │   ├── index.js       # pg.Pool with test environment routing
│   │   │   ├── schema.sql     # DDL: staff_users, session, inquiries, indexes
│   │   │   └── seed.js        # Repeatable seed script (Sarah & Alex)
│   │   ├── middleware/
│   │   │   └── auth.js        # requireAuth session guard
│   │   ├── routes/
│   │   │   ├── auth.routes.js # /api/auth/login, logout, me
│   │   │   ├── health.routes.js # /api/health with live DB check
│   │   │   └── inquiries.routes.js # /api/inquiries endpoints
│   │   └── validation/
│   │       ├── auth.js        # Zod login schemas
│   │       └── inquiry.js     # Zod inquiry schemas & param parser
│   └── test/
│       └── inquiries.test.js  # Supertest + Vitest automated test suite
└── client/
    ├── package.json           # React dependencies and scripts
    ├── vite.config.js         # Vite proxy (/api -> :4000)
    ├── vitest.config.js       # Vitest JSDOM configuration
    ├── index.html             # Accessible HTML root
    └── src/
        ├── main.jsx           # App mount
        ├── App.jsx            # Router and route guards
        ├── index.css          # Coffee Ninja design system & responsive layout
        ├── api/
        │   └── client.js      # Centralized API fetch wrapper
        ├── context/
        │   └── AuthContext.jsx# Session state and login/logout handlers
        ├── components/
        │   ├── Layout.jsx     # Navigation shell and user header
        │   ├── ProtectedRoute.jsx # Unauthenticated redirect guard
        │   ├── StatusBadge.jsx# Accessible status indicators
        │   ├── LoadingState.jsx# Accessible loading spinner
        │   └── ErrorState.jsx # Error fallback card
        ├── pages/
        │   ├── Login.jsx      # Staff login view with demo autofill
        │   ├── Dashboard.jsx  # Inquiry listing, search, status filter
        │   ├── NewInquiry.jsx # Validated inquiry creation form
        │   └── InquiryDetails.jsx # Details view, lifecycle actions, 409 reload
        └── test/
            ├── setup.js       # Testing library jest-dom setup
            └── inquiries.test.jsx # React Testing Library test suite
```

---

## License

Developed for **Coffee Ninja (Pvt) Ltd** technical assessment. Internal use only.
