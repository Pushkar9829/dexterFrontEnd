// Activity history + Task history for one Site Master record (Project spec §13 actions, §17 audit).
import { useEffect, useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { employeeById, useWorkflow } from '@/data/workflow'
import { useMasterAudit } from '@/data/network'
import { projectAudit, refreshProject } from '@/data/projects'
import { refreshInstall } from '@/data/siteInstallation'
import { Crumbs } from '@/pages/masterdata/sites/ui'
import { fmtDT } from './format'
import { useSiteMasterData } from './metrics'

type Act = { id: string; at: string; by: string; source: string; action: string; detail?: string }

export default function ProjectAudit() {
  const { projectId = '' } = useParams()
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') === 'tasks' ? 'tasks' : 'activity'
  const { rows, installs, ps } = useSiteMasterData()
  const wf = useWorkflow()
  const master = useMasterAudit()
  const row = rows.find((r) => r.p.id === projectId || r.site.siteId === projectId)
  const siteId = row?.site.siteId ?? ''
  const insts = useMemo(() => installs.filter((r) => r.siteId === siteId), [installs, siteId])
  const instIds = useMemo(() => new Set(insts.map((r) => r.id)), [insts])
  const instKey = insts.map((r) => r.id).join(',')
  // API mode: project events + installation history come from the detail endpoints
  useEffect(() => {
    if (siteId) refreshProject(siteId).catch(() => undefined)
  }, [siteId])
  useEffect(() => {
    instKey.split(',').filter(Boolean).forEach((id) => refreshInstall(id).catch(() => undefined))
  }, [instKey])

  const activity = useMemo<Act[]>(() => {
    if (!siteId) return []
    const a: Act[] = [
      ...projectAudit(ps, siteId).map((e) => ({ id: e.id, at: e.at, by: e.by, source: 'Site Master', action: e.action, detail: e.detail })),
      ...master.filter((m) => m.ref === siteId).map((m) => ({ id: m.id, at: m.at, by: m.by, source: 'Master Data', action: m.action, detail: [m.before, m.after].filter(Boolean).join(' → ') || undefined })),
      ...insts.flatMap((r) => r.history.map((h) => ({ id: h.id, at: h.at, by: `${h.by} (${h.role})`, source: `Installation ${r.id}`, action: h.action, detail: h.detail }))),
      ...wf.audit.filter((x) => instIds.has(x.ref)).map((x) => ({ id: x.id, at: x.at, by: x.by, source: 'Workflow engine', action: x.action, detail: x.detail })),
    ]
    return a.sort((x, y) => y.at.localeCompare(x.at))
  }, [siteId, ps, master, insts, wf.audit, instIds])

  const tasks = useMemo(() => wf.tasks.filter((t) => t.siteId === siteId || instIds.has(t.refId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [wf.tasks, siteId, instIds])
  const emails = useMemo(() => wf.emails.filter((e) => instIds.has(e.refId)), [wf.emails, instIds])

  if (!row)
    return (
      <div className="rounded-xl border border-line bg-white p-10 text-center text-[13px] text-muted">
        Record {projectId} not found. <Link to="/projects/active" className="font-semibold text-primary">Back to Project Site Register</Link>
      </div>
    )
  const back = `/projects/${row.lifecycle === 'Archived' ? 'archived' : 'active'}/${encodeURIComponent(row.p.id)}`
  return (
    <div className="space-y-5">
      <Crumbs items={[{ label: 'Projects', to: '/projects' }, { label: 'Project Site Register', to: '/projects/active' }, { label: siteId, to: back }, { label: tab === 'tasks' ? 'Task history' : 'Activity history' }]} />
      <div>
        <Link to={back} className="mb-1 inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-primary">
          <ArrowLeft size={13} /> {siteId}
        </Link>
        <h1 className="text-[24px] font-semibold tracking-tight text-ink">{tab === 'tasks' ? 'Task history' : 'Activity history'}</h1>
        <p className="mt-0.5 text-[12.5px] text-muted">
          {row.p.loiNumber} · {row.frName} — edits, approvals, rejections, deletions and workflow events are retained independently of the current status.
        </p>
      </div>
      <div className="flex gap-1.5" role="tablist">
        {(['activity', 'tasks'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setSp(t === 'tasks' ? { tab: 'tasks' } : {}, { replace: true })}
            className={cn('rounded-lg border px-3.5 py-1.5 text-[12px] font-semibold', tab === t ? 'border-primary bg-primary text-white' : 'border-line bg-white text-ink-2')}
          >
            {t === 'tasks' ? `Task history (${tasks.length})` : `Activity history (${activity.length})`}
          </button>
        ))}
      </div>

      {tab === 'activity' ? (
        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[820px] text-[12px]">
              <thead className="bg-surface text-left text-[11px] text-muted">
                <tr>
                  {['When', 'Source', 'Action', 'Detail', 'By'].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activity.map((a) => (
                  <tr key={a.id} className="border-t border-line-soft align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-muted">{fmtDT(a.at)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{a.source}</td>
                    <td className="px-3 py-2 font-medium text-ink">{a.action}</td>
                    <td className="px-3 py-2 text-ink-2">{a.detail ?? '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{a.by}</td>
                  </tr>
                ))}
                {!activity.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted">
                      No activity recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[900px] text-[12px]">
                <thead className="bg-surface text-left text-[11px] text-muted">
                  <tr>
                    {['Task', 'Module / Ref', 'Assigned to', 'Created', 'Due', 'Status', 'Escalation', 'History'].map((h) => (
                      <th key={h} className="px-3 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id} className="border-t border-line-soft align-top">
                      <td className="px-3 py-2">
                        <div className="font-medium text-ink">{t.title}</div>
                        <div className="text-[10.5px] text-muted">{t.id}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {t.module}
                        <div className="text-[10.5px] text-muted">{t.refId}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{employeeById(t.assignedTo)?.name ?? t.assignedTo}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted">{fmtDT(t.createdAt)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted">{fmtDT(t.dueAt)}</td>
                      <td className="px-3 py-2">
                        <Badge tone={toneFor(t.status)}>{t.status}</Badge>
                      </td>
                      <td className="px-3 py-2">L{t.escalationLevel}</td>
                      <td className="px-3 py-2 text-[11px] text-ink-2">
                        {t.history.slice(-3).map((h) => (
                          <div key={`${h.at}-${h.text}`}>
                            {fmtDT(h.at)} · {h.text}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                  {!tasks.length && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-muted">
                        No tasks for this site yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="rounded-xl border border-line bg-white p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <Mail size={14} /> Emails sent (template version + resolved recipients)
            </h3>
            {emails.length ? (
              <ul className="space-y-1.5 text-[12px]">
                {emails.map((e) => (
                  <li key={e.id} className="rounded-lg bg-surface px-3 py-2">
                    <span className="font-medium text-ink">{e.subject}</span>
                    <span className="block text-[11px] text-muted">
                      {fmtDT(e.at)} · {e.templateCode} v{e.templateVersion} · to {e.to.join(', ') || '—'} · {e.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-muted">No emails for this site yet.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
