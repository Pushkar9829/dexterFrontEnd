import { useRef, type ReactNode } from 'react'
import {
  AlertCircle,
  Briefcase,
  Building,
  Building2,
  Camera,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Hash,
  IdCard,
  Image as ImageIcon,
  Info,
  Landmark,
  LocateFixed,
  Mail,
  Map,
  MapPin,
  MoveHorizontal,
  MoveVertical,
  Network,
  Phone,
  Receipt,
  Ruler,
  Settings,
  Shield,
  ShieldCheck,
  Store,
  UploadCloud,
  User,
  X,
  Zap,
} from 'lucide-react'
import {
  BUSINESS_TYPES,
  DOCUMENTS,
  IMAGE_SLOTS,
  LOCATIONS,
  PLANS,
  PROJECT_TYPES,
  RBI_CATEGORIES,
  SITE_TYPES,
  STATES,
  TIS_TYPES,
  type ApplicationForm,
  type AtmRow,
  type YesNo,
} from '@/data/applications'
import { fmtSize, type FileValue } from '@/components/ui/Form'
import { cn } from '@/lib/cn'
import type { Errors } from './validate'
import type { Tier } from '@/data/franchises'

export type StepProps = {
  form: ApplicationForm
  set: (patch: Partial<ApplicationForm>) => void
  errors: Errors
  readOnly?: boolean
  initialTier?: Tier
}

const YN: Exclude<YesNo, ''>[] = ['Yes', 'No']

// ── Reusable Form Components Matching Reference Design ──────────────────────

/** Step Section Banner with Blue Number Badge & Right Info Box (Exactly matching the image) */
function StepHeaderBanner({
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

/** Field wrapper with label, red asterisk and left icon */
function IconField({
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

/** Input matching reference design */
function FormInput({
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
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
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
        className="h-full w-full bg-transparent pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
      />
    </IconField>
  )
}

/** Select matching reference design */
function FormSelect({
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
  options: string[]
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
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
            'h-full w-full appearance-none bg-transparent pr-9 text-[13px] text-slate-900 outline-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
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

/** Segmented radio toggle buttons matching blue theme */
function SegmentedRadio<T extends string>({
  label,
  num,
  options,
  value,
  onChange,
  disabled,
  className,
}: {
  label: string
  num?: number | string
  options: T[]
  value: T | ''
  onChange: (v: T) => void
  disabled?: boolean
  className?: string
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

/** Inline file dropzone */
function ModernInlineDrop({
  value,
  onChange,
  accept,
  maxMb = 5,
  disabled,
  hint,
}: {
  value: FileValue
  onChange: (f: FileValue) => void
  accept?: string
  maxMb?: number
  disabled?: boolean
  hint?: string
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

  if (value) {
    return (
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
    )
  }

  return (
    <div
      onClick={() => !disabled && ref.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        if (!disabled) take(e.dataTransfer.files[0])
      }}
      className={cn(
        'group flex h-11 cursor-pointer items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-3.5 text-[12.5px] text-slate-600 transition-all hover:border-[#2563eb] hover:bg-[#eff6ff] hover:text-[#2563eb] shadow-2xs',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <div className="flex items-center gap-2">
        <UploadCloud size={17} className="text-[#2563eb] group-hover:scale-110 transition-transform" />
        <span className="font-medium">Upload file</span>
      </div>
      <span className="text-[11px] text-slate-400">{hint ?? `Max ${maxMb}MB`}</span>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => take(e.target.files?.[0])} />
    </div>
  )
}

/** Card photo upload dropzone */
function ModernPhotoDrop({
  value,
  onChange,
  disabled,
  error,
}: {
  value: FileValue
  onChange: (f: FileValue) => void
  disabled?: boolean
  error?: string
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
      <label className="block text-xs font-bold text-[#0f172a]">
        Latest Color Photograph of Applicant <span className="text-red-500 font-bold">*</span>
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

/** Form bind helper */
function bind(p: StepProps, key: keyof ApplicationForm) {
  return {
    value: (p.form[key] as string) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      p.set({ [key]: e.target.value } as Partial<ApplicationForm>),
    error: p.errors[key],
    disabled: p.readOnly,
  }
}

// ── STEP 1: Site Details (Exactly matching the user image) ──────────────────
export function SiteDetails(p: StepProps) {
  const loc = LOCATIONS[p.form.state]

  return (
    <div className="space-y-6">
      {/* Section Header Banner with 01 and right info box */}
      <StepHeaderBanner
        num="01"
        title="Site Details"
        sub="Please provide the proposed site location and related details."
        infoText="Enter accurate site location details to ensure smooth approval and further processing."
        icon={<MapPin size={18} />}
      />

      {/* Grid of fields matching the user image layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* Row 1 */}
        <FormInput
          label="Proposed Site Location Name"
          required
          icon={Building2}
          placeholder="e.g. Shree Sai Financial Services - Pune"
          {...bind(p, 'siteName')}
        />
        <FormSelect
          label="State"
          required
          icon={Map}
          options={STATES}
          placeholder="Select state"
          {...bind(p, 'state')}
          onChange={(e) => p.set({ state: e.target.value, city: '', circle: '', district: '' })}
        />

        {/* Row 2 */}
        <FormSelect
          label="City"
          required
          icon={Shield}
          options={loc?.cities ?? []}
          placeholder={p.form.state ? 'Select city' : 'Select state first'}
          {...bind(p, 'city')}
        />
        <FormSelect
          label="Circle / Zone"
          required
          icon={Network}
          options={loc?.circles ?? []}
          placeholder="Select circle / zone"
          {...bind(p, 'circle')}
        />

        {/* Row 3 */}
        <FormSelect
          label="District"
          required
          icon={Landmark}
          options={loc?.cities ?? []}
          placeholder="Select district"
          {...bind(p, 'district')}
        />
        <FormInput
          label="Pin Code"
          required
          icon={MapPin}
          inputMode="numeric"
          maxLength={6}
          placeholder="e.g. 411001"
          {...bind(p, 'pinCode')}
        />

        {/* Row 4 */}
        <FormInput
          label="Landmark"
          required
          icon={MapPin}
          placeholder="e.g. Near City Mall, Opp. Petrol Pump"
          {...bind(p, 'landmark')}
        />
        <FormSelect
          label="RBI Category"
          required
          icon={FileText}
          options={RBI_CATEGORIES}
          placeholder="Select RBI category"
          {...bind(p, 'rbiCategory')}
        />

        {/* Row 5: Full Width Address */}
        <FormInput
          className="sm:col-span-2"
          label="Site Complete Address"
          required
          icon={MapPin}
          placeholder="Shop no., building, street, area, city, district, state, pincode"
          {...bind(p, 'siteAddress')}
        />

        {/* Row 6 */}
        <FormInput
          label="Site Latitude"
          required
          icon={LocateFixed}
          inputMode="decimal"
          placeholder="e.g. 18.5204"
          {...bind(p, 'latitude')}
        />
        <FormInput
          label="Site Longitude"
          required
          icon={LocateFixed}
          inputMode="decimal"
          placeholder="e.g. 73.8567"
          {...bind(p, 'longitude')}
        />

        {/* Row 7 */}
        <FormSelect
          label="Site Type"
          required
          icon={Store}
          options={SITE_TYPES}
          placeholder="Select site type"
          {...bind(p, 'siteType')}
        />
        <FormSelect
          label="TIS Type"
          required
          icon={Settings}
          options={TIS_TYPES}
          placeholder="Select TIS type"
          {...bind(p, 'tisType')}
        />

        {/* Row 8 */}
        <FormSelect
          label="Project Type"
          required
          icon={Briefcase}
          options={PROJECT_TYPES}
          placeholder="Select project type"
          {...bind(p, 'projectType')}
        />
        <FormSelect
          label="Business Type"
          required
          icon={Briefcase}
          options={BUSINESS_TYPES}
          placeholder="Select business type"
          {...bind(p, 'businessType')}
        />

        {/* Row 9 */}
        <FormSelect
          label="Strategy / Plan / Model Name"
          required
          icon={FileSpreadsheet}
          options={PLANS}
          placeholder="Select strategy / plan"
          {...bind(p, 'plan')}
        />
        <FormInput
          label="Existing ATM ID"
          icon={CreditCard}
          placeholder="Enter existing ATM ID (if applicable)"
          {...bind(p, 'existingAtmId')}
        />

        {/* Row 10: Applicant Photo Upload (Full width) */}
        <div className="sm:col-span-2 mt-2">
          <ModernPhotoDrop
            value={p.form.applicantPhoto}
            onChange={(f) => p.set({ applicantPhoto: f })}
            disabled={p.readOnly}
            error={p.errors.applicantPhoto}
          />
        </div>
      </div>
    </div>
  )
}

// ── STEP 2: Franchise & Bank ──────────────────────────────────────────────
export function FranchiseBank(p: StepProps) {
  const loc = LOCATIONS[p.form.corrState]

  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="02"
        title="Franchise & Bank Details"
        sub="Provide registered franchise credentials and sponsoring bank settlement account details."
        infoText="Settlement account details will be used for daily automated CBR and commission disbursements."
        icon={<Landmark size={18} />}
      />

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
            Franchise Information &amp; Address
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <FormInput num={14} label="Franchise Name" icon={Building2} placeholder="e.g. Sai Financial Enterprise" {...bind(p, 'franchiseName')} />
            <FormInput num={15} label="Franchise Name on Cheque" icon={FileText} placeholder="e.g. Sai Financial Enterprise" {...bind(p, 'nameOnCheque')} />
            <FormInput num={16} label="Contact Number" icon={Phone} inputMode="tel" placeholder="10-digit primary mobile number" {...bind(p, 'contactNumber')} />
            <FormInput num={17} label="Alternate Number" icon={Phone} inputMode="tel" placeholder="Alternate phone / mobile" {...bind(p, 'alternateNumber')} />
            <FormInput className="sm:col-span-2" num={18} label="Email ID" icon={Mail} type="email" placeholder="official@franchise.in" {...bind(p, 'email')} />
            <FormInput className="sm:col-span-2" num={19} label="Correspondence Address" icon={MapPin} placeholder="Full correspondence address" {...bind(p, 'corrAddress')} />
            <FormInput label="Landmark" icon={MapPin} placeholder="Nearby landmark" {...bind(p, 'corrLandmark')} />
            <FormSelect
              label="State"
              icon={Map}
              options={STATES}
              placeholder="Select state"
              {...bind(p, 'corrState')}
              onChange={(e) => p.set({ corrState: e.target.value, corrDistrict: '' })}
            />
            <FormSelect
              label="District"
              icon={Landmark}
              options={loc?.cities ?? []}
              placeholder={p.form.corrState ? 'Select district' : 'Select state first'}
              {...bind(p, 'corrDistrict')}
            />
            <FormInput label="Pin" icon={MapPin} inputMode="numeric" maxLength={6} placeholder="6-digit postal code" {...bind(p, 'corrPin')} />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
            Franchise Bank's Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <FormInput num={20} label="Bank Name" icon={Landmark} placeholder="e.g. HDFC Bank, ICICI Bank" {...bind(p, 'bankName')} />
            <FormInput num={21} label="Branch Name" icon={Building} placeholder="e.g. Kothrud Branch" {...bind(p, 'branchName')} />
            <FormInput num={22} label="Account Number" icon={CreditCard} inputMode="numeric" placeholder="Enter bank account number" {...bind(p, 'accountNumber')} />
            <FormInput
              num={23}
              label="IFSC Code"
              icon={Hash}
              placeholder="e.g. HDFC0001234"
              {...bind(p, 'ifsc')}
              onChange={(e) => p.set({ ifsc: e.target.value.toUpperCase() })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── STEP 3: Shop Dimensions ───────────────────────────────────────────────
export function ShopDimensions(p: StepProps) {
  const yn = (key: keyof ApplicationForm, num: number, label: string) => (
    <SegmentedRadio
      num={num}
      label={label}
      options={YN}
      value={p.form[key] as YesNo}
      onChange={(v) => !p.readOnly && p.set({ [key]: v } as Partial<ApplicationForm>)}
      disabled={p.readOnly}
    />
  )

  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="03"
        title="Shop / Site Dimensional Details"
        sub="Specify physical shop dimensions, frontage offering, and power facilities."
        infoText="Physical area requirements must comply with NPCI and bank security standards."
        icon={<Store size={18} />}
      />

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
            Shop Space Dimensions &amp; Ownership
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <FormInput label="Shop Owner Name" icon={User} placeholder="Full name of shop landlord" {...bind(p, 'shopOwnerName')} />
            <FormInput label="Shop Owner Number" icon={Phone} inputMode="tel" placeholder="10-digit mobile number" {...bind(p, 'shopOwnerNumber')} />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
            <FormInput num={24} label="Total Shop Area (Sq.ft.)" icon={Ruler} inputMode="decimal" placeholder="e.g. 240" {...bind(p, 'totalArea')} />
            <FormInput num={25} label="Shop Area Offered (Sq.ft.)" icon={Ruler} inputMode="decimal" placeholder="e.g. 120" {...bind(p, 'offeredArea')} />
            <FormInput num={26} label="Carpet Area (Sq.ft.)" icon={Ruler} inputMode="decimal" placeholder="e.g. 110" {...bind(p, 'carpetArea')} />
            <FormInput num={27} label="Depth" icon={MoveHorizontal} placeholder="e.g. 12 ft" {...bind(p, 'depth')} />
            <FormInput num={28} label="Width" icon={MoveHorizontal} placeholder="e.g. 10 ft" {...bind(p, 'width')} />
            <FormInput num={29} label="Height" icon={MoveVertical} placeholder="e.g. 10 ft" {...bind(p, 'height')} />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <FormInput num={30} label="Total Frontage" icon={Ruler} placeholder="e.g. 20 ft" {...bind(p, 'totalFrontage')} />
            <FormInput num={31} label="Frontage Offered" icon={Ruler} placeholder="e.g. 10 ft" {...bind(p, 'frontageOffered')} />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
            {yn('lSignage', 32, "'L' Shape Signage")}
            {yn('vsat', 33, 'V-SAT Antenna')}
            {yn('acOdu', 34, 'AC ODU Space')}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
            Power Infrastructure &amp; Site Facilities
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {yn('powerAvailable', 35, 'Power Availability')}
            <SegmentedRadio
              label="Meter Type"
              options={['Permanent', 'Temporary']}
              value={p.form.meterType}
              onChange={(v) => !p.readOnly && p.set({ meterType: v })}
              disabled={p.readOnly}
            />
            <FormInput
              label="Meter / Rating Detail"
              icon={Zap}
              placeholder="Enter meter number and sanctioned power rating"
              {...bind(p, 'meterDetail')}
            />
            <FormInput
              num={36}
              label="Power Available (in Hours)"
              icon={Clock}
              inputMode="numeric"
              placeholder="0–24 hours"
              {...bind(p, 'powerHours')}
            />
            <FormInput num={37} label="Signage Dimension — Width" icon={MoveHorizontal} placeholder="e.g. 10 ft" {...bind(p, 'signageWidth')} />
            <FormInput label="Signage Dimension — Height" icon={MoveVertical} placeholder="e.g. 3 ft" {...bind(p, 'signageHeight')} />
            <SegmentedRadio
              num={38}
              label="Shop Status"
              options={['Rented', 'Owned']}
              value={p.form.shopStatus}
              onChange={(v) => !p.readOnly && p.set({ shopStatus: v })}
              disabled={p.readOnly}
            />
            {yn('shutter', 39, 'Shutter Available')}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── STEP 4: CRA & ATMs ────────────────────────────────────────────────────
function AtmTable({
  rows,
  onChange,
  readOnly,
}: {
  rows: AtmRow[]
  onChange: (rows: AtmRow[]) => void
  readOnly?: boolean
}) {
  const cell = 'h-10 w-full bg-transparent px-3 text-[13px] outline-none placeholder:text-slate-400 focus:bg-[#eff6ff]/60 transition-colors'
  const upd = (i: number, k: keyof AtmRow, v: string) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
      <table className="w-full min-w-[780px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-slate-200 bg-[#f8fafc] text-left text-[11.5px] font-bold text-slate-600">
            <th className="border-r border-slate-200 px-3 py-2.5 w-14 text-center">Row</th>
            <th className="border-r border-slate-200 px-3 py-2.5">ATM ID</th>
            <th className="border-r border-slate-200 px-3 py-2.5">Bank Name</th>
            <th className="border-r border-slate-200 px-3 py-2.5 w-36">Site Type</th>
            <th className="border-r border-slate-200 px-3 py-2.5 w-32">Distance (KM)</th>
            <th className="border-r border-slate-200 px-3 py-2.5 w-32">Direction</th>
            <th className="px-3 py-2.5 w-36">Avg. Daily TXN</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-[#f8fbff] transition-colors">
              <td className="border-r border-slate-200 px-3 py-1 text-center font-bold text-[#2563eb] bg-slate-50/50">
                {String.fromCharCode(65 + i)}
              </td>
              <td className="border-r border-slate-200 p-0">
                <input
                  disabled={readOnly}
                  className={cell}
                  placeholder="ATM ID"
                  value={r.atmId}
                  onChange={(e) => upd(i, 'atmId', e.target.value)}
                />
              </td>
              <td className="border-r border-slate-200 p-0">
                <input
                  disabled={readOnly}
                  className={cell}
                  placeholder="Bank name"
                  value={r.bank}
                  onChange={(e) => upd(i, 'bank', e.target.value)}
                />
              </td>
              <td className="border-r border-slate-200 p-0">
                <select
                  disabled={readOnly}
                  className={cn(cell, !r.siteType && 'text-slate-400')}
                  value={r.siteType}
                  onChange={(e) => upd(i, 'siteType', e.target.value as AtmRow['siteType'])}
                >
                  <option value="">Select type</option>
                  <option value="Onsite">Onsite</option>
                  <option value="Offsite">Offsite</option>
                </select>
              </td>
              <td className="border-r border-slate-200 p-0">
                <input
                  disabled={readOnly}
                  className={cell}
                  inputMode="decimal"
                  placeholder="km"
                  value={r.distance}
                  onChange={(e) => upd(i, 'distance', e.target.value)}
                />
              </td>
              <td className="border-r border-slate-200 p-0">
                <input
                  disabled={readOnly}
                  className={cell}
                  placeholder="Direction"
                  value={r.direction}
                  onChange={(e) => upd(i, 'direction', e.target.value)}
                />
              </td>
              <td className="p-0">
                <input
                  disabled={readOnly}
                  className={cell}
                  inputMode="numeric"
                  placeholder="TXN count"
                  value={r.avgTxn}
                  onChange={(e) => upd(i, 'avgTxn', e.target.value)}
                />
              </td>
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
      <StepHeaderBanner
        num="04"
        title="CRA & Nearby ATM Details"
        sub="Enter cash replenishment agency details and benchmark competitor / Hitachi ATMs."
        infoText="Surrounding ATM performance benchmarks are required for projected volume feasibility."
        icon={<ShieldCheck size={18} />}
      />

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
            CRA &amp; Nearest Sponsoring Branch Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <SegmentedRadio
              num={40}
              label="CRA Coverage"
              options={YN}
              value={p.form.craCoverage}
              onChange={(v) => !p.readOnly && p.set({ craCoverage: v })}
              disabled={p.readOnly}
            />
            <FormInput num={41} label="CRA Agency Name" icon={ShieldCheck} placeholder="Enter CRA agency name (CMS, SIS, Writer)" {...bind(p, 'craAgency')} />
            <FormInput
              className="sm:col-span-2"
              num={42}
              label="WLA ATM Account Proposed Branch Name"
              icon={Landmark}
              placeholder="Enter proposed branch name"
              {...bind(p, 'proposedBranch')}
            />
            <FormInput num={43} label="Branch Manager Name" icon={User} placeholder="Enter Branch Manager name" {...bind(p, 'branchManager')} />
            <FormInput num={44} label="Branch Manager Number" icon={Phone} inputMode="tel" placeholder="10-digit contact number" {...bind(p, 'branchManagerNumber')} />
            <FormInput num={45} label="Branch SOL ID / IFSC Code" icon={Hash} placeholder="Enter branch SOL ID or IFSC code" {...bind(p, 'solIfsc')} />
            <FormInput
              num={46}
              label="Site Distance from Nearest Branch (KM)"
              icon={LocateFixed}
              inputMode="decimal"
              placeholder="e.g. 1.2"
              {...bind(p, 'branchDistance')}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
            47 · Nearest Competitor ATM Details (Rows A–E)
          </h3>
          <p className="text-xs text-slate-500 mb-3">Enter details for benchmark competitor ATM rows A through E.</p>
          <AtmTable rows={p.form.nearestAtms} onChange={(rows) => p.set({ nearestAtms: rows })} readOnly={p.readOnly} />
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
            48 · Nearby Hitachi ATM Details (Rows A–B)
          </h3>
          <p className="text-xs text-slate-500 mb-3">Enter details for nearby Hitachi network ATM rows A and B.</p>
          <AtmTable rows={p.form.hitachiAtms} onChange={(rows) => p.set({ hitachiAtms: rows })} readOnly={p.readOnly} />
        </div>

        <div className="pt-4 border-t border-slate-200">
          <label className="block text-xs font-bold text-[#0f172a] mb-1.5">
            Franchise Signature Proof
          </label>
          <div className="max-w-md">
            <ModernInlineDrop
              value={p.form.signature}
              onChange={(f) => p.set({ signature: f })}
              accept="image/png,image/jpeg,application/pdf"
              maxMb={5}
              disabled={p.readOnly}
              hint="PNG, JPG or PDF · Max 5MB"
            />
            <p className="mt-1.5 text-[11px] text-slate-500">Upload authorized signatory signature photocopy or digital sign.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── STEP 5: Documents Checklist ───────────────────────────────────────────
const DOC_ICONS = [FileSpreadsheet, IdCard, IdCard, Receipt, FileText, FileCheck2, Building2, FileText]

export function Documents(p: StepProps) {
  const upd = (i: number, patch: Partial<ApplicationForm['documents'][number]>) =>
    p.set({ documents: p.form.documents.map((d, j) => (j === i ? { ...d, ...patch } : d)) })

  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="05"
        title="Checklist for WLA Site"
        sub="Please review the document checklist and upload self-attested photocopies."
        infoText="All 8 statutory documents must be verified and marked prior to compliance clearance."
        icon={<FileCheck2 size={18} />}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full min-w-[760px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 bg-[#f8fafc] text-left text-[11.5px] font-bold text-slate-600">
              <th className="px-4 py-3">Document Checklist</th>
              <th className="w-44 px-4 py-3">Status (Mark Yes / No)</th>
              <th className="w-72 px-4 py-3">Upload Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DOCUMENTS.map((doc, i) => {
              const d = p.form.documents[i]
              const Icon = DOC_ICONS[i] || FileText
              return (
                <tr key={doc} className="hover:bg-[#f8fbff] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eff6ff] text-[#2563eb]">
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-[13px]">{doc}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {d.file ? (
                            <span className="text-emerald-700 font-medium">
                              ✓ Uploaded: {d.file.name} ({fmtSize(d.file.size)})
                            </span>
                          ) : (
                            'Awaiting upload · Self-attested photocopy required'
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1.5">
                      {YN.map((o) => {
                        const active = d.status === o
                        return (
                          <button
                            key={o}
                            type="button"
                            disabled={p.readOnly}
                            onClick={() => upd(i, { status: o })}
                            className={cn(
                              'flex h-8 w-16 items-center justify-center gap-1.5 rounded-lg border text-[12px] font-medium transition-all shadow-2xs',
                              active
                                ? 'border-[#2563eb] bg-[#2563eb] text-white font-semibold'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                              p.readOnly && 'opacity-60 cursor-not-allowed',
                            )}
                          >
                            {active && <Check size={12} />}
                            <span>{o}</span>
                          </button>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <ModernInlineDrop
                      value={d.file}
                      onChange={(f) => upd(i, { file: f, status: f ? 'Yes' : d.status })}
                      accept={i === 0 ? '.ppt,.pptx,.pdf' : 'image/*,application/pdf'}
                      maxMb={i === 0 ? 25 : 5}
                      disabled={p.readOnly}
                      hint={i === 0 ? 'PPT/PDF up to 25MB' : 'PDF/Image up to 5MB'}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-[#edf4ff] p-3.5 text-xs text-[#1e40af]">
        <Info size={16} className="shrink-0" />
        <span><strong>Note:</strong> All submitted documents must be self-attested photocopies with signature and date stamp.</span>
      </div>
    </div>
  )
}

// ── STEP 6: Images & Office Use ───────────────────────────────────────────
export function ImagesOffice(p: StepProps) {
  const uploaded = p.form.images.filter(Boolean).length

  return (
    <div className="space-y-6">
      <StepHeaderBanner
        num="06"
        title="Images for Making the PPT"
        sub={`Upload each view in the sequence below (${uploaded} of 15 images uploaded).`}
        infoText="Site photographs must be embedded sequentially in the site approval committee PPT."
        icon={<ImageIcon size={18} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {IMAGE_SLOTS.map((slot, i) => {
          const hasFile = !!p.form.images[i]
          return (
            <div
              key={slot}
              className={cn(
                'rounded-xl border p-3.5 transition-all shadow-2xs',
                hasFile ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'grid h-5 w-5 place-items-center rounded-md text-[10px] font-bold text-white',
                      hasFile ? 'bg-emerald-600' : 'bg-[#2563eb]',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[12px] font-semibold text-slate-900 truncate" title={slot}>
                    {slot}
                  </span>
                </div>
                <span className={cn('text-[10px] font-bold shrink-0', hasFile ? 'text-emerald-700' : 'text-slate-400')}>
                  {hasFile ? 'Uploaded' : 'Pending'}
                </span>
              </div>

              <ModernInlineDrop
                value={p.form.images[i]}
                onChange={(f) =>
                  p.set({
                    images: p.form.images.map((x, j) => (j === i ? f : x)),
                  })
                }
                accept="image/png,image/jpeg"
                maxMb={10}
                disabled={p.readOnly}
                hint="JPG/PNG up to 10MB"
              />
            </div>
          )
        })}
      </div>

      {/* Office Use Only */}
      <div className="mt-6 pt-5 border-t border-slate-200">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
          Office Use Only · Site Sourcing SSE / SSM Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
          <FormInput label="Site Number" icon={Hash} placeholder="e.g. SIT-00482" {...bind(p, 'siteNumber')} />
          <FormInput label="Site Sourced By" icon={User} placeholder="Enter SSE / SSM Officer Name" {...bind(p, 'sourcedBy')} />
          <FormInput label="Site Sourcing Code" icon={Shield} placeholder="e.g. SRC-PUN-019" {...bind(p, 'sourcingCode')} />
        </div>
      </div>
    </div>
  )
}
