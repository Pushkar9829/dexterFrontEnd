import { useState, useMemo, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  Plus,
  Filter,
  Search,
  RotateCcw,
  Download,
  Building2,
  Layers,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  FileCheck,
  Eye,
  FileText,
  Clock,
  MapPin,
  ShieldCheck,
  Upload,
  ExternalLink,
  PanelsTopLeft,
  Store,
  Database,
  Tablet,
  ArrowLeft,
  CircleCheck,
  XCircle,
} from 'lucide-react'
import {
  TIERS,
  TIER_SLUG,
  TIER_TITLE,
  useFranchises,
  type Tier,
} from '@/data/franchises'
import { STATES } from '@/data/applications'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { dossierLink, useAddFranchise } from './FranchiseGrid'

// ── Hub ────────────────────────────────────────────────────────────────
interface FranchiseHubTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof Building2
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const HUB: FranchiseHubTileConfig[] = [
  {
    title: 'SUPER MASTER FRANCHISE',
    sub: 'Manage super master franchise network, tier records and regional operations.',
    to: '/franchise/super-master',
    Icon: Building2,
    theme: 'indigo',
    tag: 'Tier 1',
    badge: 'Regional Hub',
    actionText: 'Manage SMF',
  },
  {
    title: 'MASTER FRANCHISE',
    sub: 'Oversee master franchise tier registry, agreements and territory performance.',
    to: '/franchise/master',
    Icon: PanelsTopLeft,
    theme: 'purple',
    tag: 'Tier 2',
    badge: 'Territory',
    actionText: 'Manage MF',
  },
  {
    title: 'FRANCHISE',
    sub: 'View registered franchise operators, active sites and local partnerships.',
    to: '/franchise/franchise',
    Icon: Store,
    theme: 'teal',
    tag: 'Tier 3',
    badge: 'Units',
    actionText: 'Manage units',
  },
  {
    title: 'MASTER DATA',
    sub: 'Manage core reference data, ATM locations and linked entity configurations.',
    to: '/franchise/master-data',
    Icon: Database,
    theme: 'cyan',
    tag: 'Registry',
    badge: 'Master Core',
    actionText: 'View records',
  },
  {
    title: 'APNA APP',
    sub: 'Access field technician tools, telemetry feeds and operational controls.',
    to: '/franchise/apna-app',
    Icon: Tablet,
    theme: 'rose',
    tag: 'Field App',
    badge: 'Mobile Tools',
    actionText: 'Open tools',
  },
]

export function FranchiseHub() {
  return (
    <div className="max-w-[1020px]">
      <Link to="/onboarding" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0066FF] hover:underline">
        <ArrowLeft size={15} /> Back to Onboarding
      </Link>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900">Franchise Management</h1>
        <p className="mt-1 text-[13px] text-slate-500">Manage franchise tiers, master records, and operational applications in one place.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HUB.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}

// ── Registration: pick a tier ──────────────────────────────────────────
export function FranchiseRegistration() {
  const icons = [Building2, PanelsTopLeft, CircleCheck]
  return (
    <div>
      <h1 className="-mt-1 mb-[18px] text-[28.5px] font-semibold tracking-tight">Franchise Registration</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((t, i) => {
          const slug = Object.keys(TIER_SLUG).find((k) => TIER_SLUG[k] === t)
          const Icon = icons[i]
          return (
            <Link key={t} to={`/franchise/${slug}`} className="h-[202px] rounded-xl border border-line bg-white px-4 pt-3.5 transition-shadow hover:shadow-md">
              <div className="flex justify-between text-[12px] text-slate-500">
                Franchise Management <span className="text-[#0066FF]"><Icon size={18} /></span>
              </div>
              <div className="mt-1.5 text-[28px] font-semibold tracking-tight">{TIER_TITLE[t]}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">{TIER_TITLE[t]} · Full registry</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Status Tile Configuration matching EmployeeList ───────────────────
type StatusFilterKey = 'all' | 'Active' | 'Pending' | 'In review' | 'Inactive'

interface StatusTileConfig {
  key: StatusFilterKey
  label: string
  icon: ReactNode
  activeBg: string
  activeBorder: string
  activeBadge: string
  inactiveBg: string
  inactiveBorder: string
}

const STATUS_TILES: StatusTileConfig[] = [
  {
    key: 'all',
    label: 'All Units',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-[#DBEAFE] flex items-center justify-center shrink-0">
        <Building2 size={17} className="text-[#2563EB]" />
      </div>
    ),
    activeBg: 'bg-[#F8FAFF]',
    activeBorder: 'border-2 border-[#60A5FA] shadow-xs',
    activeBadge: 'bg-[#DBEAFE] text-[#1D4ED8]',
    inactiveBg: 'bg-[#F8FAFF]',
    inactiveBorder: 'border border-[#BFDBFE]/70 hover:border-[#93C5FD]',
  },
  {
    key: 'Active',
    label: 'Active',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] flex items-center justify-center gap-1 shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
      </div>
    ),
    activeBg: 'bg-[#F0FDF4]',
    activeBorder: 'border-2 border-emerald-500 shadow-xs',
    activeBadge: 'bg-[#DCFCE7] text-[#15803D]',
    inactiveBg: 'bg-[#F0FDF4]',
    inactiveBorder: 'border border-[#DCFCE7] hover:border-[#BBF7D0]',
  },
  {
    key: 'Pending',
    label: 'Pending KYC',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-[#FFEDD5] flex items-center justify-center shrink-0">
        <div className="w-5.5 h-5.5 rounded-full bg-[#F97316] flex items-center justify-center text-white shadow-2xs">
          <Clock size={12} strokeWidth={2.8} className="text-white" />
        </div>
      </div>
    ),
    activeBg: 'bg-[#FFF7ED]',
    activeBorder: 'border-2 border-orange-500 shadow-xs',
    activeBadge: 'bg-[#FFEDD5] text-[#C2410C]',
    inactiveBg: 'bg-[#FFF7ED]',
    inactiveBorder: 'border border-[#FFEDD5] hover:border-[#FED7AA]',
  },
  {
    key: 'In review',
    label: 'KYC In Review',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0">
        <ShieldCheck size={17} className="text-[#D97706]" />
      </div>
    ),
    activeBg: 'bg-[#FFFBEB]',
    activeBorder: 'border-2 border-amber-500 shadow-xs',
    activeBadge: 'bg-[#FEF3C7] text-[#B45309]',
    inactiveBg: 'bg-[#FFFBEB]',
    inactiveBorder: 'border border-[#FEF3C7] hover:border-[#FDE68A]',
  },
  {
    key: 'Inactive',
    label: 'Inactive',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] flex items-center justify-center shrink-0">
        <XCircle size={17} className="text-[#DC2626]" />
      </div>
    ),
    activeBg: 'bg-[#FEF2F2]',
    activeBorder: 'border-2 border-red-500 shadow-xs',
    activeBadge: 'bg-[#FEE2E2] text-[#B91C1C]',
    inactiveBg: 'bg-[#FEF2F2]',
    inactiveBorder: 'border border-[#FEE2E2] hover:border-[#FECDD3]',
  },
]

// ── Shared Modern Franchise List Page ─────────────────────────────────
function FranchiseListPage({ mode, currentTier }: { mode: 'tier' | 'master'; currentTier?: Tier }) {
  const navigate = useNavigate()
  const allFranchises = useFranchises()
  const add = useAddFranchise(currentTier)

  // Scope records to current tier if in tier mode
  const baseRecords = useMemo(() => {
    if (mode === 'tier' && currentTier) {
      return allFranchises.filter((f) => f.tier === currentTier)
    }
    return allFranchises
  }, [allFranchises, mode, currentTier])

  // Filter States
  const [tab, setTab] = useState<StatusFilterKey>('all')
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState(mode === 'tier' && currentTier ? currentTier : 'all')
  const [kycFilter, setKycFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Applied Filter states
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    state: 'all',
    tier: mode === 'tier' && currentTier ? currentTier : 'all',
    kyc: 'all',
    status: 'all',
  })

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)

  const handleSearch = () => {
    setAppliedFilters({
      search,
      state: stateFilter,
      tier: tierFilter,
      kyc: kycFilter,
      status: statusFilter,
    })
    setCurrentPage(1)
    toast('Filters applied to franchise records')
  }

  const handleReset = () => {
    setSearch('')
    setStateFilter('all')
    const defaultTier = mode === 'tier' && currentTier ? currentTier : 'all'
    setTierFilter(defaultTier)
    setKycFilter('all')
    setStatusFilter('all')
    setAppliedFilters({
      search: '',
      state: 'all',
      tier: defaultTier,
      kyc: 'all',
      status: 'all',
    })
    setTab('all')
    setCurrentPage(1)
    toast('Filters reset')
  }

  // Filter logic
  const filtered = useMemo(() => {
    return baseRecords.filter((f) => {
      // Tab filter
      if (tab === 'Active' && f.status !== 'Active') return false
      if (tab === 'Inactive' && f.status !== 'Inactive') return false
      if (tab === 'Pending' && f.kyc !== 'Pending') return false
      if (tab === 'In review' && f.kyc !== 'In review') return false

      // State filter
      if (appliedFilters.state !== 'all' && f.state !== appliedFilters.state) return false

      // Tier filter (for master data view)
      if (appliedFilters.tier !== 'all' && f.tier !== appliedFilters.tier) return false

      // KYC filter
      if (appliedFilters.kyc !== 'all' && f.kyc !== appliedFilters.kyc) return false

      // Status filter
      if (appliedFilters.status !== 'all' && f.status !== appliedFilters.status) return false

      // Search Query
      if (appliedFilters.search.trim()) {
        const q = appliedFilters.search.toLowerCase()
        const match =
          f.id.toLowerCase().includes(q) ||
          f.name.toLowerCase().includes(q) ||
          f.city.toLowerCase().includes(q) ||
          f.state.toLowerCase().includes(q) ||
          f.owner.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [baseRecords, tab, appliedFilters])

  // Pagination calculation
  const totalRecords = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // Export to CSV
  const handleExport = () => {
    if (filtered.length === 0) {
      toast('No records to export')
      return
    }

    const headers = ['Franchise ID', 'Franchise Name', 'Tier', 'State', 'City', 'ATMs', 'KYC Status', 'Status', 'Owner', 'Last Updated']
    const rows = filtered.map((f) => [
      f.id,
      f.name,
      f.tier,
      f.state,
      f.city,
      String(f.atms),
      f.kyc,
      f.status,
      f.owner,
      f.updatedAt,
    ])

    const filename = mode === 'master' ? 'franchise-master-data' : `franchise-${currentTier?.toLowerCase().replace(/\s+/g, '-')}`
    downloadCsv(`${filename}-${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`${filtered.length} franchise record(s) exported successfully`)
  }

  // Page title and subtitle
  const title = mode === 'master' ? 'Master Data' : TIER_TITLE[currentTier!]
  const lower = currentTier === 'Franchise' ? '' : `${currentTier?.toLowerCase()} `
  const sub =
    mode === 'master'
      ? 'Maintain your franchise network with one governed, editable source of truth.'
      : `View ${lower}franchise records from your governed franchise master data.`

  // Show "Add franchise" button only for Super Master and Master tiers
  // Explicitly hidden from:
  // - http://localhost:5310/franchise/master-data (mode === 'master')
  // - http://localhost:5310/franchise/franchise (currentTier === 'Franchise')
  const showAddButton = mode === 'tier' && currentTier !== 'Franchise'

  return (
    <div className="space-y-4 pb-12 max-w-[1500px]">
      {/* Breadcrumb matching EmployeeList pattern: Workspace > Onboarding > Franchise Management > [Page] */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/onboarding" className="hover:text-[#0066FF] transition-colors">
          Onboarding
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/franchise" className="hover:text-[#0066FF] transition-colors">
          Franchise Management
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">{title}</span>
      </div>

      {/* Page Title & Top Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
            {title}
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            {sub}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={add.openImport}
            className="inline-flex items-center gap-1.5 h-9.5 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Upload size={14} className="text-[#0066FF]" />
            <span>Import .xlsx</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-9.5 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Download size={14} className="text-[#0066FF]" />
            <span>Export CSV</span>
          </button>

          {showAddButton && (
            <button
              type="button"
              onClick={add.openAdd}
              className="inline-flex items-center gap-2 h-9.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Add franchise</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Tiles Row matching EmployeeList */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {STATUS_TILES.map((t) => {
          const count =
            t.key === 'all'
              ? baseRecords.length
              : t.key === 'Active'
                ? baseRecords.filter((f) => f.status === 'Active').length
                : t.key === 'Inactive'
                  ? baseRecords.filter((f) => f.status === 'Inactive').length
                  : t.key === 'Pending'
                    ? baseRecords.filter((f) => f.kyc === 'Pending').length
                    : baseRecords.filter((f) => f.kyc === 'In review').length

          const isActive = tab === t.key

          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setTab(t.key)
                setCurrentPage(1)
              }}
              className={`flex items-center justify-between gap-2.5 h-[52px] px-3.5 rounded-xl transition-all duration-150 cursor-pointer text-left ${isActive
                  ? `${t.activeBorder} ${t.activeBg}`
                  : `${t.inactiveBorder} ${t.inactiveBg}`
                }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {t.icon}
                <span className="text-[13px] font-bold text-[#1E1B4B] whitespace-nowrap">
                  {t.label}
                </span>
              </div>

              <span
                className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-lg text-[13px] font-bold shrink-0 transition-colors ${isActive
                    ? t.activeBadge
                    : 'bg-white shadow-2xs border border-slate-200/40 text-[#1E1B4B]'
                  }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filter Section matching EmployeeList pattern */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Filter size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Filter</h2>
            <p className="text-[12px] text-slate-500">
              Use below filters to search and manage franchise records.
            </p>
          </div>
        </div>

        {/* 5 Filter Controls in Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Search Query */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Search Franchise
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ID, Name, City, Owner..."
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>

          {/* 2. State */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              State
            </label>
            <div className="relative">
              <MapPin
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="all">All States</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* 3. Tier (enabled for master data, locked for tier list) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Franchise Tier
            </label>
            <div className="relative">
              <Building2
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={tierFilter}
                disabled={mode === 'tier'}
                onChange={(e) => setTierFilter(e.target.value as any)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="all">All Tiers</option>
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* 4. KYC Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              KYC Status
            </label>
            <div className="relative">
              <ShieldCheck
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="all">All KYC Status</option>
                <option value="Verified">Verified</option>
                <option value="Pending">Pending</option>
                <option value="In review">In review</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* 5. Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Status
            </label>
            <div className="relative">
              <Layers
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-4 pt-1">
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Search size={14} />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-all cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Download</span>
            <ChevronDown size={12} className="text-slate-400 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Table Records Card matching EmployeeList */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Layers size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
              {mode === 'master' ? 'Master Data Records' : `${title} Records`}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12px] text-slate-600 font-medium">
              Total Records: {totalRecords}
            </span>

            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-8 pl-3 pr-7 text-[12px] font-medium rounded-md border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-[11px] text-slate-700 border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#EEF4FC] text-slate-800 font-bold border-b border-slate-200 text-center">
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap w-12">
                  S.N.
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Franchise ID
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  Franchise Name
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Tier
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  State
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  City
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  ATMs
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  KYC Status
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Status
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-[#EEF4FC] shadow-[-2px_0_4px_rgba(0,0,0,0.03)] w-28">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors text-center"
                  >
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-500">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 font-semibold text-[#0066FF] whitespace-nowrap">
                      <button
                        onClick={() => navigate(dossierLink(item.id))}
                        className="hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                      >
                        {item.id}
                        <ExternalLink size={11} className="opacity-60" />
                      </button>
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-800 text-left whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-[#0066FF] font-bold text-[10px] flex items-center justify-center shrink-0">
                          {item.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-400">Owner: {item.owner}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {item.tier}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-700">
                      {item.state}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-700">
                      {item.city}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap font-semibold text-slate-800">
                      {item.atms}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      {item.kyc === 'Verified' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          Verified
                        </span>
                      ) : item.kyc === 'Pending' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-[#0066FF] border border-blue-200/60">
                          In review
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      {item.status === 'Active' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-700 border border-red-200/60">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-white group-hover:bg-blue-50/30 shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(dossierLink(item.id))}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#0066FF] bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                          title="View"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => navigate(`/finance/sd/${item.id}`)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                          title="View SD Management"
                        >
                          <FileText size={12} />
                          <span>SD</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                /* Empty state matching EmployeeList */
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-14 h-16 rounded-xl bg-[#EAF2FC] border border-[#CDE1F8] flex flex-col items-center justify-center shadow-xs mb-3 text-[#0066FF]">
                        <FileCheck size={30} strokeWidth={1.8} className="text-[#0066FF]" />
                      </div>

                      <h3 className="text-[15px] font-bold text-slate-900">No franchises found</h3>
                      <p className="text-[12px] text-slate-500 mt-1 max-w-[320px]">
                        Try adjusting your search criteria or filters to locate franchise records.
                      </p>

                      <div className="mt-4 flex items-center gap-2">
                        {showAddButton && (
                          <button
                            onClick={add.openAdd}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[11px] font-semibold transition-all shadow-xs cursor-pointer"
                          >
                            <Plus size={13} />
                            Add franchise
                          </button>
                        )}
                        <button
                          onClick={handleReset}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition-all cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination matching EmployeeList */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3 border-t border-slate-200 bg-white gap-3">
          <div className="text-[12px] text-slate-500">
            {totalRecords === 0
              ? 'Showing 0 to 0 of 0 records'
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                currentPage * pageSize,
                totalRecords
              )} of ${totalRecords} records`}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1 || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="First Page"
            >
              <ChevronsLeft size={13} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft size={13} />
            </button>

            <button className="w-7 h-7 rounded bg-[#0066FF] text-white text-[12px] font-semibold flex items-center justify-center shadow-xs">
              {currentPage}
            </button>

            {totalPages > 1 && currentPage < totalPages && (
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-7 h-7 rounded border border-slate-200 text-slate-700 text-[12px] font-medium flex items-center justify-center hover:bg-slate-50 cursor-pointer"
              >
                {currentPage + 1}
              </button>
            )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight size={13} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Last Page"
            >
              <ChevronsRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Form / Wizard Modal */}
      {add.ui}
    </div>
  )
}

// ── Tier list (Super Master / Master / Franchise) ──────────────────────
export function TierList() {
  const { tier: slug = '' } = useParams()
  const tier = TIER_SLUG[slug]
  if (!tier) return <Navigate to="/franchise/registration" replace />

  return <FranchiseListPage key={tier} mode="tier" currentTier={tier} />
}

// ── Master data (all tiers) ────────────────────────────────────────────
export function MasterData() {
  return <FranchiseListPage mode="master" />
}
