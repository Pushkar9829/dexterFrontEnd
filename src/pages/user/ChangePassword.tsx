import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'

export default function ChangePassword() {
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const hasMinLength = newPassword.length >= 8
  const hasUpperCase = /[A-Z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword)
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword

  const isValid =
    currentPassword.length > 0 &&
    hasMinLength &&
    hasUpperCase &&
    hasNumber &&
    hasSpecial &&
    passwordsMatch

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) {
      toast('Please satisfy all password complexity requirements before saving.')
      return
    }
    toast('Your password has been changed successfully!')
    navigate('/user/my-account')
  }

  return (
    <div className="max-w-[1040px] pb-12 font-sans">
      <Link
        to="/user/my-account"
        className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0066FF] hover:underline"
      >
        <ArrowLeft size={15} /> Back to My Account
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#1E293B]">
          Change Password
        </h1>
        <p className="mt-1 text-[13px] text-[#64748B]">
          Update your account authentication credentials and security settings.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {/* Left 2 Cols: Form */}
        <Card className="p-6 md:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-[#1E293B] mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 pr-10 text-[13px] outline-none transition-colors focus:border-[#0066FF] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-[#1E293B] mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  placeholder="Enter a new strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 pr-10 text-[13px] outline-none transition-colors focus:border-[#0066FF] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-[#1E293B] mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 pr-10 text-[13px] outline-none transition-colors focus:border-[#0066FF] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={!isValid} icon={<Lock size={15} />}>
                Update Password
              </Button>
            </div>
          </form>
        </Card>

        {/* Right Col: Password Requirements */}
        <Card className="p-5">
          <div className="flex items-center gap-2 border-b border-line-soft pb-2.5">
            <KeyRound size={17} className="text-[#0066FF]" />
            <h3 className="text-[14px] font-bold text-[#1E293B]">Password Rules</h3>
          </div>

          <ul className="mt-4 space-y-2 text-[12px]">
            <li className={`flex items-center gap-2 ${hasMinLength ? 'text-emerald-600 font-semibold' : 'text-[#64748B]'}`}>
              <span className={`grid h-4 w-4 place-items-center rounded-full border ${hasMinLength ? 'bg-emerald-50 border-emerald-500' : 'border-slate-300'}`}>
                {hasMinLength && <Check size={10} />}
              </span>
              At least 8 characters long
            </li>

            <li className={`flex items-center gap-2 ${hasUpperCase ? 'text-emerald-600 font-semibold' : 'text-[#64748B]'}`}>
              <span className={`grid h-4 w-4 place-items-center rounded-full border ${hasUpperCase ? 'bg-emerald-50 border-emerald-500' : 'border-slate-300'}`}>
                {hasUpperCase && <Check size={10} />}
              </span>
              At least 1 uppercase letter (A-Z)
            </li>

            <li className={`flex items-center gap-2 ${hasNumber ? 'text-emerald-600 font-semibold' : 'text-[#64748B]'}`}>
              <span className={`grid h-4 w-4 place-items-center rounded-full border ${hasNumber ? 'bg-emerald-50 border-emerald-500' : 'border-slate-300'}`}>
                {hasNumber && <Check size={10} />}
              </span>
              At least 1 numeric digit (0-9)
            </li>

            <li className={`flex items-center gap-2 ${hasSpecial ? 'text-emerald-600 font-semibold' : 'text-[#64748B]'}`}>
              <span className={`grid h-4 w-4 place-items-center rounded-full border ${hasSpecial ? 'bg-emerald-50 border-emerald-500' : 'border-slate-300'}`}>
                {hasSpecial && <Check size={10} />}
              </span>
              At least 1 special character (!@#$)
            </li>

            <li className={`flex items-center gap-2 ${passwordsMatch ? 'text-emerald-600 font-semibold' : 'text-[#64748B]'}`}>
              <span className={`grid h-4 w-4 place-items-center rounded-full border ${passwordsMatch ? 'bg-emerald-50 border-emerald-500' : 'border-slate-300'}`}>
                {passwordsMatch && <Check size={10} />}
              </span>
              Passwords match identically
            </li>
          </ul>

          <div className="mt-5 rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 leading-relaxed">
            <span className="font-semibold block mb-0.5">Corporate Security Note</span>
            Passwords must be rotated every 90 days in compliance with RBI White Label ATM governance standards.
          </div>
        </Card>
      </div>
    </div>
  )
}
