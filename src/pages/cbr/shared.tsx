import type { ReactNode } from 'react'
import { franchiseeOf, type CbrSite } from '@/data/cbrSites'

export function SiteContext({ site, lead, right }: { site: CbrSite; lead?: { label: string; value: ReactNode }; right?: ReactNode }) {
  const items: { label: string; value: ReactNode }[] = [
    ...(lead ? [lead] : []),
    { label: 'Site/LOI Number', value: `${site.siteId} / ${site.loi}` },
    { label: 'Name of Franchisee', value: `${franchiseeOf(site).name} · ${site.franchiseId}` },
    { label: 'Site Location', value: `${site.location}, ${site.city}` },
    { label: 'Model', value: site.model },
  ]
  return (
    <div className="flex flex-wrap items-start gap-x-8 gap-y-3 rounded-xl border border-line bg-white px-5 py-4">
      {items.map((i) => (
        <div key={i.label} className="min-w-0 sm:min-w-[150px]">
          <div className="text-[11px] text-muted">{i.label}</div>
          <div className="mt-1 text-[13px] font-medium break-words text-ink">{i.value}</div>
        </div>
      ))}
      {right && <div className="ml-auto self-center">{right}</div>}
    </div>
  )
}

/** Amount cell: blank (null) → "—", otherwise Indian grouping. */
export function Amt({ v, strong, tone }: { v: number | null; strong?: boolean; tone?: string }) {
  if (v == null) return <span className="text-muted">—</span>
  return <span className={[strong ? 'font-semibold' : '', tone ?? (v === 0 ? 'text-muted' : '')].join(' ')}>{v.toLocaleString('en-IN')}</span>
}
