import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AuthLayout } from './AuthLayout'

function SuccessIcon() {
  return (
    <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
      <CheckCircle2 size={34} />
    </span>
  )
}

/** Screen 07 — password reset done. */
export function ResetSuccess() {
  const navigate = useNavigate()
  return (
    <AuthLayout>
      <div className="py-4 text-center">
        <SuccessIcon />
        <h1 className="mt-5 text-[24px] font-bold">Password reset successfully</h1>
        <p className="mt-2 text-[15px] text-muted">Your account is protected with the new password. Sign in to continue managing your operations.</p>
        <Button size="lg" block className="mt-7" onClick={() => navigate('/login', { replace: true })}>
          Return to Sign In
        </Button>
      </div>
    </AuthLayout>
  )
}

/** Screen 08 — signed in, redirecting to the dashboard. */
export function AuthSuccess() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(10)

  useEffect(() => {
    const t = setInterval(() => setProgress((p) => Math.min(100, p + 15)), 180)
    const done = setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
    return () => {
      clearInterval(t)
      clearTimeout(done)
    }
  }, [navigate])

  return (
    <AuthLayout>
      <div className="py-4 text-center">
        <SuccessIcon />
        <h1 className="mt-5 text-[24px] font-bold">Authentication successful</h1>
        <p className="mt-2 text-[15px] text-muted">Secure session established. Taking you to the Dexter India CRM dashboard now.</p>
        <div className="mt-7 text-left text-[13px] text-muted">Redirecting to CRM dashboard...</div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-muted">
          <ShieldCheck size={14} /> Encrypted session · Role permissions verified
        </div>
      </div>
    </AuthLayout>
  )
}
