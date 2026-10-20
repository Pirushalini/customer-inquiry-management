# Coffee Ninja Assessment — 3 to 5 Minute Demo Recording Script

This script provides an exact, step-by-step presentation outline to follow when recording your 3–5 minute technical walkthrough.

---

## Recording Checklist Before Starting
- [ ] Docker PostgreSQL container is running (`docker compose up -d`).
- [ ] Backend is running on port 4000 (`cd server && npm run dev`).
- [ ] Frontend is running on port 5173 (`cd client && npm run dev`).
- [ ] Browser window open at `http://localhost:5173/login`.
- [ ] Secondary browser or incognito window ready to demonstrate cross-user isolation.
- [ ] Terminal window open showing test commands ready to run.

---

## Timed Walkthrough

### Part 1: Project Overview & Tech Stack (0:00 – 0:45)
- **Visual**: Show project repository in your IDE and the clean browser landing screen at `http://localhost:5173/login`.
- **Narration**:
  > *"Hello, I'm presenting my technical assessment for Coffee Ninja: the Customer Inquiry Management System. The goal was to build a secure, reliable end-to-end workflow where a staff member signs in, records an inquiry, finds it via search or status filters, and advances it through its operational lifecycle.*
  > *Our stack consists of a React 19 and Vite frontend, a Node.js Express 5 backend, and PostgreSQL 16 running via Docker. For security, we use server-side sessions stored in PostgreSQL using `connect-pg-simple`, `bcryptjs` password hashing, and decoupled Zod validation on both the client and server."*

---

### Part 2: Staff Authentication & Session Persistence (0:45 – 1:30)
- **Visual**: 
  1. Click "Sign In" with invalid credentials (`sarah@coffeeninja.com` / `WrongPass`) $\rightarrow$ observe clean error banner.
  2. Click the quick-fill button for **Sarah Jenkins** (`sarah@coffeeninja.com` / `NinjaPass123!`).
  3. Click "Sign In" $\rightarrow$ redirects to `/dashboard` showing *"Welcome back, Sarah Jenkins"*.
  4. Open DevTools Application tab $\rightarrow$ point out the `httpOnly`, `SameSite=Lax` session cookie (`coffee_ninja_sid`).
  5. Refresh the page $\rightarrow$ show that the session persists seamlessly without storing tokens in `localStorage`.
- **Narration**:
  > *"Notice that entering wrong credentials gives a generic error to prevent user enumeration. Once logged in as Sarah, Express regenerates the session to prevent session fixation and issues an `httpOnly` cookie. This persists across page reloads without exposing session tokens to client-side scripts."*

---

### Part 3: Inquiry Creation & Form Validation (1:30 – 2:30)
- **Visual**:
  1. Click **"+ Record New Inquiry"** $\rightarrow$ navigates to `/inquiries/new`.
  2. Click **"Submit Inquiry"** without filling any fields $\rightarrow$ show field-level error messages for Name, Contact, Subject, and Description.
  3. Enter an invalid contact (e.g. `test123`) $\rightarrow$ show validation error *"Please provide a valid email address or phone number"*.
  4. Fill in:
     - Customer: `Kelly Kapoor`
     - Contact: `kelly@dundermifflin.com`
     - Subject: `Vanilla Bean Artisan Roast`
     - Description: `Requesting special roast blend for office party.`
  5. Click **"Submit Inquiry"** $\rightarrow$ show button state *"Saving Inquiry..."* (disabled to prevent double submissions) $\rightarrow$ automatically navigates to `/inquiries/:id`.
- **Narration**:
  > *"On the inquiry creation form, Zod validates trimmed strings and ensures the contact is either a valid email or phone number. When submitting, the button disables immediately to prevent accidental duplicate submissions, and upon saving to PostgreSQL, we are redirected straight to the new inquiry details."*

---

### Part 4: Operational Lifecycle & Cross-User Security (2:30 – 3:30)
- **Visual**:
  1. On the details page, show the current status is **New** and version is **v1**.
  2. Click **"Start Progress →"** $\rightarrow$ updates status to **In Progress** and version increments to **v2**.
  3. Click **"Resolve Inquiry ✓"** $\rightarrow$ status becomes **Resolved** (version **v3**).
  4. Click **"Reopen Inquiry ↺"** $\rightarrow$ status moves back to **In Progress** (version **v4**).
  5. Note the URL (e.g. `/inquiries/7`). Open an incognito window, log in as **Alex Rivera** (`alex@coffeeninja.com`), and paste that direct URL.
  6. Observe: Alex sees **"Inquiry Not Found (404)"**.
- **Narration**:
  > *"Our lifecycle state machine allows valid progressions: New to In Progress, In Progress to Resolved, and reopening back to In Progress. Every status update increments an internal version column. Notice also that when Alex Rivera attempts to open Sarah's inquiry directly by URL, the backend returns a 404 Not Found. We enforce ownership directly in SQL queries (`WHERE created_by = $userId`), concealing the existence of other users' records."*

---

### Part 5: Stale-Data Conflict Demonstration (HTTP 409 OCC) (3:30 – 4:30)
- **Visual**:
  1. Open the same inquiry in two adjacent browser windows (Window 1 and Window 2).
  2. In Window 1, click **"Resolve Inquiry"** $\rightarrow$ status updates to Resolved.
  3. In Window 2 (which still has the older version), click an action button.
  4. Observe: Backend rejects the stale update with **HTTP 409 Conflict**.
  5. The UI displays the conflict notice: *"Version Conflict Detected: The inquiry has been modified by another session."*
  6. Click **"Reload Latest Data"** $\rightarrow$ inquiry status synchronizes to Resolved, version updates, and valid actions reappear without losing application state.
- **Narration**:
  > *"Here is how we handle stale data. When Window 1 updates the inquiry, the database version increments. When Window 2 attempts an update using its outdated version, our atomic optimistic locking rejects it with HTTP 409 Conflict. The UI guides the user with a conflict banner and a 'Reload Latest Data' button, allowing them to re-synchronize without overwriting newer data."*

---

### Part 6: Automated Test Verification & Wrap-Up (4:30 – 5:00)
- **Visual**:
  1. Switch to the terminal.
  2. Run `npm test` in `server/` $\rightarrow$ show all 5 backend tests passing against `coffee_ninja_test`.
  3. Run `npm test` in `client/` $\rightarrow$ show all 3 frontend tests passing in Vitest/JSDOM.
- **Narration**:
  > *"To ensure high reliability, we have an automated test suite. Our backend tests run against an isolated PostgreSQL test database verifying authentication, ownership security, input validation, state machine transitions, and optimistic locking. Our frontend tests verify form validation and the 409 conflict UI. Thank you for your time!"*
