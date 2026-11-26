import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, UserPlus } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { ENGINEERS, nowIso, useCategories, useSites, updateSite, type EngineerAssignment, type Site } from '@/data/network'
import { useFrMap, useHubRights } from './hooks'
import { actor, clearDraft, fmtDate, getDraft, saveDraft, todayIso } from './hubStore'
import { DataTable, FilterSelect, FormActions, PageShell, Panel, PickField, ReadOnlyNote, SiteFetchBox, TableBar, Tabs, type Col } from './ui'

type Tab = 'assign' | 'engineers' | 'unmapped' | 'history'
const DRAFT = 'engineer-mapping'

export default function EngineerMapping() {
  const { sites } = useSites()
  const frMap = useFrMap()
  const frName = useCallback((id: string) => frMap.get(id)?.name ?? id, [frMap])
  const [tab, setTab] = useState<Tab>('assign')
  const [prefill, setPrefill] = useState<string | null>(null)

  const unmapped = useMemo(() => sites.filter((s) => !s.engineer), [sites])
  const history = useMemo(() => sites.flatMap((s) => s.engineerHistory.map((h, i) => ({ ...h, siteId: s.siteId, atmId: s.atmId, frId: s.frId, current: s.engineer?.name ?? '—', key: `${s.siteId}-${i}` }))), [sites])
  const engineerCount = useMemo(() => new Set(sites.filter((s) => s.engineer).map((s) => s.engineer!.engineerId)).size, [sites])

  const assignFor = (atm: string) => {
    setPrefill(atm)
    setTab('assign')
  }

  return (
    <PageShell title="Engineer Mapping" sub="Engineers are mapped by ATM ID (§12). Changing the engineer keeps the previous one in the site's history.">
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'assign', label: 'Assign Engineer' },
          { key: 'engineers', label: 'Engineer-wise', count: engineerCount },
          { key: 'unmapped', label: 'Without Engineer', count: unmapped.length },
          { key: 'history', label: 'Mapping History', count: history.length },
        ]}
      />
      {tab === 'assign' && <AssignForm key={prefill ?? 'blank'} initialAtm={prefill} sites={sites} frName={frName} />}
      {tab === 'engineers' && <EngineerWise sites={sites} frName={frName} />}
      {tab === 'unmapped' && <Unmapped rows={unmapped} frName={frName} onAssign={assignFor} />}
      {tab === 'history' && <History rows={history} frName={frName} />}
    </PageShell>
  )
}

function AssignForm({ initialAtm, sites, frName }: { initialAtm: string | null; sites: Site[]; frName: (id: string) => string }) {
  const navigate = useNavigate()
  const rights = useHubRights()
  const cats = useCategories()
  const [f, setF] = useState<Record<string, string>>(() => {
    const d = getDraft(DRAFT)
    const base = { atm: '', engineerId: '', type: '', date: todayIso(), remark: '' }
    return initialAtm ? { ...base, atm: initialAtm } : { ...base, ...d }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const site = useMemo(() => {
    const a = f.atm.trim().toLowerCase()
    return a ? sites.find((s) => s.atmId.toLowerCase() === a) : undefined
  }, [f.atm, sites])
  const eng = ENGINEERS.find((e) => e.id === f.engineerId)
  const types = cats.engineerTypes.filter((t) => t.active).map((t) => ({ value: t.name, label: t.name }))
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }))

  const draft = () => {
    saveDraft(DRAFT, f)
    toast('Draft saved — it will be restored when you come back')
  }
  const submit = () => {
    const e: Record<string, string> = {}
    if (!f.atm.trim()) e.atm = 'ATM ID is required'
    else if (!site) e.atm = 'No site found for this ATM ID'
    if (!eng) e.engineerId = 'Select an engineer'
    else if (site?.engineer?.engineerId === eng.id) e.engineerId = 'This engineer is already mapped to the site'
    if (!f.type) e.type = 'Select the engineer type'
    if (!f.date) e.date = 'Assignment date is required'
    else if (f.date > todayIso()) e.date = 'Assignment date cannot be in the future'
    setErrors(e)
    if (Object.keys(e).length || !site || !eng) return
    const next: EngineerAssignment = { engineerId: eng.id, name: eng.name, mobile: eng.mobile, type: f.type, assignedOn: f.date, assignedBy: actor() }
    const old = site.engineer
    updateSite(
      site.siteId,
      (s) => ({
        engineer: next,
        engineerHistory: s.engineer ? [{ ...s.engineer, removedOn: f.date }, ...s.engineerHistory] : s.engineerHistory,
        steps: { ...s.steps, engineerMapping: { ...s.steps.engineerMapping, status: 'Completed', assignedTo: actor(), updatedAt: nowIso(), remark: f.remark || s.steps.engineerMapping?.remark } },
      }),
      { action: 'Engineer mapped', before: old ? `${old.name} (${old.type})` : '—', after: `${next.name} (${next.type})` },
    )
    clearDraft(DRAFT)
    setF({ atm: '', engineerId: '', type: '', date: todayIso(), remark: '' })
    toast(old ? `${next.name} mapped to ${site.siteId}; ${old.name} moved to history` : `${next.name} mapped to ${site.siteId}`)
  }

  return (
    <Panel title="Assign engineer by ATM ID" sub="Type the ATM ID — the site's details are fetched automatically.">
      {!rights.project && <div className="mb-4"><ReadOnlyNote text="Your role can view engineer mapping but cannot change it." /></div>}
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="ATM ID" required value={f.atm} onChange={(e) => set('atm', e.target.value)} placeholder="e.g. DXMH70007" error={errors.atm} disabled={!rights.project} />
        <PickField
          label="Engineer"
          required
          value={f.engineerId}
          disabled={!rights.project}
          onChange={(v) => {
            const en = ENGINEERS.find((x) => x.id === v)
            setF((x) => ({ ...x, engineerId: v, type: x.type || en?.type || '' }))
          }}
          options={ENGINEERS.map((e) => ({ value: e.id, label: `${e.name} · ${e.id} · ${e.type}` }))}
          error={errors.engineerId}
        />
        <TextField label="Mobile number" value={eng?.mobile ?? ''} readOnly placeholder="Auto-filled" />
        <PickField label="Type" required value={f.type} onChange={(v) => set('type', v)} options={types} error={errors.type} disabled={!rights.project} />
        <TextField label="Assignment date" type="date" required value={f.date} max={todayIso()} onChange={(e) => set('date', e.target.value)} error={errors.date} disabled={!rights.project} />
        <TextField label="Assigned by" value={actor()} readOnly />
        <TextField className="md:col-span-3" label="Remark" value={f.remark} onChange={(e) => set('remark', e.target.value)} placeholder="Optional" disabled={!rights.project} />
      </div>
      {site && (
        <div className="mt-4">
          <SiteFetchBox
            site={site}
            frName={frName(site.frId)}
            extra={
              <div className="sm:col-span-3">
                <span className="text-slate-500">Current engineer</span>
                <div className="font-semibold text-slate-900">{site.engineer ? `${site.engineer.name} · ${site.engineer.mobile} · ${site.engineer.type} (since ${fmtDate(site.engineer.assignedOn)}) — will move to history` : 'None mapped'}</div>
              </div>
            }
          />
        </div>
      )}
      <div className="mt-5">
        <FormActions onDraft={draft} onSubmit={submit} onBack={() => navigate('/master-data')} submitLabel="Submit mapping" disabled={!rights.project} />
      </div>
    </Panel>
  )
}

type EngRow = { id: string; name: string; mobile: string; type: string; sites: Site[] }
function EngineerWise({ sites, frName }: { sites: Site[]; frName: (id: string) => string }) {
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [load, setLoad] = useState('all')
  const [view, setView] = useState<EngRow | null>(null)
  const all = useMemo<EngRow[]>(() => {
    const m = new Map<string, Site[]>()
    sites.forEach((s) => s.engineer && m.set(s.engineer.engineerId, [...(m.get(s.engineer.engineerId) ?? []), s]))
    return ENGINEERS.map((e) => ({ id: e.id, name: e.name, mobile: e.mobile, type: e.type ?? '—', sites: m.get(e.id) ?? [] })).sort((a, b) => b.sites.length - a.sites.length)
  }, [sites])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter((r) => (type === 'all' || r.type === type) && (load === 'all' || (load === '0' ? r.sites.length === 0 : r.sites.length > 0)) && (!s || `${r.id} ${r.name} ${r.mobile}`.toLowerCase().includes(s)))
  }, [all, q, type, load])
  const cols: Col<EngRow>[] = [
    { key: 'id', header: 'Engineer ID', render: (r) => r.id },
    { key: 'n', header: 'Engineer name', render: (r) => <span className="font-semibold text-slate-900">{r.name}</span> },
    { key: 'm', header: 'Mobile', render: (r) => r.mobile },
    { key: 't', header: 'Type', render: (r) => r.type },
    { key: 's', header: 'Sites mapped', render: (r) => <b>{r.sites.length}</b> },
    { key: 'st', header: 'States', render: (r) => [...new Set(r.sites.map((s) => s.state))].join(', ') || '—' },
    { key: 'a', header: 'Action', render: (r) => <Button size="sm" variant="secondary" icon={<Eye size={13} />} disabled={!r.sites.length} onClick={() => setView(r)}>View sites</Button> },
  ]
  return (
    <>
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(r) => r.id}
        noun="engineers"
        toolbar={
          <TableBar search={q} onSearch={setQ} placeholder="Engineer ID, name, mobile…" onDownload={() => downloadCsv('engineer-wise-sites', ['Engineer ID', 'Name', 'Mobile', 'Type', 'Sites mapped', 'Site IDs'], rows.map((r) => [r.id, r.name, r.mobile, r.type, String(r.sites.length), r.sites.map((s) => s.siteId).join(' ')]))}>
            <FilterSelect label="Type" value={type} onChange={setType} options={['ATM', 'UPS', 'Network']} />
            <FilterSelect label="Load" value={load} onChange={setLoad} options={[{ value: '1', label: 'Has sites' }, { value: '0', label: 'No sites' }]} />
          </TableBar>
        }
      />
      {view && (
        <Modal title={`${view.name} — ${view.sites.length} site(s)`} sub={`${view.id} · ${view.mobile} · ${view.type}`} onClose={() => setView(null)} width={720}>
          <table className="w-full text-left text-[12px]">
            <thead className="text-[11px] text-slate-500 uppercase">
              <tr><th className="py-1.5">Site ID</th><th>ATM ID</th><th>Franchise</th><th>Assigned on</th><th>Type</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {view.sites.map((s) => (
                <tr key={s.siteId}>
                  <td className="py-1.5"><Link to={`/master-data/sites/${s.siteId}`} className="font-semibold text-[#0066FF] hover:underline">{s.siteId}</Link></td>
                  <td>{s.atmId}</td>
                  <td>{frName(s.frId)}</td>
                  <td>{fmtDate(s.engineer?.assignedOn)}</td>
                  <td>{s.engineer?.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </>
  )
}

function Unmapped({ rows: all, frName, onAssign }: { rows: Site[]; frName: (id: string) => string; onAssign: (atm: string) => void }) {
  const rights = useHubRights()
  const [q, setQ] = useState('')
  const [state, setState] = useState('all')
  const [step, setStep] = useState('all')
  const states = useMemo(() => [...new Set(all.map((s) => s.state))].sort(), [all])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter((x) => (state === 'all' || x.state === state) && (step === 'all' || x.steps.engineerMapping?.status === step) && (!s || `${x.siteId} ${x.atmId} ${frName(x.frId)}`.toLowerCase().includes(s)))
  }, [all, q, state, step, frName])
  const cols: Col<Site>[] = [
    { key: 's', header: 'Site ID', render: (x) => <Link to={`/master-data/sites/${x.siteId}`} className="font-semibold text-[#0066FF] hover:underline">{x.siteId}</Link> },
    { key: 'a', header: 'ATM ID', render: (x) => x.atmId },
    { key: 'f', header: 'Franchise', render: (x) => frName(x.frId) },
    { key: 'l', header: 'Location', render: (x) => x.location },
    { key: 'st', header: 'State', render: (x) => x.state },
    { key: 'e', header: 'Engineer mapping step', render: (x) => <Badge tone={toneFor(x.steps.engineerMapping?.status ?? 'Not Started')}>{x.steps.engineerMapping?.status ?? 'Not Started'}</Badge> },
    { key: 'x', header: 'Action', render: (x) => <Button size="sm" variant="secondary" icon={<UserPlus size={13} />} disabled={!rights.project} onClick={() => onAssign(x.atmId)}>Assign</Button> },
  ]
  return (
    <DataTable
      rows={rows}
      cols={cols}
      rowKey={(x) => x.siteId}
      noun="sites"
      toolbar={
        <TableBar search={q} onSearch={setQ} placeholder="Site ID, ATM ID, franchise…" onDownload={() => downloadCsv('sites-without-engineer', ['Site ID', 'ATM ID', 'Franchise', 'Location', 'State', 'Engineer mapping step'], rows.map((x) => [x.siteId, x.atmId, frName(x.frId), x.location, x.state, x.steps.engineerMapping?.status ?? '']))}>
          <FilterSelect label="State" value={state} onChange={setState} options={states} />
          <FilterSelect label="Step status" value={step} onChange={setStep} options={['Not Started', 'Pending', 'In Progress', 'Email Submitted', 'On Hold']} />
        </TableBar>
      }
    />
  )
}

type HistRow = EngineerAssignment & { removedOn: string; siteId: string; atmId: string; frId: string; current: string; key: string }
function History({ rows: all, frName }: { rows: HistRow[]; frName: (id: string) => string }) {
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter((r) => (type === 'all' || r.type === type) && (!s || `${r.siteId} ${r.atmId} ${r.name} ${r.current}`.toLowerCase().includes(s))).sort((a, b) => b.removedOn.localeCompare(a.removedOn))
  }, [all, q, type])
  const cols: Col<HistRow>[] = [
    { key: 's', header: 'Site ID', render: (r) => r.siteId },
    { key: 'a', header: 'ATM ID', render: (r) => r.atmId },
    { key: 'f', header: 'Franchise', render: (r) => frName(r.frId) },
    { key: 'n', header: 'Previous engineer', render: (r) => `${r.name} (${r.engineerId})` },
    { key: 'm', header: 'Mobile', render: (r) => r.mobile },
    { key: 't', header: 'Type', render: (r) => r.type },
    { key: 'o', header: 'Assigned on', render: (r) => fmtDate(r.assignedOn) },
    { key: 'r', header: 'Removed on', render: (r) => fmtDate(r.removedOn) },
    { key: 'b', header: 'Assigned by', render: (r) => r.assignedBy },
    { key: 'c', header: 'Current engineer', render: (r) => r.current },
  ]
  return (
    <DataTable
      rows={rows}
      cols={cols}
      rowKey={(r) => r.key}
      noun="history records"
      empty="No engineer has been replaced yet. Previous engineers appear here when a site's engineer is changed."
      toolbar={
        <TableBar search={q} onSearch={setQ} placeholder="Site, ATM, engineer…" onDownload={() => downloadCsv('engineer-mapping-history', ['Site ID', 'ATM ID', 'Franchise', 'Previous engineer', 'Engineer ID', 'Mobile', 'Type', 'Assigned on', 'Removed on', 'Assigned by', 'Current engineer'], rows.map((r) => [r.siteId, r.atmId, frName(r.frId), r.name, r.engineerId, r.mobile, r.type, r.assignedOn, r.removedOn, r.assignedBy, r.current]))}>
          <FilterSelect label="Type" value={type} onChange={setType} options={['ATM', 'UPS', 'Network']} />
        </TableBar>
      }
    />
  )
}
