import { useMemo, useState } from 'react'
import { PencilLine, Scale } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { financeRulesStore, logPayout, pendingRuleCount, RULE_LABELS, toPaise, useFinanceRules, type FinanceRules } from '@/data/payout'
import { useRole } from '@/lib/rbac'
import { apiEnabled, apiPatchRules } from '@/data/payoutApi'
import { PayoutPage } from '../PayoutShell'
import { actor, inr2, rs } from './compute'
import { DataTable, FInput, FSelect, ProvisionalNote, type DCol, type DFilter } from './ui'

type Key = keyof typeof RULE_LABELS | 'tdsRates'
type Kind = { t: 'text' } | { t: 'enum'; options: string[] } | { t: 'pct' } | { t: 'money' } | { t: 'bool' } | { t: 'list' }
const KIND: Record<Key, Kind> = {
  tlEligibleProfitBasis: { t: 'text' },
  tlShareType: { t: 'enum', options: ['Percentage', 'Fixed', 'Both'] },
  tlSharePct: { t: 'pct' },
  tlShareFixed: { t: 'money' },
  tlAllocation: { t: 'enum', options: ['Site-wise', 'Consolidated'] },
  mfShareRule: { t: 'text' },
  bmOwnership: { t: 'enum', options: ['Direct MF', 'Super MF with MF operating'] },
  superMfBmShare: { t: 'text' },
  rentAlreadyDeducted: { t: 'bool' },
  partnerShareBasis: { t: 'enum', options: ['Gross payout', 'Post-rent payout', 'Post-expense profit'] },
  staffExpenseMode: { t: 'enum', options: ['Direct site entry', 'Allocation across sites'] },
  expenseAccounting: { t: 'enum', options: ['Accrual', 'Cash', 'Both'] },
  negativeProfitTreatment: { t: 'text' },
  expenseApprovalLimit: { t: 'money' },
  varianceTolerance: { t: 'money' },
  tdsRates: { t: 'list' },
}
const LABEL = (k: Key) => (k === 'tdsRates' ? '11 · TDS / GST applicability — offered rate options' : RULE_LABELS[k])
const AFFECTS: Record<Key, string> = {
  tlEligibleProfitBasis: 'Team Leader share, remaining eligible profit',
  tlShareType: 'Team Leader share', tlSharePct: 'Team Leader share', tlShareFixed: 'Team Leader share', tlAllocation: 'Team Leader allocation',
  mfShareRule: 'MF / Super MF payout', bmOwnership: 'BM site mapping', superMfBmShare: 'Super MF BM consolidation',
  rentAlreadyDeducted: 'BM P&L (rent)', partnerShareBasis: 'BM partner share', staffExpenseMode: 'BM staff expenses', expenseAccounting: 'BM P&L vs cash',
  tdsRates: 'TDS / GST on payouts', negativeProfitTreatment: 'BM loss carry-forward', expenseApprovalLimit: 'BM expense approval, AI expense anomaly', varianceTolerance: 'Reconciliation status, AI payout variance alert',
}
const show = (k: Key, r: FinanceRules): string | null => {
  const v = r[k]
  if (v === null || v === undefined) return null
  const kind = KIND[k]
  if (kind.t === 'money') return inr2(v as number)
  if (kind.t === 'pct') return `${v}%`
  if (kind.t === 'bool') return v ? 'Yes' : 'No'
  if (kind.t === 'list') return (v as number[]).map((x) => `${x}%`).join(', ')
  return String(v)
}
const toInput = (k: Key, r: FinanceRules): string => {
  const v = r[k]
  if (v === null || v === undefined) return ''
  const kind = KIND[k]
  if (kind.t === 'money') return rs(v as number)
  if (kind.t === 'bool') return v ? 'Yes' : 'No'
  if (kind.t === 'list') return (v as number[]).join(', ')
  return String(v)
}

type Row = { k: Key; label: string; value: string | null; affects: string }

function EditRule({ k, rules, onClose }: { k: Key; rules: FinanceRules; onClose: () => void }) {
  const kind = KIND[k]
  const [val, setVal] = useState(() => toInput(k, rules))
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const parse = (): { ok: true; v: unknown } | { ok: false; e: string } => {
    const s = val.trim()
    if (!s) return k === 'tdsRates' ? { ok: false, e: 'Enter at least one rate' } : { ok: true, v: null }
    if (kind.t === 'pct') return /^\d{1,2}(\.\d{1,2})?$|^100$/.test(s) ? { ok: true, v: Number(s) } : { ok: false, e: 'Enter a percentage between 0 and 100' }
    if (kind.t === 'money') return /^\d+(\.\d{1,2})?$/.test(s.replace(/,/g, '')) ? { ok: true, v: toPaise(s) } : { ok: false, e: 'Enter an amount in ₹ (max 2 decimals)' }
    if (kind.t === 'bool') return { ok: true, v: s === 'Yes' }
    if (kind.t === 'list') {
      const xs = s.split(/[,\s]+/).filter(Boolean)
      return xs.every((x) => /^\d{1,2}(\.\d{1,2})?$/.test(x)) ? { ok: true, v: [...new Set(xs.map(Number))].sort((a, b) => a - b) } : { ok: false, e: 'Comma-separated percentages, e.g. 0, 1, 2, 5' }
    }
    if (kind.t === 'text' && s.length > 400) return { ok: false, e: 'Max 400 characters' }
    return { ok: true, v: s }
  }
  const save = () => {
    const p = parse()
    if (p.ok === false) return setErr(p.e)
    if (!reason.trim()) return setErr('Record the Finance approval reference / reason')
    const before = show(k, rules) ?? 'Pending Finance decision'
    financeRulesStore.set((r) => ({ ...r, [k]: p.v, updatedAt: new Date().toISOString(), updatedBy: actor() }))
    const after = show(k, { ...rules, [k]: p.v } as FinanceRules) ?? 'Pending Finance decision'
    logPayout({ by: actor(), area: 'Finance Rules', ref: LABEL(k), action: `Rule updated — ${reason.trim()}`, before, after })
    if (apiEnabled) void apiPatchRules({ [k]: p.v, note: reason.trim().slice(0, 300) } as Partial<FinanceRules>)
    toast('Rule saved. Change recorded in the payout audit log.')
    onClose()
  }
  return (
    <Modal title="Set Finance rule" sub={LABEL(k)} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save rule</Button></>}>
      <div className="space-y-3">
        {kind.t === 'enum' && <FSelect label="Decision" value={val} onChange={setVal} options={kind.options} all="Pending Finance decision" />}
        {kind.t === 'bool' && <FSelect label="Decision" value={val} onChange={setVal} options={['Yes', 'No']} all="Pending Finance decision" />}
        {kind.t === 'text' && (
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold">Decision</span>
            <textarea value={val} onChange={(e) => setVal(e.target.value)} rows={3} maxLength={400} className="w-full rounded-md border border-line p-2 text-[12px] outline-none focus:border-primary" placeholder="Leave empty to keep it pending" />
          </label>
        )}
        {(kind.t === 'pct' || kind.t === 'money' || kind.t === 'list') && <FInput label={kind.t === 'money' ? 'Amount (₹)' : kind.t === 'pct' ? 'Percentage (%)' : 'Rates (%)'} value={val} onChange={setVal} placeholder={k === 'tdsRates' ? '0, 1, 2, 5, 10, 18' : 'Leave empty to keep it pending'} />}
        <FInput label="Approval reference / reason *" value={reason} onChange={setReason} placeholder="e.g. CFO approval mail dated …" />
        {err && <p className="text-[11px] text-brand-red">{err}</p>}
        <p className="text-[11px] text-muted">Affects: {AFFECTS[k]}. Money is stored in paise. Clearing the value puts the rule back to “Pending Finance decision”.</p>
      </div>
    </Modal>
  )
}

export default function FinanceRulesPage() {
  const rules = useFinanceRules()
  const role = useRole()
  const canEdit = ['Super Admin', 'Admin', 'Finance Team'].includes(role)
  const [edit, setEdit] = useState<Key | null>(null)
  const rows = useMemo<Row[]>(() => ([...Object.keys(RULE_LABELS), 'tdsRates'] as Key[]).map((k) => ({ k, label: LABEL(k), value: show(k, rules), affects: AFFECTS[k] })).sort((a, b) => a.label.localeCompare(b.label)), [rules])
  const cols = useMemo<DCol<Row>[]>(() => [
    { label: 'Business rule (§21)', value: (r) => r.label, cell: (r) => <span className="font-medium">{r.label}</span> },
    { label: 'Current value', value: (r) => r.value ?? 'Pending Finance decision', cell: (r) => (r.value === null ? <Badge tone="amber">Pending Finance decision</Badge> : <span className="font-semibold text-ink">{r.value}</span>), className: 'max-w-[360px] whitespace-normal' },
    { label: 'Affects', value: (r) => r.affects },
    { label: 'Action', value: () => '', cell: (r) => (canEdit ? <Button size="sm" variant="secondary" icon={<PencilLine size={12} />} onClick={() => setEdit(r.k)}>Set value</Button> : <span className="text-[11px] text-muted">View only</span>) },
  ], [canEdit])
  const filters = useMemo<DFilter<Row>[]>(() => [{ label: 'Status', get: (r) => (r.value === null ? 'Pending' : 'Set') }], [])
  const pending = pendingRuleCount(rules)
  return (
    <PayoutPage title="Finance Sign-off Rules" sub="Open business rules that must be resolved by Finance & Management before the production calculation engine is final (§21). Kept configurable — never hard-coded." crumbs={['Payout Overview', 'Finance Rules']}>
      <ProvisionalNote>
        <b>{pending} of {Object.keys(RULE_LABELS).length} rules are pending.</b> Until a rule is set, every calculation that depends on it stays <b>provisional</b>: no commercial percentage or default formula is assumed (e.g. no TL share is computed, MF tax is not applied, reconciliation uses an exact ₹0 tolerance). Sample workbook values are not production rules.
      </ProvisionalNote>
      <DataTable title="Rules" icon={<Scale size={16} />} cols={cols} rows={rows} filters={filters} rowKey={(r) => r.k} fileName="Finance_Signoff_Rules" totals={false} onExport={(n) => logPayout({ by: actor(), area: 'Finance Rules', ref: 'Rules', action: `Exported ${n} rows (CSV)` })} pageSize={25} />
      <p className="text-[11px] text-muted">Last updated by {rules.updatedBy} on {new Date(rules.updatedAt).toLocaleString('en-IN')}. Only Admin and Finance can set values; every change is logged with before / after values.</p>
      {edit && <EditRule k={edit} rules={rules} onClose={() => setEdit(null)} />}
    </PayoutPage>
  )
}
