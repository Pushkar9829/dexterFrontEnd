import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'

export interface DailyValues {
  [date: string]: {
    cashCount: string
    dispensedAmt: string
    nonCashCount: string
    depositCount: string
    depositAmt: string
    totalTxns: string
    totalAmt: string
    issuedIndent: string
    revisedIndent: string
    withdrawalAmt: string
    loadedAmt: string
  }
}

export interface AtmTxnRecord {
  id: string
  atmId: string
  siteId: string
  name: string
  model: string
  type: 'SF' | 'FFM'
  cashLiveDate: string
  lastMonth: {
    txnCount: string
    txnAmt: string
  }
  currentMonth: {
    txnCount: string
    txnAmt: string
  }
  dailyValues: DailyValues
}

export const KNOWN_ATMS: Omit<AtmTxnRecord, 'id' | 'dailyValues'>[] = [
  {
    atmId: 'ATM-100234',
    siteId: 'ST-MH-PUN-00124',
    name: 'Om Sai Enterprises',
    model: 'Garnet Model',
    type: 'SF',
    cashLiveDate: '12.04.2025',
    lastMonth: { txnCount: '2350', txnAmt: '3 CR' },
    currentMonth: { txnCount: '1170', txnAmt: '2 CR' },
  },
  {
    atmId: 'ATM-100235',
    siteId: 'ST-KA-BLR-00125',
    name: 'Balaji Financial Services',
    model: 'Sapphire Model',
    type: 'FFM',
    cashLiveDate: '15.06.2025',
    lastMonth: { txnCount: '2840', txnAmt: '3.6 CR' },
    currentMonth: { txnCount: '1420', txnAmt: '2.4 CR' },
  },
  {
    atmId: 'ATM-100236',
    siteId: 'ST-TN-CHN-00126',
    name: 'Shree Ganesh Associates',
    model: 'Diamond Model',
    type: 'SF',
    cashLiveDate: '20.08.2025',
    lastMonth: { txnCount: '1980', txnAmt: '2.5 CR' },
    currentMonth: { txnCount: '980', txnAmt: '1.6 CR' },
  },
  {
    atmId: 'ATM-100237',
    siteId: 'ST-DL-DEL-00127',
    name: 'Apex Logistics & Fin',
    model: 'Platinum Model',
    type: 'FFM',
    cashLiveDate: '05.09.2025',
    lastMonth: { txnCount: '3120', txnAmt: '4.1 CR' },
    currentMonth: { txnCount: '1590', txnAmt: '2.8 CR' },
  },
  {
    atmId: 'ATM-100238',
    siteId: 'ST-MH-MUM-00128',
    name: 'Star FinTech Solutions',
    model: 'Garnet Model',
    type: 'SF',
    cashLiveDate: '10.10.2025',
    lastMonth: { txnCount: '2650', txnAmt: '3.4 CR' },
    currentMonth: { txnCount: '1310', txnAmt: '2.1 CR' },
  },
]

export const WEEK_DATES = [
  { date: '16.10.2026', day: 'Fri' },
  { date: '17.10.2026', day: 'Sat' },
  { date: '18.10.2026', day: 'Sun' },
  { date: '19.10.2026', day: 'Mon' },
  { date: '20.10.2026', day: 'Tue' },
  { date: '21.10.2026', day: 'Wed' },
  { date: '22.10.2026', day: 'Thu' },
]

export const PARTICULAR_LABELS = [
  { key: 'cashCount', label: 'Total Card & UPI Cash Count' },
  { key: 'dispensedAmt', label: 'Total Card & UPI Dispensed AMT' },
  { key: 'nonCashCount', label: 'Total Card & UPI Non Cash Count' },
  { key: 'depositCount', label: 'Total Card & UPI Deposit Count' },
  { key: 'depositAmt', label: 'Total Card & UPI Deposit Amount' },
  { key: 'totalTxns', label: 'Total TXNs' },
  { key: 'totalAmt', label: 'Total Amount' },
  { key: 'issuedIndent', label: 'Issued Indent' },
  { key: 'revisedIndent', label: 'Revised Indent' },
  { key: 'withdrawalAmt', label: 'Withdrawal Amount' },
  { key: 'loadedAmt', label: 'Loaded Amount' },
] as const

const INITIAL_RECORDS: AtmTxnRecord[] = [
  {
    id: 'TXN-001',
    atmId: 'ATM-100234',
    siteId: 'ST-MH-PUN-00124',
    name: 'Om Sai Enterprises',
    model: 'Garnet Model',
    type: 'SF',
    cashLiveDate: '12.04.2025',
    lastMonth: { txnCount: '2350', txnAmt: '3 CR' },
    currentMonth: { txnCount: '1170', txnAmt: '2 CR' },
    dailyValues: {
      '16.10.2026': {
        cashCount: '142',
        dispensedAmt: '4,26,000',
        nonCashCount: '28',
        depositCount: '35',
        depositAmt: '1,05,000',
        totalTxns: '205',
        totalAmt: '5,31,000',
        issuedIndent: '5,00,000',
        revisedIndent: '5,00,000',
        withdrawalAmt: '4,50,000',
        loadedAmt: '5,00,000',
      },
      '17.10.2026': {
        cashCount: '165',
        dispensedAmt: '4,95,000',
        nonCashCount: '31',
        depositCount: '42',
        depositAmt: '1,26,000',
        totalTxns: '238',
        totalAmt: '6,21,000',
        issuedIndent: '5,00,000',
        revisedIndent: '5,00,000',
        withdrawalAmt: '4,80,000',
        loadedAmt: '5,00,000',
      },
      '18.10.2026': {
        cashCount: '180',
        dispensedAmt: '5,40,000',
        nonCashCount: '35',
        depositCount: '38',
        depositAmt: '1,14,000',
        totalTxns: '253',
        totalAmt: '6,54,000',
        issuedIndent: '6,00,000',
        revisedIndent: '6,00,000',
        withdrawalAmt: '5,20,000',
        loadedAmt: '6,00,000',
      },
      '19.10.2026': {
        cashCount: '155',
        dispensedAmt: '4,65,000',
        nonCashCount: '26',
        depositCount: '29',
        depositAmt: '87,000',
        totalTxns: '210',
        totalAmt: '5,52,000',
        issuedIndent: '5,00,000',
        revisedIndent: '5,00,000',
        withdrawalAmt: '4,60,000',
        loadedAmt: '5,00,000',
      },
      '20.10.2026': {
        cashCount: '149',
        dispensedAmt: '4,47,000',
        nonCashCount: '29',
        depositCount: '33',
        depositAmt: '99,000',
        totalTxns: '211',
        totalAmt: '5,46,000',
        issuedIndent: '5,00,000',
        revisedIndent: '5,00,000',
        withdrawalAmt: '4,40,000',
        loadedAmt: '5,00,000',
      },
      '21.10.2026': {
        cashCount: '160',
        dispensedAmt: '4,80,000',
        nonCashCount: '30',
        depositCount: '36',
        depositAmt: '1,08,000',
        totalTxns: '226',
        totalAmt: '5,88,000',
        issuedIndent: '5,00,000',
        revisedIndent: '5,00,000',
        withdrawalAmt: '4,75,000',
        loadedAmt: '5,00,000',
      },
      '22.10.2026': {
        cashCount: '172',
        dispensedAmt: '5,16,000',
        nonCashCount: '34',
        depositCount: '40',
        depositAmt: '1,20,000',
        totalTxns: '246',
        totalAmt: '6,36,000',
        issuedIndent: '6,00,000',
        revisedIndent: '6,00,000',
        withdrawalAmt: '5,10,000',
        loadedAmt: '6,00,000',
      },
    },
  },
  {
    id: 'TXN-002',
    atmId: 'ATM-100235',
    siteId: 'ST-KA-BLR-00125',
    name: 'Balaji Financial Services',
    model: 'Sapphire Model',
    type: 'FFM',
    cashLiveDate: '15.06.2025',
    lastMonth: { txnCount: '2840', txnAmt: '3.6 CR' },
    currentMonth: { txnCount: '1420', txnAmt: '2.4 CR' },
    dailyValues: {
      '16.10.2026': {
        cashCount: '190',
        dispensedAmt: '5,70,000',
        nonCashCount: '42',
        depositCount: '48',
        depositAmt: '1,44,000',
        totalTxns: '280',
        totalAmt: '7,14,000',
        issuedIndent: '6,50,000',
        revisedIndent: '6,50,000',
        withdrawalAmt: '5,60,000',
        loadedAmt: '6,50,000',
      },
      '17.10.2026': {
        cashCount: '210',
        dispensedAmt: '6,30,000',
        nonCashCount: '46',
        depositCount: '52',
        depositAmt: '1,56,000',
        totalTxns: '308',
        totalAmt: '7,86,000',
        issuedIndent: '7,00,000',
        revisedIndent: '7,00,000',
        withdrawalAmt: '6,20,000',
        loadedAmt: '7,00,000',
      },
      '18.10.2026': {
        cashCount: '225',
        dispensedAmt: '6,75,000',
        nonCashCount: '50',
        depositCount: '55',
        depositAmt: '1,65,000',
        totalTxns: '330',
        totalAmt: '8,40,000',
        issuedIndent: '7,50,000',
        revisedIndent: '7,50,000',
        withdrawalAmt: '6,60,000',
        loadedAmt: '7,50,000',
      },
      '19.10.2026': {
        cashCount: '185',
        dispensedAmt: '5,55,000',
        nonCashCount: '38',
        depositCount: '44',
        depositAmt: '1,32,000',
        totalTxns: '267',
        totalAmt: '6,87,000',
        issuedIndent: '6,00,000',
        revisedIndent: '6,00,000',
        withdrawalAmt: '5,40,000',
        loadedAmt: '6,00,000',
      },
      '20.10.2026': {
        cashCount: '195',
        dispensedAmt: '5,85,000',
        nonCashCount: '41',
        depositCount: '46',
        depositAmt: '1,38,000',
        totalTxns: '282',
        totalAmt: '7,23,000',
        issuedIndent: '6,50,000',
        revisedIndent: '6,50,000',
        withdrawalAmt: '5,70,000',
        loadedAmt: '6,50,000',
      },
      '21.10.2026': {
        cashCount: '202',
        dispensedAmt: '6,06,000',
        nonCashCount: '44',
        depositCount: '49',
        depositAmt: '1,47,000',
        totalTxns: '295',
        totalAmt: '7,53,000',
        issuedIndent: '6,50,000',
        revisedIndent: '6,50,000',
        withdrawalAmt: '5,95,000',
        loadedAmt: '6,50,000',
      },
      '22.10.2026': {
        cashCount: '215',
        dispensedAmt: '6,45,000',
        nonCashCount: '48',
        depositCount: '53',
        depositAmt: '1,59,000',
        totalTxns: '316',
        totalAmt: '8,04,000',
        issuedIndent: '7,00,000',
        revisedIndent: '7,00,000',
        withdrawalAmt: '6,35,000',
        loadedAmt: '7,00,000',
      },
    },
  },
]

export interface TxnState {
  records: AtmTxnRecord[]
}

export const txnStore = createStore<TxnState>('dexter.txnData.v1', () => ({
  records: INITIAL_RECORDS,
}))

export const useTxnStore = () => txnStore.use()

export function saveTxnRecord(record: AtmTxnRecord) {
  txnStore.set((s) => {
    const exists = s.records.some((r) => r.atmId === record.atmId)
    if (exists) {
      return {
        records: s.records.map((r) => (r.atmId === record.atmId ? record : r)),
      }
    }
    return { records: [record, ...s.records] }
  })
}

export function exportWeeklyCsv(record: AtmTxnRecord, filename: string) {
  const headers = ['S.N.', 'ATM ID', 'FR Name', 'Particulars', ...WEEK_DATES.map((d) => `${d.date} (${d.day})`)]
  const rows = PARTICULAR_LABELS.map((p, idx) => {
    return [
      String(idx + 1),
      record.atmId,
      record.name,
      p.label,
      ...WEEK_DATES.map((d) => record.dailyValues[d.date]?.[p.key] || '—'),
    ]
  })
  downloadCsv(filename, headers, rows)
}
