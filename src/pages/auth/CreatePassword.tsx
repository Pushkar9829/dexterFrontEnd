import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { Alert, AuthLayout, AuthTitle } from './AuthLayout'
import { passwordRules } from './validation'

const LEVELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
const COLORS = ['bg-line', 'bg-brand-red', 'bg-accent-amber', 'bg-accent-blue', 'bg-accent-green']

export default function CreatePassword() {
  const navigate = useNavigate()
  const state = useLocation().state
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)

  if (!state) return <Navigate to="/forgot-password" replace />

  const passed = passwordRules.filter((r) => r.test(pw)).length
  const mismatch = touched && confirm.length > 0 && confirm !== pw
  const ok = passed === passwordRules.length && pw === confirm

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (ok) navigate('/forgot-password/done', { replace: true })
  }

  return (
    <AuthLayout panel="showcase">
      <AuthTitle title="Create a new password" sub="Set a strong password for secure access to ATM and cash-management operations." />
      <form onSubmit={submit} className="space-y-5">
        <PasswordInput label="New password" name="new" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        <PasswordInput
          label="Confirm password"
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onBlur={() => setTouched(true)}
          error={mismatch ? 'Passwords do not match.' : undefined}
          autoComplete="new-password"
        />

        <div>
          <div className="mb-2 flex justify-between text-[12px]">
            <span className="text-muted">Password strength</span>
            <span className={cn('font-semibold', passed === 4 ? 'text-emerald-700' : 'text-ink-2')}>{pw ? LEVELS[passed] : '—'}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={cn('h-1 rounded-full', i <= passed ? COLORS[passed] : 'bg-line')} />
            ))}
          </div>
          <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
            {passwordRules.map((r) => {
              const met = r.test(pw)
              return (
                <li key={r.label} className={cn('flex items-center gap-1', met ? 'text-muted' : 'text-muted/60')}>
                  <Check size={12} className={met ? 'text-emerald-700' : ''} /> {r.label}
                </li>
              )
            })}
          </ul>
        </div>

        <Alert title="Security requirement">Your new password cannot match any of your last five passwords.</Alert>

        <Button type="submit" size="lg" block disabled={!ok}>
          Reset Password
        </Button>
        <div className="text-center">
          <Link to="/login" className="text-[14px] font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
