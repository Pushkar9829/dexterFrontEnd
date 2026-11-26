import { useMemo, useState } from 'react'
import { employeeById } from '@/data/workflow'

export const fmtDT = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
export const fmtD = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export const empLabel = (id?: string) => {
  const e = employeeById(id)
  return e ? `${e.name} (${e.designation})` : id ?? '—'
}
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Client-side paging; resets to page 1 whenever `resetKey` changes. */
export function usePaged<T>(rows: T[], resetKey: string, initial = 10) {
  // page is remembered per filter key, so a new filter starts on page 1 without setState during render
  const [state, setState] = useState({ key: resetKey, page: 1 })
  const [pageSize, setPageSize] = useState(initial)
  const page = state.key === resetKey ? state.page : 1
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const cur = Math.min(page, pages)
  const slice = useMemo(() => rows.slice((cur - 1) * pageSize, cur * pageSize), [rows, cur, pageSize])
  const setPage = (p: number) => setState({ key: resetKey, page: p })
  return { page: cur, pageSize, setPage, setPageSize, slice }
}
