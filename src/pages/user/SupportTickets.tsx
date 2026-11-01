import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Home,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'

// ── SVG Icon 1: Open Ticket (Blue ticket + yellow ticket + gear) ──────────────
function OpenTicketIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-13 h-13 shrink-0" fill="none">
      {/* Yellow ticket behind */}
      <rect x="18" y="10" width="34" height="22" rx="4" fill="#FBBF24" />
      <circle cx="18" cy="21" r="3.5" fill="#FFFFFF" />
      <circle cx="52" cy="21" r="3.5" fill="#FFFFFF" />
      <path d="M26 16h18M26 21h12" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

      {/* Blue ticket in front */}
      <rect x="8" y="16" width="38" height="26" rx="4" fill="#38BDF8" />
      <circle cx="8" cy="29" r="4" fill="#FFFFFF" />
      <circle cx="46" cy="29" r="4" fill="#FFFFFF" />
      <path d="M16 23h18M16 29h12M16 35h16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeDasharray="2.5 2.5" />

      {/* Gear on bottom right */}
      <circle cx="44" cy="44" r="10" fill="#64748B" />
      <circle cx="44" cy="44" r="4" fill="#FFFFFF" />
      <path d="M44 32v4M44 52v4M32 44h4M52 44h4M35.5 35.5l2.8 2.8M49.7 49.7l2.8 2.8M35.5 52.5l2.8-2.8M49.7 38.3l2.8-2.8" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ── SVG Icon 2: In Progress Ticket (Blue ticket with spanner / wrench) ────────
function InProgressTicketIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-13 h-13 shrink-0" fill="none">
      <rect x="6" y="17" width="52" height="30" rx="5" fill="#38BDF8" />
      <circle cx="6" cy="32" r="4.5" fill="#FFFFFF" />
      <circle cx="58" cy="32" r="4.5" fill="#FFFFFF" />
      <path d="M14 24v16" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
      {/* Wrench graphic */}
      <g transform="translate(24, 23)">
        <path
          d="M13.5 2.5a4 4 0 0 0-4.8 1.1l2.3 2.3-1.4 1.4-2.3-2.3A4 4 0 0 0 6.2 9.8l-5.4 5.4a1.8 1.8 0 0 0 2.5 2.5l5.4-5.4a4 4 0 0 0 4.8-1.1l-2.3-2.3 1.4-1.4 2.3 2.3a4 4 0 0 0 1.1-4.8l-2.5-2.5z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  )
}

// ── SVG Icon 3: Pending Ticket (Circular arrows + center cog + check / cross) ─
function PendingIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-13 h-13 shrink-0" fill="none">
      {/* Green upper arrow */}
      <path d="M32 10a21 21 0 0 1 18 10l-4 1" stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" />
      <polygon points="53,23 46,16 43,24" fill="#22C55E" />
      {/* Red lower arrow */}
      <path d="M32 54a21 21 0 0 1-18-10l4-1" stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round" />
      <polygon points="11,41 18,48 21,40" fill="#EF4444" />
      {/* Center yellow gear */}
      <circle cx="32" cy="32" r="11" fill="#FBBF24" />
      <circle cx="32" cy="32" r="5" fill="#FFFFFF" />
      <path d="M32 19v4M32 41v4M19 32h4M41 32h4M22.8 22.8l2.8 2.8M38.4 38.4l2.8 2.8M22.8 41.2l2.8-2.8M38.4 25.6l2.8-2.8" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
      {/* Check badge (top right) */}
      <circle cx="48" cy="20" r="5" fill="#3B82F6" />
      <path d="M45.5 20l2 2 3.5-3.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Cross badge (bottom left) */}
      <circle cx="16" cy="44" r="5" fill="#EF4444" />
      <path d="M14 42l4 4M18 42l-4 4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ── SVG Icon 4: On Hold Ticket (Two golden/orange tickets with TICKET text) ───
function OnHoldIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-13 h-13 shrink-0" fill="none">
      {/* Back orange ticket */}
      <g transform="rotate(-18 30 30)">
        <rect x="8" y="18" width="44" height="24" rx="4" fill="#FB923C" />
        <circle cx="8" cy="30" r="4" fill="#FFFFFF" />
        <circle cx="52" cy="30" r="4" fill="#FFFFFF" />
        <text x="30" y="34" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" textAnchor="middle" letterSpacing="1.2">TICKET</text>
      </g>
      {/* Front golden ticket */}
      <g transform="rotate(8 34 34)">
        <rect x="10" y="20" width="44" height="24" rx="4" fill="#FDE047" stroke="#F59E0B" strokeWidth="1" />
        <circle cx="10" cy="32" r="4" fill="#FFFFFF" />
        <circle cx="54" cy="32" r="4" fill="#FFFFFF" />
        <text x="32" y="36" fill="#B45309" fontSize="6.5" fontWeight="bold" textAnchor="middle" letterSpacing="1.2">TICKET</text>
      </g>
    </svg>
  )
}

// ── SVG Icon 5: Closed Ticket (Red circle badge with yellow ticket inside) ────
function ClosedIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-13 h-13 shrink-0" fill="none">
      <circle cx="32" cy="32" r="23" fill="#F43F5E" />
      <circle cx="32" cy="32" r="20" fill="#FB7185" />
      <g transform="rotate(-10 32 32)">
        <rect x="18" y="22" width="28" height="20" rx="3" fill="#FEF08A" stroke="#FACC15" strokeWidth="0.8" />
        <circle cx="18" cy="32" r="3" fill="#FB7185" />
        <circle cx="46" cy="32" r="3" fill="#FB7185" />
        <text x="32" y="35" fill="#B45309" fontSize="5" fontWeight="bold" textAnchor="middle" letterSpacing="1">TICKET</text>
      </g>
    </svg>
  )
}

// ── Types ────────────────────────────────────────────────────────────────────
export type TicketStatus = 'Open' | 'In progress' | 'Pending' | 'On Hold' | 'Closed'

export interface TicketItem {
  sn: number
  id: string
  name: string
  employeeCode: string
  ticketType: string
  createdDate: string
  closingDate: string
  helpSupport: string
  status: TicketStatus
  description?: string
  priority?: 'High' | 'Medium' | 'Low'
}

// Initial records matching real system modules
const INITIAL_TICKETS: TicketItem[] = [
  {
    sn: 1,
    id: 'TCK-2026-1041',
    name: 'Ranjeet Pal',
    employeeCode: 'DX-EMP-1042',
    ticketType: 'Operations & CBR',
    createdDate: '26-10-2026',
    closingDate: '—',
    helpSupport: 'CBR EOD Reconciliation mismatch on ATM-MH-1024',
    status: 'Open',
    description: 'During daily EOD cash reconciliation on site ATM-MH-1024, physical cash count had a variance with switch counter. Requesting audit investigation.',
    priority: 'High',
  },
  {
    sn: 2,
    id: 'TCK-2026-1040',
    name: 'Paras Dubey',
    employeeCode: 'DX-EMP-0891',
    ticketType: 'Account Mapping',
    createdDate: '24-10-2026',
    closingDate: '—',
    helpSupport: 'Nodal account mapping delay for Axis Indent',
    status: 'In progress',
    description: 'Branch SOL ID verification for Axis Bank branch pending compliance approval. Franchisee settlement mapping awaiting Nodal sweep validation.',
    priority: 'Medium',
  },
  {
    sn: 3,
    id: 'TCK-2026-1039',
    name: 'Bhavin Patel',
    employeeCode: 'DX-EMP-1102',
    ticketType: 'Settlement & Payout',
    createdDate: '22-10-2026',
    closingDate: '—',
    helpSupport: 'Monthly settlement payout calculation query',
    status: 'Pending',
    description: 'TDS deduction breakdown and GST input tax credit statement needed for October settlement cycle.',
    priority: 'Low',
  },
  {
    sn: 4,
    id: 'TCK-2026-1038',
    name: 'Rameshwar Kulkarni',
    employeeCode: 'DX-EMP-0764',
    ticketType: 'ATM Terminal Error',
    createdDate: '19-10-2026',
    closingDate: '—',
    helpSupport: 'Purge bin sensor alert & dispenser calibration',
    status: 'On Hold',
    description: 'Cassette 3 sensor reported intermittent double-pick error. Engineer visit scheduled pending replacement parts delivery.',
    priority: 'High',
  },
  {
    sn: 5,
    id: 'TCK-2026-1037',
    name: 'Pooja Sharma',
    employeeCode: 'DX-EMP-1215',
    ticketType: 'KYC & Verification',
    createdDate: '15-10-2026',
    closingDate: '18-10-2026',
    helpSupport: 'Aadhaar biometric authentication API timeout',
    status: 'Closed',
    description: 'UIDAI authentication gateway timeout resolved with retry logic and fallback OTP verification for new franchisee onboarding.',
    priority: 'Medium',
  },
]

export default function SupportTickets() {
  const [tickets, setTickets] = useState<TicketItem[]>(INITIAL_TICKETS)

  // Filter States matching image
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Open')
  const [appliedFilters, setAppliedFilters] = useState({
    from: '',
    to: '',
    status: 'Open',
  })

  // Modal States
  const [modalOpen, setModalOpen] = useState(false)
  const [viewTicket, setViewTicket] = useState<TicketItem | null>(null)

  // New Ticket Form State
  const [formName, setFormName] = useState('')
  const [formEmpCode, setFormEmpCode] = useState('')
  const [formType, setFormType] = useState('Operations & CBR')
  const [formHelpSupport, setFormHelpSupport] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPriority, setFormPriority] = useState<'High' | 'Medium' | 'Low'>('Medium')

  // Counts for 5 cards
  const counts = useMemo(() => {
    return {
      open: tickets.filter((t) => t.status === 'Open').length,
      inProgress: tickets.filter((t) => t.status === 'In progress').length,
      pending: tickets.filter((t) => t.status === 'Pending').length,
      onHold: tickets.filter((t) => t.status === 'On Hold').length,
      closed: tickets.filter((t) => t.status === 'Closed').length,
    }
  }, [tickets])

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Status filter
      if (appliedFilters.status !== 'All' && t.status !== appliedFilters.status) {
        return false
      }
      // Date from filter
      if (appliedFilters.from) {
        const [d, m, y] = t.createdDate.split('-')
        const ticketDate = `${y}-${m}-${d}`
        if (ticketDate < appliedFilters.from) return false
      }
      // Date to filter
      if (appliedFilters.to) {
        const [d, m, y] = t.createdDate.split('-')
        const ticketDate = `${y}-${m}-${d}`
        if (ticketDate > appliedFilters.to) return false
      }
      return true
    })
  }, [tickets, appliedFilters])

  // Apply filters on Search click
  const handleSearch = () => {
    setAppliedFilters({
      from: dateFrom,
      to: dateTo,
      status: statusFilter,
    })
    toast('Filters applied', 'info')
  }

  // Reset filters
  const handleReset = () => {
    setDateFrom('')
    setDateTo('')
    setStatusFilter('All')
    setAppliedFilters({
      from: '',
      to: '',
      status: 'All',
    })
    toast('Filters reset', 'info')
  }

  // Export tickets to Excel/CSV
  const exportTickets = () => {
    const headers = [
      '#',
      'Ticket Id',
      'Name',
      'Employee Code',
      'Ticket Type',
      'Created Date',
      'Closing Date',
      'Help & Support',
      'Status',
    ]
    const rows = filteredTickets.map((t, i) => [
      String(i + 1),
      t.id,
      t.name,
      t.employeeCode,
      t.ticketType,
      t.createdDate,
      t.closingDate,
      t.helpSupport,
      t.status,
    ])
    downloadCsv(`support-tickets-${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast('Tickets exported successfully (Excel/CSV)', 'success')
  }

  // Handle Create Ticket
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formHelpSupport.trim() || !formName.trim()) {
      toast('Please enter Name and Help & Support topic', 'error')
      return
    }

    const newTicket: TicketItem = {
      sn: tickets.length + 1,
      id: `TCK-2026-${String(Math.floor(Math.random() * 900) + 1050)}`,
      name: formName,
      employeeCode: formEmpCode || `DX-EMP-${String(Math.floor(Math.random() * 900) + 1000)}`,
      ticketType: formType,
      createdDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      closingDate: '—',
      helpSupport: formHelpSupport,
      status: 'Open',
      description: formDescription,
      priority: formPriority,
    }

    setTickets([newTicket, ...tickets])
    setModalOpen(false)
    setFormName('')
    setFormEmpCode('')
    setFormHelpSupport('')
    setFormDescription('')
    toast(`Ticket ${newTicket.id} created successfully!`, 'success')
  }

  return (
    <div className="space-y-4 pb-16 max-w-[1440px] font-sans">
      {/* ── Breadcrumb: Workspace > User > Help & Support > Tickets ───────── */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/user" className="hover:text-[#0066FF] transition-colors">
          User
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/user/help-support" className="hover:text-[#0066FF] transition-colors">
          Help &amp; Support
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Tickets</span>
      </div>

      {/* ── 5 Metric Status Cards (Matching Image) ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Open */}
        <div
          onClick={() => {
            setStatusFilter('Open')
            setAppliedFilters((p) => ({ ...p, status: 'Open' }))
          }}
          className={cn(
            'bg-white rounded-xl border px-5 py-4 flex items-center justify-between transition-all cursor-pointer shadow-xs hover:shadow-md',
            appliedFilters.status === 'Open'
              ? 'border-sky-300 ring-2 ring-sky-100'
              : 'border-slate-100 hover:border-slate-200'
          )}
        >
          <div className="flex items-center justify-center shrink-0 pr-4">
            <OpenTicketIcon />
          </div>
          <div className="h-12 w-[1px] bg-slate-100 shrink-0" />
          <div className="flex-1 text-right pl-4">
            <div className="text-[14px] font-medium text-[#475569]">Open</div>
            <div className="text-[26px] font-bold text-[#1E293B] mt-0.5 leading-none">
              {counts.open}
            </div>
          </div>
        </div>

        {/* Card 2: In progress */}
        <div
          onClick={() => {
            setStatusFilter('In progress')
            setAppliedFilters((p) => ({ ...p, status: 'In progress' }))
          }}
          className={cn(
            'bg-white rounded-xl border px-5 py-4 flex items-center justify-between transition-all cursor-pointer shadow-xs hover:shadow-md',
            appliedFilters.status === 'In progress'
              ? 'border-sky-300 ring-2 ring-sky-100'
              : 'border-slate-100 hover:border-slate-200'
          )}
        >
          <div className="flex items-center justify-center shrink-0 pr-4">
            <InProgressTicketIcon />
          </div>
          <div className="h-12 w-[1px] bg-slate-100 shrink-0" />
          <div className="flex-1 text-right pl-4">
            <div className="text-[14px] font-medium text-[#475569]">In progress</div>
            <div className="text-[26px] font-bold text-[#1E293B] mt-0.5 leading-none">
              {counts.inProgress}
            </div>
          </div>
        </div>

        {/* Card 3: Pending */}
        <div
          onClick={() => {
            setStatusFilter('Pending')
            setAppliedFilters((p) => ({ ...p, status: 'Pending' }))
          }}
          className={cn(
            'bg-white rounded-xl border px-5 py-4 flex items-center justify-between transition-all cursor-pointer shadow-xs hover:shadow-md',
            appliedFilters.status === 'Pending'
              ? 'border-sky-300 ring-2 ring-sky-100'
              : 'border-slate-100 hover:border-slate-200'
          )}
        >
          <div className="flex items-center justify-center shrink-0 pr-4">
            <PendingIcon />
          </div>
          <div className="h-12 w-[1px] bg-slate-100 shrink-0" />
          <div className="flex-1 text-right pl-4">
            <div className="text-[14px] font-medium text-[#475569]">Pending</div>
            <div className="text-[26px] font-bold text-[#1E293B] mt-0.5 leading-none">
              {counts.pending}
            </div>
          </div>
        </div>

        {/* Card 4: On Hold */}
        <div
          onClick={() => {
            setStatusFilter('On Hold')
            setAppliedFilters((p) => ({ ...p, status: 'On Hold' }))
          }}
          className={cn(
            'bg-white rounded-xl border px-5 py-4 flex items-center justify-between transition-all cursor-pointer shadow-xs hover:shadow-md',
            appliedFilters.status === 'On Hold'
              ? 'border-sky-300 ring-2 ring-sky-100'
              : 'border-slate-100 hover:border-slate-200'
          )}
        >
          <div className="flex items-center justify-center shrink-0 pr-4">
            <OnHoldIcon />
          </div>
          <div className="h-12 w-[1px] bg-slate-100 shrink-0" />
          <div className="flex-1 text-right pl-4">
            <div className="text-[14px] font-medium text-[#475569]">On Hold</div>
            <div className="text-[26px] font-bold text-[#1E293B] mt-0.5 leading-none">
              {counts.onHold}
            </div>
          </div>
        </div>

        {/* Card 5: Closed */}
        <div
          onClick={() => {
            setStatusFilter('Closed')
            setAppliedFilters((p) => ({ ...p, status: 'Closed' }))
          }}
          className={cn(
            'bg-white rounded-xl border px-5 py-4 flex items-center justify-between transition-all cursor-pointer shadow-xs hover:shadow-md',
            appliedFilters.status === 'Closed'
              ? 'border-sky-300 ring-2 ring-sky-100'
              : 'border-slate-100 hover:border-slate-200'
          )}
        >
          <div className="flex items-center justify-center shrink-0 pr-4">
            <ClosedIcon />
          </div>
          <div className="h-12 w-[1px] bg-slate-100 shrink-0" />
          <div className="flex-1 text-right pl-4">
            <div className="text-[14px] font-medium text-[#475569]">Closed</div>
            <div className="text-[26px] font-bold text-[#1E293B] mt-0.5 leading-none">
              {counts.closed}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar & Table Container matching Image ────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Filter / Search Bar */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left Filter Inputs */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Date From */}
              <input
                type="text"
                placeholder="dd-mm-yyyy"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-[34px] w-[140px] sm:w-[150px] rounded border border-slate-300 bg-[#EEEEEE] px-3 text-[12px] text-slate-700 placeholder:text-slate-500 outline-none focus:border-[#0066FF] focus:bg-white transition-colors"
              />

              {/* Date To */}
              <input
                type="text"
                placeholder="dd-mm-yyyy"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-[34px] w-[140px] sm:w-[150px] rounded border border-slate-300 bg-[#EEEEEE] px-3 text-[12px] text-slate-700 placeholder:text-slate-500 outline-none focus:border-[#0066FF] focus:bg-white transition-colors"
              />

              {/* Status Select */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-[34px] min-w-[150px] appearance-none rounded border border-slate-300 bg-white pl-3 pr-8 text-[12px] font-medium text-slate-700 outline-none focus:border-[#0066FF] cursor-pointer"
                >
                  <option value="All">All</option>
                  <option value="Open">Open</option>
                  <option value="In progress">In progress</option>
                  <option value="Pending">Pending</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Closed">Closed</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              {/* Search Button */}
              <button
                type="button"
                onClick={handleSearch}
                className="h-[34px] px-4 rounded border border-[#93C5FD] bg-[#BDE4F9] hover:bg-[#A8DCF7] text-slate-800 text-[12.5px] font-medium transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
              >
                Search
              </button>

              {/* Reset filter button if active */}
              {(dateFrom || dateTo || statusFilter !== 'All') && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#0066FF] hover:underline cursor-pointer"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </div>

            {/* Right Action Icons: Excel Export + New Ticket */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportTickets}
                title="Export Excel"
                className="h-[34px] w-[34px] rounded border border-slate-200 hover:border-slate-300 bg-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs group"
              >
                {/* Excel Green Icon matching screenshot */}
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="#16A34A" strokeWidth="1.5" fill="#F0FDF4" />
                  <path d="M7 8l4 8M11 8l-4 8" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M15 8h4M15 12h4M15 16h4" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="h-[34px] px-3 rounded bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus size={14} /> New Ticket
              </button>
            </div>
          </div>
        </div>

        {/* ── Table with Sky Blue Header matching Image ────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="bg-[#CFE8FC] text-[#2C5282] font-semibold text-[12px] tracking-wide border-b border-sky-200">
              <tr>
                <th className="px-3.5 py-2.5 text-center w-12 font-bold">#</th>
                <th className="px-3.5 py-2.5 font-bold whitespace-nowrap">Ticket Id</th>
                <th className="px-3.5 py-2.5 font-bold whitespace-nowrap">Name</th>
                <th className="px-3.5 py-2.5 font-bold whitespace-nowrap">Employee Code</th>
                <th className="px-3.5 py-2.5 font-bold whitespace-nowrap">Ticket Type</th>
                <th className="px-3.5 py-2.5 font-bold whitespace-nowrap">Created Date</th>
                <th className="px-3.5 py-2.5 font-bold whitespace-nowrap">Closing Date</th>
                <th className="px-3.5 py-2.5 font-bold">Help &amp; Support</th>
                <th className="px-3.5 py-2.5 font-bold text-center whitespace-nowrap">Status</th>
                <th className="px-3.5 py-2.5 font-bold text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTickets.map((t, index) => (
                <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-3.5 py-3 text-center text-slate-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="px-3.5 py-3 font-semibold text-[#0066FF] whitespace-nowrap">
                    {t.id}
                  </td>
                  <td className="px-3.5 py-3 font-medium text-slate-900 whitespace-nowrap">
                    {t.name}
                  </td>
                  <td className="px-3.5 py-3 font-mono text-[11.5px] text-slate-600 whitespace-nowrap">
                    {t.employeeCode}
                  </td>
                  <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">
                    {t.ticketType}
                  </td>
                  <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">
                    {t.createdDate}
                  </td>
                  <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">
                    {t.closingDate}
                  </td>
                  <td className="px-3.5 py-3 text-slate-800 max-w-[280px]">
                    <div className="truncate font-medium" title={t.helpSupport}>
                      {t.helpSupport}
                    </div>
                  </td>
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                        t.status === 'Open' && 'bg-blue-50 text-blue-700 border-blue-200',
                        t.status === 'In progress' && 'bg-amber-50 text-amber-700 border-amber-200',
                        t.status === 'Pending' && 'bg-purple-50 text-purple-700 border-purple-200',
                        t.status === 'On Hold' && 'bg-slate-100 text-slate-700 border-slate-200',
                        t.status === 'Closed' && 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      )}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setViewTicket(t)}
                      className="p-1.5 rounded-md text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 transition-colors cursor-pointer"
                      title="View Ticket Details"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet size={32} className="text-slate-300" />
                      <p className="text-[13px] font-medium text-slate-500">
                        No tickets found matching the selected filter.
                      </p>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="text-[12px] font-semibold text-[#0066FF] hover:underline"
                      >
                        Clear filters to see all tickets
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer info */}
        <div className="px-4 py-3 border-t border-slate-100 text-[12px] text-slate-500 flex items-center justify-between bg-slate-50/50">
          <div>
            Showing <strong className="font-semibold text-slate-700">{filteredTickets.length}</strong> of{' '}
            <strong className="font-semibold text-slate-700">{tickets.length}</strong> total tickets
          </div>
          <div className="text-[11px] text-slate-400">
            Click on any top metric card to filter status immediately
          </div>
        </div>
      </div>

      {/* ── View Ticket Modal ────────────────────────────────────────────── */}
      {viewTicket && (
        <Modal
          title={`Ticket Details — ${viewTicket.id}`}
          sub={`Submitted on ${viewTicket.createdDate} by ${viewTicket.name} (${viewTicket.employeeCode})`}
          onClose={() => setViewTicket(null)}
          width={640}
          footer={
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11.5px] text-slate-500 font-medium">Update status:</span>
                <select
                  value={viewTicket.status}
                  onChange={(e) => {
                    const nextStatus = e.target.value as TicketStatus
                    setTickets((prev) =>
                      prev.map((t) =>
                        t.id === viewTicket.id
                          ? {
                              ...t,
                              status: nextStatus,
                              closingDate:
                                nextStatus === 'Closed'
                                  ? new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
                                  : t.closingDate,
                            }
                          : t
                      )
                    )
                    setViewTicket((prev) =>
                      prev
                        ? {
                            ...prev,
                            status: nextStatus,
                            closingDate:
                              nextStatus === 'Closed'
                                ? new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
                                : prev.closingDate,
                          }
                        : null
                    )
                    toast(`Ticket ${viewTicket.id} updated to ${nextStatus}`, 'success')
                  }}
                  className="h-8 px-2.5 rounded border border-slate-300 text-[12px] font-semibold text-slate-800 bg-white outline-none focus:border-[#0066FF]"
                >
                  <option value="Open">Open</option>
                  <option value="In progress">In progress</option>
                  <option value="Pending">Pending</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setViewTicket(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12.5px] font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-[12.5px]">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Employee Name
                </span>
                <span className="text-[13px] font-semibold text-slate-800">{viewTicket.name}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Employee Code
                </span>
                <span className="font-mono text-[12.5px] font-semibold text-slate-700">
                  {viewTicket.employeeCode}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Ticket Type
                </span>
                <span className="text-[12.5px] font-medium text-slate-800">{viewTicket.ticketType}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Current Status
                </span>
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold mt-0.5',
                    viewTicket.status === 'Open' && 'bg-blue-50 text-blue-700 border border-blue-200',
                    viewTicket.status === 'In progress' && 'bg-amber-50 text-amber-700 border border-amber-200',
                    viewTicket.status === 'Pending' && 'bg-purple-50 text-purple-700 border border-purple-200',
                    viewTicket.status === 'On Hold' && 'bg-slate-100 text-slate-700 border border-slate-200',
                    viewTicket.status === 'Closed' && 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  )}
                >
                  {viewTicket.status}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11.5px] font-bold text-slate-700 block mb-1">
                Help &amp; Support Topic
              </label>
              <div className="p-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 text-[13px]">
                {viewTicket.helpSupport}
              </div>
            </div>

            {viewTicket.description && (
              <div>
                <label className="text-[11.5px] font-bold text-slate-700 block mb-1">
                  Issue Description
                </label>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-700 text-[12.5px] leading-relaxed">
                  {viewTicket.description}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Raise New Ticket Modal ───────────────────────────────────────── */}
      {modalOpen && (
        <Modal
          title="Raise New Ticket"
          sub="Submit an internal support ticket for IT, operations, or account verification."
          onClose={() => setModalOpen(false)}
          width={600}
          footer={
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTicket}
                className="px-5 py-2 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-semibold transition-colors shadow-2xs"
              >
                Submit Ticket
              </button>
            </div>
          }
        >
          <form onSubmit={handleCreateTicket} className="space-y-3.5 text-[12.5px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Employee / Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ranjeet Pal"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Employee Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. DX-EMP-1042"
                  value={formEmpCode}
                  onChange={(e) => setFormEmpCode(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Ticket Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 bg-white px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                >
                  <option value="Operations & CBR">Operations &amp; CBR</option>
                  <option value="Account Mapping">Account Mapping</option>
                  <option value="Settlement & Payout">Settlement &amp; Payout</option>
                  <option value="ATM Terminal Error">ATM Terminal Error</option>
                  <option value="KYC & Verification">KYC &amp; Verification</option>
                  <option value="General Support">General Support</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Priority
                </label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as any)}
                  className="h-9 w-full rounded border border-slate-200 bg-white px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                >
                  <option value="High">High (4h SLA)</option>
                  <option value="Medium">Medium (24h SLA)</option>
                  <option value="Low">Low (48h SLA)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Help &amp; Support Topic / Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Brief summary of the issue or assistance required..."
                value={formHelpSupport}
                onChange={(e) => setFormHelpSupport(e.target.value)}
                className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Detailed Description
              </label>
              <textarea
                rows={3}
                placeholder="Provide details, error codes, site ID or ATM references..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full rounded border border-slate-200 p-2.5 text-[12.5px] outline-none focus:border-[#0066FF] resize-none"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
