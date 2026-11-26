// Shared site / ATM registry for the CBR + Finance modules (Phase 6).
// Sites are Site Master sites (SITE-MH-0001 / DXMH70007); the old demo IDs are kept as legacySiteId / legacyAtmId aliases.
import { allSites, siteAt } from '@/lib/siteRef'
import type { Site } from './network'

export type CbrSite = {
  siteId: string
  loi: string
  atmId: string
  location: string
  city: string
  model: 'Garnet Model' | 'Sapphire Model' | 'Topaz Model' | 'Emerald Model'
  make: 'Hitachi' | 'NCR' | 'Hyosung' | 'Diebold Nixdorf'
  bank: string
  franchiseId: string // billing franchisee (FRANCHISEES) used by Finance
  frId?: string // Site Master franchise of the site
  state?: string
  legacySiteId?: string
  legacyAtmId?: string
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

// Legacy CBR demo sites (old module-specific IDs) → re-pointed at real Site Master sites (Franchise spec §2 / §8.7).
// Each row picks a Full Funding (FFM) site of the same franchisee where the Site Master has one, else one in the same state.
// [legacy site id, legacy ATM id, model, make, billing franchisee id, state]
const LEGACY_ROWS: [string, string, CbrSite['model'], CbrSite['make'], string, string][] = [
  ['ST-MH-PUN-00124', 'DX-MH-01482', 'Garnet Model', 'Hitachi', 'FR-MH-00124', 'Maharashtra'],
  ['ST-MH-PUN-00131', 'DX-MH-01497', 'Sapphire Model', 'Hitachi', 'FR-MH-00124', 'Maharashtra'],
  ['ST-MH-PUN-00138', 'DX-MH-01503', 'Topaz Model', 'NCR', 'FR-MH-00124', 'Maharashtra'],
  ['ST-MH-PUN-00142', 'DX-MH-01511', 'Emerald Model', 'Hitachi', 'FR-MH-00124', 'Maharashtra'],
  ['ST-GJ-AMD-00218', 'DX-GJ-02187', 'Garnet Model', 'Hyosung', 'FR-GJ-00218', 'Gujarat'],
  ['ST-GJ-AMD-00224', 'DX-GJ-02193', 'Topaz Model', 'Hitachi', 'FR-GJ-00218', 'Gujarat'],
  ['ST-KA-BLR-00076', 'DX-KA-00761', 'Sapphire Model', 'NCR', 'FR-KA-00076', 'Karnataka'],
  ['ST-KA-BLR-00081', 'DX-KA-00768', 'Garnet Model', 'Diebold Nixdorf', 'FR-KA-00076', 'Karnataka'],
  ['ST-UP-LKO-00305', 'DX-UP-03051', 'Emerald Model', 'Hitachi', 'FR-UP-00305', 'Uttar Pradesh'],
  ['ST-UP-LKO-00309', 'DX-UP-03058', 'Garnet Model', 'Hyosung', 'FR-UP-00305', 'Uttar Pradesh'],
  ['ST-WB-NDA-00183', 'DX-WB-01831', 'Topaz Model', 'Hitachi', 'FR-WB-00183', 'West Bengal'],
  ['ST-WB-HGL-00187', 'DX-WB-01836', 'Sapphire Model', 'NCR', 'FR-WB-00183', 'West Bengal'],
]

/** Pick the k-th Site Master site matching the first non-empty filter (deterministic). */
export function pickSite(k: number, ...filters: ((s: Site) => boolean)[]): Site {
  for (const f of filters) if (allSites().some(f)) return siteAt(k, f)
  return siteAt(k)
}

function buildSites(): CbrSite[] {
  const used = new Set<string>()
  return LEGACY_ROWS.map(([legacySiteId, legacyAtmId, model, make, franchiseId, state]) => {
    const free = (x: Site) => !used.has(x.siteId)
    const s = pickSite(0, (x) => free(x) && x.frId === franchiseId && x.siteType === 'FFM', (x) => free(x) && x.state === state && x.siteType === 'FFM', (x) => free(x) && x.state === state)
    used.add(s.siteId)
    return {
      siteId: s.siteId,
      loi: `LOI-${s.siteId.replace(/^SITE-/, '')}`,
      atmId: s.atmId,
      location: s.location,
      city: s.district,
      model,
      make,
      bank: s.account?.bank ?? 'Axis Bank',
      franchiseId,
      frId: s.frId,
      state: s.state,
      legacySiteId,
      legacyAtmId,
    }
  })
}

export const SITES: CbrSite[] = buildSites()

/** Old module-specific Site / ATM IDs (ST-MH-PUN-00124, DX-MH-01482) → the Site Master site they now point at. */
const LEGACY_INDEX = new Map<string, CbrSite>(SITES.flatMap((s) => [[s.legacySiteId!.toUpperCase(), s], [s.legacyAtmId!.toUpperCase(), s]] as [string, CbrSite][]))
export const legacyCbrSite = (id: string) => LEGACY_INDEX.get(id.trim().toUpperCase())

/** Any Site Master site (API mode: daily CBR records reference live sites outside the legacy demo list). */
function fromSiteMaster(id: string): CbrSite | undefined {
  const k = id.trim().toLowerCase()
  const s = allSites().find((x) => x.siteId.toLowerCase() === k || x.atmId.toLowerCase() === k)
  if (!s) return undefined
  return { siteId: s.siteId, loi: `LOI-${s.siteId.replace(/^SITE-/, '')}`, atmId: s.atmId, location: s.location, city: s.district, model: 'Garnet Model', make: 'NCR', bank: s.account?.bank ?? '—', franchiseId: s.frId, frId: s.frId, state: s.state }
}

export const getSite = (id: string) => SITES.find((s) => s.siteId === id) ?? legacyCbrSite(id) ?? fromSiteMaster(id)
export const getFranchisee = (id: string) => FRANCHISEES.find((f) => f.id === id)
/** Billing franchisee of a site; Site Master franchises outside the demo list get a minimal stand-in. */
export const franchiseeOf = (s: CbrSite): FranchiseeInfo =>
  getFranchisee(s.franchiseId) ?? { id: s.franchiseId, name: s.franchiseId, short: s.franchiseId, contact: '', pan: '', panName: '', gstin: '', bank: s.bank, ifsc: '', accNo: '', sapCode: '' }

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
