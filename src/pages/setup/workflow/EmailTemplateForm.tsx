import { apiEnabled } from '@/lib/api'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, FileClock, Save, Send, ShieldCheck, X } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { SectionTitle, SelectField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { can, useRole } from '@/lib/rbac'
import {
  TEMPLATE_VARS, WF_EVENTS, WF_MODULES, actorName, activeEmployee, chainFor, logAudit, nowIso, templateStore, useHierarchy, useTemplates, useWorkflow, useWorkflowLoad, wfApi, wfStore, wid,
  type EmailLog, type EmailTemplate, type Employee, type HierarchyLevel, type WfEvent, type WfModule,
} from '@/data/workflow'
import { BTN_PRIMARY, BTN_SECONDARY, PageHead, ReadOnlyField, WfCrumbs } from './ui'
import { fmtDT } from './helpers'

type Form = Omit<EmailTemplate, 'version' | 'history' | 'module' | 'event' | 'reminderEveryHours' | 'to'> & {
  module: WfModule | ''
  event: WfEvent | ''
  to: EmailTemplate['to'] | ''
  reminderEveryHours: string
}
type Errors = Partial<Record<keyof Form | 'activation', string>>

const TO_OPTIONS: EmailTemplate['to'][] = ['Assigned Employee', 'Hierarchy L1', 'Hierarchy L2', 'Hierarchy L3', 'Approver', 'Franchise']
/** CC / BCC are hierarchy roles too (spec §8.3: no hard-coded email IDs). */
const COPY_OPTIONS = ['Module Owner', 'Reporting Manager', 'Department Head', 'Hierarchy L1', 'Hierarchy L2', 'Hierarchy L3', 'Hierarchy L4', 'Hierarchy L5', 'Approver']
const TIMINGS: EmailTemplate['timing'][] = ['Immediate', 'Before due date', 'On due date', 'After overdue', 'Scheduled']
const LEVELS: HierarchyLevel[] = [0, 1, 2, 3, 4, 5]
const CODE_RE = /^[A-Z][A-Z0-9_]{2,39}$/
const draftKey = (code?: string) => `dexter.wf.tplDraft.${code ?? 'new'}`

const SAMPLE: Record<string, string> = {
  Module_Name: 'CBR', Record_ID: 'CBR-2026-00142', Site_ID: 'SITE-UP-0231', ATM_ID: 'DXT-ATM-0458', Site_LOI_Number: 'LOI-2026-0091', Franchise_Name: 'Shree Balaji Enterprises',
  Employee_Name: 'Kiran Rao', Assigned_To: 'Kiran Rao', Approver_Name: 'Meera Iyer', Submission_Date: '26/11/2026', Due_Date: '27/11/2026, 6:00 pm', Pending_Days: '2',
  Current_Status: 'Pending Approval', Pending_Action: 'Admin approval', Escalation_Level: '1', Portal_Link: 'https://erp.dexterindia.in/', Task_ID: 'TSK-DEMO01',
}
const fill = (txt: string, vars: Record<string, string>) => txt.replace(/\{([A-Za-z_]+)\}/g, (m, k: string) => vars[k] ?? m)
const unknownVars = (txt: string) => [...txt.matchAll(/\{([A-Za-z_]+)\}/g)].map((m) => `{${m[1]}}`).filter((v) => !TEMPLATE_VARS.includes(v))

/** Resolve a hierarchy role to an employee for the module's owner chain (preview + test email only). */
function resolveRole(role: string, chain: Employee[]): { label: string; email: string } | null {
  const pick = (e?: Employee) => (e ? { label: `${e.name} · ${e.designation}`, email: e.email } : null)
  if (role === 'Franchise') return { label: 'Franchise (from the record)', email: 'franchise@partner.example' }
  if (role === 'Approver') return pick(activeEmployee('EMP-002'))
  if (role === 'Assigned Employee' || role === 'Module Owner') return pick(chain[0])
  if (role === 'Reporting Manager') return pick(chain[1])
  if (role === 'Department Head') return pick(chain.find((e) => e.designation === 'Department Head'))
  const m = /^Hierarchy L(\d)$/.exec(role)
  if (m) return pick(chain[Number(m[1]) - 1] ?? chain[chain.length - 1])
  return null
}

const toForm = (t: EmailTemplate): Form => ({ ...t, reminderEveryHours: String(t.reminderEveryHours) })
const EMPTY: Form = { code: '', name: '', module: '', event: '', subject: '', body: '', to: '', cc: [], bcc: [], escalationLevel: 1, timing: 'Immediate', reminderEveryHours: '24', status: 'Inactive' }

function readDraft(code?: string): { at: string; form: Form } | null {
  try {
    const raw = localStorage.getItem(draftKey(code))
    return raw ? (JSON.parse(raw) as { at: string; form: Form }) : null
  } catch {
    return null
  }
}

export default function EmailTemplateForm() {
  const { code: codeParam } = useParams()
  const code = codeParam ? decodeURIComponent(codeParam) : undefined
  const templates = useTemplates()
  const existing = code ? templates.find((t) => t.code === code) : undefined
  if (code && !existing)
    return (
      <div className="space-y-4">
        <WfCrumbs trail={[{ label: 'Email Templates', to: '/setup/email-templates' }, { label: code }]} />
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-[13px] text-slate-500">
          Template <b>{code}</b> was not found.{' '}
          <Link to="/setup/email-templates" className="font-semibold text-[#0066FF]">Back to templates</Link>
        </div>
      </div>
    )
  return <TemplateEditor key={code ?? 'new'} existing={existing} />
}

function TemplateEditor({ existing }: { existing?: EmailTemplate }) {
  const nav = useNavigate()
  const role = useRole()
  const editable = existing ? can('Edit', role) : can('Create', role)
  const templates = useTemplates()
  useWorkflowLoad(['templates', 'hierarchy'])
  const h = useHierarchy()
  const { emails } = useWorkflow()
  const [draft] = useState(() => readDraft(existing?.code))
  const [f, setF] = useState<Form>(() => draft?.form ?? (existing ? toForm(existing) : EMPTY))
  const [draftAt, setDraftAt] = useState<string | undefined>(draft?.at)
  const [err, setErr] = useState<Errors>({})
  const [testMail, setTestMail] = useState<EmailLog | null>(null)
  const [focus, setFocus] = useState<'subject' | 'body'>('body')
  const subjectRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((p) => ({ ...p, [k]: v }))
    setErr((e) => ({ ...e, [k]: undefined, activation: undefined }))
  }

  const owner = f.module ? h.moduleOwners[f.module] : undefined
  const chain = chainFor(owner) // reads the live hierarchy (re-rendered via useHierarchy)
  const rules = useMemo(() => (f.module ? h.escalation.filter((r) => r.module === f.module).sort((a, b) => a.level - b.level) : []), [h, f.module])
  const tplEmails = useMemo(() => (f.code ? emails.filter((e) => e.templateCode === f.code).slice(0, 8) : []), [emails, f.code])
  const sample = useMemo(() => ({ ...SAMPLE, Module_Name: f.module || SAMPLE.Module_Name, Assigned_To: chain[0]?.name ?? SAMPLE.Assigned_To, Escalation_Level: String(f.escalationLevel) }), [f.module, f.escalationLevel, chain])

  const insertVar = (v: string) => {
    if (!editable) return
    const el = focus === 'subject' ? subjectRef.current : bodyRef.current
    const cur = f[focus]
    const start = el?.selectionStart ?? cur.length
    const end = el?.selectionEnd ?? cur.length
    set(focus, cur.slice(0, start) + v + cur.slice(end))
    el?.focus()
  }
  const toggleCopy = (k: 'cc' | 'bcc', v: string) => set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v])

  const validate = (forTest = false): Errors => {
    const e: Errors = {}
    if (!f.name.trim()) e.name = 'Template name is required.'
    else if (templates.some((t) => t.name.trim().toLowerCase() === f.name.trim().toLowerCase() && t.code !== existing?.code)) e.name = 'Another template already uses this name.'
    if (!existing) {
      if (!f.code.trim()) e.code = 'Template code is required.'
      else if (!CODE_RE.test(f.code)) e.code = 'Use 3–40 capital letters, digits or _ (start with a letter), e.g. CBR_SUBMIT.'
      else if (templates.some((t) => t.code === f.code)) e.code = 'This code already exists — codes must be unique.'
    }
    if (!f.module) e.module = 'Select the module.'
    if (!f.event) e.event = 'Select the trigger event.'
    if (!f.subject.trim()) e.subject = 'Subject is required.'
    else if (f.subject.length > 200) e.subject = 'Keep the subject within 200 characters.'
    else if (unknownVars(f.subject).length) e.subject = `Unknown variable(s): ${unknownVars(f.subject).join(', ')}`
    if (!f.body.trim()) e.body = 'Email body is required.'
    else if (unknownVars(f.body).length) e.body = `Unknown variable(s): ${unknownVars(f.body).join(', ')}`
    if (!f.to) e.to = 'Select the hierarchy-based recipient.'
    if (f.cc.some((c) => f.bcc.includes(c))) e.bcc = 'A recipient cannot be in both CC and BCC.'
    if (!forTest) {
      const r = Number(f.reminderEveryHours)
      if (f.reminderEveryHours.trim() === '' || !Number.isInteger(r) || r < 0 || r > 168) e.reminderEveryHours = 'Enter whole hours between 0 and 168 (0 = no reminder).'
      else if (f.timing === 'After overdue' && r === 0) e.reminderEveryHours = 'Overdue templates need a reminder frequency (1–168 h).'
      const activating = f.status === 'Active' && existing?.status !== 'Active'
      const code = existing?.code ?? f.code
      if (activating && !emails.some((m) => m.templateCode === code && m.refId.startsWith('TEST'))) e.activation = 'Send a test email before activating this template (§14.1 – test before activation).'
    }
    return e
  }

  const saveDraft = () => {
    const at = nowIso()
    try {
      localStorage.setItem(draftKey(existing?.code), JSON.stringify({ at, form: f }))
    } catch {
      toast('Draft could not be saved (browser storage blocked).', 'error')
      return
    }
    setDraftAt(at)
    toast('Draft saved on this device. It is not live until you submit.')
  }
  const discardDraft = () => {
    try {
      localStorage.removeItem(draftKey(existing?.code))
    } catch {
      /* ignore */
    }
    setDraftAt(undefined)
    setF(existing ? toForm(existing) : EMPTY)
    setErr({})
  }

  const submit = () => {
    const e = validate()
    setErr(e)
    if (Object.values(e).some(Boolean)) {
      toast('Please fix the highlighted fields.', 'error')
      return
    }
    const base = { ...f, module: f.module as WfModule, event: f.event as WfEvent, to: f.to as EmailTemplate['to'], reminderEveryHours: Number(f.reminderEveryHours), name: f.name.trim(), subject: f.subject.trim() }
    if (existing) {
      const changed = (Object.keys(base) as (keyof typeof base)[]).some((k) => JSON.stringify(base[k]) !== JSON.stringify(existing[k]))
      if (!changed) {
        toast('No changes to save.', 'info')
        return
      }
      const version = existing.version + 1
      if (apiEnabled) {
        // PATCH /workflow/templates/:code — content change → new version (server); status via /status
        const upd: EmailTemplate = { ...existing, ...base, code: existing.code }
        wfApi.saveTemplate(upd, false).then(async (ok) => {
          if (!ok) return
          if (base.status !== existing.status) await wfApi.setTemplateStatus(existing.code, base.status)
          toast(`Template ${existing.code} saved.`)
          nav('/setup/email-templates')
        })
        return
      }
      const next: EmailTemplate = { ...existing, ...base, code: existing.code, version, history: [...existing.history, { version, at: nowIso(), by: actorName(), subject: base.subject }] }
      templateStore.set((list) => list.map((t) => (t.code === existing.code ? next : t)))
      logAudit('Email Template', existing.code, `Template updated → v${version}`, existing.subject !== base.subject ? `Subject: "${existing.subject}" → "${base.subject}"` : undefined)
    } else {
      if (apiEnabled) {
        const created: EmailTemplate = { ...base, code: f.code, version: 1, history: [] }
        wfApi.saveTemplate(created, true).then(async (ok) => {
          if (!ok) return
          if (base.status === 'Active') await wfApi.setTemplateStatus(f.code, 'Active')
          toast(`Template ${f.code} created.`)
          nav('/setup/email-templates')
        })
        return
      }
      const next: EmailTemplate = { ...base, code: f.code, version: 1, history: [{ version: 1, at: nowIso(), by: actorName(), subject: base.subject }] }
      templateStore.set((list) => [next, ...list])
      logAudit('Email Template', next.code, 'Template created (v1)', `${next.module} · ${next.event}`)
    }
    try {
      localStorage.removeItem(draftKey(existing?.code))
    } catch {
      /* ignore */
    }
    toast(existing ? `Template ${existing.code} saved as v${existing.version + 1}.` : `Template ${f.code} created.`)
    nav('/setup/email-templates')
  }

  const sendTest = () => {
    const e = validate(true)
    setErr(e)
    if (Object.values(e).some(Boolean)) {
      toast('Complete the template before sending a test email.', 'error')
      return
    }
    const to = [resolveRole(f.to, chain)?.email].filter((x): x is string => !!x)
    const cc = f.cc.map((c) => resolveRole(c, chain)?.email).filter((x): x is string => !!x)
    const mail: EmailLog = {
      id: wid('EML'), at: nowIso(), templateCode: existing?.code ?? f.code, templateVersion: existing?.version ?? 1, module: f.module as WfModule, refId: `TEST-${Date.now().toString(36).toUpperCase()}`,
      event: f.event as WfEvent, to, cc: [...new Set(cc)], subject: `[TEST] ${fill(f.subject, sample)}`, body: fill(f.body, sample), status: to.length ? 'Sent' : 'Failed',
    }
    wfStore.set((s) => ({ ...s, emails: [mail, ...s.emails].slice(0, 3000) }))
    logAudit('Email Template', mail.templateCode, 'Test email sent', `${mail.status} → ${to.join(', ') || 'no recipient resolved'}`)
    setTestMail(mail)
  }

  const recipients = [
    { kind: 'To', roles: f.to ? [f.to] : [] },
    { kind: 'CC', roles: f.cc },
    { kind: 'BCC', roles: f.bcc },
  ]

  return (
    <div className="space-y-5 pb-16 max-w-[1440px]">
      <WfCrumbs trail={[{ label: 'Email Templates', to: '/setup/email-templates' }, { label: existing ? existing.code : 'New Template' }]} />
      <PageHead
        title={existing ? `${existing.name}` : 'New Email Template'}
        sub={existing ? <span className="flex flex-wrap items-center gap-2">{existing.code} · v{existing.version} <Badge tone={toneFor(existing.status)}>{existing.status}</Badge></span> : 'Define when the email goes out, to which hierarchy level, and with what content.'}
        actions={
          <button type="button" onClick={() => nav('/setup/email-templates')} className={BTN_SECONDARY}>
            <ArrowLeft size={15} /> Back
          </button>
        }
      />

      {draftAt && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
          <FileClock size={16} /> Unsubmitted draft saved {fmtDT(draftAt)} — the live template is unchanged until you submit.
          <button type="button" onClick={discardDraft} className="ml-auto inline-flex items-center gap-1 font-semibold hover:underline">
            <X size={13} /> Discard draft
          </button>
        </div>
      )}
      {!editable && <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12.5px] text-slate-600">Read-only — your role cannot change email templates.</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionTitle num="1" title="Template identity & trigger" />
            <fieldset disabled={!editable} className="grid gap-4 sm:grid-cols-2">
              <TextField label="Template Name" required value={f.name} onChange={(e) => set('name', e.target.value)} error={err.name} placeholder="e.g. CBR – Approve" />
              {existing ? (
                <ReadOnlyField label="Template Code" value={existing.code} hint="System key — cannot change after creation." />
              ) : (
                <TextField label="Template Code" required value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s+/g, '_'))} error={err.code} placeholder="CBR_APPROVE" hint="Unique system key." />
              )}
              <SelectField label="Module" required options={WF_MODULES} value={f.module} onChange={(e) => set('module', e.target.value as WfModule)} error={err.module} />
              <SelectField label="Trigger Event" required options={WF_EVENTS} value={f.event} onChange={(e) => set('event', e.target.value as WfEvent)} error={err.event} />
            </fieldset>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionTitle num="2" title="Subject & body" sub="Click a variable to insert it where the cursor is (subject or body). Values are fetched from the module record at send time." />
            <div className="mb-4 flex flex-wrap gap-1.5">
              {TEMPLATE_VARS.map((v) => (
                <button key={v} type="button" disabled={!editable} onClick={() => insertVar(v)} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-mono text-[11px] text-[#0066FF] hover:bg-blue-100 disabled:opacity-50">
                  {v}
                </button>
              ))}
            </div>
            <fieldset disabled={!editable} className="space-y-4">
              <div>
                <label htmlFor="tpl-subject" className="mb-1.5 block text-[11px] font-semibold text-ink">Email Subject *</label>
                <input
                  id="tpl-subject"
                  ref={subjectRef}
                  value={f.subject}
                  onFocus={() => setFocus('subject')}
                  onChange={(e) => set('subject', e.target.value)}
                  className={cn('h-9 w-full rounded-md border bg-white px-[11px] text-[12.5px] outline-none focus:border-primary', err.subject ? 'border-brand-red' : 'border-line', focus === 'subject' && 'ring-2 ring-primary/10')}
                />
                {err.subject && <p className="mt-1 text-[11px] text-brand-red">{err.subject}</p>}
              </div>
              <div>
                <label htmlFor="tpl-body" className="mb-1.5 block text-[11px] font-semibold text-ink">Email Body *</label>
                <textarea
                  id="tpl-body"
                  ref={bodyRef}
                  rows={10}
                  value={f.body}
                  onFocus={() => setFocus('body')}
                  onChange={(e) => set('body', e.target.value)}
                  className={cn('w-full rounded-md border bg-white px-[11px] py-2 font-mono text-[12px] outline-none focus:border-primary', err.body ? 'border-brand-red' : 'border-line', focus === 'body' && 'ring-2 ring-primary/10')}
                />
                {err.body && <p className="mt-1 text-[11px] text-brand-red">{err.body}</p>}
              </div>
            </fieldset>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionTitle num="3" title="Recipients, escalation & timing" sub="Recipients are hierarchy roles. The actual email IDs are resolved from the Hierarchy & Escalation Matrix when the email is sent." />
            <fieldset disabled={!editable} className="grid gap-4 sm:grid-cols-2">
              <SelectField label="To (hierarchy-based)" required options={TO_OPTIONS} value={f.to} onChange={(e) => set('to', e.target.value as EmailTemplate['to'])} error={err.to} />
              <SelectField label="Escalation Level" options={LEVELS.map((l) => `L${l}`)} placeholder="Select" value={`L${f.escalationLevel}`} onChange={(e) => set('escalationLevel', Number(e.target.value.slice(1) || 1) as HierarchyLevel)} hint="L0 = assigned employee … L5 = management." />
              <ChipPicker label="CC (designated recipients)" options={COPY_OPTIONS} value={f.cc} onToggle={(v) => toggleCopy('cc', v)} />
              <ChipPicker label="BCC (optional, authorised)" options={COPY_OPTIONS} value={f.bcc} onToggle={(v) => toggleCopy('bcc', v)} error={err.bcc} />
              <SelectField label="Trigger Timing / Schedule Rule" options={TIMINGS} value={f.timing} onChange={(e) => set('timing', (e.target.value || 'Immediate') as EmailTemplate['timing'])} />
              <TextField label="Reminder Frequency (hours)" type="number" min={0} max={168} value={f.reminderEveryHours} onChange={(e) => set('reminderEveryHours', e.target.value)} error={err.reminderEveryHours} hint="Repeat until the linked task is completed. 0 = no reminder." />
              <SelectField label="Status" options={['Active', 'Inactive']} value={f.status} onChange={(e) => set('status', (e.target.value || 'Inactive') as EmailTemplate['status'])} error={err.activation} hint={!err.activation ? 'Inactive templates are never sent.' : undefined} />
            </fieldset>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <button type="button" onClick={() => nav('/setup/email-templates')} className={BTN_SECONDARY}>
              <ArrowLeft size={15} /> Back
            </button>
            <button type="button" onClick={sendTest} disabled={!editable} className={BTN_SECONDARY}>
              <Send size={15} /> Send test email
            </button>
            <button type="button" onClick={saveDraft} disabled={!editable} className={BTN_SECONDARY}>
              <Save size={15} /> Save Draft
            </button>
            <button type="button" onClick={submit} disabled={!editable} className={BTN_PRIMARY}>
              <ShieldCheck size={15} /> Submit
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-[14px] font-bold text-slate-900">
              <Eye size={16} className="text-[#0066FF]" /> Live preview <span className="text-[11px] font-normal text-slate-500">sample values</span>
            </div>
            <div className="space-y-2 p-4 text-[12px]">
              {recipients.map((r) => (
                <div key={r.kind} className="flex gap-2">
                  <span className="w-9 shrink-0 font-semibold text-slate-500">{r.kind}</span>
                  <span className="text-slate-700">
                    {r.roles.length === 0 ? '—' : r.roles.map((x) => {
                      const res = resolveRole(x, chain)
                      return <span key={x} className="mr-2 inline-block">{x}: <b>{res ? res.email : 'not resolved'}</b></span>
                    })}
                  </span>
                </div>
              ))}
              <div className="flex gap-2 border-t border-slate-100 pt-2">
                <span className="w-9 shrink-0 font-semibold text-slate-500">Subj.</span>
                <span className="font-semibold text-slate-900">{f.subject ? fill(f.subject, sample) : '—'}</span>
              </div>
              <pre className="mt-2 max-h-[320px] overflow-auto rounded-lg bg-slate-50 p-3 font-sans text-[12px] whitespace-pre-wrap text-slate-700">{f.body ? fill(f.body, sample) : 'Body preview appears here.'}</pre>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-[14px] font-bold text-slate-900">Hierarchy & escalation for {f.module || 'module'}</span>
              <Link to="/setup/hierarchy" className="text-[11px] font-semibold text-[#0066FF] hover:underline">Edit matrix</Link>
            </div>
            {!f.module ? (
              <p className="p-4 text-[12px] text-slate-500">Select a module to see who receives this template.</p>
            ) : (
              <table className="w-full text-[11.5px]">
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.level} className={cn('border-b border-slate-100', r.level === f.escalationLevel && 'bg-blue-50/60')}>
                      <td className="px-4 py-2 font-semibold">L{r.level}</td>
                      <td className="py-2">{r.designation}</td>
                      <td className="py-2">{chain[r.level - 1]?.name ?? '—'}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{r.afterHours ? `after ${r.afterHours} h` : 'immediate'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {existing && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3 text-[14px] font-bold text-slate-900">Version history</div>
              <ul className="divide-y divide-slate-100 text-[12px]">
                {[...existing.history].reverse().map((v) => (
                  <li key={`${v.version}-${v.at}`} className="px-4 py-2.5">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">v{v.version}{v.version === existing.version && ' (current)'}</span>
                      <span className="text-slate-500">{fmtDT(v.at)} · {v.by}</span>
                    </div>
                    <div className="mt-0.5 text-slate-600">{v.subject}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-[14px] font-bold text-slate-900">Recent email log</span>
              <Link to="/setup/email-log" className="text-[11px] font-semibold text-[#0066FF] hover:underline">Open Email Log</Link>
            </div>
            {tplEmails.length === 0 ? (
              <p className="p-4 text-[12px] text-slate-500">No emails sent with this template yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-[12px]">
                {tplEmails.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-2">
                    <span className="truncate">{m.refId} · v{m.templateVersion}</span>
                    <span className="flex shrink-0 items-center gap-2 text-slate-500">{fmtDT(m.at)} <Badge tone={toneFor(m.status)}>{m.status}</Badge></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {testMail && (
        <Modal title="Test email logged" sub={`${testMail.id} · ${testMail.status} · ${fmtDT(testMail.at)}`} onClose={() => setTestMail(null)} width={620} footer={<button type="button" className={BTN_PRIMARY} onClick={() => setTestMail(null)}>Close</button>}>
          <dl className="grid grid-cols-[90px_1fr] gap-y-1.5 text-[12px]">
            <dt className="font-semibold text-slate-500">Template</dt><dd>{testMail.templateCode} · v{testMail.templateVersion}</dd>
            <dt className="font-semibold text-slate-500">To</dt><dd>{testMail.to.join(', ') || '—'}</dd>
            <dt className="font-semibold text-slate-500">CC</dt><dd>{testMail.cc.join(', ') || '—'}</dd>
            <dt className="font-semibold text-slate-500">Subject</dt><dd className="font-semibold">{testMail.subject}</dd>
          </dl>
          <pre className="mt-3 rounded-lg bg-slate-50 p-3 font-sans text-[12px] whitespace-pre-wrap">{testMail.body}</pre>
          <p className="mt-3 text-[11px] text-slate-500">Mock delivery — recorded in the Email Log with status {testMail.status}. No real email leaves the system.</p>
        </Modal>
      )}
    </div>
  )
}

function ChipPicker({ label, options, value, onToggle, error }: { label: string; options: string[]; value: string[]; onToggle: (v: string) => void; error?: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold text-ink">{label}</div>
      <div className={cn('flex flex-wrap gap-1.5 rounded-md border p-2', error ? 'border-brand-red' : 'border-line')}>
        {options.map((o) => (
          <button key={o} type="button" onClick={() => onToggle(o)} aria-pressed={value.includes(o)} className={cn('rounded-md border px-2 py-0.5 text-[11px]', value.includes(o) ? 'border-[#0066FF] bg-[#0066FF] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300')}>
            {o}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-[11px] text-brand-red">{error}</p>}
    </div>
  )
}
