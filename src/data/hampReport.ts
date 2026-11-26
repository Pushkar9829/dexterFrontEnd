import { createStore } from '@/lib/store'
import { siteAt, franchiseNameOf } from '@/lib/siteRef'
import { patch, post } from '@/lib/api'
import { apiEnabled, apiCall, createLoader, fetchAll } from './opsApi'

export type HampViewType = 'ATM' | 'CRM'

export const HAMP_STATUS_OPTIONS = [
  'Hamp Updated',
  'HAMP Not Open',
  'FR Wrong Feeding',
  'Counter Not Received',
  'Discussion Pending at FR End',
  'Manually can add by setup',
] as const

export type HampStatus = typeof HAMP_STATUS_OPTIONS[number] | string

export interface HampRow {
  id: string
  sn: number
  type: HampViewType // 'ATM' | 'CRM'
  spoc: string
  atmId: string
  siteId?: string // Site Master Site ID
  franchiseeName: string
  cbrDate: string // e.g. "02.11.2026" or ""
  counterDate: string // e.g. "02.11.2026" or ""
  status: HampStatus
  remarks?: string
  date: string // e.g. "2026-11-03"
}

const STATUS_DEFAULTS: HampStatus[] = [
  '',
  'Hamp Updated',
  'HAMP Not Open',
  'FR Wrong Feeding',
  'Counter Not Received',
  'Discussion Pending at FR End',
  'Manually can add by setup',
  'Manually can add by setup',
  'Hamp Updated',
  'Hamp Updated',
  'Counter Not Received',
  'Hamp Updated',
  'HAMP Not Open',
  'Hamp Updated',
  'Discussion Pending at FR End',
  'Hamp Updated',
  'Manually can add by setup',
  'Hamp Updated',
  'Hamp Updated',
  'Hamp Updated',
]

function generateSeedRows(type: HampViewType): HampRow[] {
  // ATM view = cash-dispenser sites (NCR / Perto), CRM view = cash-recycler sites — all from the Site Master.
  return STATUS_DEFAULTS.map((_, idx) => {
    const site = siteAt(idx, (s) => (type === 'CRM' ? s.machineType === 'CRM' : s.machineType !== 'CRM'))
    const sn = idx + 1
    const cbrVal = sn === 1 ? '02.11.2026' : (sn <= 6 ? (sn % 2 === 0 ? '02.11.2026' : '01.11.2026') : '')
    const counterVal = sn === 1 ? '02.11.2026' : (sn <= 8 ? (sn % 3 === 0 ? '01.11.2026' : '02.11.2026') : '')

    return {
      id: `HAMP-${type}-${sn}`,
      sn,
      type,
      spoc: 'Harsh',
      atmId: site.atmId,
      siteId: site.siteId,
      franchiseeName: franchiseNameOf(site),
      cbrDate: cbrVal,
      counterDate: counterVal,
      status: STATUS_DEFAULTS[idx] ?? '',
      date: '2026-11-03',
    }
  })
}

const seedHamp = (): HampRow[] => [...generateSeedRows('ATM'), ...generateSeedRows('CRM')]

// API mode keeps its own key so the mock-mode demo data is never overwritten.
export const hampStore = createStore<HampRow[]>(apiEnabled ? 'dexter.api.hamp.v1' : 'dexter_hamp_reports.v2', apiEnabled ? () => [] : seedHamp)

// ── Backend (/ops-intel/hamp) ─────────────────────────────────────────
type ApiHamp = { hampId: string; type: HampViewType; spoc: string; atmId: string; siteId?: string; franchiseeName: string; cbrDate: string; counterDate: string; status: string; remarks?: string; date: string }

const fromApi = (r: ApiHamp, sn: number): HampRow => ({
  id: r.hampId,
  sn,
  type: r.type,
  spoc: r.spoc,
  atmId: r.atmId,
  siteId: r.siteId,
  franchiseeName: r.franchiseeName,
  cbrDate: r.cbrDate ?? '',
  counterDate: r.counterDate ?? '',
  status: r.status ?? '',
  remarks: r.remarks ?? '',
  date: r.date,
})

/** Renumber S.N. per view type (oldest first, as the register reads). */
const renumber = (rows: HampRow[]) => {
  const n: Record<string, number> = {}
  return rows.map((r) => ({ ...r, sn: (n[r.type] = (n[r.type] ?? 0) + 1) }))
}

export const hampLoader = createLoader('HAMP report', async () => {
  const items = await fetchAll<ApiHamp>('/ops-intel/hamp', { sort: 'date' })
  hampStore.set(renumber(items.map((r, i) => fromApi(r, i + 1))))
})

export function updateHampRow(id: string, updates: Partial<HampRow>) {
  const current = hampStore.get()
  const next = current.map((r) => (r.id === id ? { ...r, ...updates } : r))
  hampStore.set(next)
  if (!apiEnabled) return
  // optimistic local update; server response replaces the row, a failure reloads the list
  const body: Record<string, string> = {}
  for (const k of ['status', 'remarks', 'cbrDate', 'counterDate', 'spoc'] as const) if (updates[k] !== undefined) body[k] = String(updates[k])
  apiCall(() => patch<ApiHamp>(`/ops-intel/hamp/${encodeURIComponent(id)}`, body), 'HAMP update failed')
    .then((r) => hampStore.set((rows) => rows.map((x) => (x.id === id ? fromApi(r, x.sn) : x))))
    .catch(() => void hampLoader.reload())
}

/** API-aware add: posts to the backend (Site Master validated server-side) and appends the stored row. */
export async function addHampRowAsync(row: Omit<HampRow, 'id' | 'sn'> & { type: HampViewType }): Promise<HampRow> {
  if (!apiEnabled) return addHampRow(row)
  const r = await apiCall(
    () => post<ApiHamp>('/ops-intel/hamp', { type: row.type, spoc: row.spoc, atmOrSite: row.siteId || row.atmId, cbrDate: row.cbrDate, counterDate: row.counterDate, status: row.status, remarks: row.remarks ?? '', date: row.date }),
    'Could not add HAMP row',
  )
  const out = fromApi(r, hampStore.get().filter((x) => x.type === row.type).length + 1)
  hampStore.set((rows) => [...rows, out])
  return out
}

export function addHampRow(row: Omit<HampRow, 'id' | 'sn'> & { type: HampViewType }) {
  const current = hampStore.get()
  const sameTypeRows = current.filter((r) => r.type === row.type)
  const sn = sameTypeRows.length + 1
  const id = `HAMP-${row.type}-${Date.now()}`
  const newRow: HampRow = {
    ...row,
    id,
    sn,
  }
  hampStore.set([...current, newRow])
  return newRow
}

export function resetHampStore() {
  if (apiEnabled) return void hampLoader.reload()
  hampStore.reset()
}

