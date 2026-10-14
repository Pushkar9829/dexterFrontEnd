import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, ClipboardList, FileText, Image as ImageIcon, Mail as MailIcon, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { emailStore, fmtBytes, fullTime, initialsOf, shortTime, timelineOf, trackerById, TRACKERS } from '@/data/email'
import { tasksStore } from '@/data/tasks'

/* Case page (Complaints / Cases) as it appears behind "Compose Email" in Figma 157:7240:
   case header with key facts, case tabs and the Email History of the tracker. */

const TABS = ['Overview', 'Activity', 'Email', 'Documents', 'Tasks', 'SLA', 'Customer', 'Related Cases'] as const
type Tab = (typeof TABS)[number]

const PRIORITY_CLS: Record<string, string> = {
  High: 'bg-red-50 text-red-700',
  Medium: 'bg-amber-50 text-amber-700',
  Normal: 'bg-primary-soft text-primary',
  Low: 'bg-slate-100 text-slate-600',
}

export function CaseEmailRoute() {
  const { trackerId = '' } = useParams()
  return <CaseEmail trackerId={trackerId} />
}

export default function CaseEmail({ trackerId }: { trackerId: string }) {
  const nav = useNavigate()
  const { mails } = emailStore.use()
  const { tasks } = tasksStore.use()
  const [tab, setTab] = useState<Tab>('Email')
  const tr = trackerById(trackerId)
  if (!tr)
    return (
      <div className="rounded-xl border border-line bg-white p-10 text-center">
        <p className="text-[15px] font-semibold">Case {trackerId} not found</p>
        <Link to="/email/inbox" className="mt-3 inline-block text-[13px] font-semibold text-primary hover:underline">
          Back to My Inbox
        </Link>
      </div>
    )
  const compose = () => nav(`/email/inbox/compose?tracker=${tr.id}`)
  const caseMails = mails.filter((m) => m.tracker === tr.id && m.folder !== 'drafts').sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  const timeline = timelineOf(tr.id, mails)
  const docs = caseMails.flatMap((m) => m.attachments.map((a) => ({ ...a, at: m.at, by: m.fromName })))
  const caseTasks = tasks.filter((t) => t.entityId === tr.id)
  const related = TRACKERS.filter((t) => t.id !== tr.id && (t.category === tr.category || t.customer.name === tr.customer.name || t.id.slice(0, 3) === tr.id.slice(0, 3)))
  const firstReply = caseMails.filter((m) => m.folder === 'sent').sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0]

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[11px] text-muted">
        <span>Case</span>
        <ChevronRight size={12} />
        <span>Complaints / Cases</span>
        <ChevronRight size={12} />
        <span className="font-semibold text-ink">{tr.id}</span>
      </nav>

      <section className="rounded-xl border border-line bg-white px-5 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MailIcon size={20} className="text-primary" />
            <h1 className="text-[22px] font-semibold text-ink">{tr.id}</h1>
            <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', tr.status === 'Open' ? 'bg-emerald-50 text-emerald-700' : tr.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>{tr.status}</span>
          </div>
          <Button icon={<Send size={15} />} onClick={compose}>
            Send Email
          </Button>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-[12px] sm:grid-cols-3 xl:grid-cols-6">
          <Fact label="Priority">
            <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-semibold', PRIORITY_CLS[tr.priority])}>{tr.priority}</span>
          </Fact>
          <Fact label="Category">{tr.category}</Fact>
          <Fact label="Customer">{tr.customer.name}</Fact>
          <Fact label="Location">{tr.customer.location}</Fact>
          <Fact label="Created On">{fullTime(tr.createdOn)}</Fact>
          <Fact label="Assigned To">{tr.assignedTo}</Fact>
        </dl>
        <div role="tablist" className="scroll-thin mt-5 flex gap-6 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('shrink-0 border-b-2 pb-2.5 text-[12px]', tab === t ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted hover:text-ink')}>
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        {tab === 'Email' && (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-ink">Email History</h2>
              <Button size="sm" icon={<Send size={13} />} onClick={compose}>
                Compose Email
              </Button>
            </div>
            <ul className="mt-3 divide-y divide-line-soft">
              {caseMails.map((m) => (
                <li key={m.id}>
                  <Link to={`/email/${m.folder}?m=${m.id}`} className="flex items-center gap-3 py-3 hover:bg-surface/60">
                    <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full', m.folder === 'inbox' ? 'bg-emerald-50 text-emerald-700' : 'bg-primary-soft text-primary')}>{m.folder === 'inbox' ? <MailIcon size={13} /> : <Send size={13} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{m.subject}</span>
                      <span className="block truncate text-[11px] text-muted">
                        {m.folder === 'inbox' ? `From: ${m.fromEmail}` : `To: ${m.to.join(', ')}`} · {fullTime(m.scheduledAt ?? m.at)}
                      </span>
                    </span>
                    <span className={cn('shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold', m.folder === 'inbox' ? 'bg-emerald-50 text-emerald-700' : m.sendState === 'Scheduled' ? 'bg-amber-50 text-amber-700' : 'bg-primary-soft text-primary')}>{m.folder === 'inbox' ? 'Reply Received' : (m.sendState ?? 'Sent')}</span>
                  </Link>
                </li>
              ))}
              {!caseMails.length && <li className="py-8 text-center text-[13px] text-muted">No emails on this case yet.</li>}
            </ul>
          </>
        )}
        {tab === 'Overview' && (
          <Block title="Overview">
            <p className="text-[13px] text-ink">
              {tr.title} · {tr.category} reported by {tr.customer.name} ({tr.customer.role}, {tr.customer.org}). Currently {tr.status.toLowerCase()} and assigned to {tr.assignedTo}.
            </p>
            <p className="mt-2 text-[12px] text-muted">
              {caseMails.length} emails · {docs.length} documents · {caseTasks.length} linked tasks
            </p>
          </Block>
        )}
        {tab === 'Activity' && (
          <Block title="Activity">
            <ol className="space-y-3">
              {timeline.map((e, i) => (
                <li key={i} className="text-[12px]">
                  <span className="font-semibold text-ink">{e.title}</span> <span className="text-muted">· {shortTime(e.at)}</span>
                  <div className="text-ink-2">{e.detail.split('\n')[0]}</div>
                </li>
              ))}
            </ol>
          </Block>
        )}
        {tab === 'Documents' && (
          <Block title="Documents">
            <div className="grid gap-2 sm:grid-cols-2">
              {docs.map((d, i) => (
                <button key={d.name + i} onClick={() => toast(`${d.name} is a demo attachment — no file content is stored.`, 'info')} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-left hover:border-primary/40">
                  <span className={cn('grid h-8 w-8 place-items-center rounded', /\.(png|jpe?g)$/i.test(d.name) ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>{/\.(png|jpe?g)$/i.test(d.name) ? <ImageIcon size={14} /> : <FileText size={14} />}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium">{d.name}</span>
                    <span className="block text-[11px] text-muted">
                      {fmtBytes(d.size)} · {d.by} · {shortTime(d.at)}
                    </span>
                  </span>
                </button>
              ))}
              {!docs.length && <p className="text-[13px] text-muted">No documents on this case.</p>}
            </div>
          </Block>
        )}
        {tab === 'Tasks' && (
          <Block title="Tasks">
            {caseTasks.map((t) => (
              <Link key={t.id} to={`/tasks/my/${t.id}`} className="flex items-center gap-3 border-b border-line-soft py-2.5 text-[13px] last:border-0 hover:text-primary">
                <ClipboardList size={14} className="text-primary" />
                <span className="font-medium text-primary">{t.id}</span>
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="text-[11px] text-muted">{t.status}</span>
              </Link>
            ))}
            {!caseTasks.length && <p className="text-[13px] text-muted">No tasks linked to this case. Use “Follow-up Task” while composing to create one.</p>}
          </Block>
        )}
        {tab === 'SLA' && (
          <Block title="SLA">
            <dl className="grid gap-3 text-[12px] sm:grid-cols-3">
              <Fact label="Case created">{fullTime(tr.createdOn)}</Fact>
              <Fact label="First response">{firstReply ? fullTime(firstReply.at) : 'Pending'}</Fact>
              <Fact label="Last update">{caseMails[0] ? fullTime(caseMails[0].at) : '—'}</Fact>
            </dl>
          </Block>
        )}
        {tab === 'Customer' && (
          <Block title="Customer">
            <div className="flex gap-3 text-[12px]">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-600 text-[12px] font-semibold text-white">{initialsOf(tr.customer.name)}</span>
              <div className="space-y-0.5 text-ink-2">
                <div className="font-semibold text-ink">{tr.customer.name}</div>
                <div>{tr.customer.email}</div>
                <div>{tr.customer.phone}</div>
                <div>
                  {tr.customer.role} · {tr.customer.org}
                </div>
                <div>{tr.customer.location}</div>
              </div>
            </div>
          </Block>
        )}
        {tab === 'Related Cases' && (
          <Block title="Related Cases">
            {related.map((t) => (
              <Link key={t.id} to={`/email/case/${t.id}`} className="flex items-center gap-3 border-b border-line-soft py-2.5 text-[13px] last:border-0">
                <span className="font-medium text-primary">{t.id}</span>
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="text-[11px] text-muted">{t.status}</span>
              </Link>
            ))}
            {!related.length && <p className="text-[13px] text-muted">No related cases.</p>}
          </Block>
        )}
      </section>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="mt-1.5 font-medium text-ink">{children}</dd>
    </div>
  )
}
function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h2 className="mb-3 text-[15px] font-semibold text-ink">{title}</h2>
      {children}
    </>
  )
}
