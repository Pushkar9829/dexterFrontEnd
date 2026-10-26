import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Edit2,
  Eye,
  EyeOff,
  GraduationCap,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Printer,
  Trash2,
  User,
  Briefcase,
  ChevronRight,
  Home,
} from 'lucide-react'
import { getEmployee, deleteEmployee, setEmployeeStatus } from '@/data/employeeStore'
import { toast } from '@/components/ui/Toast'

export default function EmployeeRecord() {
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()
  const emp = getEmployee(id)

  const [showMaskedAccount, setShowMaskedAccount] = useState(true)

  if (!emp) {
    return <Navigate to="/onboarding/users" replace />
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete employee ${emp.fullName} (${emp.employeeCode})?`)) {
      deleteEmployee(emp.id)
      toast(`Employee ${emp.fullName} removed successfully`)
      navigate('/onboarding/users')
    }
  }

  const handleToggleStatus = () => {
    const nextStatus = emp.status === 'Active' ? 'Inactive' : 'Active'
    setEmployeeStatus([emp.id], nextStatus)
    toast(`Employee status updated to ${nextStatus}`)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4 pb-16 max-w-[1400px]">
      {/* Breadcrumb matching pattern */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/onboarding" className="hover:text-[#0066FF] transition-colors">
          Onboarding
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/onboarding/users" className="hover:text-[#0066FF] transition-colors">
          User / Employee Management
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">{emp.employeeCode}</span>
      </div>

      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              {emp.fullName}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                emp.status === 'Active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : emp.status === 'Pending' || emp.status === 'Probation'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {emp.status}
            </span>
            <span className="text-[12px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {emp.jobType}
            </span>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            {emp.designation} · {emp.department} · Joined on {emp.dateOfJoining || '—'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-xs"
          >
            <Printer size={15} />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/onboarding/users/${emp.id}/edit`)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-semibold transition-all shadow-sm"
          >
            <Edit2 size={14} />
            <span>Edit Employee</span>
          </button>

          <button
            type="button"
            onClick={handleToggleStatus}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-xs"
          >
            <CheckCircle2 size={15} className="text-[#0066FF]" />
            <span>{emp.status === 'Active' ? 'Deactivate' : 'Activate'}</span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold transition-all shadow-xs"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Top Banner / Information Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-5">
          {/* Employee Avatar / Photo */}
          <div className="w-14 h-14 rounded-xl bg-[#0066FF] text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-sm overflow-hidden self-start lg:self-center">
            {emp.photoUrl ? (
              <img
                src={emp.photoUrl}
                alt={emp.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>
                {emp.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
            )}
          </div>

          {/* 6 Key Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 flex-1 items-center">
            {/* 1. Employee Code */}
            <div>
              <div className="text-[11px] font-medium text-slate-500 mb-0.5">Employee Code</div>
              <div className="text-[14px] font-bold text-[#0066FF]">{emp.employeeCode}</div>
              <div className="text-[10px] text-slate-400">TP: {emp.tpCode || '—'}</div>
            </div>

            {/* 2. Full Name */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-0.5">
                <User size={13} className="text-[#0066FF]" />
                <span>Full Name</span>
              </div>
              <div className="text-[13px] font-semibold text-slate-800 truncate" title={emp.fullName}>
                {emp.fullName || '—'}
              </div>
            </div>

            {/* 3. Mobile Number */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-0.5">
                <Phone size={13} className="text-[#0066FF]" />
                <span>Contact Number</span>
              </div>
              <div className="text-[13px] font-semibold text-slate-800 truncate">
                {emp.mobile || '—'}
              </div>
            </div>

            {/* 4. Official Email */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-0.5">
                <Mail size={13} className="text-[#0066FF]" />
                <span>Official Email</span>
              </div>
              <div className="text-[13px] font-semibold text-slate-800 truncate" title={emp.email}>
                {emp.email || '—'}
              </div>
            </div>

            {/* 5. Department & Role */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-0.5">
                <Briefcase size={13} className="text-[#0066FF]" />
                <span>Department</span>
              </div>
              <div className="text-[13px] font-semibold text-slate-800 truncate">
                {emp.department || '—'}
              </div>
            </div>

            {/* 6. Org Unit */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-0.5">
                <MapPin size={13} className="text-[#0066FF]" />
                <span>Org Unit</span>
              </div>
              <div
                className="text-[13px] font-semibold text-slate-800 truncate"
                title={emp.orgUnitName}
              >
                {emp.orgUnitName || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Basic & Personal Information */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <User size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">1. Basic & Personal Information</h2>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Gender</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">{emp.gender || '—'}</div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Date of Birth</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">{emp.dob || '—'}</div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Blood Group</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">{emp.bloodGroup || '—'}</div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Marital Status</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.maritalStatus || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Father's / Husband's Name</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.fatherHusbandName || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Mother's Name</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.motherName || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">PAN Number</div>
            <div className="text-[13px] font-semibold text-slate-800 font-mono mt-0.5">
              {emp.panNo || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Nationality</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.nationality || 'Indian'}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Address & Contact Details */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <MapPin size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">2. Address & Contact Details</h2>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Personal Mobile</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.personalMobile || emp.mobile || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Personal Email</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.personalEmail || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Emergency Contact Person</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.emergencyContactPerson || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Emergency Contact Number</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.emergencyContactNo || '—'}
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="text-[11px] font-medium text-slate-500">Residential Address</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.residentialAddress || '—'}
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="text-[11px] font-medium text-slate-500">Permanent Address</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.sameAsPermanent ? 'Same as residential address' : emp.permanentAddress || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">District</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">{emp.district || '—'}</div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">State</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">{emp.state || '—'}</div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">PIN Code</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">{emp.pinCode || '—'}</div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Employment & Organization Details */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <Briefcase size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">
            3. Employment & Organization Details
          </h2>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Department</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.department || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Designation</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.designation || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Job Type</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">{emp.jobType || '—'}</div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Date of Joining</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.dateOfJoining || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Reporting Manager</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.reportingManager || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Project Assigned</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.project || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Vendor / Agency</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.vendorName || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Geo-Fencing Zone</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.geoFencingName || '—'}
            </div>
          </div>

          {emp.skills && emp.skills.length > 0 && (
            <div className="sm:col-span-4">
              <div className="text-[11px] font-medium text-slate-500 mb-1.5">Key Skills</div>
              <div className="flex flex-wrap gap-1.5">
                {emp.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-[#0066FF] border border-blue-200/60"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: Education & Experience */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <GraduationCap size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">4. Education & Experience</h2>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* Education Records */}
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Educational Qualifications ({emp.education?.length || 0})
            </h3>
            {emp.education && emp.education.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-[11px] text-slate-700">
                  <thead className="bg-[#F8FAFC] text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-left">Course / Degree</th>
                      <th className="py-2 px-3 text-left">Specialization</th>
                      <th className="py-2 px-3 text-left">University / Board</th>
                      <th className="py-2 px-3 text-center">Passing Year</th>
                      <th className="py-2 px-3 text-center">Score / %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emp.education.map((edu) => (
                      <tr key={edu.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 px-3 font-semibold text-slate-900">{edu.course}</td>
                        <td className="py-2 px-3">{edu.specialization || '—'}</td>
                        <td className="py-2 px-3">{edu.university || '—'}</td>
                        <td className="py-2 px-3 text-center">{edu.passingYear || '—'}</td>
                        <td className="py-2 px-3 text-center font-medium text-[#0066FF]">
                          {edu.percentage ? `${edu.percentage}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-[12px] text-slate-400 italic">No education records provided</div>
            )}
          </div>

          {/* Work Experience */}
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Previous Work Experience ({emp.workExperience?.length || 0})
            </h3>
            {emp.workExperience && emp.workExperience.length > 0 ? (
              <div className="space-y-2">
                {emp.workExperience.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-[13px]">{exp.companyName}</div>
                      <div className="text-[12px] text-slate-600">
                        {exp.jobTitle} · {exp.totalExperience || '—'}
                      </div>
                      {exp.jobDescription && (
                        <div className="text-[11px] text-slate-500 mt-1">{exp.jobDescription}</div>
                      )}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 whitespace-nowrap self-start sm:self-center">
                      {exp.fromDate} to {exp.toDate}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[12px] text-slate-400 italic">No prior experience listed</div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 5: Bank & Salary Payout */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark size={18} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-[#0066FF]">5. Bank & Salary Payout</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowMaskedAccount((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0066FF] hover:underline"
          >
            {showMaskedAccount ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>{showMaskedAccount ? 'Show Full Account' : 'Mask Account'}</span>
          </button>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Bank Name</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.bankName || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Name as per Bank</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.nameAsPerBank || emp.fullName || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Account Number</div>
            <div className="text-[13px] font-semibold font-mono text-slate-800 mt-0.5">
              {emp.accountNumber
                ? showMaskedAccount
                  ? `•••• •••• ${emp.accountNumber.slice(-4)}`
                  : emp.accountNumber
                : '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">IFSC Code</div>
            <div className="text-[13px] font-semibold font-mono text-slate-800 mt-0.5">
              {emp.ifscCode || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Branch Name</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.bankBranch || '—'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Account Status</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.accountStatus || 'Active'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Salary Payout Mode</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.salaryPayoutMode || 'Bank Transfer (NEFT/RTGS)'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Cheque Facility</div>
            <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
              {emp.chequeFacility || 'Available'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/onboarding/users')}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#0066FF]/30 text-[#0066FF] hover:bg-blue-50/60 text-[13px] font-semibold transition-all shadow-xs"
        >
          <ArrowLeft size={16} />
          <span>Back to Staff List</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[13px] font-semibold transition-all shadow-xs"
          >
            <Printer size={15} />
            <span>Print Record</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/onboarding/users/${emp.id}/edit`)}
            className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow"
          >
            <Edit2 size={15} />
            <span>Edit Employee</span>
          </button>
        </div>
      </div>
    </div>
  )
}
