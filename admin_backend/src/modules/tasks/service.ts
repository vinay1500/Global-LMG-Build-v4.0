import type { RowDataPacket } from 'mysql2/promise';
import { fetchDocuments, fetchEvents, fetchInvoices, fetchMatters, fetchThreads } from '../shared.js';
import { queryRows } from '../../lib/mysql.js';

type MatterItem = Awaited<ReturnType<typeof fetchMatters>>[number];
type InvoiceItem = Awaited<ReturnType<typeof fetchInvoices>>[number];
type DocumentItem = Awaited<ReturnType<typeof fetchDocuments>>[number];
type ThreadItem = Awaited<ReturnType<typeof fetchThreads>>[number];
type EventItem = Awaited<ReturnType<typeof fetchEvents>>[number];
type ReminderTaskRow = RowDataPacket & {
  clientName: string | null;
  deliveryStatusCode: 'failed' | 'pending' | 'processing' | 'sent' | 'cancelled';
  eventId: string;
  eventTitle: string;
  failureReason: string | null;
  id: number;
  scheduledAt: string;
};

type TaskStatus = 'completed' | 'in_progress' | 'todo' | 'waiting_client' | 'waiting_internal';
type TaskPriority = 'High' | 'Low' | 'Medium';

type WorkspaceTask = {
  assignee: string;
  client: string;
  dueDate: string;
  id: string;
  isOverdue: boolean;
  isToday: boolean;
  matter: string;
  note: string;
  priority: TaskPriority;
  sourceId: string;
  sourceType: 'document' | 'event' | 'invoice' | 'matter' | 'message' | 'reminder';
  status: TaskStatus;
  title: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDate = (value: string | undefined) => {
  if (!value) {
    return null;
  }

  const normalized = value.includes('T') ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);

const isSameUtcDate = (a: Date, b: Date) => toDateOnly(a) === toDateOnly(b);

const daysBetween = (target: Date, base: Date) =>
  Math.floor((target.getTime() - base.getTime()) / DAY_MS);

const sortTasks = (tasks: WorkspaceTask[]) => {
  const statusWeight: Record<TaskStatus, number> = {
    completed: 5,
    in_progress: 2,
    todo: 3,
    waiting_client: 1,
    waiting_internal: 4,
  };

  return [...tasks].sort((left, right) => {
    if (left.status !== right.status) {
      return statusWeight[left.status] - statusWeight[right.status];
    }

    if (left.isOverdue !== right.isOverdue) {
      return left.isOverdue ? -1 : 1;
    }

    return left.dueDate.localeCompare(right.dueDate);
  });
};

const buildInvoiceTasks = (invoices: InvoiceItem[], today: Date): WorkspaceTask[] =>
  invoices
    .filter((invoice) => !['paid', 'refunded', 'void'].includes(invoice.status))
    .map((invoice) => {
      const dueDate = parseDate(invoice.dueDate) || today;
      const overdue = dueDate.getTime() < today.getTime() && !isSameUtcDate(dueDate, today);

      return {
        assignee: 'Billing Desk',
        client: invoice.clientName,
        dueDate: invoice.dueDate,
        id: `invoice-${invoice.id}`,
        isOverdue: overdue,
        isToday: isSameUtcDate(dueDate, today),
        matter: invoice.matterTitle || invoice.matterRef || 'General Billing',
        note: `${invoice.status} invoice · ${invoice.totalAmount.toFixed(2)} total`,
        priority: overdue ? 'High' : 'Medium',
        sourceId: invoice.id,
        sourceType: 'invoice',
        status: overdue ? 'waiting_client' : 'todo',
        title: `Collect payment for ${invoice.clientName}`,
      };
    });

const buildDocumentTasks = (
  documents: DocumentItem[],
  mattersById: Map<string, MatterItem>,
  today: Date
): WorkspaceTask[] =>
  documents
    .filter((document) => document.reviewState !== 'reviewed')
    .map((document) => {
      const dueDate = parseDate(document.uploadedAt) || today;
      const matter = mattersById.get(document.matterId);
      const ageDays = Math.max(daysBetween(today, dueDate), 0);

      return {
        assignee: matter?.assignedStaff || matter?.assignedCounsel || 'Document Desk',
        client: document.clientName,
        dueDate: toDateOnly(dueDate),
        id: `document-${document.id}`,
        isOverdue: ageDays > 3,
        isToday: isSameUtcDate(dueDate, today),
        matter: document.matterTitle || 'Unlinked Document',
        note: `${document.docCategory} · ${document.visibility} visibility`,
        priority: document.visibility === 'client' ? 'High' : 'Medium',
        sourceId: document.id,
        sourceType: 'document',
        status: 'todo',
        title: `Review ${document.name}`,
      };
    });

const buildThreadTasks = (threads: ThreadItem[], today: Date): WorkspaceTask[] =>
  threads
    .filter((thread) => thread.unreadCount > 0)
    .map((thread) => {
      const dueDate = parseDate(thread.lastMessageAt) || today;

      return {
        assignee: thread.assignedTo || 'Messaging Desk',
        client: thread.clientName,
        dueDate: toDateOnly(dueDate),
        id: `message-${thread.id}`,
        isOverdue: daysBetween(today, dueDate) > 1,
        isToday: isSameUtcDate(dueDate, today),
        matter: thread.matterTitle || thread.matterRef || 'General Inquiry',
        note: thread.lastMessage || 'Unread client message waiting for reply.',
        priority:
          thread.urgency === 'within-2hrs'
            ? 'High'
            : thread.urgency === 'within-6hrs'
              ? 'Medium'
              : 'Low',
        sourceId: thread.id,
        sourceType: 'message',
        status: 'in_progress',
        title: `Reply to ${thread.clientName}`,
      };
    });

const buildMatterTasks = (matters: MatterItem[], today: Date): WorkspaceTask[] =>
  matters
    .filter((matter) => !['completed', 'archived'].includes(matter.operationalStatus))
    .filter((matter) => {
      const lastUpdated = parseDate(matter.lastUpdated);
      return lastUpdated ? daysBetween(today, lastUpdated) > 10 : false;
    })
    .map((matter) => {
      const lastUpdated = parseDate(matter.lastUpdated) || today;

      return {
        assignee: matter.assignedStaff || matter.assignedCounsel || 'Case Desk',
        client: matter.clientName,
        dueDate: matter.lastUpdated,
        id: `matter-${matter.id}`,
        isOverdue: daysBetween(today, lastUpdated) > 14,
        isToday: isSameUtcDate(lastUpdated, today),
        matter: matter.title,
        note: `Last activity on ${matter.lastUpdated} · ${matter.operationalStatus}`,
        priority: matter.priority === 'immediate-6h' ? 'High' : 'Medium',
        sourceId: matter.id,
        sourceType: 'matter',
        status: 'waiting_internal',
        title: `Advance ${matter.referenceCode}`,
      };
    });

const buildEventTasks = (events: EventItem[], today: Date): WorkspaceTask[] =>
  events
    .filter((event) => event.status === 'upcoming')
    .filter((event) => {
      const eventDate = parseDate(event.date);
      return eventDate ? daysBetween(eventDate, today) <= 3 && daysBetween(eventDate, today) >= 0 : false;
    })
    .map((event) => {
      const eventDate = parseDate(event.date) || today;

      return {
        assignee: 'Meetings Desk',
        client: event.clientName,
        dueDate: event.date,
        id: `event-${event.id}`,
        isOverdue: false,
        isToday: isSameUtcDate(eventDate, today),
        matter: event.matterTitle || event.title,
        note: `${event.type} · ${event.time}`,
        priority: event.type === 'deadline' ? 'High' : 'Medium',
        sourceId: event.id,
        sourceType: 'event',
        status: 'todo',
        title: `Prepare ${event.title}`,
      };
    });

const fetchReminderTasks = () =>
  queryRows<ReminderTaskRow>(
    `SELECT
       er.id,
       er.scheduled_at AS scheduledAt,
       er.delivery_status_code AS deliveryStatusCode,
       er.failure_reason AS failureReason,
       evt.public_id AS eventId,
       evt.title AS eventTitle,
       client.display_name AS clientName
     FROM event_reminders er
     INNER JOIN events evt ON evt.id = er.event_id
     LEFT JOIN client_accounts client ON client.id = evt.client_account_id
     WHERE er.sent_at IS NULL
       AND er.delivery_status_code IN ('failed', 'pending', 'processing')
       AND (
         er.delivery_status_code IN ('failed', 'processing')
         OR er.scheduled_at <= UTC_TIMESTAMP(6)
       )
     ORDER BY
       FIELD(er.delivery_status_code, 'failed', 'processing', 'pending'),
       er.scheduled_at ASC,
       er.id ASC
     LIMIT 20`
  );

const buildReminderTasks = (reminders: ReminderTaskRow[], today: Date): WorkspaceTask[] =>
  reminders.map((reminder) => {
    const dueDate = parseDate(reminder.scheduledAt) || today;
    const isFailed = reminder.deliveryStatusCode === 'failed';

    return {
      assignee: 'Ops Reliability',
      client: reminder.clientName || 'Client portal user',
      dueDate: toDateOnly(dueDate),
      id: `reminder-${reminder.id}`,
      isOverdue: dueDate.getTime() < today.getTime() || isFailed,
      isToday: isSameUtcDate(dueDate, today),
      matter: reminder.eventTitle,
      note: isFailed
        ? reminder.failureReason || 'Reminder failed and is waiting for retry.'
        : 'Due reminder is waiting for local/in-app processing.',
      priority: isFailed ? 'High' : 'Medium',
      sourceId: String(reminder.id),
      sourceType: 'reminder',
      status: isFailed ? 'waiting_internal' : 'todo',
      title: isFailed ? `Retry reminder for ${reminder.eventTitle}` : `Process reminder for ${reminder.eventTitle}`,
    };
  });

const buildCompletedTasks = (
  invoices: InvoiceItem[],
  events: EventItem[],
  today: Date
): WorkspaceTask[] => {
  const recentPaidInvoices = invoices
    .filter((invoice) => invoice.status === 'paid' && invoice.paidDate)
    .filter((invoice) => {
      const paidDate = parseDate(invoice.paidDate);
      return paidDate ? daysBetween(today, paidDate) <= 7 : false;
    })
    .map((invoice) => ({
      assignee: 'Billing Desk',
      client: invoice.clientName,
      dueDate: invoice.paidDate!,
      id: `invoice-paid-${invoice.id}`,
      isOverdue: false,
      isToday: Boolean(invoice.paidDate && parseDate(invoice.paidDate) && isSameUtcDate(parseDate(invoice.paidDate)!, today)),
      matter: invoice.matterTitle || invoice.matterRef || 'General Billing',
      note: `Invoice paid · ${invoice.totalAmount.toFixed(2)} received`,
      priority: 'Low' as const,
      sourceId: invoice.id,
      sourceType: 'invoice' as const,
      status: 'completed' as const,
      title: `Close billing follow-up for ${invoice.clientName}`,
    }));

  const recentCompletedEvents = events
    .filter((event) => event.status === 'completed')
    .filter((event) => {
      const eventDate = parseDate(event.date);
      return eventDate ? daysBetween(today, eventDate) <= 7 : false;
    })
    .map((event) => ({
      assignee: 'Meetings Desk',
      client: event.clientName,
      dueDate: event.date,
      id: `event-complete-${event.id}`,
      isOverdue: false,
      isToday: Boolean(parseDate(event.date) && isSameUtcDate(parseDate(event.date)!, today)),
      matter: event.matterTitle || event.title,
      note: `${event.type} completed`,
      priority: 'Low' as const,
      sourceId: event.id,
      sourceType: 'event' as const,
      status: 'completed' as const,
      title: `Wrap up ${event.title}`,
    }));

  return [...recentPaidInvoices, ...recentCompletedEvents];
};

export const getWorkspace = async () => {
  const today = new Date();
  const [matters, invoices, documents, threads, events, reminders] = await Promise.all([
    fetchMatters({}),
    fetchInvoices({}),
    fetchDocuments({}),
    fetchThreads({}),
    fetchEvents({}),
    fetchReminderTasks(),
  ]);

  const mattersById = new Map(matters.map((matter) => [matter.id, matter]));

  const tasks = sortTasks([
    ...buildInvoiceTasks(invoices, today),
    ...buildDocumentTasks(documents, mattersById, today),
    ...buildThreadTasks(threads, today),
    ...buildMatterTasks(matters, today),
    ...buildEventTasks(events, today),
    ...buildReminderTasks(reminders, today),
    ...buildCompletedTasks(invoices, events, today),
  ]).slice(0, 60);

  return {
    metrics: {
      completedRecent: tasks.filter((task) => task.status === 'completed').length,
      dueToday: tasks.filter((task) => task.isToday && task.status !== 'completed').length,
      open: tasks.filter((task) => task.status !== 'completed').length,
      overdue: tasks.filter((task) => task.isOverdue && task.status !== 'completed').length,
      waiting: tasks.filter((task) => ['waiting_client', 'waiting_internal'].includes(task.status)).length,
    },
    tasks,
  };
};
