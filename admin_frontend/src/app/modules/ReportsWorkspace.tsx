import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Legend, Cell, PieChart, Pie
} from 'recharts';
import { 
  Download, Filter, Calendar, FileText, ChevronRight, ArrowUpRight, 
  ArrowDownRight, MoreHorizontal, Layers, Users, FileStack, MessageSquare, 
  CreditCard, AlertOctagon, Zap, ArrowRight, X, BarChart3
} from 'lucide-react';
import { formatCurrency } from '../data/seedData';
import { EmptyState } from './EmptyState';

export const ReportsWorkspace = () => {
  // Toggle this state to simulate an empty reports view for newly connected users
  const [hasData, setHasData] = useState(false);
  
  const [dateRange, setDateRange] = useState('YTD');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [drilldown, setDrilldown] = useState<{type: string, id?: string} | null>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const handleExport = () => {
    const headers = ['Category', 'Metric', 'Value'];
    const rows = [
      ['Financial', 'Total Collections', '894000'],
      ['Financial', 'Client Conversion', '32.8%'],
      ['Financial', 'Refunds & Write-offs', '13600'],
      ...revenueTrend.map(r => ['Revenue Trend', r.month, `Billed: ${r.billings} Collected: ${r.collections} Refunds: ${r.refunds}`]),
      ...matterStages.map(m => ['Matter Stage', m.stage, `Count: ${m.count} AvgDays: ${m.avgDays}`]),
      ...bottlenecks.map(b => ['Bottleneck', b.issue, `Impact: ${b.impact} Delay: ${b.delay}`])
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.map(String).map(s => `"${s}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LegalConnect_MasterReport_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Mock Data
  const revenueTrend = [
    { month: 'Jan', collections: 125000, billings: 145000, refunds: 2500 },
    { month: 'Feb', collections: 132000, billings: 158000, refunds: 1200 },
    { month: 'Mar', collections: 148000, billings: 162000, refunds: 3100 },
    { month: 'Apr', collections: 142000, billings: 155000, refunds: 800 },
    { month: 'May', collections: 165000, billings: 180000, refunds: 4500 },
    { month: 'Jun', collections: 182000, billings: 195000, refunds: 1500 },
  ];

  const matterStages = [
    { stage: 'Intake & Discovery', count: 42, avgDays: 14 },
    { stage: 'Strategy & Planning', count: 28, avgDays: 21 },
    { stage: 'Drafting & Review', count: 56, avgDays: 45 },
    { stage: 'Negotiation', count: 18, avgDays: 30 },
    { stage: 'Closing', count: 12, avgDays: 10 },
  ];

  const documentActivity = [
    { name: 'Generated', value: 845, color: '#5A7C96' },
    { name: 'Reviewed', value: 620, color: '#C19A5B' },
    { name: 'Signed', value: 315, color: '#2C2B29' },
    { name: 'Rejected', value: 42, color: '#d4183d' },
  ];

  const clientOnboarding = [
    { week: 'W1', leads: 45, converted: 12 },
    { week: 'W2', leads: 52, converted: 18 },
    { week: 'W3', leads: 38, converted: 15 },
    { week: 'W4', leads: 65, converted: 24 },
  ];

  const commsLoad = [
    { team: 'Corporate', messages: 1250, avgResponseHr: 2.4 },
    { team: 'Real Estate', messages: 840, avgResponseHr: 4.1 },
    { team: 'Litigation', messages: 2100, avgResponseHr: 1.8 },
    { team: 'IP', messages: 620, avgResponseHr: 5.5 },
  ];

  const bottlenecks = [
    { issue: 'Client Document Upload', impact: 'High', delay: '+8 Days', department: 'All' },
    { issue: 'External Counsel Review', impact: 'High', delay: '+14 Days', department: 'Corporate' },
    { issue: 'Conflict Check Clearance', impact: 'Medium', delay: '+2 Days', department: 'Intake' },
    { issue: 'Invoice Payment (Retainer)', impact: 'High', delay: '+11 Days', department: 'Billing' },
  ];

  const invoiceAging = [
    { client: 'Acme Corp', amount: 45000, days: 92, status: 'Critical' },
    { client: 'Stark Industries', amount: 28500, days: 65, status: 'Warning' },
    { client: 'Wayne Ent', amount: 12400, days: 45, status: 'Watch' },
    { client: 'Daily Planet', amount: 8900, days: 31, status: 'Watch' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-medium text-[#2C2B29]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Reports & Analytics
          </h2>
          <p className="text-[#8C8981] mt-1 text-sm">Strategic insights across operations, billing, and client lifecycle.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-[#E6E4DD] rounded-lg p-1 shadow-sm">
            {['MTD', 'QTD', 'YTD', 'All Time', 'Custom'].map(range => (
              <button 
                key={range}
                onClick={() => {
                  setDateRange(range);
                  setShowCustomDate(range === 'Custom');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${dateRange === range ? 'bg-[#F4F1EA] text-[#2C2B29]' : 'text-[#8C8981] hover:text-[#2C2B29]'}`}
              >
                {range}
              </button>
            ))}
          </div>

          {showCustomDate && (
            <div className="flex items-center gap-2 bg-white border border-[#E6E4DD] rounded-lg px-2 py-1 shadow-sm animate-in fade-in slide-in-from-left-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="text-xs bg-transparent border-none focus:ring-0 text-[#2C2B29] font-medium" />
              <span className="text-[#8C8981] text-xs">to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="text-xs bg-transparent border-none focus:ring-0 text-[#2C2B29] font-medium" />
            </div>
          )}
          
          <button className="px-4 py-2 bg-white border border-[#E6E4DD] rounded-lg shadow-sm text-sm font-medium text-[#2C2B29] hover:bg-[#F4F1EA] transition flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#8C8981]" /> Filter
          </button>
          
          <div className="flex items-center gap-2 pl-3 border-l border-[#E6E4DD]">
            <button onClick={handleExport} className="px-4 py-2 bg-[#2C2B29] text-white rounded-lg shadow-sm text-sm font-medium hover:bg-[#4A4946] transition flex items-center gap-2">
              <Download className="w-4 h-4" /> Export Master Report
            </button>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center mt-20">
          <EmptyState 
            icon={BarChart3} 
            title="No reports generated yet" 
            description="You don't have enough data accumulated to generate comprehensive reports and analytics. As you onboard clients, process invoices, and complete matters, insights will appear here."
            action={{ label: "Simulate Data", onClick: () => setHasData(true) }}
          />
        </div>
      ) : (
        <>
          {/* KPI Summary Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E6E4DD] p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-8 h-8 rounded bg-[#FDF8EF] flex items-center justify-center text-[#C19A5B]">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
              <ArrowUpRight className="w-3 h-3" /> 14.2%
            </span>
          </div>
          <h4 className="text-[#8C8981] text-xs font-bold uppercase tracking-wider mb-1">Total Collections</h4>
          <p className="text-2xl font-semibold text-[#2C2B29] font-serif">{formatCurrency(894000)}</p>
        </div>

        <div className="bg-white border border-[#E6E4DD] p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-8 h-8 rounded bg-[#EFF3F6] flex items-center justify-center text-[#5A7C96]">
              <Users className="w-4 h-4" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
              <ArrowUpRight className="w-3 h-3" /> 8.4%
            </span>
          </div>
          <h4 className="text-[#8C8981] text-xs font-bold uppercase tracking-wider mb-1">Client Conversion</h4>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-semibold text-[#2C2B29] font-serif">32.8%</p>
            <span className="text-sm text-[#8C8981] mb-1">of 245 leads</span>
          </div>
        </div>

        <div className="bg-white border border-[#E6E4DD] p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-8 h-8 rounded bg-[#FDE8EC] flex items-center justify-center text-[#d4183d]">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded">
              <ArrowUpRight className="w-3 h-3" /> 2.1%
            </span>
          </div>
          <h4 className="text-[#8C8981] text-xs font-bold uppercase tracking-wider mb-1">Refunds & Write-offs</h4>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-semibold text-[#2C2B29] font-serif">{formatCurrency(13600)}</p>
            <span className="text-sm text-[#8C8981] mb-1">1.5% of rev</span>
          </div>
        </div>

        <div className="bg-white border border-[#E6E4DD] p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-8 h-8 rounded bg-[#F3F0FF] flex items-center justify-center text-[#7C3AED]">
              <Zap className="w-4 h-4" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded">
              <ArrowDownRight className="w-3 h-3" /> 4.2h
            </span>
          </div>
          <h4 className="text-[#8C8981] text-xs font-bold uppercase tracking-wider mb-1">Avg Resolution Time</h4>
          <p className="text-2xl font-semibold text-[#2C2B29] font-serif">42 Days</p>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Financials & Trends (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Revenue vs Billings Trend */}
          <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E6E4DD] flex justify-between items-center">
              <div>
                <h3 className="font-medium text-[#2C2B29]">Financial Velocity</h3>
                <p className="text-xs text-[#8C8981] mt-0.5">Billings vs Collections vs Refunds over time</p>
              </div>
              <button onClick={() => setDrilldown({ type: 'ledger' })} className="text-xs font-medium text-[#C19A5B] hover:text-[#997A48]">View Ledger &rarr;</button>
            </div>
            <div className="p-5 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBillings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E6E4DD" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#E6E4DD" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCollections" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C19A5B" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#C19A5B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F1EA" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#2C2B29', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="billings" name="Billed Amount" stroke="#A8A69F" fillOpacity={1} fill="url(#colorBillings)" strokeWidth={2} />
                  <Area type="monotone" dataKey="collections" name="Collected" stroke="#C19A5B" fillOpacity={1} fill="url(#colorCollections)" strokeWidth={3} />
                  <Line type="monotone" dataKey="refunds" name="Refunds" stroke="#d4183d" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Matter Stages Pipeline */}
            <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[#E6E4DD]">
                <h3 className="font-medium text-[#2C2B29]">Pipeline Density</h3>
                <p className="text-xs text-[#8C8981] mt-0.5">Active matters and avg days in stage</p>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {matterStages.map((stage, idx) => (
                    <div 
                      key={idx} 
                      className="relative cursor-pointer group p-2 -mx-2 rounded hover:bg-[#F4F1EA] transition"
                      onClick={() => setDrilldown({ type: 'stage', id: stage.stage })}
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-[#2C2B29]">{stage.stage}</span>
                        <span className="text-[#8C8981]">{stage.count} matters</span>
                      </div>
                      <div className="h-2 bg-[#F4F1EA] rounded-full overflow-hidden flex">
                        <div 
                          className="h-full bg-[#2C2B29] rounded-full"
                          style={{ width: `${(stage.count / 56) * 100}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[#A8A69F] mt-1 text-right">Avg: {stage.avgDays} days</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Communications Load */}
            <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[#E6E4DD]">
                <h3 className="font-medium text-[#2C2B29]">Communication Load</h3>
                <p className="text-xs text-[#8C8981] mt-0.5">Messages and avg response time</p>
              </div>
              <div className="p-5 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commsLoad} layout="vertical" margin={{ top: 0, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F4F1EA" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} />
                    <YAxis dataKey="team" type="category" axisLine={false} tickLine={false} tick={{ fill: '#2C2B29', fontSize: 12, fontWeight: 500 }} width={80} />
                    <Tooltip cursor={{ fill: '#F4F1EA' }} contentStyle={{ backgroundColor: '#2C2B29', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="messages" name="Messages" fill="#5A7C96" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          {/* Client Onboarding */}
          <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden mt-6">
            <div className="p-5 border-b border-[#E6E4DD]">
              <h3 className="font-medium text-[#2C2B29]">Client Onboarding</h3>
              <p className="text-xs text-[#8C8981] mt-0.5">Leads vs Conversions (Weekly)</p>
            </div>
            <div className="p-5 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={clientOnboarding} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F1EA" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C8981', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#2C2B29', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="leads" name="New Leads" stroke="#A8A69F" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="converted" name="Converted" stroke="#5A7C96" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Alerts & Drilldowns (1/3 width) */}
        <div className="space-y-6">
          
          {/* Operational Bottlenecks */}
          <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E6E4DD] bg-[#FDF8EF]">
              <h3 className="font-medium text-[#997A48] flex items-center gap-2">
                <AlertOctagon className="w-4 h-4" /> Operational Bottlenecks
              </h3>
            </div>
            <div className="divide-y divide-[#E6E4DD]">
              {bottlenecks.map((item, idx) => (
                <div key={idx} className="p-4 hover:bg-[#FCFBF8] transition">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-[#2C2B29]">{item.issue}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${item.impact === 'High' ? 'bg-[#FDE8EC] text-[#d4183d]' : 'bg-[#FFF3CD] text-[#B8860B]'}`}>
                      {item.delay}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-[#8C8981]">Dept: {item.department}</p>
                    <button 
                      onClick={() => setDrilldown({ type: 'bottleneck', id: item.issue })}
                      className="text-xs font-medium text-[#5A7C96] hover:underline"
                    >
                      Investigate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Aging Drilldown */}
          <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E6E4DD] flex justify-between items-center">
              <h3 className="font-medium text-[#2C2B29]">Aging Receivables</h3>
              <button className="p-1 text-[#8C8981] hover:bg-[#F4F1EA] rounded"><MoreHorizontal className="w-4 h-4" /></button>
            </div>
            <div className="p-2">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#A8A69F] border-b border-[#E6E4DD]">
                    <th className="px-3 py-2 font-medium">Client</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium text-right">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceAging.map((inv, idx) => (
                    <tr key={idx} className="group hover:bg-[#F4F1EA] cursor-pointer transition">
                      <td className="px-3 py-3 text-sm font-medium text-[#2C2B29] border-b border-[#E6E4DD] group-last:border-0">{inv.client}</td>
                      <td className="px-3 py-3 text-sm text-[#5A7C96] font-medium border-b border-[#E6E4DD] group-last:border-0">{formatCurrency(inv.amount)}</td>
                      <td className="px-3 py-3 text-right border-b border-[#E6E4DD] group-last:border-0">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium ${inv.status === 'Critical' ? 'bg-[#FDE8EC] text-[#d4183d]' : inv.status === 'Warning' ? 'bg-[#FDF8EF] text-[#C19A5B]' : 'bg-[#EFF3F6] text-[#5A7C96]'}`}>
                          {inv.days}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-[#E6E4DD] bg-[#FCFBF8] text-center">
              <button onClick={() => setDrilldown({ type: 'aging' })} className="text-xs font-medium text-[#2C2B29] hover:text-[#C19A5B] flex items-center justify-center gap-1 w-full">
                View Full Aging Report <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Document Activity Pie */}
          <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E6E4DD]">
              <h3 className="font-medium text-[#2C2B29]">Document Activity</h3>
            </div>
            <div className="p-5 flex flex-col items-center">
              <div className="h-[180px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={documentActivity}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {documentActivity.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#2C2B29', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-serif text-[#2C2B29]">{documentActivity.reduce((a, b) => a + b.value, 0)}</span>
                  <span className="text-[10px] uppercase tracking-wider text-[#8C8981]">Total Docs</span>
                </div>
              </div>
              <div className="w-full mt-4 grid grid-cols-2 gap-2">
                {documentActivity.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: doc.color }} />
                    <span className="text-[#8C8981]">{doc.name}</span>
                    <span className="font-medium text-[#2C2B29] ml-auto">{doc.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Drilldown Modal */}
      {drilldown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[#E6E4DD]">
              <div>
                <h2 className="text-lg font-medium text-[#2C2B29] font-serif">
                  {drilldown.type === 'stage' ? `Matter Stage: ${drilldown.id}` : 
                   drilldown.type === 'bottleneck' ? `Bottleneck Analysis: ${drilldown.id}` : 
                   drilldown.type === 'aging' ? 'Aging Receivables Report' :
                   drilldown.type === 'ledger' ? 'Financial Ledger' :
                   'Detailed Report'}
                </h2>
                <p className="text-xs text-[#8C8981] mt-1">Granular view for selected category</p>
              </div>
              <button onClick={() => setDrilldown(null)} className="p-2 hover:bg-[#F4F1EA] rounded-lg transition text-[#8C8981] hover:text-[#2C2B29]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto bg-[#FCFBF8]">
              {drilldown.type === 'stage' && (
                <div className="space-y-4">
                   <table className="w-full text-left bg-white border border-[#E6E4DD] rounded-lg overflow-hidden">
                     <thead className="bg-[#F4F1EA] text-[10px] uppercase tracking-wider text-[#8C8981]">
                       <tr><th className="p-3 font-medium">Matter ID</th><th className="p-3 font-medium">Client</th><th className="p-3 font-medium">Days in Stage</th><th className="p-3 font-medium">Assigned To</th></tr>
                     </thead>
                     <tbody className="divide-y divide-[#E6E4DD]">
                       {[1,2,3,4,5].map(i => (
                         <tr key={i} className="text-sm hover:bg-[#FDF8EF] transition">
                           <td className="p-3 font-medium text-[#2C2B29]">MAT-{2000+i}</td>
                           <td className="p-3 text-[#5A7C96]">Acme Corp {i}</td>
                           <td className="p-3 text-[#d4183d] font-medium">{10 + i*3} Days</td>
                           <td className="p-3 text-[#8C8981]">Sarah Jenkins</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
              )}
              
              {drilldown.type === 'bottleneck' && (
                <div className="space-y-4">
                  <div className="p-4 bg-white border border-[#E6E4DD] rounded-lg">
                     <h4 className="font-medium text-[#2C2B29] mb-2">Root Cause Hypothesis</h4>
                     <p className="text-sm text-[#8C8981]">Historical data suggests this bottleneck is primarily caused by pending external dependencies and manual document verification steps.</p>
                  </div>
                  <h4 className="font-medium text-[#2C2B29] mt-6 mb-3">Recommended Actions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 border border-[#E6E4DD] rounded bg-white hover:border-[#C19A5B] cursor-pointer transition">
                      <p className="text-sm font-medium text-[#2C2B29]">Automate Reminders</p>
                      <p className="text-xs text-[#8C8981] mt-1">Set up daily pings for pending items.</p>
                    </div>
                    <div className="p-3 border border-[#E6E4DD] rounded bg-white hover:border-[#C19A5B] cursor-pointer transition">
                      <p className="text-sm font-medium text-[#2C2B29]">Reassign Caseload</p>
                      <p className="text-xs text-[#8C8981] mt-1">Temporarily shift resources to alleviate pressure.</p>
                    </div>
                  </div>
                </div>
              )}

              {['aging', 'ledger'].includes(drilldown.type) && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-[#E6E4DD] mx-auto mb-3" />
                    <p className="text-sm font-medium text-[#2C2B29]">Detailed Report Ready</p>
                    <p className="text-xs text-[#8C8981] mt-1 mb-4">The full {drilldown.type} data has been compiled.</p>
                    <button onClick={handleExport} className="px-4 py-2 bg-[#2C2B29] text-white rounded-lg text-sm font-medium hover:bg-[#4A4946] transition flex items-center justify-center gap-2 mx-auto">
                      <Download className="w-4 h-4" /> Download Complete CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )}
</div>
  );
};
