// §9.4–9.7 Auto Reconciliation & Payout: ATM-wise comparison of Manual, File-Based and Auto
// (engine) payout, status rules, resolve / hold / approve (maker-checker), then release & UTR.
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Download, Eye, Info, PauseCircle, Pencil, PlayCircle, Plus, RefreshCw, RotateCcw, Search, Table2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { can, useRole } from '@/lib/rbac'
import { downloadCsv } from '@/lib/export'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { apiEnabled, apiResolve } from '@/data/payoutApi'
import {
  FY_OPTIONS, VERTICALS, DEDUCTION_LABELS, accountStore, calcFranchise, logPayout, nowIso, planMappingStore, toPaise, useFinanceRules, usePayout,
  type Deductions, type PayoutBatch, type ReconStatus, type TxnData,
} from '@/data/payout'
import {
  RECON_STATUSES, VERTICAL_LABEL, actor, addAdjustment, addTrail, amt, approvalBlock, approvedLike, batchNameTaken, buildRecon, createAutoBatch, extStore, fyMonths, holdBatch, isLocked,
  monthLabel, planFor, recalculate, resKey, setStatus, suggestBatchName, unholdBatch, useExt, type Accepted, type ReconRow,
} from './lib'
import { Diff, Panel, ReconBadge, SectionBar, tbodyRow, tdCls, thCls, theadRow, type Details } from './ui'
import { ReleasePanel } from './ReleasePanel'

type Filters = { atm: string; site: string; fr: string; status: '' | ReconStatus }
const NO_F: Filters = { atm: '', site: '', fr: '', status: '' }
const sel = 'h-9 w-full rounded-md border border-line bg-white px-[11px] text-[12.5px] text-ink outline-none focus:border-primary'
const lbl = 'mb-1.5 block text-[11px] font-semibold text-ink'

export function AutoPanel({ details, setDetails }: { details: Details; setDetails: (p: Partial<Details>) => void }) {
  useRole()
  const state = usePayout()
  const ext = useExt()
  const rules = useFinanceRules()
  // buildRecon reads plan mappings and beneficiary accounts: subscribe so the table follows them
  planMappingStore.use()
  accountStore.use()
  const [batchId, setBatchId] = useState('')
  const [draft, setDraft] = useState<Filters>(NO_F)
  const [f, setF] = useState<Filters>(NO_F)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [view, setView] = useState<ReconRow | null>(null)
  const [edit, setEdit] = useState<ReconRow | null>(null)
  const [newName, setNewName] = useState('')
  const [newVertical, setNewVertical] = useState(details.vertical)
  const [holdOpen, setHoldOpen] = useState(false)
  const [holdReason, setHoldReason] = useState('')
  const closeView = useCallback(() => setView(null), [])
  const closeEdit = useCallback(() => setEdit(null), [])
  const closeHold = useCallback(() => setHoldOpen(false), [])

  const options = state.batches.filter((b) => b.type === 'Auto Reconciliation' && b.fy === details.fy && (!details.month || b.month === details.month)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const batch = options.find((b) => b.id === batchId) ?? options[0]
  const rows = batch ? buildRecon(state, ext, batch) : []
  const filtered = rows.filter(
    (r) => (!f.atm || r.atmId === f.atm) && (!f.site || r.siteId === f.site) && (!f.fr || r.frName.toLowerCase().includes(f.fr.toLowerCase())) && (!f.status || r.status === f.status),
  )
  const pageRows = filtered.slice((page - 1) * size, page * size)
  const unresolved = rows.filter((r) => r.critical).length
  const stale = rows.filter((r) => r.stale).length
  const locked = batch ? isLocked(batch) : true
  const block = batch ? approvalBlock(batch, can('Approve'), unresolved) : 'No batch'
  const counts = rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {})
  const suggested = suggestBatchName(details.month, 'auto')
  const createName = newName || suggested

  const create = () => {
    if (!details.month) return toast('Select the payout month first.', 'error')
    if (!can('Create')) return toast('Your role cannot create payout batches.', 'error')
    if (!createName.trim()) return toast('Batch name is required.', 'error')
    if (batchNameTaken(createName)) return toast('Batch name already exists — use a unique name.', 'error')
    const id = createAutoBatch(createName, details.fy, details.month, newVertical, { siteCategory: details.siteCategory || undefined, beneficiary: details.beneficiary || undefined })
    setBatchId(id)
    setNewName('')
    toast(`${createName} created from the month's manual / file sources`)
  }

  const doRecalc = () => {
    if (!batch) return
    if (!can('Edit')) return toast('Recalculate needs the Edit right.', 'error')
    try {
      const r = recalculate(batch)
      toast(`Recalculated: ${r.changed} line(s) changed, ${r.added} added`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Recalculation failed', 'error')
    }
  }

  const approve = () => {
    if (!batch) return
    if (block) return toast(block, 'error')
    setStatus(batch, 'Approved', 'Approved', `Checker ${actor()} · ${rows.length} ATM(s) · ${rows.filter((r) => r.resolution).length} resolved mismatch(es)`, { checker: actor() })
    toast(`${batch.name} approved — ready for release`)
  }

  const exportRecon = () => {
    if (!batch) return
    if (!can('Export') && !can('Download')) return toast('Your role cannot export.', 'error')
    const r2 = (p?: number) => (p === undefined ? '' : (p / 100).toFixed(2))
    downloadCsv(
      `${batch.name}_reconciliation`,
      ['S.N.', 'ATM ID', 'Site ID', 'Franchisee Name', 'Manual Payout', 'File-Based Payout', 'Auto Payout', 'Manual vs Auto', 'File vs Auto', 'Manual vs File', 'Reconciliation Status', 'All Issues', 'Resolved', 'Remarks'],
      filtered.map((r, i) => [String(i + 1), r.atmId, r.siteId, r.frName, r2(r.manual), r2(r.file), r2(r.auto), r2(r.mVsA), r2(r.fVsA), r2(r.mVsF), r.status, r.issues.join(' / '), r.resolution ? `Yes (${r.resolution.by})` : 'No', r.remarks]),
    )
    logPayout({ by: actor(), area: 'Monthly Payout', ref: batch.name, action: 'Reconciliation exported', after: `${filtered.length} rows` })
  }

  const atmOpts = [...new Set(rows.map((r) => r.atmId))]
  const siteOpts = [...new Set(rows.map((r) => r.siteId))]

  return (
    <div className="space-y-4">
      {/* filters (FY / month shared with the workspace details) */}
      <Panel>
        <div className="grid gap-3 px-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_1fr_1fr]">
          <div>
            <label htmlFor="ar-fy" className={lbl}>Financial Year *</label>
            <select id="ar-fy" className={sel} value={details.fy} onChange={(e) => { setDetails({ fy: e.target.value, month: '' }); setPage(1) }}>
              {FY_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ar-month" className={lbl}>Payout Month *</label>
            <select id="ar-month" className={sel} value={details.month} onChange={(e) => { setDetails({ month: e.target.value }); setBatchId(''); setPage(1) }}>
              <option value="">All months</option>
              {fyMonths(details.fy).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ar-batch" className={lbl}>Payout Batch Name *</label>
            <select id="ar-batch" className={sel} value={batch?.id ?? ''} onChange={(e) => { setBatchId(e.target.value); setPage(1) }}>
              {options.length === 0 && <option value="">No auto batch</option>}
              {options.map((b) => <option key={b.id} value={b.id}>{b.name} · {monthLabel(b.month)} · {b.status}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ar-atm" className={lbl}>ATM ID</label>
            <select id="ar-atm" className={sel} value={draft.atm} onChange={(e) => setDraft((d) => ({ ...d, atm: e.target.value }))}>
              <option value="">All</option>
              {atmOpts.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ar-site" className={lbl}>Site ID</label>
            <select id="ar-site" className={sel} value={draft.site} onChange={(e) => setDraft((d) => ({ ...d, site: e.target.value }))}>
              <option value="">All</option>
              {siteOpts.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid items-end gap-3 px-1 sm:grid-cols-2 lg:grid-cols-[2fr_1.6fr_auto]">
          <div>
            <label htmlFor="ar-fr" className={lbl}>Franchisee Name</label>
            <div className="flex h-9 items-center gap-2 rounded-md border border-line bg-white px-2.5">
              <Search size={14} className="text-muted" />
              <input id="ar-fr" value={draft.fr} placeholder="Search Franchisee..." onChange={(e) => setDraft((d) => ({ ...d, fr: e.target.value }))} className="w-full bg-transparent text-[12.5px] outline-none" />
            </div>
          </div>
          <div>
            <label htmlFor="ar-status" className={lbl}>Reconciliation Status</label>
            <select id="ar-status" className={sel} value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as Filters['status'] }))}>
              <option value="">All</option>
              {RECON_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="bright" icon={<Search size={14} />} onClick={() => { setF(draft); setPage(1) }}>Search</Button>
            <Button variant="secondary" icon={<RotateCcw size={14} />} onClick={() => { setDraft(NO_F); setF(NO_F); setPage(1) }}>Reset</Button>
          </div>
        </div>
      </Panel>

      {!batch && (
        <Panel>
          <SectionBar icon={<Plus size={15} />} title="Create Auto Reconciliation batch" />
          <p className="px-1 text-[12px] text-muted">
            {details.month ? `No Auto Reconciliation batch for ${monthLabel(details.month)} yet.` : 'Select a payout month.'} The engine calculates every ATM found in that month's Manual and File-Based batches (file transaction data first, else manual).
          </p>
          <div className="grid items-end gap-3 px-1 sm:grid-cols-[1.5fr_1fr_auto]">
            <div>
              <label htmlFor="ar-new" className={lbl}>Payout Batch Name *</label>
              <input id="ar-new" className={sel} value={createName} onChange={(e) => setNewName(e.target.value.toUpperCase().replace(/\s+/g, '_'))} />
              {batchNameTaken(createName) && <p className="mt-1 text-[11px] text-brand-red">Batch name already exists</p>}
            </div>
            <div>
              <label htmlFor="ar-vert" className={lbl}>Business Vertical *</label>
              <select id="ar-vert" className={sel} value={newVertical} onChange={(e) => setNewVertical(e.target.value as typeof newVertical)}>
                {VERTICALS.map((v) => <option key={v} value={v}>{VERTICAL_LABEL[v]}</option>)}
              </select>
            </div>
            <Button icon={<Plus size={14} />} disabled={!details.month} onClick={create}>Create &amp; Calculate</Button>
          </div>
        </Panel>
      )}

      {batch && (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['ATMs', rows.length, 'text-ink'],
              ['Matched', counts.Matched ?? 0, 'text-emerald-700'],
              ['Variance Found', counts['Variance Found'] ?? 0, 'text-amber-700'],
              ['Other exceptions', rows.length - (counts.Matched ?? 0) - (counts['Variance Found'] ?? 0), 'text-red-600'],
              ['Unresolved critical', unresolved, unresolved ? 'text-red-600' : 'text-emerald-700'],
              ['Auto net (₹)', amt(rows.reduce((s, r) => s + (r.auto ?? 0), 0)), 'text-primary'],
            ].map(([k, v, c]) => (
              <div key={k as string} className="rounded-xl border border-line bg-white px-3 py-2.5">
                <div className="text-[11px] text-muted">{k}</div>
                <div className={cn('text-[18px] font-bold tabular-nums', c as string)}>{v}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
            <Badge tone={toneFor(batch.status)}>{batch.status}</Badge>
            <span className="text-muted">
              {VERTICAL_LABEL[batch.vertical]} · maker {batch.maker}
              {batch.checker ? ` · checker ${batch.checker}` : ''}
            </span>
            <Link to={`/finance/payouts/monthly/${batch.id}`} className="font-semibold text-[#0066FF] hover:underline">Open batch detail</Link>
            <span className="ml-auto flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-amber-800">
              <Info size={12} />
              Variance tolerance: {rules.varianceTolerance === null ? 'not configured — pending Finance decision (§21-14); treated as ₹0.00' : `₹${amt(rules.varianceTolerance)}`}
            </span>
            {stale > 0 && !locked && <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-800">{stale} line(s) differ from the current plan — Recalculate</span>}
          </div>

          <Panel>
            <SectionBar icon={<Table2 size={15} />} title="ATM-wise Payout Reconciliation" />
            <div className="overflow-hidden rounded-lg border border-line">
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full min-w-[1250px] border-collapse">
                  <thead>
                    <tr className={theadRow}>
                      {['S.N.', 'ATM ID', 'Site ID', 'Franchisee Name', 'Manual Payout (₹)', 'File-Based Payout (₹)', 'Auto Payout (₹)', 'Manual vs Auto (₹)', 'File vs Auto (₹)', 'Manual vs File (₹)', 'Reconciliation Status', 'Remarks'].map((h) => (
                        <th key={h} className={thCls}>{h}</th>
                      ))}
                      <th className="px-3 py-2.5 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, i) => (
                      <tr key={r.atmId} className={tbodyRow}>
                        <td className={tdCls}>{(page - 1) * size + i + 1}</td>
                        <td className={`${tdCls} font-semibold`}>{r.atmId}</td>
                        <td className={tdCls}>{r.siteId}</td>
                        <td className={`${tdCls} text-left`}>{r.frName}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>{r.manual === undefined ? '—' : amt(r.manual)}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>{r.file === undefined ? '—' : amt(r.file)}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>
                          {r.auto === undefined ? '—' : amt(r.auto)}
                          {r.stale && !locked && <span className="ml-1 text-[10px] text-blue-700" title={`Current plan gives ${amt(r.live ?? 0)}`}>●</span>}
                        </td>
                        <td className={`${tdCls} text-right tabular-nums`}><Diff v={r.mVsA} /></td>
                        <td className={`${tdCls} text-right tabular-nums`}><Diff v={r.fVsA} /></td>
                        <td className={`${tdCls} text-right tabular-nums`}><Diff v={r.mVsF} /></td>
                        <td className={tdCls}><ReconBadge status={r.status} resolved={!!r.resolution} /></td>
                        <td className={`${tdCls} max-w-[200px] text-left text-[11px]`} title={r.issues.length > 1 ? `All issues: ${r.issues.join(', ')}` : undefined}>
                          {r.remarks}
                          {r.issues.length > 1 && <span className="ml-1 text-muted">(+{r.issues.length - 1})</span>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-center gap-3">
                            <button type="button" onClick={() => setView(r)} className="text-[#0066FF]" aria-label={`View ${r.atmId}`} title="View calculation & compare data"><Eye size={16} /></button>
                            <button
                              type="button"
                              onClick={() => (locked ? toast('Batch is approved — use an adjustment entry on the batch detail page.', 'info') : !can('Edit') ? toast('Resolving needs the Edit right.', 'error') : setEdit(r))}
                              className={cn(locked || !can('Edit') ? 'text-slate-300' : 'text-[#0066FF]')}
                              aria-label={`Resolve ${r.atmId}`}
                              title="Correct / resolve mismatch"
                            >
                              <Pencil size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pageRows.length === 0 && (
                      <tr><td colSpan={13} className="py-6 text-center text-[12px] text-muted">No ATMs match the filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={size} total={filtered.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1) }} />
            </div>
            <p className="px-1 text-[11px] text-muted">Manual vs Auto = Manual − Auto · File vs Auto = File − Auto · Manual vs File = Manual − File (§9.5). Amounts are net payout after adjustment entries.</p>
          </Panel>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {block && !approvedLike(batch.status) && <span className="mr-auto text-[11.5px] text-red-600">Approval blocked: {block}</span>}
            <Button variant="secondary" icon={<Download size={14} />} onClick={exportRecon}>Export (Excel)</Button>
            <Button variant="secondary" icon={<RefreshCw size={14} />} disabled={locked} onClick={doRecalc} title={locked ? 'Approved batches are not recalculated' : undefined}>Recalculate</Button>
            {batch.status === 'On Hold' ? (
              <Button variant="secondary" icon={<PlayCircle size={14} />} disabled={!can('Approve')} onClick={() => { unholdBatch(batch); toast('Hold released') }}>Release Hold</Button>
            ) : (
              <Button variant="danger" icon={<PauseCircle size={14} />} disabled={batch.status === 'Completed' || !can('Edit')} onClick={() => setHoldOpen(true)}>Hold Payout</Button>
            )}
            <Button variant="bright" icon={<Check size={14} />} disabled={!!block} title={block ?? undefined} onClick={approve}>Approve Payout</Button>
          </div>

          {(approvedLike(batch.status) || (batch.status === 'On Hold' && approvedLike(ext.meta[batch.id]?.holdFrom ?? 'Draft'))) && <ReleasePanel batch={batch} />}
        </>
      )}

      {view && batch && <ViewModal row={view} batch={batch} onClose={closeView} />}
      {edit && batch && <ResolveModal row={edit} batch={batch} onClose={closeEdit} />}
      {holdOpen && batch && (
        <Modal
          title="Hold payout"
          sub={`${batch.name} will not be approved or released while on hold.`}
          onClose={closeHold}
          footer={
            <>
              <Button variant="secondary" onClick={closeHold}>Cancel</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (holdReason.trim().length < 5) return toast('Give a reason (min 5 characters).', 'error')
                  holdBatch(batch, holdReason.trim())
                  setHoldOpen(false)
                  setHoldReason('')
                  toast(`${batch.name} put on hold`)
                }}
              >
                Hold
              </Button>
            </>
          }
        >
          <textarea aria-label="Hold reason" value={holdReason} maxLength={250} rows={3} onChange={(e) => setHoldReason(e.target.value)} placeholder="Reason" className="w-full rounded-md border border-line p-2 text-[12px] outline-none focus:border-primary" />
        </Modal>
      )}
    </div>
  )
}

// ── View: calculation breakdown + compare data ─────────────────────────────
function ViewModal({ row, batch, onClose }: { row: ReconRow; batch: PayoutBatch; onClose: () => void }) {
  const ext = useExt()
  const a = row.autoLine
  const p = a && batch.vertical === 'Franchise Model' ? planFor(a.atmId, batch.month) : undefined
  const c = a && p ? calcFranchise(p.plan, a.txn, a.ded, a.taxPct) : undefined
  const src = [row.manualLine, row.fileLine, row.autoLine]
  const txnKeys: { k: keyof TxnData; l: string }[] = [{ k: 'cash', l: 'Cash' }, { k: 'nonCash', l: 'Non Cash' }, { k: 'postCash', l: 'Post Cash' }, { k: 'postNonCash', l: 'Post Non Cash' }, { k: 'deposit', l: 'Deposit' }]
  const cmp: { l: string; v: (string | undefined)[] }[] = [
    ...txnKeys.map((t) => ({ l: t.l, v: src.map((s) => (s ? String(s.txn[t.k]) : undefined)) })),
    { l: 'Gross Revenue', v: src.map((s) => (s ? amt(s.gross) : undefined)) },
    ...(Object.keys(DEDUCTION_LABELS) as (keyof Deductions)[]).map((k) => ({ l: DEDUCTION_LABELS[k], v: src.map((s) => (s ? amt(s.ded[k] ?? 0) : undefined)) })),
    { l: 'FR Payout without TDS', v: src.map((s) => (s ? amt(s.withoutTds) : undefined)) },
    { l: 'TDS / GST %', v: src.map((s) => (s ? `${s.taxPct}%` : undefined)) },
    { l: 'TDS / GST Amount', v: src.map((s) => (s ? amt(s.taxAmt) : undefined)) },
    { l: 'Net Payout', v: src.map((s) => (s ? amt(s.net) : undefined)) },
  ]
  const adjs = ext.adjustments.filter((x) => x.batchId === batch.id && x.atmId === row.atmId)
  return (
    <Modal title={`${row.atmId} · ${row.frName}`} sub={`Site ${row.siteId} · ${monthLabel(batch.month)} · ${batch.name}`} onClose={onClose} width={860}>
      <div className="space-y-4 text-[12px]">
        <div className="flex flex-wrap gap-1.5">
          {row.issues.length ? row.issues.map((s) => <ReconBadge key={s} status={s} />) : <ReconBadge status="Matched" />}
          {row.resolution && <Badge tone="green">Resolved by {row.resolution.by}: {row.resolution.reason}</Badge>}
        </div>
        <section>
          <h4 className="mb-1.5 font-semibold text-primary">Calculation (Auto engine)</h4>
          {!a ? (
            <p className="text-muted">ATM is not in the auto batch — run Recalculate.</p>
          ) : batch.vertical === 'Business Model' ? (
            <p>BM engine: received payout − expenses (BM P&amp;L). Stored net {amt(a.net)}.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="mb-1 text-[11px] text-muted">{p?.source}</div>
                {c?.lines.map((l) => (
                  <div key={l.label} className="flex justify-between py-0.5"><span>{l.label}</span><span className="tabular-nums">{amt(l.amount)}</span></div>
                ))}
                <div className="flex justify-between py-0.5"><span>Net Franchisee</span><span className="tabular-nums">{amt(c?.netFranchisee ?? 0)}</span></div>
                <div className="flex justify-between py-0.5"><span>FR Payout without TDS</span><span className="tabular-nums">{amt(c?.withoutTds ?? 0)}</span></div>
                <div className="flex justify-between py-0.5"><span>TDS / GST @ {a.taxPct}%</span><span className="tabular-nums">−{amt(c?.taxAmt ?? 0)}</span></div>
                <div className="mt-1 flex justify-between border-t border-line pt-1 font-bold"><span>Net Payout (current plan)</span><span className="tabular-nums">{amt(c?.net ?? 0)}</span></div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="flex justify-between py-0.5"><span>Stored auto net</span><span className="tabular-nums">{amt(a.net)}</span></div>
                <div className="flex justify-between py-0.5"><span>Adjustment entries</span><span className="tabular-nums">{amt(adjs.reduce((s, x) => s + x.delta, 0))}</span></div>
                <div className="flex justify-between py-0.5 font-bold"><span>Payable (auto + adjustments)</span><span className="tabular-nums">{amt(row.auto ?? 0)}</span></div>
                <div className="flex justify-between py-0.5"><span>MF revenue</span><span className="tabular-nums">{amt(a.mfRevenue)}</span></div>
                <p className="mt-2 text-[11px] text-amber-800">Formula provisional — Finance sign-off pending.</p>
              </div>
            </div>
          )}
        </section>
        <section>
          <h4 className="mb-1.5 font-semibold text-primary">Compare data</h4>
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full border-collapse">
              <thead>
                <tr className={theadRow}>
                  {['Field', 'Manual', 'File-Based', 'Auto'].map((h) => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {cmp.map((r) => {
                  const vals = r.v.filter((x) => x !== undefined)
                  const differs = new Set(vals).size > 1
                  return (
                    <tr key={r.l} className={cn(tbodyRow, differs && 'bg-red-50/60')}>
                      <td className={`${tdCls} text-left font-medium`}>{r.l}</td>
                      {r.v.map((x, i) => <td key={i} className={`${tdCls} text-right tabular-nums`}>{x ?? '—'}</td>)}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
        {adjs.length > 0 && (
          <section>
            <h4 className="mb-1.5 font-semibold text-primary">Adjustment entries</h4>
            {adjs.map((x) => (
              <p key={x.id} className="text-[11.5px]">{new Date(x.at).toLocaleString('en-GB')} · {x.by} · {x.kind}: {amt(x.before)} → {amt(x.after)} — {x.reason}</p>
            ))}
          </section>
        )}
      </div>
    </Modal>
  )
}

// ── Edit: correct / resolve mismatch (audited) ─────────────────────────────
function ResolveModal({ row, batch, onClose }: { row: ReconRow; batch: PayoutBatch; onClose: () => void }) {
  const avail: { k: Accepted; v?: number }[] = [
    { k: 'Auto', v: row.auto },
    { k: 'Manual', v: row.manual },
    { k: 'File-Based', v: row.file },
    { k: 'Custom', v: undefined },
  ]
  const [acc, setAcc] = useState<Accepted>(row.auto !== undefined ? 'Auto' : 'Custom')
  const [custom, setCustom] = useState('')
  const [reason, setReason] = useState(row.resolution?.reason ?? '')
  const amount = acc === 'Custom' ? (custom ? toPaise(custom) : null) : (avail.find((a) => a.k === acc)?.v ?? null)

  const save = () => {
    if (reason.trim().length < 5) return toast('Reason is required (min 5 characters).', 'error')
    if (acc === 'Custom' && amount === null) return toast('Enter the corrected amount.', 'error')
    if (amount !== null && !row.autoLine) return toast('ATM is not in the auto batch — Recalculate first, or resolve without an amount.', 'error')
    // API mode: the server applies the accepted source onto the auto line itself (no separate adjustment call)
    if (apiEnabled) void apiResolve(batch.id, row.atmId, acc, amount, reason.trim())
    if (row.autoLine && amount !== null && amount !== row.auto) addAdjustment(batch, row.autoLine, amount, `Recon: accepted ${acc} — ${reason.trim()}`, 'Adjustment', !apiEnabled)
    extStore.set((x) => ({
      ...x,
      resolutions: { ...x.resolutions, [resKey(batch.id, row.atmId)]: { batchId: batch.id, atmId: row.atmId, status: row.status, accepted: acc, amount, reason: reason.trim(), by: actor(), at: nowIso() } },
    }))
    logPayout({ by: actor(), area: 'Monthly Payout · Reconciliation', ref: `${batch.name} / ${row.atmId}`, action: `Mismatch resolved (${row.status})`, before: row.auto === undefined ? '—' : amt(row.auto), after: `${acc}${amount !== null ? ` ${amt(amount)}` : ''} — ${reason.trim()}` })
    addTrail(batch.id, 'Mismatch resolved', `${row.atmId} (${row.issues.join(', ')}): ${acc} — ${reason.trim()}`)
    toast(`${row.atmId} resolved`)
    onClose()
  }
  const reopen = () => {
    if (apiEnabled) return toast('Re-opening a resolution is not supported by the server — record a new resolution instead.', 'error')
    extStore.set((x) => {
      const r = { ...x.resolutions }
      delete r[resKey(batch.id, row.atmId)]
      return { ...x, resolutions: r }
    })
    logPayout({ by: actor(), area: 'Monthly Payout · Reconciliation', ref: `${batch.name} / ${row.atmId}`, action: 'Resolution reopened', before: row.resolution?.reason })
    addTrail(batch.id, 'Resolution reopened', row.atmId)
    onClose()
  }

  return (
    <Modal
      title={`Resolve ${row.atmId}`}
      sub={`${row.issues.join(', ') || 'Matched'} · audited (old → new, reason, user)`}
      onClose={onClose}
      width={560}
      footer={
        <>
          {row.resolution && <Button variant="danger" onClick={reopen}>Reopen</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save resolution</Button>
        </>
      }
    >
      <div className="space-y-3 text-[12px]">
        <p className="text-muted">Choose the amount to pay. A different amount from Auto is recorded as an adjustment entry — the calculated line itself is never overwritten.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {avail.map((a) => (
            <label key={a.k} className={cn('flex cursor-pointer items-center justify-between rounded-md border px-3 py-2', acc === a.k ? 'border-primary bg-primary-soft' : 'border-line', a.k !== 'Custom' && a.v === undefined && 'cursor-not-allowed opacity-40')}>
              <span className="flex items-center gap-2">
                <input type="radio" name="acc" checked={acc === a.k} disabled={a.k !== 'Custom' && a.v === undefined} onChange={() => setAcc(a.k)} />
                {a.k === 'Custom' ? 'Corrected amount' : `${a.k} payout`}
              </span>
              <span className="tabular-nums">{a.k === 'Custom' ? '' : a.v === undefined ? '—' : amt(a.v)}</span>
            </label>
          ))}
        </div>
        {acc === 'Custom' && <input aria-label="Corrected amount" inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^\d.-]/g, ''))} placeholder="₹ 0.00" className="h-9 w-full rounded-md border border-line px-3 outline-none focus:border-primary" />}
        <div>
          <label htmlFor="res-reason" className={lbl}>Reason *</label>
          <textarea id="res-reason" value={reason} maxLength={250} rows={3} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fixed fee difference confirmed with Finance" className="w-full rounded-md border border-line p-2 outline-none focus:border-primary" />
        </div>
      </div>
    </Modal>
  )
}
