// /finance/payouts/monthly/:batchId — batch detail: all line components, approval trail,
// adjustment entries (§16.1), release / UTR, downloads.
import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ClipboardList, Download, FileDown, History, PauseCircle, PlayCircle, Plus, Send, Table2, X } from 'lucide-react'
import { can, useRole } from '@/lib/rbac'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { DEDUCTION_LABELS, ZERO_DED, toPaise, usePayout, type Deductions } from '@/data/payout'
import { PayoutPage } from '../PayoutShell'
import {
  PRE_APPROVAL, VERTICAL_LABEL, actor, addAdjustment, adjOf, amt, approvalBlock, approvedLike, batchAdj, buildRecon, decideAdjustment, downloadOriginal, effNet, exportBatch, extStore, fmtDate, fmtDateTime,
  holdBatch, isOwnAdjustment, monthLabel, setStatus, unholdBatch, useExt, type Adjustment,
} from './lib'
import { apiEnabled } from '@/lib/api'
import { KV, Panel, SectionBar, tbodyRow, tdCls, thCls, theadRow } from './ui'
import { ReleasePanel } from './ReleasePanel'

const DED_KEYS = Object.keys(DEDUCTION_LABELS) as (keyof Deductions)[]

export default function BatchDetail() {
  useRole()
  const { batchId } = useParams()
  const state = usePayout()
  const ext = useExt()
  const batch = state.batches.find((b) => b.id === batchId)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [modal, setModal] = useState<null | 'reject' | 'hold' | 'adjust'>(null)
  const [reason, setReason] = useState('')
  const [adjLine, setAdjLine] = useState('')
  const [adjAmt, setAdjAmt] = useState('')
  const [adjKind, setAdjKind] = useState<Adjustment['kind']>('Adjustment')
  const [adjReject, setAdjReject] = useState<{ a: Adjustment; remark: string; error: string } | null>(null)
  const [adjBusy, setAdjBusy] = useState(false)
  const decide = async (a: Adjustment, decision: 'Approved' | 'Rejected', remark?: string) => {
    if (!batch) return
    if (decision === 'Rejected' && !remark?.trim()) return setAdjReject({ a, remark: remark ?? '', error: 'A remark is required to reject.' })
    setAdjBusy(true)
    const ok = await decideAdjustment(batch, a, decision, remark)
    setAdjBusy(false)
    if (ok) {
      setAdjReject(null)
      toast(`${a.kind} ${a.id} ${decision.toLowerCase()}`)
    }
  }
  const close = useCallback(() => {
    setModal(null)
    setReason('')
    setAdjAmt('')
  }, [])
  const unresolved = useMemo(() => (batch && batch.type === 'Auto Reconciliation' ? buildRecon(state, ext, batch).filter((r) => r.critical).length : 0), [state, ext, batch])

  if (!batch)
    return (
      <PayoutPage title="Payout batch" crumbs={['Monthly Payout', 'Not found']}>
        <Panel>
          <p className="text-[13px]">Batch not found.</p>
          <Link to="/finance/payouts/monthly" className="text-[12px] font-semibold text-[#0066FF]">Back to Monthly Payout</Link>
        </Panel>
      </PayoutPage>
    )

  const lines = state.lines.filter((l) => l.batchId === batch.id)
  const rows = lines.slice((page - 1) * size, page * size)
  const file = ext.files[batch.id]
  const meta = ext.meta[batch.id]
  const trail = ext.trail.filter((t) => t.batchId === batch.id)
  const adjs = ext.adjustments.filter((a) => a.batchId === batch.id)
  const adjTotal = batchAdj(batch.id, ext.adjustments)
  const block = approvalBlock(batch, can('Approve'), unresolved)
  const afterApproval = approvedLike(batch.status) || (batch.status === 'On Hold' && approvedLike(meta?.holdFrom ?? 'Draft'))
  const mode = batch.type === 'Manual Payout' ? 'manual' : batch.type === 'File-Based Payout' ? 'file' : 'auto'

  const approve = () => {
    if (block) return toast(block, 'error')
    setStatus(batch, 'Approved', 'Approved', `${lines.length} line(s)`, { checker: actor() })
    toast(`${batch.name} approved`)
  }
  const submit = () => {
    if (!can('Create') && !can('Edit')) return toast('Your role cannot submit batches.', 'error')
    if (!lines.length) return toast('No lines to submit yet.', 'error')
    setStatus(batch, 'Pending Approval', 'Submitted for approval')
    toast(`${batch.name} submitted`)
  }
  const confirmModal = () => {
    if (modal === 'adjust') {
      const line = lines.find((l) => l.id === adjLine)
      if (!line) return toast('Select the ATM line.', 'error')
      if (adjKind === 'Adjustment' && !adjAmt) return toast('Enter the corrected net amount.', 'error')
      if (reason.trim().length < 5) return toast('Reason is required (min 5 characters).', 'error')
      const after = adjKind === 'Reversal' ? 0 : toPaise(adjAmt)
      if (after === effNet(line, ext.adjustments)) return toast('Amount is unchanged.', 'error')
      if (ext.adjustments.some((a) => a.lineId === line.id && a.status === 'Pending')) return toast('This line already has an adjustment awaiting approval.', 'error')
      addAdjustment(batch, line, after, reason.trim(), adjKind)
      toast(apiEnabled ? `${adjKind} requested for ${line.atmId} — a different checker must approve it` : `${adjKind} entry recorded for ${line.atmId}`)
    } else {
      if (reason.trim().length < 5) return toast('Reason is required (min 5 characters).', 'error')
      if (modal === 'reject') {
        setStatus(batch, 'Rejected', 'Rejected', reason.trim(), { checker: actor() })
        toast(`${batch.name} rejected`)
      } else if (modal === 'hold') {
        holdBatch(batch, reason.trim())
        toast(`${batch.name} put on hold`)
      }
    }
    close()
  }

  return (
    <PayoutPage
      title={batch.name}
      sub={`${batch.type} · ${monthLabel(batch.month)} · FY ${batch.fy} · ${VERTICAL_LABEL[batch.vertical]}`}
      crumbs={['Monthly Payout', batch.name]}
      actions={
        <>
          <Link to={`/finance/payouts/monthly?mode=${mode}`} className="inline-flex h-[38px] items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface">
            <ArrowLeft size={14} /> Monthly Payout
          </Link>
          <Button variant="secondary" icon={<Download size={14} />} disabled={!can('Download') && !can('Export')} onClick={() => exportBatch(batch, extStore.get())}>Download lines</Button>
          {file?.stored && (
            <Button variant="secondary" icon={<FileDown size={14} />} onClick={() => (downloadOriginal(batch.id) ? undefined : toast('Original file not available in this browser.', 'error'))}>Original file</Button>
          )}
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Panel>
          <SectionBar icon={<ClipboardList size={15} />} title="Batch summary" right={<Badge tone={approvedLike(batch.status) ? 'green' : toneFor(batch.status)}>{batch.status}</Badge>} />
          <div className="grid gap-x-6 px-1 sm:grid-cols-2">
            <div>
              <KV k="Records" v={batch.records.toLocaleString('en-IN')} />
              <KV k="Gross payout" v={`₹${amt(batch.gross)}`} />
              <KV k="GST" v={`₹${amt(batch.gst)}`} />
              <KV k="TDS" v={`₹${amt(batch.tds)}`} />
              <KV k="Net payout" v={`₹${amt(batch.net)}`} />
              <KV k="Adjustments" v={<span className={adjTotal ? 'font-semibold text-amber-700' : ''}>₹{amt(adjTotal)}</span>} />
              <KV k="Net after adj." v={<b>₹{amt(batch.net + adjTotal)}</b>} />
            </div>
            <div>
              <KV k="Maker" v={`${batch.maker} · ${fmtDateTime(batch.createdAt)}`} />
              <KV k="Checker" v={batch.checker ?? '—'} />
              <KV k="Payment date" v={fmtDate(batch.paymentDate)} />
              <KV k="Payment mode" v={batch.paymentMode ?? '—'} />
              <KV k="Bank account" v={batch.bankAccount ?? '—'} />
              <KV k="Site category" v={meta?.siteCategory ?? 'All'} />
              <KV k="Beneficiary" v={meta?.beneficiary ?? 'Franchisee'} />
            </div>
          </div>
          {batch.remarks && <p className="px-1 text-[12px] text-ink-2">Remarks: {batch.remarks}</p>}
          <div className="flex flex-wrap gap-2 border-t border-line-soft pt-3">
            {(batch.status === 'Draft' || batch.status === 'Uploaded' || batch.status === 'Validated') && (
              <Button size="sm" icon={<Send size={13} />} onClick={submit}>Submit for approval</Button>
            )}
            {PRE_APPROVAL.includes(batch.status) && (
              <>
                <Button size="sm" variant="bright" icon={<Check size={13} />} disabled={!!block} title={block ?? undefined} onClick={approve}>Approve</Button>
                <Button size="sm" variant="danger" icon={<X size={13} />} disabled={!(can('Approve') || can('Reject')) || batch.maker === actor()} onClick={() => setModal('reject')}>Reject</Button>
              </>
            )}
            {batch.status === 'On Hold' ? (
              <Button size="sm" variant="secondary" icon={<PlayCircle size={13} />} disabled={!can('Approve')} onClick={() => { unholdBatch(batch); toast('Hold released') }}>Release hold</Button>
            ) : (
              batch.status !== 'Completed' && batch.status !== 'Rejected' && <Button size="sm" variant="secondary" icon={<PauseCircle size={13} />} disabled={!can('Edit')} onClick={() => setModal('hold')}>Hold</Button>
            )}
            {batch.status !== 'Rejected' && (
              <Button size="sm" variant="secondary" icon={<Plus size={13} />} disabled={!can('Edit') || !lines.length} onClick={() => { setAdjLine(lines[0]?.id ?? ''); setModal('adjust') }}>Adjustment entry</Button>
            )}
          </div>
          {block && PRE_APPROVAL.includes(batch.status) && <p className="px-1 text-[11.5px] text-red-600">Approval: {block}</p>}
          {batch.type === 'Auto Reconciliation' && unresolved > 0 && (
            <Link to="/finance/payouts/monthly?mode=auto" className="px-1 text-[11.5px] font-semibold text-[#0066FF]">Resolve {unresolved} mismatch(es) in Auto Reconciliation</Link>
          )}
        </Panel>

        <Panel>
          <SectionBar icon={<History size={15} />} title="Approval trail" />
          <ol className="max-h-[330px] space-y-2 overflow-y-auto px-1">
            {trail.map((t) => (
              <li key={t.id} className="border-l-2 border-primary/30 pl-3 text-[12px]">
                <div className="font-semibold">{t.action}</div>
                <div className="text-[11px] text-muted">{fmtDateTime(t.at)} · {t.by}</div>
                {t.note && <div className="text-[11.5px] text-ink-2">{t.note}</div>}
              </li>
            ))}
            {!trail.some((t) => t.action === 'Created' || t.action.startsWith('Draft') || t.action === 'Submitted for approval') && (
              <li className="border-l-2 border-primary/30 pl-3 text-[12px]">
                <div className="font-semibold">Created</div>
                <div className="text-[11px] text-muted">{fmtDateTime(batch.createdAt)} · {batch.maker}</div>
              </li>
            )}
            {batch.checker && !trail.some((t) => t.action === 'Approved' || t.action === 'Rejected') && (
              <li className="border-l-2 border-emerald-400 pl-3 text-[12px]">
                <div className="font-semibold">Checked</div>
                <div className="text-[11px] text-muted">{batch.checker}</div>
              </li>
            )}
          </ol>
        </Panel>
      </div>

      {file && (
        <Panel>
          <SectionBar icon={<FileDown size={15} />} title="Source file" right={<Badge tone={file.status === 'Extracted' ? 'green' : file.status === 'Failed' ? 'red' : 'amber'}>{file.status}</Badge>} />
          <div className="grid gap-x-6 px-1 sm:grid-cols-3">
            <KV k="File name" v={file.name} />
            <KV k="File type" v={file.type} />
            <KV k="Size" v={`${file.sizeKb.toLocaleString('en-IN')} KB`} />
            <KV k="Area option" v={file.kind} />
            <KV k="Uploaded" v={fmtDateTime(file.uploadedAt)} />
            <KV k="Uploaded by" v={file.uploadedBy} />
          </div>
          {file.note && <p className="rounded-md bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800">{file.note}</p>}
          {file.issues.length > 0 && (
            <p className="px-1 text-[11.5px] text-ink-2">
              Validation: {Object.entries(file.issues.reduce<Record<string, number>>((m, i) => ({ ...m, [i.kind]: (m[i.kind] ?? 0) + 1 }), {})).map(([k, n]) => `${k} ${n}`).join(' · ')}
            </p>
          )}
        </Panel>
      )}

      <Panel>
        <SectionBar icon={<Table2 size={15} />} title="Payout lines" right={<span className="text-[11px] text-muted">All amounts ₹ · approved lines are never edited</span>} />
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[2600px] border-collapse">
              <thead>
                <tr className={theadRow}>
                  {['S.N.', 'ATM ID', 'Site ID', 'Model', 'Franchisee', 'MF', 'Super MF', 'Plan', 'Cash', 'Non Cash', 'Post Cash', 'Post Non Cash', 'Deposit', 'MF Revenue', 'Gross Revenue', ...DED_KEYS.map((k) => DEDUCTION_LABELS[k]), 'Net Franchisee', 'FR Payout w/o TDS', 'TDS/GST %', 'TDS/GST Amt', 'Net Payout', 'Adjustment', 'Net after Adj.', 'PAN', 'UTR', 'Override'].map((h) => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((l, i) => {
                  const d = { ...ZERO_DED, ...l.ded }
                  const nf = l.gross - d.fixedFee - d.iciciSr - d.ntPenalty - d.alf - d.recovery + d.negativeFixedFee + d.waiver
                  const adj = adjOf(l.id, ext.adjustments)
                  const flags = ext.lineMeta[l.id]?.flags ?? []
                  return (
                    <tr key={l.id} className={tbodyRow}>
                      <td className={tdCls}>{(page - 1) * size + i + 1}</td>
                      <td className={`${tdCls} font-semibold whitespace-nowrap`}>
                        {l.atmId}
                        {flags.map((f) => <Badge key={f} tone="red" dot={false} className="ml-1">{f}</Badge>)}
                      </td>
                      <td className={tdCls}>{l.siteId}</td>
                      <td className={`${tdCls} whitespace-nowrap`}>{l.model}</td>
                      <td className={`${tdCls} text-left whitespace-nowrap`}>{l.frName}</td>
                      <td className={`${tdCls} text-left whitespace-nowrap`}>{l.mfName}</td>
                      <td className={`${tdCls} text-left whitespace-nowrap`}>{l.smfName}</td>
                      <td className={tdCls}>{l.planCode ?? '—'}</td>
                      <td className={tdCls}>{l.txn.cash}</td>
                      <td className={tdCls}>{l.txn.nonCash}</td>
                      <td className={tdCls}>{l.txn.postCash}</td>
                      <td className={tdCls}>{l.txn.postNonCash}</td>
                      <td className={tdCls}>{l.txn.deposit}</td>
                      <td className={`${tdCls} text-right tabular-nums`}>{amt(l.mfRevenue)}</td>
                      <td className={`${tdCls} text-right tabular-nums`}>{amt(l.gross)}</td>
                      {DED_KEYS.map((k) => <td key={k} className={`${tdCls} text-right tabular-nums`}>{amt(d[k])}</td>)}
                      <td className={`${tdCls} text-right tabular-nums`}>{amt(nf)}</td>
                      <td className={`${tdCls} text-right tabular-nums`}>{amt(l.withoutTds)}</td>
                      <td className={tdCls}>{l.taxPct}%</td>
                      <td className={`${tdCls} text-right tabular-nums`}>{amt(l.taxAmt)}</td>
                      <td className={`${tdCls} text-right font-semibold tabular-nums`}>{amt(l.net)}</td>
                      <td className={`${tdCls} text-right tabular-nums ${adj ? 'text-amber-700' : ''}`}>{amt(adj)}</td>
                      <td className={`${tdCls} text-right font-semibold tabular-nums`}>{amt(l.net + adj)}</td>
                      <td className={`${tdCls} font-mono text-[11px]`}>{l.pan || '—'}</td>
                      <td className={`${tdCls} font-mono text-[11px]`}>{ext.release[l.id]?.utr ?? l.utr ?? '—'}</td>
                      <td className={tdCls}>{l.overriddenBy ? <Badge tone="amber">{l.overriddenBy}</Badge> : '—'}</td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={40} className="py-6 text-center text-[12px] text-muted">{file?.status === 'Processing' ? 'Waiting for server-side PDF extraction.' : 'No lines.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={size} total={lines.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1) }} noun="lines" />
        </div>
      </Panel>

      <Panel>
        <SectionBar
          icon={<ClipboardList size={15} />}
          title="Adjustment entries"
          right={<span className="text-[11px] text-muted">{apiEnabled ? 'Pending entries count only after a different checker approves (lines with a pending entry are not released)' : 'Corrections never overwrite the batch (§16.1)'}</span>}
        />
        {adjs.length === 0 ? (
          <p className="px-1 text-[12px] text-muted">No adjustment entries.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full border-collapse">
              <thead>
                <tr className={theadRow}>
                  {['Date', 'ATM ID', 'Type', 'Before (₹)', 'After (₹)', 'Delta (₹)', 'Reason', 'By', 'Status', 'Decision'].map((h) => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {adjs.map((a) => (
                  <tr key={a.id} className={tbodyRow}>
                    <td className={tdCls}>{fmtDateTime(a.at)}</td>
                    <td className={`${tdCls} font-semibold`}>{a.atmId}</td>
                    <td className={tdCls}><Badge tone={a.kind === 'Reversal' ? 'red' : 'amber'}>{a.kind}</Badge></td>
                    <td className={`${tdCls} text-right tabular-nums`}>{amt(a.before)}</td>
                    <td className={`${tdCls} text-right tabular-nums`}>{amt(a.after)}</td>
                    <td className={`${tdCls} text-right font-semibold tabular-nums ${a.delta < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{amt(a.delta)}</td>
                    <td className={`${tdCls} text-left`}>{a.reason}</td>
                    <td className={tdCls}>{a.by}</td>
                    <td className={tdCls}><Badge tone={a.status === 'Pending' ? 'amber' : a.status === 'Rejected' ? 'red' : 'green'}>{a.status ?? 'Applied'}</Badge></td>
                    <td className={`${tdCls} text-left`}>
                      {a.status === 'Pending' ? (
                        isOwnAdjustment(a) ? (
                          <span className="text-[11px] text-muted">Your request — another checker decides</span>
                        ) : can('Approve') ? (
                          <span className="inline-flex gap-1.5">
                            <Button size="sm" variant="bright" icon={<Check size={12} />} disabled={adjBusy} onClick={() => void decide(a, 'Approved')}>Approve</Button>
                            <Button size="sm" variant="danger" icon={<X size={12} />} disabled={adjBusy} onClick={() => setAdjReject({ a, remark: '', error: '' })}>Reject</Button>
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted">Awaiting checker</span>
                        )
                      ) : a.decidedBy ? (
                        <span className="text-[11px]">{a.decidedBy}{a.decidedAt ? ` · ${fmtDateTime(a.decidedAt)}` : ''}{a.remark ? ` — ${a.remark}` : ''}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {afterApproval && <ReleasePanel batch={batch} />}

      {adjReject && (
        <Modal
          title={`Reject ${adjReject.a.kind.toLowerCase()} ${adjReject.a.id}`}
          sub={`${adjReject.a.atmId}: ₹${amt(adjReject.a.before)} → ₹${amt(adjReject.a.after)} — ${adjReject.a.reason}`}
          onClose={() => setAdjReject(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setAdjReject(null)}>Cancel</Button>
              <Button variant="danger" disabled={adjBusy} onClick={() => void decide(adjReject.a, 'Rejected', adjReject.remark)}>Reject</Button>
            </>
          }
        >
          <textarea aria-label="Rejection remark" value={adjReject.remark} maxLength={300} rows={3} onChange={(e) => setAdjReject({ ...adjReject, remark: e.target.value, error: '' })} placeholder="Remark (required)" className="w-full rounded-md border border-line p-2 text-[12px] outline-none focus:border-primary" />
          {adjReject.error && <p className="mt-1 text-[11.5px] text-red-600">{adjReject.error}</p>}
        </Modal>
      )}

      {modal && (
        <Modal
          title={modal === 'reject' ? 'Reject batch' : modal === 'hold' ? 'Hold payout' : 'Adjustment entry'}
          sub={modal === 'adjust' ? 'Records a traceable correction beside the line; the line itself stays as approved.' : batch.name}
          onClose={close}
          footer={
            <>
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button variant={modal === 'adjust' ? 'primary' : 'danger'} onClick={confirmModal}>{modal === 'reject' ? 'Reject' : modal === 'hold' ? 'Hold' : 'Record entry'}</Button>
            </>
          }
        >
          <div className="space-y-3 text-[12px]">
            {modal === 'adjust' && (
              <>
                <div>
                  <label htmlFor="adj-line" className="mb-1.5 block text-[11px] font-semibold">ATM line *</label>
                  <select id="adj-line" value={adjLine} onChange={(e) => setAdjLine(e.target.value)} className="h-9 w-full rounded-md border border-line bg-white px-2">
                    {lines.map((l) => <option key={l.id} value={l.id}>{l.atmId} · {l.frName} · net {amt(effNet(l, ext.adjustments))}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  {(['Adjustment', 'Reversal'] as const).map((k) => (
                    <label key={k} className="flex items-center gap-1.5">
                      <input type="radio" name="adjk" checked={adjKind === k} onChange={() => setAdjKind(k)} /> {k}
                    </label>
                  ))}
                </div>
                {adjKind === 'Adjustment' ? (
                  <input aria-label="Corrected net amount" inputMode="decimal" value={adjAmt} onChange={(e) => setAdjAmt(e.target.value.replace(/[^\d.-]/g, ''))} placeholder="Corrected net payable ₹" className="h-9 w-full rounded-md border border-line px-3" />
                ) : (
                  <p className="text-muted">Reversal brings the line's payable to ₹0.00 via an offsetting entry.</p>
                )}
              </>
            )}
            <textarea aria-label="Reason" value={reason} maxLength={250} rows={3} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" className="w-full rounded-md border border-line p-2 outline-none focus:border-primary" />
          </div>
        </Modal>
      )}
    </PayoutPage>
  )
}
