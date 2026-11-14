import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Headphones, ArrowRight, Check } from 'lucide-react'
import { type MobileUser, DEMO_MOBILE_USERS } from '../data/mobileMockData'

interface MobileLoginScreenProps {
  onLoginSuccess: (user: MobileUser) => void
  onContactSupport: () => void
}

export function MobileLoginScreen({ onLoginSuccess, onContactSupport }: MobileLoginScreenProps) {
  const [identifier, setIdentifier] = useState('admin@dexterindia.com')
  const [password, setPassword] = useState('••••••••••')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [selectedRole, setSelectedRole] = useState<'franchise' | 'team_leader' | 'admin'>('franchise')
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otpCode, setOtpCode] = useState(['4', '8', '2', '9', '1', '0'])

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    onLoginSuccess(DEMO_MOBILE_USERS[selectedRole])
  }

  const handleRoleSelect = (role: 'franchise' | 'team_leader' | 'admin') => {
    setSelectedRole(role)
    if (role === 'franchise') setIdentifier('ranjeetpal@gmail.com')
    else if (role === 'team_leader') setIdentifier('mukesh@dexterindia.com')
    else setIdentifier('admin@dexterindia.com')
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-gradient-to-b from-[#0F3F9D] via-[#124FB8] to-[#185ED4] text-slate-800">
      {/* Top Phone Status Bar */}
      <div className="flex h-7 items-center justify-between px-6 pt-2 text-[12px] font-semibold text-white/90">
        <span>9:41</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px]">5G</span>
          <div className="w-5 h-2.5 rounded-[3px] border border-white/80 p-[1px] flex items-center">
            <div className="h-full w-full bg-white rounded-[1.5px]" />
          </div>
        </div>
      </div>

      {/* Top Brand Header Section */}
      <div className="pt-4 pb-6 px-6 text-center text-white">
        {/* Official Dexter Logo Card */}
        <div className="mx-auto inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 shadow-xl border border-white/40">
          <img
            src="/dexter-logo.png"
            alt="Dexter India"
            className="h-12 w-auto max-w-[200px] object-contain drop-shadow-xs"
          />
        </div>

        <div className="mt-3">
          <p className="text-xs font-semibold text-blue-100">
            ATM Franchise Management System
          </p>
        </div>

        {/* 3 Pills */}
        <div className="mt-3 flex items-center justify-center gap-3 text-[10.5px] font-semibold text-white/90">
          <span className="inline-flex items-center gap-1">📊 Manage</span>
          <span className="text-white/40">|</span>
          <span className="inline-flex items-center gap-1">💻 Monitor</span>
          <span className="text-white/40">|</span>
          <span className="inline-flex items-center gap-1">👥 Grow Together</span>
        </div>
      </div>

      {/* Demo Quick Role Switcher */}
      <div className="mx-4 mb-2 p-2 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
        <p className="text-[10px] uppercase tracking-wider font-bold text-center text-blue-100 mb-1.5">
          Select Demo Persona
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'franchise' as const, label: 'Franchise', name: 'Ranjeet Pal' },
            { id: 'team_leader' as const, label: 'Field TL', name: 'Mukesh Singh' },
            { id: 'admin' as const, label: 'Admin', name: 'Vikram Mehta' }
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleRoleSelect(r.id)}
              className={`py-1.5 px-1 rounded-xl text-center transition-all ${
                selectedRole === r.id
                  ? 'bg-white text-[#0B2A6B] font-bold shadow-md scale-[1.02]'
                  : 'bg-white/10 text-white/90 hover:bg-white/20 text-xs'
              }`}
            >
              <div className="text-[11px] font-bold leading-tight">{r.label}</div>
              <div className="text-[9px] opacity-80 truncate">{r.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Login Form Card */}
      <div className="relative rounded-t-[32px] bg-white px-6 pt-7 pb-6 shadow-2xl flex-1 flex flex-col justify-between">
        <div>
          <div className="mb-5 text-center">
            <h2 className="text-2xl font-extrabold text-[#0B2A6B]">Welcome Back</h2>
            <p className="text-xs text-slate-500 mt-1">
              Login to your Dexter India ERP account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email / Mobile Field */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Email or Mobile Number
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-blue-600" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  placeholder="Enter email or mobile"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-blue-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-600 font-medium">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => alert('Password reset link sent to registered email & SMS')}
                className="font-semibold text-blue-600 hover:text-blue-800"
              >
                Forgot Password?
              </button>
            </div>

            {/* Primary Login Button */}
            <button
              type="submit"
              className="mt-2 w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1457CF] text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
            >
              <span>Login</span>
              <ArrowRight size={17} />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-[11px] font-bold uppercase text-slate-400">
              OR
            </span>
          </div>

          {/* Login with OTP Button */}
          <button
            type="button"
            onClick={() => setShowOtpModal(true)}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 font-bold text-xs transition-all active:scale-[0.98]"
          >
            <ShieldCheck size={16} className="text-blue-600" />
            <span>Login with OTP</span>
            <ArrowRight size={14} className="text-blue-500" />
          </button>

          {/* Need Help link */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onContactSupport}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600"
            >
              <Headphones size={14} className="text-blue-600" />
              <span>Need Help? <strong className="text-blue-600 underline">Contact Support</strong></span>
            </button>
          </div>
        </div>

        {/* Indian Monuments Skyline Graphic representation at bottom */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col items-center opacity-85">
          <div className="w-full h-10 overflow-hidden flex items-end justify-center text-blue-400/50">
            <svg viewBox="0 0 500 80" className="w-full h-full preserve-3d" fill="currentColor">
              <path d="M0,80 L20,80 L20,60 L30,60 L30,40 L40,40 L40,30 L45,20 L50,30 L50,40 L60,40 L60,60 L70,60 L70,80 L100,80 L100,50 L110,50 L110,35 L120,35 L120,15 L125,5 L130,15 L130,35 L140,35 L140,50 L150,50 L150,80 L190,80 L190,45 L200,45 L200,30 L210,30 L210,80 L240,80 L240,40 L260,25 L280,40 L280,80 L310,80 L310,50 L320,35 L330,35 L330,20 L335,10 L340,20 L340,35 L350,35 L350,50 L360,50 L360,80 L400,80 L400,55 L410,55 L410,40 L420,40 L420,80 L450,80 L450,45 L460,45 L460,25 L470,25 L470,80 L500,80 Z" />
            </svg>
          </div>
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-sky-400 to-blue-600 rounded-full" />
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-blue-600" />
                <h3 className="font-bold text-slate-800">OTP Authentication</h3>
              </div>
              <button
                onClick={() => setShowOtpModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Enter 6-digit OTP sent to registered mobile <strong className="text-slate-700">+91 8126817131</strong>
            </p>

            <div className="my-5 flex justify-between gap-2">
              {otpCode.map((digit, idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    const next = [...otpCode]
                    next[idx] = e.target.value
                    setOtpCode(next)
                  }}
                  className="h-12 w-10 text-center text-lg font-bold rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              ))}
            </div>

            <button
              onClick={() => {
                setShowOtpModal(false)
                handleLogin()
              }}
              className="w-full h-11 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Verify & Enter App
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
