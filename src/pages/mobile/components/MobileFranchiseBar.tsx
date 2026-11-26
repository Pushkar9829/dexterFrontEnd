import { Building2 } from 'lucide-react'
import { MobileFrBar } from '@/pages/operations/eod2/MobileFrBar'
import { useMobileUser, useMyScope } from '../data/mobileSession'

/**
 * Franchise context strip. Franchisees see their own (fixed) franchise; only Admin / Super Admin previewing the
 * app get the demo franchise switch.
 */
export function MobileFranchiseBar() {
  const user = useMobileUser()
  const { frId, franchise, sites } = useMyScope()
  if (user?.isPreview) return <MobileFrBar />
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs">
      <Building2 size={15} className="shrink-0 text-[#1453CA]" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Signed-in franchise</div>
        <div className="truncate text-xs font-bold text-slate-800">
          {franchise?.name ?? frId} · {frId} · {sites.length} site{sites.length === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  )
}
