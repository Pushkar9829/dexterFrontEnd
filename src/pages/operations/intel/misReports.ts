// MIS & Reports (§16): four consolidated categories → detailed reports with their §16.2 filters.
// Rows are built from live master / transaction stores via the sources adapter. CBR (Full Funding) and
// Cash Loading (Self Funding) reports are kept in separate categories and never mixed (§19.1).
import { amountOf } from '@/data/cbr'
import { fromPaise } from '@/data/payout'
import { sla } from '@/data/complaints'
import type { OpsModule } from './opsData'
import { cbrFranchise, cbrSiteByAtm, isOverdueTask, toIso, uploadKey, type OpsSources } from './sources'

export type Cell = string | number
export type Row = Record<string, Cell>
export type Col = { key: string; label: string; num?: boolean; money?: boolean }
export type ReportDef = {
  key: string
  name: string
  category: 1 | 2 | 3 | 4
  module: OpsModule
  link: string
  cols: Col[]
  build: (s: OpsSources, now: number) => Row[]
  date?: string // row key holding yyyy-mm-dd
  month?: string // row key holding yyyy-mm
  site?: string // ATM / Site column for the site filter
  franchise?: string
  status?: string
  amount?: string
  /** Fixed funding segregation (report only ever reads one funding model). */
  funding?: 'Full Funding' | 'Self Funding'
  /** Row key holding the funding model; selection is mandatory before the report loads. */
  fundingFilter?: string
  extra?: { key: string; label: string }[]
}
export const CATEGORIES: { id: 1 | 2 | 3 | 4; title: string; sub: string }[] = [
  { id: 1, title: 'CBR / Full Funding Reports', sub: 'CBR, Cash Replacement, Cash Balance, Full Funding EOD' },
  { id: 2, title: 'Cash Loading / Self Funding Reports', sub: 'Cash Loading Register, Self Funding EOD, ALF' },
  { id: 3, title: 'Transaction & Dispute Reports', sub: 'Transaction Data, Field Transaction Dispute, Chargeback Dispute' },
  { id: 4, title: 'Operations & Compliance Reports', sub: 'Complaint, WLA Statement, TDS, Postal & Courier, Task / SLA' },
]
function eodReport(funding: 'Full Funding' | 'Self Funding', cat: 1 | 2): ReportDef {
  return {
    key: `eod-${cat}`, name: `EOD Report (${funding})`, category: cat, module: 'Routine EOD', link: '/operations/eod', funding,
    cols: [{ key: 'id', label: 'EOD ID' }, { key: 'type', label: 'EOD Type' }, { key: 'date', label: 'EOD Date' }, { key: 'atm', label: 'ATM ID' }, { key: 'site', label: 'Site ID' }, { key: 'fr', label: 'Franchise' }, { key: 'declared', label: 'Declared Cash', money: true }, { key: 'stage', label: 'Stage' }, { key: 'status', label: 'Status' }],
    build: (s) => s.eod.filter((r) => r.funding === funding).map((r) => ({ id: r.id, type: `${r.type} EOD`, date: toIso(r.eodDate), atm: r.atmId, site: r.siteId, fr: r.franchiseName, declared: r.declaredCash, stage: r.stage, status: r.status })),
    date: 'date', site: 'atm', franchise: 'fr', status: 'status', extra: [{ key: 'type', label: 'EOD Type' }],
  }
}
function monthlyReport(funding: 'Full Funding' | 'Self Funding', cat: 1 | 2): ReportDef {
  return {
    key: `meod-${cat}`, name: `Monthly EOD Reconciliation (${funding})`, category: cat, module: 'Monthly EOD', link: '/operations/eod', funding,
    cols: [{ key: 'month', label: 'Month' }, { key: 'atm', label: 'ATM ID' }, { key: 'site', label: 'Site ID' }, { key: 'fr', label: 'Franchise' }, { key: 'source', label: 'Source Master' }, { key: 'srcClose', label: 'Source Closing', money: true }, { key: 'eodClose', label: 'EOD Closing', money: true }, { key: 'diff', label: 'Difference', money: true }, { key: 'days', label: 'Mismatch Days', num: true }, { key: 'diffStatus', label: 'Difference Status' }, { key: 'status', label: 'Status' }],
    build: (s) =>
      s.monthly.filter((m) => m.funding === funding).map((m) => ({
        month: m.month, atm: m.atmId, site: m.siteId, fr: m.franchiseName, source: m.source, srcClose: m.totals.source.closing, eodClose: m.totals.eod.closing,
        diff: m.totals.eod.closing - m.totals.source.closing, days: m.mismatchDays, diffStatus: m.mismatchDays ? 'Difference' : 'Matched', status: m.status,
      })),
    month: 'month', site: 'atm', franchise: 'fr', status: 'status', extra: [{ key: 'diffStatus', label: 'Difference Status' }],
  }
}
function cashMaster(kind: 'CBR' | 'Cash Loading'): ReportDef {
  const cbr = kind === 'CBR'
  return {
    key: cbr ? 'cbr-master' : 'cl-master', name: cbr ? 'CBR / Cash Replacement Register' : 'Cash Loading Report', category: cbr ? 1 : 2, module: cbr ? 'CBR' : 'Cash Loading', link: cbr ? '/cbr' : '/operations/cash-loading',
    funding: cbr ? 'Full Funding' : 'Self Funding',
    cols: [{ key: 'id', label: 'Record ID' }, { key: 'date', label: 'Date' }, { key: 'atm', label: 'ATM ID' }, { key: 'site', label: 'Site ID' }, { key: 'fr', label: 'Franchise' }, { key: 'bank', label: 'Bank' }, { key: 'form', label: 'Form' }, { key: 'amount', label: cbr ? 'Injection Amount' : 'Loading Amount', money: true }, { key: 'indent', label: 'Daily Indent', money: true }, { key: 'withdrawal', label: 'Withdrawal', money: true }, { key: 'channel', label: 'Channel' }, { key: 'status', label: 'Status' }],
    build: (s) => (cbr ? s.cbr : s.cl).map((r) => ({ id: r.id, date: toIso(r.date), atm: r.atmId, site: r.siteId, fr: r.franchiseName, bank: r.bank, form: r.formName, amount: r.amount, indent: r.dailyIndent, withdrawal: r.cashWithdrawal, channel: r.channel, status: r.status })),
    date: 'date', site: 'atm', franchise: 'fr', status: 'status', amount: 'amount', extra: [{ key: 'bank', label: 'Bank' }],
  }
}

export const REPORTS: ReportDef[] = [
  // ── 1 · CBR / Full Funding ──
  {
    key: 'cbr-daily', name: 'CBR Daily Report', category: 1, module: 'CBR', link: '/cbr/consolidated', funding: 'Full Funding',
    cols: [{ key: 'date', label: 'Date' }, { key: 'atm', label: 'ATM ID' }, { key: 'site', label: 'Site ID' }, { key: 'fr', label: 'Franchise' }, { key: 'bank', label: 'Bank' }, { key: 'opening', label: 'Opening', money: true }, { key: 'dispensed', label: 'Dispensed', money: true }, { key: 'loaded', label: 'Replenishment', money: true }, { key: 'closing', label: 'Closing (Physical)', money: true }, { key: 'switch', label: 'Switch Balance', money: true }, { key: 'diff', label: 'Difference', money: true }, { key: 'upload', label: 'Franchise Upload' }, { key: 'remarks', label: 'Remarks' }],
    build: (s) =>
      s.cbrDaily.map((d) => {
        const site = cbrSiteByAtm(d.atmId)
        const closing = amountOf(d.groups.closing)
        const sw = amountOf(d.groups.switch)
        const up = s.uploads[uploadKey(d.atmId, d.date)]
        return { date: d.date, atm: d.atmId, site: d.siteId, fr: site ? cbrFranchise(site.franchiseId) : '', bank: d.bank, opening: amountOf(d.groups.opening), dispensed: amountOf(d.groups.dispensed), loaded: amountOf(d.groups.replenishment), closing, switch: sw, diff: closing - sw, upload: up ? (up.uploaded ? 'Submitted' : 'Pending') : '—', remarks: d.remarks }
      }),
    date: 'date', site: 'atm', franchise: 'fr', status: 'upload', extra: [{ key: 'bank', label: 'Bank' }],
  },
  {
    key: 'cbr-monthly', name: 'CBR Monthly Report', category: 1, module: 'CBR', link: '/cbr/consolidated', funding: 'Full Funding',
    cols: [{ key: 'month', label: 'Month' }, { key: 'atm', label: 'ATM ID' }, { key: 'fr', label: 'Franchise' }, { key: 'days', label: 'Days', num: true }, { key: 'dispensed', label: 'Total Dispensed', money: true }, { key: 'loaded', label: 'Total Replenishment', money: true }, { key: 'closing', label: 'Month Closing', money: true }, { key: 'diffDays', label: 'Difference Days', num: true }, { key: 'status', label: 'Status' }],
    build: (s) => {
      const by = new Map<string, Row>()
      s.cbrDaily.forEach((d) => {
        const k = `${d.date.slice(0, 7)}|${d.atmId}`
        const site = cbrSiteByAtm(d.atmId)
        const r = by.get(k) ?? { month: d.date.slice(0, 7), atm: d.atmId, fr: site ? cbrFranchise(site.franchiseId) : '', days: 0, dispensed: 0, loaded: 0, closing: 0, diffDays: 0, status: 'Complete' }
        r.days = Number(r.days) + 1
        r.dispensed = Number(r.dispensed) + amountOf(d.groups.dispensed)
        r.loaded = Number(r.loaded) + amountOf(d.groups.replenishment)
        r.closing = amountOf(d.groups.closing)
        if (amountOf(d.groups.closing) !== amountOf(d.groups.switch)) r.diffDays = Number(r.diffDays) + 1
        if (s.uploads[uploadKey(d.atmId, d.date)]?.uploaded === false) r.status = 'Uploads pending'
        by.set(k, r)
      })
      return [...by.values()]
    },
    month: 'month', site: 'atm', franchise: 'fr', status: 'status',
  },
  cashMaster('CBR'),
  eodReport('Full Funding', 1),
  monthlyReport('Full Funding', 1),
  // ── 2 · Cash Loading / Self Funding ──
  cashMaster('Cash Loading'),
  {
    key: 'cl-register', name: 'Cash Loading Register (daily sheet)', category: 2, module: 'Cash Loading', link: '/operations/cash-loading/register', funding: 'Self Funding',
    cols: [{ key: 'date', label: 'Date' }, { key: 'atm', label: 'ATM ID' }, { key: 'fr', label: 'Franchise / MF' }, { key: 'indent', label: 'Indent No.' }, { key: 'opening', label: 'Opening', money: true }, { key: 'dispense', label: 'Dispense', money: true }, { key: 'loading', label: 'Loading', money: true }, { key: 'closing', label: 'Closing', money: true }, { key: 'switch', label: 'Switch', money: true }, { key: 'diff', label: 'Difference', money: true }, { key: 'remarks', label: 'Remarks' }],
    build: (s) => s.register.map((r) => ({ date: toIso(r.date), atm: r.atmId, fr: r.mfName, indent: r.indentNo, opening: r.openingBalance, dispense: r.dispense, loading: r.loading, closing: r.closingBalance, switch: r.switchBalance, diff: r.closingBalance - r.switchBalance, remarks: r.remarks })),
    date: 'date', site: 'atm', franchise: 'fr', amount: 'loading',
  },
  {
    key: 'alf', name: 'ALF Outstanding Report', category: 2, module: 'ALF', link: '/operations/alf-forecast', funding: 'Self Funding',
    cols: [{ key: 'id', label: 'ALF ID' }, { key: 'atm', label: 'ATM / Site' }, { key: 'fr', label: 'Franchise' }, { key: 'type', label: 'Type' }, { key: 'start', label: 'Start' }, { key: 'reversal', label: 'Reversal Due' }, { key: 'amount', label: 'Amount', money: true }, { key: 'purpose', label: 'Purpose' }, { key: 'status', label: 'Status' }, { key: 'recovery', label: 'Recovery Status' }],
    build: (s) =>
      s.alf.map((a) => {
        const site = s.sites.find((x) => x.atmId === a.atmId)
        return { id: a.id, atm: a.atmId, fr: site ? (s.franchises.find((f) => f.id === site.frId)?.name ?? site.frId) : '—', type: a.type, start: a.start, reversal: a.reversal, amount: fromPaise(a.amount), purpose: a.purpose, status: a.status, recovery: a.status === 'Reversed' ? 'Recovered' : a.status === 'Rejected' ? 'Not applicable' : 'Outstanding' }
      }),
    date: 'start', site: 'atm', franchise: 'fr', status: 'recovery', amount: 'amount',
  },
  eodReport('Self Funding', 2),
  monthlyReport('Self Funding', 2),
  // ── 3 · Transaction & Dispute ──
  {
    key: 'txn', name: 'Transaction Report', category: 3, module: 'Transaction Data', link: '/operations/txn-data', fundingFilter: 'funding',
    cols: [{ key: 'date', label: 'Date' }, { key: 'atm', label: 'ATM ID' }, { key: 'site', label: 'Site ID' }, { key: 'fr', label: 'Franchise' }, { key: 'funding', label: 'Funding Model' }, { key: 'count', label: 'TXN Count', num: true }, { key: 'amount', label: 'Amount', money: true }, { key: 'wd', label: 'Withdrawals', num: true }, { key: 'dep', label: 'Deposits', num: true }, { key: 'status', label: 'Verification' }],
    build: (s) => s.txn.map((t) => ({ date: t.date, atm: t.atmId, site: t.siteId, fr: t.franchise, funding: t.funding, count: t.count, amount: t.amount, wd: t.withdrawals, dep: t.deposits, status: t.status })),
    date: 'date', site: 'atm', franchise: 'fr', status: 'status', amount: 'amount',
  },
  {
    key: 'field-dispute', name: 'Field Dispute Report', category: 3, module: 'Field Transaction Dispute', link: '/operations/reconciliation/failed-txns', fundingFilter: 'funding',
    cols: [{ key: 'id', label: 'Dispute ID' }, { key: 'date', label: 'TXN Date' }, { key: 'atm', label: 'ATM ID' }, { key: 'site', label: 'Site ID' }, { key: 'fr', label: 'Franchise' }, { key: 'funding', label: 'Funding Model' }, { key: 'type', label: 'TXN Type' }, { key: 'rrn', label: 'RRN' }, { key: 'amount', label: 'Amount', money: true }, { key: 'bank', label: 'Bank' }, { key: 'status', label: 'Status' }],
    build: (s) => s.disputes.map((d) => ({ id: d.id, date: d.date, atm: d.atmId, site: d.siteId, fr: d.franchise, funding: d.funding, type: d.txnType, rrn: d.rrn, amount: d.amount, bank: d.bank, status: d.status })),
    date: 'date', site: 'atm', franchise: 'fr', status: 'status', amount: 'amount',
  },
  {
    key: 'chargeback', name: 'Chargeback Report', category: 3, module: 'Chargeback Dispute', link: '/operations/reconciliation/charge-back', fundingFilter: 'funding',
    cols: [{ key: 'id', label: 'Chargeback ID' }, { key: 'ref', label: 'NPCI / Bank Reference' }, { key: 'source', label: 'Source' }, { key: 'rrn', label: 'RRN' }, { key: 'date', label: 'TXN Date' }, { key: 'atm', label: 'ATM ID' }, { key: 'fr', label: 'Franchise' }, { key: 'funding', label: 'Funding Model' }, { key: 'amount', label: 'Dispute Amount', money: true }, { key: 'stage', label: 'Stage' }, { key: 'status', label: 'Status' }],
    build: (s) => s.chargebacks.map((c) => ({ id: c.id, ref: c.caseRef, source: c.source, rrn: c.rrn, date: c.date, atm: c.atmId, fr: c.franchise, funding: c.funding, amount: c.amount, stage: c.stage, status: c.status })),
    date: 'date', site: 'atm', franchise: 'fr', status: 'status', amount: 'amount', extra: [{ key: 'stage', label: 'Stage' }, { key: 'source', label: 'Source' }],
  },
  // ── 4 · Operations & Compliance ──
  {
    key: 'complaint', name: 'Complaint Report', category: 4, module: 'Complaint', link: '/operations/complaints',
    cols: [{ key: 'id', label: 'Complaint' }, { key: 'date', label: 'Received' }, { key: 'atm', label: 'ATM ID' }, { key: 'category', label: 'Category' }, { key: 'priority', label: 'Priority' }, { key: 'sla', label: 'SLA' }, { key: 'slaState', label: 'SLA Status' }, { key: 'owner', label: 'Assigned To' }, { key: 'status', label: 'Status' }],
    build: (s, now) =>
      s.complaints.map((c) => {
        const x = sla(c)
        void now
        return { id: c.id, date: toIso(c.receivedAt), atm: c.atmId, category: c.category, priority: c.priority, sla: x.label, slaState: x.breached ? 'Breached' : x.atRisk ? 'At risk' : 'Within SLA', owner: c.owner, status: c.status }
      }),
    date: 'date', site: 'atm', status: 'status', extra: [{ key: 'category', label: 'Category' }, { key: 'priority', label: 'Priority' }, { key: 'slaState', label: 'SLA Status' }],
  },
  {
    key: 'wla', name: 'WLA Statement Report', category: 4, module: 'WLA Statement', link: '/operations/wla-statement',
    cols: [{ key: 'id', label: 'Statement ID' }, { key: 'month', label: 'Period' }, { key: 'atm', label: 'ATM ID' }, { key: 'site', label: 'Site ID' }, { key: 'fr', label: 'Franchise' }, { key: 'account', label: 'Account' }, { key: 'bank', label: 'Bank' }, { key: 'date', label: 'Uploaded' }, { key: 'channel', label: 'Channel' }, { key: 'status', label: 'Upload / Verification Status' }],
    build: (s) => s.wla.map((w) => ({ id: w.id, month: w.period, atm: w.atmId, site: w.siteId, fr: w.franchise, account: w.account, bank: w.bank, date: w.uploadedAt, channel: w.channel, status: w.status })),
    date: 'date', month: 'month', site: 'atm', franchise: 'fr', status: 'status', extra: [{ key: 'account', label: 'Account' }],
  },
  {
    key: 'tds', name: 'TDS Document Report', category: 4, module: 'TDS Letter', link: '/operations/tds',
    cols: [{ key: 'id', label: 'Document ID' }, { key: 'fy', label: 'Financial Year' }, { key: 'period', label: 'Period' }, { key: 'fr', label: 'Franchise' }, { key: 'doc', label: 'Document Type' }, { key: 'amount', label: 'TDS Amount', money: true }, { key: 'date', label: 'Upload Date' }, { key: 'status', label: 'Status' }],
    build: (s) => s.tds.map((t) => ({ id: t.id, fy: t.fy, period: t.period, fr: t.franchise, doc: t.docType, amount: t.amount, date: t.uploadedAt, status: t.status })),
    date: 'date', franchise: 'fr', status: 'status', extra: [{ key: 'fy', label: 'Financial Year' }, { key: 'doc', label: 'Document Type' }],
  },
  {
    key: 'postal-in', name: 'Postal Inward Report', category: 4, module: 'Postal / Courier', link: '/operations/daak',
    cols: [{ key: 'date', label: 'Received Date' }, { key: 'id', label: 'Dak ID' }, { key: 'docket', label: 'Docket' }, { key: 'sender', label: 'Sender' }, { key: 'doc', label: 'Document' }, { key: 'dept', label: 'Department' }, { key: 'rack', label: 'Rack' }, { key: 'custodian', label: 'Custodian' }, { key: 'status', label: 'Status' }],
    build: (s) => s.inward.map((i) => ({ date: toIso(i.receivedAt), id: i.id, docket: i.docketNo, sender: `${i.sender.name} · ${i.sender.organization}`, doc: i.documentType, dept: i.department, rack: i.rack, custodian: i.custodian, status: i.status })),
    date: 'date', status: 'status', extra: [{ key: 'dept', label: 'Department' }, { key: 'rack', label: 'Rack' }],
  },
  {
    key: 'postal-out', name: 'Postal Outward Report', category: 4, module: 'Postal / Courier', link: '/operations/daak',
    cols: [{ key: 'date', label: 'Dispatch Date' }, { key: 'id', label: 'Dak ID' }, { key: 'awb', label: 'AWB' }, { key: 'recipient', label: 'Recipient' }, { key: 'doc', label: 'Document' }, { key: 'courier', label: 'Courier' }, { key: 'charges', label: 'Charges', money: true }, { key: 'status', label: 'Delivery Status' }],
    build: (s) => s.outward.map((o) => ({ date: toIso(o.dispatchDate), id: o.id, awb: o.awb, recipient: o.recipientName, doc: o.document.name, courier: o.courierCompany, charges: o.charges, status: o.deliveryStatus })),
    date: 'date', status: 'status', extra: [{ key: 'courier', label: 'Courier' }],
  },
  {
    key: 'task', name: 'Task & Escalation Report', category: 4, module: 'MIS & Reports', link: '/tasks/my',
    cols: [{ key: 'id', label: 'Task ID' }, { key: 'module', label: 'Module' }, { key: 'ref', label: 'Record' }, { key: 'title', label: 'Task' }, { key: 'assignee', label: 'Assigned To' }, { key: 'date', label: 'Due Date' }, { key: 'level', label: 'Escalation Level' }, { key: 'status', label: 'Status' }],
    build: (s, now) => s.wf.tasks.map((t) => ({ id: t.id, module: t.module, ref: t.refId, title: t.title, assignee: s.hierarchy.employees.find((e) => e.id === t.assignedTo)?.name ?? t.assignedTo, date: toIso(t.dueAt), level: `L${t.escalationLevel}`, status: isOverdueTask(t, now) ? 'Overdue' : t.status })),
    date: 'date', status: 'status', extra: [{ key: 'assignee', label: 'Assigned To' }, { key: 'level', label: 'Escalation Level' }, { key: 'module', label: 'Module' }],
  },
]
