// In-browser payout file reader: CSV and .xlsx without dependencies.
// .xlsx is a zip: read the End-Of-Central-Directory, walk the central directory, inflate the
// needed entries with DecompressionStream('deflate-raw'), then parse the sheet XML with DOMParser.
import { toPaise, ZERO_DED, type Deductions, type Paise, type TxnData } from '@/data/payout'

export type Grid = string[][]

// ── CSV ──────────────────────────────────────────────────────────────────
export function parseCsv(text: string): Grid {
  const rows: Grid = []
  let row: string[] = []
  let cell = ''
  let q = false
  const s = text.replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (q) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"'
          i++
        } else q = false
      } else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

// ── ZIP ──────────────────────────────────────────────────────────────────
type ZipEntry = { name: string; method: number; compSize: number; localOffset: number }

function zipEntries(buf: ArrayBuffer): ZipEntry[] {
  const dv = new DataView(buf)
  let eocd = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 22 - 65535); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Not a valid .xlsx (zip directory not found).')
  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  const dec = new TextDecoder()
  const out: ZipEntry[] = []
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Corrupt zip central directory.')
    const method = dv.getUint16(p + 10, true)
    const compSize = dv.getUint32(p + 20, true)
    const nLen = dv.getUint16(p + 28, true)
    const xLen = dv.getUint16(p + 30, true)
    const cLen = dv.getUint16(p + 32, true)
    const localOffset = dv.getUint32(p + 42, true)
    const name = dec.decode(new Uint8Array(buf, p + 46, nLen))
    out.push({ name, method, compSize, localOffset })
    p += 46 + nLen + xLen + cLen
  }
  return out
}

async function readEntry(buf: ArrayBuffer, e: ZipEntry): Promise<string> {
  const dv = new DataView(buf)
  if (dv.getUint32(e.localOffset, true) !== 0x04034b50) throw new Error(`Corrupt zip entry ${e.name}.`)
  const start = e.localOffset + 30 + dv.getUint16(e.localOffset + 26, true) + dv.getUint16(e.localOffset + 28, true)
  const data = new Uint8Array(buf.slice(start, start + e.compSize))
  if (e.method === 0) return new TextDecoder().decode(data)
  if (e.method !== 8) throw new Error(`Unsupported zip compression (${e.method}).`)
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new TextDecoder().decode(await new Response(stream).arrayBuffer())
}

// ── XLSX ─────────────────────────────────────────────────────────────────
const byLocal = (root: Document | Element, tag: string) => Array.from(root.getElementsByTagNameNS('*', tag))
const xml = (s: string) => {
  const d = new DOMParser().parseFromString(s, 'application/xml')
  if (d.getElementsByTagName('parsererror').length) throw new Error('Workbook XML could not be read.')
  return d
}
const colIndex = (ref: string) => {
  const letters = ref.replace(/\d+/g, '')
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}
/** text of an <si>/<is> node, skipping phonetic runs */
const richText = (el: Element) =>
  byLocal(el, 't')
    .filter((t) => !t.parentElement || t.parentElement.localName !== 'rPh')
    .map((t) => t.textContent ?? '')
    .join('')

export async function readXlsx(buf: ArrayBuffer): Promise<Grid> {
  const entries = zipEntries(buf)
  const find = (n: string) => entries.find((e) => e.name.toLowerCase() === n.toLowerCase())
  // first sheet via workbook.xml + rels; fallback sheet1.xml
  let sheetPath = 'xl/worksheets/sheet1.xml'
  const wb = find('xl/workbook.xml')
  const rels = find('xl/_rels/workbook.xml.rels')
  if (wb && rels) {
    const first = byLocal(xml(await readEntry(buf, wb)), 'sheet')[0]
    const rid = first?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ?? first?.getAttribute('r:id')
    const rel = byLocal(xml(await readEntry(buf, rels)), 'Relationship').find((r) => r.getAttribute('Id') === rid)
    const target = rel?.getAttribute('Target')
    if (target) sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
  }
  const sheetEntry = find(sheetPath) ?? entries.find((e) => /^xl\/worksheets\/[^/]+\.xml$/i.test(e.name))
  if (!sheetEntry) throw new Error('No worksheet found in the workbook.')
  const ssEntry = find('xl/sharedStrings.xml')
  const shared = ssEntry ? byLocal(xml(await readEntry(buf, ssEntry)), 'si').map(richText) : []
  const sheet = xml(await readEntry(buf, sheetEntry))
  const grid: Grid = []
  byLocal(sheet, 'row').forEach((r, ri) => {
    const rn = Number(r.getAttribute('r')) || ri + 1
    const row: string[] = []
    byLocal(r, 'c').forEach((c, ci) => {
      const ref = c.getAttribute('r')
      const idx = ref ? colIndex(ref) : ci
      const t = c.getAttribute('t')
      const v = byLocal(c, 'v')[0]?.textContent ?? ''
      let val = v
      if (t === 's') val = shared[Number(v)] ?? ''
      else if (t === 'inlineStr') {
        const is = byLocal(c, 'is')[0]
        val = is ? richText(is) : ''
      } else if (t === 'b') val = v === '1' ? 'TRUE' : 'FALSE'
      row[idx] = val
    })
    grid[rn - 1] = Array.from(row, (x) => x ?? '')
  })
  return Array.from(grid, (x) => x ?? [])
}

export async function readTable(file: File): Promise<Grid> {
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text())
  if (/\.xlsx$/i.test(file.name)) return readXlsx(await file.arrayBuffer())
  throw new Error('Only .csv and .xlsx are read in the browser (.xls is not supported — save as .xlsx).')
}

// ── header mapping (reference workbook layout) ───────────────────────────
export type Field =
  | 'month' | 'atmId' | 'model' | 'cashLiveDate' | 'siteId' | 'frName' | 'mfName' | 'smfName' | 'mfCode' | 'city' | 'state'
  | 'cash' | 'nonCash' | 'postCash' | 'postNonCash' | 'deposit' | 'mfRevenue' | 'gross'
  | 'fixedFee' | 'negativeFixedFee' | 'iciciSr' | 'ntPenalty' | 'alf' | 'recovery' | 'waiver' | 'netFranchisee'
  | 'pan' | 'accountNo' | 'additionalRecovery' | 'credit' | 'withoutTds' | 'taxPct' | 'taxAmt' | 'gst' | 'net'
  | 'remarks' | 'releaseDate' | 'creditStatus' | 'paidDate' | 'utr'
const ALIASES: Record<Field, string[]> = {
  month: ['month', 'payoutmonth'], atmId: ['atmid', 'atm', 'atmno'], model: ['model'], cashLiveDate: ['cashlivedate', 'livedate'], siteId: ['siteid'],
  frName: ['franchiseename', 'franchisee', 'franchisename'], mfName: ['masterfranchisee', 'mfname', 'mf'], smfName: ['supermf', 'supermasterfranchisee', 'smf'],
  mfCode: ['mfcode'], city: ['city'], state: ['state'],
  cash: ['cash', 'cashtxn'], nonCash: ['noncash', 'noncashtxn'], postCash: ['postcash'], postNonCash: ['postnoncash'], deposit: ['deposit', 'deposittxn'],
  mfRevenue: ['mfrevenue'], gross: ['franchiseegrossrevenue', 'grossrevenue', 'gross', 'totalpayout'],
  fixedFee: ['fixedfeecracost', 'fixedfee', 'cracost'], negativeFixedFee: ['negativefixedfee'], iciciSr: ['icicisrrecovery', 'icicisr'], ntPenalty: ['ntpenalty'],
  alf: ['alfcharges', 'alf'], recovery: ['recovery'], waiver: ['waiver'], netFranchisee: ['netfranchisee'],
  pan: ['pan', 'panno'], accountNo: ['accno', 'accountno', 'accountnumber', 'bankaccount'], additionalRecovery: ['additionalrecovery'], credit: ['creditamount', 'credit'],
  withoutTds: ['frpayoutwithouttds', 'payoutwithouttds'], taxPct: ['tdsgst', 'tdsgstpct', 'tdsgstpercent', 'tdspct', 'tds'], taxAmt: ['tdsgstamount', 'tdsamount', 'tdsgstamt'],
  gst: ['gst', 'gstamount'], net: ['netpayout', 'netpayoutamount', 'netamount'], remarks: ['remarks', 'remark'], releaseDate: ['releasedate'],
  creditStatus: ['creditstatus'], paidDate: ['paiddate'], utr: ['utr', 'utrno', 'utrnumber'],
}
export const normHeader = (h: string) => h.toLowerCase().replace(/%/g, '').replace(/[^a-z0-9]/g, '')

export type RawRow = { row: number; v: Partial<Record<Field, string>> }
/** Finds the header row (the one holding "ATM ID"), maps columns — first occurrence wins, so the
 * franchisee block is used and the later MF block of the reference workbook is ignored. */
export function mapGrid(grid: Grid): { rows: RawRow[]; mapped: Field[]; headerRow: number } {
  const hi = grid.slice(0, 20).findIndex((r) => r.some((c) => normHeader(c ?? '') === 'atmid'))
  if (hi < 0) throw new Error('Header row with "ATM ID" not found. Use the template headers.')
  const header = grid[hi].map((h) => normHeader(h ?? ''))
  const col: Partial<Record<Field, number>> = {}
  ;(Object.keys(ALIASES) as Field[]).forEach((f) => {
    for (const a of ALIASES[f]) {
      const i = header.indexOf(a)
      if (i >= 0 && (col[f] === undefined || i < col[f]!)) col[f] = i
    }
  })
  const mapped = Object.keys(col) as Field[]
  const rows: RawRow[] = []
  grid.slice(hi + 1).forEach((r, k) => {
    if (!r || r.every((c) => !String(c ?? '').trim())) return
    const v: Partial<Record<Field, string>> = {}
    mapped.forEach((f) => {
      v[f] = String(r[col[f]!] ?? '').trim()
    })
    rows.push({ row: hi + k + 2, v })
  })
  return { rows, mapped, headerRow: hi + 1 }
}

// ── value conversion ─────────────────────────────────────────────────────
/** number or null when blank / dash / not numeric */
export function num(s?: string): number | null {
  if (s === undefined) return null
  const t = s.replace(/[,₹\s]/g, '').replace(/%$/, '')
  if (!t || t === '-' || t === '—') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
const serialDate = (s?: string) => {
  const n = num(s)
  if (n !== null && n > 20000 && n < 80000) return new Date(Math.round((n - 25569) * 86400000)).toISOString().slice(0, 10)
  return s ?? ''
}
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
/** "Sep-26", "Sep 2026", "2026-09", Excel serial → "2026-09"; '' when unknown */
export function toMonth(s?: string): string {
  if (!s) return ''
  const d = serialDate(s)
  if (/^\d{4}-\d{2}/.test(d)) return d.slice(0, 7)
  const m = s.toLowerCase().match(/([a-z]{3})[a-z]*[\s'-]*(\d{2,4})/)
  if (m && MONTHS.includes(m[1])) {
    const y = m[2].length === 2 ? `20${m[2]}` : m[2]
    return `${y}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, '0')}`
  }
  return ''
}

export type FileRecord = {
  row: number
  atmId: string
  month: string
  siteId: string
  frName: string
  mfName: string
  smfName: string
  mfCode: string
  model: string
  cashLiveDate: string
  city: string
  state: string
  txn: TxnData
  ded: Deductions
  mfRevenue: Paise
  gross: Paise
  withoutTds: Paise
  taxPct: number
  taxAmt: Paise
  gst: Paise
  net: Paise
  pan: string
  accountNo?: string
  remarks?: string
  releaseDate?: string
  creditStatus?: 'Pending' | 'Credited' | 'Failed' | 'On Hold'
  paidDate?: string
  utr?: string
  missing: string[]
}

const CS = ['Pending', 'Credited', 'Failed', 'On Hold'] as const
export function toRecord(r: RawRow): FileRecord {
  const v = r.v
  const missing: string[] = []
  const count = (f: Field, label: string, required: boolean) => {
    const n = num(v[f])
    if (n === null && required) missing.push(label)
    return Math.max(0, Math.round(n ?? 0))
  }
  const money = (f: Field) => {
    const n = num(v[f])
    return n === null ? null : toPaise(n)
  }
  const txn: TxnData = { cash: count('cash', 'Cash', true), nonCash: count('nonCash', 'Non Cash', true), postCash: count('postCash', 'Post Cash', false), postNonCash: count('postNonCash', 'Post Non Cash', false), deposit: count('deposit', 'Deposit', false) }
  const ded: Deductions = { ...ZERO_DED }
  ;(['fixedFee', 'negativeFixedFee', 'iciciSr', 'ntPenalty', 'alf', 'recovery', 'waiver', 'additionalRecovery', 'credit'] as const).forEach((k) => {
    ded[k] = Math.abs(money(k) ?? 0)
  })
  let taxPct = num(v.taxPct) ?? 0
  if (taxPct > 0 && taxPct < 1 && !/%/.test(v.taxPct ?? '')) taxPct = Math.round(taxPct * 10000) / 100
  const gross = money('gross')
  let withoutTds = money('withoutTds')
  let taxAmt = money('taxAmt')
  let net = money('net')
  if (net === null && gross !== null) {
    // derive from the components when the file leaves the result blank
    const nf = gross - ded.fixedFee - ded.iciciSr - ded.ntPenalty - ded.alf - ded.recovery + ded.negativeFixedFee + ded.waiver
    withoutTds ??= nf - ded.additionalRecovery + ded.credit
    taxAmt ??= withoutTds > 0 ? Math.round((withoutTds * taxPct) / 100) : 0
    net = withoutTds - taxAmt
  }
  if (net === null) missing.push('Net Payout')
  if (gross === null) missing.push('Franchisee Gross Revenue')
  const cs = CS.find((c) => c.toLowerCase() === (v.creditStatus ?? '').toLowerCase())
  return {
    row: r.row, atmId: (v.atmId ?? '').toUpperCase(), month: toMonth(v.month), siteId: v.siteId ?? '', frName: v.frName ?? '', mfName: v.mfName ?? '', smfName: v.smfName ?? '', mfCode: v.mfCode ?? '',
    model: v.model ?? '', cashLiveDate: serialDate(v.cashLiveDate), city: v.city ?? '', state: v.state ?? '', txn, ded, mfRevenue: money('mfRevenue') ?? 0, gross: gross ?? 0,
    withoutTds: withoutTds ?? net ?? 0, taxPct, taxAmt: taxAmt ?? 0, gst: money('gst') ?? 0, net: net ?? 0, pan: (v.pan ?? '').toUpperCase(), accountNo: v.accountNo || undefined,
    remarks: v.remarks || undefined, releaseDate: v.releaseDate ? serialDate(v.releaseDate) : undefined, creditStatus: cs, paidDate: v.paidDate ? serialDate(v.paidDate) : undefined,
    utr: v.utr && v.utr !== '-' ? v.utr : undefined, missing,
  }
}
