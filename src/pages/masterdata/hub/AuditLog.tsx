import { useMemo, useState } from 'react'
import { downloadCsv } from '@/lib/export'
import { useMasterAudit, useMasterLoad, type MasterAudit } from '@/data/network'
import { fmtDate, fmtTime } from './hubStore'
import { DataTable, FilterSelect, PageShell, TableBar, type Col } from './ui'

export default function AuditLog() {
  const log = useMasterAudit()
  useMasterLoad(['audit']) // API mode: GET /audit (Site / Category / Franchise data changes)
  const [q, setQ] = useState('')
  const [entity, setEntity] = useState('all')
  const [user, setUser] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const entities = useMemo(() => [...new Set(log.map((l) => l.entity))].sort(), [log])
  const users = useMemo(() => [...new Set(log.map((l) => l.by))].sort(), [log])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return log.filter(
      (l) =>
        (entity === 'all' || l.entity === entity) &&
        (user === 'all' || l.by === user) &&
        (!from || l.at.slice(0, 10) >= from) &&
        (!to || l.at.slice(0, 10) <= to) &&
        (!s || `${l.ref} ${l.action} ${l.before ?? ''} ${l.after ?? ''}`.toLowerCase().includes(s)),
    )
  }, [log, q, entity, user, from, to])
  const cols: Col<MasterAudit>[] = [
    { key: 'b', header: 'Who', render: (l) => <span className="font-semibold text-slate-900">{l.by}</span> },
    { key: 'd', header: 'Date', render: (l) => fmtDate(l.at) },
    { key: 't', header: 'Time', render: (l) => fmtTime(l.at) },
    { key: 'e', header: 'Record', render: (l) => <><div>{l.entity}</div><div className="text-[11px] text-slate-500">{l.ref}</div></> },
    { key: 'a', header: 'What changed', render: (l) => l.action },
    { key: 'o', header: 'Old value', render: (l) => <span className="text-slate-500">{l.before ?? '—'}</span> },
    { key: 'n', header: 'New value', render: (l) => l.after ?? '—' },
  ]
  const dateInput = (label: string, value: string, set: (v: string) => void) => (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-700">{label}</span>
      <input type="date" value={value} onChange={(e) => set(e.target.value)} className="h-8.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-[#0066FF]" />
    </label>
  )
  return (
    <PageShell title="Master Data Audit Log" sub="Every master data change: who, date, time, what changed, old value and new value (§25.1). Records cannot be edited or deleted.">
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(l) => l.id}
        noun="changes"
        pageSize={25}
        empty="No master data changes recorded yet."
        toolbar={
          <TableBar search={q} onSearch={setQ} placeholder="Record, action, value…" onDownload={() => downloadCsv('master-data-audit-log', ['Who', 'Date', 'Time', 'Entity', 'Record', 'What changed', 'Old value', 'New value'], rows.map((l) => [l.by, l.at.slice(0, 10), fmtTime(l.at), l.entity, l.ref, l.action, l.before ?? '', l.after ?? '']))}>
            <FilterSelect label="Entity" value={entity} onChange={setEntity} options={entities} />
            <FilterSelect label="User" value={user} onChange={setUser} options={users} />
            {dateInput('From', from, setFrom)}
            {dateInput('To', to, setTo)}
          </TableBar>
        }
      />
    </PageShell>
  )
}
