import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building,
  CheckCircle2,
  Edit2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { getSession } from '@/lib/auth'

export default function UserProfile() {
  const authUser = getSession()
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState({
    name: authUser?.name || 'Paras Dubey',
    role: authUser?.role || 'Operations Lead',
    empId: 'EMP-0102',
    email: 'Paras.Dubey@dexterindia.in',
    phone: '+91 98201 44582',
    department: 'ATM Operations & Support',
    location: 'Mumbai Central, Maharashtra',
    joinedDate: '14 Jan 2024',
    reportingTo: 'Suresh Nair (Head of Operations)',
  })

  const [form, setForm] = useState(profile)

  const handleSave = () => {
    setProfile(form)
    setEditing(false)
    toast('Profile information updated successfully!')
  }

  return (
    <div className="max-w-[1040px] pb-12">
      <Link
        to="/user/my-account"
        className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0066FF] hover:underline"
      >
        <ArrowLeft size={15} /> Back to My Account
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#1E293B]">
            User Profile
          </h1>
          <p className="mt-1 text-[13px] text-[#64748B]">
            Manage personal details, employee credentials, and contact information.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<Edit2 size={14} />}
          onClick={() => {
            setForm(profile)
            setEditing(true)
          }}
        >
          Edit Profile
        </Button>
      </div>

      {/* Main Profile Card */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Left Column: Avatar & Summary */}
        <Card className="p-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-[#0066FF] to-indigo-600 text-3xl font-bold text-white shadow-md">
            AS
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#1E293B]">{profile.name}</h2>
          <p className="text-[13px] font-medium text-[#0066FF]">{profile.role}</p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> Active Employee
          </span>

          <div className="mt-6 border-t border-line-soft pt-4 text-left text-[12px] space-y-2.5 text-[#475569]">
            <div className="flex items-center justify-between">
              <span className="text-muted">Employee ID:</span>
              <span className="font-mono font-semibold text-[#1E293B]">{profile.empId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Joined Date:</span>
              <span className="font-medium text-[#1E293B]">{profile.joinedDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Access Level:</span>
              <span className="font-semibold text-purple-700">Level 4 (Admin)</span>
            </div>
          </div>
        </Card>

        {/* Right Column: Detailed Fields */}
        <Card className="p-6 md:col-span-2 space-y-5">
          <h3 className="text-[15px] font-bold text-[#1E293B] border-b border-line-soft pb-2.5">
            Personal & Employment Details
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 text-[12.5px]">
            <div className="rounded-xl border border-line bg-surface p-3">
              <span className="text-[11px] text-muted flex items-center gap-1">
                <Mail size={12} /> Email Address
              </span>
              <div className="mt-1 font-semibold text-[#1E293B]">{profile.email}</div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3">
              <span className="text-[11px] text-muted flex items-center gap-1">
                <Phone size={12} /> Phone Number
              </span>
              <div className="mt-1 font-semibold text-[#1E293B]">{profile.phone}</div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3">
              <span className="text-[11px] text-muted flex items-center gap-1">
                <Building size={12} /> Department
              </span>
              <div className="mt-1 font-semibold text-[#1E293B]">{profile.department}</div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3">
              <span className="text-[11px] text-muted flex items-center gap-1">
                <MapPin size={12} /> Work Location
              </span>
              <div className="mt-1 font-semibold text-[#1E293B]">{profile.location}</div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3 sm:col-span-2">
              <span className="text-[11px] text-muted flex items-center gap-1">
                <User size={12} /> Reporting Manager
              </span>
              <div className="mt-1 font-semibold text-[#1E293B]">{profile.reportingTo}</div>
            </div>
          </div>

          <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="text-[#0066FF] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[13px] font-bold text-[#1E293B]">Security & 2FA Status</h4>
                <p className="mt-0.5 text-[11.5px] text-[#475569]">
                  Two-factor authentication is active on this account via corporate authenticator app.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Edit Profile Modal */}
      {editing && (
        <Modal
          title="Edit Profile Information"
          sub="Update your contact phone and work location details."
          onClose={() => setEditing(false)}
          width={560}
          footer={
            <div className="flex w-full justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          }
        >
          <div className="space-y-4 text-[12.5px]">
            <div>
              <label className="block font-medium text-[#1E293B] mb-1">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 w-full rounded-lg border border-line px-3 text-[13px] outline-none focus:border-[#0066FF]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#1E293B] mb-1">Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-9 w-full rounded-lg border border-line px-3 text-[13px] outline-none focus:border-[#0066FF]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#1E293B] mb-1">Work Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="h-9 w-full rounded-lg border border-line px-3 text-[13px] outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
