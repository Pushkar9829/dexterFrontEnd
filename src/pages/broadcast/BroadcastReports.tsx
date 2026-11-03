import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CheckCircle2,
  Download,
  Mail,
  MessageSquare,
  Radio,
  Send,
  Smartphone,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useBroadcasts, exportBroadcastsCsv } from '@/data/broadcasts'
import { PriorityBadge, StatusBadge } from './BroadcastOverview'
import { toast } from '@/components/ui/Toast'

export default function BroadcastReports() {
  const navigate = useNavigate()
  const { broadcasts } = useBroadcasts()
  const [dateRange, setDateRange] = useState('Last 30 Days (Oct - Nov 2026)')
  const [department, setDepartment] = useState('All Departments')

  const handleExport = () => {
    exportBroadcastsCsv(broadcasts, 'dexter-broadcast-mis-report')
    toast('Broadcast MIS Report exported as CSV', 'success')
  }

  // Filtered broadcast reports
  const reportRows = broadcasts.filter((b) => {
    if (department !== 'All Departments' && b.audience !== department && b.audience !== 'All Franchisees') {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100/70 text-[#0066FF]">
            <Radio size={20} className="text-[#0066FF]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Broadcast Reports & MIS</h1>
            <p className="text-xs text-slate-500 mt-0.5">Comprehensive analytics, delivery rates, and department engagement breakdown</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Date range filter */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-medium text-slate-700 shadow-2xs outline-none focus:border-[#0066FF]"
            >
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days (Oct - Nov 2026)">Last 30 Days (Oct - Nov 2026)</option>
              <option value="Current Quarter (Q3 2026)">Current Quarter (Q3 2026)</option>
              <option value="Full Year 2026">Full Year 2026</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all"
          >
            <Download size={14} className="text-slate-500" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Total Audience Reach</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[#0066FF]">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-[#0f172a] tracking-tight">4,892</span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <TrendingUp size={12} />
            <span>99.4% Delivery Success</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Average Read Rate</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-[#0f172a] tracking-tight">86.2%</span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <TrendingUp size={12} />
            <span>+4.2% vs last month</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Mandatory Ack Rate</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-600">
              <Send size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-[#0f172a] tracking-tight">79.1%</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500">Required on 8 broadcasts</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Average Delivery Time</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <BarChart3 size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-[#0f172a] tracking-tight">1.8 sec</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500">Real-time push engine</p>
        </div>
      </div>

      {/* Channel Breakdown & Department Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Channel Deliveries */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-[#0f172a] mb-4">Multi-Channel Distribution</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Smartphone size={14} className="text-[#0066FF]" /> In-App Notification
                </span>
                <span className="font-bold">100% (1,248)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-[#0066FF]" style={{ width: '100%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Mail size={14} className="text-emerald-600" /> Official Email
                </span>
                <span className="font-bold">94% (1,173)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: '94%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-green-600" /> WhatsApp Business
                </span>
                <span className="font-bold">88% (1,098)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: '88%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Smartphone size={14} className="text-amber-600" /> SMS Gateway
                </span>
                <span className="font-bold">42% (524)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-amber-500" style={{ width: '42%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Department Engagement Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#0f172a]">Department Performance Matrix</h2>
            <div className="relative">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-2xs outline-none"
              >
                <option value="All Departments">All Departments</option>
                <option value="Operations">Operations</option>
                <option value="Finance">Finance</option>
                <option value="HR & Admin">HR & Admin</option>
                <option value="Field Team">Field Team</option>
                <option value="Franchisees">Franchisees</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2.5 font-medium">Department</th>
                  <th className="pb-2.5 font-medium">Total Broadcasts</th>
                  <th className="pb-2.5 font-medium">Delivered</th>
                  <th className="pb-2.5 font-medium">Read Rate</th>
                  <th className="pb-2.5 font-medium">Ack Rate</th>
                  <th className="pb-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { dept: 'HR & Admin', total: 42, delivered: 42, read: '95%', ack: '92%', status: 'Optimal' },
                  { dept: 'Finance', total: 68, delivered: 68, read: '91%', ack: '88%', status: 'Optimal' },
                  { dept: 'Franchisees', total: 114, delivered: 112, read: '83%', ack: '79%', status: 'Good' },
                  { dept: 'Operations', total: 95, delivered: 94, read: '72%', ack: '68%', status: 'Needs Attention' },
                  { dept: 'Field Team', total: 54, delivered: 53, read: '68%', ack: '61%', status: 'Follow-up Required' },
                ].map((row) => (
                  <tr key={row.dept} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 font-semibold text-slate-800">{row.dept}</td>
                    <td className="py-2.5 text-slate-600">{row.total}</td>
                    <td className="py-2.5 text-slate-600">{row.delivered}</td>
                    <td className="py-2.5 font-semibold text-slate-800">{row.read}</td>
                    <td className="py-2.5 font-semibold text-slate-800">{row.ack}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                          row.status === 'Optimal'
                            ? 'bg-emerald-50 text-emerald-700'
                            : row.status === 'Good'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Broadcast Performance Log */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#0f172a]">Detailed Performance Log</h2>
            <p className="text-xs text-slate-500 mt-0.5">Showing delivery and acknowledgment metrics per broadcast</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/work-management/broadcast/all')}
            className="text-xs font-semibold text-[#0066FF] hover:underline"
          >
            View All in Master List &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-3">ID</th>
                <th className="py-3 px-3">Title</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Audience</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Read %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportRows.slice(0, 10).map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-mono font-medium text-slate-700">{b.id}</td>
                  <td className="py-3 px-3 font-medium text-[#0f172a] max-w-xs truncate">{b.title}</td>
                  <td className="py-3 px-3 text-slate-600">{b.type}</td>
                  <td className="py-3 px-3 text-slate-700 font-medium">{b.audience}</td>
                  <td className="py-3 px-3">
                    <PriorityBadge priority={b.priority} />
                  </td>
                  <td className="py-3 px-3 text-slate-600">{b.date}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="py-3 px-3 font-semibold text-[#0f172a]">
                    {b.readPercentage != null ? `${b.readPercentage}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
