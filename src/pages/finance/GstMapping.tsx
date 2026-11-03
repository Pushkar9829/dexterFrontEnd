import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Landmark,
  Search,
  Plus,
  Download,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Pencil,
  Trash2,
  X,
  ArrowLeft,
} from 'lucide-react'
import {
  gstMappingStore,
  saveGstMapping,
  deleteGstMapping,
  emptyGstMapping,
  STATE_CODE_MAP,
  type FranchiseGstMapping,
  type GstRegistrationType,
  type GstVerificationStatus,
  type GstFilingFrequency,
} from '@/data/financeGstMapping'
import { FRANCHISEES } from '@/data/cbrSites'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'

export default function GstMapping() {
  const mappings = gstMappingStore.use()

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterState, setFilterState] = useState('')
  const [filterRegType, setFilterRegType] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<FranchiseGstMapping>(emptyGstMapping)

  // Certificate / Inspection View Modal
  const [viewingMapping, setViewingMapping] = useState<FranchiseGstMapping | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // KPI calculations
  const stats = useMemo(() => {
    const total = mappings.length
    const verified = mappings.filter((m) => m.verificationStatus === 'Verified').length
    const pending = mappings.filter((m) => m.verificationStatus === 'Pending Verification').length
    const composition = mappings.filter((m) => m.registrationType === 'Composition Scheme').length
    return { total, verified, pending, composition }
  }, [mappings])

  // Filtered mappings
  const filteredMappings = useMemo(() => {
    return mappings.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesQ =
          m.franchiseId.toLowerCase().includes(q) ||
          m.franchiseeName.toLowerCase().includes(q) ||
          m.legalBusinessName.toLowerCase().includes(q) ||
          m.tradeName.toLowerCase().includes(q) ||
          m.gstin.toLowerCase().includes(q) ||
          m.panNumber.toLowerCase().includes(q) ||
          m.city.toLowerCase().includes(q)
        if (!matchesQ) return false
      }
      if (filterState && m.state !== filterState) return false
      if (filterRegType && m.registrationType !== filterRegType) return false
      if (filterStatus && m.verificationStatus !== filterStatus) return false
      return true
    })
  }, [mappings, searchQuery, filterState, filterRegType, filterStatus])

  // Paginated records
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredMappings.slice(start, start + pageSize)
  }, [filteredMappings, currentPage, pageSize])

  const totalPages = Math.ceil(filteredMappings.length / pageSize) || 1

  // Handle open Add Modal
  const handleOpenAdd = () => {
    setEditingMapping(emptyGstMapping())
    setIsModalOpen(true)
  }

  // Handle open Edit Modal
  const handleOpenEdit = (mapping: FranchiseGstMapping) => {
    setEditingMapping({ ...mapping })
    setIsModalOpen(true)
  }

  // Handle auto-population on Franchise selection
  const handleFranchiseSelect = (frId: string) => {
    const matched = FRANCHISEES.find((f) => f.id === frId)
    if (matched) {
      const gstin = matched.gstin || ''
      const pan = matched.pan || (gstin.length >= 12 ? gstin.slice(2, 12) : '')
      const stateCode = gstin.slice(0, 2)
      const stateInfo = STATE_CODE_MAP[stateCode]

      setEditingMapping((prev) => ({
        ...prev,
        franchiseId: matched.id,
        franchiseeName: matched.name,
        legalBusinessName: matched.panName || matched.name,
        tradeName: matched.name,
        gstin,
        panNumber: pan,
        state: stateInfo ? stateInfo.state : prev.state,
        stateCode: stateCode || prev.stateCode,
        contactPhone: matched.contact ? `+91 ${matched.contact}` : prev.contactPhone,
      }))
      toast(`Selected franchise ${matched.name}`, 'info')
    } else {
      setEditingMapping((prev) => ({ ...prev, franchiseId: frId }))
    }
  }

  // Auto-fill state and PAN when GSTIN is typed
  const handleGstinChange = (gstinVal: string) => {
    const cleanGst = gstinVal.toUpperCase().trim()
    const updates: Partial<FranchiseGstMapping> = { gstin: cleanGst }

    if (cleanGst.length >= 2) {
      const code = cleanGst.slice(0, 2)
      if (STATE_CODE_MAP[code]) {
        updates.stateCode = code
        updates.state = STATE_CODE_MAP[code].state
      }
    }
    if (cleanGst.length >= 12) {
      updates.panNumber = cleanGst.slice(2, 12)
    }

    setEditingMapping((prev) => ({ ...prev, ...updates }))
  }

  // Save Mapping
  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMapping.franchiseeName.trim()) {
      toast('Please enter Franchisee Name', 'error')
      return
    }
    if (!editingMapping.gstin.trim()) {
      toast('Please enter 15-digit GSTIN Number', 'error')
      return
    }
    if (editingMapping.gstin.trim().length !== 15) {
      toast('GSTIN must be exactly 15 characters long', 'error')
      return
    }

    saveGstMapping(editingMapping)
    toast(
      editingMapping.id
        ? `GST Mapping for ${editingMapping.franchiseeName} updated!`
        : `Franchise GST Mapping created successfully!`,
      'success'
    )
    setIsModalOpen(false)
  }

  // Delete Mapping
  const handleDelete = (mapping: FranchiseGstMapping) => {
    if (confirm(`Are you sure you want to delete GST Mapping for ${mapping.franchiseeName}?`)) {
      deleteGstMapping(mapping.id)
      toast(`Mapping ${mapping.id} removed`, 'info')
    }
  }

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'S.No.',
      'Mapping ID',
      'Franchise ID',
      'Franchisee Name',
      'Legal Business Name',
      'Trade Name',
      'GSTIN',
      'PAN',
      'State',
      'State Code',
      'Registration Type',
      'Filing Frequency',
      'Reverse Charge',
      'Verification Status',
      'City',
      'Pincode',
      'Effective Date',
    ]
    const rows = filteredMappings.map((m, idx) => [
      String(idx + 1),
      m.id || '',
      m.franchiseId || '',
      m.franchiseeName || '',
      m.legalBusinessName || '',
      m.tradeName || '',
      m.gstin || '',
      m.panNumber || '',
      m.state || '',
      m.stateCode || '',
      m.registrationType || '',
      m.filingFrequency || '',
      m.reverseChargeApplicable || '',
      m.verificationStatus || '',
      m.city || '',
      m.pincode || '',
      m.effectiveDate || '',
    ])
    downloadCsv(`Franchise_GST_Mapping_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast('GST Mapping CSV exported', 'success')
  }

  return (
    <div className="space-y-5">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <Link to="/finance" className="hover:text-primary transition-colors">
              Finance
            </Link>
            <span>/</span>
            <Link to="/finance/gst" className="hover:text-primary transition-colors">
              GST Module
            </Link>
            <span>/</span>
            <span className="font-semibold text-ink">GST Mapping</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-xl sm:text-2xl font-bold text-ink">Franchise GST Mapping</h1>
            <span className="rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
              Franchise Tax Master
            </span>
          </div>
          <p className="text-[12px] text-muted">
            Map and maintain GST registration details, GSTIN, legal entities, and state jurisdictions for White Label ATM franchises.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/finance/gst"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ArrowLeft size={13} />
            <span>Back to GST Hub</span>
          </Link>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-hover shadow-xs transition-colors"
          >
            <Plus size={14} />
            <span>Map New Franchise GST</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Total Mappings
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-primary">
              <Landmark size={15} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">{stats.total}</div>
          <div className="mt-1 text-[11px] text-muted">Registered ATM Franchises</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Verified GSTINs
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{stats.verified}</div>
          <div className="mt-1 text-[11px] text-muted">Portal verified status</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Pending Verification
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{stats.pending}</div>
          <div className="mt-1 text-[11px] text-muted">Under validation audit</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Composition Scheme
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Building2 size={15} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-700">{stats.composition}</div>
          <div className="mt-1 text-[11px] text-muted">Special scheme dealers</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div className="grid gap-3 sm:grid-cols-12 items-center">
          <div className="sm:col-span-5 relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Franchise Name, ID, GSTIN, Legal Entity, PAN, City..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-[12px] focus:border-primary focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={filterState}
              onChange={(e) => {
                setFilterState(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[12px] focus:border-primary focus:outline-hidden"
            >
              <option value="">All States / Jurisdictions</option>
              {Object.values(STATE_CODE_MAP).map(({ state }) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={filterRegType}
              onChange={(e) => {
                setFilterRegType(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[12px] focus:border-primary focus:outline-hidden"
            >
              <option value="">All Reg Types</option>
              <option value="Regular Taxpayer">Regular Taxpayer</option>
              <option value="Composition Scheme">Composition Scheme</option>
              <option value="SEZ Unit / Developer">SEZ Unit</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[12px] focus:border-primary focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="Verified">Verified</option>
              <option value="Pending Verification">Pending</option>
              <option value="Suspended">Suspended</option>
            </select>

            {(searchQuery || filterState || filterRegType || filterStatus) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setFilterState('')
                  setFilterRegType('')
                  setFilterStatus('')
                  setCurrentPage(1)
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700"
                title="Reset filters"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full text-left text-[12px] border-collapse">
            <thead className="bg-[#f0f4f9] text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-center w-12 whitespace-nowrap">S.N.</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Franchise Details</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Legal Entity / Trade Name</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">GSTIN & PAN</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">State & Code</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Reg Type & Filing</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">RCM</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No franchise GST mappings found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-500 font-medium">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-ink">{row.franchiseeName}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted">
                        <span className="font-mono text-primary font-semibold">{row.franchiseId}</span>
                        <span>•</span>
                        <span>{row.city}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{row.legalBusinessName}</div>
                      <div className="text-[11px] text-slate-500">{row.tradeName || '—'}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-900">{row.gstin}</div>
                      <div className="font-mono text-[11px] text-slate-600">PAN: {row.panNumber}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{row.state}</div>
                      <div className="font-mono text-[10px] text-slate-500">Code: {row.stateCode}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-block rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700">
                        {row.registrationType}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">{row.filingFrequency}</div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.2 text-[10px] font-semibold',
                          row.reverseChargeApplicable === 'Yes'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {row.reverseChargeApplicable}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          row.verificationStatus === 'Verified' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                          row.verificationStatus === 'Pending Verification' && 'bg-amber-50 text-amber-800 border border-amber-200',
                          row.verificationStatus === 'Discrepancy' && 'bg-rose-50 text-rose-800 border border-rose-200',
                          row.verificationStatus === 'Suspended' && 'bg-slate-100 text-slate-700 border border-slate-300'
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {row.verificationStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingMapping(row)}
                          title="View GST Details & Certificate"
                          className="rounded p-1.5 text-slate-600 hover:bg-blue-50 hover:text-primary transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(row)}
                          title="Edit GST Mapping"
                          className="rounded p-1.5 text-slate-600 hover:bg-blue-50 hover:text-primary transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          title="Delete Mapping"
                          className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-[12px] bg-slate-50/50">
          <div className="text-slate-500">
            Showing <strong className="text-ink">{paginated.length}</strong> of{' '}
            <strong className="text-ink">{filteredMappings.length}</strong> franchise mappings
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-[11px]">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT FRANCHISE GST MAPPING */}
      {isModalOpen && (
        <Modal
          title={editingMapping.id ? `Edit GST Mapping — ${editingMapping.franchiseeName}` : 'Map New Franchise GST Details'}
          onClose={() => setIsModalOpen(false)}
          width={760}
        >
          <form onSubmit={handleSaveSubmit} className="space-y-4 text-[12px]">
            {/* Franchise Info Selector */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                1. Franchise Selection
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    Select Existing Franchise (or enter custom)
                  </label>
                  <select
                    value={editingMapping.franchiseId}
                    onChange={(e) => handleFranchiseSelect(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 focus:border-primary focus:outline-hidden"
                  >
                    <option value="">-- Choose Franchise or Custom --</option>
                    {FRANCHISEES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.id} — {f.name} ({f.pan})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Franchise ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FR-MH-00124"
                    value={editingMapping.franchiseId}
                    onChange={(e) =>
                      setEditingMapping((prev) => ({ ...prev, franchiseId: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Franchisee Display Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shree Sai Financial Services"
                    value={editingMapping.franchiseeName}
                    onChange={(e) =>
                      setEditingMapping((prev) => ({ ...prev, franchiseeName: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Legal Business Name (as on GST Certificate)</label>
                  <input
                    type="text"
                    placeholder="e.g. Shree Sai Financial Services Pvt Ltd"
                    value={editingMapping.legalBusinessName}
                    onChange={(e) =>
                      setEditingMapping((prev) => ({ ...prev, legalBusinessName: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* GSTIN & Tax Details */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                2. GST Registration & Tax Jurisdiction
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    15-Digit GSTIN Number *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="e.g. 27AAKFS4821K1Z6"
                    value={editingMapping.gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono font-bold text-primary focus:border-primary focus:outline-hidden"
                  />
                  <span className="text-[10px] text-muted">First 2 digits determine state code</span>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">PAN Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. AAKFS4821K"
                    value={editingMapping.panNumber}
                    onChange={(e) =>
                      setEditingMapping((prev) => ({
                        ...prev,
                        panNumber: e.target.value.toUpperCase().trim(),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">State / Jurisdiction</label>
                  <select
                    value={editingMapping.state}
                    onChange={(e) => {
                      const stateName = e.target.value
                      const found = Object.values(STATE_CODE_MAP).find((s) => s.state === stateName)
                      setEditingMapping((prev) => ({
                        ...prev,
                        state: stateName,
                        stateCode: found ? found.code : prev.stateCode,
                      }))
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 focus:border-primary focus:outline-hidden"
                  >
                    {Object.values(STATE_CODE_MAP).map(({ state, code }) => (
                      <option key={code} value={state}>
                        {code} — {state}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Registration Type</label>
                  <select
                    value={editingMapping.registrationType}
                    onChange={(e) =>
                      setEditingMapping((prev) => ({
                        ...prev,
                        registrationType: e.target.value as GstRegistrationType,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 focus:border-primary focus:outline-hidden"
                  >
                    <option value="Regular Taxpayer">Regular Taxpayer</option>
                    <option value="Composition Scheme">Composition Scheme</option>
                    <option value="SEZ Unit / Developer">SEZ Unit / Developer</option>
                    <option value="Consumer / Unregistered">Consumer / Unregistered</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">GSTR Filing Frequency</label>
                  <select
                    value={editingMapping.filingFrequency}
                    onChange={(e) =>
                      setEditingMapping((prev) => ({
                        ...prev,
                        filingFrequency: e.target.value as GstFilingFrequency,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 focus:border-primary focus:outline-hidden"
                  >
                    <option value="Monthly (GSTR-1 & 3B)">Monthly (GSTR-1 & 3B)</option>
                    <option value="Quarterly (QRMP Scheme)">Quarterly (QRMP Scheme)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Reverse Charge (RCM)</label>
                  <select
                    value={editingMapping.reverseChargeApplicable}
                    onChange={(e) =>
                      setEditingMapping((prev) => ({
                        ...prev,
                        reverseChargeApplicable: e.target.value as 'Yes' | 'No',
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 focus:border-primary focus:outline-hidden"
                  >
                    <option value="No">No (Forward Charge)</option>
                    <option value="Yes">Yes (Reverse Charge)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Address & Verification */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                3. Address & Compliance Verification
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block font-semibold text-slate-700">Principal Place of Business (Address)</label>
                  <input
                    type="text"
                    placeholder="Plot / Street / Building address"
                    value={editingMapping.registeredAddress}
                    onChange={(e) =>
                      setEditingMapping((prev) => ({ ...prev, registeredAddress: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">City / District</label>
                  <input
                    type="text"
                    placeholder="e.g. Pune"
                    value={editingMapping.city}
                    onChange={(e) =>
                      setEditingMapping((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Verification Status</label>
                  <select
                    value={editingMapping.verificationStatus}
                    onChange={(e) =>
                      setEditingMapping((prev) => ({
                        ...prev,
                        verificationStatus: e.target.value as GstVerificationStatus,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 focus:border-primary focus:outline-hidden"
                  >
                    <option value="Verified">Verified</option>
                    <option value="Pending Verification">Pending Verification</option>
                    <option value="Discrepancy">Discrepancy</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98XXX XXXXX"
                    value={editingMapping.contactPhone}
                    onChange={(e) =>
                      setEditingMapping((prev) => ({ ...prev, contactPhone: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Contact Email</label>
                  <input
                    type="email"
                    placeholder="accounts@domain.in"
                    value={editingMapping.contactEmail}
                    onChange={(e) =>
                      setEditingMapping((prev) => ({ ...prev, contactEmail: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-5 py-2 font-semibold text-white hover:bg-primary-hover shadow-xs transition-colors"
              >
                {editingMapping.id ? 'Save Changes' : 'Confirm & Map GST'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: VIEW GST CERTIFICATE & DETAILS DOSSIER */}
      {viewingMapping && (
        <Modal
          title={`Franchise GST Registration Dossier: ${viewingMapping.gstin}`}
          onClose={() => setViewingMapping(null)}
          width={680}
        >
          <div className="space-y-4 text-[12px]">
            {/* Header Certificate replica */}
            <div className="rounded-xl border-2 border-slate-800 bg-white p-6 shadow-md text-slate-800 relative">
              <div className="text-center border-b border-slate-300 pb-3">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Government of India — Central Board of Indirect Taxes and Customs
                </div>
                <h3 className="text-base font-black tracking-wide text-slate-900 mt-0.5">
                  Form GST REG-06
                </h3>
                <div className="text-[11px] font-semibold text-primary">
                  Registration Certificate under Goods and Services Tax Act
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500">1. Legal Name:</span>
                  <div className="font-bold text-slate-900">{viewingMapping.legalBusinessName}</div>
                </div>
                <div>
                  <span className="text-slate-500">2. Trade Name:</span>
                  <div className="font-semibold text-slate-800">{viewingMapping.tradeName || '—'}</div>
                </div>
                <div>
                  <span className="text-slate-500">3. GSTIN:</span>
                  <div className="font-mono text-sm font-black text-primary">{viewingMapping.gstin}</div>
                </div>
                <div>
                  <span className="text-slate-500">4. Permanent Account Number (PAN):</span>
                  <div className="font-mono font-bold text-slate-800">{viewingMapping.panNumber}</div>
                </div>
                <div>
                  <span className="text-slate-500">5. State Jurisdiction:</span>
                  <div className="font-medium text-slate-800">
                    {viewingMapping.state} (Code: {viewingMapping.stateCode})
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">6. Constitution of Business:</span>
                  <div className="font-medium text-slate-800">{viewingMapping.registrationType}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">7. Principal Place of Business Address:</span>
                  <div className="font-medium text-slate-800">
                    {viewingMapping.registeredAddress}, {viewingMapping.city} — {viewingMapping.pincode}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-500">
                <div>
                  Effective Date: <strong className="text-slate-800">{viewingMapping.effectiveDate}</strong>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold uppercase">
                    Status: {viewingMapping.verificationStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingMapping(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-[12px] font-semibold text-white hover:bg-slate-900"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

