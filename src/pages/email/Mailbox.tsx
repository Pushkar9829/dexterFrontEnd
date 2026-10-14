import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Copy,
  Download,
  FileText,
  Filter,
  Forward,
  Image as ImageIcon,
  List,
  ListTodo,
  Mail as MailIcon,
  MailOpen,
  MapPin,
  MoreHorizontal,
  MoreVertical,
  Paperclip,
  Printer,
  Reply,
  ReplyAll,
  Search,
  Send,
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
import CaseEmail from './CaseEmail'

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
const AVATAR_BG = ['bg-primary text-white', 'bg-violet-600 text-white', 'bg-teal-600 text-white', 'bg-blue-600 text-white', 'bg-amber-500 text-white', 'bg-emerald-600 text-white']
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
  const [compact, setCompact] = useState(false)
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

  const pager = (
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[11px] text-muted">
      <div className="flex items-center gap-1 text-[12px]">
        <button aria-label="Previous page" disabled={cur === 1} onClick={() => setPage(cur - 1)} className="grid h-7 w-6 place-items-center text-ink-2 disabled:opacity-40">
          <ChevronLeft size={14} />
        </button>
        {pageList(cur, pages).map((p, i) =>
          p === 0 ? (
            <span key={'e' + i} className="px-1">
              …
            </span>
          ) : (
            <button key={p} onClick={() => setPage(p)} className={cn('h-6 min-w-6 rounded px-1.5', p === cur ? 'bg-primary-soft font-semibold text-primary' : 'text-ink-2 hover:bg-surface')}>
              {p}
            </button>
          ),
        )}
        <button aria-label="Next page" disabled={cur === pages} onClick={() => setPage(cur + 1)} className="grid h-7 w-6 place-items-center text-ink-2 disabled:opacity-40">
          <ChevronRight size={14} />
        </button>
      </div>
      <span>{filtered.length ? `Showing ${(cur - 1) * PAGE + 1}–${Math.min(cur * PAGE, filtered.length)} of ${filtered.length} emails` : '0 emails'}</span>
    </div>
  )

  // Compose opened from a tracker (?tracker=…) sits over that case's page, as in the Figma compose frame.
  const caseBehind = compose ? params.get('tracker') : null
  if (caseBehind && trackerById(caseBehind))
    return (
      <>
        <CaseEmail trackerId={caseBehind} />
        <ComposeDialog />
      </>
    )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-ink sm:text-[28px]">Email — {TITLES[folder]}</h1>
          <p className="mt-1 text-[13px] text-muted">Manage, read and respond to emails from connected accounts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (!selected) return toast('Open an email to use the AI Assistant.', 'info')
              aiRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              aiRef.current?.querySelector('textarea')?.focus()
            }}
            className="flex h-10 items-center gap-2 rounded-lg border border-primary/20 bg-primary-soft px-4 text-[13px] font-semibold text-primary hover:border-primary/40"
          >
            <Sparkles size={16} /> AI Assistant
          </button>
          <Button icon={<Send size={16} />} onClick={() => nav('/email/inbox/compose')}>
            Compose Email
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" className="scroll-thin flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1.5">
        {TABS.map((t) => {
          const n = inFolder.filter(t.test).length
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn('flex shrink-0 items-center gap-2.5 rounded-lg px-4 py-2 text-[13px]', tab === t.key ? 'bg-primary-soft font-semibold text-primary' : 'text-ink-2 hover:bg-surface')}
            >
              {t.label}
              <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-semibold', tab === t.key ? 'bg-white/70 text-primary' : 'bg-primary-soft text-primary')}>{n}</span>
            </button>
          )
        })}
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-2.5">
        <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line px-3 text-[13px] text-muted focus-within:border-primary">
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
        <Sel label="Date range" value={range} onChange={setRange} options={[['today', 'Today'], ['7', 'Last 7 Days'], ['30', 'Last 30 Days'], ['all', 'All time']]} />
        <div className="relative">
          <button onClick={() => setMore((v) => !v)} aria-expanded={more} className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-semibold text-primary hover:border-primary/40">
            <Filter size={14} /> More Filters
            {activeFilters > 0 && <span className="rounded bg-primary px-1.5 text-[11px] text-white">{activeFilters}</span>}
          </button>
          {more && (
            <div className="absolute top-11 right-0 z-30 w-64 space-y-2 rounded-lg border border-line bg-white p-3 text-[13px] shadow-lg">
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

      {/* Panes: list · reader · tracker / timeline / AI */}
      <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[325px_minmax(0,1fr)_310px]">
        {/* List */}
        <section className={cn('min-w-0 overflow-hidden rounded-xl border border-line bg-white lg:row-span-2 xl:row-span-1', selectedId ? 'hidden lg:block' : 'block')}>
          <div className="flex items-center gap-3 border-b border-line px-3 py-2.5 text-[12px]">
            <input
              type="checkbox"
              aria-label="Select all on page"
              checked={visible.length > 0 && visible.every((m) => sel.includes(m.id))}
              onChange={(e) => setSel(e.target.checked ? [...new Set([...sel, ...visible.map((m) => m.id)])] : sel.filter((id) => !visible.some((m) => m.id === id)))}
            />
            {folder === 'drafts' ? (
              <button
                aria-label="Discard selected drafts"
                title="Discard selected drafts"
                className="text-muted hover:text-brand-red"
                onClick={() => {
                  if (!sel.length) return toast('Select drafts first.', 'info')
                  sel.forEach(removeMail)
                  toast(`${sel.length} draft${sel.length > 1 ? 's' : ''} discarded.`)
                  setSel([])
                }}
              >
                <Trash2 size={15} />
              </button>
            ) : (
              <>
                <button
                  aria-label={mf.archived ? 'Unarchive selected' : 'Archive selected'}
                  title={mf.archived ? 'Unarchive selected' : 'Archive selected'}
                  className="text-muted hover:text-primary"
                  onClick={() => (sel.length ? bulk((m) => ({ ...m, archived: !mf.archived }), mf.archived ? 'restored' : 'archived') : toast('Select emails first.', 'info'))}
                >
                  <Archive size={15} />
                </button>
                <button
                  aria-label="Pin (star) selected"
                  title="Pin (star) selected"
                  className="text-muted hover:text-primary"
                  onClick={() => (sel.length ? bulk((m) => ({ ...m, starred: true }), 'pinned') : toast('Select emails first.', 'info'))}
                >
                  <MapPin size={15} />
                </button>
              </>
            )}
            {sel.length > 0 && folder !== 'drafts' && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">{sel.length}</span>
                <button title="Mark read" aria-label="Mark selected read" className="text-primary" onClick={() => bulk((m) => ({ ...m, read: true }), 'marked as read')}>
                  <MailOpen size={14} />
                </button>
                <button title="Mark unread" aria-label="Mark selected unread" className="text-primary" onClick={() => bulk((m) => ({ ...m, read: false }), 'marked as unread')}>
                  <MailIcon size={14} />
                </button>
              </div>
            )}
            <label className="relative ml-auto flex items-center text-ink-2">
              <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="cursor-pointer appearance-none bg-transparent pr-5 text-[12px] outline-none">
                <option value="newest">Newest first</option>
                <option value="unread">Unread first</option>
                <option value="oldest">Oldest first</option>
                <option value="priority">Priority</option>
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-0" />
            </label>
            <button aria-label={compact ? 'Show previews' : 'Compact list'} title={compact ? 'Show previews' : 'Compact list'} onClick={() => setCompact((v) => !v)} className={cn('hover:text-primary', compact ? 'text-primary' : 'text-ink-2')}>
              <List size={16} />
            </button>
          </div>
          <ul>
            {visible.map((m) => {
              const isSel = selected?.id === m.id
              const who = m.folder === 'inbox' ? m.fromName : m.to[0] ? `To: ${m.to[0]}` : '(no recipient)'
              const avatarName = m.folder === 'inbox' ? m.fromName : (m.to[0] ?? 'NA')
              return (
                <li key={m.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => open(m)}
                    onKeyDown={(e) => e.key === 'Enter' && open(m)}
                    className={cn('flex cursor-pointer gap-2.5 border-b border-l-[3px] border-b-line-soft px-3 py-3 outline-none hover:bg-surface/70 focus-visible:bg-surface', isSel ? 'border-l-primary bg-primary-soft/60 hover:bg-primary-soft/60' : 'border-l-transparent')}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select ${m.subject}`}
                      checked={sel.includes(m.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => setSel((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))}
                      className="mt-1"
                    />
                    <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold', avatarCls(avatarName))}>{initialsOf(avatarName)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('min-w-0 truncate text-[12px] text-ink', m.read ? 'font-medium' : 'font-semibold')}>{who}</span>
                        <span className="ml-auto shrink-0 text-[10px] text-muted">{m.sendState === 'Scheduled' ? 'Scheduled' : listTime(m.at)}</span>
                        <button
                          aria-label={m.starred ? 'Unstar' : 'Star'}
                          className="ml-2 shrink-0 text-muted"
                          onClick={(e) => {
                            e.stopPropagation()
                            updateMails([m.id], (x) => ({ ...x, starred: !x.starred }))
                          }}
                        >
                          <Star size={13} className={m.starred ? 'fill-amber-400 text-amber-500' : ''} />
                        </button>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] font-semibold text-ink">
                        {!m.read && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-bright align-middle" />}
                        {m.subject || '(no subject)'}
                      </div>
                      {!compact && <div className="truncate text-[10.5px] text-muted">{m.body.replace(/\s+/g, ' ').slice(0, 90)}</div>}
                      <div className="mt-1.5 flex items-center gap-2">
                        {m.tracker ? <span className="text-[10.5px] font-medium text-primary">{m.tracker}</span> : <MailIcon size={13} className="text-muted" aria-label="No tracker" />}
                        {m.sendState === 'Scheduled' && (
                          <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            <Clock3 size={10} /> Scheduled
                          </span>
                        )}
                        <span className="ml-auto flex items-center gap-2">
                          {m.attachments.length > 0 && <Paperclip size={12} className="text-primary" aria-label="Has attachments" />}
                          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', PRIORITY_CLS[m.priority])}>{m.priority}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          {filtered.length === 0 && <div className="px-6 py-14 text-center text-[13px] text-muted">{folder === 'drafts' ? 'No saved drafts.' : 'No emails match these filters.'}</div>}
          <div className="px-3 py-3 text-[11px] text-muted">
            {visible.length} conversation{visible.length === 1 ? '' : 's'} shown
          </div>
        </section>

        {/* Reader */}
        <section className={cn('min-w-0 rounded-xl border border-line bg-white', selectedId ? 'block' : 'hidden lg:block')}>
          {selected ? (
            <Reader key={selected.id} m={selected} all={mails} onBack={back} />
          ) : (
            <div className="grid min-h-[420px] place-items-center p-10 text-center text-[13px] text-muted">{folder === 'drafts' ? 'Open a draft to continue editing it in the composer.' : 'Select an email to read it.'}</div>
          )}
          <div className="mx-5 border-t border-line-soft" />
          {pager}
        </section>

        {/* Tracker · timeline · AI */}
        {selected && (
          <div className={cn('min-w-0 lg:col-start-2 xl:col-start-3 xl:row-start-1', selectedId ? 'block' : 'hidden lg:block')}>
            <SidePanel key={'side' + selected.id} m={selected} all={mails} aiRef={aiRef} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
        <span>
          Connected account: {account === 'all' ? 'support@dexterindia.com' : account} · {dept === 'all' ? 'All departments' : dept}
        </span>
        <button
          title="Sync now"
          onClick={() => {
            setSynced(EMAIL_NOW)
            toast('Mailbox synced · no new messages.', 'info')
          }}
          className="hover:text-primary"
        >
          Last synced {fullTime(new Date(synced).toISOString()).replace(/ (AM|PM)$/, '')} IST
        </button>
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

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="relative flex h-9 items-center rounded-lg border border-line bg-white pr-2 pl-3 text-[13px] font-semibold text-primary hover:border-primary/40">
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-full max-w-[200px] cursor-pointer appearance-none bg-transparent pr-5 outline-none">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2 text-primary" />
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
  const [openPrev, setOpenPrev] = useState(true)
  const thread = threadOf(m, all).filter((x) => Date.parse(x.at) < Date.parse(m.at))
  const go = (mode: string) => nav(`/email/inbox/compose?${mode}=${m.id}`)
  const createFollowUp = () => {
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
    toast(`${t.id} created from this email.`)
  }
  const demoFile = (name: string) => toast(`${name} is a demo attachment — no file content is stored.`, 'info')
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-2.5">
        <button onClick={onBack} className="flex items-center gap-1 text-[12px] text-primary lg:hidden">
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
          <ToolBtn icon={<MoreHorizontal size={15} />} onClick={() => setMenu((v) => !v)}>
            <span className="ml-2">More</span>
          </ToolBtn>
          {menu && (
            <div className="absolute top-8 right-0 z-30 w-52 rounded-lg border border-line bg-white p-1 text-[13px] shadow-lg" onMouseLeave={() => setMenu(false)}>
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
                  setMenu(false)
                  createFollowUp()
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

      <div className="px-5 pt-5 pb-2">
        <div className="flex flex-wrap items-start gap-3">
          <h2 className="min-w-0 flex-1 text-[16px] font-semibold text-ink">{m.subject || '(no subject)'}</h2>
          <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', PRIORITY_CLS[m.priority])}>{m.priority}</span>
          {m.sendState && <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', m.sendState === 'Scheduled' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>{m.sendState}</span>}
          <button aria-label={m.starred ? 'Remove star' : 'Star'} onClick={() => updateMails([m.id], (x) => ({ ...x, starred: !x.starred }))} className="text-muted hover:text-amber-500">
            <Star size={17} className={m.starred ? 'fill-amber-400 text-amber-500' : ''} />
          </button>
        </div>
        <div className="mt-2 text-[11px] text-muted">
          {fullTime(m.scheduledAt ?? m.at)}
          {m.sendState === 'Scheduled' && ' · scheduled send (IST)'}
        </div>

        <div className="mt-5 flex gap-3">
          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full text-[12px] font-semibold', avatarCls(m.fromName))}>{initialsOf(m.fromName)}</span>
          <div className="min-w-0 flex-1 space-y-1 text-[11.5px]">
            <div className="text-[12.5px] font-semibold text-ink">
              {m.fromName} <span className="text-[10.5px] font-normal text-muted">&lt;{m.fromEmail}&gt;</span>
            </div>
            <div className="text-muted">To: {m.to.join(', ') || '—'}</div>
            {m.cc.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-muted">
                Cc:
                <button onClick={() => setShowCc((v) => !v)} className="rounded bg-primary-soft px-2 py-0.5 font-medium text-primary">
                  {showCc ? m.cc.join(', ') : `${m.cc[0]}${m.cc.length > 1 ? ` +${m.cc.length - 1}` : ''}`}
                </button>
              </div>
            )}
            {m.bcc.length > 0 && <div className="text-muted">Bcc: {m.bcc.join(', ')}</div>}
          </div>
          <div className="flex shrink-0 items-start gap-2 pt-6 text-muted">
            <button aria-label="Reply" title="Reply" onClick={() => go('reply')} className="hover:text-primary">
              <Reply size={16} />
            </button>
            <button aria-label="More actions" title="More actions" onClick={() => setMenu((v) => !v)} className="hover:text-primary">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        <div className="mt-6">
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
          <div className="mt-6 border-t border-line-soft pt-4">
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 font-semibold text-ink">
                <Paperclip size={14} className="text-muted" />
                {m.attachments.length} Attachment{m.attachments.length > 1 ? 's' : ''}
              </span>
              <button onClick={() => toast('Attachments are demo records — no file content is stored in this preview.', 'info')} className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                <Download size={13} /> Download All
              </button>
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {m.attachments.map((a) => (
                <div key={a.name} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
                  <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded', /\.(png|jpe?g)$/i.test(a.name) ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                    {/\.(png|jpe?g)$/i.test(a.name) ? <ImageIcon size={15} /> : <FileText size={15} />}
                  </span>
                  <button onClick={() => demoFile(a.name)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[11px] font-medium text-ink">{a.name}</span>
                    <span className="block text-[10px] text-muted">{fmtBytes(a.size)}</span>
                  </button>
                  <button aria-label={`Download ${a.name}`} title="Download" onClick={() => demoFile(a.name)} className="text-muted hover:text-primary">
                    <MoreVertical size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {thread.length > 0 && (
          <div className="mt-5 border-t border-line-soft pt-4">
            <button onClick={() => setOpenPrev((v) => !v)} className="flex items-center gap-2 text-[12px] font-semibold text-ink">
              <ChevronDown size={14} className={cn('transition-transform', !openPrev && '-rotate-90')} />
              Previous Messages ({thread.length})
            </button>
            {openPrev && (
              <div className="mt-3 space-y-2">
                {thread.map((x) => (
                  <div key={x.id} className="rounded-lg border border-line bg-surface/40 px-3 py-3 text-[11px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-semibold', avatarCls(x.fromName))}>{initialsOf(x.fromName)}</span>
                      <span className="font-semibold text-ink">{x.fromName}</span>
                      <span className="ml-auto text-[10px] text-muted">{fullTime(x.at)}</span>
                    </div>
                    <p className="mt-2 truncate text-ink-2">{x.body.replace(/\s+/g, ' ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ToolBtn({ icon, children, onClick }: { icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-7 items-center gap-1.5 text-[11.5px] font-medium text-ink hover:text-primary">
      <span className="text-primary">{icon}</span>
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

const TL_ICON = {
  received: { icon: <MailIcon size={12} />, cls: 'bg-emerald-50 text-emerald-700', title: 'text-emerald-700' },
  sent: { icon: <Send size={12} />, cls: 'bg-primary-soft text-primary', title: 'text-primary' },
  scheduled: { icon: <Clock3 size={12} />, cls: 'bg-amber-50 text-amber-700', title: 'text-amber-700' },
  event: { icon: <ClipboardList size={12} />, cls: 'bg-primary-soft text-primary', title: 'text-primary' },
} as const

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
    <div className="min-w-0 space-y-4">
      {/* Tracker */}
      <section className="rounded-xl border border-line bg-white p-4">
        <h3 className="text-[13px] font-semibold text-ink">Related Tracker / Case</h3>
        {tr ? (
          <>
            <Link to={`/email/case/${tr.id}`} title="Open case email history" className="mt-3 flex items-center gap-2 text-[14px] font-semibold text-ink hover:text-primary">
              <ClipboardList size={16} className="text-primary" /> {tr.id}
            </Link>
            <div className="mt-3 flex items-start gap-6 border-b border-line-soft pb-4 text-[11px]">
              <div>
                <div className="text-muted">Priority</div>
                <span className={cn('mt-1 inline-block rounded px-1.5 py-0.5 text-[10.5px] font-semibold', PRIORITY_CLS[tr.priority])}>{tr.priority}</span>
              </div>
              <div>
                <div className="text-muted">Category</div>
                <div className="mt-1 text-ink">{tr.category}</div>
              </div>
              <span className={cn('ml-auto rounded px-2 py-0.5 text-[10.5px] font-semibold', tr.status === 'Resolved' ? 'bg-slate-100 text-slate-600' : tr.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>{tr.status}</span>
            </div>
            <div className="mt-4 text-[12px] font-semibold text-ink">Customer Details</div>
            <div className="mt-3 flex gap-3 text-[10.5px]">
              <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-semibold', avatarCls(tr.customer.name))}>{initialsOf(tr.customer.name)}</span>
              <div className="min-w-0 space-y-1.5 text-muted">
                <div className="text-[11.5px] font-semibold text-ink">{tr.customer.name}</div>
                <div className="truncate">{tr.customer.email}</div>
                <div>{tr.customer.phone}</div>
                <div className="leading-snug">
                  {tr.customer.role}
                  <br />
                  {tr.customer.location}
                </div>
              </div>
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
        <section className="rounded-xl border border-line bg-white p-4">
          <h3 className="text-[13px] font-semibold text-ink">Communication Timeline</h3>
          <ol className="mt-4 space-y-4">
            {timeline.map((e, i) => {
              const k = TL_ICON[e.kind]
              return (
                <li key={i} className="flex gap-3">
                  <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full', k.cls)}>{k.icon}</span>
                  <div className="min-w-0 text-[10px] leading-relaxed">
                    <div className={cn('text-[10.5px] font-semibold', k.title)}>{e.title}</div>
                    {e.detail.split('\n').map((l, j) => (
                      <div key={j} className={cn('truncate', j === 0 ? 'text-[10.5px] text-ink' : 'text-muted')}>
                        {j === 0 && e.mailId ? (
                          <Link to={`/email/${all.find((x) => x.id === e.mailId)?.folder ?? 'inbox'}?m=${e.mailId}`} className="hover:text-primary hover:underline">
                            {l}
                          </Link>
                        ) : (
                          l
                        )}
                      </div>
                    ))}
                    <div className="text-muted">{shortTime(e.at)}</div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {/* AI */}
      <section ref={aiRef} className="rounded-xl border border-line bg-white p-4">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary">
          <Sparkles size={16} /> AI Assistant
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setOut({ kind: 'summary', text: summarize(m, thread) })} className="flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-[11px] font-semibold text-primary hover:border-primary/40">
            <FileText size={13} /> Summarize Thread
          </button>
          <button onClick={() => setOut({ kind: 'reply', text: suggestReply(m) })} className="flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-[11px] font-semibold text-primary hover:border-primary/40">
            <Sparkles size={13} /> Suggest Reply
          </button>
        </div>
        <textarea
          aria-label="Ask AI"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              ask()
            }
          }}
          placeholder="Ask AI to draft a reply, summarize this thread, or suggest a follow-up..."
          className="mt-3 w-full resize-none rounded-lg border border-line px-2.5 py-2 text-[11px] outline-none placeholder:text-muted focus:border-primary"
        />
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
