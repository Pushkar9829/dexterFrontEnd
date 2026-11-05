import { createStore } from '@/lib/store'

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
  franchiseeName: string
  cbrDate: string // e.g. "02.11.2026" or ""
  counterDate: string // e.g. "02.11.2026" or ""
  status: HampStatus
  remarks?: string
  date: string // e.g. "2026-11-03"
}

const ATM_IDS = [
  'MPZ16801', 'MPZ16016', 'MPZ15231', 'MPZ14446', 'MPZ13661',
  'MPZ12876', 'MPZ12091', 'MPZ11306', 'MPZ10521', 'MPZ9736',
  'MPZ8951', 'MPZ8166', 'MPZ7381', 'MPZ6596', 'MPZ5811',
  'MPZ5026', 'MPZ4241', 'MPZ3456', 'MPZ2671', 'MPZ1886',
]

const CRM_IDS = [
  'MCRM16801', 'MCRM16016', 'MCRM15231', 'MCRM14446', 'MCRM13661',
  'MCRM12876', 'MCRM12091', 'MCRM11306', 'MCRM10521', 'MCRM9736',
  'MCRM8951', 'MCRM8166', 'MCRM7381', 'MCRM6596', 'MCRM5811',
  'MCRM5026', 'MCRM4241', 'MCRM3456', 'MCRM2671', 'MCRM1886',
]

const FRANCHISEES_LIST = [
  'Guruprit Singh', 'Pawan Gupta', 'Guruprit Singh', 'Pawan Gupta', 'Guruprit Singh',
  'Pawan Gupta', 'Guruprit Singh', 'Pawan Gupta', 'Guruan Gungh', 'Pawprit Sipta',
  'Guruprit Singh', 'Pawan Gupta', 'Guruprit Singh', 'Pawan Gupta', 'Guruprit Singh',
  'Pawan Gupta', 'Guruprit Singh', 'Pawan Gupta', 'Guruprit Singh', 'Pawan Gupta',
]

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
  const ids = type === 'ATM' ? ATM_IDS : CRM_IDS
  return ids.map((atmId, idx) => {
    const sn = idx + 1
    const cbrVal = sn === 1 ? '02.11.2026' : (sn <= 6 ? (sn % 2 === 0 ? '02.11.2026' : '01.11.2026') : '')
    const counterVal = sn === 1 ? '02.11.2026' : (sn <= 8 ? (sn % 3 === 0 ? '01.11.2026' : '02.11.2026') : '')

    return {
      id: `HAMP-${type}-${sn}`,
      sn,
      type,
      spoc: 'Harsh',
      atmId,
      franchiseeName: FRANCHISEES_LIST[idx] ?? 'Pawan Gupta',
      cbrDate: cbrVal,
      counterDate: counterVal,
      status: STATUS_DEFAULTS[idx] ?? '',
      date: '2026-11-03',
    }
  })
}

const SEED_HAMP_DATA: HampRow[] = [
  ...generateSeedRows('ATM'),
  ...generateSeedRows('CRM'),
]

export const hampStore = createStore<HampRow[]>('dexter_hamp_reports', () => SEED_HAMP_DATA)

export function updateHampRow(id: string, updates: Partial<HampRow>) {
  const current = hampStore.get()
  const next = current.map((r) => (r.id === id ? { ...r, ...updates } : r))
  hampStore.set(next)
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
  hampStore.reset()
}

