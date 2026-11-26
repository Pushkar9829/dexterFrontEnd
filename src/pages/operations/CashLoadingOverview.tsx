import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  Download,
  Search,
  Plus,
  X,
  ArrowLeft,
  Banknote,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Layers,
  SlidersHorizontal,
  RotateCcw,
  Eye,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
} from 'lucide-react'
import {
  cashLoadingOverviewStore,
  updateOverviewRow,
  addOverviewRow,
  SF_MACHINE_TYPES,
  SF_STATUS_OPTIONS,
  type SfMachineType,
} from '@/data/cashLoadingOverview'
import {
  useCashLoadingRegister,
  exportCashLoadingRegisterCsv,
} from '@/data/cashLoadingRegisterStore'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'
import { resolveSite, franchiseNameOf } from '@/lib/siteRef'
import { cn } from '@/lib/cn'

const formatINR = (n: number | undefined) => {
  if (n === undefined || isNaN(n)) return '—'
  return '₹ ' + n.toLocaleString('en-IN')
}

export default function CashLoadingOverview() {
  // ── Top Tab Switcher: 'register' (Overview of Register) vs 'sf-checklist' (SF Site Verification) ──
  const [activeTab, setActiveTab] = useState<'register' | 'sf-checklist'>('register')

  // ──────────────────────────────────────────────────────────────────────────
  // 1. DATA FROM CASH LOADING REGISTER STORE
  // ──────────────────────────────────────────────────────────────────────────
  const { records: registerRecords } = useCashLoadingRegister()

  // Register Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [atmFilter, setAtmFilter] = useState('ALL')
  const [varianceFilter, setVarianceFilter] = useState<'ALL' | 'VARIANCE_ONLY' | 'BALANCED_ONLY'>('ALL')
  const [dateFilter, setDateFilter] = useState('ALL')

  // Register Pagination
  const [pageSize, setPageSize] = useState(15)
  const [currentPage, setCurrentPage] = useState(1)

  // ATM Options
  const atmOptions = useMemo(() => {
    const list = registerRecords.map((r) => r.atmId).filter(Boolean)
    return ['ALL', ...Array.from(new Set(list)).sort()]
  }, [registerRecords])

  // Date Options
  const dateOptions = useMemo(() => {
    const list = registerRecords.map((r) => r.date).filter(Boolean)
    return ['ALL', ...Array.from(new Set(list))]
  }, [registerRecords])

  // Filtered Register Records
  const filteredRegisterRecords = useMemo(() => {
    return registerRecords.filter((r) => {
      if (atmFilter !== 'ALL' && r.atmId !== atmFilter) return false
      if (dateFilter !== 'ALL' && r.date !== dateFilter) return false
      const hasVariance = r.overage > 0 || r.shortage > 0 || r.purgeBin > 0 || r.closingBalance !== r.switchBalance
      if (varianceFilter === 'VARIANCE_ONLY' && !hasVariance) return false
      if (varianceFilter === 'BALANCED_ONLY' && hasVariance) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchAtm = r.atmId.toLowerCase().includes(q)
        const matchIndent = r.indentNo.toLowerCase().includes(q)
        const matchMf = r.mfName.toLowerCase().includes(q)
        const matchRemarks = r.remarks.toLowerCase().includes(q)
        if (!matchAtm && !matchIndent && !matchMf && !matchRemarks) return false
      }
      return true
    })
  }, [registerRecords, atmFilter, dateFilter, varianceFilter, searchQuery])

  // Executive Totals & KPIs calculated from Register
  const metrics = useMemo(() => {
    const totalLoading = registerRecords.reduce((s, r) => s + (r.loading || 0), 0)
    const totalDispense = registerRecords.reduce((s, r) => s + (r.dispense || 0), 0)
    const totalPhysical = registerRecords.reduce((s, r) => s + (r.physicalCash || 0), 0)
    const totalClosing = registerRecords.reduce((s, r) => s + (r.closingBalance || 0), 0)
    const totalOpening = registerRecords.reduce((s, r) => s + (r.openingBalance || 0), 0)
    const totalPurge = registerRecords.reduce((s, r) => s + (r.purgeBin || 0), 0)
    const totalOverage = registerRecords.reduce((s, r) => s + (r.overage || 0), 0)
    const totalShortage = registerRecords.reduce((s, r) => s + (r.shortage || 0), 0)

    const varianceCount = registerRecords.filter(
      (r) => r.overage > 0 || r.shortage > 0 || r.purgeBin > 0 || r.closingBalance !== r.switchBalance,
    ).length

    const balancedCount = registerRecords.length - varianceCount
    const avgLoad = registerRecords.length > 0 ? Math.round(totalLoading / registerRecords.length) : 0

    return {
      totalLoading,
      totalDispense,
      totalPhysical,
      totalClosing,
      totalOpening,
      totalPurge,
      totalOverage,
      totalShortage,
      varianceCount,
      balancedCount,
      avgLoad,
      totalCycles: registerRecords.length,
    }
  }, [registerRecords])

  // Register Pagination slices
  const totalRegisterRows = filteredRegisterRecords.length
  const totalRegisterPages = Math.max(1, Math.ceil(totalRegisterRows / pageSize))
  const safePage = Math.min(currentPage, totalRegisterPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalRegisterRows)
  const paginatedRegisterRecords = filteredRegisterRecords.slice(startIndex, endIndex)

  const handleResetRegisterFilters = () => {
    setSearchQuery('')
    setAtmFilter('ALL')
    setDateFilter('ALL')
    setVarianceFilter('ALL')
    setCurrentPage(1)
    toast('Filters reset to default', 'info')
  }

  const handleExportRegisterCsv = () => {
    exportCashLoadingRegisterCsv(
      filteredRegisterRecords,
      `cash-loading-register-overview-${new Date().toISOString().slice(0, 10)}`,
    )
    toast('Exported Cash Loading Register Overview to CSV', 'success')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. DATA FROM SF OVERVIEW CHECKLIST STORE (Preserved Tab)
  // ──────────────────────────────────────────────────────────────────────────
  const sfRows = cashLoadingOverviewStore.use()
  const [selectedDate, setSelectedDate] = useState('2026-11-03')
  const [sfSearch, setSfSearch] = useState('')
  const [machineFilter, setMachineFilter] = useState<'ALL' | SfMachineType>('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

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

  const filteredSfRows = useMemo(() => {
    return sfRows.filter((r) => {
      if (machineFilter !== 'ALL' && r.machineType !== machineFilter) return false
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'EMPTY' && r.status) return false
        if (statusFilter !== 'EMPTY' && r.status !== statusFilter) return false
      }
      if (sfSearch.trim()) {
        const q = sfSearch.toLowerCase()
        const matchAtm = r.atmId.toLowerCase().includes(q)
        const matchFr = r.franchiseeName.toLowerCase().includes(q)
        const matchSpoc = r.spoc.toLowerCase().includes(q)
        const matchMachine = r.machineType.toLowerCase().includes(q)
        const matchStatus = (r.status || '').toLowerCase().includes(q)
        if (!matchAtm && !matchFr && !matchSpoc && !matchMachine && !matchStatus) return false
      }
      return true
    })
  }, [sfRows, sfSearch, machineFilter, statusFilter])

  const handleExportSfCsv = () => {
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
    const dataRows = filteredSfRows.map((r) => [
      String(r.sn),
      r.spoc,
      r.machineType,
      r.atmId,
      r.franchiseeName,
      r.cbrDate,
      r.counterDate,
      r.status || 'Select',
    ])
    downloadCsv(`Cash_Loading_SF_Checklist_${selectedDate}`, headers, dataRows)
    toast('Exported SF Checklist to CSV', 'success')
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRowData.atmId.trim()) {
      toast('Please enter ATM ID', 'error')
      return
    }
    const site = resolveSite(newRowData.atmId)
    if (!site) {
      toast(`ATM / Site "${newRowData.atmId.trim()}" was not found in the Site Master`, 'error')
      return
    }
    addOverviewRow({
      siteId: site.siteId,
      spoc: newRowData.spoc,
      machineType: newRowData.machineType,
      atmId: site.atmId,
      franchiseeName: newRowData.franchiseeName.trim() || franchiseNameOf(site),
      cbrDate: newRowData.cbrDate,
      counterDate: newRowData.counterDate,
      status: newRowData.status,
      date: selectedDate,
    })
    toast('Added new Cash Loading record to SF Checklist', 'success')
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

  return (
    <div className="w-full min-w-0 pb-16 font-sans space-y-5">
      {/* ── Breadcrumb Navigation ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-slate-500">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-[#0066FF] hover:text-[#0052CC] transition-colors"
            title="Home"
          >
            <Home size={14} className="text-slate-400" />
            <span>Workspace</span>
          </Link>
          <ChevronRight size={12} className="text-slate-400" />
          <Link to="/operations" className="hover:text-slate-800 transition-colors">
            Operations
          </Link>
          <ChevronRight size={12} className="text-slate-400" />
          <Link to="/operations/cash-loading" className="hover:text-slate-800 transition-colors">
            Cash Loading
          </Link>
          <ChevronRight size={12} className="text-slate-400" />
          <span className="font-semibold text-slate-900">Overview</span>
        </nav>

        <Link
          to="/operations/cash-loading"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Cash Loading Hub</span>
        </Link>
      </div>

      {/* ── Page Header Banner + Top Switcher + Action Buttons ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#0066FF] flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Banknote size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight mt-0.5">
              Cash Loading Register Overview
            </h1>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Consolidated replenishment metrics, terminal vault balances, dispense totals, and register overview.
            </p>
          </div>
        </div>

        {/* Tab Switcher & Quick Navigation */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Two-Tab Switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50/70 p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold transition-all cursor-pointer',
                activeTab === 'register'
                  ? 'bg-[#0066FF] text-white shadow-xs'
                  : 'text-[#0066FF] hover:bg-white/80',
              )}
            >
              <LayoutGrid size={14} />
              <span>Register Overview</span>
            </button>
          </div>

          {/* Action to open the full Register */}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: REGISTER OVERVIEW & ANALYTICS                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'register' && (
        <div className="space-y-5">
          {/* ── 1. Top Executive Metric Cards Grid (5 Cards) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Total Cash Loaded */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-blue-600 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Total Cash Loaded</span>
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Banknote size={15} />
                </div>
              </div>
              <div className="text-[21px] font-black tracking-tight text-slate-900 leading-tight">
                {formatINR(metrics.totalLoading)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 font-medium">
                Across {metrics.totalCycles} verified loading cycles
              </div>
            </div>

            {/* 2. Customer Dispense */}
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/70 via-white to-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-amber-600 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Total Dispensed</span>
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                  <ArrowUpRight size={15} />
                </div>
              </div>
              <div className="text-[21px] font-black tracking-tight text-slate-900 leading-tight">
                {formatINR(metrics.totalDispense)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 font-medium">
                Customer ATM cash withdrawals
              </div>
            </div>

            {/* 3. Physical Cash Before Loading */}
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-600 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Physical Cash Verified</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 size={15} />
                </div>
              </div>
              <div className="text-[21px] font-black tracking-tight text-slate-900 leading-tight">
                {formatINR(metrics.totalPhysical)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 font-medium">
                Counted in machine before replenishment
              </div>
            </div>

            {/* 4. Terminal Closing Balance */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-indigo-600 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Net Closing Balance</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Layers size={15} />
                </div>
              </div>
              <div className="text-[21px] font-black tracking-tight text-slate-900 leading-tight">
                {formatINR(metrics.totalClosing)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 font-medium">
                Current total terminal vault cash
              </div>
            </div>

            {/* 5. Reconciliation & Discrepancies */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-600 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Reconciliation Health</span>
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center',
                  metrics.varianceCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                )}>
                  {metrics.varianceCount > 0 ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                </div>
              </div>
              <div className="text-[21px] font-black tracking-tight text-slate-900 leading-tight">
                {metrics.balancedCount} / {metrics.totalCycles}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 font-medium">
                {metrics.varianceCount > 0
                  ? `${metrics.varianceCount} record(s) flagged with variance`
                  : 'All switch balances verified 100%'}
              </div>
            </div>
          </div>

          {/* ── 2. Cash Flow Dynamics & Audit Summary Banner ── */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-[#0066FF]" />
                <h3 className="text-[14px] font-bold text-slate-900">
                  Register Cash Flow Dynamics &amp; Audit Equation
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Audit Equation: [Opening + Loading - Dispense + Overage - Shortage - Purge = Closing]
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Initial Opening</div>
                <div className="text-[16px] font-bold text-slate-800 mt-0.5">{formatINR(metrics.totalOpening)}</div>
                <div className="text-[10.5px] text-slate-400 mt-0.5">Aggregate opening vault cash</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100">
                <div className="text-[11px] font-semibold text-[#0066FF] uppercase">+ Fresh Cash Loading</div>
                <div className="text-[16px] font-bold text-[#0066FF] mt-0.5">{formatINR(metrics.totalLoading)}</div>
                <div className="text-[10.5px] text-blue-500 mt-0.5">Average: {formatINR(metrics.avgLoad)} / cycle</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100">
                <div className="text-[11px] font-semibold text-amber-700 uppercase">- ATM Cash Dispense</div>
                <div className="text-[16px] font-bold text-amber-700 mt-0.5">{formatINR(metrics.totalDispense)}</div>
                <div className="text-[10.5px] text-amber-600 mt-0.5">Total customer cash out</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <div className="text-[11px] font-semibold text-emerald-700 uppercase">= Terminal Closing Vault</div>
                <div className="text-[16px] font-bold text-emerald-700 mt-0.5">{formatINR(metrics.totalClosing)}</div>
                <div className="text-[10.5px] text-emerald-600 mt-0.5">
                  Purge bin: {formatINR(metrics.totalPurge)} · Net overage: {formatINR(metrics.totalOverage)}
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. Filters & Search Bar for Register Overview ── */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-end gap-3.5 justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                {/* Search */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Search Register
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setCurrentPage(1)
                      }}
                      placeholder="Search ATM ID, Indent, MF..."
                      className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>

                {/* ATM Filter */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">ATM ID</label>
                  <select
                    value={atmFilter}
                    onChange={(e) => {
                      setAtmFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] cursor-pointer"
                  >
                    <option value="ALL">All ATM Terminals</option>
                    {atmOptions.filter((a) => a !== 'ALL').map((atm) => (
                      <option key={atm} value={atm}>{atm}</option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] cursor-pointer"
                  >
                    <option value="ALL">All Recorded Dates</option>
                    {dateOptions.filter((d) => d !== 'ALL').map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Discrepancy / Variance Filter */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Audit Status</label>
                  <select
                    value={varianceFilter}
                    onChange={(e) => {
                      setVarianceFilter(e.target.value as any)
                      setCurrentPage(1)
                    }}
                    className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] cursor-pointer"
                  >
                    <option value="ALL">All Loading Entries</option>
                    <option value="VARIANCE_ONLY">Flagged Discrepancies Only</option>
                    <option value="BALANCED_ONLY">Balanced &amp; Matched Only</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start lg:self-end pt-1">
                <button
                  type="button"
                  onClick={handleExportRegisterCsv}
                  className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-colors shadow-2xs cursor-pointer"
                >
                  <Download size={13} className="text-[#0066FF]" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetRegisterFilters}
                  className="inline-flex items-center gap-1.5 h-8.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-colors shadow-2xs cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── 4. Consolidated Cash Loading Register Overview Table ── */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Table Header */}
            <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <LayoutGrid size={16} />
                </div>
                <div>
                  <h3 className="text-[14.5px] font-bold text-slate-900 leading-tight">
                    Consolidated Register Loading Transactions
                  </h3>
                  <p className="text-[11.5px] text-slate-500">
                    Direct overview from Cash Loading Register database
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[12.5px] text-slate-600 font-medium">
                  Total Records: <strong className="text-slate-900 font-bold">{totalRegisterRows}</strong>
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="h-8 px-2.5 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-700 font-medium outline-none focus:border-[#0066FF] cursor-pointer"
                >
                  <option value={10}>10 per page</option>
                  <option value={15}>15 per page</option>
                  <option value={30}>30 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left min-w-[1300px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3 text-center w-[55px]">S.N.</th>
                    <th className="py-3 px-3 text-center w-[105px]">Date &amp; Time</th>
                    <th className="py-3 px-3 text-center w-[110px]">ATM ID</th>
                    <th className="py-3 px-3 text-left w-[130px]">Indent No</th>
                    <th className="py-3 px-3 text-left w-[150px]">MF / Franchise</th>
                    <th className="py-3 px-3 text-right w-[125px]">Opening (₹)</th>
                    <th className="py-3 px-3 text-right w-[115px]">Dispense (₹)</th>
                    <th className="py-3 px-3 text-right w-[130px] text-[#0066FF] bg-blue-50/50">Cash Loaded (₹)</th>
                    <th className="py-3 px-3 text-right w-[120px]">Physical (₹)</th>
                    <th className="py-3 px-3 text-right w-[125px]">Closing (₹)</th>
                    <th className="py-3 px-3 text-right w-[125px]">Switch (₹)</th>
                    <th className="py-3 px-3 text-center w-[130px]">Status</th>
                    <th className="py-3 px-3 text-center w-[85px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[12px] text-slate-800">
                  {paginatedRegisterRecords.length > 0 ? (
                    paginatedRegisterRecords.map((r, idx) => {
                      const sn = startIndex + idx + 1
                      const isBalanced = r.closingBalance === r.switchBalance && r.overage === 0 && r.shortage === 0
                      const hasOverage = r.overage > 0
                      const hasShortage = r.shortage > 0

                      return (
                        <tr key={r.no} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-500">
                            {sn}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-medium whitespace-nowrap">
                            <div>{r.date}</div>
                            <div className="text-[10px] text-slate-400">{r.eodTime}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-[#0066FF]">
                            {r.atmId}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                            {r.indentNo}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 truncate max-w-[150px]" title={r.mfName}>
                            {r.mfName}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                            {r.openingBalance.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-amber-700">
                            {r.dispense.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#0066FF] bg-blue-50/30">
                            {r.loading.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                            {r.physicalCash.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {r.closingBalance.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                            {r.switchBalance.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {hasOverage ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold">
                                +{r.overage.toLocaleString('en-IN')} Overage
                              </span>
                            ) : hasShortage ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 text-[10.5px] font-bold">
                                -{r.shortage.toLocaleString('en-IN')} Shortage
                              </span>
                            ) : isBalanced ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-medium">
                                Balanced
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10.5px] font-bold">
                                Flagged
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Link
                              to={`/operations/cash-loading/register`}
                              className="p-1 rounded-md text-[#0066FF] hover:bg-blue-100/70 transition-colors inline-flex items-center justify-center"
                              title="View in Register"
                            >
                              <Eye size={14} />
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={13} className="py-8 text-center text-slate-400">
                        No cash loading records found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 text-[12px] text-slate-600 bg-white">
              <div>
                Showing <strong className="text-slate-900 font-semibold">{totalRegisterRows > 0 ? startIndex + 1 : 1}</strong> to{' '}
                <strong className="text-slate-900 font-semibold">{totalRegisterRows > 0 ? endIndex : 0}</strong> of{' '}
                <strong className="text-slate-900 font-semibold">{totalRegisterRows}</strong> records
              </div>

              <div className="flex items-center gap-1 self-center sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage === 1}
                  className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="First page"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalRegisterPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalRegisterPages || Math.abs(p - safePage) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1]
                    const isGap = prev && p - prev > 1
                    return (
                      <span key={p} className="flex items-center">
                        {isGap && <span className="px-1 text-slate-400">…</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`min-w-8 h-8 px-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${safePage === p
                            ? 'bg-[#0066FF] text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                          {p}
                        </button>
                      </span>
                    )
                  })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalRegisterPages, p + 1))}
                  disabled={safePage === totalRegisterPages || totalRegisterRows === 0}
                  className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Next page"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalRegisterPages)}
                  disabled={safePage === totalRegisterPages || totalRegisterRows === 0}
                  className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Last page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: SELF-FUNDING (SF) CBR & COUNTER VERIFICATION CHECKLIST       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'sf-checklist' && (
        <div className="space-y-4">
          {/* Top toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-[#FACC15] text-[#713F12] font-black text-[13px] border border-yellow-400 shadow-xs">
                SF
              </div>
              <div>
                <h3 className="text-[14.5px] font-bold text-slate-900 leading-tight">
                  Self Funding (SF) CBR &amp; Counter Verification
                </h3>
                <p className="text-[11.5px] text-slate-500">
                  Track machine types, CBR last updates, and franchisee counter clearance statuses.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[12px] font-medium text-slate-700 outline-none focus:border-[#0066FF] cursor-pointer"
                title="Filter by report date"
              />
              <button
                type="button"
                onClick={handleExportSfCsv}
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

          {/* Filter Bar for SF */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={sfSearch}
                onChange={(e) => setSfSearch(e.target.value)}
                placeholder="Search ATM ID, SPOC, Franchisee..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:border-[#0066FF] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={machineFilter}
                onChange={(e) => setMachineFilter(e.target.value as any)}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[12px] font-medium text-slate-700 outline-none focus:border-[#0066FF]"
              >
                <option value="ALL">All Machines</option>
                {SF_MACHINE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[12px] font-medium text-slate-700 outline-none focus:border-[#0066FF]"
              >
                <option value="ALL">All Statuses</option>
                <option value="EMPTY">Pending / Select</option>
                {SF_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SF Checklist Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left min-w-[1050px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3 text-center w-[55px]">S.N.</th>
                    <th className="py-3 px-3 w-[110px]">SPOC</th>
                    <th className="py-3 px-3 w-[120px]">Machine Type</th>
                    <th className="py-3 px-3 text-center w-[120px]">ATM ID</th>
                    <th className="py-3 px-3 w-[180px]">Franchisee Name</th>
                    <th className="py-3 px-3 text-center w-[130px]">CBR Last Update</th>
                    <th className="py-3 px-3 text-center w-[140px]">Counter Last Update</th>
                    <th className="py-3 px-3 w-[220px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[12px] text-slate-800">
                  {filteredSfRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-500">{r.sn}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{r.spoc}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{r.machineType}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-[#0066FF]">{r.atmId}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{r.franchiseeName}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-[11.5px]">{r.cbrDate}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-[11.5px]">{r.counterDate}</td>
                      <td className="py-2.5 px-3">
                        <select
                          value={r.status || ''}
                          onChange={(e) => {
                            updateOverviewRow(r.id, { status: e.target.value })
                            toast('Updated status', 'info')
                          }}
                          className={cn(
                            'h-8 w-full rounded-lg border px-2.5 text-[11.5px] font-semibold outline-none cursor-pointer',
                            r.status === 'Email Done'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : r.status === 'Discussion Pending at FR End'
                                ? 'border-red-200 bg-red-50 text-red-800'
                                : r.status === 'Counter Not Received'
                                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                                  : 'border-slate-200 bg-white text-slate-700',
                          )}
                        >
                          <option value="">Select (Select Status)</option>
                          {SF_STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Record Modal (for SF checklist) ── */}
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
                    onChange={(e) => {
                      const site = resolveSite(e.target.value)
                      setNewRowData({ ...newRowData, atmId: e.target.value, ...(site ? { franchiseeName: franchiseNameOf(site) } : {}) })
                    }}
                    className="w-full h-9 rounded-lg border border-slate-200 px-3 text-[12.5px] uppercase font-mono focus:border-[#0066FF] focus:outline-none"
                    placeholder="Site Master ATM ID or Site ID"
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
