import { createStore } from '@/lib/store'

export interface ApnaAppRegistration {
  id: string // e.g. "APP-0001"
  sn: string // Serial Number e.g. "1"
  siteLoiNumber: string // e.g. "ST-MH-PUN-00124"
  atmId: string // e.g. "DX-MH-01482"
  location: string // e.g. "Kothrud · Paud Road, Pune"

  // Franchise Details
  franchiseName: string // e.g. "Shree Sai Financial Services"
  franchiseContact: string // e.g. "98220 41124"
  franchiseEmail: string // e.g. "shreesai.fin@gmail.com"

  // Master Franchise Details
  masterFranchise: string // e.g. "Maharashtra Regional Network"
  masterContact: string // e.g. "98220 99881"
  masterEmail: string // e.g. "mf.mh@dexter.com"

  // User Credentials
  userId: string // e.g. "APNA_MH01482"
  password: string // e.g. "Dexter@2026"

  createdAt: string
  updatedAt: string
}

export const SEED_APNA_APP_REGISTRATIONS: ApnaAppRegistration[] = [
  {
    id: 'APP-0001',
    sn: '1',
    siteLoiNumber: 'ST-MH-PUN-00124',
    atmId: 'DX-MH-01482',
    location: 'Kothrud · Paud Road, Pune',
    franchiseName: 'Shree Sai Financial Services',
    franchiseContact: '98220 41124',
    franchiseEmail: 'shreesai.fin@gmail.com',
    masterFranchise: 'Maharashtra Regional Network',
    masterContact: '98220 99881',
    masterEmail: 'mf.mh@dexter.com',
    userId: 'APNA_MH01482',
    password: 'Password@123',
    createdAt: '2026-01-10T10:30:00.000Z',
    updatedAt: '2026-01-10T10:30:00.000Z',
  },
  {
    id: 'APP-0002',
    sn: '2',
    siteLoiNumber: 'ST-GJ-AMD-00218',
    atmId: 'DX-GJ-02187',
    location: 'Navrangpura · CG Road, Ahmedabad',
    franchiseName: 'Patel Cash Solutions',
    franchiseContact: '98250 21867',
    franchiseEmail: 'patelcash.amd@gmail.com',
    masterFranchise: 'Gujarat ATM Master Consortium',
    masterContact: '98250 11992',
    masterEmail: 'mf.gujarat@dexter.com',
    userId: 'APNA_GJ02187',
    password: 'Password@123',
    createdAt: '2026-01-15T11:45:00.000Z',
    updatedAt: '2026-01-15T11:45:00.000Z',
  },
  {
    id: 'APP-0003',
    sn: '3',
    siteLoiNumber: 'ST-KA-BLR-00076',
    atmId: 'DX-KA-00761',
    location: 'Jayanagar 4th Block, Bengaluru',
    franchiseName: 'Namma ATM Network',
    franchiseContact: '98450 07612',
    franchiseEmail: 'accounts@nammaatm.in',
    masterFranchise: 'Karnataka Banking Point Partners',
    masterContact: '98450 44321',
    masterEmail: 'mf.karnataka@dexter.com',
    userId: 'APNA_KA00761',
    password: 'Password@123',
    createdAt: '2026-02-01T09:15:00.000Z',
    updatedAt: '2026-02-01T09:15:00.000Z',
  },
  {
    id: 'APP-0004',
    sn: '4',
    siteLoiNumber: 'ST-UP-LKO-00305',
    atmId: 'DX-UP-03051',
    location: 'Hazratganj · Ashok Marg, Lucknow',
    franchiseName: 'Awadh Banking Point',
    franchiseContact: '94150 30518',
    franchiseEmail: 'awadh.bp@gmail.com',
    masterFranchise: 'Capital ATM Partners (UP)',
    masterContact: '94150 88771',
    masterEmail: 'mf.up@dexter.com',
    userId: 'APNA_UP03051',
    password: 'Password@123',
    createdAt: '2026-02-10T14:20:00.000Z',
    updatedAt: '2026-02-10T14:20:00.000Z',
  },
  {
    id: 'APP-0005',
    sn: '5',
    siteLoiNumber: 'ST-WB-NDA-00183',
    atmId: 'DX-WB-01831',
    location: 'Krishnanagar · Station Road, Nadia',
    franchiseName: 'Bengal Rural Payments',
    franchiseContact: '94330 18307',
    franchiseEmail: 'bengalrural.pay@gmail.com',
    masterFranchise: 'Eastern Financial Network',
    masterContact: '94330 66554',
    masterEmail: 'mf.east@dexter.com',
    userId: 'APNA_WB01831',
    password: 'Password@123',
    createdAt: '2026-02-18T16:00:00.000Z',
    updatedAt: '2026-02-18T16:00:00.000Z',
  },
]

export const apnaAppStore = createStore<ApnaAppRegistration[]>(
  'dexter.apna_app.registrations.v1',
  () => SEED_APNA_APP_REGISTRATIONS,
)

export const useApnaAppRegistrations = () => apnaAppStore.use()

export function getApnaAppRegistration(id: string): ApnaAppRegistration | undefined {
  const all = apnaAppStore.get()
  return all.find((item) => item.id === id || item.sn === id || item.atmId === id)
}

export function nextSn(): string {
  const all = apnaAppStore.get()
  const highest = all.reduce((max, item) => {
    const num = parseInt(item.sn, 10)
    return !Number.isNaN(num) ? Math.max(max, num) : max
  }, 0)
  return String(highest + 1)
}

export function nextAppId(): string {
  const all = apnaAppStore.get()
  const highest = all.reduce((max, item) => {
    const match = item.id.match(/(\d+)$/)
    if (match) return Math.max(max, parseInt(match[1], 10))
    return max
  }, 5)
  return `APP-${String(highest + 1).padStart(4, '0')}`
}

export function saveApnaAppRegistration(record: ApnaAppRegistration): ApnaAppRegistration {
  const now = new Date().toISOString()
  const existing = record.id ? getApnaAppRegistration(record.id) : undefined

  const toSave: ApnaAppRegistration = {
    ...record,
    id: existing?.id || record.id || nextAppId(),
    sn: record.sn || existing?.sn || nextSn(),
    updatedAt: now,
    createdAt: existing?.createdAt || now,
  }

  apnaAppStore.set((list) => {
    const exists = list.some((item) => item.id === toSave.id)
    if (exists) {
      return list.map((item) => (item.id === toSave.id ? toSave : item))
    }
    return [toSave, ...list]
  })

  return toSave
}

export function deleteApnaAppRegistration(id: string) {
  apnaAppStore.set((list) => list.filter((item) => item.id !== id))
}

export function createEmptyApnaAppRegistration(): ApnaAppRegistration {
  return {
    id: '',
    sn: nextSn(),
    siteLoiNumber: '',
    atmId: '',
    location: '',
    franchiseName: '',
    franchiseContact: '',
    franchiseEmail: '',
    masterFranchise: '',
    masterContact: '',
    masterEmail: '',
    userId: '',
    password: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
