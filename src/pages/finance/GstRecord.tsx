import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Calculator, Info, Pencil, Save } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RadioGroup, SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { dmy, rupee } from '@/data/cbrSites'
import {
  AMOUNT_KEYS, FIN_YEARS, FY_MONTHS, GSTIN_RE, GST_INVOICE_STATUSES, GST_PAYMENT_STATUSES, GST_SECTIONS, MOBILE_RE, UTR_RE,
  calcNet, emptyGst, getGst, gstStore, gstViewStore, saveGst, type GstRecord,
} from '@/data/financeGst'
import { ClearLink, FormCard, ReadField } from './shared'
import { invoiceTone } from './GstList'

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

function display(r: GstRecord, key: keyof GstRecord) {
  const v = r[key]
  if (key === 'sn') return String(v)
  if (key === 'fYear') return v ? `F.Y. ${v}` : ''
  if (key === 'paymentDate') return dmy(String(v))
  if (AMOUNT_KEYS.includes(key)) return rupee(String(v))
  if (key === 'invoiceStatus') return v ? <Badge tone={invoiceTone(String(v))}>{String(v)}</Badge> : ''
  if (key === 'paymentStatus') return v ? <Badge tone={v === 'Done' ? 'green' : 'amber'}>{String(v)}</Badge> : ''
  return String(v ?? '')
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
  const [form, setForm] = useState<GstRecord>(() => existing ?? emptyGst(view.fy))
  const [errors, setErrors] = useState<Errors>({})

  if (!isNew && !existing) return <Navigate to="/finance/gst" replace />
  const rec = editing ? form : existing!

  const set = <K extends keyof GstRecord>(k: K, v: GstRecord[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const calculated = calcNet(form)
  const netMismatch = form.netAmount !== '' && Number(form.netAmount) !== calculated

  const save = () => {
    const clean: GstRecord = { ...form, gstNumber: form.gstNumber.trim().toUpperCase(), utrNumber: form.utrNumber.trim().toUpperCase() }
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

  const amountField = (k: keyof GstRecord, label: string) => (
    <TextField
      key={k}
      label={label}
      name={k}
      inputMode="decimal"
      placeholder="Enter amount"
      value={String(form[k])}
      onChange={(e) => set(k, e.target.value.replace(/[,₹\s]/g, '') as never)}
      error={errors[k]}
    />
  )

  const editControl = (k: keyof GstRecord, label: string) => {
    switch (k) {
      case 'sn':
        return <ReadField key={k} label={label}>{isNew ? <span className="text-muted">System-assigned</span> : String(form.sn)}</ReadField>
      case 'fYear':
        return <SelectField key={k} label={label} name={k} placeholder="Select financial year" options={[...FIN_YEARS]} value={form.fYear} onChange={(e) => set('fYear', e.target.value)} error={errors.fYear} />
      case 'month':
        return <SelectField key={k} label={label} name={k} placeholder="Select month" options={[...FY_MONTHS]} value={form.month} onChange={(e) => set('month', e.target.value)} />
      case 'gstNumber':
        return (
          <TextField key={k} label={label} name={k} placeholder="Enter GST number" maxLength={15} value={form.gstNumber} onChange={(e) => set('gstNumber', e.target.value.toUpperCase())} error={errors.gstNumber} hint="15-character GSTIN" />
        )
      case 'contactNo':
        return <TextField key={k} label={label} name={k} inputMode="numeric" maxLength={10} placeholder="Enter contact number" value={form.contactNo} onChange={(e) => set('contactNo', e.target.value.replace(/\D/g, ''))} error={errors.contactNo} />
      case 'netAmount':
        return (
          <div key={k}>
            {amountField(k, label)}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
              <span className={netMismatch ? 'text-amber-700' : 'text-muted'}>
                Calculated: Invoice − deductions = <b>{rupee(calculated) || '₹ 0'}</b>
              </span>
              <button
                type="button"
                onClick={() => set('netAmount', String(calculated))}
                className="inline-flex items-center gap-1 rounded border border-line px-1.5 py-0.5 font-semibold text-primary hover:bg-primary-soft"
              >
                <Calculator size={11} /> Use calculated
              </button>
            </div>
          </div>
        )
      case 'paymentDate':
        return <TextField key={k} label={label} name={k} type="date" value={form.paymentDate} onChange={(e) => set('paymentDate', e.target.value)} error={errors.paymentDate} hint="DD / MM / YYYY" />
      case 'utrNumber':
        return <TextField key={k} label={label} name={k} placeholder="Enter UTR number" maxLength={22} value={form.utrNumber} onChange={(e) => set('utrNumber', e.target.value.toUpperCase())} error={errors.utrNumber} />
      case 'invoiceStatus':
        return (
          <div key={k}>
            <RadioGroup label={label} value={form.invoiceStatus} options={[...GST_INVOICE_STATUSES]} onChange={(v) => set('invoiceStatus', v)} />
            <ClearLink show={!!form.invoiceStatus} onClear={() => set('invoiceStatus', '')} />
          </div>
        )
      case 'paymentStatus':
        return (
          <div key={k}>
            <RadioGroup label={label} value={form.paymentStatus} options={[...GST_PAYMENT_STATUSES]} onChange={(v) => set('paymentStatus', v)} />
            <ClearLink show={!!form.paymentStatus} onClear={() => set('paymentStatus', '')} />
          </div>
        )
      case 'remark':
        return <TextAreaField key={k} label={label} name={k} rows={2} placeholder="Enter a remark" value={form.remark} onChange={(e) => set('remark', e.target.value)} />
      default:
        if (AMOUNT_KEYS.includes(k)) return amountField(k, label)
        return (
          <TextField
            key={k}
            label={label}
            name={k}
            placeholder={`Enter ${label.replace(/\.$/, '').toLowerCase()}`}
            value={String(form[k])}
            onChange={(e) => set(k, (['siteId', 'atmId'].includes(k) ? e.target.value.toUpperCase() : e.target.value) as never)}
          />
        )
    }
  }

  const title = isNew ? 'New GST Record' : editing ? 'Edit GST Record' : 'GST Record'
  const ctx = view.mode === 'Yearly' || !view.month ? `${view.mode} · F.Y. ${view.fy} · All months` : `Monthly · F.Y. ${view.fy} · ${view.month}`

  return (
    <div className="max-w-[1180px]">
      <Link to="/finance/gst" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
        <ArrowLeft size={15} /> Back to GST details
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-[14px] text-muted">
            {editing ? 'Edit the supplied franchise GST invoice, deduction and payment fields.' : 'View the supplied franchise GST invoice, deduction and payment fields.'}
            {!isNew && <span className="ml-1 text-ink-2">· {rec.id}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="secondary" onClick={cancel}>
                Cancel
              </Button>
              <Button variant="bright" icon={<Save size={16} />} onClick={save}>
                {isNew ? 'Create record' : 'Save changes'}
              </Button>
            </>
          ) : (
            <Button icon={<Pencil size={16} />} onClick={() => { setForm(existing!); setEditing(true) }}>
              Edit record
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <div className="mb-4 flex flex-wrap items-start gap-3 rounded-xl border border-blue-100 bg-primary-soft/60 px-4 py-3 text-[12px]">
          <Info size={16} className="mt-0.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-primary">Report context · {ctx}</div>
            <div className="mt-0.5 text-ink-2">
              The list filter is report context only, not the record's F. Year. All fields are optional — leave unverified values blank. Net Amount is entered manually; the calculated value is a suggestion.
            </div>
          </div>
        </div>
      )}
      {errors.form && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-brand-red">{errors.form}</div>}

      <div className="space-y-4">
        {GST_SECTIONS.map((s, i) => (
          <FormCard key={s.title} letter={String.fromCharCode(65 + i)} title={s.title} sub={s.sub} count={s.fields.length}>
            {s.fields.map((f) =>
              editing ? (
                editControl(f.key, f.label)
              ) : (
                <ReadField key={f.key} label={f.label} mono={['gstNumber', 'utrNumber'].includes(f.key)}>
                  {display(rec, f.key)}
                </ReadField>
              ),
            )}
          </FormCard>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted">
        <span>
          24 source fields
          {!isNew && rec.updatedAt && ` · Last updated ${new Date(rec.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} by ${rec.updatedBy}`}
        </span>
        {editing && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={cancel}>
              Cancel
            </Button>
            <Button variant="bright" size="sm" icon={<Save size={14} />} onClick={save}>
              {isNew ? 'Create record' : 'Save changes'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
