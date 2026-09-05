// Runs before every spec file. Defaults target the local Docker Postgres from the
// README (docker run ... -p 55432:5432 postgres:16); CI overrides DATABASE_URL.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://postgres:ll@localhost:55432/postgres';
process.env.JWT_SECRET = 'e2e-jwt-secret-not-for-production';
process.env.RESEND_API_KEY = ''; // dev mode: codes are captured, never emailed
process.env.THROTTLE_DISABLED = '1';
process.env.REVENUECAT_WEBHOOK_SECRET = 'rc-e2e-secret';
process.env.QA_ADMIN_TOKEN = 'qa-e2e-token';
process.env.PUBLIC_URL = 'http://localhost:3100';
process.env.WEB_URL = 'http://localhost:5173';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.BUNDLES_DIR = './test/.bundles';
