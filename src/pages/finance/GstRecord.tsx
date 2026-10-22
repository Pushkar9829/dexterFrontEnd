import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Coins,
  Download,
  FileText,
  Filter,
  Landmark,
  Pencil,
  Printer,
  Save,
  Search,
  Send,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { dmy, rupee } from '@/data/cbrSites'
import {
  AMOUNT_KEYS,
  FIN_YEARS,
  FY_MONTHS,
  GSTIN_RE,
  GST_INVOICE_STATUSES,
  GST_PAYMENT_STATUSES,
  MOBILE_RE,
  UTR_RE,
  calcNet,
  emptyGst,
  getGst,
  gstStore,
  numOr0,
  saveGst,
  type GstRecord,
} from '@/data/financeGst'
import { invoiceTone } from './GstList'
import { Badge } from '@/components/ui/Badge'

type Errors = Partial<Record<keyof GstRecord | 'form', string>>

function validate(r: GstRecord, isNew: boolean): Errors {
  const e: Errors = {}
  for (const k of AMOUNT_KEYS) {
    const v = String(r[k]).trim()
    if (v === '') continue
    if (!/^\d+(\.\d{1,2})?$/.test(v)) e[k] = Number(v) < 0 ? 'Amount cannot be negative' : 'Enter a number (up to 2 decimals)'
  }
  if (r.gstNumber && !GSTIN_RE.test(r.gstNumber)) e.gstNumber = '15 characters, e.g. 09AABC134522J1ZE'
  if (r.contactNo && !MOBILE_RE.test(r.contactNo)) e.contactNo = 'Enter a 10-digit mobile number'
  if (r.utrNumber && !UTR_RE.test(r.utrNumber)) e.utrNumber = 'UTR is 12–22 letters / digits'
  if (r.paymentDate && Number.isNaN(Date.parse(r.paymentDate))) e.paymentDate = 'Pick a valid date'
  if (r.paymentStatus === 'Done' && !r.paidAmount) e.paidAmount = 'Paid Amount is expected when GST Payment Status is Done'
  if (r.paidAmount && r.netAmount && Number(r.paidAmount) > Number(r.netAmount)) e.paidAmount = 'Paid Amount is more than Net Amount'
  if (r.month && !r.fYear) e.fYear = 'Select the financial year for this month'
  if (isNew && !r.siteId && !r.atmId && !r.invoiceNumber && !r.franchiseeName) e.form = 'Enter at least a Site ID, ATM Id, Franchisee Name or Invoice Number.'
  return e
}

export default function GstRecordPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const allGst = gstStore.use()

  const isNew = id === 'new'
  const existing = isNew ? undefined : getGst(id)
  const [editing, setEditing] = useState(isNew || params.get('edit') === '1')
  const [form, setForm] = useState<GstRecord>(() => existing ?? emptyGst('26-27'))
  const [errors, setErrors] = useState<Errors>({})

  if (!isNew && !existing) return <Navigate to="/finance/gst" replace />
  const rec = editing ? form : existing!
  const ro = !editing

  const set = <K extends keyof GstRecord>(k: K, v: GstRecord[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const save = () => {
    const clean: GstRecord = {
      ...form,
      gstNumber: form.gstNumber.trim().toUpperCase(),
      utrNumber: form.utrNumber.trim().toUpperCase(),
    }
    const e = validate(clean, isNew)
    setErrors(e)
    if (Object.values(e).some(Boolean)) return toast('Fix highlighted fields before saving', 'info')
    const saved = saveGst(clean)
    toast(isNew ? `GST record ${saved.id} created` : `GST record ${saved.id} saved`)
    setEditing(false)
    setForm(saved)
    if (isNew) navigate(`/finance/gst/${saved.id}`, { replace: true })
  }

  const saveDraft = () => {
    const clean: GstRecord = {
      ...form,
      gstNumber: form.gstNumber.trim().toUpperCase(),
      utrNumber: form.utrNumber.trim().toUpperCase(),
    }
    const saved = saveGst(clean)
    toast(`Draft ${saved.id} saved`)
    setForm(saved)
  }

  const cancel = () => {
    if (isNew) return navigate('/finance/gst')
    setForm(existing!)
    setErrors({})
    setEditing(false)
  }

  // Derived calculations for Payout & Tax Calculation card
  const totalInv = numOr0(rec.invoiceAmount)
  const basicAmount = totalInv > 0 ? (totalInv / 1.18).toFixed(2) : '0.00'
  const totalTax = totalInv > 0 ? (totalInv - Number(basicAmount)).toFixed(2) : '0.00'
  const cgst9 = totalInv > 0 ? (Number(totalTax) / 2).toFixed(2) : '0.00'
  const sgst9 = totalInv > 0 ? (Number(totalTax) / 2).toFixed(2) : '0.00'

  // Derived state code & PAN from GSTIN
  const gstinClean = rec.gstNumber.trim().toUpperCase()
  const stateCodeDerived = gstinClean.length >= 2 ? gstinClean.slice(0, 2) : '09'
  const panDerived = gstinClean.length >= 12 ? gstinClean.slice(2, 12) : '—'

  // KPI calculations from gstStore
  const pendingFranchise = allGst.filter((g) => g.invoiceStatus === 'Pending at FR End').length
  const pendingTeam = allGst.filter((g) => g.invoiceStatus === 'Pending at Hitachi End').length
  const paymentPending = allGst.filter((g) => g.paymentStatus === 'Pending').length
  const reconciled = allGst.filter((g) => g.paymentStatus === 'Done').length

  const autoFillNet = () => {
    const net = calcNet(form)
    set('netAmount', String(net))
    toast(`Net amount calculated: ₹${net.toLocaleString('en-IN')}`, 'info')
  }

  return (
    <div className="space-y-5 pb-12">
      {/* ── Top Header Banner (Matching Image) ────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#14213d] text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-4 z-10">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-white backdrop-blur-sm border border-white/15 shadow-inner">
              <FileText size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">GST Invoice Management</h1>
                {rec.id && (
                  <span className="rounded-md bg-white/15 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-blue-200">
                    {rec.id}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[13px] text-blue-200/80">Franchise GST Invoice &amp; Payout Reconciliation</p>
            </div>
          </div>

          <div className="flex items-center gap-3 z-10">
            <Link
              to="/finance/gst"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-white/20 transition-colors border border-white/15"
            >
              <ArrowLeft size={14} /> Back to GST List
            </Link>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 py-1.5 text-[12px] font-semibold text-white shadow-xs hover:bg-blue-600 transition-colors"
              >
                <Pencil size={13} /> Edit Record
              </button>
            )}
            {/* Dexter Branding Tag */}
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 border border-white/15">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold tracking-wider">DEXTER INDIA</span>
            </div>
          </div>
        </div>

        {/* Decorative graphic curve */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-96 bg-gradient-to-l from-blue-600/30 via-red-600/20 to-transparent" />
      </div>

      {/* ── KPI Summary Cards (Matching Image) ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Pending at Franchise */}
        <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500 text-white shadow-xs">
              <FileText size={22} />
            </div>
            <div>
              <div className="text-[12px] font-medium text-muted">Pending at Franchise</div>
              <div className="text-2xl font-bold tracking-tight text-ink">{pendingFranchise}</div>
            </div>
          </div>
          <Link to="/finance/gst" className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted hover:bg-line-soft hover:text-ink">
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* 2. Pending at Team */}
        <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#2563eb] text-white shadow-xs">
              <Users size={22} />
            </div>
            <div>
              <div className="text-[12px] font-medium text-muted">Pending at Team</div>
              <div className="text-2xl font-bold tracking-tight text-ink">{pendingTeam}</div>
            </div>
          </div>
          <Link to="/finance/gst" className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted hover:bg-line-soft hover:text-ink">
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* 3. Payment Pending */}
        <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-red-500 text-white shadow-xs">
              <Coins size={22} />
            </div>
            <div>
              <div className="text-[12px] font-medium text-muted">Payment Pending</div>
              <div className="text-2xl font-bold tracking-tight text-ink">{paymentPending}</div>
            </div>
          </div>
          <Link to="/finance/gst" className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted hover:bg-line-soft hover:text-ink">
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* 4. Reconciled */}
        <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#009b73] text-white shadow-xs">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div className="text-[12px] font-medium text-muted">Reconciled</div>
              <div className="text-2xl font-bold tracking-tight text-ink">{reconciled}</div>
            </div>
          </div>
          <Link to="/finance/gst" className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted hover:bg-line-soft hover:text-ink">
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── Main GST Invoice Entry Container (Matching Image) ─────────── */}
      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs">
        {/* Container Top Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <FileText size={20} className="text-[#2563eb]" />
            <h2 className="text-lg font-bold text-ink tracking-tight">
              {isNew ? 'GST Invoice Entry' : editing ? `Edit GST Record · ${rec.id}` : `GST Record · ${rec.id}`}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:bg-surface transition-colors shadow-2xs"
            >
              <Printer size={14} className="text-[#2563eb]" /> View Invoice Template
            </button>
          </div>
        </div>

        {errors.form && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-brand-red font-medium">
            {errors.form}
          </div>
        )}

        {/* ── 4 Form Cards in 2x2 Grid Layout (Matching Image) ────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ── CARD 1: 1. Franchise & Period Details ────────────────── */}
          <div className="rounded-xl border border-line bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#14213d] border-b border-line/60 pb-2.5">
                <FileText size={16} className="text-[#2563eb]" />
                <span>1. Franchise &amp; Period Details</span>
                {rec.sn && (
                  <span className="ml-auto rounded-md bg-surface border border-line px-2 py-0.5 text-[10px] font-semibold text-muted">
                    S.N. #{rec.sn}
                  </span>
                )}
              </div>

              {/* Row 1: Financial Year, Month, Site ID, ATM ID */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Financial Year */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1">
                    Financial Year <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <select
                      disabled={ro}
                      value={rec.fYear}
                      onChange={(e) => set('fYear', e.target.value)}
                      className={cn(
                        'h-9 w-full appearance-none rounded-lg border bg-white px-2.5 pr-7 text-[12.5px] outline-none transition-colors',
                        errors.fYear ? 'border-brand-red ring-1 ring-brand-red/20' : 'border-line focus:border-[#2563eb]',
                        ro && 'bg-surface text-muted cursor-not-allowed',
                      )}
                    >
                      <option value="">Select FY</option>
                      {FIN_YEARS.map((y) => (
                        <option key={y} value={y}>
                          20{y}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2.5 text-muted" />
                  </div>
                  {errors.fYear && <p className="mt-0.5 text-[10.5px] text-brand-red">{errors.fYear}</p>}
                </div>

                {/* Month */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1">
                    Month <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <select
                      disabled={ro}
                      value={rec.month}
                      onChange={(e) => set('month', e.target.value)}
                      className="h-9 w-full appearance-none rounded-lg border border-line bg-white px-2.5 pr-7 text-[12.5px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                    >
                      <option value="">Select month</option>
                      {FY_MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2.5 text-muted" />
                  </div>
                </div>

                {/* Site ID */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1">
                    Site ID <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <input
                      disabled={ro}
                      value={rec.siteId}
                      onChange={(e) => set('siteId', e.target.value.toUpperCase())}
                      placeholder="e.g. 201"
                      className="h-9 w-full rounded-lg border border-line bg-white px-2.5 pr-7 text-[12.5px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                    />
                    <Search size={13} className="pointer-events-none absolute right-2 top-2.5 text-muted" />
                  </div>
                </div>

                {/* ATM ID */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1">
                    ATM ID <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <input
                      disabled={ro}
                      value={rec.atmId}
                      onChange={(e) => set('atmId', e.target.value.toUpperCase())}
                      placeholder="e.g. ATM12345"
                      className="h-9 w-full rounded-lg border border-line bg-white px-2.5 pr-7 text-[12.5px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                    />
                    <Search size={13} className="pointer-events-none absolute right-2 top-2.5 text-muted" />
                  </div>
                </div>
              </div>

              {/* Row 2: SAP Code, Franchisee Name, Contact No. */}
              <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1">SAP Code</label>
                  <input
                    disabled={ro}
                    value={rec.sapCode}
                    onChange={(e) => set('sapCode', e.target.value)}
                    placeholder="e.g. SAP001256"
                    className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1">
                    Franchisee Name <span className="text-brand-red">*</span>
                  </label>
                  <input
                    disabled={ro}
                    value={rec.franchiseeName}
                    onChange={(e) => set('franchiseeName', e.target.value)}
                    placeholder="e.g. ABC Pvt. Ltd."
                    className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1">Contact No.</label>
                  <input
                    disabled={ro}
                    maxLength={10}
                    inputMode="tel"
                    value={rec.contactNo}
                    onChange={(e) => set('contactNo', e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile"
                    className={cn(
                      'h-9 w-full rounded-lg border bg-white px-2.5 text-[12.5px] outline-none transition-colors',
                      errors.contactNo ? 'border-brand-red ring-1 ring-brand-red/20' : 'border-line focus:border-[#2563eb]',
                      ro && 'bg-surface text-muted cursor-not-allowed',
                    )}
                  />
                  {errors.contactNo && <p className="mt-0.5 text-[10.5px] text-brand-red">{errors.contactNo}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* ── CARD 2: 2. GST Registration Details ────────────────── */}
          <div className="rounded-xl border border-line bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#14213d] border-b border-line/60 pb-2.5">
                <Landmark size={16} className="text-[#2563eb]" />
                <span>2. GST Registration Details</span>
              </div>

              {/* Row 1: GSTIN/UIN and State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1">
                    GSTIN/UIN <span className="text-brand-red">*</span>
                  </label>
                  <input
                    disabled={ro}
                    maxLength={15}
                    value={rec.gstNumber}
                    onChange={(e) => set('gstNumber', e.target.value.toUpperCase())}
                    placeholder="e.g. 09AABC134522J1ZE"
                    className={cn(
                      'h-9 w-full font-mono rounded-lg border bg-white px-2.5 text-[12.5px] outline-none uppercase transition-colors',
                      errors.gstNumber ? 'border-brand-red ring-1 ring-brand-red/20' : 'border-line focus:border-[#2563eb]',
                      ro && 'bg-surface text-muted cursor-not-allowed',
                    )}
                  />
                  {errors.gstNumber && <p className="mt-0.5 text-[10.5px] text-brand-red">{errors.gstNumber}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1">
                    State <span className="text-brand-red">*</span>
                  </label>
                  <input
                    disabled={ro}
                    value={rec.locationName ? rec.locationName.split(',').pop()?.trim() || rec.locationName : 'Uttar Pradesh'}
                    onChange={(e) => set('locationName', e.target.value)}
                    placeholder="Enter state"
                    className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                  />
                </div>
              </div>

              {/* Row 2: Address (As per GST) + State Code / PAN */}
              <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-ink mb-1">Address (As per GST)</label>
                  <textarea
                    rows={2}
                    disabled={ro}
                    value={rec.locationName}
                    onChange={(e) => set('locationName', e.target.value)}
                    placeholder="Shop No. 1st Surajpur, Greater Noida, Uttar Pradesh - 201306"
                    className="w-full rounded-lg border border-line bg-white p-2 text-[12.5px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-muted mb-0.5">State Code</label>
                    <div className="h-7 w-full rounded border border-line bg-surface/70 px-2 flex items-center font-mono text-[12px] text-ink">
                      {stateCodeDerived}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-muted mb-0.5">PAN / IT No.</label>
                    <div className="h-7 w-full rounded border border-line bg-surface/70 px-2 flex items-center font-mono text-[12px] text-ink truncate">
                      {panDerived}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── CARD 3: 3. Payout & Tax Calculation ────────────────── */}
          <div className="rounded-xl border border-line bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#14213d] border-b border-line/60 pb-2.5">
                <Calculator size={16} className="text-[#2563eb]" />
                <span>3. Payout &amp; Tax Calculation</span>
              </div>

              {/* Invoice Number & Invoice Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1">
                    Invoice Number <span className="text-brand-red">*</span>
                  </label>
                  <input
                    disabled={ro}
                    value={rec.invoiceNumber}
                    onChange={(e) => set('invoiceNumber', e.target.value)}
                    placeholder="e.g. GST/26-27/00125"
                    className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1">
                    Invoice Date <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={ro ? 'text' : 'date'}
                      disabled={ro}
                      value={ro ? dmy(rec.paymentDate) : rec.paymentDate}
                      onChange={(e) => set('paymentDate', e.target.value)}
                      placeholder="DD-MM-YYYY"
                      className="h-9 w-full rounded-lg border border-line bg-white px-2.5 pr-7 text-[12.5px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                    />
                    <Calendar size={14} className="pointer-events-none absolute right-2.5 top-2.5 text-muted" />
                  </div>
                </div>
              </div>

              {/* Breakdown fields */}
              <div className="mt-3.5 space-y-2.5 text-[12.5px]">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-ink font-medium">Basic Amount (₹) *</span>
                  <div className="h-8 w-44 rounded border border-line bg-surface/70 px-2.5 flex items-center justify-end font-mono text-ink">
                    ₹{Number(basicAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted">CGST @ 9% (₹)</span>
                  <div className="h-8 w-44 rounded border border-line bg-surface/70 px-2.5 flex items-center justify-end font-mono text-muted">
                    ₹{Number(cgst9).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted">SGST / IGST @ 9% (₹)</span>
                  <div className="h-8 w-44 rounded border border-line bg-surface/70 px-2.5 flex items-center justify-end font-mono text-muted">
                    ₹{Number(sgst9).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted">Round Off (₹)</span>
                  <div className="h-8 w-44 rounded border border-line bg-surface/70 px-2.5 flex items-center justify-end font-mono text-muted">
                    0.00
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Highlighted Blue Bar: Invoice Amount (₹) */}
            <div className="mt-4 rounded-xl border border-blue-200 bg-[#edf4ff] p-3 flex items-center justify-between">
              <span className="font-bold text-[#1e40af] text-[13px]">Invoice Amount (₹)</span>
              {ro ? (
                <span className="font-mono font-bold text-base text-[#1e40af]">
                  ₹{numOr0(rec.invoiceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#1e40af] font-bold">₹</span>
                  <input
                    value={rec.invoiceAmount}
                    onChange={(e) => set('invoiceAmount', e.target.value.replace(/[,₹\s]/g, ''))}
                    placeholder="59000.00"
                    className="h-8 w-36 rounded-lg border border-blue-300 bg-white px-2.5 text-right font-mono font-bold text-[13px] text-ink outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── CARD 4: 4. Deductions & Payment Details ─────────────── */}
          <div className="rounded-xl border border-line bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#14213d] border-b border-line/60 pb-2.5">
                <Wallet size={16} className="text-[#2563eb]" />
                <span>4. Deductions &amp; Payment Details</span>
              </div>

              {/* Deductions 2-column list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-[12.5px]">
                {/* TDS vs Paid Amount */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted truncate">TDS (₹)</span>
                  <input
                    disabled={ro}
                    value={rec.tds}
                    onChange={(e) => set('tds', e.target.value.replace(/[,₹\s]/g, ''))}
                    placeholder="0.00"
                    className="h-8 w-28 text-right font-mono rounded border border-line bg-white px-2 text-[12px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted truncate font-medium">Paid Amount (₹)</span>
                  <input
                    disabled={ro}
                    value={rec.paidAmount}
                    onChange={(e) => set('paidAmount', e.target.value.replace(/[,₹\s]/g, ''))}
                    placeholder="0.00"
                    className="h-8 w-28 text-right font-mono rounded border border-line bg-white px-2 text-[12px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                  />
                </div>

                {/* Cash Shortage vs Payment Date */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted truncate">Cash Shortage (₹)</span>
                  <input
                    disabled={ro}
                    value={rec.cashShortageDeduction}
                    onChange={(e) => set('cashShortageDeduction', e.target.value.replace(/[,₹\s]/g, ''))}
                    placeholder="0.00"
                    className="h-8 w-28 text-right font-mono rounded border border-line bg-white px-2 text-[12px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted truncate font-medium">Payment Date</span>
                  <input
                    type={ro ? 'text' : 'date'}
                    disabled={ro}
                    value={ro ? dmy(rec.paymentDate) : rec.paymentDate}
                    onChange={(e) => set('paymentDate', e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="h-8 w-28 text-right font-mono rounded border border-line bg-white px-1.5 text-[11px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                  />
                </div>

                {/* Dispute Deduction vs UTR Number */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted truncate">Dispute Deduction (₹)</span>
                  <input
                    disabled={ro}
                    value={rec.disputeDeduction}
                    onChange={(e) => set('disputeDeduction', e.target.value.replace(/[,₹\s]/g, ''))}
                    placeholder="0.00"
                    className="h-8 w-28 text-right font-mono rounded border border-line bg-white px-2 text-[12px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted truncate font-medium">UTR Number</span>
                  <input
                    disabled={ro}
                    value={rec.utrNumber}
                    onChange={(e) => set('utrNumber', e.target.value.toUpperCase())}
                    placeholder="Enter UTR"
                    className="h-8 w-28 text-right font-mono rounded border border-line bg-white px-2 text-[11px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                  />
                </div>

                {/* Chargeback Deduction vs GST Invoice Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted truncate">Chargeback Deduction (₹)</span>
                  <input
                    disabled={ro}
                    value={rec.chargebackDeduction}
                    onChange={(e) => set('chargebackDeduction', e.target.value.replace(/[,₹\s]/g, ''))}
                    placeholder="0.00"
                    className="h-8 w-28 text-right font-mono rounded border border-line bg-white px-2 text-[12px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted truncate font-medium">GST Invoice Status</span>
                  <div className="relative w-28">
                    <select
                      disabled={ro}
                      value={rec.invoiceStatus}
                      onChange={(e) => set('invoiceStatus', e.target.value as GstRecord['invoiceStatus'])}
                      className="h-8 w-full appearance-none rounded border border-line bg-white px-2 pr-6 text-[11px] font-medium outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                    >
                      <option value="">Select</option>
                      {GST_INVOICE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="pointer-events-none absolute right-1.5 top-2.5 text-muted" />
                  </div>
                </div>

                {/* GST Related Deduction vs GST Payment Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted truncate">GST Related Deduction (₹)</span>
                  <input
                    disabled={ro}
                    value={rec.gstRelatedDeduction}
                    onChange={(e) => set('gstRelatedDeduction', e.target.value.replace(/[,₹\s]/g, ''))}
                    placeholder="0.00"
                    className="h-8 w-28 text-right font-mono rounded border border-line bg-white px-2 text-[12px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted truncate font-medium">GST Payment Status</span>
                  <div className="relative w-28">
                    <select
                      disabled={ro}
                      value={rec.paymentStatus}
                      onChange={(e) => set('paymentStatus', e.target.value as GstRecord['paymentStatus'])}
                      className="h-8 w-full appearance-none rounded border border-line bg-white px-2 pr-6 text-[11px] font-medium outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                    >
                      <option value="">Select</option>
                      {GST_PAYMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="pointer-events-none absolute right-1.5 top-2.5 text-muted" />
                  </div>
                </div>
              </div>

              {/* Remark */}
              <div className="mt-3">
                <input
                  disabled={ro}
                  value={rec.remark}
                  onChange={(e) => set('remark', e.target.value)}
                  placeholder="Enter remarks or settlement notes"
                  className="h-8 w-full rounded border border-line bg-white px-2.5 text-[12px] outline-none focus:border-[#2563eb] disabled:bg-surface disabled:text-muted"
                />
              </div>
            </div>

            {/* Bottom Highlighted Blue Bar: Net Amount (₹) */}
            <div className="mt-4 rounded-xl border border-blue-200 bg-[#edf4ff] p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1e40af] text-[13px]">Net Amount (₹)</span>
                {!ro && (
                  <button
                    type="button"
                    onClick={autoFillNet}
                    className="rounded bg-blue-100 hover:bg-blue-200 px-2 py-0.5 text-[10.5px] font-semibold text-[#1e40af] transition-colors"
                  >
                    Auto-calc
                  </button>
                )}
              </div>
              {ro ? (
                <span className="font-mono font-bold text-base text-[#1e40af]">
                  ₹{numOr0(rec.netAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#1e40af] font-bold">₹</span>
                  <input
                    value={rec.netAmount}
                    onChange={(e) => set('netAmount', e.target.value.replace(/[,₹\s]/g, ''))}
                    placeholder="59000.00"
                    className="h-8 w-36 rounded-lg border border-blue-300 bg-white px-2.5 text-right font-mono font-bold text-[13px] text-ink outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Form Actions Bar (Matching Image) ─────────────────────── */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-line">
          <Button variant="secondary" onClick={cancel}>
            Cancel
          </Button>

          {editing && (
            <button
              type="button"
              onClick={saveDraft}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2563eb] bg-white px-4 py-2 text-xs font-semibold text-[#2563eb] hover:bg-blue-50 transition-colors shadow-2xs"
            >
              <Save size={14} /> Save Draft
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              window.print()
              toast('Invoice template sent to print', 'info')
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors shadow-xs"
          >
            <FileText size={14} /> Generate Invoice PDF
          </button>

          {editing && (
            <button
              type="button"
              onClick={save}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#009b73] hover:bg-[#008764] px-5 py-2 text-xs font-semibold text-white transition-colors shadow-xs"
            >
              <Send size={14} /> {isNew ? 'Create Record' : 'Submit for Review'}
            </button>
          )}
        </div>
      </div>

      {/* ── Bottom Section: GST Invoice List (Matching Reference Image) ── */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#2563eb]" />
            <h3 className="text-base font-bold text-ink">GST Invoice List</h3>
            <span className="rounded-full bg-surface border border-line px-2 py-0.5 text-[11px] font-semibold text-muted">
              {allGst.length} Records
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/finance/gst"
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface transition-colors"
            >
              <Filter size={13} /> Filter
            </Link>
            <Link
              to="/finance/gst"
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface transition-colors"
            >
              <Download size={13} /> Export
            </Link>
          </div>
        </div>

        {/* Table matching reference image */}
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[900px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-line bg-surface text-left text-[11px] font-bold text-muted">
                <th className="px-3 py-2.5 w-12 text-center">S.N.</th>
                <th className="px-3 py-2.5">F. Year</th>
                <th className="px-3 py-2.5">Month</th>
                <th className="px-3 py-2.5">Site ID</th>
                <th className="px-3 py-2.5">Franchisee Name</th>
                <th className="px-3 py-2.5">GSTIN</th>
                <th className="px-3 py-2.5 text-right">Invoice Amount (₹)</th>
                <th className="px-3 py-2.5 text-right">Net Amount (₹)</th>
                <th className="px-3 py-2.5">GST Invoice Status</th>
                <th className="px-3 py-2.5">GST Payment Status</th>
                <th className="px-3 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {allGst.slice(0, 5).map((g) => (
                <tr key={g.id} className={cn('hover:bg-surface/50 transition-colors', g.id === rec.id && 'bg-blue-50/40')}>
                  <td className="px-3 py-2 text-center font-medium text-muted">{g.sn}</td>
                  <td className="px-3 py-2 font-medium">{g.fYear ? `20${g.fYear}` : '—'}</td>
                  <td className="px-3 py-2">{g.month || '—'}</td>
                  <td className="px-3 py-2 font-mono text-[11.5px]">{g.siteId || '—'}</td>
                  <td className="px-3 py-2 font-medium text-ink">{g.franchiseeName || '—'}</td>
                  <td className="px-3 py-2 font-mono text-[11.5px]">{g.gstNumber || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono font-medium">{rupee(g.invoiceAmount)}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-[#1e40af]">{rupee(g.netAmount)}</td>
                  <td className="px-3 py-2">
                    {g.invoiceStatus ? <Badge tone={invoiceTone(g.invoiceStatus)}>{g.invoiceStatus}</Badge> : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {g.paymentStatus ? (
                      <Badge tone={g.paymentStatus === 'Done' ? 'green' : 'amber'}>{g.paymentStatus}</Badge>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Link
                      to={`/finance/gst/${g.id}?edit=1`}
                      className="inline-grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-surface hover:text-[#2563eb] transition-colors"
                      title="Edit this record"
                    >
                      <Pencil size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
