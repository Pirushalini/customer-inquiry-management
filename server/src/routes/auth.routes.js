import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { loginSchema } from '../validation/auth.js';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticates a staff member, validates credentials,
 * regenerates the session to prevent fixation, and stores userId.
 */
router.post('/login', async (req, res) => {
  try {
    // 1. Zod input validation
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(422).json({
        error: 'Validation failed',
        details: validationResult.error.flatten().fieldErrors
      });
    }

    const { email, password } = validationResult.data;

    // 2. Query user by email (case-insensitive)
    const userResult = await query(
      'SELECT id, name, email, password_hash FROM staff_users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    const user = userResult.rows[0];

    // 3. Constant-time password check & generic error to prevent enumeration
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // 4. Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Unable to initialize session'
        });
      }

      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
          return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Unable to persist session'
          });
        }

        return res.status(200).json({
          message: 'Login successful',
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          }
        });
      });
    });
  } catch (error) {
    console.error('Error during staff login:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during login'
    });
  }
});

/**
 * POST /api/auth/logout
 * Destroys the current session and clears the session cookie.
 */
router.post('/logout', (req, res) => {
  if (!req.session) {
    res.clearCookie('coffee_ninja_sid');
    return res.status(200).json({ message: 'Successfully logged out' });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to log out'
      });
    }

    res.clearCookie('coffee_ninja_sid');
    return res.status(200).json({ message: 'Successfully logged out' });
  });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated staff member profile.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userResult = await query(
      'SELECT id, name, email, created_at FROM staff_users WHERE id = $1',
      [req.session.userId]
    );

    const user = userResult.rows[0];
    if (!user) {
      // User account was removed from DB
      req.session.destroy(() => {});
      res.clearCookie('coffee_ninja_sid');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Staff account no longer exists'
      });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user profile'
    });
  }
});

export default router;
