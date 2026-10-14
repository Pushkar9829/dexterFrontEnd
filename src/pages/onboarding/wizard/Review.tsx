import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import type { ApplicationForm, AppStatus } from '@/data/applications'
import { cn } from '@/lib/cn'
import { stepStatus } from './validate'

const toneCls = { green: 'text-emerald-700 bg-emerald-50', amber: 'text-amber-700 bg-amber-50', red: 'text-brand-red bg-red-50' }

function V({ v, empty = 'Not entered' }: { v: ReactNode; empty?: string }) {
  const blank = v == null || v === '' || v === false
  return <span className={blank ? 'text-brand-red' : 'text-ink'}>{blank ? empty : v}</span>
}

const join = (...xs: string[]) => (xs.some(Boolean) ? xs.map((x) => x || 'Not entered').join(' / ') : '')

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-0.5 text-[13px]">{children}</div>
    </div>
  )
}

function Section({ n, title, f, onEdit, children, note }: { n: number; title: string; f: ApplicationForm; onEdit?: () => void; children: ReactNode; note?: ReactNode }) {
  const st = stepStatus(n, f)
  return (
    <section className="overflow-hidden rounded-xl border border-line">
      <header className="flex items-center gap-2.5 border-b border-line bg-surface/60 px-4 py-3">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-[11px] font-semibold text-white">{String(n).padStart(2, '0')}</span>
        <h3 className="text-[14px] font-semibold">{title}</h3>
        <span className={cn('ml-auto rounded px-2 py-0.5 text-[11px] font-medium', toneCls[st.tone])}>{st.label}</span>
        {onEdit && (
          <button onClick={onEdit} className="rounded-md border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-primary hover:bg-primary-soft">
            Edit step {n}
          </button>
        )}
      </header>
      <div className="grid gap-x-8 gap-y-3 px-4 py-4 sm:grid-cols-2">{children}</div>
      {note && <div className="mx-4 mb-4 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">{note}</div>}
    </section>
  )
}

export function Review({ form: f, status, onEdit }: { form: ApplicationForm; status: AppStatus; onEdit?: (step: number) => void }) {
  const docs = f.documents.filter((d) => d.file).length
  const imgs = f.images.filter(Boolean).length
  const photos = (f.applicantPhoto ? 1 : 0) + (f.signature ? 1 : 0)
  const atmFilled = (rows: ApplicationForm['nearestAtms']) => rows.filter((r) => r.atmId).length
  const docPair = (a: number, b: number) => `${f.documents[a].file ? 'Uploaded' : 'Not uploaded'} / ${f.documents[b].file ? 'Uploaded' : 'Not uploaded'}`
  const isDraft = status === 'Draft'

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] font-semibold">Review &amp; Submit</h3>
        <p className="mt-1 text-[12px] text-muted">Review the draft values and return to any section to make changes.</p>
      </div>

      {isDraft && (docs < 8 || imgs < 15) && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-primary-soft px-4 py-3 text-[12px] text-primary">
          <Info size={16} />
          This application is still a draft. Several details are not entered and no evidence files have been uploaded. It has not been submitted.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Application status', isDraft ? 'Draft · Details pending' : status],
          ['Document uploads', `${docs} of 8 uploaded`],
          ['PPT image uploads', `${imgs} of 15 uploaded`],
          ['Photo & signature', `${photos} of 2 uploaded`],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-line bg-surface/50 px-3 py-2.5">
            <div className="text-[11px] text-muted">{l}</div>
            <div className="mt-0.5 text-[13px] font-semibold">{v}</div>
          </div>
        ))}
      </div>

      <Section n={1} title="Site Details" f={f} onEdit={onEdit && (() => onEdit(1))}>
        <Item label="Proposed Site Location Name"><V v={f.siteName} /></Item>
        <Item label="Site Complete Address"><V v={f.siteAddress} /></Item>
        <Item label="State / City / District"><V v={join(f.state, f.city, f.district)} /></Item>
        <Item label="Circle / Zone · Pin Code"><V v={f.circle || f.pinCode ? `${f.circle || 'Not entered'} · ${f.pinCode || 'Not entered'}` : ''} /></Item>
        <Item label="Landmark"><V v={f.landmark} /></Item>
        <Item label="RBI Category"><V v={f.rbiCategory} empty="Not selected" /></Item>
        <Item label="Site Latitude / Longitude"><V v={join(f.latitude, f.longitude)} /></Item>
        <Item label="Site Type / TIS Type"><V v={join(f.siteType, f.tisType)} /></Item>
        <Item label="Project Type / Business Type"><V v={join(f.projectType, f.businessType)} /></Item>
        <Item label="Strategy / Plan / Model Name"><V v={f.plan} empty="Not selected" /></Item>
        <Item label="Existing ATM ID"><V v={f.existingAtmId || 'Not applicable'} /></Item>
        <Item label="Applicant photo"><V v={f.applicantPhoto?.name} empty="Not uploaded" /></Item>
      </Section>

      <Section n={2} title="Franchise & Bank" f={f} onEdit={onEdit && (() => onEdit(2))}>
        <Item label="Franchise Name"><V v={f.franchiseName} /></Item>
        <Item label="Franchise Name on Cheque"><V v={f.nameOnCheque} /></Item>
        <Item label="Contact Number / Alternate Number"><V v={join(f.contactNumber, f.alternateNumber)} /></Item>
        <Item label="Email ID"><V v={f.email} /></Item>
        <Item label="Correspondence Address / Landmark"><V v={join(f.corrAddress, f.corrLandmark)} /></Item>
        <Item label="District / State / Pin"><V v={join(f.corrDistrict, f.corrState, f.corrPin)} /></Item>
        <Item label="Bank Name / Branch Name"><V v={join(f.bankName, f.branchName)} /></Item>
        <Item label="Account Number / IFSC Code">
          <V v={f.accountNumber || f.ifsc ? `${f.accountNumber ? '••••' + f.accountNumber.slice(-4) : 'Not entered'} / ${f.ifsc || 'Not entered'}` : ''} />
        </Item>
      </Section>

      <Section n={3} title="Shop Dimensions" f={f} onEdit={onEdit && (() => onEdit(3))}>
        <Item label="Shop Owner Name / Number"><V v={join(f.shopOwnerName, f.shopOwnerNumber)} /></Item>
        <Item label="Total / Offered / Carpet Area (Sq.ft.)"><V v={join(f.totalArea, f.offeredArea, f.carpetArea)} /></Item>
        <Item label="Depth / Width / Height"><V v={join(f.depth, f.width, f.height)} /></Item>
        <Item label="Total Frontage / Frontage Offered"><V v={join(f.totalFrontage, f.frontageOffered)} /></Item>
        <Item label="'L' Shape Signage / V-SAT / AC ODU Space"><V v={join(f.lSignage, f.vsat, f.acOdu)} /></Item>
        <Item label="Power Availability / Meter type"><V v={join(f.powerAvailable, f.meterType)} /></Item>
        <Item label="Meter / rating detail"><V v={f.meterDetail} /></Item>
        <Item label="Power Available (in Hours)"><V v={f.powerHours} /></Item>
        <Item label="Signage Dimension — Width / Height"><V v={join(f.signageWidth, f.signageHeight)} /></Item>
        <Item label="Shop Status / Shutter Available"><V v={join(f.shopStatus, f.shutter)} /></Item>
      </Section>

      <Section n={4} title="CRA & ATMs" f={f} onEdit={onEdit && (() => onEdit(4))}>
        <Item label="CRA Coverage / Agency Name"><V v={join(f.craCoverage, f.craAgency)} /></Item>
        <Item label="WLA ATM account proposed branch name"><V v={f.proposedBranch} /></Item>
        <Item label="Branch Manager Name / Number"><V v={join(f.branchManager, f.branchManagerNumber)} /></Item>
        <Item label="Branch SOL ID / IFSC Code · Distance (KM)"><V v={join(f.solIfsc, f.branchDistance)} /></Item>
        <Item label="Nearest ATM Details">
          <V v={atmFilled(f.nearestAtms) ? `${atmFilled(f.nearestAtms)} of 5 rows entered` : ''} empty="Rows A–E: all cells awaiting entry" />
        </Item>
        <Item label="Nearby Hitachi ATM Details">
          <V v={atmFilled(f.hitachiAtms) ? `${atmFilled(f.hitachiAtms)} of 2 rows entered` : ''} empty="Rows A–B: all cells awaiting entry" />
        </Item>
        <Item label="Franchise Signature"><V v={f.signature?.name} empty="Not uploaded" /></Item>
      </Section>

      <Section
        n={5}
        title="Documents"
        f={f}
        onEdit={onEdit && (() => onEdit(5))}
        note={f.documents.some((d) => !d.status) ? 'Some document Yes / No statuses are unselected. All documents should be a self-attested photocopy.' : undefined}
      >
        <Item label="PPT / PAN Card"><V v={docPair(0, 1)} /></Item>
        <Item label="Aadhar Card / Pass-book or cancel Cheque"><V v={docPair(2, 3)} /></Item>
        <Item label="Six months Bank Statement / GST Certificate"><V v={docPair(4, 5)} /></Item>
        <Item label="Other Business proof / Rent Agreement Copy"><V v={docPair(6, 7)} /></Item>
      </Section>

      <Section n={6} title="Images & Office" f={f} onEdit={onEdit && (() => onEdit(6))} note="Please make sure that the images will be put into PPT according to the above serial number.">
        <Item label="Images for making the PPT">
          <V v={imgs ? `${imgs} of 15 numbered image slots uploaded` : ''} empty="All fifteen numbered image slots are awaiting upload" />
        </Item>
        <Item label="PPT image sequence">Shop, road and terrace views, V-SAT space, Google map and satellite view</Item>
        <Item label="Site Number / Site Sourced By / Site Sourcing Code"><V v={join(f.siteNumber, f.sourcedBy, f.sourcingCode)} /></Item>
      </Section>
    </div>
  )
}
