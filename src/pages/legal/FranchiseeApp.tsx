import { useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, Bell, CheckCircle2, ChevronDown, ChevronRight, Clock3, Download, FileText, Files, HelpCircle, House, Lock, Mail, Phone, Send, UploadCloud, UserRound, X,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import {
  DOC_META, LEGAL_STATUSES, currentVersion, docsForSite, fmtDate, fmtDateTime, fmtShort, getDoc, getSite, recordAccess, submitSignedUpload, useLegal,
  type LegalDoc, type LegalSite, type LegalStatus,
} from '@/data/legal'
import { StatusBadge } from './ui'

const FRANCHISE_ID = 'FR-MH-00124'
const MAX_MB = 10
type AppTab = 'home' | 'documents' | 'support' | 'profile'

/** Franchisee mobile app (Rahul Patil · Shree Sai Financial Services), rendered in a 390px phone frame. */
export default function FranchiseeApp() {
  const { docId } = useParams()
  const state = useLegal()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const sites = state.sites.filter((s) => s.franchiseId === FRANCHISE_ID)
  const doc = docId ? getDoc(state, docId) : undefined
  if (docId && (!doc || !sites.some((s) => s.id === doc.siteId))) return <Navigate to="/franchisee-app" replace />

  const siteId = doc?.siteId ?? (sites.find((s) => s.id === params.get('site'))?.id || sites[0].id)
  const site = getSite(state, siteId)!
  const tab = (doc ? 'documents' : ((params.get('tab') as AppTab) ?? 'documents')) as AppTab
  const go = (t: AppTab) => navigate(`/franchisee-app?site=${siteId}${t === 'documents' ? '' : `&tab=${t}`}`)
  const persona = { name: site.signatory, role: 'Franchisee' }

  let screen: ReactNode
  if (doc) screen = <AgreementAction key={doc.id} doc={doc} site={site} persona={persona} onHelp={() => go('support')} />
  else if (tab === 'home') screen = <HomeScreen sites={sites} docsOf={(id) => docsForSite(state, id)} persona={persona.name} onOpen={(id) => navigate(`/franchisee-app/${id}`)} />
  else if (tab === 'support') screen = <SupportScreen />
  else if (tab === 'profile') screen = <ProfileScreen site={site} sites={sites} />
  else
    screen = (
      <Dashboard
        site={site}
        sites={sites}
        docs={docsForSite(state, site.id)}
        persona={persona.name}
        onSite={(id) => setParams({ site: id })}
        onOpen={(id) => navigate(`/franchisee-app/${id}`)}
      />
    )

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Franchisee App</h1>
          <p className="mt-1 text-[14px] text-muted">Mobile preview · signed in as {persona.name} · uploads and downloads sync to Legal Data and the document audit log</p>
        </div>
        <Link to={doc ? `/legal/${doc.siteId}/documents/${doc.id}` : `/legal/${site.id}`} className="text-[13px] font-semibold text-primary hover:underline">
          Open in Legal workspace →
        </Link>
      </div>

      <div className="flex justify-center">
        <div className="w-full max-w-[390px] rounded-[44px] bg-navy-900 p-2.5 shadow-2xl">
          <div className="relative flex h-[min(820px,calc(100vh-170px))] min-h-[640px] flex-col overflow-hidden rounded-[36px] bg-surface">
            {/* status bar */}
            <div className="flex h-9 shrink-0 items-center justify-between bg-white px-6 text-[11px] font-semibold">
              <span>9:41</span>
              <span className="h-5 w-24 rounded-full bg-navy-900" />
              <span>5G ▮▮▮</span>
            </div>
            {/* app header */}
            <header className="flex shrink-0 items-center gap-2.5 border-b border-line bg-white px-4 py-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-[11px] font-bold text-white">DX</span>
              <div className="leading-tight">
                <div className="text-[13px] font-semibold">Dexter India</div>
                <div className="text-[9px] font-semibold tracking-widest text-muted">OPERATIONS CRM</div>
              </div>
              <button aria-label="Notifications" onClick={() => toast('No new notifications', 'info')} className="ml-auto grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface">
                <Bell size={17} />
              </button>
              <button aria-label="Profile" onClick={() => go('profile')} className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                {persona.name.split(' ').map((p) => p[0]).join('')}
              </button>
            </header>
            <div className="scroll-thin flex-1 overflow-y-auto px-4 py-4">{screen}</div>
            {/* bottom nav */}
            <nav className="grid shrink-0 grid-cols-4 border-t border-line bg-white pt-1.5 pb-3">
              {(
                [
                  ['home', 'Home', House],
                  ['documents', 'Documents', Files],
                  ['support', 'Support', HelpCircle],
                  ['profile', 'Profile', UserRound],
                ] as const
              ).map(([key, label, Icon]) => (
                <button key={key} onClick={() => go(key)} className={cn('flex flex-col items-center gap-0.5 py-1 text-[10px]', tab === key ? 'font-semibold text-primary' : 'text-muted')}>
                  <Icon size={19} />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── Screens ─────────────────────────

function cardLine(d: LegalDoc) {
  const m = DOC_META[d.kind]
  const up = d.uploads.filter((u) => u.version === d.version).pop()
  switch (d.status) {
    case 'Action Required':
      return `Sign all ${m.pages} pages · Due ${fmtDate(d.dueDate)}`
    case 'Under Review':
      return `Submitted ${fmtShort(up?.uploadedAt)} · Awaiting verification`
    case 'Approved':
      return `Approved ${fmtShort(up?.reviewedAt)} · Signed copy available`
    default:
      return d.feedback ? d.feedback.replace(/\.$/, '').replace('. ', ' · ') : 'Review the feedback and upload again'
  }
}
const ACTION: Record<LegalStatus, string> = {
  'Action Required': 'Download & sign',
  'Under Review': 'View submission',
  Approved: 'View document',
  'Resubmission Required': 'Review feedback',
}

function Dashboard({ site, sites, docs, persona, onSite, onOpen }: { site: LegalSite; sites: LegalSite[]; docs: LegalDoc[]; persona: string; onSite: (id: string) => void; onOpen: (id: string) => void }) {
  const attention = docs.filter((d) => d.status === 'Action Required' || d.status === 'Resubmission Required').length
  return (
    <div>
      <h2 className="text-[20px] font-semibold">Your documents</h2>
      <p className="text-[12px] text-muted">
        {persona} · {site.franchiseName}
      </p>

      <label className="relative mt-3 block rounded-xl border border-line bg-white px-3 py-2.5">
        <span className="block text-[13px] font-semibold">{site.location}</span>
        <span className="block text-[11px] text-muted">
          Site {site.id} · ATM {site.atmId || 'not mapped'}
        </span>
        <ChevronDown size={16} className="absolute top-4 right-3 text-muted" />
        <select aria-label="Select site" value={site.id} onChange={(e) => onSite(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.location} · {s.id}
            </option>
          ))}
        </select>
      </label>

      <div className={cn('mt-3 flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px]', attention ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800')}>
        <span className="font-semibold">{attention ? `${attention} document${attention > 1 ? 's' : ''} need${attention > 1 ? '' : 's'} your attention` : 'You are all caught up'}</span>
        <span className="text-[12px]">{docs.length} total</span>
      </div>

      {LEGAL_STATUSES.map((st) => {
        const group = docs.filter((d) => d.status === st)
        if (!group.length) return null
        return (
          <section key={st} className="mt-4">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-ink-2">
              {st} <span className="rounded-full bg-white px-1.5 text-[11px] text-muted ring-1 ring-line">{group.length}</span>
            </div>
            <div className="space-y-2">
              {group.map((d) => (
                <button key={d.id} onClick={() => onOpen(d.id)} className="block w-full rounded-xl border border-line bg-white p-3 text-left hover:border-primary/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[13px] font-semibold">{DOC_META[d.kind].title}</div>
                      <div className="text-[11px] text-muted">{d.version}</div>
                    </div>
                    <StatusBadge status={d.status} className="text-[10px]" />
                  </div>
                  <div className="mt-1.5 text-[12px] text-ink-2">{cardLine(d)}</div>
                  <div className={cn('mt-2 inline-flex items-center gap-1 text-[12px] font-semibold', st === 'Action Required' || st === 'Resubmission Required' ? 'text-bright' : 'text-primary')}>
                    {ACTION[d.status]} <ChevronRight size={14} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )
      })}

      <p className="mt-4 text-center text-[11px] text-muted">Last synced {fmtDateTime(new Date().toISOString())}. We’ll notify you when your submissions are reviewed.</p>
    </div>
  )
}

function AgreementAction({ doc, site, persona, onHelp }: { doc: LegalDoc; site: LegalSite; persona: { name: string; role: string }; onHelp: () => void }) {
  const m = DOC_META[doc.kind]
  const cur = currentVersion(doc)
  const prev = doc.versions.filter((v) => v.superseded).pop()
  const up = doc.uploads.filter((u) => u.version === doc.version).pop()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<{ name: string; size: number } | null>(null)
  const [err, setErr] = useState('')
  const canUpload = doc.status === 'Action Required' || doc.status === 'Resubmission Required'

  const pick = (list: FileList | null) => {
    setErr('')
    if (!list || !list.length) return
    if (list.length > 1) return setErr('Select one PDF containing all pages.')
    const f = list[0]
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') return setErr('Only PDF files are accepted.')
    if (f.size > MAX_MB * 1024 * 1024) return setErr(`File is larger than ${MAX_MB} MB.`)
    setFile({ name: f.name, size: f.size })
  }
  const submit = () => {
    if (!file) return input.current?.click()
    if (submitSignedUpload(doc.id, file)) {
      toast(`Signed ${m.short} submitted · status is now Under Review`)
      setFile(null)
    }
  }
  const download = () => {
    recordAccess(doc.id, 'Downloaded', 'Mobile app', persona, `${m.short} · ${doc.version}.pdf`)
    toast(`${m.short} · ${doc.version}.pdf saved to your phone (demo)`, 'info')
  }

  return (
    <div>
      <Link to={`/franchisee-app?site=${site.id}`} className="mb-3 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
        <ArrowLeft size={14} /> Back to documents
      </Link>
      <div className="rounded-xl border border-line bg-white p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[18px] font-semibold">{m.title}</h2>
          <StatusBadge status={doc.status} className="text-[10px]" />
        </div>
        <div className="text-[12px] text-ink-2">{doc.version} · Current version</div>
        <div className="mt-1 text-[11px] text-muted">
          {doc.id} · {site.location.replace(' · ', ', ')}
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-line-soft pt-2.5 text-[11px]">
          <div>
            <div className="text-muted">Site ID</div>
            <div className="font-semibold">{site.id}</div>
          </div>
          <div>
            <div className="text-muted">ATM ID</div>
            <div className="font-semibold">{site.atmId || 'Not mapped'}</div>
          </div>
        </div>
        <div className="mt-2 text-[11px] text-muted">
          {site.franchiseName} · {site.franchiseId}
        </div>
      </div>

      {canUpload && (
        <>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800">
            <Clock3 size={15} className="shrink-0" /> Upload your signed copy by {fmtDate(doc.dueDate)}.
          </div>
          {doc.status === 'Resubmission Required' && doc.feedback && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-800">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle size={14} /> Legal team feedback
              </div>
              <p className="mt-1">{doc.feedback}</p>
            </div>
          )}

          <Step n={1} title="Download the original">
            <div className="flex items-center gap-2.5 rounded-lg bg-surface p-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-red-50 text-[10px] font-bold text-brand-red">PDF</span>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold">
                  {m.short} · {doc.version}.pdf
                </div>
                <div className="text-[11px] text-muted">
                  PDF · {cur.sizeMb} MB · {cur.pages} pages
                </div>
              </div>
            </div>
            <button onClick={download} className="mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-primary text-[13px] font-semibold text-primary">
              <Download size={16} /> Download original file
            </button>
          </Step>

          <Step n={2} title="Sign every page">
            <p className="text-[12px] text-ink-2">
              Print {doc.version} and sign all {cur.pages} pages. {m.sign.replace(/^Sign every page and |^Sign both pages and /, '').replace(/^./, (c) => c.toUpperCase())} Then scan every page into one clear PDF.
            </p>
            {prev && <p className="mt-2 rounded-lg bg-primary-soft px-2.5 py-2 text-[11px] font-medium text-primary">Use this revised original, not the previous {prev.version}.</p>}
          </Step>

          <Step n={3} title="Upload the signed version">
            {file ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
                <FileText size={18} className="shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold">{file.name}</div>
                  <div className="text-[11px] text-muted">{file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`} · Ready to submit</div>
                </div>
                <button aria-label="Remove file" onClick={() => setFile(null)} className="text-muted">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-line p-2.5 text-[12px]">
                <div className="font-semibold text-ink-2">No signed file selected</div>
                <div className="text-[11px] text-muted">
                  One PDF · Maximum {MAX_MB} MB · All {cur.pages} pages
                </div>
              </div>
            )}
            {err && <p className="mt-1.5 text-[11px] text-brand-red">{err}</p>}
            <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = '' }} />
            <button onClick={submit} className="mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-bright text-[13px] font-semibold text-white">
              <UploadCloud size={16} /> {file ? 'Submit signed version' : 'Upload signed version'}
            </button>
            {file && (
              <button onClick={() => input.current?.click()} className="mt-1.5 w-full text-center text-[12px] font-semibold text-primary">
                Choose a different file
              </button>
            )}
            <p className="mt-2 text-[11px] text-muted">Once submitted, the status changes to Under Review and you cannot replace the file during review.</p>
          </Step>
        </>
      )}

      {doc.status === 'Under Review' && up && (
        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-[12px]">
          <div className="flex items-center gap-1.5 font-semibold text-blue-800">
            <Lock size={14} /> Submission under review
          </div>
          <p className="mt-1.5 text-ink-2">
            {up.file} · submitted {fmtDateTime(up.uploadedAt)}
          </p>
          <p className="mt-1 text-muted">You cannot replace the file during review. We’ll notify you when the legal team decides.</p>
        </div>
      )}

      {doc.status === 'Approved' && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-[12px]">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
            <CheckCircle2 size={14} /> Approved by the legal team
          </div>
          <p className="mt-1.5 text-ink-2">
            {up ? `${up.file} · approved ${fmtDate(up.reviewedAt)}` : 'Signed copy verified.'}
          </p>
          <button onClick={download} className="mt-2.5 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-emerald-600 font-semibold text-emerald-700">
            <Download size={15} /> Download signed copy
          </button>
        </div>
      )}

      <button onClick={onHelp} className="mt-4 w-full text-center text-[12px] text-muted">
        Need help? <span className="font-semibold text-primary">Contact the legal team</span>
      </button>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-3 rounded-xl border border-line bg-white p-3.5">
      <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[11px] text-white">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

function HomeScreen({ sites, docsOf, persona, onOpen }: { sites: LegalSite[]; docsOf: (siteId: string) => LegalDoc[]; persona: string; onOpen: (docId: string) => void }) {
  const all = sites.flatMap((s) => docsOf(s.id).map((d) => ({ d, s })))
  const todo = all.filter(({ d }) => d.status === 'Action Required' || d.status === 'Resubmission Required').sort((a, b) => a.d.dueDate.localeCompare(b.d.dueDate))
  const count = (st: LegalStatus) => all.filter(({ d }) => d.status === st).length
  return (
    <div>
      <h2 className="text-[20px] font-semibold">Hello, {persona.split(' ')[0]}</h2>
      <p className="text-[12px] text-muted">
        {sites.length} sites · {all.length} legal documents
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(['Action Required', 'Resubmission Required', 'Under Review', 'Approved'] as LegalStatus[]).map((st) => (
          <div key={st} className="rounded-xl border border-line bg-white p-3">
            <div className="text-[22px] font-semibold">{count(st)}</div>
            <div className="text-[11px] text-muted">{st}</div>
          </div>
        ))}
      </div>
      <h3 className="mt-4 mb-2 text-[13px] font-semibold">Next deadlines</h3>
      {todo.length ? (
        <div className="space-y-2">
          {todo.map(({ d, s }) => (
            <button key={d.id} onClick={() => onOpen(d.id)} className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-white p-3 text-left">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">
                  {DOC_META[d.kind].title} {d.version}
                </div>
                <div className="truncate text-[11px] text-muted">
                  {s.location} · Due {fmtDate(d.dueDate)}
                </div>
              </div>
              <ChevronRight size={16} className="text-muted" />
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-emerald-50 p-3 text-[12px] text-emerald-800">Nothing is due. All submissions are with the legal team or approved.</p>
      )}
    </div>
  )
}

function SupportScreen() {
  const [topic, setTopic] = useState('Document upload')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  return (
    <div>
      <h2 className="text-[20px] font-semibold">Support</h2>
      <p className="text-[12px] text-muted">Legal team · Mon–Sat, 09:30–18:30 IST</p>
      <div className="mt-3 space-y-2">
        <a href="tel:+912067891234" className="flex items-center gap-2.5 rounded-xl border border-line bg-white p-3 text-[13px]">
          <Phone size={16} className="text-primary" /> +91 20 6789 1234
        </a>
        <a href="mailto:legal@dexterindia.in" className="flex items-center gap-2.5 rounded-xl border border-line bg-white p-3 text-[13px]">
          <Mail size={16} className="text-primary" /> legal@dexterindia.in
        </a>
      </div>
      <div className="mt-4 rounded-xl border border-line bg-white p-3">
        <div className="mb-2 text-[13px] font-semibold">Message the legal team</div>
        <select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Topic" className="mb-2 h-9 w-full rounded-lg border border-line bg-white px-2 text-[13px]">
          {['Document upload', 'Signing instructions', 'Deadline extension', 'Other'].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <textarea
          rows={4}
          value={msg}
          onChange={(e) => {
            setMsg(e.target.value)
            setErr('')
          }}
          placeholder="Describe your question"
          className="w-full rounded-lg border border-line p-2 text-[13px] outline-none focus:border-primary"
        />
        {err && <p className="text-[11px] text-brand-red">{err}</p>}
        <button
          onClick={() => {
            if (msg.trim().length < 10) return setErr('Please write at least 10 characters.')
            toast(`Message sent to the legal team · ${topic}`)
            setMsg('')
          }}
          className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[13px] font-semibold text-white"
        >
          <Send size={15} /> Send message
        </button>
      </div>
    </div>
  )
}

function ProfileScreen({ site, sites }: { site: LegalSite; sites: LegalSite[] }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-[18px] font-bold text-white">
          {site.signatory.split(' ').map((p) => p[0]).join('')}
        </span>
        <div>
          <h2 className="text-[18px] font-semibold">{site.signatory}</h2>
          <p className="text-[12px] text-muted">Franchisee · Authorized signatory</p>
        </div>
      </div>
      <dl className="mt-4 divide-y divide-line-soft rounded-xl border border-line bg-white text-[13px]">
        {[
          ['Franchise', site.franchiseName],
          ['Franchise ID', `${site.franchiseId} · ${site.tier}`],
          ['Mobile', site.contactNumber],
          ['Email', site.email],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 px-3 py-2.5">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-medium break-all">{v}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-4 mb-2 text-[13px] font-semibold">Your sites</h3>
      <div className="space-y-2">
        {sites.map((s) => (
          <Link key={s.id} to={`/franchisee-app?site=${s.id}`} className="block rounded-xl border border-line bg-white p-3">
            <div className="text-[13px] font-semibold">{s.location}</div>
            <div className="text-[11px] text-muted">
              {s.id} · ATM {s.atmId || 'not mapped'}
            </div>
          </Link>
        ))}
      </div>
      <Link to="/legal" className="mt-4 block text-center text-[12px] font-semibold text-primary">
        Exit app preview
      </Link>
    </div>
  )
}
