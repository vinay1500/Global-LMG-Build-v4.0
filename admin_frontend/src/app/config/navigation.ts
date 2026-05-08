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
  permission?: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { id: 'requests', label: 'Requests', path: '/requests', icon: Inbox, permission: 'matter.view' },
  { id: 'clients', label: 'Clients', path: '/clients', icon: Users, permission: 'client_account.view' },
  { id: 'matters', label: 'Matters Desk', path: '/matters', icon: Briefcase, permission: 'matter.view' },
  { id: 'meetings', label: 'Meetings', path: '/meetings', icon: Calendar, permission: 'event.view' },
  { id: 'messages', label: 'Messages', path: '/messages', icon: MessageSquare, permission: 'message.send' },
  { id: 'documents', label: 'Documents', path: '/documents', icon: FileText, permission: 'document.view' },
  { id: 'billing', label: 'Billing & Ledger', path: '/billing', icon: CreditCard, permission: 'invoice.view' },
  { id: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell, permission: 'matter.view' },
  { id: 'tasks', label: 'Tasks & Ops', path: '/tasks', icon: CheckCircle, permission: 'dashboard.view' },
  { id: 'audit', label: 'Audit Log', path: '/audit', icon: History, permission: 'matter.view' },
  { id: 'reports', label: 'Reports', path: '/reports', icon: BarChart3, permission: 'dashboard.view' },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, permission: 'dashboard.view' },
];
