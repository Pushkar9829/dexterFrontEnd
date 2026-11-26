import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { setExpenseStatus, useDaakState, type DakExpense, type DakExpenseStatus } from '@/data/daakData'
import { useOpsUser } from '../recon2/opsAccess'
import { apiEnabled } from '@/data/opsApi'
import { fmtDt, rupees } from '../recon2/util'

const NEXT: Partial<Record<DakExpenseStatus, DakExpenseStatus>> = { Submitted: 'Pending Approval', 'Pending Approval': 'Approved', Approved: 'Reimbursed' }

/** §10.2 — courier / postal spend generated into the HRMS expense / bill workflow, one row per dispatch. */
export default function DakExpensesTab() {
  const { expenses } = useDaakState()
  const u = useOpsUser()
  // API mode: the expense workflow lives in HRMS (backend), not on this tab
  const canProcess = !apiEnabled && (u.isAdmin || u.isFinance)
  const advance = (e: DakExpense) => {
    const n = NEXT[e.status]
    if (!n) return
    if (n === 'Approved' && e.billSubmittedBy === u.name) return toast('Maker-checker: the bill submitter cannot approve it', 'error')
    setExpenseStatus(e.ref, n)
    toast(`${e.ref} → ${n}`)
  }
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-[12px] text-blue-900">
        <span>Each linked expense carries who paid, the amount, the department / project / site and who submitted the bill — processed in HRMS Expense Management.</span>
        <Link to="/hrms/expenses" className="ml-auto inline-flex items-center gap-1 font-semibold text-primary hover:underline">Open HRMS expenses <ExternalLink size={12} /></Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[960px] text-[12px]">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Expense ref.</th>
              <th className="px-3 py-2 font-medium">Outward Dak</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Head / category</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Paid by</th>
              <th className="px-3 py-2 font-medium">Dept / project-site</th>
              <th className="px-3 py-2 font-medium">Bill submitted by</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.ref} className="border-t border-line/70 align-top">
                <td className="px-3 py-2 font-semibold text-primary">{e.ref}<div className="text-[11px] font-normal text-muted">{fmtDt(e.createdAt)}</div></td>
                <td className="px-3 py-2">{e.outwardId}</td>
                <td className="px-3 py-2">{e.date}</td>
                <td className="px-3 py-2">{e.expenseHead}<div className="text-[11px] text-muted">{e.category}</div></td>
                <td className="max-w-[260px] px-3 py-2">{e.description}{e.receipt && <div className="text-[11px] text-muted">Receipt: {e.receipt}</div>}</td>
                <td className="px-3 py-2">{e.paidBy}<div className="text-[11px] text-muted">{e.paidByKind}</div></td>
                <td className="px-3 py-2">{e.department}<div className="text-[11px] text-muted">{e.costCentre || '—'}</div></td>
                <td className="px-3 py-2">{e.billSubmittedBy}</td>
                <td className="px-3 py-2 text-right font-semibold">{rupees(e.amount)}</td>
                <td className="px-3 py-2"><Badge tone={e.status === 'Reimbursed' || e.status === 'Approved' ? 'green' : e.status === 'Rejected' ? 'red' : 'amber'}>{e.status}</Badge></td>
                <td className="px-3 py-2">{canProcess && NEXT[e.status] && <Button size="sm" variant="secondary" onClick={() => advance(e)}>Mark {NEXT[e.status]}</Button>}</td>
              </tr>
            ))}
            {!expenses.length && <tr><td colSpan={11} className="px-3 py-8 text-center text-muted">No courier expense linked yet — create one from an Outward Dak.</td></tr>}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr className="border-t border-line bg-surface font-semibold"><td colSpan={8} className="px-3 py-2 text-right">Total</td><td className="px-3 py-2 text-right">{rupees(total)}</td><td colSpan={2} /></tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
