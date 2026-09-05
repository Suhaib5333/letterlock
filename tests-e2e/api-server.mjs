// Boots the REAL Letterlock API (apps/api) for the Playwright suite.
//   1. creates the per-run database (DATABASE_URL, e.g. ll_e2e_3181) if missing,
//   2. applies the Prisma migrations to it,
//   3. compiles the API (nest build) and runs dist/main.js on API_PORT
// with the same dev-mode env as apps/api/test/env.ts: no RESEND key (OTP codes are
// captured and readable via GET /auth/otp/dev-code), throttling off, a QA token for
// DELETE /admin/users/:target cleanup. Invoked by playwright.config.ts `webServer`.
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(here, '..', 'apps', 'api');
const require = createRequire(resolve(apiDir, 'package.json'));
const { Client } = require('pg');

const port = process.env.API_PORT || '3173';
const webUrl = process.env.WEB_URL || 'http://localhost:4173';
const dbUrl = process.env.DATABASE_URL || `postgresql://postgres:ll@localhost:55432/ll_e2e_${port}`;

const env = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: port,
  DATABASE_URL: dbUrl,
  JWT_SECRET: 'e2e-jwt-secret-not-for-production',
  RESEND_API_KEY: '',
  THROTTLE_DISABLED: '1',
  REVENUECAT_WEBHOOK_SECRET: 'rc-e2e-secret',
  QA_ADMIN_TOKEN: 'qa-e2e-token',
  PUBLIC_URL: `http://localhost:${port}`,
  WEB_URL: webUrl,
  CORS_ORIGINS: webUrl,
  BUNDLES_DIR: resolve(apiDir, 'test', '.bundles'),
};

async function ensureDatabase() {
  const u = new URL(dbUrl);
  const name = u.pathname.slice(1);
  u.pathname = '/postgres';
  const client = new Client({ connectionString: u.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('select 1 from pg_database where datname = $1', [name]);
    if (rowCount === 0) {
      await client.query(`create database "${name.replace(/"/g, '')}"`);
      console.log(`[api-server] created database ${name}`);
    }
  } finally {
    await client.end();
  }
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: apiDir, env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`[api-server] ${cmd} ${args.join(' ')} failed (${r.status})`);
    process.exit(r.status ?? 1);
  }
}

await ensureDatabase();
run('npx', ['prisma', 'migrate', 'deploy']);
// `npx nest` cannot resolve the @nestjs/cli bin by its command name; call it directly.
run('node', [resolve(apiDir, 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js'), 'build']);

const child = spawn('node', ['dist/main.js'], { cwd: apiDir, env, stdio: 'inherit' });
const stop = () => child.kill();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
process.on('exit', stop);
child.on('exit', (code) => process.exit(code ?? 0));
