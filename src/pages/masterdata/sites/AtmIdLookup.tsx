import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleCheck, CircleAlert, ExternalLink } from 'lucide-react'
import { useFranchises } from '@/data/franchises'
import { completionOf, siteByAtm, useSites, type Site } from '@/data/network'
import { TextField } from '@/components/ui/Form'

/**
 * ATM ID input that auto-fetches the site from Master Data (§9.3 design rule):
 * other modules pick an ATM ID and get Site ID, franchise and basic info without re-typing it.
 * `onResolve` fires with the site when the ATM ID matches, and with null when it stops matching.
 */
export function AtmIdLookup({
  onResolve,
  defaultAtmId = '',
  label = 'ATM ID',
  required,
  error,
  className,
  showProfileLink = true,
}: {
  onResolve: (site: Site | null) => void
  defaultAtmId?: string
  label?: string
  required?: boolean
  error?: string
  className?: string
  showProfileLink?: boolean
}) {
  const [atm, setAtm] = useState(defaultAtmId)
  const { sites } = useSites() // re-resolve when the site store changes
  const franchises = useFranchises()

  const site = useMemo(() => (atm.trim() !== '' && sites.length > 0 ? (siteByAtm(atm) ?? null) : null), [atm, sites])
  const fr = useMemo(() => (site ? franchises.find((f) => f.id === site.frId) : undefined), [site, franchises])

  const cb = useRef(onResolve)
  useEffect(() => {
    cb.current = onResolve
  })
  const lastKey = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    const key = site ? `${site.siteId}|${site.updatedAt}` : null
    if (key === lastKey.current) return
    lastKey.current = key
    cb.current(site)
  }, [site])

  const notFound = atm.trim().length >= 4 && !site

  return (
    <div className={className}>
      <TextField
        label={label}
        required={required}
        name="atmIdLookup"
        value={atm}
        error={error ?? (notFound ? 'No site found in Master Data for this ATM ID.' : undefined)}
        onChange={(e) => setAtm(e.target.value.toUpperCase())}
        placeholder="Enter ATM ID to auto-fetch site details"
        autoComplete="off"
      />
      {site && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2.5 text-[12px]">
          <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-emerald-700">
            <CircleCheck size={14} /> Site found in Master Data
            {showProfileLink && (
              <Link to={`/master-data/sites/${encodeURIComponent(site.siteId)}`} className="ml-auto inline-flex items-center gap-1 font-medium text-[#0066FF] hover:underline">
                Profile <ExternalLink size={11} />
              </Link>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            <Item k="Site ID" v={site.siteId} />
            <Item k="Franchise" v={fr ? `${fr.name} (${fr.id})` : site.frId} />
            <Item k="Project ID" v={site.projectId} />
            <Item k="Site Type" v={site.siteType} />
            <Item k="Machine" v={site.machineType} />
            <Item k="Location" v={`${site.district}, ${site.state}`} />
            <Item k="Completion" v={`${completionOf(site).pct}%`} />
          </dl>
        </div>
      )}
      {!site && !notFound && atm.trim() && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
          <CircleAlert size={12} /> Keep typing the full ATM ID…
        </p>
      )}
    </div>
  )
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] text-slate-500">{k}</dt>
      <dd className="truncate font-medium text-slate-900">{v || 'Pending'}</dd>
    </div>
  )
}
export default AtmIdLookup
