import { createStore } from '@/lib/store'
import { apiEnabled, del, patch, post } from '@/lib/api'
import { apiCall, createLoader, fetchAll } from '@/data/bizApi'
import { isoToSlash, legalIsFranchisee, slashToIso, snOf } from '@/data/legalApi'
import { franchiseNameOf, siteAt } from '@/lib/siteRef'

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
  /** API mode: stored file id (POST /files) */
  fileId?: string
  fileName?: string
  fileSizeKb?: number
  remark: string
  createdAt: string
  updatedAt: string
}

export interface PvcState {
  records: PvcRecord[]
}

const SEED_PVC_RECORDS_RAW: PvcRecord[] = [
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

/** Seed records re-pointed at real Site Master sites (deterministic via siteAt). */
function seedPvcRecords(): PvcRecord[] {
  return SEED_PVC_RECORDS_RAW.map((r, i) => {
    const site = siteAt(i * 5 + 2)
    const short = site.siteId.replace(/^SITE-/i, '')
    return {
      ...r,
      siteId: site.siteId,
      siteLoi: `LOI-${short}`,
      atmId: site.atmId,
      franchiseName: franchiseNameOf(site) || r.franchiseName,
      fileName: r.fileName ? r.fileName.replace(r.siteId, site.siteId) : r.fileName,
    }
  })
}

// API mode keeps its own cache key and starts empty (never shows the mock seed); hydrated by pvcLoader.
export const pvcStore = apiEnabled
  ? createStore<PvcState>('dexter.legal.pvc.api.v1', () => ({ records: [] }))
  : createStore<PvcState>('dexter.legal.pvc.v3', () => ({
      records: seedPvcRecords(),
    }))

// ───────────── Backend (API mode): /legal/pvc ─────────────

type ApiPvc = Omit<PvcRecord, 'id' | 'sn'> & { pvcId: string; frId?: string; fileId?: string }

const pvcFromApi = (p: ApiPvc): PvcRecord => ({
  id: p.pvcId,
  sn: snOf(p.pvcId),
  siteId: p.siteId,
  siteLoi: p.siteLoi ?? '',
  atmId: p.atmId ?? '',
  franchiseName: p.franchiseName ?? '',
  mobileNumber: p.mobileNumber ?? '',
  model: p.model ?? '',
  email: p.email ?? '',
  pvcDate: isoToSlash(p.pvcDate),
  expiryDate: isoToSlash(p.expiryDate),
  status: p.status ?? 'Pending',
  fileId: p.fileId,
  fileName: p.fileName,
  fileSizeKb: p.fileSizeKb,
  remark: p.remark ?? '',
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
})

function pvcToApi(p: Partial<PvcRecord>) {
  const b: Record<string, unknown> = {}
  const copy = ['siteLoi', 'franchiseName', 'model', 'status', 'fileId', 'fileName', 'remark'] as const
  copy.forEach((k) => {
    if (p[k] !== undefined) b[k] = p[k]
  })
  if (p.mobileNumber !== undefined) b.mobileNumber = (p.mobileNumber ?? '').replace(/[^\d+]/g, '').slice(-15)
  if (p.email !== undefined) b.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) ? p.email : ''
  if (p.pvcDate !== undefined) b.pvcDate = slashToIso(p.pvcDate)
  if (p.expiryDate !== undefined) b.expiryDate = slashToIso(p.expiryDate)
  if (p.fileSizeKb !== undefined) b.fileSizeKb = Math.max(0, Math.round(p.fileSizeKb))
  return b
}

/** Hydration: staff GET /legal/pvc; Franchisee GET /my/legal/pvc (own franchise, read-only, deleted hidden). */
export const pvcLoader = createLoader('PVC records', async () => {
  const items = await fetchAll<ApiPvc>(legalIsFranchisee() ? '/my/legal/pvc' : '/legal/pvc')
  pvcStore.set({ records: items.map(pvcFromApi) })
})

const upsert = (r: PvcRecord) => pvcStore.set((s) => ({ records: s.records.some((x) => x.id === r.id) ? s.records.map((x) => (x.id === r.id ? r : x)) : [r, ...s.records] }))

export const usePvcRecords = () => {
  pvcLoader.use()
  return pvcStore.use()
}
export const usePvcLoad = () => pvcLoader.use()

export function getPvcRecord(id: string): PvcRecord | undefined {
  return pvcStore.get().records.find((r) => r.id === id || r.siteId === id)
}

/** Create. API mode: POST /legal/pvc (Site Master validated, audited). */
export async function savePvcRecord(payload: Omit<PvcRecord, 'id' | 'sn' | 'createdAt' | 'updatedAt'>): Promise<PvcRecord> {
  if (!apiEnabled || legalIsFranchisee()) return addPvcRecord(payload)
  const r = await apiCall(() => post<ApiPvc>('/legal/pvc', { siteId: payload.siteId, ...pvcToApi(payload) }), 'Save failed')
  const rec = pvcFromApi(r)
  upsert(rec)
  return rec
}

/** Update. API mode: PATCH /legal/pvc/:id. */
export async function savePvcUpdate(id: string, payload: Partial<Omit<PvcRecord, 'id' | 'sn' | 'createdAt' | 'updatedAt'>>): Promise<boolean> {
  if (!apiEnabled || legalIsFranchisee()) return updatePvcRecord(id, payload)
  const r = await apiCall(() => patch<ApiPvc>(`/legal/pvc/${encodeURIComponent(id)}`, pvcToApi(payload)), 'Update failed')
  upsert(pvcFromApi(r))
  return true
}

// ───────────── Local (mock mode / franchise app) ─────────────

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

/** Soft delete. API mode: DELETE /legal/pvc/:id {reason} (kept in the DB with deletedAt / deleteReason, audited). */
export async function removePvcRecord(id: string, reason: string): Promise<boolean> {
  if (!apiEnabled || legalIsFranchisee()) return deletePvcRecord(id)
  await apiCall(() => del(`/legal/pvc/${encodeURIComponent(id)}`, { reason }), 'Delete failed')
  pvcStore.set((s) => ({ ...s, records: s.records.filter((r) => r.id !== id) }))
  return true
}

/** Local delete (mock mode). */
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
