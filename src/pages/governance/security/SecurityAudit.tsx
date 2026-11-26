// §16 Audit trail — admin/security actions merged with login events. Append-only: no edit / delete here.
import { useMemo } from 'react'
import { ScrollText } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { usePolicy, useSecurity, useSecurityLoad } from '@/data/security'
import { ApiStatus, DataGrid, Note, PageShell, Stat, StatRow, type Col } from './kit'
import { fmtDT } from './util'

type Row = { id: string; at: string; actor: string; action: string; target: string; detail: string; ip: string; source: 'Admin action' | 'Login event' }

export default function SecurityAudit() {
  const sec = useSecurity()
  const load = useSecurityLoad()
  const policy = usePolicy()
  const rows = useMemo<Row[]>(() => {
    const audit: Row[] = sec.audit.map((e) => ({ id: e.id, at: e.at, actor: e.actor, action: e.action, target: e.target, detail: e.detail ?? '', ip: e.ip ?? '', source: 'Admin action' }))
    const logins: Row[] = sec.logins.map((l) => ({
      id: l.id,
      at: l.at,
      actor: l.name,
      action: `Login ${l.status === 'Success' ? 'success' : l.status.toLowerCase()}`,
      target: l.accountId,
      detail: [l.device, l.location, `session ${l.sessionId}`, l.reason].filter(Boolean).join(' · '),
      ip: l.ip,
      source: 'Login event',
    }))
    return [...audit, ...logins].sort((a, b) => b.at.localeCompare(a.at))
  }, [sec.audit, sec.logins])

  const cols: Col<Row>[] = [
    { key: 'at', label: 'Date & time', value: (r) => fmtDT(r.at), className: 'whitespace-nowrap text-muted' },
    { key: 'actor', label: 'User', value: (r) => r.actor, className: 'font-medium text-ink' },
    { key: 'action', label: 'Action', value: (r) => r.action, render: (r) => (<><span className="font-mono text-[11px] text-[#334155]">{r.action}</span><span className="block text-[10.5px] text-muted">{r.source}</span></>) },
    { key: 'target', label: 'Target', value: (r) => r.target, className: 'text-[11.5px] font-semibold' },
    { key: 'detail', label: 'Detail', value: (r) => r.detail, className: 'max-w-[340px] text-muted' },
    { key: 'ip', label: 'IP', value: (r) => r.ip, className: 'font-mono text-[11px] text-muted' },
    { key: 'id', label: 'Event ID', value: (r) => r.id, render: (r) => <Badge tone={r.source === 'Admin action' ? 'blue' : 'gray'} dot={false}>{r.id}</Badge> },
  ]

  return (
    <PageShell Icon={ScrollText} color="text-blue-600 bg-blue-50 border-blue-200" title="Security Audit Trail" sub="Logins, account / session actions, device changes, permission and policy changes, backups and DPDP actions.">
      <ApiStatus loading={load.loading} error={load.error} onRetry={load.reload} />
      <StatRow>
        <Stat label="Events" value={rows.length} />
        <Stat label="Admin actions" value={sec.audit.length} tone="blue" />
        <Stat label="Login events" value={sec.logins.length} tone="purple" />
        <Stat label="Retention" value={`${Math.round(policy.auditRetentionDays / 365)} yrs`} tone="green" />
      </StatRow>
      <Note>Append-only: audit entries cannot be edited or deleted from any screen. Retention is {policy.auditRetentionDays} days (Central Security Administration).</Note>
      <DataGrid
        rows={rows}
        cols={cols}
        rowKey={(r) => r.id}
        fileName="security-audit-trail"
        searchPlaceholder="Search user, action, target, detail…"
        filters={[
          { key: 'action', label: 'Actions', get: (r) => r.action },
          { key: 'actor', label: 'Users', get: (r) => r.actor },
          { key: 'src', label: 'Sources', get: (r) => r.source, options: ['Admin action', 'Login event'] },
        ]}
        date={(r) => r.at}
        pageSize={20}
      />
    </PageShell>
  )
}
