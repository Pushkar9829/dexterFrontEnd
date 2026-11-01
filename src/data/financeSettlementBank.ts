// Mock data store and hooks for Settlement Bank modules:
// 1. Account Mapping (WLA, Axis Indent, ICICI)
// 2. A/C Change Request (Settlement Account & Payout Account)
// 3. Account Opening

import { useState, useEffect } from 'react'

/* ==========================================================================
   1. ACCOUNT MAPPING
   ========================================================================== */

export type MappingType = 'WLA' | 'Axis Indent' | 'ICICI'

export interface UploadedDoc {
  id: string
  docType: string
  fileName: string
  uploadedOn: string
}

export interface VendorKycItem {
  person: string
  vendorName: string
  docType: string
  docRefNo: string
}

export interface AccountMappingRecord {
  id: string
  mappingType: MappingType
  atmId: string
  hpyCode?: string
  siteId?: string
  franchiseeName: string
  contact: string
  emailId: string
  
  // WLA specific bank fields
  nameAsPerBank?: string
  bankName: string
  accountNumber: string
  ifscCode: string
  nameOnPan?: string
  panNo?: string
  aadhaarLinkedMobile?: string
  branchSolId?: string
  bankManagerName?: string
  bankManagerMobile?: string
  bankManagerEmail?: string

  // Axis Indent / ICICI specific branch fields
  location?: string
  solId?: string
  addressShortName?: string
  branchAddress?: string
  city?: string
  state?: string
  pincode?: string
  vendorKyc?: VendorKycItem[]

  // Documents & Status
  documents: UploadedDoc[]
  remarks?: string
  status: 'Mapped' | 'Pending Verification' | 'Pending Approval' | 'Draft' | 'Inactive'
  effectiveDate: string
}

export const INITIAL_ACCOUNT_MAPPINGS: AccountMappingRecord[] = [
  {
    id: 'MAP-1001',
    mappingType: 'WLA',
    atmId: 'XY2012312',
    siteId: 'ST-MH-PUN-00124',
    franchiseeName: 'Rameshwar Kulkarni',
    contact: '98220 41765',
    emailId: 'rameshwar.kulkarni@gmail.com',
    nameAsPerBank: 'Rameshwar Kulkarni Enterprises',
    bankName: 'ICICI Bank',
    accountNumber: '000405012345',
    ifscCode: 'ICIC0000004',
    nameOnPan: 'Rameshwar S. Kulkarni',
    panNo: 'ABCDE1234F',
    aadhaarLinkedMobile: '98220 41765',
    branchSolId: 'SOL-PUN-004',
    bankManagerName: 'Amit Deshpande',
    bankManagerMobile: '98220 99881',
    bankManagerEmail: 'amit.deshpande@icicibank.com',
    documents: [
      { id: 'doc-1', docType: 'Cheque', fileName: 'cheque_xyz.pdf', uploadedOn: '19-10-2026' },
      { id: 'doc-2', docType: 'Bank Statement', fileName: 'statement_xyz.pdf', uploadedOn: '19-10-2026' },
      { id: 'doc-3', docType: 'PAN Card', fileName: 'pancard_xyz.pdf', uploadedOn: '19-10-2026' },
    ],
    remarks: 'Verified via branch manager confirmation & penny drop.',
    status: 'Mapped',
    effectiveDate: '2025-11-15',
  },
  {
    id: 'MAP-1002',
    mappingType: 'Axis Indent',
    atmId: 'DX-UP-02391',
    hpyCode: 'HPY-9921408',
    siteId: 'ST-UP-AGR-00219',
    franchiseeName: 'Vinod Kumar Bansal',
    contact: '94120 88210',
    emailId: 'vinod.bansal@gmail.com',
    bankName: 'Axis Bank',
    accountNumber: '91802008765432',
    ifscCode: 'UTIB0000240',
    location: 'Sanjay Place, Agra',
    solId: 'AXIS-AGR-0240',
    addressShortName: 'Agra Sanjay Place Branch',
    branchAddress: 'Plot 12, Commercial Complex, Sanjay Place, Agra, UP',
    city: 'Agra',
    state: 'Uttar Pradesh',
    pincode: '282002',
    vendorKyc: [
      { person: 'First Person', vendorName: 'Vinod Kumar Bansal', docType: 'PAN Card', docRefNo: 'BKRPB9876K' },
      { person: 'First Person', vendorName: 'Vinod Kumar Bansal', docType: 'Aadhaar No.', docRefNo: '7829-1928-3490' },
      { person: 'Second Person', vendorName: 'Sunita Bansal', docType: 'PAN Card', docRefNo: 'CZXPS4421M' },
      { person: 'Second Person', vendorName: 'Sunita Bansal', docType: 'Aadhaar No.', docRefNo: '9921-8841-2309' },
      { person: 'Third Person', vendorName: 'Aman Bansal', docType: 'PAN Card', docRefNo: 'AQEPB1102Q' },
      { person: 'Third Person', vendorName: 'Aman Bansal', docType: 'Aadhaar No.', docRefNo: '6610-2294-1182' },
    ],
    documents: [
      { id: 'doc-4', docType: 'Cancelled Cheque Copy', fileName: 'cheque_axis_bansal.pdf', uploadedOn: '20-10-2026' },
      { id: 'doc-5', docType: 'Bank Statement Copy', fileName: 'statement_axis_bansal.pdf', uploadedOn: '20-10-2026' },
    ],
    remarks: 'Axis indent mapping with daily limit approval.',
    status: 'Mapped',
    effectiveDate: '2025-12-01',
  },
  {
    id: 'MAP-1003',
    mappingType: 'ICICI',
    atmId: 'DX-KA-03810',
    hpyCode: 'HPY-7734102',
    siteId: 'ST-KA-BLR-00512',
    franchiseeName: 'Naveen Gowda',
    contact: '98450 11223',
    emailId: 'naveen.gowda@techfin.in',
    bankName: 'ICICI Bank',
    accountNumber: '001205098765',
    ifscCode: 'ICIC0000012',
    location: 'Koramangala 4th Block, Bengaluru',
    solId: 'ICIC-BLR-0012',
    addressShortName: 'Koramangala Main Branch',
    branchAddress: 'No 45, 80 Feet Road, 4th Block Koramangala, Bangalore',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560034',
    vendorKyc: [
      { person: 'First Person', vendorName: 'Naveen Gowda', docType: 'PAN Card', docRefNo: 'AHYPG8812L' },
      { person: 'First Person', vendorName: 'Naveen Gowda', docType: 'Aadhaar No.', docRefNo: '4450-8812-9901' },
      { person: 'Second Person', vendorName: 'Pooja Gowda', docType: 'PAN Card', docRefNo: 'BHYPG1290K' },
      { person: 'Second Person', vendorName: 'Pooja Gowda', docType: 'Aadhaar No.', docRefNo: '7721-0021-4412' },
      { person: 'Third Person', vendorName: 'Kiran Gowda', docType: 'PAN Card', docRefNo: 'CHYPG3341P' },
      { person: 'Third Person', vendorName: 'Kiran Gowda', docType: 'Aadhaar No.', docRefNo: '3310-9941-8823' },
    ],
    documents: [
      { id: 'doc-6', docType: 'Cancelled Cheque Copy', fileName: 'cheque_icici_gowda.pdf', uploadedOn: '22-10-2026' },
      { id: 'doc-7', docType: 'PAN Card Copy', fileName: 'pan_gowda.pdf', uploadedOn: '22-10-2026' },
    ],
    remarks: 'ICICI indent mapping verified.',
    status: 'Mapped',
    effectiveDate: '2026-01-10',
  },
]

let mappingsStore = [...INITIAL_ACCOUNT_MAPPINGS]
let mappingsListeners: Array<() => void> = []

export function useAccountMappings() {
  const [data, setData] = useState<AccountMappingRecord[]>(mappingsStore)
  useEffect(() => {
    const listener = () => setData([...mappingsStore])
    mappingsListeners.push(listener)
    return () => {
      mappingsListeners = mappingsListeners.filter((l) => l !== listener)
    }
  }, [])
  return data
}

export function getAccountMappingById(id: string): AccountMappingRecord | undefined {
  return mappingsStore.find((m) => m.id === id)
}

export function addAccountMapping(record: Omit<AccountMappingRecord, 'id'>) {
  const newRecord: AccountMappingRecord = {
    ...record,
    id: `MAP-${Date.now().toString().slice(-4)}`,
  }
  mappingsStore = [newRecord, ...mappingsStore]
  mappingsListeners.forEach((l) => l())
  return newRecord
}

export function updateAccountMapping(id: string, updates: Partial<AccountMappingRecord>) {
  mappingsStore = mappingsStore.map((item) => (item.id === id ? { ...item, ...updates } : item))
  mappingsListeners.forEach((l) => l())
}

export function deleteAccountMapping(id: string) {
  mappingsStore = mappingsStore.filter((item) => item.id !== id)
  mappingsListeners.forEach((l) => l())
}

/* ==========================================================================
   2. A/C CHANGE REQUEST (SETTLEMENT ACCOUNT & PAYOUT ACCOUNT)
   ========================================================================== */

export interface AccountChangeParticulars {
  nameAsPerBank: string
  bankName: string
  accountNumber: string
  ifscCode: string
  nameOnPan: string
  panNo: string
  aadhaarLinkedMobile: string
  emailId: string
  reasonForChange: string
}

export interface AcChangeRequestRecord {
  id: string
  atmId: string
  hpyCode?: string
  siteId?: string
  franchiseeName: string
  mobileNo: string
  emailId?: string
  requestDate: string

  // Section 1: Type of Account with HPY: Settlement Account
  settlementExisting: AccountChangeParticulars
  settlementNew: AccountChangeParticulars

  // Section 2: Type of Account with HPY: Payout Account
  hasPayoutChange: boolean
  payoutExisting: AccountChangeParticulars
  payoutNew: AccountChangeParticulars

  // Documents & Notes
  documents: UploadedDoc[]
  note?: string

  // Status & Actions
  status: 'Approved' | 'Pending' | 'Under Review' | 'Rejected'
  actionDate?: string
  actionRemarks?: string
}

export const INITIAL_CHANGE_REQUESTS: AcChangeRequestRecord[] = [
  {
    id: 'CR-2026-001',
    atmId: 'DX-UP-02391',
    hpyCode: 'HPY-9921408',
    siteId: 'ST-UP-MNP-00142',
    franchiseeName: 'Ranjeet Pal',
    mobileNo: '8126817131',
    emailId: 'ranjeetpal.mainpuri@gmail.com',
    requestDate: '2026-10-24',
    settlementExisting: {
      nameAsPerBank: 'Ranjeet Pal & Shikha Pal',
      bankName: 'Axis Indent Account',
      accountNumber: '91802008765432',
      ifscCode: 'UTIB0000240',
      nameOnPan: 'Ranjeet Pal',
      panNo: 'CSPP1214179E',
      aadhaarLinkedMobile: '8126817131',
      emailId: 'ranjeetpal.mainpuri@gmail.com',
      reasonForChange: 'Axis Bank does not provide full cash daily.',
    },
    settlementNew: {
      nameAsPerBank: 'Ranjeet Pal',
      bankName: 'HDFC Bank',
      accountNumber: '502000622323610',
      ifscCode: 'HDFC0003925',
      nameOnPan: 'Ranjeet Pal',
      panNo: 'CSPP1214179E',
      aadhaarLinkedMobile: '8126817131',
      emailId: 'ranjeetpal.mainpuri@gmail.com',
      reasonForChange: 'Axis Bank does not provide full cash daily.',
    },
    hasPayoutChange: false,
    payoutExisting: {
      nameAsPerBank: 'Ranjeet Pal',
      bankName: 'BANK OF INDIA',
      accountNumber: '770310110005160',
      ifscCode: 'BKID0007703',
      nameOnPan: 'Ranjeet Pal',
      panNo: 'CSPP1214179E',
      aadhaarLinkedMobile: '8126817131',
      emailId: 'ranjeetpal.mainpuri@gmail.com',
      reasonForChange: 'There are no changes in the payout account.',
    },
    payoutNew: {
      nameAsPerBank: 'NA',
      bankName: 'NA',
      accountNumber: 'NA',
      ifscCode: 'NA',
      nameOnPan: 'NA',
      panNo: 'NA',
      aadhaarLinkedMobile: 'NA',
      emailId: 'NA',
      reasonForChange: 'NA',
    },
    documents: [
      { id: 'cr-doc-1', docType: 'Cancelled Cheque', fileName: 'hdfc_cheque_ranjeet.pdf', uploadedOn: '24-10-2026' },
      { id: 'cr-doc-2', docType: 'PAN Card Copy', fileName: 'pan_ranjeet_pal.pdf', uploadedOn: '24-10-2026' },
      { id: 'cr-doc-3', docType: 'Bank Statement', fileName: 'boi_statement.pdf', uploadedOn: '24-10-2026' },
    ],
    note: 'Franchisee requested quick settlement routing to avoid cash out during peak daily transactions.',
    status: 'Pending',
    actionRemarks: 'Pending review by Regional Ops Lead',
  },
  {
    id: 'CR-2026-002',
    atmId: 'DX-MH-01482',
    hpyCode: 'HPY-4491023',
    siteId: 'ST-MH-PUN-00124',
    franchiseeName: 'Rameshwar Kulkarni',
    mobileNo: '98220 41765',
    emailId: 'rameshwar.kulkarni@gmail.com',
    requestDate: '2026-10-26',
    settlementExisting: {
      nameAsPerBank: 'Rameshwar Kulkarni & Associates',
      bankName: 'Bank of Maharashtra',
      accountNumber: '20045123987',
      ifscCode: 'MAHB0000123',
      nameOnPan: 'Rameshwar S Kulkarni',
      panNo: 'ABCDE1234F',
      aadhaarLinkedMobile: '98220 41765',
      emailId: 'rameshwar.kulkarni@gmail.com',
      reasonForChange: 'Old branch relocated far from ATM site location.',
    },
    settlementNew: {
      nameAsPerBank: 'Rameshwar Kulkarni',
      bankName: 'ICICI Bank',
      accountNumber: '000405012345',
      ifscCode: 'ICIC0000004',
      nameOnPan: 'Rameshwar S Kulkarni',
      panNo: 'ABCDE1234F',
      aadhaarLinkedMobile: '98220 41765',
      emailId: 'rameshwar.kulkarni@gmail.com',
      reasonForChange: 'Direct nodal sweep facilities at new ICICI branch.',
    },
    hasPayoutChange: true,
    payoutExisting: {
      nameAsPerBank: 'Rameshwar Kulkarni',
      bankName: 'Bank of Maharashtra',
      accountNumber: '20045123987',
      ifscCode: 'MAHB0000123',
      nameOnPan: 'Rameshwar S Kulkarni',
      panNo: 'ABCDE1234F',
      aadhaarLinkedMobile: '98220 41765',
      emailId: 'rameshwar.kulkarni@gmail.com',
      reasonForChange: 'Consolidating payout account to match settlement bank.',
    },
    payoutNew: {
      nameAsPerBank: 'Rameshwar Kulkarni',
      bankName: 'ICICI Bank',
      accountNumber: '000405012345',
      ifscCode: 'ICIC0000004',
      nameOnPan: 'Rameshwar S Kulkarni',
      panNo: 'ABCDE1234F',
      aadhaarLinkedMobile: '98220 41765',
      emailId: 'rameshwar.kulkarni@gmail.com',
      reasonForChange: 'Consolidating payout account to match settlement bank.',
    },
    documents: [
      { id: 'cr-doc-4', docType: 'Cancelled Cheque', fileName: 'icici_cheque_kulkarni.pdf', uploadedOn: '26-10-2026' },
      { id: 'cr-doc-5', docType: 'Passbook Copy', fileName: 'passbook_kulkarni.pdf', uploadedOn: '26-10-2026' },
    ],
    note: 'Verified with penny drop and signature verification.',
    status: 'Approved',
    actionDate: '2026-10-27',
    actionRemarks: 'Verified and approved by Finance Controller',
  },
  {
    id: 'CR-2026-003',
    atmId: 'DX-GJ-02988',
    hpyCode: 'HPY-7734102',
    siteId: 'ST-GJ-AHM-00445',
    franchiseeName: 'Bhavin Patel',
    mobileNo: '98250 99887',
    emailId: 'bhavin.patel@gujfinance.com',
    requestDate: '2026-10-28',
    settlementExisting: {
      nameAsPerBank: 'Bhavin Patel & Sons',
      bankName: 'State Bank of India',
      accountNumber: '20194857610',
      ifscCode: 'SBIN0000012',
      nameOnPan: 'Bhavin Patel',
      panNo: 'BVPPT7712M',
      aadhaarLinkedMobile: '98250 99887',
      emailId: 'bhavin.patel@gujfinance.com',
      reasonForChange: 'Reconstitution of franchisee partnership firm.',
    },
    settlementNew: {
      nameAsPerBank: 'Bhavin Patel Enterprise',
      bankName: 'Kotak Mahindra Bank',
      accountNumber: '7812903456',
      ifscCode: 'KKBK0000812',
      nameOnPan: 'Bhavin Patel',
      panNo: 'BVPPT7712M',
      aadhaarLinkedMobile: '98250 99887',
      emailId: 'bhavin.patel@gujfinance.com',
      reasonForChange: 'Updated business current account opened at Kotak.',
    },
    hasPayoutChange: false,
    payoutExisting: {
      nameAsPerBank: 'Bhavin Patel',
      bankName: 'State Bank of India',
      accountNumber: '20194857610',
      ifscCode: 'SBIN0000012',
      nameOnPan: 'Bhavin Patel',
      panNo: 'BVPPT7712M',
      aadhaarLinkedMobile: '98250 99887',
      emailId: 'bhavin.patel@gujfinance.com',
      reasonForChange: 'There are no changes in the payout account.',
    },
    payoutNew: {
      nameAsPerBank: 'NA',
      bankName: 'NA',
      accountNumber: 'NA',
      ifscCode: 'NA',
      nameOnPan: 'NA',
      panNo: 'NA',
      aadhaarLinkedMobile: 'NA',
      emailId: 'NA',
      reasonForChange: 'NA',
    },
    documents: [
      { id: 'cr-doc-6', docType: 'Bank Statement Copy', fileName: 'kotak_statement.pdf', uploadedOn: '28-10-2026' },
    ],
    note: 'Legal deed copy pending submission.',
    status: 'Under Review',
    actionRemarks: 'Awaiting amended franchisee agreement copy',
  },
]

let changeRequestsStore = [...INITIAL_CHANGE_REQUESTS]
let changeRequestsListeners: Array<() => void> = []

export function useAcChangeRequests() {
  const [data, setData] = useState<AcChangeRequestRecord[]>(changeRequestsStore)
  useEffect(() => {
    const listener = () => setData([...changeRequestsStore])
    changeRequestsListeners.push(listener)
    return () => {
      changeRequestsListeners = changeRequestsListeners.filter((l) => l !== listener)
    }
  }, [])
  return data
}

export function getAcChangeRequestById(id: string): AcChangeRequestRecord | undefined {
  return changeRequestsStore.find((r) => r.id === id)
}

export function addAcChangeRequest(record: Omit<AcChangeRequestRecord, 'id'>) {
  const newRecord: AcChangeRequestRecord = {
    ...record,
    id: `CR-2026-${Date.now().toString().slice(-3)}`,
  }
  changeRequestsStore = [newRecord, ...changeRequestsStore]
  changeRequestsListeners.forEach((l) => l())
  return newRecord
}

export function updateAcChangeRequest(id: string, updates: Partial<AcChangeRequestRecord>) {
  changeRequestsStore = changeRequestsStore.map((item) => (item.id === id ? { ...item, ...updates } : item))
  changeRequestsListeners.forEach((l) => l())
}

export function deleteAcChangeRequest(id: string) {
  changeRequestsStore = changeRequestsStore.filter((item) => item.id !== id)
  changeRequestsListeners.forEach((l) => l())
}

/* ==========================================================================
   3. ACCOUNT OPENING
   ========================================================================== */

export interface AccountOpeningRecord {
  id: string
  siteId: string
  atmId: string
  franchiseeName: string
  mobileNo: string
  bankName: string
  accountType: 'Nodal' | 'Escrow' | 'Current' | 'Virtual Pool'
  applicationDate: string
  kycStatus: 'Verified' | 'Pending KYC' | 'Rejected'
  stage: 'Account Created' | 'Bank Processing' | 'Documents Pending' | 'Rejected'
  accountNumber: string
  ifscCode: string
  cifNumber: string
  authorizedSignatory: string
  status: 'Active' | 'In Process' | 'On Hold'
}

export const INITIAL_ACCOUNT_OPENINGS: AccountOpeningRecord[] = [
  {
    id: 'AO-2026-101',
    siteId: 'ST-MH-PUN-00124',
    atmId: 'DX-MH-01482',
    franchiseeName: 'Rameshwar Kulkarni',
    mobileNo: '98220 41765',
    bankName: 'ICICI Bank',
    accountType: 'Nodal',
    applicationDate: '2026-10-10',
    kycStatus: 'Verified',
    stage: 'Account Created',
    accountNumber: '000405012345',
    ifscCode: 'ICIC0000004',
    cifNumber: 'CIF9812401',
    authorizedSignatory: 'Rameshwar Kulkarni & Dexter Ops',
    status: 'Active',
  },
]

let accountOpeningsStore = [...INITIAL_ACCOUNT_OPENINGS]
let accountOpeningsListeners: Array<() => void> = []

export function useAccountOpenings() {
  const [data, setData] = useState<AccountOpeningRecord[]>(accountOpeningsStore)
  useEffect(() => {
    const listener = () => setData([...accountOpeningsStore])
    accountOpeningsListeners.push(listener)
    return () => {
      accountOpeningsListeners = accountOpeningsListeners.filter((l) => l !== listener)
    }
  }, [])
  return data
}

export function addAccountOpening(record: Omit<AccountOpeningRecord, 'id'>) {
  const newRecord: AccountOpeningRecord = {
    ...record,
    id: `AO-2026-${Date.now().toString().slice(-3)}`,
  }
  accountOpeningsStore = [newRecord, ...accountOpeningsStore]
  accountOpeningsListeners.forEach((l) => l())
  return newRecord
}

export function updateAccountOpening(id: string, updates: Partial<AccountOpeningRecord>) {
  accountOpeningsStore = accountOpeningsStore.map((item) => (item.id === id ? { ...item, ...updates } : item))
  accountOpeningsListeners.forEach((l) => l())
}

export function deleteAccountOpening(id: string) {
  accountOpeningsStore = accountOpeningsStore.filter((item) => item.id !== id)
  accountOpeningsListeners.forEach((l) => l())
}
