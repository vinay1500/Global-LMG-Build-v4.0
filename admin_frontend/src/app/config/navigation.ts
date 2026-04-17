import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle,
  CreditCard,
  FileText,
  History,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from 'lucide-react';

export type AdminNavItem = {
  deferred?: boolean;
  icon: LucideIcon;
  id: string;
  label: string;
  path: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'requests', label: 'Requests', path: '/requests', icon: Inbox, deferred: true },
  { id: 'clients', label: 'Clients', path: '/clients', icon: Users },
  { id: 'matters', label: 'Matters Desk', path: '/matters', icon: Briefcase },
  { id: 'meetings', label: 'Meetings', path: '/meetings', icon: Calendar },
  { id: 'messages', label: 'Messages', path: '/messages', icon: MessageSquare },
  { id: 'documents', label: 'Documents', path: '/documents', icon: FileText },
  { id: 'billing', label: 'Billing & Ledger', path: '/billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell },
  { id: 'tasks', label: 'Tasks & Ops', path: '/tasks', icon: CheckCircle, deferred: true },
  { id: 'audit', label: 'Audit Log', path: '/audit', icon: History },
  { id: 'reports', label: 'Reports', path: '/reports', icon: BarChart3, deferred: true },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, deferred: true },
];
