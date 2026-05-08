/**
 * Global LMG PM2 production sample.
 *
 * Copy this file outside the repo, adjust paths/domains, and keep real env files
 * outside git, for example under /etc/global-lmg/*.env.
 */
module.exports = {
  apps: [
    {
      name: 'global-lmg-client-api',
      cwd: '/srv/global-lmg/current/backend',
      script: 'dist/server.js',
      exec_mode: 'cluster',
      instances: 2,
      env: {
        APP_ENV: 'production',
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_file: '/etc/global-lmg/backend.env',
      max_memory_restart: '512M',
      time: true,
    },
    {
      name: 'global-lmg-admin-api',
      cwd: '/srv/global-lmg/current/admin_backend',
      script: 'dist/server.js',
      exec_mode: 'cluster',
      instances: 2,
      env: {
        APP_ENV: 'production',
        NODE_ENV: 'production',
        PORT: 3005,
      },
      env_file: '/etc/global-lmg/admin_backend.env',
      max_memory_restart: '512M',
      time: true,
    },
  ],
};
