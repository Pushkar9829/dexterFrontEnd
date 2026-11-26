import { createStore } from '@/lib/store'
import { apiEnabled, del, get, post, put } from '@/lib/api'
import { createLoader, fetchAll, toastError } from './bizApi'
import { emitWorkflow } from './workflow'
import { emptyForm, seedApplications, type Application, type ApplicantType, type ApplicationForm, type AppStatus } from './applications'

// API mode (VITE_API_URL): hydrated from GET /onboarding/applications; mutations are applied locally first (the wizard
// needs a synchronous id) and then sent to the backend in order, per application. Mock mode: localStorage seed only.
export const applicationStore = createStore<Application[]>(apiEnabled ? 'dexter.applications.api.v1' : 'dexter.applications.v1', () => (apiEnabled ? [] : seedApplications()))

export const useApplications = () => {
  applicationLoader.use()
  return applicationStore.use()
}

export function getApplication(id: string) {
  return applicationStore.get().find((a) => a.id === (serverId.get(id) ?? id))
}

export function nextApplicationId() {
  const max = applicationStore.get().reduce((m, a) => Math.max(m, Number(a.id.split('-').pop()) || 0), 0)
  return `APP-2026-${String(max + 1).padStart(4, '0')}`
}

/** Create or update an application from the wizard. */
export function saveApplication(id: string | null, form: ApplicationForm, status: AppStatus): Application {
  const now = new Date().toISOString()
  const existing = id ? getApplication(id) : undefined
  const app: Application = {
    id: existing?.id ?? id ?? (apiEnabled ? `${TEMP}${Date.now().toString(36).toUpperCase()}` : nextApplicationId()),
    applicantName: form.franchiseName || form.shopOwnerName || existing?.applicantName || 'Untitled applicant',
    applicantEmail: form.email || existing?.applicantEmail || '—',
    type: existing?.type ?? 'Franchise',
    status,
    submittedAt: status === 'Draft' ? existing?.submittedAt ?? now : now,
    updatedAt: now,
    form,
  }
  applicationStore.set((list) => (existing ? list.map((a) => (a.id === app.id ? app : a)) : [app, ...list]))
  if (apiEnabled) {
    remoteSave(app, status !== 'Draft')
    return app
  }
  if (status === 'Under review' && existing?.status !== 'Under review')
    emitWorkflow({
      module: 'Onboarding', event: 'Submit', refId: app.id,
      vars: { Record_ID: app.id, Franchise_Name: app.applicantName, Site_ID: form.siteName || undefined, Current_Status: status, Pending_Action: 'Review & approve application' },
      nextAction: { title: `Review onboarding application ${app.id} (${app.applicantName})` },
    })
  return app
}

/** Status change. API mode: Under review / KYC pending → POST …/status; Approved / Rejected → POST …/decision (reason required to reject). */
export function setStatus(ids: string[], status: AppStatus, note?: string) {
  const now = new Date().toISOString()
  const changed = applicationStore.get().filter((a) => ids.includes(a.id) && a.status !== status)
  applicationStore.set((list) => list.map((a) => (ids.includes(a.id) ? { ...a, status, updatedAt: now } : a)))
  if (apiEnabled) {
    changed.forEach((a) =>
      enqueue(a.id, async (sid) => {
        if (!sid) throw new Error('The application is still being saved — try again in a moment.')
        const out =
          status === 'Approved' || status === 'Rejected'
            ? await post<ApiApplication>(`/onboarding/applications/${sid}/decision`, { decision: status, reason: note })
            : await post<ApiApplication>(`/onboarding/applications/${sid}/status`, { status, note })
        replace(a.id, fromApi(out))
      }),
    )
    return
  }
  const event = status === 'Approved' ? 'Approve' : status === 'Rejected' ? 'Reject' : status === 'Under review' ? 'Submit' : null
  if (event)
    changed.forEach((a) =>
      emitWorkflow({ module: 'Onboarding', event, refId: a.id, vars: { Record_ID: a.id, Franchise_Name: a.applicantName, Current_Status: status } }),
    )
}

/**
 * Delete a draft. API mode: soft delete — DELETE /onboarding/applications/:id {reason} (Draft only, `NOT_DRAFT`
 * otherwise); removed locally at once, re-hydrated if the server refuses. A never-saved draft is only removed locally.
 */
export function deleteApplication(id: string, reason?: string): boolean {
  if (apiEnabled) {
    const sid = serverId.get(id) ?? (id.startsWith(TEMP) ? null : id)
    if (sid && (reason?.trim().length ?? 0) < 3) {
      toastError(new Error('A reason (at least 3 characters) is required to delete a draft.'), 'Delete draft')
      return false
    }
    applicationStore.set((list) => list.filter((a) => a.id !== id))
    if (sid)
      del(`/onboarding/applications/${encodeURIComponent(sid)}`, { reason: reason!.trim() }).catch((e: unknown) => {
        toastError(e, 'Delete draft')
        void applicationLoader.reload()
      })
    return true
  }
  applicationStore.set((list) => list.filter((a) => a.id !== id))
  return true
}

export const blankForm = emptyForm

// ══════════════════════════════ Backend API ══════════════════════════════
const TEMP = 'APP-NEW-'
/** local (temporary) id → server appId, so the wizard can keep saving under the id it was given. */
const serverId = new Map<string, string>()

type ApiApplication = { appId: string; applicantName: string; applicantEmail: string; type: ApplicantType; status: AppStatus; submittedAt?: string; createdAt?: string; updatedAt?: string; form: Partial<ApplicationForm> }

function fromApi(x: ApiApplication): Application {
  return {
    id: x.appId,
    applicantName: x.applicantName,
    applicantEmail: x.applicantEmail || '—',
    type: x.type,
    status: x.status,
    submittedAt: String(x.submittedAt ?? x.createdAt ?? ''),
    updatedAt: String(x.updatedAt ?? ''),
    form: { ...emptyForm(), ...(x.form ?? {}) } as ApplicationForm,
  }
}

function replace(localId: string, app: Application) {
  if (localId !== app.id) serverId.set(localId, app.id)
  applicationStore.set((list) => {
    const at = list.findIndex((a) => a.id === localId || a.id === app.id)
    const rest = list.filter((a) => a.id !== localId && a.id !== app.id)
    return at < 0 ? [app, ...rest] : [...rest.slice(0, at), app, ...rest.slice(at)]
  })
}

/** Per-application FIFO so autosave / submit never race (the first POST's appId is used by later PUTs). */
const queues = new Map<string, Promise<void>>()
const rootOf = (id: string) => [...serverId.entries()].find(([, v]) => v === id)?.[0] ?? id
const sidOf = (root: string) => serverId.get(root) ?? (root.startsWith(TEMP) ? null : root)
function enqueue(localId: string, fn: (sid: string | null) => Promise<void>) {
  const root = rootOf(localId)
  const next = (queues.get(root) ?? Promise.resolve())
    .then(() => fn(sidOf(root)))
    .catch((e) => {
      toastError(e, `Application ${sidOf(root) ?? 'draft'}`)
      const sid = sidOf(root)
      if (sid) refreshApplication(sid).catch(() => undefined)
    })
  queues.set(root, next)
}

function remoteSave(app: Application, submit: boolean) {
  enqueue(app.id, async (sid) => {
    const body = {
      applicantName: app.applicantName,
      applicantEmail: app.applicantEmail.includes('@') ? app.applicantEmail : undefined,
      type: app.type,
      form: app.form as unknown as Record<string, unknown>,
      submit,
    }
    const out = sid ? await put<ApiApplication>(`/onboarding/applications/${sid}`, body) : await post<ApiApplication>('/onboarding/applications', body)
    replace(sid ?? app.id, fromApi(out))
    if (!sid) serverId.set(app.id, out.appId)
  })
}

export async function refreshApplication(id: string) {
  if (!apiEnabled) return
  const x = await get<ApiApplication>(`/onboarding/applications/${encodeURIComponent(serverId.get(id) ?? id)}`)
  replace(x.appId, fromApi(x))
}

export const applicationLoader = createLoader('onboarding applications', async () => {
  const items = await fetchAll<ApiApplication>('/onboarding/applications')
  const pending = applicationStore.get().filter((a) => a.id.startsWith(TEMP) && !serverId.has(a.id))
  applicationStore.set([...pending, ...items.map(fromApi)])
})
