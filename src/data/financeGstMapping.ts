import { createStore } from '@/lib/store'

export type GstRegistrationType =
  | 'Regular Taxpayer'
  | 'Composition Scheme'
  | 'SEZ Unit / Developer'
  | 'Consumer / Unregistered'

export type GstVerificationStatus =
  | 'Verified'
  | 'Pending Verification'
  | 'Discrepancy'
  | 'Suspended'

export type GstFilingFrequency = 'Monthly (GSTR-1 & 3B)' | 'Quarterly (QRMP Scheme)'

export interface FranchiseGstMapping {
  id: string
  franchiseId: string
  franchiseeName: string
  legalBusinessName: string
  tradeName: string
  gstin: string
  panNumber: string
  state: string
  stateCode: string
  registrationType: GstRegistrationType
  filingFrequency: GstFilingFrequency
  reverseChargeApplicable: 'Yes' | 'No'
  contactPerson: string
  contactPhone: string
  contactEmail: string
  registeredAddress: string
  city: string
  pincode: string
  effectiveDate: string
  verificationStatus: GstVerificationStatus
  certificateFileName?: string
  certificateFileSizeKb?: number
  lastAuditedDate?: string
  remarks?: string
  createdAt: string
  updatedAt: string
}

export const STATE_CODE_MAP: Record<string, { state: string; code: string }> = {
  '01': { state: 'Jammu and Kashmir', code: '01' },
  '02': { state: 'Himachal Pradesh', code: '02' },
  '03': { state: 'Punjab', code: '03' },
  '04': { state: 'Chandigarh', code: '04' },
  '05': { state: 'Uttarakhand', code: '05' },
  '06': { state: 'Haryana', code: '06' },
  '07': { state: 'Delhi', code: '07' },
  '08': { state: 'Rajasthan', code: '08' },
  '09': { state: 'Uttar Pradesh', code: '09' },
  '10': { state: 'Bihar', code: '10' },
  '19': { state: 'West Bengal', code: '19' },
  '20': { state: 'Jharkhand', code: '20' },
  '21': { state: 'Odisha', code: '21' },
  '22': { state: 'Chhattisgarh', code: '22' },
  '23': { state: 'Madhya Pradesh', code: '23' },
  '24': { state: 'Gujarat', code: '24' },
  '27': { state: 'Maharashtra', code: '27' },
  '29': { state: 'Karnataka', code: '29' },
  '32': { state: 'Kerala', code: '32' },
  '33': { state: 'Tamil Nadu', code: '33' },
  '36': { state: 'Telangana', code: '36' },
  '37': { state: 'Andhra Pradesh', code: '37' },
}

const SEED_MAPPINGS: FranchiseGstMapping[] = [
  {
    id: 'GSTM-001',
    franchiseId: 'FR-MH-00124',
    franchiseeName: 'Shree Sai Financial Services',
    legalBusinessName: 'Shree Sai Financial Services Pvt Ltd',
    tradeName: 'Sai ATM Solutions',
    gstin: '27AAKFS4821K1Z6',
    panNumber: 'AAKFS4821K',
    state: 'Maharashtra',
    stateCode: '27',
    registrationType: 'Regular Taxpayer',
    filingFrequency: 'Monthly (GSTR-1 & 3B)',
    reverseChargeApplicable: 'No',
    contactPerson: 'Suresh Patil',
    contactPhone: '+91 98220 41124',
    contactEmail: 'accounts@shreesai-atm.in',
    registeredAddress: 'Plot 14, Paud Road, Kothrud',
    city: 'Pune',
    pincode: '411038',
    effectiveDate: '2023-04-01',
    verificationStatus: 'Verified',
    certificateFileName: 'GST_Reg_Cert_FR-MH-00124.pdf',
    certificateFileSizeKb: 245,
    lastAuditedDate: '2026-10-15',
    remarks: 'Principal franchise partner in Pune Central. Fully compliant with GST e-invoicing.',
    createdAt: '2023-04-05T10:00:00Z',
    updatedAt: '2026-10-15T12:30:00Z',
  },
  {
    id: 'GSTM-002',
    franchiseId: 'FR-GJ-00218',
    franchiseeName: 'Patel Cash Solutions',
    legalBusinessName: 'Patel Cash Solutions LLP',
    tradeName: 'Apex Cash Express',
    gstin: '24AAPFP7310R1Z2',
    panNumber: 'AAPFP7310R',
    state: 'Gujarat',
    stateCode: '24',
    registrationType: 'Regular Taxpayer',
    filingFrequency: 'Monthly (GSTR-1 & 3B)',
    reverseChargeApplicable: 'No',
    contactPerson: 'Bhavin Patel',
    contactPhone: '+91 98250 21867',
    contactEmail: 'bhavin@patelcash.in',
    registeredAddress: 'Apex Chambers, CG Road, Navrangpura',
    city: 'Ahmedabad',
    pincode: '380009',
    effectiveDate: '2023-08-15',
    verificationStatus: 'Verified',
    certificateFileName: 'GST_Cert_24AAPFP7310R1Z2.pdf',
    certificateFileSizeKb: 310,
    lastAuditedDate: '2026-09-28',
    remarks: 'Gujarat regional hub master GST registration. Verified on GST portal.',
    createdAt: '2023-08-16T11:15:00Z',
    updatedAt: '2026-09-28T14:20:00Z',
  },
  {
    id: 'GSTM-003',
    franchiseId: 'FR-KA-00076',
    franchiseeName: 'Namma ATM Network',
    legalBusinessName: 'Namma ATM Network Private Limited',
    tradeName: 'Namma Cash Point',
    gstin: '29AADCN5562L1ZQ',
    panNumber: 'AADCN5562L',
    state: 'Karnataka',
    stateCode: '29',
    registrationType: 'Regular Taxpayer',
    filingFrequency: 'Monthly (GSTR-1 & 3B)',
    reverseChargeApplicable: 'No',
    contactPerson: 'Chandrashekar Rao',
    contactPhone: '+91 98450 07612',
    contactEmail: 'finance@namma-atm.com',
    registeredAddress: '#44, 11th Main, 4th Block, Jayanagar',
    city: 'Bengaluru',
    pincode: '560011',
    effectiveDate: '2024-01-10',
    verificationStatus: 'Verified',
    certificateFileName: 'GST_REG_06_NammaATM.pdf',
    certificateFileSizeKb: 198,
    lastAuditedDate: '2026-10-02',
    remarks: 'White label ATM operations across South Zone. QRMP not applicable.',
    createdAt: '2024-01-12T09:30:00Z',
    updatedAt: '2026-10-02T16:00:00Z',
  },
  {
    id: 'GSTM-004',
    franchiseId: 'FR-UP-00305',
    franchiseeName: 'Awadh Banking Point',
    legalBusinessName: 'Awadh Banking Point Services',
    tradeName: 'Awadh DigiPay Solutions',
    gstin: '09ABEFA9024M1Z8',
    panNumber: 'ABEFA9024M',
    state: 'Uttar Pradesh',
    stateCode: '09',
    registrationType: 'Regular Taxpayer',
    filingFrequency: 'Monthly (GSTR-1 & 3B)',
    reverseChargeApplicable: 'No',
    contactPerson: 'Ranjeet Pal',
    contactPhone: '+91 94150 30518',
    contactEmail: 'ranjeet.pal@awadhbanking.in',
    registeredAddress: 'Station Road, Mainpuri',
    city: 'Mainpuri',
    pincode: '205001',
    effectiveDate: '2024-03-22',
    verificationStatus: 'Verified',
    certificateFileName: 'GST_Reg_09ABEFA9024M1Z8.pdf',
    certificateFileSizeKb: 280,
    lastAuditedDate: '2026-10-20',
    remarks: 'Master Franchisee for Central UP Zone. GST matched with PAN.',
    createdAt: '2024-03-25T14:45:00Z',
    updatedAt: '2026-10-20T11:10:00Z',
  },
  {
    id: 'GSTM-005',
    franchiseId: 'FR-WB-00183',
    franchiseeName: 'Bengal Rural Payments',
    legalBusinessName: 'Bengal Rural Payments Private Limited',
    tradeName: 'Bengal Gramin Pay',
    gstin: '19AAJFB2219C1ZK',
    panNumber: 'AAJFB2219C',
    state: 'West Bengal',
    stateCode: '19',
    registrationType: 'Regular Taxpayer',
    filingFrequency: 'Quarterly (QRMP Scheme)',
    reverseChargeApplicable: 'No',
    contactPerson: 'Subhashish Ghosh',
    contactPhone: '+91 94330 18307',
    contactEmail: 'subhashish@bengalrural.in',
    registeredAddress: '12 Rabindra Sarani, Station Road',
    city: 'Nadia',
    pincode: '741101',
    effectiveDate: '2024-06-01',
    verificationStatus: 'Pending Verification',
    certificateFileName: 'BengalRural_GST_Acknowledgement.pdf',
    certificateFileSizeKb: 175,
    lastAuditedDate: '2026-10-24',
    remarks: 'Awaiting amended GST registration certificate reflecting new ATM site trade name.',
    createdAt: '2024-06-02T10:00:00Z',
    updatedAt: '2026-10-24T17:15:00Z',
  },
  {
    id: 'GSTM-006',
    franchiseId: 'FR-DL-00412',
    franchiseeName: 'NCR Secure Transactions',
    legalBusinessName: 'NCR Secure Transactions LLP',
    tradeName: 'Capital Cash Point',
    gstin: '07AAOFN1928P1Z4',
    panNumber: 'AAOFN1928P',
    state: 'Delhi',
    stateCode: '07',
    registrationType: 'Regular Taxpayer',
    filingFrequency: 'Monthly (GSTR-1 & 3B)',
    reverseChargeApplicable: 'No',
    contactPerson: 'Vikas Malhotra',
    contactPhone: '+91 98110 41209',
    contactEmail: 'accounts@ncr-secure.in',
    registeredAddress: 'Plot 82, Okhla Industrial Area Phase 3',
    city: 'New Delhi',
    pincode: '110020',
    effectiveDate: '2024-09-01',
    verificationStatus: 'Verified',
    certificateFileName: 'Delhi_GSTIN_07AAOFN1928P1Z4.pdf',
    certificateFileSizeKb: 260,
    lastAuditedDate: '2026-10-18',
    remarks: 'Delhi State registered White Label ATM partner. E-way bill generation enabled.',
    createdAt: '2024-09-03T12:00:00Z',
    updatedAt: '2026-10-18T10:00:00Z',
  },
  {
    id: 'GSTM-007',
    franchiseId: 'FR-RJ-00529',
    franchiseeName: 'Marwar ATM Networks',
    legalBusinessName: 'Marwar ATM Services & Distribution',
    tradeName: 'Marwar Pay Point',
    gstin: '08ABCFM8821Q1Z1',
    panNumber: 'ABCFM8821Q',
    state: 'Rajasthan',
    stateCode: '08',
    registrationType: 'Composition Scheme',
    filingFrequency: 'Quarterly (QRMP Scheme)',
    reverseChargeApplicable: 'Yes',
    contactPerson: 'Kalyan Singh Rathore',
    contactPhone: '+91 94140 52910',
    contactEmail: 'kalyan@marwar-atm.com',
    registeredAddress: 'Plot 31, M.I. Road',
    city: 'Jaipur',
    pincode: '302001',
    effectiveDate: '2025-01-15',
    verificationStatus: 'Pending Verification',
    certificateFileName: 'Marwar_GST_Reg.pdf',
    certificateFileSizeKb: 190,
    lastAuditedDate: '2026-10-27',
    remarks: 'Composition taxpayer status verification ongoing with Jaipur Central Tax Office.',
    createdAt: '2025-01-16T15:20:00Z',
    updatedAt: '2026-10-27T14:40:00Z',
  },
]

export const gstMappingStore = createStore<FranchiseGstMapping[]>('dexter_franchise_gst_mappings', () => SEED_MAPPINGS)

export function getGstMapping(id: string): FranchiseGstMapping | undefined {
  return gstMappingStore.get().find((m) => m.id === id || m.franchiseId === id)
}

export function saveGstMapping(input: Partial<FranchiseGstMapping>): FranchiseGstMapping {
  const current = gstMappingStore.get()
  const now = new Date().toISOString()

  if (input.id) {
    const existingIndex = current.findIndex((m) => m.id === input.id)
    if (existingIndex >= 0) {
      const updated: FranchiseGstMapping = {
        ...current[existingIndex],
        ...input,
        updatedAt: now,
      } as FranchiseGstMapping
      const next = [...current]
      next[existingIndex] = updated
      gstMappingStore.set(next)
      return updated
    }
  }

  // Generate new ID
  const newSn = current.length + 1
  const newId = `GSTM-${String(newSn).padStart(3, '0')}`
  const newMapping: FranchiseGstMapping = {
    id: newId,
    franchiseId: input.franchiseId || `FR-GEN-${newSn}`,
    franchiseeName: input.franchiseeName || 'New Franchise Partner',
    legalBusinessName: input.legalBusinessName || input.franchiseeName || '',
    tradeName: input.tradeName || input.franchiseeName || '',
    gstin: input.gstin || '',
    panNumber: input.panNumber || (input.gstin ? input.gstin.slice(2, 12) : ''),
    state: input.state || 'Maharashtra',
    stateCode: input.stateCode || '27',
    registrationType: input.registrationType || 'Regular Taxpayer',
    filingFrequency: input.filingFrequency || 'Monthly (GSTR-1 & 3B)',
    reverseChargeApplicable: input.reverseChargeApplicable || 'No',
    contactPerson: input.contactPerson || '',
    contactPhone: input.contactPhone || '',
    contactEmail: input.contactEmail || '',
    registeredAddress: input.registeredAddress || '',
    city: input.city || '',
    pincode: input.pincode || '',
    effectiveDate: input.effectiveDate || new Date().toISOString().split('T')[0],
    verificationStatus: input.verificationStatus || 'Pending Verification',
    certificateFileName: input.certificateFileName,
    certificateFileSizeKb: input.certificateFileSizeKb,
    remarks: input.remarks || '',
    createdAt: now,
    updatedAt: now,
  }

  gstMappingStore.set([newMapping, ...current])
  return newMapping
}

export function deleteGstMapping(id: string): void {
  const current = gstMappingStore.get()
  gstMappingStore.set(current.filter((m) => m.id !== id))
}

export function emptyGstMapping(): FranchiseGstMapping {
  return {
    id: '',
    franchiseId: '',
    franchiseeName: '',
    legalBusinessName: '',
    tradeName: '',
    gstin: '',
    panNumber: '',
    state: 'Maharashtra',
    stateCode: '27',
    registrationType: 'Regular Taxpayer',
    filingFrequency: 'Monthly (GSTR-1 & 3B)',
    reverseChargeApplicable: 'No',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    registeredAddress: '',
    city: '',
    pincode: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    verificationStatus: 'Pending Verification',
    remarks: '',
    createdAt: '',
    updatedAt: '',
  }
}

