import { useMemo } from 'react'
import { Building2 } from 'lucide-react'
import { useSites } from '@/data/network'
import { frNameOf } from '@/data/eodStore'
import { franchiseIdsWithSites, mobileFrStore, useMobileFr } from './fmt'

/** Franchise context strip for the franchise-side mobile screens (demo switch between mapped franchises). */
export function MobileFrBar() {
  const frId = useMobileFr()
  const { sites } = useSites()
  const ids = useMemo(() => franchiseIdsWithSites(sites).slice(0, 40), [sites])
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs">
      <Building2 size={15} className="shrink-0 text-[#1453CA]" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Signed-in franchise (demo)</div>
        <select value={frId} onChange={(e) => mobileFrStore.set(e.target.value)} className="w-full truncate bg-transparent text-xs font-bold text-slate-800 outline-none">
          {!ids.includes(frId) && frId && <option value={frId}>{frNameOf(frId)} · {frId}</option>}
          {ids.map((id) => (
            <option key={id} value={id}>
              {frNameOf(id)} · {id}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
