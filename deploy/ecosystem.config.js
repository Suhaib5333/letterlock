// PM2 process list for Letterlock on the shared VPS (LAUNCH_PLAN §2c).
// deploy/deploy.sh runs `pm2 startOrReload deploy/ecosystem.config.js --only <name>`
// from the release directory. The API reads its secrets from `.env` in its cwd
// (dotenv/config in main.ts); in production it binds 127.0.0.1 and Traefik is
// the only client. The web SPA is served by pm2's built-in static server.
const prod = '/opt/letterlock';
const dev = '/opt/letterlock-dev';

module.exports = {
  apps: [
    {
      name: 'letterlock-api',
      script: 'dist/main.js',
      cwd: `${prod}/current/api`,
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production', PORT: 3100 },
    },
    {
      name: 'letterlock-web',
      script: 'serve',
      cwd: `${prod}/current`,
      env: { PM2_SERVE_PATH: `${prod}/current/web`, PM2_SERVE_PORT: 5190, PM2_SERVE_SPA: 'true', PM2_SERVE_HOMEPAGE: '/index.html' },
    },
    {
      name: 'letterlock-api-dev',
      script: 'dist/main.js',
      cwd: `${dev}/current/api`,
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production', PORT: 3101 },
    },
    {
      name: 'letterlock-web-dev',
      script: 'serve',
      cwd: `${dev}/current`,
      env: { PM2_SERVE_PATH: `${dev}/current/web`, PM2_SERVE_PORT: 5191, PM2_SERVE_SPA: 'true', PM2_SERVE_HOMEPAGE: '/index.html' },
    },
  ],
};
