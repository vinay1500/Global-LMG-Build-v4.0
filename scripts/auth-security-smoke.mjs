import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const checks = [];

const addCheck = (name, passed, detail) => {
  checks.push({ name, passed, detail });
};

const backendEnv = read('backend/src/config/env.ts');
const authService = read('backend/src/modules/auth/authService.ts');
const authRoute = read('backend/src/routes/auth.ts');
const authModal = read('frontend/src/app/components/auth/AuthModal.tsx');

addCheck(
  'preview account feature flag defaults off',
  /PREVIEW_ACCOUNT_ENABLED:\s*booleanFromEnv\.default\(false\)/.test(backendEnv),
  'PREVIEW_ACCOUNT_ENABLED must default to false.'
);

addCheck(
  'preview account cannot be enabled outside development',
  /APP_ENV !== 'development' && parsedEnv\.PREVIEW_ACCOUNT_ENABLED/.test(backendEnv),
  'Config must reject PREVIEW_ACCOUNT_ENABLED outside development.'
);

addCheck(
  'preview account creation is explicitly gated',
  /const isPreviewAccountEnabled = \(\) => env\.APP_ENV === 'development' && env\.PREVIEW_ACCOUNT_ENABLED/.test(
    authService
  ) && /if \(!isPreviewAccountEnabled\(\)\)/.test(authService),
  'createPreviewAccount must require development and explicit enablement.'
);

addCheck(
  'preview account cannot authenticate outside explicit development mode',
  /const canAuthenticateAccount =/.test(authService) &&
    /if \(!canAuthenticateAccount\(account\)\)[\s\S]*?invalid_credentials/.test(authService) &&
    /clearSessionCookie: true/.test(authService),
  'Existing preview records must not remain usable in staging or production.'
);

const resetRequestRouteBlock = authRoute.match(
  /authRouter\.post\(\s*'\/auth\/password-reset\/request'[\s\S]*?\n\);/
)?.[0] ?? '';

addCheck(
  'password reset request response omits account-specific fields',
  resetRequestRouteBlock.length > 0 &&
    !/deliveryHint|email/.test(resetRequestRouteBlock) &&
    /status:\s*result\.status/.test(resetRequestRouteBlock) &&
    /message:\s*result\.message/.test(resetRequestRouteBlock),
  'Password reset request response must not include email or delivery hints.'
);

addCheck(
  'password reset request no longer throws account-not-found',
  !/async requestPasswordReset[\s\S]*?account_not_found/.test(authService),
  'Unknown reset identifiers must return the same generic 200 response.'
);

addCheck(
  'password reset uses generic message',
  /PASSWORD_RESET_GENERIC_MESSAGE/.test(authService),
  'Password reset request and resend should share a generic message.'
);

addCheck(
  'password reset confirm uses generic invalid-code errors',
  /catch\s*\{[\s\S]*?invalid_reset_code/.test(authService) &&
    !/reset_email_mismatch/.test(authService),
  'Invalid reset flow, email mismatch, and wrong code should not reveal account existence.'
);

addCheck(
  'frontend preview hint is explicitly gated',
  /import\.meta\.env\.DEV && import\.meta\.env\.VITE_PREVIEW_ACCOUNT_ENABLED === 'true'/.test(
    authModal
  ),
  'Frontend preview hint should require dev and VITE_PREVIEW_ACCOUNT_ENABLED=true.'
);

addCheck(
  'frontend does not embed preview credentials',
  !/arjun\.m@example\.com|Preview@123/.test(authModal),
  'Routed auth UI must not embed preview credentials.'
);

const failures = checks.filter((check) => !check.passed);

for (const check of checks) {
  console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.name}`);
  if (!check.passed) {
    console.log(`  ${check.detail}`);
  }
}

if (failures.length > 0) {
  process.exitCode = 1;
}
