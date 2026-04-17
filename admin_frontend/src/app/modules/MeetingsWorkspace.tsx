import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Video, Phone, User, 
  MapPin, CheckCircle, XCircle, AlertCircle, ChevronLeft, 
  ChevronRight, MoreVertical, Plus, List, LayoutGrid, Eye, EyeOff
} from 'lucide-react';
import { EVENTS, formatDate, PlatformEvent } from '../data/seedData';
import { StatusBadge } from '../components/dashboard/StatusBadge';

interface MeetingsWorkspaceProps {
  //
}

type ViewMode = 'calendar' | 'agenda';
type FilterStatus = 'all' | 'upcoming' | 'completed' | 'cancelled';
type FilterType = 'all' | 'consultation' | 'hearing' | 'field-visit' | 'deadline';

export const MeetingsWorkspace: React.FC<MeetingsWorkspaceProps> = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('upcoming');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(EVENTS[0]?.id || null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date('2026-03-24')); // Mocking today to seed data range

  const activeEvent = useMemo(() => EVENTS.find(e => e.id === selectedEventId) || null, [selectedEventId]);

  const filteredEvents = useMemo(() => {
    return EVENTS.filter(e => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (typeFilter !== 'all') {
        if (typeFilter === 'consultation' && e.type !== 'consultation') return false;
        if (typeFilter === 'hearing' && e.type !== 'hearing') return false;
        if (typeFilter === 'field-visit' && e.type !== 'field-visit') return false;
        if (typeFilter === 'deadline' && e.type !== 'deadline') return false;
      }
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [statusFilter, typeFilter]);

  // Group events by date for agenda view
  const groupedEvents = useMemo(() => {
    const groups: { [date: string]: PlatformEvent[] } = {};
    filteredEvents.forEach(evt => {
      if (!groups[evt.date]) groups[evt.date] = [];
      groups[evt.date].push(evt);
    });
    return groups;
  }, [filteredEvents]);

  const getModeIcon = (mode: string, className = "w-4 h-4") => {
    switch (mode) {
      case 'video': return <Video className={`text-blue-500 ${className}`} />;
      case 'phone': return <Phone className={`text-emerald-500 ${className}`} />;
      case 'in-person':
      case 'court':
      case 'office': return <MapPin className={`text-amber-500 ${className}`} />;
      default: return <CalendarIcon className={`text-gray-400 ${className}`} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'hearing': return 'bg-red-50 text-red-700 border-red-100';
      case 'consultation': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'field-visit': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'deadline': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'upcoming': return 'border-l-blue-500';
      case 'completed': return 'border-l-emerald-500 opacity-70';
      case 'cancelled': return 'border-l-red-500 opacity-50';
      case 'rescheduled': return 'border-l-amber-500';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col -m-6 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-medium text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Meetings & Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Admin scheduling, meeting oversight, and matter deadlines.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('agenda')}
              className={`p-1.5 rounded-md flex items-center transition ${viewMode === 'agenda' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
              title="Agenda View"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md flex items-center transition ${viewMode === 'calendar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
              title="Calendar View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition flex items-center gap-2">
            <Plus className="w-4 h-4" /> Schedule Event
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-6">
        
        {/* Left Column: Agenda/Calendar */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-gray-50/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button className="p-1 text-gray-400 hover:text-gray-900 bg-white border border-gray-200 rounded"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-medium text-gray-900 min-w-[120px] text-center">
                  {currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
                <button className="p-1 text-gray-400 hover:text-gray-900 bg-white border border-gray-200 rounded"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <button className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition">
                Today
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as FilterStatus)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none bg-white min-w-[120px]"
              >
                <option value="all">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as FilterType)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none bg-white min-w-[130px]"
              >
                <option value="all">All Event Types</option>
                <option value="consultation">Consultations</option>
                <option value="hearing">Hearings</option>
                <option value="field-visit">Field Visits</option>
                <option value="deadline">Deadlines</option>
              </select>
            </div>
          </div>

          {/* View Area */}
          <div className="flex-1 overflow-y-auto bg-gray-50/30 p-4">
            {viewMode === 'agenda' ? (
              <div className="space-y-8 max-w-4xl mx-auto">
                {Object.entries(groupedEvents).map(([date, events]) => (
                  <div key={date}>
                    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4 sticky top-0 bg-gray-50/90 backdrop-blur z-10">
                      {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h3>
                    <div className="space-y-3 pl-2">
                      {events.map(evt => (
                        <div 
                          key={evt.id} 
                          onClick={() => setSelectedEventId(evt.id)}
                          className={`flex items-stretch bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer transition overflow-hidden border-l-4 group hover:shadow-md ${getStatusStyle(evt.status)} ${selectedEventId === evt.id ? 'ring-2 ring-blue-500/20' : ''}`}
                        >
                          <div className="w-24 p-4 border-r border-gray-100 flex flex-col items-center justify-center shrink-0 bg-gray-50/50">
                            <span className="text-sm font-bold text-gray-900">{evt.time.split(' ')[0]}</span>
                            <span className="text-xs font-medium text-gray-500">{evt.time.split(' ')[1]}</span>
                            {evt.duration > 0 && <span className="text-[10px] text-gray-400 mt-1">{evt.duration}m</span>}
                          </div>
                          <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900 truncate">{evt.title}</h4>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getTypeColor(evt.type)} uppercase tracking-wider`}>
                                  {evt.type.replace('-', ' ')}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                {evt.clientName && (
                                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {evt.clientName}</span>
                                )}
                                <span className="flex items-center gap-1">
                                  {getModeIcon(evt.mode, "w-3.5 h-3.5")} 
                                  <span className="capitalize">{evt.mode.replace('-', ' ')}</span>
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0">
                              {evt.status === 'upcoming' && evt.meetLink && (
                                <a 
                                  href={evt.meetLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium rounded transition flex items-center gap-1.5"
                                >
                                  <Video className="w-3.5 h-3.5" /> Join
                                </a>
                              )}
                              <StatusBadge status={evt.status} size="sm" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredEvents.length === 0 && (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No events found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your filters or date range.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <LayoutGrid className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Calendar View (Mock)</h3>
                  <p className="text-gray-500 mt-1 text-sm max-w-xs mx-auto">A full monthly grid view would render here. Switching back to Agenda view is recommended for detailed inspection.</p>
                  <button onClick={() => setViewMode('agenda')} className="mt-4 text-blue-600 text-sm font-medium hover:underline">Switch to Agenda</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Meeting Detail Drawer/Panel */}
        {activeEvent ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden h-full">
            <div className="p-5 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
              <div>
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border mb-2 uppercase tracking-wider ${getTypeColor(activeEvent.type)}`}>
                  {activeEvent.type.replace('-', ' ')}
                </span>
                <h2 className="text-lg font-medium text-gray-900 leading-tight">{activeEvent.title}</h2>
              </div>
              <div className="flex gap-2">
                <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition"><MoreVertical className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Core Details */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{new Date(activeEvent.date).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    <p className="text-xs text-gray-500">{activeEvent.time} ({activeEvent.duration > 0 ? `${activeEvent.duration} minutes` : 'All Day'})</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    {getModeIcon(activeEvent.mode)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize">{activeEvent.mode.replace('-', ' ')}</p>
                    {activeEvent.location ? (
                      <p className="text-xs text-gray-500 truncate">{activeEvent.location}</p>
                    ) : activeEvent.meetLink ? (
                      <a href={activeEvent.meetLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                        {activeEvent.meetLink}
                      </a>
                    ) : null}
                  </div>
                </div>

                {activeEvent.clientName && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Client: {activeEvent.clientName}</p>
                      {activeEvent.matterTitle && (
                        <p className="text-xs text-gray-500 truncate">Matter: {activeEvent.matterTitle}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Controls */}
              <div className="pt-5 border-t border-gray-100 space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Event Settings</h3>
                
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    {activeEvent.visibleToClient ? <Eye className="w-4 h-4 text-blue-600" /> : <EyeOff className="w-4 h-4 text-amber-600" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900">Client Visibility</p>
                      <p className="text-xs text-gray-500">{activeEvent.visibleToClient ? 'Visible on client portal' : 'Hidden internal event'}</p>
                    </div>
                  </div>
                  <button className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${activeEvent.visibleToClient ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${activeEvent.visibleToClient ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Automated Reminders</p>
                      <p className="text-xs text-gray-500">24hr & 1hr prior</p>
                    </div>
                  </div>
                  <button className="relative inline-flex h-5 w-9 items-center rounded-full bg-blue-600 transition-colors">
                    <span className="inline-block h-3 w-3 transform translate-x-5 rounded-full bg-white transition-transform" />
                  </button>
                </div>
              </div>

              {/* Notes */}
              {activeEvent.notes && (
                <div className="pt-5 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Event Notes</h3>
                  <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-lg text-sm text-gray-800 whitespace-pre-wrap">
                    {activeEvent.notes}
                  </div>
                </div>
              )}

              {/* Timeline/History Mock */}
              <div className="pt-5 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Event History</h3>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gray-100">
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-gray-300 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] text-xs text-gray-500 bg-white border border-gray-100 p-2 rounded shadow-sm">
                      <span className="font-medium text-gray-900 block mb-0.5">Created</span>
                      System • {formatDate(new Date(new Date(activeEvent.date).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            {activeEvent.status === 'upcoming' && (
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
                <button className="flex-1 bg-white border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                  Reschedule
                </button>
                {activeEvent.meetLink && (
                  <a href={activeEvent.meetLink} target="_blank" rel="noopener noreferrer" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2">
                    <Video className="w-4 h-4" /> Join Meet
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center justify-center p-8 text-center h-full">
            <CalendarIcon className="w-12 h-12 text-gray-200 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Event Selected</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">Select an event from the calendar to view its details, manage visibility, or join a call.</p>
          </div>
        )}
      </div>
    </div>
  );
};
