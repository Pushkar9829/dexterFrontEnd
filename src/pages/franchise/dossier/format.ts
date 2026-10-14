// ── formatting / masking ───────────────────────────────────────────────
const digits = (v: string) => v.replace(/\D/g, '')
const isNum = (v: string) => v.trim() !== '' && !Number.isNaN(Number(v))

export const fmt = {
  phone: (v: string) => {
    const d = digits(v)
    return d.length >= 10 ? `+91 ${d.slice(-10, -8)}••• ••${d.slice(-3)}` : v
  },
  account: (v: string) => (v ? `•••• •••• •••• ${v.slice(-4)}` : ''),
  ifsc: (v: string) => v.replace(/\b([A-Z]{4}0)[A-Z0-9]{3}([A-Z0-9]{3})\b/gi, '$1•••$2'),
  meter: (v: string) => v.replace(/\d{6,}/g, (m) => `•••• ${m.slice(-4)}`),
  unit: (v: string, unit: string) => (isNum(v) ? `${v} ${unit}` : v),
  lat: (v: string) => (isNum(v) ? `${Math.abs(Number(v))}° ${Number(v) < 0 ? 'S' : 'N'}` : v),
  lng: (v: string) => (isNum(v) ? `${Math.abs(Number(v))}° ${Number(v) < 0 ? 'W' : 'E'}` : v),
}

/** Opens the OS file picker and resolves with the chosen files (empty when cancelled). */
export function pickFiles(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.onchange = () => resolve(Array.from(input.files ?? []))
    input.click()
  })
}

export const MAX_MB = 10
