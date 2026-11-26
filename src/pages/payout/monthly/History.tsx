// §9.8 Payout History — stays below the processing area on every mode.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Download, Eye, History as HistoryIcon } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { can } from '@/lib/rbac'
import { usePayout, type PayoutBatch } from '@/data/payout'
import { amt, batchNet, exportBatch, extStore, fmtDate, monthLabel, useExt } from './lib'
import { Panel, SectionBar, tbodyRow, tdCls, thCls, theadRow } from './ui'

const TYPE_SHORT: Record<PayoutBatch['type'], string> = { 'File-Based Payout': 'File-Based', 'Manual Payout': 'Manual', 'Auto Reconciliation': 'Auto Reconciliation' }
const TYPES = ['All', 'File-Based Payout', 'Manual Payout', 'Auto Reconciliation'] as const

export function PayoutHistory() {
  const { batches } = usePayout()
  const ext = useExt()
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const [type, setType] = useState<(typeof TYPES)[number]>('All')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const list = batches.filter((b) => type === 'All' || b.type === type).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const rows = list.slice((page - 1) * size, page * size)
  const canDl = can('Download') || can('Export')

  return (
    <Panel>
      <SectionBar
        icon={<HistoryIcon size={15} />}
        title="Payout History"
        right={
          <>
            <select aria-label="Payout type" value={type} onChange={(e) => { setType(e.target.value as (typeof TYPES)[number]); setPage(1) }} className="h-7 rounded-md border border-line bg-white px-2 text-[11.5px]">
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All types' : t}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setOpen((o) => !o)} className="text-primary" aria-label={open ? 'Collapse history' : 'Expand history'}>
              {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </>
        }
      />
      {open && (
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse">
              <thead>
                <tr className={theadRow}>
                  {['S.N.', 'Payout Batch Name', 'Payout Month', 'Payout Type', 'File Name', 'Records', 'Net Payout Amount (₹)', 'Payment Date', 'Status'].map((h) => (
                    <th key={h} className={thCls}>
                      {h}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b, i) => (
                  <tr key={b.id} className={tbodyRow}>
                    <td className={tdCls}>{(page - 1) * size + i + 1}</td>
                    <td className={`${tdCls} font-semibold whitespace-nowrap`}>{b.name}</td>
                    <td className={tdCls}>{monthLabel(b.month)}</td>
                    <td className={`${tdCls} whitespace-nowrap`}>{TYPE_SHORT[b.type]}</td>
                    <td className={`${tdCls} max-w-[220px] truncate`}>{b.fileName ?? '—'}</td>
                    <td className={`${tdCls} tabular-nums`}>{b.records.toLocaleString('en-IN')}</td>
                    <td className={`${tdCls} text-right tabular-nums`}>{amt(batchNet(b, ext.adjustments))}</td>
                    <td className={tdCls}>{fmtDate(b.paymentDate)}</td>
                    <td className={tdCls}>
                      <Badge tone={b.status === 'Completed' || b.status === 'Approved' || b.status === 'Released' ? 'green' : toneFor(b.status)}>{b.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-3">
                        <button type="button" onClick={() => navigate(`/finance/payouts/monthly/${b.id}`)} className="text-[#0066FF]" aria-label={`View ${b.name}`} title="View">
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={!canDl}
                          onClick={() => {
                            exportBatch(b, extStore.get())
                            toast(`${b.name} downloaded`)
                          }}
                          className="text-[#0066FF] disabled:text-muted"
                          aria-label={`Download ${b.name}`}
                          title={canDl ? 'Download lines (CSV)' : 'Your role cannot download'}
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-[12px] text-muted">
                      No payout batches yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={size} total={list.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1) }} noun="batches" />
        </div>
      )}
    </Panel>
  )
}
