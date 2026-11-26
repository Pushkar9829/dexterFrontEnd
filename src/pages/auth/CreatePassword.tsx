import { apiEnabled } from '@/lib/api'
import { ApiCreatePassword } from './ApiAuth'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { logSecurity, updateAccount, useSecurity } from '@/data/security'
import { AuthLayout, AuthTitle } from './AuthLayout'
import { NewPasswordForm } from './parts'
import { readReset, setPassword, terminateSessions, writeReset } from './flow'

/** §3 — set the new password after the email OTP; ends every active session of the account. */
function MockCreatePassword() {
  const navigate = useNavigate()
  const security = useSecurity()
  const [reset] = useState(readReset)
  const acc = reset ? security.accounts.find((a) => a.id === reset.accountId) : undefined

  if (!reset || !reset.verified || !acc) return <Navigate to="/forgot-password" replace />

  const submit = (pw: string) => {
    setPassword(acc, pw)
    const ended = terminateSessions(acc.id)
    updateAccount(acc.id, { mustChangePassword: false, failedAttempts: 0 })
    logSecurity({ actor: acc.name, action: 'Password reset via email OTP', target: acc.id, detail: `${ended} active session(s) terminated` })
    writeReset(null)
    navigate('/forgot-password/done', { replace: true })
  }

  return (
    <AuthLayout panel="showcase">
      <AuthTitle title="Create a new password" sub="Set a strong password for secure access to ATM and cash-management operations. All other signed-in sessions will be ended." />
      <NewPasswordForm
        account={acc}
        submitLabel="Reset Password"
        onSubmit={submit}
        footer={
          <div className="text-center">
            <Link to="/login" className="text-[14px] font-semibold text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        }
      />
    </AuthLayout>
  )
}

/** API mode: the backend drives this step (see ApiAuth.tsx); mock mode keeps the browser simulation. */
export default function CreatePassword() {
  return apiEnabled ? <ApiCreatePassword /> : <MockCreatePassword />
}
