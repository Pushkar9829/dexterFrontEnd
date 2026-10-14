import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OtpInput } from '@/components/ui/Field'
import { signIn } from '@/lib/auth'
import { Alert, AuthLayout, AuthTitle, maskIdentity } from './AuthLayout'

type State = { channel: 'phone' | 'email'; identity: string; flow: 'login' | 'reset' }

const RESEND_SECONDS = 30

/** OTP step for both sign-in (screen 03) and password recovery (screen 05). */
export default function VerifyOtp() {
  const navigate = useNavigate()
  const state = useLocation().state as State | null
  const [code, setCode] = useState('')
  const [seconds, setSeconds] = useState(RESEND_SECONDS)
  const [expired, setExpired] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (seconds <= 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  if (!state) return <Navigate to="/login" replace />
  const isReset = state.flow === 'reset'
  const masked = maskIdentity(state.channel, state.identity)
  const back = isReset ? '/forgot-password' : '/login'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    // Demo: "000000" plays the expired/invalid state; any other 6 digits passes.
    setTimeout(() => {
      setBusy(false)
      if (code === '000000') {
        setExpired(true)
        return
      }
      if (isReset) navigate('/forgot-password/reset', { state, replace: true })
      else {
        signIn()
        navigate('/auth-success', { replace: true })
      }
    }, 600)
  }

  const resend = () => {
    setSeconds(RESEND_SECONDS)
    setExpired(false)
    setCode('')
  }

  return (
    <AuthLayout panel={isReset ? 'intro' : 'showcase'}>
      <AuthTitle
        title={isReset ? 'Verify your identity' : 'Enter verification code'}
        sub={
          isReset ? (
            <>Enter the code sent to {masked} to continue your password recovery.</>
          ) : (
            <>We sent a six-digit code to {masked}. The code remains valid for 5 minutes.</>
          )
        }
      />
      <form onSubmit={submit} className="space-y-5">
        {expired && (
          <Alert tone="error" title="Code expired">
            This code is no longer valid. Request a new OTP to continue securely.
          </Alert>
        )}
        <div>
          <div className="mb-2 text-[13px] font-semibold">One-time password</div>
          <OtpInput
            value={code}
            onChange={(v) => {
              setCode(v)
              setExpired(false)
            }}
            error={expired}
          />
          {expired && <p className="mt-2 text-[12px] text-brand-red">Invalid or expired OTP. Request a new code.</p>}
        </div>

        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted">
            {seconds > 0 ? `Resend code in 00:${String(seconds).padStart(2, '0')}` : 'Didn’t get the code?'}
          </span>
          <button type="button" disabled={seconds > 0 && !expired} onClick={resend} className="font-semibold text-primary disabled:font-medium disabled:text-muted/60">
            Resend OTP
          </button>
        </div>

        <Button type="submit" size="lg" block disabled={code.length < 6 || busy || expired} className={busy ? 'disabled:bg-primary' : undefined}>
          {busy && <LoaderCircle size={18} className="animate-spin" />}
          {busy ? 'Verifying OTP...' : 'Verify & Continue'}
        </Button>
        <div className="text-center">
          <Link to={back} className="text-[14px] font-semibold text-primary hover:underline">
            Change {state.channel === 'phone' ? 'phone number' : 'email'}
          </Link>
        </div>
        <Alert title="Protected verification">Never share this OTP. Dexter India support will never ask for your code.</Alert>
      </form>
    </AuthLayout>
  )
}
