CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  deadline_at_utc TIMESTAMPTZ NOT NULL,
  scoring_enabled BOOLEAN NOT NULL DEFAULT false,
  is_public_pool BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS scoring_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS is_public_pool BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name_normalized TEXT NOT NULL,
  edit_key_hash TEXT NOT NULL,
  edit_key_salt TEXT NOT NULL,
  fixture_state_json JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  failed_resume_attempts INTEGER NOT NULL DEFAULT 0,
  resume_locked_until_utc TIMESTAMPTZ,
  CONSTRAINT unique_entry_name_per_group UNIQUE (group_id, full_name_normalized)
);

CREATE INDEX IF NOT EXISTS entries_group_name_idx
  ON entries (group_id, full_name_normalized);

CREATE UNIQUE INDEX IF NOT EXISTS groups_single_public_pool_idx
  ON groups (is_public_pool)
  WHERE is_public_pool = true;

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
