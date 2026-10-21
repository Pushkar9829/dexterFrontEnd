import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { createTask, DEPTS, NOW, PEOPLE, PRIORITIES, tasksStore, type Dept, type Priority } from '@/data/tasks'

const ENTITIES: [string, string][] = [
  ['FR-MH-00124', 'ABC Franchise · Pune'],
  ['FR-GJ-00218', 'Patel Cash Solutions'],
  ['FR-KA-00076', 'Namma ATM Network'],
  ['FR-UP-00305', 'Awadh Banking Point'],
  ['FR-WB-00183', 'Bengal Rural Payments'],
  ['ST-MH-PUN-00124', 'Kothrud · Paud Road'],
  ['ATM-MH-1024', 'Site MH-1024'],
  ['ATM-2026-00125', 'Email tracker ATM-2026-00125'],
]

/** datetime-local value in IST */
const toLocal = (ms: number) => new Date(ms + 5.5 * 3600_000).toISOString().slice(0, 16)

export function CreateTaskModal({ onClose, navigateOnCreate = true }: { onClose: () => void; navigateOnCreate?: boolean }) {
  const nav = useNavigate()
  const tasks = tasksStore.use().tasks
  const [f, setF] = useState({
    title: '',
    description: '',
    expectedOutcome: '',
    priority: 'Medium' as Priority | '',
    department: 'Verification' as Dept | '',
    assignee: 'Rahul Kumar',
    due: toLocal(NOW + 24 * 3600_000),
    parent: '',
    entity: '',
  })
  const [err, setErr] = useState<Record<string, string>>({})
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  const parents = tasks.filter((t) => !t.subtask && t.status !== 'Closed').map((t) => `${t.id} · ${t.title}`)

  const submit = () => {
    const e: Record<string, string> = {}
    if (f.title.trim().length < 4) e.title = 'Enter a task title (min 4 characters).'
    if (!f.expectedOutcome.trim()) e.expectedOutcome = 'Expected outcome is required — it defines “done”.'
    if (!f.priority) e.priority = 'Select a priority.'
    if (!f.department) e.department = 'Select a department.'
    const dueMs = Date.parse(f.due + ':00+05:30')
    if (!f.due || Number.isNaN(dueMs)) e.due = 'Select a due date and time.'
    else if (dueMs <= NOW) e.due = 'Due time must be after 06 Oct 2026, 09:14 IST.'
    setErr(e)
    if (Object.keys(e).length) return
    const entityId = f.entity.trim().toUpperCase()
    const known = ENTITIES.find(([id]) => id === entityId)
    const t = createTask({
      title: f.title.trim(),
      description: f.description.trim(),
      expectedOutcome: f.expectedOutcome.trim(),
      priority: f.priority as Priority,
      department: f.department as Dept,
      assignee: f.assignee === 'Unassigned' ? '' : f.assignee,
      dueMs,
      parentId: f.parent ? f.parent.split(' · ')[0] : undefined,
      entityId: entityId || undefined,
      entityLabel: known?.[1] ?? (entityId || undefined),
    })
    toast(`${t.id} created · SLA ${t.tatHours}h · ${t.assignee || 'Unassigned'}`)
    onClose()
    if (navigateOnCreate) nav(`/tasks/my/${t.id}`)
  }

  return (
    <Modal
      title="Create Task"
      sub="Every task needs an owner, an expected outcome and a target TAT. The SLA starts immediately and never pauses."
      onClose={onClose}
      width={640}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Create Task</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField className="sm:col-span-2" label="Task title" required name="ct-title" value={f.title} onChange={set('title')} error={err.title} placeholder="e.g. Verify KYC & release recommendation" />
        <TextAreaField className="sm:col-span-2" label="Description" name="ct-desc" value={f.description} onChange={set('description')} placeholder="What needs to be done and why" />
        <TextAreaField className="sm:col-span-2" label="Expected outcome" required name="ct-outcome" rows={2} value={f.expectedOutcome} onChange={set('expectedOutcome')} error={err.expectedOutcome} placeholder="e.g. Approved KYC pack for Finance handoff" />
        <SelectField label="Priority" required name="ct-priority" options={PRIORITIES} value={f.priority} onChange={set('priority')} error={err.priority} />
        <SelectField label="Department" required name="ct-dept" options={DEPTS} value={f.department} onChange={set('department')} error={err.department} />
        <SelectField label="Assignee" name="ct-assignee" options={['Unassigned', ...PEOPLE.filter((p) => p.name !== 'Paras Dubey').map((p) => p.name)]} value={f.assignee} onChange={set('assignee')} />
        <div>
          <label htmlFor="ct-due" className="mb-1.5 block text-[12px] font-semibold text-ink">
            Due (IST) *
          </label>
          <input id="ct-due" type="datetime-local" value={f.due} onChange={set('due')} className={`h-9 w-full rounded-md border bg-white px-3 text-[13px] outline-none focus:border-primary ${err.due ? 'border-brand-red' : 'border-line'}`} />
          {err.due ? <p className="mt-1 text-[11px] text-brand-red">{err.due}</p> : <p className="mt-1 text-[11px] text-muted">Target TAT is calculated from now to the due time.</p>}
        </div>
        <SelectField label="Parent task" name="ct-parent" placeholder="None" options={parents} value={f.parent} onChange={set('parent')} />
        <div>
          <TextField label="Linked entity" name="ct-entity" list="ct-entities" value={f.entity} onChange={set('entity')} placeholder="FR-MH-00124" hint="Franchise, site, ATM or email tracker ID" />
          <datalist id="ct-entities">
            {ENTITIES.map(([id, l]) => (
              <option key={id} value={id}>
                {l}
              </option>
            ))}
          </datalist>
        </div>
      </div>
    </Modal>
  )
}
