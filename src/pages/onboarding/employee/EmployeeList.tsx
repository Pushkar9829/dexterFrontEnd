import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Copy,
  Download,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'
import {
  DEPARTMENTS,
  ORG_UNITS,
  type EmployeeStatus,
  type JobType,
} from '@/data/employees'
import {
  deleteEmployee,
  setEmployeeStatus,
  useEmployees,
} from '@/data/employeeStore'

const STATUS_TABS: { key: EmployeeStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All Staff' },
  { key: 'Active', label: 'Active' },
  { key: 'Pending', label: 'Pending Approval' },
  { key: 'Probation', label: 'Probation' },
  { key: 'Inactive', label: 'Inactive' },
]

export default function EmployeeList() {
  const navigate = useNavigate()
  const employees = useEmployees()

  // Filter States
  const [tab, setTab] = useState<EmployeeStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [jobTypeFilter, setJobTypeFilter] = useState<'all' | JobType>('all')
  const [orgUnitFilter, setOrgUnitFilter] = useState('all')

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Action Menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Filter logic
  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      // Tab filter
      if (tab !== 'all' && emp.status !== tab) return false

      // Dept filter
      if (deptFilter !== 'all' && emp.department !== deptFilter) return false

      // Job Type
      if (jobTypeFilter !== 'all' && emp.jobType !== jobTypeFilter) return false

      // Org Unit
      if (orgUnitFilter !== 'all' && emp.orgUnitName !== orgUnitFilter) return false

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase()
        const match =
          emp.fullName.toLowerCase().includes(q) ||
          emp.employeeCode.toLowerCase().includes(q) ||
          emp.tpCode.toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q) ||
          emp.mobile.includes(q) ||
          emp.designation.toLowerCase().includes(q) ||
          emp.district.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [employees, tab, deptFilter, jobTypeFilter, orgUnitFilter, search])

  // Select all toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map((e) => e.id))
    }
  }

  // Row selection toggle
  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  // Copy Code
  const copyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(code)
    toast(`Copied ${code} to clipboard`, 'info')
  }

  // Export to CSV
  const handleExport = () => {
    const list = selectedIds.length > 0
      ? employees.filter((e) => selectedIds.includes(e.id))
      : filtered

    const headers = [
      'Employee Code',
      'TP Code',
      'Full Name',
      'Mobile',
      'Email',
      'Official Email',
      'Department',
      'Designation',
      'Job Type',
      'Org Unit',
      'Date of Joining',
      'Bank Name',
      'Account Number',
      'Status',
    ]

    const rows = list.map((e) => [
      e.employeeCode,
      e.tpCode,
      e.fullName,
      e.mobile,
      e.email,
      e.officialEmail,
      e.department,
      e.designation,
      e.jobType,
      e.orgUnitName,
      e.dateOfJoining,
      e.liveTracking ? 'Enabled' : 'Disabled',
      e.bankName,
      e.accountNumber,
      e.status,
    ])

    downloadCsv(`Dexter_Employees_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`Exported ${list.length} employee records to CSV`)
  }

  // Format Date Helper
  const fmtDate = (dStr: string) => {
    if (!dStr) return '—'
    const d = new Date(dStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="mx-auto max-w-[1360px] pb-16">
      {/* Top Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#1E293B]">
            User / Employee Management
          </h1>
          <p className="mt-0.5 text-[13px] text-[#64748B]">
            Manage internal employees, roles, departmental assignments, and onboarding workflows.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleExport}
            className="border-[#CBD5E1] bg-white text-[#334155] shadow-xs hover:bg-[#F8FAFC]"
          >
            <Download size={15} className="mr-2 text-[#64748B]" /> Export CSV
          </Button>

          {/* Primary Action Button: Add Employee requested by user */}
          <Button
            type="button"
            size="md"
            onClick={() => navigate('/onboarding/users/new')}
            className="bg-[#0066FF] px-4 font-semibold text-white shadow-sm hover:bg-[#0052cc]"
          >
            <Plus size={16} className="mr-1.5" strokeWidth={2.5} /> Add Employee
          </Button>
        </div>
      </div>


      {/* Main Table Card */}
      <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
        {/* Status Tabs Header */}
        <div className="border-b border-[#E2EEFB] px-5 pt-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {STATUS_TABS.map((t) => {
              const count =
                t.key === 'all'
                  ? employees.length
                  : employees.filter((e) => e.status === t.key).length
              const isActive = tab === t.key

              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'relative flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-[#0066FF] font-semibold text-[#0066FF]'
                      : 'border-transparent text-[#64748B] hover:text-[#1E293B]',
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      isActive
                        ? 'bg-[#EAF2FD] text-[#0066FF]'
                        : 'bg-slate-100 text-[#64748B]',
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2EEFB] bg-[#F8FAFD] p-4">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-2.5 text-[#64748B] pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Name, Employee Code, TP Code, Mobile, Email..."
              className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-9 pr-8 text-[12.5px] text-[#1E293B] outline-none placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-[#94A3B8] hover:text-[#1E293B]"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Department */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12px] text-[#334155] outline-none focus:border-[#0066FF]"
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Job Type */}
            <select
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value as any)}
              className="h-9 rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12px] text-[#334155] outline-none focus:border-[#0066FF]"
            >
              <option value="all">All Job Types</option>
              <option value="Permanent">Permanent</option>
              <option value="Contractual">Contractual</option>
            </select>

            {/* Org Unit */}
            <select
              value={orgUnitFilter}
              onChange={(e) => setOrgUnitFilter(e.target.value)}
              className="h-9 max-w-[180px] truncate rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12px] text-[#334155] outline-none focus:border-[#0066FF]"
            >
              <option value="all">All Org Units</option>
              {ORG_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            {/* Reset Filters */}
            {(deptFilter !== 'all' ||
              jobTypeFilter !== 'all' ||
              orgUnitFilter !== 'all' ||
              search) && (
                <button
                  type="button"
                  onClick={() => {
                    setDeptFilter('all')
                    setJobTypeFilter('all')
                    setOrgUnitFilter('all')
                    setSearch('')
                  }}
                  className="flex h-9 items-center gap-1 rounded-lg border border-red-200 bg-red-50/60 px-3 text-[11.5px] font-medium text-red-600 hover:bg-red-100"
                >
                  <X size={13} /> Reset
                </button>
              )}
          </div>
        </div>

        {/* Selected Batch Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-[#EAF2FD] px-5 py-2.5 text-[12.5px] text-[#0066FF]">
            <span className="font-semibold">{selectedIds.length} employees selected</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEmployeeStatus(selectedIds, 'Active')
                  setSelectedIds([])
                  toast('Marked selected employees as Active!')
                }}
                className="h-7 border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 text-[11.5px]"
              >
                Approve / Set Active
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.length} selected employee records?`)) {
                    selectedIds.forEach((id) => deleteEmployee(id))
                    setSelectedIds([])
                    toast('Selected employees deleted', 'info')
                  }
                }}
                className="h-7 border-red-200 bg-white text-red-600 hover:bg-red-50 text-[11.5px]"
              >
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-[#E2EEFB] bg-[#F8FAFD] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded-sm border-gray-300 accent-[#0066FF]"
                  />
                </th>
                <th className="py-3 px-3">Employee Details</th>
                <th className="py-3 px-3">Employee Code</th>
                <th className="py-3 px-3">Department & Designation</th>
                <th className="py-3 px-3">Job Type</th>
                <th className="py-3 px-3">Date of Joining</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.length > 0 ? (
                filtered.map((emp) => {
                  const isSelected = selectedIds.includes(emp.id)

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => navigate(`/onboarding/users/${emp.id}`)}
                      className={cn(
                        'cursor-pointer transition-colors duration-150',
                        isSelected ? 'bg-[#EBF3FC]/60' : 'hover:bg-[#F8FAFD]',
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(emp.id, e as any)}
                          className="h-4 w-4 rounded-sm border-gray-300 accent-[#0066FF]"
                        />
                      </td>

                      {/* Employee (Photo + Name + TP Code + Email) */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#DCE8F6] bg-[#EAF2FD]">
                            {emp.photoUrl ? (
                              <img
                                src={emp.photoUrl}
                                alt={emp.fullName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-[12px] font-bold text-[#0066FF]">
                                {emp.fullName
                                  .split(' ')
                                  .map((p) => p[0])
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-bold text-[#1E293B] group-hover:text-[#0066FF]">
                              <span>{emp.fullName}</span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-[#475569]">
                                {emp.tpCode}
                              </span>
                            </div>
                            <div className="text-[11.5px] text-[#64748B] truncate max-w-[200px]">
                              {emp.email || emp.mobile}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Employee Code */}
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 font-mono text-[11.5px] font-semibold text-[#1E293B]">
                          <span>{emp.employeeCode}</span>
                          <button
                            type="button"
                            onClick={(e) => copyCode(emp.employeeCode, e)}
                            className="text-[#94A3B8] hover:text-[#0066FF]"
                            title="Copy Code"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>

                      {/* Department & Designation */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#1E293B]">{emp.designation}</div>
                        <div className="text-[11px] text-[#0066FF] font-medium">{emp.department}</div>
                      </td>

                      {/* Job Type */}
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold',
                            emp.jobType === 'Permanent'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200',
                          )}
                        >
                          {emp.jobType}
                        </span>
                      </td>

                      {/* Date of Joining */}
                      <td className="py-3 px-3 text-[#334155] whitespace-nowrap">
                        {fmtDate(emp.dateOfJoining)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'inline-block rounded-md px-2.5 py-0.5 text-[11px] font-semibold',
                            emp.status === 'Active' &&
                            'bg-emerald-50 text-emerald-700 border border-emerald-200',
                            emp.status === 'Pending' &&
                            'bg-amber-50 text-amber-700 border border-amber-200',
                            emp.status === 'Probation' &&
                            'bg-blue-50 text-blue-700 border border-blue-200',
                            emp.status === 'Inactive' &&
                            'bg-slate-100 text-slate-600 border border-slate-200',
                          )}
                        >
                          {emp.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/onboarding/users/${emp.id}`)}
                            className="h-7 text-[#0066FF] hover:bg-[#EAF2FD] text-[11.5px] font-semibold"
                          >
                            <Eye size={13} className="mr-1" /> View Details
                          </Button>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId(openMenuId === emp.id ? null : emp.id)
                              }
                              className="grid h-7 w-7 place-items-center rounded-md text-[#64748B] hover:bg-slate-100"
                            >
                              <MoreHorizontal size={15} />
                            </button>

                            {openMenuId === emp.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-[#E2EEFB] bg-white py-1 text-[12px] shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigate(`/onboarding/users/${emp.id}`)
                                      setOpenMenuId(null)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F8FAFD]"
                                  >
                                    <Eye size={13} /> View / Edit Form
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      copyCode(emp.employeeCode, e)
                                      setOpenMenuId(null)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F8FAFD]"
                                  >
                                    <Copy size={13} /> Copy Employee Code
                                  </button>
                                  {emp.status !== 'Active' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEmployeeStatus([emp.id], 'Active')
                                        setOpenMenuId(null)
                                        toast(`${emp.fullName} approved and marked Active!`)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-emerald-700 hover:bg-emerald-50"
                                    >
                                      <CheckCircle2 size={13} /> Approve Employee
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (
                                        confirm(
                                          `Delete employee record for ${emp.fullName}? This cannot be undone.`,
                                        )
                                      ) {
                                        deleteEmployee(emp.id)
                                        setOpenMenuId(null)
                                        toast(`Deleted ${emp.fullName}`, 'info')
                                      }
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 size={13} /> Delete Record
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <div className="mx-auto max-w-sm text-center">
                      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#EAF2FD] text-[#0066FF]">
                        <Users size={24} />
                      </div>
                      <h3 className="text-[14px] font-bold text-[#1E293B]">No employees found</h3>
                      <p className="mt-1 text-[12px] text-[#64748B]">
                        Try adjusting your search query or filters to find what you're looking for.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => navigate('/onboarding/users/new')}
                        className="mt-4 bg-[#0066FF] text-white"
                      >
                        <Plus size={14} className="mr-1" /> Onboard First Employee
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between border-t border-[#E2EEFB] bg-[#F8FAFD] px-5 py-3 text-[12px] text-[#64748B]">
          <span>
            Showing <strong className="text-[#1E293B]">{filtered.length}</strong> of{' '}
            <strong className="text-[#1E293B]">{employees.length}</strong> employee records
          </span>
          <span className="text-[11px] text-[#94A3B8]">
            Dexter ERP Enterprise · User &amp; Staff Operations
          </span>
        </div>
      </div>
    </div>
  )
}
