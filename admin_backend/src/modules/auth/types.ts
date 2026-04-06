export interface AdminSessionUser {
  email: string;
  id: string;
  lastActiveAt: string;
  mustRotatePassword: boolean;
  name: string;
}

export interface SessionResolution {
  clearSessionCookie?: boolean;
  user: AdminSessionUser | null;
}

export interface AdminAuthSignInInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ChangeAdminPasswordInput {
  currentPassword: string;
  newPassword: string;
}
