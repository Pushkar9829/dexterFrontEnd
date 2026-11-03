import { useState, useRef, useEffect } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  Clock,
} from 'lucide-react'
import {
  type Application,
  type ApplicationForm,
} from '@/data/applications'
import { saveApplication } from '@/data/applicationStore'
import { addFranchise, saveDossier, type Franchise, type Tier } from '@/data/franchises'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { MASTER_SECTIONS } from './types'
import { MasterSectionsView } from './MasterSectionsView'
import { validateMasterSection, type Errors } from '../validate'

export interface MasterFranchiseFormProps {
  app?: Application | null
  onClose: () => void
  initialTier?: Tier
  onFranchiseAdded?: (franchise: Franchise) => void
  form: ApplicationForm
  set: (patch: Partial<ApplicationForm>) => void
  readOnly?: boolean
  initialSectionKey?: string
  onSectionChange?: (key: string, index: number, title: string) => void
}

const timeNow = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).toUpperCase()

export function MasterFranchiseForm({
  app,
  onClose,
  initialTier,
  onFranchiseAdded,
  form,
  set,
  readOnly = false,
  initialSectionKey = 'A',
  onSectionChange,
}: MasterFranchiseFormProps) {
  const [sectionKey, setSectionKey] = useState<string>(initialSectionKey)
  const [errors, setErrors] = useState<Errors>({})
  const [id, setId] = useState<string | null>(app?.id ?? null)
  const [savedAt, setSavedAt] = useState<string | null>(app ? timeNow() : null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dirty = useRef(false)

  // Ensure category is set
  useEffect(() => {
    if (!form.franchiseCategory) {
      if (initialTier === 'Super Master' || app?.type === 'Super Master Franchise') {
        set({ franchiseCategory: 'Super Master Franchise' })
      } else {
        set({ franchiseCategory: 'Master Franchise' })
      }
    }
  }, [form.franchiseCategory, initialTier, app?.type, set])

  const currentSectionIndex = MASTER_SECTIONS.findIndex((s) => s.key === sectionKey)
  const currentMeta = MASTER_SECTIONS[currentSectionIndex] || MASTER_SECTIONS[0]

  useEffect(() => {
    if (onSectionChange) {
      onSectionChange(currentMeta.key, currentSectionIndex + 1, currentMeta.title)
    }
  }, [currentMeta, currentSectionIndex, onSectionChange])

  // Autosave drafts 800 ms after the last change
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

  const handleGoIndex = (index: number) => {
    if (index >= 0 && index < MASTER_SECTIONS.length) {
      const targetSec = MASTER_SECTIONS[index]
      setSectionKey(targetSec.key)
      setErrors({})
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleNext = () => {
    const errs = validateMasterSection(sectionKey, form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast(`Please complete the required fields in Step ${currentSectionIndex + 1} (${currentMeta.title}).`, 'info')
      return
    }

    if (currentSectionIndex < MASTER_SECTIONS.length - 1) {
      handleGoIndex(currentSectionIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentSectionIndex > 0) {
      handleGoIndex(currentSectionIndex - 1)
    }
  }

  const handleSaveDraft = () => {
    const saved = saveApplication(id, form, 'Draft')
    setId(saved.id)
    setSavedAt(timeNow())
    dirty.current = false
    toast(`Draft ${saved.id} saved successfully.`, 'info')
  }

  const handleSubmit = () => {
    // Validate all critical sections before submitting
    for (let idx = 0; idx < MASTER_SECTIONS.length; idx++) {
      const sec = MASTER_SECTIONS[idx]
      // Validate mandatory sections A, B, C, D, E, F, G, I
      if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I'].includes(sec.key)) {
        const errs = validateMasterSection(sec.key, form)
        if (Object.keys(errs).length > 0) {
          setErrors(errs)
          setSectionKey(sec.key)
          toast(`Step ${idx + 1} · ${sec.title} needs attention before submitting.`, 'info')
          containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
      }
    }

    const saved = saveApplication(id, form, 'Under review')

    const frTier: Tier = form.franchiseCategory === 'Super Master Franchise' ? 'Super Master' : 'Master'
    const frName = form.franchiseName || form.legalBusinessName || form.applicantAuthorizedPersonName || 'New Master Franchise'
    const frState = form.state || form.addressState || 'Maharashtra'
    const frCity = form.city || form.district || 'Pune'

    const fr = addFranchise({
      name: frName,
      tier: frTier,
      state: frState,
      city: frCity,
      atms: frTier === 'Super Master' ? 48 : 16,
    })

    saveDossier(fr.id, {
      ...form,
      permanentMeter: 'Dedicated Commercial Meter · 170207316',
      siteSourcedBy: form.recommendedBy || 'Regional BD Head',
    })

    if (onFranchiseAdded) {
      onFranchiseAdded(fr)
    }

    toast(`${saved.id} submitted! ${fr.id} (${fr.name}) registered in ${frTier} registry.`, 'success')
    onClose()
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 12 Horizontal Step Tabs Matching Reference Design */}
      <div className="px-6 py-4 border-b border-slate-100 bg-[#fafcff]/60 shrink-0">
        <nav className="scroll-thin flex gap-3 overflow-x-auto pb-1">
          {MASTER_SECTIONS.map((sec, idx) => {
            const n = idx + 1
            const active = sec.key === sectionKey
            const Icon = sec.icon
            const numStr = String(n).padStart(2, '0')

            return (
              <button
                key={sec.key}
                type="button"
                onClick={() => (readOnly || n < currentSectionIndex + 1 ? handleGoIndex(idx) : n === currentSectionIndex + 2 ? handleNext() : undefined)}
                className={cn(
                  'group flex min-w-[155px] flex-1 flex-col justify-between rounded-xl p-3 text-left transition-all shadow-2xs',
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
                    {numStr}
                  </span>
                </div>

                {/* Bottom row: Step title */}
                <div
                  className={cn(
                    'mt-2 text-xs text-center font-bold truncate',
                    active ? 'text-[#2563eb]' : 'text-slate-700 font-medium',
                  )}
                >
                  {sec.title}
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Body content with Active Step Form */}
      <div ref={containerRef} className="scroll-thin flex-1 overflow-y-auto px-6 py-6 bg-white">
        <div className="mx-auto max-w-[1260px]">
          <MasterSectionsView
            form={form}
            set={(patch) => {
              dirty.current = true
              set(patch)
            }}
            errors={errors}
            readOnly={readOnly}
            activeSectionKey={sectionKey}
            showAllSections={false}
          />
        </div>
      </div>

      {/* Footer Matching Reference Design */}
      <footer className="px-6 py-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shadow-2xs shrink-0">
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
            Close
          </button>

          {!readOnly && (
            <button
              type="button"
              onClick={handleSaveDraft}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-[#2563eb] hover:bg-blue-50 transition-colors shadow-2xs"
            >
              Save draft
            </button>
          )}

          {currentSectionIndex > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Back
            </button>
          )}

          {currentSectionIndex < MASTER_SECTIONS.length - 1 ? (
            <button
              type="button"
              onClick={readOnly ? () => handleGoIndex(currentSectionIndex + 1) : handleNext}
              className="rounded-lg bg-[#2563eb] hover:bg-blue-700 px-6 py-2 text-xs font-semibold text-white shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Continue</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            !readOnly && (
              <button
                type="button"
                onClick={handleSubmit}
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
  )
}
