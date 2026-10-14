import { useMemo, useState, type ReactNode } from 'react'
import { CalendarRange, ChevronDown, Download, History, ShieldCheck } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { fmtDate, fmtTime, istDay, type AuditEvent } from '@/data/legal'
import { BackLink, legalTone } from './ui'

const sel = 'h-10 appearance-none rounded-lg border border-line bg-white pr-3 pl-8 text-[13px] font-semibold text-ink outline-none focus:border-primary'
const date = 'h-8 rounded-md bg-transparent px-1 text-[13px] font-semibold text-ink outline-none'

/**
 * Generic, read-only audit history screen. Used by legal documents and project records.
 * Filters: event type, version, date range, sort order. Export writes the filtered log as CSV.
 */
export function AuditHistory({
  back,
  title = 'Audit History',
  sub,
  actions,
  context,
  events,
  gridTitle,
  exportName,
  callout,
  footerRef,
  policy = 'Audit events are read-only and cannot be edited or deleted. Sharing recipients and review reasons remain attached to each event.',
  showVersions = true,
  initialVersion = '',
}: {
  back: { to: string; label: string }
  title?: string
  sub: ReactNode
  actions?: ReactNode
  context: ReactNode
  events: AuditEvent[]
  gridTitle: string
  exportName: string
  callout?: ReactNode
  footerRef: string
  policy?: string
  showVersions?: boolean
  initialVersion?: string
}) {
  const days = events.map((e) => istDay(e.at)).sort()
  const minDay = days[0] ?? ''
  const maxDay = days[days.length - 1] ?? ''
  const [type, setType] = useState('')
  const [version, setVersion] = useState(initialVersion)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [order, setOrder] = useState<'new' | 'old'>('new')

  const types = useMemo(() => [...new Set(events.map((e) => e.event))].sort(), [events])
  const versions = useMemo(() => [...new Set(events.map((e) => e.version))].filter((v) => v !== '—').sort(), [events])

  const rows = useMemo(() => {
    const out = events.filter((e) => {
      const d = istDay(e.at)
      return (!type || e.event === type) && (!version || e.version === version) && (!from || d >= from) && (!to || d <= to)
    })
    return [...out].sort((a, b) => (order === 'new' ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at)))
  }, [events, type, version, from, to, order])

  const people = new Set(rows.map((e) => e.actor)).size
  const vers = new Set(rows.map((e) => e.version).filter((v) => v !== '—')).size
  const filtered = type || version || from || to

  const columns: GridColumn<AuditEvent>[] = [
    { key: 'date', header: 'Date', width: 120, pinned: true, sortable: true, value: (e) => e.at, render: (e) => fmtDate(e.at) },
    { key: 'actor', header: 'Actor', width: 150, sortable: true, filterable: true },
    { key: 'event', header: 'Event', width: 130, sortable: true, filterable: true },
    { key: 'role', header: 'Role', width: 130, sortable: true, filterable: true },
    {
      key: 'context', header: 'File / context', width: 260, sortable: true, filterable: true,
      render: (e) => (
        <span className="block max-w-[360px] truncate" title={e.note ? `${e.context} — ${e.note}` : e.context}>
          {e.context}
          {e.note && <span className="text-muted"> · “{e.note}”</span>}
        </span>
      ),
    },
    ...(showVersions ? [{ key: 'version', header: 'Ver.', label: 'Version', width: 70, sortable: true } as GridColumn<AuditEvent>] : []),
    { key: 'outcome', header: 'Outcome', width: 120, sortable: true, filterable: true, render: (e) => <Badge tone={legalTone(e.outcome)}>{e.outcome}</Badge> },
    { key: 'source', header: 'Source', width: 110, sortable: true, filterable: true },
    { key: 'time', header: 'Time (IST)', width: 100, sortable: true, filterable: true, value: (e) => `${fmtTime(e.at)} IST` },
  ]

  const exportLog = () => {
    downloadCsv(
      exportName,
      ['#', 'Date', 'Actor', 'Event', 'Role', 'File / context', 'Note', 'Version', 'Outcome', 'Source', 'Time (IST)'],
      rows.map((e, i) => [String(i + 1), fmtDate(e.at), e.actor, e.event, e.role, e.context, e.note ?? '', e.version, e.outcome, e.source, fmtTime(e.at)]),
    )
    toast(`Audit log exported · ${rows.length} events`)
  }

  return (
    <div>
      <BackLink to={back.to}>{back.label}</BackLink>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-[14px] text-muted">{sub}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportLog}>
            Export audit log
          </Button>
          {actions}
        </div>
      </div>

      <div className="mb-4 flex items-start gap-4 rounded-xl border border-line bg-white p-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <History size={22} />
        </span>
        <div className="min-w-0 flex-1">{context}</div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative">
          <ChevronDown size={14} className="pointer-events-none absolute top-3 left-3 text-ink-2" />
          <select aria-label="Event type" className={sel} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All events</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        {showVersions && (
          <label className="relative">
            <ChevronDown size={14} className="pointer-events-none absolute top-3 left-3 text-ink-2" />
            <select aria-label="Version" className={sel} value={version} onChange={(e) => setVersion(e.target.value)}>
              <option value="">All versions</option>
              {versions.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        )}
        <span className="flex h-10 flex-wrap items-center gap-1 rounded-lg border border-line bg-white px-3 text-[13px] text-muted">
          <CalendarRange size={15} className="text-ink-2" />
          <input type="date" aria-label="From date" className={date} value={from || minDay} min={minDay} max={to || maxDay} onChange={(e) => setFrom(e.target.value)} />
          –
          <input type="date" aria-label="To date" className={date} value={to || maxDay} min={from || minDay} max={maxDay} onChange={(e) => setTo(e.target.value)} />
        </span>
        <span className="text-[12px] text-muted">
          {rows.length} recorded event{rows.length === 1 ? '' : 's'} · {people} {people === 1 ? 'person' : 'people'}
          {showVersions && ` · ${vers} version${vers === 1 ? '' : 's'}`}
        </span>
        {filtered && (
          <button
            className="text-[12px] font-semibold text-primary hover:underline"
            onClick={() => {
              setType('')
              setVersion('')
              setFrom('')
              setTo('')
            }}
          >
            Clear filters
          </button>
        )}
        <select
          aria-label="Sort order"
          className="ml-auto h-9 bg-transparent text-[12px] text-muted outline-none"
          value={order}
          onChange={(e) => setOrder(e.target.value as 'new' | 'old')}
        >
          <option value="new">Newest first</option>
          <option value="old">Oldest first</option>
        </select>
      </div>

      <ExcelGrid
        key={order}
        title={gridTitle}
        countLabel={`${rows.length} events`}
        rows={rows}
        columns={columns}
        rowId={(e) => e.id}
        searchPlaceholder="Search actor or event"
        noun="events"
        exportName={exportName}
        emptyState="No events match these filters."
        rowClassName={(e) => (e.outcome === 'Rejected' ? 'bg-red-50/70' : undefined)}
        footerLeft={`Immutable audit log · ${footerRef}${showVersions ? ` · ${versions.length} version${versions.length === 1 ? '' : 's'}` : ''} · ${filtered ? `${rows.length} filtered` : `All ${rows.length}`} events · ${order === 'new' ? 'Newest first' : 'Oldest first'}`}
        footerRight="Read-only · All times IST"
      />

      {callout && <div className="mt-4">{callout}</div>}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-2 text-[11px] text-muted">
        <span className="flex items-start gap-1.5">
          <ShieldCheck size={14} className="shrink-0" /> {policy}
        </span>
        <span>All dates in IST</span>
      </div>
    </div>
  )
}
