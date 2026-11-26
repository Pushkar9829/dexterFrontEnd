import { useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, FileText, Paperclip, Printer, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { downloadCsv } from '@/lib/export'
import { EXPENSE_HEADS, bmPnl, fromPaise, inrP, monthLabel, sumP, useBusiness, type ExpenseHead } from '@/data/payout'
import { effectiveStatus, fmtDate, fmtDateTime, useBmLocal } from './bmStore'
import { ExpBadge, FixedTabs, InfoCell, Money, Note, PnlBadge } from './ui'
import type { PnlRow } from './pnlModel'

type Tab = 'details' | 'payout' | 'expenses' | 'bills' | 'payments' | 'calc' | 'ai' | 'trend'
const TABS: { key: Tab; label: string }[] = [
  { key: 'details', label: 'Site Details' },
  { key: 'payout', label: 'Business Payout' },
  { key: 'expenses', label: 'Expense Breakdown' },
  { key: 'bills', label: 'Uploaded Bills' },
  { key: 'payments', label: 'Payment History' },
  { key: 'calc', label: 'P&L Calculation' },
  { key: 'ai', label: 'AI Analysis' },
  { key: 'trend', label: 'Historical Trend' },
]

export function SiteActionsModal({ row, month, onClose }: { row: PnlRow; month: string; onClose: () => void }) {
  const b = useBusiness()
  const local = useBmLocal()
  const [tab, setTab] = useState<Tab>('details')
  const { site, pnl, pay, expenses } = row
  const cat = b.bmCategories.find((c) => c.code === site.category)

  const trend = useMemo(() => {
    const months = [...new Set([...b.bmPayouts.filter((p) => p.atmId === site.atmId).map((p) => p.month), ...b.expenses.filter((e) => e.atmId === site.atmId).map((e) => e.month)])].sort()
    return months.map((m) => {
      const p = bmPnl(b, site.atmId, m)
      return { month: monthLabel(m), m, received: fromPaise(p.received), expenses: fromPaise(p.total), net: fromPaise(p.net), electricity: p.heads['Electricity Bill'], status: p.status }
    })
  }, [b, site.atmId])

  const bills = useMemo(() => {
    const fromExpenses = expenses.filter((e) => e.document).map((e) => ({ name: e.document as string, src: `${e.head} · ${e.invoiceNo ?? ''}` }))
    const fromSubs = local.submissions.filter((s) => s.atmId === site.atmId && s.month === month).flatMap((s) => s.bills.map((x) => ({ name: x.name, src: `Bill upload · ${fmtDateTime(s.submittedAt)}` })))
    return [...fromExpenses, ...fromSubs]
  }, [expenses, local.submissions, site.atmId, month])

  const insights = useMemo(() => {
    const out: { tone: 'red' | 'amber' | 'green' | 'blue'; text: string }[] = []
    const live = expenses.filter((e) => e.status !== 'Rejected')
    if (pnl.status === 'Loss Making') out.push({ tone: 'red', text: `Loss making this month: net ${inrP(pnl.net)} (${pnl.margin}% margin).` })
    if (pnl.missing.length) out.push({ tone: 'amber', text: `Missing mandatory expense(s): ${pnl.missing.join(', ')} — site cannot be marked reconciled or profitable.` })
    const rents = live.filter((e) => e.head === 'Rent')
    if (rents.length > 1) out.push({ tone: 'red', text: `Possible duplicate rent: ${rents.length} rent entries in ${monthLabel(month)}.` })
    if (pay && pay.rentDeductedAtSource > 0 && rents.length) out.push({ tone: 'amber', text: 'Rent was deducted at source and a rent expense is also recorded — excluded from P&L; check for double payment.' })
    const idx = trend.findIndex((t) => t.m === month)
    if (idx > 0) {
      const prev = trend[idx - 1].electricity
      const cur = trend[idx].electricity
      if (prev > 0 && cur > prev * 1.4) out.push({ tone: 'amber', text: `Electricity bill up ${Math.round(((cur - prev) / prev) * 100)}% vs previous month (${inrP(prev, 0)} → ${inrP(cur, 0)}).` })
    }
    if (pnl.received && pnl.total > pnl.received * 0.8) out.push({ tone: 'amber', text: `Expense ratio ${Math.round((pnl.total / pnl.received) * 100)}% of payout — recommend investigation of high expenses.` })
    const ps = pnl.heads['Partner Share']
    if (ps > 0 && cat && (cat.partnerShareRule === 'None' || !cat.expenseRules.includes('Partner Share'))) out.push({ tone: 'red', text: `Partner share ${inrP(ps, 0)} recorded but category ${cat.code} has no partner share rule.` })
    const nets = trend.slice(-3).map((t) => t.net)
    if (nets.length === 3 && nets[0] > nets[1] && nets[1] > nets[2]) out.push({ tone: 'amber', text: 'Net profit has declined for three consecutive months — loss risk.' })
    if (!out.length) out.push({ tone: 'green', text: 'No anomalies detected for this site and month.' })
    return out
  }, [expenses, pnl, pay, trend, month, cat])

  const exportCsv = () =>
    downloadCsv(`bm_site_${site.atmId}_${month}`, ['Line', 'Amount (₹)'], [
      ['ATM ID', site.atmId], ['Site ID', site.siteId], ['Month', month], ['Business payout received', String(fromPaise(pnl.received))],
      ...EXPENSE_HEADS.map((h) => [h, String(fromPaise(pnl.heads[h]))]), ['Total expenses', String(fromPaise(pnl.total))], ['Net profit / loss', String(fromPaise(pnl.net))], ['Status', pnl.status],
    ])

  return (
    <Modal title={`${site.atmId} · ${site.siteId}`} sub={`${site.code} · ${monthLabel(month)} · ${site.mf}`} onClose={onClose} width={1040}
      footer={
        <>
          <Button variant="secondary" icon={<Printer size={14} />} onClick={() => window.print()}>Export PDF</Button>
          <Button variant="secondary" icon={<Download size={14} />} onClick={exportCsv}>Export Excel</Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="mb-3 flex items-center gap-2"><PnlBadge status={pnl.status} /><Badge tone="navy">Business Model</Badge></div>
      <FixedTabs<Tab> tabs={TABS} value={tab} onChange={setTab} width={140} />
      <div className="mt-4 min-h-[260px] text-[12.5px]">
        {tab === 'details' && (
          <div className="grid gap-4 sm:grid-cols-3">
            <InfoCell label="BM Site Code" value={site.code} />
            <InfoCell label="ATM ID / Site ID" value={`${site.atmId} / ${site.siteId}`} />
            <InfoCell label="City / State" value={`${site.city}, ${site.state}`} />
            <InfoCell label="Super MF" value={site.superMf} />
            <InfoCell label="Master Franchise" value={site.mf} />
            <InfoCell label="Category" value={cat ? `${cat.code} · ${cat.name}` : site.category} />
            <InfoCell label="Business Model" value={site.businessModel} />
            <InfoCell label="Effective" value={`${fmtDate(site.effectiveFrom)} – ${site.effectiveTo ? fmtDate(site.effectiveTo) : 'Open'}`} />
            <InfoCell label="Approval / Status" value={`${site.approval} / ${site.status}`} />
          </div>
        )}
        {tab === 'payout' &&
          (pay ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <InfoCell label="FY / Month" value={`${pay.fy} / ${monthLabel(pay.month)}`} />
              <InfoCell label="Gross business payout" value={inrP(pay.gross)} />
              <InfoCell label="Rent deducted at source" value={<span className="flex items-center gap-2">{inrP(pay.rentDeductedAtSource)}{pay.rentDeductedAtSource > 0 && <Badge tone="amber">Rent deducted at source</Badge>}</span>} />
              <InfoCell label="Other source deductions" value={inrP(pay.otherSourceDeductions)} />
              <InfoCell label="Actual payout received" value={inrP(pay.received)} />
              <InfoCell label="Reference / date" value={`${pay.reference} · ${fmtDate(pay.date)}`} />
              <InfoCell label="Source document" value={pay.document ?? '—'} />
            </div>
          ) : (
            <Note tone="amber">No business payout captured for {monthLabel(month)} — Reconciliation Pending.</Note>
          ))}
        {tab === 'expenses' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase"><tr>{['Head', 'Invoice', 'Vendor', 'Bill date', 'Due', 'Amount', 'Paid', 'Status'].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-slate-500">No expenses recorded.</td></tr>}
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="px-2 py-2">{e.head}</td><td className="px-2 py-2">{e.invoiceNo ?? '—'}</td><td className="px-2 py-2">{e.vendor ?? '—'}</td>
                  <td className="px-2 py-2">{fmtDate(e.billDate)}</td><td className="px-2 py-2">{fmtDate(e.dueDate)}</td>
                  <td className="px-2 py-2 text-right"><Money p={e.amount} /></td><td className="px-2 py-2 text-right"><Money p={e.paid} /></td><td className="px-2 py-2"><ExpBadge status={effectiveStatus(e)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'bills' &&
          (bills.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {bills.map((x, i) => (
                <li key={x.name + i} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"><Paperclip size={14} className="text-[#0066FF]" /><span className="truncate font-medium">{x.name}</span><span className="ml-auto truncate text-[11px] text-slate-500">{x.src}</span></li>
              ))}
            </ul>
          ) : (
            <Note>No bills uploaded for this month.</Note>
          ))}
        {tab === 'payments' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase"><tr>{['Date', 'Type', 'Head / Reference', 'Mode', 'Amount'].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {pay && <tr><td className="px-2 py-2">{fmtDate(pay.date)}</td><td className="px-2 py-2"><Badge tone="green">Receipt</Badge></td><td className="px-2 py-2">{pay.reference}</td><td className="px-2 py-2">Bank credit</td><td className="px-2 py-2 text-right"><Money p={pay.received} /></td></tr>}
              {expenses.filter((e) => e.paid > 0).map((e) => (
                <tr key={e.id}><td className="px-2 py-2">{fmtDate(e.paymentDate)}</td><td className="px-2 py-2"><Badge tone="red">Payment</Badge></td><td className="px-2 py-2">{e.head} · {e.invoiceNo ?? ''}</td><td className="px-2 py-2">{e.paymentMode ?? '—'}</td><td className="px-2 py-2 text-right"><Money p={-e.paid} /></td></tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'calc' && (
          <div className="max-w-[520px] space-y-1.5">
            <Line2 label="Business payout received" p={pnl.received} bold />
            {EXPENSE_HEADS.map((h: ExpenseHead) => (
              <Line2 key={h} label={`− ${h}${h === 'Rent' && pay && pay.rentDeductedAtSource > 0 ? ' (deducted at source — not deducted again)' : ''}${pnl.missing.includes(h) ? ' (MISSING)' : ''}`} p={-pnl.heads[h]} />
            ))}
            <Line2 label="Total expenses" p={-pnl.total} bold />
            <Line2 label="Net profit / loss" p={pnl.net} bold />
            <p className="pt-2 text-[11.5px] text-slate-500">BM Net = Payout received − Rent − Electricity − Housekeeping − Staff − Partner Share − Other (§6.5). Outstanding (all unpaid): {inrP(pnl.outstanding)} · Total paid: {inrP(sumP(expenses.map((e) => e.paid)))}</p>
          </div>
        )}
        {tab === 'ai' && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[11.5px] text-slate-500"><Sparkles size={13} className="text-amber-500" />Rule-based analysis preview (§11.2). It only flags items — it never changes any status.</p>
            {insights.map((x, i) => <Note key={i} tone={x.tone === 'green' ? 'slate' : x.tone === 'blue' ? 'blue' : x.tone}>{x.text}</Note>)}
          </div>
        )}
        {tab === 'trend' && (
          <div className="h-[280px]">
            {trend.length < 2 && <p className="mb-2 text-[11.5px] text-slate-500"><FileText size={12} className="inline" /> Only {trend.length} month of data available.</p>}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="received" name="Payout" stroke="#0066FF" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="net" name="Net" stroke="#059669" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Modal>
  )
}

function Line2({ label, p, bold }: { label: string; p: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 border-b border-slate-100 py-1 ${bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
      <span>{label}</span>
      <Money p={p} />
    </div>
  )
}
