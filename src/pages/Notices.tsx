import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Home,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { NOTICES, NOTICE_TYPES, type Notice, type NoticeType } from '@/data/notices'

const TODAY = '2026-10-06'
const istDay = (iso: string) =>
  new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10)
const FIRST_EARLIER = NOTICES.find((n) => istDay(n.at) < TODAY)?.id

function whenLabel(n: Notice) {
  const d = new Date(n.at)
  const date = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: 'Asia/Kolkata',
  })
  const time = d
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    })
    .toLowerCase()
  const top =
    istDay(n.at) === TODAY
      ? `Today · ${date}`
      : n.id === FIRST_EARLIER
        ? `Earlier · ${date}`
        : date
  return { top, time, rawDate: date }
}

// Category badge styles
const CATEGORY_STYLES: Record<
  NoticeType,
  { bg: string; text: string; border: string; label: string }
> = {
  KYC: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    label: 'KYC Document',
  },
  EOD: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    label: 'EOD Reporting',
  },
  Stage: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    label: 'Stage Progress',
  },
  'SLA breach': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200 font-semibold',
    label: 'SLA Breach',
  },
  'SLA warning': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    label: 'SLA Warning',
  },
  Reminder: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    label: 'Reminder',
  },
  Escalation: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200 font-semibold',
    label: 'L2 Escalation',
  },
  Complaint: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    label: 'Complaint Alarm',
  },
  Assignment: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    label: 'Task Assignment',
  },
  Application: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    label: 'Onboarding App',
  },
}

export default function Notices() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Notice[]>(NOTICES)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [typeFilter, setTypeFilter] = useState<NoticeType | 'all'>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'earlier'>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'normal'>('all')

  // Pagination & selection
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(15)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal detail
  const [viewingNotice, setViewingNotice] = useState<Notice | null>(null)

  // Derived counts
  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items])
  const slaCount = useMemo(
    () =>
      items.filter(
        (n) => n.type === 'SLA breach' || n.type === 'SLA warning' || n.type === 'Escalation'
      ).length,
    [items]
  )
  const todayCount = useMemo(
    () => items.filter((n) => istDay(n.at) === TODAY).length,
    [items]
  )

  const countsByType = useMemo(() => {
    const c: Record<string, number> = {}
    items.forEach((n) => {
      c[n.type] = (c[n.type] ?? 0) + 1
    })
    return c
  }, [items])

  // Filtered rows
  const filteredRows = useMemo(() => {
    return items.filter((n) => {
      // Read filter
      if (readFilter === 'unread' && n.read) return false
      if (readFilter === 'read' && !n.read) return false

      // Type filter
      if (typeFilter !== 'all' && n.type !== typeFilter) return false

      // Date Range filter
      if (dateRangeFilter === 'today' && istDay(n.at) !== TODAY) return false
      if (dateRangeFilter === 'earlier' && istDay(n.at) >= TODAY) return false

      // Priority filter
      const isCritical =
        n.type === 'SLA breach' || n.type === 'Escalation' || n.type === 'SLA warning'
      if (priorityFilter === 'critical' && !isCritical) return false
      if (priorityFilter === 'normal' && isCritical) return false

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesTitle = n.title.toLowerCase().includes(q)
        const matchesDetails = n.details.toLowerCase().includes(q)
        const matchesType = n.type.toLowerCase().includes(q)
        const matchesId = n.id.toLowerCase().includes(q)
        const matchesLink = n.link.toLowerCase().includes(q)
        if (!matchesTitle && !matchesDetails && !matchesType && !matchesId && !matchesLink) {
          return false
        }
      }

      return true
    })
  }, [items, readFilter, typeFilter, dateRangeFilter, priorityFilter, searchQuery])

  // Pagination calculation
  const totalRecords = filteredRows.length
  const totalPages = Math.ceil(totalRecords / pageSize) || 1
  const validCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (validCurrentPage - 1) * pageSize
  const paginatedRows = useMemo(() => {
    return filteredRows.slice(startIndex, startIndex + pageSize)
  }, [filteredRows, startIndex, pageSize])

  // Actions: Read status management
  const markRead = (ids: string[], read = true) => {
    setItems((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read } : n))
    )
    if (viewingNotice && ids.includes(viewingNotice.id)) {
      setViewingNotice((prev) => (prev ? { ...prev, read } : null))
    }
  }

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    setSelectedIds([])
    toast('All notices marked as read', 'success')
  }

  const handleMarkSelectedRead = () => {
    if (selectedIds.length === 0) return
    markRead(selectedIds, true)
    toast(`${selectedIds.length} notices marked as read`, 'success')
    setSelectedIds([])
  }

  const handleMarkSelectedUnread = () => {
    if (selectedIds.length === 0) return
    markRead(selectedIds, false)
    toast(`${selectedIds.length} notices marked as unread`, 'info')
    setSelectedIds([])
  }

  const handleRefresh = () => {
    setItems([...items])
    toast(`Notices refreshed · ${unreadCount} pending review`, 'info')
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setReadFilter('all')
    setTypeFilter('all')
    setDateRangeFilter('all')
    setPriorityFilter('all')
    setCurrentPage(1)
    toast('Filters reset to default view', 'info')
  }

  // Export to CSV
  const handleExport = () => {
    const headers = [
      '#',
      'Notice ID',
      'Category',
      'Title',
      'Details',
      'Date & Time (IST)',
      'Status',
      'Target Link',
    ]
    const rows = filteredRows.map((n, i) => {
      const w = whenLabel(n)
      return [
        String(i + 1),
        n.id,
        n.type,
        n.title,
        n.details,
        `${w.top} ${w.time}`,
        n.read ? 'Read' : 'Unread',
        n.link,
      ]
    })
    downloadCsv(`system-notices-${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`Exported ${filteredRows.length} notices to CSV`, 'success')
  }

  // Selection handlers
  const handleSelectAllOnPage = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedRows.map((r) => r.id)
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    } else {
      const pageIdsSet = new Set(paginatedRows.map((r) => r.id))
      setSelectedIds((prev) => prev.filter((id) => !pageIdsSet.has(id)))
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    }
  }

  const isAllOnPageSelected =
    paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.includes(r.id))

  const hasActiveFilters =
    searchQuery !== '' ||
    readFilter !== 'all' ||
    typeFilter !== 'all' ||
    dateRangeFilter !== 'all' ||
    priorityFilter !== 'all'

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 space-y-5 pb-16 font-sans">
      {/* ── Breadcrumbs ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Dashboard
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Notices & System Advisories</span>
      </div>

      {/* ── Header Banner ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/60 p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0066FF] text-white shadow-md shadow-blue-500/20">
            <BellRing size={24} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Notices &amp; System Advisories
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Operational Feed
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-slate-500 max-w-3xl">
              Track real-time operational alerts, KYC verification turnarounds, EOD submission deadlines, SLA breaches, and workflow escalations across India operations.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] disabled:bg-slate-300 text-white text-[12.5px] font-bold transition-all shadow-sm hover:shadow cursor-pointer disabled:cursor-not-allowed"
          >
            <CheckCheck size={16} strokeWidth={2.5} />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Summary Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Notices */}
        <div
          onClick={() => {
            setReadFilter('all')
            setPriorityFilter('all')
            setDateRangeFilter('all')
            setCurrentPage(1)
          }}
          className={cn(
            'bg-white rounded-xl border p-4 shadow-2xs transition-all cursor-pointer hover:shadow-md flex items-center justify-between',
            readFilter === 'all' && priorityFilter === 'all' && dateRangeFilter === 'all'
              ? 'border-blue-300 ring-2 ring-blue-50'
              : 'border-slate-200/90'
          )}
        >
          <div>
            <div className="text-[12px] font-semibold text-slate-500">Total Notices</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{items.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across 10 alert categories</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
            <Bell size={20} />
          </div>
        </div>

        {/* Card 2: Unread Attention Items */}
        <div
          onClick={() => {
            setReadFilter('unread')
            setPriorityFilter('all')
            setDateRangeFilter('all')
            setCurrentPage(1)
          }}
          className={cn(
            'bg-white rounded-xl border p-4 shadow-2xs transition-all cursor-pointer hover:shadow-md flex items-center justify-between',
            readFilter === 'unread'
              ? 'border-amber-300 ring-2 ring-amber-50'
              : 'border-slate-200/90'
          )}
        >
          <div>
            <div className="text-[12px] font-semibold text-amber-800">Unread Attention Items</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{unreadCount}</div>
            <div className="text-[11px] text-amber-700/80 mt-0.5 font-medium">
              Requires immediate action
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle size={20} />
          </div>
        </div>

        {/* Card 3: SLA Breaches & Warnings */}
        <div
          onClick={() => {
            setPriorityFilter('critical')
            setReadFilter('all')
            setDateRangeFilter('all')
            setCurrentPage(1)
          }}
          className={cn(
            'bg-white rounded-xl border p-4 shadow-2xs transition-all cursor-pointer hover:shadow-md flex items-center justify-between',
            priorityFilter === 'critical'
              ? 'border-red-300 ring-2 ring-red-50'
              : 'border-slate-200/90'
          )}
        >
          <div>
            <div className="text-[12px] font-semibold text-rose-800">SLA Breaches &amp; Escalations</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{slaCount}</div>
            <div className="text-[11px] text-rose-600/80 mt-0.5 font-medium">
              High turnaround penalty risk
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert size={20} />
          </div>
        </div>

        {/* Card 4: Today's Advisories */}
        <div
          onClick={() => {
            setDateRangeFilter('today')
            setReadFilter('all')
            setPriorityFilter('all')
            setCurrentPage(1)
          }}
          className={cn(
            'bg-white rounded-xl border p-4 shadow-2xs transition-all cursor-pointer hover:shadow-md flex items-center justify-between',
            dateRangeFilter === 'today'
              ? 'border-emerald-300 ring-2 ring-emerald-50'
              : 'border-slate-200/90'
          )}
        >
          <div>
            <div className="text-[12px] font-semibold text-emerald-800">Today&apos;s Broadcasts</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{todayCount}</div>
            <div className="text-[11px] text-emerald-700/80 mt-0.5 font-medium">
              Generated 06 Oct 2026
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* ── Category Quick Filter Chips ──────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <Filter size={13} className="text-[#0066FF]" /> Filter by Advisory Category
          </span>
          <span className="text-[11px] text-slate-400">
            Click any category to isolate matching notices
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setTypeFilter('all')
              setCurrentPage(1)
            }}
            className={cn(
              'h-7 rounded-full border px-3 text-[11.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              typeFilter === 'all'
                ? 'border-[#0066FF] bg-[#0066FF] text-white shadow-2xs'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            All Categories <span className="text-[10.5px] opacity-80">({items.length})</span>
          </button>

          {NOTICE_TYPES.map((t) => {
            const count = countsByType[t] ?? 0
            const active = typeFilter === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTypeFilter(active ? 'all' : t)
                  setCurrentPage(1)
                }}
                className={cn(
                  'h-7 rounded-full border px-3 text-[11.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  active
                    ? 'border-[#0066FF] bg-[#0066FF] text-white shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <span>{t}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Filters & Search Toolbar ─────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, details, notice ID (e.g. N-0001)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-[12.5px] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Read Status */}
          <div className="relative">
            <select
              value={readFilter}
              onChange={(e) => {
                setReadFilter(e.target.value as 'all' | 'unread' | 'read')
                setCurrentPage(1)
              }}
              className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-[12.5px] font-medium text-slate-700 outline-none focus:border-[#0066FF] cursor-pointer"
            >
              <option value="all">All Read Statuses</option>
              <option value="unread">Unread Only ({unreadCount})</option>
              <option value="read">Read Only ({items.length - unreadCount})</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <select
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value as 'all' | 'today' | 'earlier')
                setCurrentPage(1)
              }}
              className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-[12.5px] font-medium text-slate-700 outline-none focus:border-[#0066FF] cursor-pointer"
            >
              <option value="all">All Time Records</option>
              <option value="today">Today Only ({todayCount})</option>
              <option value="earlier">Earlier Records</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          {/* Priority / Severity */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as 'all' | 'critical' | 'normal')
                setCurrentPage(1)
              }}
              className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-[12.5px] font-medium text-slate-700 outline-none focus:border-[#0066FF] cursor-pointer"
            >
              <option value="all">All Priority Levels</option>
              <option value="critical">Critical / SLA Alerts ({slaCount})</option>
              <option value="normal">Standard Operational</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>

        {/* Active Filters & Bulk Selection Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-[12px]">
          <div className="flex flex-wrap items-center gap-2">
            {hasActiveFilters && (
              <>
                <span className="text-slate-500 font-medium">Active Filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-primary">
                    Search: &ldquo;{searchQuery}&rdquo;
                  </span>
                )}
                {readFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-primary capitalize">
                    Status: {readFilter}
                  </span>
                )}
                {typeFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-primary">
                    Category: {typeFilter}
                  </span>
                )}
                {dateRangeFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-primary capitalize">
                    Time: {dateRangeFilter}
                  </span>
                )}
                {priorityFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-primary capitalize">
                    Priority: {priorityFilter}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 font-semibold text-[#0066FF] hover:underline cursor-pointer ml-1"
                >
                  <RotateCcw size={12} /> Reset All
                </button>
              </>
            )}
            {!hasActiveFilters && (
              <span className="text-slate-500">
                Displaying all system notices ordered newest first. Blue indicator highlights unread alerts.
              </span>
            )}
          </div>

          {/* Bulk Selection Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-200 rounded-lg px-3 py-1">
              <span className="font-bold text-[#0066FF] text-[11.5px]">
                {selectedIds.length} {selectedIds.length === 1 ? 'notice' : 'notices'} selected:
              </span>
              <button
                type="button"
                onClick={handleMarkSelectedRead}
                className="inline-flex items-center gap-1 text-[11.5px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                <Check size={13} /> Mark Read
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleMarkSelectedUnread}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Mark Unread
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-[11.5px] text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Table Container ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        {/* Table Subheader: Total Records & Show Dropdown */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] font-bold text-slate-900">System Notices Register</span>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              Total Records: {filteredRows.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[12px] text-slate-600">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-7 rounded border border-slate-200 bg-white px-2 text-[12px] font-medium text-slate-700 outline-none focus:border-[#0066FF] cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={35}>35 (All)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Table - table-fixed ensures all columns fit in one window */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-[12px]">
            <colgroup>
              <col className="w-[36px]" />
              <col className="w-[42px]" />
              <col className="w-[82px]" />
              <col className="w-[110px]" />
              <col className="w-[116px]" />
              <col className="w-auto" />
              <col className="w-[165px]" />
              <col className="w-[115px]" />
              <col className="w-[115px]" />
            </colgroup>
            {/* Header matching Dexter standard: bg-[#CFE8FC] text-[#2C5282] */}
            <thead className="bg-[#CFE8FC] text-[#2C5282] font-semibold text-[11.5px] tracking-wide border-b border-sky-200">
              <tr>
                <th className="px-1.5 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={isAllOnPageSelected}
                    onChange={(e) => handleSelectAllOnPage(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#0066FF] focus:ring-[#0066FF] cursor-pointer"
                  />
                </th>
                <th className="px-1 py-2.5 text-center font-bold">S.N.</th>
                <th className="px-1.5 py-2.5 text-center font-bold">Status</th>
                <th className="px-2 py-2.5 font-bold">Logged When</th>
                <th className="px-1.5 py-2.5 text-center font-bold">Category</th>
                <th className="px-2.5 py-2.5 font-bold">
                  Notice ID &amp; Subject
                </th>
                <th className="px-2 py-2.5 font-bold">
                  Particulars / Context
                </th>
                <th className="px-2 py-2.5 font-bold">Destination</th>
                <th className="px-1.5 py-2.5 text-center font-bold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                      <Bell size={20} />
                    </div>
                    <div className="text-[13px] font-semibold text-slate-800">
                      No notices match the selected criteria
                    </div>
                    <div className="text-[11.5px] text-slate-500 mt-1">
                      Try resetting your search query or adjusting the category filters.
                    </div>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-[#0066FF] hover:bg-slate-50 cursor-pointer"
                    >
                      <RotateCcw size={12} /> Clear all filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((n, idx) => {
                  const sNumber = startIndex + idx + 1
                  const isSelected = selectedIds.includes(n.id)
                  const w = whenLabel(n)
                  const style = CATEGORY_STYLES[n.type] ?? {
                    bg: 'bg-slate-50',
                    text: 'text-slate-700',
                    border: 'border-slate-200',
                    label: n.type,
                  }
                  const isCritical =
                    n.type === 'SLA breach' || n.type === 'Escalation' || n.type === 'SLA warning'

                  return (
                    <tr
                      key={n.id}
                      className={cn(
                        'transition-colors',
                        isSelected ? 'bg-blue-50/50' : !n.read ? 'bg-blue-50/15 hover:bg-blue-50/30' : 'hover:bg-slate-50/80',
                        !n.read ? 'border-l-4 border-l-[#0066FF]' : 'border-l-4 border-l-transparent'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-1.5 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(n.id, e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-[#0066FF] focus:ring-[#0066FF] cursor-pointer"
                        />
                      </td>

                      {/* S.N. */}
                      <td className="px-1 py-2.5 text-center text-slate-500 font-medium">{sNumber}</td>

                      {/* Status */}
                      <td className="px-1.5 py-2.5 text-center whitespace-nowrap">
                        {!n.read ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 border border-blue-200 px-2 py-0.5 text-[10.5px] font-bold text-blue-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#0066FF] animate-pulse" />
                            Unread
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-600">
                            <Check size={10} className="text-slate-500" /> Read
                          </span>
                        )}
                      </td>

                      {/* Logged When */}
                      <td className="px-2 py-2.5">
                        <div className="font-semibold text-slate-800 leading-tight text-[11.5px] truncate">
                          {w.top}
                        </div>
                        <div className="text-[10.5px] text-slate-400 truncate">{w.time} IST</div>
                      </td>

                      {/* Category */}
                      <td className="px-1.5 py-2.5 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center gap-1 w-full rounded-md px-1.5 py-0.5 text-[10px] border truncate',
                            style.bg,
                            style.text,
                            style.border
                          )}
                          title={style.label}
                        >
                          {isCritical && <ShieldAlert size={10} className="text-red-600 shrink-0" />}
                          <span className="truncate">{style.label}</span>
                        </span>
                      </td>

                      {/* Notice ID & Title */}
                      <td className="px-2.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingNotice(n)}
                            className="font-mono text-[10.5px] font-bold text-[#0066FF] hover:underline cursor-pointer flex items-center gap-0.5 shrink-0"
                          >
                            {n.id}
                            <ExternalLink size={9} />
                          </button>
                          {isCritical && (
                            <span className="rounded bg-rose-100 text-rose-800 px-1 py-0.2 text-[9px] font-bold uppercase tracking-wider shrink-0">
                              Urgent
                            </span>
                          )}
                        </div>
                        <div
                          onClick={() => setViewingNotice(n)}
                          title={n.title}
                          className={cn(
                            'text-[12px] truncate cursor-pointer hover:text-[#0066FF] transition-colors mt-0.5',
                            !n.read ? 'font-bold text-slate-900' : 'text-slate-700'
                          )}
                        >
                          {n.title}
                        </div>
                      </td>

                      {/* Details / Particulars */}
                      <td className="px-2 py-2.5 text-slate-600">
                        <div className="truncate text-[11.5px]" title={n.details}>
                          {n.details}
                        </div>
                      </td>

                      {/* Target Module / Destination */}
                      <td className="px-2 py-2.5">
                        <Link
                          to={n.link}
                          onClick={() => markRead([n.id], true)}
                          title={n.link}
                          className="font-mono text-[10.5px] rounded bg-slate-100 hover:bg-blue-50 hover:text-[#0066FF] px-1.5 py-0.5 text-slate-600 transition-colors truncate block"
                        >
                          {n.link}
                        </Link>
                      </td>

                      {/* Actions */}
                      <td className="px-1.5 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Open in module */}
                          <Link
                            to={n.link}
                            onClick={() => markRead([n.id], true)}
                            title="Open in Target Module"
                            className="inline-flex items-center gap-0.5 rounded bg-[#0066FF] hover:bg-[#0052CC] text-white px-2 py-1 text-[11px] font-bold transition-colors shadow-2xs shrink-0"
                          >
                            <span>Open</span>
                            <ChevronRight size={11} />
                          </Link>

                          {/* Quick view details */}
                          <button
                            type="button"
                            onClick={() => setViewingNotice(n)}
                            title="View Notice Dossier"
                            className="h-6 w-6 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          >
                            <Eye size={12} />
                          </button>

                          {/* Toggle read status */}
                          <button
                            type="button"
                            onClick={() => {
                              markRead([n.id], !n.read)
                              toast(
                                !n.read ? `Notice ${n.id} marked as read` : `Notice ${n.id} marked as unread`,
                                'info'
                              )
                            }}
                            title={!n.read ? 'Mark as Read' : 'Mark as Unread'}
                            className={cn(
                              'h-6 w-6 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0',
                              !n.read
                                ? 'border-blue-200 bg-blue-50 text-[#0066FF] hover:bg-blue-100'
                                : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                            )}
                          >
                            {!n.read ? <Check size={12} strokeWidth={2.5} /> : <RotateCcw size={11} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Pagination Bar ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-[12px] text-slate-600">
          <div>
            Showing <span className="font-semibold">{totalRecords > 0 ? startIndex + 1 : 0}</span> to{' '}
            <span className="font-semibold">
              {Math.min(startIndex + pageSize, totalRecords)}
            </span>{' '}
            of <span className="font-semibold">{totalRecords}</span> records
          </div>

          <div className="flex items-center gap-1.5">
            {/* First */}
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="h-7 w-7 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsLeft size={14} />
            </button>

            {/* Prev */}
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 w-7 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1
              // Show only nearby pages if totalPages is large
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= validCurrentPage - 1 && pageNum <= validCurrentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      'h-7 min-w-[28px] rounded px-1.5 text-[12px] font-semibold transition-colors cursor-pointer',
                      pageNum === validCurrentPage
                        ? 'bg-[#0066FF] text-white shadow-2xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    {pageNum}
                  </button>
                )
              }
              if (pageNum === validCurrentPage - 2 || pageNum === validCurrentPage + 2) {
                return (
                  <span key={pageNum} className="px-1 text-slate-400">
                    ...
                  </span>
                )
              }
              return null
            })}

            {/* Next */}
            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 w-7 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>

            {/* Last */}
            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="h-7 w-7 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Footer Information Card ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-slate-500 rounded-lg bg-slate-100/60 p-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#0066FF]" />
          <span>
            Blue-edged left borders indicate unacknowledged notices. Clicking &quot;Open&quot; redirects to the actionable module and marks the notice as read.
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>All timestamps in Indian Standard Time (IST)</span>
          <span className="text-slate-300">|</span>
          <span>Last synchronized 06 Oct 2026, 09:14 IST</span>
        </div>
      </div>

      {/* ── Notice Detail Dossier Modal ──────────────────────────────────── */}
      {viewingNotice && (
        <Modal
          title={`Notice Dossier — ${viewingNotice.id}`}
          sub="Complete operational advisory record and linked workflow action."
          onClose={() => setViewingNotice(null)}
          width={640}
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  markRead([viewingNotice.id], !viewingNotice.read)
                  toast(
                    !viewingNotice.read
                      ? `Notice ${viewingNotice.id} marked as read`
                      : `Notice ${viewingNotice.id} marked as unread`,
                    'info'
                  )
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {!viewingNotice.read ? (
                  <>
                    <Check size={14} className="text-emerald-600" /> Mark as Read
                  </>
                ) : (
                  <>
                    <RotateCcw size={13} /> Mark as Unread
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingNotice(null)}
                  className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    markRead([viewingNotice.id], true)
                    setViewingNotice(null)
                    navigate(viewingNotice.link)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] px-4 py-1.5 text-[12px] font-bold text-white shadow-sm cursor-pointer"
                >
                  <span>Proceed to Module</span>
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-[13px]">
            {/* Top metadata grid */}
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3.5">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Category &amp; Classification
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 mt-1 rounded-md px-2.5 py-0.5 text-[11.5px] font-bold border',
                    CATEGORY_STYLES[viewingNotice.type]?.bg,
                    CATEGORY_STYLES[viewingNotice.type]?.text,
                    CATEGORY_STYLES[viewingNotice.type]?.border
                  )}
                >
                  {CATEGORY_STYLES[viewingNotice.type]?.label}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Notice Status
                </span>
                <div className="mt-1">
                  {!viewingNotice.read ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 border border-blue-300 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#0066FF] animate-pulse" />
                      Unread Attention Item
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                      <CheckCircle2 size={12} className="text-emerald-600" /> Acknowledged &amp; Read
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Generated Timestamp
                </span>
                <span className="font-semibold text-slate-800 text-[12px] mt-1 block">
                  {whenLabel(viewingNotice).top} at {whenLabel(viewingNotice).time} IST
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Target Route
                </span>
                <span className="font-mono text-[11.5px] font-semibold text-[#0066FF] mt-1 block">
                  {viewingNotice.link}
                </span>
              </div>
            </div>

            {/* Subject / Title */}
            <div>
              <span className="text-[11.5px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Notice Title / Subject
              </span>
              <div className="rounded-lg border border-slate-200 bg-white p-3 font-semibold text-slate-900 text-[13.5px]">
                {viewingNotice.title}
              </div>
            </div>

            {/* Details / Particulars */}
            <div>
              <span className="text-[11.5px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Detailed Context &amp; Particulars
              </span>
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-slate-700 leading-relaxed text-[13px]">
                {viewingNotice.details}
              </div>
            </div>

            {/* Operational Advisory Hint */}
            <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-[12px] text-sky-900 flex items-start gap-2.5">
              <Clock size={16} className="text-[#0066FF] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Operational Guidance:</span> Clicking &quot;Proceed to Module&quot; will automatically mark this notice as read and transition directly to the designated operational screen to resolve the requirement.
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
