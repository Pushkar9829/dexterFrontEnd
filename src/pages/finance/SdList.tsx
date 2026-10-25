import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
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
  SD_BANKS,
  SD_PAYMENT_TYPES,
  inr,
} from '@/data/financeSd'
import {
  deleteSecurityDeposit,
  setSecurityDepositStatus,
  useSecurityDeposits,
} from '@/data/financeSdStore'

export default function SdList() {
  const navigate = useNavigate()
  const deposits = useSecurityDeposits()

  // Filter States
  const [search, setSearch] = useState('')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all')
  const [bankFilter, setBankFilter] = useState<string>('all')

  // Row Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Filter Logic
  const filtered = useMemo(() => {
    return deposits.filter((dep) => {
      // Payment Type filter
      if (paymentTypeFilter !== 'all' && dep.paymentType !== paymentTypeFilter) return false

      // Bank filter
      if (bankFilter !== 'all' && dep.frBankName !== bankFilter) return false

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase()
        const match =
          dep.franchiseeName.toLowerCase().includes(q) ||
          dep.franchiseeNo.includes(q) ||
          dep.siteId.toLowerCase().includes(q) ||
          dep.atmId.toLowerCase().includes(q) ||
          dep.txnNumber.toLowerCase().includes(q) ||
          dep.id.toLowerCase().includes(q) ||
          dep.receiptNo.toLowerCase().includes(q) ||
          dep.frBankName.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [deposits, paymentTypeFilter, bankFilter, search])

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
      ? deposits.filter((d) => selectedIds.includes(d.id))
      : filtered

    const headers = [
      'Deposit ID',
      'Receipt No',
      'Franchisee Name',
      'Contact No',
      'Site ID',
      'ATM ID',
      'Deposit Amount (INR)',
      'Payment Type',
      'Payment Date',
      'TXN Number',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'Branch',
    ]

    const rows = list.map((d) => [
      d.id,
      d.receiptNo,
      d.franchiseeName,
      d.franchiseeNo,
      d.siteId,
      d.atmId,
      d.amount,
      d.paymentType,
      d.paymentDate,
      d.txnNumber,
      d.frBankName,
      d.frAccount,
      d.frIfsc,
      d.branchName,
    ])

    downloadCsv(`Dexter_Security_Deposits_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`Exported ${list.length} security deposit records to CSV`)
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
            Security Deposit
          </h1>
          <p className="mt-0.5 text-[13px] text-[#64748B]">
            Track and manage franchisee security deposits, bank transfers, reconciliation, and refund status.
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

          {/* Primary Action Button: Add Security Deposit */}
          <Button
            type="button"
            size="md"
            onClick={() => navigate('/finance/sd/new')}
            className="bg-[#0066FF] px-4 font-semibold text-white shadow-sm hover:bg-[#0052cc]"
          >
            <Plus size={16} className="mr-1.5" strokeWidth={2.5} /> Add Security Deposit
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
              placeholder="Search by Franchisee Name, Site ID, ATM ID, TXN Number, Bank..."
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
            {/* Payment Type */}
            <select
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value)}
              className="h-9 rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12px] text-[#334155] outline-none focus:border-[#0066FF]"
            >
              <option value="all">All Payment Types</option>
              {SD_PAYMENT_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>

            {/* Bank Filter */}
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="h-9 max-w-[180px] truncate rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12px] text-[#334155] outline-none focus:border-[#0066FF]"
            >
              <option value="all">All Banks</option>
              {SD_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Reset Filters */}
            {(paymentTypeFilter !== 'all' || bankFilter !== 'all' || search) && (
              <button
                type="button"
                onClick={() => {
                  setPaymentTypeFilter('all')
                  setBankFilter('all')
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
            <span className="font-semibold">{selectedIds.length} deposits selected</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSecurityDepositStatus(selectedIds, 'Verified')
                  setSelectedIds([])
                  toast('Marked selected deposits as Verified!')
                }}
                className="h-7 border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 text-[11.5px]"
              >
                Approve &amp; Verify
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.length} selected security deposit records?`)) {
                    selectedIds.forEach((id) => deleteSecurityDeposit(id))
                    setSelectedIds([])
                    toast('Selected deposit records deleted', 'info')
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
                <th className="py-3.5 px-4 min-w-[280px]">Franchisee &amp; Site Details</th>
                <th className="py-3.5 px-4 min-w-[150px] whitespace-nowrap">Deposit ID</th>
                <th className="py-3.5 px-4 min-w-[140px] whitespace-nowrap">Amount &amp; Mode</th>
                <th className="py-3.5 px-4 min-w-[170px] whitespace-nowrap">Transaction Details</th>
                <th className="py-3.5 px-4 min-w-[150px] whitespace-nowrap">Bank &amp; Account</th>
                <th className="py-3.5 px-4 min-w-[140px] text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.length > 0 ? (
                filtered.map((dep) => {
                  const isSelected = selectedIds.includes(dep.id)
                  const initials = (dep.franchiseeName || 'SD')
                    .trim()
                    .split(/\s+/)
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()

                  return (
                    <tr
                      key={dep.id}
                      onClick={() => navigate(`/finance/sd/${dep.id}`)}
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
                          onChange={(e) => toggleSelectRow(dep.id, e as any)}
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
                              <span className="truncate">{dep.franchiseeName || 'Draft Deposit'}</span>
                              {dep.atmId && (
                                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#475569] border border-slate-200">
                                  {dep.atmId}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#64748B] whitespace-nowrap">
                              <span className="font-medium text-[#334155]">{dep.siteId || 'No Site Assigned'}</span>
                              {dep.franchiseeNo && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span>{dep.franchiseeNo}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Deposit ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          <div className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 font-mono text-[11.5px] font-semibold text-[#1E293B]">
                            <span>{dep.id}</span>
                            <button
                              type="button"
                              onClick={(e) => copyText(dep.id, 'Deposit ID', e)}
                              className="text-[#94A3B8] hover:text-[#0066FF] transition-colors"
                              title="Copy Deposit ID"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                          <div className="text-[10.5px] text-[#64748B] truncate max-w-[130px]">
                            {dep.depositCategory || 'Security Deposit'}
                          </div>
                        </div>
                      </td>

                      {/* Amount & Mode */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="font-bold text-[#1E293B] text-[13px] whitespace-nowrap">
                            {inr(dep.amount)}
                          </div>
                          <div>
                            <span
                              className={cn(
                                'inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                                dep.paymentType === 'NEFT' && 'bg-blue-50 text-blue-700 border border-blue-200',
                                dep.paymentType === 'RTGS' && 'bg-purple-50 text-purple-700 border border-purple-200',
                                dep.paymentType === 'IMPS' && 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                                dep.paymentType === 'Cheque' && 'bg-amber-50 text-amber-700 border border-amber-200',
                                dep.paymentType === 'UPI' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                                (dep.paymentType === 'Cash' || dep.paymentType === 'Direct Transfer') &&
                                'bg-slate-100 text-slate-700 border border-slate-200',
                              )}
                            >
                              {dep.paymentType}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Transaction Details (Date & TXN) */}
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          <div className="font-medium text-[#1E293B] text-[12.5px] whitespace-nowrap">
                            {fmtDate(dep.paymentDate)}
                          </div>
                          {dep.txnNumber ? (
                            <div className="inline-flex items-center gap-1 font-mono text-[11px] text-[#64748B]">
                              <span className="max-w-[120px] truncate">{dep.txnNumber}</span>
                              <button
                                type="button"
                                onClick={(e) => copyText(dep.txnNumber, 'TXN Number', e)}
                                className="text-[#94A3B8] hover:text-[#0066FF] transition-colors"
                                title="Copy TXN"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No TXN number</span>
                          )}
                        </div>
                      </td>

                      {/* Bank & Account */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-medium text-[#1E293B] text-[12.5px] whitespace-nowrap">
                            {dep.frBankName || '—'}
                          </div>
                          <div className="text-[11px] text-[#64748B] font-mono whitespace-nowrap">
                            {dep.frAccount ? `••••${dep.frAccount.slice(-4)}` : '—'}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/finance/sd/${dep.id}`)}
                            className="h-7 text-[#0066FF] hover:bg-[#EAF2FD] text-[11.5px] font-semibold whitespace-nowrap px-2.5"
                          >
                            <Eye size={13} className="mr-1" /> View Details
                          </Button>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId(openMenuId === dep.id ? null : dep.id)
                              }
                              className="grid h-7 w-7 place-items-center rounded-md text-[#64748B] hover:bg-slate-100"
                            >
                              <MoreHorizontal size={15} />
                            </button>

                            {openMenuId === dep.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-[#E2EEFB] bg-white py-1 text-[12px] shadow-lg text-left">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigate(`/finance/sd/${dep.id}`)
                                      setOpenMenuId(null)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F8FAFD]"
                                  >
                                    <Eye size={13} /> View / Edit Record
                                  </button>
                                  {dep.txnNumber && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        copyText(dep.txnNumber, 'TXN Number', e)
                                        setOpenMenuId(null)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F8FAFD]"
                                    >
                                      <Copy size={13} /> Copy TXN Number
                                    </button>
                                  )}
                                  {dep.status !== 'Verified' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSecurityDepositStatus([dep.id], 'Verified')
                                        setOpenMenuId(null)
                                        toast(`Deposit ${dep.id} approved and marked Verified!`)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-emerald-700 hover:bg-emerald-50"
                                    >
                                      <CheckCircle2 size={13} /> Mark Verified
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (
                                        confirm(
                                          `Delete security deposit ${dep.id} for ${dep.franchiseeName || 'this record'}? This cannot be undone.`,
                                        )
                                      ) {
                                        deleteSecurityDeposit(dep.id)
                                        setOpenMenuId(null)
                                        toast(`Deleted deposit ${dep.id}`, 'info')
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
                  <td colSpan={8} className="py-12 text-center">
                    <div className="mx-auto max-w-sm text-center">
                      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#EAF2FD] text-[#0066FF]">
                        <Users size={24} />
                      </div>
                      <h3 className="text-[14px] font-bold text-[#1E293B]">No deposits found</h3>
                      <p className="mt-1 text-[12px] text-[#64748B]">
                        Try adjusting your search query or filters to find what you're looking for.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => navigate('/finance/sd/new')}
                        className="mt-4 bg-[#0066FF] text-white"
                      >
                        <Plus size={14} className="mr-1" /> Add New Security Deposit
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
            <strong className="text-[#1E293B]">{deposits.length}</strong> deposit records
          </span>
          <span className="text-[11px] text-[#94A3B8]">
            Dexter ERP Finance · Security Deposit Ledger
          </span>
        </div>
      </div>
    </div>
  )
}
