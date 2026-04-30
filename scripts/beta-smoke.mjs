import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_CLIENT_WEB_URL = 'http://127.0.0.1:5173';
const DEFAULT_ADMIN_WEB_URL = 'http://127.0.0.1:5174';
const DEFAULT_CLIENT_API_URL = 'http://127.0.0.1:3001/api/v1';
const DEFAULT_ADMIN_API_URL = 'http://127.0.0.1:3005/api/v1/admin';

const repoRoot = process.cwd();
const results = [];
const showHelp = process.argv.includes('--help') || process.argv.includes('-h');

const readEnvFile = (filePath) => {
  if (!existsSync(filePath)) {
    return {};
  }

  const entries = {};
  const content = readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }

    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
};

const loadSmokeEnv = () => {
  const defaults = ['backend/.env', 'admin_backend/.env'];
  const files = (process.env.BETA_SMOKE_ENV_FILES || defaults.join(','))
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const merged = {};

  for (const file of files) {
    Object.assign(merged, readEnvFile(path.resolve(repoRoot, file)));
  }

  return {
    ...merged,
    ...process.env,
  };
};

const env = loadSmokeEnv();
const backendEnv = readEnvFile(path.resolve(repoRoot, 'backend/.env'));
const adminBackendEnv = readEnvFile(path.resolve(repoRoot, 'admin_backend/.env'));

const config = {
  adminApiBase: env.BETA_SMOKE_ADMIN_API_BASE || env.ADMIN_API_BASE || DEFAULT_ADMIN_API_URL,
  adminWebBase: env.BETA_SMOKE_ADMIN_WEB_BASE || env.ADMIN_WEB_BASE || DEFAULT_ADMIN_WEB_URL,
  clientApiBase: env.BETA_SMOKE_CLIENT_API_BASE || env.CLIENT_API_BASE || DEFAULT_CLIENT_API_URL,
  clientWebBase: env.BETA_SMOKE_CLIENT_WEB_BASE || env.CLIENT_WEB_BASE || DEFAULT_CLIENT_WEB_URL,
  adminEmail: env.BETA_SMOKE_ADMIN_EMAIL || adminBackendEnv.ADMIN_BOOTSTRAP_EMAIL || '',
  adminPassword: env.BETA_SMOKE_ADMIN_PASSWORD || adminBackendEnv.ADMIN_BOOTSTRAP_PASSWORD || '',
  adminSessionCookieName:
    env.BETA_SMOKE_ADMIN_SESSION_COOKIE_NAME ||
    adminBackendEnv.SESSION_COOKIE_NAME ||
    'global_lmg_admin_session',
  adminCsrfCookieName:
    env.BETA_SMOKE_ADMIN_CSRF_COOKIE_NAME ||
    adminBackendEnv.CSRF_COOKIE_NAME ||
    'global_lmg_admin_csrf',
  clientEmail: env.BETA_SMOKE_CLIENT_EMAIL || backendEnv.PREVIEW_ACCOUNT_EMAIL || '',
  clientPassword: env.BETA_SMOKE_CLIENT_PASSWORD || backendEnv.PREVIEW_ACCOUNT_PASSWORD || '',
  clientSessionCookieName:
    env.BETA_SMOKE_CLIENT_SESSION_COOKIE_NAME ||
    backendEnv.SESSION_COOKIE_NAME ||
    'global_lmg_session',
  clientCsrfCookieName:
    env.BETA_SMOKE_CLIENT_CSRF_COOKIE_NAME ||
    backendEnv.CSRF_COOKIE_NAME ||
    'global_lmg_csrf',
  mutate: env.BETA_SMOKE_MUTATE === 'true',
};

if (showHelp) {
  console.log(`Global LMG beta smoke

Usage:
  npm run smoke:beta
  node scripts/beta-smoke.mjs

Default mode is read-only. The script checks web shells, health endpoints, auth, protected routes, CSRF rejection, and core admin/client read paths.

Optional environment overrides:
  BETA_SMOKE_CLIENT_WEB_BASE     default http://127.0.0.1:5173
  BETA_SMOKE_ADMIN_WEB_BASE      default http://127.0.0.1:5174
  BETA_SMOKE_CLIENT_API_BASE     default http://127.0.0.1:3001/api/v1
  BETA_SMOKE_ADMIN_API_BASE      default http://127.0.0.1:3005/api/v1/admin
  BETA_SMOKE_ADMIN_EMAIL         fallback admin_backend/.env ADMIN_BOOTSTRAP_EMAIL
  BETA_SMOKE_ADMIN_PASSWORD      fallback admin_backend/.env ADMIN_BOOTSTRAP_PASSWORD
  BETA_SMOKE_CLIENT_EMAIL        fallback backend/.env PREVIEW_ACCOUNT_EMAIL
  BETA_SMOKE_CLIENT_PASSWORD     fallback backend/.env PREVIEW_ACCOUNT_PASSWORD
  BETA_SMOKE_MUTATE=true         reserved for future disposable fixture smoke

Passwords are never printed.`);
  process.exit(0);
}

const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const splitSetCookie = (header) => {
  if (!header) {
    return [];
  }

  return header.split(/,(?=\s*[^;,\s]+=)/g).map((entry) => entry.trim());
};

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  get(name) {
    return this.cookies.get(name);
  }

  setFromResponse(response) {
    const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
    const headers = getSetCookie ? getSetCookie() : splitSetCookie(response.headers.get('set-cookie'));

    for (const header of headers) {
      const firstPart = header.split(';')[0];
      const index = firstPart.indexOf('=');

      if (index <= 0) {
        continue;
      }

      const name = firstPart.slice(0, index).trim();
      const value = firstPart.slice(index + 1).trim();

      if (!value || /max-age=0/i.test(header)) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  header(options = {}) {
    const exclude = new Set(options.exclude || []);
    const pairs = [];

    for (const [name, value] of this.cookies.entries()) {
      if (!exclude.has(name)) {
        pairs.push(`${name}=${value}`);
      }
    }

    return pairs.join('; ');
  }
}

const request = async (
  url,
  {
    body,
    csrfCookieName,
    excludeCookies = [],
    headers = {},
    jar,
    method = 'GET',
    useCsrf = true,
  } = {}
) => {
  const normalizedMethod = method.toUpperCase();
  const requestHeaders = {
    accept: 'application/json, text/html;q=0.9,*/*;q=0.8',
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders['content-type'] = 'application/json';
  }

  if (jar) {
    const cookieHeader = jar.header({ exclude: excludeCookies });
    if (cookieHeader) {
      requestHeaders.cookie = cookieHeader;
    }

    if (
      useCsrf &&
      csrfCookieName &&
      !['GET', 'HEAD', 'OPTIONS'].includes(normalizedMethod)
    ) {
      const csrfToken = jar.get(csrfCookieName);
      if (csrfToken) {
        requestHeaders['x-csrf-token'] = csrfToken;
      }
    }
  }

  const response = await fetch(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: requestHeaders,
    method: normalizedMethod,
    redirect: 'manual',
  });

  jar?.setFromResponse(response);

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  let data = null;

  if (contentType.includes('application/json') && text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  return { contentType, data, response, text };
};

const test = async (name, callback) => {
  try {
    await callback();
    results.push({ name, status: 'passed' });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({
      error: error instanceof Error ? error.message : String(error),
      name,
      status: 'failed',
    });
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const skip = (name, reason) => {
  results.push({ name, reason, status: 'skipped' });
  console.log(`SKIP ${name}: ${reason}`);
};

const expectStatus = (result, allowedStatuses) => {
  ensure(
    allowedStatuses.includes(result.response.status),
    `expected ${allowedStatuses.join('/')} received ${result.response.status}`
  );
};

const expectHtmlShell = (result) => {
  expectStatus(result, [200]);
  ensure(result.contentType.includes('text/html'), `expected html response, received ${result.contentType}`);
  ensure(
    result.text.includes('<!doctype html') || result.text.includes('<!DOCTYPE html'),
    'missing HTML shell'
  );
};

await test('client web root renders', async () => {
  expectHtmlShell(await request(`${config.clientWebBase}/`));
});

await test('admin web login renders', async () => {
  expectHtmlShell(await request(`${config.adminWebBase}/login`));
});

await test('backend ready health', async () => {
  const result = await request(`${config.clientApiBase}/health/ready`);
  expectStatus(result, [200]);
  ensure(result.data?.status === 'ok', `expected status ok, received ${result.data?.status ?? 'unknown'}`);
  ensure(result.data?.checks?.mysql?.ready === true, 'backend mysql readiness is not true');
});

await test('admin backend ready health', async () => {
  const result = await request(`${config.adminApiBase}/health/ready`);
  expectStatus(result, [200]);
  ensure(result.data?.status === 'ok', `expected status ok, received ${result.data?.status ?? 'unknown'}`);
  ensure(result.data?.checks?.mysql?.ready === true, 'admin mysql readiness is not true');
});

await test('admin protected route rejects unauthenticated access', async () => {
  expectStatus(await request(`${config.adminApiBase}/reports/workspace`), [401]);
});

await test('reports export rejects unauthenticated access', async () => {
  expectStatus(await request(`${config.adminApiBase}/reports/drilldowns/failed-reminders/export.csv`), [401]);
});

await test('client dashboard rejects unauthenticated access', async () => {
  expectStatus(await request(`${config.clientApiBase}/dashboard`), [401]);
});

let adminJar = null;

if (!config.adminEmail || !config.adminPassword) {
  skip(
    'admin authenticated workspace smoke',
    'set BETA_SMOKE_ADMIN_EMAIL and BETA_SMOKE_ADMIN_PASSWORD, or provide ADMIN_BOOTSTRAP_EMAIL/PASSWORD in admin_backend/.env'
  );
} else {
  adminJar = new CookieJar();

  await test('admin login and session', async () => {
    expectStatus(await request(`${config.adminApiBase}/auth/session`, { jar: adminJar }), [200]);

    const signIn = await request(`${config.adminApiBase}/auth/sign-in`, {
      body: {
        identifier: config.adminEmail,
        password: config.adminPassword,
        rememberMe: false,
      },
      csrfCookieName: config.adminCsrfCookieName,
      jar: adminJar,
      method: 'POST',
    });
    expectStatus(signIn, [200]);

    const session = await request(`${config.adminApiBase}/auth/session`, { jar: adminJar });
    expectStatus(session, [200]);
    ensure(session.data?.authenticated === true, 'admin session is not authenticated');
    ensure(session.data?.user?.email, 'admin session user is missing');
    ensure(
      session.data?.user?.mustRotatePassword !== true,
      'admin password rotation is still required; complete rotation or set BETA_SMOKE_ADMIN_PASSWORD to the rotated password'
    );
  });

  const adminWorkspaceChecks = [
    ['admin dashboard loads', '/dashboard'],
    ['admin reports workspace loads', '/reports/workspace'],
    ['admin reminders workspace loads', '/reminders/workspace'],
    ['admin requests workspace loads', '/requests/workspace'],
    ['admin billing workspace loads', '/billing/workspace'],
    ['admin documents workspace loads', '/documents'],
    ['admin messages workspace loads', '/messages/workspace'],
    ['admin events workspace loads', '/events'],
  ];

  for (const [name, route] of adminWorkspaceChecks) {
    await test(name, async () => {
      const result = await request(`${config.adminApiBase}${route}`, { jar: adminJar });
      expectStatus(result, [200]);
      ensure(result.data && typeof result.data === 'object', 'expected JSON object response');
    });
  }

  await test('admin CSRF required for mutations', async () => {
    const result = await request(`${config.adminApiBase}/notifications/not-a-real-id/read`, {
      excludeCookies: [config.adminCsrfCookieName],
      jar: adminJar,
      method: 'POST',
      useCsrf: false,
    });
    expectStatus(result, [403]);
  });
}

let clientJar = null;

if (!config.clientEmail || !config.clientPassword) {
  skip(
    'client authenticated dashboard smoke',
    'set BETA_SMOKE_CLIENT_EMAIL and BETA_SMOKE_CLIENT_PASSWORD, or provide PREVIEW_ACCOUNT_EMAIL/PASSWORD in backend/.env'
  );
} else {
  clientJar = new CookieJar();

  await test('client login and dashboard', async () => {
    expectStatus(await request(`${config.clientApiBase}/auth/session`, { jar: clientJar }), [200]);

    const signIn = await request(`${config.clientApiBase}/auth/sign-in`, {
      body: {
        identifier: config.clientEmail,
        password: config.clientPassword,
        rememberMe: false,
      },
      csrfCookieName: config.clientCsrfCookieName,
      jar: clientJar,
      method: 'POST',
    });
    expectStatus(signIn, [200]);

    const session = await request(`${config.clientApiBase}/auth/session`, { jar: clientJar });
    expectStatus(session, [200]);
    ensure(session.data?.authenticated === true, 'client session is not authenticated');

    const dashboard = await request(`${config.clientApiBase}/dashboard`, { jar: clientJar });
    expectStatus(dashboard, [200]);
    ensure(dashboard.data && typeof dashboard.data === 'object', 'expected client dashboard JSON');
  });

  await test('client CSRF required for mutations', async () => {
    const result = await request(`${config.clientApiBase}/notifications/not-a-real-id/read`, {
      excludeCookies: [config.clientCsrfCookieName],
      jar: clientJar,
      method: 'POST',
      useCsrf: false,
    });
    expectStatus(result, [403]);
  });
}

if (config.mutate) {
  skip(
    'mutation smoke',
    'BETA_SMOKE_MUTATE=true was provided, but this script intentionally keeps mutation journeys in the manual checklist until disposable fixture cleanup is automated'
  );
}

const failed = results.filter((result) => result.status === 'failed');
const skipped = results.filter((result) => result.status === 'skipped');
console.log(
  `\nBeta smoke summary: ${results.length - failed.length - skipped.length}/${results.length} passed, ${skipped.length} skipped.`
);

if (failed.length > 0) {
  process.exitCode = 1;
}
