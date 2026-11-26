import { createStore } from '@/lib/store'
import { del, get, post } from '@/lib/api'
import { apiEnabled, background, createLoader } from '@/data/bizApi'

export interface PushNotification {
  id: string
  campaignName: string
  title: string
  description: string
  organizationUnits: string[]
  departments: string[]
  designations: string[]
  audience: string
  fromDate: string
  toDate: string
  status: 'Active' | 'Scheduled' | 'Expired' | 'Draft'
  priority?: 'High' | 'Normal' | 'Critical'
  color?: string
  read?: boolean
  createdAt: string
  updatedAt?: string
}

export const ORG_UNITS_LIST = [
  'All Organization Units',
  'Corporate Headquarters (Mumbai BKC)',
  'Delhi Central Hub',
  'Agra Zonal Office',
  'Jaipur Regional Office',
  'Lucknow Operations Hub',
  'Patna Regional Office',
]

export const DEPARTMENTS_LIST = [
  'All Departments',
  'ATM Operations & Logistics',
  'Cheque Clearing & Vault Desk',
  'Legal & Compliance',
  'Finance & Accounts',
  'Franchise Management',
  'IT & Network Operations',
]

export const DESIGNATIONS_LIST = [
  'All Designations',
  'Branch Manager / Head',
  'CRA Field Custodian',
  'Franchise Partner (SMF / MF / FR)',
  'Operations Officer',
  'Compliance Auditor',
  'First Line Maintenance Engineer',
]

export const AUDIENCE_OPTIONS = [
  'All Active Users (System-wide)',
  'Franchisee Operators & Partners',
  'Field Support & CRA Custodians',
  'Zonal & Regional Management',
  'Corporate Compliance & Legal',
]

const SEED_NOTIFICATIONS: PushNotification[] = [
  {
    id: 'PN-2026-001',
    campaignName: 'Festive Season Vault Cash Buffer',
    title: 'Maintain Mandatory 25% Additional Cash Buffer on WLA ATMs',
    description:
      'All Zonal Hubs and CRA field custodians are instructed to maintain minimum 25% extra cash in cassettes to prevent cash-out alarms during the festival weekend.',
    organizationUnits: ['Agra Zonal Office', 'Delhi Central Hub', 'Jaipur Regional Office'],
    departments: ['ATM Operations & Logistics'],
    designations: ['CRA Field Custodian', 'Branch Manager / Head'],
    audience: 'Field Support & CRA Custodians',
    fromDate: '2026-10-25',
    toDate: '2026-11-10',
    status: 'Active',
    priority: 'Critical',
    color: 'bg-rose-500',
    createdAt: '2026-10-25T09:30:00Z',
  },
  {
    id: 'PN-2026-002',
    campaignName: 'RBI Dual-Custody PIN Mandate',
    title: 'Dual-Custody Electronic Lock Password Rotation Due',
    description:
      'In compliance with RBI cybersecurity guidelines, all combination safe lock passwords must be rotated and acknowledged in the Daak Register by 15-Nov-2026.',
    organizationUnits: ['All Organization Units'],
    departments: ['Legal & Compliance', 'ATM Operations & Logistics'],
    designations: ['All Designations'],
    audience: 'All Active Users (System-wide)',
    fromDate: '2026-10-28',
    toDate: '2026-11-15',
    status: 'Active',
    priority: 'High',
    color: 'bg-blue-500',
    createdAt: '2026-10-28T14:15:00Z',
  },
  {
    id: 'PN-2026-003',
    campaignName: 'KYC Document Refresh Drive',
    title: 'Submission of Re-KYC Solvency Certificates for Tier 2 Franchisees',
    description:
      'Master and Super Master franchisees must upload updated bank solvency certificates in the Franchise Dossier portal before the month-end closing cycle.',
    organizationUnits: ['Delhi Central Hub', 'Lucknow Operations Hub'],
    departments: ['Franchise Management'],
    designations: ['Franchise Partner (SMF / MF / FR)'],
    audience: 'Franchisee Operators & Partners',
    fromDate: '2026-11-01',
    toDate: '2026-11-20',
    status: 'Active',
    priority: 'Normal',
    color: 'bg-amber-500',
    createdAt: '2026-11-01T08:00:00Z',
  },
  {
    id: 'PN-2026-004',
    campaignName: 'Core Switch Maintenance Alert',
    title: 'Scheduled Core Switch Upgrade on 22nd Nov (02:00 AM - 04:30 AM)',
    description:
      'Atm network transactions will experience intermittent response timeouts during the scheduled kernel patch window. Operations monitoring will be heightened.',
    organizationUnits: ['Corporate Headquarters (Mumbai BKC)'],
    departments: ['IT & Network Operations'],
    designations: ['Operations Officer'],
    audience: 'Zonal & Regional Management',
    fromDate: '2026-11-20',
    toDate: '2026-11-23',
    status: 'Scheduled',
    priority: 'High',
    color: 'bg-purple-500',
    createdAt: '2026-11-01T10:00:00Z',
  },
]

export const pushNotificationStore = createStore<PushNotification[]>(
  apiEnabled ? 'dexter_push_notifications_api_v1' : 'dexter_push_notifications_v1',
  () => (apiEnabled ? [] : SEED_NOTIFICATIONS)
)

// ── backend adapter (API mode): /broadcasts/push campaigns ─────────────────
type ApiCampaign = Omit<PushNotification, 'id' | 'status' | 'color' | 'read'> & { campaignId: string; status: PushNotification['status']; enabled?: boolean; sentAt?: string; sentCount?: number }
const fromApi = (c: ApiCampaign): PushNotification => ({
  id: c.campaignId,
  campaignName: c.campaignName,
  title: c.title,
  description: c.description,
  organizationUnits: c.organizationUnits ?? [],
  departments: c.departments ?? [],
  designations: c.designations ?? [],
  audience: c.audience,
  fromDate: c.fromDate,
  toDate: c.toDate,
  status: c.status,
  priority: c.priority,
  color: c.priority === 'Critical' ? 'bg-rose-500' : c.priority === 'Normal' ? 'bg-blue-500' : 'bg-purple-500',
  read: !!c.sentAt,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
})
export const pushLoader = createLoader('push notifications', async () => {
  const r = await get<{ items: ApiCampaign[] }>('/broadcasts/push')
  pushNotificationStore.set(r.items.map(fromApi))
})
const resync = () => void pushLoader.reload()
const upsert = (c: ApiCampaign) => pushNotificationStore.set((prev) => [fromApi(c), ...prev.filter((p) => p.id !== c.campaignId)])

export function usePushNotifications() {
  pushLoader.use()
  return pushNotificationStore.use()
}

export function createPushNotification(data: {
  campaignName: string
  title: string
  description: string
  organizationUnits: string[]
  departments: string[]
  designations: string[]
  audience: string
  fromDate: string
  toDate: string
  priority?: 'High' | 'Normal' | 'Critical'
  color?: string
}): PushNotification {
  const current = pushNotificationStore.get()
  const now = new Date()
  const newSn = current.length + 1
  const id = `PN-2026-${String(newSn).padStart(3, '0')}`

  const isScheduled = data.fromDate > now.toISOString().slice(0, 10)
  const isExpired = data.toDate < now.toISOString().slice(0, 10)
  const status: 'Active' | 'Scheduled' | 'Expired' = isExpired
    ? 'Expired'
    : isScheduled
    ? 'Scheduled'
    : 'Active'

  const newRecord: PushNotification = {
    id,
    campaignName: data.campaignName,
    title: data.title,
    description: data.description,
    organizationUnits: data.organizationUnits.length ? data.organizationUnits : ['All Organization Units'],
    departments: data.departments.length ? data.departments : ['All Departments'],
    designations: data.designations.length ? data.designations : ['All Designations'],
    audience: data.audience || 'All Active Users (System-wide)',
    fromDate: data.fromDate,
    toDate: data.toDate,
    status,
    priority: data.priority || 'High',
    color: data.color || (data.priority === 'Critical' ? 'bg-rose-500' : 'bg-blue-500'),
    read: false,
    createdAt: now.toISOString(),
  }

  pushNotificationStore.set([newRecord, ...current])
  if (apiEnabled) {
    // optimistic row (temporary id) replaced by the server campaign (PN-YYYY-NNN); sent immediately when active
    background(
      async () => {
        const c = await post<ApiCampaign>('/broadcasts/push', { campaignName: data.campaignName, title: data.title, description: data.description, organizationUnits: data.organizationUnits, departments: data.departments, designations: data.designations, audience: data.audience || undefined, fromDate: data.fromDate, toDate: data.toDate, priority: data.priority ?? 'High' })
        pushNotificationStore.set((prev) => [fromApi(c), ...prev.filter((p) => p.id !== id)])
      },
      'Could not create push notification',
      resync,
    )
  }
  return newRecord
}

export function deletePushNotification(id: string) {
  pushNotificationStore.set((prev) => prev.filter((p) => p.id !== id))
  background(() => del(`/broadcasts/push/${id}`), 'Could not delete push notification', resync)
}

export function toggleNotificationStatus(id: string) {
  if (apiEnabled) {
    // backend: enabled flag; status is derived (disabled or past toDate → Expired, future fromDate → Scheduled)
    background(async () => upsert(await post<ApiCampaign>(`/broadcasts/push/${id}/toggle`)), 'Could not change push notification', resync)
    return
  }
  pushNotificationStore.set((prev) =>
    prev.map((p) =>
      p.id === id
        ? {
            ...p,
            status: p.status === 'Active' ? 'Expired' : 'Active',
            updatedAt: new Date().toISOString(),
          }
        : p
    )
  )
}

