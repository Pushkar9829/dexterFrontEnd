import { useCallback, useMemo, useState } from 'react'
import { Check, Database, Download, Eye, FileText, Paperclip, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Field'
import { TextField } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { apiCreateExpenses, apiDecideExpenses, apiEnabled, apiPayExpense } from '@/data/payoutApi'
import { uploadFile } from '@/lib/api'
import { downloadCsv } from '@/lib/export'
import { currentRole } from '@/lib/rbac'
import { siteByAtm, type Site } from '@/data/network'
import {
  EXPENSE_HEADS, businessStore, fromPaise, inrP, logPayout, monthLabel, pid, sumP, useBusiness, useFinanceRules,
  type BmExpense, type ExpenseHead, type ExpenseStatus, nowIso,
} from '@/data/payout'
import {
  SEED_MAKER, actor, bmLocal, checkerBlock, clearDraft, effectiveStatus, fmtDate, fmtDateTime, fyOf, getDraft, parseRupees, rollupStatus, rupeesInput, saveDraft, today, useBmLocal,
  type ExpenseSubmission, type FileRef,
} from './bmStore'
import { ExpBadge, FilterSelect, InfoCell, Money, MultiFileDrop, Note, OpsPage, Panel, PickField } from './ui'

const MODES = ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'NEFT / RTGS']
type Row = { id: string; head: ExpenseHead; date: string; description: string; billNo: string; amount: number; mode: string; document?: string }
type Entry = { head: string; date: string; amount: string; mode: string; billNo: string; description: string }
type Draft = { month: string; rows: Row[]; bills: FileRef[]; declaration: boolean }
const EMPTY_ENTRY: Entry = { head: '', date: '', amount: '', mode: '', billNo: '', description: '' }
const addDays = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10)

export default function SiteExpenses() {
  const b = useBusiness()
  const rules = useFinanceRules()
  const local = useBmLocal()
  const [atmQuery, setAtmQuery] = useState('')
  const [site, setSite] = useState<Site | null>(null)
  const [siteErr, setSiteErr] = useState('')
  const [month, setMonth] = useState('')
  const [entry, setEntry] = useState<Entry>(EMPTY_ENTRY)
  const [entryErr, setEntryErr] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [bills, setBills] = useState<FileRef[]>([])
  const [uploadingBills, setUploadingBills] = useState(false)
  const [declaration, setDeclaration] = useState(false)
  const [formErr, setFormErr] = useState<Record<string, string>>({})
  const [histMonth, setHistMonth] = useState('all')
  const [view, setView] = useState<string | null>(null) // `${atm}|${month}`
  const closeView = useCallback(() => setView(null), [])

  const bmSite = site ? b.bmSites.find((s) => s.atmId === site.atmId) : undefined
  const category = bmSite ? b.bmCategories.find((c) => c.code === bmSite.category) : undefined
  const total = useMemo(() => sumP(rows.map((r) => r.amount)), [rows])

  const resetForm = () => {
    setMonth('')
    setRows([])
    setBills([])
    setDeclaration(false)
    setEntry(EMPTY_ENTRY)
    setEditing(null)
    setEntryErr({})
    setFormErr({})
  }

  const search = () => {
    const q = atmQuery.trim()
    if (!q) {
      setSiteErr('Enter an ATM ID')
      return
    }
    const s = siteByAtm(q)
    const mapped = b.bmSites.find((x) => x.atmId.toLowerCase() === q.toLowerCase())
    if (!s) {
      setSite(null)
      setSiteErr(`ATM ID ${q} was not found in Site Master`)
      return
    }
    if (s.siteType !== 'BM' && !mapped) {
      setSite(null)
      setSiteErr(`ATM ${s.atmId} is a ${s.siteType} site — Site Expenses here are only for Business Model sites.`)
      return
    }
    setSiteErr(mapped ? '' : `ATM ${s.atmId} is a BM site but has no BM Site Master mapping yet — expenses can be recorded, P&L needs the mapping.`)
    setSite(s)
    resetForm()
    const d = getDraft<Draft>(`expense-${s.atmId}`)
    if (d) {
      setMonth(d.month)
      setRows(d.rows)
      setBills(d.bills)
      setDeclaration(d.declaration)
      toast(`Draft for ${s.atmId} restored`, 'info')
    }
  }

  const addRow = () => {
    const e: Record<string, string> = {}
    const amount = parseRupees(entry.amount)
    if (!site) e.atm = 'Search an ATM first'
    if (!month) e.month = 'Expense month is required'
    if (!entry.date) e.date = 'Expense date is required'
    else if (month && !entry.date.startsWith(month)) e.date = `Date must fall in ${monthLabel(month)}`
    else if (entry.date > today()) e.date = 'Date cannot be in the future'
    if (!entry.head) e.head = 'Expense category is required'
    else if (category && !category.expenseRules.includes(entry.head)) e.head = `${entry.head} is not an applicable head for category ${category.code}`
    if (!Number.isFinite(amount) || amount <= 0) e.amount = 'Enter a valid amount (max 2 decimals)'
    if (!entry.mode) e.mode = 'Payment mode is required'
    if (entry.head === 'Rent' && site && month) {
      const dupRow = rows.some((r) => r.head === 'Rent' && r.id !== editing)
      const dupStore = b.expenses.some((x) => x.atmId === site.atmId && x.month === month && x.head === 'Rent' && x.status !== 'Rejected')
      if (dupRow || dupStore) e.head = `Rent for ${monthLabel(month)} is already recorded for this site (duplicate rent check)`
    }
    if (entry.billNo.trim() && rows.some((r) => r.id !== editing && r.billNo.trim().toLowerCase() === entry.billNo.trim().toLowerCase())) e.billNo = 'Bill / reference number already added'
    setEntryErr(e)
    if (Object.keys(e).length) return
    const row: Row = { id: editing ?? pid('ER'), head: entry.head as ExpenseHead, date: entry.date, description: entry.description.trim() || `${entry.head} – ${monthLabel(month)}`, billNo: entry.billNo.trim(), amount, mode: entry.mode, document: rows.find((r) => r.id === editing)?.document }
    setRows((rs) => (editing ? rs.map((r) => (r.id === editing ? row : r)) : [...rs, row]))
    setEditing(null)
    setEntry(EMPTY_ENTRY)
  }

  const editRow = (r: Row) => {
    setEditing(r.id)
    setEntry({ head: r.head, date: r.date, amount: rupeesInput(r.amount), mode: r.mode, billNo: r.billNo, description: r.description })
  }

  const draft = () => {
    if (!site) {
      toast('Search an ATM first', 'error')
      return
    }
    saveDraft(`expense-${site.atmId}`, { month, rows, bills, declaration } satisfies Draft)
    toast('Draft saved')
  }

  const submit = () => {
    const e: Record<string, string> = {}
    if (!site) e.site = 'Search a Business Model ATM first'
    if (!month) e.month = 'Expense month is required'
    if (!rows.length) e.rows = 'Add at least one expense'
    if (rows.some((r) => !r.date.startsWith(month))) e.rows = 'All expense dates must fall in the expense month'
    if (!bills.length && !rows.some((r) => r.document)) e.bills = 'Upload at least one bill / payment document'
    if (!declaration) e.declaration = 'Please accept the site expense declaration'
    setFormErr(e)
    if (Object.keys(e).length || !site) {
      toast('Please fix the highlighted items', 'error')
      return
    }
    const by = actor()
    const exps: BmExpense[] = rows.map((r) => ({
      id: pid('EXP'), fy: fyOf(month), month, atmId: site.atmId, head: r.head, amount: r.amount, paid: 0, billDate: r.date, dueDate: addDays(r.date, 15),
      paymentMode: r.mode, invoiceNo: r.billNo || undefined, document: r.document ?? bills[0]?.name, status: 'Recorded', remarks: r.description,
    }))
    businessStore.set((s) => ({ ...s, expenses: [...exps, ...s.expenses] }))
    const sub: ExpenseSubmission = { id: pid('ESUB'), atmId: site.atmId, month, expenseIds: exps.map((x) => x.id), total, count: exps.length, bills, submittedAt: nowIso(), submittedBy: by }
    bmLocal.set((l) => ({ ...l, submissions: [sub, ...l.submissions] }))
    logPayout({ by, area: 'BM Site Expenses', ref: `${site.atmId} ${month}`, action: 'Expenses submitted', after: `${exps.length} items · ${inrP(total)}` })
    clearDraft(`expense-${site.atmId}`)
    if (apiEnabled) {
      if (uploadingBills) {
        toast('Bills are still uploading — wait a moment.', 'error')
        return
      }
      setUploadingBills(true)
      void Promise.all(bills.filter((b) => b.file).map((b) => uploadFile(b.file!, { purpose: 'bm-expense-bill', entity: 'BmExpense', ref: site.atmId })))
        .then((ups) => apiCreateExpenses(exps, ups[0]?.fileId))
        .catch((err) => toast(`Bill upload failed: ${err instanceof Error ? err.message : String(err)}`, 'error'))
        .finally(() => setUploadingBills(false))
    }
    toast(`${exps.length} expense(s) for ${site.atmId} submitted — ${inrP(total)}`)
    resetForm()
  }

  // ── history ────────────────────────────────────────────────────────────
  const history = useMemo(() => {
    const groups = new Map<string, BmExpense[]>()
    b.expenses.forEach((e) => {
      if (site && e.atmId !== site.atmId) return
      const k = `${e.atmId}|${e.month}`
      groups.set(k, [...(groups.get(k) ?? []), e])
    })
    return [...groups.entries()]
      .map(([k, ex]) => {
        const [atmId, m] = k.split('|')
        const subs = local.submissions.filter((s) => s.atmId === atmId && s.month === m)
        const live = ex.filter((e) => e.status !== 'Rejected')
        return {
          key: k, atmId, month: m, total: sumP(live.map((e) => e.amount)), count: ex.length, status: rollupStatus(ex),
          submittedOn: subs[0]?.submittedAt ?? ex.map((e) => e.billDate).sort()[0], approvedOn: subs.find((s) => s.approvedAt)?.approvedAt,
          maker: subs[0]?.submittedBy ?? SEED_MAKER, pending: ex.filter((e) => e.status === 'Recorded').length,
        }
      })
      .filter((h) => histMonth === 'all' || h.month === histMonth)
      .sort((x, y) => y.month.localeCompare(x.month) || x.atmId.localeCompare(y.atmId))
  }, [b.expenses, local.submissions, site, histMonth])
  const histMonths = useMemo(() => [...new Set(b.expenses.map((e) => e.month))].sort().reverse(), [b.expenses])

  const exportHistory = () =>
    downloadCsv('bm_site_expense_history', ['ATM ID', 'Expense Month', 'Total (₹)', 'No. of Expenses', 'Status', 'Submitted On', 'Approved On'], history.map((h) => [h.atmId, h.month, String(fromPaise(h.total)), String(h.count), h.status, h.submittedOn ?? '', h.approvedOn ?? '']))

  const downloadGroup = (atmId: string, m: string) => {
    const ex = b.expenses.filter((e) => e.atmId === atmId && e.month === m)
    downloadCsv(`site_expenses_${atmId}_${m}`, ['Expense ID', 'Category', 'Date', 'Description', 'Bill / Ref', 'Amount (₹)', 'Paid (₹)', 'Payment Mode', 'Document', 'Status'], ex.map((e) => [e.id, e.head, e.billDate, e.remarks ?? '', e.invoiceNo ?? '', String(fromPaise(e.amount)), String(fromPaise(e.paid)), e.paymentMode ?? '', e.document ?? '', effectiveStatus(e)]))
  }

  return (
    <OpsPage title="Site Expenses – Business Model Sites" crumbs={['Site Expenses', 'Site Expenses – Business Model']} icon={Database} badge={<Badge tone="navy" dot={false}>Business Model</Badge>}>
      <Panel title="Site / ATM Details">
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_2fr]">
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink">ATM ID *</span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400" />
                <input value={atmQuery} onChange={(e) => setAtmQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="e.g. ATM008763" className={`h-9 w-full rounded-md border bg-white pr-8 pl-8 text-[12.5px] outline-none focus:border-primary ${siteErr && !site ? 'border-brand-red' : 'border-line'}`} />
                {atmQuery && (
                  <button type="button" aria-label="Clear" className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400" onClick={() => { setAtmQuery(''); setSite(null); setSiteErr(''); resetForm() }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <Button icon={<Search size={14} />} onClick={search}>Search</Button>
            </div>
            {siteErr && <span className={`mt-1 block text-[11px] ${site ? 'text-amber-700' : 'text-brand-red'}`}>{siteErr}</span>}
            {formErr.site && <span className="mt-1 block text-[11px] text-brand-red">{formErr.site}</span>}
          </div>
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-3 sm:grid-cols-4">
            <InfoCell label="Site ID" value={site?.siteId ?? '—'} />
            <InfoCell label="Site Name" value={site?.location ?? '—'} />
            <InfoCell label="State / City" value={site ? `${site.state} / ${site.district}` : '—'} />
            <InfoCell label="Business Vertical" value={site ? <Badge tone="navy">Business Model</Badge> : '—'} />
          </div>
        </div>
      </Panel>

      <Panel title="Expense Entry" icon={FileText} sub={category ? `Applicable heads for ${category.code} · ${category.name}: ${category.expenseRules.join(', ')}` : undefined}
        action={<Button variant="secondary" icon={<Plus size={14} />} onClick={addRow} disabled={!site}>{editing ? 'Update Expense' : 'Add Expense'}</Button>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          <TextField label="Expense Month" required type="month" value={month} error={entryErr.month ?? formErr.month} max={today().slice(0, 7)} onChange={(e) => setMonth(e.target.value)} disabled={!site} />
          <TextField label="Expense Date" required type="date" value={entry.date} error={entryErr.date} onChange={(e) => setEntry((x) => ({ ...x, date: e.target.value }))} disabled={!site} />
          <PickField label="Expense Category" required value={entry.head} error={entryErr.head} onChange={(v) => setEntry((x) => ({ ...x, head: v }))} options={[...EXPENSE_HEADS]} disabled={!site} />
          <TextField label="Amount (₹)" required inputMode="decimal" value={entry.amount} error={entryErr.amount} onChange={(e) => setEntry((x) => ({ ...x, amount: e.target.value }))} disabled={!site} />
          <PickField label="Payment Mode" required value={entry.mode} error={entryErr.mode} onChange={(v) => setEntry((x) => ({ ...x, mode: v }))} options={MODES} disabled={!site} />
          <TextField label="Bill / Reference No." value={entry.billNo} error={entryErr.billNo} onChange={(e) => setEntry((x) => ({ ...x, billNo: e.target.value }))} disabled={!site} />
          <TextField label="Purpose / Description" value={entry.description} onChange={(e) => setEntry((x) => ({ ...x, description: e.target.value }))} disabled={!site} />
        </div>
        {editing && <p className="mt-2 text-[11.5px] text-amber-700">Editing an expense row — press “Update Expense” to save, or <button type="button" className="underline" onClick={() => { setEditing(null); setEntry(EMPTY_ENTRY) }}>cancel edit</button>.</p>}

        <div className="scroll-thin mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[980px] text-left text-[12px]">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
              <tr>{['S.No.', 'Expense Category', 'Expense Date', 'Purpose / Description', 'Bill / Reference No.', 'Amount (₹)', 'Payment Mode', 'Documents', 'Action'].map((h) => <th key={h} className="px-3 py-2.5 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">No expenses added yet.</td></tr>}
              {rows.map((r, i) => (
                <tr key={r.id} className={editing === r.id ? 'bg-amber-50/60' : ''}>
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{r.head}</td>
                  <td className="px-3 py-2">{fmtDate(r.date)}</td>
                  <td className="px-3 py-2">{r.description}</td>
                  <td className="px-3 py-2">{r.billNo || '—'}</td>
                  <td className="px-3 py-2 text-right"><Money p={r.amount} /></td>
                  <td className="px-3 py-2">{r.mode}</td>
                  <td className="px-3 py-2">
                    {r.document ? (
                      <span className="inline-flex items-center gap-1 text-[#0066FF]"><Paperclip size={12} />{r.document}<button type="button" aria-label="Remove document" className="text-red-500" onClick={() => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, document: undefined } : x)))}>×</button></span>
                    ) : (
                      <label className="cursor-pointer text-[11px] font-semibold text-[#0066FF] underline">
                        Attach
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(ev) => {
                          const file = ev.target.files?.[0]
                          ev.target.value = ''
                          if (!file) return
                          if (file.size > 10 * 1024 * 1024) { toast(`${file.name} is larger than 10 MB`, 'error'); return }
                          if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) { toast(`${file.name}: only PDF / JPG / PNG`, 'error'); return }
                          setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, document: file.name } : x)))
                        }} />
                      </label>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" aria-label="Edit" className="text-[#0066FF]" onClick={() => editRow(r)}><Pencil size={15} /></button>
                      <button type="button" aria-label="Delete" className="text-red-500" onClick={() => { setRows((rs) => rs.filter((x) => x.id !== r.id)); if (editing === r.id) { setEditing(null); setEntry(EMPTY_ENTRY) } }}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {formErr.rows && <span className="mt-1 block text-[11px] text-brand-red">{formErr.rows}</span>}

        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-slate-900"><Paperclip size={14} className="text-[#0066FF]" />Upload Bills &amp; Payment Documents (Multiple)</span>
            <MultiFileDrop files={bills} onChange={setBills} onError={(m) => toast(m, 'error')} />
            {formErr.bills && <span className="mt-1 block text-[11px] text-brand-red">{formErr.bills}</span>}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 px-5 py-4">
            <span className="text-[14px] font-semibold text-slate-800">Total Expense Amount</span>
            <span className="text-[22px] font-bold text-slate-900">{inrP(total)}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Checkbox checked={declaration} onChange={setDeclaration} label={<span className="text-slate-800"><b>Site Expense Declaration</b> — I hereby declare that the above expenses are true and incurred for the ATM site as per bills and company policy.</span>} />
            {formErr.declaration && <span className="mt-1 block text-[11px] text-brand-red">{formErr.declaration}</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={draft}>Save Draft</Button>
            <Button onClick={submit}>Submit</Button>
            <Button variant="secondary" onClick={() => { resetForm(); toast('Entry cleared', 'info') }}>Cancel</Button>
          </div>
        </div>
      </Panel>

      <Panel title="Site Expense History" icon={FileText} sub={site ? `ATM ${site.atmId}` : 'All Business Model sites — search an ATM to narrow'}
        action={
          <div className="flex items-end gap-2">
            <FilterSelect label="Expense Month" value={histMonth} onChange={setHistMonth} options={histMonths.map((m) => ({ value: m, label: monthLabel(m) }))} all="All Months" />
            <Button variant="secondary" icon={<Download size={14} />} onClick={exportHistory}>Export</Button>
          </div>
        }>
        <Note tone={rules.expenseApprovalLimit === null ? 'amber' : 'slate'}>
          {rules.expenseApprovalLimit === null
            ? 'Expense approval limit (§21-13) is pending Finance — any authorised approver (not the submitter) can approve.'
            : `Monthly totals above ${inrP(rules.expenseApprovalLimit, 0)} need Super Admin / Admin approval.`}
        </Note>
        <div className="scroll-thin mt-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[900px] text-left text-[12px]">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
              <tr>{['S.No.', ...(site ? [] : ['ATM ID']), 'Expense Month', 'Total Amount (₹)', 'No. of Expenses', 'Status', 'Submitted On', 'Approved On', 'Action'].map((h) => <th key={h} className="px-3 py-2.5 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">No expense history.</td></tr>}
              {history.slice(0, site ? 100 : 30).map((h, i) => (
                <tr key={h.key}>
                  <td className="px-3 py-2">{i + 1}</td>
                  {!site && <td className="px-3 py-2 font-medium">{h.atmId}</td>}
                  <td className="px-3 py-2">{monthLabel(h.month)}</td>
                  <td className="px-3 py-2 text-right font-semibold"><Money p={h.total} /></td>
                  <td className="px-3 py-2 text-center">{h.count}</td>
                  <td className="px-3 py-2"><ExpBadge status={h.status} />{h.pending > 0 && h.status !== 'Recorded' && <span className="ml-1 text-[10.5px] text-blue-600">{h.pending} awaiting approval</span>}</td>
                  <td className="px-3 py-2">{h.submittedOn ? (h.submittedOn.length > 10 ? fmtDateTime(h.submittedOn) : fmtDate(h.submittedOn)) : '—'}</td>
                  <td className="px-3 py-2">{h.approvedOn ? fmtDateTime(h.approvedOn) : '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" aria-label="View" className="text-[#0066FF]" onClick={() => setView(h.key)}><Eye size={16} /></button>
                      <button type="button" aria-label="Download" className="text-[#0066FF]" onClick={() => downloadGroup(h.atmId, h.month)}><Download size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!site && history.length > 30 && <p className="mt-2 text-[11.5px] text-slate-500">Showing latest 30 of {history.length}. Use Export for the full list or search an ATM.</p>}
      </Panel>

      {view && <ExpenseGroupModal groupKey={view} onClose={closeView} limit={rules.expenseApprovalLimit} />}
    </OpsPage>
  )
}

function ExpenseGroupModal({ groupKey, onClose, limit }: { groupKey: string; onClose: () => void; limit: number | null }) {
  const b = useBusiness()
  const local = useBmLocal()
  const [atmId, month] = groupKey.split('|')
  const ex = useMemo(() => b.expenses.filter((e) => e.atmId === atmId && e.month === month), [b.expenses, atmId, month])
  const subs = local.submissions.filter((s) => s.atmId === atmId && s.month === month)
  const maker = subs[0]?.submittedBy ?? SEED_MAKER
  const recorded = ex.filter((e) => e.status === 'Recorded')
  const recordedTotal = sumP(recorded.map((e) => e.amount))
  const role = currentRole()
  const overLimit = limit !== null && recordedTotal > limit && role !== 'Super Admin' && role !== 'Admin'
  const block = checkerBlock(maker) ?? (overLimit ? `Total ${inrP(recordedTotal, 0)} exceeds the approval limit ${inrP(limit ?? 0, 0)} — Super Admin / Admin approval required.` : null)
  const [pay, setPay] = useState<Record<string, string>>({})
  const [payDate, setPayDate] = useState(today())

  const decide = (to: 'Approved' | 'Rejected') => {
    if (block) {
      toast(block, 'error')
      return
    }
    const ids = new Set(recorded.map((e) => e.id))
    const by = actor()
    const at = nowIso()
    businessStore.set((s) => ({ ...s, expenses: s.expenses.map((e) => (ids.has(e.id) ? { ...e, status: to } : e)) }))
    bmLocal.set((l) => ({
      ...l,
      submissions: l.submissions.map((s) => (s.atmId === atmId && s.month === month ? (to === 'Approved' ? { ...s, approvedAt: at, approvedBy: by } : { ...s, rejectedAt: at, rejectedBy: by }) : s)),
    }))
    logPayout({ by, area: 'BM Site Expenses', ref: `${atmId} ${month}`, action: `Expenses ${to.toLowerCase()}`, after: `${ids.size} items · ${inrP(recordedTotal)}` })
    if (apiEnabled) void apiDecideExpenses([...ids], to)
    toast(`${ids.size} expense(s) ${to.toLowerCase()}`)
  }

  const recordPayment = (e: BmExpense) => {
    const amt = parseRupees(pay[e.id] ?? '')
    const due = e.amount - e.paid
    if (!Number.isFinite(amt) || amt <= 0 || amt > due) {
      toast(`Enter a payment between ₹0.01 and ${inrP(due)}`, 'error')
      return
    }
    if (!payDate) {
      toast('Payment date is required', 'error')
      return
    }
    const paid = e.paid + amt
    const status: ExpenseStatus = paid >= e.amount ? 'Paid' : 'Partially Paid'
    businessStore.set((s) => ({ ...s, expenses: s.expenses.map((x) => (x.id === e.id ? { ...x, paid, status, paymentDate: payDate } : x)) }))
    logPayout({ by: actor(), area: 'BM Site Expenses', ref: e.id, action: 'Payment recorded', before: inrP(e.paid), after: inrP(paid) })
    if (apiEnabled) void apiPayExpense(e.id, amt, payDate, e.paymentMode ?? 'Bank Transfer')
    setPay((p) => ({ ...p, [e.id]: '' }))
    toast(`${e.head}: ${status}`)
  }
  const markDue = (e: BmExpense) => {
    if (apiEnabled) {
      toast('The server derives Due / Overdue from the due date — there is no manual "Mark Due" endpoint.', 'info')
      return
    }
    businessStore.set((s) => ({ ...s, expenses: s.expenses.map((x) => (x.id === e.id ? { ...x, status: 'Due' } : x)) }))
    toast(`${e.head} marked Due`)
  }

  return (
    <Modal title={`Expenses · ${atmId} · ${monthLabel(month)}`} sub={`Submitted by ${maker}${subs[0] ? ` on ${fmtDateTime(subs[0].submittedAt)}` : ''}`} onClose={onClose} width={1000}>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-[12px]">
          <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase">
            <tr>{['Category', 'Date', 'Description', 'Bill / Ref', 'Mode', 'Doc', 'Amount', 'Paid', 'Status', 'Payment'].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ex.map((e) => {
              const st = effectiveStatus(e)
              const payable = ['Approved', 'Due', 'Partially Paid', 'Overdue'].includes(st)
              return (
                <tr key={e.id}>
                  <td className="px-2 py-2 font-medium">{e.head}</td>
                  <td className="px-2 py-2">{fmtDate(e.billDate)}</td>
                  <td className="px-2 py-2">{e.remarks ?? '—'}</td>
                  <td className="px-2 py-2">{e.invoiceNo ?? '—'}</td>
                  <td className="px-2 py-2">{e.paymentMode ?? '—'}</td>
                  <td className="px-2 py-2">{e.document ? <span className="text-[#0066FF]">{e.document}</span> : '—'}</td>
                  <td className="px-2 py-2 text-right"><Money p={e.amount} /></td>
                  <td className="px-2 py-2 text-right"><Money p={e.paid} /></td>
                  <td className="px-2 py-2"><ExpBadge status={st} /></td>
                  <td className="px-2 py-2">
                    {payable ? (
                      <div className="flex items-center gap-1">
                        <input value={pay[e.id] ?? ''} onChange={(ev) => setPay((p) => ({ ...p, [e.id]: ev.target.value }))} placeholder={rupeesInput(e.amount - e.paid)} className="h-7 w-24 rounded border border-line px-1.5 text-[11.5px]" inputMode="decimal" aria-label="Payment amount" />
                        <button type="button" className="rounded bg-[#0066FF] px-2 py-1 text-[11px] font-semibold text-white" onClick={() => recordPayment(e)}>Pay</button>
                        {st === 'Approved' && <button type="button" className="text-[11px] text-amber-700 underline" onClick={() => markDue(e)}>Due</button>}
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {subs.some((s) => s.bills.length) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {subs.flatMap((s) => s.bills).map((f, i) => <Badge key={f.name + i} tone="blue" dot={false}><Paperclip size={11} /> {f.name}</Badge>)}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-3">
        <TextField label="Payment date" type="date" value={payDate} max={today()} onChange={(e) => setPayDate(e.target.value)} />
        {recorded.length > 0 ? (
          <div className="flex flex-col items-end gap-2">
            {block && <span className="max-w-[460px] text-right text-[11.5px] text-amber-700">{block}</span>}
            <div className="flex gap-2">
              <Button variant="danger" icon={<X size={14} />} disabled={!!block} onClick={() => decide('Rejected')}>Reject {recorded.length}</Button>
              <Button icon={<Check size={14} />} disabled={!!block} onClick={() => decide('Approved')}>Approve {recorded.length} · {inrP(recordedTotal, 0)}</Button>
            </div>
          </div>
        ) : (
          <span className="text-[12px] text-slate-500">No expenses awaiting approval.</span>
        )}
      </div>
    </Modal>
  )
}
