import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextAreaField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import {
  CURRENT_USER,
  RECURRING_ADVICE,
  RECURRING_LABEL,
  complaintStore,
  fmtDT,
  fmtDay,
  isOpen,
  istDay,
  nextTaskId,
  nowMs,
  repeatOf,
  sla,
  updateComplaint,
  type Complaint,
} from '@/data/complaints'
import { MODEL_INFO, recStore, reviewStore, type RecStatus, type Recommendation } from '@/data/complaintsAi'
import { BarRow, Banner, CHART, ComplaintsShell, GridCard, KV, Kpi, Panel, ViewAll, BASE, useNow, LinkBtn } from './shared'
import { daysBetween } from './filters'

type RecFilter = 'Highlighted' | RecStatus | 'All'
const recTone = (s: RecStatus): Tone => (s === 'Accepted' ? 'green' : s === 'Rejected' ? 'red' : 'blue')

export default function AiDashboard() {
  const all = complaintStore.use()
  const recs = recStore.use()
  const reviews = reviewStore.use()
  const now = useNow()
  const [showAllQueue, setShowAllQueue] = useState(false)
  const [recFilter, setRecFilter] = useState<RecFilter>('Highlighted')
  const [reviewing, setReviewing] = useState<Complaint | null>(null)
  const nav = useNavigate()
  const [recModal, setRecModal] = useState<{ rec: Recommendation; mode: 'review' | 'reject' } | null>(null)

  const d = useMemo(() => {
    const open = all.filter((c) => isOpen(c) && c.ai)
    const breached = open.filter((c) => sla(c, now).breached)
    const escalated = open.filter((c) => c.escalationLevel >= 2)
    const highRisk = open.filter((c) => c.ai!.score >= 80)
    const predBreach = open.filter((c) => !sla(c, now).breached && c.ai!.prediction === 'SLA breach' && c.ai!.horizonH <= 24)
    const predEsc = open.filter((c) => /escalation/i.test(c.ai!.prediction) && c.ai!.horizonH <= 24)
    const drivers: Record<string, number> = {}
    predBreach.forEach((c) => (drivers[c.ai!.driver] = (drivers[c.ai!.driver] ?? 0) + 1))
    const period = all.filter((c) => istDay(c.receivedAt) >= '2026-10-01' && istDay(c.receivedAt) <= '2026-10-06')
    const repeats = period.filter((c) => repeatOf(c, all))
    const pat: Record<string, Complaint[]> = {}
    repeats.forEach((c) => (pat[c.category] ??= []).push(c))
    const patterns = Object.entries(pat).sort((a, b) => b[1].length - a[1].length)
    const queue = [...open].sort((a, b) => b.ai!.score - a.ai!.score)
    return { open, breached, escalated, highRisk, predBreach, predEsc, drivers: Object.entries(drivers).sort((a, b) => b[1] - a[1]), repeats, patterns, queue }
  }, [all, now])

  const accepted = recs.filter((r) => r.status === 'Accepted')
  const pending = recs.filter((r) => r.status === 'Needs review')
  const rejected = recs.filter((r) => r.status === 'Rejected')

  const trend = daysBetween('2026-10-01', istDay(now)).map((day) => {
    const end = Date.parse(`${day}T23:59:59+05:30`)
    const issued = recs.filter((r) => Date.parse(r.issuedAt) <= end).length
    const acc = recs.filter((r) => r.status === 'Accepted' && r.decidedAt && Date.parse(r.decidedAt) <= end).length
    return { day: fmtDay(`${day}T12:00:00+05:30`), 'Accepted recommendations (%)': issued ? Math.round((acc / issued) * 100) : 0 }
  })

  const accept = (r: Recommendation) => {
    const id = nextTaskId(recs.flatMap((x) => (x.taskId ? [x.taskId] : [])))
    const at = new Date(now).toISOString()
    recStore.set((xs) => xs.map((x) => (x.id === r.id ? { ...x, status: 'Accepted', decidedAt: at, decidedBy: CURRENT_USER, taskId: id } : x)))
    if (r.complaintId)
      updateComplaint(
        r.complaintId,
        (c) => ({ tasks: [...c.tasks, { id, title: r.title, owner: r.owner, due: new Date(now + 24 * 3_600_000).toISOString(), dependency: 'AI recommendation' }], lastAction: `AI recommendation accepted · ${id}` }),
        { title: 'AI recommendation accepted', meta: `${CURRENT_USER} · ${r.id} · ${id} created for ${r.owner}` },
      )
    toast(`Accepted · ${id} created for ${r.owner}`)
  }
  const reject = (r: Recommendation, reason: string) => {
    recStore.set((xs) => xs.map((x) => (x.id === r.id ? { ...x, status: 'Rejected', decidedAt: new Date(now).toISOString(), decidedBy: CURRENT_USER, rejectReason: reason } : x)))
    toast(`${r.id} rejected`, 'info')
  }
  const reconsider = (r: Recommendation) => recStore.set((xs) => xs.map((x) => (x.id === r.id ? { ...x, status: 'Needs review', decidedAt: undefined, decidedBy: undefined, rejectReason: undefined } : x)))

  const shownRecs = recs.filter((r) => (recFilter === 'All' ? true : recFilter === 'Highlighted' ? r.highlighted : r.status === recFilter))

  const cols: GridColumn<Complaint>[] = [
    { key: 'id', header: 'Complaint ID', width: 120, render: (c) => <Link to={`${BASE}/${c.id}`} className="font-medium text-primary hover:underline">{c.id}</Link> },
    { key: 'pred', header: 'Prediction / reason', width: 520, value: (c) => `${c.ai!.prediction} · ${c.ai!.reason}` },
    { key: 'score', header: 'Risk score', width: 110, sortable: true, value: (c) => c.ai!.score, render: (c) => `${c.ai!.score} / 100` },
    { key: 'conf', header: 'Confidence', width: 110, sortable: true, value: (c) => c.ai!.confidence, render: (c) => `${c.ai!.confidence}%` },
    { key: 'horizon', header: 'Horizon', width: 110, value: (c) => c.ai!.horizon },
    {
      key: 'review',
      header: 'Review',
      width: 150,
      value: (c) => reviews[c.id]?.verdict ?? 'Pending',
      render: (c) => (
        <button type="button" onClick={() => setReviewing(c)} className="hover:text-primary hover:underline">
          {reviews[c.id] ? (reviews[c.id].verdict === 'Agree' ? 'Agreed' : 'Disagreed') : 'Review'}
        </button>
      ),
    },
  ]

  const exportQueue = () =>
    downloadCsv(
      'ai-risk-queue',
      ['Complaint ID', 'Prediction', 'Reason', 'Risk score', 'Confidence', 'Horizon', 'Driver', 'Review'],
      d.queue.map((c) => [c.id, c.ai!.prediction, c.ai!.reason, String(c.ai!.score), `${c.ai!.confidence}%`, c.ai!.horizon, c.ai!.driver, reviews[c.id]?.verdict ?? 'Pending']),
    )

  return (
    <ComplaintsShell title="AI Dashboard" sub="Review predicted service risks and turn preventive recommendations into accountable actions." onExport={exportQueue}>
      <Banner tone="blue" lead="Decision support">
        Predictions are not confirmed outcomes. Scores use complaint age, SLA, asset history and dependencies. Human approval is required for every action.
      </Banner>

      <div className="mb-5 grid grid-cols-2 items-start gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="High AI risk" value={d.highRisk.length} caption={`Of ${d.open.length} open · Risk score ≥ 80`} />
        <Kpi label="Predicted SLA breaches" value={d.predBreach.length} tone="red" caption={`Next 24h · Excludes ${d.breached.length} already breached`} />
        <Kpi label="Predicted escalations" value={d.predEsc.length} caption={`Next 24h · Excludes ${d.escalated.length} active escalations`} />
        <Kpi label="Recurring patterns" value={d.patterns.length} caption={`${d.repeats.length} repeats · ${new Set(d.repeats.map((c) => c.atmId)).size} affected ATMs`} />
        <Kpi label="Preventive recommendations" value={recs.length} caption={`${accepted.length} accepted · ${pending.length} pending · ${rejected.length} rejected`} />
        <Kpi label="AI acceptance rate" value={`${recs.length ? Math.round((accepted.length / recs.length) * 100) : 0}%`} caption={`${accepted.length} / ${recs.length} issued recommendations`} />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Panel title="Acceptance trend" sub="Cumulative accepted / issued recommendations">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] text-primary">
            <span className="h-2 w-2 bg-primary" /> Accepted recommendations (%)
          </p>
          <div className="h-[180px]">
            <ResponsiveContainer>
              <BarChart data={trend} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: CHART.muted }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip cursor={{ fill: '#f6f8fc' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => `${v}%`} />
                <Bar dataKey="Accepted recommendations (%)" fill={CHART.navy} radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false}>
                  <LabelList dataKey="Accepted recommendations (%)" position="top" style={{ fontSize: 10, fill: CHART.navy }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Predicted breach drivers" sub={`${d.predBreach.length} predicted breaches · Primary driver per case`}>
          {d.drivers.length === 0 && <p className="text-[12px] text-muted">No predicted breaches.</p>}
          {d.drivers.map(([k, n]) => (
            <BarRow key={k} label={k} value={n} max={d.drivers[0][1]} suffix={n === 1 ? ' case' : ' cases'} />
          ))}
        </Panel>
        <Panel title="Model & review status">
          <KV k="Model">
            {MODEL_INFO.name} · Updated {fmtDT(MODEL_INFO.updated)}
          </KV>
          <KV k="Prediction horizon">{MODEL_INFO.horizon}</KV>
          <KV k="Validation precision">{MODEL_INFO.precision}% · Prior 30-day reviewed outcomes</KV>
          <KV k="Human review">
            {pending.length} recommendation{pending.length === 1 ? '' : 's'} awaiting review · {Object.keys(reviews).length} prediction{Object.keys(reviews).length === 1 ? '' : 's'} reviewed
          </KV>
          <p className="mt-3 text-[10.5px] text-muted">Confidence reflects model certainty, not guaranteed likelihood of an outcome.</p>
        </Panel>
      </div>

      <GridCard
        title="Predicted risk queue"
        sub="AI predictions · Review before action"
        onExport={exportQueue}
        viewAll={<ViewAll label={showAllQueue ? 'Show top 6' : 'View all'} onClick={() => setShowAllQueue((x) => !x)} />}
        footer={`Showing ${showAllQueue ? d.queue.length : Math.min(6, d.queue.length)} priority records`}
      >
        <ExcelGrid key={showAllQueue ? 'all' : 'top'} title="Predicted risk queue" hideToolbar hidePagination={!showAllQueue} rowNumbers={false} rows={showAllQueue ? d.queue : d.queue.slice(0, 6)} columns={cols} rowId={(c) => c.id} pageSize={showAllQueue ? 25 : 6} noun="predictions" />
      </GridCard>

      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="mr-auto text-[15px] font-semibold">Preventive recommendations</h2>
        <span className="text-[11px] text-muted">
          {pending.length} awaiting review · {recs.filter((r) => r.highlighted).length} highlighted
        </span>
        <select
          value={recFilter}
          onChange={(e) => setRecFilter(e.target.value as RecFilter)}
          aria-label="Show recommendations"
          className="h-7 rounded-md border border-transparent bg-transparent px-1 text-[11px] text-primary hover:border-line"
        >
          {(['Highlighted', 'Needs review', 'Accepted', 'Rejected', 'All'] as RecFilter[]).map((f) => (
            <option key={f} value={f}>
              {f}
              {f !== 'Highlighted' && f !== 'All' ? ` · ${recs.filter((r) => r.status === f).length}` : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shownRecs.length === 0 && <p className="text-[13px] text-muted">No recommendations in this view.</p>}
        {shownRecs.map((r) => (
          <article key={r.id} className="flex flex-col rounded-xl border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <Badge tone={recTone(r.status)} dot={false}>
                {r.status === 'Accepted' ? 'Accepted · Task created' : `Recommendation · ${r.status}`}
              </Badge>
              <span className="text-[11px] text-muted">{r.confidence}% confidence</span>
            </div>
            <h4 className="mt-3.5 text-[13px] font-semibold text-ink">{r.title}</h4>
            <p className="mt-2.5 text-[11px] text-primary">
              {r.complaintId ? (
                <Link to={`${BASE}/${r.complaintId}`} className="hover:underline">
                  {r.context}
                </Link>
              ) : (
                r.context
              )}
            </p>
            <p className="mt-3 flex-1 text-[11px] leading-4 text-muted">{r.body}</p>
            {r.status === 'Rejected' && r.rejectReason && <p className="mt-2 text-[12px] text-brand-red">Rejected by {r.decidedBy}: {r.rejectReason}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {r.status === 'Needs review' && (
                <>
                  <Button variant="secondary" onClick={() => setRecModal({ rec: r, mode: 'review' })}>
                    Review
                  </Button>
                  <Button onClick={() => accept(r)}>
                    Accept & create task
                  </Button>
                </>
              )}
              {r.status === 'Accepted' && r.taskId && (
                <>
                  <Button variant="secondary" onClick={() => nav(`/tasks/my/${r.taskId}`)}>
                    View task {r.taskId}
                  </Button>
                  {r.decidedBy && (
                    <span className="text-[11px] text-muted">
                      {r.decidedBy} · {r.decidedAt && fmtDT(r.decidedAt)}
                    </span>
                  )}
                </>
              )}
              {r.status === 'Rejected' && <LinkBtn onClick={() => reconsider(r)}>Reconsider</LinkBtn>}
            </div>
          </article>
        ))}
      </div>

      <Panel title="Recurring patterns" sub="Observed patterns, not predictions">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-ink">
          {d.patterns.map(([cat, cs]) => (
            <span key={cat} title={`ATMs: ${[...new Set(cs.map((c) => c.atmId))].join(', ')}`}>
              {RECURRING_LABEL[cat]}: {cs.length} repeat{cs.length > 1 ? 's' : ''} · {RECURRING_ADVICE[cat]}
            </span>
          ))}
          {d.patterns.length === 0 && <p className="text-[12px] text-muted">No recurring patterns in 01–06 Oct.</p>}
        </div>
      </Panel>

      {reviewing && <PredictionReviewModal c={reviewing} onClose={() => setReviewing(null)} />}
      {recModal && (
        <RecModal
          rec={recModal.rec}
          mode={recModal.mode}
          onClose={() => setRecModal(null)}
          onAccept={() => {
            accept(recModal.rec)
            setRecModal(null)
          }}
          onReject={(reason) => {
            reject(recModal.rec, reason)
            setRecModal(null)
          }}
        />
      )}
    </ComplaintsShell>
  )
}

function PredictionReviewModal({ c, onClose }: { c: Complaint; onClose: () => void }) {
  const existing = reviewStore.get()[c.id]
  const [note, setNote] = useState(existing?.note ?? '')
  const save = (verdict: 'Agree' | 'Disagree') => {
    reviewStore.set((r) => ({ ...r, [c.id]: { verdict, note, by: CURRENT_USER, at: new Date(nowMs()).toISOString() } }))
    updateComplaint(c.id, () => ({}), { title: 'AI prediction reviewed', meta: `${CURRENT_USER} · ${verdict} · ${c.ai!.prediction} (${c.ai!.score}/100)` })
    toast(`Review recorded for ${c.id}`)
    onClose()
  }
  const s = sla(c)
  return (
    <Modal
      title={`Review prediction · ${c.id}`}
      sub="Demo prediction · Human review required before action"
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="secondary" onClick={() => save('Disagree')}>
            Disagree
          </Button>
          <Button onClick={() => save('Agree')}>Agree</Button>
        </>
      }
    >
      <div className="mb-3 rounded-lg bg-surface p-3 text-[13px]">
        <div className="font-semibold text-ink">{c.title}</div>
        <div className="mt-1 text-muted">
          {c.atmId} · {c.priority} · {c.owner} · {s.label}
        </div>
      </div>
      <KV k="Prediction">{c.ai!.prediction}</KV>
      <KV k="Reason">{c.ai!.reason}</KV>
      <KV k="Primary driver">{c.ai!.driver || '—'}</KV>
      <KV k="Risk score">{c.ai!.score} / 100 · Confidence {c.ai!.confidence}% · {c.ai!.horizon}</KV>
      <KV k="Summary">{c.ai!.summary}</KV>
      <TextAreaField className="mt-3" label="Review note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional · why you agree or disagree" />
      <p className="mt-3 text-[12px]">
        <Link to={`${BASE}/${c.id}`} className="font-medium text-primary hover:underline">
          Open Complaint 360 →
        </Link>
      </p>
    </Modal>
  )
}

function RecModal({ rec, mode, onClose, onAccept, onReject }: { rec: Recommendation; mode: 'review' | 'reject'; onClose: () => void; onAccept: () => void; onReject: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)
  const [rejecting, setRejecting] = useState(mode === 'reject')
  return (
    <Modal
      title={rejecting ? `Reject ${rec.id}` : rec.rationaleTitle}
      sub={`${rec.title} · ${rec.confidence}% confidence · Demo prediction`}
      onClose={onClose}
      width={560}
      footer={
        rejecting ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setTried(true)
                if (reason.trim()) onReject(reason.trim())
              }}
            >
              Reject recommendation
            </Button>
          </>
        ) : (
          <>
            <Button variant="danger" onClick={() => setRejecting(true)}>
              Reject
            </Button>
            <Button onClick={onAccept}>Accept & create task</Button>
          </>
        )
      }
    >
      <p className="text-[13px] leading-relaxed text-ink-2">{rec.rationale}</p>
      <div className="mt-3">
        <KV k="Context">{rec.context}</KV>
        <KV k="Recommended action">{rec.body}</KV>
        <KV k="Task owner on acceptance">{rec.owner}</KV>
        <KV k="Issued">{fmtDT(rec.issuedAt)}</KV>
      </div>
      {rejecting && (
        <TextAreaField className="mt-3" label="Reason for rejection" required value={reason} onChange={(e) => setReason(e.target.value)} error={tried && !reason.trim() ? 'Enter a reason' : undefined} />
      )}
    </Modal>
  )
}
