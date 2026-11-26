import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, GitBranch, History, List, Pencil, Power, PowerOff, Send, ShieldAlert, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextAreaField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { logPayout, planMappingStore, usePlans } from '@/data/payout'
import { PayoutPage } from '../PayoutShell'
import {
  approvalBlock, approvePlan, currentUser, deletePlanVersion, fmtDate, fmtDateTime, makerOf, planKey, planTotal, rs, stepIssues, today, upsertPlan, versionsOf, withHistory, type PlanX,
} from './model'
import { PlanSummary } from './summary'
import { IssueList, SectionBar, StatusBadge, tdCls, theadCls, thCls } from './ui'

type Dialog = 'reject' | 'deactivate' | 'delete' | null

export default function PlanView() {
  const { code = '' } = useParams()
  const [sp, setSp] = useSearchParams()
  const navigate = useNavigate()
  const plans = usePlans()
  const mappings = planMappingStore.use()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [reason, setReason] = useState('')
  const [reasonErr, setReasonErr] = useState('')

  const versions = versionsOf(plans, code) as PlanX[]
  const wanted = Number(sp.get('v'))
  const plan = versions.find((p) => p.version === wanted) ?? versions[0]

  if (!plan)
    return (
      <PayoutPage title="Plan not found" crumbs={['Plan Mapping', code]}>
        <div className="rounded-xl border border-line bg-white p-6 text-[13px]">
          No plan with code {code}. <Link to="/finance/payouts/plans" className="font-semibold text-[#0066FF] hover:underline">Back to the plan list</Link>
        </div>
      </PayoutPage>
    )

  const latest = versions[0]
  const isLatest = plan.version === latest.version
  const block = approvalBlock(plan)
  const issues = stepIssues(plan, plans).flat()
  const usedBy = (v: number) => mappings.filter((m) => m.planCode === plan.code && m.planVersion === v)
  const liveMappings = usedBy(plan.version).filter((m) => m.status === 'Active' || m.status === 'Pending Approval')
  const by = currentUser()

  const closeDialog = () => {
    setDialog(null)
    setReason('')
    setReasonErr('')
  }
  const submit = () => {
    if (issues.length) return toast('This draft is incomplete — open Edit and finish every step', 'error')
    upsertPlan(withHistory({ ...plan, status: 'Pending Approval', submittedBy: by }, 'Submitted for approval'))
    logPayout({ by, area: 'Plan Mapping', ref: plan.code, action: `Plan v${plan.version} submitted for approval` })
    toast(`${plan.code} v${plan.version} submitted for approval`)
  }
  const approve = () => {
    if (block) return toast(block, 'error')
    approvePlan(plan)
    toast(`${plan.code} v${plan.version} approved — now Active`)
  }
  const reject = () => {
    if (reason.trim().length < 5) return setReasonErr('Give a reason (at least 5 characters).')
    const back = plan.reactivation ? 'Inactive' : 'Draft'
    upsertPlan({ ...withHistory(plan, `Rejected: ${reason.trim()}`), status: back, reactivation: false, submittedBy: undefined })
    logPayout({ by, area: 'Plan Mapping', ref: plan.code, action: `Plan v${plan.version} rejected`, after: reason.trim() })
    toast(`${plan.code} v${plan.version} rejected — returned to ${back}`, 'info')
    closeDialog()
  }
  const deactivate = () => {
    if (reason.trim().length < 5) return setReasonErr('Give a reason (at least 5 characters).')
    const end = plan.effectiveTo && plan.effectiveTo < today() ? plan.effectiveTo : today()
    upsertPlan({ ...withHistory(plan, `Deactivated: ${reason.trim()}`), status: 'Inactive', effectiveTo: end })
    logPayout({ by, area: 'Plan Mapping', ref: plan.code, action: `Plan v${plan.version} deactivated`, before: 'Active', after: 'Inactive' })
    toast(`${plan.code} v${plan.version} deactivated`, 'info')
    closeDialog()
  }
  const requestActivation = () => {
    upsertPlan({ ...withHistory(plan, 'Re-activation requested'), status: 'Pending Approval', reactivation: true, submittedBy: by, effectiveTo: null })
    logPayout({ by, area: 'Plan Mapping', ref: plan.code, action: `Plan v${plan.version} re-activation requested` })
    toast('Re-activation sent for approval — a different user must approve it')
  }
  const remove = () => {
    deletePlanVersion(plan)
    toast(`Draft ${plan.code} v${plan.version} deleted`)
    closeDialog()
    navigate(versions.length > 1 ? `/finance/payouts/plans/${plan.code}` : '/finance/payouts/plans')
  }

  const timeline = versions.flatMap((v) => v.history.map((h, i) => ({ ...h, key: `${planKey(v)}-${i}` }))).sort((a, b) => b.at.localeCompare(a.at))
  const btn = 'w-[150px]'

  return (
    <PayoutPage
      title={plan.name || 'Untitled draft'}
      sub={`${plan.code} · version ${plan.version} · ${plan.vertical} · ${plan.siteCategory || '—'}`}
      crumbs={['Plan Mapping', `${plan.code} v${plan.version}`]}
      actions={
        <Link to="/finance/payouts/plans" className="flex h-10 w-[150px] items-center justify-center gap-2 rounded-lg border-2 border-[#0b2a6b] bg-white text-[13px] font-semibold text-[#0b2a6b] hover:bg-surface"><List size={16} /> Plan List</Link>
      }
    >
      <section className="space-y-3 rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={plan.status} />
          {plan.reactivation && <span className="text-[12px] text-amber-700">Re-activation request</span>}
          <span className="text-[12.5px] text-ink-2">Total investment <b className="tabular-nums">₹{rs(planTotal(plan))}</b></span>
          <span className="text-[12.5px] text-ink-2">Created by <b>{plan.createdBy}</b>{plan.submittedBy && plan.status === 'Pending Approval' ? <> · submitted by <b>{makerOf(plan)}</b></> : null}{plan.approvedBy ? <> · approved by <b>{plan.approvedBy}</b></> : null}</span>
          {!isLatest && <span className="rounded bg-slate-100 px-2 py-0.5 text-[11.5px] text-slate-600">Older version — kept for historical calculations</span>}
          <div className="ml-auto flex flex-wrap gap-2">
            {plan.status === 'Draft' && (
              <>
                <Button variant="secondary" className={btn} icon={<Pencil size={14} />} onClick={() => navigate(`/finance/payouts/plans/${plan.code}/edit`)}>Edit</Button>
                <Button variant="danger" className={btn} icon={<Trash2 size={14} />} onClick={() => setDialog('delete')}>Delete draft</Button>
                <Button variant="bright" className={btn} icon={<Send size={14} />} onClick={submit}>Submit</Button>
              </>
            )}
            {plan.status === 'Pending Approval' && (
              <>
                <Button variant="danger" className={btn} icon={<XCircle size={14} />} disabled={!!block} title={block ?? undefined} onClick={() => setDialog('reject')}>Reject</Button>
                <Button className={cn(btn, 'bg-emerald-600 hover:bg-emerald-700')} icon={<CheckCircle2 size={14} />} disabled={!!block} title={block ?? undefined} onClick={approve}>Approve</Button>
              </>
            )}
            {plan.status === 'Active' && (
              <>
                {isLatest && <Button variant="secondary" className={btn} icon={<Pencil size={14} />} onClick={() => navigate(`/finance/payouts/plans/${plan.code}/edit`)}>New version</Button>}
                <Button variant="danger" className={btn} icon={<PowerOff size={14} />} onClick={() => setDialog('deactivate')}>Deactivate</Button>
                <Link to="/finance/payouts/plans/mapping" className="flex h-[38px] w-[150px] items-center justify-center gap-2 rounded-lg bg-[#0066FF] text-[12px] font-semibold text-white"><GitBranch size={14} /> Map to sites</Link>
              </>
            )}
            {plan.status === 'Inactive' && isLatest && (
              <>
                <Button variant="secondary" className={btn} icon={<Pencil size={14} />} onClick={() => navigate(`/finance/payouts/plans/${plan.code}/edit`)}>New version</Button>
                <Button className={btn} icon={<Power size={14} />} onClick={requestActivation}>Activate</Button>
              </>
            )}
          </div>
        </div>
        {plan.status === 'Pending Approval' && block && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800"><ShieldAlert size={15} className="mt-px shrink-0" />{block}</p>
        )}
        {plan.status === 'Draft' && issues.length > 0 && <IssueList items={issues} title="Incomplete — finish these before submitting" />}
      </section>

      <section className="space-y-3 rounded-xl border border-line bg-white p-4">
        <SectionBar icon={<History size={16} />} title="Version History" sub="Older versions are never overwritten — mappings keep the version they were made with (§10.3)." />
        <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className={theadCls}>{['Version', 'Status', 'Effective From', 'Effective To', 'Total Investment (₹)', 'Plan Category', 'Created By', 'Approved By', 'Site Mappings', 'Action'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={planKey(v)} className={cn('border-t border-line-soft', v.version === plan.version && 'bg-[#f3f7ff]')}>
                  <td className={cn(tdCls, 'font-semibold')}>v{v.version}</td>
                  <td className={tdCls}><StatusBadge status={v.status} /></td>
                  <td className={tdCls}>{fmtDate(v.effectiveFrom)}</td>
                  <td className={tdCls}>{v.effectiveTo ? fmtDate(v.effectiveTo) : 'Open'}</td>
                  <td className={cn(tdCls, 'text-right tabular-nums')}>{rs(planTotal(v))}</td>
                  <td className={tdCls}>{v.planCategory}</td>
                  <td className={tdCls}>{v.createdBy}</td>
                  <td className={tdCls}>{v.approvedBy ?? '—'}</td>
                  <td className={tdCls}>{usedBy(v.version).length}</td>
                  <td className={tdCls}>
                    {v.version === plan.version ? <span className="text-[11px] text-muted">Viewing</span> : (
                      <button type="button" onClick={() => setSp({ v: String(v.version) })} className="text-[11.5px] font-semibold text-[#0066FF] hover:underline">View v{v.version}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h4 className="mb-1.5 text-[12px] font-semibold text-ink">Activity</h4>
          <ol className="space-y-1 text-[12px] text-ink-2">
            {timeline.map((h) => (
              <li key={h.key} className="flex flex-wrap gap-x-2"><span className="w-[150px] shrink-0 text-muted">{fmtDateTime(h.at)}</span><span className="w-10 font-semibold">v{h.version}</span><span>{h.note}</span><span className="text-muted">— {h.by}</span></li>
            ))}
            {!timeline.length && <li className="text-muted">No activity yet.</li>}
          </ol>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-4">
        <PlanSummary plan={plan} />
      </section>

      {dialog === 'reject' && (
        <Modal title={`Reject ${plan.code} v${plan.version}?`} sub={plan.reactivation ? 'The plan returns to Inactive.' : 'The version returns to Draft for the maker to correct.'} onClose={closeDialog}
          footer={<><Button variant="secondary" onClick={closeDialog}>Cancel</Button><Button variant="danger" icon={<XCircle size={14} />} onClick={reject}>Reject</Button></>}>
          <TextAreaField label="Reason" required name="reason" value={reason} maxLength={300} onChange={(e) => { setReason(e.target.value); setReasonErr('') }} error={reasonErr} />
        </Modal>
      )}
      {dialog === 'deactivate' && (
        <Modal title={`Deactivate ${plan.code} v${plan.version}?`} sub="The plan stops applying from today; it stays on record for historical calculations." onClose={closeDialog}
          footer={<><Button variant="secondary" onClick={closeDialog}>Cancel</Button><Button variant="danger" icon={<PowerOff size={14} />} onClick={deactivate}>Deactivate</Button></>}>
          {liveMappings.length > 0 && <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">{liveMappings.length} site mapping(s) use this version. They keep their history but no new mappings can be made to an inactive plan.</p>}
          <TextAreaField label="Reason" required name="reason" value={reason} maxLength={300} onChange={(e) => { setReason(e.target.value); setReasonErr('') }} error={reasonErr} />
        </Modal>
      )}
      {dialog === 'delete' && (
        <Modal title="Delete draft?" sub={`${plan.code} v${plan.version}`} onClose={closeDialog}
          footer={<><Button variant="secondary" onClick={closeDialog}>Cancel</Button><Button variant="danger" icon={<Trash2 size={14} />} onClick={remove}>Delete draft</Button></>}>
          <p className="text-[13px] text-ink-2">Only this draft version is removed. This cannot be undone.</p>
        </Modal>
      )}
    </PayoutPage>
  )
}
