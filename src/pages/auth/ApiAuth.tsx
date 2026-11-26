// API-mode sign-in screens (backend /auth/*). The mock screens in this folder keep running when
// VITE_API_URL is not set; each of them renders the matching screen below in API mode.
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, ArrowRight, Eye, EyeOff, Hourglass, LoaderCircle, Lock, Mail, Monitor, MonitorSmartphone, Phone, RefreshCw, ShieldAlert, ShieldX, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { policyStore, usePolicy } from '@/data/security'
import { Alert, AuthLayout, AuthTitle } from './AuthLayout'
import { DevHint, NewPasswordForm, OtpBoxes } from './parts'
import { detectLocation, fmtClock, otpComplete } from './flow'
import { apiLogin, authCall, authErrorText, clearApiPending, readApiPending, routeForStep, setDemoDevice, usingDemoDevice, DEMO_DEVICE_ID, type ApiPending, type OtpInfo, type StepResult } from './apiFlow'
import { isEmail, isPhone } from './validation'
import { useNow } from './useNow'

type Notice = { tone: 'error' | 'info'; title: string; text: string } | null
const DEMO_PASSWORD = 'Dexter@2026'

/** Backend demo personas (seeded users; all pre-registered on the demo device). */
const PERSONAS = [
  { label: 'Super Admin', name: 'Paras Dubey', email: 'admin@dexterindia.com' },
  { label: 'Admin', name: 'Meera Iyer', email: 'meera.iyer@dexterindia.in' },
  { label: 'Finance Team', name: 'Priya Nair', email: 'priya.nair@dexterindia.in' },
  { label: 'Legal Team', name: 'Kavita Rao', email: 'kavita.rao@dexterindia.in' },
  { label: 'Project Head', name: 'Rohit Verma', email: 'rohit.verma@dexterindia.in' },
  { label: 'Operations Team', name: 'Vikram Mehta', email: 'ops.lead@dexterindia.in' },
  { label: 'MIS Team', name: 'Deepak Joshi', email: 'deepak.joshi@dexterindia.in' },
  { label: 'Field Officer / TL', name: 'Manoj Kumar', email: 'manoj.kumar@dexterindia.in' },
  { label: 'Engineer', name: 'Ajay Chauhan', email: 'ajay.chauhan@dexterindia.in' },
  { label: 'Franchisee', name: 'Ranjeet Pal', email: 'ranjeetpal@gmail.com' },
  { label: 'Sub-Admin', name: 'Arjun Sethi', email: 'arjun.sethi@dexterindia.in' },
]

/** Pull the public password policy into the policy store so the password forms show the server rules. */
function usePasswordPolicy() {
  useEffect(() => {
    authCall<Partial<ReturnType<typeof policyStore.get>>>('/auth/password-policy', undefined, 'GET')
      .then((p) => policyStore.set((s) => ({ ...s, ...p })))
      .catch(() => undefined)
  }, [])
}

const back = (navigate: ReturnType<typeof useNavigate>) => () => {
  clearApiPending()
  navigate('/login', { replace: true })
}

// ── Step 1: identity + password ──────────────────────────────────────────
export function ApiLogin() {
  const navigate = useNavigate()
  const loc = useLocation()
  const policy = usePolicy()
  const expiredBanner = (loc.state as { expired?: boolean; reason?: string } | null) ?? null
  const [channel, setChannel] = useState<'phone' | 'email'>('email')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('meera.iyer@dexterindia.in')
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [show, setShow] = useState(false)
  const [demoDevice, setDemoDeviceOn] = useState(() => usingDemoDevice() || !localStorage.getItem('dexter.deviceId'))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [captcha, setCaptcha] = useState<{ captchaId: string; question: string } | null>(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  usePasswordPolicy()

  const loadCaptcha = () =>
    authCall<{ captchaId: string; question: string }>('/auth/captcha', undefined, 'GET')
      .then((c) => {
        setCaptcha(c)
        setCaptchaAnswer('')
      })
      .catch(() => undefined)

  const identity = channel === 'phone' ? phone.replace(/\D/g, '') : email.trim()
  const valid = (channel === 'phone' ? isPhone(phone) : isEmail(email)) && !!password && (!captcha || !!captchaAnswer.trim())

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || !valid) return
    setNotice(null)
    setBusy(true)
    setDemoDevice(demoDevice)
    try {
      const location = await detectLocation(2500)
      const route = await apiLogin(identity, password, location, captcha ? { id: captcha.captchaId, answer: captchaAnswer.trim() } : undefined)
      navigate(route, { replace: true })
    } catch (err) {
      setNotice({ tone: 'error', ...authErrorText(err) })
      const det = err instanceof ApiError ? (err.details as { captchaRequired?: boolean } | undefined) : undefined
      if (det?.captchaRequired) loadCaptcha()
      else setCaptcha(null)
    } finally {
      setBusy(false)
    }
  }

  const reasonText =
    expiredBanner?.reason === 'LOGGED_IN_ELSEWHERE'
      ? { title: 'Signed in on another system', text: 'Your account signed in on another computer or mobile, so this session was ended. Sign in again to continue here.' }
      : expiredBanner?.reason === 'SESSION_REVOKED'
        ? { title: 'Session ended', text: 'Your session was ended by an Admin or for security reasons. Sign in again.' }
        : expiredBanner?.expired || expiredBanner?.reason
          ? { title: 'Session expired', text: `For your security you were signed out after ${policy.sessionIdleMinutes} minutes without activity (or the session expired). Sign in again to continue.` }
          : null
  const inputBox = 'rounded-2xl border border-slate-200/90 bg-white p-2.5 flex items-center gap-3 shadow-2xs focus-within:border-[#0066FF] focus-within:ring-4 focus-within:ring-blue-500/10 transition-all'
  const seg = (a: boolean) => `flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${a ? 'bg-white text-[#0066FF] shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'}`

  return (
    <AuthLayout panel="showcase">
      <div className="mb-4">
        <h1 className="text-[25px] sm:text-[27px] font-black text-[#0B2A6B] tracking-tight">Welcome back</h1>
        <p className="text-[13px] text-slate-500 font-medium mt-1 leading-relaxed">Registered mobile number or email, password, then a second factor.</p>
      </div>
      {reasonText && (
        <div className="mb-4">
          <Alert tone="info" title={reasonText.title}>
            {reasonText.text}
          </Alert>
        </div>
      )}
      <div className="mb-5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2.5">
        <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <Users size={12} /> Demo accounts (live backend)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PERSONAS.map((p) => (
            <button
              key={p.email}
              type="button"
              onClick={() => {
                setChannel('email')
                setEmail(p.email)
                setPassword(DEMO_PASSWORD)
                setNotice(null)
              }}
              className={cn('rounded-lg border px-2 py-1 text-[11px] font-bold transition-all cursor-pointer', email === p.email && channel === 'email' ? 'border-blue-200 bg-white text-[#0066FF] shadow-xs' : 'border-transparent text-slate-600 hover:bg-white/70')}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 px-1 text-[11px] text-slate-600">
          <input type="checkbox" checked={demoDevice} onChange={(e) => setDemoDeviceOn(e.target.checked)} className="accent-[#0066FF]" />
          Use the pre-registered demo device (<span className="font-mono">{DEMO_DEVICE_ID}</span>) — otherwise this browser counts as a new device
        </label>
        <div className="mt-2 rounded-lg bg-white px-2 py-1.5 text-[11px] text-slate-600 border border-slate-200/80">
          Demo password: <strong className="font-mono text-slate-900">{DEMO_PASSWORD}</strong>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/90 text-xs font-bold">
          <button type="button" onClick={() => setChannel('phone')} className={seg(channel === 'phone')}>
            <Phone size={13.5} /> Mobile Number
          </button>
          <button type="button" onClick={() => setChannel('email')} className={seg(channel === 'email')}>
            <Mail size={13.5} /> Email ID
          </button>
        </div>
        {channel === 'phone' ? (
          <div className={inputBox}>
            <div className="h-10 px-2.5 rounded-xl bg-blue-50/80 text-[#0066FF] font-black text-xs flex items-center border border-blue-100">+91</div>
            <input aria-label="Registered mobile number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))} placeholder="Enter 10-digit mobile number" autoComplete="tel" className="flex-1 bg-transparent text-[13.5px] font-bold focus:outline-none" />
          </div>
        ) : (
          <div className={inputBox}>
            <Mail size={18} className="ml-2 text-[#0066FF]" />
            <input aria-label="Registered email ID" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@dexterindia.in" autoComplete="email" className="flex-1 bg-transparent text-[13.5px] font-bold focus:outline-none" />
          </div>
        )}
        <div className={inputBox}>
          <Lock size={18} className="ml-2 text-[#0066FF]" />
          <input aria-label="Password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your account password" autoComplete="current-password" className="flex-1 bg-transparent text-[13.5px] font-bold focus:outline-none" />
          <button type="button" onClick={() => setShow((s) => !s)} className="p-1 text-slate-400" aria-label="Toggle password visibility">
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {captcha && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
              <ShieldAlert size={13} /> Security check
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="select-none rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-[15px] font-black text-slate-800">{captcha.question}</span>
              <input value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value.slice(0, 10))} aria-label="CAPTCHA answer" placeholder="?" className="h-10 w-20 rounded-lg border border-amber-200 bg-white px-2 text-center text-[15px] font-bold" />
              <button type="button" onClick={loadCaptcha} aria-label="New challenge" className="p-2 text-amber-700">
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
        )}
        {notice && (
          <Alert tone={notice.tone} title={notice.title}>
            {notice.text}
          </Alert>
        )}
        <div className="flex justify-end text-xs">
          <Link to="/forgot-password" className="font-bold text-[12px] text-[#0066FF] hover:underline">
            Forgot password?
          </Link>
        </div>
        <button type="submit" disabled={busy || !valid} className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-bold text-[14px] shadow-lg shadow-blue-500/25 disabled:opacity-70 cursor-pointer">
          {busy ? (
            <>
              <LoaderCircle size={18} className="animate-spin" /> Verifying credentials…
            </>
          ) : (
            <>
              Sign In <ArrowRight size={17} />
            </>
          )}
        </button>
        <p className="text-center text-[10px] text-slate-400">Every sign-in attempt is recorded with IP, location and device.</p>
      </form>
    </AuthLayout>
  )
}

// ── OTP entry shared by MFA and device verification ──────────────────────
function OtpForm({ pending, purpose, verifyPath, submitLabel }: { pending: ApiPending; purpose: 'mfa' | 'device'; verifyPath: string; submitLabel: string }) {
  const navigate = useNavigate()
  const now = useNow()
  const res = pending.res as { challengeId: string; otp: OtpInfo }
  const [otp, setOtp] = useState<OtpInfo>(res.otp)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Notice>(null)
  const left = new Date(otp.expiresAt).getTime() - now

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    if (!otpComplete(code) || busy) return
    setBusy(true)
    setMsg(null)
    try {
      const r = await authCall<StepResult>(verifyPath, { challengeId: res.challengeId, code })
      navigate(routeForStep(r), { replace: true })
    } catch (err) {
      setCode('')
      if (err instanceof ApiError && ['DEVICE_APPROVAL_PENDING', 'DEVICE_REJECTED', 'DEVICE_ROOTED'].includes(err.code)) {
        navigate('/login/device', { replace: true, state: { blocked: err.code, message: err.message } })
        return
      }
      if (err instanceof ApiError && err.code === 'CHALLENGE_EXPIRED') {
        clearApiPending()
        navigate('/login', { replace: true })
        return
      }
      setMsg({ tone: 'error', ...authErrorText(err) })
    } finally {
      setBusy(false)
    }
  }
  const resend = async () => {
    setMsg(null)
    try {
      const r = await authCall<OtpInfo | { otp: OtpInfo }>('/auth/otp/resend', { challengeId: res.challengeId, purpose })
      setOtp('otp' in r ? r.otp : r)
      setMsg({ tone: 'info', title: 'New code sent', text: `A new code was sent to ${otp.sentTo}.` })
    } catch (err) {
      setMsg({ tone: 'error', ...authErrorText(err) })
    }
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <div className="text-[12.5px] text-slate-600">
        Code sent by {otp.channel} to <b>{otp.sentTo || 'your registered contact'}</b>. {left > 0 ? <>Valid for {fmtClock(left)}.</> : <span className="text-rose-600">Expired — request a new one.</span>}
      </div>
      {msg && (
        <Alert tone={msg.tone} title={msg.title}>
          {msg.text}
        </Alert>
      )}
      <OtpBoxes value={code} onChange={setCode} error={msg?.tone === 'error'} />
      {otp.devOtp && (
        <DevHint>
          the server is in dev mode — your code is <strong className="font-mono tracking-widest">{otp.devOtp}</strong>
        </DevHint>
      )}
      <Button type="submit" size="lg" block disabled={!otpComplete(code) || busy}>
        {busy ? <LoaderCircle size={18} className="animate-spin" /> : null} {submitLabel}
      </Button>
      <div className="text-center text-[12.5px]">
        <button type="button" onClick={resend} disabled={otp.resendsLeft <= 0} className="font-semibold text-primary hover:underline disabled:text-muted disabled:no-underline">
          Resend code {otp.resendsLeft >= 0 ? `(${otp.resendsLeft} left)` : ''}
        </button>
      </div>
    </form>
  )
}

// ── Step 2: MFA ─────────────────────────────────────────────────────────
export function ApiMfa() {
  const navigate = useNavigate()
  const [pending] = useState(readApiPending)
  if (!pending || pending.res.step !== 'mfa') return <Navigate to="/login" replace />
  return (
    <AuthLayout panel="showcase">
      <AuthTitle title="Two-step verification" sub={<>Password accepted. Confirm it’s you with the one-time code ({pending.res.method}).</>} />
      <div className="space-y-4">
        <OtpForm pending={pending} purpose="mfa" verifyPath="/auth/mfa/verify" submitLabel="Verify & Continue" />
        <div className="text-center">
          <button type="button" onClick={back(navigate)} className="text-[14px] font-semibold text-primary hover:underline">
            Back to sign in
          </button>
        </div>
        <Alert title="Protected verification">Never share an OTP. Dexter India support will never ask for it.</Alert>
      </div>
    </AuthLayout>
  )
}

// ── Step 3: new-device verification / device blocked ─────────────────────
export function ApiDevice() {
  const navigate = useNavigate()
  const loc = useLocation()
  const blocked = loc.state as { blocked?: string; message?: string } | null
  const [pending] = useState(readApiPending)

  const card = pending && (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-[12px] text-slate-600">
      <MonitorSmartphone size={18} className="mt-0.5 shrink-0 text-[#0066FF]" />
      <div className="min-w-0">
        <div className="font-bold text-slate-800">{pending.device}</div>
        <div>{pending.location || 'Location not shared'}</div>
      </div>
    </div>
  )

  if (blocked?.blocked) {
    const waiting = blocked.blocked === 'DEVICE_APPROVAL_PENDING'
    return (
      <AuthLayout panel="status">
        <AuthTitle title={waiting ? 'Waiting for Admin approval of this device' : 'This device is not authorised'} sub={blocked.message} />
        <div className="space-y-4">
          {card}
          <Alert tone={waiting ? 'info' : 'error'} title={waiting ? 'What happens next' : 'Access blocked'}>
            {waiting ? 'Your Admin has been notified. Once the device is approved under Security → Devices, sign in again.' : 'Use your registered device, or ask your Admin to approve a device change. This attempt has been reported.'}
          </Alert>
          <Button size="lg" block onClick={back(navigate)}>
            {waiting ? <Hourglass size={18} /> : <ShieldX size={18} />} Back to sign in
          </Button>
        </div>
      </AuthLayout>
    )
  }
  if (!pending || pending.res.step !== 'device_verification') return <Navigate to="/login" replace />
  return (
    <AuthLayout panel="showcase">
      <AuthTitle title="Verify this new device" sub="You are signing in from a device that is not registered to your account. Enter the code we sent you." />
      <div className="space-y-4">
        {card}
        <OtpForm pending={pending} purpose="device" verifyPath="/auth/device/verify" submitLabel="Verify device" />
        <div className="text-center">
          <button type="button" onClick={back(navigate)} className="text-[14px] font-semibold text-primary hover:underline">
            Back to sign in
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}

// ── Step 4: single active session (Approved Session Transfer) ────────────
export function ApiSession() {
  const navigate = useNavigate()
  const [pending] = useState(readApiPending)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Notice>(null)
  if (!pending || pending.res.step !== 'session_conflict') return <Navigate to="/login" replace />
  const res = pending.res
  const transfer = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await authCall<StepResult>('/auth/session/transfer', { challengeId: res.challengeId })
      navigate(routeForStep(r), { replace: true })
    } catch (err) {
      setMsg({ tone: 'error', ...authErrorText(err) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <AuthLayout panel="status">
      <AuthTitle title="Already signed in on another system" sub="Your User ID can be active on only one system at a time. You can move the session to this device." />
      <div className="space-y-4">
        {res.activeOn.map((s, i) => (
          <div key={i} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-[12px] text-slate-600">
            <Monitor size={18} className="mt-0.5 shrink-0 text-[#0066FF]" />
            <div>
              <div className="font-bold text-slate-800">{s.device}</div>
              <div>
                {s.ip ? `IP ${s.ip} · ` : ''}since {new Date(s.since).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {msg && (
          <Alert tone={msg.tone} title={msg.title}>
            {msg.text}
          </Alert>
        )}
        <Button size="lg" block onClick={transfer} disabled={busy || !res.transferAllowed}>
          <ArrowLeftRight size={18} /> End the other session and continue here
        </Button>
        <div className="text-center">
          <button type="button" onClick={back(navigate)} className="text-[14px] font-semibold text-primary hover:underline">
            Back to sign in
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}

// ── Step 5: forced / expired password change ─────────────────────────────
export function ApiForcePassword() {
  const navigate = useNavigate()
  const policy = usePolicy()
  const [pending] = useState(readApiPending)
  const [msg, setMsg] = useState<Notice>(null)
  usePasswordPolicy()
  if (!pending || pending.res.step !== 'password_change') return <Navigate to="/login" replace />
  const res = pending.res
  const submit = async (pw: string) => {
    setMsg(null)
    try {
      const r = await authCall<StepResult>('/auth/password/change-on-login', { challengeId: res.challengeId, newPassword: pw })
      navigate(routeForStep(r), { replace: true })
    } catch (err) {
      setMsg({ tone: 'error', ...authErrorText(err) })
    }
  }
  return (
    <AuthLayout panel="showcase">
      <AuthTitle
        title="Set a new password"
        sub={res.reason === 'must_change' ? 'Your Admin issued a default password for this account. Choose your own password before entering the CRM.' : `Your password is older than ${policy.passwordExpiryDays} days and has expired. Choose a new one to continue.`}
      />
      {msg && (
        <div className="mb-3">
          <Alert tone={msg.tone} title={msg.title}>
            {msg.text}
          </Alert>
        </div>
      )}
      <NewPasswordForm
        account={null}
        submitLabel="Save password & continue"
        onSubmit={submit}
        footer={
          <div className="text-center">
            <button type="button" onClick={back(navigate)} className="text-[14px] font-semibold text-primary hover:underline">
              Cancel and sign out
            </button>
          </div>
        }
      />
    </AuthLayout>
  )
}

// ── Password reset: identity → code → new password (POST /auth/password/forgot, /reset) ──
const RESET_KEY = 'dexter.auth.apiReset'
type ResetState = { identity: string; code?: string; startedAt: number; message?: string }
const readReset = (): ResetState | null => {
  try {
    const r = JSON.parse(sessionStorage.getItem(RESET_KEY) ?? 'null') as ResetState | null
    return r && Date.now() - r.startedAt < 15 * 60_000 ? r : null
  } catch {
    return null
  }
}
const writeReset = (r: ResetState | null) => {
  try {
    if (r) sessionStorage.setItem(RESET_KEY, JSON.stringify(r))
    else sessionStorage.removeItem(RESET_KEY)
  } catch {
    /* ignore */
  }
}

export function ApiForgotPassword() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const valid = isEmail(value) || isPhone(value)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError('')
    try {
      // The answer is the same for unknown / inactive / active accounts ({sent, message}) — no channel or masked
      // address any more, so the next step shows a generic notice and always continues to the code entry.
      const r = await authCall<{ sent?: boolean; message?: string }>('/auth/password/forgot', { identity: value.trim() })
      writeReset({ identity: value.trim(), startedAt: Date.now(), message: r?.message })
      navigate('/verify-otp', { state: { flow: 'reset' } })
    } catch (err) {
      setError(authErrorText(err).text)
    } finally {
      setBusy(false)
    }
  }
  return (
    <AuthLayout>
      <AuthTitle title="Recover your account" sub="We will send a one-time code to the email ID registered on your Dexter India account." />
      <form onSubmit={submit} className="space-y-5">
        <Input label="Registered email ID or mobile number" name="identity" value={value} onChange={(e) => setValue(e.target.value)} placeholder="name@dexterindia.in" leading={<Mail size={18} className="text-muted" />} />
        {error && (
          <Alert tone="error" title="Cannot send the code">
            {error}
          </Alert>
        )}
        <Button type="submit" size="lg" block disabled={!valid || busy}>
          Send verification code
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

export function ApiVerifyOtp() {
  const navigate = useNavigate()
  const [reset] = useState(readReset)
  const [code, setCode] = useState('')
  if (!reset) return <Navigate to="/forgot-password" replace />
  return (
    <AuthLayout panel="intro">
      <AuthTitle title="Verify your identity" sub="Enter the 6-digit code to continue." />
      <div className="mb-4">
        <Alert tone="info" title="Check your email / SMS">
          {reset.message || 'If the account exists, a verification code was sent to its registered contact.'} <span className="text-muted">({reset.identity})</span>
        </Alert>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!otpComplete(code)) return
          writeReset({ ...reset, code })
          navigate('/forgot-password/reset', { replace: true })
        }}
      >
        <OtpBoxes value={code} onChange={setCode} />
        <DevHint>in dev mode the backend logs the reset code (it is not returned to the browser).</DevHint>
        <Button type="submit" size="lg" block disabled={!otpComplete(code)}>
          Continue
        </Button>
        <div className="text-center">
          <Link to="/forgot-password" className="text-[14px] font-semibold text-primary hover:underline">
            Change email
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}

export function ApiCreatePassword() {
  const navigate = useNavigate()
  const [reset] = useState(readReset)
  const [msg, setMsg] = useState<Notice>(null)
  usePasswordPolicy()
  if (!reset?.code) return <Navigate to="/forgot-password" replace />
  const submit = async (pw: string) => {
    setMsg(null)
    try {
      await authCall('/auth/password/reset', { identity: reset.identity, code: reset.code, newPassword: pw })
      writeReset(null)
      navigate('/forgot-password/done', { replace: true })
    } catch (err) {
      const t = authErrorText(err)
      setMsg({ tone: 'error', ...t })
      if (err instanceof ApiError && /OTP/.test(err.code)) {
        writeReset({ ...reset, code: undefined })
        navigate('/verify-otp', { replace: true })
      }
    }
  }
  return (
    <AuthLayout panel="showcase">
      <AuthTitle title="Create a new password" sub="Set a strong password. All other signed-in sessions will be ended." />
      {msg && (
        <div className="mb-3">
          <Alert tone={msg.tone} title={msg.title}>
            {msg.text}
          </Alert>
        </div>
      )}
      <NewPasswordForm account={null} submitLabel="Reset Password" onSubmit={submit} footer={<div className="text-center"><Link to="/login" className="text-[14px] font-semibold text-primary hover:underline">Back to sign in</Link></div>} />
    </AuthLayout>
  )
}
