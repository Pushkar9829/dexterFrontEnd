// API mode: server-side Operations overview (GET /ops-intel/overview) — counts across every Operations
// collection, rule-based facts and AI observations. Read-only: the AI never approves or changes records.
import { useCallback, useEffect, useState } from 'react'
import { Bot, RefreshCw } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { apiEnabled, get } from '@/lib/api'
import { errMsg } from '@/data/opsApi'
import { Panel, Stat } from './ui'
import { fmtDT } from './fmt'

type Sev = 'High' | 'Medium' | 'Low' | 'Info'
type Overview = {
  generatedAt: string
  counts: Record<string, number>
  sources: Record<string, boolean>
  facts: { id: string; area: string; severity: Sev; text: string }[]
  ai: { provider: string; readOnly: boolean; observations: { area: string; severity: Sev; refs: string[]; text: string }[] } | null
  note: string
}
const tone: Record<Sev, Tone> = { High: 'red', Medium: 'amber', Low: 'blue', Info: 'gray' }

export function ServerOverview() {
  const [data, setData] = useState<Overview | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    setBusy(true)
    setErr(null)
    try {
      setData(await get<Overview>('/ops-intel/overview', { ai: true }))
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }, [])
  useEffect(() => {
    if (apiEnabled) void load()
  }, [load])
  if (!apiEnabled) return null
  const c = data?.counts ?? {}
  return (
    <Panel
      kind="ai"
      title="Server overview (all Operations records)"
      sub={data ? `Generated ${fmtDT(data.generatedAt)} · provider ${data.ai?.provider ?? 'facts only'} · ${data.note}` : 'Counts, rule facts and AI observations computed by the backend'}
      action={<Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={() => void load()} disabled={busy}>{busy ? 'Loading…' : 'Refresh'}</Button>}
    >
      {err && <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">Could not load the server overview: {err}</p>}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Stat label="Pending CBR / Cash Loading" value={(c.pendingCbr ?? 0) + (c.pendingCashLoading ?? 0)} tone="amber" caption={`CBR ${c.pendingCbr ?? 0} · Cash Loading ${c.pendingCashLoading ?? 0}`} />
            <Stat label="Pending EOD" value={c.pendingEod ?? 0} tone="amber" />
            <Stat label="Open disputes" value={(c.openFieldDisputes ?? 0) + (c.openChargebacks ?? 0)} tone="amber" caption={`Field ${c.openFieldDisputes ?? 0} · Chargeback ${c.openChargebacks ?? 0} (${c.escalatedChargebacks ?? 0} escalated)`} />
            <Stat label="Open complaints" value={c.openComplaints ?? 0} tone={c.breachedComplaints ? 'red' : 'green'} caption={`${c.breachedComplaints ?? 0} breached SLA · ${c.pendingWla ?? 0} WLA pending`} />
            <Stat label="Overdue tasks" value={c.overdueTasks ?? 0} tone={c.overdueTasks ? 'red' : 'green'} />
          </div>
          {data.ai?.observations.length ? (
            <ul className="mt-3 space-y-1.5">
              {data.ai.observations.map((o, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-ink-2"><Bot size={14} className="mt-0.5 shrink-0 text-violet-600" /><Badge tone={tone[o.severity] ?? 'gray'} dot={false}>{o.severity}</Badge><span>{o.text}</span></li>
              ))}
            </ul>
          ) : null}
          <details className="mt-3 text-[12px]">
            <summary className="cursor-pointer font-medium text-primary">{data.facts.length} rule facts</summary>
            <ul className="mt-2 space-y-1">
              {data.facts.map((f) => (
                <li key={`${f.area}-${f.id}-${f.text}`} className="flex gap-2 text-ink-2"><Badge tone={tone[f.severity] ?? 'gray'} dot={false}>{f.severity}</Badge><span className="text-muted">{f.area}</span><span>{f.text}</span></li>
              ))}
            </ul>
          </details>
        </>
      )}
    </Panel>
  )
}
