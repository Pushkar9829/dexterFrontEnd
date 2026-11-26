import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Power } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { CATEGORY_META, addCategoryItem, toggleCategoryItem, useCategories, useMasterLoad, type CategoryItem, type CategoryKey } from '@/data/network'
import { useHubRights } from './hooks'
import { clearDraft, getDraft, saveDraft } from './hubStore'
import { DataTable, FilterSelect, FormActions, PageShell, Panel, ReadOnlyNote, TableBar, Tabs, type Col } from './ui'

const KEYS = Object.keys(CATEGORY_META) as CategoryKey[]

export default function Categories() {
  const cats = useCategories()
  useMasterLoad(['categories'])
  const [tab, setTab] = useState<CategoryKey>('projectTypes')
  return (
    <PageShell title="Category Masters" sub="Classification masters used across Master Data (§8). Only Super Admin / Admin can add or activate / deactivate items.">
      <Tabs<CategoryKey> value={tab} onChange={setTab} tabs={KEYS.map((k) => ({ key: k, label: CATEGORY_META[k].title, count: cats[k].length }))} />
      <CategoryPanel key={tab} catKey={tab} items={cats[tab]} />
    </PageShell>
  )
}

function CategoryPanel({ catKey, items }: { catKey: CategoryKey; items: CategoryItem[] }) {
  const navigate = useNavigate()
  const { admin } = useHubRights()
  const meta = CATEGORY_META[catKey]
  const draftKey = `category-${catKey}`
  const isPlan = catKey === 'plans'
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [f, setF] = useState<Record<string, string>>(() => ({ code: '', name: '', description: '', category: '', ...getDraft(draftKey) }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }))

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return items.filter((i) => (status === 'all' || (status === 'active' ? i.active : !i.active)) && (!s || `${i.code} ${i.name} ${i.description ?? ''} ${i.category ?? ''}`.toLowerCase().includes(s)))
  }, [items, q, status])

  const submit = () => {
    const e: Record<string, string> = {}
    const code = f.code.trim().toUpperCase()
    if (!code) e.code = `${isPlan ? 'Plan ID' : 'Code'} is required`
    else if (!/^[A-Z0-9-]{2,12}$/.test(code)) e.code = 'Use 2–12 letters, numbers or hyphens'
    else if (items.some((i) => i.code.toUpperCase() === code)) e.code = 'This code already exists'
    if (!f.name.trim()) e.name = 'Name is required'
    else if (items.some((i) => i.name.toLowerCase() === f.name.trim().toLowerCase())) e.name = 'This name already exists'
    if (meta.withCategory && !f.category.trim()) e.category = 'Plan category is required'
    setErrors(e)
    if (Object.keys(e).length) return
    addCategoryItem(catKey, { code, name: f.name.trim(), description: f.description.trim() || undefined, category: meta.withCategory ? f.category.trim() : undefined })
    clearDraft(draftKey)
    setF({ code: '', name: '', description: '', category: '' })
    toast(`${meta.title} "${f.name.trim()}" added`)
  }

  const toggle = (i: CategoryItem) => {
    toggleCategoryItem(catKey, i.code)
    toast(`${i.name} ${i.active ? 'deactivated' : 'activated'}`)
  }

  const cols: Col<CategoryItem>[] = [
    { key: 'c', header: isPlan ? 'Plan ID' : 'Code', render: (i) => <span className="font-semibold text-slate-900">{i.code}</span> },
    { key: 'n', header: isPlan ? 'Plan name' : 'Name', render: (i) => i.name },
    ...(meta.withCategory ? [{ key: 'cat', header: 'Plan category', render: (i: CategoryItem) => i.category ?? '—' }] : []),
    { key: 'd', header: 'Description', render: (i) => i.description ?? '—' },
    { key: 's', header: 'Status', render: (i) => <Badge tone={i.active ? 'green' : 'gray'}>{i.active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'x', header: 'Action', render: (i) => (admin ? <Button size="sm" variant={i.active ? 'danger' : 'secondary'} icon={<Power size={13} />} onClick={() => toggle(i)}>{i.active ? 'Deactivate' : 'Activate'}</Button> : '—') },
  ]

  return (
    <div className="space-y-4">
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(i) => i.code}
        noun="items"
        toolbar={
          <TableBar search={q} onSearch={setQ} placeholder={`Search ${meta.title.toLowerCase()}…`} onDownload={() => downloadCsv(`category-${catKey}`, [isPlan ? 'Plan ID' : 'Code', 'Name', ...(meta.withCategory ? ['Category'] : []), 'Description', 'Status'], rows.map((i) => [i.code, i.name, ...(meta.withCategory ? [i.category ?? ''] : []), i.description ?? '', i.active ? 'Active' : 'Inactive']))}>
            <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          </TableBar>
        }
      />
      <Panel title={`Add ${meta.title}`} sub={meta.sub}>
        {!admin ? (
          <ReadOnlyNote text="Read-only: only Super Admin / Admin can add or change category items." />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <TextField label={isPlan ? 'Plan ID' : 'Code'} required value={f.code} onChange={(e) => set('code', e.target.value)} error={errors.code} placeholder={isPlan ? 'e.g. PL-04' : 'e.g. NEW'} />
              <TextField label={isPlan ? 'Plan name' : 'Name'} required value={f.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
              {meta.withCategory && <TextField label="Plan category" required value={f.category} onChange={(e) => set('category', e.target.value)} error={errors.category} placeholder="e.g. Standard / Premium" />}
              <TextField className={meta.withCategory ? '' : 'md:col-span-2'} label="Description" value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional" />
            </div>
            <div className="mt-5">
              <FormActions
                onDraft={() => {
                  saveDraft(draftKey, f)
                  toast('Draft saved')
                }}
                onSubmit={submit}
                onBack={() => navigate('/master-data')}
                submitLabel="Add item"
              />
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
