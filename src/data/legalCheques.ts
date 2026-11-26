import { createStore } from '@/lib/store'
import { api, apiEnabled, patch, post } from '@/lib/api'
import { apiCall, createLoader, fetchAll } from '@/data/bizApi'
import { useLegal } from '@/data/legal'
import { isoToSlash, legalIsFranchisee, mobile10, slashToIso, snOf } from '@/data/legalApi'
import { franchiseNameOf, siteAt } from '@/lib/siteRef'

export type ChequeCollectionType = 'Employee' | 'SMF' | 'MF' | 'FR' | 'Party Vendor'
export type ChequeAcknowledgementStatus = 'Acknowledged' | 'Pending' | 'Received' | 'Rejected'
export type ChequeAllottedTo = 'Hitachi' | 'Dexter' | 'Bank' | 'Both'

export interface ChequeEntry {
  id: string
  sn: number
  bankName: string
  accountNumber: string
  chequeNumber: string
  allottedTo: ChequeAllottedTo
}

export interface ChequeDocument {
  /** API mode: stored file id (POST /files) */
  fileId?: string
  name: string
  sizeKb: number
  type: string
}

export interface ChequeRecord {
  id: string
  sn: number
  siteId: string
  atmId: string
  franchiseeName: string
  mobileNumber: string
  model: string
  type: ChequeCollectionType
  frBankName: string
  frPod: string
  frPodDate: string
  hitachiChequeNumber: string
  dexterChequeNumber: string
  podToBank: string
  bankPodDate: string
  acknowledgement: ChequeAcknowledgementStatus
  dispatchedBy: string
  receivedBy: string
  documentType: 'Cheque Scan PDF' | 'Email Acknowledgment'
  documents: ChequeDocument[]
  handoverStaff: string
  remark: string
  chequeEntries: ChequeEntry[]
  createdAt: string
  updatedAt: string
}

export interface ChequesState {
  records: ChequeRecord[]
}

/** Contact / bank presets per seed slot; Site ID, ATM ID and franchise come from Site Master (siteAt). */
const KNOWN_SITE_PRESETS = [
  {
    siteId: 'S-1001',
    atmId: 'ATM001',
    franchiseeName: 'Shree Sai Financial Services',
    mobileNumber: '+91 98765 43210',
    model: 'Hitachi ATM Model XYZ',
    bankName: 'HDFC Bank',
    accountNumber: '50200012345678',
  },
  {
    siteId: 'S-1005',
    atmId: 'ATM003',
    franchiseeName: 'Om Finserve',
    mobileNumber: '+91 98123 45678',
    model: 'GRG ATM Model ABC',
    bankName: 'State Bank of India',
    accountNumber: '38291048592',
  },
  {
    siteId: 'S-1012',
    atmId: 'ATM007',
    franchiseeName: 'Kuber ATM Solutions',
    mobileNumber: '+91 97654 32109',
    model: 'NCR ATM Model 5886',
    bankName: 'ICICI Bank',
    accountNumber: '001105024891',
  },
  {
    siteId: 'S-1018',
    atmId: 'ATM011',
    franchiseeName: 'Madhav Enterprises',
    mobileNumber: '+91 98987 65432',
    model: 'Diebold ATM Model 5500',
    bankName: 'Axis Bank',
    accountNumber: '918020048192841',
  },
  {
    siteId: 'S-1024',
    atmId: 'ATM015',
    franchiseeName: 'Shakti Associates',
    mobileNumber: '+91 90012 34567',
    model: 'Hitachi ATM Model ABC',
    bankName: 'Punjab National Bank',
    accountNumber: '184900210008472',
  },
  {
    siteId: 'S-1030',
    atmId: 'ATM018',
    franchiseeName: 'Balaji FinTech',
    mobileNumber: '+91 94250 87654',
    model: 'GRG ATM Model H22N',
    bankName: 'Bank of Baroda',
    accountNumber: '29480100049281',
  },
]

/** Sites offered on the cheque form — every one is a real Site Master site. */
export const KNOWN_SITES = KNOWN_SITE_PRESETS.map((p, i) => {
  const site = siteAt(i * 5 + 2)
  return { ...p, siteId: site.siteId, atmId: site.atmId, franchiseeName: franchiseNameOf(site) || p.franchiseeName }
})

const SEED_CHEQUE_RECORDS_RAW: ChequeRecord[] = [
  {
    id: 'CHQ-2025-001',
    sn: 1,
    siteId: 'S-1001',
    atmId: 'ATM001',
    franchiseeName: 'Shree Sai Financial Services',
    mobileNumber: '+91 98765 43210',
    model: 'Hitachi ATM Model XYZ',
    type: 'FR',
    frBankName: 'HDFC Bank',
    frPod: 'POD-MH-849201',
    frPodDate: '12/08/2025',
    hitachiChequeNumber: '048291',
    dexterChequeNumber: '048292',
    podToBank: 'BNK-POD-9921',
    bankPodDate: '16/08/2025',
    acknowledgement: 'Acknowledged',
    dispatchedBy: 'Sanjay Deshmukh',
    receivedBy: 'Ramesh Gupta',
    documentType: 'Cheque Scan PDF',
    documents: [
      { name: 'Cheque_Scan_S1001_5Entries.pdf', sizeKb: 1840, type: 'application/pdf' },
      { name: 'Bank_Acknowledgement_Receipt.pdf', sizeKb: 620, type: 'application/pdf' },
    ],
    handoverStaff: 'Paras Dubey',
    remark: 'All 5 cheques verified and recorded in Daak Register',
    chequeEntries: [
      { id: 'entry-1', sn: 1, bankName: 'HDFC Bank', accountNumber: '50200012345678', chequeNumber: '048291', allottedTo: 'Hitachi' },
      { id: 'entry-2', sn: 2, bankName: 'HDFC Bank', accountNumber: '50200012345678', chequeNumber: '048292', allottedTo: 'Dexter' },
      { id: 'entry-3', sn: 3, bankName: 'HDFC Bank', accountNumber: '50200012345678', chequeNumber: '048293', allottedTo: 'Bank' },
      { id: 'entry-4', sn: 4, bankName: 'HDFC Bank', accountNumber: '50200012345678', chequeNumber: '048294', allottedTo: 'Both' },
      { id: 'entry-5', sn: 5, bankName: 'HDFC Bank', accountNumber: '50200012345678', chequeNumber: '048295', allottedTo: 'Dexter' },
    ],
    createdAt: '2025-08-12T10:30:00.000Z',
    updatedAt: '2025-08-16T15:45:00.000Z',
  },
  {
    id: 'CHQ-2025-002',
    sn: 2,
    siteId: 'S-1005',
    atmId: 'ATM003',
    franchiseeName: 'Om Finserve',
    mobileNumber: '+91 98123 45678',
    model: 'GRG ATM Model ABC',
    type: 'SMF',
    frBankName: 'State Bank of India',
    frPod: 'POD-GJ-110294',
    frPodDate: '15/08/2025',
    hitachiChequeNumber: '119284',
    dexterChequeNumber: '119285',
    podToBank: 'BNK-POD-4820',
    bankPodDate: '20/08/2025',
    acknowledgement: 'Pending',
    dispatchedBy: 'Vikram Joshi',
    receivedBy: 'Alok Sharma',
    documentType: 'Cheque Scan PDF',
    documents: [
      { name: 'OmFinserve_Cheques_Scan.pdf', sizeKb: 2150, type: 'application/pdf' },
    ],
    handoverStaff: 'Paras Dubey',
    remark: 'Awaiting bank clearance report',
    chequeEntries: [
      { id: 'entry-1', sn: 1, bankName: 'State Bank of India', accountNumber: '38291048592', chequeNumber: '119284', allottedTo: 'Hitachi' },
      { id: 'entry-2', sn: 2, bankName: 'State Bank of India', accountNumber: '38291048592', chequeNumber: '119285', allottedTo: 'Dexter' },
      { id: 'entry-3', sn: 3, bankName: 'State Bank of India', accountNumber: '38291048592', chequeNumber: '119286', allottedTo: 'Both' },
      { id: 'entry-4', sn: 4, bankName: 'State Bank of India', accountNumber: '38291048592', chequeNumber: '119287', allottedTo: 'Bank' },
      { id: 'entry-5', sn: 5, bankName: 'State Bank of India', accountNumber: '38291048592', chequeNumber: '119288', allottedTo: 'Hitachi' },
    ],
    createdAt: '2025-08-15T11:20:00.000Z',
    updatedAt: '2025-08-20T16:10:00.000Z',
  },
  {
    id: 'CHQ-2025-003',
    sn: 3,
    siteId: 'S-1012',
    atmId: 'ATM007',
    franchiseeName: 'Kuber ATM Solutions',
    mobileNumber: '+91 97654 32109',
    model: 'NCR ATM Model 5886',
    type: 'Party Vendor',
    frBankName: 'ICICI Bank',
    frPod: 'POD-KA-772910',
    frPodDate: '18/08/2025',
    hitachiChequeNumber: '772910',
    dexterChequeNumber: '772911',
    podToBank: 'BNK-POD-1039',
    bankPodDate: '22/08/2025',
    acknowledgement: 'Acknowledged',
    dispatchedBy: 'Naveen Kumar',
    receivedBy: 'Sunil Rao',
    documentType: 'Email Acknowledgment',
    documents: [
      { name: 'Kuber_ICICI_SignedCheques.pdf', sizeKb: 1680, type: 'application/pdf' },
      { name: 'Vendor_Email_Confirm.pdf', sizeKb: 340, type: 'application/pdf' },
    ],
    handoverStaff: 'Meera Iyer',
    remark: 'Physical cheques verified and stored in safe vault',
    chequeEntries: [
      { id: 'entry-1', sn: 1, bankName: 'ICICI Bank', accountNumber: '001105024891', chequeNumber: '772910', allottedTo: 'Hitachi' },
      { id: 'entry-2', sn: 2, bankName: 'ICICI Bank', accountNumber: '001105024891', chequeNumber: '772911', allottedTo: 'Dexter' },
      { id: 'entry-3', sn: 3, bankName: 'ICICI Bank', accountNumber: '001105024891', chequeNumber: '772912', allottedTo: 'Dexter' },
      { id: 'entry-4', sn: 4, bankName: 'ICICI Bank', accountNumber: '001105024891', chequeNumber: '772913', allottedTo: 'Bank' },
      { id: 'entry-5', sn: 5, bankName: 'ICICI Bank', accountNumber: '001105024891', chequeNumber: '772914', allottedTo: 'Both' },
    ],
    createdAt: '2025-08-18T14:15:00.000Z',
    updatedAt: '2025-08-22T09:30:00.000Z',
  },
  {
    id: 'CHQ-2025-004',
    sn: 4,
    siteId: 'S-1018',
    atmId: 'ATM011',
    franchiseeName: 'Madhav Enterprises',
    mobileNumber: '+91 98987 65432',
    model: 'Diebold ATM Model 5500',
    type: 'MF',
    frBankName: 'Axis Bank',
    frPod: 'POD-UP-381920',
    frPodDate: '22/08/2025',
    hitachiChequeNumber: '883921',
    dexterChequeNumber: '883922',
    podToBank: 'BNK-POD-3301',
    bankPodDate: '26/08/2025',
    acknowledgement: 'Received',
    dispatchedBy: 'Gaurav Mishra',
    receivedBy: 'Deepak Verma',
    documentType: 'Cheque Scan PDF',
    documents: [
      { name: 'Madhav_AxisCheques.pdf', sizeKb: 1950, type: 'application/pdf' },
    ],
    handoverStaff: 'Paras Dubey',
    remark: 'Received at Mumbai branch office',
    chequeEntries: [
      { id: 'entry-1', sn: 1, bankName: 'Axis Bank', accountNumber: '918020048192841', chequeNumber: '883921', allottedTo: 'Hitachi' },
      { id: 'entry-2', sn: 2, bankName: 'Axis Bank', accountNumber: '918020048192841', chequeNumber: '883922', allottedTo: 'Dexter' },
      { id: 'entry-3', sn: 3, bankName: 'Axis Bank', accountNumber: '918020048192841', chequeNumber: '883923', allottedTo: 'Both' },
      { id: 'entry-4', sn: 4, bankName: 'Axis Bank', accountNumber: '918020048192841', chequeNumber: '883924', allottedTo: 'Bank' },
      { id: 'entry-5', sn: 5, bankName: 'Axis Bank', accountNumber: '918020048192841', chequeNumber: '883925', allottedTo: 'Hitachi' },
    ],
    createdAt: '2025-08-22T16:00:00.000Z',
    updatedAt: '2025-08-26T11:40:00.000Z',
  },
  {
    id: 'CHQ-2025-005',
    sn: 5,
    siteId: 'S-1024',
    atmId: 'ATM015',
    franchiseeName: 'Shakti Associates',
    mobileNumber: '+91 90012 34567',
    model: 'Hitachi ATM Model ABC',
    type: 'Employee',
    frBankName: 'Punjab National Bank',
    frPod: 'POD-TN-664910',
    frPodDate: '25/08/2025',
    hitachiChequeNumber: '554910',
    dexterChequeNumber: '554911',
    podToBank: 'BNK-POD-8822',
    bankPodDate: '27/08/2025',
    acknowledgement: 'Acknowledged',
    dispatchedBy: 'Karthik Raja',
    receivedBy: 'M. Anand',
    documentType: 'Cheque Scan PDF',
    documents: [
      { name: 'Shakti_PNB_Cheques.pdf', sizeKb: 1420, type: 'application/pdf' },
    ],
    handoverStaff: 'Paras Dubey',
    remark: 'Verified and linked to Daak item DAAK-2025-0482',
    chequeEntries: [
      { id: 'entry-1', sn: 1, bankName: 'Punjab National Bank', accountNumber: '184900210008472', chequeNumber: '554910', allottedTo: 'Hitachi' },
      { id: 'entry-2', sn: 2, bankName: 'Punjab National Bank', accountNumber: '184900210008472', chequeNumber: '554911', allottedTo: 'Dexter' },
      { id: 'entry-3', sn: 3, bankName: 'Punjab National Bank', accountNumber: '184900210008472', chequeNumber: '554912', allottedTo: 'Bank' },
      { id: 'entry-4', sn: 4, bankName: 'Punjab National Bank', accountNumber: '184900210008472', chequeNumber: '554913', allottedTo: 'Both' },
      { id: 'entry-5', sn: 5, bankName: 'Punjab National Bank', accountNumber: '184900210008472', chequeNumber: '554914', allottedTo: 'Dexter' },
    ],
    createdAt: '2025-08-25T09:10:00.000Z',
    updatedAt: '2025-08-27T17:20:00.000Z',
  },
]

/** Seed records re-pointed at Site Master sites (same slot → same site as KNOWN_SITES). */
function seedChequeRecords(): ChequeRecord[] {
  return SEED_CHEQUE_RECORDS_RAW.map((r) => {
    const k = KNOWN_SITE_PRESETS.findIndex((p) => p.siteId === r.siteId)
    const ks = KNOWN_SITES[k >= 0 ? k : 0]
    return { ...r, siteId: ks.siteId, atmId: ks.atmId, franchiseeName: ks.franchiseeName }
  })
}

// API mode keeps its own cache key and starts empty (never shows the mock seed); hydrated by chequesLoader.
export const chequesStore = apiEnabled
  ? createStore<ChequesState>('dexter_cheques_store_api_v1', () => ({ records: [] }))
  : createStore<ChequesState>('dexter_cheques_store_v2', () => ({ records: seedChequeRecords() }))

// ───────────── Backend (API mode): /legal/cheques ─────────────

type ApiCheque = Omit<ChequeRecord, 'id' | 'sn' | 'chequeEntries' | 'documents'> & {
  chequeId: string
  frId?: string
  documents?: (ChequeDocument & { fileId?: string })[]
  chequeEntries?: Omit<ChequeEntry, 'id'>[]
}

const chequeFromApi = (c: ApiCheque): ChequeRecord => ({
  id: c.chequeId,
  sn: snOf(c.chequeId),
  siteId: c.siteId,
  atmId: c.atmId ?? '',
  franchiseeName: c.franchiseeName ?? '',
  mobileNumber: c.mobileNumber ?? '',
  model: c.model ?? '',
  type: c.type,
  frBankName: c.frBankName ?? '',
  frPod: c.frPod ?? '',
  frPodDate: isoToSlash(c.frPodDate),
  hitachiChequeNumber: c.hitachiChequeNumber ?? '',
  dexterChequeNumber: c.dexterChequeNumber ?? '',
  podToBank: c.podToBank ?? '',
  bankPodDate: isoToSlash(c.bankPodDate),
  acknowledgement: c.acknowledgement ?? 'Pending',
  dispatchedBy: c.dispatchedBy ?? '',
  receivedBy: c.receivedBy ?? '',
  documentType: c.documentType ?? 'Cheque Scan PDF',
  documents: (c.documents ?? []).map((d) => ({ name: d.name, sizeKb: d.sizeKb ?? 0, type: d.type ?? 'application/pdf', fileId: d.fileId })),
  handoverStaff: c.handoverStaff ?? '',
  remark: c.remark ?? '',
  chequeEntries: (c.chequeEntries ?? []).map((e) => ({ ...e, id: `entry-${e.sn}` })),
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
})

/** Frontend record → backend body (dates ISO, mobile 10 digits, entries without UI ids). */
function chequeToApi(p: Partial<ChequeRecord>) {
  const b: Record<string, unknown> = {}
  const copy = ['franchiseeName', 'model', 'type', 'frBankName', 'frPod', 'hitachiChequeNumber', 'dexterChequeNumber', 'podToBank', 'acknowledgement', 'dispatchedBy', 'receivedBy', 'documentType', 'handoverStaff', 'remark'] as const
  copy.forEach((k) => {
    if (p[k] !== undefined) b[k] = p[k]
  })
  if (p.mobileNumber !== undefined) b.mobileNumber = mobile10(p.mobileNumber)
  if (p.frPodDate !== undefined) b.frPodDate = slashToIso(p.frPodDate)
  if (p.bankPodDate !== undefined) b.bankPodDate = slashToIso(p.bankPodDate)
  if (p.documents !== undefined) b.documents = p.documents.map((d) => ({ name: d.name, sizeKb: Math.max(0, Math.round(d.sizeKb || 0)), type: d.type || 'application/pdf', fileId: d.fileId }))
  if (p.chequeEntries !== undefined) b.chequeEntries = p.chequeEntries.map((e, i) => ({ sn: e.sn || i + 1, bankName: e.bankName, accountNumber: String(e.accountNumber).replace(/\D/g, ''), chequeNumber: String(e.chequeNumber).trim(), allottedTo: e.allottedTo }))
  return b
}

/** Hydration: staff GET /legal/cheques; Franchisee GET /my/legal/cheques (own franchise, read-only, deleted hidden). */
export const chequesLoader = createLoader('cheque records', async () => {
  const items = await fetchAll<ApiCheque>(legalIsFranchisee() ? '/my/legal/cheques' : '/legal/cheques')
  chequesStore.set({ records: items.map(chequeFromApi) })
})

const upsert = (r: ChequeRecord) => chequesStore.set((s) => ({ records: s.records.some((x) => x.id === r.id) ? s.records.map((x) => (x.id === r.id ? r : x)) : [r, ...s.records] }))

export function useChequeRecords() {
  const load = chequesLoader.use()
  const state = chequesStore.use()
  return {
    records: state.records,
    load,
  }
}

export function getChequeRecord(id: string): ChequeRecord | undefined {
  return chequesStore.get().records.find((r) => r.id === id)
}

/** Create a record. API mode: POST /legal/cheques (Site Master validated, audited) → server record. */
export async function saveChequeRecord(payload: Omit<ChequeRecord, 'id' | 'sn' | 'createdAt' | 'updatedAt'>): Promise<ChequeRecord> {
  if (!apiEnabled || legalIsFranchisee()) return addChequeRecord(payload)
  const r = await apiCall(() => post<ApiCheque>('/legal/cheques', { siteId: payload.siteId, ...chequeToApi(payload) }), 'Save failed')
  const rec = chequeFromApi(r)
  upsert(rec)
  return rec
}

/** Update a record. API mode: PATCH /legal/cheques/:id. */
export async function saveChequeUpdate(id: string, payload: Partial<Omit<ChequeRecord, 'id' | 'sn' | 'createdAt'>>): Promise<boolean> {
  if (!apiEnabled || legalIsFranchisee()) return updateChequeRecord(id, payload)
  const r = await apiCall(() => patch<ApiCheque>(`/legal/cheques/${encodeURIComponent(id)}`, chequeToApi(payload)), 'Update failed')
  upsert(chequeFromApi(r))
  return true
}

/** Soft delete. API mode: DELETE /legal/cheques/:id {reason} (mandatory; deletedAt / deleteReason kept, audited). */
export async function removeChequeRecord(id: string, reason: string): Promise<boolean> {
  if (!apiEnabled || legalIsFranchisee()) return deleteChequeRecord(id)
  await apiCall(() => api(`/legal/cheques/${encodeURIComponent(id)}`, { method: 'DELETE', body: { reason } }), 'Delete failed')
  chequesStore.set((s) => ({ records: s.records.filter((r) => r.id !== id) }))
  return true
}

// ───────────── Local (mock mode / franchise app) ─────────────

export function addChequeRecord(
  payload: Omit<ChequeRecord, 'id' | 'sn' | 'createdAt' | 'updatedAt'>
): ChequeRecord {
  const state = chequesStore.get()
  const nextSn = state.records.length > 0 ? Math.max(...state.records.map((r) => r.sn)) + 1 : 1
  const numId = String(nextSn).padStart(3, '0')
  const id = `CHQ-2025-${numId}`
  const now = new Date().toISOString()

  const newRecord: ChequeRecord = {
    ...payload,
    id,
    sn: nextSn,
    createdAt: now,
    updatedAt: now,
  }

  chequesStore.set((s) => ({
    ...s,
    records: [newRecord, ...s.records],
  }))

  return newRecord
}

export function updateChequeRecord(
  id: string,
  payload: Partial<Omit<ChequeRecord, 'id' | 'sn' | 'createdAt'>>
): boolean {
  const state = chequesStore.get()
  const exists = state.records.some((r) => r.id === id)
  if (!exists) return false

  const now = new Date().toISOString()
  chequesStore.set((s) => ({
    ...s,
    records: s.records.map((r) =>
      r.id === id ? { ...r, ...payload, updatedAt: now } : r
    ),
  }))

  return true
}

export function deleteChequeRecord(id: string): boolean {
  const state = chequesStore.get()
  const exists = state.records.some((r) => r.id === id)
  if (!exists) return false

  chequesStore.set((s) => ({
    ...s,
    records: s.records.filter((r) => r.id !== id),
  }))

  return true
}

export type ChequeSiteOption = (typeof KNOWN_SITES)[number]
/**
 * Sites offered on the legal register forms. Mock: KNOWN_SITES. API mode: the legal workspace sites
 * (GET /legal/docs + /legal/sites, hydrated by data/legal) — bank / contact presets are not part of the backend site.
 */
export function useLegalSiteOptions(): ChequeSiteOption[] {
  const legal = useLegal()
  if (!apiEnabled) return KNOWN_SITES
  return legal.sites.map((s) => ({ siteId: s.id, atmId: s.atmId, franchiseeName: s.franchiseName, mobileNumber: s.contactNumber, model: s.model, bankName: '', accountNumber: '' }))
}
