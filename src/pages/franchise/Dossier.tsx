import { useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Download, Pencil, Layers, FileSpreadsheet } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'
import { dossierFor, dossierStore, getFranchise, saveDossier, useFranchises, type DossierForm } from '@/data/franchises'
import { validateStep, validateMasterSection, type Errors } from '@/pages/onboarding/wizard/validate'
import { MASTER_SECTIONS } from '@/pages/onboarding/wizard/master/types'
import { MasterSectionsView } from '@/pages/onboarding/wizard/master/MasterSectionsView'
import {
  CraAtmsSection,
  DocumentsSection,
  FranchiseBankSection,
  ImagesOfficeSection,
  ShopDimensionsSection,
  SiteDetailsSection,
} from './dossier/sections'

const UNIT_SECTIONS = [
  'Site Details',
  'Franchise & Bank Details',
  'Shop / Site Dimensions',
  'CRA & Nearby ATMs',
  'Documents Checklist',
  'Site Images & Office Use',
]
const UNIT_VIEWS = [
  SiteDetailsSection,
  FranchiseBankSection,
  ShopDimensionsSection,
  CraAtmsSection,
  DocumentsSection,
  ImagesOfficeSection,
]

const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

/**
 * Franchise dossier — the WLA application form attached to a franchise.
 * Automatically adapts:
 * - Master & Super Master Franchise: Full 12-section form (Sections A to L)
 * - Unit Franchise: 6-section site/ATM dossier
 */
export default function Dossier() {
  const { id = '' } = useParams()
  useFranchises() // re-render on registry updates
  dossierStore.use()
  const fr = getFranchise(id)
  const [params, setParams] = useSearchParams()

  const isMaster = fr?.tier === 'Super Master' || fr?.tier === 'Master'
  const maxSections = isMaster ? 12 : 6
  const section = Math.min(maxSections, Math.max(1, Number(params.get('section')) || 1))

  // `?edit=1` opens the dossier straight in edit mode
  const [editing, setEditing] = useState(() => params.get('edit') === '1')
  const [draft, setDraft] = useState<DossierForm | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [showAllSheet, setShowAllSheet] = useState(false)

  if (!fr) return <Navigate to="/franchise/master-data" replace />
  const form = draft ?? dossierFor(fr)
  const initials = fr.name.split(' ').map((p) => p[0]).slice(0, 2).join('')

  const goto = (n: number) =>
    setParams(editing ? { section: String(n), edit: '1' } : { section: String(n) })

  const save = () => {
    if (isMaster) {
      for (const sec of ['A', 'B', 'C', 'D', 'E', 'G', 'I']) {
        const e = validateMasterSection(sec, form)
        if (Object.keys(e).length) {
          setErrors(e)
          const targetIdx = MASTER_SECTIONS.findIndex((s) => s.key === sec)
          if (targetIdx !== -1) goto(targetIdx + 1)
          toast(`Please complete required fields in Section ${sec}.`, 'info')
          return
        }
      }
    } else {
      for (let s = 1; s <= 4; s++) {
        const e = validateStep(s, form)
        delete e.applicantPhoto // optional for registered franchises
        if (Object.keys(e).length) {
          setErrors(e)
          goto(s)
          toast(`Please fix the highlighted fields in ${UNIT_SECTIONS[s - 1]}.`, 'info')
          return
        }
      }
    }

    setErrors({})
    saveDossier(fr.id, form)
    setEditing(false)
    setDraft(null)
    if (params.has('edit')) setParams({ section: String(section) })
    toast(`${fr.id} dossier saved · change recorded in Governance → Audit`, 'success')
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
    if (isMaster) {
      const rows = [
        ['S. No.', 'Section', 'Field Name', 'Value'],
        ['9', 'A. Franchise & Territory', 'Master Franchise ID', form.masterFranchiseId || fr.id],
        ['—', 'A. Franchise & Territory', 'Partner ID', form.partnerId || '—'],
        ['10', 'A. Franchise & Territory', 'Franchise Name', form.franchiseName || fr.name],
        ['11', 'A. Franchise & Territory', 'Franchise Category', form.franchiseCategory || `${fr.tier} Franchise`],
        ['12', 'A. Franchise & Territory', 'Territory Type', form.territoryType || 'District'],
        ['13', 'A. Franchise & Territory', 'State', form.state || fr.state],
        ['14', 'A. Franchise & Territory', 'Region / Zone', form.regionZone || '—'],
        ['15', 'A. Franchise & Territory', 'District', form.district || fr.city],
        ['16', 'A. Franchise & Territory', 'Tehsil / Block', form.tehsilBlock || '—'],
        ['17', 'A. Franchise & Territory', 'Proposed Operational Territory', form.proposedOperationalTerritory || '—'],
        ['18', 'A. Franchise & Territory', 'Territory Exclusivity', form.territoryExclusivity || 'Exclusive'],
        ['19', 'A. Franchise & Territory', 'Application Source', form.applicationSource || 'Direct'],
        ['20', 'A. Franchise & Territory', 'Referred By', form.referredBy || '—'],
        ['21', 'A. Franchise & Territory', 'Existing Dexter Franchise / Partner ID', form.existingDexterFranchiseId || '—'],
        ['22', 'B. Business & Legal Entity', 'Applicant Type', form.applicantType || 'Pvt. Ltd.'],
        ['23', 'B. Business & Legal Entity', 'Legal Business Name', form.legalBusinessName || `${fr.name} Pvt. Ltd.`],
        ['24', 'B. Business & Legal Entity', 'Trade Name / DBA', form.tradeNameDba || fr.name],
        ['25', 'B. Business & Legal Entity', 'Business Type / Nature of Business', form.businessTypeNature || 'Financial Services'],
        ['26', 'B. Business & Legal Entity', 'Date of Incorporation', form.dateOfIncorporation || '—'],
        ['27', 'B. Business & Legal Entity', 'PAN', form.pan || '—'],
        ['28', 'B. Business & Legal Entity', 'GSTIN', form.gstin || '—'],
        ['29', 'B. Business & Legal Entity', 'CIN / LLPIN / Registration Number', form.cinLlpinRegNo || '—'],
        ['30', 'B. Business & Legal Entity', 'Registered Office Address', form.registeredOfficeAddress || '—'],
        ['31', 'B. Business & Legal Entity', 'Business Website', form.businessWebsite || '—'],
        ['32', 'B. Business & Legal Entity', 'Business Email ID', form.businessEmail || form.email || '—'],
        ['33', 'B. Business & Legal Entity', 'Business Mobile Number', form.businessMobile || form.contactNumber || '—'],
        ['34', 'B. Business & Legal Entity', 'Alternate Business Contact', form.alternateBusinessContact || '—'],
        ['35', 'C. Applicant / Authorized Person', 'Applicant / Authorized Person Name', form.applicantAuthorizedPersonName || form.shopOwnerName || '—'],
        ['36', 'C. Applicant / Authorized Person', "Father's / Spouse's Name", form.fatherSpouseName || '—'],
        ['37', 'C. Applicant / Authorized Person', 'Designation', form.designation || 'Managing Director'],
        ['38', 'C. Applicant / Authorized Person', 'Date of Birth', form.dob || '—'],
        ['39', 'C. Applicant / Authorized Person', 'Gender', form.gender || '—'],
        ['40', 'C. Applicant / Authorized Person', 'Marital Status', form.maritalStatus || '—'],
        ['41', 'C. Applicant / Authorized Person', 'Personal Mobile Number', form.personalMobile || form.contactNumber || '—'],
        ['42', 'C. Applicant / Authorized Person', 'Personal Email ID', form.personalEmail || form.email || '—'],
        ['43', 'C. Applicant / Authorized Person', 'Educational Qualification', form.educationalQualification || '—'],
        ['44', 'C. Applicant / Authorized Person', 'Computer Literacy', form.computerLiteracy || 'Yes'],
        ['45', 'C. Applicant / Authorized Person', 'Computer Qualification / Skills', form.computerQualificationSkills || '—'],
        ['46', 'C. Applicant / Authorized Person', 'Languages Known', (form.languagesKnown || []).join(', ')],
        ['47', 'C. Applicant / Authorized Person', 'Relevant Business Experience', form.financialServicesExp || 'Yes'],
        ['48', 'C. Applicant / Authorized Person', 'Years of Business Experience', form.yearsOfBusinessExperience || '—'],
        ['49', 'D. Address & Location', 'Registered / Permanent Address', form.registeredPermanentAddress || '—'],
        ['50', 'D. Address & Location', 'Communication Address Same as Permanent', form.commSameAsPermanent || 'Yes'],
        ['51', 'D. Address & Location', 'Communication Address', form.communicationAddress || '—'],
        ['56', 'D. Address & Location', 'City / District', form.cityDistrict || fr.city],
        ['57', 'D. Address & Location', 'State', form.addressState || fr.state],
        ['58', 'D. Address & Location', 'PIN Code', form.pinCode || '—'],
        ['62', 'E. Office Infrastructure & Investment', 'Office Ownership', form.officeOwnership || 'Own'],
        ['63', 'E. Office Infrastructure & Investment', 'Office Address', form.officeAddress || '—'],
        ['64', 'E. Office Infrastructure & Investment', 'Office Space Details', form.officeSpaceDetails || '—'],
        ['71', 'E. Office Infrastructure & Investment', 'Investment Capacity', form.investmentCapacity || '—'],
        ['86', 'G. Bank & Payment Account', 'Bank Name', form.bankName || '—'],
        ['87', 'G. Bank & Payment Account', 'Branch Name', form.branchName || '—'],
        ['88', 'G. Bank & Payment Account', 'Beneficiary Name', form.beneficiaryName || form.nameOnCheque || '—'],
        ['89', 'G. Bank & Payment Account', 'Bank Account Number', form.bankAccountNumber || form.accountNumber || '—'],
        ['91', 'G. Bank & Payment Account', 'IFSC Code', form.ifscCode || form.ifsc || '—'],
        ['92', 'G. Bank & Payment Account', 'Account Type', form.accountType || 'Current'],
        ['127', 'J. Application Fee / Payment', 'Payment Required', form.paymentRequired || 'Yes'],
        ['132', 'J. Application Fee / Payment', 'Payment Amount', form.paymentAmount || '—'],
        ['133', 'J. Application Fee / Payment', 'Payment Reference / UTR', form.paymentRefNumber || '—'],
        ['135', 'J. Application Fee / Payment', 'Payment Verification Status', form.paymentVerificationStatus || 'Verified'],
        ['146', 'K. Internal Approval & ERP Account', 'Final Decision', form.finalDecision || 'Approved'],
        ['148', 'K. Internal Approval & ERP Account', 'Dexter ERP User ID', form.dexterErpUserId || '—'],
        ['165', 'L. Final Submission Checklist', 'Submission Status', form.submissionStatus || 'Completed'],
      ]
      downloadCsv(`${fr.id}-master-franchise-dossier`, ['S. No.', 'Section', 'Field Name', 'Value'], rows.slice(1))
    } else {
      const entries = Object.entries(form).filter(([, v]) => typeof v === 'string')
      downloadCsv(`${fr.id}-dossier`, ['Field', 'Value'], entries.map(([k, v]) => [k, String(v)]))
    }
  }

  const UnitView = !isMaster ? UNIT_VIEWS[section - 1] : null
  const currentMasterMeta = MASTER_SECTIONS[section - 1]

  return (
    <div className="print:p-0">
      {/* Title & Action Bar */}
      <div className="mb-[15px] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="-mt-1 text-[28.5px] font-semibold tracking-tight">
              WLA Franchise Application Form
            </h1>
            <span
              className={cn(
                'rounded-md px-2.5 py-0.5 text-xs font-bold border',
                isMaster
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              )}
            >
              {isMaster ? `${fr.tier} Franchise Form` : 'Unit Franchise'}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] leading-4 text-muted">
            {isMaster
              ? `Franchise dossier / ${currentMasterMeta?.fullName || ''} · Section ${section} of 12`
              : `Franchise dossier / ${UNIT_SECTIONS[section - 1]} · Section ${section} of 6`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          {isMaster && (
            <div className="flex items-center rounded-lg border border-line bg-surface p-0.5 mr-2">
              <button
                type="button"
                onClick={() => setShowAllSheet(false)}
                className={cn(
                  'flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  !showAllSheet ? 'bg-white font-semibold text-primary shadow-2xs' : 'text-muted hover:text-ink'
                )}
              >
                <Layers size={13} />
                <span>Tab View</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAllSheet(true)}
                className={cn(
                  'flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  showAllSheet ? 'bg-white font-semibold text-primary shadow-2xs' : 'text-muted hover:text-ink'
                )}
              >
                <FileSpreadsheet size={13} />
                <span>All Sections</span>
              </button>
            </div>
          )}

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

      {/* Entity overview card */}
      <section className="mb-[18px] flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white px-5 py-[17px]">
        <span className="grid h-[52px] w-[52px] place-items-center rounded-lg bg-primary-soft text-[18px] font-semibold text-primary">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-[20px] font-semibold">{fr.name}</h2>
            <Badge tone={toneFor(fr.status)}>{fr.status}</Badge>
            <Badge tone={toneFor(fr.kyc)}>{fr.kyc}</Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 text-[13px] text-muted">
            <span>{fr.id}</span>/<span>{fr.tier} tier</span>/<span>{fr.state}, {fr.city}</span>/
            <span>{fr.atms} ATMs</span>
          </div>
        </div>
        <div className="text-right text-[12px] leading-relaxed text-muted">
          Last updated · {fmtStamp(fr.updatedAt)} IST
          <br />
          Record owner · {fr.owner}
        </div>
      </section>

      {/* Section navigation tabs */}
      {!showAllSheet && (
        <nav className="scroll-thin mb-5 flex overflow-x-auto rounded-xl border border-line bg-white print:hidden">
          {isMaster
            ? MASTER_SECTIONS.map((sec, i) => (
                <button
                  key={sec.key}
                  onClick={() => {
                    goto(i + 1)
                    setErrors({})
                  }}
                  className={cn(
                    'flex-1 border-b-2 px-3 py-3.5 text-[12px] whitespace-nowrap text-center transition-colors',
                    section === i + 1
                      ? 'border-primary bg-primary-soft/60 font-bold text-primary'
                      : 'border-transparent text-ink-2 hover:bg-surface'
                  )}
                >
                  <span className="mr-1.5 font-bold font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {sec.letter}
                  </span>
                  <span>{sec.title}</span>
                </button>
              ))
            : UNIT_SECTIONS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => {
                    goto(i + 1)
                    setErrors({})
                  }}
                  className={cn(
                    'flex-1 border-b-2 px-4 py-4 text-[12px] whitespace-nowrap',
                    section === i + 1
                      ? 'border-primary bg-primary-soft/60 font-semibold text-primary'
                      : 'border-transparent text-ink-2 hover:bg-surface'
                  )}
                >
                  <span className="mr-1.5">{String(i + 1).padStart(2, '0')}</span>
                  {s}
                </button>
              ))}
        </nav>
      )}

      {/* Section View */}
      {isMaster ? (
        <MasterSectionsView
          form={form}
          set={(p) => setDraft((d) => ({ ...(d ?? form), ...p }))}
          errors={errors}
          readOnly={!editing}
          activeSectionKey={currentMasterMeta?.key}
          showAllSections={showAllSheet}
        />
      ) : UnitView ? (
        <UnitView
          fr={fr}
          form={form}
          set={(p) => setDraft({ ...form, ...p })}
          attach={attach}
          errors={errors}
          readOnly={!editing}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap justify-between gap-2 text-[12px] text-muted">
        <span>
          {isMaster
            ? 'Sections A to L verified according to WLA Master & Super Master Franchise Policy'
            : 'Illustrative application data · Financial identifiers masked'}
        </span>
        <span>Edits are versioned in Governance → Audit</span>
      </div>
    </div>
  )
}
