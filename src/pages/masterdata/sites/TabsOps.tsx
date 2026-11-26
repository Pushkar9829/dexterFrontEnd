import { useCallback, useMemo, useState } from 'react'
import { CheckCircle2, Download, Pencil, RefreshCw, Save, Upload, UserCog, X, XCircle } from 'lucide-react'
import {
  CURRENT_ACTOR, ENGINEERS, LEGAL_SEQUENCE, MANAGERS, decidePayoutChange, decideSettlementChange, nowIso, requestPayoutChange, requestSettlementChange, updateSite, useCategories, useMasterAudit,
  type AccountMapping, type LegalDocKey, type LegalTrack, type Site, type StepStatus,
} from '@/data/network'
import { apiEnabled } from '@/lib/api'
import { useRole } from '@/lib/rbac'
import { maskAccount } from '@/lib/mask'
import { downloadCsv } from '@/lib/export'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FileDrop, SelectField, TextAreaField, TextField, type FileValue } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { FSelect, FText, KV, Panel, SimpleTable, StatusBadge, Val } from './ui'
import { ACCOUNT_RE, IFSC_RE, canApproveAccount, canSeeAccountNo, catName, fmtDate, fmtDateTime, siteMasterStore, todayIso, useSiteMaster } from './siteData'
import type { TabProps } from './TabsProject'

const LEGAL_LABEL: Record<LegalDocKey, string> = { LOI: 'LOI / Allotment Letter', Affidavit: 'Affidavit', Agreement: 'Agreement', KYC: 'KYC Verification', PVC: 'Police Verification Certificate (PVC)' }

/** Moves a step forward without overriding On Hold; used when related data changes (§10 auto-update). */
function stepTo(s: Site, key: string, status: StepStatus): Site['steps'] {
  const cur = s.steps[key]
  if (!cur || cur.status === status) return s.steps
  const now = nowIso()
  return { ...s.steps, [key]: { ...cur, status, since: now, updatedAt: now, remark: undefined } }
}

// ── Account (§17) ────────────────────────────────────────────────────────
type AccForm = { type: string; bank: string; holder: string; accountNo: string; ifsc: string; branch: string; mappedOn: string; reason: string }
export function AccountTab({ site, edit }: TabProps) {
  const role = useRole()
  const cats = useCategories()
  const show = canSeeAccountNo(role)
  const approver = canApproveAccount(role)
  const acc = site.account
  const accNo = (v?: string) => (v ? (show ? v : maskAccount(v)) : '')
  const typeNames = cats.settlementTypes.filter((c) => c.active).map((c) => c.name)
  const [form, setForm] = useState<AccForm | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof AccForm, string>>>({})
  const [reject, setReject] = useState<{ remark: string; error: string } | null>(null)
  const closeForm = useCallback(() => setForm(null), [])
  const closeReject = useCallback(() => setReject(null), [])
  // API mode: settlement status changes are maker-checker requests (POST /sites/:id/account/settlement[/decision]).
  const [stlReq, setStlReq] = useState<{ to: AccountMapping['settlement']; reason: string; error: string } | null>(null)
  const [stlReject, setStlReject] = useState<{ remark: string; error: string } | null>(null)
  const [stlBusy, setStlBusy] = useState(false)
  const [stlErr, setStlErr] = useState('')
  const pendingStl = site.settlementRequest
  const submitStlReq = async () => {
    if (!stlReq) return
    if (stlReq.reason.trim().length < 3) return setStlReq({ ...stlReq, error: 'Give the reason for the change (at least 3 characters).' })
    setStlBusy(true)
    try {
      await requestSettlementChange(site.siteId, stlReq.to, stlReq.reason)
      setStlReq(null)
      toast(`Settlement change to ${stlReq.to} requested — awaiting approval by another Finance user`)
    } catch (e) {
      setStlReq({ ...stlReq, error: e instanceof Error ? e.message : 'The server rejected the request.' })
    } finally {
      setStlBusy(false)
    }
  }
  const decideStl = async (decision: 'Approved' | 'Rejected', remark?: string) => {
    if (decision === 'Rejected' && !remark?.trim()) return setStlReject({ remark: remark ?? '', error: 'A remark is required to reject.' })
    setStlBusy(true)
    setStlErr('')
    try {
      await decideSettlementChange(site.siteId, decision, remark)
      setStlReject(null)
      toast(decision === 'Approved' ? 'Settlement change approved' : 'Settlement change rejected', decision === 'Approved' ? 'success' : 'info')
    } catch (e) {
      // e.g. MAKER_CHECKER — the requester cannot decide their own request
      const msg = e instanceof Error ? e.message : 'The server rejected the decision.'
      if (decision === 'Rejected') setStlReject({ remark: remark ?? '', error: msg })
      else setStlErr(msg)
    } finally {
      setStlBusy(false)
    }
  }

  const open = () => {
    setErrors({})
    setForm({ type: '', bank: '', holder: acc?.holder ?? '', accountNo: '', ifsc: '', branch: '', mappedOn: todayIso(), reason: '' })
  }

  const save = () => {
    if (!form) return
    const e: typeof errors = {}
    if (!form.type) e.type = 'Select the account type.'
    if (!form.bank.trim()) e.bank = 'Bank is required.'
    if (!form.holder.trim()) e.holder = 'Account holder is required.'
    if (!ACCOUNT_RE.test(form.accountNo)) e.accountNo = 'Account number must be 9–18 digits.'
    if (!IFSC_RE.test(form.ifsc)) e.ifsc = 'Enter a valid IFSC (e.g. HDFC0001234).'
    if (!form.branch.trim()) e.branch = 'Branch is required.'
    if (!form.mappedOn) e.mappedOn = 'Mapping date is required.'
    if (acc && !form.reason.trim()) e.reason = 'Give the reason for changing the account.'
    setErrors(e)
    if (Object.keys(e).length) return
    const code = cats.settlementTypes.find((c) => c.name === form.type)?.code ?? form.type
    const next: AccountMapping = {
      type: code, bank: form.bank.trim(), holder: form.holder.trim(), accountNo: form.accountNo, ifsc: form.ifsc, branch: form.branch.trim(),
      mappedOn: form.mappedOn, approval: 'Pending', settlement: 'Pending',
    }
    updateSite(
      site.siteId,
      (s) => ({
        account: next,
        // §17: the old account is never deleted — it moves to Account History.
        accountHistory: s.account ? [{ ...s.account, replacedOn: todayIso(), replacedBy: CURRENT_ACTOR }, ...s.accountHistory] : s.accountHistory,
        steps: s.steps.accountMapping?.status === 'On Hold' ? s.steps : stepTo(s, 'accountMapping', 'In Progress'),
      }),
      {
        action: acc ? 'Account mapping changed' : 'Account mapped',
        before: acc ? `${catName(cats, 'settlementTypes', acc.type)} · ${acc.bank} · ${maskAccount(acc.accountNo)}` : undefined,
        after: `${form.type} · ${next.bank} · ${maskAccount(next.accountNo)}${acc ? ` — ${form.reason.trim()}` : ''}`,
      },
    )
    setForm(null)
    toast(acc ? 'New account mapped — the old account moved to history. Awaiting approval.' : 'Account mapped — awaiting approval')
  }

  const approve = () => {
    if (!acc) return
    updateSite(
      site.siteId,
      (s) => ({
        account: s.account ? { ...s.account, approval: 'Approved', settlement: s.account.settlement === 'Pending' ? 'Active' : s.account.settlement } : s.account,
        steps: s.payout?.status === 'Mapped' ? stepTo(s, 'accountMapping', 'Completed') : s.steps,
      }),
      { action: 'Account mapping approved', before: 'Pending', after: 'Approved' },
    )
    toast('Account mapping approved')
  }
  const doReject = () => {
    if (!reject || !acc) return
    if (!reject.remark.trim()) {
      setReject({ ...reject, error: 'A remark is required to reject.' })
      return
    }
    updateSite(site.siteId, (s) => ({ account: s.account ? { ...s.account, approval: 'Rejected', settlement: 'Stopped' } : s.account }), {
      action: 'Account mapping rejected', before: acc.approval, after: `Rejected — ${reject.remark.trim()}`,
    })
    setReject(null)
    toast('Account mapping rejected', 'info')
  }
  const setSettlement = (v: AccountMapping['settlement']) => {
    if (!acc || v === acc.settlement) return
    updateSite(site.siteId, (s) => ({ account: s.account ? { ...s.account, settlement: v } : s.account }), { action: 'Settlement status changed', before: acc.settlement, after: v })
    toast(`Settlement status: ${v}`)
  }
  const f = (k: keyof AccForm) => ({
    name: `acc_${k}`,
    value: form?.[k] ?? '',
    error: errors[k],
    onChange: (ev: { target: { value: string } }) => {
      let v = ev.target.value
      if (k === 'accountNo') v = v.replace(/\D/g, '').slice(0, 18)
      if (k === 'ifsc') v = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)
      setForm((x) => (x ? { ...x, [k]: v } : x))
      setErrors((x) => ({ ...x, [k]: undefined }))
    },
  })

  return (
    <div className="space-y-4">
      <Panel
        title="Current Account Mapping"
        action={
          <>
            {acc?.approval === 'Pending' && approver && (
              <>
                <Button size="sm" variant="danger" icon={<XCircle size={13} />} onClick={() => setReject({ remark: '', error: '' })}>Reject</Button>
                <Button size="sm" variant="bright" icon={<CheckCircle2 size={13} />} onClick={approve}>Approve</Button>
              </>
            )}
            {edit && (
              <Button size="sm" variant="secondary" icon={<RefreshCw size={13} />} onClick={open}>
                {acc ? 'Change account' : 'Map account'}
              </Button>
            )}
          </>
        }
      >
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <KV k="Account Type"><Val v={catName(cats, 'settlementTypes', acc?.type)} /></KV>
          <KV k="Bank"><Val v={acc?.bank} /></KV>
          <KV k="Account Holder"><Val v={acc?.holder} /></KV>
          <KV k="Account No."><Val v={accNo(acc?.accountNo)} /></KV>
          <KV k="IFSC"><Val v={acc?.ifsc} /></KV>
          <KV k="Branch"><Val v={acc?.branch} /></KV>
          <KV k="Mapping Date"><Val v={fmtDate(acc?.mappedOn)} /></KV>
          <KV k="Approval Status"><StatusBadge s={acc?.approval} /></KV>
          <KV k="Settlement Status">
            {acc && edit && apiEnabled ? (
              <span className="inline-flex items-center gap-2">
                <StatusBadge s={acc.settlement} />
                {!pendingStl && (
                  <button type="button" className="text-[11.5px] font-medium text-[#0066FF] hover:underline" onClick={() => setStlReq({ to: acc.settlement === 'Active' ? 'Stopped' : 'Active', reason: '', error: '' })}>
                    Request change
                  </button>
                )}
              </span>
            ) : acc && edit && acc.approval === 'Approved' ? (
              <select
                aria-label="Settlement status"
                className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[12px] outline-none focus:border-[#0066FF]"
                value={acc.settlement}
                onChange={(e) => setSettlement(e.target.value as AccountMapping['settlement'])}
              >
                {(['Active', 'Pending', 'Stopped'] as const).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            ) : (
              <StatusBadge s={acc?.settlement} />
            )}
          </KV>
          <KV k="Account Mapping Step"><StatusBadge s={site.steps.accountMapping?.status} /></KV>
        </div>
        {pendingStl && acc && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[12px] text-amber-900">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Settlement change pending approval: {acc.settlement} → {pendingStl.to}</div>
                <div className="text-amber-800">
                  Reason: {pendingStl.reason} · requested by {pendingStl.requestedByName ?? '—'}{pendingStl.requestedAt ? ` on ${fmtDateTime(pendingStl.requestedAt)}` : ''}. The requester cannot approve it.
                </div>
              </div>
              {approver && (
                <>
                  <Button size="sm" variant="danger" icon={<XCircle size={13} />} disabled={stlBusy} onClick={() => setStlReject({ remark: '', error: '' })}>Reject</Button>
                  <Button size="sm" variant="bright" icon={<CheckCircle2 size={13} />} disabled={stlBusy} onClick={() => void decideStl('Approved')}>Approve</Button>
                </>
              )}
            </div>
            {stlErr && <p className="mt-2 text-[11.5px] font-medium text-brand-red">{stlErr}</p>}
          </div>
        )}
      </Panel>

      {(site.settlementHistory?.length ?? 0) > 0 && (
        <Panel title="Settlement Status History">
          <SimpleTable
            head={['From', 'To', 'Reason', 'Requested By', 'Decision', 'Decided By', 'Decided On', 'Remark']}
            rows={[...(site.settlementHistory ?? [])].reverse().map((h, i) => ({
              key: `stl${i}`,
              cells: [h.from, h.to, h.reason ?? '—', h.requestedByName ?? '—', <StatusBadge key="d" s={h.decision} />, h.decidedByName ?? '—', h.decidedAt ? fmtDateTime(h.decidedAt) : '—', h.remark ?? '—'],
            }))}
          />
        </Panel>
      )}

      <Panel title="Account History">
        <SimpleTable
          head={['Account Type', 'Bank', 'Holder', 'Account No.', 'IFSC', 'Mapped On', 'Replaced On', 'Replaced By', 'Approval']}
          empty="No earlier accounts — history appears here when the account is changed."
          rows={site.accountHistory.map((h, i) => ({
            key: `${h.accountNo}-${h.replacedOn}-${i}`,
            cells: [catName(cats, 'settlementTypes', h.type), h.bank, h.holder, accNo(h.accountNo), h.ifsc, fmtDate(h.mappedOn), fmtDate(h.replacedOn), h.replacedBy, <StatusBadge key="a" s={h.approval} />],
          }))}
        />
      </Panel>

      {form && (
        <Modal
          title={acc ? 'Change account' : 'Map account'}
          sub={acc ? 'The new account becomes the current mapping; the old one is kept in Account History.' : 'Settlement account for this site.'}
          onClose={closeForm}
          width={640}
          footer={
            <>
              <Button variant="secondary" onClick={closeForm}>Cancel</Button>
              <Button variant="bright" icon={<Save size={14} />} onClick={save}>Save mapping</Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Account Type" required options={typeNames} {...f('type')} />
            <TextField label="Bank" required {...f('bank')} />
            <TextField label="Account Holder" required {...f('holder')} />
            <TextField label="Account No." required inputMode="numeric" autoComplete="off" {...f('accountNo')} />
            <TextField label="IFSC" required {...f('ifsc')} />
            <TextField label="Branch" required {...f('branch')} />
            <TextField label="Mapping Date" required type="date" {...f('mappedOn')} />
            {acc && <TextAreaField label="Reason for change" required className="sm:col-span-2" {...f('reason')} />}
          </div>
        </Modal>
      )}
      {reject && (
        <Modal
          title="Reject account mapping"
          onClose={closeReject}
          footer={
            <>
              <Button variant="secondary" onClick={closeReject}>Cancel</Button>
              <Button variant="danger" onClick={doReject}>Reject</Button>
            </>
          }
        >
          <TextAreaField label="Remark" required name="accRejectRemark" value={reject.remark} error={reject.error} onChange={(e) => setReject({ remark: e.target.value, error: '' })} />
        </Modal>
      )}
      {stlReq && acc && (
        <Modal
          title="Request settlement status change"
          sub={`Current: ${acc.settlement}. Another Finance user approves the change (maker-checker).`}
          onClose={() => setStlReq(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setStlReq(null)}>Cancel</Button>
              <Button variant="bright" disabled={stlBusy} onClick={() => void submitStlReq()}>Submit request</Button>
            </>
          }
        >
          <div className="space-y-3">
            <SelectField label="New settlement status" required name="stlTo" options={(['Active', 'Pending', 'Stopped'] as const).filter((x) => x !== acc.settlement)} value={stlReq.to} onChange={(e) => setStlReq({ ...stlReq, to: e.target.value as AccountMapping['settlement'], error: '' })} />
            <TextAreaField label="Reason" required name="stlReason" value={stlReq.reason} error={stlReq.error} onChange={(e) => setStlReq({ ...stlReq, reason: e.target.value, error: '' })} />
          </div>
        </Modal>
      )}
      {stlReject && (
        <Modal
          title="Reject settlement change"
          onClose={() => setStlReject(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setStlReject(null)}>Cancel</Button>
              <Button variant="danger" disabled={stlBusy} onClick={() => void decideStl('Rejected', stlReject.remark)}>Reject</Button>
            </>
          }
        >
          <TextAreaField label="Remark" required name="stlRejectRemark" value={stlReject.remark} error={stlReject.error} onChange={(e) => setStlReject({ remark: e.target.value, error: '' })} />
        </Modal>
      )}
    </div>
  )
}

// ── Payout ───────────────────────────────────────────────────────────────
export function PayoutTab({ site, edit }: TabProps) {
  const role = useRole()
  const show = canSeeAccountNo(role)
  const approver = canApproveAccount(role)
  const p = site.payout
  const req = site.payoutRequest
  const [form, setForm] = useState<{ bank: string; accountNo: string; ifsc: string } | null>(null)
  const [errors, setErrors] = useState<{ bank?: string; accountNo?: string; ifsc?: string }>({})
  const [busy, setBusy] = useState(false)
  const [decErr, setDecErr] = useState('')
  const [rejecting, setRejecting] = useState<{ remark: string; error: string } | null>(null)
  const mask = (v: string) => (show ? v : maskAccount(v))

  /** API mode: Approve / Reject the pending request (POST /sites/:id/payout/decision; maker-checker on the server). */
  const decide = async (decision: 'Approved' | 'Rejected', remark?: string) => {
    if (decision === 'Rejected' && !remark?.trim()) return setRejecting({ remark: remark ?? '', error: 'A remark is required to reject.' })
    setBusy(true)
    setDecErr('')
    try {
      await decidePayoutChange(site.siteId, decision, remark)
      setRejecting(null)
      toast(decision === 'Approved' ? 'Payout mapping approved — now in force' : 'Payout mapping change rejected', decision === 'Approved' ? 'success' : 'info')
    } catch (e) {
      // e.g. MAKER_CHECKER — the requester cannot approve their own change
      const msg = e instanceof Error ? e.message : 'The server rejected the decision.'
      if (decision === 'Rejected') setRejecting({ remark: remark ?? '', error: msg })
      else setDecErr(msg)
    } finally {
      setBusy(false)
    }
  }

  const save = () => {
    if (!form) return
    const e: typeof errors = {}
    if (!form.bank.trim()) e.bank = 'Bank is required.'
    if (!ACCOUNT_RE.test(form.accountNo)) e.accountNo = 'Account number must be 9–18 digits.'
    if (!IFSC_RE.test(form.ifsc)) e.ifsc = 'Enter a valid IFSC.'
    setErrors(e)
    if (Object.keys(e).length) return
    if (apiEnabled) {
      // 202: stored as a Pending request; the current mapping stays in force until another Finance user approves.
      setBusy(true)
      requestPayoutChange(site.siteId, { bank: form.bank.trim(), accountNo: form.accountNo, ifsc: form.ifsc })
        .then(() => {
          setForm(null)
          toast('Payout mapping change submitted — awaiting approval by another Finance user')
        })
        .catch((err: unknown) => toast(err instanceof Error ? err.message : 'The server rejected the change.', 'error'))
        .finally(() => setBusy(false))
      return
    }
    updateSite(
      site.siteId,
      (s) => ({
        payout: { bank: form.bank.trim(), accountNo: form.accountNo, ifsc: form.ifsc, status: 'Mapped' },
        steps: s.account?.approval === 'Approved' ? stepTo(s, 'accountMapping', 'Completed') : s.steps,
      }),
      { action: 'Payout account mapped', before: p?.accountNo ? `${p.bank} · ${maskAccount(p.accountNo)}` : 'Pending', after: `${form.bank.trim()} · ${maskAccount(form.accountNo)}` },
    )
    setForm(null)
    toast('Payout account mapped')
  }

  return (
    <Panel
      title="Payout Account Mapping"
      action={
        edit &&
        (form ? (
          <>
            <Button size="sm" variant="secondary" icon={<X size={13} />} onClick={() => { setForm(null); setErrors({}) }}>Cancel</Button>
            <Button size="sm" variant="bright" icon={<Save size={13} />} disabled={busy} onClick={save}>{apiEnabled ? 'Submit for approval' : 'Save'}</Button>
          </>
        ) : req ? null : (
          <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => setForm({ bank: p?.bank ?? '', accountNo: '', ifsc: p?.ifsc ?? '' })}>
            {p?.status === 'Mapped' ? 'Change payout' : 'Map payout'}
          </Button>
        ))
      }
    >
      {form ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Payout Bank" required name="pBank" value={form.bank} error={errors.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} />
          <TextField label="Account No." required name="pAcc" inputMode="numeric" autoComplete="off" value={form.accountNo} error={errors.accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value.replace(/\D/g, '').slice(0, 18) })} />
          <TextField label="IFSC" required name="pIfsc" value={form.ifsc} error={errors.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })} />
        </div>
      ) : (
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <KV k="Payout Bank"><Val v={p?.bank} /></KV>
          <KV k="Account No."><Val v={p?.accountNo ? (show ? p.accountNo : maskAccount(p.accountNo)) : ''} /></KV>
          <KV k="IFSC"><Val v={p?.ifsc} /></KV>
          <KV k="Payout Status"><StatusBadge s={p?.status ?? 'Pending'} /></KV>
        </div>
      )}
      {req && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[12px] text-amber-900">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Payout mapping change pending approval</div>
              <div className="text-amber-800">
                New: {req.bank} · {mask(req.accountNo)} · {req.ifsc} — requested by {req.requestedByName ?? '—'}{req.requestedAt ? ` on ${fmtDateTime(req.requestedAt)}` : ''}. The current mapping stays in force until a different Finance user approves.
              </div>
            </div>
            {approver && (
              <>
                <Button size="sm" variant="danger" icon={<XCircle size={13} />} disabled={busy} onClick={() => setRejecting({ remark: '', error: '' })}>Reject</Button>
                <Button size="sm" variant="bright" icon={<CheckCircle2 size={13} />} disabled={busy} onClick={() => void decide('Approved')}>Approve</Button>
              </>
            )}
          </div>
          {decErr && <p className="mt-2 text-[11.5px] font-medium text-brand-red">{decErr}</p>}
        </div>
      )}
      {rejecting && (
        <Modal
          title="Reject payout mapping change"
          onClose={() => setRejecting(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button>
              <Button variant="danger" disabled={busy} onClick={() => void decide('Rejected', rejecting.remark)}>Reject</Button>
            </>
          }
        >
          <TextAreaField label="Remark" required name="payoutRejectRemark" value={rejecting.remark} error={rejecting.error} onChange={(e) => setRejecting({ remark: e.target.value, error: '' })} />
        </Modal>
      )}
    </Panel>
  )
}

// ── Legal (§18) ──────────────────────────────────────────────────────────
export function LegalTab({ site, edit }: TabProps) {
  const sm = useSiteMaster()
  const files = sm.legalFiles[site.siteId] ?? {}
  const [upload, setUpload] = useState<{ doc: LegalDocKey; file: FileValue; error: string } | null>(null)
  const [reject, setReject] = useState<{ doc: LegalDocKey; remark: string; error: string } | null>(null)
  const closeUpload = useCallback(() => setUpload(null), [])
  const closeReject = useCallback(() => setReject(null), [])

  const write = (doc: LegalDocKey, track: LegalTrack, audit: { action: string; before?: string; after?: string }) => {
    updateSite(
      site.siteId,
      (s) => {
        const legal = { ...s.legal, [doc]: track }
        const allDone = LEGAL_SEQUENCE.every((d) => legal[d].final === 'Complete')
        const cur = s.steps.legal?.status
        const steps = allDone ? stepTo(s, 'legal', 'Completed') : cur === 'Completed' || cur === 'Not Started' ? stepTo(s, 'legal', 'In Progress') : s.steps
        return { legal, steps }
      },
      audit,
    )
  }

  const doUpload = () => {
    if (!upload) return
    if (!upload.file) {
      setUpload({ ...upload, error: 'Choose the document file to upload.' })
      return
    }
    const name = upload.file.name
    siteMasterStore.set((s) => ({ ...s, legalFiles: { ...s.legalFiles, [site.siteId]: { ...(s.legalFiles[site.siteId] ?? {}), [upload.doc]: name } } }))
    write(upload.doc, { upload: 'Uploaded', verification: 'Pending', final: 'Pending' }, { action: `${upload.doc} uploaded`, before: site.legal[upload.doc].verification, after: name })
    toast(`${upload.doc} uploaded — pending verification`)
    setUpload(null)
  }
  const verify = (doc: LegalDocKey) => {
    write(doc, { upload: 'Uploaded', verification: 'Verified', final: 'Complete' }, { action: `${doc} verified`, before: site.legal[doc].verification, after: 'Verified / Complete' })
    toast(`${doc} verified`)
  }
  const doReject = () => {
    if (!reject) return
    if (!reject.remark.trim()) {
      setReject({ ...reject, error: 'A remark is required to reject.' })
      return
    }
    write(reject.doc, { upload: 'Uploaded', verification: 'Re-upload Required', final: 'Pending' }, { action: `${reject.doc} rejected`, before: site.legal[reject.doc].verification, after: `Re-upload Required — ${reject.remark.trim()}` })
    toast(`${reject.doc} rejected — re-upload required`, 'info')
    setReject(null)
  }

  return (
    <Panel title="Legal Binding & Document Tracking" action={<span className="text-[12px] text-slate-500">Sequence: {LEGAL_SEQUENCE.join(' → ')}</span>}>
      <SimpleTable
        head={['#', 'Document', 'Upload Status', 'Verification', 'Final Status', 'File', ...(edit ? ['Actions'] : [])]}
        rows={LEGAL_SEQUENCE.map((doc, i) => {
          const t = site.legal[doc]
          const prevDone = i === 0 || site.legal[LEGAL_SEQUENCE[i - 1]].final === 'Complete'
          const canUpload = prevDone && (t.upload === 'Pending' || t.verification === 'Re-upload Required')
          const canVerify = prevDone && t.upload === 'Uploaded' && t.verification === 'Pending'
          return {
            key: doc,
            cells: [
              i + 1,
              LEGAL_LABEL[doc],
              <StatusBadge key="u" s={t.upload} />,
              <StatusBadge key="v" s={t.verification} />,
              <StatusBadge key="f" s={t.final} />,
              files[doc] ?? (t.upload === 'Uploaded' ? 'On file' : '—'),
              ...(edit
                ? [
                    <div key="a" className="flex items-center gap-1.5">
                      <Button size="sm" variant="secondary" icon={<Upload size={12} />} disabled={!canUpload} title={prevDone ? undefined : `Complete ${LEGAL_SEQUENCE[i - 1]} first`} onClick={() => setUpload({ doc, file: null, error: '' })}>
                        Upload
                      </Button>
                      <Button size="sm" variant="secondary" icon={<CheckCircle2 size={12} />} disabled={!canVerify} onClick={() => verify(doc)}>
                        Verify
                      </Button>
                      <Button size="sm" variant="danger" icon={<XCircle size={12} />} disabled={!canVerify} onClick={() => setReject({ doc, remark: '', error: '' })}>
                        Reject
                      </Button>
                    </div>,
                  ]
                : []),
            ],
          }
        })}
      />
      <p className="mt-3 text-[11.5px] text-slate-500">Each stage has its own status. A stage can be uploaded and verified only after the previous stage is complete.</p>

      {upload && (
        <Modal
          title={`Upload ${LEGAL_LABEL[upload.doc]}`}
          onClose={closeUpload}
          footer={
            <>
              <Button variant="secondary" onClick={closeUpload}>Cancel</Button>
              <Button variant="bright" icon={<Upload size={14} />} onClick={doUpload}>Upload</Button>
            </>
          }
        >
          <FileDrop entity="Site" purpose="legal" fileRef={site.siteId} value={upload.file} accept=".pdf,image/*" onChange={(file) => setUpload({ ...upload, file, error: '' })} hint="PDF or image, up to 5 MB" />
          {upload.error && <p className="mt-1 text-[11px] text-brand-red">{upload.error}</p>}
        </Modal>
      )}
      {reject && (
        <Modal
          title={`Reject ${reject.doc}`}
          sub="The document will be marked Re-upload Required."
          onClose={closeReject}
          footer={
            <>
              <Button variant="secondary" onClick={closeReject}>Cancel</Button>
              <Button variant="danger" onClick={doReject}>Reject</Button>
            </>
          }
        >
          <TextAreaField label="Remark" required name="legalRejectRemark" value={reject.remark} error={reject.error} onChange={(e) => setReject({ ...reject, remark: e.target.value, error: '' })} />
        </Modal>
      )}
    </Panel>
  )
}

// ── Engineer / Manager (current + history) ──────────────────────────────
export function PeopleTab({ site, edit, kind }: TabProps & { kind: 'engineer' | 'manager' }) {
  const isEng = kind === 'engineer'
  const pool = isEng ? ENGINEERS : MANAGERS
  const cur = isEng ? site.engineer : site.manager
  const curId = isEng ? site.engineer?.engineerId : site.manager?.managerId
  const [pick, setPick] = useState<{ id: string; type: string; error: string } | null>(null)
  const close = useCallback(() => setPick(null), [])
  const types = useMemo(() => [...new Set(ENGINEERS.map((e) => e.type ?? ''))].filter(Boolean), [])
  const options = pool.filter((p) => p.id !== curId && (!isEng || !pick?.type || p.type === pick.type))
  const title = isEng ? 'Engineer' : 'Manager / RM'

  const save = () => {
    if (!pick) return
    const person = pool.find((p) => p.id === pick.id)
    if (!person) {
      setPick({ ...pick, error: `Select the ${isEng ? 'engineer' : 'manager'}.` })
      return
    }
    const today = todayIso()
    if (isEng) {
      updateSite(
        site.siteId,
        (s) => ({
          engineer: { engineerId: person.id, name: person.name, mobile: person.mobile, type: person.type ?? 'ATM', assignedOn: today, assignedBy: CURRENT_ACTOR },
          engineerHistory: s.engineer ? [{ ...s.engineer, removedOn: today }, ...s.engineerHistory] : s.engineerHistory,
          steps: s.steps.engineerMapping?.status === 'On Hold' ? s.steps : stepTo(s, 'engineerMapping', 'Completed'),
        }),
        { action: site.engineer ? 'Engineer changed' : 'Engineer assigned', before: site.engineer?.name, after: person.name },
      )
    } else {
      updateSite(
        site.siteId,
        (s) => ({
          manager: { managerId: person.id, name: person.name, empCode: person.empCode ?? '', mobile: person.mobile, email: person.email, department: person.department ?? '', reportingManager: person.reportingManager ?? '', mappedOn: today },
          managerHistory: s.manager ? [{ ...s.manager, removedOn: today }, ...s.managerHistory] : s.managerHistory,
        }),
        { action: site.manager ? 'Manager / RM changed' : 'Manager / RM mapped', before: site.manager?.name, after: person.name },
      )
    }
    setPick(null)
    toast(`${title} updated — previous assignment kept in history`)
  }

  const histRows = isEng
    ? site.engineerHistory.map((h, i) => ({ key: `${h.engineerId}-${h.removedOn}-${i}`, cells: [h.name, h.engineerId, h.type, h.mobile, fmtDate(h.assignedOn), fmtDate(h.removedOn), h.assignedBy] }))
    : site.managerHistory.map((h, i) => ({ key: `${h.managerId}-${h.removedOn}-${i}`, cells: [h.name, h.empCode, h.department, h.mobile, fmtDate(h.mappedOn), fmtDate(h.removedOn), h.reportingManager] }))

  return (
    <div className="space-y-4">
      <Panel
        title={`Current ${title}`}
        action={
          edit && (
            <Button size="sm" variant="secondary" icon={<UserCog size={13} />} onClick={() => setPick({ id: '', type: '', error: '' })}>
              {cur ? `Change ${isEng ? 'engineer' : 'manager'}` : `Assign ${isEng ? 'engineer' : 'manager'}`}
            </Button>
          )
        }
      >
        {isEng ? (
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <KV k="Engineer Name"><Val v={site.engineer?.name} /></KV>
            <KV k="Engineer ID"><Val v={site.engineer?.engineerId} /></KV>
            <KV k="Engineer Type"><Val v={site.engineer?.type} /></KV>
            <KV k="Mobile"><Val v={site.engineer?.mobile} /></KV>
            <KV k="Assigned On"><Val v={fmtDate(site.engineer?.assignedOn)} /></KV>
            <KV k="Assigned By"><Val v={site.engineer?.assignedBy} /></KV>
            <KV k="Engineer Mapping Step"><StatusBadge s={site.steps.engineerMapping?.status} /></KV>
          </div>
        ) : (
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <KV k="Manager / RM"><Val v={site.manager?.name} /></KV>
            <KV k="Employee Code"><Val v={site.manager?.empCode} /></KV>
            <KV k="Department"><Val v={site.manager?.department} /></KV>
            <KV k="Reporting Manager"><Val v={site.manager?.reportingManager} /></KV>
            <KV k="Mobile"><Val v={site.manager?.mobile} /></KV>
            <KV k="Email"><Val v={site.manager?.email} /></KV>
            <KV k="Mapped On"><Val v={fmtDate(site.manager?.mappedOn)} /></KV>
          </div>
        )}
      </Panel>
      <Panel title={`${title} History`}>
        <SimpleTable
          head={isEng ? ['Engineer', 'ID', 'Type', 'Mobile', 'Assigned On', 'Removed On', 'Assigned By'] : ['Manager / RM', 'Emp Code', 'Department', 'Mobile', 'Mapped On', 'Removed On', 'Reporting Manager']}
          rows={histRows}
          empty="No earlier assignments."
        />
      </Panel>
      {pick && (
        <Modal
          title={cur ? `Change ${title}` : `Assign ${title}`}
          sub={cur ? `${cur.name} moves to history with today's removal date.` : undefined}
          onClose={close}
          footer={
            <>
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button variant="bright" icon={<Save size={14} />} onClick={save}>Save</Button>
            </>
          }
        >
          <div className="grid gap-4">
            {isEng && <SelectField label="Engineer Type" name="engType" placeholder="All types" value={pick.type} options={types} onChange={(e) => setPick({ ...pick, type: e.target.value, id: '' })} />}
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold text-ink">{title} *</span>
              <select
                value={pick.id}
                onChange={(e) => setPick({ ...pick, id: e.target.value, error: '' })}
                className={`h-9 w-full rounded-md border bg-white px-[11px] text-[12.5px] outline-none focus:border-primary ${pick.error ? 'border-brand-red' : 'border-line'}`}
              >
                <option value="">Select</option>
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.id}{p.type ? ` · ${p.type}` : ''}{p.department ? ` · ${p.department}` : ''}
                  </option>
                ))}
              </select>
              {pick.error && <span className="mt-1 block text-[11px] text-brand-red">{pick.error}</span>}
            </label>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── History (audit + mapping histories) ─────────────────────────────────
export function HistoryTab({ site }: { site: Site }) {
  const audit = useMasterAudit()
  const cats = useCategories()
  const role = useRole()
  const show = canSeeAccountNo(role)
  const [q, setQ] = useState('')
  const [action, setAction] = useState('')
  const mine = useMemo(() => audit.filter((a) => a.entity === 'Site' && a.ref === site.siteId), [audit, site.siteId])
  const actions = useMemo(() => [...new Set(mine.map((a) => a.action))].sort(), [mine])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return mine.filter((a) => (!action || a.action === action) && (!s || `${a.action} ${a.by} ${a.before ?? ''} ${a.after ?? ''}`.toLowerCase().includes(s)))
  }, [mine, q, action])

  const download = () => {
    if (!rows.length) {
      toast('No history to download', 'info')
      return
    }
    downloadCsv(`site-history-${site.siteId}`, ['Date & Time', 'By', 'Action', 'Before', 'After'], rows.map((a) => [fmtDateTime(a.at), a.by, a.action, a.before ?? '', a.after ?? '']))
  }

  return (
    <div className="space-y-4">
      <Panel title="Change History">
        <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end">
          <FText label="Search" value={q} onChange={setQ} placeholder="Action, user, value…" />
          <FSelect label="Action" value={action} onChange={setAction} options={actions} all="All actions" />
          <Button size="sm" variant="secondary" icon={<Download size={13} />} onClick={download} className="h-8.5">
            Download
          </Button>
        </div>
        <SimpleTable
          head={['Date & Time', 'By', 'Action', 'Before', 'After']}
          empty={mine.length ? 'No entries match the search.' : 'No changes recorded for this site yet.'}
          rows={rows.map((a) => ({ key: a.id, cells: [fmtDateTime(a.at), a.by, a.action, <span key="b" className="whitespace-normal">{a.before || '—'}</span>, <span key="a" className="whitespace-normal">{a.after || '—'}</span>] }))}
        />
      </Panel>
      <Panel title="Mapping History">
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-[12.5px] font-semibold text-slate-800">Accounts</h4>
            <SimpleTable
              head={['Account Type', 'Bank', 'Account No.', 'Mapped On', 'Replaced On', 'Replaced By']}
              empty="No account changes."
              rows={site.accountHistory.map((h, i) => ({ key: `a${i}`, cells: [catName(cats, 'settlementTypes', h.type), h.bank, show ? h.accountNo : maskAccount(h.accountNo), fmtDate(h.mappedOn), fmtDate(h.replacedOn), h.replacedBy] }))}
            />
          </div>
          <div>
            <h4 className="mb-2 text-[12.5px] font-semibold text-slate-800">Engineers</h4>
            <SimpleTable
              head={['Engineer', 'Type', 'Assigned On', 'Removed On']}
              empty="No engineer changes."
              rows={site.engineerHistory.map((h, i) => ({ key: `e${i}`, cells: [h.name, h.type, fmtDate(h.assignedOn), fmtDate(h.removedOn)] }))}
            />
          </div>
          <div>
            <h4 className="mb-2 text-[12.5px] font-semibold text-slate-800">Managers / RM</h4>
            <SimpleTable
              head={['Manager / RM', 'Emp Code', 'Mapped On', 'Removed On']}
              empty="No manager changes."
              rows={site.managerHistory.map((h, i) => ({ key: `m${i}`, cells: [h.name, h.empCode, fmtDate(h.mappedOn), fmtDate(h.removedOn)] }))}
            />
          </div>
        </div>
      </Panel>
    </div>
  )
}
