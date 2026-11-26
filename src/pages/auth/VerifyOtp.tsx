import { apiEnabled } from '@/lib/api'
import { ApiVerifyOtp } from './ApiAuth'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { logSecurity, useSecurity } from '@/data/security'
import { Alert, AuthLayout, AuthTitle } from './AuthLayout'
import { OtpStep } from './parts'
import { maskEmail, maskMobile, readReset, writeReset } from './flow'

/**
 * Password-recovery OTP step (screen 05). Sign-in OTP is now the second factor and lives on
 * /login/mfa, so a "login" flow arriving here is sent back to /login.
 */
function MockVerifyOtp() {
  const navigate = useNavigate()
  const loc = useLocation()
  const security = useSecurity()
  const [reset] = useState(readReset)
  const viaSms = (loc.state as { channel?: string } | null)?.channel === 'phone'
  const acc = reset ? security.accounts.find((a) => a.id === reset.accountId) : undefined

  if (!reset || reset.verified || !acc) return <Navigate to={reset?.verified ? '/forgot-password/reset' : '/login'} replace />

  const destination = viaSms ? maskMobile(acc.mobile) : maskEmail(acc.email)

  return (
    <AuthLayout panel="intro">
      <AuthTitle title="Verify your identity" sub={<>Enter the code sent to {destination} to continue your password recovery.</>} />
      <div className="space-y-4">
        <OtpStep
          purpose="reset"
          account={acc}
          destination={destination}
          autoSent
          onVerified={() => {
            writeReset({ ...reset, verified: true })
            logSecurity({ actor: acc.name, action: 'Password reset OTP verified', target: acc.id })
            navigate('/forgot-password/reset', { replace: true })
          }}
          onFailure={(reason) => logSecurity({ actor: acc.name, action: 'Password reset OTP failed', target: acc.id, detail: reason })}
        />
        <div className="text-center">
          <Link to="/forgot-password" className="text-[14px] font-semibold text-primary hover:underline">
            Change email
          </Link>
        </div>
        <Alert title="Protected verification">Never share this OTP. Dexter India support will never ask for your code.</Alert>
      </div>
    </AuthLayout>
  )
}

/** API mode: the backend drives this step (see ApiAuth.tsx); mock mode keeps the browser simulation. */
export default function VerifyOtp() {
  return apiEnabled ? <ApiVerifyOtp /> : <MockVerifyOtp />
}
