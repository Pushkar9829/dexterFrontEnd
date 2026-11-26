import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, FileCheck2, GitBranch, ShieldAlert, ShieldCheck, ThumbsUp, XCircle } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FileDrop, TextAreaField, TextField, type FileValue } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { can, useRole } from '@/lib/rbac'
import { TRANSFER_STAGES, nowIso, usePortability, useNetwork, useSites, type TransferRequest } from '@/data/network'
import { actor, applyTransfer, fmtDate, fmtDateTime, mappingView, membersFor, nameOf, patchTransfer, patchTransferMeta, refLabel, today, usePortExtra, usePortabilityLoad } from './model'
import { ActivityLog, Check3, Crumbs, InfoGrid, PageTitle, Panel, Stepper } from './ui'

type Dialog = 'reject' | 'override' | null

export default function TransferDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { transfers } = usePortability()
  usePortabilityLoad() // API mode: hydrate from /transfers + /exits
  const extra = usePortExtra()
  const net = useNetwork()
  const sites = useSites()
  const role = useRole()
  const t = transfers.find((x) => x.id === id)
  const meta = extra.transferMeta[id]

  const [noc, setNoc] = useState<FileValue>(null)
  const [nocBy, setNocBy] = useState('')
  const [acceptRemark, setAcceptRemark] = useState('')
  const [checks, setChecks] = useState({ docs: false, noc: false, email: false })
  const [approveRemark, setApproveRemark] = useState('')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [dlgText, setDlgText] = useState('')
  const [dlgErr, setDlgErr] = useState('')
  const [err, setErr] = useState('')
  const closeDialog = useCallback(() => {
    setDialog(null)
    setDlgText('')
    setDlgErr('')
  }, [setDialog, setDlgText, setDlgErr])

  if (!t)
    return (
      <div className="max-w-[1200px] space-y-4">
        <Crumbs trail={[{ label: 'Transfer & Portability', to: '/franchise/transfers' }, { label: id }]} />
        <Panel title="Transfer request not found">
          <p className="text-[12.5px] text-slate-600">No transfer request with ID {id} exists.</p>
          <Link to="/franchise/transfers" className="mt-3 inline-block text-[12px] font-semibold text-[#0066FF] hover:underline">Back to Transfer & Portability</Link>
        </Panel>
      </div>
    )

  const isSuper = role === 'Super Admin'
  const final = t.status === 'Rejected' || t.status === 'Completed'
  const stage = Math.min(t.stage, TRANSFER_STAGES.length - 1)
  const view = meta?.snapshot ?? mappingView(t.current, t.next, net)
  const willMove = final ? [] : membersFor(t, meta, net, sites)
  const canReject = !final && t.status !== 'Approved' && (stage < 4 ? can('Reject', role) : isSuper)
  const canOverride = isSuper && !final && t.status !== 'Approved' && !t.documents.noc

  const step = (patch: Partial<TransferRequest>, text: string, msg: string) => {
    patchTransfer(t.id, patch, text)
    setErr('')
    toast(msg)
  }

  const uploadNoc = () => {
    if (!noc) return setErr('Upload the NOC document first')
    if (!nocBy.trim()) return setErr('Enter who issued the NOC')
    step({ documents: { ...t.documents, noc: noc.name }, stage: 2, status: 'Under Review' }, `NOC submitted (${noc.name}), issued by ${nocBy.trim()}`, 'NOC recorded')
  }
  const accept = () => {
    patchTransferMeta(t.id, { acceptRemark: acceptRemark.trim() || undefined })
    step({ newParentAccepted: true, stage: 3, status: 'Under Review' }, `Transfer accepted by new parent ${t.next.name}${acceptRemark.trim() ? ` — ${acceptRemark.trim()}` : ''}`, 'New parent acceptance recorded')
  }
  const verify = () => {
    if (!checks.docs || !checks.noc || !checks.email) return setErr('All three verification checks are required')
    step({ crmVerified: true, crmVerifiedBy: actor(), stage: 4, status: 'Under Review' }, 'CRM / Admin verification complete: documents, NOC and email communication checked', 'Verification recorded')
  }
  const approve = () => {
    if (!isSuper) return
    const at = nowIso()
    patchTransferMeta(t.id, { approvedAt: at })
    step({ adminApproval: { by: actor(), at, decision: 'Approved', remark: approveRemark.trim() || 'Approved' }, stage: 5, status: 'Approved' }, `Final approval given by Super Admin${approveRemark.trim() ? ` — ${approveRemark.trim()}` : ''}`, 'Transfer approved')
  }
  const apply = () => {
    const moved = applyTransfer(t)
    patchTransfer(t.id, { stage: 6, status: 'Completed' }, `New mapping applied: ${moved.length} node(s) remapped to ${t.next.name}; old mappings preserved in history`, { before: t.current.name, after: t.next.name })
    toast(`Mapping applied — ${moved.length} node(s) moved`)
  }
  const confirmDialog = () => {
    const text = dlgText.trim()
    if (!text) return setDlgErr(dialog === 'reject' ? 'Rejection reason is required' : 'Override remark is required')
    if (dialog === 'reject') {
      patchTransferMeta(t.id, { rejectReason: text })
      patchTransfer(t.id, { status: 'Rejected', adminApproval: { by: actor(), at: nowIso(), decision: 'Rejected', remark: text } }, `Rejected at "${TRANSFER_STAGES[stage]}" — ${text}`)
      toast('Transfer request rejected')
    } else if (dialog === 'override' && isSuper) {
      const at = nowIso()
      patchTransferMeta(t.id, { overrideRemark: text, approvedAt: at })
      patchTransfer(
        t.id,
        { nocOverride: true, adminApproval: { by: actor(), at, decision: 'Approved', remark: `Approved without NOC — ${text}` }, newParentAccepted: true, crmVerified: true, crmVerifiedBy: t.crmVerifiedBy ?? actor(), stage: 5, status: 'Approved' },
        `Super Admin override: approved WITHOUT NOC — ${text}`,
      )
      toast('Approved without NOC (override recorded)')
    }
    closeDialog()
  }

  const futureEff = t.effectiveDate > today()

  return (
    <div className="max-w-[1300px] space-y-4 pb-12">
      <Crumbs trail={[{ label: 'Transfer & Portability', to: '/franchise/transfers' }, { label: t.id }]} />
      <PageTitle
        title={<span className="flex flex-wrap items-center gap-3">{t.id} <Badge tone={toneFor(t.status)}>{t.status}</Badge>{t.nocOverride && <Badge tone="purple">NOC override</Badge>}</span>}
        sub={`${t.type} · requested ${fmtDate(t.requestedOn)} by ${t.requestedBy}`}
        actions={<Button variant="secondary" icon={<ArrowLeft size={14} />} onClick={() => navigate('/franchise/transfers')}>Back</Button>}
      />

      <Panel title="Workflow" sub="NOC-based transfer workflow (§3.4).">
        <Stepper stages={TRANSFER_STAGES} current={stage} done={t.status === 'Completed'} failedAt={t.status === 'Rejected' ? stage : undefined} />
      </Panel>

      {!final && (
        <Panel
          title={`Current step: ${TRANSFER_STAGES[stage]}`}
          action={
            <div className="flex flex-wrap gap-2">
              {canOverride && <Button size="sm" variant="secondary" icon={<ShieldAlert size={13} />} onClick={() => setDialog('override')}>Approve without NOC</Button>}
              {canReject && <Button size="sm" variant="danger" icon={<XCircle size={13} />} onClick={() => setDialog('reject')}>Reject</Button>}
            </div>
          }
        >
          {stage <= 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1.5 text-[11px] font-semibold text-ink">NOC document *</div>
                <FileDrop entity="Transfer" purpose="noc" fileRef={t.id} value={noc} onChange={setNoc} accept=".pdf,image/*" />
              </div>
              <TextField label="NOC issued by (current parent)" required name="noc-by" placeholder={t.current.name} value={nocBy} onChange={(e) => setNocBy(e.target.value)} />
              <div className="md:col-span-2"><Button icon={<FileCheck2 size={14} />} onClick={uploadNoc}>Submit NOC</Button></div>
            </div>
          )}
          {stage === 2 && (
            <div className="space-y-3">
              <p className="text-[12.5px] text-slate-600">The new parent <b>{refLabel(t.next)}</b> must accept the incoming network.</p>
              <TextField label="Acceptance remark" name="acc-remark" value={acceptRemark} onChange={(e) => setAcceptRemark(e.target.value)} />
              <Button icon={<ThumbsUp size={14} />} onClick={accept}>Record acceptance by new parent</Button>
            </div>
          )}
          {stage === 3 && (
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-3">
                <Check3 label={`Documents verified (${[t.documents.requestLetter, ...t.documents.supporting].filter(Boolean).length} file(s))`} checked={checks.docs} onChange={(v) => setChecks((c) => ({ ...c, docs: v }))} />
                <Check3 label={t.documents.noc ? `NOC verified (${t.documents.noc})` : 'NOC verified (no NOC on file)'} checked={checks.noc} disabled={!t.documents.noc && !t.nocOverride} onChange={(v) => setChecks((c) => ({ ...c, noc: v }))} />
                <Check3 label={`Email communication verified (${t.emailRef || 'no ref'})`} checked={checks.email} onChange={(v) => setChecks((c) => ({ ...c, email: v }))} />
              </div>
              {!t.documents.noc && <p className="text-[11.5px] text-amber-700">No NOC on file — only a Super Admin can approve this transfer without NOC.</p>}
              <Button icon={<ShieldCheck size={14} />} onClick={verify}>Mark verified</Button>
            </div>
          )}
          {stage === 4 && (
            <div className="space-y-3">
              <TextField label="Approval remark" name="appr-remark" value={approveRemark} onChange={(e) => setApproveRemark(e.target.value)} disabled={!isSuper} />
              <Button icon={<CheckCircle2 size={14} />} onClick={approve} disabled={!isSuper}>Final Approval</Button>
              {!isSuper && <p className="text-[11.5px] text-amber-700">Final approval of SMF / MF / FR transfers is limited to Super Admin (§25). You are signed in as {role}.</p>}
            </div>
          )}
          {stage === 5 && (
            <div className="space-y-3">
              <p className="text-[12.5px] text-slate-600">
                Approved by {t.adminApproval?.by} on {fmtDate(t.adminApproval?.at)}. Applying the mapping moves <b>{willMove.length}</b> node(s) to <b>{t.next.name}</b>. Old mappings stay in each node's history.
              </p>
              {futureEff && <p className="text-[11.5px] text-amber-700">Effective date is {fmtDate(t.effectiveDate)} — applying now records the change today.</p>}
              <Button icon={<GitBranch size={14} />} onClick={apply} disabled={!(isSuper || role === 'Admin')}>Apply new mapping</Button>
              {!(isSuper || role === 'Admin') && <p className="text-[11.5px] text-amber-700">Only Admin or Super Admin can apply the mapping.</p>}
            </div>
          )}
          {err && <p className="mt-3 text-[11.5px] text-brand-red">{err}</p>}
        </Panel>
      )}

      {t.status === 'Rejected' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-800">
          Rejected by {t.adminApproval?.by ?? '—'} on {fmtDateTime(t.adminApproval?.at)} — {meta?.rejectReason ?? t.adminApproval?.remark ?? 'No reason recorded'}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Existing Mapping">
          <InfoGrid cols={2} items={[['Current SMF', refLabel(view.curSmf ?? undefined)], ['Current MF', refLabel(view.curMf ?? undefined)], ['Current Parent', `${refLabel(t.current)} · ${t.current.kind}`]]} />
        </Panel>
        <Panel title="New Mapping">
          <InfoGrid cols={2} items={[['New SMF', refLabel(view.newSmf ?? undefined)], ['New MF', refLabel(view.newMf ?? undefined)], ['New Parent', `${refLabel(t.next)} · ${t.next.kind}`]]} />
        </Panel>
      </div>

      <Panel title="Request Details">
        <InfoGrid
          items={[
            ['Transfer Type', t.type],
            ['Subject', t.subjectIds.map((s) => `${nameOf(s)} (${s})`).join(', ')],
            ['Transfer Scope', t.scope],
            ['Effective Date', fmtDate(t.effectiveDate)],
            ['Reason', t.reason],
            ['Selected Sites', t.siteIds.length ? t.siteIds.join(', ') : '—'],
            ['Selected MFs', meta?.memberIds?.length ? meta.memberIds.map((m) => `${nameOf(m)} (${m})`).join(', ') : '—'],
            ['Nodes that will move', final ? '—' : willMove.length ? willMove.map((m) => nameOf(m)).join(', ') : 'None'],
          ]}
        />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Documents & Communication">
          <InfoGrid
            cols={2}
            items={[
              ['NOC', t.documents.noc ?? (t.nocOverride ? 'Not required (Super Admin override)' : 'Pending')],
              ['Request Letter', t.documents.requestLetter ?? '—'],
              ['Supporting Documents', t.documents.supporting.length ? t.documents.supporting.join(', ') : '—'],
              ['Email Reference', t.emailRef || '—'],
              ['Correspondence', t.correspondence || '—'],
            ]}
          />
        </Panel>
        <Panel title="Approval">
          <InfoGrid
            cols={2}
            items={[
              ['New Parent Acceptance', t.newParentAccepted ? `Accepted${meta?.acceptRemark ? ` — ${meta.acceptRemark}` : ''}` : 'Pending'],
              ['CRM Verification', t.crmVerified ? `Verified by ${t.crmVerifiedBy ?? '—'}` : 'Pending'],
              ['Admin Approval', t.adminApproval ? `${t.adminApproval.decision} by ${t.adminApproval.by} · ${fmtDate(t.adminApproval.at)}` : 'Pending'],
              ['Approval Remark', t.adminApproval?.remark ?? '—'],
              ['NOC Override', t.nocOverride ? `Yes — ${meta?.overrideRemark ?? 'recorded'}` : 'No'],
            ]}
          />
        </Panel>
      </div>

      {meta?.moved && (
        <Panel title="Applied Mapping" sub={`Applied ${fmtDateTime(meta.appliedAt)}. Old mappings remain in each node's history.`}>
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                <th className="py-2 pr-3">Node</th>
                <th className="py-2 pr-3">Old Parent</th>
                <th className="py-2">New Parent</th>
              </tr>
            </thead>
            <tbody>
              {meta.moved.map((m) => (
                <tr key={m.frId} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{m.name} ({m.frId})</td>
                  <td className="py-2 pr-3">{refLabel(m.from)}</td>
                  <td className="py-2">{refLabel(m.to)}</td>
                </tr>
              ))}
              {meta.moved.length === 0 && (
                <tr><td colSpan={3} className="py-2 text-slate-500">No node needed to move (already mapped to the new parent).</td></tr>
              )}
            </tbody>
          </table>
        </Panel>
      )}

      <Panel title="Activity Log">
        <ActivityLog log={t.log} />
      </Panel>

      {dialog && (
        <Modal
          title={dialog === 'reject' ? 'Reject transfer request' : 'Approve without NOC'}
          sub={dialog === 'reject' ? 'The rejection reason is recorded in the activity log and audit trail.' : 'Super Admin / Director power (§6.1 note). The override and remark are recorded.'}
          onClose={closeDialog}
          footer={
            <>
              <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
              <Button variant={dialog === 'reject' ? 'danger' : 'primary'} onClick={confirmDialog}>{dialog === 'reject' ? 'Reject' : 'Approve without NOC'}</Button>
            </>
          }
        >
          <TextAreaField
            label={dialog === 'reject' ? 'Rejection reason' : 'Override remark'}
            required
            name="dlg-text"
            value={dlgText}
            onChange={(e) => {
              setDlgText(e.target.value)
              setDlgErr('')
            }}
            error={dlgErr}
          />
        </Modal>
      )}
    </div>
  )
}
