import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { MANAGERS, useSites, updateSite, type ManagerAssignment, type Site } from '@/data/network'
import { useFrMap, useHubRights } from './hooks'
import { clearDraft, fmtDate, getDraft, saveDraft, todayIso } from './hubStore'
import { DataTable, FilterSelect, FormActions, PageShell, Panel, PickField, ReadOnlyNote, SiteFetchBox, TableBar, Tabs, type Col } from './ui'

type Tab = 'sites' | 'change' | 'managers' | 'history'
const DRAFT = 'manager-mapping'
const DEPTS = [...new Set(MANAGERS.map((m) => m.department ?? ''))].filter(Boolean).sort()

export default function ManagerMapping() {
  const { sites } = useSites()
  const frMap = useFrMap()
  const frName = useCallback((id: string) => frMap.get(id)?.name ?? id, [frMap])
  const [tab, setTab] = useState<Tab>('sites')
  const [prefill, setPrefill] = useState<string | null>(null)
  const history = useMemo(() => sites.flatMap((s) => s.managerHistory.map((h, i) => ({ ...h, siteId: s.siteId, atmId: s.atmId, current: s.manager?.name ?? '—', key: `${s.siteId}-${i}` }))), [sites])

  return (
    <PageShell title="Manager / RM Mapping" sub="Each site is mapped to its Manager or Relationship Manager (§8.7). On change, the old mapping stays in history.">
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'sites', label: 'Site-wise Mapping', count: sites.length },
          { key: 'change', label: 'Map / Change Manager' },
          { key: 'managers', label: 'Manager-wise', count: MANAGERS.length },
          { key: 'history', label: 'Mapping History', count: history.length },
        ]}
      />
      {tab === 'sites' && (
        <SiteWise
          sites={sites}
          frName={frName}
          onChange={(atm) => {
            setPrefill(atm)
            setTab('change')
          }}
        />
      )}
      {tab === 'change' && <ChangeForm key={prefill ?? 'blank'} initialAtm={prefill} sites={sites} frName={frName} />}
      {tab === 'managers' && <ManagerWise sites={sites} />}
      {tab === 'history' && <History rows={history} />}
    </PageShell>
  )
}

function SiteWise({ sites, frName, onChange }: { sites: Site[]; frName: (id: string) => string; onChange: (atm: string) => void }) {
  const rights = useHubRights()
  const [q, setQ] = useState('')
  const [mgr, setMgr] = useState('all')
  const [dept, setDept] = useState('all')
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return sites.filter((x) => (mgr === 'all' || x.manager?.managerId === mgr) && (dept === 'all' || x.manager?.department === dept) && (!s || `${x.siteId} ${x.atmId} ${frName(x.frId)} ${x.manager?.name ?? ''} ${x.manager?.empCode ?? ''}`.toLowerCase().includes(s)))
  }, [sites, q, mgr, dept, frName])
  const cols: Col<Site>[] = [
    { key: 's', header: 'Assigned site', render: (x) => <Link to={`/master-data/sites/${x.siteId}`} className="font-semibold text-[#0066FF] hover:underline">{x.siteId}</Link> },
    { key: 'a', header: 'ATM ID', render: (x) => x.atmId },
    { key: 'f', header: 'Franchise', render: (x) => frName(x.frId) },
    { key: 'id', header: 'Manager ID', render: (x) => x.manager?.managerId ?? '—' },
    { key: 'n', header: 'Manager name', render: (x) => <span className="font-semibold text-slate-900">{x.manager?.name ?? 'Not mapped'}</span> },
    { key: 'e', header: 'Employee code', render: (x) => x.manager?.empCode ?? '—' },
    { key: 'm', header: 'Mobile', render: (x) => x.manager?.mobile ?? '—' },
    { key: 'em', header: 'Email', render: (x) => x.manager?.email ?? '—' },
    { key: 'd', header: 'Department', render: (x) => x.manager?.department ?? '—' },
    { key: 'dt', header: 'Mapping date', render: (x) => fmtDate(x.manager?.mappedOn) },
    { key: 'r', header: 'Reporting manager', render: (x) => x.manager?.reportingManager ?? '—' },
    { key: 'x', header: 'Action', render: (x) => <Button size="sm" variant="secondary" icon={<Pencil size={13} />} disabled={!rights.project} onClick={() => onChange(x.atmId)}>Change</Button> },
  ]
  return (
    <DataTable
      rows={rows}
      cols={cols}
      rowKey={(x) => x.siteId}
      noun="sites"
      toolbar={
        <TableBar search={q} onSearch={setQ} placeholder="Site, ATM, franchise, manager…" onDownload={() => downloadCsv('manager-rm-mapping', ['Site ID', 'ATM ID', 'Franchise', 'Manager ID', 'Manager name', 'Employee code', 'Mobile', 'Email', 'Department', 'Mapping date', 'Reporting manager'], rows.map((x) => [x.siteId, x.atmId, frName(x.frId), x.manager?.managerId ?? '', x.manager?.name ?? '', x.manager?.empCode ?? '', x.manager?.mobile ?? '', x.manager?.email ?? '', x.manager?.department ?? '', x.manager?.mappedOn ?? '', x.manager?.reportingManager ?? '']))}>
          <FilterSelect label="Manager" value={mgr} onChange={setMgr} options={MANAGERS.map((m) => ({ value: m.id, label: `${m.name} (${m.id})` }))} />
          <FilterSelect label="Department" value={dept} onChange={setDept} options={DEPTS} />
        </TableBar>
      }
    />
  )
}

function ChangeForm({ initialAtm, sites, frName }: { initialAtm: string | null; sites: Site[]; frName: (id: string) => string }) {
  const navigate = useNavigate()
  const rights = useHubRights()
  const [f, setF] = useState<Record<string, string>>(() => {
    const base = { atm: '', managerId: '', date: todayIso(), reason: '' }
    return initialAtm ? { ...base, atm: initialAtm } : { ...base, ...getDraft(DRAFT) }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }))
  const site = useMemo(() => {
    const a = f.atm.trim().toLowerCase()
    return a ? sites.find((s) => s.atmId.toLowerCase() === a) : undefined
  }, [f.atm, sites])
  const m = MANAGERS.find((x) => x.id === f.managerId)

  const submit = () => {
    const e: Record<string, string> = {}
    if (!f.atm.trim()) e.atm = 'ATM ID is required'
    else if (!site) e.atm = 'No site found for this ATM ID'
    if (!m) e.managerId = 'Select a manager'
    else if (site?.manager?.managerId === m.id) e.managerId = 'This manager is already mapped to the site'
    if (!f.date) e.date = 'Mapping date is required'
    else if (f.date > todayIso()) e.date = 'Mapping date cannot be in the future'
    if (site?.manager && !f.reason.trim()) e.reason = 'Give a reason for changing the manager'
    setErrors(e)
    if (Object.keys(e).length || !site || !m) return
    const next: ManagerAssignment = { managerId: m.id, name: m.name, empCode: m.empCode ?? '', mobile: m.mobile, email: m.email, department: m.department ?? '', reportingManager: m.reportingManager ?? '', mappedOn: f.date }
    const old = site.manager
    updateSite(site.siteId, (s) => ({ manager: next, managerHistory: s.manager ? [{ ...s.manager, removedOn: f.date }, ...s.managerHistory] : s.managerHistory }), {
      action: 'Manager / RM mapping changed',
      before: old ? `${old.name} (${old.managerId})` : '—',
      after: `${next.name} (${next.managerId})${f.reason ? ` — ${f.reason}` : ''}`,
    })
    clearDraft(DRAFT)
    setF({ atm: '', managerId: '', date: todayIso(), reason: '' })
    toast(old ? `${next.name} mapped to ${site.siteId}; ${old.name} kept in history` : `${next.name} mapped to ${site.siteId}`)
  }

  return (
    <Panel title="Map / change manager by ATM ID" sub="The ATM ID is the base of every mapping (§8.7 note).">
      {!rights.project && <div className="mb-4"><ReadOnlyNote text="Your role can view manager mapping but cannot change it." /></div>}
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="ATM ID" required value={f.atm} onChange={(e) => set('atm', e.target.value)} placeholder="e.g. DXMH70007" error={errors.atm} disabled={!rights.project} />
        <PickField label="Manager / RM" required value={f.managerId} onChange={(v) => set('managerId', v)} options={MANAGERS.map((x) => ({ value: x.id, label: `${x.name} · ${x.id} · ${x.department}` }))} error={errors.managerId} disabled={!rights.project} />
        <TextField label="Mapping date" type="date" required value={f.date} max={todayIso()} onChange={(e) => set('date', e.target.value)} error={errors.date} disabled={!rights.project} />
        <TextField label="Employee code" value={m?.empCode ?? ''} readOnly placeholder="Auto-filled" />
        <TextField label="Mobile number" value={m?.mobile ?? ''} readOnly placeholder="Auto-filled" />
        <TextField label="Email ID" value={m?.email ?? ''} readOnly placeholder="Auto-filled" />
        <TextField label="Department" value={m?.department ?? ''} readOnly placeholder="Auto-filled" />
        <TextField label="Reporting manager" value={m?.reportingManager ?? ''} readOnly placeholder="Auto-filled" />
        <TextField label="Reason for change" required={!!site?.manager} value={f.reason} onChange={(e) => set('reason', e.target.value)} error={errors.reason} disabled={!rights.project} />
      </div>
      {site && (
        <div className="mt-4">
          <SiteFetchBox
            site={site}
            frName={frName(site.frId)}
            extra={
              <div className="sm:col-span-3">
                <span className="text-slate-500">Current manager</span>
                <div className="font-semibold text-slate-900">{site.manager ? `${site.manager.name} · ${site.manager.empCode} · since ${fmtDate(site.manager.mappedOn)} — will move to history` : 'None mapped'}</div>
              </div>
            }
          />
        </div>
      )}
      <div className="mt-5">
        <FormActions
          onDraft={() => {
            saveDraft(DRAFT, f)
            toast('Draft saved')
          }}
          onSubmit={submit}
          onBack={() => navigate('/master-data')}
          submitLabel="Submit mapping"
          disabled={!rights.project}
        />
      </div>
    </Panel>
  )
}

type MgrRow = (typeof MANAGERS)[number] & { sites: number; states: string }
function ManagerWise({ sites }: { sites: Site[] }) {
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('all')
  const all = useMemo<MgrRow[]>(() => {
    return MANAGERS.map((m) => {
      const ss = sites.filter((s) => s.manager?.managerId === m.id)
      return { ...m, sites: ss.length, states: [...new Set(ss.map((s) => s.state))].join(', ') }
    })
  }, [sites])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter((r) => (dept === 'all' || r.department === dept) && (!s || `${r.id} ${r.name} ${r.empCode} ${r.email}`.toLowerCase().includes(s)))
  }, [all, q, dept])
  const cols: Col<MgrRow>[] = [
    { key: 'id', header: 'Manager ID', render: (r) => r.id },
    { key: 'n', header: 'Name', render: (r) => <span className="font-semibold text-slate-900">{r.name}</span> },
    { key: 'e', header: 'Employee code', render: (r) => r.empCode },
    { key: 'm', header: 'Mobile', render: (r) => r.mobile },
    { key: 'em', header: 'Email', render: (r) => r.email },
    { key: 'd', header: 'Department', render: (r) => r.department },
    { key: 'r', header: 'Reporting manager', render: (r) => r.reportingManager },
    { key: 's', header: 'Sites', render: (r) => <b>{r.sites}</b> },
    { key: 'st', header: 'States', render: (r) => r.states || '—' },
  ]
  return (
    <DataTable
      rows={rows}
      cols={cols}
      rowKey={(r) => r.id}
      noun="managers"
      toolbar={
        <TableBar search={q} onSearch={setQ} placeholder="ID, name, code, email…" onDownload={() => downloadCsv('manager-wise-sites', ['Manager ID', 'Name', 'Employee code', 'Mobile', 'Email', 'Department', 'Reporting manager', 'Sites', 'States'], rows.map((r) => [r.id, r.name, r.empCode ?? '', r.mobile, r.email, r.department ?? '', r.reportingManager ?? '', String(r.sites), r.states]))}>
          <FilterSelect label="Department" value={dept} onChange={setDept} options={DEPTS} />
        </TableBar>
      }
    />
  )
}

type HistRow = ManagerAssignment & { removedOn: string; siteId: string; atmId: string; current: string; key: string }
function History({ rows: all }: { rows: HistRow[] }) {
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('all')
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter((r) => (dept === 'all' || r.department === dept) && (!s || `${r.siteId} ${r.atmId} ${r.name} ${r.current}`.toLowerCase().includes(s))).sort((a, b) => b.removedOn.localeCompare(a.removedOn))
  }, [all, q, dept])
  const cols: Col<HistRow>[] = [
    { key: 's', header: 'Site ID', render: (r) => r.siteId },
    { key: 'a', header: 'ATM ID', render: (r) => r.atmId },
    { key: 'n', header: 'Previous manager', render: (r) => `${r.name} (${r.managerId})` },
    { key: 'e', header: 'Employee code', render: (r) => r.empCode },
    { key: 'd', header: 'Department', render: (r) => r.department },
    { key: 'o', header: 'Mapped on', render: (r) => fmtDate(r.mappedOn) },
    { key: 'r', header: 'Removed on', render: (r) => fmtDate(r.removedOn) },
    { key: 'c', header: 'Current manager', render: (r) => r.current },
  ]
  return (
    <DataTable
      rows={rows}
      cols={cols}
      rowKey={(r) => r.key}
      noun="history records"
      empty="No manager has been changed yet."
      toolbar={
        <TableBar search={q} onSearch={setQ} placeholder="Site, ATM, manager…" onDownload={() => downloadCsv('manager-mapping-history', ['Site ID', 'ATM ID', 'Previous manager', 'Manager ID', 'Employee code', 'Department', 'Mapped on', 'Removed on', 'Current manager'], rows.map((r) => [r.siteId, r.atmId, r.name, r.managerId, r.empCode, r.department, r.mappedOn, r.removedOn, r.current]))}>
          <FilterSelect label="Department" value={dept} onChange={setDept} options={DEPTS} />
        </TableBar>
      }
    />
  )
}
