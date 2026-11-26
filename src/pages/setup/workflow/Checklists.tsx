import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { can, useRole } from '@/lib/rbac'
import { checklistStore, logAudit, useChecklists, type ChecklistConfig, type ChecklistItem } from '@/data/workflow'
import { BTN_PRIMARY, BTN_SECONDARY, EmptyRow, MiniToolbar, PageHead, Panel, TD, THead, TROW, Tabs, WfCrumbs } from './ui'

const TABS = ['Initial Readiness', 'Equipment Install'] as const
type Tab = (typeof TABS)[number]
const SECTION: Record<Tab, keyof ChecklistConfig> = { 'Initial Readiness': 'readiness', 'Equipment Install': 'equipment' }
const PHOTOS: ChecklistItem['photos'][] = ['Multiple', 'Optional', 'None']
type Row = Omit<ChecklistItem, 'statuses'> & { statuses: string }
const toRows = (items: ChecklistItem[]): Row[] => items.map((i) => ({ ...i, statuses: i.statuses.join(', ') }))
const COLS = ['#', 'Particulars', 'Allowed statuses', 'Photo rule', 'Mandatory', 'Active', 'Order', '']

export default function Checklists() {
  const [tab, setTab] = useState<Tab>('Initial Readiness')
  const cfg = useChecklists()
  return (
    <div className="space-y-5 pb-16 max-w-[1440px]">
      <WfCrumbs trail={[{ label: 'Installation Checklists' }]} />
      <PageHead title="Installation Checklist Setup" sub="Initial Readiness and Equipment Installation items used on every site installation form (Project spec §5.5). Changes apply to new entries; submitted records keep their values." />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      <Editor key={tab} tab={tab} items={cfg[SECTION[tab]]} />
    </div>
  )
}

function Editor({ tab, items }: { tab: Tab; items: ChecklistItem[] }) {
  const canEdit = can('Edit', useRole())
  const [rows, setRows] = useState<Row[]>(() => toRows(items))
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [q, setQ] = useState('')
  const [flt, setFlt] = useState('all')
  const filtering = !!q.trim() || flt !== 'all'
  const shown = rows.map((r, i) => ({ r, i })).filter(({ r }) => (flt === 'all' || (flt === 'Active' ? r.active : !r.active)) && (!q.trim() || r.label.toLowerCase().includes(q.trim().toLowerCase())))
  const dirty = JSON.stringify(rows) !== JSON.stringify(toRows(items))

  const upd = (i: number, patch: Partial<Row>) => {
    setRows((p) => p.map((r, j) => (j === i ? { ...r, ...patch } : r)))
    setErrs((e) => ({ ...e, [rows[i].key]: '' }))
  }
  const move = (i: number, d: -1 | 1) =>
    setRows((p) => {
      const j = i + d
      if (j < 0 || j >= p.length) return p
      const n = [...p]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  const add = () => {
    setRows((p) => [...p, { key: `item_${Date.now().toString(36)}`, label: '', statuses: 'Complete, Pending, N/A', photos: 'Multiple', mandatory: true, active: true }])
    setQ('')
    setFlt('all')
  }
  const remove = (i: number) => setRows((p) => p.filter((_, j) => j !== i))

  const save = () => {
    const e: Record<string, string> = {}
    const seen = new Set<string>()
    rows.forEach((r) => {
      const label = r.label.trim().toLowerCase()
      const sts = r.statuses.split(',').map((s) => s.trim()).filter(Boolean)
      if (!label) e[r.key] = 'Particular name is required.'
      else if (seen.has(label)) e[r.key] = 'Duplicate particular name.'
      else if (sts.length === 0) e[r.key] = 'Give at least one status.'
      else if (new Set(sts.map((s) => s.toLowerCase())).size !== sts.length) e[r.key] = 'Statuses must be different.'
      seen.add(label)
    })
    if (!rows.some((r) => r.active)) e._ = 'At least one item must stay active.'
    setErrs(e)
    if (Object.values(e).some(Boolean)) {
      toast('Please fix the highlighted rows.', 'error')
      return
    }
    const next: ChecklistItem[] = rows.map((r) => ({ ...r, label: r.label.trim(), statuses: r.statuses.split(',').map((s) => s.trim()).filter(Boolean) }))
    checklistStore.set((c) => ({ ...c, [SECTION[tab]]: next }))
    const before = new Set(items.map((i) => i.key))
    const after = new Set(next.map((i) => i.key))
    logAudit('Checklist Setup', tab, 'Checklist updated', `${next.length} items · added ${next.filter((i) => !before.has(i.key)).length} · removed ${items.filter((i) => !after.has(i.key)).length}`)
    setRows(toRows(next))
    toast(`${tab} checklist saved (${next.length} items).`)
  }

  return (
    <Panel>
      <MiniToolbar
        title={`${tab} checklist`}
        search={q}
        onSearch={setQ}
        filter={{ value: flt, onChange: setFlt, options: ['Active', 'Inactive'], all: 'All items' }}
        onDownload={() => downloadCsv(`checklist-${SECTION[tab]}`, ['S.N.', 'Particulars', 'Statuses', 'Photo', 'Mandatory', 'Active'], rows.map((r, i) => [String(i + 1), r.label, r.statuses, r.photos, r.mandatory ? 'Yes' : 'No', r.active ? 'Yes' : 'No']))}
      />
      {filtering && <div className="border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-[11px] text-slate-500">Reordering is available when no search / filter is applied.</div>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-[11.5px]">
          <THead cols={COLS} />
          <tbody>
            {shown.length === 0 && <EmptyRow cols={COLS.length} />}
            {shown.map(({ r, i }) => (
              <tr key={r.key} className={cn(TROW, !r.active && 'opacity-60')}>
                <td className={`${TD} font-semibold`}>{i + 1}</td>
                <td className={TD}>
                  <input disabled={!canEdit} value={r.label} onChange={(e) => upd(i, { label: e.target.value })} placeholder="e.g. Earthing" className={cn('h-8 w-[220px] rounded-md border px-2 text-[12px] outline-none focus:border-[#0066FF]', errs[r.key] ? 'border-brand-red' : 'border-slate-200')} />
                  {errs[r.key] && <div className="mt-1 text-[11px] text-brand-red">{errs[r.key]}</div>}
                </td>
                <td className={TD}>
                  <input disabled={!canEdit} value={r.statuses} onChange={(e) => upd(i, { statuses: e.target.value })} title="Comma separated" className="h-8 w-[220px] rounded-md border border-slate-200 px-2 text-[12px] outline-none focus:border-[#0066FF]" />
                </td>
                <td className={TD}>
                  <select disabled={!canEdit} value={r.photos} onChange={(e) => upd(i, { photos: e.target.value as ChecklistItem['photos'] })} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px] outline-none">
                    {PHOTOS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td className={TD}><input type="checkbox" disabled={!canEdit} checked={r.mandatory} onChange={(e) => upd(i, { mandatory: e.target.checked })} aria-label="Mandatory" /></td>
                <td className={TD}><input type="checkbox" disabled={!canEdit} checked={r.active} onChange={(e) => upd(i, { active: e.target.checked })} aria-label="Active" /></td>
                <td className={TD}>
                  <div className="flex gap-1">
                    <button type="button" disabled={!canEdit || filtering || i === 0} onClick={() => move(i, -1)} className="grid h-7 w-7 place-items-center rounded border border-slate-200 disabled:opacity-40" aria-label="Move up"><ArrowUp size={13} /></button>
                    <button type="button" disabled={!canEdit || filtering || i === rows.length - 1} onClick={() => move(i, 1)} className="grid h-7 w-7 place-items-center rounded border border-slate-200 disabled:opacity-40" aria-label="Move down"><ArrowDown size={13} /></button>
                  </div>
                </td>
                <td className={TD}>
                  {canEdit && <button type="button" onClick={() => remove(i)} className="inline-flex items-center gap-1 font-semibold text-red-600 hover:underline"><Trash2 size={13} /> Remove</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 px-4 py-3">
          {errs._ && <span className="mr-auto text-[12px] text-brand-red">{errs._}</span>}
          <button type="button" className={cn(BTN_SECONDARY, !errs._ && 'mr-auto')} onClick={add}><Plus size={14} /> Add item</button>
          <button type="button" className={BTN_SECONDARY} disabled={!dirty} onClick={() => { setRows(toRows(items)); setErrs({}) }}><RotateCcw size={14} /> Undo changes</button>
          <button type="button" className={BTN_PRIMARY} disabled={!dirty} onClick={save}><Save size={14} /> Save checklist</button>
        </div>
      )}
    </Panel>
  )
}
