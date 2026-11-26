import {
  BarChart3,
  Building,
  IdCard,
  ListChecks,
  Receipt,
  Store,
  TicketCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { get } from '@/lib/api'
import { createStore } from '@/lib/store'
import { apiEnabled, createLoader, fromPaise } from '@/data/bizApi'

// Mock dashboard data taken from the Figma (Dashboard 56:3667). Replace with API calls later.

export const kpis = [
  { key: 'users', title: 'Total Users', value: '248', trend: '12%', up: true, caption: 'Active employees', color: 'blue' as const },
  { key: 'franchises', title: 'Franchises', value: '86', trend: '8%', up: true, caption: 'Active franchise partners', color: 'green' as const },
  { key: 'approvals', title: 'Pending Approvals', value: '14', trend: '5%', up: false, caption: 'Requires your attention', color: 'purple' as const },
  { key: 'complaints', title: 'Open Complaints', value: '7', trend: '2%', up: true, caption: 'Tickets raised', color: 'red' as const },
  { key: 'atms', title: 'Total ATMs', value: '1,284', trend: '14%', up: true, caption: 'Operational nationwide', color: 'navy' as const },
  { key: 'tasks', title: 'Active Tasks', value: '42', trend: '6%', up: false, caption: 'Assigned to technicians', color: 'purple' as const },
]

export const projects = [
  { name: 'HRMS', pct: 75, color: 'bg-accent-blue' },
  { name: 'Dexter CRM & Lead Management', pct: 60, color: 'bg-brand-red' },
  { name: 'WhatsApp CRM', pct: 45, color: 'bg-accent-purple' },
]

export const tickets = [
  { name: 'Complaints', value: 7, color: '#e52429' },
  { name: 'CBR', value: 5, color: '#1675f8' },
  { name: 'EOD', value: 4, color: '#009b73' },
  { name: 'Cash Loading', value: 3, color: '#f5a524' },
  { name: 'Others', value: 5, color: '#7439ed' },
]

export const finance = [
  { label: 'Payouts (Total)', amount: 1250000, trend: '10%', tone: 'amber' },
  { label: 'GST', amount: 230000, trend: '8%', tone: 'purple' },
  { label: 'Security Deposit', amount: 875000, trend: '5%', tone: 'green' },
  { label: 'Salary Payments', amount: 640000, trend: '7%', tone: 'blue' },
] as const

// Dates are relative to the clock (no fixed demo dates): `ago` is minutes before now.
const MIN = 60_000
const DAY = 24 * 60 * MIN
const fmtDay = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
const minsAgo = (m: number) => new Date(Date.now() - m * MIN)

export const activities = [
  { ago: 35, activity: 'New user registered · Rahul Dubey', module: 'Onboarding', status: 'Completed' },
  { ago: 108, activity: 'Complaint raised · Site ID 1024', module: 'Operations', status: 'In Progress' },
  { ago: 185, activity: 'Payout processed · MF', module: 'Finance', status: 'Completed' },
  { ago: 1_230, activity: 'Document verified · Franchise', module: 'KYC', status: 'Completed' },
  { ago: 1_420, activity: 'Attendance updated · 45 employees', module: 'HRMS', status: 'Completed' },
  { ago: 1_545, activity: 'Agreement uploaded · ABC Franchise', module: 'Legal', status: 'Pending' },
].map(({ ago, ...a }) => {
  const d = minsAgo(ago)
  return { ...a, when: fmtDay(d), time: fmtTime(d) }
})

export interface QuickAccessItem {
  label: string
  to: string
  icon?: LucideIcon
}

export const quickAccess: QuickAccessItem[] = [
  { label: 'Franchise Management', to: '/franchise', icon: Store },
  { label: 'KYC Management', to: '/kyc/verification', icon: IdCard },
  { label: 'Site Installation', to: '/projects/active', icon: Building },
  { label: 'Raise Complaint', to: '/operations/complaints', icon: TicketCheck },
  { label: 'Task Management', to: '/tasks/my', icon: ListChecks },
  { label: 'Reports Dashboard', to: '/reports', icon: BarChart3 },
  { label: 'Payout', to: '/finance/payout', icon: Wallet },
  { label: 'GST', to: '/finance/gst', icon: Receipt },
]

const maintenance = new Date(Date.now() + 3 * DAY)
export const dashboardNotices = [
  { title: 'System Maintenance Scheduled', body: `Platform will be down on ${fmtDay(maintenance)} (${maintenance.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Asia/Kolkata' })}).`, date: fmtDay(new Date()), color: 'bg-brand-red' },
  { title: 'New Policy Update', body: 'Please review the updated HR policy.', date: fmtDay(new Date(Date.now() - 2 * DAY)), color: 'bg-accent-amber' },
  { title: 'KYC Verification Pending', body: '3 new KYC documents need verification.', date: fmtDay(new Date(Date.now() - 5 * DAY)), color: 'bg-brand-red' },
]

/** e.g. "Thursday, 26 November 2026" — the dashboard's business date is today. */
export const todayLong = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
/** "26 Nov 2026, 09:14 IST" — figures are as of now (rounded down to the quarter hour). */
export const asOfLabel = () => {
  const d = new Date(Math.floor(Date.now() / (15 * MIN)) * 15 * MIN)
  return `${fmtDay(d)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })} IST`
}

export const moduleTiles = [
  { title: 'Legal', sub: 'LOI, Affidavits, Agreement', to: '/legal', tone: 'blue' },
  { title: 'Projects', sub: 'Site Installation', to: '/projects/active', tone: 'sky' },
  { title: 'Reports & MIS', sub: 'Management & Operational Reports', to: '/reports', tone: 'purple' },
  { title: 'Governance', sub: 'Audit, Security, Push Notifications', to: '/governance', tone: 'red' },
] as const

export const inr = (n: number) => '₹ ' + n.toLocaleString('en-IN')

// ── backend adapter (API mode): GET /dashboard/summary + /dashboard/notices ──
type ApiSummary = {
  kpis?: { key: string; title: string; value: number | null; trendPct?: number; caption: string }[]
  tickets?: { name: string; value: number | null }[]
  finance?: { label: string; amountPaise: number | null }[]
  activities?: { at: string; activity: string; module: string; by?: string; status: string }[]
  asOf?: string
}
type ApiNotice = { id: string; at: string; type: string; title: string; details: string; read: boolean }
export type DashboardData = {
  kpis: typeof kpis
  tickets: typeof tickets
  finance: { label: string; amount: number; trend: string; tone: 'amber' | 'purple' | 'green' | 'blue' }[]
  activities: typeof activities
  notices: typeof dashboardNotices
  asOf: string | null
}
const MOCK: DashboardData = { kpis, tickets, finance: [...finance], activities, notices: dashboardNotices, asOf: null }
const dashStore = createStore<DashboardData>(apiEnabled ? 'dexter.dashboard.api.v1' : 'dexter.dashboard.mock.v1', () => MOCK)
const KPI_COLOR = Object.fromEntries(kpis.map((k) => [k.key, k.color])) as Record<string, (typeof kpis)[number]['color']>
const TICKET_COLOR = ['#e52429', '#1675f8', '#009b73', '#f5a524', '#7439ed']
const TONES = ['amber', 'green', 'blue', 'purple'] as const
const dashLoader = createLoader('dashboard', async () => {
  const [s, n] = await Promise.all([get<ApiSummary>('/dashboard/summary'), get<{ items: ApiNotice[] }>('/dashboard/notices', { limit: 5 }).catch(() => ({ items: [] }))])
  if (!s.kpis) {
    // franchisee summary has a different shape — keep the layout, show what applies
    const f = s as ApiSummary & { sites?: number; operational?: number; legalActionsPending?: number; installationsInProgress?: number; unreadBroadcasts?: number }
    const k = (key: string, title: string, value: number | undefined, caption: string, color: (typeof kpis)[number]['color']) => ({ key, title, value: (value ?? 0).toLocaleString('en-IN'), trend: '0%', up: true, caption, color })
    dashStore.set({
      ...MOCK,
      kpis: [
        k('atms', 'My ATMs', f.sites, `${f.operational ?? 0} operational`, 'navy'),
        k('approvals', 'Legal actions pending', f.legalActionsPending, 'Documents to sign / upload', 'purple'),
        k('tasks', 'Installations in progress', f.installationsInProgress, 'Site installation', 'blue'),
        k('complaints', 'Unread broadcasts', f.unreadBroadcasts, 'From Dexter India', 'red'),
      ],
      tickets: [],
      finance: [],
      activities: [],
      notices: n.items.map((x) => ({ title: x.title, body: x.details, date: fmtDay(new Date(x.at)), color: x.read ? 'bg-accent-blue' : 'bg-accent-amber' })),
      asOf: s.asOf ?? null,
    })
    return
  }
  dashStore.set({
    kpis: s.kpis.map((k) => ({
      key: k.key,
      title: k.title,
      value: k.value === null ? '—' : k.value.toLocaleString('en-IN'),
      trend: `${Math.abs(k.trendPct ?? 0)}%`,
      up: (k.trendPct ?? 0) >= 0,
      caption: k.caption,
      color: KPI_COLOR[k.key] ?? 'blue',
    })),
    tickets: (s.tickets ?? []).map((t, i) => ({ name: t.name, value: t.value ?? 0, color: TICKET_COLOR[i % TICKET_COLOR.length] })),
    finance: (s.finance ?? []).map((f, i) => ({ label: f.label, amount: fromPaise(f.amountPaise), trend: '', tone: TONES[i % TONES.length] })),
    activities: (s.activities ?? []).map((a) => {
      const d = new Date(a.at)
      return { activity: a.by ? `${a.activity} · ${a.by}` : a.activity, module: a.module, status: a.status, when: fmtDay(d), time: fmtTime(d) }
    }),
    notices: n.items.map((x) => ({
      title: x.title,
      body: x.details,
      date: fmtDay(new Date(x.at)),
      color: /escalat|breach|overdue/i.test(x.type + x.title) ? 'bg-brand-red' : x.read ? 'bg-accent-blue' : 'bg-accent-amber',
    })),
    asOf: s.asOf ?? null,
  })
})
/** Dashboard data: mock figures, or (API mode) the live summary for the signed-in user. */
export function useDashboard(): DashboardData & { loading: boolean; error: string | null } {
  const st = dashLoader.use()
  const d = dashStore.use()
  return apiEnabled ? { ...d, loading: st.loading, error: st.error } : { ...MOCK, loading: false, error: null }
}
export const reloadDashboard = () => dashLoader.reload()
