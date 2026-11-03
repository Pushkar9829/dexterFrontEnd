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
  // ── Master & Super Master Franchise Application (Sections A - L) ────────
  // Section A. Franchise & Territory
  masterFranchiseId: string
  partnerId: string
  franchiseCategory: 'Super Master Franchise' | 'Master Franchise' | 'Franchise' | ''
  territoryType: string
  regionZone: string
  tehsilBlock: string
  proposedOperationalTerritory: string
  territoryExclusivity: string
  applicationSource: string
  referredBy: string
  existingDexterFranchiseId: string

  // Section B. Business & Legal Entity
  applicantType: string
  legalBusinessName: string
  tradeNameDba: string
  businessTypeNature: string
  dateOfIncorporation: string
  pan: string
  gstin: string
  cinLlpinRegNo: string
  registeredOfficeAddress: string
  businessWebsite: string
  businessEmail: string
  businessMobile: string
  alternateBusinessContact: string

  // Section C. Applicant / Authorized Person
  applicantAuthorizedPersonName: string
  fatherSpouseName: string
  designation: string
  dob: string
  gender: string
  maritalStatus: string
  personalMobile: string
  personalEmail: string
  educationalQualification: string
  computerLiteracy: YesNo
  computerQualificationSkills: string
  languagesKnown: string[]
  financialServicesExp: YesNo
  financialServicesExpDetails: string
  yearsOfBusinessExperience: string

  // Section D. Address & Location
  registeredPermanentAddress: string
  commSameAsPermanent: YesNo
  communicationAddress: string
  villageTownLocality: string
  postOffice: string
  tehsil: string
  policeStation: string
  cityDistrict: string
  addressState: string
  residenceTelephone: string
  officeTelephone: string
  yearsOfResidence: string

  // Section E. Office Infrastructure & Investment
  officeOwnership: string
  officeAddress: string
  officeSpaceDetails: string
  computerAvailable: YesNo
  laptopAvailable: YesNo
  printerAvailable: YesNo
  powerBackupAvailable: YesNo
  internetConnectivityAvailable: YesNo
  otherInfrastructure: string
  investmentCapacity: string
  existingBusinessOccupation: string
  estimatedMonthlyBusinessIncome: string

  // Section F. KYC & Supporting Documents
  panCardDoc: FileRef
  aadhaarDoc: FileRef
  addressProofDoc: FileRef
  businessRegProofDoc: FileRef
  gstCertificateDoc: FileRef
  authorizedSignatoryProofDoc: FileRef
  officeAddressProofDoc: FileRef
  applicantSignatureDoc: FileRef
  additionalKycDocs: { name: string; size: number }[]
  kycVerificationStatus: string
  kycVerificationRemarks: string

  // Section G. Bank & Payment Account
  beneficiaryName: string
  bankAccountNumber: string
  confirmBankAccountNumber: string
  ifscCode: string
  accountType: string
  chequeFacility: string
  bankStatementDoc: FileRef
  cancelledChequeDoc: FileRef
  bankAccountVerificationStatus: string

  // Section H. References & Background Verification
  ref1Name: string
  ref1FatherSpouse: string
  ref1Relationship: string
  ref1Designation: string
  ref1Mobile: string
  ref1Email: string
  ref1Address: string
  ref1Status: string
  ref1Remarks: string
  ref2Name: string
  ref2FatherSpouse: string
  ref2Relationship: string
  ref2Designation: string
  ref2Mobile: string
  ref2Email: string
  ref2Address: string
  ref2Status: string
  ref2Remarks: string
  policeVerificationRequired: YesNo
  backgroundVerificationStatus: string

  // Section I. Agreement, Declaration & Consent
  declarationInfoAccuracy: boolean
  declarationKycConsent: boolean
  declarationDataProcessingConsent: boolean
  agreementTermsAccepted: boolean
  masterFranchiseAgreementDoc: FileRef
  declarationPlace: string
  declarationDate: string
  signatoryName: string
  signatorySignatureDoc: FileRef
  companySealDoc: FileRef

  // Section J. Application Fee / Payment
  paymentRequired: YesNo
  paymentPurpose: string
  paymentMode: string
  paymentBankName: string
  paymentDate: string
  paymentAmount: string
  paymentRefNumber: string
  paymentProofDoc: FileRef
  paymentVerificationStatus: string
  paymentVerificationRemarks: string

  // Section K. Internal Approval & ERP Account
  recommendedBy: string
  recommenderEmployeeId: string
  recommenderContact: string
  salesRemarks: string
  kycCheckedBy: string
  kycCheckedDate: string
  businessApprovalBy: string
  financeApprovalBy: string
  finalApprovalAuthority: string
  finalDecision: string
  rejectionReason: string
  dexterErpUserId: string
  franchiseLoginStatus: string
  franchiseActivationDate: string
  territoryMappingStatus: string
  recordCreatedByDate: string
  recordApprovedByDate: string
  finalAuthorizationByDate: string

  // Section L. Final Submission Checklist
  chkApplicationComplete: YesNo
  chkBusinessLegalVerified: YesNo | 'N/A'
  chkIdentityAddressVerified: YesNo
  chkBankDetailsVerified: YesNo
  chkSupportingDocsUploaded: YesNo
  chkReferenceBgVerified: YesNo | 'N/A'
  chkAgreementExecuted: YesNo | 'N/A'
  chkPaymentVerified: YesNo | 'N/A'
  chkTerritoryApproved: YesNo
  chkFinalApprovalCompleted: YesNo
  submissionStatus: string
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

export const FRANCHISE_CATEGORIES = ['Super Master Franchise', 'Master Franchise'] as const
export const TERRITORY_TYPES = ['State', 'Region / Zone', 'District', 'Tehsil / Block'] as const
export const TERRITORY_EXCLUSIVITIES = ['Exclusive', 'Non-exclusive', 'As per Agreement'] as const
export const APPLICATION_SOURCES = ['Direct', 'Employee', 'Vendor', 'Referral', 'Other'] as const
export const APPLICANT_TYPES_OPTIONS = ['Individual', 'Proprietorship', 'Partnership', 'LLP', 'Pvt. Ltd.', 'Public Ltd.', 'HUF', 'Other'] as const
export const BUSINESS_NATURES = [
  'Financial Services & ATM Operations',
  'Retail Banking & Banking Correspondent (BC) Network',
  'Cash Management & Logistics',
  'Distribution & Telecom Services',
  'FMCG & Retail Operations',
  'Information Technology & Professional Services',
  'Other'
] as const
export const QUALIFICATIONS = ['Below Class X', 'Class X', 'Class XII', 'Graduate', 'Postgraduate and Above'] as const
export const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to disclose'] as const
export const MARITAL_STATUS_OPTIONS = ['Married', 'Single', 'Divorced', 'Widowed'] as const
export const LANGUAGES_LIST = ['Hindi', 'English', 'Marathi', 'Gujarati', 'Kannada', 'Tamil', 'Telugu', 'Bengali', 'Punjabi', 'Odia'] as const
export const OFFICE_OWNERSHIPS = ['Own', 'Rented', 'Shared'] as const
export const INVESTMENT_RANGES = [
  '₹15 Lakhs – ₹25 Lakhs',
  '₹25 Lakhs – ₹50 Lakhs',
  '₹50 Lakhs – ₹1 Crore',
  '₹1 Crore – ₹2.5 Crores',
  'Above ₹2.5 Crores'
] as const
export const INCOME_RANGES = [
  'Below ₹1 Lakh',
  '₹1 Lakh – ₹2.5 Lakhs',
  '₹2.5 Lakhs – ₹5 Lakhs',
  '₹5 Lakhs – ₹10 Lakhs',
  'Above ₹10 Lakhs'
] as const
export const KYC_VERIFICATION_STATUSES = ['Pending', 'Verified', 'Rejected', 'Resubmission Required'] as const
export const BANK_ACCOUNT_TYPES = ['Current', 'Savings', 'Other'] as const
export const CHEQUE_FACILITY_OPTIONS = ['Available', 'Not Available'] as const
export const PAYMENT_PURPOSES = [
  'Master Franchise License Fee',
  'Super Master Franchise License Fee',
  'Security Deposit (Refundable)',
  'Territory Processing Fee',
  'Onboarding & Tech Setup Kit'
] as const
export const PAYMENT_MODES = ['NEFT / RTGS', 'UPI', 'Cheque', 'Demand Draft', 'Net Banking', 'Other'] as const
export const INTERNAL_DECISION_OPTIONS = ['Approved', 'Rejected', 'On Hold', 'Resubmission Required'] as const
export const FRANCHISE_LOGIN_STATUSES = ['Active', 'Inactive', 'Not Created', 'Suspended'] as const
export const TERRITORY_MAPPING_STATUSES = ['Pending', 'Mapped', 'Verified'] as const
export const SUBMISSION_STATUS_OPTIONS = ['Draft', 'Submitted', 'Returned', 'Completed'] as const


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
    // Master Franchise initial values
    masterFranchiseId: '',
    partnerId: '',
    franchiseCategory: '',
    territoryType: 'District',
    regionZone: '',
    tehsilBlock: '',
    proposedOperationalTerritory: '',
    territoryExclusivity: 'Exclusive',
    applicationSource: 'Direct',
    referredBy: '',
    existingDexterFranchiseId: '',
    applicantType: 'Pvt. Ltd.',
    legalBusinessName: '',
    tradeNameDba: '',
    businessTypeNature: 'Financial Services & ATM Operations',
    dateOfIncorporation: '',
    pan: '',
    gstin: '',
    cinLlpinRegNo: '',
    registeredOfficeAddress: '',
    businessWebsite: '',
    businessEmail: '',
    businessMobile: '',
    alternateBusinessContact: '',
    applicantAuthorizedPersonName: '',
    fatherSpouseName: '',
    designation: 'Managing Director',
    dob: '',
    gender: '',
    maritalStatus: '',
    personalMobile: '',
    personalEmail: '',
    educationalQualification: 'Graduate',
    computerLiteracy: 'Yes',
    computerQualificationSkills: '',
    languagesKnown: ['Hindi', 'English'],
    financialServicesExp: 'Yes',
    financialServicesExpDetails: '',
    yearsOfBusinessExperience: '',
    registeredPermanentAddress: '',
    commSameAsPermanent: 'Yes',
    communicationAddress: '',
    villageTownLocality: '',
    postOffice: '',
    tehsil: '',
    policeStation: '',
    cityDistrict: '',
    addressState: '',
    residenceTelephone: '',
    officeTelephone: '',
    yearsOfResidence: '',
    officeOwnership: 'Own',
    officeAddress: '',
    officeSpaceDetails: '',
    computerAvailable: 'Yes',
    laptopAvailable: 'Yes',
    printerAvailable: 'Yes',
    powerBackupAvailable: 'Yes',
    internetConnectivityAvailable: 'Yes',
    otherInfrastructure: '',
    investmentCapacity: '₹50 Lakhs – ₹1 Crore',
    existingBusinessOccupation: '',
    estimatedMonthlyBusinessIncome: '₹2.5 Lakhs – ₹5 Lakhs',
    panCardDoc: null,
    aadhaarDoc: null,
    addressProofDoc: null,
    businessRegProofDoc: null,
    gstCertificateDoc: null,
    authorizedSignatoryProofDoc: null,
    officeAddressProofDoc: null,
    applicantSignatureDoc: null,
    additionalKycDocs: [],
    kycVerificationStatus: 'Pending',
    kycVerificationRemarks: '',
    beneficiaryName: '',
    bankAccountNumber: '',
    confirmBankAccountNumber: '',
    ifscCode: '',
    accountType: 'Current',
    chequeFacility: 'Available',
    bankStatementDoc: null,
    cancelledChequeDoc: null,
    bankAccountVerificationStatus: 'Pending',
    ref1Name: '',
    ref1FatherSpouse: '',
    ref1Relationship: '',
    ref1Designation: '',
    ref1Mobile: '',
    ref1Email: '',
    ref1Address: '',
    ref1Status: 'Pending',
    ref1Remarks: '',
    ref2Name: '',
    ref2FatherSpouse: '',
    ref2Relationship: '',
    ref2Designation: '',
    ref2Mobile: '',
    ref2Email: '',
    ref2Address: '',
    ref2Status: 'Pending',
    ref2Remarks: '',
    policeVerificationRequired: 'Yes',
    backgroundVerificationStatus: 'Pending',
    declarationInfoAccuracy: false,
    declarationKycConsent: false,
    declarationDataProcessingConsent: false,
    agreementTermsAccepted: false,
    masterFranchiseAgreementDoc: null,
    declarationPlace: '',
    declarationDate: new Date().toISOString().slice(0, 10),
    signatoryName: '',
    signatorySignatureDoc: null,
    companySealDoc: null,
    paymentRequired: 'Yes',
    paymentPurpose: 'Master Franchise License Fee',
    paymentMode: 'NEFT / RTGS',
    paymentBankName: '',
    paymentDate: '',
    paymentAmount: '',
    paymentRefNumber: '',
    paymentProofDoc: null,
    paymentVerificationStatus: 'Pending',
    paymentVerificationRemarks: '',
    recommendedBy: '',
    recommenderEmployeeId: '',
    recommenderContact: '',
    salesRemarks: '',
    kycCheckedBy: '',
    kycCheckedDate: '',
    businessApprovalBy: '',
    financeApprovalBy: '',
    finalApprovalAuthority: '',
    finalDecision: 'Approved',
    rejectionReason: '',
    dexterErpUserId: '',
    franchiseLoginStatus: 'Active',
    franchiseActivationDate: '',
    territoryMappingStatus: 'Mapped',
    recordCreatedByDate: '',
    recordApprovedByDate: '',
    finalAuthorizationByDate: '',
    chkApplicationComplete: 'Yes',
    chkBusinessLegalVerified: 'Yes',
    chkIdentityAddressVerified: 'Yes',
    chkBankDetailsVerified: 'Yes',
    chkSupportingDocsUploaded: 'Yes',
    chkReferenceBgVerified: 'Yes',
    chkAgreementExecuted: 'Yes',
    chkPaymentVerified: 'Yes',
    chkTerritoryApproved: 'Yes',
    chkFinalApprovalCompleted: 'Yes',
    submissionStatus: 'Draft',
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
    const isMaster = type === 'Master Franchise' || type === 'Super Master Franchise'
    const code = state.slice(0, 2).toUpperCase()
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
      // Master & Super Master specific values
      masterFranchiseId: isMaster
        ? (type === 'Super Master Franchise' ? `SMF-${code}-${String(100 + i).padStart(4, '0')}` : `MF-${code}-${String(200 + i).padStart(4, '0')}`)
        : '',
      partnerId: isMaster ? `PTN-2026-${String(100 + i)}` : '',
      franchiseCategory: (type === 'Master Franchise' || type === 'Super Master Franchise') ? type : '',
      territoryType: type === 'Super Master Franchise' ? 'State' : 'District',
      regionZone: LOCATIONS[state]?.circles[0] ?? `${city} Zone`,
      tehsilBlock: `${city} Central`,
      proposedOperationalTerritory: type === 'Super Master Franchise' ? `Entire State of ${state} (All Districts)` : `${city} District & Adjoining Tehsils`,
      territoryExclusivity: 'Exclusive',
      applicationSource: 'Direct',
      referredBy: '',
      existingDexterFranchiseId: '',
      applicantType: 'Pvt. Ltd.',
      legalBusinessName: `${firm} Pvt. Ltd.`,
      tradeNameDba: firm,
      businessTypeNature: 'Financial Services & ATM Operations',
      dateOfIncorporation: '2019-04-12',
      pan: 'AAACD5412K',
      gstin: '27AAACD5412K1Z9',
      cinLlpinRegNo: `U72900${code}2019PTC184201`,
      registeredOfficeAddress: `Office 402, Trade Hub, MG Road, ${city}, ${state} - 411001`,
      businessWebsite: `https://www.${domain}`,
      businessEmail: email,
      businessMobile: '98220 41421',
      alternateBusinessContact: '98220 41422',
      applicantAuthorizedPersonName: name,
      fatherSpouseName: 'Ramesh ' + name.split(' ')[1],
      designation: 'Managing Director',
      dob: '1984-06-15',
      gender: 'Male',
      maritalStatus: 'Married',
      personalMobile: '98220 41421',
      personalEmail: email,
      educationalQualification: 'Graduate',
      computerLiteracy: 'Yes',
      computerQualificationSkills: 'ERP Operations, Tally, Advanced Excel',
      languagesKnown: ['English', 'Hindi'],
      financialServicesExp: 'Yes',
      financialServicesExpDetails: '10+ years in retail banking correspondent networks & ATM site management',
      yearsOfBusinessExperience: '12',
      registeredPermanentAddress: `402, Trade Hub, MG Road, ${city}, ${state} - 411001`,
      commSameAsPermanent: 'Yes',
      communicationAddress: '',
      villageTownLocality: 'Central Market Area',
      postOffice: `${city} GPO`,
      tehsil: `${city} North`,
      policeStation: `${city} Central PS`,
      cityDistrict: city,
      addressState: state,
      residenceTelephone: '020-25418900',
      officeTelephone: '020-25418901',
      yearsOfResidence: '15',
      officeOwnership: 'Own',
      officeAddress: `402, Trade Hub, MG Road, ${city}, ${state} - 411001`,
      officeSpaceDetails: '850 sq.ft. commercial office with conference room & 8 workstations',
      computerAvailable: 'Yes',
      laptopAvailable: 'Yes',
      printerAvailable: 'Yes',
      powerBackupAvailable: 'Yes',
      internetConnectivityAvailable: 'Yes',
      otherInfrastructure: 'Biometric Access, CCTV Surveillance, Conference Projector',
      investmentCapacity: type === 'Super Master Franchise' ? '₹1 Crore – ₹2.5 Crores' : '₹50 Lakhs – ₹1 Crore',
      existingBusinessOccupation: 'Banking & Financial Distribution Services',
      estimatedMonthlyBusinessIncome: '₹5 Lakhs – ₹10 Lakhs',
      applicantPhoto: { name: 'applicant_photo.jpg', size: 142000 },
      panCardDoc: { name: 'pan_card.pdf', size: 218000 },
      aadhaarDoc: { name: 'aadhaar_card.pdf', size: 412000 },
      addressProofDoc: { name: 'electricity_bill.pdf', size: 310000 },
      businessRegProofDoc: { name: 'incorporation_certificate.pdf', size: 520000 },
      gstCertificateDoc: { name: 'gst_certificate.pdf', size: 326000 },
      authorizedSignatoryProofDoc: { name: 'board_resolution.pdf', size: 198000 },
      officeAddressProofDoc: { name: 'lease_deed.pdf', size: 840000 },
      applicantSignatureDoc: { name: 'authorized_signature.png', size: 64000 },
      additionalKycDocs: [{ name: 'audited_balance_sheet.pdf', size: 1420000 }],
      kycVerificationStatus: status === 'Approved' ? 'Verified' : 'Pending',
      kycVerificationRemarks: 'All primary identity and entity incorporation documents verified against MCA & NSDL.',
      beneficiaryName: `${firm} Pvt. Ltd.`,
      bankAccountNumber: '50200034182910',
      confirmBankAccountNumber: '50200034182910',
      ifscCode: 'HDFC0000821',
      accountType: 'Current',
      chequeFacility: 'Available',
      bankStatementDoc: { name: 'bank_statement_6m.pdf', size: 1240000 },
      cancelledChequeDoc: { name: 'cancelled_cheque.pdf', size: 280000 },
      bankAccountVerificationStatus: status === 'Approved' ? 'Verified' : 'Pending',
      ref1Name: 'Vikram Malhotra',
      ref1FatherSpouse: 'Suresh Malhotra',
      ref1Relationship: 'Business Associate / Vendor',
      ref1Designation: 'Regional VP, Apex Retail Solutions',
      ref1Mobile: '98230 11223',
      ref1Email: 'vikram.m@apexretail.in',
      ref1Address: `14/B, Commercial Enclave, ${city}`,
      ref1Status: 'Verified',
      ref1Remarks: 'Confirmed professional association and integrity.',
      ref2Name: 'Rajesh Singhania',
      ref2FatherSpouse: 'K. L. Singhania',
      ref2Relationship: 'Chartered Accountant / Advisor',
      ref2Designation: 'Senior Partner, Singhania & Co. CA',
      ref2Mobile: '98230 44556',
      ref2Email: 'rajesh@singhaniaca.com',
      ref2Address: `301, Finance Tower, ${city}`,
      ref2Status: 'Verified',
      ref2Remarks: 'Confirmed financial stability and tax compliance.',
      policeVerificationRequired: 'Yes',
      backgroundVerificationStatus: status === 'Approved' ? 'Clear' : 'Pending',
      declarationInfoAccuracy: true,
      declarationKycConsent: true,
      declarationDataProcessingConsent: true,
      agreementTermsAccepted: true,
      masterFranchiseAgreementDoc: { name: 'master_franchise_agreement_signed.pdf', size: 1840000 },
      declarationPlace: city,
      declarationDate: '2026-10-06',
      signatoryName: name,
      signatorySignatureDoc: { name: 'signatory_signature.png', size: 62000 },
      companySealDoc: { name: 'company_seal.png', size: 78000 },
      paymentRequired: 'Yes',
      paymentPurpose: type === 'Super Master Franchise' ? 'Super Master Franchise License Fee' : 'Master Franchise License Fee',
      paymentMode: 'NEFT / RTGS',
      paymentBankName: 'HDFC Bank',
      paymentDate: '2026-10-06',
      paymentAmount: type === 'Super Master Franchise' ? '500000' : '250000',
      paymentRefNumber: `UTR${1029384756 + i}`,
      paymentProofDoc: { name: 'payment_receipt.pdf', size: 312000 },
      paymentVerificationStatus: status === 'Approved' ? 'Verified' : 'Pending',
      paymentVerificationRemarks: 'Payment credited to Dexter WLA operations account.',
      recommendedBy: 'Amit Patil (Regional BD Manager)',
      recommenderEmployeeId: 'EMP-0418',
      recommenderContact: '98221 00192',
      salesRemarks: 'Strong financial background, proven network distribution capabilities and established commercial office.',
      kycCheckedBy: 'Meera Iyer (Compliance Officer)',
      kycCheckedDate: '2026-10-07',
      businessApprovalBy: 'Rohit Verma (Head of Franchise Operations)',
      financeApprovalBy: 'Paras Dubey (Finance Director)',
      finalApprovalAuthority: 'Franchise Governance Committee',
      finalDecision: status === 'Approved' ? 'Approved' : 'On Hold',
      rejectionReason: '',
      dexterErpUserId: `DXT-${code}-MF${String(100 + i)}`,
      franchiseLoginStatus: status === 'Approved' ? 'Active' : 'Inactive',
      franchiseActivationDate: status === 'Approved' ? '2026-10-08' : '',
      territoryMappingStatus: 'Mapped',
      recordCreatedByDate: 'System Admin · 2026-10-06 09:12',
      recordApprovedByDate: status === 'Approved' ? 'Rohit Verma · 2026-10-08 14:30' : '—',
      finalAuthorizationByDate: status === 'Approved' ? 'Authorized · 2026-10-08 16:00' : '—',
      chkApplicationComplete: 'Yes',
      chkBusinessLegalVerified: 'Yes',
      chkIdentityAddressVerified: 'Yes',
      chkBankDetailsVerified: 'Yes',
      chkSupportingDocsUploaded: 'Yes',
      chkReferenceBgVerified: 'Yes',
      chkAgreementExecuted: status === 'Approved' ? 'Yes' : 'No',
      chkPaymentVerified: status === 'Approved' ? 'Yes' : 'No',
      chkTerritoryApproved: 'Yes',
      chkFinalApprovalCompleted: status === 'Approved' ? 'Yes' : 'No',
      submissionStatus: status === 'Approved' ? 'Completed' : 'Submitted',
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
