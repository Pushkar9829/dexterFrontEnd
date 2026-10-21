// Franchise registry (Figma: Franchise Management). 1,284 franchises: 24 Super Master · 186 Master · 1,074 Franchise.
import { createStore } from '@/lib/store'
import { LOCATIONS, emptyForm, type ApplicationForm } from './applications'

export type Tier = 'Super Master' | 'Master' | 'Franchise'
export type KycStatus = 'Pending' | 'In review' | 'Verified'
export type FrStatus = 'Active' | 'Inactive'

export type Franchise = {
  id: string // FR-<state>-<5 digits>
  name: string
  tier: Tier
  state: string
  city: string
  atms: number
  kyc: KycStatus
  status: FrStatus
  owner: string
  updatedAt: string // ISO
}

export const TIERS: Tier[] = ['Super Master', 'Master', 'Franchise']
export const TIER_SLUG: Record<string, Tier> = { 'super-master': 'Super Master', master: 'Master', franchise: 'Franchise' }
export const TIER_TITLE: Record<Tier, string> = { 'Super Master': 'Super Master Franchise', Master: 'Master Franchise', Franchise: 'Franchise' }

export const STATE_CODE: Record<string, string> = {
  Maharashtra: 'MH', Gujarat: 'GJ', Karnataka: 'KA', 'Uttar Pradesh': 'UP', Rajasthan: 'RJ', 'Madhya Pradesh': 'MP',
  'West Bengal': 'WB', 'Tamil Nadu': 'TN', Delhi: 'DL', Telangana: 'TS',
}

export const OWNERS = ['Paras Dubey', 'Rohit Verma', 'Priya Nair', 'Meera Iyer', 'Arjun Sethi']

// first rows exactly as in the design
const HEAD: Omit<Franchise, 'owner' | 'updatedAt'>[] = [
  { id: 'FR-MH-00124', name: 'Shree Sai Financial Services', tier: 'Master', state: 'Maharashtra', city: 'Pune', atms: 24, kyc: 'Verified', status: 'Active' },
  { id: 'FR-GJ-00218', name: 'Patel Cash Solutions', tier: 'Franchise', state: 'Gujarat', city: 'Ahmedabad', atms: 8, kyc: 'Pending', status: 'Active' },
  { id: 'FR-KA-00076', name: 'Namma ATM Network', tier: 'Super Master', state: 'Karnataka', city: 'Bengaluru', atms: 68, kyc: 'Verified', status: 'Active' },
  { id: 'FR-UP-00305', name: 'Awadh Banking Point', tier: 'Franchise', state: 'Uttar Pradesh', city: 'Lucknow', atms: 6, kyc: 'In review', status: 'Active' },
  { id: 'FR-TN-00142', name: 'Southern Cash Services', tier: 'Master', state: 'Tamil Nadu', city: 'Chennai', atms: 32, kyc: 'Verified', status: 'Active' },
  { id: 'FR-RJ-00267', name: 'Pink City Finserve', tier: 'Franchise', state: 'Rajasthan', city: 'Jaipur', atms: 5, kyc: 'Pending', status: 'Inactive' },
  { id: 'FR-DL-00091', name: 'Capital ATM Partners', tier: 'Master', state: 'Delhi', city: 'New Delhi', atms: 18, kyc: 'Verified', status: 'Active' },
  { id: 'FR-WB-00183', name: 'Bengal Rural Payments', tier: 'Franchise', state: 'West Bengal', city: 'Kolkata', atms: 9, kyc: 'In review', status: 'Active' },
  { id: 'FR-MP-00312', name: 'Malwa Financial Network', tier: 'Franchise', state: 'Madhya Pradesh', city: 'Indore', atms: 7, kyc: 'Verified', status: 'Active' },
  { id: 'FR-TS-00156', name: 'Deccan Cash Connect', tier: 'Master', state: 'Telangana', city: 'Hyderabad', atms: 21, kyc: 'Verified', status: 'Active' },
]

const PREFIX = ['Shree', 'Sai', 'Om', 'Laxmi', 'Ganesh', 'Royal', 'Metro', 'City', 'Rural', 'Prime', 'Apex', 'Unity', 'Bharat', 'Jan', 'Sahyog', 'Kisan', 'Nagar', 'Gram', 'Swastik', 'Pragati']
const SUFFIX = ['Financial Services', 'Cash Point', 'ATM Services', 'Payments', 'Finserve', 'Money Centre', 'Banking Point', 'Cash Solutions', 'Enterprises', 'Network']

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function seedFranchises(): Franchise[] {
  const r = rng(11)
  const states = Object.keys(STATE_CODE)
  const used = new Set(HEAD.map((h) => h.id))
  const out: Franchise[] = []
  const base = new Date('2026-10-06T09:12:00+05:30').getTime()

  // tier quotas after the head rows: 24 / 186 / 1074
  const quota: Record<Tier, number> = { 'Super Master': 24, Master: 186, Franchise: 1074 }
  HEAD.forEach((h) => quota[h.tier]--)
  const tiers: Tier[] = []
    ; (Object.keys(quota) as Tier[]).forEach((t) => tiers.push(...Array(quota[t]).fill(t)))
  for (let i = tiers.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
      ;[tiers[i], tiers[j]] = [tiers[j], tiers[i]]
  }

  // KYC: 14 pending + 33 in review overall; 78 inactive overall (→ 1,206 active)
  const headPending = HEAD.filter((h) => h.kyc === 'Pending').length
  const headReview = HEAD.filter((h) => h.kyc === 'In review').length
  const headInactive = HEAD.filter((h) => h.status === 'Inactive').length
  let pending = 14 - headPending
  let review = 33 - headReview
  let inactive = 78 - headInactive

  HEAD.forEach((h, i) => out.push({ ...h, owner: OWNERS[0], updatedAt: new Date(base - i * 4.3 * 3600_000).toISOString() }))
  tiers.forEach((tier, i) => {
    const state = states[Math.floor(r() * states.length)]
    const cities = LOCATIONS[state].cities
    let id = ''
    do id = `FR-${STATE_CODE[state]}-${String(10 + Math.floor(r() * 99_000)).padStart(5, '0')}`
    while (used.has(id))
    used.add(id)
    const n = HEAD.length + i
    const kyc: KycStatus = pending > 0 && n % 27 === 3 ? (pending--, 'Pending') : review > 0 && n % 13 === 5 ? (review--, 'In review') : 'Verified'
    const status: FrStatus = inactive > 0 && n % 16 === 7 ? (inactive--, 'Inactive') : 'Active'
    const atms = tier === 'Super Master' ? 40 + Math.floor(r() * 60) : tier === 'Master' ? 12 + Math.floor(r() * 30) : 2 + Math.floor(r() * 10)
    out.push({
      id,
      name: `${PREFIX[Math.floor(r() * PREFIX.length)]} ${SUFFIX[Math.floor(r() * SUFFIX.length)]}`,
      tier,
      state,
      city: cities[Math.floor(r() * cities.length)],
      atms,
      kyc,
      status,
      owner: OWNERS[n % OWNERS.length],
      updatedAt: new Date(base - n * 1.9 * 3600_000).toISOString(),
    })
  })
  return out
}

export const franchiseStore = createStore<Franchise[]>('dexter.franchises.v1', seedFranchises)
export const useFranchises = () => franchiseStore.use()
export const getFranchise = (id: string) => franchiseStore.get().find((f) => f.id === id)

export function updateFranchises(ids: string[], patch: Partial<Franchise>) {
  const now = new Date().toISOString()
  franchiseStore.set((list) => list.map((f) => (ids.includes(f.id) ? { ...f, ...patch, updatedAt: now } : f)))
}

export function addFranchise(input: Pick<Franchise, 'name' | 'tier' | 'state' | 'city' | 'atms'>): Franchise {
  const list = franchiseStore.get()
  const used = new Set(list.map((f) => f.id))
  let n = 312
  let id = ''
  do id = `FR-${STATE_CODE[input.state] ?? 'XX'}-${String(++n).padStart(5, '0')}`
  while (used.has(id))
  const fr: Franchise = { ...input, id, kyc: 'Pending', status: 'Active', owner: 'Paras Dubey', updatedAt: new Date().toISOString() }
  franchiseStore.set([fr, ...list])
  return fr
}

// ── Dossier (the WLA application form attached to each franchise) ─────────
/** Dossier-only fields shown in the Figma dossier but not captured by the onboarding wizard. */
export type DossierForm = ApplicationForm & {
  permanentMeter: string // "Permanent meter detail" (35)
  siteSourcedBy: string // Office use · "Site Sourced By"
}

export const dossierStore = createStore<Record<string, Partial<DossierForm>>>('dexter.dossiers.v1', () => ({}))

export const RBI_LABEL: Record<string, string> = {
  'Tier 1': 'Metropolitan', 'Tier 2': 'Urban', 'Tier 3': 'Semi-urban', 'Tier 4': 'Semi-urban', 'Tier 5': 'Rural', 'Tier 6': 'Rural',
}

export const DOC_SEED: [string, number][] = [
  ['', 0],
  ['PAN_•••4821.pdf', 218_000],
  ['Aadhar_•••6942.pdf', 412_000],
  ['Cancelled_cheque_•••4821.pdf', 184_000],
  ['Bank_statement_Apr–Sep_2026.pdf', 1_240_000],
  ['GST_certificate_•••7Z2.pdf', 326_000],
  ['Shop_establishment_certificate.pdf', 296_000],
  ['', 0],
]

/** Seed dossier for a franchise (FR-MH-00124 carries the exact Figma values). */
export function seedDossier(fr: Franchise): DossierForm {
  const circle = LOCATIONS[fr.state]?.circles[0] ?? ''
  const demo = fr.id === 'FR-MH-00124'
  const word = fr.name.split(' ')[0]
  const code = STATE_CODE[fr.state] ?? 'XX'
  const city2 = fr.city.slice(0, 2).toUpperCase()
  const atm = (atmId: string, bank: string, siteType: 'Onsite' | 'Offsite', distance: string, direction: string, avgTxn: string) => ({ atmId, bank, siteType, distance, direction, avgTxn })
  const cc = fr.city.slice(0, 2).toUpperCase()
  return {
    ...emptyForm(),
    siteName: demo ? 'Shree Sai · Kothrud Market' : `${word} · ${fr.city} Main Road`,
    state: fr.state,
    city: fr.city,
    circle: demo ? 'West / Pune Circle' : circle,
    district: fr.city,
    pinCode: demo ? '411038' : '400001',
    landmark: demo ? 'Near Kothrud bus depot' : 'Near main market',
    rbiCategory: 'Tier 1',
    siteAddress: demo ? 'Shop 4, Sai Plaza, Paud Road, Kothrud, Pune, Maharashtra – 411038' : `Shop 2, Market Complex, ${fr.city}, ${fr.state}`,
    latitude: '18.5074',
    longitude: '73.8077',
    siteType: 'Full Shop',
    tisType: 'Full TIS',
    projectType: 'WLA Franchise Model',
    businessType: 'Financial services & retail banking',
    plan: 'Sapphire',
    existingAtmId: 'Not assigned · Proposed new site',
    franchiseName: fr.name,
    nameOnCheque: fr.name,
    contactNumber: '98220 41421',
    alternateNumber: '97310 52638',
    email: demo ? 'operations@shreesai.example' : `operations@${word.toLowerCase()}.example`,
    corrAddress: demo ? 'Office 12, Sai Plaza, Paud Road, Kothrud, Pune' : `Office 2, Market Complex, ${fr.city}`,
    corrLandmark: demo ? 'Near Kothrud bus depot' : 'Near main market',
    corrDistrict: fr.city,
    corrState: fr.state,
    corrPin: demo ? '411038' : '400001',
    bankName: 'HDFC Bank',
    branchName: demo ? 'Kothrud, Pune' : `${fr.city} Main Branch`,
    accountNumber: '50100293124821',
    ifsc: 'HDFC0000821',
    shopOwnerName: demo ? 'Prakash Deshmukh' : 'Rahul Mehta',
    shopOwnerNumber: '98450 63706',
    totalArea: '240',
    offeredArea: '120',
    carpetArea: '108',
    depth: '12',
    width: '10',
    height: '10',
    totalFrontage: '20',
    frontageOffered: '10',
    lSignage: 'Yes',
    vsat: 'Yes',
    acOdu: 'Yes',
    powerAvailable: 'Yes',
    meterType: 'Permanent',
    meterDetail: 'Single phase · 230 V · 32 A · 5 kW',
    permanentMeter: demo ? 'Dedicated MSEDCL meter · 170207316' : 'Dedicated DISCOM meter · 170207316',
    powerHours: '24',
    signageWidth: '10',
    signageHeight: '3',
    shopStatus: 'Rented',
    shutter: 'Yes',
    craCoverage: 'Yes',
    craAgency: `CMS Info Systems · ${fr.city}`,
    proposedBranch: demo ? 'HDFC Bank · Kothrud, Pune' : `HDFC Bank · ${fr.city}`,
    branchManager: 'Rohit Kulkarni',
    branchManagerNumber: '98230 77512',
    solIfsc: 'SOL 0821 / HDFC0000821',
    branchDistance: '0.6',
    nearestAtms: [
      atm(`SBI-${cc}-1824`, 'State Bank of India', 'Onsite', '0.4', 'East', '185'),
      atm(`HDF-${cc}-0832`, 'HDFC Bank', 'Offsite', '0.6', 'North-east', '160'),
      atm(`ICI-${cc}-0291`, 'ICICI Bank', 'Offsite', '0.9', 'West', '145'),
      atm(`AXI-${cc}-0146`, 'Axis Bank', 'Onsite', '1.2', 'South', '125'),
      atm(`BOB-${cc}-0618`, 'Bank of Baroda', 'Offsite', '1.5', 'North', '110'),
    ].map((a) => (demo ? { ...a, atmId: a.atmId.replace(`-${cc}-`, '-PN-') } : a)),
    hitachiAtms: [
      atm(`HIT-${cc}-1042`, 'Hitachi Money Spot', 'Offsite', '1.8', 'South-east', '135'),
      atm(`HIT-${cc}-1187`, 'Hitachi Money Spot', 'Offsite', '2.4', 'West', '120'),
    ].map((a) => (demo ? { ...a, atmId: a.atmId.replace(`-${cc}-`, '-PN-') } : a)),
    documents: DOC_SEED.map(([name, size]) => (name ? { status: 'Yes', file: { name, size } } : { status: 'No', file: null })),
    siteNumber: demo ? 'WLA-MH-PN-0264' : `WLA-${code}-${city2}-0264`,
    sourcedBy: 'SSE: Amit Patil (EMP-0418)  /  SSM: Neha Joshi (EMP-0206)',
    siteSourcedBy: 'Amit Patil · West Region SSE',
    sourcingCode: 'SRC-WEST-2026-0842',
  }
}

export function dossierFor(fr: Franchise): DossierForm {
  return { ...seedDossier(fr), ...dossierStore.get()[fr.id] }
}

export function saveDossier(id: string, form: DossierForm) {
  dossierStore.set((m) => ({ ...m, [id]: form }))
  updateFranchises([id], {})
}

// ── SD (security deposit) payments ───────────────────────────────────────
export type SdPayment = {
  id: string
  siteId: string
  atmId: string
  franchiseeName: string
  franchiseeNo: string
  cashLiveDate: string
  hpyAccount: string
  paymentType: '' | 'NEFT' | 'RTGS' | 'IMPS'
  paymentDate: string
  transferTime: string
  txnNumber: string
  amount: string
  frBankName: string
  accountHolder: string
  frAccount: string
  frIfsc: string
}

export const SD_PAYMENT_TYPES = ['NEFT', 'RTGS', 'IMPS']

export const sdStore = createStore<Record<string, SdPayment[]>>('dexter.sd.v1', () => ({}))

export function sdFor(fr: Franchise): SdPayment[] {
  const saved = sdStore.get()[fr.id]
  if (saved) return saved
  return [
    {
      id: `${fr.id}-SD-1`,
      siteId: `ST-${STATE_CODE[fr.state] ?? 'XX'}-${fr.city.slice(0, 3).toUpperCase()}-${fr.id.slice(-5)}`,
      atmId: `DX-${STATE_CODE[fr.state] ?? 'XX'}-01482`,
      franchiseeName: fr.name,
      franchiseeNo: '98220 41765',
      cashLiveDate: '',
      hpyAccount: '',
      paymentType: 'NEFT',
      paymentDate: '',
      transferTime: '',
      txnNumber: '',
      amount: '250000',
      frBankName: 'HDFC Bank',
      accountHolder: fr.name,
      frAccount: '50200012347316',
      frIfsc: 'HDFC0001234',
    },
  ]
}

export function saveSd(id: string, rows: SdPayment[]) {
  sdStore.set((m) => ({ ...m, [id]: rows }))
}

export const inr = (v: string | number) => {
  const n = Number(v)
  return v === '' || Number.isNaN(n) ? '' : `₹ ${n.toLocaleString('en-IN')}`
}
