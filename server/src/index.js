import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db/index.js';
import authRoutes from './routes/auth.routes.js';
import healthRoutes from './routes/health.routes.js';
import inquiriesRoutes from './routes/inquiries.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 4000;

// Body parsing with malformed JSON handler
app.use(express.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Malformed JSON payload'
    });
  }
  next();
});

// Configure PostgreSQL-backed session storage
const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: false // Pre-created in schema.sql
    }),
    name: 'coffee_ninja_sid',
    secret: process.env.SESSION_SECRET || 'coffee_ninja_dev_session_secret_change_in_production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // Prevents client-side script access
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax', // CSRF protection
      secure: process.env.NODE_ENV === 'production' // True only in production with HTTPS
    }
  })
);

// Preserved test endpoint
app.get('/api/ping', (req, res) => {
  res.json({
    message: 'Coffee Ninja API is running!',
    status: 'success'
  });
});

// Mount modular route handlers
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/inquiries', inquiriesRoutes);

// Generic 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.originalUrl} does not exist`
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred on the server'
  });
});

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export default app;
