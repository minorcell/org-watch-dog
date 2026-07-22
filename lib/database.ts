import { neon } from "@neondatabase/serverless";
import { z } from "zod";

import { getDatabaseUrl } from "@/lib/env";
import type { RepositoryStarStats } from "@/lib/github";

const timestampSchema = z.preprocess(
  (value) => value instanceof Date ? value.toISOString() : value,
  z.string().min(1),
);

const nullableTimestampSchema = z.preprocess(
  (value) => value instanceof Date ? value.toISOString() : value,
  z.string().min(1).nullable(),
);

const snapshotRowSchema = z.object({
  runId: z.coerce.number().int(),
  repository: z.string(),
  projectName: z.string(),
  topic: z.string(),
  url: z.url(),
  visibility: z.enum(["public", "private", "unknown"]),
  capturedAt: timestampSchema,
  stars: z.coerce.number().int().nonnegative(),
  forks: z.coerce.number().int().nonnegative(),
  openIssues: z.coerce.number().int().nonnegative(),
  updatedAt: nullableTimestampSchema,
});

const snapshotRunSchema = z.object({
  id: z.coerce.number().int(),
  capturedAt: timestampSchema,
  status: z.enum(["completed", "partial", "failed"]),
  successCount: z.coerce.number().int().nonnegative(),
  failureCount: z.coerce.number().int().nonnegative(),
});

export type StarSnapshot = z.infer<typeof snapshotRowSchema>;
export type SnapshotRun = z.infer<typeof snapshotRunSchema>;

function getSql() {
  const databaseUrl = getDatabaseUrl();
  return databaseUrl ? neon(databaseUrl) : null;
}

export function isDatabaseConfigured() {
  return getDatabaseUrl() !== null;
}

export async function ensureSnapshotSchema() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL 尚未配置");

  await sql`
    CREATE TABLE IF NOT EXISTS snapshot_runs (
      id BIGSERIAL PRIMARY KEY,
      captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL CHECK (status IN ('completed', 'partial', 'failed')),
      success_count INTEGER NOT NULL DEFAULT 0 CHECK (success_count >= 0),
      failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS repository_star_snapshots (
      run_id BIGINT NOT NULL REFERENCES snapshot_runs(id) ON DELETE CASCADE,
      repository TEXT NOT NULL,
      project_name TEXT NOT NULL,
      topic TEXT NOT NULL,
      url TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'unknown' CHECK (visibility IN ('public', 'private', 'unknown')),
      captured_at TIMESTAMPTZ NOT NULL,
      stars INTEGER NOT NULL CHECK (stars >= 0),
      forks INTEGER NOT NULL CHECK (forks >= 0),
      open_issues INTEGER NOT NULL CHECK (open_issues >= 0),
      updated_at TIMESTAMPTZ,
      PRIMARY KEY (run_id, repository)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS repository_star_snapshots_repository_captured_idx
    ON repository_star_snapshots (repository, captured_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS repository_star_snapshots_captured_idx
    ON repository_star_snapshots (captured_at DESC)
  `;
}

export async function saveStarSnapshots(stats: RepositoryStarStats[], failureCount = 0) {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL 尚未配置");

  await ensureSnapshotSchema();

  const status = stats.length === 0 ? "failed" : failureCount > 0 ? "partial" : "completed";
  const [run] = await sql`
    INSERT INTO snapshot_runs (status, success_count, failure_count)
    VALUES (${status}, ${stats.length}, ${failureCount})
    RETURNING id, captured_at AS "capturedAt"
  `;

  if (!run) throw new Error("无法创建快照批次");

  await Promise.all(stats.map((repository) => sql`
    INSERT INTO repository_star_snapshots (
      run_id, repository, project_name, topic, url, visibility,
      captured_at, stars, forks, open_issues, updated_at
    )
    VALUES (
      ${run.id}, ${repository.fullName}, ${repository.projectName}, ${repository.topic},
      ${repository.url}, ${repository.visibility}, ${run.capturedAt}, ${repository.stars},
      ${repository.forks}, ${repository.openIssues}, ${repository.updatedAt}
    )
  `));

  return {
    runId: Number(run.id),
    capturedAt: String(run.capturedAt),
  };
}

export async function getStarSnapshots(from: string, to: string): Promise<StarSnapshot[]> {
  const sql = getSql();
  if (!sql) return [];

  await ensureSnapshotSchema();

  const rows = await sql`
    SELECT
      run_id AS "runId",
      repository,
      project_name AS "projectName",
      topic,
      url,
      visibility,
      captured_at AS "capturedAt",
      stars,
      forks,
      open_issues AS "openIssues",
      updated_at AS "updatedAt"
    FROM repository_star_snapshots
    WHERE captured_at >= (${from}::date AT TIME ZONE 'Asia/Shanghai')
      AND captured_at < ((${to}::date + INTERVAL '1 day') AT TIME ZONE 'Asia/Shanghai')
    ORDER BY captured_at ASC, repository ASC
  `;

  return z.array(snapshotRowSchema).parse(rows);
}

export async function getLatestStarSnapshots(): Promise<StarSnapshot[]> {
  const sql = getSql();
  if (!sql) return [];

  await ensureSnapshotSchema();

  const rows = await sql`
    SELECT DISTINCT ON (repository)
      run_id AS "runId",
      repository,
      project_name AS "projectName",
      topic,
      url,
      visibility,
      captured_at AS "capturedAt",
      stars,
      forks,
      open_issues AS "openIssues",
      updated_at AS "updatedAt"
    FROM repository_star_snapshots
    ORDER BY repository, captured_at DESC
  `;

  return z.array(snapshotRowSchema).parse(rows);
}

// ── Organization schema (3-table model) ─────────────────────

export async function ensureOrganizationSchema() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL 尚未配置");

  await sql`
    CREATE TABLE IF NOT EXISTS people (
      id SERIAL PRIMARY KEY,
      github_id TEXT NOT NULL UNIQUE,
      real_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
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
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS repo_members (
      repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('mentor', 'assistant', 'lead', 'member')),
      PRIMARY KEY (repo_id, person_id)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS repo_members_person_idx ON repo_members (person_id)`;
}

// ── Types ─────────────────────────────────────────────────────

export type Person = {
  id: number;
  githubId: string;
  realName: string;
  createdAt: string;
  updatedAt: string;
};

export type Repo = {
  id: number;
  githubRepo: string;
  description: string | null;
  homepageUrl: string | null;
  topics: string[];
  language: string | null;
  visibility: string;
  archived: boolean;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RepoMember = {
  repoId: number;
  personId: number;
  role: "mentor" | "assistant" | "lead" | "member";
};

// People CRUD ──────────────────────────────────────────────────

export async function listPeople(): Promise<Person[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureOrganizationSchema();
  const rows = await sql`
    SELECT id, github_id AS "githubId", real_name AS "realName",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM people ORDER BY id ASC
  `;
  return rows as Person[];
}

export async function createPerson(githubId: string, realName: string): Promise<Person> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL 尚未配置");
  await ensureOrganizationSchema();
  const [row] = await sql`
    INSERT INTO people (github_id, real_name) VALUES (${githubId}, ${realName})
    RETURNING id, github_id AS "githubId", real_name AS "realName",
              created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  return row as Person;
}

export async function updatePerson(id: number, githubId: string, realName: string): Promise<Person | null> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL 尚未配置");
  await ensureOrganizationSchema();
  const [row] = await sql`
    UPDATE people SET github_id = ${githubId}, real_name = ${realName}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, github_id AS "githubId", real_name AS "realName",
              created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  return (row as Person) ?? null;
}

export async function deletePerson(id: number): Promise<boolean> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL 尚未配置");
  await ensureOrganizationSchema();
  const [deleted] = await sql`DELETE FROM people WHERE id = ${id} RETURNING id`;
  return deleted !== undefined;
}

export async function getPersonByGithubId(githubId: string): Promise<Person | null> {
  const sql = getSql();
  if (!sql) return null;
  await ensureOrganizationSchema();
  const [row] = await sql`
    SELECT id, github_id AS "githubId", real_name AS "realName",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM people WHERE github_id = ${githubId}
  `;
  return (row as Person) ?? null;
}

// Repos CRUD ───────────────────────────────────────────────────

export async function listRepos(): Promise<Repo[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureOrganizationSchema();
  const rows = await sql`
    SELECT id, github_repo AS "githubRepo", description, homepage_url AS "homepageUrl",
           topics, language, visibility, archived, synced_at AS "syncedAt",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM repos ORDER BY id ASC
  `;
  return (rows as Repo[]).map((r) => ({ ...r, topics: r.topics ?? [] }));
}

export async function upsertRepo(githubRepo: string): Promise<Repo> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL 尚未配置");
  await ensureOrganizationSchema();
  const [row] = await sql`
    INSERT INTO repos (github_repo) VALUES (${githubRepo})
    ON CONFLICT (github_repo) DO UPDATE SET github_repo = repos.github_repo
    RETURNING id, github_repo AS "githubRepo", description, homepage_url AS "homepageUrl",
              topics, language, visibility, archived, synced_at AS "syncedAt",
              created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  return { ...row, topics: row.topics ?? [] } as Repo;
}

export async function syncRepoMetadata(
  githubRepo: string,
  metadata: { description: string | null; homepageUrl: string | null; topics: string[]; language: string | null; visibility: string; archived: boolean },
): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL 尚未配置");
  await ensureOrganizationSchema();
  await sql`
    UPDATE repos
    SET description = ${metadata.description},
        homepage_url = ${metadata.homepageUrl},
        topics = ${metadata.topics},
        language = ${metadata.language},
        visibility = ${metadata.visibility},
        archived = ${metadata.archived},
        synced_at = NOW()
    WHERE github_repo = ${githubRepo}
  `;
}

export async function deleteRepo(id: number): Promise<boolean> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL 尚未配置");
  await ensureOrganizationSchema();
  const [deleted] = await sql`DELETE FROM repos WHERE id = ${id} RETURNING id`;
  return deleted !== undefined;
}

export async function isOrgDataAvailable(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  await ensureOrganizationSchema();
  const [row] = await sql`SELECT COUNT(*)::int AS count FROM repos`;
  return (row?.count ?? 0) > 0;
}

// Repo members ──────────────────────────────────────────────────

export async function setRepoMember(repoId: number, personId: number, role: string): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL 尚未配置");
  await ensureOrganizationSchema();
  await sql`
    INSERT INTO repo_members (repo_id, person_id, role) VALUES (${repoId}, ${personId}, ${role})
    ON CONFLICT (repo_id, person_id) DO UPDATE SET role = EXCLUDED.role
  `;
}

export async function removeRepoMember(repoId: number, personId: number): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL 尚未配置");
  await ensureOrganizationSchema();
  await sql`DELETE FROM repo_members WHERE repo_id = ${repoId} AND person_id = ${personId}`;
}

// Repo detail (for drawer) ─────────────────────────────────────

export type RepoDetail = Repo & {
  members: { personId: number; githubId: string; realName: string; role: string }[];
};

export async function getRepoDetail(repoFullName: string): Promise<RepoDetail | null> {
  const sql = getSql();
  if (!sql) return null;
  await ensureOrganizationSchema();

  const [repo] = await sql`
    SELECT id, github_repo AS "githubRepo", description, homepage_url AS "homepageUrl",
           topics, language, visibility, archived, synced_at AS "syncedAt",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM repos WHERE github_repo = ${repoFullName}
  `;
  if (!repo) return null;

  const members = await sql`
    SELECT p.id AS "personId", p.github_id AS "githubId", p.real_name AS "realName", rm.role
    FROM repo_members rm
    JOIN people p ON rm.person_id = p.id
    WHERE rm.repo_id = ${repo.id}
    ORDER BY
      CASE rm.role
        WHEN 'mentor' THEN 1
        WHEN 'assistant' THEN 2
        WHEN 'lead' THEN 3
        WHEN 'member' THEN 4
      END,
      p.id ASC
  `;

  return { ...repo, topics: repo.topics ?? [], members: members as RepoDetail["members"] } as RepoDetail;
}

// Bulk import from YAML ────────────────────────────────────────

export async function importOrgFromYaml(groups: Array<{
  githubRepo: string;
  mentor: { name: string; id: string };
  assistant: { name: string; id: string };
  members: Array<{ name: string; id: string }>;
}>) {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL 尚未配置");
  await ensureOrganizationSchema();

  let reposCount = 0;
  let peopleCount = 0;

  for (const g of groups) {
    // Parse repo
    if (!g.githubRepo) continue;
    const url = new URL(g.githubRepo);
    const parts = url.pathname.split("/").filter(Boolean);
    const fullRepo = `${parts[0]}/${parts[1]}`;

    // Upsert repo
    await upsertRepo(fullRepo);
    reposCount++;

    // Upsert people
    const ensurePerson = async (name: string, githubId: string): Promise<number> => {
      if (!githubId) return -1;
      const existing = await getPersonByGithubId(githubId);
      if (existing) {
        await sql`UPDATE people SET real_name = ${name}, updated_at = NOW() WHERE id = ${existing.id}`;
        return existing.id;
      }
      const [row] = await sql`
        INSERT INTO people (github_id, real_name) VALUES (${githubId}, ${name})
        RETURNING id
      `;
      peopleCount++;
      return row.id as number;
    };

    const mentorId = await ensurePerson(g.mentor.name, g.mentor.id);
    const assistantId = await ensurePerson(g.assistant.name, g.assistant.id);

    // Get repo id
    const [r] = await sql`SELECT id FROM repos WHERE github_repo = ${fullRepo}`;
    if (!r) continue;
    const repoId = r.id as number;

    // Assign roles
    if (mentorId > 0) await setRepoMember(repoId, mentorId, "mentor");
    if (assistantId > 0) await setRepoMember(repoId, assistantId, "assistant");

    for (const m of g.members) {
      const memberId = await ensurePerson(m.name, m.id);
      if (memberId > 0) await setRepoMember(repoId, memberId, "member");
    }
  }

  const [ppCount] = await sql`SELECT COUNT(*)::int AS count FROM people`;
  const [rrCount] = await sql`SELECT COUNT(*)::int AS count FROM repos`;

  return { repos: rrCount?.count ?? reposCount, people: ppCount?.count ?? peopleCount };
}

// All repos for star tracking ──────────────────────────────────

export async function getTrackedRepos(): Promise<{ githubRepo: string; repoId: number }[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureOrganizationSchema();
  const rows = await sql`
    SELECT github_repo AS "githubRepo", id AS "repoId" FROM repos
  `;
  return rows as { githubRepo: string; repoId: number }[];
}

export async function getLatestSnapshotRun(): Promise<SnapshotRun | null> {
  const sql = getSql();
  if (!sql) return null;

  await ensureSnapshotSchema();

  const [row] = await sql`
    SELECT
      id,
      captured_at AS "capturedAt",
      status,
      success_count AS "successCount",
      failure_count AS "failureCount"
    FROM snapshot_runs
    ORDER BY captured_at DESC
    LIMIT 1
  `;

  return row ? snapshotRunSchema.parse(row) : null;
}
