import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import {
  OWNERS,
  RECURRING_LABEL,
  atmById,
  complaintStore,
  fmtDT,
  fmtDay,
  fmtDur,
  fmtHours,
  isOpen,
  istDay,
  repeatOf,
  sla,
  statusLabel,
  tatHours,
  updateComplaint,
  type Complaint,
} from '@/data/complaints'
import { BarRow, Banner, CHART, Chip, ComplaintsShell, GridCard, Kpi, Panel, PriorityBadge, SlaText, StatusBadge, ViewAll, BASE, useNow } from './shared'
import { FilterBar, filterStore } from './FilterBar'
import { daysBetween, matches, percentile, priorRange, shortRange, stateOf } from './filters'

type Quick = 'All' | 'Open' | 'Priority' | 'Critical' | 'At risk' | 'Breached' | 'Escalated' | 'Closed'
const QUICK: Quick[] = ['All', 'Open', 'Priority', 'Critical', 'At risk', 'Breached', 'Escalated', 'Closed']

export const complaintCsv = (name: string, rows: Complaint[], now: number) =>
  downloadCsv(
    name,
    ['Complaint ID', 'Received', 'ATM ID', 'Site', 'State', 'Category', 'Subcategory', 'Priority', 'Owner', 'Department', 'SLA', 'Escalation', 'Status', 'Docket'],
    rows.map((c) => {
      const a = atmById(c.atmId)
      return [c.id, fmtDT(c.receivedAt), c.atmId, a?.siteId ?? '', stateOf(c), c.category, c.subcategory, c.priority, c.owner, c.department, sla(c, now).label, `L${c.escalationLevel}`, statusLabel(c), c.docket]
    }),
  )

export default function ManagementDashboard() {
  const all = complaintStore.use()
  const filter = filterStore.use()
  const now = useNow()
  const [quick, setQuick] = useState<Quick>('All')
  const [bulkOwner, setBulkOwner] = useState('')
  const gridRef = useRef<HTMLDivElement>(null)

  const d = useMemo(() => {
    const period = all.filter((c) => matches(c, filter))
    const open = period.filter(isOpen)
    const closed = period.filter((c) => c.status === 'Closed')
    const slas = new Map(period.map((c) => [c.id, sla(c, now)]))
    const breached = open.filter((c) => slas.get(c.id)!.breached)
    const atRisk = open.filter((c) => slas.get(c.id)!.atRisk)
    const pending = open.filter((c) => statusLabel(c) === 'Pending')
    const esc = open.filter((c) => c.escalationLevel >= 2)
    const tats = closed.map(tatHours)
    const avgTat = tats.length ? tats.reduce((a, b) => a + b, 0) / tats.length : 0
    const prior = priorRange(filter)
    const priorClosed = all.filter((c) => c.status === 'Closed' && matches(c, { ...filter, ...prior }))
    const priorAvg = priorClosed.length ? priorClosed.map(tatHours).reduce((a, b) => a + b, 0) / priorClosed.length : null
    const within = closed.filter((c) => slas.get(c.id)!.met).length

    const days = daysBetween(filter.from, filter.to)
    const daily = days.map((day) => ({
      day: fmtDay(`${day}T12:00:00+05:30`),
      Received: period.filter((c) => istDay(c.receivedAt) === day).length,
      Closed: closed.filter((c) => c.closedAt && istDay(c.closedAt) === day).length,
    }))

    const byState: Record<string, number> = {}
    open.forEach((c) => (byState[stateOf(c)] = (byState[stateOf(c)] ?? 0) + 1))
    const stateRows = Object.entries(byState).sort((a, b) => b[1] - a[1])
    const topStates = stateRows.slice(0, 4)
    const other = stateRows.slice(4).reduce((s, [, n]) => s + n, 0)

    const repeats = period.filter((c) => repeatOf(c, all))
    const byCat: Record<string, number> = {}
    repeats.forEach((c) => (byCat[c.category] = (byCat[c.category] ?? 0) + 1))
    const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1])

    const priority = open
      .filter((c) => c.priority === 'Critical' || slas.get(c.id)!.breached || slas.get(c.id)!.atRisk)
      .sort((a, b) => slas.get(a.id)!.remaining - slas.get(b.id)!.remaining)

    const escAt = (c: Complaint) => Date.parse(c.escalations.filter((e) => e.level === c.escalationLevel).at(-1)?.at ?? c.receivedAt)
    const oldest = (lvl: number) => esc.filter((c) => c.escalationLevel === lvl).sort((a, b) => escAt(a) - escAt(b))[0]

    return { period, open, closed, slas, breached, atRisk, pending, esc, avgTat, priorAvg, priorClosed, tats, within, daily, topStates, other, repeats, catRows, priority, escAt, oldest }
  }, [all, filter, now])

  const quickRows = useMemo(() => {
    const s = (c: Complaint) => d.slas.get(c.id)!
    switch (quick) {
      case 'Open':
        return d.open
      case 'Priority':
        return d.priority
      case 'Critical':
        return d.period.filter((c) => c.priority === 'Critical')
      case 'At risk':
        return d.open.filter((c) => s(c).atRisk)
      case 'Breached':
        return d.open.filter((c) => s(c).breached)
      case 'Escalated':
        return d.esc
      case 'Closed':
        return d.closed
      default:
        return d.period
    }
  }, [quick, d])

  const goGrid = (q: Quick) => {
    setQuick(q)
    setTimeout(() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—')
  const breachedL3 = d.breached.filter((c) => c.escalationLevel === 3).length
  const powerShare = d.repeats.length ? Math.round(((d.repeats.filter((c) => c.category === 'Power & UPS').length) / d.repeats.length) * 100) : 0
  const tatDiff = d.priorAvg == null ? null : d.avgTat - d.priorAvg

  const priorityCols: GridColumn<Complaint>[] = [
    { key: 'id', header: 'Complaint ID', width: 120, render: (c) => <Link to={`${BASE}/${c.id}`} className="font-medium text-primary hover:underline">{c.id}</Link> },
    { key: 'issue', header: 'Issue / ATM', width: 520, value: (c) => `${c.subcategory} · ${c.atmId}` },
    { key: 'priority', header: 'Priority', width: 100 },
    { key: 'owner', header: 'Owner', width: 140 },
    { key: 'sla', header: 'SLA / next step', width: 150, value: (c) => d.slas.get(c.id)!.label },
    { key: 'status', header: 'Status', width: 100, value: statusLabel },
  ]

  const allCols: GridColumn<Complaint>[] = [
    { key: 'id', header: 'Complaint ID', width: 120, sortable: true, pinned: true, render: (c) => <Link to={`${BASE}/${c.id}`} className="font-medium text-primary hover:underline">{c.id}</Link> },
    { key: 'receivedAt', header: 'Received', width: 120, sortable: true, value: (c) => c.receivedAt, render: (c) => fmtDT(c.receivedAt) },
    { key: 'atmId', header: 'ATM ID', width: 120, sortable: true, filterable: true },
    { key: 'site', header: 'Site', width: 170, value: (c) => atmById(c.atmId)?.siteName ?? '' },
    { key: 'state', header: 'State', width: 130, sortable: true, filterable: true, value: stateOf },
    { key: 'category', header: 'Category', width: 150, sortable: true, filterable: true },
    { key: 'subcategory', header: 'Subcategory', width: 150, filterable: true },
    { key: 'priority', header: 'Priority', width: 100, sortable: true, filterable: true, value: (c) => c.priority, render: (c) => <PriorityBadge p={c.priority} /> },
    { key: 'owner', header: 'Owner', width: 130, sortable: true, filterable: true },
    { key: 'department', header: 'Department', width: 150, filterable: true },
    { key: 'sla', header: 'SLA', width: 150, sortable: true, value: (c) => d.slas.get(c.id)!.label, render: (c) => <SlaText c={c} now={now} /> },
    { key: 'esc', header: 'Escalation', width: 100, value: (c) => (c.status === 'Open' && c.escalationLevel > 1 ? `L${c.escalationLevel}` : '—'), render: (c) => (c.status === 'Open' && c.escalationLevel > 1 ? <Badge tone={c.escalationLevel === 3 ? 'red' : 'amber'}>L{c.escalationLevel}</Badge> : <span className="text-muted">—</span>) },
    { key: 'status', header: 'Status', width: 100, sortable: true, filterable: true, value: statusLabel, render: (c) => <StatusBadge c={c} /> },
  ]

  return (
    <ComplaintsShell title="Management Dashboard" sub="Complaint performance, service exposure and priorities across India operations." onExport={() => complaintCsv('complaints-management', d.period, now)}>
      <FilterBar value={filter} onChange={filterStore.set} summary={`${d.period.length} complaints received in period · ${d.open.length} currently open`} />

      <div className="mb-5 grid grid-cols-2 items-start gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Total complaints" value={d.period.length} caption={`${shortRange(filter)} · ${d.closed.length} closed (${pct(d.closed.length, d.period.length)})`} />
        <Kpi label="Open complaints" value={d.open.length} caption={`${d.open.length - d.pending.length} active · ${d.pending.length} pending dependencies`} />
        <Kpi label="Critical complaints" value={d.open.filter((c) => c.priority === 'Critical').length} tone="red" caption={`Subset of ${d.open.length} open complaints`} />
        <Kpi label="SLA at risk / breached" value={`${d.atRisk.length} / ${d.breached.length}`} tone="red" caption="At risk and breached are separate" />
        <Kpi label="Active escalations" value={d.esc.length} caption={`${d.esc.filter((c) => c.escalationLevel === 2).length} at L2 · ${d.esc.filter((c) => c.escalationLevel === 3).length} at L3`} />
        <Kpi
          label="Average TAT"
          value={d.closed.length ? fmtHours(d.avgTat) : '—'}
          caption={`${d.closed.length} closures${tatDiff == null ? '' : ` · ${tatDiff <= 0 ? '↓' : '↑'} ${Math.abs(tatDiff).toFixed(1)}h vs prior period`}`}
        />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Panel title="Received vs. closed" sub={`Daily complaint volume · ${shortRange(filter)} ${filter.to.slice(0, 4)}`}>
          <div className="mb-2 flex gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="h-2 w-2 bg-primary" /> Received · {d.period.length}
            </span>
            <span className="flex items-center gap-1.5" style={{ color: CHART.green }}>
              <span className="h-2 w-2" style={{ background: CHART.green }} /> Closed · {d.daily.reduce((s, x) => s + x.Closed, 0)}
            </span>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer>
              <BarChart data={d.daily} margin={{ top: 18, right: 4, left: 4, bottom: 0 }} barGap={4}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: CHART.muted }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#f6f8fc' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="Received" fill={CHART.navy} radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false}>
                  <LabelList dataKey="Received" position="top" style={{ fontSize: 10, fill: CHART.navy }} />
                </Bar>
                <Bar dataKey="Closed" fill={CHART.green} radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-muted">{d.open.length} complaints remain open from this reporting cohort.</p>
        </Panel>

        <Panel title="Open complaints by state" sub={`${d.open.length} open · All priorities`}>
          {d.topStates.length === 0 && <p className="text-[12px] text-muted">No open complaints for this filter.</p>}
          {d.topStates.map(([s, n]) => (
            <BarRow key={s} label={s} value={n} max={d.topStates[0][1]} />
          ))}
          {d.other > 0 && <BarRow label="Other states" value={d.other} max={d.topStates[0][1]} />}
        </Panel>

        <Panel title="Recurring issues" sub={`${d.repeats.length} repeat complaints · Same ATM / category within 30 days`}>
          {d.catRows.length === 0 && <p className="text-[12px] text-muted">No repeat complaints for this filter.</p>}
          {d.catRows.slice(0, 4).map(([cat, n]) => (
            <BarRow key={cat} label={RECURRING_LABEL[cat] ?? cat} value={n} max={d.catRows[0][1]} />
          ))}
          {d.repeats.length > 0 && powerShare > 0 && (
            <p className="mt-2 text-[11px] leading-4 text-amber-700">{powerShare}% of repeats involve power backup. Review the battery replacement process.</p>
          )}
        </Panel>
      </div>

      {d.breached.length > 0 ? (
        <Banner
          lead={`${d.breached.length} SLA breach${d.breached.length > 1 ? 'es' : ''}`}
          action={
            <button type="button" onClick={() => goGrid('Breached')} className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
              Review breaches <ArrowRight size={13} />
            </button>
          }
        >
          {breachedL3} breach{breachedL3 === 1 ? ' has' : 'es have'} reached L3. Assign an accountable owner and confirm restoration ETAs before the 11:00 review.
        </Banner>
      ) : (
        <Banner tone="blue" lead="No SLA breaches">
          All open complaints in this filter are within their resolution SLA.
        </Banner>
      )}

      <GridCard
        title="Priority complaints"
        sub="Critical and SLA-exposed complaints"
        onExport={() => complaintCsv('priority-complaints', d.priority, now)}
        viewAll={<ViewAll onClick={() => goGrid('Priority')} />}
        footer={`Showing ${Math.min(6, d.priority.length)} priority records`}
      >
        <ExcelGrid title="Priority complaints" hideToolbar hidePagination rowNumbers={false} rows={d.priority.slice(0, 6)} columns={priorityCols} rowId={(c) => c.id} pageSize={6} noun="priority records" emptyState="No critical or SLA-exposed complaints." />
      </GridCard>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Escalation load">
          {[2, 3].map((lvl) => {
            const o = d.oldest(lvl)
            const n = d.esc.filter((c) => c.escalationLevel === lvl).length
            return (
              <p key={lvl} className="py-1 text-[12px] leading-[17px] text-ink-2">
                <span className="text-ink">L{lvl} · {lvl === 2 ? 'Regional Managers' : 'Operations Head'}</span>
                <span className="mx-1.5 text-muted">·</span>
                {n} active
                {o && (
                  <>
                    {' '}· Oldest {fmtDur(now - d.escAt(o))} ·{' '}
                    <Link to={`${BASE}/${o.id}`} className="hover:text-primary hover:underline">
                      {lvl === 3 ? 'Review today' : o.id}
                    </Link>
                  </>
                )}
              </p>
            )
          })}
        </Panel>
        <Panel title="Turnaround performance">
          <p className="py-1 text-[12px] leading-[17px] text-ink-2">
            <span className="text-ink">Median / P90 TAT</span>
            <span className="mx-1.5 text-muted">·</span>
            {fmtHours(percentile(d.tats, 0.5))} / {fmtHours(percentile(d.tats, 0.9))} · Closed complaints only
          </p>
          <p className="py-1 text-[12px] leading-[17px] text-ink-2">
            <span className="text-ink">Resolution within SLA</span>
            <span className="mx-1.5 text-muted">·</span>
            {d.within} of {d.closed.length} closures · {pct(d.within, d.closed.length)}
          </p>
        </Panel>
      </div>

      <div ref={gridRef} className="scroll-mt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-[17px] font-semibold">All complaints</h2>
          {QUICK.map((q) => (
            <Chip key={q} active={quick === q} onClick={() => setQuick(q)}>
              {q}
            </Chip>
          ))}
        </div>
        <ExcelGrid
          key={quick}
          title="All complaints"
          countLabel={`${quickRows.length} of ${d.period.length} in period`}
          rows={quickRows}
          columns={allCols}
          rowId={(c) => c.id}
          searchPlaceholder="Search ID, ATM, owner…"
          selectable
          bulkActions={(ids, clear) => (
            <span className="flex items-center gap-2">
              <select value={bulkOwner} onChange={(e) => setBulkOwner(e.target.value)} aria-label="New owner" className="h-7 rounded border border-line bg-white px-2 text-[12px]">
                <option value="">Assign owner…</option>
                {OWNERS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={!bulkOwner}
                onClick={() => {
                  ids.forEach((id) => updateComplaint(id, () => ({ owner: bulkOwner }), { title: 'Owner reassigned', meta: `Ananya Sharma · Bulk assignment → ${bulkOwner}` }))
                  toast(`${ids.length} complaint${ids.length > 1 ? 's' : ''} assigned to ${bulkOwner}`)
                  setBulkOwner('')
                  clear()
                }}
              >
                Apply
              </Button>
            </span>
          )}
          exportName="complaints"
          noun="complaints"
          pageSize={10}
        />
      </div>
    </ComplaintsShell>
  )
}
