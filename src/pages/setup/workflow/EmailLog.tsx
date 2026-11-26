import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { downloadCsv } from '@/lib/export'
import { WF_MODULES, useWorkflow, useWorkflowLoad, type EmailLog as Mail } from '@/data/workflow'
import { EmptyRow, FilterCard, FilterSelect, PageHead, Stat, TD, THead, TROW, TableCard, WfCrumbs } from './ui'
import { fmtDT, usePaged } from './helpers'
import { MailModal } from './MailModal'

const COLS = ['Email ID', 'Date / Time', 'Status', 'Template', 'Version', 'Module', 'Event', 'Record', 'Task', 'To', 'CC', 'Subject', '']

export default function EmailLog() {
  const { emails } = useWorkflow()
  useWorkflowLoad(['emails']) // API mode: GET /workflow/emails
  const [q, setQ] = useState('')
  const [st, setSt] = useState('all')
  const [mod, setMod] = useState('all')
  const [tpl, setTpl] = useState('all')
  const [view, setView] = useState<Mail | null>(null)
  const codes = useMemo(() => [...new Set(emails.map((e) => e.templateCode))].sort(), [emails])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return emails.filter(
      (e) =>
        (st === 'all' || e.status === st) &&
        (mod === 'all' || e.module === mod) &&
        (tpl === 'all' || e.templateCode === tpl) &&
        (!s || [e.id, e.refId, e.subject, e.templateCode, ...e.to, ...e.cc, e.taskId ?? ''].some((v) => v.toLowerCase().includes(s))),
    )
  }, [emails, q, st, mod, tpl])
  const pg = usePaged(rows, `${q}|${st}|${mod}|${tpl}`)
  const count = (s: Mail['status']) => emails.filter((e) => e.status === s).length

  return (
    <div className="space-y-5 pb-16 max-w-[1440px]">
      <WfCrumbs trail={[{ label: 'Email Templates', to: '/setup/email-templates' }, { label: 'Email Log' }]} />
      <PageHead title="Email Log" sub="Every delivery attempt by the workflow engine — recipient, template code and version, record and status (mock delivery, no real email is sent)." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total" value={emails.length} />
        <Stat label="Sent" value={count('Sent')} tone="text-emerald-600" />
        <Stat label="Failed" value={count('Failed')} tone="text-red-600" hint="No recipient could be resolved" />
        <Stat label="Pending" value={count('Pending')} tone="text-amber-600" />
      </div>
      <FilterCard
        search={q}
        onSearch={setQ}
        placeholder="Record, subject, recipient, task…"
        cols={5}
        onReset={() => {
          setQ('')
          setSt('all')
          setMod('all')
          setTpl('all')
        }}
        onDownload={() => downloadCsv('email-log', ['Email ID', 'At', 'Status', 'Template', 'Version', 'Module', 'Event', 'Record', 'Task', 'To', 'CC', 'Subject'], rows.map((e) => [e.id, fmtDT(e.at), e.status, e.templateCode, `v${e.templateVersion}`, e.module, e.event, e.refId, e.taskId ?? '', e.to.join('; '), e.cc.join('; '), e.subject]))}
      >
        <FilterSelect label="Status" value={st} onChange={setSt} options={['Sent', 'Failed', 'Pending']} all="All statuses" />
        <FilterSelect label="Module" value={mod} onChange={setMod} options={WF_MODULES} all="All modules" />
        <FilterSelect label="Template" value={tpl} onChange={setTpl} options={codes} all="All templates" />
      </FilterCard>
      <TableCard title="Email delivery log" total={rows.length} page={pg.page} pageSize={pg.pageSize} onPage={pg.setPage} onPageSize={pg.setPageSize} noun="emails" minWidth={1500}>
        <THead cols={COLS} />
        <tbody>
          {pg.slice.length === 0 && <EmptyRow cols={COLS.length} text={emails.length ? 'No emails match the filters.' : 'No emails yet — they appear here when a module fires a workflow event or a test email is sent.'} />}
          {pg.slice.map((e) => (
            <tr key={e.id} className={TROW}>
              <td className={`${TD} font-semibold`}>{e.id}</td>
              <td className={TD}>{fmtDT(e.at)}</td>
              <td className={TD}><Badge tone={toneFor(e.status)}>{e.status}</Badge></td>
              <td className={TD}><Link className="text-[#0066FF] hover:underline" to={`/setup/email-templates/${encodeURIComponent(e.templateCode)}`}>{e.templateCode}</Link></td>
              <td className={TD}>v{e.templateVersion}</td>
              <td className={TD}>{e.module}</td>
              <td className={TD}>{e.event}</td>
              <td className={TD}>{e.refId}</td>
              <td className={TD}>{e.taskId ?? '—'}</td>
              <td className={`${TD} max-w-[200px] truncate`} title={e.to.join(', ')}>{e.to.join(', ') || '—'}</td>
              <td className={`${TD} max-w-[160px] truncate`} title={e.cc.join(', ')}>{e.cc.join(', ') || '—'}</td>
              <td className={`${TD} max-w-[300px] truncate`} title={e.subject}>{e.subject}</td>
              <td className={TD}>
                <button type="button" className="inline-flex items-center gap-1 font-semibold text-[#0066FF] hover:underline" onClick={() => setView(e)}><Eye size={13} /> View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
      {view && <MailModal mail={view} onClose={() => setView(null)} />}
    </div>
  )
}
