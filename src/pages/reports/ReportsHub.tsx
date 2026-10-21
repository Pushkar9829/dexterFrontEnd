import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  CalendarClock,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Home,
  Landmark,
  Search,
  Settings,
  ShieldCheck,
  Table2,
  X,
  Zap,
} from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'
import { franchiseStore } from '@/data/franchises'
import {
  getReport,
  type PCol,
  type PRow,
  type ReportDef,
} from '@/data/reportsHub'
import { SavedReportsModal, ScheduledExportsModal } from './HubModals'
import { FOOTER } from './financial/Shell'

// ── Decorative corner arcs matching image reference ─────────────────────────
function CornerWaves() {
  return (
    <div className="pointer-events-none absolute bottom-0 right-0 h-28 w-28 overflow-hidden rounded-br-2xl">
      <svg viewBox="0 0 120 120" className="h-full w-full" fill="none">
        <path
          d="M20,120 C20,65 65,20 120,20 L120,120 Z"
          fill="#EBF4FD"
          fillOpacity="0.55"
        />
        <path
          d="M50,120 C50,80 80,50 120,50 L120,120 Z"
          fill="#E0EEFB"
          fillOpacity="0.75"
        />
        <path
          d="M80,120 C80,98 98,80 120,80 L120,120 Z"
          fill="#D2E6FA"
          fillOpacity="0.9"
        />
      </svg>
    </div>
  )
}

// ── Types for category cards ────────────────────────────────────────────────
interface ReportItem {
  name: string
  to?: string
  reportId?: string
  desc?: string
}

interface HubCategory {
  id: string
  title: string
  sub: string
  viewAllTo: string
  iconBg: string
  icon: ReactNode
  items: ReportItem[]
}

const fmtDateTime = (v: string) =>
  new Date(v).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  })
const fmtDate = (v: string) =>
  /^\d{4}-\d{2}-\d{2}/.test(v)
    ? new Date(`${v.slice(0, 10)}T00:00`).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : v

function renderCell(c: PCol, r: PRow): ReactNode {
  const v = r[c.key]
  if (v === '' || v == null) return <span className="text-muted">—</span>
  switch (c.kind) {
    case 'money': {
      const n = Number(v)
      return (
        <span className={cn('font-medium', n < 0 && 'text-brand-red')}>
          ₹ {n.toLocaleString('en-IN')}
        </span>
      )
    }
    case 'pct':
      return `${v}%`
    case 'num':
      return Number(v).toLocaleString('en-IN')
    case 'date':
      return fmtDate(String(v))
    case 'datetime':
      return fmtDateTime(String(v))
    case 'status': {
      const t = toneFor(String(v))
      return (
        <Badge
          tone={
            /overage|late|mismatch|reorder|due in/i.test(String(v))
              ? 'amber'
              : /shortage|breach|fail/i.test(String(v))
              ? 'red'
              : t
          }
        >
          {String(v)}
        </Badge>
      )
    }
    default:
      return String(v)
  }
}

const toGridColumns = (cols: PCol[]): GridColumn<PRow>[] =>
  cols.map((c, i) => ({
    key: c.key,
    header: c.label,
    label: c.label,
    width: i === 1 ? 200 : 130,
    sortable: true,
    filterable: !c.kind || c.kind === 'status',
    align: c.kind === 'money' || c.kind === 'num' || c.kind === 'pct' ? 'right' : 'left',
    value: (r) => r[c.key],
    render: (r) => renderCell(c, r),
  }))

export default function ReportsHub() {
  const navigate = useNavigate()
  const frs = franchiseStore.use()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [modal, setModal] = useState<'schedules' | 'saved' | null>(null)

  const q = query.trim().toLowerCase()

  // ── 5 Category Definitions from Reference Image ─────────────────────────
  const CATEGORY_CARDS: HubCategory[] = useMemo(
    () => [
      {
        id: 'operations',
        title: 'Operations',
        sub: 'Operational reports for day-to-day management and performance.',
        viewAllTo: '/operations',
        iconBg: 'bg-[#0066FF]',
        icon: <Settings size={22} className="text-white" />,
        items: [
          { name: 'Complaints', to: '/operations/complaints', desc: 'Customer and site complaints queue' },
          { name: 'Daily TXNs', to: '/operations/txn-data', desc: 'Daily transaction counts and amounts' },
          { name: 'Chargeback Disputes', to: '/operations/complaints', reportId: 'chargeback-disputes', desc: 'Disputed transactions and chargebacks' },
          { name: 'Apna App', to: '/franchise/apna-app', reportId: 'apna-app', desc: 'Apna App sync, downloads and usage' },
        ],
      },
      {
        id: 'projects',
        title: 'Projects',
        sub: 'Project and implementation related reports.',
        viewAllTo: '/projects',
        iconBg: 'bg-[#EF4444]',
        icon: <Briefcase size={22} className="text-white" />,
        items: [
          { name: 'Projects', to: '/projects/active', desc: 'Active site rollouts and status' },
          { name: 'Task', to: '/tasks/my', desc: 'Project deliverables and milestones' },
          { name: 'Email Tracker', to: '/email/inbox', desc: 'Incoming and outgoing communications' },
          { name: 'Calling Report', to: '/operations', reportId: 'calling-report', desc: 'Partner and franchisee outreach log' },
          { name: 'Notifications', to: '/notices', desc: 'Regulatory and operations broadcasts' },
        ],
      },
      {
        id: 'accounts',
        title: 'Accounts',
        sub: 'Financial and banking related reports.',
        viewAllTo: '/reports/financial/bs',
        iconBg: 'bg-[#0F2942]',
        icon: <Landmark size={22} className="text-white" />,
        items: [
          { name: 'Bank Statement', to: '/operations/bank-statement', reportId: 'bank-statement', desc: 'Statements and reconciliation records' },
          { name: 'TDS Letters', to: '/operations/tds', reportId: 'tds-letters', desc: 'Tax deduction certificates and letters' },
          { name: 'WLA Account Status / Axis / ICICI', to: '/reports/financial/axis-icd', desc: 'White label ATM account balances' },
          { name: 'Penality data', to: '/finance/gst', reportId: 'penalty-data', desc: 'SLA breach and penalty register' },
          { name: 'payout', to: '/finance/payout', desc: 'Franchise settlement payouts' },
          { name: 'GST', to: '/finance/gst', desc: 'GST invoice and tax deductions' },
        ],
      },
      {
        id: 'daily-reports',
        title: 'Daily Reports',
        sub: 'Daily operations and summary reports.',
        viewAllTo: '/cbr/consolidated',
        iconBg: 'bg-[#7C3AED]',
        icon: <FileText size={22} className="text-white" />,
        items: [
          { name: 'CBR 1', to: '/cbr/consolidated', desc: 'Daily consolidated cash balance report' },
          { name: 'CBR 2', to: '/cbr/eod-summary', desc: 'End of day summary and cash positions' },
          { name: 'CBR 3', to: '/cbr/mobile', desc: 'Mobile terminal cash reconciliation' },
          { name: 'CBR HAMP', to: '/cbr/consolidated', reportId: 'cbr-hamp', desc: 'HAMP compliance cash reports' },
          { name: 'Cash loading Fund', to: '/reports/financial/clf', desc: 'CLF instalments and loading registers' },
          { name: 'Additional Cash loading Fund', to: '/reports/financial/overage-deposit', desc: 'Overage deposits and auxiliary funds' },
          { name: 'Security Deposit', to: '/reports/financial/sd', desc: 'Franchisee security deposits' },
        ],
      },
      {
        id: 'complaint',
        title: 'Complaint',
        sub: 'Compliance and legal documentation reports.',
        viewAllTo: '/legal',
        iconBg: 'bg-[#10B981]',
        icon: <ShieldCheck size={22} className="text-white" />,
        items: [
          { name: 'Legal - LOI / Affidavite / Agreement', to: '/legal/loi', desc: 'LOI, sworn affidavits and legal contracts' },
          { name: 'FFM Cheques', to: '/legal/fm-checks', desc: 'Franchise fee management and cheques' },
          { name: 'PVC Status', to: '/legal/pvc', desc: 'Police verification certificates queue' },
        ],
      },
    ],
    [],
  )

  // ── Quick Access Items ──────────────────────────────────────────────────
  const QUICK_ACCESS_ITEMS = [
    {
      title: 'Operations',
      to: '/operations',
      bgClass: 'bg-[#F0F6FF] hover:bg-[#E2EEFC] border-[#E0EBF7]',
      icon: <Settings size={18} className="text-[#0066FF]" />,
      arrowColor: 'text-[#0066FF]',
    },
    {
      title: 'Accounts',
      to: '/reports/financial/bs',
      bgClass: 'bg-[#F0F6FF] hover:bg-[#E2EEFC] border-[#E0EBF7]',
      icon: <Landmark size={18} className="text-[#0066FF]" />,
      arrowColor: 'text-[#0066FF]',
    },
    {
      title: 'Projects',
      to: '/projects',
      bgClass: 'bg-[#FFF1F2] hover:bg-[#FFE4E6] border-[#FECDD3]',
      icon: <Briefcase size={18} className="text-[#EF4444]" />,
      arrowColor: 'text-[#EF4444]',
    },
    {
      title: 'Compliance',
      to: '/legal',
      bgClass: 'bg-[#F0FDF4] hover:bg-[#DCFCE7] border-[#BBF7D0]',
      icon: <ShieldCheck size={18} className="text-[#10B981]" />,
      arrowColor: 'text-[#10B981]',
    },
  ]

  // ── Search Filtering Logic ──────────────────────────────────────────────
  const filteredCategories = useMemo(() => {
    if (!q) return CATEGORY_CARDS
    return CATEGORY_CARDS.map((cat) => {
      const matchCat =
        cat.title.toLowerCase().includes(q) || cat.sub.toLowerCase().includes(q)
      const matchingItems = cat.items.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          (it.desc && it.desc.toLowerCase().includes(q)),
      )
      return {
        ...cat,
        items: matchCat ? cat.items : matchingItems,
        isMatch: matchCat || matchingItems.length > 0,
      }
    }).filter((cat) => cat.isMatch)
  }, [CATEGORY_CARDS, q])

  // Handle clicking on an item
  const handleItemClick = (it: ReportItem) => {
    if (it.to) {
      navigate(it.to)
    } else if (it.reportId) {
      setActiveReportId(it.reportId)
    } else {
      toast(`Opening ${it.name}`, 'info')
    }
  }

  // Active modal report definition & rows
  const activeDef: ReportDef | undefined = useMemo(
    () => (activeReportId ? getReport(activeReportId) : undefined),
    [activeReportId],
  )
  const activeRows = useMemo(() => {
    if (!activeDef) return []
    return (activeDef.build?.({ frs }) ?? []).map((r, i): PRow => ({
      ...r,
      __id: `${activeDef.id}-${i}`,
    }))
  }, [activeDef, frs])
  const activeColumns = useMemo(
    () => (activeDef ? toGridColumns(activeDef.columns ?? []) : []),
    [activeDef],
  )

  const clearSearch = () => {
    setParams((p) => {
      const n = new URLSearchParams(p)
      n.delete('q')
      return n
    }, { replace: true })
  }

  // Split categories into Row 1 (first 3) and Row 2 (next 2)
  const row1Categories = filteredCategories.filter((c) =>
    ['operations', 'projects', 'accounts'].includes(c.id),
  )
  const row2Categories = filteredCategories.filter((c) =>
    ['daily-reports', 'complaint'].includes(c.id),
  )

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 pb-12 font-sans">
      {/* ── 1. Top Breadcrumb ────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="mb-3.5 flex items-center gap-2 text-[12px] text-[#64748B]">
        <Link
          to="/dashboard"
          className="flex items-center gap-1 text-[#0066FF] transition-colors hover:text-[#0052CC]"
          title="Home"
        >
          <Home size={15} />
        </Link>
        <ChevronRight size={13} className="shrink-0 text-[#94A3B8]" />
        <Link to="/dashboard" className="transition-colors hover:text-[#1E293B]">
          Workspace
        </Link>
        <ChevronRight size={13} className="shrink-0 text-[#94A3B8]" />
        <span className="font-semibold text-[#0F172A]">Reports &amp; MIS</span>
      </nav>

      {/* ── 2. Hero Banner ────────────────────────────────────────────────── */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-[#142B59] bg-[#0A1A3C] shadow-md">
        {/* City Skyline background graphic with soft gradient mask */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden sm:w-7/12 md:w-1/2">
          <img
            src="/reports-skyline.jpg"
            alt="City Skyline"
            className="h-full w-full object-cover object-center opacity-45 mix-blend-screen"
          />
          {/* Smooth horizontal gradient mask fading from dark navy */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1A3C] via-[#0A1A3C]/80 to-transparent" />
          
          {/* Sleek diagonal accent stripes */}
          <div className="absolute right-36 top-1/2 hidden -translate-y-1/2 items-center gap-2 md:flex">
            <div className="h-28 w-2 -skew-x-[24deg] rounded-full bg-[#EF4444] shadow-md shadow-red-500/25" />
            <div className="h-28 w-2 -skew-x-[24deg] rounded-full bg-[#0066FF] shadow-md shadow-blue-500/25" />
          </div>
        </div>

        {/* Ambient wave SVG lines */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
          preserveAspectRatio="none"
          viewBox="0 0 1200 160"
        >
          <path
            d="M0,80 C300,160 600,0 900,80 C1050,120 1150,40 1200,60"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="1.5"
          />
          <path
            d="M0,110 C350,20 700,140 1000,60 C1100,30 1180,90 1200,80"
            fill="none"
            stroke="#60A5FA"
            strokeWidth="1"
          />
        </svg>

        <div className="relative z-10 flex min-h-[105px] flex-wrap items-center justify-between gap-4 px-6 py-5">
          {/* Left Title & Bar Chart Icon */}
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-end justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 p-2.5 shadow-sm backdrop-blur-md">
              <span className="h-3.5 w-1.5 rounded-t-sm bg-white" />
              <span className="h-6 w-1.5 rounded-t-sm bg-white" />
              <span className="h-4.5 w-1.5 rounded-t-sm bg-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-[23px] font-bold tracking-tight text-white">
                Reports &amp; MIS
              </h1>
              <p className="mt-0.5 text-[12.5px] font-normal text-blue-200/90">
                Access and manage all reports in one place
              </p>
            </div>
          </div>

          {/* Right Dexter Badge & Hub utilities */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                variant="secondary"
                size="sm"
                icon={<CalendarClock size={14} />}
                onClick={() => setModal('schedules')}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                Schedules
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Bookmark size={14} />}
                onClick={() => setModal('saved')}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                Saved
              </Button>
            </div>

            <div className="flex items-center rounded-xl border border-white/20 bg-white/15 px-3 py-1.5 shadow-lg backdrop-blur-md">
              <img
                src="/dexter-logo.png"
                alt="Dexter India"
                className="h-9 w-auto object-contain drop-shadow"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Search Bar Indicator (if query exists) ────────────────── */}
      {q && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2.5 text-[12.5px] text-[#1E40AF]">
          <div className="flex items-center gap-2">
            <Search size={15} />
            <span>
              Showing results for: <strong className="font-semibold">"{query}"</strong>
            </span>
          </div>
          <button
            onClick={clearSearch}
            className="flex items-center gap-1 font-semibold text-[#0066FF] hover:underline"
          >
            <X size={14} /> Clear search
          </button>
        </div>
      )}

      {/* ── Main Layout: 5 Cards Grid (Left) + Quick Access (Right) ───────── */}
      <div className="flex flex-col items-start gap-5 xl:flex-row">
        {/* Left Area: Rows of Categories */}
        <div className="min-w-0 flex-1 space-y-5 w-full">
          {filteredCategories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center">
              <FileText size={36} className="mx-auto text-[#94A3B8]" />
              <h3 className="mt-3 text-[15px] font-semibold text-[#1E293B]">
                No reports matched "{query}"
              </h3>
              <p className="mt-1 text-[13px] text-[#64748B]">
                Try searching with different keywords like "CBR", "GST", "Complaints", or "KYC".
              </p>
              <button
                onClick={clearSearch}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0052CC]"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <>
              {/* Row 1: Operations, Projects, Accounts (3 columns) */}
              {row1Categories.length > 0 && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {row1Categories.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      onItemClick={handleItemClick}
                      onPreviewReport={(id) => setActiveReportId(id)}
                    />
                  ))}
                </div>
              )}

              {/* Row 2: Daily Reports, Complaint (2 columns) */}
              {row2Categories.length > 0 && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {row2Categories.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      onItemClick={handleItemClick}
                      onPreviewReport={(id) => setActiveReportId(id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Area: Quick Access Column */}
        <div className="w-full shrink-0 xl:w-[260px] 2xl:w-[276px]">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
            {/* Header */}
            <div className="flex items-start gap-2.5">
              <Zap size={22} className="shrink-0 text-[#0066FF] fill-[#0066FF]" />
              <div>
                <h3 className="text-[15.5px] font-bold text-[#1E293B]">Quick Access</h3>
                <p className="mt-0.5 text-[11px] text-[#64748B] leading-tight">
                  Get to your important reports faster
                </p>
              </div>
            </div>

            {/* Quick Access List */}
            <div className="mt-4 space-y-2.5">
              {QUICK_ACCESS_ITEMS.map((item) => (
                <Link
                  key={item.title}
                  to={item.to}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-3 transition-all duration-150 hover:translate-x-0.5',
                    item.bgClass,
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-xs">
                      {item.icon}
                    </span>
                    <span className="text-[13px] font-semibold text-[#1E293B]">
                      {item.title}
                    </span>
                  </div>
                  <ArrowRight size={16} className={cn('shrink-0', item.arrowColor)} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer note ───────────────────────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#64748B]">
        <span>{FOOTER}</span>
        <span>All timestamps in IST (UTC+5:30) · Amounts in INR</span>
      </div>

      {/* ── Interactive Report Data Grid Modal ─────────────────────────────── */}
      {activeDef && (
        <Modal
          title={activeDef.name}
          sub={`${activeDef.desc} · ${activeRows.length.toLocaleString('en-IN')} records · Source: ${activeDef.source ?? 'Switch MIS'}`}
          onClose={() => setActiveReportId(null)}
          width={1200}
          footer={
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download size={14} />}
                  onClick={() => {
                    const cols = activeDef.columns ?? []
                    downloadCsv(
                      `${activeDef.id}-export`,
                      cols.map((c) => c.label),
                      activeRows.map((r) => cols.map((c) => String(r[c.key] ?? ''))),
                    )
                    toast(`Exported ${activeRows.length} rows to CSV`)
                  }}
                >
                  Export CSV
                </Button>
                {activeDef.gridTo && (
                  <Link
                    to={activeDef.gridTo}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface"
                  >
                    Go to module <ExternalLink size={13} />
                  </Link>
                )}
              </div>
              <Button onClick={() => setActiveReportId(null)}>Close</Button>
            </div>
          }
        >
          <div className="space-y-3">
            <ExcelGrid
              title={activeDef.name}
              countLabel={`${activeRows.length.toLocaleString('en-IN')} records`}
              rows={activeRows}
              columns={activeColumns}
              rowId={(r) => String(r.__id)}
              letters
              selectable
              formulaBar
              pageSize={15}
              searchPlaceholder={`Search within ${activeDef.name}`}
              exportName={activeDef.id}
            />
          </div>
        </Modal>
      )}

      {/* ── Scheduled Exports Modal ───────────────────────────────────────── */}
      {modal === 'schedules' && (
        <ScheduledExportsModal
          onClose={() => setModal(null)}
          defaultReport="cash-reconciliation"
        />
      )}

      {/* ── Saved Reports Modal ───────────────────────────────────────────── */}
      {modal === 'saved' && (
        <SavedReportsModal
          onClose={() => setModal(null)}
          current={{
            reportId: 'cash-reconciliation',
            category: 'all',
            range: 'month',
            query: query,
          }}
          onOpen={(v) => {
            setModal(null)
            if (v.query) {
              setParams((p) => {
                const n = new URLSearchParams(p)
                n.set('q', v.query)
                return n
              })
            }
            toast(`Opened saved view “${v.name}”`, 'info')
          }}
        />
      )}
    </div>
  )
}

// ── Category Card Component ─────────────────────────────────────────────────
function CategoryCard({
  category,
  onItemClick,
  onPreviewReport,
}: {
  category: HubCategory
  onItemClick: (item: ReportItem) => void
  onPreviewReport: (reportId: string) => void
}) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs transition-all duration-200 hover:border-[#CBD5E1] hover:shadow-sm">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs',
                category.iconBg,
              )}
            >
              {category.icon}
            </span>
            <div>
              <h2 className="text-[16px] font-bold text-[#1E293B]">
                {category.title}
              </h2>
              <p className="mt-0.5 text-[11.5px] text-[#64748B] leading-snug">
                {category.sub}
              </p>
            </div>
          </div>

          {/* View All link */}
          <Link
            to={category.viewAllTo}
            className="group flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-[#0066FF] transition-colors hover:text-[#0052CC]"
          >
            <span>View All</span>
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        {/* Items List */}
        <div className="relative z-10 mt-4 space-y-1">
          {category.items.map((item) => (
            <div
              key={item.name}
              className="group flex items-center justify-between rounded-lg py-1.5 px-2 transition-colors hover:bg-[#F0F6FF]"
            >
              <button
                type="button"
                onClick={() => onItemClick(item)}
                className="flex flex-1 items-center gap-2.5 truncate text-left"
                title={item.desc ?? item.name}
              >
                <FileText
                  size={15}
                  className="shrink-0 text-[#2563EB]/75 transition-colors group-hover:text-[#0066FF]"
                />
                <span className="truncate text-[13px] font-medium text-[#334155] transition-colors group-hover:text-[#0066FF]">
                  {item.name}
                </span>
              </button>

              <div className="flex items-center gap-1">
                {item.reportId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onPreviewReport(item.reportId!)
                    }}
                    className="p-1 text-[#94A3B8] opacity-0 transition-opacity hover:text-[#0066FF] group-hover:opacity-100"
                    title="Preview data table"
                    aria-label={`Preview ${item.name}`}
                  >
                    <Table2 size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onItemClick(item)}
                  className="p-1 text-[#94A3B8] transition-colors group-hover:text-[#0066FF]"
                  aria-label={`Open ${item.name}`}
                >
                  <ChevronRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Aesthetic bottom-right concentric waves graphic */}
      <CornerWaves />
    </div>
  )
}
