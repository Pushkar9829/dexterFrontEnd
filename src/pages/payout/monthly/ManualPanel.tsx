// §9.3 Manual Payout — sections A–F as in the design. Calculation from the approved plan
// (Plan Mapping, else the active plan) via calcFranchise; overrides need the Edit right and are audited.
import { useState } from 'react'
import { CalendarCheck, Calculator, Info, MessageSquare, PencilLine, Pencil, Play, RotateCcw, Save, Search, Trash2, Undo2, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { can, useRole } from '@/lib/rbac'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { apiDeleteLine, apiEnabled, apiSaveManualBatch, isServerId } from '@/data/payoutApi'
import { useSites } from '@/data/network'
import {
  DEDUCTION_LABELS, ZERO_DED, bmPnl, businessStore, calcFranchise, logPayout, nowIso, payoutStore, pctOf, pid, toPaise, useFinanceRules, usePayout,
  type Deductions, type PayoutBatch, type PayoutLine, type TxnData,
} from '@/data/payout'
import { CREDIT_STATUSES, MODEL_OPTIONS, REMARK_MAX, UTR_RE, actor, addTrail, amt, atmInfo, extStore, fyMonths, monthLabel, planFor, totalsOf } from './lib'
import { DetailsCard, GridRow, Panel, SectionBar, numBox, tbodyRow, tdCls, thCls, theadRow, type Details } from './ui'

type CalcKey = 'gross' | 'netFranchisee' | 'withoutTds' | 'taxAmt' | 'net'
const CALC_LABEL: Record<CalcKey, string> = { gross: 'Franchisee Gross Revenue', netFranchisee: 'Net Franchisee', withoutTds: 'FR Payout without TDS', taxAmt: 'TDS / GST Amount', net: 'Net Payout' }
const TXN: { k: keyof TxnData; label: string }[] = [
  { k: 'cash', label: 'Cash' }, { k: 'nonCash', label: 'Non Cash' }, { k: 'postCash', label: 'Post Cash' }, { k: 'postNonCash', label: 'Post Non Cash' }, { k: 'deposit', label: 'Deposit' },
]
const LEFT_DED: (keyof Deductions)[] = ['fixedFee', 'negativeFixedFee', 'iciciSr', 'ntPenalty', 'alf', 'recovery', 'waiver']

type Entry = {
  month: string
  model: string
  atmQuery: string
  atmId: string
  txn: Record<keyof TxnData, string>
  ded: Record<keyof Deductions, string>
  taxPct: string
  ov: Partial<Record<CalcKey, string>>
  releaseDate: string
  creditStatus: string
  paidDate: string
  utr: string
  remarks: string
  lineId?: string
}
const blankTxn = () => ({ cash: '', nonCash: '', postCash: '', postNonCash: '', deposit: '' })
const blankDed = () => Object.fromEntries(Object.keys(ZERO_DED).map((k) => [k, ''])) as Record<keyof Deductions, string>
const blank = (month: string): Entry => ({ month, model: '', atmQuery: '', atmId: '', txn: blankTxn(), ded: blankDed(), taxPct: '', ov: {}, releaseDate: '', creditStatus: '', paidDate: '', utr: '', remarks: '' })
const int = (s: string) => Math.max(0, Math.floor(Number(s.replace(/,/g, '')) || 0))
const pz = (s: string) => toPaise(s || 0)
const rupees = (p: number) => (p / 100).toFixed(2)

export function ManualPanel({ details, setDetails, name, resetName }: { details: Details; setDetails: (p: Partial<Details>) => void; name: string; resetName: () => void }) {
  useRole()
  const { batches, lines } = usePayout()
  const { sites } = useSites()
  const rules = useFinanceRules()
  const [e, setE] = useState<Entry>(() => blank(details.month))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<Partial<Record<CalcKey, boolean>>>({})
  const canEdit = can('Edit')
  const month = e.month || details.month

  // target batch: an existing Manual draft with this name is extended; any other existing name is rejected
  const existing = batches.find((b) => b.name.toUpperCase() === name.trim().toUpperCase())
  const target = existing && existing.type === 'Manual Payout' && existing.status === 'Draft' && existing.month === details.month ? existing : undefined
  const nameError = existing && !target ? (existing.type === 'Manual Payout' && existing.status === 'Draft' ? 'A Manual draft with this name exists for another month' : 'Batch name already exists — use a unique name') : undefined
  const draftLines = target ? lines.filter((l) => l.batchId === target.id) : []

  const info = e.atmId ? atmInfo(e.atmId) : undefined
  const bm = details.vertical === 'Business Model'
  const plan = e.atmId && !bm ? planFor(e.atmId, month) : undefined
  const q = e.atmQuery.trim().toLowerCase()
  const matches = q && !e.atmId ? sites.filter((s) => s.atmId.toLowerCase().includes(q) || s.siteId.toLowerCase().includes(q)).slice(0, 8) : []

  // ── calculation chain (each overridden step feeds the next) ──
  const txn: TxnData = { cash: int(e.txn.cash), nonCash: int(e.txn.nonCash), postCash: int(e.txn.postCash), postNonCash: int(e.txn.postNonCash), deposit: int(e.txn.deposit) }
  const ded = Object.fromEntries(Object.entries(e.ded).map(([k, v]) => [k, Math.abs(pz(v))])) as Deductions
  const taxPct = Number(e.taxPct) || 0
  const c = calcFranchise(plan?.plan, txn, ded, taxPct)
  const bmGross = bm && e.atmId ? bmPnl(businessStore.get(), e.atmId, month).received : 0
  const auto: Record<CalcKey, number> = { gross: bm ? bmGross : c.gross, netFranchisee: 0, withoutTds: 0, taxAmt: 0, net: 0 }
  const val: Record<CalcKey, number> = { ...auto }
  const ovP = (k: CalcKey) => (e.ov[k] !== undefined && e.ov[k] !== '' ? toPaise(e.ov[k]!) : undefined)
  val.gross = ovP('gross') ?? auto.gross
  auto.netFranchisee = val.gross - ded.fixedFee - ded.iciciSr - ded.ntPenalty - ded.alf - ded.recovery + ded.negativeFixedFee + ded.waiver
  val.netFranchisee = ovP('netFranchisee') ?? auto.netFranchisee
  auto.withoutTds = val.netFranchisee - ded.additionalRecovery + ded.credit
  val.withoutTds = ovP('withoutTds') ?? auto.withoutTds
  auto.taxAmt = val.withoutTds > 0 ? pctOf(val.withoutTds, taxPct) : 0
  val.taxAmt = ovP('taxAmt') ?? auto.taxAmt
  auto.net = val.withoutTds - val.taxAmt
  val.net = ovP('net') ?? auto.net
  const overridden = (Object.keys(CALC_LABEL) as CalcKey[]).filter((k) => ovP(k) !== undefined && ovP(k) !== auto[k])

  const setTxn = (k: keyof TxnData, v: string) => setE((x) => ({ ...x, txn: { ...x.txn, [k]: v.replace(/[^\d]/g, '') } }))
  const setDed = (k: keyof Deductions, v: string) => setE((x) => ({ ...x, ded: { ...x.ded, [k]: v.replace(/[^\d.]/g, '') } }))

  const pickAtm = (atmId: string) => {
    const i = atmInfo(atmId)
    if (!i) return
    const p = bm ? undefined : planFor(atmId, month).plan
    setE((x) => ({ ...x, atmId: i.site.atmId, atmQuery: i.site.atmId, model: x.model || (MODEL_OPTIONS.includes(i.site.machineType) ? i.site.machineType : ''), ded: { ...x.ded, fixedFee: x.ded.fixedFee || (p?.fixedFee ? rupees(p.fixedFee) : '') }, taxPct: x.taxPct || (p ? String(p.tdsPct) : '') }))
    setErrors((er) => ({ ...er, atm: '' }))
  }

  const toggleOverride = (k: CalcKey) => {
    if (!canEdit) {
      toast('Manual override needs the Edit right.', 'error')
      return
    }
    if (editing[k]) {
      setEditing((s) => ({ ...s, [k]: false }))
      setE((x) => {
        const ov = { ...x.ov }
        delete ov[k]
        return { ...x, ov }
      })
    } else {
      setEditing((s) => ({ ...s, [k]: true }))
      setE((x) => ({ ...x, ov: { ...x.ov, [k]: rupees(val[k]) } }))
    }
  }

  const reset = () => {
    setE(blank(details.month))
    setEditing({})
    setErrors({})
  }

  const validate = (submit: boolean) => {
    const er: Record<string, string> = {}
    if (!details.fy) er.fy = 'Financial Year is required'
    if (!details.month) er.month = 'Payout Month is required'
    if (!name.trim()) er.name = 'Batch name is required'
    else if (nameError) er.name = nameError
    if (!e.month) er.entryMonth = 'Required'
    if (!e.model) er.model = 'Required'
    if (!e.atmId) er.atm = 'Search and select an ATM ID'
    if (!bm && e.atmId && !plan?.plan) er.atm = 'No approved plan for this ATM'
    if (submit) {
      if (!e.releaseDate) er.releaseDate = 'Required'
      if (!e.creditStatus) er.creditStatus = 'Required'
    }
    if (e.utr && !UTR_RE.test(e.utr)) er.utr = 'UTR must be 8–22 letters / digits'
    // A ₹0 calculation with transactions entered almost always means the plan has no rate for this slab.
    const txnTotal = Number(e.txn.cash || 0) + Number(e.txn.nonCash || 0) + Number(e.txn.postCash || 0) + Number(e.txn.postNonCash || 0) + Number(e.txn.deposit || 0)
    if (!bm && e.atmId && txnTotal > 0 && val.gross === 0) er.atm = `Calculated gross revenue is ₹0 — plan ${plan?.plan?.code ?? ''} has no rate for this transaction slab. Check the plan or map the correct plan to this site.`
    if (e.creditStatus === 'Credited' && submit && !e.paidDate) er.paidDate = 'Paid date needed for a credited payout'
    if (e.remarks.length > REMARK_MAX) er.remarks = `Max ${REMARK_MAX} characters`
    if (overridden.length && !canEdit) er.ov = 'Overrides need the Edit right'
    return er
  }

  /** Saves the current entry into the draft batch (creating it if needed). Returns the batch. */
  const persist = (submit: boolean): PayoutBatch | null => {
    const hasEntry = !!e.atmId
    const er = hasEntry || !submit || !target ? validate(submit) : {}
    setErrors(er)
    if (Object.keys(er).length) {
      toast(Object.values(er).find(Boolean) ?? 'Check the form', 'error')
      return null
    }
    if (!can('Create')) {
      toast('Your role cannot create payout batches.', 'error')
      return null
    }
    const batchId = target?.id ?? pid('BAT')
    const base = target ?? {
      id: batchId, name: name.trim(), fy: details.fy, month: details.month, type: 'Manual Payout' as const, vertical: details.vertical, records: 0, gross: 0, gst: 0, tds: 0, net: 0, status: 'Draft' as const, maker: actor(), createdAt: nowIso(),
    }
    let newLines = draftLines
    if (hasEntry) {
      const prev = draftLines.find((l) => l.id === e.lineId) ?? draftLines.find((l) => l.atmId === e.atmId)
      const line: PayoutLine = {
        id: prev?.id ?? pid('PL'), batchId, source: 'Manual', month: e.month, atmId: e.atmId, siteId: info?.site.siteId ?? '—', model: e.model, cashLiveDate: '', frId: info?.site.frId ?? '',
        frName: info?.frName ?? '—', mfName: info?.mf ?? '—', smfName: info?.smf ?? '—', mfCode: '', city: info?.site.district ?? '', state: info?.site.state ?? '', planCode: plan?.plan?.code,
        txn, ded, gross: val.gross, mfRevenue: c.mfRevenue, taxPct, taxAmt: val.taxAmt, withoutTds: val.withoutTds, net: val.net, pan: '',
        releaseDate: e.releaseDate || undefined, creditStatus: (e.creditStatus || undefined) as PayoutLine['creditStatus'], paidDate: e.paidDate || undefined, utr: e.utr || undefined, remarks: e.remarks || undefined,
        overriddenBy: overridden.length ? actor() : undefined,
      }
      newLines = [...draftLines.filter((l) => l.id !== line.id), line]
      overridden.forEach((k) =>
        logPayout({ by: actor(), area: 'Monthly Payout · Manual override', ref: `${base.name} / ${e.atmId} / ${CALC_LABEL[k]}`, action: 'Calculated value overridden', before: amt(auto[k]), after: amt(val[k]) }),
      )
      if (overridden.length) addTrail(batchId, 'Manual override', `${e.atmId}: ${overridden.map((k) => `${CALC_LABEL[k]} ${amt(auto[k])} → ${amt(val[k])}`).join('; ')}`)
    }
    if (!newLines.length) {
      toast('Add at least one ATM line.', 'error')
      return null
    }
    const t = totalsOf(newLines)
    const batch: PayoutBatch = { ...base, ...t, gst: 0, status: submit ? 'Pending Approval' : 'Draft' }
    payoutStore.set((s) => ({ batches: [batch, ...s.batches.filter((b) => b.id !== batchId)], lines: [...s.lines.filter((l) => l.batchId !== batchId), ...newLines] }))
    if (!target) extStore.set((x) => ({ ...x, meta: { ...x.meta, [batchId]: { siteCategory: details.siteCategory || undefined, beneficiary: details.beneficiary || undefined } } }))
    if (apiEnabled) void apiSaveManualBatch(target?.id ?? null, { name: batch.name, month: batch.month, vertical: batch.vertical, siteCategory: details.siteCategory || undefined }, newLines, submit)
    addTrail(batchId, submit ? 'Submitted for approval' : target ? 'Line saved to draft' : 'Draft created', hasEntry ? `${e.atmId} · net ${amt(val.net)}` : `${newLines.length} line(s)`)
    logPayout({ by: actor(), area: 'Monthly Payout', ref: batch.name, action: submit ? 'Manual payout submitted' : 'Manual payout line saved', after: hasEntry ? `${e.atmId}: ${amt(val.net)}` : `${newLines.length} lines` })
    return batch
  }

  const saveDraft = () => {
    const b = persist(false)
    if (!b) return
    toast(`${e.atmId} saved to draft ${b.name}`)
    reset()
  }
  const submit = () => {
    const b = persist(true)
    if (!b) return
    toast(`${b.name} submitted for approval (${b.records} line(s))`)
    reset()
    resetName()
  }

  const editLine = (l: PayoutLine) => {
    const d = { ...ZERO_DED, ...l.ded }
    setE({
      month: l.month, model: l.model, atmQuery: l.atmId, atmId: l.atmId, txn: { cash: String(l.txn.cash), nonCash: String(l.txn.nonCash), postCash: String(l.txn.postCash), postNonCash: String(l.txn.postNonCash), deposit: String(l.txn.deposit) },
      ded: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ? rupees(v) : ''])) as Record<keyof Deductions, string>, taxPct: String(l.taxPct), ov: {},
      releaseDate: l.releaseDate ?? '', creditStatus: l.creditStatus ?? '', paidDate: l.paidDate ?? '', utr: l.utr ?? '', remarks: l.remarks ?? '', lineId: l.id,
    })
    setEditing({})
    if (l.overriddenBy) toast('This line had overrides — values are recalculated; re-apply overrides if still needed.', 'info')
  }
  const removeLine = (l: PayoutLine) => {
    if (!target) return
    const rest = draftLines.filter((x) => x.id !== l.id)
    const t = totalsOf(rest)
    payoutStore.set((s) => ({ batches: s.batches.map((b) => (b.id === target.id ? { ...b, ...t } : b)), lines: s.lines.filter((x) => x.id !== l.id) }))
    addTrail(target.id, 'Line removed from draft', l.atmId)
    if (apiEnabled && isServerId(l.id)) void apiDeleteLine(target.id, l.id)
    logPayout({ by: actor(), area: 'Monthly Payout', ref: target.name, action: 'Draft line removed', before: `${l.atmId}: ${amt(l.net)}` })
  }

  const calcField = (k: CalcKey, strong = false) => {
    const isOv = editing[k]
    return (
      <GridRow label={CALC_LABEL[k]} strong={strong}>
        <input
          aria-label={CALC_LABEL[k]}
          className={cn(numBox, strong && 'border-0 bg-transparent text-[14px] font-bold disabled:bg-transparent', isOv && 'border-amber-400 bg-amber-50')}
          disabled={!isOv}
          value={isOv ? (e.ov[k] ?? '') : amt(val[k])}
          onChange={(ev) => {
            const v = ev.target.value.replace(/[^\d.-]/g, '')
            setE((x) => ({ ...x, ov: { ...x.ov, [k]: v } }))
          }}
        />
        <button
          type="button"
          onClick={() => toggleOverride(k)}
          title={canEdit ? (isOv ? 'Remove override (use calculated value)' : 'Override calculated value (audited)') : 'Override needs the Edit right'}
          className={cn('grid h-7 w-7 shrink-0 place-items-center', canEdit ? 'text-[#0066FF]' : 'cursor-not-allowed text-slate-300')}
          aria-label={`Override ${CALC_LABEL[k]}`}
        >
          {isOv ? <Undo2 size={13} /> : <Pencil size={12} />}
        </button>
      </GridRow>
    )
  }
  const dedField = (k: keyof Deductions) => (
    <GridRow key={k} label={DEDUCTION_LABELS[k]}>
      <input aria-label={DEDUCTION_LABELS[k]} inputMode="decimal" className={numBox} placeholder="0.00" value={e.ded[k]} onChange={(ev) => setDed(k, ev.target.value)} />
      <span className="w-7 shrink-0" />
    </GridRow>
  )

  return (
    <div className="space-y-4">
      <DetailsCard
        mode="manual"
        details={details}
        onChange={(p) => {
          setDetails(p)
          if (p.month && !e.atmId) setE((x) => ({ ...x, month: p.month! }))
        }}
        name={name}
        nameError={errors.name || nameError}
        nameHint={target ? `Adding to draft ${target.name} (${draftLines.length} line(s))` : 'Must be unique'}
      />

      {/* B – Manual Payout */}
      <Panel>
        <SectionBar icon={<PencilLine size={15} />} title="Manual Payout" right={plan && <Badge tone={plan.plan ? 'blue' : 'red'}>{plan.source}</Badge>} />
        <div className="grid gap-x-8 gap-y-2 px-2 lg:grid-cols-2">
          <div className="grid grid-cols-[110px_1fr] items-center gap-2 text-[12px]">
            <label htmlFor="mm-month" className="font-semibold">
              Month <span className="text-brand-red">*</span>
            </label>
            <select id="mm-month" value={e.month} onChange={(ev) => setE((x) => ({ ...x, month: ev.target.value }))} className={cn('h-8 rounded-md border bg-white px-2 text-[12px]', errors.entryMonth ? 'border-brand-red' : 'border-line')}>
              <option value="">Select</option>
              {fyMonths(details.fy).map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <label htmlFor="mm-model" className="font-semibold">
              Model <span className="text-brand-red">*</span>
            </label>
            <select id="mm-model" value={e.model} onChange={(ev) => setE((x) => ({ ...x, model: ev.target.value }))} className={cn('h-8 rounded-md border bg-white px-2 text-[12px]', errors.model ? 'border-brand-red' : 'border-line')}>
              <option value="">Select</option>
              {MODEL_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-[110px_1fr] items-start gap-2 text-[12px]">
            <label htmlFor="mm-atm" className="pt-1.5 font-semibold">
              ATM ID <span className="text-brand-red">*</span>
            </label>
            <div className="relative">
              <div className={cn('flex h-8 items-center gap-2 rounded-md border bg-white px-2', errors.atm ? 'border-brand-red' : 'border-line')}>
                <Search size={14} className="text-muted" />
                <input
                  id="mm-atm"
                  value={e.atmQuery}
                  placeholder="Search ATM ID / Site ID"
                  autoComplete="off"
                  onChange={(ev) => {
                    const v = ev.target.value.toUpperCase()
                    setE((x) => ({ ...x, atmQuery: v, atmId: '' }))
                  }}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' && matches[0]) pickAtm(matches[0].atmId)
                  }}
                  className="h-full w-full bg-transparent text-[12px] outline-none"
                />
                {e.atmQuery && (
                  <button type="button" onClick={() => setE((x) => ({ ...x, atmQuery: '', atmId: '' }))} aria-label="Clear ATM" className="text-[#0066FF]">
                    <XCircle size={15} />
                  </button>
                )}
              </div>
              {matches.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-line bg-white shadow-lg" role="listbox">
                  {matches.map((s) => (
                    <li key={s.siteId}>
                      <button type="button" onClick={() => pickAtm(s.atmId)} className="flex w-full justify-between px-3 py-1.5 text-left text-[12px] hover:bg-blue-50">
                        <span className="font-semibold">{s.atmId}</span>
                        <span className="text-muted">
                          {s.siteId} · {s.district}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {q && !e.atmId && matches.length === 0 && <p className="mt-1 text-[11px] text-brand-red">No ATM found in the site master (Unmapped Site).</p>}
              {errors.atm && <p className="mt-1 text-[11px] text-brand-red">{errors.atm}</p>}
            </div>
            <span className="font-semibold">Franchisee Name</span>
            <div className="h-8 truncate rounded-md bg-slate-100 px-2 leading-8">{info?.frName ?? '—'}</div>
          </div>
        </div>
        {info && (
          <div className="mx-2 grid gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11.5px] sm:grid-cols-3 lg:grid-cols-6">
            <span><b>Site ID:</b> {info.site.siteId}</span>
            <span><b>MF:</b> {info.mf}</span>
            <span><b>Super MF:</b> {info.smf}</span>
            <span><b>Location:</b> {info.site.district}, {info.site.state}</span>
            <span><b>Site type:</b> {info.site.siteType}</span>
            <span><b>Plan:</b> {bm ? 'BM engine' : plan?.plan ? `${plan.plan.code} · ${plan.plan.name}` : 'None'}</span>
          </div>
        )}
      </Panel>

      {/* C – Transaction Data */}
      <Panel>
        <SectionBar icon={<CalendarCheck size={15} />} title="Transaction Data of Current Month" />
        <div className="grid gap-x-10 gap-y-0 px-2 lg:grid-cols-2">
          <div>
            {TXN.filter((_, i) => i % 2 === 0).map((t) => (
              <GridRow key={t.k} label={t.label}>
                <input aria-label={t.label} inputMode="numeric" className={numBox} placeholder="0" value={e.txn[t.k]} onChange={(ev) => setTxn(t.k, ev.target.value)} />
              </GridRow>
            ))}
          </div>
          <div>
            {TXN.filter((_, i) => i % 2 === 1).map((t) => (
              <GridRow key={t.k} label={t.label}>
                <input aria-label={t.label} inputMode="numeric" className={numBox} placeholder="0" value={e.txn[t.k]} onChange={(ev) => setTxn(t.k, ev.target.value)} />
              </GridRow>
            ))}
          </div>
        </div>
        <p className="px-2 text-[11px] text-muted">Counts of successful transactions. Post Cash / Post Non Cash are paid at the same slab rate.</p>
      </Panel>

      {/* D – Franchisee Payout Calculation */}
      <Panel>
        <SectionBar icon={<Calculator size={15} />} title="Franchisee Payout Calculation" right={overridden.length > 0 && <Badge tone="amber">{overridden.length} override(s) — audited</Badge>} />
        <p className="mx-2 flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1.5 text-[11.5px] text-amber-800">
          <Info size={13} /> Formula provisional — Finance sign-off pending (spec §5.2 / §21). {bm ? 'BM vertical: gross = received payout from the BM P&L.' : ''} Pencil = override a calculated value (Edit right, audited old → new).
        </p>
        <div className="grid gap-x-10 px-2 lg:grid-cols-2">
          <div>
            {calcField('gross')}
            {LEFT_DED.map(dedField)}
          </div>
          <div>
            {calcField('netFranchisee')}
            {dedField('additionalRecovery')}
            {dedField('credit')}
            {calcField('withoutTds')}
            <GridRow label="TDS / GST %">
              <select aria-label="TDS / GST %" value={e.taxPct} onChange={(ev) => setE((x) => ({ ...x, taxPct: ev.target.value }))} className="h-7 w-full border border-slate-200 bg-white px-2 text-[12px]">
                <option value="">Select</option>
                {rules.tdsRates.map((r) => (
                  <option key={r} value={String(r)}>
                    {r}%
                  </option>
                ))}
              </select>
              <span className="w-7 shrink-0" />
            </GridRow>
            {calcField('taxAmt')}
            {calcField('net', true)}
          </div>
        </div>
        {overridden.length > 0 && (
          <ul className="mx-2 space-y-0.5 text-[11px] text-amber-800">
            {overridden.map((k) => (
              <li key={k}>
                {CALC_LABEL[k]}: calculated {amt(auto[k])} → override {amt(val[k])}
              </li>
            ))}
          </ul>
        )}
        {errors.ov && <p className="px-2 text-[11px] text-brand-red">{errors.ov}</p>}
      </Panel>

      {/* E – Payment Details */}
      <Panel>
        <SectionBar icon={<CalendarCheck size={15} />} title="Payment Details" />
        <div className="grid gap-x-10 gap-y-2 px-2 lg:grid-cols-2">
          {[
            { id: 'releaseDate', label: 'Release Date', req: true, el: <input id="mm-rd" type="date" value={e.releaseDate} onChange={(ev) => setE((x) => ({ ...x, releaseDate: ev.target.value }))} className={cn('h-8 w-full rounded-md border px-2 text-[12px]', errors.releaseDate ? 'border-brand-red' : 'border-line')} /> },
            { id: 'paidDate', label: 'Paid Date', req: false, el: <input id="mm-pd" type="date" value={e.paidDate} onChange={(ev) => setE((x) => ({ ...x, paidDate: ev.target.value }))} className={cn('h-8 w-full rounded-md border px-2 text-[12px]', errors.paidDate ? 'border-brand-red' : 'border-line')} /> },
            {
              id: 'creditStatus', label: 'Credit Status', req: true,
              el: (
                <select id="mm-cs" value={e.creditStatus} onChange={(ev) => setE((x) => ({ ...x, creditStatus: ev.target.value }))} className={cn('h-8 w-full rounded-md border bg-white px-2 text-[12px]', errors.creditStatus ? 'border-brand-red' : 'border-line')}>
                  <option value="">Select Credit Status</option>
                  {CREDIT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ),
            },
            { id: 'utr', label: 'UTR', req: false, el: <input id="mm-utr" value={e.utr} maxLength={22} placeholder="Enter UTR Number" onChange={(ev) => setE((x) => ({ ...x, utr: ev.target.value.toUpperCase().replace(/\s/g, '') }))} className={cn('h-8 w-full rounded-md border px-2 text-[12px]', errors.utr ? 'border-brand-red' : 'border-line')} /> },
          ].map((f) => (
            <div key={f.id} className="grid grid-cols-[150px_1fr] items-center text-[12px]">
              <span className="flex h-8 items-center bg-[#fdf0cf] px-3 font-semibold">
                {f.label}
                {f.req && <span className="text-brand-red">*</span>}
              </span>
              <div>
                {f.el}
                {errors[f.id] && <p className="text-[11px] text-brand-red">{errors[f.id]}</p>}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* F – Remarks & Actions */}
      <Panel>
        <SectionBar icon={<MessageSquare size={15} />} title="Remarks" />
        <div className="relative px-2">
          <textarea value={e.remarks} maxLength={REMARK_MAX} rows={2} placeholder="Enter Remarks (Optional)" onChange={(ev) => setE((x) => ({ ...x, remarks: ev.target.value }))} className="w-full rounded-md border border-line px-3 py-2 text-[12px] outline-none focus:border-primary" aria-label="Remarks" />
          <span className="absolute right-4 bottom-2 text-[11px] text-muted">
            {e.remarks.length}/{REMARK_MAX}
          </span>
        </div>
      </Panel>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {target && <span className="mr-auto text-[11.5px] text-muted">Submit sends the whole draft ({draftLines.length + (e.atmId && !draftLines.some((l) => l.atmId === e.atmId) ? 1 : 0)} line(s)) for approval.</span>}
        <Button variant="secondary" icon={<RotateCcw size={14} />} onClick={reset}>
          Reset
        </Button>
        <Button variant="secondary" icon={<Save size={14} />} onClick={saveDraft}>
          Save Draft
        </Button>
        <Button variant="bright" icon={<Play size={14} />} onClick={submit}>
          Submit
        </Button>
      </div>

      {target && draftLines.length > 0 && (
        <Panel>
          <SectionBar icon={<PencilLine size={15} />} title={`Lines in draft ${target.name}`} right={<span className="text-[12px] font-semibold text-primary">Net {amt(target.net)}</span>} />
          <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr className={theadRow}>
                  {['ATM ID', 'Site ID', 'Franchisee', 'Cash', 'Non Cash', 'Gross (₹)', 'TDS %', 'Net Payout (₹)', 'Override', 'Action'].map((h) => (
                    <th key={h} className={thCls}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {draftLines.map((l) => (
                  <tr key={l.id} className={cn(tbodyRow, e.lineId === l.id && 'bg-blue-50/60')}>
                    <td className={`${tdCls} font-semibold`}>{l.atmId}</td>
                    <td className={tdCls}>{l.siteId}</td>
                    <td className={`${tdCls} text-left`}>{l.frName}</td>
                    <td className={tdCls}>{l.txn.cash}</td>
                    <td className={tdCls}>{l.txn.nonCash}</td>
                    <td className={`${tdCls} text-right tabular-nums`}>{amt(l.gross)}</td>
                    <td className={tdCls}>{l.taxPct}%</td>
                    <td className={`${tdCls} text-right font-semibold tabular-nums`}>{amt(l.net)}</td>
                    <td className={tdCls}>{l.overriddenBy ? <Badge tone="amber">By {l.overriddenBy}</Badge> : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-center gap-3">
                        <button type="button" onClick={() => editLine(l)} className="text-[#0066FF]" aria-label={`Edit ${l.atmId}`}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" onClick={() => removeLine(l)} className="text-brand-red" aria-label={`Remove ${l.atmId}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  )
}
