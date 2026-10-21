import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlignCenter,
  AlignLeft,
  ArrowDown,
  Bold,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  CloudCheck,
  FileText,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Mail as MailIcon,
  Maximize2,
  MessageSquare,
  Minimize2,
  Minus,
  MoreVertical,
  Paperclip,
  PenLine,
  Redo2,
  Scissors,
  Send,
  ShieldCheck,
  ShieldX,
  SpellCheck,
  Sparkles,
  Table,
  Underline,
  Undo2,
  Wand2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import {
  ACCOUNTS,
  EMAIL_NOW,
  emailStore,
  fmtBytes,
  fullTime,
  getMail,
  isEmail,
  newMailId,
  removeMail,
  threadOf,
  trackerById,
  TRACKERS,
  upsertMail,
  type Attachment,
  type Mail,
} from '@/data/email'
import { createTask, NOW as TASK_NOW } from '@/data/tasks'
import { extractAction, fixGrammar, grammarIssues, htmlToText, improveTone, rewrite, shorten, suggestReply, textToHtml } from './ai'

const OWN = ACCOUNTS.map((a) => a.email)
const SIGNATURES: Record<string, string> = {
  'Support Team Signature': 'Regards,\nDexter India Support Team\nsupport@dexterindia.com · 1800-266-0124',
  'Finance Team Signature': 'Regards,\nDexter India Finance Team\nfinance@dexterindia.com',
  'Paras Dubey · Super administrator': 'Warm regards,\nParas Dubey\nSuper administrator · Dexter India',
}
const TEMPLATES = ['Case Update Template', 'Acknowledgement Template', 'Resolution Confirmation', 'Document Request']

function template(name: string, trackerId: string, toName: string) {
  const tr = trackerById(trackerId)
  const ref = tr ? ` (Tracker ID: ${tr.id})` : ''
  const hello = `Dear ${toName},`
  switch (name) {
    case 'Case Update Template':
      return `${hello}\n\nWe are writing to inform you that your complaint${ref} has been reviewed by our technical team. The issue has been identified and we are working on a resolution. We will update you shortly.\n\nPlease fine the attached report for your reference.`
    case 'Acknowledgement Template':
      return `${hello}\n\nThank you for contacting Dexter India. We have received your request${ref} and our team is working on it. You will hear from us within 24 hours.`
    case 'Resolution Confirmation':
      return `${hello}\n\nWe are pleased to confirm that your issue${ref} has been resolved. Kindly confirm that everything is working as expected so that we can close the case.`
    default:
      return `${hello}\n\nTo proceed with your request${ref}, please share the following documents:\n1. PAN card\n2. Cancelled cheque\n3. Address proof`
  }
}

const sigHtml = (name: string) => `<div data-sig="1">${textToHtml(SIGNATURES[name])}</div>`
const toIstMs = (date: string, time: string) => Date.parse(`${date}T${time || '00:00'}:00+05:30`)
const dateIn = (ms: number) => new Date(ms + 5.5 * 3600_000).toISOString().slice(0, 10)
const shortName = (label: string) => label.replace(/\s*\(.*\)$/, '')

type Init = {
  draftId?: string
  orig?: Mail
  from: string
  tracker: string
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  html: string
  attachments: Attachment[]
}

function salutationFor(email?: string) {
  const tr = TRACKERS.find((t) => t.customer.email === email)
  if (tr) return `Mr. ${tr.customer.name.split(' ').slice(-1)[0]}`
  const mail = emailStore.get().mails.find((m) => m.fromEmail === email)
  return mail ? mail.fromName.split(' ')[0] : 'Sir/Madam'
}

function buildInit(params: URLSearchParams, state: unknown): Init {
  const aiBody = (state as { body?: string } | null)?.body
  const draft = getMail(params.get('draft'))
  if (draft && draft.folder === 'drafts')
    return {
      draftId: draft.id,
      orig: getMail(draft.replyTo),
      from: draft.account,
      tracker: draft.tracker ?? '',
      to: draft.to,
      cc: draft.cc,
      bcc: draft.bcc,
      subject: draft.subject,
      html: draft.html ?? textToHtml(draft.body),
      attachments: draft.attachments,
    }
  const mode = params.has('reply') ? 'reply' : params.has('replyAll') ? 'replyAll' : params.has('forward') ? 'forward' : ''
  const orig = mode ? getMail(params.get(mode)) : undefined
  if (orig) {
    const tracker = orig.tracker ?? ''
    const acct = ACCOUNTS.find((a) => a.email === orig.account && a.authorized)?.email ?? 'support@dexterindia.com'
    const base = orig.subject.replace(/^(re|fwd?):\s*/i, '').replace(/^[A-Z]{3}-\d{4}-\d{5}\s*\|\s*/, '')
    const prefix = tracker ? `${tracker} | ` : ''
    const replyTo = orig.folder === 'inbox' ? [orig.fromEmail] : orig.to
    if (mode === 'forward')
      return {
        orig,
        from: acct,
        tracker,
        to: [],
        cc: [],
        bcc: [],
        subject: `${prefix}Fwd: ${base}`,
        html: textToHtml(`\n\n---------- Forwarded message ----------\nFrom: ${orig.fromName} <${orig.fromEmail}>\nDate: ${fullTime(orig.at)}\nSubject: ${orig.subject}\nTo: ${orig.to.join(', ')}\n\n${orig.body}`),
        attachments: orig.attachments,
      }
    return {
      orig,
      from: acct,
      tracker,
      to: replyTo,
      cc: mode === 'replyAll' ? [...orig.to, ...orig.cc].filter((e) => !OWN.includes(e) && !replyTo.includes(e)) : [],
      bcc: [],
      subject: `${prefix}Re: ${base}`,
      html: textToHtml(aiBody ?? `Dear ${salutationFor(replyTo[0])},\n\n`),
      attachments: [],
    }
  }
  const tracker = params.get('tracker') ?? ''
  const tr = trackerById(tracker)
  return {
    from: 'support@dexterindia.com',
    tracker,
    to: params.get('to') ? [params.get('to')!] : tr ? [tr.customer.email] : [],
    cc: [],
    bcc: [],
    subject: params.get('subject') ?? (tracker ? `${tracker} | ` : ''),
    html: aiBody ? textToHtml(aiBody) : '',
    attachments: [],
  }
}

export default function ComposeDialog() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const loc = useLocation()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const init = useMemo(() => buildInit(params, loc.state), [])
  const mails = emailStore.use().mails

  const [from, setFrom] = useState(init.from)
  const [tracker, setTracker] = useState(init.tracker)
  const [to, setTo] = useState<string[]>(init.to)
  const [cc, setCc] = useState<string[]>(init.cc)
  const [bcc, setBcc] = useState<string[]>(init.bcc)
  const [showCc, setShowCc] = useState(init.cc.length > 0)
  const [showBcc, setShowBcc] = useState(init.bcc.length > 0)
  const [subject, setSubject] = useState(init.subject)
  const [html, setHtml] = useState(init.html)
  const [attachments, setAttachments] = useState<Attachment[]>(init.attachments)
  const [tpl, setTpl] = useState('')
  const [sig, setSig] = useState('')
  const [follow, setFollow] = useState({ on: false, date: dateIn(EMAIL_NOW + 3 * 86400_000), text: 'Get customer confirmation' })
  const [meet, setMeet] = useState({ on: false, date: dateIn(EMAIL_NOW + 86400_000), time: '15:00', added: false })
  const [sched, setSched] = useState({ on: false, date: dateIn(EMAIL_NOW + 86400_000), time: '10:00' })
  const [draftId, setDraftId] = useState(init.draftId)
  const [save, setSave] = useState<'new' | 'dirty' | 'saved'>(init.draftId ? 'saved' : 'new')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [ignored, setIgnored] = useState<string[]>([])
  const [tonePreview, setTonePreview] = useState(false)
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [createdTask, setCreatedTask] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(false)
  const [mini, setMini] = useState(false)
  const [maxi, setMaxi] = useState(false)
  const [meetPop, setMeetPop] = useState(false)
  const editor = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editor.current) editor.current.innerHTML = init.html
  }, [init.html])

  const account = ACCOUNTS.find((a) => a.email === from) ?? ACCOUNTS[0]
  const tr = trackerById(tracker)
  const text = htmlToText(html)
  const orig = init.orig
  const contextMail = orig ?? mails.filter((m) => m.tracker && m.tracker === tracker && m.folder === 'inbox').sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]
  const prevThread = orig ? [orig, ...threadOf(orig, mails)] : tracker ? mails.filter((m) => m.tracker === tracker && m.folder !== 'drafts').sort((a, b) => Date.parse(b.at) - Date.parse(a.at)) : []
  const issues = grammarIssues(text).filter((i) => !ignored.includes(i.key))
  const toneDiff = text.trim() ? improveTone(text) !== text : false
  const action = extractAction(contextMail) ?? (tracker ? 'Create follow-up task to get customer confirmation on site visit' : undefined)
  const touch = () => setSave('dirty')

  // ---------- autosave ----------
  const persistDraft = (silent: boolean) => {
    const id = draftId ?? newMailId('d')
    const mail: Mail = {
      id,
      folder: 'drafts',
      threadId: orig?.threadId,
      fromName: shortName(account.label),
      fromEmail: account.email,
      to,
      cc,
      bcc,
      subject,
      body: htmlToText(editor.current?.innerHTML ?? html),
      html: editor.current?.innerHTML ?? html,
      at: new Date(EMAIL_NOW).toISOString(),
      read: true,
      starred: false,
      archived: false,
      tracker: tracker || undefined,
      priority: tr?.priority ?? orig?.priority ?? 'Normal',
      department: account.dept,
      account: account.email,
      status: 'Open',
      assigned: false,
      mention: false,
      followUp: false,
      attachments,
      replyTo: orig?.id,
    }
    upsertMail(mail)
    setDraftId(id)
    setSave('saved')
    if (!silent) toast('Draft saved to Drafts.')
  }
  useEffect(() => {
    if (save !== 'dirty') return
    const t = setTimeout(() => persistDraft(true), 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, from, tracker, to, cc, bcc, subject, html, attachments])

  const fromCase = !orig && !init.draftId && trackerById(params.get('tracker') ?? '') ? params.get('tracker') : null
  const close = () => nav(orig ? `/email/${orig.folder}?m=${orig.id}` : init.draftId ? '/email/drafts' : fromCase ? `/email/case/${fromCase}` : '/email/inbox')
  const cancel = () => {
    if (save === 'dirty' && (text || subject.trim() || to.length)) persistDraft(true)
    if (save === 'dirty' || draftId) toast('Draft kept in Drafts.', 'info')
    close()
  }
  useEffect(() => {
    const k = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && !mini && cancel()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  // ---------- editor helpers ----------
  const syncFromEditor = () => {
    setHtml(editor.current?.innerHTML ?? '')
    touch()
  }
  const setBody = (t: string, keepSig = true) => {
    if (!editor.current) return
    const sigEl = keepSig ? editor.current.querySelector('[data-sig]')?.outerHTML ?? '' : ''
    editor.current.innerHTML = textToHtml(t) + sigEl
    syncFromEditor()
  }
  const bodyWithoutSig = () => {
    if (!editor.current) return text
    const clone = editor.current.cloneNode(true) as HTMLElement
    clone.querySelector('[data-sig]')?.remove()
    return htmlToText(clone.innerHTML)
  }
  const exec = (cmd: string, val?: string) => {
    editor.current?.focus()
    document.execCommand(cmd, false, val)
    syncFromEditor()
  }
  const ai = (name: string, fn: (t: string) => string, needsText = true) => {
    const t = bodyWithoutSig()
    if (needsText && !t.trim()) return toast('Write something first — the AI works on your draft.', 'info')
    const out = fn(t)
    if (out === t) return toast(`${name}: no changes suggested.`, 'info')
    setBody(out)
    toast(`${name} applied · AI-generated (demo). Review before sending.`, 'info')
  }

  const applyIssue = (i: (typeof issues)[number]) => {
    if (!editor.current) return
    const re = new RegExp(i.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    editor.current.innerHTML = editor.current.innerHTML.replace(re, i.to)
    syncFromEditor()
    toast(`Replaced “${i.from}” with “${i.to}”.`)
  }

  const changeTracker = (v: string) => {
    const old = tracker ? `${tracker} | ` : ''
    setTracker(v)
    setSubject((s) => (old && s.startsWith(old) ? (v ? `${v} | ` : '') + s.slice(old.length) : v && !s.startsWith(v) ? `${v} | ${s}` : s))
    touch()
  }

  // ---------- follow-up task ----------
  const makeTask = (title: string, dueDate: string) => {
    const offset = Math.max(3600_000, toIstMs(dueDate, '17:00') - EMAIL_NOW)
    const t = createTask({
      title,
      description: `Follow-up from email “${subject || '(no subject)'}”${tracker ? ` on tracker ${tracker}` : ''}.`,
      expectedOutcome: `${title} — recorded on the tracker`,
      priority: tr?.priority === 'High' ? 'High' : 'Medium',
      department: account.dept === 'Legal' ? 'Legal' : account.dept === 'Finance' ? 'Finance' : account.dept === 'Verification' ? 'Verification' : 'Support',
      assignee: 'Rahul Kumar',
      dueMs: TASK_NOW + offset,
      entityId: tracker || undefined,
      entityLabel: tr ? `${tr.id} · ${tr.customer.name}` : undefined,
      source: 'Email',
    })
    return t.id
  }

  // ---------- send ----------
  const send = () => {
    const e: Record<string, string> = {}
    if (!account.authorized) e.from = `You are not authorized to send from ${account.email}.`
    if (!to.length) e.to = 'Add at least one recipient.'
    const prefixOnly = tracker && subject.trim() === `${tracker} |`
    if (!subject.trim() || prefixOnly) e.subject = 'Subject is required.'
    if (!text.trim()) e.body = 'Write a message before sending.'
    if (sched.on) {
      const ms = toIstMs(sched.date, sched.time)
      if (Number.isNaN(ms)) e.sched = 'Pick a valid date and time.'
      else if (ms <= EMAIL_NOW) e.sched = 'Scheduled time must be in the future (after 27 Aug 2025, 11:45 IST).'
    }
    if (follow.on && !follow.text.trim()) e.follow = 'Describe the follow-up task.'
    setErrors(e)
    if (Object.keys(e).length) return toast('Fix the highlighted fields before sending.', 'info')

    const taskId = follow.on ? makeTask(follow.text.trim(), follow.date) : undefined
    const later = mails.filter((m) => Date.parse(m.at) >= EMAIL_NOW).length
    const id = newMailId('s')
    const finalHtml = editor.current?.innerHTML ?? html
    const mail: Mail = {
      id,
      folder: 'sent',
      threadId: orig?.threadId ?? (tracker ? `th-${tracker}` : undefined),
      fromName: shortName(account.label),
      fromEmail: account.email,
      to,
      cc,
      bcc,
      subject: subject.trim(),
      body: htmlToText(finalHtml),
      html: finalHtml,
      at: new Date(EMAIL_NOW + (later + 1) * 60_000).toISOString(),
      scheduledAt: sched.on ? new Date(toIstMs(sched.date, sched.time)).toISOString() : undefined,
      sendState: sched.on ? 'Scheduled' : 'Sent',
      read: true,
      starred: false,
      archived: false,
      tracker: tracker || undefined,
      priority: tr?.priority ?? orig?.priority ?? 'Normal',
      department: account.dept,
      account: account.email,
      status: 'Open',
      assigned: false,
      mention: false,
      followUp: follow.on,
      attachments,
      meeting: meet.on ? `Meeting · ${fullTime(new Date(toIstMs(meet.date, meet.time)).toISOString())} IST` : undefined,
      followUpTask: taskId,
    }
    upsertMail(mail)
    if (draftId) removeMail(draftId)
    toast(
      `${sched.on ? `Scheduled for ${fullTime(mail.scheduledAt!)} IST` : `Email sent to ${to[0]}${to.length > 1 ? ` +${to.length - 1}` : ''}`}${tracker ? ` · added to ${tracker} timeline` : ''}${taskId ? ` · follow-up ${taskId} created` : ''}.`,
    )
    nav(`/email/sent?m=${id}`)
  }

  const saveLabel = { new: 'New draft · autosaves as you type', dirty: 'Saving draft…', saved: 'Draft saved · All changes up to date' }[save]
  const confidence = issues.length === 0 && to.length > 0 && subject.trim() && text.trim() ? 'High' : issues.length <= 1 ? 'Medium' : 'Low'
  const toName = salutationFor(to[0])

  if (mini)
    return (
      <div className="fixed right-4 bottom-4 z-50 flex w-80 items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 shadow-2xl">
        <MailIcon size={16} className="text-primary" />
        <button onClick={() => setMini(false)} className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold">
          {subject || 'Compose Email'}
        </button>
        <button aria-label="Restore" onClick={() => setMini(false)} className="text-muted">
          <Maximize2 size={14} />
        </button>
        <button aria-label="Close" onClick={cancel} className="text-muted">
          <X size={15} />
        </button>
      </div>
    )

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-0 sm:p-4 lg:top-[72px] lg:left-[264px] lg:items-start lg:justify-items-end lg:bg-[#0b1530]/[0.14] lg:pt-[max(16px,calc(100vh-1100px))] lg:pr-8" onMouseDown={(e) => e.target === e.currentTarget && cancel()}>
      <div role="dialog" aria-modal="true" aria-label="Compose Email" className={cn('flex w-full flex-col bg-white shadow-2xl', maxi ? 'h-full max-h-full sm:rounded-none' : 'h-full max-h-full sm:h-auto sm:max-h-[94vh] sm:max-w-[1220px] sm:rounded-xl')}>
        {/* Header */}
        <header className="flex items-start gap-3 border-b border-line px-4 py-3 sm:px-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
            <MailIcon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold">Compose Email</h2>
            <p className="text-[10.5px] text-muted">Send an email to your customer or team.{tracker ? ` This email will be automatically linked to Tracker: ${tracker}` : ' Link a tracker to save it in the case history.'}</p>
          </div>
          <div className="flex items-center gap-1 text-muted">
            <button aria-label="Minimize" onClick={() => setMini(true)} className="grid h-8 w-8 place-items-center rounded hover:bg-surface">
              <Minus size={16} />
            </button>
            <button aria-label={maxi ? 'Restore size' : 'Maximize'} onClick={() => setMaxi((v) => !v)} className="hidden h-8 w-8 place-items-center rounded hover:bg-surface sm:grid">
              {maxi ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button aria-label="Close" onClick={cancel} className="grid h-8 w-8 place-items-center rounded hover:bg-surface">
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_290px]">
            {/* LEFT */}
            <div className="min-w-0 space-y-4">
              {/* Account / tracker / permission */}
              <div className="grid gap-4 rounded-xl border border-line bg-surface/60 p-4 md:grid-cols-[1.35fr_auto_1fr_auto_1fr] md:items-center">
                <div className="flex min-w-0 gap-3">
                  <MailIcon size={20} className="mt-6 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-primary">From (Authorized Account)</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <select
                        aria-label="From account"
                        value={from}
                        onChange={(e) => {
                          setFrom(e.target.value)
                          touch()
                        }}
                        className="h-8 min-w-0 rounded-md border border-line bg-white px-2 text-[10.5px]"
                      >
                        {ACCOUNTS.map((a) => (
                          <option key={a.email} value={a.email}>
                            {a.email}
                          </option>
                        ))}
                      </select>
                      {account.authorized ? (
                        <span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                          <Check size={12} /> Authorized
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">
                          <X size={12} /> Not authorized
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-[9.5px] text-muted">{account.label}</div>
                    {errors.from && <p className="mt-1 text-[10px] text-brand-red">{errors.from}</p>}
                  </div>
                </div>
                <span className="hidden h-14 w-px bg-line md:block" />
                <div className="flex min-w-0 gap-2.5">
                  <FileText size={18} className="mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-ink">Linked Tracker</div>
                    <label className="relative mt-1 inline-flex items-center">
                      <select aria-label="Linked tracker" value={tracker} onChange={(e) => changeTracker(e.target.value)} className="cursor-pointer appearance-none bg-transparent pr-4 text-[11px] font-semibold text-primary outline-none">
                        <option value="">No tracker</option>
                        {TRACKERS.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.id}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="pointer-events-none absolute right-0 text-primary" />
                    </label>
                    <div className="mt-1 text-[9.5px] text-muted">{tracker ? 'This email will be saved in the tracker history.' : 'Not linked to a case.'}</div>
                  </div>
                </div>
                <span className="hidden h-14 w-px bg-line md:block" />
                <div className="flex min-w-0 gap-2.5">
                  {account.authorized ? <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" /> : <ShieldX size={18} className="mt-0.5 shrink-0 text-red-600" />}
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-ink">Permission</div>
                    <p className="mt-1 text-[9.5px] text-muted">{account.authorized ? 'You are authorized to send from this account.' : 'You are not authorized to send from this account. Choose another account or request access from the Legal head.'}</p>
                  </div>
                </div>
              </div>

              {/* Recipients */}
              <div className="grid gap-3">
                <div className="grid gap-1 sm:grid-cols-[64px_1fr] sm:items-start">
                  <span className="pt-2 text-[11px] font-semibold">To *</span>
                  <div className="flex items-start gap-2">
                    <ChipInput label="To" value={to} onChange={(v) => { setTo(v); touch() }} error={errors.to} placeholder="Add recipients…" />
                    <div className="flex shrink-0 gap-2 pt-2 text-[10.5px] font-semibold text-primary">
                      <button onClick={() => setShowCc((v) => !v)} className={cn(showCc && 'underline')}>
                        CC
                      </button>
                      <button onClick={() => setShowBcc((v) => !v)} className={cn(showBcc && 'underline')}>
                        BCC
                      </button>
                    </div>
                  </div>
                </div>
                {showCc && (
                  <div className="grid gap-1 sm:grid-cols-[64px_1fr] sm:items-start">
                    <span className="pt-2 text-[11px] font-semibold">CC</span>
                    <ChipInput label="CC" value={cc} onChange={(v) => { setCc(v); touch() }} placeholder="Add CC…" />
                  </div>
                )}
                {showBcc && (
                  <div className="grid gap-1 sm:grid-cols-[64px_1fr] sm:items-start">
                    <span className="pt-2 text-[11px] font-semibold">BCC</span>
                    <ChipInput label="BCC" value={bcc} onChange={(v) => { setBcc(v); touch() }} placeholder="Add BCC…" />
                  </div>
                )}
                <div className="grid gap-1 sm:grid-cols-[64px_1fr] sm:items-start">
                  <label htmlFor="cm-subject" className="pt-2 text-[11px] font-semibold">
                    Subject *
                  </label>
                  <div>
                    <input
                      id="cm-subject"
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value)
                        touch()
                      }}
                      className={cn('h-8 w-full rounded-md border px-3 text-[11px] outline-none focus:border-primary', errors.subject ? 'border-brand-red' : 'border-line')}
                    />
                    {errors.subject && <p className="mt-1 text-[10px] text-brand-red">{errors.subject}</p>}
                  </div>
                </div>
              </div>

              {/* Editor */}
              <div className={cn('rounded-xl border', errors.body ? 'border-brand-red' : 'border-line')}>
                <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-2 py-1.5 text-ink-2">
                  <select
                    aria-label="Paragraph style"
                    onChange={(e) => {
                      exec('formatBlock', e.target.value)
                      e.target.value = 'p'
                    }}
                    defaultValue="p"
                    className="mr-1 h-8 rounded px-1 text-[10.5px] outline-none hover:bg-surface"
                  >
                    <option value="p">Normal</option>
                    <option value="h3">Heading</option>
                    <option value="blockquote">Quote</option>
                  </select>
                  <Tool label="Bold" onClick={() => exec('bold')}>
                    <Bold size={14} />
                  </Tool>
                  <Tool label="Italic" onClick={() => exec('italic')}>
                    <Italic size={14} />
                  </Tool>
                  <Tool label="Underline" onClick={() => exec('underline')}>
                    <Underline size={14} />
                  </Tool>
                  <Tool label="Bulleted list" onClick={() => exec('insertUnorderedList')}>
                    <List size={14} />
                  </Tool>
                  <Tool label="Numbered list" onClick={() => exec('insertOrderedList')}>
                    <ListOrdered size={14} />
                  </Tool>
                  <Tool label="Align left" onClick={() => exec('justifyLeft')}>
                    <AlignLeft size={14} />
                  </Tool>
                  <Tool label="Align center" onClick={() => exec('justifyCenter')}>
                    <AlignCenter size={14} />
                  </Tool>
                  <Tool
                    label="Insert link"
                    onClick={() => {
                      const url = window.prompt('Link URL (https://…)')
                      if (!url) return
                      if (!/^(https?:|mailto:)/i.test(url.trim())) return toast('Links must start with https://, http:// or mailto:.', 'info')
                      exec('createLink', url.trim())
                    }}
                  >
                    <Link2 size={14} />
                  </Tool>
                  <Tool label="Attach image" onClick={() => fileRef.current?.click()}>
                    <ImageIcon size={14} />
                  </Tool>
                  <Tool
                    label="Insert table"
                    onClick={() => exec('insertHTML', '<table style="border-collapse:collapse;width:100%"><tbody><tr><td style="border:1px solid #d6dce8;padding:4px">&nbsp;</td><td style="border:1px solid #d6dce8;padding:4px">&nbsp;</td></tr><tr><td style="border:1px solid #d6dce8;padding:4px">&nbsp;</td><td style="border:1px solid #d6dce8;padding:4px">&nbsp;</td></tr></tbody></table><p><br></p>')}
                  >
                    <Table size={14} />
                  </Tool>
                  <Tool label="Undo" onClick={() => exec('undo')}>
                    <Undo2 size={14} />
                  </Tool>
                  <Tool label="Redo" onClick={() => exec('redo')}>
                    <Redo2 size={14} />
                  </Tool>
                </div>
                <div
                  ref={editor}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Message body"
                  onInput={syncFromEditor}
                  data-placeholder="Write your message…"
                  className="min-h-[200px] px-4 py-3 text-[11px] leading-relaxed text-ink outline-none empty:before:text-muted empty:before:content-[attr(data-placeholder)] [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:text-ink-2 [&_h3]:text-[13px] [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
                />
                {errors.body && <p className="px-4 pb-2 text-[10px] text-brand-red">{errors.body}</p>}
                <div className="flex flex-wrap justify-center gap-2 px-3 pt-1 pb-3">
                  <AiBtn icon={<SpellCheck size={14} />} onClick={() => ai('Fix Grammar', fixGrammar)}>
                    Fix Grammar
                  </AiBtn>
                  <AiBtn icon={<PenLine size={14} />} onClick={() => ai('Improve Tone', improveTone)}>
                    Improve Tone
                  </AiBtn>
                  <AiBtn icon={<Scissors size={14} />} onClick={() => ai('Shorten', shorten)}>
                    Shorten
                  </AiBtn>
                  <AiBtn icon={<Wand2 size={14} />} onClick={() => ai('Rewrite', (t) => rewrite(t, { tracker, to: to[0] }))}>
                    Rewrite
                  </AiBtn>
                  <AiBtn icon={<Sparkles size={14} />} onClick={() => ai('Suggest Reply', () => suggestReply(contextMail), false)}>
                    Suggest Reply
                  </AiBtn>
                </div>
              </div>

              {/* Attachments / template / signature */}
              <div className="grid gap-4 md:grid-cols-[1.3fr_1fr_1fr]">
                <div className="min-w-0">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Paperclip size={13} className="text-muted" /> Attachments ({attachments.length})
                    </span>
                    <button onClick={() => fileRef.current?.click()} className="text-[10px] text-primary hover:underline">
                      + Add Files
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? [])
                        const big = files.filter((f) => f.size > 20 * 1024 * 1024)
                        const ok = files.filter((f) => f.size <= 20 * 1024 * 1024).map((f) => ({ name: f.name, size: f.size }))
                        if (big.length) toast(`${big.map((f) => f.name).join(', ')} exceed 20 MB and were skipped.`, 'info')
                        if (ok.length) {
                          setAttachments((a) => [...a, ...ok])
                          touch()
                        }
                        e.target.value = ''
                      }}
                    />
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {attachments.map((a, i) => (
                      <div key={a.name + i} className="relative flex items-center gap-2 rounded-lg border border-line px-2.5 py-2">
                        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded', /\.(png|jpe?g)$/i.test(a.name) ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                          {/\.(png|jpe?g)$/i.test(a.name) ? <ImageIcon size={14} /> : <FileText size={14} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[10.5px] font-medium">{a.name}</span>
                          <span className="block text-[10px] text-muted">{fmtBytes(a.size)}</span>
                        </span>
                        <AttachmentMenu
                          name={a.name}
                          onRemove={() => {
                            setAttachments((x) => x.filter((_, j) => j !== i))
                            touch()
                          }}
                        />
                      </div>
                    ))}
                    {!attachments.length && <p className="text-[10px] text-muted">No files attached · up to 20 MB each.</p>}
                  </div>
                </div>
                <label className="block text-[10.5px] font-semibold">
                  Email Template <span className="font-normal text-muted">(Optional)</span>
                  <select
                    value={tpl}
                    onChange={(e) => {
                      const v = e.target.value
                      setTpl(v)
                      if (!v) return
                      setBody(template(v, tracker, toName))
                      toast(`${v} inserted.`)
                    }}
                    className="mt-1.5 h-8 w-full rounded-md border border-line bg-white px-2 text-[10.5px] font-normal"
                  >
                    <option value="">Select template</option>
                    {TEMPLATES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-[10.5px] font-semibold">
                  Signature <span className="font-normal text-muted">(Optional)</span>
                  <select
                    value={sig}
                    onChange={(e) => {
                      const v = e.target.value
                      setSig(v)
                      if (!editor.current) return
                      editor.current.querySelector('[data-sig]')?.remove()
                      if (v) editor.current.insertAdjacentHTML('beforeend', sigHtml(v))
                      syncFromEditor()
                    }}
                    className="mt-1.5 h-8 w-full rounded-md border border-line bg-white px-2 text-[10.5px] font-normal"
                  >
                    <option value="">No signature</option>
                    {Object.keys(SIGNATURES).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Follow-up / meeting / schedule */}
              <div className="space-y-3 border-t border-line pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Check2 checked={follow.on} onChange={(v) => setFollow({ ...follow, on: v })}>
                    Follow-up Task
                  </Check2>
                  <DateInput label="Follow-up date" disabled={!follow.on} value={follow.date} onChange={(v) => setFollow({ ...follow, date: v })} />
                  <input
                    aria-label="Follow-up task"
                    disabled={!follow.on}
                    value={follow.text}
                    onChange={(e) => setFollow({ ...follow, text: e.target.value })}
                    className={cn('h-8 w-[170px] min-w-0 rounded-md border px-2 text-[10px] disabled:opacity-50', errors.follow ? 'border-brand-red' : 'border-line')}
                  />
                  <Check2 checked={meet.on} onChange={(v) => setMeet({ ...meet, on: v, added: false })}>
                    Create Meeting
                  </Check2>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!meet.on}
                      onClick={() => setMeetPop((v) => !v)}
                      className="flex h-8 items-center gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-3 text-[10px] font-semibold text-primary disabled:opacity-50"
                    >
                      {meet.added ? <Check size={13} className="text-emerald-600" /> : <CalendarPlus size={13} />}
                      {meet.added ? `Added · ${fullTime(new Date(toIstMs(meet.date, meet.time)).toISOString())}` : 'Add to Calendar'}
                    </button>
                    {meetPop && meet.on && (
                      <div className="absolute bottom-11 left-0 z-20 w-64 space-y-2 rounded-lg border border-line bg-white p-3 shadow-lg">
                        <div className="text-[10.5px] font-semibold">Meeting slot (IST)</div>
                        <div className="flex gap-2">
                          <input aria-label="Meeting date" type="date" value={meet.date} onChange={(e) => setMeet({ ...meet, date: e.target.value, added: false })} className="h-8 min-w-0 flex-1 rounded-md border border-line px-2 text-[10.5px]" />
                          <input aria-label="Meeting time" type="time" value={meet.time} onChange={(e) => setMeet({ ...meet, time: e.target.value, added: false })} className="h-8 rounded-md border border-line px-2 text-[10.5px]" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setMeetPop(false)}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setMeet({ ...meet, added: true })
                              setMeetPop(false)
                              toast(`Meeting added to calendar · ${fullTime(new Date(toIstMs(meet.date, meet.time)).toISOString())} IST${to.length ? ` · invite to ${to.join(', ')}` : ''}.`)
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {errors.follow && <p className="text-[10px] text-brand-red">{errors.follow}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <Check2 checked={sched.on} onChange={(v) => setSched({ ...sched, on: v })}>
                    Schedule Send
                  </Check2>
                  <DateInput label="Schedule date" disabled={!sched.on} value={sched.date} onChange={(v) => setSched({ ...sched, date: v })} />
                  <TimeInput label="Schedule time" disabled={!sched.on} value={sched.time} onChange={(v) => setSched({ ...sched, time: v })} />
                  <span className="text-[9.5px] text-muted">India Standard Time (IST)</span>
                </div>
                {errors.sched && <p className="text-[10px] text-brand-red">{errors.sched}</p>}
              </div>

              {/* Previous thread */}
              {prevThread.length > 0 && (
                <div className="rounded-xl border border-line bg-surface/60">
                  <div className="flex items-center justify-between px-4 py-2.5 text-[10.5px]">
                    <button onClick={() => setPrevOpen((v) => !v)} className="flex items-center gap-1.5 font-semibold">
                      <ChevronDown size={14} className={cn('transition-transform', !prevOpen && '-rotate-90')} /> Previous Thread ({prevThread.length})
                    </button>
                    <Link to={`/email/${prevThread[0].folder}?m=${prevThread[0].id}`} className="text-primary hover:underline">
                      View Full Thread
                    </Link>
                  </div>
                  {prevOpen &&
                    prevThread.map((m) => (
                      <div key={m.id} className="border-t border-line px-4 py-2.5 text-[10.5px]">
                        <div className="flex flex-wrap justify-between gap-2">
                          <span className="font-semibold">{m.folder === 'inbox' ? m.fromName : `To: ${m.to.join(', ')}`}</span>
                          <span className="text-muted">{fullTime(m.at)}</span>
                        </div>
                        <div className="text-ink-2">{m.subject}</div>
                        <p className="mt-1 line-clamp-2 text-muted">{m.body.replace(/\s+/g, ' ')}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* RIGHT · AI panel */}
            <aside className="min-w-0 space-y-3 rounded-xl border border-line bg-surface/40 p-3">
              <div className="flex items-center gap-2 px-1">
                <Sparkles size={16} className="text-primary" />
                <span className="text-[12px] font-semibold text-primary">AI Email Assistant</span>
                <span className="ml-auto rounded bg-primary-soft px-1.5 py-0.5 text-[9px] font-semibold text-primary">BETA</span>
              </div>
              <p className="px-1 text-[10px] text-muted">
                Suggestions to improve your email.
                <br />
                You stay in control.
              </p>

              <AiCard icon={<CheckCircle2 size={15} className="text-emerald-700" />} title="Grammar & Spelling">
                {issues.length ? (
                  <>
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      {issues.length} Suggestion{issues.length > 1 ? 's' : ''}
                    </span>
                    <p className="mt-2 text-[10.5px] text-ink-2">“{issues[0].before}”</p>
                    <ArrowDown size={13} className="my-1 text-emerald-600" />
                    <p className="text-[10.5px] text-emerald-700">“{issues[0].after}”</p>
                    <div className="mt-2 flex justify-end gap-2">
                      <MiniBtn onClick={() => applyIssue(issues[0])}>Apply</MiniBtn>
                      <MiniBtn onClick={() => setIgnored((x) => [...x, issues[0].key])}>Ignore</MiniBtn>
                    </div>
                  </>
                ) : (
                  <p className="text-[10.5px] text-muted">{text.trim() ? 'No spelling or grammar issues found.' : 'Start writing to get suggestions.'}</p>
                )}
              </AiCard>

              <AiCard icon={<Sparkles size={15} className="text-primary" />} title="Tone Suggestion">
                {toneDiff ? (
                  <>
                    <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">More Professional</span>
                    <p className="mt-2 text-[10.5px] text-ink-2">Your email tone can be more professional and customer-friendly.</p>
                    {tonePreview && <p className="mt-2 rounded bg-white p-2 text-[10.5px] whitespace-pre-line text-ink">{improveTone(bodyWithoutSig())}</p>}
                    <div className="mt-2 flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { ai('Improve Tone', improveTone); setTonePreview(false) }}>
                        Apply
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setTonePreview((v) => !v)}>
                        {tonePreview ? 'Hide' : 'Preview'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-[10.5px] text-muted">{text.trim() ? 'Tone looks professional.' : 'Tone is checked as you write.'}</p>
                )}
              </AiCard>

              <AiCard icon={<MessageSquare size={15} className="text-primary" />} title="Suggested Reply">
                <p className="text-[10.5px] text-ink-2">{tracker ? 'Based on this tracker, AI suggests a follow up response.' : 'AI suggests a response based on the conversation.'}</p>
                {showSuggestion && <p className="mt-2 rounded bg-white p-2 text-[10.5px] whitespace-pre-line text-ink">{suggestReply(contextMail)}</p>}
                <div className="mt-2 flex justify-end gap-2">
                  {showSuggestion && (
                    <Button size="sm" variant="secondary" onClick={() => { setBody(suggestReply(contextMail)); toast('Suggested reply inserted · AI-generated (demo).', 'info') }}>
                      Insert
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setShowSuggestion((v) => !v)}>
                    {showSuggestion ? 'Hide' : 'View Suggestion'}
                  </Button>
                </div>
              </AiCard>

              <AiCard icon={<ClipboardList size={15} className="text-amber-600" />} title="Extracted Action (AI)">
                {action ? (
                  <>
                    <p className="text-[10.5px] text-ink-2">{action}.</p>
                    <div className="mt-2 flex justify-end">
                      {createdTask ? (
                        <Link to={`/tasks/my/${createdTask}`} className="text-[10.5px] font-semibold text-emerald-700 hover:underline">
                          ✓ {createdTask} created
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const id = makeTask(action.replace(/^Create follow-up task to /i, '').replace(/^\w/, (c) => c.toUpperCase()), follow.date)
                            setCreatedTask(id)
                            toast(`${id} created in Tasks · assigned to Rahul Kumar.`)
                          }}
                        >
                          Create Task
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-[10.5px] text-muted">No action items detected.</p>
                )}
              </AiCard>

              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3">
                <CheckCircle2 size={16} className={confidence === 'High' ? 'text-emerald-600' : 'text-amber-600'} />
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-semibold text-ink">AI Confidence</div>
                  <div className="text-[10px] text-muted">{confidence === 'High' ? 'This email looks good to send.' : `Review ${[issues.length ? `${issues.length} suggestion${issues.length > 1 ? 's' : ''}` : '', !to.length ? 'recipients' : '', !text.trim() ? 'message body' : ''].filter(Boolean).join(', ') || 'the subject'} before sending.`}</div>
                </div>
                <span className={cn('text-[10.5px] font-semibold', confidence === 'High' ? 'text-emerald-700' : confidence === 'Medium' ? 'text-amber-700' : 'text-red-600')}>{confidence}</span>
              </div>
            </aside>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 sm:px-5">
          <span className={cn('flex items-center gap-1.5 text-[10.5px]', save === 'saved' ? 'text-emerald-700' : 'text-muted')}>
            <CloudCheck size={15} /> {saveLabel}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => persistDraft(false)}>
              Save Draft
            </Button>
            <Button variant="secondary" onClick={cancel}>
              Cancel
            </Button>
            <Button icon={sched.on ? <CalendarDays size={15} /> : <Send size={15} />} onClick={send}>
              {sched.on ? 'Schedule Send' : 'Send Email'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function ChipInput({ label, value, onChange, error, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; error?: string; placeholder?: string }) {
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const commit = (raw: string) => {
    const parts = raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean)
    if (!parts.length) return
    const bad = parts.filter((p) => !isEmail(p))
    const good = parts.filter((p) => isEmail(p) && !value.includes(p))
    if (good.length) onChange([...value, ...good])
    setErr(bad.length ? `${bad.join(', ')} ${bad.length > 1 ? 'are not valid email addresses' : 'is not a valid email address'}.` : '')
    setDraft(bad.join(', '))
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ';', 'Tab'].includes(e.key) && draft.trim()) {
      e.preventDefault()
      commit(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
  }
  const shown = err || error
  return (
    <div className="min-w-0 flex-1">
      <div className={cn('flex min-h-8 py-1! flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 focus-within:border-primary', shown ? 'border-brand-red' : 'border-line')}>
        {value.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded bg-primary-soft px-2 py-0.5 text-[10.5px] font-medium text-primary">
            {v}
            <button aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input aria-label={label} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={() => draft.trim() && commit(draft)} placeholder={value.length ? '' : placeholder} className="h-7 min-w-[140px] flex-1 bg-transparent text-[11px] outline-none" />
      </div>
      {shown && <p className="mt-1 text-[10px] text-brand-red">{shown}</p>}
    </div>
  )
}

function Tool({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="grid h-8 w-8 place-items-center rounded hover:bg-surface hover:text-primary">
      {children}
    </button>
  )
}
function AiBtn({ icon, onClick, children }: { icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[10.5px] font-semibold text-primary hover:border-primary/50 hover:bg-primary-soft/50">
      {icon}
      {children}
    </button>
  )
}
function AiCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-ink">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}
function Check2({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[10.5px] font-semibold text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#1e3f95]" />
      {children}
    </label>
  )
}
function DateInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const txt = value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pick date'
  return (
    <span className={cn('relative inline-flex', disabled && 'opacity-50')}>
      <button type="button" disabled={disabled} onClick={() => ref.current?.showPicker?.()} className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[10px] font-semibold text-primary">
        <CalendarDays size={13} /> {txt}
      </button>
      <input ref={ref} aria-label={label} type="date" disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} tabIndex={-1} className="pointer-events-none absolute inset-0 opacity-0" />
    </span>
  )
}
function TimeInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const [h, m] = (value || '00:00').split(':').map(Number)
  const txt = `${String(((h + 11) % 12) + 1).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
  return (
    <span className={cn('relative inline-flex', disabled && 'opacity-50')}>
      <button type="button" disabled={disabled} onClick={() => ref.current?.showPicker?.()} className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[10px] font-semibold text-primary">
        <Clock3 size={13} /> {txt}
      </button>
      <input ref={ref} aria-label={label} type="time" disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} tabIndex={-1} className="pointer-events-none absolute inset-0 opacity-0" />
    </span>
  )
}
function MiniBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="h-7 rounded-md border border-line bg-white px-2.5 text-[10px] font-semibold text-primary hover:border-primary/40">
      {children}
    </button>
  )
}
function AttachmentMenu({ name, onRemove }: { name: string; onRemove: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative">
      <button type="button" aria-label={`Options for ${name}`} onClick={() => setOpen((v) => !v)} className="grid h-6 w-6 place-items-center text-muted hover:text-primary">
        <MoreVertical size={14} />
      </button>
      {open && (
        <span className="absolute top-7 right-0 z-20 w-32 rounded-md border border-line bg-white p-1 shadow-lg" onMouseLeave={() => setOpen(false)}>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onRemove()
            }}
            className="w-full rounded px-2 py-1.5 text-left text-[10.5px] text-brand-red hover:bg-surface"
          >
            Remove
          </button>
        </span>
      )}
    </span>
  )
}
