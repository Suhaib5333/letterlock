#!/usr/bin/env node
// LAUNCH_PLAN Phase 2.8: export every row from the Supabase project into one SQL
// file that `psql -1 -f` loads into our Postgres on the VPS. Uses only the service
// role key over REST (no DB password needed), preserves every UUID so all foreign
// keys survive, and is idempotent (ON CONFLICT DO NOTHING) so it can be re-run at
// cutover for the final delta.
//
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-supabase/export.mjs > migration.sql
//
// Users come from the Auth admin API (id, email, created_at, Google/Apple subs);
// the public tables are copied column-for-column (same names in schema.prisma).
import { writeFileSync } from 'node:fs';

const URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!URL || !KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(2);
}
const OUT = process.argv[2] || 'migration.sql';
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// table -> columns that exist in apps/api/prisma/schema.prisma (anything else is dropped)
const TABLES = {
  profiles: ['id', 'username', 'display_name', 'avatar_url', 'created_at', 'updated_at', 'role', 'banned_at', 'xp', 'level', 'prestige', 'total_xp', 'full_access', 'username_changed_at'],
  leaderboard: ['id', 'user_id', 'username', 'pack_id', 'score', 'moves', 'duration_ms', 'played_at'],
  friendships: ['user_low', 'user_high', 'status', 'action_by', 'created_at', 'updated_at'],
  question_progress: ['user_id', 'pack_id', 'served', 'updated_at'],
  saved_games: ['user_id', 'state', 'updated_at'],
  custom_packs: ['id', 'owner_id', 'name', 'description', 'emoji', 'difficulty', 'body', 'published', 'published_at', 'created_at', 'updated_at'],
  room_members: ['room_code', 'user_id', 'team', 'name', 'joined_at'],
  room_awards: ['room_code', 'game_key', 'awarded_at'],
};
const ARRAY_COLS = new Set(['served']);
const JSON_COLS = new Set(['state', 'body']);

async function getJson(path) {
  const res = await fetch(URL + path, { headers: HEADERS });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

async function fetchTable(table) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    let page;
    try {
      page = await getJson(`/rest/v1/${table}?select=*&limit=1000&offset=${offset}`);
    } catch (e) {
      if (offset === 0 && /HTTP 404/.test(String(e))) return rows; // table never existed
      throw e;
    }
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

async function fetchUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const data = await getJson(`/auth/v1/admin/users?page=${page}&per_page=1000`);
    const list = data.users || [];
    users.push(...list);
    if (list.length < 1000) break;
  }
  return users.map((u) => {
    const sub = (provider) => {
      const id = (u.identities || []).find((i) => i.provider === provider);
      return id ? id.identity_data?.sub || id.provider_id || id.id || null : null;
    };
    return { id: u.id, email: u.email ? u.email.toLowerCase() : null, google_sub: sub('google'), apple_sub: sub('apple'), created_at: u.created_at };
  });
}

function lit(v, col) {
  if (v === null || v === undefined) return 'NULL';
  if (ARRAY_COLS.has(col)) return `ARRAY[${(v || []).map((s) => lit(String(s))).join(',')}]::text[]`;
  if (JSON_COLS.has(col) || (typeof v === 'object')) return `${lit(JSON.stringify(v))}::jsonb`;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

function insert(table, cols, rows, conflict) {
  if (!rows.length) return `-- ${table}: 0 rows\n`;
  const values = rows.map((r) => `(${cols.map((c) => lit(r[c], c)).join(',')})`);
  const chunks = [];
  for (let i = 0; i < values.length; i += 500) {
    chunks.push(`insert into ${table} (${cols.join(',')}) values\n${values.slice(i, i + 500).join(',\n')}\non conflict ${conflict} do nothing;`);
  }
  return `-- ${table}: ${rows.length} rows\n${chunks.join('\n')}\n`;
}

const CONFLICT = {
  profiles: '(id)', leaderboard: '(id)', friendships: '(user_low, user_high)', question_progress: '(user_id, pack_id)',
  saved_games: '(user_id)', custom_packs: '(id)', room_members: '(room_code, user_id)', room_awards: '(room_code, game_key)',
};

const users = await fetchUsers();
const userIds = new Set(users.map((u) => u.id));
let sql = `-- Letterlock data migration from Supabase, generated ${new Date().toISOString()}\nbegin;\n`;
sql += insert('users', ['id', 'email', 'google_sub', 'apple_sub', 'created_at'], users, '(id)');
const counts = { users: users.length };
for (const [table, cols] of Object.entries(TABLES)) {
  let rows = await fetchTable(table);
  // Rows whose owner no longer exists in auth.users would violate the FK; drop them.
  const owner = table === 'profiles' ? 'id' : table === 'custom_packs' ? 'owner_id' : table === 'friendships' ? null : 'user_id';
  if (owner) rows = rows.filter((r) => userIds.has(r[owner]));
  if (table === 'friendships') rows = rows.filter((r) => userIds.has(r.user_low) && userIds.has(r.user_high));
  counts[table] = rows.length;
  sql += insert(table, cols, rows, CONFLICT[table]);
}
sql += 'commit;\n';
writeFileSync(OUT, sql);
console.error(JSON.stringify(counts));
console.error(`wrote ${OUT} (${(sql.length / 1024).toFixed(0)} KB)`);
