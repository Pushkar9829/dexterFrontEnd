import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Landmark,
  MapPin,
  Store,
  X,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { emptyForm, LOCATIONS, type Application, type ApplicationForm } from '@/data/applications'
import { saveApplication } from '@/data/applicationStore'
import { addFranchise, saveDossier, type Franchise, type Tier } from '@/data/franchises'
import { CraAtms, Documents, FranchiseBank, ImagesOffice, ShopDimensions, SiteDetails, type StepProps } from './steps'
import { Review } from './Review'
import { validateStep, type Errors } from './validate'

export const STEPS_CONFIG = [
  { num: '01', title: 'Site Details', icon: MapPin },
  { num: '02', title: 'Franchise & Bank', icon: Landmark },
  { num: '03', title: 'Shop Dimensions', icon: Store },
  { num: '04', title: 'CRA & ATMs', icon: CreditCard },
  { num: '05', title: 'Documents', icon: FileText },
  { num: '06', title: 'Images & Office', icon: ImageIcon },
  { num: '07', title: 'Review & Submit', icon: ClipboardCheck },
]

const STEP_VIEWS = [SiteDetails, FranchiseBank, ShopDimensions, CraAtms, Documents, ImagesOffice]

const timeNow = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).toUpperCase()

export interface ApplicationWizardProps {
  app?: Application | null
  onClose: () => void
  initialTier?: Tier
  onFranchiseAdded?: (franchise: Franchise) => void
}

/**
 * 7-step WLA Franchise Application form matching the reference design layout.
 */
export function ApplicationWizard({ app, onClose, initialTier, onFranchiseAdded }: ApplicationWizardProps) {
  const readOnly = !!app && app.status !== 'Draft'
  const [id, setId] = useState<string | null>(app?.id ?? null)
  const [form, setForm] = useState<ApplicationForm>(() => {
    if (app?.form) return app.form
    const base = emptyForm()
    if (initialTier) {
      if (initialTier === 'Super Master') base.projectType = 'WLA Franchise Model'
      else if (initialTier === 'Master') base.projectType = 'WLA Franchise Model'
    }
    return base
  })

  // dev/QA aid: ?step=N opens the wizard on step N (1-7)
  const [step, setStep] = useState(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'))
    return q >= 1 && q <= 7 ? q : readOnly ? 7 : 1
  })
  const [errors, setErrors] = useState<Errors>({})
  const [savedAt, setSavedAt] = useState<string | null>(app ? timeNow() : null)
  const dirty = useRef(false)
  const body = useRef<HTMLDivElement>(null)

  // autosave drafts 800 ms after the last change
  useEffect(() => {
    if (readOnly || !dirty.current) return
    const t = setTimeout(() => {
      const saved = saveApplication(id, form, 'Draft')
      setId(saved.id)
      setSavedAt(timeNow())
      dirty.current = false
    }, 800)
    return () => clearTimeout(t)
  }, [form, id, readOnly])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const set = (patch: Partial<ApplicationForm>) => {
    dirty.current = true
    setForm((f) => ({ ...f, ...patch }))
    const keys = Object.keys(patch)
    if (keys.some((k) => errors[k])) {
      setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))))
    }
  }

  const go = (n: number) => {
    setStep(n)
    setErrors({})
    body.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const next = () => {
    const e = validateStep(step, form)
    setErrors(e)
    if (Object.keys(e).length) {
      toast(step === 1 ? 'Please complete required site details to continue.' : 'Please fix the highlighted fields to proceed.', 'info')
      return
    }
    go(step + 1)
  }

  const saveDraft = () => {
    const saved = saveApplication(id, form, 'Draft')
    setId(saved.id)
    setSavedAt(timeNow())
    dirty.current = false
    toast(`Draft ${saved.id} saved successfully.`, 'info')
  }

  const submit = () => {
    for (let s = 1; s <= 4; s++) {
      const e = validateStep(s, form)
      if (Object.keys(e).length) {
        setErrors(e)
        go(s)
        toast(`Step ${s} · ${STEPS_CONFIG[s - 1].title} needs attention before submitting.`, 'info')
        return
      }
    }

    const saved = saveApplication(id, form, 'Under review')

    // If opened from Franchise Management (has initialTier or onFranchiseAdded):
    const frTier: Tier = initialTier ?? (
      form.projectType.includes('Super')
        ? 'Super Master'
        : form.projectType.includes('Master')
        ? 'Master'
        : 'Franchise'
    )
    const frName = form.franchiseName || form.shopOwnerName || form.siteName || 'New Franchise'
    const frState = form.state || 'Maharashtra'
    const frCity = form.city || (LOCATIONS[form.state]?.cities[0] ?? 'Pune')

    const fr = addFranchise({
      name: frName,
      tier: frTier,
      state: frState,
      city: frCity,
      atms: 1,
    })
    saveDossier(fr.id, {
      ...form,
      permanentMeter: form.meterDetail,
      siteSourcedBy: form.sourcedBy,
    })

    if (onFranchiseAdded) {
      onFranchiseAdded(fr)
    }

    toast(`${saved.id} submitted · ${fr.id} (${fr.name}) registered in ${frTier} registry!`, 'success')
    onClose()
  }

  const View = STEP_VIEWS[step - 1]
  const props: StepProps = { form, set, errors, readOnly, initialTier }

  const currentStepConfig = STEPS_CONFIG[step - 1]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 backdrop-blur-[2px] p-2 sm:p-4 lg:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="WLA Franchise Application Form"
        className="flex h-full w-full max-w-[1360px] max-h-[96vh] flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header matching image */}
        <header className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0a192f] tracking-tight">
              WLA Franchise Application Form
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Step {step} of 7 - {currentStepConfig.title} • Fields marked <span className="text-red-500 font-bold">*</span> are required
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        {/* 7 Horizontal Step Tabs matching the exact reference image */}
        <div className="px-6 py-4 border-b border-slate-100 bg-[#fafcff]/60">
          <nav className="scroll-thin flex gap-3 overflow-x-auto">
            {STEPS_CONFIG.map((s, i) => {
              const n = i + 1
              const active = n === step
              const Icon = s.icon

              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => (readOnly || n < step ? go(n) : n === step + 1 ? next() : undefined)}
                  className={cn(
                    'group flex min-w-[145px] flex-1 flex-col justify-between rounded-xl p-3 text-left transition-all shadow-2xs',
                    active
                      ? 'border-2 border-[#2563eb] bg-[#eff6ff]'
                      : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50',
                  )}
                >
                  {/* Top row: Icon + Pill badge with step number */}
                  <div className="flex items-center justify-between gap-2">
                    <Icon size={18} className="text-[#2563eb]" />
                    <span
                      className={cn(
                        'text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-colors',
                        active ? 'bg-[#2563eb] text-white' : 'bg-[#eff6ff] text-[#2563eb]',
                      )}
                    >
                      {s.num}
                    </span>
                  </div>

                  {/* Bottom row: Step title */}
                  <div
                    className={cn(
                      'mt-2 text-xs text-center font-bold truncate',
                      active ? 'text-[#2563eb]' : 'text-slate-700 font-medium',
                    )}
                  >
                    {s.title}
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Body content */}
        <div ref={body} className="scroll-thin flex-1 overflow-y-auto px-6 py-6 bg-white">
          <div className="mx-auto max-w-[1260px]">
            {step <= 6 ? (
              <View {...props} />
            ) : (
              <Review form={form} status={app?.status ?? 'Draft'} onEdit={readOnly ? undefined : go} />
            )}
          </div>
        </div>

        {/* Footer matching reference image */}
        <footer className="px-6 py-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Clock size={15} className="text-slate-400" />
            <span>{savedAt ? `Autosaved at ${savedAt}` : 'Not saved yet'}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              {readOnly ? 'Close' : 'Close'}
            </button>

            {!readOnly && (
              <button
                type="button"
                onClick={saveDraft}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-[#2563eb] hover:bg-blue-50 transition-colors shadow-2xs"
              >
                Save draft
              </button>
            )}

            {step > 1 && (
              <button
                type="button"
                onClick={() => go(step - 1)}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                Back
              </button>
            )}

            {step < 7 ? (
              <button
                type="button"
                onClick={readOnly ? () => go(step + 1) : next}
                className="rounded-lg bg-[#2563eb] hover:bg-blue-700 px-6 py-2 text-xs font-semibold text-white shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <span>Continue</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              !readOnly && (
                <button
                  type="button"
                  onClick={submit}
                  className="rounded-lg bg-[#2563eb] hover:bg-blue-700 px-6 py-2 text-xs font-semibold text-white shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 size={15} />
                  <span>Submit Application</span>
                </button>
              )
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
