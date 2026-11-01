import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  Download,
  Edit2,
  Eye,
  GitFork,
  Home,
  Mail,
  Network,
  Phone,
  Plus,
  Search,
  Table2,
  Trash2,
  User,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'

export type EscalationLevel = 'Level 1' | 'Level 2' | 'Level 3' | 'Level 4'

export interface EscalationNode {
  id: string
  level: EscalationLevel
  levelTitle: string
  category: string
  role: string
  contactName: string
  email: string
  phone: string
  triggerTime: string
  channels: string[]
  status: 'Active' | 'Under Review'
  backupContact?: string
}

const INITIAL_HIERARCHY: EscalationNode[] = [
  // Level 1: Field Support & First Response
  {
    id: 'esc-1',
    level: 'Level 1',
    levelTitle: 'First Response / Field Ops',
    category: 'Cash Exhaustion & CBR',
    role: 'CRA Field Custodian',
    contactName: 'Paras Dubey',
    email: 'paras.dubey@dexter.in',
    phone: '+91 98250 11200',
    triggerTime: 'Immediate upon ticket raise',
    channels: ['SMS', 'In-App', 'Email'],
    status: 'Active',
    backupContact: 'Rakesh Verma (+91 98250 11205)',
  },
  {
    id: 'esc-2',
    level: 'Level 1',
    levelTitle: 'First Response / Field Ops',
    category: 'Terminal Hardware (FLM/SLM)',
    role: 'Zonal Technical Engineer',
    contactName: 'Sunil Mehta',
    email: 'sunil.mehta@dexter.in',
    phone: '+91 98220 44102',
    triggerTime: 'Immediate (Within 15 mins)',
    channels: ['SMS', 'In-App'],
    status: 'Active',
    backupContact: 'Amit Sharma (+91 98220 44108)',
  },
  {
    id: 'esc-3',
    level: 'Level 1',
    levelTitle: 'First Response / Field Ops',
    category: 'Customer Dispute / Failed TXN',
    role: 'Helpdesk & Dispute Analyst',
    contactName: 'Meera Iyer',
    email: 'meera.iyer@dexter.in',
    phone: '+91 98401 22390',
    triggerTime: 'Immediate upon docket generation',
    channels: ['Email', 'In-App'],
    status: 'Active',
    backupContact: 'Kavita Joshi (+91 98401 22395)',
  },

  // Level 2: Zonal / Lead Operations
  {
    id: 'esc-4',
    level: 'Level 2',
    levelTitle: 'Zonal / Area Management',
    category: 'Cash Exhaustion & CBR',
    role: 'Zonal Operations Manager',
    contactName: 'Ranjeet Pal',
    email: 'ranjeet.pal@dexter.in',
    phone: '+91 98260 77114',
    triggerTime: 'Breached 2 Hours SLA',
    channels: ['SMS', 'Email', 'WhatsApp'],
    status: 'Active',
    backupContact: 'Pramod Kumar (+91 98260 77120)',
  },
  {
    id: 'esc-5',
    level: 'Level 2',
    levelTitle: 'Zonal / Area Management',
    category: 'Terminal Hardware (FLM/SLM)',
    role: 'OEM Vendor Account Manager',
    contactName: 'Vikramaditya Rao',
    email: 'vikram.rao@oem-service.com',
    phone: '+91 99100 88231',
    triggerTime: 'Breached 4 Hours SLM SLA',
    channels: ['Email', 'Phone Alert'],
    status: 'Active',
    backupContact: 'Sandeep Roy (+91 99100 88240)',
  },
  {
    id: 'esc-6',
    level: 'Level 2',
    levelTitle: 'Zonal / Area Management',
    category: 'Franchisee Settlement & Payout',
    role: 'Treasury & Nodal Sweep Lead',
    contactName: 'Deepak Saxena',
    email: 'deepak.saxena@dexter.in',
    phone: '+91 97110 55410',
    triggerTime: 'Breached 6 Hours settlement SLA',
    channels: ['Email', 'SMS'],
    status: 'Active',
    backupContact: 'Sanjay Varma (+91 97110 55420)',
  },

  // Level 3: Regional & Nodal Leadership
  {
    id: 'esc-7',
    level: 'Level 3',
    levelTitle: 'Regional & Nodal Leadership',
    category: 'Customer Dispute / Failed TXN',
    role: 'Chief Nodal Dispute Officer',
    contactName: 'Ananya Sen',
    email: 'ananya.sen@dexter.in',
    phone: '+91 98190 33451',
    triggerTime: 'Breached 24 Hours Dispute SLA',
    channels: ['Email', 'Formal Docket'],
    status: 'Active',
    backupContact: 'Harish Nair (+91 98190 33460)',
  },
  {
    id: 'esc-8',
    level: 'Level 3',
    levelTitle: 'Regional & Nodal Leadership',
    category: 'Cash Exhaustion & CBR',
    role: 'Head of ATM Cash Balancing',
    contactName: 'Col. Arvind Rathore',
    email: 'arvind.rathore@dexter.in',
    phone: '+91 98330 66201',
    triggerTime: 'Breached 6 Hours CBR SLA',
    channels: ['Email', 'Phone Direct', 'SMS'],
    status: 'Active',
    backupContact: 'Manoj Pillai (+91 98330 66210)',
  },

  // Level 4: Executive & Board Level
  {
    id: 'esc-9',
    level: 'Level 4',
    levelTitle: 'Executive / Regulatory Escalation',
    category: 'Critical Network & Security Breach',
    role: 'Vice President — Operations',
    contactName: 'Dr. Rajiv Kapoor',
    email: 'rajiv.kapoor@dexter.in',
    phone: '+91 98200 99881',
    triggerTime: 'Immediate on Critical/Security Breach',
    channels: ['Direct Call', 'Priority Email', 'SMS'],
    status: 'Active',
    backupContact: 'COO Office (+91 98200 99890)',
  },
]

export default function EscalationHierarchy() {
  const [nodes, setNodes] = useState<EscalationNode[]>(INITIAL_HIERARCHY)
  const [viewMode, setViewMode] = useState<'table' | 'visual'>('table')
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')

  // Modals
  const [modalOpen, setModalOpen] = useState(false)
  const [viewNode, setViewNode] = useState<EscalationNode | null>(null)
  const [editingNode, setEditingNode] = useState<EscalationNode | null>(null)

  // Form State
  const [formLevel, setFormLevel] = useState<EscalationLevel>('Level 1')
  const [formCategory, setFormCategory] = useState('Cash Exhaustion & CBR')
  const [formRole, setFormRole] = useState('')
  const [formContact, setFormContact] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formTrigger, setFormTrigger] = useState('Immediate')
  const [formBackup, setFormBackup] = useState('')

  // Metrics
  const stats = useMemo(() => {
    return {
      total: nodes.length,
      l1: nodes.filter((n) => n.level === 'Level 1').length,
      l2: nodes.filter((n) => n.level === 'Level 2').length,
      l3: nodes.filter((n) => n.level === 'Level 3').length,
      l4: nodes.filter((n) => n.level === 'Level 4').length,
    }
  }, [nodes])

  // Filtered
  const filtered = useMemo(() => {
    return nodes.filter((n) => {
      const q = search.toLowerCase()
      const matchQ =
        !q ||
        n.contactName.toLowerCase().includes(q) ||
        n.role.toLowerCase().includes(q) ||
        n.email.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)

      const matchL = levelFilter === 'All' || n.level === levelFilter
      const matchC = categoryFilter === 'All' || n.category === categoryFilter

      return matchQ && matchL && matchC
    })
  }, [nodes, search, levelFilter, categoryFilter])

  // Open Create
  const openCreate = () => {
    setEditingNode(null)
    setFormLevel('Level 1')
    setFormCategory('Cash Exhaustion & CBR')
    setFormRole('')
    setFormContact('')
    setFormEmail('')
    setFormPhone('')
    setFormTrigger('Immediate upon breach')
    setFormBackup('')
    setModalOpen(true)
  }

  // Open Edit
  const openEdit = (node: EscalationNode) => {
    setEditingNode(node)
    setFormLevel(node.level)
    setFormCategory(node.category)
    setFormRole(node.role)
    setFormContact(node.contactName)
    setFormEmail(node.email)
    setFormPhone(node.phone)
    setFormTrigger(node.triggerTime)
    setFormBackup(node.backupContact || '')
    setModalOpen(true)
  }

  // Save Node
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formContact.trim() || !formRole.trim()) {
      toast('Please enter Contact Name and Role', 'error')
      return
    }

    const levelTitle =
      formLevel === 'Level 1'
        ? 'First Response / Field Ops'
        : formLevel === 'Level 2'
          ? 'Zonal / Area Management'
          : formLevel === 'Level 3'
            ? 'Regional & Nodal Leadership'
            : 'Executive / Regulatory Escalation'

    if (editingNode) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === editingNode.id
            ? {
              ...n,
              level: formLevel,
              levelTitle,
              category: formCategory,
              role: formRole,
              contactName: formContact,
              email: formEmail,
              phone: formPhone,
              triggerTime: formTrigger,
              backupContact: formBackup,
            }
            : n
        )
      )
      toast(`Escalation contact ${formContact} updated`, 'success')
    } else {
      const newNode: EscalationNode = {
        id: `esc-${Date.now()}`,
        level: formLevel,
        levelTitle,
        category: formCategory,
        role: formRole,
        contactName: formContact,
        email: formEmail,
        phone: formPhone,
        triggerTime: formTrigger,
        channels: ['Email', 'SMS'],
        status: 'Active',
        backupContact: formBackup,
      }
      setNodes([...nodes, newNode])
      toast(`Added ${formContact} to ${formLevel}`, 'success')
    }
    setModalOpen(false)
  }

  // Delete Node
  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remove ${name} from escalation matrix?`)) {
      setNodes((prev) => prev.filter((n) => n.id !== id))
      toast(`Contact ${name} removed`, 'info')
    }
  }

  // Export CSV
  const handleExport = () => {
    const headers = [
      '#',
      'Level',
      'Level Title',
      'Incident Category',
      'Role / Designation',
      'Contact Name',
      'Email',
      'Phone',
      'Trigger Condition',
      'Status',
    ]
    const rows = filtered.map((n, i) => [
      String(i + 1),
      n.level,
      n.levelTitle,
      n.category,
      n.role,
      n.contactName,
      n.email,
      n.phone,
      n.triggerTime,
      n.status,
    ])
    downloadCsv(`escalation-hierarchy-${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast('Escalation hierarchy exported successfully', 'success')
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
        <Link to="/setup/escalation-matrix" className="hover:text-[#0066FF] transition-colors">
          Escalation Matrix
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Hierarchy</span>
      </div>

      {/* ── Header Title & Actions ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-sm shrink-0">
            <GitFork size={20} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              Escalation Matrix Hierarchy
            </h1>
            <p className="mt-0.5 text-[12.5px] text-slate-500">
              Configure multi-level escalation hierarchy, incident routing paths, and key operational contacts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors',
                viewMode === 'table' ? 'bg-[#0066FF] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Table2 size={13} />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors',
                viewMode === 'visual' ? 'bg-[#0066FF] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Network size={13} />
              <span>Flow Tree</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <Download size={15} />
            <span>Export</span>
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-bold transition-all shadow-sm hover:shadow cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Level 1
            </span>
            <span className="text-[12px] text-slate-500 font-medium">Field Support</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.l1} Officers</div>
          <div className="text-[11px] text-slate-500 mt-1">CRA, Custodians &amp; Engineers</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
              Level 2
            </span>
            <span className="text-[12px] text-slate-500 font-medium">Zonal Management</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.l2} Managers</div>
          <div className="text-[11px] text-slate-500 mt-1">Area Ops &amp; OEM Vendor Leads</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              Level 3
            </span>
            <span className="text-[12px] text-slate-500 font-medium">Regional Leadership</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.l3} Heads</div>
          <div className="text-[11px] text-slate-500 mt-1">Nodal Officers &amp; Treasury Leads</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded">
              Level 4
            </span>
            <span className="text-[12px] text-slate-500 font-medium">Executive Tier</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.l4} Executives</div>
          <div className="text-[11px] text-slate-500 mt-1">Vice President &amp; Directors</div>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search contact, role, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-[12.5px] outline-none focus:border-[#0066FF]"
            />
          </div>

          <div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-medium text-slate-700 outline-none focus:border-[#0066FF]"
            >
              <option value="All">All Escalation Levels</option>
              <option value="Level 1">Level 1 (Field Support)</option>
              <option value="Level 2">Level 2 (Zonal Management)</option>
              <option value="Level 3">Level 3 (Regional & Nodal)</option>
              <option value="Level 4">Level 4 (Executive)</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-medium text-slate-700 outline-none focus:border-[#0066FF]"
            >
              <option value="All">All Incident Categories</option>
              <option value="Cash Exhaustion & CBR">Cash Exhaustion &amp; CBR</option>
              <option value="Terminal Hardware (FLM/SLM)">Terminal Hardware (FLM/SLM)</option>
              <option value="Customer Dispute / Failed TXN">Customer Dispute / Failed TXN</option>
              <option value="Franchisee Settlement & Payout">Franchisee Settlement &amp; Payout</option>
              <option value="Critical Network & Security Breach">Critical Network &amp; Security</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table View ────────────────────────────────────────────────────── */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead className="bg-[#CFE8FC] text-[#2C5282] font-semibold text-[12px] tracking-wide border-b border-sky-200">
                <tr>
                  <th className="px-3.5 py-3 text-center w-12 font-bold">#</th>
                  <th className="px-3.5 py-3 font-bold whitespace-nowrap">Tier / Level</th>
                  <th className="px-3.5 py-3 font-bold whitespace-nowrap">Incident Category</th>
                  <th className="px-3.5 py-3 font-bold whitespace-nowrap">Role / Designation</th>
                  <th className="px-3.5 py-3 font-bold whitespace-nowrap">Contact Person</th>
                  <th className="px-3.5 py-3 font-bold whitespace-nowrap">Email ID</th>
                  <th className="px-3.5 py-3 font-bold whitespace-nowrap">Phone Number</th>
                  <th className="px-3.5 py-3 font-bold whitespace-nowrap">Trigger Condition</th>
                  <th className="px-3.5 py-3 font-bold text-center whitespace-nowrap">Status</th>
                  <th className="px-3.5 py-3 font-bold text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((n, i) => (
                  <tr key={n.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-3.5 py-3 text-center text-slate-500 font-medium">{i + 1}</td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider',
                          n.level === 'Level 1' && 'bg-blue-50 text-blue-700 border border-blue-200',
                          n.level === 'Level 2' && 'bg-purple-50 text-purple-700 border border-purple-200',
                          n.level === 'Level 3' && 'bg-amber-50 text-amber-700 border border-amber-200',
                          n.level === 'Level 4' && 'bg-red-50 text-red-700 border border-red-200'
                        )}
                      >
                        {n.level}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {n.category}
                    </td>
                    <td className="px-3.5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {n.role}
                    </td>
                    <td className="px-3.5 py-3 font-medium text-[#0066FF] whitespace-nowrap">
                      {n.contactName}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[11.5px] text-slate-600 whitespace-nowrap">
                      {n.email}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[11.5px] text-slate-700 whitespace-nowrap">
                      {n.phone}
                    </td>
                    <td className="px-3.5 py-3 text-slate-600 max-w-[220px] truncate" title={n.triggerTime}>
                      {n.triggerTime}
                    </td>
                    <td className="px-3.5 py-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {n.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewNode(n)}
                          className="p-1.5 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="View Contact Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(n)}
                          className="p-1.5 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Edit Contact"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(n.id, n.contactName)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Delete Contact"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No escalation contacts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Visual Flow Tree View ───────────────────────────────────────── */
        <div className="space-y-4">
          {(['Level 1', 'Level 2', 'Level 3', 'Level 4'] as EscalationLevel[]).map((lvl) => {
            const nodesInLvl = nodes.filter((n) => n.level === lvl)
            const color =
              lvl === 'Level 1'
                ? 'border-blue-200 bg-blue-50/20'
                : lvl === 'Level 2'
                  ? 'border-purple-200 bg-purple-50/20'
                  : lvl === 'Level 3'
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-red-200 bg-red-50/20'

            return (
              <div key={lvl} className={cn('rounded-xl border p-5 bg-white shadow-2xs', color)}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-[14px] text-slate-900">{lvl}</span>
                    <span className="text-[12px] text-slate-500">
                      {lvl === 'Level 1' && '— First Response & Field Investigation'}
                      {lvl === 'Level 2' && '— Zonal Management & Technical Operations'}
                      {lvl === 'Level 3' && '— Regional Governance & Nodal Arbitration'}
                      {lvl === 'Level 4' && '— Executive Office & Board Intervention'}
                    </span>
                  </div>
                  <span className="text-[11.5px] font-semibold text-slate-500">
                    {nodesInLvl.length} Personnel Assigned
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {nodesInLvl.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-lg border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-bold text-[#0066FF] uppercase">
                            {n.category}
                          </div>
                          <div className="text-[13.5px] font-bold text-slate-900 mt-0.5">
                            {n.role}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700">
                          {n.triggerTime}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-[12px]">
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <User size={13} className="text-slate-400" />
                          <span>{n.contactName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                          <Mail size={12} className="text-slate-400" />
                          <span>{n.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                          <Phone size={12} className="text-slate-400" />
                          <span>{n.phone}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── View Modal ────────────────────────────────────────────────────── */}
      {viewNode && (
        <Modal
          title={`Escalation Contact — ${viewNode.contactName}`}
          sub={`${viewNode.level} · ${viewNode.role}`}
          onClose={() => setViewNode(null)}
          width={560}
          footer={
            <div className="flex w-full justify-end">
              <button
                type="button"
                onClick={() => setViewNode(null)}
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
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Level</span>
                <span className="text-[13px] font-bold text-[#0066FF]">{viewNode.level}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Incident Category</span>
                <span className="text-[13px] font-semibold text-slate-800">{viewNode.category}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Email Address</span>
                <span className="font-mono text-[12px] text-slate-700">{viewNode.email}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Phone Number</span>
                <span className="font-mono text-[12px] text-slate-700">{viewNode.phone}</span>
              </div>
            </div>

            <div>
              <label className="text-[11.5px] font-bold text-slate-700 block mb-1">
                Trigger SLA Threshold
              </label>
              <div className="p-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-800">
                {viewNode.triggerTime}
              </div>
            </div>

            {viewNode.backupContact && (
              <div>
                <label className="text-[11.5px] font-bold text-slate-700 block mb-1">
                  Designated Alternate / Backup Contact
                </label>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-700">
                  {viewNode.backupContact}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      {modalOpen && (
        <Modal
          title={editingNode ? `Edit Escalation Contact` : 'Add Escalation Contact'}
          sub="Assign personnel to escalation tiers for automated incident routing."
          onClose={() => setModalOpen(false)}
          width={600}
          footer={
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-semibold shadow-2xs"
              >
                {editingNode ? 'Save Changes' : 'Add Contact'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSave} className="space-y-3.5 text-[12.5px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tier / Escalation Level
                </label>
                <select
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value as EscalationLevel)}
                  className="h-9 w-full rounded border border-slate-200 bg-white px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                >
                  <option value="Level 1">Level 1 (Field Support)</option>
                  <option value="Level 2">Level 2 (Zonal Management)</option>
                  <option value="Level 3">Level 3 (Regional & Nodal)</option>
                  <option value="Level 4">Level 4 (Executive Tier)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Incident Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 bg-white px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                >
                  <option value="Cash Exhaustion & CBR">Cash Exhaustion &amp; CBR</option>
                  <option value="Terminal Hardware (FLM/SLM)">Terminal Hardware (FLM/SLM)</option>
                  <option value="Customer Dispute / Failed TXN">Customer Dispute / Failed TXN</option>
                  <option value="Franchisee Settlement & Payout">Franchisee Settlement &amp; Payout</option>
                  <option value="Critical Network & Security Breach">Critical Network &amp; Security</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Role / Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zonal Technical Engineer"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Contact Officer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sunil Mehta"
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Official Email ID
                </label>
                <input
                  type="email"
                  placeholder="e.g. sunil.mehta@dexter.in"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] font-mono outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mobile / Emergency Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98220 44102"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] font-mono outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Trigger Condition
                </label>
                <input
                  type="text"
                  placeholder="e.g. Breached 2 Hours SLA"
                  value={formTrigger}
                  onChange={(e) => setFormTrigger(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Alternate / Backup Contact
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amit Sharma (+91 98220 44108)"
                  value={formBackup}
                  onChange={(e) => setFormBackup(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
