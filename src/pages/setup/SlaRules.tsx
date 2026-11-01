import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Edit2,
  Eye,
  Home,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'

export type SlaSeverity = 'Critical' | 'High' | 'Medium' | 'Low'
export type SlaCategory =
  | 'Operations & CBR'
  | 'ATM Maintenance (FLM/SLM)'
  | 'Reconciliation & Disputes'
  | 'KYC & Onboarding'
  | 'Settlement & Payout'

export interface SlaRule {
  id: string
  ruleCode: string
  ruleName: string
  category: SlaCategory
  severity: SlaSeverity
  targetTime: string
  warningThreshold: string
  escalationTier: string
  breachAction: string
  status: 'Active' | 'Inactive'
  description?: string
  lastUpdated?: string
}

const INITIAL_RULES: SlaRule[] = [
  {
    id: 'sla-1',
    ruleCode: 'SLA-CBR-001',
    ruleName: 'Daily CBR Vault Replenishment',
    category: 'Operations & CBR',
    severity: 'Critical',
    targetTime: '4 Hours',
    warningThreshold: '3 Hours (75%)',
    escalationTier: 'Level 1 → Level 2 (Zonal Ops)',
    breachAction: 'Auto-Docket + Alert to CRA Lead',
    status: 'Active',
    description: 'Mandatory physical cash loading and counter verification once terminal reaches 15% threshold balance.',
    lastUpdated: '2026-10-24',
  },
  {
    id: 'sla-2',
    ruleCode: 'SLA-FLM-002',
    ruleName: 'First Line Maintenance (Paper Jam/Sensor)',
    category: 'ATM Maintenance (FLM/SLM)',
    severity: 'High',
    targetTime: '2 Hours',
    warningThreshold: '90 Mins (75%)',
    escalationTier: 'Level 1 → Field Custodian',
    breachAction: 'SMS & App notification to Field Custodian',
    status: 'Active',
    description: 'Minor hardware incidents including receipt printer paper jam, card reader cleaner, and fascia camera alignment.',
    lastUpdated: '2026-10-20',
  },
  {
    id: 'sla-3',
    ruleCode: 'SLA-SLM-003',
    ruleName: 'Second Line Maintenance (Dispenser/Cassette)',
    category: 'ATM Maintenance (FLM/SLM)',
    severity: 'Critical',
    targetTime: '4 Hours',
    warningThreshold: '3 Hours',
    escalationTier: 'Level 2 → OEM / Vendor Engineer',
    breachAction: 'OEM Engineer Dispatch + Penalty ₹500/hr',
    status: 'Active',
    description: 'Major terminal hardware malfunction including cash dispenser motor fault, note validator sensor failure or power supply breakdown.',
    lastUpdated: '2026-10-18',
  },
  {
    id: 'sla-4',
    ruleCode: 'SLA-DISP-004',
    ruleName: 'Customer Failed Cash Dispense Dispute',
    category: 'Reconciliation & Disputes',
    severity: 'High',
    targetTime: '24 Hours',
    warningThreshold: '18 Hours',
    escalationTier: 'Level 1 → Reconciliation Analyst',
    breachAction: 'Provisional Credit Trigger + Bank Escalation',
    status: 'Active',
    description: 'Customer account debited without cash disbursement; switch EJ log check, CBR verification and nodal claim resolution.',
    lastUpdated: '2026-10-22',
  },
  {
    id: 'sla-5',
    ruleCode: 'SLA-CHRG-005',
    ruleName: 'Chargeback & Dispute Arbitration',
    category: 'Reconciliation & Disputes',
    severity: 'Medium',
    targetTime: '48 Hours',
    warningThreshold: '36 Hours',
    escalationTier: 'Level 2 → Nodal Dispute Officer',
    breachAction: 'NPCI / Switch Portal Auto-Filing',
    status: 'Active',
    description: 'Interchange dispute arbitration with acquiring and issuing bank networks following RBI dispute settlement guidelines.',
    lastUpdated: '2026-10-15',
  },
  {
    id: 'sla-6',
    ruleCode: 'SLA-KYC-006',
    ruleName: 'Franchisee KYC Verification',
    category: 'KYC & Onboarding',
    severity: 'Medium',
    targetTime: '24 Hours',
    warningThreshold: '18 Hours',
    escalationTier: 'Level 1 → KYC Verification Team',
    breachAction: 'Alert to Regional Franchise Manager',
    status: 'Active',
    description: 'Document scrutiny of PAN, Aadhaar, bank statements, GST certificate and municipal clearance for new franchise applicants.',
    lastUpdated: '2026-10-19',
  },
  {
    id: 'sla-7',
    ruleCode: 'SLA-SET-007',
    ruleName: 'Nodal Settlement Payout Cycle',
    category: 'Settlement & Payout',
    severity: 'High',
    targetTime: '12 Hours',
    warningThreshold: '9 Hours',
    escalationTier: 'Level 2 → Finance & Treasury Head',
    breachAction: 'Automated Treasury Transfer Notification',
    status: 'Active',
    description: 'Daily gross and net interchange settlement credit to franchisee designated settlement bank accounts.',
    lastUpdated: '2026-10-25',
  },
  {
    id: 'sla-8',
    ruleCode: 'SLA-AUD-008',
    ruleName: 'Quarterly Physical Vault Cash Audit',
    category: 'Operations & CBR',
    severity: 'Low',
    targetTime: '72 Hours',
    warningThreshold: '48 Hours',
    escalationTier: 'Level 3 → Internal Audit Controller',
    breachAction: 'Management Audit Flagging',
    status: 'Inactive',
    description: 'Comprehensive physical vault count verification vs central switch electronic journal logs.',
    lastUpdated: '2026-09-30',
  },
]

export default function SlaRules() {
  const [rules, setRules] = useState<SlaRule[]>(INITIAL_RULES)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [severityFilter, setSeverityFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  // Modals
  const [modalOpen, setModalOpen] = useState(false)
  const [viewRule, setViewRule] = useState<SlaRule | null>(null)
  const [editingRule, setEditingRule] = useState<SlaRule | null>(null)

  // Form State
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState<SlaCategory>('Operations & CBR')
  const [formSeverity, setFormSeverity] = useState<SlaSeverity>('Medium')
  const [formTarget, setFormTarget] = useState('4 Hours')
  const [formThreshold, setFormThreshold] = useState('3 Hours (75%)')
  const [formTier, setFormTier] = useState('Level 1 → Level 2')
  const [formAction, setFormAction] = useState('')
  const [formDesc, setFormDesc] = useState('')

  // Metrics
  const stats = useMemo(() => {
    const active = rules.filter((r) => r.status === 'Active').length
    const critical = rules.filter((r) => r.severity === 'Critical' && r.status === 'Active').length
    const high = rules.filter((r) => r.severity === 'High' && r.status === 'Active').length
    return { active, critical, high, total: rules.length }
  }, [rules])

  // Filtered Rules
  const filtered = useMemo(() => {
    return rules.filter((r) => {
      const q = search.toLowerCase()
      const matchQ =
        !q ||
        r.ruleCode.toLowerCase().includes(q) ||
        r.ruleName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.breachAction.toLowerCase().includes(q)

      const matchCat = categoryFilter === 'All' || r.category === categoryFilter
      const matchSev = severityFilter === 'All' || r.severity === severityFilter
      const matchStat = statusFilter === 'All' || r.status === statusFilter

      return matchQ && matchCat && matchSev && matchStat
    })
  }, [rules, search, categoryFilter, severityFilter, statusFilter])

  // Open Create Modal
  const openCreate = () => {
    setEditingRule(null)
    setFormCode(`SLA-RULE-00${rules.length + 1}`)
    setFormName('')
    setFormCategory('Operations & CBR')
    setFormSeverity('Medium')
    setFormTarget('4 Hours')
    setFormThreshold('3 Hours (75%)')
    setFormTier('Level 1 → Level 2')
    setFormAction('SMS / Email to Operations Lead')
    setFormDesc('')
    setModalOpen(true)
  }

  // Open Edit Modal
  const openEdit = (rule: SlaRule) => {
    setEditingRule(rule)
    setFormCode(rule.ruleCode)
    setFormName(rule.ruleName)
    setFormCategory(rule.category)
    setFormSeverity(rule.severity)
    setFormTarget(rule.targetTime)
    setFormThreshold(rule.warningThreshold)
    setFormTier(rule.escalationTier)
    setFormAction(rule.breachAction)
    setFormDesc(rule.description || '')
    setModalOpen(true)
  }

  // Save Rule
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast('Please enter Rule Name', 'error')
      return
    }

    if (editingRule) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingRule.id
            ? {
              ...r,
              ruleName: formName,
              category: formCategory,
              severity: formSeverity,
              targetTime: formTarget,
              warningThreshold: formThreshold,
              escalationTier: formTier,
              breachAction: formAction,
              description: formDesc,
              lastUpdated: new Date().toISOString().slice(0, 10),
            }
            : r
        )
      )
      toast(`Rule ${editingRule.ruleCode} updated successfully`, 'success')
    } else {
      const newRule: SlaRule = {
        id: `sla-${Date.now()}`,
        ruleCode: formCode,
        ruleName: formName,
        category: formCategory,
        severity: formSeverity,
        targetTime: formTarget,
        warningThreshold: formThreshold,
        escalationTier: formTier,
        breachAction: formAction,
        status: 'Active',
        description: formDesc,
        lastUpdated: new Date().toISOString().slice(0, 10),
      }
      setRules([newRule, ...rules])
      toast(`New SLA rule ${newRule.ruleCode} created`, 'success')
    }
    setModalOpen(false)
  }

  // Toggle Rule Status
  const toggleStatus = (id: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const next = r.status === 'Active' ? 'Inactive' : 'Active'
          toast(`Rule ${r.ruleCode} is now ${next}`, 'info')
          return { ...r, status: next }
        }
        return r
      })
    )
  }

  // Delete Rule
  const handleDelete = (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete rule ${code}?`)) {
      setRules((prev) => prev.filter((r) => r.id !== id))
      toast(`Rule ${code} deleted`, 'info')
    }
  }

  // Export CSV
  const handleExport = () => {
    const headers = [
      '#',
      'Rule Code',
      'Rule Name',
      'Category',
      'Severity',
      'Target Resolution Time',
      'Warning Threshold',
      'Escalation Tier',
      'Breach Action',
      'Status',
    ]
    const rows = filtered.map((r, i) => [
      String(i + 1),
      r.ruleCode,
      r.ruleName,
      r.category,
      r.severity,
      r.targetTime,
      r.warningThreshold,
      r.escalationTier,
      r.breachAction,
      r.status,
    ])
    downloadCsv(`sla-rules-${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast('SLA rules exported successfully', 'success')
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
        <Link to="/setup" className="hover:text-[#0066FF] transition-colors">
          Setup
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">SLA Rules</span>
      </div>

      {/* ── Header Title & Actions ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-sm shrink-0">
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              SLA Rules Configuration
            </h1>
            <p className="mt-0.5 text-[12.5px] text-slate-500">
              Define service level agreements, turnaround targets, warning thresholds and penalty triggers.
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
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-bold transition-all shadow-sm hover:shadow cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New SLA Rule</span>
          </button>
        </div>
      </div>

      {/* ── Top Metric Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-slate-500">Active SLA Rules</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.active}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
              Of {stats.total} total rules
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-slate-500">Critical Priority</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{stats.critical}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">High-impact operational targets</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <ShieldAlert size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-slate-500">High Priority Rules</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.high}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Dispute &amp; payout compliance</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-slate-500">Avg Resolution SLA</div>
            <div className="text-2xl font-bold text-[#0066FF] mt-1">5.2h</div>
            <div className="text-[11px] text-blue-600 mt-0.5 font-medium">98.4% On-time compliance</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* ── Filters & Search ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search rule code, name, action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-[12.5px] outline-none focus:border-[#0066FF]"
            />
          </div>

          {/* Category */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-medium text-slate-700 outline-none focus:border-[#0066FF]"
            >
              <option value="All">All Categories</option>
              <option value="Operations & CBR">Operations &amp; CBR</option>
              <option value="ATM Maintenance (FLM/SLM)">ATM Maintenance (FLM/SLM)</option>
              <option value="Reconciliation & Disputes">Reconciliation &amp; Disputes</option>
              <option value="KYC & Onboarding">KYC &amp; Onboarding</option>
              <option value="Settlement & Payout">Settlement &amp; Payout</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-medium text-slate-700 outline-none focus:border-[#0066FF]"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-medium text-slate-700 outline-none focus:border-[#0066FF]"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
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
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Rule Code</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Rule Name</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Category</th>
                <th className="px-3.5 py-3 font-bold text-center whitespace-nowrap">Severity</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Target Time</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Warning Threshold</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Escalation Tier</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Breach Action</th>
                <th className="px-3.5 py-3 font-bold text-center whitespace-nowrap">Status</th>
                <th className="px-3.5 py-3 font-bold text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((r, i) => (
                <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-3.5 py-3 text-center text-slate-500 font-medium">{i + 1}</td>
                  <td className="px-3.5 py-3 font-mono text-[12px] font-semibold text-[#0066FF] whitespace-nowrap">
                    {r.ruleCode}
                  </td>
                  <td className="px-3.5 py-3 font-medium text-slate-900 max-w-[240px]">
                    <div className="font-semibold text-slate-900 truncate" title={r.ruleName}>
                      {r.ruleName}
                    </div>
                    {r.description && (
                      <div className="text-[11px] text-slate-500 truncate" title={r.description}>
                        {r.description}
                      </div>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">{r.category}</td>
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                        r.severity === 'Critical' && 'bg-red-50 text-red-700 border-red-200',
                        r.severity === 'High' && 'bg-amber-50 text-amber-700 border-amber-200',
                        r.severity === 'Medium' && 'bg-blue-50 text-blue-700 border-blue-200',
                        r.severity === 'Low' && 'bg-slate-100 text-slate-700 border-slate-200'
                      )}
                    >
                      {r.severity}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 font-semibold text-slate-800 whitespace-nowrap">
                    {r.targetTime}
                  </td>
                  <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">{r.warningThreshold}</td>
                  <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">{r.escalationTier}</td>
                  <td className="px-3.5 py-3 text-slate-700 max-w-[200px] truncate" title={r.breachAction}>
                    {r.breachAction}
                  </td>
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleStatus(r.id)}
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer',
                        r.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      )}
                    >
                      {r.status}
                    </button>
                  </td>
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewRule(r)}
                        className="p-1.5 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        title="View Rule Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="p-1.5 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        title="Edit Rule"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id, r.ruleCode)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Delete Rule"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No SLA rules found matching the selected filter.
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
            <strong className="font-semibold text-slate-700">{rules.length}</strong> total SLA rules
          </div>
          <div className="text-[11px] text-slate-400">
            Rules automatically trigger docket alerts upon reaching warning thresholds
          </div>
        </div>
      </div>

      {/* ── View Rule Modal ──────────────────────────────────────────────── */}
      {viewRule && (
        <Modal
          title={`SLA Rule: ${viewRule.ruleCode}`}
          sub={viewRule.ruleName}
          onClose={() => setViewRule(null)}
          width={600}
          footer={
            <div className="flex w-full justify-between items-center">
              <span className="text-[12px] text-slate-500">
                Last modified: {viewRule.lastUpdated || '2026-10-25'}
              </span>
              <button
                type="button"
                onClick={() => setViewRule(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12.5px] font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-[12.5px]">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Category</span>
                <span className="text-[13px] font-semibold text-slate-800">{viewRule.category}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Severity</span>
                <span className="text-[13px] font-semibold text-slate-800">{viewRule.severity}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Target Resolution</span>
                <span className="text-[13px] font-bold text-[#0066FF]">{viewRule.targetTime}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Warning Threshold</span>
                <span className="text-[13px] font-medium text-amber-700">{viewRule.warningThreshold}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Escalation Tier</span>
                <span className="text-[12.5px] font-medium text-slate-800">{viewRule.escalationTier}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Status</span>
                <span className="text-[12.5px] font-semibold text-emerald-700">{viewRule.status}</span>
              </div>
            </div>

            <div>
              <label className="text-[11.5px] font-bold text-slate-700 block mb-1">
                Breach &amp; Penalty Action
              </label>
              <div className="p-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-800">
                {viewRule.breachAction}
              </div>
            </div>

            {viewRule.description && (
              <div>
                <label className="text-[11.5px] font-bold text-slate-700 block mb-1">
                  Description &amp; Operational Scope
                </label>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-700 leading-relaxed">
                  {viewRule.description}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Create / Edit Rule Modal ─────────────────────────────────────── */}
      {modalOpen && (
        <Modal
          title={editingRule ? `Edit Rule: ${editingRule.ruleCode}` : 'Create New SLA Rule'}
          sub="Configure resolution targets, warning thresholds, escalation routing and breach actions."
          onClose={() => setModalOpen(false)}
          width={640}
          footer={
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-semibold transition-colors shadow-2xs"
              >
                {editingRule ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSave} className="space-y-3.5 text-[12.5px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Rule Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] font-mono outline-none focus:border-[#0066FF]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Rule Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily CBR Cash Replenishment"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as SlaCategory)}
                  className="h-9 w-full rounded border border-slate-200 bg-white px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                >
                  <option value="Operations & CBR">Operations &amp; CBR</option>
                  <option value="ATM Maintenance (FLM/SLM)">ATM Maintenance (FLM/SLM)</option>
                  <option value="Reconciliation & Disputes">Reconciliation &amp; Disputes</option>
                  <option value="KYC & Onboarding">KYC &amp; Onboarding</option>
                  <option value="Settlement & Payout">Settlement &amp; Payout</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Severity Level
                </label>
                <select
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value as SlaSeverity)}
                  className="h-9 w-full rounded border border-slate-200 bg-white px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                >
                  <option value="Critical">Critical (Immediate breach action)</option>
                  <option value="High">High (Urgent incident)</option>
                  <option value="Medium">Medium (Standard SLA)</option>
                  <option value="Low">Low (Informational SLA)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Target Resolution Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 4 Hours, 24 Hours"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Warning Threshold
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3 Hours (75%)"
                  value={formThreshold}
                  onChange={(e) => setFormThreshold(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Escalation Tier Routing
                </label>
                <input
                  type="text"
                  placeholder="e.g. Level 1 → Level 2 (Zonal Lead)"
                  value={formTier}
                  onChange={(e) => setFormTier(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Breach / Penalty Action
                </label>
                <input
                  type="text"
                  placeholder="e.g. Auto-Docket + Fine ₹500/day"
                  value={formAction}
                  onChange={(e) => setFormAction(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Description / Operational Notes
              </label>
              <textarea
                rows={3}
                placeholder="Operational instructions, scope and trigger conditions..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full rounded border border-slate-200 p-2.5 text-[12.5px] outline-none focus:border-[#0066FF] resize-none"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
