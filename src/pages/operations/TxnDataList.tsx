import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck, Download, FilePlus2, History, Pencil, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { TextAreaField, TextField } from '@/components/ui/Form'
import { useRole } from '@/lib/rbac'
import { actorName } from '@/data/workflow'
import { TXN_VERIFICATION, editTxnAsync, exportTxnCsv, fetchTxnDetail, returnTxnAsync, txnLoader, useTxnStore, verifyTxnAsync, type TxnInput, type TxnRecord } from '@/data/txnData'
import { apiEnabled } from '@/data/opsApi'
import { opsMeLoader, rightsFor } from './eod2/access'
import { contains, dmy, dt, inr } from './eod2/fmt'
import { Kpi, KV, NoAccess, Note, OpsPage, Panel, RoleTableCard, SearchBox, Sel, Status, TableWrap, TD, TH, TR, Tabs, Timeline } from './eod2/ui'

/** Transaction Data master (spec §8). CRM creates / imports / edits / verifies; Finance & Operations view & analyze. */
export default function TxnDataList() {
  const { records, batches } = useTxnStore()
  const load = txnLoader.use()
  const role = useRole()
  opsMeLoader.use()
  const rights = rightsFor('Transaction Data', role)
  const navigate = useNavigate()
  const [tab, setTab] = useState<'records' | 'batches'>('records')
  const [q, setQ] = useState('')
  const [ver, setVer] = useState('')
  const [mode, setMode] = useState('')
  const [batch, setBatch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(15)
  const [sel, setSel] = useState<string[]>([])
  const [dialog, setDialog] = useState<{ kind: 'edit' | 'return' | 'history'; r: TxnRecord } | null>(null)
  const rows = useMemo(
    () => records.filter((r) => (!ver || r.verification === ver) && (!mode || r.entryMode === mode) && (!batch || r.importBatch === batch) && (!from || r.txnDate >= from) && (!to || r.txnDate <= to) && contains(q, r.id, r.atmId, r.siteId, r.franchiseName, r.sourceRef)),
    [records, ver, mode, batch, from, to, q],
  )
  if (!rights.view) return <NoAccess module="Transaction Data" />
  const paged = rows.slice((page - 1) * size, page * size)
  const reset = () => {
    setPage(1)
    setSel([])
  }
  const pendingOnPage = paged.filter((r) => r.verification === 'Pending Verification').map((r) => r.id)
  const bulkVerify = async () => {
    const res = await verifyTxnAsync(sel).catch(() => null)
    if (!res) return
    setSel([])
    if (res.blocked.length) toast(`${res.done} verified · ${res.blocked.length} blocked by maker-checker (you created / edited them)`, 'info')
    else toast(`${res.done} record(s) verified`)
  }
  const sum = rows.reduce((s, r) => s + r.amount, 0)

  return (
    <OpsPage
      title="Transaction Data"
      sub="Entered / imported / updated only by CRM Executives or authorized users. Franchises see their own mapped sites read-only in the mobile app."
      back={{ to: '/operations', label: 'Operations' }}
      actions={
        <>
          {rights.export && (
            <Button variant="secondary" icon={<Download size={15} />} onClick={() => exportTxnCsv(rows)}>
              Export
            </Button>
          )}
          {rights.create && (
            <Button icon={<FilePlus2 size={15} />} onClick={() => navigate('/operations/txn-data/new')}>
              New entry / Import
            </Button>
          )}
        </>
      }
    >
      {!rights.create && !rights.edit && <Note tone="blue">View / analyze access only for your role ({role}).</Note>}
      {load.loading && <Note tone="blue">Loading transaction data…</Note>}
      {load.error && <Note tone="red">Could not load transaction data: {load.error}</Note>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Records (filtered)" value={rows.length.toLocaleString('en-IN')} />
        <Kpi label="Transactions" value={rows.reduce((s, r) => s + r.txnCount, 0).toLocaleString('en-IN')} tone="blue" />
        <Kpi label="Amount" value={inr(sum)} tone="purple" />
        <Kpi label="Pending verification" value={records.filter((r) => r.verification === 'Pending Verification').length} tone="amber" onClick={() => { setVer('Pending Verification'); reset() }} active={ver === 'Pending Verification'} />
        <Kpi label="Returned" value={records.filter((r) => r.verification === 'Returned for Correction').length} tone="red" onClick={() => { setVer('Returned for Correction'); reset() }} active={ver === 'Returned for Correction'} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'records', label: 'Transaction records' }, { id: 'batches', label: `Import batches (${batches.length})` }]} />

      {tab === 'records' ? (
        <>
          <Panel>
            <div className="flex flex-wrap items-end gap-3">
              <SearchBox value={q} onChange={(v) => { setQ(v); reset() }} placeholder="Record ID, ATM, site, franchise, source" />
              <Sel label="Verification" value={ver} onChange={(v) => { setVer(v); reset() }} options={TXN_VERIFICATION} />
              <Sel label="Entry mode" value={mode} onChange={(v) => { setMode(v); reset() }} options={['Manual', 'Import']} />
              <Sel label="Import batch" value={batch} onChange={(v) => { setBatch(v); reset() }} options={batches.map((b) => b.id)} />
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold tracking-wide text-slate-500 uppercase">From</span>
                <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); reset() }} className="h-9 rounded-lg border border-line px-2 text-[12px]" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold tracking-wide text-slate-500 uppercase">To</span>
                <input type="date" value={to} onChange={(e) => { setTo(e.target.value); reset() }} className="h-9 rounded-lg border border-line px-2 text-[12px]" />
              </label>
            </div>
          </Panel>
          <Panel
            pad={false}
            title={`${rows.length} record(s)`}
            action={
              rights.verify && (
                <Button size="sm" icon={<CheckCheck size={13} />} disabled={!sel.length} onClick={bulkVerify}>
                  Verify selected ({sel.length})
                </Button>
              )
            }
          >
            <TableWrap empty={!rows.length}>
              <thead className="bg-slate-50">
                <tr>
                  {rights.verify && (
                    <th className={TH}>
                      <input type="checkbox" aria-label="Select page" checked={pendingOnPage.length > 0 && pendingOnPage.every((id) => sel.includes(id))} onChange={(e) => setSel(e.target.checked ? [...new Set([...sel, ...pendingOnPage])] : sel.filter((id) => !pendingOnPage.includes(id)))} />
                    </th>
                  )}
                  {['Record', 'Date', 'ATM / Site', 'Franchise', 'Txn count', 'W / D', 'Amount', 'Source / batch', 'Verification', 'Created', ''].map((h) => (
                    <th key={h} className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.id} className={TR}>
                    {rights.verify && (
                      <td className={TD}>
                        {r.verification === 'Pending Verification' && <input type="checkbox" aria-label={`Select ${r.id}`} checked={sel.includes(r.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))} />}
                      </td>
                    )}
                    <td className={`${TD} font-semibold`}>{r.id}</td>
                    <td className={TD}>{dmy(r.txnDate)}</td>
                    <td className={TD}>
                      {r.atmId}
                      <div className="text-[11px] text-muted">{r.siteId}</div>
                    </td>
                    <td className={TD}>{r.franchiseName}</td>
                    <td className={TD}>{r.txnCount.toLocaleString('en-IN')}</td>
                    <td className={TD}>
                      {r.withdrawalCount} / {r.depositCount}
                    </td>
                    <td className={TD}>{inr(r.amount)}</td>
                    <td className={`${TD} max-w-[200px] truncate`} title={r.sourceRef}>
                      {r.sourceRef}
                      <div className="text-[11px] text-muted">{r.importBatch ?? r.entryMode}</div>
                    </td>
                    <td className={TD}>
                      <Status text={r.verification} tone={r.verification === 'Returned for Correction' ? 'red' : undefined} />
                      {r.verifiedBy && <div className="text-[10.5px] text-muted">{r.verifiedBy}</div>}
                    </td>
                    <td className={TD}>
                      {r.trail.createdBy}
                      <div className="text-[11px] text-muted">{dt(r.trail.createdAt)}</div>
                    </td>
                    <td className={TD}>
                      <div className="flex gap-1">
                        {rights.edit && (
                          <Button size="sm" variant="secondary" icon={<Pencil size={12} />} onClick={() => setDialog({ kind: 'edit', r })}>
                            Edit
                          </Button>
                        )}
                        {rights.verify && r.verification === 'Pending Verification' && (
                          <Button size="sm" variant="ghost" icon={<RotateCcw size={12} />} onClick={() => setDialog({ kind: 'return', r })} disabled={r.trail.createdBy === actorName()}>
                            Return
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" icon={<History size={12} />} onClick={() => setDialog({ kind: 'history', r })} aria-label="Audit history" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pagination page={page} pageSize={size} total={rows.length} onPage={(p) => { setPage(p); setSel([]) }} onPageSize={(n) => { setSize(n); reset() }} noun="records" />
          </Panel>
        </>
      ) : (
        <Panel pad={false} title="Import batches">
          <TableWrap empty={!batches.length}>
            <thead className="bg-slate-50">
              <tr>
                {['Batch', 'File', 'Imported', 'Rows', 'Accepted', 'Rejected', 'Errors', ''].map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className={TR}>
                  <td className={`${TD} font-semibold`}>{b.id}</td>
                  <td className={TD}>{b.fileName}</td>
                  <td className={TD}>
                    {b.by}
                    <div className="text-[11px] text-muted">{dt(b.at)}</div>
                  </td>
                  <td className={TD}>{b.total}</td>
                  <td className={`${TD} text-emerald-700`}>{b.accepted}</td>
                  <td className={`${TD} ${b.rejected ? 'text-red-600' : ''}`}>{b.rejected}</td>
                  <td className={`${TD} max-w-[340px] text-[11px] whitespace-normal text-muted`}>{b.errors.join(' · ') || '—'}</td>
                  <td className={TD}>
                    <Button size="sm" variant="secondary" onClick={() => { setBatch(b.id); setTab('records'); reset() }}>
                      View rows
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Panel>
      )}
      <RoleTableCard modules={['Transaction Data']} />
      {dialog?.kind === 'edit' && <EditModal r={dialog.r} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'return' && <ReturnModal r={dialog.r} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'history' && <HistoryModal r={dialog.r} onClose={() => setDialog(null)} />}
    </OpsPage>
  )
}

function EditModal({ r, onClose }: { r: TxnRecord; onClose: () => void }) {
  const [f, setF] = useState<TxnInput>({ atmOrSite: r.atmId, txnDate: r.txnDate, txnCount: String(r.txnCount), amount: String(r.amount), withdrawalCount: String(r.withdrawalCount), depositCount: String(r.depositCount), sourceRef: r.sourceRef })
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: keyof TxnInput) => (v: string) => setF((p) => ({ ...p, [k]: v }))
  const save = async () => {
    const res = await editTxnAsync(r.id, f, reason)
    if (res.error) return setErrors(res.error)
    toast(`${r.id} updated${r.verification === 'Verified' ? ' — sent back for re-verification' : ''}`)
    onClose()
  }
  return (
    <Modal title={`Edit ${r.id}`} sub={`${r.atmId} · ${r.franchiseName}`} onClose={onClose} width={620} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save changes</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Transaction date" type="date" value={f.txnDate} onChange={(e) => set('txnDate')(e.target.value)} error={errors.txnDate} />
        <TextField label="Transaction count" type="number" value={f.txnCount} onChange={(e) => set('txnCount')(e.target.value)} error={errors.txnCount} />
        <TextField label="Withdrawal count" type="number" value={f.withdrawalCount} onChange={(e) => set('withdrawalCount')(e.target.value)} error={errors.withdrawalCount} />
        <TextField label="Deposit count" type="number" value={f.depositCount} onChange={(e) => set('depositCount')(e.target.value)} error={errors.depositCount} />
        <TextField label="Amount (₹)" type="number" value={f.amount} onChange={(e) => set('amount')(e.target.value)} error={errors.amount} />
        <TextField label="Source file / reference" value={f.sourceRef} onChange={(e) => set('sourceRef')(e.target.value)} error={errors.sourceRef} />
        <TextAreaField className="sm:col-span-2" label="Modification reason" required value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} />
      </div>
      {r.verification === 'Verified' && (
        <div className="mt-3">
          <Note tone="amber">This record is verified. Editing keeps the old value in the audit history and sends it back for verification.</Note>
        </div>
      )}
      {errors.form && (
        <div className="mt-3">
          <Note tone="red">{errors.form}</Note>
        </div>
      )}
    </Modal>
  )
}

function ReturnModal({ r, onClose }: { r: TxnRecord; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const save = async () => {
    const e = await returnTxnAsync(r.id, reason)
    if (e) return setErr(e)
    toast(`${r.id} returned for correction`)
    onClose()
  }
  return (
    <Modal title={`Return ${r.id}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Return</Button></>}>
      <TextAreaField label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
      {err && (
        <div className="mt-2">
          <Note tone="red">{err}</Note>
        </div>
      )}
    </Modal>
  )
}

function HistoryModal({ r: initial, onClose }: { r: TxnRecord; onClose: () => void }) {
  // API mode: list rows omit history / versions — fetch the full record.
  const [r, setR] = useState(initial)
  useEffect(() => {
    if (apiEnabled) void fetchTxnDetail(initial.id).then((x) => x && setR(x)).catch(() => undefined)
  }, [initial.id])
  return (
    <Modal title={`Audit history · ${r.id}`} sub={`${r.atmId} · ${dmy(r.txnDate)}`} onClose={onClose} width={680}>
      <div className="space-y-4">
        <KV cols={3} items={[['Created by', `${r.trail.createdBy} · ${dt(r.trail.createdAt)}`], ['Mode', r.entryMode], ['Import batch', r.importBatch ?? '—'], ['Verification', r.verification], ['Verified by', r.verifiedBy ? `${r.verifiedBy} · ${dt(r.verifiedAt)}` : '—'], ['Return reason', r.returnReason ?? '—']]} />
        {r.trail.modifications.length > 0 && (
          <Panel title="Modifications (old → new)" pad={false}>
            <TableWrap>
              <thead className="bg-slate-50">
                <tr>
                  {['When', 'By', 'Field', 'Old', 'New', 'Reason'].map((h) => (
                    <th key={h} className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.trail.modifications.map((m, i) => (
                  <tr key={`${m.at}-${i}`} className={TR}>
                    <td className={TD}>{dt(m.at)}</td>
                    <td className={TD}>{m.by}</td>
                    <td className={TD}>{m.field}</td>
                    <td className={TD}>{m.oldValue}</td>
                    <td className={TD}>{m.newValue}</td>
                    <td className={`${TD} whitespace-normal`}>{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Panel>
        )}
        <Timeline items={r.history} />
      </div>
    </Modal>
  )
}
