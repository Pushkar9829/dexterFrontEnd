// §20 Central Security Administration + §24 open configuration decisions.
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCcw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Field'
import { toast } from '@/components/ui/Toast'
import { createStore } from '@/lib/store'
import { ROLES } from '@/lib/rbac'
import { DEFAULT_POLICY, PENDING_DECISIONS, loadPolicy, logSecurity, policyStore, securityApi, usePolicy, type SecurityPolicy } from '@/data/security'
import { apiEnabled } from '@/lib/api'
import { ApiStatus, ConfirmModal, DecisionBadge, FormActions, Note, PageShell, Section } from './kit'
import { actor, fmtDT, isEmail } from './util'

type Draft = { policy: SecurityPolicy; savedAt: string; savedBy: string } | null
const draftStore = createStore<Draft>('dexter.securityPolicyDraft.v1', () => null)

type K = keyof SecurityPolicy
const LABELS: Partial<Record<K, string>> = {
  minPasswordLength: 'Minimum password length',
  requireUpper: 'Require uppercase',
  requireLower: 'Require lowercase',
  requireNumber: 'Require number',
  requireSpecial: 'Require special character',
  passwordExpiryDays: 'Password expiry (days, 0 = never)',
  passwordHistory: 'Password history (last N not reusable)',
  maxFailedAttempts: 'Maximum failed login attempts',
  lockoutMinutes: 'Lockout duration (minutes, 0 = until Admin unlocks)',
  captchaAfterAttempts: 'Show CAPTCHA after N failed attempts',
  otpValidityMinutes: 'OTP validity (minutes, max 5)',
  otpResendLimit: 'OTP resend limit',
  otpVerifyAttempts: 'OTP verification attempt limit',
  smsOtpEnabled: 'SMS OTP',
  emailOtpEnabled: 'Email OTP',
  totpEnabled: 'Authenticator app (TOTP)',
  passkeyEnabled: 'Passkey',
  mfaRequired: 'MFA requirement',
  sessionIdleMinutes: 'Session inactivity timeout (minutes)',
  accessTokenMinutes: 'Access token validity (minutes)',
  refreshTokenDays: 'Refresh token validity (days)',
  secondSystem: 'Second-system login behaviour',
  deviceBinding: 'Registered device binding (mobile app)',
  deviceChangeNeedsApproval: 'Device change needs Admin approval',
  blockRootedDevices: 'Block rooted / jailbroken devices',
  ipRiskMonitoring: 'IP / location / VPN risk monitoring',
  newDeviceVerification: 'Extra verification on new device / unusual location',
  watermarkEnabled: 'Dynamic watermark (User ID + date/time) on web portal',
  auditRetentionDays: 'Audit log retention (days)',
  backupFrequency: 'Backup frequency',
  rpoHours: 'Recovery point objective — RPO (hours)',
  rtoHours: 'Recovery time objective — RTO (hours)',
  alertRecipients: 'Security alert recipients',
}

const NUM_RULES: Partial<Record<K, [number, number]>> = {
  minPasswordLength: [8, 64],
  passwordExpiryDays: [0, 365],
  passwordHistory: [0, 24],
  maxFailedAttempts: [3, 10],
  lockoutMinutes: [0, 1440],
  captchaAfterAttempts: [1, 10],
  otpValidityMinutes: [1, 5],
  otpResendLimit: [1, 10],
  otpVerifyAttempts: [1, 10],
  sessionIdleMinutes: [5, 120],
  accessTokenMinutes: [5, 60],
  refreshTokenDays: [1, 30],
  auditRetentionDays: [365, 3650],
  rpoHours: [1, 168],
  rtoHours: [1, 72],
}

const fmtVal = (v: unknown) => (Array.isArray(v) ? v.join(', ') || '(none)' : typeof v === 'boolean' ? (v ? 'On' : 'Off') : String(v))

/** Human-readable before → after list of every changed field. */
function diffPolicy(a: SecurityPolicy, b: SecurityPolicy) {
  const out: string[] = []
  for (const k of Object.keys(LABELS) as K[]) {
    if (k === 'mfaRequired') {
      const roles = new Set([...Object.keys(a.mfaRequired), ...Object.keys(b.mfaRequired)])
      roles.forEach((r) => {
        const x = !!a.mfaRequired[r]
        const y = !!b.mfaRequired[r]
        if (x !== y) out.push(`MFA for ${r}: ${x ? 'Mandatory' : 'Optional'} → ${y ? 'Mandatory' : 'Optional'}`)
      })
      continue
    }
    const x = fmtVal(a[k])
    const y = fmtVal(b[k])
    if (x !== y) out.push(`${LABELS[k]}: ${x} → ${y}`)
  }
  return out
}

function validate(p: SecurityPolicy) {
  const e: Partial<Record<K, string>> = {}
  for (const [k, [min, max]] of Object.entries(NUM_RULES) as [K, [number, number]][]) {
    const v = p[k] as number
    if (!Number.isFinite(v) || !Number.isInteger(v)) e[k] = 'Enter a whole number.'
    else if (v < min || v > max) e[k] = `Must be between ${min} and ${max}.`
  }
  if (!p.emailOtpEnabled && !p.smsOtpEnabled && !p.totpEnabled && !p.passkeyEnabled) e.emailOtpEnabled = 'At least one second factor must stay enabled.'
  if (p.captchaAfterAttempts > p.maxFailedAttempts) e.captchaAfterAttempts = 'CAPTCHA must appear before the account locks.'
  if (p.accessTokenMinutes > p.sessionIdleMinutes * 4) e.accessTokenMinutes = 'Keep the access token short (≤ 4 × idle timeout).'
  if (p.alertRecipients.length === 0) e.alertRecipients = 'Add at least one recipient.'
  else if (p.alertRecipients.some((r) => !isEmail(r))) e.alertRecipients = 'Every recipient must be a valid email address.'
  return e
}

const box = 'h-9 w-full rounded-md border bg-white px-[11px] text-[12.5px] text-ink outline-none focus:border-primary focus:ring-3 focus:ring-primary/10'

function Row({ k, label, children, error, hint }: { k: K; label?: string; children: ReactNode; error?: string; hint?: string }) {
  return (
    <div>
      <label htmlFor={`pol-${k}`} className="mb-1.5 flex flex-wrap items-center text-[11px] font-semibold text-ink">
        {label ?? LABELS[k]}
        {PENDING_DECISIONS.includes(k) && <DecisionBadge />}
      </label>
      {children}
      {error ? <p className="mt-1 text-[11px] text-brand-red">{error}</p> : hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  )
}

export default function SecurityAdmin() {
  const nav = useNavigate()
  const live = usePolicy()
  const draft = draftStore.use()
  const [form, setForm] = useState<SecurityPolicy>(() => draftStore.get()?.policy ?? policyStore.get())
  const [recipientsText, setRecipientsText] = useState(() => form.alertRecipients.join(', '))
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({})
  const [confirmReset, setConfirmReset] = useState(false)
  const [loadState, setLoadState] = useState<{ loading: boolean; error: string | null }>({ loading: apiEnabled, error: null })

  // API mode: the policy is the server document (GET /security/settings).
  const fetchPolicy = () => {
    if (!apiEnabled) return
    setLoadState({ loading: true, error: null })
    loadPolicy()
      .then((p) => {
        if (!draftStore.get()) {
          setForm(p)
          setRecipientsText(p.alertRecipients.join(', '))
        }
        setLoadState({ loading: false, error: null })
      })
      .catch((e: Error) => setLoadState({ loading: false, error: e.message }))
  }
  useEffect(fetchPolicy, []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = <X extends K>(k: X, v: SecurityPolicy[X]) => setForm((f) => ({ ...f, [k]: v }))
  const withRecipients = (): SecurityPolicy => ({
    ...form,
    alertRecipients: recipientsText.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean),
  })
  const pendingChanges = diffPolicy(live, withRecipients())

  const num = (k: K) => (
    <Row k={k} error={errors[k]} hint={NUM_RULES[k] ? `Allowed ${NUM_RULES[k]![0]}–${NUM_RULES[k]![1]}` : undefined}>
      <input
        id={`pol-${k}`}
        type="number"
        value={Number.isFinite(form[k] as number) ? String(form[k]) : ''}
        onChange={(e) => set(k, (e.target.value === '' ? NaN : Number(e.target.value)) as never)}
        className={`${box} ${errors[k] ? 'border-brand-red' : 'border-line'}`}
      />
    </Row>
  )
  const bool = (k: K, note?: string) => (
    <div className="flex flex-wrap items-center gap-1">
      <Checkbox checked={!!form[k]} onChange={(v) => set(k, v as never)} label={<span className="text-ink">{LABELS[k]}</span>} />
      {PENDING_DECISIONS.includes(k) && <DecisionBadge />}
      {note && <span className="w-full pl-6.5 text-[11px] text-muted">{note}</span>}
      {errors[k] && <span className="w-full pl-6.5 text-[11px] text-brand-red">{errors[k]}</span>}
    </div>
  )

  const saveDraft = () => {
    draftStore.set({ policy: withRecipients(), savedAt: new Date().toISOString(), savedBy: actor() })
    toast('Draft saved — not applied yet. Submit to apply the policy.', 'info')
  }

  const submit = () => {
    const next = withRecipients()
    const e = validate(next)
    setErrors(e)
    if (Object.keys(e).length) {
      toast('Fix the highlighted fields before submitting.', 'error')
      return
    }
    const changes = diffPolicy(live, next)
    if (changes.length === 0) {
      toast('No changes to apply.', 'info')
      return
    }
    const who = actor()
    if (apiEnabled) {
      securityApi
        .savePolicy(next)
        .then(() => {
          draftStore.set(null)
          toast(`Security policy updated (${changes.length} change${changes.length === 1 ? '' : 's'}) and audited.`)
        })
        .catch((err: Error) => toast(err.message || 'The server rejected the policy.', 'error'))
      return
    }
    policyStore.set({ ...next, updatedAt: new Date().toISOString(), updatedBy: who })
    logSecurity({ actor: who, action: 'Security policy updated', target: 'Central security policy', detail: changes.join('; ') })
    draftStore.set(null)
    toast(`Security policy updated (${changes.length} change${changes.length === 1 ? '' : 's'}) and audited.`)
  }

  const resetDefaults = () => {
    const who = actor()
    if (apiEnabled) {
      // Server keeps its own second-system default ("Replace Previous"); the rest go back to the spec defaults.
      const body: Partial<SecurityPolicy> = { ...DEFAULT_POLICY }
      delete body.secondSystem
      setConfirmReset(false)
      securityApi
        .savePolicy(body)
        .then(() => {
          draftStore.set(null)
          const p = policyStore.get()
          setForm(p)
          setRecipientsText(p.alertRecipients.join(', '))
          setErrors({})
          toast('Security policy reset to defaults and audited.')
        })
        .catch((err: Error) => toast(err.message || 'Reset failed.', 'error'))
      return
    }
    const changes = diffPolicy(live, DEFAULT_POLICY)
    policyStore.set({ ...DEFAULT_POLICY, updatedAt: new Date().toISOString(), updatedBy: who })
    logSecurity({ actor: who, action: 'Security policy reset to defaults', target: 'Central security policy', detail: changes.join('; ') || 'No differences' })
    draftStore.set(null)
    setForm(DEFAULT_POLICY)
    setRecipientsText(DEFAULT_POLICY.alertRecipients.join(', '))
    setErrors({})
    setConfirmReset(false)
    toast('Security policy reset to defaults and audited.')
  }

  const mfaRoles = [...new Set([...ROLES, ...Object.keys(form.mfaRequired)])]

  return (
    <PageShell
      Icon={ShieldCheck}
      title="Central Security Administration"
      sub="One policy for the web portal and the mobile app. Only Super Admin / Admin can change it; every change is recorded in the security audit trail."
      actions={
        <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={() => setConfirmReset(true)}>
          Reset to defaults
        </Button>
      }
    >
      <ApiStatus loading={loadState.loading} error={loadState.error} onRetry={fetchPolicy} />
      <Note>
        Last applied {fmtDT(live.updatedAt)} by <strong>{live.updatedBy}</strong>. Fields marked <DecisionBadge /> still need final values from Dexter management (§24) — the current
        values are proposals.
        {draft && (
          <span className="mt-1 block text-amber-700">
            An unapplied draft saved by {draft.savedBy} on {fmtDT(draft.savedAt)} is loaded in this form.
          </span>
        )}
      </Note>

      <Section title="Password policy" sub="Hashing (Argon2id) and plain-text prohibition are enforced on the server.">
        <div className="grid gap-4 sm:grid-cols-3">
          {num('minPasswordLength')}
          {num('passwordExpiryDays')}
          {num('passwordHistory')}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {bool('requireUpper')}
          {bool('requireLower')}
          {bool('requireNumber')}
          {bool('requireSpecial')}
        </div>
      </Section>

      <Section title="Login attempts, lockout & CAPTCHA" sub="§9 — locked accounts are unlocked by an Admin from Users & Access.">
        <div className="grid gap-4 sm:grid-cols-3">
          {num('maxFailedAttempts')}
          {num('lockoutMinutes')}
          {num('captchaAfterAttempts')}
        </div>
      </Section>

      <Section title="OTP & multi-factor authentication" sub="§3, §5 — OTP is single-use.">
        <div className="grid gap-4 sm:grid-cols-3">
          {num('otpValidityMinutes')}
          {num('otpResendLimit')}
          {num('otpVerifyAttempts')}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {bool('emailOtpEnabled')}
          {bool('smsOtpEnabled', 'Kept OFF for now — enable only after the SMS gateway API is integrated.')}
          {bool('totpEnabled')}
          {bool('passkeyEnabled', 'Optional additional verification.')}
        </div>
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-semibold text-ink">MFA requirement per role</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {mfaRoles.map((r) => (
              <Checkbox
                key={r}
                checked={!!form.mfaRequired[r]}
                onChange={(v) => set('mfaRequired', { ...form.mfaRequired, [r]: v })}
                label={<span className="text-ink">{r} — {form.mfaRequired[r] ? 'Mandatory' : 'Optional'}</span>}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">Spec table: MFA is mandatory for every role.</p>
        </div>
      </Section>

      <Section title="Sessions & tokens" sub="§6, §10 — one active session per user; all tabs / windows on one system count as one session.">
        <div className="grid gap-4 sm:grid-cols-4">
          {num('sessionIdleMinutes')}
          {num('accessTokenMinutes')}
          {num('refreshTokenDays')}
          <Row k="secondSystem">
            <select id="pol-secondSystem" value={form.secondSystem} onChange={(e) => set('secondSystem', e.target.value as SecurityPolicy['secondSystem'])} className={`${box} border-line`}>
              <option value="Block">Block the second system</option>
              <option value="Approved Session Transfer">Approved Session Transfer</option>
              <option value="Replace Previous">Replace the previous session</option>
            </select>
          </Row>
        </div>
      </Section>

      <Section title="Devices" sub="§8 — secure device identifier + attestation alongside IMEI.">
        <div className="grid gap-3 sm:grid-cols-2">
          {bool('deviceBinding')}
          {bool('deviceChangeNeedsApproval')}
          {bool('blockRootedDevices')}
          {bool('newDeviceVerification')}
        </div>
      </Section>

      <Section title="Monitoring & watermark" sub="§7, §11, §15">
        <div className="grid gap-3 sm:grid-cols-2">
          {bool('ipRiskMonitoring')}
          {bool('watermarkEnabled')}
        </div>
      </Section>

      <Section title="Audit retention, backup & recovery" sub="§16, §18">
        <div className="grid gap-4 sm:grid-cols-4">
          {num('auditRetentionDays')}
          <Row k="backupFrequency">
            <select id="pol-backupFrequency" value={form.backupFrequency} onChange={(e) => set('backupFrequency', e.target.value as SecurityPolicy['backupFrequency'])} className={`${box} border-line`}>
              {(['Hourly', 'Every 6 hours', 'Daily', 'Weekly'] as const).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Row>
          {num('rpoHours')}
          {num('rtoHours')}
        </div>
      </Section>

      <Section title="Security alert recipients" sub="§11 — the affected user is always notified as well.">
        <Row k="alertRecipients" error={errors.alertRecipients} hint="Comma-separated email addresses">
          <textarea id="pol-alertRecipients" rows={2} value={recipientsText} onChange={(e) => setRecipientsText(e.target.value)} className={`${box} h-auto py-2 ${errors.alertRecipients ? 'border-brand-red' : 'border-line'}`} />
        </Row>
      </Section>

      <div className="rounded-xl border border-line bg-white p-4">
        <div className="mb-3 text-[12px] text-muted">
          {pendingChanges.length === 0 ? 'No unapplied changes.' : `${pendingChanges.length} unapplied change${pendingChanges.length === 1 ? '' : 's'}:`}
          {pendingChanges.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-ink">
              {pendingChanges.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>
        <FormActions onBack={() => nav('/governance')} onDraft={saveDraft} onSubmit={submit} submitLabel="Submit & apply" />
      </div>

      {confirmReset && (
        <ConfirmModal title="Reset security policy to defaults?" sub="Every field returns to the default value and the change is audited." confirmLabel="Reset & apply" danger onConfirm={resetDefaults} onClose={() => setConfirmReset(false)}>
          <p>{diffPolicy(live, DEFAULT_POLICY).length} field(s) differ from the defaults.</p>
        </ConfirmModal>
      )}
    </PageShell>
  )
}
