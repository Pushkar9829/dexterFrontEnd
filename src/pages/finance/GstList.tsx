import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
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
import { type Tone } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'
import { inr } from '@/data/financeSd'
import {
  FIN_YEARS,
  FY_MONTHS,
  deleteGst,
  gstStore,
} from '@/data/financeGst'

export function invoiceTone(s: string): Tone {
  return s === 'Pending at FR End' ? 'amber' : s === 'Pending at Hitachi End' ? 'purple' : 'gray'
}

export default function GstList() {
  const navigate = useNavigate()
  const records = gstStore.use()

  // Filter States
  const [search, setSearch] = useState('')
  const [fyFilter, setFyFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState<string>('all')

  // Row Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Filter Logic
  const filtered = useMemo(() => {
    return records.filter((rec) => {
      // FY Filter
      if (fyFilter !== 'all' && rec.fYear !== fyFilter) return false

      // Month Filter
      if (monthFilter !== 'all' && rec.month !== monthFilter) return false

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase()
        const match =
          (rec.franchiseeName || '').toLowerCase().includes(q) ||
          (rec.siteId || '').toLowerCase().includes(q) ||
          (rec.atmId || '').toLowerCase().includes(q) ||
          (rec.gstNumber || '').toLowerCase().includes(q) ||
          (rec.invoiceNumber || '').toLowerCase().includes(q) ||
          (rec.utrNumber || '').toLowerCase().includes(q) ||
          (rec.locationName || '').toLowerCase().includes(q) ||
          (rec.id || '').toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [records, fyFilter, monthFilter, search])

  // Select all toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map((d) => d.id))
    }
  }

  // Row selection toggle
  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  // Copy helper
  const copyText = (txt: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(txt)
    toast(`Copied ${label} to clipboard`, 'info')
  }

  // Export to CSV
  const handleExport = () => {
    const list = selectedIds.length > 0
      ? records.filter((d) => selectedIds.includes(d.id))
      : filtered

    const headers = [
      'GST Record ID',
      'F. Year',
      'Month',
      'Franchisee Name',
      'Contact No',
      'Site ID',
      'ATM ID',
      'Location',
      'GST Number',
      'Invoice Number',
      'Invoice Amount',
      'TDS',
      'Paid Amount',
      'Payment Date',
      'UTR Number',
    ]

    const rows = list.map((g) => [
      g.id,
      g.fYear ? `F.Y. ${g.fYear}` : '',
      g.month,
      g.franchiseeName,
      g.contactNo,
      g.siteId,
      g.atmId,
      g.locationName,
      g.gstNumber,
      g.invoiceNumber,
      g.invoiceAmount,
      g.tds,
      g.paidAmount,
      g.paymentDate,
      g.utrNumber,
    ])

    downloadCsv(`Dexter_GST_Records_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`Exported ${list.length} GST records to CSV`)
  }

  // Format Date Helper
  const fmtDate = (dStr: string) => {
    if (!dStr) return '—'
    const d = new Date(dStr)
    return Number.isNaN(d.getTime()) ? dStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="mx-auto max-w-[1360px] pb-16">
      {/* Top Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#1E293B]">
            GST
          </h1>
          <p className="mt-0.5 text-[13px] text-[#64748B]">
            Track and manage franchisee GST invoices, deductions, net payouts and tax returns.
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

          <Button
            type="button"
            size="md"
            onClick={() => navigate('/finance/gst/new')}
            className="bg-[#0066FF] px-4 font-semibold text-white shadow-sm hover:bg-[#0052cc]"
          >
            <Plus size={16} className="mr-1.5" strokeWidth={2.5} /> Add GST Record
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
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
              placeholder="Search by Franchisee, Site ID, ATM ID, GST No, Invoice No, UTR..."
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
            {/* Financial Year */}
            <select
              value={fyFilter}
              onChange={(e) => setFyFilter(e.target.value)}
              className="h-9 rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12px] text-[#334155] outline-none focus:border-[#0066FF]"
            >
              <option value="all">All Financial Years</option>
              {FIN_YEARS.map((fy) => (
                <option key={fy} value={fy}>
                  F.Y. {fy}
                </option>
              ))}
            </select>

            {/* Month Filter */}
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="h-9 max-w-[150px] truncate rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12px] text-[#334155] outline-none focus:border-[#0066FF]"
            >
              <option value="all">All Months</option>
              {FY_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Reset Filters */}
            {(fyFilter !== 'all' || monthFilter !== 'all' || search) && (
              <button
                type="button"
                onClick={() => {
                  setFyFilter('all')
                  setMonthFilter('all')
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
            <span className="font-semibold">{selectedIds.length} GST records selected</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.length} selected GST records?`)) {
                    selectedIds.forEach((id) => deleteGst(id))
                    setSelectedIds([])
                    toast('Selected GST records deleted', 'info')
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
          <table className="w-full min-w-[1050px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-[#E2EEFB] bg-[#F8FAFD] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <th className="py-3.5 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded-sm border-gray-300 accent-[#0066FF]"
                  />
                </th>
                <th className="py-3.5 px-4 min-w-[270px]">Franchisee &amp; Site Details</th>
                <th className="py-3.5 px-4 min-w-[160px] whitespace-nowrap">Invoice &amp; Period</th>
                <th className="py-3.5 px-4 min-w-[170px] whitespace-nowrap">GST Number</th>
                <th className="py-3.5 px-4 min-w-[180px] whitespace-nowrap">Payment &amp; UTR Details</th>
                <th className="py-3.5 px-4 min-w-[140px] text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.length > 0 ? (
                filtered.map((g) => {
                  const isSelected = selectedIds.includes(g.id)
                  const initials = (g.franchiseeName || 'GS')
                    .trim()
                    .split(/\s+/)
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()

                  return (
                    <tr
                      key={g.id}
                      onClick={() => navigate(`/finance/gst/${g.id}`)}
                      className={cn(
                        'cursor-pointer transition-colors duration-150',
                        isSelected ? 'bg-[#EBF3FC]/60' : 'hover:bg-[#F8FAFD]',
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(g.id, e as any)}
                          className="h-4 w-4 rounded-sm border-gray-300 accent-[#0066FF]"
                        />
                      </td>

                      {/* Franchisee & Site Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#EAF2FD] text-[12px] font-bold text-[#0066FF] border border-[#DCE8F6]">
                            {initials || <Building2 size={16} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 font-bold text-[#1E293B]">
                              <span className="truncate">{g.franchiseeName || 'GST Franchisee'}</span>
                              {g.atmId && (
                                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#475569] border border-slate-200">
                                  {g.atmId}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#64748B] whitespace-nowrap">
                              <span className="font-medium text-[#334155]">{g.siteId || 'No Site ID'}</span>
                              {g.locationName && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span>{g.locationName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Invoice & Period */}
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          <div className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 font-mono text-[11.5px] font-semibold text-[#1E293B]">
                            <span>{g.invoiceNumber || g.id}</span>
                            <button
                              type="button"
                              onClick={(e) => copyText(g.invoiceNumber || g.id, 'Invoice Number', e)}
                              className="text-[#94A3B8] hover:text-[#0066FF] transition-colors"
                              title="Copy Invoice"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                          <div className="text-[10.5px] text-[#64748B]">
                            {g.month ? `${g.month} · ` : ''}{g.fYear ? `F.Y. ${g.fYear}` : '—'}
                          </div>
                        </div>
                      </td>

                      {/* GST Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          {g.gstNumber ? (
                            <div className="inline-flex items-center gap-1 font-mono text-[11.5px] font-medium text-[#1E293B]">
                              <span>{g.gstNumber}</span>
                              <button
                                type="button"
                                onClick={(e) => copyText(g.gstNumber, 'GST Number', e)}
                                className="text-[#94A3B8] hover:text-[#0066FF] transition-colors"
                                title="Copy GSTIN"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Not Registered</span>
                          )}
                          {g.sapCode && (
                            <div className="text-[10.5px] text-[#64748B] font-mono">
                              SAP: {g.sapCode}
                            </div>
                          )}
                        </div>
                      </td>


                      {/* Payment & UTR Details */}
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          <div className="text-[12px] font-medium text-[#1E293B] whitespace-nowrap">
                            Paid: {inr(g.paidAmount || '0')}
                            {g.paymentDate && (
                              <span className="ml-1.5 text-[11px] text-[#64748B] font-normal">
                                · {fmtDate(g.paymentDate)}
                              </span>
                            )}
                          </div>
                          {g.utrNumber ? (
                            <div className="inline-flex items-center gap-1 font-mono text-[11px] text-[#64748B]">
                              <span className="max-w-[130px] truncate">{g.utrNumber}</span>
                              <button
                                type="button"
                                onClick={(e) => copyText(g.utrNumber, 'UTR Number', e)}
                                className="text-[#94A3B8] hover:text-[#0066FF] transition-colors"
                                title="Copy UTR"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No UTR recorded</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/finance/gst/${g.id}`)}
                            className="h-7 text-[#0066FF] hover:bg-[#EAF2FD] text-[11.5px] font-semibold whitespace-nowrap px-2.5"
                          >
                            <Eye size={13} className="mr-1" /> View Details
                          </Button>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId(openMenuId === g.id ? null : g.id)
                              }
                              className="grid h-7 w-7 place-items-center rounded-md text-[#64748B] hover:bg-slate-100"
                            >
                              <MoreHorizontal size={15} />
                            </button>

                            {openMenuId === g.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-[#E2EEFB] bg-white py-1 text-[12px] shadow-lg text-left">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigate(`/finance/gst/${g.id}`)
                                      setOpenMenuId(null)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F8FAFD]"
                                  >
                                    <Eye size={13} /> View / Edit Record
                                  </button>
                                  {g.invoiceNumber && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        copyText(g.invoiceNumber, 'Invoice Number', e)
                                        setOpenMenuId(null)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F8FAFD]"
                                    >
                                      <Copy size={13} /> Copy Invoice No
                                    </button>
                                  )}
                                  {g.utrNumber && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        copyText(g.utrNumber, 'UTR Number', e)
                                        setOpenMenuId(null)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F8FAFD]"
                                    >
                                      <Copy size={13} /> Copy UTR Number
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (
                                        confirm(
                                          `Delete GST record ${g.id} for ${g.franchiseeName || 'this record'}? This cannot be undone.`,
                                        )
                                      ) {
                                        deleteGst(g.id)
                                        setOpenMenuId(null)
                                        toast(`Deleted GST record ${g.id}`, 'info')
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
                  <td colSpan={6} className="py-12 text-center">
                    <div className="mx-auto max-w-sm text-center">
                      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#EAF2FD] text-[#0066FF]">
                        <Users size={24} />
                      </div>
                      <h3 className="text-[14px] font-bold text-[#1E293B]">No GST records found</h3>
                      <p className="mt-1 text-[12px] text-[#64748B]">
                        Try adjusting your search query or filters to find what you're looking for.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => navigate('/finance/gst/new')}
                        className="mt-4 bg-[#0066FF] text-white"
                      >
                        <Plus size={14} className="mr-1" /> Add New GST Record
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info Bar */}
        <div className="flex items-center justify-between border-t border-[#E2EEFB] bg-[#F8FAFD] px-5 py-3 text-[12px] text-[#64748B]">
          <span>
            Showing <strong className="text-[#1E293B]">{filtered.length}</strong> of{' '}
            <strong className="text-[#1E293B]">{records.length}</strong> GST records
          </span>
          <span className="text-[11px] text-[#94A3B8]">
            Dexter ERP Finance · GST Ledger
          </span>
        </div>
      </div>
    </div>
  )
}
