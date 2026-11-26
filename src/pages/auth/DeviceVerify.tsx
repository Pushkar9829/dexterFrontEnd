import { apiEnabled } from '@/lib/api'
import { ApiDevice } from './ApiAuth'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Hourglass, MonitorSmartphone, ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { logSecurity, usePolicy, useSecurity } from '@/data/security'
import { Alert, AuthLayout, AuthTitle } from './AuthLayout'
import { DevHint, OtpStep } from './parts'
import { abandonLogin, isFieldRole, maskEmail, nextRoute, patchPending, readPending, type Pending } from './flow'

const HERE = '/login/device'

/** New-device verification and device approval (§6–§8, §11). */
function MockDeviceVerify() {
  const navigate = useNavigate()
  const policy = usePolicy()
  const security = useSecurity()
  const [pending, setPending] = useState<Pending | null>(readPending)
  const acc = pending ? security.accounts.find((a) => a.id === pending.accountId) : undefined

  if (!pending || !acc || !pending.mfaDone || pending.deviceDone || !pending.deviceMode) return <Navigate to="/login" replace />

  const advance = () => {
    const r = nextRoute()
    if (r === HERE) setPending(readPending())
    else navigate(r, { replace: true })
  }
  const back = () => {
    abandonLogin()
    navigate('/login', { replace: true })
  }
  const verified = () => {
    patchPending({ deviceVerified: true })
    logSecurity({ actor: acc.name, action: 'New device verified (email OTP)', target: acc.id, detail: `${pending.device} · ${pending.deviceId}`, ip: pending.ip })
    advance()
  }

  const deviceCard = (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-[12px] text-slate-600">
      <MonitorSmartphone size={18} className="mt-0.5 shrink-0 text-[#0066FF]" />
      <div className="min-w-0">
        <div className="font-bold text-slate-800">{pending.device}</div>
        <div className="break-all">Device ID {pending.deviceId}</div>
        <div>
          IP {pending.ip} · {pending.location}
        </div>
      </div>
    </div>
  )

  if (pending.deviceMode === 'rejected')
    return (
      <AuthLayout panel="status">
        <AuthTitle title="This device is not authorised" sub="An Admin has rejected or deactivated this device for your account. Sign-in from it is blocked." />
        <div className="space-y-4">
          {deviceCard}
          <Alert tone="error" title="Access blocked">
            Use your registered device, or ask your Admin to approve a device change. This attempt has been reported to the security team.
          </Alert>
          <Button size="lg" block onClick={back}>
            <ShieldX size={18} /> Back to sign in
          </Button>
        </div>
      </AuthLayout>
    )

  if (pending.deviceMode === 'waiting')
    return (
      <AuthLayout panel="status">
        <AuthTitle title="Waiting for Admin approval of this device" sub={<>{acc.name}, this device is not yet registered to your account. Field and franchise users can sign in only from an Admin-approved device.</>} />
        <div className="space-y-4">
          {deviceCard}
          <Alert title="What happens next">
            Your Admin has been notified. Once the device is approved under Security → Devices, sign in again (or press “Check approval”). Approving a new device deactivates the old one if required.
          </Alert>
          <Button size="lg" block onClick={advance}>
            <Hourglass size={18} /> Check approval
          </Button>
          <div className="text-center">
            <button type="button" onClick={back} className="text-[14px] font-semibold text-primary hover:underline">
              Back to sign in
            </button>
          </div>
        </div>
      </AuthLayout>
    )

  return (
    <AuthLayout panel="showcase">
      <AuthTitle title="Verify this new device" sub={<>You are signing in from a device that is not registered to your account. Enter the code we emailed to {maskEmail(acc.email)}.</>} />
      <div className="space-y-4">
        {deviceCard}
        <OtpStep purpose="device" account={acc} destination={maskEmail(acc.email)} onVerified={verified} autoSent submitLabel="Verify device" />
        {policy.deviceChangeNeedsApproval && (
          <DevHint>
            after verification the device is added as “Pending Approval”. {isFieldRole(String(acc.role)) ? 'As a field / franchise user you must then wait for Admin approval.' : 'Office roles may continue; the Admin still approves or rejects the device.'}
          </DevHint>
        )}
        <div className="text-center">
          <button type="button" onClick={back} className="text-[14px] font-semibold text-primary hover:underline">
            Back to sign in
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}

/** API mode: the backend drives this step (see ApiAuth.tsx); mock mode keeps the browser simulation. */
export default function DeviceVerify() {
  return apiEnabled ? <ApiDevice /> : <MockDeviceVerify />
}
