import { useEffect, useMemo, useState } from 'react'
import { apiEnabled } from '@/data/opsApi'
import { AlertTriangle, CheckCircle2, Download, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { cn } from '@/lib/cn'
import { useRole } from '@/lib/rbac'
import { useSites } from '@/data/network'
import { crmEodSites, type EodFunding } from '@/data/eodStore'
import { opsMeLoader, rightsFor, type OpsRights } from './eod2/access'
import {
  BUSINESS_CLOSE_NOTE, CURRENT_MONTH, FORMULA_PENDING_NOTE, MONTHS, acceptDifferenceAsync, approveMonthlyAsync, buildMonthly, correctDayAsync, exportMonthlyCsv, loadMonthlyRow, monthLabel, monthlyLoadState, reconcileMonthlyAsync, sourceOf, startReviewAsync, useMonthlyMeta, verifyMonthlyAsync,
  type MonthlyRow, type MonthlyStatus,
} from './eod2/monthly'
import { contains, dmy, inr, signedInr } from './eod2/fmt'
import { Kpi, KV, NoAccess, Note, OpsPage, Panel, RoleTableCard, SearchBox, Sel, Status, TableWrap, TD, TH, TR, Tabs, Timeline } from './eod2/ui'

const STATUSES: MonthlyStatus[] = ['Month open', 'Matched', 'Mismatch', 'Under Review', 'Corrected', 'Verified', 'Approved']

/** CRM Monthly EOD (§5.5) — source picked automatically from the site's funding model. */
export default function MonthlyEodList() {
  const role = useRole()
  opsMeLoader.use()
  const rights = rightsFor('Monthly EOD', role)
  const { sites } = useSites()
  const meta = useMonthlyMeta()
  const [month, setMonth] = useState<string>('2026-10')
  const [funding, setFunding] = useState<EodFunding>('Full Funding')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [openId, setOpenId] = useState<string | null>(null)

  const all = useMemo(() => crmEodSites(sites).map((s) => buildMonthly(s, month, meta)).filter((r): r is MonthlyRow => !!r), [sites, month, meta])
  const inModel = all.filter((r) => r.funding === funding)
  const rows = inModel.filter((r) => (!status || r.status === status) && contains(q, r.atmId, r.siteId, r.franchiseName))
  const open = openId ? all.find((r) => r.id === openId) : undefined
  if (!rights.view) return <NoAccess module="Monthly EOD" />
  const cnt = (s: MonthlyStatus) => inModel.filter((r) => r.status === s).length
  const paged = rows.slice((page - 1) * size, page * size)

  return (
    <OpsPage
      title="Monthly EOD — CRM"
      sub="Monthly EOD data is matched against the consolidated cash of the site's own funding model. Mismatches are highlighted for review / correction."
      back={{ to: '/operations/eod', label: 'EOD Management' }}
      actions={rights.export && <Button variant="secondary" icon={<Download size={15} />} onClick={() => exportMonthlyCsv(rows, `monthly-eod-${funding === 'Full Funding' ? 'cbr' : 'cash-loading'}-${month}`)}>Export</Button>}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Note tone="blue">{BUSINESS_CLOSE_NOTE}</Note>
        <Note tone="amber">{FORMULA_PENDING_NOTE}</Note>
      </div>
      {apiEnabled && monthlyLoadState(month) === 'loading' && <Note tone="blue">Loading Monthly EOD for {monthLabel(month)}…</Note>}
      {apiEnabled && monthlyLoadState(month) === 'error' && <Note tone="red">Could not load Monthly EOD for {monthLabel(month)}.</Note>}

      <Tabs
        value={funding}
        onChange={(f) => { setFunding(f); setPage(1); setStatus('') }}
        tabs={[
          { id: 'Full Funding', label: `Full Funding → source: ${sourceOf('Full Funding')} (${all.filter((r) => r.funding === 'Full Funding').length})` },
          { id: 'Self Funding', label: `Self Funding → source: ${sourceOf('Self Funding')} (${all.filter((r) => r.funding === 'Self Funding').length})` },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {STATUSES.map((s) => (
          <Kpi key={s} label={s} value={cnt(s)} tone={s === 'Mismatch' ? 'red' : s === 'Under Review' ? 'amber' : s === 'Approved' || s === 'Matched' ? 'green' : 'navy'} onClick={() => { setStatus((c) => (c === s ? '' : s)); setPage(1) }} active={status === s} />
        ))}
      </div>

      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1) }} placeholder="ATM, site or franchise" />
          <Sel label="Month" value={month} onChange={(v) => { setMonth(v); setPage(1) }} options={[...MONTHS]} all={null} />
          <Sel label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUSES} />
        </div>
      </Panel>

      <Panel title={`${monthLabel(month)} · ${funding} · ${rows.length} CRM site(s)`} sub={`Monthly EOD vs ${sourceOf(funding)} consolidated cash. Red rows have open mismatches.`} pad={false}>
        <TableWrap empty={!rows.length}>
          <thead className="bg-slate-50">
            <tr>
              {['ATM / Site', 'Franchise', 'Source', 'Source closing', 'EOD closing', 'Δ closing', 'Source loaded', 'EOD loaded', 'Mismatch days', 'Status', ''].map((h) => (
                <th key={h} className={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => {
              const d = r.totals.eod.closing - r.totals.source.closing
              return (
                <tr key={r.id} className={cn(TR, r.mismatchDays > 0 && 'bg-red-50/50')}>
                  <td className={TD}>
                    <div className="font-medium">{r.atmId}</div>
                    <div className="text-[11px] text-muted">{r.siteId}</div>
                  </td>
                  <td className={TD}>{r.franchiseName}</td>
                  <td className={TD}>
                    {r.source}
                    <div className="max-w-[220px] truncate text-[10.5px] text-muted" title={r.sourceOrigin}>{r.sourceOrigin}</div>
                  </td>
                  <td className={TD}>{inr(r.totals.source.closing)}</td>
                  <td className={TD}>{inr(r.totals.eod.closing)}</td>
                  <td className={cn(TD, d !== 0 && 'font-semibold text-red-600')}>{signedInr(d)}</td>
                  <td className={TD}>{inr(r.totals.source.loaded)}</td>
                  <td className={cn(TD, r.totals.eod.loaded !== r.totals.source.loaded && 'font-semibold text-red-600')}>{inr(r.totals.eod.loaded)}</td>
                  <td className={cn(TD, r.mismatchDays > 0 && 'font-bold text-red-600')}>{r.mismatchDays}</td>
                  <td className={TD}>
                    <Status text={r.status} tone={r.status === 'Mismatch' ? 'red' : r.status === 'Under Review' ? 'amber' : r.status === 'Month open' ? 'gray' : undefined} />
                  </td>
                  <td className={TD}>
                    <Button size="sm" variant="secondary" onClick={() => setOpenId(r.id)}>
                      Open
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
        <Pagination page={page} pageSize={size} total={rows.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1) }} noun="sites" />
      </Panel>
      <RoleTableCard modules={['Monthly EOD']} />
      {open && <MonthlyDetail row={open} rights={rights} onClose={() => setOpenId(null)} />}
    </OpsPage>
  )
}

function MonthlyDetail({ row, rights, onClose }: { row: MonthlyRow; rights: OpsRights; onClose: () => void }) {
  const [onlyMismatch, setOnlyMismatch] = useState(row.mismatchDays > 0)
  const [edit, setEdit] = useState<{ date: string; mode: 'correct' | 'accept' } | null>(null)
  const [note, setNote] = useState('')
  const canFix = rights.reconcile || rights.verify || rights.approve
  useEffect(() => {
    if (apiEnabled) void loadMonthlyRow(row.siteId, row.month).catch(() => undefined)
  }, [row.siteId, row.month])
  const days = onlyMismatch ? row.days.filter((d) => d.mismatch || d.corrected || d.accepted) : row.days
  const run = async (fn: () => Promise<string | null>, ok: string) => {
    const e = await fn()
    if (e && apiEnabled) return
    toast(e ?? ok, e ? 'error' : 'success')
  }
  const log = [
    ...row.meta.reviews,
    ...row.meta.corrections.map((c) => ({ at: c.at, by: c.by, text: `Corrected ${dmy(c.date)} ${c.field}: ${inr(c.old)} → ${inr(c.value)} — ${c.reason}` })),
    ...row.meta.accepted.map((a) => ({ at: a.at, by: a.by, text: `Accepted difference on ${dmy(a.date)} — ${a.reason}` })),
    ...(row.meta.verifiedAt ? [{ at: row.meta.verifiedAt, by: row.meta.verifiedBy!, text: 'Verified' }] : []),
    ...(row.meta.approvedAt ? [{ at: row.meta.approvedAt, by: row.meta.approvedBy!, text: 'Approved' }] : []),
  ].sort((a, b) => a.at.localeCompare(b.at))

  return (
    <Modal title={`Monthly EOD · ${row.atmId} · ${monthLabel(row.month)}`} sub={`${row.franchiseName} · ${row.funding} → ${row.source}`} onClose={onClose} width={1080}>
      <div className="space-y-4">
        <KV
          cols={4}
          items={[
            ['Status', <Status key="s" text={row.status} />],
            ['Source (auto)', row.source],
            ['Source feed', row.sourceOrigin],
            ['Mismatch days', <b key="m" className={row.mismatchDays ? 'text-red-600' : 'text-emerald-700'}>{row.mismatchDays}</b>],
            ['Source: loaded / dispensed', `${inr(row.totals.source.loaded)} / ${inr(row.totals.source.dispensed)}`],
            ['EOD: loaded / dispensed', `${inr(row.totals.eod.loaded)} / ${inr(row.totals.eod.dispensed)}`],
            ['Closing: source / EOD', `${inr(row.totals.source.closing)} / ${inr(row.totals.eod.closing)}`],
            ['Verified / approved', `${row.meta.verifiedBy ?? '—'} / ${row.meta.approvedBy ?? '—'}`],
          ]}
        />
        {row.status === 'Month open' && <Note tone="blue">{monthLabel(CURRENT_MONTH)} is still running — verification opens after month end.</Note>}

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[12px]">
            <input type="checkbox" checked={onlyMismatch} onChange={(e) => setOnlyMismatch(e.target.checked)} className="accent-[#1e3f95]" /> Show only mismatch / corrected days
          </label>
          <div className="ml-auto flex flex-wrap gap-2">
            {rights.verify && !row.meta.verifiedBy && (
              <Button size="sm" icon={<CheckCircle2 size={13} />} onClick={() => run(() => verifyMonthlyAsync(row), 'Monthly EOD verified — approval task created')} disabled={row.mismatchDays > 0 || row.status === 'Month open'}>
                Verify
              </Button>
            )}
            {rights.approve && row.meta.verifiedBy && !row.meta.approvedBy && (
              <Button size="sm" icon={<Lock size={13} />} onClick={() => run(() => approveMonthlyAsync(row), 'Monthly EOD approved')}>
                Approve
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-[360px] overflow-auto rounded-lg border border-line">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                {['Date', 'Opening', 'Src loaded', 'EOD loaded', 'Src dispensed', 'EOD dispensed', 'Src closing', 'EOD closing', 'Δ', 'Note', ''].map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const delta = d.eod.closing - d.source.closing
                const bad = (k: 'loaded' | 'dispensed' | 'closing') => d.eod[k] !== d.source[k] && !d.accepted
                return (
                  <tr key={d.date} className={cn(TR, d.mismatch && 'bg-red-50')}>
                    <td className={TD}>{dmy(d.date)}</td>
                    <td className={TD}>{inr(d.source.opening)}</td>
                    <td className={TD}>{inr(d.source.loaded)}</td>
                    <td className={cn(TD, bad('loaded') && 'font-bold text-red-600')}>{inr(d.eod.loaded)}</td>
                    <td className={TD}>{inr(d.source.dispensed)}</td>
                    <td className={cn(TD, bad('dispensed') && 'font-bold text-red-600')}>{inr(d.eod.dispensed)}</td>
                    <td className={TD}>{inr(d.source.closing)}</td>
                    <td className={cn(TD, bad('closing') && 'font-bold text-red-600')}>{inr(d.eod.closing)}</td>
                    <td className={cn(TD, delta !== 0 && 'text-red-600')}>{signedInr(delta)}</td>
                    <td className={`${TD} max-w-[200px] text-[11px] whitespace-normal text-muted`}>
                      {d.mismatch && <span className="inline-flex items-center gap-1 font-semibold text-red-600"><AlertTriangle size={12} /> Mismatch</span>}
                      {d.corrected && <div>Corrected by {d.corrected.by}</div>}
                      {d.accepted && <div className="text-emerald-700">Accepted: {d.accepted.reason}</div>}
                    </td>
                    <td className={TD}>
                      {canFix && !row.meta.verifiedBy && (d.mismatch || d.corrected) && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="secondary" onClick={() => setEdit({ date: d.date, mode: 'correct' })}>Correct</Button>
                          {d.mismatch && <Button size="sm" variant="ghost" onClick={() => setEdit({ date: d.date, mode: 'accept' })}>Accept Δ</Button>}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!days.length && <div className="p-6 text-center text-[12px] text-muted">No mismatch days — all days match the source.</div>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Review / correction workflow">
            {canFix && !row.meta.verifiedBy ? (
              <div className="space-y-2">
                <TextAreaField label="Review note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Checked CBR consolidated report; franchise to confirm 14-Oct closing" />
                <Button size="sm" onClick={() => void startReviewAsync(row, note).then((e) => { if (e) { if (!apiEnabled) toast(e, 'error') } else { toast('Review note added — resolution task created'); setNote('') } })}>
                  Add review note
                </Button>
                {apiEnabled && rights.reconcile && (
                  <Button size="sm" variant="secondary" className="ml-2" onClick={() => void reconcileMonthlyAsync(row, note).then((e) => { if (!e) { toast('Reconciliation note saved'); setNote('') } })}>
                    Save as reconciliation (Finance)
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-muted">{row.meta.verifiedBy ? 'Verified months are locked.' : 'View only for your role.'}</p>
            )}
          </Panel>
          <Panel title="History">{log.length ? <Timeline items={log} /> : <p className="text-[12px] text-muted">No reviews or corrections yet.</p>}</Panel>
        </div>
        <p className="text-[11px] text-muted">Source is read-only here; corrections change the Monthly EOD declaration, never the {row.source}.</p>
      </div>
      {edit && <FixModal row={row} date={edit.date} mode={edit.mode} onClose={() => setEdit(null)} />}
    </Modal>
  )
}

function FixModal({ row, date, mode, onClose }: { row: MonthlyRow; date: string; mode: 'correct' | 'accept'; onClose: () => void }) {
  const day = row.days.find((d) => d.date === date)!
  const [field, setField] = useState<'closing' | 'loaded' | 'dispensed'>(day.eod.closing !== day.source.closing ? 'closing' : day.eod.loaded !== day.source.loaded ? 'loaded' : 'dispensed')
  const [value, setValue] = useState(String(day.source[field]))
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const save = async () => {
    const e = mode === 'correct' ? await correctDayAsync(row, date, field, Number(value), reason) : await acceptDifferenceAsync(row, date, reason)
    if (e) return setErr(e)
    toast(mode === 'correct' ? `Corrected ${dmy(date)} ${field}` : `Difference on ${dmy(date)} accepted`)
    onClose()
  }
  return (
    <Modal title={mode === 'correct' ? `Correct EOD value · ${dmy(date)}` : `Accept difference · ${dmy(date)}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="space-y-3">
        {mode === 'correct' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Field" value={field} onChange={(e) => { const f = e.target.value as typeof field; setField(f); setValue(String(day.source[f])) }} options={['closing', 'loaded', 'dispensed']} />
            <TextField label={`EOD ${field} (₹) — now ${inr(day.eod[field])}, source ${inr(day.source[field])}`} type="number" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
        )}
        <TextAreaField label={mode === 'correct' ? 'Correction reason' : 'Why is the difference accepted?'} required value={reason} onChange={(e) => setReason(e.target.value)} />
        {err && <Note tone="red">{err}</Note>}
      </div>
    </Modal>
  )
}
