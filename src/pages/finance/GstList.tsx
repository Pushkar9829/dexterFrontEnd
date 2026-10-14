import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeIndianRupee, CircleCheck, FileText, Hourglass, MinusCircle, Pencil, Plus, ReceiptText, RotateCcw, Wallet } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { rupee } from '@/data/cbrSites'
import { FIN_YEARS, FY_MONTHS, deductionsOf, gstStore, gstViewStore, numOr0, type GstRecord, type GstView } from '@/data/financeGst'
import { Chip, rowMark, useRowNav } from './shared'

type StatusChip = 'all' | 'Pending at FR End' | 'Pending at Hitachi End' | 'pay-pending' | 'pay-done' | 'unspecified'

export function invoiceTone(s: string): Tone {
  return s === 'Pending at FR End' ? 'amber' : s === 'Pending at Hitachi End' ? 'purple' : 'gray'
}

function Kpi({ icon, label, value, caption, tone = 'text-primary' }: { icon: React.ReactNode; label: string; value: string; caption?: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2 text-[12px] text-muted">
        <span className="truncate">{label}</span>
        <span className={tone}>{icon}</span>
      </div>
      <div className="mt-2 truncate text-[20px] font-semibold text-ink">{value}</div>
      {caption && <div className="mt-1 truncate text-[11px] text-muted">{caption}</div>}
    </div>
  )
}

export default function GstList() {
  const all = gstStore.use()
  const applied = gstViewStore.use()
  const [draft, setDraft] = useState<GstView>(applied)
  const [chip, setChip] = useState<StatusChip>('all')
  const onRow = useRowNav((id) => `/finance/gst/${id}`)

  const period = useMemo(
    () => all.filter((g) => g.fYear === applied.fy && (applied.mode === 'Yearly' || !applied.month || g.month === applied.month)),
    [all, applied],
  )

  const counts = {
    all: period.length,
    'Pending at FR End': period.filter((g) => g.invoiceStatus === 'Pending at FR End').length,
    'Pending at Hitachi End': period.filter((g) => g.invoiceStatus === 'Pending at Hitachi End').length,
    'pay-pending': period.filter((g) => g.paymentStatus === 'Pending').length,
    'pay-done': period.filter((g) => g.paymentStatus === 'Done').length,
    unspecified: period.filter((g) => !g.paymentStatus && !g.invoiceStatus).length,
  }

  const rows = period.filter((g) => {
    if (chip === 'all') return true
    if (chip === 'pay-pending') return g.paymentStatus === 'Pending'
    if (chip === 'pay-done') return g.paymentStatus === 'Done'
    if (chip === 'unspecified') return !g.paymentStatus && !g.invoiceStatus
    return g.invoiceStatus === chip
  })

  const sum = (f: (g: GstRecord) => number, xs = period) => xs.reduce((s, g) => s + f(g), 0)
  const invoiceTotal = sum((g) => numOr0(g.invoiceAmount))
  const dedTotal = sum(deductionsOf)
  const paid = sum((g) => numOr0(g.paidAmount))
  const frPending = period.filter((g) => g.invoiceStatus === 'Pending at FR End')
  const hiPending = period.filter((g) => g.invoiceStatus === 'Pending at Hitachi End')

  const apply = () => {
    gstViewStore.set({ ...draft, month: draft.mode === 'Yearly' ? '' : draft.month })
    setChip('all')
  }
  const reset = () => {
    const d: GstView = { mode: 'Yearly', fy: '26-27', month: '' }
    setDraft(d)
    gstViewStore.set(d)
    setChip('all')
  }

  const columns: GridColumn<GstRecord>[] = [
    { key: 'sn', header: 'S.N.', width: 60, sortable: true, value: (g) => g.sn },
    {
      key: 'franchiseeName', header: 'Franchisee Name', width: 230, sortable: true, filterable: true,
      render: (g) => (
        <Link to={`/finance/gst/${g.id}`} className="font-medium text-primary hover:underline">
          {g.franchiseeName || '—'}
        </Link>
      ),
    },
    { key: 'contactNo', header: 'Contact No.', width: 120 },
    { key: 'siteId', header: 'Site ID', width: 160, sortable: true, filterable: true },
    { key: 'atmId', header: 'ATM Id', width: 130, filterable: true },
    { key: 'sapCode', header: 'SAP Code', width: 100 },
    { key: 'month', header: 'Month', width: 100, filterable: true, value: (g) => (g.month ? `${g.month} ${g.fYear}` : '') },
    { key: 'invoiceNumber', header: 'Invoice Number', width: 150 },
    { key: 'invoiceAmount', header: 'Invoice Amount', align: 'right', width: 130, sortable: true, value: (g) => numOr0(g.invoiceAmount), render: (g) => rupee(g.invoiceAmount) || <span className="text-muted">—</span> },
    { key: 'netAmount', header: 'Net Amount', align: 'right', width: 130, sortable: true, value: (g) => numOr0(g.netAmount), render: (g) => rupee(g.netAmount) || <span className="text-muted">—</span> },
    { key: 'paidAmount', header: 'Paid Amount', align: 'right', width: 130, sortable: true, value: (g) => numOr0(g.paidAmount), render: (g) => (g.paidAmount ? <b>{rupee(g.paidAmount)}</b> : <span className="text-muted">—</span>) },
    {
      key: 'invoiceStatus', header: 'GST Invoice Status', width: 190, filterable: true,
      render: (g) => (g.invoiceStatus ? <Badge tone={invoiceTone(g.invoiceStatus)}>{g.invoiceStatus}</Badge> : <span className="text-muted">—</span>),
    },
    {
      key: 'paymentStatus', header: 'GST Payment Status', width: 160, filterable: true,
      render: (g) => (g.paymentStatus ? <Badge tone={g.paymentStatus === 'Done' ? 'green' : 'amber'}>{g.paymentStatus}</Badge> : <span className="text-muted">—</span>),
    },
    {
      key: 'action', header: 'Action', label: 'Action', width: 90, value: () => '',
      render: (g) => (
        <Link to={`/finance/gst/${g.id}?edit=1`} className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline" aria-label={`Edit ${g.id}`}>
          <Pencil size={13} /> Edit
        </Link>
      ),
    },
  ]

  const periodLabel = applied.mode === 'Yearly' || !applied.month ? `F.Y. ${applied.fy} · All months` : `${applied.month} · F.Y. ${applied.fy}`

  return (
    <div>
      <PageHeader
        title="GST details"
        sub="View the supplied franchise GST invoice, deduction and payment fields."
        actions={
          <Link to="/finance/gst/new">
            <Button icon={<Plus size={16} />}>New GST record</Button>
          </Link>
        }
      />

      {/* period filter bar */}
      <div className="mb-5 flex flex-wrap items-end gap-4 rounded-xl border border-line bg-white p-4">
        <div>
          <div className="mb-1.5 text-[12px] font-semibold">View by</div>
          <div className="inline-flex rounded-lg border border-line bg-surface p-0.5" role="tablist">
            {(['Yearly', 'Monthly'] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={draft.mode === m}
                onClick={() => setDraft((d) => ({ ...d, mode: m, month: m === 'Yearly' ? '' : d.month || 'April' }))}
                className={cn('h-8 rounded-md px-4 text-[13px]', draft.mode === m ? 'bg-white font-semibold text-primary shadow-sm' : 'text-ink-2')}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <label className="block w-full sm:w-44">
          <span className="mb-1.5 block text-[12px] font-semibold">Financial year</span>
          <select value={draft.fy} onChange={(e) => setDraft((d) => ({ ...d, fy: e.target.value }))} className="h-9 w-full rounded-md border border-line bg-white px-3 text-[13px]">
            {FIN_YEARS.map((y) => (
              <option key={y} value={y}>
                F.Y. {y}
              </option>
            ))}
          </select>
        </label>
        <label className="block w-full sm:w-52">
          <span className="mb-1.5 block text-[12px] font-semibold">Month</span>
          <select
            value={draft.month}
            disabled={draft.mode === 'Yearly'}
            onChange={(e) => setDraft((d) => ({ ...d, month: e.target.value }))}
            className="h-9 w-full rounded-md border border-line bg-white px-3 text-[13px] disabled:bg-surface disabled:text-muted"
          >
            <option value="">{draft.mode === 'Yearly' ? 'All months · not filtered in Yearly view' : 'All months'}</option>
            {FY_MONTHS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <Button onClick={apply}>Apply</Button>
          <Button variant="secondary" icon={<RotateCcw size={14} />} onClick={reset}>
            Reset
          </Button>
        </div>
        <span className="ml-auto text-[12px] text-muted">
          Showing <b className="text-ink">{applied.mode}</b> · {periodLabel}
        </span>
      </div>

      <h2 className="mb-3 text-[18px] font-semibold tracking-tight">Franchise GST BILL Status F.Y. {applied.fy}</h2>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={<FileText size={16} />} label="Invoices" value={String(period.length)} caption={periodLabel} />
        <Kpi icon={<ReceiptText size={16} />} label="Invoice total" value={rupee(invoiceTotal) || '₹ 0'} caption="Incl. GST" />
        <Kpi icon={<MinusCircle size={16} />} label="Deductions total" value={rupee(dedTotal) || '₹ 0'} caption="TDS, shortage, dispute, charge back, GST" tone="text-brand-red" />
        <Kpi icon={<Wallet size={16} />} label="Paid" value={rupee(paid) || '₹ 0'} caption={`${counts['pay-done']} payments done`} tone="text-emerald-600" />
        <Kpi icon={<Hourglass size={16} />} label="Pending at FR End" value={String(frPending.length)} caption={rupee(sum((g) => numOr0(g.invoiceAmount), frPending)) || '₹ 0'} tone="text-amber-600" />
        <Kpi icon={<BadgeIndianRupee size={16} />} label="Pending at Hitachi End" value={String(hiPending.length)} caption={rupee(sum((g) => numOr0(g.invoiceAmount), hiPending)) || '₹ 0'} tone="text-violet-600" />
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scroll-thin">
        <Chip active={chip === 'all'} onClick={() => setChip('all')} count={counts.all}>All records</Chip>
        <Chip active={chip === 'Pending at FR End'} onClick={() => setChip('Pending at FR End')} count={counts['Pending at FR End']}>Pending at FR End</Chip>
        <Chip active={chip === 'Pending at Hitachi End'} onClick={() => setChip('Pending at Hitachi End')} count={counts['Pending at Hitachi End']}>Pending at Hitachi End</Chip>
        <Chip active={chip === 'pay-pending'} onClick={() => setChip('pay-pending')} count={counts['pay-pending']}>Payment Pending</Chip>
        <Chip active={chip === 'pay-done'} onClick={() => setChip('pay-done')} count={counts['pay-done']}>
          <CircleCheck size={13} /> Payment Done
        </Chip>
        <Chip active={chip === 'unspecified'} onClick={() => setChip('unspecified')} count={counts.unspecified}>Status unspecified</Chip>
      </div>

      <div onClick={onRow}>
        <ExcelGrid
          title="GST source fields"
          countLabel={`${rows.length} of ${period.length} records`}
          rows={rows}
          columns={columns}
          rowId={(g) => g.id}
          rowNumbers={false}
          letters
          searchPlaceholder="Search report fields"
          noun="records"
          exportName={`gst-bill-status-fy-${applied.fy}`}
          rowClassName={(g) => rowMark(g.id)}
          emptyState="No GST records for this period and status."
          footerLeft="Click a row to open the GST record · Exports are recorded in the audit trail."
          footerRight={`${period.length} records · F.Y. ${applied.fy}`}
        />
      </div>
    </div>
  )
}
