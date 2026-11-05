import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  Calendar,
  Download,
  Search,
  Filter,
  Plus,
  AlertCircle,
  X,
  ArrowLeft,
  Building2,
} from 'lucide-react'
import {
  cashLoadingOverviewStore,
  updateOverviewRow,
  addOverviewRow,
  SF_MACHINE_TYPES,
  SF_STATUS_OPTIONS,
  type SfMachineType,
} from '@/data/cashLoadingOverview'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

export default function CashLoadingOverview() {
  const rows = cashLoadingOverviewStore.use()

  // Selected date in header
  const [selectedDate, setSelectedDate] = useState('2026-11-03')

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [machineFilter, setMachineFilter] = useState<'ALL' | SfMachineType>('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Editing dates inline
  const [editingDateCell, setEditingDateCell] = useState<{ id: string; field: 'cbrDate' | 'counterDate' } | null>(null)

  // Add Record Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newRowData, setNewRowData] = useState({
    spoc: 'Harsh',
    machineType: 'NCR' as SfMachineType,
    atmId: '',
    franchiseeName: '',
    cbrDate: '02.11.2026',
    counterDate: '02.11.2026',
    status: '',
    date: '2026-11-03',
  })

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (machineFilter !== 'ALL' && r.machineType !== machineFilter) return false
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'EMPTY' && r.status) return false
        if (statusFilter !== 'EMPTY' && r.status !== statusFilter) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchAtm = r.atmId.toLowerCase().includes(q)
        const matchFr = r.franchiseeName.toLowerCase().includes(q)
        const matchSpoc = r.spoc.toLowerCase().includes(q)
        const matchMachine = r.machineType.toLowerCase().includes(q)
        const matchStatus = (r.status || '').toLowerCase().includes(q)
        if (!matchAtm && !matchFr && !matchSpoc && !matchMachine && !matchStatus) return false
      }
      return true
    })
  }, [rows, searchQuery, machineFilter, statusFilter])

  // Statistics
  const totalCount = rows.length
  const emailDoneCount = rows.filter((r) => r.status === 'Email Done').length
  const pendingCount = rows.filter(
    (r) =>
      r.status === 'Discussion Pending at FR End' ||
      r.status === 'Counter Not Received' ||
      r.status === 'FR Wrong Feeding' ||
      r.status === 'Email Not Done but CBR Updated'
  ).length

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'S.N.',
      'SPOC',
      'Machine Type',
      'ATM ID',
      'Franchisee Name',
      'CBR Last Update',
      'Counter Last Update',
      'Status',
    ]
    const dataRows = filteredRows.map((r) => [
      String(r.sn),
      r.spoc,
      r.machineType,
      r.atmId,
      r.franchiseeName,
      r.cbrDate,
      r.counterDate,
      r.status || 'Select',
    ])
    downloadCsv(`Cash_Loading_Overview_SF_${selectedDate}`, headers, dataRows)
    toast('Exported Cash Loading Overview to CSV', 'success')
  }

  // Update Status
  const handleStatusChange = (id: string, newStatus: string) => {
    updateOverviewRow(id, { status: newStatus === 'Select' ? '' : newStatus })
    toast('Status updated', 'info')
  }

  // Update Machine Type
  const handleMachineTypeChange = (id: string, newType: SfMachineType) => {
    updateOverviewRow(id, { machineType: newType })
    toast('Machine Type updated', 'info')
  }

  // Save inline date
  const handleSaveDate = (id: string, field: 'cbrDate' | 'counterDate', rawDate: string) => {
    let formatted = rawDate
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [y, m, d] = rawDate.split('-')
      formatted = `${d}.${m}.${y}`
    }
    updateOverviewRow(id, { [field]: formatted })
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
    addOverviewRow({
      spoc: newRowData.spoc,
      machineType: newRowData.machineType,
      atmId: newRowData.atmId.trim().toUpperCase(),
      franchiseeName: newRowData.franchiseeName.trim(),
      cbrDate: newRowData.cbrDate,
      counterDate: newRowData.counterDate,
      status: newRowData.status,
      date: selectedDate,
    })
    toast('Added new Cash Loading Overview record', 'success')
    setShowAddModal(false)
    setNewRowData({
      spoc: 'Harsh',
      machineType: 'NCR',
      atmId: '',
      franchiseeName: '',
      cbrDate: '02.11.2026',
      counterDate: '02.11.2026',
      status: '',
      date: '2026-11-03',
    })
  }

  // Format YYYY-MM-DD to DD-MM-YYYY
  const formattedHeaderDate = useMemo(() => {
    if (!selectedDate) return '03-11-2026'
    if (/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m, d] = selectedDate.split('-')
      return `${d}-${m}-${y}`
    }
    return selectedDate
  }, [selectedDate])

  return (
    <div className="space-y-4 pb-16 font-sans max-w-[1440px] mx-auto min-w-0">
      {/* ── 1. Top Breadcrumbs ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          <Link to="/operations/cash-loading" className="hover:text-[#1E293B] transition-colors">
            Cash Loading Register
          </Link>
          <ChevronRight size={13} className="shrink-0 text-[#94A3B8]" />
          <span className="font-semibold text-[#0F172A]">Overview</span>
        </nav>

        {/* Back Link */}
        <Link
          to="/operations/cash-loading"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Cash Loading Hub</span>
        </Link>
      </div>

      {/* ── 2. Top Header matching image reference ────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Left: SF Badge, System Generated Report tag, and title */}
        <div className="flex items-start sm:items-center gap-3.5">
          {/* Yellow SF Badge */}
          <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg bg-[#FACC15] text-[#713F12] font-black text-[15px] border border-yellow-400 shadow-xs tracking-wider">
            SF
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                System Generated Report
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] mt-0.5">
              Cash Loading Overview
            </h1>
            <p className="text-[12.5px] text-[#64748B]">
              Daily machine type, CBR update, and counter status across Self Funding (SF) sites.
            </p>
          </div>
        </div>

        {/* Right: Date Badge (03-11-2026) in Deep Navy Blue */}
        <div className="flex items-center gap-2.5">
          <label
            htmlFor="sf-date-picker"
            className="flex items-center gap-2 rounded-xl bg-[#0B2546] px-4 py-2 text-[13px] font-bold text-white shadow-sm cursor-pointer hover:bg-[#133560] transition-colors"
            title="Click to change report date"
          >
            <Calendar size={15} className="text-blue-300 shrink-0" />
            <span>{formattedHeaderDate}</span>
          </label>
          <input
            id="sf-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="sr-only"
          />

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <Download size={14} className="text-[#0066FF]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0066FF] px-3.5 text-[12px] font-semibold text-white shadow-xs hover:bg-[#0052CC] transition-colors"
          >
            <Plus size={14} />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {/* ── 3. Filters & Search Bar ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ATM ID, SPOC, Franchisee..."
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

        {/* Dropdown Filters & KPI chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Machine Type Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[12px] text-slate-700 shadow-2xs">
            <Building2 size={13} className="text-[#0066FF]" />
            <span className="font-medium text-slate-500">Machine:</span>
            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value as 'ALL' | SfMachineType)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none text-[12px]"
            >
              <option value="ALL">All Machines</option>
              {SF_MACHINE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[12px] text-slate-700 shadow-2xs">
            <Filter size={13} className="text-[#0066FF]" />
            <span className="font-medium text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none text-[12px]"
            >
              <option value="ALL">All Statuses ({rows.length})</option>
              <option value="Email Done">Email Done ({emailDoneCount})</option>
              <option value="Email Not Done but CBR Updated">Email Not Done but CBR Updated</option>
              <option value="FR Wrong Feeding">FR Wrong Feeding</option>
              <option value="Counter Not Received">Counter Not Received</option>
              <option value="Discussion Pending at FR End">Discussion Pending</option>
              <option value="Manually can add by setup">Manual Setup</option>
              <option value="EMPTY">Unselected</option>
            </select>
          </div>

          {/* KPI Chips */}
          <div className="hidden lg:flex items-center gap-2 text-[11.5px]">
            <span className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 font-semibold text-blue-700">
              Total Sites: {totalCount}
            </span>
            <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-semibold text-emerald-700">
              Email Done: {emailDoneCount}
            </span>
            <span className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 font-semibold text-amber-700">
              Action Pending: {pendingCount}
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. Main Data Table matching screenshot ────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
        {/* Table Container */}
        <div className="overflow-x-auto rounded-xl border border-[#0B2546]/30 shadow-xs">
          <table className="w-full min-w-[1040px] border-collapse text-[13px]">
            {/* Deep Navy Blue Header Row */}
            <thead>
              <tr className="bg-[#0B2546] text-white">
                <th className="py-3 px-3 text-center font-bold uppercase tracking-wider text-[12px] border-r border-[#153A68] w-14">
                  S.N.
                </th>
                <th className="py-3 px-3 text-center font-bold uppercase tracking-wider text-[12px] border-r border-[#153A68] w-24">
                  SPOC
                </th>
                <th className="py-3 px-3 text-center font-bold uppercase tracking-wider text-[12px] border-r border-[#153A68] w-28">
                  Machine Type
                </th>
                <th className="py-3 px-3 text-center font-bold uppercase tracking-wider text-[12px] border-r border-[#153A68] w-36">
                  ATM ID
                </th>
                <th className="py-3 px-4 text-center font-bold uppercase tracking-wider text-[12px] border-r border-[#153A68]">
                  Franchisee Name
                </th>
                <th className="py-3 px-3 text-center font-bold uppercase tracking-wider text-[12px] border-r border-[#153A68] w-40">
                  CBR Last Update
                </th>
                <th className="py-3 px-3 text-center font-bold uppercase tracking-wider text-[12px] border-r border-[#153A68] w-40">
                  Counter Last Update
                </th>
                <th className="py-3 px-3 text-center font-bold uppercase tracking-wider text-[12px] w-64">
                  Status
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No matching records found</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">Try adjusting your search query or filters</p>
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

                      {/* Machine Type */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        <select
                          value={row.machineType}
                          onChange={(e) => handleMachineTypeChange(row.id, e.target.value as SfMachineType)}
                          className={cn(
                            'rounded-md border px-2 py-0.5 text-[11.5px] font-bold focus:outline-none cursor-pointer',
                            row.machineType === 'NCR'
                              ? 'border-blue-200 bg-blue-50/80 text-blue-700'
                              : row.machineType === 'Perto'
                                ? 'border-purple-200 bg-purple-50/80 text-purple-700'
                                : 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
                          )}
                        >
                          {SF_MACHINE_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* ATM ID */}
                      <td className="py-2.5 px-3 text-center font-semibold font-mono text-slate-800 border-r border-slate-200">
                        {row.atmId}
                      </td>

                      {/* Franchisee Name */}
                      <td className="py-2.5 px-4 text-center text-slate-800 font-medium border-r border-slate-200">
                        {row.franchiseeName}
                      </td>

                      {/* CBR Last Update */}
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
                            className="inline-flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-[12.5px] text-slate-800 font-medium hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Click to edit CBR date"
                          >
                            <span>{row.cbrDate}</span>
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
                            className="inline-flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-[12.5px] text-slate-800 font-medium hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Click to edit counter date"
                          >
                            <span>{row.counterDate}</span>
                          </button>
                        )}
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-2 px-3 text-center">
                        <select
                          value={row.status || 'Select'}
                          onChange={(e) => handleStatusChange(row.id, e.target.value)}
                          className={cn(
                            'w-full max-w-[240px] rounded-lg border py-1 px-2 text-[12px] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer',
                            row.status === 'Email Done'
                              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                              : row.status === 'Email Not Done but CBR Updated'
                                ? 'border-cyan-200 bg-cyan-50/70 text-cyan-800'
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
                          {SF_STATUS_OPTIONS.map((opt) => (
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
            <span className="font-semibold text-slate-800">{rows.length}</span> Self Funding (SF) site records
          </div>
          <div className="flex items-center gap-3">
            <span>Tip: Click any CBR or Counter date cell to change timestamp.</span>
          </div>
        </div>
      </div>

      {/* ── 5. Add Record Modal ───────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-[#0066FF]" />
                <h3 className="text-base font-bold text-slate-900">Add New Overview Record (SF)</h3>
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
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">SPOC *</label>
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
                    Machine Type *
                  </label>
                  <select
                    value={newRowData.machineType}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, machineType: e.target.value as SfMachineType })
                    }
                    className="w-full h-9 rounded-lg border border-slate-200 px-3 text-[12.5px] font-medium bg-white focus:border-[#0066FF] focus:outline-none"
                  >
                    {SF_MACHINE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">ATM ID *</label>
                  <input
                    type="text"
                    required
                    value={newRowData.atmId}
                    onChange={(e) => setNewRowData({ ...newRowData, atmId: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-200 px-3 text-[12.5px] uppercase font-mono focus:border-[#0066FF] focus:outline-none"
                    placeholder="e.g. MPZ28000"
                  />
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    CBR Last Update
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
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={newRowData.status}
                  onChange={(e) => setNewRowData({ ...newRowData, status: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-[12.5px] font-medium bg-white focus:border-[#0066FF] focus:outline-none"
                >
                  <option value="">Select (Select Status)</option>
                  {SF_STATUS_OPTIONS.map((opt) => (
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