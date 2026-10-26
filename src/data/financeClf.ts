import { createStore } from '@/lib/store'

export interface ClfRecord {
  id: string
  siteId: string
  atmId: string
  franchiseeName: string
  franchiseeNo: string
  cashLiveDate: string
  clfStatus: string
  hpyAccount: string
  clfAmount: string
  paymentDate: string
  transferTime: string
  frBank: string
  holder: string
  utr: string
  settlementBank: string

  // Form Fields (Image 2)
  hpyCode?: string
  transactionDate?: string
  nameAsPerPan?: string
  panNumber?: string
  accountNumber?: string
  beneficiaryName?: string
  bankName?: string
  ifscCode?: string

  paymentType?: string
  clfCount?: string
  senderName?: string
  senderContact?: string
  senderAccountNumber?: string
  senderIfsc?: string

  isDraft?: boolean
  createdAt?: string
  updatedAt?: string
}

export const CLF_STATUS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
] as const

export const CLF_SETTLEMENT_BANKS = [
  'Axis Indent',
  'WLA Account',
  'ICICI SR',
  'HDFC',
  'SBI',
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
] as const

export const CLF_PAYMENT_TYPES = [
  'Select Payment Type',
  'NEFT',
  'RTGS',
  'IMPS',
  'UPI',
  'Axis Indent',
  'ICICI SR',
] as const

export interface MasterAtmAccount {
  atmId: string
  siteId: string
  hpyCode: string
  franchiseName: string
  franchiseNo: string
  nameAsPerPan: string
  panNumber: string
  accountNumber: string
  beneficiaryName: string
  bankName: string
  ifscCode: string
  hpyAccount: string
  holder: string
}

export const ATM_MASTER_DATA: Record<string, MasterAtmAccount> = {
  ATM001: {
    atmId: 'ATM001',
    siteId: 'S-1001',
    hpyCode: 'HPY001',
    franchiseName: 'Shree Sai Services',
    franchiseNo: 'FR001',
    nameAsPerPan: 'Dexter India Pvt Ltd',
    panNumber: 'ABCDE1234F',
    accountNumber: '123456789012',
    beneficiaryName: 'Dexter India Pvt Ltd',
    bankName: 'HDFC Bank',
    ifscCode: 'HDFC0001234',
    hpyAccount: 'HPY000123456',
    holder: 'Amit Kumar Dixit',
  },
  ATM003: {
    atmId: 'ATM003',
    siteId: 'S-1006',
    hpyCode: 'HPY002',
    franchiseName: 'Om Finserve',
    franchiseNo: 'FR010',
    nameAsPerPan: 'Om Finserve Services',
    panNumber: 'BCDEF2345G',
    accountNumber: '234567890123',
    beneficiaryName: 'Om Finserve',
    bankName: 'ICICI Bank',
    ifscCode: 'ICIC0002345',
    hpyAccount: 'HPY000654321',
    holder: 'Suresh Sharma',
  },
  ATM007: {
    atmId: 'ATM007',
    siteId: 'S-1012',
    hpyCode: 'HPY003',
    franchiseName: 'Kuber ATM Solutions',
    franchiseNo: 'FR015',
    nameAsPerPan: 'Kuber Solutions LLP',
    panNumber: 'CDEFG3456H',
    accountNumber: '345678901234',
    beneficiaryName: 'Kuber Solutions',
    bankName: 'SBI Bank',
    ifscCode: 'SBIN0003456',
    hpyAccount: 'HPY000658974',
    holder: 'Ravi Kumar',
  },
  ATM011: {
    atmId: 'ATM011',
    siteId: 'S-1018',
    hpyCode: 'HPY004',
    franchiseName: 'Madhav Enterprises',
    franchiseNo: 'FR021',
    nameAsPerPan: 'Madhav ATM Corp',
    panNumber: 'DEFGH4567I',
    accountNumber: '456789012345',
    beneficiaryName: 'Madhav Enterprises',
    bankName: 'HDFC Bank',
    ifscCode: 'HDFC0004567',
    hpyAccount: 'HPY000789456',
    holder: 'Manoj Yadav',
  },
  ATM015: {
    atmId: 'ATM015',
    siteId: 'S-1024',
    hpyCode: 'HPY005',
    franchiseName: 'Shakti Associates',
    franchiseNo: 'FR026',
    nameAsPerPan: 'Shakti Associates Pvt',
    panNumber: 'EFGHI5678J',
    accountNumber: '567890123456',
    beneficiaryName: 'Shakti Associates',
    bankName: 'Axis Bank',
    ifscCode: 'UTIB0005678',
    hpyAccount: 'HPY000963258',
    holder: 'Vikram Singh',
  },
  ATM018: {
    atmId: 'ATM018',
    siteId: 'S-1030',
    hpyCode: 'HPY006',
    franchiseName: 'Ganesh Financials',
    franchiseNo: 'FR031',
    nameAsPerPan: 'Ganesh Financials Ltd',
    panNumber: 'FGHIJ6789K',
    accountNumber: '678901234567',
    beneficiaryName: 'Ganesh Financials',
    bankName: 'Kotak Bank',
    ifscCode: 'KKBK0006789',
    hpyAccount: 'HPY000112233',
    holder: 'Ganesh Joshi',
  },
  ATM022: {
    atmId: 'ATM022',
    siteId: 'S-1036',
    hpyCode: 'HPY007',
    franchiseName: 'Balaji Express',
    franchiseNo: 'FR037',
    nameAsPerPan: 'Balaji Express ATM',
    panNumber: 'GHIJK7890L',
    accountNumber: '789012345678',
    beneficiaryName: 'Balaji Express',
    bankName: 'Bank of Baroda',
    ifscCode: 'BARB0007890',
    hpyAccount: 'HPY000445566',
    holder: 'Rajesh Patel',
  },
  ATM025: {
    atmId: 'ATM025',
    siteId: 'S-1042',
    hpyCode: 'HPY008',
    franchiseName: 'Venkatesh Services',
    franchiseNo: 'FR042',
    nameAsPerPan: 'Venkatesh Services',
    panNumber: 'HIJKL8901M',
    accountNumber: '890123456789',
    beneficiaryName: 'Venkatesh Services',
    bankName: 'Punjab National Bank',
    ifscCode: 'PUNB0008901',
    hpyAccount: 'HPY000778899',
    holder: 'Venkatesh Rao',
  },
}

export function getMasterAccountForAtm(atmId: string): MasterAtmAccount {
  if (ATM_MASTER_DATA[atmId]) {
    return ATM_MASTER_DATA[atmId]
  }
  // Lookup by HPY code if matching
  const byHpy = Object.values(ATM_MASTER_DATA).find((m) => m.hpyCode === atmId || m.hpyAccount === atmId)
  if (byHpy) return byHpy

  // Default fallback
  const num = atmId.replace(/\D/g, '') || '01'
  return {
    atmId: atmId || 'ATM001',
    siteId: `S-10${num.padStart(2, '0')}`,
    hpyCode: `HPY${num.padStart(3, '0')}`,
    franchiseName: 'Dexter India Partner',
    franchiseNo: `FR0${num.padStart(2, '0')}`,
    nameAsPerPan: 'Dexter India Pvt Ltd',
    panNumber: 'ABCDE1234F',
    accountNumber: `123456${num.padStart(6, '0')}`,
    beneficiaryName: 'Dexter India Pvt Ltd',
    bankName: 'HDFC Bank',
    ifscCode: 'HDFC0001234',
    hpyAccount: `HPY000${num.padStart(6, '0')}`,
    holder: 'Dexter Partner',
  }
}

// Seed function providing exact Image 1 rows + realistic records to total 125 records
function seedClf(): ClfRecord[] {
  const exactImageRows: ClfRecord[] = [
    {
      id: 'CLF-1001',
      siteId: 'S-1001',
      atmId: 'ATM001',
      franchiseeName: 'Shree Sai Services',
      franchiseeNo: 'FR001',
      cashLiveDate: '01/08/2025',
      clfStatus: '1st',
      hpyAccount: 'HPY000123456',
      clfAmount: '2,50,000',
      paymentDate: '01/08/2025',
      transferTime: '16:29 PM',
      frBank: 'HDFC Bank',
      holder: 'Amit Kumar Dixit',
      utr: 'UTR123456789',
      settlementBank: 'Axis Indent',
      hpyCode: 'HPY001',
      transactionDate: '18-10-2026',
      nameAsPerPan: 'Dexter India Pvt Ltd',
      panNumber: 'ABCDE1234F',
      accountNumber: '123456789012',
      beneficiaryName: 'Dexter India Pvt Ltd',
      bankName: 'HDFC Bank',
      ifscCode: 'HDFC0001234',
      paymentType: 'NEFT',
      clfCount: '1st',
      senderName: 'Amit Kumar Dixit',
      senderContact: '9876543210',
      senderAccountNumber: '123456789012',
      senderIfsc: 'HDFC0001234',
    },
    {
      id: 'CLF-1006',
      siteId: 'S-1006',
      atmId: 'ATM003',
      franchiseeName: 'Om Finserve',
      franchiseeNo: 'FR010',
      cashLiveDate: '05/08/2025',
      clfStatus: '2nd',
      hpyAccount: 'HPY000654321',
      clfAmount: '1,80,000',
      paymentDate: '05/08/2025',
      transferTime: '11:15 AM',
      frBank: 'ICICI Bank',
      holder: 'Suresh Sharma',
      utr: 'UTR987654321',
      settlementBank: 'WLA Account',
      hpyCode: 'HPY002',
      transactionDate: '18-10-2026',
      nameAsPerPan: 'Om Finserve Services',
      panNumber: 'BCDEF2345G',
      accountNumber: '234567890123',
      beneficiaryName: 'Om Finserve',
      bankName: 'ICICI Bank',
      ifscCode: 'ICIC0002345',
      paymentType: 'RTGS',
      clfCount: '2nd',
      senderName: 'Suresh Sharma',
      senderContact: '9876543211',
      senderAccountNumber: '234567890123',
      senderIfsc: 'ICIC0002345',
    },
    {
      id: 'CLF-1012',
      siteId: 'S-1012',
      atmId: 'ATM007',
      franchiseeName: 'Kuber ATM Solutions',
      franchiseeNo: 'FR015',
      cashLiveDate: '08/08/2025',
      clfStatus: '3rd',
      hpyAccount: 'HPY000658974',
      clfAmount: '3,00,000',
      paymentDate: '08/08/2025',
      transferTime: '14:42 PM',
      frBank: 'SBI Bank',
      holder: 'Ravi Kumar',
      utr: 'UTR456123789',
      settlementBank: 'ICICI SR',
      hpyCode: 'HPY003',
      transactionDate: '18-10-2026',
      nameAsPerPan: 'Kuber Solutions LLP',
      panNumber: 'CDEFG3456H',
      accountNumber: '345678901234',
      beneficiaryName: 'Kuber Solutions',
      bankName: 'SBI Bank',
      ifscCode: 'SBIN0003456',
      paymentType: 'IMPS',
      clfCount: '3rd',
      senderName: 'Ravi Kumar',
      senderContact: '9876543212',
      senderAccountNumber: '345678901234',
      senderIfsc: 'SBIN0003456',
    },
    {
      id: 'CLF-1018',
      siteId: 'S-1018',
      atmId: 'ATM011',
      franchiseeName: 'Madhav Enterprises',
      franchiseeNo: 'FR021',
      cashLiveDate: '12/08/2025',
      clfStatus: '4th',
      hpyAccount: 'HPY000789456',
      clfAmount: '2,20,000',
      paymentDate: '12/08/2025',
      transferTime: '10:08 AM',
      frBank: 'HDFC Bank',
      holder: 'Manoj Yadav',
      utr: 'UTR321654987',
      settlementBank: 'HDFC',
      hpyCode: 'HPY004',
      transactionDate: '18-10-2026',
      nameAsPerPan: 'Madhav ATM Corp',
      panNumber: 'DEFGH4567I',
      accountNumber: '456789012345',
      beneficiaryName: 'Madhav Enterprises',
      bankName: 'HDFC Bank',
      ifscCode: 'HDFC0004567',
      paymentType: 'NEFT',
      clfCount: '4th',
      senderName: 'Manoj Yadav',
      senderContact: '9876543213',
      senderAccountNumber: '456789012345',
      senderIfsc: 'HDFC0004567',
    },
    {
      id: 'CLF-1024',
      siteId: 'S-1024',
      atmId: 'ATM015',
      franchiseeName: 'Shakti Associates',
      franchiseeNo: 'FR026',
      cashLiveDate: '16/08/2025',
      clfStatus: '5th',
      hpyAccount: 'HPY000963258',
      clfAmount: '1,50,000',
      paymentDate: '16/08/2025',
      transferTime: '15:35 PM',
      frBank: 'Axis Bank',
      holder: 'Vikram Singh',
      utr: 'UTR789456123',
      settlementBank: 'SBI',
      hpyCode: 'HPY005',
      transactionDate: '18-10-2026',
      nameAsPerPan: 'Shakti Associates Pvt',
      panNumber: 'EFGHI5678J',
      accountNumber: '567890123456',
      beneficiaryName: 'Shakti Associates',
      bankName: 'Axis Bank',
      ifscCode: 'UTIB0005678',
      paymentType: 'Axis Indent',
      clfCount: '5th',
      senderName: 'Vikram Singh',
      senderContact: '9876543214',
      senderAccountNumber: '567890123456',
      senderIfsc: 'UTIB0005678',
    },
  ]

  const poolPartners = [
    { name: 'Apex Secure Fintech', holder: 'Anand Verma', bank: 'Kotak Bank', fr: 'FR031', site: 'S-1028', atm: 'ATM018' },
    { name: 'Balaji ATM Point', holder: 'Dinesh Joshi', bank: 'HDFC Bank', fr: 'FR035', site: 'S-1032', atm: 'ATM021' },
    { name: 'Chaitanya DigiPay', holder: 'Gopal Krishna', bank: 'SBI Bank', fr: 'FR040', site: 'S-1038', atm: 'ATM024' },
    { name: 'Divya Express Cash', holder: 'Harish Nair', bank: 'ICICI Bank', fr: 'FR044', site: 'S-1045', atm: 'ATM029' },
    { name: 'Ekta Cash Net', holder: 'Jagdish Rao', bank: 'Axis Bank', fr: 'FR049', site: 'S-1051', atm: 'ATM033' },
    { name: 'Fortune ATM Network', holder: 'Kailash Mehra', bank: 'Punjab National Bank', fr: 'FR055', site: 'S-1058', atm: 'ATM038' },
    { name: 'Global Money Spot', holder: 'Lalit Gupta', bank: 'Bank of Baroda', fr: 'FR060', site: 'S-1064', atm: 'ATM042' },
    { name: 'Hari Om Financials', holder: 'Mukesh Choudhary', bank: 'Canara Bank', fr: 'FR067', site: 'S-1070', atm: 'ATM047' },
  ]

  const settlementPool = ['Axis Indent', 'WLA Account', 'ICICI SR', 'HDFC', 'SBI']
  const statusPool = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
  const amounts = ['1,20,000', '1,50,000', '1,80,000', '2,00,000', '2,50,000', '3,00,000', '3,50,000']

  const moreRows: ClfRecord[] = []
  for (let i = 6; i <= 125; i++) {
    const partner = poolPartners[i % poolPartners.length]
    const sBank = settlementPool[i % settlementPool.length]
    const status = statusPool[i % statusPool.length]
    const amount = amounts[i % amounts.length]
    const day = String((i % 28) + 1).padStart(2, '0')
    const month = String(((i % 12) + 1)).padStart(2, '0')
    const hour = String(9 + (i % 10)).padStart(2, '0')
    const min = String((i * 7) % 60).padStart(2, '0')
    const isPm = (9 + (i % 10)) >= 12 ? 'PM' : 'AM'
    const atmSuffix = String(i + 10).padStart(3, '0')

    moreRows.push({
      id: `CLF-${1000 + i}`,
      siteId: partner.site,
      atmId: `ATM${atmSuffix}`,
      franchiseeName: partner.name,
      franchiseeNo: `${partner.fr}`,
      cashLiveDate: `${day}/${month}/2025`,
      clfStatus: status,
      hpyAccount: `HPY000${String(100000 + i * 37)}`,
      clfAmount: amount,
      paymentDate: `${day}/${month}/2025`,
      transferTime: `${hour}:${min} ${isPm}`,
      frBank: partner.bank,
      holder: partner.holder,
      utr: `UTR${String(100000000 + i * 87654).slice(0, 9)}`,
      settlementBank: sBank,
      hpyCode: `HPY${String(i).padStart(3, '0')}`,
      transactionDate: '18-10-2026',
      nameAsPerPan: partner.name,
      panNumber: `ABCDE${String(1000 + i).slice(0, 4)}F`,
      accountNumber: `91827364${String(i).padStart(4, '0')}`,
      beneficiaryName: partner.name,
      bankName: partner.bank,
      ifscCode: 'HDFC0001234',
      paymentType: 'NEFT',
      clfCount: status,
      senderName: partner.holder,
      senderContact: `987654${String(i).padStart(4, '0')}`,
      senderAccountNumber: `91827364${String(i).padStart(4, '0')}`,
      senderIfsc: 'HDFC0001234',
    })
  }

  return [...exactImageRows, ...moreRows]
}

export const clfStore = createStore<ClfRecord[]>('dexter.finance.clf.v3', seedClf)

export const useClfRecords = (): ClfRecord[] => clfStore.use()

export function getClfRecord(id: string): ClfRecord | undefined {
  const all = clfStore.get()
  return all.find(
    (c) =>
      c.id === id ||
      c.utr.toLowerCase() === id.toLowerCase() ||
      c.hpyAccount === id ||
      c.atmId.toLowerCase() === id.toLowerCase(),
  )
}

export function nextClfId(): string {
  const all = clfStore.get()
  const highest = all.reduce((max, c) => {
    const match = c.id.match(/(\d+)/)
    if (match) return Math.max(max, parseInt(match[1], 10))
    return max
  }, 1000)
  return `CLF-${highest + 1}`
}

export function saveClfRecord(record: ClfRecord): ClfRecord {
  const now = new Date().toISOString()
  const existing = record.id ? getClfRecord(record.id) : undefined

  const toSave: ClfRecord = {
    ...record,
    id: existing?.id || record.id || nextClfId(),
    updatedAt: now,
    createdAt: existing?.createdAt || now,
  }

  clfStore.set((list) => {
    const exists = list.some((c) => c.id === toSave.id)
    if (exists) {
      return list.map((c) => (c.id === toSave.id ? toSave : c))
    }
    return [toSave, ...list]
  })

  return toSave
}

export function deleteClfRecord(id: string) {
  clfStore.set((list) => list.filter((c) => c.id !== id))
}

export function createEmptyClfRecord(): ClfRecord {
  const master = ATM_MASTER_DATA['ATM001']
  return {
    id: '',
    siteId: master.siteId,
    atmId: master.atmId,
    franchiseeName: master.franchiseName,
    franchiseeNo: master.franchiseNo,
    cashLiveDate: '01/08/2025',
    clfStatus: '1st',
    hpyAccount: master.hpyAccount,
    clfAmount: '2,50,000',
    paymentDate: '18-10-2026',
    transferTime: '12:00 PM',
    frBank: master.bankName,
    holder: master.holder,
    utr: '',
    settlementBank: 'Axis Indent',

    hpyCode: master.hpyCode,
    transactionDate: '18-10-2026',
    nameAsPerPan: master.nameAsPerPan,
    panNumber: master.panNumber,
    accountNumber: master.accountNumber,
    beneficiaryName: master.beneficiaryName,
    bankName: master.bankName,
    ifscCode: master.ifscCode,

    paymentType: 'NEFT',
    clfCount: '1st',
    senderName: '',
    senderContact: '',
    senderAccountNumber: '',
    senderIfsc: '',
    isDraft: false,
  }
}
