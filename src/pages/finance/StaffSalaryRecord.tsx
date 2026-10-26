import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Building2,
  FileText,
  User,
  Phone,
  Mail,
  Landmark,
  Save,
  CreditCard,
  Calculator,
  ListFilter,
  Sparkles,
  IndianRupee,
  Users,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import {
  SALARY_STATUSES,
  SALARY_MONTHS,
  SALARY_FIN_YEARS,
  calcGrossSalary,
  calcTotalDeductions,
  calcNetSalary,
  emptySalary,
  getSalary,
  saveSalary,
  type SalaryRecord,
  type SalaryStatus,
} from '@/data/financeSalary'
import { SEED_EMPLOYEES, type Employee } from '@/data/employees'

const BANKS_LIST = [
  'HDFC Bank',
  'State Bank of India',
  'ICICI Bank',
  'Axis Bank',
  'Punjab National Bank',
  'Canara Bank',
  'Bank of Baroda',
  'Kotak Mahindra Bank',
  'Union Bank of India',
  'IndusInd Bank',
]

export default function StaffSalaryRecordPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const [record, setRecord] = useState<SalaryRecord>(() => {
    if (!isNew && id) {
      const found = getSalary(id)
      if (found) return JSON.parse(JSON.stringify(found))
    }
    return emptySalary('26-27')
  })

  useEffect(() => {
    if (!isNew && id) {
      const found = getSalary(id)
      if (found) {
        setRecord(JSON.parse(JSON.stringify(found)))
      }
    }
  }, [id, isNew])

  // Employee options
  const empOptions = useMemo(() => {
    return SEED_EMPLOYEES.map((e: Employee) => ({
      empId: e.employeeCode,
      name: e.fullName,
      designation: e.designation,
      department: e.department,
      mobile: e.mobile,
      email: e.officialEmail || e.email,
    }))
  }, [])

  const handleEmpChange = (empId: string) => {
    const matched = empOptions.find((e) => e.empId === empId)
    if (matched) {
      setRecord((prev) => ({
        ...prev,
        empId,
        empName: matched.name,
        designation: matched.designation || prev.designation,
        department: matched.department || prev.department,
        mobile: matched.mobile || prev.mobile,
        email: matched.email || prev.email,
      }))
      toast(`Loaded details for employee ${empId}`)
    } else {
      setRecord((prev) => ({ ...prev, empId }))
    }
  }

  const updateField = <K extends keyof SalaryRecord>(key: K, value: SalaryRecord[K]) => {
    setRecord((prev) => ({ ...prev, [key]: value }))
  }

  // Auto calculate Net Salary
  const handleAutoCalcNet = () => {
    const gross = calcGrossSalary(record)
    const ded = calcTotalDeductions(record)
    const net = calcNetSalary(record)
    setRecord((prev) => ({
      ...prev,
      grossSalary: String(gross),
      totalDeductions: String(ded),
      netSalary: String(net),
    }))
    toast(`Calculated Net Salary: ₹${net.toLocaleString('en-IN')}`, 'info')
  }

  const grossCalculated = calcGrossSalary(record)
  const dedCalculated = calcTotalDeductions(record)
  const netCalculated = calcNetSalary(record)

  const handleSave = (isDraft = false) => {
    if (!isDraft) {
      if (!record.empId && !record.empName) {
        toast('Please enter or select an Employee ID or Name', 'info')
        return
      }
      if (!record.basicSalary) {
        toast('Please enter Basic Salary', 'info')
        return
      }
    }

    const payload: SalaryRecord = {
      ...record,
      grossSalary: record.grossSalary || String(grossCalculated),
      totalDeductions: record.totalDeductions || String(dedCalculated),
      netSalary: record.netSalary || String(netCalculated),
      paymentStatus: record.paymentStatus || (isDraft ? 'Pending' : 'Paid'),
    }

    const saved = saveSalary(payload)
    toast(
      isDraft
        ? 'Salary draft saved successfully'
        : isNew
          ? `Salary record ${saved.id} created successfully`
          : `Salary record ${saved.id} updated successfully`
    )
    navigate('/finance/hr-payments/salary')
  }

  return (
    <div className="space-y-4 pb-16 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance" className="hover:text-[#0066FF] transition-colors">
          Finance
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance/hr-payments" className="hover:text-[#0066FF] transition-colors">
          HR Payments
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance/hr-payments/salary" className="hover:text-[#0066FF] transition-colors">
          Staff Salary
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">
          {isNew ? 'new' : record.id || id}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Users size={18} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[24px] font-bold tracking-tight text-slate-900 leading-tight">
                {isNew ? 'New Salary Record' : `Salary Record · ${record.id || id}`}
              </h1>
              {!isNew && record.paymentStatus && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                    record.paymentStatus === 'Paid'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : record.paymentStatus === 'Pending'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {record.paymentStatus}
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Employee salary breakdown, allowances, statutory deductions, and disbursement routing.
            </p>
          </div>
        </div>

        {!isNew && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              S.N. #{record.sn || 1}
            </span>
          </div>
        )}
      </div>

      {/* CARD 1: Employee & Attendance Details */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-[#0066FF]">
              1. Employee &amp; Attendance Details
            </h2>
          </div>
          {record.id && (
            <span className="text-[11px] font-semibold text-[#0066FF] bg-white px-2 py-0.5 rounded border border-[#0066FF]/20 font-mono">
              {record.id}
            </span>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Employee ID * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={record.empId || ''}
                  onChange={(e) => handleEmpChange(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all font-mono"
                >
                  <option value="">Select Employee</option>
                  {empOptions.map((e) => (
                    <option key={e.empId} value={e.empId}>
                      {e.empId} - {e.name}
                    </option>
                  ))}
                  {record.empId && !empOptions.some((e) => e.empId === record.empId) && (
                    <option value={record.empId}>{record.empId}</option>
                  )}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Employee Name * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Employee Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.empName || ''}
                  onChange={(e) => updateField('empName', e.target.value)}
                  placeholder="Full name"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Department
              </label>
              <div className="relative">
                <Building2
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.department || ''}
                  onChange={(e) => updateField('department', e.target.value)}
                  placeholder="e.g. Operations"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Designation */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Designation
              </label>
              <input
                type="text"
                value={record.designation || ''}
                onChange={(e) => updateField('designation', e.target.value)}
                placeholder="e.g. Support Executive"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
              />
            </div>

            {/* Contact No. */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Contact Number
              </label>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.mobile || ''}
                  onChange={(e) => updateField('mobile', e.target.value)}
                  placeholder="Mobile number"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="email"
                  value={record.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="Official email"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>

            {/* Month & F. Year */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Salary Month &amp; FY <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={record.month || 'September'}
                  onChange={(e) => updateField('month', e.target.value)}
                  className="w-full h-8.5 px-2 text-[11px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
                >
                  {SALARY_MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={record.fYear || '26-27'}
                  onChange={(e) => updateField('fYear', e.target.value)}
                  className="w-full h-8.5 px-2 text-[11px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
                >
                  {SALARY_FIN_YEARS.map((fy) => (
                    <option key={fy} value={fy}>
                      FY {fy}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Total Working Days
              </label>
              <input
                type="number"
                value={record.workingDays || 30}
                onChange={(e) => updateField('workingDays', Number(e.target.value))}
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Paid / Present Days
              </label>
              <input
                type="number"
                value={record.paidDays || 30}
                onChange={(e) => updateField('paidDays', Number(e.target.value))}
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: Earnings & Allowances */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IndianRupee size={18} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-[#0066FF]">
              2. Earnings &amp; Allowances
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
            Gross: ₹{grossCalculated.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {/* Basic Salary */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Basic Salary (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={record.basicSalary || ''}
                onChange={(e) => updateField('basicSalary', e.target.value)}
                placeholder="e.g. 25000"
                className="w-full h-8.5 px-3 text-[12px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* HRA */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                HRA (₹)
              </label>
              <input
                type="number"
                value={record.hra || ''}
                onChange={(e) => updateField('hra', e.target.value)}
                placeholder="e.g. 10000"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* Special Allowance */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Special Allowance (₹)
              </label>
              <input
                type="number"
                value={record.specialAllowance || ''}
                onChange={(e) => updateField('specialAllowance', e.target.value)}
                placeholder="e.g. 5000"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* Conveyance */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Conveyance (₹)
              </label>
              <input
                type="number"
                value={record.conveyance || ''}
                onChange={(e) => updateField('conveyance', e.target.value)}
                placeholder="e.g. 1600"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* Gross Salary */}
            <div>
              <label className="block text-[11px] font-bold text-slate-900 mb-1">
                Gross Salary (₹)
              </label>
              <input
                type="number"
                value={record.grossSalary || grossCalculated || ''}
                onChange={(e) => updateField('grossSalary', e.target.value)}
                placeholder="0"
                className="w-full h-8.5 px-3 text-[12px] font-bold rounded-lg border border-slate-300 bg-slate-50 text-slate-900 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: Deductions & Net Salary */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-[#0066FF]">
              3. Deductions &amp; Net Salary
            </h2>
          </div>
          <button
            type="button"
            onClick={handleAutoCalcNet}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-[#0066FF] bg-white hover:bg-blue-50 border border-[#0066FF]/30 rounded-md transition-colors shadow-xs"
          >
            <Sparkles size={13} className="text-[#0066FF]" />
            Auto Calculate Net
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
            {/* PF */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                PF Deduction (₹)
              </label>
              <input
                type="number"
                value={record.pfDeduction || ''}
                onChange={(e) => updateField('pfDeduction', e.target.value)}
                placeholder="0"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* ESI */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ESI (₹)
              </label>
              <input
                type="number"
                value={record.esiDeduction || ''}
                onChange={(e) => updateField('esiDeduction', e.target.value)}
                placeholder="0"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* Prof Tax */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Prof. Tax (₹)
              </label>
              <input
                type="number"
                value={record.profTax || ''}
                onChange={(e) => updateField('profTax', e.target.value)}
                placeholder="200"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* TDS */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                TDS / Tax (₹)
              </label>
              <input
                type="number"
                value={record.tdsDeduction || ''}
                onChange={(e) => updateField('tdsDeduction', e.target.value)}
                placeholder="0"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* Other Deductions */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Other Deductions (₹)
              </label>
              <input
                type="number"
                value={record.otherDeductions || ''}
                onChange={(e) => updateField('otherDeductions', e.target.value)}
                placeholder="0"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* Net Salary * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-900 mb-1">
                Net Salary (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={record.netSalary || netCalculated || ''}
                onChange={(e) => updateField('netSalary', e.target.value)}
                placeholder="0"
                className="w-full h-8.5 px-3 text-[12px] font-bold rounded-lg border-2 border-[#0066FF] bg-blue-50/20 text-[#0066FF] outline-none"
              />
            </div>
          </div>

          {/* Quick Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 text-[12px]">
            <div className="flex items-center gap-6 text-slate-600 font-medium">
              <span>
                Gross: <strong className="text-slate-900 font-semibold">₹{grossCalculated.toLocaleString('en-IN')}</strong>
              </span>
              <span>
                Total Deductions: <strong className="text-rose-600 font-semibold">₹{dedCalculated.toLocaleString('en-IN')}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Calculated Net Payout:</span>
              <span className="font-bold text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                ₹{netCalculated.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 4: Disbursement & Bank Details */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <Landmark size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">
            4. Disbursement &amp; Bank Details
          </h2>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Bank Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <select
                value={record.bankName || 'HDFC Bank'}
                onChange={(e) => updateField('bankName', e.target.value)}
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              >
                {BANKS_LIST.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={record.accountNumber || ''}
                onChange={(e) => updateField('accountNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="Account number"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] font-mono"
              />
            </div>

            {/* IFSC Code */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                IFSC Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={record.ifscCode || ''}
                onChange={(e) => updateField('ifscCode', e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001834"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] font-mono uppercase"
              />
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payment Status
              </label>
              <div className="relative">
                <ListFilter
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={record.paymentStatus || 'Pending'}
                  onChange={(e) => updateField('paymentStatus', e.target.value as SalaryStatus)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  {SALARY_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={record.paymentDate || ''}
                onChange={(e) => updateField('paymentDate', e.target.value)}
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* UTR Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                UTR / Reference Number
              </label>
              <input
                type="text"
                value={record.utrNumber || ''}
                onChange={(e) => updateField('utrNumber', e.target.value.toUpperCase())}
                placeholder="Bank UTR"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] font-mono uppercase"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Remarks
            </label>
            <input
              type="text"
              value={record.remarks || ''}
              onChange={(e) => updateField('remarks', e.target.value)}
              placeholder="e.g. Monthly salary processed after attendance sign-off"
              className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
            />
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 h-9.5 px-5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0066FF] text-[12.5px] font-semibold transition-all shadow-xs"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="inline-flex items-center gap-1.5 h-9.5 px-5 rounded-lg border border-[#0066FF] bg-white hover:bg-blue-50/60 text-[#0066FF] text-[12.5px] font-semibold transition-all shadow-xs"
          >
            <Save size={15} />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-1.5 h-9.5 px-6 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-semibold transition-all shadow-sm"
          >
            <span>Save Salary Record</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
