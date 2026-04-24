#!/usr/bin/env node

const config = {
  adminApiBase: process.env.ADMIN_API_BASE ?? 'http://127.0.0.1:3005/api/v1/admin',
  adminWebBase: process.env.ADMIN_WEB_BASE ?? 'http://127.0.0.1:5174',
  clientApiBase: process.env.CLIENT_API_BASE ?? 'http://127.0.0.1:3001/api/v1',
  clientWebBase: process.env.CLIENT_WEB_BASE ?? 'http://127.0.0.1:5173',
  csrfCookieName: process.env.CLIENT_CSRF_COOKIE_NAME ?? 'global_lmg_csrf',
  identifier: process.env.SMOKE_IDENTIFIER ?? 'arjun.m@example.com',
  password: process.env.SMOKE_PASSWORD ?? 'Preview@123',
};

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  capture(response) {
    const rawCookies =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : splitSetCookieHeader(response.headers.get('set-cookie'));

    for (const rawCookie of rawCookies) {
      const [pair] = rawCookie.split(';');

      if (!pair) {
        continue;
      }

      const separatorIndex = pair.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const name = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();

      if (!name) {
        continue;
      }

      if (!value) {
        this.cookies.delete(name);
        continue;
      }

      this.cookies.set(name, value);
    }
  }

  get(name) {
    return this.cookies.get(name);
  }

  header() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

const splitSetCookieHeader = (headerValue) => {
  if (!headerValue) {
    return [];
  }

  return headerValue.split(/,(?=[^;,\s]+=)/g);
};

const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const summarizeValue = (value) => {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return `array(${value.length})`;
  }

  if (typeof value === 'object') {
    return `keys(${Object.keys(value).slice(0, 8).join(', ')})`;
  }

  return String(value);
};

const readBody = async (response) => {
  const text = await response.text();

  if (!text) {
    return { parsed: null, text: '' };
  }

  try {
    return { parsed: JSON.parse(text), text };
  } catch {
    return { parsed: text, text };
  }
};

const request = async ({
  body,
  headers = {},
  jar,
  method = 'GET',
  url,
}) => {
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has('content-type')) {
    requestHeaders.set('content-type', 'application/json');
  }

  const cookieHeader = jar?.header();
  if (cookieHeader) {
    requestHeaders.set('cookie', cookieHeader);
  }

  const response = await fetch(url, {
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: requestHeaders,
    method,
    redirect: 'manual',
  });

  jar?.capture(response);

  const payload = await readBody(response);

  if (!response.ok) {
    throw new Error(
      `${method} ${url} failed with ${response.status}: ${truncate(payload.text || '<empty>', 240)}`
    );
  }

  return {
    data: payload.parsed,
    response,
    text: payload.text,
  };
};

const truncate = (value, length) =>
  value.length > length ? `${value.slice(0, length - 3)}...` : value;

const results = [];

const runStep = async (name, callback) => {
  try {
    const detail = await callback();
    results.push({ detail, name, ok: true });
    console.log(`PASS ${name}${detail ? ` - ${detail}` : ''}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ detail, name, ok: false });
    console.error(`FAIL ${name} - ${detail}`);
  }
};

const clientJar = new CookieJar();
const adminJar = new CookieJar();

let firstClientId = null;
let firstMatterId = null;

await runStep('Client Frontend Root', async () => {
  const { response, text } = await request({ url: config.clientWebBase });
  ensure(response.status === 200, `expected 200, received ${response.status}`);
  ensure(text.includes('id="root"'), 'client frontend root container missing');
  return config.clientWebBase;
});

await runStep('Admin Frontend Root', async () => {
  const { response, text } = await request({ url: config.adminWebBase });
  ensure(response.status === 200, `expected 200, received ${response.status}`);
  ensure(text.includes('id="root"'), 'admin frontend root container missing');
  return config.adminWebBase;
});

await runStep('Client API Health', async () => {
  const { data } = await request({ url: `${config.clientApiBase}/health` });
  ensure(typeof data === 'object' && data !== null, 'client health payload is not an object');
  return summarizeValue(data);
});

await runStep('Admin API Health', async () => {
  const { data } = await request({ url: `${config.adminApiBase}/health` });
  ensure(typeof data === 'object' && data !== null, 'admin health payload is not an object');
  return summarizeValue(data);
});

await runStep('Client Session Bootstrap', async () => {
  const { data } = await request({
    jar: clientJar,
    url: `${config.clientApiBase}/auth/session`,
  });
  ensure(typeof data === 'object' && data !== null, 'client session payload is not an object');
  ensure(clientJar.get(config.csrfCookieName), `missing ${config.csrfCookieName} cookie`);
  return `authenticated=${Boolean(data.authenticated)}`;
});

await runStep('Client Sign-In', async () => {
  const csrfToken = clientJar.get(config.csrfCookieName);
  ensure(csrfToken, `missing ${config.csrfCookieName} cookie before sign-in`);

  const { data } = await request({
    body: {
      identifier: config.identifier,
      password: config.password,
      rememberMe: false,
    },
    headers: {
      'x-csrf-token': csrfToken,
    },
    jar: clientJar,
    method: 'POST',
    url: `${config.clientApiBase}/auth/sign-in`,
  });

  ensure(data?.status === 'authenticated', 'client sign-in did not return authenticated status');
  ensure(data?.user?.email === config.identifier, 'client sign-in returned an unexpected user');
  return data.user.email;
});

await runStep('Client Dashboard Snapshot', async () => {
  const { data } = await request({
    jar: clientJar,
    url: `${config.clientApiBase}/dashboard`,
  });
  ensure(data?.currentClient?.email === config.identifier, 'dashboard currentClient mismatch');
  ensure(Array.isArray(data?.matters), 'dashboard matters is not an array');
  ensure(Array.isArray(data?.invoices), 'dashboard invoices is not an array');
  ensure(Array.isArray(data?.messages), 'dashboard messages is not an array');
  ensure(Array.isArray(data?.packages), 'dashboard packages is not an array');
  return `matters=${data.matters.length}, invoices=${data.invoices.length}, packages=${data.packages.length}`;
});

await runStep('Admin Sign-In', async () => {
  const { data } = await request({
    body: {
      identifier: config.identifier,
      password: config.password,
      rememberMe: false,
    },
    jar: adminJar,
    method: 'POST',
    url: `${config.adminApiBase}/auth/sign-in`,
  });

  ensure(data?.authenticated === true, 'admin sign-in did not return authenticated=true');
  ensure(data?.user?.email === config.identifier, 'admin sign-in returned an unexpected user');
  ensure(
    Array.isArray(data?.user?.roleCodes) && data.user.roleCodes.includes('ops_admin'),
    'admin sign-in did not yield ops_admin access'
  );
  return data.user.email;
});

await runStep('Admin Dashboard Workspace', async () => {
  const { data } = await request({
    jar: adminJar,
    url: `${config.adminApiBase}/dashboard`,
  });
  ensure(typeof data?.metrics?.openMatters === 'number', 'dashboard openMatters metric missing');
  ensure(Array.isArray(data?.recentAudit), 'dashboard recentAudit is not an array');
  ensure(Array.isArray(data?.recentNotifications), 'dashboard recentNotifications is not an array');
  return `openMatters=${data.metrics.openMatters}, pendingInvoices=${data.metrics.pendingInvoices}`;
});

await runStep('Admin Clients List', async () => {
  const { data } = await request({
    jar: adminJar,
    url: `${config.adminApiBase}/clients?limit=3`,
  });
  ensure(Array.isArray(data?.clients), 'clients list payload is missing clients[]');
  ensure(data.clients.length > 0, 'clients list returned no clients');
  firstClientId = data.clients[0].id;
  return `clients=${data.clients.length}`;
});

await runStep('Admin Client Detail Workspace', async () => {
  ensure(firstClientId, 'no client id available from clients list');
  const { data } = await request({
    jar: adminJar,
    url: `${config.adminApiBase}/clients/${firstClientId}`,
  });
  ensure(data?.client?.id === firstClientId, 'client detail did not return the requested client');
  ensure(Array.isArray(data?.matters), 'client detail matters is not an array');
  ensure(Array.isArray(data?.invoices), 'client detail invoices is not an array');
  return `matters=${data.matters.length}, invoices=${data.invoices.length}`;
});

await runStep('Admin Matters List', async () => {
  const { data } = await request({
    jar: adminJar,
    url: `${config.adminApiBase}/matters?limit=3`,
  });
  ensure(Array.isArray(data?.matters), 'matters list payload is missing matters[]');
  ensure(data.matters.length > 0, 'matters list returned no matters');
  firstMatterId = data.matters[0].id;
  return `matters=${data.matters.length}`;
});

await runStep('Admin Matter Detail Workspace', async () => {
  ensure(firstMatterId, 'no matter id available from matters list');
  const { data } = await request({
    jar: adminJar,
    url: `${config.adminApiBase}/matters/${firstMatterId}`,
  });
  ensure(data?.matter?.id === firstMatterId, 'matter detail did not return the requested matter');
  ensure(Array.isArray(data?.threads), 'matter detail threads is not an array');
  ensure(Array.isArray(data?.events), 'matter detail events is not an array');
  ensure(Array.isArray(data?.invoices), 'matter detail invoices is not an array');
  ensure(typeof data?.assignmentOptions === 'object' && data.assignmentOptions !== null, 'assignmentOptions missing');
  return `threads=${data.threads.length}, events=${data.events.length}, invoices=${data.invoices.length}`;
});

await runStep('Admin Billing Workspace', async () => {
  const { data } = await request({
    jar: adminJar,
    url: `${config.adminApiBase}/billing/workspace`,
  });
  ensure(Array.isArray(data?.invoices), 'billing workspace invoices is not an array');
  ensure(Array.isArray(data?.payments), 'billing workspace payments is not an array');
  ensure(Array.isArray(data?.refunds), 'billing workspace refunds is not an array');
  return `invoices=${data.invoices.length}, payments=${data.payments.length}, refunds=${data.refunds.length}`;
});

await runStep('Admin Messages Workspace', async () => {
  const { data } = await request({
    jar: adminJar,
    url: `${config.adminApiBase}/messages/workspace`,
  });
  ensure(Array.isArray(data?.threads), 'messages workspace threads is not an array');
  ensure(Array.isArray(data?.messages), 'messages workspace messages is not an array');
  return `threads=${data.threads.length}, messages=${data.messages.length}`;
});

await runStep('Admin Events Workspace', async () => {
  const { data } = await request({
    jar: adminJar,
    url: `${config.adminApiBase}/events`,
  });
  ensure(Array.isArray(data?.events), 'events workspace events is not an array');
  return `events=${data.events.length}`;
});

await runStep('Admin Notifications Feed', async () => {
  const { data } = await request({
    jar: adminJar,
    url: `${config.adminApiBase}/notifications?limit=5`,
  });
  ensure(Array.isArray(data?.notifications), 'notifications payload is missing notifications[]');
  return `notifications=${data.notifications.length}`;
});

await runStep('Admin Audit Feed', async () => {
  const { data } = await request({
    jar: adminJar,
    url: `${config.adminApiBase}/audit?limit=5`,
  });
  ensure(Array.isArray(data?.entries), 'audit payload is missing entries[]');
  return `entries=${data.entries.length}`;
});

const passed = results.filter((result) => result.ok).length;
const failed = results.length - passed;

console.log(`\nPhase 10 smoke summary: ${passed}/${results.length} passed, ${failed} failed.`);

if (failed > 0) {
  process.exitCode = 1;
}
