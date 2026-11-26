import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { fmtSize } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { useRole } from '@/lib/rbac'
import { maskAccount, maskEmail, maskMobile, maskPan } from '@/lib/mask'
import { TIERS, useFranchises } from '@/data/franchises'
import { useNetwork } from '@/data/network'
import {
  PARENT_KIND_LABEL, TIER_SHORT, decideEntityRequest, decideMappingRequest, decideRegistration, fmtDateTime, paged, useMod,
  type Decision, type Registration,
} from './model'
import { ReasonModal } from './ReasonModal'
import { BTN_SECONDARY, Crumbs, EmptyRow, FilterCard, FilterSelect, PageHead, TD, THead, TROW, TableCard, Tabs } from './shared'

const TABS = ['Pending', 'Approved', 'Rejected', 'Returned', 'Mapping changes', 'Entity changes'] as const
type Tab = (typeof TABS)[number]
const STAGE_OF: Partial<Record<Tab, Registration['stage']>> = { Pending: 'Pending Approval', Approved: 'Approved', Rejected: 'Rejected', Returned: 'Returned' }

/** §14 Step 4 — mandatory Admin approval gate for new SMF / MF / FR registrations (+ §25 change requests). */
export default function Approvals() {
  const mod = useMod()
  const net = useNetwork()
  const frs = useFranchises()
  const role = useRole()
  const isAdmin = role === 'Admin' || role === 'Super Admin'
  const isSuper = role === 'Super Admin'
  const [tab, setTab] = useState<Tab>('Pending')
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState('all')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [view, setView] = useState<string | null>(null)
  const [act, setAct] = useState<{ kind: 'reg'; id: string; action: Decision['action'] } | { kind: 'map' | 'ent'; id: string; approve: boolean } | null>(null)
  const frName = (id: string) => frs.find((f) => f.id === id)?.name ?? id
  const q = search.trim().toLowerCase()
  const has = (...v: (string | undefined)[]) => !q || v.some((x) => (x ?? '').toLowerCase().includes(q))

  const regs = mod.registrations
    .filter((r) => STAGE_OF[tab] && r.stage === STAGE_OF[tab] && (tier === 'all' || r.tier === tier))
    .filter((r) => has(r.id, r.code, r.frId, r.form.companyName, r.form.contactName))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const mapReqs = mod.mappingRequests.filter((r) => has(r.id, r.frId, frName(r.frId), r.from.name, r.to.name, r.reason) && (tier === 'all' || net.nodes[r.frId]?.tier === tier))
  const entReqs = mod.entityRequests.filter((r) => has(r.id, r.frId, frName(r.frId), r.from, r.to, r.reason) && (tier === 'all' || net.nodes[r.frId]?.tier === tier))
  const pendingCount = mod.registrations.filter((r) => r.stage === 'Pending Approval').length

  const download = () => {
    const d = new Date().toISOString().slice(0, 10)
    if (tab === 'Mapping changes') downloadCsv(`mapping-change-requests-${d}`, ['Request', 'Franchise', 'From', 'To', 'Reason', 'Requested by', 'Requested on', 'Status', 'Decided by', 'Remark'], mapReqs.map((r) => [r.id, `${r.frId} ${frName(r.frId)}`, `${r.from.kind} ${r.from.name}`, `${r.to.kind} ${r.to.name}`, r.reason, r.requestedBy, r.at, r.status, r.decidedBy ?? '', r.remark ?? '']))
    else if (tab === 'Entity changes') downloadCsv(`entity-change-requests-${d}`, ['Request', 'Franchise', 'From', 'To', 'Reason', 'Requested by', 'Requested on', 'Status', 'Decided by', 'Remark'], entReqs.map((r) => [r.id, `${r.frId} ${frName(r.frId)}`, r.from, r.to, r.reason, r.requestedBy, r.at, r.status, r.decidedBy ?? '', r.remark ?? '']))
    else downloadCsv(`onboarding-approvals-${tab.toLowerCase()}-${d}`, ['Registration', 'Code', 'Franchise ID', 'Tier', 'Company', 'Contact', 'Method', 'Entity', 'Parent', 'Stage', 'Decision by', 'Decision at', 'Reason'], regs.map((r) => [r.id, r.code ?? '', r.frId ?? '', r.tier, r.form.companyName, r.form.contactName, r.method, r.form.entity, r.form.parentKind, r.stage, r.decision?.by ?? '', r.decision?.at ?? '', r.decision?.reason ?? '']))
    toast('Download started')
  }

  const viewing = view ? mod.registrations.find((r) => r.id === view) : undefined
  const isReq = tab === 'Mapping changes' || tab === 'Entity changes'

  return (
    <div className="space-y-4 pb-12 max-w-[1500px]">
      <Crumbs trail={[{ label: 'Onboarding Workflow', to: '/franchise/onboarding' }, { label: 'Admin Approvals' }]} />
      <PageHead
        title="Admin Approvals"
        sub="No SMF / MF / FR becomes active without Admin approval. Rejected or returned applications go back with a reason; every decision is audit-logged."
        actions={<Link to="/franchise/onboarding" className={BTN_SECONDARY}>Onboarding list</Link>}
      />
      {!isAdmin && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12.5px] text-slate-700">
          <Lock size={14} /> You are signed in as {role}. Approve / Reject / Return is limited to Admin and Super Admin; mapping changes need Super Admin.
        </div>
      )}
      <Tabs tabs={TABS} value={tab} onChange={(t) => { setTab(t); setPage(1) }} />
      <FilterCard search={search} onSearch={(v) => { setSearch(v); setPage(1) }} placeholder="Registration, code, name, request…" onReset={() => { setSearch(''); setTier('all'); setPage(1) }} onDownload={download} cols={3}>
        <FilterSelect label="Tier" value={tier} onChange={(v) => { setTier(v); setPage(1) }} options={TIERS} all="All tiers" />
      </FilterCard>

      {!isReq && (
        <TableCard title={tab === 'Pending' ? `Pending approval (${pendingCount})` : `${tab} registrations`} total={regs.length} page={page} pageSize={size} onPage={setPage} onPageSize={setSize} minWidth={1250}>
          <THead cols={['Registration', 'Code', 'Tier', 'Company / Contact', 'Method', 'Entity', 'Parent', 'KYC docs', 'Submitted', 'Decision', 'Action']} />
          <tbody>
            {regs.length === 0 ? (
              <EmptyRow cols={11} text={tab === 'Pending' ? 'Nothing waiting for approval.' : 'No records.'} />
            ) : (
              paged(regs, page, size).map((r) => {
                const docs = Object.values(r.form.docs).filter(Boolean).length
                const parent = r.frId ? net.nodes[r.frId]?.parent : undefined
                return (
                  <tr key={r.id} className={TROW}>
                    <td className={`${TD} font-semibold text-slate-900`}>{r.id}</td>
                    <td className={TD}>{r.frId ? <Link to={`/franchise/network/${r.frId}`} className="font-semibold text-[#0066FF] hover:underline">{r.code}</Link> : '—'}</td>
                    <td className={TD}>{TIER_SHORT[r.tier]}</td>
                    <td className={TD}>
                      <div className="font-semibold text-slate-900">{r.form.companyName}</div>
                      <div className="text-[10.5px] text-slate-400">{r.form.contactName}</div>
                    </td>
                    <td className={TD}>{r.method === 'A' ? 'A · App + self KYC' : 'B · CRM form'}</td>
                    <td className={TD}>{r.form.entity || '—'}</td>
                    <td className={TD}>{parent ? (parent.kind === 'Company' ? 'Direct Company' : `${parent.kind} · ${parent.name}`) : '—'}</td>
                    <td className={TD}>{docs}</td>
                    <td className={TD}>{fmtDateTime(r.updatedAt)}</td>
                    <td className={`${TD} whitespace-normal`}>{r.decision ? `${r.decision.action} · ${r.decision.by}${r.decision.reason ? ` — ${r.decision.reason}` : ''}` : '—'}</td>
                    <td className={TD}>
                      <span className="flex gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => setView(r.id)}>View</Button>
                        {r.stage === 'Pending Approval' && (
                          <>
                            <Button size="sm" disabled={!isAdmin} onClick={() => setAct({ kind: 'reg', id: r.id, action: 'Approved' })}>Approve</Button>
                            <Button size="sm" variant="secondary" disabled={!isAdmin} onClick={() => setAct({ kind: 'reg', id: r.id, action: 'Returned' })}>Return</Button>
                            <Button size="sm" variant="danger" disabled={!isAdmin} onClick={() => setAct({ kind: 'reg', id: r.id, action: 'Rejected' })}>Reject</Button>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </TableCard>
      )}

      {tab === 'Mapping changes' && (
        <TableCard title="Parent mapping change requests (Admin requests · Super Admin approves)" total={mapReqs.length} page={page} pageSize={size} onPage={setPage} onPageSize={setSize}>
          <THead cols={['Request', 'Franchise', 'From', 'To', 'Reason', 'Requested by', 'Requested on', 'Status', 'Action']} />
          <tbody>
            {mapReqs.length === 0 ? (
              <EmptyRow cols={9} text="No mapping change requests." />
            ) : (
              paged(mapReqs, page, size).map((r) => (
                <tr key={r.id} className={TROW}>
                  <td className={`${TD} font-semibold`}>{r.id}</td>
                  <td className={TD}><Link to={`/franchise/network/${r.frId}`} className="text-[#0066FF] hover:underline">{net.nodes[r.frId]?.code ?? r.frId} · {frName(r.frId)}</Link></td>
                  <td className={TD}>{PARENT_KIND_LABEL[r.from.kind]} · {r.from.name}</td>
                  <td className={TD}>{PARENT_KIND_LABEL[r.to.kind]} · {r.to.name}</td>
                  <td className={`${TD} whitespace-normal`}>{r.reason}</td>
                  <td className={TD}>{r.requestedBy} ({r.requestedRole})</td>
                  <td className={TD}>{fmtDateTime(r.at)}</td>
                  <td className={TD}><Badge tone={toneFor(r.status)}>{r.status}</Badge></td>
                  <td className={TD}>
                    {r.status === 'Pending' ? (
                      <span className="flex gap-1.5">
                        <Button size="sm" disabled={!isSuper} onClick={() => setAct({ kind: 'map', id: r.id, approve: true })}>Approve</Button>
                        <Button size="sm" variant="danger" disabled={!isSuper} onClick={() => setAct({ kind: 'map', id: r.id, approve: false })}>Reject</Button>
                      </span>
                    ) : (
                      `${r.decidedBy ?? ''}${r.remark ? ` — ${r.remark}` : ''}`
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </TableCard>
      )}

      {tab === 'Entity changes' && (
        <TableCard title="Entity type change requests" total={entReqs.length} page={page} pageSize={size} onPage={setPage} onPageSize={setSize}>
          <THead cols={['Request', 'Franchise', 'From', 'To', 'Reason', 'Requested by', 'Requested on', 'Status', 'Action']} />
          <tbody>
            {entReqs.length === 0 ? (
              <EmptyRow cols={9} text="No entity change requests." />
            ) : (
              paged(entReqs, page, size).map((r) => (
                <tr key={r.id} className={TROW}>
                  <td className={`${TD} font-semibold`}>{r.id}</td>
                  <td className={TD}><Link to={`/franchise/network/${r.frId}`} className="text-[#0066FF] hover:underline">{net.nodes[r.frId]?.code ?? r.frId} · {frName(r.frId)}</Link></td>
                  <td className={TD}>{r.from}</td>
                  <td className={TD}>{r.to}</td>
                  <td className={`${TD} whitespace-normal`}>{r.reason}</td>
                  <td className={TD}>{r.requestedBy}</td>
                  <td className={TD}>{fmtDateTime(r.at)}</td>
                  <td className={TD}><Badge tone={toneFor(r.status)}>{r.status}</Badge></td>
                  <td className={TD}>
                    {r.status === 'Pending' ? (
                      <span className="flex gap-1.5">
                        <Button size="sm" disabled={!isAdmin} onClick={() => setAct({ kind: 'ent', id: r.id, approve: true })}>Approve</Button>
                        <Button size="sm" variant="danger" disabled={!isAdmin} onClick={() => setAct({ kind: 'ent', id: r.id, approve: false })}>Reject</Button>
                      </span>
                    ) : (
                      `${r.decidedBy ?? ''}${r.remark ? ` — ${r.remark}` : ''}`
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </TableCard>
      )}

      {viewing && <RegistrationView reg={viewing} onClose={() => setView(null)} />}

      {act && (
        <ReasonModal
          title={
            act.kind === 'reg'
              ? act.action === 'Approved' ? 'Approve registration' : act.action === 'Rejected' ? 'Reject registration' : 'Return for correction'
              : `${act.approve ? 'Approve' : 'Reject'} ${act.kind === 'map' ? 'mapping change' : 'entity change'}`
          }
          sub={act.kind === 'reg' && act.action === 'Approved' ? 'The franchise becomes Active, mobile app & ERP access unlock and Project Mapping becomes available.' : 'The decision and reason are recorded in the audit trail.'}
          required={act.kind === 'reg' ? act.action !== 'Approved' : !act.approve}
          label={(act.kind === 'reg' ? act.action === 'Approved' : act.approve) ? 'Remark' : 'Reason'}
          confirmLabel={act.kind === 'reg' ? (act.action === 'Approved' ? 'Approve' : act.action === 'Rejected' ? 'Reject' : 'Return') : act.approve ? 'Approve' : 'Reject'}
          danger={act.kind === 'reg' ? act.action === 'Rejected' : !act.approve}
          onClose={() => setAct(null)}
          onConfirm={(reason) => {
            if (act.kind === 'reg') {
              decideRegistration(act.id, act.action, reason)
              toast(act.action === 'Approved' ? 'Approved — Project Mapping now available' : act.action === 'Rejected' ? 'Registration rejected' : 'Returned to CRM for correction')
            } else if (act.kind === 'map') {
              decideMappingRequest(act.id, act.approve, reason)
              toast(act.approve ? 'Mapping change approved — parent updated' : 'Mapping change rejected')
            } else {
              decideEntityRequest(act.id, act.approve, reason)
              toast(act.approve ? 'Entity type changed' : 'Entity change rejected')
            }
            setAct(null)
          }}
        />
      )}
    </div>
  )
}

function RegistrationView({ reg, onClose }: { reg: Registration; onClose: () => void }) {
  const f = reg.form
  const rows: [string, string][] = [
    ['Tier', reg.tier],
    ['System code', reg.code ?? '—'],
    ['Franchise ID', reg.frId ?? '—'],
    ['Partner code', f.partnerCode || '—'],
    ['Contact', f.contactName],
    ['Mobile', maskMobile(f.mobile)],
    ['Email', maskEmail(f.email)],
    ['Entity', f.entity || '—'],
    ['Company / firm', f.companyName],
    ['PAN', maskPan(f.pan)],
    ['GST', f.gst || '—'],
    ['Address', [f.address, f.district, f.state, f.pin].filter(Boolean).join(', ') || '—'],
    ['Bank', f.bankName ? `${f.bankName} · ${maskAccount(f.accountNo)} · ${f.ifsc}` : '—'],
    ['Agreement', f.agreementNo ? `${f.agreementNo} · ${f.agreementDate} → ${f.agreementValidTill}` : '—'],
    ['Reporting manager / team', [f.reportingManager, f.assignedTeam].filter(Boolean).join(' · ') || '—'],
    ['Method', reg.method === 'A' ? 'A — app link + self KYC' : 'B — CRM full form'],
  ]
  const docs = Object.entries(f.docs).filter(([, v]) => v)
  return (
    <Modal title={`${reg.id} · ${f.companyName}`} sub={`${reg.stage}${reg.kycFromApp ? ' · KYC from app' : ''}${reg.docsVerified ? ' · documents verified by CRM' : ''}`} onClose={onClose} width={720} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div className="space-y-4">
        <dl className="grid gap-x-6 gap-y-2 text-[12px] sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-2 border-b border-slate-100 py-1">
              <dt className="w-[150px] shrink-0 text-slate-500">{k}</dt>
              <dd className="font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <div className="mb-1.5 text-[12px] font-semibold text-slate-800">KYC documents</div>
          {docs.length === 0 ? (
            <p className="text-[12px] text-slate-500">No documents attached.</p>
          ) : (
            <ul className="space-y-1 text-[12px] text-slate-700">
              {docs.map(([k, v]) => (
                <li key={k}>{k}: {v?.name} ({fmtSize(v?.size ?? 0)})</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="mb-1.5 text-[12px] font-semibold text-slate-800">Activity log</div>
          <ul className="max-h-[160px] space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 text-[11.5px] text-slate-600">
            {reg.log.map((l, i) => (
              <li key={`${l.at}-${i}`}>{fmtDateTime(l.at)} · {l.by} — {l.text}</li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}
