import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Download, Pencil } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'
import { dossierFor, dossierStore, getFranchise, saveDossier, useFranchises, type DossierForm } from '@/data/franchises'
import { validateStep, type Errors } from '@/pages/onboarding/wizard/validate'
import { CraAtmsSection, DocumentsSection, FranchiseBankSection, ImagesOfficeSection, ShopDimensionsSection, SiteDetailsSection } from './dossier/sections'

const SECTIONS = ['Site Details', 'Franchise & Bank Details', 'Shop / Site Dimensions', 'CRA & Nearby ATMs', 'Documents Checklist', 'Site Images & Office Use']
const VIEWS = [SiteDetailsSection, FranchiseBankSection, ShopDimensionsSection, CraAtmsSection, DocumentsSection, ImagesOfficeSection]

const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

/** Franchise dossier — the WLA application form attached to a franchise, in 6 sections (Figma 56:3219 … 56:1628). View ↔ edit. */
export default function Dossier() {
  const { id = '' } = useParams()
  useFranchises() // re-render on registry updates
  dossierStore.use()
  const fr = getFranchise(id)
  const [params, setParams] = useSearchParams()
  const section = Math.min(6, Math.max(1, Number(params.get('section')) || 1))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DossierForm | null>(null)
  const [errors, setErrors] = useState<Errors>({})

  if (!fr) return <Navigate to="/franchise/master-data" replace />
  const form = draft ?? dossierFor(fr)
  const View = VIEWS[section - 1]
  const initials = fr.name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  const evidence = form.documents.filter((d) => d.file).length + form.images.filter(Boolean).length + (form.applicantPhoto ? 1 : 0) + (form.signature ? 1 : 0)

  const goto = (n: number) => setParams({ section: String(n) })

  const save = () => {
    // validate every section of the draft; jump to the first one with problems
    for (let s = 1; s <= 4; s++) {
      const e = validateStep(s, form)
      delete e.applicantPhoto // optional for registered franchises
      if (Object.keys(e).length) {
        setErrors(e)
        goto(s)
        toast(`Please fix the highlighted fields in ${SECTIONS[s - 1]}.`, 'info')
        return
      }
    }
    setErrors({})
    saveDossier(fr.id, form)
    setEditing(false)
    setDraft(null)
    toast(`${fr.id} dossier saved · change recorded in Governance → Audit`)
  }

  /** file attachments: part of the draft while editing, otherwise saved straight away */
  const attach = (p: Partial<DossierForm>) => {
    if (editing) setDraft({ ...form, ...p })
    else {
      saveDossier(fr.id, { ...form, ...p })
      toast('Attachment saved to the dossier')
    }
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
        <div className="flex flex-wrap gap-2.5 print:hidden">
          <Button variant="secondary" icon={<Download size={16} />} onClick={() => window.print()}>
            Export .pdf
          </Button>
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportXlsx}>
            Export .xlsx
          </Button>
          {editing ? (
            <Button onClick={save}>Save</Button>
          ) : (
            <Button
              icon={<Pencil size={16} />}
              onClick={() => {
                setDraft(dossierFor(fr))
                setEditing(true)
              }}
            >
              Edit details
            </Button>
          )}
        </div>
      </div>

      {/* entity card */}
      <section className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white px-5 py-5">
        <span className="grid h-[52px] w-[52px] place-items-center rounded-lg bg-primary-soft text-[18px] font-semibold text-primary">{initials}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-[20px] font-semibold">{fr.name}</h2>
            <Badge tone={toneFor(fr.status)}>{fr.status}</Badge>
            <Badge tone={toneFor(fr.kyc)}>{fr.kyc}</Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 text-[13px] text-muted">
            <span>{fr.id}</span>/<span>{fr.tier} tier</span>/<span>{fr.state}, {fr.city}</span>/<span>{fr.atms} ATMs</span>
          </div>
        </div>
        <div className="text-right text-[12px] leading-relaxed text-muted">
          Last updated · {fmtStamp(fr.updatedAt)} IST
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
              goto(i + 1)
              setErrors({})
            }}
            className={cn(
              'flex-1 border-b-2 px-4 py-3.5 text-[12px] whitespace-nowrap',
              section === i + 1 ? 'border-primary bg-primary-soft/60 font-semibold text-primary' : 'border-transparent text-ink-2 hover:bg-surface',
            )}
          >
            <span className="mr-1.5">{String(i + 1).padStart(2, '0')}</span>
            {s}
          </button>
        ))}
      </nav>

      <View fr={fr} form={form} set={(p) => setDraft({ ...form, ...p })} attach={attach} errors={errors} readOnly={!editing} />

      <div className="mt-4 flex flex-wrap justify-between gap-2 text-[12px] text-muted">
        <span>
          Illustrative application data · Financial identifiers masked · {evidence ? `${evidence} evidence file${evidence > 1 ? 's' : ''} attached` : 'No evidence files attached'}
        </span>
        <span>Edits are versioned in Governance → Audit</span>
      </div>
    </div>
  )
}
