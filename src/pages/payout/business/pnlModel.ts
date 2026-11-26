import { bmPnl, sumP, type BmExpense, type BmPayout, type BmSite, type BusinessState, type Paise } from '@/data/payout'
import { UNPAID_APPROVED, effectiveStatus, rollupStatus } from './bmStore'

export type PnlRow = {
  site: BmSite
  categoryName: string
  pay?: BmPayout
  expenses: BmExpense[]
  pnl: ReturnType<typeof bmPnl>
  expenseStatus: string
  recon: string
  cashIn: Paise
  cashOut: Paise
  outstanding: Paise
}

export function reconOf(pay: BmPayout | undefined, missing: string[], site: BmSite) {
  if (site.approval !== 'Approved') return 'Mapping Pending Approval'
  if (!pay) return 'Reconciliation Pending'
  if (missing.length) return 'Incomplete'
  return 'Reconciled'
}

export function buildRow(b: BusinessState, site: BmSite, month: string, catName: Map<string, string>, on: string): PnlRow {
  const pnl = bmPnl(b, site.atmId, month)
  const pay = b.bmPayouts.find((p) => p.atmId === site.atmId && p.month === month)
  const expenses = b.expenses.filter((e) => e.atmId === site.atmId && e.month === month)
  const live = expenses.filter((e) => e.status !== 'Rejected')
  const rentAtSource = !!pay && pay.rentDeductedAtSource > 0
  const counted = live.filter((e) => !(rentAtSource && e.head === 'Rent'))
  return {
    site, categoryName: catName.get(site.category) ?? site.category, pay, expenses, pnl,
    expenseStatus: rollupStatus(expenses),
    recon: reconOf(pay, pnl.missing, site),
    cashIn: pay && pay.date <= on ? pay.received : 0,
    cashOut: sumP(counted.map((e) => e.paid)),
    outstanding: sumP(counted.filter((e) => UNPAID_APPROVED.includes(effectiveStatus(e, on))).map((e) => e.amount - e.paid)),
  }
}
