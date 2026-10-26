import { createStore } from '@/lib/store'
import { SEED_EMPLOYEES } from './employees'

export const SALARY_STATUSES = ['Paid', 'Pending', 'On Hold'] as const
export type SalaryStatus = (typeof SALARY_STATUSES)[number]

export const SALARY_MONTHS = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March'
] as const

export const SALARY_FIN_YEARS = ['24-25', '25-26', '26-27'] as const

export interface SalaryRecord {
  id: string // SAL-0001
  sn: number
  empId: string
  empName: string
  designation: string
  department: string
  mobile: string
  email: string
  fYear: string
  month: string
  workingDays: number
  paidDays: number
  // Earnings
  basicSalary: string
  hra: string
  specialAllowance: string
  conveyance: string
  grossSalary: string
  // Deductions
  pfDeduction: string
  esiDeduction: string
  profTax: string
  tdsDeduction: string
  otherDeductions: string
  totalDeductions: string
  netSalary: string
  // Bank & Settlement
  bankName: string
  accountNumber: string
  ifscCode: string
  paymentStatus: SalaryStatus
  paymentDate: string
  utrNumber: string
  remarks: string
  updatedAt: string
  updatedBy: string
}

export function calcGrossSalary(rec: Partial<SalaryRecord>): number {
  const b = Number(rec.basicSalary) || 0
  const h = Number(rec.hra) || 0
  const s = Number(rec.specialAllowance) || 0
  const c = Number(rec.conveyance) || 0
  return Math.round((b + h + s + c) * 100) / 100
}

export function calcTotalDeductions(rec: Partial<SalaryRecord>): number {
  const pf = Number(rec.pfDeduction) || 0
  const esi = Number(rec.esiDeduction) || 0
  const pt = Number(rec.profTax) || 0
  const tds = Number(rec.tdsDeduction) || 0
  const oth = Number(rec.otherDeductions) || 0
  return Math.round((pf + esi + pt + tds + oth) * 100) / 100
}

export function calcNetSalary(rec: Partial<SalaryRecord>): number {
  const gross = calcGrossSalary(rec)
  const deductions = calcTotalDeductions(rec)
  return Math.max(0, Math.round((gross - deductions) * 100) / 100)
}

function seedSalaries(): SalaryRecord[] {
  const employees = SEED_EMPLOYEES.slice(0, 10)
  const months = ['September', 'August', 'July']
  const out: SalaryRecord[] = []
  let sn = 1

  for (const m of months) {
    for (const emp of employees) {
      const basic = 28000 + (sn % 5) * 5000
      const hra = Math.round(basic * 0.4)
      const special = 5000 + (sn % 3) * 1500
      const conveyance = 1600
      const gross = basic + hra + special + conveyance

      const pf = Math.round(basic * 0.12)
      const esi = gross < 21000 ? Math.round(gross * 0.0075) : 0
      const pt = 200
      const tds = (sn % 3 === 0) ? 1500 : 0
      const other = 0
      const totalDed = pf + esi + pt + tds + other
      const net = gross - totalDed

      const isPaid = m !== 'September' || sn % 3 !== 0
      const status: SalaryStatus = isPaid ? 'Paid' : (sn % 2 === 0 ? 'Pending' : 'On Hold')
      const payDate = isPaid ? (m === 'September' ? '2026-10-01' : m === 'August' ? '2026-09-01' : '2026-08-01') : ''
      const utr = isPaid ? `SALN26${String(100000000 + sn * 8421).slice(-9)}` : ''

      out.push({
        id: `SAL-${String(sn).padStart(4, '0')}`,
        sn,
        empId: emp.employeeCode || `DIT00${sn}`,
        empName: emp.fullName,
        designation: emp.designation || 'Support Executive',
        department: emp.department || 'Operations',
        mobile: emp.mobile || '9876543210',
        email: emp.officialEmail || emp.email || 'staff@dexterindia.com',
        fYear: '26-27',
        month: m,
        workingDays: 30,
        paidDays: status === 'On Hold' ? 24 : 30,
        basicSalary: String(basic),
        hra: String(hra),
        specialAllowance: String(special),
        conveyance: String(conveyance),
        grossSalary: String(gross),
        pfDeduction: String(pf),
        esiDeduction: String(esi),
        profTax: String(pt),
        tdsDeduction: String(tds),
        otherDeductions: String(other),
        totalDeductions: String(totalDed),
        netSalary: String(net),
        bankName: 'HDFC Bank',
        accountNumber: `501002948${String(sn).padStart(4, '0')}`,
        ifscCode: 'HDFC0001834',
        paymentStatus: status,
        paymentDate: payDate,
        utrNumber: utr,
        remarks: status === 'On Hold' ? 'Attendance reconciliation pending for 6 days.' : 'Monthly payroll processed.',
        updatedAt: '2026-10-02T10:00:00+05:30',
        updatedBy: 'Vikram Shah',
      })
      sn++
    }
  }
  return out
}

export const salaryStore = createStore<SalaryRecord[]>('dexter.finance.salary.v1', seedSalaries)
export const getSalary = (id: string) => salaryStore.get().find((s) => s.id === id)

export function emptySalary(fy = '26-27'): SalaryRecord {
  return {
    id: '',
    sn: 0,
    empId: '',
    empName: '',
    designation: '',
    department: '',
    mobile: '',
    email: '',
    fYear: fy,
    month: 'September',
    workingDays: 30,
    paidDays: 30,
    basicSalary: '',
    hra: '',
    specialAllowance: '',
    conveyance: '',
    grossSalary: '',
    pfDeduction: '',
    esiDeduction: '',
    profTax: '',
    tdsDeduction: '',
    otherDeductions: '',
    totalDeductions: '',
    netSalary: '',
    bankName: 'HDFC Bank',
    accountNumber: '',
    ifscCode: '',
    paymentStatus: 'Pending',
    paymentDate: '',
    utrNumber: '',
    remarks: '',
    updatedAt: '',
    updatedBy: '',
  }
}

export function saveSalary(rec: SalaryRecord): SalaryRecord {
  const stamp = { updatedAt: new Date().toISOString(), updatedBy: 'Vikram Shah' }
  const gross = calcGrossSalary(rec)
  const deductions = calcTotalDeductions(rec)
  const net = calcNetSalary(rec)

  const toSave: SalaryRecord = {
    ...rec,
    grossSalary: rec.grossSalary || String(gross),
    totalDeductions: rec.totalDeductions || String(deductions),
    netSalary: rec.netSalary || String(net),
    ...stamp,
  }

  if (!rec.id) {
    const all = salaryStore.get()
    const sn = all.reduce((m, s) => Math.max(m, s.sn), 0) + 1
    const created = { ...toSave, sn, id: `SAL-${String(sn).padStart(4, '0')}` }
    salaryStore.set([...all, created])
    return created
  }

  salaryStore.set((all) => all.map((s) => (s.id === rec.id ? toSave : s)))
  return toSave
}

export function deleteSalary(id: string) {
  salaryStore.set((all) => all.filter((s) => s.id !== id))
}
