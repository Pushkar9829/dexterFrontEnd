import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  BellRing,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Home,
  Link2,
  List,
  ListOrdered,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import {
  usePushNotifications,
  createPushNotification,
  deletePushNotification,
  toggleNotificationStatus,
  type PushNotification,
  ORG_UNITS_LIST,
  DEPARTMENTS_LIST,
  DESIGNATIONS_LIST,
  AUDIENCE_OPTIONS,
} from '@/data/pushNotifications'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

export default function PushNotifications() {
  const notifications = usePushNotifications()

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterAudience, setFilterAudience] = useState<string>('all')

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewingNotification, setViewingNotification] = useState<PushNotification | null>(null)

  // Derived metrics
  const activeCount = useMemo(
    () => notifications.filter((n) => n.status === 'Active').length,
    [notifications]
  )
  const scheduledCount = useMemo(
    () => notifications.filter((n) => n.status === 'Scheduled').length,
    [notifications]
  )
  const expiredCount = useMemo(
    () => notifications.filter((n) => n.status === 'Expired').length,
    [notifications]
  )

  // Filtered records
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filterStatus !== 'all' && n.status !== filterStatus) return false
      if (filterAudience !== 'all' && n.audience !== filterAudience) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = n.title.toLowerCase().includes(q)
        const matchesCamp = n.campaignName.toLowerCase().includes(q)
        const matchesDesc = n.description.toLowerCase().includes(q)
        const matchesId = n.id.toLowerCase().includes(q)
        if (!matchesTitle && !matchesCamp && !matchesDesc && !matchesId) return false
      }
      return true
    })
  }, [notifications, filterStatus, filterAudience, searchQuery])

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete campaign "${name}"?`)) {
      deletePushNotification(id)
      toast(`Push notification "${name}" deleted`, 'info')
    }
  }

  const handleToggle = (id: string, currentStatus: string) => {
    toggleNotificationStatus(id)
    toast(
      currentStatus === 'Active' ? 'Notification deactivated' : 'Notification activated',
      'success'
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 pb-16 font-sans">
      {/* Breadcrumbs */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
        <Link to="/dashboard" className="flex items-center gap-1 hover:text-primary transition-colors">
          <Home size={13} />
          <span>Workspace</span>
        </Link>
        <ChevronRight size={13} />
        <Link to="/governance" className="hover:text-primary transition-colors">
          Governance
        </Link>
        <ChevronRight size={13} />
        <span className="font-semibold text-ink">Push Notifications</span>
      </div>

      {/* Header Banner */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/60 p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-blue-500/20">
            <BellRing size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-ink">Push Notifications</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Broadcast Engine
              </span>
            </div>
            <p className="mt-1 text-[13px] text-muted">
              Publish, schedule, and broadcast targeted push notifications across organization units and designations. Active notifications appear in real-time on user dashboards.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors shrink-0"
        >
          <Plus size={16} />
          <span>Create Push Notification</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-emerald-800">Active Live Broadcasts</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <BellRing size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">{activeCount}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
            <span>Showing on Dashboard</span>
            <span className="font-semibold text-emerald-600">Broadcasting Now</span>
          </div>
        </div>

        <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/50 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-purple-800">Scheduled Campaigns</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">{scheduledCount}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
            <span>Upcoming Releases</span>
            <span className="font-medium text-purple-600">Auto-triggers on Date</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-slate-700">Expired / Concluded</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Calendar size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">{expiredCount}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
            <span>Archived Campaigns</span>
            <span className="font-medium text-slate-500">Historical Records</span>
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-primary">Total Target Audience</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-primary">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">{notifications.length} Campaigns</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
            <span>System Coverage</span>
            <span className="font-semibold text-primary">All Branches Covered</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 items-center">
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Search Notifications</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by campaign name, title, keywords..."
                className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-[12px] placeholder:text-slate-400 focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Filter Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-[12px] text-slate-700 focus:border-primary focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active (Broadcasting)</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Target Audience</label>
            <select
              value={filterAudience}
              onChange={(e) => setFilterAudience(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-[12px] text-slate-700 focus:border-primary focus:outline-hidden"
            >
              <option value="all">All Audiences</option>
              {AUDIENCE_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-ink">Push Notification Campaigns</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-primary">
              {filteredNotifications.length} Campaigns
            </span>
          </div>
          <div className="text-[12px] text-muted">
            Active notifications are mirrored on the Dashboard live
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-3">S.N.</th>
                <th className="py-3 px-3">Campaign & Title</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Target Audience & Org Units</th>
                <th className="py-3 px-3">Broadcast Schedule</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Bell size={24} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-ink">No push notifications found</p>
                    <p className="text-[12px] text-muted">
                      Click "+ Create Push Notification" above to schedule a new announcement.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((n, idx) => (
                  <tr key={n.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500 font-medium">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-mono text-[10px] font-bold text-primary">{n.id}</div>
                      <div className="font-semibold text-ink">{n.campaignName}</div>
                      <div className="text-[11px] text-slate-600 font-medium">{n.title}</div>
                    </td>
                    <td className="py-3 px-3 max-w-[280px]">
                      <div className="line-clamp-2 text-[11px] text-slate-600">{n.description}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        {n.audience}
                      </span>
                      <div className="mt-1 text-[10px] text-muted line-clamp-1">
                        {n.organizationUnits.join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700">
                        <Calendar size={11} className="text-slate-400" />
                        <span>{n.fromDate}</span>
                        <span>→</span>
                        <span>{n.toDate}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                          n.status === 'Active' && 'bg-emerald-100 text-emerald-800',
                          n.status === 'Scheduled' && 'bg-purple-100 text-purple-800',
                          n.status === 'Expired' && 'bg-slate-100 text-slate-600'
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {n.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingNotification(n)}
                          title="Preview Notification"
                          className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:border-primary hover:bg-blue-50 hover:text-primary transition-colors"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(n.id, n.status)}
                          title={n.status === 'Active' ? 'Deactivate' : 'Activate'}
                          className={cn(
                            'rounded-md border p-1.5 transition-colors',
                            n.status === 'Active'
                              ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          )}
                        >
                          <RefreshCw size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(n.id, n.campaignName)}
                          title="Delete Campaign"
                          className="rounded-md border border-slate-200 p-1.5 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: CREATE PUSH NOTIFICATION (EXACT MATCH OF UPLOADED IMAGE) */}
      {/* ============================================================== */}
      {isCreateModalOpen && (
        <CreatePushNotificationModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(created) => {
            setIsCreateModalOpen(false)
            toast(`Campaign "${created.campaignName}" scheduled & broadcasting!`, 'success')
          }}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL: PREVIEW PUSH NOTIFICATION */}
      {/* ============================================================== */}
      {viewingNotification && (
        <Modal
          title={`Notification Dossier: ${viewingNotification.id}`}
          onClose={() => setViewingNotification(null)}
          width={600}
        >
          <div className="space-y-4 text-[13px]">
            {/* Live Dashboard Card Preview Simulation */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Live Simulation Preview (As shown on Dashboard)
              </span>
              <div className="mt-2 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-sky-50/60 p-4 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-xs">
                    <BellRing size={14} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-ink">{viewingNotification.title}</h4>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {viewingNotification.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-slate-600 leading-relaxed">
                      {viewingNotification.description}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                        Campaign: {viewingNotification.campaignName}
                      </span>
                      <span>•</span>
                      <span>Audience: {viewingNotification.audience}</span>
                      <span>•</span>
                      <span>Valid: {viewingNotification.fromDate} to {viewingNotification.toDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Breakdown */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-[12px]">
              <div>
                <strong className="text-slate-700">Organization Unit(s):</strong>{' '}
                <span className="text-slate-600">{viewingNotification.organizationUnits.join(', ')}</span>
              </div>
              <div>
                <strong className="text-slate-700">Department(s):</strong>{' '}
                <span className="text-slate-600">{viewingNotification.departments.join(', ')}</span>
              </div>
              <div>
                <strong className="text-slate-700">Designation(s):</strong>{' '}
                <span className="text-slate-600">{viewingNotification.designations.join(', ')}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingNotification(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-[12px] font-semibold text-white hover:bg-slate-900"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ====================================================================
// MODAL: CREATE PUSH NOTIFICATION (DESIGNED TO MATCH SCREENSHOT)
// ====================================================================
function CreatePushNotificationModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: (item: PushNotification) => void
}) {
  const [campaignName, setCampaignName] = useState('')
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationDescription, setNotificationDescription] = useState('')
  const [selectedOrgUnit, setSelectedOrgUnit] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedDesignation, setSelectedDesignation] = useState('')
  const [selectedAudience, setSelectedAudience] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const MAX_CHAR = 500
  const remainingChar = Math.max(0, MAX_CHAR - notificationDescription.length)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!campaignName.trim()) {
      toast('Campaign Name is required', 'error')
      return
    }
    if (!notificationTitle.trim()) {
      toast('Notification Title is required', 'error')
      return
    }
    if (!notificationDescription.trim()) {
      toast('Notification Description is required', 'error')
      return
    }
    if (!fromDate || !toDate) {
      toast('Please specify both From Date and To Date schedule', 'error')
      return
    }

    const created = createPushNotification({
      campaignName,
      title: notificationTitle,
      description: notificationDescription,
      organizationUnits: selectedOrgUnit ? [selectedOrgUnit] : ['All Organization Units'],
      departments: selectedDepartment ? [selectedDepartment] : ['All Departments'],
      designations: selectedDesignation ? [selectedDesignation] : ['All Designations'],
      audience: selectedAudience || 'All Active Users (System-wide)',
      fromDate,
      toDate,
    })

    onSuccess(created)
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create Push Notification"
        className="flex max-h-[92vh] w-full flex-col rounded-xl bg-white shadow-2xl overflow-hidden font-sans"
        style={{ maxWidth: 620 }}
      >
        {/* Custom Blue Header matching screenshot */}
        <header className="flex items-center justify-between bg-[#0080ff] px-6 py-3.5 text-white">
          <h2 className="text-[17px] font-semibold tracking-tight">Create Push Notification</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded hover:bg-white/20 text-white transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 text-[13px]">
          {/* Notification Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">Notification</h3>

            {/* Campaign Name */}
            <div className="space-y-1">
              <label className="block text-[12px] text-slate-600 font-medium">Campaign Name *</label>
              <input
                type="text"
                required
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] text-slate-800 focus:border-primary focus:outline-hidden"
              />
            </div>

            {/* Notification Title */}
            <div className="space-y-1">
              <label className="block text-[12px] text-slate-600 font-medium">Notification Title *</label>
              <input
                type="text"
                required
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] text-slate-800 focus:border-primary focus:outline-hidden"
              />
            </div>

            {/* Notification Description with mini formatting toolbar */}
            <div className="space-y-1">
              <label className="block text-[12px] text-slate-600 font-medium">Notification Description *</label>
              <div className="rounded-md border border-slate-200 overflow-hidden focus-within:border-primary">
                {/* Formatting Toolbar */}
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-600">
                  <button
                    type="button"
                    title="Insert Link"
                    onClick={() => {
                      const url = prompt('Enter link URL:')
                      if (url) {
                        setNotificationDescription((prev) => `${prev} [link](${url})`)
                      }
                    }}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    <Link2 size={14} />
                  </button>
                  <button
                    type="button"
                    title="Bullet List"
                    onClick={() => setNotificationDescription((prev) => `${prev}\n• `)}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    <List size={14} />
                  </button>
                  <button
                    type="button"
                    title="Numbered List"
                    onClick={() => setNotificationDescription((prev) => `${prev}\n1. `)}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    <ListOrdered size={14} />
                  </button>
                  <div className="flex items-center gap-0.5 text-[11px] text-slate-500 hover:bg-slate-200 px-1 py-0.5 rounded cursor-pointer">
                    <FileText size={13} />
                    <ChevronDown size={12} />
                  </div>
                </div>

                <textarea
                  rows={4}
                  required
                  maxLength={MAX_CHAR}
                  placeholder="Type your notification here..."
                  value={notificationDescription}
                  onChange={(e) => setNotificationDescription(e.target.value)}
                  className="w-full p-3 text-[13px] text-slate-800 focus:outline-hidden resize-y"
                />
              </div>
              <div className="text-[11px] text-rose-500 font-medium">
                Max characters: {MAX_CHAR}. Remaining: {remainingChar}
              </div>
            </div>

            {/* Organization Unit(s) */}
            <div className="space-y-1">
              <label className="block text-[12px] text-slate-600 font-medium">Organization Unit(s)</label>
              <select
                value={selectedOrgUnit}
                onChange={(e) => setSelectedOrgUnit(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-hidden"
              >
                <option value="">Select Organization Units</option>
                {ORG_UNITS_LIST.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Department(s) */}
            <div className="space-y-1">
              <label className="block text-[12px] text-slate-600 font-medium">Department(s)</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-hidden"
              >
                <option value="">Select Department</option>
                {DEPARTMENTS_LIST.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Designation(s) */}
            <div className="space-y-1">
              <label className="block text-[12px] text-slate-600 font-medium">Designation(s)</label>
              <select
                value={selectedDesignation}
                onChange={(e) => setSelectedDesignation(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-hidden"
              >
                <option value="">Select Designation</option>
                {DESIGNATIONS_LIST.map((des) => (
                  <option key={des} value={des}>
                    {des}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audience Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Audience *</h3>
            <div className="space-y-1">
              <label className="block text-[12px] text-slate-600 font-medium">Choose</label>
              <select
                required
                value={selectedAudience}
                onChange={(e) => setSelectedAudience(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-hidden"
              >
                <option value="">Select Audience</option>
                {AUDIENCE_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Schedule *</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[12px] text-slate-600 font-medium">From Date</label>
                <input
                  type="date"
                  required
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[12px] text-slate-600 font-medium">To Date</label>
                <input
                  type="date"
                  required
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons (Green Submit, Bordered Cancel) */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="rounded-md bg-[#22c55e] hover:bg-[#16a34a] px-6 py-2 text-[13px] font-semibold text-white shadow-xs transition-colors"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-5 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

