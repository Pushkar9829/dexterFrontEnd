import { useState } from 'react'
import { CheckCircle2, Lock, Plus, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { useRole } from '@/lib/rbac'
import { actorName, nowIso, useHierarchy, wid } from '@/data/workflow'
import { cn } from '@/lib/cn'
import {
  OPS_ACTIONS, OPS_MODULES, OPS_ROLES, RBAC_TO_OPS, SPEC_TEXT, effectiveActions, employeeCan, logPerm, permStore, usePermState,
  permLoader, opsMeIntelLoader, opsMeStore, apiSetMatrixCell, apiSetUserRoles, apiAddOverrides, apiRemoveOverride, apiResetPerms,
  type OpsAction, type OpsModule, type OpsRole, type PermOverride,
} from './opsData'
import { AccessDenied, BackendNote, IntelShell, Panel, Table, inputCls, selectCls } from './ui'
import { fmtDT } from './fmt'
import { apiEnabled } from '@/lib/api'
import { LoadBanner } from '../recon2/shared'

export default function Permissions() {
  const s = usePermState()
  const load = permLoader.use()
  opsMeIntelLoader.use()
  const me = opsMeStore.use()
  const [busy, setBusy] = useState(false)
  const run = (fn: () => Promise<unknown>) => {
    setBusy(true)
    fn().catch(() => undefined).finally(() => setBusy(false))
  }
  const h = useHierarchy()
  const role = useRole()
  const canEdit = role === 'Super Admin' || role === 'Admin'
  const opsRole = apiEnabled && me && me.role === role ? me.opsRoles.join(', ') || undefined : RBAC_TO_OPS[role]
  const [mod, setMod] = useState<OpsModule>('CBR')
  const staff = h.employees.filter((e) => e.status === 'Active')
  const [ov, setOv] = useState<{ emp: string; module: OpsModule; actions: OpsAction[]; effect: 'Grant' | 'Revoke'; reason: string }>({ emp: staff[0]?.id ?? '', module: 'CBR', actions: [], effect: 'Grant', reason: '' })
  const [chk, setChk] = useState<{ emp: string; module: OpsModule; action: OpsAction }>({ emp: staff[0]?.id ?? '', module: 'CBR', action: 'Approve' })
  const empName = (id: string) => h.employees.find((e) => e.id === id)?.name ?? id

  const toggleCell = (r: OpsRole, a: OpsAction) => {
    if (!canEdit) return
    const has = s.matrix[mod][r].includes(a)
    if (apiEnabled) return run(() => apiSetMatrixCell(mod, r, has ? s.matrix[mod][r].filter((x) => x !== a) : [...s.matrix[mod][r], a], `${mod} · ${r}: ${has ? 'removed' : 'added'} ${a}`))
    permStore.set((p) => ({ ...p, matrix: { ...p.matrix, [mod]: { ...p.matrix[mod], [r]: has ? p.matrix[mod][r].filter((x) => x !== a) : [...p.matrix[mod][r], a] } } }))
    logPerm(`${mod} · ${r}: ${has ? 'removed' : 'added'} ${a}`)
  }
  const toggleUserRole = (empId: string, r: OpsRole) => {
    if (!canEdit) return
    const cur = s.userRoles[empId] ?? []
    const has = cur.includes(r)
    if (apiEnabled) return run(() => apiSetUserRoles(empId, has ? cur.filter((x) => x !== r) : [...cur, r], `${empName(empId)}: ${has ? 'removed' : 'mapped'} role ${r}`))
    permStore.set((p) => ({ ...p, userRoles: { ...p.userRoles, [empId]: has ? cur.filter((x) => x !== r) : [...cur, r] } }))
    logPerm(`${empName(empId)}: ${has ? 'removed' : 'mapped'} role ${r}`)
  }
  const addOverride = () => {
    if (!ov.emp || !ov.actions.length || !ov.reason.trim()) return toast('Pick an employee, at least one action and a reason', 'info')
    if (apiEnabled) {
      const log = `${empName(ov.emp)}: ${ov.effect} ${ov.module} › ${ov.actions.join(', ')} (${ov.reason.trim()})`
      return run(async () => {
        await apiAddOverrides(ov.actions.map((a) => ({ employeeId: ov.emp, module: ov.module, action: a, effect: ov.effect, reason: ov.reason.trim() })), log)
        toast(`${ov.actions.length} permission override${ov.actions.length > 1 ? 's' : ''} saved`)
        setOv({ ...ov, actions: [], reason: '' })
      })
    }
    const rows: PermOverride[] = ov.actions.map((a) => ({ id: wid('POV'), employeeId: ov.emp, module: ov.module, action: a, effect: ov.effect, reason: ov.reason.trim(), by: actorName(), at: nowIso() }))
    permStore.set((p) => ({ ...p, overrides: [...rows, ...p.overrides] }))
    logPerm(`${empName(ov.emp)}: ${ov.effect} ${ov.module} › ${ov.actions.join(', ')} (${ov.reason.trim()})`)
    toast(`${rows.length} permission override${rows.length > 1 ? 's' : ''} saved`)
    setOv({ ...ov, actions: [], reason: '' })
  }
  const removeOverride = (o: PermOverride) => {
    if (apiEnabled) {
      const reason = window.prompt('Reason for removing this override (min 3 characters)')?.trim()
      if (!reason || reason.length < 3) return toast('A reason is required to remove an override', 'info')
      return run(() => apiRemoveOverride(o.id, reason, `${empName(o.employeeId)}: removed override ${o.effect} ${o.module} › ${o.action} (${reason})`))
    }
    permStore.set((p) => ({ ...p, overrides: p.overrides.filter((x) => x.id !== o.id) }))
    logPerm(`${empName(o.employeeId)}: removed override ${o.effect} ${o.module} › ${o.action}`)
  }
  const reset = () => {
    if (apiEnabled) {
      const reason = window.prompt('Reason for resetting the matrix to the §17 defaults (min 3 characters)')?.trim()
      if (!reason || reason.length < 3) return toast('A reason is required to reset permissions', 'info')
      return run(async () => {
        await apiResetPerms(reason)
        toast('Permission matrix reset to defaults')
      })
    }
    permStore.reset()
    logPerm('Matrix reset to the §17 proposed defaults')
    toast('Permission matrix reset to defaults')
  }

  const allowed = employeeCan(chk.emp, chk.module, chk.action, s)
  const chkRoles = s.userRoles[chk.emp] ?? []
  const chkOverrides = s.overrides.filter((o) => o.employeeId === chk.emp && o.module === chk.module && o.action === chk.action)

  return (
    <IntelShell
      title="Operations Permissions"
      active="/operations/permissions"
      sub="Role-based permission matrix for every Operations module (§17), explicit user role mapping and per-user overrides. Access is never granted automatically from department or designation."
      actions={canEdit && <Button variant="secondary" onClick={reset}>Reset to §17 defaults</Button>}
    >
      <LoadBanner state={load} onRetry={() => void permLoader.reload()} />
      {apiEnabled && !canEdit && <BackendNote>Your effective rights come from the server. The matrix shown is the §17 default — only Admin can read the live matrix.</BackendNote>}
      {busy && <div className="rounded-md bg-blue-50 px-3 py-2 text-[12px] text-blue-700">Saving to the server…</div>}
      <BackendNote>
        Read-only notice: this screen configures the proposed matrix for the frontend demo. Final permissions are set in Setup / Role Management and <b>must be enforced by the backend API</b> on every request; hiding a button is not security.
      </BackendNote>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-[12.5px]">
        <span className="text-muted">Signed in as</span> <b>{actorName()}</b>
        <span className="text-muted">· ERP role</span> <Badge tone="navy" dot={false}>{role}</Badge>
        <span className="text-muted">→ Operations role</span> {opsRole ? <Badge tone="blue" dot={false}>{opsRole}</Badge> : <Badge tone="red" dot={false}>No Operations access</Badge>}
        {!canEdit && <span className="ml-auto flex items-center gap-1 text-amber-700"><Lock size={13} /> View only — editing permissions is limited to Admin</span>}
      </div>

      <Panel title="Action matrix" sub="Select a module, then tick the actions each role may perform. “Control” includes every action. Spec wording is shown for reference.">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="scroll-thin flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
            {OPS_MODULES.map((m) => (
              <button key={m} type="button" onClick={() => setMod(m)} className={cn('h-8 shrink-0 rounded-md px-3 text-left text-[12px] font-medium', mod === m ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-surface')}>
                {m}
              </button>
            ))}
          </div>
          <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[720px] text-[12px]">
              <thead className="bg-surface text-[11px] font-semibold text-ink-2">
                <tr>
                  <th className="px-3 py-2 text-left">Action</th>
                  {OPS_ROLES.map((r) => (
                    <th key={r} className="px-3 py-2 text-center">
                      {r}
                      {SPEC_TEXT[mod] && <div className="mt-0.5 font-normal text-muted">{SPEC_TEXT[mod]![r]}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {OPS_ACTIONS.map((a) => (
                  <tr key={a}>
                    <td className="px-3 py-1.5 font-medium text-ink">{a}</td>
                    {OPS_ROLES.map((r) => (
                      <td key={r} className="px-3 py-1.5 text-center">
                        <input type="checkbox" aria-label={`${mod} ${r} ${a}`} checked={s.matrix[mod][r].includes(a)} disabled={!canEdit} onChange={() => toggleCell(r, a)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <Panel title="Matrix overview" sub="All modules × roles (current configuration)">
        <Table head={['Module', ...OPS_ROLES]} minWidth={1000}>
          {OPS_MODULES.map((m) => (
            <tr key={m}>
              <td className="px-3 py-1.5 font-medium">{m}</td>
              {OPS_ROLES.map((r) => (
                <td key={r} className="px-3 py-1.5 text-[11.5px] text-ink-2">{s.matrix[m][r].length ? s.matrix[m][r].join(' / ') : <span className="text-muted">No default access</span>}</td>
              ))}
            </tr>
          ))}
        </Table>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="User → Operations role mapping" sub="Explicit mapping; one employee can hold several roles">
          <Table head={['Employee', 'Designation', ...OPS_ROLES]} minWidth={760}>
            {staff.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-1.5 font-medium whitespace-nowrap">{e.name}</td>
                <td className="px-3 py-1.5 whitespace-nowrap text-muted">{e.designation}</td>
                {OPS_ROLES.map((r) => (
                  <td key={r} className="px-3 py-1.5 text-center">
                    <input type="checkbox" aria-label={`${e.name} ${r}`} disabled={!canEdit} checked={(s.userRoles[e.id] ?? []).includes(r)} onChange={() => toggleUserRole(e.id, r)} />
                  </td>
                ))}
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title="Per-user permission overrides" sub="Grant or revoke specific actions for one employee (many permissions per employee)">
          {canEdit ? (
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <select aria-label="Employee" className={selectCls} value={ov.emp} onChange={(e) => setOv({ ...ov, emp: e.target.value })}>
                {staff.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} · {e.designation}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <select aria-label="Module" className={`${selectCls} flex-1`} value={ov.module} onChange={(e) => setOv({ ...ov, module: e.target.value as OpsModule })}>
                  {OPS_MODULES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <select aria-label="Effect" className={selectCls} value={ov.effect} onChange={(e) => setOv({ ...ov, effect: e.target.value as 'Grant' | 'Revoke' })}>
                  <option>Grant</option>
                  <option>Revoke</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 sm:col-span-2">
                {OPS_ACTIONS.map((a) => (
                  <label key={a} className="flex items-center gap-1 text-[11.5px]">
                    <input type="checkbox" checked={ov.actions.includes(a)} onChange={() => setOv({ ...ov, actions: ov.actions.includes(a) ? ov.actions.filter((x) => x !== a) : [...ov.actions, a] })} />
                    {a}
                  </label>
                ))}
              </div>
              <input aria-label="Reason" className={`${inputCls} sm:col-span-2`} placeholder="Reason / approval reference *" value={ov.reason} onChange={(e) => setOv({ ...ov, reason: e.target.value })} />
              <div className="sm:col-span-2">
                <Button size="sm" icon={<Plus size={14} />} onClick={addOverride}>Add override</Button>
              </div>
            </div>
          ) : (
            <div className="mb-3"><AccessDenied what="Edit overrides" reason="Only Admin can grant or revoke user permissions." /></div>
          )}
          <Table head={['Employee', 'Module', 'Action', 'Effect', 'Reason', 'By / at', '']} minWidth={760}>
            {s.overrides.map((o) => (
              <tr key={o.id}>
                <td className="px-3 py-1.5 whitespace-nowrap">{empName(o.employeeId)}</td>
                <td className="px-3 py-1.5">{o.module}</td>
                <td className="px-3 py-1.5">{o.action}</td>
                <td className="px-3 py-1.5"><Badge tone={o.effect === 'Grant' ? 'green' : 'red'} dot={false}>{o.effect}</Badge></td>
                <td className="px-3 py-1.5">{o.reason}</td>
                <td className="px-3 py-1.5 whitespace-nowrap text-muted">{o.by} · {fmtDT(o.at)}</td>
                <td className="px-3 py-1.5">{canEdit && <button type="button" aria-label="Remove override" onClick={() => removeOverride(o)} className="text-muted hover:text-brand-red"><Trash2 size={14} /></button>}</td>
              </tr>
            ))}
            {s.overrides.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-muted">No user overrides.</td>
              </tr>
            )}
          </Table>
        </Panel>
      </div>

      <Panel title="Access check" sub="UAT 23: an unauthorized user opening a module or action gets “Access denied”">
        <div className="flex flex-wrap gap-2">
          <select aria-label="Check employee" className={selectCls} value={chk.emp} onChange={(e) => setChk({ ...chk, emp: e.target.value })}>
            {staff.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <select aria-label="Check module" className={selectCls} value={chk.module} onChange={(e) => setChk({ ...chk, module: e.target.value as OpsModule })}>
            {OPS_MODULES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select aria-label="Check action" className={selectCls} value={chk.action} onChange={(e) => setChk({ ...chk, action: e.target.value as OpsAction })}>
            {OPS_ACTIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className={cn('mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12.5px]', allowed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800')}>
          {allowed ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
          <div>
            <b>{allowed ? 'Allowed' : 'Access denied'}</b> — {empName(chk.emp)} · {chk.module} › {chk.action}
            <div className="mt-0.5 text-[11.5px]">
              Roles: {chkRoles.length ? chkRoles.join(', ') : 'none mapped'} · Effective actions: {effectiveActions(s, chkRoles, chk.module, chk.emp).join(', ') || 'none'}
              {chkOverrides.length > 0 && ` · Override: ${chkOverrides.map((o) => o.effect).join(', ')}`}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Permission change history" sub="Every matrix, role-mapping and override change is logged">
        {s.history.length === 0 ? (
          <p className="text-[12px] text-muted">No changes yet.</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {s.history.map((x, i) => (
              <li key={`${x.at}-${i}`} className="text-[12px] text-ink-2">{fmtDT(x.at)} · {x.by} · {x.text}</li>
            ))}
          </ul>
        )}
      </Panel>
    </IntelShell>
  )
}
