// §6 single active session + §10 session management: Admin can terminate any session.
import { useState } from 'react'
import { Laptop, Power, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { usePolicy, useSecurity, type ActiveSession, useSecurityLoad } from '@/data/security'
import { ApiStatus, ConfirmModal, DataGrid, Note, PageShell, Stat, StatRow, type Col } from './kit'
import { terminateSession, terminateUserSessions } from './ops'
import { actor, fmtDT } from './util'

export default function LiveSessions() {
  const sec = useSecurity()
  const load = useSecurityLoad()
  const policy = usePolicy()
  const [target, setTarget] = useState<{ kind: 'one' | 'all'; s: ActiveSession } | null>(null)

  const live = sec.sessions.filter((s) => s.status !== 'Terminated')
  const cols: Col<ActiveSession>[] = [
    { key: 'id', label: 'Session ID', value: (s) => s.id, className: 'font-mono text-[11.5px] font-semibold text-purple-700' },
    { key: 'user', label: 'User / Role', value: (s) => `${s.name} ${s.role}`, render: (s) => (<><span className="font-medium text-ink">{s.name}</span><span className="block text-[10.5px] text-muted">{s.accountId} · {s.role}</span></>) },
    { key: 'dev', label: 'System & browser', value: (s) => `${s.device} · ${s.browser}`, render: (s) => (<>{s.device}<span className="block text-[10.5px] text-muted">{s.browser}</span></>) },
    { key: 'ip', label: 'IP / Location', value: (s) => `${s.ip} ${s.location}`, render: (s) => (<><span className="font-mono text-[11.5px]">{s.ip}</span><span className="block text-[10.5px] text-muted">{s.location}</span></>) },
    { key: 'start', label: 'Signed in', value: (s) => fmtDT(s.startedAt), className: 'whitespace-nowrap text-muted' },
    { key: 'last', label: 'Last active', value: (s) => fmtDT(s.lastActiveAt), className: 'whitespace-nowrap text-muted' },
    { key: 'st', label: 'Status', value: (s) => s.status, render: (s) => <Badge tone={s.status === 'Active' ? 'green' : s.status === 'Idle' ? 'amber' : 'gray'}>{s.status}</Badge> },
  ]

  const confirm = (reason: string) => {
    if (!target) return
    const who = actor()
    if (target.kind === 'one') {
      const ok = terminateSession(target.s.id, who, reason)
      toast(ok ? `Session ${target.s.id} terminated.` : 'Session was already ended.', ok ? 'success' : 'info')
    } else {
      const n = terminateUserSessions(target.s.accountId, who, reason)
      toast(`${n} session(s) of ${target.s.name} terminated.`)
    }
    setTarget(null)
  }

  return (
    <PageShell Icon={Laptop} color="text-purple-600 bg-purple-50 border-purple-200" title="Live Sessions" sub="One active session per user. All browser tabs and windows on the same system share one session; enforcement is server-side.">
      <ApiStatus loading={load.loading} error={load.error} onRetry={load.reload} />
      <StatRow>
        <Stat label="Live sessions" value={live.length} tone="purple" />
        <Stat label="Idle" value={live.filter((s) => s.status === 'Idle').length} tone="amber" />
        <Stat label="Idle timeout" value={`${policy.sessionIdleMinutes} min`} tone="blue" />
        <Stat label="Second system" value={policy.secondSystem === 'Block' ? 'Blocked' : 'Transfer'} tone="green" />
      </StatRow>
      <Note>
        Login from a second system is handled as <strong>{policy.secondSystem}</strong> (change it in Central Security Administration). Access tokens live {policy.accessTokenMinutes} min, refresh tokens {policy.refreshTokenDays} days; terminating a session revokes both.
      </Note>
      <DataGrid
        rows={sec.sessions}
        cols={cols}
        rowKey={(s) => s.id}
        fileName="live-sessions"
        searchPlaceholder="Search user, session ID, IP…"
        filters={[
          { key: 'st', label: 'Statuses', get: (s) => s.status, options: ['Active', 'Idle', 'Terminated'] },
          { key: 'role', label: 'Roles', get: (s) => s.role },
        ]}
        date={(s) => s.startedAt}
        actions={(s) =>
          s.status === 'Terminated' ? (
            <span className="text-[11px] text-muted">Ended</span>
          ) : (
            <>
              <Button size="sm" variant="danger" icon={<Power size={13} />} onClick={() => setTarget({ kind: 'one', s })}>
                Terminate
              </Button>
              <Button size="sm" variant="secondary" icon={<Users size={13} />} onClick={() => setTarget({ kind: 'all', s })}>
                All of user
              </Button>
            </>
          )
        }
      />
      {target && (
        <ConfirmModal
          title={target.kind === 'one' ? `Terminate session ${target.s.id}?` : `Terminate all sessions of ${target.s.name}?`}
          sub="The user is signed out on that system immediately and must log in again."
          confirmLabel="Terminate"
          danger
          reasonLabel="Reason"
          onConfirm={confirm}
          onClose={() => setTarget(null)}
        />
      )}
    </PageShell>
  )
}
