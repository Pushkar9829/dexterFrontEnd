import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Building2,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Settings,
  Monitor,
  PlayCircle,
  CheckCircle,
  Save,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  Trash2,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { fmtDateTime } from '@/data/legal'
import {
  archiveProject,
  exportProjects,
  getProject,
  restoreProject,
  saveProjectFields,
  useProjects,
  type Project,
} from '@/data/projects'

const DELETE_REASONS = [
  'Site dropped',
  'Duplicate entry',
  'Franchise agreement terminated',
  'Location changed · new record created',
]

/**
 * Site Master View / Record Page matching the Site Installation View / Form Page design.
 * Full 26 project fields organized across the 5 standard operational sections with top banner card.
 */
export default function ProjectRecord() {
  const { projectId = '' } = useParams()
  const archivedPath = useLocation().pathname.startsWith('/projects/archived')
  const state = useProjects()
  const p = getProject(state, projectId)
  if (!p) return <Navigate to={archivedPath ? '/projects/archived' : '/projects/active'} replace />
  const path = p.archived ? '/projects/archived' : '/projects/active'
  if (p.archived !== archivedPath) return <Navigate to={`${path}/${p.id}`} replace />
  return <RecordView key={p.id} p={p} path={path} />
}

function RecordView({ p, path }: { p: Project; path: string }) {
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>(() => ({
    ...p.f,
    statusDate: p.f.statusDate || '04.10.2021',
  }))

  const handleFieldChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = (isDraft: boolean) => {
    if (p.archived) return
    const changed = saveProjectFields(p.id, fields)
    toast(
      isDraft
        ? 'Site master draft saved'
        : changed
        ? `${changed} field${changed > 1 ? 's' : ''} updated · recorded in audit history`
        : 'Site master record updated successfully',
      'success'
    )
    navigate(path)
  }

  const doExport = () => {
    exportProjects([{ ...p, f: fields }], `${p.id}-site-master-record`)
    toast('Site master record exported · recorded in the audit trail')
  }

  const renderSelect = (
    label: string,
    fieldKey: string,
    options: string[],
    required = false
  ) => {
    const val = fields[fieldKey] || ''
    const allOptions = val && !options.includes(val) ? [val, ...options] : options
    return (
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            value={val}
            disabled={p.archived}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none disabled:bg-slate-50 disabled:text-slate-500"
          >
            <option value="">Select status</option>
            {allOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-16 max-w-[1400px]">
      {/* Breadcrumb matching Site Installation */}
      <div className="flex items-center gap-2 text-[12px] text-slate-500">
        <Link to="/projects" className="hover:text-[#0066FF] transition-colors">
          Projects
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <Link to={path} className="hover:text-[#0066FF] transition-colors">
          {p.archived ? 'Archived Projects' : 'Site Master'}
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="font-semibold text-slate-800">{fields.siteLoi || p.id}</span>
      </div>

      {/* Page Title & Subtitle + Top Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              Site Master - {fields.siteLoi || p.id}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                p.archived
                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {p.archived ? 'Archived' : 'Active Site'}
            </span>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Track site readiness, equipment installation, and account activation in one register.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={doExport}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-xs"
          >
            <Download size={15} />
            <span>Export</span>
          </button>
          <Link
            to={`${path}/${p.id}/audit`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-xs"
          >
            <History size={15} />
            <span>Audit History</span>
          </Link>
          {p.archived ? (
            <button
              type="button"
              onClick={() => {
                restoreProject(p.id)
                toast(`${p.f.siteLoi || p.id} restored to Active Projects`)
                navigate(`/projects/active/${p.id}`, { replace: true })
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-semibold transition-all shadow-xs"
            >
              <RotateCcw size={15} />
              <span>Restore</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold transition-all shadow-xs"
            >
              <Trash2 size={15} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {p.archived && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800 flex items-center justify-between">
          <div>
            <span className="font-semibold">Archived project:</span> {fmtDateTime(p.archivedAt)} ·{' '}
            {p.archiveReason}.
          </div>
          <button
            onClick={() => {
              restoreProject(p.id)
              toast(`${p.f.siteLoi || p.id} restored to Active Projects`)
              navigate(`/projects/active/${p.id}`, { replace: true })
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 underline hover:no-underline"
          >
            <RotateCcw size={13} /> Restore project
          </button>
        </div>
      )}

      {/* Top Banner / Information Card matching Site Installation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          {/* Blue building icon on left */}
          <div className="w-12 h-12 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm self-start lg:self-center">
            <Building2 size={24} />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 flex-1 items-center">
            {/* 1. Site/LOI Number with search */}
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-800 mb-1">
                Site/LOI Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  disabled={p.archived}
                  value={fields.siteLoi || ''}
                  onChange={(e) => handleFieldChange('siteLoi', e.target.value)}
                  placeholder="Site/LOI Number"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            {/* 2. Name of Franchisee */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
                <User size={13} className="text-[#0066FF]" />
                <span>Name of Franchisee</span>
              </div>
              <div
                className="text-[13px] font-semibold text-slate-800 truncate"
                title={fields.franchisee}
              >
                {fields.franchisee || '--'}
              </div>
            </div>

            {/* 3. FR Contact Number */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
                <Phone size={13} className="text-[#0066FF]" />
                <span>FR Contact Number</span>
              </div>
              <div
                className="text-[13px] font-semibold text-slate-800 truncate"
                title={fields.frContact}
              >
                {fields.frContact || '--'}
              </div>
            </div>

            {/* 4. FR Email */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
                <Mail size={13} className="text-[#0066FF]" />
                <span>FR Email</span>
              </div>
              <div
                className="text-[13px] font-semibold text-slate-800 truncate"
                title={fields.frEmail}
              >
                {fields.frEmail || '--'}
              </div>
            </div>

            {/* 5. Site Location */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
                <MapPin size={13} className="text-[#0066FF]" />
                <span>Site Location</span>
              </div>
              <div
                className="text-[13px] font-semibold text-slate-800 truncate"
                title={fields.siteLocation}
              >
                {fields.siteLocation || '--'}
              </div>
            </div>

            {/* 6. Model */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
                <FileText size={13} className="text-[#0066FF]" />
                <span>Model</span>
              </div>
              <div
                className="text-[13px] font-semibold text-slate-800 truncate"
                title={fields.model}
              >
                {fields.model || '--'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Site Readiness */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <Settings size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">1. Site Readiness</h2>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {renderSelect('SD Status', 'sdStatus', ['Received', 'Pending', 'Under Review'], true)}
          {renderSelect('Signage Board', 'signage', ['Done', 'Pending', 'Fabrication Pending'])}
          {renderSelect('Electrical Work', 'electrical', ['Complete', 'Pending', 'In Progress'], true)}
          {renderSelect('Lollypop', 'lollypop', ['Done', 'Pending', 'In Progress'])}
          {renderSelect('TIS Status', 'tisStatus', ['Complete', 'Pending', 'Under Verification'], true)}
          {renderSelect("Hitachi's Branding", 'hitachi', ['Done', 'Pending', 'Artwork Approved'])}
          {renderSelect('Grouting', 'grouting', ['Done', 'Pending', 'In Progress'])}
          {renderSelect('Monkey Cage', 'monkeyCage', ['Done', 'Pending', 'Not Required'])}
        </div>
      </div>

      {/* SECTION 2: ATM / Equipment Status */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <Monitor size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">2. ATM / Equipment Status</h2>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {renderSelect('ATM Machine', 'atmMachine', [
            'Delivered / Pending / Installation Pending',
            'Delivered',
            'Installation Pending',
            'Installation Done',
            'Pending',
          ])}
          {renderSelect('UPS', 'ups', ['Delivered', 'Installation Pending', 'Installation Done', 'Pending'])}
          {renderSelect('V-SAT', 'vsat', ['Delivered', 'Installation Pending', 'Installation Done', 'Pending'])}
        </div>
      </div>

      {/* SECTION 3: Operational Status */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <PlayCircle size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">3. Operational Status</h2>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {renderSelect('Tech Live', 'techLive', ['Done', 'Pending', 'Testing'])}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Projection Completion Date
            </label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="date"
                disabled={p.archived}
                value={fields.projectionDate || ''}
                onChange={(e) => handleFieldChange('projectionDate', e.target.value)}
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          {renderSelect('Cash Live', 'cashLive', ['Done', 'Pending', 'Scheduled'])}
        </div>
      </div>

      {/* SECTION 4: Documentation / Account Status */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <FileText size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">4. Documentation / Account Status</h2>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {renderSelect('Agreement Status', 'agreementStatus', ['Done', 'Pending', 'Sent for Signing'])}
          {renderSelect('Payout Account Status', 'payoutAccount', [
            'Mail Sent for necessary letters _01.09.2021',
            'Verified',
            'Pending',
            'Documentation Incomplete',
          ])}
          {renderSelect('Apna App Registration', 'apnaApp', ['Registered', 'Applied', 'Pending'])}
          {renderSelect('GST Status', 'gstStatus', [
            'Registered',
            'Pending',
            'Applied',
            'Mail Sent for necessary letters _01.09.2021',
          ])}
          {renderSelect('WLA Account Status', 'wlaAccount', [
            'Active',
            'Opened · KYC pending',
            'Pending',
          ])}
        </div>
      </div>

      {/* SECTION 5: Final Status */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <CheckCircle size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">5. Final Status</h2>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {renderSelect('Current Status', 'status', [
            'Site preparation',
            'Installation in progress',
            'Go-live scheduled',
            'Live · 04.10.2021',
            'Awaiting legal clearance',
          ])}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Date</label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                disabled={p.archived}
                value={fields.statusDate || '04.10.2021'}
                onChange={(e) => handleFieldChange('statusDate', e.target.value)}
                placeholder="DD.MM.YYYY"
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar matching Site Installation */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between shadow-sm">
        {/* Back Button on Left */}
        <button
          type="button"
          onClick={() => navigate(path)}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#0066FF]/30 text-[#0066FF] hover:bg-blue-50/60 text-[13px] font-semibold transition-all shadow-xs"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          {p.archived ? (
            <button
              type="button"
              onClick={() => {
                restoreProject(p.id)
                toast(`${p.f.siteLoi || p.id} restored to Active Projects`)
                navigate(`/projects/active/${p.id}`, { replace: true })
              }}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm"
            >
              <RotateCcw size={15} />
              <span>Restore Project</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#0066FF]/30 text-[#0066FF] hover:bg-blue-50/60 text-[13px] font-semibold transition-all shadow-xs"
              >
                <Save size={15} />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave(false)}
                className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow"
              >
                <span>Save & Continue</span>
                <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {confirm && (
        <DeleteDialog
          project={p}
          onClose={() => setConfirm(false)}
          onDone={() => navigate(`/projects/archived/${p.id}`, { replace: true })}
        />
      )}
    </div>
  )
}

function DeleteDialog({
  project,
  onClose,
  onDone,
}: {
  project: Project
  onClose: () => void
  onDone: () => void
}) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    if (!reason) return setErr('Select a reason')
    archiveProject(project.id, note.trim() ? `${reason} · ${note.trim()}` : reason)
    toast(`${project.f.siteLoi} moved to Archived Projects`)
    onClose()
    onDone()
  }
  return (
    <Modal
      title="Delete project?"
      sub={`${project.f.siteLoi} · ${project.id}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={submit}>
            Delete project
          </Button>
        </>
      }
    >
      <p className="mb-4 text-[13px] text-ink-2">
        The project moves to <b>Archived Projects</b>. Nothing is erased — all 26 fields and the
        audit history are kept, and the record can be restored at any time.
      </p>
      <div className="space-y-3">
        <SelectField
          label="Reason"
          required
          options={DELETE_REASONS}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            setErr('')
          }}
          error={err}
        />
        <TextAreaField
          label="Note (optional)"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  )
}
