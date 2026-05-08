export type PasswordPolicyActor = {
  displayName: string;
  email: string;
};

export class PasswordPolicyError extends Error {
  public readonly code = 'password_strength_failed';
  public readonly statusCode = 400;

  constructor(public readonly issues: string[]) {
    super('The new password does not meet admin security requirements.');
  }
}

export const getAdminPasswordStrengthIssues = (
  newPassword: string,
  actor: PasswordPolicyActor
) => {
  const issues: string[] = [];
  const normalizedPassword = newPassword.toLowerCase();
  const emailLocalPart = actor.email.split('@')[0]?.toLowerCase() || '';
  const displayTokens = actor.displayName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);

  if (newPassword.length < 12) {
    issues.push('Use at least 12 characters.');
  }

  if (!/[a-z]/.test(newPassword)) {
    issues.push('Include a lowercase letter.');
  }

  if (!/[A-Z]/.test(newPassword)) {
    issues.push('Include an uppercase letter.');
  }

  if (!/[0-9]/.test(newPassword)) {
    issues.push('Include a number.');
  }

  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    issues.push('Include a symbol.');
  }

  if (emailLocalPart.length >= 4 && normalizedPassword.includes(emailLocalPart)) {
    issues.push('Do not include the email username.');
  }

  if (displayTokens.some((token) => normalizedPassword.includes(token))) {
    issues.push('Do not include your display name.');
  }

  return issues;
};

export const validateStrongPassword = (
  newPassword: string,
  actor: PasswordPolicyActor
) => {
  const issues = getAdminPasswordStrengthIssues(newPassword, actor);

  if (issues.length > 0) {
    throw new PasswordPolicyError(issues);
  }
};
