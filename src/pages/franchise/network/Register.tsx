import { useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Lock, Save, Send } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { CURRENT_ACTOR, useNetwork } from '@/data/network'
import {
  SLUG_TIER, TIER_LONG, TIER_SHORT, emptyRegForm, getRegistration, newRegistration, nextCode, saveRegistration, sendForApprovalAsync, validateFull,
  type RegErrors, type RegForm, type Registration,
} from './model'
import { RegSections } from './RegSections'
import { BTN_PRIMARY, BTN_SECONDARY, Crumbs, PageHead } from './shared'

/** §2.3 registration form for SMF / MF / FR (Method B — CRM completes the full form). */
export default function Register() {
  const { tier: slug = '' } = useParams()
  const [params] = useSearchParams()
  const regParam = params.get('reg')
  const existing = regParam ? getRegistration(regParam) : undefined
  const tier = existing?.tier ?? SLUG_TIER[slug]
  if (!tier) return <Navigate to="/franchise" replace />
  return <RegisterForm key={`${tier}-${regParam ?? 'new'}`} tier={tier} existing={existing} />
}

function RegisterForm({ tier, existing }: { tier: NonNullable<Registration['tier']>; existing?: Registration }) {
  const navigate = useNavigate()
  const net = useNetwork()
  const [form, setForm] = useState<RegForm>(() => existing?.form ?? emptyRegForm(tier))
  const [errors, setErrors] = useState<RegErrors>({})
  const [regId, setRegId] = useState<string | null>(existing?.id ?? null)
  const short = TIER_SHORT[tier]
  const locked = existing?.stage === 'Pending Approval' || existing?.stage === 'Approved' || existing?.stage === 'Rejected'

  const set = (p: Partial<RegForm>) => {
    setForm((f) => ({ ...f, ...p }))
    setErrors((e) => {
      const keys = Object.keys(p)
      if (!keys.some((k) => k in e || k === 'docs')) return e
      const next = { ...e }
      keys.forEach((k) => delete next[k as keyof RegErrors])
      if ('docs' in p) Object.keys(next).filter((k) => k.startsWith('doc:')).forEach((k) => delete next[k as keyof RegErrors])
      return next
    })
  }

  const persist = (text: string): Registration => {
    const base = (regId && getRegistration(regId)) || newRegistration(tier, 'B', form)
    const reg: Registration = { ...base, form, updatedAt: new Date().toISOString(), log: [{ at: new Date().toISOString(), by: CURRENT_ACTOR, text }, ...base.log] }
    saveRegistration(reg)
    setRegId(reg.id)
    return reg
  }

  const saveDraft = () => {
    if (!form.companyName.trim() && !form.contactName.trim()) {
      setErrors({ companyName: 'Enter at least a name before saving a draft', contactName: 'Enter at least a name before saving a draft' })
      toast('Enter a name before saving the draft', 'error')
      return
    }
    const r = persist('Draft saved')
    toast(`Draft ${r.id} saved`)
  }

  const submit = () => {
    const errs = validateFull(form, tier)
    setErrors(errs)
    const count = Object.keys(errs).length
    if (count) {
      toast(`${count} field(s) need attention before submitting`, 'error')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const r = persist('Full registration completed by CRM (Method B)')
    sendForApprovalAsync(r.id).then((frId) => {
      if (!frId) {
        toast('Could not submit the registration', 'error')
        return
      }
      toast(`${short} registration submitted — waiting for Admin approval`)
      navigate(`/franchise/network/${frId}`)
    })
  }

  return (
    <div className="space-y-4 pb-12 max-w-[1200px]">
      <Crumbs trail={[{ label: 'Onboarding Workflow', to: '/franchise/onboarding' }, { label: `${short} Registration` }]} />
      <PageHead
        title={`${TIER_LONG[tier]} Registration`}
        sub={`Status flow: Draft → Pending Approval → Active (Admin approval required, §25).${existing ? ` Registration ${existing.id} · ${existing.stage}` : ''}`}
        actions={
          <button type="button" onClick={() => navigate(-1)} className={BTN_SECONDARY}>
            <ArrowLeft size={14} /> Back
          </button>
        }
      />

      {existing?.stage === 'Returned' && existing.decision && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
          Returned by {existing.decision.by}: <b>{existing.decision.reason}</b>. Correct the details and submit again.
        </div>
      )}
      {locked && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12.5px] text-slate-700">
          <Lock size={14} /> This registration is {existing?.stage}. Open the network profile to make changes.
        </div>
      )}

      <RegSections tier={tier} form={form} set={set} errors={errors} systemId={existing?.code ?? `${nextCode(tier, net.nodes)} (on submit)`} disabled={locked} />

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2.5 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} className={BTN_SECONDARY}>
          <ArrowLeft size={14} /> Back
        </button>
        <button type="button" onClick={saveDraft} disabled={locked} className={BTN_SECONDARY}>
          <Save size={14} /> Save Draft
        </button>
        <button type="button" onClick={submit} disabled={locked} className={BTN_PRIMARY}>
          <Send size={14} /> Submit for approval
        </button>
      </div>
    </div>
  )
}
