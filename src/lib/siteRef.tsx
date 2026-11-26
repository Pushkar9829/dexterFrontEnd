// One common Site Master (Franchise spec §2 / §8.7): every module refers to a site by its Site Master
// Site ID (SITE-MH-0001) and ATM ID (DXMH70007). Use these helpers instead of inventing module-specific IDs.
import { Link } from 'react-router-dom'
import { siteStore, type Site } from '@/data/network'
import { franchiseStore } from '@/data/franchises'
import { masterAccess, useRole } from './rbac'

// API mode: siteStore is hydrated from GET /sites (Master Data roles) or GET /my/sites (Franchisee) after sign-in
// (see AppShell → loadSites / loadMySites), so resolveSite / SiteRef work from backend data.
export const allSites = (): Site[] => siteStore.get().sites

/** Deterministic site for seed data: same index → same site on every load. */
export function siteAt(i: number, filter?: (s: Site) => boolean): Site {
  const pool = filter ? allSites().filter(filter) : allSites()
  const list = pool.length ? pool : allSites()
  return list[((i % list.length) + list.length) % list.length]
}

/** Find a site by Site ID or ATM ID (case-insensitive). */
export function resolveSite(id?: string): Site | undefined {
  if (!id) return undefined
  const k = id.trim().toLowerCase()
  return allSites().find((s) => s.siteId.toLowerCase() === k || s.atmId.toLowerCase() === k)
}

export const franchiseNameOf = (s?: Site) => (s ? franchiseStore.get().find((f) => f.id === s.frId)?.name ?? s.frId : '')

/** Fields every module record should carry for a site. */
export function siteFields(s: Site) {
  return { siteId: s.siteId, atmId: s.atmId, frId: s.frId, franchise: franchiseNameOf(s), state: s.state, city: s.district, location: s.location }
}

/** Shows "ATM ID · Site ID", linking to the Site Profile for roles that may open Master Data. */
export function SiteRef({ id, className }: { id?: string; className?: string }) {
  const role = useRole()
  const s = resolveSite(id)
  if (!s) return <span className={className} title="Not found in Site Master">{id ?? '—'} <span className="text-[10.5px] text-red-600">(not in Site Master)</span></span>
  const text = (
    <>
      <b>{s.atmId}</b> <span className="text-muted">· {s.siteId}</span>
    </>
  )
  return masterAccess(role) === 'none' ? (
    <span className={className}>{text}</span>
  ) : (
    <Link to={`/master-data/sites/${s.siteId}`} className={className ?? 'hover:underline'}>
      {text}
    </Link>
  )
}
