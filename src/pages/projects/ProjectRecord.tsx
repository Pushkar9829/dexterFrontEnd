// Site Master record — all §4.4 fields for one site. The physical site lives in Master Data
// (/master-data/sites/:siteId); this page adds project ownership, dates, lifecycle and the consolidated
// pending categories with links to the module that holds the detail (§6.2).
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Archive, ArrowLeft, Building2, History, ListChecks, Lock, Pencil, RotateCcw, Save, UserCog, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge, toneFor } from '@/components/ui/Badge'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { can, currentRole, usePerms, useRole } from '@/lib/rbac'
import { useReportMode } from '@/hooks/useReportMode'
import { COMPLETION_STEPS, agreementStatusOf, legalStatusOf, useNetwork } from '@/data/network'
import { dossierFor } from '@/data/franchises'
import { LIFECYCLE_MEANING, PENDING_MODULE, PROJECT_EXECUTIVES, SITE_CATEGORIES, changeOwnership, closeProject, isLoiUnique, refreshProject, restoreProject, saveProject, type EditableFields, type OwnershipField, type SiteMasterRow } from '@/data/projects'
import { Crumbs } from '@/pages/masterdata/sites/ui'
import { InstallBadge, KV, LifecycleBadge, ProgressBar, Section } from './bands'
import { fmtD, fmtDT } from './format'
import { useSiteMasterData } from './metrics'

export default function ProjectRecord() {
  const { projectId = '' } = useParams()
  const { rows } = useSiteMasterData()
  const row = useMemo(() => rows.find((r) => r.p.id === projectId || r.site.siteId === projectId), [rows, projectId])
  const siteId = row?.site.siteId
  // API mode: ownership history + project events come from GET /projects/:siteId
  useEffect(() => {
    if (siteId) refreshProject(siteId).catch(() => undefined)
  }, [siteId])
  if (!row)
    return (
      <div className="space-y-4">
        <Crumbs items={[{ label: 'Projects', to: '/projects' }, { label: 'Project Site Register', to: '/projects/active' }, { label: projectId }]} />
        <div className="rounded-xl border border-line bg-white p-10 text-center">
          <p className="text-[14px] font-semibold text-ink">Site Master record not found</p>
          <p className="mt-1 text-[12px] text-muted">{projectId} is not linked to any site in Master Data.</p>
          <Link to="/projects/active" className="mt-4 inline-flex text-[12px] font-semibold text-primary hover:underline">
            Back to Project Site Register
          </Link>
        </div>
      </div>
    )
  return <RecordView key={row.site.siteId} row={row} />
}

function RecordView({ row }: { row: SiteMasterRow }) {
  useRole()
  usePerms()
  const [sp, setSp] = useSearchParams()
  const { isReport } = useReportMode()
  const net = useNetwork()
  const { p, site } = row
  const editing = sp.get('edit') === '1' && can('Edit') && !isReport
  const [owner, setOwner] = useState<OwnershipField | null>(null)
  const [closing, setClosing] = useState<'Closed' | 'Archived' | 'restore' | null>(null)
  const node = net.nodes[site.frId]
  const contact = row.fr ? dossierFor(row.fr) : undefined
  const base = `/projects/${row.lifecycle === 'Archived' ? 'archived' : 'active'}/${encodeURIComponent(p.id)}`
  const canClose = !isReport && (can('Close') || currentRole() === 'Super Admin' || currentRole() === 'Admin')
  const setEdit = (on: boolean) =>
    setSp(
      (prev) => {
        const n = new URLSearchParams(prev)
        if (on) n.set('edit', '1')
        else n.delete('edit')
        return n
      },
      { replace: true },
    )

  return (
    <div className="space-y-5">
      <Crumbs items={[{ label: 'Projects', to: '/projects' }, { label: 'Project Site Register', to: '/projects/active' }, { label: site.siteId }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/projects/active" className="mb-1 inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-primary">
            <ArrowLeft size={13} /> Project Site Register
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 text-[24px] font-semibold tracking-tight text-ink">
            {site.siteId} <LifecycleBadge l={row.lifecycle} />
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {p.loiNumber || 'LOI pending'} · {p.siteName} · {row.frName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`${base}/audit`} className="inline-flex h-[38px] items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-[12px] font-semibold text-ink hover:bg-surface">
            <History size={14} /> Activity history
          </Link>
          <Link to={`${base}/audit?tab=tasks`} className="inline-flex h-[38px] items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-[12px] font-semibold text-ink hover:bg-surface">
            <ListChecks size={14} /> Task history
          </Link>
          <Link to={`/master-data/sites/${encodeURIComponent(site.siteId)}`} className="inline-flex h-[38px] items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-[12px] font-semibold text-ink hover:bg-surface">
            <Building2 size={14} /> Master Data profile
          </Link>
          {can('Edit') && !isReport && !editing && (
            <Button icon={<Pencil size={14} />} onClick={() => setEdit(true)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Consolidated pendency (§4.5 / §6.2) */}
      <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-ink">Consolidated status</h3>
          <ProgressBar pct={row.pct} className="w-[220px]" />
        </div>
        {row.pending.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {row.pending.map((x) => (
              <Link key={x.cat} to={x.to} className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[12px] hover:border-amber-500">
                <span className="font-semibold text-amber-800">{x.cat}</span>
                <span className="block text-[10.5px] text-muted">Details in {PENDING_MODULE[x.cat]} →</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-[12px] text-muted">{row.lifecycle === 'Completed' ? 'All mandatory project activities and approvals are complete.' : 'No pending module shown for closed / archived records.'}</p>
        )}
        <p className="mt-2 text-[10.5px] text-muted">Only the consolidated category is shown in the Site Master — detailed pendency stays in the related module.</p>
      </section>

      {editing && <EditPanel row={row} onDone={() => setEdit(false)} />}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Section title="Site Identity">
          <div className="grid grid-cols-2 gap-3">
            <KV k="Unique Site ID">{site.siteId}</KV>
            <KV k="LOI Number">{p.loiNumber}</KV>
            <KV k="Site Name" className="col-span-2">
              {p.siteName}
            </KV>
            <KV k="ATM ID">{site.atmId}</KV>
            <KV k="Project ID">{p.id}</KV>
          </div>
        </Section>
        <Section title="Franchise Mapping" sub="Optional parent levels: Master / Super Master Franchise">
          <div className="grid grid-cols-2 gap-3">
            <KV k="Franchise Name" className="col-span-2">
              <Link to={`/franchise/network/${encodeURIComponent(site.frId)}`} className="text-primary hover:underline">
                {row.frName}
              </Link>
            </KV>
            <KV k="Franchise ID">{site.frId}</KV>
            <KV k="Franchise Code">{node?.code}</KV>
            <KV k="Master Franchise">{row.hier.mf || 'Not applicable'}</KV>
            <KV k="Super Master Franchise">{row.hier.smf || 'Not applicable'}</KV>
          </div>
        </Section>
        <Section title="Contact Details">
          <div className="grid grid-cols-2 gap-3">
            <KV k="FR Contact Number">{contact?.contactNumber}</KV>
            <KV k="FR Email">{contact?.email}</KV>
          </div>
        </Section>
        <Section title="Site Details">
          <div className="grid grid-cols-2 gap-3">
            <KV k="State">{site.state}</KV>
            <KV k="District">{site.district}</KV>
            <KV k="City">{site.district}</KV>
            <KV k="PIN Code">{site.pin}</KV>
            <KV k="Complete Site Address" className="col-span-2">
              {site.address} · {site.location}
            </KV>
          </div>
        </Section>
        <Section title="Business Details">
          <div className="grid grid-cols-2 gap-3">
            <KV k="Model">{row.model}</KV>
            <KV k="Project Type">{site.projectType}</KV>
            <KV k="Site Category">{p.siteCategory}</KV>
            <KV k="Plan">{site.plan}</KV>
            <KV k="ATM Machine Type">{site.machineType}</KV>
          </div>
        </Section>
        <Section
          title="Ownership"
          sub="Every change keeps the old and new mapping"
          action={
            can('Edit') && !isReport ? (
              <Button size="sm" variant="secondary" icon={<UserCog size={13} />} onClick={() => setOwner('Project Executive')}>
                Change
              </Button>
            ) : undefined
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <KV k="Parent Franchise Group" className="col-span-2">
              {node ? `${node.parent.kind} · ${node.parent.name}` : '—'}
            </KV>
            <KV k="Site Owner">{p.siteOwner}</KV>
            <KV k="Assigned Project Executive">{p.executive}</KV>
          </div>
        </Section>
        <Section title="Project Details">
          <div className="grid grid-cols-2 gap-3">
            <KV k="Project Creation Date">{fmtD(p.createdAt)}</KV>
            <KV k="Project Start Date">{p.startDate ? fmtD(p.startDate) : 'Not started (Pipeline)'}</KV>
            <KV k="Target Completion Date">{fmtD(p.targetDate)}</KV>
          </div>
        </Section>
        <Section
          title="Lifecycle"
          action={
            canClose ? (
              p.closure ? (
                <Button size="sm" variant="secondary" icon={<RotateCcw size={13} />} onClick={() => setClosing('restore')}>
                  Restore
                </Button>
              ) : (
                <div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" icon={<XCircle size={13} />} onClick={() => setClosing('Closed')}>
                    Close
                  </Button>
                  <Button size="sm" variant="secondary" icon={<Archive size={13} />} onClick={() => setClosing('Archived')}>
                    Archive
                  </Button>
                </div>
              )
            ) : undefined
          }
        >
          <LifecycleBadge l={row.lifecycle} />
          <p className="mt-2 text-[12px] text-muted">{LIFECYCLE_MEANING[row.lifecycle]}</p>
          {p.closure && (
            <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-[12px]">
              {p.closure.status} on {fmtDT(p.closure.at)} by {p.closure.by}: {p.closure.reason}
            </p>
          )}
        </Section>
        <Section title="Integration" sub="Status pulled from the linked modules">
          <div className="grid grid-cols-2 gap-3">
            <KV k="Legal Status">
              <Badge tone={toneFor(legalStatusOf(site))}>{legalStatusOf(site)}</Badge>
            </KV>
            <KV k="Agreement Status">
              <Badge tone={toneFor(agreementStatusOf(site))}>{agreementStatusOf(site)}</Badge>
            </KV>
            <KV k="Onboarding Status">
              <Badge tone={toneFor(site.steps.onboarding?.status ?? 'Pending')}>{site.steps.onboarding?.status ?? 'Pending'}</Badge>
            </KV>
            <KV k="Installation Status">
              {row.install ? (
                <Link to={`/projects/installation/${row.install.id}`} className="inline-flex items-center gap-1">
                  <InstallBadge s={row.install.status} />
                  {row.install.locked && <Lock size={12} className="text-emerald-600" />}
                </Link>
              ) : (
                <Badge tone={toneFor(site.installation)}>{site.installation}</Badge>
              )}
            </KV>
          </div>
        </Section>
        <Section title="Audit">
          <div className="grid grid-cols-2 gap-3">
            <KV k="Created By">{p.createdBy}</KV>
            <KV k="Created Date">{fmtDT(p.createdAt)}</KV>
            <KV k="Updated By">{p.updatedBy}</KV>
            <KV k="Last Updated Date">{fmtDT(p.updatedAt)}</KV>
          </div>
        </Section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Completion dependencies" sub="Site Master is Completed only when every mandatory step and approval is complete (§6.2)">
          <ul className="space-y-1.5">
            {COMPLETION_STEPS.map((c) => {
              const s = site.steps[c.key]
              return (
                <li key={c.key} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="min-w-0 truncate text-ink-2">{c.label}</span>
                  <Badge tone={toneFor(s?.status ?? 'Not Started')}>{s?.status ?? 'Not Started'}</Badge>
                </li>
              )
            })}
          </ul>
        </Section>
        <Section title="Ownership & mapping history" sub="Old mappings are never deleted">
          <ul className="space-y-2 text-[12px]">
            {p.ownership.map((o) => (
              <li key={o.id} className="rounded-lg bg-surface px-3 py-2">
                <span className="font-semibold">{o.field}</span>: {o.from || '—'} → {o.to}
                <span className="block text-[11px] text-muted">
                  {fmtDT(o.at)} · {o.by} · {o.reason}
                </span>
              </li>
            ))}
            {(node?.history ?? []).map((h) => (
              <li key={h.id} className="rounded-lg bg-surface px-3 py-2">
                <span className="font-semibold">Parent Franchise Group</span>: {h.from ? `${h.from.kind} ${h.from.name}` : '—'} → {h.to.kind} {h.to.name}
                <span className="block text-[11px] text-muted">
                  {fmtDT(h.at)} · {h.by} · {h.reason}
                </span>
              </li>
            ))}
            {!p.ownership.length && !node?.history.length && <li className="text-muted">No ownership changes recorded.</li>}
          </ul>
        </Section>
      </div>

      {owner && <OwnershipModal row={row} initial={owner} onClose={() => setOwner(null)} />}
      {closing && <ClosureModal row={row} mode={closing} onClose={() => setClosing(null)} />}
    </div>
  )
}

function EditPanel({ row, onDone }: { row: SiteMasterRow; onDone: () => void }) {
  const [d, setD] = useState<Required<Pick<EditableFields, 'loiNumber' | 'siteName' | 'siteCategory' | 'targetDate'>> & { startDate: string }>({
    loiNumber: row.p.loiNumber, siteName: row.p.siteName, siteCategory: row.p.siteCategory, targetDate: row.p.targetDate, startDate: row.p.startDate ?? '',
  })
  const loiErr = !d.loiNumber.trim() ? 'LOI Number is required' : !isLoiUnique(d.loiNumber, row.site.siteId) ? 'This LOI Number is already used by another site' : ''
  const save = () => {
    if (loiErr) return
    const res = saveProject(row.site.siteId, { ...d, startDate: d.startDate || undefined })
    if (!res.ok) {
      toast(res.error, 'error')
      return
    }
    toast('Site Master record saved · changes recorded in the audit trail')
    onDone()
  }
  return (
    <Section title="Edit Site Master record" sub="Site ID, franchise, address and model are maintained in Master Data">
      <div className="grid gap-3 md:grid-cols-3">
        <TextField label="LOI Number" required value={d.loiNumber} onChange={(e) => setD({ ...d, loiNumber: e.target.value })} error={loiErr} hint="Must be unique across all sites" />
        <TextField label="Site Name" value={d.siteName} onChange={(e) => setD({ ...d, siteName: e.target.value })} />
        <SelectField label="Site Category" value={d.siteCategory} onChange={(e) => setD({ ...d, siteCategory: e.target.value })} options={SITE_CATEGORIES} />
        <TextField label="Project Start Date" type="date" value={d.startDate} onChange={(e) => setD({ ...d, startDate: e.target.value })} hint="Empty = Pipeline (not started)" />
        <TextField label="Target Completion Date" type="date" value={d.targetDate} onChange={(e) => setD({ ...d, targetDate: e.target.value })} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button icon={<Save size={14} />} onClick={save} disabled={!!loiErr}>
          Save changes
        </Button>
      </div>
    </Section>
  )
}

function OwnershipModal({ row, initial, onClose }: { row: SiteMasterRow; initial: OwnershipField; onClose: () => void }) {
  const [field, setField] = useState<OwnershipField>(initial)
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('')
  const cur = field === 'Project Executive' ? row.p.executive : row.p.siteOwner
  const submit = () => {
    const res = changeOwnership(row.site.siteId, field, to, reason)
    if (!res.ok) {
      toast(res.error, 'error')
      return
    }
    toast(`${field} changed — previous mapping kept in history`)
    onClose()
  }
  return (
    <Modal
      title="Change ownership"
      sub="The old mapping is kept in the audit history (§4.2)"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!to.trim() || !reason.trim()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <SelectField label="Field" value={field} onChange={(e) => setField(e.target.value as OwnershipField)} options={['Project Executive', 'Site Owner']} placeholder="Select field" />
        <p className="text-[12px] text-muted">
          Current: <span className="font-semibold text-ink">{cur || '—'}</span>
        </p>
        {field === 'Project Executive' ? (
          <SelectField label="New Project Executive" value={to} onChange={(e) => setTo(e.target.value)} options={PROJECT_EXECUTIVES.filter((x) => x !== cur)} />
        ) : (
          <TextField label="New Site Owner" value={to} onChange={(e) => setTo(e.target.value)} />
        )}
        <TextAreaField label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
        <p className="text-[11px] text-muted">Parent franchise group (MF / SMF) changes go through Franchise › Transfers so NOC and approvals are captured.</p>
      </div>
    </Modal>
  )
}

function ClosureModal({ row, mode, onClose }: { row: SiteMasterRow; mode: 'Closed' | 'Archived' | 'restore'; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const submit = () => {
    const res = mode === 'restore' ? restoreProject(row.site.siteId, reason) : closeProject(row.site.siteId, mode, reason)
    if (!res.ok) {
      toast(res.error, 'error')
      return
    }
    toast(mode === 'restore' ? 'Project restored to the active lifecycle' : `Project ${mode.toLowerCase()} — record retained in the Site Master`)
    onClose()
  }
  const title: ReactNode = mode === 'restore' ? 'Restore project' : mode === 'Closed' ? 'Close project' : 'Archive project'
  return (
    <Modal
      title={String(title)}
      sub={mode === 'restore' ? 'Moves the record back to the active lifecycle' : 'Authorized decision — the site record is never deleted'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={mode === 'restore' ? 'primary' : 'danger'} onClick={submit} disabled={!reason.trim()}>
            Confirm
          </Button>
        </>
      }
    >
      <TextAreaField label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  )
}
