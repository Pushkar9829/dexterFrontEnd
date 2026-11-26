import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { TextAreaField } from '@/components/ui/Form'
import { useRole } from '@/lib/rbac'
import { actorName } from '@/data/workflow'
import { COUNTER_SLIP_RULE, reviewExceptionAsync, useEod, type EodRecord } from '@/data/eodStore'
import { opsMeLoader, rightsFor } from './eod2/access'
import { dmy, dt, inr } from './eod2/fmt'
import { NoAccess, Note, OpsPage, Panel, Status, TableWrap, TD, TH, TR, Tabs } from './eod2/ui'

/** EOD exception review queue (UAT 9): requests that failed the ₹40,000 counter-slip rule, plus returned ones. */
export default function CrmEodList() {
  const { records } = useEod()
  const role = useRole()
  opsMeLoader.use()
  const rights = rightsFor('Routine EOD', role)
  const [tab, setTab] = useState<'open' | 'returned' | 'decided'>('open')
  const [act, setAct] = useState<{ r: EodRecord; d: 'Cleared' | 'Returned' } | null>(null)
  const rows = useMemo(() => {
    if (tab === 'open') return records.filter((r) => r.stage === 'Exception Review')
    if (tab === 'returned') return records.filter((r) => r.stage === 'Returned for Correction')
    return records.filter((r) => r.rule.decision)
  }, [records, tab])
  if (!rights.view) return <NoAccess module="Routine EOD" />

  return (
    <OpsPage title="EOD exception review" sub="Counter-slip rule failures go here instead of normal verification. Operations clears (→ verification) or returns them to the franchise." back={{ to: '/operations/eod', label: 'EOD Management' }}>
      <Note tone="amber">
        Rule in force: counter-slip amount {COUNTER_SLIP_RULE.mode === 'exact' ? 'exactly' : 'at least'} ₹{COUNTER_SLIP_RULE.amount.toLocaleString('en-IN')}. {COUNTER_SLIP_RULE.pendingNote}
      </Note>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'open', label: `Open exceptions (${records.filter((r) => r.stage === 'Exception Review').length})` },
          { id: 'returned', label: `Returned to franchise (${records.filter((r) => r.stage === 'Returned for Correction').length})` },
          { id: 'decided', label: 'Decision history' },
        ]}
      />
      <Panel pad={false}>
        <TableWrap empty={!rows.length}>
          <thead className="bg-slate-50">
            <tr>
              {['EOD ID', 'Type', 'ATM / Site', 'Franchise', 'Funding', 'EOD date', 'Slip amount', 'Rule', tab === 'returned' ? 'Return reason' : 'Decision', 'Submitted', ''].map((h) => (
                <th key={h} className={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={TR}>
                <td className={TD}>
                  <Link to={`/operations/eod/record/${r.id}`} className="font-semibold text-primary hover:underline">
                    {r.id}
                  </Link>
                </td>
                <td className={TD}>{r.type}</td>
                <td className={TD}>
                  {r.atmId}
                  <div className="text-[11px] text-muted">{r.siteId}</div>
                </td>
                <td className={TD}>{r.franchiseName}</td>
                <td className={TD}>{r.funding}</td>
                <td className={TD}>{dmy(r.eodDate)}</td>
                <td className={`${TD} ${r.rule.passed ? '' : 'font-semibold text-red-600'}`}>{inr(r.counterSlip.amount)}</td>
                <td className={TD}>
                  <Status text={r.rule.passed ? 'Passed' : 'Failed'} tone={r.rule.passed ? 'green' : 'red'} />
                </td>
                <td className={`${TD} max-w-[260px] whitespace-normal`}>{tab === 'returned' ? r.trail.returnReason ?? '—' : r.rule.decision ? `${r.rule.decision} by ${r.rule.reviewedBy} — ${r.rule.remark}` : 'Pending'}</td>
                <td className={TD}>{dt(r.trail.submittedAt)}</td>
                <td className={TD}>
                  {r.stage === 'Exception Review' && rights.verify && (
                    <div className="flex gap-1.5">
                      <Button size="sm" icon={<CheckCircle2 size={13} />} onClick={() => setAct({ r, d: 'Cleared' })} disabled={[r.trail.createdBy, r.trail.submittedBy].includes(actorName())}>
                        Clear
                      </Button>
                      <Button size="sm" variant="secondary" icon={<RotateCcw size={13} />} onClick={() => setAct({ r, d: 'Returned' })} disabled={[r.trail.createdBy, r.trail.submittedBy].includes(actorName())}>
                        Return
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Panel>
      {act && <DecisionModal r={act.r} d={act.d} onClose={() => setAct(null)} />}
    </OpsPage>
  )
}

function DecisionModal({ r, d, onClose }: { r: EodRecord; d: 'Cleared' | 'Returned'; onClose: () => void }) {
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const save = async () => {
    const e = await reviewExceptionAsync(r.id, d, text)
    if (e) return setErr(e)
    toast(d === 'Cleared' ? `${r.id} cleared — moved to Operations verification` : `${r.id} returned to the franchise`)
    onClose()
  }
  return (
    <Modal title={d === 'Cleared' ? 'Clear exception' : 'Return to franchise'} sub={`${r.id} · slip ${inr(r.counterSlip.amount)}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>{d === 'Cleared' ? 'Clear' : 'Return'}</Button></>}>
      <TextAreaField label={d === 'Cleared' ? 'Justification (why the rule exception is acceptable)' : 'Reason for return'} required value={text} onChange={(e) => setText(e.target.value)} />
      {err && (
        <div className="mt-2">
          <Note tone="red">{err}</Note>
        </div>
      )}
    </Modal>
  )
}
