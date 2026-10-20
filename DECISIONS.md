# Architectural Decisions & Engineering Rationale

**Project:** Coffee Ninja Customer Inquiry Management System  
**Author:** Full-Stack Assessment Candidate  
**Date:** October 2026  

---

## 1. Assumptions

- **Single Staff Ownership**: Each customer inquiry is handled by the staff member who recorded it. Team delegation and manager role reassignments were intentionally omitted to maintain a laser focus on the core workflow.
- **Seeded Staff Directory**: Registration is unnecessary for an internal company portal; staff accounts are provisioned and seeded by administration.
- **Permanent Operational History**: Deleting a staff account should never delete historical inquiries; customer inquiry records are company assets that must persist (`ON DELETE RESTRICT`).

---

## 2. Meaningful Design Decisions

### Decision 1: SQL-Level Ownership Enforcement with Masked 404 Responses
- **Choice**: Filter all read and update queries directly in PostgreSQL (`WHERE created_by = $userId`). If an inquiry ID exists but belongs to another staff member, the API returns **HTTP 404 Not Found** instead of HTTP 403 Forbidden.
- **Rationale**: Filtering in SQL guarantees tenant isolation at the database execution level rather than relying on application memory. Returning HTTP 404 conceals the existence of other users' inquiries, preventing enumeration attacks where unauthorized staff could probe valid IDs.

### Decision 2: Finite State Machine for Inquiry Lifecycle with Idempotent Updates
- **Choice**: Enforce allowed status transitions (`New` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved`, and `Resolved` $\rightarrow$ `In Progress`). Invalid transitions (such as skipping directly from `New` to `Resolved` or moving backwards to `New`) are rejected with **HTTP 422 Unprocessable Content**. Requests to update an inquiry to its current status succeed as an idempotent no-op without modifying the database or bumping the version.
- **Rationale**: Business workflows require predictable progression. A ticket cannot be marked "Resolved" without being investigated first. Allowing reopened inquiries to transition back to "In Progress" supports real-world customer follow-ups.

### Decision 3: Atomic Optimistic Concurrency Control (OCC) via Integer Versioning
- **Choice**: Each inquiry record includes an internal integer `version` column. Every status mutation requires the client to supply its last known version. The backend performs the check inside an atomic transaction with row locking (`SELECT ... FOR UPDATE`). If the version does not match, the transaction rolls back and returns **HTTP 409 Conflict**. The frontend renders a conflict banner with a **"Reload Latest Data"** action.
- **Rationale**: Web applications with multiple browser tabs or concurrent staff edits risk the "lost update" anomaly, where an older tab silently overwrites a newer status change. Optimistic locking avoids long-lived database locks while strictly safeguarding data integrity.

---

## 3. Trade-off Accepted

- **Form Submission Debouncing vs. Duplicate Prevention**:  
  When submitting inquiries, the frontend immediately disables the submit button to eliminate accidental double-clicks. However, intentional repeated submissions with identical content are allowed as distinct inquiries. Building a complex fuzzy-matching deduplication engine was consciously traded off in favor of simplicity, recognizing that customers occasionally submit identical inquiries for separate orders.

---

## 4. Improvements for Later

1. **Role-Based Access Control (RBAC)**: Introduce a "Supervisor / Store Manager" role capable of reassigning inquiries across staff members and viewing team-wide analytics.
2. **Activity Audit Trail**: Create an `inquiry_events` table tracking timestamped status changes, notes, and staff comments for full traceability.
3. **Database-Level Pagination**: Upgrade `GET /api/inquiries` to support cursor- or offset-based pagination (`LIMIT` / `OFFSET`) as ticket volume grows.

---

## 5. Testing Gaps and Rationale

- **High-Concurrency Load Testing**: Automated tests verify that optimistic concurrency correctly returns 409 for two conflicting updates. However, simulated load tests with hundreds of simultaneous requests were omitted as the expected volume for this internal portal is low.
- **Cross-Browser Visual Testing**: Testing was performed on modern desktop and mobile viewports using Vitest/JSDOM and Chromium via an automated browser agent. Dedicated cross-browser suites (e.g., Safari iOS rendering quirks) were omitted in favor of standard CSS compliance.

---

## 6. Transparent Statement on AI Tool Usage

AI assistance was utilized during this project as an intelligent pair-programming and refactoring partner:
- **Where AI Helped**: Generating initial boilerplate for Zod schemas, creating responsive CSS tokens, drafting Supertest assertion scaffolds, and debugging an Express 5 router incompatibility with wildcards.
- **Suggestion Accepted**: Using `SELECT ... FOR UPDATE` within a transaction rather than an unsecured `UPDATE ... WHERE version = $1` query, ensuring that status transitions and same-status checks are evaluated against locked row state.
- **Suggestion Changed**: AI initially suggested using `ON DELETE CASCADE` on the foreign key relationship between `staff_users` and `inquiries`. I rejected this and changed it to `ON DELETE RESTRICT` because customer inquiries must never be deleted automatically when an employee leaves the company.
- **Suggestion Rejected**: AI suggested adding JSON Web Tokens (JWT) in `localStorage`. I rejected this in favor of `express-session` backed by PostgreSQL with `httpOnly`, `SameSite=Lax` cookies, avoiding XSS token theft and keeping the architecture simple.
