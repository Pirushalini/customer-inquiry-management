import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import app from '../src/index.js';
import { pool } from '../src/db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Customer Inquiry API - Automated Backend Test Suite', () => {
  let employeeAId;
  let employeeBId;
  let agentA;
  let agentB;

  beforeAll(async () => {
    // 1. Ensure test database schema is applied
    const schemaPath = path.resolve(__dirname, '../src/db/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);

    // 2. Clean test tables
    await pool.query('DELETE FROM inquiries');
    await pool.query('DELETE FROM "session"');
    await pool.query('DELETE FROM staff_users');

    // 3. Seed two isolated test employees
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const insertUserSql = `
      INSERT INTO staff_users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email;
    `;

    const userARes = await pool.query(insertUserSql, ['Employee A', 'employee_a@coffeeninja.com', hashedPassword]);
    employeeAId = userARes.rows[0].id;

    const userBRes = await pool.query(insertUserSql, ['Employee B', 'employee_b@coffeeninja.com', hashedPassword]);
    employeeBId = userBRes.rows[0].id;

    // 4. Authenticate agents using real HTTP login requests
    agentA = request.agent(app);
    const loginARes = await agentA
      .post('/api/auth/login')
      .send({ email: 'employee_a@coffeeninja.com', password: 'Password123!' });
    expect(loginARes.status).toBe(200);

    agentB = request.agent(app);
    const loginBRes = await agentB
      .post('/api/auth/login')
      .send({ email: 'employee_b@coffeeninja.com', password: 'Password123!' });
    expect(loginBRes.status).toBe(200);
  });

  afterAll(async () => {
    // Gracefully release all pool clients so Vitest exits cleanly
    await pool.end();
  });

  // --------------------------------------------------------------------------
  // TEST 1 — Authentication
  // --------------------------------------------------------------------------
  it('TEST 1 — Authentication: unauthenticated request to GET /api/inquiries returns HTTP 401', async () => {
    const res = await request(app).get('/api/inquiries');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Unauthorized');
    expect(res.body).toHaveProperty('message', 'Authentication required. Please sign in.');
  });

  // --------------------------------------------------------------------------
  // TEST 2 — Ownership Security
  // --------------------------------------------------------------------------
  it('TEST 2 — Ownership Security: Employee B cannot view or modify Employee A inquiry (returns 404)', async () => {
    // 1. Employee A creates an inquiry
    const createRes = await agentA.post('/api/inquiries').send({
      customer_name: 'Angela Martin',
      contact: 'angela@dundermifflin.com',
      subject: 'Cat Party Coffee Catering',
      description: 'Customer requests specialized almond milk lattes and organic roast.'
    });

    expect(createRes.status).toBe(201);
    const inquiryId = createRes.body.inquiry.id;
    expect(createRes.body.inquiry.created_by).toBe(employeeAId);

    // 2. Employee B attempts to view Employee A's inquiry -> 404
    const viewRes = await agentB.get(`/api/inquiries/${inquiryId}`);
    expect(viewRes.status).toBe(404);
    expect(viewRes.body).toHaveProperty('error', 'Not Found');
    expect(viewRes.body).toHaveProperty('message', 'Inquiry not found');
    expect(viewRes.body.inquiry).toBeUndefined();

    // 3. Employee B attempts to modify Employee A's inquiry status -> 404
    const updateRes = await agentB
      .patch(`/api/inquiries/${inquiryId}/status`)
      .send({ status: 'In Progress', version: 1 });
    expect(updateRes.status).toBe(404);
    expect(updateRes.body).toHaveProperty('error', 'Not Found');

    // 4. Verify in DB that inquiry was NOT altered
    const dbCheck = await pool.query('SELECT status, version FROM inquiries WHERE id = $1', [inquiryId]);
    expect(dbCheck.rows[0].status).toBe('New');
    expect(dbCheck.rows[0].version).toBe(1);
  });

  // --------------------------------------------------------------------------
  // TEST 3 — Backend Input Validation
  // --------------------------------------------------------------------------
  it('TEST 3 — Backend Input Validation: reject missing required fields and invalid contact with HTTP 422', async () => {
    const initialCountRes = await pool.query('SELECT COUNT(*) FROM inquiries');
    const initialCount = parseInt(initialCountRes.rows[0].count, 10);

    const res = await agentA.post('/api/inquiries').send({
      customer_name: '   ',
      contact: 'invalid-contact-string-without-at-or-phone',
      subject: '',
      description: 'Only description provided'
    });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error', 'Validation failed');
    expect(res.body.details).toHaveProperty('customer_name');
    expect(res.body.details).toHaveProperty('contact');
    expect(res.body.details).toHaveProperty('subject');

    // Verify no row was inserted into PostgreSQL
    const afterCountRes = await pool.query('SELECT COUNT(*) FROM inquiries');
    const afterCount = parseInt(afterCountRes.rows[0].count, 10);
    expect(afterCount).toBe(initialCount);
  });

  // --------------------------------------------------------------------------
  // TEST 4 — Status Business Rules
  // --------------------------------------------------------------------------
  it('TEST 4 — Status Business Rules: validates lifecycle state transitions (New -> In Progress -> Resolved -> In Progress)', async () => {
    // 1. Create inquiry (starts as New, version 1)
    const createRes = await agentA.post('/api/inquiries').send({
      customer_name: 'Andy Bernard',
      contact: 'andy@cornell.edu',
      subject: 'A Cappella Gala Espresso Cart',
      description: 'Need pour-over and espresso bar for alumni event.'
    });
    expect(createRes.status).toBe(201);
    const id = createRes.body.inquiry.id;

    // 2. Transition New -> In Progress (valid)
    const toProgressRes = await agentA
      .patch(`/api/inquiries/${id}/status`)
      .send({ status: 'In Progress', version: 1 });
    expect(toProgressRes.status).toBe(200);
    expect(toProgressRes.body.inquiry.status).toBe('In Progress');
    expect(toProgressRes.body.inquiry.version).toBe(2);

    // 3. Transition In Progress -> Resolved (valid)
    const toResolvedRes = await agentA
      .patch(`/api/inquiries/${id}/status`)
      .send({ status: 'Resolved', version: 2 });
    expect(toResolvedRes.status).toBe(200);
    expect(toResolvedRes.body.inquiry.status).toBe('Resolved');
    expect(toResolvedRes.body.inquiry.version).toBe(3);

    // 4. Transition Resolved -> In Progress (reopening, valid)
    const reopenRes = await agentA
      .patch(`/api/inquiries/${id}/status`)
      .send({ status: 'In Progress', version: 3 });
    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.inquiry.status).toBe('In Progress');
    expect(reopenRes.body.inquiry.version).toBe(4);

    // 5. Test invalid direct transition: Create new inquiry and attempt New -> Resolved
    const createRes2 = await agentA.post('/api/inquiries').send({
      customer_name: 'Kelly Kapoor',
      contact: 'kelly@dundermifflin.com',
      subject: 'Holiday Coffee Flavors',
      description: 'Inquiring about pumpkin spice and gingerbread syrups.'
    });
    const id2 = createRes2.body.inquiry.id;

    const invalidTransitionRes = await agentA
      .patch(`/api/inquiries/${id2}/status`)
      .send({ status: 'Resolved', version: 1 });
    expect(invalidTransitionRes.status).toBe(422);
    expect(invalidTransitionRes.body).toHaveProperty('error', 'Unprocessable Entity');
    expect(invalidTransitionRes.body.message).toContain("Cannot change status from 'New' to 'Resolved'");
  });

  // --------------------------------------------------------------------------
  // TEST 5 — Stale Data Protection (Optimistic Concurrency Control)
  // --------------------------------------------------------------------------
  it('TEST 5 — Stale Data Protection: rejects outdated version with HTTP 409 Conflict without overwriting newer data', async () => {
    // 1. Create inquiry at version 1
    const createRes = await agentA.post('/api/inquiries').send({
      customer_name: 'Oscar Martinez',
      contact: 'oscar@dundermifflin.com',
      subject: 'Financial Audit Fuel',
      description: 'Urgent dark roast delivery needed during fiscal year-end.'
    });
    expect(createRes.status).toBe(201);
    const id = createRes.body.inquiry.id;
    expect(createRes.body.inquiry.version).toBe(1);

    // 2. Tab A updates version 1 -> status becomes In Progress, version becomes 2
    const firstUpdateRes = await agentA
      .patch(`/api/inquiries/${id}/status`)
      .send({ status: 'In Progress', version: 1 });
    expect(firstUpdateRes.status).toBe(200);
    expect(firstUpdateRes.body.inquiry.version).toBe(2);
    expect(firstUpdateRes.body.inquiry.status).toBe('In Progress');

    // 3. Tab B attempts update using stale version 1
    const staleUpdateRes = await agentA
      .patch(`/api/inquiries/${id}/status`)
      .send({ status: 'Resolved', version: 1 });

    expect(staleUpdateRes.status).toBe(409);
    expect(staleUpdateRes.body).toHaveProperty('error', 'Conflict');
    expect(staleUpdateRes.body.message).toContain('Please reload the latest data');

    // 4. Verify in PostgreSQL that the database record remains intact and was not overwritten
    const dbRecord = await pool.query('SELECT status, version FROM inquiries WHERE id = $1', [id]);
    expect(dbRecord.rows[0].status).toBe('In Progress');
    expect(dbRecord.rows[0].version).toBe(2);
  });
});
