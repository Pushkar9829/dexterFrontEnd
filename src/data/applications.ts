// WLA Franchise Application — data model + options + seed data (Figma Onboarding section).

export type ApplicantType = 'Franchise' | 'Master Franchise' | 'Super Master Franchise'
export type AppStatus = 'Draft' | 'Under review' | 'KYC pending' | 'Approved' | 'Rejected'
export type YesNo = 'Yes' | 'No' | ''

export type FileRef = { name: string; size: number } | null

export type AtmRow = { atmId: string; bank: string; siteType: '' | 'Onsite' | 'Offsite'; distance: string; direction: string; avgTxn: string }

export const DOCUMENTS = [
  'Power Point Presentation (PPT) (With below mentioned images)',
  'PAN Card',
  'Aadhar Card',
  'Pass-book/ cancel Cheque',
  'Six months Bank Statement of current or Saving A/c',
  'GST Certificate',
  'Other Business proof',
  'Rent Agreement Copy',
] as const

export const IMAGE_SLOTS = [
  'Front View of the shop',
  'Right view from ATM site',
  'Left view from ATM site',
  'Opposite view',
  'Right view from the road',
  'Left view from the road',
  'Internal view of the shop',
  'Complete view with shutter',
  'Terrace right view',
  'Terrace Left view',
  'Terrace opposite view',
  'Terrace Back view',
  'Terrace View (Space for V-SAT)',
  'Location from Google map',
  'Satellite view',
] as const

export type ApplicationForm = {
  // 1 · Site details
  siteName: string
  state: string
  city: string
  circle: string
  district: string
  pinCode: string
  landmark: string
  rbiCategory: string
  siteAddress: string
  latitude: string
  longitude: string
  siteType: string
  tisType: string
  projectType: string
  businessType: string
  plan: string
  existingAtmId: string
  applicantPhoto: FileRef
  // 2 · Franchise & bank
  franchiseName: string
  nameOnCheque: string
  contactNumber: string
  alternateNumber: string
  email: string
  corrAddress: string
  corrLandmark: string
  corrDistrict: string
  corrState: string
  corrPin: string
  bankName: string
  branchName: string
  accountNumber: string
  ifsc: string
  // 3 · Shop dimensions
  shopOwnerName: string
  shopOwnerNumber: string
  totalArea: string
  offeredArea: string
  carpetArea: string
  depth: string
  width: string
  height: string
  totalFrontage: string
  frontageOffered: string
  lSignage: YesNo
  vsat: YesNo
  acOdu: YesNo
  powerAvailable: YesNo
  meterType: '' | 'Permanent' | 'Temporary'
  meterDetail: string
  powerHours: string
  signageWidth: string
  signageHeight: string
  shopStatus: '' | 'Rented' | 'Owned'
  shutter: YesNo
  // 4 · CRA & ATMs
  craCoverage: YesNo
  craAgency: string
  proposedBranch: string
  branchManager: string
  branchManagerNumber: string
  solIfsc: string
  branchDistance: string
  nearestAtms: AtmRow[]
  hitachiAtms: AtmRow[]
  signature: FileRef
  // 5 · Documents
  documents: { status: YesNo; file: FileRef }[]
  // 6 · Images & office
  images: FileRef[]
  siteNumber: string
  sourcedBy: string
  sourcingCode: string
}

export type Application = {
  id: string
  applicantName: string
  applicantEmail: string
  type: ApplicantType
  status: AppStatus
  submittedAt: string // ISO
  updatedAt: string
  form: ApplicationForm
}

// ── options ───────────────────────────────────────────────────────────────
export const LOCATIONS: Record<string, { cities: string[]; circles: string[] }> = {
  Maharashtra: { cities: ['Pune', 'Mumbai', 'Nagpur', 'Nashik'], circles: ['Pune Zone', 'Mumbai Zone', 'Vidarbha Zone'] },
  Gujarat: { cities: ['Ahmedabad', 'Surat', 'Vadodara'], circles: ['Ahmedabad Zone', 'Surat Zone'] },
  Karnataka: { cities: ['Bengaluru', 'Mysuru', 'Hubballi'], circles: ['Bengaluru Zone', 'North Karnataka Zone'] },
  'Uttar Pradesh': { cities: ['Lucknow', 'Kanpur', 'Varanasi'], circles: ['Lucknow Zone', 'East UP Zone'] },
  Rajasthan: { cities: ['Jaipur', 'Jodhpur', 'Udaipur'], circles: ['Jaipur Zone', 'West Rajasthan Zone'] },
  'Madhya Pradesh': { cities: ['Indore', 'Bhopal', 'Gwalior'], circles: ['Indore Zone', 'Bhopal Zone'] },
  'West Bengal': { cities: ['Kolkata', 'Siliguri', 'Durgapur'], circles: ['Kolkata Zone', 'North Bengal Zone'] },
  'Tamil Nadu': { cities: ['Chennai', 'Coimbatore', 'Madurai'], circles: ['Chennai Zone', 'Kongu Zone'] },
  Delhi: { cities: ['New Delhi'], circles: ['Delhi Zone'] },
  Telangana: { cities: ['Hyderabad', 'Warangal'], circles: ['Hyderabad Zone'] },
}
export const STATES = Object.keys(LOCATIONS)
export const RBI_CATEGORIES = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5', 'Tier 6']
export const SITE_TYPES = ['Full Shop', 'Shop in Shop']
export const TIS_TYPES = ['Full TIS', 'SIS TIS', 'NO TIS']
export const PROJECT_TYPES = ['WLA Franchise Model']
export const BUSINESS_TYPES = ['Proprietorship', 'Partnership', 'Private Limited', 'LLP', 'Public Limited']
export const PLANS = ['Sapphire', 'Topaz', 'Emerald']
export const APPLICANT_TYPES: ApplicantType[] = ['Franchise', 'Master Franchise', 'Super Master Franchise']
export const STATUSES: AppStatus[] = ['Under review', 'KYC pending', 'Approved', 'Rejected', 'Draft']

const emptyAtm = (): AtmRow => ({ atmId: '', bank: '', siteType: '', distance: '', direction: '', avgTxn: '' })

export function emptyForm(): ApplicationForm {
  return {
    siteName: '', state: '', city: '', circle: '', district: '', pinCode: '', landmark: '', rbiCategory: '',
    siteAddress: '', latitude: '', longitude: '', siteType: '', tisType: '', projectType: 'WLA Franchise Model',
    businessType: '', plan: '', existingAtmId: '', applicantPhoto: null,
    franchiseName: '', nameOnCheque: '', contactNumber: '', alternateNumber: '', email: '', corrAddress: '',
    corrLandmark: '', corrDistrict: '', corrState: '', corrPin: '', bankName: '', branchName: '', accountNumber: '', ifsc: '',
    shopOwnerName: '', shopOwnerNumber: '', totalArea: '', offeredArea: '', carpetArea: '', depth: '', width: '', height: '',
    totalFrontage: '', frontageOffered: '', lSignage: '', vsat: '', acOdu: '', powerAvailable: '', meterType: '',
    meterDetail: '', powerHours: '', signageWidth: '', signageHeight: '', shopStatus: '', shutter: '',
    craCoverage: '', craAgency: '', proposedBranch: '', branchManager: '', branchManagerNumber: '', solIfsc: '',
    branchDistance: '', nearestAtms: Array.from({ length: 5 }, emptyAtm), hitachiAtms: Array.from({ length: 2 }, emptyAtm),
    signature: null,
    documents: DOCUMENTS.map(() => ({ status: '' as YesNo, file: null })),
    images: IMAGE_SLOTS.map(() => null),
    siteNumber: '', sourcedBy: '', sourcingCode: '',
  }
}

// ── seed: 248 applications matching the design's tab counts ──────────────
const PEOPLE = [
  ['Rahul Mehta', 'shreesai.in', 'Master Franchise', 'Shree Sai Financial Services', 'Maharashtra', 'Pune'],
  ['Priya Nair', 'nammanetwork.in', 'Franchise', 'Namma ATM Network', 'Karnataka', 'Bengaluru'],
  ['Vikram Patel', 'patelcash.in', 'Master Franchise', 'Patel Cash Solutions', 'Gujarat', 'Ahmedabad'],
  ['Sneha Kulkarni', 'deccanconnect.in', 'Franchise', 'Deccan Connect Services', 'Maharashtra', 'Nashik'],
  ['Arjun Singh', 'awadhbanking.in', 'Franchise', 'Awadh Banking Point', 'Uttar Pradesh', 'Lucknow'],
  ['Kavita Reddy', 'capitalatm.in', 'Super Master Franchise', 'Capital ATM Ventures', 'Telangana', 'Hyderabad'],
  ['Amit Desai', 'pinkcity.in', 'Franchise', 'Pink City Finserve', 'Rajasthan', 'Jaipur'],
  ['Neha Verma', 'malwanetwork.in', 'Master Franchise', 'Malwa Financial Network', 'Madhya Pradesh', 'Indore'],
  ['Rohit Banerjee', 'bengalrural.in', 'Franchise', 'Bengal Rural Payments', 'West Bengal', 'Kolkata'],
  ['Lakshmi Iyer', 'kaveriatm.in', 'Franchise', 'Kaveri ATM Services', 'Tamil Nadu', 'Chennai'],
  ['Suresh Yadav', 'gangapay.in', 'Master Franchise', 'Ganga Pay Point', 'Uttar Pradesh', 'Varanasi'],
  ['Pooja Shah', 'suratcash.in', 'Franchise', 'Surat Cash Hub', 'Gujarat', 'Surat'],
] as const

// first rows exactly as in the design, then a deterministic spread for the rest
const HEAD: AppStatus[] = ['Under review', 'KYC pending', 'Approved', 'Under review', 'Draft', 'Approved', 'Rejected', 'KYC pending']
const TARGET: Record<AppStatus, number> = { 'Under review': 42, 'KYC pending': 18, Approved: 156, Rejected: 12, Draft: 20 }

function seedStatuses(): AppStatus[] {
  const left = { ...TARGET }
  HEAD.forEach((s) => left[s]--)
  const pool: AppStatus[] = []
  ;(Object.keys(left) as AppStatus[]).forEach((s) => pool.push(...Array(left[s]).fill(s)))
  // deterministic shuffle
  let seed = 7
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280
    const j = Math.floor((seed / 233280) * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return [...HEAD, ...pool]
}

export function seedApplications(): Application[] {
  const statuses = seedStatuses()
  const start = new Date('2026-10-06T09:12:00+05:30').getTime()
  return statuses.map((status, i) => {
    const p = PEOPLE[i % PEOPLE.length]
    const [name, domain, type, firm, state, city] = p
    const at = new Date(start - i * 7.3 * 3600_000 - (i % 3) * 1_100_000).toISOString()
    const email = `${name.split(' ')[0].toLowerCase()}${i < PEOPLE.length ? '' : i}@${domain}`
    const form: ApplicationForm = {
      ...emptyForm(),
      siteName: `${firm} - ${city}`,
      state,
      city,
      district: city,
      circle: LOCATIONS[state]?.circles[0] ?? '',
      pinCode: '411001',
      landmark: 'Near MG Road, opposite City Mall',
      rbiCategory: 'Tier 1',
      siteAddress: `101, City Plaza, MG Road, ${city}`,
      latitude: '18.5204',
      longitude: '73.8567',
      siteType: 'Full Shop',
      tisType: 'Full TIS',
      businessType: 'Private Limited',
      plan: 'Sapphire',
      existingAtmId: 'Not applicable',
      franchiseName: firm,
      nameOnCheque: `${firm} Pvt. Ltd.`,
      contactNumber: '98765 43210',
      email,
      corrAddress: `101, City Plaza, MG Road, ${city}`,
      corrLandmark: 'Near MG Road, opposite City Mall',
      corrDistrict: city,
      corrState: state,
      corrPin: '411001',
      bankName: 'HDFC Bank',
      branchName: `MG Road, ${city}`,
      shopOwnerName: name,
      shopOwnerNumber: '98765 43210',
      totalArea: '240',
      offeredArea: '120',
      carpetArea: '110',
      depth: '12 ft',
      width: '10 ft',
      height: '10 ft',
      totalFrontage: '20 ft',
      frontageOffered: '10 ft',
      lSignage: 'Yes',
      vsat: 'Yes',
      acOdu: 'Yes',
      powerAvailable: 'Yes',
      meterType: 'Permanent',
      powerHours: '24',
      signageWidth: '10 ft',
      signageHeight: '3 ft',
      shopStatus: 'Owned',
      shutter: 'Yes',
    }
    return {
      id: `APP-2026-${String(248 - i).padStart(4, '0')}`,
      applicantName: name,
      applicantEmail: email,
      type: type as ApplicantType,
      status,
      submittedAt: at,
      updatedAt: at,
      form,
    }
  })
}
