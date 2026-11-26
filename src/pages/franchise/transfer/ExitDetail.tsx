import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, LogOut, Send, XCircle } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RadioGroup, TextAreaField } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { can, useRole } from '@/lib/rbac'
import { nowIso, usePortability, useNetwork, type ExitRequest, type ParentKind } from '@/data/network'
import { HANDOVER_KINDS, actor, executeExit, fmtDate, fmtDateTime, handoverOptions, liveChildren, nameOf, patchExit, patchExitMeta, refLabel, usePortExtra, usePortabilityLoad } from './model'
import { ActivityLog, Check3, Crumbs, InfoGrid, PageTitle, Panel, Stepper } from './ui'

const EXIT_STAGES = ['Exit Requested', 'Checklist & Review', 'Super Admin Approval', 'Exit Executed'] as const
const stageOf = (s: ExitRequest['status']) => (s === 'Requested' ? 1 : s === 'Under Review' ? 2 : 3)
const CHECKS: { key: 'settlementCleared' | 'documentsReturned' | 'nocIssued'; label: string }[] = [
  { key: 'settlementCleared', label: 'Settlement cleared' },
  { key: 'documentsReturned', label: 'Documents returned' },
  { key: 'nocIssued', label: 'NOC issued' },
]

export default function ExitDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { exits } = usePortability()
  usePortabilityLoad() // API mode: hydrate from /transfers + /exits
  const extra = usePortExtra()
  const net = useNetwork()
  const role = useRole()
  const e = exits.find((x) => x.id === id)
  const meta = extra.exitMeta[id]

  const [kind, setKind] = useState<ParentKind | ''>('')
  const [targetId, setTargetId] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectText, setRejectText] = useState('')
  const [rejectErr, setRejectErr] = useState('')
  const [err, setErr] = useState('')
  const closeReject = useCallback(() => {
    setRejectOpen(false)
    setRejectText('')
    setRejectErr('')
  }, [setRejectOpen, setRejectText, setRejectErr])

  if (!e)
    return (
      <div className="max-w-[1100px] space-y-4">
        <Crumbs trail={[{ label: 'Exit Management', to: '/franchise/exits' }, { label: id }]} />
        <Panel title="Exit request not found">
          <p className="text-[12.5px] text-slate-600">No exit request with ID {id} exists.</p>
          <Link to="/franchise/exits" className="mt-3 inline-block text-[12px] font-semibold text-[#0066FF] hover:underline">Back to Exit Management</Link>
        </Panel>
      </div>
    )

  const isSuper = role === 'Super Admin'
  const isAdmin = isSuper || role === 'Admin'
  const open = e.status === 'Requested' || e.status === 'Under Review'
  const node = net.nodes[e.frId]
  const kids = e.status === 'Exited' ? [] : liveChildren(net, e.frId)
  const checklistDone = e.settlementCleared && e.documentsReturned && e.nocIssued
  const handoverMissing = kids.length > 0 && !e.networkTo
  const targets = handoverOptions(kind, e.frId, net)

  const toggle = (k: (typeof CHECKS)[number]['key'], v: boolean) => {
    const label = CHECKS.find((c) => c.key === k)?.label ?? k
    patchExit(e.id, { [k]: v } as Partial<ExitRequest>,`Checklist: ${label} ${v ? 'marked done' : 'unmarked'}`)
  }
  const saveHandover = () => {
    const t = targets.find((x) => x.id === targetId)
    if (!t) return setErr('Select who receives the network')
    patchExit(e.id, { networkTo: t }, `Network hand-over target set to ${t.name} (${t.kind})`, { before: e.networkTo?.name, after: t.name })
    setKind('')
    setTargetId('')
    setErr('')
    toast('Hand-over target saved')
  }
  const sendForApproval = () => {
    if (!checklistDone) return setErr('Complete the exit checklist first')
    if (handoverMissing) return setErr('Set the network hand-over target first')
    patchExit(e.id, { status: 'Under Review' }, 'Checklist complete — sent to Super Admin for approval')
    setErr('')
    toast('Sent for approval')
  }
  const approve = () => {
    if (!isSuper) return
    if (!checklistDone) return setErr('The exit checklist is not complete')
    if (handoverMissing) return setErr('Set the network hand-over target first')
    patchExitMeta(e.id, { approvedAt: nowIso() })
    patchExit(e.id, { status: 'Approved', approvedBy: actor() }, 'Exit approved by Super Admin')
    setErr('')
    toast('Exit approved')
  }
  const execute = () => {
    if (handoverMissing) return setErr('Set the network hand-over target first')
    const moved = executeExit(e)
    patchExit(e.id, { status: 'Exited' }, `Exit executed: ${nameOf(e.frId)} set to Exited${moved.length ? `; ${moved.length} child node(s) handed over to ${e.networkTo?.name}` : ''}. History preserved.`)
    toast('Exit completed')
  }
  const reject = () => {
    const text = rejectText.trim()
    if (!text) return setRejectErr('Rejection reason is required')
    patchExitMeta(e.id, { rejectReason: text })
    patchExit(e.id, { status: 'Rejected' }, `Exit rejected — ${text}`)
    closeReject()
    toast('Exit request rejected')
  }

  return (
    <div className="max-w-[1200px] space-y-4 pb-12">
      <Crumbs trail={[{ label: 'Exit Management', to: '/franchise/exits' }, { label: e.id }]} />
      <PageTitle
        title={<span className="flex flex-wrap items-center gap-3">{e.id} <Badge tone={e.status === 'Exited' ? 'gray' : toneFor(e.status)}>{e.status}</Badge></span>}
        sub={`${e.tier} exit · ${nameOf(e.frId)} (${e.frId}) · requested ${fmtDate(e.requestedOn)}`}
        actions={<Button variant="secondary" icon={<ArrowLeft size={14} />} onClick={() => navigate('/franchise/exits')}>Back</Button>}
      />

      <Panel title="Workflow">
        <Stepper stages={EXIT_STAGES} current={stageOf(e.status)} done={e.status === 'Exited'} failedAt={e.status === 'Rejected' ? 2 : undefined} />
      </Panel>

      {e.status === 'Rejected' && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-800">Rejected — {meta?.rejectReason ?? 'no reason recorded'}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Exit Details">
          <InfoGrid
            cols={2}
            items={[
              ['Party', `${nameOf(e.frId)} (${node?.code ?? e.frId})`],
              ['Tier', e.tier],
              ['Node status', node?.status ?? '—'],
              ['Current parent', node ? `${node.parent.name} (${node.parent.kind})` : '—'],
              ['Reason', e.reason],
              ['Effective Date', fmtDate(meta?.effectiveDate)],
              ['Requested By', meta?.requestedBy ?? e.log[0]?.by ?? '—'],
              ['Approved By', e.approvedBy ? `${e.approvedBy}${meta?.approvedAt ? ` · ${fmtDate(meta.approvedAt)}` : ''}` : '—'],
              ['Remark', meta?.remark ?? '—'],
            ]}
          />
        </Panel>
        <Panel title="Exit Checklist" sub="All three items are required before approval.">
          <div className="grid gap-2">
            {CHECKS.map((c) => (
              <Check3 key={c.key} label={c.label} checked={e[c.key]} disabled={!open} onChange={(v) => toggle(c.key, v)} />
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Network Hand-over" sub="§27 rule 9: the exiting party's network goes to another SMF / MF, a Team Leader or the Company.">
        {e.status === 'Exited' ? (
          meta?.moved?.length ? (
            <ul className="space-y-1 text-[12px]">
              {meta.moved.map((m) => (
                <li key={m.frId}>{m.name} ({m.frId}): {refLabel(m.from)} → <b>{refLabel(m.to)}</b></li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-slate-600">No network was attached to this party at exit.</p>
          )
        ) : (
          <>
            <InfoGrid cols={2} items={[['Active network', kids.length ? `${kids.length} node(s): ${kids.slice(0, 6).map((k) => nameOf(k.frId)).join(', ')}${kids.length > 6 ? '…' : ''}` : 'None'], ['Hand-over target', e.networkTo ? `${refLabel(e.networkTo)} · ${e.networkTo.kind}` : kids.length ? <span key="missing" className="text-brand-red">Not set (mandatory)</span> : 'Not required']]} />
            {open && kids.length > 0 && (
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <RadioGroup<ParentKind> label={e.networkTo ? 'Change hand-over to' : 'Hand over to'} value={kind} onChange={(v) => { setKind(v); setTargetId(v === 'Company' ? 'DEXTER' : '') }} options={HANDOVER_KINDS(e.tier)} />
                <div>
                  <label htmlFor="exit-target" className="mb-1.5 block text-[11px] font-semibold text-ink">Receiving party</label>
                  <select id="exit-target" value={targetId} disabled={!kind || kind === 'Company'} onChange={(ev) => setTargetId(ev.target.value)} className={cn('h-9 w-full rounded-md border border-line bg-white px-[11px] text-[12.5px] text-ink outline-none disabled:bg-surface disabled:text-muted')}>
                    <option value="">Select</option>
                    {targets.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                    ))}
                  </select>
                </div>
                <Button variant="secondary" onClick={saveHandover} disabled={!kind}>Save hand-over</Button>
              </div>
            )}
          </>
        )}
      </Panel>

      {(open || e.status === 'Approved') && (
        <Panel
          title={e.status === 'Requested' ? 'Next step: send for approval' : e.status === 'Under Review' ? 'Next step: Super Admin approval' : 'Next step: execute exit'}
          action={open && can('Reject', role) ? <Button size="sm" variant="danger" icon={<XCircle size={13} />} onClick={() => setRejectOpen(true)}>Reject</Button> : undefined}
        >
          {e.status === 'Requested' && <Button icon={<Send size={14} />} onClick={sendForApproval}>Send for approval</Button>}
          {e.status === 'Under Review' && (
            <div className="space-y-2">
              <Button icon={<CheckCircle2 size={14} />} onClick={approve} disabled={!isSuper || !checklistDone || handoverMissing}>Approve exit</Button>
              {!isSuper && <p className="text-[11.5px] text-amber-700">Admin can request an exit; only Super Admin can approve it (§25). You are signed in as {role}.</p>}
              {isSuper && (!checklistDone || handoverMissing) && <p className="text-[11.5px] text-amber-700">Complete the checklist{handoverMissing ? ' and set the hand-over target' : ''} to approve.</p>}
            </div>
          )}
          {e.status === 'Approved' && (
            <div className="space-y-2">
              <p className="text-[12.5px] text-slate-600">
                Executing sets {nameOf(e.frId)} to <b>Exited</b>{kids.length && e.networkTo ? <> and hands {kids.length} node(s) over to <b>{e.networkTo.name}</b></> : null}. Old mappings stay in history.
              </p>
              <Button icon={<LogOut size={14} />} onClick={execute} disabled={!isAdmin}>Execute exit</Button>
              {!isAdmin && <p className="text-[11.5px] text-amber-700">Only Admin or Super Admin can execute an approved exit.</p>}
            </div>
          )}
          {err && <p className="mt-2 text-[11.5px] text-brand-red">{err}</p>}
        </Panel>
      )}

      {e.status === 'Exited' && meta?.exitedAt && <p className="text-[12px] text-slate-500">Exited on {fmtDateTime(meta.exitedAt)}.</p>}

      <Panel title="Activity Log">
        <ActivityLog log={e.log} />
      </Panel>

      {rejectOpen && (
        <Modal
          title="Reject exit request"
          sub="The reason is recorded in the activity log and audit trail."
          onClose={closeReject}
          footer={
            <>
              <Button variant="secondary" onClick={closeReject}>Cancel</Button>
              <Button variant="danger" onClick={reject}>Reject</Button>
            </>
          }
        >
          <TextAreaField label="Rejection reason" required name="exit-reject" value={rejectText} onChange={(ev) => { setRejectText(ev.target.value); setRejectErr('') }} error={rejectErr} />
        </Modal>
      )}
    </div>
  )
}
