import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getProject, progressOf, projectAudit, useProjects } from '@/data/projects'
import { AuditHistory } from '@/pages/legal/AuditHistory'

/** Audit history of one project record (shared read-only audit component from the Legal module). */
export default function ProjectAudit() {
  const { projectId = '' } = useParams()
  const archivedPath = useLocation().pathname.startsWith('/projects/archived')
  const state = useProjects()
  const p = getProject(state, projectId)
  if (!p) return <Navigate to={archivedPath ? '/projects/archived' : '/projects/active'} replace />
  const path = `${p.archived ? '/projects/archived' : '/projects/active'}/${p.id}`
  if (p.archived !== archivedPath) return <Navigate to={`${path}/audit`} replace />
  const pr = progressOf(p)

  return (
    <AuditHistory
      back={{ to: path, label: 'Back to project record' }}
      sub={`Project ${p.id} · ${p.f.siteLoi} · Every create, update, export, archive and restore`}
      actions={
        <Link to={path}>
          <Button icon={<Eye size={16} />}>View project</Button>
        </Link>
      }
      context={
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[18px] font-semibold">
              {p.f.siteLoi} · {p.f.siteLocation}
            </div>
            <div className="mt-1 text-[13px] text-ink-2">
              {p.id}
              <span className="mx-2 text-muted">/</span>
              {p.f.franchisee}
              <span className="mx-2 text-muted">/</span>
              {p.f.model}
              <span className="mx-2 text-muted">/</span>
              {pr.done} of {pr.total} milestones done
            </div>
          </div>
          <Badge tone={p.archived ? 'gray' : 'blue'}>{p.archived ? 'Archived' : 'Active'}</Badge>
        </div>
      }
      events={projectAudit(state, p.id)}
      gridTitle="Project change log"
      exportName={`${p.id}-audit-log`}
      footerRef={p.id}
      showVersions={false}
      policy="Audit events are read-only and cannot be edited or deleted. Field changes keep their previous and new values."
    />
  )
}
