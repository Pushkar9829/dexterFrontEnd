// User security administration (§3 default password, §9 unlock, §10 force logout, §17 emergency block).
import { useState } from 'react'
import { Copy, KeyRound, Settings2, UserCog } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { maskEmail, maskMobile } from '@/lib/mask'
import { policyStore, securityApi, updateAccount, useSecurity, type SecurityAccount, useSecurityLoad } from '@/data/security'
import { ApiStatus, ConfirmModal, DataGrid, Note, PageShell, Stat, StatRow, type Col } from './kit'
import { terminateUserSessions } from './ops'
import { actor, apiRun, fmtDT, generatePassword } from './util'
import { apiEnabled } from '@/lib/api'

type Pending = { kind: 'block' | 'disable' | 'enable' | 'unlock' | 'unblock' | 'password' | 'mfa' | 'logout'; acc: SecurityAccount }

const ACTION_META: Record<Pending['kind'], { title: string; label: string; danger?: boolean; reason?: boolean }> = {
  block: { title: 'Block account', label: 'Block account', danger: true, reason: true },
  unblock: { title: 'Unblock account', label: 'Unblock', reason: true },
  disable: { title: 'Disable account', label: 'Disable account', danger: true, reason: true },
  enable: { title: 'Enable account', label: 'Enable' },
  unlock: { title: 'Unlock account', label: 'Unlock' },
  password: { title: 'Set default password', label: 'Generate password', reason: true },
  mfa: { title: 'Reset MFA', label: 'Reset MFA', danger: true, reason: true },
  logout: { title: 'Force logout', label: 'Terminate sessions', danger: true, reason: true },
}

export default function UsersAccess() {
  const sec = useSecurity()
  const load = useSecurityLoad()
  const [manageId, setManageId] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [oneTime, setOneTime] = useState<{ name: string; pw: string } | null>(null)

  const manage = sec.accounts.find((a) => a.id === manageId) ?? null
  const liveSessions = (id: string) => sec.sessions.filter((s) => s.accountId === id && s.status !== 'Terminated').length

  const run = (p: Pending, reason: string) => {
    const who = actor()
    const { acc } = p
    const why = reason ? ` — ${reason}` : ''
    if (apiEnabled) {
      // Backend: block / unblock → POST /users/:id/block|unblock {reason} (Blocked is its own status; /enable refuses it);
      // disable / enable → /users/:id/disable|enable (disable ends sessions); unlock → /security/users/:id/unlock;
      // default password → /users/:id/reset-password (one-time password); MFA → /users/:id/mfa/reset {reason}.
      const r = reason || undefined
      if (['block', 'unblock', 'mfa'].includes(p.kind) && reason.length < 3) {
        toast('Give a reason of at least 3 characters.', 'error')
        return
      }
      switch (p.kind) {
        case 'block':
          apiRun(securityApi.blockUser(acc.id, reason), `${acc.name} blocked and signed out.`)
          break
        case 'unblock':
          apiRun(securityApi.unblockUser(acc.id, reason), `${acc.name} unblocked.`)
          break
        case 'disable':
          apiRun(securityApi.disableUser(acc.id, r), `${acc.name} disabled and signed out.`)
          break
        case 'enable':
          apiRun(securityApi.enableUser(acc.id, r), `${acc.name} enabled.`)
          break
        case 'unlock':
          apiRun(securityApi.unlock(acc.id, r), `${acc.name} unlocked.`)
          break
        case 'password':
          securityApi
            .resetPassword(acc.id)
            .then((pw) => (pw ? setOneTime({ name: acc.name, pw }) : toast(`Temporary password issued to ${acc.name}.`)))
            .catch((e: Error) => toast(e.message, 'error'))
          break
        case 'mfa':
          apiRun(securityApi.resetMfa(acc.id, reason), `MFA reset for ${acc.name} — sessions ended; the OTP is asked (and re-enrolled) at the next sign-in.`)
          break
        case 'logout': {
          const n = terminateUserSessions(acc.id, who, `Force logout${why}`)
          toast(n ? `${n} session(s) of ${acc.name} terminated.` : `${acc.name} had no live session.`, n ? 'success' : 'info')
          break
        }
      }
      setPending(null)
      return
    }
    switch (p.kind) {
      case 'block':
        updateAccount(acc.id, { status: 'Blocked' }, { actor: who, action: 'Account blocked', detail: `${acc.name}${why}` })
        terminateUserSessions(acc.id, who, 'Account blocked')
        toast(`${acc.name} blocked and signed out.`)
        break
      case 'unblock':
        updateAccount(acc.id, { status: 'Active', failedAttempts: 0 }, { actor: who, action: 'Account unblocked', detail: `${acc.name}${why}` })
        toast(`${acc.name} unblocked.`)
        break
      case 'disable':
        updateAccount(acc.id, { status: 'Disabled' }, { actor: who, action: 'Account disabled', detail: `${acc.name}${why}` })
        terminateUserSessions(acc.id, who, 'Account disabled')
        toast(`${acc.name} disabled.`)
        break
      case 'enable':
        updateAccount(acc.id, { status: 'Active' }, { actor: who, action: 'Account enabled', detail: acc.name })
        toast(`${acc.name} enabled.`)
        break
      case 'unlock':
        updateAccount(acc.id, { status: 'Active', failedAttempts: 0, lockedAt: undefined, lockReason: undefined }, { actor: who, action: 'Account unlocked', detail: `${acc.name} (was: ${acc.lockReason ?? 'locked'})` })
        toast(`${acc.name} unlocked.`)
        break
      case 'password': {
        const pw = generatePassword(policyStore.get())
        updateAccount(
          acc.id,
          { mustChangePassword: true, passwordChangedAt: new Date().toISOString(), failedAttempts: 0, ...(acc.status === 'Locked' ? { status: 'Active', lockedAt: undefined, lockReason: undefined } : {}) },
          { actor: who, action: 'Default password set', detail: `${acc.name} — must change at next login${why}` },
        )
        terminateUserSessions(acc.id, who, 'Password reset by Admin')
        setOneTime({ name: acc.name, pw })
        break
      }
      case 'mfa':
        updateAccount(acc.id, { mfaEnrolled: false }, { actor: who, action: 'MFA reset', detail: `${acc.name} — ${acc.mfaMethod} enrolment cleared, re-enrol at next login${why}` })
        toast(`MFA reset for ${acc.name}.`)
        break
      case 'logout': {
        const n = terminateUserSessions(acc.id, who, `Force logout${why}`)
        toast(n ? `${n} session(s) of ${acc.name} terminated.` : `${acc.name} had no live session.`, n ? 'success' : 'info')
        break
      }
    }
    setPending(null)
  }

  const cols: Col<SecurityAccount>[] = [
    { key: 'name', label: 'User', value: (a) => `${a.name} ${a.id}`, render: (a) => (<><span className="font-medium text-ink">{a.name}</span><span className="block text-[10.5px] text-muted">{a.id} · {maskEmail(a.email)} · {maskMobile(a.mobile)}</span></>) },
    { key: 'role', label: 'Role', value: (a) => String(a.role) },
    { key: 'status', label: 'Status', value: (a) => a.status, render: (a) => <Badge tone={a.status === 'Active' ? 'green' : a.status === 'Locked' ? 'amber' : 'red'}>{a.status}</Badge> },
    { key: 'failed', label: 'Failed attempts', value: (a) => String(a.failedAttempts), className: 'text-center' },
    { key: 'mfa', label: 'MFA', value: (a) => `${a.mfaMethod} · ${a.mfaEnrolled ? 'Enrolled' : 'Not enrolled'}`, render: (a) => (<>{a.mfaMethod}<span className={`block text-[10.5px] ${a.mfaEnrolled ? 'text-emerald-600' : 'text-amber-600'}`}>{a.mfaEnrolled ? 'Enrolled' : 'Not enrolled'}</span></>) },
    { key: 'pw', label: 'Password', value: (a) => (a.mustChangePassword ? 'Must change' : 'OK'), render: (a) => (a.mustChangePassword ? <Badge tone="amber">Must change</Badge> : <span className="text-muted">Changed {fmtDT(a.passwordChangedAt)}</span>) },
    { key: 'last', label: 'Last login', value: (a) => fmtDT(a.lastLoginAt), className: 'whitespace-nowrap text-muted' },
  ]

  const meta = pending ? ACTION_META[pending.kind] : null

  return (
    <PageShell Icon={UserCog} color="text-blue-600 bg-blue-50 border-blue-200" title="Users & Access" sub="Unlock, block, disable, reset password / MFA and sign users out. Every action is written to the security audit trail.">
      <ApiStatus loading={load.loading} error={load.error} onRetry={load.reload} />
      <StatRow>
        <Stat label="Accounts" value={sec.accounts.length} />
        <Stat label="Locked" value={sec.accounts.filter((a) => a.status === 'Locked').length} tone="amber" />
        <Stat label="Blocked / Disabled" value={sec.accounts.filter((a) => a.status === 'Blocked' || a.status === 'Disabled').length} tone="red" />
        <Stat label="MFA not enrolled" value={sec.accounts.filter((a) => !a.mfaEnrolled).length} tone="purple" />
      </StatRow>

      <DataGrid
        rows={sec.accounts}
        cols={cols}
        rowKey={(a) => a.id}
        fileName="security-user-accounts"
        searchPlaceholder="Search name, ID, role…"
        filters={[
          { key: 'role', label: 'Roles', get: (a) => String(a.role) },
          { key: 'status', label: 'Statuses', get: (a) => a.status, options: ['Active', 'Locked', 'Blocked', 'Disabled'] },
          { key: 'mfa', label: 'MFA states', get: (a) => (a.mfaEnrolled ? 'Enrolled' : 'Not enrolled'), options: ['Enrolled', 'Not enrolled'] },
        ]}
        actions={(a) => (
          <Button size="sm" variant="secondary" icon={<Settings2 size={13} />} onClick={() => setManageId(a.id)}>
            Manage
          </Button>
        )}
      />

      {manage && !pending && !oneTime && (
        <Modal title={manage.name} sub={`${manage.id} · ${manage.role}`} onClose={() => setManageId(null)} width={720}>
          <div className="space-y-4 text-[12.5px]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><div className="text-[11px] text-muted">Status</div><Badge tone={toneFor(manage.status === 'Locked' ? 'pending' : manage.status)}>{manage.status}</Badge></div>
              <div><div className="text-[11px] text-muted">Failed attempts</div><div className="font-semibold">{manage.failedAttempts}</div></div>
              <div><div className="text-[11px] text-muted">MFA</div><div className="font-semibold">{manage.mfaMethod} · {manage.mfaEnrolled ? 'Enrolled' : 'Not enrolled'}</div></div>
              <div><div className="text-[11px] text-muted">Live sessions</div><div className="font-semibold">{liveSessions(manage.id)}</div></div>
            </div>
            {manage.lockReason && <Note tone="amber">Locked {fmtDT(manage.lockedAt)} — {manage.lockReason}</Note>}
            <div className="flex flex-wrap gap-2">
              {manage.status === 'Locked' && <Button size="sm" onClick={() => setPending({ kind: 'unlock', acc: manage })}>Unlock</Button>}
              {manage.status === 'Blocked' ? (
                <Button size="sm" variant="secondary" onClick={() => setPending({ kind: 'unblock', acc: manage })}>Unblock</Button>
              ) : (
                <Button size="sm" variant="danger" onClick={() => setPending({ kind: 'block', acc: manage })}>Block</Button>
              )}
              {manage.status === 'Blocked' ? null : manage.status === 'Disabled' ? (
                <Button size="sm" variant="secondary" onClick={() => setPending({ kind: 'enable', acc: manage })}>Enable</Button>
              ) : (
                <Button size="sm" variant="danger" onClick={() => setPending({ kind: 'disable', acc: manage })}>Disable</Button>
              )}
              <Button size="sm" variant="secondary" icon={<KeyRound size={13} />} onClick={() => setPending({ kind: 'password', acc: manage })}>Set default password</Button>
              <Button size="sm" variant="secondary" onClick={() => setPending({ kind: 'mfa', acc: manage })}>Reset MFA</Button>
              <Button size="sm" variant="danger" onClick={() => setPending({ kind: 'logout', acc: manage })}>Force logout</Button>
            </div>
            <div>
              <div className="mb-2 text-[12px] font-semibold text-ink">Login history</div>
              <DataGrid
                rows={sec.logins.filter((l) => l.accountId === manage.id)}
                rowKey={(l) => l.id}
                fileName={`login-history-${manage.id}`}
                pageSize={5}
                filters={[{ key: 'st', label: 'Statuses', get: (l) => l.status }]}
                cols={[
                  { key: 'at', label: 'Login', value: (l) => fmtDT(l.at), className: 'whitespace-nowrap' },
                  { key: 'out', label: 'Logout', value: (l) => fmtDT(l.logoutAt), className: 'whitespace-nowrap text-muted' },
                  { key: 'ip', label: 'IP / Location', value: (l) => `${l.ip} ${l.location}`, render: (l) => (<><span className="font-mono text-[11px]">{l.ip}</span><span className="block text-[10.5px] text-muted">{l.location}</span></>) },
                  { key: 'dev', label: 'Device', value: (l) => l.device },
                  { key: 'st', label: 'Status', value: (l) => `${l.status}${l.reason ? ` (${l.reason})` : ''}`, render: (l) => <Badge tone={l.status === 'Success' ? 'green' : 'red'}>{l.status}</Badge> },
                ]}
                empty="No logins recorded for this user."
              />
            </div>
          </div>
        </Modal>
      )}

      {pending && meta && (
        <ConfirmModal
          title={`${meta.title} — ${pending.acc.name}`}
          sub={pending.kind === 'password' ? 'A one-time password is generated and shown once. The user must change it at next login; live sessions are terminated.' : 'This action is recorded in the security audit trail.'}
          confirmLabel={meta.label}
          danger={meta.danger}
          reasonLabel={meta.reason ? 'Reason' : undefined}
          onConfirm={(r) => run(pending, r)}
          onClose={() => setPending(null)}
        />
      )}

      {oneTime && (
        <Modal
          title="One-time default password"
          sub={`For ${oneTime.name}. It will not be shown again.`}
          onClose={() => setOneTime(null)}
          footer={<Button onClick={() => setOneTime(null)}>Done</Button>}
        >
          <div className="space-y-3 text-[12.5px]">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5">
              <code className="flex-1 font-mono text-[15px] font-semibold tracking-wide text-ink select-all">{oneTime.pw}</code>
              <Button
                size="sm"
                variant="secondary"
                icon={<Copy size={13} />}
                onClick={() => {
                  navigator.clipboard?.writeText(oneTime.pw).then(
                    () => toast('Copied to clipboard'),
                    () => toast('Copy failed — select the text instead', 'error'),
                  )
                }}
              >
                Copy
              </Button>
            </div>
            <Note tone="amber">Share it with the user over a verified channel. The account is flagged “must change password” and the user’s sessions were terminated.</Note>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}
