import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { dmy } from '@/data/cbrSites'
import {
  AMOUNT_KEYS,
  FIN_YEARS,
  FY_MONTHS,
  GSTIN_RE,
  GST_INVOICE_STATUSES,
  GST_PAYMENT_STATUSES,
  GST_SECTIONS,
  MOBILE_RE,
  UTR_RE,
  emptyGst,
  getGst,
  gstStore,
  gstViewStore,
  saveGst,
  type GstRecord,
} from '@/data/financeGst'
import { Err, FLabel, InfoBanner, LockedInput, RadioCards, RecordFooter, RecordSection, TInput } from './shared'

type Errors = Partial<Record<keyof GstRecord | 'form', string>>

function validate(r: GstRecord, isNew: boolean): Errors {
  const e: Errors = {}
  for (const k of AMOUNT_KEYS) {
    const v = String(r[k]).trim()
    if (v === '') continue
    if (!/^\d+(\.\d{1,2})?$/.test(v)) e[k] = Number(v) < 0 ? 'Amount cannot be negative' : 'Enter a number (up to 2 decimals)'
  }
  if (r.gstNumber && !GSTIN_RE.test(r.gstNumber)) e.gstNumber = '15 characters, e.g. 27AAKFS4821K1Z6'
  if (r.contactNo && !MOBILE_RE.test(r.contactNo)) e.contactNo = 'Enter a 10-digit mobile number'
  if (r.utrNumber && !UTR_RE.test(r.utrNumber)) e.utrNumber = 'UTR is 12–22 letters / digits'
  if (r.paymentDate && Number.isNaN(Date.parse(r.paymentDate))) e.paymentDate = 'Pick a valid date'
  if (r.paymentStatus === 'Done' && !r.paidAmount) e.paidAmount = 'Paid Amount is expected when GST Payment Status is Done'
  if (r.paidAmount && r.netAmount && Number(r.paidAmount) > Number(r.netAmount)) e.paidAmount = 'Paid Amount is more than Net Amount'
  if (r.month && !r.fYear) e.fYear = 'Select the financial year for this month'
  if (isNew && !r.siteId && !r.atmId && !r.invoiceNumber && !r.franchiseeName) e.form = 'Enter at least a Site ID, ATM Id, Franchisee Name or Invoice Number.'
  return e
}

const PLACEHOLDER: Partial<Record<keyof GstRecord, string>> = {
  siteId: 'Enter site ID',
  atmId: 'Enter ATM ID',
  sapCode: 'Enter SAP code',
  franchiseeName: 'Enter franchisee name',
  contactNo: 'Enter contact number',
  locationName: 'Enter location name',
  gstNumber: 'Enter GST number',
  invoiceNumber: 'Enter invoice number',
  utrNumber: 'Enter UTR number',
}
const UPPER = new Set<keyof GstRecord>(['siteId', 'atmId', 'gstNumber', 'utrNumber'])

function SelectBox({
  label,
  name,
  value,
  options,
  placeholder,
  readOnly,
  onChange,
  error,
  fmt = (o: string) => o,
}: {
  label: string
  name: string
  value: string
  options: readonly string[]
  placeholder: string
  readOnly: boolean
  onChange: (v: string) => void
  error?: string
  fmt?: (o: string) => string
}) {
  return (
    <div className="min-w-0">
      <FLabel label={label} htmlFor={name} />
      {readOnly ? (
        <div className="flex h-10 items-center rounded-md border border-line bg-surface/60 px-3 text-[13px]">{value ? fmt(value) : <span className="text-muted">—</span>}</div>
      ) : (
        <div className="relative">
          <select
            id={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'h-10 w-full appearance-none rounded-md border bg-white pr-9 pl-3 text-[13px] outline-none focus:border-primary',
              !value && 'text-muted',
              error ? 'border-brand-red' : 'border-line',
            )}
          >
            <option value="">{placeholder}</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {fmt(o)}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-2" />
        </div>
      )}
      <Err msg={error} />
    </div>
  )
}

export default function GstRecordPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  gstStore.use()
  const view = gstViewStore.use()
  const isNew = id === 'new'
  const existing = isNew ? undefined : getGst(id)
  const [editing, setEditing] = useState(isNew || params.get('edit') === '1')
  const [form, setForm] = useState<GstRecord>(() => existing ?? emptyGst(''))
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
    if (Object.values(e).some(Boolean)) return toast('Fix the highlighted fields before saving', 'info')
    const saved = saveGst(clean)
    toast(isNew ? `GST record ${saved.id} created` : `GST record ${saved.id} saved`)
    setEditing(false)
    setForm(saved)
    if (isNew) navigate(`/finance/gst/${saved.id}`, { replace: true })
  }

  const cancel = () => {
    if (isNew) return navigate('/finance/gst')
    setForm(existing!)
    setErrors({})
    setEditing(false)
  }

  const control = (k: keyof GstRecord, label: string) => {
    const v = String(rec[k] ?? '')
    switch (k) {
      case 'sn':
        return <LockedInput key={k} label={label} value={isNew ? '' : String(rec.sn)} />
      case 'fYear':
        return (
          <SelectBox
            key={k}
            label={label}
            name={k}
            value={v}
            options={FIN_YEARS}
            placeholder="Select financial year"
            readOnly={ro}
            onChange={(x) => set('fYear', x)}
            error={errors.fYear}
            fmt={(o) => `F.Y. ${o}`}
          />
        )
      case 'month':
        return <SelectBox key={k} label={label} name={k} value={v} options={FY_MONTHS} placeholder="Select month" readOnly={ro} onChange={(x) => set('month', x)} />
      case 'contactNo':
        return (
          <TInput
            key={k}
            label={label}
            name={k}
            value={v}
            readOnly={ro}
            inputMode="numeric"
            maxLength={10}
            placeholder={PLACEHOLDER[k]}
            onChange={(x) => set('contactNo', x.replace(/\D/g, ''))}
            error={errors.contactNo}
          />
        )
      case 'paymentDate':
        return (
          <TInput
            key={k}
            label={label}
            name={k}
            type={ro ? 'text' : 'date'}
            value={ro ? dmy(v) : v}
            readOnly={ro}
            placeholder="DD / MM / YYYY"
            onChange={(x) => set('paymentDate', x)}
            error={errors.paymentDate}
          />
        )
      case 'invoiceStatus':
        return <RadioCards key={k} label={label} value={v} options={GST_INVOICE_STATUSES} readOnly={ro} onChange={(x) => set('invoiceStatus', x as GstRecord['invoiceStatus'])} />
      case 'paymentStatus':
        return <RadioCards key={k} label={label} value={v} options={GST_PAYMENT_STATUSES} readOnly={ro} onChange={(x) => set('paymentStatus', x as GstRecord['paymentStatus'])} />
      case 'remark':
        return (
          <div key={k} className="sm:col-span-2 lg:col-span-3">
            <FLabel label={label} htmlFor="remark" />
            <textarea
              id="remark"
              rows={3}
              value={v}
              readOnly={ro}
              placeholder={ro ? '—' : 'Enter a remark'}
              onChange={(e) => set('remark', e.target.value)}
              className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-[13px] outline-none placeholder:text-muted/70 focus:border-primary read-only:bg-surface/60"
            />
          </div>
        )
      default:
        if (AMOUNT_KEYS.includes(k))
          return (
            <TInput
              key={k}
              label={label}
              name={k}
              prefix="₹"
              inputMode="decimal"
              value={v}
              readOnly={ro}
              placeholder="Enter amount"
              onChange={(x) => set(k, x.replace(/[,₹\s]/g, '') as never)}
              error={errors[k]}
            />
          )
        return (
          <TInput
            key={k}
            label={label}
            name={k}
            value={v}
            readOnly={ro}
            mono={k === 'gstNumber' || k === 'utrNumber'}
            maxLength={k === 'gstNumber' ? 15 : k === 'utrNumber' ? 22 : undefined}
            placeholder={PLACEHOLDER[k]}
            onChange={(x) => set(k, (UPPER.has(k) ? x.toUpperCase() : x) as never)}
            error={errors[k]}
          />
        )
    }
  }

  const ctxMonth = view.mode === 'Yearly' || !view.month ? 'All months' : view.month
  const updated = rec.updatedAt ? `Last updated ${new Date(rec.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} by ${rec.updatedBy}` : ''

  return (
    <div className="max-w-[1280px]">
      <Link to="/finance/gst" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
        <ArrowLeft size={15} /> Back to GST details
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{isNew ? 'New GST Record' : editing ? 'Edit GST Record' : 'GST Record'}</h1>
          {editing && <p className="mt-1 text-[14px] text-muted">Edit the supplied franchise GST invoice, deduction and payment fields.</p>}
        </div>
        {editing ? (
          <div className="text-right">
            <div className="text-[11px] text-muted">Report context</div>
            <div className="text-[14px] font-semibold text-primary">
              {view.mode} · F.Y. {view.fy}
            </div>
            <div className="text-[11px] text-muted">{ctxMonth}</div>
          </div>
        ) : (
          <Button
            icon={<Pencil size={16} />}
            onClick={() => {
              setForm(existing!)
              setEditing(true)
            }}
          >
            Edit record
          </Button>
        )}
      </div>

      <InfoBanner title={isNew ? 'Blank template · Edit layout' : `${rec.id} · ${editing ? 'Edit layout' : 'View layout'}`}>
        {isNew
          ? `No verified transaction is selected. All record values and statuses are unspecified; F.Y. ${view.fy} is report context only, not the record's F. Year.`
          : `Leave fields blank where no verified information has been supplied. F.Y. ${view.fy} is report context only, not the record's F. Year${rec.fYear ? ` (F.Y. ${rec.fYear})` : ''}.`}
      </InfoBanner>
      {errors.form && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-brand-red">{errors.form}</div>}

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {GST_SECTIONS.map((s) => (
          <RecordSection key={s.title} title={s.title} sub={s.sub} count={s.fields.length}>
            {s.fields.map((f) =>
              f.key === 'invoiceStatus' ? (
                <div key="statuses" className="grid gap-6 sm:col-span-2 lg:col-span-3 lg:grid-cols-2">
                  {control('invoiceStatus', 'GST Invoice Status')}
                  {control('paymentStatus', 'GST Payment Status')}
                </div>
              ) : f.key === 'paymentStatus' ? null : (
                control(f.key, f.label)
              ),
            )}
          </RecordSection>
        ))}
        <RecordFooter title={`24 source fields · ${isNew ? 'Blank record format' : 'Record format'}`} sub={isNew ? 'No transaction values have been prefilled.' : updated}>
          {editing && (
            <>
              <Button variant="secondary" onClick={cancel}>
                Cancel
              </Button>
              <Button onClick={save}>{isNew ? 'Create record' : 'Save changes'}</Button>
            </>
          )}
        </RecordFooter>
      </div>
    </div>
  )
}
