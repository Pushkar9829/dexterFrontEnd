import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  FileSpreadsheet,
  Monitor,
  Calendar,
  Download,
  Search,
  Filter,
  Plus,
  AlertCircle,
  X,
} from 'lucide-react'
import {
  hampStore,
  updateHampRow,
  addHampRow,
  HAMP_STATUS_OPTIONS,
  type HampViewType,
} from '@/data/hampReport'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

export default function HampReport() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab: HampViewType = tabParam === 'crm' ? 'CRM' : 'ATM'
  const [activeTab, setActiveTab] = useState<HampViewType>(initialTab)

  const rows = hampStore.use()

  // Selected date in header
  const [selectedDate, setSelectedDate] = useState('2026-11-03')

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Add Row Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [newRowData, setNewRowData] = useState({
    spoc: 'Harsh',
    atmId: '',
    franchiseeName: '',
    cbrDate: '02.11.2026',
    counterDate: '02.11.2026',
    status: '',
    date: '2026-11-03',
  })

  // Editing dates inline
  const [editingDateCell, setEditingDateCell] = useState<{ id: string; field: 'cbrDate' | 'counterDate' } | null>(null)

  // Switch tab
  const handleTabChange = (tab: HampViewType) => {
    setActiveTab(tab)
    setSearchParams({ tab: tab.toLowerCase() }, { replace: true })
  }

  // Filter rows for current tab
  const tabRows = useMemo(() => {
    return rows.filter((r) => r.type === activeTab)
  }, [rows, activeTab])

  const filteredRows = useMemo(() => {
    return tabRows.filter((r) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'EMPTY' && r.status) return false
        if (statusFilter !== 'EMPTY' && r.status !== statusFilter) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchAtm = r.atmId.toLowerCase().includes(q)
        const matchFr = r.franchiseeName.toLowerCase().includes(q)
        const matchSpoc = r.spoc.toLowerCase().includes(q)
        const matchStatus = (r.status || '').toLowerCase().includes(q)
        if (!matchAtm && !matchFr && !matchSpoc && !matchStatus) return false
      }
      return true
    })
  }, [tabRows, searchQuery, statusFilter])

  // Statistics
  const totalCount = tabRows.length
  const updatedCount = tabRows.filter((r) => r.status === 'Hamp Updated').length
  const pendingCount = tabRows.filter(
    (r) => r.status === 'Discussion Pending at FR End' || r.status === 'Counter Not Received'
  ).length

  // Export CSV
  const handleExportCsv = () => {
    const isAtm = activeTab === 'ATM'
    const headers = [
      'S.N.',
      'SPOC',
      'ATM ID',
      'Franchisee Name',
      isAtm ? 'CBR Last Update' : 'CBR Email Done',
      'Counter Last Update',
      isAtm ? 'HAMP Status' : 'Status / Remark',
    ]
    const dataRows = filteredRows.map((r) => [
      String(r.sn),
      r.spoc,
      r.atmId,
      r.franchiseeName,
      r.cbrDate || 'Calender',
      r.counterDate || 'Calender',
      r.status || 'Select',
    ])
    downloadCsv(`HAMP_Report_${activeTab}_${selectedDate}`, headers, dataRows)
    toast(`Exported HAMP ${activeTab} Report to CSV`, 'success')
  }

  // Update Status
  const handleStatusChange = (id: string, newStatus: string) => {
    updateHampRow(id, { status: newStatus === 'Select' ? '' : newStatus })
    toast('Status updated', 'info')
  }

  // Update inline date
  const handleSaveDate = (id: string, field: 'cbrDate' | 'counterDate', rawDate: string) => {
    // Format YYYY-MM-DD to DD.MM.YYYY
    let formatted = rawDate
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [y, m, d] = rawDate.split('-')
      formatted = `${d}.${m}.${y}`
    }
    updateHampRow(id, { [field]: formatted })
    setEditingDateCell(null)
    toast('Date updated', 'info')
  }

  // Handle Add Row
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRowData.atmId.trim() || !newRowData.franchiseeName.trim()) {
      toast('Please enter ATM ID and Franchisee Name', 'error')
      return
    }
    addHampRow({
      type: activeTab,
      spoc: newRowData.spoc,
      atmId: newRowData.atmId.trim().toUpperCase(),
      franchiseeName: newRowData.franchiseeName.trim(),
      cbrDate: newRowData.cbrDate,
      counterDate: newRowData.counterDate,
      status: newRowData.status,
      date: selectedDate,
    })
    toast(`Added new ${activeTab} record`, 'success')
    setShowAddModal(false)
    setNewRowData({
      spoc: 'Harsh',
      atmId: '',
      franchiseeName: '',
      cbrDate: '02.11.2026',
      counterDate: '02.11.2026',
      status: '',
      date: '2026-11-03',
    })
  }

  // Format YYYY-MM-DD to DD-MM-YYYY for header badge
  const formattedHeaderDate = useMemo(() => {
    if (!selectedDate) return '03-11-2026'
    if (/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m, d] = selectedDate.split('-')
      return `${d}-${m}-${y}`
    }
    return selectedDate
  }, [selectedDate])

  return (
    <div className="space-y-4 pb-12 font-sans max-w-[1440px] mx-auto min-w-0">
      {/* ── 1. Top Breadcrumbs ────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#64748B]">
        <Link
          to="/dashboard"
          className="flex items-center gap-1 text-[#0066FF] hover:text-[#0052CC] transition-colors"
          title="Home"
        >
          <Home size={14} />
          <span>Workspace</span>
        </Link>
        <ChevronRight size={13} className="shrink-0 text-[#94A3B8]" />
        <Link to="/operations" className="hover:text-[#1E293B] transition-colors">
          Operations
        </Link>
        <ChevronRight size={13} className="shrink-0 text-[#94A3B8]" />
        <span className="font-semibold text-[#0F172A]">HAMP Report</span>
      </nav>

      {/* ── 2. Top Header & FFM Switcher ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Icon & Title */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0066FF] text-white shadow-md shadow-blue-500/20">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">HAMP Report</h1>
            <p className="mt-0.5 text-[13px] text-[#64748B]">
              Monitor CBR and counter update status across FFM sites.
            </p>
          </div>
        </div>

        {/* Right: Tab Buttons (FFM ATM | FFM CRM) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleTabChange('ATM')}
            className={cn(
              'px-6 py-2 rounded-xl text-[13.5px] font-semibold transition-all duration-150 cursor-pointer',
              activeTab === 'ATM'
                ? 'bg-[#0066FF] text-white shadow-sm shadow-blue-500/25 ring-2 ring-[#0066FF] ring-offset-1'
                : 'bg-white text-[#0066FF] border border-[#0066FF] hover:bg-blue-50/80'
            )}
          >
            FFM ATM
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('CRM')}
            className={cn(
              'px-6 py-2 rounded-xl text-[13.5px] font-semibold transition-all duration-150 cursor-pointer',
              activeTab === 'CRM'
                ? 'bg-[#0066FF] text-white shadow-sm shadow-blue-500/25 ring-2 ring-[#0066FF] ring-offset-1'
                : 'bg-white text-[#0066FF] border border-[#0066FF] hover:bg-blue-50/80'
            )}
          >
            FFM CRM
          </button>
        </div>
      </div>

      {/* ── 3. Quick Stats & Filter Bar ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab} ID, SPOC, franchisee...`}
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:border-[#0066FF] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[12px] text-slate-700 shadow-2xs">
            <Filter size={13} className="text-[#0066FF]" />
            <span className="font-medium text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none text-[12px]"
            >
              <option value="ALL">All ({tabRows.length})</option>
              <option value="Hamp Updated">Hamp Updated ({updatedCount})</option>
              <option value="HAMP Not Open">HAMP Not Open</option>
              <option value="FR Wrong Feeding">FR Wrong Feeding</option>
              <option value="Counter Not Received">Counter Not Received</option>
              <option value="Discussion Pending at FR End">Discussion Pending</option>
              <option value="Manually can add by setup">Manual Setup</option>
              <option value="EMPTY">Unselected</option>
            </select>
          </div>

          {/* Quick Metrics */}
          <div className="hidden sm:flex items-center gap-2 text-[11.5px]">
            <span className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 font-semibold text-blue-700">
              Total Sites: {totalCount}
            </span>
            <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-semibold text-emerald-700">
              Updated: {updatedCount}
            </span>
            <span className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 font-semibold text-amber-700">
              Pending: {pendingCount}
            </span>
          </div>

          {/* Actions: Add & Export */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <Plus size={14} className="text-[#0066FF]" />
            <span>Add Row</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <Download size={14} className="text-[#0066FF]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── 4. Main Table Card ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#DCE8F6] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
        {/* Card Header: Tab Sub-title (ATM / CRM) & Date */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-[#0066FF] border border-blue-200/80 shrink-0">
              <Monitor size={17} />
            </div>
            <h2 className="text-[17px] font-bold text-[#0F172A] tracking-tight">
              {activeTab === 'ATM' ? 'ATM' : 'CRM'}
            </h2>
          </div>

          {/* Date Picker Button in Card Top Right */}
          <div className="relative flex items-center gap-2">
            <label
              htmlFor="hamp-date-picker"
              className="flex items-center gap-2 rounded-xl border border-[#D0E2F5] bg-[#F7FAFD] px-3 py-1.5 text-[12.5px] font-bold text-[#0F172A] shadow-2xs cursor-pointer hover:bg-[#EBF3FC] transition-colors"
            >
              <Calendar size={15} className="text-[#0066FF] shrink-0" />
              <span>{formattedHeaderDate}</span>
            </label>
            <input
              id="hamp-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="sr-only"
            />
          </div>
        </div>

        {/* The Data Table */}
        <div className="overflow-x-auto rounded-xl border border-[#0B2546]/30 shadow-xs">
          <table className="w-full min-w-[960px] border-collapse text-[13px]">
            {/* Dark Navy Table Header */}
            <thead>
              <tr className="bg-[#0B2546] text-white">
                <th className="py-3 px-3 text-center font-bold uppercase tracking-wider text-[12px] border-r border-[#153A68] w-14">
                  S.N.
                </th>
                <th className="py-3 px-3 text-center font-bold uppercase tracking-wider text-[12px] border-r border-[#153A68] w-24">
                  SPOC
                </th>
                <th className="py-3 px-3 text-center font-bold uppercase tracking-wider text-[12px] border-r border-[#153A68] w-36">
                  ATM ID
                </th>
                <th className="py-3 px-3 text-center font-bold uppercase tracking-wider text-[12px] border-r border-[#153A68]">
                  Franchisee Name
                </th>
                <th className="py-3 px-3 text-center font-bold uppercase tracking-wider text-[12px] border-r border-[#153A68] w-44">
                  {activeTab === 'ATM' ? 'CBR Last Update' : 'CBR Email Done'}
                </th>
                <th className="py-3 px-3 text-center font-bold uppercase tracking-wider text-[12px] border-r border-[#153A68] w-44">
                  Counter Last Update
                </th>
                <th className="py-3 px-3 text-center font-bold uppercase tracking-wider text-[12px] w-64">
                  {activeTab === 'ATM' ? 'HAMP Status' : 'Status / Remark'}
                </th>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertCircle size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No matching records found</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">Try resetting the search or status filter</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isEven = row.sn % 2 === 0
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'transition-colors hover:bg-blue-50/50',
                        isEven ? 'bg-[#F9FBFE]' : 'bg-white'
                      )}
                    >
                      {/* S.N. */}
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700 border-r border-slate-200">
                        {row.sn}
                      </td>

                      {/* SPOC */}
                      <td className="py-2.5 px-3 text-center text-slate-700 font-medium border-r border-slate-200">
                        {row.spoc}
                      </td>

                      {/* ATM ID */}
                      <td className="py-2.5 px-3 text-center font-semibold font-mono text-slate-800 border-r border-slate-200">
                        {row.atmId}
                      </td>

                      {/* Franchisee Name */}
                      <td className="py-2.5 px-4 text-center text-slate-800 font-medium border-r border-slate-200">
                        {row.franchiseeName}
                      </td>

                      {/* CBR Date / CBR Email Done */}
                      <td className="py-2 px-3 text-center border-r border-slate-200">
                        {editingDateCell?.id === row.id && editingDateCell.field === 'cbrDate' ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="date"
                              defaultValue={
                                row.cbrDate && /^\d{2}\.\d{2}\.\d{4}$/.test(row.cbrDate)
                                  ? `${row.cbrDate.slice(6, 10)}-${row.cbrDate.slice(3, 5)}-${row.cbrDate.slice(0, 2)}`
                                  : '2026-11-02'
                              }
                              onChange={(e) => handleSaveDate(row.id, 'cbrDate', e.target.value)}
                              className="h-8 rounded-lg border border-blue-400 px-2 text-[12px] bg-white text-slate-800 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setEditingDateCell(null)}
                              className="text-slate-400 hover:text-slate-600 p-1"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingDateCell({ id: row.id, field: 'cbrDate' })}
                            className={cn(
                              'inline-flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-[12.5px] transition-colors',
                              row.cbrDate
                                ? 'text-slate-800 font-medium hover:bg-slate-100'
                                : 'text-slate-600 font-medium hover:bg-slate-100'
                            )}
                            title="Click to edit date"
                          >
                            <span>{row.cbrDate || 'Calender'}</span>
                          </button>
                        )}
                      </td>

                      {/* Counter Last Update */}
                      <td className="py-2 px-3 text-center border-r border-slate-200">
                        {editingDateCell?.id === row.id && editingDateCell.field === 'counterDate' ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="date"
                              defaultValue={
                                row.counterDate && /^\d{2}\.\d{2}\.\d{4}$/.test(row.counterDate)
                                  ? `${row.counterDate.slice(6, 10)}-${row.counterDate.slice(3, 5)}-${row.counterDate.slice(0, 2)}`
                                  : '2026-11-02'
                              }
                              onChange={(e) => handleSaveDate(row.id, 'counterDate', e.target.value)}
                              className="h-8 rounded-lg border border-blue-400 px-2 text-[12px] bg-white text-slate-800 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setEditingDateCell(null)}
                              className="text-slate-400 hover:text-slate-600 p-1"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingDateCell({ id: row.id, field: 'counterDate' })}
                            className={cn(
                              'inline-flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-[12.5px] transition-colors',
                              row.counterDate
                                ? 'text-slate-800 font-medium hover:bg-slate-100'
                                : 'text-slate-600 font-medium hover:bg-slate-100'
                            )}
                            title="Click to edit date"
                          >
                            <span>{row.counterDate || 'Calender'}</span>
                          </button>
                        )}
                      </td>

                      {/* Status / Remark Dropdown */}
                      <td className="py-2 px-3 text-center">
                        <select
                          value={row.status || 'Select'}
                          onChange={(e) => handleStatusChange(row.id, e.target.value)}
                          className={cn(
                            'w-full max-w-[230px] rounded-lg border py-1 px-2 text-[12px] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer',
                            row.status === 'Hamp Updated'
                              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                              : row.status === 'HAMP Not Open'
                                ? 'border-rose-200 bg-rose-50/70 text-rose-800'
                                : row.status === 'FR Wrong Feeding'
                                  ? 'border-orange-200 bg-orange-50/70 text-orange-800'
                                  : row.status === 'Counter Not Received'
                                    ? 'border-amber-200 bg-amber-50/70 text-amber-800'
                                    : row.status === 'Discussion Pending at FR End'
                                      ? 'border-blue-200 bg-blue-50/70 text-blue-800'
                                      : row.status === 'Manually can add by setup'
                                        ? 'border-purple-200 bg-purple-50/70 text-purple-800'
                                        : 'border-slate-200 bg-white text-slate-700'
                          )}
                        >
                          <option value="Select">Select</option>
                          {HAMP_STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & Count */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{filteredRows.length}</span> of{' '}
            <span className="font-semibold text-slate-800">{tabRows.length}</span> {activeTab} site records
          </div>
          <div className="flex items-center gap-2">
            <span>Tip: Click any date cell to update CBR or Counter timestamp.</span>
          </div>
        </div>
      </div>

      {/* ── Add Record Modal ────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-[#0066FF]" />
                <h3 className="text-base font-bold text-slate-900">
                  Add New {activeTab} Record
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    SPOC *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRowData.spoc}
                    onChange={(e) => setNewRowData({ ...newRowData, spoc: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-200 px-3 text-[12.5px] focus:border-[#0066FF] focus:outline-none"
                    placeholder="e.g. Harsh"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    {activeTab} ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRowData.atmId}
                    onChange={(e) => setNewRowData({ ...newRowData, atmId: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-200 px-3 text-[12.5px] uppercase font-mono focus:border-[#0066FF] focus:outline-none"
                    placeholder={activeTab === 'ATM' ? 'e.g. MPZ17001' : 'e.g. MCRM17001'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                  Franchisee Name *
                </label>
                <input
                  type="text"
                  required
                  value={newRowData.franchiseeName}
                  onChange={(e) => setNewRowData({ ...newRowData, franchiseeName: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-[12.5px] focus:border-[#0066FF] focus:outline-none"
                  placeholder="e.g. Guruprit Singh"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    {activeTab === 'ATM' ? 'CBR Last Update' : 'CBR Email Done'}
                  </label>
                  <input
                    type="text"
                    value={newRowData.cbrDate}
                    onChange={(e) => setNewRowData({ ...newRowData, cbrDate: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-200 px-3 text-[12.5px] focus:border-[#0066FF] focus:outline-none"
                    placeholder="DD.MM.YYYY"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    Counter Last Update
                  </label>
                  <input
                    type="text"
                    value={newRowData.counterDate}
                    onChange={(e) => setNewRowData({ ...newRowData, counterDate: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-200 px-3 text-[12.5px] focus:border-[#0066FF] focus:outline-none"
                    placeholder="DD.MM.YYYY"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                  {activeTab === 'ATM' ? 'HAMP Status' : 'Status / Remark'}
                </label>
                <select
                  value={newRowData.status}
                  onChange={(e) => setNewRowData({ ...newRowData, status: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-[12.5px] font-medium bg-white focus:border-[#0066FF] focus:outline-none"
                >
                  <option value="">Select (Select Status)</option>
                  {HAMP_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#0066FF] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#0052CC] shadow-sm transition-colors"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

