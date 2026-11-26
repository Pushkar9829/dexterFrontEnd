import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Paperclip, Pencil, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { downloadCsv } from '@/lib/export'
import { FY_OPTIONS, fromPaise, monthLabel, sumP, useBusiness, useFinanceRules, type BmPayout } from '@/data/payout'
import { PayoutPage } from '../PayoutShell'
import { fmtDate } from './bmStore'
import { DataTable, FilterSelect, Money, Note, TableBar, type Col } from './ui'

export default function BmPayouts() {
  const b = useBusiness()
  const rules = useFinanceRules()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [fy, setFy] = useState('all')
  const [month, setMonth] = useState('all')
  const [mf, setMf] = useState('all')
  const [rent, setRent] = useState('all')

  const siteOf = useMemo(() => new Map(b.bmSites.map((s) => [s.atmId, s])), [b.bmSites])
  const catName = useMemo(() => new Map(b.bmCategories.map((c) => [c.code, c.name])), [b.bmCategories])
  const months = useMemo(() => [...new Set(b.bmPayouts.map((p) => p.month))].sort().reverse(), [b.bmPayouts])
  const mfs = useMemo(() => [...new Set(b.bmSites.map((s) => s.mf))].sort(), [b.bmSites])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return b.bmPayouts
      .filter((p) => {
        const site = siteOf.get(p.atmId)
        return (
          (fy === 'all' || p.fy === fy) &&
          (month === 'all' || p.month === month) &&
          (mf === 'all' || site?.mf === mf) &&
          (rent === 'all' || (rent === 'yes' ? p.rentDeductedAtSource > 0 : p.rentDeductedAtSource === 0)) &&
          (!s || `${p.atmId} ${site?.siteId ?? ''} ${p.reference} ${site?.mf ?? ''} ${site?.superMf ?? ''}`.toLowerCase().includes(s))
        )
      })
      .sort((x, y) => y.month.localeCompare(x.month) || x.atmId.localeCompare(y.atmId))
  }, [b.bmPayouts, siteOf, q, fy, month, mf, rent])

  const tot = useMemo(
    () => ({ gross: sumP(rows.map((r) => r.gross)), rent: sumP(rows.map((r) => r.rentDeductedAtSource)), other: sumP(rows.map((r) => r.otherSourceDeductions)), recv: sumP(rows.map((r) => r.received)) }),
    [rows],
  )

  const cols: Col<BmPayout>[] = [
    { key: 'fy', header: 'FY', render: (r) => r.fy, footer: `Total (${rows.length})` },
    { key: 'm', header: 'Month', render: (r) => monthLabel(r.month) },
    { key: 'smf', header: 'Super MF', render: (r) => siteOf.get(r.atmId)?.superMf ?? '—' },
    { key: 'mf', header: 'Master Franchise', render: (r) => siteOf.get(r.atmId)?.mf ?? '—' },
    { key: 'atm', header: 'ATM / Site', render: (r) => <div><div className="font-medium text-slate-900">{r.atmId}</div><div className="text-[11px] text-slate-500">{siteOf.get(r.atmId)?.siteId ?? '—'}</div></div> },
    { key: 'cat', header: 'Category', render: (r) => catName.get(siteOf.get(r.atmId)?.category ?? '') ?? '—' },
    { key: 'g', header: 'Gross Payout', className: 'text-right', render: (r) => <Money p={r.gross} />, footer: <Money p={tot.gross} /> },
    {
      key: 'rent', header: 'Rent at Source', className: 'text-right',
      render: (r) => (r.rentDeductedAtSource > 0 ? <div className="flex flex-col items-end gap-1"><Money p={r.rentDeductedAtSource} /><Badge tone="amber">Rent deducted at source</Badge></div> : <Money p={0} />),
      footer: <Money p={tot.rent} />,
    },
    { key: 'o', header: 'Other Deductions', className: 'text-right', render: (r) => <Money p={r.otherSourceDeductions} />, footer: <Money p={tot.other} /> },
    { key: 'r', header: 'Actual Received', className: 'text-right', render: (r) => <Money p={r.received} className="font-semibold" />, footer: <Money p={tot.recv} /> },
    { key: 'ref', header: 'Reference', render: (r) => r.reference },
    { key: 'd', header: 'Payout Date', render: (r) => fmtDate(r.date) },
    { key: 'doc', header: 'Source Doc', render: (r) => (r.document ? <span className="inline-flex items-center gap-1 text-[#0066FF]"><Paperclip size={12} />{r.document}</span> : '—') },
    { key: 'act', header: 'Action', render: (r) => <Link to={`/finance/payouts/business/payouts/${r.id}`} className="text-[#0066FF]" aria-label={`Edit ${r.id}`}><Pencil size={15} /></Link> },
  ]

  return (
    <PayoutPage
      title="Site Wise Payout"
      sub="Business Model payout capture (§6.3): gross business payout, source-level deductions and the actual amount received per BM site."
      crumbs={['Business Model', 'Site Wise Payout']}
      actions={<Button icon={<Plus size={15} />} onClick={() => navigate('/finance/payouts/business/payouts/new')}>Capture Payout</Button>}
    >
      <Note tone={rules.rentAlreadyDeducted === null ? 'amber' : 'slate'}>
        When the payout statement already deducts rent, record it here as <b>Rent deducted at source</b>. The BM P&L then does not deduct rent again from the site's expenses.
        {rules.rentAlreadyDeducted === null && ' (Finance rule §21-07 “Rent already deducted from received payout?” is still pending — capture per statement.)'}
      </Note>
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(r) => r.id}
        noun="payouts"
        minWidth={1500}
        showFooter
        toolbar={
          <TableBar
            search={q}
            onSearch={setQ}
            placeholder="ATM, site, reference, MF…"
            onDownload={() =>
              downloadCsv(
                'bm_site_wise_payout',
                ['FY', 'Month', 'Super MF', 'MF', 'ATM ID', 'Site ID', 'Category', 'Gross (₹)', 'Rent at Source (₹)', 'Other Deductions (₹)', 'Received (₹)', 'Reference', 'Date', 'Document'],
                rows.map((r) => {
                  const s = siteOf.get(r.atmId)
                  return [r.fy, r.month, s?.superMf ?? '', s?.mf ?? '', r.atmId, s?.siteId ?? '', catName.get(s?.category ?? '') ?? '', String(fromPaise(r.gross)), String(fromPaise(r.rentDeductedAtSource)), String(fromPaise(r.otherSourceDeductions)), String(fromPaise(r.received)), r.reference, r.date, r.document ?? '']
                }),
              )
            }
          >
            <FilterSelect label="FY" value={fy} onChange={setFy} options={FY_OPTIONS} />
            <FilterSelect label="Month" value={month} onChange={setMonth} options={months.map((m) => ({ value: m, label: monthLabel(m) }))} />
            <FilterSelect label="Master Franchise" value={mf} onChange={setMf} options={mfs} />
            <FilterSelect label="Rent at source" value={rent} onChange={setRent} options={[{ value: 'yes', label: 'Deducted at source' }, { value: 'no', label: 'Not deducted' }]} />
          </TableBar>
        }
      />
    </PayoutPage>
  )
}
