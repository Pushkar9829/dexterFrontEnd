// Release & UTR (§9.7, §17): Payment Ready / Released / Failed / On Hold; UTR Pending / Paid / Reconciled.
// UTRs are payment records kept beside the approved batch — the approved lines are never rewritten.
import { useCallback, useState } from 'react'
import { Banknote, CheckCheck, ListChecks, PauseCircle, RotateCcw, Send, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { can } from '@/lib/rbac'
import { apiEnabled } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { usePayout, type PayoutBatch, type PayoutLine } from '@/data/payout'
import { UTR_RE, actor, amt, confirmFailure, effNet, fmtDate, isOwnAdjustment, releaseOf, setRelease, useExt, type PayState, type UtrState } from './lib'
import { Panel, SectionBar, tbodyRow, tdCls, thCls, theadRow } from './ui'

const PAY_TONE: Record<PayState, 'blue' | 'green' | 'red' | 'amber'> = { Ready: 'blue', Released: 'green', Failed: 'red', 'On Hold': 'amber' }
const UTR_TONE: Record<UtrState, 'amber' | 'blue' | 'green'> = { Pending: 'amber', Paid: 'blue', Reconciled: 'green' }
const today = () => new Date().toISOString().slice(0, 10)

export function ReleasePanel({ batch }: { batch: PayoutBatch }) {
  const { lines: all } = usePayout()
  const ext = useExt()
  const lines = all.filter((l) => l.batchId === batch.id)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [utrDraft, setUtrDraft] = useState<Record<string, string>>({})
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulk, setBulk] = useState('')
  const closeBulk = useCallback(() => setBulkOpen(false), [])
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const editable = can('Edit') && batch.status !== 'On Hold'
  const rel = (l: PayoutLine) => releaseOf(l, batch, ext)
  const rows = lines.slice((page - 1) * size, page * size)
  const count = <K extends string>(f: (l: PayoutLine) => K) => lines.reduce<Record<string, number>>((m, l) => ({ ...m, [f(l)]: (m[f(l)] ?? 0) + 1 }), {})
  const pays = count((l) => rel(l).pay)
  const utrs = count((l) => rel(l).utrStatus)
  const selected = lines.filter((l) => sel.has(l.id))
  // Manual failure (reason required) and its second-user confirmation.
  const [failOpen, setFailOpen] = useState<{ reason: string; error: string } | null>(null)
  const [confirmFor, setConfirmFor] = useState<{ line: PayoutLine; reason: string; error: string } | null>(null)
  const me = getSession()?.userId ?? actor()
  // Segregation of duties (enforced by the server): the batch maker / submitter and anyone who requested an
  // adjustment on a line of this batch cannot release it.
  const meta = ext.meta[batch.id]
  const batchAdjs = ext.adjustments.filter((a) => a.batchId === batch.id)
  const isMaker = apiEnabled ? !!getSession()?.userId && (meta?.makerId === getSession()?.userId || meta?.submittedBy === getSession()?.userId) : batch.maker === actor()
  const isAdjuster = batchAdjs.some((a) => a.status !== 'Rejected' && isOwnAdjustment(a))
  const pendingAdjLines = new Set(batchAdjs.filter((a) => a.status === 'Pending').map((a) => a.lineId)).size
  const failFilter = (l: PayoutLine) => rel(l).pay === 'Released' && rel(l).utrStatus !== 'Reconciled'
  const markFailed = () => {
    if (!failOpen) return
    if (failOpen.reason.trim().length < 3) return setFailOpen({ ...failOpen, error: 'A reason is required to mark a payment Failed.' })
    const target = (selected.length ? selected : lines).filter(failFilter)
    if (!target.length) {
      setFailOpen(null)
      return toast('Select released lines without a credited (reconciled) UTR — a credited line can never be marked Failed.', 'error')
    }
    const reason = failOpen.reason.trim()
    setRelease(batch, target, (r) => ({ ...r, pay: 'Failed', utrStatus: 'Pending', utr: undefined, failReason: reason, failSource: 'Manual', failMarkedBy: me }), 'Payment failed')
    setSel(new Set())
    setFailOpen(null)
    toast(`${target.length} line(s) marked Failed — another user must confirm before they are re-released`, 'info')
  }
  const doConfirm = async () => {
    if (!confirmFor) return
    if (confirmFor.reason.trim().length < 3) return setConfirmFor({ ...confirmFor, error: 'Give the confirmation reason (at least 3 characters).' })
    if (await confirmFailure(batch, confirmFor.line, confirmFor.reason)) {
      toast(`Failure confirmed for ${confirmFor.line.atmId} — the line will be re-sent on the next release`)
      setConfirmFor(null)
    }
  }

  const act = (filter: (l: PayoutLine) => boolean, patch: Parameters<typeof setRelease>[2], action: string, none: string) => {
    const target = (selected.length ? selected : lines).filter(filter)
    if (!target.length) {
      toast(none, 'error')
      return
    }
    setRelease(batch, target, patch, action)
    setSel(new Set())
    toast(`${action}: ${target.length} line(s)`)
  }

  const saveUtr = (l: PayoutLine) => {
    const u = (utrDraft[l.id] ?? '').trim().toUpperCase()
    if (!UTR_RE.test(u)) {
      toast('UTR must be 8–22 letters / digits.', 'error')
      return
    }
    setRelease(batch, [l], (r) => ({ ...r, utr: u, utrStatus: 'Paid', paidDate: r.paidDate ?? today() }), 'UTR entered')
    setUtrDraft((d) => {
      const n = { ...d }
      delete n[l.id]
      return n
    })
    toast(`UTR saved for ${l.atmId}`)
  }

  const applyBulk = () => {
    const byAtm = new Map(lines.map((l) => [l.atmId.toUpperCase(), l]))
    const ok: { l: PayoutLine; utr: string }[] = []
    const bad: string[] = []
    bulk
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s, i) => {
        const [atm, utr] = s.split(/[,\t;]\s*|\s+/)
        const l = byAtm.get((atm ?? '').toUpperCase())
        const u = (utr ?? '').toUpperCase()
        if (!l) bad.push(`line ${i + 1}: ATM ${atm} not in batch`)
        else if (rel(l).pay !== 'Released') bad.push(`line ${i + 1}: ${atm} not released`)
        else if (!UTR_RE.test(u)) bad.push(`line ${i + 1}: invalid UTR`)
        else ok.push({ l, utr: u })
      })
    if (!ok.length) {
      toast(bad[0] ?? 'Nothing to apply', 'error')
      return
    }
    const map = new Map(ok.map((o) => [o.l.id, o.utr]))
    setRelease(batch, ok.map((o) => o.l), (r, l) => ({ ...r, utr: map.get(l.id), utrStatus: 'Paid', paidDate: r.paidDate ?? today() }), 'Bulk UTR upload')
    setBulkOpen(false)
    setBulk('')
    toast(`${ok.length} UTR(s) applied${bad.length ? `, ${bad.length} skipped (${bad.slice(0, 2).join('; ')})` : ''}`, bad.length ? 'info' : 'success')
  }

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <Panel>
      <SectionBar icon={<Banknote size={15} />} title="Release & UTR" right={<span className="text-[11px] text-muted">{selected.length ? `${selected.length} selected` : 'Actions apply to all lines when none selected'}</span>} />
      <div className="flex flex-wrap gap-2 px-1 text-[11px]">
        {(['Ready', 'Released', 'Failed', 'On Hold'] as PayState[]).map((p) => (
          <Badge key={p} tone={PAY_TONE[p]}>
            {p}: {pays[p] ?? 0}
          </Badge>
        ))}
        <span className="mx-1 text-line">|</span>
        {(['Pending', 'Paid', 'Reconciled'] as UtrState[]).map((u) => (
          <Badge key={u} tone={UTR_TONE[u]}>
            UTR {u}: {utrs[u] ?? 0}
          </Badge>
        ))}
      </div>
      {batch.status === 'On Hold' && <p className="rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">Batch is on hold — release the hold to continue payment.</p>}
      {(isMaker || isAdjuster) && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
          <b>You cannot release this batch</b> (segregation of duties):{' '}
          {isMaker ? 'you created or submitted it' : 'you requested an adjustment on one of its lines'} — another checker must release it. The server refuses the release with “Maker-checker”.
        </p>
      )}
      {pendingAdjLines > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          {pendingAdjLines} line(s) have an adjustment awaiting approval — they are held (not released) until the adjustment is approved or rejected.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!editable} icon={<Send size={13} />} onClick={() => act((l) => rel(l).pay === 'Ready', (r) => ({ ...r, pay: 'Released', utrStatus: r.utr ? 'Paid' : 'Pending' }), 'Payment released', 'No Ready lines to release')}>
          Release
        </Button>
        <Button size="sm" variant="secondary" disabled={!editable} icon={<ListChecks size={13} />} onClick={() => setBulkOpen(true)}>
          Bulk UTR
        </Button>
        <Button size="sm" variant="secondary" disabled={!editable} icon={<CheckCheck size={13} />} onClick={() => act((l) => rel(l).utrStatus === 'Paid', (r) => ({ ...r, utrStatus: 'Reconciled' }), 'UTR reconciled', 'No Paid lines (UTR entered) to reconcile')}>
          Mark Reconciled
        </Button>
        <Button size="sm" variant="secondary" disabled={!editable} icon={<PauseCircle size={13} />} onClick={() => act((l) => rel(l).pay === 'Ready' || rel(l).pay === 'Failed', (r) => ({ ...r, pay: 'On Hold' }), 'Line payment held', 'Only Ready / Failed lines can be held')}>
          Hold
        </Button>
        <Button size="sm" variant="danger" disabled={!editable} icon={<XCircle size={13} />} onClick={() => setFailOpen({ reason: '', error: '' })}>
          Mark Failed
        </Button>
        <Button size="sm" variant="ghost" disabled={!editable} icon={<RotateCcw size={13} />} onClick={() => act((l) => rel(l).pay === 'Failed' || rel(l).pay === 'On Hold', (r) => ({ ...r, pay: 'Ready' }), 'Back to Ready', 'No Failed / On Hold lines')}>
          Back to Ready
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className={theadRow}>
                <th className={thCls}>
                  <input
                    type="checkbox"
                    aria-label="Select page"
                    checked={rows.length > 0 && rows.every((l) => sel.has(l.id))}
                    onChange={(e) => {
                      const on = e.target.checked
                      setSel((s) => {
                        const n = new Set(s)
                        rows.forEach((l) => (on ? n.add(l.id) : n.delete(l.id)))
                        return n
                      })
                    }}
                  />
                </th>
                {['ATM ID', 'Franchisee', 'Net Payable (₹)', 'Payment', 'UTR', 'UTR Status', 'Paid Date'].map((h) => (
                  <th key={h} className={thCls}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const r = rel(l)
                return (
                  <tr key={l.id} className={tbodyRow}>
                    <td className={tdCls}>
                      <input type="checkbox" aria-label={`Select ${l.atmId}`} checked={sel.has(l.id)} onChange={() => toggle(l.id)} />
                    </td>
                    <td className={`${tdCls} font-semibold`}>{l.atmId}</td>
                    <td className={`${tdCls} text-left`}>{l.frName}</td>
                    <td className={`${tdCls} text-right tabular-nums`}>{amt(effNet(l, ext.adjustments))}</td>
                    <td className={tdCls}>
                      <Badge tone={PAY_TONE[r.pay]}>{r.pay}</Badge>
                      {r.pay === 'Failed' && (
                        <div className="mt-1 max-w-[260px] text-[10.5px] leading-snug text-ink-2">
                          {r.failReason && <div title={r.failReason} className="truncate">Reason: {r.failReason}</div>}
                          {r.failSource === 'Manual' ? (
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge tone="amber">Awaiting 2nd-user confirmation</Badge>
                              {r.failMarkedBy === me ? (
                                <span className="text-muted">another user must confirm</span>
                              ) : (
                                can('Approve') && (
                                  <button type="button" className="font-semibold text-[#0066FF]" onClick={() => setConfirmFor({ line: l, reason: '', error: '' })}>
                                    Confirm failure
                                  </button>
                                )
                              )}
                            </div>
                          ) : r.failSource ? (
                            <div className="text-muted">{r.failSource === 'Provider' ? 'Reported by the bank' : 'Confirmed by a second user'} · re-sent on next release</div>
                          ) : null}
                        </div>
                      )}
                      {r.pay === 'On Hold' && r.holdReason && <div className="mt-1 max-w-[260px] truncate text-[10.5px] text-amber-800" title={r.holdReason}>{r.holdReason}</div>}
                    </td>
                    <td className={tdCls}>
                      {r.pay === 'Released' && r.utrStatus === 'Pending' && editable ? (
                        <span className="inline-flex items-center gap-1">
                          <input
                            aria-label={`UTR for ${l.atmId}`}
                            value={utrDraft[l.id] ?? ''}
                            maxLength={22}
                            placeholder="Enter UTR"
                            onChange={(e) => {
                              const v = e.target.value.toUpperCase()
                              setUtrDraft((d) => ({ ...d, [l.id]: v }))
                            }}
                            className="h-7 w-36 rounded border border-line px-2 text-[11.5px] outline-none focus:border-primary"
                          />
                          <button type="button" onClick={() => saveUtr(l)} className="text-[11px] font-semibold text-[#0066FF]">
                            Save
                          </button>
                        </span>
                      ) : (
                        <span className="font-mono text-[11px]">{r.utr ?? '—'}</span>
                      )}
                    </td>
                    <td className={tdCls}>
                      <Badge tone={UTR_TONE[r.utrStatus]}>{r.utrStatus}</Badge>
                    </td>
                    <td className={tdCls}>{fmtDate(r.paidDate)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={size} total={lines.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1) }} noun="lines" />
      </div>
      {failOpen && (
        <Modal
          title="Mark payment Failed"
          sub={`${selected.length ? `${selected.filter(failFilter).length} selected` : 'All released'} line(s) without a credited UTR. A second user must confirm a manual failure before the line is re-released.`}
          onClose={() => setFailOpen(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setFailOpen(null)}>Cancel</Button>
              <Button variant="danger" onClick={markFailed}>Mark Failed</Button>
            </>
          }
        >
          <label htmlFor="fail-reason" className="mb-1.5 block text-[11px] font-semibold">Reason (required — e.g. bank return reason) *</label>
          <textarea id="fail-reason" value={failOpen.reason} maxLength={300} rows={3} onChange={(e) => setFailOpen({ reason: e.target.value, error: '' })} className="w-full rounded-md border border-line p-2 text-[12px] outline-none focus:border-primary" />
          {failOpen.error && <p className="mt-1 text-[11.5px] text-red-600">{failOpen.error}</p>}
        </Modal>
      )}
      {confirmFor && (
        <Modal
          title={`Confirm failure — ${confirmFor.line.atmId}`}
          sub="Dual control: you confirm the failure entered by another user. The line is then re-sent on the next release."
          onClose={() => setConfirmFor(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmFor(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => void doConfirm()}>Confirm failure</Button>
            </>
          }
        >
          <label htmlFor="confirm-reason" className="mb-1.5 block text-[11px] font-semibold">Confirmation note (required) *</label>
          <textarea id="confirm-reason" value={confirmFor.reason} maxLength={500} rows={3} onChange={(e) => setConfirmFor({ ...confirmFor, reason: e.target.value, error: '' })} className="w-full rounded-md border border-line p-2 text-[12px] outline-none focus:border-primary" />
          {confirmFor.error && <p className="mt-1 text-[11.5px] text-red-600">{confirmFor.error}</p>}
        </Modal>
      )}
      {bulkOpen && (
        <Modal
          title="Bulk UTR"
          sub="One line per payment: ATM ID, UTR. Only released lines are updated."
          onClose={closeBulk}
          footer={
            <>
              <Button variant="secondary" onClick={closeBulk}>
                Cancel
              </Button>
              <Button onClick={applyBulk}>Apply UTRs</Button>
            </>
          }
        >
          <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={8} placeholder={'MPZA1234, HDFCN26100512345\nMPZA1235, HDFCN26100512346'} className="w-full rounded-md border border-line p-2 font-mono text-[12px] outline-none focus:border-primary" />
        </Modal>
      )}
    </Panel>
  )
}
