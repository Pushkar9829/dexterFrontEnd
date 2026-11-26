import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { DEPARTMENTS, PRIORITIES, SLA_HOURS, type Department, type Priority } from '@/data/complaints'
import { actorName, logAudit, nowIso, useHierarchy } from '@/data/workflow'
import { complaintMasterStore, opsCan, useComplaintMaster, usePermState, type AssignTeam, type ComplaintCategory } from './opsData'
import { AccessDenied, BackendNote, IntelShell, Panel, Table, inputCls, selectCls } from './ui'
import { fmtDT } from './fmt'

type Draft = { category: string; subcategory: string; department: Department | ''; team: AssignTeam; defaultAssignee: string; defaultPriority: Priority; sla: Record<Priority, number> }
const blank = (): Draft => ({ category: '', subcategory: '', department: '', team: 'CRM', defaultAssignee: 'EMP-005', defaultPriority: 'Medium', sla: { ...SLA_HOURS } })

function Editor({ initial, code, onClose }: { initial: Draft; code?: string; onClose: () => void }) {
  const h = useHierarchy()
  const [d, setD] = useState<Draft>(initial)
  const [tried, setTried] = useState(false)
  const all = useComplaintMaster()
  const dup = all.some((c) => c.code !== code && c.category.toLowerCase() === d.category.trim().toLowerCase() && c.subcategory.toLowerCase() === d.subcategory.trim().toLowerCase())
  const slaBad = PRIORITIES.some((p) => !(d.sla[p] > 0))
  const err = !d.category.trim() || !d.subcategory.trim() || !d.department || dup || slaBad
  const assignees = h.employees.filter((e) => e.status === 'Active' && (e.department === 'Operations' || e.department === 'Administration'))
  const save = () => {
    setTried(true)
    if (err) return
    const rec: Omit<ComplaintCategory, 'code'> = { category: d.category.trim(), subcategory: d.subcategory.trim(), department: d.department as Department, team: d.team, defaultAssignee: d.defaultAssignee, defaultPriority: d.defaultPriority, sla: d.sla, active: true, updatedAt: nowIso(), updatedBy: actorName() }
    let newCode = code
    complaintMasterStore.set((xs) => {
      if (code) return xs.map((x) => (x.code === code ? { ...x, ...rec, active: x.active } : x))
      newCode = `CC-${String(xs.length + 1).padStart(3, '0')}`
      return [...xs, { ...rec, code: newCode }]
    })
    logAudit('Complaint Master', newCode ?? '', code ? 'Category updated' : 'Category added', `${rec.category} / ${rec.subcategory} · SLA ${PRIORITIES.map((p) => `${p[0]}${rec.sla[p]}h`).join(' ')}`)
    toast(code ? `${code} updated` : `Category ${newCode} added`)
    onClose()
  }
  return (
    <Modal
      title={code ? `Edit ${code}` : 'Add complaint category'}
      sub="Category drives department, assignment team, default assignee and SLA for new complaints."
      onClose={onClose}
      width={640}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Category" required value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} error={tried && !d.category.trim() ? 'Required' : undefined} />
        <TextField label="Sub-category" required value={d.subcategory} onChange={(e) => setD({ ...d, subcategory: e.target.value })} error={!tried ? undefined : !d.subcategory.trim() ? 'Required' : dup ? 'This category / sub-category already exists' : undefined} />
        <SelectField label="Department" required options={DEPARTMENTS} value={d.department} onChange={(e) => setD({ ...d, department: e.target.value as Department | '' })} error={tried && !d.department ? 'Required' : undefined} />
        <SelectField label="Assignment team" required options={['CRM', 'Field']} value={d.team} onChange={(e) => setD({ ...d, team: (e.target.value || 'CRM') as AssignTeam })} />
        <div>
          <label htmlFor="cm-assignee" className="mb-1.5 block text-[11px] font-semibold text-ink">Default assignee *</label>
          <select id="cm-assignee" className={`${selectCls} w-full`} value={d.defaultAssignee} onChange={(e) => setD({ ...d, defaultAssignee: e.target.value })}>
            {assignees.map((e) => (
              <option key={e.id} value={e.id}>{e.name} · {e.designation}</option>
            ))}
          </select>
        </div>
        <SelectField label="Default priority" required options={PRIORITIES} value={d.defaultPriority} onChange={(e) => setD({ ...d, defaultPriority: (e.target.value || 'Medium') as Priority })} />
      </div>
      <div className="mt-4 text-[11px] font-semibold text-ink">Resolution SLA (hours) by priority *</div>
      <div className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PRIORITIES.map((p) => (
          <label key={p} className="text-[11.5px] text-ink-2">
            {p}
            <input type="number" min={1} className={`${inputCls} mt-1 w-full`} value={d.sla[p] || ''} onChange={(e) => setD({ ...d, sla: { ...d.sla, [p]: Number(e.target.value) } })} />
          </label>
        ))}
      </div>
      {tried && slaBad && <p className="mt-1 text-[11px] text-brand-red">Every priority needs an SLA greater than 0 hours.</p>}
    </Modal>
  )
}

export default function ComplaintMaster() {
  const rows = useComplaintMaster()
  const h = useHierarchy()
  const perms = usePermState()
  const canEdit = opsCan('Complaint', 'Control', perms)
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<{ draft: Draft; code?: string } | null>(null)
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((r) => !s || `${r.code} ${r.category} ${r.subcategory} ${r.department}`.toLowerCase().includes(s))
  }, [rows, q])
  const toggle = (c: ComplaintCategory) => {
    complaintMasterStore.set((xs) => xs.map((x) => (x.code === c.code ? { ...x, active: !x.active, updatedAt: nowIso(), updatedBy: actorName() } : x)))
    logAudit('Complaint Master', c.code, c.active ? 'Category deactivated' : 'Category activated')
    toast(`${c.code} ${c.active ? 'deactivated' : 'activated'}`)
  }
  const name = (id: string) => h.employees.find((e) => e.id === id)?.name ?? id
  return (
    <IntelShell
      title="Complaint Master"
      active="/operations/complaint-master"
      sub="Configurable complaint categories (§12). Category sets department, CRM / Field assignment, default assignee and SLA used by Create Complaint and the task engine."
      actions={canEdit && <Button icon={<Plus size={15} />} onClick={() => setEdit({ draft: blank() })}>Add category</Button>}
    >
      {!opsCan('Complaint', 'View', perms) ? (
        <AccessDenied what="Complaint Master" />
      ) : (
        <Panel title={`Categories · ${rows.filter((r) => r.active).length} active of ${rows.length}`} action={<input aria-label="Search categories" className={`${inputCls} w-56`} placeholder="Search code, category…" value={q} onChange={(e) => setQ(e.target.value)} />}>
          {!canEdit && <div className="mb-3"><BackendNote>Read-only: editing the Complaint Master needs the Complaint “Control” permission.</BackendNote></div>}
          <Table head={['Code', 'Category / Sub-category', 'Department', 'Team', 'Default assignee', 'Priority', 'SLA C / H / M / L (h)', 'Status', 'Updated', '']} minWidth={1050}>
            {list.map((r) => (
              <tr key={r.code} className={r.active ? '' : 'opacity-60'}>
                <td className="px-3 py-2 font-medium text-primary">{r.code}</td>
                <td className="px-3 py-2">{r.category} / {r.subcategory}</td>
                <td className="px-3 py-2">{r.department}</td>
                <td className="px-3 py-2">{r.team}</td>
                <td className="px-3 py-2">{name(r.defaultAssignee)}</td>
                <td className="px-3 py-2">{r.defaultPriority}</td>
                <td className="px-3 py-2 tabular-nums">{PRIORITIES.map((p) => r.sla[p]).join(' / ')}</td>
                <td className="px-3 py-2"><Badge tone={r.active ? 'green' : 'gray'}>{r.active ? 'Active' : 'Inactive'}</Badge></td>
                <td className="px-3 py-2 whitespace-nowrap text-muted">{fmtDT(r.updatedAt)} · {r.updatedBy}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {canEdit && (
                    <span className="flex gap-3 text-[11.5px] font-medium text-primary">
                      <button type="button" className="hover:underline" onClick={() => setEdit({ code: r.code, draft: { category: r.category, subcategory: r.subcategory, department: r.department, team: r.team, defaultAssignee: r.defaultAssignee, defaultPriority: r.defaultPriority, sla: { ...r.sla } } })}>Edit</button>
                      <button type="button" className="hover:underline" onClick={() => toggle(r)}>{r.active ? 'Deactivate' : 'Activate'}</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
          <p className="mt-2 text-[11px] text-muted">Inactive categories are hidden from new complaints; existing complaints keep their category (history is never overwritten).</p>
        </Panel>
      )}
      {edit && <Editor key={edit.code ?? 'new'} initial={edit.draft} code={edit.code} onClose={() => setEdit(null)} />}
    </IntelShell>
  )
}
