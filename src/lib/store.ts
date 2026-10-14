import { useSyncExternalStore } from 'react'

/**
 * Tiny persisted store: in-memory state mirrored to localStorage, with React subscription.
 * Stands in for API calls until the backend exists.
 */
export function createStore<T>(key: string, seed: () => T) {
  let state: T
  try {
    const raw = localStorage.getItem(key)
    state = raw ? (JSON.parse(raw) as T) : seed()
  } catch {
    state = seed()
  }
  const listeners = new Set<() => void>()

  const persist = () => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      /* quota / blocked storage — keep in memory only */
    }
  }

  return {
    get: () => state,
    set(next: T | ((prev: T) => T)) {
      state = typeof next === 'function' ? (next as (p: T) => T)(state) : next
      persist()
      listeners.forEach((l) => l())
    },
    reset() {
      state = seed()
      persist()
      listeners.forEach((l) => l())
    },
    subscribe(l: () => void) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    use(): T {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useSyncExternalStore(this.subscribe, this.get)
    },
  }
}
