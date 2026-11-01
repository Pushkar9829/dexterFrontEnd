import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Home,
  Search,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'

export type ApprovalType =
  | 'Franchise Onboarding'
  | 'KYC Verification'
  | 'Account Mapping'
  | 'CLF Allocation'
  | 'Site Installation'
  | 'Operator Access'

export type ApprovalPriority = 'Urgent' | 'High' | 'Normal'
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Under Review'

export interface ApprovalItem {
  id: string
  approvalId: string
  requestType: ApprovalType
  entityName: string
  entityRef: string
  submittedAt: string
  submittedBy: string
  stage: string
  priority: ApprovalPriority
  status: ApprovalStatus
  notes?: string
  remarks?: string
}

const INITIAL_APPROVALS: ApprovalItem[] = [
  {
    id: 'app-1',
    approvalId: 'APP-2026-081',
    requestType: 'Franchise Onboarding',
    entityName: 'Bhavin Patel (M/s Patel Infotech)',
    entityRef: 'DX-GJ-02988',
    submittedAt: '28-10-2026 11:30 AM',
    submittedBy: 'Meera Iyer (Sales Lead)',
    stage: 'Final Sign-off',
    priority: 'Urgent',
    status: 'Pending',
    notes: 'Completed LOI agreement, police verification clearance and initial security deposit of ₹5,00,000.',
  },
  {
    id: 'app-2',
    approvalId: 'APP-2026-082',
    requestType: 'Account Mapping',
    entityName: 'Ranjeet Pal & Shikha Pal',
    entityRef: 'HPY-9921408',
    submittedAt: '27-10-2026 03:45 PM',
    submittedBy: 'Paras Dubey (Ops Executive)',
    stage: 'Finance Review',
    priority: 'High',
    status: 'Pending',
    notes: 'Nodal settlement sweep migration from Axis Indent account to HDFC Bank primary current account.',
  },
  {
    id: 'app-3',
    approvalId: 'APP-2026-083',
    requestType: 'KYC Verification',
    entityName: 'Rameshwar Kulkarni',
    entityRef: 'DX-MH-01482',
    submittedAt: '26-10-2026 02:15 PM',
    submittedBy: 'Sunil Mehta (KYC Desk)',
    stage: 'Legal Clearance',
    priority: 'Normal',
    status: 'Pending',
    notes: 'Uploaded Aadhaar offline e-KYC, PAN card notarized copy and municipal commercial shop lease.',
  },
  {
    id: 'app-4',
    approvalId: 'APP-2026-084',
    requestType: 'CLF Allocation',
    entityName: 'M/s Shri Ram Cash Logistics',
    entityRef: 'CLF-2026-904',
    submittedAt: '25-10-2026 05:20 PM',
    submittedBy: 'Deepak Saxena (Treasury)',
    stage: 'Finance Review',
    priority: 'High',
    status: 'Pending',
    notes: 'Auxiliary cash loading fund limit increase request of ₹25,00,000 for festival weekend vault reserve.',
  },
  {
    id: 'app-5',
    approvalId: 'APP-2026-085',
    requestType: 'Site Installation',
    entityName: 'Gomti Nagar Express Market Hub',
    entityRef: 'SITE-UP-441',
    submittedAt: '24-10-2026 10:10 AM',
    submittedBy: 'Vikramaditya Rao (Project Manager)',
    stage: 'Technical Sign-off',
    priority: 'Normal',
    status: 'Pending',
    notes: 'Civil work, UPS power redundancy, earthing and VSAT communications tested successfully.',
  },
  {
    id: 'app-6',
    approvalId: 'APP-2026-086',
    requestType: 'Operator Access',
    entityName: 'Harish Nair (CRA Field Engineer)',
    entityRef: 'DX-EMP-1402',
    submittedAt: '23-10-2026 04:30 PM',
    submittedBy: 'Ananya Sen (HR Lead)',
    stage: 'IT Admin Sign-off',
    priority: 'Normal',
    status: 'Pending',
    notes: 'Vault combo clearance credentials and secondary CRA mobile app role provisioning.',
  },
  {
    id: 'app-7',
    approvalId: 'APP-2026-079',
    requestType: 'Franchise Onboarding',
    entityName: 'Kavita Joshi (Apex Financials)',
    entityRef: 'DX-KA-01185',
    submittedAt: '22-10-2026 09:15 AM',
    submittedBy: 'Meera Iyer (Sales Lead)',
    stage: 'Completed',
    priority: 'Urgent',
    status: 'Approved',
    notes: 'All 7 onboarding milestones completed and verified. Terminal live for cash transactions.',
  },
  {
    id: 'app-8',
    approvalId: 'APP-2026-078',
    requestType: 'Account Mapping',
    entityName: 'Omkar Enterprises',
    entityRef: 'HPY-4491023',
    submittedAt: '20-10-2026 01:20 PM',
    submittedBy: 'Paras Dubey (Ops Executive)',
    stage: 'Completed',
    priority: 'Normal',
    status: 'Approved',
    notes: 'ICICI Bank nodal account mapped and tested with 1 INR reverse penny drop.',
  },
  {
    id: 'app-9',
    approvalId: 'APP-2026-077',
    requestType: 'KYC Verification',
    entityName: 'Rajeshwar Yadav',
    entityRef: 'DX-RJ-00912',
    submittedAt: '19-10-2026 11:45 AM',
    submittedBy: 'Sunil Mehta (KYC Desk)',
    stage: 'Rejected at L1',
    priority: 'Normal',
    status: 'Rejected',
    remarks: 'Discrepancy in PAN name vs Bank account name. Applicant requested to resubmit fresh cancelled cheque.',
  },
]

export default function OnboardingApprovals() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>(INITIAL_APPROVALS)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')

  // Modals
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null)
  const [rejectModal, setRejectModal] = useState<ApprovalItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Metrics
  const stats = useMemo(() => {
    return {
      pending: approvals.filter((a) => a.status === 'Pending').length,
      approved: approvals.filter((a) => a.status === 'Approved').length,
      rejected: approvals.filter((a) => a.status === 'Rejected').length,
      urgent: approvals.filter((a) => a.priority === 'Urgent' && a.status === 'Pending').length,
    }
  }, [approvals])

  // Filtered
  const filtered = useMemo(() => {
    return approvals.filter((a) => {
      const q = search.toLowerCase()
      const matchQ =
        !q ||
        a.approvalId.toLowerCase().includes(q) ||
        a.entityName.toLowerCase().includes(q) ||
        a.entityRef.toLowerCase().includes(q) ||
        a.submittedBy.toLowerCase().includes(q)

      const matchT = typeFilter === 'All' || a.requestType === typeFilter
      const matchS = statusFilter === 'All' || a.status === statusFilter
      const matchP = priorityFilter === 'All' || a.priority === priorityFilter

      return matchQ && matchT && matchS && matchP
    })
  }, [approvals, search, typeFilter, statusFilter, priorityFilter])

  // Approve Action
  const handleApprove = (item: ApprovalItem) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, status: 'Approved', stage: 'Sign-off Completed' } : a))
    )
    toast(`Approval ${item.approvalId} for ${item.entityName} approved successfully`, 'success')
  }

  // Reject Action
  const handleRejectConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectReason.trim()) {
      toast('Please enter a rejection reason', 'error')
      return
    }
    if (rejectModal) {
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === rejectModal.id
            ? { ...a, status: 'Rejected', remarks: rejectReason, stage: 'Returned for revision' }
            : a
        )
      )
      toast(`Approval ${rejectModal.approvalId} rejected and returned`, 'info')
      setRejectModal(null)
      setRejectReason('')
    }
  }

  // Export CSV
  const handleExport = () => {
    const headers = [
      '#',
      'Approval ID',
      'Request Type',
      'Entity Name',
      'Entity Reference / ATM ID',
      'Submitted Date & Time',
      'Submitted By',
      'Stage',
      'Priority',
      'Status',
    ]
    const rows = filtered.map((a, i) => [
      String(i + 1),
      a.approvalId,
      a.requestType,
      a.entityName,
      a.entityRef,
      a.submittedAt,
      a.submittedBy,
      a.stage,
      a.priority,
      a.status,
    ])
    downloadCsv(`onboarding-approvals-${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast('Approvals exported successfully', 'success')
  }

  return (
    <div className="space-y-5 pb-16 max-w-[1440px] font-sans">
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/onboarding" className="hover:text-[#0066FF] transition-colors">
          Onboarding
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Approvals</span>
      </div>

      {/* ── Header Title & Actions ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-sm shrink-0">
            <UserCheck size={20} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              Onboarding &amp; Operations Approvals
            </h1>
            <p className="mt-0.5 text-[12.5px] text-slate-500">
              Review pending authorizations, workflow sign-offs, franchise agreements and KYC clearances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Top Metric Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('Pending')}
          className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center justify-between cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div>
            <div className="text-[12px] font-medium text-slate-500">Pending Approvals</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Requires management sign-off</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('Approved')}
          className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center justify-between cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <div>
            <div className="text-[12px] font-medium text-slate-500">Approved Items</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.approved}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Active &amp; provisioned</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('Rejected')}
          className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center justify-between cursor-pointer hover:border-red-300 transition-colors"
        >
          <div>
            <div className="text-[12px] font-medium text-slate-500">Rejected / Returned</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Awaiting applicant resubmission</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <XCircle size={20} />
          </div>
        </div>

        <div
          onClick={() => setPriorityFilter('Urgent')}
          className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center justify-between cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div>
            <div className="text-[12px] font-medium text-slate-500">Urgent Priority</div>
            <div className="text-2xl font-bold text-[#0066FF] mt-1">{stats.urgent}</div>
            <div className="text-[11px] text-blue-600 mt-0.5 font-medium">Under 4h turnaround SLA</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
            <AlertCircle size={20} />
          </div>
        </div>
      </div>

      {/* ── Filters & Search ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search approval ID, entity, ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-[12.5px] outline-none focus:border-[#0066FF]"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-medium text-slate-700 outline-none focus:border-[#0066FF]"
            >
              <option value="All">All Request Types</option>
              <option value="Franchise Onboarding">Franchise Onboarding</option>
              <option value="KYC Verification">KYC Verification</option>
              <option value="Account Mapping">Account Mapping</option>
              <option value="CLF Allocation">CLF Allocation</option>
              <option value="Site Installation">Site Installation</option>
              <option value="Operator Access">Operator Access</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-medium text-slate-700 outline-none focus:border-[#0066FF]"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-medium text-slate-700 outline-none focus:border-[#0066FF]"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent Priority</option>
              <option value="High">High Priority</option>
              <option value="Normal">Normal Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table Container ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="bg-[#CFE8FC] text-[#2C5282] font-semibold text-[12px] tracking-wide border-b border-sky-200">
              <tr>
                <th className="px-3.5 py-3 text-center w-12 font-bold">#</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Approval ID</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Request Type</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Entity / Applicant Name</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Entity Reference</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Submitted At</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Submitted By</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Stage</th>
                <th className="px-3.5 py-3 font-bold text-center whitespace-nowrap">Priority</th>
                <th className="px-3.5 py-3 font-bold text-center whitespace-nowrap">Status</th>
                <th className="px-3.5 py-3 font-bold text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((a, i) => (
                <tr key={a.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-3.5 py-3 text-center text-slate-500 font-medium">{i + 1}</td>
                  <td className="px-3.5 py-3 font-mono text-[12px] font-semibold text-[#0066FF] whitespace-nowrap">
                    {a.approvalId}
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <span className="font-semibold text-slate-800">{a.requestType}</span>
                  </td>
                  <td className="px-3.5 py-3 font-medium text-slate-900 max-w-[220px] truncate" title={a.entityName}>
                    {a.entityName}
                  </td>
                  <td className="px-3.5 py-3 font-mono text-[11.5px] text-slate-600 whitespace-nowrap">
                    {a.entityRef}
                  </td>
                  <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap text-[11.5px]">
                    {a.submittedAt}
                  </td>
                  <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">{a.submittedBy}</td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <span className="text-[11.5px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {a.stage}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider',
                        a.priority === 'Urgent' && 'bg-red-50 text-red-700 border border-red-200',
                        a.priority === 'High' && 'bg-amber-50 text-amber-700 border border-amber-200',
                        a.priority === 'Normal' && 'bg-slate-100 text-slate-700 border border-slate-200'
                      )}
                    >
                      {a.priority}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                        a.status === 'Pending' && 'bg-amber-50 text-amber-700 border-amber-200',
                        a.status === 'Approved' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        a.status === 'Rejected' && 'bg-red-50 text-red-700 border-red-200',
                        a.status === 'Under Review' && 'bg-blue-50 text-blue-700 border-blue-200'
                      )}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(a)}
                        className="p-1.5 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>

                      {a.status === 'Pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(a)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            title="Approve Request"
                          >
                            <Check size={14} strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectModal(a)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Reject Request"
                          >
                            <X size={14} strokeWidth={2.5} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No approval requests found matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-4 py-3 border-t border-slate-100 text-[12px] text-slate-500 flex items-center justify-between bg-slate-50/50">
          <div>
            Showing <strong className="font-semibold text-slate-700">{filtered.length}</strong> of{' '}
            <strong className="font-semibold text-slate-700">{approvals.length}</strong> items
          </div>
          <div className="text-[11px] text-slate-400">
            Sign-offs update upstream franchise, KYC, and settlement ledgers immediately
          </div>
        </div>
      </div>

      {/* ── View Dossier Modal ────────────────────────────────────────────── */}
      {selectedItem && (
        <Modal
          title={`Approval Details — ${selectedItem.approvalId}`}
          sub={`${selectedItem.requestType} · ${selectedItem.entityName}`}
          onClose={() => setSelectedItem(null)}
          width={640}
          footer={
            <div className="flex w-full items-center justify-between">
              {selectedItem.status === 'Pending' ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleApprove(selectedItem)
                      setSelectedItem(null)
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-semibold transition-colors"
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectModal(selectedItem)
                      setSelectedItem(null)
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-semibold transition-colors"
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              ) : (
                <span className="text-[12px] text-slate-500">
                  Decision recorded on this request
                </span>
              )}

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12.5px] font-semibold"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-[12.5px]">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Entity Name</span>
                <span className="text-[13px] font-semibold text-slate-900">{selectedItem.entityName}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Reference Code</span>
                <span className="font-mono text-[12px] font-semibold text-slate-700">{selectedItem.entityRef}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Submitted By</span>
                <span className="text-[12.5px] font-medium text-slate-800">{selectedItem.submittedBy}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Submission Timestamp</span>
                <span className="text-[12px] text-slate-600">{selectedItem.submittedAt}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Current Stage</span>
                <span className="text-[12px] font-medium text-blue-700">{selectedItem.stage}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Current Status</span>
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold mt-0.5',
                    selectedItem.status === 'Pending' && 'bg-amber-50 text-amber-700 border border-amber-200',
                    selectedItem.status === 'Approved' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                    selectedItem.status === 'Rejected' && 'bg-red-50 text-red-700 border border-red-200'
                  )}
                >
                  {selectedItem.status}
                </span>
              </div>
            </div>

            {selectedItem.notes && (
              <div>
                <label className="text-[11.5px] font-bold text-slate-700 block mb-1">
                  Submission Notes &amp; Verification Background
                </label>
                <div className="p-3 rounded-lg border border-slate-200 bg-white text-slate-700 leading-relaxed">
                  {selectedItem.notes}
                </div>
              </div>
            )}

            {selectedItem.remarks && (
              <div>
                <label className="text-[11.5px] font-bold text-red-700 block mb-1">
                  Rejection Reason / Revision Remarks
                </label>
                <div className="p-3 rounded-lg border border-red-200 bg-red-50/50 text-red-800 leading-relaxed">
                  {selectedItem.remarks}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Reject Modal ──────────────────────────────────────────────────── */}
      {rejectModal && (
        <Modal
          title={`Reject Request — ${rejectModal.approvalId}`}
          sub={`Specify reason for returning ${rejectModal.entityName}'s request.`}
          onClose={() => setRejectModal(null)}
          width={500}
          footer={
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-semibold shadow-2xs"
              >
                Confirm Rejection
              </button>
            </div>
          }
        >
          <form onSubmit={handleRejectConfirm} className="space-y-3 text-[12.5px]">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Detail the discrepancy or missing compliance document..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded border border-slate-200 p-2.5 text-[12.5px] outline-none focus:border-red-500 resize-none"
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

