// HTTP client for the Dexter ERP backend (C:\free\dexter\backend, /api/v1).
// Mode: VITE_API_URL set → live backend; unset → the app keeps running on the local demo stores (mock mode),
// so the static demo deployment keeps working. Use `apiEnabled` to branch.
// Tokens: short-lived access token in memory + localStorage, rotating refresh token in localStorage.

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
export const apiEnabled = API_URL !== ''

const TK = 'dexter.api.tokens.v1'
type Tokens = { accessToken: string; refreshToken: string; expiresAt: number }
let tokens: Tokens | null = (() => {
  try {
    const raw = localStorage.getItem(TK)
    return raw ? (JSON.parse(raw) as Tokens) : null
  } catch {
    return null
  }
})()

export function setTokens(t: { accessToken: string; refreshToken: string; expiresIn: number } | null) {
  tokens = t ? { accessToken: t.accessToken, refreshToken: t.refreshToken, expiresAt: Date.now() + t.expiresIn * 1000 } : null
  try {
    if (tokens) localStorage.setItem(TK, JSON.stringify(tokens))
    else localStorage.removeItem(TK)
  } catch {
    /* ignore */
  }
}
export const hasTokens = () => tokens !== null

/** Stable per-browser device id (device binding on the backend). */
export function deviceId(): string {
  const k = 'dexter.deviceId'
  try {
    let id = localStorage.getItem(k)
    if (!id) {
      id = `web-${crypto.randomUUID()}`
      localStorage.setItem(k, id)
    }
    return id
  } catch {
    return 'web-anonymous'
  }
}

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

let refreshing: Promise<boolean> | null = null
async function refreshTokens(): Promise<boolean> {
  if (!tokens) return false
  refreshing ??= (async () => {
    try {
      const r = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: tokens!.refreshToken, deviceId: deviceId() }) })
      if (!r.ok) {
        setTokens(null)
        return false
      }
      setTokens(await r.json())
      return true
    } catch {
      return false
    } finally {
      setTimeout(() => (refreshing = null), 0)
    }
  })()
  return refreshing
}

/** Listeners for "session ended" (401 after refresh failed, or LOGGED_IN_ELSEWHERE / IDLE_TIMEOUT). */
const sessionEnded = new Set<(code: string) => void>()
export const onSessionEnded = (fn: (code: string) => void) => (sessionEnded.add(fn), () => sessionEnded.delete(fn))

type Opts = { method?: string; body?: unknown; query?: Record<string, string | number | boolean | undefined | null>; form?: FormData; auth?: boolean; raw?: boolean }

export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  if (!apiEnabled) throw new ApiError(0, 'API_DISABLED', 'Backend API is not configured (VITE_API_URL).')
  const q = opts.query ? '?' + new URLSearchParams(Object.entries(opts.query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])).toString() : ''
  const doFetch = () => {
    const headers: Record<string, string> = { 'X-Device-Id': deviceId() }
    if (!opts.form) headers['Content-Type'] = 'application/json'
    if (opts.auth !== false && tokens) headers.Authorization = `Bearer ${tokens.accessToken}`
    return fetch(`${API_URL}${path}${q === '?' ? '' : q}`, { method: opts.method ?? (opts.body || opts.form ? 'POST' : 'GET'), headers, body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined) })
  }
  if (opts.auth !== false && tokens && tokens.expiresAt - Date.now() < 30_000) await refreshTokens()
  let res = await doFetch()
  if (res.status === 401 && opts.auth !== false && tokens) {
    const body = await res.clone().json().catch(() => ({}))
    const code = body?.error?.code ?? ''
    if (code === 'LOGGED_IN_ELSEWHERE' || code === 'IDLE_TIMEOUT' || code === 'SESSION_IDLE' || code === 'SESSION_REVOKED') {
      setTokens(null)
      sessionEnded.forEach((f) => f(code))
    } else if (await refreshTokens()) res = await doFetch()
    else sessionEnded.forEach((f) => f('UNAUTHORIZED'))
  }
  if (opts.raw) return res as unknown as T
  const text = await res.text()
  const data = text ? (() => { try { return JSON.parse(text) } catch { return text } })() : undefined
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string; details?: unknown } })?.error
    throw new ApiError(res.status, e?.code ?? `HTTP_${res.status}`, e?.message ?? res.statusText, e?.details)
  }
  return data as T
}

export const get = <T>(p: string, query?: Opts['query']) => api<T>(p, { query })
export const post = <T>(p: string, body?: unknown) => api<T>(p, { method: 'POST', body: body ?? {} })
export const patch = <T>(p: string, body?: unknown) => api<T>(p, { method: 'PATCH', body: body ?? {} })
export const put = <T>(p: string, body?: unknown) => api<T>(p, { method: 'PUT', body: body ?? {} })
/** DELETE; `body` for soft deletes that need a `{ reason }`. */
export const del = <T>(p: string, body?: unknown) => api<T>(p, { method: 'DELETE', body })

/**
 * Owner of an uploaded file (POST /files fields). Downloads are authorised by the module that owns the file:
 * `entity` first (backend files/access.ts BY_ENTITY, case-insensitive — e.g. FinanceRecord, LegalCheque, Complaint,
 * WorkTask), else `purpose` (BY_PURPOSE — e.g. legal, kyc, complaint-evidence, wla-statement). `purpose` also selects
 * the allowed types: wla-statement / txn-data / tds / payout-file add CSV + XLSX, complaint-evidence adds MP4.
 * A file without a known owner is readable only by its uploader and security admins.
 */
export type UploadMeta = { entity?: string; purpose?: string; ref?: string }

/** Upload one file to the backend files module; returns the stored file record (fileId etc.). */
export async function uploadFile(file: File, meta: UploadMeta = {}) {
  const form = new FormData()
  form.append('file', file)
  ;(['purpose', 'entity', 'ref'] as const).forEach((k) => {
    const v = meta[k]?.trim()
    if (v) form.append(k, v.slice(0, k === 'ref' ? 80 : 60))
  })
  const r = await api<{ fileId: string; originalName?: string; name?: string; size: number; mime?: string; mimeType?: string }>('/files', { method: 'POST', form })
  return { ...r, name: r.originalName ?? r.name ?? file.name, mime: r.mime ?? r.mimeType ?? file.type }
}
