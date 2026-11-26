// Register a data-privacy complaint (grievance parameters 1–9). Used by the admin portal and self-service.
import { useState } from 'react'
import { FileText, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FileDrop, SelectField, TextAreaField, TextField, fmtSize, type FileValue } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { maskEmail, maskMobile } from '@/lib/mask'
import { DEPARTMENTS, GRIEVANCE_CATEGORIES, addDays, logPrivacy, nextId, privacyStore, type Attachment, type Grievance, type GrievanceCategory, type Priority } from '@/data/privacy'
import { FormActions, Note } from '../security/kit'
import { actor, isEmail, isMobile } from '../security/util'

type Identity = { name: string; mobile: string; email: string; ref?: string }
type Method = Grievance['verification']['method']
type Errors = Partial<Record<'name' | 'mobile' | 'email' | 'method' | 'verify' | 'category' | 'subject' | 'description' | 'priority' | 'otp', string>>

export function GrievanceForm({ mode, initial, identity, onDone, onBack }: { mode: 'admin' | 'self'; initial?: Grievance; identity?: Identity; onDone: (g: Grievance) => void; onBack: () => void }) {
  const self = mode === 'self'
  const [who, setWho] = useState<Identity>(() => initial?.complainant ?? identity ?? { name: '', mobile: '', email: '' })
  const [method, setMethod] = useState<Method>(() => initial?.verification.method || (self ? 'Registered account' : ''))
  const [verified, setVerified] = useState(() => initial?.verification.verified ?? self)
  const [otpSent, setOtpSent] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [idDoc, setIdDoc] = useState<FileValue>(null)
  const [category, setCategory] = useState<GrievanceCategory | ''>(() => initial?.category ?? '')
  const [subject, setSubject] = useState(() => initial?.subject ?? '')
  const [description, setDescription] = useState(() => initial?.description ?? '')
  const [evidence, setEvidence] = useState<Attachment[]>(() => initial?.evidence ?? [])
  const [priority, setPriority] = useState<Priority | ''>(() => initial?.priority ?? (self ? 'Medium' : ''))
  const [department, setDepartment] = useState(() => initial?.department ?? '')
  const [officer, setOfficer] = useState(() => initial?.officer ?? '')
  const [errors, setErrors] = useState<Errors>({})
  const [savedId, setSavedId] = useState<string | undefined>(() => initial?.id)

  const changeMethod = (m: Method) => {
    setMethod(m)
    setVerified(m === 'Registered account' && self)
    setOtpSent(null)
    setOtp('')
    setIdDoc(null)
  }
  const sendOtp = () => {
    if (method === 'Email OTP' && !isEmail(who.email)) return setErrors((e) => ({ ...e, email: 'Enter a valid email first.' }))
    if (method === 'Mobile OTP' && !isMobile(who.mobile)) return setErrors((e) => ({ ...e, mobile: 'Enter a valid 10-digit mobile first.' }))
    const a = new Uint32Array(1)
    crypto.getRandomValues(a)
    setOtpSent(String(100000 + (a[0] % 900000)))
    setOtp('')
    toast(`OTP sent to ${method === 'Email OTP' ? maskEmail(who.email) : maskMobile(who.mobile)}`, 'info')
  }
  const checkOtp = () => {
    if (otp.trim() !== otpSent) return setErrors((e) => ({ ...e, otp: 'Incorrect OTP.' }))
    setVerified(true)
    setErrors((e) => ({ ...e, otp: undefined, verify: undefined }))
    toast('Identity verified.')
  }

  const addEvidence = (f: FileValue) => {
    if (!f) return
    if (!/\.(pdf|png|jpe?g|webp|heic)$/i.test(f.name)) return toast('Only PDF or image files are allowed as evidence.', 'error')
    if (evidence.length >= 5) return toast('Up to 5 files can be attached.', 'error')
    setEvidence((e) => [...e, f])
  }

  const build = (draft: boolean): Grievance => {
    const s = privacyStore.get()
    const now = new Date().toISOString()
    const pr: Priority = priority || 'Medium'
    const sla = s.settings.grievanceSlaDays[pr]
    const createdAt = initial?.createdAt && initial.draft === false ? initial.createdAt : now
    const id = savedId ?? nextId('DPG', s.grievances)
    const by = actor()
    const reg = self ? 'Self-service' : 'Admin portal'
    const prev = savedId ? s.grievances.find((x) => x.id === savedId) : undefined
    const history = [...(prev?.history ?? initial?.history ?? [])]
    if (draft) history.push({ at: now, actor: by, action: 'Draft saved' })
    else {
      history.push({ at: now, actor: by, action: 'Registered', detail: reg })
      if (verified) history.push({ at: now, actor: self ? 'System' : by, action: 'Identity verified', detail: method || undefined })
      history.push({ at: now, actor: 'System', action: 'Acknowledged', detail: `Complaint number ${id} sent to ${maskEmail(who.email)} / ${maskMobile(who.mobile)}` })
      if (department) history.push({ at: now, actor: by, action: 'Assigned', detail: `${department}${officer ? ` → ${officer}` : ''}` })
    }
    return {
      id,
      draft,
      createdAt,
      source: self ? 'Self-service' : 'Admin portal',
      complainant: { ...who, name: who.name.trim(), email: who.email.trim(), mobile: who.mobile.replace(/\D/g, '').slice(-10) },
      verification: { method, verified, verifiedAt: verified ? (initial?.verification.verifiedAt ?? now) : undefined, by: verified ? (self ? 'System' : by) : undefined },
      category,
      subject: subject.trim(),
      description: description.trim(),
      evidence,
      acknowledgedAt: draft ? undefined : now,
      department,
      officer: officer.trim(),
      priority: pr,
      status: 'Open',
      slaDays: sla,
      dueAt: addDays(draft ? now : createdAt, sla),
      escalated: false,
      reopenCount: 0,
      communications: draft
        ? []
        : [{ at: now, channel: 'Email', message: `Acknowledgement: your data-privacy complaint has been registered. Complaint number ${id}. Expected resolution within ${sla} day(s).`, by: 'System' }],
      history,
    }
  }

  const save = (g: Grievance) => {
    privacyStore.set((s) => ({ ...s, grievances: s.grievances.some((x) => x.id === g.id) ? s.grievances.map((x) => (x.id === g.id ? g : x)) : [g, ...s.grievances] }))
  }

  const saveDraft = () => {
    if (!who.name.trim()) return setErrors({ name: 'Complainant name is needed to save a draft.' })
    const g = build(true)
    save(g)
    setSavedId(g.id)
    logPrivacy(actor(), 'Grievance draft saved', g.id)
    toast(`Draft ${g.id} saved.`, 'info')
    onDone(g)
  }

  const submit = () => {
    const e: Errors = {}
    if (!who.name.trim()) e.name = 'Name is required.'
    if (!isMobile(who.mobile)) e.mobile = 'Enter a valid 10-digit mobile number.'
    if (!isEmail(who.email)) e.email = 'Enter a valid email address.'
    if (!method) e.method = 'Choose how the identity is verified.'
    else if (!verified) e.verify = method === 'ID document' ? 'Upload the ID document and mark it verified.' : 'Complete the identity verification.'
    if (!category) e.category = 'Category is required.'
    if (!subject.trim()) e.subject = 'Subject is required.'
    if (description.trim().length < 20) e.description = 'Describe the complaint (at least 20 characters).'
    if (!priority) e.priority = 'Priority is required.'
    setErrors(e)
    if (Object.keys(e).length) return toast('Fill the required fields.', 'error')
    const g = build(false)
    save(g)
    logPrivacy(actor(), 'Grievance registered', g.id, `${g.category}, ${g.priority}, ${g.source}`)
    toast(`Complaint ${g.id} registered — acknowledgement sent.`)
    onDone(g)
  }

  const setW = (k: keyof Identity, v: string) => {
    setWho((w) => ({ ...w, [k]: v }))
    if (!self && verified && (k === 'email' || k === 'mobile')) setVerified(false)
  }

  return (
    <div className="space-y-5 rounded-xl border border-line bg-white p-5">
      <div>
        <h3 className="mb-3 text-[14px] font-semibold text-ink">1 · Complainant & identity verification</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Full name" required value={who.name} readOnly={self} onChange={(e) => setW('name', e.target.value)} error={errors.name} />
          <TextField label="Mobile" required inputMode="numeric" value={who.mobile} readOnly={self} onChange={(e) => setW('mobile', e.target.value)} error={errors.mobile} />
          <TextField label="Email" required type="email" value={who.email} readOnly={self} onChange={(e) => setW('email', e.target.value)} error={errors.email} />
        </div>
        {self ? (
          <Note>
            <ShieldCheck size={13} className="mr-1 inline" /> Verified through your signed-in account{who.ref ? ` (${who.ref})` : ''}.
          </Note>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <SelectField label="Verification method" required options={['Email OTP', 'Mobile OTP', 'ID document', 'Registered account']} value={method} onChange={(e) => changeMethod(e.target.value as Method)} error={errors.method} />
            <div className="sm:col-span-2">
              {verified ? (
                <div className="mt-6 inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-700">
                  <ShieldCheck size={14} /> Identity verified ({method})
                </div>
              ) : method === 'Email OTP' || method === 'Mobile OTP' ? (
                <div className="mt-6 flex flex-wrap items-start gap-2">
                  <Button size="sm" variant="secondary" className="h-9" onClick={sendOtp}>{otpSent ? 'Resend OTP' : 'Send OTP'}</Button>
                  {otpSent && (
                    <>
                      <input aria-label="OTP" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="6-digit OTP" className={`h-9 w-32 rounded-md border px-3 font-mono text-[13px] outline-none ${errors.otp ? 'border-brand-red' : 'border-line'}`} />
                      <Button size="sm" className="h-9" onClick={checkOtp}>Verify</Button>
                      <span className="w-full text-[11px] text-muted">Demo mode — OTP: <span className="font-mono font-semibold">{otpSent}</span></span>
                    </>
                  )}
                  {errors.otp && <span className="w-full text-[11px] text-brand-red">{errors.otp}</span>}
                </div>
              ) : method === 'ID document' ? (
                <div className="mt-6 space-y-2">
                  <FileDrop compact purpose="privacy-grievance" value={idDoc} onChange={setIdDoc} accept=".pdf,image/*" label="Upload Aadhaar / PAN / Voter ID" hint="Kept only for verification" />
                  {idDoc && <Button size="sm" onClick={() => setVerified(true)}>Mark identity verified</Button>}
                </div>
              ) : method === 'Registered account' ? (
                <div className="mt-6">
                  <Button size="sm" variant="secondary" onClick={() => setVerified(true)}>Confirm registered account matches</Button>
                </div>
              ) : null}
              {errors.verify && <p className="mt-1 text-[11px] text-brand-red">{errors.verify}</p>}
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-[14px] font-semibold text-ink">2 · Complaint</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Category" required options={[...GRIEVANCE_CATEGORIES]} value={category} onChange={(e) => setCategory(e.target.value as GrievanceCategory)} error={errors.category} />
          <TextField label="Subject" required className="sm:col-span-2" value={subject} onChange={(e) => setSubject(e.target.value)} error={errors.subject} maxLength={120} />
          <TextAreaField label="Description" required className="sm:col-span-3" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} hint="What happened, when, which data is involved." />
        </div>
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-semibold text-ink">Evidence (PDF / image, up to 5)</div>
          <div className="space-y-2">
            {evidence.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-[12px]">
                <FileText size={14} className="text-primary" />
                <span className="flex-1 truncate">{f.name}</span>
                <span className="text-muted">{fmtSize(f.size)}</span>
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setEvidence((e) => e.filter((_, j) => j !== i))} className="text-muted hover:text-brand-red">
                  <X size={14} />
                </button>
              </div>
            ))}
            {evidence.length < 5 && <FileDrop compact purpose="privacy-grievance" value={null} onChange={addEvidence} accept=".pdf,image/*" maxMb={10} hint="PDF, JPG, PNG — max 10 MB" />}
          </div>
        </div>
      </div>

      {!self && (
        <div>
          <h3 className="mb-3 text-[14px] font-semibold text-ink">3 · Priority & assignment</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Priority" required options={['High', 'Medium', 'Low']} value={priority} onChange={(e) => setPriority(e.target.value as Priority)} error={errors.priority} hint={priority ? `Resolution timeline: ${privacyStore.get().settings.grievanceSlaDays[priority]} day(s)` : undefined} />
            <SelectField label="Department" options={[...DEPARTMENTS]} value={department} onChange={(e) => setDepartment(e.target.value)} hint="Can also be assigned later" />
            <TextField label="Authorized officer" value={officer} onChange={(e) => setOfficer(e.target.value)} />
          </div>
        </div>
      )}

      <FormActions onBack={onBack} onDraft={saveDraft} onSubmit={submit} submitLabel="Submit complaint" />
    </div>
  )
}
