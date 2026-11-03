import type { ApplicationForm } from '@/data/applications'

export type Errors = Partial<Record<string, string>>

const PIN = /^\d{6}$/
const PHONE = /^[6-9]\d{9}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/i
const digits = (v: string) => v.replace(/\D/g, '')

export const STEP1_REQUIRED: (keyof ApplicationForm)[] = [
  'siteName', 'state', 'city', 'circle', 'district', 'pinCode', 'landmark', 'rbiCategory', 'siteAddress',
  'latitude', 'longitude', 'siteType', 'tisType', 'projectType', 'businessType', 'plan',
]

export function validateStep(step: number, f: ApplicationForm): Errors {
  const e: Errors = {}
  if (step === 1) {
    for (const k of STEP1_REQUIRED) if (!String(f[k] ?? '').trim()) e[k] = 'Required'
    if (!f.applicantPhoto) e.applicantPhoto = 'Upload the applicant photograph'
    if (f.pinCode && !PIN.test(f.pinCode)) e.pinCode = 'Enter a 6-digit pin code'
    const lat = Number(f.latitude)
    if (f.latitude && (Number.isNaN(lat) || lat < -90 || lat > 90)) e.latitude = 'Latitude must be between -90 and 90'
    const lng = Number(f.longitude)
    if (f.longitude && (Number.isNaN(lng) || lng < -180 || lng > 180)) e.longitude = 'Longitude must be between -180 and 180'
  }
  if (step === 2) {
    if (f.contactNumber && !PHONE.test(digits(f.contactNumber))) e.contactNumber = 'Enter a valid 10-digit number'
    if (f.alternateNumber && !PHONE.test(digits(f.alternateNumber))) e.alternateNumber = 'Enter a valid 10-digit number'
    if (f.email && !EMAIL.test(f.email)) e.email = 'Enter a valid email'
    if (f.corrPin && !PIN.test(f.corrPin)) e.corrPin = 'Enter a 6-digit pin code'
    if (f.ifsc && !IFSC.test(f.ifsc)) e.ifsc = 'IFSC looks like HDFC0001234'
    if (f.accountNumber && !/^\d{9,18}$/.test(f.accountNumber)) e.accountNumber = 'Account number is 9–18 digits'
  }
  if (step === 3) {
    if (f.shopOwnerNumber && !PHONE.test(digits(f.shopOwnerNumber))) e.shopOwnerNumber = 'Enter a valid 10-digit number'
    for (const k of ['totalArea', 'offeredArea', 'carpetArea', 'powerHours'] as const)
      if (f[k] && Number.isNaN(Number(f[k]))) e[k] = 'Enter a number'
    if (f.powerHours && (Number(f.powerHours) < 0 || Number(f.powerHours) > 24)) e.powerHours = 'Between 0 and 24'
    if (f.offeredArea && f.totalArea && Number(f.offeredArea) > Number(f.totalArea)) e.offeredArea = 'Cannot exceed total shop area'
  }
  if (step === 4) {
    if (f.branchManagerNumber && !PHONE.test(digits(f.branchManagerNumber))) e.branchManagerNumber = 'Enter a valid 10-digit number'
    if (f.branchDistance && Number.isNaN(Number(f.branchDistance))) e.branchDistance = 'Enter distance in KM'
  }
  return e
}

/** Review-card status chip for each step. */
export function stepStatus(step: number, f: ApplicationForm): { label: string; tone: 'green' | 'amber' | 'red' } {
  const filled = (ks: (keyof ApplicationForm)[]) => ks.filter((k) => String(f[k] ?? '').trim()).length
  switch (step) {
    case 1: {
      const missing = STEP1_REQUIRED.length - filled(STEP1_REQUIRED)
      if (missing > 0) return { label: 'Details pending', tone: 'amber' }
      return f.applicantPhoto ? { label: 'Complete', tone: 'green' } : { label: 'Photo pending', tone: 'amber' }
    }
    case 2: {
      const ks: (keyof ApplicationForm)[] = ['franchiseName', 'nameOnCheque', 'contactNumber', 'email', 'corrAddress', 'bankName', 'branchName', 'accountNumber', 'ifsc']
      const n = filled(ks)
      if (n === 0) return { label: 'Not entered', tone: 'red' }
      return n === ks.length ? { label: 'Complete', tone: 'green' } : { label: 'Details pending', tone: 'amber' }
    }
    case 3: {
      const ks: (keyof ApplicationForm)[] = ['shopOwnerName', 'totalArea', 'offeredArea', 'carpetArea', 'depth', 'width', 'height', 'powerAvailable', 'shopStatus']
      const n = filled(ks)
      if (n === 0) return { label: 'Not entered', tone: 'red' }
      if (f.meterType && !f.meterDetail.trim()) return { label: 'Meter detail pending', tone: 'amber' }
      return n === ks.length ? { label: 'Complete', tone: 'green' } : { label: 'Details pending', tone: 'amber' }
    }
    case 4: {
      const ks: (keyof ApplicationForm)[] = ['craCoverage', 'craAgency', 'proposedBranch', 'branchManager', 'branchManagerNumber', 'solIfsc', 'branchDistance']
      const n = filled(ks) + (f.signature ? 1 : 0)
      if (n === 0) return { label: 'Not entered', tone: 'red' }
      return n === ks.length + 1 ? { label: 'Complete', tone: 'green' } : { label: 'Details pending', tone: 'amber' }
    }
    case 5: {
      const n = f.documents.filter((d) => d.file).length
      return { label: `${n} of 8 uploaded`, tone: n === 8 ? 'green' : n ? 'amber' : 'red' }
    }
    case 6: {
      const n = f.images.filter(Boolean).length
      return { label: `${n} of 15 uploaded`, tone: n === 15 ? 'green' : n ? 'amber' : 'red' }
    }
  }
  return { label: '', tone: 'green' }
}

// ── Master & Super Master Franchise Validation ──────────────────────────────
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

export function validateMasterSection(sectionKey: string, f: ApplicationForm): Errors {
  const e: Errors = {}
  switch (sectionKey) {
    case 'A': {
      if (!f.franchiseName.trim()) e.franchiseName = 'Franchise Name is required'
      if (!f.territoryType) e.territoryType = 'Territory Type is required'
      if (!f.state) e.state = 'State is required'
      if (!f.district.trim()) e.district = 'District is required'
      if (!f.proposedOperationalTerritory.trim()) e.proposedOperationalTerritory = 'Proposed Operational Territory is required'
      if (!f.applicationSource) e.applicationSource = 'Application Source is required'
      if (['Employee', 'Vendor', 'Referral'].includes(f.applicationSource) && !f.referredBy.trim()) {
        e.referredBy = 'Referral source details required'
      }
      break
    }
    case 'B': {
      if (!f.applicantType) e.applicantType = 'Applicant Type is required'
      if (f.applicantType !== 'Individual' && !f.legalBusinessName.trim()) {
        e.legalBusinessName = 'Legal Business Name is required for business entities'
      }
      if (!f.businessTypeNature.trim()) e.businessTypeNature = 'Business nature is required'
      if (f.pan && !PAN_REGEX.test(f.pan.toUpperCase())) e.pan = 'Enter valid 10-character PAN (e.g. ABCDE1234F)'
      if (f.gstin && !GSTIN_REGEX.test(f.gstin.toUpperCase())) e.gstin = 'Enter valid 15-character GSTIN'
      if (!f.businessEmail.trim()) e.businessEmail = 'Business Email is required'
      else if (!EMAIL.test(f.businessEmail)) e.businessEmail = 'Enter a valid business email'
      if (!f.businessMobile.trim()) e.businessMobile = 'Business Mobile is required'
      else if (!PHONE.test(digits(f.businessMobile))) e.businessMobile = 'Enter a valid 10-digit mobile number'
      break
    }
    case 'C': {
      if (!f.applicantAuthorizedPersonName.trim()) e.applicantAuthorizedPersonName = 'Applicant Name is required'
      if (!f.personalMobile.trim()) e.personalMobile = 'Personal Mobile is required'
      else if (!PHONE.test(digits(f.personalMobile))) e.personalMobile = 'Enter a valid 10-digit mobile number'
      if (f.personalEmail && !EMAIL.test(f.personalEmail)) e.personalEmail = 'Enter a valid email address'
      break
    }
    case 'D': {
      if (!f.registeredPermanentAddress.trim()) e.registeredPermanentAddress = 'Permanent Address is required'
      if (f.commSameAsPermanent === 'No' && !f.communicationAddress.trim()) {
        e.communicationAddress = 'Communication address is required'
      }
      if (!f.cityDistrict.trim()) e.cityDistrict = 'City / District is required'
      if (!f.addressState) e.addressState = 'State is required'
      if (!f.pinCode.trim()) e.pinCode = 'PIN code is required'
      else if (!PIN.test(f.pinCode)) e.pinCode = 'Enter a valid 6-digit PIN code'
      break
    }
    case 'E': {
      if (!f.officeOwnership) e.officeOwnership = 'Office Ownership is required'
      if (!f.officeAddress.trim()) e.officeAddress = 'Office Address is required'
      if (!f.investmentCapacity) e.investmentCapacity = 'Investment Capacity is required'
      if (!f.existingBusinessOccupation.trim()) e.existingBusinessOccupation = 'Current Business / Occupation is required'
      break
    }
    case 'G': {
      if (!f.bankName) e.bankName = 'Bank Name is required'
      if (!f.branchName.trim()) e.branchName = 'Branch Name is required'
      if (!f.beneficiaryName.trim()) e.beneficiaryName = 'Beneficiary Name is required'
      if (!f.bankAccountNumber.trim()) e.bankAccountNumber = 'Bank Account Number is required'
      if (!f.confirmBankAccountNumber.trim()) e.confirmBankAccountNumber = 'Please confirm account number'
      else if (f.bankAccountNumber !== f.confirmBankAccountNumber) e.confirmBankAccountNumber = 'Account numbers do not match'
      if (!f.ifscCode.trim()) e.ifscCode = 'IFSC Code is required'
      else if (!IFSC.test(f.ifscCode)) e.ifscCode = 'IFSC format is HDFC0001234'
      if (!f.accountType) e.accountType = 'Account Type is required'
      break
    }
    case 'I': {
      if (!f.declarationInfoAccuracy) e.declarationInfoAccuracy = 'Accuracy declaration is mandatory'
      if (!f.declarationKycConsent) e.declarationKycConsent = 'KYC verification consent is mandatory'
      if (!f.agreementTermsAccepted) e.agreementTermsAccepted = 'Terms acceptance is mandatory before execution'
      if (!f.declarationPlace.trim()) e.declarationPlace = 'Declaration place is required'
      if (!f.declarationDate.trim()) e.declarationDate = 'Declaration date is required'
      if (!f.signatoryName.trim()) e.signatoryName = 'Authorized Signatory Name is required'
      break
    }
  }
  return e
}

export function masterSectionStatus(sectionKey: string, f: ApplicationForm): { label: string; tone: 'green' | 'amber' | 'red' | 'gray' } {
  const errs = validateMasterSection(sectionKey, f)
  if (Object.keys(errs).length > 0) return { label: 'Incomplete', tone: 'amber' }
  switch (sectionKey) {
    case 'A': return f.franchiseName ? { label: 'Complete', tone: 'green' } : { label: 'Pending', tone: 'gray' }
    case 'B': return f.legalBusinessName || f.pan ? { label: 'Verified', tone: 'green' } : { label: 'Pending', tone: 'gray' }
    case 'C': return f.applicantAuthorizedPersonName ? { label: 'Complete', tone: 'green' } : { label: 'Pending', tone: 'gray' }
    case 'D': return f.registeredPermanentAddress ? { label: 'Complete', tone: 'green' } : { label: 'Pending', tone: 'gray' }
    case 'E': return f.officeAddress ? { label: 'Configured', tone: 'green' } : { label: 'Pending', tone: 'gray' }
    case 'F': return (f.panCardDoc || f.applicantPhoto) ? { label: 'Docs Uploaded', tone: 'green' } : { label: 'Docs Pending', tone: 'amber' }
    case 'G': return f.bankAccountNumber ? { label: 'Bank Linked', tone: 'green' } : { label: 'Pending', tone: 'gray' }
    case 'H': return f.ref1Name ? { label: 'Recorded', tone: 'green' } : { label: 'Optional', tone: 'gray' }
    case 'I': return f.agreementTermsAccepted ? { label: 'Accepted', tone: 'green' } : { label: 'Consent Needed', tone: 'amber' }
    case 'J': return f.paymentRefNumber || f.paymentVerificationStatus === 'Verified' ? { label: 'Recorded', tone: 'green' } : { label: 'Pending', tone: 'gray' }
    case 'K': return f.finalDecision ? { label: f.finalDecision, tone: f.finalDecision === 'Approved' ? 'green' : 'amber' } : { label: 'Under Review', tone: 'gray' }
    case 'L': return f.submissionStatus === 'Completed' ? { label: 'Completed', tone: 'green' } : { label: 'Checklist Open', tone: 'amber' }
  }
  return { label: 'Pending', tone: 'gray' }
}
