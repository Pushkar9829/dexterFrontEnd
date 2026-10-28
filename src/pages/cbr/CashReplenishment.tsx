import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  Home,
  LayoutGrid,
  Plus,
  RotateCcw,
  Scan,
  Search,
  Trash2,
  User,
  Building2,
} from 'lucide-react'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'
import CashReplenishmentForm from './CashReplenishmentForm'

interface CBRRow {
  no: number
  date: string
  atmId: string
  mfName: string
  indentNo: string
  eodTime: string
  openingBalance: number
  dispense: number
  purgeBin: number
  overage: number
  shortage: number
  physicalCash: number
  loading: number
  closingBalance: number
  remarks: string
  switchBalance: number
}

// Generate 31 records matching Image 01
const INITIAL_RECORDS: CBRRow[] = Array.from({ length: 31 }, (_, i) => {
  const rowNo = i + 1
  return {
    no: rowNo,
    date: '18-10-2026',
    atmId: '0',
    mfName: 'FR',
    indentNo: '0',
    eodTime: '00:00',
    openingBalance: 0,
    dispense: 0,
    purgeBin: 0,
    overage: 0,
    shortage: 0,
    physicalCash: 0,
    loading: 0,
    closingBalance: 0,
    remarks: '0',
    switchBalance: 0,
  }
})

export default function CashReplenishment() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentView = searchParams.get('view') || 'list'

  // View state: 'list' (Page 01) or 'form' (Page 02)
  const setView = (view: 'list' | 'form') => {
    setSearchParams({ view })
  }

  // Selected row for editing/viewing in form
  const [selectedRecord, setSelectedRecord] = useState<CBRRow | null>(null)

  // Filter states matching Image 01
  const [fromDate, setFromDate] = useState('01-10-2026')
  const [toDate, setToDate] = useState('18-10-2026')
  const [selectedAtm, setSelectedAtm] = useState('Select ATM ID')
  const [selectedMf, setSelectedMf] = useState('Select MF Name')
  const [selectedFranchise, setSelectedFranchise] = useState('Select Franchise')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // Records state
  const [records, setRecords] = useState<CBRRow[]>(INITIAL_RECORDS)
  const [exportOpen, setExportOpen] = useState(false)

  // Filter application
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedAtm !== 'Select ATM ID' && r.atmId !== selectedAtm && selectedAtm !== 'MBP13124') {
        return false
      }
      if (selectedMf !== 'Select MF Name' && r.mfName !== selectedMf) {
        return false
      }
      return true
    })
  }, [records, selectedAtm, selectedMf])

  // Pagination slice
  const totalRecords = filteredRecords.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, currentPage, pageSize])

  const handleSearch = () => {
    setCurrentPage(1)
    toast(`Found ${filteredRecords.length} records matching criteria`, 'info')
  }

  const handleReset = () => {
    setFromDate('01-10-2026')
    setToDate('18-10-2026')
    setSelectedAtm('Select ATM ID')
    setSelectedMf('Select MF Name')
    setSelectedFranchise('Select Franchise')
    setCurrentPage(1)
    setRecords(INITIAL_RECORDS)
    toast('Filters reset to default', 'info')
  }

  const handleViewRow = (row: CBRRow) => {
    setSelectedRecord(row)
    setView('form')
    toast(`Viewing CBR record #${row.no} (${row.date})`, 'info')
  }

  const handleEditRow = (row: CBRRow) => {
    setSelectedRecord(row)
    setView('form')
    toast(`Editing CBR replenishment for record #${row.no}`, 'info')
  }

  const handleDeleteRow = (rowNo: number) => {
    setRecords((prev) => prev.filter((r) => r.no !== rowNo))
    toast(`Record #${rowNo} deleted successfully`, 'success')
  }

  const handleDownloadRow = (row: CBRRow) => {
    const headers = [
      'No',
      'Date',
      'ATM ID',
      'MF Name',
      'Indent No',
      'EOD Time',
      'Opening Balance',
      'Dispense',
      'Purge Bin',
      'Overage',
      'Shortage',
      'Physical Cash',
      'Loading',
      'Closing Balance',
      'Remarks',
      'Switch Balance',
    ]

    const data = [
      [
        String(row.no),
        row.date,
        row.atmId,
        row.mfName,
        row.indentNo,
        row.eodTime,
        String(row.openingBalance),
        String(row.dispense),
        String(row.purgeBin),
        String(row.overage),
        String(row.shortage),
        String(row.physicalCash),
        String(row.loading),
        String(row.closingBalance),
        row.remarks,
        String(row.switchBalance),
      ],
    ]

    downloadCsv(`cbr-record-${row.no}-${row.date}`, headers, data)
    toast(`Record #${row.no} exported successfully`, 'success')
  }

  const handleExport = (format: 'csv' | 'xlsx' = 'csv') => {
    setExportOpen(false)
    const headers = [
      'No',
      'Date',
      'ATM ID',
      'MF Name',
      'Indent No',
      'EOD Time',
      'Opening Balance',
      'Dispense',
      'Purge Bin',
      'Overage',
      'Shortage',
      'Physical Cash',
      'Loading',
      'Closing Balance',
      'Remarks',
      'Switch Balance',
    ]

    const rows = filteredRecords.map((r) => [
      String(r.no),
      r.date,
      r.atmId,
      r.mfName,
      r.indentNo,
      r.eodTime,
      String(r.openingBalance),
      String(r.dispense),
      String(r.purgeBin),
      String(r.overage),
      String(r.shortage),
      String(r.physicalCash),
      String(r.loading),
      String(r.closingBalance),
      r.remarks,
      String(r.switchBalance),
    ])

    downloadCsv(`consolidated-cbr-report-MBP13124-${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`Consolidated CBR report exported successfully (${format.toUpperCase()})`, 'success')
  }

  // If view is 'form', render Page 02
  if (currentView === 'form') {
    return (
      <CashReplenishmentForm
        initialData={selectedRecord}
        onBack={() => {
          setSelectedRecord(null)
          setView('list')
        }}
        onSave={() => {
          setSelectedRecord(null)
          setView('list')
        }}
      />
    )
  }

  // Otherwise render Page 01: Consolidated CBR Report
  return (
    <div className="space-y-4 pb-16 max-w-[1440px]">
      {/* Breadcrumb matching other pages: Workspace > Operations > CBR > Consolidated CBR Report */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/operations" className="hover:text-[#0066FF] transition-colors">
          Operations
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/cbr" className="hover:text-[#0066FF] transition-colors">
          CBR
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">
          Consolidated CBR Report
        </span>
      </div>

      {/* Header Bar: Icon + Consolidated CBR Report + (+ CBR Button) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-sm shrink-0">
            <LayoutGrid size={20} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              Consolidated CBR Report
            </h1>
          </div>
        </div>

        {/* Page Switcher / Actions */}
        <div className="flex items-center gap-2.5">
          {/* Direct + CBR button matching Image 01 with black border callout indicator */}
          <button
            type="button"
            onClick={() => {
              setSelectedRecord(null)
              setView('form')
            }}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-bold transition-all shadow-sm hover:shadow cursor-pointer border border-[#0066FF]"
            title="Open Daily ATM Cash Loading / Replenishment / CBR Form"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New CBR</span>
          </button>
        </div>
      </div>

      {/* Filter Card matching Image 01 */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-7 gap-3.5 items-end">
          {/* From Date * */}
          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              From Date <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Calendar
                size={14}
                className="absolute left-3 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="DD-MM-YYYY"
                className="w-full h-9.5 pl-9 pr-3 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-800 bg-white focus:border-[#0066FF] outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* To Date * */}
          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              To Date <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Calendar
                size={14}
                className="absolute left-3 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="DD-MM-YYYY"
                className="w-full h-9.5 pl-9 pr-3 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-800 bg-white focus:border-[#0066FF] outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* ATM ID */}
          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              ATM ID
            </label>
            <div className="relative">
              <Scan
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={selectedAtm}
                onChange={(e) => setSelectedAtm(e.target.value)}
                className="w-full h-9.5 pl-9 pr-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none shadow-2xs appearance-none"
              >
                <option value="Select ATM ID">Select ATM ID</option>
                <option value="MBP13124">MBP13124</option>
                <option value="DX-MH-01482">DX-MH-01482</option>
                <option value="DX-MH-01497">DX-MH-01497</option>
                <option value="DX-GJ-02187">DX-GJ-02187</option>
                <option value="DX-KA-00761">DX-KA-00761</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* MF Name */}
          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              MF Name
            </label>
            <div className="relative">
              <User
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={selectedMf}
                onChange={(e) => setSelectedMf(e.target.value)}
                className="w-full h-9.5 pl-9 pr-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none shadow-2xs appearance-none"
              >
                <option value="Select MF Name">Select MF Name</option>
                <option value="FR">FR</option>
                <option value="MF-North">MF-North</option>
                <option value="MF-West">MF-West</option>
                <option value="MF-South">MF-South</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Franchise Firm Name */}
          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Franchise Firm Name
            </label>
            <div className="relative">
              <Building2
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={selectedFranchise}
                onChange={(e) => setSelectedFranchise(e.target.value)}
                className="w-full h-9.5 pl-9 pr-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none shadow-2xs appearance-none"
              >
                <option value="Select Franchise">Select Franchise</option>
                <option value="Shree Sai Financial Services">
                  Shree Sai Financial Services
                </option>
                <option value="Patel Cash Solutions">Patel Cash Solutions</option>
                <option value="Namma ATM Network">Namma ATM Network</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Action Buttons: Search + Reset */}
          <div className="col-span-1 sm:col-span-2 xl:col-span-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSearch}
              className="flex-1 h-9.5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Search size={14} />
              <span>Search</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 h-9.5 inline-flex items-center justify-center gap-2 rounded-lg border border-[#0066FF] text-[#0066FF] hover:bg-blue-50/60 bg-white text-[12.5px] font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table Section Card matching Image 01 + Action Column */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Top Header: Green Spreadsheet Icon + Consolidated report for ATM MBP13124 + Total Records : 31 + Export */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={18} />
            </div>
            <h2 className="text-[14px] sm:text-[15px] font-bold text-slate-800">
              Consolidated report for ATM MBP13124
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] font-bold text-slate-700">
              Total Records : {totalRecords}
            </span>

            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 h-8.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-2xs cursor-pointer"
              >
                <Download size={13} className="text-[#0066FF]" />
                <span>Export</span>
                <ChevronDown size={12} className="text-slate-400" />
              </button>

              {exportOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 text-[12px]">
                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium"
                  >
                    Export as CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('xlsx')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium"
                  >
                    Export as Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 16-Column Table matching Image 01 + Sticky Action Column */}
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full border-collapse text-left text-[11.5px]">
            <thead>
              <tr className="border-b border-blue-100 bg-[#EAF2FD] text-[11px] font-bold text-slate-800 whitespace-nowrap">
                <th className="py-2.5 px-3 text-center w-12 border-r border-blue-100/60">
                  No
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[95px]">
                  Date
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[70px]">
                  ATM ID
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[70px]">
                  MF Name
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[75px]">
                  Indent No
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[75px]">
                  EOD Time
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[85px]">
                  Opening Balance
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[75px]">
                  Dispense
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[75px]">
                  Purge Bin
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[70px]">
                  Overage
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[70px]">
                  Shortage
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[85px]">
                  Physical Cash
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[70px]">
                  Loading
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[85px]">
                  Closing Balance
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[70px]">
                  Remarks
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[85px]">
                  Switch Balance
                </th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap sticky right-0 bg-[#EAF2FD] shadow-[-2px_0_4px_rgba(0,0,0,0.04)] min-w-[90px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={17}
                    className="py-12 text-center text-slate-400 text-[13px]"
                  >
                    No records found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => (
                  <tr
                    key={r.no}
                    className="group hover:bg-blue-50/30 transition-colors text-center whitespace-nowrap"
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100">
                      {r.no}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-100">
                      {r.date}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                      {r.atmId}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 border-r border-slate-100">
                      {r.mfName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                      {r.indentNo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                      {r.eodTime}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                      {r.openingBalance}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                      {r.dispense}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                      {r.purgeBin}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                      {r.overage}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                      {r.shortage}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                      {r.physicalCash}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                      {r.loading}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                      {r.closingBalance}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                      {r.remarks}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                      {r.switchBalance}
                    </td>
                    {/* Action column at the end of table in the list */}
                    <td className="py-2 px-3 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-[#f6faff] shadow-[-2px_0_4px_rgba(0,0,0,0.04)]">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewRow(r)}
                          className="p-1 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="View Daily CBR"
                        >
                          <Eye size={13.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditRow(r)}
                          className="p-1 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Edit Replenishment"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(r.no)}
                          className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 size={13.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer matching Image 01 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-slate-100 text-[12px] text-slate-600 bg-white">
          {/* Show 15 entries */}
          <div className="flex items-center gap-2">
            <span>Show</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-8 pl-2.5 pr-6 rounded border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none appearance-none cursor-pointer"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
            <span>entries</span>
          </div>

          {/* Showing 1 to 15 of 31 entries + Buttons < 1 2 3 > */}
          <div className="flex items-center gap-3">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords}{' '}
              entries
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, idx) => {
                const pageNum = idx + 1
                const isActive = pageNum === currentPage
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`inline-flex items-center justify-center w-7 h-7 rounded text-[12px] font-semibold transition-colors cursor-pointer ${isActive
                        ? 'bg-[#0066FF] text-white shadow-2xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
