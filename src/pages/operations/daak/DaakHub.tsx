import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Home,
  Landmark,
  Link2,
  Lock,
  Mail,
  MapPin,
  Package,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  useDaakState,
  addIncomingDak,
  addOutgoingDak,
  linkChequeToDak,
  type DakRecord,
  type ChequeRecord,
  type CourierService,
  type DocumentCategory,
  type DakDirection,
} from '@/data/daakData'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'

type MainTab = 'dashboard' | 'branch' | 'register' | 'cheques'
type RegisterSubView =
  | 'all'
  | 'received'
  | 'sent'
  | 'cheques'
  | 'unlinked'
  | 'linked'
  | 'pending'

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'Security Cheque',
  'Franchise Agreement (Stamp Paper)',
  'KYC Dossier (PAN, Aadhaar, Bank Details)',
  'NOC & Bank Solvency Certificate',
  'Affidavit & Indemnity Bond',
  'ATM Key Handover Memo',
  'Cash Loading Register physical copy',
  'Welcome Kit & ATM Dongle',
  'Termination & Legal Notice',
  'Other Commercial Papers',
]

const COURIER_OPTIONS: CourierService[] = [
  'BlueDart',
  'DTDC',
  'Speed Post',
  'Trackon',
  'Professional Couriers',
  'Hand Delivery',
]

export default function DaakHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const daakState = useDaakState()

  // Active Tab
  const activeTab = (searchParams.get('tab') as MainTab) || 'dashboard'
  const setTab = (tab: MainTab) => {
    setSearchParams((prev) => {
      prev.set('tab', tab)
      return prev
    })
  }

  // Register Sub-View
  const [registerView, setRegisterView] = useState<RegisterSubView>('all')

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [filterCourier, setFilterCourier] = useState('')
  const [filterDirection, setFilterDirection] = useState<'all' | DakDirection>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // Modals state
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false)
  const [isOutgoingModalOpen, setIsOutgoingModalOpen] = useState(false)
  const [linkingDakRecord, setLinkingDakRecord] = useState<DakRecord | null>(null)
  const [viewingDak, setViewingDak] = useState<DakRecord | null>(null)
  const [viewingCheque, setViewingCheque] = useState<ChequeRecord | null>(null)
  const [viewingPod, setViewingPod] = useState<{ title: string; filename: string; type: string } | null>(null)

  // ----------------------------------------------------
  // Calculated Metrics
  // ----------------------------------------------------
  const incomingCount = useMemo(
    () => daakState.records.filter((r) => r.direction === 'Incoming').length,
    [daakState.records]
  )
  const outgoingCount = useMemo(
    () => daakState.records.filter((r) => r.direction === 'Outgoing').length,
    [daakState.records]
  )
  const pendingHandoverCount = useMemo(
    () =>
      daakState.records.filter(
        (r) =>
          r.hasCheques &&
          r.status !== 'Discrepancy' &&
          r.custodianHandover?.status !== 'Vault Locked'
      ).length,
    [daakState.records]
  )
  const unclosedCount = useMemo(
    () => daakState.records.filter((r) => r.status === 'In Transit' || r.status === 'Dispatched').length,
    [daakState.records]
  )
  const chequesAwaitingReceipt = useMemo(
    () => daakState.cheques.filter((c) => c.verificationStatus === 'Awaiting Receipt').length,
    [daakState.cheques]
  )
  const chequesReceivedInCustody = useMemo(
    () =>
      daakState.cheques.filter(
        (c) => c.verificationStatus === 'Verified' || c.verificationStatus === 'Under Custody'
      ).length,
    [daakState.cheques]
  )
  const chequesDepositedLocked = useMemo(
    () => daakState.cheques.filter((c) => c.verificationStatus === 'Deposited').length,
    [daakState.cheques]
  )
  const totalChequeValue = useMemo(
    () => daakState.cheques.reduce((sum, c) => sum + c.amount, 0),
    [daakState.cheques]
  )
  const dakWithChequesCount = useMemo(
    () => daakState.records.filter((r) => r.hasCheques).length,
    [daakState.records]
  )
  const discrepancyCount = useMemo(
    () =>
      daakState.records.filter((r) => r.status === 'Discrepancy').length +
      daakState.cheques.filter((c) => c.verificationStatus === 'Discrepancy').length,
    [daakState.records, daakState.cheques]
  )

  // ----------------------------------------------------
  // Filtered Register Records
  // ----------------------------------------------------
  const filteredRecords = useMemo(() => {
    return daakState.records.filter((rec) => {
      // Sub-view filter
      if (registerView === 'received' && rec.direction !== 'Incoming') return false
      if (registerView === 'sent' && rec.direction !== 'Outgoing') return false
      if (registerView === 'cheques' && !rec.hasCheques) return false
      if (registerView === 'unlinked' && (!rec.hasCheques || rec.isLinked)) return false
      if (registerView === 'linked' && !rec.isLinked) return false
      if (registerView === 'pending' && rec.status !== 'Pending Review' && rec.status !== 'Discrepancy') return false

      // Toolbar filters
      if (filterDirection !== 'all' && rec.direction !== filterDirection) return false
      if (filterBranch && rec.branch !== filterBranch) return false
      if (filterCourier && rec.courierType !== filterCourier) return false
      if (filterDateFrom && rec.date < filterDateFrom) return false
      if (filterDateTo && rec.date > filterDateTo) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesId = rec.id.toLowerCase().includes(q)
        const matchesDocket = rec.docketNumber.toLowerCase().includes(q)
        const matchesParty = rec.partyName.toLowerCase().includes(q)
        const matchesDept = rec.internalDepartment.toLowerCase().includes(q)
        const matchesDoc = rec.documents.some((d) => d.description.toLowerCase().includes(q))
        if (!matchesId && !matchesDocket && !matchesParty && !matchesDept && !matchesDoc) {
          return false
        }
      }

      return true
    })
  }, [
    daakState.records,
    registerView,
    filterDirection,
    filterBranch,
    filterCourier,
    filterDateFrom,
    filterDateTo,
    searchQuery,
  ])

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('')
    setFilterBranch('')
    setFilterCourier('')
    setFilterDirection('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setRegisterView('all')
    toast('Filters have been reset', 'info')
  }

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'S.No',
      'Dak ID',
      'Direction',
      'Date',
      'Time',
      'Branch',
      'Party',
      'Docket Number',
      'Courier',
      'Department / Handled By',
      'Total Documents',
      'Has Cheques',
      'Linked Cheque IDs',
      'Status',
    ]

    const rows = filteredRecords.map((r, idx) => [
      String(idx + 1),
      r.id,
      r.direction,
      r.date,
      r.time,
      r.branch,
      r.partyName,
      r.docketNumber,
      r.courierType,
      `${r.internalDepartment} (${r.handledByStaff})`,
      String(r.documents.length),
      r.hasCheques ? `Yes (${r.chequeCount})` : 'No',
      r.linkedCheques.map((c) => c.chequeId).join(', ') || 'N/A',
      r.status,
    ])

    downloadCsv(`daak_register_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast('Exported Dak Register to CSV', 'success')
  }

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 pb-16 font-sans">
      {/* Breadcrumb Trail */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
        <Link to="/dashboard" className="flex items-center gap-1 hover:text-primary transition-colors">
          <Home size={13} />
          <span>Home</span>
        </Link>
        <ChevronRight size={13} />
        <Link to="/operations" className="hover:text-primary transition-colors">
          Operations
        </Link>
        <ChevronRight size={13} />
        <span className="font-semibold text-ink">Daak Management</span>
      </div>

      {/* Header Bar */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-sky-100 bg-gradient-to-r from-blue-50/70 via-white to-sky-50/60 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-blue-500/20">
            <Mail size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-ink">Daak & Cheque Management</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Live Register
              </span>
            </div>
            <p className="mt-1 text-[13px] text-muted">
              Integrated postal dispatch, incoming document itemization, cheque verification custody, and branch tracking.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsIncomingModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <ArrowDownLeft size={16} />
            <span>New Dak (Incoming)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsOutgoingModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors"
          >
            <ArrowUpRight size={16} />
            <span>New Dak (Outgoing)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const unlinked = daakState.records.find((r) => r.hasCheques && !r.isLinked)
              if (unlinked) {
                setLinkingDakRecord(unlinked)
              } else {
                toast('All cheque consignments are currently linked!', 'info')
                setTab('register')
                setRegisterView('cheques')
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-[13px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Link2 size={16} />
            <span>Cheque Linking Studio</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Download size={15} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setTab('dashboard')}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all',
            activeTab === 'dashboard'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
          )}
        >
          <ShieldCheck size={16} />
          <span>Combined Operations Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('branch')}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all',
            activeTab === 'branch'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
          )}
        >
          <Building2 size={16} />
          <span>Branch-wise Integrated Dashboard</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px]',
              activeTab === 'branch' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {daakState.branches.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab('register')}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all',
            activeTab === 'register'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
          )}
        >
          <FileText size={16} />
          <span>Dak Register & Document Views</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px]',
              activeTab === 'register' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {daakState.records.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab('cheques')}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all',
            activeTab === 'cheques'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
          )}
        >
          <Landmark size={16} />
          <span>Cross-Module (Cheque Team)</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px]',
              activeTab === 'cheques' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
            )}
          >
            {daakState.cheques.length} Cheques
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: COMBINED OPERATIONS DASHBOARD */}
      {/* ============================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top Row: Dak Life-Cycle Metrics */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                1. Daily Dak Metrics (Physical Parcels & Letters)
              </h2>
              <span className="text-[12px] text-muted">Real-time inward / outward counter</span>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Incoming */}
              <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-emerald-800">Incoming (Inward)</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <ArrowDownLeft size={16} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">{incomingCount}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                  <span>Received Today: 14</span>
                  <span className="font-medium text-emerald-600">100% Inspected</span>
                </div>
              </div>

              {/* Outgoing */}
              <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-primary">Outgoing (Outward)</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-primary">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">{outgoingCount}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                  <span>Dispatched: 9</span>
                  <span className="font-medium text-blue-600">Active Airway Bills</span>
                </div>
              </div>

              {/* Pending Handover */}
              <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/50 to-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-amber-800">Pending Handover</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <Clock size={16} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-amber-900">{pendingHandoverCount}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                  <span>Awaiting Vault Transfer</span>
                  <span className="font-semibold text-amber-700">SLA: &lt;4 hrs</span>
                </div>
              </div>

              {/* Unclosed / In-Transit */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-slate-700">Unclosed / In-Transit</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Package size={16} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">{unclosedCount}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                  <span>Awaiting Carrier POD</span>
                  <span className="font-medium text-slate-600">SpeedPost / BlueDart</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row: Cheques & Cross-Module Linking Metrics */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                2. Cheques & Linked Records (FFM Integration)
              </h2>
              <span className="text-[12px] text-muted">
                Total Instrument Value: ₹ {(totalChequeValue / 100000).toFixed(1)} Lakhs • Locked: {chequesDepositedLocked}
              </span>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Cheques In Custody */}
              <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-indigo-900">Cheques In Custody</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <Landmark size={16} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-indigo-950">{chequesReceivedInCustody}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                  <span>Physical in Safe/Vault</span>
                  <span className="font-semibold text-indigo-700">Verified</span>
                </div>
              </div>

              {/* Awaiting Receipt */}
              <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/50 to-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-sky-800">Awaiting Receipt</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <CreditCard size={16} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">{chequesAwaitingReceipt}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                  <span>Declared in Transit</span>
                  <span className="font-medium text-sky-700">Inbound Courier</span>
                </div>
              </div>

              {/* Dak With Cheques */}
              <div className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/50 to-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-teal-800">Dak With Cheques</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                    <Link2 size={16} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-teal-950">{dakWithChequesCount}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                  <span>Cheque Included = YES</span>
                  <span className="font-medium text-teal-700">Linked to FFM</span>
                </div>
              </div>

              {/* Discrepancies */}
              <div className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50/60 to-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-rose-800">Discrepancies Flagged</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                    <AlertTriangle size={16} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-rose-900">{discrepancyCount}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                  <span>Amount / Count Mismatch</span>
                  <span className="font-semibold text-rose-700">Investigation Open</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Grid: Quick Action Hub & Discrepancy Alert Board */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Quick Actions Panel */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-ink">Operational Workflows</h3>
              <p className="mt-1 text-[12px] text-muted">Direct short-cuts for daily floor desk operations.</p>
              <div className="mt-4 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setIsIncomingModalOpen(true)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <ArrowDownLeft size={18} />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-ink">Record Incoming Parcel</div>
                      <div className="text-[11px] text-muted">Itemize contents & check for cheques</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOutgoingModalOpen(true)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-primary">
                      <ArrowUpRight size={18} />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-ink">Dispatch Outgoing Dak</div>
                      <div className="text-[11px] text-muted">Log recipient, docket & booking slip</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTab('register')
                    setRegisterView('cheques')
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                      <Landmark size={18} />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-ink">Review Cheque Documents</div>
                      <div className="text-[11px] text-muted">Verify physical instruments in vault</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Discrepancy & Alert Feed */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-5 shadow-xs lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={18} className="text-rose-600" />
                  <h3 className="text-sm font-bold text-rose-900">Active Discrepancy & Custodian Alert Feed</h3>
                </div>
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                  {daakState.records.filter((r) => r.status === 'Discrepancy' || r.status === 'Pending Review').length} Action Items
                </span>
              </div>
              <p className="mt-1 text-[12px] text-rose-700">
                Consignments flagged for content mismatch, missing cheque instruments, or overdue vault handover.
              </p>

              <div className="mt-4 space-y-2.5">
                {daakState.records
                  .filter((r) => r.status === 'Discrepancy' || r.status === 'Pending Review')
                  .map((rec) => (
                    <div
                      key={rec.id}
                      className="flex flex-col gap-2 rounded-lg border border-rose-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px] font-bold text-primary">{rec.id}</span>
                          <span
                            className={cn(
                              'rounded px-2 py-0.5 text-[10px] font-semibold',
                              rec.status === 'Discrepancy'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            )}
                          >
                            {rec.status}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Docket: {rec.docketNumber} ({rec.courierType})
                          </span>
                        </div>
                        <div className="mt-1 text-[12px] font-medium text-ink">
                          {rec.partyName} — {rec.branch}
                        </div>
                        {rec.discrepancyNote && (
                          <div className="mt-0.5 text-[11px] text-rose-700">
                            <strong>Note:</strong> {rec.discrepancyNote}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingDak(rec)}
                          className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-100"
                        >
                          View Dak
                        </button>
                        {rec.hasCheques && !rec.isLinked && (
                          <button
                            type="button"
                            onClick={() => setLinkingDakRecord(rec)}
                            className="rounded-md bg-indigo-600 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-indigo-700"
                          >
                            Resolve / Link
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: BRANCH-WISE INTEGRATED DASHBOARD */}
      {/* ============================================================== */}
      {activeTab === 'branch' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-ink">Regional Hub & Branch-wise Integrated Metrics</h2>
              <p className="mt-1 text-[13px] text-muted">
                Monitor physical dak inward/outward volumes, incoming cheque instruments, and branch discrepancies.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted">Active Branches:</span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-bold text-ink">
                {daakState.branches.length} Nodes
              </span>
            </div>
          </div>

          {/* Branch Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {daakState.branches.map((b) => (
              <div
                key={b.branchName}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-primary/50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-primary">
                        <MapPin size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-ink">{b.branchName}</h3>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                        b.health === 'Optimal'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.health === 'Warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      )}
                    >
                      {b.health}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-3 text-center">
                    <div>
                      <div className="text-[11px] font-medium text-slate-500">Inward Today</div>
                      <div className="text-lg font-bold text-emerald-700">{b.inwardToday}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-slate-500">Outward Today</div>
                      <div className="text-lg font-bold text-primary">{b.outwardToday}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-slate-500">Cheques Received</div>
                      <div className="text-lg font-bold text-indigo-700">{b.chequesReceived}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-slate-500">Discrepancies</div>
                      <div
                        className={cn(
                          'text-lg font-bold',
                          b.discrepancies > 0 ? 'text-rose-600' : 'text-slate-400'
                        )}
                      >
                        {b.discrepancies}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
                    <span>Pending Vault Handover:</span>
                    <span className="font-semibold text-amber-700">{b.pendingHandover} parcels</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                    <span>Avg Turnaround SLA:</span>
                    <span className="font-semibold text-slate-700">{b.avgTurnaround}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterBranch(b.branchName)
                      setTab('register')
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-2 text-[12px] font-semibold text-slate-700 hover:border-primary hover:bg-blue-50 hover:text-primary transition-colors"
                  >
                    <span>View Branch Register</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: DAK REGISTER & DOCUMENT-SPECIFIC VIEWS */}
      {/* ============================================================== */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Sub-view Filter Pills (Document-Specific Views) */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
            <span className="px-2 text-[12px] font-semibold text-slate-500">Quick Views:</span>
            {[
              { id: 'all', label: 'All Dak', count: daakState.records.length },
              {
                id: 'received',
                label: 'Documents Received',
                count: daakState.records.filter((r) => r.direction === 'Incoming').length,
              },
              {
                id: 'sent',
                label: 'Documents Sent',
                count: daakState.records.filter((r) => r.direction === 'Outgoing').length,
              },
              {
                id: 'cheques',
                label: 'Cheque Documents',
                count: daakState.records.filter((r) => r.hasCheques).length,
              },
              {
                id: 'unlinked',
                label: 'Unlinked Documents',
                count: daakState.records.filter((r) => r.hasCheques && !r.isLinked).length,
              },
              {
                id: 'linked',
                label: 'Linked Documents',
                count: daakState.records.filter((r) => r.isLinked).length,
              },
              {
                id: 'pending',
                label: 'Pending Review',
                count: daakState.records.filter((r) => r.status === 'Pending Review' || r.status === 'Discrepancy').length,
              },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setRegisterView(v.id as RegisterSubView)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors',
                  registerView === v.id
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
                )}
              >
                <span>{v.label}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px]',
                    registerView === v.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {v.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Advanced Filter Toolbar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {/* Search text */}
              <div className="lg:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">Search Records</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Dak ID, Docket, Party, Contents..."
                    className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-[12px] placeholder:text-slate-400 focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Branch Filter */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">Branch / Hub</label>
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-[12px] text-slate-700 focus:border-primary focus:outline-hidden"
                >
                  <option value="">All Branches</option>
                  {daakState.branches.map((b) => (
                    <option key={b.branchName} value={b.branchName}>
                      {b.branchName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Courier Filter */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">Courier Provider</label>
                <select
                  value={filterCourier}
                  onChange={(e) => setFilterCourier(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-[12px] text-slate-700 focus:border-primary focus:outline-hidden"
                >
                  <option value="">All Couriers</option>
                  {COURIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Direction */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">Direction</label>
                <select
                  value={filterDirection}
                  onChange={(e) => setFilterDirection(e.target.value as 'all' | DakDirection)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-[12px] text-slate-700 focus:border-primary focus:outline-hidden"
                >
                  <option value="all">Inward & Outward</option>
                  <option value="Incoming">Incoming (Inward)</option>
                  <option value="Outgoing">Outgoing (Outward)</option>
                </select>
              </div>

              {/* Reset Button */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <RefreshCw size={13} />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          </div>

          {/* Master Register Data Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-ink">Dak Register Records</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-primary">
                  {filteredRecords.length} Records
                </span>
              </div>
              <div className="text-[12px] text-muted">Sorted by receipt / dispatch timestamp (latest first)</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-3">S.N.</th>
                    <th className="py-3 px-3">Dak ID & Date</th>
                    <th className="py-3 px-3">Direction</th>
                    <th className="py-3 px-3">From / To (Party)</th>
                    <th className="py-3 px-3">Branch & Dept</th>
                    <th className="py-3 px-3">Docket No. & Courier</th>
                    <th className="py-3 px-3">Documents in Dak</th>
                    <th className="py-3 px-3">Cheque Status</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <Package size={24} />
                        </div>
                        <p className="mt-2 text-sm font-medium text-ink">No Dak records found</p>
                        <p className="text-[12px] text-muted">Try adjusting your filters or search keywords.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-medium text-slate-500">{rec.sn}</td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => setViewingDak(rec)}
                            className="font-mono text-[12px] font-bold text-primary hover:underline"
                          >
                            {rec.id}
                          </button>
                          <div className="flex items-center gap-1 text-[11px] text-muted">
                            <Calendar size={11} /> {rec.date} {rec.time}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                              rec.direction === 'Incoming'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            )}
                          >
                            {rec.direction === 'Incoming' ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                            {rec.direction}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-ink">{rec.partyName}</div>
                          <div className="line-clamp-1 text-[11px] text-muted max-w-[200px]">
                            {rec.senderRecipientAddress}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">{rec.branch}</div>
                          <div className="text-[11px] text-slate-500">{rec.internalDepartment}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-medium text-slate-800">{rec.docketNumber}</div>
                          <span className="inline-block rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                            {rec.courierType}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-ink">{rec.documents.length} Items</span>
                            <span className="text-[11px] text-muted">
                              ({rec.documents.reduce((acc, d) => acc + d.count, 0)} pages/files)
                            </span>
                          </div>
                          <div className="line-clamp-1 text-[11px] text-slate-500 max-w-[180px]">
                            {rec.documents.map((d) => d.category).join(', ')}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {rec.hasCheques ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                                <CreditCard size={11} />
                                {rec.chequeCount} Cheque{rec.chequeCount > 1 ? 's' : ''}
                              </span>
                              <div>
                                {rec.isLinked ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                                    <CheckCircle2 size={11} /> Linked to FFM
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setLinkingDakRecord(rec)}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:underline"
                                  >
                                    <Link2 size={11} /> Link Now
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">— No cheques —</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                              rec.status === 'Received' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                              rec.status === 'Handed Over' && 'bg-teal-50 text-teal-700 border border-teal-200',
                              rec.status === 'Dispatched' && 'bg-blue-50 text-blue-700 border border-blue-200',
                              rec.status === 'In Transit' && 'bg-sky-50 text-sky-700 border border-sky-200',
                              rec.status === 'Pending Review' && 'bg-amber-50 text-amber-800 border border-amber-200',
                              rec.status === 'Discrepancy' && 'bg-rose-50 text-rose-800 border border-rose-200'
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingDak(rec)}
                              title="View Dak Contents & POD"
                              className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:border-primary hover:bg-blue-50 hover:text-primary transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                            {rec.podAttachment && (
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingPod({
                                    title: `POD Slip - ${rec.docketNumber}`,
                                    filename: rec.podAttachment!.name,
                                    type: rec.podAttachment!.type,
                                  })
                                }
                                title="View Courier POD Attachment"
                                className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                              >
                                <Paperclip size={14} />
                              </button>
                            )}
                            {rec.hasCheques && !rec.isLinked && (
                              <button
                                type="button"
                                onClick={() => setLinkingDakRecord(rec)}
                                title="Link Cheques"
                                className="rounded-md bg-indigo-50 border border-indigo-200 p-1.5 text-indigo-700 hover:bg-indigo-100 transition-colors"
                              >
                                <Link2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: CROSS-MODULE SCREENS (CHEQUE TEAM) */}
      {/* ============================================================== */}
      {activeTab === 'cheques' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/60 p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <Landmark size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink">Cheque Team & FFM Cross-Module Master Registry</h2>
                <p className="mt-0.5 text-[12px] text-muted">
                  Every cheque record maintains a direct, auditable linkage back to its originating physical Dak consignment and POD receipt.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-slate-600">Total Registered Cheques:</span>
              <span className="rounded-md bg-indigo-100 px-2.5 py-0.5 text-[12px] font-bold text-indigo-900">
                {daakState.cheques.length}
              </span>
            </div>
          </div>

          {/* Cheques Master Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-3">Cheque ID</th>
                    <th className="py-3 px-3">Cheque No. & Date</th>
                    <th className="py-3 px-3">Party & Franchisee ID</th>
                    <th className="py-3 px-3">Bank & Branch</th>
                    <th className="py-3 px-3">Amount (₹)</th>
                    <th className="py-3 px-3">Verification & Custodian</th>
                    <th className="py-3 px-3">Originating Dak Link</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {daakState.cheques.map((c) => (
                    <tr key={c.chequeId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => setViewingCheque(c)}
                          className="font-mono text-[12px] font-bold text-indigo-700 hover:underline"
                        >
                          {c.chequeId}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-ink">#{c.chequeNumber}</div>
                        <div className="text-[11px] text-slate-500">{c.chequeDate}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-ink">{c.partyName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{c.franchiseeId}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{c.bankName}</div>
                        <div className="text-[11px] text-slate-500">{c.branchName}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-slate-900">
                          ₹ {c.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            c.verificationStatus === 'Verified' && 'bg-emerald-100 text-emerald-800',
                            c.verificationStatus === 'Under Custody' && 'bg-indigo-100 text-indigo-800',
                            c.verificationStatus === 'Deposited' && 'bg-blue-100 text-blue-800',
                            c.verificationStatus === 'Awaiting Receipt' && 'bg-amber-100 text-amber-800',
                            c.verificationStatus === 'Discrepancy' && 'bg-rose-100 text-rose-800'
                          )}
                        >
                          {c.verificationStatus}
                        </span>
                        <div className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">{c.custodian}</div>
                      </td>
                      <td className="py-3 px-3">
                        {/* Prominent Link Back to Originating Dak */}
                        <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-2 text-[11px]">
                          <div className="flex items-center gap-1 font-semibold text-primary">
                            <Mail size={12} />
                            <span>Dak: {c.originatingDakId}</span>
                          </div>
                          <div className="text-[10px] text-slate-600">
                            Docket: {c.originatingDocket} ({c.courier})
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const sourceDak = daakState.records.find((r) => r.id === c.originatingDakId)
                              if (sourceDak) setViewingDak(sourceDak)
                            }}
                            className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-bold text-primary hover:underline"
                          >
                            <span>Open Origin Dak Dossier</span>
                            <ExternalLink size={10} />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setViewingCheque(c)}
                          className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          <Eye size={12} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: NEW INCOMING DAK CONTENT ENTRY SCREEN */}
      {/* ============================================================== */}
      {isIncomingModalOpen && (
        <IncomingDakModal
          onClose={() => setIsIncomingModalOpen(false)}
          onSuccess={(newRecord) => {
            setIsIncomingModalOpen(false)
            toast(`Incoming Dak ${newRecord.id} recorded successfully!`, 'success')
            if (newRecord.hasCheques) {
              setLinkingDakRecord(newRecord)
            }
          }}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL 2: NEW OUTGOING DAK DISPATCH SCREEN */}
      {/* ============================================================== */}
      {isOutgoingModalOpen && (
        <OutgoingDakModal
          onClose={() => setIsOutgoingModalOpen(false)}
          onSuccess={(newRecord) => {
            setIsOutgoingModalOpen(false)
            toast(`Outgoing Dak ${newRecord.id} dispatched!`, 'success')
          }}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CHEQUE LINKING SCREEN */}
      {/* ============================================================== */}
      {linkingDakRecord && (
        <ChequeLinkingModal
          dak={linkingDakRecord}
          onClose={() => setLinkingDakRecord(null)}
          onSuccess={({ cheque }) => {
            setLinkingDakRecord(null)
            toast(`Cheque #${cheque.chequeNumber} linked to Dak ${linkingDakRecord.id}!`, 'success')
            setTab('cheques')
          }}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL 4: DAK DETAILS & ITEMIZATION INSPECTION VIEW */}
      {/* ============================================================== */}
      {viewingDak && (
        <DakDetailModal
          dak={viewingDak}
          onClose={() => setViewingDak(null)}
          onLinkCheques={() => {
            const current = viewingDak
            setViewingDak(null)
            setLinkingDakRecord(current)
          }}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL 5: CROSS-MODULE CHEQUE DETAILS VIEW */}
      {/* ============================================================== */}
      {viewingCheque && (
        <ChequeDetailModal
          cheque={viewingCheque}
          onClose={() => setViewingCheque(null)}
          onViewDak={(dakId) => {
            const match = daakState.records.find((r) => r.id === dakId)
            if (match) {
              setViewingCheque(null)
              setViewingDak(match)
            }
          }}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL 6: POD / ENVELOPE ATTACHMENT PREVIEW */}
      {/* ============================================================== */}
      {viewingPod && (
        <Modal
          title={viewingPod.title}
          onClose={() => setViewingPod(null)}
          width={520}
        >
          <div className="p-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FileCheck size={40} />
            </div>
            <h4 className="mt-3 text-sm font-bold text-ink">{viewingPod.filename}</h4>
            <p className="mt-1 text-[12px] text-muted">
              Document Format: {viewingPod.type} • Digitally verified carrier receipt
            </p>
            <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <span className="text-[12px] text-slate-500">
                [Proof of Delivery / Consignment Envelope Preview]
              </span>
              <div className="mt-2 text-[11px] text-slate-400">
                Courier Tracking verified with automated barcode scan & physical receiver sign-off.
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingPod(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-[12px] font-semibold text-white hover:bg-slate-900"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ====================================================================
// SUB-COMPONENT: INCOMING DAK DETAILS & CONTENT ENTRY MODAL
// ====================================================================
function IncomingDakModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: (rec: DakRecord) => void
}) {
  const [branch, setBranch] = useState('Delhi Central Hub')
  const [partyName, setPartyName] = useState('')
  const [senderAddress, setSenderAddress] = useState('')
  const [senderPhone, setSenderPhone] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [internalDepartment, setInternalDepartment] = useState('Cheque Clearing Team')
  const [handledByStaff, setHandledByStaff] = useState('Pooja Verma')
  const [docketNumber, setDocketNumber] = useState('')
  const [courierType, setCourierType] = useState<CourierService>('BlueDart')
  const [remarks, setRemarks] = useState('')

  // Documents in this Dak
  const [docItems, setDocItems] = useState<
    Array<{
      category: DocumentCategory
      description: string
      count: number
      chequeIncluded: boolean
    }>
  >([
    {
      category: 'Security Cheque',
      description: 'Physical Bank Cheque',
      count: 1,
      chequeIncluded: true,
    },
  ])

  const [hasPodUpload, setHasPodUpload] = useState(false)
  const [podFileName, setPodFileName] = useState('')

  const handleAddDocItem = () => {
    setDocItems((prev) => [
      ...prev,
      {
        category: 'Franchise Agreement (Stamp Paper)',
        description: '',
        count: 1,
        chequeIncluded: false,
      },
    ])
  }

  const handleRemoveDocItem = (index: number) => {
    setDocItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDocChange = (
    index: number,
    field: 'category' | 'description' | 'count' | 'chequeIncluded',
    val: any
  ) => {
    setDocItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!partyName.trim()) {
      toast('Please enter the Sender / Party Name', 'error')
      return
    }
    if (!docketNumber.trim()) {
      toast('Please enter the Courier Docket / AWB Number', 'error')
      return
    }
    if (docItems.length === 0) {
      toast('Please add at least one document item inside this Dak', 'error')
      return
    }

    const newRecord = addIncomingDak({
      branch,
      partyName,
      senderAddress,
      senderPhone,
      senderEmail,
      internalDepartment,
      handledByStaff,
      docketNumber,
      courierType,
      documents: docItems,
      podAttachment: hasPodUpload
        ? {
            name: podFileName || `POD_${docketNumber}.pdf`,
            sizeKb: 285,
            type: 'application/pdf',
            uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          }
        : undefined,
      envelopeAttachment: {
        name: `Envelope_${docketNumber}.jpg`,
        sizeKb: 430,
        type: 'image/jpeg',
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      },
      remarks,
    })

    onSuccess(newRecord)
  }

  return (
    <Modal title="New Incoming Dak — Content & Parcel Entry" onClose={onClose} width={760}>
      <form onSubmit={handleSubmit} className="space-y-6 text-[13px]">
        {/* Section 1: Basic Inward Details */}
        <div>
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <ArrowDownLeft size={16} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-ink">1. Basic Inward & Courier Details</h3>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Receiving Branch / Hub *</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-[12px] focus:border-primary focus:outline-hidden"
              >
                <option value="Delhi Central Hub">Delhi Central Hub</option>
                <option value="Agra Zonal Office">Agra Zonal Office</option>
                <option value="Jaipur Regional Office">Jaipur Regional Office</option>
                <option value="Mumbai Headquarters (BKC)">Mumbai Headquarters (BKC)</option>
                <option value="Lucknow Operations Hub">Lucknow Operations Hub</option>
                <option value="Patna Regional Office">Patna Regional Office</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Courier Service Provider *</label>
              <select
                value={courierType}
                onChange={(e) => setCourierType(e.target.value as CourierService)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-[12px] focus:border-primary focus:outline-hidden"
              >
                {COURIER_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Docket / AWB Tracking No. *</label>
              <input
                type="text"
                required
                placeholder="e.g. BD-882910321"
                value={docketNumber}
                onChange={(e) => setDocketNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] font-mono focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Sender Party Name *</label>
              <input
                type="text"
                required
                placeholder="Franchisee / Vendor / Bank Name"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Sender Mobile / Phone</label>
              <input
                type="text"
                placeholder="+91 98250 XXXXX"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Sender Email ID</label>
              <input
                type="email"
                placeholder="sender@domain.com"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Handled By Staff</label>
              <input
                type="text"
                value={handledByStaff}
                onChange={(e) => setHandledByStaff(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Internal Recipient Department</label>
              <select
                value={internalDepartment}
                onChange={(e) => setInternalDepartment(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-[12px] focus:border-primary focus:outline-hidden"
              >
                <option value="Cheque Clearing Team">Cheque Clearing Team</option>
                <option value="Legal & Compliance">Legal & Compliance</option>
                <option value="ATM Operations & Logistics">ATM Operations & Logistics</option>
                <option value="Finance & Accounts">Finance & Accounts</option>
                <option value="Franchise Onboarding Desk">Franchise Onboarding Desk</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block font-semibold text-slate-700">Sender Full Address</label>
              <input
                type="text"
                placeholder="Origin city, street and pincode"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 2: "Documents In This Dak" Section */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-primary" />
              <h3 className="text-sm font-bold text-ink">2. Documents In This Dak (Itemized Contents)</h3>
            </div>
            <button
              type="button"
              onClick={handleAddDocItem}
              className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-blue-50"
            >
              <Plus size={13} /> Add Document Row
            </button>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Specify each document category inside this parcel. Marking <strong>Cheque Included = YES</strong> triggers the Cheque Linking Studio.
          </p>

          <div className="mt-3 space-y-2.5">
            {docItems.map((item, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-12 items-center"
              >
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-semibold text-slate-500">Document Category *</label>
                  <select
                    value={item.category}
                    onChange={(e) =>
                      handleDocChange(idx, 'category', e.target.value as DocumentCategory)
                    }
                    className="mt-0.5 w-full rounded-md border border-slate-200 bg-white p-1.5 text-[11px] font-medium text-slate-800"
                  >
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-semibold text-slate-500">Description / Details</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Cheque #482019"
                    value={item.description}
                    onChange={(e) => handleDocChange(idx, 'description', e.target.value)}
                    className="mt-0.5 w-full rounded-md border border-slate-200 p-1.5 text-[11px]"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-semibold text-slate-500">Count</label>
                  <input
                    type="number"
                    min={1}
                    value={item.count}
                    onChange={(e) => handleDocChange(idx, 'count', parseInt(e.target.value) || 1)}
                    className="mt-0.5 w-full rounded-md border border-slate-200 p-1.5 text-center text-[11px] font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500">Cheque Included?</label>
                  <button
                    type="button"
                    onClick={() => handleDocChange(idx, 'chequeIncluded', !item.chequeIncluded)}
                    className={cn(
                      'mt-0.5 flex w-full items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold transition-colors',
                      item.chequeIncluded
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {item.chequeIncluded ? (
                      <>
                        <Check size={12} /> YES
                      </>
                    ) : (
                      'NO'
                    )}
                  </button>
                </div>

                <div className="sm:col-span-1 flex justify-end">
                  {docItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDocItem(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: POD & Envelope Upload */}
        <div>
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Paperclip size={16} className="text-slate-600" />
            <h3 className="text-sm font-bold text-ink">3. POD Slip & Physical Envelope Attachments</h3>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-dashed border-slate-300 p-3 text-center">
              <Upload size={18} className="mx-auto text-slate-400" />
              <div className="mt-1 text-[11px] font-semibold text-slate-700">Proof of Delivery (POD) Slip</div>
              <div className="mt-1 text-[10px] text-muted">Upload scanned courier delivery slip / signature</div>
              <input
                type="file"
                className="mt-2 text-[10px]"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setHasPodUpload(true)
                    setPodFileName(e.target.files[0].name)
                  }
                }}
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Remarks / Condition Notes</label>
              <textarea
                rows={3}
                placeholder="Sealed condition, any tears, remarks on envelope..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Check size={15} />
            <span>Record & Index Incoming Dak</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ====================================================================
// SUB-COMPONENT: OUTGOING DAK DISPATCH SCREEN
// ====================================================================
function OutgoingDakModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: (rec: DakRecord) => void
}) {
  const [branch, setBranch] = useState('Delhi Central Hub')
  const [recipientName, setRecipientName] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [internalDepartment, setInternalDepartment] = useState('ATM Operations & Logistics')
  const [handledByStaff, setHandledByStaff] = useState('Sunil Sharma')
  const [docketNumber, setDocketNumber] = useState('')
  const [courierType, setCourierType] = useState<CourierService>('BlueDart')
  const [remarks, setRemarks] = useState('')

  const [docItems, setDocItems] = useState<
    Array<{
      category: DocumentCategory
      description: string
      count: number
    }>
  >([
    {
      category: 'Welcome Kit & ATM Dongle',
      description: 'Dongle & PIN Envelopes',
      count: 1,
    },
  ])

  const handleAddDocItem = () => {
    setDocItems((prev) => [
      ...prev,
      {
        category: 'Franchise Agreement (Stamp Paper)',
        description: 'Countersigned agreement copy',
        count: 1,
      },
    ])
  }

  const handleRemoveDocItem = (index: number) => {
    setDocItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDocChange = (
    index: number,
    field: 'category' | 'description' | 'count',
    val: any
  ) => {
    setDocItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipientName.trim()) {
      toast('Please enter the Recipient Name', 'error')
      return
    }
    if (!docketNumber.trim()) {
      toast('Please enter the Courier Booking / Docket Number', 'error')
      return
    }

    const newRecord = addOutgoingDak({
      branch,
      recipientName,
      recipientAddress,
      recipientPhone,
      recipientEmail,
      internalDepartment,
      handledByStaff,
      docketNumber,
      courierType,
      documents: docItems,
      podAttachment: {
        name: `Booking_Slip_${docketNumber}.pdf`,
        sizeKb: 190,
        type: 'application/pdf',
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      },
      remarks,
    })

    onSuccess(newRecord)
  }

  return (
    <Modal title="New Outgoing Dak — Dispatch Consignment" onClose={onClose} width={760}>
      <form onSubmit={handleSubmit} className="space-y-6 text-[13px]">
        {/* Recipient Details */}
        <div>
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <ArrowUpRight size={16} className="text-primary" />
            <h3 className="text-sm font-bold text-ink">1. Destination & Recipient Information</h3>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Dispatching Branch / Hub *</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-[12px] focus:border-primary focus:outline-hidden"
              >
                <option value="Delhi Central Hub">Delhi Central Hub</option>
                <option value="Agra Zonal Office">Agra Zonal Office</option>
                <option value="Jaipur Regional Office">Jaipur Regional Office</option>
                <option value="Mumbai Headquarters (BKC)">Mumbai Headquarters (BKC)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Courier Provider *</label>
              <select
                value={courierType}
                onChange={(e) => setCourierType(e.target.value as CourierService)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-[12px] focus:border-primary focus:outline-hidden"
              >
                {COURIER_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Docket / AWB Tracking Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. BD-994102911"
                value={docketNumber}
                onChange={(e) => setDocketNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] font-mono focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Recipient Name / Entity *</label>
              <input
                type="text"
                required
                placeholder="Franchisee / Bank Manager / Vendor"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Recipient Phone</label>
              <input
                type="text"
                placeholder="+91 98250 XXXXX"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Recipient Email</label>
              <input
                type="email"
                placeholder="recipient@domain.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Dispatching Department</label>
              <input
                type="text"
                value={internalDepartment}
                onChange={(e) => setInternalDepartment(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Handled By Staff</label>
              <input
                type="text"
                value={handledByStaff}
                onChange={(e) => setHandledByStaff(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block font-semibold text-slate-700">Delivery Street Address & Pincode</label>
              <input
                type="text"
                placeholder="Complete destination address"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block font-semibold text-slate-700">Dispatch Remarks / Bag Barcode</label>
              <input
                type="text"
                placeholder="e.g. High security sealed bag #SE-8841029"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Documents Sent */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-sm font-bold text-ink">2. Documents / Contents Being Sent</h3>
            <button
              type="button"
              onClick={handleAddDocItem}
              className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-blue-50"
            >
              <Plus size={13} /> Add Item Row
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            {docItems.map((item, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-12 items-center"
              >
                <div className="sm:col-span-5">
                  <label className="block text-[10px] font-semibold text-slate-500">Document Category *</label>
                  <select
                    value={item.category}
                    onChange={(e) =>
                      handleDocChange(idx, 'category', e.target.value as DocumentCategory)
                    }
                    className="mt-0.5 w-full rounded-md border border-slate-200 bg-white p-1.5 text-[11px] font-medium text-slate-800"
                  >
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[10px] font-semibold text-slate-500">Particulars / Description</label>
                  <input
                    type="text"
                    placeholder="Details of contents..."
                    value={item.description}
                    onChange={(e) => handleDocChange(idx, 'description', e.target.value)}
                    className="mt-0.5 w-full rounded-md border border-slate-200 p-1.5 text-[11px]"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-semibold text-slate-500">Count</label>
                  <input
                    type="number"
                    min={1}
                    value={item.count}
                    onChange={(e) => handleDocChange(idx, 'count', parseInt(e.target.value) || 1)}
                    className="mt-0.5 w-full rounded-md border border-slate-200 p-1.5 text-center text-[11px] font-bold"
                  />
                </div>

                <div className="sm:col-span-1 flex justify-end">
                  {docItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDocItem(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors"
          >
            <Send size={15} />
            <span>Dispatch & Log Outgoing Dak</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ====================================================================
// SUB-COMPONENT: CHEQUE LINKING SCREEN
// ====================================================================
function ChequeLinkingModal({
  dak,
  onClose,
  onSuccess,
}: {
  dak: DakRecord
  onClose: () => void
  onSuccess: (res: { dak: DakRecord; cheque: ChequeRecord }) => void
}) {
  const [chequeNumber, setChequeNumber] = useState('')
  const [bankName, setBankName] = useState('HDFC Bank')
  const [branchName, setBranchName] = useState('Main Branch')
  const [amount, setAmount] = useState<number>(500000)
  const [partyName, setPartyName] = useState(dak.partyName)
  const [franchiseeId, setFranchiseeId] = useState('DX-UP-02391')
  const [atmId, setAtmId] = useState('ATM-UP-0412')
  const [linkType, setLinkType] = useState<'CONTAINS' | 'REPLACEMENT_FOR' | 'SUPPORTING_DOC'>('CONTAINS')
  const [custodian, setCustodian] = useState('Amit Sharma (Vault Manager - Mumbai HQ)')
  const [vaultLocation, setVaultLocation] = useState('Locker B-14, Fireproof Safe 2')
  const [notes, setNotes] = useState('Primary security deposit instrument linked to incoming consignment.')

  const handleLink = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chequeNumber.trim()) {
      toast('Please enter the 6-digit Cheque Number', 'error')
      return
    }

    try {
      const res = linkChequeToDak(dak.id, {
        chequeNumber,
        bankName,
        branchName,
        amount,
        partyName,
        franchiseeId,
        atmId,
        linkType,
        custodian,
        vaultLocation,
        notes,
      })
      onSuccess(res)
    } catch (err: any) {
      toast(err.message || 'Failed to link cheque', 'error')
    }
  }

  return (
    <Modal title="Cheque Linking Studio — FFM Integration" onClose={onClose} width={760}>
      <form onSubmit={handleLink} className="space-y-5 text-[13px]">
        {/* Dak Banner Context */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-primary" />
              <span className="font-mono text-sm font-bold text-primary">{dak.id}</span>
              <span className="text-[12px] text-slate-500">
                (Docket: {dak.docketNumber} • {dak.courierType})
              </span>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
              Cheque Declared: YES
            </span>
          </div>
          <div className="mt-1 text-[12px] text-slate-700">
            <strong>Sender:</strong> {dak.partyName} • <strong>Branch:</strong> {dak.branch}
          </div>
        </div>

        {/* Existing Linked Cheques */}
        {dak.linkedCheques.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Existing Linked Cheques in this Dak ({dak.linkedCheques.length})
            </div>
            <div className="mt-2 space-y-1.5">
              {dak.linkedCheques.map((c) => (
                <div
                  key={c.chequeId}
                  className="flex items-center justify-between rounded-md bg-white border border-slate-200 p-2 text-[12px]"
                >
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-indigo-700">{c.chequeId}</span>
                    <span>Cheque #{c.chequeNumber}</span>
                    <span className="text-slate-500">({c.bankName})</span>
                  </div>
                  <div className="font-bold text-slate-900">₹ {c.amount.toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cheque Entry Form */}
        <div>
          <h4 className="text-sm font-bold text-ink">Enter Physical Cheque Instrument Details</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Cheque Number (6 Digits) *</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. 482019"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 font-mono text-[12px] font-bold focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Drawn On Bank *</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-[12px] focus:border-primary focus:outline-hidden"
              >
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="State Bank of India">State Bank of India</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="Axis Bank">Axis Bank</option>
                <option value="Bank of Baroda">Bank of Baroda</option>
                <option value="Punjab National Bank">Punjab National Bank</option>
                <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Bank Branch</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Cheque Amount (₹) *</label>
              <input
                type="number"
                required
                step={1000}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-200 p-2 font-mono text-[12px] font-bold focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Party / Account Name *</label>
              <input
                type="text"
                required
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Franchisee ID</label>
              <input
                type="text"
                value={franchiseeId}
                onChange={(e) => setFranchiseeId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 font-mono text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Associated ATM ID</label>
              <input
                type="text"
                value={atmId}
                onChange={(e) => setAtmId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 font-mono text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Relationship / Link Type *</label>
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-[12px] font-semibold text-indigo-700 focus:border-primary focus:outline-hidden"
              >
                <option value="CONTAINS">CONTAINS (Original Instrument Inside Parcel)</option>
                <option value="REPLACEMENT_FOR">REPLACEMENT_FOR (Replacing Bounced/Old Cheque)</option>
                <option value="SUPPORTING_DOC">SUPPORTING_DOC (Photocopy / Counterfoil)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Physical Custodian Assignee</label>
              <input
                type="text"
                value={custodian}
                onChange={(e) => setCustodian(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Vault Safe / Locker ID</label>
              <input
                type="text"
                value={vaultLocation}
                onChange={(e) => setVaultLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block font-semibold text-slate-700">Verification & Linking Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-[12px] focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Link2 size={15} />
            <span>Confirm Link & Store in Vault</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ====================================================================
// SUB-COMPONENT: DAK DETAIL INSPECTION MODAL
// ====================================================================
function DakDetailModal({
  dak,
  onClose,
  onLinkCheques,
}: {
  dak: DakRecord
  onClose: () => void
  onLinkCheques: () => void
}) {
  return (
    <Modal title={`Dak Dossier: ${dak.id}`} onClose={onClose} width={760}>
      <div className="space-y-5 text-[13px]">
        {/* Header Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-ink">{dak.id}</span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                  dak.direction === 'Incoming' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                )}
              >
                {dak.direction}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {dak.status}
              </span>
            </div>
            <div className="mt-1 text-[12px] text-muted">
              Date: {dak.date} at {dak.time} • Branch: {dak.branch}
            </div>
          </div>

          {dak.hasCheques && !dak.isLinked && (
            <button
              type="button"
              onClick={onLinkCheques}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-indigo-700"
            >
              <Link2 size={14} /> Link Cheques
            </button>
          )}
        </div>

        {/* Courier & Party Grid */}
        <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {dak.direction === 'Incoming' ? 'Sender Party' : 'Recipient Party'}
            </span>
            <div className="mt-1 text-sm font-bold text-ink">{dak.partyName}</div>
            <div className="text-[12px] text-slate-600">{dak.senderRecipientAddress}</div>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-muted">
              <span>{dak.senderRecipientPhone}</span>
              <span>{dak.senderRecipientEmail}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Logistics & Courier Details
            </span>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {dak.courierType} Express
            </div>
            <div className="font-mono text-[12px] text-primary">AWB: {dak.docketNumber}</div>
            <div className="mt-1 text-[11px] text-slate-600">
              Department: {dak.internalDepartment} ({dak.handledByStaff})
            </div>
          </div>
        </div>

        {/* Documents Itemization */}
        <div>
          <h4 className="text-sm font-bold text-ink">Documents In This Consignment</h4>
          <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {dak.documents.map((d, i) => (
              <div key={d.id || i} className="flex items-center justify-between p-3 text-[12px]">
                <div>
                  <div className="font-semibold text-ink">{d.category}</div>
                  <div className="text-[11px] text-slate-500">{d.description || 'No additional notes'}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    {d.count} unit{d.count > 1 ? 's' : ''}
                  </span>
                  {d.chequeIncluded && (
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                      Cheque Included
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Linked Cheques Cards */}
        {dak.linkedCheques.length > 0 && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <h4 className="text-sm font-bold text-indigo-950">Linked Cheque Records ({dak.linkedCheques.length})</h4>
            <div className="mt-2 space-y-2">
              {dak.linkedCheques.map((c) => (
                <div
                  key={c.chequeId}
                  className="flex items-center justify-between rounded-lg bg-white border border-indigo-100 p-2.5 text-[12px]"
                >
                  <div>
                    <div className="font-mono font-bold text-indigo-700">{c.chequeId} • #{c.chequeNumber}</div>
                    <div className="text-[11px] text-slate-600">{c.bankName} — {c.partyName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900">₹ {c.amount.toLocaleString('en-IN')}</div>
                    <span className="text-[10px] font-semibold text-emerald-700">Verified & In Vault</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* POD Attachments */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <Paperclip size={16} className="text-slate-500" />
            <div>
              <div className="font-semibold text-ink">
                {dak.podAttachment?.name || 'Carrier Proof of Delivery'}
              </div>
              <div className="text-[11px] text-muted">Digitally indexed consignment delivery memo</div>
            </div>
          </div>
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            Attached
          </span>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-[12px] font-semibold text-white hover:bg-slate-900"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ====================================================================
// SUB-COMPONENT: CHEQUE DETAIL CROSS-MODULE MODAL
// ====================================================================
function ChequeDetailModal({
  cheque,
  onClose,
  onViewDak,
}: {
  cheque: ChequeRecord
  onClose: () => void
  onViewDak: (dakId: string) => void
}) {
  return (
    <Modal title={`Cheque Details: ${cheque.chequeId}`} onClose={onClose} width={640}>
      <div className="space-y-5 text-[13px]">
        {/* Prominent Reverse Link Banner */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-slate-700">Originating Dak Consignment:</span>
              <span className="font-mono text-sm font-bold text-primary">{cheque.originatingDakId}</span>
            </div>
            <button
              type="button"
              onClick={() => onViewDak(cheque.originatingDakId)}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-primary-hover"
            >
              <span>Inspect Dak</span>
              <ExternalLink size={11} />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600 border-t border-blue-200/60 pt-2">
            <div>
              <strong>Carrier:</strong> {cheque.courier} (AWB: {cheque.originatingDocket})
            </div>
            <div>
              <strong>Inward Date:</strong> {cheque.receivedDate}
            </div>
          </div>
        </div>

        {/* Instrument Grid */}
        <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-slate-200 p-4">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Instrument No.</span>
            <div className="font-mono text-xl font-bold text-ink">#{cheque.chequeNumber}</div>
            <div className="text-[11px] text-slate-500">Date: {cheque.chequeDate}</div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Cheque Amount</span>
            <div className="font-mono text-xl font-bold text-emerald-700">
              ₹ {cheque.amount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-800">Security Deposit Clearing</div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Drawn On</span>
            <div className="font-semibold text-slate-800">{cheque.bankName}</div>
            <div className="text-[11px] text-slate-500">{cheque.branchName} ({cheque.ifscCode})</div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Account Holder</span>
            <div className="font-semibold text-slate-800">{cheque.partyName}</div>
            <div className="font-mono text-[11px] text-slate-500">A/C: {cheque.accountNumber}</div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Franchisee & ATM ID</span>
            <div className="font-mono text-xs font-semibold text-slate-700">
              {cheque.franchiseeId} • {cheque.atmId}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Link Type</span>
            <div className="font-mono text-xs font-semibold text-indigo-700">{cheque.linkType}</div>
          </div>
        </div>

        {/* Custody Info */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-slate-600" />
            <h4 className="text-sm font-bold text-ink">Physical Vault Custody</h4>
          </div>
          <div className="mt-2 text-[12px] text-slate-700">
            <strong>Custodian:</strong> {cheque.custodian}
          </div>
          <div className="text-[12px] text-slate-700">
            <strong>Vault Safe:</strong> {cheque.vaultLocation}
          </div>
          {cheque.notes && (
            <div className="mt-2 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
              <strong>Notes:</strong> {cheque.notes}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-[12px] font-semibold text-white hover:bg-slate-900"
          >
            Close Details
          </button>
        </div>
      </div>
    </Modal>
  )
}
