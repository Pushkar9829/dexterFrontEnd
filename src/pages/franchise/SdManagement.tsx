import { useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Info, Pencil } from 'lucide-react'
import type { Band } from '@/components/grid/BandedSheet'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { SD_PAYMENT_TYPES, getFranchise, saveSd, sdFor, sdStore, type SdPayment } from '@/data/franchises'

const sdAmount = (v: string) => {
  const n = Number(v)
  return v === '' || Number.isNaN(n) ? '' : `${n.toLocaleString('en-IN')}/-`
}

const BANDS: Band<SdPayment>[] = [
  {
    title: 'Identity & payment type fields',
    note: 'Same first source row',
    columns: [
      { key: 'siteId', header: 'Site ID', sortable: true, width: 176 },
      { key: 'atmId', header: 'ATM ID', sortable: true, filterable: true, width: 176 },
      { key: 'franchiseeName', header: 'FRANCHISEE NAME', sortable: true, filterable: true, width: 176 },
      { key: 'franchiseeNo', header: 'FRANCHISEE NO.', sortable: true, filterable: true, width: 176 },
      { key: 'cashLiveDate', header: 'Cash Live Date', sortable: true, filterable: true, inputType: 'date', width: 176 },
      { key: 'hpyAccount', header: 'HPY Account Number', sortable: true, width: 176 },
      { key: 'paymentType', header: 'Payment Type', sortable: true, filterable: true, options: SD_PAYMENT_TYPES, width: 176 },
    ],
  },
  {
    title: 'Payment & franchise bank fields',
    note: 'Same first source row',
    columns: [
      { key: 'paymentDate', header: 'Payment Date', inputType: 'date', sortable: true, width: 159 },
      { key: 'transferTime', header: 'Payment Transfer Time', sortable: true, filterable: true, inputType: 'time', width: 159 },
      { key: 'txnNumber', header: 'TXN Number', sortable: true, filterable: true, width: 159 },
      { key: 'amount', header: 'Amount', inputType: 'number', width: 159, sortable: true, filterable: true, render: (r) => (r.amount ? <b>{sdAmount(r.amount)}</b> : '—') },
      { key: 'frBankName', header: 'FR Bank Name', sortable: true, filterable: true, width: 159 },
      { key: 'accountHolder', header: 'Account Holder Name', sortable: true, width: 159 },
      { key: 'frAccount', header: 'FR Account', sortable: true, filterable: true, width: 159, render: (r) => (r.frAccount ? `••••${r.frAccount.slice(-4)}` : '—') },
      { key: 'frIfsc', header: 'FR IFSC', sortable: true, filterable: true, width: 159 },
    ],
  },
]

const SN_COL = (rows: SdPayment[]): GridColumn<SdPayment> => ({ key: 'sn', header: 'S.N.', width: 40, editable: false, value: (r) => rows.indexOf(r) + 1 })

/** SD (security deposit) payments for one franchise — view (188:7378 "Edit details") → edit (188:8160 "Save"). */
export default function SdManagement() {
  const { id = '' } = useParams()
  sdStore.use()
  const fr = getFranchise(id)
  const [params, setParams] = useSearchParams()
  // `?edit=1` opens straight in edit mode (deep link / QA screenshots of 188:8160)
  const [editing, setEditing] = useState(() => params.get('edit') === '1')
  const [draft, setDraft] = useState<SdPayment[] | null>(null)
  if (!fr) return <Navigate to="/franchise/master-data" replace />
  const rows = draft ?? sdFor(fr)
  const first = rows[0]

  const change = (rowId: string, key: string, value: string) => {
    if (key === 'amount' && value && Number.isNaN(Number(value))) return toast('Amount must be a number', 'info')
    if (key === 'frIfsc' && value && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(value)) return toast('IFSC looks like HDFC0001234', 'info')
    setDraft(rows.map((r) => (r.id === rowId ? { ...r, [key]: key === 'frIfsc' ? value.toUpperCase() : value } : r)))
  }

  return (
    <div>
      <div className="-mt-1 mb-1">
        <h1 className="text-[29px] font-semibold tracking-tight">WLA Franchise Application</h1>
        <p className="mt-1 text-[13px] text-muted">View the supplied SD payment fields and franchise bank details.</p>
      </div>

      <div className="mb-[19px] flex items-end justify-between gap-3 border-b border-line">
        <span className="-mb-px border-b-2 border-primary px-4 py-2.5 text-[13px] font-semibold text-primary">SD</span>
        <div className="mb-2">
          {editing ? (
            <Button
              onClick={() => {
                saveSd(fr.id, rows)
                setEditing(false)
                setDraft(null)
                if (params.has('edit')) setParams({})
                toast('SD payment fields saved')
              }}
            >
              Save
            </Button>
          ) : (
            <Button icon={<Pencil size={16} />} onClick={() => { setDraft(sdFor(fr)); setEditing(true) }}>
              Edit details
            </Button>
          )}
        </div>
      </div>

      {/* one sheet card, two column bands sharing the same rows (Figma 188:7378) */}
      <section className="overflow-hidden rounded-xl border border-line bg-white [&_section]:rounded-none [&_section]:border-0 [&_tbody_td]:h-[68px] [&_thead>tr+tr>th]:h-[42px]">
        {BANDS.map((b, i) => {
          const start = i === 0 ? 0 : BANDS[0].columns.length + 1
          const cols = i === 0 ? [SN_COL(rows), ...b.columns] : b.columns
          return (
            <div key={b.title}>
              <div className={cn('flex min-h-9 flex-wrap items-center gap-3 border-b border-line bg-primary-soft/60 px-3.5 py-1.5 text-[11px]', i > 0 && 'border-t')}>
                <span className="font-semibold text-primary">{b.title}</span>
                <span className="text-muted">
                  Source columns {String.fromCharCode(65 + start)}–{String.fromCharCode(65 + start + cols.length - 1)}
                  {i > 0 ? ' · Continued' : ''}
                </span>
                <span className="ml-auto text-[10.5px] text-muted">{b.note}</span>
              </div>
              <ExcelGrid
                title="SD report"
                countLabel={`${rows.length} source row${rows.length > 1 ? 's' : ''}`}
                rows={rows}
                columns={cols}
                rowId={(r) => r.id}
                letters
                letterOffset={start}
                rowNumbers={false}
                editing={editing}
                onCellChange={change}
                hideToolbar={i > 0}
                hidePagination={i === 0}
                searchPlaceholder="Search report fields"
                noun={`supplied source row${rows.length > 1 ? 's' : ''}`}
                exportName={`${fr.id}-sd`}
              />
            </div>
          )
        })}
      </section>

      <section className="mt-5 rounded-xl border border-line bg-white px-4 py-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-[13px] font-semibold">Source reference entries</h2>
          <span className="text-[11px] text-muted">Source continuations only · Not additional payment transactions</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="mr-1 font-semibold">Payment Date · {SD_PAYMENT_TYPES.length} entries</span>
          {SD_PAYMENT_TYPES.map((t) => {
            const on = first?.paymentType === t
            return (
              <button
                key={t}
                type="button"
                disabled={!editing || !first}
                onClick={() => first && change(first.id, 'paymentType', t)}
                className={cn('h-[26px] rounded-md border px-3 disabled:cursor-default', on ? 'border-primary bg-primary-soft font-semibold text-primary' : 'border-line bg-white text-ink-2')}
              >
                {t}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted">
          The source places NEFT, RTGS and IMPS under Payment Date. Here they are recorded as Payment Type{first?.paymentType ? ` (${first.paymentType} in the first source row)` : ''}; Payment Date holds the calendar date of the transfer.
        </p>
      </section>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-primary-soft px-4 py-3 text-[11px]">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <div className="font-semibold text-ink">Source format preserved</div>
          <div className="mt-0.5 text-ink-2">
            All 16 headers are retained in source order. Both bands show the same source rows{first?.amount ? `, with Amount ${sdAmount(first.amount)} in the first` : ''}. Blank cells remain unspecified; nothing is inferred for empty dates, identifiers, transaction numbers or bank details.
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-between gap-2 text-[11px] text-muted">
        <span>Reports respect your workspace permissions. Exports are recorded in the audit trail.</span>
        <span>SD source format · {fr.id}</span>
      </div>
    </div>
  )
}
