import { createStore } from '@/lib/store'

// ───────────────────────── Types ─────────────────────────

export type LegalStatus = 'Action Required' | 'Under Review' | 'Approved' | 'Resubmission Required'
export const LEGAL_STATUSES: LegalStatus[] = ['Action Required', 'Under Review', 'Approved', 'Resubmission Required']

export type DocKind = 'LOI' | 'AFF' | 'AGR' | 'BNK'
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
  id: string
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
  atmId: string
  atmMappedOn: string // YYYY-MM-DD or ''
  owner: string
  createdOn: string
}

export type DocVersion = {
  version: string
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

export const CURRENT_USER = { name: 'Paras Dubey', role: 'Administrator' }
export const REVIEWER = { name: 'Meera Iyer', role: 'Legal reviewer' }

export const DOC_META: Record<DocKind, { title: string; short: string; pages: number; sizeMb: number; required: boolean; stem: string; sign: string }> = {
  LOI: { title: 'Letter of Intent (LOI)', short: 'LOI', pages: 2, sizeMb: 0.4, required: true, stem: 'LOI', sign: 'Sign both pages and add the firm stamp on page 2.' },
  AFF: { title: 'Affidavit', short: 'Affidavit', pages: 3, sizeMb: 0.6, required: true, stem: 'Affidavit', sign: 'Sign every page and get it notarised. The notary seal must be clearly visible.' },
  AGR: { title: 'Franchise Agreement', short: 'Agreement', pages: 8, sizeMb: 1.8, required: true, stem: 'Agreement', sign: 'Sign every page and add the firm stamp on page 8.' },
  BNK: { title: 'Bank Mandate', short: 'Bank Mandate', pages: 2, sizeMb: 0.5, required: false, stem: 'BankMandate', sign: 'Sign the mandate as per bank records and attach a cancelled cheque.' },
}

const REJECTIONS: Record<DocKind, { reason: string; hint: string }> = {
  LOI: { reason: 'Signature does not match the KYC record. Ask the authorised signatory to sign.', hint: 'signed by the authorised signatory' },
  AFF: { reason: 'Notary seal is unclear. Upload a legible scan.', hint: 'with a clear notary seal' },
  AGR: { reason: 'Firm stamp missing on page 8. Upload the complete signed PDF.', hint: 'with the firm stamp on page 8' },
  BNK: { reason: 'Cancelled cheque is not legible. Upload a clearer scan.', hint: 'with a legible cancelled cheque' },
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

export function siteRows(): LegalSite[] {
  const out: LegalSite[] = []
  FRANCHISES.forEach((f, fi) =>
    f.sites.forEach(([num, location, address, pincode], si) => {
      const n = fi * 3 + si
      const day = 1 + ((n * 7) % 27)
      const month = n % 3 === 0 ? '08' : '09'
      const main = num === '00124' && f.sc === 'MH'
      out.push({
        id: `ST-${f.sc}-${f.cc}-${num}`,
        location,
        address,
        city: f.city,
        state: f.state,
        pincode,
        franchiseId: f.id,
        franchiseName: f.name,
        tier: f.tier,
        atms: f.atms,
        signatory: f.signatory,
        contactNumber: f.phone,
        email: `${f.signatory.split(' ')[0].toLowerCase()}@${f.name.split(' ')[0].toLowerCase()}${f.name.split(' ')[1]?.toLowerCase() ?? ''}.in`,
        model: main ? 'Garnet Model' : MODELS[n % 4],
        mf: f.mf,
        atmId: !main && n % 5 === 4 ? '' : `DX-${f.sc}-${main ? '01482' : String(1400 + n * 13).padStart(5, '0')}`,
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
  const id = `LEG-${kind}-${site.id.slice(-5)}`
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

/** The canonical demo site ST-MH-PUN-00124 — reproduced exactly from the Figma. */
function mainSiteDocs(site: LegalSite): { docs: LegalDoc[]; events: AuditEvent[] } {
  const S = site.id
  const RP = 'Rahul Patil', AS = 'Paras Dubey', MI = 'Meera Iyer'
  const agr = 'LEG-AGR-00124', loi = 'LEG-LOI-00124', aff = 'LEG-AFF-00124', bnk = 'LEG-BNK-00124'
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
    if (s.id === 'ST-MH-PUN-00124') {
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

export const legalStore = createStore<LegalState>('dexter.legal.v1', seed)
export const useLegal = () => legalStore.use()

// ───────────────────────── Selectors ─────────────────────────

export const getSite = (s: LegalState, id: string) => s.sites.find((x) => x.id === id)
export const getDoc = (s: LegalState, id: string) => s.docs.find((x) => x.id === id)
const ORDER: Record<DocKind, number> = { LOI: 0, AFF: 1, AGR: 2, BNK: 3 }
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
  return { approved, total: req.length, needAction: req.length - approved, cleared: req.length > 0 && approved === req.length }
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

const patchDoc = (id: string, fn: (d: LegalDoc) => LegalDoc) => legalStore.set((s) => ({ ...s, docs: s.docs.map((d) => (d.id === id ? fn(d) : d)) }))

export function recordAccess(docId: string, kind: 'Viewed' | 'Downloaded', source: AuditSource, who = CURRENT_USER, file?: string) {
  const d = getDoc(legalStore.get(), docId)
  if (!d) return
  const m = DOC_META[d.kind]
  logEvent({ ref: docId, actor: who.name, role: who.role, event: kind, outcome: kind === 'Viewed' ? 'Opened' : 'Saved', context: file ?? `${m.short} · ${d.version}.pdf`, version: d.version, source })
}

export function sendReminder(docId: string) {
  const s = legalStore.get()
  const d = getDoc(s, docId)
  const site = d && getSite(s, d.siteId)
  if (!d || !site) return
  logEvent({ ref: docId, actor: CURRENT_USER.name, role: CURRENT_USER.role, event: 'Reminder sent', outcome: 'Delivered', context: `To ${site.signatory}`, version: d.version, source: 'Workspace', note: pendingLine(d) })
}

export function shareRevision(docId: string, input: { instructions: string; dueDate: string; reason: string }) {
  const s = legalStore.get()
  const d = getDoc(s, docId)
  const site = d && getSite(s, d.siteId)
  if (!d || !site) return
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

export function reviewUpload(docId: string, decision: 'Approved' | 'Rejected', reason?: string) {
  const d = getDoc(legalStore.get(), docId)
  const up = d && pendingUpload(d)
  if (!d || !up) return
  const when = nowIso()
  patchDoc(docId, (x) => ({
    ...x,
    status: decision === 'Approved' ? 'Approved' : 'Resubmission Required',
    feedback: decision === 'Rejected' ? reason : undefined,
    hint: undefined,
    uploads: x.uploads.map((u) => (u.id === up.id ? { ...u, decision, reason, reviewer: CURRENT_USER.name, reviewedAt: when } : u)),
  }))
  logEvent({ ref: docId, actor: CURRENT_USER.name, role: CURRENT_USER.role, event: decision, outcome: decision, context: 'Signed PDF', version: d.version, source: 'Workspace', note: reason, at: when })
}

/** Franchisee mobile app submission — status → Under Review (file cannot be replaced during review). */
export function submitSignedUpload(docId: string, file: { name: string; size: number }) {
  const s = legalStore.get()
  const d = getDoc(s, docId)
  const site = d && getSite(s, d.siteId)
  if (!d || !site || d.status === 'Under Review' || d.status === 'Approved') return false
  const when = nowIso()
  const up: SignedUpload = { id: newId(`${docId}-S`), version: d.version, file: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)), uploadedAt: when, by: site.signatory, source: 'Mobile app' }
  patchDoc(docId, (x) => ({ ...x, status: 'Under Review', uploads: [...x.uploads, up] }))
  logEvent({ ref: docId, actor: site.signatory, role: 'Franchisee', event: 'Uploaded', outcome: 'Received', context: `Signed PDF · ${file.name}`, version: d.version, source: 'Mobile app', at: when })
  return true
}

export function resetLegal() {
  legalStore.reset()
}
