#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const envSpecs = [
  {
    name: 'backend',
    file: 'backend/.env.production',
    exampleFile: 'backend/.env.production.example',
    requiredKeys: [
      'APP_ENV',
      'PUBLIC_WEB_ORIGIN',
      'AUTH_SESSION_SECRET',
      'MYSQL_HOST',
      'MYSQL_PORT',
      'MYSQL_DATABASE',
      'MYSQL_USER',
      'MYSQL_PASSWORD',
      'DOCUMENT_STORAGE_ROOT',
    ],
  },
  {
    name: 'admin_backend',
    file: 'admin_backend/.env.production',
    exampleFile: 'admin_backend/.env.production.example',
    requiredKeys: [
      'APP_ENV',
      'PUBLIC_ADMIN_WEB_ORIGIN',
      'AUTH_SESSION_SECRET',
      'MYSQL_HOST',
      'MYSQL_PORT',
      'MYSQL_DATABASE',
      'MYSQL_USER',
      'MYSQL_PASSWORD',
    ],
  },
  {
    name: 'frontend',
    file: 'frontend/.env.production',
    exampleFile: 'frontend/.env.production.example',
    requiredKeys: ['VITE_PUBLIC_SITE_URL', 'VITE_API_BASE_URL', 'VITE_PORTAL_MODE'],
  },
  {
    name: 'admin_frontend',
    file: 'admin_frontend/.env.production',
    exampleFile: 'admin_frontend/.env.production.example',
    requiredKeys: ['VITE_API_BASE_URL'],
  },
];

const placeholderPatterns = [
  /replace-me/i,
  /replace-with-/i,
  /change-me/i,
  /change-this/i,
];

const parseEnvFile = (content) => {
  const entries = new Map();

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries.set(key, value);
  }

  return entries;
};

const readEnvSpec = (spec) => {
  const filePath = path.join(rootDir, spec.file);
  const examplePath = path.join(rootDir, spec.exampleFile);

  if (fs.existsSync(filePath)) {
    return {
      exists: true,
      fromExample: false,
      path: filePath,
      values: parseEnvFile(fs.readFileSync(filePath, 'utf8')),
    };
  }

  return {
    exists: false,
    fromExample: true,
    path: examplePath,
    values: parseEnvFile(fs.readFileSync(examplePath, 'utf8')),
  };
};

const isHttpsOrigin = (value) => typeof value === 'string' && value.startsWith('https://');
const isRelativeApiBase = (value) => value === '/api';
const isPlaceholderValue = (value) =>
  typeof value === 'string' && placeholderPatterns.some((pattern) => pattern.test(value));

const results = [];
let hasError = false;

const pushResult = (status, scope, message) => {
  results.push({ message, scope, status });
  if (status === 'error') {
    hasError = true;
  }
};

const envData = new Map();

for (const spec of envSpecs) {
  const data = readEnvSpec(spec);
  envData.set(spec.name, data);

  if (!data.exists) {
    pushResult(
      'warn',
      spec.name,
      `${spec.file} does not exist yet; validating fallback example ${spec.exampleFile}.`
    );
  }

  for (const key of spec.requiredKeys) {
    const value = data.values.get(key);
    if (!value) {
      pushResult('error', spec.name, `Missing required key ${key}.`);
      continue;
    }

    if (isPlaceholderValue(value)) {
      pushResult('error', spec.name, `${key} still contains a placeholder value.`);
    }
  }
}

const backendEnv = envData.get('backend')?.values;
const adminBackendEnv = envData.get('admin_backend')?.values;
const frontendEnv = envData.get('frontend')?.values;
const adminFrontendEnv = envData.get('admin_frontend')?.values;

if (backendEnv) {
  if (backendEnv.get('APP_ENV') !== 'production') {
    pushResult('error', 'backend', 'APP_ENV must be production.');
  }

  if (!isHttpsOrigin(backendEnv.get('PUBLIC_WEB_ORIGIN'))) {
    pushResult('error', 'backend', 'PUBLIC_WEB_ORIGIN must use https://.');
  }

  if ((backendEnv.get('AUTH_SESSION_SECRET') || '').length < 32) {
    pushResult('error', 'backend', 'AUTH_SESSION_SECRET must be at least 32 characters.');
  }

  if (backendEnv.get('DOCUMENT_STORAGE_ROOT') === 'var/uploads') {
    pushResult('warn', 'backend', 'DOCUMENT_STORAGE_ROOT is still using the local development path.');
  }

  const mysqlHost = backendEnv.get('MYSQL_HOST');
  if (mysqlHost === '127.0.0.1' || mysqlHost === 'localhost') {
    pushResult('warn', 'backend', 'MYSQL_HOST is still pointing at a localhost-style value.');
  }

  const emailMode = backendEnv.get('EMAIL_PROVIDER_MODE');
  if (emailMode === 'resend') {
    for (const key of ['EMAIL_FROM_ADDRESS', 'RESEND_API_KEY']) {
      const value = backendEnv.get(key);
      if (!value || isPlaceholderValue(value)) {
        pushResult('error', 'backend', `${key} must be real when EMAIL_PROVIDER_MODE=resend.`);
      }
    }
  }

  const smsMode = backendEnv.get('SMS_PROVIDER_MODE');
  if (smsMode === 'twilio-verify') {
    for (const key of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SERVICE_SID']) {
      const value = backendEnv.get(key);
      if (!value || isPlaceholderValue(value)) {
        pushResult('error', 'backend', `${key} must be real when SMS_PROVIDER_MODE=twilio-verify.`);
      }
    }
  }

  const googleMode = backendEnv.get('GOOGLE_AUTH_MODE');
  if (googleMode === 'google-jwt') {
    const value = backendEnv.get('GOOGLE_CLIENT_ID');
    if (!value || isPlaceholderValue(value)) {
      pushResult('error', 'backend', 'GOOGLE_CLIENT_ID must be real when GOOGLE_AUTH_MODE=google-jwt.');
    }
  }
}

if (adminBackendEnv) {
  if (adminBackendEnv.get('APP_ENV') !== 'production') {
    pushResult('error', 'admin_backend', 'APP_ENV must be production.');
  }

  if (!isHttpsOrigin(adminBackendEnv.get('PUBLIC_ADMIN_WEB_ORIGIN'))) {
    pushResult('error', 'admin_backend', 'PUBLIC_ADMIN_WEB_ORIGIN must use https://.');
  }

  if ((adminBackendEnv.get('AUTH_SESSION_SECRET') || '').length < 32) {
    pushResult('error', 'admin_backend', 'AUTH_SESSION_SECRET must be at least 32 characters.');
  }

  const mysqlHost = adminBackendEnv.get('MYSQL_HOST');
  if (mysqlHost === '127.0.0.1' || mysqlHost === 'localhost') {
    pushResult('warn', 'admin_backend', 'MYSQL_HOST is still pointing at a localhost-style value.');
  }
}

if (frontendEnv) {
  if (!isHttpsOrigin(frontendEnv.get('VITE_PUBLIC_SITE_URL'))) {
    pushResult('error', 'frontend', 'VITE_PUBLIC_SITE_URL must use https://.');
  }

  if (!isRelativeApiBase(frontendEnv.get('VITE_API_BASE_URL'))) {
    pushResult('warn', 'frontend', 'VITE_API_BASE_URL should stay /api for same-origin proxying.');
  }
}

if (adminFrontendEnv) {
  if (!isRelativeApiBase(adminFrontendEnv.get('VITE_API_BASE_URL'))) {
    pushResult(
      'warn',
      'admin_frontend',
      'VITE_API_BASE_URL should stay /api for same-origin proxying.'
    );
  }
}

const clientOrigin = backendEnv?.get('PUBLIC_WEB_ORIGIN');
const adminOrigin = adminBackendEnv?.get('PUBLIC_ADMIN_WEB_ORIGIN');

if (clientOrigin && adminOrigin && clientOrigin === adminOrigin) {
  pushResult('error', 'origins', 'Client and admin origins must be different.');
}

const backendSessionCookie = backendEnv?.get('SESSION_COOKIE_NAME');
const adminSessionCookie = adminBackendEnv?.get('SESSION_COOKIE_NAME');
if (backendSessionCookie && adminSessionCookie && backendSessionCookie === adminSessionCookie) {
  pushResult('error', 'cookies', 'Client and admin session cookie names must be distinct.');
}

for (const result of results) {
  const marker =
    result.status === 'error' ? 'ERROR' : result.status === 'warn' ? 'WARN ' : 'PASS ';
  console.log(`${marker} [${result.scope}] ${result.message}`);
}

if (results.length === 0) {
  console.log('PASS  production env validation found no issues.');
}

if (hasError) {
  process.exitCode = 1;
}
