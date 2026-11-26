// MIS & Reporting catalogue (spec §13). Each report is generated from the stores for the selected filters.
import { monthLabel, sumP, type ExpenseHead } from '@/data/payout'
import { maskPan } from '@/lib/mask'
import { buildAlerts, reconInsights } from './ai'
import { bmReconOf, groupBm, inr0, pct1, type BmRow, type Cell, type Col, type Model, type TableData, type View } from './compute'

export type ReportGroup = 'Franchise Model' | 'Business Model' | 'Consolidated'
export type ReportDef = { id: string; group: ReportGroup; name: string; build: (m: Model, v: View, month: string) => TableData }

const c = (label: string, kind?: Col['kind']): Col => ({ label, kind })
const ml = (m: string) => (m ? monthLabel(m) : 'All')
const head = (r: BmRow, h: ExpenseHead) => r.pnl.heads[h] ?? 0
const expenseReport = (h: ExpenseHead) => (m: Model, v: View): TableData => {
  const atms = new Set(v.bm.map((r) => `${r.month}|${r.site.atmId}`))
  const xs = m.snap.business.expenses.filter((e) => e.head === h && atms.has(`${e.month}|${e.atmId}`))
  return {
    columns: [c('Month'), c('ATM ID'), c('Invoice / Bill No'), c('Vendor'), c('Bill Date'), c('Due Date'), c('Amount', 'money'), c('Paid', 'money'), c('Outstanding', 'money'), c('Status', 'status')],
    rows: xs.map((e) => [ml(e.month), e.atmId, e.invoiceNo ?? '—', e.vendor ?? '—', e.billDate, e.dueDate ?? '—', e.amount, e.paid, e.amount - e.paid, e.status]),
  }
}
const bmPnlCols = [c('FY'), c('Month'), c('Super MF'), c('Master Franchise'), c('BM Category'), c('ATM ID'), c('Site ID'), c('Business Payout', 'money'), c('Rent', 'money'), c('Electricity', 'money'), c('Housekeeping', 'money'), c('Staff', 'money'), c('Partner Share', 'money'), c('Other', 'money'), c('Total Expenses', 'money'), c('Net Profit / Loss', 'money'), c('Margin', 'pct'), c('Outstanding', 'money'), c('Status', 'status')]
const bmPnlRow = (r: BmRow): Cell[] => [r.fy, ml(r.month), r.site.superMf, r.site.mf, r.categoryName, r.site.atmId, r.site.siteId, r.pnl.received, head(r, 'Rent'), head(r, 'Electricity Bill'), head(r, 'Housekeeping'), head(r, 'Staff Expenses'), head(r, 'Partner Share'), head(r, 'Other Expenses'), r.pnl.total, r.pnl.net, r.pnl.margin, r.pnl.outstanding, r.pnl.status]
const groupCols = (label: string) => [c(label), c('Sites', 'num'), c('Payout', 'money'), c('Expenses', 'money'), c('Net', 'money'), c('Profitable', 'num'), c('Loss', 'num'), c('Incomplete', 'num')]

export const REPORTS: ReportDef[] = [
  // ── §13.1 Franchise ──
  {
    id: 'fr-payout', group: 'Franchise Model', name: 'Monthly Franchisee Payout Report',
    build: (_m, v) => ({
      columns: [c('Month'), c('ATM ID'), c('Site ID'), c('Franchisee'), c('MF'), c('Source'), c('Gross', 'money'), c('Deductions', 'money'), c('W/o TDS', 'money'), c('TDS/GST', 'money'), c('Net Payout', 'money'), c('UTR'), c('Status', 'status')],
      rows: v.fr.map((r) => [ml(r.month), r.atmId, r.siteId, r.frName, r.mfName, r.line.source, r.line.gross, r.line.gross - r.line.withoutTds, r.line.withoutTds, r.line.taxAmt, r.line.net, r.line.utr ?? '—', r.payStatus]),
    }),
  },
  {
    id: 'mf-payout', group: 'Franchise Model', name: 'Monthly Master Franchise Payout Report',
    build: (_m, v) => ({
      columns: [c('Month'), c('Master Franchise'), c('Super MF'), c('Sites', 'num'), c('Net MF', 'money'), c('Hold', 'money'), c('Recovery', 'money'), c('Debit', 'money'), c('Credit', 'money'), c('W/o TDS', 'money'), c('TDS/GST', 'money'), c('Net MF Payout', 'money'), c('UTR'), c('Paid Date')],
      rows: v.mf.map((x) => [ml(x.month), x.mf, x.smf, x.sites, x.netMf, x.hold, x.recovery, x.debit, x.credit, x.withoutTds, x.tax, x.net, x.utr ?? '—', x.paidDate ?? '—']),
      note: 'MF TDS/GST applied only where a rate has been set for the MF (no default assumed).',
    }),
  },
  {
    id: 'smf-payout', group: 'Franchise Model', name: 'Super MF-wise Payout Report',
    build: (_m, v) => ({
      columns: [c('Month'), c('Super MF'), c('MFs', 'num'), c('Sites', 'num'), c('Franchisee Net', 'money'), c('Net MF', 'money'), c('Adjustments', 'money'), c('TDS/GST', 'money'), c('Net MF Payout', 'money')],
      rows: v.smf.map((x) => [ml(x.month), x.smf, x.mfs.length, x.sites, x.frNet, x.netMf, x.adjustments, x.tax, x.net]),
      note: 'Sum of the Super MF’s MFs; each site counted once. Contractual Super MF share is pending §21-04.',
    }),
  },
  {
    id: 'fr-site', group: 'Franchise Model', name: 'Franchise Site-wise Payout',
    build: (_m, v) => ({
      columns: [c('Month'), c('ATM ID'), c('Site ID'), c('State'), c('City'), c('Category'), c('Manual', 'money'), c('File', 'money'), c('Auto', 'money'), c('Payable Net', 'money'), c('Reconciliation', 'status')],
      rows: v.fr.map((r) => [ml(r.month), r.atmId, r.siteId, r.state, r.city, r.category, r.manual?.net ?? 0, r.file?.net ?? 0, r.auto?.net ?? 0, r.line.net, r.recon]),
    }),
  },
  {
    id: 'tl', group: 'Franchise Model', name: 'Team Leader Profit Sharing Report',
    build: (m, _v, month) => ({
      columns: [c('Month'), c('Team Leader'), c('Eligible Profit', 'money'), c('Share', 'money'), c('Approval', 'status'), c('Payment', 'status'), c('UTR')],
      rows: m.snap.tl.shares.filter((x) => !month || x.month === month).map((x) => [ml(x.month), x.tlName, x.eligibleProfit, x.share, x.approval, x.payment, x.utr ?? '—']),
      note: m.snap.tl.shares.length ? undefined : 'No TL shares calculated yet — TL rules / eligible-profit basis pending approval (§21-01/02).',
    }),
  },
  {
    id: 'fr-eligible', group: 'Franchise Model', name: 'Franchise Eligible Profit Report',
    build: (m, v) => ({
      columns: [c('Month'), c('ATM ID'), c('Franchisee'), c('Gross', 'money'), c('Net MF Revenue', 'money'), c('TL Eligible Base (plan TL rates)', 'money')],
      rows: v.fr.map((r) => [ml(r.month), r.atmId, r.frName, r.line.gross, r.line.mfRevenue, r.tlBase]),
      note: m.snap.rules.tlEligibleProfitBasis === null ? 'PROVISIONAL: eligible-profit definition pending Finance (§21-01); base shown from plan TL rates.' : `Basis: ${m.snap.rules.tlEligibleProfitBasis}`,
    }),
  },
  {
    id: 'fr-remaining', group: 'Franchise Model', name: 'Franchise Remaining Profit Report',
    build: (m, v, month) => ({
      columns: [c('Team Leader'), c('Sites', 'num'), c('Eligible Base', 'money'), c('TL Share', 'money'), c('Remaining Eligible Profit', 'money')],
      rows: m.snap.tl.rules.map((rule) => {
        const base = sumP(v.fr.filter((r) => rule.siteAtmIds.includes(r.atmId)).map((r) => r.tlBase))
        const share = sumP(m.snap.tl.shares.filter((x) => x.tlId === rule.tlId && (!month || x.month === month)).map((x) => x.share))
        return [rule.tlName, rule.siteAtmIds.length, base, share, base - share]
      }),
      note: 'Remaining = eligible base − approved TL share (§5.5). Provisional until §21-01 is signed off.',
    }),
  },
  {
    id: 'recovery', group: 'Franchise Model', name: 'Recovery & Waiver Report',
    build: (_m, v) => ({
      columns: [c('Month'), c('ATM ID'), c('Franchisee'), c('ICICI SR', 'money'), c('NT Penalty', 'money'), c('Recovery', 'money'), c('Additional Recovery', 'money'), c('Waiver', 'money'), c('Negative Fixed Fee', 'money'), c('Credit', 'money')],
      rows: v.fr
        .filter((r) => { const d = r.line.ded; return d.iciciSr + d.ntPenalty + d.recovery + d.additionalRecovery + d.waiver + d.negativeFixedFee + d.credit > 0 })
        .map((r) => { const d = r.line.ded; return [ml(r.month), r.atmId, r.frName, d.iciciSr, d.ntPenalty, d.recovery, d.additionalRecovery, d.waiver, d.negativeFixedFee, d.credit] }),
    }),
  },
  {
    id: 'tds', group: 'Franchise Model', name: 'TDS / GST Report',
    build: (_m, v) => ({
      columns: [c('Month'), c('ATM ID'), c('Franchisee'), c('PAN'), c('W/o TDS', 'money'), c('TDS/GST %', 'pct'), c('TDS/GST Amount', 'money'), c('Net', 'money')],
      rows: v.fr.map((r) => [ml(r.month), r.atmId, r.frName, maskPan(r.line.pan), r.line.withoutTds, r.line.taxPct, r.line.taxAmt, r.line.net]),
    }),
  },
  {
    id: 'kyc', group: 'Franchise Model', name: 'KYC Pending Report',
    build: (m) => ({
      columns: [c('Account ID'), c('Beneficiary'), c('Type'), c('Vertical'), c('Bank'), c('Status', 'status'), c('Effective From')],
      rows: m.snap.accounts.filter((a) => !a.kycVerified && a.status !== 'Superseded').map((a) => [a.id, a.name, a.beneficiaryType, a.vertical, a.bank, a.status, a.effectiveFrom]),
    }),
  },
  {
    id: 'utr', group: 'Franchise Model', name: 'UTR Pending Report',
    build: (_m, v) => ({
      columns: [c('Month'), c('Beneficiary'), c('ATM / MF'), c('Amount', 'money'), c('Paid Date'), c('Status', 'status')],
      rows: [
        ...v.fr.filter((r) => !r.line.utr).map((r) => [ml(r.month), r.frName, r.atmId, r.line.net, r.line.paidDate ?? '—', r.payStatus] as Cell[]),
        ...v.mf.filter((x) => !x.utr).map((x) => [ml(x.month), x.mf, 'MF payout', x.net, x.paidDate ?? '—', x.paidDate ? 'Paid' : 'Pending'] as Cell[]),
      ],
    }),
  },
  {
    id: 'failure', group: 'Franchise Model', name: 'Payout Failure Report',
    build: (_m, v) => ({
      columns: [c('Month'), c('ATM ID'), c('Franchisee'), c('Batch'), c('Net', 'money'), c('Credit Status', 'status'), c('Remarks')],
      rows: v.fr.filter((r) => r.payStatus === 'Failed' || r.payStatus === 'Hold').map((r) => [ml(r.month), r.atmId, r.frName, r.batch?.name ?? r.line.batchId, r.line.net, r.payStatus, r.line.remarks ?? '—']),
    }),
  },
  {
    id: 'fr-mom', group: 'Franchise Model', name: 'Month-on-Month Payout Comparison',
    build: (_m, v) => {
      const prev = new Map(v.frPrev.map((r) => [r.atmId, r]))
      return {
        columns: [c('ATM ID'), c('Franchisee'), c(`Net ${ml(v.prevMonth)}`, 'money'), c('Net (selected)', 'money'), c('Change', 'money'), c('Change %', 'pct')],
        rows: v.fr.map((r) => { const p = prev.get(r.atmId)?.line.net ?? 0; return [r.atmId, r.frName, p, r.line.net, r.line.net - p, pct1(r.line.net - p, p)] }),
      }
    },
  },
  // ── §13.2 Business Model ──
  { id: 'bm-pnl', group: 'Business Model', name: 'BM Site-wise Profit & Loss', build: (_m, v) => ({ columns: bmPnlCols, rows: v.bm.map(bmPnlRow) }) },
  { id: 'bm-mf', group: 'Business Model', name: 'MF-wise BM Profitability', build: (_m, v) => ({ columns: groupCols('Master Franchise'), rows: groupBm(v.bm, 'mf').map((g) => [g.name, g.sites, g.received, g.expenses, g.net, g.profitable, g.loss, g.incomplete]) }) },
  { id: 'bm-smf', group: 'Business Model', name: 'Super MF-wise BM Profitability', build: (_m, v) => ({ columns: groupCols('Super MF'), rows: groupBm(v.bm, 'smf').map((g) => [g.name, g.sites, g.received, g.expenses, g.net, g.profitable, g.loss, g.incomplete]), note: 'Each site counted once; contractual Super MF share shown separately once §21-06 is set.' }) },
  { id: 'bm-cat', group: 'Business Model', name: 'Business Model Category-wise Report', build: (_m, v) => ({ columns: groupCols('BM Category'), rows: groupBm(v.bm, 'category').map((g) => [g.name, g.sites, g.received, g.expenses, g.net, g.profitable, g.loss, g.incomplete]) }) },
  {
    id: 'bm-pve', group: 'Business Model', name: 'Payout vs Expense Report',
    build: (_m, v) => ({ columns: [c('Month'), c('ATM ID'), c('MF'), c('Payout', 'money'), c('Expenses', 'money'), c('Expense % of payout', 'pct'), c('Net', 'money')], rows: v.bm.map((r) => [ml(r.month), r.site.atmId, r.site.mf, r.pnl.received, r.pnl.total, pct1(r.pnl.total, r.pnl.received), r.pnl.net]) }),
  },
  {
    id: 'bm-rent', group: 'Business Model', name: 'Rent Reconciliation Report',
    build: (m, v) => ({
      columns: [c('Month'), c('ATM ID'), c('Rent booked', 'money'), c('Rent deducted at source', 'money'), c('Rent in P&L', 'money'), c('Entries', 'num'), c('Risk')],
      rows: v.bm.map((r) => {
        const xs = m.snap.business.expenses.filter((e) => e.atmId === r.site.atmId && e.month === r.month && e.head === 'Rent' && e.status !== 'Rejected')
        return [ml(r.month), r.site.atmId, sumP(xs.map((e) => e.amount)), r.payout?.rentDeductedAtSource ?? 0, head(r, 'Rent'), xs.length, r.rentRisk ? 'Double deduction risk' : xs.length > 1 ? 'Duplicate entry' : '—']
      }),
    }),
  },
  { id: 'bm-elec', group: 'Business Model', name: 'Electricity Bill Report', build: expenseReport('Electricity Bill') },
  { id: 'bm-hk', group: 'Business Model', name: 'Housekeeping Expense Report', build: expenseReport('Housekeeping') },
  { id: 'bm-staff', group: 'Business Model', name: 'Staff Expense Report', build: expenseReport('Staff Expenses') },
  { id: 'bm-partner', group: 'Business Model', name: 'Partner Share Report', build: expenseReport('Partner Share') },
  { id: 'bm-loss', group: 'Business Model', name: 'Loss-Making Site Report', build: (_m, v) => ({ columns: bmPnlCols, rows: v.bm.filter((r) => r.pnl.status === 'Loss Making').map(bmPnlRow) }) },
  { id: 'bm-be', group: 'Business Model', name: 'Break-even Site Report', build: (_m, v) => ({ columns: bmPnlCols, rows: v.bm.filter((r) => r.pnl.status === 'Break-even').map(bmPnlRow) }) },
  {
    id: 'bm-pending', group: 'Business Model', name: 'Pending Expense Report',
    build: (m, v) => {
      const atms = new Set(v.bm.map((r) => `${r.month}|${r.site.atmId}`))
      const xs = m.snap.business.expenses.filter((e) => atms.has(`${e.month}|${e.atmId}`) && e.status !== 'Paid' && e.status !== 'Rejected')
      return { columns: [c('Month'), c('ATM ID'), c('Head'), c('Invoice'), c('Due Date'), c('Amount', 'money'), c('Paid', 'money'), c('Outstanding', 'money'), c('Status', 'status')], rows: xs.map((e) => [ml(e.month), e.atmId, e.head, e.invoiceNo ?? '—', e.dueDate ?? '—', e.amount, e.paid, e.amount - e.paid, e.status]) }
    },
  },
  {
    id: 'bm-mom', group: 'Business Model', name: 'Monthly Profitability Comparison',
    build: (_m, v) => {
      const prev = new Map(v.bmPrev.map((r) => [r.site.atmId, r]))
      return { columns: [c('ATM ID'), c('MF'), c(`Net ${ml(v.prevMonth)}`, 'money'), c('Net (selected)', 'money'), c('Change', 'money'), c('Status', 'status')], rows: v.bm.map((r) => { const p = prev.get(r.site.atmId)?.pnl.net ?? 0; return [r.site.atmId, r.site.mf, p, r.pnl.net, r.pnl.net - p, r.pnl.status] }) }
    },
  },
  {
    id: 'bm-ai', group: 'Business Model', name: 'AI Financial Risk Report',
    build: (m, v, month) => ({ columns: [c('Severity', 'status'), c('Alert'), c('Month'), c('Reference'), c('Detail'), c('Recommended action')], rows: buildAlerts(v, m.snap, month).filter((a) => a.vertical === 'Business Model').map((a) => [a.severity, a.type, ml(a.month === '—' ? '' : a.month), a.ref, a.detail, a.action]) }),
  },
  // ── §13.3 Consolidated ──
  {
    id: 'c-vertical', group: 'Consolidated', name: 'Overall Business Vertical Performance',
    build: (m, v, month) => ({
      columns: [c('Metric'), c('Franchise Model'), c('Business Model')],
      rows: [
        ['Sites', String(new Set(v.fr.map((r) => r.atmId)).size), String(new Set(v.bm.map((r) => r.site.atmId)).size)],
        ['Revenue / Payout', `Gross ${inr0(sumP(v.fr.map((r) => r.line.gross)))}`, `Received ${inr0(sumP(v.bm.map((r) => r.pnl.received)))}`],
        ['Deductions', `${inr0(sumP(v.fr.map((r) => r.line.gross - r.line.net)))} (fees, recovery, penalty, tax)`, `${inr0(sumP(v.bm.map((r) => r.pnl.total)))} (rent & operating)`],
        ['Profit sharing', `TL ${inr0(sumP(m.snap.tl.shares.filter((x) => !month || x.month === month).map((x) => x.share)))}`, m.snap.rules.superMfBmShare ?? 'MF/SMF share pending §21-06'],
        ['Final result', `FR ${inr0(sumP(v.fr.map((r) => r.line.net)))} · MF ${inr0(sumP(v.mf.map((x) => x.net)))}`, `Net ${inr0(sumP(v.bm.map((r) => r.pnl.net)))}`],
      ],
    }),
  },
  {
    id: 'c-dist', group: 'Consolidated', name: 'Franchise vs Business Model Site Distribution',
    build: (_m, v) => {
      const states = [...new Set([...v.fr.map((r) => r.state), ...v.bm.map((r) => r.site.state)])].sort()
      return { columns: [c('State'), c('Franchise Sites', 'num'), c('BM Sites', 'num'), c('Total', 'num')], rows: states.map((s) => { const a = new Set(v.fr.filter((r) => r.state === s).map((r) => r.atmId)).size; const b = new Set(v.bm.filter((r) => r.site.state === s).map((r) => r.site.atmId)).size; return [s, a, b, a + b] }) }
    },
  },
  {
    id: 'c-mis', group: 'Consolidated', name: 'Consolidated Payout MIS',
    build: (_m, v) => {
      const months = [...new Set([...v.frTrend.map((r) => r.month), ...v.bmTrend.map((r) => r.month)])].sort()
      return {
        columns: [c('Month'), c('Franchisee Net', 'money'), c('Net MF Revenue', 'money'), c('BM Payout Received', 'money'), c('BM Expenses', 'money'), c('BM Net', 'money')],
        rows: months.map((mo) => { const fr = v.frTrend.filter((r) => r.month === mo); const bm = v.bmTrend.filter((r) => r.month === mo); return [ml(mo), sumP(fr.map((r) => r.line.net)), sumP(fr.map((r) => r.line.mfRevenue)), sumP(bm.map((r) => r.pnl.received)), sumP(bm.map((r) => r.pnl.total)), sumP(bm.map((r) => r.pnl.net))] }),
      }
    },
  },
  {
    id: 'c-fin', group: 'Consolidated', name: 'Consolidated Financial Performance',
    build: (_m, v) => ({
      columns: [c('Vertical'), c('Measure'), c('Amount', 'money')],
      rows: [
        ['Franchise Model', 'Franchisee gross revenue', sumP(v.fr.map((r) => r.line.gross))],
        ['Franchise Model', 'Franchisee net payout', sumP(v.fr.map((r) => r.line.net))],
        ['Franchise Model', 'MF net payout', sumP(v.mf.map((x) => x.net))],
        ['Business Model', 'Payout received', sumP(v.bm.map((r) => r.pnl.received))],
        ['Business Model', 'Operating expenses', sumP(v.bm.map((r) => r.pnl.total))],
        ['Business Model', 'Net operating profit / loss', sumP(v.bm.map((r) => r.pnl.net))],
        ['Business Model', 'Outstanding liabilities (unpaid)', sumP(v.bm.map((r) => r.pnl.outstanding))],
      ],
      note: 'Verticals listed separately — never combined into one profit figure.',
    }),
  },
  {
    id: 'c-pending', group: 'Consolidated', name: 'Pending Approval Report',
    build: (m) => {
      const s = m.snap
      return {
        columns: [c('Area'), c('Reference'), c('Detail'), c('Status', 'status'), c('Maker')],
        rows: [
          ...s.payout.batches.filter((b) => ['Draft', 'Uploaded', 'Validated', 'Pending Approval'].includes(b.status)).map((b) => ['Payout batch', b.name, `${b.type} · ${ml(b.month)}`, b.status, b.maker] as Cell[]),
          ...s.plans.filter((p) => p.status === 'Pending Approval' || p.status === 'Draft').map((p) => ['Plan', p.code, p.name, p.status, p.createdBy] as Cell[]),
          ...s.mappings.filter((x) => x.status === 'Pending Approval').map((x) => ['Plan mapping', x.atmId, `${x.planCode} → ${x.beneficiaryName}`, x.status, x.maker] as Cell[]),
          ...s.accounts.filter((a) => a.status === 'Pending' || a.status === 'Draft').map((a) => ['Beneficiary account', a.id, a.name, a.status, a.maker] as Cell[]),
          ...s.business.bmSites.filter((b) => b.approval === 'Pending').map((b) => ['BM site mapping', b.atmId, `${b.code} → ${b.mf}`, 'Pending', '—'] as Cell[]),
          ...s.tl.rules.filter((r) => r.status === 'Pending').map((r) => ['TL rule', r.id, r.tlName, r.status, '—'] as Cell[]),
        ],
      }
    },
  },
  {
    id: 'c-recon', group: 'Consolidated', name: 'Reconciliation Exception Report',
    build: (_m, v) => ({
      columns: [c('Vertical'), c('Month'), c('ATM ID'), c('Status', 'status'), c('Reason'), c('Amount', 'money')],
      rows: [
        ...v.fr.filter((r) => r.recon !== 'Matched').map((r) => ['Franchise Model', ml(r.month), r.atmId, r.recon, r.remark, r.maxAbs] as Cell[]),
        ...v.bm.filter((r) => bmReconOf(r) === 'Pending').map((r) => ['Business Model', ml(r.month), r.site.atmId, r.pnl.status, r.pnl.missing.length ? `Missing ${r.pnl.missing.join(', ')}` : 'No payout record', r.pnl.received] as Cell[]),
      ],
    }),
  },
  {
    id: 'c-ai', group: 'Consolidated', name: 'AI Management Summary',
    build: (m, v, month) => {
      const alerts = buildAlerts(v, m.snap, month)
      const types = [...new Set(alerts.map((a) => a.type))]
      return {
        columns: [c('Section'), c('Finding'), c('Count / Detail')],
        rows: [
          ...reconInsights(v, m.snap, month).map((f) => ['Reconciliation', f.text, f.tone] as Cell[]),
          ...types.map((t) => ['Alert', t, String(alerts.filter((a) => a.type === t).length)] as Cell[]),
        ],
        note: 'AI never alters values, approves or releases payments.',
      }
    },
  },
]
