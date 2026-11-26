import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Download, Eye, RotateCcw, Upload, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { TextAreaField } from '@/components/ui/Form'
import { useRole } from '@/lib/rbac'
import { actorName, useWorkflow } from '@/data/workflow'
import { REVIEW_LABELS, WLA_STATUSES, exportWlaCsv, logWlaAccessAsync, periodLabel, processWlaAsync, reviewWlaAsync, useWlaStatements, wlaLoader, type WlaReviewCheck, type WlaStatement } from '@/data/wlaStatements'
import { fmtSize } from '@/components/ui/Form'
import { apiEnabled } from '@/data/opsApi'
import { opsMeLoader, rightsFor } from './eod2/access'
import { contains, dt } from './eod2/fmt'
import { Kpi, KV, NoAccess, Note, OpsPage, Panel, RoleTableCard, SearchBox, Sel, Status, TableWrap, TD, TH, TR, Tabs, Timeline } from './eod2/ui'

type Tab = 'queue' | 'master' | 'all'

/** WLA Statement Master + CRM / Finance verification queue (spec §6). */
export default function WlaStatementList() {
  const list = useWlaStatements()
  const load = wlaLoader.use()
  const role = useRole()
  opsMeLoader.use()
  const rights = rightsFor('WLA Statement', role)
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('queue')
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [openId, setOpenId] = useState<string | null>(null)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [processId, setProcessId] = useState<string | null>(null)
  const periods = useMemo(() => [...new Set(list.map((x) => x.period))].sort().reverse(), [list])
  const rows = useMemo(
    () =>
      list.filter(
        (x) =>
          (tab === 'queue' ? x.status === 'Pending Verification' : tab === 'master' ? x.status === 'Accepted' : true) &&
          (!period || x.period === period) &&
          (!status || x.status === status) &&
          contains(q, x.id, x.franchiseName, x.atmId, x.siteId, x.wlaAccount, x.file.name),
      ),
    [list, tab, period, status, q],
  )
  if (!rights.view) return <NoAccess module="WLA Statement" />
  const open = list.find((x) => x.id === openId)
  const reviewing = list.find((x) => x.id === reviewId)
  const paged = rows.slice((page - 1) * size, page * size)
  const reset = () => setPage(1)

  return (
    <OpsPage
      title="WLA Statement Management"
      sub="Franchises upload the bank statement of their mapped WLA account; CRM / Finance verify it and accepted statements are stored in the WLA Statement Master."
      back={{ to: '/operations', label: 'Operations' }}
      actions={
        <>
          {rights.export && (
            <Button variant="secondary" icon={<Download size={15} />} onClick={() => exportWlaCsv(rows)}>
              Export
            </Button>
          )}
          {(rights.verify || rights.create) && (
            <Button icon={<Upload size={15} />} onClick={() => navigate('/operations/wla-statement/upload')}>
              Upload on behalf of franchise
            </Button>
          )}
        </>
      }
    >
      {load.loading && <Note tone="blue">Loading WLA statements…</Note>}
      {load.error && <Note tone="red">Could not load WLA statements: {load.error}</Note>}
      <div className={`grid grid-cols-2 gap-3 ${WLA_STATUSES.length > 5 ? 'md:grid-cols-6' : 'md:grid-cols-5'}`}>
        {WLA_STATUSES.map((s) => (
          <Kpi key={s} label={s} value={list.filter((x) => x.status === s).length} tone={s === 'Accepted' ? 'green' : s === 'Rejected' ? 'red' : s === 'Returned' ? 'amber' : s === 'Replaced' ? 'gray' : 'navy'} />
        ))}
      </div>

      <Tabs
        value={tab}
        onChange={(t) => { setTab(t); setStatus(''); reset() }}
        tabs={[
          { id: 'queue', label: `Verification queue (${list.filter((x) => x.status === 'Pending Verification').length})` },
          { id: 'master', label: `WLA Statement Master (${list.filter((x) => x.status === 'Accepted').length})` },
          { id: 'all', label: 'All uploads & history' },
        ]}
      />
      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <SearchBox value={q} onChange={(v) => { setQ(v); reset() }} placeholder="Statement ID, franchise, ATM, account, file" />
          <Sel label="Period" value={period} onChange={(v) => { setPeriod(v); reset() }} options={periods} />
          {tab === 'all' && <Sel label="Status" value={status} onChange={(v) => { setStatus(v); reset() }} options={WLA_STATUSES} />}
        </div>
      </Panel>

      <Panel pad={false} title={`${rows.length} statement(s)`}>
        <TableWrap empty={!rows.length}>
          <thead className="bg-slate-50">
            <tr>
              {['ID / version', 'Franchise', 'ATM / Site', 'WLA account', 'Period', 'File', 'Uploaded', 'Validation', 'Status', 'Verifier', ''].map((h) => (
                <th key={h} className={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((x) => (
              <tr key={x.id} className={TR}>
                <td className={TD}>
                  <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setOpenId(x.id)}>
                    {x.id}
                  </button>
                  <div className="text-[10.5px] text-muted">v{x.version}{x.replaces ? ` · replaces ${x.replaces}` : ''}</div>
                </td>
                <td className={TD}>{x.franchiseName}</td>
                <td className={TD}>
                  {x.atmId}
                  <div className="text-[11px] text-muted">{x.siteId}</div>
                </td>
                <td className={TD}>
                  {x.wlaAccount}
                  <div className="text-[11px] text-muted">{x.bank}</div>
                </td>
                <td className={TD}>{periodLabel(x.period)}</td>
                <td className={TD}>
                  {x.file.name}
                  <div className="text-[11px] text-muted">{fmtSize(x.file.size)}{x.passwordProtected ? ' · password' : ''}</div>
                </td>
                <td className={TD}>
                  {dt(x.uploadedAt)}
                  <div className="text-[11px] text-muted">{x.channel}</div>
                </td>
                <td className={TD}>{x.checks.every((c) => c.ok) ? <Status text="All checks passed" tone="green" /> : <Status text={`${x.checks.filter((c) => !c.ok).length} failed`} tone="red" />}</td>
                <td className={TD}>
                  <Status text={x.status} tone={x.status === 'Returned' ? 'amber' : x.status === 'Replaced' ? 'gray' : undefined} />
                </td>
                <td className={TD}>{x.verifiedBy ? `${x.verifiedBy} · ${dt(x.verifiedAt)}` : '—'}</td>
                <td className={TD}>
                  <div className="flex gap-1.5">
                    {x.status === 'Pending Verification' && rights.verify && (
                      <Button size="sm" onClick={() => setReviewId(x.id)} disabled={x.uploadedBy === actorName()}>
                        Review
                      </Button>
                    )}
                    {x.status === 'Accepted' && rights.process && (
                      <Button size="sm" onClick={() => setProcessId(x.id)} disabled={x.uploadedBy === actorName() || x.verifiedBy === actorName()}>
                        Process
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" icon={<Eye size={13} />} onClick={() => { void logWlaAccessAsync(x.id, actorName(), 'View').catch(() => undefined); setOpenId(x.id) }}>
                      View
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Pagination page={page} pageSize={size} total={rows.length} onPage={setPage} onPageSize={(n) => { setSize(n); reset() }} noun="statements" />
      </Panel>
      <RoleTableCard modules={['WLA Statement']} />
      {open && <StatementDrawer x={open} all={list} onClose={() => setOpenId(null)} onReview={rights.verify && open.status === 'Pending Verification' ? () => { setOpenId(null); setReviewId(open.id) } : undefined} />}
      {reviewing && <ReviewModal x={reviewing} onClose={() => setReviewId(null)} />}
      {processId && <ProcessModal id={processId} onClose={() => setProcessId(null)} />}
    </OpsPage>
  )
}

function StatementDrawer({ x, all, onClose, onReview }: { x: WlaStatement; all: WlaStatement[]; onClose: () => void; onReview?: () => void }) {
  const wf = useWorkflow()
  const chain = all.filter((y) => y.rootId === x.rootId).sort((a, b) => a.version - b.version)
  const task = x.taskId ? wf.tasks.find((t) => t.id === x.taskId) : undefined
  return (
    <Modal
      title={`${x.id} · ${periodLabel(x.period)}`}
      sub={`${x.franchiseName} · ${x.atmId}`}
      onClose={onClose}
      width={860}
      footer={
        (apiEnabled && x.fileId) || onReview ? (
          <>
            {apiEnabled && x.fileId && (
              <Button variant="secondary" icon={<Download size={14} />} onClick={() => void logWlaAccessAsync(x.id, actorName(), 'Download').catch((e) => toast((e as Error).message, 'error'))}>
                Download statement
              </Button>
            )}
            {onReview && <Button onClick={onReview}>Review statement</Button>}
          </>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <KV
          cols={3}
          items={[
            ['Status', <Status key="s" text={x.status} />],
            ['WLA account', `${x.bank} · ${x.wlaAccount}`],
            ['Period', `${x.periodFrom} → ${x.periodTo}`],
            ['File', `${x.file.name} (${fmtSize(x.file.size)})`],
            ['Uploaded by', `${x.uploadedBy} · ${dt(x.uploadedAt)} · ${x.channel}`],
            ['Verifier', x.verifiedBy ? `${x.verifiedBy} · ${dt(x.verifiedAt)}` : '—'],
            ['Processed', x.processedBy ? `${x.processedBy} · ${dt(x.processedAt)}` : '—'],
            ['Reason', x.reason ?? '—'],
            ['Remarks', x.remarks ?? '—'],
            ['CRM task', task ? `${task.id} · ${task.status}` : x.taskId ?? '—'],
          ]}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Upload validation">
            <ul className="space-y-1.5 text-[12px]">
              {x.checks.map((c) => (
                <li key={c.key} className="flex items-start gap-2">
                  {c.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" /> : <XCircle size={14} className="mt-0.5 shrink-0 text-red-500" />}
                  <span>
                    {c.label}
                    {c.note && <span className="text-muted"> — {c.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="CRM / Finance review">
            {x.review ? (
              <ul className="space-y-1.5 text-[12px]">
                {(Object.keys(REVIEW_LABELS) as (keyof WlaReviewCheck)[]).map((k) => (
                  <li key={k} className="flex items-center gap-2">
                    {x.review![k] ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-red-500" />} {REVIEW_LABELS[k]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-muted">Not reviewed yet.</p>
            )}
          </Panel>
        </div>
        <Panel title="Replacement history" pad={false}>
          <TableWrap>
            <thead className="bg-slate-50">
              <tr>
                {['Version', 'ID', 'File', 'Uploaded', 'Status', 'Reason / verifier'].map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chain.map((y) => (
                <tr key={y.id} className={TR}>
                  <td className={TD}>v{y.version}</td>
                  <td className={TD}>{y.id}</td>
                  <td className={TD}>{y.file.name}</td>
                  <td className={TD}>{dt(y.uploadedAt)}</td>
                  <td className={TD}>
                    <Status text={y.status} />
                  </td>
                  <td className={`${TD} whitespace-normal`}>{y.reason ?? (y.verifiedBy ? `by ${y.verifiedBy}` : '—')}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Panel>
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Activity">
            <Timeline items={x.history.map((h) => ({ at: h.at, by: h.by, text: `${h.action}${h.remark ? ` — ${h.remark}` : ''}` }))} />
          </Panel>
          <Panel title={`View / download log (${x.access.filter((a) => a.action === 'View').length} views · ${x.access.filter((a) => a.action === 'Download').length} downloads)`}>
            {x.access.length ? <Timeline items={[...x.access].reverse().map((a) => ({ at: a.at, by: a.by, text: a.action }))} /> : <p className="text-[12px] text-muted">No views or downloads yet.</p>}
          </Panel>
        </div>
      </div>
    </Modal>
  )
}

function ProcessModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const go = async () => {
    const e = await processWlaAsync(id, note)
    if (e) return setErr(e)
    toast(`${id} processed and locked`)
    onClose()
  }
  return (
    <Modal title={`Process ${id}`} sub="Finance processing — the statement is locked afterwards." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={go}>Mark processed</Button></>}>
      <TextAreaField label="Processing note" required value={note} onChange={(e) => setNote(e.target.value)} />
      {err && (
        <div className="mt-2">
          <Note tone="red">{err}</Note>
        </div>
      )}
    </Modal>
  )
}

function ReviewModal({ x, onClose }: { x: WlaStatement; onClose: () => void }) {
  const [check, setCheck] = useState<WlaReviewCheck>({ readable: false, accountVisible: false, periodVisible: false, chequeVisible: false, documentCorrect: false })
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const decide = async (d: 'Accepted' | 'Returned' | 'Rejected') => {
    const e = await reviewWlaAsync(x.id, d, check, reason)
    if (e) return setErr(e)
    toast(`${x.id} marked ${d}`)
    onClose()
  }
  const allOk = Object.values(check).every(Boolean)
  return (
    <Modal
      title={`Review ${x.id}`}
      sub={`${x.franchiseName} · ${x.atmId} · ${periodLabel(x.period)} · ${x.bank} ${x.wlaAccount}`}
      onClose={onClose}
      width={620}
      footer={
        <>
          <Button variant="danger" icon={<XCircle size={14} />} onClick={() => decide('Rejected')}>Reject</Button>
          <Button variant="secondary" icon={<RotateCcw size={14} />} onClick={() => decide('Returned')}>Return</Button>
          <Button icon={<CheckCircle2 size={14} />} onClick={() => decide('Accepted')} disabled={!allOk}>Accept</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-dashed border-line bg-surface/50 p-4 text-center text-[12px] text-muted">
          Statement preview: <b className="text-ink">{x.file.name}</b>
          {x.passwordProtected && <div className="mt-1 text-amber-700">Password-protected — password shared by franchise at upload.</div>}
        </div>
        <div className="space-y-2">
          {(Object.keys(REVIEW_LABELS) as (keyof WlaReviewCheck)[]).map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 text-[12.5px]">
              <input type="checkbox" checked={check[k]} onChange={(e) => setCheck((c) => ({ ...c, [k]: e.target.checked }))} className="h-4 w-4 accent-[#1e3f95]" />
              {REVIEW_LABELS[k]}
            </label>
          ))}
        </div>
        <TextAreaField label="Reason / remark (required to return or reject)" value={reason} onChange={(e) => setReason(e.target.value)} />
        {err && <Note tone="red">{err}</Note>}
      </div>
    </Modal>
  )
}
