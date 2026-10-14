import { FileText, ImageIcon, Map, PenLine, Table2, Upload, UserRound, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fmtSize } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import {
  BUSINESS_TYPES, DOCUMENTS, IMAGE_SLOTS, LOCATIONS, PLANS, PROJECT_TYPES, RBI_CATEGORIES, SITE_TYPES, STATES, TIS_TYPES,
  type AtmRow, type FileRef, type YesNo,
} from '@/data/applications'
import { DOC_SEED, RBI_LABEL, type DossierForm, type Franchise } from '@/data/franchises'
import type { Errors } from '@/pages/onboarding/wizard/validate'
import { MAX_MB, fmt, pickFiles } from './format'
import { Chip, Field, Note, Radios, SectionCard } from './ui'

export type SectionProps = {
  fr: Franchise
  form: DossierForm
  /** edits the draft (edit mode only) */
  set: (p: Partial<DossierForm>) => void
  /** file attachments: applied to the draft while editing, otherwise saved immediately */
  attach: (p: Partial<DossierForm>) => void
  errors: Errors
  readOnly: boolean
}

const YN: YesNo[] = ['Yes', 'No']
const grid3 = 'grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3'
const grid4 = 'grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-4'

async function pickOne(accept: string): Promise<FileRef | undefined> {
  const [f] = await pickFiles(accept)
  if (!f) return undefined
  if (f.size > MAX_MB * 1024 * 1024) {
    toast(`${f.name} is larger than ${MAX_MB} MB`, 'info')
    return undefined
  }
  return { name: f.name, size: f.size }
}

// ── 01 · Site Details (56:3219) ─────────────────────────────────────────
export function SiteDetailsSection({ form: f, set, attach, errors: e, readOnly: ro }: SectionProps) {
  const loc = LOCATIONS[f.state]
  const upload = async () => {
    const file = await pickOne('image/png,image/jpeg')
    if (file) attach({ applicantPhoto: file })
  }
  return (
    <div className="space-y-5">
      <SectionCard title="Site Details" sub="Location, applicant photograph and geographic coordinates" badge="Site profile">
        <div className="grid gap-x-5 gap-y-5 lg:grid-cols-4">
          <div className="space-y-5 lg:col-span-3">
            <div className={grid3}>
              <Field label="1. Proposed Site Location Name" value={f.siteName} readOnly={ro} onChange={(v) => set({ siteName: v })} error={e.siteName} />
              <Field label="State" value={f.state} readOnly={ro} options={STATES} onChange={(v) => set({ state: v, city: '', circle: '' })} error={e.state} />
              <Field label="City" value={f.city} readOnly={ro} options={loc?.cities ?? []} onChange={(v) => set({ city: v })} error={e.city} />
              <Field label="Circle / Zone" value={f.circle} readOnly={ro} options={loc?.circles ?? []} onChange={(v) => set({ circle: v })} error={e.circle} />
              <Field label="District" value={f.district} readOnly={ro} onChange={(v) => set({ district: v })} error={e.district} />
              <Field label="2. Pin Code" value={f.pinCode} readOnly={ro} inputMode="numeric" onChange={(v) => set({ pinCode: v })} error={e.pinCode} />
            </div>
            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <Field label="3. Landmark" value={f.landmark} readOnly={ro} onChange={(v) => set({ landmark: v })} error={e.landmark} />
              <Field
                label="4. RBI Category"
                value={f.rbiCategory}
                display={f.rbiCategory && RBI_LABEL[f.rbiCategory] ? `${f.rbiCategory} · ${RBI_LABEL[f.rbiCategory]}` : f.rbiCategory}
                readOnly={ro}
                options={RBI_CATEGORIES.map((r) => ({ value: r, label: `${r} · ${RBI_LABEL[r]}` }))}
                onChange={(v) => set({ rbiCategory: v })}
                error={e.rbiCategory}
              />
            </div>
            <Field label="5. Site Complete Address" value={f.siteAddress} readOnly={ro} onChange={(v) => set({ siteAddress: v })} error={e.siteAddress} />
            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <Field label="6. Site Latitude" value={f.latitude} display={fmt.lat(f.latitude)} readOnly={ro} inputMode="decimal" onChange={(v) => set({ latitude: v })} error={e.latitude} />
              <Field label="7. Site Longitude" value={f.longitude} display={fmt.lng(f.longitude)} readOnly={ro} inputMode="decimal" onChange={(v) => set({ longitude: v })} error={e.longitude} />
            </div>
          </div>

          <div>
            <div className="mb-2 text-[13px] text-ink-2">Latest Color Photograph of Applicant</div>
            <div className="grid h-[172px] place-items-center rounded-lg border border-dashed border-line bg-surface/60 px-4 text-center">
              {f.applicantPhoto ? (
                <div>
                  <UserRound size={26} className="mx-auto text-primary" />
                  <div className="mt-2 text-[13px] font-semibold break-all text-ink">{f.applicantPhoto.name}</div>
                  <div className="mt-1 text-[11px] text-muted">{fmtSize(f.applicantPhoto.size)} · Attached</div>
                </div>
              ) : (
                <div>
                  <UserRound size={26} className="mx-auto text-ink-2" />
                  <div className="mt-2 text-[14px] font-semibold text-ink">Applicant photo</div>
                  <div className="mt-1.5 text-[11px] text-muted">Explicit placeholder · Recent color photo · JPG / PNG</div>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="secondary" icon={<Upload size={15} />} onClick={upload}>
                {f.applicantPhoto ? 'Replace photo' : 'Upload photo'}
              </Button>
              {f.applicantPhoto && !ro && (
                <button onClick={() => set({ applicantPhoto: null })} className="text-[12px] text-muted hover:text-brand-red">
                  Remove
                </button>
              )}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted">
              {f.applicantPhoto ? 'Photograph attached to this dossier.' : 'Not attached in this illustrative dossier.'}
              <br />
              Upload the applicant’s actual photograph.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Site configuration" sub="Operating format and WLA franchise model selection">
        <div className={grid3}>
          <Radios label="8. Site Type" value={f.siteType} options={SITE_TYPES} readOnly={ro} onChange={(v) => set({ siteType: v })} error={e.siteType} />
          <Radios label="9. TIS Type" value={f.tisType} options={TIS_TYPES} readOnly={ro} onChange={(v) => set({ tisType: v })} error={e.tisType} />
          <Field label="10. Project Type" value={f.projectType} readOnly={ro} options={PROJECT_TYPES} onChange={(v) => set({ projectType: v })} error={e.projectType} />
          <Field label="11. Business Type" value={f.businessType} readOnly={ro} options={BUSINESS_TYPES} onChange={(v) => set({ businessType: v })} error={e.businessType} />
          <Radios label="12. Strategy / Plan / Model Name" value={f.plan} options={PLANS} readOnly={ro} onChange={(v) => set({ plan: v })} error={e.plan} />
          <Field label="13. Existing ATM ID" value={f.existingAtmId} readOnly={ro} onChange={(v) => set({ existingAtmId: v })} />
        </div>
      </SectionCard>
    </div>
  )
}

// ── 02 · Franchise & Bank Details (56:2958) ─────────────────────────────
export function FranchiseBankSection({ fr, form: f, set, errors: e, readOnly: ro }: SectionProps) {
  return (
    <div className="space-y-5">
      <SectionCard title="Franchise Details" sub="Legal name and primary communication channels" badge={`${fr.tier} tier`}>
        <div className="space-y-5">
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
            <Field label="14. Franchise Name" value={f.franchiseName} readOnly={ro} onChange={(v) => set({ franchiseName: v })} />
            <Field label="15. Franchise Name on Cheque" value={f.nameOnCheque} readOnly={ro} onChange={(v) => set({ nameOnCheque: v })} />
          </div>
          <div className={grid3}>
            <Field label="16. Contact Number" value={f.contactNumber} display={fmt.phone(f.contactNumber)} readOnly={ro} inputMode="tel" onChange={(v) => set({ contactNumber: v })} error={e.contactNumber} />
            <Field label="17. Alternate Number" value={f.alternateNumber} display={fmt.phone(f.alternateNumber)} readOnly={ro} inputMode="tel" onChange={(v) => set({ alternateNumber: v })} error={e.alternateNumber} />
            <Field label="18. Email ID" value={f.email} readOnly={ro} inputMode="email" onChange={(v) => set({ email: v })} error={e.email} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="19. Correspondence Address" sub="Address for franchise communication and correspondence">
        <div className="space-y-5">
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
            <Field label="Correspondence Address" value={f.corrAddress} readOnly={ro} onChange={(v) => set({ corrAddress: v })} />
            <Field label="Landmark" value={f.corrLandmark} readOnly={ro} onChange={(v) => set({ corrLandmark: v })} />
          </div>
          <div className={grid3}>
            <Field label="District" value={f.corrDistrict} readOnly={ro} onChange={(v) => set({ corrDistrict: v })} />
            <Field label="State" value={f.corrState} readOnly={ro} options={STATES} onChange={(v) => set({ corrState: v })} />
            <Field label="Pin" value={f.corrPin} readOnly={ro} inputMode="numeric" onChange={(v) => set({ corrPin: v })} error={e.corrPin} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Franchise Bank’s Details" sub="Settlement account · Restricted financial information" badge="Masked">
        <div className={grid4}>
          <Field label="20. Bank Name" value={f.bankName} readOnly={ro} onChange={(v) => set({ bankName: v })} />
          <Field label="21. Branch Name" value={f.branchName} readOnly={ro} onChange={(v) => set({ branchName: v })} />
          <Field label="22. Account Number" value={f.accountNumber} display={fmt.account(f.accountNumber)} readOnly={ro} inputMode="numeric" onChange={(v) => set({ accountNumber: v })} error={e.accountNumber} />
          <Field label="23. IFSC Code" value={f.ifsc} display={fmt.ifsc(f.ifsc)} readOnly={ro} onChange={(v) => set({ ifsc: v.toUpperCase() })} error={e.ifsc} />
        </div>
        <Note className="mt-5">Illustrative account record. Account number and IFSC are masked; authorized staff can verify details against the self-attested cheque.</Note>
      </SectionCard>
    </div>
  )
}

// ── 03 · Shop / Site Dimensions (56:2634) ───────────────────────────────
export function ShopDimensionsSection({ form: f, set, errors: e, readOnly: ro }: SectionProps) {
  const sq = (v: string) => fmt.unit(v, 'sq.ft.')
  const ft = (v: string) => fmt.unit(v, 'ft.')
  return (
    <div className="space-y-5">
      <SectionCard title="Shop / Site Dimensional Details" sub="Ownership, offered area and physical measurements" badge="Site survey">
        <div className={grid3}>
          <Field label="Shop Owner Name" value={f.shopOwnerName} readOnly={ro} onChange={(v) => set({ shopOwnerName: v })} />
          <Field label="Shop Owner Number" value={f.shopOwnerNumber} display={fmt.phone(f.shopOwnerNumber)} readOnly={ro} inputMode="tel" onChange={(v) => set({ shopOwnerNumber: v })} error={e.shopOwnerNumber} />
          <Radios label="38. Shop Status" value={f.shopStatus} options={['Rented', 'Owned']} readOnly={ro} onChange={(v) => set({ shopStatus: v as DossierForm['shopStatus'] })} />
          <Field label="24. Total Shop Area (Sq.ft.)" value={f.totalArea} display={sq(f.totalArea)} readOnly={ro} inputMode="numeric" onChange={(v) => set({ totalArea: v })} error={e.totalArea} />
          <Field label="25. Shop Area Offered (Sq.ft.)" value={f.offeredArea} display={sq(f.offeredArea)} readOnly={ro} inputMode="numeric" onChange={(v) => set({ offeredArea: v })} error={e.offeredArea} />
          <Field label="26. Carpet Area (Sq.ft.)" value={f.carpetArea} display={sq(f.carpetArea)} readOnly={ro} inputMode="numeric" onChange={(v) => set({ carpetArea: v })} error={e.carpetArea} />
          <Field label="27. Depth" value={f.depth} display={ft(f.depth)} readOnly={ro} placeholder="ft." onChange={(v) => set({ depth: v })} />
          <Field label="28. Width" value={f.width} display={ft(f.width)} readOnly={ro} placeholder="ft." onChange={(v) => set({ width: v })} />
          <Field label="29. Height" value={f.height} display={ft(f.height)} readOnly={ro} placeholder="ft." onChange={(v) => set({ height: v })} />
          <Field label="30. Total Frontage" value={f.totalFrontage} display={ft(f.totalFrontage)} readOnly={ro} placeholder="ft." onChange={(v) => set({ totalFrontage: v })} />
          <Field label="31. Frontage Offered" value={f.frontageOffered} display={ft(f.frontageOffered)} readOnly={ro} placeholder="ft." onChange={(v) => set({ frontageOffered: v })} />
          {ro ? (
            <Field label="37. Signage Dimension" value="" display={`Width: ${ft(f.signageWidth) || '—'}  /  Height: ${ft(f.signageHeight) || '—'}`} readOnly onChange={() => {}} />
          ) : (
            <div>
              <div className="mb-2 text-[13px] text-ink-2">37. Signage Dimension</div>
              <div className="grid grid-cols-2 gap-2">
                <Field label={<span className="text-[11px] text-muted">Width (ft.)</span>} value={f.signageWidth} readOnly={false} onChange={(v) => set({ signageWidth: v })} />
                <Field label={<span className="text-[11px] text-muted">Height (ft.)</span>} value={f.signageHeight} readOnly={false} onChange={(v) => set({ signageHeight: v })} />
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Installation readiness" sub="Space and fixture availability for the proposed ATM">
        <div className={grid4}>
          <Radios label="32. ‘L’ Shape Signage" value={f.lSignage} options={YN} readOnly={ro} onChange={(v) => set({ lSignage: v as YesNo })} />
          <Radios label="33. V-SAT" value={f.vsat} options={YN} readOnly={ro} onChange={(v) => set({ vsat: v as YesNo })} />
          <Radios label="34. AC ODU Space" value={f.acOdu} options={YN} readOnly={ro} onChange={(v) => set({ acOdu: v as YesNo })} />
          <Radios label="39. Shutter Available" value={f.shutter} options={YN} readOnly={ro} onChange={(v) => set({ shutter: v as YesNo })} />
        </div>
      </SectionCard>

      <SectionCard title="Power availability" sub="35. Power Availability (confirm permanent meter and rating)">
        <div className="space-y-5">
          <div className={grid3}>
            <Radios label="35. Power Availability" value={f.powerAvailable} options={YN} readOnly={ro} onChange={(v) => set({ powerAvailable: v as YesNo })} />
            <Radios label="Meter type" value={f.meterType} options={['Permanent', 'Temporary']} readOnly={ro} onChange={(v) => set({ meterType: v as DossierForm['meterType'] })} />
            <Field
              label="36. Power Available (in Hours)"
              value={f.powerHours}
              display={f.powerHours ? `${f.powerHours} hours / day` : ''}
              readOnly={ro}
              inputMode="numeric"
              onChange={(v) => set({ powerHours: v })}
              error={e.powerHours}
            />
          </div>
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
            <Field label={`${f.meterType || 'Permanent'} meter detail`} value={f.permanentMeter} display={fmt.meter(f.permanentMeter)} readOnly={ro} onChange={(v) => set({ permanentMeter: v })} />
            <Field label="Meter / rating detail" value={f.meterDetail} readOnly={ro} onChange={(v) => set({ meterDetail: v })} />
          </div>
          <Note>Illustrative survey: permanent meter and sanctioned load marked as confirmed. Electrical rating to be validated at the on-site assessment.</Note>
        </div>
      </SectionCard>
    </div>
  )
}

// ── 04 · CRA & Nearby ATMs (56:2402) ────────────────────────────────────
function AtmTable({ title, rows, readOnly: ro, onChange, city }: { title: string; rows: AtmRow[]; readOnly: boolean; onChange: (rows: AtmRow[]) => void; city: string }) {
  const filled = rows.filter((r) => r.atmId || r.bank).length
  const cell = 'border-r border-b border-line-soft px-2.5 py-2 last:border-r-0'
  const input = 'h-8 w-full min-w-20 rounded border border-line bg-white px-2 text-[13px] outline-none focus:border-primary'
  const put = (i: number, p: Partial<AtmRow>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...p } : r)))
  const cols: { k: keyof AtmRow; h: string; w: number }[] = [
    { k: 'atmId', h: 'ATM ID', w: 130 },
    { k: 'bank', h: 'Bank Name', w: 220 },
    { k: 'siteType', h: 'Onsite / Offsite', w: 200 },
    { k: 'distance', h: 'Distance', w: 200 },
    { k: 'direction', h: 'Direction', w: 200 },
    { k: 'avgTxn', h: 'Per day Avg. Approx TXN', w: 200 },
  ]
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <header className="flex flex-wrap items-center gap-3 px-4 py-3.5">
        <Table2 size={17} className="text-primary" />
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <span className="text-[12px] text-muted">
          {filled} location{filled === 1 ? '' : 's'} · Illustrative survey
        </span>
      </header>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface text-left">
              <th className="w-10 border-r border-b border-line-soft px-2.5 py-2 text-[12px] font-semibold">S.N.</th>
              {cols.map((c) => (
                <th key={c.k} className="border-r border-b border-line-soft px-2.5 py-2 font-semibold last:border-r-0" style={{ minWidth: c.w }}>
                  {c.k === 'avgTxn' ? (
                    <>
                      Per day Avg.
                      <br />
                      Approx TXN
                    </>
                  ) : (
                    c.h
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i % 2 ? 'bg-surface/50' : undefined}>
                <td className={cell}>{String.fromCharCode(65 + i)}</td>
                {cols.map((c) => (
                  <td key={c.k} className={cell}>
                    {ro ? (
                      c.k === 'atmId' ? (
                        <span className="text-primary">{r.atmId || '—'}</span>
                      ) : c.k === 'distance' ? (
                        fmt.unit(r.distance, 'km') || '—'
                      ) : (
                        r[c.k] || <span className="text-muted">—</span>
                      )
                    ) : c.k === 'siteType' ? (
                      <select value={r.siteType} onChange={(e) => put(i, { siteType: e.target.value as AtmRow['siteType'] })} className={input}>
                        <option value="">Select</option>
                        <option>Onsite</option>
                        <option>Offsite</option>
                      </select>
                    ) : (
                      <input
                        value={r[c.k]}
                        inputMode={c.k === 'distance' || c.k === 'avgTxn' ? 'decimal' : undefined}
                        placeholder={c.k === 'distance' ? 'km' : undefined}
                        onChange={(e) => put(i, { [c.k]: e.target.value })}
                        className={input}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="flex flex-wrap justify-between gap-2 px-4 py-2.5 text-[11px] text-muted">
        <span>Distances and daily transactions are illustrative estimates.</span>
        <span className="text-primary">Site survey · {city}</span>
      </footer>
    </section>
  )
}

export function CraAtmsSection({ form: f, set, attach, errors: e, readOnly: ro }: SectionProps) {
  const upload = async () => {
    const file = await pickOne('image/png,image/jpeg,application/pdf')
    if (file) attach({ signature: file })
  }
  return (
    <div className="space-y-5">
      <SectionCard title="CRA / Nearest Branch Details" sub="Cash replenishment coverage and proposed servicing branch">
        <div className="space-y-5">
          <div className={grid3}>
            <Radios label="40. CRA Coverage" value={f.craCoverage} options={YN} readOnly={ro} onChange={(v) => set({ craCoverage: v as YesNo })} />
            <Field label="41. CRA Agency Name" value={f.craAgency} readOnly={ro} onChange={(v) => set({ craAgency: v })} />
            <Field label="42. WLA ATM account proposed branch name" value={f.proposedBranch} readOnly={ro} onChange={(v) => set({ proposedBranch: v })} />
          </div>
          <div className={grid4}>
            <Field label="43. Branch Manager Name" value={f.branchManager} readOnly={ro} onChange={(v) => set({ branchManager: v })} />
            <Field label="44. Branch Manager Number" value={f.branchManagerNumber} display={fmt.phone(f.branchManagerNumber)} readOnly={ro} inputMode="tel" onChange={(v) => set({ branchManagerNumber: v })} error={e.branchManagerNumber} />
            <Field label="45. Branch SOL ID / IFSC Code" value={f.solIfsc} display={fmt.ifsc(f.solIfsc)} readOnly={ro} onChange={(v) => set({ solIfsc: v })} />
            <Field label="46. Site distance from nearest branch (KM)" value={f.branchDistance} display={fmt.unit(f.branchDistance, 'km')} readOnly={ro} inputMode="decimal" onChange={(v) => set({ branchDistance: v })} error={e.branchDistance} />
          </div>
        </div>
      </SectionCard>

      <AtmTable title="47. Nearest ATM Details" rows={f.nearestAtms} readOnly={ro} onChange={(rows) => set({ nearestAtms: rows })} city={f.city} />
      <AtmTable title="48. Nearby Hitachi ATM Details" rows={f.hitachiAtms} readOnly={ro} onChange={(rows) => set({ hitachiAtms: rows })} city={f.city} />

      <SectionCard title="Franchise Signature" sub="Applicant acknowledgement for the site survey">
        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,408px)_1fr]">
          <div className="grid h-[122px] place-items-center rounded-lg border border-dashed border-line bg-surface/60 px-4 text-center">
            <div>
              <PenLine size={24} className="mx-auto text-ink-2" />
              {f.signature ? (
                <>
                  <div className="mt-2 text-[13px] font-semibold break-all text-ink">{f.signature.name}</div>
                  <div className="mt-1 text-[11px] text-muted">{fmtSize(f.signature.size)} · Signature attached</div>
                </>
              ) : (
                <>
                  <div className="mt-2 text-[13px] font-semibold text-ink">Franchise signature placeholder</div>
                  <div className="mt-1.5 text-[11px] text-muted">No signature attached · PNG / JPG / PDF</div>
                </>
              )}
            </div>
          </div>
          <div>
            <p className="text-[13px] text-ink-2">Upload the franchise applicant’s signed acknowledgement. This dossier does not include a fabricated signature.</p>
            <div className="mt-3 flex items-center gap-3">
              <Button variant="secondary" icon={<Upload size={15} />} onClick={upload}>
                {f.signature ? 'Replace signature' : 'Upload signature'}
              </Button>
              {f.signature && !ro && (
                <button onClick={() => set({ signature: null })} className="text-[12px] text-muted hover:text-brand-red">
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

// ── 05 · Documents Checklist (56:2046) ──────────────────────────────────
const DOC_SHORT = ['PPT', 'PAN Card', 'Aadhar Card', 'Pass-book / cheque', 'Bank Statement', 'GST Certificate', 'Other Business proof', 'Rent Agreement Copy']
const DOC_AWAIT = ['Awaiting 15 site images · PPT / PPTX', 'Awaiting upload · PDF / JPG', 'Awaiting upload · PDF / JPG', 'Awaiting upload · PDF / JPG', 'Awaiting 6 months · PDF', 'Awaiting upload · PDF', 'Awaiting upload · PDF', 'Awaiting signed copy · PDF']

export function DocumentsSection({ form: f, set, attach, readOnly: ro }: SectionProps) {
  const yes = f.documents.filter((d) => d.status === 'Yes').length
  const pending = f.documents.map((d, i) => (d.status === 'Yes' && d.file ? null : DOC_SHORT[i])).filter(Boolean) as string[]
  const upload = async (i: number) => {
    const file = await pickOne(i === 0 ? '.ppt,.pptx' : '.pdf,image/png,image/jpeg')
    if (file) attach({ documents: f.documents.map((d, k) => (k === i ? { status: 'Yes', file } : d)) })
  }
  return (
    <SectionCard title="Checklist for WLA Site" sub="Please find the below mentioned checklist of documents for approval of WLA site:" badge={`${yes} of ${f.documents.length} · Yes`}>
      <Note className="mb-5">Note: All documents should be a self-attested photocopy.</Note>
      <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[860px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface text-left text-[12px] text-ink-2">
              <th className="w-14 px-4 py-3 font-semibold">S.N.</th>
              <th className="px-4 py-3 font-semibold">Documents</th>
              <th className="w-44 px-4 py-3 font-semibold">Status (Mark Yes /No)</th>
              <th className="px-4 py-3 font-semibold">Attachments / upload</th>
              <th className="w-28 px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {DOCUMENTS.map((name, i) => {
              const d = f.documents[i]
              const seeded = d.file && DOC_SEED[i]?.[0] === d.file.name
              return (
                <tr key={name} className="border-t border-line">
                  <td className="px-4 py-5 text-muted">{i + 1}</td>
                  <td className="max-w-[360px] px-4 py-5 text-[14px] text-ink">{name}</td>
                  <td className="px-4 py-5">
                    <Radios value={d.status} options={YN} readOnly={ro} onChange={(v) => set({ documents: f.documents.map((x, k) => (k === i ? { ...x, status: v as YesNo } : x)) })} />
                  </td>
                  <td className="px-4 py-5">
                    {d.file ? (
                      <div>
                        <div className="flex items-center gap-2 text-primary">
                          <FileText size={15} className="shrink-0" />
                          <span className="break-all">{d.file.name}</span>
                          {!ro && (
                            <button aria-label="Remove file" onClick={() => set({ documents: f.documents.map((x, k) => (k === i ? { status: 'No', file: null } : x)) })} className="text-muted hover:text-brand-red">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <div className="mt-1 text-[11px] text-muted">
                          {seeded ? 'Illustrative record' : 'Uploaded'} · {fmtSize(d.file.size)} · {i === 4 ? '6 months' : 'Self-attested'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 text-ink-2">
                          <Upload size={15} className="shrink-0" /> No attachment record
                        </div>
                        <div className="mt-1 text-[11px] text-muted">{DOC_AWAIT[i]}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-5">
                    <Button variant="secondary" icon={<Upload size={15} />} onClick={() => upload(i)}>
                      {d.file ? 'Replace' : 'Upload'}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted">
        <span className="flex flex-wrap items-center gap-3">
          {pending.length ? (
            <>
              <Chip tone="amber">{pending.length} pending</Chip>
              <span className="text-ink-2">
                {pending.length === 1 ? pending[0] : `${pending.slice(0, -1).join(', ')} and ${pending[pending.length - 1]}`} {pending.length === 1 ? 'requires' : 'require'} completion.
              </span>
            </>
          ) : (
            <Chip>All documents attached</Chip>
          )}
        </span>
        <span>File names and Yes/No states are illustrative records only.</span>
      </div>
    </SectionCard>
  )
}

// ── 06 · Site Images & Office Use (56:1628 view · 188:6597 edit) ────────
export function ImagesOfficeSection({ form: f, set, attach, readOnly: ro }: SectionProps) {
  const n = f.images.filter(Boolean).length
  const take = (file: File): FileRef | undefined => {
    if (file.size > MAX_MB * 1024 * 1024) {
      toast(`${file.name} is larger than ${MAX_MB} MB`, 'info')
      return undefined
    }
    return { name: file.name, size: file.size }
  }
  const uploadOne = async (i: number) => {
    const [file] = await pickFiles('image/png,image/jpeg')
    const ref = file && take(file)
    if (ref) attach({ images: f.images.map((x, k) => (k === i ? ref : x)) })
  }
  const uploadMany = async () => {
    const files = await pickFiles('image/png,image/jpeg', true)
    if (!files.length) return
    const next = [...f.images]
    let placed = 0
    for (const file of files) {
      const slot = next.findIndex((x) => !x)
      if (slot < 0) break
      const ref = take(file)
      if (ref) {
        next[slot] = ref
        placed++
      }
    }
    if (placed) {
      attach({ images: next })
      toast(`${placed} image${placed > 1 ? 's' : ''} placed in the next empty positions`)
    } else toast('All 15 positions already have an image', 'info')
  }
  return (
    <div className="space-y-5">
      <SectionCard title="Site Images for PPT" sub="15 required attachment positions · Preserve this order in the presentation" badge={`${n} of ${IMAGE_SLOTS.length} files`}>
        <Note className="mb-5">Note: Please make sure that the images will be put into PPT according to the above serial number.</Note>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {IMAGE_SLOTS.map((slot, i) => {
            const img = f.images[i]
            const isMap = i >= 13
            const Icon = isMap ? Map : ImageIcon
            return (
              <div key={slot} className="rounded-lg border border-line bg-white p-3.5">
                <div className="mb-4 flex items-start gap-2.5">
                  <span className="mt-1 grid h-6 min-w-6 place-items-center rounded bg-primary-soft px-1 text-[12px] font-semibold text-primary">{i + 1}</span>
                  <span className="text-[13px] text-ink">{slot}</span>
                </div>
                <button
                  type="button"
                  onClick={() => uploadOne(i)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md border border-dashed px-3 py-3 text-left',
                    img ? 'border-emerald-200 bg-emerald-50/50' : 'border-line bg-surface/60 hover:border-primary/50',
                  )}
                >
                  <Icon size={20} className={img ? 'shrink-0 text-emerald-600' : 'shrink-0 text-ink-2'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-primary">{img ? img.name : isMap ? 'Upload map capture' : 'Upload image'}</span>
                    <span className="block text-[11px] text-muted">{img ? `${fmtSize(img.size)} · Attached · Click to replace` : `Not attached · JPG / PNG · Up to ${MAX_MB} MB`}</span>
                  </span>
                  <Upload size={16} className="shrink-0 text-primary" />
                </button>
                {img && !ro && (
                  <button onClick={() => set({ images: f.images.map((x, k) => (k === i ? null : x)) })} className="mt-2 text-[11px] text-muted hover:text-brand-red">
                    Remove image
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] text-muted">Upload actual site photos and map captures. No generated evidence is shown.</span>
          <Button variant="secondary" icon={<Upload size={15} />} onClick={uploadMany}>
            Upload image files
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Office Use Only" sub="Internal sourcing record · Not part of the applicant’s public dossier" badge="Internal use">
        <div className="space-y-5">
          <Field label="Site Sourcing SSE / SSM Details" value={f.sourcedBy} readOnly={ro} onChange={(v) => set({ sourcedBy: v })} />
          <div className={grid3}>
            <Field label="Site Number" value={f.siteNumber} readOnly={ro} onChange={(v) => set({ siteNumber: v })} />
            <Field label="Site Sourced By" value={f.siteSourcedBy} readOnly={ro} onChange={(v) => set({ siteSourcedBy: v })} />
            <Field label="Site Sourcing Code" value={f.sourcingCode} readOnly={ro} onChange={(v) => set({ sourcingCode: v })} />
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
