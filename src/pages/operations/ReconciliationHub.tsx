import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight, Home, RotateCcw, Scale } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'
import { Badge } from '@/components/ui/Badge'
import { FTD_STATUSES, useFailedTxnDisputes, useFtdLoad, type FtdStatus } from '@/data/failedTxnDisputes'
import { CB_STAGES, cbStage, isCbOverdue, useCbLoad, useChargebacks, type CbStage } from '@/data/chargeBackDisputes'
import { useLoaders } from '@/data/opsApi'
import { Countdown, LoadBanner, StageChart } from './recon2/shared'
import { CB_STAGE_COLORS, useNow, useReminderProcessor } from './recon2/util'

interface ReconciliationTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof AlertTriangle
  theme: HubTileTheme
  tag: string
  reportsCount: string
  badge: string
  actionText: string
}

const RECONCILIATION_TILES: ReconciliationTileConfig[] = [
  {
    title: 'FAILED TXNS DISPUTE',
    sub: 'Self Funding focus — CRM / franchise entry, CRM verification, Admin approval, bank email, follow-up and closure.',
    to: '/operations/reconciliation/failed-txns',
    Icon: AlertTriangle,
    theme: 'rose',
    tag: 'ATM Reversals',
    reportsCount: 'Disputes',
    badge: 'Maker-checker',
    actionText: 'View failed TXNs',
  },
  {
    title: 'CHARGE BACK DISPUTE',
    sub: 'NPCI / bank notices → AI draft → franchise evidence → CBR / Cash Loading check → 24 h response report.',
    to: '/operations/reconciliation/charge-back',
    Icon: RotateCcw,
    theme: 'indigo',
    tag: 'Chargebacks',
    reportsCount: 'Claims',
    badge: '24 h SLA',
    actionText: 'Manage chargebacks',
  },
]

export default function ReconciliationHub() {
  const ftd = useFailedTxnDisputes()
  const cbs = useChargebacks()
  const load = useLoaders({ use: useFtdLoad }, { use: useCbLoad })
  const now = useNow(1000)
  useReminderProcessor()
  const ftdCounts = useMemo(() => Object.fromEntries(FTD_STATUSES.map((s) => [s, ftd.filter((r) => r.status === s).length])) as Record<FtdStatus, number>, [ftd])
  const cbCounts = useMemo(() => Object.fromEntries(CB_STAGES.map((s) => [s, cbs.filter((r) => cbStage(r) === s).length])) as Record<CbStage, number>, [cbs])
  const urgent = cbs.filter((r) => !r.report?.submittedAt && !r.closure).sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 5)

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 pb-12 font-sans">
      <div className="mb-3 flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="shrink-0 text-slate-400" />
        <Link to="/dashboard" className="transition-colors hover:text-[#0066FF]">Workspace</Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/operations" className="transition-colors hover:text-[#0066FF]">Operations</Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Reconciliation</span>
      </div>

      <div className="mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-[#0066FF] shadow-xs">
            <Scale size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Reconciliation & Dispute Management</h1>
            <p className="mt-0.5 text-[13px] text-muted">Full Funding and Self Funding source records, evidence, approvals and response timelines are kept strictly separate (§11 / §11.3).</p>
          </div>
        </div>
      </div>

      <LoadBanner state={load} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,560px)_1fr]">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          {RECONCILIATION_TILES.map((tile) => (
            <HubTile key={tile.title} {...tile} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="mb-3 text-[13px] font-semibold">Chargeback status</div>
            <StageChart stages={CB_STAGES} counts={cbCounts} colors={CB_STAGE_COLORS} />
          </div>
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="mb-3 text-[13px] font-semibold">Failed txn disputes</div>
            <StageChart stages={FTD_STATUSES.filter((s) => ftdCounts[s] > 0)} counts={ftdCounts} />
          </div>
          <div className="rounded-xl border border-line bg-white p-4 md:col-span-2">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold">Chargeback response clock <Badge tone="red">{cbs.filter((r) => isCbOverdue(r, now)).length} overdue</Badge></div>
            <div className="space-y-2">
              {urgent.map((r) => (
                <Link key={r.id} to={`/operations/reconciliation/charge-back/${r.id}`} className="flex flex-wrap items-center gap-2 rounded-md border border-line px-3 py-2 text-[12px] hover:bg-surface">
                  <b className="text-primary">{r.id}</b>
                  <span className="text-muted">{r.atmId} · {r.fundingModel} · {cbStage(r)}</span>
                  <span className="ml-auto"><Countdown dueAt={r.dueAt} now={now} /></span>
                </Link>
              ))}
              {!urgent.length && <p className="text-[12px] text-muted">No open chargeback awaiting a response report.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
