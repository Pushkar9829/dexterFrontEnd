import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, Download, EyeOff, RefreshCw, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { TextAreaField, fmtSize } from '@/components/ui/Form'
import { useRole } from '@/lib/rbac'
import { FINANCIAL_YEARS, TDS_DOC_TYPES, exportTdsCsv, loadTdsAccessLog, loadTdsAccessLogs, openTdsAsync, reviewTdsAsync, tdsLoader, useTdsLetters, withdrawTdsAsync, type TdsDoc } from '@/data/tdsLetters'
import { apiEnabled } from '@/data/opsApi'
import { actorName } from '@/data/workflow'
import { opsMeLoader, rightsFor } from './eod2/access'
import { contains, dt, inr } from './eod2/fmt'
import { Kpi, NoAccess, Note, OpsPage, Panel, RoleTableCard, SearchBox, Sel, Status, TableWrap, TD, TH, TR, Tabs } from './eod2/ui'

/** TDS Document Master (spec §7) + view / download audit log. */
export default function TdsLettersList() {
  const docs = useTdsLetters()
  const load = tdsLoader.use()
  const role = useRole()
  opsMeLoader.use()
  const rights = rightsFor('TDS Letter', role)
  const navigate = useNavigate()
  const [tab, setTab] = useState<'master' | 'log' | 'visibility'>('master')
  const [q, setQ] = useState('')
  const [fy, setFy] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('Active')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [withdraw, setWithdraw] = useState<TdsDoc | null>(null)
  const [review, setReview] = useState<TdsDoc | null>(null)
  const [probe, setProbe] = useState('')
  const rows = useMemo(() => docs.filter((d) => (!fy || d.fy === fy) && (!type || d.docType === type) && (!status || d.status === status) && contains(q, d.id, d.frId, d.franchiseName, d.file.name)), [docs, fy, type, status, q])
  const log = useMemo(() => docs.flatMap((d) => d.access.map((a, i) => ({ ...a, key: `${d.id}-${i}`, doc: d }))).filter((a) => contains(q, a.doc.id, a.doc.franchiseName, a.by)).sort((a, b) => b.at.localeCompare(a.at)), [docs, q])
  const franchises = useMemo(() => [...new Map(docs.map((d) => [d.frId, d.franchiseName])).entries()], [docs])
  // API mode: the list omits access logs — load them (GET /tds-letters/:id/access-log, no View logged) for the audit tab
  const docIds = docs.map((d) => d.id).join(',')
  useEffect(() => {
    if (apiEnabled && tab === 'log' && docIds) void loadTdsAccessLogs(docIds.split(','))
  }, [tab, docIds])
  if (!rights.view || role === 'Franchisee') return <NoAccess module="TDS Letter" />
  const paged = rows.slice((page - 1) * size, page * size)
  const reset = () => setPage(1)
  const probeDocs = docs.filter((d) => d.frId === probe && d.status === 'Active')

  return (
    <OpsPage
      title="TDS Letter Management"
      sub="CRM / Finance upload TDS PDFs mapped to a franchise and financial year. Each document is visible only to its mapped franchise in the mobile app; every view / download is logged."
      back={{ to: '/operations', label: 'Operations' }}
      actions={
        <>
          {rights.export && (
            <Button variant="secondary" icon={<Download size={15} />} onClick={() => exportTdsCsv(rows)}>
              Export
            </Button>
          )}
          {rights.create && (
            <Button icon={<Upload size={15} />} onClick={() => navigate('/operations/tds/upload')}>
              Upload TDS PDF
            </Button>
          )}
        </>
      }
    >
      {load.loading && <Note tone="blue">Loading TDS documents…</Note>}
      {load.error && <Note tone="red">Could not load TDS documents: {load.error}</Note>}
      {apiEnabled && <Note tone="blue">Access logs come from the server (GET /tds-letters/:id/access-log) — open the Access audit log tab or use “Log” on a row; reading the log does not count as a view.</Note>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Active documents" value={docs.filter((d) => d.status === 'Active').length} tone="green" />
        <Kpi label="Franchises mapped" value={new Set(docs.map((d) => d.frId)).size} />
        <Kpi label="Franchise views / downloads" value={docs.reduce((s, d) => s + d.access.length, 0)} tone="blue" />
        <Kpi label="Superseded / withdrawn" value={docs.filter((d) => d.status !== 'Active').length} tone="gray" />
      </div>
      <Tabs value={tab} onChange={(t) => { setTab(t); reset() }} tabs={[{ id: 'master', label: 'TDS Document Master' }, { id: 'log', label: `Access audit log (${log.length})` }, { id: 'visibility', label: 'Visibility check' }]} />

      {tab !== 'visibility' && (
        <Panel>
          <div className="flex flex-wrap items-end gap-3">
            <SearchBox value={q} onChange={(v) => { setQ(v); reset() }} placeholder="Document ID, franchise, file" />
            {tab === 'master' && (
              <>
                <Sel label="Financial year" value={fy} onChange={(v) => { setFy(v); reset() }} options={[...FINANCIAL_YEARS]} />
                <Sel label="Document type" value={type} onChange={(v) => { setType(v); reset() }} options={[...TDS_DOC_TYPES]} />
                <Sel label="Status" value={status} onChange={(v) => { setStatus(v); reset() }} options={['Active', 'Superseded', 'Withdrawn']} />
              </>
            )}
          </div>
        </Panel>
      )}

      {tab === 'master' && (
        <Panel pad={false} title={`${rows.length} document(s)`}>
          <TableWrap empty={!rows.length}>
            <thead className="bg-slate-50">
              <tr>
                {['Document', 'Mapped franchise (only viewer)', 'FY / period', 'Type', 'TDS amount', 'File', 'Uploaded', 'Status', 'Views / downloads', ''].map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((d) => (
                <tr key={d.id} className={TR}>
                  <td className={TD}>
                    <b>{d.id}</b>
                    <div className="text-[10.5px] text-muted">v{d.version}{d.replaces ? ` · replaces ${d.replaces}` : ''}</div>
                  </td>
                  <td className={TD}>
                    {d.franchiseName}
                    <div className="text-[11px] text-muted">{d.frId}</div>
                  </td>
                  <td className={TD}>
                    FY {d.fy}
                    <div className="text-[11px] text-muted">{d.period}</div>
                  </td>
                  <td className={TD}>{d.docType}</td>
                  <td className={TD}>{inr(d.tdsAmount)}</td>
                  <td className={TD}>
                    {d.file.name}
                    <div className="text-[11px] text-muted">{fmtSize(d.file.size)}</div>
                  </td>
                  <td className={TD}>
                    {d.uploadedBy}
                    <div className="text-[11px] text-muted">{d.uploaderRole} · {dt(d.uploadedAt)}</div>
                  </td>
                  <td className={TD}>
                    <Status text={d.status} tone={d.status === 'Active' ? 'green' : 'gray'} />
                    {d.withdrawnReason && <div className="text-[10.5px] text-muted">{d.withdrawnReason}</div>}
                  </td>
                  <td className={TD}>
                    {d.access.filter((a) => a.action === 'View').length} / {d.access.filter((a) => a.action === 'Download').length}
                  </td>
                  <td className={TD}>
                    {apiEnabled && (
                      <div className="mb-1 flex gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => void loadTdsAccessLog(d.id).catch((e) => toast((e as Error).message, 'error'))}>
                          Log
                        </Button>
                        {d.fileId && (
                          <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => void openTdsAsync(d.id, 'Download').then(() => loadTdsAccessLog(d.id)).catch((e) => toast((e as Error).message, 'error'))} aria-label="Download PDF" />
                        )}
                        {apiEnabled && d.status === 'Active' && rights.verify && !d.reviewedAt && (
                          <Button size="sm" onClick={() => setReview(d)} disabled={d.uploadedBy === actorName()}>
                            Review
                          </Button>
                        )}
                      </div>
                    )}
                    {d.reviewedBy && <div className="mb-1 text-[10.5px] text-muted">Reviewed by {d.reviewedBy}</div>}
                    {d.status === 'Active' && (rights.create || rights.verify) && (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="secondary" icon={<RefreshCw size={13} />} onClick={() => navigate(`/operations/tds/upload?replace=${d.id}`)}>
                          Replace
                        </Button>
                        {(rights.verify || rights.approve) && (
                          <Button size="sm" variant="danger" icon={<Ban size={13} />} onClick={() => setWithdraw(d)}>
                            Withdraw
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pagination page={page} pageSize={size} total={rows.length} onPage={setPage} onPageSize={(n) => { setSize(n); reset() }} noun="documents" />
        </Panel>
      )}

      {tab === 'log' && (
        <Panel pad={false} title="Franchise views & downloads">
          <TableWrap empty={!log.length}>
            <thead className="bg-slate-50">
              <tr>
                {['When', 'Who', 'Action', 'Channel', 'Document', 'Franchise', 'FY / period'].map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.slice((page - 1) * size, page * size).map((a) => (
                <tr key={a.key} className={TR}>
                  <td className={TD}>{dt(a.at)}</td>
                  <td className={TD}>{a.by}</td>
                  <td className={TD}>
                    <Status text={a.action} tone={a.action === 'Download' ? 'blue' : 'gray'} />
                  </td>
                  <td className={TD}>{a.channel}</td>
                  <td className={TD}>{a.doc.id}</td>
                  <td className={TD}>{a.doc.franchiseName}</td>
                  <td className={TD}>
                    {a.doc.fy} · {a.doc.period}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pagination page={page} pageSize={size} total={log.length} onPage={setPage} onPageSize={(n) => { setSize(n); reset() }} noun="events" />
        </Panel>
      )}

      {tab === 'visibility' && (
        <Panel title="What does a franchise see in its app?" sub="UAT 16 — documents are filtered by the mapped franchise ID; nobody else can open them.">
          <div className="max-w-md">
            <Sel label="Franchise" value={probe} onChange={setProbe} options={franchises.map(([id]) => id)} all="Select franchise" />
          </div>
          {probe && (
            <div className="mt-3 space-y-2">
              <Note tone="blue">
                {franchises.find(([id]) => id === probe)?.[1]} sees {probeDocs.length} document(s): {probeDocs.map((d) => `${d.id} (FY ${d.fy} ${d.period})`).join(', ') || 'none'}.
              </Note>
              <Note tone="amber">
                <EyeOff size={13} className="mr-1 inline" /> Hidden from this franchise: {docs.filter((d) => d.frId !== probe).length} document(s) mapped to other franchises.
              </Note>
            </div>
          )}
        </Panel>
      )}

      <RoleTableCard modules={['TDS Letter']} />
      {withdraw && <WithdrawModal d={withdraw} onClose={() => setWithdraw(null)} />}
      {review && <ReviewModal d={review} onClose={() => setReview(null)} />}
    </OpsPage>
  )
}

function WithdrawModal({ d, onClose }: { d: TdsDoc; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const save = async () => {
    const e = await withdrawTdsAsync(d.id, reason)
    if (e) return setErr(e)
    toast(`${d.id} withdrawn — hidden from the franchise app`)
    onClose()
  }
  return (
    <Modal title={`Withdraw ${d.id}`} sub={`${d.franchiseName} · FY ${d.fy}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={save}>Withdraw</Button></>}>
      <TextAreaField label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
      {err && (
        <div className="mt-2">
          <Note tone="red">{err}</Note>
        </div>
      )}
    </Modal>
  )
}

function ReviewModal({ d, onClose }: { d: TdsDoc; onClose: () => void }) {
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const save = async () => {
    const e = await reviewTdsAsync(d.id, note)
    if (e) return setErr(e)
    toast(`${d.id} reviewed`)
    onClose()
  }
  return (
    <Modal title={`Review ${d.id}`} sub={`${d.franchiseName} · FY ${d.fy} · ${d.period}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Mark reviewed</Button></>}>
      <TextAreaField label="Review note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      {err && (
        <div className="mt-2">
          <Note tone="red">{err}</Note>
        </div>
      )}
    </Modal>
  )
}
