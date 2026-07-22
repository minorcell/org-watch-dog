-- Drop old over-engineered tables
DROP TABLE IF EXISTS org_group_members CASCADE;
DROP TABLE IF EXISTS org_groups CASCADE;
DROP TABLE IF EXISTS org_people CASCADE;
DROP TABLE IF EXISTS org_projects CASCADE;

-- Simple 3-table model

-- GitHub ID ↔ real name mapping
CREATE TABLE IF NOT EXISTS people (
  id SERIAL PRIMARY KEY,
  github_id TEXT NOT NULL UNIQUE,
  real_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracked repos + metadata synced from GitHub
CREATE TABLE IF NOT EXISTS repos (
  id SERIAL PRIMARY KEY,
  github_repo TEXT NOT NULL UNIQUE,
  description TEXT,
  homepage_url TEXT,
  topics TEXT[] DEFAULT '{}',
  language TEXT,
  visibility TEXT NOT NULL DEFAULT 'unknown'
    CHECK (visibility IN ('public', 'private', 'internal', 'unknown')),
  archived BOOLEAN NOT NULL DEFAULT false,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Role assignment per repo
CREATE TABLE IF NOT EXISTS repo_members (
  repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('mentor', 'assistant', 'lead', 'member')),
  PRIMARY KEY (repo_id, person_id)
);

CREATE INDEX IF NOT EXISTS repo_members_person_idx ON repo_members (person_id);
