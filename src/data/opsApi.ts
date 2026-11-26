// Shared plumbing for the Operations data modules when the backend API is enabled (VITE_API_URL).
// In mock mode (apiEnabled = false) none of this runs: the createStore seeds stay the source of truth.
import { useEffect, useSyncExternalStore } from 'react'
import { apiEnabled, ApiError, get } from '@/lib/api'
import { toast } from '@/components/ui/Toast'

export { apiEnabled }

/** Rupees (frontend) → integer paise (backend). */
export const toPaise = (rupees: number | null | undefined) => Math.round((Number(rupees) || 0) * 100)
/** Integer paise (backend) → rupees (frontend). */
export const fromPaise = (paise: number | null | undefined) => (Number(paise) || 0) / 100

export type Page<T> = { items: T[]; page: number; limit: number; total: number; pages: number }

/** Fetch every page of a paginated list endpoint (backend caps limit at 200). */
export async function fetchAll<T>(path: string, query: Record<string, string | number | boolean | undefined | null> = {}, maxPages = 25): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page <= maxPages; page++) {
    const r = await get<Page<T> | T[]>(path, { ...query, page, limit: 200 })
    if (Array.isArray(r)) return r
    out.push(...r.items)
    if (page >= (r.pages ?? 1)) break
  }
  return out
}

/** Human message for an API failure. */
export function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message || e.code
  if (e instanceof Error) return e.message
  return String(e)
}

/** Toast a backend error (and return the message). */
export function toastError(e: unknown, prefix?: string): string {
  const m = errMsg(e)
  toast(prefix ? `${prefix}: ${m}` : m, 'error')
  return m
}

/**
 * Run an API mutation: toast on failure and re-throw so the caller can keep its form open.
 * Usage: `await apiCall(() => post(...))`.
 */
export async function apiCall<T>(fn: () => Promise<T>, prefix?: string): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    toastError(e, prefix)
    throw e
  }
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
      useEffect(() => {
        void load()
      }, [])
      return useSyncExternalStore(subscribe, () => state)
    },
  }
}

/** Mount-time loader for several loaders at once; returns combined state. */
export function useLoaders(...loaders: { use(): LoadState }[]): LoadState {
  const states = loaders.map((l) => l.use())
  return { loading: states.some((s) => s.loading), error: states.find((s) => s.error)?.error ?? null, loaded: states.every((s) => s.loaded) }
}

/** ISO date-time → 'dd-mm-yyyy' (frontend display convention). */
export const isoToDmy = (iso?: string | null) => {
  if (!iso) return ''
  const d = iso.slice(0, 10).split('-')
  return d.length === 3 ? `${d[2]}-${d[1]}-${d[0]}` : iso
}
/** 'dd-mm-yyyy' or 'dd/mm/yyyy' → 'yyyy-mm-dd' (pass-through for ISO). */
export const dmyToIso = (s?: string | null) => {
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s
}
