// Team Leader monthly share calculation, approval and payment / UTR tracking (spec §5.4–5.6).
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calculator } from 'lucide-react'
import { PayoutPage } from '@/pages/payout/PayoutShell'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { apiCalculateTl, apiEnabled } from '@/data/payoutApi'
import { downloadCsv } from '@/lib/export'
import { can, useRole } from '@/lib/rbac'
import { inrP, logPayout, monthLabel, nowIso, pctOf, sumP, tlStore, useFinanceRules, usePayout, useTl, type Paise, type PayoutBatch, type TlRule, type TlShare } from '@/data/payout'
import { decideShare, isBmSite, me, metaOf, newShareId, ruleActiveIn, tlMetaStore, tlShareMetaStore, updateSharePayment, valueLabel, type TlShareMeta } from './model'
import { TlTabs } from './TlRules'
import { EmptyRow, FilterSelect, Notice, Stepper, TableCard, btnDanger, btnOutline, btnPrimary, linkBtn, td, th, type StepState } from './ui'

const BATCH_PRIORITY: PayoutBatch['status'][] = ['Completed', 'Released', 'Approved', 'Pending Approval', 'Validated', 'Uploaded', 'Draft', 'On Hold']
const APPROVED_BATCH: PayoutBatch['status'][] = ['Completed', 'Released', 'Approved']

type RowState = 'Computed' | 'Rule pending Finance approval' | 'Rule not approved' | 'Duplicate site mapping'
type CalcRow = { rule: TlRule; state: RowState; eligible: Paise; share: Paise; remaining: Paise; sites: { atmId: string; eligible: Paise }[]; bmExcluded: string[]; dupSites: string[] }

export default function TlCalculation() {
  const role = useRole()
  const { rules, shares } = useTl()
  const payout = usePayout()
  const finance = useFinanceRules()
  const ruleMeta = tlMetaStore.use()
  const shareMeta = tlShareMetaStore.use()

  const months = useMemo(() => [...new Set(payout.lines.map((l) => l.month))].sort().reverse(), [payout.lines])
  const [month, setMonth] = useState(() => months[0] ?? '')
  const [batchSel, setBatchSel] = useState('')
  const batches = useMemo(
    () => payout.batches.filter((b) => b.month === month && b.vertical === 'Franchise Model' && b.status !== 'Rejected').sort((a, b) => BATCH_PRIORITY.indexOf(a.status) - BATCH_PRIORITY.indexOf(b.status)),
    [payout.batches, month],
  )
  const batch = batches.find((b) => b.id === batchSel) ?? batches[0]
  const provisional = !finance.tlEligibleProfitBasis
  const basisLabel = provisional ? 'PROVISIONAL basis — Σ MF revenue on the site payout lines (Finance decision §21-01 pending)' : `Approved basis: ${finance.tlEligibleProfitBasis} (computed from Σ MF revenue on the site lines — confirm mapping)`

  const rows: CalcRow[] = useMemo(() => {
    if (!batch) return []
    const byAtm = new Map<string, Paise>()
    payout.lines.filter((l) => l.batchId === batch.id).forEach((l) => byAtm.set(l.atmId, (byAtm.get(l.atmId) ?? 0) + l.mfRevenue))
    const live = rules.filter((r) => r.status !== 'Rejected' && !metaOf(ruleMeta, r.id).draft && ruleActiveIn(r, month))
    const approved = live.filter((r) => r.status === 'Approved')
    const count = new Map<string, number>()
    approved.forEach((r) => r.siteAtmIds.forEach((a) => count.set(a, (count.get(a) ?? 0) + 1)))
    return live.map((r) => {
      const bmExcluded = r.siteAtmIds.filter(isBmSite)
      const sites = r.siteAtmIds.filter((a) => !bmExcluded.includes(a)).map((a) => ({ atmId: a, eligible: byAtm.get(a) ?? 0 }))
      const eligible = sumP(sites.map((s) => s.eligible))
      const dupSites = r.status === 'Approved' ? r.siteAtmIds.filter((a) => (count.get(a) ?? 0) > 1) : []
      const state: RowState = r.status !== 'Approved' ? 'Rule not approved' : dupSites.length ? 'Duplicate site mapping' : !r.value ? 'Rule pending Finance approval' : 'Computed'
      const share = state === 'Computed' ? (r.type === 'Percentage' ? pctOf(eligible, r.value) : r.value) : 0
      return { rule: r, state, eligible, share, remaining: eligible - share, sites, bmExcluded, dupSites }
    })
  }, [batch, payout.lines, rules, ruleMeta, month])

  const monthShares = shares.filter((s) => s.month === month)
  const computable = rows.filter((r) => r.state === 'Computed')

  // stepper (§5.5)
  const st = (ok: boolean, warn = false): StepState => (ok ? 'done' : warn ? 'warn' : 'todo')
  const allApproved = monthShares.length > 0 && monthShares.every((s) => s.approval === 'Approved')
  const allPaid = allApproved && monthShares.every((s) => s.payment === 'Paid')
  const steps = [
    { label: 'Franchise Model Revenue', state: st(!!batch), note: batch ? `${batch.name} · ${batch.records} lines` : 'No payout batch for the month' },
    { label: 'Approved Franchisee / MF Calculation', state: st(!!batch && APPROVED_BATCH.includes(batch.status), !!batch), note: batch ? `Batch ${batch.status}${APPROVED_BATCH.includes(batch.status) ? '' : ' — figures provisional'}` : undefined },
    { label: 'Eligible Franchise Profit Determination', state: st(!!batch && !provisional, !!batch), note: provisional ? 'Provisional basis' : 'Approved basis' },
    { label: 'TL Profit Share Calculation', state: st(monthShares.length > 0, computable.length > 0 && !monthShares.length), note: `${computable.length} computable · ${rows.length - computable.length} blocked` },
    { label: 'TL Share Allocation & Approval', state: st(allApproved, monthShares.some((s) => s.approval !== 'Approved')), note: `${monthShares.filter((s) => s.approval === 'Approved').length}/${monthShares.length} approved` },
    { label: 'TL Payment / UTR Tracking', state: st(allPaid, allApproved && !allPaid), note: `${monthShares.filter((s) => s.payment === 'Paid').length}/${monthShares.length} paid` },
    { label: 'Remaining Eligible Franchise Profit', state: st(allPaid), note: `${inrP(sumP(computable.map((r) => r.remaining)), 0)} remaining` },
  ]

  const saveShares = () => {
    if (!batch) return
    if (!can('Create', role)) {
      toast('Your role cannot save TL calculations.', 'error')
      return
    }
    const groups = new Map<string, CalcRow[]>()
    computable.forEach((r) => groups.set(r.rule.tlId, [...(groups.get(r.rule.tlId) ?? []), r]))
    if (!groups.size) {
      toast('Nothing to save — no approved rule with a Finance-approved share value for this month.', 'error')
      return
    }
    const user = me()
    const at = nowIso()
    const current = tlStore.get().shares
    const upserts: TlShare[] = []
    const metas: Record<string, TlShareMeta> = {}
    let locked = 0
    groups.forEach((rs, tlId) => {
      const existing = current.find((s) => s.month === month && s.tlId === tlId)
      if (existing && existing.approval === 'Approved') {
        locked++
        return
      }
      const id = existing?.id ?? newShareId()
      const eligible = sumP(rs.map((r) => r.eligible))
      const share = sumP(rs.map((r) => r.share))
      upserts.push({ id, month, tlId, tlName: rs[0].rule.tlName, eligibleProfit: eligible, share, approval: 'Pending', payment: 'Pending' })
      const prev = tlShareMetaStore.get()[id]
      metas[id] = {
        maker: user,
        basis: basisLabel,
        batchId: batch.id,
        sites: rs.flatMap((r) => r.sites),
        history: [...(prev?.history ?? []), { at, by: user, action: existing ? 'Recalculated' : 'Calculated', detail: `Rules ${rs.map((r) => r.rule.id).join(', ')} · eligible ${inrP(eligible)} · share ${inrP(share)} · ${batch.name}` }],
      }
    })
    if (upserts.length) {
      tlStore.set((s) => ({ ...s, shares: [...s.shares.filter((x) => !upserts.some((u) => u.id === x.id)), ...upserts] }))
      tlShareMetaStore.set((all) => ({ ...all, ...metas }))
      logPayout({ by: user, area: 'Team Leader', ref: `TL-${month}`, action: 'TL shares calculated', after: `${upserts.length} TLs · total ${inrP(sumP(upserts.map((u) => u.share)))} · ${batch.name}` })
    }
    if (apiEnabled) void apiCalculateTl(month, batch.id)
    toast(`${upserts.length} TL share(s) saved for approval${locked ? ` · ${locked} already approved (locked)` : ''}`)
  }

  // tables
  const [q1, setQ1] = useState('')
  const [open1, setOpen1] = useState(false)
  const [fState, setFState] = useState('')
  const calcRows = rows.filter((r) => (!q1.trim() || [r.rule.id, r.rule.tlName, r.rule.tlId].some((v) => v.toLowerCase().includes(q1.trim().toLowerCase()))) && (!fState || r.state === fState))

  const [q2, setQ2] = useState('')
  const [open2, setOpen2] = useState(false)
  const [fAll, setFAll] = useState('')
  const [fAppr, setFAppr] = useState('')
  const [fPay, setFPay] = useState('')
  const shareRows = shares
    .filter((s) => (fAll === 'All months' || s.month === month) && (!fAppr || s.approval === fAppr) && (!fPay || s.payment === fPay))
    .filter((s) => !q2.trim() || [s.id, s.tlName, s.tlId, s.utr ?? ''].some((v) => v.toLowerCase().includes(q2.trim().toLowerCase())))
    .sort((a, b) => b.month.localeCompare(a.month) || a.tlName.localeCompare(b.tlName))
  const [dialog, setDialog] = useState<{ id: string; kind: 'decide' | 'pay' } | null>(null)
  const dShare = dialog ? shares.find((s) => s.id === dialog.id) : undefined

  return (
    <PayoutPage title="Team Leader Profit Sharing" sub="Monthly TL share from Franchise Model site profit. BM sites are never included." crumbs={['Team Leader', 'Monthly Calculation']}>
      <TlTabs />
      <Stepper steps={steps} />

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Payout Month"
            required
            value={month}
            options={months}
            onChange={(e) => {
              setMonth(e.target.value)
              setBatchSel('')
            }}
          />
          <SelectField
            label="Source payout batch"
            value={batch?.id ?? ''}
            options={batches.map((b) => b.id)}
            placeholder={batches.length ? 'Select' : 'No batch for this month'}
            onChange={(e) => setBatchSel(e.target.value)}
            hint={batch ? `${batch.name} · ${batch.type} · ${batch.status}` : undefined}
          />
          <div className="sm:col-span-2 flex items-end justify-end gap-2">
            <button type="button" className={btnPrimary} disabled={!batch || !computable.length || !can('Create', role)} onClick={saveShares}>
              <Calculator size={15} /> Calculate &amp; Save for Approval
            </button>
          </div>
        </div>
        <div className="mt-3">
          <Notice tone={provisional ? 'warn' : 'info'}>
            <b>{provisional ? 'Provisional' : 'Approved'} eligible-profit basis.</b> {basisLabel}. Shares are never computed from an assumed default — a rule without a Finance-approved value shows “Rule pending Finance approval”.
          </Notice>
        </div>
      </section>

      <TableCard
        title={`TL Share Calculation · ${month ? monthLabel(month) : '—'}`}
        sub={`${rows.length} rule(s) active in the month`}
        search={q1}
        onSearch={setQ1}
        placeholder="Rule, TL"
        filterOpen={open1}
        onToggleFilter={() => setOpen1((o) => !o)}
        filterCount={fState ? 1 : 0}
        filters={<FilterSelect label="Calculation state" value={fState} onChange={setFState} options={['Computed', 'Rule pending Finance approval', 'Rule not approved', 'Duplicate site mapping']} />}
        onDownload={() => {
          downloadCsv(`tl-calculation-${month}`, ['Rule', 'TL ID', 'TL Name', 'Sites', 'Eligible Profit (₹)', 'Sharing', 'TL Share (₹)', 'Remaining (₹)', 'State', 'Basis'], calcRows.map((r) => [r.rule.id, r.rule.tlId, r.rule.tlName, String(r.sites.length), (r.eligible / 100).toFixed(2), valueLabel(r.rule), (r.share / 100).toFixed(2), (r.remaining / 100).toFixed(2), r.state, basisLabel]))
          toast(`Downloaded ${calcRows.length} rows`)
        }}
      >
        <table className="w-full min-w-[1050px]">
          <thead>
            <tr>
              {['Rule', 'Team Leader', 'Sites (FR)', 'Eligible Franchise Profit', 'Sharing', 'TL Share', 'Remaining Eligible Profit', 'State'].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calcRows.map((r) => (
              <tr key={r.rule.id}>
                <td className={td}><Link to={`/finance/payouts/team-leader/${r.rule.id}`} className={linkBtn}>{r.rule.id}</Link></td>
                <td className={td}><div className="font-medium text-slate-900">{r.rule.tlName}</div><div className="text-[11px] text-slate-500">{r.rule.tlId}</div></td>
                <td className={td} title={r.sites.map((s) => `${s.atmId}: ${inrP(s.eligible)}`).join('\n')}>
                  {r.sites.filter((s) => s.eligible).length}/{r.sites.length} with data{r.bmExcluded.length ? <span className="ml-1 text-amber-700">· {r.bmExcluded.length} BM excluded</span> : null}
                </td>
                <td className={td}>{inrP(r.eligible)}{provisional && <span className="ml-1 text-[10px] font-semibold text-amber-700">PROVISIONAL</span>}</td>
                <td className={td}>{valueLabel(r.rule)}</td>
                <td className={`${td} font-semibold`}>{r.state === 'Computed' ? inrP(r.share) : <span className="font-normal text-amber-700">{r.state === 'Rule pending Finance approval' ? 'Rule pending Finance approval' : '—'}</span>}</td>
                <td className={`${td} ${r.remaining < 0 ? 'text-red-700' : ''}`}>{r.state === 'Computed' ? inrP(r.remaining) : '—'}</td>
                <td className={td}>
                  <Badge tone={r.state === 'Computed' ? 'green' : r.state === 'Duplicate site mapping' ? 'red' : 'amber'}>{r.state}</Badge>
                  {r.dupSites.length > 0 && <div className="mt-0.5 text-[10.5px] text-red-700">{r.dupSites.join(', ')}</div>}
                </td>
              </tr>
            ))}
            {!calcRows.length && <EmptyRow cols={8} text={batch ? 'No TL rules are active for this month.' : 'No Franchise payout batch exists for this month.'} />}
          </tbody>
        </table>
      </TableCard>

      <TableCard
        title="TL Share Records — Approval, Payment & UTR"
        sub="Separate TL approval, payment and UTR records (§5.6)"
        search={q2}
        onSearch={setQ2}
        placeholder="Share ID, TL, UTR"
        filterOpen={open2}
        onToggleFilter={() => setOpen2((o) => !o)}
        filterCount={[fAll, fAppr, fPay].filter(Boolean).length}
        filters={
          <>
            <FilterSelect label="Period" value={fAll} onChange={setFAll} options={['All months']} all="Selected month" />
            <FilterSelect label="Approval" value={fAppr} onChange={setFAppr} options={['Pending', 'Approved', 'Rejected']} />
            <FilterSelect label="Payment" value={fPay} onChange={setFPay} options={['Pending', 'Paid', 'Hold']} />
          </>
        }
        onDownload={() => {
          downloadCsv('tl-shares', ['Share ID', 'Month', 'TL ID', 'TL Name', 'Eligible Profit (₹)', 'TL Share (₹)', 'Remaining (₹)', 'Approval', 'Payment', 'UTR', 'Maker', 'Checker', 'Basis'], shareRows.map((s) => {
            const m = shareMeta[s.id]
            return [s.id, s.month, s.tlId, s.tlName, (s.eligibleProfit / 100).toFixed(2), (s.share / 100).toFixed(2), ((s.eligibleProfit - s.share) / 100).toFixed(2), s.approval, s.payment, s.utr ?? '', m?.maker ?? '', m?.checker ?? '', m?.basis ?? '']
          }))
          toast(`Downloaded ${shareRows.length} records`)
        }}
      >
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr>
              {['Share ID', 'Month', 'Team Leader', 'Eligible Profit', 'TL Share', 'Remaining', 'Approval', 'Payment', 'UTR', 'Maker / Checker', 'Action'].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shareRows.map((s) => {
              const m = shareMeta[s.id]
              return (
                <tr key={s.id}>
                  <td className={`${td} font-mono`}>{s.id}</td>
                  <td className={td}>{monthLabel(s.month)}</td>
                  <td className={td}><div className="font-medium text-slate-900">{s.tlName}</div><div className="text-[11px] text-slate-500">{s.tlId}</div></td>
                  <td className={td}>{inrP(s.eligibleProfit)}</td>
                  <td className={`${td} font-semibold`}>{inrP(s.share)}</td>
                  <td className={td}>{inrP(s.eligibleProfit - s.share)}</td>
                  <td className={td}><Badge tone={toneFor(s.approval)}>{s.approval}</Badge></td>
                  <td className={td}><Badge tone={s.payment === 'Paid' ? 'green' : s.payment === 'Hold' ? 'red' : 'amber'}>{s.payment}</Badge></td>
                  <td className={`${td} font-mono`}>{s.utr ?? '—'}</td>
                  <td className={td}>{m?.maker ?? '—'} / {m?.checker ?? '—'}</td>
                  <td className={td}>
                    {s.approval === 'Pending' && <button type="button" className={btnOutline} disabled={!can('Approve', role)} onClick={() => setDialog({ id: s.id, kind: 'decide' })}>Review</button>}
                    {s.approval === 'Approved' && <button type="button" className={btnOutline} disabled={!can('Edit', role)} onClick={() => setDialog({ id: s.id, kind: 'pay' })}>Payment / UTR</button>}
                    {s.approval === 'Rejected' && <span className="text-[11px] text-slate-500">Recalculate to resubmit</span>}
                  </td>
                </tr>
              )
            })}
            {!shareRows.length && <EmptyRow cols={11} text="No TL share records yet — calculate and save above." />}
          </tbody>
        </table>
      </TableCard>

      {dialog && dShare && <ShareDialog share={dShare} kind={dialog.kind} meta={shareMeta[dShare.id]} onClose={() => setDialog(null)} />}
    </PayoutPage>
  )
}

function ShareDialog({ share, kind, meta, onClose }: { share: TlShare; kind: 'decide' | 'pay'; meta?: TlShareMeta; onClose: () => void }) {
  const [note, setNote] = useState('')
  const [payment, setPayment] = useState<TlShare['payment']>(share.payment)
  const [utr, setUtr] = useState(share.utr ?? '')
  const [err, setErr] = useState('')
  const self = kind === 'decide' && meta?.maker === me()
  const decide = (approve: boolean) => {
    const e = decideShare(share.id, approve, note)
    if (e) return setErr(e)
    toast(`${share.id} ${approve ? 'approved' : 'rejected'}`)
    onClose()
  }
  const pay = () => {
    const e = updateSharePayment(share.id, payment, utr, note)
    if (e) return setErr(e)
    toast(`Payment status saved for ${share.tlName}`)
    onClose()
  }
  return (
    <Modal
      title={kind === 'decide' ? `Approve TL share ${share.id}` : `Payment · ${share.tlName}`}
      sub={`${monthLabel(share.month)} · share ${inrP(share.share)} of ${inrP(share.eligibleProfit)}`}
      onClose={onClose}
      width={560}
      footer={
        kind === 'decide' ? (
          <>
            <button type="button" className={btnOutline} onClick={onClose}>Back</button>
            <button type="button" className={btnDanger} disabled={self} onClick={() => decide(false)}>Reject</button>
            <button type="button" className={btnPrimary} disabled={self} onClick={() => decide(true)}>Approve</button>
          </>
        ) : (
          <>
            <button type="button" className={btnOutline} onClick={onClose}>Back</button>
            <button type="button" className={btnPrimary} onClick={pay}>Save</button>
          </>
        )
      }
    >
      <div className="space-y-3 text-[12px]">
        {self && <Notice tone="error">Maker-checker (§18): you calculated this share, so another user must approve it.</Notice>}
        {meta && (
          <div className="rounded-lg border border-slate-200 p-3">
            <div><b>Basis:</b> {meta.basis}</div>
            <div><b>Source batch:</b> {meta.batchId} · {meta.sites.length} sites</div>
          </div>
        )}
        {kind === 'pay' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField label="Payment Status" required value={payment} options={['Pending', 'Paid', 'Hold']} onChange={(e) => { setPayment(e.target.value as TlShare['payment']); setErr('') }} />
            <TextField label="UTR" required={payment === 'Paid'} value={utr} disabled={payment !== 'Paid'} maxLength={22} onChange={(e) => { setUtr(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setErr('') }} hint="10–22 letters / digits" />
          </div>
        )}
        <TextAreaField label={kind === 'decide' ? 'Remarks (required to reject)' : 'Remarks (required for Hold)'} value={note} onChange={(e) => { setNote(e.target.value); setErr('') }} />
        {err && <p className="text-red-700">{err}</p>}
      </div>
    </Modal>
  )
}
