// §8 Device registration & binding: registry, device-change approvals, deactivation.
import { useState } from 'react'
import { Check, Smartphone, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { maskAccount } from '@/lib/mask'
import { logSecurity, securityApi, securityStore, usePolicy, useSecurity, useSecurityLoad, type Device } from '@/data/security'
import { apiEnabled } from '@/lib/api'
import { ApiStatus, ConfirmModal, DataGrid, Note, PageShell, Stat, StatRow, Tabs, type Col } from './kit'
import { terminateUserSessions } from './ops'
import { actor, apiRun, fmtDT } from './util'

type Act = { kind: 'approve' | 'reject' | 'deactivate'; d: Device }
const statusTone = (s: Device['status']) => (s === 'Registered' ? 'green' : s === 'Pending Approval' ? 'amber' : s === 'Rejected' ? 'red' : 'gray')

export default function Devices() {
  const sec = useSecurity()
  const policy = usePolicy()
  const load = useSecurityLoad()
  const [tab, setTab] = useState<'registry' | 'pending'>('registry')
  const [act, setAct] = useState<Act | null>(null)

  const nameOf = (id: string) => sec.accounts.find((a) => a.id === id)?.name ?? id
  const pending = sec.devices.filter((d) => d.status === 'Pending Approval')

  const run = (reason: string) => {
    if (!act) return
    const who = actor()
    const { d } = act
    const user = nameOf(d.accountId)
    if (apiEnabled) {
      // Server enforces maker-checker (you cannot approve your own device) and audits the decision.
      const call = act.kind === 'approve' ? securityApi.approveDevice(d.id) : act.kind === 'reject' ? securityApi.rejectDevice(d.id) : securityApi.deactivateDevice(d.id)
      apiRun(call, act.kind === 'approve' ? `${d.model} approved for ${user}.` : act.kind === 'reject' ? `Device request rejected for ${user}.` : `${d.model} deactivated.`)
      setAct(null)
      return
    }
    if (act.kind === 'approve') {
      const old = sec.devices.filter((x) => x.accountId === d.accountId && x.id !== d.id && x.status === 'Registered')
      securityStore.set((s) => ({
        ...s,
        devices: s.devices.map((x) =>
          x.id === d.id ? { ...x, status: 'Registered', approvedBy: who } : x.accountId === d.accountId && x.status === 'Registered' ? { ...x, status: 'Deactivated' } : x,
        ),
        alerts: s.alerts.map((a) => (a.accountId === d.accountId && a.kind === 'Unauthorized device change' && a.status !== 'Resolved' ? { ...a, status: 'Resolved' } : a)),
      }))
      logSecurity({ actor: who, action: 'Device change approved', target: d.accountId, detail: `${user}: ${d.model} (${d.id}) registered; old device(s) deactivated: ${old.map((o) => `${o.model} (${o.id})`).join(', ') || 'none'}${reason ? ` — ${reason}` : ''}` })
      terminateUserSessions(d.accountId, who, 'Device change approved')
      toast(`${d.model} approved for ${user}. Old device deactivated.`)
    } else if (act.kind === 'reject') {
      securityStore.set((s) => ({ ...s, devices: s.devices.map((x) => (x.id === d.id ? { ...x, status: 'Rejected' } : x)) }))
      logSecurity({ actor: who, action: 'Device change rejected', target: d.accountId, detail: `${user}: ${d.model} (${d.id}) — ${reason}` })
      toast(`Device request rejected for ${user}.`, 'info')
    } else {
      securityStore.set((s) => ({ ...s, devices: s.devices.map((x) => (x.id === d.id ? { ...x, status: 'Deactivated' } : x)) }))
      logSecurity({ actor: who, action: 'Device deactivated', target: d.accountId, detail: `${user}: ${d.model} (${d.id}) — ${reason}` })
      terminateUserSessions(d.accountId, who, 'Registered device deactivated')
      toast(`${d.model} deactivated.`)
    }
    setAct(null)
  }

  const cols: Col<Device>[] = [
    { key: 'id', label: 'Device', value: (d) => `${d.id} ${d.model}`, render: (d) => (<><span className="font-medium text-ink">{d.model}</span><span className="block font-mono text-[10.5px] text-muted">{d.id}</span></>) },
    { key: 'user', label: 'User', value: (d) => nameOf(d.accountId) },
    { key: 'pf', label: 'Platform', value: (d) => d.platform },
    { key: 'imei', label: 'IMEI', value: (d) => (d.imei ? maskAccount(d.imei.replace(/\D/g, '')) : '—'), className: 'font-mono text-[11px]' },
    { key: 'sid', label: 'Secure identifier', value: (d) => d.deviceIdentifier, className: 'font-mono text-[11px]' },
    { key: 'att', label: 'Attestation', value: (d) => d.attestation, render: (d) => <Badge tone={d.attestation === 'Passed' ? 'green' : d.attestation === 'Failed' ? 'red' : 'gray'}>{d.attestation}</Badge> },
    { key: 'root', label: 'Rooted / Jailbroken', value: (d) => (d.rooted ? 'Yes' : 'No'), render: (d) => (d.rooted ? <Badge tone="red">Yes</Badge> : <span className="text-muted">No</span>) },
    { key: 'st', label: 'Status', value: (d) => d.status, render: (d) => <Badge tone={statusTone(d.status)}>{d.status}</Badge> },
    { key: 'seen', label: 'Registered / last seen', value: (d) => `${fmtDT(d.registeredAt)} / ${fmtDT(d.lastSeenAt)}`, render: (d) => (<span className="whitespace-nowrap text-muted">{fmtDT(d.registeredAt)}<span className="block text-[10.5px]">seen {fmtDT(d.lastSeenAt)}</span></span>) },
  ]

  const filters = [
    { key: 'pf', label: 'Platforms', get: (d: Device) => d.platform },
    { key: 'st', label: 'Statuses', get: (d: Device) => d.status, options: ['Registered', 'Pending Approval', 'Deactivated', 'Rejected'] },
    { key: 'att', label: 'Attestation', get: (d: Device) => d.attestation },
  ]

  return (
    <PageShell Icon={Smartphone} color="text-cyan-600 bg-cyan-50 border-cyan-200" title="Device Registry" sub="Mobile app accounts work only from their registered device (secure identifier + attestation + IMEI). Device changes need Admin approval.">
      <ApiStatus loading={load.loading} error={load.error} onRetry={load.reload} />
      <StatRow>
        <Stat label="Registered" value={sec.devices.filter((d) => d.status === 'Registered').length} tone="green" />
        <Stat label="Pending approval" value={pending.length} tone="amber" />
        <Stat label="Rooted / jailbroken" value={sec.devices.filter((d) => d.rooted).length} tone="red" />
        <Stat label="Device binding" value={policy.deviceBinding ? 'On' : 'Off'} tone="blue" />
      </StatRow>
      {policy.blockRootedDevices && <Note>Rooted / jailbroken devices and failed attestation are blocked at login by policy.</Note>}
      <Tabs
        tabs={[
          { value: 'registry', label: 'Device registry', count: sec.devices.length },
          { value: 'pending', label: 'Pending device changes', count: pending.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      <DataGrid
        key={tab}
        rows={tab === 'pending' ? pending : sec.devices}
        cols={cols}
        rowKey={(d) => d.id}
        fileName={tab === 'pending' ? 'device-change-requests' : 'device-registry'}
        searchPlaceholder="Search model, user, identifier…"
        filters={filters}
        empty={tab === 'pending' ? 'No device change waiting for approval.' : undefined}
        actions={(d) =>
          d.status === 'Pending Approval' ? (
            <>
              <Button size="sm" icon={<Check size={13} />} onClick={() => setAct({ kind: 'approve', d })} disabled={d.rooted && policy.blockRootedDevices} title={d.rooted ? 'Rooted device — blocked by policy' : undefined}>
                Approve
              </Button>
              <Button size="sm" variant="danger" icon={<X size={13} />} onClick={() => setAct({ kind: 'reject', d })}>
                Reject
              </Button>
            </>
          ) : d.status === 'Registered' ? (
            <Button size="sm" variant="danger" onClick={() => setAct({ kind: 'deactivate', d })}>
              Deactivate
            </Button>
          ) : (
            <span className="text-[11px] text-muted">—</span>
          )
        }
      />
      {act && (
        <ConfirmModal
          title={act.kind === 'approve' ? `Approve ${act.d.model} for ${nameOf(act.d.accountId)}?` : act.kind === 'reject' ? 'Reject device change?' : `Deactivate ${act.d.model}?`}
          sub={act.kind === 'approve' ? 'The new device becomes the registered device; the old device is deactivated and the user’s sessions are ended.' : 'Recorded in the security audit trail.'}
          confirmLabel={act.kind === 'approve' ? 'Approve' : act.kind === 'reject' ? 'Reject' : 'Deactivate'}
          danger={act.kind !== 'approve'}
          reasonLabel={act.kind === 'approve' ? undefined : 'Reason'}
          onConfirm={run}
          onClose={() => setAct(null)}
        />
      )}
    </PageShell>
  )
}
