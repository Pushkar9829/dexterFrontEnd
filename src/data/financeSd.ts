export type SecurityDepositStatus =
  | 'Verified'
  | 'Pending Verification'
  | 'Under Review'
  | 'Refunded'
  | 'Disputed'

export type SdPaymentType = 'NEFT' | 'RTGS' | 'IMPS' | 'Cheque' | 'UPI' | 'Direct Transfer' | 'Cash'

export interface SecurityDeposit {
  id: string
  siteId: string
  atmId: string
  franchiseeName: string
  franchiseeNo: string
  cashLiveDate: string
  hpyAccount: string

  // Payment details
  paymentType: SdPaymentType
  paymentDate: string
  transactionDate?: string
  transferTime: string
  txnNumber: string
  amount: string
  depositCategory: string
  receiptNo: string

  // Bank details
  frBankName: string
  accountHolder: string
  frAccount: string
  frIfsc: string
  branchName: string

  // Verification
  attachmentName: string
  attachmentSize: number
  status: SecurityDepositStatus
  verifierRemarks: string
  verifiedBy: string
  verifiedAt: string

  createdAt: string
  updatedAt: string
}

export const SD_PAYMENT_TYPES: SdPaymentType[] = [
  'NEFT',
  'RTGS',
  'IMPS',
  'Cheque',
  'UPI',
  'Direct Transfer',
  'Cash',
]

export const SD_BANKS = [
  'HDFC Bank',
  'State Bank of India',
  'ICICI Bank',
  'Punjab National Bank',
  'Axis Bank',
  'Bank of Baroda',
  'Kotak Mahindra Bank',
  'Canara Bank',
  'Union Bank of India',
]

export const DEPOSIT_CATEGORIES = [
  'Initial Security Deposit',
  'Additional ATM Deposit',
  'Equipment Caution Deposit',
  'Top-up Deposit',
  'Franchise Renewal Deposit',
]

export function inr(v: string | number) {
  const n = Number(v)
  return v === '' || Number.isNaN(n) ? '₹ 0' : `₹ ${n.toLocaleString('en-IN')}`
}

export function createEmptySecurityDeposit(): SecurityDeposit {
  return {
    id: '',
    siteId: '',
    atmId: '',
    franchiseeName: '',
    franchiseeNo: '',
    cashLiveDate: '',
    hpyAccount: '',

    paymentType: 'NEFT',
    paymentDate: new Date().toISOString().slice(0, 10),
    transferTime: '11:30:00',
    txnNumber: '',
    amount: '250000',
    depositCategory: 'Initial Security Deposit',
    receiptNo: '',

    frBankName: 'HDFC Bank',
    accountHolder: '',
    frAccount: '',
    frIfsc: '',
    branchName: '',

    attachmentName: '',
    attachmentSize: 0,
    status: 'Pending Verification',
    verifierRemarks: '',
    verifiedBy: '',
    verifiedAt: '',

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export const SEED_SECURITY_DEPOSITS: SecurityDeposit[] = [
  {
    id: 'SD-2026-0001',
    siteId: 'ST-MH-PUN-00124',
    atmId: 'DX-MH-01482',
    franchiseeName: 'Rameshwar Kulkarni',
    franchiseeNo: '98220 41765',
    cashLiveDate: '2025-11-15',
    hpyAccount: 'HPY-9921408',
    paymentType: 'NEFT',
    paymentDate: '2025-10-18',
    transferTime: '14:32:00',
    txnNumber: 'TXN9824102948',
    amount: '250000',
    depositCategory: 'Initial Security Deposit',
    receiptNo: 'REC-SD-2026-8812',
    frBankName: 'HDFC Bank',
    accountHolder: 'Rameshwar Kulkarni',
    frAccount: '50200012347316',
    frIfsc: 'HDFC0001234',
    branchName: 'Kothrud, Pune',
    attachmentName: 'NEFT_Bank_Challan_250k.pdf',
    attachmentSize: 412000,
    status: 'Verified',
    verifierRemarks: 'Transaction verified against CMS and HDFC bank statement. Funds cleared.',
    verifiedBy: 'Paras Dubey (Ops Lead)',
    verifiedAt: '2025-10-19 11:20 AM',
    createdAt: '2025-10-18T09:02:00.000Z',
    updatedAt: '2025-10-19T05:50:00.000Z',
  },
  {
    id: 'SD-2026-0002',
    siteId: 'ST-UP-AGR-00219',
    atmId: 'DX-UP-02391',
    franchiseeName: 'Vinod Kumar Bansal',
    franchiseeNo: '94120 88210',
    cashLiveDate: '2025-12-01',
    hpyAccount: 'HPY-8841029',
    paymentType: 'RTGS',
    paymentDate: '2025-11-04',
    transferTime: '10:15:22',
    txnNumber: 'RTGS202511049921',
    amount: '300000',
    depositCategory: 'Initial Security Deposit',
    receiptNo: 'REC-SD-2026-8813',
    frBankName: 'State Bank of India',
    accountHolder: 'Vinod Kumar Bansal',
    frAccount: '310928471928',
    frIfsc: 'SBIN0000412',
    branchName: 'Sanjay Place, Agra',
    attachmentName: 'SBI_RTGS_Advice_300k.pdf',
    attachmentSize: 524000,
    status: 'Verified',
    verifierRemarks: 'RTGS confirmed by treasury desk. Receipt issued.',
    verifiedBy: 'Pooja Saxena (Finance)',
    verifiedAt: '2025-11-04 03:45 PM',
    createdAt: '2025-11-04T04:45:00.000Z',
    updatedAt: '2025-11-04T10:15:00.000Z',
  },
  {
    id: 'SD-2026-0003',
    siteId: 'ST-DL-NOI-00342',
    atmId: 'DX-DL-03112',
    franchiseeName: 'Gaurav Singhal',
    franchiseeNo: '98112 34509',
    cashLiveDate: '2026-01-10',
    hpyAccount: 'HPY-7719204',
    paymentType: 'IMPS',
    paymentDate: '2025-12-20',
    transferTime: '16:45:10',
    txnNumber: 'IMPS5382910481',
    amount: '200000',
    depositCategory: 'Initial Security Deposit',
    receiptNo: 'REC-SD-2026-8814',
    frBankName: 'ICICI Bank',
    accountHolder: 'Gaurav Singhal',
    frAccount: '002101592810',
    frIfsc: 'ICIC0000021',
    branchName: 'Sector 18, Noida',
    attachmentName: 'ICICI_IMPS_Receipt.pdf',
    attachmentSize: 310000,
    status: 'Pending Verification',
    verifierRemarks: 'Awaiting bank reconciliation statement for confirmation.',
    verifiedBy: '',
    verifiedAt: '',
    createdAt: '2025-12-20T11:15:00.000Z',
    updatedAt: '2025-12-20T11:15:00.000Z',
  },
  {
    id: 'SD-2026-0004',
    siteId: 'ST-KA-BLR-00481',
    atmId: 'DX-KA-04981',
    franchiseeName: 'Naveen Chandrashekar',
    franchiseeNo: '98450 12894',
    cashLiveDate: '2026-02-01',
    hpyAccount: 'HPY-6629104',
    paymentType: 'NEFT',
    paymentDate: '2026-01-15',
    transferTime: '12:05:00',
    txnNumber: 'NEFT20260115049',
    amount: '250000',
    depositCategory: 'Initial Security Deposit',
    receiptNo: 'REC-SD-2026-8815',
    frBankName: 'Canara Bank',
    accountHolder: 'Naveen Chandrashekar',
    frAccount: '04121010049281',
    frIfsc: 'CNRB0000412',
    branchName: 'Jayanagar, Bangalore',
    attachmentName: 'Canara_Deposit_Challan.pdf',
    attachmentSize: 285000,
    status: 'Verified',
    verifierRemarks: 'Verified via Bangalore hub treasury log.',
    verifiedBy: 'Paras Dubey (Ops Lead)',
    verifiedAt: '2026-01-16 10:00 AM',
    createdAt: '2026-01-15T06:35:00.000Z',
    updatedAt: '2026-01-16T04:30:00.000Z',
  },
  {
    id: 'SD-2026-0005',
    siteId: 'ST-GJ-AMD-00512',
    atmId: 'DX-GJ-05120',
    franchiseeName: 'Bhavin Patel',
    franchiseeNo: '97240 55192',
    cashLiveDate: '2026-02-15',
    hpyAccount: 'HPY-5510294',
    paymentType: 'Cheque',
    paymentDate: '2026-02-02',
    transferTime: '11:00:00',
    txnNumber: 'CHQ-882410',
    amount: '250000',
    depositCategory: 'Initial Security Deposit',
    receiptNo: 'REC-SD-2026-8816',
    frBankName: 'Axis Bank',
    accountHolder: 'Bhavin K Patel',
    frAccount: '91402003819284',
    frIfsc: 'UTIB0000142',
    branchName: 'Navrangpura, Ahmedabad',
    attachmentName: 'Axis_Cheque_Scan_882410.pdf',
    attachmentSize: 610000,
    status: 'Pending Verification',
    verifierRemarks: 'Cheque deposited in clearing. Awaiting realization update.',
    verifiedBy: '',
    verifiedAt: '',
    createdAt: '2026-02-02T05:30:00.000Z',
    updatedAt: '2026-02-02T05:30:00.000Z',
  },
  {
    id: 'SD-2026-0006',
    siteId: 'ST-MH-MUM-00604',
    atmId: 'DX-MH-06102',
    franchiseeName: 'Deepak Sawant',
    franchiseeNo: '98201 99281',
    cashLiveDate: '2025-09-01',
    hpyAccount: 'HPY-4419208',
    paymentType: 'NEFT',
    paymentDate: '2025-08-14',
    transferTime: '15:20:00',
    txnNumber: 'NEFT202508149910',
    amount: '500000',
    depositCategory: 'Additional ATM Deposit',
    receiptNo: 'REC-SD-2026-8817',
    frBankName: 'HDFC Bank',
    accountHolder: 'Deepak Sawant Enterprise',
    frAccount: '50100294819284',
    frIfsc: 'HDFC0000047',
    branchName: 'Dadar, Mumbai',
    attachmentName: 'HDFC_Advice_500k.pdf',
    attachmentSize: 450000,
    status: 'Verified',
    verifierRemarks: 'Additional machine deposit verified and tagged to second ATM terminal.',
    verifiedBy: 'Suresh Nair (COO)',
    verifiedAt: '2025-08-15 02:00 PM',
    createdAt: '2025-08-14T09:50:00.000Z',
    updatedAt: '2025-08-15T08:30:00.000Z',
  },
  {
    id: 'SD-2026-0007',
    siteId: 'ST-WB-KOL-00719',
    atmId: 'DX-WB-07119',
    franchiseeName: 'Anirban Mukherjee',
    franchiseeNo: '98300 44102',
    cashLiveDate: '2025-07-10',
    hpyAccount: 'HPY-3310294',
    paymentType: 'RTGS',
    paymentDate: '2025-06-25',
    transferTime: '13:10:00',
    txnNumber: 'RTGS202506258812',
    amount: '250000',
    depositCategory: 'Initial Security Deposit',
    receiptNo: 'REC-SD-2026-8818',
    frBankName: 'Punjab National Bank',
    accountHolder: 'Anirban Mukherjee',
    frAccount: '0182000100492810',
    frIfsc: 'PUNB0018200',
    branchName: 'Salt Lake, Kolkata',
    attachmentName: 'PNB_Receipt_250k.pdf',
    attachmentSize: 380000,
    status: 'Refunded',
    verifierRemarks: 'Franchise terminated as per SLA clause 14. Deposit refunded back to source PNB account.',
    verifiedBy: 'Pooja Saxena (Finance)',
    verifiedAt: '2026-01-20 04:30 PM',
    createdAt: '2025-06-25T07:40:00.000Z',
    updatedAt: '2026-01-20T11:00:00.000Z',
  },
  {
    id: 'SD-2026-0008',
    siteId: 'ST-TN-CHE-00821',
    atmId: 'DX-TN-08201',
    franchiseeName: 'Senthil Kumaran',
    franchiseeNo: '94440 18294',
    cashLiveDate: '2026-03-01',
    hpyAccount: 'HPY-2219401',
    paymentType: 'UPI',
    paymentDate: '2026-02-18',
    transferTime: '09:40:15',
    txnNumber: 'UPI604928194021',
    amount: '100000',
    depositCategory: 'Top-up Deposit',
    receiptNo: 'REC-SD-2026-8819',
    frBankName: 'State Bank of India',
    accountHolder: 'Senthil Kumaran',
    frAccount: '20491829401',
    frIfsc: 'SBIN0000841',
    branchName: 'T. Nagar, Chennai',
    attachmentName: 'UPI_Success_Screenshot.pdf',
    attachmentSize: 220000,
    status: 'Under Review',
    verifierRemarks: 'Partial payment received. Awaiting remaining ₹1,50,000 balance transfer.',
    verifiedBy: '',
    verifiedAt: '',
    createdAt: '2026-02-18T04:10:00.000Z',
    updatedAt: '2026-02-18T04:10:00.000Z',
  },
]
