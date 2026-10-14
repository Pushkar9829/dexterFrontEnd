import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Download, PenSquare, RotateCcw, Table2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { fmtDateTime } from '@/data/legal'
import { archiveProject, exportProjects, getProject, restoreProject, saveProjectFields, useProjects, type Project } from '@/data/projects'
import { ProjectSheet, SheetFooter, StatusReference, useSheet } from './bands'

const DELETE_REASONS = ['Site dropped', 'Duplicate entry', 'Franchise agreement terminated', 'Location changed · new record created']

/**
 * One project record (Figma 189:9413 view → 189:10405 edit).
 * The record across the three bands A–I, J–R, S–Z · Update project → editable grid → Save · Delete archives it.
 */
export default function ProjectRecord() {
  const { projectId = '' } = useParams()
  const archivedPath = useLocation().pathname.startsWith('/projects/archived')
  const state = useProjects()
  const p = getProject(state, projectId)
  if (!p) return <Navigate to={archivedPath ? '/projects/archived' : '/projects/active'} replace />
  const path = p.archived ? '/projects/archived' : '/projects/active'
  if (p.archived !== archivedPath) return <Navigate to={`${path}/${p.id}`} replace />
  return <RecordView key={p.id} p={p} path={path} />
}

function RecordView({ p, path }: { p: Project; path: string }) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Record<string, string> | null>(null)
  const [confirm, setConfirm] = useState(false)
  const editing = draft !== null
  const row: Project = draft ? { ...p, f: draft } : p
  const sheet = useSheet([row])

  const save = () => {
    if (!draft) return
    const n = saveProjectFields(p.id, draft)
    setDraft(null)
    sheet.setSelected(new Set())
    toast(n ? `${n} field${n > 1 ? 's' : ''} updated · recorded in audit history` : 'No changes to save', n ? 'success' : 'info')
  }
  const doExport = () => {
    exportProjects([row], `${p.id}-project-record`)
    toast('Project record exported · recorded in the audit trail')
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold tracking-tight">{p.f.siteLoi || p.id}</h1>
          <p className="mt-1 text-[14px] text-muted">Track site readiness, equipment installation and account activation in one register.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Download size={16} />} onClick={doExport}>
            Export
          </Button>
          {editing ? (
            <Button onClick={save}>Save</Button>
          ) : p.archived ? (
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
              <Button
                icon={<PenSquare size={16} />}
                onClick={() => {
                  setDraft({ ...p.f })
                  sheet.setSelected(new Set([p.id]))
                }}
              >
                Update project
              </Button>
              <button
                onClick={() => setConfirm(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-red px-4 text-[13px] font-semibold text-white hover:bg-brand-red/90"
              >
                <Trash2 size={16} /> Delete
              </button>
            </>
          )}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <Table2 size={14} className="text-primary" />1 supplied record · 26 project fields · {row.f.model || '—'}
        </span>
        <span>Unprovided identification details are shown as —</span>
      </div>

      {p.archived && (
        <div className="mb-4 rounded-lg border border-line bg-white px-4 py-2.5 text-[12px] text-ink-2">
          Archived {fmtDateTime(p.archivedAt)} · {p.archiveReason}. Restore the project to update it.
        </div>
      )}

      <ProjectSheet
        tabs={
          editing
            ? [{ to: path, label: p.archived ? 'Archived Projects' : 'Active Projects', active: true }]
            : [
                { to: '/projects/active', label: 'Active Projects', active: !p.archived },
                { to: '/projects/archived', label: 'Archived Projects', active: p.archived },
              ]
        }
        tabNote="Wrapped column view · All 26 fields visible"
        bands={[0, 1, 2]}
        sheet={sheet}
        title={p.archived ? 'Archived project register' : 'Active project register'}
        bandNote="Same record · Row 1"
        models={[row.f.model].filter(Boolean)}
        selectable={editing}
        editing={editing}
        onCellChange={(_, key, value) => setDraft((d) => ({ ...(d ?? p.f), [key]: value }))}
        onExport={() => doExport()}
        pagination={!editing}
        noun={p.archived ? 'archived project' : 'supplied project'}
        footerLeft={editing ? 'Selected: 1 record · All 26 columns shown in three bands' : undefined}
        footerRight={editing ? 'Editable grid · Double-click a cell to edit' : undefined}
      />

      <div className="mt-6">
        <StatusReference />
      </div>
      <SheetFooter
        left={
          <>
            Project updates respect workspace permissions. Exports are recorded in the{' '}
            <Link to={`${path}/${p.id}/audit`} className="text-primary hover:underline">
              audit trail
            </Link>
            .
          </>
        }
      />

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
