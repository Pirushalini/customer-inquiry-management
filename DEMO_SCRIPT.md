# Coffee Ninja Assessment — 3 to 5 Minute Demo Recording Guide

This document outlines the **actual screen recording** of the Customer Inquiry Management System submitted for the Coffee Ninja technical assessment.

**Project:** Customer Inquiry Management System  
**Technology:** React (Vite), Node.js / Express, PostgreSQL  
**Recording format:** Silent screen recording; narration is **not required**, as confirmed by the Coffee Ninja Hiring Team.  
**Video 1:** 2 minutes 29 seconds — Application demonstration  
**Video 2:** 40 seconds — Automated testing  
**Combined duration:** Approximately **3 minutes 9 seconds** (within the required 3–5 minutes).

---

## Recording Checklist Before Submission

- [ ] The application demonstration and automated testing clips are joined in that order.
- [ ] The final recording is between **3 and 5 minutes** long.
- [ ] The application interface, button clicks, validation messages, and test results are readable.
- [ ] The final video is exported as an **MP4**, preferably at **1080p**.
- [ ] Any on-screen feature labels do not cover buttons, form fields, or test output.
- [ ] The hiring team can open the submitted video link.

---

## Timed Walkthrough

### Part 1: Staff Login (0:00–0:10)

- **Visual:** Show the Coffee Ninja staff login screen. Select the Sarah demo account and sign in to the application.
- **Feature demonstrated:** Staff authentication and access to the application dashboard.
- **Optional on-screen label:** `Staff Login`

---

### Part 2: Dashboard, Search & Filter (0:10–0:35)

- **Visual:** Show the inquiry dashboard after login. Demonstrate the list of customer inquiries, search, and status filtering.
- **Feature demonstrated:** Staff can find and review their recorded inquiries.
- **Optional on-screen label:** `Dashboard & Search`

---

### Part 3: Create New Inquiry & Validation (0:35–1:35)

- **Visual:**
  1. Open the **New Inquiry** form.
  2. Submit the empty form to display required-field validation messages.
  3. Enter the customer's name, contact information, subject, and description.
  4. Submit the completed form and display the created inquiry.
- **Features demonstrated:** Form validation, customer inquiry creation, and saving inquiry data.
- **Optional on-screen label:** `Create New Inquiry`

---

### Part 4: Inquiry Status Management (1:35–2:15)

- **Visual:**
  1. Open the newly created inquiry details.
  2. Show its initial **New** status.
  3. Update it to **In Progress**.
  4. Update it to **Resolved**.
- **Feature demonstrated:** Inquiry lifecycle and status updates.
- **Optional on-screen label:** `Status Management`

---

### Part 5: Security & Access Control (2:15–2:29)

- **Visual:** Sign in as Alex and attempt to open the URL of an inquiry created under Sarah's account. Show the **Inquiry Not Found** result.
- **Feature demonstrated:** Staff cannot access inquiries owned by another staff member.
- **Optional on-screen label:** `Security & Access Control`

---

### Part 6: Automated Testing & Completion (2:29–3:09)

- **Visual:**
  1. Show the application project in the development environment.
  2. Run the backend automated tests and show **5 passing tests**.
  3. Run the frontend automated tests and show **3 passing tests**.
  4. End the recording after the test results are visible.
- **Feature demonstrated:** Automated verification of backend and frontend behavior.
- **Optional on-screen label:** `Automated Testing`

---

## Notes About the Submitted Recording

- This is a **silent** demonstration. The hiring team confirmed that voice narration is optional.
- On-screen labels are **optional**; they help the viewer follow each section but are not required.
- The original draft of this guide included demonstrations of invalid login, browser cookie inspection, reopening an inquiry, and a two-window **HTTP 409** stale-data conflict. Those steps are **not presented as recorded** in this final guide.
- The project source code, setup instructions, design choices, and any other implemented features are documented in the repository's `README.md` and `DECISIONS.md`.

---

## Submission Items

- [ ] GitHub repository link containing the application source code, tests, `README.md`, and `DECISIONS.md`.
- [ ] Accessible link to the **3:09-minute MP4** demo recording.
- [ ] This `DEMO_SCRIPT.md` updated in the repository if included as part of the project documentation.
