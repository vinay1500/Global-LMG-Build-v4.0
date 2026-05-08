import { describe, expect, it } from 'vitest';
import {
  createSignedCsrfToken,
  verifySignedCsrfToken,
} from '../../backend/src/lib/authCrypto.js';

describe('CSRF token roundtrip', () => {
  it('verifies tokens signed with the same secret', () => {
    const token = createSignedCsrfToken('test-secret');

    expect(token).toContain('.');
    expect(verifySignedCsrfToken(token, 'test-secret')).toBe(true);
  });

  it('rejects tampered tokens and wrong secrets', () => {
    const token = createSignedCsrfToken('test-secret');
    const [nonce, signature] = token.split('.');

    expect(verifySignedCsrfToken(`${nonce}x.${signature}`, 'test-secret')).toBe(false);
    expect(verifySignedCsrfToken(token, 'different-secret')).toBe(false);
    expect(verifySignedCsrfToken('not-a-token', 'test-secret')).toBe(false);
  });
});
