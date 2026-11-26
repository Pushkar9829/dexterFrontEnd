import { useMemo } from 'react'
import { Banknote, Building2, Coins, FolderTree, Receipt, Wallet } from 'lucide-react'
import { HubTile } from '@/components/ui/HubTile'
import { PayoutPage } from '../PayoutShell'
import { bmPnl, inrP, monthLabel, sumP, useBusiness } from '@/data/payout'
import { Note } from './ui'

export default function BusinessHub() {
  const b = useBusiness()
  const stats = useMemo(() => {
    const months = [...new Set(b.bmPayouts.map((p) => p.month))].sort()
    const latest = months[months.length - 1] ?? ''
    const pnl = b.bmSites.map((s) => bmPnl(b, s.atmId, latest))
    return {
      latest,
      sites: b.bmSites.length,
      pending: b.bmSites.filter((s) => s.approval === 'Pending').length,
      net: sumP(pnl.map((p) => p.net)),
      loss: pnl.filter((p) => p.status === 'Loss Making').length,
      incomplete: pnl.filter((p) => p.status === 'Incomplete').length,
      draftForecast: b.forecasts.filter((f) => f.status === 'Draft').length,
    }
  }, [b])

  return (
    <PayoutPage title="Business Model Management" sub="Vertical 02 — BM site mapping, business payout capture, site expenses, cash forecast and site-wise P&L (§6, §7, §12)." crumbs={['Business Model']}>
      <Note tone="blue">
        Business Model sites are a separate vertical: only eligible Master Franchisees / Super Master Franchisees can hold them, they use their own category master, and BM profit never enters Franchisee payout or Team Leader sharing (§2.3).
      </Note>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <HubTile title="1 · Business Model P&L Overview" sub="Site-wise P&L register, accrual vs actual, MF and Super MF consolidation." to="/finance/payouts/business/pnl" Icon={Wallet} theme="rose" tag="P&L" badge={stats.latest ? `${monthLabel(stats.latest)} · ${inrP(stats.net, 0)}` : undefined} actionText="Open P&L" />
        <HubTile title="2 · Site Wise Payout" sub="Capture monthly business payout per BM site, rent and other source deductions." to="/finance/payouts/business/payouts" Icon={Banknote} theme="emerald" tag="Payout" badge={`${b.bmPayouts.length} entries`} actionText="Capture payouts" />
        <HubTile title="3 · Cash Forecast" sub="Daily BM site cash forecast, FFM and ALF (additional loading funds)." to="/operations/bm-cash-forecast" Icon={Coins} theme="amber" tag="Operations" badge={`${stats.draftForecast} draft`} actionText="Open forecast" />
        <HubTile title="4 · Site Expenses" sub="Rent, electricity, housekeeping, staff, partner share and other expenses with bills." to="/operations/site-expenses" Icon={Receipt} theme="blue" tag="Operations" badge={`${stats.incomplete} incomplete`} actionText="Enter expenses" />
        <HubTile title="BM Site Master" sub="Map BM sites to eligible MF / Super MF with maker-checker approval and history." to="/finance/payouts/business/sites" Icon={Building2} theme="indigo" tag="Master" badge={`${stats.sites} sites · ${stats.pending} pending`} actionText="Manage sites" />
        <HubTile title="BM Category Master" sub="BM site categories, expense heads and partner share rules (separate from Franchise)." to="/finance/payouts/business/categories" Icon={FolderTree} theme="teal" tag="Master" badge={`${b.bmCategories.length} categories`} actionText="Manage categories" />
      </div>
    </PayoutPage>
  )
}
