import { apiEnabled } from '@/lib/api'
import { ApiForgotPassword } from './ApiAuth'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, PhoneInput, Segmented } from '@/components/ui/Field'
import { logSecurity, usePolicy } from '@/data/security'
import { Alert, AuthLayout, AuthTitle } from './AuthLayout'
import { isEmail, isPhone } from './validation'
import { findAccount, issueOtp, writeReset } from './flow'

/** §3 — password reset through an OTP on the registered email (SMS only once the gateway is live). */
function MockForgotPassword() {
  const navigate = useNavigate()
  const policy = usePolicy()
  const [channelChoice, setChannel] = useState<'phone' | 'email'>('email')
  const channel = policy.smsOtpEnabled ? channelChoice : 'email'
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const valid = channel === 'phone' ? isPhone(value) : isEmail(value)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const acc = findAccount(value)
    if (!acc) {
      setError(`We could not find an active account with this ${channel === 'phone' ? 'mobile number' : 'email'}. Check it or contact your Admin.`)
      return
    }
    if (acc.status !== 'Active') {
      setError(acc.status === 'Locked' ? 'Account locked — contact your Admin to unlock.' : `This account is ${acc.status.toLowerCase()}. Contact your Admin.`)
      return
    }
    const r = issueOtp('reset', acc.id)
    if (!r.ok) {
      setError(r.reason)
      return
    }
    writeReset({ accountId: acc.id, verified: false, startedAt: Date.now() })
    logSecurity({ actor: acc.name, action: 'Password reset requested', target: acc.id, detail: channel === 'phone' ? 'SMS OTP' : 'Email OTP' })
    navigate('/verify-otp', { state: { channel, identity: channel === 'phone' ? acc.mobile : acc.email, flow: 'reset' } })
  }

  return (
    <AuthLayout>
      <AuthTitle title="Recover your account" sub="We will send a one-time code to the email ID registered on your Dexter India account." />
      <form onSubmit={submit} className="space-y-5">
        {policy.smsOtpEnabled ? (
          <Segmented
            value={channel}
            onChange={(v) => {
              setChannel(v)
              setValue('')
              setError('')
            }}
            options={[
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone (SMS)' },
            ]}
          />
        ) : (
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-1">
            <span className="grid h-8 place-items-center rounded-md bg-white text-[13px] font-semibold text-primary shadow-[0_2px_8px_-2px_rgba(16,24,40,0.18)]">Email</span>
            <span title="Available after SMS gateway API integration" className="flex h-8 cursor-not-allowed items-center justify-center gap-1 rounded-md text-[13px] text-muted/60">
              <MessageSquare size={13} /> Phone (SMS)
            </span>
          </div>
        )}
        {channel === 'phone' ? (
          <PhoneInput
            label="Registered phone number"
            name="phone"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/[^\d ]/g, ''))
              setError('')
            }}
            placeholder="Enter 10-digit phone number"
            hint="Use the number linked to your Dexter India profile."
          />
        ) : (
          <Input
            label="Registered email ID"
            name="email"
            type="email"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
            placeholder="name@dexterindia.in"
            leading={<Mail size={18} className="text-muted" />}
            hint="Use the email linked to your Dexter India profile."
          />
        )}
        {!policy.smsOtpEnabled && <p className="-mt-2 text-[11.5px] text-amber-700">Phone (SMS OTP): Available after SMS gateway API integration.</p>}
        {error && (
          <Alert tone="error" title="Cannot send the code">
            {error}
          </Alert>
        )}
        <Button type="submit" size="lg" block disabled={!valid}>
          Send verification code
        </Button>
        <div className="text-center">
          <Link to="/login" className="text-[14px] font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
        <Alert title="Need administrator help?">If your registered email has changed, your Admin can verify you and issue a default password.</Alert>
      </form>
    </AuthLayout>
  )
}

/** API mode: the backend drives this step (see ApiAuth.tsx); mock mode keeps the browser simulation. */
export default function ForgotPassword() {
  return apiEnabled ? <ApiForgotPassword /> : <MockForgotPassword />
}
