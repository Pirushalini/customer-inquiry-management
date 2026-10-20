import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

/**
 * GET /api/health
 * Verifies backend server health and checks live PostgreSQL connectivity.
 */
router.get('/', async (req, res) => {
  try {
    const dbStart = Date.now();
    const result = await query('SELECT 1 AS ok, NOW() AS db_time');
    const dbLatencyMs = Date.now() - dbStart;

    return res.status(200).json({
      status: 'healthy',
      database: {
        status: 'connected',
        latencyMs: dbLatencyMs,
        dbTime: result.rows[0].db_time
      },
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    return res.status(503).json({
      status: 'unhealthy',
      database: {
        status: 'disconnected',
        error: 'Unable to communicate with PostgreSQL database'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
