import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, ExternalLink, History, Plus } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { TRANSFER_STAGES, TRANSFER_TYPES, usePortability, type TransferStatus } from '@/data/network'
import { ALL_SCOPES, fmtDate, nameOf, refLabel, usePortabilityLoad } from './model'
import { btnOutline, btnPrimary, Crumbs, EmptyRow, FDate, FilterCard, FSearch, FSelect, PageTitle, StatusTiles, TableCard, tbodyRow, tdCls, theadRow, thCls } from './ui'

type Tab = 'all' | TransferStatus
const STATUSES: TransferStatus[] = ['Pending', 'Under Review', 'Approved', 'Rejected', 'Completed']
const TONES: Record<Tab, string> = { all: 'bg-[#2563EB]', Pending: 'bg-amber-500', 'Under Review': 'bg-blue-500', Approved: 'bg-emerald-500', Rejected: 'bg-red-500', Completed: 'bg-emerald-700' }
const EMPTY = { search: '', type: 'all', status: 'all', scope: 'all', from: '', to: '' }

export default function TransferList() {
  const navigate = useNavigate()
  const { transfers } = usePortability()
  usePortabilityLoad() // API mode: hydrate from /transfers + /exits
  const [tab, setTab] = useState<Tab>('all')
  const [draft, setDraft] = useState(EMPTY)
  const [applied, setApplied] = useState(EMPTY)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const set = (k: keyof typeof EMPTY) => (v: string) => setDraft((d) => ({ ...d, [k]: v }))

  const filtered = useMemo(() => {
    const q = applied.search.trim().toLowerCase()
    return transfers.filter((t) => {
      if (tab !== 'all' && t.status !== tab) return false
      if (applied.type !== 'all' && t.type !== applied.type) return false
      if (applied.status !== 'all' && t.status !== applied.status) return false
      if (applied.scope !== 'all' && t.scope !== applied.scope) return false
      const d = t.requestedOn.slice(0, 10)
      if (applied.from && d < applied.from) return false
      if (applied.to && d > applied.to) return false
      if (q) {
        const hay = [t.id, t.type, t.current.name, t.current.id, t.next.name, t.next.id, t.reason, t.requestedBy, ...t.subjectIds, ...t.subjectIds.map(nameOf)].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [transfers, tab, applied])
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const tiles = (['all', ...STATUSES] as Tab[]).map((k) => ({ key: k, label: k === 'all' ? 'All Requests' : k, count: k === 'all' ? transfers.length : transfers.filter((t) => t.status === k).length, tone: TONES[k] }))

  const exportCsv = () => {
    if (!filtered.length) return toast('No records to export', 'info')
    downloadCsv(
      `transfer-requests-${new Date().toISOString().slice(0, 10)}`,
      ['Request ID', 'Request Date', 'Type', 'Subject', 'Scope', 'Current Parent', 'New Parent', 'Stage', 'Status', 'Effective Date', 'Reason', 'Requested By'],
      filtered.map((t) => [t.id, t.requestedOn.slice(0, 10), t.type, t.subjectIds.map((id) => `${nameOf(id)} (${id})`).join('; '), t.scope, refLabel(t.current), refLabel(t.next), TRANSFER_STAGES[Math.min(t.stage, TRANSFER_STAGES.length - 1)], t.status, t.effectiveDate, t.reason, t.requestedBy]),
    )
    toast(`${filtered.length} transfer request(s) exported`)
  }

  return (
    <div className="max-w-[1500px] space-y-4 pb-12">
      <Crumbs trail={[{ label: 'Transfer & Portability' }]} />
      <PageTitle
        title="Transfer & Portability"
        sub="NOC-based transfer of SMF, MF and FR networks with Super Admin approval. Old mappings are never deleted."
        actions={
          <>
            <Link to="/franchise/transfers/history" className={btnOutline}>
              <History size={14} className="text-[#0066FF]" /> Transfer History
            </Link>
            <button type="button" onClick={exportCsv} className={btnOutline}>
              <Download size={14} className="text-[#0066FF]" /> Export CSV
            </button>
            <Link to="/franchise/transfers/new" className={btnPrimary}>
              <Plus size={16} strokeWidth={2.4} /> New Transfer Request
            </Link>
          </>
        }
      />
      <StatusTiles tiles={tiles} value={tab} onChange={(k) => { setTab(k); setPage(1) }} />
      <FilterCard
        sub="Use the filters below to find transfer requests."
        onSearch={() => { setApplied(draft); setPage(1) }}
        onReset={() => { setDraft(EMPTY); setApplied(EMPTY); setTab('all'); setPage(1) }}
        onDownload={exportCsv}
      >
        <FSearch label="Search" value={draft.search} onChange={set('search')} placeholder="ID, party, parent, reason..." />
        <FSelect label="Transfer Type" value={draft.type} onChange={set('type')} options={TRANSFER_TYPES.map((t) => t.type)} all="All Types" />
        <FSelect label="Status" value={draft.status} onChange={set('status')} options={STATUSES} all="All Status" />
        <FSelect label="Scope" value={draft.scope} onChange={set('scope')} options={ALL_SCOPES} all="All Scopes" />
        <FDate label="Request Date From" value={draft.from} onChange={set('from')} />
        <FDate label="Request Date To" value={draft.to} onChange={set('to')} />
      </FilterCard>
      <TableCard
        title="Transfer Requests"
        total={filtered.length}
        footer={<Pagination page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} noun="requests" />}
      >
        <table className="w-full min-w-[1150px] border-collapse text-[11px] text-slate-700">
          <thead>
            <tr className={theadRow}>
              {['S.N.', 'Request ID', 'Request Date', 'Transfer Type', 'Subject', 'Scope', 'Current Parent', 'New Parent', 'Stage', 'Effective Date', 'Status'].map((h) => (
                <th key={h} className={thCls}>{h}</th>
              ))}
              <th className="px-3 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={t.id} className={tbodyRow}>
                <td className={tdCls}>{(page - 1) * pageSize + i + 1}</td>
                <td className={`${tdCls} font-semibold whitespace-nowrap text-[#0066FF]`}>
                  <Link to={`/franchise/transfers/${t.id}`} className="inline-flex items-center gap-1 hover:underline">
                    {t.id} <ExternalLink size={11} className="opacity-60" />
                  </Link>
                </td>
                <td className={`${tdCls} whitespace-nowrap`}>{fmtDate(t.requestedOn)}</td>
                <td className={`${tdCls} whitespace-nowrap`}>{t.type}</td>
                <td className={`${tdCls} text-left`}>{t.subjectIds.map(nameOf).join(', ')}</td>
                <td className={`${tdCls} whitespace-nowrap`}>{t.scope}</td>
                <td className={`${tdCls} text-left`}>{t.current.name}</td>
                <td className={`${tdCls} text-left`}>{t.next.name}</td>
                <td className={`${tdCls} whitespace-nowrap`}>{t.status === 'Completed' ? 'History Preserved' : TRANSFER_STAGES[Math.min(t.stage, TRANSFER_STAGES.length - 1)]}</td>
                <td className={`${tdCls} whitespace-nowrap`}>{fmtDate(t.effectiveDate)}</td>
                <td className={tdCls}><Badge tone={toneFor(t.status)}>{t.status}</Badge></td>
                <td className="px-3 py-2.5">
                  <button type="button" onClick={() => navigate(`/franchise/transfers/${t.id}`)} className="cursor-pointer text-[11px] font-semibold text-[#0066FF] hover:underline">
                    Open
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyRow cols={12} text="No transfer requests match the filters." />}
          </tbody>
        </table>
      </TableCard>
    </div>
  )
}
