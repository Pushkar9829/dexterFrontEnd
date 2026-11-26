import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Bell, Bot, CheckCircle2, FileSearch, Mail, Send, ShieldAlert, Undo2 } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { useSchedules, useWorkflow, type FundingModel } from '@/data/workflow'
import {
  CB_OUTCOMES, CB_WORKFLOW, EVIDENCE_KINDS, EXTRACT_FIELDS, REPORT_DECISIONS, TXN_CONFIRMATIONS, submitCbEvidenceAsync,
  addCbFollowUpAsync, approveCbReportAsync, cbStage, cbStatus, cbStep, closeCbAsync, isCbOverdue, prepareCbReportAsync, refreshCb, rejectCbReviewAsync, reminderPlan, returnCbEvidenceAsync,
  submitCbToBankAsync, useCbLoad, useChargebacks, verifyCbDataAsync, verifyCbEvidenceAsync,
  type CbEditable, type CbFieldKey, type ChargeBackDisputeRecord,
} from '@/data/chargeBackDisputes'
import { apiEnabled } from '@/data/opsApi'
import { canApprove, canCrmAct, useOpsUser } from './opsAccess'
import { sourceLabel, sourceRecordsFor } from './atmDirectory'
import { ActingAs, AuditPanel, Countdown, FileChip, FilePick, Info, LoadBanner, ReasonBox, Timeline } from './shared'
import { fmtDt, rupees, uploadPicked, useNow, useReminderProcessor, type PickedFile } from './util'
import { Stepper } from './FtdDetail'

const FIELD_MAP: Partial<Record<CbFieldKey, keyof CbEditable>> = { atmId: 'atmId', rrn: 'rrn', amount: 'disputeAmount', txnDate: 'txnDate', reason: 'reason', cardNumber: 'cardNumber', caseRef: 'caseRef', txnTime: 'txnTime' }
const editableOf = (r: ChargeBackDisputeRecord): CbEditable => ({ atmId: r.atmId, rrn: r.rrn, txnAmount: r.txnAmount, disputeAmount: r.disputeAmount, txnDate: r.txnDate, txnTime: r.txnTime, reason: r.reason, cardNumber: r.cardNumber, caseRef: r.caseRef, txnType: r.txnType, fundingModel: r.fundingModel })

function DataVerification({ r, canEdit }: { r: ChargeBackDisputeRecord; canEdit: boolean }) {
  const [d, setD] = useState<CbEditable>(() => editableOf(r))
  const [reason, setReason] = useState('')
  const base = editableOf(r)
  const [busy, setBusy] = useState(false)
  const changed = (Object.keys(d) as (keyof CbEditable)[]).filter((k) => String(d[k]) !== String(base[k]))
  // API mode: verify-data may be repeated before the franchise evidence arrives — a reason is then mandatory
  const again = apiEnabled && !!r.dataVerified
  const save = async () => {
    setBusy(true)
    const res = await verifyCbDataAsync(r.id, Object.fromEntries(changed.map((k) => [k, d[k]])) as Partial<CbEditable>, reason).finally(() => setBusy(false))
    if (!res.ok) return toast(res.error, 'error')
    toast(r.dataVerified ? 'Modification saved with reason' : 'Data verified by CRM')
    setReason('')
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold"><Mail size={13} /> Email / file data ({r.intake.kind}{r.intake.fileName ? ` · ${r.intake.fileName}` : ''})</div>
        <pre className="max-h-72 overflow-auto rounded-md border border-line bg-surface p-3 text-[11.5px] whitespace-pre-wrap">{r.intake.raw || '—'}</pre>
      </div>
      <div className="min-w-0">
        <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold"><Bot size={13} /> AI extracted vs verified value</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="text-left text-muted">
              <tr><th className="py-1 pr-2 font-medium">Field</th><th className="py-1 pr-2 font-medium">AI extracted</th><th className="py-1 font-medium">Verified value</th></tr>
            </thead>
            <tbody>
              {EXTRACT_FIELDS.map((f) => {
                const key = FIELD_MAP[f.key]!
                const ai = r.extracted[f.key]
                const diff = key && String(d[key] ?? '') !== String(ai ?? '')
                return (
                  <tr key={f.key} className="border-t border-line/60">
                    <td className="py-1 pr-2 whitespace-nowrap">{f.label}{f.required && ' *'}</td>
                    <td className="py-1 pr-2">{ai ? <span className="text-emerald-700">{ai}</span> : <span className="text-red-600">not found</span>}</td>
                    <td className="py-1">
                      <input
                        aria-label={f.label}
                        disabled={!canEdit}
                        value={String(d[key] ?? '')}
                        onChange={(e) => setD((x) => ({ ...x, [key]: key === 'disputeAmount' ? Number(e.target.value.replace(/[^\d.]/g, '')) : key === 'atmId' ? e.target.value.toUpperCase() : e.target.value }))}
                        className={cn('h-7 w-full rounded border px-2 text-[12px] disabled:bg-surface', diff ? 'border-amber-400 bg-amber-50' : 'border-line')}
                      />
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t border-line/60">
                <td className="py-1 pr-2">Txn amount</td>
                <td className="py-1 pr-2 text-muted">—</td>
                <td className="py-1"><input aria-label="Txn amount" disabled={!canEdit} value={String(d.txnAmount)} onChange={(e) => setD((x) => ({ ...x, txnAmount: Number(e.target.value.replace(/[^\d.]/g, '')) }))} className="h-7 w-full rounded border border-line px-2 text-[12px] disabled:bg-surface" /></td>
              </tr>
              <tr className="border-t border-line/60">
                <td className="py-1 pr-2">Funding model</td>
                <td className="py-1 pr-2 text-muted">from ATM master</td>
                <td className="py-1">
                  <select aria-label="Funding model" disabled={!canEdit} value={d.fundingModel} onChange={(e) => setD((x) => ({ ...x, fundingModel: e.target.value as FundingModel }))} className="h-7 w-full rounded border border-line px-1 text-[12px] disabled:bg-surface">
                    {['Full Funding', 'Self Funding', 'Business Model', 'CRA'].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {canEdit && (
          <div className="mt-3 space-y-2">
            {(changed.length > 0 || again) && <ReasonBox value={reason} onChange={setReason} placeholder={changed.length ? `Reason for changing ${changed.join(', ')} (mandatory)` : 'Reason for verifying the data again (mandatory)'} />}
            <Button size="sm" icon={<CheckCircle2 size={13} />} disabled={busy || ((changed.length > 0 || again) && reason.trim().length < 3)} onClick={save}>
              {again ? (changed.length ? 'Modify & re-verify' : 'Re-verify data') : r.dataVerified ? 'Save modification' : changed.length ? 'Modify & verify' : 'Verify data'}
            </Button>
          </div>
        )}
        {r.dataVerified && <p className="mt-2 text-[11.5px] text-emerald-700">Verified by {r.dataVerified.by} · {fmtDt(r.dataVerified.at)}</p>}
      </div>
    </div>
  )
}

/** CRM staff submit the franchise response on its behalf (POST /:id/evidence with a mandatory onBehalfReason). */
function OnBehalfEvidence({ r }: { r: ChargeBackDisputeRecord }) {
  const [open, setOpen] = useState(false)
  const [txn, setTxn] = useState<string>(TXN_CONFIRMATIONS[0])
  const [eod, setEod] = useState('')
  const [remarks, setRemarks] = useState('')
  const [why, setWhy] = useState('')
  const [kind, setKind] = useState<string>(EVIDENCE_KINDS[0])
  const [files, setFiles] = useState<(PickedFile & { kind: string })[]>([])
  const [busy, setBusy] = useState(false)
  if (!open)
    return (
      <div className="mt-2">
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Submit evidence on behalf of the franchise
        </Button>
      </div>
    )
  const submit = async () => {
    if (why.trim().length < 3) return toast('Give the reason for submitting on behalf of the franchise', 'error')
    if (eod.trim().length < 2) return toast('EOD details are required', 'error')
    if (!files.some((f) => f.kind === 'Transaction confirmation' || f.kind === 'EOD details')) return toast('Add at least the transaction confirmation or EOD proof', 'error')
    setBusy(true)
    try {
      const up = await Promise.all(files.map(async (f) => ({ name: f.name, size: f.size, kind: f.kind, fileId: await uploadPicked(f, { purpose: 'chargeback-evidence', entity: 'ChargeBack', ref: r.id }) })))
      const res = await submitCbEvidenceAsync(r.id, { txnConfirmation: txn, eodDetails: eod.trim(), remarks: remarks.trim(), files: up }, r.franchiseName, { onBehalfReason: why.trim() })
      if (!res.ok) return toast(res.error, 'error')
      toast('Evidence submitted on behalf of the franchise')
      setOpen(false)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-3 space-y-2 rounded-md border border-line p-3">
      <div className="text-[12px] font-semibold">Evidence on behalf of {r.franchiseName}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <SelectField label="Transaction confirmation" required options={[...TXN_CONFIRMATIONS]} value={txn} onChange={(e) => e.target.value && setTxn(e.target.value)} />
        <TextField label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        <TextAreaField className="sm:col-span-2" label="EOD details" required rows={2} value={eod} onChange={(e) => setEod(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Evidence kind" value={kind} onChange={(e) => setKind(e.target.value)} className="h-8 rounded border border-line px-1 text-[12px]">
          {EVIDENCE_KINDS.map((k) => <option key={k}>{k}</option>)}
        </select>
        <FilePick label="Add file" multiple accept="image/*,.pdf,.mp4,video/mp4" onPick={(fs) => setFiles((x) => [...x, ...fs.map((f) => ({ ...f, kind }))])} />
        {files.map((f, i) => (
          <button key={`${f.name}-${i}`} type="button" title="Remove" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}>
            <FileChip name={f.name} sub={f.kind} />
          </button>
        ))}
      </div>
      <ReasonBox value={why} onChange={setWhy} placeholder="Why CRM submits on behalf of the franchise (mandatory)" />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => void submit()}>Submit evidence</Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  )
}

export default function CbDetail({ id }: { id: string }) {
  const list = useChargebacks()
  const load = useCbLoad()
  const schedules = useSchedules()
  const wf = useWorkflow()
  const u = useOpsUser()
  const now = useNow(1000)
  useReminderProcessor()
  const r = list.find((x) => x.id === id)
  const [checkNote, setCheckNote] = useState('')
  const [retReason, setRetReason] = useState('')
  const [decision, setDecision] = useState('')
  const [summary, setSummary] = useState('')
  const [fuNote, setFuNote] = useState('')
  const [fuStatus, setFuStatus] = useState('Under review')
  const [outcome, setOutcome] = useState('')
  const [closeNote, setCloseNote] = useState('')
  const [recovery, setRecovery] = useState('')
  const [channel, setChannel] = useState('NPCI DMS portal')
  const [reference, setReference] = useState('')
  const [apprNote, setApprNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (apiEnabled) refreshCb(id).catch(() => undefined)
  }, [id])
  const sources = useMemo(() => (r ? sourceRecordsFor(r.fundingModel, r.atmId, r.txnDate) : []), [r])
  const planNow = Math.floor(now / 30_000) * 30_000 // re-plan every 30 s, not every tick
  const plan = useMemo(() => (r ? reminderPlan(r, schedules, planNow) : []), [r, schedules, planNow])

  if (!r) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <LoadBanner state={load} />
        <p className="text-[14px] text-muted">{load.loading ? `Loading ${id}…` : `Chargeback ${id} not found.`}</p>
        <Link to="/operations/reconciliation/charge-back" className="mt-3 inline-block text-primary hover:underline">Back to chargebacks</Link>
      </div>
    )
  }
  const crm = canCrmAct(u)
  const admin = canApprove(u)
  const stage = cbStage(r)
  const overdue = isCbOverdue(r, now)
  const run = async (fn: () => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>, msg: string, after?: () => void) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fn()
      if (!res.ok) return toast(res.error ?? 'Action failed', 'error')
      toast(msg)
      after?.()
    } finally {
      setBusy(false)
    }
  }
  const st = r.apiStatus
  // API mode: Finance reviews (decision + recovery) once evidence is verified or the chargeback escalated without a response
  const canReview = apiEnabled ? (u.isFinance || admin) && (st === 'Evidence Verified' || st === 'Escalated') && !r.report : crm && !!r.evidenceCheck && !r.closure
  const against = r.fundingModel === 'Full Funding' ? 'CBR Master' : r.fundingModel === 'Self Funding' ? 'Cash Loading Master' : '—'
  const visiblePlan = plan.filter((p) => p.state !== 'Stopped')
  const emails = wf.emails.filter((m) => m.refId === r.id)
  const tasks = wf.tasks.filter((t) => t.refId === r.id)

  return (
    <div className="mx-auto max-w-[1320px] min-w-0 pb-12">
      <Link to="/operations/reconciliation/charge-back" className="mb-3 inline-flex items-center gap-1 text-[12px] text-muted hover:text-primary"><ArrowLeft size={14} /> Chargeback disputes</Link>
      <div className={cn('mb-3 flex flex-wrap items-start justify-between gap-3 rounded-xl p-3', overdue && 'border border-red-300 bg-red-50')}>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-ink">{r.id}</h1>
          <p className="text-[13px] text-muted">{r.source} case {r.caseRef || '—'} · ATM {r.atmId} · {r.franchiseName} · dispute {rupees(r.disputeAmount)} · received {fmtDt(r.receivedAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={r.fundingModel === 'Self Funding' ? 'purple' : 'navy'}>{r.fundingModel}</Badge>
          <Badge tone="blue">{stage}</Badge>
          <Badge tone={toneFor(cbStatus(r, now))}>{cbStatus(r, now)}</Badge>
          <Countdown dueAt={r.dueAt} now={now} stoppedAt={r.report?.submittedAt} />
        </div>
      </div>
      <div className="mb-4"><ActingAs hint="Kiran Rao / Sunil Yadav = CRM Ops · Meera Iyer = Admin approver" /></div>
      <Card className="mb-4 p-4"><Stepper steps={CB_WORKFLOW} current={cbStep(r)} done={!!r.closure} /></Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <Card className="p-4">
            <div className="mb-3 text-[13px] font-semibold">3 · CRM Operations verification — email data vs AI extraction</div>
            <DataVerification key={`${r.id}-${r.trail.modifications.length}-${r.dataVerified?.at ?? ''}`} r={r} canEdit={crm && !r.closure && !(apiEnabled && ((r.dataVerified && r.evidence) || !['Awaiting Franchise Response', 'Escalated', 'Evidence Submitted'].includes(st ?? '')))} />
          </Card>

          <Card className="p-4">
            <div className="mb-3 text-[13px] font-semibold">4–5 · Franchise notification, response & evidence</div>
            <p className="mb-3 text-[12px] text-muted">Franchise notified {fmtDt(r.franchiseNotifiedAt)} (before CRM verification) — responds from the mobile app (Chargeback screen).</p>
            {r.escalation && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">Escalated (L{r.escalation.level}) {fmtDt(r.escalation.at)} — {r.escalation.note}</p>}
            {r.evidenceLate && <p className="mb-2 text-[11.5px] text-red-700">Evidence was submitted after the 24 h window.</p>}
            {r.evidence ? (
              <div className="space-y-2">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Info k="Transaction confirmation">{r.evidence.txnConfirmation}</Info>
                  <Info k="Submitted">{r.evidence.submittedBy} · {fmtDt(r.evidence.submittedAt)}</Info>
                  <Info k="Remarks">{r.evidence.remarks}</Info>
                  <Info k="EOD details" className="sm:col-span-3">{r.evidence.eodDetails}</Info>
                </div>
                <div className="flex flex-wrap gap-2">{r.evidence.files.map((f) => <FileChip key={`${f.kind}-${f.name}`} name={f.name} sub={f.kind} />)}</div>
              </div>
            ) : (
              <>
                <p className="rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">Awaiting franchise response & evidence (transaction confirmation, EOD details, video, documents).</p>
                {crm && !r.closure && (!apiEnabled || st === 'Awaiting Franchise Response' || st === 'Escalated') && <OnBehalfEvidence r={r} />}
              </>
            )}
            {r.priorEvidence.length > 0 && <p className="mt-2 text-[11.5px] text-muted">{r.priorEvidence.length} earlier submission(s) returned: {r.priorEvidence.map((p) => p.returnedReason).join('; ')}</p>}
          </Card>

          <Card className="p-4">
            <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold"><FileSearch size={14} /> 6 · CRM evidence verification</div>
            <p className="mb-3 text-[11.5px] text-muted">{r.fundingModel}: verify only against <b>{sourceLabel(r.fundingModel)}</b> — CBR and Cash Loading records never mix.</p>
            <div className="mb-3 space-y-2">
              {apiEnabled && (
                <div className={cn('rounded-md border px-3 py-2 text-[12px]', r.cashSource ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50')}>
                  {r.cashSource ? <><b>{r.cashSource.kind}</b> <span className="text-muted">· {r.cashSource.refId}</span><div className="text-ink-2">{r.cashSource.atmId} · {r.cashSource.date} · {r.cashSource.status}</div></> : <>No {against} record found for {r.atmId} on {r.txnDate}.</>}
                </div>
              )}
              {!apiEnabled && sources.map((s) => (
                <div key={s.source} className={cn('rounded-md border px-3 py-2 text-[12px]', s.found ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50')}>
                  <b>{s.source}</b> <span className="text-muted">· {s.ref}</span>
                  <div className="text-ink-2">{s.detail}</div>
                </div>
              ))}
            </div>
            {r.evidenceCheck ? (
              <p className={cn('rounded-md px-3 py-2 text-[12px]', r.evidenceCheck.result === 'Matched' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>
                {r.evidenceCheck.result} against {r.evidenceCheck.against} ({r.evidenceCheck.refs.join(', ') || '—'}) {r.evidenceCheck.note && `— ${r.evidenceCheck.note}`} · {r.evidenceCheck.by}, {fmtDt(r.evidenceCheck.at)}
              </p>
            ) : crm && r.evidence && !r.closure && (!apiEnabled || st === 'Evidence Submitted') ? (
              <div className="space-y-2">
                {!r.dataVerified && <p className="text-[12px] text-amber-700">Verify the email / extracted data above first.</p>}
                <TextField label={`Verification note (vs ${against})`} value={checkNote} onChange={(e) => setCheckNote(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" icon={<CheckCircle2 size={13} />} disabled={busy || !r.dataVerified} onClick={() => run(() => verifyCbEvidenceAsync(r.id, 'Matched', checkNote), 'Evidence matched', () => setCheckNote(''))}>Matched</Button>
                  <Button size="sm" variant="danger" disabled={busy || !r.dataVerified} onClick={() => run(() => verifyCbEvidenceAsync(r.id, 'Mismatch', checkNote), 'Mismatch recorded', () => setCheckNote(''))}>Mismatch</Button>
                </div>
                <ReasonBox value={retReason} onChange={setRetReason} placeholder="Ask franchise for more evidence — reason" />
                <Button size="sm" variant="secondary" icon={<Undo2 size={13} />} disabled={busy || !retReason.trim()} onClick={() => run(() => returnCbEvidenceAsync(r.id, retReason), 'Returned to franchise', () => setRetReason(''))}>Return evidence to franchise</Button>
              </div>
            ) : (
              <p className="text-[12px] text-muted">{r.evidence ? 'Awaiting CRM evidence verification.' : 'Evidence verification starts after the franchise submits.'}</p>
            )}
          </Card>

          <Card className={cn('p-4', overdue && 'border-red-300')}>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] font-semibold">7 · Response report to {r.source} (24 h) <Countdown dueAt={r.dueAt} now={now} stoppedAt={r.report?.submittedAt} /></div>
            {r.report ? (
              <div className="space-y-2 text-[12px]">
                <p><b>{r.report.decision}</b> — {r.report.summary}</p>
                <p className="text-muted">Prepared by {r.report.preparedBy} · {fmtDt(r.report.preparedAt)}{r.recovery ? ` · recovery ${rupees(r.recovery)}` : ''}{r.report.submittedAt && ` · approved by ${r.report.approvedBy} & submitted ${fmtDt(r.report.submittedAt)}`}{r.submission && ` via ${r.submission.channel} (${r.submission.reference})`}</p>
                {apiEnabled && st === 'Pending Approval' && (admin ? (
                  <div className="space-y-2">
                    {r.report.preparedBy === u.name && <p className="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-red-700"><ShieldAlert size={14} /> Maker-checker: you reviewed this chargeback.</p>}
                    <TextField label="Approval / send-back note" value={apprNote} onChange={(e) => setApprNote(e.target.value)} />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" icon={<CheckCircle2 size={13} />} disabled={busy} onClick={() => run(() => approveCbReportAsync(r.id, apprNote || undefined), 'Response approved — record locked', () => setApprNote(''))}>Approve response</Button>
                      <Button size="sm" variant="secondary" icon={<Undo2 size={13} />} disabled={busy || apprNote.trim().length < 3} onClick={() => run(() => rejectCbReviewAsync(r.id, apprNote), 'Review sent back to Finance', () => setApprNote(''))}>Send back to Finance</Button>
                    </div>
                  </div>
                ) : <p className="text-amber-700">Awaiting Admin approval.</p>)}
                {apiEnabled && st === 'Approved' && (crm ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <TextField label="Channel" value={channel} onChange={(e) => setChannel(e.target.value)} />
                    <TextField label="Submission reference" value={reference} onChange={(e) => setReference(e.target.value)} />
                    <div className="flex items-end"><Button size="sm" icon={<Send size={13} />} disabled={busy || reference.trim().length < 2} onClick={() => run(() => submitCbToBankAsync(r.id, channel, reference), `Response submitted to ${r.source}`, () => setReference(''))}>Record submission</Button></div>
                  </div>
                ) : <p className="text-amber-700">Approved — CRM submits the response to {r.source}.</p>)}
                {!apiEnabled && !r.report.submittedAt && (admin ? (
                  <>
                    {r.report.preparedBy === u.name && <p className="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-red-700"><ShieldAlert size={14} /> Maker-checker: you prepared this report.</p>}
                    <Button size="sm" icon={<Send size={13} />} disabled={busy || r.report.preparedBy === u.name} onClick={() => run(() => approveCbReportAsync(r.id), `Report approved & submitted to ${r.source}`)}>Approve & submit to {r.source}</Button>
                  </>
                ) : <p className="text-amber-700">Awaiting Admin approval before submission.</p>)}
              </div>
            ) : canReview ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <SelectField label="Decision" options={REPORT_DECISIONS} value={decision} onChange={(e) => setDecision(e.target.value)} />
                {apiEnabled && <TextField label="Recovery from franchise (₹)" type="number" min={0} value={recovery} onChange={(e) => setRecovery(e.target.value)} />}
                <TextAreaField label="Report summary" className="sm:col-span-2" value={summary} onChange={(e) => setSummary(e.target.value)} />
                <div><Button size="sm" disabled={busy} onClick={() => run(() => prepareCbReportAsync(r.id, decision, summary, Number(recovery) || 0), apiEnabled ? 'Financial review saved — sent for Admin approval' : 'Report prepared — sent for Admin approval')}>{apiEnabled ? 'Save financial review' : 'Prepare report'}</Button></div>
              </div>
            ) : (
              <p className="text-[12px] text-muted">{apiEnabled ? 'Finance reviews the chargeback after CRM evidence verification (or after escalation without a response).' : 'The report is prepared after evidence verification.'}</p>
            )}
          </Card>

          {r.report?.submittedAt && (
            <Card className="p-4">
              <div className="mb-3 text-[13px] font-semibold">8–9 · Follow-up, status & closure</div>
              <div className="mb-3 space-y-1.5">
                {r.followUps.map((f) => <div key={f.id} className="rounded-md border border-line px-3 py-1.5 text-[12px]"><b>{f.bankStatus}</b> — {f.note}<span className="text-muted"> · {f.by}, {fmtDt(f.at)}</span></div>)}
              </div>
              {r.closure ? (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">Closed — <b>{r.closure.outcome}</b> {r.closure.note && `(${r.closure.note})`} · {r.closure.by}, {fmtDt(r.closure.at)}</p>
              ) : crm || admin ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2 rounded-lg border border-line p-3">
                    <SelectField label="Bank / NPCI status" options={['Under review', 'Clarification sought', 'Pre-arbitration', 'Decision received']} value={fuStatus} onChange={(e) => setFuStatus(e.target.value)} />
                    <TextField label="Follow-up note" value={fuNote} onChange={(e) => setFuNote(e.target.value)} />
                    <Button size="sm" disabled={busy} onClick={() => run(() => addCbFollowUpAsync(r.id, fuNote, fuStatus), 'Follow-up logged', () => setFuNote(''))}>Log follow-up</Button>
                  </div>
                  <div className="space-y-2 rounded-lg border border-line p-3">
                    <SelectField label="Final outcome" options={CB_OUTCOMES} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
                    <TextField label="Closure note" value={closeNote} onChange={(e) => setCloseNote(e.target.value)} />
                    <Button size="sm" disabled={busy} onClick={() => run(() => closeCbAsync(r.id, outcome, closeNote), 'Dispute closed')}>Close dispute</Button>
                  </div>
                </div>
              ) : null}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {apiEnabled ? (
            <Card className="p-4">
              <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold"><Bell size={14} /> Reminders & escalation</div>
              <p className="text-[12px] text-muted">Server jobs send reminders and escalate the case (Critical task) when the franchise does not respond by {fmtDt(r.dueAt)}. Backend status: <b className="text-ink">{st}</b>.</p>
            </Card>
          ) : (
          <Card className="p-4">
            <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold"><Bell size={14} /> Reminder schedule</div>
            <p className="mb-2 text-[11px] text-muted">From Setup: {schedules.map((s) => `${s.label.split('–')[1]?.trim() ?? s.label} ${s.perDay}/day @ ${s.times.join(', ')}`).join(' · ')}</p>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {visiblePlan.map((p) => (
                <div key={p.key} className="flex items-center gap-2 text-[11.5px]">
                  <Badge tone={p.audience === 'Franchise' ? 'purple' : 'blue'} dot={false}>{p.audience}</Badge>
                  <span className="tabular-nums">{fmtDt(p.slot)}</span>
                  <span className={cn('ml-auto font-semibold', p.state === 'Sent' ? 'text-emerald-700' : p.state === 'Due' ? 'text-red-600' : 'text-muted')}>{p.state === 'Sent' ? `Logged ${new Date(p.loggedAt!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : p.state}</span>
                </div>
              ))}
              {!visiblePlan.length && <p className="text-[12px] text-muted">No reminders pending — responses complete.</p>}
            </div>
            {plan.some((p) => p.state === 'Stopped') && <p className="mt-2 text-[11px] text-muted">{plan.filter((p) => p.state === 'Stopped').length} slot(s) skipped — action already completed.</p>}
          </Card>
          )}
          <Card className="p-4">
            <div className="mb-3 text-[13px] font-semibold">History</div>
            <div className="max-h-[420px] overflow-y-auto"><Timeline items={[...r.history].reverse()} /></div>
          </Card>
          <Card className="p-4">
            <div className="mb-3 text-[13px] font-semibold">Emails & tasks</div>
            <div className="space-y-2 text-[12px]">
              {emails.map((m) => <div key={m.id} className="rounded-md bg-surface px-2.5 py-1.5">{m.subject}<div className="text-[11px] text-muted">{m.templateCode} → {m.to.join(', ') || '—'} · {m.status}</div></div>)}
              {tasks.map((t) => <div key={t.id} className="rounded-md border border-line px-2.5 py-1.5">{t.title}<div className="text-[11px] text-muted">{t.id} · {t.assignedTo} · due {fmtDt(t.dueAt)} · <b>{t.status}</b></div></div>)}
              {!emails.length && !tasks.length && <p className="text-muted">No workflow emails / tasks for this case in this browser yet.</p>}
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
