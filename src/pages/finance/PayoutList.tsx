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
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'
import {
  deletePayout,
  maskAcc,
  payoutStore,
} from '@/data/financePayout'

export default function PayoutList() {
  const navigate = useNavigate()
  const records = payoutStore.use()

  // Filter States
  const [search, setSearch] = useState('')
  const [bankFilter, setBankFilter] = useState<string>('all')

  // Row Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Unique banks list for dropdown
  const uniqueBanks = useMemo(() => {
    const set = new Set<string>()
    records.forEach((r) => {
      if (r.bankName) set.add(r.bankName)
    })
    return Array.from(set).sort()
  }, [records])

  // Filter Logic
  const filtered = useMemo(() => {
    return records.filter((rec) => {
      // Bank Filter
      if (bankFilter !== 'all' && rec.bankName !== bankFilter) return false

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase()
        const match =
          (rec.panName || '').toLowerCase().includes(q) ||
          (rec.accName || '').toLowerCase().includes(q) ||
          (rec.atmId || '').toLowerCase().includes(q) ||
          (rec.loiCode || '').toLowerCase().includes(q) ||
          (rec.panNo || '').toLowerCase().includes(q) ||
          (rec.bankName || '').toLowerCase().includes(q) ||
          (rec.ifsc || '').toLowerCase().includes(q) ||
          (rec.accNo || '').includes(q) ||
          (rec.id || '').toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [records, bankFilter, search])

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
      'Payout ID',
      'LOI Code',
      'ATM ID',
      'PAN Name',
      'PAN No',
      'Settlement Account Name',
      'Settlement Account No',
      'Bank Name',
      'Email Subject',
    ]

    const rows = list.map((p) => [
      p.id,
      p.loiCode,
      p.atmId,
      p.panName,
      p.panNo,
      p.accName,
      p.accNo,
      p.bankName,
      p.emailSubject,
    ])

    downloadCsv(`Dexter_Payout_Accounts_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`Exported ${list.length} payout accounts to CSV`)
  }

  return (
    <div className="mx-auto max-w-[1360px] pb-16">
      {/* Top Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#1E293B]">
            Payouts
          </h1>
          <p className="mt-0.5 text-[13px] text-[#64748B]">
            Manage settlement accounts, PAN verification, bank routing and disbursement details.
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
            onClick={() => navigate('/finance/payout/new')}
            className="bg-[#0066FF] px-4 font-semibold text-white shadow-sm hover:bg-[#0052cc]"
          >
            <Plus size={16} className="mr-1.5" strokeWidth={2.5} /> Add Payout Account
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
              placeholder="Search by PAN Name, ATM ID, LOI Code, Bank, Account, IFSC..."
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
            {/* Bank Filter */}
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="h-9 max-w-[200px] truncate rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12px] text-[#334155] outline-none focus:border-[#0066FF]"
            >
              <option value="all">All Settlement Banks</option>
              {uniqueBanks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Reset Filters */}
            {(bankFilter !== 'all' || search) && (
              <button
                type="button"
                onClick={() => {
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
            <span className="font-semibold">{selectedIds.length} payout accounts selected</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.length} selected payout accounts?`)) {
                    selectedIds.forEach((id) => deletePayout(id))
                    setSelectedIds([])
                    toast('Selected payout accounts deleted', 'info')
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
                <th className="py-3.5 px-4 min-w-[270px]">Account Holder &amp; ATM Details</th>
                <th className="py-3.5 px-4 min-w-[150px] whitespace-nowrap">PAN Number</th>
                <th className="py-3.5 px-4 min-w-[160px] whitespace-nowrap">LOI Reference</th>
                <th className="py-3.5 px-4 min-w-[180px] whitespace-nowrap">Settlement Bank &amp; Account</th>
                <th className="py-3.5 px-4 min-w-[140px] text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.length > 0 ? (
                filtered.map((p) => {
                  const isSelected = selectedIds.includes(p.id)
                  const initials = (p.panName || 'PA')
                    .trim()
                    .split(/\s+/)
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()

                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/finance/payout/${p.id}`)}
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
                          onChange={(e) => toggleSelectRow(p.id, e as any)}
                          className="h-4 w-4 rounded-sm border-gray-300 accent-[#0066FF]"
                        />
                      </td>

                      {/* Account Holder & ATM */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#EAF2FD] text-[12px] font-bold text-[#0066FF] border border-[#DCE8F6]">
                            {initials || <Building2 size={16} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 font-bold text-[#1E293B]">
                              <span className="truncate">{p.panName || 'Payout Beneficiary'}</span>
                              {p.atmId && (
                                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#475569] border border-slate-200">
                                  {p.atmId}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#64748B] whitespace-nowrap">
                              <span className="font-medium text-[#334155]">{p.accName || 'Settlement Account'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* PAN Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          {p.panNo ? (
                            <div className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 font-mono text-[11.5px] font-semibold text-[#1E293B]">
                              <span>{p.panNo}</span>
                              <button
                                type="button"
                                onClick={(e) => copyText(p.panNo, 'PAN Number', e)}
                                className="text-[#94A3B8] hover:text-[#0066FF] transition-colors"
                                title="Copy PAN"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No PAN</span>
                          )}
                          <div className="text-[10.5px] text-[#64748B] font-mono">
                            {p.id}
                          </div>
                        </div>
                      </td>

                      {/* LOI Reference */}
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          {p.loiCode ? (
                            <div className="inline-flex items-center gap-1.5 font-mono text-[11.5px] font-medium text-[#1E293B]">
                              <span>{p.loiCode}</span>
                              <button
                                type="button"
                                onClick={(e) => copyText(p.loiCode, 'LOI Code', e)}
                                className="text-[#94A3B8] hover:text-[#0066FF] transition-colors"
                                title="Copy LOI"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No LOI</span>
                          )}
                          {p.emailSubject && (
                            <div className="text-[10.5px] text-[#64748B] truncate max-w-[140px]" title={p.emailSubject}>
                              {p.emailSubject}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Settlement Bank & Account */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-medium text-[#1E293B] text-[12.5px] whitespace-nowrap">
                            {p.bankName || '—'}
                          </div>
                          <div className="text-[11px] text-[#64748B] font-mono whitespace-nowrap">
                            {p.accNo ? maskAcc(p.accNo) : '—'}
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
                            onClick={() => navigate(`/finance/payout/${p.id}`)}
                            className="h-7 text-[#0066FF] hover:bg-[#EAF2FD] text-[11.5px] font-semibold whitespace-nowrap px-2.5"
                          >
                            <Eye size={13} className="mr-1" /> View Details
                          </Button>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId(openMenuId === p.id ? null : p.id)
                              }
                              className="grid h-7 w-7 place-items-center rounded-md text-[#64748B] hover:bg-slate-100"
                            >
                              <MoreHorizontal size={15} />
                            </button>

                            {openMenuId === p.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-[#E2EEFB] bg-white py-1 text-[12px] shadow-lg text-left">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigate(`/finance/payout/${p.id}`)
                                      setOpenMenuId(null)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F8FAFD]"
                                  >
                                    <Eye size={13} /> View / Edit Account
                                  </button>
                                  {p.panNo && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        copyText(p.panNo, 'PAN Number', e)
                                        setOpenMenuId(null)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F8FAFD]"
                                    >
                                      <Copy size={13} /> Copy PAN
                                    </button>
                                  )}
                                  {p.ifsc && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        copyText(p.ifsc, 'IFSC Code', e)
                                        setOpenMenuId(null)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F8FAFD]"
                                    >
                                      <Copy size={13} /> Copy IFSC
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (
                                        confirm(
                                          `Delete payout account ${p.id} for ${p.panName || 'this record'}? This cannot be undone.`,
                                        )
                                      ) {
                                        deletePayout(p.id)
                                        setOpenMenuId(null)
                                        toast(`Deleted payout account ${p.id}`, 'info')
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
                      <h3 className="text-[14px] font-bold text-[#1E293B]">No payout accounts found</h3>
                      <p className="mt-1 text-[12px] text-[#64748B]">
                        Try adjusting your search query or filters to find what you're looking for.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => navigate('/finance/payout/new')}
                        className="mt-4 bg-[#0066FF] text-white"
                      >
                        <Plus size={14} className="mr-1" /> Add New Payout Account
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
            <strong className="text-[#1E293B]">{records.length}</strong> payout accounts
          </span>
          <span className="text-[11px] text-[#94A3B8]">
            Dexter ERP Finance · Settlement Ledger
          </span>
        </div>
      </div>
    </div>
  )
}
