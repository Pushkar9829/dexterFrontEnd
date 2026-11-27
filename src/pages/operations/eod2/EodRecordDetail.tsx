import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, ClipboardCheck, Copy, ExternalLink, KeyRound, Lock, PencilLine, Plus, RotateCcw, ShieldCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { useRole } from '@/lib/rbac'
import { actorName, useWorkflow } from '@/data/workflow'
import {
  AUDIT_REASONS, EOD_CATEGORIES, EOD_CORRECTABLE_FIELDS, acknowledgeCashAsync, addEventAsync, approveEodAsync, completeness, correctEodAsync, eodLoader, emptyEvent, ledgerOf, rejectEodAsync,
  returnEodAsync, reviewExceptionAsync, useEod, validateEvent, verifyEodAsync, verifyEventAsync,
  type EodCorrectableKey, type EodRecord, type EventInput,
} from '@/data/eodStore'
import { apiEnabled } from '@/data/opsApi'
import { opsMeLoader, rightsFor } from './access'
import { FLOW_STEPS, nextActionOf, stepOf } from './flow'
import { dmy, dt, inr, signedInr } from './fmt'
import { AckBox, KV, NoAccess, Note, OpsPage, Panel, Status, Stepper, TableWrap, TD, TH, Timeline, TR } from './ui'

type Dialog = null | 'verify' | 'return' | 'reject' | 'clear' | 'exReturn' | 'event' | 'cash' | 'approve' | 'correct'

export default function EodRecordDetail() {
  const { id } = useParams()
  const { records } = useEod()
  const wf = useWorkflow()
  const role = useRole()
  const r = records.find((x) => x.id === id)
  opsMeLoader.use()
  const rights = rightsFor(r?.type === 'Cash Audit' ? 'Cash Audit EOD' : 'Routine EOD', role)
  const [dialog, setDialog] = useState<Dialog>(null)
  const load = eodLoader.use()

  if (!rights.view) return <NoAccess module="Routine EOD" />
  if (!r && (load.loading || (apiEnabled && !load.loaded && !load.error)))
    return (
      <OpsPage title="Loading EOD record…" back={{ to: '/operations/eod/crm', label: 'EOD Master' }}>
        <Note tone="blue">Loading…</Note>
      </OpsPage>
    )
  if (!r)
    return (
      <OpsPage title="EOD record not found" back={{ to: '/operations/eod/crm', label: 'EOD Master' }}>
        <Note tone="amber">No EOD record with ID “{id}”.</Note>
      </OpsPage>
    )

  const step = stepOf(r)
  const miss = completeness(r)
  const emails = wf.emails.filter((e) => e.refId === r.id)
  const tasks = wf.tasks.filter((t) => t.refId === r.id)
  const otcUrl = r.otcLinkToken ? `/operations/eod/otc/${r.otcLinkToken}` : ''
  const own = [r.trail.createdBy, r.trail.submittedBy].includes(actorName())

  return (
    <OpsPage
      title={
        <span className="flex flex-wrap items-center gap-2">
          {r.id} <Status text={r.type === 'Routine' ? 'Routine EOD' : 'Cash Audit EOD'} tone={r.type === 'Routine' ? 'blue' : 'purple'} /> <Status text={r.stage} /> <Status text={r.status} tone="gray" />
        </span>
      }
      sub={`${r.atmId} · ${r.siteId} · ${r.franchiseName} · ${r.funding} · next: ${nextActionOf(r)}`}
      back={{ to: '/operations/eod/crm', label: 'EOD Master' }}
    >
      <Panel>
        <Stepper steps={[...FLOW_STEPS]} current={step.current} failedAt={step.failedAt} />
      </Panel>

      {own && ['Pending Verification', 'Exception Review'].includes(r.stage) && <Note tone="amber">You submitted this request — maker-checker blocks you from verifying, returning or rejecting it (UAT 5).</Note>}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Panel title="Request">
            <KV
              cols={4}
              items={[
                ['EOD date', dmy(r.eodDate)],
                ['Machine', 'CRM'],
                ['Funding model', r.funding],
                ['History ledger', ledgerOf(r.funding)],
                ['EOD category', r.category ?? (r.funding === 'Full Funding' ? <span key="cat" className="text-red-600">Missing</span> : 'Not required (Self Funding)')],
                ['Channel', r.channel],
                ['Audit reason', r.type === 'Cash Audit' ? `${r.auditReason}${r.auditReasonOther ? ` — ${r.auditReasonOther}` : ''}` : '—'],
                ['Exceptional reason', r.exceptionalReason ?? '—'],
              ]}
            />
          </Panel>

          <Panel title="Counter slip & ₹40,000 rule">
            <KV cols={4} items={[['File', r.counterSlip.file], ['Slip no.', r.counterSlip.slipNo], ['Slip date', dmy(r.counterSlip.slipDate)], ['Slip amount', inr(r.counterSlip.amount)], ['Declared cash', inr(r.declaredCash)], ['Rule result', <Status key="rr" text={r.rule.passed ? 'Passed' : 'Failed'} tone={r.rule.passed ? 'green' : 'red'} />], ['Exception decision', r.rule.decision ? `${r.rule.decision} by ${r.rule.reviewedBy}` : r.rule.passed ? '—' : 'Pending'], ['Decision remark', r.rule.remark ?? '—']]} />
            <div className="mt-3">
              <Note tone={r.rule.passed ? 'green' : 'amber'}>{r.rule.message}</Note>
            </div>
            {r.trail.returnReason && (
              <div className="mt-2">
                <Note tone="red">
                  {r.stage === 'Rejected' ? 'Rejected' : 'Returned'} by {r.trail.returnedBy}: {r.trail.returnReason}
                </Note>
              </div>
            )}
          </Panel>

          <Panel title="Docket & OTC" sub="OTC is generated once by the franchise's authorized user through the link and stays view-only, linked to this EOD (UAT 10).">
            <KV
              cols={3}
              items={[
                ['Docket number', r.docket ? <b key="d">{r.docket.no}</b> : '—'],
                ['Docket by / at', r.docket ? `${r.docket.by} · ${dt(r.docket.at)}` : '—'],
                ['Email', emails.find((e) => e.templateCode === 'EOD_DOCKET') ? `Sent: ${emails.find((e) => e.templateCode === 'EOD_DOCKET')!.to.join(', ')}` : r.docket ? 'Sent (seed)' : '—'],
                ['OTC', r.otc ? <span key="o" className="inline-flex items-center gap-1 font-mono font-bold text-primary"><Lock size={12} /> {r.otc.code}</span> : '—'],
                ['OTC generated by', r.otc ? `${r.otc.generatedBy} (${r.otc.designation}) · ${r.otc.mobile}` : '—'],
                ['OTC generated at', r.otc ? dt(r.otc.generatedAt) : '—'],
              ]}
            />
            {r.otcLinkToken && !r.otc && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary-soft/40 p-3">
                <KeyRound size={16} className="text-primary" />
                <span className="text-[12px] text-ink">OTC generation link issued {dt(r.otcLinkIssuedAt)}:</span>
                <code className="rounded bg-white px-1.5 py-0.5 text-[11.5px]">{otcUrl}</code>
                <Button size="sm" variant="secondary" icon={<Copy size={13} />} onClick={() => { void navigator.clipboard?.writeText(`${location.origin}${otcUrl}`); toast('OTC link copied') }}>
                  Copy
                </Button>
                <Link to={otcUrl}>
                  <Button size="sm" icon={<ExternalLink size={13} />}>Open link</Button>
                </Link>
              </div>
            )}
          </Panel>

          <Panel
            title={r.type === 'Cash Audit' ? 'Cash audit events — one row per vault / bolt opening (UAT 11)' : 'Vault opening'}
            action={
              (r.stage === 'OTC Generated' || (r.stage === 'Vault Opened' && r.type === 'Cash Audit')) && (rights.create || rights.edit) ? (
                <Button size="sm" icon={<Plus size={13} />} onClick={() => setDialog('event')}>
                  Record {r.events.length ? 'another' : ''} opening
                </Button>
              ) : null
            }
            pad={false}
          >
            <TableWrap empty={!r.events.length}>
              <thead className="bg-slate-50">
                <tr>
                  {['#', 'Date & time', 'Bolt opened', 'Closed', 'Authorized by', 'Counted by', 'Expected', 'Actual found', 'Difference', 'Docs / photos', 'Verified', 'Approved', ''].map((h) => (
                    <th key={h} className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.events.map((e) => (
                  <tr key={e.id} className={TR}>
                    <td className={TD}>{e.seq}</td>
                    <td className={TD}>{dt(e.at)}</td>
                    <td className={`${TD} font-semibold`}>{e.boltOpenedAt}</td>
                    <td className={TD}>{e.boltClosedAt ?? '—'}</td>
                    <td className={TD}>{e.authorizedBy}</td>
                    <td className={TD}>{e.countedBy}</td>
                    <td className={TD}>{inr(e.expectedCash)}</td>
                    <td className={TD}>{inr(e.actualCash)}</td>
                    <td className={`${TD} ${e.diffType === 'Shortage' ? 'text-red-600' : e.diffType === 'Overage' ? 'text-amber-700' : ''}`}>
                      {signedInr(e.difference)} <span className="text-[10.5px]">{e.diffType}</span>
                    </td>
                    <td className={TD}>{e.docs.join(', ')}</td>
                    <td className={TD}>{e.verifiedBy ? `${e.verifiedBy} · ${dt(e.verifiedAt)}` : <span className="text-amber-700">Pending</span>}</td>
                    <td className={TD}>{e.approvedBy ? `${e.approvedBy} · ${dt(e.approvedAt)}` : '—'}</td>
                    <td className={TD}>
                      {!e.verifiedBy && rights.verify && (
                        <Button size="sm" variant="secondary" onClick={() => void verifyEventAsync(r.id, e.id).then((err) => { if (!err) toast(`Event #${e.seq} verified`); else if (!apiEnabled) toast(err, 'error') })}>
                          Verify
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Panel>

          <Panel title="Cash replacement / loading & history">
            {r.cash ? (
              <KV cols={3} items={[['Mode', r.cash.mode], ['Amount', inr(r.cash.amount)], ['Acknowledged by', `${r.cash.by} · ${dt(r.cash.at)}`], ['Acknowledgement', `${r.cash.ack.lang} · ${r.cash.ack.version}`], ['History entry', r.historyRef ? <Link key="h" className="text-primary hover:underline" to={`/operations/eod/overview?ledger=${encodeURIComponent(r.historyRef.ledger)}&q=${r.id}`}>{r.historyRef.ledger} · {r.historyRef.entryId}</Link> : '—'], ['Remarks', r.cash.remarks ?? '—']]} />
            ) : (
              <p className="text-[12px] text-muted">Not acknowledged yet. On acknowledgement the record is written to the {ledgerOf(r.funding)} immediately.</p>
            )}
          </Panel>

          {(r.corrections?.length ?? 0) > 0 && (
            <Panel title={`Controlled corrections · current version v${r.version ?? 1}`} sub="Corrections of the approved (locked) record. Each one creates a new version; the previous values stay in the version history." pad={false}>
              <TableWrap empty={false}>
                <thead className="bg-slate-50">
                  <tr>
                    {['Version', 'Field', 'Old value', 'New value', 'Reason', 'By', 'At'].map((h) => (
                      <th key={h} className={TH}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.corrections!.map((c, i) => (
                    <tr key={`${c.version}-${c.field}-${i}`} className={TR}>
                      <td className={TD}>v{c.version}</td>
                      <td className={TD}>{c.label}</td>
                      <td className={TD}>{c.oldValue || '—'}</td>
                      <td className={`${TD} font-semibold`}>{c.newValue || '—'}</td>
                      <td className={TD}>{c.reason}</td>
                      <td className={TD}>{c.by}</td>
                      <td className={TD}>{dt(c.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </Panel>
          )}

          <Panel title="Timeline">
            <Timeline items={r.log} />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Actions">
            <div className="space-y-2">
              {r.stage === 'Exception Review' && rights.verify && (
                <>
                  <Button block icon={<CheckCircle2 size={15} />} onClick={() => setDialog('clear')}>Clear exception → verification</Button>
                  <Button block variant="secondary" icon={<RotateCcw size={15} />} onClick={() => setDialog('exReturn')}>Return to franchise</Button>
                </>
              )}
              {r.stage === 'Pending Verification' && rights.verify && (
                <>
                  <Button block icon={<ClipboardCheck size={15} />} onClick={() => setDialog('verify')}>Verify → generate docket</Button>
                  <Button block variant="secondary" icon={<RotateCcw size={15} />} onClick={() => setDialog('return')}>Return for correction</Button>
                </>
              )}
              {['Pending Verification', 'Exception Review', 'Docket Generated', 'OTC Generated', 'Vault Opened'].includes(r.stage) && rights.verify && (
                <Button block variant="danger" icon={<XCircle size={15} />} onClick={() => setDialog('reject')}>Reject</Button>
              )}
              {r.stage === 'Vault Opened' && (rights.create || rights.edit) && (
                <Button block icon={<ShieldCheck size={15} />} onClick={() => setDialog('cash')} disabled={miss.length > 0}>
                  Acknowledge cash {r.funding === 'Full Funding' ? 'replacement' : 'loading'} (on behalf)
                </Button>
              )}
              {r.stage === 'Cash Acknowledged' && rights.approve && <Button block icon={<Lock size={15} />} onClick={() => setDialog('approve')}>Approve & lock</Button>}
              {r.stage === 'Cash Acknowledged' && !rights.approve && <Note tone="blue">Waiting for Admin approval.</Note>}
              {r.stage === 'Approved' && <Note tone="green">Approved by {r.trail.approvedBy} · {dt(r.trail.approvedAt)}. Record locked{(r.version ?? 1) > 1 ? ` · version ${r.version} (corrected)` : ''}.</Note>}
              {r.stage === 'Approved' && apiEnabled && rights.approve && !own && (
                <Button block variant="secondary" icon={<PencilLine size={15} />} onClick={() => setDialog('correct')}>
                  Correct (controlled correction)
                </Button>
              )}
              {r.stage === 'Approved' && apiEnabled && rights.approve && own && <Note tone="amber">You created / submitted this request — maker-checker blocks you from correcting it.</Note>}
              {r.stage === 'Returned for Correction' && <Note tone="amber">Waiting for the franchise to re-submit from the mobile app.</Note>}
              {r.stage === 'Docket Generated' && <Note tone="blue">Waiting for the franchise's authorized user to generate the OTC through the link.</Note>}
            </div>
          </Panel>

          <Panel title="Mandatory record check" sub="Vault opening time and OTC are mandatory on every EOD (§5.1.4).">
            <ul className="space-y-1.5 text-[12px]">
              {[['OTC on record', !!r.otc], ['Vault opening time recorded', r.events.length > 0 && r.events.every((e) => !!e.boltOpenedAt)], ['Every opening verified', r.events.length > 0 && r.events.every((e) => !!e.verifiedBy)], ['EOD category (FF CRM)', r.funding !== 'Full Funding' || !!r.category], ['Acknowledgement stored', !!r.trail.acknowledgement]].map(([l, ok]) => (
                <li key={String(l)} className="flex items-center gap-2">
                  {ok ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-red-500" />} {l}
                </li>
              ))}
            </ul>
            {miss.length > 0 && r.stage === 'Vault Opened' && (
              <div className="mt-2">
                <Note tone="red">Incomplete — missing {miss.join(', ')}.</Note>
              </div>
            )}
          </Panel>

          <Panel title="Audit trail">
            <KV cols={2} items={[['Created by', `${r.trail.createdBy} · ${dt(r.trail.createdAt)}`], ['Submitted by', r.trail.submittedBy ? `${r.trail.submittedBy} · ${dt(r.trail.submittedAt)}` : '—'], ['Verified by', r.trail.verifiedBy ? `${r.trail.verifiedBy} · ${dt(r.trail.verifiedAt)}` : '—'], ['Approved by', r.trail.approvedBy ? `${r.trail.approvedBy} · ${dt(r.trail.approvedAt)}` : '—'], ['Acknowledgement', r.trail.acknowledgement ? `${r.trail.acknowledgement.lang} · ${r.trail.acknowledgement.version} · ${r.trail.acknowledgement.by}` : '—'], ['Tasks', tasks.length ? tasks.map((t) => `${t.id} (${t.status})`).join(', ') : '—']]} />
            {r.trail.documents.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-[10.5px] font-semibold tracking-wide text-slate-500 uppercase">Documents</div>
                <ul className="space-y-1 text-[11.5px] text-ink-2">
                  {r.trail.documents.map((d, i) => (
                    <li key={`${d.name}-${i}`}>
                      {d.action}: {d.name} · {d.by} · {dt(d.at)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {r.trail.modifications.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-[10.5px] font-semibold tracking-wide text-slate-500 uppercase">Modifications</div>
                <ul className="space-y-1 text-[11.5px] text-ink-2">
                  {r.trail.modifications.map((m, i) => (
                    <li key={`${m.at}-${i}`}>
                      {m.field}: {m.oldValue} → {m.newValue} ({m.reason}) · {m.by}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {emails.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-[10.5px] font-semibold tracking-wide text-slate-500 uppercase">Emails</div>
                <ul className="space-y-1 text-[11.5px] text-ink-2">
                  {emails.map((e) => (
                    <li key={e.id}>
                      {e.templateCode} v{e.templateVersion}: {e.subject} → {e.to.join(', ') || '—'} ({e.status})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </div>
      </div>

      {dialog === 'correct' ? <CorrectDialog r={r} onClose={() => setDialog(null)} /> : dialog && <ActionDialog r={r} kind={dialog} onClose={() => setDialog(null)} />}
    </OpsPage>
  )
}

/** Controlled correction of an approved / locked EOD: changed fields + mandatory reason → new version (API mode). */
function CorrectDialog({ r, onClose }: { r: EodRecord; onClose: () => void }) {
  const [vals, setVals] = useState<Partial<Record<EodCorrectableKey, string>>>({})
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const current: Record<EodCorrectableKey, string> = {
    declaredCashPaise: inr(r.declaredCash), slipNo: r.counterSlip.slipNo, slipDate: dmy(r.counterSlip.slipDate), slipAmountPaise: inr(r.counterSlip.amount),
    cashAmountPaise: r.cash ? inr(r.cash.amount) : '—', cashRemarks: r.cash?.remarks ?? '—', category: r.category ?? '—', auditReason: r.auditReason ?? '—', auditReasonOther: r.auditReasonOther ?? '—',
  }
  const fields = EOD_CORRECTABLE_FIELDS.filter((f) => (r.type === 'Cash Audit' || !f.key.startsWith('audit')) && (r.cash || !f.key.startsWith('cash')))
  const set = (k: EodCorrectableKey) => (v: string) => setVals((p) => ({ ...p, [k]: v }))
  const save = async () => {
    setBusy(true)
    const e = await correctEodAsync(r.id, vals, reason)
    setBusy(false)
    if (e) return setErr(e)
    toast(`${r.id} corrected — new version saved`)
    onClose()
  }
  return (
    <Modal
      title="Controlled correction"
      sub={`${r.id} · ${r.atmId} · approved & locked (v${r.version ?? 1})`}
      onClose={onClose}
      width={640}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>Save correction</Button></>}
    >
      <div className="space-y-3">
        <Note tone="blue">Fill only the fields to correct. The same validations as the original request apply (₹40,000 counter-slip rule, mandatory category, no future dates). A new version is created and audited.</Note>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((f) =>
            f.key === 'category' ? (
              <SelectField key={f.key} label={f.label} hint={`Now: ${current[f.key]}`} options={[...EOD_CATEGORIES]} value={vals[f.key] ?? ''} onChange={(e) => set(f.key)(e.target.value)} />
            ) : f.key === 'auditReason' ? (
              <SelectField key={f.key} label={f.label} hint={`Now: ${current[f.key]}`} options={[...AUDIT_REASONS]} value={vals[f.key] ?? ''} onChange={(e) => set(f.key)(e.target.value)} />
            ) : (
              <TextField key={f.key} label={f.label} hint={`Now: ${current[f.key]}`} type={'money' in f ? 'number' : 'date' in f ? 'date' : 'text'} value={vals[f.key] ?? ''} onChange={(e) => set(f.key)(e.target.value)} />
            ),
          )}
        </div>
        <TextAreaField label="Reason for correction" required value={reason} onChange={(e) => setReason(e.target.value)} />
        {err && <Note tone="red">{err}</Note>}
      </div>
    </Modal>
  )
}

function ActionDialog({ r, kind, onClose }: { r: EodRecord; kind: Exclude<Dialog, null | 'correct'>; onClose: () => void }) {
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [ev, setEv] = useState<EventInput>(() => emptyEvent(r.eodDate))
  const [evErr, setEvErr] = useState<Record<string, string>>({})
  const [doc, setDoc] = useState('')
  const [amount, setAmount] = useState('')
  const [lang, setLang] = useState<'Hindi' | 'English'>('Hindi')
  const [ack, setAck] = useState(false)

  const meta: Record<typeof kind, { title: string; button: string; label?: string }> = {
    verify: { title: 'Verify EOD request', button: 'Verify & generate docket', label: 'Verification remark (optional)' },
    return: { title: 'Return for correction', button: 'Return', label: 'Reason (sent to franchise)' },
    reject: { title: 'Reject EOD request', button: 'Reject', label: 'Rejection reason' },
    clear: { title: 'Clear counter-slip exception', button: 'Clear exception', label: 'Why is the exception acceptable?' },
    exReturn: { title: 'Return exception to franchise', button: 'Return', label: 'Reason' },
    event: { title: `Record vault / bolt opening #${r.events.length + 1}`, button: 'Save event' },
    cash: { title: `Cash ${r.funding === 'Full Funding' ? 'replacement' : 'loading'} acknowledgement`, button: 'Acknowledge & update history' },
    approve: { title: 'Approve EOD', button: 'Approve & lock', label: 'Approval remark (optional)' },
  }
  const m = meta[kind]
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const save = async () => {
    let e: string | null = null
    if (kind === 'event') {
      const v = validateEvent(ev)
      setEvErr(v)
      if (Object.keys(v).length) return
    }
    setBusy(true)
    if (kind === 'verify') e = await verifyEodAsync(r.id, text)
    if (kind === 'return') e = await returnEodAsync(r.id, text)
    if (kind === 'reject') e = await rejectEodAsync(r.id, text)
    if (kind === 'clear') e = await reviewExceptionAsync(r.id, 'Cleared', text)
    if (kind === 'exReturn') e = await reviewExceptionAsync(r.id, 'Returned', text)
    if (kind === 'approve') e = await approveEodAsync(r.id, text)
    if (kind === 'cash') e = await acknowledgeCashAsync(r.id, { amount: Number(amount), remarks: text, ackLang: lang, ackChecked: ack }, `${actorName()} (on behalf of franchise)`)
    if (kind === 'event') e = await addEventAsync(r.id, ev, actorName(), files)
    setBusy(false)
    if (e) return setErr(e)
    toast(`${m.title} — done`)
    onClose()
  }
  const setE = (k: keyof EventInput) => (v: string) => setEv((p) => ({ ...p, [k]: v }))
  const diff = ev.expectedCash !== '' && ev.actualCash !== '' ? Number(ev.actualCash) - Number(ev.expectedCash) : null

  return (
    <Modal title={m.title} sub={`${r.id} · ${r.atmId}`} onClose={onClose} width={kind === 'event' ? 680 : 520} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={kind === 'reject' ? 'danger' : 'primary'} onClick={save} disabled={busy}>{m.button}</Button></>}>
      <div className="space-y-3">
        {m.label && <TextAreaField label={m.label} value={text} onChange={(e) => setText(e.target.value)} />}
        {kind === 'event' && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label="Audit date" type="date" required value={ev.date} onChange={(e) => setE('date')(e.target.value)} error={evErr.date} />
              <TextField label="Vault / bolt opening time" type="time" required value={ev.boltOpenedAt} onChange={(e) => setE('boltOpenedAt')(e.target.value)} error={evErr.boltOpenedAt} />
              <TextField label="Closing time" type="time" value={ev.boltClosedAt} onChange={(e) => setE('boltClosedAt')(e.target.value)} error={evErr.boltClosedAt} />
              <TextField label="Authorized by" required value={ev.authorizedBy} onChange={(e) => setE('authorizedBy')(e.target.value)} error={evErr.authorizedBy} />
              <TextField label="Cash counted by" required value={ev.countedBy} onChange={(e) => setE('countedBy')(e.target.value)} error={evErr.countedBy} />
              <div />
              <TextField label="Expected cash (₹)" type="number" required value={ev.expectedCash} onChange={(e) => setE('expectedCash')(e.target.value)} error={evErr.expectedCash} />
              <TextField label="Actual cash found (₹)" type="number" required value={ev.actualCash} onChange={(e) => setE('actualCash')(e.target.value)} error={evErr.actualCash} />
              <div className="flex flex-col justify-end pb-1 text-[12px]">
                Difference: <b className={diff == null ? '' : diff < 0 ? 'text-red-600' : diff > 0 ? 'text-amber-700' : 'text-emerald-700'}>{diff == null ? '—' : `${signedInr(diff)} ${diff < 0 ? 'Shortage' : diff > 0 ? 'Overage' : 'Nil'}`}</b>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-ink">Documents / photos *</label>
              <div className="flex gap-2">
                <input type="file" accept={apiEnabled ? '.jpg,.jpeg,.png,.pdf' : 'image/*,.pdf'} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setEv((p) => ({ ...p, docs: [...p.docs, f.name] })); setFiles((x) => [...x, f]) } }} className="text-[12px]" />
                {!apiEnabled && (
                  <>
                    <input value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="or type a file name" className="h-8 flex-1 rounded-md border border-line px-2 text-[12px]" />
                    <Button size="sm" variant="secondary" onClick={() => { if (doc.trim()) { setEv((p) => ({ ...p, docs: [...p.docs, doc.trim()] })); setDoc('') } }}>Add</Button>
                  </>
                )}
              </div>
              {ev.docs.length > 0 && <p className="mt-1 text-[11.5px] text-ink-2">{ev.docs.join(', ')}</p>}
              {evErr.docs && <p className="mt-1 text-[11px] text-brand-red">{evErr.docs}</p>}
            </div>
            <TextAreaField label="Remarks" value={ev.remarks} onChange={(e) => setE('remarks')(e.target.value)} />
            <Note tone="blue">OTC on record: {r.otc?.code ?? 'none'}. Each opening is saved as its own event row and is never overwritten.</Note>
          </>
        )}
        {kind === 'cash' && (
          <>
            <TextField label={`${r.funding === 'Full Funding' ? 'Replaced' : 'Loaded'} amount (₹)`} type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            <TextAreaField label="Remarks" value={text} onChange={(e) => setText(e.target.value)} />
            <AckBox lang={lang} onLang={setLang} checked={ack} onChecked={setAck} />
            <Note tone="blue">On save the entry goes to the <b>{ledgerOf(r.funding)}</b> only (funding model {r.funding}).</Note>
          </>
        )}
        {err && <Note tone="red">{err}</Note>}
      </div>
    </Modal>
  )
}
