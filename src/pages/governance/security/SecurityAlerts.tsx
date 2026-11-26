// §11 Suspicious login detection & security alerts.
import { useState } from 'react'
import { BellRing, Ban, CheckCheck, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { logSecurity, securityApi, securityStore, updateAccount, usePolicy, useSecurity, type SecurityAlert, useSecurityLoad } from '@/data/security'
import { ApiStatus, ConfirmModal, DataGrid, Note, PageShell, Stat, StatRow, type Col } from './kit'
import { terminateUserSessions } from './ops'
import { actor, apiRun, fmtDT } from './util'
import { apiEnabled } from '@/lib/api'

type Act = { kind: 'ack' | 'resolve' | 'block'; a: SecurityAlert }

export default function SecurityAlerts() {
  const sec = useSecurity()
  const load = useSecurityLoad()
  const policy = usePolicy()
  const [act, setAct] = useState<Act | null>(null)
  const accountStatus = (id: string) => sec.accounts.find((x) => x.id === id)?.status

  const setStatus = (a: SecurityAlert, status: SecurityAlert['status'], note: string) => {
    securityStore.set((s) => ({ ...s, alerts: s.alerts.map((x) => (x.id === a.id ? { ...x, status } : x)) }))
    logSecurity({ actor: actor(), action: `Alert ${status.toLowerCase()}`, target: a.accountId, detail: `${a.id} ${a.kind}${note ? ` — ${note}` : ''}` })
  }

  const run = (note: string) => {
    if (!act) return
    const { a } = act
    if (apiEnabled) {
      // No "block" endpoint on the backend: blocking from an alert disables the login (ends its sessions).
      if (act.kind === 'block') apiRun(securityApi.disableUser(a.accountId, `Blocked from alert ${a.id}: ${note}`).then(() => (a.status === 'Open' ? securityApi.setAlertStatus(a.id, 'Acknowledged') : undefined)), `${a.name} disabled and signed out.`)
      else apiRun(securityApi.setAlertStatus(a.id, act.kind === 'ack' ? 'Acknowledged' : 'Resolved'), `${a.id} ${act.kind === 'ack' ? 'acknowledged' : 'resolved'}.`)
      setAct(null)
      return
    }
    if (act.kind === 'ack') {
      setStatus(a, 'Acknowledged', note)
      toast(`${a.id} acknowledged.`)
    } else if (act.kind === 'resolve') {
      setStatus(a, 'Resolved', note)
      toast(`${a.id} resolved.`)
    } else {
      const who = actor()
      updateAccount(a.accountId, { status: 'Blocked' }, { actor: who, action: 'Account blocked from alert', detail: `${a.name} — ${a.id} ${a.kind}: ${note}` })
      terminateUserSessions(a.accountId, who, `Blocked from alert ${a.id}`)
      if (a.status === 'Open') setStatus(a, 'Acknowledged', 'Account blocked')
      toast(`${a.name} blocked and signed out.`)
    }
    setAct(null)
  }

  const cols: Col<SecurityAlert>[] = [
    { key: 'id', label: 'Alert', value: (a) => `${a.id} ${a.kind}`, render: (a) => (<><span className="font-medium text-ink">{a.kind}</span><span className="block font-mono text-[10.5px] text-muted">{a.id}</span></>) },
    { key: 'at', label: 'Raised', value: (a) => fmtDT(a.at), className: 'whitespace-nowrap text-muted' },
    { key: 'user', label: 'User', value: (a) => a.name, render: (a) => (<>{a.name}<span className="block text-[10.5px] text-muted">Account: {accountStatus(a.accountId) ?? '—'}</span></>) },
    { key: 'detail', label: 'Detail', value: (a) => a.detail, className: 'max-w-[280px] text-muted' },
    { key: 'sev', label: 'Severity', value: (a) => a.severity, render: (a) => <Badge tone={a.severity === 'High' ? 'red' : a.severity === 'Medium' ? 'amber' : 'blue'}>{a.severity}</Badge> },
    { key: 'notified', label: 'Notified', value: (a) => a.notified.join(', '), className: 'max-w-[200px] text-[11px] text-muted' },
    { key: 'st', label: 'Status', value: (a) => a.status, render: (a) => <Badge tone={a.status === 'Open' ? 'red' : a.status === 'Acknowledged' ? 'amber' : 'green'}>{a.status}</Badge> },
  ]

  const open = sec.alerts.filter((a) => a.status === 'Open')
  return (
    <PageShell Icon={BellRing} color="text-rose-600 bg-rose-50 border-rose-200" title="Security Alerts" sub="New device, unusual IP / location, repeated failures, suspicious sessions and unauthorized device changes.">
      <ApiStatus loading={load.loading} error={load.error} onRetry={load.reload} />
      <StatRow>
        <Stat label="Open" value={open.length} tone="red" />
        <Stat label="High severity open" value={open.filter((a) => a.severity === 'High').length} tone="red" />
        <Stat label="Acknowledged" value={sec.alerts.filter((a) => a.status === 'Acknowledged').length} tone="amber" />
        <Stat label="Resolved" value={sec.alerts.filter((a) => a.status === 'Resolved').length} tone="green" />
      </StatRow>
      <Note>Alerts go to the affected user and to: {policy.alertRecipients.join(', ') || '(no recipients configured)'}.</Note>
      <DataGrid
        rows={sec.alerts}
        cols={cols}
        rowKey={(a) => a.id}
        fileName="security-alerts"
        searchPlaceholder="Search alert, user, detail…"
        filters={[
          { key: 'kind', label: 'Kinds', get: (a) => a.kind },
          { key: 'sev', label: 'Severities', get: (a) => a.severity, options: ['High', 'Medium', 'Low'] },
          { key: 'st', label: 'Statuses', get: (a) => a.status, options: ['Open', 'Acknowledged', 'Resolved'] },
        ]}
        date={(a) => a.at}
        actions={(a) => (
          <>
            {a.status === 'Open' && <Button size="sm" variant="secondary" icon={<Eye size={13} />} onClick={() => setAct({ kind: 'ack', a })}>Acknowledge</Button>}
            {a.status !== 'Resolved' && <Button size="sm" icon={<CheckCheck size={13} />} onClick={() => setAct({ kind: 'resolve', a })}>Resolve</Button>}
            {accountStatus(a.accountId) !== 'Blocked' && <Button size="sm" variant="danger" icon={<Ban size={13} />} onClick={() => setAct({ kind: 'block', a })}>Block user</Button>}
          </>
        )}
      />
      {act && (
        <ConfirmModal
          title={act.kind === 'ack' ? `Acknowledge ${act.a.id}?` : act.kind === 'resolve' ? `Resolve ${act.a.id}?` : `Block ${act.a.name}?`}
          sub={act.kind === 'block' ? 'The account is blocked immediately and all of its sessions are terminated.' : act.a.detail}
          confirmLabel={act.kind === 'ack' ? 'Acknowledge' : act.kind === 'resolve' ? 'Resolve' : 'Block account'}
          danger={act.kind === 'block'}
          reasonLabel={act.kind === 'ack' ? undefined : act.kind === 'resolve' ? 'Resolution note' : 'Reason'}
          onConfirm={run}
          onClose={() => setAct(null)}
        />
      )}
    </PageShell>
  )
}
