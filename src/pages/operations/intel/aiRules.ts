// "Dexter AI rules v1" — deterministic, rule-based stand-ins for the §15.1 AI capabilities.
// Every output is an observation / suggestion only: AI never approves, verifies or changes a record (§15.3).
import { amountOf } from '@/data/cbr'
import { fromPaise } from '@/data/payout'
import type { Employee, EscalationRule } from '@/data/workflow'
import { OPEN_TASK, isOverdueTask, toIso, type OpsSources } from './sources'
import { inr } from './fmt'

export type Severity = 'High' | 'Medium' | 'Low' | 'Info'
export type Finding = { id: string; text: string; severity: Severity; link?: string }
export type Analysis = { key: string; no: number; title: string; example: string; inputs: number; findings: Finding[]; summary: string }

const H = 3_600_000
const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0)

export function cbrMismatch(s: OpsSources): Analysis {
  const findings: Finding[] = []
  for (const d of s.cbrDaily) {
    const diff = amountOf(d.groups.closing) - amountOf(d.groups.switch)
    if (diff !== 0) findings.push({ id: d.id, severity: Math.abs(diff) >= 500 ? 'High' : 'Medium', text: `${d.atmId} on ${d.date}: physical closing vs switch balance differs by ${inr(diff)}${d.remarks ? ` — "${d.remarks}"` : ''}`, link: `/cbr/consolidated/daily/${d.id}` })
  }
  const pendingFr = s.cbr.filter((r) => r.status === 'Returned for Correction' || r.status === 'Rejected')
  pendingFr.forEach((r) => findings.push({ id: r.id, severity: 'Medium', text: `${r.id} (${r.atmId}) is ${r.status}${r.rejectReason ? ` · ${r.rejectReason}` : ''} — re-check cash balance figures`, link: '/cbr' }))
  return { key: 'cbr', no: 2, title: 'CBR Analysis', example: 'Cash balance mismatch identification', inputs: s.cbrDaily.length + s.cbr.length, findings, summary: `${findings.length} cash-balance exceptions across ${new Set(findings.map((f) => f.text.split(' ')[0])).size} ATMs (Full Funding only).` }
}

export function cashLoadingTrend(s: OpsSources): Analysis {
  const findings: Finding[] = []
  const byAtm = new Map<string, typeof s.register>()
  s.register.forEach((r) => byAtm.set(r.atmId, [...(byAtm.get(r.atmId) ?? []), r]))
  for (const [atm, rows] of byAtm) {
    const mean = rows.reduce((a, r) => a + r.loading, 0) / rows.length
    for (const r of rows) {
      const dev = pct(r.loading, mean)
      if (Math.abs(dev) >= 25) findings.push({ id: `${atm}-${r.no}-dev`, severity: Math.abs(dev) >= 40 ? 'High' : 'Medium', text: `${atm} ${r.date}: loading ${inr(r.loading)} is ${dev > 0 ? '+' : ''}${dev}% vs its average ${inr(mean)}`, link: '/operations/cash-loading/register' })
      const gap = r.closingBalance - r.switchBalance
      if (gap !== 0 || r.shortage || r.overage) findings.push({ id: `${atm}-${r.no}-gap`, severity: 'High', text: `${atm} ${r.date}: closing ${inr(r.closingBalance)} vs switch ${inr(r.switchBalance)}${r.shortage ? ` · shortage ${inr(r.shortage)}` : ''}${r.overage ? ` · overage ${inr(r.overage)}` : ''}`, link: '/operations/cash-loading/register' })
    }
  }
  const total = s.cl.reduce((a, r) => a + r.amount, 0)
  return { key: 'cl', no: 3, title: 'Cash Loading Analysis', example: 'Loading trend and unusual variation', inputs: s.register.length + s.cl.length, findings, summary: `${byAtm.size} Self Funding ATMs analysed · ${s.cl.length} Cash Loading Master records worth ${inr(total)} · ${findings.length} unusual variations.` }
}

export function alfForecast(s: OpsSources): Analysis {
  const findings: Finding[] = []
  const outstanding = s.alf.filter((a) => a.status === 'Approved' || a.status === 'Submitted')
  outstanding.forEach((a) => findings.push({ id: a.id, severity: a.status === 'Approved' && a.reversal < new Date().toISOString().slice(0, 10) ? 'High' : 'Low', text: `${a.atmId}: ${a.type} ALF ${inr(fromPaise(a.amount))} ${a.status.toLowerCase()} · reversal due ${a.reversal}`, link: '/operations/alf-forecast' }))
  let need = 0
  s.forecasts.forEach((f) => {
    const gap = fromPaise(f.requiredIndent - f.todaysIndent)
    if (gap > 0) {
      need += gap
      findings.push({ id: `${f.id}-need`, severity: gap > 300000 ? 'High' : 'Medium', text: `${f.atmId} (${f.kind}, ${f.date}): required indent exceeds today's indent by ${inr(gap)} → expected additional fund requirement`, link: '/operations/bm-cash-forecast' })
    }
  })
  return { key: 'alf', no: 4, title: 'ALF Forecasting', example: 'Expected additional fund requirement', inputs: s.alf.length + s.forecasts.length, findings, summary: `Expected additional fund requirement ${inr(need)} · ${outstanding.length} ALF requests outstanding (${inr(outstanding.reduce((a, x) => a + fromPaise(x.amount), 0))}).` }
}

const EOD_DONE = new Set(['Approved', 'Rejected'])
export function eodMonitoring(s: OpsSources, now: number): Analysis {
  const findings: Finding[] = []
  s.eod.forEach((r) => {
    if (EOD_DONE.has(r.stage)) return
    const age = Math.floor((now - Date.parse(`${toIso(r.eodDate)}T22:30:00+05:30`)) / (24 * H))
    if (r.stage === 'Exception Review' || r.stage === 'Returned for Correction' || age >= 2)
      findings.push({ id: r.id, severity: r.stage === 'Exception Review' ? 'High' : age >= 3 ? 'High' : 'Medium', text: `${r.type} EOD ${r.id} (${r.atmId}, ${r.eodDate}) is "${r.stage}"${age > 0 ? ` for ${age} day(s)` : ''}`, link: '/operations/eod' })
  })
  s.monthly.filter((m) => m.mismatchDays > 0 && m.status !== 'Approved').forEach((m) => findings.push({ id: m.id, severity: 'Medium', text: `Monthly EOD ${m.month} · ${m.atmId} (${m.funding}): ${m.mismatchDays} day(s) differ from ${m.source}`, link: '/operations/eod' }))
  return { key: 'eod', no: 5, title: 'EOD Monitoring', example: 'Delayed / incomplete EOD identification', inputs: s.eod.length + s.monthly.length, findings, summary: `${findings.length} delayed / incomplete EOD items (Routine, Cash Audit and Monthly).` }
}

export function repeatedEodExceptions(s: OpsSources) {
  const by = new Map<string, number>()
  s.eod.forEach((r) => {
    const exc = !r.rule.passed || r.stage === 'Returned for Correction' || r.events.some((e) => e.diffType !== 'Nil')
    if (exc) by.set(r.atmId, (by.get(r.atmId) ?? 0) + 1)
  })
  s.monthly.forEach((m) => m.mismatchDays > 0 && by.set(m.atmId, (by.get(m.atmId) ?? 0) + 1))
  return [...by.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])
}

/** Per-site daily series from the Transaction Master: last-7-day vs previous-7-day average. */
function txnWindows(s: OpsSources) {
  const dates = [...new Set(s.txn.map((t) => t.date).filter(Boolean))].sort()
  const last = dates.at(-1) ?? ''
  const shift = (iso: string, d: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10)
  return { last, recentFrom: last ? shift(last, -6) : '', prevFrom: last ? shift(last, -13) : '' }
}
export function txnTrend(s: OpsSources): Analysis {
  const findings: Finding[] = []
  const { last, recentFrom, prevFrom } = txnWindows(s)
  const by = new Map<string, { recent: number[]; prev: number[]; funding: string }>()
  s.txn.forEach((t) => {
    const r = by.get(t.atmId) ?? { recent: [], prev: [], funding: t.funding }
    if (t.date >= recentFrom && t.date <= last) r.recent.push(t.count)
    else if (t.date >= prevFrom && t.date < recentFrom) r.prev.push(t.count)
    by.set(t.atmId, r)
  })
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
  for (const [atm, r] of by) {
    if (!r.recent.length) continue
    const a = avg(r.recent)
    const b = avg(r.prev)
    const d = pct(a, b)
    findings.push({ id: atm, severity: b && d <= -20 ? 'High' : b && d < 0 ? 'Medium' : 'Info', text: `${atm} (${r.funding}): ${Math.round(a)} txns/day in the last 7 days vs ${b ? Math.round(b) : '—'} the week before${b ? ` (${d > 0 ? '+' : ''}${d}%)` : ''}`, link: '/operations/txn-data' })
  }
  findings.sort((a, b) => sevRank(a.severity) - sevRank(b.severity))
  return { key: 'txn', no: 6, title: 'Transaction Analysis', example: 'Site-wise transaction trend', inputs: s.txn.length, findings, summary: `${by.size} sites · ${findings.filter((f) => f.severity === 'High').length} trending 20%+ below the previous week (up to ${last || '—'}).` }
}

export function disputeMatching(s: OpsSources, now: number): Analysis {
  const findings: Finding[] = []
  s.disputes.filter((d) => d.open).forEach((d) => {
    const ev = [d.rrn && 'RRN', d.utr && 'UTR', d.txnId && 'TXN ID', d.slip && 'slip'].filter(Boolean)
    const cb = s.chargebacks.find((c) => (d.rrn && c.rrn === d.rrn) || (c.atmId === d.atmId && c.amount === d.amount))
    const txn = s.txn.find((t) => t.atmId === d.atmId && t.date === d.date)
    findings.push({
      id: d.id,
      severity: ev.length < 3 ? 'Medium' : 'Low',
      text: `${d.id} (${d.atmId}, ${inr(d.amount)}, ${d.status}): evidence ${ev.join(' + ') || 'none'}${cb ? ` · possible match with chargeback ${cb.id}` : ''}${txn ? ` · Transaction Master ${txn.id} shows ${txn.count} txns that day` : ' · no Transaction Master entry for that ATM / date'}`,
      link: '/operations/reconciliation/failed-txns',
    })
  })
  s.chargebacks.filter((c) => c.open && (c.overdue || (!c.frResponded && now - Date.parse(c.receivedAt) > 24 * H))).forEach((c) =>
    findings.push({ id: `${c.id}-late`, severity: 'High', text: `Chargeback ${c.id} (${c.atmId}, ${inr(c.amount)}): ${c.frResponded ? 'response report' : 'franchise response'} overdue — due ${c.dueAt.slice(0, 16).replace('T', ' ')} · stage ${c.stage}`, link: '/operations/reconciliation/charge-back' }),
  )
  return { key: 'dispute', no: 7, title: 'Dispute Analysis', example: 'Transaction and evidence matching suggestions', inputs: s.disputes.length + s.chargebacks.length, findings, summary: `${findings.length} dispute suggestions · ${findings.filter((f) => f.id.endsWith('-late')).length} overdue responses.` }
}

export function repeatedComplaints(s: OpsSources): Analysis {
  const findings: Finding[] = []
  const by = new Map<string, typeof s.complaints>()
  s.complaints.forEach((c) => {
    const k = `${c.atmId}|${c.category}`
    by.set(k, [...(by.get(k) ?? []), c])
  })
  for (const [k, list] of by) {
    if (list.length < 2) continue
    const [atm, cat] = k.split('|')
    const open = list.filter((c) => c.status === 'Open').length
    findings.push({ id: k, severity: list.length >= 3 ? 'High' : 'Medium', text: `${atm}: ${list.length} "${cat}" complaints (${open} open) — recurring site issue, consider root-cause visit / replacement`, link: `/operations/complaints/${list[0].id}` })
  }
  findings.sort((a, b) => sevRank(a.severity) - sevRank(b.severity))
  return { key: 'complaint', no: 8, title: 'Complaint Intelligence', example: 'Repeated complaints and recurring site issues', inputs: s.complaints.length, findings, summary: `${findings.length} recurring ATM / category combinations.` }
}

/** Same rule as the engine's runEscalations: the highest level whose afterHours window has passed. */
export function suggestedLevel(rules: EscalationRule[], module: string, hoursLate: number) {
  const r = rules.filter((x) => x.module === module && x.level > 1 && hoursLate >= x.afterHours - 24).sort((a, b) => a.level - b.level).pop()
  return r?.level ?? 2
}
export function taskIntel(s: OpsSources, now: number): Analysis {
  const emp = (id: string): Employee | undefined => s.hierarchy.employees.find((e) => e.id === id)
  const findings: Finding[] = s.wf.tasks
    .filter((t) => isOverdueTask(t, now))
    .map((t) => {
      const late = (now - Date.parse(t.dueAt)) / H
      const lvl = suggestedLevel(s.hierarchy.escalation, t.module, late)
      const e = emp(t.assignedTo)
      return { id: t.id, severity: (lvl > t.escalationLevel ? 'High' : 'Medium') as Severity, text: `${t.id} ${t.title} · ${e?.name ?? t.assignedTo} · ${Math.round(late)}h overdue · now L${t.escalationLevel}${lvl > t.escalationLevel ? ` → suggest escalation to L${lvl}` : ''}`, link: '/tasks/overdue' }
    })
  const open = s.wf.tasks.filter((t) => OPEN_TASK.has(t.status)).length
  return { key: 'task', no: 9, title: 'Task Intelligence', example: 'Overdue tasks and escalation suggestions', inputs: s.wf.tasks.length, findings, summary: `${open} open tasks · ${findings.length} overdue · ${findings.filter((f) => f.severity === 'High').length} need escalation.` }
}
export function tasksByDept(s: OpsSources) {
  const rows = new Map<string, { dept: string; designation: string; open: number; overdue: number }>()
  const now = Date.now()
  s.wf.tasks.filter((t) => OPEN_TASK.has(t.status)).forEach((t) => {
    const e = s.hierarchy.employees.find((x) => x.id === t.assignedTo)
    const k = `${e?.department ?? 'Unmapped'}|${e?.designation ?? '—'}`
    const r = rows.get(k) ?? { dept: e?.department ?? 'Unmapped', designation: e?.designation ?? '—', open: 0, overdue: 0 }
    r.open += 1
    if (isOverdueTask(t, now)) r.overdue += 1
    rows.set(k, r)
  })
  return [...rows.values()].sort((a, b) => b.overdue - a.overdue || b.open - a.open)
}

export function businessForecast(s: OpsSources): Analysis {
  const months = [...new Set(s.txn.map((t) => t.date.slice(0, 7)).filter(Boolean))].sort()
  const cur = months.at(-1) ?? ''
  const prev = months.at(-2) ?? ''
  const sumOf = (m: string) => s.txn.filter((t) => t.date.startsWith(m)).reduce((a, t) => ({ n: a.n + t.count, amt: a.amt + t.amount }), { n: 0, amt: 0 })
  const c = sumOf(cur)
  const p = sumOf(prev)
  const daysIn = new Set(s.txn.filter((t) => t.date.startsWith(cur)).map((t) => t.date)).size
  const proj = daysIn ? (c.n / daysIn) * 30 : c.n
  const projAmt = daysIn ? (c.amt / daysIn) * 30 : c.amt
  const approved = s.forecasts.filter((f) => f.status === 'Approved').length
  const findings: Finding[] = [
    { id: 'bf-1', severity: 'Info', text: `Expected ${cur || 'current month'} transactions ≈ ${Math.round(proj).toLocaleString('en-IN')} (${inr(projAmt)}) from ${daysIn} day(s) of data${p.n ? ` — ${pct(proj, p.n) > 0 ? '+' : ''}${pct(proj, p.n)}% vs ${prev} (${p.n.toLocaleString('en-IN')})` : ''}.`, link: '/operations/txn-data' },
    { id: 'bf-2', severity: 'Info', text: `${s.forecasts.length} BM / FFM cash forecasts on file, ${approved} approved — basis for indent and ALF planning.`, link: '/operations/bm-cash-forecast' },
  ]
  return { key: 'biz', no: 12, title: 'Business Forecasting', example: 'Expected transaction and business performance', inputs: s.txn.length + s.forecasts.length, findings, summary: `Month-end projection ${Math.round(proj).toLocaleString('en-IN')} txns · ${inr(projAmt)}.` }
}

const sevRank = (s: Severity) => ({ High: 0, Medium: 1, Low: 2, Info: 3 })[s]
