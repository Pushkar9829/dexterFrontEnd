import { useMemo, useRef, useState } from 'react'
import { apiEnabled } from '@/data/bizApi'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Clock3,
  FileCheck2,
  FileText,
  ListPlus,
  Paperclip,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  ChevronDown,
  Building2,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import {
  addEvidence,
  addEvidenceApi,
  createTask,
  createTaskApi,
  useTasksLoad,
  DEPTS,
  NOW,
  PEOPLE,
  PRIORITIES,
  tasksStore,
  type Dept,
  type Priority,
  type TaskKind,
} from '@/data/tasks'
import { guardAct, ViewOnlyNote } from '@/lib/guard'

interface EntityOption {
  id: string
  label: string
  type: string
}

const ENTITIES: EntityOption[] = [
  { id: 'FR-MH-00124', label: 'ABC Franchise · Pune', type: 'Franchise' },
  { id: 'FR-GJ-00218', label: 'Patel Cash Solutions · Ahmedabad', type: 'Franchise' },
  { id: 'FR-KA-00076', label: 'Namma ATM Network · Bangalore', type: 'Franchise' },
  { id: 'FR-UP-00305', label: 'Awadh Banking Point · Lucknow', type: 'Franchise' },
  { id: 'FR-WB-00183', label: 'Bengal Rural Payments · Kolkata', type: 'Franchise' },
  { id: 'ST-MH-PUN-00124', label: 'Kothrud · Paud Road Site', type: 'Site' },
  { id: 'ATM-MH-1024', label: 'Site MH-1024 (WLA Diebold)', type: 'ATM' },
  { id: 'ATM-2026-00125', label: 'Email tracker ATM-2026-00125', type: 'Tracker' },
  { id: 'DOK-2026-0042', label: 'Complaint Docket DOK-2026-0042', type: 'Docket' },
]

const TASK_TEMPLATES = [
  {
    label: 'KYC Verification',
    title: 'Verify KYC dossier & release recommendation',
    outcome: 'Approved KYC pack uploaded, verified by team lead and cleared for Finance handoff.',
    desc: 'Perform maker-checker verification of franchisee Aadhar, PAN, bank statement, and municipal trade certificate.',
    dept: 'Verification' as Dept,
    priority: 'High' as Priority,
    hours: 12,
  },
  {
    label: 'Cash Audit',
    title: 'Franchise cash loading discrepancy audit',
    outcome: 'Reconciled cash register against CBR and physical vault slips with supervisor sign-off.',
    desc: 'Audit CBR entries against cash loading slips for the past 7 days to close discrepancy docket.',
    dept: 'Operations' as Dept,
    priority: 'Critical' as Priority,
    hours: 4,
  },
  {
    label: 'Site Maintenance',
    title: 'ATM site equipment check & IT transformer inspection',
    outcome: 'Physical inspection completed with photos uploaded and maintenance checklist signed.',
    desc: 'Verify UPS backup, battery cages, router signal strength, and camera recording uptime on-site.',
    dept: 'Projects' as Dept,
    priority: 'Medium' as Priority,
    hours: 24,
  },
  {
    label: 'RP Roll Dispatch',
    title: 'Dispatch thermal RP rolls to site',
    outcome: 'Waybill generated and RP rolls dispatched to franchisee with delivery confirmation.',
    desc: 'Send 20 thermal receipt paper rolls to franchise site as per monthly replenishment request.',
    dept: 'Operations' as Dept,
    priority: 'Medium' as Priority,
    hours: 48,
  },
]

/** datetime-local value in IST (+5:30) */
const toLocal = (ms: number) => new Date(ms + 5.5 * 3600_000).toISOString().slice(0, 16)

export default function CreateTaskPage() {
  const navigate = useNavigate()
  const { tasks } = tasksStore.use()
  useTasksLoad()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [expectedOutcome, setExpectedOutcome] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('Medium')
  const [department, setDepartment] = useState<Dept>('Verification')
  const [kind, setKind] = useState<TaskKind>('Ad-hoc')
  const [assignee, setAssignee] = useState(apiEnabled ? 'Unassigned' : 'Rahul Kumar')
  const [reviewer, setReviewer] = useState('Priya Menon')
  const [approver, setApprover] = useState('Meera Iyer')
  const [due, setDue] = useState(toLocal(NOW + 24 * 3600_000))
  const [parentId, setParentId] = useState('')
  const [entityId, setEntityId] = useState('')
  const [dependencyNote, setDependencyNote] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Eligible parent tasks
  const openParents = useMemo(
    () => tasks.filter((t) => !t.subtask && t.status !== 'Closed'),
    [tasks]
  )

  // Calculate target TAT
  const parsedDueMs = useMemo(() => {
    if (!due) return 0
    return Date.parse(due + ':00+05:30')
  }, [due])

  const tatHours = useMemo(() => {
    if (!parsedDueMs || Number.isNaN(parsedDueMs)) return 24
    return Math.max(1, Math.ceil((parsedDueMs - NOW) / 3600_000))
  }, [parsedDueMs])

  const formattedDeadline = useMemo(() => {
    if (!parsedDueMs || Number.isNaN(parsedDueMs)) return '—'
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(parsedDueMs)
  }, [parsedDueMs])

  // Apply Quick TAT Presets
  const applyPresetHours = (hours: number) => {
    setDue(toLocal(NOW + hours * 3600_000))
    if (errors.due) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.due
        return next
      })
    }
  }

  // Apply quick templates
  const applyTemplate = (t: (typeof TASK_TEMPLATES)[0]) => {
    setTitle(t.title)
    setExpectedOutcome(t.outcome)
    setDescription(t.desc)
    setDepartment(t.dept)
    setPriority(t.priority)
    applyPresetHours(t.hours)
    toast(`Template applied: ${t.label}`)
  }

  // Handle file addition
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const newFiles = Array.from(e.target.files)
    setAttachments((prev) => [...prev, ...newFiles])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  // Validate inputs
  const validate = () => {
    const errs: Record<string, string> = {}
    if (title.trim().length < 4) {
      errs.title = 'Task title must be at least 4 characters long.'
    }
    if (!expectedOutcome.trim()) {
      errs.expectedOutcome = 'Expected outcome is required (defines “done” for verification).'
    }
    if (!priority) {
      errs.priority = 'Please select a priority level.'
    }
    if (!department) {
      errs.department = 'Please select an owning department.'
    }
    if (!due || Number.isNaN(parsedDueMs)) {
      errs.due = 'Please specify a valid due date and time.'
    } else if (parsedDueMs <= NOW) {
      errs.due = 'Due date must be in the future (after Tuesday, 06 Oct 2026, 09:14 IST).'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Reset Form
  const resetForm = () => {
    setTitle('')
    setExpectedOutcome('')
    setDescription('')
    setPriority('Medium')
    setDepartment('Verification')
    setKind('Ad-hoc')
    setAssignee('Rahul Kumar')
    setDue(toLocal(NOW + 24 * 3600_000))
    setParentId('')
    setEntityId('')
    setDependencyNote('')
    setAttachments([])
    setErrors({})
  }

  // Create Task Execution
  const handleCreate = (createAnother = false) => {
    if (!guardAct('Tasks', 'Create', 'create tasks')) return
    if (!validate()) {
      toast('Please correct the highlighted form errors before proceeding.')
      return
    }

    setSubmitting(true)
    const upperEntityId = entityId.trim().toUpperCase()
    const matchedEntity = ENTITIES.find((e) => e.id === upperEntityId)

    if (apiEnabled) {
      // POST /tasks (people resolved to employee ids) → POST /files + /tasks/:id/evidence per attachment
      void (async () => {
        try {
          const newTask = await createTaskApi({
            title: title.trim(), description: description.trim() || title.trim(), expectedOutcome: expectedOutcome.trim(), priority, department,
            assignee: assignee === 'Unassigned' ? '' : assignee, reviewer, approver, dueMs: parsedDueMs,
            parentId: parentId ? parentId.split(' · ')[0] : undefined, entityId: upperEntityId || undefined, entityLabel: matchedEntity?.label ?? (upperEntityId || undefined),
            source: 'Manual / Web Form', depLabel: dependencyNote.trim() || undefined, kind,
          })
          for (const file of attachments) await addEvidenceApi(newTask.id, file)
          toast(`Task ${newTask.id} created successfully! SLA: ${newTask.tatHours}h`)
          if (createAnother) resetForm()
          else navigate(`/tasks/my/${newTask.id}`)
        } catch {
          /* toasted */
        } finally {
          setSubmitting(false)
        }
      })()
      return
    }

    try {
      const newTask = createTask({
        title: title.trim(),
        description: description.trim() || title.trim(),
        expectedOutcome: expectedOutcome.trim(),
        priority,
        department,
        assignee: assignee === 'Unassigned' ? '' : assignee,
        dueMs: parsedDueMs,
        parentId: parentId ? parentId.split(' · ')[0] : undefined,
        entityId: upperEntityId || undefined,
        entityLabel: matchedEntity?.label ?? (upperEntityId || undefined),
        source: dependencyNote.trim() ? `Manual (${dependencyNote.trim()})` : 'Manual / Web Form',
        createdBy: 'Paras Dubey',
        kind,
      })

      // Update reviewer, approver, and dependency note if customized
      if (reviewer || approver || dependencyNote.trim()) {
        tasksStore.set((s) => ({
          ...s,
          tasks: s.tasks.map((t) =>
            t.id === newTask.id
              ? {
                  ...t,
                  reviewer: reviewer || t.reviewer,
                  approver: approver || t.approver,
                  depLabel: dependencyNote.trim() || t.depLabel,
                }
              : t
          ),
        }))
      }

      // Attach evidence files if any were uploaded
      if (attachments.length > 0) {
        attachments.forEach((file) => {
          addEvidence(
            newTask.id,
            { name: file.name, size: file.size },
            'Paras Dubey'
          )
        })
      }

      toast(`Task ${newTask.id} created successfully! SLA: ${newTask.tatHours}h`)

      if (createAnother) {
        resetForm()
        setSubmitting(false)
      } else {
        navigate(`/tasks/my/${newTask.id}`)
      }
    } catch {
      toast('Failed to create task. Please check your inputs.')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-[1080px] pb-16">
      <ViewOnlyNote module="Tasks" />
      {/* Top Breadcrumb & Return Link */}
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0066FF] hover:underline"
        >
          <ArrowLeft size={14} /> Back to Tasks Hub
        </Link>
        <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
          Dexter India · Task Dispatch Center
        </span>
      </div>

      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0E2038] via-[#16325B] to-[#0E2038] p-5 sm:p-6 text-white shadow-md border border-slate-800 mb-6">
        <div className="pointer-events-none absolute inset-y-0 right-[25%] hidden w-48 -skew-x-[35deg] bg-white/5 md:block" />
        <div className="pointer-events-none absolute inset-y-0 right-[20%] hidden w-2.5 -skew-x-[35deg] bg-[#0066FF] md:block" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0066FF] text-white shadow-md shadow-blue-500/30">
              <ListPlus size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-[24px] font-bold tracking-tight">Create New Task</h1>
              <p className="mt-1 text-[13px] text-white/80 max-w-xl">
                Define operational requirements, set target turnaround SLAs, assign responsible owners, and establish clear outcomes.
              </p>
            </div>
          </div>

          {/* Reference Time & SLA Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3.5 py-2 border border-white/15 text-right text-[11px]">
            <div className="font-semibold text-white/90">Reference Time: 06 Oct 2026, 09:14 IST</div>
            <div className="text-white/70 mt-0.5">SLA clock initiates immediately upon task creation</div>
          </div>
        </div>
      </div>

      {/* Quick Template Selector Chips */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-[12px] font-semibold text-slate-700">
          <Sparkles size={14} className="text-[#0066FF]" />
          <span>Quick Template Fill:</span>
          <span className="text-[11px] font-normal text-slate-400">Click a template to populate standard operational parameters</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TASK_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.label}
              type="button"
              onClick={() => applyTemplate(tmpl)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-blue-50/80 hover:bg-blue-100 text-[#0066FF] border border-blue-200 transition-colors flex items-center gap-1.5"
            >
              <span>+</span>
              <span>{tmpl.label}</span>
              <span className="text-[10px] text-blue-400">({tmpl.hours}h)</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {/* SECTION 1: Task Core Definition */}
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 size={17} className="text-[#0066FF]" />
              <h2 className="text-[14px] font-bold text-[#0066FF]">1. Task Core Details</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-blue-200">
              Required Fields
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[12px] font-bold text-slate-800">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">{title.length} characters</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (errors.title) setErrors((prev) => ({ ...prev, title: '' }))
                }}
                placeholder="e.g. Verify KYC & release recommendation for Pune franchise"
                className={cn(
                  'w-full h-9 px-3 text-[13px] rounded-lg border bg-white text-slate-800 outline-none transition-colors focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]',
                  errors.title ? 'border-red-500 bg-red-50/30' : 'border-slate-200'
                )}
              />
              {errors.title && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.title}</p>}
            </div>

            {/* Expected Outcome */}
            <div>
              <label className="block text-[12px] font-bold text-slate-800 mb-1">
                Expected Outcome / Definition of "Done" <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={expectedOutcome}
                onChange={(e) => {
                  setExpectedOutcome(e.target.value)
                  if (errors.expectedOutcome) setErrors((prev) => ({ ...prev, expectedOutcome: '' }))
                }}
                placeholder="e.g. Approved KYC pack uploaded, verified by team lead and ready for Finance payout handoff."
                className={cn(
                  'w-full p-2.5 text-[13px] rounded-lg border bg-white text-slate-800 outline-none transition-colors focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] resize-none',
                  errors.expectedOutcome ? 'border-red-500 bg-red-50/30' : 'border-slate-200'
                )}
              />
              {errors.expectedOutcome ? (
                <p className="mt-1 text-[11px] font-medium text-red-600">{errors.expectedOutcome}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">
                  Defines the criteria required for supervisor approval and task closure.
                </p>
              )}
            </div>

            {/* Priority Selection Cards */}
            <div>
              <label className="block text-[12px] font-bold text-slate-800 mb-2">
                Priority Level <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRIORITIES.map((p) => {
                  const isSelected = priority === p
                  const toneConfig = {
                    Critical: {
                      border: 'border-red-200',
                      bg: 'bg-red-50/60',
                      text: 'text-red-700',
                      activeRing: 'border-red-500 bg-red-50 ring-1 ring-red-500',
                      badge: 'bg-red-100 text-red-800',
                      tat: '≤ 4 Hours',
                    },
                    High: {
                      border: 'border-amber-200',
                      bg: 'bg-amber-50/60',
                      text: 'text-amber-800',
                      activeRing: 'border-amber-500 bg-amber-50 ring-1 ring-amber-500',
                      badge: 'bg-amber-100 text-amber-800',
                      tat: '≤ 12 Hours',
                    },
                    Medium: {
                      border: 'border-blue-200',
                      bg: 'bg-blue-50/60',
                      text: 'text-blue-800',
                      activeRing: 'border-[#0066FF] bg-blue-50 ring-1 ring-[#0066FF]',
                      badge: 'bg-blue-100 text-blue-800',
                      tat: '≤ 24 Hours',
                    },
                    Low: {
                      border: 'border-slate-200',
                      bg: 'bg-slate-50/60',
                      text: 'text-slate-700',
                      activeRing: 'border-slate-500 bg-slate-100 ring-1 ring-slate-500',
                      badge: 'bg-slate-200 text-slate-800',
                      tat: '≤ 48 Hours',
                    },
                  }[p]

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        'p-2.5 rounded-lg border text-left transition-all',
                        isSelected ? toneConfig.activeRing : `${toneConfig.border} ${toneConfig.bg} hover:border-slate-300`
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('text-[13px] font-bold', toneConfig.text)}>{p}</span>
                        {isSelected && <CheckCircle2 size={14} className={toneConfig.text} />}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Standard TAT</span>
                        <span className="font-semibold text-slate-700">{toneConfig.tat}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Description / Instructions */}
            <div>
              <label className="block text-[12px] font-bold text-slate-800 mb-1">
                Detailed Instructions &amp; Context
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide step-by-step instructions, reference documents, or specific requirements..."
                className="w-full p-2.5 text-[13px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] resize-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Ownership, Department & Roles */}
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={17} className="text-[#0066FF]" />
              <h2 className="text-[14px] font-bold text-[#0066FF]">2. Ownership &amp; Assignment</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-blue-200">
              Department &amp; Team
            </span>
          </div>

          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Department */}
            <div>
              <label className="block text-[12px] font-bold text-slate-800 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Dept)}
                  className="w-full h-9 px-3 pr-8 text-[13px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  {DEPTS.map((d) => (
                    <option key={d} value={d}>
                      {d} Department
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Task Category / Kind */}
            <div>
              <label className="block text-[12px] font-bold text-slate-800 mb-1">
                Task Classification
              </label>
              <div className="relative">
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as TaskKind)}
                  className="w-full h-9 px-3 pr-8 text-[13px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="Ad-hoc">Ad-hoc Operational Task</option>
                  <option value="Daily Routine">Daily Routine SOP Task</option>
                  <option value="Monthly">Monthly Compliance / Audit Task</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-[12px] font-bold text-slate-800 mb-1">
                Assignee (Owner)
              </label>
              <div className="relative">
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full h-9 px-3 pr-8 text-[13px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="Unassigned">Unassigned (Queue)</option>
                  {PEOPLE.filter((p) => p.name !== 'Paras Dubey').map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} — {p.role} ({p.dept})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Reviewer Selection */}
            <div>
              <label className="block text-[12px] font-bold text-slate-800 mb-1">
                Reviewer (Team Lead)
              </label>
              <div className="relative">
                <select
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  className="w-full h-9 px-3 pr-8 text-[13px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="Priya Menon">Priya Menon — Team Leader</option>
                  <option value="Suresh Nair">Suresh Nair — Head</option>
                  <option value="Meera Iyer">Meera Iyer — Manager</option>
                  <option value="Vikram Shah">Vikram Shah — Manager (Finance)</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Approver Selection */}
            <div>
              <label className="block text-[12px] font-bold text-slate-800 mb-1">
                Approver (Manager Sign-off)
              </label>
              <div className="relative">
                <select
                  value={approver}
                  onChange={(e) => setApprover(e.target.value)}
                  className="w-full h-9 px-3 pr-8 text-[13px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="Meera Iyer">Meera Iyer — Manager</option>
                  <option value="Suresh Nair">Suresh Nair — Head</option>
                  <option value="Vikram Shah">Vikram Shah — Manager (Finance)</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: SLA & Target Timeline */}
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={17} className="text-[#0066FF]" />
              <h2 className="text-[14px] font-bold text-[#0066FF]">3. SLA &amp; Target Timeline</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-blue-200">
              SLA Countdown
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Quick SLA Presets */}
            <div>
              <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                Quick TAT Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '4h (Critical)', hours: 4 },
                  { label: '12h (Same Day)', hours: 12 },
                  { label: '24h (Next Day)', hours: 24 },
                  { label: '48h (2 Days)', hours: 48 },
                  { label: '72h (3 Days)', hours: 72 },
                  { label: '7 Days (Weekly)', hours: 168 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => applyPresetHours(item.hours)}
                    className="h-7.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 hover:border-slate-300 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Due Date & Time Picker */}
              <div>
                <label className="block text-[12px] font-bold text-slate-800 mb-1">
                  Due Date &amp; Time (IST) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                  <input
                    type="datetime-local"
                    value={due}
                    onChange={(e) => {
                      setDue(e.target.value)
                      if (errors.due) setErrors((prev) => ({ ...prev, due: '' }))
                    }}
                    className={cn(
                      'w-full h-9 pl-9 pr-3 text-[13px] rounded-lg border bg-white text-slate-800 outline-none transition-colors focus:border-[#0066FF]',
                      errors.due ? 'border-red-500 bg-red-50/30' : 'border-slate-200'
                    )}
                  />
                </div>
                {errors.due ? (
                  <p className="mt-1 text-[11px] font-medium text-red-600">{errors.due}</p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">Target SLA is calculated from creation time to due date.</p>
                )}
              </div>

              {/* Dynamic SLA Live Calculation Card */}
              <div className="rounded-lg bg-blue-50/70 border border-blue-200/80 p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wide">Target Turnaround (TAT)</div>
                  <div className="text-[20px] font-bold text-[#0066FF] mt-0.5">{tatHours} Hours</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">Deadline: {formattedDeadline}</div>
                </div>
                <div className="h-10 w-10 rounded-full bg-white border border-blue-200 flex items-center justify-center text-[#0066FF] shadow-sm">
                  <Clock3 size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Entity Linkage & Hierarchy (Optional) */}
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={17} className="text-[#0066FF]" />
              <h2 className="text-[14px] font-bold text-[#0066FF]">4. Entity Linkage &amp; Dependencies (Optional)</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-blue-200">
              Optional Context
            </span>
          </div>

          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Linked Entity */}
            <div>
              <label className="block text-[12px] font-bold text-slate-800 mb-1">
                Linked Entity (Franchise, ATM, Site ID)
              </label>
              <input
                type="text"
                list="entity-suggestions"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="e.g. FR-MH-00124 or ATM-MH-1024"
                className="w-full h-9 px-3 text-[13px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
              <datalist id="entity-suggestions">
                {ENTITIES.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.label} ({ent.type})
                  </option>
                ))}
              </datalist>
              <p className="mt-1 text-[11px] text-slate-400">
                Type an ID or select from suggestions to link this task to a franchise or machine.
              </p>
            </div>

            {/* Parent Task (for subtasks) */}
            <div>
              <label className="block text-[12px] font-bold text-slate-800 mb-1">
                Parent Task (if creating a subtask)
              </label>
              <div className="relative">
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full h-9 px-3 pr-8 text-[13px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">None (Top-level task)</option>
                  {openParents.map((t) => (
                    <option key={t.id} value={`${t.id} · ${t.title}`}>
                      {t.id} · {t.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Assign as child task under an existing active operation.</p>
            </div>

            {/* External Dependency / Blocker */}
            <div className="md:col-span-2">
              <label className="block text-[12px] font-bold text-slate-800 mb-1">
                External Dependency / Blocker (Optional)
              </label>
              <input
                type="text"
                value={dependencyNote}
                onChange={(e) => setDependencyNote(e.target.value)}
                placeholder="e.g. Field engineer physical visit, CRA cash reconciliation, Partner NOC certificate"
                className="w-full h-9 px-3 text-[13px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Note any prerequisite dependency that must complete before this task can close.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 5: Supporting Files & Evidence */}
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip size={17} className="text-[#0066FF]" />
              <h2 className="text-[14px] font-bold text-[#0066FF]">5. Supporting Documents &amp; Evidence</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-blue-200">
              {attachments.length} Attached
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Upload Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#0066FF] rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 rounded-full bg-blue-100/70 group-hover:bg-blue-100 flex items-center justify-center text-[#0066FF] mb-2 transition-colors">
                  <UploadCloud size={20} />
                </div>
                <div className="text-[13px] font-semibold text-slate-700">
                  Click to upload supporting documents or photos
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Supports PDF, PNG, JPG, XLSX, CSV (Max 10 MB each)
                </div>
              </div>
            </div>

            {/* Uploaded Files List */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-[12px]"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText size={16} className="text-[#0066FF] shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{file.name}</span>
                      <span className="text-slate-400 text-[11px]">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link
            to="/tasks"
            className="h-9.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors"
          >
            Cancel
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleCreate(true)}
              className="h-9.5 px-4 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[13px] font-semibold text-[#0066FF] transition-colors disabled:opacity-50"
            >
              Save &amp; Create Another
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleCreate(false)}
              className="h-9.5 px-5 rounded-lg bg-[#0066FF] hover:bg-blue-700 text-white text-[13px] font-bold shadow-md shadow-blue-500/20 inline-flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              <span>{submitting ? 'Creating Task...' : 'Create Task'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
