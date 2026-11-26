import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, Banknote, Eye, Landmark, Scale, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { downloadCsv } from '@/lib/export'
import {
  EXPENSE_HEADS, FY_OPTIONS, fromPaise, inrP, monthLabel, sumP, useBusiness, useFinanceRules,
  type ExpenseHead, type Paise,
} from '@/data/payout'
import { PayoutPage } from '../PayoutShell'
import { fyOf, today } from './bmStore'
import { buildRow, type PnlRow } from './pnlModel'
import { DataTable, ExpBadge, FilterSelect, FixedTabs, Kpi, Money, Note, PnlBadge, TableBar, type Col } from './ui'
import { SiteActionsModal } from './SiteActionsModal'

type View = 'register' | 'accrual' | 'mf' | 'smf'
const RECON_TONE: Record<string, 'green' | 'amber' | 'gray'> = { Reconciled: 'green', 'Reconciliation Pending': 'amber', Incomplete: 'gray', 'Mapping Pending Approval': 'amber' }

export default function BmPnl() {
  const b = useBusiness()
  const rules = useFinanceRules()
  const months = useMemo(() => [...new Set([...b.bmPayouts.map((p) => p.month), ...b.expenses.map((e) => e.month)])].sort().reverse(), [b.bmPayouts, b.expenses])
  const [month, setMonth] = useState(months[0] ?? '')
  const [view, setView] = useState<View>('register')
  const [q, setQ] = useState('')
  const [smf, setSmf] = useState('all')
  const [mf, setMf] = useState('all')
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState('all')
  const [openCode, setOpen] = useState<string | null>(null)
  const close = useCallback(() => setOpen(null), [])
  const fy = month ? fyOf(month) : ''

  const catName = useMemo(() => new Map(b.bmCategories.map((c) => [c.code, c.name])), [b.bmCategories])
  const allRows = useMemo(() => {
    const on = today()
    return b.bmSites.filter((s) => s.approval !== 'Rejected').map((s) => buildRow(b, s, month, catName, on))
  }, [b, month, catName])

  const openRow = useMemo(() => (openCode ? allRows.find((r) => r.site.code === openCode) : undefined), [allRows, openCode])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return allRows.filter(
      (r) =>
        (smf === 'all' || r.site.superMf === smf) &&
        (mf === 'all' || r.site.mf === mf) &&
        (cat === 'all' || r.site.category === cat) &&
        (status === 'all' || r.pnl.status === status) &&
        (!s || `${r.site.atmId} ${r.site.siteId} ${r.site.mf} ${r.site.superMf} ${r.site.code}`.toLowerCase().includes(s)),
    )
  }, [allRows, q, smf, mf, cat, status])

  const totals = useMemo(() => {
    const heads = Object.fromEntries(EXPENSE_HEADS.map((h) => [h, sumP(rows.map((r) => r.pnl.heads[h]))])) as Record<ExpenseHead, Paise>
    const received = sumP(rows.map((r) => r.pnl.received))
    const total = sumP(rows.map((r) => r.pnl.total))
    const count = (st: string) => rows.filter((r) => r.pnl.status === st).length
    return {
      heads, received, total, net: received - total,
      cashIn: sumP(rows.map((r) => r.cashIn)), cashOut: sumP(rows.map((r) => r.cashOut)), outstanding: sumP(rows.map((r) => r.outstanding)),
      profitable: count('Profitable'), loss: count('Loss Making'), even: count('Break-even'), incomplete: count('Incomplete'), pending: count('Reconciliation Pending'),
    }
  }, [rows])

  const smfs = useMemo(() => [...new Set(b.bmSites.map((s) => s.superMf))].sort(), [b.bmSites])
  const mfs = useMemo(() => [...new Set(b.bmSites.map((s) => s.mf))].sort(), [b.bmSites])

  const registerCols: Col<PnlRow>[] = [
    { key: 'fy', header: '01 FY', render: () => fy, footer: 'Total' },
    { key: 'm', header: '02 Month', render: () => monthLabel(month) },
    { key: 'smf', header: '03 Super MF', render: (r) => r.site.superMf },
    { key: 'mf', header: '04 Master Franchise', render: (r) => r.site.mf },
    { key: 'cat', header: '05 BM Category', render: (r) => r.categoryName },
    { key: 'atm', header: '06 ATM ID', render: (r) => <b className="text-slate-900">{r.site.atmId}</b> },
    { key: 'site', header: '07 Site ID', render: (r) => r.site.siteId },
    {
      key: 'pay', header: '08 Business Payout', className: 'text-right',
      render: (r) => (r.pay ? <div className="flex flex-col items-end gap-1"><Money p={r.pnl.received} />{r.pay.rentDeductedAtSource > 0 && <Badge tone="amber">Rent at source</Badge>}</div> : <span className="text-slate-400">Not received</span>),
      footer: <Money p={totals.received} />,
    },
    ...EXPENSE_HEADS.map((h, i): Col<PnlRow> => ({
      key: h, header: `${String(9 + i).padStart(2, '0')} ${h === 'Electricity Bill' ? 'Electricity' : h === 'Staff Expenses' ? 'Staff' : h}`, className: 'text-right',
      render: (r) => (r.pnl.missing.includes(h) ? <span className="text-[11px] font-semibold text-slate-400">Missing</span> : <Money p={r.pnl.heads[h]} />),
      footer: <Money p={totals.heads[h]} />,
    })),
    { key: 'tot', header: '15 Total Expenses', className: 'text-right', render: (r) => <Money p={r.pnl.total} />, footer: <Money p={totals.total} /> },
    { key: 'net', header: '16 Net Profit / Loss', className: 'text-right', render: (r) => <div className="flex flex-col items-end gap-1"><Money p={r.pnl.net} className="font-semibold" /><PnlBadge status={r.pnl.status} /></div>, footer: <Money p={totals.net} /> },
    { key: 'mar', header: '17 Margin', className: 'text-right', render: (r) => (r.pnl.received ? `${r.pnl.margin}%` : '—'), footer: totals.received ? `${Math.round((totals.net / totals.received) * 1000) / 10}%` : '—' },
    { key: 'eps', header: '18 Expense Payment', render: (r) => <ExpBadge status={r.expenseStatus} /> },
    { key: 'rec', header: '19 Reconciliation', render: (r) => <Badge tone={RECON_TONE[r.recon] ?? 'gray'}>{r.recon}</Badge> },
    { key: 'act', header: '20 Action', render: (r) => <button type="button" onClick={() => setOpen(r.site.code)} className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-[11px] font-semibold text-[#0066FF] hover:bg-blue-50"><Eye size={13} /> View</button> },
  ]

  const exportRegister = () =>
    downloadCsv(
      `bm_pnl_register_${month}`,
      ['Financial Year', 'Month', 'Super MF', 'Master Franchise', 'BM Site Category', 'ATM ID', 'Site ID', 'Business Payout', 'Rent', 'Electricity', 'Housekeeping', 'Staff', 'Partner Share', 'Other Expenses', 'Total Expenses', 'Net Profit / Loss', 'Profit Margin %', 'Expense Payment Status', 'Reconciliation Status', 'P&L Status'],
      rows.map((r) => [fy, month, r.site.superMf, r.site.mf, r.categoryName, r.site.atmId, r.site.siteId, String(fromPaise(r.pnl.received)), ...EXPENSE_HEADS.map((h) => (r.pnl.missing.includes(h) ? 'Missing' : String(fromPaise(r.pnl.heads[h])))), String(fromPaise(r.pnl.total)), String(fromPaise(r.pnl.net)), String(r.pnl.margin), r.expenseStatus, r.recon, r.pnl.status]),
    )

  return (
    <PayoutPage title="Business Model P&L Overview" sub="Site-wise P&L register (§12.1), accrual vs actual (§12.3) and MF / Super MF consolidation (§7). BM profit is never used in Franchisee or Team Leader calculations." crumbs={['Business Model', 'P&L Overview']}>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <FilterSelect label="Financial Year" value={fy || 'all'} onChange={(v) => { const m = months.find((x) => fyOf(x) === v); if (m) setMonth(m) }} options={FY_OPTIONS} all="—" />
        <label className="block min-w-[140px]">
          <span className="mb-1 block text-[11px] font-semibold text-slate-700">Month *</span>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-[#0066FF]">
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </label>
        <FilterSelect label="Super MF" value={smf} onChange={setSmf} options={smfs} />
        <FilterSelect label="Master Franchise" value={mf} onChange={setMf} options={mfs} />
        <FilterSelect label="BM Category" value={cat} onChange={setCat} options={b.bmCategories.map((c) => ({ value: c.code, label: c.name }))} />
        <FilterSelect label="P&L Status" value={status} onChange={setStatus} options={['Profitable', 'Loss Making', 'Break-even', 'Incomplete', 'Reconciliation Pending']} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Business payout received" value={inrP(totals.received, 0)} icon={Banknote} caption={`${rows.filter((r) => r.pay).length} of ${rows.length} sites received`} />
        <Kpi label="Total expenses (accrued)" value={inrP(totals.total, 0)} icon={Wallet} tone="amber" caption="Rent at source not deducted again" />
        <Kpi label="Net BM profit / loss" value={inrP(totals.net, 0)} icon={totals.net >= 0 ? TrendingUp : TrendingDown} tone={totals.net >= 0 ? 'green' : 'red'} caption={totals.received ? `Margin ${Math.round((totals.net / totals.received) * 1000) / 10}%` : undefined} />
        <Kpi label="Outstanding liabilities" value={inrP(totals.outstanding, 0)} icon={AlertTriangle} tone="red" caption="Unpaid approved / due / overdue" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone="green">Profitable {totals.profitable}</Badge>
        <Badge tone="red">Loss Making {totals.loss}</Badge>
        <Badge tone="amber">Break-even {totals.even}</Badge>
        <Badge tone="gray">Incomplete {totals.incomplete}</Badge>
        <Badge tone="amber">Reconciliation Pending {totals.pending}</Badge>
      </div>

      <FixedTabs<View>
        value={view}
        onChange={setView}
        tabs={[
          { key: 'register', label: 'Site-wise P&L Register' },
          { key: 'accrual', label: 'Accrual vs Actual' },
          { key: 'mf', label: 'MF-wise Consolidation' },
          { key: 'smf', label: 'Super MF Consolidation' },
        ]}
        width={210}
      />

      {view === 'register' && (
        <DataTable
          rows={rows}
          cols={registerCols}
          rowKey={(r) => r.site.code}
          noun="BM sites"
          minWidth={2100}
          showFooter
          toolbar={<TableBar search={q} onSearch={setQ} placeholder="ATM, site, MF, code…" onDownload={exportRegister} right={<span className="text-[11px] text-slate-500">Missing mandatory expense ⇒ Incomplete (never Profitable)</span>} />}
        />
      )}
      {view === 'accrual' && <AccrualView rows={rows} totals={totals} month={month} />}
      {view === 'mf' && <Consolidation rows={rows} level="mf" shareRule={rules.mfShareRule} totalNet={totals.net} month={month} />}
      {view === 'smf' && <Consolidation rows={rows} level="smf" shareRule={rules.superMfBmShare} totalNet={totals.net} month={month} />}

      {openRow && <SiteActionsModal row={openRow} month={month} onClose={close} />}
    </PayoutPage>
  )
}

function AccrualView({ rows, totals, month }: { rows: PnlRow[]; totals: { received: Paise; total: Paise; net: Paise; cashIn: Paise; cashOut: Paise; outstanding: Paise }; month: string }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((r) => !s || `${r.site.atmId} ${r.site.mf}`.toLowerCase().includes(s))
  }, [rows, q])
  const cols: Col<PnlRow>[] = [
    { key: 'atm', header: 'ATM / Site', render: (r) => <div><b>{r.site.atmId}</b><div className="text-[11px] text-slate-500">{r.site.mf}</div></div>, footer: 'Total' },
    { key: 'rec', header: 'Payout (accrual)', className: 'text-right', render: (r) => <Money p={r.pnl.received} />, footer: <Money p={totals.received} /> },
    { key: 'acc', header: 'Accrued Expenses', className: 'text-right', render: (r) => <Money p={r.pnl.total} />, footer: <Money p={totals.total} /> },
    { key: 'op', header: 'Operating P&L', className: 'text-right', render: (r) => <Money p={r.pnl.net} className="font-semibold" />, footer: <Money p={totals.net} /> },
    { key: 'in', header: 'Actual Receipts', className: 'text-right', render: (r) => <Money p={r.cashIn} />, footer: <Money p={totals.cashIn} /> },
    { key: 'out', header: 'Actual Payments', className: 'text-right', render: (r) => <Money p={r.cashOut} />, footer: <Money p={totals.cashOut} /> },
    { key: 'cash', header: 'Cash Position', className: 'text-right', render: (r) => <Money p={r.cashIn - r.cashOut} className="font-semibold" />, footer: <Money p={totals.cashIn - totals.cashOut} /> },
    { key: 'os', header: 'Outstanding Liabilities', className: 'text-right', render: (r) => <Money p={r.outstanding} className={r.outstanding ? 'text-red-600' : ''} />, footer: <Money p={totals.outstanding} /> },
    { key: 'st', header: 'Expense Status', render: (r) => <ExpBadge status={r.expenseStatus} /> },
  ]
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="Operating P&L (accrual)" value={inrP(totals.net, 0)} icon={Scale} tone={totals.net >= 0 ? 'green' : 'red'} caption="Payout − applicable accrued expenses" />
        <Kpi label="Cash position (actual)" value={inrP(totals.cashIn - totals.cashOut, 0)} icon={Landmark} caption={`Receipts ${inrP(totals.cashIn, 0)} − payments ${inrP(totals.cashOut, 0)}`} />
        <Kpi label="Outstanding liabilities" value={inrP(totals.outstanding, 0)} icon={AlertTriangle} tone="red" caption="Unpaid approved expenses" />
      </div>
      <Note>Accounting profitability and available cash are shown separately (§12.3). Rejected expenses are excluded; rent deducted at source is excluded from both expenses and payments. Month: {monthLabel(month)}.</Note>
      <DataTable
        rows={list}
        cols={cols}
        rowKey={(r) => r.site.code}
        showFooter
        minWidth={1200}
        noun="sites"
        toolbar={
          <TableBar
            search={q}
            onSearch={setQ}
            onDownload={() =>
              downloadCsv(`bm_accrual_vs_actual_${month}`, ['ATM ID', 'MF', 'Payout', 'Accrued Expenses', 'Operating P&L', 'Actual Receipts', 'Actual Payments', 'Cash Position', 'Outstanding'], list.map((r) => [r.site.atmId, r.site.mf, ...[r.pnl.received, r.pnl.total, r.pnl.net, r.cashIn, r.cashOut, r.cashIn - r.cashOut, r.outstanding].map((p) => String(fromPaise(p)))]))
            }
          />
        }
      />
    </div>
  )
}

type Group = { key: string; parent: string; sites: number; mfs: number; received: Paise; total: Paise; net: Paise; heads: Record<ExpenseHead, Paise>; loss: number; incomplete: number }

function Consolidation({ rows, level, shareRule, totalNet, month }: { rows: PnlRow[]; level: 'mf' | 'smf'; shareRule: string | null; totalNet: Paise; month: string }) {
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const map = new Map<string, PnlRow[]>()
    // each BM site belongs to exactly one group (its own current mapping) → no double counting
    rows.forEach((r) => {
      const k = level === 'mf' ? r.site.mf : r.site.superMf === '—' ? '— (No Super MF / direct MF)' : r.site.superMf
      map.set(k, [...(map.get(k) ?? []), r])
    })
    return [...map.entries()].map(([key, rs]): Group => {
      const received = sumP(rs.map((r) => r.pnl.received))
      const total = sumP(rs.map((r) => r.pnl.total))
      return {
        key, parent: level === 'mf' ? (rs[0]?.site.superMf ?? '—') : '', sites: rs.length, mfs: new Set(rs.map((r) => r.site.mf)).size,
        received, total, net: received - total,
        heads: Object.fromEntries(EXPENSE_HEADS.map((h) => [h, sumP(rs.map((r) => r.pnl.heads[h]))])) as Record<ExpenseHead, Paise>,
        loss: rs.filter((r) => r.pnl.status === 'Loss Making').length, incomplete: rs.filter((r) => r.pnl.status === 'Incomplete' || r.pnl.status === 'Reconciliation Pending').length,
      }
    }).sort((a, b) => b.net - a.net)
  }, [rows, level])
  const list = useMemo(() => groups.filter((g) => !q.trim() || g.key.toLowerCase().includes(q.trim().toLowerCase())), [groups, q])
  const sumNet = useMemo(() => sumP(groups.map((g) => g.net)), [groups])
  const sumSites = useMemo(() => groups.reduce((a, g) => a + g.sites, 0), [groups])

  const cols: Col<Group>[] = [
    { key: 'k', header: level === 'mf' ? 'Master Franchise' : 'Super Master Franchise', render: (g) => <b className="text-slate-900">{g.key}</b>, footer: 'Total' },
    ...(level === 'mf' ? [{ key: 'p', header: 'Super MF', render: (g: Group) => g.parent }] : [{ key: 'mfs', header: 'MFs', className: 'text-right', render: (g: Group) => g.mfs }]),
    { key: 's', header: 'BM Sites', className: 'text-right', render: (g) => g.sites, footer: sumSites },
    { key: 'r', header: 'Total BM Payout', className: 'text-right', render: (g) => <Money p={g.received} />, footer: <Money p={sumP(groups.map((g) => g.received))} /> },
    ...EXPENSE_HEADS.map((h): Col<Group> => ({ key: h, header: h, className: 'text-right', render: (g) => <Money p={g.heads[h]} /> })),
    { key: 't', header: 'Total Expenses', className: 'text-right', render: (g) => <Money p={g.total} />, footer: <Money p={sumP(groups.map((g) => g.total))} /> },
    { key: 'n', header: 'BM Operating Net', className: 'text-right', render: (g) => <Money p={g.net} className="font-semibold" />, footer: <Money p={sumNet} /> },
    { key: 'f', header: 'Loss / Incomplete', render: (g) => <span className="text-[11px]">{g.loss} loss · {g.incomplete} incomplete</span> },
    { key: 'share', header: `Contractual ${level === 'mf' ? 'MF' : 'Super MF'} Share`, render: () => (shareRule ? <span className="text-[11px]">{shareRule} <span className="text-slate-400">(calculated separately)</span></span> : <Badge tone="amber">Pending Finance rule</Badge>) },
  ]
  const ok = sumNet === totalNet && sumSites === rows.length
  return (
    <div className="space-y-3">
      <Note tone={ok ? 'blue' : 'red'}>
        {ok
          ? `No double counting: ${sumSites} sites counted once each; ${level === 'mf' ? 'MF' : 'Super MF'} totals (${inrP(sumNet, 0)}) equal the site-wise total.`
          : `Consolidation mismatch — group total ${inrP(sumNet, 0)} vs site total ${inrP(totalNet, 0)}.`}{' '}
        BM operating profit is shown separately from any contractual {level === 'mf' ? 'MF' : 'Super MF'} share; the system never assumes the whole MF profit belongs to the Super MF (§7.2).
        {!shareRule && ` Share rule §21-${level === 'mf' ? '04' : '06'} is pending Finance approval.`}
      </Note>
      <DataTable
        rows={list}
        cols={cols}
        rowKey={(g) => g.key}
        showFooter
        minWidth={1700}
        noun={level === 'mf' ? 'MFs' : 'Super MFs'}
        toolbar={
          <TableBar
            search={q}
            onSearch={setQ}
            onDownload={() =>
              downloadCsv(`bm_${level}_consolidation_${month}`, [level === 'mf' ? 'MF' : 'Super MF', 'Sites', 'Payout', ...EXPENSE_HEADS, 'Total Expenses', 'Net', 'Contractual Share Rule'], list.map((g) => [g.key, String(g.sites), String(fromPaise(g.received)), ...EXPENSE_HEADS.map((h) => String(fromPaise(g.heads[h]))), String(fromPaise(g.total)), String(fromPaise(g.net)), shareRule ?? 'Pending Finance rule']))
            }
          />
        }
      />
    </div>
  )
}
