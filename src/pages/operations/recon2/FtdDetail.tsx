import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, CheckCircle2, Mail, MessageSquare, Pencil, Send, ShieldAlert, Undo2, XCircle } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { useHierarchy, useWorkflow } from '@/data/workflow'
import {
  FTD_EDITABLE, FTD_OUTCOMES, FTD_STEPS, RESPONSE_FROM,
  addFtdFollowUp, addFtdResponseAsync, approveFtdAsync, closeFtdAsync, completeFtdFollowUp, ftdStep, isOwnFtd, processFtdAsync, refreshFtd, rejectFtdAsync, resolveFtdAsync, returnFtdAsync,
  sendFtdToBankAsync, submitFtdAsync, useFailedTxnDisputes, useFtdLoad, verifyFtdAsync,
  type ResponseFrom,
} from '@/data/failedTxnDisputes'
import { apiEnabled } from '@/data/opsApi'
import { canApprove, canCrmAct, useOpsUser } from './opsAccess'
import { sourceLabel, sourceRecordsFor } from './atmDirectory'
import { ActingAs, AuditPanel, FilePick, Info, LoadBanner, ReasonBox, Timeline } from './shared'
import { fmtDt, rupees, uploadPicked, useNow, type PickedFile } from './util'

export function Stepper({ steps, current, done }: { steps: readonly string[]; current: number; done?: boolean }) {
  return (
    <ol className="flex flex-wrap gap-y-2">
      {steps.map((s, i) => {
        const state = i < current || (done && i === current) ? 'done' : i === current ? 'now' : 'todo'
        return (
          <li key={s} className="flex items-center">
            <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', state === 'done' ? 'bg-emerald-50 text-emerald-700' : state === 'now' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500')}>
              {state === 'done' ? <Check size={12} /> : <span className="grid h-4 w-4 place-items-center rounded-full bg-white/25 text-[10px]">{i + 1}</span>}
              {s}
            </span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-3 bg-line" />}
          </li>
        )
      })}
    </ol>
  )
}

export default function FtdDetail({ id }: { id: string }) {
  const list = useFailedTxnDisputes()
  const load = useFtdLoad()
  const wf = useWorkflow()
  const h = useHierarchy()
  const u = useOpsUser()
  const now = useNow(60_000)
  const r = list.find((x) => x.id === id)
  const [reason, setReason] = useState('')
  const [respFrom, setRespFrom] = useState<ResponseFrom>('Bank')
  const [respText, setRespText] = useState('')
  const [respFile, setRespFile] = useState<PickedFile | null>(null)
  const [procNote, setProcNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (apiEnabled) refreshFtd(id).catch(() => undefined)
  }, [id])
  const [fuNote, setFuNote] = useState('')
  const [fuDue, setFuDue] = useState('')
  const [fuOwner, setFuOwner] = useState('Kiran Rao')
  const [outcome, setOutcome] = useState('')
  const [resNote, setResNote] = useState('')
  const sources = useMemo(() => (r ? sourceRecordsFor(r.fundingModel, r.atmId, r.txnDate) : []), [r])

  if (!r) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <LoadBanner state={load} />
        <p className="text-[14px] text-muted">{load.loading ? `Loading ${id}…` : `Dispute ${id} not found.`}</p>
        <Link to="/operations/reconciliation/failed-txns" className="mt-3 inline-block text-primary hover:underline">Back to disputes</Link>
      </div>
    )
  }
  const own = isOwnFtd(r, u.name)
  const crm = canCrmAct(u)
  const admin = canApprove(u)
  const tasks = wf.tasks.filter((t) => t.refId === r.id)
  const emails = wf.emails.filter((m) => m.refId === r.id)
  const run = async (fn: () => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>, msg: string, after?: () => void) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fn()
      if (!res.ok) return toast(res.error ?? 'Action failed', 'error')
      toast(msg)
      after?.()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Action failed', 'error')
    } finally {
      setBusy(false)
    }
  }
  const sendResponse = async () => {
    const fileId = await uploadPicked(respFile, { entity: 'FailedTxnDispute', ref: r.id })
    return addFtdResponseAsync(r.id, respFrom, respText, respFile ? { name: respFile.name, fileId } : undefined)
  }
  const owners = h.employees.filter((e) => e.status === 'Active' && ['Operations', 'Administration'].includes(e.department))

  return (
    <div className="mx-auto max-w-[1280px] min-w-0 pb-12">
      <Link to="/operations/reconciliation/failed-txns" className="mb-3 inline-flex items-center gap-1 text-[12px] text-muted hover:text-primary"><ArrowLeft size={14} /> Failed transaction disputes</Link>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-ink">{r.id}</h1>
          <p className="text-[13px] text-muted">{r.atmId} · {r.franchiseName} · {rupees(r.amount)} · raised via {r.raisedVia} by {r.raisedBy}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={r.fundingModel === 'Self Funding' ? 'purple' : 'navy'}>{r.fundingModel}</Badge>
          <Badge tone={toneFor(r.status)}>{r.status}</Badge>
          {FTD_EDITABLE.includes(r.status) && (crm || own) && <Link to={`/operations/reconciliation/failed-txns/${r.id}/edit`}><Button size="sm" variant="secondary" icon={<Pencil size={13} />}>Edit</Button></Link>}
        </div>
      </div>
      <div className="mb-4"><ActingAs hint="Maker ≠ verifier ≠ approver" /></div>
      <Card className="mb-4 p-4"><Stepper steps={FTD_STEPS} current={ftdStep(r)} done={r.status === 'Closed'} /></Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 text-[13px] font-semibold">Transaction & customer</div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Info k="ATM ID">{r.atmId}</Info>
              <Info k="Site ID">{r.siteId}</Info>
              <Info k="Machine">{r.machineType}</Info>
              <Info k="Txn type">{r.txnType}</Info>
              <Info k="Txn ID">{r.txnId}</Info>
              <Info k="UTR">{r.utr}</Info>
              <Info k="RRN">{r.rrn}</Info>
              <Info k="Date / time">{r.txnDate} {r.txnTime}</Info>
              <Info k="Amount">{rupees(r.amount)}</Info>
              <Info k="Customer">{r.customerName}<div className="text-[11px] text-muted">{r.customerMobile}</div></Info>
              <Info k="Bank / IFSC">{r.bankName}<div className="text-[11px] text-muted">{r.ifscCode}</div></Info>
              <Info k="Account / card">{r.accountNo}<div className="text-[11px] text-muted">{r.cardDetails}</div></Info>
              <Info k="Branch">{r.branch}</Info>
              <Info k="Txn slip">{r.txnSlipName}</Info>
              <Info k="Recipient (email)" className="sm:col-span-2">{r.recipient.name}<div className="text-[11px] text-muted">{r.recipient.email}</div></Info>
              <Info k="Remarks" className="sm:col-span-4">{r.remarks}</Info>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-1 text-[13px] font-semibold">Source records (§11.3)</div>
            <p className="mb-3 text-[11.5px] text-muted">{r.fundingModel}: {sourceLabel(r.fundingModel)}</p>
            <div className="space-y-2">
              {apiEnabled && (
                <div className={cn('rounded-md border px-3 py-2 text-[12px]', r.cashSource ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50')}>
                  {r.cashSource ? <><b>{r.cashSource.kind}</b> <span className="text-muted">· {r.cashSource.refId}</span><div className="text-ink-2">{r.cashSource.atmId} · {r.cashSource.date} · {r.cashSource.status}</div></> : <>No CBR / Cash Loading / EOD record found for {r.atmId} on {r.txnDate}.</>}
                </div>
              )}
              {!apiEnabled && sources.map((s) => (
                <div key={s.source} className={cn('rounded-md border px-3 py-2 text-[12px]', s.found ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50')}>
                  <b>{s.source}</b> <span className="text-muted">· {s.ref}</span>
                  <div className="text-ink-2">{s.detail}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Workflow actions */}
          <Card className="p-4">
            <div className="mb-3 text-[13px] font-semibold">Actions</div>
            {(r.status === 'Draft' || r.status === 'Returned for Correction') && (
              <div className="space-y-2">
                {r.trail.returnReason && r.status === 'Returned for Correction' && <p className="rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">Returned by {r.trail.returnedBy}: {r.trail.returnReason}</p>}
                <Button size="sm" icon={<Send size={13} />} disabled={busy} onClick={() => run(() => submitFtdAsync(r.id), 'Submitted for CRM verification')}>Submit for CRM verification</Button>
              </div>
            )}
            {r.status === 'Pending Verification' && (
              crm ? (
                <div className="space-y-2">
                  {own && <p className="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700"><ShieldAlert size={14} /> Maker-checker: you raised / submitted this dispute — another CRM executive must verify it.</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" icon={<CheckCircle2 size={13} />} disabled={own} onClick={() => run(() => verifyFtdAsync(r.id), apiEnabled ? 'Verified — sent to Operations for processing' : 'Verified — sent for Admin approval')}>{apiEnabled ? 'Verify — send for processing' : 'Verify & submit for approval'}</Button>
                  </div>
                  <ReasonBox value={reason} onChange={setReason} placeholder="Return reason (mandatory to return)" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" icon={<Undo2 size={13} />} disabled={own || !reason.trim()} onClick={() => run(() => returnFtdAsync(r.id, reason), 'Returned for correction', () => setReason(''))}>Return for correction</Button>
                    {apiEnabled && <Button size="sm" variant="secondary" icon={<XCircle size={13} />} disabled={own || !reason.trim()} onClick={() => run(() => rejectFtdAsync(r.id, reason), 'Rejected', () => setReason(''))}>Reject</Button>}
                  </div>
                </div>
              ) : <p className="text-[12px] text-muted">Awaiting CRM Executive verification.</p>
            )}
            {r.status === 'Verified' && (
              crm ? (
                <div className="space-y-2">
                  <p className="text-[12px] text-muted">Verified by {r.trail.verifiedBy}. Operations checks the source record{r.cashSource ? ` (${r.cashSource.kind} ${r.cashSource.refId})` : ' / EJ'} and processes the dispute.</p>
                  <TextField label="Processing note (mandatory)" value={procNote} onChange={(e) => setProcNote(e.target.value)} />
                  <Button size="sm" icon={<CheckCircle2 size={13} />} disabled={busy || procNote.trim().length < 3} onClick={() => run(() => processFtdAsync(r.id, procNote), 'Processed — sent for Admin approval', () => setProcNote(''))}>Mark processed</Button>
                  <ReasonBox value={reason} onChange={setReason} placeholder="Reason (mandatory to return / reject)" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" icon={<Undo2 size={13} />} disabled={busy || !reason.trim()} onClick={() => run(() => returnFtdAsync(r.id, reason), 'Returned for correction', () => setReason(''))}>Return</Button>
                    <Button size="sm" variant="danger" icon={<XCircle size={13} />} disabled={busy || !reason.trim()} onClick={() => run(() => rejectFtdAsync(r.id, reason), 'Rejected', () => setReason(''))}>Reject</Button>
                  </div>
                </div>
              ) : <p className="text-[12px] text-muted">Awaiting Operations processing.</p>
            )}
            {r.status === 'Processed' && (
              admin ? (
                <div className="space-y-2">
                  {r.processed && <p className="text-[12px] text-muted">Processed by {r.processed.by}: {r.processed.note}</p>}
                  <Button size="sm" icon={<CheckCircle2 size={13} />} disabled={busy} onClick={() => run(() => approveFtdAsync(r.id), 'Approved — record locked')}>Approve</Button>
                  <ReasonBox value={reason} onChange={setReason} placeholder="Reason (mandatory to reject / return)" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" icon={<XCircle size={13} />} disabled={busy || !reason.trim()} onClick={() => run(() => rejectFtdAsync(r.id, reason), 'Rejected', () => setReason(''))}>Reject</Button>
                    <Button size="sm" variant="secondary" icon={<Undo2 size={13} />} disabled={busy || !reason.trim()} onClick={() => run(() => returnFtdAsync(r.id, reason), 'Returned for correction', () => setReason(''))}>Return</Button>
                  </div>
                </div>
              ) : <p className="text-[12px] text-muted">Awaiting Admin approval.</p>
            )}
            {apiEnabled && r.status === 'Approved' && (
              crm ? (
                <div className="space-y-2">
                  <p className="text-[12px] text-muted">Approved by {r.trail.approvedBy} — email the dispute to <b>{r.recipient.name || 'the bank'}</b> {r.recipient.email && `<${r.recipient.email}>`}.</p>
                  <Button size="sm" icon={<Mail size={13} />} disabled={busy || !r.recipient.email} onClick={() => run(() => sendFtdToBankAsync(r.id), `Sent to ${r.recipient.name}`)}>Send to bank</Button>
                  {!r.recipient.email && <p className="text-[11.5px] text-amber-700">No recipient email on the dispute — an Admin correction must add one.</p>}
                </div>
              ) : <p className="text-[12px] text-muted">Approved — awaiting dispatch to the bank.</p>
            )}
            {r.status === 'Pending Approval' && (
              admin ? (
                <div className="space-y-2">
                  {(own || r.trail.verifiedBy === u.name) && <p className="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700"><ShieldAlert size={14} /> Maker-checker: you raised or verified this dispute and cannot approve it.</p>}
                  <Button size="sm" icon={<Mail size={13} />} disabled={own || r.trail.verifiedBy === u.name} onClick={() => run(() => approveFtdAsync(r.id), `Approved — email sent to ${r.recipient.name}`)}>Approve & trigger email</Button>
                  <ReasonBox value={reason} onChange={setReason} placeholder="Reason (mandatory to reject / return)" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" icon={<XCircle size={13} />} disabled={own || !reason.trim()} onClick={() => run(() => rejectFtdAsync(r.id, reason), 'Rejected', () => setReason(''))}>Reject</Button>
                    <Button size="sm" variant="secondary" icon={<Undo2 size={13} />} disabled={own || !reason.trim()} onClick={() => run(() => returnFtdAsync(r.id, reason), 'Returned for correction', () => setReason(''))}>Return</Button>
                  </div>
                </div>
              ) : <p className="text-[12px] text-muted">Awaiting Admin approval.</p>
            )}
            {(apiEnabled ? r.status === 'Sent to Bank' : r.status === 'In Progress' || r.status === 'Approved') && crm && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-lg border border-line p-3">
                  <div className="flex items-center gap-1.5 text-[12.5px] font-semibold"><MessageSquare size={14} /> Bank / recipient response</div>
                  <SelectField label="From" options={RESPONSE_FROM} value={respFrom} onChange={(e) => setRespFrom(e.target.value as ResponseFrom)} />
                  <TextAreaField label="Response" value={respText} onChange={(e) => setRespText(e.target.value)} />
                  <div className="flex items-center gap-2"><FilePick label={respFile ? 'Replace attachment' : 'Attach reply'} onPick={(f) => setRespFile(f[0])} />{respFile && <span className="truncate text-[11px] text-muted">{respFile.name}</span>}</div>
                  <Button size="sm" disabled={busy} onClick={() => run(sendResponse, 'Response recorded', () => { setRespText(''); setRespFile(null) })}>Record response</Button>
                </div>
                {!apiEnabled && <div className="space-y-2 rounded-lg border border-line p-3">
                  <div className="text-[12.5px] font-semibold">Follow-up task</div>
                  <TextField label="Follow-up action" value={fuNote} onChange={(e) => setFuNote(e.target.value)} />
                  <TextField label="Due" type="datetime-local" value={fuDue} onChange={(e) => setFuDue(e.target.value)} />
                  <SelectField label="Owner" options={owners.map((o) => o.name)} value={fuOwner} onChange={(e) => setFuOwner(e.target.value)} />
                  <Button size="sm" onClick={() => run(() => addFtdFollowUp(r.id, fuNote, fuDue, owners.find((o) => o.name === fuOwner)?.id ?? 'EMP-005', fuOwner), 'Follow-up task created', () => { setFuNote(''); setFuDue('') })}>Create task</Button>
                </div>}
                <div className="space-y-2 rounded-lg border border-line p-3 md:col-span-2">
                  <div className="text-[12.5px] font-semibold">Resolution</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <SelectField label="Outcome" options={FTD_OUTCOMES} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
                    <TextField label="Note / reference" value={resNote} onChange={(e) => setResNote(e.target.value)} />
                  </div>
                  <Button size="sm" icon={<CheckCircle2 size={13} />} disabled={busy} onClick={() => run(() => resolveFtdAsync(r.id, outcome, resNote), 'Dispute resolved')}>Mark resolved</Button>
                </div>
              </div>
            )}
            {(r.status === 'Resolved' || r.status === 'Rejected') && (
              <div className="space-y-2">
                {r.resolution && <p className="rounded-md bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">Resolution: <b>{r.resolution.outcome}</b> {r.resolution.note && `— ${r.resolution.note}`} · {r.resolution.by}, {fmtDt(r.resolution.at)}</p>}
                {(crm || admin) && <Button size="sm" disabled={busy} onClick={() => run(() => closeFtdAsync(r.id), 'Dispute closed')}>Close dispute</Button>}
              </div>
            )}
            {r.status === 'Closed' && <p className="text-[12px] text-emerald-700">Closed{r.resolution ? ` — ${r.resolution.outcome}` : ''}.</p>}
          </Card>

          {(r.responses.length > 0 || r.followUps.length > 0) && (
            <Card className="p-4">
              <div className="mb-3 text-[13px] font-semibold">Responses & follow-ups</div>
              <div className="space-y-2">
                {r.responses.map((x) => (
                  <div key={x.id} className="rounded-md border border-line px-3 py-2 text-[12px]">
                    <b>{x.from}</b> · {fmtDt(x.at)} · recorded by {x.by}
                    <div className="text-ink-2">{x.text}</div>
                    {x.attachment && <div className="text-[11px] text-muted">Attachment: {x.attachment}</div>}
                  </div>
                ))}
                {r.followUps.map((f) => {
                  const overdue = !f.done && new Date(f.dueAt).getTime() < now
                  return (
                    <div key={f.id} className={cn('flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-[12px]', overdue ? 'border-red-200 bg-red-50/50' : 'border-line')}>
                      <span className="font-semibold">{f.id}</span> {f.note}
                      <span className="text-muted">→ {f.owner} · due {fmtDt(f.dueAt)} {f.taskId && `· ${f.taskId}`}</span>
                      <Badge tone={f.done ? 'green' : overdue ? 'red' : 'amber'}>{f.done ? 'Done' : overdue ? 'Overdue' : 'Open'}</Badge>
                      {!f.done && crm && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => completeFtdFollowUp(r.id, f.id)}>Mark done</Button>}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 text-[13px] font-semibold">History</div>
            <Timeline items={[...r.history].reverse()} />
          </Card>
          <Card className="p-4">
            <div className="mb-3 text-[13px] font-semibold">Emails & tasks</div>
            <div className="space-y-2 text-[12px]">
              {(r.emailsSent ?? []).map((m, i) => (
                <div key={`${m.at}-${i}`} className="rounded-md bg-surface px-2.5 py-1.5"><Mail size={12} className="mr-1 inline text-primary" />{m.subject}<div className="text-[11px] text-muted">→ {m.to.join(', ')} · {fmtDt(m.at)} · {m.ok ? 'Sent' : 'Failed'}</div></div>
              ))}
              {emails.map((m) => (
                <div key={m.id} className="rounded-md bg-surface px-2.5 py-1.5"><Mail size={12} className="mr-1 inline text-primary" />{m.subject}<div className="text-[11px] text-muted">{m.templateCode} v{m.templateVersion} → {m.to.join(', ') || '—'} · {m.status}</div></div>
              ))}
              {tasks.map((t) => (
                <div key={t.id} className="rounded-md border border-line px-2.5 py-1.5">{t.title}<div className="text-[11px] text-muted">{t.id} · {t.assignedTo} · due {fmtDt(t.dueAt)} · <b>{t.status}</b></div></div>
              ))}
              {!emails.length && !tasks.length && !(r.emailsSent ?? []).length && <p className="text-muted">{apiEnabled ? 'No emails sent for this dispute yet (workflow tasks are in Task Management).' : 'No workflow emails / tasks logged in this browser yet.'}</p>}
            </div>
          </Card>
          <Card className="p-4">
            <div className="mb-3 text-[13px] font-semibold">Audit (§18)</div>
            <AuditPanel trail={r.trail} />
          </Card>
        </div>
      </div>
    </div>
  )
}
