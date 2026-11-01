import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  Home,
  MapPin,
  Network,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'

export type OrgUnitType =
  | 'Corporate Headquarters'
  | 'Zonal Office'
  | 'Regional Division'
  | 'Functional Department'

export interface OrgUnit {
  id: string
  code: string
  name: string
  type: OrgUnitType
  parentUnit: string
  headOfUnit: string
  location: string
  staffCount: number
  managedAtms: number
  status: 'Active' | 'Inactive'
  contactEmail?: string
  contactPhone?: string
}

const INITIAL_UNITS: OrgUnit[] = [
  {
    id: 'org-1',
    code: 'ORG-HQ-001',
    name: 'Corporate Headquarters',
    type: 'Corporate Headquarters',
    parentUnit: 'Dexter India Ltd',
    headOfUnit: 'Dr. Rajiv Kapoor (Managing Director)',
    location: 'Mumbai (BKC)',
    staffCount: 52,
    managedAtms: 1250,
    status: 'Active',
    contactEmail: 'hq@dexter.in',
    contactPhone: '+91 22 6120 4000',
  },
  {
    id: 'org-2',
    code: 'ORG-WZ-002',
    name: 'West Zone Operations Hub',
    type: 'Zonal Office',
    parentUnit: 'Corporate Headquarters',
    headOfUnit: 'Ranjeet Pal (Zonal VP)',
    location: 'Ahmedabad (SG Highway)',
    staffCount: 38,
    managedAtms: 450,
    status: 'Active',
    contactEmail: 'west.zone@dexter.in',
    contactPhone: '+91 79 4410 8800',
  },
  {
    id: 'org-3',
    code: 'ORG-NZ-003',
    name: 'North Zone Operations Hub',
    type: 'Zonal Office',
    parentUnit: 'Corporate Headquarters',
    headOfUnit: 'Col. Arvind Rathore (Zonal VP)',
    location: 'New Delhi (Connaught Place)',
    staffCount: 34,
    managedAtms: 380,
    status: 'Active',
    contactEmail: 'north.zone@dexter.in',
    contactPhone: '+91 11 2341 9900',
  },
  {
    id: 'org-4',
    code: 'ORG-SZ-004',
    name: 'South Zone Operations Hub',
    type: 'Zonal Office',
    parentUnit: 'Corporate Headquarters',
    headOfUnit: 'Ananya Sen (Zonal Director)',
    location: 'Bengaluru (MG Road)',
    staffCount: 28,
    managedAtms: 290,
    status: 'Active',
    contactEmail: 'south.zone@dexter.in',
    contactPhone: '+91 80 4112 5500',
  },
  {
    id: 'org-5',
    code: 'ORG-CBR-005',
    name: 'CBR & Cash Logistics Division',
    type: 'Functional Department',
    parentUnit: 'West Zone Operations Hub',
    headOfUnit: 'Paras Dubey (Lead Ops)',
    location: 'Pune (Shivaji Nagar)',
    staffCount: 24,
    managedAtms: 320,
    status: 'Active',
    contactEmail: 'cbr.desk@dexter.in',
    contactPhone: '+91 20 2553 1100',
  },
  {
    id: 'org-6',
    code: 'ORG-FIN-006',
    name: 'Nodal Finance & Settlement Desk',
    type: 'Functional Department',
    parentUnit: 'Corporate Headquarters',
    headOfUnit: 'Deepak Saxena (Treasury Head)',
    location: 'Mumbai (BKC)',
    staffCount: 16,
    managedAtms: 1250,
    status: 'Active',
    contactEmail: 'settlement@dexter.in',
    contactPhone: '+91 22 6120 4015',
  },
  {
    id: 'org-7',
    code: 'ORG-DISP-007',
    name: 'Disputes & Customer Reconciliations',
    type: 'Functional Department',
    parentUnit: 'Corporate Headquarters',
    headOfUnit: 'Meera Iyer (Dispute Nodal Officer)',
    location: 'Mumbai (Andheri East)',
    staffCount: 14,
    managedAtms: 1250,
    status: 'Active',
    contactEmail: 'disputes@dexter.in',
    contactPhone: '+91 22 6120 4030',
  },
  {
    id: 'org-8',
    code: 'ORG-MHR-008',
    name: 'Maharashtra Regional Division',
    type: 'Regional Division',
    parentUnit: 'West Zone Operations Hub',
    headOfUnit: 'Rameshwar Kulkarni (Area Head)',
    location: 'Nagpur (Civil Lines)',
    staffCount: 18,
    managedAtms: 190,
    status: 'Active',
    contactEmail: 'mh.ops@dexter.in',
    contactPhone: '+91 712 256 7800',
  },
  {
    id: 'org-9',
    code: 'ORG-GJR-009',
    name: 'Gujarat Regional Division',
    type: 'Regional Division',
    parentUnit: 'West Zone Operations Hub',
    headOfUnit: 'Bhavin Patel (Regional Manager)',
    location: 'Surat (Ring Road)',
    staffCount: 15,
    managedAtms: 160,
    status: 'Active',
    contactEmail: 'gj.ops@dexter.in',
    contactPhone: '+91 261 245 9900',
  },
  {
    id: 'org-10',
    code: 'ORG-UPR-010',
    name: 'Uttar Pradesh Regional Division',
    type: 'Regional Division',
    parentUnit: 'North Zone Operations Hub',
    headOfUnit: 'Sunil Mehta (Regional Head)',
    location: 'Lucknow (Hazratganj)',
    staffCount: 19,
    managedAtms: 220,
    status: 'Active',
    contactEmail: 'up.ops@dexter.in',
    contactPhone: '+91 522 405 1200',
  },
]

export default function OrgUnitList() {
  const [units, setUnits] = useState<OrgUnit[]>(INITIAL_UNITS)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  // Modals
  const [modalOpen, setModalOpen] = useState(false)
  const [viewUnit, setViewUnit] = useState<OrgUnit | null>(null)
  const [editingUnit, setEditingUnit] = useState<OrgUnit | null>(null)

  // Form State
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<OrgUnitType>('Regional Division')
  const [formParent, setFormParent] = useState('Corporate Headquarters')
  const [formHead, setFormHead] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formStaff, setFormStaff] = useState<number>(10)
  const [formAtms, setFormAtms] = useState<number>(100)
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')

  // Metrics
  const stats = useMemo(() => {
    return {
      total: units.length,
      zones: units.filter((u) => u.type === 'Zonal Office' || u.type === 'Corporate Headquarters').length,
      departments: units.filter((u) => u.type === 'Functional Department').length,
      totalStaff: units.reduce((acc, u) => acc + u.staffCount, 0),
    }
  }, [units])

  // Filtered
  const filtered = useMemo(() => {
    return units.filter((u) => {
      const q = search.toLowerCase()
      const matchQ =
        !q ||
        u.code.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.headOfUnit.toLowerCase().includes(q) ||
        u.location.toLowerCase().includes(q)

      const matchT = typeFilter === 'All' || u.type === typeFilter
      const matchS = statusFilter === 'All' || u.status === statusFilter

      return matchQ && matchT && matchS
    })
  }, [units, search, typeFilter, statusFilter])

  // Open Create
  const openCreate = () => {
    setEditingUnit(null)
    setFormCode(`ORG-DIV-0${units.length + 1}`)
    setFormName('')
    setFormType('Regional Division')
    setFormParent('Corporate Headquarters')
    setFormHead('')
    setFormLocation('')
    setFormStaff(12)
    setFormAtms(100)
    setFormEmail('')
    setFormPhone('')
    setModalOpen(true)
  }

  // Open Edit
  const openEdit = (unit: OrgUnit) => {
    setEditingUnit(unit)
    setFormCode(unit.code)
    setFormName(unit.name)
    setFormType(unit.type)
    setFormParent(unit.parentUnit)
    setFormHead(unit.headOfUnit)
    setFormLocation(unit.location)
    setFormStaff(unit.staffCount)
    setFormAtms(unit.managedAtms)
    setFormEmail(unit.contactEmail || '')
    setFormPhone(unit.contactPhone || '')
    setModalOpen(true)
  }

  // Save Unit
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formHead.trim()) {
      toast('Please enter Unit Name and Head of Unit', 'error')
      return
    }

    if (editingUnit) {
      setUnits((prev) =>
        prev.map((u) =>
          u.id === editingUnit.id
            ? {
              ...u,
              name: formName,
              type: formType,
              parentUnit: formParent,
              headOfUnit: formHead,
              location: formLocation,
              staffCount: Number(formStaff),
              managedAtms: Number(formAtms),
              contactEmail: formEmail,
              contactPhone: formPhone,
            }
            : u
        )
      )
      toast(`Unit ${formName} updated successfully`, 'success')
    } else {
      const newUnit: OrgUnit = {
        id: `org-${Date.now()}`,
        code: formCode,
        name: formName,
        type: formType,
        parentUnit: formParent,
        headOfUnit: formHead,
        location: formLocation,
        staffCount: Number(formStaff),
        managedAtms: Number(formAtms),
        status: 'Active',
        contactEmail: formEmail,
        contactPhone: formPhone,
      }
      setUnits([...units, newUnit])
      toast(`New unit ${newUnit.name} added`, 'success')
    }
    setModalOpen(false)
  }

  // Delete Unit
  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove unit ${name}?`)) {
      setUnits((prev) => prev.filter((u) => u.id !== id))
      toast(`Unit ${name} deleted`, 'info')
    }
  }

  // Export CSV
  const handleExport = () => {
    const headers = [
      '#',
      'Unit Code',
      'Unit Name',
      'Unit Type',
      'Parent Unit',
      'Head of Unit',
      'Location / City',
      'Associated Staff',
      'Managed ATMs',
      'Status',
    ]
    const rows = filtered.map((u, i) => [
      String(i + 1),
      u.code,
      u.name,
      u.type,
      u.parentUnit,
      u.headOfUnit,
      u.location,
      String(u.staffCount),
      String(u.managedAtms),
      u.status,
    ])
    downloadCsv(`organization-units-${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast('Organization units exported successfully', 'success')
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
        <Link to="/setup/business-settings" className="hover:text-[#0066FF] transition-colors">
          Business Settings
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Organization Unit</span>
      </div>

      {/* ── Header Title & Actions ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-sm shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              Organization Units
            </h1>
            <p className="mt-0.5 text-[12.5px] text-slate-500">
              Manage corporate departments, branch divisions, regional hubs, and operational hierarchy.
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
            <span>New Organization Unit</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-slate-500">Total Business Units</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">All active &amp; mapped</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-slate-500">Zonal &amp; Regional Hubs</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">{stats.zones}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across India territories</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <MapPin size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-slate-500">Functional Departments</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.departments}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">CBR, Finance, IT &amp; Disputes</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Network size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-slate-500">Associated Staff</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.totalStaff}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">Active employees</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search code, name, lead, city..."
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
              <option value="All">All Unit Types</option>
              <option value="Corporate Headquarters">Corporate Headquarters</option>
              <option value="Zonal Office">Zonal Office</option>
              <option value="Regional Division">Regional Division</option>
              <option value="Functional Department">Functional Department</option>
            </select>
          </div>

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
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Unit Code</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Unit Name</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Unit Type</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Parent Unit</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Head of Unit / Lead</th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Location / City</th>
                <th className="px-3.5 py-3 font-bold text-center whitespace-nowrap">Staff Count</th>
                <th className="px-3.5 py-3 font-bold text-center whitespace-nowrap">Managed ATMs</th>
                <th className="px-3.5 py-3 font-bold text-center whitespace-nowrap">Status</th>
                <th className="px-3.5 py-3 font-bold text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((u, i) => (
                <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-3.5 py-3 text-center text-slate-500 font-medium">{i + 1}</td>
                  <td className="px-3.5 py-3 font-mono text-[12px] font-semibold text-[#0066FF] whitespace-nowrap">
                    {u.code}
                  </td>
                  <td className="px-3.5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                    {u.name}
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border',
                        u.type === 'Corporate Headquarters' && 'bg-purple-50 text-purple-700 border-purple-200 font-semibold',
                        u.type === 'Zonal Office' && 'bg-blue-50 text-blue-700 border-blue-200 font-semibold',
                        u.type === 'Regional Division' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        u.type === 'Functional Department' && 'bg-amber-50 text-amber-700 border-amber-200'
                      )}
                    >
                      {u.type}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">{u.parentUnit}</td>
                  <td className="px-3.5 py-3 font-medium text-slate-800 whitespace-nowrap max-w-[220px] truncate" title={u.headOfUnit}>
                    {u.headOfUnit}
                  </td>
                  <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">{u.location}</td>
                  <td className="px-3.5 py-3 text-center font-semibold text-slate-800 whitespace-nowrap">
                    {u.staffCount} Staff
                  </td>
                  <td className="px-3.5 py-3 text-center font-mono font-medium text-slate-700 whitespace-nowrap">
                    {u.managedAtms.toLocaleString('en-IN')}
                  </td>
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {u.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewUnit(u)}
                        className="p-1.5 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        title="View Unit Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="p-1.5 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        title="Edit Unit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id, u.name)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Delete Unit"
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
                    No organization units found matching your search.
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
            <strong className="font-semibold text-slate-700">{units.length}</strong> business units
          </div>
          <div className="text-[11px] text-slate-400">
            Hierarchy governs employee access levels, territory assignments and reporting matrices
          </div>
        </div>
      </div>

      {/* ── View Modal ────────────────────────────────────────────────────── */}
      {viewUnit && (
        <Modal
          title={`Organization Unit — ${viewUnit.name}`}
          sub={`${viewUnit.code} · ${viewUnit.type}`}
          onClose={() => setViewUnit(null)}
          width={600}
          footer={
            <div className="flex w-full justify-end">
              <button
                type="button"
                onClick={() => setViewUnit(null)}
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
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Head of Unit</span>
                <span className="text-[13px] font-semibold text-slate-900">{viewUnit.headOfUnit}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Parent Organization</span>
                <span className="text-[13px] font-semibold text-slate-800">{viewUnit.parentUnit}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Operating Location</span>
                <span className="text-[12.5px] font-medium text-slate-700">{viewUnit.location}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Managed Terminals</span>
                <span className="font-mono text-[12.5px] font-bold text-[#0066FF]">
                  {viewUnit.managedAtms.toLocaleString('en-IN')} ATMs
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Official Email</span>
                <span className="font-mono text-[12px] text-slate-700">{viewUnit.contactEmail || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Official Phone</span>
                <span className="font-mono text-[12px] text-slate-700">{viewUnit.contactPhone || '—'}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      {modalOpen && (
        <Modal
          title={editingUnit ? `Edit Organization Unit: ${editingUnit.code}` : 'Add Organization Unit'}
          sub="Define unit parameters, reporting hierarchy and assigned operational management."
          onClose={() => setModalOpen(false)}
          width={620}
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
                {editingUnit ? 'Save Changes' : 'Create Unit'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSave} className="space-y-3.5 text-[12.5px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Unit Code <span className="text-red-500">*</span>
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
                  Unit Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. West Zone Operations Hub"
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
                  Unit Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as OrgUnitType)}
                  className="h-9 w-full rounded border border-slate-200 bg-white px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                >
                  <option value="Corporate Headquarters">Corporate Headquarters</option>
                  <option value="Zonal Office">Zonal Office</option>
                  <option value="Regional Division">Regional Division</option>
                  <option value="Functional Department">Functional Department</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Parent Organization Unit
                </label>
                <select
                  value={formParent}
                  onChange={(e) => setFormParent(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 bg-white px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                >
                  <option value="Dexter India Ltd">Dexter India Ltd</option>
                  <option value="Corporate Headquarters">Corporate Headquarters</option>
                  <option value="West Zone Operations Hub">West Zone Operations Hub</option>
                  <option value="North Zone Operations Hub">North Zone Operations Hub</option>
                  <option value="South Zone Operations Hub">South Zone Operations Hub</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Head of Unit / Lead <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ranjeet Pal (Zonal VP)"
                  value={formHead}
                  onChange={(e) => setFormHead(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Operating Location / City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ahmedabad (SG Highway)"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Staff Count
                </label>
                <input
                  type="number"
                  value={formStaff}
                  onChange={(e) => setFormStaff(Number(e.target.value))}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Managed ATMs
                </label>
                <input
                  type="number"
                  value={formAtms}
                  onChange={(e) => setFormAtms(Number(e.target.value))}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. west.zone@dexter.in"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] font-mono outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Official Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 79 4410 8800"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="h-9 w-full rounded border border-slate-200 px-3 text-[12.5px] font-mono outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
