-- Migration: Add email verification fields
-- Date: 2025-12-01

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expiry TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users (email_verification_token) WHERE email_verification_token IS NOT NULL;
