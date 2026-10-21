// Unified Reports Hub: 6 categories · 44 reports, each with a live preview grid; saved views and scheduled exports.
import { createStore } from '@/lib/store'
import type { Franchise } from './franchises'
import { SITES, rng } from './reportsFinancial'

export type CategoryId = 'financial' | 'franchise' | 'kyc' | 'operations' | 'onboarding' | 'governance'
export type PCol = { key: string; label: string; kind?: 'money' | 'date' | 'datetime' | 'status' | 'pct' | 'num' }
export type PRow = Record<string, string | number>
type Ctx = { frs: Franchise[] }

export type ReportDef = {
  id: string
  name: string
  category: CategoryId
  desc: string
  /** financial sheets open their own page */
  to?: string
  /** "Open in data grid" target when a full grid page exists */
  gridTo?: string
  dateKey?: string
  source?: string
  columns?: PCol[]
  build?: (c: Ctx) => PRow[]
}

export const CATEGORIES: { id: CategoryId; name: string; kpi: string }[] = [
  { id: 'financial', name: 'Financial Reports', kpi: '₹12.8 Cr settled · 99.2% reconciliation rate' },
  { id: 'franchise', name: 'Franchise Performance', kpi: '1,284 partners · 93.9% active network' },
  { id: 'kyc', name: 'KYC Audits', kpi: '96.3% compliant · 47 KYCs pending' },
  { id: 'operations', name: 'Operations & Uptime', kpi: '98.7% ATM uptime · 24 open incidents' },
  { id: 'onboarding', name: 'Onboarding Analytics', kpi: '248 applications · 3.2 day average approval' },
  { id: 'governance', name: 'Governance & Security', kpi: '2,418 audited events · No critical alerts' },
]

/** Reference "today" of the sample data set. */
export const REF_DATE = '2026-10-14'
const pad = (n: number) => String(n).padStart(2, '0')
const ago = (days: number, hh = 9, mm = 0) => {
  const d = new Date(2026, 9, 14 - days, hh, mm)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hh)}:${pad(mm)}`
}
const day = (days: number) => ago(days).slice(0, 10)
const gen = <T,>(n: number, seed: number, f: (i: number, r: () => number) => T) => {
  const r = rng(seed)
  return Array.from({ length: n }, (_, i) => f(i, r))
}
const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)]
const site = (i: number) => SITES[i % SITES.length]
const USERS = [
  ['Paras Dubey', 'Super administrator'], ['Rahul Kumar', 'Employee · Verification'], ['Priya Menon', 'Team Leader'], ['Meera Iyer', 'Manager'],
  ['Suresh Nair', 'Head'], ['Vikram Shah', 'Finance'], ['Amit Jadhav', 'Engineer'], ['Neha Deshmukh', 'Relationship Manager'],
]
const pct = (n: number) => Math.round(n * 10) / 10

const fin = (id: string, name: string, desc: string): ReportDef => ({ id, name, category: 'financial', desc, to: `/reports/financial/${id}` })

export const REPORTS: ReportDef[] = [
  // ── Financial Reports (12) ─────────────────────────────────────────────
  {
    id: 'cash-reconciliation', name: 'Cash Reconciliation', category: 'financial', desc: 'Switch vs physical cash per ATM per EOD', dateKey: 'date', source: 'EOD & CBR uploads',
    columns: [{ key: 'date', label: 'Date', kind: 'date' }, { key: 'atm', label: 'ATM ID' }, { key: 'fr', label: 'Franchise' }, { key: 'sw', label: 'Switch balance', kind: 'money' }, { key: 'ph', label: 'Physical cash', kind: 'money' }, { key: 'diff', label: 'Difference', kind: 'money' }, { key: 'st', label: 'Status', kind: 'status' }],
    build: () => gen(24, 3, (i, r) => {
      const sw = Math.round((180000 + r() * 260000) / 100) * 100
      const diff = pick(r, [0, 0, 0, 0, 500, -200, 1000])
      return { date: day(Math.floor(i / 3) * 4), atm: site(i).atmId, fr: site(i).franchise, sw, ph: sw + diff, diff, st: diff === 0 ? 'Matched' : diff > 0 ? 'Overage' : 'Shortage' }
    }),
  },
  {
    id: 'settlement-payouts', gridTo: '/finance/payout', name: 'Settlement & Payouts', category: 'financial', desc: 'Franchise payouts by LOI and settlement account', dateKey: 'date', source: 'Payout register',
    columns: [{ key: 'id', label: 'Payout ID' }, { key: 'loi', label: 'LOI Code' }, { key: 'atm', label: 'ATM ID' }, { key: 'fr', label: 'Franchise' }, { key: 'amt', label: 'Amount', kind: 'money' }, { key: 'bank', label: 'Bank' }, { key: 'date', label: 'Date', kind: 'date' }, { key: 'st', label: 'Status', kind: 'status' }],
    build: () => gen(20, 5, (i, r) => ({ id: `PAY-2026-${pad(310 + i)}`, loi: `LOI-${site(i).siteId.slice(3, 5)}-${2100 + i * 7}`, atm: site(i).atmId, fr: site(i).franchise, amt: Math.round((42000 + r() * 90000) / 10) * 10, bank: site(i).bank, date: day(i * 3), st: pick(r, ['Paid', 'Paid', 'Paid', 'Pending', 'On hold']) })),
  },
  {
    id: 'revenue-commission', name: 'Revenue & Commission', category: 'financial', desc: 'Monthly interchange revenue and franchise commission', dateKey: 'date', source: 'Switch MIS',
    columns: [{ key: 'date', label: 'Month', kind: 'date' }, { key: 'txn', label: 'Transactions', kind: 'num' }, { key: 'rev', label: 'Interchange revenue', kind: 'money' }, { key: 'com', label: 'Franchise commission', kind: 'money' }, { key: 'net', label: 'Net revenue', kind: 'money' }, { key: 'mom', label: 'MoM %', kind: 'pct' }],
    build: () => gen(12, 7, (i, r) => {
      const d = new Date(2026, 9 - i, 1)
      const txn = Math.round(410000 + r() * 90000 - i * 6000)
      const rev = txn * 17
      const com = Math.round(rev * 0.42)
      return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, txn, rev, com, net: rev - com, mom: pct((r() - 0.35) * 9) }
    }),
  },
  {
    id: 'gst-summary', gridTo: '/finance/gst', name: 'GST Payment Summary', category: 'financial', desc: 'GST invoices, deductions and payment status per ATM', dateKey: 'date', source: 'GST register',
    columns: [{ key: 'fy', label: 'F. Year' }, { key: 'date', label: 'Invoice date', kind: 'date' }, { key: 'atm', label: 'ATM ID' }, { key: 'fr', label: 'Franchisee Name' }, { key: 'inv', label: 'Invoice Amount', kind: 'money' }, { key: 'net', label: 'Net Amount', kind: 'money' }, { key: 'st', label: 'GST Payment Status', kind: 'status' }],
    build: () => gen(16, 9, (i, r) => {
      const inv = Math.round((18000 + r() * 30000) / 10) * 10
      return { fy: '26-27', date: day(i * 6), atm: site(i).atmId, fr: site(i).franchise, inv, net: Math.round(inv * 0.97), st: pick(r, ['Done', 'Done', 'Pending']) }
    }),
  },
  fin('bs', 'BS', 'Franchise account statement & Apna App upload status'),
  fin('axis-icd', 'Axis & ICD', 'MF / franchise contacts for Axis & ICD'),
  fin('clf', 'CLF', 'CLF instalments, payment and sender details'),
  fin('sd', 'SD', 'Security deposit payments across franchises'),
  fin('ffm-eod', 'FFM EOD', 'Full funding sites month-end EOD positions'),
  fin('overage-deposit', 'Overage deposit', 'Overage deposits with UTR and proof'),
  fin('dlr2', 'DLR2', 'Daily funds, ATM cash and loading per ATM'),
  fin('dlr3', 'DLR3', 'Denomination-wise counter & settlement per ATM'),

  // ── Franchise Performance (8) ──────────────────────────────────────────
  {
    id: 'franchise-register', name: 'Franchise Network Register', category: 'franchise', desc: 'Every franchise with tier, location, ATMs and KYC', source: 'Live registry data', gridTo: '/franchise/master-data',
    columns: [{ key: 'id', label: 'Franchise ID' }, { key: 'name', label: 'Franchise name' }, { key: 'tier', label: 'Tier' }, { key: 'state', label: 'State' }, { key: 'city', label: 'City' }, { key: 'atms', label: 'ATMs', kind: 'num' }, { key: 'kyc', label: 'KYC status', kind: 'status' }, { key: 'status', label: 'Status', kind: 'status' }, { key: 'updated', label: 'Updated', kind: 'datetime' }],
    build: ({ frs }) => frs.map((f) => ({ id: f.id, name: f.name, tier: f.tier, state: f.state, city: f.city, atms: f.atms, kyc: f.kyc, status: f.status, updated: f.updatedAt })),
  },
  {
    id: 'revenue-ranking', name: 'Franchise Revenue Ranking', category: 'franchise', desc: 'Top franchises by monthly ATM revenue', source: 'Switch MIS · Sep 2026',
    columns: [{ key: 'rank', label: 'Rank', kind: 'num' }, { key: 'id', label: 'Franchise ID' }, { key: 'name', label: 'Franchise name' }, { key: 'tier', label: 'Tier' }, { key: 'atms', label: 'ATMs', kind: 'num' }, { key: 'rev', label: 'Monthly revenue', kind: 'money' }, { key: 'per', label: 'Revenue / ATM', kind: 'money' }],
    build: ({ frs }) => {
      const r = rng(13)
      return frs
        .filter((f) => f.status === 'Active')
        .map((f) => ({ f, rev: Math.round(f.atms * (52000 + r() * 30000)) }))
        .sort((a, b) => b.rev - a.rev)
        .slice(0, 50)
        .map(({ f, rev }, i) => ({ rank: i + 1, id: f.id, name: f.name, tier: f.tier, atms: f.atms, rev, per: Math.round(rev / f.atms) }))
    },
  },
  {
    id: 'tier-region', name: 'Tier & Region Performance', category: 'franchise', desc: 'Franchises, ATMs and KYC by tier and state', source: 'Live registry data',
    columns: [{ key: 'tier', label: 'Tier' }, { key: 'state', label: 'State' }, { key: 'n', label: 'Franchises', kind: 'num' }, { key: 'atms', label: 'ATMs', kind: 'num' }, { key: 'active', label: 'Active %', kind: 'pct' }, { key: 'kyc', label: 'KYC verified %', kind: 'pct' }],
    build: ({ frs }) => {
      const m = new Map<string, Franchise[]>()
      frs.forEach((f) => m.set(`${f.tier}|${f.state}`, [...(m.get(`${f.tier}|${f.state}`) ?? []), f]))
      return [...m.entries()].map(([k, list]) => {
        const [tier, state] = k.split('|')
        return { tier, state, n: list.length, atms: list.reduce((s, f) => s + f.atms, 0), active: pct((list.filter((f) => f.status === 'Active').length / list.length) * 100), kyc: pct((list.filter((f) => f.kyc === 'Verified').length / list.length) * 100) }
      }).sort((a, b) => String(a.tier).localeCompare(String(b.tier)) || b.n - a.n)
    },
  },
  {
    id: 'super-master-network', name: 'Super Master Network', category: 'franchise', desc: 'Super Master franchises and their ATM footprint', source: 'Live registry data', gridTo: '/franchise/super-master',
    columns: [{ key: 'id', label: 'Franchise ID' }, { key: 'name', label: 'Franchise name' }, { key: 'state', label: 'State' }, { key: 'city', label: 'City' }, { key: 'atms', label: 'ATMs', kind: 'num' }, { key: 'kyc', label: 'KYC status', kind: 'status' }, { key: 'updated', label: 'Updated', kind: 'datetime' }],
    build: ({ frs }) => frs.filter((f) => f.tier === 'Super Master').map((f) => ({ id: f.id, name: f.name, state: f.state, city: f.city, atms: f.atms, kyc: f.kyc, updated: f.updatedAt })),
  },
  {
    id: 'inactive-franchises', name: 'Inactive Franchises', category: 'franchise', desc: 'Franchises currently marked inactive', source: 'Live registry data',
    columns: [{ key: 'id', label: 'Franchise ID' }, { key: 'name', label: 'Franchise name' }, { key: 'tier', label: 'Tier' }, { key: 'city', label: 'City' }, { key: 'atms', label: 'ATMs', kind: 'num' }, { key: 'owner', label: 'Owner' }, { key: 'updated', label: 'Updated', kind: 'datetime' }],
    build: ({ frs }) => frs.filter((f) => f.status === 'Inactive').map((f) => ({ id: f.id, name: f.name, tier: f.tier, city: f.city, atms: f.atms, owner: f.owner, updated: f.updatedAt })),
  },
  {
    id: 'state-atm-distribution', name: 'State-wise ATM Distribution', category: 'franchise', desc: 'ATM count and share by state', source: 'Live registry data',
    columns: [{ key: 'state', label: 'State' }, { key: 'n', label: 'Franchises', kind: 'num' }, { key: 'atms', label: 'ATMs', kind: 'num' }, { key: 'avg', label: 'ATMs / franchise', kind: 'num' }, { key: 'share', label: 'Share of ATMs %', kind: 'pct' }],
    build: ({ frs }) => {
      const total = frs.reduce((s, f) => s + f.atms, 0) || 1
      const states = [...new Set(frs.map((f) => f.state))]
      return states.map((st) => {
        const l = frs.filter((f) => f.state === st)
        const atms = l.reduce((s, f) => s + f.atms, 0)
        return { state: st, n: l.length, atms, avg: pct(atms / l.length), share: pct((atms / total) * 100) }
      }).sort((a, b) => b.atms - a.atms)
    },
  },
  {
    id: 'recently-updated', name: 'Recently Updated Franchises', category: 'franchise', desc: 'Latest registry changes', dateKey: 'updated', source: 'Live registry data',
    columns: [{ key: 'updated', label: 'Updated', kind: 'datetime' }, { key: 'id', label: 'Franchise ID' }, { key: 'name', label: 'Franchise name' }, { key: 'tier', label: 'Tier' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status', kind: 'status' }],
    build: ({ frs }) => [...frs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 40).map((f) => ({ updated: f.updatedAt, id: f.id, name: f.name, tier: f.tier, owner: f.owner, status: f.status })),
  },
  {
    id: 'owner-portfolio', name: 'Relationship Owner Portfolio', category: 'franchise', desc: 'Franchises, ATMs and open KYC per owner', source: 'Live registry data',
    columns: [{ key: 'owner', label: 'Owner' }, { key: 'n', label: 'Franchises', kind: 'num' }, { key: 'atms', label: 'ATMs', kind: 'num' }, { key: 'kyc', label: 'KYC not verified', kind: 'num' }, { key: 'inactive', label: 'Inactive', kind: 'num' }],
    build: ({ frs }) => [...new Set(frs.map((f) => f.owner))].map((o) => {
      const l = frs.filter((f) => f.owner === o)
      return { owner: o, n: l.length, atms: l.reduce((s, f) => s + f.atms, 0), kyc: l.filter((f) => f.kyc !== 'Verified').length, inactive: l.filter((f) => f.status === 'Inactive').length }
    }),
  },

  // ── KYC Audits (6) ─────────────────────────────────────────────────────
  {
    id: 'kyc-status', name: 'KYC Verification Status', category: 'kyc', desc: 'KYC state of every franchise', source: 'KYC workspace', gridTo: '/kyc/verification',
    columns: [{ key: 'id', label: 'Franchise ID' }, { key: 'name', label: 'Franchise name' }, { key: 'tier', label: 'Tier' }, { key: 'kyc', label: 'KYC status', kind: 'status' }, { key: 'owner', label: 'Owner' }, { key: 'updated', label: 'Updated', kind: 'datetime' }],
    build: ({ frs }) => frs.map((f) => ({ id: f.id, name: f.name, tier: f.tier, kyc: f.kyc, owner: f.owner, updated: f.updatedAt })),
  },
  {
    id: 'document-expiry', name: 'Document Expiry Tracker', category: 'kyc', desc: 'Agreements and certificates nearing expiry', dateKey: 'expiry', source: 'KYC documents',
    columns: [{ key: 'id', label: 'Franchise ID' }, { key: 'name', label: 'Franchise name' }, { key: 'doc', label: 'Document' }, { key: 'expiry', label: 'Expiry date', kind: 'date' }, { key: 'days', label: 'Days left', kind: 'num' }, { key: 'st', label: 'Status', kind: 'status' }],
    build: ({ frs }) => gen(Math.min(36, frs.length), 17, (i, r) => {
      const f = frs[i]
      const days = Math.round(-20 + r() * 140)
      return { id: f.id, name: f.name, doc: pick(r, ['Rent agreement', 'GST certificate', 'Shop & establishment licence', 'Police verification', 'Bank mandate']), expiry: day(-days), days, st: days < 0 ? 'Expired' : days <= 30 ? 'Due in 30 days' : 'Valid' }
    }).sort((a, b) => a.days - b.days),
  },
  {
    id: 'compliance-exceptions', name: 'Compliance Exceptions', category: 'kyc', desc: 'Open KYC and compliance exceptions', dateKey: 'raised', source: 'Verification checks',
    columns: [{ key: 'ex', label: 'Exception ID' }, { key: 'id', label: 'Franchise ID' }, { key: 'name', label: 'Franchise name' }, { key: 'type', label: 'Exception' }, { key: 'raised', label: 'Raised on', kind: 'date' }, { key: 'owner', label: 'Owner' }, { key: 'st', label: 'Status', kind: 'status' }],
    build: ({ frs }) => gen(18, 19, (i, r) => {
      const f = frs[(i * 7) % frs.length]
      return { ex: `EX-${2400 + i}`, id: f.id, name: f.name, type: pick(r, ['PAN name mismatch', 'Aadhaar not linked to mobile', 'Bank proof unclear', 'GST registration inactive', 'Rent agreement unsigned']), raised: day(i * 2 + 1), owner: f.owner, st: pick(r, ['Open', 'Open', 'In review', 'Closed']) }
    }),
  },
  {
    id: 'pending-kyc-ageing', name: 'Pending KYC Ageing', category: 'kyc', desc: 'Days pending against the 48h review SLA', source: 'KYC workspace',
    columns: [{ key: 'id', label: 'Franchise ID' }, { key: 'name', label: 'Franchise name' }, { key: 'kyc', label: 'KYC status', kind: 'status' }, { key: 'since', label: 'Pending since', kind: 'date' }, { key: 'days', label: 'Days pending', kind: 'num' }, { key: 'sla', label: 'SLA', kind: 'status' }],
    build: ({ frs }) => frs.filter((f) => f.kyc !== 'Verified').slice(0, 47).map((f, i) => {
      const days = (i * 3) % 9
      return { id: f.id, name: f.name, kyc: f.kyc, since: day(days), days, sla: days > 2 ? 'Breached' : 'Within SLA' }
    }),
  },
  {
    id: 'pan-aadhaar-log', name: 'PAN / Aadhaar Verification Log', category: 'kyc', desc: 'Identity verification API calls and results', dateKey: 'time', source: 'Verification API',
    columns: [{ key: 'req', label: 'Request ID' }, { key: 'id', label: 'Franchise ID' }, { key: 'check', label: 'Check' }, { key: 'res', label: 'Result', kind: 'status' }, { key: 'by', label: 'Checked by' }, { key: 'time', label: 'Time', kind: 'datetime' }],
    build: ({ frs }) => gen(24, 23, (i, r) => ({ req: `VR-${88120 + i}`, id: frs[(i * 5) % frs.length].id, check: i % 2 ? 'Aadhaar' : 'PAN', res: pick(r, ['Verified', 'Verified', 'Verified', 'Mismatch', 'Failed']), by: pick(r, ['Rahul Kumar', 'Priya Menon', 'Meera Iyer']), time: ago(Math.floor(i / 3), 9 + (i % 8), (i * 13) % 60) })),
  },
  {
    id: 'kyc-rejections', name: 'KYC Rejections & Resubmissions', category: 'kyc', desc: 'Rejected KYC packs and resubmission state', dateKey: 'date', source: 'KYC workspace',
    columns: [{ key: 'app', label: 'KYC case' }, { key: 'name', label: 'Franchise name' }, { key: 'reason', label: 'Reason' }, { key: 'date', label: 'Rejected on', kind: 'date' }, { key: 'resub', label: 'Resubmitted' }, { key: 'st', label: 'Status', kind: 'status' }],
    build: ({ frs }) => gen(12, 29, (i, r) => ({ app: `FR-APP-${pad(1040 + i)}`, name: frs[(i * 11) % frs.length].name, reason: pick(r, ['Blurred PAN image', 'Cheque name mismatch', 'Expired rent agreement', 'Address proof missing']), date: day(i * 4 + 2), resub: i % 3 ? 'Yes' : 'No', st: i % 3 ? 'In review' : 'Pending' })),
  },

  // ── Operations & Uptime (9) ────────────────────────────────────────────
  {
    id: 'atm-availability', name: 'ATM Availability', category: 'operations', desc: 'Uptime and downtime per ATM this month', source: 'Switch & monitoring',
    columns: [{ key: 'atm', label: 'ATM ID' }, { key: 'site', label: 'Site' }, { key: 'state', label: 'State' }, { key: 'up', label: 'Uptime %', kind: 'pct' }, { key: 'down', label: 'Downtime (hrs)', kind: 'num' }, { key: 'inc', label: 'Incidents', kind: 'num' }, { key: 'st', label: 'Health', kind: 'status' }],
    build: () => SITES.map((s, i) => {
      const r = rng(31 + i)
      const up = pct(i === 3 ? 91.4 : 97 + r() * 3)
      return { atm: s.atmId, site: s.location, state: s.state, up, down: pct(((100 - up) / 100) * 14 * 24), inc: Math.round((100 - up) * 2), st: up >= 98 ? 'Healthy' : up >= 95 ? 'Degraded' : 'Down' }
    }),
  },
  {
    id: 'cash-replenishment', gridTo: '/cbr/consolidated', name: 'Cash Replenishment', category: 'operations', desc: 'Cash loading per ATM by CRA', dateKey: 'date', source: 'Daily CBR',
    columns: [{ key: 'date', label: 'Date', kind: 'date' }, { key: 'atm', label: 'ATM ID' }, { key: 'indent', label: 'Indent No' }, { key: 'amt', label: 'Amount loaded', kind: 'money' }, { key: 'cra', label: 'CRA' }, { key: 'eod', label: 'EOD time' }, { key: 'st', label: 'Status', kind: 'status' }],
    build: () => gen(24, 37, (i, r) => ({ date: day(Math.floor(i / 4)), atm: site(i).atmId, indent: `IND-${70412 + i * 3}`, amt: pick(r, [100000, 150000, 200000, 250000]), cra: pick(r, ['CMS Info Systems', 'SIS Prosegur', 'Writer Safeguard']), eod: `23:${pad(Math.floor(r() * 59))}`, st: pick(r, ['Completed', 'Completed', 'Completed', 'Pending']) })),
  },
  {
    id: 'incident-sla', gridTo: '/operations/complaints', name: 'Incident & SLA Analysis', category: 'operations', desc: 'Complaints against resolution SLA', dateKey: 'opened', source: 'Complaints',
    columns: [{ key: 'id', label: 'Complaint ID' }, { key: 'atm', label: 'ATM ID' }, { key: 'cat', label: 'Category' }, { key: 'pri', label: 'Priority' }, { key: 'opened', label: 'Opened', kind: 'datetime' }, { key: 'sla', label: 'Resolution SLA' }, { key: 'st', label: 'Status', kind: 'status' }],
    build: () => gen(24, 41, (i, r) => {
      const pri = pick(r, ['Critical', 'High', 'Medium', 'Low'])
      return { id: `CMP-${1048 - i}`, atm: i % 4 === 0 ? 'ATM-MH-1024' : i % 4 === 1 ? 'ATM-MH-1045' : site(i).atmId, cat: pick(r, ['Cash out', 'Card reader', 'Dispenser jam', 'V-SAT link down', 'UPS / power']), pri, opened: ago(Math.floor(i / 2), 8 + (i % 10), (i * 7) % 60), sla: pri === 'Critical' ? '4h' : pri === 'High' ? '8h' : pri === 'Medium' ? '24h' : '48h', st: pick(r, ['Open', 'Within SLA', 'Breached', 'Closed', 'Closed']) }
    }),
  },
  {
    id: 'cbr-upload', gridTo: '/cbr/eod-summary', name: 'CBR Upload Compliance', category: 'operations', desc: 'Daily CBR upload status per ATM', dateKey: 'date', source: 'CBR EOD summary',
    columns: [{ key: 'atm', label: 'ATM ID' }, { key: 'fr', label: 'Franchise' }, { key: 'date', label: 'CBR Date', kind: 'date' }, { key: 'st', label: 'CBR Uploaded', kind: 'status' }, { key: 'at', label: 'Uploaded at' }],
    build: () => gen(24, 43, (i, r) => {
      const up = r() > 0.2
      return { atm: site(i).atmId, fr: site(i).franchise, date: day(1 + Math.floor(i / 12)), st: up ? 'Uploaded' : 'Pending', at: up ? `0${7 + (i % 3)}:${pad((i * 11) % 60)}` : '—' }
    }),
  },
  {
    id: 'eod-status', name: 'EOD Submission Status', category: 'operations', desc: 'EOD time, switch and physical balances', dateKey: 'date', source: 'Consolidated datewise CBR',
    columns: [{ key: 'date', label: 'Date', kind: 'date' }, { key: 'atm', label: 'ATM ID' }, { key: 'eod', label: 'EOD Time' }, { key: 'sw', label: 'Switch Balance', kind: 'money' }, { key: 'ph', label: 'Physical Cash', kind: 'money' }, { key: 'st', label: 'Status', kind: 'status' }],
    build: () => gen(24, 47, (i, r) => {
      const sw = Math.round((120000 + r() * 200000) / 100) * 100
      const late = r() < 0.15
      return { date: day(Math.floor(i / 6)), atm: site(i).atmId, eod: late ? '00:4' + (i % 10) : `23:${pad(Math.floor(r() * 59))}`, sw, ph: sw - (r() < 0.1 ? 500 : 0), st: late ? 'Late' : 'Submitted' }
    }),
  },
  {
    id: 'loading-exceptions', name: 'Cash Loading Exceptions', category: 'operations', desc: 'Loads that differ from the indent', dateKey: 'date', source: 'Daily CBR',
    columns: [{ key: 'date', label: 'Date', kind: 'date' }, { key: 'atm', label: 'ATM ID' }, { key: 'exp', label: 'Indent amount', kind: 'money' }, { key: 'load', label: 'Loaded', kind: 'money' }, { key: 'diff', label: 'Difference', kind: 'money' }, { key: 'reason', label: 'Reason' }],
    build: () => gen(12, 53, (i, r) => {
      const exp = pick(r, [150000, 200000, 250000])
      const diff = -pick(r, [500, 2000, 10000, 50000])
      return { date: day(i * 2), atm: site(i * 5).atmId, exp, load: exp + diff, diff, reason: pick(r, ['Soiled notes returned', 'CRA short delivery', 'Cassette capacity', 'Indent revised']) }
    }),
  },
  {
    id: 'downtime-cause', name: 'Downtime by Cause', category: 'operations', desc: 'Downtime hours grouped by root cause', source: 'Complaints & monitoring · Oct 2026',
    columns: [{ key: 'cause', label: 'Cause' }, { key: 'inc', label: 'Incidents', kind: 'num' }, { key: 'hrs', label: 'Hours', kind: 'num' }, { key: 'share', label: 'Share %', kind: 'pct' }],
    build: () => {
      const rows = [['Cash out', 31, 64], ['V-SAT link down', 18, 52], ['Dispenser jam', 14, 29], ['UPS / power', 11, 38], ['Card reader', 9, 12], ['Scheduled maintenance', 6, 10]] as const
      const total = rows.reduce((s, r) => s + r[2], 0)
      return rows.map(([cause, inc, hrs]) => ({ cause, inc, hrs, share: pct((hrs / total) * 100) }))
    },
  },
  {
    id: 'field-visits', name: 'Field Visit Log', category: 'operations', desc: 'Engineer visits linked to complaints', dateKey: 'date', source: 'Complaints',
    columns: [{ key: 'fv', label: 'Visit ID' }, { key: 'cmp', label: 'Complaint' }, { key: 'atm', label: 'ATM ID' }, { key: 'eng', label: 'Engineer' }, { key: 'date', label: 'Visit date', kind: 'date' }, { key: 'out', label: 'Outcome', kind: 'status' }],
    build: () => gen(14, 59, (i, r) => ({ fv: `FV-${pad(2210 + i)}`, cmp: `CMP-${1048 - i * 2}`, atm: i % 2 ? 'ATM-MH-1045' : 'ATM-MH-1024', eng: pick(r, ['Amit Jadhav', 'Rohan Pawar', 'Sachin More']), date: day(i), out: pick(r, ['Resolved', 'Resolved', 'Part awaited', 'Revisit scheduled']) })),
  },
  {
    id: 'spare-parts', name: 'Spare Parts Consumption', category: 'operations', desc: 'Parts issued and stock per depot', source: 'Depot inventory',
    columns: [{ key: 'part', label: 'Part' }, { key: 'depot', label: 'Depot' }, { key: 'issued', label: 'Issued (30d)', kind: 'num' }, { key: 'stock', label: 'In stock', kind: 'num' }, { key: 'reorder', label: 'Reorder level', kind: 'num' }, { key: 'st', label: 'Status', kind: 'status' }],
    build: () => gen(12, 61, (_i, r) => {
      const stock = Math.floor(r() * 30)
      return { part: pick(r, ['Pick module', 'Card reader', 'Receipt printer', 'EPP keypad', 'UPS battery', 'Cassette']), depot: pick(r, ['Pune', 'Ahmedabad', 'Bengaluru', 'Lucknow']), issued: Math.floor(r() * 20), stock, reorder: 8, st: stock < 8 ? 'Reorder' : 'Healthy' }
    }),
  },

  // ── Onboarding Analytics (5) ───────────────────────────────────────────
  {
    id: 'application-funnel', name: 'Application Funnel', category: 'onboarding', desc: 'Applications by stage and conversion', source: 'Applications · F.Y. 26-27', gridTo: '/onboarding/applications',
    columns: [{ key: 'stage', label: 'Stage' }, { key: 'n', label: 'Applications', kind: 'num' }, { key: 'conv', label: 'Conversion %', kind: 'pct' }, { key: 'days', label: 'Avg days in stage', kind: 'num' }],
    build: () => [['Draft', 248, 1.4], ['Under review', 201, 2.1], ['KYC pending', 163, 3.2], ['Approved', 131, 0.8], ['Rejected', 22, 0]].map(([stage, n, days]) => ({ stage, n, conv: pct((Number(n) / 248) * 100), days })),
  },
  {
    id: 'approval-turnaround', name: 'Approval Turnaround', category: 'onboarding', desc: 'Submission-to-approval time against 48h SLA', dateKey: 'approved', source: 'Applications',
    columns: [{ key: 'app', label: 'Application' }, { key: 'type', label: 'Type' }, { key: 'sub', label: 'Submitted', kind: 'date' }, { key: 'approved', label: 'Approved', kind: 'date' }, { key: 'days', label: 'Days', kind: 'num' }, { key: 'sla', label: '48h SLA', kind: 'status' }],
    build: () => gen(20, 67, (i, r) => {
      const days = Math.max(1, Math.round(r() * 6))
      return { app: `APP-2026-${pad(248 - i)}`, type: pick(r, ['Franchise', 'Master Franchise', 'Super Master Franchise']), sub: day(i * 2 + days), approved: day(i * 2), days, sla: days <= 2 ? 'Met' : 'Breached' }
    }),
  },
  {
    id: 'applicant-sources', name: 'Applicant Sources', category: 'onboarding', desc: 'Where applications come from', source: 'Applications · F.Y. 26-27',
    columns: [{ key: 'src', label: 'Source' }, { key: 'n', label: 'Applications', kind: 'num' }, { key: 'ok', label: 'Approved', kind: 'num' }, { key: 'conv', label: 'Conversion %', kind: 'pct' }],
    build: () => [['Field sales (SSE / SSM)', 104, 61], ['Existing franchise referral', 58, 34], ['Website enquiry', 41, 14], ['Bank partner', 27, 15], ['Walk-in', 18, 7]].map(([src, n, ok]) => ({ src, n, ok, conv: pct((Number(ok) / Number(n)) * 100) })),
  },
  {
    id: 'site-readiness', name: 'Site Readiness', category: 'onboarding', desc: 'Project readiness checklist per site', source: 'Projects',
    columns: [{ key: 'site', label: 'Site ID' }, { key: 'loc', label: 'Location' }, { key: 'fr', label: 'Franchisee' }, { key: 'el', label: 'Electrical', kind: 'status' }, { key: 'vsat', label: 'V-SAT', kind: 'status' }, { key: 'live', label: 'Tech live', kind: 'status' }, { key: 'ready', label: 'Readiness %', kind: 'pct' }],
    build: () => SITES.map((s, i) => {
      const steps = [i % 4 !== 3, i % 3 !== 2, i % 5 === 0 || i % 2 === 0]
      return { site: s.siteId, loc: s.location, fr: s.franchise, el: steps[0] ? 'Done' : 'Pending', vsat: steps[1] ? 'Delivered' : 'Pending', live: steps[2] ? 'Done' : 'Pending', ready: pct((steps.filter(Boolean).length / 3) * 100) }
    }),
  },
  {
    id: 'rejected-applications', name: 'Rejected Applications', category: 'onboarding', desc: 'Rejections with reason', dateKey: 'date', source: 'Applications',
    columns: [{ key: 'app', label: 'Application' }, { key: 'name', label: 'Applicant' }, { key: 'type', label: 'Type' }, { key: 'date', label: 'Rejected on', kind: 'date' }, { key: 'reason', label: 'Reason' }],
    build: () => gen(10, 71, (i, r) => ({ app: `APP-2026-${pad(230 - i * 3)}`, name: pick(r, ['Om Sai Enterprises', 'Gram Seva Point', 'Metro Money Centre', 'Kisan Cash Services']), type: pick(r, ['Franchise', 'Master Franchise']), date: day(i * 5 + 1), reason: pick(r, ['Site frontage below minimum', 'Duplicate ATM within 500 m', 'Incomplete KYC', 'Power availability under 18 hrs']) })),
  },

  // ── Governance & Security (4) ──────────────────────────────────────────
  {
    id: 'audit-trail', gridTo: '/governance/audit', name: 'Audit Trail', category: 'governance', desc: 'Every create, update, approval and export', dateKey: 'time', source: 'Immutable audit log',
    columns: [{ key: 'time', label: 'Time', kind: 'datetime' }, { key: 'user', label: 'User' }, { key: 'role', label: 'Role' }, { key: 'module', label: 'Module' }, { key: 'event', label: 'Event' }, { key: 'out', label: 'Outcome', kind: 'status' }],
    build: () => gen(30, 73, (i, r) => {
      const u = pick(r, USERS)
      return { time: ago(Math.floor(i / 6), 18 - (i % 9), (i * 17) % 60), user: u[0], role: u[1], module: pick(r, ['Franchise', 'KYC', 'Legal', 'Reports', 'Finance', 'Tasks']), event: pick(r, ['Record updated', 'KYC approved', 'Report exported', 'Agreement uploaded', 'Payout released', 'Sign-in']), out: pick(r, ['Success', 'Success', 'Success', 'Rejected']) }
    }),
  },
  {
    id: 'user-sessions', gridTo: '/governance/sessions', name: 'User Access & Sessions', category: 'governance', desc: 'Active and recent sign-ins', dateKey: 'last', source: 'Session service',
    columns: [{ key: 'user', label: 'User' }, { key: 'role', label: 'Role' }, { key: 'device', label: 'Device' }, { key: 'ip', label: 'IP' }, { key: 'last', label: 'Last active', kind: 'datetime' }, { key: 'st', label: 'Status', kind: 'status' }],
    build: () => USERS.map(([user, role], i) => ({ user, role, device: i % 3 ? 'Chrome · Windows' : 'Safari · iPhone', ip: `103.21.${40 + i}.${(i * 37) % 255}`, last: ago(i % 3, 10 + i, (i * 9) % 60), st: i % 3 === 2 ? 'Expired' : 'Active' })),
  },
  {
    id: 'security-notices', gridTo: '/governance/security', name: 'Security & Policy Notices', category: 'governance', desc: 'Published notices and acknowledgement', dateKey: 'date', source: 'Notices',
    columns: [{ key: 'notice', label: 'Notice' }, { key: 'type', label: 'Type' }, { key: 'date', label: 'Published', kind: 'date' }, { key: 'aud', label: 'Audience' }, { key: 'ack', label: 'Acknowledged %', kind: 'pct' }],
    build: () => [
      ['Password rotation every 90 days', 'Policy', 3, 'All users', 92.4],
      ['OTP sign-in mandatory for Finance', 'Security', 9, 'Finance', 100],
      ['KYC review SLA set to 48 hours', 'SLA', 15, 'Verification', 88.1],
      ['Do not share CBR sheets over WhatsApp', 'Security', 22, 'All users', 76.5],
      ['Export of PAN data restricted', 'Policy', 34, 'Managers', 95],
    ].map(([notice, type, d, aud, ack]) => ({ notice, type, date: day(Number(d)), aud, ack })),
  },
  {
    id: 'export-activity', name: 'Export Activity Log', category: 'governance', desc: 'Report exports recorded in the audit trail', dateKey: 'time', source: 'Immutable audit log',
    columns: [{ key: 'time', label: 'Time', kind: 'datetime' }, { key: 'user', label: 'User' }, { key: 'report', label: 'Report' }, { key: 'fmt', label: 'Format' }, { key: 'rows', label: 'Rows', kind: 'num' }],
    build: () => gen(16, 79, (i, r) => ({ time: ago(Math.floor(i / 2), 11 + (i % 7), (i * 23) % 60), user: pick(r, USERS)[0], report: pick(r, ['Franchise Network Register', 'SD', 'CLF', 'Cash Reconciliation', 'Audit Trail', 'DLR2']), fmt: '.xlsx', rows: Math.floor(10 + r() * 1200) })),
  },
  {
    id: 'chargeback-disputes', name: 'Chargeback Disputes', category: 'operations', desc: 'Disputed ATM card transactions and chargebacks', dateKey: 'date', source: 'NPCI / Switch Disputes',
    columns: [{ key: 'id', label: 'Dispute ID' }, { key: 'atm', label: 'ATM ID' }, { key: 'card', label: 'Card Last 4' }, { key: 'date', label: 'Txn Date', kind: 'date' }, { key: 'amt', label: 'Amount', kind: 'money' }, { key: 'reason', label: 'Reason' }, { key: 'st', label: 'Status', kind: 'status' }],
    build: () => gen(16, 81, (i, r) => ({ id: `DISP-2026-${pad(501 + i)}`, atm: site(i).atmId, card: `••• ${1200 + i * 37}`, date: day(i * 2 + 1), amt: pick(r, [500, 1000, 2000, 5000, 10000]), reason: pick(r, ['Cash not dispensed', 'Partial dispense', 'Account debited twice', 'Timeout error']), st: pick(r, ['Open', 'Under Review', 'Represented', 'Settled', 'Closed']) })),
  },
  {
    id: 'apna-app', name: 'Apna App Uploads & Activity', category: 'operations', desc: 'Apna App sync, statement uploads and daily activity', dateKey: 'date', source: 'Apna App Mobile Sync',
    columns: [{ key: 'frId', label: 'Franchise ID' }, { key: 'name', label: 'Franchise Name' }, { key: 'ver', label: 'App Version' }, { key: 'date', label: 'Last Sync', kind: 'date' }, { key: 'uploads', label: 'Docs Uploaded', kind: 'num' }, { key: 'st', label: 'Sync Status', kind: 'status' }],
    build: ({ frs }) => frs.slice(0, 20).map((f, i) => ({ frId: f.id, name: f.name, ver: 'v2.4.1', date: day(i % 5), uploads: (i * 3) % 15 + 1, st: i % 4 === 0 ? 'Pending' : 'Synced' })),
  },
  {
    id: 'calling-report', name: 'Calling Report', category: 'franchise', desc: 'Partner calls, follow-ups and outreach log', dateKey: 'date', source: 'CRM Telephony Logs',
    columns: [{ key: 'callId', label: 'Call ID' }, { key: 'fr', label: 'Franchise' }, { key: 'caller', label: 'Caller' }, { key: 'date', label: 'Call Date', kind: 'date' }, { key: 'duration', label: 'Duration' }, { key: 'disp', label: 'Disposition', kind: 'status' }],
    build: () => gen(18, 83, (i, r) => ({ callId: `CALL-${8900 + i}`, fr: site(i).franchise, caller: pick(r, USERS)[0], date: day(i), duration: `${Math.floor(r() * 8) + 1}m ${Math.floor(r() * 59)}s`, disp: pick(r, ['Connected', 'Follow-up', 'Not Reachable', 'Resolved']) })),
  },
  {
    id: 'penalty-data', name: 'Penality Data', category: 'financial', desc: 'SLA breach deductions and penalty data register', dateKey: 'date', source: 'Operations & SLA Register',
    columns: [{ key: 'id', label: 'Penalty ID' }, { key: 'atm', label: 'ATM ID' }, { key: 'fr', label: 'Franchise' }, { key: 'date', label: 'Incident Date', kind: 'date' }, { key: 'amt', label: 'Penalty Amount', kind: 'money' }, { key: 'reason', label: 'SLA Breach Reason' }, { key: 'st', label: 'Status', kind: 'status' }],
    build: () => gen(14, 85, (i, r) => ({ id: `PEN-26-${pad(110 + i)}`, atm: site(i).atmId, fr: site(i).franchise, date: day(i * 3 + 1), amt: pick(r, [2500, 5000, 7500, 10000]), reason: pick(r, ['Downtime exceeded 8 hrs', 'Late CBR submission', 'Cash-out breach', 'Maintenance delay']), st: pick(r, ['Deducted', 'Under Dispute', 'Waived', 'Pending']) })),
  },
  {
    id: 'cbr-hamp', name: 'CBR HAMP Report', category: 'operations', desc: 'HAMP compliance cash balance reports per ATM', dateKey: 'date', source: 'Daily CBR & HAMP Switch',
    columns: [{ key: 'date', label: 'Date', kind: 'date' }, { key: 'atm', label: 'ATM ID' }, { key: 'fr', label: 'Franchise' }, { key: 'hampSw', label: 'HAMP Switch Bal', kind: 'money' }, { key: 'phys', label: 'Physical Cash', kind: 'money' }, { key: 'var', label: 'Variance', kind: 'money' }, { key: 'st', label: 'Compliance Status', kind: 'status' }],
    build: () => gen(20, 87, (i, r) => {
      const bal = Math.round((210000 + r() * 180000) / 100) * 100
      const variance = pick(r, [0, 0, 0, 0, 500, -500])
      return { date: day(Math.floor(i / 3)), atm: site(i).atmId, fr: site(i).franchise, hampSw: bal, phys: bal + variance, var: variance, st: variance === 0 ? 'Compliant' : 'Variance' }
    }),
  },
  {
    id: 'bank-statement', name: 'Bank Statement', category: 'financial', desc: 'Bank statements and reconciliation status', dateKey: 'date', source: 'Bank Integration Portal',
    columns: [{ key: 'acc', label: 'Account No' }, { key: 'bank', label: 'Bank Name' }, { key: 'fr', label: 'Franchise' }, { key: 'date', label: 'Stmt Date', kind: 'date' }, { key: 'bal', label: 'Closing Balance', kind: 'money' }, { key: 'st', label: 'Recon Status', kind: 'status' }],
    build: () => gen(16, 89, (i, r) => ({ acc: `9180200${pad(310 + i * 4)}`, bank: site(i).bank, fr: site(i).franchise, date: day(i * 2), bal: Math.round((45000 + r() * 210000) / 10) * 10, st: pick(r, ['Reconciled', 'Reconciled', 'Pending', 'Matched']) })),
  },
  {
    id: 'tds-letters', name: 'TDS Letters', category: 'financial', desc: 'TDS deduction certificates and letters per financial quarter', dateKey: 'date', source: 'Tax Assessment Portal',
    columns: [{ key: 'cert', label: 'Certificate No' }, { key: 'fr', label: 'Franchise' }, { key: 'pan', label: 'PAN' }, { key: 'date', label: 'Quarter Date', kind: 'date' }, { key: 'tds', label: 'TDS Amount', kind: 'money' }, { key: 'st', label: 'Dispatch Status', kind: 'status' }],
    build: () => gen(14, 91, (i, r) => ({ cert: `TDS-26-Q2-${pad(101 + i)}`, fr: site(i).franchise, pan: `AAACD${1000 + i * 13}K`, date: day(i * 3), tds: Math.round((3500 + r() * 12000) / 10) * 10, st: pick(r, ['Generated', 'Dispatched', 'Downloaded']) })),
  },
]

export const getReport = (id: string) => REPORTS.find((r) => r.id === id)

// ── Date ranges ───────────────────────────────────────────────────────────
export const DATE_RANGES = [
  { id: 'today', label: 'Today', from: '2026-10-14' },
  { id: '7d', label: 'Last 7 days', from: '2026-10-08' },
  { id: 'month', label: 'This month · Oct 2026', from: '2026-10-01' },
  { id: 'last-month', label: 'Last month · Sep 2026', from: '2026-09-01', to: '2026-09-30' },
  { id: 'quarter', label: 'This quarter · Q3 F.Y. 26-27', from: '2026-10-01' },
  { id: 'fy', label: 'F.Y. 26-27', from: '2026-04-01' },
  { id: 'all', label: 'All time', from: '' },
] as { id: string; label: string; from: string; to?: string }[]

// ── Saved views & scheduled exports ───────────────────────────────────────
export type SavedView = { id: string; name: string; reportId: string; category: string; range: string; query: string; savedAt: string; by: string }
export type Schedule = { id: string; reportId: string; frequency: 'Daily' | 'Weekly' | 'Monthly'; time: string; recipients: string; format: '.xlsx' | '.csv'; createdBy: string; createdAt: string; active: boolean }

export const savedViewStore = createStore<SavedView[]>('dexter.reports.saved.v1', () => [
  { id: 'SV-1', name: 'Pune network — this month', reportId: 'franchise-register', category: 'all', range: 'month', query: '', savedAt: '2026-10-06T09:20', by: 'Paras Dubey' },
  { id: 'SV-2', name: 'Open compliance exceptions', reportId: 'compliance-exceptions', category: 'kyc', range: 'all', query: '', savedAt: '2026-10-02T17:05', by: 'Paras Dubey' },
])

export const scheduleStore = createStore<Schedule[]>('dexter.reports.schedules.v1', () => [
  { id: 'SCH-1', reportId: 'cash-reconciliation', frequency: 'Daily', time: '08:00', recipients: 'finance@dexterindia.in', format: '.xlsx', createdBy: 'Vikram Shah', createdAt: '2026-09-12', active: true },
  { id: 'SCH-2', reportId: 'franchise-register', frequency: 'Weekly', time: '09:00', recipients: 'Paras.Dubey@dexterindia.in, meera.iyer@dexterindia.in', format: '.xlsx', createdBy: 'Paras Dubey', createdAt: '2026-08-30', active: true },
  { id: 'SCH-3', reportId: 'audit-trail', frequency: 'Monthly', time: '07:30', recipients: 'governance@dexterindia.in', format: '.csv', createdBy: 'Suresh Nair', createdAt: '2026-07-01', active: false },
])

/** next run label for a schedule, relative to the sample "today" */
export function nextRun(s: Schedule) {
  if (!s.active) return 'Paused'
  if (s.frequency === 'Daily') return `Tomorrow, ${s.time}`
  if (s.frequency === 'Weekly') return `Mon 19 Oct, ${s.time}`
  return `01 Nov, ${s.time}`
}
