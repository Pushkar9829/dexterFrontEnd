import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Server, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import {
  ATM_MASTER,
  NETWORK_ATM_COUNT,
  REPLACEMENT_GROUPS,
  RECURRING_LABEL,
  atmById,
  complaintStore,
  downtimeHours,
  fmtDT,
  fmtDate,
  fmtDay,
  fmtDur,
  isOpen,
  ist,
  istDay,
  maintenanceStore,
  nextTaskId,
  repeatOf,
  statusLabel,
  type Atm,
  type Complaint,
} from '@/data/complaints'
import { recStore } from '@/data/complaintsAi'
import { BarRow, CHART, ComplaintsShell, GridCard, KV, Kpi, LinkBtn, Panel, Entry, ViewAll, BASE, useNow } from './shared'
import { FilterBar, filterStore } from './FilterBar'
import { daysBetween, matches, priorRange, shortRange } from './filters'

type Health = 'Healthy' | 'Degraded' | 'Down'
const healthTone = (h: Health) => (h === 'Down' ? 'red' : h === 'Degraded' ? 'amber' : 'green')

const PM_TASK: Record<string, string> = {
  'Power & UPS': 'Inspect UPS charging circuit & battery health',
  Network: 'Run link stability diagnostics & swap SIM',
  'Cash dispenser': 'Service dispenser module & pick belts',
  'Card reader': 'Clean & recalibrate card reader',
  'Receipt printer': 'Replace printer head & stock paper',
  'Cooling & environment': 'Clean filters & test cooling fans',
  'Software & EJ': 'Patch application & verify EJ upload',
}
const PM_HEAD: Record<string, string> = {
  'Power & UPS': 'Investigate charging faults before another replacement',
  Network: 'Stabilise the network link before the next outage',
  'Cash dispenser': 'Service the dispenser before the next jam',
  'Card reader': 'Recalibrate the card reader before replacing it',
  'Receipt printer': 'Service the printer before replacing the head',
  'Cooling & environment': 'Restore cooling before peak load',
  'Software & EJ': 'Patch software before the next EJ failure',
}
const watchText = (cat: string, days: number) =>
  cat === 'Power & UPS'
    ? `Battery recurrence in ${days} days`
    : cat === 'Cash dispenser'
      ? 'Repeated dispenser jams'
      : cat === 'Network'
        ? 'Intermittent network faults'
        : `${RECURRING_LABEL[cat] ?? cat} recurrence in ${days} days`
const COMPONENT_SHORT: Record<string, string> = {
  'Power & UPS': 'UPS battery',
  Network: 'Router',
  'Cash dispenser': 'Dispenser',
  'Card reader': 'Card reader',
  'Receipt printer': 'Printer',
  'Cooling & environment': 'Cooling',
  'Software & EJ': 'Software',
}
const REPL_SHORT: Record<string, string> = {
  'UPS batteries': 'battery',
  'Card readers': 'card reader',
  'Receipt printers': 'printer',
  'Dispenser modules': 'module',
  'Cooling fans': 'fan',
  Routers: 'router',
}

export function healthOf(atmId: string, all: Complaint[]): Health {
  const open = all.filter((c) => c.atmId === atmId && isOpen(c))
  if (open.some((c) => c.impact === 'Down')) return 'Down'
  if (open.length) return 'Degraded'
  return 'Healthy'
}

type Row = { atm: Atm; cases: Complaint[]; repeats: Complaint[]; repl: string[]; downtime: number; health: Health; topCat: string; score: number }

export default function AssetDashboard() {
  const all = complaintStore.use()
  const maint = maintenanceStore.use()
  const recs = recStore.use()
  const filter = filterStore.use()
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const selected = params.get('atm')
  const [showAllWatch, setShowAllWatch] = useState(false)
  const [registerAll, setRegisterAll] = useState(false)
  const [modal, setModal] = useState<{ atmId: string; title: string } | null>(null)

  const d = useMemo(() => {
    const period = all.filter((c) => matches(c, filter))
    const health = new Map(ATM_MASTER.map((a) => [a.atmId, healthOf(a.atmId, all)]))
    const down = [...health.values()].filter((h) => h === 'Down').length
    const degraded = [...health.values()].filter((h) => h === 'Degraded').length
    const healthy = NETWORK_ATM_COUNT - down - degraded
    const repeats = period.filter((c) => repeatOf(c, all))
    const repl = period.filter((c) => c.replacement)
    const downtime = period.reduce((s, c) => s + downtimeHours(c, now), 0)
    const prior = all.filter((c) => matches(c, { ...filter, ...priorRange(filter) })).reduce((s, c) => s + downtimeHours(c, now), 0)

    const rows: Row[] = [...new Set(period.map((c) => c.atmId))].map((id) => {
      const cases = period.filter((c) => c.atmId === id)
      const rp = cases.filter((c) => repeatOf(c, all))
      const cats: Record<string, number> = {}
      cases.forEach((c) => (cats[c.category] = (cats[c.category] ?? 0) + 1))
      const topCat = cases.find(isOpen)?.category ?? Object.entries(cats).sort((a, b) => b[1] - a[1])[0][0]
      const dt = cases.reduce((s, c) => s + downtimeHours(c, now), 0)
      const h = health.get(id) ?? 'Healthy'
      return {
        atm: atmById(id)!,
        cases,
        repeats: rp,
        repl: cases.filter((c) => c.replacement).map((c) => c.replacement!),
        downtime: dt,
        health: h,
        topCat,
        score: rp.length * 3 + cases.length + dt / 12 + (h === 'Down' ? 2 : h === 'Degraded' ? 1 : 0),
      }
    })
    rows.sort((a, b) => b.score - a.score)

    const days = daysBetween(filter.from, filter.to)
    const trend = days.map((day) => ({
      day: fmtDay(`${day}T12:00:00+05:30`),
      'Downtime hours': Math.round(period.filter((c) => istDay(c.receivedAt) === day).reduce((s, c) => s + downtimeHours(c, now), 0) * 10) / 10,
    }))
    const replData = REPLACEMENT_GROUPS.map((g) => ({ name: g, value: repl.filter((c) => c.replacement === g).length })).filter((x) => x.value > 0)

    return { period, health, down, degraded, healthy, repeats, repl, downtime, prior, rows, trend, replData }
  }, [all, filter, now])

  const repeatAtms = d.rows.filter((r) => r.repeats.length > 0)
  const batteries = d.repl.filter((c) => c.replacement === 'UPS batteries').length
  const pct = (n: number) => `${((n / NETWORK_ATM_COUNT) * 100).toFixed(1)}%`
  const taskFor = (atmId: string) => maint.filter((m) => m.atmId === atmId).at(-1)

  const createTask = (atmId: string, title: string, owner: string, due: string) => {
    const id = nextTaskId(recs.flatMap((r) => (r.taskId ? [r.taskId] : [])))
    maintenanceStore.set((xs) => [...xs, { id, atmId, title, owner, due, createdAt: new Date(now).toISOString(), source: 'Asset Dashboard · Preventive maintenance' }])
    toast(`${id} created · ${title} (${atmId})`)
  }

  const cols: GridColumn<Row>[] = [
    { key: 'atm', header: 'ATM ID', width: 120, sortable: true, value: (r) => r.atm.atmId, render: (r) => <LinkBtn onClick={() => setParams({ atm: r.atm.atmId })}>{r.atm.atmId}</LinkBtn> },
    { key: 'site', header: 'Site / component context', width: 240, value: (r) => `${r.atm.siteId} · ${r.atm.city} · ${COMPONENT_SHORT[r.topCat]}` },
    { key: 'cases', header: 'Cases / repeats', width: 120, sortable: true, value: (r) => r.cases.length, render: (r) => `${r.cases.length} / ${r.repeats.length}` },
    {
      key: 'repl',
      header: 'Replacements',
      width: 130,
      value: (r) => (r.repl.length ? r.repl.map((x) => `1 ${REPL_SHORT[x]}`).join(', ') : 'None'),
    },
    { key: 'downtime', header: 'Downtime', width: 110, sortable: true, value: (r) => Math.round(r.downtime * 60), render: (r) => (r.downtime ? fmtDur(r.downtime * 3_600_000) : '—') },
    { key: 'health', header: 'Health', width: 110, sortable: true, filterable: true, value: (r) => r.health },
  ]

  const pmTop = d.rows[0] as Row | undefined
  const pmLinked = pmTop && ([...pmTop.cases].filter(isOpen).sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))[0] ?? pmTop.cases[0])
  const pmTask = pmTop && taskFor(pmTop.atm.atmId)
  const pmBody = (r: Row) =>
    r.topCat === 'Power & UPS'
      ? `${r.atm.atmId} has ${r.repl.length ? 'a recent battery replacement and ' : ''}a new power complaint. Validate charging voltage, wiring and load before accepting a new battery.`
      : `${r.atm.atmId} has ${r.cases.length} complaint${r.cases.length === 1 ? '' : 's'} and ${r.repeats.length} repeat${r.repeats.length === 1 ? '' : 's'} on the ${COMPONENT_SHORT[r.topCat].toLowerCase()} this period. ${PM_TASK[r.topCat]} before approving another replacement.`

  const sel = selected ? atmById(selected) : undefined
  const selComplaints = sel ? all.filter((c) => c.atmId === sel.atmId).sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt)) : []

  const exportRegister = () =>
    downloadCsv(
      'atm-health-register',
      ['ATM ID', 'Site ID', 'City', 'State', 'Model', 'Cases', 'Repeats', 'Replacements', 'Downtime (h)', 'Health'],
      d.rows.map((r) => [r.atm.atmId, r.atm.siteId, r.atm.city, r.atm.state, r.atm.model, String(r.cases.length), String(r.repeats.length), r.repl.join('; ') || 'None', r.downtime.toFixed(1), r.health]),
    )

  return (
    <ComplaintsShell title="Asset Dashboard" sub="Connect service complaints to ATM health, repeat faults and replacement history." onExport={exportRegister}>
      <FilterBar value={filter} onChange={filterStore.set} summary={`${d.period.length} complaints received in period · ${d.period.filter(isOpen).length} currently open`} />

      {sel && (
        <Panel
          className="mb-5 border-primary/40"
          icon={<Server size={18} />}
          title={`Asset record · ${sel.atmId}`}
          sub={`${sel.model} · ${sel.serial} · Installed ${sel.installed}`}
          action={
            <button type="button" onClick={() => setParams({})} aria-label="Close asset record" className="grid h-8 w-8 place-items-center rounded-md bg-surface text-ink-2">
              <X size={16} />
            </button>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-[13px] text-ink-2">
              <p className="py-0.5">Site · {sel.siteId} · {sel.siteName}</p>
              <p className="py-0.5">Franchise · {sel.franchise}</p>
              <p className="py-0.5">Project · {sel.project} · {sel.projectId}</p>
              <p className="py-0.5">Engineer · {sel.engineer} · {sel.engineerPhone}</p>
              <p className="py-0.5">Battery · {sel.battery}</p>
              <p className="py-0.5">
                Health · <Badge tone={healthTone(d.health.get(sel.atmId) ?? 'Healthy')}>{d.health.get(sel.atmId)}</Badge>
              </p>
            </div>
            <div className="md:col-span-2">
              <div className="mb-1 text-[12px] font-semibold text-ink">Complaint history ({selComplaints.length})</div>
              {selComplaints.slice(0, 6).map((c) => (
                <Entry
                  key={c.id}
                  title={
                    <>
                      <Link to={`${BASE}/${c.id}`} className="font-medium text-primary hover:underline">
                        {c.id}
                      </Link>{' '}
                      · {fmtDate(c.receivedAt)} · {c.subcategory}
                    </>
                  }
                  status={statusLabel(c)}
                  tone={c.status === 'Closed' ? 'green' : 'blue'}
                  meta={c.status === 'Closed' ? `${c.outcomeRemark || 'Resolved'} · ${(c.downtimeH ?? 0).toFixed(1)}h downtime` : c.lastAction}
                />
              ))}
              {maint.filter((m) => m.atmId === sel.atmId).map((m) => (
                <Entry key={m.id} title={`${m.id} · ${m.title}`} status="Maintenance task" tone="purple" meta={`${m.owner} · Due ${fmtDT(m.due)}`} />
              ))}
            </div>
          </div>
        </Panel>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="ATMs in network" value={NETWORK_ATM_COUNT.toLocaleString('en-IN')} caption="Active commissioned assets" />
        <Kpi label="ATMs with complaints" value={d.rows.length} caption={`${d.period.length} complaints · ${d.rows.length ? (d.period.length / d.rows.length).toFixed(2) : '0'} per affected ATM`} />
        <Kpi label="Repeat-failure ATMs" value={repeatAtms.length} tone={repeatAtms.length ? 'red' : undefined} caption={`${d.repeats.length} repeat complaints in last 30 days`} />
        <Kpi label="Replacements" value={d.repl.length} caption={`${batteries} batteries · ${d.repl.length - batteries} other components`} />
        <Kpi
          label="Network downtime"
          value={`${Math.round(d.downtime)}h`}
          caption={`${shortRange(filter)} · ${d.downtime - d.prior <= 0 ? '↓' : '↑'} ${Math.abs(Math.round(d.downtime - d.prior))}h vs prior period`}
        />
        <Kpi label="Healthy assets" value={pct(d.healthy)} tone="green" caption={`${d.healthy.toLocaleString('en-IN')} healthy · ${d.degraded} degraded · ${d.down} down`} />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Panel title="Downtime trend" sub="Total hours across affected ATMs · Daily">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] text-primary">
            <span className="h-2 w-2 bg-primary" /> Downtime hours
          </p>
          <div className="h-[200px]">
            <ResponsiveContainer>
              <BarChart data={d.trend} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: CHART.muted }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#f6f8fc' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="Downtime hours" fill={CHART.navy} radius={[3, 3, 0, 0]} maxBarSize={22}>
                  <LabelList dataKey="Downtime hours" position="top" formatter={(v) => Math.round(Number(v))} style={{ fontSize: 11, fill: CHART.navy }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-muted">{Math.round(d.downtime)} hours in period · Daily total includes all incidents.</p>
        </Panel>
        <Panel title="Component replacements" sub={`${d.repl.length} replacements completed · ${shortRange(filter)}`}>
          {d.replData.length === 0 && <p className="text-[12px] text-muted">No replacements in this period.</p>}
          {[...d.replData]
            .sort((x, y) => y.value - x.value)
            .slice(0, 5)
            .map((x, _i, arr) => (
              <BarRow key={x.name} label={x.name} value={x.value} max={arr[0].value} />
            ))}
        </Panel>
        <Panel title="Asset health" sub={`Network snapshot · ${fmtDT(now)}`}>
          <KV k="Healthy">
            {d.healthy.toLocaleString('en-IN')} assets · {pct(d.healthy)}
          </KV>
          <KV k="Degraded">
            {d.degraded} assets · {pct(d.degraded)}
          </KV>
          <KV k="Down">
            {d.down} assets · {pct(d.down)}
          </KV>
          {d.down > 0 && <p className="mt-3 inline-block rounded bg-red-50 px-2 py-1 text-[12px] font-medium text-brand-red">{d.down} assets need restoration</p>}
          <p className="mt-3 text-[11px] text-muted">Health combines heartbeat, open faults and engineer validation. Percentages are rounded.</p>
        </Panel>
      </div>

      <GridCard
        title="ATM health & complaint register"
        sub={`${d.rows.filter((r) => r.health !== 'Healthy' || r.repeats.length).length} assets requiring review · Period complaints / 30-day repeats`}
        onExport={exportRegister}
        viewAll={d.rows.length > 6 && <ViewAll label={registerAll ? 'Show fewer' : 'View all'} onClick={() => setRegisterAll((x) => !x)} />}
        footer={`Showing ${registerAll ? d.rows.length : Math.min(6, d.rows.length)} priority records`}
      >
        <ExcelGrid
          key={registerAll ? 'all' : 'top'}
          title="ATM health & complaint register"
          hideToolbar
          hidePagination={!registerAll}
          rows={registerAll ? d.rows : d.rows.slice(0, 6)}
          columns={cols}
          rowId={(r) => r.atm.atmId}
          rowNumbers={false}
          pageSize={registerAll ? 25 : 6}
          noun="assets"
        />
      </GridCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Repeat-failure watchlist" action={repeatAtms.length > 3 && <ViewAll label={showAllWatch ? 'Show fewer' : `View all ${repeatAtms.length}`} onClick={() => setShowAllWatch((s) => !s)} />}>
          {repeatAtms.length === 0 && <p className="text-[12px] text-muted">No repeat failures in this period.</p>}
          {(showAllWatch ? repeatAtms : repeatAtms.slice(0, 3)).map((r) => {
            const c = [...r.repeats].sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))[0]
            const prev = repeatOf(c, all)!
            const days = Math.round((Date.parse(c.receivedAt) - Date.parse(prev.receivedAt)) / 86_400_000)
            return (
              <Entry
                key={r.atm.atmId}
                title={
                  <>
                    <button type="button" onClick={() => setParams({ atm: r.atm.atmId })} className="hover:text-primary hover:underline">
                      {r.atm.atmId}
                    </button>
                    <span className="mx-1.5 text-muted">·</span>
                    <Link to={`${BASE}/${c.id}`} className="hover:text-primary">
                      {c.id}
                    </Link>{' '}
                    /{' '}
                    <Link to={`${BASE}/${prev.id}`} className="hover:text-primary">
                      {prev.id}
                    </Link>{' '}
                    · {watchText(c.category, days)}
                  </>
                }
              />
            )
          })}
        </Panel>
        <Panel
          title="Preventive maintenance priorities"
          action={<LinkBtn onClick={() => setModal({ atmId: pmTop?.atm.atmId ?? ATM_MASTER[0].atmId, title: pmTop ? PM_TASK[pmTop.topCat] : '' })}>Create maintenance task</LinkBtn>}
        >
          {!pmTop && <p className="text-[12px] text-muted">No assets need preventive maintenance in this period.</p>}
          {pmTop && (
            <>
              <p className="text-[13px] font-semibold text-ink">{PM_HEAD[pmTop.topCat] ?? PM_TASK[pmTop.topCat]}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{pmBody(pmTop)}</p>
              <p className="mt-3 text-[12px] text-primary">
                {pmLinked && (
                  <>
                    <Link to={`${BASE}/${pmLinked.id}`} className="hover:underline">
                      Linked complaint: {pmLinked.id}
                    </Link>
                    {' · '}
                  </>
                )}
                <button type="button" onClick={() => setParams({ atm: pmTop.atm.atmId })} className="hover:underline">
                  Engineer: {pmTop.atm.engineer}
                </button>
              </p>
              {pmTask && (
                <p className="mt-2 text-[12px] text-emerald-700">
                  {pmTask.id} created · {pmTask.title}
                </p>
              )}
            </>
          )}
          {maint.length > 0 && <p className="mt-2 text-[12px] text-muted">{maint.length} preventive task{maint.length > 1 ? 's' : ''} created · visible in each asset record.</p>}
        </Panel>
      </div>

      {modal && <MaintenanceModal init={modal} onClose={() => setModal(null)} onCreate={createTask} />}
    </ComplaintsShell>
  )
}

function MaintenanceModal({ init, onClose, onCreate }: { init: { atmId: string; title: string }; onClose: () => void; onCreate: (atmId: string, title: string, owner: string, due: string) => void }) {
  const [atmId, setAtm] = useState(init.atmId)
  const atm = atmById(atmId)
  const [title, setTitle] = useState(init.title)
  const [owner, setOwner] = useState(atm?.engineer ?? '')
  const [due, setDue] = useState('2026-10-09')
  const [tried, setTried] = useState(false)
  const owners = [...new Set(ATM_MASTER.map((a) => a.engineer))]
  const ok = atmId && title.trim() && owner && due
  return (
    <Modal
      title="Create maintenance task"
      sub="Preventive task linked to the asset record and task management."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setTried(true)
              if (!ok) return
              onCreate(atmId, title.trim(), owner, ist(due, '10:00'))
              onClose()
            }}
          >
            Create task
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <SelectField
          label="ATM ID"
          required
          options={ATM_MASTER.map((a) => a.atmId)}
          value={atmId}
          onChange={(e) => {
            setAtm(e.target.value)
            setOwner(atmById(e.target.value)?.engineer ?? '')
          }}
          error={tried && !atmId ? 'Select an ATM' : undefined}
          hint={atm ? `${atm.siteId} · ${atm.siteName}` : undefined}
        />
        <TextField label="Task" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Inspect UPS charging circuit" error={tried && !title.trim() ? 'Enter the task' : undefined} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Owner" required options={owners} value={owner} onChange={(e) => setOwner(e.target.value)} error={tried && !owner ? 'Select an owner' : undefined} />
          <TextField label="Due date" required type="date" value={due} onChange={(e) => setDue(e.target.value)} error={tried && !due ? 'Select a date' : undefined} />
        </div>
      </div>
    </Modal>
  )
}
