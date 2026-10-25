import { clfStore } from './reportsFinancial'

export interface ClfRecord {
  id: string
  siteId: string
  atmId: string
  franchiseeName: string
  franchiseeNo: string
  cashLiveDate: string
  clfStatus: string
  hpyAccount: string
  clfAmount: string
  paymentDate: string
  transferTime: string
  frBank: string
  holder: string
  utr: string
  settlementBank: string
  createdAt?: string
  updatedAt?: string
}

export const CLF_STATUS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
] as const

export const CLF_SETTLEMENT_BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'Kotak Mahindra Bank',
  'Indian Bank',
] as const

export const useClfRecords = (): ClfRecord[] => clfStore.use() as unknown as ClfRecord[]

export function getClfRecord(id: string): ClfRecord | undefined {
  const all = clfStore.get() as unknown as ClfRecord[]
  return all.find(
    (c) =>
      c.id === id ||
      c.utr.toLowerCase() === id.toLowerCase() ||
      c.hpyAccount === id,
  )
}

export function nextClfId(): string {
  const all = clfStore.get()
  const highest = all.reduce((max, c) => {
    const match = c.id.match(/(\d+)/)
    if (match) return Math.max(max, parseInt(match[1], 10))
    return max
  }, 10)
  return `CLF-${highest + 1}-1`
}

export function saveClfRecord(record: ClfRecord): ClfRecord {
  const now = new Date().toISOString()
  const existing = record.id ? getClfRecord(record.id) : undefined

  const toSave: ClfRecord = {
    ...record,
    id: existing?.id || record.id || nextClfId(),
    updatedAt: now,
    createdAt: existing?.createdAt || now,
  }

  clfStore.set((list) => {
    const exists = list.some((c) => c.id === toSave.id)
    if (exists) {
      return list.map((c) => (c.id === toSave.id ? (toSave as any) : c))
    }
    return [toSave as any, ...list]
  })

  return toSave
}

export function deleteClfRecord(id: string) {
  clfStore.set((list) => list.filter((c) => c.id !== id))
}

export function createEmptyClfRecord(): ClfRecord {
  return {
    id: '',
    siteId: '',
    atmId: '',
    franchiseeName: '',
    franchiseeNo: '',
    cashLiveDate: new Date().toISOString().slice(0, 10),
    clfStatus: '1st',
    hpyAccount: '',
    clfAmount: '250000',
    paymentDate: new Date().toISOString().slice(0, 10),
    transferTime: '12:00',
    frBank: 'HDFC Bank',
    holder: '',
    utr: '',
    settlementBank: 'State Bank of India',
  }
}
