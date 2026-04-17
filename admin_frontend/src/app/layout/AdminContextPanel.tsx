import React from 'react';
import { FileText, Link as LinkIcon, Mail, X } from 'lucide-react';
import { formatDateTime } from '../data/seedData';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { adminApi } from '../lib/api/admin';

type AdminContextPanelProps = {
  onClose: () => void;
};

export const AdminContextPanel: React.FC<AdminContextPanelProps> = ({ onClose }) => {
  const { data } = useAsyncResource(() => adminApi.getDashboardWorkspace(), []);
  const recentAudit = (data?.recentAudit || []).slice(0, 3);
  const recentNotifications = (data?.recentNotifications || []).slice(0, 3);

  return (
    <aside className="fixed xl:static top-0 right-0 h-full w-80 bg-[#FCFBF8] border-l border-[#E6E4DD] overflow-y-auto z-50 xl:z-0 shadow-[-4px_0_24px_rgba(0,0,0,0.08)] xl:shadow-[-4px_0_12px_rgba(0,0,0,0.02)]">
      <div className="p-5 mt-16 xl:mt-0">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-medium text-[#2C2B29]">Context & Quick Links</h3>
          <button
            className="text-[#8C8981] hover:text-[#2C2B29] p-1 rounded-md hover:bg-[#E6E4DD] transition"
            onClick={onClose}
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-bold text-[#A8A69F] uppercase tracking-widest mb-3">
              Recent Activity
            </h4>
            <div className="space-y-3">
              {recentAudit.map((entry) => (
                <div className="flex gap-3" key={entry.id}>
                  <div className="w-2 h-2 rounded-full bg-[#C19A5B] mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-[#2C2B29]">{entry.action}</p>
                    <p className="text-xs text-[#8C8981]">
                      {entry.actor} • {formatDateTime(entry.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#A8A69F] uppercase tracking-widest mb-3">
              Notifications Snapshot
            </h4>
            <div className="space-y-3">
              {recentNotifications.map((notification) => (
                <div className="rounded-lg border border-[#E6E4DD] bg-white p-3" key={notification.id}>
                  <p className="text-sm font-medium text-[#2C2B29]">{notification.title}</p>
                  <p className="text-xs text-[#8C8981] mt-1">{notification.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#A8A69F] uppercase tracking-widest mb-3">
              Quick Actions
            </h4>
            <div className="space-y-2 text-sm text-[#5A7C96]">
              <button className="flex items-center gap-2 w-full hover:underline">
                <LinkIcon className="w-3.5 h-3.5" /> Send Intake Form
              </button>
              <button className="flex items-center gap-2 w-full hover:underline">
                <FileText className="w-3.5 h-3.5" /> Generate Report
              </button>
              <button className="flex items-center gap-2 w-full hover:underline">
                <Mail className="w-3.5 h-3.5" /> Email Client
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
