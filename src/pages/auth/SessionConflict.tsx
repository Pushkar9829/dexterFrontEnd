import { apiEnabled } from '@/lib/api'
import { ApiSession } from './ApiAuth'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Monitor, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { usePolicy, useSecurity } from '@/data/security'
import { Alert, AuthLayout, AuthTitle } from './AuthLayout'
import { abandonLogin, conflictingSessions, nextRoute, readPending, transferSession, type Pending } from './flow'

const HERE = '/login/session'
const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Single active session (§6): the account is already signed in on another system. */
function MockSessionConflict() {
  const navigate = useNavigate()
  const policy = usePolicy()
  const security = useSecurity()
  const [pending, setPending] = useState<Pending | null>(readPending)
  const [confirming, setConfirming] = useState(false)
  const acc = pending ? security.accounts.find((a) => a.id === pending.accountId) : undefined

  if (!pending || !acc || !pending.deviceDone || pending.sessionDone || !pending.sessionConflict) return <Navigate to="/login" replace />

  const others = conflictingSessions(acc.id)
  const transfer = policy.secondSystem === 'Approved Session Transfer'

  const advance = () => {
    const r = nextRoute()
    if (r === HERE) setPending(readPending())
    else navigate(r, { replace: true })
  }
  const back = () => {
    abandonLogin()
    navigate('/login', { replace: true })
  }
  const doTransfer = () => {
    transferSession()
    advance()
  }

  return (
    <AuthLayout panel="status">
      <AuthTitle
        title={transfer ? 'Already signed in on another system' : 'Second-system login blocked'}
        sub={
          transfer
            ? 'Your User ID can be active on only one system at a time. You can move the session to this device.'
            : 'Your User ID is already active on another computer or mobile. Only one system may be signed in at a time.'
        }
      />
      <div className="space-y-4">
        {others.length > 0 ? (
          <div className="space-y-2">
            {others.map((s) => (
              <div key={s.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-[12px] text-slate-600">
                <Monitor size={18} className="mt-0.5 shrink-0 text-[#0066FF]" />
                <div className="min-w-0">
                  <div className="font-bold text-slate-800">
                    {s.device} · {s.browser}
                  </div>
                  <div>
                    IP {s.ip} · {s.location}
                  </div>
                  <div>
                    Signed in {fmt(s.startedAt)} · last active {fmt(s.lastActiveAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Alert tone="success" title="The other session has ended">
            Continue to finish signing in on this device.
          </Alert>
        )}

        {others.length === 0 ? (
          <Button size="lg" block onClick={advance}>
            <RefreshCw size={18} /> Continue
          </Button>
        ) : transfer ? (
          confirming ? (
            <div className="space-y-3">
              <Alert tone="error" title="Confirm session transfer">
                The session on {others[0].device} will be signed out immediately and any unsaved work there may be lost. Continue?
              </Alert>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="lg" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button size="lg" onClick={doTransfer}>
                  End other session
                </Button>
              </div>
            </div>
          ) : (
            <Button size="lg" block onClick={() => setConfirming(true)}>
              <ArrowLeftRight size={18} /> Request session transfer
            </Button>
          )
        ) : (
          <>
            <Alert tone="error" title="Access blocked">
              Sign out on the other system first, or ask your Admin to terminate that session. This attempt has been reported as a second-system login.
            </Alert>
            <Button variant="secondary" size="lg" block onClick={advance}>
              <RefreshCw size={18} /> I have signed out there — try again
            </Button>
          </>
        )}

        <div className="text-center">
          <button type="button" onClick={back} className="text-[14px] font-semibold text-primary hover:underline">
            Back to sign in
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}

/** API mode: the backend drives this step (see ApiAuth.tsx); mock mode keeps the browser simulation. */
export default function SessionConflict() {
  return apiEnabled ? <ApiSession /> : <MockSessionConflict />
}
