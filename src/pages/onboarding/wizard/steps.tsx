import { Info } from 'lucide-react'
import {
  BUSINESS_TYPES, DOCUMENTS, IMAGE_SLOTS, LOCATIONS, PLANS, PROJECT_TYPES, RBI_CATEGORIES, SITE_TYPES, STATES, TIS_TYPES,
  type ApplicationForm, type AtmRow, type YesNo,
} from '@/data/applications'
import { FileDrop, RadioGroup, SectionTitle, SelectField, TextField } from '@/components/ui/Form'
import { cn } from '@/lib/cn'
import type { Errors } from './validate'

export type StepProps = {
  form: ApplicationForm
  set: (patch: Partial<ApplicationForm>) => void
  errors: Errors
  readOnly?: boolean
}

const grid2 = 'grid gap-x-4 gap-y-4 sm:grid-cols-2'
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
    <div className="space-y-8">
      <div>
        <SectionTitle num="01" title="Franchise Details" />
        <div className={grid2}>
          <TextField num={14} label="Franchise Name" placeholder="Registered franchise name" {...bind(p, 'franchiseName')} />
          <TextField num={15} label="Franchise Name on Cheque" placeholder="As printed on cheque" {...bind(p, 'nameOnCheque')} />
          <TextField num={16} label="Contact Number" inputMode="tel" placeholder="10-digit mobile number" {...bind(p, 'contactNumber')} />
          <TextField num={17} label="Alternate Number" inputMode="tel" placeholder="Enter alternate contact number" {...bind(p, 'alternateNumber')} />
          <TextField num={18} label="Email ID" type="email" placeholder="name@company.in" {...bind(p, 'email')} />
          <TextField num={19} label="Correspondence Address" placeholder="Address for correspondence" {...bind(p, 'corrAddress')} />
          <TextField label="Landmark" placeholder="Nearby landmark" {...bind(p, 'corrLandmark')} />
          <SelectField label="State" options={STATES} {...bind(p, 'corrState')} onChange={(e) => p.set({ corrState: e.target.value, corrDistrict: '' })} />
          <SelectField label="District" options={loc?.cities ?? []} placeholder={p.form.corrState ? 'Select district' : 'Select state first'} {...bind(p, 'corrDistrict')} />
          <TextField label="Pin" inputMode="numeric" maxLength={6} placeholder="6-digit pin" {...bind(p, 'corrPin')} />
        </div>
      </div>
      <div>
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
    <div className="space-y-8">
      <div>
        <SectionTitle title="Shop / Site Dimensional Details" />
        <div className={grid2}>
          <TextField label="Shop Owner Name" placeholder="Owner name" {...bind(p, 'shopOwnerName')} />
          <TextField label="Shop Owner Number" inputMode="tel" placeholder="10-digit number" {...bind(p, 'shopOwnerNumber')} />
          <TextField num={24} label="Total Shop Area (Sq.ft.)" inputMode="decimal" placeholder="e.g. 240" {...bind(p, 'totalArea')} />
          <TextField num={25} label="Shop Area Offered (Sq.ft.)" inputMode="decimal" placeholder="e.g. 120" {...bind(p, 'offeredArea')} />
          <TextField num={26} label="Carpet Area (Sq.ft.)" inputMode="decimal" placeholder="e.g. 110" {...bind(p, 'carpetArea')} />
          <TextField num={27} label="Depth" placeholder="e.g. 12 ft" {...bind(p, 'depth')} />
          <TextField num={28} label="Width" placeholder="e.g. 10 ft" {...bind(p, 'width')} />
          <TextField num={29} label="Height" placeholder="e.g. 10 ft" {...bind(p, 'height')} />
          <TextField num={30} label="Total Frontage" placeholder="e.g. 20 ft" {...bind(p, 'totalFrontage')} />
          <TextField num={31} label="Frontage Offered" placeholder="e.g. 10 ft" {...bind(p, 'frontageOffered')} />
          {yn('lSignage', 32, "'L' Shape Signage")}
          {yn('vsat', 33, 'V-SAT')}
          {yn('acOdu', 34, 'AC ODU Space')}
        </div>
      </div>
      <div>
        <SectionTitle title="Power & site facilities" sub="Confirm power availability, permanent meter and rating." />
        <div className={grid2}>
          {yn('powerAvailable', 35, 'Power Availability')}
          <RadioGroup label="Meter type" options={['Permanent', 'Temporary']} value={p.form.meterType} onChange={(v) => !p.readOnly && p.set({ meterType: v })} />
          <TextField className="sm:col-span-2" label="Meter / rating detail" placeholder="Enter meter number and sanctioned power rating" {...bind(p, 'meterDetail')} />
          <TextField num={36} label="Power Available (in Hours)" inputMode="numeric" placeholder="0–24" {...bind(p, 'powerHours')} />
          <div className="grid grid-cols-2 gap-3">
            <TextField num={37} label="Signage Width" placeholder="e.g. 10 ft" {...bind(p, 'signageWidth')} />
            <TextField label="Signage Height" placeholder="e.g. 3 ft" {...bind(p, 'signageHeight')} />
          </div>
          <RadioGroup num={38} label="Shop Status" options={['Rented', 'Owned']} value={p.form.shopStatus} onChange={(v) => !p.readOnly && p.set({ shopStatus: v })} />
          {yn('shutter', 39, 'Shutter Available')}
        </div>
        {p.form.meterType && !p.form.meterDetail && (
          <p className="mt-4 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            <Info size={14} /> Draft: meter number and sanctioned power rating have not been entered.
          </p>
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
    <div className="space-y-8">
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
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead className="bg-surface text-left text-[12px]">
            <tr>
              <th className="w-12 border-b border-line px-3 py-3 font-semibold">S.N.</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Documents</th>
              <th className="w-48 border-b border-line px-3 py-3 font-semibold">Status (Mark Yes /No)</th>
              <th className="w-72 border-b border-line px-3 py-3 font-semibold">Upload document</th>
            </tr>
          </thead>
          <tbody>
            {DOCUMENTS.map((doc, i) => {
              const d = p.form.documents[i]
              return (
                <tr key={doc} className="border-b border-line-soft last:border-0">
                  <td className="px-3 py-3 text-muted">{i + 1}</td>
                  <td className="px-3 py-3">{doc}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      {YN.map((o) => (
                        <button
                          key={o}
                          type="button"
                          disabled={p.readOnly}
                          onClick={() => upd(i, { status: o })}
                          className={cn('h-8 flex-1 rounded-md border text-[12px]', d.status === o ? 'border-primary bg-primary-soft font-semibold text-primary' : 'border-line text-ink-2')}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <FileDrop compact value={d.file} onChange={(f) => upd(i, { file: f, status: f ? 'Yes' : d.status })} accept={i === 0 ? '.ppt,.pptx,.pdf' : 'image/*,application/pdf'} maxMb={i === 0 ? 25 : 5} label="Upload" disabled={p.readOnly} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] text-muted">Note: All documents should be a self-attested photocopy.</p>
    </div>
  )
}

// ── Step 6 · Images & office use ─────────────────────────────────────────
export function ImagesOffice(p: StepProps) {
  const uploaded = p.form.images.filter(Boolean).length
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle title="Images for making the PPT" sub={`Upload each view in the sequence below. ${uploaded} of 15 images uploaded.`} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {IMAGE_SLOTS.map((slot, i) => (
            <div key={slot} className="rounded-lg border border-line p-3">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold">
                <span className="grid h-5 w-5 place-items-center rounded bg-primary-soft text-[10px] text-primary">{i + 1}</span>
                {slot}
              </div>
              <FileDrop
                compact
                value={p.form.images[i]}
                onChange={(f) => p.set({ images: p.form.images.map((x, j) => (j === i ? f : x)) })}
                accept="image/png,image/jpeg"
                maxMb={10}
                hint="Not uploaded"
                disabled={p.readOnly}
              />
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          Please make sure that the images will be put into PPT according to the above serial number.
        </p>
      </div>
      <div className="rounded-xl border border-line bg-surface/50 p-5">
        <div className="mb-1 text-[11px] font-semibold tracking-wider text-muted">OFFICE USE ONLY</div>
        <SectionTitle title="SSE – Site Sourcing SSE / SSM Details" />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Site Number" placeholder="Enter site number" {...bind(p, 'siteNumber')} />
          <TextField label="Site Sourced By" placeholder="Enter SSE / SSM name" {...bind(p, 'sourcedBy')} />
          <TextField label="Site Sourcing Code" placeholder="Enter sourcing code" {...bind(p, 'sourcingCode')} />
        </div>
      </div>
    </div>
  )
}
