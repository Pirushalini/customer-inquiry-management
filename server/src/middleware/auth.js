/**
 * Authentication Middleware
 * Enforces that a valid session exists with a logged-in user ID.
 * Returns HTTP 401 if the request lacks active authentication.
 */
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please sign in.'
    });
  }
  next();
}
