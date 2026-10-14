import { createStore } from '@/lib/store'
import { emptyForm, seedApplications, type Application, type ApplicationForm, type AppStatus } from './applications'

export const applicationStore = createStore<Application[]>('dexter.applications.v1', seedApplications)

export const useApplications = () => applicationStore.use()

export function getApplication(id: string) {
  return applicationStore.get().find((a) => a.id === id)
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
    id: existing?.id ?? id ?? nextApplicationId(),
    applicantName: form.franchiseName || form.shopOwnerName || existing?.applicantName || 'Untitled applicant',
    applicantEmail: form.email || existing?.applicantEmail || '—',
    type: existing?.type ?? 'Franchise',
    status,
    submittedAt: status === 'Draft' ? existing?.submittedAt ?? now : now,
    updatedAt: now,
    form,
  }
  applicationStore.set((list) => (existing ? list.map((a) => (a.id === app.id ? app : a)) : [app, ...list]))
  return app
}

export function setStatus(ids: string[], status: AppStatus) {
  const now = new Date().toISOString()
  applicationStore.set((list) => list.map((a) => (ids.includes(a.id) ? { ...a, status, updatedAt: now } : a)))
}

export function deleteApplication(id: string) {
  applicationStore.set((list) => list.filter((a) => a.id !== id))
}

export const blankForm = emptyForm
