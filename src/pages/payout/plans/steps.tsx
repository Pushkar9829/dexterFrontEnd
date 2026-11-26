import { useState } from 'react'
import { AlertTriangle, BadgeIndianRupee, ClipboardList, Coins, FileText, Gift, Info, Landmark, Settings2 } from 'lucide-react'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { Checkbox } from '@/components/ui/Field'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { totalInvestment, useBusiness, VERTICALS, type Vertical } from '@/data/payout'
import {
  APPLICABLE_FOR, ELIGIBILITY_MAX, FREQUENCIES, GST_RATES, GUARANTEE_TYPES, INCENTIVE_BASIS, INCENTIVE_TO, INCENTIVE_TYPES, MODEL_TYPES,
  PLAN_CATEGORIES, PLAN_TYPES, RENTAL_KINDS, RENTAL_TO, TXN_TYPES, categoriesFor, rs, validateDepositSlabs, validateIncentive,
  validateRental, validateTxnSlabs, type DepositSlab, type Errors, type Incentive, type PlanX, type RentalMg, type TxnSlab,
} from './model'
import { EditableGrid, type GridCol } from './grid'
import { FieldError, IssueList, MoneyInput, NumInput, SectionBar, inputCls } from './ui'

export type StepProps = { plan: PlanX; set: (patch: Partial<PlanX>) => void; show: boolean; onEditing: (busy: boolean) => void }

const sel = (value: string, onChange: (v: string) => void, options: readonly string[], label: string) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={cn(inputCls, 'min-w-[110px] border-line')}>
    {options.map((o) => <option key={o}>{o}</option>)}
  </select>
)

// ── Step 1: Plan Details + Investment Details (Page 01 + Page 02 merged) ──────
export function StepDetails({ plan, set, show, errors, codeLocked }: Omit<StepProps, 'onEditing'> & { errors: Errors; codeLocked: boolean }) {
  const business = useBusiness()
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const err = (k: string) => (show || touched[k] ? errors[k] : undefined)
  const touch = (k: string) => () => setTouched((t) => (t[k] ? t : { ...t, [k]: true }))
  const cats = categoriesFor(plan.vertical, business)
  const inv = plan.investment
  const t = totalInvestment(plan)
  const setInv = (patch: Partial<PlanX['investment']>) => set({ investment: { ...inv, ...patch } })
  const bm = plan.vertical === 'Business Model'

  return (
    <div className="space-y-4">
      <SectionBar icon={<FileText size={16} />} title="Plan Details" />
      <div className="grid gap-x-6 gap-y-3 px-1 md:grid-cols-3">
        <TextField label="Plan Name" required name="planName" value={plan.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} onBlur={touch('name')} error={err('name')} placeholder="e.g. WLA Palladium – ATM Model" />
        <SelectField label="Model Type" required name="modelType" value={plan.modelType} options={MODEL_TYPES} onChange={(e) => set({ modelType: e.target.value as PlanX['modelType'] })} onBlur={touch('modelType')} error={err('modelType')} />
        <SelectField label="Plan Type" required name="planType" value={plan.planType} options={PLAN_TYPES} onChange={(e) => set({ planType: e.target.value as PlanX['planType'] })} onBlur={touch('planType')} error={err('planType')} />
        <TextField label="Plan Code" required name="planCode" value={plan.code} readOnly disabled={codeLocked} className="[&_input]:bg-surface" hint={codeLocked ? `Version ${plan.version} of an existing plan` : 'Auto-generated, unique'} error={err('code')} />
        <SelectField
          label="Business Vertical" required name="vertical" value={plan.vertical} options={VERTICALS} onBlur={touch('vertical')} error={err('vertical')}
          disabled={codeLocked} hint={codeLocked ? 'The vertical of an existing plan cannot change' : undefined}
          onChange={(e) => {
            const v = e.target.value as Vertical
            set({ vertical: v, siteCategory: '', applicableFor: v === 'Business Model' ? 'MF' : plan.applicableFor })
          }}
        />
        <SelectField label="Site Category" required name="siteCategory" value={plan.siteCategory} options={cats} placeholder={plan.vertical ? 'Select category' : 'Select vertical first'} onChange={(e) => set({ siteCategory: e.target.value })} onBlur={touch('siteCategory')} error={err('siteCategory')} hint={plan.vertical ? `${plan.vertical} categories only` : undefined} />
        <SelectField label="Applicable For" required name="applicableFor" value={plan.applicableFor} options={bm ? ['MF'] : APPLICABLE_FOR} onChange={(e) => set({ applicableFor: e.target.value as PlanX['applicableFor'] })} onBlur={touch('applicableFor')} error={err('applicableFor')} hint={bm ? 'BM sites can only be assigned to MF / Super MF' : undefined} />
        <div className="md:col-span-2">
          <TextAreaField label="Eligibility Criteria" required name="eligibility" value={plan.eligibility} maxLength={ELIGIBILITY_MAX} onChange={(e) => set({ eligibility: e.target.value })} onBlur={touch('eligibility')} error={err('eligibility')} placeholder="Who is eligible for this plan…" />
          <div className={cn('mt-0.5 text-right text-[11px]', plan.eligibility.length >= ELIGIBILITY_MAX ? 'text-brand-red' : 'text-muted')}>{plan.eligibility.length}/{ELIGIBILITY_MAX}</div>
        </div>
      </div>

      <SectionBar icon={<Landmark size={16} />} title="Investment Details" />
      <div className="grid gap-6 px-1 lg:grid-cols-2">
        <div className="space-y-2.5">
          {([['initial', 'Initial Investment (₹)', inv.initial], ['refundableDeposit', 'Refundable Deposit (₹)', inv.refundableDeposit], ['upfrontFee', 'Upfront Fee (₹)', inv.upfrontFee]] as const).map(([k, l, v]) => (
            <div key={k} className="grid grid-cols-[180px_1fr] items-start gap-3">
              <label htmlFor={`inv-${k}`} className="pt-2 text-[12.5px] font-semibold text-[#0b2a6b]">{l} <span className="text-brand-red">*</span></label>
              <div onBlur={touch(k)}>
                <MoneyInput id={`inv-${k}`} value={v} onChange={(p) => setInv({ [k]: p })} error={!!err(k)} />
                <FieldError msg={err(k)} />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2.5 lg:border-l lg:border-line lg:pl-6">
          <div className="grid grid-cols-[180px_1fr] items-center gap-3">
            <label htmlFor="inv-gst" className="text-[12.5px] font-semibold text-[#0b2a6b]">GST Rate (%) <span className="text-brand-red">*</span></label>
            <select id="inv-gst" value={String(inv.gstRate)} onChange={(e) => setInv({ gstRate: Number(e.target.value) })} className={cn(inputCls, 'h-9 border-line')}>
              {GST_RATES.map((g) => <option key={g} value={g}>{g}%</option>)}
            </select>
          </div>
          <div className="grid grid-cols-[180px_1fr] items-center gap-3">
            <span className="text-[12.5px] font-semibold text-[#0b2a6b]">GST Amount (₹)</span>
            <div className="flex h-9 items-center justify-end rounded-md bg-surface px-3 text-[13px] tabular-nums" title="GST on the upfront fee">{rs(t.gst)}</div>
          </div>
          <div className="flex h-11 items-center justify-between rounded-md bg-amber-100 px-3">
            <span className="text-[14px] font-bold text-ink">Total Investment (₹)</span>
            <span className="text-[17px] font-bold tabular-nums">{rs(t.total)}</span>
          </div>
          <p className="text-[11px] text-muted">GST applies to the upfront fee. Total = Initial Investment + GST.</p>
          {!t.consistent && inv.initial > 0 && (
            <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11.5px] text-amber-800">
              <AlertTriangle size={14} className="mt-px shrink-0" />
              Initial investment ({rs(inv.initial)}) ≠ Refundable Deposit + Upfront Fee ({rs(inv.refundableDeposit + inv.upfrontFee)}). Check the figures.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Step 2: Transaction Slab + Deposit Commission ────────────────────────────
const rangeCheck = (r: { from: number; to: number | null }) => (!Number.isInteger(r.from) || r.from < 0 ? 'From must be a whole number ≥ 0.' : r.to !== null && r.to <= r.from ? 'From must be less than To.' : null)
const rateCheck = (xs: number[]) => (xs.some((n) => !Number.isFinite(n) || n < 0 || n > 10000) ? 'Rates must be between ₹0 and ₹10,000.' : null)

export function StepSlabs({ plan, set, show, onEditing }: StepProps) {
  const flat = plan.planCategory === 'Flat rate per TXN'
  const tv = validateTxnSlabs(plan)
  const dv = validateDepositSlabs(plan)
  const [busy, setBusy] = useState({ txn: false, dep: false })
  const mark = (k: 'txn' | 'dep') => (b: boolean) => {
    const next = { ...busy, [k]: b }
    setBusy(next)
    onEditing(next.txn || next.dep)
  }

  const rate = (who: 'fr' | 'mf' | 'tl', kind: 'cash' | 'nonCash'): GridCol<TxnSlab> => ({
    key: `${who}-${kind}`, head: kind === 'cash' ? 'Cash TXN' : 'Non Cash TXN', group: who === 'fr' ? 'Franchise Payout' : who === 'mf' ? 'MF Payout' : 'Team Leader Payout',
    view: (r) => r[who][kind],
    edit: (d, s) => <NumInput ariaLabel={`${who} ${kind}`} value={d[who][kind]} onChange={(n) => s({ ...d, [who]: { ...d[who], [kind]: n ?? 0 } })} />,
  })
  const txnCols: GridCol<TxnSlab>[] = [
    { key: 'from', head: 'From', group: 'Transaction Slab', view: (r) => r.from, edit: (d, s) => <NumInput integer ariaLabel="From" disabled={flat} value={d.from} onChange={(n) => s({ ...d, from: n ?? 0 })} /> },
    { key: 'to', head: 'To', group: 'Transaction Slab', view: (r) => r.to ?? 'Above', edit: (d, s) => <NumInput integer allowEmpty ariaLabel="To" placeholder="Above" disabled={flat} value={d.to} onChange={(n) => s({ ...d, to: n })} /> },
    { key: 'count', head: 'TXN Count', view: (r) => (r.to === null ? '—' : Math.max(0, r.to - r.from + 1)) },
    rate('fr', 'cash'), rate('fr', 'nonCash'), rate('mf', 'cash'), rate('mf', 'nonCash'), rate('tl', 'cash'), rate('tl', 'nonCash'),
  ]
  const depRate = (who: 'fr' | 'mf' | 'tl', group: string): GridCol<DepositSlab> => ({
    key: who, head: 'Cash TXN', group, view: (r) => r[who], edit: (d, s) => <NumInput ariaLabel={`${group} rate`} value={d[who]} onChange={(n) => s({ ...d, [who]: n ?? 0 })} />,
  })
  const depCols: GridCol<DepositSlab>[] = [
    { key: 'from', head: 'From', group: 'Transaction Slab', view: (r) => (r.to === null && r.from > 1 ? `Above ${r.from - 1}` : r.from), edit: (d, s) => <NumInput integer ariaLabel="From" value={d.from} onChange={(n) => s({ ...d, from: n ?? 0 })} /> },
    { key: 'to', head: 'To', group: 'Transaction Slab', view: (r) => r.to ?? '—', edit: (d, s) => <NumInput integer allowEmpty ariaLabel="To" placeholder="Above" value={d.to} onChange={(n) => s({ ...d, to: n })} /> },
    depRate('fr', 'Franchise Payout'), depRate('mf', 'Master Franchise'), depRate('tl', 'Team Leader'),
  ]
  const newTxn = (rows: TxnSlab[]): TxnSlab[] => {
    const last = rows[rows.length - 1]
    if (!last) return [{ from: 1, to: 500, fr: { cash: 0, nonCash: 0 }, mf: { cash: 0, nonCash: 0 }, tl: { cash: 0, nonCash: 0 } }]
    const closed = last.to === null ? { ...last, to: last.from + 499 } : last
    const from = (closed.to ?? 0) + 1
    return [...rows.slice(0, -1), closed, { from, to: from + 499, fr: { ...last.fr }, mf: { ...last.mf }, tl: { ...last.tl } }]
  }
  const newDep = (rows: DepositSlab[]): DepositSlab[] => {
    const last = rows[rows.length - 1]
    if (!last) return [{ from: 1, to: null, fr: 0, mf: 0, tl: 0 }]
    const closed = last.to === null ? { ...last, to: last.from + 9999 } : last
    return [...rows.slice(0, -1), closed, { from: (closed.to ?? 0) + 1, to: null, fr: last.fr, mf: last.mf, tl: last.tl }]
  }
  const changeCategory = (c: PlanX['planCategory']) => {
    if (busy.txn) return toast('Save or cancel the slab row being edited first', 'info')
    if (c === 'Flat rate per TXN') {
      const first = plan.txnSlabs[0] ?? newTxn([])[0]
      set({ planCategory: c, txnSlabs: [{ ...first, from: 1, to: null }] })
      if (plan.txnSlabs.length > 1) toast(`Flat rate keeps one rate row — the first slab's rates were kept (${plan.txnSlabs.length - 1} slab(s) removed)`, 'info')
    } else set({ planCategory: c })
  }

  return (
    <div className="space-y-5">
      <EditableGrid
        title="Transaction Slab Configuration" icon={<ClipboardList size={16} />} sub="₹ per transaction · slabs must be continuous (no gaps or overlaps)"
        rows={plan.txnSlabs} cols={txnCols} onChange={(rows) => set({ txnSlabs: rows })} makeNew={newTxn} rowErrors={tv.rows} minWidth={1050}
        canAdd={!flat} addHint={flat ? 'Flat rate per TXN uses a single rate row' : undefined} onEditing={mark('txn')}
        checkRow={(r) => (flat ? rateCheck([r.fr.cash, r.fr.nonCash, r.mf.cash, r.mf.nonCash, r.tl.cash, r.tl.nonCash]) : rangeCheck(r) ?? rateCheck([r.fr.cash, r.fr.nonCash, r.mf.cash, r.mf.nonCash, r.tl.cash, r.tl.nonCash]))}
      />
      {show && <IssueList items={tv.list} title="Transaction slab" />}
      <EditableGrid
        title="Deposit Commission" icon={<Coins size={16} />} sub="₹ per deposit transaction · last row may be “Above X”"
        rows={plan.depositSlabs} cols={depCols} onChange={(rows) => set({ depositSlabs: rows })} makeNew={newDep} rowErrors={dv.rows} onEditing={mark('dep')}
        checkRow={(r) => rangeCheck(r) ?? rateCheck([r.fr, r.mf, r.tl])}
      />
      {show && <IssueList items={dv.list} title="Deposit commission" />}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <label htmlFor="planCategory" className="text-[13px] font-semibold text-[#0b2a6b]">Plan Category <span className="text-brand-red">*</span></label>
        <select id="planCategory" value={plan.planCategory} onChange={(e) => changeCategory(e.target.value as PlanX['planCategory'])} className={cn(inputCls, 'h-9 w-[260px] border-line')}>
          {PLAN_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="text-[11.5px] text-muted">{flat ? 'One rate applies to every transaction (single row, 1 → Above).' : 'Rates change with the monthly cash transaction count.'}</span>
      </div>
    </div>
  )
}

// ── Step 3: Incentive & Rental / MG Configuration ────────────────────────────
export function StepIncentives({ plan, set, show, onEditing }: StepProps) {
  const rv = validateRental(plan)
  const [busy, setBusy] = useState({ inc: false, rent: false })
  const mark = (k: 'inc' | 'rent') => (b: boolean) => {
    const next = { ...busy, [k]: b }
    setBusy(next)
    onEditing(next.inc || next.rent)
  }
  const incRows: Record<number, string> = {}
  plan.incentives.forEach((x, i) => {
    const m = validateIncentive(x, plan.incentives, i)
    if (m) incRows[i] = `Incentive ${i + 1}: ${m}`
  })

  const incCols: GridCol<Incentive>[] = [
    { key: 'name', head: 'Incentive Name', view: (r) => <span className="block text-left">{r.name}</span>, edit: (d, s) => <input aria-label="Incentive name" value={d.name} maxLength={80} onChange={(e) => s({ ...d, name: e.target.value })} className={cn(inputCls, 'min-w-[180px] border-line')} /> },
    { key: 'type', head: 'Incentive Type', view: (r) => r.type, edit: (d, s) => sel(d.type, (v) => { const type = v as Incentive['type']; s({ ...d, type, threshold: type === 'Threshold-Based' ? d.threshold : null, frequency: type === 'One-Time' ? 'One-Time' : d.frequency === 'One-Time' ? 'Monthly' : d.frequency }) }, INCENTIVE_TYPES, 'Incentive type') },
    { key: 'to', head: 'Applicable To', view: (r) => r.applicableTo, edit: (d, s) => sel(d.applicableTo, (v) => s({ ...d, applicableTo: v as Incentive['applicableTo'] }), plan.vertical === 'Business Model' ? ['MF'] : INCENTIVE_TO, 'Applicable to') },
    { key: 'basis', head: 'Calculation Basis', view: (r) => r.basis, edit: (d, s) => sel(d.basis, (v) => s({ ...d, basis: v }), INCENTIVE_BASIS, 'Calculation basis') },
    { key: 'txn', head: 'Transaction Type', view: (r) => r.txnType, edit: (d, s) => sel(d.txnType, (v) => s({ ...d, txnType: v as Incentive['txnType'] }), TXN_TYPES, 'Transaction type') },
    { key: 'th', head: 'Threshold', view: (r) => r.threshold ?? '—', edit: (d, s) => <NumInput integer allowEmpty ariaLabel="Threshold" placeholder="—" disabled={d.type !== 'Threshold-Based'} value={d.threshold} onChange={(n) => s({ ...d, threshold: n })} /> },
    { key: 'amt', head: 'Incentive Rate / Amount (₹)', view: (r) => rs(r.amount, r.type === 'Per Transaction' ? 2 : 0), edit: (d, s) => <MoneyInput ariaLabel="Rate or amount" value={d.amount} onChange={(p) => s({ ...d, amount: p })} className="h-8" /> },
    { key: 'freq', head: 'Payment Frequency', view: (r) => r.frequency, edit: (d, s) => sel(d.frequency, (v) => s({ ...d, frequency: v as Incentive['frequency'] }), d.type === 'One-Time' ? ['One-Time'] : FREQUENCIES.filter((f) => f !== 'One-Time'), 'Payment frequency') },
  ]
  const rentCols: GridCol<RentalMg>[] = [
    { key: 'kind', head: 'Configuration Type', view: (r) => r.kind, edit: (d, s) => sel(d.kind, (v) => { const kind = v as RentalMg['kind']; s({ ...d, kind, amount: kind.includes('Waiver') ? 0 : d.amount, to: kind.includes('Waiver') ? null : d.to }) }, RENTAL_KINDS, 'Configuration type') },
    { key: 'from', head: 'Cash TXN Slab From', view: (r) => r.from, edit: (d, s) => <NumInput integer ariaLabel="Slab from" value={d.from} onChange={(n) => s({ ...d, from: n ?? 0 })} /> },
    { key: 'to', head: 'Cash TXN Slab To', view: (r) => r.to ?? 'Above', edit: (d, s) => <NumInput integer allowEmpty ariaLabel="Slab to" placeholder="Above" value={d.to} onChange={(n) => s({ ...d, to: n })} /> },
    { key: 'amt', head: 'Monthly Rental / MG Amount (₹)', view: (r) => (r.amount === 0 ? '0 (NIL)' : rs(r.amount)), edit: (d, s) => <MoneyInput ariaLabel="Monthly amount" disabled={d.kind.includes('Waiver')} value={d.amount} onChange={(p) => s({ ...d, amount: p })} className="h-8" /> },
    { key: 'to2', head: 'Applicable To', view: (r) => r.applicableTo, edit: (d, s) => sel(d.applicableTo, (v) => s({ ...d, applicableTo: v as RentalMg['applicableTo'] }), plan.vertical === 'Business Model' ? ['MF'] : RENTAL_TO, 'Applicable to') },
  ]
  const newRental = (rows: RentalMg[]): RentalMg[] => {
    const last = rows[rows.length - 1]
    const from = last ? (last.to ?? last.from) + 1 : 0
    return [...rows, { kind: last?.kind.startsWith('MG') ? 'MG' : 'Rental', from, to: from + 299, amount: 0, applicableTo: plan.vertical === 'Business Model' ? 'MF' : 'Franchisee' }]
  }
  const newIncentive = (rows: Incentive[]): Incentive[] => [
    ...rows,
    { name: '', type: 'One-Time', applicableTo: plan.vertical === 'Business Model' ? 'MF' : 'Franchisee', basis: 'Per Site', txnType: 'Both', threshold: null, amount: 0, frequency: 'One-Time' },
  ]
  const ufToggle = (v: boolean) => {
    if (busy.rent) return toast('Save or cancel the Rental / MG row being edited first', 'info')
    set({ noFixedMonthlyGuarantee: v, guaranteeType: v ? 'None' : 'Rental / MG Slab Based' })
  }

  return (
    <div className="space-y-5">
      <EditableGrid
        title="Incentive Configuration" icon={<Gift size={16} />} rows={plan.incentives} cols={incCols} onChange={(rows) => set({ incentives: rows })} makeNew={newIncentive}
        addLabel="Add Incentive" rowErrors={incRows} onEditing={mark('inc')} minWidth={1150}
        checkRow={(r, i, rows) => validateIncentive(r, rows, i)}
      />
      {show && <IssueList items={Object.values(incRows)} title="Incentives" />}
      <div className="grid items-end gap-3 rounded-lg bg-surface px-3 py-3 md:grid-cols-[200px_180px_1fr_1fr]">
        <div className="flex h-9 items-center gap-2 text-[13px] font-semibold text-[#0b2a6b]"><Settings2 size={16} /> Incentive Rule Settings</div>
        <SelectField label="GST Applicable" required name="gstApplicable" value={plan.gstApplicable ? 'Yes' : 'No'} options={['Yes', 'No']} onChange={(e) => set({ gstApplicable: e.target.value === 'Yes' })} />
        <TextField label="Eligibility Criteria" name="incElig" value={plan.incentiveEligibility ?? ''} maxLength={200} onChange={(e) => set({ incentiveEligibility: e.target.value })} placeholder="e.g., Applicable for active sites only" />
        <TextField label="Remarks" name="incRemarks" value={plan.incentiveRemarks ?? ''} maxLength={200} onChange={(e) => set({ incentiveRemarks: e.target.value })} placeholder="e.g., As per approved plan terms" />
      </div>

      <div className={cn(plan.noFixedMonthlyGuarantee && 'pointer-events-none opacity-50')} aria-disabled={plan.noFixedMonthlyGuarantee}>
        <EditableGrid
          title="Rental / MG Configuration" icon={<BadgeIndianRupee size={16} />} rows={plan.rentalMg} cols={rentCols} onChange={(rows) => set({ rentalMg: rows })} makeNew={newRental}
          rowErrors={rv.rows} onEditing={mark('rent')} readOnly={plan.noFixedMonthlyGuarantee}
          checkRow={(r) => rangeCheck(r) ?? (r.kind.includes('Waiver') ? (r.amount !== 0 ? 'A waiver row must have ₹0 (NIL).' : null) : r.amount <= 0 ? `Enter the monthly ${r.kind} amount.` : null)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
        <label htmlFor="guaranteeType" className="text-[13px] font-semibold text-[#0b2a6b]">Guarantee Type <span className="text-brand-red">*</span></label>
        <select id="guaranteeType" value={plan.guaranteeType} disabled={plan.noFixedMonthlyGuarantee} onChange={(e) => set({ guaranteeType: e.target.value as PlanX['guaranteeType'] })} className={cn(inputCls, 'h-9 w-[260px] border-line')}>
          {GUARANTEE_TYPES.map((g) => <option key={g}>{g}</option>)}
        </select>
        <Checkbox checked={plan.noFixedMonthlyGuarantee} onChange={ufToggle} label={<span className="text-[13px] font-semibold">No Fixed Monthly Guarantee (UF Model)</span>} />
      </div>
      <p className="flex items-start gap-2 rounded-lg bg-[#eaf1ff] px-3 py-2 text-[12.5px] text-ink-2">
        <Info size={15} className="mt-0.5 shrink-0 text-[#0066FF]" />
        Configure Rental or MG rules as applicable to the selected plan. Palladium UF model does not have a fixed monthly guarantee.
      </p>
      {show && <IssueList items={rv.list} title="Rental / MG" />}
    </div>
  )
}

// ── Step 4 (editable part): validity, fixed fee, TDS ─────────────────────────
export function StepValidity({ plan, set, show, errors }: Omit<StepProps, 'onEditing'> & { errors: Errors }) {
  const e = (k: string) => (show ? errors[k] : undefined)
  return (
    <div className="grid gap-x-6 gap-y-3 px-1 sm:grid-cols-2 lg:grid-cols-4">
      <TextField label="Effective From" required type="date" name="effFrom" value={plan.effectiveFrom} onChange={(ev) => set({ effectiveFrom: ev.target.value })} error={e('effectiveFrom') ?? errors.effectiveFrom} />
      <TextField label="Effective To" type="date" name="effTo" value={plan.effectiveTo ?? ''} min={plan.effectiveFrom} onChange={(ev) => set({ effectiveTo: ev.target.value || null })} error={errors.effectiveTo} hint="Leave empty for open-ended" />
      <div>
        <label htmlFor="fixedFee" className="mb-1.5 block text-[11px] font-semibold text-ink">Fixed Fee / CRA Cost per month (₹)</label>
        <MoneyInput id="fixedFee" value={plan.fixedFee} onChange={(p) => set({ fixedFee: p })} error={!!e('fixedFee')} />
        <FieldError msg={e('fixedFee')} />
      </div>
      <div>
        <label htmlFor="tds" className="mb-1.5 block text-[11px] font-semibold text-ink">TDS (%)</label>
        <NumInput value={plan.tdsPct} onChange={(n) => set({ tdsPct: n ?? 0 })} error={!!errors.tdsPct} className="h-9" ariaLabel="TDS percent" />
        <FieldError msg={errors.tdsPct} />
      </div>
    </div>
  )
}
