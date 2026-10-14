import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Download, Pencil, Save } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'
import type { ApplicationForm } from '@/data/applications'
import { dossierFor, dossierStore, getFranchise, saveDossier, useFranchises } from '@/data/franchises'
import { CraAtms, Documents, FranchiseBank, ImagesOffice, ShopDimensions, SiteDetails } from '@/pages/onboarding/wizard/steps'
import { validateStep, type Errors } from '@/pages/onboarding/wizard/validate'

const SECTIONS = ['Site Details', 'Franchise & Bank Details', 'Shop / Site Dimensions', 'CRA & Nearby ATMs', 'Documents Checklist', 'Site Images & Office Use']
const VIEWS = [SiteDetails, FranchiseBank, ShopDimensions, CraAtms, Documents, ImagesOffice]

/** Franchise dossier — the WLA application form attached to a franchise, in 6 sections. View ↔ edit. */
export default function Dossier() {
  const { id = '' } = useParams()
  useFranchises() // re-render on registry updates
  dossierStore.use()
  const fr = getFranchise(id)
  const [params, setParams] = useSearchParams()
  const section = Math.min(6, Math.max(1, Number(params.get('section')) || 1))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ApplicationForm | null>(null)
  const [errors, setErrors] = useState<Errors>({})

  if (!fr) return <Navigate to="/franchise/master-data" replace />
  const form = draft ?? dossierFor(fr)
  const View = VIEWS[section - 1]
  const initials = fr.name.split(' ').map((p) => p[0]).slice(0, 2).join('')

  const startEdit = () => {
    setDraft(dossierFor(fr))
    setEditing(true)
  }
  const save = () => {
    const e = validateStep(section, form)
    // registered franchises keep site details mandatory; the applicant photo is optional here
    delete e.applicantPhoto
    setErrors(e)
    if (Object.keys(e).length) {
      toast('Please fix the highlighted fields.', 'info')
      return
    }
    saveDossier(fr.id, form)
    setEditing(false)
    setDraft(null)
    toast(`${fr.id} dossier saved · change recorded in Governance → Audit`)
  }
  const exportXlsx = () => {
    const entries = Object.entries(form).filter(([, v]) => typeof v === 'string')
    downloadCsv(`${fr.id}-dossier`, ['Field', 'Value'], entries.map(([k, v]) => [k, String(v)]))
  }

  return (
    <div className="print:p-0">
      <Link to="/franchise/master-data" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline print:hidden">
        <ArrowLeft size={15} /> Back to Master Data
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">WLA Franchise Application Form</h1>
          <p className="mt-1 text-[14px] text-muted">
            Franchise dossier / {SECTIONS[section - 1]} · Section {section} of 6
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="secondary" icon={<Download size={16} />} onClick={() => window.print()}>
            Export .pdf
          </Button>
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportXlsx}>
            Export .xlsx
          </Button>
          {editing ? (
            <>
              <Button variant="secondary" onClick={() => { setEditing(false); setDraft(null); setErrors({}) }}>
                Cancel
              </Button>
              <Button icon={<Save size={16} />} onClick={save}>
                Save
              </Button>
            </>
          ) : (
            <Button icon={<Pencil size={16} />} onClick={startEdit}>
              Edit details
            </Button>
          )}
        </div>
      </div>

      {/* entity card */}
      <section className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white p-5">
        <span className="grid h-14 w-14 place-items-center rounded-lg bg-primary-soft text-[18px] font-semibold text-primary">{initials}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[19px] font-semibold">{fr.name}</h2>
            <Badge tone={toneFor(fr.status)}>{fr.status}</Badge>
            <Badge tone={toneFor(fr.kyc)}>{fr.kyc}</Badge>
          </div>
          <div className="mt-1 text-[12px] text-muted">
            {fr.id} &nbsp;/&nbsp; {fr.tier} tier &nbsp;/&nbsp; {fr.state}, {fr.city} &nbsp;/&nbsp; {fr.atms} ATMs
          </div>
        </div>
        <div className="text-right text-[12px] text-muted">
          Last updated · {new Date(fr.updatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} IST
          <br />
          Record owner · {fr.owner}
        </div>
      </section>

      {/* section tabs */}
      <nav className="scroll-thin mb-5 flex overflow-x-auto rounded-xl border border-line bg-white print:hidden">
        {SECTIONS.map((s, i) => (
          <button
            key={s}
            onClick={() => {
              setParams({ section: String(i + 1) })
              setErrors({})
            }}
            className={cn(
              'flex-1 border-b-2 px-4 py-3.5 text-[12px] whitespace-nowrap',
              section === i + 1 ? 'border-primary bg-primary-soft/50 font-semibold text-primary' : 'border-transparent text-ink-2 hover:bg-surface',
            )}
          >
            <span className="mr-1.5">{String(i + 1).padStart(2, '0')}</span>
            {s}
          </button>
        ))}
      </nav>

      <section className={cn('rounded-xl border bg-white p-5 sm:p-6', editing ? 'border-primary/40' : 'border-line')}>
        {editing && (
          <div className="mb-5 rounded-md bg-primary-soft px-3 py-2 text-[12px] text-primary">
            Editing {SECTIONS[section - 1]}. Changes in other sections are kept until you save. All edits are versioned.
          </div>
        )}
        <View form={form} set={(p) => setDraft({ ...form, ...p })} errors={errors} readOnly={!editing} />
      </section>

      <div className="mt-4 flex flex-wrap justify-between gap-2 text-[12px] text-muted">
        <span>Financial identifiers are masked for roles without finance access.</span>
        <span>Edits are versioned in Governance → Audit</span>
      </div>
    </div>
  )
}
