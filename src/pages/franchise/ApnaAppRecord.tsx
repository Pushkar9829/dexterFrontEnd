import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Building2,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Hash,
  Home,
  Lock,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  User,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import {
  createEmptyApnaAppRegistration,
  getApnaAppRegistration,
  nextSn,
  saveApnaAppRegistration,
  type ApnaAppRegistration,
} from '@/data/apnaAppStore'

export default function ApnaAppRecord() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const [form, setForm] = useState<ApnaAppRegistration>(() => {
    if (!isNew && id) {
      const found = getApnaAppRegistration(id)
      if (found) return JSON.parse(JSON.stringify(found))
    }
    const empty = createEmptyApnaAppRegistration()
    empty.sn = nextSn()
    return empty
  })

  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!isNew && id) {
      const found = getApnaAppRegistration(id)
      if (found) setForm(JSON.parse(JSON.stringify(found)))
    }
  }, [id, isNew])

  const updateField = <K extends keyof ApnaAppRegistration>(key: K, value: ApnaAppRegistration[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const validate = () => {
    if (!form.sn.trim()) {
      toast('Serial Number (S.N.) is required', 'info')
      return false
    }
    if (!form.siteLoiNumber.trim()) {
      toast('Site / LOI Number is required', 'info')
      return false
    }
    if (!form.atmId.trim()) {
      toast('ATM ID is required', 'info')
      return false
    }
    if (!form.location.trim()) {
      toast('Location is required', 'info')
      return false
    }
    if (!form.franchiseName.trim()) {
      toast('Franchise Name is required', 'info')
      return false
    }
    if (!form.franchiseContact.trim()) {
      toast('Franchise Contact is required', 'info')
      return false
    }
    if (!form.userId.trim()) {
      toast('User ID is required', 'info')
      return false
    }
    if (!form.password.trim()) {
      toast('Password is required', 'info')
      return false
    }
    return true
  }

  const handleSave = () => {
    if (!validate()) return
    const saved = saveApnaAppRegistration(form)
    toast(`Registration S.N. ${saved.sn} saved successfully!`)
    navigate('/franchise/apna-app')
  }

  const handleSaveAndAddNew = () => {
    if (!validate()) return
    const saved = saveApnaAppRegistration(form)
    toast(`Registration S.N. ${saved.sn} saved! Ready for next record.`)
    const empty = createEmptyApnaAppRegistration()
    empty.sn = nextSn()
    setForm(empty)
  }

  const handleResetPassword = () => {
    const generated = `Apna@${Math.floor(1000 + Math.random() * 9000)}`
    updateField('password', generated)
    setShowPassword(true)
    toast(`Generated new password: ${generated}`, 'info')
  }

  return (
    <div className="mx-auto max-w-[1200px] pb-16 font-sans">
      {/* Breadcrumb matching Page 02 screenshot */}
      <nav className="mb-2.5 flex items-center gap-1.5 text-[12px] text-[#64748B]">
        <Link to="/dashboard" className="flex items-center gap-1 hover:text-[#0066FF]">
          <Home size={13} className="text-[#64748B]" />
          <span>Workspace</span>
        </Link>
        <span>&gt;</span>
        <Link to="/projects" className="hover:text-[#0066FF]">
          Projects
        </Link>
        <span>&gt;</span>
        <Link to="/franchise/apna-app" className="hover:text-[#0066FF]">
          Apna App Registration
        </Link>
      </nav>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-[#0F172A]">
          Apna App Registration
        </h1>
        <p className="mt-0.5 text-[13px] text-[#64748B]">
          Create and manage Apna App user registration details for site, franchise and master franchise.
        </p>
      </div>

      {/* Main Form Container */}
      <div className="space-y-4">
        {/* ── Section 01: Site Details ────────────────────────────────────────── */}
        <div className="rounded-xl border border-[#DCE8F6] bg-white p-5 shadow-xs">
          {/* Section Header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#EAF2FD] text-[13px] font-bold text-[#0066FF]">
              01
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#EAF2FD] text-[#0066FF]">
              <Building2 size={16} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#1E293B]">Site Details</h2>
              <p className="text-[11.5px] text-[#64748B]">Enter site / LOI and ATM details.</p>
            </div>
          </div>

          {/* Section Fields Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* S.N. */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                S.N. <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Hash size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={form.sn}
                  onChange={(e) => updateField('sn', e.target.value)}
                  placeholder="Enter serial number"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 text-[12.5px] text-[#1E293B] outline-none placeholder:text-[#94A3B8] focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Site / LOI Number */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                Site / LOI Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={form.siteLoiNumber}
                  onChange={(e) => updateField('siteLoiNumber', e.target.value)}
                  placeholder="Enter site / LOI number"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 text-[12.5px] text-[#1E293B] outline-none placeholder:text-[#94A3B8] focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* ATM ID */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                ATM ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={form.atmId}
                  onChange={(e) => updateField('atmId', e.target.value)}
                  placeholder="Enter ATM ID"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 text-[12.5px] font-mono text-[#1E293B] outline-none placeholder:text-[#94A3B8] focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="Enter location"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 text-[12.5px] text-[#1E293B] outline-none placeholder:text-[#94A3B8] focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 02: Franchise Details ─────────────────────────────────── */}
        <div className="rounded-xl border border-[#DCE8F6] bg-white p-5 shadow-xs">
          {/* Section Header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#EAF2FD] text-[13px] font-bold text-[#0066FF]">
              02
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#EAF2FD] text-[#0066FF]">
              <User size={16} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#1E293B]">Franchise Details</h2>
              <p className="text-[11.5px] text-[#64748B]">Enter franchise contact information.</p>
            </div>
          </div>

          {/* Section Fields Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* FR Name */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                FR Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Hash size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={form.franchiseName}
                  onChange={(e) => updateField('franchiseName', e.target.value)}
                  placeholder="Enter franchise name"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 text-[12.5px] text-[#1E293B] outline-none placeholder:text-[#94A3B8] focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Contact */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                Contact <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={form.franchiseContact}
                  onChange={(e) => updateField('franchiseContact', e.target.value)}
                  placeholder="Enter contact number"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 text-[12.5px] text-[#1E293B] outline-none placeholder:text-[#94A3B8] focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Email ID */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                Email ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="email"
                  value={form.franchiseEmail}
                  onChange={(e) => updateField('franchiseEmail', e.target.value)}
                  placeholder="Enter email id"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 text-[12.5px] text-[#1E293B] outline-none placeholder:text-[#94A3B8] focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 03: Master Franchise Details ──────────────────────────── */}
        <div className="rounded-xl border border-[#DCE8F6] bg-white p-5 shadow-xs">
          {/* Section Header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#EAF2FD] text-[13px] font-bold text-[#0066FF]">
              03
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#EAF2FD] text-[#0066FF]">
              <Users size={16} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#1E293B]">Master Franchise Details</h2>
              <p className="text-[11.5px] text-[#64748B]">Enter master franchise contact information.</p>
            </div>
          </div>

          {/* Section Fields Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Master Franchise */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                Master Franchise <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Hash size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={form.masterFranchise}
                  onChange={(e) => updateField('masterFranchise', e.target.value)}
                  placeholder="Enter master franchise name"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 text-[12.5px] text-[#1E293B] outline-none placeholder:text-[#94A3B8] focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Contact Number */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={form.masterContact}
                  onChange={(e) => updateField('masterContact', e.target.value)}
                  placeholder="Enter contact number"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 text-[12.5px] text-[#1E293B] outline-none placeholder:text-[#94A3B8] focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Email ID */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                Email ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="email"
                  value={form.masterEmail}
                  onChange={(e) => updateField('masterEmail', e.target.value)}
                  placeholder="Enter email id"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 text-[12.5px] text-[#1E293B] outline-none placeholder:text-[#94A3B8] focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 04: User Credentials ──────────────────────────────────── */}
        <div className="rounded-xl border border-[#DCE8F6] bg-white p-5 shadow-xs">
          {/* Section Header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#EAF2FD] text-[13px] font-bold text-[#0066FF]">
              04
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#EAF2FD] text-[#0066FF]">
              <Lock size={16} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#1E293B]">User Credentials</h2>
              <p className="text-[11.5px] text-[#64748B]">Create user login for Apna App.</p>
            </div>
          </div>

          {/* Section Fields Grid */}
          <div className="grid gap-4 sm:grid-cols-3 items-end">
            {/* User ID */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                User ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={form.userId}
                  onChange={(e) => updateField('userId', e.target.value)}
                  placeholder="Enter user id"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 text-[12.5px] text-[#1E293B] outline-none placeholder:text-[#94A3B8] focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Enter password"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-9 text-[12.5px] text-[#1E293B] outline-none placeholder:text-[#94A3B8] focus:border-[#0066FF]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-[#94A3B8] hover:text-[#1E293B]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Action: Reset Password */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                Action
              </label>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleResetPassword}
                className="h-9 w-full border-[#CBD5E1] bg-white font-medium text-[#0066FF] hover:bg-[#EAF2FD] text-[12.5px]"
              >
                <RotateCcw size={14} className="mr-1.5 text-[#0066FF]" /> Reset Password
              </Button>
            </div>
          </div>
        </div>

        {/* ── Bottom Action Buttons ────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => navigate('/franchise/apna-app')}
            className="border-[#CBD5E1] bg-white px-5 text-[#334155] hover:bg-[#F8FAFC]"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleSaveAndAddNew}
            className="border-[#0066FF] bg-white px-5 font-semibold text-[#0066FF] hover:bg-[#EAF2FD]"
          >
            Save &amp; Add New
          </Button>

          <Button
            type="button"
            size="md"
            onClick={handleSave}
            className="bg-[#0066FF] px-6 font-semibold text-white shadow-sm hover:bg-[#0052cc]"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
