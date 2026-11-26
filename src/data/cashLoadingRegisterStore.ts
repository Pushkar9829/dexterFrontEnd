import { createStore } from '@/lib/store'
import { franchiseNameOf, siteAt } from '@/lib/siteRef'
import { downloadCsv } from '@/lib/export'
import { useMemo } from 'react'
import { clBalance, makeCashMaster, type CashRecord } from './cbr'
import { apiEnabled } from './opsApi'

/**
 * Cash Loading Master — Self Funding only (Operations §3). Same workflow engine as CBR but its OWN
 * store / ids (CL-…), validations and reports; never mixed with the CBR Master (§3.2, §19.1).
 */
export const clMaster = makeCashMaster('Cash Loading', 'dexter.cashloading.master.v1')

// ── Legacy daily loading sheet (used by the SF Overview report) ───────────

export interface CashLoadingRow {
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

// Self Funding (Cash Loading) sites from the common Site Master.
const SAMPLE_ATMS = Array.from({ length: 8 }, (_, i) => siteAt(i * 3, (s) => s.siteType === 'SF')).map((s) => ({ atmId: s.atmId, mfName: franchiseNameOf(s) }))

export const INITIAL_LOADING_RECORDS: CashLoadingRow[] = Array.from({ length: 32 }, (_, i) => {
  const rowNo = i + 1
  const atmObj = SAMPLE_ATMS[i % SAMPLE_ATMS.length]
  const day = 18 - (i % 14)
  const dateStr = `${String(Math.max(1, day)).padStart(2, '0')}-10-2026`
  const baseOpening = 250000 + (i % 6) * 50000
  const dispense = 120000 + (i % 5) * 35000
  const physical = Math.max(50000, baseOpening - dispense)
  const loading = 600000 + (i % 4) * 200000
  const hasPurge = i === 7 || i === 19
  const purgeBin = hasPurge ? 2000 : 0
  const hasOverage = i === 11
  const overage = hasOverage ? 1500 : 0
  const hasShortage = i === 23
  const shortage = hasShortage ? 1000 : 0
  const closingBalance = physical + loading + overage - shortage - purgeBin
  const switchBalance = hasOverage ? closingBalance - 1500 : hasShortage ? closingBalance + 1000 : closingBalance

  return {
    no: rowNo,
    date: dateStr,
    atmId: atmObj.atmId,
    mfName: atmObj.mfName,
    indentNo: `IND-${atmObj.atmId.slice(-5)}-${String(100 + rowNo).padStart(3, '0')}`,
    eodTime: `${String(9 + (i % 8)).padStart(2, '0')}:${String(15 + (i % 4) * 10).padStart(2, '0')}`,
    openingBalance: baseOpening,
    dispense,
    purgeBin,
    overage,
    shortage,
    physicalCash: physical,
    loading,
    closingBalance,
    remarks:
      hasOverage
        ? 'Overage of ₹1,500 detected in physical verification'
        : hasShortage
        ? 'Shortage of ₹1,000 flagged for CRA recount'
        : hasPurge
        ? 'Purge bin cleared; ₹2,000 diverted to vault'
        : 'Routine cash loading verified',
    switchBalance,
  }
})

export const cashLoadingRegisterStore = createStore<CashLoadingRow[]>(
  'dexter_cash_loading_register_v2',
  () => INITIAL_LOADING_RECORDS,
)

/**
 * API mode: there is no backend "daily loading sheet"; the rows are derived from the live Cash Loading Master
 * (GET /cash-loading/records) — opening, withdrawal (dispense), loading and the provisional balance
 * (Opening + Loading − Withdrawal). Purge / overage / shortage are not captured by the master (0).
 */
function registerRowsFrom(recs: CashRecord[]): CashLoadingRow[] {
  return recs
    .filter((r) => r.status !== 'Draft' && r.status !== 'Rejected')
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((r, i) => {
      const physical = Math.max(0, r.openingBalance - r.cashWithdrawal)
      const closing = clBalance(r)
      return {
        no: i + 1,
        date: `${r.date.slice(8, 10)}-${r.date.slice(5, 7)}-${r.date.slice(0, 4)}`,
        atmId: r.atmId,
        mfName: r.franchiseName,
        indentNo: r.id,
        eodTime: '',
        openingBalance: r.openingBalance,
        dispense: r.cashWithdrawal,
        purgeBin: 0,
        overage: 0,
        shortage: 0,
        physicalCash: physical,
        loading: r.amount,
        closingBalance: closing,
        remarks: r.remarks || r.status,
        switchBalance: closing,
      }
    })
}

export function useCashLoadingRegister() {
  const local = cashLoadingRegisterStore.use()
  const master = clMaster.store.use()
  const records = useMemo(() => (apiEnabled ? registerRowsFrom(master) : local), [local, master])
  return {
    records,
    addRow: (row: Omit<CashLoadingRow, 'no'>) => {
      cashLoadingRegisterStore.set((prev) => {
        const nextNo = prev.length > 0 ? Math.max(...prev.map((r) => r.no)) + 1 : 1
        return [{ ...row, no: nextNo }, ...prev]
      })
    },
    updateRow: (no: number, updates: Partial<CashLoadingRow>) => {
      cashLoadingRegisterStore.set((prev) =>
        prev.map((r) => (r.no === no ? { ...r, ...updates } : r)),
      )
    },
    deleteRow: (no: number) => {
      cashLoadingRegisterStore.set((prev) => prev.filter((r) => r.no !== no))
    },
    resetRecords: () => cashLoadingRegisterStore.reset(),
  }
}

export function exportCashLoadingRegisterCsv(
  records: CashLoadingRow[],
  filename = `cash-loading-register-report-${new Date().toISOString().slice(0, 10)}`,
) {
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

  const rows = records.map((r) => [
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

  downloadCsv(filename, headers, rows)
}

