import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Plus,
  RotateCcw,
  Search,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'

interface AttendanceRecord {
  id: string
  empId: string
  empName: string
  department: string
  designation: string
  shift: string
  date: string
  punchIn: string
  punchOut: string
  workHours: string
  status: 'Present' | 'Late' | 'On Leave' | 'Half Day'
}

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    empId: 'EMP-0101',
    empName: 'Harsh Pratap Singh',
    department: 'Operations',
    designation: 'ATM Field Operations Lead',
    shift: 'General (09:30 - 18:30)',
    date: '2026-10-25',
    punchIn: '09:24 AM',
    punchOut: '06:35 PM',
    workHours: '9h 11m',
    status: 'Present',
  },
  {
    id: 'att-2',
    empId: 'EMP-0102',
    empName: 'Amitabh Sharma',
    department: 'Finance',
    designation: 'Senior Accounts Officer',
    shift: 'General (09:30 - 18:30)',
    date: '2026-10-25',
    punchIn: '09:48 AM',
    punchOut: '—',
    workHours: 'In progress',
    status: 'Late',
  },
  {
    id: 'att-3',
    empId: 'EMP-0103',
    empName: 'Pooja Deshmukh',
    department: 'Legal & Compliance',
    designation: 'Legal Associate',
    shift: 'General (09:30 - 18:30)',
    date: '2026-10-25',
    punchIn: '09:15 AM',
    punchOut: '—',
    workHours: 'In progress',
    status: 'Present',
  },
  {
    id: 'att-4',
    empId: 'EMP-0104',
    empName: 'Rajesh Nair',
    department: 'Operations',
    designation: 'Cash Loading Coordinator',
    shift: 'Morning (07:00 - 15:30)',
    date: '2026-10-25',
    punchIn: '06:55 AM',
    punchOut: '03:40 PM',
    workHours: '8h 45m',
    status: 'Present',
  },
  {
    id: 'att-5',
    empId: 'EMP-0105',
    empName: 'Sneha Verma',
    department: 'Human Resources',
    designation: 'HR Executive',
    shift: 'General (09:30 - 18:30)',
    date: '2026-10-25',
    punchIn: '—',
    punchOut: '—',
    workHours: '0h',
    status: 'On Leave',
  },
  {
    id: 'att-6',
    empId: 'EMP-0106',
    empName: 'Vikram Joshi',
    department: 'Franchise Support',
    designation: 'Channel Partner Manager',
    shift: 'General (09:30 - 18:30)',
    date: '2026-10-25',
    punchIn: '09:20 AM',
    punchOut: '02:00 PM',
    workHours: '4h 40m',
    status: 'Half Day',
  },
  {
    id: 'att-7',
    empId: 'EMP-0107',
    empName: 'Kavita Pillai',
    department: 'Technology',
    designation: 'Systems Administrator',
    shift: 'General (09:30 - 18:30)',
    date: '2026-10-25',
    punchIn: '09:28 AM',
    punchOut: '—',
    workHours: 'In progress',
    status: 'Present',
  },
]

export default function HrmsAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE)
  const [search, setSearch] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('2026-10-25')

  // Quick punch modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [punchEmpId, setPunchEmpId] = useState('')
  const [punchEmpName, setPunchEmpName] = useState('')
  const [punchType, setPunchType] = useState<'Present' | 'Late' | 'On Leave' | 'Half Day'>('Present')
  const [punchDept, setPunchDept] = useState('Operations')

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (search) {
        const q = search.toLowerCase()
        const matches =
          r.empId.toLowerCase().includes(q) ||
          r.empName.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q)
        if (!matches) return false
      }
      if (shiftFilter && !r.shift.toLowerCase().includes(shiftFilter.toLowerCase())) return false
      if (statusFilter && r.status !== statusFilter) return false
      if (dateFilter && r.date !== dateFilter) return false
      return true
    })
  }, [records, search, shiftFilter, statusFilter, dateFilter])

  const stats = useMemo(() => {
    const total = records.length
    const present = records.filter((r) => r.status === 'Present').length
    const late = records.filter((r) => r.status === 'Late').length
    const leave = records.filter((r) => r.status === 'On Leave').length
    const halfDay = records.filter((r) => r.status === 'Half Day').length
    return { total, present, late, leave, halfDay }
  }, [records])

  const handleExport = () => {
    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Designation',
      'Shift',
      'Date',
      'Punch In',
      'Punch Out',
      'Work Hours',
      'Status',
    ]
    const rows = filtered.map((r) => [
      r.empId,
      r.empName,
      r.department,
      r.designation,
      r.shift,
      r.date,
      r.punchIn,
      r.punchOut,
      r.workHours,
      r.status,
    ])
    downloadCsv(`HRMS_Attendance_${dateFilter || 'Export'}`, headers, rows)
    toast(`Exported ${filtered.length} attendance records to CSV`)
  }

  const handleMarkPunch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!punchEmpName.trim()) {
      toast('Please enter employee name', 'info')
      return
    }
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      empId: punchEmpId.trim() || `EMP-${String(Math.floor(1000 + Math.random() * 9000))}`,
      empName: punchEmpName.trim(),
      department: punchDept,
      designation: 'Associate',
      shift: 'General (09:30 - 18:30)',
      date: dateFilter || '2026-10-25',
      punchIn: punchType === 'On Leave' ? '—' : '09:30 AM',
      punchOut: '—',
      workHours: punchType === 'On Leave' ? '0h' : 'In progress',
      status: punchType,
    }
    setRecords([newRecord, ...records])
    toast(`Logged attendance for ${punchEmpName}`)
    setIsModalOpen(false)
    setPunchEmpName('')
    setPunchEmpId('')
  }

  return (
    <div className="mx-auto max-w-[1300px] pb-16 font-sans">
      {/* Breadcrumb */}
      <nav className="mb-3 flex items-center gap-1.5 text-[12px] text-[#64748B]">
        <Link to="/dashboard" className="hover:text-[#0066FF]">
          Workspace
        </Link>
        <span>&gt;</span>
        <Link to="/hrms" className="hover:text-[#0066FF]">
          HRMS
        </Link>
        <span>&gt;</span>
        <span className="font-medium text-[#1E293B]">Attendance</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/hrms"
              className="grid h-8 w-8 place-items-center rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] hover:bg-slate-50 hover:text-[#0066FF]"
              title="Back to HRMS"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-[26px] font-bold tracking-tight text-[#0F172A]">Attendance Records</h1>
          </div>
          <p className="mt-1 text-[13px] text-[#64748B]">
            Daily biometric shift punches, employee rosters, in/out timestamps, and leave tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExport}
            className="h-9 border-[#CBD5E1] bg-white text-[#334155] hover:bg-slate-50"
          >
            <Download size={14} className="mr-1.5 text-[#0066FF]" /> Export
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-9 bg-[#0066FF] text-white hover:bg-[#0052CC]"
          >
            <Plus size={15} className="mr-1.5" /> Log Punch
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#DCE8F6] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#64748B]">Total Staff</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[#0066FF]">
              <Users size={16} />
            </span>
          </div>
          <div className="mt-2 text-[24px] font-bold text-[#0F172A]">{stats.total}</div>
          <p className="mt-0.5 text-[11px] text-[#64748B]">Configured in roster</p>
        </div>

        <div className="rounded-xl border border-[#DCE8F6] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#64748B]">Present Today</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck size={16} />
            </span>
          </div>
          <div className="mt-2 text-[24px] font-bold text-emerald-600">{stats.present}</div>
          <p className="mt-0.5 text-[11px] text-emerald-700">
            {stats.total > 0 ? `${((stats.present / stats.total) * 100).toFixed(0)}% attendance rate` : '0%'}
          </p>
        </div>

        <div className="rounded-xl border border-[#DCE8F6] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#64748B]">Late Punches</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <Clock size={16} />
            </span>
          </div>
          <div className="mt-2 text-[24px] font-bold text-amber-600">{stats.late}</div>
          <p className="mt-0.5 text-[11px] text-[#64748B]">Punched after 09:30 AM</p>
        </div>

        <div className="rounded-xl border border-[#DCE8F6] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#64748B]">On Leave / Half Day</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-600">
              <UserX size={16} />
            </span>
          </div>
          <div className="mt-2 text-[24px] font-bold text-purple-600">{stats.leave + stats.halfDay}</div>
          <p className="mt-0.5 text-[11px] text-[#64748B]">
            {stats.leave} Leaves · {stats.halfDay} Half Day
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="mb-6 rounded-xl border border-[#DCE8F6] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3 text-[13px] font-semibold text-[#1E293B]">
          <Filter size={15} className="text-[#0066FF]" />
          <span>Filters</span>
        </div>
        <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#475569]">Search Employee</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Name, ID or Dept..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#475569]">Date</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-2.5 text-[#94A3B8]" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#475569]">Shift</label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
            >
              <option value="">All Shifts</option>
              <option value="General">General (09:30 - 18:30)</option>
              <option value="Morning">Morning (07:00 - 15:30)</option>
              <option value="Night">Night (22:00 - 06:30)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#475569]">Status</label>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-[#CBD5E1] bg-white px-2.5 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              >
                <option value="">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="On Leave">On Leave</option>
                <option value="Half Day">Half Day</option>
              </select>
              {(search || shiftFilter || statusFilter || dateFilter !== '2026-10-25') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setShiftFilter('')
                    setStatusFilter('')
                    setDateFilter('2026-10-25')
                  }}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#CBD5E1] text-[#64748B] hover:bg-slate-50 hover:text-[#0066FF]"
                  title="Reset Filters"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-[#DCE8F6] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#DCE8F6] bg-[#F8FAFD] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[#0066FF]/10 text-[#0066FF]">
              <CalendarCheck size={14} />
            </span>
            <span className="text-[13.5px] font-semibold text-[#0F172A]">Attendance Log</span>
          </div>
          <span className="text-[12px] text-[#64748B]">Showing {filtered.length} entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-[#DCE8F6] bg-[#EAF2FD]/70 text-[11px] font-bold uppercase tracking-wider text-[#334155]">
                <th className="py-3 px-4 w-28">Emp ID</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">Punch In</th>
                <th className="py-3 px-4">Punch Out</th>
                <th className="py-3 px-4">Work Hours</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.length > 0 ? (
                filtered.map((r) => {
                  const badgeColor =
                    r.status === 'Present'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : r.status === 'Late'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : r.status === 'On Leave'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'

                  return (
                    <tr key={r.id} className="transition-colors hover:bg-[#F8FAFD]">
                      <td className="py-3.5 px-4 font-mono font-medium text-[#0066FF]">{r.empId}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#1E293B]">{r.empName}</td>
                      <td className="py-3.5 px-4">
                        <div className="text-[12.5px] text-[#334155]">{r.department}</div>
                        <div className="text-[11px] text-[#64748B]">{r.designation}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#475569]">{r.shift}</td>
                      <td className="py-3.5 px-4 font-medium text-[#1E293B]">{r.punchIn}</td>
                      <td className="py-3.5 px-4 font-medium text-[#1E293B]">{r.punchOut}</td>
                      <td className="py-3.5 px-4 text-[#475569]">{r.workHours}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeColor}`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#64748B]">
                    No attendance records match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Punch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-[#DCE8F6]">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#0066FF]/10 text-[#0066FF]">
                  <CheckCircle2 size={16} />
                </span>
                <h3 className="text-[16px] font-bold text-[#0F172A]">Manual Punch Entry</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-lg text-[#64748B] hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleMarkPunch} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[#334155] mb-1">Employee Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={punchEmpName}
                  onChange={(e) => setPunchEmpName(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#334155] mb-1">Employee ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. EMP-0108"
                  value={punchEmpId}
                  onChange={(e) => setPunchEmpId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#334155] mb-1">Department</label>
                  <select
                    value={punchDept}
                    onChange={(e) => setPunchDept(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[#CBD5E1] px-2.5 text-[12.5px] outline-none focus:border-[#0066FF]"
                  >
                    <option value="Operations">Operations</option>
                    <option value="Finance">Finance</option>
                    <option value="Legal & Compliance">Legal & Compliance</option>
                    <option value="Technology">Technology</option>
                    <option value="Franchise Support">Franchise Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#334155] mb-1">Status</label>
                  <select
                    value={punchType}
                    onChange={(e) => setPunchType(e.target.value as any)}
                    className="h-9 w-full rounded-lg border border-[#CBD5E1] px-2.5 text-[12.5px] outline-none focus:border-[#0066FF]"
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Half Day">Half Day</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-[#F1F5F9] pt-3.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="border-[#CBD5E1]"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-[#0066FF] text-white hover:bg-[#0052CC]">
                  Record Punch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
