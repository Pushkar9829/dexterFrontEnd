// Financial Report sheets (Figma: Reports > Financial Report — BS, Axis & ICD, CLF, SD, FFM EOD, Overage deposit, DLR2, DLR3).
// Every sheet is an imported Excel sheet stored as typed string rows; persisted per report in localStorage.
import { createStore } from '@/lib/store'

export type Row = { id: string } & Record<string, string>

// ── Shared sample network (canonical demo entities) ──────────────────────
export type SiteRef = {
  frId: string
  franchise: string
  mf: string // master franchise
  state: string
  city: string
  location: string
  siteId: string
  atmId: string
  hitachi: string
  holder: string
  phone: string
  email: string
  bank: string
  ifsc: string
  account: string
}

export const SITES: SiteRef[] = [
  { frId: 'FR-MH-00124', franchise: 'Shree Sai Financial Services', mf: 'Shree Sai Financial Services', state: 'Maharashtra', city: 'Pune', location: 'Kothrud · Paud Road', siteId: 'ST-MH-PUN-00124', atmId: 'DX-MH-01482', hitachi: 'HT-MH-48211', holder: 'Sandeep Kulkarni', phone: '9822041765', email: 'shreesai.fin@gmail.com', bank: 'HDFC Bank', ifsc: 'HDFC0001234', account: '50200012347316' },
  { frId: 'FR-MH-00124', franchise: 'Shree Sai Financial Services', mf: 'Shree Sai Financial Services', state: 'Maharashtra', city: 'Pune', location: 'MG Road, Pune', siteId: 'SITE-1024', atmId: 'ATM-MH-1024', hitachi: 'HT-MH-48236', holder: 'Sandeep Kulkarni', phone: '9822041765', email: 'shreesai.fin@gmail.com', bank: 'HDFC Bank', ifsc: 'HDFC0001234', account: '50200012347316' },
  { frId: 'FR-MH-00124', franchise: 'Shree Sai Financial Services', mf: 'Shree Sai Financial Services', state: 'Maharashtra', city: 'Pune', location: 'Kothrud Depot', siteId: 'SITE-1045', atmId: 'ATM-MH-1045', hitachi: 'HT-MH-48257', holder: 'Sandeep Kulkarni', phone: '9822041765', email: 'shreesai.fin@gmail.com', bank: 'HDFC Bank', ifsc: 'HDFC0001234', account: '50200012347316' },
  { frId: 'FR-GJ-00218', franchise: 'Patel Cash Solutions', mf: 'Patel Cash Solutions', state: 'Gujarat', city: 'Ahmedabad', location: 'Maninagar Cross Road', siteId: 'ST-GJ-AHM-00218', atmId: 'DX-GJ-00731', hitachi: 'HT-GJ-31907', holder: 'Hitesh Patel', phone: '9898123407', email: 'patelcash.amd@gmail.com', bank: 'ICICI Bank', ifsc: 'ICIC0000318', account: '031801504412' },
  { frId: 'FR-KA-00076', franchise: 'Namma ATM Network', mf: 'Namma ATM Network', state: 'Karnataka', city: 'Bengaluru', location: 'Yelahanka New Town', siteId: 'ST-KA-BEN-00076', atmId: 'DX-KA-00412', hitachi: 'HT-KA-22760', holder: 'Raghavendra Rao', phone: '9845067231', email: 'accounts@nammaatm.in', bank: 'Canara Bank', ifsc: 'CNRB0002741', account: '2741101009873' },
  { frId: 'FR-UP-00305', franchise: 'Awadh Banking Point', mf: 'Capital ATM Partners', state: 'Uttar Pradesh', city: 'Lucknow', location: 'Aminabad Market', siteId: 'ST-UP-LUC-00305', atmId: 'DX-UP-00958', hitachi: 'HT-UP-55012', holder: 'Imran Siddiqui', phone: '9839012875', email: 'awadh.bp@gmail.com', bank: 'State Bank of India', ifsc: 'SBIN0000125', account: '38291045562' },
  { frId: 'FR-WB-00183', franchise: 'Bengal Rural Payments', mf: 'Bengal Rural Payments', state: 'West Bengal', city: 'Kolkata', location: 'Barasat Station Road', siteId: 'ST-WB-KOL-00183', atmId: 'DX-WB-00227', hitachi: 'HT-WB-60418', holder: 'Subhashis Ghosh', phone: '9831045529', email: 'bengalrural.pay@gmail.com', bank: 'Axis Bank', ifsc: 'UTIB0000005', account: '918020047731256' },
  { frId: 'FR-MP-00312', franchise: 'Malwa Financial Network', mf: 'Malwa Financial Network', state: 'Madhya Pradesh', city: 'Indore', location: 'Rau Pithampur Road', siteId: 'ST-MP-IND-00312', atmId: 'MPBP013404', hitachi: 'HT-MP-13404', holder: 'Ravi Malviya', phone: '9826031148', email: 'malwa.fn@gmail.com', bank: 'Bank of Baroda', ifsc: 'BARB0INDORE', account: '29380100012844' },
  { frId: 'FR-TN-00142', franchise: 'Southern Cash Services', mf: 'Southern Cash Services', state: 'Tamil Nadu', city: 'Chennai', location: 'Tambaram West', siteId: 'ST-TN-CHE-00142', atmId: 'DX-TN-00315', hitachi: 'HT-TN-70126', holder: 'Karthik Subramanian', phone: '9840012376', email: 'southerncash.chn@gmail.com', bank: 'Indian Bank', ifsc: 'IDIB000T012', account: '6712045891' },
  { frId: 'FR-RJ-00267', franchise: 'Pink City Finserve', mf: 'Capital ATM Partners', state: 'Rajasthan', city: 'Jaipur', location: 'Sanganer Bazaar', siteId: 'ST-RJ-JAI-00267', atmId: 'DX-RJ-00189', hitachi: 'HT-RJ-80233', holder: 'Mahendra Sharma', phone: '9829045610', email: 'pinkcity.finserve@gmail.com', bank: 'HDFC Bank', ifsc: 'HDFC0000267', account: '50100267331842' },
  { frId: 'FR-DL-00091', franchise: 'Capital ATM Partners', mf: 'Capital ATM Partners', state: 'Delhi', city: 'New Delhi', location: 'Laxmi Nagar Metro', siteId: 'ST-DL-NDL-00091', atmId: 'DX-DL-00544', hitachi: 'HT-DL-90155', holder: 'Ankit Bansal', phone: '9811034572', email: 'capitalatm.ops@gmail.com', bank: 'Kotak Mahindra Bank', ifsc: 'KKBK0000172', account: '7712039845' },
  { frId: 'FR-TS-00156', franchise: 'Deccan Cash Connect', mf: 'Deccan Cash Connect', state: 'Telangana', city: 'Hyderabad', location: 'Kukatpally Housing Board', siteId: 'ST-TS-HYD-00156', atmId: 'DX-TS-00663', hitachi: 'HT-TS-41580', holder: 'Srinivas Reddy', phone: '9849027713', email: 'deccancash.hyd@gmail.com', bank: 'Union Bank of India', ifsc: 'UBIN0815632', account: '156310100044127' },
]

export function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}
const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)]
const round = (n: number, to = 100) => Math.round(n / to) * to
const pad = (n: number, w = 2) => String(n).padStart(w, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

// ── Enumerations from the source sheets ───────────────────────────────────
export const AC_STATUS = ['Current Account', 'Axis Indent', 'ICICI SR']
export const UPLOAD_STATUS = ['Uploaded', 'Pending', 'Not uploaded']
export const CLF_STATUS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']
export const SETTLEMENT_BANKS = ['Axis Indent', 'WLA Account', 'ICICI SR', 'HDFC', 'SBI']
export const PAYMENT_TYPES = ['NEFT', 'RTGS', 'IMPS']
export const DEPOSIT_MODES = ['Cash deposit', 'NEFT', 'IMPS', 'UPI']
export const FIN_YEARS = ['24-25', '25-26', '26-27']

export const fyMonths = (fy: string) => {
  const y = Number(fy.slice(0, 2))
  const names = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
  return names.map((m, i) => `${m}-${i < 9 ? y : y + 1}`)
}

// ── BS ────────────────────────────────────────────────────────────────────
function seedBs(): Row[] {
  const r = rng(41)
  const out: Row[] = []
  const actions = ['Upload monthly statement in Apna App', 'Share stamped bank statement', 'Re-upload — statement period incomplete', 'No action required', 'Link WLA account in Apna App']
  for (const fy of FIN_YEARS) {
    const months = fyMonths(fy)
    SITES.forEach((s, i) => {
      if (fy === '24-25' && i > 8) return
      const upload = fy === '26-27' ? pick(r, ['Uploaded', 'Uploaded', 'Pending', 'Not uploaded']) : pick(r, ['Uploaded', 'Uploaded', 'Uploaded', 'Pending'])
      const y = 2000 + Number(fy.slice(0, 2)) - (i % 3)
      out.push({
        id: `BS-${fy}-${i + 1}`,
        fy,
        month: months[fy === '26-27' ? Math.min(5, i % 6) : i % 12],
        hitachi: s.hitachi,
        atmId: s.atmId,
        location: s.location,
        franchise: s.franchise,
        contact: s.phone,
        state: s.state,
        clDate: iso(y, 1 + ((i * 5) % 12), 3 + ((i * 7) % 25)),
        acStatus: AC_STATUS[i % 3],
        upload,
        action: upload === 'Uploaded' ? 'No action required' : pick(r, actions.filter((a) => a !== 'No action required')),
        remark: upload === 'Uploaded' ? 'Verified by Finance' : upload === 'Pending' ? 'Reminder sent to franchise' : '',
      })
    })
  }
  return out
}
export const bsStore = createStore<Row[]>('dexter.reports.bs.v1', seedBs)

// ── Axis & ICD ────────────────────────────────────────────────────────────
function seedAxis(): Row[] {
  return SITES.map((s, i) => ({
    id: `AX-${i + 1}`,
    mf: s.mf,
    atmId: s.atmId,
    franchise: s.franchise,
    mobile: s.phone,
    email: s.email,
    altEmail: i % 3 === 1 ? '' : `${s.holder.split(' ')[0].toLowerCase()}.${s.holder.split(' ')[1].toLowerCase()}@outlook.com`,
  }))
}
export const axisStore = createStore<Row[]>('dexter.reports.axis-icd.v1', seedAxis)

// ── CLF ───────────────────────────────────────────────────────────────────
function seedClf(): Row[] {
  const r = rng(77)
  const rows: Row[] = []
  SITES.forEach((s, i) => {
    const count = i < 3 ? 2 : 1
    for (let k = 0; k < count; k++) {
      const bank = SETTLEMENT_BANKS[(i + k) % SETTLEMENT_BANKS.length]
      const pd = iso(2026, 7 + ((i + k) % 3), 2 + ((i * 3 + k * 9) % 26))
      rows.push({
        id: `CLF-${i + 1}-${k + 1}`,
        siteId: s.siteId,
        atmId: s.atmId,
        franchiseeName: s.franchise,
        franchiseeNo: s.phone,
        cashLiveDate: iso(2025, 1 + (i % 12), 5 + (i % 20)),
        clfStatus: CLF_STATUS[Math.min(9, k + (i % 4))],
        hpyAccount: `9200${pad(31045 + i * 17, 6)}${pad(i, 2)}`,
        clfAmount: String(round(150000 + r() * 250000, 1000)),
        paymentDate: pd,
        transferTime: `${pad(10 + Math.floor(r() * 8))}:${pad(Math.floor(r() * 60))}`,
        frBank: s.bank,
        holder: s.holder,
        utr: `${s.ifsc.slice(0, 4)}${pick(r, ['N', 'R', 'H'])}${pd.replace(/-/g, '')}${pad(Math.floor(r() * 99999), 5)}`,
        settlementBank: bank,
      })
    }
  })
  return rows
}
export const clfStore = createStore<Row[]>('dexter.reports.clf.v1', seedClf)

// ── SD (all franchises) ───────────────────────────────────────────────────
function seedSd(): Row[] {
  const r = rng(19)
  const rows: Row[] = []
  SITES.forEach((s, i) => {
    const parts = i === 0 || i === 4 ? 2 : 1
    for (let k = 0; k < parts; k++) {
      const pd = iso(2026, 4 + ((i + k * 2) % 6), 4 + ((i * 5 + k) % 24))
      const type = PAYMENT_TYPES[(i + k) % 3]
      rows.push({
        id: `SD-${i + 1}-${k + 1}`,
        siteId: s.siteId,
        atmId: s.atmId,
        franchiseeName: s.franchise,
        franchiseeNo: s.phone,
        cashLiveDate: iso(2026, 5 + (i % 5), 10 + (i % 15)),
        hpyAccount: `9200${pad(31045 + i * 17, 6)}${pad(i, 2)}`,
        paymentType: type,
        paymentDate: pd,
        transferTime: `${pad(10 + Math.floor(r() * 8))}:${pad(Math.floor(r() * 60))}`,
        txnNumber: `${type === 'RTGS' ? s.ifsc.slice(0, 4) + 'R' : s.ifsc.slice(0, 4) + 'N'}${pd.replace(/-/g, '')}${pad(Math.floor(r() * 99999), 5)}`,
        amount: parts === 2 ? '125000' : '250000',
        frBank: s.bank,
        holder: s.holder,
        frAccount: s.account,
        frIfsc: s.ifsc,
      })
    }
  })
  return rows
}
export const sdReportStore = createStore<Row[]>('dexter.reports.sd.v1', seedSd)

// ── FFM EOD (full funding sites, per month) ───────────────────────────────
export const FFM_MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09']

const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate()
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return `${new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' })} ${y}`
}
/** "31.07.2026" (previous month end) and "31.08.2026" (month end) for a YYYY-MM month */
export const monthEnds = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  const py = m === 1 ? y - 1 : y
  const pm = m === 1 ? 12 : m - 1
  return {
    opening: `${pad(lastDay(py, pm))}.${pad(pm)}.${py}`,
    closing: `${pad(lastDay(y, m))}.${pad(m)}.${y}`,
  }
}

function seedFfm(): Row[] {
  const r = rng(5)
  const rows: Row[] = []
  SITES.slice(0, 10).forEach((s, i) => {
    let dms = round(280000 + r() * 260000)
    let phys = dms + pick(r, [0, 0, 0, 500, 1000])
    for (const ym of FFM_MONTHS) {
      const hpy = round(1800000 + r() * 1400000, 1000)
      const frLoad = round(hpy * (0.08 + r() * 0.1), 1000)
      const dispense = round(hpy + frLoad - (r() - 0.5) * 120000)
      const closeDms = Math.max(60000, dms + hpy + frLoad - dispense)
      const delta = pick(r, [0, 0, 0, 0, 500, 1500, -200])
      const closePhys = closeDms + delta
      rows.push({
        id: `FFM-${ym}-${i + 1}`,
        month: ym,
        atmId: s.atmId,
        frName: s.franchise,
        openDms: String(dms),
        openPhys: String(phys),
        openOverage: String(Math.max(0, phys - dms)),
        hpyFund: String(hpy),
        frLoading: String(frLoad),
        apnaDispense: String(dispense),
        actualMachine: String(closeDms),
        closeDms: String(closeDms),
        closePhys: String(closePhys),
        closeOverage: String(Math.max(0, closePhys - closeDms)),
      })
      dms = closeDms
      phys = closePhys
    }
  })
  return rows
}
export const ffmStore = createStore<Row[]>('dexter.reports.ffm-eod.v1', seedFfm)

// ── Overage deposit ───────────────────────────────────────────────────────
export type Attachment = { name: string; size: number; dataUrl?: string; uploadedAt: string; by: string }

function seedOverage(): Row[] {
  const r = rng(63)
  const rows: Row[] = []
  for (let i = 0; i < 14; i++) {
    const s = SITES[(i * 5) % SITES.length]
    const d = iso(2026, 8 + Math.floor(i / 6), 2 + ((i * 4) % 26))
    const mode = DEPOSIT_MODES[i % 4]
    const utr = mode === 'Cash deposit' ? `CDM${d.replace(/-/g, '').slice(2)}${pad(Math.floor(r() * 9999), 4)}` : mode === 'UPI' ? `${Math.floor(400000000000 + r() * 99999999999)}` : `${s.ifsc.slice(0, 4)}N${d.replace(/-/g, '')}${pad(Math.floor(r() * 99999), 5)}`
    rows.push({
      id: `OD-${i + 1}`,
      depositDate: d,
      atmId: s.atmId,
      frName: s.franchise,
      amount: String(pick(r, [500, 1000, 1500, 2000, 3500, 5000, 800, 1200])),
      mode,
      utr,
      attached: i % 5 === 3 ? '' : JSON.stringify({ name: `${s.atmId}_overage_${d}.pdf`, size: 80000 + Math.floor(r() * 300000), uploadedAt: d, by: s.holder } satisfies Attachment),
      email: s.email,
    })
  }
  return rows
}
export const overageStore = createStore<Row[]>('dexter.reports.overage-deposit.v1', seedOverage)

export const parseAttachment = (v: string): Attachment | null => {
  if (!v) return null
  try {
    return JSON.parse(v) as Attachment
  } catch {
    return { name: v, size: 0, uploadedAt: '', by: '' }
  }
}

// ── Formatting / maths shared by the sheets ───────────────────────────────
export const inr = (v: string | number) => {
  const n = Number(v)
  return v === '' || v == null || Number.isNaN(n) ? '' : `₹ ${n.toLocaleString('en-IN')}`
}
export const dmy = (isoDate: string) => (/^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate.split('-').reverse().join('.') : isoDate)

/** "100×12 / 200×5 / 500×20" → 11,200 (null when the text has no deno pairs) */
export function denoTotal(text: string): number | null {
  const re = /(\d+)\s*[×x*]\s*(\d+)/gi
  let total = 0
  let found = false
  for (const m of text.matchAll(re)) {
    total += Number(m[1]) * Number(m[2])
    found = true
  }
  return found ? total : null
}
