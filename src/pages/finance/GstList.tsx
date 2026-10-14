import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Plus } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { dmy, rupee } from '@/data/cbrSites'
import { FIN_YEARS, FY_MONTHS, GST_INVOICE_STATUSES, GST_PAYMENT_STATUSES, gstStore, gstViewStore, numOr0, type GstRecord, type GstView } from '@/data/financeGst'
import { Chip, FilterBar, PageFooter, ReportHeading, SourceNote, WrappedBands, type BandCol, type BandDef } from './shared'

export function invoiceTone(s: string): Tone {
  return s === 'Pending at FR End' ? 'amber' : s === 'Pending at Hitachi End' ? 'purple' : 'gray'
}

const sel = 'h-9 w-full appearance-none rounded-md border border-line bg-white pr-9 pl-3 text-[13px] outline-none focus:border-primary disabled:bg-surface disabled:text-muted'
const chev = <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-2" />

const amount = (key: keyof GstRecord, header: string, bold = false): BandCol<GstRecord> => ({
  key,
  header,
  align: 'right',
  width: 130,
  value: (g) => numOr0(String(g[key])),
  render: (g) => (g[key] ? bold ? <b>{rupee(String(g[key]))}</b> : rupee(String(g[key])) : <span className="text-muted">—</span>),
})

/** 24 source columns wrapped into four bands of six (Figma 95:7894 shows band A–F). */
const BANDS: BandDef<GstRecord>[] = [
  {
    title: 'Identity & reporting period',
    columns: [
      { key: 'sn', header: 'S.N.', width: 70, value: (g) => g.sn },
      {
        key: 'franchiseeName',
        header: 'Franchisee Name',
        width: 230,
        filterable: true,
        render: (g) => (g.franchiseeName ? <span className="font-medium text-primary">{g.franchiseeName}</span> : <span className="text-muted">—</span>),
      },
      { key: 'contactNo', header: 'Contact No.', width: 130 },
      { key: 'siteId', header: 'Site ID', width: 160, filterable: true },
      { key: 'atmId', header: 'ATM Id', width: 130, filterable: true },
      { key: 'sapCode', header: 'SAP Code', width: 110 },
    ],
  },
  {
    title: 'Period, location & invoice',
    columns: [
      {
        key: 'fYear',
        header: 'F. Year',
        width: 90,
        filterable: true,
        value: (g) => (g.fYear ? `F.Y. ${g.fYear}` : ''),
      },
      { key: 'month', header: 'Month', width: 110, filterable: true },
      {
        key: 'locationName',
        header: 'Location Name',
        width: 220,
        filterable: true,
      },
      {
        key: 'gstNumber',
        header: 'GST Number',
        width: 170,
        render: (g) => (g.gstNumber ? <span className="font-mono text-[12.5px]">{g.gstNumber}</span> : <span className="text-muted">—</span>),
      },
      {
        key: 'invoiceNumber',
        header: 'Invoice Number',
        width: 150,
        filterable: true,
      },
      amount('invoiceAmount', 'Invoice Amount'),
    ],
  },
  {
    title: 'Deductions & net amount',
    columns: [
      amount('tds', 'TDS'),
      amount('cashShortageDeduction', 'Cash Shortage Deduction'),
      amount('disputeDeduction', 'Dispute Deduction'),
      amount('chargebackDeduction', 'Charge back Deduction'),
      amount('gstRelatedDeduction', 'GST Related Deduction'),
      amount('netAmount', 'Net Amount'),
    ],
  },
  {
    title: 'Payment, status & remarks',
    columns: [
      amount('paidAmount', 'Paid Amount', true),
      {
        key: 'paymentDate',
        header: 'Payment Date',
        width: 120,
        value: (g) => g.paymentDate,
        render: (g) => dmy(g.paymentDate) || <span className="text-muted">—</span>,
      },
      {
        key: 'utrNumber',
        header: 'UTR Number',
        width: 180,
        render: (g) => (g.utrNumber ? <span className="font-mono text-[12.5px]">{g.utrNumber}</span> : <span className="text-muted">—</span>),
      },
      {
        key: 'invoiceStatus',
        header: 'GST Invoice Status',
        width: 190,
        filterable: true,
        render: (g) => (g.invoiceStatus ? <Badge tone={invoiceTone(g.invoiceStatus)}>{g.invoiceStatus}</Badge> : <span className="text-muted">—</span>),
      },
      {
        key: 'paymentStatus',
        header: 'GST Payment Status',
        width: 170,
        filterable: true,
        render: (g) => (g.paymentStatus ? <Badge tone={g.paymentStatus === 'Done' ? 'green' : 'amber'}>{g.paymentStatus}</Badge> : <span className="text-muted">—</span>),
      },
      {
        key: 'remark',
        header: 'Remark',
        width: 280,
        render: (g) =>
          g.remark ? (
            <span className="block max-w-[320px] truncate" title={g.remark}>
              {g.remark}
            </span>
          ) : (
            <span className="text-muted">—</span>
          ),
      },
    ],
  },
]

type Status = {
  field: 'invoiceStatus' | 'paymentStatus'
  value: string
} | null

export default function GstList() {
  const all = gstStore.use()
  const applied = gstViewStore.use()
  const [draft, setDraft] = useState<GstView>(applied)
  const [status, setStatus] = useState<Status>(null)

  const period = useMemo(() => all.filter((g) => g.fYear === applied.fy && (applied.mode === 'Yearly' || !applied.month || g.month === applied.month)), [all, applied])
  const rows = status ? period.filter((g) => g[status.field] === status.value) : period

  const apply = () => {
    gstViewStore.set({
      ...draft,
      month: draft.mode === 'Yearly' ? '' : draft.month,
    })
    setStatus(null)
  }
  const reset = () => {
    const d: GstView = { mode: 'Yearly', fy: '26-27', month: '' }
    setDraft(d)
    gstViewStore.set(d)
    setStatus(null)
  }
  const pick = (field: 'invoiceStatus' | 'paymentStatus', value: string) => setStatus((s) => (s?.field === field && s.value === value ? null : { field, value }))

  const monthLabel = applied.mode === 'Yearly' || !applied.month ? 'All months' : applied.month

  return (
    <div>
      <PageHeader
        title="GST details"
        sub="View the supplied franchise GST invoice, deduction and payment fields."
        actions={
          <Link to="/finance/gst/new">
            <Button variant="secondary" icon={<Plus size={16} />}>
              New GST record
            </Button>
          </Link>
        }
      />

      <FilterBar ctx={`${applied.mode} · F.Y. ${applied.fy}`} ctxSub={monthLabel}>
        <div>
          <div className="mb-1.5 text-[12px] text-ink-2">View by</div>
          <div className="inline-flex rounded-md border border-line bg-surface p-0.5" role="tablist">
            {(['Yearly', 'Monthly'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={draft.mode === m}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    mode: m,
                    month: m === 'Yearly' ? '' : d.month || 'April',
                  }))
                }
                className={cn('h-[30px] w-[100px] rounded text-[13px]', draft.mode === m ? 'bg-primary font-semibold text-white shadow-sm' : 'text-ink-2')}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <label className="relative block w-full sm:w-52">
          <span className="mb-1.5 block text-[12px] text-ink-2">Financial year</span>
          <span className="relative block">
            <select value={draft.fy} onChange={(e) => setDraft((d) => ({ ...d, fy: e.target.value }))} className={sel}>
              {FIN_YEARS.map((y) => (
                <option key={y} value={y}>
                  F.Y. {y}
                </option>
              ))}
            </select>
            {chev}
          </span>
        </label>
        <label className="block w-full sm:w-52">
          <span className="mb-1.5 block text-[12px] text-ink-2">Month{draft.mode === 'Yearly' && ' · not filtered in Yearly view'}</span>
          <span className="relative block">
            <select value={draft.month} disabled={draft.mode === 'Yearly'} onChange={(e) => setDraft((d) => ({ ...d, month: e.target.value }))} className={sel}>
              <option value="">All months</option>
              {FY_MONTHS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            {chev}
          </span>
        </label>
        <div className="flex gap-2">
          <Button onClick={apply}>Apply</Button>
          <Button variant="secondary" onClick={reset}>
            Reset
          </Button>
        </div>
      </FilterBar>

      <ReportHeading
        title={`Franchise GST BILL Status F.Y. ${applied.fy}`}
        sub={`24 labeled source columns · ${period.length} records · ${monthLabel} · Status reference entries supplied`}
        right="Wrapped column view · All fields visible in four bands"
      />

      <WrappedBands
        bands={BANDS}
        rows={rows}
        rowId={(g) => g.id}
        onOpen={(id) => `/finance/gst/${id}`}
        title="GST source fields"
        label={status ? `${rows.length} of ${period.length} records · ${status.value}` : `${rows.length} records`}
        searchPlaceholder="Search report fields"
        noun="records"
        exportName={`gst-bill-status-fy-${applied.fy}`}
        emptyState="No GST records for this period and status."
      />

      <section className="mt-5 rounded-xl border border-line bg-white px-4 py-3.5">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-[14px] font-semibold">Source status entries</h3>
          <span className="text-[11px] text-muted">Reference options only · Click an entry to filter the bands</span>
          {status && (
            <button type="button" onClick={() => setStatus(null)} className="ml-auto text-[12px] font-semibold text-primary hover:underline">
              Clear status filter
            </button>
          )}
        </div>
        {(
          [
            ['invoiceStatus', 'GST Invoice Status', GST_INVOICE_STATUSES],
            ['paymentStatus', 'GST Payment Status', GST_PAYMENT_STATUSES],
          ] as const
        ).map(([field, label, opts]) => (
          <div key={field} className="flex flex-wrap items-center gap-3 py-[5px]">
            <span className="w-[168px] text-[11px] font-semibold">{label}</span>
            {opts.map((o) => (
              <Chip key={o} active={status?.field === field && status.value === o} onClick={() => pick(field, o)}>
                {o}
              </Chip>
            ))}
          </div>
        ))}
      </section>

      <div className="mt-5">
        <SourceNote title="Source format preserved">
          All labeled headers from the supplied image are retained in source order. The four bands continue the same record rows. Blank cells are shown as —; no values or totals are inferred where the
          source leaves them unspecified.
        </SourceNote>
      </div>

      <PageFooter left="Reports respect your workspace permissions. Exports are recorded in the audit trail." right={`GST source format · ${period.length} records`} />
    </div>
  )
}
