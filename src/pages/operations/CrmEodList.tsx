import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  Smartphone,
  Search,
  Plus,
  Eye,
  Check,
  X,
  ArrowLeft,
  Home,
  Download,
} from 'lucide-react'
import { useCrmEodRequests, exportCrmRequestsCsv, type CrmEodRequest } from '@/data/eodStore'
import { SITES } from '@/data/cbrSites'
import { toast } from '@/components/ui/Toast'

export default function CrmEodList() {
  const { requests: crmRequests, addRequest, updateRequestStatus } = useCrmEodRequests()

  const [crmSearch, setCrmSearch] = useState('')
  const [crmStatusFilter, setCrmStatusFilter] = useState('all')
  const [showNewCrmModal, setShowNewCrmModal] = useState(false)
  const [selectedCrmReq, setSelectedCrmReq] = useState<CrmEodRequest | null>(null)

  // New CRM request form state
  const [newCrmAtmId, setNewCrmAtmId] = useState(SITES[0].atmId)
  const [newCrmDeposit, setNewCrmDeposit] = useState('250000')
  const [newCrmDispense, setNewCrmDispense] = useState('100000')
  const [newCrmMachine, setNewCrmMachine] = useState('Hitachi CRM 400')
  const [newCrmCra, setNewCrmCra] = useState('CMS Info Systems')
  const [newCrmRemarks, setNewCrmRemarks] = useState('')

  const filteredCrm = useMemo(() => {
    return crmRequests.filter((r) => {
      if (crmSearch) {
        const q = crmSearch.toLowerCase()
        if (!r.atmId.toLowerCase().includes(q) && !r.ticketNo.toLowerCase().includes(q) && !r.location.toLowerCase().includes(q)) {
          return false
        }
      }
      if (crmStatusFilter !== 'all' && r.status !== crmStatusFilter) return false
      return true
    })
  }, [crmRequests, crmSearch, crmStatusFilter])

  const handleCreateCrmRequest = (e: React.FormEvent) => {
    e.preventDefault()
    const siteObj = SITES.find((s) => s.atmId === newCrmAtmId) || SITES[0]
    const dep = Number(newCrmDeposit) || 0
    const disp = Number(newCrmDispense) || 0

    addRequest({
      atmId: siteObj.atmId,
      siteId: siteObj.siteId,
      location: siteObj.location,
      franchiseName: 'Shree Sai Financial Services',
      machineType: newCrmMachine,
      requestDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      requestTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      depositBalance: dep,
      dispenseBalance: disp,
      totalCash: dep + disp,
      counterClearStatus: 'Pending Clear',
      custodianName: 'Paras Dubey (Operations)',
      craAgency: newCrmCra,
      status: 'Pending Verification',
      remarks: newCrmRemarks.trim() || 'New CRM EOD request submitted.',
    })

    setShowNewCrmModal(false)
    toast(`CRM EOD Request submitted for ${siteObj.atmId}`)
  }

  return (
    <div className="w-full min-w-0 pb-16 font-sans space-y-5">
      {/* Breadcrumb: Home > Workspace > Operations > EOD > CRM EOD Request */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400 shrink-0" />
        <Link to="/operations" className="hover:text-[#0066FF] transition-colors">
          Operations
        </Link>
        <ChevronRight size={12} className="text-slate-400 shrink-0" />
        <Link to="/operations/eod" className="hover:text-[#0066FF] transition-colors">
          EOD
        </Link>
        <ChevronRight size={12} className="text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-800">CRM EOD Request</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-0.5">
        <div className="flex items-center gap-3">
          <Link
            to="/operations/eod"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
            title="Back to EOD Module"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Smartphone size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
                CRM EOD Request
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100/80 text-blue-800 border border-blue-200">
                Tab 03
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-[#64748B]">
              Submit and review Cash Recycler Machine EOD clearances, counter clearing tickets, and CRA reconciliation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportCrmRequestsCsv(filteredCrm)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#334155] hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <Download size={14} className="text-[#0066FF]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setShowNewCrmModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>New CRM EOD Request</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Requests
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">{crmRequests.length}</span>
          <span className="text-[11px] text-slate-400">CRM terminals</span>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
            Pending Verification
          </span>
          <span className="text-xl font-bold text-amber-700 mt-1 block">
            {crmRequests.filter((r) => r.status === 'Pending Verification').length}
          </span>
          <span className="text-[11px] text-amber-600">Awaiting ops signoff</span>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
            In Review
          </span>
          <span className="text-xl font-bold text-blue-700 mt-1 block">
            {crmRequests.filter((r) => r.status === 'In Review').length}
          </span>
          <span className="text-[11px] text-blue-600">Cash audit verification</span>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Approved & Cleared
          </span>
          <span className="text-xl font-bold text-emerald-700 mt-1 block">
            {crmRequests.filter((r) => r.status === 'Approved').length}
          </span>
          <span className="text-[11px] text-emerald-600">Reconciled counters</span>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
            Total Recycler Cash
          </span>
          <span className="text-xl font-bold text-indigo-700 mt-1 block">₹29.0 L</span>
          <span className="text-[11px] text-indigo-600">Settled balances</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Ticket No, ATM ID, location..."
              value={crmSearch}
              onChange={(e) => setCrmSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[12.5px] focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <select
            value={crmStatusFilter}
            onChange={(e) => setCrmStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-[12px] font-medium text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="In Review">In Review</option>
            <option value="Approved">Approved</option>
          </select>
        </div>

        <div className="text-[12px] text-slate-500">
          Total Requests: <strong>{filteredCrm.length}</strong>
        </div>
      </div>

      {/* CRM Requests Table */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-left border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10.5px] font-bold uppercase tracking-wider text-[#475569]">
                <th className="py-2.5 px-3 text-center w-10">S.N.</th>
                <th className="py-2.5 px-3">Ticket No</th>
                <th className="py-2.5 px-3">Request Date</th>
                <th className="py-2.5 px-3">ATM ID</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Machine Type</th>
                <th className="py-2.5 px-3 text-right">Deposited</th>
                <th className="py-2.5 px-3 text-right">Dispensed</th>
                <th className="py-2.5 px-3 text-right">Total Balance</th>
                <th className="py-2.5 px-3 text-center">Counters</th>
                <th className="py-2.5 px-3">CRA Agency</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#334155]">
              {filteredCrm.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{i + 1}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap font-bold text-[#0066FF]">{r.ticketNo}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                    {r.requestDate} <span className="text-slate-400 text-[10.5px]">({r.requestTime})</span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap font-bold text-[#1E293B]">{r.atmId}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">{r.location}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">{r.machineType}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap font-medium text-slate-800">
                    ₹{r.depositBalance.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap font-medium text-slate-800">
                    ₹{r.dispenseBalance.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap font-bold text-slate-900">
                    ₹{r.totalCash.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        r.counterClearStatus === 'Cleared'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {r.counterClearStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">{r.craAgency}</td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {r.status === 'Approved' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
                        Approved
                      </span>
                    )}
                    {r.status === 'Pending Verification' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Pending Verification
                      </span>
                    )}
                    {r.status === 'In Review' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-[#0066FF] border border-blue-200">
                        In Review
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCrmReq(r)}
                        title="View details"
                        className="p-1 rounded text-[#0066FF] hover:bg-blue-50 cursor-pointer"
                      >
                        <Eye size={15} />
                      </button>
                      {r.status !== 'Approved' && (
                        <button
                          type="button"
                          onClick={() => {
                            updateRequestStatus(r.id, 'Approved')
                            toast(`CRM Request ${r.ticketNo} approved! Counters cleared.`)
                          }}
                          title="Approve request"
                          className="p-1 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                        >
                          <Check size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: New CRM EOD Request */}
      {showNewCrmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-[#0066FF]" />
                <h3 className="text-[15px] font-bold text-slate-900">
                  New CRM EOD Request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCrmModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCrmRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                  ATM / CRM ID *
                </label>
                <select
                  value={newCrmAtmId}
                  onChange={(e) => setNewCrmAtmId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-[13px] text-slate-800 focus:border-[#0066FF] focus:outline-hidden"
                >
                  {SITES.map((s) => (
                    <option key={s.atmId} value={s.atmId}>
                      {s.atmId} — {s.location} ({s.model})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    Machine Model
                  </label>
                  <select
                    value={newCrmMachine}
                    onChange={(e) => setNewCrmMachine(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-[12.5px] text-slate-800 focus:border-[#0066FF] focus:outline-hidden"
                  >
                    <option value="Hitachi CRM 400">Hitachi CRM 400</option>
                    <option value="Hitachi Cash Recycler 300">Hitachi Cash Recycler 300</option>
                    <option value="Diebold Recycler">Diebold Recycler</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    CRA Agency
                  </label>
                  <select
                    value={newCrmCra}
                    onChange={(e) => setNewCrmCra(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-[12.5px] text-slate-800 focus:border-[#0066FF] focus:outline-hidden"
                  >
                    <option value="CMS Info Systems">CMS Info Systems</option>
                    <option value="SIS Prosegur">SIS Prosegur</option>
                    <option value="Writer Safeguard">Writer Safeguard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    Deposit Balance (₹) *
                  </label>
                  <input
                    type="number"
                    value={newCrmDeposit}
                    onChange={(e) => setNewCrmDeposit(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-[13px] text-slate-800 focus:border-[#0066FF] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    Dispense Balance (₹) *
                  </label>
                  <input
                    type="number"
                    value={newCrmDispense}
                    onChange={(e) => setNewCrmDispense(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-[13px] text-slate-800 focus:border-[#0066FF] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                  Remarks / Clearance Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter remarks or counter audit notes..."
                  value={newCrmRemarks}
                  onChange={(e) => setNewCrmRemarks(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-[12.5px] text-slate-800 focus:border-[#0066FF] focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewCrmModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#0066FF] hover:bg-[#0052CC] px-5 py-2 text-[12.5px] font-semibold text-white cursor-pointer shadow-sm"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Selected CRM Request Details */}
      {selectedCrmReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-[#0066FF]" />
                <h3 className="text-[15px] font-bold text-slate-900">
                  {selectedCrmReq.ticketNo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCrmReq(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-[12.5px]">
                <div>
                  <span className="text-slate-400 block text-[11px]">ATM ID</span>
                  <span className="font-bold text-slate-800">{selectedCrmReq.atmId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Machine Type</span>
                  <span className="font-semibold text-slate-800">{selectedCrmReq.machineType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Location</span>
                  <span className="text-slate-800">{selectedCrmReq.location}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">CRA Agency</span>
                  <span className="text-slate-800">{selectedCrmReq.craAgency}</span>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-[12.5px] space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Deposit Counter Balance:</span>
                  <strong className="text-slate-800">₹{selectedCrmReq.depositBalance.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Dispense Counter Balance:</span>
                  <strong className="text-slate-800">₹{selectedCrmReq.dispenseBalance.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-200/60 font-bold text-[14px]">
                  <span className="text-[#0066FF]">Total Terminal Cash:</span>
                  <span className="text-[#0066FF]">₹{selectedCrmReq.totalCash.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="text-[12px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p><strong>Remarks:</strong> {selectedCrmReq.remarks}</p>
                <p className="mt-1"><strong>Status:</strong> {selectedCrmReq.status} • <strong>Counter:</strong> {selectedCrmReq.counterClearStatus}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-3.5 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setSelectedCrmReq(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              {selectedCrmReq.status !== 'Approved' && (
                <button
                  type="button"
                  onClick={() => {
                    updateRequestStatus(selectedCrmReq.id, 'Approved')
                    setSelectedCrmReq(null)
                    toast(`Approved CRM EOD Request ${selectedCrmReq.ticketNo}`)
                  }}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-[12.5px] font-semibold text-white cursor-pointer shadow-xs"
                >
                  Approve Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

