import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { TRANSFER_TYPES, usePortability, useNetwork, type NetworkState, type TransferRequest } from '@/data/network'
import { ALL_SCOPES, fmtDate, mappingView, nameOf, refLabel, usePortExtra, type TransferMeta, usePortabilityLoad } from './model'
import { btnOutline, Crumbs, EmptyRow, FDate, FilterCard, FSearch, FSelect, PageTitle, TableCard, tbodyRow, tdCls, theadRow, thCls } from './ui'

const HIST_STATUSES = ['Completed', 'Approved', 'Rejected']
const EMPTY = { search: '', type: 'all', status: 'all', scope: 'all', from: '', to: '' }

/** Nodes whose ownership history belongs to this transfer: the subject(s) plus every node that moved. */
const nodesOf = (t: TransferRequest, meta?: TransferMeta) => [...new Set([...t.subjectIds, ...(meta?.moved ?? []).map((m) => m.frId)])]

function ownershipText(ids: string[], net: NetworkState) {
  return ids
    .map((id) => {
      const n = net.nodes[id]
      if (!n) return ''
      return `${nameOf(id)}: ${[...n.history].reverse().map((h) => `${h.to.name} (${h.at.slice(0, 10)})`).join(' → ')}`
    })
    .filter(Boolean)
    .join(' | ')
}

export default function TransferHistory() {
  const { transfers } = usePortability()
  usePortabilityLoad() // API mode: hydrate from /transfers + /exits
  const extra = usePortExtra()
  const net = useNetwork()
  const [draft, setDraft] = useState(EMPTY)
  const [applied, setApplied] = useState(EMPTY)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [open, setOpen] = useState<string | null>(null)
  const close = useCallback(() => setOpen(null), [])
  const set = (k: keyof typeof EMPTY) => (v: string) => setDraft((d) => ({ ...d, [k]: v }))

  const rows = useMemo(
    () =>
      transfers
        .filter((t) => HIST_STATUSES.includes(t.status))
        .map((t) => {
          const meta = extra.transferMeta[t.id]
          const v = meta?.snapshot ?? mappingView(t.current, t.next, net)
          return { t, meta, v }
        }),
    [transfers, extra, net],
  )
  const filtered = useMemo(() => {
    const q = applied.search.trim().toLowerCase()
    return rows.filter(({ t, v }) => {
      if (applied.type !== 'all' && t.type !== applied.type) return false
      if (applied.status !== 'all' && t.status !== applied.status) return false
      if (applied.scope !== 'all' && t.scope !== applied.scope) return false
      const d = (t.adminApproval?.at ?? t.requestedOn).slice(0, 10)
      if (applied.from && d < applied.from) return false
      if (applied.to && d > applied.to) return false
      if (q) {
        const hay = [t.id, t.type, t.current.id, t.current.name, t.next.id, t.next.name, v.curSmf?.name, v.curMf?.name, v.newSmf?.name, v.newMf?.name, t.reason, t.emailRef, t.adminApproval?.by, ...t.subjectIds, ...t.subjectIds.map(nameOf)].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, applied])
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const exportCsv = () => {
    if (!filtered.length) return toast('No records to export', 'info')
    downloadCsv(
      `transfer-history-${new Date().toISOString().slice(0, 10)}`,
      ['Transfer Request No', 'Type', 'Subject', 'Old Parent ID', 'Old Parent', 'New Parent ID', 'New Parent', 'Old SMF', 'Old MF', 'New SMF', 'New MF', 'NOC Document', 'Email Reference', 'Correspondence', 'Approved / Rejected By', 'Decision Date', 'Effective Date', 'Transfer Reason', 'Status', 'Previous Ownership History'],
      filtered.map(({ t, meta, v }) => [
        t.id, t.type, t.subjectIds.map(nameOf).join('; '), t.current.id, t.current.name, t.next.id, t.next.name, refLabel(v.curSmf ?? undefined), refLabel(v.curMf ?? undefined), refLabel(v.newSmf ?? undefined), refLabel(v.newMf ?? undefined),
        t.documents.noc ?? (t.nocOverride ? 'Override — no NOC' : ''), t.emailRef, t.correspondence, t.adminApproval?.by ?? '', t.adminApproval?.at.slice(0, 10) ?? '', t.effectiveDate, t.reason, t.status, ownershipText(nodesOf(t, meta), net),
      ]),
    )
    toast(`${filtered.length} history record(s) exported`)
  }

  const sel = open ? rows.find((r) => r.t.id === open) : undefined

  return (
    <div className="max-w-[1500px] space-y-4 pb-12">
      <Crumbs trail={[{ label: 'Transfer & Portability', to: '/franchise/transfers' }, { label: 'Transfer History' }]} />
      <PageTitle
        title="Transfer History"
        sub="Permanent record of every decided transfer (§6.3). No mapping is ever deleted — only the current mapping changes."
        actions={
          <>
            <Link to="/franchise/transfers" className={btnOutline}><ArrowLeft size={14} className="text-[#0066FF]" /> Back</Link>
            <button type="button" onClick={exportCsv} className={btnOutline}><Download size={14} className="text-[#0066FF]" /> Export CSV</button>
          </>
        }
      />
      <FilterCard
        sub="Search the transfer history by party, parent, request number or reason."
        onSearch={() => { setApplied(draft); setPage(1) }}
        onReset={() => { setDraft(EMPTY); setApplied(EMPTY); setPage(1) }}
        onDownload={exportCsv}
      >
        <FSearch label="Search" value={draft.search} onChange={set('search')} placeholder="TRF no, party, parent..." />
        <FSelect label="Transfer Type" value={draft.type} onChange={set('type')} options={TRANSFER_TYPES.map((t) => t.type)} all="All Types" />
        <FSelect label="Status" value={draft.status} onChange={set('status')} options={HIST_STATUSES} all="All Status" />
        <FSelect label="Scope" value={draft.scope} onChange={set('scope')} options={ALL_SCOPES} all="All Scopes" />
        <FDate label="Decision Date From" value={draft.from} onChange={set('from')} />
        <FDate label="Decision Date To" value={draft.to} onChange={set('to')} />
      </FilterCard>
      <TableCard
        title="Transfer History"
        total={filtered.length}
        footer={<Pagination page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} noun="records" />}
      >
        <table className="w-full min-w-[1600px] border-collapse text-[11px] text-slate-700">
          <thead>
            <tr className={theadRow}>
              {['S.N.', 'Transfer Request No', 'Type', 'Old Parent ID', 'New Parent ID', 'Old SMF / MF', 'New SMF / MF', 'NOC Document', 'Email Communication', 'Approved By', 'Approval Date', 'Effective Date', 'Transfer Reason', 'Status'].map((h) => (
                <th key={h} className={thCls}>{h}</th>
              ))}
              <th className="px-3 py-2.5">Ownership</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(({ t, v }, i) => (
              <tr key={t.id} className={tbodyRow}>
                <td className={tdCls}>{(page - 1) * pageSize + i + 1}</td>
                <td className={`${tdCls} font-semibold whitespace-nowrap text-[#0066FF]`}>
                  <Link to={`/franchise/transfers/${t.id}`} className="inline-flex items-center gap-1 hover:underline">{t.id} <ExternalLink size={11} className="opacity-60" /></Link>
                </td>
                <td className={`${tdCls} whitespace-nowrap`}>{t.type}</td>
                <td className={`${tdCls} text-left`}><div className="font-medium">{t.current.id}</div><div className="text-slate-500">{t.current.name}</div></td>
                <td className={`${tdCls} text-left`}><div className="font-medium">{t.next.id}</div><div className="text-slate-500">{t.next.name}</div></td>
                <td className={`${tdCls} text-left`}>SMF: {v.curSmf?.name ?? '—'}<br />MF: {v.curMf?.name ?? '—'}</td>
                <td className={`${tdCls} text-left`}>SMF: {v.newSmf?.name ?? '—'}<br />MF: {v.newMf?.name ?? '—'}</td>
                <td className={tdCls}>{t.documents.noc ?? (t.nocOverride ? <Badge tone="purple">Override</Badge> : '—')}</td>
                <td className={`${tdCls} text-left`}>{t.emailRef || '—'}</td>
                <td className={tdCls}>{t.adminApproval?.decision === 'Approved' ? t.adminApproval.by : '—'}</td>
                <td className={`${tdCls} whitespace-nowrap`}>{t.adminApproval?.decision === 'Approved' ? fmtDate(t.adminApproval.at) : '—'}</td>
                <td className={`${tdCls} whitespace-nowrap`}>{fmtDate(t.effectiveDate)}</td>
                <td className={`${tdCls} text-left`}>{t.reason}</td>
                <td className={tdCls}><Badge tone={toneFor(t.status)}>{t.status}</Badge></td>
                <td className="px-3 py-2.5">
                  <button type="button" onClick={() => setOpen(t.id)} className="cursor-pointer text-[11px] font-semibold whitespace-nowrap text-[#0066FF] hover:underline">View history</button>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && <EmptyRow cols={15} text="No transfer history matches the filters." />}
          </tbody>
        </table>
      </TableCard>

      {sel && (
        <Modal title={`Previous ownership — ${sel.t.id}`} sub="Mapping history of every node involved; old mappings are never deleted." onClose={close} width={720} footer={<Button variant="secondary" onClick={close}>Close</Button>}>
          <div className="space-y-4">
            {nodesOf(sel.t, sel.meta).map((id) => {
              const n = net.nodes[id]
              return (
                <div key={id}>
                  <div className="mb-1.5 text-[12.5px] font-semibold text-slate-900">{nameOf(id)} <span className="font-normal text-slate-500">({n?.code ?? id})</span></div>
                  {n ? (
                    <ol className="space-y-1.5 border-l-2 border-slate-200 pl-3">
                      {n.history.map((h) => (
                        <li key={h.id} className="text-[12px]">
                          <span className="font-medium">{h.from ? `${h.from.name} → ` : ''}{h.to.name}</span>
                          <span className="text-slate-500"> · {fmtDate(h.at)} · by {h.by}{h.approvedBy ? `, approved by ${h.approvedBy}` : ''} · {h.reason}{h.transferId ? ` (${h.transferId})` : ''}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-[12px] text-slate-500">Not a network node (e.g. Team Leader).</p>
                  )}
                </div>
              )
            })}
          </div>
        </Modal>
      )}
    </div>
  )
}
