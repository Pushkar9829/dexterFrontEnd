import { useMemo, useState } from 'react'
import { ScrollText } from 'lucide-react'
import { logPayout, usePayoutAudit, type PayoutAudit } from '@/data/payout'
import { PayoutPage } from '../PayoutShell'
import { actor } from './compute'
import { DataTable, FInput, type DCol, type DFilter } from './ui'

export default function PayoutAuditLog() {
  const all = usePayoutAudit()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const rows = useMemo(() => all.filter((e) => (!from || e.at.slice(0, 10) >= from) && (!to || e.at.slice(0, 10) <= to)), [all, from, to])
  const cols = useMemo<DCol<PayoutAudit>[]>(() => [
    { label: 'Date & Time', value: (e) => new Date(e.at).toLocaleString('en-IN') },
    { label: 'User', value: (e) => e.by },
    { label: 'Area', value: (e) => e.area },
    { label: 'Reference', value: (e) => e.ref, className: 'max-w-[260px] whitespace-normal' },
    { label: 'Action', value: (e) => e.action, className: 'max-w-[300px] whitespace-normal' },
    { label: 'Before', value: (e) => e.before ?? '—', className: 'max-w-[260px] whitespace-normal text-muted' },
    { label: 'After', value: (e) => e.after ?? '—', className: 'max-w-[260px] whitespace-normal' },
  ], [])
  const filters = useMemo<DFilter<PayoutAudit>[]>(() => [{ label: 'Area', get: (e) => e.area }, { label: 'User', get: (e) => e.by }], [])
  return (
    <PayoutPage title="Payout Audit Log" sub="Complete change history for Payout Management — calculations, adjustments, approvals, rule changes, AI reviews and report exports (§16.1). Entries cannot be edited." crumbs={['Payout Overview', 'Audit Log']}>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4">
        <FInput label="From date" type="date" value={from} onChange={setFrom} className="w-[170px]" />
        <FInput label="To date" type="date" value={to} onChange={setTo} className="w-[170px]" />
        <span className="ml-auto text-[12px] text-muted">{rows.length.toLocaleString('en-IN')} of {all.length.toLocaleString('en-IN')} entries</span>
      </div>
      <DataTable title="Audit entries" icon={<ScrollText size={16} />} cols={cols} rows={rows} filters={filters} rowKey={(e) => e.id} fileName="Payout_Audit_Log" pageSize={25} totals={false} empty="No audit entries yet." onExport={(n) => logPayout({ by: actor(), area: 'Audit Log', ref: 'Payout audit log', action: `Exported ${n} entries (CSV)` })} />
    </PayoutPage>
  )
}
