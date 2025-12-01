-- Migration: Add OAuth and password reset fields to users table
-- Date: 2025-12-01

-- Add email column (nullable, unique)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- Add provider column with default 'local'
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'local';

-- Add provider_id column for OAuth
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);

-- Add reset token fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;

-- Make password_hash nullable for OAuth users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add index for provider + provider_id lookups
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users (provider, provider_id) WHERE provider_id IS NOT NULL;

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE email IS NOT NULL;

-- Add index for reset token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users (reset_token) WHERE reset_token IS NOT NULL;
