import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { downloadCsv } from '@/lib/export'
import { useBusiness, type BmSite } from '@/data/payout'
import { PayoutPage } from '../PayoutShell'
import { fmtDate, metaOf, useBmLocal } from './bmStore'
import { DataTable, FilterSelect, Note, TableBar, type Col } from './ui'

export default function BmSites() {
  const b = useBusiness()
  const local = useBmLocal()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [approval, setApproval] = useState('all')
  const [status, setStatus] = useState('all')
  const [cat, setCat] = useState('all')
  const catName = useMemo(() => new Map(b.bmCategories.map((c) => [c.code, c.name])), [b.bmCategories])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return b.bmSites.filter(
      (x) =>
        (approval === 'all' || x.approval === approval) &&
        (status === 'all' || x.status === status) &&
        (cat === 'all' || x.category === cat) &&
        (!s || `${x.code} ${x.atmId} ${x.siteId} ${x.mf} ${x.superMf} ${x.city} ${x.state}`.toLowerCase().includes(s)),
    )
  }, [b.bmSites, q, approval, status, cat])

  const cols: Col<BmSite>[] = [
    { key: 'code', header: 'BM Site Code', render: (r) => <Link to={`/finance/payouts/business/sites/${r.code}`} className="font-semibold text-[#0066FF] hover:underline">{r.code}</Link> },
    { key: 'atm', header: 'ATM ID / Site ID', render: (r) => <div><div className="font-medium text-slate-900">{r.atmId}</div><div className="text-[11px] text-slate-500">{r.siteId}</div></div> },
    { key: 'cat', header: 'BM Category', render: (r) => catName.get(r.category) ?? r.category },
    { key: 'smf', header: 'Super MF', render: (r) => r.superMf || '—' },
    { key: 'mf', header: 'Master Franchise', render: (r) => r.mf || '—' },
    { key: 'model', header: 'Business Model', render: (r) => r.businessModel },
    { key: 'loc', header: 'City / State', render: (r) => `${r.city}, ${r.state}` },
    { key: 'eff', header: 'Effective', render: (r) => `${fmtDate(r.effectiveFrom)} – ${r.effectiveTo ? fmtDate(r.effectiveTo) : 'Open'}` },
    { key: 'maker', header: 'Maker', render: (r) => metaOf(local, 'siteMeta', r.code).maker },
    { key: 'appr', header: 'Approval', render: (r) => <Badge tone={toneFor(r.approval)}>{r.approval}</Badge> },
    { key: 'st', header: 'Status', render: (r) => <Badge tone={r.status === 'Active' ? 'green' : 'gray'}>{r.status}</Badge> },
  ]

  const download = () =>
    downloadCsv(
      'bm_site_master',
      ['BM Site Code', 'ATM ID', 'Site ID', 'Vertical', 'Category', 'Super MF', 'MF', 'Business Model', 'City', 'State', 'Effective From', 'Effective To', 'Approval', 'Status'],
      rows.map((r) => [r.code, r.atmId, r.siteId, 'Business Model', catName.get(r.category) ?? r.category, r.superMf, r.mf, r.businessModel, r.city, r.state, r.effectiveFrom, r.effectiveTo ?? '', r.approval, r.status]),
    )

  return (
    <PayoutPage
      title="BM Site Master"
      sub="Business Model site mapping (§6.1). Only eligible Master Franchisees and Super Master Franchisees can be mapped; Franchisee mapping is not permitted."
      crumbs={['Business Model', 'BM Site Master']}
      actions={<Button icon={<Plus size={15} />} onClick={() => navigate('/finance/payouts/business/sites/new')}>Map BM Site</Button>}
    >
      <Note>Vertical is fixed to <b>Business Model</b>. Changing a mapping never deletes the old one — every change is kept in the site's mapping history and goes back for approval.</Note>
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(r) => r.code}
        noun="BM sites"
        minWidth={1200}
        toolbar={
          <TableBar search={q} onSearch={setQ} placeholder="Code, ATM, MF, city…" onDownload={download}>
            <FilterSelect label="Approval" value={approval} onChange={setApproval} options={['Pending', 'Approved', 'Rejected']} />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={['Active', 'Inactive']} />
            <FilterSelect label="BM Category" value={cat} onChange={setCat} options={b.bmCategories.map((c) => ({ value: c.code, label: c.name }))} />
          </TableBar>
        }
      />
    </PayoutPage>
  )
}
