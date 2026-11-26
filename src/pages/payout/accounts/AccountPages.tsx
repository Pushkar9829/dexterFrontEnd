// Account Mapping tab (Payout Management tab 02): Payout Data · Beneficiary Accounts · Approvals.
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ShieldCheck, ShieldAlert } from 'lucide-react'
import { PayoutPage } from '@/pages/payout/PayoutShell'
import PayoutList from '@/pages/finance/PayoutList'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Checkbox } from '@/components/ui/Field'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { maskAccount } from '@/lib/mask'
import { can, useRole } from '@/lib/rbac'
import { BANKS, useBeneficiaryAccounts, type BeneficiaryAccount } from '@/data/payout'
import { ACCOUNT_STATUSES, BENEFICIARY_TYPES, accountInForce, accountKey, approveAccount, kycOf, me, paymentEligible, rejectAccount } from './model'
import { EmptyRow, FilterSelect, Notice, SubTabs, TableCard, btnDanger, btnOutline, btnPrimary, linkBtn, td, th } from './ui'

const CRUMB = ['Account Mapping']

export function AccountTabs() {
  const accounts = useBeneficiaryAccounts()
  const pending = accounts.filter((a) => a.status === 'Pending').length
  return (
    <SubTabs
      tabs={[
        { label: 'Payout Data', to: '/finance/payouts/accounts', end: true },
        { label: 'Beneficiary Accounts', to: '/finance/payouts/accounts/beneficiaries' },
        { label: 'Approvals', to: '/finance/payouts/accounts/approvals', count: pending },
      ]}
    />
  )
}

export function EligibleBadge({ a }: { a: BeneficiaryAccount }) {
  return paymentEligible(a) ? (
    <Badge tone="green">Payment-eligible</Badge>
  ) : (
    <Badge tone="gray">{a.status !== 'Active' ? 'Not active' : 'KYC pending'}</Badge>
  )
}

/** (a) The existing Finance › Payout Data page, moved here complete and unchanged (design "Payout 2"). */
export function PayoutDataTab() {
  return (
    <PayoutPage title="Account Mapping" sub="Payout data, beneficiary bank accounts and account-change approvals (spec §8)." crumbs={[...CRUMB, 'Payout Data']}>
      <AccountTabs />
      {/* The original page carries its own breadcrumb; hide only that row — everything else is the same page. */}
      <div className="[&>div>div:first-child]:hidden">
        <PayoutList />
      </div>
    </PayoutPage>
  )
}

// ── (b) Beneficiary accounts ─────────────────────────────────────────────
const csvRow = (a: BeneficiaryAccount) => [a.id, a.beneficiaryType, a.beneficiaryId, a.name, a.vertical, a.atmId ?? '', a.bank, a.holder, maskAccount(a.accountNo), a.ifsc, a.accountType, a.effectiveFrom, a.status, a.kycVerified ? 'Yes' : 'No', paymentEligible(a) ? 'Yes' : 'No', a.maker, a.checker ?? '']
const CSV_HEAD = ['Account ID', 'Beneficiary Type', 'Beneficiary ID', 'Beneficiary', 'Vertical', 'ATM ID', 'Bank', 'Holder', 'Account No. (masked)', 'IFSC', 'Account Type', 'Effective From', 'Status', 'KYC Verified', 'Payment Eligible', 'Maker', 'Checker']

export function BeneficiaryList() {
  const navigate = useNavigate()
  const role = useRole()
  const accounts = useBeneficiaryAccounts()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [fType, setFType] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fBank, setFBank] = useState('')
  const [fElig, setFElig] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return accounts.filter(
      (a) =>
        (!s || [a.id, a.name, a.beneficiaryId, a.atmId ?? '', a.bank, a.ifsc, a.holder].some((v) => v.toLowerCase().includes(s)) || a.accountNo.endsWith(s)) &&
        (!fType || a.beneficiaryType === fType) &&
        (!fStatus || a.status === fStatus) &&
        (!fBank || a.bank === fBank) &&
        (!fElig || (fElig === 'Payment-eligible') === paymentEligible(a)),
    )
  }, [accounts, q, fType, fStatus, fBank, fElig])
  const paged = rows.slice((page - 1) * size, page * size)
  const kpi = {
    active: accounts.filter((a) => a.status === 'Active').length,
    eligible: accounts.filter(paymentEligible).length,
    pending: accounts.filter((a) => a.status === 'Pending').length,
    superseded: accounts.filter((a) => a.status === 'Superseded').length,
  }

  return (
    <PayoutPage
      title="Account Mapping"
      sub="Beneficiary bank accounts — changes need checker approval; old details are retained, never deleted (§8.1)."
      crumbs={[...CRUMB, 'Beneficiary Accounts']}
      actions={
        can('Create', role) && (
          <button type="button" className={btnPrimary} onClick={() => navigate('/finance/payouts/accounts/new')}>
            <Plus size={15} /> New Beneficiary Account
          </button>
        )
      }
    >
      <AccountTabs />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Active accounts', kpi.active],
          ['Payment-eligible (Active + KYC)', kpi.eligible],
          ['Pending approval', kpi.pending],
          ['Superseded (history kept)', kpi.superseded],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[12px] text-slate-500">{l}</div>
            <div className="mt-1.5 text-[26px] font-semibold text-slate-900">{v}</div>
          </div>
        ))}
      </div>

      <EffectiveLookup accounts={accounts} />

      <TableCard
        title="Beneficiary Accounts"
        sub={`${rows.length} of ${accounts.length} records`}
        search={q}
        onSearch={(v) => {
          setQ(v)
          setPage(1)
        }}
        placeholder="ID, name, ATM, bank, IFSC, last 4 digits"
        filterOpen={open}
        onToggleFilter={() => setOpen((o) => !o)}
        filterCount={[fType, fStatus, fBank, fElig].filter(Boolean).length}
        filters={
          <>
            <FilterSelect label="Beneficiary Type" value={fType} onChange={(v) => { setFType(v); setPage(1) }} options={BENEFICIARY_TYPES} />
            <FilterSelect label="Status" value={fStatus} onChange={(v) => { setFStatus(v); setPage(1) }} options={ACCOUNT_STATUSES} />
            <FilterSelect label="Bank" value={fBank} onChange={(v) => { setFBank(v); setPage(1) }} options={BANKS} />
            <FilterSelect label="Payment eligibility" value={fElig} onChange={(v) => { setFElig(v); setPage(1) }} options={['Payment-eligible', 'Not eligible']} />
          </>
        }
        onDownload={() => {
          downloadCsv('beneficiary-accounts', CSV_HEAD, rows.map(csvRow))
          toast(`Downloaded ${rows.length} records`)
        }}
        footer={<Pagination page={page} pageSize={size} total={rows.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1) }} noun="accounts" />}
      >
        <table className="w-full min-w-[1200px]">
          <thead>
            <tr>
              {['Account ID', 'Type', 'Beneficiary', 'Vertical', 'ATM ID', 'Bank', 'Account No.', 'IFSC', 'Effective From', 'Status', 'KYC', 'Payment', 'Action'].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((a) => (
              <tr key={a.id} className="hover:bg-blue-50/30">
                <td className={td}><Link to={`/finance/payouts/accounts/${a.id}`} className={linkBtn}>{a.id}</Link></td>
                <td className={td}>{a.beneficiaryType}</td>
                <td className={td}><div className="font-medium text-slate-900">{a.name}</div><div className="text-[11px] text-slate-500">{a.beneficiaryId}</div></td>
                <td className={td}>{a.vertical}</td>
                <td className={td}>{a.atmId || '—'}</td>
                <td className={td}>{a.bank}</td>
                <td className={`${td} font-mono`}>{maskAccount(a.accountNo)}</td>
                <td className={`${td} font-mono`}>{a.ifsc}</td>
                <td className={td}>{a.effectiveFrom}</td>
                <td className={td}><Badge tone={a.status === 'Superseded' ? 'gray' : toneFor(a.status)}>{a.status}</Badge></td>
                <td className={td}>{a.kycVerified ? <ShieldCheck size={16} className="text-emerald-600" aria-label="KYC verified" /> : <ShieldAlert size={16} className="text-amber-500" aria-label="KYC not verified" />}</td>
                <td className={td}><EligibleBadge a={a} /></td>
                <td className={td}><Link to={`/finance/payouts/accounts/${a.id}`} className={linkBtn}>View</Link></td>
              </tr>
            ))}
            {!paged.length && <EmptyRow cols={13} />}
          </tbody>
        </table>
      </TableCard>
    </PayoutPage>
  )
}

/** Effective-date account selection helper (§8.1). */
function EffectiveLookup({ accounts }: { accounts: BeneficiaryAccount[] }) {
  const [ben, setBen] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [atm, setAtm] = useState('')
  const options = useMemo(() => {
    const seen = new Map<string, string>()
    accounts.forEach((a) => seen.set(a.beneficiaryId, `${a.beneficiaryId} · ${a.name}`))
    return [...seen.entries()]
  }, [accounts])
  const id = options.find(([, l]) => l === ben)?.[0] ?? ben.trim()
  const hit = id && date ? accountInForce(accounts, id, date, atm.trim() || undefined) : undefined
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-[14px] font-bold text-slate-900">Account in force on a date</h2>
      <p className="text-[12px] text-slate-500">Payments pick the approved account whose effective-from date is the latest on or before the payment date.</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-[11px] font-semibold text-slate-700">Beneficiary</span>
          <input list="eff-ben" value={ben} onChange={(e) => setBen(e.target.value)} placeholder="Search beneficiary ID or name" className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none focus:border-[#0066FF]" />
          <datalist id="eff-ben">
            {options.map(([k, l]) => (
              <option key={k} value={l} />
            ))}
          </datalist>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-semibold text-slate-700">Payment date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none focus:border-[#0066FF]" />
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-semibold text-slate-700">ATM ID (optional)</span>
          <input value={atm} onChange={(e) => setAtm(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none focus:border-[#0066FF]" />
        </label>
      </div>
      {id && (
        <div className="mt-3 text-[12px]">
          {hit ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/finance/payouts/accounts/${hit.id}`} className={linkBtn}>{hit.id}</Link>
              <span>{hit.bank} · {maskAccount(hit.accountNo)} · {hit.ifsc} · effective {hit.effectiveFrom}</span>
              <Badge tone={hit.status === 'Active' ? 'green' : 'gray'}>{hit.status}</Badge>
              <EligibleBadge a={hit} />
            </div>
          ) : (
            <span className="text-amber-700">No approved account is effective for this beneficiary on {date}.</span>
          )}
        </div>
      )}
    </section>
  )
}

// ── (c) Approvals ────────────────────────────────────────────────────────
export function ApprovalDialog({ acc, onClose }: { acc: BeneficiaryAccount; onClose: () => void }) {
  const accounts = useBeneficiaryAccounts()
  const kyc = kycOf(acc.beneficiaryType, acc.beneficiaryId)
  const [kycOk, setKycOk] = useState(kyc.verified)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const current = accounts.find((a) => a.id !== acc.id && a.status === 'Active' && accountKey(a) === accountKey(acc))
  const self = acc.maker === me()
  const act = (approve: boolean) => {
    const e = approve ? approveAccount(acc.id, kycOk, note) : rejectAccount(acc.id, note)
    if (e) {
      setErr(e)
      return
    }
    toast(approve ? `${acc.id} approved${current ? ` — ${current.id} superseded` : ''}` : `${acc.id} rejected`)
    onClose()
  }
  return (
    <Modal
      title={`Review ${acc.id}`}
      sub={`${acc.beneficiaryType} · ${acc.name} · maker ${acc.maker}`}
      onClose={onClose}
      width={640}
      footer={
        <>
          <button type="button" className={btnOutline} onClick={onClose}>Back</button>
          <button type="button" className={btnDanger} disabled={self} onClick={() => act(false)}>Reject</button>
          <button type="button" className={btnPrimary} disabled={self} onClick={() => act(true)}>Approve</button>
        </>
      }
    >
      <div className="space-y-3 text-[12px]">
        {self && <Notice tone="error">Maker-checker (§18): you created this change, so another user must approve or reject it.</Notice>}
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>Field</th>
              <th className={th}>Current (in force)</th>
              <th className={th}>Proposed</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['Bank', current?.bank, acc.bank],
                ['Holder', current?.holder, acc.holder],
                ['Account No.', current ? maskAccount(current.accountNo) : undefined, maskAccount(acc.accountNo)],
                ['IFSC', current?.ifsc, acc.ifsc],
                ['Account Type', current?.accountType, acc.accountType],
                ['PAN', current?.pan, acc.pan],
                ['Effective From', current?.effectiveFrom, acc.effectiveFrom],
                ['Document', current?.document, acc.document],
              ] as [string, string | undefined, string | undefined][]
            ).map(([f, a, b]) => (
              <tr key={f}>
                <td className={`${td} font-semibold`}>{f}</td>
                <td className={td}>{a || '—'}</td>
                <td className={`${td} ${a && a !== b ? 'font-semibold text-[#0066FF]' : ''}`}>{b || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {current && <p className="text-slate-600">On approval {current.id} becomes <b>Superseded</b> and stays in history.</p>}
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-1 font-semibold text-slate-800">KYC validation</div>
          <div className="mb-2 text-slate-500">System: {kyc.status}{kyc.pan ? ` · KYC PAN ${kyc.pan}` : ''}{kyc.pan && kyc.pan !== acc.pan ? ' — differs from the entered PAN' : ''}</div>
          <Checkbox checked={kycOk} onChange={setKycOk} label="KYC verified — PAN and bank proof match the beneficiary" />
          {!kycOk && <p className="mt-1.5 text-amber-700">Without KYC the account becomes Active but is not payment-eligible.</p>}
        </div>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-slate-700">Remarks (required to reject)</span>
          <textarea value={note} onChange={(e) => { setNote(e.target.value); setErr('') }} rows={2} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-[12px] outline-none focus:border-[#0066FF]" />
        </label>
        {err && <p className="text-[12px] text-red-700">{err}</p>}
      </div>
    </Modal>
  )
}

export function AccountApprovals() {
  const role = useRole()
  const accounts = useBeneficiaryAccounts()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [fType, setFType] = useState('')
  const [fMaker, setFMaker] = useState('')
  const [reviewId, setReviewId] = useState<string | null>(null)
  const user = me()
  const pending = accounts.filter((a) => a.status === 'Pending')
  const makers = [...new Set(pending.map((a) => a.maker))]
  const rows = pending.filter((a) => {
    const s = q.trim().toLowerCase()
    return (!s || [a.id, a.name, a.beneficiaryId, a.bank, a.ifsc, a.maker].some((v) => v.toLowerCase().includes(s))) && (!fType || a.beneficiaryType === fType) && (!fMaker || a.maker === fMaker)
  })
  const reviewing = reviewId ? accounts.find((a) => a.id === reviewId && a.status === 'Pending') : undefined
  const isChange = (a: BeneficiaryAccount) => accounts.some((x) => x.id !== a.id && x.status === 'Active' && accountKey(x) === accountKey(a))

  return (
    <PayoutPage title="Account Mapping" sub="Account additions and changes waiting for checker approval (maker-checker, §18)." crumbs={[...CRUMB, 'Approvals']}>
      <AccountTabs />
      {!can('Approve', role) && <Notice tone="warn">Your role ({role}) can view this queue but cannot approve account changes.</Notice>}
      <TableCard
        title="Pending Account Approvals"
        sub={`${rows.length} pending`}
        search={q}
        onSearch={setQ}
        placeholder="ID, beneficiary, bank, maker"
        filterOpen={open}
        onToggleFilter={() => setOpen((o) => !o)}
        filterCount={[fType, fMaker].filter(Boolean).length}
        filters={
          <>
            <FilterSelect label="Beneficiary Type" value={fType} onChange={setFType} options={BENEFICIARY_TYPES} />
            <FilterSelect label="Maker" value={fMaker} onChange={setFMaker} options={makers} />
          </>
        }
        onDownload={() => {
          downloadCsv('account-approvals', CSV_HEAD, rows.map(csvRow))
          toast(`Downloaded ${rows.length} records`)
        }}
      >
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr>
              {['Account ID', 'Request', 'Beneficiary', 'Bank', 'Account No.', 'IFSC', 'Effective From', 'KYC', 'Maker', 'Action'].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className={td}><Link to={`/finance/payouts/accounts/${a.id}`} className={linkBtn}>{a.id}</Link></td>
                <td className={td}>{isChange(a) ? <Badge tone="purple">Account change</Badge> : <Badge tone="blue">New account</Badge>}</td>
                <td className={td}><div className="font-medium text-slate-900">{a.name}</div><div className="text-[11px] text-slate-500">{a.beneficiaryType} · {a.beneficiaryId}</div></td>
                <td className={td}>{a.bank}</td>
                <td className={`${td} font-mono`}>{maskAccount(a.accountNo)}</td>
                <td className={`${td} font-mono`}>{a.ifsc}</td>
                <td className={td}>{a.effectiveFrom}</td>
                <td className={td}>{kycOf(a.beneficiaryType, a.beneficiaryId).status}</td>
                <td className={td}>{a.maker}{a.maker === user && <span className="ml-1 text-[11px] text-amber-700">(you)</span>}</td>
                <td className={td}>
                  <button type="button" className={btnOutline} disabled={!can('Approve', role)} onClick={() => setReviewId(a.id)}>Review</button>
                </td>
              </tr>
            ))}
            {!rows.length && <EmptyRow cols={10} text="No account changes are waiting for approval." />}
          </tbody>
        </table>
      </TableCard>
      {reviewing && <ApprovalDialog acc={reviewing} onClose={() => setReviewId(null)} />}
    </PayoutPage>
  )
}
