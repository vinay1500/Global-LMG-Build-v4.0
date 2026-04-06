import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  MessagesSquare,
  Paperclip,
  Plus,
  KeyRound,
  Search,
  Shield,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  apiBinary,
  apiDownload,
  apiRequest,
  setCsrfToken,
  uploadAdminFiles,
} from './lib/api/client';

type AdminUser = {
  displayName: string;
  email: string;
  id: string;
  mustRotatePassword: boolean;
  permissionCodes: string[];
  roleCodes: string[];
};

type AuthContextValue = {
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>;
  error: string | null;
  isReady: boolean;
  refreshSession: () => Promise<void>;
  signIn: (input: { email: string; password: string; rememberMe: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
  user: AdminUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('Auth context is unavailable.');
  }

  return context;
};

const useAdminResource = <T,>(loader: () => Promise<T>, deps: React.DependencyList) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadSeed, setReloadSeed] = useState(0);
  const reload = useCallback(() => {
    setReloadSeed((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void loader()
      .then((value) => {
        if (!active) {
          return;
        }

        setData(value);
      })
      .catch((loaderError: unknown) => {
        if (!active) {
          return;
        }

        setError(loaderError instanceof Error ? loaderError.message : 'Request failed.');
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadSeed, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, error, loading, reload, setData };
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
};

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleDateString();
};

const formatCurrency = (amount: number | null | undefined, currencyCode = 'INR') => {
  const safeAmount = Number(amount || 0);

  return new Intl.NumberFormat('en-IN', {
    currency: currencyCode,
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(safeAmount);
};

const toTitleCase = (value: string) =>
  value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const triggerBrowserDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const SAFE_INLINE_PREVIEW_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
]);

const isInlinePreviewableMimeType = (mimeType: string | null | undefined) =>
  Boolean(mimeType && SAFE_INLINE_PREVIEW_MIME_TYPES.has(mimeType.toLowerCase()));

const isTextPreviewMimeType = (mimeType: string | null | undefined) =>
  mimeType?.toLowerCase() === 'text/plain';

const toInputDateTimeValue = (value: string | null | undefined) => (value ? value.slice(0, 16) : '');

const mapUploadedFilesToAttachmentIds = (
  uploadedFiles: Array<{ fileName: string }>,
  attachments: Array<{ documentId: string; originalFileName?: string | null; title?: string | null }>
) => {
  const uploadedNames = new Set(uploadedFiles.map((entry) => entry.fileName));

  return attachments
    .filter((entry) => uploadedNames.has(entry.originalFileName || entry.title || ''))
    .map((entry) => entry.documentId);
};

const StatusPill = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-[#d9cfbf] bg-[#f6efe5] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6f5d49]">
    {children}
  </span>
);

const SectionCard = ({
  title,
  action,
  children,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) => (
  <section className="rounded-[28px] border border-[#e7ded0] bg-white p-6 shadow-[0_18px_50px_rgba(47,35,18,0.08)]">
    <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#f1eadf] pb-4">
      <h2 className="text-lg text-[#1e293b]" style={{ fontFamily: 'var(--font-display-stack)' }}>
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
);

const DataState = ({
  error,
  loading,
  children,
}: {
  children: ReactNode;
  error: string | null;
  loading: boolean;
}) => {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-5 text-sm text-slate-600">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return <>{children}</>;
};

const PageHeader = ({
  title,
  eyebrow,
  description,
  actions,
}: {
  actions?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) => (
  <section className="relative overflow-hidden rounded-[32px] border border-[#e7ded0] bg-[linear-gradient(135deg,#fffdfa_0%,#f8f2e8_52%,#f3ecdf_100%)] p-8 shadow-[0_24px_60px_rgba(47,35,18,0.08)]">
    <div className="absolute right-0 top-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-white/80" />
    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9a8466]">{eyebrow}</p>
        <h1 className="mt-3 text-3xl leading-tight text-[#1f2937] lg:text-4xl" style={{ fontFamily: 'var(--font-display-stack)' }}>
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 lg:text-base">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  </section>
);

const MetricCard = ({
  label,
  value,
  detail,
}: {
  detail?: string;
  label: string;
  value: ReactNode;
}) => (
  <div className="rounded-[24px] border border-[#e7ded0] bg-white p-5 shadow-[0_14px_40px_rgba(47,35,18,0.06)]">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className="mt-3 text-3xl text-slate-900" style={{ fontFamily: 'var(--font-display-stack)' }}>
      {value}
    </p>
    {detail ? <p className="mt-2 text-sm text-slate-600">{detail}</p> : null}
  </div>
);

const FieldLabel = ({ children }: { children: ReactNode }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{children}</p>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-2xl border border-dashed border-[#dbcdb9] bg-[#fbf7f0] p-5 text-sm text-slate-500">
    {message}
  </div>
);

const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const payload = await apiRequest<{
        authenticated: boolean;
        csrfToken: string;
        user: AdminUser | null;
      }>('/v1/admin/auth/session');
      setCsrfToken(payload.csrfToken);
      setUser(payload.authenticated ? payload.user : null);
      setError(null);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : 'Session refresh failed.');
      setUser(null);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signIn = useCallback(
    async (input: { email: string; password: string; rememberMe: boolean }) => {
      const payload = await apiRequest<{
        authenticated: boolean;
        csrfToken: string;
        user: AdminUser;
      }>('/v1/admin/auth/sign-in', {
        body: input,
        method: 'POST',
      });
      setCsrfToken(payload.csrfToken);
      setUser(payload.user);
      setError(null);
    },
    []
  );

  const changePassword = useCallback(
    async (input: { currentPassword: string; newPassword: string }) => {
      const payload = await apiRequest<{ csrfToken: string }>('/v1/admin/auth/change-password', {
        body: input,
        method: 'POST',
      });
      setCsrfToken(payload.csrfToken);
      await refreshSession();
    },
    [refreshSession]
  );

  const signOut = useCallback(async () => {
    await apiRequest('/v1/admin/auth/sign-out', {
      method: 'POST',
    });
    setCsrfToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      isReady,
      changePassword,
      refreshSession,
      signIn,
      signOut,
      user,
    }),
    [changePassword, error, isReady, refreshSession, signIn, signOut, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const LoginPage = () => {
  const { error, signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    rememberMe: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setLocalError(null);

    try {
      await signIn(form);
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setLocalError(submitError instanceof Error ? submitError.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f6f2ea_0%,#fbfaf7_42%,#f2ebdf_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[36px] border border-[#e7ded0] bg-[linear-gradient(135deg,#fffdfa_0%,#f7f0e6_55%,#efe6d8_100%)] p-10 shadow-[0_30px_90px_rgba(47,35,18,0.08)]">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#9a8466]">Admin Control Plane</p>
            <h1 className="max-w-2xl text-5xl leading-tight text-slate-900" style={{ fontFamily: 'var(--font-display-stack)' }}>
              Global LMG internal operations, client oversight, meetings, messaging, and billing from one console.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">
              This admin platform is isolated from the frozen client portal and works directly against the
              shared normalized database through dedicated admin APIs.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                ['Client 360', 'See every portal user, matter, document, invoice, thread, event, and audit trail in one place.'],
                ['Meeting Desk', 'Schedule, reschedule, cancel, and join Google Meet events while sending reminders to admins and clients.'],
                ['Messaging', 'Reply to client threads from a single communication desk.'],
                ['Operations', 'Track overdue billing, open tasks, unread threads, active matters, and day-to-day activity.'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-[24px] border border-[#e7ded0] bg-white p-5 shadow-[0_12px_30px_rgba(47,35,18,0.05)]">
                  <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[36px] border border-[#e7ded0] bg-white p-8 shadow-[0_30px_90px_rgba(47,35,18,0.08)]">
            <h2 className="text-2xl text-slate-900" style={{ fontFamily: 'var(--font-display-stack)' }}>
              Admin Sign In
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Use an internal admin account with one of the active roles: ops, case, billing, messaging, or management view.
            </p>

            {(localError || error) && (
              <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                {localError || error}
              </div>
            )}

            <form className="mt-8 space-y-5" onSubmit={onSubmit}>
              <label className="block text-sm">
                <span className="mb-2 block text-slate-600">Email</span>
                <input
                  className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-slate-900 outline-none transition focus:border-[#baa283]"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-2 block text-slate-600">Password</span>
                <input
                  className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-slate-900 outline-none transition focus:border-[#baa283]"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                />
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input
                  checked={form.rememberMe}
                  type="checkbox"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, rememberMe: event.target.checked }))
                  }
                />
                Keep this session active longer
              </label>
              <button
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
};

const AccountSecurityPage = () => {
  const { changePassword, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    confirmPassword: '',
    currentPassword: '',
    newPassword: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setMessage('Password updated. Your admin account no longer requires rotation.');
      setForm({
        confirmPassword: '',
        currentPassword: '',
        newPassword: '',
      });
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Password change failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account Security"
        title="Rotate the admin password before continuing."
        description="Bootstrap accounts and newly provisioned team users must set a fresh password before accessing the rest of the admin beta."
      />

      {user?.mustRotatePassword ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Password rotation is required for this account before you can continue using the admin console.
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard title="Security Checklist">
          <div className="space-y-3 text-sm leading-7 text-slate-600">
            <p>Use a unique password that is not shared with the client beta or any public mailbox.</p>
            <p>Keep the current password for verification, then set a new password with at least 12 characters.</p>
            <p>After the password changes, the normal admin dashboard routes become available again.</p>
          </div>
        </SectionCard>

        <SectionCard title="Change Password">
          <form className="space-y-4" onSubmit={submit}>
            <input
              className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
              placeholder="Current password"
              type="password"
              value={form.currentPassword}
              onChange={(event) =>
                setForm((current) => ({ ...current, currentPassword: event.target.value }))
              }
            />
            <input
              className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
              placeholder="New password"
              type="password"
              value={form.newPassword}
              onChange={(event) =>
                setForm((current) => ({ ...current, newPassword: event.target.value }))
              }
            />
            <input
              className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
              placeholder="Confirm new password"
              type="password"
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((current) => ({ ...current, confirmPassword: event.target.value }))
              }
            />
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
              disabled={submitting}
              type="submit"
            >
              <KeyRound size={15} />
              {submitting ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
};

const NAV_ITEMS = [
  ['dashboard', 'Dashboard', LayoutDashboard, '/dashboard'],
  ['clients', 'Clients', Users, '/clients'],
  ['requests', 'Requests', FileText, '/requests'],
  ['matters', 'Matters', BriefcaseBusiness, '/matters'],
  ['events', 'Meetings', CalendarDays, '/events'],
  ['messages', 'Messages', MessagesSquare, '/messages'],
  ['notifications', 'Notifications', BellRing, '/notifications'],
  ['documents', 'Documents', FileText, '/documents'],
  ['billing', 'Billing', CreditCard, '/billing'],
  ['tasks', 'Tasks', BellRing, '/tasks'],
  ['rbac', 'RBAC', Shield, '/rbac'],
  ['audit', 'Audit', Activity, '/audit'],
  ['reports', 'Reports', BarChart3, '/reports'],
] as const;

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f3eb_0%,#fbfaf7_42%,#f3ecdf_100%)] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[300px_1fr]">
        <aside className="border-r border-[#e7ded0] bg-[#faf7f2] p-6">
          <div className="rounded-[28px] border border-[#e7ded0] bg-white p-5 shadow-[0_18px_40px_rgba(47,35,18,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9a8466]">Global LMG</p>
            <h1 className="mt-2 text-xl text-slate-900" style={{ fontFamily: 'var(--font-display-stack)' }}>
              Admin Console
            </h1>
            <p className="mt-3 text-sm text-slate-700">{user?.displayName}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{user?.roleCodes.join(' · ')}</p>
            {user?.mustRotatePassword ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                Password rotation required
              </div>
            ) : null}
          </div>

          <nav className="mt-6 space-y-2">
            {NAV_ITEMS.map(([key, label, Icon, href]) => {
              const active = location.pathname === href || location.pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={key}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                    active
                      ? 'bg-slate-900 text-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                  to={href}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <button
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e7ded0] bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-[#f3ecdf] hover:text-slate-900"
            onClick={() => void handleSignOut()}
            type="button"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </aside>

        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const summary = useAdminResource(() => apiRequest<any>('/v1/admin/dashboard/summary'), []);
  const reports = useAdminResource(() => apiRequest<any>('/v1/admin/reports/overview'), []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Executive Overview"
        title="One operational view for clients, matters, billing, documents, and communication."
        description="This is the admin-side equivalent of the client dashboard, with every critical queue visible in one place so your team does not have to hunt through disconnected pages."
      />

      <DataState error={summary.error} loading={summary.loading}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(summary.data?.cards || {}).map(([label, value]) => (
            <MetricCard key={label} detail="Live operations count" label={toTitleCase(label)} value={String(value)} />
          ))}
        </div>
      </DataState>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Due Today">
          <DataState error={summary.error} loading={summary.loading}>
            <div className="space-y-3">
              {(summary.data?.dueToday || []).map((task: any) => (
                <div key={task.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{task.title}</p>
                      <p className="text-sm text-slate-500">{task.taskTypeCode}</p>
                    </div>
                    <StatusPill>{task.statusCode}</StatusPill>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{formatDateTime(task.dueAt)}</p>
                </div>
              ))}
              {!summary.data?.dueToday?.length ? <EmptyState message="No admin tasks are due today." /> : null}
            </div>
          </DataState>
        </SectionCard>

        <SectionCard title="Recent Activity">
          <DataState error={summary.error} loading={summary.loading}>
            <div className="space-y-3">
              {(summary.data?.recentActivity || []).map((entry: any) => (
                <div key={entry.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{entry.actionLabel}</p>
                      <p className="text-sm text-slate-500">{entry.actorName || 'System'} · {entry.sourceModule}</p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{formatDateTime(entry.occurredAt)}</p>
                  </div>
                  {entry.summary ? <p className="mt-2 text-sm text-slate-600">{entry.summary}</p> : null}
                </div>
              ))}
              {!summary.data?.recentActivity?.length ? <EmptyState message="No recent admin activity yet." /> : null}
            </div>
          </DataState>
        </SectionCard>
      </div>

      <SectionCard title="Reporting Snapshot">
        <DataState error={reports.error} loading={reports.loading}>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Matter Stages</h3>
              <div className="mt-4 space-y-2">
                {(reports.data?.matterStages || []).map((entry: any) => (
                  <div key={entry.code} className="flex items-center justify-between rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm">
                    <span className="text-slate-700">{entry.code}</span>
                    <span className="font-semibold text-slate-900">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Invoice Statuses</h3>
              <div className="mt-4 space-y-2">
                {(reports.data?.invoiceStatuses || []).map((entry: any) => (
                  <div key={entry.code} className="flex items-center justify-between rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm">
                    <span className="text-slate-700">{entry.code}</span>
                    <span className="font-semibold text-slate-900">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DataState>
      </SectionCard>
    </div>
  );
};

const ClientsPage = () => {
  const [search, setSearch] = useState('');
  const resource = useAdminResource(
    () => apiRequest<any>(`/v1/admin/clients?search=${encodeURIComponent(search)}`),
    [search]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Client Oversight"
        title="Client 360 starts here."
        description="Search by client name, code, email, or phone and jump into a single client workspace that groups matters, documents, messages, meetings, invoices, payments, refunds, and audit activity together."
        actions={
          <div className="relative min-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="w-full rounded-2xl border border-[#dfd5c7] bg-white px-10 py-3 text-sm text-slate-900 outline-none transition focus:border-[#baa283]"
              placeholder="Search clients by name, code, email, or phone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        }
      />

      <DataState error={resource.error} loading={resource.loading}>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            detail="Total matching client accounts"
            label="Results"
            value={resource.data?.total || resource.data?.items?.length || 0}
          />
          <MetricCard
            detail="Clients with at least one matter in this result set"
            label="With Matters"
            value={(resource.data?.items || []).filter((client: any) => client.matterCount > 0).length}
          />
          <MetricCard
            detail="Quick access into Client 360"
            label="Search Scope"
            value={search.trim() ? 'Filtered' : 'All Clients'}
          />
        </div>
      </DataState>

      <SectionCard title="Clients">
        <DataState error={resource.error} loading={resource.loading}>
          <div className="space-y-4">
            {(resource.data?.items || []).map((client: any) => (
              <Link
                key={client.id}
                className="block rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-5 transition hover:border-[#d7c5a8] hover:bg-white"
                to={`/clients/${client.id}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg text-slate-900" style={{ fontFamily: 'var(--font-display-stack)' }}>
                        {client.displayName}
                      </h3>
                      <StatusPill>{client.accountStatusCode}</StatusPill>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                      <div>
                        <FieldLabel>Client Code</FieldLabel>
                        <p className="mt-1 text-slate-900">{client.clientCode}</p>
                      </div>
                      <div>
                        <FieldLabel>Email</FieldLabel>
                        <p className="mt-1 break-all text-slate-900">{client.primaryEmail || 'Not available'}</p>
                      </div>
                      <div>
                        <FieldLabel>Phone</FieldLabel>
                        <p className="mt-1 text-slate-900">{client.primaryPhone || 'Not available'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid min-w-[220px] gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="rounded-2xl border border-[#e7ded0] bg-white px-4 py-3">
                      <FieldLabel>Matters</FieldLabel>
                      <p className="mt-2 text-lg text-slate-900">{client.matterCount}</p>
                    </div>
                    <div className="rounded-2xl border border-[#e7ded0] bg-white px-4 py-3">
                      <FieldLabel>Type</FieldLabel>
                      <p className="mt-2 text-sm text-slate-900">{client.clientTypeCode}</p>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-[#e7ded0] bg-white px-4 py-3 text-sm text-slate-700">
                      Open Client 360
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {!resource.data?.items?.length ? (
              <EmptyState message="No clients matched that search. Try client code, email, or phone for faster results." />
            ) : null}
          </div>
        </DataState>
      </SectionCard>
    </div>
  );
};

const ClientDetailPage = () => {
  const params = useParams();
  const resource = useAdminResource(
    () => apiRequest<any>(`/v1/admin/clients/${params.clientId}`),
    [params.clientId]
  );
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const updatePortalAccess = async (userId: string, portalAccessEnabled: boolean) => {
    await apiRequest(`/v1/admin/clients/${params.clientId}/portal-users/${userId}/access`, {
      body: { portalAccessEnabled },
      method: 'PATCH',
    });
    resource.reload();
    setMessage(portalAccessEnabled ? 'Portal access enabled.' : 'Portal access disabled and sessions revoked.');
  };

  const forceSignOut = async (userId: string) => {
    await apiRequest(`/v1/admin/clients/${params.clientId}/portal-users/${userId}/force-sign-out`, {
      method: 'POST',
    });
    resource.reload();
    setMessage('Active sessions revoked for that portal user.');
  };

  const uploadClientDocuments = async (event: FormEvent) => {
    event.preventDefault();
    if (!uploadFiles.length || !params.clientId) {
      return;
    }

    setUploading(true);
    try {
      await uploadAdminFiles(uploadFiles, {
        relatedEntityId: params.clientId,
        relatedEntityType: 'client-account',
        sourceModule: 'admin_client_360',
      });
      setUploadFiles([]);
      resource.reload();
      setMessage(`${uploadFiles.length} document${uploadFiles.length === 1 ? '' : 's'} uploaded for this client.`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
      <DataState error={resource.error} loading={resource.loading}>
        <PageHeader
          eyebrow="Client 360"
          title={resource.data?.client?.displayName || 'Client 360'}
          description="Everything relevant to this client lives here: portal users, access state, notification preferences, active matters, uploaded documents, meetings, messages, invoices, payments, refunds, notifications, and recent audit activity."
          actions={
            <>
              <Link className="rounded-2xl border border-[#d9cfbf] bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-[#f3ecdf]" to="/clients">
                Back to Clients
              </Link>
              <Link className="rounded-2xl border border-[#d9cfbf] bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-[#f3ecdf]" to={`/notifications?clientAccountId=${encodeURIComponent(resource.data?.client?.id || '')}`}>
                Open Notifications
              </Link>
              <Link className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" to={`/messages?search=${encodeURIComponent(resource.data?.client?.displayName || '')}`}>
                Open Message Desk
              </Link>
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Client Code" value={resource.data?.client?.clientCode || 'Not set'} />
          <MetricCard label="Primary Email" value={resource.data?.client?.primaryEmail || 'Not set'} />
          <MetricCard label="Primary Phone" value={resource.data?.client?.primaryPhone || 'Not set'} />
          <MetricCard
            detail="Current portal access state"
            label="Onboarding"
            value={toTitleCase(resource.data?.client?.onboardingStatusCode || 'unknown')}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title="Portal Users">
            <div className="space-y-3">
              {(resource.data?.portalUsers || []).map((user: any) => (
                <div key={user.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-sm text-slate-600">{user.email}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Phone: {user.phone || 'Not available'} · Last login: {formatDateTime(user.lastLoginAt)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusPill>{user.emailVerifiedAt ? 'email verified' : 'email pending'}</StatusPill>
                        <StatusPill>{user.phoneVerifiedAt ? 'phone verified' : 'phone pending'}</StatusPill>
                        <StatusPill>{user.access?.activeSessions?.length || 0} active sessions</StatusPill>
                      </div>
                    </div>
                    <div className="space-y-2 text-right">
                      <StatusPill>{user.portalAccessEnabled ? 'portal on' : 'portal off'}</StatusPill>
                      <button
                        className="block w-full rounded-2xl border border-[#d9cfbf] bg-white px-4 py-2 text-xs text-slate-700"
                        onClick={() => void forceSignOut(user.id)}
                        type="button"
                      >
                        Force Sign-out
                      </button>
                      <button
                        className="block w-full rounded-2xl border border-[#d9cfbf] bg-white px-4 py-2 text-xs text-slate-700"
                        onClick={() => void updatePortalAccess(user.id, !user.portalAccessEnabled)}
                        type="button"
                      >
                        {user.portalAccessEnabled ? 'Disable Portal' : 'Enable Portal'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-3">
                    <div className="rounded-2xl border border-[#dfd5c7] bg-white p-4">
                      <FieldLabel>Notification Preferences</FieldLabel>
                      {user.access?.notificationPreferences ? (
                        <div className="mt-3 space-y-1 text-sm text-slate-600">
                          <p>Email updates: {user.access.notificationPreferences.emailUpdates ? 'On' : 'Off'}</p>
                          <p>SMS alerts: {user.access.notificationPreferences.smsAlerts ? 'On' : 'Off'}</p>
                          <p>Invoice reminders: {user.access.notificationPreferences.invoiceReminders ? 'On' : 'Off'}</p>
                          <p>Case activity: {user.access.notificationPreferences.caseActivityAlerts ? 'On' : 'Off'}</p>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">No saved notification preference row.</p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[#dfd5c7] bg-white p-4">
                      <FieldLabel>Legal Acceptances</FieldLabel>
                      <div className="mt-3 space-y-2">
                        {(user.access?.legalAcceptances || []).slice(0, 4).map((entry: any) => (
                          <div key={entry.id} className="text-sm text-slate-600">
                            {entry.acceptanceTypeCode} · {formatDateTime(entry.acceptedAt)}
                          </div>
                        ))}
                        {!user.access?.legalAcceptances?.length ? (
                          <p className="text-sm text-slate-500">No acceptance history on record.</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#dfd5c7] bg-white p-4">
                      <FieldLabel>Security Events</FieldLabel>
                      <div className="mt-3 space-y-2">
                        {(user.access?.securityEvents || []).slice(0, 4).map((entry: any) => (
                          <div key={entry.id} className="text-sm text-slate-600">
                            {entry.eventTypeCode} · {entry.successFlag ? 'Success' : 'Failed'}
                          </div>
                        ))}
                        {!user.access?.securityEvents?.length ? (
                          <p className="text-sm text-slate-500">No security events captured yet.</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!resource.data?.portalUsers?.length ? <EmptyState message="No linked portal users for this client." /> : null}
            </div>
          </SectionCard>

          <SectionCard title="Internal Notes and Uploads">
            <form className="rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-4" onSubmit={uploadClientDocuments}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Upload client documents</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                    Documents uploaded here attach directly to the client record.
                  </p>
                </div>
                {uploadFiles.length ? <StatusPill>{uploadFiles.length} selected</StatusPill> : null}
              </div>
              <input
                className="mt-4 block w-full rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900"
                multiple
                type="file"
                onChange={(event) => setUploadFiles(Array.from(event.target.files || []))}
              />
              <button
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                disabled={uploading || uploadFiles.length === 0}
                type="submit"
              >
                <Upload size={15} />
                {uploading ? 'Uploading...' : 'Upload to Client 360'}
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {(resource.data?.internalNotes || []).map((note: any) => (
                <div key={note.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                  <p className="text-sm leading-6 text-slate-700">{note.bodyText}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {note.createdByName} · {formatDateTime(note.createdAt)}
                  </p>
                </div>
              ))}
              {!resource.data?.internalNotes?.length ? <EmptyState message="No internal notes have been recorded for this client yet." /> : null}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Matters">
            <div className="space-y-3">
              {(resource.data?.matters || []).map((matter: any) => (
                <Link
                  key={matter.id}
                  className="block rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4 transition hover:border-[#d7c5a8] hover:bg-white"
                  to={`/matters/${matter.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{matter.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {matter.currentStageLabel} · {matter.operationalStatusCode}
                      </p>
                    </div>
                    <ChevronRight size={16} className="mt-1 text-slate-400" />
                  </div>
                </Link>
              ))}
              {!resource.data?.matters?.length ? <EmptyState message="No matters are linked to this client yet." /> : null}
            </div>
          </SectionCard>

          <SectionCard title="Threads">
            <div className="space-y-3">
              {(resource.data?.threads || []).map((thread: any) => (
                <Link
                  key={thread.id}
                  className="block rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4 transition hover:border-[#d7c5a8] hover:bg-white"
                  to={`/messages?thread=${thread.id}`}
                >
                  <p className="font-medium text-slate-900">{thread.subject || thread.threadNumber}</p>
                  <p className="mt-1 text-sm text-slate-500">{thread.lastMessageText || 'No recent message preview'}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{formatDateTime(thread.lastMessageAt)}</p>
                </Link>
              ))}
              {!resource.data?.threads?.length ? <EmptyState message="No conversation threads exist for this client." /> : null}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <SectionCard title="Documents">
            <div className="space-y-2">
              {(resource.data?.documents || []).map((document: any) => (
                <Link
                  key={document.id}
                  className="flex items-center justify-between rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm text-slate-700 transition hover:border-[#d7c5a8] hover:bg-white"
                  to={`/documents?document=${document.id}`}
                >
                  <span className="truncate">{document.title}</span>
                  <ArrowRight size={15} />
                </Link>
              ))}
              {!resource.data?.documents?.length ? <EmptyState message="No documents have been uploaded for this client." /> : null}
            </div>
          </SectionCard>
          <SectionCard title="Meetings">
            <div className="space-y-2">
              {(resource.data?.events || []).map((event: any) => (
                <Link
                  key={event.id}
                  className="flex items-center justify-between rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm text-slate-700 transition hover:border-[#d7c5a8] hover:bg-white"
                  to={`/events?event=${event.id}`}
                >
                  <span className="truncate">{event.title}</span>
                  <ArrowRight size={15} />
                </Link>
              ))}
              {!resource.data?.events?.length ? <EmptyState message="No meetings are currently linked to this client." /> : null}
            </div>
          </SectionCard>
          <SectionCard title="Invoices">
            <div className="space-y-2">
              {(resource.data?.invoices || []).map((invoice: any) => (
                <Link
                  key={invoice.id}
                  className="flex items-center justify-between rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm text-slate-700 transition hover:border-[#d7c5a8] hover:bg-white"
                  to={`/billing?invoice=${invoice.id}`}
                >
                  <span>{invoice.invoiceNumber} · {invoice.statusCode}</span>
                  <ArrowRight size={15} />
                </Link>
              ))}
              {!resource.data?.invoices?.length ? <EmptyState message="No invoices exist for this client yet." /> : null}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Payments and Refunds">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Payments</FieldLabel>
                <div className="mt-3 space-y-2">
                  {(resource.data?.payments || []).map((payment: any) => (
                    <div key={payment.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">{formatCurrency(payment.netAmount, payment.currencyCode)}</p>
                      <p className="mt-1 text-slate-500">{payment.statusCode} · {formatDateTime(payment.initiatedAt)}</p>
                    </div>
                  ))}
                  {!resource.data?.payments?.length ? <EmptyState message="No payment rows are available for this client." /> : null}
                </div>
              </div>
              <div>
                <FieldLabel>Refunds</FieldLabel>
                <div className="mt-3 space-y-2">
                  {(resource.data?.refunds || []).map((refund: any) => (
                    <div key={refund.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">{formatCurrency(refund.amount)}</p>
                      <p className="mt-1 text-slate-500">{refund.statusCode} · {formatDateTime(refund.requestedAt)}</p>
                    </div>
                  ))}
                  {!resource.data?.refunds?.length ? <EmptyState message="No refunds are available for this client." /> : null}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Recent Activity">
            <div className="space-y-3">
              {(resource.data?.activity || []).map((entry: any) => (
                <div key={entry.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{entry.actionLabel}</p>
                      <p className="mt-1 text-sm text-slate-500">{entry.sourceModule}</p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{formatDateTime(entry.occurredAt)}</p>
                  </div>
                  {entry.summary ? <p className="mt-2 text-sm text-slate-600">{entry.summary}</p> : null}
                </div>
              ))}
              {!resource.data?.activity?.length ? <EmptyState message="No recent audit activity was found for this client." /> : null}
            </div>
          </SectionCard>
        </div>
      </DataState>
    </div>
  );
};

const RequestsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const selectedRequestId = searchParams.get('request');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusCode, setStatusCode] = useState(searchParams.get('statusCode') || '');
  const requests = useAdminResource(
    () =>
      apiRequest<any>(
        `/v1/admin/requests?search=${encodeURIComponent(search)}&statusCode=${encodeURIComponent(statusCode)}`
      ),
    [search, statusCode]
  );
  const requestDetail = useAdminResource(
    () =>
      selectedRequestId
        ? apiRequest<any>(`/v1/admin/requests/${selectedRequestId}`)
        : Promise.resolve(null),
    [selectedRequestId]
  );

  const setParamAndNavigate = (next: { request?: string | null; search?: string; statusCode?: string }) => {
    const nextParams = new URLSearchParams(location.search);
    if (next.request !== undefined) {
      if (next.request) {
        nextParams.set('request', next.request);
      } else {
        nextParams.delete('request');
      }
    }
    if (next.search !== undefined) {
      if (next.search.trim()) {
        nextParams.set('search', next.search);
      } else {
        nextParams.delete('search');
      }
    }
    if (next.statusCode !== undefined) {
      if (next.statusCode.trim()) {
        nextParams.set('statusCode', next.statusCode);
      } else {
        nextParams.delete('statusCode');
      }
    }
    navigate(`/requests${nextParams.toString() ? `?${nextParams.toString()}` : ''}`, {
      replace: true,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Requests Workspace"
        title="Every intake request, quote trail, and conversion state in one queue."
        description="Use this workspace to inspect incoming service requests, request documents, quote versions, and whether the intake has been converted into a live matter."
        actions={
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="w-full rounded-2xl border border-[#dfd5c7] bg-white px-10 py-3 text-sm text-slate-900 outline-none transition focus:border-[#baa283]"
                placeholder="Search request number, client, or issue"
                value={search}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSearch(nextValue);
                  setParamAndNavigate({ search: nextValue });
                }}
              />
            </div>
            <select
              className="rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900"
              value={statusCode}
              onChange={(event) => {
                const nextValue = event.target.value;
                setStatusCode(nextValue);
                setParamAndNavigate({ statusCode: nextValue });
              }}
            >
              <option value="">All request statuses</option>
              {['submitted', 'quoted', 'awaiting-client', 'converted', 'closed'].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionCard title="Request Queue">
          <DataState error={requests.error} loading={requests.loading}>
            <div className="space-y-3">
              {(requests.data?.items || []).map((request: any) => {
                const selected = request.id === selectedRequestId;
                return (
                  <button
                    key={request.id}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      selected
                        ? 'border-[#cbb492] bg-white shadow-[0_12px_32px_rgba(47,35,18,0.08)]'
                        : 'border-[#e7ded0] bg-[#fbf8f3] hover:border-[#d7c5a8] hover:bg-white'
                    }`}
                    onClick={() => setParamAndNavigate({ request: request.id })}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{request.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {request.clientName} · {request.requestNumber}
                        </p>
                        <p className="mt-3 text-sm text-slate-600">
                          {request.legalDomainName} · Submitted {formatDateTime(request.submittedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <StatusPill>{request.statusCode}</StatusPill>
                        <p className="mt-3 text-sm font-medium text-slate-900">
                          {formatCurrency(request.quoteTotalAmount)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!requests.data?.items?.length ? (
                <EmptyState message="No request intake rows matched those filters." />
              ) : null}
            </div>
          </DataState>
        </SectionCard>

        <SectionCard title="Request Detail">
          <DataState error={requestDetail.error} loading={requestDetail.loading}>
            {requestDetail.data ? (
              <div className="space-y-5">
                <div className="rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg text-slate-900" style={{ fontFamily: 'var(--font-display-stack)' }}>
                        {requestDetail.data.title}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {requestDetail.data.clientName} · {requestDetail.data.requestNumber}
                      </p>
                    </div>
                    <StatusPill>{requestDetail.data.statusCode}</StatusPill>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel>Issue Summary</FieldLabel>
                      <p className="mt-2 text-slate-900">{requestDetail.data.issueSummary}</p>
                    </div>
                    <div>
                      <FieldLabel>Urgency</FieldLabel>
                      <p className="mt-2 text-slate-900">{requestDetail.data.urgencyLabel}</p>
                    </div>
                    <div>
                      <FieldLabel>Contact</FieldLabel>
                      <p className="mt-2 text-slate-900">
                        {requestDetail.data.contactName} · {requestDetail.data.contactEmail}
                      </p>
                    </div>
                    <div>
                      <FieldLabel>Consultation Mode</FieldLabel>
                      <p className="mt-2 text-slate-900">{requestDetail.data.consultationModeCode}</p>
                    </div>
                  </div>
                </div>

                {requestDetail.data.linkedMatterId ? (
                  <div className="flex flex-wrap gap-3">
                    <Link
                      className="rounded-2xl border border-[#d9cfbf] bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-[#f3ecdf]"
                      to={`/matters/${requestDetail.data.linkedMatterId}`}
                    >
                      Open Matter 360
                    </Link>
                    <Link
                      className="rounded-2xl border border-[#d9cfbf] bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-[#f3ecdf]"
                      to={`/clients/${requestDetail.data.clientAccountId}`}
                    >
                      Open Client 360
                    </Link>
                  </div>
                ) : null}

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="space-y-3">
                    <FieldLabel>Requested Services</FieldLabel>
                    {(requestDetail.data.services || []).map((service: any) => (
                      <div key={service.serviceCode} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3">
                        <p className="font-medium text-slate-900">{service.serviceName}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {service.serviceCode} · Base fee {formatCurrency(service.quotedBaseFee)}
                        </p>
                      </div>
                    ))}
                    {!requestDetail.data.services?.length ? (
                      <EmptyState message="No request services were recorded for this intake." />
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <FieldLabel>Request Documents</FieldLabel>
                    {(requestDetail.data.documents || []).map((document: any) => (
                      <Link
                        key={document.documentId}
                        className="block rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 transition hover:border-[#d7c5a8] hover:bg-white"
                        to={`/documents?document=${document.documentId}`}
                      >
                        <p className="font-medium text-slate-900">{document.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {document.latestFileName || document.categoryCode} · {document.visibilityScopeCode}
                        </p>
                      </Link>
                    ))}
                    {!requestDetail.data.documents?.length ? (
                      <EmptyState message="No request documents are linked to this intake yet." />
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="space-y-3">
                    <FieldLabel>Quote Versions</FieldLabel>
                    {(requestDetail.data.quotes || []).map((quote: any) => (
                      <div key={quote.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-medium text-slate-900">Version {quote.versionNo}</p>
                          <StatusPill>{quote.isFinal ? 'final' : 'draft'}</StatusPill>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          Total {formatCurrency(quote.totalAmount, quote.currencyCode)} · Tax {formatCurrency(quote.taxAmount, quote.currencyCode)}
                        </p>
                        <div className="mt-3 space-y-2">
                          {(quote.lines || []).map((line: any, index: number) => (
                            <div key={`${quote.id}-${index}`} className="rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-700">
                              {line.description} · {formatCurrency(line.lineAmount, quote.currencyCode)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {!requestDetail.data.quotes?.length ? (
                      <EmptyState message="No quote versions exist for this request yet." />
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <FieldLabel>Status History</FieldLabel>
                    {(requestDetail.data.statusHistory || []).map((entry: any, index: number) => (
                      <div key={`${entry.toStatusCode}-${index}`} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-medium text-slate-900">
                            {(entry.fromStatusCode || 'new')} → {entry.toStatusCode}
                          </p>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            {formatDateTime(entry.createdAt)}
                          </p>
                        </div>
                        {entry.noteText ? (
                          <p className="mt-2 text-sm leading-6 text-slate-600">{entry.noteText}</p>
                        ) : null}
                      </div>
                    ))}
                    {!requestDetail.data.statusHistory?.length ? (
                      <EmptyState message="No request status history exists yet." />
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState message="Select a request from the queue to review intake documents, quotes, and conversion progress." />
            )}
          </DataState>
        </SectionCard>
      </div>
    </div>
  );
};

const NotificationsPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [search, setSearch] = useState('');
  const [isRead, setIsRead] = useState('');
  const [dismissed, setDismissed] = useState('');
  const [notificationTypeCode, setNotificationTypeCode] = useState('');
  const [clientAccountId, setClientAccountId] = useState(searchParams.get('clientAccountId') || '');
  const resource = useAdminResource(
    () =>
      apiRequest<any>(
        `/v1/admin/notifications?search=${encodeURIComponent(search)}&notificationTypeCode=${encodeURIComponent(notificationTypeCode)}&isRead=${encodeURIComponent(isRead)}&dismissed=${encodeURIComponent(dismissed)}&clientAccountId=${encodeURIComponent(clientAccountId)}`
      ),
    [clientAccountId, dismissed, isRead, notificationTypeCode, search]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notification History"
        title="Client-facing notifications should be visible, searchable, and accountable."
        description="Review every notification sent by the system, including message, meeting, invoice, and matter update notifications, along with read and dismissed state."
      />

      <SectionCard title="Filters">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
            placeholder="Client public ID filter"
            value={clientAccountId}
            onChange={(event) => setClientAccountId(event.target.value)}
          />
          <input
            className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
            placeholder="Search title, body, or recipient"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
            value={notificationTypeCode}
            onChange={(event) => setNotificationTypeCode(event.target.value)}
          >
            <option value="">All notification types</option>
            {['event_reminder', 'message_reply', 'matter_update', 'invoice', 'request'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
            value={isRead}
            onChange={(event) => setIsRead(event.target.value)}
          >
            <option value="">Read + unread</option>
            <option value="true">Read</option>
            <option value="false">Unread</option>
          </select>
          <select
            className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
            value={dismissed}
            onChange={(event) => setDismissed(event.target.value)}
          >
            <option value="">Dismissed + active</option>
            <option value="true">Dismissed</option>
            <option value="false">Active</option>
          </select>
        </div>
      </SectionCard>

      <SectionCard title="Notification Timeline">
        <DataState error={resource.error} loading={resource.loading}>
          <div className="space-y-3">
            {(resource.data?.items || []).map((entry: any) => (
              <div key={entry.id} className="rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-medium text-slate-900">{entry.title}</p>
                      <StatusPill>{entry.notificationTypeCode}</StatusPill>
                      <StatusPill>{entry.isRead ? 'read' : 'unread'}</StatusPill>
                      {entry.dismissedAt ? <StatusPill>dismissed</StatusPill> : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {entry.recipient.name} · {entry.recipient.email}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{entry.bodyText}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                      <span>{formatDateTime(entry.createdAt)}</span>
                      {entry.readAt ? <span>Read {formatDateTime(entry.readAt)}</span> : null}
                      {entry.clientName ? <span>Client {entry.clientName}</span> : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {entry.clientAccountId ? (
                        <Link className="rounded-full border border-[#d9cfbf] bg-white px-3 py-2 text-xs text-slate-700" to={`/clients/${entry.clientAccountId}`}>
                          Client 360
                        </Link>
                      ) : null}
                      {entry.matterId ? (
                        <Link className="rounded-full border border-[#d9cfbf] bg-white px-3 py-2 text-xs text-slate-700" to={`/matters/${entry.matterId}`}>
                          Matter
                        </Link>
                      ) : null}
                      {entry.threadId ? (
                        <Link className="rounded-full border border-[#d9cfbf] bg-white px-3 py-2 text-xs text-slate-700" to={`/messages?thread=${entry.threadId}`}>
                          Thread
                        </Link>
                      ) : null}
                      {entry.documentId ? (
                        <Link className="rounded-full border border-[#d9cfbf] bg-white px-3 py-2 text-xs text-slate-700" to={`/documents?document=${entry.documentId}`}>
                          Document
                        </Link>
                      ) : null}
                      {entry.invoiceId ? (
                        <Link className="rounded-full border border-[#d9cfbf] bg-white px-3 py-2 text-xs text-slate-700" to={`/billing?invoice=${entry.invoiceId}`}>
                          Invoice
                        </Link>
                      ) : null}
                      {entry.eventId ? (
                        <Link className="rounded-full border border-[#d9cfbf] bg-white px-3 py-2 text-xs text-slate-700" to={`/events?event=${entry.eventId}`}>
                          Meeting
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!resource.data?.items?.length ? (
              <EmptyState message="No notification history rows matched those filters." />
            ) : null}
          </div>
        </DataState>
      </SectionCard>
    </div>
  );
};

const MattersPage = () => {
  const [search, setSearch] = useState('');
  const [stageCode, setStageCode] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const resource = useAdminResource(
    () =>
      apiRequest<any>(
        `/v1/admin/matters?search=${encodeURIComponent(search)}&stageCode=${encodeURIComponent(stageCode)}&statusCode=${encodeURIComponent(statusCode)}`
      ),
    [search, stageCode, statusCode]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Matter Workspace"
        title="Cases should be easy to scan, not hard to discover."
        description="Search by client, matter title, or reference. Filter by stage and status so the operations team can immediately see what is ongoing, blocked, urgent, or completed."
      />

      <SectionCard
        title="Matter Search"
        action={
          <div className="relative min-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-10 py-3 text-sm text-slate-900 outline-none transition focus:border-[#baa283]"
              placeholder="Search matters by client, title, or reference"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" value={stageCode} onChange={(event) => setStageCode(event.target.value)}>
            <option value="">All stages</option>
            {['request-received', 'verification-call', 'consultation', 'action-plan', 'resolution'].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <select className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" value={statusCode} onChange={(event) => setStatusCode(event.target.value)}>
            <option value="">All statuses</option>
            {['new-lead', 'awaiting-verification', 'verification-scheduled', 'consultation-completed', 'fee-pending', 'work-in-progress', 'immediate', 'completed', 'archived'].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <MetricCard label="Results" value={resource.data?.items?.length || 0} />
          <MetricCard
            label="Urgent"
            value={(resource.data?.items || []).filter((matter: any) => matter.operationalStatusCode === 'immediate').length}
          />
        </div>
      </SectionCard>

      <SectionCard title="Matters">
        <DataState error={resource.error} loading={resource.loading}>
          <div className="space-y-3">
            {(resource.data?.items || []).map((matter: any) => (
              <Link
                key={matter.id}
                className="block rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-5 transition hover:border-[#d7c5a8] hover:bg-white"
                to={`/matters/${matter.id}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg text-slate-900" style={{ fontFamily: 'var(--font-display-stack)' }}>
                        {matter.title}
                      </h3>
                      <StatusPill>{matter.operationalStatusCode}</StatusPill>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{matter.clientName} · {matter.currentStageLabel}</p>
                    <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                      <div>
                        <FieldLabel>Matter Number</FieldLabel>
                        <p className="mt-1 text-slate-900">{matter.matterNumber}</p>
                      </div>
                      <div>
                        <FieldLabel>Priority</FieldLabel>
                        <p className="mt-1 text-slate-900">{matter.priorityCode}</p>
                      </div>
                      <div>
                        <FieldLabel>Last Activity</FieldLabel>
                        <p className="mt-1 text-slate-900">{formatDateTime(matter.lastActivityAt)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-[#e7ded0] bg-white px-4 py-3 text-sm text-slate-700">
                    Open Matter 360
                    <ChevronRight size={16} />
                  </div>
                </div>
              </Link>
            ))}
            {!resource.data?.items?.length ? <EmptyState message="No matters matched these filters." /> : null}
          </div>
        </DataState>
      </SectionCard>
    </div>
  );
};

const MatterDetailPage = () => {
  const params = useParams();
  const resource = useAdminResource(
    () => apiRequest<any>(`/v1/admin/matters/${params.matterId}`),
    [params.matterId]
  );
  const [stageForm, setStageForm] = useState({
    changeNote: '',
    operationalStatusCode: 'work-in-progress',
    stageCode: 'consultation',
    visibleToClient: true,
  });
  const [updateForm, setUpdateForm] = useState({
    bodyText: '',
    title: '',
    typeCode: 'status',
    visibleToClient: true,
  });
  const [noteForm, setNoteForm] = useState({ bodyText: '' });
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const submitStage = async (event: FormEvent) => {
    event.preventDefault();
    await apiRequest(`/v1/admin/matters/${params.matterId}/stage`, {
      body: stageForm,
      method: 'PATCH',
    });
    resource.reload();
    setActionMessage('Matter stage updated.');
  };

  const submitUpdate = async (event: FormEvent) => {
    event.preventDefault();
    await apiRequest(`/v1/admin/matters/${params.matterId}/updates`, {
      body: updateForm,
      method: 'POST',
    });
    setUpdateForm({
      bodyText: '',
      title: '',
      typeCode: 'status',
      visibleToClient: true,
    });
    resource.reload();
    setActionMessage('Client-visible matter update created.');
  };

  const submitNote = async (event: FormEvent) => {
    event.preventDefault();
    await apiRequest(`/v1/admin/matters/${params.matterId}/internal-notes`, {
      body: noteForm,
      method: 'POST',
    });
    setNoteForm({ bodyText: '' });
    resource.reload();
    setActionMessage('Internal matter note saved.');
  };

  const uploadMatterDocuments = async (event: FormEvent) => {
    event.preventDefault();
    if (!uploadFiles.length || !params.matterId) {
      return;
    }

    setUploading(true);
    try {
      await uploadAdminFiles(uploadFiles, {
        relatedEntityId: params.matterId,
        relatedEntityType: 'matter',
        sourceModule: 'admin_matter_360',
      });
      setUploadFiles([]);
      resource.reload();
      setActionMessage(`${uploadFiles.length} document${uploadFiles.length === 1 ? '' : 's'} uploaded to the matter.`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {actionMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionMessage}
        </div>
      ) : null}

      <DataState error={resource.error} loading={resource.loading}>
        <PageHeader
          eyebrow="Matter 360"
          title={resource.data?.matter?.title || 'Matter Workspace'}
          description={resource.data?.matter?.issueSummary || 'Operations view for the full case record, updates, documents, meetings, and client communication.'}
          actions={
            <>
              {resource.data?.matter?.clientAccountId ? (
                <Link className="rounded-2xl border border-[#d9cfbf] bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-[#f3ecdf]" to={`/clients/${resource.data.matter.clientAccountId}`}>
                  Open Client 360
                </Link>
              ) : null}
              <Link className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" to={`/messages?thread=${resource.data?.threads?.[0]?.id || ''}`}>
                Open Message Desk
              </Link>
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Matter Number" value={resource.data?.matter?.matterNumber || 'Not available'} />
          <MetricCard label="Stage" value={resource.data?.matter?.currentStageLabel || 'Not available'} />
          <MetricCard label="Status" value={resource.data?.matter?.operationalStatusCode || 'Not available'} />
          <MetricCard label="Priority" value={resource.data?.matter?.priorityCode || 'Not available'} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Stage Control">
            <form className="space-y-3" onSubmit={submitStage}>
              <select className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" value={stageForm.stageCode} onChange={(event) => setStageForm((current) => ({ ...current, stageCode: event.target.value }))}>
                {['request-received', 'verification-call', 'consultation', 'action-plan', 'resolution'].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <select className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" value={stageForm.operationalStatusCode} onChange={(event) => setStageForm((current) => ({ ...current, operationalStatusCode: event.target.value }))}>
                {['new-lead', 'awaiting-verification', 'verification-scheduled', 'consultation-completed', 'fee-pending', 'work-in-progress', 'immediate', 'completed', 'archived'].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <textarea className="h-28 w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Change note" value={stageForm.changeNote} onChange={(event) => setStageForm((current) => ({ ...current, changeNote: event.target.value }))} />
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input checked={stageForm.visibleToClient} type="checkbox" onChange={(event) => setStageForm((current) => ({ ...current, visibleToClient: event.target.checked }))} />
                Visible to client
              </label>
              <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="submit">Update Stage</button>
            </form>
          </SectionCard>

          <div className="space-y-6">
            <SectionCard title="Client Update">
              <form className="space-y-3" onSubmit={submitUpdate}>
                <input className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Update title" value={updateForm.title} onChange={(event) => setUpdateForm((current) => ({ ...current, title: event.target.value }))} />
                <textarea className="h-28 w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Update body" value={updateForm.bodyText} onChange={(event) => setUpdateForm((current) => ({ ...current, bodyText: event.target.value }))} />
                <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="submit">Publish Update</button>
              </form>
            </SectionCard>

            <SectionCard title="Internal Note">
              <form className="space-y-3" onSubmit={submitNote}>
                <textarea className="h-28 w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Internal note for ops team" value={noteForm.bodyText} onChange={(event) => setNoteForm({ bodyText: event.target.value })} />
                <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="submit">Save Internal Note</button>
              </form>
            </SectionCard>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard title="Matter Summary">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Client</FieldLabel>
                <p className="mt-2 text-slate-900">{resource.data?.matter?.clientName}</p>
              </div>
              <div>
                <FieldLabel>Opened</FieldLabel>
                <p className="mt-2 text-slate-900">{formatDate(resource.data?.matter?.openedAt)}</p>
              </div>
              <div>
                <FieldLabel>Domain</FieldLabel>
                <p className="mt-2 text-slate-900">{resource.data?.matter?.legalDomainName}</p>
              </div>
              <div>
                <FieldLabel>Urgency</FieldLabel>
                <p className="mt-2 text-slate-900">{resource.data?.matter?.urgencyCode}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <MetricCard label="Quoted" value={formatCurrency(resource.data?.matter?.totals?.quoted)} />
              <MetricCard label="Paid" value={formatCurrency(resource.data?.matter?.totals?.paid)} />
              <MetricCard label="Due" value={formatCurrency(resource.data?.matter?.totals?.due)} />
            </div>
          </SectionCard>

          <SectionCard title="Threads">
            <div className="space-y-3">
              {(resource.data?.threads || []).map((thread: any) => (
                <Link key={thread.id} className="block rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4 transition hover:border-[#d7c5a8] hover:bg-white" to={`/messages?thread=${thread.id}`}>
                  <p className="font-medium text-slate-900">{thread.subject || thread.threadNumber}</p>
                  <p className="mt-1 text-sm text-slate-500">{formatDateTime(thread.lastMessageAt)}</p>
                </Link>
              ))}
              {!resource.data?.threads?.length ? <EmptyState message="No threads have been opened for this matter." /> : null}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <SectionCard title="Meetings">
            <div className="space-y-3">
              {(resource.data?.events || []).map((entry: any) => (
                <Link key={entry.id} className="block rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4 transition hover:border-[#d7c5a8] hover:bg-white" to={`/events?event=${entry.id}`}>
                  <p className="font-medium text-slate-900">{entry.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{entry.statusCode} · {formatDateTime(entry.scheduledStartAt)}</p>
                </Link>
              ))}
              {!resource.data?.events?.length ? <EmptyState message="No meetings are linked to this matter." /> : null}
            </div>
          </SectionCard>

          <SectionCard title="Documents">
            <form className="space-y-3" onSubmit={uploadMatterDocuments}>
              <div className="rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Upload matter documents</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                      Files uploaded here become part of this matter and the client document trail.
                    </p>
                  </div>
                  {uploadFiles.length ? <StatusPill>{uploadFiles.length} selected</StatusPill> : null}
                </div>
                <input
                  className="mt-4 block w-full rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900"
                  multiple
                  type="file"
                  onChange={(event) => setUploadFiles(Array.from(event.target.files || []))}
                />
                <button
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={uploading || uploadFiles.length === 0}
                  type="submit"
                >
                  <Upload size={15} />
                  {uploading ? 'Uploading...' : 'Upload to Matter'}
                </button>
              </div>

              {(resource.data?.matter?.documents || []).map((document: any) => (
                <Link key={document.id} className="block rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4 transition hover:border-[#d7c5a8] hover:bg-white" to={`/documents?document=${document.id}`}>
                  <p className="font-medium text-slate-900">{document.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{document.latestFileName || document.documentNumber} · {document.visibilityScopeCode}</p>
                </Link>
              ))}
              {!resource.data?.matter?.documents?.length ? <EmptyState message="No documents are linked to this matter." /> : null}
            </form>
          </SectionCard>

          <SectionCard title="Client Updates">
            <div className="space-y-3">
              {(resource.data?.matter?.updates || []).map((update: any) => (
                <div key={update.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                  <p className="font-medium text-slate-900">{update.title || update.typeCode}</p>
                  <p className="mt-2 text-sm text-slate-600">{update.bodyText}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{formatDateTime(update.createdAt)}</p>
                </div>
              ))}
              {!resource.data?.matter?.updates?.length ? <EmptyState message="No client-visible updates have been published for this matter yet." /> : null}
            </div>
          </SectionCard>
        </div>
      </DataState>
    </div>
  );
};

const EventsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryEventId = new URLSearchParams(location.search).get('event');
  const events = useAdminResource(() => apiRequest<any>('/v1/admin/events'), []);
  const clients = useAdminResource(() => apiRequest<any>('/v1/admin/clients?limit=100'), []);
  const matters = useAdminResource(() => apiRequest<any>('/v1/admin/matters?limit=100'), []);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(queryEventId);
  const eventDetail = useAdminResource(
    () => (selectedEventId ? apiRequest<any>(`/v1/admin/events/${selectedEventId}`) : Promise.resolve(null)),
    [selectedEventId]
  );
  const [form, setForm] = useState({
    clientAccountId: '',
    clientVisibleFlag: true,
    locationText: '',
    matterId: '',
    modeCode: 'video',
    notes: '',
    scheduledEndAt: '',
    scheduledStartAt: '',
    statusCode: 'upcoming',
    timezoneName: 'Asia/Kolkata',
    title: '',
    typeCode: 'consultation',
  });
  const [message, setMessage] = useState<string | null>(null);

  const createEvent = async (event: FormEvent) => {
    event.preventDefault();
    const result = await apiRequest<{ eventId: string }>('/v1/admin/events', {
      body: {
        ...form,
        matterId: form.matterId || undefined,
      },
      method: 'POST',
    });
    setSelectedEventId(result.eventId);
    navigate(`/events?event=${result.eventId}`, { replace: true });
    events.reload();
    eventDetail.reload();
    setMessage('Meeting scheduled.');
  };

  const updateEvent = async () => {
    if (!selectedEventId) {
      return;
    }

    await apiRequest(`/v1/admin/events/${selectedEventId}`, {
      body: {
        ...form,
        matterId: form.matterId || undefined,
      },
      method: 'PUT',
    });
    events.reload();
    eventDetail.reload();
    setMessage('Meeting updated.');
  };

  const cancelEvent = async () => {
    if (!selectedEventId) {
      return;
    }

    await apiRequest(`/v1/admin/events/${selectedEventId}/cancel`, {
      body: { reasonText: 'Cancelled by admin' },
      method: 'POST',
    });
    events.reload();
    eventDetail.reload();
    setMessage('Meeting cancelled.');
  };

  useEffect(() => {
    if (!eventDetail.data) {
      return;
    }

    setForm({
      clientAccountId: eventDetail.data.clientAccountId || '',
      clientVisibleFlag: Boolean(eventDetail.data.clientVisibleFlag),
      locationText: eventDetail.data.locationText || '',
      matterId: eventDetail.data.matterId || '',
      modeCode: eventDetail.data.modeCode || 'video',
      notes: eventDetail.data.notes || '',
      scheduledEndAt: (eventDetail.data.scheduledEndAt || '').slice(0, 16),
      scheduledStartAt: (eventDetail.data.scheduledStartAt || '').slice(0, 16),
      statusCode: eventDetail.data.statusCode || 'upcoming',
      timezoneName: eventDetail.data.timezoneName || 'Asia/Kolkata',
      title: eventDetail.data.title || '',
      typeCode: eventDetail.data.typeCode || 'consultation',
    });
  }, [eventDetail.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Meeting Desk"
        title="Schedule, reschedule, cancel, and join meetings without leaving admin."
        description="This is the operations view for client-facing meetings. Admins control the schedule, visibility, and reminder flow; clients only see the final event and join link."
      />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <SectionCard title="Meetings Calendar">
        <DataState error={events.error} loading={events.loading}>
          <div className="space-y-3">
            {(events.data || []).map((entry: any) => (
              <button
                key={entry.id}
                className="w-full rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-4 text-left transition hover:border-[#d7c5a8] hover:bg-white"
                onClick={() => {
                  setSelectedEventId(entry.id);
                  navigate(`/events?event=${entry.id}`, { replace: true });
                }}
                type="button"
              >
                <p className="font-medium text-slate-900">{entry.title}</p>
                <p className="mt-1 text-sm text-slate-500">{entry.clientName} · {formatDateTime(entry.scheduledStartAt)}</p>
              </button>
            ))}
            {!events.data?.length ? <EmptyState message="No meetings are scheduled yet." /> : null}
          </div>
        </DataState>
      </SectionCard>

      <SectionCard title={selectedEventId ? 'Edit Meeting' : 'Schedule Meeting'}>
        {message ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
        <form className="grid gap-3 md:grid-cols-2" onSubmit={createEvent}>
          <select className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" value={form.clientAccountId} onChange={(event) => setForm((current) => ({ ...current, clientAccountId: event.target.value }))}>
            <option value="">Select client</option>
            {(clients.data?.items || []).map((client: any) => (
              <option key={client.id} value={client.id}>{client.displayName}</option>
            ))}
          </select>
          <select className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" value={form.matterId} onChange={(event) => setForm((current) => ({ ...current, matterId: event.target.value }))}>
            <option value="">Link matter (optional)</option>
            {(matters.data?.items || []).map((matter: any) => (
              <option key={matter.id} value={matter.id}>{matter.title}</option>
            ))}
          </select>
          <input className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900 md:col-span-2" placeholder="Meeting title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          <input className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" type="datetime-local" value={form.scheduledStartAt} onChange={(event) => setForm((current) => ({ ...current, scheduledStartAt: event.target.value }))} />
          <input className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" type="datetime-local" value={form.scheduledEndAt} onChange={(event) => setForm((current) => ({ ...current, scheduledEndAt: event.target.value }))} />
          <select className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" value={form.modeCode} onChange={(event) => setForm((current) => ({ ...current, modeCode: event.target.value }))}>
            {['video', 'phone', 'in-person'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <input className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Meeting type" value={form.typeCode} onChange={(event) => setForm((current) => ({ ...current, typeCode: event.target.value }))} />
          <input className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900 md:col-span-2" placeholder="Location or note" value={form.locationText} onChange={(event) => setForm((current) => ({ ...current, locationText: event.target.value }))} />
          <textarea className="h-32 rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900 md:col-span-2" placeholder="Meeting notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          <div className="md:col-span-2 rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm text-slate-600">
            {form.modeCode === 'video'
              ? 'Video meetings create or update the Google Meet link after the event is saved.'
              : form.modeCode === 'phone'
                ? 'Phone meetings do not create a Google Meet link. Put the dial-in number or bridge details in the location or notes field.'
                : 'In-person meetings do not create a Google Meet link. Use the location field for the venue details.'}
          </div>
          <label className="md:col-span-2 flex items-center gap-3 text-sm text-slate-600">
            <input checked={form.clientVisibleFlag} type="checkbox" onChange={(event) => setForm((current) => ({ ...current, clientVisibleFlag: event.target.checked }))} />
            Show this meeting on the client dashboard
          </label>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white" type="submit">
              Schedule Meeting
            </button>
            {selectedEventId ? (
              <>
                <button className="rounded-2xl border border-[#d9cfbf] bg-white px-5 py-3 text-sm text-slate-700" onClick={() => void updateEvent()} type="button">
                  Save Changes
                </button>
                <button className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-5 py-3 text-sm text-rose-100" onClick={() => void cancelEvent()} type="button">
                  Cancel Meeting
                </button>
              </>
            ) : null}
          </div>
        </form>

        {eventDetail.data ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {eventDetail.data.hostUrl || eventDetail.data.joinUrl ? (
              <a className="rounded-2xl border border-[#d9cfbf] bg-white px-4 py-3 text-sm text-slate-700 hover:bg-[#f3ecdf]" href={eventDetail.data.hostUrl || eventDetail.data.joinUrl || '#'} rel="noreferrer" target="_blank">
                Join from Admin Panel
              </a>
            ) : (
              <div className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm text-slate-600">
                {eventDetail.data.modeCode === 'video'
                  ? 'Waiting for Google Meet sync or provider configuration.'
                  : 'This meeting mode does not generate a join link.'}
              </div>
            )}
            <div className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm text-slate-600">
              Reminder rows: {(eventDetail.data.reminders || []).length}
            </div>
          </div>
        ) : null}
      </SectionCard>
      </div>
    </div>
  );
};

const MessagesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const preselectedThread = searchParams.get('thread');
  const initialSearch = searchParams.get('search') || '';
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(preselectedThread);
  const [search, setSearch] = useState(initialSearch);
  const threads = useAdminResource(
    () => apiRequest<any>(`/v1/admin/messages/threads?search=${encodeURIComponent(search)}`),
    [search]
  );
  const thread = useAdminResource(
    () => (selectedThreadId ? apiRequest<any>(`/v1/admin/messages/threads/${selectedThreadId}`) : Promise.resolve(null)),
    [selectedThreadId]
  );
  const [reply, setReply] = useState('');
  const [selectedAttachmentDocumentIds, setSelectedAttachmentDocumentIds] = useState<string[]>([]);
  const [uploadFilesState, setUploadFilesState] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const activeThread = selectedThreadId
    ? (threads.data?.items || []).find((entry: any) => entry.id === selectedThreadId) || null
    : threads.data?.items?.[0] || null;

  const sendReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedThreadId || !reply.trim()) {
      return;
    }

    await apiRequest(`/v1/admin/messages/threads/${selectedThreadId}/replies`, {
      body: {
        attachmentDocumentIds: selectedAttachmentDocumentIds,
        bodyText: reply.trim(),
      },
      method: 'POST',
    });
    setReply('');
    setSelectedAttachmentDocumentIds([]);
    thread.reload();
    threads.reload();
  };

  useEffect(() => {
    setSelectedAttachmentDocumentIds([]);
    setUploadFilesState([]);
  }, [selectedThreadId]);

  const uploadThreadDocuments = async () => {
    if (!selectedThreadId || uploadFilesState.length === 0) {
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadAdminFiles(uploadFilesState, {
        relatedEntityId: selectedThreadId,
        relatedEntityType: 'thread',
        sourceModule: 'admin_message_desk',
      });
      const nextThread = await apiRequest<any>(`/v1/admin/messages/threads/${selectedThreadId}`);
      thread.setData(nextThread);
      threads.reload();
      setSelectedAttachmentDocumentIds((current) => {
        const appended = mapUploadedFilesToAttachmentIds(uploaded, nextThread.availableAttachments || []);
        return Array.from(new Set([...current, ...appended]));
      });
      setUploadFilesState([]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Messaging Desk"
        title="Every client conversation in one clearer workspace."
        description="Search by client, matter, or subject. Open the thread, review the latest context, and reply without jumping between multiple admin pages."
        actions={
          <div className="relative min-w-[300px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="w-full rounded-2xl border border-[#dfd5c7] bg-white px-10 py-3 text-sm text-slate-900 outline-none transition focus:border-[#baa283]"
              placeholder="Search threads by client, matter, or subject"
              value={search}
              onChange={(event) => {
                const nextSearch = event.target.value;
                setSearch(nextSearch);
                const nextParams = new URLSearchParams(location.search);
                if (nextSearch.trim()) {
                  nextParams.set('search', nextSearch);
                } else {
                  nextParams.delete('search');
                }
                navigate(`/messages?${nextParams.toString()}`, { replace: true });
              }}
            />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <SectionCard title="Conversations">
          <DataState error={threads.error} loading={threads.loading}>
            <div className="space-y-3">
              {(threads.data?.items || []).map((entry: any) => {
                const isActive = activeThread?.id === entry.id;

                return (
                  <button
                    key={entry.id}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      isActive
                        ? 'border-[#cbb492] bg-white shadow-[0_12px_32px_rgba(47,35,18,0.08)]'
                        : 'border-[#e7ded0] bg-[#fbf8f3] hover:border-[#d7c5a8] hover:bg-white'
                    }`}
                    onClick={() => {
                      setSelectedThreadId(entry.id);
                      const nextParams = new URLSearchParams(location.search);
                      nextParams.set('thread', entry.id);
                      navigate(`/messages?${nextParams.toString()}`, { replace: true });
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{entry.subject || entry.threadNumber}</p>
                        <p className="mt-1 text-sm text-slate-500">{entry.clientName}</p>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                          {entry.lastMessageText || 'No preview available'}
                        </p>
                      </div>
                      <div className="text-right">
                        <StatusPill>{entry.statusCode || 'active'}</StatusPill>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                          {formatDateTime(entry.lastMessageAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!threads.data?.items?.length ? <EmptyState message="No threads matched that search." /> : null}
            </div>
          </DataState>
        </SectionCard>

        <SectionCard title={thread.data?.subject || activeThread?.subject || 'Thread Detail'}>
          <DataState error={thread.error} loading={thread.loading}>
            {activeThread ? (
              <>
                <div className="rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-lg text-slate-900" style={{ fontFamily: 'var(--font-display-stack)' }}>
                        {activeThread.subject || activeThread.threadNumber}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{activeThread.clientName} · {activeThread.matterTitle || 'General inquiry'}</p>
                    </div>
                    {activeThread.matterId ? (
                      <Link className="inline-flex items-center gap-2 rounded-2xl border border-[#d9cfbf] bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:bg-[#f3ecdf]" to={`/matters/${activeThread.matterId}`}>
                        Open Matter 360
                        <ArrowRight size={15} />
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {(thread.data?.messages || []).map((message: any) => {
                    const isClientMessage = message.senderSystemCode === 'client' || message.senderRoleCode === 'client';

                    return (
                      <div key={message.id} className={`flex ${isClientMessage ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[78%] rounded-[24px] px-5 py-4 shadow-sm ${
                            isClientMessage
                              ? 'bg-slate-900 text-white'
                              : 'border border-[#e7ded0] bg-[#fbf8f3] text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isClientMessage ? 'text-white/70' : 'text-slate-500'}`}>
                              {message.senderName || message.senderSystemCode || 'Unknown sender'}
                            </p>
                            <p className={`text-[11px] ${isClientMessage ? 'text-white/60' : 'text-slate-400'}`}>
                              {formatDateTime(message.sentAt)}
                            </p>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{message.bodyText}</p>
                          {(message.attachments || []).length ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {message.attachments.map((attachment: any) => (
                                <Link
                                  key={attachment.documentId}
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${
                                    isClientMessage
                                      ? 'bg-white/15 text-white'
                                      : 'border border-[#d9cfbf] bg-white text-slate-700'
                                  }`}
                                  to={`/documents?document=${attachment.documentId}`}
                                >
                                  <Paperclip size={12} />
                                  {attachment.originalFileName}
                                </Link>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {!thread.data?.messages?.length ? <EmptyState message="This thread does not have any messages yet." /> : null}
                </div>

                {selectedThreadId ? (
                  <form className="mt-6 space-y-3" onSubmit={sendReply}>
                    <textarea className="h-36 w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Reply to the client thread" value={reply} onChange={(event) => setReply(event.target.value)} />
                    <div className="rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">Attach client documents</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            Only documents from this client are available here.
                          </p>
                        </div>
                        {selectedAttachmentDocumentIds.length ? (
                          <StatusPill>{selectedAttachmentDocumentIds.length} selected</StatusPill>
                        ) : null}
                      </div>
                      <div className="mt-4 rounded-2xl border border-[#dfd5c7] bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">Upload new attachment</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                              Upload first, then it becomes selectable inside this thread.
                            </p>
                          </div>
                          {uploadFilesState.length ? <StatusPill>{uploadFilesState.length} selected</StatusPill> : null}
                        </div>
                        <input
                          className="mt-4 block w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                          multiple
                          type="file"
                          onChange={(event) => setUploadFilesState(Array.from(event.target.files || []))}
                        />
                        <button
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[#d9cfbf] bg-white px-4 py-2 text-sm text-slate-700 disabled:opacity-60"
                          disabled={uploading || uploadFilesState.length === 0}
                          onClick={() => void uploadThreadDocuments()}
                          type="button"
                        >
                          <Upload size={14} />
                          {uploading ? 'Uploading...' : 'Upload for This Thread'}
                        </button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(thread.data?.availableAttachments || []).map((attachment: any) => {
                          const selected = selectedAttachmentDocumentIds.includes(attachment.documentId);
                          return (
                            <button
                              key={attachment.documentId}
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition ${
                                selected
                                  ? 'border-[#baa283] bg-white text-slate-900'
                                  : 'border-[#dfd5c7] bg-[#faf6f0] text-slate-700'
                              }`}
                              onClick={() =>
                                setSelectedAttachmentDocumentIds((current) =>
                                  current.includes(attachment.documentId)
                                    ? current.filter((entry) => entry !== attachment.documentId)
                                    : [...current, attachment.documentId]
                                )
                              }
                              type="button"
                            >
                              <Paperclip size={12} />
                              {attachment.originalFileName || attachment.title}
                            </button>
                          );
                        })}
                      </div>
                      {!thread.data?.availableAttachments?.length ? (
                        <p className="mt-3 text-sm text-slate-500">
                          No client documents are available to attach for this thread yet.
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white" type="submit">Send Reply</button>
                      <p className="self-center text-sm text-slate-500">Replies can only attach documents that belong to this client.</p>
                    </div>
                  </form>
                ) : null}
              </>
            ) : (
              <EmptyState message="Select a conversation from the left to review the full thread." />
            )}
          </DataState>
        </SectionCard>
      </div>
    </div>
  );
};

const DocumentsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedDocumentId = new URLSearchParams(location.search).get('document');
  const [search, setSearch] = useState('');
  const resource = useAdminResource(
    () => apiRequest<any>(`/v1/admin/documents?search=${encodeURIComponent(search)}`),
    [search]
  );
  const detail = useAdminResource(
    () => (selectedDocumentId ? apiRequest<any>(`/v1/admin/documents/${selectedDocumentId}`) : Promise.resolve(null)),
    [selectedDocumentId]
  );
  const previewMimeType =
    detail.data?.latestVersion?.mimeType || detail.data?.versions?.[0]?.mimeType || null;
  const previewResource = useAdminResource(
    () =>
      selectedDocumentId && isInlinePreviewableMimeType(previewMimeType)
        ? apiBinary(`/v1/admin/documents/${selectedDocumentId}/preview`)
        : Promise.resolve(null),
    [selectedDocumentId, previewMimeType]
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);

  const downloadDocument = async (documentId: string) => {
    const result = await apiDownload(`/v1/admin/documents/${documentId}/download`);
    triggerBrowserDownload(result.blob, result.fileName);
  };

  const updateVisibility = async (documentId: string, visibilityScopeCode: string) => {
    await apiRequest(`/v1/admin/documents/${documentId}/visibility`, {
      body: { visibilityScopeCode },
      method: 'PATCH',
    });
    resource.reload();
  };

  useEffect(() => {
    let active = true;

    if (!previewResource.data) {
      setPreviewUrl(null);
      setPreviewText(null);
      return;
    }

    const mimeType = previewResource.data.mimeType || previewMimeType || '';
    if (isTextPreviewMimeType(mimeType)) {
      void previewResource.data.blob.text().then((text) => {
        if (!active) {
          return;
        }

        setPreviewText(text);
        setPreviewUrl(null);
      });

      return () => {
        active = false;
      };
    }

    const objectUrl = URL.createObjectURL(previewResource.data.blob);
    setPreviewUrl(objectUrl);
    setPreviewText(null);

    return () => {
      active = false;
      URL.revokeObjectURL(objectUrl);
    };
  }, [previewMimeType, previewResource.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Document Control"
        title="Documents should be obvious, not buried."
        description="Search by title, document number, or client. Open the document record to see the linked matter, latest version, visibility, and download path."
        actions={
          <div className="relative min-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="w-full rounded-2xl border border-[#dfd5c7] bg-white px-10 py-3 text-sm text-slate-900 outline-none transition focus:border-[#baa283]"
              placeholder="Search documents or client names"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Documents">
          <DataState error={resource.error} loading={resource.loading}>
            <div className="space-y-3">
              {(resource.data?.items || []).map((document: any) => {
                const isSelected = document.id === selectedDocumentId;

                return (
                  <button
                    key={document.id}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      isSelected
                        ? 'border-[#cbb492] bg-white shadow-[0_12px_32px_rgba(47,35,18,0.08)]'
                        : 'border-[#e7ded0] bg-[#fbf8f3] hover:border-[#d7c5a8] hover:bg-white'
                    }`}
                    onClick={() => navigate(`/documents?document=${document.id}`, { replace: true })}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{document.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{document.clientName}</p>
                        <p className="mt-2 text-sm text-slate-600">{document.latestFileName || 'No current file name yet'}</p>
                      </div>
                      <StatusPill>{document.visibilityScopeCode}</StatusPill>
                    </div>
                  </button>
                );
              })}
              {!resource.data?.items?.length ? <EmptyState message="No documents matched that search." /> : null}
            </div>
          </DataState>
        </SectionCard>

        <SectionCard title="Document Detail">
          <DataState error={detail.error} loading={detail.loading}>
            {detail.data ? (
              <div className="space-y-5">
                <div className="rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-5">
                  <p className="text-lg text-slate-900" style={{ fontFamily: 'var(--font-display-stack)' }}>
                    {detail.data.title}
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel>Document Number</FieldLabel>
                      <p className="mt-2 text-slate-900">{detail.data.documentNumber}</p>
                    </div>
                    <div>
                      <FieldLabel>Visibility</FieldLabel>
                      <p className="mt-2 text-slate-900">{detail.data.visibilityScopeCode}</p>
                    </div>
                    <div>
                      <FieldLabel>Category</FieldLabel>
                      <p className="mt-2 text-slate-900">{detail.data.categoryCode}</p>
                    </div>
                    <div>
                      <FieldLabel>Owner Client</FieldLabel>
                      <Link className="mt-2 block text-slate-900 underline-offset-4 hover:underline" to={`/clients/${detail.data.ownerClientAccountId}`}>
                        {(resource.data?.items || []).find(
                          (entry: any) => entry.ownerClientAccountId === detail.data.ownerClientAccountId
                        )?.clientName || detail.data.ownerClientAccountId}
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-3">
                    <FieldLabel>Linked Records</FieldLabel>
                    {(detail.data.linkedEntities || []).map((entity: any) => (
                      <div key={`${entity.type}-${entity.id}`} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm text-slate-700">
                        {entity.type} · {entity.label}
                      </div>
                    ))}
                    {!detail.data.linkedEntities?.length ? <EmptyState message="This document is not linked to any matter or invoice record." /> : null}
                  </div>

                  <div className="space-y-3">
                    <FieldLabel>Versions</FieldLabel>
                    {(detail.data.versions || []).map((version: any) => (
                      <div key={version.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-slate-900">{version.originalFileName}</p>
                            <p className="mt-1 text-sm text-slate-500">Version {version.versionNo} · {version.mimeType}</p>
                          </div>
                          <StatusPill>{version.isCurrent ? 'current' : 'archived'}</StatusPill>
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{formatDateTime(version.uploadedAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <FieldLabel>Inline Preview</FieldLabel>
                  <div className="overflow-hidden rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3]">
                    {previewResource.loading ? (
                      <div className="p-6 text-sm text-slate-500">Loading document preview...</div>
                    ) : previewText ? (
                      <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap p-6 text-sm leading-7 text-slate-700">
                        {previewText}
                      </pre>
                    ) : previewUrl && previewMimeType?.startsWith('image/') ? (
                      <div className="flex justify-center bg-white p-6">
                        <img alt={detail.data.title} className="max-h-[520px] rounded-2xl object-contain" src={previewUrl} />
                      </div>
                    ) : previewUrl ? (
                      <iframe className="h-[520px] w-full bg-white" src={previewUrl} title={`${detail.data.title} preview`} />
                    ) : (
                      <div className="p-6 text-sm text-slate-500">
                        This file type does not support inline preview yet. Use download for the original file.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <select
                    className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                    defaultValue={detail.data.visibilityScopeCode}
                    onChange={(event) => void updateVisibility(detail.data.id, event.target.value)}
                  >
                    {['internal', 'shared', 'client'].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" onClick={() => void downloadDocument(detail.data.id)} type="button">
                    <Download size={16} />
                    Download
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState message="Select a document from the left to inspect versions, visibility, and linked records." />
            )}
          </DataState>
        </SectionCard>
      </div>
    </div>
  );
};

const BillingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedInvoiceId = new URLSearchParams(location.search).get('invoice');
  const overview = useAdminResource(() => apiRequest<any>('/v1/admin/billing/overview'), []);
  const invoices = useAdminResource(() => apiRequest<any>('/v1/admin/billing/invoices'), []);
  const payments = useAdminResource(() => apiRequest<any>('/v1/admin/billing/payments'), []);
  const refunds = useAdminResource(() => apiRequest<any>('/v1/admin/billing/refunds'), []);
  const clients = useAdminResource(() => apiRequest<any>('/v1/admin/clients?limit=200'), []);
  const matters = useAdminResource(() => apiRequest<any>('/v1/admin/matters?limit=200'), []);
  const invoiceDetail = useAdminResource(
    () =>
      selectedInvoiceId
        ? apiRequest<any>(`/v1/admin/billing/invoices/${selectedInvoiceId}`)
        : Promise.resolve(null),
    [selectedInvoiceId]
  );
  const [designerForm, setDesignerForm] = useState({
    billingSnapshot: {
      addressLine1: '',
      addressLine2: '',
      billingEmail: '',
      billingName: '',
      billingPhone: '',
      city: '',
      countryCode: 'IN',
      gstin: '',
      postalCode: '',
      state: '',
    },
    clientAccountId: '',
    currencyCode: 'INR',
    dueDate: '',
    issueDate: new Date().toISOString().slice(0, 10),
    lines: [
      {
        description: '',
        discountAmount: '0',
        quantity: '1',
        taxCode: 'GST',
        taxName: 'GST',
        taxPercent: '18',
        unitPrice: '',
      },
    ],
    matterId: '',
    messageText: '',
    packageDescription: '',
    packageName: '',
    recipientEmail: '',
    sendEmailNow: true,
  });
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [refundForm, setRefundForm] = useState({
    amount: '',
    invoiceId: '',
    paymentId: '',
    reasonText: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    allocations: [
      {
        amountApplied: '',
        installmentId: '',
        invoiceId: '',
      },
    ],
    amount: '',
    clientAccountId: '',
    currencyCode: 'INR',
    gatewayOrderRef: '',
    gatewayPaymentRef: '',
    initiatedAt: '',
    noteText: '',
    paymentProviderCode: 'manual-admin',
  });
  const [emailForm, setEmailForm] = useState({
    messageText: '',
    recipientEmail: '',
  });
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const selectedClientDetail = useAdminResource(
    () =>
      designerForm.clientAccountId
        ? apiRequest<any>(`/v1/admin/clients/${designerForm.clientAccountId}`)
        : Promise.resolve(null),
    [designerForm.clientAccountId]
  );

  const downloadInvoicePdf = async (invoiceId: string) => {
    const result = await apiDownload(`/v1/admin/billing/invoices/${invoiceId}/pdf`);
    triggerBrowserDownload(result.blob, result.fileName);
  };

  const sendInvoiceEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (!invoiceDetail.data?.id) {
      return;
    }

    const response = await apiRequest<{ recipientEmail: string }>(
      `/v1/admin/billing/invoices/${invoiceDetail.data.id}/send-email`,
      {
        body: {
          messageText: emailForm.messageText || undefined,
          recipientEmail: emailForm.recipientEmail || undefined,
        },
        method: 'POST',
      }
    );

    setBillingMessage(`Invoice emailed to ${response.recipientEmail}.`);
    setEmailForm({
      messageText: '',
      recipientEmail: '',
    });
  };

  const createRefund = async (event: FormEvent) => {
    event.preventDefault();
    await apiRequest('/v1/admin/billing/refunds', {
      body: {
        amount: Number(refundForm.amount),
        invoiceId: refundForm.invoiceId || undefined,
        paymentId: refundForm.paymentId,
        reasonText: refundForm.reasonText,
      },
      method: 'POST',
    });
    overview.reload();
    refunds.reload();
    setRefundForm({
      amount: '',
      invoiceId: '',
      paymentId: '',
      reasonText: '',
    });
    setBillingMessage('Refund request created.');
  };

  const createManualPayment = async (event: FormEvent) => {
    event.preventDefault();
    await apiRequest('/v1/admin/billing/payments', {
      body: {
        allocations: paymentForm.allocations.map((allocation) => ({
          amountApplied: Number(allocation.amountApplied || 0),
          installmentId: allocation.installmentId ? Number(allocation.installmentId) : undefined,
          invoiceId: allocation.invoiceId,
        })),
        amount: Number(paymentForm.amount || 0),
        clientAccountId: paymentForm.clientAccountId,
        currencyCode: paymentForm.currencyCode,
        gatewayOrderRef: paymentForm.gatewayOrderRef || undefined,
        gatewayPaymentRef: paymentForm.gatewayPaymentRef || undefined,
        initiatedAt: paymentForm.initiatedAt
          ? new Date(paymentForm.initiatedAt).toISOString()
          : undefined,
        noteText: paymentForm.noteText || undefined,
        paymentProviderCode: paymentForm.paymentProviderCode,
      },
      method: 'POST',
    });
    overview.reload();
    invoices.reload();
    payments.reload();
    setPaymentForm({
      allocations: [
        {
          amountApplied: '',
          installmentId: '',
          invoiceId: '',
        },
      ],
      amount: '',
      clientAccountId: '',
      currencyCode: 'INR',
      gatewayOrderRef: '',
      gatewayPaymentRef: '',
      initiatedAt: '',
      noteText: '',
      paymentProviderCode: 'manual-admin',
    });
    setBillingMessage('Manual payment recorded and allocated.');
  };

  const createPackageInvoice = async (event: FormEvent) => {
    event.preventDefault();

    const result = await apiRequest<{ invoiceId: string; invoiceNumber: string }>(
      '/v1/admin/billing/invoices',
      {
        body: {
          billingSnapshot: {
            ...designerForm.billingSnapshot,
            addressLine2: designerForm.billingSnapshot.addressLine2 || undefined,
            gstin: designerForm.billingSnapshot.gstin || undefined,
          },
          clientAccountId: designerForm.clientAccountId,
          currencyCode: designerForm.currencyCode,
          dueDate: designerForm.dueDate,
          issueDate: designerForm.issueDate,
          lines: designerForm.lines.map((line) => ({
            description: line.description,
            discountAmount: Number(line.discountAmount || 0),
            quantity: Number(line.quantity || 0),
            taxCode: line.taxCode || undefined,
            taxName: line.taxName || undefined,
            taxPercent: Number(line.taxPercent || 0),
            unitPrice: Number(line.unitPrice || 0),
          })),
          matterId: designerForm.matterId,
          messageText: designerForm.messageText || undefined,
          packageDescription: designerForm.packageDescription || undefined,
          packageName: designerForm.packageName,
          recipientEmail: designerForm.recipientEmail || undefined,
          sendEmailNow: designerForm.sendEmailNow,
        },
        method: 'POST',
      }
    );

    invoices.reload();
    overview.reload();
    navigate(`/billing?invoice=${result.invoiceId}`, { replace: true });
    invoiceDetail.reload();
    setBillingMessage(
      designerForm.sendEmailNow
        ? `Invoice ${result.invoiceNumber} created and emailed.`
        : `Invoice ${result.invoiceNumber} created.`
    );
  };

  const visibleMatters = (matters.data?.items || []).filter((matter: any) =>
    designerForm.clientAccountId ? matter.clientAccountId === designerForm.clientAccountId : true
  );
  const visiblePaymentInvoices = (invoices.data || []).filter((invoice: any) =>
    paymentForm.clientAccountId ? invoice.clientAccountId === paymentForm.clientAccountId : true
  );

  const updatePaymentAllocation = (
    index: number,
    field: 'amountApplied' | 'installmentId' | 'invoiceId',
    value: string
  ) => {
    setPaymentForm((current) => ({
      ...current,
      allocations: current.allocations.map((allocation, allocationIndex) =>
        allocationIndex === index
          ? {
              ...allocation,
              [field]: value,
            }
          : allocation
      ),
    }));
  };

  const updateDesignerLine = (
    index: number,
    field: 'description' | 'discountAmount' | 'quantity' | 'taxCode' | 'taxName' | 'taxPercent' | 'unitPrice',
    value: string
  ) => {
    setDesignerForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [field]: value,
            }
          : line
      ),
    }));
  };

  useEffect(() => {
    if (!selectedClientDetail.data?.client) {
      return;
    }

    const client = selectedClientDetail.data.client;
    const billingContact =
      (client.contacts || []).find((entry: any) => entry.isBilling) ||
      (client.contacts || []).find((entry: any) => entry.isPrimary) ||
      (client.contacts || [])[0] ||
      null;
    const address =
      (client.addresses || []).find((entry: any) => entry.isPrimary) ||
      (client.addresses || [])[0] ||
      null;

    setDesignerForm((current) => ({
      ...current,
      billingSnapshot: {
        ...current.billingSnapshot,
        addressLine1:
          current.billingSnapshot.addressLine1 ||
          address?.line1 ||
          current.billingSnapshot.addressLine1,
        addressLine2:
          current.billingSnapshot.addressLine2 ||
          address?.line2 ||
          current.billingSnapshot.addressLine2,
        billingEmail:
          current.billingSnapshot.billingEmail ||
          billingContact?.email ||
          client.primaryEmail ||
          '',
        billingName:
          current.billingSnapshot.billingName ||
          billingContact?.name ||
          client.displayName ||
          '',
        billingPhone:
          current.billingSnapshot.billingPhone ||
          billingContact?.phone ||
          client.primaryPhone ||
          '',
        city: current.billingSnapshot.city || address?.city || '',
        countryCode: current.billingSnapshot.countryCode || address?.countryCode || 'IN',
        gstin: current.billingSnapshot.gstin || '',
        postalCode: current.billingSnapshot.postalCode || address?.postalCode || '',
        state: current.billingSnapshot.state || address?.state || '',
      },
      recipientEmail: current.recipientEmail || billingContact?.email || client.primaryEmail || '',
    }));
  }, [selectedClientDetail.data]);

  const visibleInvoices = (invoices.data || []).filter((invoice: any) => {
    if (!invoiceSearch.trim()) {
      return true;
    }

    const query = invoiceSearch.trim().toLowerCase();
    return (
      String(invoice.invoiceNumber || '').toLowerCase().includes(query) ||
      String(invoice.clientAccountId || '').toLowerCase().includes(query) ||
      String(invoice.statusCode || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing Operations"
        title="Invoices, payments, overdue collections, refunds, and client delivery."
        description="Use this workspace to inspect every invoice accurately, download the server PDF, email it to the client, and track what is paid, overdue, or awaiting refund action."
      />

      {billingMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {billingMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <DataState error={overview.error} loading={overview.loading}>
          {Object.entries(overview.data || {}).map(([label, value]) => (
            <MetricCard key={label} label={toTitleCase(label)} value={String(value)} />
          ))}
        </DataState>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Invoices"
          action={
            <div className="relative min-w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-10 py-3 text-sm text-slate-900 outline-none transition focus:border-[#baa283]"
                placeholder="Filter invoices by number or status"
                value={invoiceSearch}
                onChange={(event) => setInvoiceSearch(event.target.value)}
              />
            </div>
          }
        >
          <DataState error={invoices.error} loading={invoices.loading}>
            <div className="space-y-3">
              {visibleInvoices.map((invoice: any) => (
                <div key={invoice.id} className="rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{invoice.invoiceNumber}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {invoice.statusCode} · Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        Total {formatCurrency(invoice.totalAmount, invoice.currencyCode)} · Due {formatCurrency(invoice.amountDue, invoice.currencyCode)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="inline-flex items-center gap-2 rounded-2xl border border-[#d9cfbf] bg-white px-4 py-2 text-sm text-slate-700"
                        onClick={() => navigate(`/billing?invoice=${invoice.id}`, { replace: true })}
                        type="button"
                      >
                        <Eye size={15} />
                        View Detail
                      </button>
                      <button className="inline-flex items-center gap-2 rounded-2xl border border-[#d9cfbf] bg-white px-4 py-2 text-sm text-slate-700" onClick={() => void downloadInvoicePdf(invoice.id)} type="button">
                        <Download size={15} />
                        Download PDF
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!visibleInvoices.length ? <EmptyState message="No invoices matched that filter." /> : null}
            </div>
          </DataState>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Package Designer">
            <form className="space-y-4" onSubmit={createPackageInvoice}>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                  value={designerForm.clientAccountId}
                  onChange={(event) =>
                    setDesignerForm((current) => ({
                      ...current,
                      clientAccountId: event.target.value,
                      matterId: '',
                    }))
                  }
                >
                  <option value="">Select client</option>
                  {(clients.data?.items || []).map((client: any) => (
                    <option key={client.id} value={client.id}>
                      {client.displayName}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                  value={designerForm.matterId}
                  onChange={(event) =>
                    setDesignerForm((current) => ({ ...current, matterId: event.target.value }))
                  }
                >
                  <option value="">Select matter</option>
                  {visibleMatters.map((matter: any) => (
                    <option key={matter.id} value={matter.id}>
                      {matter.title}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                  placeholder="Package name"
                  value={designerForm.packageName}
                  onChange={(event) =>
                    setDesignerForm((current) => ({ ...current, packageName: event.target.value }))
                  }
                />
                <input
                  className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                  placeholder="Recipient email"
                  value={designerForm.recipientEmail}
                  onChange={(event) =>
                    setDesignerForm((current) => ({ ...current, recipientEmail: event.target.value }))
                  }
                />
                <input
                  className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                  type="date"
                  value={designerForm.issueDate}
                  onChange={(event) =>
                    setDesignerForm((current) => ({ ...current, issueDate: event.target.value }))
                  }
                />
                <input
                  className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                  type="date"
                  value={designerForm.dueDate}
                  onChange={(event) =>
                    setDesignerForm((current) => ({ ...current, dueDate: event.target.value }))
                  }
                />
                <textarea
                  className="h-24 rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900 md:col-span-2"
                  placeholder="Package description"
                  value={designerForm.packageDescription}
                  onChange={(event) =>
                    setDesignerForm((current) => ({
                      ...current,
                      packageDescription: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Line items</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                      Build the package and the invoice together.
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#d9cfbf] bg-white px-4 py-2 text-sm text-slate-700"
                    onClick={() =>
                      setDesignerForm((current) => ({
                        ...current,
                        lines: [
                          ...current.lines,
                          {
                            description: '',
                            discountAmount: '0',
                            quantity: '1',
                            taxCode: 'GST',
                            taxName: 'GST',
                            taxPercent: '18',
                            unitPrice: '',
                          },
                        ],
                      }))
                    }
                    type="button"
                  >
                    <Plus size={15} />
                    Add Line
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {designerForm.lines.map((line, index) => (
                    <div key={index} className="rounded-2xl border border-[#dfd5c7] bg-white p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900 md:col-span-2"
                          placeholder="Line description"
                          value={line.description}
                          onChange={(event) => updateDesignerLine(index, 'description', event.target.value)}
                        />
                        <input
                          className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                          placeholder="Quantity"
                          value={line.quantity}
                          onChange={(event) => updateDesignerLine(index, 'quantity', event.target.value)}
                        />
                        <input
                          className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                          placeholder="Unit price"
                          value={line.unitPrice}
                          onChange={(event) => updateDesignerLine(index, 'unitPrice', event.target.value)}
                        />
                        <input
                          className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                          placeholder="Discount"
                          value={line.discountAmount}
                          onChange={(event) =>
                            updateDesignerLine(index, 'discountAmount', event.target.value)
                          }
                        />
                        <input
                          className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                          placeholder="Tax percent"
                          value={line.taxPercent}
                          onChange={(event) => updateDesignerLine(index, 'taxPercent', event.target.value)}
                        />
                        <input
                          className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                          placeholder="Tax code"
                          value={line.taxCode}
                          onChange={(event) => updateDesignerLine(index, 'taxCode', event.target.value)}
                        />
                        <input
                          className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                          placeholder="Tax name"
                          value={line.taxName}
                          onChange={(event) => updateDesignerLine(index, 'taxName', event.target.value)}
                        />
                      </div>
                      {designerForm.lines.length > 1 ? (
                        <button
                          className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700"
                          onClick={() =>
                            setDesignerForm((current) => ({
                              ...current,
                              lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
                            }))
                          }
                          type="button"
                        >
                          <Trash2 size={14} />
                          Remove line
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-4">
                <p className="text-sm font-medium text-slate-900">Billing snapshot</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input className="rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900" placeholder="Billing name" value={designerForm.billingSnapshot.billingName} onChange={(event) => setDesignerForm((current) => ({ ...current, billingSnapshot: { ...current.billingSnapshot, billingName: event.target.value } }))} />
                  <input className="rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900" placeholder="Billing email" value={designerForm.billingSnapshot.billingEmail} onChange={(event) => setDesignerForm((current) => ({ ...current, billingSnapshot: { ...current.billingSnapshot, billingEmail: event.target.value } }))} />
                  <input className="rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900" placeholder="Billing phone" value={designerForm.billingSnapshot.billingPhone} onChange={(event) => setDesignerForm((current) => ({ ...current, billingSnapshot: { ...current.billingSnapshot, billingPhone: event.target.value } }))} />
                  <input className="rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900" placeholder="Country code" value={designerForm.billingSnapshot.countryCode} onChange={(event) => setDesignerForm((current) => ({ ...current, billingSnapshot: { ...current.billingSnapshot, countryCode: event.target.value } }))} />
                  <input className="rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900 md:col-span-2" placeholder="Address line 1" value={designerForm.billingSnapshot.addressLine1} onChange={(event) => setDesignerForm((current) => ({ ...current, billingSnapshot: { ...current.billingSnapshot, addressLine1: event.target.value } }))} />
                  <input className="rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900 md:col-span-2" placeholder="Address line 2" value={designerForm.billingSnapshot.addressLine2} onChange={(event) => setDesignerForm((current) => ({ ...current, billingSnapshot: { ...current.billingSnapshot, addressLine2: event.target.value } }))} />
                  <input className="rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900" placeholder="City" value={designerForm.billingSnapshot.city} onChange={(event) => setDesignerForm((current) => ({ ...current, billingSnapshot: { ...current.billingSnapshot, city: event.target.value } }))} />
                  <input className="rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900" placeholder="State" value={designerForm.billingSnapshot.state} onChange={(event) => setDesignerForm((current) => ({ ...current, billingSnapshot: { ...current.billingSnapshot, state: event.target.value } }))} />
                  <input className="rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900" placeholder="Postal code" value={designerForm.billingSnapshot.postalCode} onChange={(event) => setDesignerForm((current) => ({ ...current, billingSnapshot: { ...current.billingSnapshot, postalCode: event.target.value } }))} />
                  <input className="rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900" placeholder="GSTIN (optional)" value={designerForm.billingSnapshot.gstin} onChange={(event) => setDesignerForm((current) => ({ ...current, billingSnapshot: { ...current.billingSnapshot, gstin: event.target.value } }))} />
                </div>
              </div>

              <textarea
                className="h-24 w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                placeholder="Optional email note for the client"
                value={designerForm.messageText}
                onChange={(event) =>
                  setDesignerForm((current) => ({ ...current, messageText: event.target.value }))
                }
              />
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input
                  checked={designerForm.sendEmailNow}
                  type="checkbox"
                  onChange={(event) =>
                    setDesignerForm((current) => ({
                      ...current,
                      sendEmailNow: event.target.checked,
                    }))
                  }
                />
                Email the invoice PDF to the client as soon as it is created.
              </label>
              <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="submit">
                Create Package Invoice
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Invoice Detail">
            <DataState error={invoiceDetail.error} loading={invoiceDetail.loading}>
              {invoiceDetail.data ? (
                <div className="space-y-4 text-sm text-slate-700">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel>Invoice Number</FieldLabel>
                      <p className="mt-2 text-slate-900">{invoiceDetail.data.invoiceNumber}</p>
                    </div>
                    <div>
                      <FieldLabel>Status</FieldLabel>
                      <p className="mt-2 text-slate-900">{invoiceDetail.data.statusCode}</p>
                    </div>
                    <div>
                      <FieldLabel>Issue Date</FieldLabel>
                      <p className="mt-2 text-slate-900">{formatDate(invoiceDetail.data.issueDate)}</p>
                    </div>
                    <div>
                      <FieldLabel>Due Date</FieldLabel>
                      <p className="mt-2 text-slate-900">{formatDate(invoiceDetail.data.dueDate)}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3">
                      <FieldLabel>Total</FieldLabel>
                      <p className="mt-2 text-slate-900">{formatCurrency(invoiceDetail.data.totalAmount, invoiceDetail.data.currencyCode)}</p>
                    </div>
                    <div className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3">
                      <FieldLabel>Paid</FieldLabel>
                      <p className="mt-2 text-slate-900">{formatCurrency(invoiceDetail.data.amountPaid, invoiceDetail.data.currencyCode)}</p>
                    </div>
                    <div className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3">
                      <FieldLabel>Due</FieldLabel>
                      <p className="mt-2 text-slate-900">{formatCurrency(invoiceDetail.data.amountDue, invoiceDetail.data.currencyCode)}</p>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Billing Snapshot</FieldLabel>
                    <p className="mt-2 text-slate-900">
                      {invoiceDetail.data.billingSnapshot?.billingName} · {invoiceDetail.data.billingSnapshot?.billingEmail}
                    </p>
                  </div>
                  <div>
                    <FieldLabel>Line Items</FieldLabel>
                    <div className="mt-3 space-y-2">
                      {(invoiceDetail.data.lines || []).map((line: any) => (
                        <div key={line.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3">
                          <p className="text-slate-900">{line.description}</p>
                          <p className="mt-1 text-slate-500">
                            {line.quantity} × {formatCurrency(line.unitPrice, invoiceDetail.data.currencyCode)} = {formatCurrency(line.lineTotal, invoiceDetail.data.currencyCode)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                      onClick={() => void downloadInvoicePdf(invoiceDetail.data.id)}
                      type="button"
                    >
                      <Download size={15} />
                      Download PDF
                    </button>
                  </div>

                  <form className="space-y-3 rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-5" onSubmit={sendInvoiceEmail}>
                    <p className="text-base text-slate-900" style={{ fontFamily: 'var(--font-display-stack)' }}>Send Invoice To Client</p>
                    <input
                      className="w-full rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900"
                      placeholder={invoiceDetail.data.billingSnapshot?.billingEmail || 'Recipient email'}
                      value={emailForm.recipientEmail}
                      onChange={(event) => setEmailForm((current) => ({ ...current, recipientEmail: event.target.value }))}
                    />
                    <textarea
                      className="h-28 w-full rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900"
                      placeholder="Optional note to include in the email"
                      value={emailForm.messageText}
                      onChange={(event) => setEmailForm((current) => ({ ...current, messageText: event.target.value }))}
                    />
                    <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="submit">
                      <Mail size={15} />
                      Send Invoice PDF
                    </button>
                  </form>
                </div>
              ) : (
                <EmptyState message="Select an invoice from the list to inspect the full billing snapshot and email the PDF to the client." />
              )}
            </DataState>
          </SectionCard>

          <SectionCard title="Manual Payment Recording">
            <form className="space-y-4" onSubmit={createManualPayment}>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                  value={paymentForm.clientAccountId}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      allocations: current.allocations.map((allocation) => ({
                        ...allocation,
                        invoiceId: '',
                        installmentId: '',
                      })),
                      clientAccountId: event.target.value,
                    }))
                  }
                >
                  <option value="">Select client</option>
                  {(clients.data?.items || []).map((client: any) => (
                    <option key={client.id} value={client.id}>
                      {client.displayName}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                  placeholder="Payment amount"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, amount: event.target.value }))
                  }
                />
                <input
                  className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                  placeholder="Provider code"
                  value={paymentForm.paymentProviderCode}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      paymentProviderCode: event.target.value,
                    }))
                  }
                />
                <input
                  className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                  placeholder="Gateway payment ref"
                  value={paymentForm.gatewayPaymentRef}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      gatewayPaymentRef: event.target.value,
                    }))
                  }
                />
                <input
                  className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                  placeholder="Gateway order ref"
                  value={paymentForm.gatewayOrderRef}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      gatewayOrderRef: event.target.value,
                    }))
                  }
                />
                <input
                  className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                  type="datetime-local"
                  value={paymentForm.initiatedAt}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, initiatedAt: event.target.value }))
                  }
                />
              </div>

              <div className="rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Payment allocations</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                      Every manual payment must be allocated against one or more invoices.
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#d9cfbf] bg-white px-4 py-2 text-sm text-slate-700"
                    onClick={() =>
                      setPaymentForm((current) => ({
                        ...current,
                        allocations: [
                          ...current.allocations,
                          {
                            amountApplied: '',
                            installmentId: '',
                            invoiceId: '',
                          },
                        ],
                      }))
                    }
                    type="button"
                  >
                    <Plus size={14} />
                    Add Allocation
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {paymentForm.allocations.map((allocation, index) => (
                    <div key={index} className="rounded-2xl border border-[#dfd5c7] bg-white p-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <select
                          className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                          value={allocation.invoiceId}
                          onChange={(event) =>
                            updatePaymentAllocation(index, 'invoiceId', event.target.value)
                          }
                        >
                          <option value="">Select invoice</option>
                          {visiblePaymentInvoices.map((invoice: any) => (
                            <option key={invoice.id} value={invoice.id}>
                              {invoice.invoiceNumber} · Due {formatCurrency(invoice.amountDue, invoice.currencyCode)}
                            </option>
                          ))}
                        </select>
                        <input
                          className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                          placeholder="Amount applied"
                          value={allocation.amountApplied}
                          onChange={(event) =>
                            updatePaymentAllocation(index, 'amountApplied', event.target.value)
                          }
                        />
                        <input
                          className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                          placeholder="Installment ID (optional numeric)"
                          value={allocation.installmentId}
                          onChange={(event) =>
                            updatePaymentAllocation(index, 'installmentId', event.target.value)
                          }
                        />
                      </div>
                      {paymentForm.allocations.length > 1 ? (
                        <button
                          className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700"
                          onClick={() =>
                            setPaymentForm((current) => ({
                              ...current,
                              allocations: current.allocations.filter((_, allocationIndex) => allocationIndex !== index),
                            }))
                          }
                          type="button"
                        >
                          <Trash2 size={14} />
                          Remove allocation
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <textarea
                className="h-28 w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
                placeholder="Internal note or payment memo"
                value={paymentForm.noteText}
                onChange={(event) =>
                  setPaymentForm((current) => ({ ...current, noteText: event.target.value }))
                }
              />

              <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="submit">
                Record Manual Payment
              </button>
            </form>

            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Existing Payments</h3>
              {(payments.data || []).map((payment: any) => (
                <div key={payment.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">
                    {formatCurrency(payment.netAmount, payment.currencyCode)} · {payment.statusCode}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {payment.gatewayProviderCode} · {payment.gatewayPaymentRef || 'No payment reference'}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {formatDateTime(payment.initiatedAt)}
                  </p>
                </div>
              ))}
              {!payments.data?.length ? <EmptyState message="No payment rows exist yet." /> : null}
            </div>
          </SectionCard>

          <SectionCard title="Manual Refund">
            <form className="space-y-3" onSubmit={createRefund}>
              <input className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Payment public ID" value={refundForm.paymentId} onChange={(event) => setRefundForm((current) => ({ ...current, paymentId: event.target.value }))} />
              <input className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Invoice public ID (optional)" value={refundForm.invoiceId} onChange={(event) => setRefundForm((current) => ({ ...current, invoiceId: event.target.value }))} />
              <input className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Amount" value={refundForm.amount} onChange={(event) => setRefundForm((current) => ({ ...current, amount: event.target.value }))} />
              <textarea className="h-28 w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Reason" value={refundForm.reasonText} onChange={(event) => setRefundForm((current) => ({ ...current, reasonText: event.target.value }))} />
              <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="submit">Create Refund</button>
            </form>

            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Existing Refunds</h3>
              {(refunds.data || []).map((refund: any) => (
                <div key={refund.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4 text-sm text-slate-700">
                  {refund.paymentId} · {refund.amount} · {refund.statusCode}
                </div>
              ))}
              {!refunds.data?.length ? <EmptyState message="No refunds exist yet." /> : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

const TasksPage = () => {
  const resource = useAdminResource(() => apiRequest<any>('/v1/admin/tasks'), []);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const comments = useAdminResource(
    () => (selectedTaskId ? apiRequest<any>(`/v1/admin/tasks/${selectedTaskId}/comments`) : Promise.resolve([])),
    [selectedTaskId]
  );
  const [commentBody, setCommentBody] = useState('');
  const [form, setForm] = useState({
    title: '',
    taskTypeCode: 'follow-up',
    priorityCode: 'normal',
    descriptionText: '',
    dueAt: '',
    matterId: '',
    clientAccountId: '',
  });

  const createTask = async (event: FormEvent) => {
    event.preventDefault();
    await apiRequest('/v1/admin/tasks', {
      body: {
        ...form,
        clientAccountId: form.clientAccountId || undefined,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
        matterId: form.matterId || undefined,
      },
      method: 'POST',
    });
    resource.reload();
    setForm({
      title: '',
      taskTypeCode: 'follow-up',
      priorityCode: 'normal',
      descriptionText: '',
      dueAt: '',
      matterId: '',
      clientAccountId: '',
    });
  };

  const updateStatus = async (taskId: string, statusCode: string) => {
    await apiRequest(`/v1/admin/tasks/${taskId}/status`, {
      body: { statusCode },
      method: 'PATCH',
    });
    resource.reload();
  };

  const addComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTaskId || !commentBody.trim()) {
      return;
    }

    await apiRequest(`/v1/admin/tasks/${selectedTaskId}/comments`, {
      body: { bodyText: commentBody.trim() },
      method: 'POST',
    });
    setCommentBody('');
    comments.reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Tasks"
        title="Daily operational follow-ups with clearer ownership."
        description="Create admin tasks, keep due items visible, and store internal comments against the task so work does not get lost in messages or memory."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Create Admin Task">
          <form className="space-y-3" onSubmit={createTask}>
            <input className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Task title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Task type" value={form.taskTypeCode} onChange={(event) => setForm((current) => ({ ...current, taskTypeCode: event.target.value }))} />
              <select className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" value={form.priorityCode} onChange={(event) => setForm((current) => ({ ...current, priorityCode: event.target.value }))}>
                {['low', 'normal', 'high', 'urgent'].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <input className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Matter public ID (optional)" value={form.matterId} onChange={(event) => setForm((current) => ({ ...current, matterId: event.target.value }))} />
            <input className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" type="datetime-local" value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} />
            <textarea className="h-32 w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Description" value={form.descriptionText} onChange={(event) => setForm((current) => ({ ...current, descriptionText: event.target.value }))} />
            <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="submit">Create Task</button>
          </form>
        </SectionCard>

        <SectionCard title="Task Queue">
          <DataState error={resource.error} loading={resource.loading}>
            <div className="space-y-3">
              {(resource.data || []).map((task: any) => (
                <button key={task.id} className="block w-full rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4 text-left transition hover:border-[#d7c5a8] hover:bg-white" onClick={() => setSelectedTaskId(task.id)} type="button">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{task.taskTypeCode} · Due {formatDateTime(task.dueAt)}</p>
                    </div>
                    <select className="rounded-2xl border border-[#dfd5c7] bg-white px-3 py-2 text-sm text-slate-900" defaultValue={task.statusCode} onChange={(event) => void updateStatus(task.id, event.target.value)}>
                      {['todo', 'in-progress', 'blocked', 'done', 'cancelled'].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </div>
                </button>
              ))}
            </div>
          </DataState>
        </SectionCard>
      </div>

      <SectionCard title="Task Comments">
        {selectedTaskId ? (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <DataState error={comments.error} loading={comments.loading}>
              <div className="space-y-3">
                {(comments.data || []).map((comment: any) => (
                  <div key={comment.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                    <p className="text-sm text-slate-700">{comment.bodyText}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {comment.createdByName} · {formatDateTime(comment.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </DataState>

            <form className="space-y-3" onSubmit={addComment}>
              <textarea className="h-36 w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Add an internal task comment" value={commentBody} onChange={(event) => setCommentBody(event.target.value)} />
              <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="submit">Add Comment</button>
            </form>
          </div>
        ) : (
          <EmptyState message="Select a task from the queue to review and add internal comments." />
        )}
      </SectionCard>
    </div>
  );
};

const RbacPage = () => {
  const roles = useAdminResource(() => apiRequest<any>('/v1/admin/rbac/roles'), []);
  const permissions = useAdminResource(() => apiRequest<any>('/v1/admin/rbac/permissions'), []);
  const users = useAdminResource(() => apiRequest<any>('/v1/admin/rbac/users'), []);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleCodes, setSelectedRoleCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [createUserForm, setCreateUserForm] = useState({
    displayName: '',
    email: '',
    password: '',
    requirePasswordRotation: true,
  });
  const [createUserRoleCodes, setCreateUserRoleCodes] = useState<string[]>(['ops_admin']);
  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: '',
    requirePasswordRotation: true,
  });
  const [accessForm, setAccessForm] = useState({
    accountStatusCode: 'active',
    archived: false,
    loginEnabled: true,
  });

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

    const activeUser = (users.data || []).find((entry: any) => entry.id === selectedUserId);
    setSelectedRoleCodes(activeUser?.roleCodes || []);
    setAccessForm({
      accountStatusCode: activeUser?.accountStatusCode || 'active',
      archived: Boolean(activeUser?.archivedAt),
      loginEnabled: Boolean(activeUser?.loginEnabled),
    });
  }, [selectedUserId, users.data]);

  const updateRoles = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUserId || !selectedRoleCodes.length) {
      return;
    }

    await apiRequest(`/v1/admin/rbac/users/${selectedUserId}/roles`, {
      body: {
        roleCodes: selectedRoleCodes,
      },
      method: 'PUT',
    });
    users.reload();
    setMessage('User roles updated.');
  };

  const createAdminUser = async (event: FormEvent) => {
    event.preventDefault();
    await apiRequest('/v1/admin/rbac/users', {
      body: {
        displayName: createUserForm.displayName,
        email: createUserForm.email,
        password: createUserForm.password,
        requirePasswordRotation: createUserForm.requirePasswordRotation,
        roleCodes: createUserRoleCodes,
      },
      method: 'POST',
    });
    users.reload();
    setCreateUserForm({
      displayName: '',
      email: '',
      password: '',
      requirePasswordRotation: true,
    });
    setCreateUserRoleCodes(['ops_admin']);
    setMessage('Admin user created.');
  };

  const resetSelectedPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUserId) {
      return;
    }

    await apiRequest(`/v1/admin/rbac/users/${selectedUserId}/reset-password`, {
      body: resetPasswordForm,
      method: 'POST',
    });
    users.reload();
    setResetPasswordForm({
      newPassword: '',
      requirePasswordRotation: true,
    });
    setMessage('User password reset and existing sessions revoked.');
  };

  const updateSelectedAccess = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUserId) {
      return;
    }

    await apiRequest(`/v1/admin/rbac/users/${selectedUserId}/access`, {
      body: accessForm,
      method: 'PATCH',
    });
    users.reload();
    setMessage('User access updated.');
  };

  const activeUser = (users.data || []).find((entry: any) => entry.id === selectedUserId) || null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Role Access"
        title="RBAC should be assignable without guesswork."
        description="Pick an internal user, review their existing roles, and update access using clear role selections instead of comma-separated codes."
      />

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr_0.9fr]">
        <SectionCard title="Internal Users">
          <DataState error={users.error} loading={users.loading}>
            <div className="space-y-3">
              {(users.data || []).map((user: any) => (
                <button
                  key={user.id}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedUserId === user.id
                      ? 'border-[#cbb492] bg-white shadow-[0_12px_32px_rgba(47,35,18,0.08)]'
                      : 'border-[#e7ded0] bg-[#fbf8f3] hover:border-[#d7c5a8] hover:bg-white'
                  }`}
                  onClick={() => setSelectedUserId(user.id)}
                  type="button"
                >
                  <p className="font-medium text-slate-900">{user.displayName}</p>
                  <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">{(user.roleCodes || []).join(' · ') || 'No roles assigned'}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {user.loginEnabled ? 'login enabled' : 'login disabled'} · {user.accountStatusCode}
                  </p>
                </button>
              ))}
            </div>
          </DataState>
        </SectionCard>

        <SectionCard title="Assign Roles">
          <DataState error={roles.error} loading={roles.loading}>
            {activeUser ? (
              <form className="space-y-4" onSubmit={updateRoles}>
                <div className="rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-4">
                  <p className="font-medium text-slate-900">{activeUser.displayName}</p>
                  <p className="mt-1 text-sm text-slate-500">{activeUser.email}</p>
                </div>

                <div className="grid gap-3">
                  {(roles.data || []).map((role: any) => {
                    const checked = selectedRoleCodes.includes(role.code);

                    return (
                      <label key={role.code} className="flex items-start gap-3 rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3">
                        <input
                          checked={checked}
                          type="checkbox"
                          onChange={(event) => {
                            setSelectedRoleCodes((current) =>
                              event.target.checked
                                ? [...current, role.code]
                                : current.filter((entry) => entry !== role.code)
                            );
                          }}
                        />
                        <div>
                          <p className="font-medium text-slate-900">{role.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{role.code}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="submit">
                  Save Role Assignment
                </button>
              </form>
            ) : (
              <EmptyState message="Select an internal user from the left to review and change their roles." />
            )}
          </DataState>
        </SectionCard>

        <SectionCard title="Permission Reference">
          <DataState error={permissions.error} loading={permissions.loading}>
            <div className="space-y-2">
              {(permissions.data || []).map((permission: any) => (
                <div key={permission.code} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm text-slate-700">
                  {permission.code}
                </div>
              ))}
            </div>
          </DataState>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Create Admin User">
          <form className="space-y-4" onSubmit={createAdminUser}>
            <input
              className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
              placeholder="Display name"
              value={createUserForm.displayName}
              onChange={(event) =>
                setCreateUserForm((current) => ({ ...current, displayName: event.target.value }))
              }
            />
            <input
              className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
              placeholder="Email"
              type="email"
              value={createUserForm.email}
              onChange={(event) =>
                setCreateUserForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            <input
              className="w-full rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900"
              placeholder="Temporary password"
              type="password"
              value={createUserForm.password}
              onChange={(event) =>
                setCreateUserForm((current) => ({ ...current, password: event.target.value }))
              }
            />
            <div className="grid gap-3">
              {(roles.data || []).map((role: any) => {
                const checked = createUserRoleCodes.includes(role.code);
                return (
                  <label key={`create-${role.code}`} className="flex items-start gap-3 rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3">
                    <input
                      checked={checked}
                      type="checkbox"
                      onChange={(event) =>
                        setCreateUserRoleCodes((current) =>
                          event.target.checked
                            ? Array.from(new Set([...current, role.code]))
                            : current.filter((entry) => entry !== role.code)
                        )
                      }
                    />
                    <div>
                      <p className="font-medium text-slate-900">{role.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{role.code}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                checked={createUserForm.requirePasswordRotation}
                type="checkbox"
                onChange={(event) =>
                  setCreateUserForm((current) => ({
                    ...current,
                    requirePasswordRotation: event.target.checked,
                  }))
                }
              />
              Require password rotation on first login
            </label>
            <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="submit">
              Create Admin User
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Roles">
        <DataState error={roles.error} loading={roles.loading}>
          <div className="space-y-3">
            {(roles.data || []).map((role: any) => (
              <div key={role.code} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                <p className="font-medium text-slate-900">{role.name}</p>
                <p className="mt-1 text-sm text-slate-500">{role.code}</p>
              </div>
            ))}
          </div>
        </DataState>
      </SectionCard>
        <SectionCard title="Selected User Summary">
          {activeUser ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                <FieldLabel>Name</FieldLabel>
                <p className="mt-2 text-slate-900">{activeUser.displayName}</p>
              </div>
              <div className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                <FieldLabel>Email</FieldLabel>
                <p className="mt-2 text-slate-900">{activeUser.email}</p>
              </div>
              <div className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                <FieldLabel>Current Roles</FieldLabel>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(activeUser.roleCodes || []).map((roleCode: string) => (
                    <StatusPill key={roleCode}>{roleCode}</StatusPill>
                  ))}
                  {!activeUser.roleCodes?.length ? <span className="text-sm text-slate-500">No roles assigned.</span> : null}
                </div>
              </div>
              <div className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                <FieldLabel>Security State</FieldLabel>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusPill>{activeUser.loginEnabled ? 'login enabled' : 'login disabled'}</StatusPill>
                  <StatusPill>{activeUser.mustRotatePassword ? 'rotation required' : 'password current'}</StatusPill>
                  <StatusPill>{activeUser.accountStatusCode}</StatusPill>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Last login {formatDateTime(activeUser.lastLoginAt)} · Password changed {formatDateTime(activeUser.passwordChangedAt)}
                </p>
              </div>

              <form className="space-y-3 rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-4" onSubmit={resetSelectedPassword}>
                <p className="text-sm font-medium text-slate-900">Reset Password</p>
                <input
                  className="w-full rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900"
                  placeholder="New temporary password"
                  type="password"
                  value={resetPasswordForm.newPassword}
                  onChange={(event) =>
                    setResetPasswordForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                />
                <label className="flex items-center gap-3 text-sm text-slate-600">
                  <input
                    checked={resetPasswordForm.requirePasswordRotation}
                    type="checkbox"
                    onChange={(event) =>
                      setResetPasswordForm((current) => ({
                        ...current,
                        requirePasswordRotation: event.target.checked,
                      }))
                    }
                  />
                  Require password rotation after reset
                </label>
                <button className="w-full rounded-2xl border border-[#d9cfbf] bg-white px-4 py-3 text-sm text-slate-700" type="submit">
                  Reset Password
                </button>
              </form>

              <form className="space-y-3 rounded-[24px] border border-[#e7ded0] bg-[#fbf8f3] p-4" onSubmit={updateSelectedAccess}>
                <p className="text-sm font-medium text-slate-900">Login and Account Access</p>
                <select
                  className="w-full rounded-2xl border border-[#dfd5c7] bg-white px-4 py-3 text-sm text-slate-900"
                  value={accessForm.accountStatusCode}
                  onChange={(event) =>
                    setAccessForm((current) => ({
                      ...current,
                      accountStatusCode: event.target.value,
                    }))
                  }
                >
                  {['active', 'disabled', 'suspended'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-3 text-sm text-slate-600">
                  <input
                    checked={accessForm.loginEnabled}
                    type="checkbox"
                    onChange={(event) =>
                      setAccessForm((current) => ({
                        ...current,
                        loginEnabled: event.target.checked,
                      }))
                    }
                  />
                  Allow login
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-600">
                  <input
                    checked={accessForm.archived}
                    type="checkbox"
                    onChange={(event) =>
                      setAccessForm((current) => ({
                        ...current,
                        archived: event.target.checked,
                      }))
                    }
                  />
                  Archive this admin user
                </label>
                <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="submit">
                  Save Access Settings
                </button>
              </form>
            </div>
          ) : (
            <EmptyState message="Select an internal user to see their current access summary." />
          )}
        </SectionCard>
      </div>
    </div>
  );
};

const AuditPage = () => {
  const [sourceModule, setSourceModule] = useState('');
  const [entityTableName, setEntityTableName] = useState('');
  const [actorName, setActorName] = useState('');
  const [search, setSearch] = useState('');
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const queryString = new URLSearchParams({
    actorName,
    entityTableName,
    limit: '100',
    search,
    sourceModule,
  }).toString();
  const resource = useAdminResource(() => apiRequest<any>(`/v1/admin/audit?${queryString}`), [queryString]);
  const detail = useAdminResource(
    () =>
      selectedAuditId ? apiRequest<any>(`/v1/admin/audit/${selectedAuditId}`) : Promise.resolve(null),
    [selectedAuditId]
  );

  const downloadAudit = async () => {
    const result = await apiDownload(`/v1/admin/audit/download?${queryString}`);
    triggerBrowserDownload(result.blob, result.fileName);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audit Trail"
        title="Audit should explain what changed, who did it, and where to look next."
        description="Filter by module, entity, actor, or summary text. Export the current filtered audit view whenever you need to review activity offline or share it internally."
        actions={
          <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" onClick={() => void downloadAudit()} type="button">
            <Download size={15} />
            Download Audit CSV
          </button>
        }
      />

      <SectionCard title="Audit Filters">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Search summary text" value={search} onChange={(event) => setSearch(event.target.value)} />
          <input className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Filter by module" value={sourceModule} onChange={(event) => setSourceModule(event.target.value)} />
          <input className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Filter by entity table" value={entityTableName} onChange={(event) => setEntityTableName(event.target.value)} />
          <input className="rounded-2xl border border-[#dfd5c7] bg-[#faf6f0] px-4 py-3 text-sm text-slate-900" placeholder="Filter by actor name" value={actorName} onChange={(event) => setActorName(event.target.value)} />
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <SectionCard title="Audit Entries">
          <DataState error={resource.error} loading={resource.loading}>
            <div className="space-y-3">
              {(resource.data || []).map((entry: any) => (
                <button
                  key={entry.id}
                  className={`w-full rounded-[24px] border p-5 text-left transition ${
                    selectedAuditId === entry.id
                      ? 'border-[#cbb492] bg-white shadow-[0_12px_32px_rgba(47,35,18,0.08)]'
                      : 'border-[#e7ded0] bg-[#fbf8f3] hover:border-[#d7c5a8] hover:bg-white'
                  }`}
                  onClick={() => setSelectedAuditId(entry.id)}
                  type="button"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-medium text-slate-900">{entry.actionLabel}</p>
                        <StatusPill>{entry.sourceModule}</StatusPill>
                        <StatusPill>{entry.entityTableName}</StatusPill>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{entry.actorName || 'System'} · Entity PK {entry.entityPk ?? 'n/a'}</p>
                      {entry.summaryNewValue ? <p className="mt-3 text-sm leading-7 text-slate-600">{entry.summaryNewValue}</p> : null}
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{formatDateTime(entry.occurredAt)}</p>
                  </div>
                </button>
              ))}
              {!resource.data?.length ? <EmptyState message="No audit entries matched those filters." /> : null}
            </div>
          </DataState>
        </SectionCard>

        <SectionCard title="Audit Detail">
          <DataState error={detail.error} loading={detail.loading}>
            {detail.data ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                  <p className="font-medium text-slate-900">{detail.data.actionLabel}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {detail.data.actorName || 'System'} · {detail.data.actorRoleCodeSnapshot || 'n/a'}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {detail.data.entityTableName} · Entity PK {detail.data.entityPk ?? 'n/a'}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {formatDateTime(detail.data.occurredAt)}
                  </p>
                </div>

                {detail.data.summaryOldValue || detail.data.summaryNewValue ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                      <FieldLabel>Previous Summary</FieldLabel>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {detail.data.summaryOldValue || 'Not available'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                      <FieldLabel>New Summary</FieldLabel>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {detail.data.summaryNewValue || 'Not available'}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                  <FieldLabel>Request Metadata</FieldLabel>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>Correlation ID: {detail.data.requestCorrelationId || 'Not available'}</p>
                    <p>IP Address: {detail.data.ipAddress || 'Not available'}</p>
                    <p>User Agent: {detail.data.userAgent || 'Not available'}</p>
                  </div>
                </div>

                <div>
                  <FieldLabel>Field Changes</FieldLabel>
                  <div className="mt-3 space-y-3">
                    {(detail.data.changes || []).map((change: any) => (
                      <div key={change.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] p-4">
                        <p className="font-medium text-slate-900">{change.fieldName}</p>
                        <p className="mt-2 text-sm text-slate-500">Old: {change.oldValueText || 'Not available'}</p>
                        <p className="mt-1 text-sm text-slate-700">New: {change.newValueText || 'Not available'}</p>
                      </div>
                    ))}
                    {!detail.data.changes?.length ? (
                      <EmptyState message="No field-level change rows exist for this audit entry." />
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState message="Select an audit entry to inspect field-level changes and request metadata." />
            )}
          </DataState>
        </SectionCard>
      </div>
    </div>
  );
};

const ReportsPage = () => {
  const resource = useAdminResource(() => apiRequest<any>('/v1/admin/reports/overview'), []);
  const drilldowns = useAdminResource(() => apiRequest<any>('/v1/admin/reports/drilldowns'), []);
  const [message, setMessage] = useState<string | null>(null);

  const downloadReport = async () => {
    const result = await apiDownload('/v1/admin/reports/overview/download');
    triggerBrowserDownload(result.blob, result.fileName);
  };

  const retryAsyncJob = async (jobId: string) => {
    await apiRequest(`/v1/admin/reports/drilldowns/async-jobs/${jobId}/retry`, {
      method: 'POST',
    });
    drilldowns.reload();
    setMessage('Async job queued for retry.');
  };

  const retryReminder = async (reminderId: number) => {
    await apiRequest(`/v1/admin/reports/drilldowns/reminders/${reminderId}/retry`, {
      method: 'POST',
    });
    drilldowns.reload();
    setMessage('Reminder queued for retry.');
  };

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
      <PageHeader
        eyebrow="Operational Reports"
        title="Reports should be detailed enough to act on, and easy to export."
        description="This reporting view summarizes client growth, matter distribution, invoice status, meeting status, and onboarding progress. Export the same snapshot to CSV for offline review."
        actions={
          <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" onClick={() => void downloadReport()} type="button">
            <Download size={15} />
            Download Overview CSV
          </button>
        }
      />

      <DataState error={resource.error} loading={resource.loading}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(resource.data?.counts || {}).map(([key, value]) => (
            <MetricCard key={key} label={toTitleCase(key)} value={String(value)} />
          ))}
        </div>
      </DataState>

      <SectionCard title="Report Breakdown">
        <DataState error={resource.error} loading={resource.loading}>
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <FieldLabel>Matter Stages</FieldLabel>
              <div className="mt-4 space-y-2">
                {(resource.data?.matterStages || []).map((entry: any) => (
                  <div key={entry.code} className="flex items-center justify-between rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm">
                    <span className="text-slate-700">{entry.code}</span>
                    <span className="font-semibold text-slate-900">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Invoice Statuses</FieldLabel>
              <div className="mt-4 space-y-2">
                {(resource.data?.invoiceStatuses || []).map((entry: any) => (
                  <div key={entry.code} className="flex items-center justify-between rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm">
                    <span className="text-slate-700">{entry.code}</span>
                    <span className="font-semibold text-slate-900">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Meeting Statuses</FieldLabel>
              <div className="mt-4 space-y-2">
                {(resource.data?.eventStatuses || []).map((entry: any) => (
                  <div key={entry.code} className="flex items-center justify-between rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm">
                    <span className="text-slate-700">{entry.code}</span>
                    <span className="font-semibold text-slate-900">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Client Onboarding</FieldLabel>
              <div className="mt-4 space-y-2">
                {(resource.data?.onboardingStatuses || []).map((entry: any) => (
                  <div key={entry.code} className="flex items-center justify-between rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm">
                    <span className="text-slate-700">{entry.code}</span>
                    <span className="font-semibold text-slate-900">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DataState>
      </SectionCard>

      <SectionCard title="Operational Drilldowns">
        <DataState error={drilldowns.error} loading={drilldowns.loading}>
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <FieldLabel>Overdue Invoices</FieldLabel>
              <div className="mt-4 space-y-2">
                {(drilldowns.data?.overdueInvoices || []).map((entry: any) => (
                  <Link key={entry.id} className="block rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm transition hover:border-[#d7c5a8] hover:bg-white" to={`/billing?invoice=${entry.id}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-700">{entry.invoiceNumber} · {entry.clientName}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(entry.amountDue)}</span>
                    </div>
                  </Link>
                ))}
                {!drilldowns.data?.overdueInvoices?.length ? <EmptyState message="No overdue invoices right now." /> : null}
              </div>
            </div>

            <div>
              <FieldLabel>Stale Matters</FieldLabel>
              <div className="mt-4 space-y-2">
                {(drilldowns.data?.staleMatters || []).map((entry: any) => (
                  <Link key={entry.id} className="block rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm transition hover:border-[#d7c5a8] hover:bg-white" to={`/matters/${entry.id}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-700">{entry.title} · {entry.clientName}</span>
                      <span className="font-semibold text-slate-900">{entry.currentStageCode}</span>
                    </div>
                  </Link>
                ))}
                {!drilldowns.data?.staleMatters?.length ? <EmptyState message="No stale matters found." /> : null}
              </div>
            </div>

            <div>
              <FieldLabel>Pending Reminders</FieldLabel>
              <div className="mt-4 space-y-2">
                {(drilldowns.data?.pendingReminders || []).map((entry: any) => (
                  <div key={`${entry.eventId}-${entry.reminderId}`} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Link className="text-slate-700 underline-offset-4 hover:underline" to={`/events?event=${entry.eventId}`}>
                        {entry.eventTitle} · {entry.clientName}
                      </Link>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900">{entry.deliveryStatusCode}</span>
                        {['failed', 'retry'].includes(entry.deliveryStatusCode) ? (
                          <button
                            className="rounded-full border border-[#d9cfbf] bg-white px-3 py-2 text-xs text-slate-700"
                            onClick={() => void retryReminder(entry.reminderId)}
                            type="button"
                          >
                            Retry
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
                {!drilldowns.data?.pendingReminders?.length ? <EmptyState message="No pending reminders are queued." /> : null}
              </div>
            </div>

            <div>
              <FieldLabel>Failed or Retrying Jobs</FieldLabel>
              <div className="mt-4 space-y-2">
                {(drilldowns.data?.failedJobs || []).map((entry: any) => (
                  <div key={entry.id} className="rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <span>{entry.typeCode}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900">{entry.statusCode}</span>
                        {['failed', 'retry'].includes(entry.statusCode) ? (
                          <button
                            className="rounded-full border border-[#d9cfbf] bg-white px-3 py-2 text-xs text-slate-700"
                            onClick={() => void retryAsyncJob(entry.id)}
                            type="button"
                          >
                            Retry
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-slate-500">Attempts {entry.attemptCount} · Next run {formatDateTime(entry.availableAt)}</p>
                    {entry.lastError ? <p className="mt-2 text-xs text-rose-700">{entry.lastError}</p> : null}
                  </div>
                ))}
                {!drilldowns.data?.failedJobs?.length ? <EmptyState message="No failed or retrying jobs right now." /> : null}
              </div>
            </div>

            <div className="xl:col-span-2">
              <FieldLabel>Threads Waiting On Admin</FieldLabel>
              <div className="mt-4 space-y-2">
                {(drilldowns.data?.waitingThreads || []).map((entry: any) => (
                  <Link key={entry.id} className="block rounded-2xl border border-[#e7ded0] bg-[#fbf8f3] px-4 py-3 text-sm transition hover:border-[#d7c5a8] hover:bg-white" to={`/messages?thread=${entry.id}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-700">{entry.subject || entry.threadNumber} · {entry.clientName}</span>
                      <span className="font-semibold text-slate-900">{formatDateTime(entry.lastMessageAt)}</span>
                    </div>
                  </Link>
                ))}
                {!drilldowns.data?.waitingThreads?.length ? <EmptyState message="No client-waiting threads right now." /> : null}
              </div>
            </div>
          </div>
        </DataState>
      </SectionCard>
    </div>
  );
};

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { isReady, user } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f7f3eb_0%,#fbfaf7_42%,#f3ecdf_100%)] text-slate-900">
        Loading admin session...
      </div>
    );
  }

  if (!user) {
    return <Navigate replace to="/" />;
  }

  if (user.mustRotatePassword && location.pathname !== '/account-security') {
    return <Navigate replace to="/account-security" />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate replace to="/dashboard" /> : <LoginPage />} />
      <Route
        path="*"
        element={
          <RequireAuth>
            <AdminLayout>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/clients/:clientId" element={<ClientDetailPage />} />
                <Route path="/requests" element={<RequestsPage />} />
                <Route path="/matters" element={<MattersPage />} />
                <Route path="/matters/:matterId" element={<MatterDetailPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/account-security" element={<AccountSecurityPage />} />
                <Route path="/rbac" element={<RbacPage />} />
                <Route path="/audit" element={<AuditPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="*" element={<Navigate replace to="/dashboard" />} />
              </Routes>
            </AdminLayout>
          </RequireAuth>
        }
      />
    </Routes>
  );
};

const App = () => {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AdminAuthProvider>
  );
};

export default App;
