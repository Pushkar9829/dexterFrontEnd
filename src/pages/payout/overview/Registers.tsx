import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, Landmark, PencilLine, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { financeRulesStore, logPayout, monthLabel, sumP, toPaise, type PayoutLine } from '@/data/payout'
import { maskPan } from '@/lib/mask'
import { useRole } from '@/lib/rbac'
import { PayoutPage } from '../PayoutShell'
import { frLink, mfLink } from './ai'
import { actor, buildMfRows, buildSmfRows, emptyFilters, filterBm, filterFr, groupBm, inr2, logExport, mfAdjStore, mfKey, rs, useModel, type FrRow, type MfAdj, type MfRow, type SmfRow } from './compute'
import { FrDetailModal } from './Sections'
import { DataTable, FInput, FSelect, KV, ProvisionalNote, StatusBadge, type DCol, type DFilter } from './ui'

const FIN_ROLES = ['Super Admin', 'Admin', 'Finance Team']
const ml = (m: string) => (m ? monthLabel(m) : 'All months')

/** Shared month / hierarchy selectors for the registers (driven by URL so figures are linkable). */
function useRegisterFilters() {
  const m = useModel()
  const [params, setParams] = useSearchParams()
  const month = params.has('month') ? (params.get('month') ?? '') : m.latestMonth
  const get = (k: string) => params.get(k) ?? ''
  const set = (k: string) => (val: string) => {
    const n = new URLSearchParams(params)
    if (k === 'month') n.set('month', val)
    else if (val) n.set(k, val)
    else n.delete(k)
    setParams(n, { replace: true })
  }
  return { m, month, get, set }
}
function MonthSelect({ m, value, onChange }: { m: ReturnType<typeof useModel>; value: string; onChange: (v: string) => void }) {
  return <FSelect label="Payout Month" value={value} onChange={onChange} options={m.months.map((x) => ({ value: x, label: monthLabel(x) }))} all="All months" className="w-[160px]" />
}

// ── §5.2 Franchisee payout register ──────────────────────────────────────
type RegRow = { r: FrRow; l: PayoutLine }
export function FranchiseRegister() {
  const { m, month, get, set } = useRegisterFilters()
  const role = useRole()
  const showPan = FIN_ROLES.includes(role)
  const source = get('source') || 'Payable'
  const [open, setOpen] = useState<FrRow | null>(null)
  const atm = get('atm')
  const mf = get('mf')
  const smf = get('smf')
  const status = get('status')
  const rows = useMemo<RegRow[]>(() => {
    const fr = filterFr(m.frAll, { ...emptyFilters(month, ''), atm, mf, smf, payoutStatus: status })
    return fr
      .map((r) => ({ r, l: source === 'Payable' ? r.line : source === 'Manual' ? r.manual : source === 'File-Based' ? r.file : r.auto }))
      .filter((x): x is RegRow => !!x.l)
  }, [m, month, source, atm, mf, smf, status])
  const cols = useMemo<DCol<RegRow>[]>(() => {
    const d = (k: keyof PayoutLine['ded']) => (x: RegRow) => x.l.ded[k]
    const netFr = (x: RegRow) => { const e = x.l.ded; return x.l.gross - e.fixedFee - e.iciciSr - e.ntPenalty - e.alf - e.recovery + e.negativeFixedFee + e.waiver }
    return [
      { label: 'Month', value: (x) => ml(x.r.month) },
      { label: 'ATM ID', value: (x) => x.r.atmId, cell: (x) => <span className="font-semibold text-primary">{x.r.atmId}</span> },
      { label: 'Site ID', value: (x) => x.r.siteId },
      { label: 'Franchisee', value: (x) => x.r.frName },
      { label: 'MF', value: (x) => x.r.mfName },
      { label: 'Super MF', value: (x) => x.r.smfName },
      { label: 'Source', value: (x) => x.l.source },
      { label: 'Batch', value: (x) => x.l.batchId },
      { label: 'Plan', value: (x) => x.l.planCode ?? '—' },
      { label: '01 Cash', kind: 'num', value: (x) => x.l.txn.cash },
      { label: '02 Non Cash', kind: 'num', value: (x) => x.l.txn.nonCash },
      { label: '03 Post Cash', kind: 'num', value: (x) => x.l.txn.postCash },
      { label: '04 Post Non Cash', kind: 'num', value: (x) => x.l.txn.postNonCash },
      { label: '05 Deposit', kind: 'num', value: (x) => x.l.txn.deposit },
      { label: '06 FR Gross Revenue', kind: 'money', value: (x) => x.l.gross },
      { label: '07 Fixed Fee / CRA', kind: 'money', value: d('fixedFee') },
      { label: '08 Negative Fixed Fee', kind: 'money', value: d('negativeFixedFee') },
      { label: '09 ICICI SR Recovery', kind: 'money', value: d('iciciSr') },
      { label: '10 NT Penalty', kind: 'money', value: d('ntPenalty') },
      { label: '11 ALF Charges', kind: 'money', value: d('alf') },
      { label: '12 Recovery', kind: 'money', value: d('recovery') },
      { label: '13 Waiver', kind: 'money', value: d('waiver') },
      { label: 'Net Franchisee', kind: 'money', value: netFr },
      { label: '14 Additional Recovery', kind: 'money', value: d('additionalRecovery') },
      { label: '15 Credit Amount', kind: 'money', value: d('credit') },
      { label: '16 FR Payout w/o TDS', kind: 'money', value: (x) => x.l.withoutTds },
      { label: '17 TDS/GST %', kind: 'pct', value: (x) => x.l.taxPct },
      { label: '18 TDS/GST Amount', kind: 'money', value: (x) => x.l.taxAmt },
      { label: '19 Net Payout', kind: 'money', value: (x) => x.l.net, cell: (x) => <span className="font-semibold">{inr2(x.l.net)}</span> },
      { label: 'PAN', value: (x) => (showPan ? x.l.pan : maskPan(x.l.pan)) },
      { label: 'Release Date', value: (x) => x.l.releaseDate ?? '—' },
      { label: 'Credit Status', value: (x) => x.l.creditStatus ?? '—' },
      { label: 'Paid Date', value: (x) => x.l.paidDate ?? '—' },
      { label: 'UTR', value: (x) => x.l.utr ?? '—' },
      { label: 'Payout Status', kind: 'status', value: (x) => x.r.payStatus },
      { label: 'Reconciliation', kind: 'status', value: (x) => x.r.recon },
    ]
  }, [showPan])
  const filters = useMemo<DFilter<RegRow>[]>(() => [{ label: 'Reconciliation', get: (x) => x.r.recon }, { label: 'State', get: (x) => x.r.state }], [])
  const opts = useMemo(() => ({ mf: [...new Set(m.frAll.map((r) => r.mfName))].sort(), smf: [...new Set(m.frAll.map((r) => r.smfName))].sort() }), [m])
  return (
    <PayoutPage title="Franchisee Payout Register" sub="Every Franchisee payout line with all 19 calculation components (§5.2). Formula, tax treatment and rounding are provisional until Finance approval." crumbs={['Franchise', 'Franchisee Payout']}>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4">
        <MonthSelect m={m} value={month} onChange={set('month')} />
        <FSelect label="Source" value={source} onChange={set('source')} options={['Payable', 'Manual', 'File-Based', 'Auto']} all={null} className="w-[150px]" />
        <FInput label="ATM ID / Site ID" value={get('atm')} onChange={set('atm')} placeholder="Search" className="w-[170px]" />
        <FSelect label="Master Franchise" value={get('mf')} onChange={set('mf')} options={opts.mf} className="w-[220px]" />
        <FSelect label="Super MF" value={get('smf')} onChange={set('smf')} options={opts.smf} className="w-[220px]" />
        <FSelect label="Payout Status" value={get('status')} onChange={set('status')} options={['Pending', 'Paid', 'Hold', 'Failed']} className="w-[150px]" />
      </div>
      <p className="text-[11px] text-muted">“Payable” uses the Auto (plan engine) line, else File, else Manual. Net Franchisee = Gross − Fixed Fee − ICICI SR − NT Penalty − ALF − Recovery + Negative Fixed Fee + Waiver; FR payout w/o TDS = Net Franchisee − Additional Recovery + Credit.</p>
      <DataTable title={`Franchisee payout lines · ${ml(month)}`} icon={<Users size={16} />} cols={cols} rows={rows} filters={filters} rowKey={(x) => x.l.id} onRowClick={(x) => setOpen(x.r)} fileName={`Franchisee_Payout_${month || 'all'}_${source}`} onExport={logExport('Franchisee payout register')} pageSize={25} />
      {open && <FrDetailModal row={open} onClose={() => setOpen(null)} />}
    </PayoutPage>
  )
}

// ── §5.3 Master Franchise payout ─────────────────────────────────────────
function AdjustModal({ row, onClose }: { row: MfRow; onClose: () => void }) {
  const rules = financeRulesStore.use()
  const a = row.adj
  const [form, setForm] = useState({ hold: a ? rs(a.hold) : '0', recovery: a ? rs(a.recovery) : '0', debit: a ? rs(a.debit) : '0', credit: a ? rs(a.credit) : '0', taxPct: a?.taxPct === null || a?.taxPct === undefined ? '' : String(a.taxPct), utr: a?.utr ?? '', paidDate: a?.paidDate ?? '', remarks: a?.remarks ?? '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const f = (k: keyof typeof form) => (val: string) => setForm((x) => ({ ...x, [k]: val }))
  const save = () => {
    const e: Record<string, string> = {}
    ;(['hold', 'recovery', 'debit', 'credit'] as const).forEach((k) => {
      if (!/^\d+(\.\d{1,2})?$/.test(form[k].trim() || '0')) e[k] = 'Enter a positive amount (max 2 decimals)'
    })
    if (form.utr && !/^[A-Za-z0-9]{6,22}$/.test(form.utr.trim())) e.utr = 'UTR: 6–22 letters/digits'
    if (form.paidDate && !form.utr.trim()) e.utr = 'UTR is required when a paid date is entered'
    setErr(e)
    if (Object.keys(e).length) return
    const next: MfAdj = {
      hold: toPaise(form.hold || 0), recovery: toPaise(form.recovery || 0), debit: toPaise(form.debit || 0), credit: toPaise(form.credit || 0),
      taxPct: form.taxPct === '' ? null : Number(form.taxPct), utr: form.utr.trim() || undefined, paidDate: form.paidDate || undefined, remarks: form.remarks.trim() || undefined,
      updatedAt: new Date().toISOString(), updatedBy: actor(),
    }
    const fmt = (x?: MfAdj) => (x ? `hold ${rs(x.hold)}, recovery ${rs(x.recovery)}, debit ${rs(x.debit)}, credit ${rs(x.credit)}, tax ${x.taxPct ?? 'not set'}%, UTR ${x.utr ?? '—'}, paid ${x.paidDate ?? '—'}` : 'none')
    mfAdjStore.set((s) => ({ ...s, [row.key]: next }))
    logPayout({ by: actor(), area: 'MF Payout', ref: `${row.mf} · ${monthLabel(row.month)}`, action: 'MF adjustment / payment details updated', before: fmt(a), after: fmt(next) })
    toast('MF payout adjustments saved and audited.')
    onClose()
  }
  const money = (k: 'hold' | 'recovery' | 'debit' | 'credit', label: string) => (
    <div>
      <FInput label={`${label} (₹)`} value={form[k]} onChange={f(k)} />
      {err[k] && <p className="mt-1 text-[11px] text-brand-red">{err[k]}</p>}
    </div>
  )
  return (
    <Modal title={`MF payout · ${row.mf}`} sub={`${monthLabel(row.month)} · Net MF ${inr2(row.netMf)} from ${row.sites} sites`} onClose={onClose} width={620}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {money('hold', 'Hold')}
        {money('recovery', 'Recovery')}
        {money('debit', 'Debit Amount')}
        {money('credit', 'Credit Amount')}
        <FSelect label="TDS / GST %" value={form.taxPct} onChange={f('taxPct')} options={rules.tdsRates.map(String)} all="Not set" />
        <div>
          <FInput label="UTR" value={form.utr} onChange={f('utr')} />
          {err.utr && <p className="mt-1 text-[11px] text-brand-red">{err.utr}</p>}
        </div>
        <FInput label="Paid Date" type="date" value={form.paidDate} onChange={f('paidDate')} />
        <FInput label="Remarks" value={form.remarks} onChange={f('remarks')} />
      </div>
      <p className="mt-3 text-[11px] text-muted">MF payout w/o TDS = Net MF − Hold − Recovery − Debit + Credit. Each save is written to the payout audit log with before / after values. Approved payout records are never overwritten — adjustments are separate entries.</p>
    </Modal>
  )
}

export function MfRegister() {
  const { m, month, get, set } = useRegisterFilters()
  const role = useRole()
  const canEdit = FIN_ROLES.includes(role)
  const [edit, setEdit] = useState<MfRow | null>(null)
  const [view, setView] = useState<MfRow | null>(null)
  const mfSel = get('mf')
  const smfSel = get('smf')
  const rows = useMemo(() => buildMfRows(filterFr(m.frAll, { ...emptyFilters(month, ''), smf: smfSel }), m.snap.mfAdj).filter((r) => !mfSel || r.mf === mfSel), [m, month, mfSel, smfSel])
  const cols = useMemo<DCol<MfRow>[]>(() => [
    { label: 'Month', value: (r) => ml(r.month) },
    { label: 'Master Franchise', value: (r) => r.mf, cell: (r) => <span className="font-semibold text-primary">{r.mf}</span> },
    { label: 'Super MF', value: (r) => r.smf },
    { label: 'Sites', kind: 'num', value: (r) => r.sites },
    { label: 'Net MF', kind: 'money', value: (r) => r.netMf },
    { label: 'Hold', kind: 'money', value: (r) => r.hold },
    { label: 'Recovery', kind: 'money', value: (r) => r.recovery },
    { label: 'Debit Amount', kind: 'money', value: (r) => r.debit },
    { label: 'Credit Amount', kind: 'money', value: (r) => r.credit },
    { label: 'MF Payout w/o TDS', kind: 'money', value: (r) => r.withoutTds },
    { label: 'TDS/GST %', value: (r) => (r.taxPct === null ? 'Not set' : `${r.taxPct}%`), cell: (r) => (r.taxPct === null ? <StatusBadge s="Not set" /> : `${r.taxPct}%`) },
    { label: 'TDS/GST', kind: 'money', value: (r) => r.tax },
    { label: 'Net MF Payout', kind: 'money', value: (r) => r.net, cell: (r) => <span className="font-semibold">{inr2(r.net)}</span> },
    { label: 'UTR', value: (r) => r.utr ?? '—' },
    { label: 'Paid Date', value: (r) => r.paidDate ?? '—' },
    {
      label: 'Action', value: () => '', cell: (r) => (
        <span className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); setView(r) }} className="text-bright" aria-label={`View ${r.mf}`} title="View source lines"><Eye size={15} /></button>
          {canEdit && <button onClick={(e) => { e.stopPropagation(); setEdit(r) }} className="text-bright" aria-label={`Adjust ${r.mf}`} title="Hold / debit / credit / UTR"><PencilLine size={15} /></button>}
        </span>
      ),
    },
  ], [canEdit])
  const filters = useMemo<DFilter<MfRow>[]>(() => [{ label: 'Super MF', get: (r) => r.smf }, { label: 'TDS', get: (r) => (r.taxPct === null ? 'Not set' : 'Set') }], [])
  const opts = useMemo(() => ({ mf: [...new Set(m.frAll.map((r) => r.mfName))].sort(), smf: [...new Set(m.frAll.map((r) => r.smfName))].sort() }), [m])
  return (
    <PayoutPage title="Master Franchise Payout" sub="MF payout per §5.3 — Net MF aggregated from the payable lines of each MF’s franchise sites; hold, recovery, debit, credit and payment details are recorded separately and audited." crumbs={['Franchise', 'Master Franchise Payout']}>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4">
        <MonthSelect m={m} value={month} onChange={set('month')} />
        <FSelect label="Master Franchise" value={get('mf')} onChange={set('mf')} options={opts.mf} className="w-[240px]" />
        <FSelect label="Super MF" value={get('smf')} onChange={set('smf')} options={opts.smf} className="w-[240px]" />
      </div>
      <ProvisionalNote>Net MF uses the plan’s MF revenue rates. The approved MF / Super MF commercial sharing rule (§21-04: {m.snap.rules.mfShareRule ?? 'pending'}) and MF TDS/GST treatment must be signed off by Finance — no tax is applied until a rate is set per MF.</ProvisionalNote>
      <DataTable title={`MF payouts · ${ml(month)}`} icon={<Landmark size={16} />} cols={cols} rows={rows} filters={filters} rowKey={(r) => r.key} onRowClick={setView} fileName={`MF_Payout_${month || 'all'}`} onExport={logExport('MF payout register')} />
      {edit && <AdjustModal key={mfKey(edit.month, edit.mf)} row={edit} onClose={() => setEdit(null)} />}
      {view && (
        <Modal title={`${view.mf} · ${monthLabel(view.month)}`} sub={`${view.frRows.length} franchise lines · Net MF ${inr2(view.netMf)}`} onClose={() => setView(null)} width={760}>
          <KV items={[['Super MF', view.smf], ['Net MF', inr2(view.netMf)], ['Adjustments (credit − hold − recovery − debit)', inr2(view.credit - view.hold - view.recovery - view.debit)], ['Net MF payout', inr2(view.net)], ['Last updated', view.adj ? `${view.adj.updatedBy} · ${new Date(view.adj.updatedAt).toLocaleString('en-IN')}` : '—'], ['Remarks', view.adj?.remarks ?? '—']]} />
          <table className="mt-3 w-full text-[12px]">
            <thead><tr className="bg-primary-soft/70 text-left text-[11px] font-semibold"><th className="px-2 py-1.5">ATM ID</th><th className="px-2 py-1.5">Franchisee</th><th className="px-2 py-1.5">Source</th><th className="px-2 py-1.5 text-right">MF Revenue</th><th className="px-2 py-1.5 text-right">FR Net</th></tr></thead>
            <tbody>
              {view.frRows.map((r) => (
                <tr key={r.key} className="border-t border-line-soft">
                  <td className="px-2 py-1.5"><Link to={frLink(r.atmId, r.month)} className="font-semibold text-primary hover:underline">{r.atmId}</Link></td>
                  <td className="px-2 py-1.5">{r.frName}</td><td className="px-2 py-1.5">{r.line.source}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{inr2(r.line.mfRevenue)}</td><td className="px-2 py-1.5 text-right tabular-nums">{inr2(r.line.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </PayoutPage>
  )
}

// ── Super MF consolidated ────────────────────────────────────────────────
export function SmfRegister() {
  const { m, month, get, set } = useRegisterFilters()
  const [view, setView] = useState<SmfRow | null>(null)
  const smf = get('smf')
  const rows = useMemo(() => buildSmfRows(buildMfRows(filterFr(m.frAll, { ...emptyFilters(month, ''), smf }), m.snap.mfAdj)), [m, month, smf])
  const bm = useMemo(() => groupBm(filterBm(m.bmAll, { ...emptyFilters(month, ''), smf }), 'smf'), [m, month, smf])
  const cols = useMemo<DCol<SmfRow>[]>(() => [
    { label: 'Month', value: (r) => ml(r.month) },
    { label: 'Super MF', value: (r) => r.smf, cell: (r) => <span className="font-semibold text-primary">{r.smf}</span> },
    { label: 'MFs', kind: 'num', value: (r) => r.mfs.length },
    { label: 'Sites', kind: 'num', value: (r) => r.sites },
    { label: 'Franchisee Net (info)', kind: 'money', value: (r) => r.frNet },
    { label: 'Net MF', kind: 'money', value: (r) => r.netMf },
    { label: 'Adjustments', kind: 'money', value: (r) => r.adjustments },
    { label: 'MF Payout w/o TDS', kind: 'money', value: (r) => r.withoutTds },
    { label: 'TDS/GST', kind: 'money', value: (r) => r.tax },
    { label: 'Net MF Payout', kind: 'money', value: (r) => r.net },
  ], [])
  type G = (typeof bm)[number]
  const bmCols = useMemo<DCol<G>[]>(() => [
    { label: 'Super MF', value: (r) => r.name },
    { label: 'BM Sites', kind: 'num', value: (r) => r.sites },
    { label: 'BM Payout', kind: 'money', value: (r) => r.received },
    { label: 'BM Expenses', kind: 'money', value: (r) => r.expenses },
    { label: 'BM Net', kind: 'money', value: (r) => r.net },
    { label: 'Loss sites', kind: 'num', value: (r) => r.loss },
    { label: 'Incomplete', kind: 'num', value: (r) => r.incomplete },
  ], [])
  const filters = useMemo<DFilter<SmfRow>[]>(() => [{ label: 'Month', get: (r) => ml(r.month) }], [])
  const opts = useMemo(() => [...new Set([...m.frAll.map((r) => r.smfName), ...m.snap.business.bmSites.map((b) => b.superMf)])].sort(), [m])
  return (
    <PayoutPage title="Super Master Franchise — Consolidated" sub="Sum of each Super MF’s Master Franchises. Every site belongs to one MF and every MF to one Super MF, so nothing is counted twice. Franchise payout and BM operating profit are kept in separate tables." crumbs={['Franchise', 'Super Master Franchise']}>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4">
        <MonthSelect m={m} value={month} onChange={set('month')} />
        <FSelect label="Super MF" value={smf} onChange={set('smf')} options={opts} className="w-[260px]" />
      </div>
      <ProvisionalNote>The system does not assume that MF profit becomes Super MF profit (§2.3). Contractual Super MF share: {m.snap.rules.superMfBmShare ?? 'pending Finance decision §21-06'}.</ProvisionalNote>
      <DataTable title={`Franchise Model · MF payouts by Super MF · ${ml(month)}`} icon={<Landmark size={16} />} cols={cols} rows={rows} filters={filters} rowKey={(r) => r.key} onRowClick={setView} fileName={`SuperMF_Payout_${month || 'all'}`} onExport={logExport('Super MF payout')} />
      <DataTable title={`Business Model · operating P&L by Super MF · ${ml(month)}`} cols={bmCols} rows={bm} rowKey={(r) => r.name} fileName={`SuperMF_BM_${month || 'all'}`} onExport={logExport('Super MF BM P&L')} />
      {view && (
        <Modal title={view.smf} sub={`${ml(view.month)} · ${view.mfs.length} MFs · ${view.sites} sites`} onClose={() => setView(null)} width={720}>
          <table className="w-full text-[12px]">
            <thead><tr className="bg-primary-soft/70 text-left text-[11px] font-semibold"><th className="px-2 py-1.5">Master Franchise</th><th className="px-2 py-1.5 text-right">Sites</th><th className="px-2 py-1.5 text-right">Net MF</th><th className="px-2 py-1.5 text-right">Net MF Payout</th></tr></thead>
            <tbody>
              {view.mfs.map((x) => (
                <tr key={x.key} className="border-t border-line-soft">
                  <td className="px-2 py-1.5"><Link to={mfLink(x.month, x.mf)} className="font-semibold text-primary hover:underline">{x.mf}</Link></td>
                  <td className="px-2 py-1.5 text-right">{x.sites}</td><td className="px-2 py-1.5 text-right tabular-nums">{inr2(x.netMf)}</td><td className="px-2 py-1.5 text-right tabular-nums">{inr2(x.net)}</td>
                </tr>
              ))}
              <tr className="border-t border-line bg-surface font-semibold"><td className="px-2 py-1.5">Total</td><td className="px-2 py-1.5 text-right">{view.sites}</td><td className="px-2 py-1.5 text-right tabular-nums">{inr2(sumP(view.mfs.map((x) => x.netMf)))}</td><td className="px-2 py-1.5 text-right tabular-nums">{inr2(view.net)}</td></tr>
            </tbody>
          </table>
        </Modal>
      )}
    </PayoutPage>
  )
}
