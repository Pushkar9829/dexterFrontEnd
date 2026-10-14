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
