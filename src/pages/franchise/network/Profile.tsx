import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Pencil, Save, X } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/KpiCard'
import { FileDrop, RadioGroup, TextAreaField, fmtSize } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { useRole } from '@/lib/rbac'
import { maskAccount } from '@/lib/mask'
import { useFranchises, type Franchise } from '@/data/franchises'
import {
  ENTITY_DOCS, ENTITY_TYPES, NETWORK_STATUSES, completionOf, legalStatusOf, nodeOf, projectStatusOf, useMasterAudit, useNetwork, useSites,
  type EntityType, type NetworkNode, type NetworkStatus, type ParentKind,
} from '@/data/network'
import {
  CHILD_TIER, MANAGED_STATUSES, PARENT_KINDS, PARENT_KIND_LABEL, TIER_LONG, TIER_SHORT, buildIndex, changeStatus, decideEntityRequest, decideMappingRequest,
  descendants, fmtDate, fmtDateTime, inrShort, isLocked, networkSites, parentOptions, parentRefOf, profileFormOf, raiseEntityRequest, raiseMappingRequest,
  addDocVersion, saveProfile, useMod, validateProfile, type RegErrors, type RegForm,
} from './model'
import { RegSections } from './RegSections'
import { ReasonModal } from './ReasonModal'
import { BTN_SECONDARY, Crumbs, EmptyRow, MiniToolbar, PageHead, Panel, PanelTable, PickField, TD, THead, TROW, Tabs } from './shared'

const TABS = ['Profile', 'Parent Mapping', 'Network', 'Site Group', 'Documents', 'History', 'Status'] as const
type Tab = (typeof TABS)[number]

const matches = (q: string, ...vals: (string | number | undefined)[]) => !q.trim() || vals.some((v) => String(v ?? '').toLowerCase().includes(q.trim().toLowerCase()))
const csvName = (fr: Franchise, what: string) => `${fr.id}-${what}-${new Date().toISOString().slice(0, 10)}`
const parentText = (p: { kind: ParentKind; name: string }) => (p.kind === 'Company' ? 'Dexter India (Direct Company)' : `${p.kind} · ${p.name}`)

export default function NetworkProfile() {
  const { frId = '' } = useParams()
  const frs = useFranchises()
  const net = useNetwork()
  const fr = frs.find((f) => f.id === frId)
  const node = net.nodes[frId]

  // Franchises added outside this module may not have a network node yet — create the default one.
  useEffect(() => {
    if (fr && !node) nodeOf(fr)
  }, [fr, node])

  if (!fr)
    return (
      <div className="space-y-4">
        <Crumbs trail={[{ label: 'Hierarchy', to: '/franchise/hierarchy' }, { label: frId }]} />
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-[13px] text-slate-500">
          Franchise <b>{frId}</b> was not found. <Link to="/franchise/hierarchy" className="font-semibold text-[#0066FF] hover:underline">Open the hierarchy</Link>
        </div>
      </div>
    )
  if (!node) return null
  return <ProfileView key={fr.id} fr={fr} node={node} />
}

function ProfileView({ fr, node }: { fr: Franchise; node: NetworkNode }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('Profile')
  const short = TIER_SHORT[fr.tier]
  const locked = isLocked(node.status)

  return (
    <div className="space-y-4 pb-12 max-w-[1500px]">
      <Crumbs trail={[{ label: 'Hierarchy', to: '/franchise/hierarchy' }, { label: `${node.code} · ${fr.name}` }]} />
      <PageHead
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {fr.name}
            <Badge tone="navy" dot={false}>{TIER_LONG[fr.tier]}</Badge>
            <Badge tone={toneFor(node.status)}>{node.status}</Badge>
          </span>
        }
        sub={`${node.code} · ${fr.id} · Partner code ${node.partnerCode} · Parent: ${parentText(node.parent)} · ${fr.city}, ${fr.state}`}
        actions={
          <button type="button" onClick={() => navigate(-1)} className={BTN_SECONDARY}>
            <ArrowLeft size={14} /> Back
          </button>
        }
      />
      {locked && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
          <Lock size={14} /> <b>Mobile app login &amp; ERP access locked</b> — this {short} is {node.status}. It becomes active only after Admin approval (§14 Step 4).
          <Link to="/franchise/onboarding/approvals" className="ml-auto font-semibold text-[#0066FF] hover:underline">Open approvals</Link>
        </div>
      )}
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'Profile' && <ProfileTab fr={fr} node={node} />}
      {tab === 'Parent Mapping' && <MappingTab fr={fr} node={node} />}
      {tab === 'Network' && <NetworkTab fr={fr} node={node} />}
      {tab === 'Site Group' && <SiteGroupTab fr={fr} />}
      {tab === 'Documents' && <DocumentsTab fr={fr} node={node} />}
      {tab === 'History' && <HistoryTab fr={fr} node={node} />}
      {tab === 'Status' && <StatusTab fr={fr} node={node} />}
    </div>
  )
}

// ── Profile ──────────────────────────────────────────────────────────────
function ProfileTab({ fr, node }: { fr: Franchise; node: NetworkNode }) {
  const mod = useMod()
  const role = useRole()
  const saved = useMemo(() => profileFormOf(fr, node, mod.profiles[fr.id]), [fr, node, mod.profiles])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<RegForm>(saved)
  const [errors, setErrors] = useState<RegErrors>({})
  const [entityModal, setEntityModal] = useState(false)
  const pendingEntity = mod.entityRequests.find((r) => r.frId === fr.id && r.status === 'Pending')
  const canEdit = role !== 'Franchisee' && role !== 'Engineer' && role !== 'MIS Team'

  const startEdit = () => {
    setForm(saved)
    setErrors({})
    setEditing(true)
  }
  const set = (p: Partial<RegForm>) => {
    setForm((f) => ({ ...f, ...p }))
    setErrors((e) => {
      const keys = Object.keys(p).filter((k) => k in e)
      if (!keys.length) return e
      const next = { ...e }
      keys.forEach((k) => delete next[k as keyof RegErrors])
      return next
    })
  }
  const save = () => {
    const errs = validateProfile(form, fr.tier)
    setErrors(errs)
    if (Object.keys(errs).length) {
      toast(`${Object.keys(errs).length} field(s) need attention`, 'error')
      return
    }
    const changed = saveProfile(fr.id, saved, form)
    setEditing(false)
    toast(changed ? `Profile saved (${changed} field(s) changed)` : 'Profile saved — no changes')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        {pendingEntity && <span className="mr-auto text-[12px] text-amber-700">Entity change to <b>{pendingEntity.to}</b> is awaiting approval (see History).</span>}
        {editing ? (
          <>
            <Button variant="secondary" icon={<X size={14} />} onClick={() => setEditing(false)}>Cancel</Button>
            <Button icon={<Save size={14} />} onClick={save}>Save</Button>
          </>
        ) : (
          <Button variant="secondary" icon={<Pencil size={14} />} onClick={startEdit} disabled={!canEdit}>Edit profile</Button>
        )}
      </div>
      <RegSections
        tier={fr.tier}
        frId={fr.id}
        form={editing ? form : saved}
        set={set}
        errors={editing ? errors : {}}
        systemId={node.code}
        disabled={!editing}
        entityLocked
        parentLocked
        parentLabel={parentText(node.parent)}
        onRequestEntityChange={canEdit && !pendingEntity ? () => setEntityModal(true) : undefined}
        hide={['kyc']}
      />
      {entityModal && <EntityChangeModal fr={fr} node={node} current={saved} onClose={() => setEntityModal(false)} />}
    </div>
  )
}

function EntityChangeModal({ fr, node, current, onClose }: { fr: Franchise; node: NetworkNode; current: RegForm; onClose: () => void }) {
  const [to, setTo] = useState<EntityType | ''>('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ to?: string; reason?: string }>({})
  const submit = () => {
    const e: typeof errors = {}
    if (!to) e.to = 'Select the new entity type'
    if (reason.trim().length < 5) e.reason = 'Enter a reason (at least 5 characters)'
    setErrors(e)
    if (!to || Object.keys(e).length) return
    raiseEntityRequest(fr.id, to, reason.trim(), current)
    toast('Entity type change request raised — awaiting Admin approval')
    onClose()
  }
  return (
    <Modal
      title="Request entity type change"
      sub={`Current: ${node.entity}. The old details are preserved in history (§5).`}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Raise request</Button>
        </>
      }
    >
      <div className="space-y-4">
        <RadioGroup<EntityType> label="New entity type *" value={to} onChange={(v) => setTo(v)} options={ENTITY_TYPES.filter((e) => e !== node.entity)} error={errors.to} />
        {to && <p className="text-[12px] text-slate-600">Documents required after approval: {ENTITY_DOCS[to].join(', ')}</p>}
        <TextAreaField label="Reason" required name="entity-reason" value={reason} error={errors.reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>
  )
}

// ── Parent mapping ───────────────────────────────────────────────────────
function MappingTab({ fr, node }: { fr: Franchise; node: NetworkNode }) {
  const mod = useMod()
  const role = useRole()
  const [modal, setModal] = useState(false)
  const [decide, setDecide] = useState<{ id: string; approve: boolean } | null>(null)
  const [q1, setQ1] = useState('')
  const [f1, setF1] = useState('all')
  const [q2, setQ2] = useState('')
  const reqs = mod.mappingRequests.filter((r) => r.frId === fr.id)
  const pending = reqs.find((r) => r.status === 'Pending')
  const canRequest = role === 'Admin' || role === 'Super Admin'
  const canApprove = role === 'Super Admin'
  const reqRows = reqs.filter((r) => (f1 === 'all' || r.status === f1) && matches(q1, r.id, r.from.name, r.to.name, r.reason, r.requestedBy))
  const histRows = node.history.filter((h) => matches(q2, h.from?.name, h.to.name, h.reason, h.by, h.approvedBy, h.transferId))
  const since = node.history[0]?.at

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center gap-4 px-4 py-4">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Current parent</div>
            <div className="text-[15px] font-bold text-slate-900">{parentText(node.parent)}</div>
            <div className="text-[11px] text-slate-500">{PARENT_KIND_LABEL[node.parent.kind]} · mapped since {fmtDate(since)}</div>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            <Button onClick={() => setModal(true)} disabled={!canRequest || !!pending || fr.tier === 'Super Master' || isLocked(node.status)}>Request mapping change</Button>
            <span className="text-[11px] text-slate-500">
              {fr.tier === 'Super Master' ? 'An SMF is always mapped to the company.' : pending ? `Request ${pending.id} is pending Super Admin approval.` : canRequest ? 'Admin raises · Super Admin approves (§25).' : 'Only Admin / Super Admin can raise a mapping change.'}
            </span>
          </div>
        </div>
      </Panel>

      <Panel>
        <MiniToolbar
          title="Mapping change requests"
          search={q1}
          onSearch={setQ1}
          filter={{ value: f1, onChange: setF1, options: ['Pending', 'Approved', 'Rejected'], all: 'All status' }}
          onDownload={() => downloadCsv(csvName(fr, 'mapping-requests'), ['Request', 'From', 'To', 'Reason', 'Requested by', 'Role', 'Requested on', 'Status', 'Decided by', 'Remark'], reqRows.map((r) => [r.id, parentText(r.from), parentText(r.to), r.reason, r.requestedBy, r.requestedRole, r.at, r.status, r.decidedBy ?? '', r.remark ?? '']))}
        />
        <PanelTable>
          <THead cols={['Request', 'From', 'To', 'Reason', 'Requested by', 'Requested on', 'Status', 'Decision', 'Action']} />
          <tbody>
            {reqRows.length === 0 ? (
              <EmptyRow cols={9} text="No mapping change requests." />
            ) : (
              reqRows.map((r) => (
                <tr key={r.id} className={TROW}>
                  <td className={`${TD} font-semibold`}>{r.id}</td>
                  <td className={TD}>{parentText(r.from)}</td>
                  <td className={TD}>{parentText(r.to)}</td>
                  <td className={`${TD} whitespace-normal`}>{r.reason}</td>
                  <td className={TD}>{r.requestedBy} ({r.requestedRole})</td>
                  <td className={TD}>{fmtDateTime(r.at)}</td>
                  <td className={TD}><Badge tone={toneFor(r.status)}>{r.status}</Badge></td>
                  <td className={`${TD} whitespace-normal`}>{r.decidedBy ? `${r.decidedBy} · ${fmtDate(r.decidedAt)}${r.remark ? ` — ${r.remark}` : ''}` : '—'}</td>
                  <td className={TD}>
                    {r.status === 'Pending' ? (
                      canApprove ? (
                        <span className="flex gap-1.5">
                          <Button size="sm" onClick={() => setDecide({ id: r.id, approve: true })}>Approve</Button>
                          <Button size="sm" variant="danger" onClick={() => setDecide({ id: r.id, approve: false })}>Reject</Button>
                        </span>
                      ) : (
                        <span className="text-slate-400">Super Admin only</span>
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </PanelTable>
      </Panel>

      <MappingHistoryPanel fr={fr} rows={histRows} q={q2} setQ={setQ2} />

      {modal && <MappingRequestModal fr={fr} node={node} role={role} onClose={() => setModal(false)} />}
      {decide && (
        <ReasonModal
          title={decide.approve ? 'Approve mapping change' : 'Reject mapping change'}
          sub={decide.approve ? 'The new parent becomes current; the old mapping stays in history.' : 'The reason is recorded in the audit trail.'}
          required={!decide.approve}
          label={decide.approve ? 'Remark' : 'Rejection reason'}
          confirmLabel={decide.approve ? 'Approve' : 'Reject'}
          danger={!decide.approve}
          onClose={() => setDecide(null)}
          onConfirm={(reason) => {
            decideMappingRequest(decide.id, decide.approve, reason)
            setDecide(null)
            toast(decide.approve ? 'Mapping change approved — parent updated' : 'Mapping change rejected')
          }}
        />
      )}
    </div>
  )
}

function MappingHistoryPanel({ fr, rows, q, setQ }: { fr: Franchise; rows: NetworkNode['history']; q: string; setQ: (v: string) => void }) {
  return (
    <Panel>
      <MiniToolbar
        title="Mapping history"
        search={q}
        onSearch={setQ}
        onDownload={() => downloadCsv(csvName(fr, 'mapping-history'), ['Date', 'Previous parent', 'New parent', 'Changed by', 'Approved by', 'Reason', 'Transfer'], rows.map((h) => [h.at, h.from ? parentText(h.from) : '', parentText(h.to), h.by, h.approvedBy ?? '', h.reason, h.transferId ?? '']))}
      />
      <PanelTable>
        <THead cols={['Date', 'Previous parent', 'New parent', 'Changed by', 'Approved by', 'Reason', 'Transfer']} />
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow cols={7} />
          ) : (
            rows.map((h) => (
              <tr key={h.id} className={TROW}>
                <td className={TD}>{fmtDateTime(h.at)}</td>
                <td className={TD}>{h.from ? parentText(h.from) : '—'}</td>
                <td className={`${TD} font-semibold`}>{parentText(h.to)}</td>
                <td className={TD}>{h.by}</td>
                <td className={TD}>{h.approvedBy ?? '—'}</td>
                <td className={`${TD} whitespace-normal`}>{h.reason}</td>
                <td className={TD}>{h.transferId ?? '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </PanelTable>
    </Panel>
  )
}

function MappingRequestModal({ fr, node, role, onClose }: { fr: Franchise; node: NetworkNode; role: string; onClose: () => void }) {
  const net = useNetwork()
  const frs = useFranchises()
  const [kind, setKind] = useState<ParentKind | ''>('')
  const [pid, setPid] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ kind?: string; pid?: string; reason?: string }>({})
  const submit = () => {
    const e: typeof errors = {}
    if (!kind) e.kind = 'Select the new parent type'
    else if (kind !== 'Company' && !pid) e.pid = `Select the ${PARENT_KIND_LABEL[kind]}`
    const to = parentRefOf(kind, pid)
    if (to && to.id === node.parent.id && to.kind === node.parent.kind) e.pid = 'The new parent must differ from the current parent'
    if (reason.trim().length < 5) e.reason = 'Enter a reason (at least 5 characters)'
    setErrors(e)
    if (Object.keys(e).length || !to) return
    raiseMappingRequest(fr.id, to, reason.trim(), role)
    toast('Mapping change request raised — awaiting Super Admin approval')
    onClose()
  }
  return (
    <Modal
      title="Request mapping change"
      sub={`Current parent: ${parentText(node.parent)}`}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Raise request</Button>
        </>
      }
    >
      <div className="space-y-4">
        <PickField label="New parent type" required name="new-parent-kind" error={errors.kind} options={PARENT_KINDS[fr.tier].map((k) => ({ value: k, label: PARENT_KIND_LABEL[k] }))} value={kind} onChange={(e) => { setKind(e.target.value as ParentKind | ''); setPid('') }} />
        {kind && kind !== 'Company' && (
          <PickField label={PARENT_KIND_LABEL[kind]} required name="new-parent-id" error={errors.pid} options={parentOptions(kind, net.nodes, frs, fr.id)} value={pid} onChange={(e) => setPid(e.target.value)} />
        )}
        <TextAreaField label="Reason" required name="mapping-reason" value={reason} error={errors.reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>
  )
}

// ── Network (children) ───────────────────────────────────────────────────
function NetworkTab({ fr, node }: { fr: Franchise; node: NetworkNode }) {
  const net = useNetwork()
  const st = useSites()
  const frs = useFranchises()
  const [q, setQ] = useState('')
  const [f, setF] = useState('all')
  const idx = useMemo(() => buildIndex(net.nodes, st.sites), [net.nodes, st.sites])
  const frById = useMemo(() => new Map(frs.map((x) => [x.id, x])), [frs])
  const childTier = CHILD_TIER[fr.tier]
  const children = (idx.children.get(fr.id) ?? []).map((c) => {
    const desc = descendants(idx, c.frId)
    return { c, f: frById.get(c.frId), frCount: c.tier === 'Franchise' ? 1 : desc.filter((d) => d.tier === 'Franchise').length, sites: networkSites(idx, c.frId) }
  })
  const rows = children.filter((r) => (f === 'all' || r.c.status === f) && matches(q, r.c.code, r.f?.name, r.f?.city, r.c.frId))
  const allSites = networkSites(idx, fr.id)

  if (!childTier && children.length === 0)
    return <Panel><div className="p-6 text-[12.5px] text-slate-500">A franchise has no child network. Its ATM sites are listed in the <b>Site Group</b> tab.</div></Panel>

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Direct ${childTier ? TIER_SHORT[childTier] : 'child'}s`} value={children.length} />
        <StatCard label="Active" value={children.filter((r) => r.c.status === 'Active').length} />
        <StatCard label="Franchises in network" value={descendants(idx, fr.id).filter((d) => d.tier === 'Franchise').length} />
        <StatCard label="ATM sites in network" value={allSites.length} caption={`${allSites.filter((s) => s.operational).length} operational`} />
      </div>
      <Panel>
        <MiniToolbar
          title={`${childTier ? TIER_LONG[childTier] : 'Child'}s under ${node.code}`}
          search={q}
          onSearch={setQ}
          filter={{ value: f, onChange: setF, options: NETWORK_STATUSES, all: 'All status' }}
          onDownload={() => downloadCsv(csvName(fr, 'network'), ['Code', 'ID', 'Name', 'Tier', 'City', 'State', 'Status', 'FRs', 'Sites', 'Operational'], rows.map((r) => [r.c.code, r.c.frId, r.f?.name ?? '', r.c.tier, r.f?.city ?? '', r.f?.state ?? '', r.c.status, String(r.frCount), String(r.sites.length), String(r.sites.filter((s) => s.operational).length)]))}
        />
        <PanelTable>
          <THead cols={['Code', 'Name', 'Tier', 'City', 'Status', 'FRs', 'Sites', 'Operational', 'Investment']} />
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow cols={9} text="No child franchise mapped." />
            ) : (
              rows.map((r) => (
                <tr key={r.c.frId} className={TROW}>
                  <td className={TD}><Link to={`/franchise/network/${r.c.frId}`} className="font-semibold text-[#0066FF] hover:underline">{r.c.code}</Link></td>
                  <td className={`${TD} font-semibold text-slate-900`}>{r.f?.name ?? r.c.frId}</td>
                  <td className={TD}>{TIER_SHORT[r.c.tier]}</td>
                  <td className={TD}>{r.f ? `${r.f.city}, ${r.f.state}` : '—'}</td>
                  <td className={TD}><Badge tone={toneFor(r.c.status)}>{r.c.status}</Badge></td>
                  <td className={TD}>{r.frCount}</td>
                  <td className={`${TD} font-semibold`}>{r.sites.length}</td>
                  <td className={TD}>{r.sites.filter((s) => s.operational).length}</td>
                  <td className={TD}>{inrShort(r.sites.reduce((a, s) => a + s.investment, 0))}</td>
                </tr>
              ))
            )}
          </tbody>
        </PanelTable>
      </Panel>
    </div>
  )
}

// ── Site group (§4.2 / §4.3) ─────────────────────────────────────────────
function SiteGroupTab({ fr }: { fr: Franchise }) {
  const net = useNetwork()
  const st = useSites()
  const [q, setQ] = useState('')
  const [f, setF] = useState('all')
  const idx = useMemo(() => buildIndex(net.nodes, st.sites), [net.nodes, st.sites])
  const sites = useMemo(() => (fr.tier === 'Franchise' ? idx.sitesByFr.get(fr.id) ?? [] : networkSites(idx, fr.id)), [idx, fr])
  const rows = sites.filter((s) => {
    const status = projectStatusOf(s)
    if (f === 'Operational' && !s.operational) return false
    if (f === 'Not operational' && s.operational) return false
    if (f === 'Project pending' && status !== 'Incomplete') return false
    if (f === 'Completed' && status !== 'Completed') return false
    return matches(q, s.siteId, s.atmId, s.location, s.engineer?.name, s.frId)
  })
  const total = sites.reduce((a, s) => a + s.investment, 0)
  const cols = ['Site ID', 'ATM ID', ...(fr.tier !== 'Franchise' ? ['FR'] : []), 'Location', 'Investment', 'Current status', 'Operational', 'Monthly txns', 'Settlement', 'Legal status', 'Engineer']

  return (
    <div className="space-y-4">
      <div className="text-[12px] text-slate-500">
        {fr.tier === 'Franchise' ? `Parent franchise group ${fr.id}` : `All sites in the ${TIER_SHORT[fr.tier]} network`} — grouping is for viewing and consolidated analysis only; every site keeps its own record and Site ID.
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Sites" value={sites.length} />
        <StatCard label="Total Investment" value={inrShort(total)} />
        <StatCard label="Operational Sites" value={sites.filter((s) => s.operational).length} />
        <StatCard label="Project Pending" value={sites.filter((s) => !completionOf(s).complete).length} />
      </div>
      <Panel>
        <MiniToolbar
          title="Sites"
          search={q}
          onSearch={setQ}
          filter={{ value: f, onChange: setF, options: ['Operational', 'Not operational', 'Project pending', 'Completed'], all: 'All sites' }}
          onDownload={() =>
            downloadCsv(csvName(fr, 'site-group'), cols, rows.map((s) => [s.siteId, s.atmId, ...(fr.tier !== 'Franchise' ? [s.frId] : []), s.location, String(s.investment), `${projectStatusOf(s)} (${completionOf(s).pct}%)`, s.operational ? 'Yes' : 'No', String(s.monthlyTxns), s.account ? `${s.account.type} · ${s.account.settlement}` : 'Not mapped', legalStatusOf(s), s.engineer?.name ?? 'Not mapped']))
          }
        />
        <PanelTable minWidth={1200}>
          <THead cols={cols} />
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow cols={cols.length} text="No sites in this group yet." />
            ) : (
              rows.map((s) => {
                const c = completionOf(s)
                return (
                  <tr key={s.siteId} className={TROW}>
                    <td className={TD}><Link to={`/master-data/sites/${s.siteId}`} className="font-semibold text-[#0066FF] hover:underline">{s.siteId}</Link></td>
                    <td className={`${TD} font-mono`}>{s.atmId}</td>
                    {fr.tier !== 'Franchise' && <td className={TD}><Link to={`/franchise/network/${s.frId}`} className="text-[#0066FF] hover:underline">{s.frId}</Link></td>}
                    <td className={TD}>{s.location}</td>
                    <td className={TD}>{inrShort(s.investment)}</td>
                    <td className={TD}><Badge tone={c.complete ? 'green' : 'amber'}>{c.complete ? 'Completed' : `Incomplete · ${c.pct}%`}</Badge></td>
                    <td className={TD}>{s.operational ? <Badge tone="green">Operational</Badge> : <Badge tone="gray">Not live</Badge>}</td>
                    <td className={TD}>{s.monthlyTxns.toLocaleString('en-IN')}</td>
                    <td className={TD}>{s.account ? `${s.account.type} · ${s.account.settlement} · ${maskAccount(s.account.accountNo)}` : 'Not mapped'}</td>
                    <td className={TD}><Badge tone={toneFor(legalStatusOf(s))}>{legalStatusOf(s)}</Badge></td>
                    <td className={TD}>{s.engineer ? `${s.engineer.name} (${s.engineer.type})` : <span className="text-amber-700">Not mapped</span>}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </PanelTable>
      </Panel>
    </div>
  )
}

// ── Documents (agreement, KYC, NOC with versions) ────────────────────────
function DocumentsTab({ fr, node }: { fr: Franchise; node: NetworkNode }) {
  const mod = useMod()
  const [q, setQ] = useState('')
  const [f, setF] = useState('all')
  const docs = mod.docs[fr.id] ?? {}
  const types = [...new Set(['Agreement', ...ENTITY_DOCS[node.entity], 'NOC', ...Object.keys(docs)])]
  const versions = Object.entries(docs)
    .flatMap(([type, vs]) => vs.map((v) => ({ type, ...v })))
    .filter((v) => (f === 'all' || v.type === f) && matches(q, v.type, v.name, v.by))
    .sort((a, b) => b.at.localeCompare(a.at))

  return (
    <div className="space-y-4">
      <Panel>
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-[14px] font-bold text-slate-900">Documents</h3>
          <p className="text-[12px] text-slate-500">Uploading again adds a new version; earlier versions are kept. Entity: {node.entity}{node.nocPending ? ' · NOC pending' : ''}.</p>
        </div>
        <PanelTable minWidth={980}>
          <THead cols={['Document', 'Required', 'Latest file', 'Version', 'Uploaded on', 'Uploaded by', 'Upload new version']} />
          <tbody>
            {types.map((t) => {
              const latest = docs[t]?.[0]
              const required = t === 'Agreement' || ENTITY_DOCS[node.entity].includes(t) || (t === 'NOC' && node.nocPending)
              return (
                <tr key={t} className={TROW}>
                  <td className={`${TD} font-semibold text-slate-900`}>{t}</td>
                  <td className={TD}>{required ? <Badge tone={latest ? 'green' : 'amber'}>{latest ? 'Uploaded' : 'Pending'}</Badge> : <span className="text-slate-400">Optional</span>}</td>
                  <td className={TD}>{latest ? `${latest.name} (${fmtSize(latest.size)})` : '—'}</td>
                  <td className={TD}>{latest ? `v${latest.v}` : '—'}</td>
                  <td className={TD}>{latest ? fmtDateTime(latest.at) : '—'}</td>
                  <td className={TD}>{latest?.by ?? '—'}</td>
                  <td className={`${TD} w-[300px]`}>
                    <FileDrop
                      value={null}
                      compact
                      entity="Franchise"
                      purpose="franchise-document"
                      fileRef={fr.id}
                      accept=".pdf,.jpg,.jpeg,.png"
                      label={latest ? 'Upload new version' : 'Upload'}
                      onChange={(file) => {
                        if (!file || file.uploading) return // API mode reports twice (uploading, then the fileId)
                        addDocVersion(fr.id, t, file)
                        toast(`${t} uploaded (v${(docs[t]?.length ?? 0) + 1})`)
                      }}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </PanelTable>
      </Panel>
      <Panel>
        <MiniToolbar
          title="Version list"
          search={q}
          onSearch={setQ}
          filter={{ value: f, onChange: setF, options: types, all: 'All documents' }}
          onDownload={() => downloadCsv(csvName(fr, 'documents'), ['Document', 'Version', 'File', 'Size', 'Uploaded on', 'Uploaded by'], versions.map((v) => [v.type, `v${v.v}`, v.name, fmtSize(v.size), v.at, v.by]))}
        />
        <PanelTable>
          <THead cols={['Document', 'Version', 'File', 'Size', 'Uploaded on', 'Uploaded by']} />
          <tbody>
            {versions.length === 0 ? (
              <EmptyRow cols={6} text="No documents uploaded yet." />
            ) : (
              versions.map((v) => (
                <tr key={`${v.type}-${v.v}`} className={TROW}>
                  <td className={`${TD} font-semibold`}>{v.type}</td>
                  <td className={TD}>v{v.v}</td>
                  <td className={TD}>{v.name}</td>
                  <td className={TD}>{fmtSize(v.size)}</td>
                  <td className={TD}>{fmtDateTime(v.at)}</td>
                  <td className={TD}>{v.by}</td>
                </tr>
              ))
            )}
          </tbody>
        </PanelTable>
      </Panel>
    </div>
  )
}

// ── History ──────────────────────────────────────────────────────────────
function HistoryTab({ fr, node }: { fr: Franchise; node: NetworkNode }) {
  const mod = useMod()
  const audit = useMasterAudit()
  const role = useRole()
  const [qm, setQm] = useState('')
  const [qe, setQe] = useState('')
  const [qs, setQs] = useState('')
  const [qa, setQa] = useState('')
  const [decide, setDecide] = useState<{ id: string; approve: boolean } | null>(null)
  const canApprove = role === 'Admin' || role === 'Super Admin'
  const entityReqs = mod.entityRequests.filter((r) => r.frId === fr.id && matches(qe, r.id, r.from, r.to, r.reason, r.status))
  const entityHist = node.entityHistory.filter((h) => matches(qe, h.from, h.to, h.by))
  const statusRows = mod.statusLog.filter((s) => s.frId === fr.id && matches(qs, s.from, s.to, s.reason, s.by))
  const auditRows = audit.filter((a) => a.ref === fr.id && matches(qa, a.action, a.by, a.before, a.after))
  const mapRows = node.history.filter((h) => matches(qm, h.from?.name, h.to.name, h.reason, h.by))

  return (
    <div className="space-y-4">
      <MappingHistoryPanel fr={fr} rows={mapRows} q={qm} setQ={setQm} />

      <Panel>
        <MiniToolbar
          title="Entity type history & change requests"
          search={qe}
          onSearch={setQe}
          onDownload={() => downloadCsv(csvName(fr, 'entity-history'), ['Type', 'Ref', 'From', 'To', 'By', 'Date', 'Status', 'Reason / remark', 'Old details'], [
            ...entityHist.map((h) => ['Change', '', h.from, h.to, h.by, h.at, 'Applied', '', '']),
            ...entityReqs.map((r) => ['Request', r.id, r.from, r.to, r.requestedBy, r.at, r.status, `${r.reason}${r.remark ? ` / ${r.remark}` : ''}`, `${r.oldDetails.companyName}; PAN ${r.oldDetails.pan}; GST ${r.oldDetails.gst}; docs ${r.oldDetails.docs.join('|')}`]),
          ])}
        />
        <PanelTable minWidth={1100}>
          <THead cols={['Ref', 'From', 'To', 'Requested / changed by', 'Date', 'Status', 'Reason', 'Old details preserved', 'Action']} />
          <tbody>
            {entityReqs.length + entityHist.length === 0 ? (
              <EmptyRow cols={9} text={`No entity type changes. Current entity: ${node.entity}.`} />
            ) : (
              <>
                {entityReqs.map((r) => (
                  <tr key={r.id} className={TROW}>
                    <td className={`${TD} font-semibold`}>{r.id}</td>
                    <td className={TD}>{r.from}</td>
                    <td className={TD}>{r.to}</td>
                    <td className={TD}>{r.requestedBy}</td>
                    <td className={TD}>{fmtDateTime(r.at)}</td>
                    <td className={TD}><Badge tone={toneFor(r.status)}>{r.status}</Badge></td>
                    <td className={`${TD} whitespace-normal`}>{r.reason}{r.remark ? ` — ${r.remark}` : ''}</td>
                    <td className={`${TD} whitespace-normal`}>{r.oldDetails.companyName} · PAN {r.oldDetails.pan}{r.oldDetails.gst ? ` · GST ${r.oldDetails.gst}` : ''}{r.oldDetails.docs.length ? ` · ${r.oldDetails.docs.join(', ')}` : ''}</td>
                    <td className={TD}>
                      {r.status === 'Pending' ? (
                        canApprove ? (
                          <span className="flex gap-1.5">
                            <Button size="sm" onClick={() => setDecide({ id: r.id, approve: true })}>Approve</Button>
                            <Button size="sm" variant="danger" onClick={() => setDecide({ id: r.id, approve: false })}>Reject</Button>
                          </span>
                        ) : (
                          <span className="text-slate-400">Admin approval</span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
                {entityHist.map((h, i) => (
                  <tr key={`eh-${h.at}-${i}`} className={TROW}>
                    <td className={TD}>Applied</td>
                    <td className={TD}>{h.from}</td>
                    <td className={TD}>{h.to}</td>
                    <td className={TD}>{h.by}</td>
                    <td className={TD}>{fmtDateTime(h.at)}</td>
                    <td className={TD}><Badge tone="green">Changed</Badge></td>
                    <td className={TD}>—</td>
                    <td className={TD}>See request</td>
                    <td className={TD}>—</td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </PanelTable>
      </Panel>

      <StatusLogPanel fr={fr} rows={statusRows} q={qs} setQ={setQs} />

      <Panel>
        <MiniToolbar
          title="Audit trail"
          search={qa}
          onSearch={setQa}
          onDownload={() => downloadCsv(csvName(fr, 'audit'), ['Date', 'User', 'Entity', 'Action', 'Old data', 'New data'], auditRows.map((a) => [a.at, a.by, a.entity, a.action, a.before ?? '', a.after ?? '']))}
        />
        <PanelTable>
          <THead cols={['Date', 'User', 'Entity', 'Action', 'Old data', 'New data']} />
          <tbody>
            {auditRows.length === 0 ? (
              <EmptyRow cols={6} text="No audit entries recorded for this franchise yet." />
            ) : (
              auditRows.slice(0, 200).map((a) => (
                <tr key={a.id} className={TROW}>
                  <td className={TD}>{fmtDateTime(a.at)}</td>
                  <td className={TD}>{a.by}</td>
                  <td className={TD}>{a.entity}</td>
                  <td className={`${TD} font-semibold`}>{a.action}</td>
                  <td className={`${TD} max-w-[280px] whitespace-normal`}>{a.before ?? '—'}</td>
                  <td className={`${TD} max-w-[280px] whitespace-normal`}>{a.after ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </PanelTable>
      </Panel>

      {decide && (
        <ReasonModal
          title={decide.approve ? 'Approve entity type change' : 'Reject entity type change'}
          sub="Old entity details stay preserved in history."
          required={!decide.approve}
          label={decide.approve ? 'Remark' : 'Rejection reason'}
          confirmLabel={decide.approve ? 'Approve' : 'Reject'}
          danger={!decide.approve}
          onClose={() => setDecide(null)}
          onConfirm={(reason) => {
            decideEntityRequest(decide.id, decide.approve, reason)
            setDecide(null)
            toast(decide.approve ? 'Entity type changed' : 'Entity change rejected')
          }}
        />
      )}
    </div>
  )
}

function StatusLogPanel({ fr, rows, q, setQ }: { fr: Franchise; rows: { id: string; at: string; by: string; from: NetworkStatus; to: NetworkStatus; reason: string }[]; q: string; setQ: (v: string) => void }) {
  return (
    <Panel>
      <MiniToolbar
        title="Status changes"
        search={q}
        onSearch={setQ}
        onDownload={() => downloadCsv(csvName(fr, 'status-history'), ['Date', 'From', 'To', 'Reason', 'By'], rows.map((s) => [s.at, s.from, s.to, s.reason, s.by]))}
      />
      <PanelTable>
        <THead cols={['Date', 'From', 'To', 'Reason', 'By']} />
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow cols={5} text="No status changes recorded." />
          ) : (
            rows.map((s) => (
              <tr key={s.id} className={TROW}>
                <td className={TD}>{fmtDateTime(s.at)}</td>
                <td className={TD}><Badge tone={toneFor(s.from)}>{s.from}</Badge></td>
                <td className={TD}><Badge tone={toneFor(s.to)}>{s.to}</Badge></td>
                <td className={`${TD} whitespace-normal`}>{s.reason}</td>
                <td className={TD}>{s.by}</td>
              </tr>
            ))
          )}
        </tbody>
      </PanelTable>
    </Panel>
  )
}

// ── Status ───────────────────────────────────────────────────────────────
function StatusTab({ fr, node }: { fr: Franchise; node: NetworkNode }) {
  const mod = useMod()
  const role = useRole()
  const [to, setTo] = useState<NetworkStatus | ''>('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ to?: string; reason?: string }>({})
  const [q, setQ] = useState('')
  const locked = isLocked(node.status)
  const canChange = role === 'Admin' || role === 'Super Admin' || role === 'Project Head'
  const rows = mod.statusLog.filter((s) => s.frId === fr.id && matches(q, s.from, s.to, s.reason, s.by))

  const save = () => {
    const e: typeof errors = {}
    if (!to) e.to = 'Select the new status'
    else if (to === node.status) e.to = `Already ${node.status}`
    if (reason.trim().length < 5) e.reason = 'Enter a reason (at least 5 characters)'
    setErrors(e)
    if (!to || Object.keys(e).length) return
    changeStatus(fr.id, to, reason.trim())
    toast(`Status changed to ${to}`)
    setTo('')
    setReason('')
  }

  return (
    <div className="space-y-4">
      <Panel>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[12px] font-semibold text-slate-600">Current status</span>
            <Badge tone={toneFor(node.status)}>{node.status}</Badge>
          </div>
          {locked ? (
            <p className="text-[12.5px] text-slate-600">Status can be managed after the Admin approval of the registration.</p>
          ) : !canChange ? (
            <p className="text-[12.5px] text-slate-600">Only Admin, Super Admin or Project Head can change the status.</p>
          ) : (
            <>
              <RadioGroup<NetworkStatus> label="New status *" value={to} onChange={(v) => { setTo(v); setErrors((x) => ({ ...x, to: undefined })) }} options={MANAGED_STATUSES} error={errors.to} />
              {to === 'Exited' && <p className="text-[12px] text-amber-700">Exit keeps all sites, investment, account and legal history; reassign the network through Transfer / Exit management.</p>}
              <TextAreaField label="Reason" required name="status-reason" value={reason} error={errors.reason} onChange={(e) => { setReason(e.target.value); setErrors((x) => ({ ...x, reason: undefined })) }} />
              <div className="flex justify-end">
                <Button icon={<Save size={14} />} onClick={save}>Save status</Button>
              </div>
            </>
          )}
        </div>
      </Panel>
      <StatusLogPanel fr={fr} rows={rows} q={q} setQ={setQ} />
    </div>
  )
}
