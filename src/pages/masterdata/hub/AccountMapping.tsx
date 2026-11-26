import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Pencil, XCircle } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { maskAccount } from '@/lib/mask'
import { nowIso, useCategories, useSites, updateSite, type AccountMapping as Account, type Site } from '@/data/network'
import { useFrMap, useHubRights } from './hooks'
import { actor, clearDraft, fmtDate, getDraft, saveDraft, todayIso } from './hubStore'
import { DataTable, FilterSelect, FormActions, PageShell, Panel, PickField, ReadOnlyNote, SiteFetchBox, StatStrip, TableBar, Tabs, type Col } from './ui'

type Tab = 'register' | 'map' | 'history'
const DRAFT = 'account-mapping'
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/

export default function AccountMapping() {
  const { sites } = useSites()
  const frMap = useFrMap()
  const frName = useCallback((id: string) => frMap.get(id)?.name ?? id, [frMap])
  const [tab, setTab] = useState<Tab>('register')
  const [prefill, setPrefill] = useState<string | null>(null)
  const history = useMemo(() => sites.flatMap((s) => s.accountHistory.map((h, i) => ({ ...h, siteId: s.siteId, atmId: s.atmId, frId: s.frId, key: `${s.siteId}-${i}` }))), [sites])
  const pending = useMemo(() => sites.filter((s) => s.account?.approval === 'Pending').length, [sites])

  return (
    <PageShell title="Account Mapping" sub="Settlement account (WLA / Axis Indent / ICICI) and payout mapping for every site (§8.4, §17). An account change never deletes the old record — it moves to history.">
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'register', label: 'Account Register', count: pending },
          { key: 'map', label: 'Map / Change Account' },
          { key: 'history', label: 'Account History', count: history.length },
        ]}
      />
      {tab === 'register' && (
        <Register
          sites={sites}
          frName={frName}
          onChange={(atm) => {
            setPrefill(atm)
            setTab('map')
          }}
        />
      )}
      {tab === 'map' && <MapForm key={prefill ?? 'blank'} initialAtm={prefill} sites={sites} frName={frName} />}
      {tab === 'history' && <History rows={history} frName={frName} />}
    </PageShell>
  )
}

function Register({ sites, frName, onChange }: { sites: Site[]; frName: (id: string) => string; onChange: (atm: string) => void }) {
  const rights = useHubRights()
  const cats = useCategories()
  const typeName = useCallback((code?: string) => cats.settlementTypes.find((t) => t.code === code)?.name ?? code ?? '—', [cats])
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [approval, setApproval] = useState('Pending')
  const [settle, setSettle] = useState('all')
  const [reject, setReject] = useState<Site | null>(null)
  const acc = (v?: string) => (rights.seeAccounts ? v ?? '—' : maskAccount(v))

  const counts = useMemo(() => ({ approved: sites.filter((s) => s.account?.approval === 'Approved').length, pending: sites.filter((s) => s.account?.approval === 'Pending').length, rejected: sites.filter((s) => s.account?.approval === 'Rejected').length, none: sites.filter((s) => !s.account).length }), [sites])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return sites.filter(
      (x) =>
        (type === 'all' || x.account?.type === type) &&
        (approval === 'all' || (approval === 'none' ? !x.account : x.account?.approval === approval)) &&
        (settle === 'all' || x.account?.settlement === settle) &&
        (!s || `${x.siteId} ${x.atmId} ${frName(x.frId)} ${x.account?.bank ?? ''} ${x.account?.holder ?? ''} ${x.account?.ifsc ?? ''}`.toLowerCase().includes(s)),
    )
  }, [sites, q, type, approval, settle, frName])

  const approve = (x: Site) => {
    if (!x.account) return
    updateSite(
      x.siteId,
      (s) => ({ account: s.account ? { ...s.account, approval: 'Approved', settlement: 'Active' } : s.account, steps: { ...s.steps, accountMapping: { ...s.steps.accountMapping, status: 'Completed', assignedTo: actor(), updatedAt: nowIso() } } }),
      { action: 'Account mapping approved', before: 'Pending', after: `Approved · ${x.account.bank} ${maskAccount(x.account.accountNo)}` },
    )
    toast(`Account mapping for ${x.siteId} approved`)
  }

  const cols: Col<Site>[] = [
    { key: 's', header: 'Site ID', render: (x) => <Link to={`/master-data/sites/${x.siteId}`} className="font-semibold text-[#0066FF] hover:underline">{x.siteId}</Link> },
    { key: 'f', header: 'Franchise', render: (x) => frName(x.frId) },
    { key: 't', header: 'Account type', render: (x) => typeName(x.account?.type) },
    { key: 'b', header: 'Bank', render: (x) => x.account?.bank ?? '—' },
    { key: 'h', header: 'Account holder', render: (x) => x.account?.holder ?? '—' },
    { key: 'n', header: 'Account no.', render: (x) => <span className="font-mono">{acc(x.account?.accountNo)}</span> },
    { key: 'i', header: 'IFSC', render: (x) => x.account?.ifsc ?? '—' },
    { key: 'br', header: 'Branch', render: (x) => x.account?.branch ?? '—' },
    { key: 'd', header: 'Mapping date', render: (x) => fmtDate(x.account?.mappedOn) },
    { key: 'ap', header: 'Approval', render: (x) => <Badge tone={x.account ? toneFor(x.account.approval) : 'gray'}>{x.account?.approval ?? 'Not mapped'}</Badge> },
    { key: 'se', header: 'Settlement', render: (x) => (x.account ? <Badge tone={x.account.settlement === 'Stopped' ? 'red' : toneFor(x.account.settlement)}>{x.account.settlement}</Badge> : '—') },
    { key: 'p', header: 'Payout', render: (x) => <Badge tone={x.payout?.status === 'Mapped' ? 'green' : 'amber'}>{x.payout?.status ?? 'Pending'}</Badge> },
    {
      key: 'x',
      header: 'Action',
      render: (x) => (
        <div className="flex flex-wrap gap-1.5">
          {x.account?.approval === 'Pending' && rights.finance && (
            <>
              <Button size="sm" icon={<CheckCircle2 size={13} />} onClick={() => approve(x)}>Approve</Button>
              <Button size="sm" variant="danger" icon={<XCircle size={13} />} onClick={() => setReject(x)}>Reject</Button>
            </>
          )}
          {rights.finance && <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => onChange(x.atmId)}>{x.account ? 'Change' : 'Map'}</Button>}
          {!rights.finance && '—'}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <StatStrip
        items={[
          { label: 'Approved', value: counts.approved, tone: 'green' },
          { label: 'Approval pending', value: counts.pending, tone: 'amber' },
          { label: 'Rejected', value: counts.rejected, tone: 'red' },
          { label: 'Not mapped', value: counts.none },
        ]}
      />
      {!rights.finance && <ReadOnlyNote text="Read-only: account numbers are masked and only Finance / Admin can approve, reject or change account mapping." />}
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(x) => x.siteId}
        noun="sites"
        toolbar={
          <TableBar search={q} onSearch={setQ} placeholder="Site, ATM, franchise, bank, IFSC…" onDownload={() => downloadCsv('account-mapping-register', ['Site ID', 'ATM ID', 'Franchise', 'Account type', 'Bank', 'Holder', 'Account no', 'IFSC', 'Branch', 'Mapping date', 'Approval', 'Settlement', 'Payout'], rows.map((x) => [x.siteId, x.atmId, frName(x.frId), typeName(x.account?.type), x.account?.bank ?? '', x.account?.holder ?? '', rights.seeAccounts ? x.account?.accountNo ?? '' : maskAccount(x.account?.accountNo), x.account?.ifsc ?? '', x.account?.branch ?? '', x.account?.mappedOn ?? '', x.account?.approval ?? 'Not mapped', x.account?.settlement ?? '', x.payout?.status ?? '']))}>
            <FilterSelect label="Account type" value={type} onChange={setType} options={cats.settlementTypes.map((t) => ({ value: t.code, label: t.name }))} />
            <FilterSelect label="Approval" value={approval} onChange={setApproval} options={[{ value: 'Pending', label: 'Pending' }, { value: 'Approved', label: 'Approved' }, { value: 'Rejected', label: 'Rejected' }, { value: 'none', label: 'Not mapped' }]} />
            <FilterSelect label="Settlement" value={settle} onChange={setSettle} options={['Active', 'Pending', 'Stopped']} />
          </TableBar>
        }
      />
      {reject && <RejectModal key={reject.siteId} site={reject} onClose={() => setReject(null)} />}
    </div>
  )
}

function RejectModal({ site, onClose }: { site: Site; onClose: () => void }) {
  const [remark, setRemark] = useState('')
  const [err, setErr] = useState('')
  const save = () => {
    if (!remark.trim()) {
      setErr('Give the reason for rejection')
      return
    }
    updateSite(
      site.siteId,
      (s) => ({ account: s.account ? { ...s.account, approval: 'Rejected', settlement: 'Pending' } : s.account, steps: { ...s.steps, accountMapping: { ...s.steps.accountMapping, status: 'Pending', remark: remark.trim(), updatedAt: nowIso() } } }),
      { action: 'Account mapping rejected', before: 'Pending', after: `Rejected — ${remark.trim()}` },
    )
    onClose()
    toast(`Account mapping for ${site.siteId} rejected`)
  }
  return (
    <Modal
      title="Reject account mapping"
      sub={`${site.siteId} · ${site.account?.bank ?? ''} ${maskAccount(site.account?.accountNo)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Back</Button>
          <Button variant="danger" onClick={save}>Reject</Button>
        </>
      }
    >
      <TextAreaField label="Reason" required value={remark} onChange={(e) => { setRemark(e.target.value); setErr('') }} error={err} />
    </Modal>
  )
}

const BLANK = { atm: '', type: '', bank: '', holder: '', accountNo: '', confirmNo: '', ifsc: '', branch: '', date: '' }
function MapForm({ initialAtm, sites, frName }: { initialAtm: string | null; sites: Site[]; frName: (id: string) => string }) {
  const navigate = useNavigate()
  const rights = useHubRights()
  const cats = useCategories()
  const [f, setF] = useState<Record<string, string>>(() => {
    const base = { ...BLANK, date: todayIso() }
    return initialAtm ? { ...base, atm: initialAtm } : { ...base, ...getDraft(DRAFT) }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }))
  const site = useMemo(() => {
    const a = f.atm.trim().toLowerCase()
    return a ? sites.find((s) => s.atmId.toLowerCase() === a) : undefined
  }, [f.atm, sites])

  const submit = () => {
    const e: Record<string, string> = {}
    const ifsc = f.ifsc.trim().toUpperCase()
    const no = f.accountNo.replace(/\s/g, '')
    if (!f.atm.trim()) e.atm = 'ATM ID is required'
    else if (!site) e.atm = 'No site found for this ATM ID'
    if (!f.type) e.type = 'Select the account / settlement type'
    if (!f.bank.trim()) e.bank = 'Bank name is required'
    if (!f.holder.trim()) e.holder = 'Account holder is required'
    if (!/^\d{9,18}$/.test(no)) e.accountNo = 'Account number must be 9–18 digits'
    if (f.confirmNo.replace(/\s/g, '') !== no) e.confirmNo = 'Account numbers do not match'
    if (!IFSC.test(ifsc)) e.ifsc = 'Enter a valid IFSC (e.g. HDFC0001234)'
    if (!f.branch.trim()) e.branch = 'Branch is required'
    if (!f.date) e.date = 'Mapping date is required'
    else if (f.date > todayIso()) e.date = 'Mapping date cannot be in the future'
    if (site?.account && site.account.accountNo === no && site.account.ifsc === ifsc) e.accountNo = 'This account is already the current mapping'
    setErrors(e)
    if (Object.keys(e).length || !site) return
    const next: Account = { type: f.type, bank: f.bank.trim(), holder: f.holder.trim(), accountNo: no, ifsc, branch: f.branch.trim(), mappedOn: f.date, approval: 'Pending', settlement: 'Pending' }
    const old = site.account
    const by = actor()
    updateSite(
      site.siteId,
      (s) => ({
        account: next,
        accountHistory: s.account ? [{ ...s.account, replacedOn: f.date, replacedBy: by }, ...s.accountHistory] : s.accountHistory,
        steps: { ...s.steps, accountMapping: { ...s.steps.accountMapping, status: 'Email Submitted', updatedAt: nowIso() } },
      }),
      { action: old ? 'Account changed' : 'Account mapped', before: old ? `${old.bank} ${maskAccount(old.accountNo)}` : '—', after: `${next.bank} ${maskAccount(next.accountNo)} (approval pending)` },
    )
    clearDraft(DRAFT)
    setF({ ...BLANK, date: todayIso() })
    toast(old ? `New account mapped to ${site.siteId}; old account kept in history. Awaiting Finance approval.` : `Account mapped to ${site.siteId}. Awaiting Finance approval.`)
  }

  return (
    <Panel title="Map / change settlement account by ATM ID" sub="The new account becomes the current mapping with approval Pending; the old one moves to Account History.">
      {!rights.finance && <div className="mb-4"><ReadOnlyNote text="Only Finance / Admin can map or change accounts." /></div>}
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="ATM ID" required value={f.atm} onChange={(e) => set('atm', e.target.value)} placeholder="e.g. DXMH70007" error={errors.atm} disabled={!rights.finance} />
        <PickField label="Account / settlement type" required value={f.type} onChange={(v) => setF((x) => ({ ...x, type: v, bank: v === 'AXIS' ? 'Axis Bank' : v === 'ICICI' ? 'ICICI Bank' : x.bank }))} options={cats.settlementTypes.filter((t) => t.active).map((t) => ({ value: t.code, label: t.name }))} error={errors.type} disabled={!rights.finance} />
        <TextField label="Bank" required value={f.bank} onChange={(e) => set('bank', e.target.value)} error={errors.bank} disabled={!rights.finance} />
        <TextField label="Account holder" required value={f.holder} onChange={(e) => set('holder', e.target.value)} error={errors.holder} disabled={!rights.finance} />
        <TextField label="Account number" required inputMode="numeric" autoComplete="off" value={f.accountNo} onChange={(e) => set('accountNo', e.target.value)} error={errors.accountNo} disabled={!rights.finance} />
        <TextField label="Confirm account number" required inputMode="numeric" autoComplete="off" value={f.confirmNo} onChange={(e) => set('confirmNo', e.target.value)} error={errors.confirmNo} disabled={!rights.finance} />
        <TextField label="IFSC" required value={f.ifsc} onChange={(e) => set('ifsc', e.target.value.toUpperCase())} error={errors.ifsc} disabled={!rights.finance} />
        <TextField label="Branch" required value={f.branch} onChange={(e) => set('branch', e.target.value)} error={errors.branch} disabled={!rights.finance} />
        <TextField label="Mapping date" type="date" required max={todayIso()} value={f.date} onChange={(e) => set('date', e.target.value)} error={errors.date} disabled={!rights.finance} />
      </div>
      {site && (
        <div className="mt-4">
          <SiteFetchBox
            site={site}
            frName={frName(site.frId)}
            extra={
              <div className="sm:col-span-3">
                <span className="text-slate-500">Current account</span>
                <div className="font-semibold text-slate-900">{site.account ? `${site.account.bank} · ${rights.seeAccounts ? site.account.accountNo : maskAccount(site.account.accountNo)} · ${site.account.approval} — will move to history` : 'None mapped'}</div>
              </div>
            }
          />
        </div>
      )}
      <div className="mt-5">
        <FormActions
          onDraft={() => {
            // Account numbers are never stored in drafts.
            saveDraft(DRAFT, { ...f, accountNo: '', confirmNo: '' })
            toast('Draft saved (account number is not saved in drafts)')
          }}
          onSubmit={submit}
          onBack={() => navigate('/master-data')}
          submitLabel="Submit for approval"
          disabled={!rights.finance}
        />
      </div>
    </Panel>
  )
}

type HRow = Account & { replacedOn: string; replacedBy: string; siteId: string; atmId: string; frId: string; key: string }
function History({ rows: all, frName }: { rows: HRow[]; frName: (id: string) => string }) {
  const rights = useHubRights()
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const cats = useCategories()
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter((r) => (type === 'all' || r.type === type) && (!s || `${r.siteId} ${r.atmId} ${r.bank} ${r.holder}`.toLowerCase().includes(s))).sort((a, b) => b.replacedOn.localeCompare(a.replacedOn))
  }, [all, q, type])
  const acc = (v: string) => (rights.seeAccounts ? v : maskAccount(v))
  const cols: Col<HRow>[] = [
    { key: 's', header: 'Site ID', render: (r) => r.siteId },
    { key: 'f', header: 'Franchise', render: (r) => frName(r.frId) },
    { key: 't', header: 'Type', render: (r) => cats.settlementTypes.find((c) => c.code === r.type)?.name ?? r.type },
    { key: 'b', header: 'Bank', render: (r) => r.bank },
    { key: 'n', header: 'Account no.', render: (r) => <span className="font-mono">{acc(r.accountNo)}</span> },
    { key: 'i', header: 'IFSC', render: (r) => r.ifsc },
    { key: 'm', header: 'Mapped on', render: (r) => fmtDate(r.mappedOn) },
    { key: 'a', header: 'Approval (then)', render: (r) => r.approval },
    { key: 'r', header: 'Replaced on', render: (r) => fmtDate(r.replacedOn) },
    { key: 'rb', header: 'Replaced by', render: (r) => r.replacedBy },
  ]
  return (
    <DataTable
      rows={rows}
      cols={cols}
      rowKey={(r) => r.key}
      noun="history records"
      empty="No account has been changed yet."
      toolbar={
        <TableBar search={q} onSearch={setQ} placeholder="Site, ATM, bank, holder…" onDownload={() => downloadCsv('account-change-history', ['Site ID', 'ATM ID', 'Franchise', 'Type', 'Bank', 'Holder', 'Account no', 'IFSC', 'Mapped on', 'Approval', 'Replaced on', 'Replaced by'], rows.map((r) => [r.siteId, r.atmId, frName(r.frId), r.type, r.bank, r.holder, acc(r.accountNo), r.ifsc, r.mappedOn, r.approval, r.replacedOn, r.replacedBy]))}>
          <FilterSelect label="Type" value={type} onChange={setType} options={cats.settlementTypes.map((t) => ({ value: t.code, label: t.name }))} />
        </TableBar>
      }
    />
  )
}
