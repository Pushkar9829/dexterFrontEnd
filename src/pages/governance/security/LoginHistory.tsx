// §7 IP address & location tracking — every login attempt with session and device details.
import { History } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useSecurity, type LoginEvent, useSecurityLoad } from '@/data/security'
import { ApiStatus, DataGrid, Note, PageShell, Stat, StatRow, type Col } from './kit'
import { fmtDT } from './util'

const tone = (s: LoginEvent['status']) => (s === 'Success' ? 'green' : s === 'MFA Failed' || s === 'Failed' ? 'amber' : 'red')

export default function LoginHistory() {
  const sec = useSecurity()
  const load = useSecurityLoad()
  const rows = sec.logins
  const cols: Col<LoginEvent>[] = [
    { key: 'user', label: 'User', value: (l) => `${l.name} (${l.accountId})`, render: (l) => (<><span className="font-medium text-ink">{l.name}</span><span className="block text-[10.5px] text-muted">{l.accountId}</span></>) },
    { key: 'ip', label: 'IP address', value: (l) => l.ip, className: 'font-mono text-[11.5px]' },
    { key: 'loc', label: 'Location', value: (l) => l.location },
    { key: 'at', label: 'Login date & time', value: (l) => fmtDT(l.at), className: 'whitespace-nowrap' },
    { key: 'out', label: 'Logout', value: (l) => fmtDT(l.logoutAt), className: 'whitespace-nowrap text-muted' },
    { key: 'dev', label: 'Device / IMEI', value: (l) => l.device },
    { key: 'sid', label: 'Session ID', value: (l) => l.sessionId, className: 'font-mono text-[11px] text-muted' },
    { key: 'st', label: 'Status', value: (l) => `${l.status}${l.reason ? ` — ${l.reason}` : ''}`, render: (l) => (<><Badge tone={tone(l.status)}>{l.status}</Badge>{l.reason && <span className="mt-0.5 block text-[10.5px] text-muted">{l.reason}</span>}</>) },
  ]
  return (
    <PageShell Icon={History} color="text-blue-600 bg-blue-50 border-blue-200" title="Login History" sub="Every login attempt on the web portal and the mobile app, with IP, location, device and session.">
      <ApiStatus loading={load.loading} error={load.error} onRetry={load.reload} />
      <StatRow>
        <Stat label="Attempts" value={rows.length} />
        <Stat label="Successful" value={rows.filter((l) => l.status === 'Success').length} tone="green" />
        <Stat label="Failed / MFA failed" value={rows.filter((l) => l.status === 'Failed' || l.status === 'MFA Failed').length} tone="amber" />
        <Stat label="Blocked / Locked" value={rows.filter((l) => l.status === 'Blocked' || l.status === 'Locked').length} tone="red" />
      </StatRow>
      <Note>Location is available only when OS / browser permissions and the network allow it; otherwise the IP-based location is shown.</Note>
      <DataGrid
        rows={rows}
        cols={cols}
        rowKey={(l) => l.id}
        fileName="login-history"
        searchPlaceholder="Search user, IP, location, session…"
        filters={[
          { key: 'st', label: 'Statuses', get: (l) => l.status, options: ['Success', 'Failed', 'MFA Failed', 'Locked', 'Blocked'] },
          { key: 'user', label: 'Users', get: (l) => l.name },
        ]}
        date={(l) => l.at}
        pageSize={15}
      />
    </PageShell>
  )
}
