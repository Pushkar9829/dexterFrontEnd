import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { maskAcc, payoutStore, type PayoutRecord } from '@/data/financePayout'
import { FilterBar, PageFooter, ReportHeading, SourceNote, WrappedBands, type BandDef } from './shared'

export const payoutTone = (s: string): Tone => (s === 'Active' ? 'green' : s === 'Inactive' ? 'red' : s ? 'amber' : 'gray')

type F = { loi: string; atm: string; bank: string }
const EMPTY: F = { loi: '', atm: '', bank: '' }

const mono = (v: string) => (v ? <span className="font-mono text-[12.5px]">{v}</span> : <span className="text-muted">—</span>)

/** 11 source columns wrapped into two bands (Figma 98:9841 shows band A–F). */
const BANDS: BandDef<PayoutRecord>[] = [
  {
    title: 'Identifiers, PAN & settlement account name',
    columns: [
      { key: 'sn', header: 'S.N.', width: 70, value: (p) => p.sn },
      { key: 'loiCode', header: 'LOI Code', width: 170, filterable: true, render: (p) => (p.loiCode ? <span className="font-medium text-primary">{p.loiCode}</span> : <span className="text-muted">—</span>) },
      { key: 'atmId', header: 'ATM ID', width: 130, filterable: true },
      { key: 'panName', header: 'Pan name', width: 240, filterable: true },
      { key: 'panNo', header: 'PAN NO', width: 120, render: (p) => mono(p.panNo) },
      { key: 'accName', header: 'Acc. Name (Settlement)', width: 240 },
    ],
  },
  {
    title: 'Settlement account, bank, email subject & status',
    columns: [
      { key: 'accNo', header: 'Acc. No. (Settlement)', width: 170, value: (p) => maskAcc(p.accNo), render: (p) => mono(maskAcc(p.accNo)) },
      { key: 'bankName', header: 'Bank Name', width: 170, filterable: true },
      { key: 'ifsc', header: 'IFSC (Settlement)', width: 140, render: (p) => mono(p.ifsc) },
      { key: 'emailSubject', header: 'Email Subject', width: 320 },
      { key: 'status', header: 'Status', width: 170, filterable: true, render: (p) => (p.status ? <Badge tone={payoutTone(p.status)}>{p.status}</Badge> : <span className="text-muted">—</span>) },
    ],
  },
]

export default function PayoutList() {
  const all = payoutStore.use()
  const [draft, setDraft] = useState<F>(EMPTY)
  const [applied, setApplied] = useState<F>(EMPTY)

  const has = (v: string, q: string) => !q.trim() || v.toLowerCase().includes(q.trim().toLowerCase())
  const rows = all.filter((p) => has(p.loiCode, applied.loi) && has(p.atmId, applied.atm) && has(p.bankName, applied.bank))
  const activeFilters = Object.values(applied).filter((v) => v.trim()).length

  return (
    <div>
      <PageHeader
        title="Payout details"
        sub="View the supplied Pay-out Account identifiers, PAN and settlement details."
        actions={
          <Link to="/finance/payout/new">
            <Button variant="secondary" icon={<Plus size={16} />}>
              New payout account
            </Button>
          </Link>
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setApplied(draft)
        }}
      >
        <FilterBar ctx="Account setup" ctxSub={activeFilters ? `${activeFilters} filter${activeFilters > 1 ? 's' : ''} applied · ${rows.length} accounts` : 'No filters applied'}>
          {([
            ['loi', 'LOI Code', 'Filter by LOI code'],
            ['atm', 'ATM ID', 'Filter by ATM ID'],
            ['bank', 'Bank Name', 'Filter by bank name'],
          ] as const).map(([k, label, ph]) => (
            <label key={k} className="block w-full sm:w-56">
              <span className="mb-1.5 block text-[12px] text-ink-2">{label}</span>
              <input
                value={draft[k]}
                onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                placeholder={ph}
                className="h-10 w-full rounded-md border border-line px-3 text-[13px] outline-none focus:border-primary"
              />
            </label>
          ))}
          <div className="flex gap-2">
            <Button type="submit">Apply</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDraft(EMPTY)
                setApplied(EMPTY)
              }}
            >
              Reset
            </Button>
          </div>
        </FilterBar>
      </form>

      <ReportHeading
        title="Pay-out Account"
        sub={`11 source columns · ${rows.length} of ${all.length} accounts`}
        right="Wrapped column view · Source order preserved"
      />

      <WrappedBands
        bands={BANDS}
        rows={rows}
        rowId={(p) => p.id}
        onOpen={(id) => `/finance/payout/${id}`}
        title="Pay-out Account fields"
        label={`${rows.length} accounts`}
        searchPlaceholder="Search account fields"
        noun="accounts"
        exportName="payout-accounts"
        emptyState="No payout accounts match these filters."
      />

      <div className="mt-5">
        <SourceNote title="Source format preserved">
          All eleven headers are retained in source order. Both bands continue the same account rows. Settlement account numbers are masked in the list; Status
          has no supplied options and is shown as recorded.
        </SourceNote>
      </div>

      <PageFooter left="Account details respect your workspace permissions." right={`Pay-out Account · ${all.length} accounts`} />
    </div>
  )
}
