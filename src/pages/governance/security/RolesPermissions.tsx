// §12 Role-based access control: action rights per role, data-access scope, Master Data visibility.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Download, KeyRound, RotateCcw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { ACTIONS, DATA_SCOPES, MASTER_ACCESS, ROLES, getRolePerms, loadRoles, resetRolesOnServer, saveRoleAccess, setRolePerms, usePerms, useRole, type Action, type DataScope, type Role } from '@/lib/rbac'
import { apiEnabled } from '@/lib/api'
import { logSecurity } from '@/data/security'
import { APP_MODULES, loadModuleRights, resetModuleRights, setModuleRight, useModuleRights, type AppModule } from '@/lib/guard'
import { ConfirmModal, DataGrid, FormActions, Note, PageShell, Tabs } from './kit'
import { scopeStore } from './ops'
import { actor } from './util'

type Tab = 'actions' | 'modules' | 'scope' | 'master'
const MASTER_LABEL = { full: 'Full (overview + database)', project: 'Project part only', finance: 'Account mapping only', legal: 'Legal tracking only', none: 'No access' }
const ctl = 'h-9 rounded-lg border border-line bg-white px-3 text-[12.5px] font-medium text-ink outline-none focus:border-[#0066FF]'

export default function RolesPermissions() {
  const nav = useNavigate()
  const perms = usePerms()
  const scopes = scopeStore.use()
  const [tab, setTab] = useState<Tab>('actions')
  const [draft, setDraft] = useState<Record<Role, Action[]>>(() => getRolePerms())
  const [scopeDraft, setScopeDraft] = useState<Record<Role, DataScope>>(() => scopeStore.get())
  const [q, setQ] = useState('')
  const [actionFilter, setActionFilter] = useState<'' | Action>('')
  const [loading, setLoading] = useState(apiEnabled)

  // API mode: the role matrix lives on the server (GET /rbac/roles + /rbac/module-rights).
  useEffect(() => {
    if (!apiEnabled) return
    let alive = true
    Promise.all([loadRoles(), loadModuleRights()])
      .then(([roles]) => {
        if (!alive) return
        setDraft(getRolePerms())
        const sc = { ...scopeStore.get() }
        for (const r of roles) if (r.dataScope) sc[r.role] = r.dataScope
        scopeStore.set(sc)
        setScopeDraft(sc)
      })
      .catch((e: Error) => toast(e.message || 'Could not load roles from the server.', 'error'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const roles = useMemo(() => ROLES.filter((r) => r.toLowerCase().includes(q.trim().toLowerCase()) && (!actionFilter || draft[r]?.includes(actionFilter))), [q, actionFilter, draft])

  const toggle = (r: Role, a: Action) =>
    setDraft((d) => {
      const has = d[r]?.includes(a)
      return { ...d, [r]: has ? d[r].filter((x) => x !== a) : ACTIONS.filter((x) => x === a || d[r]?.includes(x)) }
    })

  const permChanges = ROLES.flatMap((r) => {
    const before = perms[r] ?? []
    const after = draft[r] ?? []
    const added = after.filter((a) => !before.includes(a))
    const removed = before.filter((a) => !after.includes(a))
    return added.length || removed.length ? [{ r, added, removed }] : []
  })
  const scopeChanges = ROLES.filter((r) => scopes[r] !== scopeDraft[r]).map((r) => ({ r, before: scopes[r], after: scopeDraft[r] }))

  const submitPerms = () => {
    if (permChanges.length === 0) return toast('No permission changes to save.', 'info')
    const who = actor()
    for (const c of permChanges) {
      setRolePerms(c.r, draft[c.r])
      logSecurity({ actor: who, action: 'Role permissions changed', target: c.r, detail: [c.added.length ? `granted ${c.added.join(', ')}` : '', c.removed.length ? `revoked ${c.removed.join(', ')}` : ''].filter(Boolean).join('; ') })
    }
    toast(`Permissions updated for ${permChanges.length} role(s) and audited.`)
  }
  const submitScopes = () => {
    if (scopeChanges.length === 0) return toast('No scope changes to save.', 'info')
    const who = actor()
    if (apiEnabled) {
      Promise.all(scopeChanges.map((c) => saveRoleAccess(c.r, { dataScope: c.after })))
        .then(() => {
          scopeStore.set(scopeDraft)
          toast(`Data scope updated for ${scopeChanges.length} role(s) and audited.`)
        })
        .catch((e: Error) => toast(e.message || 'Could not save the data scope.', 'error'))
      return
    }
    scopeStore.set(scopeDraft)
    for (const c of scopeChanges) logSecurity({ actor: who, action: 'Data-access scope changed', target: c.r, detail: `${c.before} → ${c.after}` })
    toast(`Data scope updated for ${scopeChanges.length} role(s) and audited.`)
  }

  const downloadMatrix = () => {
    downloadCsv('role-action-permissions', ['Role', ...ACTIONS], roles.map((r) => [r, ...ACTIONS.map((a) => (draft[r]?.includes(a) ? 'Yes' : 'No'))]))
    toast(`Downloaded ${roles.length} role(s)`)
  }
  const downloadScopes = () => {
    downloadCsv('role-data-scopes', ['Role', 'Data access scope'], roles.map((r) => [r, scopeDraft[r]]))
    toast(`Downloaded ${roles.length} role(s)`)
  }

  const toolbar = (onDownload: () => void, withActionFilter: boolean) => (
    <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
      <div className="relative min-w-[200px] flex-1">
        <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input type="search" aria-label="Search roles" placeholder="Search role…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-[13px] outline-none focus:border-[#0066FF] focus:bg-white" />
      </div>
      {withActionFilter && (
        <select aria-label="Filter by action" value={actionFilter} onChange={(e) => setActionFilter(e.target.value as Action | '')} className={ctl}>
          <option value="">All roles</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              Roles with {a}
            </option>
          ))}
        </select>
      )}
      <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={onDownload} className="ml-auto h-9">
        Download
      </Button>
    </div>
  )

  return (
    <PageShell Icon={KeyRound} color="text-indigo-600 bg-indigo-50 border-indigo-200" title="Roles & Permissions" sub="Action-level rights and data scope per role. The backend enforces the same rules; every change is audited.">
      <Note>
        <span className="font-semibold">Two permission layers apply.</span> The global action rights and module rights on this page cover every web module. Operations also has its own permission matrix — an Operations action is allowed only when both this page and that matrix permit it.{' '}
        <Link to="/operations/permissions" className="inline-flex items-center gap-1 font-semibold text-[#0066FF] underline underline-offset-2">
          Operations permission matrix <ArrowRight size={12} />
        </Link>
      </Note>
      {loading && <div className="py-2 text-[12px] text-muted">Loading roles from the server…</div>}
      <Tabs
        tabs={[
          { value: 'actions', label: 'Action permissions' },
          { value: 'modules', label: 'Module rights' },
          { value: 'scope', label: 'Data access scope' },
          { value: 'master', label: 'Master Data visibility' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'actions' && (
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs">
          {toolbar(downloadMatrix, true)}
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="border-b border-line bg-surface text-[10.5px] font-semibold tracking-wider text-muted uppercase">
                <tr>
                  <th className="sticky left-0 bg-surface px-4 py-3 text-left">Role</th>
                  {ACTIONS.map((a) => (
                    <th key={a} className="px-2 py-3 text-center">
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {roles.map((r) => (
                  <tr key={r} className="hover:bg-surface/50">
                    <td className="sticky left-0 bg-white px-4 py-2.5 font-medium whitespace-nowrap text-ink">{r}</td>
                    {ACTIONS.map((a) => {
                      const on = !!draft[r]?.includes(a)
                      const changed = on !== !!perms[r]?.includes(a)
                      return (
                        <td key={a} className={`px-2 py-2.5 text-center ${changed ? 'bg-amber-50' : ''}`}>
                          <input type="checkbox" aria-label={`${r} — ${a}`} checked={on} onChange={() => toggle(r, a)} className="h-4 w-4 accent-[#0066FF]" />
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {roles.length === 0 && (
                  <tr>
                    <td colSpan={ACTIONS.length + 1} className="py-8 text-center text-muted">
                      No roles match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4">
            <p className="mb-3 text-[12px] text-muted">{permChanges.length ? `${permChanges.length} role(s) changed (highlighted).` : 'No unsaved changes.'}</p>
            <FormActions
              onBack={() => nav('/governance')}
              onSubmit={submitPerms}
              submitLabel="Save permissions"
              extra={
                <Button variant="ghost" onClick={() => setDraft(getRolePerms())} disabled={permChanges.length === 0}>
                  Discard changes
                </Button>
              }
            />
          </div>
        </div>
      )}

      {tab === 'modules' && <ModuleRights q={q} setQ={setQ} />}

      {tab === 'scope' && (
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs">
          {toolbar(downloadScopes, false)}
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-line bg-surface text-[11px] font-semibold tracking-wider text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Data access scope</th>
                <th className="px-4 py-3">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {roles.map((r) => (
                <tr key={r} className={scopes[r] !== scopeDraft[r] ? 'bg-amber-50/60' : ''}>
                  <td className="px-4 py-2.5 font-medium text-ink">{r}</td>
                  <td className="px-4 py-2.5">
                    <select aria-label={`Scope for ${r}`} value={scopeDraft[r]} onChange={(e) => setScopeDraft((d) => ({ ...d, [r]: e.target.value as DataScope }))} className={ctl}>
                      {DATA_SCOPES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-muted">Sees records of {scopeDraft[r] === 'Company' ? 'the whole company' : `their own ${scopeDraft[r].toLowerCase()}`} only.</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4">
            <FormActions
              onBack={() => nav('/governance')}
              onSubmit={submitScopes}
              submitLabel="Save scopes"
              extra={
                <Button variant="ghost" onClick={() => setScopeDraft(scopeStore.get())} disabled={scopeChanges.length === 0}>
                  Discard changes
                </Button>
              }
            />
          </div>
        </div>
      )}

      {tab === 'master' && (
        <>
          <Note>Master Data is a confidential administrative database (Franchise spec §19). Operations, MIS and Franchise users never see it. This table is read-only.</Note>
          <DataGrid
            rows={ROLES}
            rowKey={(r) => r}
            fileName="master-data-visibility"
            searchPlaceholder="Search role…"
            filters={[{ key: 'acc', label: 'Access levels', get: (r) => MASTER_LABEL[MASTER_ACCESS[r]] }]}
            cols={[
              { key: 'role', label: 'Role', value: (r) => r, className: 'font-medium text-ink' },
              { key: 'acc', label: 'Master Data access', value: (r) => MASTER_LABEL[MASTER_ACCESS[r]], render: (r) => <Badge tone={MASTER_ACCESS[r] === 'full' ? 'green' : MASTER_ACCESS[r] === 'none' ? 'red' : 'blue'}>{MASTER_LABEL[MASTER_ACCESS[r]]}</Badge> },
            ]}
            pageSize={15}
          />
        </>
      )}
    </PageShell>
  )
}

/** Per-module rights (lib/guard). Effective right = module rule AND the role's global action right. */
function ModuleRights({ q, setQ }: { q: string; setQ: (v: string) => void }) {
  const me = useRole()
  const editable = me === 'Super Admin' || me === 'Admin'
  const rights = useModuleRights()
  const perms = usePerms()
  const [mod, setMod] = useState<AppModule>(APP_MODULES[0])
  const [confirmReset, setConfirmReset] = useState(false)
  const roles = ROLES.filter((r) => r.toLowerCase().includes(q.trim().toLowerCase()))

  const toggle = (r: Role, a: Action, on: boolean) => {
    if (!editable) return
    setModuleRight(mod, r, a, on)
    logSecurity({ actor: actor(), action: 'Module rights changed', target: `${mod} · ${r}`, detail: `${on ? 'granted' : 'revoked'} ${a}` })
  }
  const download = () => {
    downloadCsv(
      `module-rights-${mod.toLowerCase()}`,
      ['Role', ...ACTIONS],
      roles.map((r) => [r, ...ACTIONS.map((a) => (rights[mod]?.[r]?.includes(a) ? (r === 'Super Admin' || perms[r]?.includes(a) ? 'Yes' : 'Yes (capped by global right)') : 'No'))]),
    )
    toast(`Downloaded ${mod} module rights`)
  }

  return (
    <div className="space-y-3">
      <Note tone="amber">
        Global action rights (first tab) are the ceiling: a module tick only takes effect when the role also has that action globally. Cells marked “capped” are ticked here but blocked by the global right. Super Admin always has every right.
        {!editable && <span className="mt-1 block font-semibold">View only — only Super Admin and Admin can change module rights.</span>}
      </Note>
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <select aria-label="Module" value={mod} onChange={(e) => setMod(e.target.value as AppModule)} className={ctl}>
            {APP_MODULES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input type="search" aria-label="Search roles" placeholder="Search role…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-[13px] outline-none focus:border-[#0066FF] focus:bg-white" />
          </div>
          <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={download} className="h-9">
            Download
          </Button>
          {editable && (
            <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={() => setConfirmReset(true)} className="h-9">
              Reset to defaults
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="border-b border-line bg-surface text-[10.5px] font-semibold tracking-wider text-muted uppercase">
              <tr>
                <th className="sticky left-0 bg-surface px-4 py-3 text-left">Role · {mod}</th>
                {ACTIONS.map((a) => (
                  <th key={a} className="px-2 py-3 text-center">
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {roles.map((r) => (
                <tr key={r} className="hover:bg-surface/50">
                  <td className="sticky left-0 bg-white px-4 py-2.5 font-medium whitespace-nowrap text-ink">{r}</td>
                  {ACTIONS.map((a) => {
                    const on = !!rights[mod]?.[r]?.includes(a)
                    const capped = on && r !== 'Super Admin' && !perms[r]?.includes(a)
                    return (
                      <td key={a} className={`px-2 py-2.5 text-center ${capped ? 'bg-amber-50' : ''}`} title={capped ? `Ticked for ${mod}, but ${r} has no global ${a} right` : undefined}>
                        <input type="checkbox" aria-label={`${mod} — ${r} — ${a}`} checked={on} disabled={!editable} onChange={(e) => toggle(r, a, e.target.checked)} className="h-4 w-4 accent-[#0066FF] disabled:opacity-60" />
                        {capped && <div className="text-[9px] font-semibold text-amber-700">capped</div>}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {roles.length === 0 && (
                <tr>
                  <td colSpan={ACTIONS.length + 1} className="py-8 text-center text-muted">
                    No roles match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-3 text-[12px] text-muted">{editable ? 'Changes save immediately and are recorded in the Security Audit.' : 'You can view these rules but not change them.'}</p>
      </div>
      {confirmReset && (
        <ConfirmModal
          title="Reset module rights?"
          sub="All modules go back to the default rules. Global action rights are not changed."
          confirmLabel="Reset"
          danger
          onClose={() => setConfirmReset(false)}
          onConfirm={() => {
            if (apiEnabled) {
              setConfirmReset(false)
              resetRolesOnServer()
                .then(() => loadModuleRights())
                .then(() => toast('Roles and module rights reset to defaults on the server (audited).'))
                .catch((e: Error) => toast(e.message || 'Reset failed.', 'error'))
              return
            }
            resetModuleRights()
            logSecurity({ actor: actor(), action: 'Module rights reset to defaults', target: 'All modules' })
            setConfirmReset(false)
            toast('Module rights reset to defaults and audited.')
          }}
        />
      )}
    </div>
  )
}
