import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, Mail, Pencil, Plus } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { downloadCsv } from '@/lib/export'
import { can, useRole } from '@/lib/rbac'
import { WF_EVENTS, WF_MODULES, useTemplates, useWorkflow, useWorkflowLoad } from '@/data/workflow'
import { BTN_PRIMARY, BTN_SECONDARY, EmptyRow, FilterCard, FilterSelect, PageHead, Stat, TD, THead, TROW, TableCard, WfCrumbs } from './ui'
import { fmtDT, usePaged } from './helpers'

const COLS = ['Code', 'Template Name', 'Module', 'Trigger Event', 'Subject', 'To', 'Timing', 'Esc. Level', 'Version', 'Status', 'Last Sent', 'Actions']

export default function EmailTemplates() {
  const role = useRole()
  const canCreate = can('Create', role)
  const canEdit = can('Edit', role)
  const templates = useTemplates()
  useWorkflowLoad(['templates', 'emails']) // API mode: /workflow/templates + /workflow/emails
  const { emails } = useWorkflow()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [mod, setMod] = useState('all')
  const [ev, setEv] = useState('all')
  const [st, setSt] = useState('all')

  const lastSent = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of emails) if (!m.has(e.templateCode)) m.set(e.templateCode, e.at)
    return m
  }, [emails])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return templates.filter(
      (t) =>
        (mod === 'all' || t.module === mod) &&
        (ev === 'all' || t.event === ev) &&
        (st === 'all' || t.status === st) &&
        (!s || [t.code, t.name, t.subject, t.module, t.event].some((v) => v.toLowerCase().includes(s))),
    )
  }, [templates, q, mod, ev, st])
  const pg = usePaged(rows, `${q}|${mod}|${ev}|${st}`)

  const reset = () => {
    setQ('')
    setMod('all')
    setEv('all')
    setSt('all')
  }
  const download = () =>
    downloadCsv(
      'email-templates',
      ['Code', 'Name', 'Module', 'Event', 'Subject', 'To', 'CC', 'BCC', 'Timing', 'Reminder (h)', 'Escalation Level', 'Version', 'Status'],
      rows.map((t) => [t.code, t.name, t.module, t.event, t.subject, t.to, t.cc.join('; '), t.bcc.join('; '), t.timing, String(t.reminderEveryHours), `L${t.escalationLevel}`, `v${t.version}`, t.status]),
    )

  return (
    <div className="space-y-5 pb-16 max-w-[1440px]">
      <WfCrumbs trail={[{ label: 'Email Templates' }]} />
      <PageHead
        title="Email Template Management"
        sub="Pre-set templates for every ERP module. Recipients resolve from the hierarchy — never fixed email IDs. Every change creates a new version."
        actions={
          <>
            <Link to="/setup/email-log" className={BTN_SECONDARY}>
              <Mail size={15} /> Email Log
            </Link>
            {canCreate && (
              <button type="button" className={BTN_PRIMARY} onClick={() => nav('/setup/email-templates/new')}>
                <Plus size={16} /> New Template
              </button>
            )}
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Templates" value={templates.length} />
        <Stat label="Active" value={templates.filter((t) => t.status === 'Active').length} tone="text-emerald-600" />
        <Stat label="Inactive" value={templates.filter((t) => t.status === 'Inactive').length} tone="text-red-600" />
        <Stat label="Modules covered" value={new Set(templates.map((t) => t.module)).size} tone="text-[#0066FF]" />
      </div>
      <FilterCard search={q} onSearch={setQ} placeholder="Code, name, subject…" onReset={reset} onDownload={download}>
        <FilterSelect label="Module" value={mod} onChange={setMod} options={WF_MODULES} all="All modules" />
        <FilterSelect label="Trigger Event" value={ev} onChange={setEv} options={WF_EVENTS} all="All events" />
        <FilterSelect label="Status" value={st} onChange={setSt} options={['Active', 'Inactive']} all="All statuses" />
      </FilterCard>
      <TableCard title="Email Template Master" total={rows.length} page={pg.page} pageSize={pg.pageSize} onPage={pg.setPage} onPageSize={pg.setPageSize} noun="templates" minWidth={1300}>
        <THead cols={COLS} />
        <tbody>
          {pg.slice.length === 0 && <EmptyRow cols={COLS.length} />}
          {pg.slice.map((t) => (
            <tr key={t.code} className={TROW}>
              <td className={`${TD} font-semibold text-[#0066FF]`}>
                <Link to={`/setup/email-templates/${encodeURIComponent(t.code)}`}>{t.code}</Link>
              </td>
              <td className={TD}>{t.name}</td>
              <td className={TD}>{t.module}</td>
              <td className={TD}>{t.event}</td>
              <td className={`${TD} max-w-[280px] truncate`} title={t.subject}>{t.subject}</td>
              <td className={TD}>{t.to}</td>
              <td className={TD}>{t.timing}</td>
              <td className={TD}>L{t.escalationLevel}</td>
              <td className={TD}>v{t.version}</td>
              <td className={TD}>
                <Badge tone={toneFor(t.status)}>{t.status}</Badge>
              </td>
              <td className={TD}>{fmtDT(lastSent.get(t.code))}</td>
              <td className={TD}>
                <Link to={`/setup/email-templates/${encodeURIComponent(t.code)}`} className="inline-flex items-center gap-1 font-semibold text-[#0066FF] hover:underline">
                  {canEdit ? <Pencil size={13} /> : <Eye size={13} />} {canEdit ? 'Edit' : 'View'}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </div>
  )
}
