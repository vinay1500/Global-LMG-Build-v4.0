import { describe, expect, it } from 'vitest';
import {
  getAdminPasswordStrengthIssues,
  validateStrongPassword,
} from '../../admin_backend/src/modules/auth/passwordPolicy.js';

const actor = {
  displayName: 'Riya Operations',
  email: 'riya.ops@example.com',
};

describe('admin password policy', () => {
  it('accepts a strong password that avoids identity tokens', () => {
    expect(getAdminPasswordStrengthIssues('Violet#Ledger42', actor)).toEqual([]);
    expect(() => validateStrongPassword('Violet#Ledger42', actor)).not.toThrow();
  });

  it('requires length, character classes, and symbols', () => {
    const issues = getAdminPasswordStrengthIssues('short', actor);

    expect(issues).toContain('Use at least 12 characters.');
    expect(issues).toContain('Include an uppercase letter.');
    expect(issues).toContain('Include a number.');
    expect(issues).toContain('Include a symbol.');
  });

  it('rejects passwords containing the admin email username or display name', () => {
    expect(getAdminPasswordStrengthIssues('Riya#Ledger42', actor)).toContain(
      'Do not include your display name.'
    );
    expect(getAdminPasswordStrengthIssues('riya.ops#Ledger42', actor)).toContain(
      'Do not include the email username.'
    );
  });
});
