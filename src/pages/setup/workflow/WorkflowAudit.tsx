import { useMemo, useState } from 'react'
import { downloadCsv } from '@/lib/export'
import { useWorkflow, useWorkflowLoad } from '@/data/workflow'
import { EmptyRow, FilterCard, FilterSelect, PageHead, TD, THead, TROW, TableCard, WfCrumbs } from './ui'
import { fmtDT, usePaged } from './helpers'

const COLS = ['Audit ID', 'Date / Time', 'By', 'Area', 'Reference', 'Action', 'Detail']

export default function WorkflowAudit() {
  const { audit } = useWorkflow()
  useWorkflowLoad(['audit']) // API mode: GET /audit?category=workflow
  const [q, setQ] = useState('')
  const [area, setArea] = useState('all')
  const [by, setBy] = useState('all')
  const [range, setRange] = useState('all')
  const areas = useMemo(() => [...new Set(audit.map((a) => a.area))].sort(), [audit])
  const users = useMemo(() => [...new Set(audit.map((a) => a.by))].sort(), [audit])
  const [openedAt] = useState(() => Date.now())
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    const days = range === 'Last 24 hours' ? 1 : range === 'Last 7 days' ? 7 : range === 'Last 30 days' ? 30 : 0
    // relative to when the page was opened (no clock read during render)
    const from = days ? openedAt - days * 86_400_000 : 0
    return audit.filter(
      (a) =>
        (area === 'all' || a.area === area) &&
        (by === 'all' || a.by === by) &&
        (!from || new Date(a.at).getTime() >= from) &&
        (!s || [a.id, a.ref, a.action, a.detail ?? ''].some((v) => v.toLowerCase().includes(s))),
    )
  }, [audit, q, area, by, range, openedAt])
  const pg = usePaged(rows, `${q}|${area}|${by}|${range}`, 25)

  return (
    <div className="space-y-5 pb-16 max-w-[1440px]">
      <WfCrumbs trail={[{ label: 'Workflow Audit Log' }]} />
      <PageHead title="Workflow Audit Log" sub="Every workflow event, template change, hierarchy change, reassignment and escalation — append-only. Historical identities are never rewritten." />
      <FilterCard
        search={q}
        onSearch={setQ}
        placeholder="Reference, action, detail…"
        onReset={() => {
          setQ('')
          setArea('all')
          setBy('all')
          setRange('all')
        }}
        onDownload={() => downloadCsv('workflow-audit', COLS, rows.map((a) => [a.id, fmtDT(a.at), a.by, a.area, a.ref, a.action, a.detail ?? '']))}
      >
        <FilterSelect label="Area / module" value={area} onChange={setArea} options={areas} all="All areas" />
        <FilterSelect label="Performed by" value={by} onChange={setBy} options={users} all="Everyone" />
        <FilterSelect label="Period" value={range} onChange={setRange} options={['Last 24 hours', 'Last 7 days', 'Last 30 days']} all="All time" />
      </FilterCard>
      <TableCard title="Audit trail" total={rows.length} page={pg.page} pageSize={pg.pageSize} onPage={pg.setPage} onPageSize={pg.setPageSize} noun="entries" minWidth={1100}>
        <THead cols={COLS} />
        <tbody>
          {pg.slice.length === 0 && <EmptyRow cols={COLS.length} text={audit.length ? 'No entries match the filters.' : 'No workflow activity recorded yet.'} />}
          {pg.slice.map((a) => (
            <tr key={a.id} className={TROW}>
              <td className={`${TD} font-semibold`}>{a.id}</td>
              <td className={TD}>{fmtDT(a.at)}</td>
              <td className={TD}>{a.by}</td>
              <td className={TD}>{a.area}</td>
              <td className={TD}>{a.ref}</td>
              <td className={TD}>{a.action}</td>
              <td className={`${TD} max-w-[460px] truncate`} title={a.detail}>{a.detail ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </div>
  )
}
