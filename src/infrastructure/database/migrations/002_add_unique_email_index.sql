-- Migration: Ensure unique index on users.email
-- Date: 2025-12-01

-- Create a unique index on email for non-null values. Use CONCURRENTLY to avoid locking.
-- Note: CONCURRENTLY cannot run inside a transaction.

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (email) WHERE email IS NOT NULL;
