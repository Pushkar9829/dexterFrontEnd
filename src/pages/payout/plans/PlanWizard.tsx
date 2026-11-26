import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, GitBranch, Info, List, Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { logPayout, planStore, usePlans, type PayoutPlan } from '@/data/payout'
import { PayoutPage } from '../PayoutShell'
import {
  blankPlan, codeTaken, currentUser, nextPlanCode, nextVersionFrom, stepIssues, upsertPlan, validateDetails, validateValidity, versionsOf, withHistory, type PlanX,
} from './model'
import { PlanSummary } from './summary'
import { StepDetails, StepIncentives, StepSlabs, StepValidity } from './steps'
import { IssueList, PlanListCard, SectionBar, Stepper } from './ui'

const LABELS = ['Plan Details', 'Transaction Slab', 'Incentive & Rental / MG Configuration', 'Preview & Save']
const NEXT = ['Next: Transaction Slab', 'Next: Incentive Configuration', 'Next: Preview & Save']
const SUBS = [
  'Configure ATM payout plan, investment, transaction slabs and incentives.',
  'Configure ATM payout plan, investment, transaction slabs and incentives.',
  'Configure incentives, monthly rental and minimum guarantee.',
  'Review every step, set the validity and save as draft or submit for approval.',
]

type Init =
  | { kind: 'new'; plan: PlanX }
  | { kind: 'draft'; plan: PlanX }
  | { kind: 'version'; plan: PlanX; base: PayoutPlan }
  | { kind: 'blocked'; reason: string; code: string }

function initFor(code: string | undefined, plans: PayoutPlan[]): Init {
  if (!code) return { kind: 'new', plan: blankPlan(nextPlanCode(plans)) }
  const latest = versionsOf(plans, code)[0] as PlanX | undefined
  if (!latest) return { kind: 'blocked', code, reason: `Plan ${code} was not found.` }
  if (latest.status === 'Pending Approval') return { kind: 'blocked', code, reason: `${code} v${latest.version} is awaiting approval. The checker must approve or reject it before it can be edited.` }
  if (latest.status === 'Draft') return { kind: 'draft', plan: structuredClone(latest) }
  return { kind: 'version', plan: nextVersionFrom(latest, plans), base: latest }
}

export default function PlanWizard() {
  const { code } = useParams()
  // re-initialise when moving between /new and /:code/edit
  return <Wizard key={code ?? 'new'} code={code} />
}

function Wizard({ code }: { code?: string }) {
  const navigate = useNavigate()
  const plans = usePlans()
  const [init] = useState<Init>(() => initFor(code, planStore.get()))
  const [plan, setPlan] = useState<PlanX | null>(init.kind === 'blocked' ? null : init.plan)
  const [step, setStep] = useState(0)
  const [show, setShow] = useState([false, false, false, false])
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(init.kind === 'draft')

  if (init.kind === 'blocked' || !plan) {
    const reason = init.kind === 'blocked' ? init.reason : 'Plan not found.'
    return (
      <PayoutPage title="Plan Mapping – Edit Plan" crumbs={['Plan Mapping', 'Edit Plan']}>
        <div className="rounded-xl border border-line bg-white p-6 text-[13px] text-ink-2">
          <p>{reason}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" icon={<List size={14} />} onClick={() => navigate('/finance/payouts/plans')}>Plan List</Button>
            {init.kind === 'blocked' && codeTaken(init.code, plans) && <Button onClick={() => navigate(`/finance/payouts/plans/${init.code}`)}>View plan</Button>}
          </div>
        </div>
        <PlanListCard />
      </PayoutPage>
    )
  }

  const set = (patch: Partial<PlanX>) => setPlan((p) => (p ? { ...p, ...patch } : p))
  const issues = stepIssues(plan, plans)
  const detailErrors = validateDetails(plan, plans)
  if (init.kind === 'new' && !saved && codeTaken(plan.code, plans)) detailErrors.code = `${plan.code} is already used — a new code will be generated on save.`
  const validityErrors = validateValidity(plan, plans)
  const reachable = (i: number) => !editing && (i <= step || issues.slice(0, i).every((x) => x.length === 0))
  const reveal = (i: number) => setShow((s) => s.map((v, k) => (k === i ? true : v)))
  const isVersion = init.kind === 'version'

  const guardEditing = () => {
    if (!editing) return false
    toast('Save (✓) or cancel (✕) the row being edited first', 'info')
    return true
  }
  const go = (i: number) => {
    if (guardEditing()) return
    setStep(i)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const next = () => {
    if (guardEditing()) return
    if (issues[step].length) {
      reveal(step)
      toast(`${issues[step].length} issue(s) on “${LABELS[step]}”`, 'error')
      return
    }
    go(step + 1)
  }

  /** Writes the record. A brand-new plan whose code was taken meanwhile gets the next free code. */
  const persist = (status: 'Draft' | 'Pending Approval', note: string): PlanX => {
    const all = planStore.get()
    let rec: PlanX = { ...plan, status, name: plan.name.trim(), submittedBy: status === 'Pending Approval' ? currentUser() : undefined }
    if (init.kind === 'new' && !saved && codeTaken(rec.code, all)) rec = { ...rec, code: nextPlanCode(all) }
    const first = !saved
    const firstNote = init.kind === 'version' ? `Version ${rec.version} created from v${init.base.version}` : 'Plan created'
    rec = withHistory(first ? withHistory(rec, firstNote) : rec, note)
    upsertPlan(rec)
    setPlan(rec)
    setSaved(true)
    logPayout({ by: rec.createdBy, area: 'Plan Mapping', ref: rec.code, action: `Plan v${rec.version} ${status === 'Draft' ? 'saved as draft' : 'submitted for approval'}` })
    return rec
  }
  const saveDraft = () => {
    if (guardEditing()) return
    if (!plan.name.trim()) {
      setStep(0)
      reveal(0)
      toast('Enter the plan name before saving a draft', 'error')
      return
    }
    const rec = persist('Draft', 'Draft saved')
    toast(`Draft saved — ${rec.code} v${rec.version}`)
  }
  const submit = () => {
    if (guardEditing()) return
    const bad = issues.findIndex((x) => x.length > 0)
    if (bad !== -1) {
      setShow([true, true, true, true])
      setStep(bad)
      toast(`Complete “${LABELS[bad]}” before submitting`, 'error')
      return
    }
    const rec = persist('Pending Approval', 'Submitted for approval')
    toast(`${rec.code} v${rec.version} submitted for approval`)
    navigate(`/finance/payouts/plans/${rec.code}?v=${rec.version}`)
  }
  const cancel = () => navigate('/finance/payouts/plans')

  const title = init.kind === 'new' ? 'Plan Mapping – Create Plan' : 'Plan Mapping – Edit Plan'
  return (
    <PayoutPage
      title={title}
      sub={SUBS[step]}
      crumbs={['Plan Mapping', init.kind === 'new' ? 'Create Plan' : `${plan.code} v${plan.version}`]}
      actions={
        <>
          <Link to="/finance/payouts/plans/mapping" className="flex h-10 w-[150px] items-center justify-center gap-2 rounded-lg border border-line bg-white text-[13px] font-semibold text-ink hover:bg-surface"><GitBranch size={15} /> Site Mapping</Link>
          <Link to="/finance/payouts/plans" className="flex h-10 w-[150px] items-center justify-center gap-2 rounded-lg border-2 border-[#0b2a6b] bg-white text-[13px] font-semibold text-[#0b2a6b] hover:bg-surface"><List size={16} /> Plan List</Link>
        </>
      }
    >
      {isVersion && (
        <p className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12.5px] text-blue-900">
          <Info size={15} className="mt-0.5 shrink-0" />
          {plan.code} v{init.base.version} is {init.base.status}. Active plans are never edited in place — you are preparing <b>version {plan.version}</b> as a draft. Version {init.base.version} stays on record for historical calculations{init.base.status === 'Active' ? ' and remains in force until this version is approved' : ''} (§10.3).
        </p>
      )}
      <Stepper labels={LABELS} step={step} reachable={reachable} onStep={go} />

      <section className="space-y-4 rounded-xl border border-line bg-white p-4">
        {step === 0 && <StepDetails plan={plan} set={set} show={show[0]} errors={detailErrors} codeLocked={init.kind !== 'new'} />}
        {step === 1 && <StepSlabs plan={plan} set={set} show={show[1]} onEditing={setEditing} />}
        {step === 2 && <StepIncentives plan={plan} set={set} show={show[2]} onEditing={setEditing} />}
        {step === 3 && (
          <>
            <SectionBar icon={<Save size={16} />} title="Validity & Tax" sub="Effective dates, fixed fee / CRA cost and TDS (§10.1)" />
            <StepValidity plan={plan} set={set} show={show[3]} errors={validityErrors} />
            {issues.some((x) => x.length) && (
              <div className="space-y-2">
                {issues.map((list, i) => list.length > 0 && (
                  <div key={LABELS[i]} className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1"><IssueList items={list} title={`${LABELS[i]} — ${list.length} issue(s)`} /></div>
                    {i < 3 && <Button variant="secondary" size="sm" onClick={() => go(i)}>Go to step {i + 1}</Button>}
                  </div>
                ))}
              </div>
            )}
            <PlanSummary plan={plan} />
          </>
        )}
        {show[0] && step === 0 && <IssueList items={issues[0]} />}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
          {saved && <span className="mr-auto text-[11.5px] text-muted">Saved as {plan.code} v{plan.version} · {plan.status}</span>}
          {step === 0 ? (
            <Button variant="secondary" className="w-[130px] border-[#0b2a6b] text-[#0b2a6b]" onClick={cancel}>Cancel</Button>
          ) : (
            <Button variant="secondary" className="w-[130px] border-[#0b2a6b] text-[#0b2a6b]" icon={<ChevronLeft size={15} />} onClick={() => go(step - 1)}>Back</Button>
          )}
          <Button variant="secondary" className="w-[150px] border-[#0b2a6b] text-[#0b2a6b]" icon={<Save size={15} />} onClick={saveDraft}>Save Draft</Button>
          {step < 3 ? (
            <Button variant="bright" className="w-[260px]" onClick={next}>{NEXT[step]} <ChevronRight size={15} /></Button>
          ) : (
            <Button variant="bright" className="w-[230px]" icon={<Send size={15} />} onClick={submit}>Submit for Approval</Button>
          )}
        </div>
      </section>

      <PlanListCard highlight={plan.code} />
    </PayoutPage>
  )
}
