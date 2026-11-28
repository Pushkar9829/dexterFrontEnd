import { useState, useRef, useEffect } from 'react'
import { nativeApp } from '../data/nativeApp'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Headphones,
  ArrowRight,
  Check,
  RotateCcw,
  Phone,
  MessageSquare,
  X,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { DEMO_PASSWORD } from '@/pages/auth/flow'
import { mobileApiLogin, mobileApiOtpStart, mobileApiResend, mobileApiVerify, mobileOtpStart, mobileOtpVerify, mobileSignIn, type ApiLoginResult, type OtpPurpose } from '../data/mobileSession'
import { apiEnabled } from '@/lib/api'

interface MobileLoginScreenProps {
  onLoginSuccess: () => void
}

/** Demo franchisee login (Security accounts › USR-009). Same credentials as the web portal. */
const DEMO_IDENTITY = 'ranjeetpal@gmail.com'

export function MobileLoginScreen({ onLoginSuccess }: MobileLoginScreenProps) {
  // Form credentials — authenticated against the same accounts / password store as the web portal
  const [identifier, setIdentifier] = useState(DEMO_IDENTITY)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Modals state
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)

  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [otpTimer, setOtpTimer] = useState(30)
  const [isOtpTimerActive, setIsOtpTimerActive] = useState(true)
  const [isOtpVerifying, setIsOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpTarget, setOtpTarget] = useState('')
  const [demoOtp, setDemoOtp] = useState('')
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])
  // API mode: the backend challenge being answered (MFA OTP, then a new-device OTP when the server asks for one)
  const [challenge, setChallenge] = useState<{ id: string; purpose: OtpPurpose } | null>(null)
  const openChallenge = (r: Extract<ApiLoginResult, { ok: 'otp' }>) => {
    setChallenge({ id: r.challengeId, purpose: r.purpose })
    setOtpTarget(r.purpose === 'device' ? `${r.to} (new device check)` : r.to)
    setDemoOtp(r.code ?? '')
    setOtpDigits(['', '', '', '', '', ''])
    setOtpTimer(30)
    setIsOtpTimerActive(true)
    setOtpError(null)
    setShowOtpModal(true)
  }

  // Forgot password state
  const [forgotTarget, setForgotTarget] = useState('')
  const [forgotChannel, setForgotChannel] = useState<'sms' | 'email'>('sms')
  const [forgotSent, setForgotSent] = useState(false)

  // OTP Timer countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (showOtpModal && isOtpTimerActive && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1)
      }, 1000)
    } else if (otpTimer === 0) {
      setIsOtpTimerActive(false)
    }
    return () => clearInterval(interval)
  }, [showOtpModal, isOtpTimerActive, otpTimer])

  // Password login against the shared auth (src/lib/auth.ts session)
  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoginError(null)
    setIsLoggingIn(true)
    if (apiEnabled) {
      void mobileApiLogin(identifier, password).then((res) => {
        setIsLoggingIn(false)
        if (res.ok === true) onLoginSuccess()
        else if (res.ok === 'otp') openChallenge(res)
        else setLoginError(res.error)
      })
      return
    }
    setTimeout(() => {
      const res = mobileSignIn(identifier, password)
      setIsLoggingIn(false)
      if (res.ok) onLoginSuccess()
      else setLoginError(res.error)
    }, 350)
  }

  const startOtp = () => {
    setLoginError(null)
    setOtpError(null)
    if (apiEnabled) {
      // OTP-only sign-in (POST /auth/otp-login/start → /verify → device / session / password-change steps → tokens)
      setIsLoggingIn(true)
      void mobileApiOtpStart(identifier).then((res) => {
        setIsLoggingIn(false)
        if (res.ok === true) onLoginSuccess()
        else if (res.ok === 'otp') openChallenge(res)
        else setLoginError(res.error)
      })
      return
    }
    const res = mobileOtpStart(identifier)
    if (!res.ok) {
      setLoginError(res.error)
      return
    }
    setOtpTarget(res.to)
    setDemoOtp(res.code)
    setOtpDigits(['', '', '', '', '', ''])
    setOtpTimer(30)
    setIsOtpTimerActive(true)
    setShowOtpModal(true)
  }

  // Handle OTP digit change with auto-advance
  const handleOtpChange = (index: number, val: string) => {
    const digits = val.replace(/\D/g, '')
    // Several digits at once (fast typing, SMS auto-fill, paste into one box): spread them from this box onwards.
    if (digits.length > 1) {
      setOtpDigits((prev) => {
        const next = [...prev]
        digits.slice(0, 6 - index).split('').forEach((d, i) => (next[index + i] = d))
        return next
      })
      otpInputRefs.current[Math.min(index + digits.length, 5)]?.focus()
      return
    }
    const digit = digits.slice(-1)
    setOtpDigits((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit && index < 5) otpInputRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handlePasteOtp = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text) {
      const arr = text.split('')
      while (arr.length < 6) arr.push('')
      setOtpDigits(arr)
      otpInputRefs.current[Math.min(text.length, 5)]?.focus()
    }
  }

  const handleVerifyOtp = () => {
    if (otpDigits.join('').length !== 6) {
      setOtpError('Enter all 6 digits of the code.')
      return
    }
    setIsOtpVerifying(true)
    setOtpError(null)
    if (apiEnabled && challenge) {
      void mobileApiVerify(challenge.id, challenge.purpose, otpDigits.join('')).then((res) => {
        setIsOtpVerifying(false)
        if (res.ok === true) {
          setShowOtpModal(false)
          setChallenge(null)
          onLoginSuccess()
        } else if (res.ok === 'otp') openChallenge(res)
        else setOtpError(res.error)
      })
      return
    }
    setTimeout(() => {
      const res = mobileOtpVerify(identifier, otpDigits.join(''))
      setIsOtpVerifying(false)
      if (res.ok) {
        setShowOtpModal(false)
        onLoginSuccess()
      } else setOtpError(res.error)
    }, 300)
  }

  const handleResendOtp = () => {
    if (apiEnabled && challenge) {
      void mobileApiResend(challenge.id, challenge.purpose).then((res) => {
        if (!res.ok) return setOtpError(res.error)
        setDemoOtp(res.code ?? '')
        setOtpTimer(30)
        setIsOtpTimerActive(true)
        setOtpDigits(['', '', '', '', '', ''])
      })
      return
    }
    const res = mobileOtpStart(identifier)
    if (!res.ok) {
      setOtpError(res.error)
      return
    }
    setDemoOtp(res.code)
    setOtpTimer(30)
    setIsOtpTimerActive(true)
    setOtpDigits(['', '', '', '', '', ''])
  }

  return (
    <div className="relative flex h-full min-h-full flex-col justify-between bg-[#F0F5FD] text-slate-800 overflow-hidden select-none">
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. TOP DYNAMIC HEADER WITH ATM KIOSK & FLOWING BLUE WAVES */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="relative w-full h-[195px] sm:h-[205px] shrink-0 bg-gradient-to-b from-[#8CB8F5] via-[#A8CCFC] to-[#D5E5FD] overflow-hidden">
        {/* Soft atmospheric gradient clouds */}
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-400/30 via-white/40 to-blue-600/20 pointer-events-none" />

        {/* Realistic 3D ATM Kiosk Booth on Right Side */}
        <div className="absolute right-0 top-2 w-[135px] sm:w-[155px] h-full pointer-events-none select-none">
          {/* Glass office wall background */}
          <div className="absolute inset-0 bg-gradient-to-l from-slate-200/90 via-slate-100/60 to-transparent">
            {/* Window mullions */}
            <div className="absolute right-10 top-0 bottom-0 w-1 bg-white/60" />
            <div className="absolute right-24 top-0 bottom-0 w-1 bg-white/40" />
            <div className="absolute right-0 top-14 left-0 h-1 bg-white/50" />
            {/* Potted plant illustration */}
            <div className="absolute right-30 bottom-12 flex flex-col items-center opacity-70">
              <div className="w-4 h-4 rounded-full bg-emerald-600/80 -mb-1" />
              <div className="w-3 h-3.5 bg-slate-300 rounded-b-sm border border-slate-400" />
            </div>
          </div>

          {/* ATM Kiosk Arch / Canopy */}
          <div className="absolute right-3 top-3 w-[95px] h-[160px] rounded-t-xl bg-gradient-to-b from-[#0A3D9E] via-[#0E4CBF] to-[#0A368F] shadow-xl p-1.5 flex flex-col items-center border border-blue-400/40">
            {/* Glowing ATM Header Canopy */}
            <div className="w-full py-0.5 rounded-md bg-[#0055EE] text-center shadow-inner border border-blue-300/40">
              <span className="text-[11px] font-black tracking-widest text-white drop-shadow-sm">
                ATM
              </span>
            </div>

            {/* ATM Machine Facade Interior */}
            <div className="w-full flex-1 mt-1.5 rounded-t-lg bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 p-1.5 flex flex-col items-center justify-between shadow-inner border border-slate-300">
              {/* Screen Display with Banking Telemetry */}
              <div className="w-full h-9 rounded-sm bg-gradient-to-b from-blue-900 to-sky-950 p-1 flex flex-col justify-between shadow-xs border border-blue-400/50">
                <div className="flex justify-between items-center text-[5.5px] text-blue-200 font-bold px-0.5">
                  <span>DEXTER PAY</span>
                  <span className="text-emerald-400">● LIVE</span>
                </div>
                <div className="text-[6.5px] font-black text-white text-center tracking-tight leading-none">
                  INSERT CARD / UPI
                </div>
                <div className="h-0.5 w-full bg-blue-500/50 rounded-full" />
              </div>

              {/* Cash slot & Keypad */}
              <div className="w-full space-y-0.5 my-0.5">
                <div className="w-full h-0.5 bg-slate-700 rounded-full shadow-inner" />
                <div className="w-10 h-3 mx-auto rounded-xs bg-slate-400/80 grid grid-cols-4 gap-0.5 p-0.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-slate-200 rounded-[1px]" />
                  ))}
                </div>
              </div>

              {/* Cash Dispenser Safe Door at bottom */}
              <div className="w-full h-2 rounded-xs bg-slate-400/60 border-t border-slate-300 flex items-center justify-center">
                <div className="w-8 h-0.5 bg-slate-600 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Status Bar (9:41, 5G, Battery) — web preview only; the real phone draws its own */}
        <div data-native={nativeApp} className="relative z-20 data-[native=true]:hidden flex h-6 items-center justify-between px-5 pt-1.5 text-[11px] font-bold text-slate-800">
          <span className="tracking-tight">9:41</span>
          <div className="flex items-center gap-1.5 text-slate-800">
            {/* Cellular signal bars */}
            <div className="flex items-end gap-0.5 h-2">
              <span className="w-0.5 h-1 bg-slate-800 rounded-full" />
              <span className="w-0.5 h-1.5 bg-slate-800 rounded-full" />
              <span className="w-0.5 h-2 bg-slate-800 rounded-full" />
              <span className="w-0.5 h-2 bg-slate-800 rounded-full" />
            </div>
            {/* WiFi */}
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
            </svg>
            {/* Battery */}
            <div className="w-4.5 h-2 rounded-[3px] border border-slate-800 p-[1px] flex items-center">
              <div className="h-full w-3 bg-slate-800 rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* Flowing Organic Blue Waves SVG Layers (Matching inspiration) */}
        <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="w-full h-full block">
            <defs>
              <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1256D0" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#0B3C9B" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="wave2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0066FF" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#1E80FF" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#0F54D4" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            {/* Soft background wave */}
            <path
              d="M0,40 C90,12 160,78 260,30 C330,5 380,48 400,28 L400,120 L0,120 Z"
              fill="url(#wave2)"
            />
            {/* Foreground dark royal blue wave - fills solidly to bottom without any white gap/line */}
            <path
              d="M0,65 C100,28 175,88 275,52 C335,30 375,58 400,48 L400,120 L0,120 Z"
              fill="url(#wave1)"
            />
          </svg>
        </div>

        {/* Dexter India Official Brand Identity Header (Directly on canvas - NO white card border) */}
        <div className="relative z-20 pt-1 px-5 max-w-[240px]">
          {/* Official Dexter India Logo with CRM Pill Tag */}
          <div className="flex items-center gap-2">
            <img
              src="/dexter-logo.png"
              alt="Dexter India"
              className="h-11 sm:h-12 w-auto object-contain drop-shadow-md select-none"
            />
          </div>

          {/* Subtitles */}
          <div className="mt-1.5">
            <h2 className="text-[12px] font-bold text-slate-800 tracking-tight leading-tight">
              ATM Franchise Management
            </h2>
            <p className="text-[9.5px] text-slate-600 font-semibold tracking-wide mt-0.5">
              Manage &nbsp;|&nbsp; Monitor &nbsp;|&nbsp; Grow Together
            </p>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. MAIN LOGIN FORM CARD (WHITE BOTTOM SHEET MATCHING INSPIRATION) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="relative z-30 rounded-t-[32px] bg-white px-5 sm:px-6 pt-4 pb-2 shadow-[0_-12px_32px_rgba(11,42,107,0.12)] flex-1 flex flex-col justify-between -mt-5 overflow-hidden">
        <div>
          {/* Card Header Title */}
          <div className="mb-2.5">
            <h1 className="text-[21px] font-black text-[#0B2A6B] tracking-tight">
              Welcome Back
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Login to your Dexter India CRM account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-2.5">
            {/* Field 1: Email or Mobile Number (Stacked / Floated Style from Inspiration) */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-2 flex items-center gap-2.5 shadow-2xs hover:border-blue-400 focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-blue-500/15 transition-all">
              <div className="w-9 h-9 rounded-xl bg-blue-50/80 text-[#0066FF] flex items-center justify-center shrink-0 border border-blue-100">
                <Mail size={16} className="stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[9.5px] font-bold text-slate-400 tracking-tight leading-none mb-0.5">
                  Email or Mobile Number
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-transparent text-[12.5px] font-bold text-slate-900 focus:outline-none placeholder:text-slate-300"
                  placeholder="ranjeetpal@gmail.com"
                  required
                />
              </div>
              {identifier && (
                <button
                  type="button"
                  onClick={() => setIdentifier('')}
                  className="p-1 text-slate-300 hover:text-slate-500 rounded-full cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Field 2: Password (Stacked Style with Lock and Eye Toggle) */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-2 flex items-center gap-2.5 shadow-2xs hover:border-blue-400 focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-blue-500/15 transition-all">
              <div className="w-9 h-9 rounded-xl bg-blue-50/80 text-[#0066FF] flex items-center justify-center shrink-0 border border-blue-100">
                <Lock size={16} className="stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[9.5px] font-bold text-slate-400 tracking-tight leading-none mb-0.5">
                  Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-[12.5px] font-bold text-slate-900 focus:outline-none placeholder:text-slate-300"
                  placeholder="•••••••••"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-0">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-[#0066FF] focus:ring-[#0066FF] accent-[#0066FF]"
                />
                <span className="text-slate-700 font-semibold text-[11px]">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotTarget(identifier)
                  setForgotSent(false)
                  setShowForgotModal(true)
                }}
                className="font-bold text-[11px] text-[#0066FF] hover:text-[#0052CC] cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {loginError && (
              <p className="rounded-xl bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700">{loginError}</p>
            )}

            {/* Primary Action Button: Login with Arrow Right */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0066FF] to-[#0055EE] hover:from-[#005CEE] hover:to-[#0047D3] text-white font-bold text-[13px] shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-80"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider with OR */}
          <div className="relative my-2 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-2.5 text-[10px] font-bold uppercase text-slate-400">
              OR
            </span>
          </div>

          {/* Secondary Action: Login with OTP with distinctive OTP badge icon */}
          <button
            type="button"
            onClick={startOtp}
            className="w-full h-10.5 flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 active:bg-blue-100 text-[#0066FF] font-bold text-[11.5px] transition-all cursor-pointer shadow-2xs"
          >
            <div className="w-4.5 h-4.5 rounded-md border-1.5 border-[#0066FF] flex items-center justify-center text-[7.5px] font-black text-[#0066FF]">
              OTP
            </div>
            <span>Login with OTP</span>
            <ArrowRight size={13} className="text-blue-500" />
          </button>

          {/* Support Helpline link */}
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-[#0066FF] cursor-pointer"
            >
              <Headphones size={13.5} className="text-[#0066FF]" />
              <span>
                Need Help? <strong className="text-[#0066FF] font-bold underline">Contact Support</strong>
              </span>
            </button>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 3. INTRICATE INDIAN MONUMENTS ARCHITECTURAL SKYLINE (ALWAYS IN VIEW) */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="mt-auto pt-1 flex flex-col items-center opacity-85 select-none pointer-events-none shrink-0">
          <div className="w-full h-7 sm:h-8 overflow-hidden flex items-end justify-center text-blue-300/60">
            <svg viewBox="0 0 500 80" className="w-full h-full preserve-3d" fill="currentColor">
              {/* Detailed silhouette of Indian monuments: India Gate, Qutub Minar, Taj domes, Gateway of India */}
              <path d="M0,80 L20,80 L20,60 L30,60 L30,40 L40,40 L40,30 L45,20 L50,30 L50,40 L60,40 L60,60 L70,60 L70,80 L100,80 L100,50 L110,50 L110,35 L120,35 L120,15 L125,5 L130,15 L130,35 L140,35 L140,50 L150,50 L150,80 L190,80 L190,45 L200,45 L200,30 L210,30 L210,80 L240,80 L240,40 L260,25 L280,40 L280,80 L310,80 L310,50 L320,35 L330,35 L330,20 L335,10 L340,20 L340,35 L350,35 L350,50 L360,50 L360,80 L400,80 L400,55 L410,55 L410,40 L420,40 L420,80 L450,80 L450,45 L460,45 L460,25 L470,25 L470,80 L500,80 Z" />
            </svg>
          </div>
          <div className="h-0.5 w-full bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 rounded-full" />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 1: OTP AUTHENTICATION */}
      {/* ────────────────────────────────────────────────────────── */}
      {showOtpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && setShowOtpModal(false)}
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center font-bold">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-[14px] text-slate-800">OTP Authentication</h3>
                  <p className="text-[10px] text-slate-400">Two-factor security check</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="mt-3.5 text-xs text-slate-600 leading-relaxed">
              Enter the 6-digit code sent to{' '}
              <strong className="text-slate-800 font-bold">
                {otpTarget}
              </strong>
            </p>

            {/* 6 Digit Inputs */}
            <div className="my-5 flex justify-between gap-1.5" onPaste={handlePasteOtp}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                  aria-label={`OTP digit ${idx + 1}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="h-12 w-11 text-center text-lg font-black rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all shadow-2xs"
                />
              ))}
            </div>

            {otpError && (
              <p className="-mt-2 mb-3 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700">{otpError}</p>
            )}

            {/* Timer & Resend */}
            <div className="flex items-center justify-between text-xs mb-5">
              <span className="text-slate-500 font-medium">
                {isOtpTimerActive ? (
                  <span>Resend in <strong className="text-slate-800 font-bold">{otpTimer}s</strong></span>
                ) : (
                  <span className="text-amber-600 font-semibold">Code expired</span>
                )}
              </span>
              <button
                type="button"
                disabled={isOtpTimerActive}
                onClick={handleResendOtp}
                className={`font-bold inline-flex items-center gap-1 ${isOtpTimerActive
                  ? 'text-slate-400 cursor-not-allowed'
                  : 'text-[#0066FF] hover:underline cursor-pointer'
                  }`}
              >
                <RotateCcw size={12} />
                <span>Resend OTP</span>
              </button>
            </div>

            {/* Submit & Demo Fill */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={isOtpVerifying}
                onClick={handleVerifyOtp}
                className="w-full h-11 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isOtpVerifying ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Verify &amp; Enter App</span>
                  </>
                )}
              </button>

              {demoOtp && <button
                type="button"
                onClick={() => setOtpDigits(demoOtp.split(''))}
                className="w-full py-1.5 text-center text-[11px] font-bold text-slate-500 hover:text-[#0066FF] cursor-pointer"
              >
                Auto-fill Demo Code ({demoOtp}) · no SMS gateway in demo
              </button>}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 2: FORGOT PASSWORD */}
      {/* ────────────────────────────────────────────────────────── */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && setShowForgotModal(false)}
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center font-bold">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-[14px] text-slate-800">Password Recovery</h3>
                  <p className="text-[10px] text-slate-400">Reset your ERP credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {forgotSent ? (
              <div className="py-5 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <Check size={24} className="stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-bold text-[14px] text-slate-800">Reset Link Sent</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    A secure password reset link has been dispatched to{' '}
                    <strong className="text-slate-700">{forgotTarget || identifier}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full h-10 mt-2 rounded-xl bg-[#0066FF] text-white font-bold text-xs"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <div className="py-4 space-y-3.5">
                <p className="text-xs text-slate-500">
                  Enter your registered work email or mobile number to receive a one-time reset link.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Registered Identifier
                  </label>
                  <input
                    type="text"
                    value={forgotTarget}
                    onChange={(e) => setForgotTarget(e.target.value)}
                    placeholder="e.g. mobile number or email"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0066FF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setForgotChannel('sms')}
                    className={`py-2 px-2 rounded-xl border text-center font-bold cursor-pointer transition-all ${forgotChannel === 'sms'
                      ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]'
                      : 'border-slate-200 bg-white text-slate-600'
                      }`}
                  >
                    Send via SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotChannel('email')}
                    className={`py-2 px-2 rounded-xl border text-center font-bold cursor-pointer transition-all ${forgotChannel === 'email'
                      ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]'
                      : 'border-slate-200 bg-white text-slate-600'
                      }`}
                  >
                    Send via Email
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setForgotSent(true)}
                  className="w-full h-11 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Dispatch Reset Link
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 3: CONTACT SUPPORT DESK */}
      {/* ────────────────────────────────────────────────────────── */}
      {showSupportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && setShowSupportModal(false)}
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center font-bold">
                  <Headphones size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-[14px] text-slate-800">Dexter Support Desk</h3>
                  <p className="text-[10px] text-slate-400">24x7 Enterprise Assistance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-2.5 text-xs">
              <a
                href="tel:18002084444"
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:border-[#0066FF] hover:bg-blue-50/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Phone size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">Franchise Helpline</div>
                    <div className="text-[11px] text-slate-500 font-mono">1800-208-4444 (Toll Free)</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">24x7</span>
              </a>

              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:border-[#0066FF] hover:bg-blue-50/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">WhatsApp Helpdesk</div>
                    <div className="text-[11px] text-slate-500 font-mono">+91 98765 43210</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Instant</span>
              </a>

              <a
                href="mailto:support@dexterindia.com"
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:border-[#0066FF] hover:bg-blue-50/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">Operations Desk</div>
                    <div className="text-[11px] text-slate-500">support@dexterindia.com</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">4h SLA</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowSupportModal(false)}
              className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Close · Sign in to raise a ticket in the app
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
