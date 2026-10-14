import { useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertCircle, AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, Download, FileText, Files, HelpCircle, House, Lock, Mail, Phone, Send, Upload, UploadCloud, UserRound, X,
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
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 max-sm:hidden">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Franchisee App</h1>
          <p className="mt-1 text-[14px] text-muted">Mobile preview · signed in as {persona.name} · uploads and downloads sync to Legal Data and the document audit log</p>
        </div>
        <Link to={doc ? `/legal/${doc.siteId}/documents/${doc.id}` : `/legal/${site.id}`} className="text-[13px] font-semibold text-primary hover:underline">
          Open in Legal workspace →
        </Link>
      </div>

      <div className="flex justify-center">
        {/* phone frame on desktop; at phone width (≤ 640px) the app fills the screen like the 390px Figma frames */}
        <div className="w-full max-w-[390px] max-sm:max-w-none sm:rounded-[44px] sm:bg-navy-900 sm:p-2.5 sm:shadow-2xl">
          <div className="relative flex h-[min(820px,calc(100vh-170px))] min-h-[640px] flex-col overflow-hidden bg-white max-sm:-mx-4 max-sm:h-[calc(100dvh-140px)] sm:rounded-[36px]">
            <div className="scroll-thin flex-1 overflow-y-auto px-6 pt-6 pb-6">
              {/* app header (scrolls with the screen, as in the frames) */}
              <header className="mb-5 flex items-center gap-2.5">
                <span className="h-8 w-1 rounded-full bg-brand-red" />
                <div className="leading-tight">
                  <div className="text-[20px] font-bold text-primary">Dexter India</div>
                  <div className="text-[9px] font-semibold tracking-wide text-ink-2">OPERATIONS CRM</div>
                </div>
                <button aria-label="Profile" onClick={() => go('profile')} className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-[12px] font-bold text-primary">
                  {persona.name.split(' ').map((p) => p[0]).join('')}
                </button>
              </header>
              {screen}
            </div>
            {/* bottom nav */}
            <nav className="grid shrink-0 grid-cols-4 border-t border-line bg-white pt-3 pb-4">
              {(
                [
                  ['home', 'Home', House],
                  ['documents', 'Documents', Files],
                  ['support', 'Support', HelpCircle],
                  ['profile', 'Profile', UserRound],
                ] as const
              ).map(([key, label, Icon]) => (
                <button key={key} onClick={() => go(key)} className={cn('flex flex-col items-center gap-1 py-1 text-[11px]', tab === key ? 'font-semibold text-primary' : 'text-muted')}>
                  <Icon size={20} />
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

const ICON_TONE: Record<LegalStatus, string> = {
  'Action Required': 'text-amber-600',
  'Under Review': 'text-primary',
  Approved: 'text-emerald-600',
  'Resubmission Required': 'text-red-600',
}

function Dashboard({ site, sites, docs, persona, onSite, onOpen }: { site: LegalSite; sites: LegalSite[]; docs: LegalDoc[]; persona: string; onSite: (id: string) => void; onOpen: (id: string) => void }) {
  const attention = docs.filter((d) => d.status === 'Action Required' || d.status === 'Resubmission Required').length
  return (
    <div>
      <h2 className="text-[24px] font-bold tracking-tight">Your documents</h2>
      <p className="mt-1 text-[13px] text-ink-2">
        {persona} · {site.franchiseName}
      </p>

      <label className="relative mt-5 block rounded-xl bg-primary-soft px-4 py-3.5">
        <span className="block text-[14px] font-semibold text-primary">{site.location}</span>
        <span className="mt-1.5 block text-[12px] text-ink-2">
          Site {site.id} · ATM {site.atmId || 'not mapped'}
        </span>
        <ChevronDown size={18} className="absolute top-4 right-4 text-primary" />
        <select aria-label="Select site" value={site.id} onChange={(e) => onSite(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.location} · {s.id}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 flex items-center justify-between text-[13px]">
        <span className={cn('flex items-center gap-2', attention ? 'text-amber-700' : 'text-emerald-700')}>
          {attention ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {attention ? `${attention} document${attention > 1 ? 's' : ''} need${attention > 1 ? '' : 's'} your attention` : 'You are all caught up'}
        </span>
        <span className="text-[12px] text-muted">{docs.length} total</span>
      </div>

      {LEGAL_STATUSES.map((st) => {
        const group = docs.filter((d) => d.status === st)
        if (!group.length) return null
        return (
          <section key={st} className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-ink">{st}</h3>
              <span className="grid h-6 min-w-6 place-items-center rounded-md bg-slate-100 px-1.5 text-[11px] text-ink-2">{group.length}</span>
            </div>
            <div className="space-y-2">
              {group.map((d) => (
                <button key={d.id} onClick={() => onOpen(d.id)} className="block w-full rounded-xl border border-line bg-white px-3.5 py-3 text-left hover:border-primary/50">
                  <div className="flex items-center gap-2">
                    <FileText size={17} className={cn('shrink-0', ICON_TONE[d.status])} />
                    <span className="min-w-0 flex-1 text-[14px] font-semibold">{DOC_META[d.kind].title}</span>
                    <span className="text-[11px] text-muted">{d.version}</span>
                  </div>
                  <div className="mt-2 text-[12px] text-muted">{cardLine(d)}</div>
                  <div className="mt-2 flex items-center justify-between text-[13px] font-semibold text-primary">
                    {ACTION[d.status]} <ChevronRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )
      })}

      <p className="mt-5 text-[12px] text-muted">Last synced {fmtDateTime(new Date().toISOString())}. We’ll notify you when your submissions are reviewed.</p>
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
  const signText = m.sign.replace(/^Sign every page and |^Sign both pages and /, '').replace(/^./, (c) => c.toUpperCase()).replace(/\.$/, '')

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
      <Link to={`/franchisee-app?site=${site.id}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-primary">
        <ArrowLeft size={15} /> Back to documents
      </Link>
      <h2 className="text-[24px] font-bold tracking-tight">{m.title}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <StatusBadge status={doc.status} className="text-[11px]" />
        {doc.version} · Current version
      </div>
      <div className="mt-2 text-[13px] text-muted">
        {doc.id} · {site.location.replace(' · ', ', ')}
      </div>

      <div className="mt-5 rounded-xl border border-line bg-surface px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[12px] text-muted">Site ID</div>
            <div className="mt-1 text-[14px] font-semibold">{site.id}</div>
          </div>
          <div>
            <div className="text-[12px] text-muted">ATM ID</div>
            <div className="mt-1 text-[14px] font-semibold">{site.atmId || 'Not mapped'}</div>
          </div>
        </div>
        <div className="mt-3 text-[12px] text-muted">
          {site.franchiseName} · {site.franchiseId}
        </div>
      </div>

      {canUpload && (
        <>
          <div className="mt-4 flex items-center gap-2.5 rounded-lg bg-amber-50 px-3.5 py-3 text-[13px] text-amber-700">
            <CalendarClock size={16} className="shrink-0" /> Upload your signed copy by {fmtDate(doc.dueDate)}.
          </div>
          {doc.status === 'Resubmission Required' && doc.feedback && (
            <div className="mt-3 rounded-lg bg-red-50 px-3.5 py-3 text-[12px] text-red-800">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle size={14} /> Legal team feedback
              </div>
              <p className="mt-1">{doc.feedback}</p>
            </div>
          )}

          <h3 className="mt-6 mb-3 text-[16px] font-semibold">1. Download the original</h3>
          <div className="flex items-center gap-3 rounded-xl border border-line px-4 py-3.5">
            <FileText size={22} className="shrink-0 text-ink-2" />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">
                {m.short} · {doc.version}.pdf
              </div>
              <div className="mt-0.5 text-[12px] text-muted">
                PDF · {cur.sizeMb} MB · {cur.pages} pages
              </div>
            </div>
          </div>
          <button onClick={download} className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white text-[14px] font-semibold text-ink hover:bg-surface">
            <Download size={16} className="text-ink-2" /> Download original file
          </button>

          <h3 className="mt-6 mb-2 text-[16px] font-semibold">2. Sign every page</h3>
          <p className="text-[13px] text-ink-2">
            Print {doc.version} and sign all {cur.pages} pages. {signText}, then scan every page into one clear PDF.
          </p>
          {prev && <p className="mt-2 text-[12px] text-primary">Use this revised original, not the previous {prev.version}.</p>}

          <h3 className="mt-6 mb-3 text-[16px] font-semibold">3. Upload the signed version</h3>
          {file ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
              <FileText size={18} className="shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">{file.name}</div>
                <div className="text-[12px] text-muted">{file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`} · Ready to submit</div>
              </div>
              <button aria-label="Remove file" onClick={() => setFile(null)} className="text-muted">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => input.current?.click()}
              className="flex w-full flex-col items-center rounded-xl border border-dashed border-line bg-surface px-4 py-5 text-center"
            >
              <UploadCloud size={22} className="text-primary" />
              <span className="mt-2 text-[13px] font-semibold text-ink">No signed file selected</span>
              <span className="mt-1 text-[12px] text-muted">
                One PDF · Maximum {MAX_MB} MB · All {cur.pages} pages
              </span>
            </button>
          )}
          {err && <p className="mt-1.5 text-[12px] text-brand-red">{err}</p>}
          <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = '' }} />
          <button onClick={submit} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-semibold text-white hover:bg-primary-hover">
            <Upload size={16} /> {file ? 'Submit signed version' : 'Upload signed version'}
          </button>
          {file && (
            <button onClick={() => input.current?.click()} className="mt-1.5 w-full text-center text-[12px] font-semibold text-primary">
              Choose a different file
            </button>
          )}
          <p className="mt-3 text-[12px] text-muted">Select a file to submit for legal review. Once submitted, the status changes to Under Review and you cannot replace the file during review.</p>
        </>
      )}

      {doc.status === 'Under Review' && up && (
        <div className="mt-4 rounded-xl bg-blue-50 p-4 text-[12px]">
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
        <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-[12px]">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
            <CheckCircle2 size={14} /> Approved by the legal team
          </div>
          <p className="mt-1.5 text-ink-2">{up ? `${up.file} · approved ${fmtDate(up.reviewedAt)}` : 'Signed copy verified.'}</p>
          <button onClick={download} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white text-[13px] font-semibold text-ink">
            <Download size={15} /> Download signed copy
          </button>
        </div>
      )}

      <button onClick={onHelp} className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-primary">
        <HelpCircle size={16} /> Need help? Contact the legal team
      </button>
    </div>
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
