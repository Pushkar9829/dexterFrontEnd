// KYC verification cases (Figma 230:13938). One case per franchise awaiting KYC.
import { apiEnabled, get, patch, post } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { toast } from '@/components/ui/Toast'
import { background, createLoader, fetchAll } from '@/data/bizApi'
import { createStore } from '@/lib/store'
import { franchiseStore, updateFranchises, type Franchise } from './franchises'

export const KYC_DOCS = ['PAN Card', 'Aadhaar', 'Rent Agreement'] as const
export type KycDocType = (typeof KYC_DOCS)[number]
export type KycCaseStatus = 'Under Verification' | 'Approved' | 'Resubmission requested'

export type DocVersion = { v: number; file: string; at: string; by: string }
export type KycDoc = { type: KycDocType; versions: DocVersion[]; checked: boolean }

export type KycCase = {
  id: string // FR-APP-NNNN
  franchiseId: string
  applicant: string
  loi: string
  region: string
  status: KycCaseStatus
  docs: KycDoc[]
  fields: { pan: string; entityType: string; nameOnPan: string; fatherName?: string; dob: string; aadhaarLast4: string; address: string }
  note: string
  checklist: { panActive: boolean; aadhaarConsent: boolean; addressLegible: boolean; rentValid: boolean }
  api: null | { at: string; nameMatch: number }
  decision?: { by: string; at: string; reason?: string }
  submittedAt: string
}

const PEOPLE = ['Rajesh Kumar Agarwal', 'Sunita Deshpande', 'Imran Shaikh', 'Kavya Menon', 'Harpreet Singh', 'Anil Joshi', 'Deepa Pillai', 'Manoj Tiwari']

function caseFor(fr: Franchise, i: number): KycCase {
  const demo = i === 0
  const person = demo ? 'Rajesh Kumar Agarwal' : PEOPLE[i % PEOPLE.length]
  const first = person.split(' ')[0].toUpperCase()
  const at = new Date(new Date('2026-09-19T09:38:00+05:30').getTime() - i * 9 * 3600_000).toISOString()
  return {
    id: demo ? 'FR-APP-2418' : `FR-APP-${2417 - i}`,
    franchiseId: fr.id,
    applicant: demo ? 'Shree Ganesh Enterprises' : fr.name,
    loi: `LOI-W-${4821 - i}`,
    region: `${fr.city}, ${demo ? 'West' : fr.state} Region`,
    status: 'Under Verification',
    docs: KYC_DOCS.map((type, k) => ({
      type,
      checked: k < 2,
      versions:
        k === 0
          ? [
            { v: 2, file: `PAN_${first}_ENT_v2.pdf`, at, by: person },
            { v: 1, file: `PAN_${first}_ENT_v1.pdf`, at: new Date(new Date(at).getTime() - 17.4 * 3600_000).toISOString(), by: 'Riya Mehta' },
          ]
          : [{ v: 1, file: `${type.replace(/\s/g, '_')}_${first}.pdf`, at, by: person }],
    })),
    fields: {
      pan: demo ? 'ABCDE1234F' : `${first.slice(0, 3)}PK${String(1000 + i * 7).slice(-4)}L`,
      entityType: 'Proprietorship',
      nameOnPan: person,
      fatherName: demo ? 'Mahesh Kumar Agarwal' : `${PEOPLE[(i + 3) % PEOPLE.length].split(' ')[0]} ${person.split(' ').slice(-1)[0]}`,
      dob: demo ? '1982-08-14' : `198${i % 10}-0${(i % 9) + 1}-1${i % 9}`,
      aadhaarLast4: demo ? '4826' : String(1000 + ((i * 373) % 9000)),
      address: demo ? '18 Laxmi Road, Sadashiv Peth, Pune 411030' : `12 Station Road, ${fr.city}`,
    },
    note: '',
    checklist: { panActive: false, aadhaarConsent: false, addressLegible: false, rentValid: false },
    api: null,
    submittedAt: at,
  }
}

function seed(): KycCase[] {
  const awaiting = franchiseStore.get().filter((f) => f.kyc !== 'Verified')
  return awaiting.map(caseFor)
}

// API mode keeps its own cache key and starts empty (never shows the mock seed); hydrated by kycLoader.
export const kycStore = apiEnabled ? createStore<KycCase[]>('dexter.kyc.api.v1', () => []) : createStore<KycCase[]>('dexter.kyc.v1', seed)
export const useKycCases = () => {
  kycLoader.use()
  return kycStore.use()
}
export const getKycCase = (id: string) => kycStore.get().find((c) => c.id === id)

// ───────────── Backend (API mode): /onboarding/kyc ─────────────
// The exported functions stay synchronous (pages call them inline): the store is updated optimistically and
// the matching request runs in the background; on failure the error is toasted and the case is re-read.

type ApiKycCase = Omit<KycCase, 'id' | 'api' | 'decision'> & {
  caseId: string
  api?: { at: string; nameMatch: number; panStatus?: string } | null
  decision?: { by: string; at: string; reason?: string } | null
}
const enc = encodeURIComponent

const caseFromApi = (k: ApiKycCase): KycCase => ({
  id: k.caseId,
  franchiseId: k.franchiseId,
  applicant: k.applicant,
  loi: k.loi,
  region: k.region,
  status: k.status,
  docs: KYC_DOCS.map((type) => {
    const d = k.docs?.find((x) => x.type === type)
    // newest version first (the pages read versions[0])
    return { type, checked: !!d?.checked, versions: [...(d?.versions ?? [])].sort((a, b) => b.v - a.v) }
  }),
  fields: { ...k.fields },
  note: k.note ?? '',
  checklist: { ...{ panActive: false, aadhaarConsent: false, addressLegible: false, rentValid: false }, ...(k.checklist as Partial<KycCase['checklist']>) },
  api: k.api ? { at: k.api.at, nameMatch: k.api.nameMatch } : null,
  decision: k.decision ? { by: k.decision.by, at: k.decision.at, reason: k.decision.reason } : undefined,
  submittedAt: k.submittedAt,
})

export const kycLoader = createLoader('KYC cases', async () => {
  const items = await fetchAll<ApiKycCase>('/onboarding/kyc')
  kycStore.set(items.map(caseFromApi))
})

const replaceCase = (id: string, next: KycCase) => kycStore.set((list) => (list.some((c) => c.id === id) ? list.map((c) => (c.id === id ? next : c)) : [next, ...list]))

/** Re-read one case from the server (after a failed optimistic write, or a server-side change). */
async function refreshCase(id: string) {
  try {
    replaceCase(id, caseFromApi(await get<ApiKycCase>(`/onboarding/kyc/${enc(id)}`)))
  } catch {
    /* keep local */
  }
}

const noteTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function updateCase(id: string, patch: Partial<KycCase>) {
  const before = getKycCase(id)
  kycStore.set((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  if (!apiEnabled || !before) return
  // "Verify via live API" → POST /onboarding/kyc/:id/verify (provider PAN check; name-match stored on the case)
  if (patch.api) {
    background(async () => {
      const r = await post<ApiKycCase & { check?: { ok: boolean; error?: string } }>(`/onboarding/kyc/${enc(id)}/verify`)
      const next = caseFromApi(r)
      // keep the reviewer's optimistic ticks (PAN active / consent / docs) and persist them
      const merged = { ...next, checklist: { ...next.checklist, ...(patch.checklist ?? {}) }, docs: patch.docs ?? next.docs }
      replaceCase(id, merged)
      await patchReview(id, { checklist: merged.checklist, checkedDocs: merged.docs.filter((d) => d.checked).map((d) => d.type) })
      if (r.check && !r.check.ok) toast(`KYC provider: ${r.check.error ?? 'PAN check failed'}`, 'error')
    }, 'KYC verification failed', () => void refreshCase(id))
    return
  }
  const body: { note?: string; checklist?: KycCase['checklist']; checkedDocs?: KycDocType[] } = {}
  if (patch.checklist) body.checklist = patch.checklist
  if (patch.docs) body.checkedDocs = patch.docs.filter((d) => d.checked).map((d) => d.type)
  if (body.checklist || body.checkedDocs) background(() => patchReview(id, body), 'KYC update failed', () => void refreshCase(id))
  if (patch.note !== undefined) {
    // reviewer note is typed inline → debounce the PATCH
    clearTimeout(noteTimers.get(id))
    noteTimers.set(id, setTimeout(() => background(() => patchReview(id, { note: patch.note }), 'Note not saved'), 700))
  }
  // fields (PAN / name / DOB …) have no update endpoint once a case is open — local only (see report)
}

const patchReview = (id: string, body: { note?: string; checklist?: KycCase['checklist']; checkedDocs?: KycDocType[] }) =>
  patch<ApiKycCase>(`/onboarding/kyc/${enc(id)}`, body).then((r) => {
    const cur = getKycCase(id)
    const next = caseFromApi(r)
    // don't clobber a note the reviewer is still typing
    replaceCase(id, cur && body.note === undefined ? { ...next, note: cur.note } : next)
  })

/**
 * Open a KYC case. API mode: POST /onboarding/kyc (franchise KYC → In review), then one
 * POST /onboarding/kyc/:id/documents per uploaded document (fileId when the page uploaded the file).
 * The temporary local case is replaced by the server case (server case id) when it returns.
 */
export function addKycCase(newCase: KycCase, files: Partial<Record<KycDocType, { fileId?: string; name?: string }>> = {}) {
  kycStore.set((list) => [newCase, ...list.filter((c) => c.id !== newCase.id)])
  updateFranchises([newCase.franchiseId], { kyc: 'In review' })
  if (!apiEnabled) return
  background(
    async () => {
      const f = newCase.fields
      const created = await post<ApiKycCase>('/onboarding/kyc', {
        franchiseId: newCase.franchiseId,
        applicant: newCase.applicant,
        loi: newCase.loi,
        fields: { pan: f.pan.toUpperCase(), entityType: f.entityType, nameOnPan: f.nameOnPan, fatherName: f.fatherName || undefined, dob: f.dob, aadhaarLast4: String(f.aadhaarLast4).replace(/\D/g, '').slice(-4), address: f.address },
      })
      let latest = created
      for (const d of newCase.docs) {
        const name = files[d.type]?.name ?? d.versions[0]?.file
        if (!name) continue
        latest = await post<ApiKycCase>(`/onboarding/kyc/${enc(created.caseId)}/documents`, { type: d.type, name, fileId: files[d.type]?.fileId })
      }
      if (newCase.note.trim()) latest = await patch<ApiKycCase>(`/onboarding/kyc/${enc(created.caseId)}`, { note: newCase.note.slice(0, 1000) })
      kycStore.set((list) => [caseFromApi(latest), ...list.filter((c) => c.id !== newCase.id && c.id !== created.caseId)])
    },
    'KYC case not opened',
    () => kycStore.set((list) => list.filter((c) => c.id !== newCase.id)),
  )
}

/** Approve / request resubmission. API mode: POST /onboarding/kyc/:id/decision (server checks documents + checklist). */
export function decide(id: string, approve: boolean, reason?: string) {
  const c = getKycCase(id)
  if (!c) return
  const now = new Date().toISOString()
  updateCaseLocal(id, { status: approve ? 'Approved' : 'Resubmission requested', decision: { by: getSession()?.name ?? 'Paras Dubey', at: now, reason } })
  updateFranchises([c.franchiseId], { kyc: approve ? 'Verified' : 'Pending' })
  if (!apiEnabled) return
  background(
    async () => replaceCase(id, caseFromApi(await post<ApiKycCase>(`/onboarding/kyc/${enc(id)}/decision`, { approve, reason }))),
    approve ? 'KYC approval failed' : 'Resubmission request failed',
    () => {
      void refreshCase(id)
      updateFranchises([c.franchiseId], { kyc: 'In review' })
    },
  )
}

const updateCaseLocal = (id: string, patch: Partial<KycCase>) => kycStore.set((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))
