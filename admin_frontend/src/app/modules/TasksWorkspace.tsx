import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  Columns3,
  CreditCard,
  FileText,
  LayoutList,
  MessageSquare,
  Search,
  User,
  Users,
} from 'lucide-react';
import type { AdminTaskRecord, TasksWorkspaceResponse } from '../lib/api/contracts';
import { EmptyState } from './EmptyState';

type LayoutView = 'kanban' | 'list' | 'queue';
type TaskFilter = 'all' | 'my_tasks' | 'overdue' | 'today' | 'waiting';

type TasksWorkspaceProps = {
  currentAssignee?: string;
  metrics?: TasksWorkspaceResponse['metrics'];
  onOpenTask?: (task: AdminTaskRecord) => void;
  tasks?: AdminTaskRecord[];
};

const priorityClasses: Record<AdminTaskRecord['priority'], string> = {
  High: 'bg-[#FDE8EC] text-[#d4183d]',
  Low: 'bg-[#EFF3F6] text-[#5A7C96]',
  Medium: 'bg-[#FDF8EF] text-[#997A48]',
};

const sourceMeta: Record<AdminTaskRecord['sourceType'], { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  document: { icon: FileText, label: 'Document' },
  event: { icon: Calendar, label: 'Event' },
  invoice: { icon: CreditCard, label: 'Invoice' },
  matter: { icon: Briefcase, label: 'Matter' },
  message: { icon: MessageSquare, label: 'Message' },
};

const formatStatus = (status: AdminTaskRecord['status']) =>
  status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const TasksWorkspace: React.FC<TasksWorkspaceProps> = ({
  currentAssignee,
  metrics,
  onOpenTask,
  tasks = [],
}) => {
  const [view, setView] = useState<LayoutView>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<TaskFilter>('all');

  const effectiveAssignee =
    currentAssignee || tasks.find((task) => task.assignee && task.assignee !== 'Unassigned')?.assignee || '';

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const haystack = [task.title, task.client, task.matter, task.note, task.assignee]
        .join(' ')
        .toLowerCase();
      if (searchQuery.trim() && !haystack.includes(searchQuery.trim().toLowerCase())) {
        return false;
      }

      if (filterMode === 'overdue' && (!task.isOverdue || task.status === 'completed')) {
        return false;
      }

      if (filterMode === 'today' && (!task.isToday || task.status === 'completed')) {
        return false;
      }

      if (filterMode === 'waiting' && !['waiting_client', 'waiting_internal'].includes(task.status)) {
        return false;
      }

      if (filterMode === 'my_tasks' && effectiveAssignee && task.assignee !== effectiveAssignee) {
        return false;
      }

      return true;
    });
  }, [effectiveAssignee, filterMode, searchQuery, tasks]);

  const queueSections = useMemo(
    () => ({
      overdue: filteredTasks.filter((task) => task.isOverdue && task.status !== 'completed'),
      today: filteredTasks.filter((task) => task.isToday && task.status !== 'completed'),
      waiting: filteredTasks.filter((task) => ['waiting_client', 'waiting_internal'].includes(task.status)),
      upNext: filteredTasks.filter(
        (task) =>
          !task.isOverdue &&
          !task.isToday &&
          !['completed', 'waiting_client', 'waiting_internal'].includes(task.status)
      ),
      completed: filteredTasks.filter((task) => task.status === 'completed'),
    }),
    [filteredTasks]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2
            className="text-2xl font-medium text-[#2C2B29]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Tasks & Ops
          </h2>
          <p className="text-sm text-[#8C8981] mt-1">
            Live operational queue distilled from matters, messages, documents, invoices, and near-term events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`p-2 rounded-lg border ${view === 'queue' ? 'bg-[#2C2B29] text-white border-[#2C2B29]' : 'bg-white text-[#8C8981] border-[#E6E4DD]'}`}
            onClick={() => setView('queue')}
            type="button"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            className={`p-2 rounded-lg border ${view === 'list' ? 'bg-[#2C2B29] text-white border-[#2C2B29]' : 'bg-white text-[#8C8981] border-[#E6E4DD]'}`}
            onClick={() => setView('list')}
            type="button"
          >
            <Columns3 className="w-4 h-4 rotate-90" />
          </button>
          <button
            className={`p-2 rounded-lg border ${view === 'kanban' ? 'bg-[#2C2B29] text-white border-[#2C2B29]' : 'bg-white text-[#8C8981] border-[#E6E4DD]'}`}
            onClick={() => setView('kanban')}
            type="button"
          >
            <Columns3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label="Open Queue" value={metrics?.open || filteredTasks.filter((task) => task.status !== 'completed').length} />
        <StatCard label="Due Today" tone="amber" value={metrics?.dueToday || 0} />
        <StatCard label="Overdue" tone="rose" value={metrics?.overdue || 0} />
        <StatCard label="Waiting" tone="blue" value={metrics?.waiting || 0} />
        <StatCard label="Completed Recent" tone="emerald" value={metrics?.completedRecent || 0} />
      </div>

      <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
        <div className="relative w-full xl:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A69F]" />
          <input
            className="w-full rounded-lg border border-[#E6E4DD] bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#C19A5B]"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search title, client, matter, assignee..."
            type="text"
            value={searchQuery}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'my_tasks', label: 'Assigned to Me' },
            { id: 'today', label: 'Today' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'waiting', label: 'Waiting' },
          ].map((filter) => (
            <button
              className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                filterMode === filter.id
                  ? 'bg-[#FDF8EF] text-[#997A48] border-[#EAD2A8]'
                  : 'bg-white text-[#8C8981] border-[#E6E4DD] hover:text-[#2C2B29]'
              }`}
              key={filter.id}
              onClick={() => setFilterMode(filter.id as TaskFilter)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm p-10">
          <EmptyState
            action={{
              label: 'Reset Task Filters',
              onClick: () => {
                setFilterMode('all');
                setSearchQuery('');
              },
            }}
            description="There are no operational items matching the current view and filter set."
            icon={Search}
            title="No Tasks Found"
          />
        </div>
      ) : null}

      {filteredTasks.length > 0 && view === 'queue' ? (
        <div className="space-y-6">
          <TaskSection label="Overdue" tone="rose" tasks={queueSections.overdue} onOpenTask={onOpenTask} />
          <TaskSection label="Attention Today" tone="amber" tasks={queueSections.today} onOpenTask={onOpenTask} />
          <TaskSection label="Waiting on Others" tone="blue" tasks={queueSections.waiting} onOpenTask={onOpenTask} />
          <TaskSection label="Up Next" tone="neutral" tasks={queueSections.upNext} onOpenTask={onOpenTask} />
          <TaskSection label="Recently Completed" tone="emerald" tasks={queueSections.completed} onOpenTask={onOpenTask} />
        </div>
      ) : null}

      {filteredTasks.length > 0 && view === 'list' ? (
        <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F4F1EA] border-b border-[#E6E4DD]">
                <tr className="text-xs uppercase tracking-[0.22em] text-[#8C8981]">
                  <th className="px-4 py-3 font-semibold">Task</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E4DD]">
                {filteredTasks.map((task) => (
                  <tr className="hover:bg-[#FCFBF8]" key={task.id}>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-[#2C2B29]">{task.title}</p>
                      <p className="text-xs text-[#8C8981] mt-1">
                        {task.matter} • {task.client}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#5A7C96]">{task.assignee}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <StatusDot status={task.status} />
                        <span className="text-sm text-[#2C2B29]">{formatStatus(task.status)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className={`text-sm ${task.isOverdue && task.status !== 'completed' ? 'text-[#d4183d]' : 'text-[#5A7C96]'}`}>
                        {task.dueDate}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <TaskSourceBadge sourceType={task.sourceType} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        className="inline-flex items-center gap-1 text-sm text-[#2C2B29] hover:text-[#997A48]"
                        onClick={() => onOpenTask?.(task)}
                        type="button"
                      >
                        Open <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {filteredTasks.length > 0 && view === 'kanban' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-4">
          {(
            [
              ['todo', 'To Do'],
              ['in_progress', 'In Progress'],
              ['waiting_client', 'Waiting Client'],
              ['waiting_internal', 'Waiting Internal'],
              ['completed', 'Completed'],
            ] as const
          ).map(([status, label]) => {
            const statusTasks = filteredTasks.filter((task) => task.status === status);

            return (
              <div className="rounded-xl border border-[#E6E4DD] bg-[#F4F1EA] p-3" key={status}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-[#2C2B29]">{label}</p>
                  <span className="text-xs text-[#8C8981]">{statusTasks.length}</span>
                </div>

                <div className="space-y-3">
                  {statusTasks.length ? (
                    statusTasks.map((task) => (
                      <button
                        className="w-full text-left rounded-xl border border-[#E6E4DD] bg-white p-4 hover:border-[#D8C7A4] transition"
                        key={task.id}
                        onClick={() => onOpenTask?.(task)}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <TaskSourceBadge sourceType={task.sourceType} />
                          <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-1 rounded ${priorityClasses[task.priority]}`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[#2C2B29] mt-3">{task.title}</p>
                        <p className="text-xs text-[#8C8981] mt-1">{task.matter}</p>
                        <p className="text-xs text-[#5A7C96] mt-3">{task.assignee}</p>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#D6D2C8] bg-white/60 p-4 text-center text-xs text-[#8C8981]">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const StatCard = ({
  label,
  tone = 'neutral',
  value,
}: {
  label: string;
  tone?: 'amber' | 'blue' | 'emerald' | 'neutral' | 'rose';
  value: number;
}) => {
  const toneClasses: Record<typeof tone, string> = {
    amber: 'bg-[#FDF8EF] border-[#EAD2A8]',
    blue: 'bg-[#EFF3F6] border-[#D6E4EE]',
    emerald: 'bg-[#EEF9F1] border-[#CFE8D5]',
    neutral: 'bg-white border-[#E6E4DD]',
    rose: 'bg-[#FDE8EC] border-[#F5C2C7]',
  };

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8C8981]">{label}</p>
      <p
        className="text-3xl mt-3 text-[#2C2B29]"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {value}
      </p>
    </div>
  );
};

const TaskSection = ({
  label,
  onOpenTask,
  tasks,
  tone,
}: {
  label: string;
  onOpenTask?: (task: AdminTaskRecord) => void;
  tasks: AdminTaskRecord[];
  tone: 'amber' | 'blue' | 'emerald' | 'neutral' | 'rose';
}) => {
  if (!tasks.length) {
    return null;
  }

  const titleClasses: Record<typeof tone, string> = {
    amber: 'text-[#997A48]',
    blue: 'text-[#5A7C96]',
    emerald: 'text-[#2e7d32]',
    neutral: 'text-[#2C2B29]',
    rose: 'text-[#d4183d]',
  };

  return (
    <div className="space-y-3">
      <h3 className={`text-sm font-medium border-b border-[#E6E4DD] pb-2 ${titleClasses[tone]}`}>
        {label} ({tasks.length})
      </h3>
      <div className="space-y-3">
        {tasks.map((task) => (
          <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm p-4" key={task.id}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <TaskSourceBadge sourceType={task.sourceType} />
                  <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-1 rounded ${priorityClasses[task.priority]}`}>
                    {task.priority}
                  </span>
                </div>
                <p className="text-sm font-medium text-[#2C2B29]">{task.title}</p>
                <p className="text-xs text-[#8C8981] mt-1">
                  {task.matter} • {task.client}
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:min-w-[520px]">
                <MiniMeta label="Assignee" value={task.assignee} />
                <MiniMeta
                  label="Due"
                  value={task.dueDate}
                  tone={task.isOverdue && task.status !== 'completed' ? 'rose' : 'default'}
                />
                <MiniMeta label="Status" value={formatStatus(task.status)} />
                <button
                  className="rounded-xl bg-[#2C2B29] text-white text-sm hover:bg-[#4A4946] transition px-3 py-2 flex items-center justify-center gap-2"
                  onClick={() => onOpenTask?.(task)}
                  type="button"
                >
                  Open <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-[#5A7C96] mt-3">{task.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const MiniMeta = ({
  label,
  tone = 'default',
  value,
}: {
  label: string;
  tone?: 'default' | 'rose';
  value: string;
}) => (
  <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] px-3 py-2">
    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A8A69F]">{label}</p>
    <p className={`text-sm mt-1 ${tone === 'rose' ? 'text-[#d4183d]' : 'text-[#2C2B29]'}`}>{value}</p>
  </div>
);

const StatusDot = ({ status }: { status: AdminTaskRecord['status'] }) => {
  const classes: Record<AdminTaskRecord['status'], string> = {
    completed: 'bg-[#2e7d32]',
    in_progress: 'bg-[#997A48]',
    todo: 'bg-[#5A7C96]',
    waiting_client: 'bg-[#d4183d]',
    waiting_internal: 'bg-[#7C3AED]',
  };

  return <span className={`w-2.5 h-2.5 rounded-full ${classes[status]}`} />;
};

const TaskSourceBadge = ({ sourceType }: { sourceType: AdminTaskRecord['sourceType'] }) => {
  const meta = sourceMeta[sourceType];
  const Icon = meta.icon;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#E6E4DD] bg-[#FCFBF8] px-2.5 py-1 text-[11px] text-[#5A7C96]">
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
};
