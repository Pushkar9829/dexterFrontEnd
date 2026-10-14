import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { ACC_RE, IFSC_RE, PAN_RE, PAYOUT_SECTIONS, PAYOUT_STATUSES, emptyPayout, getPayout, maskAcc, payoutStore, savePayout, type PayoutRecord } from '@/data/financePayout'
import { InfoBanner, LockedInput, RecordFooter, RecordSection, TInput } from './shared'

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

const UPPER = new Set<keyof PayoutRecord>(['loiCode', 'atmId', 'panNo', 'ifsc', 'panName', 'accName'])

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
  const ro = !editing

  const set = <K extends keyof PayoutRecord>(k: K, v: PayoutRecord[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const save = () => {
    const clean = { ...form, status: form.status.trim(), emailSubject: form.emailSubject.trim() }
    const e = validate(clean, isNew)
    setErrors(e)
    if (Object.values(e).some(Boolean)) return toast('Fix the highlighted fields before saving', 'info')
    const saved = savePayout(clean)
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

  const control = (k: keyof PayoutRecord, label: string) => {
    if (k === 'sn') return <LockedInput key={k} label={label} note="System-assigned" value={isNew ? '' : String(rec.sn)} />
    if (k === 'accNo' && ro)
      return (
        <TInput
          key={k}
          label={label}
          name={k}
          mono
          readOnly
          value={reveal ? rec.accNo : maskAcc(rec.accNo)}
          note={
            rec.accNo ? (
              <button type="button" onClick={() => setReveal((r) => !r)} className="inline-flex items-center gap-1 font-semibold text-primary" aria-label={reveal ? 'Hide account number' : 'Show account number'}>
                {reveal ? <EyeOff size={12} /> : <Eye size={12} />} {reveal ? 'Hide' : 'Show'}
              </button>
            ) : undefined
          }
        />
      )
    return (
      <TInput
        key={k}
        label={label}
        name={k}
        value={String(rec[k] ?? '')}
        readOnly={ro}
        mono={k === 'panNo' || k === 'ifsc' || k === 'accNo'}
        list={k === 'status' ? 'payout-status-suggestions' : undefined}
        inputMode={k === 'accNo' ? 'numeric' : undefined}
        maxLength={k === 'panNo' ? 10 : k === 'ifsc' ? 11 : k === 'accNo' ? 18 : undefined}
        onChange={(v) => set(k, (k === 'accNo' ? v.replace(/\D/g, '') : UPPER.has(k) ? v.toUpperCase() : v) as never)}
        error={errors[k]}
      />
    )
  }

  const updated = rec.updatedAt ? `Last updated ${new Date(rec.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} by ${rec.updatedBy}` : ''

  return (
    <div className="max-w-[1280px]">
      <Link to="/finance/payout" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
        <ArrowLeft size={15} /> Back to Payout details
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{isNew ? 'New Payout Record' : editing ? 'Edit Payout Record' : 'Payout Record'}</h1>
          <p className="mt-1 text-[14px] text-muted">Edit the supplied Pay-out Account identifiers, PAN and settlement details.</p>
        </div>
        {editing ? (
          <div className="text-right">
            <div className="text-[11px] text-muted">Account setup</div>
            <div className="text-[14px] font-semibold text-primary">Pay-out Account</div>
            <div className="text-[11px] text-muted">{isNew ? 'Blank source template' : rec.id}</div>
          </div>
        ) : (
          <Button icon={<Pencil size={16} />} onClick={() => { setForm(existing!); setEditing(true) }}>
            Edit record
          </Button>
        )}
      </div>

      <InfoBanner title={isNew ? 'Blank template · Edit layout' : `${rec.id} · ${editing ? 'Edit layout' : 'View layout'}`}>
        {isNew
          ? 'No account record is selected. All account values and status remain unspecified. Leave fields blank where no verified information has been supplied.'
          : 'Leave fields blank where no verified information has been supplied. Keep the settlement account separate from the PAN details.'}
      </InfoBanner>
      {errors.form && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-brand-red">{errors.form}</div>}

      <datalist id="payout-status-suggestions">
        {PAYOUT_STATUSES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {PAYOUT_SECTIONS.map((s, i) => (
          <RecordSection key={s.title} title={s.title} sub={s.sub} cols={2}>
            {i === 0 ? (
              <>
                <div className="grid gap-x-6 gap-y-4 sm:col-span-2 sm:grid-cols-3">{s.fields.slice(0, 3).map((f) => control(f.key, f.label))}</div>
                {s.fields.slice(3).map((f) => control(f.key, f.label))}
              </>
            ) : (
              s.fields.map((f) => control(f.key, f.label))
            )}
          </RecordSection>
        ))}
        <RecordFooter title={`11 source fields · ${isNew ? 'Blank account format' : 'Account format'}`} sub={isNew ? 'No account values or status have been prefilled.' : updated}>
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
