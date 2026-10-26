import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  Download,
  Filter,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Settings,
  User,
  CreditCard,
  Edit2,
} from 'lucide-react'
import {
  useTxnStore,
  exportWeeklyCsv,
  WEEK_DATES,
  PARTICULAR_LABELS,
} from '@/data/txnData'
import { toast } from '@/components/ui/Toast'

export default function TxnDataList() {
  const navigate = useNavigate()
  const { records } = useTxnStore()

  // Filter states
  const [startDate, setStartDate] = useState('16/10/2026')
  const [endDate, setEndDate] = useState('22/10/2026')
  const [filterSiteId, setFilterSiteId] = useState('')
  const [filterAtmId, setFilterAtmId] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [filterFrName, setFilterFrName] = useState('')

  // Applied filter
  const [appliedAtmId, setAppliedAtmId] = useState<string>('ATM-100234')
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Unique options for filter selects
  const siteOptions = useMemo(() => [...new Set(records.map((r) => r.siteId))], [records])
  const atmOptions = useMemo(() => [...new Set(records.map((r) => r.atmId))], [records])
  const modelOptions = useMemo(() => [...new Set(records.map((r) => r.model))], [records])
  const frOptions = useMemo(() => [...new Set(records.map((r) => r.name))], [records])

  const handleSearch = () => {
    setAppliedAtmId(filterAtmId)
    setCurrentPage(1)
    toast('Filters applied to weekly report')
  }

  const handleReset = () => {
    setStartDate('16/10/2026')
    setEndDate('22/10/2026')
    setFilterSiteId('')
    setFilterAtmId('')
    setFilterModel('')
    setFilterFrName('')
    setAppliedAtmId('')
    setCurrentPage(1)
    toast('Filters reset')
  }

  // Active record to display in the weekly particulars table
  const selectedRecord = useMemo(() => {
    if (appliedAtmId) {
      return records.find((r) => r.atmId === appliedAtmId)
    }
    if (filterSiteId) {
      return records.find((r) => r.siteId === filterSiteId)
    }
    if (filterFrName) {
      return records.find((r) => r.name === filterFrName)
    }
    return records[0]
  }, [records, appliedAtmId, filterSiteId, filterFrName])

  const handleDownload = () => {
    if (!selectedRecord) {
      toast('No transaction record selected')
      return
    }
    exportWeeklyCsv(selectedRecord, `weekly-txn-report-${selectedRecord.atmId}`)
    toast(`Weekly report exported for ${selectedRecord.atmId}`)
  }

  const totalRecords = selectedRecord ? 11 : 0

  return (
    <div className="space-y-4 pb-12 max-w-[1500px]">
      {/* Breadcrumb matching Page 01: Workspace > Reports & MIS > TXNs Data History > Weekly Report */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/reports" className="hover:text-[#0066FF] transition-colors">
          Reports & MIS
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="text-slate-600">TXNs Data History</span>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Weekly Report</span>
      </div>

      {/* Header with Title, Subtitle, and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-[24px] sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              TXNs Data History - Weekly Report
            </h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              View transaction count and amount for each ATM with date-wise (weekly) details.
            </p>
          </div>
        </div>

        {/* Right Buttons: + TXN Data, Add Filter Option, Download */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Prominent + TXN Data Button matching Page 01 */}
          <button
            type="button"
            onClick={() => navigate('/operations/txn-data/new')}
            className="inline-flex items-center gap-2 h-9.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow"
          >
            <Plus size={16} strokeWidth={2.6} className="text-white" />
            <span>TXN Data</span>
          </button>

          <button
            type="button"
            onClick={() => toast('Filter options already expanded below')}
            className="inline-flex items-center gap-1.5 h-9.5 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-xs"
          >
            <Filter size={14} className="text-[#0066FF]" />
            <span>Add Filter Option</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 h-9.5 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-xs"
          >
            <Download size={14} className="text-[#0066FF]" />
            <span>Download</span>
            <ChevronDown size={13} className="text-slate-400 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Filter Card matching Page 01 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3.5">
          <div className="w-7 h-7 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-xs">
            <Filter size={15} />
          </div>
          <h2 className="text-[14px] font-bold text-slate-900">Filter</h2>
          <span className="text-[12px] text-slate-500 hidden sm:inline">
            Use below filters to generate the weekly TXNs report.
          </span>
        </div>

        {/* 6 Filter inputs in grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* 1. Week Start Date * */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Week Start Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>

          {/* 2. Week End Date * */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Week End Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>

          {/* 3. Site ID */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Site ID</label>
            <div className="relative">
              <MapPin
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterSiteId}
                onChange={(e) => setFilterSiteId(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">All Sites</option>
                {siteOptions.map((sid) => (
                  <option key={sid} value={sid}>
                    {sid}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* 4. ATM ID */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">ATM ID</label>
            <div className="relative">
              <CreditCard
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterAtmId}
                onChange={(e) => setFilterAtmId(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">All ATM</option>
                {atmOptions.map((aid) => (
                  <option key={aid} value={aid}>
                    {aid}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* 5. Model */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Model</label>
            <div className="relative">
              <Settings
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">All Models</option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* 6. FR Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">FR Name</label>
            <div className="relative">
              <User
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterFrName}
                onChange={(e) => setFilterFrName(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">All Franchisee</option>
                {frOptions.map((fr) => (
                  <option key={fr} value={fr}>
                    {fr}
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

        {/* Filter Action Buttons */}
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
        </div>
      </div>

      {/* Table Card ("TXNs Data History - Weekly Report (16 Oct 2026 - 22 Oct 2026)") */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3.5 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <BarChart3 size={16} />
            </div>
            <h2 className="text-[14px] sm:text-[15px] font-bold text-slate-900 leading-tight">
              TXNs Data History - Weekly Report (16 Oct 2026 - 22 Oct 2026)
            </h2>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {selectedRecord && (
              <button
                type="button"
                onClick={() => navigate(`/operations/txn-data/${selectedRecord.atmId}`)}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0066FF] hover:underline mr-1"
              >
                <Edit2 size={13} /> Edit Daily Data
              </button>
            )}

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

        {/* Table View matching Page 01 */}
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-[11px] text-slate-700 border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#1D58A7] text-white font-bold border-b border-blue-900 text-center">
                <th className="py-2.5 px-3 border-r border-blue-400/30 whitespace-nowrap w-12">
                  S.N.
                </th>
                <th className="py-2.5 px-3 border-r border-blue-400/30 whitespace-nowrap min-w-[110px]">
                  ATM ID
                </th>
                <th className="py-2.5 px-3 border-r border-blue-400/30 whitespace-nowrap min-w-[160px] text-left">
                  FR Name
                </th>
                <th className="py-2.5 px-3 border-r border-blue-400/30 whitespace-nowrap min-w-[210px] text-left">
                  Particulars
                </th>
                {WEEK_DATES.map((d) => (
                  <th
                    key={d.date}
                    className="py-2 px-3 border-r border-blue-400/30 whitespace-nowrap min-w-[95px]"
                  >
                    <div>{d.date}</div>
                    <div className="text-[10px] text-blue-200 font-medium">{d.day}</div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {selectedRecord ? (
                PARTICULAR_LABELS.map((item, idx) => (
                  <tr
                    key={item.key}
                    className="border-b border-slate-100 hover:bg-blue-50/25 transition-colors text-center"
                  >
                    {/* S.N. (1 to 11) */}
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-500">
                      {idx + 1}
                    </td>

                    {/* ATM ID on row 0 or each row */}
                    <td className="py-2.5 px-3 border-r border-slate-100 font-semibold text-[#0066FF] whitespace-nowrap">
                      {idx === 0 ? (
                        <button
                          onClick={() => navigate(`/operations/txn-data/${selectedRecord.atmId}`)}
                          className="hover:underline font-bold"
                          title="Open Daily TXN Form"
                        >
                          {selectedRecord.atmId}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[10px]">—</span>
                      )}
                    </td>

                    {/* FR Name */}
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-800 text-left whitespace-nowrap">
                      {idx === 0 ? selectedRecord.name : <span className="text-slate-400 text-[10px]">—</span>}
                    </td>

                    {/* Particulars */}
                    <td className="py-2.5 px-3 border-r border-slate-100 font-semibold text-slate-800 text-left whitespace-nowrap bg-slate-50/50">
                      {item.label}
                    </td>

                    {/* Weekly date columns */}
                    {WEEK_DATES.map((d) => {
                      const val = selectedRecord.dailyValues[d.date]?.[item.key]
                      return (
                        <td
                          key={d.date}
                          className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap font-medium text-slate-700"
                        >
                          {val || '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))
              ) : (
                /* Empty state matching 0 records */
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No transaction records found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination matching Page 01 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3 border-t border-slate-200 bg-white gap-3">
          <div className="text-[12px] text-slate-500">
            {totalRecords === 0
              ? 'Showing 0 to 0 of 0 records'
              : `Showing 1 to ${totalRecords} of ${totalRecords} records`}
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 opacity-50 cursor-not-allowed"
              title="First Page"
            >
              <ChevronsLeft size={13} />
            </button>
            <button
              disabled
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 opacity-50 cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft size={13} />
            </button>

            <button className="w-7 h-7 rounded bg-[#0066FF] text-white text-[12px] font-semibold flex items-center justify-center shadow-xs">
              {currentPage}
            </button>

            <button
              disabled
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 opacity-50 cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight size={13} />
            </button>
            <button
              disabled
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 opacity-50 cursor-not-allowed"
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
