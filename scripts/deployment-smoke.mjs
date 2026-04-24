const DEFAULT_CLIENT_WEB_URL = 'http://127.0.0.1:5173';
const DEFAULT_ADMIN_WEB_URL = 'http://127.0.0.1:5174';
const DEFAULT_CLIENT_API_URL = 'http://127.0.0.1:3001/api/v1';
const DEFAULT_ADMIN_API_URL = 'http://127.0.0.1:3005/api/v1/admin';

const config = {
  adminApiBase: process.env.ADMIN_API_BASE || DEFAULT_ADMIN_API_URL,
  adminWebBase: process.env.ADMIN_WEB_BASE || DEFAULT_ADMIN_WEB_URL,
  clientApiBase: process.env.CLIENT_API_BASE || DEFAULT_CLIENT_API_URL,
  clientWebBase: process.env.CLIENT_WEB_BASE || DEFAULT_CLIENT_WEB_URL,
};

const results = [];

const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const request = async (url) => {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json, text/html;q=0.9,*/*;q=0.8',
    },
    redirect: 'manual',
  });

  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();

  let data = null;
  if (contentType.includes('application/json')) {
    try {
      data = JSON.parse(body);
    } catch {
      data = null;
    }
  }

  return {
    body,
    contentType,
    data,
    response,
  };
};

const test = async (name, callback) => {
  try {
    await callback();
    results.push({ name, status: 'passed' });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({
      name,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

await test('client web root', async () => {
  const { body, contentType, response } = await request(`${config.clientWebBase}/`);
  ensure(response.ok, `expected 2xx, received ${response.status}`);
  ensure(contentType.includes('text/html'), `expected html response, received ${contentType}`);
  ensure(body.includes('<!doctype html') || body.includes('<!DOCTYPE html'), 'missing HTML shell');
});

await test('admin web login', async () => {
  const { body, contentType, response } = await request(`${config.adminWebBase}/login`);
  ensure(response.ok, `expected 2xx, received ${response.status}`);
  ensure(contentType.includes('text/html'), `expected html response, received ${contentType}`);
  ensure(body.includes('<!doctype html') || body.includes('<!DOCTYPE html'), 'missing HTML shell');
});

await test('client api live health', async () => {
  const { data, response } = await request(`${config.clientApiBase}/health/live`);
  ensure(response.ok, `expected 2xx, received ${response.status}`);
  ensure(data?.status === 'ok', `expected status ok, received ${data?.status ?? 'unknown'}`);
});

await test('client api ready health', async () => {
  const { data, response } = await request(`${config.clientApiBase}/health/ready`);
  ensure(response.ok, `expected 2xx, received ${response.status}`);
  ensure(data?.status === 'ok', `expected status ok, received ${data?.status ?? 'unknown'}`);
  ensure(data?.checks?.mysql?.ready === true, 'client mysql readiness is not true');
});

await test('admin api live health', async () => {
  const { data, response } = await request(`${config.adminApiBase}/health/live`);
  ensure(response.ok, `expected 2xx, received ${response.status}`);
  ensure(data?.status === 'ok', `expected status ok, received ${data?.status ?? 'unknown'}`);
});

await test('admin api ready health', async () => {
  const { data, response } = await request(`${config.adminApiBase}/health/ready`);
  ensure(response.ok, `expected 2xx, received ${response.status}`);
  ensure(data?.status === 'ok', `expected status ok, received ${data?.status ?? 'unknown'}`);
  ensure(data?.checks?.mysql?.ready === true, 'admin mysql readiness is not true');
  ensure(data?.checks?.schema?.ready === true, 'admin schema readiness is not true');
});

const failed = results.filter((result) => result.status === 'failed');
console.log(`\nDeployment smoke summary: ${results.length - failed.length}/${results.length} passed.`);

if (failed.length > 0) {
  process.exitCode = 1;
}
