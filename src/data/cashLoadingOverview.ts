import { createStore } from '@/lib/store'
import { siteAt, franchiseNameOf } from '@/lib/siteRef'

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
  siteId?: string // Site Master Site ID
  franchiseeName: string
  cbrDate: string
  counterDate: string
  status: SfStatus
  date: string
}

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

// Seed rows are the Self Funding (SF) sites of the Site Master — ATM ID, franchise and machine type come from there.
function generateOverviewRows(): CashLoadingOverviewRow[] {
  return SEED_STATUSES.map((_, idx) => {
    const sn = idx + 1
    const site = siteAt(idx, (s) => s.siteType === 'SF')
    const mType: SfMachineType = (SF_MACHINE_TYPES as string[]).includes(site.machineType) ? (site.machineType as SfMachineType) : 'NCR'
    return {
      id: `CL-OVW-${sn}`,
      sn,
      spoc: 'Harsh',
      machineType: mType,
      atmId: site.atmId,
      siteId: site.siteId,
      franchiseeName: franchiseNameOf(site),
      cbrDate: '02.11.2026',
      counterDate: '02.11.2026',
      status: SEED_STATUSES[idx] ?? '',
      date: '2026-11-03',
    }
  })
}

export const cashLoadingOverviewStore = createStore<CashLoadingOverviewRow[]>(
  'dexter_cash_loading_overview_sf.v2',
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

