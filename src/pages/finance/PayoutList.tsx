import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, RotateCcw } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { PAYOUT_STATUSES, maskAcc, payoutStore, type PayoutRecord } from '@/data/financePayout'
import { Chip, rowMark, useRowNav } from './shared'

export const payoutTone = (s: string): Tone => (s === 'Active' ? 'green' : s === 'Inactive' ? 'red' : s ? 'amber' : 'gray')

type F = { loi: string; atm: string; bank: string }
const EMPTY: F = { loi: '', atm: '', bank: '' }

export default function PayoutList() {
  const all = payoutStore.use()
  const [draft, setDraft] = useState<F>(EMPTY)
  const [applied, setApplied] = useState<F>(EMPTY)
  const [status, setStatus] = useState<string>('all')
  const onRow = useRowNav((id) => `/finance/payout/${id}`)

  const has = (v: string, q: string) => !q.trim() || v.toLowerCase().includes(q.trim().toLowerCase())
  const filtered = all.filter((p) => has(p.loiCode, applied.loi) && has(p.atmId, applied.atm) && has(p.bankName, applied.bank))
  const rows = filtered.filter((p) => status === 'all' || (status === 'unspecified' ? !p.status : p.status === status))
  const activeFilters = Object.entries(applied).filter(([, v]) => v.trim())

  const columns: GridColumn<PayoutRecord>[] = [
    { key: 'sn', header: 'S.N.', width: 60, sortable: true, value: (p) => p.sn },
    {
      key: 'loiCode', header: 'LOI Code', width: 170, sortable: true, filterable: true,
      render: (p) => (
        <Link to={`/finance/payout/${p.id}`} className="font-medium text-primary hover:underline">
          {p.loiCode || '—'}
        </Link>
      ),
    },
    { key: 'atmId', header: 'ATM ID', width: 130, sortable: true, filterable: true },
    { key: 'panName', header: 'Pan name', width: 260, filterable: true },
    { key: 'panNo', header: 'PAN NO', width: 120, render: (p) => <span className="font-mono text-[12.5px]">{p.panNo || '—'}</span> },
    { key: 'accName', header: 'Acc. Name (Settlement)', width: 260 },
    { key: 'accNo', header: 'Acc. No. (Settlement)', width: 170, value: (p) => maskAcc(p.accNo), render: (p) => <span className="font-mono text-[12.5px]">{maskAcc(p.accNo) || '—'}</span> },
    { key: 'bankName', header: 'Bank Name', width: 170, sortable: true, filterable: true },
    { key: 'ifsc', header: 'IFSC (Settlement)', width: 140, render: (p) => <span className="font-mono text-[12.5px]">{p.ifsc || '—'}</span> },
    { key: 'emailSubject', header: 'Email Subject', width: 320 },
    { key: 'status', header: 'Status', width: 170, filterable: true, render: (p) => (p.status ? <Badge tone={payoutTone(p.status)}>{p.status}</Badge> : <span className="text-muted">—</span>) },
    {
      key: 'action', header: 'Action', label: 'Action', width: 90, value: () => '',
      render: (p) => (
        <Link to={`/finance/payout/${p.id}?edit=1`} className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
          <Pencil size={13} /> Edit
        </Link>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Payout details"
        sub="View the supplied Pay-out Account identifiers, PAN and settlement details."
        actions={
          <Link to="/finance/payout/new">
            <Button icon={<Plus size={16} />}>New payout account</Button>
          </Link>
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setApplied(draft)
        }}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4"
      >
        {([
          ['loi', 'LOI Code', 'Filter by LOI code'],
          ['atm', 'ATM ID', 'Filter by ATM ID'],
          ['bank', 'Bank Name', 'Filter by bank name'],
        ] as const).map(([k, label, ph]) => (
          <label key={k} className="block w-full sm:w-52">
            <span className="mb-1.5 block text-[12px] font-semibold">{label}</span>
            <input
              value={draft[k]}
              onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
              placeholder={ph}
              className="h-9 w-full rounded-md border border-line px-3 text-[13px] outline-none focus:border-primary"
            />
          </label>
        ))}
        <div className="flex gap-2">
          <Button type="submit">Apply</Button>
          <Button
            type="button"
            variant="secondary"
            icon={<RotateCcw size={14} />}
            onClick={() => {
              setDraft(EMPTY)
              setApplied(EMPTY)
              setStatus('all')
            }}
          >
            Reset
          </Button>
        </div>
        <span className="ml-auto text-[12px] text-muted">
          {activeFilters.length ? `${activeFilters.length} filter${activeFilters.length > 1 ? 's' : ''} applied · ${filtered.length} accounts` : 'No filters applied'}
        </span>
      </form>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scroll-thin">
        <Chip active={status === 'all'} onClick={() => setStatus('all')} count={filtered.length}>All</Chip>
        {PAYOUT_STATUSES.map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)} count={filtered.filter((p) => p.status === s).length}>
            {s}
          </Chip>
        ))}
        <Chip active={status === 'unspecified'} onClick={() => setStatus('unspecified')} count={filtered.filter((p) => !p.status).length}>
          Unspecified
        </Chip>
      </div>

      <div onClick={onRow}>
        <ExcelGrid
          title="Pay-out Account"
          countLabel={`${rows.length} accounts · 11 source columns`}
          rows={rows}
          columns={columns}
          rowId={(p) => p.id}
          rowNumbers={false}
          letters
          searchPlaceholder="Search account fields"
          noun="accounts"
          exportName="payout-accounts"
          rowClassName={(p) => rowMark(p.id)}
          emptyState="No payout accounts match these filters."
          footerLeft="Account numbers are masked · Account details respect your workspace permissions."
          footerRight="Status options pending client confirmation"
        />
      </div>
    </div>
  )
}
