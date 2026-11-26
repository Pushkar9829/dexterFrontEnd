// "AI" Financial Intelligence (spec §11) — a deterministic, rule-based analysis layer over the payout stores.
// It only READS records: it never alters values, approves payouts, changes accounts or releases payments.
import { franchiseStore } from '@/data/franchises'
import { monthLabel, sumP, type BmExpense, type ExpenseHead, type Paise } from '@/data/payout'
import {
  bmReconOf,
  groupBm,
  inr0,
  median,
  nextMonthOf,
  pct1,
  signed,
  type BmRow,
  type Cell,
  type Col,
  type FrRow,
  type Model,
  type Snapshot,
  type View,
} from './compute'

export const AI_DISCLAIMER = 'AI is an intelligence layer only — it never alters financial values, approves payouts, changes bank accounts or releases payments. Every finding below is traceable to ERP records and must be reviewed by a person.'

export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'gray'
export type Ref = { ref: string; detail: string; to?: string }
export type Finding = { tone: Tone; text: string; to?: string }
export type Feature = { key: string; title: string; spec: string; tone: Tone; summary: string; refs: Ref[]; action: string }

export const frLink = (atm: string, month: string) => `/finance/payouts/franchise?atm=${encodeURIComponent(atm)}&month=${month}`
export const mfLink = (month: string, mf?: string) => `/finance/payouts/mf?month=${month}${mf ? `&mf=${encodeURIComponent(mf)}` : ''}`
export const BM_LINK = '/finance/payouts/business'
export const ACCOUNTS_LINK = '/finance/payouts/accounts'
export const MONTHLY_LINK = '/finance/payouts/monthly'

const ml = (m: string) => (m ? monthLabel(m) : 'All months')
const byAtmMonth = (rows: BmRow[]) => new Map(rows.map((r) => [`${r.month}|${r.site.atmId}`, r]))
const headTotal = (r: BmRow, h: ExpenseHead) => r.pnl.heads[h] ?? 0

// ── reconciliation cross-checks (overview panel, design) ─────────────────
export function reconInsights(v: View, s: Snapshot, month: string): Finding[] {
  const fr = v.fr
  if (!fr.length) return [{ tone: 'gray', text: 'No Franchise Model payout records for the selected filters.' }]
  const matched = fr.filter((r) => r.recon === 'Matched')
  const variance = fr.filter((r) => r.recon === 'Variance Found')
  const pending = fr.filter((r) => r.recon === 'Data Pending')
  const autoTotal = sumP(fr.map((r) => r.auto?.net ?? 0))
  const varAmt = sumP(variance.map((r) => r.maxAbs))
  const noTxn = fr.filter((r) => [r.manual, r.file, r.auto].some((l) => l && l.txn.cash + l.txn.nonCash + l.txn.postCash + l.txn.postNonCash + l.txn.deposit === 0))
  const planByCode = new Map(s.plans.map((p) => [p.code, p]))
  const mapped = new Map(s.mappings.filter((x) => x.status === 'Active').map((x) => [x.atmId, x.planCode]))
  const planMismatch = fr.filter((r) => {
    const codes = new Set([r.manual, r.file, r.auto].filter(Boolean).map((l) => l!.planCode ?? ''))
    const plan = planByCode.get(r.line.planCode ?? '')
    return codes.size > 1 || !plan || plan.status !== 'Active' || (mapped.has(r.atmId) && mapped.get(r.atmId) !== r.line.planCode)
  })
  const unmapped = fr.filter((r) => !mapped.has(r.atmId))
  const out: Finding[] = [
    { tone: 'green', text: `${matched.length} of ${fr.length} ATMs matched across all 3 payout methods for ${ml(month)}.` },
    variance.length
      ? { tone: 'amber', text: `${variance.length} ATMs have payout variance — ${inr0(varAmt)} (${pct1(varAmt, autoTotal)}% of Auto payout). Largest: ${variance.sort((a, b) => b.maxAbs - a.maxAbs).slice(0, 2).map((r) => `${r.atmId} (${r.remark})`).join(', ')}.`, to: frLink(variance[0].atmId, variance[0].month) }
      : { tone: 'green', text: 'No payout variance beyond tolerance.' },
    pending.length ? { tone: 'amber', text: `${pending.length} ATMs are missing at least one payout source (Data Pending).` } : { tone: 'green', text: 'All three sources present for every ATM.' },
    noTxn.length ? { tone: 'red', text: `Missing transaction data for ${noTxn.length} ATMs (${noTxn.slice(0, 3).map((r) => r.atmId).join(', ')}).` } : { tone: 'blue', text: 'No missing transaction data for the selected month.' },
    planMismatch.length
      ? { tone: 'amber', text: `Plan mismatch identified for ${planMismatch.length} ATM${planMismatch.length > 1 ? 's' : ''} (${planMismatch.slice(0, 3).map((r) => r.atmId).join(', ')}) — plan differs between sources, is not Active, or differs from the approved site mapping.` }
      : { tone: 'blue', text: 'Plan applied is consistent across sources and Active for every ATM.' },
  ]
  if (unmapped.length) out.push({ tone: 'gray', text: `${unmapped.length} ATMs have no approved site-wise Plan Mapping yet — the batch plan was used (§10.2).`, to: '/finance/payouts/plans' })
  if (s.rules.varianceTolerance === null) out.push({ tone: 'gray', text: 'Variance tolerance is pending Finance sign-off (§21-14); exact match (₹0) is applied.', to: '/finance/payouts/rules' })
  out.push({
    tone: 'blue',
    text: `AI Recommendation: ${variance.length || planMismatch.length ? `review variance, plan mapping and deductions for ${new Set([...variance, ...planMismatch].map((r) => r.atmId)).size} ATMs before approval.` : 'no blocking exceptions; proceed through maker-checker approval.'}`,
  })
  return out
}

// ── §11.1 Franchise features ─────────────────────────────────────────────
export function franchiseFeatures(v: View, s: Snapshot, month: string): Feature[] {
  const prev = v.prevMonth
  const cur = v.fr
  const prevBy = new Map(v.frPrev.map((r) => [r.atmId, r]))
  const curNet = sumP(cur.map((r) => r.line.net))
  const prevNet = sumP(v.frPrev.map((r) => r.line.net))
  const moves = cur
    .filter((r) => prevBy.has(r.atmId))
    .map((r) => ({ r, d: r.line.net - prevBy.get(r.atmId)!.line.net }))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
  const recov = (r: FrRow) => r.line.ded.recovery + r.line.ded.additionalRecovery + r.line.ded.iciciSr
  const recRows = cur.filter((r) => recov(r) > 0)
  const recMed = median(recRows.map(recov))
  const unusualRec = recRows.filter((r) => recov(r) > recMed * 3 || recov(r) * 10 > r.line.gross)
  const penaltyChanges = cur
    .map((r) => {
      const p = prevBy.get(r.atmId)
      const srcPen = [r.manual, r.file, r.auto].filter(Boolean).map((l) => l!.ded.ntPenalty)
      return { r, prev: p?.line.ded.ntPenalty ?? 0, now: r.line.ded.ntPenalty, crossSource: Math.max(...srcPen) - Math.min(...srcPen) }
    })
    .filter((x) => x.now !== x.prev || x.crossSource > 0)
  const tlRows = s.tl.rules.map((rule) => {
    const base = sumP(cur.filter((r) => rule.siteAtmIds.includes(r.atmId)).map((r) => r.tlBase))
    const share = sumP(s.tl.shares.filter((x) => x.tlId === rule.tlId && x.month === month).map((x) => x.share))
    return { rule, base, share }
  })
  const prevMf = new Map(v.mfTrend.filter((m) => m.month === prev).map((m) => [m.mf, m]))
  const mfMoves = v.mf.map((m) => ({ m, d: m.netMf - (prevMf.get(m.mf)?.netMf ?? 0), had: prevMf.has(m.mf) })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
  const curMf = sumP(v.mf.map((m) => m.netMf))
  const prevMfTotal = sumP([...prevMf.values()].map((m) => m.netMf))
  const forecast = (c: Paise, p: Paise, hasPrev: boolean) => Math.max(0, hasPrev ? c + (c - p) : c)
  const varRows = cur.filter((r) => r.recon === 'Variance Found')
  const reasons = new Map<string, { n: number; amt: Paise }>()
  varRows.forEach((r) => {
    const k = r.remark.replace(/ ₹[\d,.-]+$/, '')
    const x = reasons.get(k) ?? { n: 0, amt: 0 }
    reasons.set(k, { n: x.n + 1, amt: x.amt + r.maxAbs })
  })
  const now = Date.now()
  const recentAcct = s.accounts.filter((a) =>
    a.history.some((h) => /change|update|replac|edit|modif/i.test(h.action) && now - new Date(h.at).getTime() < 60 * 86400_000) ||
    (a.status === 'Pending' && now - new Date(a.effectiveFrom).getTime() < 60 * 86400_000),
  )
  const accNoCount = new Map<string, Set<string>>()
  s.accounts.filter((a) => a.status !== 'Superseded' && a.status !== 'Rejected').forEach((a) => accNoCount.set(a.accountNo, (accNoCount.get(a.accountNo) ?? new Set()).add(a.beneficiaryId)))
  const sharedAcc = [...accNoCount.entries()].filter(([, b]) => b.size > 1)
  const unverifiedPayees = cur.filter((r) => r.acct !== 'Verified' && r.payStatus !== 'Paid')
  return [
    {
      key: 'payout', title: 'Payout Analysis', spec: 'Month-on-month payout comparison', tone: Math.abs(curNet - prevNet) * 10 > prevNet && v.frPrev.length ? 'amber' : 'blue',
      summary: v.frPrev.length ? `Franchisee net payout ${inr0(curNet)} in ${ml(month)} vs ${inr0(prevNet)} in ${ml(prev)} (${signed(curNet - prevNet)}, ${pct1(curNet - prevNet, prevNet)}%).` : `Franchisee net payout ${inr0(curNet)} in ${ml(month)}; no records for ${ml(prev)} to compare.`,
      refs: moves.slice(0, 5).map(({ r, d }) => ({ ref: r.atmId, detail: `${r.frName}: ${signed(d)} vs ${ml(prev)}`, to: frLink(r.atmId, r.month) })),
      action: 'Review the largest month-on-month movements against transaction counts before approval.',
    },
    {
      key: 'recovery', title: 'Recovery Analysis', spec: 'Identify unusual recoveries', tone: unusualRec.length ? 'amber' : 'green',
      summary: recRows.length ? `${recRows.length} ATMs carry ICICI SR / recovery / additional recovery (median ${inr0(recMed)}); ${unusualRec.length} unusual (>3× median or >10% of gross).` : 'No recoveries recorded for the selected period.',
      refs: unusualRec.slice(0, 6).map((r) => ({ ref: r.atmId, detail: `${inr0(recov(r))} recovered on gross ${inr0(r.line.gross)}`, to: frLink(r.atmId, r.month) })),
      action: unusualRec.length ? 'Confirm supporting approval for each unusual recovery.' : 'No action required.',
    },
    {
      key: 'penalty', title: 'Penalty Analysis', spec: 'Detect unusual penalty changes', tone: penaltyChanges.length ? 'amber' : 'green',
      summary: penaltyChanges.length ? `${penaltyChanges.length} ATMs show an NT Penalty change vs ${ml(prev)} or a penalty that differs between Manual / File / Auto sources.` : 'NT Penalty unchanged month-on-month and consistent across sources.',
      refs: penaltyChanges.slice(0, 6).map((x) => ({ ref: x.r.atmId, detail: x.crossSource ? `Sources differ by ${inr0(x.crossSource)} (penalty in Manual/File, not in Auto)` : `${inr0(x.prev)} → ${inr0(x.now)}`, to: frLink(x.r.atmId, x.r.month) })),
      action: 'Validate penalty source (NT report) and decide which source is correct before release.',
    },
    {
      key: 'tl', title: 'Team Leader Analysis', spec: 'Compare TL share and eligible profit', tone: s.rules.tlEligibleProfitBasis === null ? 'gray' : 'blue',
      summary: `${tlRows.length} TL rules (${tlRows.filter((x) => x.rule.status === 'Approved').length} approved). Eligible base from plan TL rates ${inr0(sumP(tlRows.map((x) => x.base)))}; TL share recorded ${inr0(sumP(tlRows.map((x) => x.share)))}.${s.rules.tlEligibleProfitBasis === null ? ' Eligible-profit definition pending Finance (§21-01), so no share is computed automatically.' : ''}`,
      refs: tlRows.map((x) => ({ ref: x.rule.tlName, detail: `Base ${inr0(x.base)} · share ${inr0(x.share)}${x.base ? ` (${pct1(x.share, x.base)}%)` : ''} · rule ${x.rule.status}`, to: '/finance/payouts/team-leader' })),
      action: 'Approve TL rules and the eligible-profit basis before TL shares are calculated.',
    },
    {
      key: 'mf', title: 'MF Performance', spec: 'MF-wise payout trends', tone: 'blue',
      summary: `Net MF revenue ${inr0(curMf)} across ${v.mf.length} MFs in ${ml(month)}${prevMf.size ? ` vs ${inr0(prevMfTotal)} in ${ml(prev)}` : ''}.`,
      refs: mfMoves.slice(0, 6).map((x) => ({ ref: x.m.mf, detail: x.had ? `${inr0(x.m.netMf)} (${signed(x.d)})` : `${inr0(x.m.netMf)} (new this month)`, to: mfLink(x.m.month, x.m.mf) })),
      action: 'Investigate MFs with a sharp drop in revenue.',
    },
    {
      key: 'predict', title: 'Payout Prediction', spec: 'Forecast expected payout', tone: 'blue',
      summary: month
        ? `Forecast for ${ml(nextMonthOf(month))} (linear trend of last two months, indicative only): Franchisee ${inr0(forecast(curNet, prevNet, v.frPrev.length > 0))}, MF ${inr0(forecast(curMf, prevMfTotal, prevMf.size > 0))}.`
        : 'Select a payout month to forecast.',
      refs: [],
      action: 'Use for cash planning only — a forecast is never a payable value.',
    },
    {
      key: 'variance', title: 'Variance Analysis', spec: 'Identify payout mismatch reasons', tone: varRows.length ? 'amber' : 'green',
      summary: varRows.length ? `${varRows.length} variance ATMs, ${inr0(sumP(varRows.map((r) => r.maxAbs)))} total. Reasons: ${[...reasons.entries()].map(([k, x]) => `${k} (${x.n})`).join('; ')}.` : 'No variance found between Manual, File and Auto payout.',
      refs: varRows.slice(0, 6).map((r) => ({ ref: r.atmId, detail: `${r.remark} · Manual vs Auto ${r.mVa === null ? '—' : signed(r.mVa)}`, to: frLink(r.atmId, r.month) })),
      action: 'Correct / resolve each mismatch in Monthly Payout → Auto Reconciliation; unresolved items must not be released.',
    },
    {
      key: 'risk', title: 'Beneficiary Risk', spec: 'Flag suspicious bank/account changes', tone: recentAcct.length || sharedAcc.length ? 'red' : unverifiedPayees.length ? 'amber' : 'green',
      summary: `${recentAcct.length} accounts changed / added in the last 60 days, ${sharedAcc.length} account numbers shared by more than one beneficiary, ${unverifiedPayees.length} unpaid payees without a verified account.`,
      refs: [
        ...recentAcct.slice(0, 4).map((a) => ({ ref: a.name, detail: `${a.bank} · status ${a.status} · ${a.history[a.history.length - 1]?.action ?? 'changed'}`, to: ACCOUNTS_LINK })),
        ...sharedAcc.slice(0, 3).map(([no, b]) => ({ ref: `A/c ••••${no.slice(-4)}`, detail: `Used by ${b.size} beneficiaries`, to: ACCOUNTS_LINK })),
        ...unverifiedPayees.slice(0, 3).map((r) => ({ ref: r.frName, detail: `Account ${r.acct}`, to: ACCOUNTS_LINK })),
      ],
      action: 'Hold payment to recently changed or shared accounts until maker-checker verification is complete.',
    },
  ]
}

// ── §11.2 Business Model features ────────────────────────────────────────
export function bmFeatures(v: View, s: Snapshot, month: string): Feature[] {
  const cur = v.bm
  const prevMap = byAtmMonth(v.bmPrev)
  const prevOf = (r: BmRow) => prevMap.get(`${v.prevMonth}|${r.site.atmId}`)
  const byStatus = (st: string) => cur.filter((r) => r.pnl.status === st)
  const exps = s.business.expenses.filter((e) => cur.some((r) => r.site.atmId === e.atmId && r.month === e.month) && e.status !== 'Rejected')
  const headMed = new Map<string, number>()
  exps.forEach((e) => headMed.set(e.head, 0))
  headMed.forEach((_, h) => headMed.set(h, median(exps.filter((e) => e.head === h).map((e) => e.amount))))
  const limit = s.rules.expenseApprovalLimit
  const anomalies = exps.filter((e) => (limit !== null && e.amount > limit) || e.amount > (headMed.get(e.head) ?? 0) * 2)
  const elec = cur
    .map((r) => ({ r, now: headTotal(r, 'Electricity Bill'), prev: prevOf(r) ? headTotal(prevOf(r)!, 'Electricity Bill') : 0 }))
    .filter((x) => x.prev > 0 && x.now * 2 > x.prev * 3 && x.now - x.prev > 100000)
  const rentRows = cur.map((r) => ({ r, now: s.business.expenses.filter((e) => e.atmId === r.site.atmId && e.month === r.month && e.head === 'Rent' && e.status !== 'Rejected'), prev: prevOf(r) ? headTotal(prevOf(r)!, 'Rent') : 0 }))
  const rentDup = rentRows.filter((x) => x.now.length > 1)
  const rentChange = rentRows.filter((x) => x.prev > 0 && sumP(x.now.map((e) => e.amount)) !== x.prev)
  const rentRisk = cur.filter((r) => r.rentRisk)
  const hk = cur.map((r) => ({ r, now: headTotal(r, 'Housekeeping'), prev: prevOf(r) ? headTotal(prevOf(r)!, 'Housekeeping') : 0 }))
  const hkMissing = hk.filter((x) => x.now === 0)
  const hkMed = median(hk.filter((x) => x.now > 0).map((x) => x.now))
  const hkHigh = hk.filter((x) => x.now > hkMed * 1.5)
  const catRule = new Map(s.business.bmCategories.map((c) => [c.code, c.partnerShareRule]))
  const psIssues = cur.filter((r) => {
    const ps = headTotal(r, 'Partner Share')
    return (ps > 0 && /^none$/i.test(catRule.get(r.site.category) ?? '')) || (ps > 0 && r.pnl.received && ps * 2 > r.pnl.received)
  })
  const psRows = cur.filter((r) => headTotal(r, 'Partner Share') > 0)
  const atRisk = cur.filter((r) => r.pnl.status === 'Profitable' && (r.pnl.margin < 10 || (prevOf(r) && prevOf(r)!.pnl.net > 0 && r.pnl.net * 10 < prevOf(r)!.pnl.net * 7)))
  const breakEven = cur
    .map((r) => {
      const p = prevOf(r)
      if (!p) return null
      const d = r.pnl.net - p.pnl.net
      if (r.pnl.net > 0 && d < 0) return { r, months: Math.ceil(r.pnl.net / -d), dir: 'to break-even (declining)' }
      if (r.pnl.net < 0 && d > 0) return { r, months: Math.ceil(-r.pnl.net / d), dir: 'to recover to break-even' }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => a!.months - b!.months)
  const totalRecv = sumP(cur.map((r) => r.pnl.received))
  const heads: ExpenseHead[] = ['Rent', 'Electricity Bill', 'Housekeeping', 'Staff Expenses', 'Partner Share', 'Other Expenses']
  const netShare = new Map(heads.map((h) => [h, totalRecv ? sumP(cur.map((r) => headTotal(r, h))) / totalRecv : 0]))
  const opt = cur
    .flatMap((r) => heads.map((h) => ({ r, h, share: r.pnl.received ? headTotal(r, h) / r.pnl.received : 0 })))
    .filter((x) => (netShare.get(x.h) ?? 0) > 0 && x.share > (netShare.get(x.h) ?? 0) * 1.5 && headTotal(x.r, x.h) > 200000)
    .sort((a, b) => headTotal(b.r, b.h) - headTotal(a.r, a.h))
  const lossVal = sumP(byStatus('Loss Making').map((r) => r.pnl.net))
  const expLink = (e: BmExpense) => ({ ref: e.atmId, detail: `${e.head} ${inr0(e.amount)} (${e.invoiceNo ?? e.id}) vs median ${inr0((headMed.get(e.head) ?? 0))}`, to: BM_LINK })
  return [
    {
      key: 'profit', title: 'Profitability Analysis', spec: 'Site-wise profit/loss', tone: byStatus('Loss Making').length ? 'red' : 'green',
      summary: `${ml(month)}: ${byStatus('Profitable').length} profitable, ${byStatus('Loss Making').length} loss-making (${inr0(lossVal)}), ${byStatus('Break-even').length} break-even, ${byStatus('Incomplete').length} incomplete (missing mandatory expense), ${byStatus('Reconciliation Pending').length} reconciliation pending.`,
      refs: [...cur].sort((a, b) => a.pnl.net - b.pnl.net).slice(0, 5).map((r) => ({ ref: r.site.atmId, detail: `${r.pnl.status}: ${inr0(r.pnl.net)} on ${inr0(r.pnl.received)}`, to: BM_LINK })),
      action: 'Complete missing expense records before treating Incomplete sites as profitable.',
    },
    {
      key: 'anomaly', title: 'Expense Anomaly', spec: 'Detect unusual expenses', tone: anomalies.length ? 'amber' : 'green',
      summary: `${anomalies.length} expense entries exceed ${limit !== null ? `the approval limit ${inr0(limit)} or ` : ''}2× the median for their head.${limit === null ? ' Approval limit pending Finance (§21-13).' : ''}`,
      refs: anomalies.slice(0, 6).map(expLink),
      action: 'Verify bills for the flagged expenses before approval.',
    },
    {
      key: 'elec', title: 'Electricity Analysis', spec: 'Identify abnormal bill increases', tone: elec.length ? 'red' : 'green',
      summary: elec.length ? `${elec.length} sites with electricity bill up more than 50% vs ${ml(v.prevMonth)}.` : `No abnormal electricity increase vs ${ml(v.prevMonth)}.`,
      refs: elec.map((x) => ({ ref: x.r.site.atmId, detail: `${inr0(x.prev)} → ${inr0(x.now)} (+${pct1(x.now - x.prev, x.prev)}%)`, to: BM_LINK })),
      action: 'Request meter reading / bill copy; check for arrears or tariff change.',
    },
    {
      key: 'rent', title: 'Rent Analysis', spec: 'Review rent trends and duplicate entries', tone: rentDup.length || rentRisk.length ? 'red' : rentChange.length ? 'amber' : 'green',
      summary: `${rentChange.length} sites with rent different from ${ml(v.prevMonth)}, ${rentDup.length} sites with more than one rent entry in the month, ${rentRisk.length} with rent deducted at source AND recorded as expense.`,
      refs: [
        ...rentDup.map((x) => ({ ref: x.r.site.atmId, detail: `${x.now.length} rent entries (${x.now.map((e) => e.invoiceNo).join(', ')})`, to: BM_LINK })),
        ...rentRisk.map((r) => ({ ref: r.site.atmId, detail: `Rent ${inr0(r.payout!.rentDeductedAtSource)} deducted at source and also booked`, to: BM_LINK })),
        ...rentChange.slice(0, 4).map((x) => ({ ref: x.r.site.atmId, detail: `${inr0(x.prev)} → ${inr0(sumP(x.now.map((e) => e.amount)))}`, to: BM_LINK })),
      ],
      action: 'Remove duplicate rent entries; rent deducted at source must not be deducted again (§6.3).',
    },
    {
      key: 'hk', title: 'Housekeeping Analysis', spec: 'Compare monthly charges', tone: hkMissing.length ? 'gray' : hkHigh.length ? 'amber' : 'green',
      summary: `Median housekeeping ${inr0(hkMed)}; ${hkHigh.length} sites above 1.5× median; ${hkMissing.length} sites with no housekeeping entry (mandatory head).`,
      refs: [...hkHigh.slice(0, 4).map((x) => ({ ref: x.r.site.atmId, detail: `${inr0(x.now)}${x.prev ? ` (prev ${inr0(x.prev)})` : ''}`, to: BM_LINK })), ...hkMissing.slice(0, 4).map((x) => ({ ref: x.r.site.atmId, detail: 'No housekeeping record', to: BM_LINK }))],
      action: 'Obtain missing invoices; compare vendor rates for high sites.',
    },
    {
      key: 'partner', title: 'Partner Share Analysis', spec: 'Check share against approved rules', tone: psIssues.length ? 'red' : s.rules.partnerShareBasis === null ? 'gray' : 'green',
      summary: `${psRows.length} sites carry partner share (${inr0(sumP(psRows.map((r) => headTotal(r, 'Partner Share'))))}). ${psIssues.length} conflict with the category rule or exceed 50% of payout.${s.rules.partnerShareBasis === null ? ' Partner share basis pending Finance (§21-08) — amounts cannot be re-verified yet.' : ` Basis: ${s.rules.partnerShareBasis}.`}`,
      refs: psIssues.map((r) => ({ ref: r.site.atmId, detail: `Share ${inr0(headTotal(r, 'Partner Share'))} · category rule "${catRule.get(r.site.category)}"`, to: BM_LINK })),
      action: 'Confirm partner agreements for flagged sites.',
    },
    {
      key: 'loss', title: 'Loss Prediction', spec: 'Identify sites at risk of loss', tone: atRisk.length ? 'amber' : 'green',
      summary: `${atRisk.length} profitable sites at risk (margin under 10% or net down more than 30% month-on-month).`,
      refs: atRisk.slice(0, 6).map((r) => ({ ref: r.site.atmId, detail: `Margin ${r.pnl.margin}% · net ${inr0(r.pnl.net)}${prevOf(r) ? ` (prev ${inr0(prevOf(r)!.pnl.net)})` : ''}`, to: BM_LINK })),
      action: 'Review cost heads at the at-risk sites.',
    },
    {
      key: 'breakeven', title: 'Break-even Prediction', spec: 'Forecast site break-even', tone: breakEven.length ? 'amber' : 'blue',
      summary: breakEven.length ? `${breakEven.length} sites trending toward break-even at the current monthly change (indicative).` : 'Not enough history to project break-even (needs two months).',
      refs: breakEven.slice(0, 6).map((x) => ({ ref: x!.r.site.atmId, detail: `~${x!.months} month(s) ${x!.dir}`, to: BM_LINK })),
      action: 'Prioritise sites closest to break-even for cost review.',
    },
    {
      key: 'optim', title: 'Expense Optimisation', spec: 'Recommend investigation of high expenses', tone: opt.length ? 'amber' : 'green',
      summary: opt.length ? `${opt.length} site / expense-head combinations run above 1.5× the network share of payout.` : 'No expense head is materially above the network share.',
      refs: opt.slice(0, 6).map((x) => ({ ref: x.r.site.atmId, detail: `${x.h} ${inr0(headTotal(x.r, x.h))} = ${Math.round(x.share * 1000) / 10}% of payout (network ${Math.round((netShare.get(x.h) ?? 0) * 1000) / 10}%)`, to: BM_LINK })),
      action: 'Investigate the listed heads; AI does not change any expense.',
    },
  ]
}

// ── §11.4 alerts ─────────────────────────────────────────────────────────
export const ALERT_TYPES = ['Payout Variance', 'Duplicate File', 'Account Mismatch', 'KYC Pending', 'UTR Pending', 'Expense Anomaly', 'Continuous Loss', 'Electricity Spike', 'Rent Deduction Risk', 'Mapping Violation', 'TL Share Mismatch'] as const
export type AlertType = (typeof ALERT_TYPES)[number]
export const ALERT_TRIGGER: Record<AlertType, string> = {
  'Payout Variance': 'Difference beyond approved tolerance',
  'Duplicate File': 'Same batch/file or duplicate records',
  'Account Mismatch': 'Bank details differ',
  'KYC Pending': 'Required KYC incomplete',
  'UTR Pending': 'Payment released but UTR missing',
  'Expense Anomaly': 'Expense exceeds approved threshold',
  'Continuous Loss': 'Repeated negative BM profitability',
  'Electricity Spike': 'Unusual bill increase',
  'Rent Deduction Risk': 'Potential double deduction',
  'Mapping Violation': 'Franchisee assigned BM Site',
  'TL Share Mismatch': 'TL calculation differs from approved rule',
}
export type AiAlert = { id: string; type: AlertType; severity: 'High' | 'Medium' | 'Low'; month: string; vertical: 'Franchise Model' | 'Business Model'; ref: string; detail: string; action: string; to?: string }

export function buildAlerts(v: View, s: Snapshot, month: string): AiAlert[] {
  const out: AiAlert[] = []
  const add = (a: Omit<AiAlert, 'id'>) => out.push({ ...a, id: `${a.type}|${a.month}|${a.ref}` })
  const fv = 'Franchise Model' as const
  const bv = 'Business Model' as const
  v.fr.filter((r) => r.recon === 'Variance Found').forEach((r) =>
    add({ type: 'Payout Variance', severity: r.maxAbs > 1000000 ? 'High' : 'Medium', month: r.month, vertical: fv, ref: r.atmId, detail: `${r.remark}; max difference ${inr0(r.maxAbs)}`, action: 'Resolve in Auto Reconciliation before approval', to: frLink(r.atmId, r.month) }),
  )
  const byFile = new Map<string, string[]>()
  s.payout.batches.forEach((b) => {
    ;[b.fileName && `file:${b.fileName}`, `name:${b.name}`].filter(Boolean).forEach((k) => byFile.set(k as string, [...(byFile.get(k as string) ?? []), b.id]))
  })
  byFile.forEach((ids, k) => {
    if (ids.length > 1) add({ type: 'Duplicate File', severity: 'High', month: month || '—', vertical: fv, ref: k.split(':')[1], detail: `Same ${k.startsWith('file') ? 'file' : 'batch name'} in batches ${ids.join(', ')}`, action: 'Reject the duplicate batch', to: MONTHLY_LINK })
  })
  v.fr.filter((r) => r.duplicates > 0).forEach((r) => add({ type: 'Duplicate File', severity: 'High', month: r.month, vertical: fv, ref: r.atmId, detail: `${r.duplicates} duplicate source record(s)`, action: 'Remove duplicate records before import', to: frLink(r.atmId, r.month) }))
  const live = s.accounts.filter((a) => a.status !== 'Superseded' && a.status !== 'Rejected')
  const byBen = new Map<string, Set<string>>()
  live.filter((a) => a.status === 'Active').forEach((a) => byBen.set(a.beneficiaryId, (byBen.get(a.beneficiaryId) ?? new Set()).add(`${a.accountNo}|${a.ifsc}`)))
  byBen.forEach((set, id) => {
    if (set.size > 1) add({ type: 'Account Mismatch', severity: 'High', month: month || '—', vertical: fv, ref: live.find((a) => a.beneficiaryId === id)?.name ?? id, detail: `${set.size} different active bank accounts`, action: 'Keep one effective-dated active account', to: ACCOUNTS_LINK })
  })
  const byNo = new Map<string, Set<string>>()
  live.forEach((a) => byNo.set(a.accountNo, (byNo.get(a.accountNo) ?? new Set()).add(a.name)))
  byNo.forEach((names, no) => {
    if (names.size > 1) add({ type: 'Account Mismatch', severity: 'High', month: month || '—', vertical: fv, ref: `A/c ••••${no.slice(-4)}`, detail: `Same account on ${[...names].join(', ')}`, action: 'Verify ownership of the shared account', to: ACCOUNTS_LINK })
  })
  live.filter((a) => !a.kycVerified).forEach((a) => add({ type: 'KYC Pending', severity: 'Medium', month: month || '—', vertical: a.vertical, ref: a.name, detail: `${a.beneficiaryType} account ${a.id} — KYC not verified (status ${a.status})`, action: 'Complete KYC verification', to: ACCOUNTS_LINK }))
  const missing = [...new Set(v.fr.filter((r) => r.acct === 'Missing').map((r) => r.frName))]
  if (missing.length) add({ type: 'KYC Pending', severity: 'Medium', month: month || '—', vertical: fv, ref: `${missing.length} payees`, detail: `No beneficiary account / KYC on file: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? '…' : ''}`, action: 'Map and verify beneficiary accounts', to: ACCOUNTS_LINK })
  v.fr.filter((r) => (r.payStatus === 'Paid' || r.line.paidDate) && !r.line.utr).forEach((r) => add({ type: 'UTR Pending', severity: 'Medium', month: r.month, vertical: fv, ref: r.atmId, detail: `Paid ${r.line.paidDate ?? ''} without UTR`, action: 'Capture UTR', to: frLink(r.atmId, r.month) }))
  v.mf.filter((m) => m.paidDate && !m.utr).forEach((m) => add({ type: 'UTR Pending', severity: 'Medium', month: m.month, vertical: fv, ref: m.mf, detail: `MF paid ${m.paidDate} without UTR`, action: 'Capture UTR', to: mfLink(m.month, m.mf) }))
  s.tl.shares.filter((x) => x.payment === 'Paid' && !x.utr && (!month || x.month === month)).forEach((x) => add({ type: 'UTR Pending', severity: 'Medium', month: x.month, vertical: fv, ref: x.tlName, detail: 'TL share paid without UTR', action: 'Capture UTR', to: '/finance/payouts/team-leader' }))
  // BM
  const exps = s.business.expenses.filter((e) => v.bm.some((r) => r.site.atmId === e.atmId && r.month === e.month) && e.status !== 'Rejected')
  const limit = s.rules.expenseApprovalLimit
  const med = (h: string) => median(exps.filter((e) => e.head === h).map((e) => e.amount))
  exps.filter((e) => (limit !== null && e.amount > limit) || e.amount > med(e.head) * 2).forEach((e) =>
    add({ type: 'Expense Anomaly', severity: limit !== null && e.amount > limit ? 'High' : 'Low', month: e.month, vertical: bv, ref: `${e.atmId} · ${e.head}`, detail: `${inr0(e.amount)}${limit !== null && e.amount > limit ? ` exceeds approval limit ${inr0(limit)}` : ` > 2× head median ${inr0(med(e.head))}`}`, action: 'Verify bill and approval', to: BM_LINK }),
  )
  const prevMap = byAtmMonth(v.bmPrev)
  v.bm.forEach((r) => {
    const p = prevMap.get(`${v.prevMonth}|${r.site.atmId}`)
    if (r.pnl.status === 'Loss Making' && p && p.pnl.net < 0) add({ type: 'Continuous Loss', severity: 'High', month: r.month, vertical: bv, ref: r.site.atmId, detail: `Loss ${inr0(r.pnl.net)} after ${inr0(p.pnl.net)} in ${ml(v.prevMonth)}`, action: 'Management review of site viability', to: BM_LINK })
    const e1 = headTotal(r, 'Electricity Bill')
    const e0 = p ? headTotal(p, 'Electricity Bill') : 0
    if (e0 > 0 && e1 * 2 > e0 * 3 && e1 - e0 > 100000) add({ type: 'Electricity Spike', severity: 'Medium', month: r.month, vertical: bv, ref: r.site.atmId, detail: `${inr0(e0)} → ${inr0(e1)} (+${pct1(e1 - e0, e0)}%)`, action: 'Check meter reading / bill', to: BM_LINK })
    if (r.rentRisk) add({ type: 'Rent Deduction Risk', severity: 'High', month: r.month, vertical: bv, ref: r.site.atmId, detail: `Rent ${inr0(r.payout!.rentDeductedAtSource)} deducted at source and also recorded as expense`, action: 'Remove the duplicate rent deduction', to: BM_LINK })
    const rents = s.business.expenses.filter((e) => e.atmId === r.site.atmId && e.month === r.month && e.head === 'Rent' && e.status !== 'Rejected')
    if (rents.length > 1) add({ type: 'Rent Deduction Risk', severity: 'Medium', month: r.month, vertical: bv, ref: `${r.site.atmId} (dup)`, detail: `${rents.length} rent entries in one month`, action: 'Remove duplicate rent entry', to: BM_LINK })
  })
  const frTier = new Map(franchiseStore.get().map((f) => [f.name, f.tier]))
  s.business.bmSites.forEach((b) => {
    if (frTier.get(b.mf) === 'Franchise' || frTier.get(b.superMf) === 'Franchise')
      add({ type: 'Mapping Violation', severity: 'High', month: month || '—', vertical: bv, ref: b.atmId, detail: `BM site mapped to Franchisee "${frTier.get(b.mf) === 'Franchise' ? b.mf : b.superMf}" — not permitted (§6.1)`, action: 'Re-map to an eligible MF / Super MF', to: BM_LINK })
  })
  const seen = new Set<string>()
  s.tl.shares.filter((x) => !month || x.month === month).forEach((x) => {
    const rule = s.tl.rules.find((r) => r.tlId === x.tlId && r.status === 'Approved')
    const k = `${x.tlId}|${x.month}`
    if (seen.has(k)) add({ type: 'TL Share Mismatch', severity: 'High', month: x.month, vertical: fv, ref: `${x.tlName} (dup)`, detail: 'Duplicate TL share for the same month (§5.6)', action: 'Remove duplicate share', to: '/finance/payouts/team-leader' })
    seen.add(k)
    if (!rule) return add({ type: 'TL Share Mismatch', severity: 'High', month: x.month, vertical: fv, ref: x.tlName, detail: 'Share recorded without an approved TL rule', action: 'Approve rule or reverse share', to: '/finance/payouts/team-leader' })
    if (rule.type === 'Percentage') {
      const expected = Math.round((x.eligibleProfit * rule.value) / 100)
      if (expected !== x.share) add({ type: 'TL Share Mismatch', severity: 'Medium', month: x.month, vertical: fv, ref: x.tlName, detail: `Share ${inr0(x.share)} ≠ ${rule.value}% of eligible ${inr0(x.eligibleProfit)} (${inr0(expected)})`, action: 'Recalculate TL share', to: '/finance/payouts/team-leader' })
    }
  })
  const sev = { High: 0, Medium: 1, Low: 2 }
  return out.sort((a, b) => sev[a.severity] - sev[b.severity] || a.type.localeCompare(b.type))
}

// ── §11.3 Ask AI (keyword matching → table answer) ────────────────────────
export type AiAnswer = { title: string; period: string; vertical: string; columns: Col[]; rows: Cell[][]; refs: Ref[]; explanation: string; action: string }
export const EXAMPLE_QUERIES = [
  'Show all Franchise Model payouts for this month.',
  'Which Franchisees have pending payouts?',
  'Show Team Leader-wise profit sharing.',
  'Which MF has the highest Franchise payout?',
  'Show all Business Model Sites making losses.',
  'Which BM Site has the highest rent?',
  'Identify sites with unusually high electricity bills.',
  'Show MF-wise BM net profit.',
  'Show Super MF consolidated BM profitability.',
  'Compare September and October profit/loss.',
  'Why did this site enter loss?',
  'Show all unreconciled payouts.',
  'Which accounts have pending KYC?',
  'Generate a consolidated management report.',
]
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

export function askAi(query: string, m: Model, v: View, month: string, alerts: AiAlert[]): AiAnswer | null {
  const q = query.toLowerCase()
  const has = (...w: string[]) => w.every((x) => q.includes(x))
  const any = (...w: string[]) => w.some((x) => q.includes(x))
  const s = m.snap
  const period = ml(month)
  const FR = 'Franchise Model'
  const BM = 'Business Model'
  const frCols: Col[] = [{ label: 'ATM ID' }, { label: 'Site ID' }, { label: 'Franchisee' }, { label: 'MF' }, { label: 'Gross', kind: 'money' }, { label: 'Net Payout', kind: 'money' }, { label: 'Payout Status', kind: 'status' }]
  const frRow = (r: FrRow): Cell[] => [r.atmId, r.siteId, r.frName, r.mfName, r.line.gross, r.line.net, r.payStatus]
  const bmCols: Col[] = [{ label: 'ATM ID' }, { label: 'MF' }, { label: 'Super MF' }, { label: 'Payout Received', kind: 'money' }, { label: 'Total Expenses', kind: 'money' }, { label: 'Net P/L', kind: 'money' }, { label: 'Status', kind: 'status' }]
  const bmRow = (r: BmRow): Cell[] => [r.site.atmId, r.site.mf, r.site.superMf, r.pnl.received, r.pnl.total, r.pnl.net, r.pnl.status]
  const frRefs = (rs_: FrRow[]) => rs_.slice(0, 5).map((r) => ({ ref: r.atmId, detail: `${r.line.batchId} · ${r.line.source} line ${r.line.id}`, to: frLink(r.atmId, r.month) }))
  const bmRefs = (rs_: BmRow[]) => rs_.slice(0, 5).map((r) => ({ ref: r.site.atmId, detail: `${r.payout?.reference ?? 'No payout record'} · ${r.site.code}`, to: BM_LINK }))

  if (has('why') && any('loss')) {
    const atm = v.bm.find((r) => q.includes(r.site.atmId.toLowerCase()))
    const r = atm ?? [...v.bm].filter((x) => x.pnl.status === 'Loss Making').sort((a, b) => a.pnl.net - b.pnl.net)[0]
    if (!r) return { title: 'No loss-making BM site for the selected filters', period, vertical: BM, columns: [], rows: [], refs: [], explanation: 'Every BM site with complete records has non-negative net profit.', action: 'None.' }
    const p = v.bmPrev.find((x) => x.site.atmId === r.site.atmId)
    const rows: Cell[][] = [['Business payout received', r.pnl.received, p?.pnl.received ?? 0, r.pnl.received - (p?.pnl.received ?? 0)], ...Object.entries(r.pnl.heads).map(([h, a]) => [h, a, p?.pnl.heads[h as ExpenseHead] ?? 0, a - (p?.pnl.heads[h as ExpenseHead] ?? 0)] as Cell[]), ['Net profit / loss', r.pnl.net, p?.pnl.net ?? 0, r.pnl.net - (p?.pnl.net ?? 0)]]
    const worst = Object.entries(r.pnl.heads).map(([h, a]) => ({ h, d: a - (p?.pnl.heads[h as ExpenseHead] ?? 0) })).sort((a, b) => b.d - a.d)[0]
    return {
      title: `Why ${r.site.atmId} is ${r.pnl.status}`, period: `${period} vs ${ml(v.prevMonth)}`, vertical: BM,
      columns: [{ label: 'Particular' }, { label: ml(month), kind: 'money' }, { label: ml(v.prevMonth), kind: 'money' }, { label: 'Change', kind: 'money' }], rows,
      refs: bmRefs([r]),
      explanation: `Net = Payout received ${inr0(r.pnl.received)} − expenses ${inr0(r.pnl.total)} = ${inr0(r.pnl.net)}.${p ? ` Payout changed by ${signed(r.pnl.received - p.pnl.received)}; the biggest expense increase is ${worst.h} (${signed(worst.d)}).` : ''}${r.pnl.missing.length ? ` Missing mandatory heads: ${r.pnl.missing.join(', ')}.` : ''}`,
      action: 'Review the head with the largest increase and confirm the payout statement.',
    }
  }
  if (any('compare') || MONTHS.filter((x) => q.includes(x) || q.includes(x.slice(0, 3) + ' ')).length >= 2) {
    const ms = MONTHS.map((x, i) => (q.includes(x) ? i : -1)).filter((i) => i >= 0)
    const year = (month || m.latestMonth).slice(0, 4)
    const want = ms.length >= 2 ? ms.slice(0, 2).map((i) => `${year}-${String(i + 1).padStart(2, '0')}`) : [v.prevMonth, month]
    const rows = want.map((mo) => {
      const fr = v.frTrend.filter((r) => r.month === mo)
      const bm = v.bmTrend.filter((r) => r.month === mo)
      return [ml(mo), fr.length, sumP(fr.map((r) => r.line.net)), sumP(fr.map((r) => r.line.mfRevenue)), bm.length, sumP(bm.map((r) => r.pnl.received)), sumP(bm.map((r) => r.pnl.total)), sumP(bm.map((r) => r.pnl.net)), bm.filter((r) => r.pnl.status === 'Loss Making').length] as Cell[]
    })
    const empty = want.filter((_, i) => !rows[i][1] && !rows[i][4]).map(ml)
    return {
      title: `Profit / loss comparison: ${want.map(ml).join(' vs ')}`, period: want.map(ml).join(' vs '), vertical: 'Consolidated (vertical-wise)',
      columns: [{ label: 'Month' }, { label: 'FR ATMs', kind: 'num' }, { label: 'Franchisee Net Payout', kind: 'money' }, { label: 'Net MF Revenue', kind: 'money' }, { label: 'BM Sites', kind: 'num' }, { label: 'BM Payout', kind: 'money' }, { label: 'BM Expenses', kind: 'money' }, { label: 'BM Net', kind: 'money' }, { label: 'BM Loss Sites', kind: 'num' }],
      rows, refs: [],
      explanation: `Franchise figures sum payable lines (Auto → File → Manual); BM net = payout received − expenses per site. Verticals are reported separately, never merged.${empty.length ? ` No records exist for ${empty.join(', ')}.` : ''}`,
      action: 'Drill into the months from the Profit & Loss tab.',
    }
  }
  if (any('kyc')) {
    const xs = s.accounts.filter((a) => !a.kycVerified && a.status !== 'Superseded' && a.status !== 'Rejected')
    return {
      title: 'Accounts with pending KYC', period: 'As of today', vertical: 'All',
      columns: [{ label: 'Beneficiary' }, { label: 'Type' }, { label: 'Bank' }, { label: 'Status', kind: 'status' }, { label: 'Effective From' }], rows: xs.map((a) => [a.name, a.beneficiaryType, a.bank, a.status, a.effectiveFrom]),
      refs: xs.slice(0, 5).map((a) => ({ ref: a.id, detail: a.name, to: ACCOUNTS_LINK })),
      explanation: `${xs.length} beneficiary accounts are not KYC-verified; only active verified accounts may be used for payment (§8.1).`, action: 'Complete KYC in Account Mapping before release.',
    }
  }
  if (any('unreconciled', 'not reconciled', 'unmatched', 'exception')) {
    const fr = v.fr.filter((r) => r.recon !== 'Matched')
    const bm = v.bm.filter((r) => bmReconOf(r) === 'Pending')
    return {
      title: 'Unreconciled payouts', period, vertical: 'Consolidated (vertical-wise)',
      columns: [{ label: 'Vertical' }, { label: 'ATM ID' }, { label: 'Beneficiary / MF' }, { label: 'Status', kind: 'status' }, { label: 'Reason' }, { label: 'Amount at issue', kind: 'money' }],
      rows: [...fr.map((r) => [FR, r.atmId, r.frName, r.recon, r.remark, r.maxAbs] as Cell[]), ...bm.map((r) => [BM, r.site.atmId, r.site.mf, r.pnl.status, r.pnl.missing.length ? `Missing ${r.pnl.missing.join(', ')}` : 'No payout record', r.pnl.received] as Cell[])],
      refs: [...frRefs(fr), ...bmRefs(bm)].slice(0, 6),
      explanation: `${fr.length} Franchise ATMs are not matched across Manual / File / Auto, and ${bm.length} BM sites are Incomplete or Reconciliation Pending.`, action: 'Resolve before approval; unresolved critical mismatches are never released automatically.',
    }
  }
  if (any('pending') && any('payout', 'franchisee')) {
    const xs = v.fr.filter((r) => r.payStatus !== 'Paid')
    return { title: 'Franchisees with pending payouts', period, vertical: FR, columns: frCols, rows: xs.map(frRow), refs: frRefs(xs), explanation: `${xs.length} payable lines are not yet Paid (batch not released / credited). Total ${inr0(sumP(xs.map((r) => r.line.net)))}.`, action: 'Approve and release through Monthly Payout (maker-checker).' }
  }
  if (any('team leader', 'tl-wise', 'tl wise', ' tl ')) {
    const rows = s.tl.rules.map((rule) => {
      const base = sumP(v.fr.filter((r) => rule.siteAtmIds.includes(r.atmId)).map((r) => r.tlBase))
      const sh = s.tl.shares.filter((x) => x.tlId === rule.tlId && (!month || x.month === month))
      return [rule.tlName, rule.siteAtmIds.length, rule.status, rule.type, base, sumP(sh.map((x) => x.share)), sh[0]?.payment ?? '—'] as Cell[]
    })
    return {
      title: 'Team Leader-wise profit sharing', period, vertical: FR,
      columns: [{ label: 'Team Leader' }, { label: 'Sites', kind: 'num' }, { label: 'Rule Status', kind: 'status' }, { label: 'Type' }, { label: 'Eligible base (plan TL rates)', kind: 'money' }, { label: 'TL Share', kind: 'money' }, { label: 'Payment', kind: 'status' }], rows,
      refs: s.tl.rules.slice(0, 5).map((r) => ({ ref: r.id, detail: r.tlName, to: '/finance/payouts/team-leader' })),
      explanation: `TL share is recorded only from approved rules; BM profit is never included.${s.rules.tlEligibleProfitBasis === null ? ' Eligible-profit definition is pending Finance (§21-01).' : ''}`,
      action: 'Approve pending TL rules.',
    }
  }
  if (any('super') && any('bm', 'business')) {
    const g = groupBm(v.bm, 'smf')
    return {
      title: 'Super MF consolidated BM profitability', period, vertical: BM,
      columns: [{ label: 'Super MF' }, { label: 'Sites', kind: 'num' }, { label: 'Payout', kind: 'money' }, { label: 'Expenses', kind: 'money' }, { label: 'Net', kind: 'money' }, { label: 'Loss sites', kind: 'num' }, { label: 'Incomplete', kind: 'num' }],
      rows: g.map((x) => [x.name, x.sites, x.received, x.expenses, x.net, x.loss, x.incomplete]), refs: [],
      explanation: 'Each BM site is counted once under its mapped MF → Super MF; operating profit is shown separately from any contractual MF / Super MF share (§7.2).', action: 'Contractual Super MF share requires Finance rule §21-06.',
    }
  }
  if (any('mf') && any('bm', 'business')) {
    const g = groupBm(v.bm, 'mf')
    return {
      title: 'MF-wise BM net profit', period, vertical: BM,
      columns: [{ label: 'Master Franchise' }, { label: 'Sites', kind: 'num' }, { label: 'Payout', kind: 'money' }, { label: 'Expenses', kind: 'money' }, { label: 'Net', kind: 'money' }, { label: 'Profitable', kind: 'num' }, { label: 'Loss', kind: 'num' }],
      rows: g.map((x) => [x.name, x.sites, x.received, x.expenses, x.net, x.profitable, x.loss]), refs: [],
      explanation: 'MF net = Σ (payout received − expenses) of its mapped BM sites.', action: 'Review MFs with negative net.',
    }
  }
  if (any('highest', 'top', 'most') && any('mf', 'master')) {
    const g = new Map<string, FrRow[]>()
    v.fr.forEach((r) => g.set(r.mfName, [...(g.get(r.mfName) ?? []), r]))
    const rows = [...g.entries()].map(([mf, rs_]) => [mf, rs_.length, sumP(rs_.map((r) => r.line.net)), sumP(rs_.map((r) => r.line.mfRevenue))] as Cell[]).sort((a, b) => Number(b[2]) - Number(a[2]))
    return {
      title: `MF with the highest Franchise payout: ${rows[0]?.[0] ?? '—'}`, period, vertical: FR,
      columns: [{ label: 'Master Franchise' }, { label: 'ATMs', kind: 'num' }, { label: 'Franchisee Net Payout', kind: 'money' }, { label: 'Net MF Revenue', kind: 'money' }], rows,
      refs: rows.slice(0, 3).map((r) => ({ ref: String(r[0]), detail: 'MF register', to: mfLink(month, String(r[0])) })),
      explanation: 'Ranked by the sum of Franchisee net payout of the MF’s mapped ATMs; MF revenue shown separately.', action: 'Open the MF register for line-level detail.',
    }
  }
  if (any('rent')) {
    const xs = [...v.bm].sort((a, b) => headTotal(b, 'Rent') - headTotal(a, 'Rent'))
    return {
      title: `Highest rent: ${xs[0]?.site.atmId ?? '—'}`, period, vertical: BM,
      columns: [{ label: 'ATM ID' }, { label: 'MF' }, { label: 'Rent', kind: 'money' }, { label: 'Rent deducted at source', kind: 'money' }, { label: 'Payout', kind: 'money' }, { label: 'Rent % of payout', kind: 'pct' }],
      rows: xs.slice(0, 15).map((r) => [r.site.atmId, r.site.mf, headTotal(r, 'Rent'), r.payout?.rentDeductedAtSource ?? 0, r.pnl.received, pct1(headTotal(r, 'Rent'), r.pnl.received)]),
      refs: bmRefs(xs), explanation: 'Rent from the expense ledger; rent already deducted at source is not counted again (§6.3).', action: 'Check rent agreements for the top sites.',
    }
  }
  if (any('electric')) {
    const med = median(v.bm.map((r) => headTotal(r, 'Electricity Bill')).filter(Boolean))
    const xs = v.bm.map((r) => ({ r, e: headTotal(r, 'Electricity Bill'), p: v.bmPrev.find((x) => x.site.atmId === r.site.atmId) })).filter((x) => x.e > med * 1.5 || (x.p && headTotal(x.p, 'Electricity Bill') * 3 < x.e * 2)).sort((a, b) => b.e - a.e)
    return {
      title: 'Sites with unusually high electricity bills', period, vertical: BM,
      columns: [{ label: 'ATM ID' }, { label: 'Electricity', kind: 'money' }, { label: ml(v.prevMonth), kind: 'money' }, { label: 'Network median', kind: 'money' }, { label: 'vs median', kind: 'pct' }],
      rows: xs.map((x) => [x.r.site.atmId, x.e, x.p ? headTotal(x.p, 'Electricity Bill') : 0, med, pct1(x.e - med, med)]), refs: bmRefs(xs.map((x) => x.r)),
      explanation: 'Flagged when the bill is above 1.5× the network median or up more than 50% month-on-month.', action: 'Request meter reading and bill copies.',
    }
  }
  if (any('loss') && any('bm', 'business', 'site')) {
    const xs = v.bm.filter((r) => r.pnl.status === 'Loss Making').sort((a, b) => a.pnl.net - b.pnl.net)
    return { title: 'Business Model sites making losses', period, vertical: BM, columns: bmCols, rows: xs.map(bmRow), refs: bmRefs(xs), explanation: `${xs.length} sites have expenses above payout received (total loss ${inr0(sumP(xs.map((r) => r.pnl.net)))}). Incomplete sites are excluded — they are never classified automatically.`, action: 'Ask "why did ATM … enter loss" for a breakdown.' }
  }
  if (any('management report', 'consolidated', 'summary')) {
    const fr = v.fr
    const bm = v.bm
    const rows: Cell[][] = [
      [FR, 'Sites', new Set(fr.map((r) => r.atmId)).size, ''],
      [FR, 'Franchisee net payout', sumP(fr.map((r) => r.line.net)), 'Payable lines'],
      [FR, 'MF net payout', sumP(v.mf.map((x) => x.net)), 'After MF adjustments'],
      [FR, 'TL share', sumP(s.tl.shares.filter((x) => x.month === month).map((x) => x.share)), 'Approved rules only'],
      [FR, 'Variance ATMs', fr.filter((r) => r.recon === 'Variance Found').length, ''],
      [BM, 'Sites', new Set(bm.map((r) => r.site.atmId)).size, ''],
      [BM, 'Payout received', sumP(bm.map((r) => r.pnl.received)), ''],
      [BM, 'Expenses', sumP(bm.map((r) => r.pnl.total)), ''],
      [BM, 'Net (operating)', sumP(bm.map((r) => r.pnl.net)), 'Before contractual MF/SMF share'],
      [BM, 'Loss-making sites', bm.filter((r) => r.pnl.status === 'Loss Making').length, ''],
      ['Both', 'Open AI alerts', alerts.length, 'Pending review'],
    ]
    return {
      title: 'Consolidated management report', period, vertical: 'Consolidated (vertical-wise)', columns: [{ label: 'Vertical' }, { label: 'Metric' }, { label: 'Value' }, { label: 'Note' }],
      rows: rows.map((r) => [r[0], r[1], typeof r[2] === 'number' && /payout|share|received|expenses|net \(/i.test(String(r[1])) ? inr0(r[2]) : r[2], r[3]]),
      refs: [{ ref: 'MIS & Reports', detail: 'Full report catalogue', to: '/finance/payouts/reports' }],
      explanation: 'Each vertical is computed by its own engine; figures are not merged into one profit number (§4.2).', action: 'Export the full pack from MIS & Reports.',
    }
  }
  if (any('franchise', 'payout')) {
    return { title: 'Franchise Model payouts', period, vertical: FR, columns: frCols, rows: v.fr.map(frRow), refs: frRefs(v.fr), explanation: `${v.fr.length} ATMs; payable figure from Auto → File → Manual line. Total net ${inr0(sumP(v.fr.map((r) => r.line.net)))}.`, action: 'Open the Franchisee register for all 19 components.' }
  }
  return null
}
