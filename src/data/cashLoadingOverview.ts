import { createStore } from '@/lib/store'

export type SfMachineType = 'NCR' | 'Perto' | 'CRM'

export const SF_MACHINE_TYPES: SfMachineType[] = ['NCR', 'Perto', 'CRM']

export const SF_STATUS_OPTIONS = [
  'Email Done',
  'Email Not Done but CBR Updated',
  'FR Wrong Feeding',
  'Counter Not Received',
  'Discussion Pending at FR End',
  'Manually can add by setup',
] as const

export type SfStatus = typeof SF_STATUS_OPTIONS[number] | string

export interface CashLoadingOverviewRow {
  id: string
  sn: number
  spoc: string
  machineType: SfMachineType
  atmId: string
  franchiseeName: string
  cbrDate: string
  counterDate: string
  status: SfStatus
  date: string
}

const SEED_ATM_IDS = [
  'MPZ16801',
  'MPZ1626',
  'MPZ13549',
  'MPZ28724',
  'MPZ43899',
  'MPZ59074',
  'MPZ74249',
  'MPZ89424',
  'MPZ104599',
  'MPZ119774',
  'MPZ134949',
  'MPZ150124',
  'MPZ165299',
  'MPZ180474',
  'MPZ195649',
  'MPZ210824',
  'MPZ225999',
  'MPZ241174',
  'MPZ256349',
  'MPZ271524',
]

const SEED_FRANCHISEES = [
  'Guruprit Singh',
  'Pawan Gupta',
  'Guruprit Singh',
  'Pawan Gupta',
  'Guruprit Singh',
  'Pawan Gupta',
  'Guruprit Singh',
  'Pawan Gupta',
  'Guruprit Singh',
  'Pawan Gupta',
  'Guruprit Singh',
  'Pawan Gupta',
  'Guruprit Singh',
  'Pawan Gupta',
  'Guruprit Singh',
  'Pawan Gupta',
  'Guruprit Singh',
  'Pawan Gupta',
  'Guruprit Singh',
  'Pawan Gupta',
]

const SEED_STATUSES: SfStatus[] = [
  '',
  'Email Done',
  'Email Not Done but CBR Updated',
  'FR Wrong Feeding',
  'Counter Not Received',
  'Discussion Pending at FR End',
  '',
  'Manually can add by setup',
  'Email Done',
  'Email Done',
  'Counter Not Received',
  'Discussion Pending at FR End',
  'Email Done',
  'Email Not Done but CBR Updated',
  'Email Done',
  'FR Wrong Feeding',
  'Email Done',
  'Manually can add by setup',
  'Email Done',
  'Email Done',
]

function generateOverviewRows(): CashLoadingOverviewRow[] {
  return SEED_ATM_IDS.map((atmId, idx) => {
    const sn = idx + 1
    const mType: SfMachineType = idx % 3 === 0 ? 'NCR' : idx % 3 === 1 ? 'Perto' : 'CRM'
    return {
      id: `CL-OVW-${sn}`,
      sn,
      spoc: 'Harsh',
      machineType: mType,
      atmId,
      franchiseeName: SEED_FRANCHISEES[idx] ?? 'Pawan Gupta',
      cbrDate: '02.11.2026',
      counterDate: '02.11.2026',
      status: SEED_STATUSES[idx] ?? '',
      date: '2026-11-03',
    }
  })
}

export const cashLoadingOverviewStore = createStore<CashLoadingOverviewRow[]>(
  'dexter_cash_loading_overview_sf',
  () => generateOverviewRows(),
)

export function updateOverviewRow(id: string, updates: Partial<CashLoadingOverviewRow>) {
  const current = cashLoadingOverviewStore.get()
  const next = current.map((r) => (r.id === id ? { ...r, ...updates } : r))
  cashLoadingOverviewStore.set(next)
}

export function addOverviewRow(row: Omit<CashLoadingOverviewRow, 'id' | 'sn'>) {
  const current = cashLoadingOverviewStore.get()
  const sn = current.length + 1
  const id = `CL-OVW-${Date.now()}`
  const newRow: CashLoadingOverviewRow = {
    ...row,
    id,
    sn,
  }
  cashLoadingOverviewStore.set([...current, newRow])
  return newRow
}

export function resetOverviewStore() {
  cashLoadingOverviewStore.reset()
}

