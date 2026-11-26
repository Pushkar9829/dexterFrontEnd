// Data Breach & Security Incident Management (DPDP parameters 1–13, DPDP Rules 2025 Rule 7).
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus, ShieldAlert, Timer } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Field'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { updateAccount, useSecurity } from '@/data/security'
import {
  BREACH_SOURCES,
  DATA_TYPES,
  boardDeadline,
  logPrivacy,
  nextId,
  patchItem,
  privacyStore,
  shortId,
  usePrivacy,
  type Breach,
  type BreachSeverity,
  type BreachStatus,
} from '@/data/privacy'
import { DataGrid, FormActions, Note, PageShell, Section, Stat, StatRow, Tabs, type Col } from '../security/kit'
import { terminateUserSessions } from '../security/ops'
import { actor, fmtDT, useNow } from '../security/util'

const BASE = '/governance/privacy/breaches'
const shell = { back: '/governance/privacy', backLabel: 'Back to DPDP Compliance', Icon: ShieldAlert, color: 'text-rose-600 bg-rose-50 border-rose-200' }
const sevTone = (s: BreachSeverity): Tone => (s === 'Critical' || s === 'High' ? 'red' : s === 'Medium' ? 'amber' : 'blue')
const stTone = (s: BreachStatus): Tone => (s === 'Closed' ? 'green' : s === 'Open' ? 'red' : 'amber')

function fmtLeft(ms: number) {
  const neg = ms < 0
  const t = Math.abs(ms)
  const h = Math.floor(t / 3_600_000)
  const m = Math.floor((t % 3_600_000) / 60_000)
  const s = Math.floor((t % 60_000) / 1000)
  const txt = `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  return neg ? `${txt} overdue` : `${txt} left`
}

export function BreachList() {
  const nav = useNavigate()
  const p = usePrivacy()
  const now = useNow(30_000)
  const hours = p.settings.breachDetailedReportHours
  const real = p.breaches.filter((b) => !b.draft)
  const reportState = (b: Breach) => (b.draft ? 'Draft' : b.boardDetailed ? 'Detailed report sent' : boardDeadline(b, hours) < now ? 'Report overdue' : 'Report pending')
  const cols: Col<Breach>[] = [
    { key: 'id', label: 'Incident ID', value: (b) => b.id, render: (b) => <Link to={`${BASE}/${b.id}`} className="font-mono text-[11.5px] font-semibold text-[#0066FF] hover:underline">{b.id}</Link> },
    { key: 'title', label: 'Incident', value: (b) => b.title, render: (b) => (<><span className="font-medium text-ink">{b.title}</span><span className="block text-[10.5px] text-muted">{b.source}</span></>) },
    { key: 'det', label: 'Detected', value: (b) => fmtDT(b.detectedAt), className: 'whitespace-nowrap text-muted' },
    { key: 'sev', label: 'Severity', value: (b) => b.severity, render: (b) => <Badge tone={sevTone(b.severity)}>{b.severity}</Badge> },
    { key: 'types', label: 'Affected data', value: (b) => b.dataTypes.join(', '), className: 'max-w-[200px] text-[11.5px] text-muted' },
    { key: 'users', label: 'Affected users', value: (b) => String(b.affectedUsers.length), className: 'text-center' },
    { key: 'st', label: 'Status', value: (b) => (b.draft ? 'Draft' : b.status), render: (b) => (b.draft ? <Badge tone="gray">Draft</Badge> : <Badge tone={stTone(b.status)}>{b.status}</Badge>) },
    { key: 'board', label: 'Board report', value: reportState, render: (b) => <span className={`text-[11.5px] ${reportState(b) === 'Report overdue' ? 'font-semibold text-rose-600' : 'text-muted'}`}>{reportState(b)}</span> },
  ]
  return (
    <PageShell {...shell} title="Data Breach & Security Incidents" sub="Record every unauthorized access, data theft, leakage or accidental disclosure, contain it and report it to the Data Protection Board." actions={<Button icon={<Plus size={15} />} onClick={() => nav(`${BASE}/new`)}>Register incident</Button>}>
      <StatRow>
        <Stat label="Open incidents" value={real.filter((b) => b.status !== 'Closed').length} tone="red" />
        <Stat label="Critical / High" value={real.filter((b) => b.status !== 'Closed' && (b.severity === 'Critical' || b.severity === 'High')).length} tone="red" />
        <Stat label="Board report overdue" value={real.filter((b) => reportState(b) === 'Report overdue').length} tone="amber" />
        <Stat label="Closed" value={real.filter((b) => b.status === 'Closed').length} tone="green" />
      </StatRow>
      <Note tone="amber">DPDP Rules 2025, Rule 7: inform affected Data Principals and the Board without delay; send the detailed report to the Board within {hours} hours of becoming aware (unless the Board allows more time in writing).</Note>
      <DataGrid
        rows={p.breaches}
        cols={cols}
        rowKey={(b) => b.id}
        fileName="data-breach-incidents"
        searchPlaceholder="Search incident ID, title, data type…"
        filters={[
          { key: 'sev', label: 'Severities', get: (b) => b.severity, options: ['Critical', 'High', 'Medium', 'Low'] },
          { key: 'st', label: 'Statuses', get: (b) => (b.draft ? 'Draft' : b.status), options: ['Draft', 'Open', 'Contained', 'Under Investigation', 'Closed'] },
          { key: 'src', label: 'Sources', get: (b) => b.source, options: [...BREACH_SOURCES] },
          { key: 'board', label: 'Board report states', get: reportState, options: ['Report pending', 'Report overdue', 'Detailed report sent', 'Draft'] },
        ]}
        date={(b) => b.detectedAt}
        actions={(b) => <Button size="sm" variant="secondary" onClick={() => nav(`${BASE}/${b.id}`)}>{b.draft ? 'Continue' : 'Open'}</Button>}
      />
    </PageShell>
  )
}

const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

function BreachForm({ initial, onDone, onBack }: { initial?: Breach; onDone: (b: Breach) => void; onBack: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [detectedAt, setDetectedAt] = useState(() => toLocalInput(initial?.detectedAt ?? new Date().toISOString()))
  const [source, setSource] = useState(initial?.source ?? '')
  const [severity, setSeverity] = useState<BreachSeverity | ''>(initial?.severity ?? '')
  const [dataTypes, setDataTypes] = useState<string[]>(initial?.dataTypes ?? [])
  const [systems, setSystems] = useState(initial?.systems ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [err, setErr] = useState<Record<string, string>>({})

  const build = (draft: boolean): Breach => {
    const s = privacyStore.get()
    const at = new Date().toISOString()
    const by = actor()
    const id = initial?.id ?? nextId('INC', s.breaches)
    const history = [...(initial?.history ?? []), draft ? { at, actor: by, action: 'Draft saved' } : { at, actor: by, action: 'Incident registered', detail: `${severity} — ${source}` }]
    if (!draft) history.push({ at, actor: 'System', action: 'Immediate alert sent', detail: s.settings.breachAlertRecipients.join(', ') })
    return {
      id,
      draft,
      title: title.trim(),
      detectedAt: detectedAt ? new Date(detectedAt).toISOString() : at,
      reportedAt: at,
      source,
      description: description.trim(),
      severity: severity || 'Medium',
      dataTypes,
      systems: systems.trim(),
      status: 'Open',
      alert: draft ? undefined : { at, recipients: s.settings.breachAlertRecipients, by: 'System' },
      accessBlocks: initial?.accessBlocks ?? [],
      evidence: initial?.evidence ?? [],
      affectedUsers: initial?.affectedUsers ?? [],
      correctiveActions: initial?.correctiveActions ?? [],
      history,
    }
  }
  const save = (b: Breach) => privacyStore.set((s) => ({ ...s, breaches: s.breaches.some((x) => x.id === b.id) ? s.breaches.map((x) => (x.id === b.id ? b : x)) : [b, ...s.breaches] }))

  const saveDraft = () => {
    if (!title.trim()) return setErr({ title: 'A title is needed to save a draft.' })
    const b = build(true)
    save(b)
    logPrivacy(actor(), 'Incident draft saved', b.id)
    toast(`Draft ${b.id} saved.`, 'info')
    onDone(b)
  }
  const submit = () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Title is required.'
    if (!detectedAt) e.detectedAt = 'Detection time is required.'
    else if (new Date(detectedAt).getTime() > Date.now() + 60_000) e.detectedAt = 'Detection time cannot be in the future.'
    if (!source) e.source = 'Detection source is required.'
    if (!severity) e.severity = 'Classify the severity.'
    if (dataTypes.length === 0) e.dataTypes = 'Select at least one affected data type.'
    if (!systems.trim()) e.systems = 'Name the affected system(s).'
    if (description.trim().length < 20) e.description = 'Describe what happened (at least 20 characters).'
    setErr(e)
    if (Object.keys(e).length) return toast('Fill the required fields.', 'error')
    const b = build(false)
    save(b)
    logPrivacy(actor(), 'Incident registered', b.id, `${b.severity}; data: ${b.dataTypes.join(', ')}`)
    toast(`Incident ${b.id} registered — security team and management alerted.`)
    onDone(b)
  }

  return (
    <div className="space-y-5 rounded-xl border border-line bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Incident title" required className="sm:col-span-2" value={title} onChange={(e) => setTitle(e.target.value)} error={err.title} />
        <TextField label="Detected at" required type="datetime-local" value={detectedAt} onChange={(e) => setDetectedAt(e.target.value)} error={err.detectedAt} hint="The 72-hour Board deadline runs from here." />
        <SelectField label="Detection source" required options={[...BREACH_SOURCES]} value={source} onChange={(e) => setSource(e.target.value)} error={err.source} />
        <SelectField label="Severity" required options={['Critical', 'High', 'Medium', 'Low']} value={severity} onChange={(e) => setSeverity(e.target.value as BreachSeverity)} error={err.severity} />
        <TextField label="Affected system(s)" required value={systems} onChange={(e) => setSystems(e.target.value)} error={err.systems} placeholder="e.g. Franchise KYC storage, mobile API" />
      </div>
      <div>
        <div className="mb-1.5 text-[11px] font-semibold text-ink">Affected data types *</div>
        <div className="grid gap-2 sm:grid-cols-4">
          {DATA_TYPES.map((t) => (
            <Checkbox key={t} checked={dataTypes.includes(t)} onChange={(v) => setDataTypes((d) => (v ? [...d, t] : d.filter((x) => x !== t)))} label={<span className="text-ink">{t}</span>} />
          ))}
        </div>
        {err.dataTypes && <p className="mt-1 text-[11px] text-brand-red">{err.dataTypes}</p>}
      </div>
      <TextAreaField label="What happened" required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} error={err.description} />
      <Note>On submit a unique incident ID is generated and an immediate alert goes to: {privacyStore.get().settings.breachAlertRecipients.join(', ')}.</Note>
      <FormActions onBack={onBack} onDraft={saveDraft} onSubmit={submit} submitLabel="Register incident" />
    </div>
  )
}

export function BreachNew() {
  const nav = useNavigate()
  return (
    <PageShell {...shell} back={BASE} backLabel="Back to Incidents" title="Register Security Incident">
      <BreachForm onBack={() => nav(BASE)} onDone={(b) => nav(b.draft ? BASE : `${BASE}/${b.id}`)} />
    </PageShell>
  )
}

type DTab = 'overview' | 'contain' | 'investigate' | 'notify' | 'close' | 'history'

export function BreachDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const p = usePrivacy()
  const now = useNow(1000)
  const [tab, setTab] = useState<DTab>('overview')
  const b = p.breaches.find((x) => x.id === id)

  if (!b)
    return (
      <PageShell {...shell} back={BASE} backLabel="Back to Incidents" title="Incident not found">
        <Note tone="amber">No incident with ID {id}.</Note>
      </PageShell>
    )
  if (b.draft)
    return (
      <PageShell {...shell} back={BASE} backLabel="Back to Incidents" title={`Draft ${b.id}`}>
        <BreachForm initial={b} onBack={() => nav(BASE)} onDone={(x) => nav(x.draft ? BASE : `${BASE}/${x.id}`)} />
      </PageShell>
    )

  const deadline = boardDeadline(b, p.settings.breachDetailedReportHours)
  const left = deadline - now
  return (
    <PageShell {...shell} back={BASE} backLabel="Back to Incidents" title={b.id} sub={b.title}>
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={stTone(b.status)}>{b.status}</Badge>
        <Badge tone={sevTone(b.severity)}>{b.severity}</Badge>
        <span className="text-[12px] text-muted">Detected {fmtDT(b.detectedAt)} · {b.source}</span>
        <div className={`ml-auto flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] font-semibold ${b.boardDetailed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : left < 0 ? 'border-red-200 bg-red-50 text-red-700' : left < 24 * 3_600_000 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`} role="timer" aria-live="off">
          <Timer size={15} />
          {b.boardDetailed ? `Detailed Board report sent ${fmtDT(b.boardDetailed.at)}` : `Detailed Board report: ${fmtLeft(left)} (due ${fmtDT(new Date(deadline).toISOString())})`}
        </div>
      </div>
      <Tabs
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'contain', label: 'Containment' },
          { value: 'investigate', label: 'Investigation' },
          { value: 'notify', label: 'Notifications' },
          { value: 'close', label: 'Closure' },
          { value: 'history', label: 'History' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'overview' && <Overview b={b} />}
      {tab === 'contain' && <Containment b={b} />}
      {tab === 'investigate' && <Investigation b={b} />}
      {tab === 'notify' && <Notifications b={b} />}
      {tab === 'close' && <Closure b={b} />}
      {tab === 'history' && (
        <DataGrid
          rows={[...b.history].reverse()}
          rowKey={(h) => `${h.at}-${h.action}-${h.detail ?? ''}`}
          fileName={`${b.id}-history`}
          filters={[{ key: 'a', label: 'Actions', get: (h) => h.action }]}
          cols={[
            { key: 'at', label: 'Date & time', value: (h) => fmtDT(h.at), className: 'whitespace-nowrap text-muted' },
            { key: 'actor', label: 'By', value: (h) => h.actor },
            { key: 'a', label: 'Action', value: (h) => h.action, className: 'font-medium text-ink' },
            { key: 'd', label: 'Detail', value: (h) => h.detail ?? '', className: 'text-muted' },
          ]}
        />
      )}
    </PageShell>
  )
}

/** Patch the incident, append a history line and an audit entry. */
function makeWriter(b: Breach) {
  return (fn: (x: Breach) => Breach, action: string, detail?: string) => {
    const at = new Date().toISOString()
    const by = actor()
    patchItem('breaches', b.id, (x) => {
      const y = fn(x as Breach)
      return { ...y, history: [...y.history, { at, actor: by, action, detail }] }
    })
    logPrivacy(by, `Incident: ${action}`, b.id, detail)
  }
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-line/60 py-2 text-[12.5px] last:border-0">
      <span className="w-44 shrink-0 text-muted">{k}</span>
      <span className="min-w-0 flex-1 text-ink">{v || '—'}</span>
    </div>
  )
}

function Overview({ b }: { b: Breach }) {
  const write = makeWriter(b)
  const [sev, setSev] = useState<BreachSeverity>(b.severity)
  const [types, setTypes] = useState<string[]>(b.dataTypes)
  const [err, setErr] = useState('')
  const closed = b.status === 'Closed'
  const reclassify = () => {
    if (types.length === 0) return setErr('Select at least one data type.')
    setErr('')
    write((x) => ({ ...x, severity: sev, dataTypes: types }), 'Reclassified', `${b.severity} → ${sev}; data: ${types.join(', ')}`)
    toast('Classification updated.')
  }
  const setStatus = (s: BreachStatus) => {
    write((x) => ({ ...x, status: s }), `Status → ${s}`)
    toast(`Status changed to ${s}.`)
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Incident">
        <Row k="Description" v={b.description} />
        <Row k="Affected systems" v={b.systems} />
        <Row k="Reported in system" v={fmtDT(b.reportedAt)} />
        <Row k="Immediate alert" v={b.alert ? `${fmtDT(b.alert.at)} → ${b.alert.recipients.join(', ')}` : 'Not sent'} />
        {!closed && (
          <div className="mt-3 flex flex-wrap gap-2">
            {b.status !== 'Contained' && <Button size="sm" variant="secondary" onClick={() => setStatus('Contained')}>Mark contained</Button>}
            {b.status !== 'Under Investigation' && <Button size="sm" variant="secondary" onClick={() => setStatus('Under Investigation')}>Under investigation</Button>}
          </div>
        )}
      </Section>
      <Section title="Classification" sub="Parameter 3 — severity and affected data types">
        <SelectField label="Severity" required options={['Critical', 'High', 'Medium', 'Low']} value={sev} onChange={(e) => setSev(e.target.value as BreachSeverity)} disabled={closed} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DATA_TYPES.map((t) => (
            <Checkbox key={t} checked={types.includes(t)} onChange={(v) => !closed && setTypes((d) => (v ? [...d, t] : d.filter((x) => x !== t)))} label={<span className="text-ink">{t}</span>} />
          ))}
        </div>
        {err && <p className="mt-1 text-[11px] text-brand-red">{err}</p>}
        {!closed && (
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={reclassify}>Save classification</Button>
          </div>
        )}
      </Section>
    </div>
  )
}

function Containment({ b }: { b: Breach }) {
  const write = makeWriter(b)
  const sec = useSecurity()
  const [kind, setKind] = useState<'' | 'Account' | 'API' | 'System'>('')
  const [account, setAccount] = useState('')
  const [target, setTarget] = useState('')
  const [item, setItem] = useState('')
  const [loc, setLoc] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const closed = b.status === 'Closed'

  const block = () => {
    const e: Record<string, string> = {}
    if (!kind) e.kind = 'Choose what to block.'
    if (kind === 'Account' && !account) e.account = 'Choose the account.'
    if (kind && kind !== 'Account' && !target.trim()) e.target = 'Name the API / system.'
    setErr(e)
    if (Object.keys(e).length || !kind) return
    const who = actor()
    const at = new Date().toISOString()
    let label = target.trim()
    if (kind === 'Account') {
      const acc = sec.accounts.find((a) => a.id === account)
      label = `${account} (${acc?.name ?? ''})`
      updateAccount(account, { status: 'Blocked' }, { actor: who, action: 'Account blocked (data breach)', detail: `${b.id}` })
      terminateUserSessions(account, who, `Blocked for incident ${b.id}`)
    }
    write((x) => ({ ...x, accessBlocks: [...x.accessBlocks, { at, kind, target: label, by: who }] }), 'Access blocked', `${kind}: ${label}`)
    setKind('')
    setAccount('')
    setTarget('')
    toast(`${kind} access blocked: ${label}`)
  }
  const preserve = () => {
    const e: Record<string, string> = {}
    if (!item.trim()) e.item = 'Describe the evidence (logs, timestamps, files).'
    if (!loc.trim()) e.loc = 'Where is it preserved?'
    setErr(e)
    if (Object.keys(e).length) return
    const at = new Date().toISOString()
    write((x) => ({ ...x, evidence: [...x.evidence, { at, item: item.trim(), location: loc.trim(), by: actor() }] }), 'Evidence preserved', item.trim())
    setItem('')
    setLoc('')
    toast('Evidence recorded.')
  }

  return (
    <div className="space-y-4">
      <Section title="Access blocking" sub="Parameter 5 — block affected accounts, APIs or systems immediately.">
        <DataGrid
          rows={b.accessBlocks}
          rowKey={(a) => `${a.at}-${a.target}`}
          fileName={`${b.id}-access-blocks`}
          filters={[{ key: 'k', label: 'Kinds', get: (a) => a.kind, options: ['Account', 'API', 'System'] }]}
          cols={[
            { key: 'at', label: 'When', value: (a) => fmtDT(a.at), className: 'whitespace-nowrap text-muted' },
            { key: 'k', label: 'Kind', value: (a) => a.kind },
            { key: 't', label: 'Target', value: (a) => a.target, className: 'font-medium' },
            { key: 'by', label: 'By', value: (a) => a.by },
          ]}
          empty="Nothing blocked yet."
        />
        {!closed && (
          <div className="mt-4 grid items-start gap-3 sm:grid-cols-4">
            <SelectField label="Block" required options={['Account', 'API', 'System']} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} error={err.kind} />
            {kind === 'Account' ? (
              <SelectField className="sm:col-span-2" label="Account" required options={sec.accounts.filter((a) => a.status !== 'Blocked').map((a) => a.id)} placeholder="Select account ID" value={account} onChange={(e) => setAccount(e.target.value)} error={err.account} hint={account ? sec.accounts.find((a) => a.id === account)?.name : 'The account is blocked and signed out.'} />
            ) : (
              <TextField className="sm:col-span-2" label="API / system" required value={target} onChange={(e) => setTarget(e.target.value)} error={err.target} disabled={!kind} />
            )}
            <Button className="mt-6" variant="danger" onClick={block}>Block access</Button>
          </div>
        )}
      </Section>
      <Section title="Evidence preservation" sub="Parameter 6 — logs, timestamps and digital evidence.">
        <DataGrid
          rows={b.evidence}
          rowKey={(e) => `${e.at}-${e.item}`}
          fileName={`${b.id}-evidence`}
          filters={[{ key: 'by', label: 'Recorded by', get: (e) => e.by }]}
          cols={[
            { key: 'at', label: 'Preserved', value: (e) => fmtDT(e.at), className: 'whitespace-nowrap text-muted' },
            { key: 'i', label: 'Evidence', value: (e) => e.item, className: 'font-medium' },
            { key: 'l', label: 'Location', value: (e) => e.location },
            { key: 'by', label: 'By', value: (e) => e.by },
          ]}
          empty="No evidence recorded yet."
        />
        {!closed && (
          <div className="mt-4 grid items-start gap-3 sm:grid-cols-5">
            <TextField className="sm:col-span-2" label="Evidence" required value={item} onChange={(e) => setItem(e.target.value)} error={err.item} />
            <TextField className="sm:col-span-2" label="Stored at" required value={loc} onChange={(e) => setLoc(e.target.value)} error={err.loc} placeholder="Encrypted evidence vault / path" />
            <Button className="mt-6" variant="secondary" onClick={preserve}>Record evidence</Button>
          </div>
        )}
      </Section>
    </div>
  )
}

function Investigation({ b }: { b: Breach }) {
  const write = makeWriter(b)
  const closed = b.status === 'Closed'
  const [rootCause, setRootCause] = useState(b.rootCause ?? '')
  const [gap, setGap] = useState(b.securityGap ?? '')
  const [u, setU] = useState({ name: '', contact: '', dataTypes: '' })
  const [ca, setCa] = useState({ action: '', owner: '', due: '' })
  const [err, setErr] = useState<Record<string, string>>({})

  const saveRca = () => {
    const e: Record<string, string> = {}
    if (rootCause.trim().length < 10) e.rc = 'Describe the root cause.'
    if (!gap.trim()) e.gap = 'Name the security gap responsible.'
    setErr(e)
    if (Object.keys(e).length) return
    write((x) => ({ ...x, rootCause: rootCause.trim(), securityGap: gap.trim() }), 'Root cause recorded', gap.trim())
    toast('Root cause analysis saved.')
  }
  const addUser = () => {
    const e: Record<string, string> = {}
    if (!u.name.trim()) e.un = 'Name is required.'
    if (!u.contact.trim()) e.uc = 'Contact is required for notification.'
    setErr(e)
    if (Object.keys(e).length) return
    write((x) => ({ ...x, affectedUsers: [...x.affectedUsers, { name: u.name.trim(), contact: u.contact.trim(), dataTypes: u.dataTypes.trim() || x.dataTypes.join(', ') }] }), 'Affected user identified', u.name.trim())
    setU({ name: '', contact: '', dataTypes: '' })
  }
  const addAction = () => {
    const e: Record<string, string> = {}
    if (!ca.action.trim()) e.ca = 'Describe the corrective action.'
    if (!ca.owner.trim()) e.co = 'Owner is required.'
    if (!ca.due) e.cd = 'Due date is required.'
    setErr(e)
    if (Object.keys(e).length) return
    write((x) => ({ ...x, correctiveActions: [...x.correctiveActions, { id: shortId('CA'), action: ca.action.trim(), owner: ca.owner.trim(), due: ca.due, done: false }] }), 'Corrective action added', ca.action.trim())
    setCa({ action: '', owner: '', due: '' })
  }
  const toggleDone = (id: string, done: boolean) => write((x) => ({ ...x, correctiveActions: x.correctiveActions.map((c) => (c.id === id ? { ...c, done } : c)) }), done ? 'Corrective action completed' : 'Corrective action reopened', id)

  return (
    <div className="space-y-4">
      <Section title="Root cause analysis" sub="Parameter 7">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextAreaField label="Root cause" required value={rootCause} onChange={(e) => setRootCause(e.target.value)} error={err.rc} disabled={closed} />
          <TextAreaField label="Responsible security gap" required value={gap} onChange={(e) => setGap(e.target.value)} error={err.gap} disabled={closed} />
        </div>
        {!closed && <div className="mt-3 flex justify-end"><Button size="sm" onClick={saveRca}>Save analysis</Button></div>}
      </Section>
      <Section title={`Affected users (${b.affectedUsers.length})`} sub="Parameter 8">
        <DataGrid
          rows={b.affectedUsers}
          rowKey={(x) => `${x.name}-${x.contact}`}
          fileName={`${b.id}-affected-users`}
          filters={[{ key: 'd', label: 'Data types', get: (x) => x.dataTypes }]}
          cols={[
            { key: 'n', label: 'Name', value: (x) => x.name, className: 'font-medium' },
            { key: 'c', label: 'Contact', value: (x) => x.contact },
            { key: 'd', label: 'Data affected', value: (x) => x.dataTypes, className: 'text-muted' },
          ]}
          empty="No affected users identified yet."
        />
        {!closed && (
          <div className="mt-4 grid items-start gap-3 sm:grid-cols-4">
            <TextField label="Name" required value={u.name} onChange={(e) => setU({ ...u, name: e.target.value })} error={err.un} />
            <TextField label="Email / mobile" required value={u.contact} onChange={(e) => setU({ ...u, contact: e.target.value })} error={err.uc} />
            <TextField label="Data affected" value={u.dataTypes} onChange={(e) => setU({ ...u, dataTypes: e.target.value })} placeholder="Defaults to incident data types" />
            <Button className="mt-6" variant="secondary" onClick={addUser}>Add user</Button>
          </div>
        )}
      </Section>
      <Section title="Corrective actions" sub="Parameter 12">
        <DataGrid
          rows={b.correctiveActions}
          rowKey={(c) => c.id}
          fileName={`${b.id}-corrective-actions`}
          filters={[{ key: 's', label: 'States', get: (c) => (c.done ? 'Done' : 'Pending'), options: ['Pending', 'Done'] }]}
          cols={[
            { key: 'a', label: 'Action', value: (c) => c.action, className: 'font-medium' },
            { key: 'o', label: 'Owner', value: (c) => c.owner },
            { key: 'd', label: 'Due', value: (c) => c.due },
            { key: 's', label: 'State', value: (c) => (c.done ? 'Done' : 'Pending'), render: (c) => <Badge tone={c.done ? 'green' : 'amber'}>{c.done ? 'Done' : 'Pending'}</Badge> },
          ]}
          actions={closed ? undefined : (c) => <Button size="sm" variant="secondary" onClick={() => toggleDone(c.id, !c.done)}>{c.done ? 'Reopen' : 'Mark done'}</Button>}
          empty="No corrective actions yet."
        />
        {!closed && (
          <div className="mt-4 grid items-start gap-3 sm:grid-cols-5">
            <TextField className="sm:col-span-2" label="Corrective action" required value={ca.action} onChange={(e) => setCa({ ...ca, action: e.target.value })} error={err.ca} />
            <TextField label="Owner" required value={ca.owner} onChange={(e) => setCa({ ...ca, owner: e.target.value })} error={err.co} />
            <TextField label="Due date" required type="date" value={ca.due} onChange={(e) => setCa({ ...ca, due: e.target.value })} error={err.cd} />
            <Button className="mt-6" variant="secondary" onClick={addAction}>Add action</Button>
          </div>
        )}
      </Section>
    </div>
  )
}

function Notifications({ b }: { b: Breach }) {
  const write = makeWriter(b)
  const p = usePrivacy()
  const closed = b.status === 'Closed'
  const [channel, setChannel] = useState('')
  const [message, setMessage] = useState('')
  const [initRef, setInitRef] = useState('')
  const [detRef, setDetRef] = useState('')
  const [extUntil, setExtUntil] = useState('')
  const [extRef, setExtRef] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const by = actor

  const resendAlert = () => {
    const at = new Date().toISOString()
    write((x) => ({ ...x, alert: { at, recipients: p.settings.breachAlertRecipients, by: by() } }), 'Alert re-sent', p.settings.breachAlertRecipients.join(', '))
    toast('Alert re-sent to the security team and management.')
  }
  const notifyUsers = () => {
    const e: Record<string, string> = {}
    if (b.affectedUsers.length === 0) e.users = 'Identify the affected users first (Investigation tab).'
    if (!channel) e.channel = 'Choose a channel.'
    if (message.trim().length < 30) e.message = 'Describe the breach, its likely consequences, the mitigation and the contact person (min 30 characters).'
    setErr(e)
    if (Object.keys(e).length) return
    const at = new Date().toISOString()
    write((x) => ({ ...x, userNotification: { at, channel, count: x.affectedUsers.length, message: message.trim(), by: by() } }), 'Affected users notified', `${b.affectedUsers.length} user(s) via ${channel}`)
    toast(`${b.affectedUsers.length} affected user(s) notified.`)
  }
  const boardInitial = () => {
    if (!initRef.trim()) return setErr({ initRef: 'Enter the Board acknowledgement / reference number.' })
    setErr({})
    const at = new Date().toISOString()
    write((x) => ({ ...x, boardInitial: { at, ref: initRef.trim(), by: by() } }), 'Board — initial intimation sent', initRef.trim())
    toast('Initial intimation to the Data Protection Board recorded.')
  }
  const boardDetailed = () => {
    const e: Record<string, string> = {}
    if (!b.boardInitial) e.detRef = 'Send the initial intimation first.'
    else if (!b.rootCause) e.detRef = 'Record the root cause first (Investigation tab) — the detailed report must include it.'
    else if (!detRef.trim()) e.detRef = 'Enter the Board reference number.'
    setErr(e)
    if (Object.keys(e).length) return
    const at = new Date().toISOString()
    write((x) => ({ ...x, boardDetailed: { at, ref: detRef.trim(), by: by() } }), 'Board — detailed report sent', detRef.trim())
    toast('Detailed report to the Board recorded.')
  }
  const extension = () => {
    const e: Record<string, string> = {}
    if (!extUntil) e.extUntil = 'Enter the extended deadline.'
    if (!extRef.trim()) e.extRef = 'Enter the Board’s written approval reference.'
    setErr(e)
    if (Object.keys(e).length) return
    write((x) => ({ ...x, boardExtension: { until: new Date(extUntil).toISOString(), letterRef: extRef.trim() } }), 'Board extension recorded', `Until ${extUntil} — ${extRef.trim()}`)
    toast('Board extension recorded.')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Immediate alert" sub="Parameter 4" aside={!closed && <Button size="sm" variant="secondary" onClick={resendAlert}>Re-send</Button>}>
        <Row k="Sent" v={b.alert ? fmtDT(b.alert.at) : 'Not sent'} />
        <Row k="Recipients" v={b.alert?.recipients.join(', ')} />
      </Section>
      <Section title="Affected users" sub="Parameter 9 — without delay">
        {b.userNotification ? (
          <>
            <Row k="Notified" v={`${fmtDT(b.userNotification.at)} via ${b.userNotification.channel}`} />
            <Row k="Users" v={b.userNotification.count} />
            <Row k="Message" v={b.userNotification.message} />
          </>
        ) : closed ? (
          <p className="text-[12px] text-muted">Not notified.</p>
        ) : (
          <div className="space-y-3">
            {err.users && <Note tone="red">{err.users}</Note>}
            <SelectField label="Channel" required options={['Email', 'SMS', 'In-app', 'Email + SMS']} value={channel} onChange={(e) => setChannel(e.target.value)} error={err.channel} />
            <TextAreaField label="Notification text" required rows={3} value={message} onChange={(e) => setMessage(e.target.value)} error={err.message} />
            <div className="flex justify-end"><Button size="sm" onClick={notifyUsers}>Notify {b.affectedUsers.length} user(s)</Button></div>
          </div>
        )}
      </Section>
      <Section title="Data Protection Board — initial intimation" sub="Parameter 10 — without delay">
        {b.boardInitial ? (
          <Row k="Sent" v={`${fmtDT(b.boardInitial.at)} · ref ${b.boardInitial.ref} · by ${b.boardInitial.by}`} />
        ) : closed ? (
          <p className="text-[12px] text-muted">Not sent.</p>
        ) : (
          <div className="flex flex-wrap items-start gap-2">
            <TextField className="min-w-[200px] flex-1" label="Board reference" required value={initRef} onChange={(e) => setInitRef(e.target.value)} error={err.initRef} />
            <Button className="mt-6" size="sm" onClick={boardInitial}>Record intimation</Button>
          </div>
        )}
      </Section>
      <Section title={`Detailed report (${p.settings.breachDetailedReportHours} hours)`} sub="Parameter 11 — facts, circumstances, reasons, mitigation, findings about the person responsible, remedial measures, notifications made.">
        {b.boardDetailed ? (
          <Row k="Sent" v={`${fmtDT(b.boardDetailed.at)} · ref ${b.boardDetailed.ref} · by ${b.boardDetailed.by}`} />
        ) : closed ? (
          <p className="text-[12px] text-muted">Not sent.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-start gap-2">
              <TextField className="min-w-[200px] flex-1" label="Board reference" required value={detRef} onChange={(e) => setDetRef(e.target.value)} error={err.detRef} />
              <Button className="mt-6" size="sm" onClick={boardDetailed}>Record report</Button>
            </div>
            <div className="border-t border-line pt-3">
              <div className="mb-2 text-[11px] font-semibold text-ink">Board allowed more time in writing?</div>
              {b.boardExtension && <Note>Extension until {fmtDT(b.boardExtension.until)} (ref {b.boardExtension.letterRef}).</Note>}
              <div className="mt-2 grid items-start gap-2 sm:grid-cols-3">
                <TextField label="Extended until" required type="datetime-local" value={extUntil} onChange={(e) => setExtUntil(e.target.value)} error={err.extUntil} />
                <TextField label="Approval reference" required value={extRef} onChange={(e) => setExtRef(e.target.value)} error={err.extRef} />
                <Button className="mt-6" size="sm" variant="secondary" onClick={extension}>Record extension</Button>
              </div>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}

function Closure({ b }: { b: Breach }) {
  const write = makeWriter(b)
  const [summary, setSummary] = useState('')
  const [err, setErr] = useState('')
  const checks = [
    { label: 'Root cause analysis recorded', ok: !!b.rootCause },
    { label: 'Evidence preserved', ok: b.evidence.length > 0 },
    { label: 'Affected users notified (or none affected)', ok: !!b.userNotification || b.affectedUsers.length === 0 },
    { label: 'Board initial intimation sent', ok: !!b.boardInitial },
    { label: 'Board detailed report sent', ok: !!b.boardDetailed },
    { label: 'At least one corrective action, all completed', ok: b.correctiveActions.length > 0 && b.correctiveActions.every((c) => c.done) },
  ]
  if (b.closure)
    return (
      <Section title="Incident closed" sub={`${fmtDT(b.closure.at)} by ${b.closure.by}`}>
        <p className="text-[12.5px] text-ink">{b.closure.summary}</p>
      </Section>
    )
  const close = () => {
    const missing = checks.filter((c) => !c.ok)
    if (missing.length) return setErr(`Cannot close yet — pending: ${missing.map((m) => m.label).join('; ')}.`)
    if (summary.trim().length < 20) return setErr('Write the closure summary (investigation, notifications and remedial actions — min 20 characters).')
    setErr('')
    const at = new Date().toISOString()
    write((x) => ({ ...x, status: 'Closed', closure: { at, by: actor(), summary: summary.trim() } }), 'Incident closed', summary.trim())
    toast(`Incident ${b.id} closed.`)
  }
  return (
    <Section title="Close incident" sub="Parameter 13 — investigation, notifications and remedial actions must be on record.">
      <ul className="mb-4 space-y-1.5 text-[12.5px]">
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? 'text-emerald-700' : 'text-muted'}>
            {c.ok ? '✓' : '○'} {c.label}
          </li>
        ))}
      </ul>
      <TextAreaField label="Closure summary" required rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
      {err && <p className="mt-2 text-[11.5px] text-brand-red">{err}</p>}
      <div className="mt-3 flex justify-end">
        <Button onClick={close}>Close incident</Button>
      </div>
    </Section>
  )
}
