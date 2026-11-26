import { apiEnabled } from '@/lib/api'
import { ApiForcePassword } from './ApiAuth'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { logSecurity, usePolicy, useSecurity } from '@/data/security'
import { AuthLayout, AuthTitle } from './AuthLayout'
import { NewPasswordForm } from './parts'
import { abandonLogin, nextRoute, patchPending, readPending, setPassword } from './flow'

/** Forced password change (§3 last point: Admin-set default password; also password expiry §4). */
function MockForceChangePassword() {
  const navigate = useNavigate()
  const policy = usePolicy()
  const security = useSecurity()
  const [pending] = useState(readPending)
  const acc = pending ? security.accounts.find((a) => a.id === pending.accountId) : undefined

  if (!pending || !acc || !pending.mfaDone || !pending.deviceDone || !pending.sessionDone || pending.pwChanged) return <Navigate to="/login" replace />

  const submit = (pw: string) => {
    const reason = acc.mustChangePassword ? 'Admin-set default password replaced' : 'Expired password replaced'
    setPassword(acc, pw)
    logSecurity({ actor: acc.name, action: 'Password changed at sign-in', target: acc.id, detail: reason, ip: pending.ip })
    patchPending({ pwChanged: true })
    navigate(nextRoute(), { replace: true })
  }
  const back = () => {
    abandonLogin()
    navigate('/login', { replace: true })
  }

  return (
    <AuthLayout panel="showcase">
      <AuthTitle
        title="Set a new password"
        sub={
          acc.mustChangePassword
            ? 'Your Admin issued a default password for this account. Choose your own password before entering the CRM.'
            : `Your password is older than ${policy.passwordExpiryDays} days and has expired. Choose a new one to continue.`
        }
      />
      <NewPasswordForm
        account={acc}
        submitLabel="Save password & continue"
        onSubmit={submit}
        footer={
          <div className="text-center">
            <button type="button" onClick={back} className="text-[14px] font-semibold text-primary hover:underline">
              Cancel and sign out
            </button>
          </div>
        }
      />
    </AuthLayout>
  )
}

/** API mode: the backend drives this step (see ApiAuth.tsx); mock mode keeps the browser simulation. */
export default function ForceChangePassword() {
  return apiEnabled ? <ApiForcePassword /> : <MockForceChangePassword />
}
