import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  Plus,
  Filter,
  Search,
  RotateCcw,
  Download,
  Building2,
  User,
  Briefcase,
  MapPin,
  Layers,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  FileCheck,
  Edit2,
  Trash2,
  ExternalLink,
  Eye,
} from 'lucide-react'
import {
  DEPARTMENTS,
  ORG_UNITS,
  DESIGNATIONS,
  type EmployeeStatus,
  type JobType,
  type Employee,
} from '@/data/employees'
import {
  deleteEmployee,
  useEmployees,
} from '@/data/employeeStore'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'

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
  const [designationFilter, setDesignationFilter] = useState('all')

  // Applied Filter states (triggered on clicking "Search")
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    dept: 'all',
    jobType: 'all',
    orgUnit: 'all',
    designation: 'all',
  })

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)

  const handleSearch = () => {
    setAppliedFilters({
      search,
      dept: deptFilter,
      jobType: jobTypeFilter,
      orgUnit: orgUnitFilter,
      designation: designationFilter,
    })
    setCurrentPage(1)
    toast('Filters applied to employee records')
  }

  const handleReset = () => {
    setSearch('')
    setDeptFilter('all')
    setJobTypeFilter('all')
    setOrgUnitFilter('all')
    setDesignationFilter('all')
    setAppliedFilters({
      search: '',
      dept: 'all',
      jobType: 'all',
      orgUnit: 'all',
      designation: 'all',
    })
    setCurrentPage(1)
    toast('Filters reset')
  }

  // Filter logic
  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      // Tab filter
      if (tab !== 'all' && emp.status !== tab) return false

      // Dept filter
      if (appliedFilters.dept !== 'all' && emp.department !== appliedFilters.dept) return false

      // Job Type
      if (appliedFilters.jobType !== 'all' && emp.jobType !== appliedFilters.jobType) return false

      // Org Unit
      if (appliedFilters.orgUnit !== 'all' && emp.orgUnitName !== appliedFilters.orgUnit) return false

      // Designation
      if (appliedFilters.designation !== 'all' && emp.designation !== appliedFilters.designation)
        return false

      // Search Query
      if (appliedFilters.search.trim()) {
        const q = appliedFilters.search.toLowerCase()
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
  }, [employees, tab, appliedFilters])

  // Pagination calculation
  const totalRecords = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  const handleDelete = (emp: Employee) => {
    if (confirm(`Are you sure you want to delete employee ${emp.fullName} (${emp.employeeCode})?`)) {
      deleteEmployee(emp.id)
      toast(`Employee ${emp.fullName} removed successfully`)
    }
  }

  // Export to CSV
  const handleExport = () => {
    if (filtered.length === 0) {
      toast('No records to export')
      return
    }

    const headers = [
      'Employee Code',
      'TP Code',
      'Full Name',
      'Mobile',
      'Email',
      'Department',
      'Designation',
      'Job Type',
      'Org Unit',
      'Status',
      'Joining Date',
    ]

    const rows = filtered.map((e) => [
      e.employeeCode,
      e.tpCode,
      e.fullName,
      e.mobile,
      e.email,
      e.department,
      e.designation,
      e.jobType,
      e.orgUnitName,
      e.status,
      e.dateOfJoining,
    ])

    downloadCsv(`employee-records-${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`${filtered.length} employee record(s) exported successfully`)
  }

  // Format status badge
  const renderStatusBadge = (status: EmployeeStatus) => {
    if (status === 'Active') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          Active
        </span>
      )
    }
    if (status === 'Pending' || status === 'Probation') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
          {status === 'Pending' ? 'Pending Approval' : 'Probation'}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-700 border border-red-200/60">
        Inactive
      </span>
    )
  }

  return (
    <div className="space-y-4 pb-12 max-w-[1500px]">
      {/* Breadcrumb matching design pattern: Workspace > Onboarding > User / Employee Management */}
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
        <span className="font-semibold text-slate-800">User / Employee Management</span>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-6 border-b border-slate-200 pt-1 overflow-x-auto">
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
              onClick={() => {
                setTab(t.key)
                setCurrentPage(1)
              }}
              className={`flex items-center gap-2 pb-3 text-[13px] font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap ${
                isActive
                  ? 'border-[#0066FF] text-[#0066FF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] ${
                  isActive ? 'bg-blue-100 text-[#0066FF]' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Page Title & Top Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
            User / Employee Management
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Manage internal employees, roles, departmental assignments, and onboarding workflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-9.5 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-xs"
          >
            <Download size={14} className="text-[#0066FF]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/onboarding/users/new')}
            className="inline-flex items-center gap-2 h-9.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow"
          >
            <Plus size={16} strokeWidth={2.4} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Filter Section matching design pattern */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Filter size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Filter</h2>
            <p className="text-[12px] text-slate-500">
              Use below filters to search and manage user / employee records.
            </p>
          </div>
        </div>

        {/* 5 Filter Controls in Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Search Query */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Search Staff
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, Code, Phone, Email..."
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>

          {/* 2. Department */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Department
            </label>
            <div className="relative">
              <Building2
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* 3. Job Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Job Type</label>
            <div className="relative">
              <Briefcase
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value as any)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="all">All Job Types</option>
                <option value="Permanent">Permanent</option>
                <option value="Contractual">Contractual</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* 4. Org Unit */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Org Unit</label>
            <div className="relative">
              <MapPin
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={orgUnitFilter}
                onChange={(e) => setOrgUnitFilter(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="all">All Org Units</option>
                {ORG_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* 5. Designation */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Designation
            </label>
            <div className="relative">
              <User
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="all">All Designations</option>
                {DESIGNATIONS.slice(0, 15).map((des) => (
                  <option key={des} value={des}>
                    {des}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-4 pt-1">
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-semibold transition-all shadow-sm"
          >
            <Search size={14} />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-all"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-all"
          >
            <Download size={14} />
            <span>Download</span>
            <ChevronDown size={12} className="text-slate-400 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Table Records Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Layers size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
              Employee Records
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12px] text-slate-600 font-medium">
              Total Records: {totalRecords}
            </span>

            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-8 pl-3 pr-7 text-[12px] font-medium rounded-md border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-[11px] text-slate-700 border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#EEF4FC] text-slate-800 font-bold border-b border-slate-200 text-center">
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap w-12">
                  S.N.
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Employee Code
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  Full Name
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Department
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Contact Number
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  Email
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Job Type
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  Org Unit
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Status
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-[#EEF4FC] shadow-[-2px_0_4px_rgba(0,0,0,0.03)] w-24">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors text-center"
                  >
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-500">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 font-semibold text-[#0066FF] whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/onboarding/users/${item.id}`)}
                        className="hover:underline flex items-center justify-center gap-1 mx-auto"
                      >
                        {item.employeeCode}
                        <ExternalLink size={11} className="opacity-60" />
                      </button>
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-800 text-left whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-[#0066FF] font-bold text-[10px] flex items-center justify-center shrink-0">
                          {item.fullName
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{item.fullName}</div>
                          <div className="text-[10px] text-slate-400">{item.designation}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      {item.department || '—'}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      {item.mobile || '—'}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-left text-slate-600">
                      {item.email || '—'}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {item.jobType}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-left">
                      {item.orgUnitName || '—'}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      {renderStatusBadge(item.status)}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/onboarding/users/${item.id}`)}
                          className="p-1 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded"
                          title="View Record"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => navigate(`/onboarding/users/${item.id}/edit`)}
                          className="p-1 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                /* Empty state matching pattern */
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-14 h-16 rounded-xl bg-[#EAF2FC] border border-[#CDE1F8] flex flex-col items-center justify-center shadow-xs mb-3 text-[#0066FF]">
                        <FileCheck size={30} strokeWidth={1.8} className="text-[#0066FF]" />
                      </div>

                      <h3 className="text-[15px] font-bold text-slate-900">No staff found</h3>
                      <p className="text-[12px] text-slate-500 mt-1 max-w-[320px]">
                        Try adjusting your search criteria or click on "Add Employee" to register staff.
                      </p>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={() => navigate('/onboarding/users/new')}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[11px] font-semibold transition-all shadow-xs"
                        >
                          <Plus size={13} />
                          Add Employee
                        </button>
                        <button
                          onClick={handleReset}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition-all"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination matching pattern */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3 border-t border-slate-200 bg-white gap-3">
          <div className="text-[12px] text-slate-500">
            {totalRecords === 0
              ? 'Showing 0 to 0 of 0 records'
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                  currentPage * pageSize,
                  totalRecords
                )} of ${totalRecords} records`}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1 || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              title="First Page"
            >
              <ChevronsLeft size={13} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              title="Previous Page"
            >
              <ChevronLeft size={13} />
            </button>

            <button className="w-7 h-7 rounded bg-[#0066FF] text-white text-[12px] font-semibold flex items-center justify-center shadow-xs">
              {currentPage}
            </button>

            {totalPages > 1 && currentPage < totalPages && (
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-7 h-7 rounded border border-slate-200 text-slate-700 text-[12px] font-medium flex items-center justify-center hover:bg-slate-50"
              >
                {currentPage + 1}
              </button>
            )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              title="Next Page"
            >
              <ChevronRight size={13} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              title="Last Page"
            >
              <ChevronsRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
