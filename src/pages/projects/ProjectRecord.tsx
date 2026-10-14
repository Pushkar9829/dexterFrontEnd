import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Circle, Download, History, Pencil, RotateCcw, Save, Scale, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { agreementOf, fmtDate, fmtDateTime, useLegal } from '@/data/legal'
import { MILESTONES, PROJECT_FIELDS, archiveProject, exportProjects, getProject, progressOf, projectAudit, restoreProject, saveProjectFields, useProjects, type Project } from '@/data/projects'
import { BackLink, StatusBadge } from '@/pages/legal/ui'
import { ProjectBands, StatusReference } from './bands'

const label = (k: string) => PROJECT_FIELDS.find((f) => f.key === k)?.label ?? k
const DELETE_REASONS = ['Site dropped', 'Duplicate entry', 'Franchise agreement terminated', 'Location changed · new record created']

/** Single project record — three bands, Update project (edit → Save), Delete (archive) / Restore. */
export default function ProjectRecord() {
  const { projectId = '' } = useParams()
  const archivedPath = useLocation().pathname.startsWith('/projects/archived')
  const navigate = useNavigate()
  const state = useProjects()
  const legal = useLegal()
  const [draft, setDraft] = useState<Record<string, string> | null>(null)
  const [confirm, setConfirm] = useState(false)
  const p = getProject(state, projectId)
  if (!p) return <Navigate to={archivedPath ? '/projects/archived' : '/projects/active'} replace />
  const path = p.archived ? '/projects/archived' : '/projects/active'
  if (p.archived !== archivedPath) return <Navigate to={`${path}/${p.id}`} replace />

  const editing = draft !== null
  const row: Project = draft ? { ...p, f: draft } : p
  const pr = progressOf(row)
  const agr = agreementOf(legal, p.siteId)
  const lastEvent = projectAudit(state, p.id)[0]

  const save = () => {
    if (!draft) return
    const n = saveProjectFields(p.id, draft)
    setDraft(null)
    toast(n ? `${n} field${n > 1 ? 's' : ''} updated · recorded in audit history` : 'No changes to save', n ? 'success' : 'info')
  }

  return (
    <div>
      <BackLink to={path}>Back to {p.archived ? 'Archived' : 'Active'} Projects</BackLink>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] font-semibold tracking-tight">{p.f.siteLoi || p.id}</h1>
            {p.archived ? <Badge tone="gray">Archived</Badge> : <Badge tone={pr.done === pr.total ? 'green' : 'blue'}>{pr.done === pr.total ? 'Live' : 'In rollout'}</Badge>}
          </div>
          <p className="mt-1 text-[14px] text-muted">
            {p.id} · {p.f.franchisee} ·{' '}
            <Link to={`/franchise/master-data/${p.franchiseId}`} className="text-primary hover:underline">
              {p.franchiseId}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button variant="secondary" icon={<X size={16} />} onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button variant="bright" icon={<Save size={16} />} onClick={save}>
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                icon={<Download size={16} />}
                onClick={() => {
                  exportProjects([p], `${p.id}-project-record`)
                  toast('Project record exported · recorded in the audit trail')
                }}
              >
                Export
              </Button>
              <Link to={`${path}/${p.id}/audit`}>
                <Button variant="secondary" icon={<History size={16} />}>
                  Audit history
                </Button>
              </Link>
              {p.archived ? (
                <Button
                  icon={<RotateCcw size={16} />}
                  onClick={() => {
                    restoreProject(p.id)
                    toast(`${p.f.siteLoi} restored to Active Projects`)
                    navigate(`/projects/active/${p.id}`, { replace: true })
                  }}
                >
                  Restore
                </Button>
              ) : (
                <>
                  <Button icon={<Pencil size={16} />} onClick={() => setDraft({ ...p.f })}>
                    Update project
                  </Button>
                  <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setConfirm(true)}>
                    Delete
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {p.archived && (
        <div className="mb-4 rounded-lg border border-line bg-surface px-4 py-2.5 text-[13px] text-ink-2">
          Archived {fmtDateTime(p.archivedAt)} · {p.archiveReason}. Restore the project to edit it.
        </div>
      )}

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-muted">GO-LIVE PROGRESS</div>
              <div className="mt-1 text-[22px] font-semibold">
                {pr.done} of {pr.total} milestones done
              </div>
            </div>
            <span className="text-[13px] font-semibold text-primary">{pr.pct}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
            <div className={cn('h-full rounded-full', pr.done === pr.total ? 'bg-accent-green' : 'bg-primary')} style={{ width: `${pr.pct}%` }} />
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {MILESTONES.map((m) => {
              const done = m.done(row.f[m.key] ?? '')
              return (
                <span key={m.key} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]', done ? 'bg-emerald-50 text-emerald-700' : 'bg-surface text-muted')}>
                  {done ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                  {label(m.key)}
                </span>
              )
            })}
          </div>
          <p className="mt-3 text-[12px] text-muted">
            Projection completion date: {row.f.projectionDate ? fmtDate(row.f.projectionDate) : 'Pending'} · Status: {row.f.status || '—'}
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="text-[15px] font-semibold">Linked records</h3>
          <div className="mt-3 space-y-2 text-[13px]">
            <Link to={`/cbr/consolidated?site=${p.siteId}`} className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 hover:border-primary/50">
              Consolidated Datewise CBR <ArrowRight size={14} className="text-primary" />
            </Link>
            <Link to={`/legal/${p.siteId}`} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2.5 hover:border-primary/50">
              <span className="flex items-center gap-1.5">
                <Scale size={14} className="text-primary" /> Legal summary
              </span>
              <span className="flex items-center gap-2">
                {agr && <StatusBadge status={agr.status} className="text-[11px]" />}
                <ArrowRight size={14} className="text-primary" />
              </span>
            </Link>
          </div>
          {lastEvent && (
            <p className="mt-3 text-[12px] text-muted">
              Last change · {lastEvent.actor} · {lastEvent.event} · {fmtDateTime(lastEvent.at)}
            </p>
          )}
        </Card>
      </div>

      {editing && (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-[12px] text-blue-800">
          Editable grid · Double-click a cell to edit · Changes are saved when you press Save.
        </div>
      )}

      <ProjectBands
        title="Project record"
        noun="project"
        rows={[row]}
        editing={editing}
        onCellChange={(_, key, value) => setDraft((d) => ({ ...(d ?? p.f), [key]: value }))}
      />

      <div className="mt-4">
        <StatusReference />
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-[12px] text-muted">
        <span>{editing ? 'Selected: 1 record · All 26 columns shown in three bands' : 'Project updates respect workspace permissions. Exports are recorded in the audit trail.'}</span>
        <span>Dates shown as DD.MM.YYYY</span>
      </div>

      {confirm && <DeleteDialog project={p} onClose={() => setConfirm(false)} onDone={() => navigate(`/projects/archived/${p.id}`, { replace: true })} />}
    </div>
  )
}

function DeleteDialog({ project, onClose, onDone }: { project: Project; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    if (!reason) return setErr('Select a reason')
    archiveProject(project.id, note.trim() ? `${reason} · ${note.trim()}` : reason)
    toast(`${project.f.siteLoi} moved to Archived Projects`)
    onClose()
    onDone()
  }
  return (
    <Modal
      title="Delete project?"
      sub={`${project.f.siteLoi} · ${project.id}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={submit}>
            Delete project
          </Button>
        </>
      }
    >
      <p className="mb-4 text-[13px] text-ink-2">
        The project moves to <b>Archived Projects</b>. Nothing is erased — all 26 fields and the audit history are kept, and the record can be restored at any time.
      </p>
      <div className="space-y-3">
        <SelectField label="Reason" required options={DELETE_REASONS} value={reason} onChange={(e) => { setReason(e.target.value); setErr('') }} error={err} />
        <TextAreaField label="Note (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  )
}
