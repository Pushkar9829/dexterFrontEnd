// Shared site / ATM registry for the CBR + Finance modules (Phase 6).
// Canonical: FR-MH-00124 "Shree Sai Financial Services", site ST-MH-PUN-00124 "Kothrud · Paud Road", ATM DX-MH-01482, Garnet Model.

export type CbrSite = {
  siteId: string
  loi: string
  atmId: string
  location: string
  city: string
  model: 'Garnet Model' | 'Sapphire Model' | 'Topaz Model' | 'Emerald Model'
  make: 'Hitachi' | 'NCR' | 'Hyosung' | 'Diebold Nixdorf'
  bank: string
  franchiseId: string
}

export type FranchiseeInfo = {
  id: string
  name: string
  contact: string
  pan: string
  panName: string
  gstin: string
  bank: string
  ifsc: string
  accNo: string
  sapCode: string
  short: string
}

export const FRANCHISEES: FranchiseeInfo[] = [
  { id: 'FR-MH-00124', name: 'Shree Sai Financial Services', short: 'SSFS', contact: '9822041124', pan: 'AAKFS4821K', panName: 'SHREE SAI FINANCIAL SERVICES', gstin: '27AAKFS4821K1Z6', bank: 'HDFC Bank', ifsc: 'HDFC0001834', accNo: '50200041821124', sapCode: '410124' },
  { id: 'FR-GJ-00218', name: 'Patel Cash Solutions', short: 'PCS', contact: '9825021867', pan: 'AAPFP7310R', panName: 'PATEL CASH SOLUTIONS', gstin: '24AAPFP7310R1Z2', bank: 'ICICI Bank', ifsc: 'ICIC0000218', accNo: '021805004712', sapCode: '410218' },
  { id: 'FR-KA-00076', name: 'Namma ATM Network', short: 'NAN', contact: '9845007612', pan: 'AADCN5562L', panName: 'NAMMA ATM NETWORK PRIVATE LIMITED', gstin: '29AADCN5562L1ZQ', bank: 'Axis Bank', ifsc: 'UTIB0000076', accNo: '917020047600761', sapCode: '410076' },
  { id: 'FR-UP-00305', name: 'Awadh Banking Point', short: 'ABP', contact: '9415030518', pan: 'ABEFA9024M', panName: 'AWADH BANKING POINT', gstin: '09ABEFA9024M1Z8', bank: 'State Bank of India', ifsc: 'SBIN0003051', accNo: '38810030519', sapCode: '410305' },
  { id: 'FR-WB-00183', name: 'Bengal Rural Payments', short: 'BRP', contact: '9433018307', pan: 'AAJFB2219C', panName: 'BENGAL RURAL PAYMENTS', gstin: '19AAJFB2219C1ZK', bank: 'Punjab National Bank', ifsc: 'PUNB0183100', accNo: '1831002100018307', sapCode: '410183' },
]

export const SITES: CbrSite[] = [
  { siteId: 'ST-MH-PUN-00124', loi: 'LOI-MH-PUN-00124', atmId: 'DX-MH-01482', location: 'Kothrud · Paud Road', city: 'Pune', model: 'Garnet Model', make: 'Hitachi', bank: 'Axis Bank', franchiseId: 'FR-MH-00124' },
  { siteId: 'ST-MH-PUN-00131', loi: 'LOI-MH-PUN-00131', atmId: 'DX-MH-01497', location: 'Baner · Balewadi Phata', city: 'Pune', model: 'Sapphire Model', make: 'Hitachi', bank: 'Axis Bank', franchiseId: 'FR-MH-00124' },
  { siteId: 'ST-MH-PUN-00138', loi: 'LOI-MH-PUN-00138', atmId: 'DX-MH-01503', location: 'Hadapsar · Magarpatta Road', city: 'Pune', model: 'Topaz Model', make: 'NCR', bank: 'Axis Bank', franchiseId: 'FR-MH-00124' },
  { siteId: 'ST-MH-PUN-00142', loi: 'LOI-MH-PUN-00142', atmId: 'DX-MH-01511', location: 'Wakad · Datta Mandir Road', city: 'Pune', model: 'Emerald Model', make: 'Hitachi', bank: 'Axis Bank', franchiseId: 'FR-MH-00124' },
  { siteId: 'ST-GJ-AMD-00218', loi: 'LOI-GJ-AMD-00218', atmId: 'DX-GJ-02187', location: 'Navrangpura · CG Road', city: 'Ahmedabad', model: 'Garnet Model', make: 'Hyosung', bank: 'Axis Bank', franchiseId: 'FR-GJ-00218' },
  { siteId: 'ST-GJ-AMD-00224', loi: 'LOI-GJ-AMD-00224', atmId: 'DX-GJ-02193', location: 'Maninagar · Jawahar Chowk', city: 'Ahmedabad', model: 'Topaz Model', make: 'Hitachi', bank: 'Axis Bank', franchiseId: 'FR-GJ-00218' },
  { siteId: 'ST-KA-BLR-00076', loi: 'LOI-KA-BLR-00076', atmId: 'DX-KA-00761', location: 'Jayanagar 4th Block', city: 'Bengaluru', model: 'Sapphire Model', make: 'NCR', bank: 'Axis Bank', franchiseId: 'FR-KA-00076' },
  { siteId: 'ST-KA-BLR-00081', loi: 'LOI-KA-BLR-00081', atmId: 'DX-KA-00768', location: 'Whitefield · ITPL Main Road', city: 'Bengaluru', model: 'Garnet Model', make: 'Diebold Nixdorf', bank: 'Axis Bank', franchiseId: 'FR-KA-00076' },
  { siteId: 'ST-UP-LKO-00305', loi: 'LOI-UP-LKO-00305', atmId: 'DX-UP-03051', location: 'Hazratganj · Ashok Marg', city: 'Lucknow', model: 'Emerald Model', make: 'Hitachi', bank: 'Axis Bank', franchiseId: 'FR-UP-00305' },
  { siteId: 'ST-UP-LKO-00309', loi: 'LOI-UP-LKO-00309', atmId: 'DX-UP-03058', location: 'Gomti Nagar · Vibhuti Khand', city: 'Lucknow', model: 'Garnet Model', make: 'Hyosung', bank: 'Axis Bank', franchiseId: 'FR-UP-00305' },
  { siteId: 'ST-WB-NDA-00183', loi: 'LOI-WB-NDA-00183', atmId: 'DX-WB-01831', location: 'Krishnanagar · Station Road', city: 'Nadia', model: 'Topaz Model', make: 'Hitachi', bank: 'Axis Bank', franchiseId: 'FR-WB-00183' },
  { siteId: 'ST-WB-HGL-00187', loi: 'LOI-WB-HGL-00187', atmId: 'DX-WB-01836', location: 'Chinsurah · GT Road', city: 'Hooghly', model: 'Sapphire Model', make: 'NCR', bank: 'Axis Bank', franchiseId: 'FR-WB-00183' },
]

export const getSite = (id: string) => SITES.find((s) => s.siteId === id)
export const getFranchisee = (id: string) => FRANCHISEES.find((f) => f.id === id)
export const franchiseeOf = (s: CbrSite) => getFranchisee(s.franchiseId)!

/** Deterministic PRNG so seeds are stable between reloads. */
export function rng(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** "₹ 1,23,456" — blank / non-numeric → '' */
export const rupee = (v: string | number | null | undefined) => {
  if (v === '' || v == null) return ''
  const n = Number(v)
  return Number.isNaN(n) ? '' : `${n < 0 ? '−' : ''}₹ ${Math.abs(n).toLocaleString('en-IN')}`
}

/** Indian grouping without the currency symbol. */
export const grp = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-IN')}`

/** ISO yyyy-mm-dd → dd/mm/yyyy */
export const dmy = (iso: string) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')
/** ISO yyyy-mm-dd → dd.mm.yyyy (mobile CBR style) */
export const dotDate = (iso: string) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '')
