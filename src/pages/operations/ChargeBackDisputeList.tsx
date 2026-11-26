import { useMemo, useState } from 'react'
import { SiteRef } from '@/lib/siteRef'
import { Link, useNavigate } from 'react-router-dom'
import { AlarmClock, Bell, ChevronRight, Download, Home, Import, Search } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/KpiCard'
import { cn } from '@/lib/cn'
import { useSchedules } from '@/data/workflow'
import { CB_STAGES, cbLoader, cbStage, cbStatus, exportChargeBackCsv, isCbOverdue, reminderPlan, useCbLoad, useChargebacks, type CbStage } from '@/data/chargeBackDisputes'
import { canCrmAct, useOpsUser } from './recon2/opsAccess'
import { ActingAs, Countdown, LoadBanner, StageChart } from './recon2/shared'
import { CB_STAGE_COLORS, fmtDt, rupees, useNow, useReminderProcessor } from './recon2/util'

export default function ChargeBackDisputeList() {
  const list = useChargebacks()
  const load = useCbLoad()
  const schedules = useSchedules()
  const navigate = useNavigate()
  const u = useOpsUser()
  const now = useNow(1000)
  useReminderProcessor()
  const [q, setQ] = useState('')
  const [stage, setStage] = useState<CbStage | ''>('')
  const [funding, setFunding] = useState('')
  const [onlyOverdue, setOnlyOverdue] = useState(false)

  const counts = useMemo(() => Object.fromEntries(CB_STAGES.map((s) => [s, list.filter((r) => cbStage(r) === s).length])) as Record<CbStage, number>, [list])
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return list.filter(
      (r) =>
        (!stage || cbStage(r) === stage) &&
        (!funding || r.fundingModel === funding) &&
        (!onlyOverdue || isCbOverdue(r)) &&
        (!t || [r.id, r.caseRef, r.atmId, r.rrn, r.cardNumber, r.franchiseName, r.reason].join(' ').toLowerCase().includes(t)),
    )
  }, [list, q, stage, funding, onlyOverdue])
  const overdue = list.filter((r) => isCbOverdue(r, now))
  const dueSoon = list.filter((r) => !isCbOverdue(r, now) && !r.report?.submittedAt && !r.closure && new Date(r.dueAt).getTime() - now < 4 * 3600_000)
  const sentToday = list.reduce((s, r) => s + r.reminders.filter((x) => new Date(x.loggedAt).toDateString() === new Date(now).toDateString()).length, 0)
  const planBucket = Math.floor(now / 60_000)
  const upcoming = useMemo(
    () =>
      list
        .flatMap((r) => reminderPlan(r, schedules, planBucket * 60_000).filter((p) => p.state === 'Upcoming').map((p) => ({ ...p, ref: r.id })))
        .sort((a, b) => a.slot.localeCompare(b.slot))
        .slice(0, 6),
    [list, schedules, planBucket],
  )

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 pb-12">
      <div className="mb-3 flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="shrink-0 text-slate-400" />
        <Link to="/operations" className="hover:text-primary">Operations</Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/operations/reconciliation" className="hover:text-primary">Reconciliation</Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Chargeback Disputes</span>
      </div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Chargeback Disputes</h1>
          <p className="mt-0.5 text-[13px] text-muted">Full Funding & Self Funding — NPCI / bank notice → AI draft → CRM verification → franchise evidence → response report within 24 h → closure.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Download size={14} />} onClick={() => exportChargeBackCsv(rows)}>Export</Button>
          {canCrmAct(u) && <Button icon={<Import size={14} />} onClick={() => navigate('/operations/reconciliation/charge-back/new')}>Import NPCI / Bank email or file</Button>}
        </div>
      </div>
      <div className="mb-4"><ActingAs /></div>
      <LoadBanner state={load} onRetry={() => cbLoader.reload()} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open chargebacks" value={list.filter((r) => !r.closure).length} caption={`${rupees(list.filter((r) => !r.closure).reduce((s, r) => s + r.disputeAmount, 0))} disputed`} />
        <StatCard label="Overdue (24 h breached)" value={<span className={overdue.length ? 'text-red-600' : ''}>{overdue.length}</span>} caption="Response report not submitted in time" icon={<AlarmClock size={16} />} />
        <StatCard label="Due in < 4 h" value={dueSoon.length} caption="Prioritise these" />
        <StatCard label="Reminders sent today" value={sentToday} caption="Franchise 3/day · CRM 2/day (Setup)" icon={<Bell size={16} />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search size={14} className="absolute top-2.5 left-2.5 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, case ref, ATM, RRN, card, franchise…" className="h-9 w-full rounded-md border border-line bg-white pr-3 pl-8 text-[12.5px] outline-none focus:border-primary" />
            </div>
            <select aria-label="Funding" value={funding} onChange={(e) => setFunding(e.target.value)} className="h-9 rounded-md border border-line bg-white px-2 text-[12px]">
              <option value="">Full + Self Funding</option>
              <option>Full Funding</option>
              <option>Self Funding</option>
            </select>
            <label className="flex items-center gap-1.5 text-[12px]"><input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} /> Overdue only</label>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[1000px] text-[12px]">
              <thead className="bg-surface text-left text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Dispute ID</th>
                  <th className="px-3 py-2 font-medium">Source / received</th>
                  <th className="px-3 py-2 font-medium">ATM / franchise</th>
                  <th className="px-3 py-2 font-medium">Funding</th>
                  <th className="px-3 py-2 font-medium">RRN / reason</th>
                  <th className="px-3 py-2 text-right font-medium">Dispute amt</th>
                  <th className="px-3 py-2 font-medium">Stage / status</th>
                  <th className="px-3 py-2 font-medium">24 h response</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const od = isCbOverdue(r, now)
                  return (
                    <tr key={r.id} onClick={() => navigate(`/operations/reconciliation/charge-back/${r.id}`)} className={cn('cursor-pointer border-t border-line/70 align-top hover:bg-surface/60', od && 'bg-red-50/70 hover:bg-red-50')}>
                      <td className="px-3 py-2 font-semibold text-primary">{r.id}<div className="text-[11px] font-normal text-muted">{r.caseRef}</div></td>
                      <td className="px-3 py-2">{r.source}<div className="text-[11px] text-muted">{fmtDt(r.receivedAt)}</div></td>
                      <td className="px-3 py-2"><span onClick={(e) => e.stopPropagation()}><SiteRef id={r.atmId} /></span><div className="text-[11px] text-muted">{r.franchiseName}</div></td>
                      <td className="px-3 py-2"><Badge tone={r.fundingModel === 'Self Funding' ? 'purple' : 'navy'} dot={false}>{r.fundingModel}</Badge></td>
                      <td className="max-w-[220px] px-3 py-2">{r.rrn}<div className="truncate text-[11px] text-muted">{r.reason}</div></td>
                      <td className="px-3 py-2 text-right font-semibold">{rupees(r.disputeAmount)}</td>
                      <td className="px-3 py-2"><span className="block text-[11px] font-semibold" style={{ color: CB_STAGE_COLORS[cbStage(r)] }}>{cbStage(r)}</span><Badge tone={toneFor(cbStatus(r, now))}>{cbStatus(r, now)}</Badge></td>
                      <td className="px-3 py-2">{r.closure ? <span className="text-[11px] text-muted">Closed</span> : <Countdown dueAt={r.dueAt} now={now} stoppedAt={r.report?.submittedAt} />}</td>
                    </tr>
                  )
                })}
                {!rows.length && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted">No chargebacks match.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="mb-3 text-[13px] font-semibold">Status chart</div>
            <StageChart stages={CB_STAGES} counts={counts} active={stage} onPick={setStage} colors={CB_STAGE_COLORS} />
          </div>
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold"><Bell size={14} /> Next reminders</div>
            <div className="space-y-1.5">
              {upcoming.map((p) => (
                <div key={`${p.ref}-${p.key}`} className="flex items-center gap-2 text-[11.5px]">
                  <Badge tone={p.audience === 'Franchise' ? 'purple' : 'blue'} dot={false}>{p.audience}</Badge>
                  <span className="font-semibold">{p.ref}</span>
                  <span className="ml-auto text-muted">{fmtDt(p.slot)}</span>
                </div>
              ))}
              {!upcoming.length && <p className="text-[12px] text-muted">No upcoming reminders.</p>}
            </div>
            <p className="mt-2 text-[11px] text-muted">Times come from Setup › notification schedule; reminders are logged automatically when due.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
