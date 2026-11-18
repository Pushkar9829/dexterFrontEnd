import { useState } from 'react'
import {
  Database,
  ArrowLeft,
  Calendar,
  Download,
  CreditCard,
  QrCode,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Building2
} from 'lucide-react'
import { SIX_DAYS_TXN_DATA } from '../data/mobileMockData'

export interface MultiSiteTxnProfile {
  id: string
  siteCode: string
  name: string
  frName: string
  atmId: string
  location: string
  status: 'Active' | 'Under Maintenance' | 'Operational'
  totalTxns: number
  deposit: string
  withdrawal: string
  sixDaysMultiplier: number
}

export const MULTI_SITES: MultiSiteTxnProfile[] = [
  {
    id: 'S-1045',
    siteCode: 'S-1045',
    name: 'City Center',
    frName: 'Rohit Sharma',
    atmId: 'ATM7821',
    location: 'MG Road, Lucknow, UP',
    status: 'Active',
    totalTxns: 336,
    deposit: '₹9,62,000',
    withdrawal: '₹20,14,000',
    sixDaysMultiplier: 1.0
  },
  {
    id: 'S-1046',
    siteCode: 'S-1046',
    name: 'Mainpuri Market Site',
    frName: 'Ranjeet Pal',
    atmId: 'ATM012345',
    location: 'Bewar, Mainpuri, UP',
    status: 'Active',
    totalTxns: 412,
    deposit: '₹12,45,000',
    withdrawal: '₹24,80,000',
    sixDaysMultiplier: 1.2
  },
  {
    id: 'S-1047',
    siteCode: 'S-1047',
    name: 'Gomti Nagar Hub',
    frName: 'Amit Verma',
    atmId: 'MPZ14409',
    location: 'Vibhuti Khand, Lucknow, UP',
    status: 'Active',
    totalTxns: 289,
    deposit: '₹8,15,000',
    withdrawal: '₹18,50,000',
    sixDaysMultiplier: 0.9
  },
  {
    id: 'S-1048',
    siteCode: 'S-1048',
    name: 'Hazratganj Plaza',
    frName: 'Sanjay Sharma',
    atmId: 'ATM012346',
    location: 'Hazratganj, Lucknow, UP',
    status: 'Active',
    totalTxns: 365,
    deposit: '₹10,90,000',
    withdrawal: '₹21,30,000',
    sixDaysMultiplier: 1.1
  },
  {
    id: 'S-1049',
    siteCode: 'S-1049',
    name: 'Civil Lines Branch',
    frName: 'Naveen Singh',
    atmId: 'AXIS277823',
    location: 'Civil Lines, Kanpur, UP',
    status: 'Active',
    totalTxns: 245,
    deposit: '₹6,80,000',
    withdrawal: '₹15,40,000',
    sixDaysMultiplier: 0.75
  }
]

interface MobileTransactionsScreenProps {
  onBackToMore?: () => void
}

export function MobileTransactionsScreen({ onBackToMore }: MobileTransactionsScreenProps) {
  const [tab, setTab] = useState<'overview' | 'sitewise' | 'performance'>('overview')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('S-1045')

  const currentSite = MULTI_SITES.find((s) => s.id === selectedSiteId) || MULTI_SITES[0]

  const siteTxnData = SIX_DAYS_TXN_DATA.map((row) => {
    const mult = currentSite.sixDaysMultiplier
    return {
      ...row,
      txns: Math.round(row.txns * mult),
      cardDepositCount: Math.round(row.cardDepositCount * mult),
      cardWithdrawalCount: Math.round(row.cardWithdrawalCount * mult),
      upiDepositCount: Math.round(row.upiDepositCount * mult),
      upiWithdrawalCount: Math.round(row.upiWithdrawalCount * mult)
    }
  })

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToMore && (
              <button
                onClick={onBackToMore}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h1 className="text-base font-black text-white">Transaction Details</h1>
              <p className="text-[11px] text-blue-100 mt-0.5">
                View daily and average transaction performance.
              </p>
            </div>
          </div>
          <Database size={24} className="text-amber-300 shrink-0" />
        </div>

        {/* 3 Main Tabs Matching 7.59.43 AM & 7.59.44 AM */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <button
            type="button"
            onClick={() => setTab('overview')}
            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all ${
              tab === 'overview'
                ? 'bg-white text-[#0B2A6B] shadow-xs'
                : 'bg-white/15 text-white/90 hover:bg-white/20'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setTab('sitewise')}
            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all ${
              tab === 'sitewise'
                ? 'bg-white text-[#0B2A6B] shadow-xs'
                : 'bg-white/15 text-white/90 hover:bg-white/20'
            }`}
          >
            Site Wise
          </button>
          <button
            type="button"
            onClick={() => setTab('performance')}
            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all ${
              tab === 'performance'
                ? 'bg-white text-[#0B2A6B] shadow-xs'
                : 'bg-white/15 text-white/90 hover:bg-white/20'
            }`}
          >
            Performance
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW (Matching 7.59.43 AM Left Screen) */}
      {tab === 'overview' && (
        <div className="space-y-3.5">
          {/* Filter Bar */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2">
              <span className="font-bold text-slate-700">Nov 01 – Nov 06</span>
              <Calendar size={13} className="text-blue-600" />
            </div>
            <div className="relative">
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="w-full h-8.5 pl-2.5 pr-7 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Sites ({MULTI_SITES.length})</option>
                {MULTI_SITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.siteCode} ({s.atmId})
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Key Overview (6 Days) */}
          <div className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-[#0B2A6B] flex items-center gap-1.5">
              <TrendingUp size={15} className="text-blue-600" /> Key Overview (6 Days)
            </h3>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                <span className="text-[9px] text-slate-500 font-bold block">Total Sites</span>
                <span className="text-sm font-black text-slate-800">5</span>
              </div>
              <div className="rounded-xl bg-blue-50 p-2 border border-blue-100">
                <span className="text-[9px] text-blue-700 font-bold block">Total TXNs</span>
                <span className="text-sm font-black text-blue-700">1,618</span>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2 border border-emerald-100">
                <span className="text-[9px] text-emerald-700 font-bold block">Total Deposit</span>
                <span className="text-xs font-black text-emerald-700 truncate block">₹45.8L</span>
              </div>
              <div className="rounded-xl bg-rose-50 p-2 border border-rose-100">
                <span className="text-[9px] text-rose-700 font-bold block">Withdrawal</span>
                <span className="text-xs font-black text-rose-700 truncate block">₹92.7L</span>
              </div>
            </div>
          </div>

          {/* Card Transactions Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Card Transactions</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Count | Amount</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <ArrowUpRight size={13} /> Deposit
              </span>
              <div className="flex gap-4 font-bold text-slate-800">
                <span>426</span>
                <span>₹ 12,48,000</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="flex items-center gap-1 font-semibold text-rose-700">
                <ArrowDownRight size={13} /> Withdrawal
              </span>
              <div className="flex gap-4 font-bold text-slate-800">
                <span>1,012</span>
                <span>₹ 64,20,000</span>
              </div>
            </div>
          </div>

          {/* UPI Transactions Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <QrCode size={16} className="text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">UPI Transactions</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Count | Amount</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <ArrowUpRight size={13} /> Deposit
              </span>
              <div className="flex gap-4 font-bold text-slate-800">
                <span>98</span>
                <span>₹ 3,74,000</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="flex items-center gap-1 font-semibold text-rose-700">
                <ArrowDownRight size={13} /> Withdrawal
              </span>
              <div className="flex gap-4 font-bold text-slate-800">
                <span>82</span>
                <span>₹ 5,08,000</span>
              </div>
            </div>
          </div>

          {/* Daily Trend Grouped Bar Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Daily Trend (Last 6 Days)</span>
              <div className="flex items-center gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-[#0C3E98]">
                  <span className="h-2 w-2 rounded-xs bg-[#0C3E98]" /> Deposit
                </span>
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="h-2 w-2 rounded-xs bg-sky-400" /> Withdrawal
                </span>
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div className="flex h-36 items-end justify-between gap-2 pt-4 border-b border-slate-100">
              {[
                { date: '01 Nov', dep: '6.8L', with: '13.7L', depH: 35, withH: 70 },
                { date: '02 Nov', dep: '7.4L', with: '15.1L', depH: 40, withH: 78 },
                { date: '03 Nov', dep: '7.1L', with: '14.9L', depH: 38, withH: 76 },
                { date: '04 Nov', dep: '7.8L', with: '15.5L', depH: 43, withH: 80 },
                { date: '05 Nov', dep: '8.2L', with: '16.7L', depH: 46, withH: 86 },
                { date: '06 Nov', dep: '8.4L', with: '16.8L', depH: 48, withH: 88 }
              ].map((item) => (
                <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-end gap-1 h-28 w-full justify-center">
                    <div
                      style={{ height: `${item.depH}%` }}
                      className="w-2.5 rounded-t-xs bg-[#0C3E98]"
                      title={`Deposit: ${item.dep}`}
                    />
                    <div
                      style={{ height: `${item.withH}%` }}
                      className="w-2.5 rounded-t-xs bg-sky-400"
                      title={`Withdrawal: ${item.with}`}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 whitespace-nowrap">
                    {item.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SITE WISE (Matching 7.59.43 AM Right Screen with Multi-Site Dropdown) */}
      {tab === 'sitewise' && (
        <div className="space-y-3.5">
          {/* Site Selector Header & Multi-Site Dropdown */}
          <div className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-3">
            {/* Multi-Site Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Building2 size={13} className="text-blue-600" />
                  <span>Choose Multi-Site</span>
                  <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-blue-600 font-extrabold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  {MULTI_SITES.length} Sites Linked
                </span>
              </div>
              <div className="relative">
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-300 bg-slate-50/70 text-xs font-bold text-[#0B2A6B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-2xs cursor-pointer"
                >
                  {MULTI_SITES.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.siteCode} – {site.name} ({site.atmId})
                    </option>
                  ))}
                </select>
                <Building2 size={15} className="absolute left-3 top-2.5 text-blue-600 pointer-events-none" />
                <ChevronDown size={15} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Selected Site Details */}
            <div className="flex items-center justify-between border-t border-b py-2.5 border-slate-100">
              <div>
                <h3 className="text-xs font-black text-[#0B2A6B]">{currentSite.siteCode} – {currentSite.name}</h3>
                <p className="text-[10px] text-slate-500 font-medium">FR: {currentSite.frName} • ATM: {currentSite.atmId}</p>
                <p className="text-[10px] text-slate-400 font-medium">{currentSite.location}</p>
              </div>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5">
                {currentSite.status}
              </span>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-xl bg-blue-50 p-2">
                <span className="text-[9px] font-bold text-slate-500 block">Total TXNs</span>
                <span className="text-sm font-black text-blue-700">{currentSite.totalTxns}</span>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2">
                <span className="text-[9px] font-bold text-slate-500 block">Deposit</span>
                <span className="text-xs font-black text-emerald-700">{currentSite.deposit}</span>
              </div>
              <div className="rounded-xl bg-rose-50 p-2">
                <span className="text-[9px] font-bold text-slate-500 block">Withdrawal</span>
                <span className="text-xs font-black text-rose-700">{currentSite.withdrawal}</span>
              </div>
            </div>
          </div>

          {/* Transaction Data – Last 6 Days Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="flex items-center justify-between bg-gradient-to-r from-[#0C3E98] to-[#1453CA] px-3.5 py-2 text-white">
              <span className="text-xs font-bold">Transaction Data – Last 6 Days ({currentSite.siteCode})</span>
              <button
                onClick={() => alert(`Downloading Excel report for ${currentSite.siteCode} (${currentSite.atmId})`)}
                className="text-white hover:text-blue-100"
              >
                <Download size={15} />
              </button>
            </div>

            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-center text-[10.5px]">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2 px-2 text-left">Date</th>
                    <th className="py-2 px-2">Card (C/₹)</th>
                    <th className="py-2 px-2">UPI (C/₹)</th>
                    <th className="py-2 px-2">Total TXNs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {siteTxnData.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50">
                      <td className="py-2 px-2 text-left font-bold text-slate-800">{row.date}</td>
                      <td className="py-2 px-2 font-mono text-slate-700">
                        {row.cardDepositCount}/{row.cardWithdrawalCount}
                      </td>
                      <td className="py-2 px-2 font-mono text-slate-700">
                        {row.upiDepositCount}/{row.upiWithdrawalCount}
                      </td>
                      <td className="py-2 px-2 font-black text-blue-700">{row.txns}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SITE PERFORMANCE (Matching 7.59.44 AM Screen) */}
      {tab === 'performance' && (
        <div className="space-y-3.5">
          {/* Site 1 Card */}
          <div className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h4 className="text-xs font-black text-[#0B2A6B]">ATM-100234 • Om Sai Enterprises</h4>
                <p className="text-[10px] text-slate-400">Site : ST-MH-PUN-00124</p>
              </div>
              <button
                onClick={() => setTab('sitewise')}
                className="text-[10px] font-bold text-blue-600 hover:underline"
              >
                View Details &gt;
              </button>
            </div>

            {/* 4 Metric Pills */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-blue-50/70 p-2 border border-blue-100">
                <span className="text-[9.5px] text-slate-500 font-semibold block">Monthly Avg. TXNs</span>
                <span className="text-base font-black text-blue-700">1,170</span>
              </div>
              <div className="rounded-xl bg-emerald-50/70 p-2 border border-emerald-100">
                <span className="text-[9.5px] text-slate-500 font-semibold block">Monthly Avg. Withdrawal</span>
                <span className="text-sm font-black text-emerald-700">₹ 5,52,000</span>
              </div>
              <div className="rounded-xl bg-blue-50/70 p-2 border border-blue-100">
                <span className="text-[9.5px] text-slate-500 font-semibold block">Daily Avg. TXNs</span>
                <span className="text-base font-black text-blue-700">39</span>
              </div>
              <div className="rounded-xl bg-emerald-50/70 p-2 border border-emerald-100">
                <span className="text-[9.5px] text-slate-500 font-semibold block">Daily Avg. Withdrawal</span>
                <span className="text-sm font-black text-emerald-700">₹ 18,400</span>
              </div>
            </div>

            {/* Performance Mini Bar Table */}
            <div className="rounded-xl bg-slate-50 p-2 border border-slate-100 text-[10.5px]">
              <span className="font-bold text-slate-700 block mb-1">Last 06 Days TXN Performance</span>
              <div className="flex justify-between items-end h-16 pt-2">
                {SIX_DAYS_TXN_DATA.map((d) => (
                  <div key={d.date} className="flex flex-col items-center gap-0.5">
                    <span className="text-[8.5px] font-bold text-blue-700">{d.txns}</span>
                    <div
                      style={{ height: `${(d.txns / 260) * 40}px` }}
                      className="w-4 rounded-t-sm bg-blue-600"
                    />
                    <span className="text-[8px] text-slate-400">{d.date.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
