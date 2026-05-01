import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend, ComposedChart
} from 'recharts';
import { 
  Calendar as CalendarIcon, Filter, Search, Download, ChevronDown, Check, 
  ArrowUpRight, ArrowDownRight, Users, Briefcase, CreditCard, MessageSquare, 
  AlertCircle, Activity, Target, Clock, TrendingUp
} from 'lucide-react';

const clientGrowthData = [
  { month: 'Jan', organic: 12, referrals: 8, total: 20 },
  { month: 'Feb', organic: 15, referrals: 10, total: 45 },
  { month: 'Mar', organic: 18, referrals: 14, total: 77 },
  { month: 'Apr', organic: 22, referrals: 15, total: 114 },
  { month: 'May', organic: 28, referrals: 20, total: 162 },
  { month: 'Jun', organic: 35, referrals: 24, total: 221 },
];

const onboardingFunnel = [
  { stage: 'Initial Inquiry', count: 150, dropoff: 0 },
  { stage: 'Consultation Booked', count: 110, dropoff: 26 },
  { stage: 'Proposal Sent', count: 85, dropoff: 22 },
  { stage: 'Contract Signed', count: 65, dropoff: 23 },
  { stage: 'Retainer Paid', count: 58, dropoff: 10 },
];

const matterStageFlow = [
  { month: 'Jan', Intake: 15, Discovery: 20, Drafting: 10, Negotiation: 5, Closing: 2 },
  { month: 'Feb', Intake: 18, Discovery: 22, Drafting: 15, Negotiation: 8, Closing: 4 },
  { month: 'Mar', Intake: 12, Discovery: 25, Drafting: 18, Negotiation: 10, Closing: 6 },
  { month: 'Apr', Intake: 25, Discovery: 20, Drafting: 22, Negotiation: 12, Closing: 8 },
  { month: 'May', Intake: 20, Discovery: 28, Drafting: 25, Negotiation: 15, Closing: 12 },
  { month: 'Jun', Intake: 30, Discovery: 25, Drafting: 28, Negotiation: 18, Closing: 15 },
];

const invoiceAgingData = [
  { bucket: 'Current', Corporate: 45000, Litigation: 30000, Family: 15000 },
  { bucket: '1-30 Days', Corporate: 15000, Litigation: 12000, Family: 5000 },
  { bucket: '31-60 Days', Corporate: 5000, Litigation: 8000, Family: 2000 },
  { bucket: '61-90 Days', Corporate: 2000, Litigation: 3000, Family: 1000 },
  { bucket: '90+ Days', Corporate: 1000, Litigation: 4000, Family: 500 },
];

const communicationLoad = [
  { day: 'Mon', Emails: 120, Portal: 45, Calls: 25 },
  { day: 'Tue', Emails: 135, Portal: 52, Calls: 28 },
  { day: 'Wed', Emails: 150, Portal: 60, Calls: 35 },
  { day: 'Thu', Emails: 142, Portal: 55, Calls: 30 },
  { day: 'Fri', Emails: 110, Portal: 40, Calls: 20 },
];

const reminderFailures = [
  { id: 1, client: 'Stark Industries', type: 'Signature Required', date: '2 hours ago', status: 'Unresponsive', severity: 'high' },
  { id: 2, client: 'Wayne Enterprises', type: 'Invoice Overdue', date: '5 hours ago', status: 'Failed Delivery', severity: 'high' },
  { id: 3, client: 'Acme Corp', type: 'Document Upload', date: '1 day ago', status: 'Opened, No Action', severity: 'medium' },
  { id: 4, client: 'Globex', type: 'Meeting Reminder', date: '2 days ago', status: 'Unresponsive', severity: 'low' },
];

const adminProductivity = [
  { rank: 1, name: 'Sarah Jenkins', role: 'Paralegal', tasks: 145, time: '1.2h', score: 98 },
  { rank: 2, name: 'Michael Chen', role: 'Ops Manager', tasks: 132, time: '1.5h', score: 94 },
  { rank: 3, name: 'Jessica Rossi', role: 'Billing', tasks: 118, time: '2.1h', score: 89 },
  { rank: 4, name: 'David Kim', role: 'Clerk', tasks: 95, time: '1.8h', score: 85 },
];

const COLORS = {
  charcoal: '#2C2B29',
  gold: '#C19A5B',
  blue: '#5A7C96',
  stone: '#8C8981',
  lightGold: '#EAD2A8',
  lightBlue: '#D3DFE8',
  red: '#d4183d',
  ivory: '#FCFBF8'
};

const MetricCard = ({ title, value, trend, isUp, subtitle, icon: Icon }: any) => (
  <div className="bg-white border border-[#E6E4DD] p-5 rounded-xl shadow-sm flex flex-col group hover:border-[#C19A5B] transition duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-[#F4F1EA] rounded-md text-[#2C2B29] group-hover:bg-[#EAD2A8] transition-colors">
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-sm font-medium text-[#8C8981]">{title}</p>
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isUp ? 'bg-[#EFF3F6] text-[#5A7C96]' : 'bg-[#FDE8EC] text-[#d4183d]'}`}>
        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {trend}
      </div>
    </div>
    <div className="mt-auto">
      <p className="text-3xl font-medium text-[#2C2B29]" style={{ fontFamily: "'Playfair Display', serif" }}>{value}</p>
      <p className="text-xs text-[#8C8981] mt-1">{subtitle}</p>
    </div>
  </div>
);

export const AnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('executive');

  const renderFunnel = () => {
    const maxCount = onboardingFunnel[0].count;
    return (
      <div className="flex flex-col gap-3 mt-4">
        {onboardingFunnel.map((step, idx) => {
          const width = (step.count / maxCount) * 100;
          return (
            <div key={idx} className="relative group">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#2C2B29]">{step.stage}</span>
                <span className="text-[#8C8981]">{step.count} clients</span>
              </div>
              <div className="w-full bg-[#F4F1EA] rounded-sm h-8 relative overflow-hidden flex items-center">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: \`\${width}%\` }}
                  transition={{ duration: 1, delay: idx * 0.1 }}
                  className="h-full bg-[#2C2B29] absolute left-0 top-0 rounded-sm"
                />
                <div className="relative z-10 px-3 w-full flex justify-between items-center text-[10px] text-white font-medium">
                  {idx > 0 && <span className="opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md">-{step.dropoff}% dropoff</span>}
                  <span className="ml-auto drop-shadow-md">{Math.round((step.count / maxCount) * 100)}% retention</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'executive':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="New Clients" value="221" trend="+34%" isUp={true} subtitle="vs. last quarter" icon={Users} />
              <MetricCard title="Avg Matter Velocity" value="42 Days" trend="-5%" isUp={true} subtitle="Intake to closing" icon={Activity} />
              <MetricCard title="A/R Overdue" value="$32.5k" trend="+12%" isUp={false} subtitle="15% of total outstanding" icon={CreditCard} />
              <MetricCard title="Staff Utilization" value="84%" trend="+2%" isUp={true} subtitle="Target: 80% billable" icon={Target} />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Client Growth Chart */}
              <div className="lg:col-span-2 bg-white border border-[#E6E4DD] p-6 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-medium text-[#2C2B29]">Client Growth Trajectory</h3>
                    <p className="text-xs text-[#8C8981] mt-1">Cumulative growth across channels.</p>
                  </div>
                  <button className="text-xs font-medium text-[#8C8981] hover:text-[#2C2B29] border border-[#E6E4DD] px-3 py-1.5 rounded-md">View Report</button>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={clientGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs key="defs">
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E4DD" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#2C2B29', color: '#FCFBF8', border: 'none', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="total" name="Total Clients" stroke={COLORS.gold} strokeWidth={3} fill="url(#colorTotal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Onboarding Funnel */}
              <div className="bg-white border border-[#E6E4DD] p-6 rounded-xl shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-medium text-[#2C2B29]">Onboarding Funnel</h3>
                    <p className="text-xs text-[#8C8981] mt-1">Conversion rates by stage.</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                  {renderFunnel()}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Matter Stage Flow */}
              <div className="bg-white border border-[#E6E4DD] p-6 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-medium text-[#2C2B29]">Matter Stage Distribution</h3>
                    <p className="text-xs text-[#8C8981] mt-1">Volume of matters across lifecycle stages.</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={matterStageFlow} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E4DD" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#2C2B29', color: '#FCFBF8', border: 'none', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                      <Bar dataKey="Intake" stackId="a" fill={COLORS.charcoal} />
                      <Bar dataKey="Discovery" stackId="a" fill={COLORS.blue} />
                      <Bar dataKey="Drafting" stackId="a" fill={COLORS.gold} />
                      <Bar dataKey="Negotiation" stackId="a" fill={COLORS.stone} />
                      <Bar dataKey="Closing" stackId="a" fill={COLORS.lightGold} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Invoice Aging */}
              <div className="bg-white border border-[#E6E4DD] p-6 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-medium text-[#2C2B29]">Invoice Aging Analysis</h3>
                    <p className="text-xs text-[#8C8981] mt-1">Outstanding collections by practice area.</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={invoiceAgingData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E6E4DD" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} tickFormatter={(val) => \`$\${val/1000}k\`} />
                      <YAxis type="category" dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: '#2C2B29', fontSize: 12, fontWeight: 500 }} width={80} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#2C2B29', color: '#FCFBF8', border: 'none', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px' }}
                        cursor={{fill: '#F4F1EA'}}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                      <Bar dataKey="Corporate" stackId="a" fill={COLORS.charcoal} />
                      <Bar dataKey="Litigation" stackId="a" fill={COLORS.blue} />
                      <Bar dataKey="Family" stackId="a" fill={COLORS.gold} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        );

      case 'operations':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Communication Load */}
              <div className="lg:col-span-2 bg-white border border-[#E6E4DD] p-6 rounded-xl shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-medium text-[#2C2B29]">Communication Load</h3>
                    <p className="text-xs text-[#8C8981] mt-1">Volume of inbound client communications.</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={communicationLoad} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E4DD" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#2C2B29', color: '#FCFBF8', border: 'none', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                      <Area type="monotone" dataKey="Emails" fill={COLORS.lightBlue} stroke={COLORS.blue} />
                      <Bar dataKey="Portal" barSize={20} fill={COLORS.charcoal} radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="Calls" stroke={COLORS.gold} strokeWidth={3} dot={{r:4, fill: COLORS.gold}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Reminder Failures Queue */}
              <div className="bg-white border border-[#E6E4DD] p-6 rounded-xl shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-medium text-[#2C2B29]">System Reminder Failures</h3>
                    <p className="text-xs text-[#8C8981] mt-1">Requires manual intervention.</p>
                  </div>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {reminderFailures.map(failure => (
                    <div key={failure.id} className="p-3 border border-[#E6E4DD] rounded-lg hover:border-[#C19A5B] transition-colors group cursor-pointer">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium text-[#2C2B29]">{failure.client}</span>
                        <span className="text-[10px] text-[#8C8981]">{failure.date}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className={`w-3.5 h-3.5 ${failure.severity === 'high' ? 'text-[#d4183d]' : 'text-[#C19A5B]'}`} />
                        <span className="text-xs text-[#8C8981]">{failure.type}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#F4F1EA]">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8C8981]">{failure.status}</span>
                        <span className="text-[10px] font-medium text-[#C19A5B] group-hover:underline">Resolve &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Admin Productivity Leaderboard */}
            <div className="bg-white border border-[#E6E4DD] p-6 rounded-xl shadow-sm">
               <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-medium text-[#2C2B29]">Team Productivity & Output</h3>
                    <p className="text-xs text-[#8C8981] mt-1">Key metrics for admin and ops staff.</p>
                  </div>
                  <button className="flex items-center gap-2 text-sm text-[#2C2B29] bg-[#F4F1EA] px-3 py-1.5 rounded-md hover:bg-[#E6E4DD] transition-colors">
                    <TrendingUp className="w-4 h-4" /> View Full Report
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E6E4DD] text-xs uppercase tracking-wider text-[#8C8981] font-semibold">
                        <th className="pb-3 pl-2">Rank</th>
                        <th className="pb-3">Staff Member</th>
                        <th className="pb-3">Tasks Completed</th>
                        <th className="pb-3">Avg Response Time</th>
                        <th className="pb-3">Efficiency Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F1EA]">
                      {adminProductivity.map(admin => (
                        <tr key={admin.rank} className="hover:bg-[#FCFBF8] transition-colors">
                          <td className="py-4 pl-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${admin.rank === 1 ? 'bg-[#EAD2A8] text-[#997A48]' : 'bg-[#F4F1EA] text-[#8C8981]'}`}>
                              #{admin.rank}
                            </span>
                          </td>
                          <td className="py-4">
                            <p className="text-sm font-medium text-[#2C2B29]">{admin.name}</p>
                            <p className="text-[10px] text-[#8C8981]">{admin.role}</p>
                          </td>
                          <td className="py-4 text-sm text-[#2C2B29]">{admin.tasks}</td>
                          <td className="py-4 text-sm text-[#2C2B29]">{admin.time}</td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[#F4F1EA] rounded-full overflow-hidden">
                                <div className="h-full bg-[#2C2B29] rounded-full" style={{ width: \`\${admin.score}%\` }} />
                              </div>
                              <span className="text-xs font-medium text-[#2C2B29] w-6">{admin.score}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="h-64 flex items-center justify-center text-[#8C8981] bg-white border border-[#E6E4DD] rounded-xl">
            Detailed views are being constructed. Please check back later.
          </div>
        );
    }
  };

  return (
    <div className="flex h-full bg-[#F4F1EA]/30 animate-in fade-in duration-500">
      {/* Sidebar Filters */}
      <div className="w-64 border-r border-[#E6E4DD] bg-[#FCFBF8] p-6 hidden lg:flex flex-col shrink-0 overflow-y-auto">
        <h3 className="text-xs font-semibold text-[#2C2B29] uppercase tracking-wider mb-6 flex items-center gap-2">
          <Filter className="w-4 h-4" /> Parameters
        </h3>
        
        <div className="space-y-8 flex-1">
          <div>
            <label className="text-xs font-medium text-[#8C8981] mb-2 block">Date Range</label>
            <div className="relative">
              <CalendarIcon className="w-4 h-4 text-[#A8A69F] absolute left-3 top-1/2 -translate-y-1/2" />
              <select className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-[#E6E4DD] rounded-lg appearance-none focus:outline-none focus:ring-1 focus:ring-[#C19A5B] cursor-pointer text-[#2C2B29]">
                <option>Year to Date</option>
                <option>Last Quarter</option>
                <option>Last 12 Months</option>
                <option>Custom Range</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#A8A69F] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#8C8981] mb-3 block">Practice Area</label>
            <div className="space-y-3">
              {['All Areas', 'Corporate', 'Litigation', 'Family Law', 'Real Estate'].map(area => (
                <label key={area} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${area === 'All Areas' ? 'bg-[#2C2B29] border-[#2C2B29]' : 'border-[#E6E4DD] bg-white group-hover:border-[#C19A5B]'}`}>
                    {area === 'All Areas' && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-[#2C2B29] group-hover:text-[#C19A5B] transition-colors">{area}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#8C8981] mb-3 block">Client Tier</label>
            <div className="space-y-3">
              {['Enterprise', 'Mid-Market', 'Small Business', 'Individual'].map((tier, idx) => (
                <label key={tier} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${idx === 0 || idx === 1 ? 'bg-[#C19A5B] border-[#C19A5B]' : 'border-[#E6E4DD] bg-white group-hover:border-[#C19A5B]'}`}>
                     {(idx === 0 || idx === 1) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-[#2C2B29] group-hover:text-[#C19A5B] transition-colors">{tier}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[#E6E4DD]">
          <button className="w-full py-2.5 bg-[#2C2B29] text-white rounded-lg text-sm font-medium hover:bg-[#4A4946] transition-colors shadow-sm">
            Apply Filters
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-medium text-[#2C2B29]" style={{ fontFamily: "'Playfair Display', serif" }}>Deep-Dive Analytics</h2>
              <p className="text-sm text-[#8C8981] mt-1">Explore financial, operational, and client growth metrics.</p>
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 text-sm bg-white border border-dashed border-[#E6E4DD] text-[#A8A69F] rounded-md shadow-sm cursor-not-allowed flex items-center gap-2 font-medium"
                disabled
                type="button"
              >
                <Download className="w-4 h-4 text-[#A8A69F]" /> Use Reports Export
              </button>
            </div>
          </div>

          <div className="border-b border-[#E6E4DD]">
            <nav className="flex gap-8">
              {[
                { id: 'executive', label: 'Executive Summary', icon: Briefcase },
                { id: 'operations', label: 'Operations & Staff', icon: Users },
                { id: 'financials', label: 'Financial Drilldown', icon: CreditCard },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-[#C19A5B] text-[#C19A5B]'
                      : 'border-transparent text-[#8C8981] hover:text-[#2C2B29]'
                  }`}
                >
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="pt-2">
            {renderTabContent()}
          </div>
          
        </div>
      </div>
    </div>
  );
};
