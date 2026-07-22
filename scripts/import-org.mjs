/**
 * One-time import: reads app/data/info.yaml and writes to Neon DB.
 * Usage: pnpm db:import
 * Requires DATABASE_URL in .env.local
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getSql() {
  const envPath = path.join(__dirname, "..", ".env.local");
  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    try {
      const envContent = readFileSync(envPath, "utf-8");
      const match = envContent.match(/^DATABASE_URL\s*=\s*(.+)$/m);
      if (match) dbUrl = match[1].trim();
    } catch {
      // ignore
    }
  }
  if (!dbUrl) throw new Error("DATABASE_URL not found in env or .env.local");
  const { neon } = await import("@neondatabase/serverless");
  return neon(dbUrl);
}

const configPath = path.join(__dirname, "..", "app", "data", "info.yaml");

async function main() {
  console.log("📖 Reading info.yaml...");
  const yamlText = readFileSync(configPath, "utf-8");
  const config = parse(yamlText);

  if (!config?.groups?.length) {
    console.error("❌ No groups found in info.yaml");
    process.exit(1);
  }

  const sql = await getSql();
  console.log(`🔌 Importing ${config.groups.length} groups...`);

  // Create tables
  await sql`
    CREATE TABLE IF NOT EXISTS people (
      id SERIAL PRIMARY KEY, github_id TEXT NOT NULL UNIQUE,
      real_name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS repos (
      id SERIAL PRIMARY KEY, github_repo TEXT NOT NULL UNIQUE,
      description TEXT, homepage_url TEXT, topics TEXT[] DEFAULT '{}',
      language TEXT, visibility TEXT NOT NULL DEFAULT 'unknown',
      archived BOOLEAN NOT NULL DEFAULT false, synced_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

  let reposCount = 0;
  let peopleCount = 0;

  for (const g of config.groups) {
    if (!g.github_repo) continue;
    const url = new URL(g.github_repo);
    const parts = url.pathname.split("/").filter(Boolean);
    const fullRepo = `${parts[0]}/${parts[1]}`;

    // Upsert repo
    await sql`INSERT INTO repos (github_repo) VALUES (${fullRepo}) ON CONFLICT (github_repo) DO NOTHING`;
    reposCount++;

    // Helper: upsert person
    const ensurePerson = async (name, githubId) => {
      if (!githubId) return -1;
      const [existing] = await sql`SELECT id FROM people WHERE github_id = ${githubId}`;
      if (existing) {
        await sql`UPDATE people SET real_name = ${name}, updated_at = NOW() WHERE id = ${existing.id}`;
        return existing.id;
      }
      const [row] = await sql`INSERT INTO people (github_id, real_name) VALUES (${githubId}, ${name}) RETURNING id`;
      peopleCount++;
      return row.id;
    };

    const mentorId = await ensurePerson(g.mentor.name, g.mentor.id);
    const assistantId = await ensurePerson(g.assistant.name, g.assistant.id);

    const [r] = await sql`SELECT id FROM repos WHERE github_repo = ${fullRepo}`;
    if (!r) continue;
    const repoId = r.id;

    // Assign roles
    if (mentorId > 0) {
      await sql`INSERT INTO repo_members (repo_id, person_id, role) VALUES (${repoId}, ${mentorId}, 'mentor') ON CONFLICT (repo_id, person_id) DO UPDATE SET role = 'mentor'`;
    }
    if (assistantId > 0) {
      await sql`INSERT INTO repo_members (repo_id, person_id, role) VALUES (${repoId}, ${assistantId}, 'assistant') ON CONFLICT (repo_id, person_id) DO UPDATE SET role = 'assistant'`;
    }
    for (const m of g.members ?? []) {
      const memberId = await ensurePerson(m.name, m.id);
      if (memberId > 0) {
        await sql`INSERT INTO repo_members (repo_id, person_id, role) VALUES (${repoId}, ${memberId}, 'member') ON CONFLICT (repo_id, person_id) DO UPDATE SET role = 'member'`;
      }
    }

    process.stdout.write(".");
  }

  const [pc] = await sql`SELECT COUNT(*)::int AS count FROM people`;
  const [rc] = await sql`SELECT COUNT(*)::int AS count FROM repos`;

  console.log(`\n✅ Import done: ${rc.count} repos, ${pc.count} people`);
}

main().catch((err) => {
  console.error("❌ Import failed:", err.message);
  process.exit(1);
});
