// Shared plumbing for the business data modules (Legal, Projects, Installations, Onboarding, HRMS, Tasks, Broadcast,
// Mail, Reports, Dashboard, Privacy) when the backend API is enabled (VITE_API_URL).
// In mock mode (apiEnabled = false) nothing here runs: the createStore seeds stay the source of truth.
import { useEffect, useSyncExternalStore } from 'react'
import { apiEnabled, ApiError, get } from '@/lib/api'
import { toast } from '@/components/ui/Toast'

export { apiEnabled }

/** Rupees (frontend) → integer paise (backend). */
export const toPaise = (rupees: number | null | undefined) => Math.round((Number(rupees) || 0) * 100)
/** Integer paise (backend) → rupees (frontend). */
export const fromPaise = (paise: number | null | undefined) => (Number(paise) || 0) / 100

export type Page<T> = { items: T[]; page: number; limit: number; total: number; pages: number }

/** Fetch every page of a paginated list endpoint (backend caps limit at 200). Plain arrays pass through. */
export async function fetchAll<T>(path: string, query: Record<string, string | number | boolean | undefined | null> = {}, maxPages = 25): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page <= maxPages; page++) {
    const r = await get<Page<T> | T[] | { items: T[] }>(path, { ...query, page, limit: 200 })
    if (Array.isArray(r)) return r
    out.push(...(r.items ?? []))
    if (!('pages' in r) || page >= (r.pages ?? 1)) break
  }
  return out
}

/** Human message for an API failure. */
export function errMsg(e: unknown): string {
  if (e instanceof ApiError) {
    const d = Array.isArray(e.details) ? (e.details as { path?: string; message?: string }[]).map((x) => (x?.path ? `${x.path}: ${x.message}` : x?.message)).filter(Boolean) : []
    const issues = (e.details as { issues?: unknown[] } | undefined)?.issues
    const iss = Array.isArray(issues) ? issues.map((x) => (typeof x === 'string' ? x : (x as { message?: string })?.message)).filter(Boolean) : []
    const extra = [...d, ...iss].slice(0, 3).join('; ')
    return (e.message || e.code) + (extra ? ` — ${extra}` : '')
  }
  if (e instanceof Error) return e.message
  return String(e)
}

/** Toast a backend error (and return the message). */
export function toastError(e: unknown, prefix?: string): string {
  const m = errMsg(e)
  toast(prefix ? `${prefix}: ${m}` : m, 'error')
  return m
}

/** Run an API mutation: toast on failure and re-throw so the caller can keep its form open. */
export async function apiCall<T>(fn: () => Promise<T>, prefix?: string): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    toastError(e, prefix)
    throw e
  }
}

/** Fire-and-forget mutation for sync store functions: store is already updated optimistically; on failure toast + optional resync. */
export function background(fn: () => Promise<unknown>, prefix?: string, onError?: () => void) {
  if (!apiEnabled) return
  fn().catch((e) => {
    toastError(e, prefix)
    onError?.()
  })
}

export type LoadState = { loading: boolean; error: string | null; loaded: boolean }

/**
 * A hydration loader: runs `fn` once (deduped while in flight), tracks loading / error,
 * and is a no-op in mock mode. `fn` is expected to write the result into its store.
 */
export function createLoader(name: string, fn: () => Promise<void>) {
  let state: LoadState = { loading: false, error: null, loaded: !apiEnabled }
  let inflight: Promise<void> | null = null
  const listeners = new Set<() => void>()
  const set = (s: Partial<LoadState>) => {
    state = { ...state, ...s }
    listeners.forEach((l) => l())
  }
  const load = (force = false): Promise<void> => {
    if (!apiEnabled) return Promise.resolve()
    if (inflight) return inflight
    if (state.loaded && !force) return Promise.resolve()
    set({ loading: true, error: null })
    inflight = fn()
      .then(() => set({ loading: false, loaded: true, error: null }))
      .catch((e) => {
        set({ loading: false, error: toastError(e, `Could not load ${name}`) })
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }
  const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l))
  return {
    load,
    reload: () => load(true),
    getState: () => state,
    subscribe,
    /** Trigger the load on mount (API mode) and return the load state. */
    use(): LoadState {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        void load()
      }, [])
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useSyncExternalStore(subscribe, () => state)
    },
  }
}

/** Mount-time loader for several loaders at once; returns combined state. */
export function useLoaders(...loaders: { use(): LoadState }[]): LoadState {
  const states = loaders.map((l) => l.use())
  return { loading: states.some((s) => s.loading), error: states.find((s) => s.error)?.error ?? null, loaded: states.every((s) => s.loaded) }
}

/** ISO date-time → 'dd-mm-yyyy'. */
export const isoToDmy = (iso?: string | null) => {
  if (!iso) return ''
  const d = iso.slice(0, 10).split('-')
  return d.length === 3 ? `${d[2]}-${d[1]}-${d[0]}` : iso
}
/** ISO date-time → 'dd/mm/yyyy'. */
export const isoToDmySlash = (iso?: string | null) => isoToDmy(iso).replace(/-/g, '/')
/** 'dd-mm-yyyy' or 'dd/mm/yyyy' → 'yyyy-mm-dd' (pass-through for ISO). */
export const dmyToIso = (s?: string | null) => {
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s
}
/** ISO → 'DD Mon YYYY' (e.g. 20 Nov 2026). */
export const isoToPretty = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
/** ISO → 'DD Mon YYYY, HH:MM'. */
export const isoToPrettyTime = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : `${isoToPretty(iso)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}
