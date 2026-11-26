// Finance → Workflow bridge: every submit / approve / reject of a finance record fires a workflow event
// (task for the next action + FIN_SUBMIT / FIN_APPROVE / FIN_REJECT email via the active template).
import { emitWorkflow } from '@/data/workflow'
import { franchiseNameOf, resolveSite } from '@/lib/siteRef'
import { gstMappingStore } from '@/data/financeGstMapping'
import type { Site } from '@/data/network'

type FinEvent = 'Submit' | 'Approve' | 'Reject'

export function emitFinance(
  event: FinEvent,
  refId: string,
  opts: { what: string; site?: string; franchise?: string; status?: string; dueHours?: number } ,
) {
  const s = resolveSite(opts.site)
  emitWorkflow({
    module: 'Finance',
    event,
    refId,
    vars: {
      Site_ID: s?.siteId ?? (opts.site || undefined),
      ATM_ID: s?.atmId,
      Franchise_Name: opts.franchise || franchiseNameOf(s) || undefined,
      Current_Status: opts.status ?? (event === 'Submit' ? 'Submitted' : event === 'Approve' ? 'Approved' : 'Rejected'),
    },
    nextAction: event === 'Submit' ? { title: `Review ${opts.what} ${refId}`, dueHours: opts.dueHours ?? 24 } : undefined,
  })
}

/** Map a status change to a workflow event (undefined = nothing to emit). */
export function statusEvent(prev: string | undefined, next: string | undefined): FinEvent | undefined {
  if (!next || prev === next) return undefined
  if (/reject|declin/i.test(next)) return 'Reject'
  if (/approv|verified|^active$|^paid$|completed|opened/i.test(next)) return 'Approve'
  if (/pending|submit|review|process/i.test(next)) return 'Submit'
  return undefined
}

/** GST form autofill from the Site Master (+ the franchise's GST mapping when one exists). */
export function gstPatchFromSite<T extends { siteId: string; atmId: string; locationName: string; franchiseeName: string; state: string; gstNumber: string; stateCode: string; panNumber: string; contactNo: string; address: string }>(
  prev: T,
  site: Site,
): T {
  const m = gstMappingStore.get().find((g) => g.franchiseId === site.frId)
  return {
    ...prev,
    siteId: site.siteId,
    atmId: site.atmId,
    locationName: site.location,
    franchiseeName: franchiseNameOf(site) || prev.franchiseeName,
    state: m?.state ?? site.state ?? prev.state,
    gstNumber: m?.gstin ?? prev.gstNumber,
    stateCode: m?.stateCode ?? prev.stateCode,
    panNumber: m?.panNumber ?? prev.panNumber,
    contactNo: m?.contactPhone ?? prev.contactNo,
    address: m?.registeredAddress ?? site.address ?? prev.address,
  }
}
