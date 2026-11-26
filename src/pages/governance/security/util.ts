// Helpers shared by the security-administration and DPDP privacy pages.
import { useEffect, useState } from 'react'
import { getSession } from '@/lib/auth'
import { passwordRules, type SecurityPolicy } from '@/data/security'
import { toast } from '@/components/ui/Toast'

/** Name of the signed-in person — used as the actor on every audit entry. */
export const actor = () => getSession()?.name ?? 'Unknown user'

export const fmtDT = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
export const fmtD = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

/** Ticking clock for countdowns / overdue checks (cleans its interval up). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

/** True when `iso` falls inside the optional yyyy-mm-dd range (inclusive). */
export function inDateRange(iso: string | undefined, from: string, to: string) {
  if (!from && !to) return true
  if (!iso) return false
  const d = iso.slice(0, 10)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
export const isMobile = (v: string) => /^[6-9]\d{9}$/.test(v.replace(/\D/g, '').slice(-10)) && v.replace(/\D/g, '').length >= 10

/** One-time default password that satisfies the current password policy. */
export function generatePassword(policy: SecurityPolicy) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '@#$%&*!?']
  const all = sets.join('')
  const len = Math.max(12, policy.minPasswordLength)
  const rand = (n: number) => {
    const a = new Uint32Array(1)
    crypto.getRandomValues(a)
    return a[0] % n
  }
  for (let attempt = 0; attempt < 50; attempt++) {
    const chars = sets.map((s) => s[rand(s.length)])
    while (chars.length < len) chars.push(all[rand(all.length)])
    for (let i = chars.length - 1; i > 0; i--) {
      const j = rand(i + 1)
      ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }
    const pw = chars.join('')
    if (passwordRules(policy).every((r) => r.test(pw))) return pw
  }
  return `Dx#${Date.now().toString(36)}Aa9!`
}

/** API mode: run a backend mutation, toast success / the backend error. */
export function apiRun(p: Promise<unknown>, ok?: string, onDone?: () => void) {
  return p
    .then(() => {
      if (ok) toast(ok)
      onDone?.()
    })
    .catch((e: Error) => toast(e.message || 'The server rejected the request.', 'error'))
}
