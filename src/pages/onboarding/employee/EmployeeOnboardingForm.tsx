import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Landmark,
  MapPin,
  Pencil,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import {
  ALL_SKILLS,
  BANKS,
  DEPARTMENTS,
  DESIGNATIONS,
  GEO_FENCING_ZONES,
  ORG_UNITS,
  PROJECTS,
  REPORTING_MANAGERS,
  VENDORS,
  createEmptyEmployee,
  type EducationRecord,
  type Employee,
  type ExperienceRecord,
  type TrainingRecord,
} from '@/data/employees'
import {
  getEmployee,
  nextEmployeeCode,
  nextTpCode,
  saveEmployee,
} from '@/data/employeeStore'

const STEPS = [
  { id: 1, title: 'Basic & Personal\nInformation' },
  { id: 2, title: 'Address & Contact\nDetails' },
  { id: 3, title: 'Employment &\nOrganization' },
  { id: 4, title: 'Education, Experience\n& Training' },
  { id: 5, title: 'Bank & Salary\nPayout' },
]

export default function EmployeeOnboardingForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const [currentStep, setCurrentStep] = useState(1)
  const [showMaskedAccount, setShowMaskedAccount] = useState(true)

  // Modals for Step 4
  const [eduModalOpen, setEduModalOpen] = useState(false)
  const [editingEdu, setEditingEdu] = useState<EducationRecord | null>(null)

  const [expModalOpen, setExpModalOpen] = useState(false)
  const [editingExp, setEditingExp] = useState<ExperienceRecord | null>(null)

  const [trainModalOpen, setTrainModalOpen] = useState(false)
  const [editingTrain, setEditingTrain] = useState<TrainingRecord | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize employee state
  const [employee, setEmployee] = useState<Employee>(() => {
    if (!isNew && id) {
      const found = getEmployee(id)
      if (found) return JSON.parse(JSON.stringify(found))
    }
    const empty = createEmptyEmployee()
    empty.employeeCode = nextEmployeeCode()
    empty.tpCode = nextTpCode()
    return empty
  })

  // Watch for ID changes
  useEffect(() => {
    if (!isNew && id) {
      const found = getEmployee(id)
      if (found) {
        setEmployee(JSON.parse(JSON.stringify(found)))
      }
    }
  }, [id, isNew])

  // Field updater
  const updateField = <K extends keyof Employee>(key: K, value: Employee[K]) => {
    setEmployee((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'sameAsPermanent' && value === true) {
        next.permanentAddress = next.residentialAddress
      }
      if (key === 'residentialAddress' && prev.sameAsPermanent) {
        next.permanentAddress = value as string
      }
      return next
    })
  }

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast('Photo size must be less than 2 MB', 'info')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      updateField('photoUrl', reader.result as string)
      toast('Employee photograph uploaded successfully!')
    }
    reader.readAsDataURL(file)
  }

  // Save as Draft
  const handleSaveDraft = () => {
    const saved = saveEmployee({
      ...employee,
      status: 'Pending',
    })
    toast(`Draft saved for ${saved.fullName || 'employee'} (${saved.employeeCode})`)
  }

  // Validate current step
  const handleValidate = () => {
    if (!employee.fullName.trim()) {
      toast('Employee Full Name is required', 'info')
      setCurrentStep(1)
      return false
    }
    if (!employee.mobile.trim()) {
      toast('Employee Mobile Number is required', 'info')
      setCurrentStep(1)
      return false
    }
    toast('All required fields are validated successfully!', 'info')
    return true
  }

  // Submit for Approval
  const handleSubmit = () => {
    if (!handleValidate()) return
    const saved = saveEmployee({
      ...employee,
      status: 'Active',
    })
    toast(`Employee ${saved.fullName} (${saved.employeeCode}) submitted for approval!`)
    navigate('/onboarding/users')
  }

  // Add / Edit Education Handlers
  const handleSaveEdu = (edu: EducationRecord) => {
    if (editingEdu) {
      updateField(
        'education',
        employee.education.map((item) => (item.id === edu.id ? edu : item)),
      )
    } else {
      updateField('education', [...employee.education, { ...edu, id: `EDU-${Date.now()}` }])
    }
    setEduModalOpen(false)
    setEditingEdu(null)
  }

  const handleDeleteEdu = (eduId: string) => {
    updateField(
      'education',
      employee.education.filter((item) => item.id !== eduId),
    )
  }

  // Add / Edit Experience Handlers
  const handleSaveExp = (exp: ExperienceRecord) => {
    if (editingExp) {
      updateField(
        'workExperience',
        employee.workExperience.map((item) => (item.id === exp.id ? exp : item)),
      )
    } else {
      updateField('workExperience', [...employee.workExperience, { ...exp, id: `EXP-${Date.now()}` }])
    }
    setExpModalOpen(false)
    setEditingExp(null)
  }

  const handleDeleteExp = (expId: string) => {
    updateField(
      'workExperience',
      employee.workExperience.filter((item) => item.id !== expId),
    )
  }

  // Add / Edit Training Handlers
  const handleSaveTrain = (trn: TrainingRecord) => {
    if (editingTrain) {
      updateField(
        'training',
        employee.training.map((item) => (item.id === trn.id ? trn : item)),
      )
    } else {
      updateField('training', [...employee.training, { ...trn, id: `TRN-${Date.now()}` }])
    }
    setTrainModalOpen(false)
    setEditingTrain(null)
  }

  const handleDeleteTrain = (trnId: string) => {
    updateField(
      'training',
      employee.training.filter((item) => item.id !== trnId),
    )
  }

  return (
    <div className="mx-auto max-w-[1320px] pb-16">
      {/* Top Header Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          {/* Breadcrumb matching screenshot */}
          {/* <nav className="mb-1 flex items-center gap-2 text-[12px] text-[#64748B]">
            <Link to="/onboarding" className="hover:text-[#0066FF]">
              Employees
            </Link>
            <span>&gt;</span>
            <Link to="/onboarding/users" className="hover:text-[#0066FF]">
              Employee Onboarding
            </Link>
            {!isNew && (
              <>
                <span>&gt;</span>
                <span className="font-medium text-[#1E293B]">{employee.fullName}</span>
              </>
            )}
          </nav> */}
          <h1 className="text-[24px] font-bold tracking-tight text-[#1E293B]">
            Employee Onboarding
          </h1>
          <p className="mt-0.5 text-[12.5px] text-[#64748B]">
            {isNew
              ? 'Add new employee to Dexter ERP. Please fill all the required details and submit for approval.'
              : `Review and manage complete onboarding records for ${employee.fullName} (${employee.employeeCode}).`}
          </p>
        </div>

        {/* Top Action Buttons matching screenshot */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
            className="border-[#CBD5E1] bg-white text-[#334155] shadow-xs hover:bg-[#F8FAFC]"
          >
            <Save size={14} className="mr-1.5" /> Save Draft
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleValidate}
            className="border-emerald-200 bg-white text-emerald-700 shadow-xs hover:bg-emerald-50"
          >
            <CheckCircle2 size={14} className="mr-1.5" /> Validate
          </Button>

          {currentStep > 1 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              className="border-[#CBD5E1] bg-white text-[#334155] shadow-xs hover:bg-[#F8FAFC]"
            >
              <ArrowLeft size={14} className="mr-1.5" /> Previous
            </Button>
          )}

          {currentStep < 5 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setCurrentStep((s) => Math.min(5, s + 1))}
              className="bg-[#0066FF] text-white shadow-xs hover:bg-[#0052cc]"
            >
              Next <ArrowRight size={14} className="ml-1.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              className="bg-[#0066FF] text-white shadow-xs hover:bg-[#0052cc]"
            >
              <Send size={14} className="mr-1.5" /> Submit for Approval
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigate('/onboarding/users')}
            className="border-[#CBD5E1] bg-white text-[#475569] shadow-xs hover:bg-[#F8FAFC]"
          >
            <X size={14} className="mr-1.5" /> Cancel
          </Button>
        </div>
      </div>

      {/* Stepper Navigation matching screenshot */}
      <div className="mb-6 rounded-xl border border-[#DCE8F6] bg-white px-6 py-4 shadow-xs">
        <div className="relative flex items-center justify-between">
          {/* Connector Line behind steps */}
          <div className="absolute top-[18px] left-[5%] right-[5%] -z-0 h-[2px] bg-[#E2E8F0]" />

          {STEPS.map((step) => {
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className="group relative z-10 flex flex-1 flex-col items-center text-center focus:outline-none"
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-full text-[13px] font-semibold transition-all duration-200',
                    isActive
                      ? 'border-2 border-[#0066FF] bg-[#0066FF] text-white shadow-[0_0_0_4px_rgba(0,102,255,0.18)]'
                      : isCompleted
                        ? 'border-2 border-[#0066FF] bg-[#0066FF] text-white'
                        : 'border-2 border-[#CBD5E1] bg-white text-[#64748B] group-hover:border-[#94A3B8]',
                  )}
                >
                  {isCompleted ? <Check size={16} strokeWidth={2.5} /> : step.id}
                </div>

                {/* Step Label */}
                <span
                  className={cn(
                    'mt-2 whitespace-pre-line text-[11.5px] leading-tight font-medium transition-colors',
                    isActive
                      ? 'font-bold text-[#0066FF]'
                      : isCompleted
                        ? 'text-[#1E293B]'
                        : 'text-[#64748B] group-hover:text-[#1E293B]',
                  )}
                >
                  {step.title}
                </span>

                {/* Active Indicator Underline */}
                {isActive && (
                  <div className="mt-2.5 h-[3px] w-24 rounded-full bg-[#0066FF]" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* STEP 1: Basic & Personal Information */}
      {currentStep === 1 && (
        <div className="space-y-5">
          {/* Card 1: 1. Basic Information */}
          <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
            <div className="flex items-center gap-2 border-b border-[#E2EEFB] bg-[#F0F7FD] px-5 py-3 text-[#0066FF]">
              <User size={17} className="text-[#0066FF]" />
              <h2 className="text-[13.5px] font-bold text-[#0066FF]">1. Basic Information</h2>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                {/* Left 3 Columns: Basic Fields */}
                <div className="space-y-4 lg:col-span-3">
                  {/* Row 1: Onboard As, Employee Code, TP Code */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                        Onboard Employee As <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-4 pt-1.5">
                        <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-[#334155]">
                          <input
                            type="radio"
                            name="onboardAs"
                            checked={employee.onboardAs === 'Permanent'}
                            onChange={() => {
                              updateField('onboardAs', 'Permanent')
                              updateField('jobType', 'Permanent')
                            }}
                            className="h-4 w-4 accent-[#0066FF]"
                          />
                          Permanent
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-[#334155]">
                          <input
                            type="radio"
                            name="onboardAs"
                            checked={employee.onboardAs === 'Contractual'}
                            onChange={() => {
                              updateField('onboardAs', 'Contractual')
                              updateField('jobType', 'Contractual')
                            }}
                            className="h-4 w-4 accent-[#0066FF]"
                          />
                          Contractual
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                        Employee Code
                      </label>
                      <input
                        type="text"
                        value={employee.employeeCode}
                        readOnly
                        className="h-9 w-full rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[12.5px] font-medium text-[#475569] outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                        TP Code
                      </label>
                      <input
                        type="text"
                        value={employee.tpCode}
                        onChange={(e) => updateField('tpCode', e.target.value)}
                        className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
                      />
                    </div>
                  </div>

                  {/* Row 2: Full Name, Mobile, Email */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                        Employee Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={employee.fullName}
                        onChange={(e) => updateField('fullName', e.target.value)}
                        placeholder="Enter full name"
                        className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                        Employee Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={employee.mobile}
                        onChange={(e) => updateField('mobile', e.target.value)}
                        placeholder="7895945800"
                        className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={employee.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="employee@example.com"
                        className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
                      />
                    </div>
                  </div>

                  {/* Row 3: Send Notification, Date of Joining, Employee Status */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                        Send Notification to Employee ? <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-4 pt-1.5">
                        <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-[#334155]">
                          <input
                            type="radio"
                            name="sendNotification"
                            checked={employee.sendNotification}
                            onChange={() => updateField('sendNotification', true)}
                            className="h-4 w-4 accent-[#0066FF]"
                          />
                          Yes
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-[#334155]">
                          <input
                            type="radio"
                            name="sendNotification"
                            checked={!employee.sendNotification}
                            onChange={() => updateField('sendNotification', false)}
                            className="h-4 w-4 accent-[#0066FF]"
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                        Date of Joining <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={employee.dateOfJoining}
                        onChange={(e) => updateField('dateOfJoining', e.target.value)}
                        className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                        Employee Status
                      </label>
                      <select
                        value={employee.status}
                        onChange={(e) => updateField('status', e.target.value as any)}
                        className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Active">Active</option>
                        <option value="Probation">Probation</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right 1 Column: Employee Photograph matching screenshot */}
                <div className="flex flex-col items-center justify-start rounded-lg border border-[#E2EEFB] bg-[#F8FAFD] p-3 text-center">
                  <span className="mb-2 text-[11.5px] font-semibold text-[#334155]">
                    Employee Photograph
                  </span>
                  <div className="relative mb-3 h-[110px] w-[110px] overflow-hidden rounded-lg border-2 border-dashed border-[#CBD5E1] bg-white shadow-xs">
                    {employee.photoUrl ? (
                      <img
                        src={employee.photoUrl}
                        alt="Employee"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[#94A3B8]">
                        <User size={40} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-[#0066FF] text-[#0066FF] hover:bg-[#EAF2FD]"
                  >
                    <Upload size={13} className="mr-1" /> Upload Photo
                  </Button>
                  <span className="mt-1.5 text-[10px] text-[#64748B]">JPG, PNG (Max 2 MB)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: 2. Personal Information matching screenshot */}
          <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
            <div className="flex items-center gap-2 border-b border-[#E2EEFB] bg-[#F0F7FD] px-5 py-3 text-[#0066FF]">
              <User size={17} className="text-[#0066FF]" />
              <h2 className="text-[13.5px] font-bold text-[#0066FF]">2. Personal Information</h2>
            </div>

            <div className="space-y-4 p-5">
              {/* Row 1: DOB, Gender, Father/Husband, Mother, Spouse */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={employee.dob}
                    onChange={(e) => updateField('dob', e.target.value)}
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Gender
                  </label>
                  <select
                    value={employee.gender}
                    onChange={(e) => updateField('gender', e.target.value)}
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Father / Husband's Name
                  </label>
                  <input
                    type="text"
                    value={employee.fatherHusbandName}
                    onChange={(e) => updateField('fatherHusbandName', e.target.value)}
                    placeholder="Enter father / husband name"
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Mother's Name
                  </label>
                  <input
                    type="text"
                    value={employee.motherName}
                    onChange={(e) => updateField('motherName', e.target.value)}
                    placeholder="Enter mother's name"
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Spouse Name
                  </label>
                  <input
                    type="text"
                    value={employee.spouseName}
                    onChange={(e) => updateField('spouseName', e.target.value)}
                    placeholder="Enter spouse name"
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                  />
                </div>
              </div>

              {/* Row 2: Marital Status, Nationality, Blood Group, Relation Name, PAN */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Marital Status
                  </label>
                  <select
                    value={employee.maritalStatus}
                    onChange={(e) => updateField('maritalStatus', e.target.value)}
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                  >
                    <option value="Unmarried">Unmarried</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Nationality
                  </label>
                  <select
                    value={employee.nationality}
                    onChange={(e) => updateField('nationality', e.target.value)}
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                  >
                    <option value="Indian">Indian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Blood Group
                  </label>
                  <select
                    value={employee.bloodGroup}
                    onChange={(e) => updateField('bloodGroup', e.target.value)}
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                  >
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Relation Name
                  </label>
                  <input
                    type="text"
                    value={employee.relationName}
                    onChange={(e) => updateField('relationName', e.target.value)}
                    placeholder="Father"
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    PAN No.
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={employee.panNo}
                    onChange={(e) => updateField('panNo', e.target.value.toUpperCase())}
                    placeholder="Enter PAN number"
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] uppercase outline-none focus:border-[#0066FF]"
                  />
                </div>
              </div>

              {/* Row 3: Personal Email, Personal Mobile, Emergency Person, Emergency Contact */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Personal Email ID
                  </label>
                  <input
                    type="email"
                    value={employee.personalEmail}
                    onChange={(e) => updateField('personalEmail', e.target.value)}
                    placeholder="personal@gmail.com"
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Personal Mobile Number
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={employee.personalMobile}
                    onChange={(e) => updateField('personalMobile', e.target.value)}
                    placeholder="Enter personal mobile number"
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Emergency Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={employee.emergencyContactPerson}
                    onChange={(e) => updateField('emergencyContactPerson', e.target.value)}
                    placeholder="Enter emergency contact person name"
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Emergency Contact No.
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={employee.emergencyContactNo}
                    onChange={(e) => updateField('emergencyContactNo', e.target.value)}
                    placeholder="7451008232"
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Address & Contact Details matching screenshot */}
      {currentStep === 2 && (
        <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#E2EEFB] bg-[#F0F7FD] px-5 py-3 text-[#0066FF]">
            <MapPin size={17} className="text-[#0066FF]" />
            <h2 className="text-[13.5px] font-bold text-[#0066FF]">3. Address Details</h2>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              {/* Left 3 Columns: Address Form */}
              <div className="space-y-4 lg:col-span-3">
                {/* Residential / Communication Address */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Residential / Communication Address
                  </label>
                  <textarea
                    rows={2}
                    value={employee.residentialAddress}
                    onChange={(e) => updateField('residentialAddress', e.target.value)}
                    placeholder="Enter residential / communication address"
                    className="w-full rounded-md border border-[#CBD5E1] bg-white p-2.5 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
                  />
                </div>

                {/* Checkbox: Communication address same as permanent */}
                <div>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-[#0066FF]">
                    <input
                      type="checkbox"
                      checked={employee.sameAsPermanent}
                      onChange={(e) => updateField('sameAsPermanent', e.target.checked)}
                      className="h-4 w-4 rounded-sm border-gray-300 accent-[#0066FF]"
                    />
                    Communication address same as permanent address
                  </label>
                </div>

                {/* Permanent Address */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                    Permanent Address
                  </label>
                  <textarea
                    rows={2}
                    value={employee.permanentAddress}
                    onChange={(e) => updateField('permanentAddress', e.target.value)}
                    disabled={employee.sameAsPermanent}
                    placeholder="Enter permanent address"
                    className={cn(
                      'w-full rounded-md border p-2.5 text-[12.5px] outline-none',
                      employee.sameAsPermanent
                        ? 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]'
                        : 'border-[#CBD5E1] bg-white text-[#1E293B] focus:border-[#0066FF]',
                    )}
                  />
                </div>

                {/* Sub-fields Row 1: P.O., Tehsil, Police Station */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                      P.O.
                    </label>
                    <input
                      type="text"
                      value={employee.po}
                      onChange={(e) => updateField('po', e.target.value)}
                      placeholder="Jagatpur"
                      className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                      Tehsil
                    </label>
                    <input
                      type="text"
                      value={employee.tehsil}
                      onChange={(e) => updateField('tehsil', e.target.value)}
                      placeholder="Dikhatmai"
                      className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                      Police Station
                    </label>
                    <input
                      type="text"
                      value={employee.policeStation}
                      onChange={(e) => updateField('policeStation', e.target.value)}
                      placeholder="Mainpuri"
                      className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                    />
                  </div>
                </div>

                {/* Sub-fields Row 2: District, State, PIN Code */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                      District
                    </label>
                    <input
                      type="text"
                      value={employee.district}
                      onChange={(e) => updateField('district', e.target.value)}
                      placeholder="Mainpuri"
                      className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                      State
                    </label>
                    <select
                      value={employee.state}
                      onChange={(e) => updateField('state', e.target.value)}
                      className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                    >
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Madhya Pradesh">Madhya Pradesh</option>
                      <option value="Bihar">Bihar</option>
                      <option value="Rajasthan">Rajasthan</option>
                      <option value="Haryana">Haryana</option>
                      <option value="Gujarat">Gujarat</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                      PIN Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={employee.pinCode}
                      onChange={(e) => updateField('pinCode', e.target.value)}
                      placeholder="205267"
                      className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Other Contact Details */}
              <div className="rounded-lg border border-[#E2EEFB] bg-[#F8FAFD] p-4">
                <h3 className="mb-3 text-[12px] font-bold text-[#0066FF]">
                  Other Contact Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                      Residence Contact No.
                    </label>
                    <input
                      type="text"
                      value={employee.residenceContactNo}
                      onChange={(e) => updateField('residenceContactNo', e.target.value)}
                      placeholder="Enter residence number"
                      className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                      Email ID (Official)
                    </label>
                    <input
                      type="email"
                      value={employee.officialEmail}
                      onChange={(e) => updateField('officialEmail', e.target.value)}
                      placeholder="wlasupport@dexterindia.com"
                      className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Employment & Organization matching screenshot */}
      {currentStep === 3 && (
        <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#E2EEFB] bg-[#F0F7FD] px-5 py-3 text-[#0066FF]">
            <Briefcase size={17} className="text-[#0066FF]" />
            <h2 className="text-[13.5px] font-bold text-[#0066FF]">
              3. Employment & Organization Details
            </h2>
          </div>

          <div className="space-y-4 p-5">
            {/* Row 1: Designation, Department, Functional Role, Org Unit, Project */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Designation <span className="text-red-500">*</span>
                </label>
                <select
                  value={employee.designation}
                  onChange={(e) => updateField('designation', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  {DESIGNATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={employee.department}
                  onChange={(e) => updateField('department', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Functional Role
                </label>
                <select
                  value={employee.functionalRole}
                  onChange={(e) => updateField('functionalRole', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  <option value="L1 Support">L1 Support</option>
                  <option value="L2 Support">L2 Support</option>
                  <option value="Field Support">Field Support</option>
                  <option value="Field Operations">Field Operations</option>
                  <option value="Branch Head">Branch Head</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Organization Unit Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={employee.orgUnitName}
                  onChange={(e) => updateField('orgUnitName', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  {ORG_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Project
                </label>
                <select
                  value={employee.project}
                  onChange={(e) => updateField('project', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  {PROJECTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Reporting Manager, Job Type, Vendor Name, Contract End Date, Salary Booked Project */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Reporting Manager
                </label>
                <select
                  value={employee.reportingManager}
                  onChange={(e) => updateField('reportingManager', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  {REPORTING_MANAGERS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Job Type <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4 pt-1.5">
                  <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-[#334155]">
                    <input
                      type="radio"
                      name="jobType"
                      checked={employee.jobType === 'Permanent'}
                      onChange={() => updateField('jobType', 'Permanent')}
                      className="h-4 w-4 accent-[#0066FF]"
                    />
                    Permanent
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-[#334155]">
                    <input
                      type="radio"
                      name="jobType"
                      checked={employee.jobType === 'Contractual'}
                      onChange={() => updateField('jobType', 'Contractual')}
                      className="h-4 w-4 accent-[#0066FF]"
                    />
                    Contractual
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Vendor Name
                </label>
                <select
                  value={employee.vendorName}
                  onChange={(e) => updateField('vendorName', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  {VENDORS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Contract End Date
                </label>
                <input
                  type="date"
                  value={employee.contractEndDate}
                  onChange={(e) => updateField('contractEndDate', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Salary Booked Under Project Name
                </label>
                <select
                  value={employee.salaryBookedUnderProject}
                  onChange={(e) => updateField('salaryBookedUnderProject', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  {PROJECTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Employee Code (ORG), TP Code, Date of Joining, Current Experience, Geo Fencing */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Employee Code (ORG) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={employee.employeeCode}
                  readOnly
                  className="h-9 w-full rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[12.5px] font-medium text-[#475569] outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  TP Code
                </label>
                <input
                  type="text"
                  value={employee.tpCode}
                  onChange={(e) => updateField('tpCode', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Date of Joining <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={employee.dateOfJoining}
                  onChange={(e) => updateField('dateOfJoining', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Current Organization Experience
                </label>
                <input
                  type="text"
                  value={employee.currentOrgExperience}
                  onChange={(e) => updateField('currentOrgExperience', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Geo Fencing Name
                </label>
                <select
                  value={employee.geoFencingName}
                  onChange={(e) => updateField('geoFencingName', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  {GEO_FENCING_ZONES.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4: Live Tracking, Skills */}
            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-2 block text-[11px] font-semibold text-[#1E293B]">
                  Live Tracking
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateField('liveTracking', !employee.liveTracking)}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                      employee.liveTracking ? 'bg-[#0066FF]' : 'bg-slate-300',
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                        employee.liveTracking ? 'translate-x-5' : 'translate-x-0',
                      )}
                    />
                  </button>
                  <span className="text-[12.5px] font-medium text-[#1E293B]">
                    {employee.liveTracking ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Skills
                </label>
                <div className="flex flex-wrap gap-1.5 rounded-md border border-[#CBD5E1] bg-white p-1.5 min-h-9">
                  {employee.skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded bg-[#EAF2FD] px-2 py-0.5 text-[11px] font-medium text-[#0066FF]"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() =>
                          updateField(
                            'skills',
                            employee.skills.filter((x) => x !== s),
                          )
                        }
                        className="text-[#0066FF] hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !employee.skills.includes(e.target.value)) {
                        updateField('skills', [...employee.skills, e.target.value])
                      }
                    }}
                    className="h-6 flex-1 min-w-[120px] bg-transparent text-[11.5px] text-[#64748B] outline-none"
                  >
                    <option value="">+ Add Skill...</option>
                    {ALL_SKILLS.filter((s) => !employee.skills.includes(s)).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Education, Experience & Training matching screenshot */}
      {currentStep === 4 && (
        <div className="space-y-6">
          {/* Card 1: 4. Education / Academic Details */}
          <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2EEFB] bg-[#F0F7FD] px-5 py-3">
              <div className="flex items-center gap-2 text-[#0066FF]">
                <GraduationCap size={18} className="text-[#0066FF]" />
                <h2 className="text-[13.5px] font-bold text-[#0066FF]">
                  4. Education / Academic Details
                </h2>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditingEdu(null)
                  setEduModalOpen(true)
                }}
                className="h-7 bg-[#0066FF] px-2.5 text-[11.5px] text-white hover:bg-[#0052cc]"
              >
                <Plus size={13} className="mr-1" /> Add Education
              </Button>
            </div>

            <div className="overflow-x-auto p-4">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#E2EEFB] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    <th className="py-2.5 px-3">S.No.</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Specialization</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3">University / College</th>
                    <th className="py-2.5 px-3">Course Type</th>
                    <th className="py-2.5 px-3">Passing Year</th>
                    <th className="py-2.5 px-3">Percentage / CGPA</th>
                    <th className="py-2.5 px-3">Attachment</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {employee.education.length > 0 ? (
                    employee.education.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-[#F8FAFD]">
                        <td className="py-2.5 px-3 font-medium text-[#475569]">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#1E293B]">{item.course}</td>
                        <td className="py-2.5 px-3 text-[#334155]">{item.specialization}</td>
                        <td className="py-2.5 px-3 text-[#334155]">{item.state}</td>
                        <td className="py-2.5 px-3 text-[#334155]">{item.university}</td>
                        <td className="py-2.5 px-3 text-[#334155]">{item.courseType}</td>
                        <td className="py-2.5 px-3 text-[#334155]">{item.passingYear}</td>
                        <td className="py-2.5 px-3 font-medium text-[#1E293B]">{item.percentage}</td>
                        <td className="py-2.5 px-3">
                          {item.attachment ? (
                            <span className="inline-flex items-center gap-1 rounded bg-[#EAF2FD] px-2 py-0.5 text-[11px] font-medium text-[#0066FF]">
                              <FileText size={12} /> {item.attachment}
                            </span>
                          ) : (
                            <span className="text-[#94A3B8]">None</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEdu(item)
                                setEduModalOpen(true)
                              }}
                              className="p-1 text-[#0066FF] hover:bg-[#EAF2FD] rounded"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEdu(item.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-[#94A3B8]">
                        No education records added yet. Click "+ Add Education" to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Work Experience (Descending Order) */}
          <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2EEFB] bg-[#F0F7FD] px-5 py-3">
              <div className="flex items-center gap-2 text-[#0066FF]">
                <Briefcase size={18} className="text-[#0066FF]" />
                <h2 className="text-[13.5px] font-bold text-[#0066FF]">
                  Work Experience (Descending Order)
                </h2>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditingExp(null)
                  setExpModalOpen(true)
                }}
                className="h-7 bg-[#0066FF] px-2.5 text-[11.5px] text-white hover:bg-[#0052cc]"
              >
                <Plus size={13} className="mr-1" /> Add Experience
              </Button>
            </div>

            <div className="overflow-x-auto p-4">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#E2EEFB] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    <th className="py-2.5 px-3">S.No.</th>
                    <th className="py-2.5 px-3">Company Name</th>
                    <th className="py-2.5 px-3">Job Title</th>
                    <th className="py-2.5 px-3">From Date</th>
                    <th className="py-2.5 px-3">To Date</th>
                    <th className="py-2.5 px-3">Job Description</th>
                    <th className="py-2.5 px-3">Attachment</th>
                    <th className="py-2.5 px-3">Skills</th>
                    <th className="py-2.5 px-3">Total Experience</th>
                    <th className="py-2.5 px-3">Last Take-home</th>
                    <th className="py-2.5 px-3">Leaving Reason</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {employee.workExperience.length > 0 ? (
                    employee.workExperience.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-[#F8FAFD]">
                        <td className="py-2.5 px-3 font-medium text-[#475569]">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#1E293B]">{item.companyName}</td>
                        <td className="py-2.5 px-3 text-[#334155]">{item.jobTitle}</td>
                        <td className="py-2.5 px-3 text-[#334155]">{item.fromDate}</td>
                        <td className="py-2.5 px-3 text-[#334155]">{item.toDate}</td>
                        <td className="py-2.5 px-3 text-[#64748B] max-w-[180px] truncate">
                          {item.jobDescription}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.attachment ? (
                            <span className="inline-flex items-center gap-1 rounded bg-[#EAF2FD] px-2 py-0.5 text-[11px] font-medium text-[#0066FF]">
                              <FileText size={12} /> {item.attachment}
                            </span>
                          ) : (
                            <span className="text-[#94A3B8]">None</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[#334155]">{item.skills}</td>
                        <td className="py-2.5 px-3 font-medium text-[#1E293B]">{item.totalExperience}</td>
                        <td className="py-2.5 px-3 font-medium text-[#1E293B]">{item.lastTakeHome}</td>
                        <td className="py-2.5 px-3 text-[#64748B]">{item.leavingReason}</td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExp(item)
                                setExpModalOpen(true)
                              }}
                              className="p-1 text-[#0066FF] hover:bg-[#EAF2FD] rounded"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExp(item.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="py-6 text-center text-[#94A3B8]">
                        No experience records added yet. Click "+ Add Experience" to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3: Training Details */}
          <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2EEFB] bg-[#F0F7FD] px-5 py-3">
              <div className="flex items-center gap-2 text-[#0066FF]">
                <Award size={18} className="text-[#0066FF]" />
                <h2 className="text-[13.5px] font-bold text-[#0066FF]">Training Details</h2>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditingTrain(null)
                  setTrainModalOpen(true)
                }}
                className="h-7 bg-[#0066FF] px-2.5 text-[11.5px] text-white hover:bg-[#0052cc]"
              >
                <Plus size={13} className="mr-1" /> Add Training
              </Button>
            </div>

            <div className="overflow-x-auto p-4">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#E2EEFB] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    <th className="py-2.5 px-3">S.No.</th>
                    <th className="py-2.5 px-3">Training</th>
                    <th className="py-2.5 px-3">Date of Completion</th>
                    <th className="py-2.5 px-3">Certification</th>
                    <th className="py-2.5 px-3">Institute</th>
                    <th className="py-2.5 px-3">Grade / Marks</th>
                    <th className="py-2.5 px-3">Attachment</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {employee.training.length > 0 ? (
                    employee.training.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-[#F8FAFD]">
                        <td className="py-2.5 px-3 font-medium text-[#475569]">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#1E293B]">{item.training}</td>
                        <td className="py-2.5 px-3 text-[#334155]">{item.dateOfCompletion}</td>
                        <td className="py-2.5 px-3 text-[#334155]">{item.certification}</td>
                        <td className="py-2.5 px-3 text-[#334155]">{item.institute}</td>
                        <td className="py-2.5 px-3 font-medium text-[#1E293B]">{item.grade}</td>
                        <td className="py-2.5 px-3">
                          {item.attachment ? (
                            <span className="inline-flex items-center gap-1 rounded bg-[#EAF2FD] px-2 py-0.5 text-[11px] font-medium text-[#0066FF]">
                              <FileText size={12} /> {item.attachment}
                            </span>
                          ) : (
                            <span className="text-[#94A3B8]">None</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTrain(item)
                                setTrainModalOpen(true)
                              }}
                              className="p-1 text-[#0066FF] hover:bg-[#EAF2FD] rounded"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTrain(item.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-[#94A3B8]">
                        No training records added yet. Click "+ Add Training" to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Bank & Salary Payout matching screenshot */}
      {currentStep === 5 && (
        <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#E2EEFB] bg-[#F0F7FD] px-5 py-3 text-[#0066FF]">
            <Landmark size={17} className="text-[#0066FF]" />
            <h2 className="text-[13.5px] font-bold text-[#0066FF]">
              5. Bank & Salary Payout Details
            </h2>
          </div>

          <div className="space-y-4 p-5">
            {/* Row 1: Name as per Bank, Bank Name, Bank Branch, IFSC Code, Account Number, Account Status */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Name as per Bank <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={employee.nameAsPerBank}
                  onChange={(e) => updateField('nameAsPerBank', e.target.value)}
                  placeholder="Harsh Pratap Singh"
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={employee.bankName}
                  onChange={(e) => updateField('bankName', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  {BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Bank Branch <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={employee.bankBranch}
                  onChange={(e) => updateField('bankBranch', e.target.value)}
                  placeholder="Mainpuri"
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  IFSC Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={employee.ifscCode}
                  onChange={(e) => updateField('ifscCode', e.target.value.toUpperCase())}
                  placeholder="SBIN0001234"
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] uppercase outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showMaskedAccount ? 'password' : 'text'}
                    value={employee.accountNumber}
                    onChange={(e) => updateField('accountNumber', e.target.value)}
                    placeholder="************5678"
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 pr-8 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMaskedAccount(!showMaskedAccount)}
                    className="absolute right-2 top-2.5 text-[#64748B] hover:text-[#0066FF]"
                  >
                    {showMaskedAccount ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Account Status
                </label>
                <select
                  value={employee.accountStatus}
                  onChange={(e) => updateField('accountStatus', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                  <option value="Salary">Salary</option>
                </select>
              </div>
            </div>

            {/* Row 2: Cheque Facility, Salary Payout Mode */}
            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-6">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Cheque Facility
                </label>
                <div className="flex items-center gap-4 pt-1.5">
                  <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-[#334155]">
                    <input
                      type="radio"
                      name="chequeFacility"
                      checked={employee.chequeFacility === 'Available'}
                      onChange={() => updateField('chequeFacility', 'Available')}
                      className="h-4 w-4 accent-[#0066FF]"
                    />
                    Available
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-[#334155]">
                    <input
                      type="radio"
                      name="chequeFacility"
                      checked={employee.chequeFacility === 'Not Available'}
                      onChange={() => updateField('chequeFacility', 'Not Available')}
                      className="h-4 w-4 accent-[#0066FF]"
                    />
                    Not Available
                  </label>
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Salary Payout Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={employee.salaryPayoutMode}
                  onChange={(e) => updateField('salaryPayoutMode', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Direct Payroll UPI">Direct Payroll UPI</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Footer Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-[#E2EEFB] bg-white/80 p-4 backdrop-blur-xs rounded-xl shadow-xs">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => navigate('/onboarding/users')}
          className="border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]"
        >
          <X size={15} className="mr-1.5" /> Back to Employee List
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleSaveDraft}
            className="border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Save size={15} className="mr-1.5" /> Save Draft
          </Button>

          {currentStep > 1 && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              className="border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC]"
            >
              <ArrowLeft size={15} className="mr-1.5" /> Previous
            </Button>
          )}

          {currentStep < 5 ? (
            <Button
              type="button"
              size="md"
              onClick={() => setCurrentStep((s) => Math.min(5, s + 1))}
              className="bg-[#0066FF] px-6 text-white hover:bg-[#0052cc]"
            >
              Next <ArrowRight size={15} className="ml-1.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="md"
              onClick={handleSubmit}
              className="bg-[#0066FF] px-6 text-white hover:bg-[#0052cc]"
            >
              <Send size={15} className="mr-1.5" /> Submit for Approval
            </Button>
          )}
        </div>
      </div>

      {/* MODAL: Add / Edit Education */}
      {eduModalOpen && (
        <EducationDialog
          initial={editingEdu}
          onClose={() => {
            setEduModalOpen(false)
            setEditingEdu(null)
          }}
          onSave={handleSaveEdu}
        />
      )}

      {/* MODAL: Add / Edit Experience */}
      {expModalOpen && (
        <ExperienceDialog
          initial={editingExp}
          onClose={() => {
            setExpModalOpen(false)
            setEditingExp(null)
          }}
          onSave={handleSaveExp}
        />
      )}

      {/* MODAL: Add / Edit Training */}
      {trainModalOpen && (
        <TrainingDialog
          initial={editingTrain}
          onClose={() => {
            setTrainModalOpen(false)
            setEditingTrain(null)
          }}
          onSave={handleSaveTrain}
        />
      )}
    </div>
  )
}

/** Education Modal Dialog */
function EducationDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: EducationRecord | null
  onClose: () => void
  onSave: (record: EducationRecord) => void
}) {
  const [record, setRecord] = useState<EducationRecord>(() => ({
    id: initial?.id || '',
    course: initial?.course || 'B.Tech',
    specialization: initial?.specialization || 'Computer Science',
    state: initial?.state || 'Uttar Pradesh',
    university: initial?.university || 'AKTU',
    courseType: initial?.courseType || 'Full Time',
    passingYear: initial?.passingYear || '2022',
    percentage: initial?.percentage || '78.50',
    attachment: initial?.attachment || 'Degree.pdf',
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-[#DCE8F6] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-[#E2EEFB] pb-3">
          <h3 className="text-[15px] font-bold text-[#1E293B]">
            {initial ? 'Edit Education Record' : 'Add Education Record'}
          </h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1E293B]">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-[12px]">
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Course</label>
            <input
              type="text"
              value={record.course}
              onChange={(e) => setRecord({ ...record, course: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Specialization</label>
            <input
              type="text"
              value={record.specialization}
              onChange={(e) => setRecord({ ...record, specialization: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">State</label>
            <input
              type="text"
              value={record.state}
              onChange={(e) => setRecord({ ...record, state: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">University / College</label>
            <input
              type="text"
              value={record.university}
              onChange={(e) => setRecord({ ...record, university: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Course Type</label>
            <select
              value={record.courseType}
              onChange={(e) => setRecord({ ...record, courseType: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            >
              <option value="Full Time">Full Time</option>
              <option value="Part Time">Part Time</option>
              <option value="Distance">Distance</option>
              <option value="Diploma">Diploma</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Passing Year</label>
            <input
              type="text"
              value={record.passingYear}
              onChange={(e) => setRecord({ ...record, passingYear: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Percentage / CGPA</label>
            <input
              type="text"
              value={record.percentage}
              onChange={(e) => setRecord({ ...record, percentage: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Attachment Name</label>
            <input
              type="text"
              value={record.attachment}
              onChange={(e) => setRecord({ ...record, attachment: e.target.value })}
              placeholder="e.g. Degree.pdf"
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-[#E2EEFB] pt-4">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(record)} className="bg-[#0066FF] text-white">
            Save Record
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Experience Modal Dialog */
function ExperienceDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: ExperienceRecord | null
  onClose: () => void
  onSave: (record: ExperienceRecord) => void
}) {
  const [record, setRecord] = useState<ExperienceRecord>(() => ({
    id: initial?.id || '',
    companyName: initial?.companyName || '',
    jobTitle: initial?.jobTitle || '',
    fromDate: initial?.fromDate || '',
    toDate: initial?.toDate || '',
    jobDescription: initial?.jobDescription || '',
    attachment: initial?.attachment || 'Exp_Certificate.pdf',
    skills: initial?.skills || '',
    totalExperience: initial?.totalExperience || '',
    lastTakeHome: initial?.lastTakeHome || '',
    leavingReason: initial?.leavingReason || '',
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-[#DCE8F6] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-[#E2EEFB] pb-3">
          <h3 className="text-[15px] font-bold text-[#1E293B]">
            {initial ? 'Edit Work Experience' : 'Add Work Experience'}
          </h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1E293B]">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-[12px]">
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Company Name</label>
            <input
              type="text"
              value={record.companyName}
              onChange={(e) => setRecord({ ...record, companyName: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Job Title</label>
            <input
              type="text"
              value={record.jobTitle}
              onChange={(e) => setRecord({ ...record, jobTitle: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">From Date</label>
            <input
              type="date"
              value={record.fromDate}
              onChange={(e) => setRecord({ ...record, fromDate: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">To Date</label>
            <input
              type="date"
              value={record.toDate}
              onChange={(e) => setRecord({ ...record, toDate: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block font-semibold text-[#1E293B]">Job Description</label>
            <textarea
              rows={2}
              value={record.jobDescription}
              onChange={(e) => setRecord({ ...record, jobDescription: e.target.value })}
              className="w-full rounded-md border border-[#CBD5E1] p-2 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Skills Used</label>
            <input
              type="text"
              value={record.skills}
              onChange={(e) => setRecord({ ...record, skills: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Total Experience</label>
            <input
              type="text"
              value={record.totalExperience}
              onChange={(e) => setRecord({ ...record, totalExperience: e.target.value })}
              placeholder="e.g. 2 Years 4 Months"
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Last Take-home</label>
            <input
              type="text"
              value={record.lastTakeHome}
              onChange={(e) => setRecord({ ...record, lastTakeHome: e.target.value })}
              placeholder="₹ 28,000"
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Leaving Reason</label>
            <input
              type="text"
              value={record.leavingReason}
              onChange={(e) => setRecord({ ...record, leavingReason: e.target.value })}
              placeholder="Better Opportunity"
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-[#E2EEFB] pt-4">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(record)} className="bg-[#0066FF] text-white">
            Save Record
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Training Modal Dialog */
function TrainingDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: TrainingRecord | null
  onClose: () => void
  onSave: (record: TrainingRecord) => void
}) {
  const [record, setRecord] = useState<TrainingRecord>(() => ({
    id: initial?.id || '',
    training: initial?.training || '',
    dateOfCompletion: initial?.dateOfCompletion || '',
    certification: initial?.certification || 'Completed',
    institute: initial?.institute || 'Dexter India Training Center',
    grade: initial?.grade || 'A',
    attachment: initial?.attachment || 'Training_Certificate.pdf',
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-[#DCE8F6] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-[#E2EEFB] pb-3">
          <h3 className="text-[15px] font-bold text-[#1E293B]">
            {initial ? 'Edit Training Details' : 'Add Training Details'}
          </h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1E293B]">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-[12px]">
          <div className="col-span-2">
            <label className="mb-1 block font-semibold text-[#1E293B]">Training Name</label>
            <input
              type="text"
              value={record.training}
              onChange={(e) => setRecord({ ...record, training: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Date of Completion</label>
            <input
              type="date"
              value={record.dateOfCompletion}
              onChange={(e) => setRecord({ ...record, dateOfCompletion: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Certification Status</label>
            <input
              type="text"
              value={record.certification}
              onChange={(e) => setRecord({ ...record, certification: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Institute / Center</label>
            <input
              type="text"
              value={record.institute}
              onChange={(e) => setRecord({ ...record, institute: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1E293B]">Grade / Marks</label>
            <input
              type="text"
              value={record.grade}
              onChange={(e) => setRecord({ ...record, grade: e.target.value })}
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block font-semibold text-[#1E293B]">Attachment File</label>
            <input
              type="text"
              value={record.attachment}
              onChange={(e) => setRecord({ ...record, attachment: e.target.value })}
              placeholder="e.g. Training_Certificate.pdf"
              className="h-9 w-full rounded-md border border-[#CBD5E1] px-3 outline-none focus:border-[#0066FF]"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-[#E2EEFB] pt-4">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(record)} className="bg-[#0066FF] text-white">
            Save Record
          </Button>
        </div>
      </div>
    </div>
  )
}
