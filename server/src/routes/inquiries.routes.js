import { Router } from 'express';
import { pool, query } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createInquirySchema,
  updateStatusSchema,
  parseIdParam
} from '../validation/inquiry.js';

const router = Router();

// Apply authentication middleware to all inquiry endpoints
router.use(requireAuth);

/**
 * Allowed status transitions state machine:
 * - New -> In Progress
 * - In Progress -> Resolved
 * - Resolved -> In Progress (reopen)
 */
const ALLOWED_TRANSITIONS = {
  'New': ['In Progress'],
  'In Progress': ['Resolved'],
  'Resolved': ['In Progress']
};

/**
 * GET /api/inquiries
 * Returns inquiries created by the authenticated user, sorted newest first.
 * Supports query parameters:
 * - search: case-insensitive match on customer_name, contact, or subject
 * - status: filter by status ('New', 'In Progress', 'Resolved')
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { search, status } = req.query;

    const conditions = ['created_by = $1'];
    const params = [userId];
    let paramIndex = 2;

    // Optional status filter
    if (status && status !== 'all' && status.trim() !== '') {
      const validStatuses = ['New', 'In Progress', 'Resolved'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid status filter. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Optional search across customer_name, contact, and subject
    if (search && search.trim() !== '') {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(
        `(customer_name ILIKE $${paramIndex} OR contact ILIKE $${paramIndex} OR subject ILIKE $${paramIndex})`
      );
      params.push(searchPattern);
      paramIndex++;
    }

    const sql = `
      SELECT id, created_by, customer_name, contact, subject, description, status, version, created_at, updated_at
      FROM inquiries
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC;
    `;

    const result = await query(sql, params);

    return res.status(200).json({
      inquiries: result.rows
    });
  } catch (error) {
    console.error('Error listing inquiries:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve inquiries'
    });
  }
});

/**
 * POST /api/inquiries
 * Records a new customer inquiry for the authenticated staff member.
 * Defaults status to 'New' and version to 1.
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.session.userId;

    // Validate body using Zod
    const validationResult = createInquirySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(422).json({
        error: 'Validation failed',
        details: validationResult.error.flatten().fieldErrors
      });
    }

    const { customer_name, contact, subject, description } = validationResult.data;

    const sql = `
      INSERT INTO inquiries (created_by, customer_name, contact, subject, description, status, version)
      VALUES ($1, $2, $3, $4, $5, 'New', 1)
      RETURNING id, created_by, customer_name, contact, subject, description, status, version, created_at, updated_at;
    `;

    const result = await query(sql, [userId, customer_name, contact, subject, description]);

    return res.status(201).json({
      message: 'Inquiry created successfully',
      inquiry: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating inquiry:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to record inquiry'
    });
  }
});

/**
 * GET /api/inquiries/:id
 * Fetches full details for a single inquiry owned by the authenticated user.
 * Returns HTTP 404 if not found or owned by another user.
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Inquiry ID must be a positive integer'
      });
    }

    const userId = req.session.userId;
    const sql = `
      SELECT id, created_by, customer_name, contact, subject, description, status, version, created_at, updated_at
      FROM inquiries
      WHERE id = $1 AND created_by = $2;
    `;

    const result = await query(sql, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Inquiry not found'
      });
    }

    return res.status(200).json({
      inquiry: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching inquiry details:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch inquiry details'
    });
  }
});

/**
 * PATCH /api/inquiries/:id/status
 * Updates the inquiry status using atomic optimistic concurrency control (OCC).
 * Enforces:
 * 1. Ownership check (WHERE created_by = userId)
 * 2. Row lock (SELECT FOR UPDATE)
 * 3. Version comparison (rejects stale version with 409)
 * 4. Allowed transition validation (rejects invalid transitions with 422)
 * 5. Idempotent same-status no-op (no mutation or version increment)
 */
router.patch('/:id/status', async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Inquiry ID must be a positive integer'
    });
  }

  const validationResult = updateStatusSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(422).json({
      error: 'Validation failed',
      details: validationResult.error.flatten().fieldErrors
    });
  }

  const { status: requestedStatus, version: expectedVersion } = validationResult.data;
  const userId = req.session.userId;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock row and verify ownership
    const selectSql = `
      SELECT id, created_by, customer_name, contact, subject, description, status, version, created_at, updated_at
      FROM inquiries
      WHERE id = $1 AND created_by = $2
      FOR UPDATE;
    `;
    const selectRes = await client.query(selectSql, [id, userId]);

    if (selectRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Not Found',
        message: 'Inquiry not found'
      });
    }

    const currentInquiry = selectRes.rows[0];

    // 2. Optimistic Concurrency Control check: verify expected version
    if (currentInquiry.version !== expectedVersion) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Conflict',
        message: 'The inquiry has been modified by another session. Please reload the latest data.',
        currentVersion: currentInquiry.version,
        currentStatus: currentInquiry.status
      });
    }

    // 3. Same-status no-op check: do not modify row or increment version
    if (currentInquiry.status === requestedStatus) {
      await client.query('COMMIT');
      return res.status(200).json({
        message: `Inquiry status is already '${requestedStatus}'`,
        inquiry: currentInquiry
      });
    }

    // 4. Validate allowed lifecycle transition
    const allowedNextStatuses = ALLOWED_TRANSITIONS[currentInquiry.status] || [];
    if (!allowedNextStatuses.includes(requestedStatus)) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        error: 'Unprocessable Entity',
        message: `Cannot change status from '${currentInquiry.status}' to '${requestedStatus}'. Allowed transitions: ${allowedNextStatuses.join(', ')}`
      });
    }

    // 5. Apply atomic update and increment version
    const updateSql = `
      UPDATE inquiries
      SET status = $1, version = version + 1, updated_at = NOW()
      WHERE id = $2 AND created_by = $3
      RETURNING id, created_by, customer_name, contact, subject, description, status, version, created_at, updated_at;
    `;
    const updateRes = await client.query(updateSql, [requestedStatus, id, userId]);

    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Status updated successfully',
      inquiry: updateRes.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating inquiry status:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while updating the inquiry status'
    });
  } finally {
    client.release();
  }
});

export default router;
