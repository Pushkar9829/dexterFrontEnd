// Beneficiary account create / edit / view (spec §8, §8.1).
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Pencil } from 'lucide-react'
import { PayoutPage } from '@/pages/payout/PayoutShell'
import { Badge, toneFor } from '@/components/ui/Badge'
import { FileDrop, SectionTitle, SelectField, TextField, type FileValue } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { maskAccount } from '@/lib/mask'
import { can, useRole } from '@/lib/rbac'
import { BANKS, VERTICALS, accountStore, logPayout, nowIso, useBeneficiaryAccounts, type BeneficiaryAccount, type BeneficiaryType, type Vertical } from '@/data/payout'
import { siteByAtm, useSites } from '@/data/network'
import { apiCreateAccount, apiEnabled, fileBlock } from '@/data/payoutApi'
import { useFranchises } from '@/data/franchises'
import {
  ACC_RE, BENEFICIARY_TYPES, DOC_TYPES, IFSC_RE, PAN_RE, accountKey, beneficiaryName, beneficiaryOptions, duplicateOf, hierarchyOf, kycOf, me, nextAccountId, sitesFor, verticalForAtm,
} from './model'
import { AccountTabs, ApprovalDialog, EligibleBadge } from './AccountPages'
import { DetailGrid, FormActions, HistoryList, Notice, btnOutline, btnPrimary } from './ui'

type Form = {
  beneficiaryType: BeneficiaryType | ''
  beneficiaryId: string
  pickText: string
  otherName: string
  otherVertical: Vertical | ''
  atmId: string
  pan: string
  bank: string
  holder: string
  accountNo: string
  confirmAccountNo: string
  ifsc: string
  accountType: '' | 'Current' | 'Savings'
  docType: string
  doc: FileValue
  effectiveFrom: string
}

const blank = (): Form => ({
  beneficiaryType: '', beneficiaryId: '', pickText: '', otherName: '', otherVertical: '', atmId: '', pan: '', bank: '', holder: '', accountNo: '', confirmAccountNo: '', ifsc: '', accountType: '', docType: '', doc: null, effectiveFrom: new Date().toISOString().slice(0, 10),
})

function fromRecord(a: BeneficiaryAccount, change: boolean): Form {
  const [docType, docName] = a.document?.includes(': ') ? a.document.split(': ') : ['', a.document ?? '']
  return {
    beneficiaryType: a.beneficiaryType, beneficiaryId: a.beneficiaryId, pickText: `${a.beneficiaryId} · ${a.name}`, otherName: a.beneficiaryType === 'Other' ? a.name : '', otherVertical: a.vertical, atmId: a.atmId ?? '', pan: a.pan,
    bank: a.bank, holder: a.holder, accountNo: change ? '' : a.accountNo, confirmAccountNo: change ? '' : a.accountNo, ifsc: change ? '' : a.ifsc, accountType: a.accountType,
    docType: change ? '' : docType || (/statement/i.test(docName) ? 'Bank Statement' : 'Cancelled Cheque'), doc: change || !docName ? null : { name: docName, size: 0 },
    effectiveFrom: change ? new Date().toISOString().slice(0, 10) : a.effectiveFrom,
  }
}

export function BeneficiaryRoute() {
  const { id = '' } = useParams()
  const [sp] = useSearchParams()
  const from = sp.get('from') ?? ''
  return <BeneficiaryPage key={`${id}|${from}`} id={id} fromId={from} />
}

function BeneficiaryPage({ id, fromId }: { id: string; fromId: string }) {
  const accounts = useBeneficiaryAccounts()
  const rec = id ? accounts.find((a) => a.id === id) : undefined
  if (id && !rec)
    return (
      <PayoutPage title="Account Mapping" crumbs={['Account Mapping', 'Beneficiary Accounts', id]}>
        <AccountTabs />
        <Notice tone="error">
          Account {id} was not found. <Link className="underline" to="/finance/payouts/accounts/beneficiaries">Back to Beneficiary Accounts</Link>
        </Notice>
      </PayoutPage>
    )
  if (rec && rec.status !== 'Draft' && rec.status !== 'Rejected') return <AccountView acc={rec} />
  const source = fromId ? accounts.find((a) => a.id === fromId && a.status === 'Active') : undefined
  return <AccountForm rec={rec} source={source} />
}

function AccountView({ acc }: { acc: BeneficiaryAccount }) {
  const navigate = useNavigate()
  const role = useRole()
  const accounts = useBeneficiaryAccounts()
  const [review, setReview] = useState(false)
  const h = hierarchyOf(acc.beneficiaryType, acc.beneficiaryId)
  const related = accounts.filter((a) => a.id !== acc.id && accountKey(a) === accountKey(acc)).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
  const pendingChange = related.find((a) => a.status === 'Pending' || a.status === 'Draft')
  return (
    <PayoutPage
      title={`${acc.id} · ${acc.name}`}
      sub="Beneficiary bank account"
      crumbs={['Account Mapping', 'Beneficiary Accounts', acc.id]}
      actions={
        <>
          <button type="button" className={btnOutline} onClick={() => navigate(-1)}>Back</button>
          {acc.status === 'Pending' && can('Approve', role) && <button type="button" className={btnPrimary} onClick={() => setReview(true)}>Review &amp; Approve</button>}
          {acc.status === 'Active' && can('Edit', role) && !pendingChange && (
            <button type="button" className={btnPrimary} onClick={() => navigate(`/finance/payouts/accounts/new?from=${acc.id}`)}>
              <Pencil size={14} /> Request account change
            </button>
          )}
        </>
      }
    >
      <AccountTabs />
      {acc.status === 'Superseded' && <Notice>This account was replaced and is kept for history and effective-date look-ups only. It cannot be used for new payments.</Notice>}
      {pendingChange && <Notice tone="warn">A change for this beneficiary is in progress: <Link className="underline" to={`/finance/payouts/accounts/${pendingChange.id}`}>{pendingChange.id}</Link> ({pendingChange.status}).</Notice>}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone={acc.status === 'Superseded' ? 'gray' : toneFor(acc.status)}>{acc.status}</Badge>
          <Badge tone={acc.kycVerified ? 'green' : 'amber'}>{acc.kycVerified ? 'KYC verified' : 'KYC not verified'}</Badge>
          <EligibleBadge a={acc} />
        </div>
        <DetailGrid
          items={[
            { label: 'Beneficiary Type', value: acc.beneficiaryType },
            { label: 'Beneficiary', value: `${acc.name} (${acc.beneficiaryId})` },
            { label: 'Business Vertical', value: acc.vertical },
            { label: 'Super MF / MF / Franchisee', value: `${h.smf} / ${h.mf} / ${h.fr}` },
            { label: 'ATM ID / Site ID', value: acc.atmId ? `${acc.atmId} / ${acc.siteId ?? '—'}` : 'All sites (beneficiary level)' },
            { label: 'PAN', value: acc.pan },
            { label: 'Bank', value: acc.bank },
            { label: 'Account Holder', value: acc.holder },
            { label: 'Account Number', value: <span className="font-mono">{maskAccount(acc.accountNo)}</span> },
            { label: 'IFSC', value: <span className="font-mono">{acc.ifsc}</span> },
            { label: 'Account Type', value: acc.accountType },
            { label: 'Supporting Document', value: acc.document },
            { label: 'Effective From', value: acc.effectiveFrom },
            { label: 'Maker', value: acc.maker },
            { label: 'Checker', value: acc.checker },
          ]}
        />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <SectionTitle title="Account-change audit trail" />
          <HistoryList items={[...acc.history].reverse()} />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <SectionTitle title="Previous / other accounts for this beneficiary" sub="Old details are retained, never deleted (§8.1)." />
          {related.length ? (
            <ul className="space-y-2 text-[12px]">
              {related.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2">
                  <Link to={`/finance/payouts/accounts/${r.id}`} className="font-semibold text-[#0066FF] hover:underline">{r.id}</Link>
                  <span>{r.bank} · {maskAccount(r.accountNo)} · from {r.effectiveFrom}</span>
                  <Badge tone={r.status === 'Superseded' ? 'gray' : toneFor(r.status)}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-slate-500">No other accounts.</p>
          )}
        </section>
      </div>
      {review && <ApprovalDialog acc={acc} onClose={() => setReview(false)} />}
    </PayoutPage>
  )
}

function AccountForm({ rec, source }: { rec?: BeneficiaryAccount; source?: BeneficiaryAccount }) {
  const navigate = useNavigate()
  const role = useRole()
  useFranchises()
  useSites()
  const [f, setF] = useState<Form>(() => (rec ? fromRecord(rec, false) : source ? fromRecord(source, true) : blank()))
  const [mode, setMode] = useState<null | 'draft' | 'submit'>(null)
  const [showAcc, setShowAcc] = useState(false)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }))
  const locked = !!source || (!!rec && rec.history.some((h) => h.action.startsWith('Change request')))

  const options = useMemo(() => beneficiaryOptions(f.beneficiaryType), [f.beneficiaryType])
  const kyc = kycOf(f.beneficiaryType, f.beneficiaryId)
  const h = hierarchyOf(f.beneficiaryType, f.beneficiaryId)
  const name = f.beneficiaryType === 'Other' ? f.otherName.trim() : beneficiaryName(f.beneficiaryType, f.beneficiaryId) ?? ''
  const site = f.atmId.trim() ? siteByAtm(f.atmId) : undefined
  const vertical: Vertical | '' = f.beneficiaryType === 'Other' ? f.otherVertical : f.beneficiaryId ? (site ? verticalForAtm(site.atmId) : 'Franchise Model') : ''
  const siteOptions = useMemo(() => sitesFor(f.beneficiaryType, f.beneficiaryId).slice(0, 300), [f.beneficiaryType, f.beneficiaryId])
  const panAuto = !!kyc.pan

  const pickBeneficiary = (text: string) => {
    const hit = options.find((o) => `${o.id} · ${o.name}` === text || o.id.toLowerCase() === text.trim().toLowerCase())
    setF((p) => {
      if (!hit) return { ...p, pickText: text, beneficiaryId: '' }
      const k = kycOf(p.beneficiaryType, hit.id)
      return { ...p, pickText: `${hit.id} · ${hit.name}`, beneficiaryId: hit.id, pan: k.pan ?? p.pan, holder: p.holder || hit.name, atmId: '' }
    })
  }

  /** Pure validation. Format/duplicate errors always; required-field errors once the user tried to save. */
  const check = (m: 'draft' | 'submit' | null): Record<string, string> => {
    const e: Record<string, string> = {}
    const need = (k: keyof Form, msg: string) => {
      if (!String(f[k] ?? '').trim() && !e[k]) e[k] = msg
    }
    if (m) {
      if (!f.beneficiaryType) e.beneficiaryType = 'Select the beneficiary type.'
      if (f.beneficiaryType === 'Other') need('otherName', 'Enter the beneficiary name.')
      else if (f.beneficiaryType && !f.beneficiaryId) e.pickText = f.pickText ? 'Pick a beneficiary from the list.' : 'Select the beneficiary.'
    }
    if (m === 'submit') {
      if (f.beneficiaryType === 'Other') need('otherVertical', 'Select the business vertical.')
      need('pan', 'PAN is required.')
      need('bank', 'Select the bank.')
      need('holder', 'Enter the account holder name.')
      need('accountNo', 'Enter the account number.')
      need('confirmAccountNo', 'Re-enter the account number.')
      need('ifsc', 'Enter the IFSC code.')
      need('accountType', 'Select the account type.')
      need('docType', 'Select the document type.')
      if (!f.doc) e.doc = 'Upload a cancelled cheque or bank statement.'
      need('effectiveFrom', 'Select the effective-from date.')
      if (f.beneficiaryType) {
        const key = accountKey({ beneficiaryType: f.beneficiaryType, beneficiaryId: f.beneficiaryId, atmId: f.atmId.trim() || undefined })
        const other = accountStore.get().find((a) => a.id !== rec?.id && a.status === 'Pending' && accountKey(a) === key)
        if (other) e.form = `A change for this beneficiary is already pending approval (${other.id}).`
      }
    }
    if (f.atmId.trim()) {
      if (!site) e.atmId = 'ATM ID not found in the Site master.'
      else if (f.beneficiaryType === 'Franchisee' && site.frId !== f.beneficiaryId) e.atmId = `This ATM belongs to another franchise (${site.frId}).`
    }
    if (f.pan && !PAN_RE.test(f.pan)) e.pan = 'PAN format must be AAAAA9999A.'
    if (f.ifsc && !IFSC_RE.test(f.ifsc)) e.ifsc = 'IFSC must be 11 characters: 4 letters, 0, then 6 letters/digits (e.g. HDFC0001234).'
    if (f.accountNo && !ACC_RE.test(f.accountNo)) e.accountNo = 'Account number must be 9–18 digits.'
    if (f.confirmAccountNo && f.confirmAccountNo !== f.accountNo) e.confirmAccountNo = 'Account numbers do not match.'
    if (f.holder && !/^[A-Za-z0-9 .&'()-]{3,}$/.test(f.holder)) e.holder = 'Enter a valid account holder name.'
    const dup = duplicateOf(f.accountNo, f.ifsc, f.beneficiaryId || '__new__', rec?.id)
    if (dup) e.accountNo = `Duplicate: this account no. + IFSC is already mapped to ${dup.name} (${dup.id}). Use a different account.`
    if (source && f.accountNo === source.accountNo && f.ifsc === source.ifsc && f.bank === source.bank && f.holder === source.holder && f.accountType === source.accountType)
      e.form = 'Nothing changed compared with the current account.'
    return e
  }
  const shown = check(mode)
  const err = (k: string) => shown[k]

  const save = (submit: boolean) => {
    const m = submit ? 'submit' : 'draft'
    setMode(m)
    const e = check(m)
    if (Object.keys(e).length) {
      toast(e.form ?? 'Please fix the highlighted fields.', 'error')
      return
    }
    if (apiEnabled && !submit) {
      toast('Drafts are not stored on the server — submit the account for approval to save it.', 'error')
      return
    }
    const docBlock = fileBlock(f.doc)
    if (docBlock) {
      toast(docBlock, 'error')
      return
    }
    const user = me()
    const at = nowIso()
    const newId = rec?.id ?? nextAccountId()
    const benId = f.beneficiaryType === 'Other' ? f.beneficiaryId || `OTH-${newId.replace(/\D/g, '')}` : f.beneficiaryId
    const status: BeneficiaryAccount['status'] = submit ? 'Pending' : 'Draft'
    const action = submit ? (source || locked ? 'Account change submitted' : 'Submitted for approval') : 'Saved as draft'
    const next: BeneficiaryAccount = {
      id: newId,
      beneficiaryType: f.beneficiaryType as BeneficiaryType,
      beneficiaryId: benId,
      name,
      vertical: (vertical || 'Franchise Model') as Vertical,
      atmId: f.atmId.trim() || undefined,
      siteId: site?.siteId,
      pan: f.pan,
      bank: f.bank,
      holder: f.holder.trim(),
      accountNo: f.accountNo,
      ifsc: f.ifsc,
      accountType: (f.accountType || 'Current') as BeneficiaryAccount['accountType'],
      document: f.doc ? `${f.docType || 'Document'}: ${f.doc.name}` : undefined,
      effectiveFrom: f.effectiveFrom,
      status,
      kycVerified: false, // set by the checker at approval
      maker: rec?.maker ?? user,
      history: [
        ...(rec?.history ?? (source ? [{ at, by: user, action: `Change request for ${source.id}`, detail: `Current: ${source.bank} ${maskAccount(source.accountNo)}` }] : [])),
        { at, by: user, action, detail: `${f.bank || '—'} ${f.accountNo ? maskAccount(f.accountNo) : ''} ${f.ifsc}`.trim() },
      ],
    }
    accountStore.set((list) => (rec ? list.map((a) => (a.id === rec.id ? next : a)) : [next, ...list]))
    logPayout({ by: user, area: 'Account Mapping', ref: newId, action, before: source ? `${source.id} ${source.bank} ${maskAccount(source.accountNo)}` : rec ? `${rec.status}` : undefined, after: `${status} ${next.bank} ${next.accountNo ? maskAccount(next.accountNo) : ''}` })
    if (apiEnabled) {
      // the server assigns the account id; a change request is a new Pending account that supersedes the old one on approval
      void apiCreateAccount(next, f.doc?.fileId).then((ok) => ok && toast(`Account submitted for approval`))
      navigate('/finance/payouts/accounts/approvals', { replace: true })
      return
    }
    toast(submit ? `${newId} submitted for approval` : `${newId} saved as draft`)
    navigate(`/finance/payouts/accounts/${newId}`, { replace: true })
  }

  const title = rec ? `Edit ${rec.id}` : source ? `Change account · ${source.id}` : 'New Beneficiary Account'
  const busy = !can(rec ? 'Edit' : 'Create', role)
  return (
    <PayoutPage title={title} sub="All changes go to a checker; the current account stays in force until approval (§8.1)." crumbs={['Account Mapping', 'Beneficiary Accounts', rec?.id ?? 'New']}>
      <AccountTabs />
      {rec?.status === 'Rejected' && <Notice tone="warn">Rejected: {[...rec.history].reverse().find((x) => x.action === 'Rejected')?.detail ?? '—'}. Correct and resubmit.</Notice>}
      {source && <Notice>Changing the account of <b>{source.name}</b>. Current: {source.bank} · {maskAccount(source.accountNo)} · {source.ifsc}. Re-enter the new account details.</Notice>}
      {busy && <Notice tone="warn">Your role ({role}) cannot create or edit beneficiary accounts.</Notice>}
      {shown.form && <Notice tone="error">{shown.form}</Notice>}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionTitle num="01" title="Beneficiary" sub="Name, vertical and hierarchy are fetched from the approved masters." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Beneficiary Type"
            required
            value={f.beneficiaryType}
            disabled={locked}
            options={BENEFICIARY_TYPES}
            onChange={(e) => setF((p) => ({ ...p, beneficiaryType: e.target.value as BeneficiaryType, beneficiaryId: '', pickText: '', atmId: '', pan: '' }))}
            error={err('beneficiaryType')}
          />
          {f.beneficiaryType === 'Other' ? (
            <>
              <TextField label="Beneficiary Name" required value={f.otherName} disabled={locked} onChange={(e) => set('otherName', e.target.value)} error={err('otherName')} />
              <SelectField label="Business Vertical" required value={f.otherVertical} options={VERTICALS} disabled={locked} onChange={(e) => set('otherVertical', e.target.value as Vertical)} error={err('otherVertical')} />
            </>
          ) : (
            <>
              <div>
                <TextField
                  label="Beneficiary"
                  required
                  list="ben-options"
                  placeholder={f.beneficiaryType ? 'Type ID or name and pick' : 'Select the type first'}
                  disabled={!f.beneficiaryType || locked}
                  value={f.pickText}
                  onChange={(e) => pickBeneficiary(e.target.value)}
                  error={err('pickText')}
                />
                <datalist id="ben-options">
                  {options.map((o) => (
                    <option key={o.id} value={`${o.id} · ${o.name}`} />
                  ))}
                </datalist>
              </div>
              <TextField label="Business Vertical" value={vertical} disabled hint="Auto: from the selected site, else Franchise Model" />
            </>
          )}
          <TextField label="Beneficiary Name (auto)" value={name} disabled />
          <TextField label="Super MF / MF / Franchisee" value={f.beneficiaryId ? `${h.smf} / ${h.mf} / ${h.fr}` : ''} disabled hint={h.tl ? `Mapped under Team Leader ${h.tl}` : undefined} />
          <div>
            <TextField
              label="ATM ID (optional — site-specific account)"
              list="atm-options"
              placeholder="Search ATM ID"
              value={f.atmId}
              disabled={locked}
              onChange={(e) => set('atmId', e.target.value.toUpperCase())}
              error={err('atmId')}
              hint={site ? `Site ${site.siteId} · ${site.location || site.district} · ${site.siteType}` : 'Leave blank for a beneficiary-level account'}
            />
            <datalist id="atm-options">
              {siteOptions.map((s) => (
                <option key={s.atmId} value={s.atmId}>{s.siteId}</option>
              ))}
            </datalist>
          </div>
          <TextField label="Site ID (auto)" value={site?.siteId ?? ''} disabled />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionTitle num="02" title="KYC & Bank Account" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            label="PAN"
            required
            value={f.pan}
            maxLength={10}
            disabled={panAuto}
            onChange={(e) => set('pan', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            error={err('pan')}
            hint={panAuto ? 'Auto-fetched from approved KYC' : `${kyc.status} — enter PAN; the checker validates KYC`}
          />
          <SelectField label="Bank Name" required value={f.bank} options={BANKS} onChange={(e) => set('bank', e.target.value)} error={err('bank')} />
          <TextField label="Account Holder Name" required value={f.holder} onChange={(e) => set('holder', e.target.value)} error={err('holder')} hint="As printed on the cheque / statement" />
          <div className="relative">
            <TextField
              label="Account Number"
              required
              type={showAcc ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="off"
              maxLength={18}
              value={f.accountNo}
              onChange={(e) => set('accountNo', e.target.value.replace(/\D/g, ''))}
              error={err('accountNo')}
            />
            <button type="button" onClick={() => setShowAcc((s) => !s)} className="absolute top-[30px] right-2 text-slate-500" aria-label={showAcc ? 'Hide account number' : 'Show account number'}>
              {showAcc ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <TextField
            label="Confirm Account Number"
            required
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={18}
            value={f.confirmAccountNo}
            onPaste={(e) => e.preventDefault()}
            onChange={(e) => set('confirmAccountNo', e.target.value.replace(/\D/g, ''))}
            error={err('confirmAccountNo')}
            hint={f.confirmAccountNo && f.confirmAccountNo === f.accountNo ? 'Matches' : 'Re-type (paste disabled)'}
          />
          <TextField label="IFSC Code" required maxLength={11} value={f.ifsc} onChange={(e) => set('ifsc', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} error={err('ifsc')} />
          <SelectField label="Account Type" required value={f.accountType} options={['Current', 'Savings']} onChange={(e) => set('accountType', e.target.value as Form['accountType'])} error={err('accountType')} />
          <TextField label="Effective From" required type="date" value={f.effectiveFrom} onChange={(e) => set('effectiveFrom', e.target.value)} error={err('effectiveFrom')} hint="Payments on/after this date use this account" />
          <TextField label="Status" value={rec?.status ?? 'Draft (new)'} disabled hint="Draft → Pending → Active / Rejected" />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionTitle num="03" title="Supporting Document" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Document Type" required value={f.docType} options={[...DOC_TYPES]} onChange={(e) => set('docType', e.target.value)} error={err('docType')} />
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink">Upload *</span>
            <FileDrop entity="PayoutBeneficiary" purpose="payout-beneficiary" value={f.doc} onChange={(v) => set('doc', v)} accept=".pdf,.jpg,.jpeg,.png" maxMb={5} hint="PDF / JPG / PNG, max 5 MB" />
            {err('doc') && <p className="mt-1 text-[11px] text-brand-red">{err('doc')}</p>}
          </div>
        </div>
      </section>

      <FormActions onBack={() => navigate(-1)} onDraft={() => save(false)} onSubmit={() => save(true)} disabled={busy} />
    </PayoutPage>
  )
}
