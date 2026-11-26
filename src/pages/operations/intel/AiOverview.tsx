import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, ChevronDown, ChevronRight, RefreshCw, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge, type Tone } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { runEscalations } from '@/data/workflow'
import { cn } from '@/lib/cn'
import { AI_MODEL, logAiRun, opsCan, useAiLog, usePermState } from './opsData'
import { CLOSED_MONTH, PENDING_CASH, isOverdueTask, uploadKey, useOpsSources, CBR_SITES, EOD_DATES, type OpsSources } from './sources'
import { alfForecast, businessForecast, cashLoadingTrend, cbrMismatch, disputeMatching, eodMonitoring, repeatedComplaints, repeatedEodExceptions, taskIntel, tasksByDept, txnTrend, type Analysis, type Severity } from './aiRules'
import { AccessDenied, IntelShell, Panel, SourceTag, Stat, Table, inputCls, selectCls } from './ui'
import { fmtDT } from './fmt'
import { ServerOverview } from './ServerOverview'

const sevTone: Record<Severity, Tone> = { High: 'red', Medium: 'amber', Low: 'blue', Info: 'gray' }
const EOD_OPEN = (stage: string) => stage !== 'Approved' && stage !== 'Rejected'

function liveFigures(s: OpsSources, now: number) {
  const cbrPending = s.cbr.filter((r) => PENDING_CASH.has(r.status)).length
  const uploadsMissing = CBR_SITES.reduce((a, site) => a + EOD_DATES.filter((d) => !s.uploads[uploadKey(site.atmId, d)]?.uploaded).length, 0)
  const routine = s.eod.filter((r) => r.type === 'Routine' && EOD_OPEN(r.stage)).length
  const audit = s.eod.filter((r) => r.type === 'Cash Audit' && EOD_OPEN(r.stage)).length
  const monthly = s.monthly.filter((m) => CLOSED_MONTH(m.month) && m.status !== 'Approved').length
  const field = s.disputes.filter((d) => d.open).length
  const cb = s.chargebacks.filter((d) => d.open).length
  const overdue = s.wf.tasks.filter((t) => isOverdueTask(t, now)).length
  return { cbrPending, uploadsMissing, routine, audit, monthly, field, cb, overdue }
}

function EmailAssist({ s }: { s: OpsSources }) {
  const active = s.templates.filter((t) => t.status === 'Active')
  const [code, setCode] = useState(active[0]?.code ?? '')
  const [ref, setRef] = useState('')
  const tpl = active.find((t) => t.code === code)
  const task = s.wf.tasks.find((t) => t.refId === ref || t.id === ref)
  const cmp = s.complaints.find((c) => c.id === ref)
  const vars: Record<string, string> = {
    Module_Name: tpl?.module ?? '—', Record_ID: ref || '{Record_ID}', Site_ID: task?.siteId ?? '—', ATM_ID: task?.atmId ?? cmp?.atmId ?? '—', Assigned_To: s.hierarchy.employees.find((e) => e.id === task?.assignedTo)?.name ?? '—',
    Current_Status: task?.status ?? cmp?.status ?? '—', Pending_Action: task?.title ?? cmp?.lastAction ?? '—', Due_Date: task ? fmtDT(task.dueAt) : '—', Task_ID: task?.id ?? '—', Portal_Link: `${location.origin}/`,
  }
  const fill = (t: string) => t.replace(/\{([A-Za-z_]+)\}/g, (m, k: string) => vars[k] ?? m)
  const refs = [...new Set([...s.wf.tasks.slice(0, 30).map((t) => t.refId), ...s.complaints.slice(0, 15).map((c) => c.id)])]
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <select aria-label="Approved template" className={selectCls} value={code} onChange={(e) => setCode(e.target.value)}>
          {active.map((t) => (
            <option key={t.code} value={t.code}>{t.code} · v{t.version}</option>
          ))}
        </select>
        <input aria-label="Record ID" list="ai-refs" className={`${inputCls} w-48`} placeholder="Record / task ID" value={ref} onChange={(e) => setRef(e.target.value)} />
        <datalist id="ai-refs">
          {refs.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>
      {tpl && (
        <div className="rounded-md border border-violet-200 bg-white p-2.5 text-[11.5px]">
          <div className="font-semibold text-ink">{fill(tpl.subject)}</div>
          <pre className="mt-1 font-sans whitespace-pre-wrap text-ink-2">{fill(tpl.body)}</pre>
          <p className="mt-2 text-violet-700">AI draft from approved template {tpl.code} v{tpl.version}. Not sent — a person must review and send it from <Link to="/email/inbox/compose" className="underline">Email</Link>.</p>
        </div>
      )}
    </div>
  )
}

function PostalSearch({ s }: { s: OpsSources }) {
  const [q, setQ] = useState('')
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (t.length < 2) return []
    const inw = s.inward.filter((i) => [i.id, i.docketNo, i.sender.name, i.sender.organization, i.documentType, i.description, i.department, i.rack, i.mapping.atmId, i.mapping.siteId, ...i.tags].join(' ').toLowerCase().includes(t)).map((i) => ({ id: i.id, dir: 'Inward', text: `${i.receivedAt.slice(0, 10)} · ${i.documentType} from ${i.sender.name} (${i.sender.organization}) · ${i.department} · ${i.rack} · ${i.status}` }))
    const out = s.outward.filter((o) => [o.id, o.awb, o.recipientName, o.document.name, o.document.type, o.department, o.courierCompany].join(' ').toLowerCase().includes(t)).map((o) => ({ id: o.id, dir: 'Outward', text: `${o.dispatchDate} · ${o.document.name} to ${o.recipientName} · AWB ${o.awb} · ${o.deliveryStatus}` }))
    return [...inw, ...out].slice(0, 10)
  }, [q, s.inward, s.outward])
  return (
    <div>
      <input aria-label="Search postal records" className={`${inputCls} w-full`} placeholder="Docket, AWB, sender, document, ATM…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-2 space-y-1">
        {hits.map((h) => (
          <li key={h.id} className="text-[11.5px] text-ink-2">
            <Link to="/operations/daak" className="font-medium text-primary hover:underline">{h.id}</Link> · {h.dir} · {h.text}
          </li>
        ))}
        {q.trim().length >= 2 && hits.length === 0 && <li className="text-[11.5px] text-muted">No incoming / outgoing document matches.</li>}
      </ul>
    </div>
  )
}

export default function AiOverview() {
  const s = useOpsSources()
  const perms = usePermState()
  const log = useAiLog()
  const [now, setNow] = useState(() => Date.now())
  const [openKey, setOpenKey] = useState<string | null>(null)
  const live = useMemo(() => liveFigures(s, now), [s, now])
  const analyses = useMemo<Analysis[]>(() => [cbrMismatch(s), cashLoadingTrend(s), alfForecast(s), eodMonitoring(s, now), txnTrend(s), disputeMatching(s, now), repeatedComplaints(s), taskIntel(s, now), businessForecast(s)], [s, now])
  const byKey = (k: string) => analyses.find((a) => a.key === k)!
  const repeatEod = useMemo(() => repeatedEodExceptions(s), [s])
  const depts = useMemo(() => tasksByDept(s), [s])
  const period = `Live snapshot as of ${fmtDT(new Date(now).toISOString())}`

  if (!opsCan('AI Overview', 'View', perms))
    return (
      <IntelShell title="Operations AI Overview" active="/operations/ai-overview">
        <AccessDenied what="Operations AI Overview" />
      </IntelShell>
    )

  const refresh = () => {
    const t = Date.now()
    setNow(t)
    const p = `Live snapshot as of ${fmtDT(new Date(t).toISOString())}`
    logAiRun([{ capability: 'AI Overview', period: p, inputs: analyses.reduce((a, x) => a + x.inputs, 0), outputs: analyses.reduce((a, x) => a + x.findings.length, 0) }, ...analyses.map((a) => ({ capability: a.title, period: p, inputs: a.inputs, outputs: a.findings.length }))])
    toast('AI analysis refreshed and logged')
  }
  const escalateNow = () => {
    const changed = runEscalations()
    setNow(Date.now())
    toast(changed ? 'Escalation rules executed for overdue tasks' : 'No overdue task needed escalation', changed ? 'success' : 'info')
  }

  const summary = `Today: ${live.cbrPending} CBR records awaiting workflow action and ${live.uploadsMissing} franchise CBR uploads missing (last 7 days); ${live.routine + live.audit + live.monthly} EOD items pending; ${live.field + live.cb} disputes open; ${live.overdue} tasks overdue. ${byKey('cbr').findings.length + byKey('cl').findings.length} cash-difference observations need review.`
  const caps: { no: number; title: string; example: string; body: React.ReactNode; count?: number; key?: string }[] = [
    { no: 1, title: 'AI Overview', example: "Today's operations summary", body: <p className="text-[12px] text-ink-2">{summary}</p> },
    ...(['cbr', 'cl', 'alf', 'eod', 'txn', 'dispute', 'complaint', 'task'] as const).map((k) => { const a = byKey(k); return { no: a.no, title: a.title, example: a.example, body: <p className="text-[12px] text-ink-2">{a.summary}</p>, count: a.findings.length, key: a.key } }),
    { no: 10, title: 'Email Assistance', example: 'Draft email based on approved template', body: <EmailAssist s={s} /> },
    { no: 11, title: 'Postal Search', example: 'Search incoming / outgoing document records', body: <PostalSearch s={s} /> },
    (() => { const a = byKey('biz'); return { no: 12, title: a.title, example: a.example, body: <p className="text-[12px] text-ink-2">{a.summary}</p>, count: a.findings.length, key: a.key } })(),
  ].sort((a, b) => a.no - b.no)

  return (
    <IntelShell
      title="Operations AI Overview"
      active="/operations/ai-overview"
      sub="Live ERP figures and rule-based AI observations for Operations (§15). Observations are suggestions only."
      actions={<Button icon={<RefreshCw size={15} />} onClick={refresh}>Refresh analysis</Button>}
    >
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-[12.5px] text-violet-900">
        <ShieldOff size={17} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <b>AI cannot approve.</b> The AI layer only reads authorized data and produces observations, drafts and suggestions. Every verification, approval, closure and email send stays with an authorized person (human approval & audit, §15.3).
        </span>
        <span className="flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[11px] font-semibold"><Bot size={13} /> {AI_MODEL}</span>
        <span className="text-[11px]">Refreshed {fmtDT(new Date(now).toISOString())}</span>
      </div>

      <ServerOverview />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Pending CBR" value={live.cbrPending} tone={live.cbrPending ? 'amber' : 'green'} to="/cbr" caption={`CBR Master records awaiting submit / verify / approve · ${live.uploadsMissing} franchise daily uploads missing`} />
        <Stat label="Pending EOD" value={live.routine + live.audit + live.monthly} tone="amber" to="/operations/eod" caption={`Routine ${live.routine} · Cash Audit ${live.audit} · Monthly ${live.monthly}`} />
        <Stat label="Open Disputes" value={live.field + live.cb} tone="amber" to="/operations/reconciliation" caption={`Field ${live.field} · Chargeback ${live.cb}`} />
        <div className="relative">
          <Stat label="Overdue Tasks" value={live.overdue} tone={live.overdue ? 'red' : 'green'} to="/tasks/overdue" caption="Across Operations (Task Management)" />
          <button type="button" onClick={escalateNow} className="absolute right-4 bottom-3 text-[11px] font-medium text-primary hover:underline">Run escalation rules</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel kind="ai" title="Unusual CBR / Cash Loading differences" sub="Full Funding (CBR) and Self Funding (Cash Loading) analysed separately — never mixed (§19.1)">
          <ul className="space-y-1.5">
            {[...byKey('cbr').findings.slice(0, 3), ...byKey('cl').findings.slice(0, 3)].map((f) => (
              <li key={f.id} className="flex gap-2 text-[12px] text-ink-2"><Badge tone={sevTone[f.severity]} dot={false}>{f.severity}</Badge><span>{f.text}</span></li>
            ))}
          </ul>
        </Panel>
        <Panel kind="ai" title="EOD exceptions" sub="Sites with repeated EOD exceptions (rule failures, returns, audit differences, monthly mismatches)">
          {repeatEod.length === 0 ? <p className="text-[12px] text-muted">No site has repeated EOD exceptions.</p> : (
            <ul className="space-y-1.5">
              {repeatEod.slice(0, 6).map(([atm, n]) => (
                <li key={atm} className="text-[12px] text-ink-2"><b>{atm}</b> · {n} exceptions — review FR feeding / counter process</li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel kind="ai" title="Dispute follow-up" sub="Overdue dispute responses and evidence gaps">
          <ul className="space-y-1.5">
            {byKey('dispute').findings.filter((f) => f.severity !== 'Low').slice(0, 5).map((f) => (
              <li key={f.id} className="flex gap-2 text-[12px] text-ink-2"><Badge tone={sevTone[f.severity]} dot={false}>{f.severity}</Badge><span>{f.text}</span></li>
            ))}
            {byKey('dispute').findings.length === 0 && <li className="text-[12px] text-muted">No open dispute needs follow-up.</li>}
          </ul>
        </Panel>
        <Panel kind="ai" title="Task intelligence" sub="Pending tasks by department and hierarchy level">
          {depts.length === 0 ? <p className="text-[12px] text-muted">No open workflow tasks.</p> : (
            <Table head={['Department', 'Designation (hierarchy)', 'Open', 'Overdue']} minWidth={380}>
              {depts.map((d) => (
                <tr key={`${d.dept}-${d.designation}`}>
                  <td className="px-3 py-1.5">{d.dept}</td>
                  <td className="px-3 py-1.5">{d.designation}</td>
                  <td className="px-3 py-1.5 tabular-nums">{d.open}</td>
                  <td className={cn('px-3 py-1.5 tabular-nums', d.overdue && 'font-semibold text-red-700')}>{d.overdue}</td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </div>

      <Panel kind="ai" title="Operations AI capabilities (§15.1)" sub={`12 functions · ${AI_MODEL} · rule-based until the Dexter India AI framework is connected (model-agnostic integration layer)`}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {caps.map((c) => {
            const a = c.key ? byKey(c.key) : undefined
            const expanded = openKey === c.key
            return (
              <div key={c.no} className="rounded-lg border border-violet-200 bg-white p-3">
                <div className="flex items-start gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-violet-100 text-[11px] font-bold text-violet-800">{c.no}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-ink">{c.title}</div>
                    <div className="text-[11px] text-muted">{c.example}</div>
                  </div>
                  {c.count != null && <Badge tone={c.count ? 'purple' : 'gray'} dot={false}>{c.count}</Badge>}
                </div>
                <div className="mt-2">{c.body}</div>
                {a && a.findings.length > 0 && (
                  <>
                    <button type="button" onClick={() => setOpenKey(expanded ? null : a.key)} className="mt-2 flex items-center gap-1 text-[11.5px] font-medium text-primary hover:underline">
                      {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />} {expanded ? 'Hide' : 'Show'} observations
                    </button>
                    {expanded && (
                      <ul className="mt-1.5 max-h-60 space-y-1 overflow-y-auto">
                        {a.findings.slice(0, 25).map((f) => (
                          <li key={f.id} className="flex gap-1.5 text-[11.5px] text-ink-2">
                            <Badge tone={sevTone[f.severity]} dot={false}>{f.severity}</Badge>
                            {f.link ? <Link to={f.link} className="hover:text-primary hover:underline">{f.text}</Link> : <span>{f.text}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Panel>

      <Panel
        title="AI output log"
        sub="Model / version, analysis period, inputs read and outputs produced — kept for audit (§15.3)"
        action={<SourceTag kind="live" />}
      >
        <p className="mb-2 text-[11.5px] text-muted">Current view: {period}. Use “Refresh analysis” to record a run.</p>
        {log.length === 0 ? (
          <p className="text-[12px] text-muted">No runs logged yet.</p>
        ) : (
          <Table head={['Run at', 'By', 'Model / version', 'Capability', 'Period', 'Records read', 'Observations']} minWidth={900}>
            {log.slice(0, 40).map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-1.5 whitespace-nowrap">{fmtDT(l.at)}</td>
                <td className="px-3 py-1.5">{l.by}</td>
                <td className="px-3 py-1.5">{l.model}</td>
                <td className="px-3 py-1.5">{l.capability}</td>
                <td className="px-3 py-1.5">{l.period}</td>
                <td className="px-3 py-1.5 tabular-nums">{l.inputs}</td>
                <td className="px-3 py-1.5 tabular-nums">{l.outputs}</td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </IntelShell>
  )
}
