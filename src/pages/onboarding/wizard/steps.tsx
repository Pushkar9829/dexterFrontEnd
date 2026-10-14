import { useRef, type ReactNode } from 'react'
import { Info, UploadCloud, X } from 'lucide-react'
import {
  BUSINESS_TYPES, DOCUMENTS, IMAGE_SLOTS, LOCATIONS, PLANS, PROJECT_TYPES, RBI_CATEGORIES, SITE_TYPES, STATES, TIS_TYPES,
  type ApplicationForm, type AtmRow, type YesNo,
} from '@/data/applications'
import { FileDrop, RadioGroup, SelectField, TextField, fmtSize, type FileValue } from '@/components/ui/Form'
import { cn } from '@/lib/cn'
import type { Errors } from './validate'

export type StepProps = {
  form: ApplicationForm
  set: (patch: Partial<ApplicationForm>) => void
  errors: Errors
  readOnly?: boolean
}

const grid2 = 'grid gap-x-4 gap-y-4 sm:grid-cols-2'
const grid3 = 'grid gap-x-4 gap-y-4 sm:grid-cols-3'

/** Step section heading as in the WLA form frames: optional filled number badge + 17px title. */
function SectionTitle({ num, title, sub }: { num?: string; title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5">
        {num && <span className="grid h-[22px] min-w-[22px] place-items-center rounded bg-primary px-1 text-[10px] font-semibold text-white">{num}</span>}
        <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
      </div>
      {sub && <p className={cn('mt-1 text-[12px] text-muted', num && 'pl-8')}>{sub}</p>}
    </div>
  )
}

/** Blue note band (documents / images / shop dimension drafts). */
function Note({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-lg border border-blue-100 bg-primary-soft px-3.5 py-3 text-[12px] text-primary">
      {icon}
      <span>{children}</span>
    </div>
  )
}

/** One-line dashed upload box ("Click to upload or drag a file"). */
function InlineDrop({ value, onChange, accept, maxMb = 5, disabled }: { value: FileValue; onChange: (f: FileValue) => void; accept?: string; maxMb?: number; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const take = (f?: File) => {
    if (!f) return
    if (f.size > maxMb * 1024 * 1024) {
      alert(`File is larger than ${maxMb} MB.`)
      return
    }
    onChange({ name: f.name, size: f.size })
  }
  if (value)
    return (
      <div className="flex h-10 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/50 px-3 text-[12px]">
        <span className="min-w-0 flex-1 truncate font-medium text-ink">{value.name}</span>
        <span className="text-muted">{fmtSize(value.size)}</span>
        {!disabled && (
          <button type="button" onClick={() => onChange(null)} className="text-muted hover:text-brand-red" aria-label="Remove file">
            <X size={14} />
          </button>
        )}
      </div>
    )
  return (
    <div
      onClick={() => !disabled && ref.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        if (!disabled) take(e.dataTransfer.files[0])
      }}
      className={cn(
        'flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-line bg-surface/70 px-3 text-[12px] text-primary hover:border-primary/50',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <UploadCloud size={16} /> Click to upload or drag a file
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => take(e.target.files?.[0])} />
    </div>
  )
}
const YN: Exclude<YesNo, ''>[] = ['Yes', 'No']

/** binds a text input to a form key */
function bind(p: StepProps, key: keyof ApplicationForm) {
  return {
    name: key,
    value: (p.form[key] as string) ?? '',
    onChange: (e: { target: { value: string } }) => p.set({ [key]: e.target.value } as Partial<ApplicationForm>),
    error: p.errors[key],
    disabled: p.readOnly,
  }
}

// ── Step 1 · Site details ────────────────────────────────────────────────
export function SiteDetails(p: StepProps) {
  const loc = LOCATIONS[p.form.state]
  return (
    <div>
      <SectionTitle num="01" title="Site Details" />
      <div className={grid2}>
        <TextField label="Proposed Site Location Name" required placeholder="e.g. Shree Sai Financial Services - Pune" {...bind(p, 'siteName')} />
        <SelectField
          label="State" required options={STATES} placeholder="Select state"
          {...bind(p, 'state')}
          onChange={(e) => p.set({ state: e.target.value, city: '', circle: '', district: '' })}
        />
        <SelectField label="City" required options={loc?.cities ?? []} placeholder={p.form.state ? 'Select city' : 'Select state first'} {...bind(p, 'city')} />
        <SelectField label="Circle / Zone" required options={loc?.circles ?? []} placeholder="Select circle / zone" {...bind(p, 'circle')} />
        <SelectField label="District" required options={loc?.cities ?? []} placeholder="Select district" {...bind(p, 'district')} />
        <TextField label="Pin Code" required inputMode="numeric" maxLength={6} placeholder="6-digit pin code" {...bind(p, 'pinCode')} />
        <TextField label="Landmark" required placeholder="Nearby landmark" {...bind(p, 'landmark')} />
        <SelectField label="RBI Category" required options={RBI_CATEGORIES} {...bind(p, 'rbiCategory')} />
        <TextField className="sm:col-span-2" label="Site Complete Address" required placeholder="Shop no., building, street, area" {...bind(p, 'siteAddress')} />
        <TextField label="Site Latitude" required inputMode="decimal" placeholder="e.g. 18.5204" {...bind(p, 'latitude')} />
        <TextField label="Site Longitude" required inputMode="decimal" placeholder="e.g. 73.8567" {...bind(p, 'longitude')} />
        <SelectField label="Site Type" required options={SITE_TYPES} {...bind(p, 'siteType')} />
        <SelectField label="TIS Type" required options={TIS_TYPES} {...bind(p, 'tisType')} />
        <SelectField label="Project Type" required options={PROJECT_TYPES} {...bind(p, 'projectType')} />
        <SelectField label="Business Type" required options={BUSINESS_TYPES} {...bind(p, 'businessType')} />
        <SelectField label="Strategy / Plan / Model Name" required options={PLANS} {...bind(p, 'plan')} />
        <TextField label="Existing ATM ID" placeholder="Not applicable" {...bind(p, 'existingAtmId')} />
        <div className="sm:col-span-2">
          <div className="mb-1.5 text-[12px] font-semibold">Latest Color Photograph of Applicant *</div>
          <FileDrop value={p.form.applicantPhoto} onChange={(f) => p.set({ applicantPhoto: f })} accept="image/png,image/jpeg" hint="JPG or PNG · Up to 5 MB" disabled={p.readOnly} />
          {p.errors.applicantPhoto && <p className="mt-1 text-[11px] text-brand-red">{p.errors.applicantPhoto}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Step 2 · Franchise & bank ────────────────────────────────────────────
export function FranchiseBank(p: StepProps) {
  const loc = LOCATIONS[p.form.corrState]
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle num="01" title="Franchise Details" />
        <div className={grid2}>
          <TextField num={14} label="Franchise Name" placeholder="Registered franchise name" {...bind(p, 'franchiseName')} />
          <TextField num={15} label="Franchise Name on Cheque" placeholder="As printed on cheque" {...bind(p, 'nameOnCheque')} />
          <TextField num={16} label="Contact Number" inputMode="tel" placeholder="10-digit mobile number" {...bind(p, 'contactNumber')} />
          <TextField num={17} label="Alternate Number" inputMode="tel" placeholder="Enter alternate contact number" {...bind(p, 'alternateNumber')} />
          <TextField className="sm:col-span-2" num={18} label="Email ID" type="email" placeholder="name@company.in" {...bind(p, 'email')} />
          <TextField className="sm:col-span-2" num={19} label="Correspondence Address" placeholder="Address for correspondence" {...bind(p, 'corrAddress')} />
          <TextField label="Landmark" placeholder="Nearby landmark" {...bind(p, 'corrLandmark')} />
          <SelectField label="District" options={loc?.cities ?? []} placeholder={p.form.corrState ? 'Select district' : 'Select state first'} {...bind(p, 'corrDistrict')} />
          <SelectField label="State" options={STATES} {...bind(p, 'corrState')} onChange={(e) => p.set({ corrState: e.target.value, corrDistrict: '' })} />
          <TextField label="Pin" inputMode="numeric" maxLength={6} placeholder="6-digit pin" {...bind(p, 'corrPin')} />
        </div>
      </div>
      <div className="border-t border-line pt-6">
        <SectionTitle num="02" title="Franchise Bank's Details" />
        <div className={grid2}>
          <TextField num={20} label="Bank Name" placeholder="e.g. HDFC Bank" {...bind(p, 'bankName')} />
          <TextField num={21} label="Branch Name" placeholder="Branch" {...bind(p, 'branchName')} />
          <TextField num={22} label="Account Number" inputMode="numeric" placeholder="Enter account number" {...bind(p, 'accountNumber')} />
          <TextField num={23} label="IFSC Code" placeholder="Enter IFSC code" {...bind(p, 'ifsc')} onChange={(e) => p.set({ ifsc: e.target.value.toUpperCase() })} />
        </div>
      </div>
    </div>
  )
}

// ── Step 3 · Shop dimensions ─────────────────────────────────────────────
export function ShopDimensions(p: StepProps) {
  const yn = (key: keyof ApplicationForm, num: number, label: string) => (
    <RadioGroup num={num} label={label} options={YN} value={p.form[key] as YesNo} onChange={(v) => !p.readOnly && p.set({ [key]: v } as Partial<ApplicationForm>)} />
  )
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle title="Shop / Site Dimensional Details" />
        <div className="space-y-4">
          <div className={grid2}>
            <TextField label="Shop Owner Name" placeholder="Owner name" {...bind(p, 'shopOwnerName')} />
            <TextField label="Shop Owner Number" inputMode="tel" placeholder="10-digit number" {...bind(p, 'shopOwnerNumber')} />
          </div>
          <div className={grid3}>
            <TextField num={24} label="Total Shop Area (Sq.ft.)" inputMode="decimal" placeholder="e.g. 240" {...bind(p, 'totalArea')} />
            <TextField num={25} label="Shop Area Offered (Sq.ft.)" inputMode="decimal" placeholder="e.g. 120" {...bind(p, 'offeredArea')} />
            <TextField num={26} label="Carpet Area (Sq.ft.)" inputMode="decimal" placeholder="e.g. 110" {...bind(p, 'carpetArea')} />
            <TextField num={27} label="Depth" placeholder="e.g. 12 ft" {...bind(p, 'depth')} />
            <TextField num={28} label="Width" placeholder="e.g. 10 ft" {...bind(p, 'width')} />
            <TextField num={29} label="Height" placeholder="e.g. 10 ft" {...bind(p, 'height')} />
          </div>
          <div className={grid2}>
            <TextField num={30} label="Total Frontage" placeholder="e.g. 20 ft" {...bind(p, 'totalFrontage')} />
            <TextField num={31} label="Frontage Offered" placeholder="e.g. 10 ft" {...bind(p, 'frontageOffered')} />
          </div>
          <div className={grid3}>
            {yn('lSignage', 32, "'L' Shape Signage")}
            {yn('vsat', 33, 'V-SAT')}
            {yn('acOdu', 34, 'AC ODU Space')}
          </div>
        </div>
      </div>
      <div className="border-t border-line pt-6">
        <SectionTitle title="Power & site facilities" sub="Confirm power availability, permanent meter and rating." />
        <div className={grid2}>
          {yn('powerAvailable', 35, 'Power Availability')}
          <RadioGroup label="Meter type" options={['Permanent', 'Temporary']} value={p.form.meterType} onChange={(v) => !p.readOnly && p.set({ meterType: v })} />
          <TextField label="Meter / rating detail" placeholder="Enter meter number and sanctioned power rating" {...bind(p, 'meterDetail')} />
          <TextField num={36} label="Power Available (in Hours)" inputMode="numeric" placeholder="0–24" {...bind(p, 'powerHours')} />
          <TextField num={37} label="Signage Dimension — Width" placeholder="e.g. 10 ft" {...bind(p, 'signageWidth')} />
          <TextField label="Signage Dimension — Height" placeholder="e.g. 3 ft" {...bind(p, 'signageHeight')} />
          <RadioGroup num={38} label="Shop Status" options={['Rented', 'Owned']} value={p.form.shopStatus} onChange={(v) => !p.readOnly && p.set({ shopStatus: v })} />
          {yn('shutter', 39, 'Shutter Available')}
        </div>
        {p.form.meterType && !p.form.meterDetail && (
          <Note icon={<Info size={15} className="shrink-0" />}>Draft: meter number and sanctioned power rating have not been entered.</Note>
        )}
      </div>
    </div>
  )
}

// ── Step 4 · CRA & ATMs ──────────────────────────────────────────────────
function AtmTable({ rows, onChange, readOnly }: { rows: AtmRow[]; onChange: (rows: AtmRow[]) => void; readOnly?: boolean }) {
  const cell = 'h-9 w-full bg-transparent px-2.5 text-[12px] outline-none placeholder:text-muted/60 focus:bg-primary-soft/40'
  const upd = (i: number, k: keyof AtmRow, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[760px] border-collapse text-[12px]">
        <thead className="bg-surface text-left text-[11px]">
          <tr>
            {['S.N.', 'ATM ID', 'Bank Name', 'Onsite / Offsite', 'Distance (KM)', 'Direction', 'Per day Avg. Approx TXN'].map((h) => (
              <th key={h} className="border-r border-b border-line px-2.5 py-2.5 font-semibold last:border-r-0">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line-soft last:border-0">
              <td className="w-12 border-r border-line-soft px-2.5 text-muted">{String.fromCharCode(65 + i)}</td>
              <td className="border-r border-line-soft"><input disabled={readOnly} className={cell} placeholder="Enter ATM ID" value={r.atmId} onChange={(e) => upd(i, 'atmId', e.target.value)} /></td>
              <td className="border-r border-line-soft"><input disabled={readOnly} className={cell} placeholder="Enter bank" value={r.bank} onChange={(e) => upd(i, 'bank', e.target.value)} /></td>
              <td className="border-r border-line-soft">
                <select disabled={readOnly} className={cn(cell, !r.siteType && 'text-muted/70')} value={r.siteType} onChange={(e) => upd(i, 'siteType', e.target.value)}>
                  <option value="">Select type</option>
                  <option>Onsite</option>
                  <option>Offsite</option>
                </select>
              </td>
              <td className="border-r border-line-soft"><input disabled={readOnly} className={cell} inputMode="decimal" placeholder="Enter km" value={r.distance} onChange={(e) => upd(i, 'distance', e.target.value)} /></td>
              <td className="border-r border-line-soft"><input disabled={readOnly} className={cell} placeholder="Enter direction" value={r.direction} onChange={(e) => upd(i, 'direction', e.target.value)} /></td>
              <td><input disabled={readOnly} className={cell} inputMode="numeric" placeholder="Enter TXN" value={r.avgTxn} onChange={(e) => upd(i, 'avgTxn', e.target.value)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CraAtms(p: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle title="CRA / Nearest Branch Details" />
        <div className={grid2}>
          <RadioGroup num={40} label="CRA Coverage" options={YN} value={p.form.craCoverage} onChange={(v) => !p.readOnly && p.set({ craCoverage: v })} />
          <TextField num={41} label="CRA Agency Name" placeholder="Enter CRA agency name" {...bind(p, 'craAgency')} />
          <TextField className="sm:col-span-2" num={42} label="WLA ATM account proposed branch name" placeholder="Enter proposed branch name" {...bind(p, 'proposedBranch')} />
          <TextField num={43} label="Branch Manager Name" placeholder="Enter branch manager name" {...bind(p, 'branchManager')} />
          <TextField num={44} label="Branch Manager Number" inputMode="tel" placeholder="Enter contact number" {...bind(p, 'branchManagerNumber')} />
          <TextField num={45} label="Branch SOL ID / IFSC Code" placeholder="Enter SOL ID or IFSC code" {...bind(p, 'solIfsc')} />
          <TextField num={46} label="Site distance from nearest branch (KM)" inputMode="decimal" placeholder="Enter distance in KM" {...bind(p, 'branchDistance')} />
        </div>
      </div>
      <div className="border-t border-line pt-6">
        <SectionTitle title="47 · Nearest ATM Details" sub="Enter details for ATM rows A–E. Each cell is an entry field." />
        <AtmTable rows={p.form.nearestAtms} onChange={(rows) => p.set({ nearestAtms: rows })} readOnly={p.readOnly} />
      </div>
      <div className="border-t border-line pt-6">
        <SectionTitle title="48 · Nearby Hitachi ATM Details" sub="Enter details for nearby Hitachi ATM rows A–B." />
        <AtmTable rows={p.form.hitachiAtms} onChange={(rows) => p.set({ hitachiAtms: rows })} readOnly={p.readOnly} />
      </div>
      <div className="border-t border-line pt-6">
        <div className="mb-1.5 text-[12px] font-semibold">Franchise Signature</div>
        <FileDrop value={p.form.signature} onChange={(f) => p.set({ signature: f })} accept="image/png,image/jpeg,application/pdf" hint="PNG, JPG or PDF · Up to 5 MB" disabled={p.readOnly} />
      </div>
    </div>
  )
}

// ── Step 5 · Documents ───────────────────────────────────────────────────
export function Documents(p: StepProps) {
  const upd = (i: number, patch: Partial<ApplicationForm['documents'][number]>) =>
    p.set({ documents: p.form.documents.map((d, j) => (j === i ? { ...d, ...patch } : d)) })
  return (
    <div>
      <SectionTitle title="Checklist for WLA site" sub="Please find the below mentioned checklist of documents for approval of WLA site:" />
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[760px] border-collapse text-[13px]">
          <thead className="bg-surface text-left text-[12px]">
            <tr>
              <th className="border-b border-line px-4 py-3 font-semibold">Documents</th>
              <th className="w-44 border-b border-line px-3 py-3 font-semibold">Status (Mark Yes /No)</th>
              <th className="w-[280px] border-b border-line px-3 py-3 font-semibold">Upload document</th>
            </tr>
          </thead>
          <tbody>
            {DOCUMENTS.map((doc, i) => {
              const d = p.form.documents[i]
              return (
                <tr key={doc} className="border-b border-line last:border-0">
                  <td className="px-4 py-4">
                    <div className="flex gap-4">
                      <span className="w-4 text-muted">{i + 1}.</span>
                      <div>
                        <div className="text-ink">{doc}</div>
                        <div className="mt-0.5 text-[11px] text-muted">{d.file ? `${d.file.name} · ${fmtSize(d.file.size)}` : 'No file uploaded'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex gap-2">
                      {YN.map((o) => (
                        <button
                          key={o}
                          type="button"
                          role="radio"
                          aria-checked={d.status === o}
                          disabled={p.readOnly}
                          onClick={() => upd(i, { status: o })}
                          className={cn(
                            'flex h-9 w-[72px] items-center gap-2 rounded-md border px-2.5 text-[13px]',
                            d.status === o ? 'border-primary bg-primary-soft font-medium text-primary' : 'border-line bg-white text-ink-2',
                          )}
                        >
                          <span className={cn('grid h-3.5 w-3.5 place-items-center rounded-full border', d.status === o ? 'border-primary' : 'border-line')}>
                            {d.status === o && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          </span>
                          {o}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <InlineDrop
                      value={d.file}
                      onChange={(f) => upd(i, { file: f, status: f ? 'Yes' : d.status })}
                      accept={i === 0 ? '.ppt,.pptx,.pdf' : 'image/*,application/pdf'}
                      maxMb={i === 0 ? 25 : 5}
                      disabled={p.readOnly}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Note>Note: All documents should be a self-attested photocopy.</Note>
    </div>
  )
}

// ── Step 6 · Images & office use ─────────────────────────────────────────
export function ImagesOffice(p: StepProps) {
  const uploaded = p.form.images.filter(Boolean).length
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle num="06" title="Images for making the PPT" sub={`Upload each view in the sequence below. ${uploaded} of 15 images uploaded.`} />
        <div className="grid gap-3 md:grid-cols-2">
          {IMAGE_SLOTS.map((slot, i) => (
            <div key={slot} className="rounded-lg border border-line p-3">
              <div className="mb-2.5 flex items-center gap-2.5 text-[13px]">
                <span className="grid h-[22px] min-w-[22px] place-items-center rounded bg-primary px-1 text-[10px] font-semibold text-white">{i + 1}</span>
                <span className="flex-1 text-ink">{slot}</span>
                <span className={cn('text-[11px]', p.form.images[i] ? 'text-emerald-700' : 'text-muted')}>{p.form.images[i] ? 'Uploaded' : 'Not uploaded'}</span>
              </div>
              <InlineDrop
                value={p.form.images[i]}
                onChange={(f) => p.set({ images: p.form.images.map((x, j) => (j === i ? f : x)) })}
                accept="image/png,image/jpeg"
                maxMb={10}
                disabled={p.readOnly}
              />
            </div>
          ))}
        </div>
        <Note icon={<span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-primary/10 text-[12px] font-semibold">i</span>}>
          Note: Please make sure that the images will be put into PPT according to the above serial number.
        </Note>
      </div>
      <div className="rounded-xl border border-line bg-surface/60 p-5">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold tracking-wider text-muted">
          <span className="h-4 w-[3px] rounded bg-primary" /> OFFICE USE ONLY
        </div>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-[22px] place-items-center rounded bg-slate-500 px-1 text-[8px] font-bold text-white">SSE</span>
          <h3 className="text-[16px] font-semibold">Site Sourcing SSE / SSM Details</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Site Number" placeholder="Enter site number" {...bind(p, 'siteNumber')} />
          <TextField label="Site Sourced By" placeholder="Enter SSE / SSM name" {...bind(p, 'sourcedBy')} />
          <TextField label="Site Sourcing Code" placeholder="Enter sourcing code" {...bind(p, 'sourcingCode')} />
        </div>
      </div>
    </div>
  )
}
