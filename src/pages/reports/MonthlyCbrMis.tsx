import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpDown,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Home,
  RotateCcw,
  Search,
  SlidersHorizontal,
  User,
  Users,
  X,
} from 'lucide-react'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'

interface MonthlyCbrRow {
  sn: number
  atmId: string
  dateTime: string
  denomination: string
  opening: number
  openingAmount: number
  dispense: number
  dispenseAmount: number
  purgeBin: number
  purgeBinAmount: number
  cassettes: number
  cassettesAmount: number
  // New fields from Image 2
  overage: number
  overageAmount: number
  shortage: number
  shortageAmount: number
  physicalBefore: number
  physicalBeforeAmount: number
  deposit: number
  depositAmount: number
  loading: number
  loadingAmount: number
  closing: number
  closingAmount: number
  switchCounter: string | number
  switchCounterAmount: string | number
  remark: string
  issuedIndent: string
  withdrawalIndent: string
  loadedAmount: string | number
  cashInHand: string | number
  isTotal?: boolean
}

// 48 records across 10 ATMs matching Image 1 and Image 2
const RAW_ATMS = [
  {
    atmId: 'MPZ06956',
    dateTime: '25-10-2026 09:30',
    indent: 'IND-06956-01',
    withIndent: 'WTH-06956-01',
    cashHand: 150000,
    denos: [
      { d: '2000', open: 10, disp: 5, purge: 0, cass: 8, phys: 0, load: 0, close: 0 },
      { d: '500', open: 200, disp: 42, purge: 6, cass: 180, phys: 1988, load: 0, close: 1988 },
      { d: '200', open: 320, disp: 110, purge: 12, cass: 298, phys: 515, load: 0, close: 515 },
      { d: '100', open: 860, disp: 310, purge: 14, cass: 790, phys: 68, load: 0, close: 68 },
    ],
  },
  {
    atmId: 'MPZ14526',
    dateTime: '25-10-2026 11:20',
    indent: 'IND-14526-02',
    withIndent: 'WTH-14526-01',
    cashHand: 220000,
    denos: [
      { d: '2000', open: 15, disp: 8, purge: 0, cass: 12, phys: 0, load: 0, close: 0 },
      { d: '500', open: 180, disp: 36, purge: 5, cass: 160, phys: 1694, load: 300, close: 1994 },
      { d: '200', open: 450, disp: 105, purge: 18, cass: 410, phys: 9, load: 444, close: 453 },
      { d: '100', open: 920, disp: 280, purge: 21, cass: 880, phys: 80, load: 612, close: 692 },
    ],
  },
  {
    atmId: 'MPZ17896',
    dateTime: '25-10-2026 14:10',
    indent: 'IND-17896-01',
    withIndent: 'WTH-17896-02',
    cashHand: 180000,
    denos: [
      { d: '2000', open: 8, disp: 4, purge: 0, cass: 10, phys: 0, load: 0, close: 0 },
      { d: '500', open: 165, disp: 28, purge: 4, cass: 150, phys: 141, load: 0, close: 141 },
      { d: '200', open: 380, disp: 92, purge: 11, cass: 360, phys: 0, load: 0, close: 0 },
      { d: '100', open: 710, disp: 210, purge: 16, cass: 690, phys: 57, load: 2000, close: 2057 },
    ],
  },
  {
    atmId: 'MPZ21405',
    dateTime: '26-10-2026 10:15',
    indent: 'IND-21405-01',
    withIndent: 'WTH-21405-01',
    cashHand: 250000,
    denos: [
      { d: '2000', open: 12, disp: 6, purge: 0, cass: 10, phys: 0, load: 0, close: 0 },
      { d: '500', open: 240, disp: 55, purge: 8, cass: 210, phys: 1485, load: 636, close: 2121 },
      { d: '200', open: 410, disp: 125, purge: 14, cass: 370, phys: 16, load: 8, close: 24 },
      { d: '100', open: 890, disp: 295, purge: 18, cass: 820, phys: 937, load: 1104, close: 2041 },
    ],
  },
  {
    atmId: 'MPZ25810',
    dateTime: '26-10-2026 13:40',
    indent: 'IND-25810-03',
    withIndent: 'WTH-25810-01',
    cashHand: 310000,
    denos: [
      { d: '2000', open: 20, disp: 10, purge: 1, cass: 15, phys: 0, load: 0, close: 0 },
      { d: '500', open: 310, disp: 68, purge: 9, cass: 275, phys: 1820, load: 500, close: 2320 },
      { d: '200', open: 480, disp: 140, purge: 20, cass: 430, phys: 12, load: 350, close: 362 },
      { d: '100', open: 950, disp: 330, purge: 25, cass: 890, phys: 640, load: 800, close: 1440 },
    ],
  },
  {
    atmId: 'MPZ29930',
    dateTime: '27-10-2026 09:45',
    indent: 'IND-29930-01',
    withIndent: 'WTH-29930-02',
    cashHand: 190000,
    denos: [
      { d: '2000', open: 14, disp: 7, purge: 0, cass: 11, phys: 0, load: 0, close: 0 },
      { d: '500', open: 195, disp: 40, purge: 6, cass: 175, phys: 1540, load: 400, close: 1940 },
      { d: '200', open: 360, disp: 100, purge: 12, cass: 320, phys: 18, load: 250, close: 268 },
      { d: '100', open: 820, disp: 260, purge: 19, cass: 760, phys: 520, load: 600, close: 1120 },
    ],
  },
  {
    atmId: 'MPZ33140',
    dateTime: '27-10-2026 12:00',
    indent: 'IND-33140-02',
    withIndent: 'WTH-33140-01',
    cashHand: 240000,
    denos: [
      { d: '2000', open: 18, disp: 9, purge: 1, cass: 14, phys: 0, load: 0, close: 0 },
      { d: '500', open: 220, disp: 48, purge: 7, cass: 195, phys: 1610, load: 350, close: 1960 },
      { d: '200', open: 390, disp: 115, purge: 15, cass: 350, phys: 24, load: 300, close: 324 },
      { d: '100', open: 880, disp: 290, purge: 22, cass: 810, phys: 710, load: 750, close: 1460 },
    ],
  },
  {
    atmId: 'MPZ38490',
    dateTime: '27-10-2026 15:30',
    indent: 'IND-38490-01',
    withIndent: 'WTH-38490-01',
    cashHand: 160000,
    denos: [
      { d: '2000', open: 10, disp: 5, purge: 0, cass: 8, phys: 0, load: 0, close: 0 },
      { d: '500', open: 175, disp: 35, purge: 5, cass: 155, phys: 1420, load: 250, close: 1670 },
      { d: '200', open: 340, disp: 95, purge: 10, cass: 310, phys: 15, load: 200, close: 215 },
      { d: '100', open: 790, disp: 250, purge: 17, cass: 730, phys: 480, load: 500, close: 980 },
    ],
  },
  {
    atmId: 'MPZ42190',
    dateTime: '28-10-2026 10:00',
    indent: 'IND-42190-02',
    withIndent: 'WTH-42190-01',
    cashHand: 280000,
    denos: [
      { d: '2000', open: 16, disp: 8, purge: 0, cass: 13, phys: 0, load: 0, close: 0 },
      { d: '500', open: 260, disp: 58, purge: 8, cass: 230, phys: 1750, load: 450, close: 2200 },
      { d: '200', open: 430, disp: 130, purge: 16, cass: 390, phys: 30, load: 320, close: 350 },
      { d: '100', open: 910, disp: 305, purge: 20, cass: 850, phys: 820, load: 700, close: 1520 },
    ],
  },
  {
    atmId: 'MPZ46820',
    dateTime: '28-10-2026 12:30',
    indent: 'IND-46820-01',
    withIndent: 'WTH-46820-02',
    cashHand: 340000,
    denos: [
      { d: '2000', open: 22, disp: 11, purge: 1, cass: 17, phys: 0, load: 0, close: 0 },
      { d: '500', open: 290, disp: 64, purge: 9, cass: 260, phys: 1890, load: 550, close: 2440 },
      { d: '200', open: 470, disp: 135, purge: 19, cass: 420, phys: 35, load: 380, close: 415 },
      { d: '100', open: 960, disp: 320, purge: 24, cass: 900, phys: 880, load: 850, close: 1730 },
    ],
  },
]

function generateInitialRows(): MonthlyCbrRow[] {
  const rows: MonthlyCbrRow[] = []
  let snCounter = 1

  RAW_ATMS.forEach((atm) => {
    let totOpenQty = 0
    let totOpenAmt = 0
    let totDispQty = 0
    let totDispAmt = 0
    let totPurgeQty = 0
    let totPurgeAmt = 0
    let totCassQty = 0
    let totCassAmt = 0
    let totPhysQty = 0
    let totPhysAmt = 0
    let totLoadQty = 0
    let totLoadAmt = 0
    let totCloseQty = 0
    let totCloseAmt = 0

    atm.denos.forEach((item) => {
      const val = Number(item.d)
      const openAmt = item.open * val
      const dispAmt = item.disp * val
      const purgeAmt = item.purge * val
      const cassAmt = item.cass * val
      const physAmt = item.phys * val
      const loadAmt = item.load * val
      const closeAmt = item.close * val

      totOpenQty += item.open
      totOpenAmt += openAmt
      totDispQty += item.disp
      totDispAmt += dispAmt
      totPurgeQty += item.purge
      totPurgeAmt += purgeAmt
      totCassQty += item.cass
      totCassAmt += cassAmt
      totPhysQty += item.phys
      totPhysAmt += physAmt
      totLoadQty += item.load
      totLoadAmt += loadAmt
      totCloseQty += item.close
      totCloseAmt += closeAmt

      rows.push({
        sn: snCounter++,
        atmId: atm.atmId,
        dateTime: atm.dateTime,
        denomination: item.d,
        opening: item.open,
        openingAmount: openAmt,
        dispense: item.disp,
        dispenseAmount: dispAmt,
        purgeBin: item.purge,
        purgeBinAmount: purgeAmt,
        cassettes: item.cass,
        cassettesAmount: cassAmt,
        overage: 0,
        overageAmount: 0,
        shortage: 0,
        shortageAmount: 0,
        physicalBefore: item.phys,
        physicalBeforeAmount: physAmt,
        deposit: 0,
        depositAmount: 0,
        loading: item.load,
        loadingAmount: loadAmt,
        closing: item.close,
        closingAmount: closeAmt,
        switchCounter: '',
        switchCounterAmount: '',
        remark: '',
        issuedIndent: '',
        withdrawalIndent: '',
        loadedAmount: '',
        cashInHand: '',
        isTotal: false,
      })
    })

    // Total row matching both images
    rows.push({
      sn: snCounter++,
      atmId: atm.atmId,
      dateTime: 'TOTAL',
      denomination: '-',
      opening: totOpenQty,
      openingAmount: totOpenAmt,
      dispense: totDispQty,
      dispenseAmount: totDispAmt,
      purgeBin: totPurgeQty,
      purgeBinAmount: totPurgeAmt,
      cassettes: totCassQty,
      cassettesAmount: totCassAmt,
      overage: 0,
      overageAmount: 0,
      shortage: 0,
      shortageAmount: 0,
      physicalBefore: totPhysQty,
      physicalBeforeAmount: totPhysAmt,
      deposit: 0,
      depositAmount: 0,
      loading: totLoadQty,
      loadingAmount: totLoadAmt,
      closing: totCloseQty,
      closingAmount: totCloseAmt,
      switchCounter: '',
      switchCounterAmount: '',
      remark: '',
      issuedIndent: atm.indent,
      withdrawalIndent: atm.withIndent,
      loadedAmount: totLoadAmt ? totLoadAmt.toLocaleString('en-IN') : '',
      cashInHand: atm.cashHand ? atm.cashHand.toLocaleString('en-IN') : '',
      isTotal: true,
    })
  })

  // Trim to exactly 48 records as shown in image
  return rows.slice(0, 48)
}

const ALL_ROWS = generateInitialRows()

export default function MonthlyCbrMis() {
  // Filter States matching Image 01
  const [monthYear, setMonthYear] = useState('October 2026')
  const [fromDate, setFromDate] = useState('01/10/2026')
  const [toDate, setToDate] = useState('31/10/2026')
  const [siteId, setSiteId] = useState('All Sites')
  const [atmId, setAtmId] = useState('All ATM')
  const [frName, setFrName] = useState('All Franchisee')
  const [eodDateTime, setEodDateTime] = useState('All')
  const [status, setStatus] = useState('All Status')

  // UI state
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [exportOpen, setExportOpen] = useState(false)
  const [extraFilterModalOpen, setExtraFilterModalOpen] = useState(false)
  const [denominationFilter, setDenominationFilter] = useState('All')
  const [minDispense, setMinDispense] = useState('')

  // Filter logic
  const filteredRows = useMemo(() => {
    return ALL_ROWS.filter((r) => {
      if (atmId !== 'All ATM' && r.atmId !== atmId) {
        return false
      }
      if (denominationFilter !== 'All' && !r.isTotal && r.denomination !== denominationFilter) {
        return false
      }
      if (minDispense && !r.isTotal && r.dispenseAmount < Number(minDispense)) {
        return false
      }
      return true
    })
  }, [atmId, denominationFilter, minDispense])

  const totalRecords = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage, pageSize])

  const handleSearch = () => {
    setCurrentPage(1)
    toast(`Filtered ${filteredRows.length} records for ${monthYear}`, 'info')
  }

  const handleReset = () => {
    setMonthYear('October 2026')
    setFromDate('01/10/2026')
    setToDate('31/10/2026')
    setSiteId('All Sites')
    setAtmId('All ATM')
    setFrName('All Franchisee')
    setEodDateTime('All')
    setStatus('All Status')
    setDenominationFilter('All')
    setMinDispense('')
    setCurrentPage(1)
    toast('Filters reset to default', 'info')
  }

  const handleExport = (format: 'csv' | 'xlsx' = 'csv') => {
    setExportOpen(false)
    const headers = [
      'S.N.',
      'ATM ID',
      'CBR / EOD Date Time',
      'Denomination',
      'Opening',
      'Opening Amount (₹)',
      'Dispense',
      'Dispense Amount (₹)',
      'Cash in Purge Bin',
      'Cash in Purge Bin Amount (₹)',
      'Cash in Cassettes',
      'Cash in Cassettes Amount (₹)',
      'Overage',
      'OverageAmount',
      'Shortage',
      'ShortageAmount',
      'Physical Cash Before Replenishment',
      'Physical Cash Before Replenishment Amount',
      'Deposit',
      'DepositAmount',
      'Loading',
      'LoadingAmount',
      'ClosingBalance',
      'ClosingBalanceAmount',
      'Switch Counter',
      'Switch Counter Amount',
      'Remark',
      'Issued Indent',
      'Withdrawal Indent',
      'Loaded Amount (₹)',
      'Cash in Hand (₹)',
    ]

    const rows = filteredRows.map((r) => [
      String(r.sn),
      r.atmId,
      r.dateTime,
      r.denomination,
      r.opening.toLocaleString('en-IN'),
      r.openingAmount.toLocaleString('en-IN'),
      r.dispense.toLocaleString('en-IN'),
      r.dispenseAmount.toLocaleString('en-IN'),
      r.purgeBin.toLocaleString('en-IN'),
      r.purgeBinAmount.toLocaleString('en-IN'),
      r.cassettes.toLocaleString('en-IN'),
      r.cassettesAmount.toLocaleString('en-IN'),
      String(r.overage),
      String(r.overageAmount),
      String(r.shortage),
      String(r.shortageAmount),
      r.physicalBefore ? r.physicalBefore.toLocaleString('en-IN') : '0',
      r.physicalBeforeAmount ? r.physicalBeforeAmount.toLocaleString('en-IN') : '0',
      String(r.deposit),
      String(r.depositAmount),
      r.loading ? r.loading.toLocaleString('en-IN') : '0',
      r.loadingAmount ? r.loadingAmount.toLocaleString('en-IN') : '0',
      r.closing ? r.closing.toLocaleString('en-IN') : '0',
      r.closingAmount ? r.closingAmount.toLocaleString('en-IN') : '0',
      String(r.switchCounter),
      String(r.switchCounterAmount),
      r.remark,
      r.issuedIndent,
      r.withdrawalIndent,
      String(r.loadedAmount),
      String(r.cashInHand),
    ])

    downloadCsv(`monthly-cbr-mis-october-2026`, headers, rows)
    toast(`Monthly CBR MIS report exported successfully (${format.toUpperCase()})`, 'success')
  }

  return (
    <div className="space-y-4 pb-16 max-w-[1500px]">
      {/* Breadcrumb: Workspace > Reports & MIS > Monthly CBR MIS */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/reports" className="hover:text-[#0066FF] transition-colors">
          Reports & MIS
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Monthly CBR MIS</span>
      </div>

      {/* Top Header: Icon + Monthly CBR MIS + Actions (Add Filter Option, Download) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-sm shrink-0">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              Monthly CBR MIS
            </h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Consolidated ATM cash loading, denomination-wise balances and CBR records in one report.
            </p>
          </div>
        </div>

        {/* Right Top Buttons matching Image */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setExtraFilterModalOpen(true)}
            className="inline-flex items-center gap-2 h-9.5 px-4 rounded-lg border border-[#0066FF] bg-white hover:bg-blue-50/50 text-[#0066FF] text-[12.5px] font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <Filter size={14} className="text-[#0066FF]" />
            <span>Add Filter Option</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="inline-flex items-center gap-2 h-9.5 px-4 rounded-lg border border-[#0066FF] bg-white hover:bg-blue-50/50 text-[#0066FF] text-[12.5px] font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <Download size={14} className="text-[#0066FF]" />
              <span>Download</span>
              <ChevronDown size={13} className="text-[#0066FF]" />
            </button>

            {exportOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 text-[12px]">
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <FileText size={13} className="text-slate-400" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('xlsx')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet size={13} className="text-slate-400" />
                  <span>Download Excel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Card matching Image */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
        {/* Header inside Filter card */}
        <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100">
          <div className="w-6 h-6 rounded bg-[#0066FF] text-white flex items-center justify-center">
            <Filter size={13} />
          </div>
          <span className="text-[13.5px] font-bold text-slate-900">Filter</span>
          <span className="text-[12px] text-slate-400">
            Use below filters to generate the monthly CBR MIS report.
          </span>
        </div>

        {/* Grid Row 1: Month & Year *, From Date, To Date, Site ID, ATM ID, FR Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-3">
          {/* Month & Year * */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Month & Year <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-800 bg-white focus:border-[#0066FF] outline-none shadow-2xs appearance-none"
              >
                <option value="October 2026">October 2026</option>
                <option value="September 2026">September 2026</option>
                <option value="August 2026">August 2026</option>
                <option value="July 2026">July 2026</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
            </div>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              From Date
            </label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none shadow-2xs"
              />
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              To Date
            </label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none shadow-2xs"
              />
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
            </div>
          </div>

          {/* Site ID */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Site ID
            </label>
            <div className="relative">
              <Users
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none shadow-2xs appearance-none"
              >
                <option value="All Sites">All Sites</option>
                <option value="SIT-MH-01">SIT-MH-01</option>
                <option value="SIT-MH-02">SIT-MH-02</option>
                <option value="SIT-KA-01">SIT-KA-01</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
            </div>
          </div>

          {/* ATM ID */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              ATM ID
            </label>
            <div className="relative">
              <User
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={atmId}
                onChange={(e) => setAtmId(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none shadow-2xs appearance-none"
              >
                <option value="All ATM">All ATM</option>
                <option value="MPZ06956">MPZ06956</option>
                <option value="MPZ14526">MPZ14526</option>
                <option value="MPZ17896">MPZ17896</option>
                <option value="MPZ21405">MPZ21405</option>
                <option value="MPZ25810">MPZ25810</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
            </div>
          </div>

          {/* FR Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              FR Name
            </label>
            <div className="relative">
              <User
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={frName}
                onChange={(e) => setFrName(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none shadow-2xs appearance-none"
              >
                <option value="All Franchisee">All Franchisee</option>
                <option value="Shree Sai Services">Shree Sai Services</option>
                <option value="Patel Cash Solutions">Patel Cash Solutions</option>
                <option value="Namma Network">Namma Network</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Grid Row 2: CBR / EOD Date Time, Status, and Action Buttons (Search + Reset) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          {/* CBR / EOD Date Time */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              CBR / EOD Date Time
            </label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={eodDateTime}
                onChange={(e) => setEodDateTime(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none shadow-2xs appearance-none"
              >
                <option value="All">All</option>
                <option value="25-10-2026 09:30">25-10-2026 09:30</option>
                <option value="25-10-2026 11:20">25-10-2026 11:20</option>
                <option value="25-10-2026 14:10">25-10-2026 14:10</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Status
            </label>
            <div className="relative">
              <FileText
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none shadow-2xs appearance-none"
              >
                <option value="All Status">All Status</option>
                <option value="Completed">Completed</option>
                <option value="Verified">Verified</option>
                <option value="Pending">Pending</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
            </div>
          </div>

          {/* Empty spacer for alignment */}
          <div className="hidden lg:block lg:col-span-2"></div>

          {/* Buttons: Search + Reset */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 flex items-center gap-2.5">
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

      {/* Report Table Card matching both Image 1 and Image 2 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Top Header: Bar Chart Icon + Monthly CBR MIS Report – October 2026 + Total Records: 48 + Page Size Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0066FF] text-white flex items-center justify-center shrink-0">
              <BarChart3 size={16} />
            </div>
            <h2 className="text-[14px] sm:text-[15px] font-bold text-slate-800">
              Monthly CBR MIS Report – October 2026
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] font-bold text-slate-700">
              Total Records: {totalRecords}
            </span>

            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-8 pl-3 pr-7 rounded border border-slate-200 text-[12px] font-semibold text-slate-800 bg-white focus:border-[#0066FF] outline-none appearance-none cursor-pointer"
              >
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Full 31-Column Table with Orange Header & Highlighted TOTAL Rows */}
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="bg-[#E65100] text-white text-[11px] font-bold whitespace-nowrap">
                {/* 1. S.N. */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 w-12 sticky left-0 bg-[#E65100] z-10 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                  S.N.
                </th>

                {/* 2. ATM ID */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[95px] sticky left-12 bg-[#E65100] z-10 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center justify-center gap-1">
                    <span>ATM ID</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 3. CBR / EOD Date Time */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[130px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>CBR / EOD Date Time</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 4. Denomination */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[90px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>Denomination</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 5. Opening */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[80px]">
                  Opening
                </th>

                {/* 6. Opening Amount (₹) */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[110px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>Opening Amount (₹)</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 7. Dispense */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[80px]">
                  Dispense
                </th>

                {/* 8. Dispense Amount (₹) */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[110px]">
                  Dispense Amount (₹)
                </th>

                {/* 9. Cash in Purge Bin */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[100px]">
                  Cash in Purge Bin
                </th>

                {/* 10. Cash in Purge Bin Amount (₹) */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[130px]">
                  Cash in Purge Bin Amount (₹)
                </th>

                {/* 11. Cash in Cassettes */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[100px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>Cash in Cassettes</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 12. Cash in Cassettes Amount (₹) */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[130px]">
                  Cash in Cassettes Amount (₹)
                </th>

                {/* 13. Overage */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[75px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>Overage</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 14. OverageAmount */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[95px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>OverageAmount</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 15. Shortage */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[75px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>Shortage</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 16. ShortageAmount */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[95px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>ShortageAmount</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 17. Physical Cash Before Replenishment */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[130px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>Physical Cash Before Replenishment</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 18. Physical Cash Before Replenishment Amount */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[140px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>Physical Cash Before Replenishment Amount</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 19. Deposit */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[75px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>Deposit</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 20. DepositAmount */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[95px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>DepositAmount</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 21. Loading */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[75px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>Loading</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 22. LoadingAmount */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[100px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>LoadingAmount</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 23. ClosingBalance */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[95px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>ClosingBalance</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 24. ClosingBalanceAmount */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[125px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>ClosingBalanceAmount</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 25. Switch Counter */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[95px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>Switch Counter</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 26. Switch Counter Amount */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[125px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>Switch Counter Amount</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 27. Remark */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[85px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>Remark</span>
                    <ArrowUpDown size={11} className="opacity-75" />
                  </div>
                </th>

                {/* 28. Issued Indent */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[110px]">
                  Issued Indent
                </th>

                {/* 29. Withdrawal Indent */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[115px]">
                  Withdrawal Indent
                </th>

                {/* 30. Loaded Amount (₹) */}
                <th className="py-2.5 px-3 text-center border-r border-orange-600/70 min-w-[115px]">
                  Loaded Amount (₹)
                </th>

                {/* 31. Cash in Hand (₹) */}
                <th className="py-2.5 px-3 text-center min-w-[115px]">
                  Cash in Hand (₹)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={31}
                    className="py-12 text-center text-slate-400 text-[13px]"
                  >
                    No records found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => {
                  const isTotal = r.isTotal

                  return (
                    <tr
                      key={r.sn}
                      className={`text-center whitespace-nowrap transition-colors ${
                        isTotal
                          ? 'bg-[#FFE8CC] font-bold text-slate-900 border-t border-b border-orange-200'
                          : 'hover:bg-orange-50/20 text-slate-700'
                      }`}
                    >
                      {/* 1. S.N. (Sticky) */}
                      <td
                        className={`py-2 px-3 border-r border-slate-100 font-semibold sticky left-0 z-1 shadow-[2px_0_4px_rgba(0,0,0,0.03)] ${
                          isTotal ? 'bg-[#FFE8CC]' : 'bg-white'
                        }`}
                      >
                        {r.sn}
                      </td>

                      {/* 2. ATM ID (Sticky) */}
                      <td
                        className={`py-2 px-3 border-r border-slate-100 font-medium text-slate-900 sticky left-12 z-1 shadow-[2px_0_4px_rgba(0,0,0,0.03)] ${
                          isTotal ? 'bg-[#FFE8CC]' : 'bg-white'
                        }`}
                      >
                        {r.atmId}
                      </td>

                      {/* 3. CBR / EOD Date Time */}
                      <td
                        className={`py-2 px-3 border-r border-slate-100 ${
                          isTotal ? 'font-bold text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        {r.dateTime}
                      </td>

                      {/* 4. Denomination */}
                      <td className="py-2 px-3 border-r border-slate-100 font-semibold">
                        {r.denomination}
                      </td>

                      {/* 5. Opening */}
                      <td className="py-2 px-3 border-r border-slate-100">
                        {r.opening.toLocaleString('en-IN')}
                      </td>

                      {/* 6. Opening Amount (₹) */}
                      <td className="py-2 px-3 border-r border-slate-100 font-medium">
                        {r.openingAmount.toLocaleString('en-IN')}
                      </td>

                      {/* 7. Dispense */}
                      <td className="py-2 px-3 border-r border-slate-100">
                        {r.dispense.toLocaleString('en-IN')}
                      </td>

                      {/* 8. Dispense Amount (₹) */}
                      <td className="py-2 px-3 border-r border-slate-100 font-medium">
                        {r.dispenseAmount.toLocaleString('en-IN')}
                      </td>

                      {/* 9. Cash in Purge Bin */}
                      <td className="py-2 px-3 border-r border-slate-100">
                        {r.purgeBin.toLocaleString('en-IN')}
                      </td>

                      {/* 10. Cash in Purge Bin Amount (₹) */}
                      <td className="py-2 px-3 border-r border-slate-100 font-medium">
                        {r.purgeBinAmount.toLocaleString('en-IN')}
                      </td>

                      {/* 11. Cash in Cassettes */}
                      <td className="py-2 px-3 border-r border-slate-100">
                        {r.cassettes.toLocaleString('en-IN')}
                      </td>

                      {/* 12. Cash in Cassettes Amount (₹) */}
                      <td className="py-2 px-3 border-r border-slate-100 font-medium">
                        {r.cassettesAmount.toLocaleString('en-IN')}
                      </td>

                      {/* 13. Overage */}
                      <td className="py-2 px-3 border-r border-slate-100">
                        {r.overage}
                      </td>

                      {/* 14. OverageAmount */}
                      <td className="py-2 px-3 border-r border-slate-100">
                        {r.overageAmount}
                      </td>

                      {/* 15. Shortage */}
                      <td className="py-2 px-3 border-r border-slate-100">
                        {r.shortage}
                      </td>

                      {/* 16. ShortageAmount */}
                      <td className="py-2 px-3 border-r border-slate-100">
                        {r.shortageAmount}
                      </td>

                      {/* 17. Physical Cash Before Replenishment */}
                      <td className="py-2 px-3 border-r border-slate-100">
                        {r.physicalBefore ? r.physicalBefore.toLocaleString('en-IN') : '0'}
                      </td>

                      {/* 18. Physical Cash Before Replenishment Amount */}
                      <td className="py-2 px-3 border-r border-slate-100 font-medium">
                        {r.physicalBeforeAmount
                          ? r.physicalBeforeAmount.toLocaleString('en-IN')
                          : '0'}
                      </td>

                      {/* 19. Deposit */}
                      <td className="py-2 px-3 border-r border-slate-100">
                        {r.deposit}
                      </td>

                      {/* 20. DepositAmount */}
                      <td className="py-2 px-3 border-r border-slate-100">
                        {r.depositAmount}
                      </td>

                      {/* 21. Loading */}
                      <td className="py-2 px-3 border-r border-slate-100">
                        {r.loading ? r.loading.toLocaleString('en-IN') : '0'}
                      </td>

                      {/* 22. LoadingAmount */}
                      <td className="py-2 px-3 border-r border-slate-100 font-medium">
                        {r.loadingAmount ? r.loadingAmount.toLocaleString('en-IN') : '0'}
                      </td>

                      {/* 23. ClosingBalance */}
                      <td className="py-2 px-3 border-r border-slate-100">
                        {r.closing ? r.closing.toLocaleString('en-IN') : '0'}
                      </td>

                      {/* 24. ClosingBalanceAmount */}
                      <td className="py-2 px-3 border-r border-slate-100 font-medium">
                        {r.closingAmount ? r.closingAmount.toLocaleString('en-IN') : '0'}
                      </td>

                      {/* 25. Switch Counter */}
                      <td className="py-2 px-3 border-r border-slate-100 text-slate-400">
                        {r.switchCounter || '-'}
                      </td>

                      {/* 26. Switch Counter Amount */}
                      <td className="py-2 px-3 border-r border-slate-100 text-slate-400">
                        {r.switchCounterAmount || '-'}
                      </td>

                      {/* 27. Remark */}
                      <td className="py-2 px-3 border-r border-slate-100 text-slate-400">
                        {r.remark || '-'}
                      </td>

                      {/* 28. Issued Indent */}
                      <td className="py-2 px-3 border-r border-slate-100 font-mono text-[10.5px]">
                        {r.issuedIndent || '-'}
                      </td>

                      {/* 29. Withdrawal Indent */}
                      <td className="py-2 px-3 border-r border-slate-100 font-mono text-[10.5px]">
                        {r.withdrawalIndent || '-'}
                      </td>

                      {/* 30. Loaded Amount (₹) */}
                      <td className="py-2 px-3 border-r border-slate-100 font-semibold text-slate-900">
                        {r.loadedAmount || '-'}
                      </td>

                      {/* 31. Cash in Hand (₹) */}
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {r.cashInHand || '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer matching Image: Showing 1 to 15 of 48 records + Controls (<< < 1 2 3 > >>) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-slate-100 text-[12px] text-slate-600 bg-white">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords}{' '}
            records
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>

            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
              title="Previous Page"
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
                  className={`inline-flex items-center justify-center w-7 h-7 rounded text-[12px] font-semibold transition-colors cursor-pointer ${
                    isActive
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
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Extra Filter Modal (Triggered by Add Filter Option button) */}
      {extraFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={17} className="text-[#0066FF]" />
                <h3 className="font-bold text-slate-900 text-[15px]">
                  Additional Filter Options
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExtraFilterModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-[12px]">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Filter by Specific Denomination
                </label>
                <select
                  value={denominationFilter}
                  onChange={(e) => setDenominationFilter(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-slate-800 bg-white focus:border-[#0066FF] outline-none"
                >
                  <option value="All">All Denominations</option>
                  <option value="2000">₹2000 Notes Only</option>
                  <option value="500">₹500 Notes Only</option>
                  <option value="200">₹200 Notes Only</option>
                  <option value="100">₹100 Notes Only</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Minimum Dispense Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 20000"
                  value={minDispense}
                  onChange={(e) => setMinDispense(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-slate-800 bg-white focus:border-[#0066FF] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDenominationFilter('All')
                  setMinDispense('')
                  setExtraFilterModalOpen(false)
                }}
                className="px-3.5 h-8.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  setExtraFilterModalOpen(false)
                  toast('Additional filters applied', 'info')
                }}
                className="px-4 h-8.5 rounded-lg bg-[#0066FF] text-white text-[12px] font-semibold hover:bg-[#0052CC] cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
