import { useCallback, useMemo, useState } from 'react'
import { Lock, Pencil, Plus, Power } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Field'
import { TextAreaField, TextField } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { apiCategoryStatus, apiEnabled, apiSaveCategory } from '@/data/payoutApi'
import { downloadCsv } from '@/lib/export'
import { can } from '@/lib/rbac'
import { EXPENSE_HEADS, businessStore, logPayout, useBusiness, useFinanceRules, type BmCategory, type FranchiseCategory } from '@/data/payout'
import { PayoutPage } from '../PayoutShell'
import { actor, clearDraft, fmtDate, getDraft, saveDraft, touchMeta } from './bmStore'
import { DataTable, FilterSelect, FormActions, Note, Panel, PickField, TableBar, type Col } from './ui'

const SHARE_RULES = ['None', 'As per agreement', 'Fixed amount per month', 'Percentage of gross payout', 'Percentage of post-rent payout', 'Percentage of post-expense profit']
type Form = Omit<BmCategory, 'status'> & { status: BmCategory['status'] }
const blank = (code: string): Form => ({ code, name: '', businessModel: '', description: '', applicablePayout: true, expenseRules: [...EXPENSE_HEADS], partnerShareRule: '', effectiveFrom: '', status: 'Active' })

export default function BmCategories() {
  const b = useBusiness()
  const rules = useFinanceRules()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [model, setModel] = useState('all')
  const [edit, setEdit] = useState<{ form: Form; isNew: boolean } | null>(null)
  const canEdit = can('Create') || can('Edit')
  const closeEdit = useCallback(() => setEdit(null), [])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return b.bmCategories.filter((c) => (status === 'all' || c.status === status) && (model === 'all' || c.businessModel === model) && (!s || `${c.code} ${c.name} ${c.description} ${c.businessModel}`.toLowerCase().includes(s)))
  }, [b.bmCategories, q, status, model])
  const models = useMemo(() => [...new Set(b.bmCategories.map((c) => c.businessModel))], [b.bmCategories])

  const nextCode = () => `BMC-${String(b.bmCategories.reduce((m, c) => Math.max(m, Number(c.code.replace(/\D/g, '')) || 0), 0) + 1).padStart(2, '0')}`
  const openNew = () => setEdit({ form: getDraft<Form>('category-new') ?? blank(nextCode()), isNew: true })

  const toggle = (c: BmCategory) => {
    const inUse = b.bmSites.filter((s) => s.category === c.code && s.status === 'Active').length
    if (c.status === 'Active' && inUse) {
      toast(`${c.code} is used by ${inUse} active BM site(s) — remap them before deactivating`, 'error')
      return
    }
    const to = c.status === 'Active' ? 'Inactive' : 'Active'
    businessStore.set((s) => ({ ...s, bmCategories: s.bmCategories.map((x) => (x.code === c.code ? { ...x, status: to } : x)) }))
    touchMeta('categoryMeta', c.code, `Status → ${to}`)
    if (apiEnabled) void apiCategoryStatus(c.code, to)
    logPayout({ by: actor(), area: 'BM Category Master', ref: c.code, action: `Status changed to ${to}` })
    toast(`${c.code} is now ${to}`)
  }

  const cols: Col<BmCategory>[] = [
    { key: 'code', header: 'Code', render: (r) => <b className="text-slate-900">{r.code}</b> },
    { key: 'name', header: 'Category Name', render: (r) => r.name },
    { key: 'model', header: 'Business Model', render: (r) => r.businessModel },
    { key: 'desc', header: 'Description', render: (r) => <span className="line-clamp-2 max-w-[220px]">{r.description}</span> },
    { key: 'pay', header: 'Applicable Payout', render: (r) => (r.applicablePayout ? 'Yes' : 'No') },
    { key: 'heads', header: 'Expense Rules (Heads)', render: (r) => <div className="flex max-w-[260px] flex-wrap gap-1">{r.expenseRules.map((h) => <Badge key={h} tone="blue" dot={false}>{h}</Badge>)}</div> },
    { key: 'share', header: 'Partner Share Rule', render: (r) => r.partnerShareRule },
    { key: 'eff', header: 'Effective', render: (r) => fmtDate(r.effectiveFrom) },
    { key: 'sites', header: 'Sites', render: (r) => b.bmSites.filter((s) => s.category === r.code).length },
    { key: 'st', header: 'Status', render: (r) => <Badge tone={r.status === 'Active' ? 'green' : 'gray'}>{r.status}</Badge> },
    {
      key: 'act', header: 'Action',
      render: (r) =>
        canEdit ? (
          <div className="flex gap-1.5">
            <button type="button" className="text-[#0066FF]" aria-label={`Edit ${r.code}`} onClick={() => setEdit({ form: { ...r }, isNew: false })}><Pencil size={15} /></button>
            <button type="button" className={r.status === 'Active' ? 'text-red-500' : 'text-emerald-600'} aria-label={`Toggle ${r.code}`} onClick={() => toggle(r)}><Power size={15} /></button>
          </div>
        ) : '—',
    },
  ]
  const frCols: Col<FranchiseCategory>[] = [
    { key: 'code', header: 'Code', render: (r) => r.code },
    { key: 'name', header: 'Name', render: (r) => r.name },
    { key: 'desc', header: 'Description', render: (r) => r.description },
    { key: 'v', header: 'Vertical', render: () => <Badge tone="purple">Franchise Model</Badge> },
    { key: 'st', header: 'Status', render: (r) => <Badge tone={r.status === 'Active' ? 'green' : 'gray'}>{r.status}</Badge> },
  ]

  return (
    <PayoutPage
      title="BM Site Category Master"
      sub="Separate category master for Business Model sites (§6.2). Franchise and BM categories never share a mapping."
      crumbs={['Business Model', 'Category Master']}
      actions={canEdit && <Button icon={<Plus size={15} />} onClick={openNew}>Add BM Category</Button>}
    >
      {rules.partnerShareBasis === null && <Note tone="amber">Partner share basis is a pending Finance decision (§21-08). Categories record the agreed rule text; P&L uses the Partner Share expense actually recorded for the site.</Note>}
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(r) => r.code}
        noun="categories"
        minWidth={1250}
        toolbar={
          <TableBar
            search={q}
            onSearch={setQ}
            placeholder="Code, name, model…"
            onDownload={() =>
              downloadCsv('bm_category_master', ['Code', 'Name', 'Business Model', 'Description', 'Applicable Payout', 'Expense Heads', 'Partner Share Rule', 'Effective From', 'Status'], rows.map((r) => [r.code, r.name, r.businessModel, r.description, r.applicablePayout ? 'Yes' : 'No', r.expenseRules.join(' | '), r.partnerShareRule, r.effectiveFrom, r.status]))
            }
          >
            <FilterSelect label="Business Model" value={model} onChange={setModel} options={models} />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={['Active', 'Inactive']} />
          </TableBar>
        }
      />

      <Panel title="Franchise Site Categories (read-only)" icon={Lock} sub="Maintained in the Franchise Model vertical. Shown here for reference only — they cannot be selected for BM sites and BM categories cannot be used for franchise sites.">
        <DataTable rows={b.franchiseCategories} cols={frCols} rowKey={(r) => r.code} noun="franchise categories" pageSize={5} minWidth={600} />
      </Panel>

      {edit && <CategoryModal key={edit.form.code} initial={edit.form} isNew={edit.isNew} existing={b.bmCategories} franchise={b.franchiseCategories} onClose={closeEdit} />}
    </PayoutPage>
  )
}

function CategoryModal({ initial, isNew, existing, franchise, onClose }: { initial: Form; isNew: boolean; existing: BmCategory[]; franchise: FranchiseCategory[]; onClose: () => void }) {
  const [f, setF] = useState<Form>(initial)
  const [e, setE] = useState<Record<string, string>>({})
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))

  const submit = () => {
    const err: Record<string, string> = {}
    const name = f.name.trim()
    if (!name) err.name = 'Category name is required'
    else if (existing.some((c) => c.code !== f.code && c.name.toLowerCase() === name.toLowerCase())) err.name = 'A BM category with this name already exists'
    else if (franchise.some((c) => c.name.toLowerCase() === name.toLowerCase())) err.name = 'This name is a Franchise category — BM categories must be separate'
    if (!f.businessModel.trim()) err.businessModel = 'Business model is required'
    if (!f.expenseRules.length) err.expenseRules = 'Select at least one applicable expense head'
    if (!f.partnerShareRule) err.partnerShareRule = 'Select the partner share rule'
    if (!f.effectiveFrom) err.effectiveFrom = 'Effective date is required'
    setE(err)
    if (Object.keys(err).length) return
    const rec: BmCategory = { ...f, name, businessModel: f.businessModel.trim(), description: f.description.trim() }
    if (isNew) businessStore.set((s) => ({ ...s, bmCategories: [...s.bmCategories, rec] }))
    else businessStore.set((s) => ({ ...s, bmCategories: s.bmCategories.map((c) => (c.code === rec.code ? rec : c)) }))
    touchMeta('categoryMeta', rec.code, isNew ? 'Created' : 'Updated')
    if (apiEnabled) void apiSaveCategory(isNew, rec)
    logPayout({ by: actor(), area: 'BM Category Master', ref: rec.code, action: isNew ? 'Category created' : 'Category updated', after: rec.name })
    if (isNew) clearDraft('category-new')
    toast(`${rec.code} ${isNew ? 'created' : 'updated'}`)
    onClose()
  }
  const draft = () => {
    if (isNew) {
      saveDraft('category-new', f)
      toast('Draft saved')
    } else toast('Drafts are kept for new categories only', 'info')
  }

  return (
    <Modal title={isNew ? 'Add BM Category' : `Edit ${f.code}`} sub="BM Site Category Master (§6.2)" onClose={onClose} width={720}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Category Code" value={f.code} disabled hint="Auto-generated, unique" />
        <TextField label="Category Name" required value={f.name} error={e.name} onChange={(x) => set('name', x.target.value)} />
        <TextField label="Business Model" required value={f.businessModel} error={e.businessModel} onChange={(x) => set('businessModel', x.target.value)} list="bm-models" placeholder="e.g. Owned & Operated" />
        <datalist id="bm-models">
          <option value="Owned & Operated" />
          <option value="Partner Operated" />
        </datalist>
        <PickField label="Applicable Payout" required value={f.applicablePayout ? 'Yes' : 'No'} onChange={(v) => set('applicablePayout', v !== 'No')} options={['Yes', 'No']} />
        <PickField label="Partner Share Rule" required value={f.partnerShareRule} error={e.partnerShareRule} onChange={(v) => set('partnerShareRule', v)} options={SHARE_RULES.includes(f.partnerShareRule) || !f.partnerShareRule ? SHARE_RULES : [f.partnerShareRule, ...SHARE_RULES]} />
        <TextField label="Effective Date" required type="date" value={f.effectiveFrom} error={e.effectiveFrom} onChange={(x) => set('effectiveFrom', x.target.value)} />
        <PickField label="Status" required value={f.status} onChange={(v) => set('status', (v || 'Active') as Form['status'])} options={['Active', 'Inactive']} />
        <TextAreaField className="sm:col-span-2" label="Description" value={f.description} onChange={(x) => set('description', x.target.value)} />
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-[11px] font-semibold text-ink">Expense Rules — applicable heads *</span>
          <div className="flex flex-wrap gap-4">
            {EXPENSE_HEADS.map((h) => (
              <Checkbox key={h} label={h} checked={f.expenseRules.includes(h)} onChange={(v) => set('expenseRules', v ? [...f.expenseRules, h] : f.expenseRules.filter((x) => x !== h))} />
            ))}
          </div>
          {e.expenseRules && <span className="mt-1 block text-[11px] text-brand-red">{e.expenseRules}</span>}
        </div>
      </div>
      <div className="mt-5">
        <FormActions onBack={onClose} onDraft={draft} onSubmit={submit} submitLabel={isNew ? 'Submit' : 'Save changes'} />
      </div>
    </Modal>
  )
}
