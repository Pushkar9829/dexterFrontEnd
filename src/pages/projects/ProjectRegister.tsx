import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Archive, Banknote, Check, Download, FolderKanban, Pencil, RadioTower, RotateCcw, Search, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/KpiCard'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { fmtDate } from '@/data/legal'
import { PROJECT_FIELDS, exportProjects, progressOf, restoreProject, saveProjectFields, useProjects } from '@/data/projects'
import { ProjectBands, StatusReference } from './bands'

const sel = 'h-9 rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-none focus:border-primary'

/** Active / Archived project registers — 26 fields in three bands. */
export default function ProjectRegister() {
  const archived = useLocation().pathname.startsWith('/projects/archived')
  const navigate = useNavigate()
  const { projects } = useProjects()
  const [q, setQ] = useState('')
  const [model, setModel] = useState('')
  const [stage, setStage] = useState('')
  const [sort, setSort] = useState('site')
  const [editing, setEditing] = useState(false)

  const base = useMemo(() => projects.filter((p) => p.archived === archived), [projects, archived])
  const models = [...new Set(projects.map((p) => p.f.model).filter(Boolean))].sort()
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = base.filter((p) => {
      if (model && p.f.model !== model) return false
      if (stage === 'live' && p.f.cashLive !== 'Done') return false
      if (stage === 'tech' && !(p.f.techLive === 'Done' && p.f.cashLive !== 'Done')) return false
      if (stage === 'install' && (p.f.techLive === 'Done' || p.f.atmMachine === 'Pending')) return false
      if (stage === 'prep' && p.f.atmMachine !== 'Pending') return false
      if (!needle) return true
      return [p.id, p.f.siteLoi, p.f.franchisee, p.f.model, p.f.siteLocation].some((v) => (v ?? '').toLowerCase().includes(needle))
    })
    return [...out].sort((a, b) =>
      sort === 'progress' ? progressOf(b).done - progressOf(a).done : sort === 'name' ? a.f.franchisee.localeCompare(b.f.franchisee) : a.f.siteLoi.localeCompare(b.f.siteLoi),
    )
  }, [base, q, model, stage, sort])

  const live = base.filter((p) => p.f.cashLive === 'Done').length
  const tech = base.filter((p) => p.f.techLive === 'Done').length
  const avg = base.length ? Math.round(base.reduce((s, p) => s + progressOf(p).pct, 0) / base.length) : 0
  const path = archived ? '/projects/archived' : '/projects/active'

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{archived ? 'Archived Projects' : 'Active Projects'}</h1>
          <p className="mt-1 text-[14px] text-muted">Track site readiness, equipment installation and account activation in one register.</p>
          <p className="mt-1 text-[12px] text-muted">
            {base.length} {archived ? 'archived' : 'active'} records · 26 project fields · Unprovided identification details are shown as —
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!archived &&
            (editing ? (
              <Button variant="bright" icon={<Check size={16} />} onClick={() => { setEditing(false); toast('Register changes saved') }}>
                Done editing
              </Button>
            ) : (
              <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => setEditing(true)}>
                Edit register
              </Button>
            ))}
          <Button
            icon={<Download size={16} />}
            onClick={() => {
              exportProjects(rows, archived ? 'archived-projects' : 'active-projects')
              toast(`${rows.length} projects exported · recorded in the audit trail`)
            }}
          >
            Export
          </Button>
        </div>
      </div>

      <div className="mb-4 flex border-b border-line">
        {[
          ['/projects/active', 'Active Projects', projects.filter((p) => !p.archived).length],
          ['/projects/archived', 'Archived Projects', projects.filter((p) => p.archived).length],
        ].map(([to, label, n]) => (
          <Link
            key={to}
            to={String(to)}
            onClick={() => setEditing(false)}
            className={cn('-mb-px border-b-2 px-3 py-2.5 text-[13px]', path === to ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted hover:text-ink')}
          >
            {label} <span className="ml-1 rounded bg-surface px-1.5 text-[11px]">{n}</span>
          </Link>
        ))}
      </div>

      {!archived && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Active projects" value={base.length} caption="Sites in rollout" icon={<FolderKanban size={18} />} />
          <StatCard label="Tech live" value={tech} caption="ATM switched on & connected" icon={<RadioTower size={18} />} />
          <StatCard label="Cash live" value={live} caption="Dispensing cash" icon={<Banknote size={18} />} />
          <StatCard label="Average progress" value={`${avg}%`} caption="Of 13 go-live milestones" icon={<TrendingUp size={18} />} />
        </div>
      )}

      {archived && base.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[14px] font-semibold">
            <Archive size={16} className="text-primary" /> Archive log
            <span className="text-[12px] font-normal text-muted">Deleted projects are archived, never erased · Restore returns them to Active Projects</span>
          </div>
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <tbody>
                {base.map((p) => (
                  <tr key={p.id} className="border-b border-line-soft last:border-0">
                    <td className="px-4 py-2.5">
                      <Link to={`/projects/archived/${p.id}`} className="font-semibold text-primary hover:underline">
                        {p.f.siteLoi}
                      </Link>
                      <span className="block text-[11px] text-muted">{p.id}</span>
                    </td>
                    <td className="px-4 py-2.5">{p.f.franchisee}</td>
                    <td className="px-4 py-2.5 text-muted">Archived {fmtDate(p.archivedAt)}</td>
                    <td className="px-4 py-2.5 text-ink-2">{p.archiveReason}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<RotateCcw size={14} />}
                        onClick={() => {
                          restoreProject(p.id)
                          toast(`${p.f.siteLoi} restored to Active Projects`)
                        }}
                      >
                        Restore
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-3">
        <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-line px-3 text-[13px] text-muted sm:w-[260px]">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search site, name or model" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
        </label>
        <select aria-label="Model" className={sel} value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="">All models</option>
          {models.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select aria-label="Stage" className={sel} value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">All stages</option>
          <option value="prep">Site preparation</option>
          <option value="install">Installation in progress</option>
          <option value="tech">Tech live · cash pending</option>
          <option value="live">Cash live</option>
        </select>
        <select aria-label="Sort" className={sel} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="site">Sort: Site/LOI Number</option>
          <option value="name">Sort: Name of Franchisee</option>
          <option value="progress">Sort: Most progressed</option>
        </select>
        <span className="text-[12px] text-muted sm:ml-auto">
          Wrapped column view · All 26 fields visible · {rows.length} of {base.length}
        </span>
      </div>

      {editing && (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-[12px] text-blue-800">
          Editable mode · Auto-save enabled · Double-click a cell to edit. Each change is saved and recorded in the project audit history.
        </div>
      )}

      <ProjectBands
        title={archived ? 'Archived project register' : 'Active project register'}
        rows={rows}
        editing={editing}
        onCellChange={(id, key, value) => {
          const p = projects.find((x) => x.id === id)
          if (!p) return
          if (saveProjectFields(id, { ...p.f, [key]: value })) toast(`${p.f.siteLoi} · ${PROJECT_FIELDS.find((f) => f.key === key)?.label} saved`)
        }}
        onRowClick={(id) => navigate(`${path}/${id}`)}
        link={(p) => (
          <Link to={`${path}/${p.id}`} className="leading-tight">
            <span className="font-semibold text-primary hover:underline">{p.f.siteLoi}</span>
            <span className="block text-[11px] text-muted">
              {p.id} · {progressOf(p).done}/{progressOf(p).total} done
            </span>
          </Link>
        )}
      />

      <div className="mt-4">
        <StatusReference />
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-[12px] text-muted">
        <span>Project updates respect workspace permissions. Exports are recorded in the audit trail.</span>
        <span>Dates shown as DD.MM.YYYY</span>
      </div>
    </div>
  )
}
