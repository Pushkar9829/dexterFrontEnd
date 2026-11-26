import { useMemo, useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell as PieCell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BarChart3, CheckCircle2, Eye, FileSpreadsheet, Info, PencilLine, PieChart as PieIcon, RefreshCw, Scale, Search, Settings2, Sparkles, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DEDUCTION_LABELS, EXPENSE_HEADS, logPayout, monthLabel, sumP, type Deductions, type PayoutLine } from '@/data/payout'
import { cn } from '@/lib/cn'
import { BM_LINK, frLink, mfLink, MONTHLY_LINK, reconInsights, type Finding } from './ai'
import { actor, bmReconOf, logExport, groupBm, inr0, inr2, pct1, signed, type BmRow, type FrRow, type Model, type View } from './compute'
import { AiNotice, DataTable, KV, Panel, ProvisionalNote, StatusBadge, type DCol, type DFilter } from './ui'

const COLORS = { green: '#009b73', red: '#e52429', amber: '#f5a524', gray: '#94a3b8', blue: '#1675f8', navy: '#1e3f95', purple: '#7439ed', teal: '#0ea5a4' }
const HEAD_COLORS = [COLORS.navy, COLORS.amber, COLORS.teal, COLORS.purple, COLORS.blue, COLORS.gray]
const axisK = (v: number) => (Math.abs(v) >= 1e7 ? `${Math.round(v / 1e7)}L` : Math.abs(v) >= 1e5 ? `${Math.round(v / 1e5)}K` : String(Math.round(v / 100)))
const tipMoney = (v: unknown) => inr0(Number(v))
const ml = (m: string) => (m ? monthLabel(m) : 'All months')

function ChartBox({ title, sub, children, empty }: { title: string; sub?: string; children: ReactElement; empty?: boolean }) {
  return (
    <Panel title={title} sub={sub} icon={<BarChart3 size={16} />}>
      {empty ? (
        <div className="grid h-[220px] place-items-center text-[12px] text-muted">No records for the selected filters.</div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  )
}

const toneIcon = (t: Finding['tone']) =>
  t === 'green' ? <CheckCircle2 size={15} className="text-emerald-600" /> : t === 'red' ? <XCircle size={15} className="text-red-600" /> : t === 'amber' ? <AlertTriangle size={15} className="text-amber-500" /> : t === 'gray' ? <Info size={15} className="text-slate-400" /> : <Search size={15} className="text-bright" />

// ── row drill-down: every source side by side (traceability) ─────────────
const COMPONENTS: { label: string; get: (l: PayoutLine) => number; money?: boolean }[] = [
  { label: '01 Cash (count)', get: (l) => l.txn.cash },
  { label: '02 Non Cash (count)', get: (l) => l.txn.nonCash },
  { label: '03 Post Cash (count)', get: (l) => l.txn.postCash },
  { label: '04 Post Non Cash (count)', get: (l) => l.txn.postNonCash },
  { label: '05 Deposit (count)', get: (l) => l.txn.deposit },
  { label: '06 Franchisee Gross Revenue', get: (l) => l.gross, money: true },
  ...(['fixedFee', 'negativeFixedFee', 'iciciSr', 'ntPenalty', 'alf', 'recovery', 'waiver', 'additionalRecovery', 'credit'] as (keyof Deductions)[]).map((k, i) => ({
    label: `${String(7 + i).padStart(2, '0')} ${DEDUCTION_LABELS[k]}`, get: (l: PayoutLine) => l.ded[k], money: true,
  })),
  { label: '16 FR Payout Without TDS', get: (l) => l.withoutTds, money: true },
  { label: '17 TDS / GST %', get: (l) => l.taxPct },
  { label: '18 TDS / GST Amount', get: (l) => l.taxAmt, money: true },
  { label: '19 Net Payout', get: (l) => l.net, money: true },
]
export function FrDetailModal({ row, onClose }: { row: FrRow; onClose: () => void }) {
  const srcs: [string, PayoutLine | undefined][] = [['Manual', row.manual], ['File-Based', row.file], ['Auto', row.auto]]
  return (
    <Modal title={`${row.atmId} · ${row.frName}`} sub={`${ml(row.month)} · Site ${row.siteId} · MF ${row.mfName}`} onClose={onClose} width={860}
      footer={<><Link to={frLink(row.atmId, row.month)} className="text-[12px] font-semibold text-primary hover:underline">Open in Franchisee register</Link><Link to={MONTHLY_LINK} className="ml-4 text-[12px] font-semibold text-primary hover:underline">Correct in Monthly Payout</Link></>}>
      <div className="mb-3 flex flex-wrap gap-2"><StatusBadge s={row.recon} /><StatusBadge s={row.payStatus} /><span className="text-[12px] text-muted">AI remark: {row.remark}</span></div>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-primary-soft/70 text-left text-[11px] font-semibold text-ink-2">
              <th className="px-2 py-2">Component (§5.2)</th>
              {srcs.map(([n, l]) => <th key={n} className="px-2 py-2 text-right">{n}{l ? '' : ' (missing)'}</th>)}
            </tr>
          </thead>
          <tbody>
            {COMPONENTS.map((c) => {
              const vals = srcs.map(([, l]) => (l ? c.get(l) : null))
              const differ = new Set(vals.filter((x) => x !== null)).size > 1
              return (
                <tr key={c.label} className={cn('border-t border-line-soft', differ && 'bg-amber-50')}>
                  <td className="px-2 py-1.5">{c.label}</td>
                  {vals.map((x, i) => <td key={i} className="px-2 py-1.5 text-right tabular-nums">{x === null ? '—' : c.money ? inr2(x) : x}</td>)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <KV items={srcs.map(([n, l]) => [`${n} record`, l ? `${l.id} · batch ${l.batchId} · plan ${l.planCode ?? '—'}` : 'Not available'] as [string, string]).concat([['Manual vs Auto', row.mVa === null ? '—' : signed(row.mVa)], ['File vs Auto', row.fVa === null ? '—' : signed(row.fVa)], ['Manual vs File', row.mVf === null ? '—' : signed(row.mVf)], ['UTR / Paid date', `${row.line.utr ?? '—'} / ${row.line.paidDate ?? '—'}`]])} />
      </div>
    </Modal>
  )
}

// ── ATM-wise reconciliation & variance (design) ──────────────────────────
type Chip = 'All' | 'Matched' | 'Variance' | 'Pending'
export function ReconTable({ rows, onAnalyze }: { rows: FrRow[]; onAnalyze?: () => void }) {
  const [chip, setChip] = useState<Chip>('All')
  const [open, setOpen] = useState<FrRow | null>(null)
  const count = (c: Chip) => (c === 'All' ? rows.length : rows.filter((r) => (c === 'Matched' ? r.recon === 'Matched' : c === 'Variance' ? r.recon === 'Variance Found' : r.recon === 'Data Pending')).length)
  const shown = useMemo(() => (chip === 'All' ? rows : rows.filter((r) => (chip === 'Matched' ? r.recon === 'Matched' : chip === 'Variance' ? r.recon === 'Variance Found' : r.recon === 'Data Pending'))), [rows, chip])
  const diff = (v: number | null) => (v === null ? '—' : v)
  const cols = useMemo<DCol<FrRow>[]>(() => [
    { label: 'ATM ID', value: (r) => r.atmId, cell: (r) => <span className="font-semibold text-primary">{r.atmId}</span> },
    { label: 'Site ID', value: (r) => r.siteId },
    { label: 'Franchisee Name', value: (r) => r.frName },
    { label: 'Manual Payout', kind: 'money', value: (r) => r.manual?.net ?? 0, cell: (r) => (r.manual ? inr2(r.manual.net) : '—') },
    { label: 'File Payout', kind: 'money', value: (r) => r.file?.net ?? 0, cell: (r) => (r.file ? inr2(r.file.net) : '—') },
    { label: 'Auto Payout', kind: 'money', value: (r) => r.auto?.net ?? 0, cell: (r) => (r.auto ? inr2(r.auto.net) : '—') },
    { label: 'Manual vs Auto', kind: 'money', value: (r) => diff(r.mVa) as number, cell: (r) => <Var v={r.mVa} /> },
    { label: 'File vs Auto', kind: 'money', value: (r) => diff(r.fVa) as number, cell: (r) => <Var v={r.fVa} /> },
    { label: 'Manual vs File', kind: 'money', value: (r) => diff(r.mVf) as number, cell: (r) => <Var v={r.mVf} /> },
    { label: 'Status', kind: 'status', value: (r) => r.recon },
    { label: 'AI Remark', value: (r) => r.remark },
    {
      label: 'Action', value: () => '', cell: (r) => (
        <span className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); setOpen(r) }} className="text-bright" aria-label={`View ${r.atmId}`} title="View calculation"><Eye size={15} /></button>
          {r.recon !== 'Matched' && <Link to={MONTHLY_LINK} onClick={(e) => e.stopPropagation()} className="text-bright" aria-label={`Correct ${r.atmId}`} title="Correct / resolve in Monthly Payout"><PencilLine size={15} /></Link>}
        </span>
      ),
    },
  ], [])
  const filters = useMemo<DFilter<FrRow>[]>(() => [{ label: 'MF', get: (r) => r.mfName }, { label: 'State', get: (r) => r.state }], [])
  return (
    <>
      <DataTable
        title="ATM-Wise Reconciliation & Variance Details" icon={<FileSpreadsheet size={16} />} cols={cols} rows={shown} filters={filters} rowKey={(r) => r.key} onRowClick={setOpen}
        fileName="ATM_Reconciliation_Variance" onExport={logExport('ATM-wise reconciliation')}
        chips={
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'Matched', 'Variance', 'Pending'] as Chip[]).map((c) => (
              <button key={c} onClick={() => setChip(c)} className={cn('h-9 w-[112px] rounded-md border text-[12px] font-semibold', chip === c ? 'border-bright bg-bright text-white' : 'border-line bg-white text-ink-2')}>
                {c} ({count(c)})
              </button>
            ))}
          </div>
        }
        toolbar={onAnalyze && <Button variant="secondary" icon={<Sparkles size={14} className="text-violet-600" />} onClick={onAnalyze}>AI Analyze</Button>}
      />
      {open && <FrDetailModal row={open} onClose={() => setOpen(null)} />}
    </>
  )
}
function Var({ v }: { v: number | null }) {
  if (v === null) return <span className="text-muted">—</span>
  return <span className={cn('font-medium', v > 0 ? 'text-emerald-700' : v < 0 ? 'text-red-600' : 'text-ink-2')}>{v > 0 ? '+' : ''}{inr0(v).replace('₹', '')}</span>
}

// ── AI insights panel (design) ───────────────────────────────────────────
export function AiInsightsPanel({ m, v, month }: { m: Model; v: View; month: string }) {
  const [runAt, setRunAt] = useState(() => new Date().toLocaleTimeString('en-IN'))
  const [nonce, setNonce] = useState(0)
  const items = useMemo(() => reconInsights(v, m.snap, month), [v, m.snap, month, nonce]) // eslint-disable-line react-hooks/exhaustive-deps
  const rerun = () => {
    setNonce((n) => n + 1)
    setRunAt(new Date().toLocaleTimeString('en-IN'))
    logPayout({ by: actor(), area: 'AI Intelligence', ref: `Reconciliation ${ml(month)}`, action: 'AI cross-check analysis re-run (read-only)' })
  }
  return (
    <Panel title="AI Insights & Cross Checks" icon={<Sparkles size={16} className="text-violet-600" />} sub={`Last run ${runAt}`}>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px] text-ink-2">
            <span className="mt-px shrink-0">{toneIcon(it.tone)}</span>
            <span>{it.to ? <Link to={it.to} className="hover:text-primary hover:underline">{it.text}</Link> : it.text}</span>
          </li>
        ))}
      </ul>
      <Button className="mt-4 w-full bg-violet-600 hover:bg-violet-700" icon={<RefreshCw size={14} />} onClick={rerun}>Run AI analysis again</Button>
      <AiNotice className="mt-3" />
    </Panel>
  )
}

// ── Consolidated ─────────────────────────────────────────────────────────
export function ConsolidatedSection({ m, v, month, onAnalyze }: { m: Model; v: View; month: string; onAnalyze: () => void }) {
  const d = useMemo(() => {
    const src = (k: 'manual' | 'file' | 'auto') => {
      const ls = v.fr.map((r) => r[k]).filter(Boolean)
      const gross = sumP(ls.map((l) => l!.gross))
      const net = sumP(ls.map((l) => l!.net))
      return { n: ls.length, gross, ded: gross - net, net }
    }
    const s = { manual: src('manual'), file: src('file'), auto: src('auto') }
    const frSites = new Set(v.fr.map((r) => r.atmId)).size
    const bmSites = new Set(v.bm.map((r) => r.site.atmId)).size
    const tl = sumP(m.snap.tl.shares.filter((x) => !month || x.month === month).map((x) => x.share))
    const frPendingN = v.fr.filter((r) => r.payStatus !== 'Paid').length
    const kycN = new Set(v.fr.filter((r) => r.acct !== 'Verified').map((r) => r.frId)).size
    const utrN = v.fr.filter((r) => !r.line.utr).length
    const bmExp = m.snap.business.expenses.filter((e) => v.bm.some((r) => r.month === e.month && r.site.atmId === e.atmId) && e.status !== 'Paid' && e.status !== 'Rejected')
    return {
      s, frSites, bmSites, tl, frPendingN, kycN, utrN, bmExp,
      variance: v.fr.filter((r) => r.recon === 'Variance Found').length,
      missing: v.fr.filter((r) => r.recon === 'Data Pending').length,
      processed: v.fr.filter((r) => r.auto).length,
      frGross: sumP(v.fr.map((r) => r.line.gross)), frDed: sumP(v.fr.map((r) => r.line.gross - r.line.net)), frNet: sumP(v.fr.map((r) => r.line.net)), mfNet: sumP(v.mf.map((x) => x.net)),
      bmRecv: sumP(v.bm.map((r) => r.pnl.received)), bmTot: sumP(v.bm.map((r) => r.pnl.total)), bmNet: sumP(v.bm.map((r) => r.pnl.net)), partner: sumP(v.bm.map((r) => r.pnl.heads['Partner Share'])),
      bmIncomplete: v.bm.filter((r) => bmReconOf(r) === 'Pending').length,
    }
  }, [v, m.snap, month])
  const { s } = d
  const donut = [{ name: 'Manual Payout', value: s.manual.net, c: COLORS.navy }, { name: 'File-Based Payout', value: s.file.net, c: '#7fb2ff' }, { name: 'Auto Reconciliation', value: s.auto.net, c: COLORS.green }]
  const donutTotal = sumP(donut.map((x) => x.value))
  const siteDist = [{ name: 'Franchise Model', value: d.frSites, c: COLORS.navy }, { name: 'Business Model', value: d.bmSites, c: COLORS.teal }]
  const Diff = ({ a, b }: { a: number; b: number }) => <span className={cn('font-semibold', a - b < 0 ? 'text-red-600' : a - b > 0 ? 'text-emerald-700' : 'text-ink-2')}>{a - b < 0 ? '▼ ' : a - b > 0 ? '▲ ' : ''}{signed(a - b)}</span>
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {[
          ['Total ATMs', String(v.fr.length), 'blue'], ['Processed', String(d.processed), 'green'], ['Variance Found', String(d.variance), 'amber'], ['Data Missing', String(d.missing), d.missing ? 'red' : 'gray'],
          ['Total Payout (Manual)', inr0(s.manual.net), 'purple'], ['Total Payout (File)', inr0(s.file.net), 'blue'], ['Total Payout (Auto)', inr0(s.auto.net), 'green'],
        ].map(([l, val, t]) => (
          <div key={l} className={cn('rounded-xl border px-3 py-2.5', { blue: 'border-blue-100 bg-blue-50/50', green: 'border-emerald-100 bg-emerald-50/50', amber: 'border-amber-100 bg-amber-50/50', red: 'border-red-100 bg-red-50/50', gray: 'border-line bg-surface', purple: 'border-violet-100 bg-violet-50/50' }[t])}>
            <div className="truncate text-[18px] font-bold text-ink">{val}</div>
            <div className="truncate text-[11px] text-muted">{l}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr_1fr]">
        <Panel title="Three-Way Payout Comparison (Consolidated)" icon={<Scale size={16} />} sub={`Franchise Model · ${ml(month)}`}>
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[560px] text-[12px]">
              <thead>
                <tr className="bg-primary text-left text-[11px] font-semibold text-white">
                  <th className="px-2.5 py-2">Particulars</th><th className="px-2.5 py-2 text-right">Manual Payout</th><th className="px-2.5 py-2 text-right">File-Based Payout</th><th className="px-2.5 py-2 text-right">Auto Reconciliation</th><th className="px-2.5 py-2 text-right">Manual vs Auto</th><th className="px-2.5 py-2 text-right">File vs Auto</th>
                </tr>
              </thead>
              <tbody>
                {([['Total Gross Revenue', 'gross'], ['Total Deductions (incl. TDS/GST)', 'ded'], ['Net Payout Amount', 'net']] as const).map(([l, k]) => (
                  <tr key={k} className={cn('border-t border-line-soft', k === 'net' && 'bg-primary-soft/60 font-semibold')}>
                    <td className="px-2.5 py-2">{l}</td>
                    <td className="px-2.5 py-2 text-right tabular-nums">{inr0(s.manual[k])}</td>
                    <td className="px-2.5 py-2 text-right tabular-nums">{inr0(s.file[k])}</td>
                    <td className="px-2.5 py-2 text-right tabular-nums">{inr0(s.auto[k])}</td>
                    <td className="px-2.5 py-2 text-right tabular-nums"><Diff a={s.manual[k]} b={s.auto[k]} /></td>
                    <td className="px-2.5 py-2 text-right tabular-nums"><Diff a={s.file[k]} b={s.auto[k]} /></td>
                  </tr>
                ))}
                <tr className="border-t border-line-soft text-muted"><td className="px-2.5 py-1.5">Records</td><td className="px-2.5 py-1.5 text-right">{s.manual.n}</td><td className="px-2.5 py-1.5 text-right">{s.file.n}</td><td className="px-2.5 py-1.5 text-right">{s.auto.n}</td><td colSpan={2} /></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted">Variance formulas §9.5: Manual − Auto, File − Auto. Click an ATM below to trace each figure to its source line.</p>
        </Panel>
        <Panel title="Payout Distribution" icon={<PieIcon size={16} />}>
          {donutTotal ? (
            <div className="flex flex-col items-center gap-3 sm:flex-row xl:flex-col 2xl:flex-row">
              <div className="relative h-[170px] w-[170px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2} stroke="none">
                      {donut.map((x) => <PieCell key={x.name} fill={x.c} />)}
                    </Pie>
                    <Tooltip formatter={tipMoney} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div><div className="text-[13px] font-bold text-ink">{inr0(s.auto.net)}</div><div className="text-[10px] text-muted">Auto Payout</div></div>
                </div>
              </div>
              <ul className="w-full space-y-2 text-[11.5px]">
                {donut.map((x) => (
                  <li key={x.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: x.c }} /><span className="flex-1">{x.name}</span><span className="font-semibold">{inr0(x.value)}</span><span className="text-muted">({pct1(x.value, donutTotal)}%)</span></li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="py-10 text-center text-[12px] text-muted">No Franchise payout records.</div>
          )}
        </Panel>
        <AiInsightsPanel m={m} v={v} month={month} />
      </div>

      <Panel title="Vertical-wise Performance (§4.3)" icon={<Settings2 size={16} />} sub="Each vertical uses its own engine — figures are never merged">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12px]">
            <thead>
              <tr className="bg-primary-soft/70 text-left text-[11px] font-semibold text-ink-2"><th className="px-3 py-2">Metric</th><th className="px-3 py-2">Franchise Model</th><th className="px-3 py-2">Business Model</th></tr>
            </thead>
            <tbody>
              {[
                ['Sites', <Link key="a" to={`/finance/payouts/franchise?month=${month}`} className="text-primary hover:underline">{d.frSites} franchise sites</Link>, <Link key="b" to={BM_LINK} className="text-primary hover:underline">{d.bmSites} BM sites</Link>],
                ['Revenue / Payout', `Eligible franchise gross revenue ${inr0(d.frGross)}`, `BM payout received ${inr0(d.bmRecv)}`],
                ['Deductions', `Fixed fee, recovery, penalty, tax etc. ${inr0(d.frDed)}`, `Rent and operating expenses ${inr0(d.bmTot)} (incl. partner share ${inr0(d.partner)})`],
                ['Profit Sharing', `Team Leader share ${inr0(d.tl)}${m.snap.rules.tlSharePct === null && m.snap.rules.tlShareFixed === null ? ' — TL rule pending §21-02' : ''}`, m.snap.rules.superMfBmShare ? `MF/Super MF contractual share: ${m.snap.rules.superMfBmShare}` : 'MF/Super MF contractual share — pending Finance decision §21-04/06'],
                ['Final Result', <span key="c">Franchisee {inr0(d.frNet)} · <Link to={mfLink(month)} className="text-primary hover:underline">MF {inr0(d.mfNet)}</Link> · remaining eligible profit {m.snap.rules.tlEligibleProfitBasis ? inr0(sumP(v.fr.map((r) => r.tlBase)) - d.tl) : 'pending §21-01'}</span>, <span key="d" className={d.bmNet >= 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'}>Net BM {d.bmNet >= 0 ? 'profit' : 'loss'} {inr0(d.bmNet)}</span>],
                ['Pending Items', `Payout ${d.frPendingN} · KYC ${d.kycN} · UTR ${d.utrN}`, `Expenses unpaid ${d.bmExp.length} (${inr0(sumP(d.bmExp.map((e) => e.amount - e.paid)))}) · bills / reconciliation pending ${d.bmIncomplete}`],
              ].map(([k, a, b]) => (
                <tr key={String(k)} className="border-t border-line-soft"><td className="px-3 py-2 font-semibold">{k}</td><td className="px-3 py-2">{a}</td><td className="px-3 py-2">{b}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartBox title="Franchise vs Business Model Site Distribution" empty={!d.frSites && !d.bmSites}>
          <PieChart>
            <Pie data={siteDist} dataKey="value" nameKey="name" outerRadius={80} label>
              {siteDist.map((x) => <PieCell key={x.name} fill={x.c} />)}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip />
          </PieChart>
        </ChartBox>
        <VarianceChart rows={v.fr} />
      </div>
      <ReconTable rows={v.fr} onAnalyze={onAnalyze} />
    </div>
  )
}

function VarianceChart({ rows }: { rows: FrRow[] }) {
  const data = useMemo(() => rows.filter((r) => r.recon === 'Variance Found').sort((a, b) => b.maxAbs - a.maxAbs).slice(0, 12).map((r) => ({ atm: r.atmId, mva: r.mVa ?? 0, fva: r.fVa ?? 0 })), [rows])
  return (
    <ChartBox title="Payout Reconciliation Variance" sub="Top variance ATMs" empty={!data.length}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="atm" tick={{ fontSize: 10 }} />
        <YAxis tickFormatter={axisK} tick={{ fontSize: 10 }} />
        <Tooltip formatter={tipMoney} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="mva" name="Manual vs Auto" fill={COLORS.amber} />
        <Bar dataKey="fva" name="File vs Auto" fill={COLORS.red} />
      </BarChart>
    </ChartBox>
  )
}

// ── Franchise Model ──────────────────────────────────────────────────────
export function FranchiseSection({ m, v, month }: { m: Model; v: View; month: string }) {
  const d = useMemo(() => {
    const months = [...new Set(v.frTrend.map((r) => r.month))].sort()
    const trend = months.map((mo) => {
      const rs_ = v.frTrend.filter((r) => r.month === mo)
      return { month: ml(mo), gross: sumP(rs_.map((r) => r.line.gross)), net: sumP(rs_.map((r) => r.line.net)), mf: sumP(v.mfTrend.filter((x) => x.month === mo).map((x) => x.net)), mfRev: sumP(rs_.map((r) => r.line.mfRevenue)) }
    })
    const tl = m.snap.tl.rules.map((rule) => ({
      name: rule.tlName,
      base: sumP(v.fr.filter((r) => rule.siteAtmIds.includes(r.atmId)).map((r) => r.tlBase)),
      share: sumP(m.snap.tl.shares.filter((x) => x.tlId === rule.tlId && (!month || x.month === month)).map((x) => x.share)),
    }))
    return { trend, tl }
  }, [v, m.snap, month])
  const mfCols = useMemo<DCol<(typeof v.mf)[number]>[]>(() => [
    { label: 'Master Franchise', value: (r) => r.mf, cell: (r) => <Link to={mfLink(r.month, r.mf)} className="font-semibold text-primary hover:underline">{r.mf}</Link> },
    { label: 'Super MF', value: (r) => r.smf },
    { label: 'Sites', kind: 'num', value: (r) => r.sites },
    { label: 'Franchisee Net', kind: 'money', value: (r) => sumP(r.frRows.map((x) => x.line.net)) },
    { label: 'Net MF', kind: 'money', value: (r) => r.netMf },
    { label: 'Net MF Payout', kind: 'money', value: (r) => r.net },
    { label: 'UTR', value: (r) => r.utr ?? '—' },
  ], [])
  const mfFilters = useMemo<DFilter<(typeof v.mf)[number]>[]>(() => [{ label: 'Super MF', get: (r) => r.smf }], [])
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[['Franchisee payout register', `/finance/payouts/franchise?month=${month}`], ['MF payout register', mfLink(month)], ['Super MF consolidated', `/finance/payouts/smf?month=${month}`], ['Team Leader sharing', '/finance/payouts/team-leader']].map(([l, to]) => (
          <Link key={l} to={to} className="flex h-9 w-[200px] items-center justify-center rounded-lg border border-line bg-white text-[12px] font-semibold text-primary hover:border-primary/50">{l} →</Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartBox title="Monthly Franchise Payout Trend" empty={!d.trend.length}>
          <BarChart data={d.trend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={axisK} tick={{ fontSize: 10 }} />
            <Tooltip formatter={tipMoney} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="gross" name="Gross revenue" fill={COLORS.blue} />
            <Bar dataKey="net" name="Franchisee net payout" fill={COLORS.navy} />
          </BarChart>
        </ChartBox>
        <ChartBox title="Monthly MF Payout Trend" empty={!d.trend.length}>
          <LineChart data={d.trend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={axisK} tick={{ fontSize: 10 }} />
            <Tooltip formatter={tipMoney} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line dataKey="mfRev" name="Net MF revenue" stroke={COLORS.purple} strokeWidth={2} />
            <Line dataKey="mf" name="Net MF payout" stroke={COLORS.teal} strokeWidth={2} />
          </LineChart>
        </ChartBox>
        <ChartBox title="Team Leader Share Distribution" sub={m.snap.tl.shares.length ? undefined : 'No shares yet — eligible base shown'} empty={!d.tl.length}>
          <BarChart data={d.tl} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={axisK} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
            <Tooltip formatter={tipMoney} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="base" name="Eligible base (plan TL rates)" fill={COLORS.gray} />
            <Bar dataKey="share" name="TL share (approved)" fill={COLORS.green} />
          </BarChart>
        </ChartBox>
        <VarianceChart rows={v.fr} />
      </div>
      {m.snap.rules.tlEligibleProfitBasis === null && <ProvisionalNote>Team Leader eligible profit, share type and allocation are pending Finance sign-off (§21-01 to 03). No TL share is calculated with an assumed percentage.</ProvisionalNote>}
      <DataTable title={`MF-wise Franchise Payout · ${ml(month)}`} cols={mfCols} rows={v.mf} filters={mfFilters} rowKey={(r) => r.key} fileName="MF_Franchise_Payout" onExport={logExport('MF-wise franchise payout')} />
    </div>
  )
}

// ── Business Model ───────────────────────────────────────────────────────
function bmTrendData(rows: BmRow[]) {
  const months = [...new Set(rows.map((r) => r.month))].sort()
  return months.map((mo) => {
    const rs_ = rows.filter((r) => r.month === mo)
    const row: Record<string, string | number> = {
      month: ml(mo), payout: sumP(rs_.map((r) => r.pnl.received)), expenses: sumP(rs_.map((r) => r.pnl.total)),
      profit: sumP(rs_.filter((r) => r.pnl.net > 0 && r.pnl.status === 'Profitable').map((r) => r.pnl.net)), loss: sumP(rs_.filter((r) => r.pnl.status === 'Loss Making').map((r) => r.pnl.net)),
    }
    EXPENSE_HEADS.forEach((h) => (row[h] = sumP(rs_.map((r) => r.pnl.heads[h]))))
    return row
  })
}
export function BmPnlTable({ rows, title = 'BM Site-wise P&L Register (§12.1)' }: { rows: BmRow[]; title?: string }) {
  const [open, setOpen] = useState<BmRow | null>(null)
  const cols = useMemo<DCol<BmRow>[]>(() => [
    { label: 'FY', value: (r) => r.fy },
    { label: 'Month', value: (r) => ml(r.month) },
    { label: 'Super MF', value: (r) => r.site.superMf },
    { label: 'Master Franchise', value: (r) => r.site.mf },
    { label: 'BM Category', value: (r) => r.categoryName },
    { label: 'ATM ID', value: (r) => r.site.atmId, cell: (r) => <span className="font-semibold text-primary">{r.site.atmId}</span> },
    { label: 'Site ID', value: (r) => r.site.siteId },
    { label: 'Business Payout', kind: 'money', value: (r) => r.pnl.received },
    ...EXPENSE_HEADS.map((h) => ({ label: h === 'Electricity Bill' ? 'Electricity' : h === 'Staff Expenses' ? 'Staff' : h === 'Other Expenses' ? 'Other' : h, kind: 'money' as const, value: (r: BmRow) => r.pnl.heads[h] })),
    { label: 'Total Expenses', kind: 'money', value: (r) => r.pnl.total },
    { label: 'Net Profit / Loss', kind: 'money', value: (r) => r.pnl.net, cell: (r) => <span className={cn('font-semibold', r.pnl.net > 0 ? 'text-emerald-700' : r.pnl.net < 0 ? 'text-red-600' : 'text-amber-600')}>{inr2(r.pnl.net)}</span> },
    { label: 'Margin', kind: 'pct', value: (r) => r.pnl.margin },
    { label: 'Expense Payment', value: (r) => (r.pnl.outstanding ? `Outstanding ${inr0(r.pnl.outstanding)}` : 'Paid') },
    { label: 'Status', kind: 'status', value: (r) => r.pnl.status },
    { label: 'Action', value: () => '', cell: (r) => <button onClick={(e) => { e.stopPropagation(); setOpen(r) }} className="text-bright" aria-label={`View ${r.site.atmId}`}><Eye size={15} /></button> },
  ], [])
  const filters = useMemo<DFilter<BmRow>[]>(() => [{ label: 'Status', get: (r) => r.pnl.status }, { label: 'MF', get: (r) => r.site.mf }], [])
  return (
    <>
      <DataTable title={title} cols={cols} rows={rows} filters={filters} rowKey={(r) => r.key} onRowClick={setOpen} fileName="BM_Site_PnL" onExport={logExport('BM site P&L')} />
      {open && (
        <Modal title={`${open.site.atmId} · ${open.site.code}`} sub={`${ml(open.month)} · ${open.categoryName} · MF ${open.site.mf}`} onClose={() => setOpen(null)} width={640} footer={<Link to={BM_LINK} className="text-[12px] font-semibold text-primary hover:underline">Open in Business Model</Link>}>
          <div className="mb-3"><StatusBadge s={open.pnl.status} /></div>
          <KV items={[
            ['Payout reference', open.payout?.reference ?? 'No payout record'],
            ['Gross business payout', inr2(open.payout?.gross ?? 0)],
            ['Rent deducted at source', inr2(open.payout?.rentDeductedAtSource ?? 0)],
            ['Payout received', inr2(open.pnl.received)],
            ...EXPENSE_HEADS.map((h) => [`− ${h}`, inr2(open.pnl.heads[h])] as [string, string]),
            ['Total expenses', inr2(open.pnl.total)],
            ['Net profit / loss', inr2(open.pnl.net)],
            ['Margin', `${open.pnl.margin}%`],
            ['Outstanding (unpaid approved)', inr2(open.pnl.outstanding)],
            ['Missing mandatory heads', open.pnl.missing.join(', ') || 'None'],
          ]} />
          <p className="mt-3 text-[11px] text-muted">Net = Payout received − Rent − Electricity − Housekeeping − Staff − Partner Share − Other (§6.5). Rent already deducted at source is not deducted again.</p>
          {open.rentRisk && <ProvisionalNote>Rent deducted at source AND recorded as an expense — potential double deduction.</ProvisionalNote>}
        </Modal>
      )}
    </>
  )
}
export function BusinessSection({ v }: { v: View }) {
  const trend = useMemo(() => bmTrendData(v.bmTrend), [v.bmTrend])
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartBox title="Business Model Payout vs Expenses" empty={!trend.length}>
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={axisK} tick={{ fontSize: 10 }} />
            <Tooltip formatter={tipMoney} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="payout" name="Payout received" fill={COLORS.navy} />
            <Bar dataKey="expenses" name="Expenses" fill={COLORS.amber} />
          </BarChart>
        </ChartBox>
        <ChartBox title="Monthly Expense Category Distribution" empty={!trend.length}>
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={axisK} tick={{ fontSize: 10 }} />
            <Tooltip formatter={tipMoney} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {EXPENSE_HEADS.map((h, i) => <Bar key={h} dataKey={h} stackId="e" fill={HEAD_COLORS[i]} />)}
          </BarChart>
        </ChartBox>
      </div>
      <BmPnlTable rows={v.bm} />
    </div>
  )
}

// ── Profit & Loss ────────────────────────────────────────────────────────
export function PnlSection({ m, v }: { m: Model; v: View }) {
  const d = useMemo(() => {
    const trend = bmTrendData(v.bmTrend)
    const statuses = ['Profitable', 'Loss Making', 'Break-even', 'Incomplete', 'Reconciliation Pending']
    const dist = statuses.map((s) => ({ name: s, value: v.bm.filter((r) => r.pnl.status === s).length }))
    const atms = new Set(v.bm.map((r) => `${r.month}|${r.site.atmId}`))
    const exps = m.snap.business.expenses.filter((e) => atms.has(`${e.month}|${e.atmId}`) && e.status !== 'Rejected')
    return {
      trend, dist,
      operating: sumP(v.bm.map((r) => r.pnl.net)),
      cash: sumP(v.bm.map((r) => r.pnl.received)) - sumP(exps.map((e) => e.paid)),
      outstanding: sumP(exps.filter((e) => e.status !== 'Recorded').map((e) => e.amount - e.paid)),
      accrued: sumP(exps.filter((e) => e.status === 'Recorded').map((e) => e.amount)),
      mf: groupBm(v.bm, 'mf'), smf: groupBm(v.bm, 'smf'),
    }
  }, [v, m.snap])
  const distColors: Record<string, string> = { Profitable: COLORS.green, 'Loss Making': COLORS.red, 'Break-even': COLORS.amber, Incomplete: COLORS.gray, 'Reconciliation Pending': '#fcd34d' }
  type G = (typeof d.mf)[number]
  const gcols = (label: string): DCol<G>[] => [
    { label, value: (r) => r.name },
    { label: 'Sites', kind: 'num', value: (r) => r.sites },
    { label: 'Payout', kind: 'money', value: (r) => r.received },
    { label: 'Expenses', kind: 'money', value: (r) => r.expenses },
    { label: 'Net', kind: 'money', value: (r) => r.net, cell: (r) => <span className={cn('font-semibold', r.net > 0 ? 'text-emerald-700' : r.net < 0 ? 'text-red-600' : 'text-amber-600')}>{inr2(r.net)}</span> },
    { label: 'Profitable', kind: 'num', value: (r) => r.profitable },
    { label: 'Loss', kind: 'num', value: (r) => r.loss },
    { label: 'Incomplete', kind: 'num', value: (r) => r.incomplete },
  ]
  const mfCols = useMemo(() => gcols('Master Franchise'), []) // eslint-disable-line react-hooks/exhaustive-deps
  const smfCols = useMemo(() => gcols('Super MF'), []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Operating P&L (accrued)', d.operating, d.operating >= 0 ? 'text-emerald-700' : 'text-red-600', 'Payout received − applicable expenses'],
          ['Cash position', d.cash, d.cash >= 0 ? 'text-emerald-700' : 'text-red-600', 'Receipts − actual payments'],
          ['Outstanding liabilities', d.outstanding, 'text-amber-700', 'Approved / due but unpaid'],
          ['Recorded, not approved', d.accrued, 'text-slate-600', 'Awaiting approval'],
        ].map(([l, val, cls, cap]) => (
          <div key={String(l)} className="rounded-xl border border-line bg-white px-4 py-3">
            <div className="text-[11px] font-semibold text-muted">{l}</div>
            <div className={cn('mt-1 text-[20px] font-bold', String(cls))}>{inr0(Number(val))}</div>
            <div className="text-[10.5px] text-muted">{cap}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted">§12.3 — operating profitability is shown separately from available cash; accrual vs cash treatment {m.snap.rules.expenseAccounting ? `is "${m.snap.rules.expenseAccounting}"` : 'is pending Finance decision §21-10'}.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartBox title="Business Model Profit vs Loss" empty={!d.trend.length}>
          <BarChart data={d.trend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={axisK} tick={{ fontSize: 10 }} />
            <Tooltip formatter={tipMoney} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="profit" name="Profit (profitable sites)" fill={COLORS.green} />
            <Bar dataKey="loss" name="Loss (loss-making sites)" fill={COLORS.red} />
          </BarChart>
        </ChartBox>
        <ChartBox title="Site Profitability Distribution" empty={!v.bm.length}>
          <PieChart>
            <Pie data={d.dist.filter((x) => x.value)} dataKey="value" nameKey="name" outerRadius={80} label>
              {d.dist.filter((x) => x.value).map((x) => <PieCell key={x.name} fill={distColors[x.name]} />)}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip />
          </PieChart>
        </ChartBox>
      </div>
      <DataTable title="MF-wise BM Profitability" cols={mfCols} rows={d.mf} rowKey={(r) => r.name} fileName="MF_BM_Profitability" onExport={logExport('MF-wise BM profitability')} />
      <DataTable title="Super MF-wise BM Profitability (no double counting)" cols={smfCols} rows={d.smf} rowKey={(r) => r.name} fileName="SuperMF_BM_Profitability" onExport={logExport('Super MF BM profitability')} />
      <ProvisionalNote>BM operating profit is shown separately from any contractual MF / Super MF share (§7.2). Share rules: {m.snap.rules.mfShareRule ?? 'pending §21-04'}; Super MF share: {m.snap.rules.superMfBmShare ?? 'pending §21-06'}.</ProvisionalNote>
    </div>
  )
}

// ── Reconciliation analytics ─────────────────────────────────────────────
export function ReconSection({ m, v, month, onAnalyze }: { m: Model; v: View; month: string; onAnalyze: () => void }) {
  const d = useMemo(() => {
    const st = ['Matched', 'Variance Found', 'Data Pending'].map((s) => ({ name: s, value: v.fr.filter((r) => r.recon === s).length }))
    const reasons = new Map<string, number>()
    v.fr.filter((r) => r.recon !== 'Matched').forEach((r) => {
      const k = r.remark.replace(/ ₹[\d,.-]+$/, '').replace(/ difference.*$/, ' difference')
      reasons.set(k, (reasons.get(k) ?? 0) + 1)
    })
    const bm = ['Profitable', 'Loss Making', 'Break-even', 'Incomplete', 'Reconciliation Pending'].map((s) => ({ name: s, value: v.bm.filter((r) => r.pnl.status === s).length }))
    return { st, reasons: [...reasons.entries()].map(([name, value]) => ({ name, value })), bm }
  }, [v])
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartBox title="Franchise Reconciliation Status" sub={ml(month)} empty={!v.fr.length}>
          <PieChart>
            <Pie data={d.st} dataKey="value" nameKey="name" innerRadius={45} outerRadius={78} label>
              {d.st.map((x) => <PieCell key={x.name} fill={x.name === 'Matched' ? COLORS.green : x.name === 'Variance Found' ? COLORS.amber : COLORS.gray} />)}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip />
          </PieChart>
        </ChartBox>
        <ChartBox title="Exception Reasons" empty={!d.reasons.length}>
          <BarChart data={d.reasons} layout="vertical">
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" name="ATMs" fill={COLORS.amber} />
          </BarChart>
        </ChartBox>
        <ChartBox title="BM Reconciliation Status" empty={!v.bm.length}>
          <BarChart data={d.bm}>
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" name="Sites">
              {d.bm.map((x) => <PieCell key={x.name} fill={{ Profitable: COLORS.green, 'Loss Making': COLORS.red, 'Break-even': COLORS.amber, Incomplete: COLORS.gray, 'Reconciliation Pending': '#fcd34d' }[x.name]} />)}
            </Bar>
          </BarChart>
        </ChartBox>
      </div>
      <p className="text-[11px] text-muted">Tolerance: {m.snap.rules.varianceTolerance === null ? 'pending Finance decision §21-14 (exact match applied)' : inr2(m.snap.rules.varianceTolerance)}. Payouts with unresolved critical mismatch are never released automatically.</p>
      <ReconTable rows={v.fr} onAnalyze={onAnalyze} />
    </div>
  )
}
