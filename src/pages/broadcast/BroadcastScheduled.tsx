import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit2,
  Plus,
  Radio,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import {
  useBroadcasts,
  updateBroadcast,
  exportBroadcastsCsv,
  type BroadcastRecord,
} from '@/data/broadcasts'
import { PriorityBadge, StatusBadge } from './BroadcastOverview'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

export default function BroadcastScheduled({ defaultTab = 'scheduled' }: { defaultTab?: string }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') || defaultTab

  // Tabs matching All Broadcasts & Scheduled Broadcasts
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (tabParam === 'drafts' || tabParam === 'Drafts') return 'Drafts'
    if (tabParam === 'all' || tabParam === 'All') return 'All'
    if (tabParam === 'published' || tabParam === 'Published') return 'Published'
    if (tabParam === 'pending' || tabParam === 'Pending') return 'Pending'
    if (tabParam === 'rejected' || tabParam === 'Rejected') return 'Rejected'
    return 'Scheduled'
  })

  const { broadcasts } = useBroadcasts()

  // Filters from All Broadcasts
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const filterDateRange = '01 Oct - 03 Nov 2026'

  // Selected date on calendar (null or day number)
  const [selectedDate, setSelectedDate] = useState<number | null>(3)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Reschedule modal
  const [rescheduleItem, setRescheduleItem] = useState<BroadcastRecord | null>(null)
  const [newTime, setNewTime] = useState('10 Nov 2026, 10:30 AM')

  // Preview modal
  const [previewItem, setPreviewItem] = useState<BroadcastRecord | null>(null)

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: broadcasts.length,
      scheduled: broadcasts.filter((b) => b.status === 'Scheduled').length,
      published: broadcasts.filter((b) => b.status === 'Published').length,
      drafts: broadcasts.filter((b) => b.status === 'Draft').length,
      pending: broadcasts.filter((b) => b.status === 'Pending Approval').length,
      rejected: broadcasts.filter((b) => b.status === 'Rejected').length,
    }
  }, [broadcasts])

  // Filtered broadcast records
  const filteredList = useMemo(() => {
    return broadcasts.filter((item) => {
      // Tab matching
      if (activeTab === 'Scheduled' && item.status !== 'Scheduled') return false
      if (activeTab === 'Drafts' && item.status !== 'Draft') return false
      if (activeTab === 'Published' && item.status !== 'Published') return false
      if (activeTab === 'Pending' && item.status !== 'Pending Approval') return false
      if (activeTab === 'Rejected' && item.status !== 'Rejected') return false

      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const match =
          item.id.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.subject.toLowerCase().includes(q) ||
          item.audience.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q)
        if (!match) return false
      }

      // Dropdown filters
      if (filterStatus && filterStatus !== 'All' && item.status !== filterStatus) return false
      if (filterPriority && filterPriority !== 'All' && item.priority !== filterPriority) return false
      if (filterDepartment && filterDepartment !== 'All' && item.audience !== filterDepartment) return false

      // Calendar filter if user specifically clicks a date
      if (selectedDate && activeTab === 'Scheduled') {
        const dateStr = item.scheduledFor || item.date
        const dayMatch = dateStr.includes(`${selectedDate} Nov`) || dateStr.includes(`0${selectedDate} Nov`)
        if (!dayMatch) return false
      }

      return true
    })
  }, [broadcasts, activeTab, searchTerm, filterStatus, filterPriority, filterDepartment, selectedDate])

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, currentPage])

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))

  const handleReschedule = () => {
    if (rescheduleItem) {
      updateBroadcast(rescheduleItem.id, {
        scheduledFor: newTime,
      })
      toast(`Rescheduled ${rescheduleItem.id} to ${newTime}`, 'success')
      setRescheduleItem(null)
    }
  }

  const handleCancel = (id: string) => {
    updateBroadcast(id, {
      status: 'Draft',
    })
    toast(`Cancelled schedule for ${id}. Moved to Drafts.`, 'info')
  }

  const handleAiOptimizeTimes = () => {
    toast('Optimized scheduled broadcasts for Field Team to peak window 10:30 – 11:30 AM', 'success')
  }

  const handleExport = () => {
    exportBroadcastsCsv(filteredList, 'scheduled-broadcasts')
    toast('Broadcast records exported as CSV', 'success')
  }

  // Active dates in Nov 2026 that have scheduled broadcasts
  const scheduledDays = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 18, 22]

  return (
    <div className="space-y-5 pb-16">
      {/* Header matching Image 4 & Image 2 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100/70 text-[#0066FF]">
            <Radio size={20} className="text-[#0066FF]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Scheduled Broadcasts & Drafts
            </h1>
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

      {/* Tabs Bar with Counts matching Image 2 & 4 */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'Scheduled', label: 'Scheduled', count: counts.scheduled },
          { key: 'Drafts', label: 'Drafts', count: counts.drafts },
          { key: 'All', label: 'All', count: counts.all },
          { key: 'Published', label: 'Published', count: counts.published },
          { key: 'Pending', label: 'Pending', count: counts.pending },
          { key: 'Rejected', label: 'Rejected', count: counts.rejected },
        ].map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key)
                setCurrentPage(1)
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all border shadow-2xs',
                isActive
                  ? 'bg-[#0066FF] text-white border-[#0066FF]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              )}
            >
              <span>{tab.label}</span>
              <span className={cn('text-[11px]', isActive ? 'text-blue-100' : 'text-slate-500')}>
                ({tab.count})
              </span>
            </button>
          )
        })}
      </div>

      {/* All Filters Toolbar (Search, Status, Priority, Department, Date Range) */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search title / ID / audience..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-8.5 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:bg-white transition-all font-medium"
          />
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setCurrentPage(1)
            }}
            className="appearance-none rounded-lg border border-slate-200 bg-slate-50/50 pl-3 pr-7 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[#0066FF] focus:bg-white"
          >
            <option value="">Status: All</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Rejected">Rejected</option>
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Priority Dropdown */}
        <div className="relative">
          <select
            value={filterPriority}
            onChange={(e) => {
              setFilterPriority(e.target.value)
              setCurrentPage(1)
            }}
            className="appearance-none rounded-lg border border-slate-200 bg-slate-50/50 pl-3 pr-7 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[#0066FF] focus:bg-white"
          >
            <option value="">Priority: All</option>
            <option value="Critical">Critical</option>
            <option value="Urgent">Urgent</option>
            <option value="Important">Important</option>
            <option value="Normal">Normal</option>
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Department Dropdown */}
        <div className="relative">
          <select
            value={filterDepartment}
            onChange={(e) => {
              setFilterDepartment(e.target.value)
              setCurrentPage(1)
            }}
            className="appearance-none rounded-lg border border-slate-200 bg-slate-50/50 pl-3 pr-7 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[#0066FF] focus:bg-white"
          >
            <option value="">Department: All</option>
            <option value="Operations">Operations</option>
            <option value="Finance">Finance</option>
            <option value="Legal">Legal</option>
            <option value="All Franchisees">All Franchisees</option>
            <option value="Projects">Projects</option>
            <option value="Field Team">Field Team</option>
            <option value="Cash Loading">Cash Loading</option>
            <option value="HR & Admin">HR & Admin</option>
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Date Range Badge */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-medium text-slate-600">
          <Calendar size={13} className="text-slate-400" />
          <span>{filterDateRange}</span>
        </div>
      </div>

      {/* 2 Columns: Table on Left + Calendar & AI on Right matching Image 4 */}
      <div className="flex flex-col xl:flex-row gap-5 items-start">
        {/* Left Column: Scheduled Table */}
        <div className="flex-1 min-w-0 w-full space-y-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2 px-2.5 w-[85px] whitespace-nowrap">ID</th>
                    <th className="py-2 px-2.5 min-w-[120px]">Title</th>
                    <th className="py-2 px-2 w-[85px] whitespace-nowrap">Audience</th>
                    <th className="py-2 px-2 w-[110px] whitespace-nowrap">Scheduled For</th>
                    <th className="py-2 px-1.5 w-[85px] text-center whitespace-nowrap">Channels</th>
                    <th className="py-2 px-1.5 w-[75px] text-center whitespace-nowrap">Priority</th>
                    <th className="py-2 px-1.5 w-[75px] text-center whitespace-nowrap">Status</th>
                    <th className="py-2 px-2 text-center whitespace-nowrap w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {paginatedList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                        No broadcasts found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-2.5 font-mono font-semibold text-[#0066FF] whitespace-nowrap text-[11px]">
                          <button
                            type="button"
                            onClick={() => setPreviewItem(item)}
                            className="hover:underline font-mono font-semibold text-[#0066FF] whitespace-nowrap"
                          >
                            {item.id}
                          </button>
                        </td>
                        <td className="py-2 px-2.5 max-w-[170px]">
                          <p className="font-semibold text-slate-900 truncate text-[11.5px]" title={item.title}>
                            {item.title}
                          </p>
                        </td>
                        <td className="py-2 px-2 text-slate-700 whitespace-nowrap text-[11px]">{item.audience}</td>
                        <td className="py-2 px-2 text-slate-600 whitespace-nowrap text-[10.5px]">
                          {item.scheduledFor || item.date}
                        </td>
                        <td className="py-2 px-1.5 text-center whitespace-nowrap">
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-[#0066FF] border border-blue-200/60 whitespace-nowrap">
                            {item.channels.join(' + ') || 'All Channels'}
                          </span>
                        </td>
                        <td className="py-2 px-1.5 text-center whitespace-nowrap">
                          <PriorityBadge priority={item.priority} />
                        </td>
                        <td className="py-2 px-1.5 text-center whitespace-nowrap">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="py-1.5 px-2 text-center whitespace-nowrap w-[80px]">
                          <div className="flex items-center justify-center gap-0.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => navigate('/work-management/broadcast/create')}
                              className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:text-[#0066FF] hover:bg-blue-50 transition-colors"
                              title="Edit broadcast"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRescheduleItem(item)
                                setNewTime(item.scheduledFor || '12 Nov 2026, 11:00 AM')
                              }}
                              className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Reschedule broadcast"
                            >
                              <Clock size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancel(item.id)}
                              className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Cancel / Move to Drafts"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls matching Image 2 */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-1 text-xs text-slate-500">
            <div>
              Showing {paginatedList.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, filteredList.length)} of {filteredList.length}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="grid h-7 w-7 place-items-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'h-7 min-w-[28px] rounded px-2 text-xs font-semibold transition-all border',
                    currentPage === page
                      ? 'border-[#0066FF] bg-[#0066FF] text-white shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  {page}
                </button>
              ))}

              {totalPages > 5 && (
                <>
                  <span className="text-slate-400">...</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-7 min-w-[28px] rounded border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="grid h-7 w-7 place-items-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Schedule Calendar & AI Delivery Time (compact sidecard) */}
        <div className="w-full xl:w-[320px] shrink-0 space-y-5">
          {/* Card 1: Schedule Calendar - Nov 2026 matching Image 4 */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#0066FF]" />
                <h3 className="text-xs font-bold text-slate-900">Schedule Calendar - Nov 2026</h3>
              </div>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-[11px] text-[#0066FF] hover:underline"
                >
                  Clear date
                </button>
              )}
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400 pt-2 border-t border-slate-100">
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
              <span>S</span>
            </div>

            {/* Calendar Grid (Nov 2026 starts on Sunday 1 Nov) */}
            <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
              {/* Day 1 Sunday */}
              <button
                type="button"
                onClick={() => setSelectedDate(1)}
                className={cn(
                  'h-8 w-8 mx-auto grid place-items-center rounded-lg text-slate-700 transition-colors',
                  selectedDate === 1 ? 'bg-[#0066FF] font-bold text-white shadow-2xs' : 'hover:bg-slate-100'
                )}
              >
                1
              </button>

              {/* Days 2 to 30 */}
              {Array.from({ length: 29 }, (_, i) => i + 2).map((day) => {
                const isSelected = selectedDate === day
                const hasBroadcast = scheduledDays.includes(day)

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day)
                      setActiveTab('Scheduled')
                      toast(`Filtered broadcasts for ${day} Nov 2026`, 'info')
                    }}
                    className={cn(
                      'relative h-8 w-8 mx-auto grid place-items-center rounded-lg text-xs font-medium transition-colors',
                      isSelected
                        ? 'bg-[#0066FF] font-bold text-white shadow-2xs'
                        : hasBroadcast
                          ? 'font-semibold text-slate-800 hover:bg-blue-50'
                          : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    <span>{day}</span>
                    {hasBroadcast && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#0066FF]" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Card 2: AI Delivery Time (matching Image 4) */}
          <div className="rounded-2xl border border-purple-200/90 bg-purple-50/40 p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-purple-900">
              <Sparkles size={16} className="text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                AI Delivery Time
              </h3>
            </div>

            <p className="text-xs font-medium text-slate-700 leading-relaxed">
              Best read-rate slot for Field Team is <strong>10:30 – 11:30 AM</strong>. Reschedule 3 broadcasts?
            </p>

            <button
              type="button"
              onClick={handleAiOptimizeTimes}
              className="mt-2 w-full rounded-xl border border-purple-300 bg-white py-2 px-3 text-xs font-semibold text-purple-700 shadow-2xs hover:bg-purple-100/60 transition-all text-center"
            >
              Review
            </button>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Reschedule Broadcast</h3>
              <button
                type="button"
                onClick={() => setRescheduleItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-500">ID: {rescheduleItem.id}</p>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">{rescheduleItem.title}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Select Date & Time</label>
              <input
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="e.g. 10 Nov 2026, 10:30 AM"
                className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleItem(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReschedule}
                className="rounded-lg bg-[#0066FF] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-semibold text-[#0066FF]">{previewItem.id}</span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">{previewItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
              <div>
                <span className="text-slate-400 block text-[11px]">Audience</span>
                <span className="font-semibold text-slate-800">{previewItem.audience}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Priority</span>
                <PriorityBadge priority={previewItem.priority} />
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Status</span>
                <StatusBadge status={previewItem.status} />
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Scheduled For / Date</span>
                <span className="font-semibold text-slate-800">{previewItem.scheduledFor || previewItem.date}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">Subject</span>
              <p className="text-xs text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {previewItem.subject}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">Message</span>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                {previewItem.message}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
