import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox, Input, PasswordInput, PhoneInput, Segmented } from '@/components/ui/Field'
import { signIn } from '@/lib/auth'
import { AuthLayout, AuthTitle, Alert } from './AuthLayout'
import { isEmail, isPhone } from './validation'

type Channel = 'phone' | 'email'
type Method = 'password' | 'otp'

export default function Login() {
  const navigate = useNavigate()
  const [channel, setChannel] = useState<Channel>('phone')
  const [method, setMethod] = useState<Method>('password')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [authError, setAuthError] = useState(false)
  const [busy, setBusy] = useState(false)

  const identity = channel === 'phone' ? phone : email

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
    // Demo: any password works except "wrong", which shows the incorrect-password state.
    setTimeout(() => {
      setBusy(false)
      if (password === 'wrong') return setAuthError(true)
      signIn()
      navigate('/auth-success')
    }, 700)
  }

  return (
    <AuthLayout>
      <AuthTitle title="Welcome back" sub="Sign in to monitor ATM uptime, cash operations and franchise performance." />
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Segmented
          value={channel}
          onChange={(v) => {
            setChannel(v)
            setErrors({})
          }}
          options={[
            { value: 'phone', label: 'Phone' },
            { value: 'email', label: 'Email' },
          ]}
        />
        <div>
          <div className="mb-2 text-[12px] font-medium tracking-wide text-muted">AUTHENTICATION METHOD</div>
          <Segmented
            value={method}
            onChange={setMethod}
            options={[
              { value: 'password', label: 'Password' },
              { value: 'otp', label: 'OTP' },
            ]}
          />
        </div>

        {channel === 'phone' ? (
          <PhoneInput
            label="Phone number"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))}
            placeholder="Enter 10-digit phone number"
            error={errors.phone}
            autoComplete="tel"
          />
        ) : (
          <Input
            label="Work email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ops.manager@dexterindia.in"
            leading={<Mail size={18} className="text-muted" />}
            error={errors.email}
            autoComplete="email"
          />
        )}

        {method === 'password' && (
          <>
            <PasswordInput
              label="Password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              error={errors.password}
              autoComplete="current-password"
            />
            {authError && (
              <Alert tone="error" title="Incorrect password">
                The password does not match this account. Try again or reset your password.
              </Alert>
            )}
            <div className="flex items-center justify-between">
              <Checkbox checked={remember} onChange={setRemember} label="Remember me" />
              <Link to="/forgot-password" className="text-[14px] font-semibold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
          </>
        )}

        {method === 'otp' && (
          <p className="text-[13px] text-muted">We’ll send a six-digit code to your registered {channel === 'phone' ? 'phone number' : 'email'}.</p>
        )}

        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? 'Signing in...' : method === 'password' ? 'Sign In' : 'Send OTP'}
        </Button>

        {method === 'password' && (
          <>
            <div className="flex items-center gap-4 text-[12px] text-muted">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
            <Button type="button" variant="secondary" size="lg" block onClick={sendOtp} className="text-primary">
              Sign in with {channel === 'phone' ? 'phone' : 'email'} OTP
            </Button>
          </>
        )}
        <p className="text-center text-[12px] text-muted">Access is monitored under Dexter India security and compliance policy.</p>
      </form>
    </AuthLayout>
  )
}
