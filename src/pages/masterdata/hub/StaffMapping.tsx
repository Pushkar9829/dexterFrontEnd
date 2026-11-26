import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, History as HistoryIcon, Pencil, XCircle } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { useFranchises, type Franchise } from '@/data/franchises'
import { COMPANY, TEAM_LEADERS, remapParent, networkStore, useNetwork, useSites, type MappingHistory, type NetworkNode, type ParentKind, type ParentRef } from '@/data/network'
import { useFrMap, useHubRights } from './hooks'
import { actor, addStaffRequest, clearDraft, decideStaffRequest, fmtDate, getDraft, saveDraft, todayIso, useHub, type StaffMapRequest } from './hubStore'
import { DataTable, FilterSelect, FormActions, PageShell, Panel, PickField, ReadOnlyNote, TableBar, Tabs, type Col } from './ui'

type Tab = 'current' | 'request' | 'approvals' | 'history'
const DRAFT = 'staff-mapping'
const kindLabel = (k: ParentKind) => (k === 'Company' ? 'Direct Company' : k)
const ALLOWED: Record<string, ParentKind[]> = { Franchise: ['MF', 'Team Leader', 'Company'], Master: ['SMF', 'Team Leader', 'Company'], 'Super Master': ['Company'] }
const sameParent = (a: ParentRef, b: ParentRef) => a.kind === b.kind && a.id === b.id

export default function StaffMapping() {
  const net = useNetwork()
  const hub = useHub()
  const frMap = useFrMap()
  const [tab, setTab] = useState<Tab>('current')
  const [prefill, setPrefill] = useState<string | null>(null)
  const nodes = useMemo(() => Object.values(net.nodes), [net])
  const pending = useMemo(() => hub.staffRequests.filter((r) => r.status === 'Pending Approval'), [hub.staffRequests])
  const frName = useCallback((id: string) => frMap.get(id)?.name ?? id, [frMap])

  return (
    <PageShell title="Staff / Team Mapping" sub="Every franchise is mapped under an SMF, an MF, a Team Leader or directly under the company (§8.6). Changes go through a request and approval; old mappings stay in history.">
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'current', label: 'Current Mapping', count: nodes.length },
          { key: 'request', label: 'Change Request' },
          { key: 'approvals', label: 'Mapping Approval', count: pending.length },
          { key: 'history', label: 'Mapping History' },
        ]}
      />
      {tab === 'current' && (
        <Current
          nodes={nodes}
          requests={hub.staffRequests}
          frMap={frMap}
          onChange={(id) => {
            setPrefill(id)
            setTab('request')
          }}
        />
      )}
      {tab === 'request' && <RequestForm key={prefill ?? 'blank'} initialFr={prefill} requests={hub.staffRequests} frName={frName} />}
      {tab === 'approvals' && <Approvals requests={hub.staffRequests} frName={frName} />}
      {tab === 'history' && <History nodes={nodes} frName={frName} />}
    </PageShell>
  )
}

type CurRow = { node: NetworkNode; fr?: Franchise; sites: number; pending?: StaffMapRequest }
function Current({ nodes, requests, frMap, onChange }: { nodes: NetworkNode[]; requests: StaffMapRequest[]; frMap: Map<string, Franchise>; onChange: (frId: string) => void }) {
  const rights = useHubRights()
  const { sites } = useSites()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('Franchise')
  const [kind, setKind] = useState('all')
  const [approval, setApproval] = useState('all')
  const [hist, setHist] = useState<CurRow | null>(null)
  const all = useMemo<CurRow[]>(() => {
    const siteCount = new Map<string, number>()
    sites.forEach((s) => siteCount.set(s.frId, (siteCount.get(s.frId) ?? 0) + 1))
    const pend = new Map(requests.filter((r) => r.status === 'Pending Approval').map((r) => [r.frId, r]))
    return nodes.map((n) => ({ node: n, fr: frMap.get(n.frId), sites: siteCount.get(n.frId) ?? 0, pending: pend.get(n.frId) }))
  }, [nodes, sites, requests, frMap])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter(
      (r) =>
        (tier === 'all' || r.node.tier === tier) &&
        (kind === 'all' || r.node.parent.kind === kind) &&
        (approval === 'all' || (approval === 'pending' ? !!r.pending : !r.pending)) &&
        (!s || `${r.node.frId} ${r.node.code} ${r.fr?.name ?? ''} ${r.node.parent.id} ${r.node.parent.name}`.toLowerCase().includes(s)),
    )
  }, [all, q, tier, kind, approval])
  const cols: Col<CurRow>[] = [
    { key: 'c', header: 'Code', render: (r) => r.node.code },
    { key: 'n', header: 'Franchise', render: (r) => <><div className="font-semibold text-slate-900">{r.fr?.name ?? r.node.frId}</div><div className="text-[11px] text-slate-500">{r.node.frId}</div></> },
    { key: 't', header: 'Tier', render: (r) => r.node.tier },
    { key: 's', header: 'Sites', render: (r) => r.sites },
    { key: 'k', header: 'Mapping type', render: (r) => kindLabel(r.node.parent.kind) },
    { key: 'pid', header: 'Current parent ID', render: (r) => r.node.parent.id },
    { key: 'pn', header: 'Parent name', render: (r) => r.node.parent.name },
    { key: 'd', header: 'Mapping date', render: (r) => fmtDate(r.node.history[0]?.at) },
    { key: 'p', header: 'Previous parent', render: (r) => (r.node.history[0]?.from ? `${kindLabel(r.node.history[0].from.kind)} · ${r.node.history[0].from.name}` : '—') },
    { key: 'a', header: 'Mapping approval', render: (r) => (r.pending ? <Badge tone="amber">Change pending</Badge> : r.node.history[0]?.approvedBy ? <Badge tone="green">Approved · {r.node.history[0].approvedBy}</Badge> : <Badge tone="gray">Not recorded</Badge>) },
    {
      key: 'x',
      header: 'Action',
      render: (r) => (
        <div className="flex gap-1.5">
          <Button size="sm" variant="secondary" icon={<HistoryIcon size={13} />} onClick={() => setHist(r)}>History</Button>
          <Button size="sm" variant="secondary" icon={<Pencil size={13} />} disabled={!rights.full || !!r.pending || r.node.tier === 'Super Master'} onClick={() => onChange(r.node.frId)}>Change</Button>
        </div>
      ),
    },
  ]
  return (
    <>
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(r) => r.node.frId}
        noun="franchises"
        toolbar={
          <TableBar search={q} onSearch={setQ} placeholder="FR ID, code, name, parent…" onDownload={() => downloadCsv('staff-team-mapping', ['Code', 'FR ID', 'Franchise', 'Tier', 'Sites', 'Mapping type', 'Parent ID', 'Parent name', 'Mapping date', 'Previous parent', 'Approval'], rows.map((r) => [r.node.code, r.node.frId, r.fr?.name ?? '', r.node.tier, String(r.sites), kindLabel(r.node.parent.kind), r.node.parent.id, r.node.parent.name, r.node.history[0]?.at.slice(0, 10) ?? '', r.node.history[0]?.from?.name ?? '', r.pending ? 'Change pending' : r.node.history[0]?.approvedBy ?? '']))}>
            <FilterSelect label="Tier" value={tier} onChange={setTier} options={['Super Master', 'Master', 'Franchise']} />
            <FilterSelect label="Mapping type" value={kind} onChange={setKind} options={[{ value: 'SMF', label: 'SMF' }, { value: 'MF', label: 'MF' }, { value: 'Team Leader', label: 'Team Leader' }, { value: 'Company', label: 'Direct Company' }]} />
            <FilterSelect label="Approval" value={approval} onChange={setApproval} options={[{ value: 'pending', label: 'Change pending' }, { value: 'none', label: 'No pending change' }]} />
          </TableBar>
        }
      />
      {hist && (
        <Modal title={`Mapping history — ${hist.fr?.name ?? hist.node.frId}`} sub={`${hist.node.code} · ${hist.node.tier}`} onClose={() => setHist(null)} width={760}>
          <HistoryTable history={hist.node.history} />
        </Modal>
      )}
    </>
  )
}

function HistoryTable({ history }: { history: MappingHistory[] }) {
  return (
    <table className="w-full text-left text-[12px]">
      <thead className="text-[11px] text-slate-500 uppercase">
        <tr><th className="py-1.5">Date</th><th>From</th><th>To</th><th>By</th><th>Approved by</th><th>Reason</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {history.map((h) => (
          <tr key={h.id}>
            <td className="py-1.5">{fmtDate(h.at)}</td>
            <td>{h.from ? `${kindLabel(h.from.kind)} · ${h.from.name}` : '—'}</td>
            <td>{`${kindLabel(h.to.kind)} · ${h.to.name}`}</td>
            <td>{h.by}</td>
            <td>{h.approvedBy ?? '—'}</td>
            <td>{h.reason}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RequestForm({ initialFr, requests, frName }: { initialFr: string | null; requests: StaffMapRequest[]; frName: (id: string) => string }) {
  const navigate = useNavigate()
  const rights = useHubRights()
  const frs = useFranchises()
  const net = useNetwork()
  const [f, setF] = useState<Record<string, string>>(() => {
    const base = { fr: '', kind: '', parentId: '', reason: '', date: todayIso() }
    return initialFr ? { ...base, fr: initialFr } : { ...base, ...getDraft(DRAFT) }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }))
  const node = useMemo(() => {
    const k = f.fr.trim().toLowerCase()
    return k ? Object.values(net.nodes).find((n) => n.frId.toLowerCase() === k || n.code.toLowerCase() === k) : undefined
  }, [f.fr, net])
  const smfs = useMemo(() => frs.filter((x) => x.tier === 'Super Master' && x.status === 'Active'), [frs])
  const mfs = useMemo(() => frs.filter((x) => x.tier === 'Master' && x.status === 'Active'), [frs])
  const allowed = node ? ALLOWED[node.tier] : []
  const parentOptions = f.kind === 'SMF' ? smfs.map((x) => ({ value: x.id, label: `${x.name} · ${x.id}` })) : f.kind === 'MF' ? mfs.map((x) => ({ value: x.id, label: `${x.name} · ${x.id}` })) : f.kind === 'Team Leader' ? TEAM_LEADERS.map((t) => ({ value: t.id, label: `${t.name} · ${t.id}` })) : []

  const target = (): ParentRef | undefined => {
    if (f.kind === 'Company') return COMPANY
    if (f.kind === 'Team Leader') {
      const t = TEAM_LEADERS.find((x) => x.id === f.parentId)
      return t ? { kind: 'Team Leader', id: t.id, name: t.name } : undefined
    }
    const p = (f.kind === 'SMF' ? smfs : mfs).find((x) => x.id === f.parentId)
    return p ? { kind: f.kind as ParentKind, id: p.id, name: p.name } : undefined
  }

  const submit = () => {
    const e: Record<string, string> = {}
    const to = target()
    if (!f.fr.trim()) e.fr = 'Enter the FR ID or code'
    else if (!node) e.fr = 'No franchise found for this ID / code'
    else if (requests.some((r) => r.frId === node.frId && r.status === 'Pending Approval')) e.fr = 'A change request for this franchise is already pending approval'
    if (!f.kind) e.kind = 'Select the mapping type'
    else if (node && !allowed.includes(f.kind as ParentKind)) e.kind = `A ${node.tier} cannot be mapped under ${kindLabel(f.kind as ParentKind)}`
    if (f.kind && f.kind !== 'Company' && !to) e.parentId = 'Select the new parent'
    if (node && to && sameParent(node.parent, to)) e.parentId = 'This is already the current parent'
    if (!f.reason.trim()) e.reason = 'Reason is required'
    if (!f.date) e.date = 'Effective date is required'
    setErrors(e)
    if (Object.keys(e).length || !node || !to) return
    const req = addStaffRequest({ frId: node.frId, from: node.parent, to, reason: f.reason.trim(), effectiveDate: f.date })
    clearDraft(DRAFT)
    setF({ fr: '', kind: '', parentId: '', reason: '', date: todayIso() })
    toast(`Request ${req.id} sent for mapping approval`)
  }

  return (
    <Panel title="Mapping change request" sub="The change is applied only after approval by Super Admin / Admin. The old mapping is kept in history.">
      {!rights.full && <div className="mb-4"><ReadOnlyNote text="Only Admin / Project Head can raise mapping change requests." /></div>}
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="FR ID or code" required value={f.fr} onChange={(e) => set('fr', e.target.value)} placeholder="e.g. FR-10012 or FR-MH-12345" error={errors.fr} disabled={!rights.full} />
        <TextField label="Current mapping type" value={node ? kindLabel(node.parent.kind) : ''} readOnly placeholder="Auto-fetched" />
        <TextField label="Current parent" value={node ? `${node.parent.name} (${node.parent.id})` : ''} readOnly placeholder="Auto-fetched" />
        <PickField label="New mapping type" required value={f.kind} onChange={(v) => setF((x) => ({ ...x, kind: v, parentId: '' }))} options={(node ? allowed : (['SMF', 'MF', 'Team Leader', 'Company'] as ParentKind[])).map((k) => ({ value: k, label: kindLabel(k) }))} error={errors.kind} disabled={!rights.full} />
        <PickField label="New parent" required={f.kind !== 'Company'} value={f.kind === 'Company' ? '' : f.parentId} onChange={(v) => set('parentId', v)} options={parentOptions} placeholder={f.kind === 'Company' ? COMPANY.name : 'Select'} error={errors.parentId} disabled={!rights.full || !f.kind || f.kind === 'Company'} />
        <TextField label="Effective date" type="date" required value={f.date} onChange={(e) => set('date', e.target.value)} error={errors.date} disabled={!rights.full} />
        <TextAreaField className="md:col-span-3" label="Reason" required value={f.reason} onChange={(e) => set('reason', e.target.value)} error={errors.reason} disabled={!rights.full} />
      </div>
      {node && <p className="mt-3 text-[12px] text-slate-500">Franchise: <b className="text-slate-800">{frName(node.frId)}</b> · {node.tier} · {node.code}</p>}
      <div className="mt-5">
        <FormActions
          onDraft={() => {
            saveDraft(DRAFT, f)
            toast('Draft saved')
          }}
          onSubmit={submit}
          onBack={() => navigate('/master-data')}
          submitLabel="Submit for approval"
          disabled={!rights.full}
        />
      </div>
    </Panel>
  )
}

function Approvals({ requests, frName }: { requests: StaffMapRequest[]; frName: (id: string) => string }) {
  const rights = useHubRights()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('Pending Approval')
  const [decide, setDecide] = useState<{ req: StaffMapRequest; action: 'Approved' | 'Rejected' } | null>(null)
  const [remark, setRemark] = useState('')
  const [err, setErr] = useState('')
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return requests.filter((r) => (status === 'all' || r.status === status) && (!s || `${r.id} ${r.frId} ${frName(r.frId)} ${r.to.name}`.toLowerCase().includes(s)))
  }, [requests, q, status, frName])

  const confirm = () => {
    if (!decide) return
    if (decide.action === 'Rejected' && !remark.trim()) {
      setErr('A remark is required to reject')
      return
    }
    const { req, action } = decide
    if (action === 'Approved') {
      const node = networkStore.get().nodes[req.frId]
      if (!node) {
        setErr('Franchise not found in the network')
        return
      }
      if (!sameParent(node.parent, req.from)) {
        setErr('The mapping has changed since this request was raised. Reject it and raise a new request.')
        return
      }
      remapParent(req.frId, req.to, req.reason, { approvedBy: actor() })
    }
    decideStaffRequest(req.id, action, remark.trim())
    setDecide(null)
    setRemark('')
    setErr('')
    toast(action === 'Approved' ? `${req.id} approved — ${frName(req.frId)} now under ${req.to.name}` : `${req.id} rejected`)
  }

  const cols: Col<StaffMapRequest>[] = [
    { key: 'id', header: 'Request', render: (r) => r.id },
    { key: 'f', header: 'Franchise', render: (r) => <><div className="font-semibold text-slate-900">{frName(r.frId)}</div><div className="text-[11px] text-slate-500">{r.frId}</div></> },
    { key: 'from', header: 'Current parent', render: (r) => `${kindLabel(r.from.kind)} · ${r.from.name}` },
    { key: 'to', header: 'New parent', render: (r) => `${kindLabel(r.to.kind)} · ${r.to.name}` },
    { key: 'r', header: 'Reason', render: (r) => r.reason },
    { key: 'e', header: 'Effective', render: (r) => fmtDate(r.effectiveDate) },
    { key: 'b', header: 'Requested', render: (r) => `${r.requestedBy} · ${fmtDate(r.requestedAt)}` },
    { key: 's', header: 'Status', render: (r) => <><Badge tone={toneFor(r.status)}>{r.status}</Badge>{r.decidedBy && <div className="mt-0.5 text-[11px] text-slate-500">{r.decidedBy}{r.remark ? ` — ${r.remark}` : ''}</div>}</> },
    {
      key: 'x',
      header: 'Action',
      render: (r) =>
        r.status === 'Pending Approval' ? (
          <div className="flex gap-1.5">
            <Button size="sm" icon={<CheckCircle2 size={13} />} disabled={!rights.admin} onClick={() => setDecide({ req: r, action: 'Approved' })}>Approve</Button>
            <Button size="sm" variant="danger" icon={<XCircle size={13} />} disabled={!rights.admin} onClick={() => setDecide({ req: r, action: 'Rejected' })}>Reject</Button>
          </div>
        ) : (
          '—'
        ),
    },
  ]
  return (
    <div className="space-y-3">
      {!rights.admin && <ReadOnlyNote text="Only Super Admin / Admin can approve or reject mapping changes." />}
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(r) => r.id}
        noun="requests"
        empty="No mapping change requests."
        toolbar={
          <TableBar search={q} onSearch={setQ} placeholder="Request, franchise, parent…" onDownload={() => downloadCsv('staff-mapping-requests', ['Request', 'FR ID', 'Franchise', 'From', 'To', 'Reason', 'Effective', 'Requested by', 'Requested on', 'Status', 'Decided by', 'Remark'], rows.map((r) => [r.id, r.frId, frName(r.frId), r.from.name, r.to.name, r.reason, r.effectiveDate, r.requestedBy, r.requestedAt.slice(0, 10), r.status, r.decidedBy ?? '', r.remark ?? '']))}>
            <FilterSelect label="Status" value={status} onChange={setStatus} options={['Pending Approval', 'Approved', 'Rejected']} />
          </TableBar>
        }
      />
      {decide && (
        <Modal
          title={decide.action === 'Approved' ? 'Approve mapping change' : 'Reject mapping change'}
          sub={`${decide.req.id} · ${frName(decide.req.frId)}: ${decide.req.from.name} → ${decide.req.to.name}`}
          onClose={() => {
            setDecide(null)
            setErr('')
            setRemark('')
          }}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setDecide(null)
                  setErr('')
                  setRemark('')
                }}
              >
                Back
              </Button>
              <Button variant={decide.action === 'Approved' ? 'primary' : 'danger'} onClick={confirm}>{decide.action === 'Approved' ? 'Approve' : 'Reject'}</Button>
            </>
          }
        >
          <TextAreaField label="Remark" required={decide.action === 'Rejected'} value={remark} onChange={(e) => setRemark(e.target.value)} error={err} />
        </Modal>
      )}
    </div>
  )
}

type HRow = MappingHistory & { frId: string; code: string; tier: string }
function History({ nodes, frName }: { nodes: NetworkNode[]; frName: (id: string) => string }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('all')
  const [changes, setChanges] = useState('changes')
  const all = useMemo<HRow[]>(() => nodes.flatMap((n) => n.history.map((h) => ({ ...h, frId: n.frId, code: n.code, tier: n.tier }))).sort((a, b) => b.at.localeCompare(a.at)), [nodes])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter((h) => (changes === 'all' || !!h.from) && (kind === 'all' || h.to.kind === kind) && (!s || `${h.frId} ${h.code} ${frName(h.frId)} ${h.to.name} ${h.from?.name ?? ''}`.toLowerCase().includes(s)))
  }, [all, q, kind, changes, frName])
  const cols: Col<HRow>[] = [
    { key: 'd', header: 'Date', render: (h) => fmtDate(h.at) },
    { key: 'f', header: 'Franchise', render: (h) => `${frName(h.frId)} (${h.code})` },
    { key: 't', header: 'Tier', render: (h) => h.tier },
    { key: 'p', header: 'Previous parent', render: (h) => (h.from ? `${kindLabel(h.from.kind)} · ${h.from.name}` : '—') },
    { key: 'n', header: 'New parent', render: (h) => `${kindLabel(h.to.kind)} · ${h.to.name}` },
    { key: 'b', header: 'Changed by', render: (h) => h.by },
    { key: 'a', header: 'Approved by', render: (h) => h.approvedBy ?? '—' },
    { key: 'r', header: 'Reason', render: (h) => h.reason },
  ]
  return (
    <DataTable
      rows={rows}
      cols={cols}
      rowKey={(h) => h.id}
      noun="history records"
      toolbar={
        <TableBar search={q} onSearch={setQ} placeholder="Franchise, parent…" onDownload={() => downloadCsv('staff-mapping-history', ['Date', 'FR ID', 'Code', 'Franchise', 'Tier', 'Previous parent', 'New parent', 'Changed by', 'Approved by', 'Reason'], rows.map((h) => [h.at.slice(0, 10), h.frId, h.code, frName(h.frId), h.tier, h.from?.name ?? '', h.to.name, h.by, h.approvedBy ?? '', h.reason]))}>
          <FilterSelect label="Records" value={changes} onChange={setChanges} all="Include initial mappings" options={[{ value: 'changes', label: 'Only changes' }]} />
          <FilterSelect label="New mapping type" value={kind} onChange={setKind} options={[{ value: 'SMF', label: 'SMF' }, { value: 'MF', label: 'MF' }, { value: 'Team Leader', label: 'Team Leader' }, { value: 'Company', label: 'Direct Company' }]} />
        </TableBar>
      }
    />
  )
}
