import { useRef, type ChangeEvent, type ReactNode } from 'react'
import {
  AlertCircle,
  Briefcase,
  Building,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  CreditCard,
  FileCheck2,
  FileSignature,
  FileText,
  Hash,
  Landmark,
  LocateFixed,
  Lock,
  Mail,
  Map,
  MapPin,
  Network,
  Phone,
  Receipt,
  Settings,
  Settings2,
  Shield,
  ShieldCheck,
  Store,
  UploadCloud,
  User,
  Users,
  X,
} from 'lucide-react'
import {
  APPLICANT_TYPES_OPTIONS,
  APPLICATION_SOURCES,
  BANK_ACCOUNT_TYPES,
  BUSINESS_NATURES,
  CHEQUE_FACILITY_OPTIONS,
  FRANCHISE_CATEGORIES,
  FRANCHISE_LOGIN_STATUSES,
  GENDER_OPTIONS,
  INCOME_RANGES,
  INTERNAL_DECISION_OPTIONS,
  INVESTMENT_RANGES,
  KYC_VERIFICATION_STATUSES,
  MARITAL_STATUS_OPTIONS,
  OFFICE_OWNERSHIPS,
  PAYMENT_MODES,
  PAYMENT_PURPOSES,
  QUALIFICATIONS,
  STATES,
  SUBMISSION_STATUS_OPTIONS,
  TERRITORY_EXCLUSIVITIES,
  TERRITORY_MAPPING_STATUSES,
  TERRITORY_TYPES,
  type ApplicationForm,
  type FileRef,
  type YesNo,
} from '@/data/applications'
import { fmtSize } from '@/components/ui/Form'
import { cn } from '@/lib/cn'
import type { Errors } from '../validate'

export type MasterStepProps = {
  form: ApplicationForm
  set: (patch: Partial<ApplicationForm>) => void
  errors?: Errors
  readOnly?: boolean
  onEditSection?: (key: string) => void
}

// ── Shared UI Primitives Matching Reference Design ─────────────────────────

export function StepHeaderBanner({
  num,
  title,
  sub,
  infoText,
  icon,
}: {
  num: string
  title: string
  sub: string
  infoText?: string
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-[#f8fbff] p-4 mb-6 shadow-2xs">
      <div className="flex items-center gap-3.5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#2563eb] text-white font-bold text-base shadow-xs">
          {num}
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#0f172a] tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
        </div>
      </div>
      {infoText && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200/70 bg-[#edf4ff] px-4 py-2.5 max-w-sm">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#2563eb] shadow-2xs">
            {icon ?? <MapPin size={18} />}
          </div>
          <p className="text-xs font-medium text-[#1e40af] leading-tight">{infoText}</p>
        </div>
      )}
    </div>
  )
}

export function IconField({
  label,
  required,
  num,
  icon: Icon,
  error,
  hint,
  className,
  children,
}: {
  label: string
  required?: boolean
  num?: number | string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="flex items-center gap-1 text-xs font-bold text-[#0f172a]">
        {num != null && (
          <span className="mr-1 inline-flex h-4 min-w-4 items-center justify-center rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-600 border border-slate-200">
            {num}
          </span>
        )}
        <span>{label}</span>
        {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </label>
      <div
        className={cn(
          'relative flex h-11 w-full items-center rounded-xl border bg-white transition-all shadow-2xs',
          error
            ? 'border-red-500 ring-2 ring-red-100'
            : 'border-slate-200 hover:border-slate-300 focus-within:border-[#2563eb] focus-within:ring-2 focus-within:ring-blue-100',
        )}
      >
        {Icon && (
          <div className="grid h-full w-10 shrink-0 place-items-center text-[#2563eb]">
            <Icon size={17} />
          </div>
        )}
        <div className="flex-1 h-full min-w-0">{children}</div>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
          <AlertCircle size={12} className="shrink-0" /> {error}
        </p>
      )}
      {!error && hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  )
}

export function FormInput({
  label,
  required,
  num,
  icon,
  error,
  hint,
  className,
  value,
  onChange,
  disabled,
  placeholder,
  type = 'text',
  inputMode,
  maxLength,
}: {
  label: string
  required?: boolean
  num?: number | string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  error?: string
  hint?: string
  className?: string
  value?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  placeholder?: string
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  maxLength?: number
}) {
  return (
    <IconField label={label} required={required} num={num} icon={icon} error={error} hint={hint} className={className}>
      <input
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className="h-full w-full bg-transparent px-3 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed font-medium"
      />
    </IconField>
  )
}

export function FormSelect({
  label,
  required,
  num,
  icon,
  error,
  hint,
  className,
  options,
  value,
  onChange,
  disabled,
  placeholder = 'Select',
}: {
  label: string
  required?: boolean
  num?: number | string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  error?: string
  hint?: string
  className?: string
  options: readonly string[] | string[]
  value?: string
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <IconField label={label} required={required} num={num} icon={icon} error={error} hint={hint} className={className}>
      <div className="relative h-full w-full">
        <select
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'h-full w-full appearance-none bg-transparent px-3 pr-9 text-[13px] text-slate-900 outline-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed font-medium',
            !value && 'text-slate-400',
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute right-3 top-3.5 text-slate-400" />
      </div>
    </IconField>
  )
}

export function SegmentedRadio<T extends string>({
  label,
  num,
  options,
  value,
  onChange,
  disabled,
  className,
  required,
}: {
  label: string
  num?: number | string
  options: T[]
  value: T | ''
  onChange: (v: T) => void
  disabled?: boolean
  className?: string
  required?: boolean
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="flex items-center gap-1 text-xs font-bold text-[#0f172a]">
        {num != null && (
          <span className="mr-1 inline-flex h-4 min-w-4 items-center justify-center rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-600 border border-slate-200">
            {num}
          </span>
        )}
        <span>{label}</span>
        {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </label>
      <div className="flex h-11 gap-2">
        {options.map((o) => {
          const active = value === o
          return (
            <button
              key={o}
              type="button"
              disabled={disabled}
              onClick={() => onChange(o)}
              className={cn(
                'flex h-full flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-[13px] font-medium transition-all shadow-2xs',
                active
                  ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb] font-semibold ring-1 ring-[#2563eb]/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <span
                className={cn(
                  'grid h-4 w-4 place-items-center rounded-full border transition-colors',
                  active ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-slate-300 bg-white',
                )}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span>{o}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ModernInlineDrop({
  value,
  onChange,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxMb = 5,
  disabled,
  hint,
  label,
  required,
  num,
  error,
}: {
  value: FileRef
  onChange: (f: FileRef) => void
  accept?: string
  maxMb?: number
  disabled?: boolean
  hint?: string
  label: string
  required?: boolean
  num?: number | string
  error?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const take = (f?: File) => {
    if (!f) return
    if (f.size > maxMb * 1024 * 1024) {
      alert(`File size exceeds maximum limit of ${maxMb} MB.`)
      return
    }
    onChange({ name: f.name, size: f.size })
  }

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-xs font-bold text-[#0f172a]">
        {num != null && (
          <span className="mr-1 inline-flex h-4 min-w-4 items-center justify-center rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-600 border border-slate-200">
            {num}
          </span>
        )}
        <span>{label}</span>
        {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </label>

      {value ? (
        <div className="flex h-11 items-center justify-between gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 px-3 text-[12px] shadow-2xs">
          <div className="flex min-w-0 items-center gap-2">
            <FileCheck2 size={16} className="text-emerald-700 shrink-0" />
            <span className="truncate font-medium text-slate-900">{value.name}</span>
            <span className="shrink-0 text-[11px] text-emerald-800">({fmtSize(value.size)})</span>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-emerald-100 hover:text-red-600 transition-colors"
              title="Remove file"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && ref.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (!disabled) take(e.dataTransfer.files[0])
          }}
          className={cn(
            'group flex h-11 cursor-pointer items-center justify-between gap-2 rounded-xl border border-dashed bg-slate-50/50 px-3.5 text-[12.5px] text-slate-600 transition-all hover:border-[#2563eb] hover:bg-[#eff6ff] hover:text-[#2563eb] shadow-2xs',
            error ? 'border-red-400 bg-red-50/20' : 'border-slate-300',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <div className="flex items-center gap-2">
            <UploadCloud size={17} className="text-[#2563eb] group-hover:scale-110 transition-transform" />
            <span className="font-medium">Upload file</span>
          </div>
          <span className="text-[11px] text-slate-400">{hint ?? `Max ${maxMb}MB · PDF/JPG/PNG`}</span>
          <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => take(e.target.files?.[0])} />
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
          <AlertCircle size={12} className="shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

export function ModernPhotoDrop({
  value,
  onChange,
  disabled,
  error,
  label = 'Applicant Color Photograph',
  required = true,
  num,
}: {
  value: FileRef
  onChange: (f: FileRef) => void
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  num?: number | string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const take = (f?: File) => {
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      alert('Photo size exceeds 5 MB.')
      return
    }
    onChange({ name: f.name, size: f.size })
  }

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-xs font-bold text-[#0f172a]">
        {num != null && (
          <span className="mr-1 inline-flex h-4 min-w-4 items-center justify-center rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-600 border border-slate-200">
            {num}
          </span>
        )}
        <span>{label}</span>
        {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </label>
      <div
        onClick={() => !disabled && ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          if (!disabled) take(e.dataTransfer.files[0])
        }}
        className={cn(
          'group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all shadow-2xs',
          value
            ? 'border-emerald-300 bg-emerald-50/40'
            : 'border-slate-300 bg-slate-50/60 hover:border-[#2563eb] hover:bg-[#eff6ff]/50 cursor-pointer',
          error && 'border-red-400 bg-red-50/20',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <input ref={ref} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => take(e.target.files?.[0])} />

        {value ? (
          <div className="flex flex-col items-center gap-2">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <Camera size={24} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-900">{value.name}</p>
              <p className="text-[11px] text-slate-500">{fmtSize(value.size)} · Applicant photo uploaded</p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(null)
                }}
                className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-[12px] font-medium text-red-600 hover:bg-red-50"
              >
                <X size={13} /> Change photo
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[#edf4ff] text-[#2563eb] group-hover:scale-105 transition-transform">
              <Camera size={22} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-900">Upload Applicant Color Photograph *</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Click to upload or drag & drop (JPG or PNG up to 5 MB)</p>
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
          <AlertCircle size={12} className="shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

function bind(p: MasterStepProps, key: keyof ApplicationForm) {
  return {
    value: (p.form[key] as string) ?? '',
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      p.set({ [key]: e.target.value } as Partial<ApplicationForm>),
    error: p.errors?.[key],
    disabled: p.readOnly,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 12 STEP COMPONENTS (SECTIONS A TO L)
// ═════════════════════════════════════════════════════════════════════════════

// ── STEP 1: Section A - Franchise & Territory ──────────────────────────────
export function MasterFranchiseTerritory(p: MasterStepProps) {
  const isSuper = p.form.franchiseCategory === 'Super Master Franchise'
  const stateCode = p.form.state ? (STATES.includes(p.form.state) ? p.form.state.slice(0, 2).toUpperCase() : 'IN') : 'IN'
  const displayMfId = p.form.masterFranchiseId || (isSuper ? `SMF-${stateCode}-0042` : `MF-${stateCode}-0142`)

  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="01"
        title="Franchise & Territory"
        sub="Master & Super Master franchise classification, assigned operational zone, and sourcing channels."
        infoText="Ensure accurate territory and category details for smooth territorial mapping."
        icon={<Building2 size={18} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* S. No. 9: Master Franchise ID (Auto-generated Read-only) */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1 text-xs font-bold text-[#0f172a]">
            <span className="mr-1 inline-flex h-4 min-w-4 items-center justify-center rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-600 border border-slate-200">
              9
            </span>
            <span>{isSuper ? 'Super Master Franchise ID' : 'Master Franchise ID'}</span>
          </label>
          <div className="flex h-11 items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 px-3.5 text-xs font-mono font-bold text-blue-800 shadow-2xs">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-blue-600" />
              <span>{displayMfId}</span>
            </div>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              Auto-generated (Dexter Registry)
            </span>
          </div>
        </div>

        {/* Partner ID */}
        <FormInput
          label="Partner ID"
          icon={Hash}
          placeholder="e.g. PTN-2026-0891"
          hint="External legacy or corporate sponsor ID (Optional)"
          {...bind(p, 'partnerId')}
        />

        {/* S. No. 10: Franchise Name */}
        <FormInput
          num={10}
          label="Franchise Name"
          required
          icon={Building2}
          placeholder="e.g. Shree Sai Financial Services"
          hint="Primary operating business / network display brand"
          {...bind(p, 'franchiseName')}
        />

        {/* S. No. 11: Franchise Category */}
        <FormSelect
          num={11}
          label="Franchise Category"
          required
          icon={Shield}
          options={FRANCHISE_CATEGORIES}
          placeholder="Select Franchise Tier"
          {...bind(p, 'franchiseCategory')}
        />

        {/* S. No. 12: Territory Type */}
        <FormSelect
          num={12}
          label="Territory Type"
          required
          icon={MapPin}
          options={TERRITORY_TYPES}
          placeholder="Select territory type"
          hint="Scope of network jurisdiction"
          {...bind(p, 'territoryType')}
        />

        {/* S. No. 13: State */}
        <FormSelect
          num={13}
          label="State"
          required
          icon={Map}
          options={STATES}
          placeholder="Select State"
          {...bind(p, 'state')}
        />

        {/* S. No. 14: Region / Zone */}
        <FormInput
          num={14}
          label="Region / Zone"
          icon={LocateFixed}
          placeholder="e.g. Western Maharashtra / North Zone"
          {...bind(p, 'regionZone')}
        />

        {/* S. No. 15: District */}
        <FormInput
          num={15}
          label="District"
          required
          icon={Building}
          placeholder="e.g. Pune / Nagpur / Surat"
          {...bind(p, 'district')}
        />

        {/* S. No. 16: Tehsil / Block */}
        <FormInput
          num={16}
          label="Tehsil / Block"
          icon={MapPin}
          placeholder="e.g. Haveli / Baramati"
          {...bind(p, 'tehsilBlock')}
        />

        {/* S. No. 17: Proposed Operational Territory */}
        <FormInput
          num={17}
          label="Proposed Operational Territory"
          required
          icon={Network}
          placeholder="e.g. Pune District & Pimpri-Chinchwad Metro Area"
          className="sm:col-span-2"
          hint="Exact commercial territories covered under this franchise agreement"
          {...bind(p, 'proposedOperationalTerritory')}
        />

        {/* S. No. 18: Territory Exclusivity */}
        <FormSelect
          num={18}
          label="Territory Exclusivity"
          required
          icon={ShieldCheck}
          options={TERRITORY_EXCLUSIVITIES}
          placeholder="Select exclusivity model"
          {...bind(p, 'territoryExclusivity')}
        />

        {/* S. No. 19: Application Source */}
        <FormSelect
          num={19}
          label="Application Source"
          required
          icon={Briefcase}
          options={APPLICATION_SOURCES}
          placeholder="Select source channel"
          {...bind(p, 'applicationSource')}
        />

        {/* S. No. 20: Referred By */}
        <FormInput
          num={20}
          label="Referred By"
          icon={User}
          placeholder="e.g. Rahul Sharma (EMP-8821) / Corporate Partner"
          hint="Employee name & ID or partner organization"
          {...bind(p, 'referredBy')}
        />

        {/* S. No. 21: Existing Dexter Franchise / Partner ID */}
        <FormInput
          num={21}
          label="Existing Dexter Franchise / Partner ID"
          icon={Hash}
          placeholder="e.g. DXT-MH-0091"
          hint="Provide if previously affiliated with Dexter network"
          {...bind(p, 'existingDexterFranchiseId')}
        />
      </div>
    </div>
  )
}

// ── STEP 2: Section B - Business & Legal Entity ─────────────────────────────
export function MasterBusinessEntity(p: MasterStepProps) {
  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="02"
        title="Business & Legal Entity"
        sub="Entity constitution, registration numbers, tax compliance, and corporate credentials."
        infoText="Provide authentic entity details matching your MCA and GST registration."
        icon={<FileText size={18} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* S. No. 22: Applicant Type */}
        <FormSelect
          num={22}
          label="Applicant Type"
          required
          icon={Briefcase}
          options={APPLICANT_TYPES_OPTIONS}
          placeholder="Select Applicant Entity Type"
          {...bind(p, 'applicantType')}
        />

        {/* S. No. 23: Legal Business Name */}
        <FormInput
          num={23}
          label="Legal Business Name"
          required
          icon={Building}
          placeholder="e.g. Shree Sai Finserve Pvt. Ltd."
          hint="As appearing in Certificate of Incorporation / Partnership Deed"
          {...bind(p, 'legalBusinessName')}
        />

        {/* S. No. 24: Trade Name / DBA */}
        <FormInput
          num={24}
          label="Trade Name / DBA"
          icon={Store}
          placeholder="e.g. Sai Money Points"
          hint="Trade or commercial brand name if different from legal name"
          {...bind(p, 'tradeNameDba')}
        />

        {/* S. No. 25: Business Type / Nature of Business */}
        <FormSelect
          num={25}
          label="Business Type / Nature of Business"
          required
          icon={Briefcase}
          options={BUSINESS_NATURES}
          placeholder="Select Nature of Business"
          {...bind(p, 'businessTypeNature')}
        />

        {/* S. No. 26: Date of Incorporation / Business Commencement */}
        <FormInput
          num={26}
          label="Date of Incorporation / Commencement"
          type="date"
          icon={Clock}
          {...bind(p, 'dateOfIncorporation')}
        />

        {/* S. No. 27: PAN */}
        <FormInput
          num={27}
          label="PAN (Permanent Account Number)"
          required
          icon={CreditCard}
          placeholder="e.g. ABCDE1234F"
          maxLength={10}
          hint="10-digit PAN of entity or applicant"
          {...bind(p, 'pan')}
          onChange={(e) => p.set({ pan: e.target.value.toUpperCase() })}
        />

        {/* S. No. 28: GSTIN */}
        <FormInput
          num={28}
          label="GSTIN"
          icon={Receipt}
          placeholder="e.g. 27ABCDE1234F1Z5"
          maxLength={15}
          hint="15-character Goods and Services Tax Identification Number"
          {...bind(p, 'gstin')}
          onChange={(e) => p.set({ gstin: e.target.value.toUpperCase() })}
        />

        {/* S. No. 29: CIN / LLPIN / Registration Number */}
        <FormInput
          num={29}
          label="CIN / LLPIN / Registration Number"
          icon={Hash}
          placeholder="e.g. U72900MH2021PTC123456"
          hint="Corporate Identity Number or Registrar of Firms No."
          {...bind(p, 'cinLlpinRegNo')}
        />

        {/* S. No. 30: Registered Office Address */}
        <FormInput
          num={30}
          label="Registered Office Address"
          required
          icon={MapPin}
          placeholder="e.g. 402, Trade Tower, Senapati Bapat Marg, Pune, MH 411016"
          className="sm:col-span-2"
          hint="Official statutory address registered with MCA/Registrar"
          {...bind(p, 'registeredOfficeAddress')}
        />

        {/* S. No. 31: Business Website */}
        <FormInput
          num={31}
          label="Business Website"
          icon={Network}
          placeholder="e.g. https://www.shreesaifinserve.com"
          {...bind(p, 'businessWebsite')}
        />

        {/* S. No. 32: Business Email ID */}
        <FormInput
          num={32}
          label="Business Email ID"
          required
          type="email"
          icon={Mail}
          placeholder="e.g. contact@shreesaifinserve.com"
          {...bind(p, 'businessEmail')}
        />

        {/* S. No. 33: Business Mobile Number */}
        <FormInput
          num={33}
          label="Business Mobile Number"
          required
          icon={Phone}
          placeholder="e.g. 9823012345"
          maxLength={10}
          {...bind(p, 'businessMobile')}
        />

        {/* S. No. 34: Alternate Business Contact */}
        <FormInput
          num={34}
          label="Alternate Business Contact"
          icon={Phone}
          placeholder="e.g. 9823098765"
          maxLength={10}
          {...bind(p, 'alternateBusinessContact')}
        />
      </div>
    </div>
  )
}

// ── STEP 3: Section C - Applicant / Authorized Person ──────────────────────
export function MasterAuthorizedPerson(p: MasterStepProps) {
  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="03"
        title="Applicant / Authorized Person"
        sub="Signatory identification, personal background, qualifications, and industry experience."
        infoText="Authorized person must be a primary signatory or principal director."
        icon={<User size={18} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* S. No. 35: Applicant / Authorized Person Name */}
        <FormInput
          num={35}
          label="Applicant / Authorized Person Name"
          required
          icon={User}
          placeholder="e.g. Rajesh Narayan Patil"
          {...bind(p, 'applicantAuthorizedPersonName')}
        />

        {/* S. No. 36: Father's / Spouse's Name */}
        <FormInput
          num={36}
          label="Father's / Spouse's Name"
          icon={User}
          placeholder="e.g. Narayan Tukaram Patil"
          {...bind(p, 'fatherSpouseName')}
        />

        {/* S. No. 37: Designation */}
        <FormInput
          num={37}
          label="Designation"
          required
          icon={Briefcase}
          placeholder="e.g. Managing Director / Partner / Proprietor"
          {...bind(p, 'designation')}
        />

        {/* S. No. 38: Date of Birth */}
        <FormInput
          num={38}
          label="Date of Birth"
          type="date"
          required
          icon={Clock}
          {...bind(p, 'dob')}
        />

        {/* S. No. 39: Gender */}
        <FormSelect
          num={39}
          label="Gender"
          icon={User}
          options={GENDER_OPTIONS}
          placeholder="Select gender"
          {...bind(p, 'gender')}
        />

        {/* S. No. 40: Marital Status */}
        <FormSelect
          num={40}
          label="Marital Status"
          icon={User}
          options={MARITAL_STATUS_OPTIONS}
          placeholder="Select marital status"
          {...bind(p, 'maritalStatus')}
        />

        {/* S. No. 41: Personal Mobile Number */}
        <FormInput
          num={41}
          label="Personal Mobile Number"
          required
          icon={Phone}
          placeholder="e.g. 9823012345"
          maxLength={10}
          {...bind(p, 'personalMobile')}
        />

        {/* S. No. 42: Personal Email ID */}
        <FormInput
          num={42}
          label="Personal Email ID"
          type="email"
          icon={Mail}
          placeholder="e.g. rajesh.patil@example.com"
          {...bind(p, 'personalEmail')}
        />

        {/* S. No. 43: Educational Qualification */}
        <FormSelect
          num={43}
          label="Educational Qualification"
          icon={Briefcase}
          options={QUALIFICATIONS}
          placeholder="Select qualification"
          {...bind(p, 'educationalQualification')}
        />

        {/* S. No. 44: Computer Literacy */}
        <SegmentedRadio
          num={44}
          label="Computer Literacy"
          options={['Yes', 'No'] as Exclude<YesNo, ''>[]}
          value={p.form.computerLiteracy || 'Yes'}
          onChange={(v) => p.set({ computerLiteracy: v })}
          disabled={p.readOnly}
        />

        {/* S. No. 45: Computer Qualification / Skills */}
        <FormInput
          num={45}
          label="Computer Qualification / Skills"
          icon={Network}
          placeholder="e.g. MS Office, Tally Prime, Basic Networking, Banking Software"
          {...bind(p, 'computerQualificationSkills')}
        />

        {/* S. No. 46: Languages Known */}
        <FormInput
          num={46}
          label="Languages Known"
          icon={User}
          placeholder="e.g. English, Hindi, Marathi"
          hint="Comma-separated languages known for customer communication"
          value={p.form.languagesKnown?.join(', ') || ''}
          onChange={(e) =>
            p.set({ languagesKnown: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
          }
          disabled={p.readOnly}
        />

        {/* S. No. 47: Relevant Business / Financial Services Experience */}
        <SegmentedRadio
          num={47}
          label="Relevant Financial Services Experience"
          options={['Yes', 'No'] as Exclude<YesNo, ''>[]}
          value={p.form.financialServicesExp || 'Yes'}
          onChange={(v) => p.set({ financialServicesExp: v })}
          disabled={p.readOnly}
        />

        {/* S. No. 48: Years of Business Experience */}
        <FormInput
          num={48}
          label="Years of Business Experience"
          icon={Clock}
          placeholder="e.g. 8"
          inputMode="numeric"
          {...bind(p, 'yearsOfBusinessExperience')}
        />
      </div>
    </div>
  )
}

// ── STEP 4: Section D - Address & Location ─────────────────────────────────
export function MasterAddressLocation(p: MasterStepProps) {
  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="04"
        title="Address & Location"
        sub="Permanent & communication addresses, local jurisdiction, and residency stability."
        infoText="Accurate address data is cross-verified during site and police verification."
        icon={<MapPin size={18} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* S. No. 49: Registered / Permanent Address */}
        <FormInput
          num={49}
          label="Registered / Permanent Address"
          required
          icon={MapPin}
          placeholder="e.g. Flat 301, Greenfield Heights, Baner Road, Baner, Pune"
          className="sm:col-span-2"
          {...bind(p, 'registeredPermanentAddress')}
        />

        {/* S. No. 50: Communication Address Same as Permanent */}
        <SegmentedRadio
          num={50}
          label="Communication Address Same as Permanent?"
          options={['Yes', 'No'] as Exclude<YesNo, ''>[]}
          value={p.form.commSameAsPermanent || 'Yes'}
          onChange={(v) => {
            p.set({
              commSameAsPermanent: v,
              communicationAddress: v === 'Yes' ? p.form.registeredPermanentAddress : p.form.communicationAddress,
            })
          }}
          disabled={p.readOnly}
        />

        {/* S. No. 51: Communication Address */}
        <FormInput
          num={51}
          label="Communication Address"
          icon={MapPin}
          placeholder="e.g. Office Suite 204, Commercial Hub, Pune"
          {...bind(p, 'communicationAddress')}
          disabled={p.readOnly || p.form.commSameAsPermanent === 'Yes'}
        />

        {/* S. No. 52: Village / Town / Locality */}
        <FormInput
          num={52}
          label="Village / Town / Locality"
          icon={MapPin}
          placeholder="e.g. Baner / Shivajinagar"
          {...bind(p, 'villageTownLocality')}
        />

        {/* S. No. 53: Post Office */}
        <FormInput
          num={53}
          label="Post Office"
          icon={MapPin}
          placeholder="e.g. Baner S.O."
          {...bind(p, 'postOffice')}
        />

        {/* S. No. 54: Tehsil */}
        <FormInput
          num={54}
          label="Tehsil"
          icon={MapPin}
          placeholder="e.g. Haveli"
          {...bind(p, 'tehsil')}
        />

        {/* S. No. 55: Police Station */}
        <FormInput
          num={55}
          label="Police Station Jurisdiction"
          icon={Shield}
          placeholder="e.g. Chaturshringi Police Station"
          {...bind(p, 'policeStation')}
        />

        {/* S. No. 56: City / District */}
        <FormInput
          num={56}
          label="City / District"
          required
          icon={Building}
          placeholder="e.g. Pune"
          {...bind(p, 'cityDistrict')}
        />

        {/* S. No. 57: State */}
        <FormSelect
          num={57}
          label="State"
          required
          icon={Map}
          options={STATES}
          placeholder="Select State"
          {...bind(p, 'addressState')}
        />

        {/* S. No. 58: PIN Code */}
        <FormInput
          num={58}
          label="PIN Code"
          required
          icon={Hash}
          placeholder="e.g. 411045"
          maxLength={6}
          inputMode="numeric"
          {...bind(p, 'pinCode')}
        />

        {/* S. No. 59: Residence Telephone Number */}
        <FormInput
          num={59}
          label="Residence Telephone Number"
          icon={Phone}
          placeholder="e.g. 020-25678901"
          {...bind(p, 'residenceTelephone')}
        />

        {/* S. No. 60: Office Telephone Number */}
        <FormInput
          num={60}
          label="Office Telephone Number"
          icon={Phone}
          placeholder="e.g. 020-67890123"
          {...bind(p, 'officeTelephone')}
        />

        {/* S. No. 61: Years of Residence in Current Town */}
        <FormInput
          num={61}
          label="Years of Residence in Current Town"
          icon={Clock}
          placeholder="e.g. 15"
          inputMode="numeric"
          {...bind(p, 'yearsOfResidence')}
        />
      </div>
    </div>
  )
}

// ── STEP 5: Section E - Office Infrastructure & Investment ─────────────────
export function MasterOfficeInfrastructure(p: MasterStepProps) {
  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="05"
        title="Office Infrastructure & Investment"
        sub="Commercial premises, hardware assets, power backups, and capital solvency."
        infoText="Master franchises must have adequate space and power backup for regional operations."
        icon={<Briefcase size={18} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* S. No. 62: Office Ownership */}
        <FormSelect
          num={62}
          label="Office Ownership"
          required
          icon={Building}
          options={OFFICE_OWNERSHIPS}
          placeholder="Select ownership"
          {...bind(p, 'officeOwnership')}
        />

        {/* S. No. 63: Office Address */}
        <FormInput
          num={63}
          label="Office Address"
          required
          icon={MapPin}
          placeholder="e.g. Ground Floor, Commercial Center, FC Road, Pune"
          {...bind(p, 'officeAddress')}
        />

        {/* S. No. 64: Office Space / Availability Details */}
        <FormInput
          num={64}
          label="Office Space / Availability Details"
          icon={Store}
          placeholder="e.g. 650 sq.ft commercial showroom with 4 desk cabins & reception"
          className="sm:col-span-2"
          {...bind(p, 'officeSpaceDetails')}
        />

        {/* S. No. 71: Investment Capacity */}
        <FormSelect
          num={71}
          label="Investment Capacity"
          required
          icon={Landmark}
          options={INVESTMENT_RANGES}
          placeholder="Select approved range"
          {...bind(p, 'investmentCapacity')}
        />

        {/* S. No. 72: Existing Business / Current Occupation */}
        <FormInput
          num={72}
          label="Existing Business / Current Occupation"
          required
          icon={Briefcase}
          placeholder="e.g. Retail Financial Services & IT Distribution"
          {...bind(p, 'existingBusinessOccupation')}
        />

        {/* S. No. 73: Estimated Monthly Business Income */}
        <FormSelect
          num={73}
          label="Estimated Monthly Business Income"
          icon={Receipt}
          options={INCOME_RANGES}
          placeholder="Select income bracket"
          className="sm:col-span-2"
          {...bind(p, 'estimatedMonthlyBusinessIncome')}
        />
      </div>

      {/* Hardware & Infrastructure Availability Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Settings size={15} className="text-[#2563eb]" />
          <span>Hardware & Office IT Readiness (S. No. 65 – 70)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <SegmentedRadio
            num={65}
            label="Computer / PC Available"
            options={['Yes', 'No'] as Exclude<YesNo, ''>[]}
            value={p.form.computerAvailable || 'Yes'}
            onChange={(v) => p.set({ computerAvailable: v })}
            disabled={p.readOnly}
          />
          <SegmentedRadio
            num={66}
            label="Laptop Available"
            options={['Yes', 'No'] as Exclude<YesNo, ''>[]}
            value={p.form.laptopAvailable || 'Yes'}
            onChange={(v) => p.set({ laptopAvailable: v })}
            disabled={p.readOnly}
          />
          <SegmentedRadio
            num={67}
            label="Printer Available"
            options={['Yes', 'No'] as Exclude<YesNo, ''>[]}
            value={p.form.printerAvailable || 'Yes'}
            onChange={(v) => p.set({ printerAvailable: v })}
            disabled={p.readOnly}
          />
          <SegmentedRadio
            num={68}
            label="UPS / Power Backup Available"
            options={['Yes', 'No'] as Exclude<YesNo, ''>[]}
            value={p.form.powerBackupAvailable || 'Yes'}
            onChange={(v) => p.set({ powerBackupAvailable: v })}
            disabled={p.readOnly}
          />
          <SegmentedRadio
            num={69}
            label="Internet Connectivity Available"
            options={['Yes', 'No'] as Exclude<YesNo, ''>[]}
            value={p.form.internetConnectivityAvailable || 'Yes'}
            onChange={(v) => p.set({ internetConnectivityAvailable: v })}
            disabled={p.readOnly}
          />
          <FormInput
            num={70}
            label="Other Infrastructure Details"
            icon={Settings}
            placeholder="e.g. CCTV, Inverter, AC, Safe"
            {...bind(p, 'otherInfrastructure')}
          />
        </div>
      </div>
    </div>
  )
}

// ── STEP 6: Section F - KYC & Supporting Documents ─────────────────────────
export function MasterDocumentsKYC(p: MasterStepProps) {
  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="06"
        title="KYC & Supporting Documents"
        sub="Identity verification, address proofs, corporate certificates, and digital sign."
        infoText="Upload clear scanned copies in PDF, JPG, or PNG format (max 5 MB each)."
        icon={<ShieldCheck size={18} />}
      />

      {/* S. No. 74: Applicant Photograph */}
      <ModernPhotoDrop
        num={74}
        label="Applicant Color Photograph"
        required
        value={p.form.applicantPhoto}
        onChange={(f) => p.set({ applicantPhoto: f })}
        disabled={p.readOnly}
        error={p.errors?.applicantPhoto}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* S. No. 75: PAN Card */}
        <ModernInlineDrop
          num={75}
          label="PAN Card Document"
          required
          value={p.form.panCardDoc}
          onChange={(f) => p.set({ panCardDoc: f })}
          disabled={p.readOnly}
          error={p.errors?.panCardDoc}
        />

        {/* S. No. 76: Aadhaar / Accepted Identity Proof */}
        <ModernInlineDrop
          num={76}
          label="Aadhaar / Accepted Identity Proof"
          required
          value={p.form.aadhaarDoc}
          onChange={(f) => p.set({ aadhaarDoc: f })}
          disabled={p.readOnly}
          error={p.errors?.aadhaarDoc}
        />

        {/* S. No. 77: Address Proof */}
        <ModernInlineDrop
          num={77}
          label="Address Proof (Electricity / Telephone / Tax bill)"
          required
          value={p.form.addressProofDoc}
          onChange={(f) => p.set({ addressProofDoc: f })}
          disabled={p.readOnly}
          error={p.errors?.addressProofDoc}
        />

        {/* S. No. 78: Business Registration / Incorporation Proof */}
        <ModernInlineDrop
          num={78}
          label="Business Registration / Incorporation Proof"
          hint="COI / Shop Act / Partnership Deed"
          value={p.form.businessRegProofDoc}
          onChange={(f) => p.set({ businessRegProofDoc: f })}
          disabled={p.readOnly}
        />

        {/* S. No. 79: GST Registration Certificate */}
        <ModernInlineDrop
          num={79}
          label="GST Registration Certificate (GST REG-06)"
          value={p.form.gstCertificateDoc}
          onChange={(f) => p.set({ gstCertificateDoc: f })}
          disabled={p.readOnly}
        />

        {/* S. No. 80: Authorized Signatory Proof */}
        <ModernInlineDrop
          num={80}
          label="Authorized Signatory / Board Resolution Proof"
          value={p.form.authorizedSignatoryProofDoc}
          onChange={(f) => p.set({ authorizedSignatoryProofDoc: f })}
          disabled={p.readOnly}
        />

        {/* S. No. 81: Office Address Proof */}
        <ModernInlineDrop
          num={81}
          label="Office Address Proof / Lease Agreement"
          value={p.form.officeAddressProofDoc}
          onChange={(f) => p.set({ officeAddressProofDoc: f })}
          disabled={p.readOnly}
        />

        {/* S. No. 82: Specimen Signature */}
        <ModernInlineDrop
          num={82}
          label="Specimen Signature of Applicant / Signatory"
          value={p.form.applicantSignatureDoc}
          onChange={(f) => p.set({ applicantSignatureDoc: f })}
          disabled={p.readOnly}
        />

        {/* S. No. 85: KYC Verification Status */}
        <FormSelect
          num={85}
          label="KYC Verification Status (Internal Assessment)"
          icon={ShieldCheck}
          options={KYC_VERIFICATION_STATUSES}
          placeholder="Select verification status"
          {...bind(p, 'kycVerificationStatus')}
        />

        {/* Verification remarks */}
        <FormInput
          label="KYC Verification Remarks"
          icon={FileText}
          placeholder="e.g. Scanned PAN & Aadhaar verified against NSDL/UIDAI"
          {...bind(p, 'kycVerificationRemarks')}
        />
      </div>
    </div>
  )
}

// ── STEP 7: Section G - Bank & Payment Account ─────────────────────────────
export function MasterBankPayment(p: MasterStepProps) {
  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="07"
        title="Bank & Payment Account"
        sub="Designated settlement account, IFSC validation, and financial statement proofs."
        infoText="All network commissions, ATM interchange payouts, and settlements route to this account."
        icon={<Landmark size={18} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* S. No. 86: Bank Name */}
        <FormInput
          num={86}
          label="Bank Name"
          required
          icon={Landmark}
          placeholder="e.g. HDFC Bank / State Bank of India / ICICI Bank"
          {...bind(p, 'bankName')}
        />

        {/* S. No. 87: Branch Name */}
        <FormInput
          num={87}
          label="Branch Name"
          required
          icon={Building}
          placeholder="e.g. Senapati Bapat Marg Branch, Pune"
          {...bind(p, 'branchName')}
        />

        {/* S. No. 88: Account Holder / Beneficiary Name */}
        <FormInput
          num={88}
          label="Account Holder / Beneficiary Name"
          required
          icon={User}
          placeholder="e.g. Shree Sai Finserve Pvt. Ltd."
          hint="Must match legal entity or authorized person name"
          {...bind(p, 'beneficiaryName')}
        />

        {/* S. No. 92: Account Type */}
        <FormSelect
          num={92}
          label="Account Type"
          required
          icon={CreditCard}
          options={BANK_ACCOUNT_TYPES}
          placeholder="Select Account Type"
          {...bind(p, 'accountType')}
        />

        {/* S. No. 89: Account Number */}
        <FormInput
          num={89}
          label="Account Number"
          required
          icon={Hash}
          placeholder="e.g. 50200012345678"
          {...bind(p, 'bankAccountNumber')}
        />

        {/* S. No. 90: Confirm Account Number */}
        <FormInput
          num={90}
          label="Confirm Account Number"
          required
          icon={Hash}
          placeholder="Re-enter bank account number"
          {...bind(p, 'confirmBankAccountNumber')}
        />

        {/* S. No. 91: IFSC Code */}
        <FormInput
          num={91}
          label="IFSC Code"
          required
          icon={Landmark}
          placeholder="e.g. HDFC0001234"
          maxLength={11}
          {...bind(p, 'ifscCode')}
          onChange={(e) => p.set({ ifscCode: e.target.value.toUpperCase() })}
        />

        {/* S. No. 93: Cheque Facility Available */}
        <FormSelect
          num={93}
          label="Cheque Facility Available"
          icon={Receipt}
          options={CHEQUE_FACILITY_OPTIONS}
          placeholder="Select"
          {...bind(p, 'chequeFacility')}
        />

        {/* S. No. 94: Bank Statement Proof */}
        <ModernInlineDrop
          num={94}
          label="Bank Statement Proof (Last 3 - 6 Months)"
          required
          value={p.form.bankStatementDoc}
          onChange={(f) => p.set({ bankStatementDoc: f })}
          disabled={p.readOnly}
          error={p.errors?.bankStatementDoc}
        />

        {/* S. No. 95: Cancelled Cheque Proof */}
        <ModernInlineDrop
          num={95}
          label="Cancelled Cheque Leaf"
          required
          value={p.form.cancelledChequeDoc}
          onChange={(f) => p.set({ cancelledChequeDoc: f })}
          disabled={p.readOnly}
          error={p.errors?.cancelledChequeDoc}
        />

        {/* S. No. 96: Bank Account Verification Status */}
        <FormSelect
          num={96}
          label="Bank Account Verification Status"
          icon={ShieldCheck}
          options={['Pending Verification', 'Verified via Penny Drop', 'Document Verified', 'Rejected']}
          placeholder="Select verification status"
          className="sm:col-span-2"
          {...bind(p, 'bankAccountVerificationStatus')}
        />
      </div>
    </div>
  )
}

// ── STEP 8: Section H - References & Background Verification ───────────────
export function MasterReferencesPolice(p: MasterStepProps) {
  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="08"
        title="References & Background Verification"
        sub="Professional and financial referee attestations and police verification record."
        infoText="Provide two independent professional or business references who can vouch for your credentials."
        icon={<Users size={18} />}
      />

      {/* Reference 1 Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-blue-100 text-xs font-bold text-[#2563eb]">
              1
            </span>
            <span className="text-sm font-bold text-slate-900">Reference 1 · Professional / Business Referee</span>
          </div>
          <span className="text-xs text-slate-400">S. No. 97 – 103</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            num={97}
            label="Referee Full Name"
            required
            icon={User}
            placeholder="e.g. Arvind Mehta"
            {...bind(p, 'ref1Name')}
          />
          <FormInput
            num={98}
            label="Designation / Relationship"
            required
            icon={Briefcase}
            placeholder="e.g. Branch Manager, Bank of Baroda"
            {...bind(p, 'ref1Designation')}
          />
          <FormInput
            num={99}
            label="Organization / Business Name"
            icon={Building}
            placeholder="e.g. Bank of Baroda / Tech Solutions"
            {...bind(p, 'ref1Relationship')}
          />
          <FormInput
            num={100}
            label="Contact Mobile Number"
            required
            icon={Phone}
            placeholder="e.g. 9822011223"
            maxLength={10}
            {...bind(p, 'ref1Mobile')}
          />
          <FormInput
            num={101}
            label="Email ID"
            icon={Mail}
            type="email"
            placeholder="e.g. arvind.mehta@example.com"
            {...bind(p, 'ref1Email')}
          />
          <FormInput
            num={102}
            label="Address / City"
            icon={MapPin}
            placeholder="e.g. Shivajinagar, Pune"
            {...bind(p, 'ref1Address')}
          />
        </div>
      </div>

      {/* Reference 2 Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-blue-100 text-xs font-bold text-[#2563eb]">
              2
            </span>
            <span className="text-sm font-bold text-slate-900">Reference 2 · Second Independent Referee</span>
          </div>
          <span className="text-xs text-slate-400">S. No. 104 – 110</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            num={104}
            label="Referee Full Name"
            required
            icon={User}
            placeholder="e.g. Vijay Deshmukh"
            {...bind(p, 'ref2Name')}
          />
          <FormInput
            num={105}
            label="Designation / Relationship"
            required
            icon={Briefcase}
            placeholder="e.g. Chartered Accountant / Partner"
            {...bind(p, 'ref2Designation')}
          />
          <FormInput
            num={106}
            label="Organization / Business Name"
            icon={Building}
            placeholder="e.g. Deshmukh & Associates CA"
            {...bind(p, 'ref2Relationship')}
          />
          <FormInput
            num={107}
            label="Contact Mobile Number"
            required
            icon={Phone}
            placeholder="e.g. 9822044556"
            maxLength={10}
            {...bind(p, 'ref2Mobile')}
          />
          <FormInput
            num={108}
            label="Email ID"
            icon={Mail}
            type="email"
            placeholder="e.g. vijay.ca@example.com"
            {...bind(p, 'ref2Email')}
          />
          <FormInput
            num={109}
            label="Address / City"
            icon={MapPin}
            placeholder="e.g. Kothrud, Pune"
            {...bind(p, 'ref2Address')}
          />
        </div>
      </div>

      {/* Police & Background Verification Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
            <ShieldCheck size={16} className="text-[#2563eb]" />
            <span>Police & Background Verification (S. No. 111 – 116)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SegmentedRadio
            num={111}
            label="Police Verification Required"
            options={['Yes', 'No'] as Exclude<YesNo, ''>[]}
            value={p.form.policeVerificationRequired || 'Yes'}
            onChange={(v) => p.set({ policeVerificationRequired: v })}
            disabled={p.readOnly}
          />
          <FormSelect
            num={113}
            label="Police / Background Verification Status"
            icon={ShieldCheck}
            options={['Pending Verification', 'Clear / No Adverse Record', 'Under Process', 'Adverse Finding', 'Not Required']}
            placeholder="Select status"
            {...bind(p, 'backgroundVerificationStatus')}
          />
        </div>
      </div>
    </div>
  )
}

// ── STEP 9: Section I - Agreement, Declaration & Consent ───────────────────
export function MasterAgreementConsent(p: MasterStepProps) {
  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="09"
        title="Agreement, Declaration & Consent"
        sub="Information veracity attestations, statutory consents, and legal agreement execution."
        infoText="Review all statutory declarations and upload the executed master franchise agreement."
        icon={<FileSignature size={18} />}
      />

      {/* Declarations list matching spreadsheet S. No. 115 - 118 */}
      <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/30 p-5 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Statutory Undertakings & Declarations (S. No. 115 – 118)
        </h3>

        {[
          {
            key: 'declarationInfoAccuracy' as const,
            num: 115,
            title: 'Information Accuracy & Authenticity',
            desc: 'I hereby confirm and declare that all the information and documents furnished in this application are true, accurate, complete, and authentic to the best of my knowledge.',
          },
          {
            key: 'declarationKycConsent' as const,
            num: 116,
            title: 'KYC & Background Verification Consent',
            desc: 'I hereby authorize Dexter Capital / Dexter White Label ATM Network and its designated verification agencies to verify my identity, credit report, address, and credentials through third-party databases.',
          },
          {
            key: 'declarationDataProcessingConsent' as const,
            num: 117,
            title: 'Data Processing & Regulatory Compliance',
            desc: 'I consent to the collection, storage, and processing of my personal and business data in compliance with Reserve Bank of India (RBI) White Label ATM guidelines and applicable data protection laws.',
          },
          {
            key: 'agreementTermsAccepted' as const,
            num: 118,
            title: 'Master Franchise Agreement Terms Acceptance',
            desc: 'I undertake to abide by the Master Franchise operational guidelines, territory boundary covenants, uptime SLAs, cash management protocols, and Dexter franchise policies.',
          },
        ].map((item) => {
          const checked = !!p.form[item.key]
          return (
            <label
              key={item.key}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3.5 transition-all cursor-pointer',
                checked
                  ? 'border-blue-300 bg-white shadow-2xs'
                  : 'border-slate-200 bg-white/70 hover:bg-white',
                p.readOnly && 'cursor-default',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={p.readOnly}
                onChange={(e) => p.set({ [item.key]: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb]"
              />
              <div className="flex-1 text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">
                    {item.num}
                  </span>
                  {item.title} <span className="text-red-500 font-bold">*</span>
                </span>
                <p className="mt-1 text-slate-600 leading-relaxed text-[11.5px]">{item.desc}</p>
              </div>
            </label>
          )
        })}
      </div>

      {/* Form Fields: S. No. 119 - 125 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* S. No. 120: Declaration Place */}
        <FormInput
          num={120}
          label="Declaration Place"
          required
          icon={MapPin}
          placeholder="e.g. Pune"
          {...bind(p, 'declarationPlace')}
        />

        {/* S. No. 121: Declaration Date */}
        <FormInput
          num={121}
          label="Declaration Date"
          type="date"
          required
          icon={Clock}
          {...bind(p, 'declarationDate')}
        />

        {/* S. No. 122: Authorized Signatory Full Name */}
        <FormInput
          num={122}
          label="Authorized Signatory Full Name"
          required
          icon={User}
          placeholder="e.g. Rajesh Narayan Patil"
          {...bind(p, 'signatoryName')}
        />

        {/* S. No. 119: Master Franchise Agreement Document */}
        <ModernInlineDrop
          num={119}
          label="Master Franchise Agreement Document"
          required
          value={p.form.masterFranchiseAgreementDoc}
          onChange={(f) => p.set({ masterFranchiseAgreementDoc: f })}
          disabled={p.readOnly}
          error={p.errors?.masterFranchiseAgreementDoc}
        />

        {/* S. No. 123: Applicant Signature Copy */}
        <ModernInlineDrop
          num={123}
          label="Applicant Signature Copy"
          required
          value={p.form.signatorySignatureDoc}
          onChange={(f) => p.set({ signatorySignatureDoc: f })}
          disabled={p.readOnly}
          error={p.errors?.signatorySignatureDoc}
        />

        {/* S. No. 124: Company Seal / Stamp */}
        <ModernInlineDrop
          num={124}
          label="Company Seal / Stamp Impression"
          value={p.form.companySealDoc}
          onChange={(f) => p.set({ companySealDoc: f })}
          disabled={p.readOnly}
        />
      </div>
    </div>
  )
}

// ── STEP 10: Section J - Application Fee / Payment ─────────────────────────
export function MasterFeePayment(p: MasterStepProps) {
  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="10"
        title="Application Fee / Payment"
        sub="Territory fee payment record, UTR references, and accounts reconciliation."
        infoText="Record the payment details for territory allocation fee or security deposit."
        icon={<Receipt size={18} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* S. No. 126: Application Fee / Payment Required */}
        <SegmentedRadio
          num={126}
          label="Application Fee / Territory Security Deposit Applicable?"
          options={['Yes', 'No'] as Exclude<YesNo, ''>[]}
          value={p.form.paymentRequired || 'Yes'}
          onChange={(v) => p.set({ paymentRequired: v })}
          disabled={p.readOnly}
        />

        {/* S. No. 128: Payment Purpose */}
        <FormSelect
          num={128}
          label="Payment Purpose"
          icon={Receipt}
          options={PAYMENT_PURPOSES}
          placeholder="Select Purpose"
          {...bind(p, 'paymentPurpose')}
        />

        {/* S. No. 129: Payment Mode */}
        <FormSelect
          num={129}
          label="Payment Mode"
          icon={CreditCard}
          options={PAYMENT_MODES}
          placeholder="Select Mode"
          {...bind(p, 'paymentMode')}
        />

        {/* S. No. 127: Payment Amount in INR */}
        <FormInput
          num={127}
          label="Payment Amount (in INR)"
          icon={Landmark}
          placeholder="e.g. 5,00,000"
          {...bind(p, 'paymentAmount')}
        />

        {/* S. No. 131: Transaction / UTR / Reference Number */}
        <FormInput
          num={131}
          label="Transaction / UTR / Reference Number"
          icon={Hash}
          placeholder="e.g. UTR202611039821"
          {...bind(p, 'paymentRefNumber')}
        />

        {/* S. No. 130: Remitting Bank Name */}
        <FormInput
          num={130}
          label="Remitting Bank Name"
          icon={Building}
          placeholder="e.g. HDFC Bank"
          {...bind(p, 'paymentBankName')}
        />

        {/* S. No. 132: Payment Date */}
        <FormInput
          num={132}
          label="Payment Date"
          type="date"
          icon={Clock}
          {...bind(p, 'paymentDate')}
        />

        {/* S. No. 133: Payment Proof Receipt */}
        <ModernInlineDrop
          num={133}
          label="Payment Proof Receipt / Bank Counterfoil"
          value={p.form.paymentProofDoc}
          onChange={(f) => p.set({ paymentProofDoc: f })}
          disabled={p.readOnly}
        />

        {/* S. No. 135: Payment Reconciliation Status */}
        <FormSelect
          num={135}
          label="Dexter Accounts Reconciliation Status"
          icon={ShieldCheck}
          options={['Pending Reconciliation', 'Reconciled & Credited', 'Payment Failed', 'Waived by Management']}
          placeholder="Select status"
          className="sm:col-span-2"
          {...bind(p, 'paymentVerificationStatus')}
        />
      </div>
    </div>
  )
}

// ── STEP 11: Section K - Internal Approval & ERP Account ────────────────────
export function MasterInternalApproval(p: MasterStepProps) {
  const isSuper = p.form.franchiseCategory === 'Super Master Franchise'
  const stateCode = p.form.state ? (STATES.includes(p.form.state) ? p.form.state.slice(0, 2).toUpperCase() : 'IN') : 'IN'
  const displayErpId = p.form.dexterErpUserId || (isSuper ? `DXT-${stateCode}-SMF0042` : `DXT-${stateCode}-MF0142`)

  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="11"
        title="Internal Approval & ERP Account"
        sub="Cross-functional approvals, ERP identity generation, and territory provisioning."
        infoText="Internal Dexter workflow section for regional head approvals and ERP provisioning."
        icon={<Settings2 size={18} />}
      />

      {/* Internal Multi-tier Approvals Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-blue-100 text-xs font-bold text-[#2563eb]">
              1
            </span>
            <span className="text-sm font-bold text-slate-900">Internal Approvals & Recommendations</span>
          </div>
          <span className="text-xs text-slate-400">S. No. 136 – 145</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            num={136}
            label="Recommended By (Dexter Executive)"
            icon={User}
            placeholder="e.g. Amit Kumar Deshmukh"
            {...bind(p, 'recommendedBy')}
          />
          <FormInput
            num={137}
            label="Recommender Employee ID"
            icon={Hash}
            placeholder="e.g. DXT-EMP-4019"
            {...bind(p, 'recommenderEmployeeId')}
          />
          <FormInput
            num={138}
            label="Recommender Contact Number"
            icon={Phone}
            placeholder="e.g. 9811122233"
            {...bind(p, 'recommenderContact')}
          />
          <FormInput
            num={139}
            label="KYC & Compliance Verification Desk"
            icon={ShieldCheck}
            placeholder="e.g. Priya Nair (Compliance Specialist)"
            {...bind(p, 'kycCheckedBy')}
          />
          <FormInput
            num={140}
            label="Business Development Approval"
            icon={Briefcase}
            placeholder="e.g. Cleared by Head - Franchise Network"
            {...bind(p, 'businessApprovalBy')}
          />
          <FormInput
            num={141}
            label="Finance & Accounts Approval"
            icon={Landmark}
            placeholder="e.g. Cleared by Treasury Desk"
            {...bind(p, 'financeApprovalBy')}
          />
          <FormSelect
            num={143}
            label="Final Committee Decision"
            icon={CheckCircle2}
            options={INTERNAL_DECISION_OPTIONS}
            placeholder="Select Final Decision"
            {...bind(p, 'finalDecision')}
          />
          <FormInput
            num={145}
            label="Internal Remarks / Approval Conditions"
            icon={FileText}
            placeholder="e.g. Subject to quarterly review of network expansion"
            {...bind(p, 'salesRemarks')}
          />
        </div>
      </div>

      {/* Dexter ERP Account & Territory Mapping Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
            <Settings size={16} className="text-[#2563eb]" />
            <span>Dexter ERP Identity & Territory Mapping (S. No. 146 – 154)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* S. No. 146: Dexter ERP User ID */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-bold text-[#0f172a]">
              <span className="mr-1 inline-flex h-4 min-w-4 items-center justify-center rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-600 border border-slate-200">
                146
              </span>
              <span>Dexter ERP User ID</span>
            </label>
            <div className="flex h-11 items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/70 px-3.5 text-xs font-mono font-bold text-emerald-900 shadow-2xs">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-emerald-700" />
                <span>{displayErpId}</span>
              </div>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                System Provisioned
              </span>
            </div>
          </div>

          {/* S. No. 148: Franchise Login Status */}
          <FormSelect
            num={148}
            label="Franchise Portal Login Status"
            icon={Network}
            options={FRANCHISE_LOGIN_STATUSES}
            placeholder="Select Status"
            {...bind(p, 'franchiseLoginStatus')}
          />

          {/* S. No. 150: Account Activation Date */}
          <FormInput
            num={150}
            label="Account Activation Date"
            type="date"
            icon={Clock}
            {...bind(p, 'franchiseActivationDate')}
          />

          {/* S. No. 152: Territory Mapping Status */}
          <FormSelect
            num={152}
            label="Territory Mapping Status"
            icon={MapPin}
            options={TERRITORY_MAPPING_STATUSES}
            placeholder="Select mapping status"
            {...bind(p, 'territoryMappingStatus')}
          />
        </div>
      </div>
    </div>
  )
}

// ── STEP 12: Section L - Final Submission Checklist & Audit ────────────────
export function MasterReviewChecklist(p: MasterStepProps) {
  const checklists = [
    { num: 155, key: 'chkApplicationComplete' as const, label: 'Section A: Franchise & Territory Details Complete & Validated' },
    { num: 156, key: 'chkBusinessLegalVerified' as const, label: 'Section B: Legal Entity & Registration Numbers Verified (PAN, GSTIN, MCA)' },
    { num: 157, key: 'chkIdentityAddressVerified' as const, label: 'Section C & D: Authorized Person Identity & Registered Addresses Confirmed' },
    { num: 158, key: 'chkSupportingDocsUploaded' as const, label: 'Section E & F: Office Infrastructure Solvency & KYC Documents Uploaded' },
    { num: 159, key: 'chkBankDetailsVerified' as const, label: 'Section G: Settlement Bank Account & Cancelled Cheque Verified' },
    { num: 160, key: 'chkReferenceBgVerified' as const, label: 'Section H: Professional References Contacted & Background Check Initiated' },
    { num: 161, key: 'chkAgreementExecuted' as const, label: 'Section I: Master Franchise Agreement Signed with Undertakings' },
    { num: 162, key: 'chkPaymentVerified' as const, label: 'Section J: Application Fee / Security Deposit Reconciled' },
    { num: 163, key: 'chkTerritoryApproved' as const, label: 'Section K: Cross-Functional Departmental Approvals Logged' },
    { num: 164, key: 'chkFinalApprovalCompleted' as const, label: 'Section K: Dexter ERP User ID & Regional Territory Configured' },
  ]

  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="12"
        title="Final Submission Checklist"
        sub="Multi-stage readiness checks and final application dispatch status."
        infoText="Review summary of key application parameters and verify all checklist items before submitting."
        icon={<ClipboardCheck size={18} />}
      />

      {/* Summary Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Franchise Tier</p>
          <p className="text-sm font-bold text-slate-900 mt-1 truncate">
            {p.form.franchiseCategory || 'Master Franchise'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Territory</p>
          <p className="text-sm font-bold text-slate-900 mt-1 truncate">
            {p.form.state || 'Maharashtra'} · {p.form.district || 'Pune'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Legal Entity</p>
          <p className="text-sm font-bold text-slate-900 mt-1 truncate">
            {p.form.legalBusinessName || p.form.franchiseName || 'Not specified'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Authorized Signatory</p>
          <p className="text-sm font-bold text-slate-900 mt-1 truncate">
            {p.form.applicantAuthorizedPersonName || 'Not specified'}
          </p>
        </div>
      </div>

      {/* 10 Checkpoints from S. No. 155 to 164 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={16} className="text-[#2563eb]" />
            <span className="text-sm font-bold text-slate-900">
              10-Point Pre-Submission Readiness Checklist (S. No. 155 – 164)
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">Verify each prerequisite before submission</span>
        </div>

        <div className="divide-y divide-slate-100">
          {checklists.map((item) => {
            const val = p.form[item.key] || 'Yes'
            return (
              <div key={item.key} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-5 w-7 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200">
                    {item.num}
                  </span>
                  <span className="text-xs font-medium text-slate-800">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['Yes', 'No', 'N/A'] as const).map((opt) => {
                    const active = val === opt
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={p.readOnly}
                        onClick={() => p.set({ [item.key]: opt } as any)}
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs font-semibold transition-all border',
                          active
                            ? opt === 'Yes'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                              : opt === 'No'
                              ? 'border-red-400 bg-red-50 text-red-700'
                              : 'border-slate-300 bg-slate-100 text-slate-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                          p.readOnly && 'cursor-default opacity-80',
                        )}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Final Submission Status (S. No. 165) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <FormSelect
          num={165}
          label="Application Submission Status"
          icon={CheckCircle2}
          options={SUBMISSION_STATUS_OPTIONS}
          placeholder="Select Status"
          {...bind(p, 'submissionStatus')}
        />
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 text-xs text-slate-600 flex items-center gap-3">
          <Clock size={18} className="text-[#2563eb] shrink-0" />
          <span>
            Submitting this application registers the franchise under Dexter&apos;s White Label ATM Network registry.
          </span>
        </div>
      </div>
    </div>
  )
}
