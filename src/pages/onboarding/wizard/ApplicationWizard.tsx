import { useEffect, useRef, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { emptyForm, type Application, type ApplicationForm } from '@/data/applications'
import { saveApplication } from '@/data/applicationStore'
import { CraAtms, Documents, FranchiseBank, ImagesOffice, ShopDimensions, SiteDetails, type StepProps } from './steps'
import { Review } from './Review'
import { validateStep, type Errors } from './validate'

const STEPS = ['Site Details', 'Franchise & Bank', 'Shop Dimensions', 'CRA & ATMs', 'Documents', 'Images & Office', 'Review & Submit']
const STEP_VIEWS = [SiteDetails, FranchiseBank, ShopDimensions, CraAtms, Documents, ImagesOffice]

const timeNow = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).toUpperCase()

/**
 * 7-step WLA Franchise Application form.
 * - new / draft: editable, autosaves as a Draft
 * - submitted (any other status): read-only, opens on Review
 */
export function ApplicationWizard({ app, onClose }: { app: Application | null; onClose: () => void }) {
  const readOnly = !!app && app.status !== 'Draft'
  const [id, setId] = useState<string | null>(app?.id ?? null)
  const [form, setForm] = useState<ApplicationForm>(() => app?.form ?? emptyForm())
  const [step, setStep] = useState(readOnly ? 7 : 1)
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
    if (keys.some((k) => errors[k])) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))))
  }

  const go = (n: number) => {
    setStep(n)
    setErrors({})
    body.current?.scrollTo({ top: 0 })
  }

  const next = () => {
    const e = validateStep(step, form)
    setErrors(e)
    if (Object.keys(e).length) {
      toast(step === 1 ? 'Complete the required site details to continue.' : 'Please fix the highlighted fields.', 'info')
      return
    }
    go(step + 1)
  }

  const saveDraft = () => {
    const saved = saveApplication(id, form, 'Draft')
    setId(saved.id)
    setSavedAt(timeNow())
    dirty.current = false
    toast(`Draft ${saved.id} saved.`)
  }

  const submit = () => {
    for (let s = 1; s <= 4; s++) {
      const e = validateStep(s, form)
      if (Object.keys(e).length) {
        setErrors(e)
        go(s)
        setErrors(e)
        toast(`Step ${s} · ${STEPS[s - 1]} needs attention before submitting.`, 'info')
        return
      }
    }
    const saved = saveApplication(id, form, 'Under review')
    toast(`${saved.id} submitted for review.`)
    onClose()
  }

  const View = STEP_VIEWS[step - 1]
  const props: StepProps = { form, set, errors, readOnly }
  const title = readOnly ? `${app!.id} · ${app!.applicantName}` : 'WLA Franchise Application Form'
  const subtitle = readOnly
    ? `Step ${step} of 7 · ${STEPS[step - 1]} · ${app!.status} · Read only`
    : `Step ${step} of 7 · ${STEPS[step - 1]} · ${step === 1 ? 'Fields marked * are required' : 'Draft application'}`

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 lg:pl-[264px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex h-full w-full flex-col bg-white shadow-2xl">
        {/* header */}
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 pt-5 pb-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-[20px] font-semibold">{title}</h2>
            <p className="mt-1 text-[12px] text-muted">{subtitle}</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md bg-surface text-ink-2 hover:bg-line-soft" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        {/* stepper */}
        <nav className="scroll-thin flex gap-2 overflow-x-auto border-b border-line bg-surface/50 px-5 py-3 sm:px-6">
          {STEPS.map((s, i) => {
            const n = i + 1
            const active = n === step
            return (
              <button
                key={s}
                onClick={() => (readOnly || n < step ? go(n) : n === step + 1 ? next() : undefined)}
                className={cn(
                  'flex min-w-[118px] flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[11px] transition-colors',
                  active ? 'border-primary bg-primary text-white' : 'border-line bg-white text-muted hover:border-primary/40',
                )}
              >
                <span className={cn('grid h-5 min-w-6 place-items-center rounded px-1 text-[10px] font-semibold', active ? 'bg-white/20 text-white' : 'bg-primary-soft text-primary')}>
                  {String(n).padStart(2, '0')}
                </span>
                <span className={active ? 'font-semibold' : ''}>{s}</span>
              </button>
            )
          })}
        </nav>

        {/* body */}
        <div ref={body} className="scroll-thin flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          <div className="mx-auto max-w-[1240px]">
            {step <= 6 ? <View {...props} /> : <Review form={form} status={app?.status ?? 'Draft'} onEdit={readOnly ? undefined : go} />}
          </div>
        </div>

        {/* footer */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5 sm:px-6">
          <div className="text-[12px] leading-tight">
            {readOnly ? (
              <span className="text-muted">Submitted applications are read only.</span>
            ) : (
              <>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className={cn('h-1.5 w-1.5 rounded-full', savedAt ? 'bg-emerald-600' : 'bg-line')} />
                  {savedAt ? 'Draft saved automatically' : 'Not saved yet'}
                </div>
                {savedAt && <div className="mt-0.5 text-muted">Last saved at {savedAt}{id ? ` · ${id}` : ''}</div>}
              </>
            )}
          </div>
          <div className="flex gap-2">
            {step === 1 || readOnly ? (
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            ) : null}
            {!readOnly && (
              <Button variant="secondary" onClick={saveDraft}>
                Save draft
              </Button>
            )}
            {step > 1 && (
              <Button variant="secondary" onClick={() => go(step - 1)}>
                Back
              </Button>
            )}
            {step < 7 ? (
              <Button onClick={readOnly ? () => go(step + 1) : next}>
                Continue <ArrowRight size={16} />
              </Button>
            ) : (
              !readOnly && (
                <Button onClick={submit}>
                  Submit Application <ArrowRight size={16} />
                </Button>
              )
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
