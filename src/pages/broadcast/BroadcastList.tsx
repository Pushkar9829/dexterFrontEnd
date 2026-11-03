import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MoreVertical,
  Plus,
  Radio,
  Search,
  Send,
} from 'lucide-react'
import {
  useBroadcasts,
  exportBroadcastsCsv,
  type BroadcastRecord,
} from '@/data/broadcasts'
import { PriorityBadge, StatusBadge } from './BroadcastOverview'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

export default function BroadcastList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') || 'All'
  const { broadcasts } = useBroadcasts()

  // Tab filter: 'All' | 'Published' | 'Scheduled' | 'Pending' | 'Draft' | 'Rejected'
  const [activeTab, setActiveTab] = useState<string>(initialStatus)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState(initialStatus === 'All' ? '' : initialStatus)
  const [filterPriority, setFilterPriority] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const filterDateRange = '01 Oct - 03 Nov 2026'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  // Action menu dropdown
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastRecord | null>(null)

  // Counts for tabs matching Image 2
  const counts = useMemo(() => {
    return {
      all: broadcasts.length,
      published: broadcasts.filter((b) => b.status === 'Published').length,
      scheduled: broadcasts.filter((b) => b.status === 'Scheduled').length,
      pending: broadcasts.filter((b) => b.status === 'Pending Approval').length,
      draft: broadcasts.filter((b) => b.status === 'Draft').length,
      rejected: broadcasts.filter((b) => b.status === 'Rejected').length,
    }
  }, [broadcasts])

  const filteredList = useMemo(() => {
    return broadcasts.filter((item) => {
      // Tab matching
      if (activeTab === 'Published' && item.status !== 'Published') return false
      if (activeTab === 'Scheduled' && item.status !== 'Scheduled') return false
      if (activeTab === 'Pending' && item.status !== 'Pending Approval') return false
      if (activeTab === 'Draft' && item.status !== 'Draft') return false
      if (activeTab === 'Rejected' && item.status !== 'Rejected') return false

      // Filters
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const match =
          item.id.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.subject.toLowerCase().includes(q) ||
          item.audience.toLowerCase().includes(q)
        if (!match) return false
      }

      if (filterStatus && filterStatus !== 'All' && item.status !== filterStatus) return false
      if (filterPriority && filterPriority !== 'All' && item.priority !== filterPriority) return false
      if (filterDepartment && filterDepartment !== 'All' && item.audience !== filterDepartment) return false

      return true
    })
  }, [broadcasts, activeTab, searchTerm, filterStatus, filterPriority, filterDepartment])

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, currentPage])

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))

  const handleExport = () => {
    exportBroadcastsCsv(filteredList, 'all-broadcasts')
    toast('Broadcast records exported as CSV', 'success')
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Header matching Image 2 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100/70 text-[#0066FF]">
            <Radio size={20} className="text-[#0066FF]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">All Broadcasts</h1>
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

      {/* Status Pill Tabs Bar matching Image 2 */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'All', label: 'All', count: counts.all },
          { key: 'Published', label: 'Published', count: counts.published },
          { key: 'Scheduled', label: 'Scheduled', count: counts.scheduled },
          { key: 'Pending', label: 'Pending', count: counts.pending },
          { key: 'Draft', label: 'Draft', count: counts.draft },
          { key: 'Rejected', label: 'Rejected', count: counts.rejected },
        ].map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key)
                setCurrentPage(1)
              }}
              className={cn(
                'rounded-xl px-4 py-2 text-xs font-semibold transition-all border shadow-2xs',
                active
                  ? 'bg-[#0066FF] text-white border-[#0066FF]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              )}
            >
              <span>{tab.label}</span>
              <span className={cn('ml-1.5 font-bold', active ? 'text-blue-100' : 'text-slate-500')}>
                ({tab.count})
              </span>
            </button>
          )
        })}
      </div>

      {/* Filter Toolbar matching Image 2 */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search title / ID..."
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
            <option value="Published">Published</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Draft">Draft</option>
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

      {/* Main Broadcasts Table matching Image 2 */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 w-32">Broadcast ID</th>
                <th className="py-3 px-4 min-w-[240px]">Title</th>
                <th className="py-3 px-4 w-36">Type</th>
                <th className="py-3 px-4 w-36">Audience</th>
                <th className="py-3 px-4 w-28 text-center">Priority</th>
                <th className="py-3 px-4 w-28 whitespace-nowrap">Date</th>
                <th className="py-3 px-4 w-32 text-center">Status</th>
                <th className="py-3 px-4 w-20 text-center">Read %</th>
                <th className="py-3 px-3 w-12 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {paginatedList.length > 0 ? (
                paginatedList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#0066FF] whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedBroadcast(item)}
                        className="hover:underline flex items-center gap-1 font-mono font-semibold text-[#0066FF] whitespace-nowrap"
                      >
                        {item.id}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900 line-clamp-1">{item.title}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{item.subject}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{item.type}</td>
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">{item.audience}</td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">{item.date}</td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700 whitespace-nowrap">
                      {item.status === 'Published' || item.status === 'Scheduled'
                        ? `${item.readPercentage}%`
                        : '—'}
                    </td>
                    <td className="py-3.5 px-3 text-center relative">
                      <button
                        type="button"
                        onClick={() => setOpenActionId(openActionId === item.id ? null : item.id)}
                        className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      >
                        <MoreVertical size={15} />
                      </button>

                      {openActionId === item.id && (
                        <div className="absolute right-3 top-10 z-20 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg text-xs font-medium text-slate-700 text-left">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBroadcast(item)
                              setOpenActionId(null)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-slate-50"
                          >
                            <Eye size={13} className="text-slate-400" />
                            <span>View Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigate('/work-management/broadcast/create')
                              setOpenActionId(null)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-slate-50"
                          >
                            <Plus size={13} className="text-slate-400" />
                            <span>Duplicate</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toast(`Dispatched re-broadcast for ${item.id}`, 'info')
                              setOpenActionId(null)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-blue-600"
                          >
                            <Send size={13} />
                            <span>Resend</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                    No broadcasts found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer matching Image 2 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 bg-slate-50/50 text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{filteredList.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> –{' '}
            <strong className="text-slate-900">{Math.min(currentPage * pageSize, filteredList.length)}</strong> of{' '}
            <strong className="text-slate-900">{filteredList.length.toLocaleString('en-IN')}</strong>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>

            {[1, 2, 3, 4].slice(0, totalPages).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                className={cn(
                  'h-7 min-w-7 px-2 rounded-lg text-xs font-semibold transition-all',
                  currentPage === p
                    ? 'bg-[#0066FF] text-white shadow-2xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                )}
              >
                {p}
              </button>
            ))}

            {totalPages > 4 && <span className="px-1 text-slate-400">...</span>}
            {totalPages > 4 && (
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                className={cn(
                  'h-7 min-w-7 px-2 rounded-lg text-xs font-semibold',
                  currentPage === totalPages
                    ? 'bg-[#0066FF] text-white shadow-2xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                )}
              >
                {totalPages}
              </button>
            )}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Broadcast Preview Modal */}
      {selectedBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#0066FF]">
                  {selectedBroadcast.id}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedBroadcast.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBroadcast(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <PriorityBadge priority={selectedBroadcast.priority} />
              <StatusBadge status={selectedBroadcast.status} />
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700 font-medium">
                Audience: {selectedBroadcast.audience}
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[#0066FF] font-medium">
                {selectedBroadcast.recipientsCount} recipients
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line font-normal">
              {selectedBroadcast.message}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Created by {selectedBroadcast.createdBy} · {selectedBroadcast.date}</span>
              <button
                type="button"
                onClick={() => setSelectedBroadcast(null)}
                className="rounded-lg bg-[#0066FF] px-4 py-1.5 text-xs font-semibold text-white"
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
