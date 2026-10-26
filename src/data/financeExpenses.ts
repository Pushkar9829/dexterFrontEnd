import { createStore } from '@/lib/store'
import { SEED_EMPLOYEES } from './employees'

export const EXPENSE_CATEGORIES = [
  'Travel & Conveyance',
  'Food & Meals',
  'Lodging & Hotel',
  'Fuel & Mileage',
  'Office Supplies',
  'Client Entertainment',
  'Mobile & Internet',
  'Miscellaneous',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const EXPENSE_STATUSES = ['Pending', 'Approved', 'Paid', 'Rejected'] as const
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number]

export interface ExpenseRecord {
  id: string // EXP-0001
  sn: number
  empId: string
  empName: string
  department: string
  mobile: string
  category: ExpenseCategory
  claimDate: string
  expenseDate: string
  billNumber: string
  billAmount: string
  approvedAmount: string
  taxAmount: string
  deductionAmount: string
  reimbursementAmount: string
  description: string
  bankName: string
  accountNumber: string
  ifscCode: string
  paymentStatus: ExpenseStatus
  paymentDate: string
  utrNumber: string
  remarks: string
  updatedAt: string
  updatedBy: string
}

function seedExpenses(): ExpenseRecord[] {
  const employees = SEED_EMPLOYEES.slice(0, 10)
  const cats: ExpenseCategory[] = [
    'Travel & Conveyance',
    'Fuel & Mileage',
    'Food & Meals',
    'Lodging & Hotel',
    'Office Supplies',
    'Mobile & Internet',
  ]
  const out: ExpenseRecord[] = []
  let sn = 1

  for (let i = 0; i < 24; i++) {
    const emp = employees[i % employees.length]
    const cat = cats[i % cats.length]
    const bill = Math.round(800 + (i * 350) % 7500)
    const approved = i % 5 === 0 ? Math.round(bill * 0.85) : bill
    const isPaid = i < 15
    const isApproved = isPaid || i < 20
    const isRejected = i === 23
    const status: ExpenseStatus = isPaid ? 'Paid' : isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'
    const payDate = isPaid ? `2026-09-${String(10 + (i % 15)).padStart(2, '0')}` : ''
    const utr = isPaid ? `EXPN26${String(200000000 + i * 9341).slice(-9)}` : ''

    out.push({
      id: `EXP-${String(sn).padStart(4, '0')}`,
      sn,
      empId: emp.employeeCode || `DIT00${(i % 10) + 1}`,
      empName: emp.fullName,
      department: emp.department || 'Operations',
      mobile: emp.mobile || '9876543210',
      category: cat,
      claimDate: `2026-09-${String(5 + (i % 20)).padStart(2, '0')}`,
      expenseDate: `2026-09-${String(1 + (i % 18)).padStart(2, '0')}`,
      billNumber: `BILL/2026/${String(100 + i)}`,
      billAmount: String(bill),
      approvedAmount: String(approved),
      taxAmount: String(Math.round(bill * 0.18)),
      deductionAmount: bill > approved ? String(bill - approved) : '0',
      reimbursementAmount: String(approved),
      description: `Field visit & official operational expense for ${cat.toLowerCase()}.`,
      bankName: 'HDFC Bank',
      accountNumber: `501004921${String(sn).padStart(4, '0')}`,
      ifscCode: 'HDFC0001834',
      paymentStatus: status,
      paymentDate: payDate,
      utrNumber: utr,
      remarks: isRejected ? 'Original receipts missing.' : isPaid ? 'Reimbursement disbursed.' : 'Verified by accounts team.',
      updatedAt: '2026-09-28T14:30:00+05:30',
      updatedBy: 'Vikram Shah',
    })
    sn++
  }
  return out
}

export const expenseStore = createStore<ExpenseRecord[]>('dexter.finance.expenses.v1', seedExpenses)
export const getExpense = (id: string) => expenseStore.get().find((e) => e.id === id)

export function emptyExpense(): ExpenseRecord {
  return {
    id: '',
    sn: 0,
    empId: '',
    empName: '',
    department: '',
    mobile: '',
    category: 'Travel & Conveyance',
    claimDate: new Date().toISOString().slice(0, 10),
    expenseDate: new Date().toISOString().slice(0, 10),
    billNumber: '',
    billAmount: '',
    approvedAmount: '',
    taxAmount: '',
    deductionAmount: '',
    reimbursementAmount: '',
    description: '',
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

export function saveExpense(rec: ExpenseRecord): ExpenseRecord {
  const stamp = { updatedAt: new Date().toISOString(), updatedBy: 'Vikram Shah' }
  const bill = Number(rec.billAmount) || 0
  const approved = Number(rec.approvedAmount) || bill
  const toSave: ExpenseRecord = {
    ...rec,
    approvedAmount: rec.approvedAmount || String(bill),
    reimbursementAmount: rec.reimbursementAmount || String(approved),
    ...stamp,
  }

  if (!rec.id) {
    const all = expenseStore.get()
    const sn = all.reduce((m, e) => Math.max(m, e.sn), 0) + 1
    const created = { ...toSave, sn, id: `EXP-${String(sn).padStart(4, '0')}` }
    expenseStore.set([...all, created])
    return created
  }

  expenseStore.set((all) => all.map((e) => (e.id === rec.id ? toSave : e)))
  return toSave
}

export function deleteExpense(id: string) {
  expenseStore.set((all) => all.filter((e) => e.id !== id))
}
