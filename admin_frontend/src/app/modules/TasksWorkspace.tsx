import React, { useState } from 'react';
import { 
  CheckCircle2, Clock, AlertCircle, User, Users, FileText, 
  Calendar, Search, Filter, MoreHorizontal, LayoutList, 
  LayoutGrid, List, MessageSquare, ArrowRight, Play, Check
} from 'lucide-react';

import { EmptyState } from './EmptyState';

type TaskStatus = 'todo' | 'in_progress' | 'waiting_client' | 'waiting_internal' | 'completed';
type TaskPriority = 'High' | 'Medium' | 'Low';
type LayoutView = 'queue' | 'list' | 'kanban';

interface Task {
  id: string;
  title: string;
  matter: string;
  client: string;
  assignee: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  isOverdue?: boolean;
  isToday?: boolean;
}

const MOCK_TASKS: Task[] = [
  { id: 'TSK-101', title: 'Review Settlement Agreement', matter: 'Smith vs. Jones', client: 'John Smith', assignee: 'Sarah Jenkins', dueDate: '2026-04-14', status: 'in_progress', priority: 'High', isOverdue: true },
  { id: 'TSK-102', title: 'File Motion for Discovery', matter: 'TechCorp IP Dispute', client: 'TechCorp', assignee: 'Michael Chang', dueDate: '2026-04-16', status: 'todo', priority: 'High', isToday: true },
  { id: 'TSK-103', title: 'Awaiting Signatures on Retainer', matter: 'Estate Planning - Wayne', client: 'Bruce Wayne', assignee: 'Sarah Jenkins', dueDate: '2026-04-17', status: 'waiting_client', priority: 'Medium' },
  { id: 'TSK-104', title: 'Draft Initial Disclosures', matter: 'Acme Corp Merger', client: 'Acme Corp', assignee: 'David Legal', dueDate: '2026-04-16', status: 'in_progress', priority: 'Medium', isToday: true },
  { id: 'TSK-105', title: 'Internal Conflict Check', matter: 'New Client Intake: Stark', client: 'Tony Stark', assignee: 'Admin Team', dueDate: '2026-04-16', status: 'waiting_internal', priority: 'High', isToday: true },
  { id: 'TSK-106', title: 'Prepare Trial Exhibits', matter: 'Smith vs. Jones', client: 'John Smith', assignee: 'Sarah Jenkins', dueDate: '2026-04-20', status: 'todo', priority: 'Low' },
  { id: 'TSK-107', title: 'Client Uploaded Financials Review', matter: 'Daily Planet Audit', client: 'Daily Planet', assignee: 'Michael Chang', dueDate: '2026-04-15', status: 'completed', priority: 'Medium' },
  { id: 'TSK-108', title: 'Send Overdue Invoice Reminder', matter: 'Wayne Ent Retainer', client: 'Wayne Ent', assignee: 'Billing Dept', dueDate: '2026-04-12', status: 'todo', priority: 'High', isOverdue: true },
  { id: 'TSK-109', title: 'Partner Review of Contract', matter: 'TechCorp IP Dispute', client: 'TechCorp', assignee: 'Managing Partner', dueDate: '2026-04-18', status: 'waiting_internal', priority: 'Medium' },
  { id: 'TSK-110', title: 'Follow up on Medical Records', matter: 'Personal Injury - Kent', client: 'Clark Kent', assignee: 'Sarah Jenkins', dueDate: '2026-04-19', status: 'waiting_client', priority: 'Low' },
];

export const TasksWorkspace = () => {
  const [view, setView] = useState<LayoutView>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all'); // all, my_tasks, overdue, today, waiting

  // Filter Logic
  let filteredTasks = MOCK_TASKS.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filterMode === 'overdue') filteredTasks = filteredTasks.filter(t => t.isOverdue && t.status !== 'completed');
  if (filterMode === 'today') filteredTasks = filteredTasks.filter(t => t.isToday && t.status !== 'completed');
  if (filterMode === 'waiting') filteredTasks = filteredTasks.filter(t => t.status === 'waiting_client' || t.status === 'waiting_internal');
  if (filterMode === 'my_tasks') filteredTasks = filteredTasks.filter(t => t.assignee === 'Sarah Jenkins'); // Mocking current user

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'High': return 'bg-[#FDE8EC] text-[#d4183d]';
      case 'Medium': return 'bg-[#FDF8EF] text-[#B8860B]';
      case 'Low': return 'bg-[#EFF3F6] text-[#5A7C96]';
      default: return 'bg-[#F4F1EA] text-[#8C8981]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'todo': return <CheckCircle2 className="w-4 h-4 text-[#A8A69F]" />;
      case 'in_progress': return <Play className="w-4 h-4 text-[#C19A5B]" />;
      case 'waiting_client': return <User className="w-4 h-4 text-[#5A7C96]" />;
      case 'waiting_internal': return <Users className="w-4 h-4 text-[#7C3AED]" />;
      case 'completed': return <Check className="w-4 h-4 text-[#2e7d32]" />;
      default: return <CheckCircle2 className="w-4 h-4 text-[#A8A69F]" />;
    }
  };

  const getStatusText = (status: string) => {
    return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Sections for Queue View
  const attentionToday = filteredTasks.filter(t => t.isToday && t.status !== 'completed');
  const overdueItems = filteredTasks.filter(t => t.isOverdue && t.status !== 'completed');
  const waitingItems = filteredTasks.filter(t => (t.status === 'waiting_client' || t.status === 'waiting_internal'));
  const completedRecent = filteredTasks.filter(t => t.status === 'completed');
  const upNext = filteredTasks.filter(t => !t.isToday && !t.isOverdue && t.status !== 'completed' && t.status !== 'waiting_client' && t.status !== 'waiting_internal');

  // --- VIEWS ---

  const renderQueueView = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar Filters */}
      <div className="space-y-1">
        <h3 className="text-xs font-bold text-[#8C8981] uppercase tracking-wider mb-3 px-3">Quick Filters</h3>
        {[
          { id: 'all', label: 'All Open Tasks', icon: LayoutList, count: MOCK_TASKS.filter(t=>t.status!=='completed').length },
          { id: 'my_tasks', label: 'Assigned to Me', icon: User, count: MOCK_TASKS.filter(t=>t.assignee==='Sarah Jenkins' && t.status!=='completed').length },
          { id: 'today', label: 'Needs Attention Today', icon: AlertCircle, count: MOCK_TASKS.filter(t=>t.isToday && t.status!=='completed').length },
          { id: 'overdue', label: 'Overdue', icon: Clock, count: MOCK_TASKS.filter(t=>t.isOverdue && t.status!=='completed').length },
          { id: 'waiting', label: 'Blocked / Waiting', icon: Users, count: MOCK_TASKS.filter(t=>(t.status==='waiting_client'||t.status==='waiting_internal')).length },
        ].map(filter => (
          <button 
            key={filter.id}
            onClick={() => setFilterMode(filter.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${filterMode === filter.id ? 'bg-[#2C2B29] text-white' : 'text-[#2C2B29] hover:bg-[#F4F1EA]'}`}
          >
            <div className="flex items-center gap-2">
              <filter.icon className="w-4 h-4" />
              <span>{filter.label}</span>
            </div>
            <span className={`text-xs ${filterMode === filter.id ? 'text-[#E6E4DD]' : 'text-[#8C8981]'}`}>{filter.count}</span>
          </button>
        ))}
      </div>

      {/* Main Queue Column */}
      <div className="md:col-span-3 space-y-8">
        
        {/* OVERDUE */}
        {overdueItems.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#d4183d] flex items-center gap-2 border-b border-[#E6E4DD] pb-2">
              <AlertCircle className="w-4 h-4" /> Overdue ({overdueItems.length})
            </h3>
            <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden divide-y divide-[#E6E4DD]">
              {overdueItems.map(task => renderQueueItem(task))}
            </div>
          </div>
        )}

        {/* TODAY */}
        {attentionToday.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#B8860B] flex items-center gap-2 border-b border-[#E6E4DD] pb-2">
              <CheckCircle2 className="w-4 h-4" /> Attention Today ({attentionToday.length})
            </h3>
            <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden divide-y divide-[#E6E4DD]">
              {attentionToday.map(task => renderQueueItem(task))}
            </div>
          </div>
        )}

        {/* WAITING */}
        {waitingItems.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#5A7C96] flex items-center gap-2 border-b border-[#E6E4DD] pb-2">
              <Users className="w-4 h-4" /> Waiting on Others ({waitingItems.length})
            </h3>
            <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden divide-y divide-[#E6E4DD]">
              {waitingItems.map(task => renderQueueItem(task))}
            </div>
          </div>
        )}

        {/* UP NEXT */}
        {upNext.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#2C2B29] flex items-center gap-2 border-b border-[#E6E4DD] pb-2">
              <Calendar className="w-4 h-4" /> Up Next ({upNext.length})
            </h3>
            <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden divide-y divide-[#E6E4DD]">
              {upNext.map(task => renderQueueItem(task))}
            </div>
          </div>
        )}

        {/* RECENTLY COMPLETED */}
        {completedRecent.length > 0 && filterMode === 'all' && (
          <div className="space-y-3 opacity-60">
            <h3 className="text-sm font-medium text-[#8C8981] flex items-center gap-2 border-b border-[#E6E4DD] pb-2">
              <Check className="w-4 h-4" /> Recently Completed
            </h3>
            <div className="bg-white border border-[#E6E4DD] rounded-xl overflow-hidden divide-y divide-[#E6E4DD]">
              {completedRecent.map(task => renderQueueItem(task))}
            </div>
          </div>
        )}

      </div>
    </div>
  );

  const renderQueueItem = (task: Task) => (
    <div key={task.id} className="p-3 hover:bg-[#FCFBF8] transition flex items-center gap-4 group">
      <button className="text-[#A8A69F] hover:text-[#2e7d32] transition shrink-0">
        <CheckCircle2 className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
        <div className="col-span-5">
          <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'text-[#8C8981] line-through' : 'text-[#2C2B29]'}`}>{task.title}</p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-[#8C8981]">
            <span>{task.matter}</span>
            <span className="w-1 h-1 rounded-full bg-[#E6E4DD]" />
            <span className="truncate">{task.client}</span>
          </div>
        </div>
        <div className="col-span-3 flex items-center gap-2">
          {getStatusIcon(task.status)}
          <span className="text-xs text-[#8C8981]">{getStatusText(task.status)}</span>
        </div>
        <div className="col-span-2 text-xs text-[#8C8981] flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span className={`${task.isOverdue && task.status !== 'completed' ? 'text-[#d4183d] font-medium' : ''}`}>{task.dueDate}</span>
        </div>
        <div className="col-span-2 flex items-center justify-end gap-2">
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
          <button className="p-1 text-[#8C8981] hover:text-[#2C2B29] opacity-0 group-hover:opacity-100 transition rounded hover:bg-[#E6E4DD]">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F4F1EA] text-[#8C8981] border-b border-[#E6E4DD]">
            <tr>
              <th className="px-4 py-3 font-medium">Task</th>
              <th className="px-4 py-3 font-medium">Matter / Client</th>
              <th className="px-4 py-3 font-medium">Assignee</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Due Date</th>
              <th className="px-4 py-3 font-medium text-right">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E4DD]">
            {MOCK_TASKS.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12">
                  <EmptyState 
                    icon={CheckCircle2} 
                    title="No tasks yet" 
                    description="Create your first task to get organized."
                    action={{ label: "New Task", onClick: () => {} }}
                  />
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12">
                  <EmptyState 
                    icon={Search} 
                    title="No tasks found" 
                    description="There are no tasks matching your current filters. You can clear your filters or change the view."
                    action={{ label: "Clear Filters", onClick: () => { setFilterMode('all'); setSearchQuery(''); } }}
                  />
                </td>
              </tr>
            ) : filteredTasks.map(task => (
              <tr key={task.id} className="hover:bg-[#FCFBF8] transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button className="text-[#A8A69F] hover:text-[#2e7d32] transition"><CheckCircle2 className="w-4 h-4" /></button>
                    <span className={`font-medium ${task.status === 'completed' ? 'text-[#8C8981] line-through' : 'text-[#2C2B29]'}`}>{task.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#5A7C96]">{task.matter} <span className="text-[#8C8981] text-xs block">{task.client}</span></td>
                <td className="px-4 py-3 text-[#2C2B29]">{task.assignee}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-[#8C8981]">
                    {getStatusIcon(task.status)}
                    {getStatusText(task.status)}
                  </div>
                </td>
                <td className={`px-4 py-3 text-xs ${task.isOverdue && task.status !== 'completed' ? 'text-[#d4183d] font-medium' : 'text-[#8C8981]'}`}>{task.dueDate}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderKanbanView = () => {
    const columns: { id: TaskStatus, title: string }[] = [
      { id: 'todo', title: 'To Do' },
      { id: 'in_progress', title: 'In Progress' },
      { id: 'waiting_client', title: 'Waiting (Client)' },
      { id: 'waiting_internal', title: 'Waiting (Internal)' },
      { id: 'completed', title: 'Completed' },
    ];

    return (
      <div className="flex gap-4 overflow-x-auto pb-4 h-[70vh]">
        {columns.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="min-w-[280px] w-[280px] flex flex-col bg-[#F4F1EA] border border-[#E6E4DD] rounded-xl">
              <div className="p-3 border-b border-[#E6E4DD] flex items-center justify-between">
                <h3 className="font-medium text-[#2C2B29] text-sm">{col.title}</h3>
                <span className="text-xs bg-[#E6E4DD] text-[#8C8981] px-2 py-0.5 rounded-full font-medium">{colTasks.length}</span>
              </div>
              <div className="p-2 flex-1 overflow-y-auto space-y-2">
                {colTasks.length === 0 ? (
                  <div className="text-center p-4 border-2 border-dashed border-[#E6E4DD] rounded-lg mt-2">
                    <p className="text-xs text-[#8C8981]">No tasks</p>
                  </div>
                ) : colTasks.map(task => (
                  <div key={task.id} className="bg-white p-3 rounded-lg border border-[#E6E4DD] shadow-sm hover:border-[#C19A5B] transition cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {task.isOverdue && col.id !== 'completed' && (
                        <span className="text-[10px] uppercase font-bold text-[#d4183d] flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Overdue</span>
                      )}
                    </div>
                    <p className={`text-sm font-medium mb-1 ${col.id === 'completed' ? 'text-[#8C8981] line-through' : 'text-[#2C2B29]'}`}>{task.title}</p>
                    <p className="text-xs text-[#5A7C96] mb-3">{task.matter}</p>
                    <div className="flex items-center justify-between text-xs text-[#8C8981] pt-3 border-t border-[#F4F1EA]">
                      <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {task.assignee.split(' ')[0]}</span>
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {task.dueDate.split('-')[2]}/{task.dueDate.split('-')[1]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-medium text-[#2C2B29]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Daily Operations
          </h2>
          <p className="text-[#8C8981] mt-1 text-sm">Manage tasks, deadlines, and team workflows.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8C8981] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-[#E6E4DD] rounded-lg text-sm w-[240px] focus:outline-none focus:ring-2 focus:ring-[#C19A5B]/20 focus:border-[#C19A5B] transition shadow-sm"
            />
          </div>
          
          <div className="flex items-center bg-white border border-[#E6E4DD] rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => setView('queue')}
              className={`p-1.5 rounded transition ${view === 'queue' ? 'bg-[#F4F1EA] text-[#2C2B29]' : 'text-[#8C8981] hover:text-[#2C2B29]'}`}
              title="Queue View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setView('list')}
              className={`p-1.5 rounded transition ${view === 'list' ? 'bg-[#F4F1EA] text-[#2C2B29]' : 'text-[#8C8981] hover:text-[#2C2B29]'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setView('kanban')}
              className={`p-1.5 rounded transition ${view === 'kanban' ? 'bg-[#F4F1EA] text-[#2C2B29]' : 'text-[#8C8981] hover:text-[#2C2B29]'}`}
              title="Kanban View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          
          <button className="px-4 py-2 bg-[#2C2B29] text-white rounded-lg shadow-sm text-sm font-medium hover:bg-[#4A4946] transition flex items-center gap-2">
            New Task
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {view === 'queue' && renderQueueView()}
        {view === 'list' && renderListView()}
        {view === 'kanban' && renderKanbanView()}
      </div>
    </div>
  );
};
