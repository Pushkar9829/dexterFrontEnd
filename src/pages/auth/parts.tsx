import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Check, FlaskConical, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { passwordRules, usePolicy, type SecurityAccount } from '@/data/security'
import { Alert } from './AuthLayout'
import {
  attemptsLeft,
  fmtClock,
  isRecentPassword,
  issueOtp,
  otpRestrictedUntil,
  readOtp,
  resendsLeft,
  verifyOtp,
  OTP_RESTRICT_MINUTES,
  otpComplete,
  type OtpChallenge,
  type OtpPurpose,
} from './flow'
import { useNow } from './useNow'

const LEN = 6

/** Six positional digit boxes (fully controlled — blanks are kept as spaces). */
export function OtpBoxes({ value, onChange, error, disabled }: { value: string; onChange: (v: string) => void; error?: boolean; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const cells = Array.from({ length: LEN }, (_, i) => (value[i] ?? ' ').trim())
  const emit = (next: string[]) => onChange(next.map((c) => c || ' ').join('').trimEnd())

  return (
    <div className="flex gap-2.5 sm:gap-3">
      {cells.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, '')
            const incoming = typed.length > 1 && d ? typed.replace(d, '') || typed.slice(-1) : typed
            const next = cells.slice()
            if (incoming.length > 1) {
              for (let k = 0; k < incoming.length && i + k < LEN; k++) next[i + k] = incoming[k]
              emit(next)
              refs.current[Math.min(i + incoming.length, LEN - 1)]?.focus()
              return
            }
            next[i] = incoming
            emit(next)
            if (incoming && i < LEN - 1) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus()
          }}
          onPaste={(e) => {
            const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LEN)
            if (p) {
              e.preventDefault()
              emit(Array.from({ length: LEN }, (_, k) => p[k] ?? ''))
              refs.current[Math.min(p.length, LEN - 1)]?.focus()
            }
          }}
          className={cn(
            'h-12 w-full min-w-0 rounded-lg border bg-white text-center text-[20px] font-semibold outline-none transition-shadow focus:ring-3 disabled:bg-slate-50 disabled:text-slate-400 sm:h-[50px]',
            error ? 'border-brand-red bg-red-50/40 focus:ring-red-100' : 'border-line focus:border-primary focus:ring-primary/10',
          )}
        />
      ))}
    </div>
  )
}

/** Demo-only helper box — the real code is delivered by email / authenticator app. */
export function DevHint({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 px-3 py-2 text-[11.5px] text-amber-800">
      <FlaskConical size={14} className="mt-px shrink-0" />
      <div>
        <span className="font-bold">Demo / UAT: </span>
        {children}
      </div>
    </div>
  )
}

type Msg = { tone: 'error' | 'success' | 'info'; title: string; text?: string } | null

/**
 * Email (or SMS) OTP step with validity countdown, limited resends, limited verification
 * attempts and one-time use (§3, §5). Used by MFA, new-device verification and password reset.
 */
export function OtpStep({
  purpose,
  account,
  destination,
  submitLabel = 'Verify & Continue',
  onVerified,
  onFailure,
  autoSent,
}: {
  purpose: OtpPurpose
  account: SecurityAccount
  destination: string
  submitLabel?: string
  onVerified: () => void
  onFailure?: (reason: string) => void
  /** true when the first code was already issued by the previous step */
  autoSent?: boolean
}) {
  const policy = usePolicy()
  const now = useNow()
  const [challenge, setChallenge] = useState<OtpChallenge | null>(() => readOtp(purpose, account.id))
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<Msg>(null)
  const [restricted, setRestricted] = useState<number | null>(() => otpRestrictedUntil(account.id))
  const [left, setLeft] = useState(() => attemptsLeft(purpose, account.id))
  const [busy, setBusy] = useState(false)

  const isRestricted = restricted !== null && restricted > now
  const expired = !!challenge && now > challenge.expiresAt
  const live = !!challenge && !challenge.used && !expired

  const send = () => {
    const r = issueOtp(purpose, account.id)
    setCode('')
    if (!r.ok) {
      setMsg({ tone: 'error', title: 'Cannot send a new code', text: r.reason })
      setRestricted(otpRestrictedUntil(account.id))
      return
    }
    setChallenge(r.challenge)
    setLeft(attemptsLeft(purpose, account.id))
    setMsg({ tone: 'success', title: r.challenge.sends > 1 ? 'New code sent' : 'Code sent', text: `A 6-digit code was sent to ${destination}. Earlier codes no longer work.` })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!otpComplete(code) || busy) return
    setBusy(true)
    const r = verifyOtp(purpose, account, code)
    setBusy(false)
    setChallenge(readOtp(purpose, account.id))
    setLeft(attemptsLeft(purpose, account.id))
    if (r === 'ok') return onVerified()
    setCode('')
    if (r === 'restricted') {
      setRestricted(otpRestrictedUntil(account.id))
      setMsg({ tone: 'error', title: 'Too many incorrect codes', text: `Verification is temporarily restricted for ${OTP_RESTRICT_MINUTES} minutes. Your Admin has been alerted.` })
      onFailure?.('OTP attempt limit exceeded')
      return
    }
    const text =
      r === 'expired' ? 'This code has expired. Request a new code.' : r === 'used' ? 'This code was already used. Each OTP works only once — request a new one.' : r === 'missing' ? 'Request a code first.' : `Incorrect code. ${attemptsLeft(purpose, account.id)} attempt(s) left.`
    setMsg({ tone: 'error', title: r === 'wrong' ? 'Incorrect code' : 'Code not valid', text })
    onFailure?.(r === 'wrong' ? 'Wrong OTP' : `OTP ${r}`)
  }

  const canResend = resendsLeft(challenge) > 0 && !isRestricted

  return (
    <form onSubmit={submit} className="space-y-4">
      {msg && (
        <Alert tone={msg.tone} title={msg.title}>
          {msg.text}
        </Alert>
      )}
      {!msg && autoSent && challenge && !challenge.used && (
        <Alert tone="info" title="Code sent">
          A 6-digit code was sent to {destination}.
        </Alert>
      )}

      {!challenge || challenge.used ? (
        <Button type="button" size="lg" block onClick={send} disabled={isRestricted}>
          Send code to {destination}
        </Button>
      ) : (
        <>
          <div>
            <div className="mb-2 text-[13px] font-semibold">One-time password</div>
            <OtpBoxes value={code} onChange={setCode} error={msg?.tone === 'error'} disabled={isRestricted || expired} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
            <span className={cn('font-medium', expired ? 'text-brand-red' : 'text-muted')}>
              {expired ? 'Code expired' : `Code valid for ${fmtClock(challenge.expiresAt - now)}`} · {left} attempt(s) left
            </span>
            <button type="button" disabled={!canResend} onClick={send} className="font-semibold text-primary disabled:font-medium disabled:text-muted/60">
              Resend OTP ({resendsLeft(challenge)} left)
            </button>
          </div>
          {live && (
            <DevHint>
              code sent to {destination} is <strong className="font-mono tracking-widest">{challenge.code}</strong> (valid {policy.otpValidityMinutes} min, single use).
            </DevHint>
          )}
          <Button type="submit" size="lg" block disabled={!otpComplete(code) || busy || isRestricted || expired}>
            {busy && <LoaderCircle size={18} className="animate-spin" />}
            {submitLabel}
          </Button>
        </>
      )}
    </form>
  )
}

const LEVELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
const COLORS = ['bg-line', 'bg-brand-red', 'bg-accent-amber', 'bg-accent-blue', 'bg-accent-green']

/** New password + confirm, checked against the central policy (§4) and password history. */
export function NewPasswordForm({ account, submitLabel, onSubmit, footer }: { account: SecurityAccount | null; submitLabel: string; onSubmit: (pw: string) => void; footer?: ReactNode }) {
  const policy = usePolicy()
  const rules = passwordRules(policy)
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')

  const passed = rules.filter((r) => r.test(pw)).length
  const level = pw ? Math.min(4, Math.round((passed / rules.length) * 4)) : 0
  const mismatch = touched && confirm.length > 0 && confirm !== pw
  const ok = passed === rules.length && pw === confirm

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!ok) return
    if (account && isRecentPassword(account, pw, policy)) {
      setError(`This password matches your current or one of your last ${policy.passwordHistory} passwords. Choose a different one.`)
      return
    }
    onSubmit(pw)
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <PasswordInput
        label="New password"
        name="new"
        value={pw}
        onChange={(e) => {
          setPw(e.target.value)
          setError('')
        }}
        autoComplete="new-password"
      />
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
          <span className={cn('font-semibold', level === 4 ? 'text-emerald-700' : 'text-ink-2')}>{pw ? LEVELS[level] : '—'}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={cn('h-1 rounded-full', i <= level ? COLORS[level] : 'bg-line')} />
          ))}
        </div>
        <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
          {rules.map((r) => {
            const met = r.test(pw)
            return (
              <li key={r.label} className={cn('flex items-center gap-1', met ? 'text-muted' : 'text-muted/60')}>
                <Check size={12} className={met ? 'text-emerald-700' : ''} /> {r.label}
              </li>
            )
          })}
        </ul>
      </div>

      {error ? (
        <Alert tone="error" title="Password used recently">
          {error}
        </Alert>
      ) : (
        <Alert title="Security requirement">Your new password cannot match your current password or any of your last {policy.passwordHistory} passwords.</Alert>
      )}

      <Button type="submit" size="lg" block disabled={!ok}>
        {submitLabel}
      </Button>
      {footer}
    </form>
  )
}
