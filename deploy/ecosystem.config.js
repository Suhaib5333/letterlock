// PM2 process list for Letterlock on the shared VPS (LAUNCH_PLAN §2c).
// deploy/deploy.sh runs `pm2 startOrReload deploy/ecosystem.config.js --only <name>`
// from the release directory. The API reads its secrets from `.env` in its cwd
// (dotenv/config in main.ts); in production it binds 127.0.0.1 and Traefik is
// the only client. The web SPA is served by pm2's built-in static server.
const prod = '/opt/letterlock';
const dev = '/opt/letterlock-dev';

// Traefik is a container and addresses every tenant on this box as
// `host.docker.internal:<port>`, which resolves to the docker0 bridge gateway.
// The API binds here rather than to 127.0.0.1 (which Traefik cannot reach, giving
// 502s while PM2 reports the process online) and rather than to 0.0.0.0 (which
// would put it on the public interface). Same pattern the babydetails services on
// this box already use. Override with API_HOST if the bridge ever changes.
const DOCKER_BRIDGE = process.env.API_HOST || '172.17.0.1';

module.exports = {
  apps: [
    {
      name: 'letterlock-api',
      script: 'dist/main.js',
      cwd: `${prod}/current/api`,
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production', PORT: 3100, API_HOST: DOCKER_BRIDGE },
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
      env: { NODE_ENV: 'production', PORT: 3101, API_HOST: DOCKER_BRIDGE },
    },
    {
      name: 'letterlock-web-dev',
      script: 'serve',
      cwd: `${dev}/current`,
      env: { PM2_SERVE_PATH: `${dev}/current/web`, PM2_SERVE_PORT: 5191, PM2_SERVE_SPA: 'true', PM2_SERVE_HOMEPAGE: '/index.html' },
    },
  ],
};
