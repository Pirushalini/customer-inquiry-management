-- Customer Inquiry Management System - Database Schema
-- Coffee Ninja (Pvt) Ltd

-- 1. Staff Users Table
CREATE TABLE IF NOT EXISTS staff_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user lookup by email during authentication
CREATE INDEX IF NOT EXISTS idx_staff_users_email ON staff_users(email);

-- 2. Express Session Table (connect-pg-simple)
CREATE TABLE IF NOT EXISTS "session" (
    "sid" VARCHAR NOT NULL COLLATE "default",
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- Index for session expiration cleanup
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- 3. Customer Inquiries Table
-- NOTE: ON DELETE RESTRICT prevents cascading deletions of customer inquiries if a staff account is deleted
CREATE TABLE IF NOT EXISTS inquiries (
    id SERIAL PRIMARY KEY,
    created_by INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
    customer_name VARCHAR(150) NOT NULL,
    contact VARCHAR(150) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'Resolved')),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for frequent queries: filter by staff ownership and status
CREATE INDEX IF NOT EXISTS idx_inquiries_created_by ON inquiries(created_by);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);
