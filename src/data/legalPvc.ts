import { createStore } from '@/lib/store'

export type PvcStatus = 'Active' | 'Pending' | 'Not Generated' | 'Signature Pending'

export interface PvcRecord {
  id: string
  sn: number
  siteId: string
  siteLoi: string
  atmId: string
  franchiseName: string
  mobileNumber: string
  model: string
  email: string
  pvcDate: string
  expiryDate: string
  status: PvcStatus
  fileName?: string
  fileSizeKb?: number
  remark: string
  createdAt: string
  updatedAt: string
}

export interface PvcState {
  records: PvcRecord[]
}

const SEED_PVC_RECORDS: PvcRecord[] = [
  {
    id: 'PVC-001',
    sn: 1,
    siteId: 'S-1001',
    siteLoi: 'SIT-2025-001',
    atmId: 'ATM001',
    franchiseName: 'Shree Sai Financial Services',
    mobileNumber: '+91 98765 43210',
    model: 'Hitachi ATM Model XYZ',
    email: 'sai.financial@gmail.com',
    pvcDate: '01/08/2025',
    expiryDate: '31/07/2027',
    status: 'Active',
    fileName: 'PVC_S-1001_Signed.pdf',
    fileSizeKb: 1420,
    remark: 'Verified',
    createdAt: '2025-08-01T10:00:00.000Z',
    updatedAt: '2025-08-01T10:00:00.000Z',
  },
  {
    id: 'PVC-002',
    sn: 2,
    siteId: 'S-1005',
    siteLoi: 'SIT-2025-005',
    atmId: 'ATM003',
    franchiseName: 'Om Finserve',
    mobileNumber: '+91 98123 45678',
    model: 'GRG ATM Model ABC',
    email: 'contact@omfinserve.in',
    pvcDate: '05/08/2025',
    expiryDate: '04/08/2027',
    status: 'Pending',
    fileName: 'PVC_S-1005_Draft.pdf',
    fileSizeKb: 1180,
    remark: 'Document submitted',
    createdAt: '2025-08-05T11:30:00.000Z',
    updatedAt: '2025-08-05T11:30:00.000Z',
  },
  {
    id: 'PVC-003',
    sn: 3,
    siteId: 'S-1012',
    siteLoi: 'SIT-2025-012',
    atmId: 'ATM007',
    franchiseName: 'Kuber ATM Solutions',
    mobileNumber: '+91 97654 32109',
    model: 'NCR ATM Model 5886',
    email: 'info@kuberatm.in',
    pvcDate: '08/08/2025',
    expiryDate: '07/08/2027',
    status: 'Not Generated',
    remark: '-',
    createdAt: '2025-08-08T09:15:00.000Z',
    updatedAt: '2025-08-08T09:15:00.000Z',
  },
  {
    id: 'PVC-004',
    sn: 4,
    siteId: 'S-1018',
    siteLoi: 'SIT-2025-018',
    atmId: 'ATM011',
    franchiseName: 'Madhav Enterprises',
    mobileNumber: '+91 98987 65432',
    model: 'Diebold ATM Model 5500',
    email: 'madhav.ent@gmail.com',
    pvcDate: '12/08/2025',
    expiryDate: '11/08/2027',
    status: 'Signature Pending',
    fileName: 'PVC_S-1018_Unsigned.pdf',
    fileSizeKb: 950,
    remark: 'Pending signature',
    createdAt: '2025-08-12T14:20:00.000Z',
    updatedAt: '2025-08-12T14:20:00.000Z',
  },
  {
    id: 'PVC-005',
    sn: 5,
    siteId: 'S-1024',
    siteLoi: 'SIT-2025-024',
    atmId: 'ATM015',
    franchiseName: 'Shakti Associates',
    mobileNumber: '+91 90012 34567',
    model: 'Hitachi ATM Model ABC',
    email: 'shakti.assoc@outlook.com',
    pvcDate: '16/08/2025',
    expiryDate: '15/08/2027',
    status: 'Active',
    fileName: 'PVC_S-1024_Cleared.pdf',
    fileSizeKb: 1650,
    remark: 'Verified',
    createdAt: '2025-08-16T16:45:00.000Z',
    updatedAt: '2025-08-16T16:45:00.000Z',
  },
  {
    id: 'PVC-006',
    sn: 6,
    siteId: 'S-1031',
    siteLoi: 'SIT-2025-031',
    atmId: 'ATM019',
    franchiseName: 'Balaji Payments & ATM',
    mobileNumber: '+91 98450 67890',
    model: 'Hyosung ATM 2800',
    email: 'balaji.atm@fintech.in',
    pvcDate: '20/08/2025',
    expiryDate: '19/08/2027',
    status: 'Active',
    fileName: 'PVC_S-1031_Verified.pdf',
    fileSizeKb: 1390,
    remark: 'Verified',
    createdAt: '2025-08-20T10:10:00.000Z',
    updatedAt: '2025-08-20T10:10:00.000Z',
  },
  {
    id: 'PVC-007',
    sn: 7,
    siteId: 'S-1038',
    siteLoi: 'SIT-2025-038',
    atmId: 'ATM023',
    franchiseName: 'Patel Cash Solutions',
    mobileNumber: '+91 98250 18218',
    model: 'GRG ATM Model XYZ',
    email: 'kiran@patelcash.in',
    pvcDate: '24/08/2025',
    expiryDate: '23/08/2027',
    status: 'Pending',
    fileName: 'PVC_S-1038_Review.pdf',
    fileSizeKb: 1240,
    remark: 'Document submitted',
    createdAt: '2025-08-24T12:00:00.000Z',
    updatedAt: '2025-08-24T12:00:00.000Z',
  },
]

export const pvcStore = createStore<PvcState>('dexter.legal.pvc.v2', () => ({
  records: SEED_PVC_RECORDS,
}))

export const usePvcRecords = () => pvcStore.use()

export function getPvcRecord(id: string): PvcRecord | undefined {
  return pvcStore.get().records.find((r) => r.id === id || r.siteId === id)
}

export function addPvcRecord(
  payload: Omit<PvcRecord, 'id' | 'sn' | 'createdAt' | 'updatedAt'>
): PvcRecord {
  const current = pvcStore.get().records
  const nextSn = current.length > 0 ? Math.max(...current.map((r) => r.sn)) + 1 : 1
  const id = `PVC-${String(nextSn).padStart(3, '0')}`
  const now = new Date().toISOString()

  const record: PvcRecord = {
    ...payload,
    id,
    sn: nextSn,
    createdAt: now,
    updatedAt: now,
  }

  pvcStore.set((state) => ({
    ...state,
    records: [record, ...state.records],
  }))

  return record
}

export function updatePvcRecord(
  id: string,
  payload: Partial<Omit<PvcRecord, 'id' | 'sn' | 'createdAt' | 'updatedAt'>>
): boolean {
  const state = pvcStore.get()
  const exists = state.records.some((r) => r.id === id)
  if (!exists) return false

  const now = new Date().toISOString()
  pvcStore.set((s) => ({
    ...s,
    records: s.records.map((r) =>
      r.id === id ? { ...r, ...payload, updatedAt: now } : r
    ),
  }))

  return true
}

export function deletePvcRecord(id: string): boolean {
  const state = pvcStore.get()
  const exists = state.records.some((r) => r.id === id)
  if (!exists) return false

  pvcStore.set((s) => ({
    ...s,
    records: s.records.filter((r) => r.id !== id),
  }))

  return true
}
