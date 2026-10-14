import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Check, Circle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { AuthLayout, AuthTitle } from './AuthLayout'
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
    <AuthLayout>
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
          <div className="mb-2 flex justify-between text-[13px]">
            <span className="font-semibold">Password strength</span>
            <span className="font-semibold text-ink-2">{pw ? LEVELS[passed] : '—'}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={cn('h-1.5 rounded-full', i <= passed ? COLORS[passed] : 'bg-line')} />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
            {passwordRules.map((r) => {
              const met = r.test(pw)
              return (
                <li key={r.label} className={cn('flex items-center gap-2', met ? 'text-emerald-700' : 'text-muted')}>
                  {met ? <Check size={14} /> : <Circle size={12} />} {r.label}
                </li>
              )
            })}
          </ul>
        </div>

        <p className="rounded-lg bg-surface px-4 py-3 text-[13px] text-muted">
          <span className="font-semibold text-ink">Security requirement · </span>
          Your new password cannot match any of your last five passwords.
        </p>

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
