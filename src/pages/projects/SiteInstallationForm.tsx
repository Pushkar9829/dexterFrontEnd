// Site Installation — New (Site/LOI search + auto-fetch from Master Data, §5.2) and the six-stage
// installation record with CRM review, Admin approval, locking and controlled reopen (§5.3–§6.1).
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, Eye, Lock, Search, Send, ShieldCheck, Smartphone, ThumbsDown, ThumbsUp, Undo2, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge, toneFor } from '@/components/ui/Badge'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { usePerms, useRole } from '@/lib/rbac'
import { useReportMode } from '@/hooks/useReportMode'
import { useChecklists } from '@/data/workflow'
import { useSites } from '@/data/network'
import { dossierFor } from '@/data/franchises'
import { findSite, startProject, suggestSites, useProjects, type SiteMasterRow } from '@/data/projects'
import {
  CRM_EXECUTIVES, DOC_FIELDS, DOC_STATUSES, PROJECT_EXECUTIVES, adminDecision, canReopen, currentStage, installCompletion, isAdminRole, isCrmRole, isEditable, overallStatus, reassign, reopenRecord, requestCorrection,
  installLoader, refreshInstall, reviewEntry, setFinalRemarks, startInstallationAsync, submitForApproval, updateActivation, updateEntry, useSiteInstallations, validateForSubmission,
  type ChecklistEntry, type EntryStage, type InstallRecord, type ItemReview, type StageKey,
} from '@/data/siteInstallation'
import { Crumbs } from '@/pages/masterdata/sites/ui'
import { PhotoStrip } from './AtmAssetPhotoUpload'
import { InstallBadge, KV, LifecycleBadge, ProgressBar, Section, StageStepper } from './bands'
import { fmtD, fmtDT, isoDaysFromNow, todayIso } from './format'
import { useSiteMasterData } from './metrics'

export default function SiteInstallationForm() {
  const { id } = useParams()
  return id && id !== 'new' ? <InstallationRecord id={id} /> : <NewInstallation />
}

// ── New Site Installation (§5.2) ─────────────────────────────────────────
function NewInstallation() {
  useRole()
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const { rows } = useSiteMasterData()
  useSites()
  useProjects()
  const [query, setQuery] = useState(() => sp.get('site') ?? '')
  const [searched, setSearched] = useState(() => sp.get('site') ?? '')
  const site = searched ? findSite(searched) : undefined
  const row = site ? rows.find((r) => r.site.siteId === site.siteId) : undefined
  const sugg = query !== searched ? suggestSites(query) : []

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSearched(query.trim())
  }

  return (
    <div className="space-y-5">
      <Crumbs items={[{ label: 'Projects', to: '/projects' }, { label: 'Site Installation', to: '/projects/installation' }, { label: 'New Site Installation' }]} />
      <div>
        <Link to="/projects/installation" className="mb-1 inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-primary">
          <ArrowLeft size={13} /> Site Installation
        </Link>
        <h1 className="text-[26px] font-semibold tracking-tight text-ink">New Site Installation</h1>
        <p className="mt-1 text-[12.5px] text-muted">Search the Site / LOI number given at onboarding. Details are auto-fetched from the Site Master — a duplicate site master is never created here.</p>
      </div>

      <section className="rounded-xl border border-line bg-white p-4">
        <form onSubmit={submit} className="relative flex flex-wrap items-end gap-2">
          <label className="min-w-[260px] flex-1">
            <span className="mb-1 block text-[11px] font-semibold text-ink">Site / LOI Number *</span>
            <span className="relative block">
              <Search size={15} className="pointer-events-none absolute top-2.5 left-3 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. SITE-MH-0012, LOI/MH/2026/0012 or ATM ID"
                className="h-9 w-full rounded-md border border-line bg-white pr-3 pl-9 text-[12.5px] outline-none focus:border-primary"
                autoFocus
              />
            </span>
          </label>
          <Button type="submit" icon={<Search size={14} />} disabled={!query.trim()}>
            Search Site Master
          </Button>
          {sugg.length > 0 && (
            <ul className="absolute top-full left-0 z-20 mt-1 w-full max-w-xl rounded-lg border border-line bg-white p-1 shadow-lg">
              {sugg.map((s) => (
                <li key={s.site.siteId}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(s.site.siteId)
                      setSearched(s.site.siteId)
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] hover:bg-surface"
                  >
                    <span className="font-semibold text-ink">{s.site.siteId}</span>
                    <span className="truncate text-muted">
                      {s.loi} · {s.site.atmId} · {s.site.location}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      </section>

      {searched && !site && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-amber-900">
            <AlertTriangle size={16} /> “{searched}” is not in the Site Master / Master Data
          </h3>
          <p className="mt-1 text-[12.5px] text-amber-900/80">Complete Franchise Onboarding and save the Master Data site record first. The Site Installation workflow can start only after the master record exists.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/franchise/onboarding" className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-[12px] font-semibold text-white hover:bg-primary-hover">
              Go to Franchise Onboarding
            </Link>
            <Link to="/master-data/sites/new" className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-3.5 text-[12px] font-semibold text-ink hover:bg-surface">
              Create Site Master record
            </Link>
          </div>
        </section>
      )}

      {site && row && <FoundSite key={site.siteId} row={row} onStarted={(rid) => navigate(`/projects/installation/${rid}`)} />}
    </div>
  )
}

function FoundSite({ row, onStarted }: { row: SiteMasterRow; onStarted: (id: string) => void }) {
  const { site, p } = row
  const contact = row.fr ? dossierFor(row.fr) : undefined
  const inst = useSiteInstallations()
  const running = inst.records.find((r) => r.siteId === site.siteId && r.status !== 'Approved')
  const closed = row.lifecycle === 'Closed' || row.lifecycle === 'Archived'
  const [exec, setExec] = useState(PROJECT_EXECUTIVES.includes(p.executive) ? p.executive : PROJECT_EXECUTIVES[0])
  const [crm, setCrm] = useState(CRM_EXECUTIVES[0])
  const [target, setTarget] = useState(() => (p.targetDate > todayIso() ? p.targetDate : isoDaysFromNow(45)))
  const [busy, setBusy] = useState(false)
  const start = async () => {
    setBusy(true)
    const res = await startInstallationAsync(site.siteId, { executive: exec, crmExecutive: crm, targetDate: target })
    setBusy(false)
    if ('error' in res) {
      if (res.error) toast(res.error, 'error')
      return
    }
    if (res.existed) toast('An installation is already running for this site — opened the existing record (no duplicate created)', 'info')
    else {
      startProject(site.siteId)
      toast(`Installation ${res.record.id} started · franchise notified · readiness task created`)
    }
    onStarted(res.record.id)
  }
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Section title="Auto-fetched from Site Master" sub="Read-only — maintained in Master Data" action={<LifecycleBadge l={row.lifecycle} />}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <KV k="Site ID">{site.siteId}</KV>
          <KV k="LOI Number">{p.loiNumber}</KV>
          <KV k="ATM ID">{site.atmId}</KV>
          <KV k="Franchise Name">{row.frName}</KV>
          <KV k="FR Contact Number">{contact?.contactNumber}</KV>
          <KV k="FR Email">{contact?.email}</KV>
          <KV k="Site Location" className="col-span-2">
            {site.address}, {site.district}, {site.state} – {site.pin}
          </KV>
          <KV k="Model">{row.model}</KV>
          <KV k="Master Franchise">{row.hier.mf || 'Not applicable'}</KV>
          <KV k="Super Master Franchise">{row.hier.smf || 'Not applicable'}</KV>
          <KV k="Project Executive">{p.executive}</KV>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
          <Link to={`/projects/active/${encodeURIComponent(p.id)}`} className="font-semibold text-primary hover:underline">
            Site Master record
          </Link>
          <Link to={`/master-data/sites/${encodeURIComponent(site.siteId)}`} className="font-semibold text-primary hover:underline">
            Master Data profile
          </Link>
        </div>
      </Section>
      <Section title="Start installation workflow" sub="Assignment & dates (Project Executive)">
        {running ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-[12px] text-blue-900">
              Installation <span className="font-semibold">{running.id}</span> is already running for this site ({running.status}). Duplicate records are not allowed.
            </p>
            <Link to={`/projects/installation/${running.id}`} className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-[12px] font-semibold text-white">
              Open existing installation
            </Link>
          </div>
        ) : closed ? (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-[12px] text-ink-2">This site is {row.lifecycle.toLowerCase()} in the Site Master. Restore it there before starting an installation.</p>
        ) : !isCrmRole() ? (
          <p className="text-[12px] text-muted">Your role cannot start an installation (Project Executive / Admin only).</p>
        ) : (
          <div className="space-y-3">
            <SelectField label="Project Executive" required value={exec} onChange={(e) => setExec(e.target.value)} options={PROJECT_EXECUTIVES} />
            <SelectField label="CRM Executive (verification)" required value={crm} onChange={(e) => setCrm(e.target.value)} options={CRM_EXECUTIVES} />
            <TextField label="Target / projection completion date" type="date" required value={target} onChange={(e) => setTarget(e.target.value)} />
            <Button block onClick={() => void start()} disabled={busy || !exec || !crm || !target}>
              Start Site Installation
            </Button>
            <p className="text-[10.5px] text-muted">The franchise sees the site in “My Sites” on the mobile app immediately; a readiness task is created for the CRM Executive.</p>
          </div>
        )}
      </Section>
    </div>
  )
}

// ── Installation record ──────────────────────────────────────────────────
type Dialog =
  | { kind: 'correction' }
  | { kind: 'submit' }
  | { kind: 'approve' }
  | { kind: 'reject' }
  | { kind: 'reopen' }
  | { kind: 'reassign' }
  | { kind: 'review'; stage: EntryStage | 'activation'; key: string; label: string }
  | { kind: 'version'; idx: number }

function InstallationRecord({ id }: { id: string }) {
  useRole()
  usePerms()
  useChecklists()
  const { isReport } = useReportMode()
  const { rows } = useSiteMasterData()
  const inst = useSiteInstallations()
  // API mode: load the full record (history, approved versions, photos) — the list call omits them
  useEffect(() => {
    refreshInstall(id).catch(() => undefined)
  }, [id])
  const r = inst.records.find((x) => x.id === id)
  const row = r ? rows.find((x) => x.site.siteId === r.siteId) : undefined
  const load = installLoader.use()
  const [picked, setPicked] = useState<StageKey | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)

  if ((!r || !row) && !load.loaded) return <div className="rounded-xl border border-line bg-white p-10 text-center text-[13px] text-muted">{load.error ?? 'Loading installation record…'}</div>
  if (!r || !row)
    return (
      <div className="rounded-xl border border-line bg-white p-10 text-center text-[13px] text-muted">
        Installation record {id} not found.{' '}
        <Link to="/projects/installation" className="font-semibold text-primary">
          Back to Site Installation
        </Link>
      </div>
    )

  const stage = picked ?? currentStage(r).key
  const crm = isCrmRole() && !isReport
  const canEdit = crm && isEditable(r)
  const pendingAdmin = r.status === 'Pending Admin Approval'

  return (
    <div className="space-y-5">
      <Crumbs items={[{ label: 'Projects', to: '/projects' }, { label: 'Site Installation', to: '/projects/installation' }, { label: r.id }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/projects/installation" className="mb-1 inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-primary">
            <ArrowLeft size={13} /> Site Installation
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 text-[24px] font-semibold tracking-tight text-ink">
            {r.siteId} <InstallBadge s={r.status} />
            {r.locked && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <Lock size={12} /> Locked v{r.versions.length}
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {r.id} · {row.p.loiNumber} · {row.frName} · Admin approval: {r.approval}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/mobile" className="inline-flex h-[38px] items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface" title="Same record in the franchise mobile app">
            <Smartphone size={14} /> Franchise app
          </Link>
          {crm && canEdit && (
            <>
              <Button variant="secondary" icon={<Undo2 size={14} />} onClick={() => setDialog({ kind: 'correction' })}>
                Request correction
              </Button>
              <Button icon={<Send size={14} />} onClick={() => setDialog({ kind: 'submit' })}>
                Submit to Admin
              </Button>
            </>
          )}
          {pendingAdmin && isAdminRole() && !isReport && (
            <>
              <Button variant="danger" icon={<ThumbsDown size={14} />} onClick={() => setDialog({ kind: 'reject' })}>
                Reject
              </Button>
              <Button icon={<ThumbsUp size={14} />} onClick={() => setDialog({ kind: 'approve' })}>
                Approve & lock
              </Button>
            </>
          )}
          {r.locked && canReopen() && !isReport && (
            <Button variant="secondary" icon={<Undo2 size={14} />} onClick={() => setDialog({ kind: 'reopen' })}>
              Reopen (amendment)
            </Button>
          )}
        </div>
      </div>

      <StatusBanner r={r} />

      <StageStepper r={r} active={stage} onPick={setPicked} />

      {stage === 'info' && <InfoStage r={r} row={row} crm={crm} onReassign={() => setDialog({ kind: 'reassign' })} />}
      {(stage === 'readiness' || stage === 'equipment') && <ChecklistStage r={r} stage={stage} canEdit={canEdit} onReview={(key, label) => setDialog({ kind: 'review', stage, key, label })} />}
      {stage === 'activation' && <ActivationStage r={r} canEdit={canEdit} onReview={() => setDialog({ kind: 'review', stage: 'activation', key: 'activation', label: 'Operational activation' })} />}
      {stage === 'documentation' && <DocStage r={r} canEdit={canEdit} onReview={(key, label) => setDialog({ kind: 'review', stage: 'documentation', key, label })} />}
      {stage === 'final' && <FinalStage r={r} canEdit={canEdit} onVersion={(idx) => setDialog({ kind: 'version', idx })} />}

      {dialog && <ActionDialog r={r} dialog={dialog} onClose={() => setDialog(null)} />}
    </div>
  )
}

function StatusBanner({ r }: { r: InstallRecord }) {
  if (r.locked)
    return (
      <Banner tone="green" icon={<ShieldCheck size={16} />}>
        Approved by {r.approvedBy} on {fmtDT(r.approvedAt)} — data is locked and synced to the Site Master. Corrections only through a controlled reopen by an authorized Admin; the approved version is never overwritten.
      </Banner>
    )
  if (r.status === 'Pending Admin Approval')
    return (
      <Banner tone="purple" icon={<Lock size={16} />}>
        Verified record submitted by {r.submittedBy} on {fmtDT(r.submittedAt)} — waiting for Admin approval. Editing is blocked until Admin decides.
      </Banner>
    )
  if (r.status === 'Rejected by Admin')
    return (
      <Banner tone="red" icon={<AlertTriangle size={16} />}>
        Admin rejected: “{r.adminRemarks}”. A CRM correction task was created and the franchise was notified.
      </Banner>
    )
  if (r.status === 'Correction Requested')
    return (
      <Banner tone="amber" icon={<AlertTriangle size={16} />}>
        Correction requested from the franchise — rejected items and photos show the CRM remark in the mobile app.
      </Banner>
    )
  if (r.status === 'Reopened') {
    const v = r.versions[r.versions.length - 1]
    return (
      <Banner tone="amber" icon={<Undo2 size={16} />}>
        Reopened by {v?.reopenedBy} on {fmtDT(v?.reopenedAt)}: “{v?.reopenReason}”. Approved version v{v?.version} is kept unchanged in version history.
      </Banner>
    )
  }
  if (r.status === 'Submitted by Franchise')
    return (
      <Banner tone="blue" icon={<CheckCircle2 size={16} />}>
        Franchise submitted on {fmtDT(r.franchiseSubmittedAt)} — review the items and photos, then verify or request correction.
      </Banner>
    )
  return null
}
function Banner({ tone, icon, children }: { tone: 'green' | 'purple' | 'red' | 'amber' | 'blue'; icon: ReactNode; children: ReactNode }) {
  const cls = { green: 'border-emerald-200 bg-emerald-50 text-emerald-900', purple: 'border-violet-200 bg-violet-50 text-violet-900', red: 'border-red-200 bg-red-50 text-red-900', amber: 'border-amber-200 bg-amber-50 text-amber-900', blue: 'border-blue-200 bg-blue-50 text-blue-900' }[tone]
  return <div className={cn('flex items-start gap-2 rounded-xl border px-4 py-3 text-[12.5px]', cls)}>{icon}<span>{children}</span></div>
}

const REVIEW_TONE: Record<ItemReview, 'gray' | 'green' | 'amber'> = { 'Not Reviewed': 'gray', Verified: 'green', 'Correction Requested': 'amber' }
function ReviewCell({ e, canEdit, onVerify, onCorrection }: { e: { crmReview: ItemReview; crmRemark?: string }; canEdit: boolean; onVerify: () => void; onCorrection: () => void }) {
  return (
    <div className="min-w-[150px]">
      <Badge tone={REVIEW_TONE[e.crmReview]}>{e.crmReview}</Badge>
      {e.crmRemark && <p className="mt-1 text-[10.5px] text-amber-800">{e.crmRemark}</p>}
      {canEdit && (
        <div className="mt-1 flex gap-2 text-[11px] font-semibold">
          {e.crmReview !== 'Verified' && (
            <button type="button" onClick={onVerify} className="text-emerald-700 hover:underline">
              Verify
            </button>
          )}
          <button type="button" onClick={onCorrection} className="text-amber-700 hover:underline">
            Request correction
          </button>
        </div>
      )}
    </div>
  )
}
const verify = (r: InstallRecord, stage: EntryStage | 'activation', key: string) => {
  const res = reviewEntry(r.id, stage, key, 'Verified')
  if (!res.ok) toast(res.error, 'error')
}
const saveEntry = (r: InstallRecord, stage: EntryStage, key: string, next: Partial<Pick<ChecklistEntry, 'status' | 'value'>>) => {
  const res = updateEntry(r.id, stage, key, next, 'CRM')
  if (!res.ok) toast(res.error, 'error')
}

function InfoStage({ r, row, crm, onReassign }: { r: InstallRecord; row: SiteMasterRow; crm: boolean; onReassign: () => void }) {
  const contact = row.fr ? dossierFor(row.fr) : undefined
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Section title="Stage 1 · Franchise & Site Information" sub="Fetched from the Site Master — single source of truth" action={<Building2 size={16} className="text-muted" />}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <KV k="Site / LOI Number">
            {r.siteId} · {row.p.loiNumber}
          </KV>
          <KV k="ATM ID">{row.site.atmId}</KV>
          <KV k="Franchise">{row.frName}</KV>
          <KV k="FR Contact">{contact?.contactNumber}</KV>
          <KV k="FR Email">{contact?.email}</KV>
          <KV k="Model">{row.model}</KV>
          <KV k="Site address" className="col-span-2">
            {row.site.address}, {row.site.district}, {row.site.state} – {row.site.pin}
          </KV>
          <KV k="Master / Super Master">{[row.hier.mf, row.hier.smf].filter(Boolean).join(' / ') || 'Direct'}</KV>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
          <Link to={`/projects/active/${encodeURIComponent(row.p.id)}`} className="font-semibold text-primary hover:underline">
            Site Master record
          </Link>
          <Link to={`/master-data/sites/${encodeURIComponent(r.siteId)}`} className="font-semibold text-primary hover:underline">
            Master Data profile
          </Link>
        </div>
      </Section>
      <Section
        title="Assigned ownership"
        action={
          crm && !r.locked ? (
            <Button size="sm" variant="secondary" icon={<UserCog size={13} />} onClick={onReassign}>
              Reassign
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <KV k="Project Executive">{r.executive}</KV>
          <KV k="CRM Executive">{r.crmExecutive}</KV>
          <KV k="Started by">{r.startedBy}</KV>
          <KV k="Started at">{fmtDT(r.startedAt)}</KV>
          <KV k="Target date">{fmtD(r.targetDate)}</KV>
          <KV k="Completion">
            <ProgressBar pct={installCompletion(r).pct} />
          </KV>
        </div>
      </Section>
    </div>
  )
}

function ChecklistStage({ r, stage, canEdit, onReview }: { r: InstallRecord; stage: 'readiness' | 'equipment'; canEdit: boolean; onReview: (key: string, label: string) => void }) {
  const cfg = useChecklists()
  const items = cfg[stage].filter((i) => i.active)
  return (
    <Section
      title={stage === 'readiness' ? 'Stage 2 · Initial Readiness Checklist' : 'Stage 3 · Equipment Installation Status'}
      sub="Items are configurable in Setup. Each photo is linked to this item and Site ID. N/A items are excluded from completion %."
    >
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[980px] text-[12px]">
          <thead className="bg-surface text-left text-[11px] text-muted">
            <tr>
              {['S.N.', stage === 'readiness' ? 'Particulars' : 'Equipment / Asset', 'Status', 'Franchise remark', 'Photos', 'CRM review', 'Updated'].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => {
              const e = r[stage][it.key] ?? { status: 'Pending', crmReview: 'Not Reviewed' as const }
              const company = it.key === 'vsat_company'
              return (
                <tr key={it.key} className="border-t border-line-soft align-top">
                  <td className="px-3 py-2.5 text-muted">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-ink">
                    {it.label}
                    {!it.mandatory && <span className="ml-1 text-[10px] text-muted">(optional)</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {canEdit ? (
                      <div className="flex flex-col gap-1">
                        <select value={e.status} onChange={(ev) => saveEntry(r, stage, it.key, { status: ev.target.value })} className="h-8 rounded-md border border-line bg-white px-2 text-[12px]">
                          {[...new Set([...it.statuses, ...(company ? [] : ['Pending'])])].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {company && e.status === 'Company name' && (
                          <input key={e.value ?? ''} defaultValue={e.value ?? ''} placeholder="Company name" onBlur={(ev) => ev.target.value !== (e.value ?? '') && saveEntry(r, stage, it.key, { value: ev.target.value })} className="h-8 rounded-md border border-line px-2 text-[12px]" />
                        )}
                      </div>
                    ) : (
                      <Badge tone={toneFor(e.status === 'N/A' ? 'gray' : e.status)}>{company && e.value ? e.value : e.status}</Badge>
                    )}
                  </td>
                  <td className="max-w-[180px] px-3 py-2.5 text-[11.5px] text-ink-2">{e.franchiseRemark ?? '—'}</td>
                  <td className="px-3 py-2.5">{it.photos !== 'None' ? <PhotoStrip r={r} stage={stage} itemKey={it.key} canReview={canEdit} canUpload={canEdit} /> : <span className="text-muted">—</span>}</td>
                  <td className="px-3 py-2.5">
                    <ReviewCell e={e} canEdit={canEdit} onVerify={() => verify(r, stage, it.key)} onCorrection={() => onReview(it.key, it.label)} />
                  </td>
                  <td className="px-3 py-2.5 text-[10.5px] whitespace-nowrap text-muted">
                    {e.updatedBy ?? '—'}
                    <div>{fmtDT(e.updatedAt)}</div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function ActivationStage({ r, canEdit, onReview }: { r: InstallRecord; canEdit: boolean; onReview: () => void }) {
  const a = r.activation
  const set = (next: Parameters<typeof updateActivation>[1]) => {
    const res = updateActivation(r.id, next, 'CRM')
    if (!res.ok) toast(res.error, 'error')
  }
  return (
    <Section title="Stage 4 · Operational Activation" sub="Tech Live and Cash Live need a status and date; activation proof is a photo / document">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField label="Tech Live" required value={a.techLive} onChange={(e) => set({ techLive: e.target.value as 'Pending' | 'Live' })} options={['Pending', 'Live']} disabled={!canEdit} />
          <TextField label="Tech Live date" type="date" value={a.techLiveDate} onChange={(e) => set({ techLiveDate: e.target.value })} disabled={!canEdit} required={a.techLive === 'Live'} />
          <SelectField label="Cash Live" required value={a.cashLive} onChange={(e) => set({ cashLive: e.target.value as 'Pending' | 'Live' })} options={['Pending', 'Live']} disabled={!canEdit} />
          <TextField label="Cash Live date" type="date" value={a.cashLiveDate} onChange={(e) => set({ cashLiveDate: e.target.value })} disabled={!canEdit} required={a.cashLive === 'Live'} />
          <TextField label="Projection completion date" type="date" value={a.projectionDate} onChange={(e) => set({ projectionDate: e.target.value })} disabled={!canEdit} />
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-[11px] font-semibold text-ink">Remarks</span>
            <textarea key={a.remarks} defaultValue={a.remarks} disabled={!canEdit} rows={2} onBlur={(e) => e.target.value !== a.remarks && set({ remarks: e.target.value })} className="w-full rounded-md border border-line px-3 py-2 text-[12.5px] disabled:bg-surface" />
          </label>
        </div>
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-[11px] font-semibold text-ink">Activation proof *</div>
            <PhotoStrip r={r} stage="activation" itemKey="proof" canReview={canEdit} canUpload={canEdit} />
          </div>
          <div>
            <div className="mb-1.5 text-[11px] font-semibold text-ink">CRM review</div>
            <ReviewCell e={a} canEdit={canEdit} onVerify={() => verify(r, 'activation', 'activation')} onCorrection={onReview} />
          </div>
        </div>
      </div>
    </Section>
  )
}

function DocStage({ r, canEdit, onReview }: { r: InstallRecord; canEdit: boolean; onReview: (key: string, label: string) => void }) {
  return (
    <Section title="Stage 5 · Documentation & Account Status" sub="LOI / Affidavit / Agreement are pre-filled from Legal; payout and GST can carry the linked reference">
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[900px] text-[12px]">
          <thead className="bg-surface text-left text-[11px] text-muted">
            <tr>
              {['Field', 'Status', 'Reference / linked record', 'Documents', 'CRM review'].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOC_FIELDS.map((d) => {
              const e = r.documentation[d.key] ?? { status: 'Pending', crmReview: 'Not Reviewed' as const }
              return (
                <tr key={d.key} className="border-t border-line-soft align-top">
                  <td className="px-3 py-2.5 font-medium text-ink">{d.label}</td>
                  <td className="px-3 py-2.5">
                    {canEdit ? (
                      <select value={e.status} onChange={(ev) => saveEntry(r, 'documentation', d.key, { status: ev.target.value })} className="h-8 rounded-md border border-line bg-white px-2 text-[12px]">
                        {DOC_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge tone={toneFor(e.status)}>{e.status}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {canEdit ? (
                      <input key={e.value ?? ''} defaultValue={e.value ?? ''} placeholder={d.ref ?? 'Reference (optional)'} onBlur={(ev) => ev.target.value !== (e.value ?? '') && saveEntry(r, 'documentation', d.key, { value: ev.target.value })} className="h-8 w-full min-w-[160px] rounded-md border border-line px-2 text-[12px]" />
                    ) : (
                      (e.value ?? '—')
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <PhotoStrip r={r} stage="documentation" itemKey={d.key} canReview={canEdit} canUpload={canEdit} />
                  </td>
                  <td className="px-3 py-2.5">
                    <ReviewCell e={e} canEdit={canEdit} onVerify={() => verify(r, 'documentation', d.key)} onCorrection={() => onReview(d.key, d.label)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function FinalStage({ r, canEdit, onVersion }: { r: InstallRecord; canEdit: boolean; onVersion: (idx: number) => void }) {
  const issues = useMemo(() => validateForSubmission(r), [r])
  const overall = overallStatus(r)
  const [remarks, setRemarks] = useState(r.finalRemarks)
  const comp = installCompletion(r)
  const saveRemarks = () => {
    const res = setFinalRemarks(r.id, remarks)
    toast(res.ok ? 'Final remarks saved (team-only)' : res.error, res.ok ? 'success' : 'error')
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Stage 6 · Final Status & Submission">
          <div className="grid grid-cols-2 gap-3">
            <KV k="Overall status (system-calculated)">
              <Badge tone={overall === 'Complete' ? 'green' : 'amber'}>{overall}</Badge>
            </KV>
            <KV k="Installation completion">
              <ProgressBar pct={comp.pct} />
              <span className="text-[10.5px] text-muted">
                {comp.done} of {comp.total} applicable items
              </span>
            </KV>
            <KV k="Submitted by">{r.submittedBy}</KV>
            <KV k="Submitted date & time">{fmtDT(r.submittedAt)}</KV>
            <KV k="Admin approval">
              <Badge tone={toneFor(r.approval === 'Not Submitted' ? 'draft' : r.approval)}>{r.approval}</Badge>
            </KV>
            <KV k="Admin remarks">{r.adminRemarks}</KV>
            <KV k="Approved by">{r.approvedBy}</KV>
            <KV k="Approval date & time">{fmtDT(r.approvedAt)}</KV>
          </div>
          <div className="mt-4">
            <TextAreaField label="Final remarks (team-only — not visible to the franchise)" value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={!canEdit} />
            {canEdit && remarks !== r.finalRemarks && (
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={saveRemarks}>
                  Save remarks
                </Button>
              </div>
            )}
          </div>
        </Section>
        <Section title="Final checklist validation" sub="Must pass before the verified record can go to Admin">
          {issues.length ? (
            <ul className="space-y-1.5 text-[12px]">
              {issues.map((x) => (
                <li key={x} className="flex items-start gap-1.5 text-amber-800">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {x}
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-1.5 text-[12.5px] text-emerald-700">
              <CheckCircle2 size={15} /> All mandatory stages complete, all photos reviewed, no open corrections.
            </p>
          )}
        </Section>
      </div>

      <Section title="Approved versions" sub="Each approval stores a version; a reopen never overwrites the approved version">
        {r.versions.length ? (
          <ul className="space-y-1.5 text-[12px]">
            {r.versions.map((v, i) => (
              <li key={v.version} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2">
                <span>
                  <span className="font-semibold">v{v.version}</span> approved by {v.approvedBy} on {fmtDT(v.approvedAt)}
                  {v.remarks && ` — ${v.remarks}`}
                  {v.reopenedAt && (
                    <span className="block text-[11px] text-amber-800">
                      Reopened by {v.reopenedBy} on {fmtDT(v.reopenedAt)}: {v.reopenReason}
                    </span>
                  )}
                </span>
                <Button size="sm" variant="secondary" icon={<Eye size={13} />} onClick={() => onVersion(i)}>
                  View snapshot
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-muted">Not approved yet.</p>
        )}
      </Section>

      <Section title="Submission, approval & action history" sub="Franchise, CRM and Admin actions — including photo delete / replace">
        <div className="scroll-thin max-h-[360px] overflow-y-auto">
          <table className="w-full text-[12px]">
            <tbody>
              {r.history.map((h) => (
                <tr key={h.id} className="border-t border-line-soft align-top first:border-0">
                  <td className="py-1.5 pr-3 whitespace-nowrap text-muted">{fmtDT(h.at)}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    <Badge tone={h.role === 'Franchise' ? 'blue' : h.role === 'Admin' ? 'purple' : 'gray'} dot={false}>
                      {h.role}
                    </Badge>
                  </td>
                  <td className="py-1.5 pr-3 font-medium text-ink">{h.action}</td>
                  <td className="py-1.5 pr-3 text-ink-2">{h.detail}</td>
                  <td className="py-1.5 whitespace-nowrap">{h.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

function ActionDialog({ r, dialog, onClose }: { r: InstallRecord; dialog: Dialog; onClose: () => void }) {
  const [text, setText] = useState('')
  const [field, setField] = useState<'executive' | 'crmExecutive'>('executive')
  const [to, setTo] = useState('')
  const issues = dialog.kind === 'submit' ? validateForSubmission(r) : []

  const run = () => {
    let res: { ok: boolean; error?: string } = { ok: true }
    let msg = ''
    switch (dialog.kind) {
      case 'correction':
        res = requestCorrection(r.id, text)
        msg = 'Correction requested — franchise notified, correction task created'
        break
      case 'submit':
        res = submitForApproval(r.id)
        msg = 'Submitted for Admin approval — Admin task, email and in-app alert created'
        break
      case 'approve':
        res = adminDecision(r.id, 'Approved', text)
        msg = 'Approved — data locked, version saved and synced to the Site Master'
        break
      case 'reject':
        res = adminDecision(r.id, 'Rejected', text)
        msg = 'Rejected — CRM correction task created, franchise notified'
        break
      case 'reopen':
        res = reopenRecord(r.id, text)
        msg = 'Record reopened for amendment — approved version kept'
        break
      case 'reassign':
        res = reassign(r.id, field, to, text)
        msg = 'Reassigned — change recorded in history'
        break
      case 'review':
        res = reviewEntry(r.id, dialog.stage, dialog.key, 'Correction Requested', text)
        msg = 'Correction requested on the item — franchise notified'
        break
      case 'version':
        onClose()
        return
    }
    if (!res.ok) {
      toast(res.error ?? 'Action failed', 'error')
      return
    }
    toast(msg)
    onClose()
  }

  if (dialog.kind === 'version') {
    const v = r.versions[dialog.idx]
    let snap: Record<string, unknown> = {}
    try {
      snap = JSON.parse(v.snapshot) as Record<string, unknown>
    } catch {
      snap = {}
    }
    return (
      <Modal title={`Approved version v${v.version}`} sub={`${r.id} · approved by ${v.approvedBy} on ${fmtDT(v.approvedAt)}`} onClose={onClose} width={720}>
        <pre className="scroll-thin max-h-[420px] overflow-auto rounded-lg bg-surface p-3 text-[11px] leading-relaxed">{JSON.stringify(snap, null, 2)}</pre>
      </Modal>
    )
  }

  const meta: Record<Exclude<Dialog['kind'], 'version'>, { title: string; sub: string; label: string; required: boolean; cta: string; danger?: boolean }> = {
    correction: { title: 'Request correction', sub: 'Sent back to the franchise with your remark', label: 'Correction remark', required: true, cta: 'Send to franchise' },
    submit: { title: 'Submit verified record to Admin', sub: 'Final checklist validation runs before submission', label: '', required: false, cta: 'Submit for approval' },
    approve: { title: 'Approve & lock', sub: 'Approved fields sync to the Site Master; the record locks and a version is saved', label: 'Approval remarks (optional)', required: false, cta: 'Approve' },
    reject: { title: 'Reject submission', sub: 'A correction task goes to CRM and the franchise is notified', label: 'Rejection remarks', required: true, cta: 'Reject', danger: true },
    reopen: { title: 'Reopen approved record', sub: 'Authorized Admin only — the approved version is kept in version history', label: 'Reason for reopening', required: true, cta: 'Reopen' },
    reassign: { title: 'Reassign ownership', sub: 'Old and new assignee are kept in history', label: 'Reason', required: true, cta: 'Reassign' },
    review: { title: `Request correction · ${dialog.kind === 'review' ? dialog.label : ''}`, sub: 'The remark is shown to the franchise on this item', label: 'Correction remark', required: true, cta: 'Request correction' },
  }
  const m = meta[dialog.kind]
  const disabled = (m.required && !text.trim()) || (dialog.kind === 'submit' && issues.length > 0) || (dialog.kind === 'reassign' && !to)
  return (
    <Modal
      title={m.title}
      sub={m.sub}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={m.danger ? 'danger' : 'primary'} onClick={run} disabled={disabled}>
            {m.cta}
          </Button>
        </>
      }
    >
      {dialog.kind === 'submit' && (
        <div className="mb-3">
          {issues.length ? (
            <ul className="space-y-1 text-[12px] text-amber-800">
              {issues.map((x) => (
                <li key={x} className="flex items-start gap-1.5">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {x}
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-1.5 text-[12.5px] text-emerald-700">
              <CheckCircle2 size={15} /> Validation passed. Overall status: Complete ({installCompletion(r).pct}%).
            </p>
          )}
        </div>
      )}
      {dialog.kind === 'reassign' && (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <SelectField label="Role" value={field} onChange={(e) => { setField(e.target.value as 'executive' | 'crmExecutive'); setTo('') }} options={['executive', 'crmExecutive']} placeholder="Select" />
          <SelectField label="New assignee" value={to} onChange={(e) => setTo(e.target.value)} options={(field === 'executive' ? PROJECT_EXECUTIVES : CRM_EXECUTIVES).filter((x) => x !== r[field])} />
        </div>
      )}
      {m.label && <TextAreaField label={m.label} required={m.required} value={text} onChange={(e) => setText(e.target.value)} />}
      {dialog.kind === 'approve' && <p className="mt-2 text-[11px] text-muted">Syncs: Site Setup & Signage, Assets Delivery and 1st Transaction steps in the Site Master (only when the approved data is complete).</p>}
    </Modal>
  )
}

