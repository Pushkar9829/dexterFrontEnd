import type { ReactNode } from 'react'
import {
  Building2,
  ClipboardCheck,
  Edit3,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  Info,
  MapPin,
  PenTool,
  ShieldCheck,
  Store,
} from 'lucide-react'
import type { ApplicationForm, AppStatus } from '@/data/applications'
import { cn } from '@/lib/cn'
import { stepStatus } from './validate'

const toneCls = {
  green: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  amber: 'text-amber-700 bg-amber-50 border-amber-200',
  red: 'text-red-700 bg-red-50 border-red-200',
}

function V({ v, empty = 'Not entered' }: { v: ReactNode; empty?: string }) {
  const blank = v == null || v === '' || v === false
  if (blank) {
    return <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{empty}</span>
  }
  return <span className="font-semibold text-slate-900">{v}</span>
}

const join = (...xs: string[]) => (xs.some(Boolean) ? xs.map((x) => x || '—').join(' / ') : '')

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-[13px] leading-snug">{children}</div>
    </div>
  )
}

function Section({
  n,
  title,
  icon,
  f,
  onEdit,
  children,
  note,
}: {
  n: number
  title: string
  icon: ReactNode
  f: ApplicationForm
  onEdit?: () => void
  children: ReactNode
  note?: ReactNode
}) {
  const st = stepStatus(n, f)
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[#f8fbff] px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb] font-bold text-[13px]">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Step {String(n).padStart(2, '0')}</span>
              <span className={cn('rounded-full border px-2 py-0.2 text-[10.5px] font-bold', toneCls[st.tone])}>
                {st.label}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
          </div>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#2563eb] shadow-2xs hover:bg-blue-50 transition-colors"
          >
            <Edit3 size={13} />
            Edit section
          </button>
        )}
      </header>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      {note && (
        <div className="mx-5 mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
          <Info size={15} className="mt-0.5 shrink-0 text-amber-700" />
          <div>{note}</div>
        </div>
      )}
    </section>
  )
}

export function Review({
  form: f,
  status,
  onEdit,
}: {
  form: ApplicationForm
  status: AppStatus
  onEdit?: (step: number) => void
}) {
  const docs = f.documents.filter((d) => d.file).length
  const imgs = f.images.filter(Boolean).length
  const photos = (f.applicantPhoto ? 1 : 0) + (f.signature ? 1 : 0)
  const atmFilled = (rows: ApplicationForm['nearestAtms']) => rows.filter((r) => r.atmId).length
  const docPair = (a: number, b: number) =>
    `${f.documents[a].file ? '✓ Uploaded' : 'Not uploaded'} / ${f.documents[b].file ? '✓ Uploaded' : 'Not uploaded'}`
  const isDraft = status === 'Draft'

  return (
    <div className="space-y-6">
      {/* Step Header Banner matching exact reference design */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-[#f8fbff] p-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#2563eb] text-white font-bold text-base shadow-xs">
            07
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0f172a] tracking-tight">Review &amp; Submit</h2>
            <p className="text-xs text-slate-500 mt-0.5">Please review all entered application details before final submission.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-blue-200/70 bg-[#edf4ff] px-4 py-2.5 max-w-sm">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#2563eb] shadow-2xs">
            <ClipboardCheck size={18} />
          </div>
          <p className="text-xs font-medium text-[#1e40af] leading-tight">
            Ensure all mandatory details and documents are verified before final submission.
          </p>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Application status', value: isDraft ? 'Draft · Ready to Submit' : status, icon: FileText, color: 'text-[#2563eb]' },
          { label: 'Document uploads', value: `${docs} of 8 uploaded`, icon: FileCheck2, color: docs === 8 ? 'text-emerald-700' : 'text-amber-700' },
          { label: 'PPT images', value: `${imgs} of 15 uploaded`, icon: ImageIcon, color: imgs === 15 ? 'text-emerald-700' : 'text-amber-700' },
          { label: 'Photo & signature', value: `${photos} of 2 attached`, icon: PenTool, color: photos === 2 ? 'text-emerald-700' : 'text-amber-700' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>{item.label}</span>
                <Icon size={16} className={item.color} />
              </div>
              <div className="mt-1.5 text-lg font-bold text-slate-900">{item.value}</div>
            </div>
          )
        })}
      </div>

      {/* Section 1: Site Details */}
      <Section n={1} title="Site Details" icon={<MapPin size={17} />} f={f} onEdit={onEdit && (() => onEdit(1))}>
        <Item label="Proposed Site Location Name"><V v={f.siteName} /></Item>
        <Item label="Site Complete Address"><V v={f.siteAddress} /></Item>
        <Item label="State / City / District"><V v={join(f.state, f.city, f.district)} /></Item>
        <Item label="Circle / Zone · Pin Code"><V v={f.circle || f.pinCode ? `${f.circle || '—'} · ${f.pinCode || '—'}` : ''} /></Item>
        <Item label="Landmark"><V v={f.landmark} /></Item>
        <Item label="RBI Category"><V v={f.rbiCategory} empty="Not selected" /></Item>
        <Item label="Site Latitude / Longitude"><V v={join(f.latitude, f.longitude)} /></Item>
        <Item label="Site Type / TIS Type"><V v={join(f.siteType, f.tisType)} /></Item>
        <Item label="Project Type / Business Type"><V v={join(f.projectType, f.businessType)} /></Item>
        <Item label="Strategy / Plan / Model Name"><V v={f.plan} empty="Not selected" /></Item>
        <Item label="Existing ATM ID"><V v={f.existingAtmId || 'Not applicable'} /></Item>
        <Item label="Applicant Photo"><V v={f.applicantPhoto?.name} empty="Not uploaded" /></Item>
      </Section>

      {/* Section 2: Franchise & Bank */}
      <Section n={2} title="Franchise & Bank" icon={<Building2 size={17} />} f={f} onEdit={onEdit && (() => onEdit(2))}>
        <Item label="Franchise Name"><V v={f.franchiseName} /></Item>
        <Item label="Franchise Name on Cheque"><V v={f.nameOnCheque} /></Item>
        <Item label="Contact Number / Alternate"><V v={join(f.contactNumber, f.alternateNumber)} /></Item>
        <Item label="Email ID"><V v={f.email} /></Item>
        <Item label="Correspondence Address / Landmark"><V v={join(f.corrAddress, f.corrLandmark)} /></Item>
        <Item label="District / State / Pin"><V v={join(f.corrDistrict, f.corrState, f.corrPin)} /></Item>
        <Item label="Bank Name / Branch Name"><V v={join(f.bankName, f.branchName)} /></Item>
        <Item label="Account Number / IFSC Code">
          <V v={f.accountNumber || f.ifsc ? `${f.accountNumber ? '••••' + f.accountNumber.slice(-4) : '—'} / ${f.ifsc || '—'}` : ''} />
        </Item>
      </Section>

      {/* Section 3: Shop Dimensions */}
      <Section n={3} title="Shop Dimensions" icon={<Store size={17} />} f={f} onEdit={onEdit && (() => onEdit(3))}>
        <Item label="Shop Owner Name / Number"><V v={join(f.shopOwnerName, f.shopOwnerNumber)} /></Item>
        <Item label="Total / Offered / Carpet Area (Sq.ft.)"><V v={join(f.totalArea, f.offeredArea, f.carpetArea)} /></Item>
        <Item label="Depth / Width / Height"><V v={join(f.depth, f.width, f.height)} /></Item>
        <Item label="Total Frontage / Frontage Offered"><V v={join(f.totalFrontage, f.frontageOffered)} /></Item>
        <Item label="'L' Signage / V-SAT / AC ODU Space"><V v={join(f.lSignage, f.vsat, f.acOdu)} /></Item>
        <Item label="Power Availability / Meter Type"><V v={join(f.powerAvailable, f.meterType)} /></Item>
        <Item label="Meter / Sanctioned Load Detail"><V v={f.meterDetail} /></Item>
        <Item label="Power Available (Hours / Day)"><V v={f.powerHours ? `${f.powerHours} hours` : ''} /></Item>
        <Item label="Signage Width / Height"><V v={join(f.signageWidth, f.signageHeight)} /></Item>
        <Item label="Shop Status / Shutter Available"><V v={join(f.shopStatus, f.shutter)} /></Item>
      </Section>

      {/* Section 4: CRA & ATMs */}
      <Section n={4} title="CRA & ATMs" icon={<ShieldCheck size={17} />} f={f} onEdit={onEdit && (() => onEdit(4))}>
        <Item label="CRA Coverage / Agency Name">
          <V v={f.craCoverage || f.craAgency ? `${f.craCoverage || '—'} / ${f.craAgency || '—'}` : ''} empty="Not selected / Not entered" />
        </Item>
        <Item label="WLA ATM Proposed Branch"><V v={f.proposedBranch} /></Item>
        <Item label="Branch Manager Name / Number"><V v={join(f.branchManager, f.branchManagerNumber)} empty="Not entered" /></Item>
        <Item label="Branch SOL ID / IFSC · Distance (KM)">
          <V v={f.solIfsc || f.branchDistance ? `${f.solIfsc || '—'} · ${f.branchDistance ? f.branchDistance + ' km' : '—'}` : ''} empty="Not entered" />
        </Item>
        <Item label="Nearest ATM Benchmark Rows">
          <V v={atmFilled(f.nearestAtms) ? `${atmFilled(f.nearestAtms)} of 5 rows entered` : ''} empty="Rows A–E: unentered" />
        </Item>
        <Item label="Nearby Hitachi ATM Rows">
          <V v={atmFilled(f.hitachiAtms) ? `${atmFilled(f.hitachiAtms)} of 2 rows entered` : ''} empty="Rows A–B: unentered" />
        </Item>
        <Item label="Franchise Signature Proof"><V v={f.signature?.name} empty="Not uploaded" /></Item>
      </Section>

      {/* Section 5: Documents */}
      <Section
        n={5}
        title="Documents"
        icon={<FileCheck2 size={17} />}
        f={f}
        onEdit={onEdit && (() => onEdit(5))}
        note={
          f.documents.every((d) => !d.status)
            ? 'All eight document Yes / No statuses are unselected. All documents should be a self-attested photocopy.'
            : f.documents.some((d) => !d.status)
              ? 'Some document Yes / No statuses are unselected. All documents should be a self-attested photocopy.'
              : undefined
        }
      >
        <Item label="PPT / PAN Card"><V v={docPair(0, 1)} /></Item>
        <Item label="Aadhar Card / Pass-book or cancel Cheque"><V v={docPair(2, 3)} /></Item>
        <Item label="Six months Bank Statement / GST Certificate"><V v={docPair(4, 5)} /></Item>
        <Item label="Other Business proof / Rent Agreement Copy"><V v={docPair(6, 7)} /></Item>
      </Section>

      {/* Section 6: Images & Office */}
      <Section
        n={6}
        title="Images & Office Use"
        icon={<ImageIcon size={17} />}
        f={f}
        onEdit={onEdit && (() => onEdit(6))}
        note="Please ensure that photographs follow the 1 to 15 sequence when finalizing PPT site proposal."
      >
        <Item label="Site Survey Photographs for PPT">
          <V v={imgs ? `${imgs} of 15 photo slots uploaded` : ''} empty="All 15 photo slots awaiting upload" />
        </Item>
        <Item label="PPT Sequence Coverage">Shop, road and terrace views, V-SAT space, Google map and satellite view</Item>
        <Item label="Site Sourcing Verification Details">
          <V v={f.siteNumber || f.sourcedBy || f.sourcingCode ? 'Entered' : ''} empty="Office use only · Not entered" />
        </Item>
        <Item label="Site Number / Sourced By / Sourcing Code">
          <V v={join(f.siteNumber, f.sourcedBy, f.sourcingCode)} empty="—" />
        </Item>
      </Section>
    </div>
  )
}
