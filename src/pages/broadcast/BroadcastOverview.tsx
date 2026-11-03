import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Download,
  Plus,
  Radio,
  Send,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import {
  useBroadcasts,
  exportBroadcastsCsv,
  approveBroadcast,
  rejectBroadcast,
  type BroadcastPriority,
} from '@/data/broadcasts'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

export function PriorityBadge({ priority }: { priority: BroadcastPriority | string }) {
  let style = 'bg-slate-100 text-slate-700 border-slate-200'
  if (priority === 'Critical') style = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
  else if (priority === 'Urgent') style = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
  else if (priority === 'Important') style = 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border', style)}>
      {priority}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  let style = 'bg-slate-100 text-slate-700 border-slate-200'
  if (status === 'Published') style = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
  else if (status === 'Scheduled') style = 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
  else if (status === 'Pending Approval' || status === 'Pending') style = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
  else if (status === 'Draft') style = 'bg-slate-100 text-slate-600 border-slate-200'
  else if (status === 'Rejected') style = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
  else if (status === 'Changes Requested') style = 'bg-purple-50 text-purple-700 border-purple-200 font-semibold'

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border', style)}>
      {status}
    </span>
  )
}

export default function BroadcastOverview() {
  const navigate = useNavigate()
  const { broadcasts } = useBroadcasts()
  const [reminderSent, setReminderSent] = useState(false)

  const handleExport = () => {
    exportBroadcastsCsv(broadcasts, 'dexter-broadcast-overview')
    toast('Broadcast overview exported as CSV', 'success')
  }

  const handleSendReminder = () => {
    setReminderSent(true)
    toast('Targeted reminder dispatched to Operations & Franchisees (3 unread accounts)', 'success')
  }

  const recentList = broadcasts.slice(0, 5)
  const pendingApprovals = broadcasts.filter(
    (b) => b.status === 'Pending Approval'
  )

  return (
    <div className="space-y-6 pb-12">
      {/* Header matching Image 1 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100/70 text-[#0066FF]">
            <Radio size={20} className="text-[#0066FF]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Broadcast Overview</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all"
          >
            <Download size={14} className="text-slate-500" />
            <span>Export</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/work-management/broadcast/create')}
            className="flex items-center gap-1.5 rounded-lg bg-[#0066FF] hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all"
          >
            <Plus size={15} />
            <span>Create Broadcast</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (5 in a row matching Image 1) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-sm transition-all">
          <p className="text-[11.5px] font-medium text-slate-500">Total Broadcasts</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#0f172a] tracking-tight">1,248</span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <TrendingUp size={12} />
            <span>+12% this month</span>
          </p>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-sm transition-all">
          <p className="text-[11.5px] font-medium text-slate-500">Sent Today</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#0f172a] tracking-tight">18</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500">3 scheduled</p>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-sm transition-all">
          <p className="text-[11.5px] font-medium text-slate-500">Pending Approval</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-600 tracking-tight">7</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-rose-600 font-semibold">2 critical</p>
        </div>

        {/* Card 4 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-sm transition-all">
          <p className="text-[11.5px] font-medium text-slate-500">Avg Read Rate</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#0f172a] tracking-tight">86%</span>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">+4% vs last month</p>
        </div>

        {/* Card 5 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-sm transition-all col-span-2 sm:col-span-1">
          <p className="text-[11.5px] font-medium text-slate-500">Acknowledged</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#0f172a] tracking-tight">79%</span>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">+2% vs last month</p>
        </div>
      </div>

      {/* Charts & Analytics Section (3 columns matching Image 1) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Chart 1: Delivery vs Read (Last 7 Days) */}
        <div className="md:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#0066FF]" />
            <h3 className="text-xs font-bold text-slate-900">Delivery vs Read (Last 7 Days)</h3>
          </div>

          <div className="h-44 flex items-end justify-between gap-2.5 pt-4 px-1">
            {[
              { day: 'Mon', h: '68%', val: '85%' },
              { day: 'Tue', h: '88%', val: '92%' },
              { day: 'Wed', h: '62%', val: '78%' },
              { day: 'Thu', h: '82%', val: '88%' },
              { day: 'Fri', h: '96%', val: '95%' },
              { day: 'Sat', h: '55%', val: '62%' },
              { day: 'Sun', h: '42%', val: '54%' },
            ].map((col) => (
              <div key={col.day} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                <div className="w-full relative flex items-end justify-center h-32 bg-slate-50 rounded-lg overflow-hidden">
                  <div
                    style={{ height: col.h }}
                    className="w-full bg-[#0066FF] group-hover:bg-blue-700 transition-all rounded-t-md"
                    title={`${col.day}: ${col.val} read rate`}
                  />
                </div>
                <span className="text-[11px] font-medium text-slate-500">{col.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Department Read Rate */}
        <div className="md:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#0066FF]" />
            <h3 className="text-xs font-bold text-slate-900">Department Read Rate</h3>
          </div>

          <div className="space-y-3.5 my-auto">
            {[
              { name: 'Operations', pct: 72, color: 'bg-amber-500' },
              { name: 'Finance', pct: 91, color: 'bg-[#0066FF]' },
              { name: 'HR & Admin', pct: 95, color: 'bg-emerald-500' },
              { name: 'Field Team', pct: 68, color: 'bg-rose-500' },
              { name: 'Franchisees', pct: 83, color: 'bg-amber-500' },
            ].map((dept) => (
              <div key={dept.name} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-slate-700">{dept.name}</span>
                  <span className="text-slate-600">{dept.pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${dept.pct}%` }}
                    className={cn('h-full rounded-full transition-all', dept.color)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Broadcast Status Donut */}
        <div className="md:col-span-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#0066FF]" />
            <h3 className="text-xs font-bold text-slate-900">Broadcast Status</h3>
          </div>

          <div className="flex items-center justify-center my-3">
            <div className="relative h-28 w-28 flex items-center justify-center">
              {/* SVG Donut Ring */}
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#f1f5f9" strokeWidth="4.5" />
                {/* Published 58% */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="transparent"
                  stroke="#0066FF"
                  strokeWidth="4.5"
                  strokeDasharray="51 100"
                  strokeDashoffset="0"
                />
                {/* Scheduled 22% */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="4.5"
                  strokeDasharray="19 100"
                  strokeDashoffset="-51"
                />
                {/* Draft 12% */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="4.5"
                  strokeDasharray="11 100"
                  strokeDashoffset="-70"
                />
                {/* Rejected 8% */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="transparent"
                  stroke="#ef4444"
                  strokeWidth="4.5"
                  strokeDasharray="7 100"
                  strokeDashoffset="-81"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-lg font-extrabold text-slate-900 leading-none">1,248</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-600">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#0066FF]" /> Published
              </span>
              <span className="font-semibold text-slate-800">58%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Scheduled
              </span>
              <span className="font-semibold text-slate-800">22%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Draft
              </span>
              <span className="font-semibold text-slate-800">12%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Rejected
              </span>
              <span className="font-semibold text-slate-800">8%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Broadcasts & AI Insights (matching Image 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Recent Broadcasts Table */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#0066FF]" />
              <h3 className="text-xs font-bold text-slate-900">Recent Broadcasts</h3>
            </div>
            <Link
              to="/work-management/broadcast/scheduled"
              className="text-xs font-semibold text-[#0066FF] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Audience</th>
                  <th className="py-2.5 px-3 text-center">Priority</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {recentList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#0066FF] whitespace-nowrap">
                      <Link to={`/work-management/broadcast/scheduled?id=${item.id}`} className="hover:underline">
                        {item.id}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-[220px] truncate">
                      {item.title}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{item.type}</td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{item.audience}</td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{item.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: AI Insights Card (matching Image 1) */}
        <div className="lg:col-span-4 rounded-2xl border border-purple-200/80 bg-purple-50/40 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 text-purple-900">
              <Sparkles size={16} className="text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900">AI Insights</h3>
            </div>

            <p className="text-xs font-medium text-slate-700 leading-relaxed">
              Operations acknowledgement dropped over the last 30 days. Send a targeted reminder.
            </p>

            <div className="mt-4">
              <button
                type="button"
                disabled={reminderSent}
                onClick={handleSendReminder}
                className={cn(
                  'w-full py-2 px-3 rounded-xl border text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-1.5',
                  reminderSent
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-purple-300 bg-white text-purple-700 hover:bg-purple-100/60'
                )}
              >
                {reminderSent ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Reminder Sent</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Send Reminder</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-purple-200/60">
            <p className="text-[11.5px] text-slate-600 leading-tight">
              <strong className="text-purple-900">3 franchisees</strong> have left the last 5 broadcasts unread.
            </p>
          </div>
        </div>
      </div>

      {/* Approval Queue Section - same card design as Recent Broadcasts */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            <h3 className="text-xs font-bold text-slate-900">Approval Queue</h3>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200/60">
              {pendingApprovals.length} pending
            </span>
          </div>
          <Link
            to="/work-management/broadcast/approval-queue"
            className="text-xs font-semibold text-[#0066FF] hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[780px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-3 whitespace-nowrap">ID</th>
                <th className="py-2.5 px-3 min-w-[140px]">Title</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Created By</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Audience</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Priority</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Submitted</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap w-[150px] min-w-[150px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {pendingApprovals.slice(0, 5).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-semibold text-[#0066FF] whitespace-nowrap">
                    <Link to={`/work-management/broadcast/approval-queue?id=${item.id}`} className="hover:underline">
                      {item.id}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-[240px] truncate">
                    {item.title}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{item.createdBy || 'Staff'}</td>
                  <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{item.audience}</td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <PriorityBadge priority={item.priority} />
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{item.submittedAt || item.date}</td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      Pending
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          approveBroadcast(item.id, 'Approved via Overview Quick Action')
                          toast(`Broadcast ${item.id} approved and published`, 'success')
                        }}
                        className="rounded-md bg-[#0066FF] hover:bg-blue-700 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs transition-all whitespace-nowrap"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          rejectBroadcast(item.id, 'Rejected via Overview Quick Action')
                          toast(`Broadcast ${item.id} rejected`, 'info')
                        }}
                        className="rounded-md border border-slate-200 hover:border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs transition-all whitespace-nowrap"
                      >
                        Reject
                      </button>
                    </div>
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
