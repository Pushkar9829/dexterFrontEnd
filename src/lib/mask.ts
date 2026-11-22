// Data masking (DPDP §10 + Security §15): show sensitive values partially unless the role may see them.
export const maskAccount = (v?: string) => (!v ? '—' : v.length <= 4 ? v : `${'•'.repeat(Math.max(4, v.length - 4))}${v.slice(-4)}`)
export const maskMobile = (v?: string) => (!v ? '—' : v.replace(/\D/g, '').replace(/^(\d{2})\d+(\d{2})$/, '$1••••••$2'))
export const maskEmail = (v?: string) => {
  if (!v || !v.includes('@')) return v || '—'
  const [u, d] = v.split('@')
  return `${u.slice(0, 2)}${'•'.repeat(Math.max(2, u.length - 2))}@${d}`
}
export const maskPan = (v?: string) => (!v ? '—' : v.length < 10 ? v : `${v.slice(0, 2)}•••••${v.slice(7)}`)
export const maskAadhaar = (v?: string) => (!v ? '—' : `XXXX XXXX ${v.replace(/\D/g, '').slice(-4)}`)
