import { apiEnabled } from '@/lib/api'
import { ApiMfa } from './ApiAuth'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Fingerprint, KeyRound, LoaderCircle, Mail, MessageSquare, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { logSecurity, updateAccount, usePolicy, useSecurity, type MfaMethod, type SecurityAccount, type SecurityPolicy } from '@/data/security'
import { Alert, AuthLayout, AuthTitle } from './AuthLayout'
import { DevHint, OtpBoxes, OtpStep } from './parts'
import {
  abandonLogin,
  attemptsLeft,
  maskEmail,
  maskMobile,
  mockHash,
  nextRoute,
  otpComplete,
  otpRestrictedUntil,
  patchPending,
  readPending,
  recordMfaFailure,
  totpCode,
  totpSecret,
  verifyTotp,
  OTP_RESTRICT_MINUTES,
} from './flow'
import { useNow } from './useNow'

type Option = { method: MfaMethod; label: string; sub: string; Icon: typeof Mail; disabled?: string }

function optionsFor(acc: SecurityAccount, policy: SecurityPolicy): Option[] {
  const list: Option[] = []
  if (policy.emailOtpEnabled) list.push({ method: 'Email OTP', label: 'Email OTP', sub: `6-digit code to ${maskEmail(acc.email)}`, Icon: Mail })
  if (policy.totpEnabled) list.push({ method: 'Authenticator (TOTP)', label: 'Authenticator app', sub: 'Google / Microsoft Authenticator code', Icon: Smartphone })
  list.push({
    method: 'SMS OTP',
    label: 'SMS OTP',
    sub: `6-digit code to ${maskMobile(acc.mobile)}`,
    Icon: MessageSquare,
    disabled: policy.smsOtpEnabled ? undefined : 'Available after SMS gateway API integration',
  })
  if (policy.passkeyEnabled) list.push({ method: 'Passkey', label: 'Passkey', sub: 'Device biometrics / security key', Icon: Fingerprint })
  return list
}

/** Second factor (§5) — shown after a correct password for every role where policy requires MFA. */
function MockMfa() {
  const navigate = useNavigate()
  const policy = usePolicy()
  const security = useSecurity()
  const [pending] = useState(readPending)
  const acc = pending ? security.accounts.find((a) => a.id === pending.accountId) : undefined
  const options = acc ? optionsFor(acc, policy) : []
  const usable = options.filter((o) => !o.disabled)
  const [chosen, setChosen] = useState<MfaMethod | null>(null)
  const method = chosen ?? (usable.find((o) => o.method === acc?.mfaMethod) ?? usable[0])?.method ?? null

  if (!pending || pending.mfaDone || !acc) return <Navigate to="/login" replace />

  const complete = (m: string) => {
    patchPending({ mfaDone: true, mfaMethod: m })
    logSecurity({ actor: acc.name, action: 'MFA verified', target: acc.id, detail: m, ip: pending.ip })
    navigate(nextRoute(), { replace: true })
  }
  const fail = (reason: string) => recordMfaFailure(acc, reason)
  const back = () => {
    abandonLogin()
    navigate('/login', { replace: true })
  }

  if (!acc.mfaEnrolled && policy.totpEnabled) return <TotpEnrol acc={acc} onDone={() => complete('Authenticator (TOTP) — new enrolment')} onFail={fail} onBack={back} />

  return (
    <AuthLayout panel="showcase">
      <AuthTitle title="Two-step verification" sub={<>Password accepted for {acc.name}. Confirm it’s you with a second factor.</>} />
      <div className="space-y-4">
        <div className="grid gap-2">
          {options.map((o) => {
            const active = method === o.method
            return (
              <button
                key={o.method}
                type="button"
                disabled={!!o.disabled}
                onClick={() => setChosen(o.method)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-2.5 text-left transition-all',
                  o.disabled ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70' : 'cursor-pointer',
                  active ? 'border-[#0066FF] bg-blue-50/50 ring-4 ring-blue-500/10' : !o.disabled && 'border-slate-200 hover:border-blue-300',
                )}
              >
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl border', active ? 'border-blue-200 bg-white text-[#0066FF]' : 'border-slate-200 bg-white text-slate-500')}>
                  <o.Icon size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-slate-800">{o.label}</span>
                  <span className={cn('block text-[11.5px]', o.disabled ? 'text-amber-700' : 'text-slate-500')}>{o.disabled ?? o.sub}</span>
                </span>
              </button>
            )
          })}
        </div>

        {!method && (
          <Alert tone="error" title="No second factor available">
            Every MFA method is switched off in the security policy. Contact your Admin.
          </Alert>
        )}
        {method === 'Email OTP' && <OtpStep key="email" purpose="mfa-email" account={acc} destination={maskEmail(acc.email)} onVerified={() => complete('Email OTP')} onFailure={fail} />}
        {method === 'SMS OTP' && <OtpStep key="sms" purpose="mfa-sms" account={acc} destination={maskMobile(acc.mobile)} onVerified={() => complete('SMS OTP')} onFailure={fail} />}
        {method === 'Authenticator (TOTP)' && <TotpForm key="totp" acc={acc} submitLabel="Verify & Continue" onOk={() => complete('Authenticator (TOTP)')} onFail={fail} />}
        {method === 'Passkey' && <PasskeyStep acc={acc} onOk={() => complete('Passkey')} />}

        <div className="text-center">
          <button type="button" onClick={back} className="text-[14px] font-semibold text-primary hover:underline">
            Back to sign in
          </button>
        </div>
        <Alert title="Protected verification">Never share an OTP or authenticator code. Dexter India support will never ask for it.</Alert>
      </div>
    </AuthLayout>
  )
}

/** 6-digit authenticator code entry; each 30-second code works once. */
function TotpForm({ acc, submitLabel, onOk, onFail }: { acc: SecurityAccount; submitLabel: string; onOk: () => void; onFail: (r: string) => void }) {
  const now = useNow()
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [restricted, setRestricted] = useState<number | null>(() => otpRestrictedUntil(acc.id))
  const isRestricted = restricted !== null && restricted > now
  const secsLeft = 30 - (Math.floor(now / 1000) % 30)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!otpComplete(code)) return
    const r = verifyTotp(acc, code)
    if (r === 'ok') return onOk()
    setCode('')
    if (r === 'restricted') {
      setRestricted(otpRestrictedUntil(acc.id))
      setMsg(`Too many incorrect codes. Verification is temporarily restricted for ${OTP_RESTRICT_MINUTES} minutes. Your Admin has been alerted.`)
      onFail('Authenticator attempt limit exceeded')
      return
    }
    setMsg(r === 'used' ? 'This code was already used. Wait for the next code in your app.' : `Incorrect code. ${attemptsLeft('totp', acc.id)} attempt(s) left.`)
    onFail(r === 'used' ? 'Authenticator code reused' : 'Wrong authenticator code')
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {msg && (
        <Alert tone="error" title="Code not accepted">
          {msg}
        </Alert>
      )}
      <div>
        <div className="mb-2 text-[13px] font-semibold">Authenticator code</div>
        <OtpBoxes value={code} onChange={setCode} error={!!msg} disabled={isRestricted} />
      </div>
      <DevHint>
        current authenticator code is <strong className="font-mono tracking-widest">{totpCode(acc.id)}</strong> · changes in {secsLeft}s
      </DevHint>
      <Button type="submit" size="lg" block disabled={!otpComplete(code) || isRestricted}>
        {submitLabel}
      </Button>
    </form>
  )
}

/** Passkey (WebAuthn) — simulated until the server issues real challenges. */
function PasskeyStep({ acc, onOk }: { acc: SecurityAccount; onOk: () => void }) {
  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  const start = () => {
    setBusy(true)
    timer.current = setTimeout(() => {
      setBusy(false)
      onOk()
    }, 900)
  }
  return (
    <div className="space-y-3">
      <DevHint>the device passkey prompt for {acc.name} is simulated; the backend will issue a WebAuthn challenge.</DevHint>
      <Button type="button" size="lg" block onClick={start} disabled={busy}>
        {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Fingerprint size={18} />}
        {busy ? 'Waiting for passkey…' : 'Use passkey'}
      </Button>
    </div>
  )
}

/** Mock QR (visual only) — the real QR encodes the otpauth:// URI generated by the server. */
function MockQr({ seed }: { seed: string }) {
  const N = 25
  const cells: [number, number][] = []
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7
    for (const [ox, oy] of [
      [0, 0],
      [N - 7, 0],
      [0, N - 7],
    ]) {
      if (inBox(ox, oy)) {
        const dx = x - ox
        const dy = y - oy
        return { inside: true, on: dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) }
      }
    }
    return { inside: false, on: false }
  }
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const f = finder(x, y)
      if (f.inside ? f.on : parseInt(mockHash(`${seed}:${x}:${y}`).slice(0, 2), 16) % 2 === 0) cells.push([x, y])
    }
  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} className="h-36 w-36 rounded-lg border border-slate-200 bg-white" role="img" aria-label="Authenticator QR code (demo)">
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#0B2A6B" />
      ))}
    </svg>
  )
}

/** First-time MFA enrolment: scan QR / enter key, then confirm one code. */
function TotpEnrol({ acc, onDone, onFail, onBack }: { acc: SecurityAccount; onDone: () => void; onFail: (r: string) => void; onBack: () => void }) {
  const secret = totpSecret(acc.id)
  const grouped = secret.match(/.{1,4}/g)?.join(' ') ?? secret
  const confirm = () => {
    updateAccount(acc.id, { mfaEnrolled: true, mfaMethod: 'Authenticator (TOTP)' }, { actor: acc.name, action: 'MFA enrolled', detail: 'Authenticator app (TOTP)' })
    onDone()
  }
  return (
    <AuthLayout panel="showcase">
      <AuthTitle title="Set up two-step verification" sub={<>Two-factor authentication is mandatory for {String(acc.role)}. Link an authenticator app to finish signing in.</>} />
      <div className="space-y-4">
        <ol className="space-y-1 text-[12.5px] text-slate-600">
          <li>1. Open Google Authenticator or Microsoft Authenticator on your phone.</li>
          <li>2. Scan the QR code, or enter the setup key manually.</li>
          <li>3. Enter the 6-digit code shown in the app.</li>
        </ol>
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <MockQr seed={secret} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Setup key</div>
            <div className="mt-1 break-all font-mono text-[14px] font-bold tracking-wider text-slate-800">{grouped}</div>
            <div className="mt-2 text-[11px] text-slate-500">
              Account: Dexter India CRM · {acc.email}
              <br />
              Type: time-based, 6 digits, 30 seconds
            </div>
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <KeyRound size={12} /> Keep this key private
            </div>
          </div>
        </div>
        <TotpForm acc={acc} submitLabel="Confirm & Continue" onOk={confirm} onFail={onFail} />
        <div className="text-center">
          <button type="button" onClick={onBack} className="text-[14px] font-semibold text-primary hover:underline">
            Back to sign in
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}

/** API mode: the backend drives this step (see ApiAuth.tsx); mock mode keeps the browser simulation. */
export default function Mfa() {
  return apiEnabled ? <ApiMfa /> : <MockMfa />
}
