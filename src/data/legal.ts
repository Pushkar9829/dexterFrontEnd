import { createStore } from '@/lib/store'
import { franchiseNameOf, resolveSite, siteAt } from '@/lib/siteRef'
import { loadSites, type Site } from '@/data/network'
import { emitWorkflow } from '@/data/workflow'
import { api, apiEnabled, get, post, uploadFile } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { currentRole } from '@/lib/rbac'
import { apiCall, createLoader, fetchAll } from '@/data/bizApi'

// ───────────────────────── Types ─────────────────────────

export type LegalStatus = 'Action Required' | 'Under Review' | 'Approved' | 'Resubmission Required'
export const LEGAL_STATUSES: LegalStatus[] = ['Action Required', 'Under Review', 'Approved', 'Resubmission Required']

/** KYC / PVC only come from the backend legal sequence (LOI → AFF → AGR → KYC → PVC); mock data has LOI / AFF / AGR / BNK. */
export type DocKind = 'LOI' | 'AFF' | 'AGR' | 'BNK' | 'KYC' | 'PVC'
export const DOC_KINDS: DocKind[] = ['LOI', 'AFF', 'AGR', 'BNK']

export type AuditSource = 'Mobile app' | 'Workspace'

/** Immutable audit event. Shared by legal documents and project records (ref = docId / projectId). */
export type AuditEvent = {
  id: string
  ref: string
  at: string // ISO
  actor: string
  role: string
  event: string
  outcome: string
  context: string
  version: string
  source: AuditSource
  note?: string
}

export type LegalSite = {
  /** Site Master Site ID (e.g. SITE-MH-0001) */
  id: string
  /** Site/LOI number shown on Legal forms (LOI-<Site ID>) */
  siteLoi?: string
  location: string
  address: string
  city: string
  state: string
  pincode: string
  franchiseId: string
  franchiseName: string
  tier: string
  atms: number
  signatory: string
  contactNumber: string
  email: string
  model: string
  mf: string
  /** Site Master ATM ID (e.g. DXMH70007) */
  atmId: string
  atmMappedOn: string // YYYY-MM-DD or ''
  owner: string
  createdOn: string
}

export type DocVersion = {
  version: string
  /** API mode: stored file id (GET /files/:id/download) */
  fileId?: string
  file: string
  sizeMb: number
  pages: number
  createdAt: string
  createdBy: string
  sharedAt?: string
  superseded?: { on: string; reason: string }
}

export type SignedUpload = {
  id: string
  /** API mode: stored file id */
  fileId?: string
  version: string
  file: string
  sizeKb: number
  uploadedAt: string
  by: string
  source: AuditSource
  decision?: 'Approved' | 'Rejected'
  reason?: string
  reviewer?: string
  reviewedAt?: string
}

export type LegalDoc = {
  id: string
  siteId: string
  kind: DocKind
  status: LegalStatus
  version: string
  dueDate: string // YYYY-MM-DD
  instructions: string
  /** latest rejection reason (Resubmission Required) */
  feedback?: string
  /** short phrase used in "Resubmit the X …" lists */
  hint?: string
  versions: DocVersion[]
  uploads: SignedUpload[]
}

export type LegalState = { sites: LegalSite[]; docs: LegalDoc[]; audit: AuditEvent[] }

// ───────────────────────── Constants & formatting ─────────────────────────

/** Acting user for audit lines. API mode: the signed-in user (server writes the real trail). */
export const CURRENT_USER = {
  get name() {
    return (apiEnabled && getSession()?.name) || 'Paras Dubey'
  },
  get role() {
    return (apiEnabled && getSession()?.role) || 'Administrator'
  },
}
export const REVIEWER = { name: 'Meera Iyer', role: 'Legal reviewer' }

export const DOC_META: Record<DocKind, { title: string; short: string; pages: number; sizeMb: number; required: boolean; stem: string; sign: string }> = {
  LOI: { title: 'Letter of Intent (LOI)', short: 'LOI', pages: 2, sizeMb: 0.4, required: true, stem: 'LOI', sign: 'Sign both pages and add the firm stamp on page 2.' },
  AFF: { title: 'Affidavit', short: 'Affidavit', pages: 3, sizeMb: 0.6, required: true, stem: 'Affidavit', sign: 'Sign every page and get it notarised. The notary seal must be clearly visible.' },
  AGR: { title: 'Franchise Agreement', short: 'Agreement', pages: 8, sizeMb: 1.8, required: true, stem: 'Agreement', sign: 'Sign every page and add the firm stamp on page 8.' },
  BNK: { title: 'Bank Mandate', short: 'Bank Mandate', pages: 2, sizeMb: 0.5, required: false, stem: 'BankMandate', sign: 'Sign the mandate as per bank records and attach a cancelled cheque.' },
  KYC: { title: 'KYC Documents', short: 'KYC', pages: 3, sizeMb: 0.9, required: true, stem: 'KYC', sign: 'Self-attest every page of the KYC set.' },
  PVC: { title: 'Police Verification Certificate', short: 'PVC', pages: 1, sizeMb: 0.3, required: true, stem: 'PVC', sign: 'Upload the police verification certificate issued for the site.' },
}

const REJECTIONS: Record<DocKind, { reason: string; hint: string }> = {
  LOI: { reason: 'Signature does not match the KYC record. Ask the authorised signatory to sign.', hint: 'signed by the authorised signatory' },
  AFF: { reason: 'Notary seal is unclear. Upload a legible scan.', hint: 'with a clear notary seal' },
  AGR: { reason: 'Firm stamp missing on page 8. Upload the complete signed PDF.', hint: 'with the firm stamp on page 8' },
  BNK: { reason: 'Cancelled cheque is not legible. Upload a clearer scan.', hint: 'with a legible cancelled cheque' },
  KYC: { reason: 'KYC copies are not legible. Upload clear self-attested scans.', hint: 'with legible self-attested copies' },
  PVC: { reason: 'Certificate is not legible. Upload a clear scan.', hint: 'with a legible certificate' },
}

const IST = 'Asia/Kolkata'
const fDate = new Intl.DateTimeFormat('en-GB', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric' })
const fShort = new Intl.DateTimeFormat('en-GB', { timeZone: IST, day: '2-digit', month: 'short' })
const fTime = new Intl.DateTimeFormat('en-GB', { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: false })
const fParts = new Intl.DateTimeFormat('en-GB', { timeZone: IST, day: '2-digit', month: '2-digit', year: 'numeric' })

const valid = (iso?: string) => !!iso && !Number.isNaN(new Date(iso).getTime())
/** 08 Oct 2026 */
export const fmtDate = (iso?: string) => (valid(iso) ? fDate.format(new Date(iso!)) : '—')
/** 08 Oct */
export const fmtShort = (iso?: string) => (valid(iso) ? fShort.format(new Date(iso!)) : '—')
/** 09:05 */
export const fmtTime = (iso?: string) => (valid(iso) ? fTime.format(new Date(iso!)) : '—')
/** 08 Oct 2026, 09:05 IST */
export const fmtDateTime = (iso?: string) => (valid(iso) ? `${fmtDate(iso)}, ${fmtTime(iso)} IST` : '—')
/** 08.10.2026 */
export const fmtDots = (iso?: string) => (valid(iso) ? fParts.format(new Date(iso!)).replace(/\//g, '.') : '—')
/** YYYY-MM-DD of the IST calendar day */
export const istDay = (iso: string) => {
  const [d, m, y] = fParts.format(new Date(iso)).split('/')
  return `${y}-${m}-${d}`
}
const at = (day: string, time: string) => new Date(`${day}T${time}:00+05:30`).toISOString()
const H = 3600e3
const iso = (ms: number) => new Date(ms).toISOString()
let seq = 0
export const newId = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

export const docTitle = (d: LegalDoc) => DOC_META[d.kind].title
export const nextVersion = (v: string) => `v${(parseInt(v.slice(1), 10) || 1) + 1}.0`

// ───────────────────────── Seed ─────────────────────────

type SiteSeed = [num: string, location: string, address: string, pincode: string]
type FrSeed = { id: string; name: string; tier: string; atms: number; state: string; sc: string; city: string; cc: string; signatory: string; phone: string; mf: string; sites: SiteSeed[] }

const FRANCHISES: FrSeed[] = [
  {
    id: 'FR-MH-00124', name: 'Shree Sai Financial Services', tier: 'Master', atms: 24, state: 'Maharashtra', sc: 'MH', city: 'Pune', cc: 'PUN', signatory: 'Rahul Patil', phone: '+91 98220 41124', mf: 'Shree Sai Financial Services',
    sites: [['00124', 'Kothrud · Paud Road', 'Shop 4, Mayur Arcade, Paud Road, Kothrud', '411038'], ['00131', 'Baner · High Street', 'Unit 2, Sai Plaza, Baner Road', '411045'], ['00138', 'Hadapsar · Magarpatta Road', 'G-7, Amanora Chambers, Magarpatta Road', '411028']]
  },
  {
    id: 'FR-GJ-00218', name: 'Patel Cash Solutions', tier: 'Franchise', atms: 8, state: 'Gujarat', sc: 'GJ', city: 'Ahmedabad', cc: 'AMD', signatory: 'Kiran Patel', phone: '+91 98250 18218', mf: 'Shree Sai Financial Services',
    sites: [['00218', 'Navrangpura · CG Road', '12, Shital Complex, CG Road', '380009'], ['00221', 'Maninagar · Kankaria Road', 'Shop 3, Jay Shopping Centre, Kankaria Road', '380008'], ['00226', 'Satellite · Jodhpur Cross Road', 'B-5, Shivalik Plaza, Jodhpur Cross Road', '380015']]
  },
  {
    id: 'FR-KA-00076', name: 'Namma ATM Network', tier: 'Super Master', atms: 68, state: 'Karnataka', sc: 'KA', city: 'Bengaluru', cc: 'BLR', signatory: 'Ravi Gowda', phone: '+91 98450 70076', mf: 'Namma ATM Network',
    sites: [['00076', 'Jayanagar · 4th Block', '27, 11th Main, 4th Block, Jayanagar', '560011'], ['00081', 'Whitefield · ITPL Main Road', 'Shop 9, Forum Value Mall Annexe, ITPL Main Road', '560066'], ['00089', 'Malleshwaram · Sampige Road', '41, Sampige Road, Malleshwaram', '560003']]
  },
  {
    id: 'FR-UP-00305', name: 'Awadh Banking Point', tier: 'Franchise', atms: 6, state: 'Uttar Pradesh', sc: 'UP', city: 'Lucknow', cc: 'LKO', signatory: 'Alok Srivastava', phone: '+91 94150 30305', mf: 'Capital ATM Partners',
    sites: [['00305', 'Hazratganj · MG Marg', '18, Halwasiya Market, MG Marg', '226001'], ['00311', 'Gomti Nagar · Vibhuti Khand', 'C-2, Summit Building, Vibhuti Khand', '226010'], ['00317', 'Aliganj · Kapoorthala', '7, Kapoorthala Complex, Aliganj', '226024']]
  },
  {
    id: 'FR-TN-00142', name: 'Southern Cash Services', tier: 'Master', atms: 32, state: 'Tamil Nadu', sc: 'TN', city: 'Chennai', cc: 'CHE', signatory: 'Senthil Kumar', phone: '+91 98410 14142', mf: 'Southern Cash Services',
    sites: [['00142', 'T. Nagar · Usman Road', '64, Usman Road, T. Nagar', '600017'], ['00147', 'Adyar · LB Road', '22, LB Road, Adyar', '600020'], ['00153', 'Velachery · Bypass Road', '5, Velachery Main Road', '600042']]
  },
  {
    id: 'FR-RJ-00267', name: 'Pink City Finserve', tier: 'Franchise', atms: 5, state: 'Rajasthan', sc: 'RJ', city: 'Jaipur', cc: 'JAI', signatory: 'Manish Agarwal', phone: '+91 94140 26267', mf: 'Capital ATM Partners',
    sites: [['00267', 'Malviya Nagar · JLN Marg', '3, Gaurav Tower, JLN Marg', '302017'], ['00272', 'Vaishali Nagar · Amrapali Circle', 'Shop 11, Amrapali Circle', '302021'], ['00278', 'Mansarovar · Shipra Path', '88, Shipra Path, Mansarovar', '302020']]
  },
  {
    id: 'FR-DL-00091', name: 'Capital ATM Partners', tier: 'Master', atms: 18, state: 'Delhi', sc: 'DL', city: 'New Delhi', cc: 'NDL', signatory: 'Rohan Malhotra', phone: '+91 98110 09091', mf: 'Capital ATM Partners',
    sites: [['00091', 'Lajpat Nagar · Ring Road', 'I-14, Lajpat Nagar II, Ring Road', '110024'], ['00095', 'Karol Bagh · Ajmal Khan Road', '2/31, Ajmal Khan Road', '110005'], ['00099', 'Dwarka · Sector 12', 'Plot 6, Pocket 1, Sector 12', '110075']]
  },
  {
    id: 'FR-WB-00183', name: 'Bengal Rural Payments', tier: 'Franchise', atms: 9, state: 'West Bengal', sc: 'WB', city: 'Kolkata', cc: 'KOL', signatory: 'Subrata Das', phone: '+91 98300 18183', mf: 'Deccan Cash Connect',
    sites: [['00183', 'Salt Lake · Sector V', 'GP Block, Sector V, Salt Lake', '700091'], ['00187', 'Howrah · GT Road', '120, GT Road, Howrah', '711101'], ['00192', 'Barasat · Jessore Road', '45, Jessore Road, Barasat', '700124']]
  },
  {
    id: 'FR-MP-00312', name: 'Malwa Financial Network', tier: 'Franchise', atms: 7, state: 'Madhya Pradesh', sc: 'MP', city: 'Indore', cc: 'IND', signatory: 'Anil Joshi', phone: '+91 98270 31312', mf: 'Shree Sai Financial Services',
    sites: [['00312', 'Vijay Nagar · AB Road', '9, Scheme 54, AB Road, Vijay Nagar', '452010'], ['00318', 'Rajwada · MG Road', '21, MG Road, Rajwada', '452002'], ['00324', 'Palasia · Old Palasia', '14, Old Palasia', '452001']]
  },
  {
    id: 'FR-TS-00156', name: 'Deccan Cash Connect', tier: 'Master', atms: 21, state: 'Telangana', sc: 'TS', city: 'Hyderabad', cc: 'HYD', signatory: 'Srinivas Reddy', phone: '+91 98490 15156', mf: 'Deccan Cash Connect',
    sites: [['00156', 'Ameerpet · SR Nagar', '7-1-28, SR Nagar Main Road', '500038'], ['00161', 'Kukatpally · KPHB Colony', 'Plot 12, KPHB Phase 3', '500072'], ['00166', 'Gachibowli · DLF Road', 'Shop 2, DLF Cyber City Road', '500032']]
  },
]

const MODELS = ['Garnet Model', 'Sapphire', 'Topaz', 'Emerald']

/** status profile per site (LOI, AFF, AGR, BNK) — index aligned with the flattened site list */
const A: LegalStatus = 'Approved', U: LegalStatus = 'Under Review', R: LegalStatus = 'Action Required', X: LegalStatus = 'Resubmission Required'
const PROFILES: LegalStatus[][] = [
  [A, A, A, A], [A, A, U, A], [A, U, R, R], [A, X, R, R], [R, R, R, R], [A, A, X, U], [A, A, A, U],
]

/** Doc id per site + kind, e.g. LEG-AGR-MH-0001 (unique per Site Master Site ID). */
export const legalDocId = (kind: DocKind, siteId: string) => `LEG-${kind}-${siteId.replace(/^SITE-/i, '').replace(/[^a-zA-Z0-9-]/g, '')}`
export const siteLoiOf = (siteId: string) => `LOI-${siteId.replace(/^SITE-/i, '')}`

/** Legal site row built from a Site Master site (contact person / model come from Legal's own data). */
export function legalSiteFrom(site: Site, extra: Partial<LegalSite> = {}): LegalSite {
  const franchiseName = franchiseNameOf(site)
  const words = franchiseName.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(Boolean)
  const signatory = extra.signatory ?? 'Authorised Signatory'
  return {
    id: site.siteId,
    siteLoi: siteLoiOf(site.siteId),
    location: site.location,
    address: site.address,
    city: site.district,
    state: site.state,
    pincode: site.pin,
    franchiseId: site.frId,
    franchiseName,
    tier: 'Franchise',
    atms: 1,
    signatory,
    contactNumber: '',
    email: `${signatory.split(' ')[0].toLowerCase()}@${words.slice(0, 2).join('') || 'franchise'}.in`,
    model: site.machineType,
    mf: franchiseName,
    atmId: site.atmId,
    atmMappedOn: '',
    owner: 'Paras Dubey',
    createdOn: istDay(new Date().toISOString()),
    ...extra,
  }
}

export function siteRows(): LegalSite[] {
  const out: LegalSite[] = []
  const used = new Set<string>()
  // every legal site is a real Site Master site (same state as the seed franchise where possible)
  const pickSite = (start: number, state: string): Site => {
    for (let k = 0; k < 200; k++) {
      const s = siteAt(start + k, (x) => x.state === state)
      if (!used.has(s.siteId)) return s
    }
    for (let k = 0; k < 2000; k++) {
      const s = siteAt(start + k)
      if (!used.has(s.siteId)) return s
    }
    return siteAt(start)
  }
  FRANCHISES.forEach((f, fi) =>
    f.sites.forEach(([, location, address, pincode], si) => {
      const n = fi * 3 + si
      const day = 1 + ((n * 7) % 27)
      const month = n % 3 === 0 ? '08' : '09'
      const main = n === 0
      const site = pickSite(si, f.state)
      used.add(site.siteId)
      const franchiseName = franchiseNameOf(site)
      out.push({
        id: site.siteId,
        siteLoi: siteLoiOf(site.siteId),
        location: location || site.location,
        address: address || site.address,
        city: site.district,
        state: site.state,
        pincode: pincode || site.pin,
        franchiseId: site.frId,
        franchiseName,
        tier: f.tier,
        atms: f.atms,
        signatory: f.signatory,
        contactNumber: f.phone,
        email: `${f.signatory.split(' ')[0].toLowerCase()}@${franchiseName.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).join('') || 'franchise'}.in`,
        model: main ? 'Garnet Model' : MODELS[n % 4],
        mf: f.mf,
        atmId: site.atmId,
        atmMappedOn: main ? '2026-10-01' : n % 5 === 4 ? '' : month === '08' ? `2026-09-${String(Math.min(28, day)).padStart(2, '0')}` : `2026-10-${String(1 + (day % 12)).padStart(2, '0')}`,
        owner: n % 4 === 3 ? 'Priya Menon' : 'Paras Dubey',
        createdOn: main ? '2026-09-28' : `2026-${month}-${String(day).padStart(2, '0')}`,
      })
    }),
  )
  return out
}

function ev(ref: string, atIso: string, actor: string, role: string, event: string, outcome: string, context: string, version: string, source: AuditSource, note?: string): AuditEvent {
  return { id: `EV-${ref}-${atIso.replace(/\D/g, '').slice(2, 14)}-${event.slice(0, 3)}`, ref, at: atIso, actor, role, event, outcome, context, version, source, note }
}

function buildDoc(site: LegalSite, kind: DocKind, status: LegalStatus, base: number): { doc: LegalDoc; events: AuditEvent[] } {
  const m = DOC_META[kind]
  const id = legalDocId(kind, site.id)
  const file = `${m.stem}_${site.id}_v1.pdf`
  const fr = site.signatory
  const owner = site.owner
  const events: AuditEvent[] = [
    ev(id, iso(base), owner, 'Administrator', 'Created', 'Created', 'Original PDF', 'v1.0', 'Workspace'),
    ev(id, iso(base + 0.2 * H), owner, 'Administrator', 'Shared', 'Delivered', `To ${fr}`, 'v1.0', 'Workspace'),
  ]
  const doc: LegalDoc = {
    id, siteId: site.id, kind, status, version: 'v1.0',
    dueDate: istDay(iso(base + 7 * 24 * H)),
    instructions: `Download v1.0, ${m.sign.charAt(0).toLowerCase()}${m.sign.slice(1)} Upload all ${m.pages} pages as one clear PDF.`,
    versions: [{ version: 'v1.0', file, sizeMb: m.sizeMb, pages: m.pages, createdAt: iso(base), createdBy: owner, sharedAt: iso(base + 0.2 * H) }],
    uploads: [],
  }
  events.push(ev(id, iso(base + 20 * H), fr, 'Franchisee', 'Downloaded', 'Saved', `${m.short} · v1.0.pdf`, 'v1.0', 'Mobile app'))
  if (status !== 'Action Required') {
    const up: SignedUpload = { id: `${id}-S1`, version: 'v1.0', file: `${m.stem}_signed_${site.id}.pdf`, sizeKb: 900 + m.pages * 210, uploadedAt: iso(base + 50 * H), by: fr, source: 'Mobile app' }
    events.push(ev(id, up.uploadedAt, fr, 'Franchisee', 'Uploaded', 'Received', 'Signed PDF', 'v1.0', 'Mobile app'))
    if (status === 'Approved') {
      Object.assign(up, { decision: 'Approved', reviewer: REVIEWER.name, reviewedAt: iso(base + 70 * H) })
      events.push(ev(id, iso(base + 70 * H), REVIEWER.name, REVIEWER.role, 'Approved', 'Approved', 'Signed PDF', 'v1.0', 'Workspace'))
    }
    if (status === 'Resubmission Required') {
      const r = REJECTIONS[kind]
      Object.assign(up, { decision: 'Rejected', reason: r.reason, reviewer: REVIEWER.name, reviewedAt: iso(base + 70 * H) })
      doc.feedback = r.reason
      doc.hint = r.hint
      events.push(ev(id, iso(base + 70 * H), REVIEWER.name, REVIEWER.role, 'Rejected', 'Rejected', 'Signed PDF', 'v1.0', 'Workspace', r.reason))
    }
    doc.uploads.push(up)
  }
  return { doc, events }
}

/** The canonical demo site (first legal site) — reproduced exactly from the Figma. */
function mainSiteDocs(site: LegalSite): { docs: LegalDoc[]; events: AuditEvent[] } {
  const S = site.id
  const RP = 'Rahul Patil', AS = 'Paras Dubey', MI = 'Meera Iyer'
  const agr = legalDocId('AGR', S), loi = legalDocId('LOI', S), aff = legalDocId('AFF', S), bnk = legalDocId('BNK', S)
  const rejectAgr = 'Firm stamp missing on page 8. Please use the revised v2.0 original and upload the complete signed PDF.'
  const docs: LegalDoc[] = [
    {
      id: loi, siteId: S, kind: 'LOI', status: 'Approved', version: 'v1.0', dueDate: '2026-10-03',
      instructions: 'Download v1.0, sign both pages and add the firm stamp on page 2. Upload both pages as one clear PDF.',
      versions: [{ version: 'v1.0', file: `LOI_${S}_v1.pdf`, sizeMb: 0.4, pages: 2, createdAt: at('2026-09-29', '11:00'), createdBy: AS, sharedAt: at('2026-09-29', '11:10') }],
      uploads: [{ id: `${loi}-S1`, version: 'v1.0', file: `LOI_signed_${S}.pdf`, sizeKb: 1320, uploadedAt: at('2026-10-01', '17:45'), by: RP, source: 'Mobile app', decision: 'Approved', reviewer: MI, reviewedAt: at('2026-10-02', '12:20') }],
    },
    {
      id: aff, siteId: S, kind: 'AFF', status: 'Resubmission Required', version: 'v1.0', dueDate: '2026-10-10',
      instructions: 'Download v1.0, sign every page and get it notarised. The notary seal must be clearly visible. Upload all 3 pages as one clear PDF.',
      feedback: 'Notary seal is unclear. Upload a legible scan.', hint: 'with a clear notary seal',
      versions: [{ version: 'v1.0', file: `Affidavit_${S}_v1.pdf`, sizeMb: 0.6, pages: 3, createdAt: at('2026-09-30', '10:00'), createdBy: AS, sharedAt: at('2026-09-30', '10:05') }],
      uploads: [{ id: `${aff}-S1`, version: 'v1.0', file: `Affidavit_signed_${S}.pdf`, sizeKb: 2140, uploadedAt: at('2026-10-04', '16:10'), by: RP, source: 'Mobile app', decision: 'Rejected', reason: 'Notary seal is unclear. Upload a legible scan.', reviewer: MI, reviewedAt: at('2026-10-05', '11:30') }],
    },
    {
      id: agr, siteId: S, kind: 'AGR', status: 'Action Required', version: 'v2.0', dueDate: '2026-10-12',
      instructions: 'Download v2.0, sign every page and add the firm stamp on page 8. Upload all 8 pages as one clear PDF.',
      versions: [
        { version: 'v1.0', file: `Agreement_${S}_v1.pdf`, sizeMb: 1.7, pages: 8, createdAt: at('2026-10-05', '16:00'), createdBy: AS, sharedAt: at('2026-10-05', '16:40'), superseded: { on: at('2026-10-07', '14:00'), reason: 'Signed upload rejected' } },
        { version: 'v2.0', file: `Agreement_${S}_v2.pdf`, sizeMb: 1.8, pages: 8, createdAt: at('2026-10-07', '14:00'), createdBy: AS, sharedAt: at('2026-10-07', '14:10') },
      ],
      uploads: [{ id: `${agr}-S1`, version: 'v1.0', file: `Agreement_signed_${S}_v1.pdf`, sizeKb: 3480, uploadedAt: at('2026-10-06', '18:20'), by: RP, source: 'Mobile app', decision: 'Rejected', reason: rejectAgr, reviewer: MI, reviewedAt: at('2026-10-07', '10:30') }],
    },
    {
      id: bnk, siteId: S, kind: 'BNK', status: 'Under Review', version: 'v1.0', dueDate: '2026-10-09',
      instructions: 'Download v1.0, sign the mandate as per bank records and attach a cancelled cheque. Upload both pages as one clear PDF.',
      versions: [{ version: 'v1.0', file: `BankMandate_${S}_v1.pdf`, sizeMb: 0.5, pages: 2, createdAt: at('2026-10-03', '12:00'), createdBy: AS, sharedAt: at('2026-10-03', '12:05') }],
      uploads: [{ id: `${bnk}-S1`, version: 'v1.0', file: `BankMandate_signed_${S}.pdf`, sizeKb: 1040, uploadedAt: at('2026-10-06', '15:40'), by: RP, source: 'Mobile app' }],
    },
  ]
  const events: AuditEvent[] = [
    // Agreement — 10 events, 3 people, 2 versions (05–08 Oct 2026)
    ev(agr, at('2026-10-08', '09:05'), RP, 'Franchisee', 'Downloaded', 'Saved', 'Agreement · v2.0.pdf', 'v2.0', 'Mobile app'),
    ev(agr, at('2026-10-08', '09:02'), RP, 'Franchisee', 'Viewed', 'Opened', 'Agreement · v2.0.pdf', 'v2.0', 'Mobile app'),
    ev(agr, at('2026-10-07', '14:10'), AS, 'Administrator', 'Shared', 'Delivered', 'To Rahul Patil', 'v2.0', 'Workspace'),
    ev(agr, at('2026-10-07', '14:00'), AS, 'Administrator', 'Created', 'Created', 'Revised original', 'v2.0', 'Workspace'),
    ev(agr, at('2026-10-07', '10:30'), MI, 'Legal reviewer', 'Rejected', 'Rejected', 'Signed PDF', 'v1.0', 'Workspace', rejectAgr),
    ev(agr, at('2026-10-06', '18:20'), RP, 'Franchisee', 'Uploaded', 'Received', 'Signed PDF', 'v1.0', 'Mobile app'),
    ev(agr, at('2026-10-06', '11:15'), RP, 'Franchisee', 'Downloaded', 'Saved', 'Agreement · v1.0.pdf', 'v1.0', 'Mobile app'),
    ev(agr, at('2026-10-05', '16:40'), AS, 'Administrator', 'Shared', 'Delivered', 'To Rahul Patil', 'v1.0', 'Workspace'),
    ev(agr, at('2026-10-05', '16:30'), MI, 'Legal reviewer', 'Approved', 'Approved', 'Original template', 'v1.0', 'Workspace'),
    ev(agr, at('2026-10-05', '16:00'), AS, 'Administrator', 'Created', 'Created', 'Original PDF', 'v1.0', 'Workspace'),
    // LOI
    ev(loi, at('2026-10-02', '12:20'), MI, 'Legal reviewer', 'Approved', 'Approved', 'Signed PDF', 'v1.0', 'Workspace'),
    ev(loi, at('2026-10-01', '17:45'), RP, 'Franchisee', 'Uploaded', 'Received', 'Signed PDF', 'v1.0', 'Mobile app'),
    ev(loi, at('2026-09-30', '09:40'), RP, 'Franchisee', 'Downloaded', 'Saved', 'LOI · v1.0.pdf', 'v1.0', 'Mobile app'),
    ev(loi, at('2026-09-29', '11:10'), AS, 'Administrator', 'Shared', 'Delivered', 'To Rahul Patil', 'v1.0', 'Workspace'),
    ev(loi, at('2026-09-29', '11:00'), AS, 'Administrator', 'Created', 'Created', 'Original PDF', 'v1.0', 'Workspace'),
    // Affidavit
    ev(aff, at('2026-10-05', '11:30'), MI, 'Legal reviewer', 'Rejected', 'Rejected', 'Signed PDF', 'v1.0', 'Workspace', 'Notary seal is unclear. Upload a legible scan.'),
    ev(aff, at('2026-10-04', '16:10'), RP, 'Franchisee', 'Uploaded', 'Received', 'Signed PDF', 'v1.0', 'Mobile app'),
    ev(aff, at('2026-10-01', '10:20'), RP, 'Franchisee', 'Downloaded', 'Saved', 'Affidavit · v1.0.pdf', 'v1.0', 'Mobile app'),
    ev(aff, at('2026-09-30', '10:05'), AS, 'Administrator', 'Shared', 'Delivered', 'To Rahul Patil', 'v1.0', 'Workspace'),
    ev(aff, at('2026-09-30', '10:00'), AS, 'Administrator', 'Created', 'Created', 'Original PDF', 'v1.0', 'Workspace'),
    // Bank mandate
    ev(bnk, at('2026-10-06', '15:40'), RP, 'Franchisee', 'Uploaded', 'Received', 'Signed PDF', 'v1.0', 'Mobile app'),
    ev(bnk, at('2026-10-04', '09:15'), RP, 'Franchisee', 'Downloaded', 'Saved', 'Bank Mandate · v1.0.pdf', 'v1.0', 'Mobile app'),
    ev(bnk, at('2026-10-03', '12:05'), AS, 'Administrator', 'Shared', 'Delivered', 'To Rahul Patil', 'v1.0', 'Workspace'),
    ev(bnk, at('2026-10-03', '12:00'), AS, 'Administrator', 'Created', 'Created', 'Original PDF', 'v1.0', 'Workspace'),
  ]
  return { docs, events }
}

function seed(): LegalState {
  const sites = siteRows()
  const docs: LegalDoc[] = []
  const audit: AuditEvent[] = []
  sites.forEach((s, i) => {
    if (i === 0) {
      const m = mainSiteDocs(s)
      docs.push(...m.docs)
      audit.push(...m.events)
      return
    }
    const prof = PROFILES[(i * 5 + 3) % PROFILES.length]
    const base = new Date(`${s.createdOn}T10:00:00+05:30`).getTime()
    DOC_KINDS.forEach((k, ki) => {
      const off = [0, 1, 3, 3][ki] * 24 * H + ki * 0.5 * H
      const b = buildDoc(s, k, prof[ki], base + off)
      // open items get a current (mid/late October) deadline rather than an old one
      if (prof[ki] === 'Action Required' || prof[ki] === 'Resubmission Required') b.doc.dueDate = `2026-10-${String(13 + ((i + ki) % 14)).padStart(2, '0')}`
      docs.push(b.doc)
      audit.push(...b.events)
    })
  })
  return { sites, docs, audit }
}

// API mode keeps its own cache key and starts empty (never shows the mock seed); hydrated by legalLoader.
export const legalStore = apiEnabled ? createStore<LegalState>('dexter.legal.api.v1', () => ({ sites: [], docs: [], audit: [] })) : createStore<LegalState>('dexter.legal.v2', seed)
/** Legal state. API mode: hydrated from the backend on first use (see legalLoader). */
export const useLegal = () => {
  legalLoader.use()
  return legalStore.use()
}

// ───────────────────────── Selectors ─────────────────────────

export const getSite = (s: LegalState, id: string) => s.sites.find((x) => x.id === id)
export const getDoc = (s: LegalState, id: string) => s.docs.find((x) => x.id === id)
const ORDER: Record<DocKind, number> = { LOI: 0, AFF: 1, AGR: 2, KYC: 3, PVC: 4, BNK: 5 }
export const docsForSite = (s: LegalState, siteId: string) => s.docs.filter((d) => d.siteId === siteId).sort((a, b) => ORDER[a.kind] - ORDER[b.kind])
export const eventsFor = (s: LegalState, ref: string) => s.audit.filter((e) => e.ref === ref).sort((a, b) => b.at.localeCompare(a.at))
export const eventsForSite = (s: LegalState, siteId: string) => {
  const ids = new Set(docsForSite(s, siteId).map((d) => d.id))
  return s.audit.filter((e) => ids.has(e.ref)).sort((a, b) => b.at.localeCompare(a.at))
}
export const agreementOf = (s: LegalState, siteId: string) => s.docs.find((d) => d.siteId === siteId && d.kind === 'AGR')
export const currentVersion = (d: LegalDoc) => d.versions.find((v) => v.version === d.version) ?? d.versions[d.versions.length - 1]
/** signed upload for the current version that is still awaiting a decision */
export const pendingUpload = (d: LegalDoc) => d.uploads.find((u) => u.version === d.version && !u.decision)
export const lastAccess = (s: LegalState, docId: string) => eventsFor(s, docId).find((e) => e.event === 'Downloaded' || e.event === 'Viewed')

export function readiness(s: LegalState, siteId: string) {
  const req = docsForSite(s, siteId).filter((d) => DOC_META[d.kind].required)
  const approved = req.filter((d) => d.status === 'Approved').length
  // API mode: the backend sequence always has five required documents (LOI → AFF → AGR → KYC → PVC), issued or not.
  const total = apiEnabled ? Math.max(LEGAL_SEQUENCE_API.length, req.length) : req.length
  return { approved, total, needAction: total - approved, cleared: total > 0 && approved === total }
}
export const siteCompliance = (s: LegalState, siteId: string) => (readiness(s, siteId).cleared ? 'Legally cleared' : 'Compliance pending')

export function cardNote(d: LegalDoc): string {
  switch (d.status) {
    case 'Approved':
      return 'Signed and verified by the legal team.'
    case 'Resubmission Required':
      return d.feedback ?? 'Signed upload rejected. Resubmit a clear copy.'
    case 'Under Review': {
      const u = d.uploads.find((x) => x.version === d.version && !x.decision)
      return `Signed copy submitted ${fmtShort(u?.uploadedAt)}. Awaiting verification.`
    }
    default:
      return d.versions.length > 1 ? 'Revised original shared. Signed copy pending.' : 'Original shared. Signed copy pending.'
  }
}

export function pendingLine(d: LegalDoc): string {
  const m = DOC_META[d.kind]
  if (d.status === 'Resubmission Required') return d.hint ? `Resubmit the ${m.short} ${d.hint}.` : `Resubmit the ${m.short}: ${d.feedback ?? 'see review feedback'}`
  return `Sign and upload ${m.short} ${d.version} by ${fmtDate(d.dueDate)}.`
}

// ───────────────────────── Actions (each appends an immutable audit event) ─────────────────────────

const nowIso = () => new Date().toISOString()

export function logEvent(e: Omit<AuditEvent, 'id' | 'at'> & { at?: string }) {
  const full: AuditEvent = { ...e, id: newId('EV'), at: e.at ?? nowIso() }
  legalStore.set((s) => ({ ...s, audit: [full, ...s.audit] }))
  return full
}

/** Workflow template variables for a legal site (Site Master IDs). */
const wfVars = (site: LegalSite | undefined, siteId: string) => ({ Site_ID: site?.id ?? siteId, ATM_ID: site?.atmId, Site_LOI_Number: site?.siteLoi, Franchise_Name: site?.franchiseName })

const patchDoc = (id: string, fn: (d: LegalDoc) => LegalDoc) => legalStore.set((s) => ({ ...s, docs: s.docs.map((d) => (d.id === id ? fn(d) : d)) }))

const isFranchisee = () => apiEnabled && currentRole() === 'Franchisee'

export function recordAccess(docId: string, kind: 'Viewed' | 'Downloaded', source: AuditSource, who: { name: string; role: string } = CURRENT_USER, file?: string) {
  const d = getDoc(legalStore.get(), docId)
  if (!d) return
  const m = DOC_META[d.kind]
  logEvent({ ref: docId, actor: who.name, role: who.role, event: kind, outcome: kind === 'Viewed' ? 'Opened' : 'Saved', context: file ?? `${m.short} · ${d.version}.pdf`, version: d.version, source })
  if (!apiEnabled) return
  // access log on the server (franchisee app: only "viewed" exists)
  const call = isFranchisee() ? (kind === 'Viewed' ? post(`/my/legal/docs/${enc(docId)}/viewed`) : null) : post(`/legal/docs/${enc(docId)}/access`, { kind, source })
  call?.catch(() => undefined)
}

export async function sendReminder(docId: string): Promise<boolean> {
  const s = legalStore.get()
  const d = getDoc(s, docId)
  const site = d && getSite(s, d.siteId)
  if (!d || !site) return false
  if (apiEnabled) {
    await apiCall(() => post(`/legal/docs/${enc(docId)}/reminder`), 'Reminder failed')
    await refreshLegalDoc(docId)
    return true
  }
  logEvent({ ref: docId, actor: CURRENT_USER.name, role: CURRENT_USER.role, event: 'Reminder sent', outcome: 'Delivered', context: `To ${site.signatory}`, version: d.version, source: 'Workspace', note: pendingLine(d) })
  return true
}

export async function shareRevision(docId: string, input: { instructions: string; dueDate: string; reason: string; file?: File }): Promise<string | undefined> {
  const s = legalStore.get()
  const d = getDoc(s, docId)
  const site = d && getSite(s, d.siteId)
  if (!d || !site) return
  if (apiEnabled) {
    const f = input.file ? await apiCall(() => uploadFile(input.file!, { purpose: 'legal', entity: 'LegalDocument', ref: docId }), 'Upload failed') : undefined
    const r = await apiCall(() => post<ApiLegalDoc>(`/legal/docs/${enc(docId)}/revision`, { instructions: input.instructions, dueDate: input.dueDate, reason: input.reason, fileId: f?.fileId, fileName: f?.name }), 'Revision failed')
    await refreshLegalDoc(docId)
    return r.version
  }
  const v = nextVersion(d.version)
  const m = DOC_META[d.kind]
  const now = Date.now()
  const created = iso(now), shared = iso(now + 60e3)
  patchDoc(docId, (x) => ({
    ...x,
    version: v,
    status: 'Action Required',
    dueDate: input.dueDate,
    instructions: input.instructions,
    feedback: undefined,
    hint: undefined,
    versions: [
      ...x.versions.map((ver) => (ver.superseded ? ver : { ...ver, superseded: { on: created, reason: input.reason } })),
      { version: v, file: `${m.stem}_${site.id}_${v.replace('.0', '')}.pdf`, sizeMb: m.sizeMb, pages: m.pages, createdAt: created, createdBy: CURRENT_USER.name, sharedAt: shared },
    ],
  }))
  logEvent({ ref: docId, actor: CURRENT_USER.name, role: CURRENT_USER.role, event: 'Superseded', outcome: 'Superseded', context: `${d.version} replaced · ${input.reason}`, version: d.version, source: 'Workspace', at: created })
  logEvent({ ref: docId, actor: CURRENT_USER.name, role: CURRENT_USER.role, event: 'Created', outcome: 'Created', context: 'Revised original', version: v, source: 'Workspace', at: iso(now + 1000) })
  logEvent({ ref: docId, actor: CURRENT_USER.name, role: CURRENT_USER.role, event: 'Shared', outcome: 'Delivered', context: `To ${site.signatory}`, version: v, source: 'Workspace', at: shared, note: input.instructions })
  return v
}

/** Approve / reject the pending signed upload. API mode: POST /legal/docs/:id/review (maker-checker on the server). */
export async function reviewUpload(docId: string, decision: 'Approved' | 'Rejected', reason?: string): Promise<boolean> {
  const d = getDoc(legalStore.get(), docId)
  const up = d && pendingUpload(d)
  if (!d || !up) return false
  if (apiEnabled) {
    await apiCall(() => post(`/legal/docs/${enc(docId)}/review`, { decision, reason }), decision === 'Approved' ? 'Approval failed' : 'Rejection failed')
    await refreshLegalDoc(docId)
    return true
  }
  const when = nowIso()
  patchDoc(docId, (x) => ({
    ...x,
    status: decision === 'Approved' ? 'Approved' : 'Resubmission Required',
    feedback: decision === 'Rejected' ? reason : undefined,
    hint: undefined,
    uploads: x.uploads.map((u) => (u.id === up.id ? { ...u, decision, reason, reviewer: CURRENT_USER.name, reviewedAt: when } : u)),
  }))
  logEvent({ ref: docId, actor: CURRENT_USER.name, role: CURRENT_USER.role, event: decision, outcome: decision, context: 'Signed PDF', version: d.version, source: 'Workspace', note: reason, at: when })
  const site = getSite(legalStore.get(), d.siteId)
  const m = DOC_META[d.kind]
  emitWorkflow({
    module: 'Legal', event: decision === 'Approved' ? 'Approve' : 'Reject', refId: docId,
    vars: { ...wfVars(site, d.siteId), Current_Status: decision === 'Approved' ? 'Approved' : 'Resubmission Required', Pending_Action: decision === 'Rejected' ? `Re-upload ${m.short}${reason ? ` (${reason})` : ''}` : undefined },
    nextAction: decision === 'Rejected' ? { title: `Re-upload ${m.short} (signed copy rejected)`, dueHours: 72 } : undefined,
  })
  return true
}

/** Franchisee mobile app submission — status → Under Review (file cannot be replaced during review). */
export async function submitSignedUpload(docId: string, file: { name: string; size: number; file?: File }): Promise<boolean> {
  const s = legalStore.get()
  const d = getDoc(s, docId)
  const site = d && getSite(s, d.siteId)
  if (!d || !site || d.status === 'Under Review' || d.status === 'Approved') return false
  if (apiEnabled) {
    const f = file.file ? await apiCall(() => uploadFile(file.file!, { purpose: 'legal', entity: 'LegalDocument', ref: docId }), 'Upload failed') : undefined
    const sizeKb = Math.max(1, Math.round(file.size / 1024))
    if (isFranchisee()) {
      await apiCall(() => post(`/my/legal/docs/${enc(docId)}/upload`, { name: file.name, sizeKb, fileId: f?.fileId }), 'Submit failed')
    } else {
      // staff previewing the franchisee app inside the workspace → workspace upload of the signed copy
      await apiCall(() => post('/legal/docs/upload', { siteId: d.siteId, kind: d.kind, fileName: file.name, fileSizeKb: sizeKb, fileId: f?.fileId }), 'Submit failed')
    }
    await refreshLegalDoc(docId)
    return true
  }
  const when = nowIso()
  const up: SignedUpload = { id: newId(`${docId}-S`), version: d.version, file: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)), uploadedAt: when, by: site.signatory, source: 'Mobile app' }
  patchDoc(docId, (x) => ({ ...x, status: 'Under Review', uploads: [...x.uploads, up] }))
  logEvent({ ref: docId, actor: site.signatory, role: 'Franchisee', event: 'Uploaded', outcome: 'Received', context: `Signed PDF · ${file.name}`, version: d.version, source: 'Mobile app', at: when })
  emitWorkflow({ module: 'Legal', event: 'Submit', refId: docId, vars: { ...wfVars(site, d.siteId), Current_Status: 'Under Review' }, nextAction: { title: `Verify ${DOC_META[d.kind].short}`, dueHours: 48 } })
  return true
}

type WorkspaceUploadInput = {
  siteId: string
  siteLoi: string
  franchiseeName: string
  fileName: string
  fileSizeKb: number
  linkStatus?: string
  remarks?: string
  /** API mode: the picked file, uploaded to POST /files first */
  file?: File | null
}

/** Make sure a Site Master site has a Legal site row (forms may pick any Site Master site). */
export function ensureLegalSite(siteIdOrAtm: string): LegalSite | undefined {
  const master = resolveSite(siteIdOrAtm)
  if (!master) return undefined
  const existing = getSite(legalStore.get(), master.siteId)
  if (existing) return existing
  const row = legalSiteFrom(master)
  legalStore.set((st) => ({ ...st, sites: [...st.sites, row] }))
  return row
}

const WORKSPACE_INSTR: Record<DocKind, string> = {
  LOI: 'LOI document uploaded from workspace.',
  AFF: 'Sworn affidavit uploaded from workspace.',
  AGR: 'Franchise agreement uploaded from workspace.',
  BNK: 'Bank mandate uploaded from workspace.',
  KYC: 'KYC documents uploaded from workspace.',
  PVC: 'Police verification certificate uploaded from workspace.',
}

/**
 * Workspace upload of a signed document → status Under Review (awaiting legal verification).
 * Mock: fires the workflow 'Submit' event with next action "Verify <doc>". API mode: POST /legal/docs/upload
 * (the server validates Site Master, the LOI → AFF → AGR sequence and the lock, and emits the workflow).
 * Resolves false when the site is not in Site Master (mock); API errors are toasted and re-thrown.
 */
async function workspaceUpload(kind: DocKind, input: WorkspaceUploadInput): Promise<boolean> {
  if (apiEnabled) {
    const f = input.file ? await apiCall(() => uploadFile(input.file!, { purpose: 'legal', entity: 'LegalDocument', ref: `${kind}:${input.siteId}` }), 'Upload failed') : undefined
    const saved = await apiCall(
      () => post<ApiLegalDoc>('/legal/docs/upload', { siteId: input.siteId, kind, fileName: input.fileName, fileSizeKb: Math.max(1, input.fileSizeKb), fileId: f?.fileId, siteLoi: input.siteLoi || undefined, remarks: input.remarks, linkStatus: input.linkStatus }),
      'Save failed',
    )
    await refreshLegalDoc(saved.docId)
    return true
  }
  const site = ensureLegalSite(input.siteId)
  if (!site) return false
  const m = DOC_META[kind]
  const s = legalStore.get()
  const doc = s.docs.find((d) => d.siteId === site.id && d.kind === kind)
  const now = new Date().toISOString()
  const note = kind === 'AGR' ? (input.remarks ? `${input.remarks} (Status: ${input.linkStatus || 'Shared'})` : `Status: ${input.linkStatus || 'Shared'}`) : input.remarks
  let ref: string
  if (doc) {
    ref = doc.id
    const up: SignedUpload = { id: newId(`${doc.id}-S`), version: doc.version, file: input.fileName, sizeKb: input.fileSizeKb, uploadedAt: now, by: CURRENT_USER.name, source: 'Workspace' }
    patchDoc(doc.id, (d) => ({ ...d, status: 'Under Review', feedback: undefined, hint: undefined, uploads: [up, ...d.uploads] }))
    logEvent({ ref: doc.id, actor: CURRENT_USER.name, role: CURRENT_USER.role, event: 'Uploaded', outcome: 'Received', context: `${m.short} uploaded · ${input.fileName}`, version: doc.version, source: 'Workspace', note })
  } else {
    ref = legalDocId(kind, site.id)
    const newDoc: LegalDoc = {
      id: ref,
      siteId: site.id,
      kind,
      status: 'Under Review',
      version: 'v1.0',
      dueDate: istDay(new Date(Date.now() + 7 * 24 * H).toISOString()),
      instructions: WORKSPACE_INSTR[kind],
      versions: [{ version: 'v1.0', file: input.fileName, sizeMb: Math.round((input.fileSizeKb / 1024) * 10) / 10 || m.sizeMb, pages: m.pages, createdAt: now, createdBy: CURRENT_USER.name }],
      uploads: [{ id: `${ref}-S1`, version: 'v1.0', file: input.fileName, sizeKb: input.fileSizeKb, uploadedAt: now, by: CURRENT_USER.name, source: 'Workspace' }],
    }
    legalStore.set((state) => ({ ...state, docs: [newDoc, ...state.docs] }))
    logEvent({ ref, actor: CURRENT_USER.name, role: CURRENT_USER.role, event: 'Created', outcome: 'Received', context: `${m.short} created and uploaded · ${input.fileName}`, version: 'v1.0', source: 'Workspace', note })
  }
  emitWorkflow({
    module: 'Legal', event: 'Submit', refId: ref,
    vars: { Site_ID: site.id, ATM_ID: site.atmId, Site_LOI_Number: input.siteLoi || site.siteLoi, Franchise_Name: site.franchiseName, Current_Status: 'Under Review' },
    nextAction: { title: `Verify ${m.short}`, dueHours: 48 },
  })
  return true
}

export const addOrUpdateLoiDoc = (input: Omit<WorkspaceUploadInput, 'linkStatus'>) => workspaceUpload('LOI', input)
export const addOrUpdateAffidavitDoc = (input: Omit<WorkspaceUploadInput, 'linkStatus'>) => workspaceUpload('AFF', input)
export const addOrUpdateAgreementDoc = (input: WorkspaceUploadInput) => workspaceUpload('AGR', input)

// ───────────────────────── Backend (API mode) ─────────────────────────
// Staff: GET /legal/docs (all pages) + GET /legal/audit + GET /legal/sites/:siteId per site (site details / signatory).
// Franchisee: GET /my/legal/docs + GET /my/sites (no audit trail is exposed to franchisees).

const enc = encodeURIComponent
const LEGAL_SEQUENCE_API: DocKind[] = ['LOI', 'AFF', 'AGR', 'KYC', 'PVC']

type ApiDocVersion = { version: string; fileId?: string; file: string; pages?: number; createdAt?: string; createdBy?: string; sharedAt?: string; superseded?: { on: string; reason: string } }
type ApiUpload = { uploadId: string; version: string; fileId?: string; file: string; sizeKb?: number; uploadedAt: string; by?: string; source?: AuditSource; decision?: 'Approved' | 'Rejected'; reason?: string; reviewer?: string; reviewedAt?: string }
export type ApiLegalDoc = {
  docId: string
  siteId: string
  atmId?: string
  frId?: string
  siteLoi?: string
  kind: DocKind
  status: LegalStatus
  version: string
  dueDate?: string
  instructions?: string
  feedback?: string
  versions?: ApiDocVersion[]
  uploads?: ApiUpload[]
  createdAt?: string
  events?: ApiLegalEvent[]
}
export type ApiLegalEvent = { eventId: string; ref: string; siteId?: string; at: string; actor?: string; role?: string; event: string; outcome?: string; context?: string; version?: string; source?: AuditSource; note?: string }
type ApiSiteInfo = { siteId: string; atmId: string; frId: string; franchiseName?: string; signatory?: string; location?: string; address?: string; state?: string; district?: string; pin?: string; model?: string; machineType?: string; siteType?: string }

export function docFromApi(d: ApiLegalDoc): LegalDoc {
  const m = DOC_META[d.kind] ?? DOC_META.LOI
  const lastRejected = d.status === 'Resubmission Required' ? [...(d.uploads ?? [])].reverse().find((u) => u.decision === 'Rejected') : undefined
  return {
    id: d.docId,
    siteId: d.siteId,
    kind: d.kind,
    status: d.status,
    version: d.version,
    dueDate: d.dueDate ?? '',
    instructions: d.instructions ?? '',
    feedback: d.feedback ?? lastRejected?.reason,
    versions: (d.versions ?? []).map((v) => ({ version: v.version, fileId: v.fileId, file: v.file, sizeMb: m.sizeMb, pages: v.pages ?? m.pages, createdAt: v.createdAt ?? '', createdBy: v.createdBy ?? '', sharedAt: v.sharedAt, superseded: v.superseded })),
    uploads: (d.uploads ?? []).map((u) => ({ id: u.uploadId, fileId: u.fileId, version: u.version, file: u.file, sizeKb: u.sizeKb ?? 0, uploadedAt: u.uploadedAt, by: u.by ?? '', source: u.source ?? 'Mobile app', decision: u.decision, reason: u.reason, reviewer: u.reviewer, reviewedAt: u.reviewedAt })),
  }
}

export const eventFromApi = (e: ApiLegalEvent): AuditEvent => ({
  id: e.eventId, ref: e.ref, at: e.at, actor: e.actor ?? '', role: e.role ?? '', event: e.event, outcome: e.outcome ?? e.event, context: e.context ?? '', version: e.version ?? '', source: e.source ?? 'Workspace', note: e.note,
})

function siteFromApi(x: ApiSiteInfo, docs: ApiLegalDoc[]): LegalSite {
  const master = resolveSite(x.siteId)
  const created = docs.map((d) => d.createdAt ?? '').filter(Boolean).sort()[0]
  return {
    id: x.siteId,
    siteLoi: docs.find((d) => d.siteLoi)?.siteLoi ?? siteLoiOf(x.siteId),
    location: x.location ?? master?.location ?? '',
    address: x.address ?? master?.address ?? '',
    city: x.district ?? master?.district ?? '',
    state: x.state ?? master?.state ?? '',
    pincode: x.pin ?? master?.pin ?? '',
    franchiseId: x.frId,
    franchiseName: x.franchiseName ?? (master ? franchiseNameOf(master) : x.frId),
    tier: 'Franchise',
    atms: 1,
    signatory: x.signatory ?? 'Authorised Signatory',
    contactNumber: '',
    email: '',
    model: x.model ?? x.machineType ?? x.siteType ?? master?.machineType ?? '',
    mf: x.franchiseName ?? '',
    atmId: x.atmId,
    atmMappedOn: '',
    owner: '',
    createdOn: created ? istDay(created) : '',
  }
}

/** Fallback site row from the documents alone (+ local Site Master when it knows the site). */
const siteFromDocs = (siteId: string, docs: ApiLegalDoc[]) => siteFromApi({ siteId, atmId: docs[0]?.atmId ?? resolveSite(siteId)?.atmId ?? '', frId: docs[0]?.frId ?? resolveSite(siteId)?.frId ?? '' }, docs)

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++
        out[k] = await fn(items[k])
      }
    }),
  )
  return out
}

function groupBy(docs: ApiLegalDoc[]) {
  const m = new Map<string, ApiLegalDoc[]>()
  docs.forEach((d) => m.set(d.siteId, [...(m.get(d.siteId) ?? []), d]))
  return m
}

async function hydrateLegal() {
  if (isFranchisee()) {
    const [docs, sites] = await Promise.all([get<{ items: ApiLegalDoc[] }>('/my/legal/docs'), fetchAll<ApiSiteInfo>('/my/sites')])
    const bySite = groupBy(docs.items)
    const me = getSession()
    const siteRows = sites.map((x) => ({ ...siteFromApi(x, bySite.get(x.siteId) ?? []), signatory: me?.name ?? 'Authorised Signatory' }))
    legalStore.set({ sites: siteRows, docs: docs.items.map(docFromApi), audit: [] })
    return
  }
  // Site Master hydration (owned by data/network) so the legal forms' Site ID / ATM ID lookups see server sites
  const [docs, events] = await Promise.all([fetchAll<ApiLegalDoc>('/legal/docs', { sort: 'siteId' }), fetchAll<ApiLegalEvent>('/legal/audit'), loadSites().catch(() => false)])
  const bySite = groupBy(docs)
  const siteRows = await pool([...bySite.keys()], 6, async (siteId) => {
    try {
      const r = await get<{ site: ApiSiteInfo }>(`/legal/sites/${enc(siteId)}`)
      return siteFromApi(r.site, bySite.get(siteId)!)
    } catch {
      return siteFromDocs(siteId, bySite.get(siteId)!)
    }
  })
  legalStore.set({ sites: siteRows, docs: docs.map(docFromApi), audit: events.map(eventFromApi) })
}

/** Load state of the legal workspace (API mode). Mock mode: always loaded. */
export const legalLoader = createLoader('legal documents', hydrateLegal)
export const useLegalLoad = () => legalLoader.use()

/** Re-read one document (+ its audit events) after a mutation and merge it into the store. */
export async function refreshLegalDoc(docId: string) {
  if (!apiEnabled) return
  if (isFranchisee()) {
    const r = await get<{ items: ApiLegalDoc[] }>('/my/legal/docs')
    legalStore.set((s) => ({ ...s, docs: r.items.map(docFromApi) }))
    return
  }
  const d = await get<ApiLegalDoc>(`/legal/docs/${enc(docId)}`)
  const doc = docFromApi(d)
  const evs = (d.events ?? []).map(eventFromApi)
  legalStore.set((s) => {
    const sites = s.sites.some((x) => x.id === doc.siteId) ? s.sites : [...s.sites, siteFromDocs(doc.siteId, [d])]
    const docs = s.docs.some((x) => x.id === doc.id) ? s.docs.map((x) => (x.id === doc.id ? doc : x)) : [doc, ...s.docs]
    return { sites, docs, audit: [...evs, ...s.audit.filter((e) => e.ref !== doc.id)] }
  })
}

/** Download a stored legal file (API mode, when the version / upload carries a fileId). Resolves false when there is no stored file. */
export async function downloadLegalFile(fileId: string | undefined, fallbackName: string): Promise<boolean> {
  if (!apiEnabled || !fileId) return false
  const res = await apiCall(() => api<Response>(`/files/${enc(fileId)}/download`, { raw: true }), 'Download failed')
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = fallbackName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return true
}

export function resetLegal() {
  if (apiEnabled) return void legalLoader.reload()
  legalStore.reset()
}
