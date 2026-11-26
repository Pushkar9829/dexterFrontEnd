import { apiEnabled } from '@/lib/api'
import { useMemo, useState } from 'react'
import { ArrowDown, GitBranch, LogOut, Mail, Network, Save, UserCog } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { can, useRole } from '@/lib/rbac'
import {
  WF_MODULES, chainFor, changeEmployeeEmail, exitEmployee, hierarchyStore, logAudit, useHierarchy, useWorkflow, useWorkflowLoad, wfApi, wfStore,
  type Employee, type EscalationRule, type HierarchyState, type WfModule,
} from '@/data/workflow'
import { BTN_PRIMARY, BTN_SECONDARY, EmptyRow, FilterCard, FilterSelect, MiniToolbar, PageHead, Panel, PickField, Stat, TD, THead, TROW, TableCard, Tabs, WfCrumbs } from './ui'
import { EMAIL_RE, empLabel, fmtD, usePaged } from './helpers'

const TABS = ['Employees', 'Module Owners', 'Escalation Matrix', 'Resolver Preview'] as const
type Tab = (typeof TABS)[number]
const isOpen = (s: string) => s !== 'Completed' && s !== 'Cancelled'

export default function Hierarchy() {
  const [tab, setTab] = useState<Tab>('Employees')
  const h = useHierarchy()
  useWorkflowLoad(['hierarchy', 'tasks']) // API mode: /employees + /workflow/config
  const active = h.employees.filter((e) => e.status === 'Active')
  return (
    <div className="space-y-5 pb-16 max-w-[1440px]">
      <WfCrumbs trail={[{ label: 'Hierarchy & Escalation' }]} />
      <PageHead
        title="Hierarchy & Escalation Matrix"
        sub="Who receives notifications for each module and who is escalated to when an action stays pending. Email recipients always resolve from here — never hard-coded."
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active employees" value={active.length} tone="text-emerald-600" />
        <Stat label="Exited / replaced" value={h.employees.length - active.length} tone="text-red-600" />
        <Stat label="Modules with owner" value={`${Object.keys(h.moduleOwners).length} / ${WF_MODULES.length}`} tone="text-[#0066FF]" />
        <Stat label="Escalation levels" value="L1 – L5" hint="Configurable per module" />
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'Employees' && <EmployeesTab h={h} />}
      {tab === 'Module Owners' && <OwnersTab h={h} />}
      {tab === 'Escalation Matrix' && <MatrixTab h={h} />}
      {tab === 'Resolver Preview' && <ResolverTab h={h} />}
    </div>
  )
}

// ── Employees ────────────────────────────────────────────────────────────
type Dialog = { kind: 'line' | 'email' | 'exit'; emp: Employee } | null
const EMP_COLS = ['Emp ID', 'Name', 'Designation', 'Department', 'Reports To', 'Email ID', 'Status', 'Replaced By', 'Open Tasks', 'Actions']

function EmployeesTab({ h }: { h: HierarchyState }) {
  const role = useRole()
  const canEdit = can('Edit', role)
  const { tasks } = useWorkflow()
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('all')
  const [st, setSt] = useState('all')
  const [dlg, setDlg] = useState<Dialog>(null)
  const depts = useMemo(() => [...new Set(h.employees.map((e) => e.department))].sort(), [h.employees])
  const openCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of tasks) if (isOpen(t.status)) m.set(t.assignedTo, (m.get(t.assignedTo) ?? 0) + 1)
    return m
  }, [tasks])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return h.employees.filter((e) => (dept === 'all' || e.department === dept) && (st === 'all' || e.status === st) && (!s || [e.id, e.name, e.email, e.designation].some((v) => v.toLowerCase().includes(s))))
  }, [h.employees, q, dept, st])
  const pg = usePaged(rows, `${q}|${dept}|${st}`)
  const name = (id?: string) => h.employees.find((e) => e.id === id)?.name ?? '—'

  return (
    <>
      <FilterCard
        search={q}
        onSearch={setQ}
        placeholder="ID, name, email, designation…"
        onReset={() => {
          setQ('')
          setDept('all')
          setSt('all')
        }}
        onDownload={() => downloadCsv('hierarchy-employees', EMP_COLS.slice(0, -1), rows.map((e) => [e.id, e.name, e.designation, e.department, name(e.reportsTo), e.email, e.status, name(e.replacedBy), String(openCount.get(e.id) ?? 0)]))}
      >
        <FilterSelect label="Department" value={dept} onChange={setDept} options={depts} all="All departments" />
        <FilterSelect label="Status" value={st} onChange={setSt} options={['Active', 'Exited']} all="All statuses" />
      </FilterCard>
      <TableCard title="Employee hierarchy" total={rows.length} page={pg.page} pageSize={pg.pageSize} onPage={pg.setPage} onPageSize={pg.setPageSize} noun="employees" minWidth={1250}>
        <THead cols={EMP_COLS} />
        <tbody>
          {pg.slice.length === 0 && <EmptyRow cols={EMP_COLS.length} />}
          {pg.slice.map((e) => (
            <tr key={e.id} className={TROW}>
              <td className={`${TD} font-semibold`}>{e.id}</td>
              <td className={TD}>{e.name}</td>
              <td className={TD}>{e.designation}</td>
              <td className={TD}>{e.department}</td>
              <td className={TD}>{name(e.reportsTo)}</td>
              <td className={TD}>{e.email}{e.emailHistory.length > 1 && <span className="ml-1 text-slate-400">({e.emailHistory.length - 1} old)</span>}</td>
              <td className={TD}><Badge tone={toneFor(e.status === 'Exited' ? 'Inactive' : 'Active')}>{e.status}</Badge></td>
              <td className={TD}>{name(e.replacedBy)}</td>
              <td className={TD}>{openCount.get(e.id) ?? 0}</td>
              <td className={TD}>
                {e.status === 'Active' && canEdit ? (
                  <div className="flex gap-3 font-semibold text-[#0066FF]">
                    <button type="button" className="inline-flex items-center gap-1 hover:underline" onClick={() => setDlg({ kind: 'line', emp: e })}><GitBranch size={13} /> Reporting line</button>
                    <button type="button" className="inline-flex items-center gap-1 hover:underline" onClick={() => setDlg({ kind: 'email', emp: e })}><Mail size={13} /> Change email ID</button>
                    {e.id !== 'EMP-001' && <button type="button" className="inline-flex items-center gap-1 text-red-600 hover:underline" onClick={() => setDlg({ kind: 'exit', emp: e })}><LogOut size={13} /> Exit / replace</button>}
                  </div>
                ) : (
                  <span className="text-slate-400">{e.status === 'Exited' ? 'History preserved' : '—'}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
      {dlg?.kind === 'line' && <ReportingLineModal emp={dlg.emp} h={h} onClose={() => setDlg(null)} />}
      {dlg?.kind === 'email' && <EmailModal emp={dlg.emp} h={h} onClose={() => setDlg(null)} />}
      {dlg?.kind === 'exit' && <ExitModal emp={dlg.emp} h={h} openTasks={openCount.get(dlg.emp.id) ?? 0} onClose={() => setDlg(null)} />}
    </>
  )
}

/** ids that report (directly or indirectly) to `id` — can't become its manager. */
function descendants(id: string, list: Employee[]): Set<string> {
  const out = new Set<string>()
  const walk = (p: string) => list.filter((e) => e.reportsTo === p && !out.has(e.id)).forEach((e) => { out.add(e.id); walk(e.id) })
  walk(id)
  return out
}

function ReportingLineModal({ emp, h, onClose }: { emp: Employee; h: HierarchyState; onClose: () => void }) {
  const [to, setTo] = useState(emp.reportsTo ?? '')
  const [designation, setDesignation] = useState(emp.designation)
  const [error, setError] = useState<{ to?: string; designation?: string }>({})
  const blocked = descendants(emp.id, h.employees)
  const options = h.employees.filter((e) => e.status === 'Active' && e.id !== emp.id && !blocked.has(e.id)).map((e) => ({ value: e.id, label: `${e.name} — ${e.designation}` }))
  const save = () => {
    const e: typeof error = {}
    if (!designation.trim()) e.designation = 'Designation is required.'
    if (!to && emp.id !== 'EMP-001') e.to = 'Select the reporting manager.'
    setError(e)
    if (Object.keys(e).length) return
    if (to === (emp.reportsTo ?? '') && designation.trim() === emp.designation) {
      toast('No changes to save.', 'info')
      return
    }
    if (apiEnabled) {
      wfApi.saveEmployee(emp.id, { reportsTo: to || null, designation: designation.trim() }).then((ok) => {
        if (ok) {
          toast(`Reporting line for ${emp.name} saved.`)
          onClose()
        }
      })
      return
    }
    hierarchyStore.set((s) => ({ ...s, employees: s.employees.map((x) => (x.id === emp.id ? { ...x, reportsTo: to || undefined, designation: designation.trim() } : x)) }))
    logAudit('Hierarchy', emp.id, 'Reporting line updated', `${emp.name}: reports to ${empLabel(to)}; designation ${designation.trim()}`)
    toast(`Reporting line for ${emp.name} saved.`)
    onClose()
  }
  return (
    <Modal title="Edit reporting line" sub={`${emp.id} · ${emp.name}`} onClose={onClose} footer={<><button type="button" className={BTN_SECONDARY} onClick={onClose}>Cancel</button><button type="button" className={BTN_PRIMARY} onClick={save}><Save size={15} /> Save</button></>}>
      <div className="space-y-4">
        <TextField label="Designation" required value={designation} onChange={(e) => setDesignation(e.target.value)} error={error.designation} />
        <PickField label="Reports To" required={emp.id !== 'EMP-001'} options={options} value={to} onChange={(e) => setTo(e.target.value)} error={error.to} placeholder={emp.id === 'EMP-001' ? 'None (top of hierarchy)' : 'Select'} hint="Employees below this person are excluded to avoid loops." />
      </div>
    </Modal>
  )
}

function EmailModal({ emp, h, onClose }: { emp: Employee; h: HierarchyState; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const save = () => {
    const v = email.trim().toLowerCase()
    let e = ''
    if (!v) e = 'Enter the new email ID.'
    else if (!EMAIL_RE.test(v)) e = 'Enter a valid email ID.'
    else if (v === emp.email.toLowerCase()) e = 'This is already the current email ID.'
    else if (h.employees.some((x) => x.id !== emp.id && x.status === 'Active' && x.email.toLowerCase() === v)) e = 'Another active employee already uses this email ID.'
    setError(e)
    if (e) return
    if (apiEnabled) wfApi.saveEmployee(emp.id, { email: v })
    else changeEmployeeEmail(emp.id, v)
    toast(`Email ID changed. Future notifications go to ${v}; history kept.`)
    onClose()
  }
  return (
    <Modal title="Change email ID" sub={`${emp.id} · ${emp.name}`} onClose={onClose} footer={<><button type="button" className={BTN_SECONDARY} onClick={onClose}>Cancel</button><button type="button" className={BTN_PRIMARY} onClick={save}><Save size={15} /> Save</button></>}>
      <div className="space-y-4">
        <TextField label="Current email ID" value={emp.email} disabled />
        <TextField label="New email ID" required type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} error={error} hint="Used automatically for all future notifications. Sent emails keep the old address." />
        <div>
          <div className="mb-1.5 text-[11px] font-semibold text-ink">Email ID history</div>
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 text-[12px]">
            {[...emp.emailHistory].reverse().map((x) => (
              <li key={`${x.email}-${x.from}`} className="flex justify-between px-3 py-1.5">
                <span>{x.email}</span>
                <span className="text-slate-500">{fmtD(x.from)} – {x.to ? fmtD(x.to) : 'current'}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}

function ExitModal({ emp, h, openTasks, onClose }: { emp: Employee; h: HierarchyState; openTasks: number; onClose: () => void }) {
  const [rep, setRep] = useState(emp.reportsTo ?? '')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<{ rep?: string; reason?: string }>({})
  const options = h.employees.filter((e) => e.status === 'Active' && e.id !== emp.id).map((e) => ({ value: e.id, label: `${e.name} — ${e.designation}` }))
  const owned = Object.entries(h.moduleOwners).filter(([, o]) => o === emp.id).map(([m]) => m)
  const reports = h.employees.filter((e) => e.reportsTo === emp.id && e.status === 'Active').length
  const save = () => {
    const e: typeof error = {}
    if (!rep) e.rep = 'Select the authorised replacement / reporting manager.'
    if (reason.trim().length < 5) e.reason = 'Give the exit / replacement reason (min 5 characters).'
    setError(e)
    if (Object.keys(e).length) return
    const before = wfStore.get().tasks.filter((t) => t.assignedTo === emp.id && t.status !== 'Completed').length
    if (apiEnabled) wfApi.exitEmployee(emp.id, rep, reason.trim())
    else exitEmployee(emp.id, rep, reason.trim())
    const after = wfStore.get().tasks.filter((t) => t.assignedTo === emp.id && t.status !== 'Completed').length
    toast(`${emp.name} exited. ${before - after} open task(s), ${owned.length} module mapping(s) and ${reports} direct report(s) moved to ${empLabel(rep)}.`)
    onClose()
  }
  return (
    <Modal title="Employee exit / replacement" sub={`${emp.id} · ${emp.name} · ${emp.designation}`} onClose={onClose} width={560} footer={<><button type="button" className={BTN_SECONDARY} onClick={onClose}>Cancel</button><button type="button" className="inline-flex h-9.5 items-center gap-2 rounded-lg bg-red-600 px-4 text-[13px] font-semibold text-white hover:bg-red-700" onClick={save}><UserCog size={15} /> Confirm exit</button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center text-[12px]">
          <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{openTasks}</div>open tasks</div>
          <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{owned.length}</div>module owner mappings</div>
          <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{reports}</div>direct reports</div>
        </div>
        <PickField label="Replacement / reporting manager" required options={options} value={rep} onChange={(e) => { setRep(e.target.value); setError((x) => ({ ...x, rep: undefined })) }} error={error.rep} />
        <TextAreaField label="Reason" required value={reason} onChange={(e) => { setReason(e.target.value); setError((x) => ({ ...x, reason: undefined })) }} error={error.reason} placeholder="Resigned / transferred / role change…" />
        <p className="text-[11px] text-slate-500">All of the above move to the replacement. Sent emails, actions and audit history stay under {emp.name}'s name — historical records are never rewritten.</p>
      </div>
    </Modal>
  )
}

// ── Module owners ────────────────────────────────────────────────────────
function OwnersTab({ h }: { h: HierarchyState }) {
  const canEdit = can('Edit', useRole())
  const [draft, setDraft] = useState<HierarchyState['moduleOwners']>(h.moduleOwners)
  const [q, setQ] = useState('')
  const [flt, setFlt] = useState('all')
  const options = h.employees.filter((e) => e.status === 'Active').map((e) => ({ value: e.id, label: `${e.name} — ${e.designation}` }))
  const dirty = WF_MODULES.filter((m) => (draft[m] ?? '') !== (h.moduleOwners[m] ?? ''))
  const rows = WF_MODULES.filter((m) => (flt === 'all' || (flt === 'Mapped' ? !!draft[m] : !draft[m])) && (!q.trim() || `${m} ${empLabel(draft[m])}`.toLowerCase().includes(q.trim().toLowerCase())))
  const save = () => {
    if (apiEnabled) {
      wfApi.saveConfig({ moduleOwners: Object.fromEntries(Object.entries(draft).filter(([, v]) => !!v)) as HierarchyState['moduleOwners'] }).then((ok) => ok && toast(`${dirty.length} module owner mapping(s) saved.`))
      return
    }
    hierarchyStore.set((s) => ({ ...s, moduleOwners: Object.fromEntries(Object.entries(draft).filter(([, v]) => !!v)) as HierarchyState['moduleOwners'] }))
    dirty.forEach((m) => logAudit('Hierarchy', m, 'Module owner changed', `${empLabel(h.moduleOwners[m])} → ${empLabel(draft[m])}`))
    toast(`${dirty.length} module owner mapping(s) saved.`)
  }
  return (
    <Panel>
      <MiniToolbar
        title="Module → owner (L1 / assigned executive)"
        search={q}
        onSearch={setQ}
        filter={{ value: flt, onChange: setFlt, options: ['Mapped', 'Not mapped'], all: 'All modules' }}
        onDownload={() => downloadCsv('module-owners', ['Module', 'Owner', 'Chain'], WF_MODULES.map((m) => [m, empLabel(draft[m]), chainFor(draft[m]).map((e) => e.name).join(' > ')]))}
        extra={canEdit && (
          <>
            <button type="button" className={BTN_SECONDARY} disabled={!dirty.length} onClick={() => setDraft(h.moduleOwners)}>Undo</button>
            <button type="button" className={BTN_PRIMARY} disabled={!dirty.length} onClick={save}><Save size={14} /> Save ({dirty.length})</button>
          </>
        )}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-[11.5px]">
          <THead cols={['Module', 'Owner (assigned executive)', 'Resolved chain L1 → L5']} />
          <tbody>
            {rows.length === 0 && <EmptyRow cols={3} />}
            {rows.map((m) => (
              <tr key={m} className={cn(TROW, dirty.includes(m) && 'bg-amber-50/60')}>
                <td className={`${TD} font-semibold`}>{m}</td>
                <td className={TD}>
                  <select disabled={!canEdit} value={draft[m] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [m]: e.target.value || undefined }))} className="h-8 w-[300px] rounded-md border border-slate-200 bg-white px-2 text-[12px] outline-none focus:border-[#0066FF]">
                    <option value="">Not mapped (falls back to Admin)</option>
                    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className={`${TD} text-slate-600`}>{chainFor(draft[m]).map((e) => e.name).join('  →  ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

// ── Escalation matrix ────────────────────────────────────────────────────
type RuleDraft = { level: number; designation: string; afterHours: string }
function MatrixTab({ h }: { h: HierarchyState }) {
  const canEdit = can('Edit', useRole())
  const [mod, setMod] = useState<WfModule>('CBR')
  const [q, setQ] = useState('')
  const load = (m: WfModule): RuleDraft[] => h.escalation.filter((r) => r.module === m).sort((a, b) => a.level - b.level).map((r) => ({ level: r.level, designation: r.designation, afterHours: String(r.afterHours) }))
  const [draft, setDraft] = useState<RuleDraft[]>(() => load('CBR'))
  const [errs, setErrs] = useState<Record<number, string>>({})
  const [applyAll, setApplyAll] = useState(false)
  const pickModule = (v: string) => {
    if (v === 'all') return
    setMod(v as WfModule)
    setDraft(load(v as WfModule))
    setErrs({})
  }
  const upd = (i: number, patch: Partial<RuleDraft>) => {
    setDraft((d) => d.map((r, j) => (j === i ? { ...r, ...patch } : r)))
    setErrs((e) => ({ ...e, [i]: '' }))
  }
  const save = () => {
    const e: Record<number, string> = {}
    draft.forEach((r, i) => {
      const n = Number(r.afterHours)
      if (!r.designation.trim()) e[i] = 'Designation is required.'
      else if (r.afterHours.trim() === '' || !Number.isInteger(n) || n < 0 || n > 720) e[i] = 'Hours must be a whole number 0–720.'
      else if (i > 0 && n < Number(draft[i - 1].afterHours)) e[i] = `Must be ≥ L${draft[i - 1].level} (${draft[i - 1].afterHours} h).`
    })
    setErrs(e)
    if (Object.values(e).some(Boolean)) return
    const targets = applyAll ? WF_MODULES : [mod]
    const next: EscalationRule[] = targets.flatMap((m) => draft.map((r) => ({ module: m, level: r.level as EscalationRule['level'], designation: r.designation.trim(), afterHours: Number(r.afterHours) })))
    if (apiEnabled) {
      const all = [...hierarchyStore.get().escalation.filter((r) => !targets.includes(r.module)), ...next].filter((r) => r.level >= 1)
      wfApi.saveConfig({ escalation: all }).then((ok) => ok && toast(`Escalation matrix saved for ${applyAll ? 'all modules' : mod}.`))
      return
    }
    hierarchyStore.set((s) => ({ ...s, escalation: [...s.escalation.filter((r) => !targets.includes(r.module)), ...next] }))
    logAudit('Escalation Matrix', applyAll ? 'All modules' : mod, 'Escalation matrix updated', draft.map((r) => `L${r.level} ${r.designation} @${r.afterHours}h`).join('; '))
    toast(`Escalation matrix saved for ${applyAll ? 'all modules' : mod}.`)
  }
  const shown = draft.map((r, i) => ({ r, i })).filter(({ r }) => !q.trim() || r.designation.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <Panel>
      <MiniToolbar
        title={`Escalation levels — ${mod}`}
        search={q}
        onSearch={setQ}
        filter={{ value: mod, onChange: pickModule, options: WF_MODULES, all: 'Select module' }}
        onDownload={() => downloadCsv('escalation-matrix', ['Module', 'Level', 'Designation', 'Escalate after (h)'], h.escalation.map((r) => [r.module, `L${r.level}`, r.designation, String(r.afterHours)]))}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-[11.5px]">
          <THead cols={['Level', 'Designation / reporting level', 'Escalate after (hours overdue)', 'Responsibility']} />
          <tbody>
            {shown.length === 0 && <EmptyRow cols={4} />}
            {shown.map(({ r, i }) => (
              <tr key={r.level} className={TROW}>
                <td className={`${TD} font-semibold`}>L{r.level}</td>
                <td className={TD}>
                  <input disabled={!canEdit} value={r.designation} onChange={(e) => upd(i, { designation: e.target.value })} className={cn('h-8 w-[260px] rounded-md border px-2 text-[12px] outline-none focus:border-[#0066FF]', errs[i] ? 'border-brand-red' : 'border-slate-200')} />
                  {errs[i] && <div className="mt-1 text-[11px] text-brand-red">{errs[i]}</div>}
                </td>
                <td className={TD}>
                  <input disabled={!canEdit} type="number" min={0} max={720} value={r.afterHours} onChange={(e) => upd(i, { afterHours: e.target.value })} className="h-8 w-[110px] rounded-md border border-slate-200 px-2 text-[12px] outline-none focus:border-[#0066FF]" />
                </td>
                <td className={`${TD} text-slate-500`}>{['First-level action', 'First escalation', 'Second escalation', 'Approval / intervention', 'Higher-level escalation'][r.level - 1] ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-4 py-3">
          <label className="mr-auto flex items-center gap-2 text-[12px] text-slate-600">
            <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} /> Apply the same levels to all {WF_MODULES.length} modules
          </label>
          <button type="button" className={BTN_SECONDARY} onClick={() => { setDraft(load(mod)); setErrs({}) }}>Undo</button>
          <button type="button" className={BTN_PRIMARY} onClick={save}><Save size={14} /> Save matrix</button>
        </div>
      )}
    </Panel>
  )
}

// ── Resolver preview ─────────────────────────────────────────────────────
function ResolverTab({ h }: { h: HierarchyState }) {
  const [mod, setMod] = useState<WfModule>('CBR')
  const owner = h.moduleOwners[mod]
  const chain = chainFor(owner ?? 'EMP-002')
  const rules = h.escalation.filter((r) => r.module === mod).sort((a, b) => a.level - b.level)
  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[14px] font-bold text-slate-900"><Network size={16} className="text-[#0066FF]" /> Resolve recipients</div>
        <PickField label="Module" options={WF_MODULES.map((m) => ({ value: m, label: m }))} value={mod} onChange={(e) => e.target.value && setMod(e.target.value as WfModule)} />
        <p className="mt-3 text-[12px] text-slate-500">
          Owner: <b className="text-slate-800">{owner ? empLabel(owner) : 'Not mapped — falls back to Admin'}</b>
        </p>
        <p className="mt-2 text-[11px] text-slate-500">Live: uses the current hierarchy, follows replacements of exited employees, and the escalation hours of this module.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ol className="space-y-1">
          {rules.map((r, i) => {
            const e = chain[r.level - 1]
            const fallback = !e && chain.length ? chain[chain.length - 1] : undefined
            return (
              <li key={r.level}>
                {i > 0 && <div className="flex items-center gap-2 py-1 pl-5 text-[11px] text-slate-400"><ArrowDown size={13} /> if still pending {r.afterHours} h after due</div>}
                <div className={cn('flex items-center gap-4 rounded-lg border px-4 py-3', e ? 'border-slate-200' : 'border-dashed border-amber-300 bg-amber-50/50')}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#0066FF] text-[12px] font-bold text-white">L{r.level}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-slate-500">{r.designation}</div>
                    <div className="text-[13px] font-semibold text-slate-900">{e ? `${e.name} · ${e.designation}` : fallback ? `No higher level — stays with ${fallback.name}` : 'Not resolved'}</div>
                  </div>
                  <span className="hidden text-[12px] text-slate-600 sm:block">{(e ?? fallback)?.email ?? '—'}</span>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
