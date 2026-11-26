// Small formatting + franchise-context helpers shared by the EOD / WLA / TDS / Transaction Data screens.
import { createStore } from '@/lib/store'
import { siteStore, type Site } from '@/data/network'
import { eodFundingOf, eodStore } from '@/data/eodStore'

export const inr = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`)
export const signedInr = (n: number) => (n === 0 ? '₹0' : `${n > 0 ? '+' : '−'}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`)
export const dmy = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—')
export const dt = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
export const todayIso = () => new Date().toISOString().slice(0, 10)
export const contains = (q: string, ...xs: (string | number | undefined)[]) => !q.trim() || xs.some((x) => String(x ?? '').toLowerCase().includes(q.trim().toLowerCase()))

/** Franchises that own at least one CBR / Cash Loading site (demo picker on the mobile screens). */
export function franchiseIdsWithSites(sites: Site[]) {
  return [...new Set(sites.filter((s) => eodFundingOf(s)).map((s) => s.frId))]
}
function defaultFranchise() {
  const sites = siteStore.get().sites
  const byFr = new Map<string, Site[]>()
  sites.forEach((s) => byFr.set(s.frId, [...(byFr.get(s.frId) ?? []), s]))
  const withEod = eodStore.get().records.map((r) => r.frId)
  const pick = withEod.find((id) => (byFr.get(id) ?? []).some((s) => s.machineType !== 'CRM' && eodFundingOf(s))) ?? withEod[0]
  if (pick) return pick
  const best = [...byFr.entries()].find(([, ss]) => ss.some((s) => s.machineType === 'CRM' && eodFundingOf(s)) && ss.some((s) => s.machineType !== 'CRM' && eodFundingOf(s)))
  return best?.[0] ?? sites[0]?.frId ?? ''
}
/**
 * The franchise the mobile app is signed in as. The mobile shell's demo user has no Franchise-Master ID, so the
 * franchise-side screens keep their own demo selection (also lets testers prove "only the mapped franchise sees it").
 */
export const mobileFrStore = createStore<string>('dexter.ops.mobileFr.v1', defaultFranchise)
export const useMobileFr = () => mobileFrStore.use()
