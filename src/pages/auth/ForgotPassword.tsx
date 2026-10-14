import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, PhoneInput, Segmented } from '@/components/ui/Field'
import { Alert, AuthLayout, AuthTitle } from './AuthLayout'
import { isEmail, isPhone } from './validation'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [channel, setChannel] = useState<'phone' | 'email'>('phone')
  const [value, setValue] = useState('')
  const valid = channel === 'phone' ? isPhone(value) : isEmail(value)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) navigate('/verify-otp', { state: { channel, identity: value, flow: 'reset' } })
  }

  return (
    <AuthLayout>
      <AuthTitle title="Recover your account" sub="Choose how we should locate your authorised CRM account and send a verification code." />
      <form onSubmit={submit} className="space-y-5">
        <Segmented
          value={channel}
          onChange={(v) => {
            setChannel(v)
            setValue('')
          }}
          options={[
            { value: 'phone', label: 'Phone' },
            { value: 'email', label: 'Email' },
          ]}
        />
        {channel === 'phone' ? (
          <PhoneInput
            label="Registered phone number"
            name="phone"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d ]/g, ''))}
            placeholder="Enter 10-digit phone number"
            hint="Use the number linked to your Dexter India operator profile."
          />
        ) : (
          <Input
            label="Registered work email"
            name="email"
            type="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="name@dexterindia.in"
            leading={<Mail size={18} className="text-muted" />}
            hint="Use the email linked to your Dexter India operator profile."
          />
        )}
        <Button type="submit" size="lg" block disabled={!valid}>
          Continue
        </Button>
        <div className="text-center">
          <Link to="/login" className="text-[14px] font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
        <Alert title="Need administrator help?">Contact your franchise or regional administrator if your registered details have changed.</Alert>
      </form>
    </AuthLayout>
  )
}
