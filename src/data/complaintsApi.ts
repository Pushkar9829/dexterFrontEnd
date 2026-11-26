// Complaints — backend mutations (/complaints). Each call updates the complaint store from the server response.
// In mock mode every function falls back to the local updateComplaint() path so the static demo keeps working.
import { api, get, patch, post, uploadFile } from '@/lib/api'
import { hierarchyStore } from './workflow'
import { toast } from '@/components/ui/Toast'
import { apiEnabled, apiCall } from './opsApi'
import {
  complaintStore, maintenanceStore, putApiComplaint, updateComplaint, OWNERS,
  type ApiComplaint, type Complaint, type Department, type Impact, type MaintenanceTask, type Outcome, type Priority,
} from './complaints'

export { apiEnabled }
const enc = encodeURIComponent

/** Owner choices: active employees from the hierarchy in API mode (assignment needs an employee id), demo names otherwise. */
export function ownerOptions(): string[] {
  if (!apiEnabled) return OWNERS
  return hierarchyStore.get().employees.filter((e) => e.status === 'Active').map((e) => e.name)
}
export const employeeIdByName = (name: string) => hierarchyStore.get().employees.find((e) => e.name === name && e.status === 'Active')?.id

export type NewComplaint = {
  atmId: string; category: string; subcategory: string; priority: Priority; title: string; details: string
  reportingAuthority?: string; component?: string; department?: Department; impact?: Impact; receivedAt?: string; files?: File[]
}
/** POST /complaints (files uploaded first). Returns the stored complaint. */
export async function createComplaintAsync(d: NewComplaint): Promise<Complaint> {
  const r = await apiCall(async () => {
    const attachments: string[] = []
    for (const f of d.files ?? []) attachments.push((await uploadFile(f, { purpose: 'complaint-evidence', entity: 'Complaint' })).fileId)
    return post<ApiComplaint>('/complaints', {
      atmOrSite: d.atmId, category: d.category, subcategory: d.subcategory, priority: d.priority, title: d.title, details: d.details,
      reportingAuthority: d.reportingAuthority, component: d.component, department: d.department, impact: d.impact,
      attachments: attachments.length ? attachments : undefined, receivedAt: d.receivedAt,
    })
  }, 'Could not register the complaint')
  return putApiComplaint(r)
}

/** Fresh copy with history (detail view). */
export async function fetchComplaint(id: string): Promise<Complaint | undefined> {
  if (!apiEnabled) return complaintStore.get().find((c) => c.id === id)
  return putApiComplaint(await get<ApiComplaint>(`/complaints/${enc(id)}`))
}

/** Reassign: POST /:id/assign with the employee id of the chosen owner. */
export async function assignComplaintAsync(c: Complaint, ownerName: string, note?: string, auditMeta?: string) {
  if (!apiEnabled) {
    updateComplaint(c.id, () => ({ owner: ownerName, lastAction: `Owner changed to ${ownerName}` }), { title: 'Owner reassigned', meta: auditMeta ?? `${c.owner} → ${ownerName}${note ? ` · ${note}` : ''}` })
    return
  }
  const employeeId = employeeIdByName(ownerName)
  if (!employeeId) throw apiCallError(`${ownerName} is not an active employee`)
  putApiComplaint(await apiCall(() => post<ApiComplaint>(`/complaints/${enc(c.id)}/assign`, { employeeId, note: note || undefined }), 'Assignment failed'))
}

/**
 * PATCH /complaints/:id (open complaints only; `reason` mandatory): priority / department / component, and
 * category + subcategory (validated; the department follows a new category unless given), title, details.
 * SLA is recomputed on a priority change; the server keeps the field diff in the complaint history.
 */
export async function patchComplaintAsync(id: string, b: { priority?: Priority; department?: Department; component?: string; category?: string; subcategory?: string; title?: string; details?: string; reason: string }) {
  putApiComplaint(await apiCall(() => patch<ApiComplaint>(`/complaints/${enc(id)}`, b), 'Update failed'))
}

/** Progress note / engineer update / sub-status change. */
export async function addComplaintUpdateAsync(id: string, b: { kind?: 'Engineer' | 'Field' | 'Note' | 'Visit' | 'Spare' | 'Vendor'; text: string; subStatus?: string; proposedFix?: string; impact?: Impact; fileIds?: string[] }) {
  const SUBS = ['New', 'Assigned', 'In progress', 'Pending', 'Awaiting spare', 'Awaiting vendor', 'Awaiting repair', 'Resolved']
  const body = { ...b, kind: b.kind ?? 'Note', subStatus: b.subStatus && SUBS.includes(b.subStatus) ? b.subStatus : undefined, text: b.text.length < 2 ? `${b.text}.` : b.text.slice(0, 2000) }
  putApiComplaint(await apiCall(() => post<ApiComplaint>(`/complaints/${enc(id)}/updates`, body), 'Could not save the update'))
}

export async function resolveComplaintAsync(id: string, b: { outcome: Exclude<Outcome, 'Pending'>; note: string; replacement?: string; downtimeH?: number }) {
  putApiComplaint(await apiCall(() => post<ApiComplaint>(`/complaints/${enc(id)}/resolve`, b), 'Could not record the resolution'))
}
export async function closeComplaintAsync(id: string, b: { hdValidation: boolean; frSignOff: boolean; note?: string }) {
  putApiComplaint(await apiCall(() => post<ApiComplaint>(`/complaints/${enc(id)}/close`, b), 'Could not close the complaint'))
}
export async function reopenComplaintAsync(id: string, reason: string) {
  putApiComplaint(await apiCall(() => post<ApiComplaint>(`/complaints/${enc(id)}/reopen`, { reason }), 'Could not reopen the complaint'))
}

/** Read-only AI advice for one complaint (GET /:id/ai). */
export const complaintAi = (id: string) => get<Record<string, unknown>>(`/complaints/${enc(id)}/ai`)

/** Site Master asset + complaint / maintenance history (GET /assets/:atmId). */
export const complaintAsset = (atmId: string) => get<Record<string, unknown>>(`/complaints/assets/${enc(atmId)}`)

// ── Preventive maintenance ──────────────────────────────────────────────
type ApiMaint = { maintenanceId: string; atmId: string; title: string; owner: string; ownerName?: string; due: string; source?: string; status: 'Open' | 'Done'; createdAt: string }
const maintFromApi = (m: ApiMaint): MaintenanceTask => ({ id: m.maintenanceId, atmId: m.atmId, title: m.title, owner: m.ownerName ?? m.owner, due: m.due, createdAt: m.createdAt, source: m.source ?? '' })
export async function loadMaintenance() {
  if (!apiEnabled) return
  const r = await api<{ items: ApiMaint[] }>('/complaints/maintenance', { query: { status: 'Open', limit: 200 } })
  maintenanceStore.set(r.items.map(maintFromApi))
}
export async function addMaintenanceAsync(t: Omit<MaintenanceTask, 'id' | 'createdAt'>, complaintId?: string): Promise<MaintenanceTask> {
  const ownerId = employeeIdByName(t.owner)
  if (!ownerId) throw apiCallError(`${t.owner} is not an active employee`)
  const m = await apiCall(() => post<ApiMaint>('/complaints/maintenance', { atmOrSite: t.atmId, title: t.title, ownerId, due: t.due.slice(0, 10), source: t.source, complaintId }), 'Could not create the maintenance task')
  const out = maintFromApi(m)
  maintenanceStore.set((xs) => [out, ...xs])
  return out
}

function apiCallError(msg: string) {
  toast(msg, 'error') // surfaced like a backend validation error
  return new Error(msg)
}
