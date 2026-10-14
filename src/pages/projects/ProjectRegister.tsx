import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Download, RotateCcw, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { exportProjects, restoreProject, useProjects, type Project } from '@/data/projects'
import { ProjectSheet, SheetFooter, StatusReference, useSheet } from './bands'

/**
 * Active / Archived Projects — consolidated register (Figma 75:5630 / 189:11557).
 * Band A–I only; open a project (Site/LOI Number or row) to see all 26 fields and Update project.
 */
export default function ProjectRegister() {
  const archived = useLocation().pathname.startsWith('/projects/archived')
  return <Register key={archived ? 'archived' : 'active'} archived={archived} />
}

function Register({ archived }: { archived: boolean }) {
  const navigate = useNavigate()
  const { projects } = useProjects()
  const base = useMemo(() => projects.filter((p) => p.archived === archived), [projects, archived])
  const sheet = useSheet(base)
  const models = [...new Set(projects.map((p) => p.f.model).filter(Boolean))].sort()
  const path = archived ? '/projects/archived' : '/projects/active'
  const name = archived ? 'Archived Projects' : 'Active Projects'
  const sel = [...sheet.selected].filter((id) => base.some((p) => p.id === id))

  const doExport = (rows: Project[], file: string) => {
    exportProjects(rows, file)
    toast(`${rows.length} project${rows.length === 1 ? '' : 's'} exported · recorded in the audit trail`)
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{name}</h1>
          <p className="mt-1 text-[14px] text-muted">Track site readiness, equipment installation and account activation in one register.</p>
        </div>
        <Button variant="secondary" icon={<Download size={16} />} onClick={() => doExport(sheet.rows, archived ? 'archived-projects' : 'active-projects')}>
          Export
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <Table2 size={14} className="text-primary" />
          {base.length} {archived ? 'archived' : 'active'} record{base.length === 1 ? '' : 's'} · 26 project fields · {models.length} models
        </span>
        <span>Unprovided identification details are shown as —</span>
      </div>

      <ProjectSheet
        tabs={
          archived
            ? [{ to: '/projects/archived', label: 'Archived Projects', active: true }]
            : [
                { to: '/projects/active', label: 'Active Projects', active: true },
                { to: '/projects/archived', label: 'Archived Projects', active: false },
              ]
        }
        tabNote="Wrapped column view · Open a project for all 26 fields"
        bands={[0]}
        sheet={sheet}
        title={archived ? 'Archived project register' : 'Active project register'}
        bandNote={`Rows 1–${sheet.rows.length}`}
        models={models}
        selectable
        editing={false}
        onRowClick={(id) => navigate(`${path}/${id}`)}
        link={(p) => (
          <Link to={`${path}/${p.id}`} className="font-medium text-primary hover:underline">
            {p.f.siteLoi || '—'}
          </Link>
        )}
        onExport={(rows) => doExport(rows, archived ? 'archived-project-register' : 'active-project-register')}
        pagination
        noun="records"
        footerLeft={`Selected: ${sel.length} row${sel.length === 1 ? '' : 's'} · ${base.length} ${archived ? 'archived' : 'active'} projects · Frozen columns: Site/LOI Number`}
        footerRight={
          archived && sel.length ? (
            <button
              className="inline-flex items-center gap-1 font-semibold hover:underline"
              onClick={() => {
                sel.forEach(restoreProject)
                sheet.setSelected(new Set())
                toast(`${sel.length} project${sel.length === 1 ? '' : 's'} restored to Active Projects`)
              }}
            >
              <RotateCcw size={12} /> Restore selected
            </button>
          ) : archived ? (
            'Deleted projects are archived, never erased'
          ) : (
            'Open a project to update it · Changes are saved to the audit trail'
          )
        }
      />

      <div className="mt-6">
        <StatusReference />
      </div>
      <SheetFooter />
    </div>
  )
}
