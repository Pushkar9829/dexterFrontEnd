// KYC verification cases (Figma 230:13938). One case per franchise awaiting KYC.
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

export const kycStore = createStore<KycCase[]>('dexter.kyc.v1', seed)
export const useKycCases = () => kycStore.use()
export const getKycCase = (id: string) => kycStore.get().find((c) => c.id === id)

export function updateCase(id: string, patch: Partial<KycCase>) {
  kycStore.set((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))
}

export function decide(id: string, approve: boolean, reason?: string) {
  const c = getKycCase(id)
  if (!c) return
  const now = new Date().toISOString()
  updateCase(id, { status: approve ? 'Approved' : 'Resubmission requested', decision: { by: 'Ananya Sharma', at: now, reason } })
  updateFranchises([c.franchiseId], { kyc: approve ? 'Verified' : 'Pending' })
}
