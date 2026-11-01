import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  Plus,
  Filter,
  Search,
  RotateCcw,
  Download,
  Building2,
  Calendar,
  Smartphone,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  Trash2,
  Edit2,
  ArrowUpDown,
  CheckCircle2,
  X,
  FileSpreadsheet,
  FileText,
  FileCheck,
  AlertTriangle,
} from 'lucide-react'
import {
  useTdsCompliance,
  exportTdsComplianceCsv,
  type TdsComplianceRecord,
} from '@/data/financeAccountManagement'
import { toast } from '@/components/ui/Toast'

export default function TdsComplianceList() {
  const { records, addRecord, updateRecord, deleteRecord } = useTdsCompliance()

  // Filter input states
  const [filterYear, setFilterYear] = useState('F.Y. 2026-27')
  const [filterSection, setFilterSection] = useState('')
  const [filterAtmId, setFilterAtmId] = useState('')
  const [filterFranchise, setFilterFranchise] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Applied filters state
  const [appliedFilters, setAppliedFilters] = useState({
    year: 'F.Y. 2026-27',
    section: '',
    atmId: '',
    franchise: '',
    status: '',
  })

  // Pagination & Sorting
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [sortField, setSortField] = useState<keyof TdsComplianceRecord>('annualWithdrawal')
  const [sortAsc, setSortAsc] = useState<boolean>(false)

  // Export menu
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TdsComplianceRecord | null>(null)
  const [modalForm, setModalForm] = useState<Omit<TdsComplianceRecord, 'id'>>({
    atmId: 'MCRM7303',
    franchiseName: 'ABC Services',
    panNo: 'AAACB1245P',
    sectionCode: '194N',
    financialYear: 'F.Y. 2026-27',
    annualWithdrawal: 10000000,
    tdsRate: 2,
    tdsDeducted: 200000,
    challanBsrCode: '0210041/2026/20',
    form15GStatus: 'Filed & Verified',
    status: 'Compliant',
    lastAuditDate: '01-11-2026',
  })

  // Options
  const atmOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.atmId).filter(Boolean))).sort(),
    [records]
  )
  const franchiseOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.franchiseName).filter(Boolean))).sort(),
    [records]
  )

  const handleSearch = () => {
    setAppliedFilters({
      year: filterYear,
      section: filterSection,
      atmId: filterAtmId,
      franchise: filterFranchise,
      status: filterStatus,
    })
    setCurrentPage(1)
    toast('Filters applied to TDS compliance records')
  }

  const handleReset = () => {
    setFilterYear('F.Y. 2026-27')
    setFilterSection('')
    setFilterAtmId('')
    setFilterFranchise('')
    setFilterStatus('')
    setAppliedFilters({
      year: 'F.Y. 2026-27',
      section: '',
      atmId: '',
      franchise: '',
      status: '',
    })
    setCurrentPage(1)
    toast('Filters reset to default')
  }

  const handleSort = (field: keyof TdsComplianceRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        if (appliedFilters.year && r.financialYear !== appliedFilters.year) return false
        if (appliedFilters.section && r.sectionCode !== appliedFilters.section) return false
        if (appliedFilters.atmId && r.atmId !== appliedFilters.atmId) return false
        if (
          appliedFilters.franchise &&
          !r.franchiseName.toLowerCase().includes(appliedFilters.franchise.toLowerCase())
        ) {
          return false
        }
        if (appliedFilters.status && r.status !== appliedFilters.status) return false
        return true
      })
      .sort((a, b) => {
        const valA = a[sortField]
        const valB = b[sortField]
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA
        }
        const strA = (valA || '').toString().toLowerCase()
        const strB = (valB || '').toString().toLowerCase()
        if (strA < strB) return sortAsc ? -1 : 1
        if (strA > strB) return sortAsc ? 1 : -1
        return 0
      })
  }, [records, appliedFilters, sortField, sortAsc])

  // Pagination calculations
  const totalRecords = filteredRecords.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalRecords)
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex)

  const handleExportCsv = () => {
    exportTdsComplianceCsv(filteredRecords)
    setShowExportMenu(false)
    toast(`Exported ${filteredRecords.length} TDS compliance records to CSV`)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete compliance record for ${name}?`)) {
      deleteRecord(id)
      toast('Compliance record removed')
    }
  }

  const openAddModal = () => {
    setEditingRecord(null)
    setModalForm({
      atmId: 'MCRM7303',
      franchiseName: 'ABC Services',
      panNo: 'AAACB1245P',
      sectionCode: '194N',
      financialYear: 'F.Y. 2026-27',
      annualWithdrawal: 10000000,
      tdsRate: 2,
      tdsDeducted: 200000,
      challanBsrCode: '0210041/2026/20',
      form15GStatus: 'Filed & Verified',
      status: 'Compliant',
      lastAuditDate: '01-11-2026',
    })
    setShowModal(true)
  }

  const openEditModal = (rec: TdsComplianceRecord) => {
    setEditingRecord(rec)
    setModalForm({
      atmId: rec.atmId,
      franchiseName: rec.franchiseName,
      panNo: rec.panNo,
      sectionCode: rec.sectionCode,
      financialYear: rec.financialYear,
      annualWithdrawal: rec.annualWithdrawal,
      tdsRate: rec.tdsRate,
      tdsDeducted: rec.tdsDeducted,
      challanBsrCode: rec.challanBsrCode,
      form15GStatus: rec.form15GStatus,
      status: rec.status,
      lastAuditDate: rec.lastAuditDate,
    })
    setShowModal(true)
  }

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalForm.atmId || !modalForm.franchiseName || !modalForm.panNo) {
      toast('Please fill all mandatory fields', 'error')
      return
    }

    if (editingRecord) {
      updateRecord({
        ...editingRecord,
        ...modalForm,
      })
      toast('TDS compliance record updated successfully', 'success')
    } else {
      const newId = `TDS-2026-${String(records.length + 1).padStart(3, '0')}`
      addRecord({
        id: newId,
        ...modalForm,
      })
      toast('New TDS compliance record registered', 'success')
    }
    setShowModal(false)
  }

  const renderStatusBadge = (status: TdsComplianceRecord['status']) => {
    switch (status) {
      case 'Compliant':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} /> Compliant
          </span>
        )
      case 'Certificate Pending':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#0066FF] border border-blue-200">
            Cert. Pending
          </span>
        )
      case 'Threshold Warning':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
            <AlertTriangle size={11} /> Threshold Warning
          </span>
        )
      case 'Audit Required':
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
            Audit Required
          </span>
        )
    }
  }

  const renderSectionBadge = (code: TdsComplianceRecord['sectionCode']) => {
    switch (code) {
      case '194N':
        return <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">194N (Cash)</span>
      case '194C':
        return <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-200">194C (Contract)</span>
      case '194J':
        return <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px] border border-purple-200">194J (Prof.)</span>
      case '194H':
      default:
        return <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">194H (Comm.)</span>
    }
  }

  return (
    <div className="w-full min-w-0 pb-16 font-sans space-y-4">
      {/* Breadcrumb: Workspace > Finance > Account Management > TDS Compliance */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance" className="hover:text-[#0066FF] transition-colors">
          Finance
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance/account-management" className="hover:text-[#0066FF] transition-colors">
          Account Management
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">TDS Compliance</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
            TDS Compliance Management
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Monitor Section 194N cash withdrawal TDS, Section 194C contractor deductions, and Form 15G/15H compliance certificates.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 h-9.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.4} />
            <span>New Compliance Record</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-xs">
            <Filter size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Filter</h2>
            <p className="text-[12px] text-slate-500">
              Use below filters to search and view TDS compliance audit entries.
            </p>
          </div>
        </div>

        {/* 5 Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Financial Year */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Financial Year
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer"
              >
                <option value="F.Y. 2026-27">F.Y. 2026-27</option>
                <option value="F.Y. 2025-26">F.Y. 2025-26</option>
                <option value="F.Y. 2024-25">F.Y. 2024-25</option>
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* 2. Section Code */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Section Code
            </label>
            <div className="relative">
              <FileCheck size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer"
              >
                <option value="">All Sections</option>
                <option value="194N">194N - Cash Withdrawal</option>
                <option value="194C">194C - Contractor</option>
                <option value="194J">194J - Professional</option>
                <option value="194H">194H - Commission</option>
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* 3. ATM ID */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              ATM ID
            </label>
            <div className="relative">
              <Smartphone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterAtmId}
                onChange={(e) => setFilterAtmId(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer"
              >
                <option value="">All ATM IDs</option>
                {atmOptions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* 4. Franchise Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Franchise Name
            </label>
            <div className="relative">
              <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterFranchise}
                onChange={(e) => setFilterFranchise(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer truncate"
              >
                <option value="">All Franchises</option>
                {franchiseOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* 5. Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Status
            </label>
            <div className="relative">
              <CheckCircle2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Compliant">Compliant</option>
                <option value="Certificate Pending">Certificate Pending</option>
                <option value="Threshold Warning">Threshold Warning</option>
                <option value="Audit Required">Audit Required</option>
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Filter Action Buttons on Right */}
        <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex items-center gap-1.5 px-4 h-8.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Search size={14} />
            <span>Search</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3.5 h-8.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-medium transition-colors shadow-xs cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 px-3.5 h-8.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-medium transition-colors shadow-xs cursor-pointer"
            >
              <Download size={13} className="text-[#0066FF]" />
              <span>Export</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-30">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full px-3.5 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-blue-50/60 hover:text-[#0066FF] flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  <span>Download as CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full px-3.5 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-blue-50/60 hover:text-[#0066FF] flex items-center gap-2 cursor-pointer"
                >
                  <FileText size={14} className="text-[#0066FF]" />
                  <span>Download as Excel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Card Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-xs">
              <FileCheck size={16} />
            </div>
            <h3 className="text-[15px] font-bold text-slate-900">
              TDS Compliance Records
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12.5px] text-slate-600 font-medium">
              Total Records: <strong className="text-slate-900 font-bold">{totalRecords}</strong>
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="h-8 px-2.5 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-700 font-medium outline-none focus:border-[#0066FF] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[1250px]">
            <thead>
              <tr className="bg-[#F0F5FA] border-b border-slate-200 text-slate-700 text-[11.5px] font-semibold">
                <th className="py-3 px-3.5 text-center w-12">S.N.</th>
                <th className="py-3 px-3.5">ATM ID</th>
                <th className="py-3 px-3.5">Franchise Name</th>
                <th className="py-3 px-3.5">PAN Number</th>
                <th className="py-3 px-3.5 text-center">Section</th>
                <th
                  onClick={() => handleSort('annualWithdrawal')}
                  className="py-3 px-3.5 text-right cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Annual Withdrawal</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 text-center">Rate</th>
                <th
                  onClick={() => handleSort('tdsDeducted')}
                  className="py-3 px-3.5 text-right cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>TDS Deducted</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5">Challan / BSR</th>
                <th className="py-3 px-3.5 text-center">Form 15G</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12.5px] text-slate-800">
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((rec, index) => {
                  const serialNo = startIndex + index + 1
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="py-3 px-3.5 text-center font-medium text-slate-500">
                        {serialNo}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-[#0066FF]">
                        {rec.atmId}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-800">
                        {rec.franchiseName}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[12px] text-slate-700">
                        {rec.panNo}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {renderSectionBadge(rec.sectionCode)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-semibold text-slate-900">
                        ₹ {rec.annualWithdrawal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold text-slate-700">
                        {rec.tdsRate}%
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-rose-600">
                        ₹ {rec.tdsDeducted.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[11.5px] text-slate-600">
                        {rec.challanBsrCode}
                      </td>
                      <td className="py-3 px-3.5 text-center text-[11.5px] font-medium text-slate-700">
                        {rec.form15GStatus}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {renderStatusBadge(rec.status)}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(rec)}
                            className="p-1.5 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Edit Compliance"
                          >
                            <Edit2 size={13.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(rec.id, rec.franchiseName)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 size={13.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 text-[13px]">
                    No TDS compliance records found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 text-[12px] text-slate-600 bg-white">
          <div>
            Showing <strong className="text-slate-900 font-semibold">{totalRecords > 0 ? startIndex + 1 : 1}</strong> to{' '}
            <strong className="text-slate-900 font-semibold">{totalRecords > 0 ? endIndex : 0}</strong> of{' '}
            <strong className="text-slate-900 font-semibold">{totalRecords}</strong> records
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="First page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Previous page"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1]
                const isGap = prev && p - prev > 1
                return (
                  <span key={p} className="flex items-center">
                    {isGap && <span className="px-1 text-slate-400">…</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`min-w-8 h-8 px-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                        safePage === p
                          ? 'bg-[#0066FF] text-white shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                )
              })}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages || totalRecords === 0}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Next page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages || totalRecords === 0}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Last page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0066FF] text-white flex items-center justify-center">
                  <FileCheck size={16} />
                </div>
                <h3 className="text-[15px] font-bold text-slate-900">
                  {editingRecord ? 'Edit TDS Compliance Record' : 'Register New TDS Compliance'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    ATM ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={modalForm.atmId}
                    onChange={(e) => setModalForm({ ...modalForm, atmId: e.target.value.toUpperCase() })}
                    placeholder="e.g. MCRM7303"
                    className="w-full h-8.5 px-3 text-[12px] font-mono rounded-lg border border-slate-200 focus:border-[#0066FF] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Section Code <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={modalForm.sectionCode}
                    onChange={(e) => setModalForm({ ...modalForm, sectionCode: e.target.value as any })}
                    className="w-full h-8.5 px-2.5 text-[12px] rounded-lg border border-slate-200 focus:border-[#0066FF] outline-none"
                  >
                    <option value="194N">194N (Cash Withdrawal)</option>
                    <option value="194C">194C (Contractor)</option>
                    <option value="194J">194J (Professional)</option>
                    <option value="194H">194H (Commission)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Franchise Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modalForm.franchiseName}
                  onChange={(e) => setModalForm({ ...modalForm, franchiseName: e.target.value })}
                  placeholder="e.g. ABC Services"
                  className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 focus:border-[#0066FF] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    PAN Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={modalForm.panNo}
                    onChange={(e) => setModalForm({ ...modalForm, panNo: e.target.value.toUpperCase() })}
                    placeholder="e.g. AAACB1245P"
                    className="w-full h-8.5 px-3 text-[12px] font-mono rounded-lg border border-slate-200 focus:border-[#0066FF] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Financial Year
                  </label>
                  <select
                    value={modalForm.financialYear}
                    onChange={(e) => setModalForm({ ...modalForm, financialYear: e.target.value })}
                    className="w-full h-8.5 px-2.5 text-[12px] rounded-lg border border-slate-200 focus:border-[#0066FF] outline-none"
                  >
                    <option value="F.Y. 2026-27">F.Y. 2026-27</option>
                    <option value="F.Y. 2025-26">F.Y. 2025-26</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Annual Withdrawal (₹)
                  </label>
                  <input
                    type="number"
                    value={modalForm.annualWithdrawal}
                    onChange={(e) => {
                      const withdrawal = Number(e.target.value)
                      const rate = modalForm.tdsRate
                      setModalForm({
                        ...modalForm,
                        annualWithdrawal: withdrawal,
                        tdsDeducted: Math.round((withdrawal * rate) / 100),
                      })
                    }}
                    className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 focus:border-[#0066FF] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    TDS Rate (%)
                  </label>
                  <select
                    value={modalForm.tdsRate}
                    onChange={(e) => {
                      const rate = Number(e.target.value)
                      setModalForm({
                        ...modalForm,
                        tdsRate: rate,
                        tdsDeducted: Math.round((modalForm.annualWithdrawal * rate) / 100),
                      })
                    }}
                    className="w-full h-8.5 px-2.5 text-[12px] rounded-lg border border-slate-200 focus:border-[#0066FF] outline-none"
                  >
                    <option value={1}>1%</option>
                    <option value={2}>2%</option>
                    <option value={5}>5%</option>
                    <option value={10}>10%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Challan / BSR Code
                  </label>
                  <input
                    type="text"
                    value={modalForm.challanBsrCode}
                    onChange={(e) => setModalForm({ ...modalForm, challanBsrCode: e.target.value })}
                    placeholder="e.g. 0210041/2026/20"
                    className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 focus:border-[#0066FF] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={modalForm.status}
                    onChange={(e) => setModalForm({ ...modalForm, status: e.target.value as any })}
                    className="w-full h-8.5 px-2.5 text-[12px] rounded-lg border border-slate-200 focus:border-[#0066FF] outline-none"
                  >
                    <option value="Compliant">Compliant</option>
                    <option value="Certificate Pending">Certificate Pending</option>
                    <option value="Threshold Warning">Threshold Warning</option>
                    <option value="Audit Required">Audit Required</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 h-8.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[12.5px] font-medium text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 h-8.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-semibold shadow-xs cursor-pointer"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
