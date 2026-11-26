import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Check, MessageSquareText, Send, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { logPayout } from '@/data/payout'
import { can } from '@/lib/rbac'
import { cn } from '@/lib/cn'
import { ALERT_TRIGGER, askAi, bmFeatures, buildAlerts, EXAMPLE_QUERIES, franchiseFeatures, type AiAlert, type AiAnswer, type Feature } from './ai'
import { actor, alertReviewStore, type Model, type View } from './compute'
import { AiNotice, DataTable, Panel, ResultTable, SectionTabs, type DCol, type DFilter } from './ui'

const toneCls: Record<Feature['tone'], string> = {
  green: 'border-l-emerald-500', red: 'border-l-red-500', amber: 'border-l-amber-500', blue: 'border-l-bright', gray: 'border-l-slate-400',
}
function FeatureCard({ f }: { f: Feature }) {
  const [more, setMore] = useState(false)
  const refs = more ? f.refs : f.refs.slice(0, 3)
  return (
    <div className={cn('rounded-xl border border-l-4 border-line bg-white p-3.5', toneCls[f.tone])}>
      <div className="flex items-center gap-2">
        <h4 className="text-[13px] font-semibold text-ink">{f.title}</h4>
        <span className="text-[10.5px] text-muted">{f.spec}</span>
      </div>
      <p className="mt-1.5 text-[12px] text-ink-2">{f.summary}</p>
      {refs.length > 0 && (
        <ul className="mt-2 space-y-1">
          {refs.map((r, i) => (
            <li key={`${r.ref}-${i}`} className="flex gap-2 text-[11.5px]">
              {r.to ? <Link to={r.to} className="shrink-0 font-semibold text-primary hover:underline">{r.ref}</Link> : <span className="shrink-0 font-semibold">{r.ref}</span>}
              <span className="text-muted">{r.detail}</span>
            </li>
          ))}
        </ul>
      )}
      {f.refs.length > 3 && (
        <button onClick={() => setMore((x) => !x)} className="mt-1 text-[11px] font-semibold text-primary">{more ? 'Show less' : `Show all ${f.refs.length}`}</button>
      )}
      <p className="mt-2 text-[11px] text-violet-800"><span className="font-semibold">Recommended action:</span> {f.action}</p>
    </div>
  )
}

function AskAi({ m, v, month, alerts }: { m: Model; v: View; month: string; alerts: AiAlert[] }) {
  const [q, setQ] = useState('')
  const [ans, setAns] = useState<{ q: string; a: AiAnswer | null } | null>(null)
  const ask = (text: string) => {
    const t = text.trim()
    if (!t) return
    setQ(t)
    setAns({ q: t, a: askAi(t, m, v, month, alerts) })
    logPayout({ by: actor(), area: 'AI Intelligence', ref: 'Ask AI', action: `Query: ${t.slice(0, 120)}` })
  }
  return (
    <Panel title="Ask AI — Management Assistant" icon={<MessageSquareText size={16} className="text-violet-600" />} sub="Answers from ERP records for the selected filters">
      <form onSubmit={(e) => { e.preventDefault(); ask(q) }} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Which BM Site has the highest rent?" className="h-10 min-w-0 flex-1 rounded-md border border-line px-3 text-[13px] outline-none focus:border-primary" aria-label="Ask AI" />
        <Button type="submit" icon={<Send size={14} />} className="bg-violet-600 hover:bg-violet-700">Ask</Button>
      </form>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {EXAMPLE_QUERIES.map((x) => (
          <button key={x} onClick={() => ask(x)} className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] text-violet-800 hover:bg-violet-100">{x}</button>
        ))}
      </div>
      {ans && (
        <div className="mt-4 space-y-3">
          {!ans.a ? (
            <p className="rounded-lg bg-surface px-3 py-2 text-[12px] text-ink-2">I could not match “{ans.q}” to a supported question. Try one of the examples above — the assistant only answers from payout records and never guesses.</p>
          ) : (
            <>
              <div className="grid gap-2 rounded-lg border border-violet-200 bg-violet-50/50 p-3 text-[12px] sm:grid-cols-3">
                <div><span className="text-muted">Answer: </span><span className="font-semibold">{ans.a.title}</span></div>
                <div><span className="text-muted">Reporting period: </span>{ans.a.period}</div>
                <div><span className="text-muted">Vertical: </span>{ans.a.vertical}</div>
                <div className="sm:col-span-3"><span className="text-muted">Calculation: </span>{ans.a.explanation}</div>
                {ans.a.refs.length > 0 && (
                  <div className="sm:col-span-3">
                    <span className="text-muted">Supporting ERP records: </span>
                    {ans.a.refs.map((r, i) => (
                      <span key={`${r.ref}-${i}`} className="mr-3">{r.to ? <Link to={r.to} className="font-semibold text-primary hover:underline">{r.ref}</Link> : r.ref} <span className="text-muted">({r.detail})</span></span>
                    ))}
                  </div>
                )}
                <div className="sm:col-span-3 text-violet-800"><span className="font-semibold">Recommended action:</span> {ans.a.action}</div>
              </div>
              {ans.a.columns.length > 0 && (
                <ResultTable data={{ columns: ans.a!.columns, rows: ans.a!.rows }} fileName={`AI_${ans.a!.title}`} onExport={(n) => logPayout({ by: actor(), area: 'AI Intelligence', ref: ans.a!.title, action: `Exported AI answer (${n} rows)` })} />
              )}
            </>
          )}
        </div>
      )}
    </Panel>
  )
}

type AlertRow = AiAlert & { review: string }
function AlertsTable({ alerts }: { alerts: AiAlert[] }) {
  const reviews = alertReviewStore.use()
  const [acting, setActing] = useState<{ a: AiAlert; status: 'Acknowledged' | 'Dismissed' } | null>(null)
  const [note, setNote] = useState('')
  const rows = useMemo<AlertRow[]>(() => alerts.map((a) => ({ ...a, review: reviews[a.id]?.status ?? 'Open' })), [alerts, reviews])
  const allowed = can('Approve') || can('Edit')
  const cols = useMemo<DCol<AlertRow>[]>(() => [
    { label: 'Severity', kind: 'status', value: (r) => r.severity },
    { label: 'Alert', value: (r) => r.type, cell: (r) => <span className="font-semibold">{r.type}</span> },
    { label: 'Trigger', value: (r) => ALERT_TRIGGER[r.type] },
    { label: 'Vertical', value: (r) => r.vertical },
    { label: 'Month', value: (r) => r.month },
    { label: 'Reference', value: (r) => r.ref, cell: (r) => (r.to ? <Link to={r.to} className="font-semibold text-primary hover:underline">{r.ref}</Link> : r.ref) },
    { label: 'Detail', value: (r) => r.detail, className: 'max-w-[320px] whitespace-normal' },
    { label: 'Recommended action', value: (r) => r.action, className: 'max-w-[220px] whitespace-normal' },
    { label: 'Review', kind: 'status', value: (r) => r.review },
    {
      label: 'Action', value: () => '', cell: (r) =>
        r.review === 'Open' && allowed ? (
          <span className="flex gap-1.5">
            <Button size="sm" variant="secondary" icon={<Check size={12} />} onClick={() => { setNote(''); setActing({ a: r, status: 'Acknowledged' }) }}>Acknowledge</Button>
            <Button size="sm" variant="danger" icon={<X size={12} />} onClick={() => { setNote(''); setActing({ a: r, status: 'Dismissed' }) }}>Dismiss</Button>
          </span>
        ) : (
          <span className="text-[11px] text-muted">{reviews[r.id] ? `${reviews[r.id].by}` : 'View only'}</span>
        ),
    },
  ], [allowed, reviews])
  const filters = useMemo<DFilter<AlertRow>[]>(() => [{ label: 'Alert', get: (r) => r.type }, { label: 'Review', get: (r) => r.review }], [])
  const save = () => {
    if (!acting) return
    const { a, status } = acting
    if (status === 'Dismissed' && !note.trim()) {
      toast('A reason is required to dismiss an alert.', 'error')
      return
    }
    alertReviewStore.set((x) => ({ ...x, [a.id]: { status, by: actor(), at: new Date().toISOString(), note: note.trim() || undefined } }))
    logPayout({ by: actor(), area: 'AI Alerts', ref: `${a.type} · ${a.ref}`, action: `Alert ${status.toLowerCase()}`, before: 'Open', after: `${status}${note.trim() ? ` — ${note.trim()}` : ''}` })
    toast(`Alert ${status.toLowerCase()}. No financial record was changed.`)
    setActing(null)
  }
  return (
    <>
      <DataTable title="AI Alerts (§11.4)" icon={<Bot size={16} className="text-violet-600" />} cols={cols} rows={rows} filters={filters} rowKey={(r) => r.id} fileName="AI_Alerts" onExport={(n) => logPayout({ by: actor(), area: 'AI Alerts', ref: 'AI Alerts', action: `Exported ${n} alerts` })} />
      {acting && (
        <Modal title={`${acting.status === 'Acknowledged' ? 'Acknowledge' : 'Dismiss'} alert`} sub={`${acting.a.type} · ${acting.a.ref}`} onClose={() => setActing(null)}
          footer={<><Button variant="secondary" onClick={() => setActing(null)}>Cancel</Button><Button onClick={save}>{acting.status === 'Acknowledged' ? 'Acknowledge' : 'Dismiss'}</Button></>}>
          <p className="text-[12px] text-ink-2">{acting.a.detail}</p>
          <p className="mt-2 text-[11.5px] text-muted">Reviewing an alert only records your decision. It does not approve, hold, release or modify any payout, account or rule — take any corrective action in the source module.</p>
          <label className="mt-3 block text-[11px] font-semibold">Review note {acting.status === 'Dismissed' && <span className="text-brand-red">*</span>}</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} className="mt-1 w-full rounded-md border border-line p-2 text-[12px] outline-none focus:border-primary" />
        </Modal>
      )}
    </>
  )
}

const AI_TABS = ['Franchise Model AI', 'Business Model AI', 'Ask AI', 'AI Alerts'] as const
export function AiIntelligence({ m, v, month, initial = 'Franchise Model AI' }: { m: Model; v: View; month: string; initial?: (typeof AI_TABS)[number] }) {
  const [tab, setTab] = useState<(typeof AI_TABS)[number]>(initial)
  const fr = useMemo(() => franchiseFeatures(v, m.snap, month), [v, m.snap, month])
  const bm = useMemo(() => bmFeatures(v, m.snap, month), [v, m.snap, month])
  const alerts = useMemo(() => buildAlerts(v, m.snap, month), [v, m.snap, month])
  const reviews = alertReviewStore.use()
  const open = alerts.filter((a) => !reviews[a.id]).length
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles size={18} className="text-violet-600" />
        <h2 className="text-[20px] font-semibold text-ink">AI Financial Intelligence</h2>
        <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10.5px] font-semibold text-white">Rule-based · read-only</span>
        <span className="ml-auto text-[12px] text-muted">{open} open alerts of {alerts.length}</span>
      </div>
      <AiNotice />
      <SectionTabs tabs={AI_TABS} value={tab} onChange={setTab} />
      {tab === 'Franchise Model AI' && <div className="grid gap-3 lg:grid-cols-2">{fr.map((f) => <FeatureCard key={f.key} f={f} />)}</div>}
      {tab === 'Business Model AI' && <div className="grid gap-3 lg:grid-cols-2">{bm.map((f) => <FeatureCard key={f.key} f={f} />)}</div>}
      {tab === 'Ask AI' && <AskAi m={m} v={v} month={month} alerts={alerts} />}
      {tab === 'AI Alerts' && <AlertsTable alerts={alerts} />}
    </div>
  )
}
