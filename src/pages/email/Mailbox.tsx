import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Archive,
  ArrowLeft,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  FileText,
  Forward,
  Image as ImageIcon,
  ListTodo,
  Mail as MailIcon,
  MailOpen,
  MoreHorizontal,
  Paperclip,
  PenSquare,
  Printer,
  RefreshCw,
  Reply,
  ReplyAll,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
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
  initialsOf,
  listTime,
  MAIL_DEPTS,
  MAIL_PRIORITIES,
  MAIL_STATUSES,
  removeMail,
  shortTime,
  threadOf,
  timelineOf,
  trackerById,
  TRACKERS,
  updateMails,
  type Mail,
  type MailFolder,
  type MailPriority,
} from '@/data/email'
import { createTask, NOW as TASK_NOW } from '@/data/tasks'
import { answer, sanitize, suggestReply, summarize } from './ai'
import ComposeDialog from './Compose'

type Tab = 'all' | 'unread' | 'assigned' | 'mentions' | 'followups'
const TABS: { key: Tab; label: string; test: (m: Mail) => boolean }[] = [
  { key: 'all', label: 'All Emails', test: () => true },
  { key: 'unread', label: 'Unread', test: (m) => !m.read },
  { key: 'assigned', label: 'Assigned to Me', test: (m) => m.assigned },
  { key: 'mentions', label: 'Mentions', test: (m) => m.mention },
  { key: 'followups', label: 'Follow-ups', test: (m) => m.followUp },
]
const TITLES: Record<MailFolder, string> = { inbox: 'My Inbox', sent: 'Sent', drafts: 'Drafts' }
const PAGE = 10

export const PRIORITY_CLS: Record<MailPriority, string> = {
  High: 'bg-red-50 text-red-700',
  Medium: 'bg-amber-50 text-amber-700',
  Normal: 'bg-primary-soft text-primary',
  Low: 'bg-slate-100 text-slate-600',
}
export function TrackerChip({ id, className }: { id?: string; className?: string }) {
  if (!id) return null
  const cls = id.startsWith('FIN') ? 'border-emerald-200 text-emerald-700' : id.startsWith('LEG') ? 'border-violet-200 text-violet-700' : 'border-blue-200 text-blue-700'
  return <span className={cn('rounded border bg-white px-1.5 py-0.5 text-[10px] font-semibold', cls, className)}>{id}</span>
}
const AVATAR_BG = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700']
export const avatarCls = (name: string) => AVATAR_BG[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_BG.length]

export default function Mailbox({ folder, compose = false }: { folder: MailFolder; compose?: boolean }) {
  const { mails } = emailStore.use()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('m')

  const [tab, setTab] = useState<Tab>('all')
  const [q, setQ] = useState('')
  const [account, setAccount] = useState('all')
  const [dept, setDept] = useState('all')
  const [status, setStatus] = useState('all')
  const [range, setRange] = useState('30')
  const [more, setMore] = useState(false)
  const [mf, setMf] = useState({ attachments: false, starred: false, priority: 'all', tracker: 'all', archived: false })
  const [sort, setSort] = useState<'newest' | 'unread' | 'oldest' | 'priority'>('newest')
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState<string[]>([])
  const [synced, setSynced] = useState(Date.parse('2025-08-27T11:32:00+05:30'))
  const aiRef = useRef<HTMLDivElement>(null)

  const inFolder = useMemo(() => mails.filter((m) => m.folder === folder && (mf.archived ? m.archived : !m.archived)), [mails, folder, mf.archived])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const days = range === 'all' ? Infinity : +range
    const pr = { High: 0, Medium: 1, Normal: 2, Low: 3 }
    let out = inFolder.filter((m) => {
      if (!TABS.find((t) => t.key === tab)!.test(m)) return false
      if (term && ![m.subject, m.fromName, m.fromEmail, m.to.join(' '), m.tracker ?? '', m.body, trackerById(m.tracker)?.customer.name ?? ''].join(' ').toLowerCase().includes(term)) return false
      if (account !== 'all' && m.account !== account) return false
      if (dept !== 'all' && m.department !== dept) return false
      if (status !== 'all' && m.status !== status) return false
      if (range === 'today' ? new Date(m.at).toDateString() !== new Date(EMAIL_NOW).toDateString() : EMAIL_NOW - Date.parse(m.at) > days * 86400_000) return false
      if (mf.attachments && !m.attachments.length) return false
      if (mf.starred && !m.starred) return false
      if (mf.priority !== 'all' && m.priority !== mf.priority) return false
      if (mf.tracker !== 'all' && !(m.tracker ?? '').startsWith(mf.tracker)) return false
      return true
    })
    out = [...out].sort((a, b) => {
      if (sort === 'unread' && a.read !== b.read) return a.read ? 1 : -1
      if (sort === 'priority' && a.priority !== b.priority) return pr[a.priority] - pr[b.priority]
      return sort === 'oldest' ? Date.parse(a.at) - Date.parse(b.at) : Date.parse(b.at) - Date.parse(a.at)
    })
    return out
  }, [inFolder, tab, q, account, dept, status, range, mf, sort])

  useEffect(() => setPage(1), [tab, q, account, dept, status, range, mf, sort, folder])
  useEffect(() => setSel([]), [folder])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const cur = Math.min(page, pages)
  const visible = filtered.slice((cur - 1) * PAGE, cur * PAGE)
  const selected = mails.find((m) => m.id === selectedId) ?? (folder !== 'drafts' ? visible[0] : undefined)

  const open = (m: Mail) => {
    if (m.folder === 'drafts') {
      nav(`/email/inbox/compose?draft=${m.id}`)
      return
    }
    if (!m.read) updateMails([m.id], (x) => ({ ...x, read: true }))
    const p = new URLSearchParams(params)
    p.set('m', m.id)
    setParams(p)
  }
  const back = () => {
    const p = new URLSearchParams(params)
    p.delete('m')
    setParams(p)
  }
  const bulk = (fn: (m: Mail) => Mail, msg: string) => {
    updateMails(sel, fn)
    toast(`${sel.length} ${sel.length === 1 ? 'email' : 'emails'} ${msg}.`)
    setSel([])
  }
  const activeFilters = [account !== 'all', dept !== 'all', status !== 'all', range !== '30', mf.attachments, mf.starred, mf.priority !== 'all', mf.tracker !== 'all', mf.archived].filter(Boolean).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-ink sm:text-[28px]">Email — {TITLES[folder]}</h1>
          <p className="mt-1 text-[14px] text-muted">Manage, read and respond to emails from connected accounts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={<Sparkles size={16} className="text-primary" />}
            onClick={() => {
              if (!selected) return toast('Open an email to use the AI Assistant.', 'info')
              aiRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              aiRef.current?.querySelector('input')?.focus()
            }}
          >
            AI Assistant
          </Button>
          <Button icon={<PenSquare size={16} />} onClick={() => nav(`/email/inbox/compose${selected?.tracker ? `?tracker=${selected.tracker}` : ''}`)}>
            Compose Email
          </Button>
        </div>
      </div>

      <section className="rounded-xl border border-line bg-white">
        {/* Tabs */}
        <div role="tablist" className="scroll-thin flex overflow-x-auto border-b border-line px-2">
          {TABS.map((t) => {
            const n = inFolder.filter(t.test).length
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn('-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[13px]', tab === t.key ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted hover:text-ink')}
              >
                {t.label}
                <span className={cn('rounded px-1.5 text-[11px]', tab === t.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600')}>{n}</span>
              </button>
            )
          })}
        </div>

        {/* Search + filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-line px-3 text-[13px] text-muted lg:w-[320px]">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search emails by subject, sender, tracker, customer..." className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
            {q && (
              <button aria-label="Clear search" onClick={() => setQ('')}>
                <X size={14} />
              </button>
            )}
          </label>
          <Sel label="Account" value={account} onChange={setAccount} options={[['all', 'All Accounts'], ...ACCOUNTS.map((a) => [a.email, a.email] as [string, string])]} />
          <Sel label="Department" value={dept} onChange={setDept} options={[['all', 'All Departments'], ...MAIL_DEPTS.map((d) => [d, d] as [string, string])]} />
          <Sel label="Status" value={status} onChange={setStatus} options={[['all', 'All Status'], ...MAIL_STATUSES.map((d) => [d, d] as [string, string])]} />
          <Sel label="Date range" icon={<CalendarDays size={13} />} value={range} onChange={setRange} options={[['today', 'Today'], ['7', 'Last 7 Days'], ['30', 'Last 30 Days'], ['all', 'All time']]} />
          <div className="relative">
            <button onClick={() => setMore((v) => !v)} aria-expanded={more} className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-semibold hover:border-primary/40">
              <SlidersHorizontal size={14} className="text-primary" /> More Filters
              {activeFilters > 0 && <span className="rounded bg-primary px-1.5 text-[11px] text-white">{activeFilters}</span>}
            </button>
            {more && (
              <div className="absolute top-11 right-0 z-30 w-64 space-y-2 rounded-lg border border-line bg-white p-3 text-[13px] shadow-lg sm:left-0">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={mf.attachments} onChange={(e) => setMf({ ...mf, attachments: e.target.checked })} /> Has attachments
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={mf.starred} onChange={(e) => setMf({ ...mf, starred: e.target.checked })} /> Starred
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={mf.archived} onChange={(e) => setMf({ ...mf, archived: e.target.checked })} /> Show archived only
                </label>
                <label className="block text-[12px] text-muted">
                  Priority
                  <select value={mf.priority} onChange={(e) => setMf({ ...mf, priority: e.target.value })} className="mt-1 h-8 w-full rounded-md border border-line px-2 text-[13px] text-ink">
                    <option value="all">All priorities</option>
                    {MAIL_PRIORITIES.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-[12px] text-muted">
                  Tracker type
                  <select value={mf.tracker} onChange={(e) => setMf({ ...mf, tracker: e.target.value })} className="mt-1 h-8 w-full rounded-md border border-line px-2 text-[13px] text-ink">
                    <option value="all">All trackers</option>
                    <option value="ATM">ATM- (Complaints / Cases)</option>
                    <option value="FIN">FIN- (Finance)</option>
                    <option value="LEG">LEG- (Legal)</option>
                  </select>
                </label>
                <div className="flex justify-between pt-1">
                  <button
                    className="text-[12px] text-muted"
                    onClick={() => {
                      setMf({ attachments: false, starred: false, priority: 'all', tracker: 'all', archived: false })
                      setAccount('all')
                      setDept('all')
                      setStatus('all')
                      setRange('30')
                    }}
                  >
                    Reset all
                  </button>
                  <button className="text-[12px] font-semibold text-primary" onClick={() => setMore(false)}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panes */}
        <div className="grid min-h-[560px] lg:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)_320px]">
          {/* List */}
          <div className={cn('min-w-0 border-line lg:border-r', selectedId ? 'hidden lg:block' : 'block')}>
            <div className="flex items-center gap-2 border-b border-line px-4 py-2 text-[12px]">
              <input
                type="checkbox"
                aria-label="Select all on page"
                checked={visible.length > 0 && visible.every((m) => sel.includes(m.id))}
                onChange={(e) => setSel(e.target.checked ? [...new Set([...sel, ...visible.map((m) => m.id)])] : sel.filter((id) => !visible.some((m) => m.id === id)))}
              />
              {sel.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-primary">{sel.length} selected</span>
                  {folder === 'drafts' ? (
                    <button
                      className="flex items-center gap-1 text-brand-red hover:underline"
                      onClick={() => {
                        sel.forEach(removeMail)
                        toast(`${sel.length} draft${sel.length > 1 ? 's' : ''} discarded.`)
                        setSel([])
                      }}
                    >
                      <Trash2 size={12} /> Discard
                    </button>
                  ) : (
                    <>
                      <button className="flex items-center gap-1 text-primary hover:underline" onClick={() => bulk((m) => ({ ...m, read: true }), 'marked as read')}>
                        <MailOpen size={12} /> Mark read
                      </button>
                      <button className="flex items-center gap-1 text-primary hover:underline" onClick={() => bulk((m) => ({ ...m, read: false }), 'marked as unread')}>
                        <MailIcon size={12} /> Mark unread
                      </button>
                      <button className="flex items-center gap-1 text-primary hover:underline" onClick={() => bulk((m) => ({ ...m, archived: !mf.archived }), mf.archived ? 'restored' : 'archived')}>
                        <Archive size={12} /> {mf.archived ? 'Unarchive' : 'Archive'}
                      </button>
                    </>
                  )}
                  <button className="text-muted hover:underline" onClick={() => setSel([])}>
                    Clear
                  </button>
                </div>
              ) : (
                <label className="ml-auto flex items-center gap-1 text-muted">
                  <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="cursor-pointer bg-transparent font-medium text-ink-2 outline-none">
                    <option value="newest">Newest first</option>
                    <option value="unread">Unread first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="priority">Priority</option>
                  </select>
                </label>
              )}
            </div>
            <ul>
              {visible.map((m) => {
                const isSel = selected?.id === m.id
                const who = m.folder === 'inbox' ? m.fromName : m.to[0] ? `To: ${m.to[0]}` : '(no recipient)'
                return (
                  <li key={m.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => open(m)}
                      onKeyDown={(e) => e.key === 'Enter' && open(m)}
                      className={cn('flex cursor-pointer gap-3 border-b border-line-soft px-4 py-3 outline-none hover:bg-surface/70 focus-visible:bg-surface', isSel && 'bg-primary-soft/60 hover:bg-primary-soft/60')}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select ${m.subject}`}
                        checked={sel.includes(m.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => setSel((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))}
                        className="mt-2.5"
                      />
                      <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold', avatarCls(m.fromName))}>{initialsOf(m.folder === 'inbox' ? m.fromName : m.to[0] ?? 'NA')}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn('truncate text-[13px]', m.read ? 'text-ink-2' : 'font-semibold text-ink')}>{who}</span>
                          {!m.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-bright" />}
                          <span className="ml-auto shrink-0 text-[11px] text-muted">{m.sendState === 'Scheduled' ? 'Scheduled' : listTime(m.at)}</span>
                        </div>
                        <div className={cn('truncate text-[13px]', m.read ? 'text-ink' : 'font-semibold text-ink')}>{m.subject || '(no subject)'}</div>
                        <div className="truncate text-[12px] text-muted">{m.body.replace(/\s+/g, ' ').slice(0, 90)}</div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <TrackerChip id={m.tracker} />
                          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', PRIORITY_CLS[m.priority])}>{m.priority}</span>
                          {m.sendState === 'Scheduled' && (
                            <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              <Clock3 size={10} /> Scheduled
                            </span>
                          )}
                          <span className="ml-auto flex items-center gap-2 text-muted">
                            {m.attachments.length > 0 && <Paperclip size={13} aria-label="Has attachments" />}
                            <button
                              aria-label={m.starred ? 'Unstar' : 'Star'}
                              onClick={(e) => {
                                e.stopPropagation()
                                updateMails([m.id], (x) => ({ ...x, starred: !x.starred }))
                              }}
                            >
                              <Star size={14} className={m.starred ? 'fill-amber-400 text-amber-500' : ''} />
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            {filtered.length === 0 && <div className="px-6 py-14 text-center text-[13px] text-muted">{folder === 'drafts' ? 'No saved drafts.' : 'No emails match these filters.'}</div>}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[12px] text-muted">
              <span>
                {filtered.length ? `Showing ${(cur - 1) * PAGE + 1}–${Math.min(cur * PAGE, filtered.length)} of ${filtered.length} emails` : '0 emails'}
              </span>
              <div className="flex items-center gap-1">
                <button aria-label="Previous page" disabled={cur === 1} onClick={() => setPage(cur - 1)} className="grid h-7 w-7 place-items-center rounded border border-line disabled:opacity-40">
                  <ChevronLeft size={14} />
                </button>
                {pageList(cur, pages).map((p, i) =>
                  p === 0 ? (
                    <span key={'e' + i} className="px-1">
                      …
                    </span>
                  ) : (
                    <button key={p} onClick={() => setPage(p)} className={cn('h-7 min-w-7 rounded px-1.5', p === cur ? 'bg-primary text-white' : 'hover:bg-surface')}>
                      {p}
                    </button>
                  ),
                )}
                <button aria-label="Next page" disabled={cur === pages} onClick={() => setPage(cur + 1)} className="grid h-7 w-7 place-items-center rounded border border-line disabled:opacity-40">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Reader + side panel */}
          <div className={cn('min-w-0 2xl:contents', selectedId ? 'block' : 'hidden lg:block')}>
            {selected ? (
              <>
                <Reader key={selected.id} m={selected} all={mails} onBack={back} />
                <SidePanel key={'side' + selected.id} m={selected} all={mails} aiRef={aiRef} />
              </>
            ) : (
              <div className="grid h-full place-items-center p-10 text-center text-[13px] text-muted">
                {folder === 'drafts' ? 'Open a draft to continue editing it in the composer.' : 'Select an email to read it.'}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
        <span>Connected account: {account === 'all' ? 'support@dexterindia.com' : account} · {dept === 'all' ? 'All departments' : dept}</span>
        <span className="flex items-center gap-2">
          Last synced {fullTime(new Date(synced).toISOString()).replace(/ (AM|PM)$/, '')} IST
          <button
            aria-label="Sync now"
            onClick={() => {
              setSynced(EMAIL_NOW)
              toast('Mailbox synced · no new messages.', 'info')
            }}
            className="text-primary"
          >
            <RefreshCw size={13} />
          </button>
        </span>
      </div>

      {compose && <ComposeDialog />}
    </div>
  )
}

function pageList(cur: number, pages: number): number[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const set = new Set([1, 2, 3, cur - 1, cur, cur + 1, pages].filter((p) => p >= 1 && p <= pages))
  const arr = [...set].sort((a, b) => a - b)
  const out: number[] = []
  arr.forEach((p, i) => {
    if (i && p - arr[i - 1] > 1) out.push(0)
    out.push(p)
  })
  return out
}

function Sel({ label, value, onChange, options, icon }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][]; icon?: ReactNode }) {
  return (
    <label className="relative flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white pr-2 pl-3 text-[13px] font-medium hover:border-primary/40">
      {icon && <span className="text-primary">{icon}</span>}
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-full max-w-[200px] cursor-pointer appearance-none bg-transparent pr-5 outline-none">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2 text-muted" />
    </label>
  )
}

/* ------------------------------ reader ------------------------------ */

function Body({ m }: { m: Mail }) {
  if (m.html) return <div className="prose-mail text-[13px] leading-relaxed text-ink [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: sanitize(m.html) }} />
  return (
    <div className="space-y-3 text-[13px] leading-relaxed text-ink">
      {m.body.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  )
}

function Reader({ m, all, onBack }: { m: Mail; all: Mail[]; onBack: () => void }) {
  const nav = useNavigate()
  const [menu, setMenu] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [openPrev, setOpenPrev] = useState(false)
  const thread = threadOf(m, all).filter((x) => Date.parse(x.at) < Date.parse(m.at))
  const go = (mode: string) => nav(`/email/inbox/compose?${mode}=${m.id}`)
  return (
    <div className="min-w-0 border-line 2xl:border-r">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-2">
        <button onClick={onBack} className="mr-1 flex items-center gap-1 text-[12px] text-primary lg:hidden">
          <ArrowLeft size={14} /> Back
        </button>
        <ToolBtn icon={<Reply size={14} />} onClick={() => go('reply')}>
          Reply
        </ToolBtn>
        <ToolBtn icon={<ReplyAll size={14} />} onClick={() => go('replyAll')}>
          Reply All
        </ToolBtn>
        <ToolBtn icon={<Forward size={14} />} onClick={() => go('forward')}>
          Forward
        </ToolBtn>
        {m.folder === 'inbox' && (
          <ToolBtn
            icon={<MailIcon size={14} />}
            onClick={() => {
              updateMails([m.id], (x) => ({ ...x, read: !x.read }))
              toast(m.read ? 'Marked as unread.' : 'Marked as read.', 'info')
            }}
          >
            {m.read ? 'Mark Unread' : 'Mark Read'}
          </ToolBtn>
        )}
        <div className="relative">
          <ToolBtn icon={<MoreHorizontal size={14} />} onClick={() => setMenu((v) => !v)}>
            More
          </ToolBtn>
          {menu && (
            <div className="absolute top-9 right-0 z-30 w-52 rounded-lg border border-line bg-white p-1 text-[13px] shadow-lg" onMouseLeave={() => setMenu(false)}>
              <MenuItem
                icon={<Star size={14} />}
                onClick={() => {
                  updateMails([m.id], (x) => ({ ...x, starred: !x.starred }))
                  setMenu(false)
                }}
              >
                {m.starred ? 'Remove star' : 'Star'}
              </MenuItem>
              <MenuItem
                icon={<Clock3 size={14} />}
                onClick={() => {
                  updateMails([m.id], (x) => ({ ...x, followUp: !x.followUp }))
                  toast(m.followUp ? 'Removed from Follow-ups.' : 'Added to Follow-ups.')
                  setMenu(false)
                }}
              >
                {m.followUp ? 'Clear follow-up' : 'Mark for follow-up'}
              </MenuItem>
              <MenuItem
                icon={<ListTodo size={14} />}
                onClick={() => {
                  const t = createTask({
                    title: `Follow up: ${m.subject.replace(/^(re|fwd):\s*/i, '')}`,
                    description: `Created from email “${m.subject}” (${m.fromEmail}).`,
                    expectedOutcome: 'Customer response recorded and tracker updated',
                    priority: m.priority === 'High' ? 'High' : 'Medium',
                    department: 'Support',
                    assignee: 'Rahul Kumar',
                    dueMs: TASK_NOW + 48 * 3600_000,
                    entityId: m.tracker,
                    source: 'Email',
                  })
                  setMenu(false)
                  toast(`${t.id} created from this email.`)
                }}
              >
                Create task
              </MenuItem>
              <MenuItem
                icon={<Archive size={14} />}
                onClick={() => {
                  updateMails([m.id], (x) => ({ ...x, archived: !x.archived }))
                  toast(m.archived ? 'Moved back to the mailbox.' : 'Archived.')
                  setMenu(false)
                }}
              >
                {m.archived ? 'Unarchive' : 'Archive'}
              </MenuItem>
              <MenuItem
                icon={<Printer size={14} />}
                onClick={() => {
                  setMenu(false)
                  window.print()
                }}
              >
                Print
              </MenuItem>
            </div>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-start gap-2">
          <h2 className="min-w-0 flex-1 text-[18px] font-semibold text-ink">{m.subject || '(no subject)'}</h2>
          <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', PRIORITY_CLS[m.priority])}>{m.priority}</span>
          {m.sendState && <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', m.sendState === 'Scheduled' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>{m.sendState}</span>}
        </div>
        <div className="mt-1 text-[12px] text-muted">{fullTime(m.scheduledAt ?? m.at)}{m.sendState === 'Scheduled' && ' · scheduled send (IST)'}</div>

        <div className="mt-4 flex gap-3">
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold', avatarCls(m.fromName))}>{initialsOf(m.fromName)}</span>
          <div className="min-w-0 text-[12px]">
            <div className="text-[13px] font-semibold text-ink">
              {m.fromName} <span className="font-normal text-muted">&lt;{m.fromEmail}&gt;</span>
            </div>
            <div className="text-muted">To: {m.to.join(', ') || '—'}</div>
            {m.cc.length > 0 && (
              <div className="text-muted">
                Cc: {showCc ? m.cc.join(', ') : m.cc[0]}
                {!showCc && m.cc.length > 1 && (
                  <button onClick={() => setShowCc(true)} className="ml-1 text-primary hover:underline">
                    +{m.cc.length - 1}
                  </button>
                )}
              </div>
            )}
            {m.bcc.length > 0 && <div className="text-muted">Bcc: {m.bcc.join(', ')}</div>}
          </div>
        </div>

        <div className="mt-5">
          <Body m={m} />
        </div>

        {(m.meeting || m.followUpTask) && (
          <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
            {m.meeting && <span className="rounded bg-primary-soft px-2 py-1 text-primary">{m.meeting}</span>}
            {m.followUpTask && (
              <Link to={`/tasks/my/${m.followUpTask}`} className="rounded bg-emerald-50 px-2 py-1 text-emerald-700 hover:underline">
                Follow-up task {m.followUpTask}
              </Link>
            )}
          </div>
        )}

        {m.attachments.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-semibold text-ink">
                {m.attachments.length} Attachment{m.attachments.length > 1 ? 's' : ''}
              </span>
              <button onClick={() => toast('Attachments are demo records — no file content is stored in this preview.', 'info')} className="flex items-center gap-1 font-semibold text-primary hover:underline">
                <Download size={13} /> Download All
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {m.attachments.map((a) => (
                <button key={a.name} onClick={() => toast(`${a.name} is a demo attachment — no file content is stored.`, 'info')} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-left hover:border-primary/40">
                  <span className={cn('grid h-8 w-8 place-items-center rounded', /\.(png|jpe?g)$/i.test(a.name) ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                    {/\.(png|jpe?g)$/i.test(a.name) ? <ImageIcon size={15} /> : <FileText size={15} />}
                  </span>
                  <span>
                    <span className="block max-w-[180px] truncate text-[12px] font-medium text-ink">{a.name}</span>
                    <span className="block text-[11px] text-muted">{fmtBytes(a.size)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {thread.length > 0 && (
          <div className="mt-6 rounded-lg border border-line">
            <button onClick={() => setOpenPrev((v) => !v)} className="flex w-full items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-ink">
              <ChevronDown size={14} className={cn('transition-transform', !openPrev && '-rotate-90')} />
              Previous Messages ({thread.length})
            </button>
            {(openPrev ? thread : thread.slice(0, 1)).map((x) => (
              <div key={x.id} className="flex gap-3 border-t border-line-soft px-4 py-3">
                <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold', avatarCls(x.fromName))}>{initialsOf(x.fromName)}</span>
                <div className="min-w-0 flex-1 text-[12px]">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-semibold text-ink">{x.fromName}</span>
                    <span className="text-muted">{fullTime(x.at)}</span>
                  </div>
                  <p className={cn('mt-0.5 text-ink-2', !openPrev && 'truncate')}>{openPrev ? x.body : x.body.replace(/\s+/g, ' ')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ToolBtn({ icon, children, onClick }: { icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-[12px] font-medium text-ink hover:bg-surface">
      {icon}
      {children}
    </button>
  )
}
function MenuItem({ icon, children, onClick }: { icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-surface">
      <span className="text-muted">{icon}</span>
      {children}
    </button>
  )
}

/* ------------------------------ side panel ------------------------------ */

function SidePanel({ m, all, aiRef }: { m: Mail; all: Mail[]; aiRef: React.RefObject<HTMLDivElement | null> }) {
  const nav = useNavigate()
  const tr = trackerById(m.tracker)
  const thread = threadOf(m, all)
  const [out, setOut] = useState<{ kind: 'summary' | 'reply' | 'text'; text: string } | null>(null)
  const [prompt, setPrompt] = useState('')
  const timeline = tr ? timelineOf(tr.id, all) : []
  const ask = () => {
    if (!prompt.trim()) return
    setOut(answer(prompt, m, thread))
    setPrompt('')
  }
  return (
    <div className="min-w-0 space-y-4 border-t border-line p-4 2xl:border-t-0">
      {/* Tracker */}
      <section className="rounded-lg border border-line p-4">
        <div className="text-[13px] font-semibold text-ink">Related Tracker / Case</div>
        {tr ? (
          <>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[14px] font-semibold text-primary">{tr.id}</span>
              <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', tr.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700' : tr.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-primary-soft text-primary')}>{tr.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <div>
                <div className="text-muted">Priority</div>
                <span className={cn('mt-0.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold', PRIORITY_CLS[tr.priority])}>{tr.priority}</span>
              </div>
              <div>
                <div className="text-muted">Category</div>
                <div className="mt-0.5 text-ink">{tr.category}</div>
              </div>
            </div>
            <div className="mt-4 text-[12px] font-semibold text-ink">Customer Details</div>
            <div className="mt-2 flex gap-3 text-[12px]">
              <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold', avatarCls(tr.customer.name))}>{initialsOf(tr.customer.name)}</span>
              <div className="min-w-0 space-y-0.5 text-ink-2">
                <div className="font-semibold text-ink">{tr.customer.name}</div>
                <div className="truncate">{tr.customer.email}</div>
                <div>{tr.customer.phone}</div>
                <div>{tr.customer.role}</div>
                <div>{tr.customer.location}</div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-muted">
              Created {fullTime(tr.createdOn)} · {tr.assignedTo}
            </div>
          </>
        ) : (
          <div className="mt-2 text-[12px] text-muted">
            No tracker linked to this email.
            <select
              aria-label="Link tracker"
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return
                updateMails([m.id], (x) => ({ ...x, tracker: e.target.value }))
                toast(`Linked to ${e.target.value}. It now appears in the tracker timeline.`)
              }}
              className="mt-2 h-8 w-full rounded-md border border-line px-2 text-[12px] text-ink"
            >
              <option value="">Link to a tracker…</option>
              {TRACKERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id} · {t.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Timeline */}
      {tr && (
        <section className="rounded-lg border border-line p-4">
          <div className="text-[13px] font-semibold text-ink">Communication Timeline</div>
          <ol className="mt-3 space-y-3 border-l border-line pl-4">
            {timeline.map((e, i) => (
              <li key={i} className="relative">
                <span className={cn('absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-white', e.kind === 'received' ? 'bg-bright' : e.kind === 'event' ? 'bg-slate-400' : e.kind === 'scheduled' ? 'bg-amber-500' : 'bg-emerald-600')} />
                <div className="text-[12px] font-semibold text-ink">{e.title}</div>
                {e.detail.split('\n').map((l, j) => (
                  <div key={j} className={cn('text-[11px]', j === 0 ? 'text-ink-2' : 'text-muted')}>
                    {j === 0 && e.mailId ? (
                      <Link to={`/email/${all.find((x) => x.id === e.mailId)?.folder ?? 'inbox'}?m=${e.mailId}`} className="hover:text-primary hover:underline">
                        {l}
                      </Link>
                    ) : (
                      l
                    )}
                  </div>
                ))}
                <div className="text-[11px] text-muted">{shortTime(e.at)}</div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* AI */}
      <section ref={aiRef} className="rounded-lg border border-line p-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Bot size={15} className="text-primary" /> AI Assistant
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={<Sparkles size={13} className="text-primary" />} onClick={() => setOut({ kind: 'summary', text: summarize(m, thread) })}>
            Summarize Thread
          </Button>
          <Button size="sm" variant="secondary" icon={<Reply size={13} className="text-primary" />} onClick={() => setOut({ kind: 'reply', text: suggestReply(m) })}>
            Suggest Reply
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-line px-2 focus-within:border-primary">
          <Sparkles size={13} className="shrink-0 text-muted" />
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} placeholder="Ask AI to draft a reply, summarize this thread, or suggest a follow-up..." className="h-9 min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted" />
          <button aria-label="Ask AI" onClick={ask} className="text-primary">
            <Send size={14} />
          </button>
        </div>
        {out && (
          <div className="mt-3 rounded-lg bg-primary-soft/60 p-3">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold tracking-wide text-primary uppercase">
              AI-generated (demo)
              <button aria-label="Dismiss" onClick={() => setOut(null)} className="text-muted">
                <X size={13} />
              </button>
            </div>
            <p className="text-[12px] whitespace-pre-line text-ink">{out.text}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
              <button
                className="flex items-center gap-1 font-semibold text-primary hover:underline"
                onClick={() => {
                  void navigator.clipboard?.writeText(out.text).catch(() => undefined)
                  toast('Copied to clipboard.', 'info')
                }}
              >
                <Copy size={12} /> Copy
              </button>
              {out.kind === 'reply' && (
                <button className="flex items-center gap-1 font-semibold text-primary hover:underline" onClick={() => nav(`/email/inbox/compose?reply=${m.id}`, { state: { body: out.text } })}>
                  <Check size={12} /> Use in reply
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
