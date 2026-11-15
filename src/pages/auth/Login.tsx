import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LoaderCircle,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Headphones,
  ShieldCheck,
  KeyRound,
  X,
} from 'lucide-react'
import { signIn } from '@/lib/auth'
import { AuthLayout, Alert } from './AuthLayout'
import { isEmail, isPhone } from './validation'

type Channel = 'phone' | 'email'
type Method = 'password' | 'otp'

const DEMO_PERSONAS = [
  {
    id: 'admin',
    label: 'Super Admin',
    name: 'Paras Dubey',
    phone: '9876543210',
    email: 'admin@dexterindia.com',
  },
  {
    id: 'ops',
    label: 'Ops Lead',
    name: 'Vikram Mehta',
    phone: '9719020867',
    email: 'ops.lead@dexterindia.in',
  },
  {
    id: 'franchise',
    label: 'Franchise Partner',
    name: 'Ranjeet Pal',
    phone: '8126817131',
    email: 'ranjeetpal@gmail.com',
  },
]

export default function Login() {
  const navigate = useNavigate()
  const [selectedPersona, setSelectedPersona] = useState<string>('admin')
  const [channel, setChannel] = useState<Channel>('phone')
  const [method, setMethod] = useState<Method>('password')
  const [phone, setPhone] = useState('9876543210')
  const [email, setEmail] = useState('admin@dexterindia.com')
  const [password, setPassword] = useState('•••••••••')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [authError, setAuthError] = useState(false)
  const [busy, setBusy] = useState(false)

  const identity = channel === 'phone' ? phone : email

  const handleSelectPersona = (p: typeof DEMO_PERSONAS[0]) => {
    setSelectedPersona(p.id)
    setPhone(p.phone)
    setEmail(p.email)
    setPassword('•••••••••')
    setErrors({})
    setAuthError(false)
  }

  const validate = (m: Method) => {
    const e: Record<string, string> = {}
    if (channel === 'phone' && !isPhone(phone)) e.phone = 'Enter a valid 10-digit Indian phone number.'
    if (channel === 'email' && !isEmail(email)) e.email = 'Enter a valid business email address.'
    if (m === 'password' && !password) e.password = 'Enter your password.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const sendOtp = () => {
    if (!validate('otp')) return
    navigate('/verify-otp', { state: { channel, identity, flow: 'login' } })
  }

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    setAuthError(false)
    if (method === 'otp') return sendOtp()
    if (!validate('password')) return
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      if (password === 'wrong') return setAuthError(true)
      signIn()
      navigate('/auth-success')
    }, 650)
  }

  return (
    <AuthLayout panel="showcase">
      {/* ────────────────────────────────────────────────────────── */}
      {/* CARD HEADER & SYSTEM HEALTH STATUS */}
      {/* ────────────────────────────────────────────────────────── */}
      <div>
        {/* Title & Subtitle */}
        <div className="mb-4">
          <h1 className="text-[25px] sm:text-[27px] font-black text-[#0B2A6B] tracking-tight">
            Welcome back
          </h1>
          <p className="text-[13px] text-slate-500 font-medium mt-1 leading-relaxed">
            Sign in to monitor ATM uptime, cash movements and franchise performance.
          </p>
        </div>

        {/* Quick Demo Persona Switcher */}
        <div className="hidden mb-5 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80 flex items-center justify-between text-[11px] font-bold shadow-2xs">
          {DEMO_PERSONAS.map((p) => {
            const active = selectedPersona === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPersona(p)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-center transition-all cursor-pointer ${active
                  ? 'bg-white text-[#0066FF] shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <span>{p.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        {/* Channel Segmented Switcher (Phone vs Work Email) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/90 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setChannel('phone')
              setErrors({})
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${channel === 'phone'
              ? 'bg-white text-[#0066FF] shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Phone size={13.5} />
            <span>Mobile Phone</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setChannel('email')
              setErrors({})
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${channel === 'email'
              ? 'bg-white text-[#0066FF] shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Mail size={13.5} />
            <span>Work Email</span>
          </button>
        </div>

        {/* Authentication Method Segmented Switcher (Password vs OTP) */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            AUTHENTICATION METHOD
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/90 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMethod('password')
                setErrors({})
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${method === 'password'
                ? 'bg-white text-[#0066FF] shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Lock size={13.5} />
              <span>Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod('otp')
                setErrors({})
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${method === 'otp'
                ? 'bg-white text-[#0066FF] shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <KeyRound size={13.5} />
              <span>OTP Verification</span>
            </button>
          </div>
        </div>

        {/* ── Input 1: Phone or Email ── */}
        {channel === 'phone' ? (
          <div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-2.5 flex items-center gap-3 shadow-2xs hover:border-blue-400 focus-within:border-[#0066FF] focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
              <div className="h-10 px-2.5 rounded-xl bg-blue-50/80 text-[#0066FF] font-black text-xs flex items-center justify-center shrink-0 border border-blue-100">
                +91
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-bold text-slate-400 tracking-tight leading-none mb-1">
                  Phone number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))}
                  placeholder="Enter 10-digit phone number"
                  autoComplete="tel"
                  className="w-full bg-transparent text-[13.5px] font-bold text-slate-900 focus:outline-none placeholder:text-slate-300"
                />
              </div>
              {phone && (
                <button
                  type="button"
                  onClick={() => setPhone('')}
                  className="p-1 text-slate-300 hover:text-slate-500 rounded-full cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {errors.phone && (
              <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.phone}</p>
            )}
          </div>
        ) : (
          <div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-2.5 flex items-center gap-3 shadow-2xs hover:border-blue-400 focus-within:border-[#0066FF] focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-[#0066FF] flex items-center justify-center shrink-0 border border-blue-100">
                <Mail size={18} className="stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-bold text-slate-400 tracking-tight leading-none mb-1">
                  Work Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ops.manager@dexterindia.com"
                  autoComplete="email"
                  className="w-full bg-transparent text-[13.5px] font-bold text-slate-900 focus:outline-none placeholder:text-slate-300"
                />
              </div>
              {email && (
                <button
                  type="button"
                  onClick={() => setEmail('')}
                  className="p-1 text-slate-300 hover:text-slate-500 rounded-full cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {errors.email && (
              <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.email}</p>
            )}
          </div>
        )}

        {/* ── Input 2: Password (when method === 'password') ── */}
        {method === 'password' && (
          <div className="space-y-2">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-2.5 flex items-center gap-3 shadow-2xs hover:border-blue-400 focus-within:border-[#0066FF] focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-[#0066FF] flex items-center justify-center shrink-0 border border-blue-100">
                <Lock size={18} className="stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-bold text-slate-400 tracking-tight leading-none mb-1">
                  Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  autoComplete="current-password"
                  className="w-full bg-transparent text-[13.5px] font-bold text-slate-900 focus:outline-none placeholder:text-slate-300"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.password}</p>
            )}

            {authError && (
              <Alert tone="error" title="Incorrect Password">
                The password entered does not match this CRM account. Please verify credentials or reset.
              </Alert>
            )}

            {/* Remember Me & Forgot Password */}
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
              <Link
                to="/forgot-password"
                className="font-bold text-[12px] text-[#0066FF] hover:text-[#0052CC] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        )}

        {method === 'otp' && (
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
            <ShieldCheck size={18} className="text-[#0066FF] shrink-0 mt-0.5" />
            <span>
              A 6-digit secure authentication code will be dispatched to your registered{' '}
              <strong className="text-slate-800 font-bold">{channel === 'phone' ? `+91 ${phone || 'mobile number'}` : email || 'email address'}</strong>.
            </span>
          </div>
        )}

        {/* Primary Action Button */}
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
              <span>{method === 'password' ? 'Sign In' : 'Send Verification OTP'}</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>

        {/* Divider with OR */}
        {method === 'password' && (
          <>
            <div className="relative my-3 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-[10.5px] font-bold uppercase text-slate-400">
                OR
              </span>
            </div>

            {/* Secondary OTP Button */}
            <button
              type="button"
              onClick={sendOtp}
              className="w-full h-11.5 flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50/40 hover:bg-blue-100/60 active:bg-blue-100 text-[#0066FF] font-bold text-xs transition-all cursor-pointer shadow-2xs"
            >
              <div className="w-5 h-5 rounded-md border-1.5 border-[#0066FF] flex items-center justify-center text-[8.5px] font-black text-[#0066FF]">
                OTP
              </div>
              <span>Sign in with {channel === 'phone' ? 'Phone' : 'Email'} OTP</span>
              <ArrowRight size={14} className="text-blue-500" />
            </button>
          </>
        )}

        {/* Helpline & Security Notice */}
        <div className="pt-2 text-center space-y-2">
          <div>
            <a
              href="tel:18002084444"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0066FF] cursor-pointer"
            >
              <Headphones size={14} className="text-[#0066FF]" />
              <span>
                Need Help? Contact <strong className="text-[#0066FF] font-bold underline">Operations Desk (1800-208-4444)</strong>
              </span>
            </a>
          </div>
          <p className="text-[10px] text-slate-400">
            Protected by bank-grade 256-bit encryption. Access is audited under Dexter India compliance policies.
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}

