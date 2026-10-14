import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Info, Pencil, Save } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RadioGroup, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { ACC_RE, IFSC_RE, PAN_RE, PAYOUT_SECTIONS, PAYOUT_STATUSES, emptyPayout, getPayout, maskAcc, payoutStore, savePayout, type PayoutRecord } from '@/data/financePayout'
import { ClearLink, FormCard, ReadField } from './shared'
import { payoutTone } from './PayoutList'

type Errors = Partial<Record<keyof PayoutRecord | 'form', string>>

function validate(p: PayoutRecord, isNew: boolean): Errors {
  const e: Errors = {}
  if (p.panNo && !PAN_RE.test(p.panNo)) e.panNo = 'PAN format is AAAAA9999A'
  if (p.ifsc && !IFSC_RE.test(p.ifsc)) e.ifsc = 'IFSC format is AAAA0XXXXXX (e.g. HDFC0001834)'
  if (p.accNo && !ACC_RE.test(p.accNo)) e.accNo = 'Account number is 9–18 digits'
  if (p.emailSubject && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.emailSubject)) e.emailSubject = 'Email Subject is a subject line, not an email address'
  if (p.atmId && !/^[A-Z0-9-]{4,20}$/.test(p.atmId)) e.atmId = 'Use letters, digits and hyphens (e.g. DX-MH-01482)'
  if (isNew && !p.loiCode && !p.atmId) e.form = 'Enter at least a LOI Code or ATM ID.'
  const dup = p.atmId ? payoutStore.get().find((x) => x.id !== p.id && x.atmId === p.atmId) : undefined
  if (dup) e.atmId = `ATM ID already has payout account ${dup.id}`
  return e
}

export default function PayoutRecordPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  payoutStore.use()
  const isNew = id === 'new'
  const existing = isNew ? undefined : getPayout(id)
  const [editing, setEditing] = useState(isNew || params.get('edit') === '1')
  const [form, setForm] = useState<PayoutRecord>(() => existing ?? emptyPayout())
  const [errors, setErrors] = useState<Errors>({})
  const [reveal, setReveal] = useState(false)

  if (!isNew && !existing) return <Navigate to="/finance/payout" replace />
  const rec = editing ? form : existing!

  const set = <K extends keyof PayoutRecord>(k: K, v: PayoutRecord[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const save = () => {
    const e = validate(form, isNew)
    setErrors(e)
    if (Object.values(e).some(Boolean)) return toast('Fix the highlighted fields before saving', 'info')
    const saved = savePayout(form)
    toast(isNew ? `Payout account ${saved.id} created` : `Payout account ${saved.id} saved`)
    setForm(saved)
    setEditing(false)
    if (isNew) navigate(`/finance/payout/${saved.id}`, { replace: true })
  }
  const cancel = () => {
    if (isNew) return navigate('/finance/payout')
    setForm(existing!)
    setErrors({})
    setEditing(false)
  }

  const upper = new Set<keyof PayoutRecord>(['loiCode', 'atmId', 'panNo', 'ifsc', 'panName', 'accName'])
  const placeholders: Partial<Record<keyof PayoutRecord, string>> = {
    loiCode: 'e.g. LOI-MH-PUN-00124', atmId: 'e.g. DX-MH-01482', panName: 'Name as per PAN', panNo: 'AAAAA9999A', accName: 'Settlement account name',
    accNo: 'Settlement account number', bankName: 'e.g. HDFC Bank', ifsc: 'e.g. HDFC0001834', emailSubject: 'e.g. Payout advice – DX-MH-01482',
  }

  const editControl = (k: keyof PayoutRecord, label: string) => {
    if (k === 'sn') return <ReadField key={k} label={label}>{isNew ? <span className="text-muted">System-assigned</span> : String(form.sn)}</ReadField>
    if (k === 'status')
      return (
        <div key={k} className="sm:col-span-2">
          <RadioGroup label={label} value={form.status} options={[...PAYOUT_STATUSES]} onChange={(v) => set('status', v)} />
          <ClearLink show={!!form.status} onClear={() => set('status', '')} />
        </div>
      )
    return (
      <TextField
        key={k}
        label={label}
        name={k}
        placeholder={placeholders[k]}
        inputMode={k === 'accNo' ? 'numeric' : undefined}
        maxLength={k === 'panNo' ? 10 : k === 'ifsc' ? 11 : k === 'accNo' ? 18 : undefined}
        value={String(form[k])}
        onChange={(e) => set(k, (k === 'accNo' ? e.target.value.replace(/\D/g, '') : upper.has(k) ? e.target.value.toUpperCase() : e.target.value) as never)}
        error={errors[k]}
      />
    )
  }

  const viewValue = (k: keyof PayoutRecord) => {
    if (k === 'status') return rec.status ? <Badge tone={payoutTone(rec.status)}>{rec.status}</Badge> : ''
    if (k === 'accNo')
      return rec.accNo ? (
        <span className="flex w-full items-center justify-between gap-2">
          <span className="font-mono text-[12.5px]">{reveal ? rec.accNo : maskAcc(rec.accNo)}</span>
          <button type="button" onClick={() => setReveal((r) => !r)} className="flex items-center gap-1 text-[11px] font-semibold text-primary" aria-label={reveal ? 'Hide account number' : 'Show account number'}>
            {reveal ? <EyeOff size={13} /> : <Eye size={13} />} {reveal ? 'Hide' : 'Show'}
          </button>
        </span>
      ) : ''
    return String(rec[k] ?? '')
  }

  return (
    <div className="max-w-[1180px]">
      <Link to="/finance/payout" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
        <ArrowLeft size={15} /> Back to Payout details
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{isNew ? 'New Payout Record' : editing ? 'Edit Payout Record' : 'Payout Record'}</h1>
          <p className="mt-1 text-[14px] text-muted">
            {editing ? 'Edit the supplied Pay-out Account identifiers, PAN and settlement details.' : 'View the supplied Pay-out Account identifiers, PAN and settlement details.'}
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

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-primary-soft/60 px-4 py-3 text-[12px]">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <div className="font-semibold text-primary">Account setup · Pay-out Account</div>
          <div className="mt-0.5 text-ink-2">
            PAN and settlement account are kept separate. Status options (Active / Pending verification / Inactive) are a proposal — the design supplies none.
          </div>
        </div>
      </div>
      {errors.form && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-brand-red">{errors.form}</div>}

      <div className="space-y-4">
        {PAYOUT_SECTIONS.map((s, i) => (
          <FormCard key={s.title} letter={String.fromCharCode(65 + i)} title={s.title} sub={s.sub} count={s.fields.length}>
            {s.fields.map((f) =>
              editing ? (
                editControl(f.key, f.label)
              ) : (
                <ReadField key={f.key} label={f.label} mono={['panNo', 'ifsc'].includes(f.key)}>
                  {viewValue(f.key)}
                </ReadField>
              ),
            )}
          </FormCard>
        ))}
      </div>

      <div className="mt-4 text-[12px] text-muted">
        11 source fields
        {!isNew && rec.updatedAt && ` · Last updated ${new Date(rec.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} by ${rec.updatedBy}`}
      </div>
    </div>
  )
}
