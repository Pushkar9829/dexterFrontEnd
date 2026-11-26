import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, ExternalLink, Plus } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { TIERS } from '@/data/franchises'
import { usePortability, type ExitRequest } from '@/data/network'
import { fmtDate, nameOf, refLabel, usePortExtra, usePortabilityLoad } from './model'
import { btnOutline, btnPrimary, Crumbs, EmptyRow, FDate, FilterCard, FSearch, FSelect, PageTitle, StatusTiles, TableCard, tbodyRow, tdCls, theadRow, thCls } from './ui'

type Status = ExitRequest['status']
type Tab = 'all' | Status
const STATUSES: Status[] = ['Requested', 'Under Review', 'Approved', 'Rejected', 'Exited']
const TONES: Record<Tab, string> = { all: 'bg-[#2563EB]', Requested: 'bg-amber-500', 'Under Review': 'bg-blue-500', Approved: 'bg-emerald-500', Rejected: 'bg-red-500', Exited: 'bg-slate-500' }
const HANDOVER = ['SMF', 'MF', 'Team Leader', 'Company', 'None']
const EMPTY = { search: '', tier: 'all', status: 'all', handover: 'all', from: '', to: '' }

export default function ExitList() {
  const { exits } = usePortability()
  usePortabilityLoad() // API mode: hydrate from /transfers + /exits
  const extra = usePortExtra()
  const [tab, setTab] = useState<Tab>('all')
  const [draft, setDraft] = useState(EMPTY)
  const [applied, setApplied] = useState(EMPTY)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const set = (k: keyof typeof EMPTY) => (v: string) => setDraft((d) => ({ ...d, [k]: v }))

  const filtered = useMemo(() => {
    const q = applied.search.trim().toLowerCase()
    return exits.filter((e) => {
      if (tab !== 'all' && e.status !== tab) return false
      if (applied.tier !== 'all' && e.tier !== applied.tier) return false
      if (applied.status !== 'all' && e.status !== applied.status) return false
      if (applied.handover !== 'all' && (e.networkTo?.kind ?? 'None') !== applied.handover) return false
      const d = e.requestedOn.slice(0, 10)
      if (applied.from && d < applied.from) return false
      if (applied.to && d > applied.to) return false
      if (q && ![e.id, e.frId, nameOf(e.frId), e.reason, e.networkTo?.name, e.approvedBy].join(' ').toLowerCase().includes(q)) return false
      return true
    })
  }, [exits, tab, applied])
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const tiles = (['all', ...STATUSES] as Tab[]).map((k) => ({ key: k, label: k === 'all' ? 'All Exits' : k, count: k === 'all' ? exits.length : exits.filter((e) => e.status === k).length, tone: TONES[k] }))

  const exportCsv = () => {
    if (!filtered.length) return toast('No records to export', 'info')
    downloadCsv(
      `exit-requests-${new Date().toISOString().slice(0, 10)}`,
      ['Exit ID', 'Request Date', 'Party ID', 'Party', 'Tier', 'Reason', 'Effective Date', 'Network Hand-over To', 'Settlement Cleared', 'Documents Returned', 'NOC Issued', 'Status', 'Approved By'],
      filtered.map((e) => [e.id, e.requestedOn.slice(0, 10), e.frId, nameOf(e.frId), e.tier, e.reason, extra.exitMeta[e.id]?.effectiveDate ?? '', e.networkTo ? refLabel(e.networkTo) : '', e.settlementCleared ? 'Yes' : 'No', e.documentsReturned ? 'Yes' : 'No', e.nocIssued ? 'Yes' : 'No', e.status, e.approvedBy ?? '']),
    )
    toast(`${filtered.length} exit request(s) exported`)
  }

  return (
    <div className="max-w-[1500px] space-y-4 pb-12">
      <Crumbs trail={[{ label: 'Exit Management' }]} />
      <PageTitle
        title="Exit Management"
        sub="One exit flow for SMF, MF and FR. The network of an exiting party is handed over and every step is kept in history."
        actions={
          <>
            <button type="button" onClick={exportCsv} className={btnOutline}><Download size={14} className="text-[#0066FF]" /> Export CSV</button>
            <Link to="/franchise/exits/new" className={btnPrimary}><Plus size={16} strokeWidth={2.4} /> New Exit Request</Link>
          </>
        }
      />
      <StatusTiles tiles={tiles} value={tab} onChange={(k) => { setTab(k); setPage(1) }} />
      <FilterCard
        sub="Use the filters below to find exit requests."
        onSearch={() => { setApplied(draft); setPage(1) }}
        onReset={() => { setDraft(EMPTY); setApplied(EMPTY); setTab('all'); setPage(1) }}
        onDownload={exportCsv}
      >
        <FSearch label="Search" value={draft.search} onChange={set('search')} placeholder="Exit ID, party, reason..." />
        <FSelect label="Tier" value={draft.tier} onChange={set('tier')} options={TIERS} all="All Tiers" />
        <FSelect label="Status" value={draft.status} onChange={set('status')} options={STATUSES} all="All Status" />
        <FSelect label="Network Hand-over" value={draft.handover} onChange={set('handover')} options={HANDOVER} all="All" />
        <FDate label="Request Date From" value={draft.from} onChange={set('from')} />
        <FDate label="Request Date To" value={draft.to} onChange={set('to')} />
      </FilterCard>
      <TableCard
        title="Exit Requests"
        total={filtered.length}
        footer={<Pagination page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} noun="requests" />}
      >
        <table className="w-full min-w-[1100px] border-collapse text-[11px] text-slate-700">
          <thead>
            <tr className={theadRow}>
              {['S.N.', 'Exit ID', 'Request Date', 'Party', 'Tier', 'Reason', 'Effective Date', 'Network Hand-over', 'Checklist', 'Status'].map((h) => (
                <th key={h} className={thCls}>{h}</th>
              ))}
              <th className="px-3 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e, i) => {
              const done = [e.settlementCleared, e.documentsReturned, e.nocIssued].filter(Boolean).length
              return (
                <tr key={e.id} className={tbodyRow}>
                  <td className={tdCls}>{(page - 1) * pageSize + i + 1}</td>
                  <td className={`${tdCls} font-semibold whitespace-nowrap text-[#0066FF]`}>
                    <Link to={`/franchise/exits/${e.id}`} className="inline-flex items-center gap-1 hover:underline">{e.id} <ExternalLink size={11} className="opacity-60" /></Link>
                  </td>
                  <td className={`${tdCls} whitespace-nowrap`}>{fmtDate(e.requestedOn)}</td>
                  <td className={`${tdCls} text-left`}><div className="font-medium">{nameOf(e.frId)}</div><div className="text-slate-500">{e.frId}</div></td>
                  <td className={`${tdCls} whitespace-nowrap`}>{e.tier}</td>
                  <td className={`${tdCls} text-left`}>{e.reason}</td>
                  <td className={`${tdCls} whitespace-nowrap`}>{fmtDate(extra.exitMeta[e.id]?.effectiveDate)}</td>
                  <td className={`${tdCls} text-left`}>{e.networkTo ? `${e.networkTo.name} (${e.networkTo.kind})` : '—'}</td>
                  <td className={tdCls}>{done}/3</td>
                  <td className={tdCls}><Badge tone={e.status === 'Exited' ? 'gray' : toneFor(e.status)}>{e.status}</Badge></td>
                  <td className="px-3 py-2.5"><Link to={`/franchise/exits/${e.id}`} className="text-[11px] font-semibold text-[#0066FF] hover:underline">Open</Link></td>
                </tr>
              )
            })}
            {rows.length === 0 && <EmptyRow cols={11} text="No exit requests match the filters." />}
          </tbody>
        </table>
      </TableCard>
    </div>
  )
}
