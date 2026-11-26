import { apiEnabled } from '@/lib/api'
import { ApiLogin } from './ApiAuth'
import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LoaderCircle, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, Headphones, X, Users, RefreshCw, ShieldAlert } from 'lucide-react'
import { logSecurity, nowIso, raiseAlert, recordLogin, updateAccount, usePolicy, useSecurity, type SecurityAccount } from '@/data/security'
import { cn } from '@/lib/cn'
import { AuthLayout, Alert } from './AuthLayout'
import { isEmail, isPhone } from './validation'
import {
  applyAutoUnlock,
  browserDeviceId,
  checkPassword,
  conflictingSessions,
  describeBrowser,
  detectLocation,
  findAccount,
  isFieldRole,
  mockIp,
  nextRoute,
  startPending,
  unlockTime,
  DEMO_PASSWORD,
} from './flow'

type Channel = 'phone' | 'email'
type Notice = { tone: 'error' | 'info'; title: string; text: string } | null

/** Demo personas — one per role, backed by the accounts in the security store. */
const PERSONAS: { id: string; label: string }[] = [
  { id: 'USR-001', label: 'Super Admin' },
  { id: 'USR-002', label: 'Admin' },
  { id: 'USR-004', label: 'Finance Team' },
  { id: 'USR-005', label: 'Legal Team' },
  { id: 'USR-006', label: 'Project Head' },
  { id: 'USR-003', label: 'Operations Team' },
  { id: 'USR-008', label: 'MIS Team' },
  { id: 'USR-010', label: 'Field Officer / TL' },
  { id: 'USR-009', label: 'Franchisee' },
  { id: 'USR-007', label: 'Sub-Admin' },
]

const newCaptcha = () => ({ a: 2 + Math.floor(Math.random() * 9), b: 1 + Math.floor(Math.random() * 9) })

function personaNotes(acc: SecurityAccount) {
  const notes: string[] = []
  if (acc.status !== 'Active') notes.push(`${acc.status}${acc.lockReason ? ` (${acc.lockReason})` : ''}`)
  notes.push(acc.mfaEnrolled ? `2nd factor: ${acc.mfaMethod}` : 'MFA not enrolled → authenticator setup')
  if (acc.mustChangePassword) notes.push('must change default password')
  if (isFieldRole(String(acc.role))) notes.push('new device needs Admin approval')
  if (conflictingSessions(acc.id).length) notes.push('already active on another system')
  return notes.join(' · ')
}

function MockLogin() {
  const navigate = useNavigate()
  const loc = useLocation()
  const policy = usePolicy()
  const security = useSecurity()
  const expiredBanner = !!(loc.state as { expired?: boolean } | null)?.expired

  const [selectedPersona, setSelectedPersona] = useState('USR-002')
  const [channel, setChannel] = useState<Channel>('phone')
  const [phone, setPhone] = useState('9822012345')
  const [email, setEmail] = useState('meera.iyer@dexterindia.in')
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<Notice>(null)
  const [busy, setBusy] = useState(false)
  const [unknownFails, setUnknownFails] = useState(0)
  const [captcha, setCaptcha] = useState(newCaptcha)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const locationCache = useRef<string | null>(null)

  const identity = channel === 'phone' ? phone : email
  const typedAccount = findAccount(identity)
  const failCount = typedAccount ? typedAccount.failedAttempts : unknownFails
  const captchaNeeded = failCount >= policy.captchaAfterAttempts
  const persona = security.accounts.find((a) => a.id === selectedPersona)

  const handleSelectPersona = (acc: SecurityAccount) => {
    setSelectedPersona(acc.id)
    setPhone(acc.mobile)
    setEmail(acc.email)
    setPassword(DEMO_PASSWORD)
    setErrors({})
    setNotice(null)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (channel === 'phone' && !isPhone(phone)) e.phone = 'Enter a valid 10-digit registered mobile number.'
    if (channel === 'email' && !isEmail(email)) e.email = 'Enter a valid registered email address.'
    if (!password) e.password = 'Password is mandatory.'
    if (captchaNeeded && !captchaAnswer.trim()) e.captcha = 'Solve the security check.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const refreshCaptcha = () => {
    setCaptcha(newCaptcha())
    setCaptchaAnswer('')
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (busy) return
    setNotice(null)
    if (!validate()) return
    if (captchaNeeded && Number(captchaAnswer) !== captcha.a + captcha.b) {
      refreshCaptcha()
      setNotice({ tone: 'error', title: 'Security check failed', text: 'The answer was not correct. Solve the new challenge and try again.' })
      return
    }

    setBusy(true)
    if (locationCache.current === null) locationCache.current = await detectLocation(3500)
    setBusy(false)
    const location = locationCache.current
    const deviceId = browserDeviceId()
    const meta = { ip: mockIp(deviceId), location, device: describeBrowser().label }
    if (captchaNeeded) refreshCaptcha()

    let acc = findAccount(identity)
    if (acc) acc = applyAutoUnlock(acc)

    // Locked / Blocked / Disabled accounts cannot sign in (§9).
    if (acc && acc.status !== 'Active') {
      recordLogin({ accountId: acc.id, name: acc.name, ...meta, status: acc.status === 'Locked' ? 'Locked' : 'Blocked', reason: `Sign-in attempt on ${acc.status.toLowerCase()} account` })
      if (acc.status === 'Locked') {
        const at = unlockTime(acc)
        setNotice({
          tone: 'error',
          title: 'Account locked',
          text: at
            ? `Too many failed attempts. The account unlocks automatically at ${at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}, or contact your Admin to unlock it.`
            : 'Account locked — contact your Admin to unlock.',
        })
      } else setNotice({ tone: 'error', title: `Account ${acc.status.toLowerCase()}`, text: `This account is ${acc.status.toLowerCase()}. Contact your Admin.` })
      return
    }

    if (!acc || !checkPassword(acc, password)) {
      if (!acc) {
        setUnknownFails((n) => n + 1)
        recordLogin({ accountId: 'UNKNOWN', name: identity.trim(), ...meta, status: 'Failed', reason: 'Unknown mobile / email' })
        setNotice({ tone: 'error', title: 'Sign-in failed', text: 'The mobile number / email or password is incorrect.' })
        return
      }
      const n = acc.failedAttempts + 1
      if (n >= policy.maxFailedAttempts) {
        updateAccount(acc.id, { status: 'Locked', failedAttempts: n, lockedAt: nowIso(), lockReason: `${n} failed password attempts` }, { actor: 'System', action: 'Account locked', detail: `${n} failed password attempts from ${meta.ip}` })
        recordLogin({ accountId: acc.id, name: acc.name, ...meta, status: 'Locked', reason: 'Max failed attempts reached' })
        raiseAlert({ kind: 'Repeated failed logins', accountId: acc.id, name: acc.name, detail: `${n} wrong passwords from ${meta.ip} (${meta.device}) — account locked`, severity: 'High' })
        setNotice({
          tone: 'error',
          title: 'Account locked',
          text: policy.lockoutMinutes > 0 ? `Too many failed attempts. Try again after ${policy.lockoutMinutes} minutes or contact your Admin to unlock.` : 'Account locked — contact your Admin to unlock.',
        })
        return
      }
      updateAccount(acc.id, { failedAttempts: n })
      recordLogin({ accountId: acc.id, name: acc.name, ...meta, status: 'Failed', reason: 'Wrong password' })
      if (n === policy.captchaAfterAttempts) raiseAlert({ kind: 'Multiple unauthorized attempts', accountId: acc.id, name: acc.name, detail: `${n} wrong passwords from ${meta.ip} — CAPTCHA enforced`, severity: 'Medium' })
      setNotice({ tone: 'error', title: 'Sign-in failed', text: `The mobile number / email or password is incorrect. ${policy.maxFailedAttempts - n} attempt(s) left before the account is locked.` })
      return
    }

    // First factor passed.
    if (acc.failedAttempts) updateAccount(acc.id, { failedAttempts: 0 })
    setUnknownFails(0)
    setCaptchaAnswer('')
    startPending(acc, location)
    logSecurity({ actor: acc.name, action: 'Password verified (1st factor)', target: acc.id, detail: channel === 'phone' ? 'Mobile number + password' : 'Email + password', ip: meta.ip })
    navigate(nextRoute())
  }

  const inputBox =
    'rounded-2xl border border-slate-200/90 bg-white p-2.5 flex items-center gap-3 shadow-2xs hover:border-blue-400 focus-within:border-[#0066FF] focus-within:ring-4 focus-within:ring-blue-500/10 transition-all'
  const segBtn = (active: boolean) =>
    `flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${active ? 'bg-white text-[#0066FF] shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'}`

  return (
    <AuthLayout panel="showcase">
      <div>
        <div className="mb-4">
          <h1 className="text-[25px] sm:text-[27px] font-black text-[#0B2A6B] tracking-tight">Welcome back</h1>
          <p className="text-[13px] text-slate-500 font-medium mt-1 leading-relaxed">
            One secure sign-in for every Dexter India role: registered mobile number or email, password, then a second factor.
          </p>
        </div>

        {expiredBanner && (
          <div className="mb-4">
            <Alert tone="info" title="Session expired due to inactivity">
              For your security you were signed out after {policy.sessionIdleMinutes} minutes without activity. Sign in again to continue.
            </Alert>
          </div>
        )}

        {/* Demo persona picker (UAT) */}
        <div className="mb-5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2.5">
          <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Users size={12} /> Demo accounts
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PERSONAS.map((p) => {
              const acc = security.accounts.find((a) => a.id === p.id)
              if (!acc) return null
              const active = selectedPersona === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPersona(acc)}
                  className={cn(
                    'rounded-lg border px-2 py-1 text-[11px] font-bold transition-all cursor-pointer',
                    active ? 'border-blue-200 bg-white text-[#0066FF] shadow-xs' : 'border-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900',
                    acc.status !== 'Active' && 'text-rose-600',
                  )}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          {persona && (
            <div className="mt-2 px-1 text-[11px] leading-snug text-slate-500">
              <span className="font-bold text-slate-700">{persona.name}</span> · +91 {persona.mobile} · {persona.email}
              <div className="mt-0.5 text-slate-400">{personaNotes(persona)}</div>
            </div>
          )}
          <div className="mt-2 rounded-lg bg-white px-2 py-1.5 text-[11px] text-slate-600 border border-slate-200/80">
            Demo password for every account: <strong className="font-mono text-slate-900">{DEMO_PASSWORD}</strong>
            <span className="text-slate-400"> (until changed in this browser)</span>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        {/* Registered mobile number or email */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/90 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setChannel('phone')
              setErrors({})
            }}
            className={segBtn(channel === 'phone')}
          >
            <Phone size={13.5} />
            <span>Mobile Number</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setChannel('email')
              setErrors({})
            }}
            className={segBtn(channel === 'email')}
          >
            <Mail size={13.5} />
            <span>Email ID</span>
          </button>
        </div>

        {channel === 'phone' ? (
          <div>
            <div className={inputBox}>
              <div className="h-10 px-2.5 rounded-xl bg-blue-50/80 text-[#0066FF] font-black text-xs flex items-center justify-center shrink-0 border border-blue-100">+91</div>
              <div className="flex-1 min-w-0">
                <label htmlFor="login-phone" className="block text-[10px] font-bold text-slate-400 tracking-tight leading-none mb-1">
                  Registered mobile number
                </label>
                <input
                  id="login-phone"
                  type="tel"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))}
                  placeholder="Enter 10-digit mobile number"
                  autoComplete="tel"
                  className="w-full bg-transparent text-[13.5px] font-bold text-slate-900 focus:outline-none placeholder:text-slate-300"
                />
              </div>
              {phone && (
                <button type="button" onClick={() => setPhone('')} aria-label="Clear mobile number" className="p-1 text-slate-300 hover:text-slate-500 rounded-full cursor-pointer">
                  <X size={14} />
                </button>
              )}
            </div>
            {errors.phone && <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.phone}</p>}
          </div>
        ) : (
          <div>
            <div className={inputBox}>
              <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-[#0066FF] flex items-center justify-center shrink-0 border border-blue-100">
                <Mail size={18} className="stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <label htmlFor="login-email" className="block text-[10px] font-bold text-slate-400 tracking-tight leading-none mb-1">
                  Registered email ID
                </label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@dexterindia.in"
                  autoComplete="email"
                  className="w-full bg-transparent text-[13.5px] font-bold text-slate-900 focus:outline-none placeholder:text-slate-300"
                />
              </div>
              {email && (
                <button type="button" onClick={() => setEmail('')} aria-label="Clear email" className="p-1 text-slate-300 hover:text-slate-500 rounded-full cursor-pointer">
                  <X size={14} />
                </button>
              )}
            </div>
            {errors.email && <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.email}</p>}
          </div>
        )}

        {/* Password (mandatory) */}
        <div className="space-y-2">
          <div className={inputBox}>
            <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-[#0066FF] flex items-center justify-center shrink-0 border border-blue-100">
              <Lock size={18} className="stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="login-password" className="block text-[10px] font-bold text-slate-400 tracking-tight leading-none mb-1">
                Password
              </label>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                autoComplete="current-password"
                className="w-full bg-transparent text-[13.5px] font-bold text-slate-900 focus:outline-none placeholder:text-slate-300"
              />
            </div>
            <button type="button" onClick={() => setShowPassword((s) => !s)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Toggle password visibility">
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.password}</p>}
        </div>

        {/* CAPTCHA after repeated failures (§9) */}
        {captchaNeeded && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
              <ShieldAlert size={13} /> Security check
            </div>
            <p className="mt-1 text-[11.5px] text-amber-800">Several failed attempts were detected. Solve this to continue.</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="select-none rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-[15px] font-black tracking-widest text-slate-800 italic">
                {captcha.a} + {captcha.b} =
              </span>
              <input
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value.replace(/\D/g, '').slice(0, 3))}
                inputMode="numeric"
                aria-label="CAPTCHA answer"
                placeholder="?"
                className="h-10 w-20 rounded-lg border border-amber-200 bg-white px-2 text-center text-[15px] font-bold focus:outline-none focus:ring-4 focus:ring-amber-500/10"
              />
              <button type="button" onClick={refreshCaptcha} aria-label="New challenge" className="p-2 text-amber-700 hover:text-amber-900 cursor-pointer">
                <RefreshCw size={15} />
              </button>
            </div>
            {errors.captcha && <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.captcha}</p>}
          </div>
        )}

        {notice && (
          <Alert tone={notice.tone} title={notice.title}>
            {notice.text}
          </Alert>
        )}

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#0066FF] focus:ring-[#0066FF] accent-[#0066FF]"
            />
            <span className="text-slate-700 font-semibold text-[12px]">Remember me</span>
          </label>
          <Link to="/forgot-password" className="font-bold text-[12px] text-[#0066FF] hover:text-[#0052CC] hover:underline">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:from-[#0055EE] hover:to-[#0047B8] text-white font-bold text-[14px] shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-80"
        >
          {busy ? (
            <>
              <LoaderCircle size={18} className="animate-spin" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-slate-500">A one-time code or authenticator check follows your password (two-factor authentication).</p>

        <div className="pt-2 text-center space-y-2">
          <div>
            <a href="tel:18002084444" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0066FF] cursor-pointer">
              <Headphones size={14} className="text-[#0066FF]" />
              <span>
                Need Help? Contact <strong className="text-[#0066FF] font-bold underline">Operations Desk (1800-208-4444)</strong>
              </span>
            </a>
          </div>
          <p className="text-[10px] text-slate-400">
            Every sign-in attempt is recorded with IP, location and device. Access is audited under Dexter India compliance policies.
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}

/** API mode: the backend drives this step (see ApiAuth.tsx); mock mode keeps the browser simulation. */
export default function Login() {
  return apiEnabled ? <ApiLogin /> : <MockLogin />
}
