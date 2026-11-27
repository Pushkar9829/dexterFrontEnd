// HRMS — leave requests and attendance regularisation (apply / approve / reject / cancel).
// API mode: /hrms/leaves + /hrms/attendance/regularisations; mock mode: local store (src/data/hrmsLeave.ts).
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, Check, Clock, X } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { useCanIn } from '@/lib/guard'
import {
  LEAVE_TYPES, applyLeave, cancelLeave, cancelRegularisation, decideLeave, decideRegularisation, isOwnRequest, leaveDays, localBalance, requestRegularisation, useHrmsLeave,
  type LeaveType, type RequestStatus,
} from '@/data/hrmsLeave'
import { apiEnabled } from '@/data/bizApi'

const TONE: Record<RequestStatus, Tone> = { Pending: 'amber', Approved: 'green', Rejected: 'red', Cancelled: 'gray' }
const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted'
const td = 'px-3 py-2 text-[12.5px] text-ink align-top'
const fmtD = (d?: string) => (d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
const fmtT = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—')
const todayIso = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10)
/** 'yyyy-mm-dd' + 'HH:mm' (IST) → ISO instant. */
/** IST wall-clock time on `date` sent with an explicit +05:30 offset (backend normalises to UTC and checks the IST day). */
const istIso = (date: string, hm: string) => `${date}T${hm.slice(0, 5)}:00+05:30`

type Decide = { kind: 'leave' | 'reg'; id: string; decision: 'Approved' | 'Rejected'; remark: string; error: string }

export default function HrmsLeave() {
  const s = useHrmsLeave()
  const allow = useCanIn('HRMS')
  const approver = allow('Approve')
  const [tab, setTab] = useState<'leave' | 'reg'>('leave')
  const [status, setStatus] = useState<RequestStatus | ''>('')
  const [busy, setBusy] = useState(false)
  const [leaveForm, setLeaveForm] = useState<{ type: LeaveType | ''; from: string; to: string; halfDay: boolean; reason: string; error: string } | null>(null)
  const [regForm, setRegForm] = useState<{ date: string; punchIn: string; punchOut: string; requestedStatus: '' | 'Present' | 'Half Day'; reason: string; error: string } | null>(null)
  const [decide, setDecide] = useState<Decide | null>(null)
  const balance = apiEnabled ? s.balance : localBalance(s)

  const leaves = useMemo(() => s.leaves.filter((l) => !status || l.status === status), [s.leaves, status])
  const regs = useMemo(() => s.regs.filter((r) => !status || r.status === status), [s.regs, status])

  const run = async (fn: () => Promise<void>, ok: string, onDone?: () => void, onErr?: (m: string) => void) => {
    setBusy(true)
    try {
      await fn()
      toast(ok)
      onDone?.()
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Failed'
      if (onErr) onErr(m)
      else if (!apiEnabled) toast(m, 'error') // API errors are already toasted by apiCall
    } finally {
      setBusy(false)
    }
  }

  const submitLeave = () => {
    if (!leaveForm) return
    const f = leaveForm
    const to = f.halfDay ? f.from : f.to
    if (!f.type || !f.from || !to) return setLeaveForm({ ...f, error: 'Choose the leave type and dates.' })
    if (to < f.from) return setLeaveForm({ ...f, error: '"To" must be on or after "From".' })
    if (f.reason.trim().length < 3) return setLeaveForm({ ...f, error: 'Give a reason (at least 3 characters).' })
    void run(() => applyLeave({ type: f.type as LeaveType, from: f.from, to, halfDay: f.halfDay, reason: f.reason.trim() }), 'Leave request submitted for approval', () => setLeaveForm(null), (m) => setLeaveForm({ ...f, error: m }))
  }
  const submitReg = () => {
    if (!regForm) return
    const f = regForm
    if (!f.date || f.date >= todayIso()) return setRegForm({ ...f, error: 'Pick a past date.' })
    if (!f.punchIn || !f.punchOut || f.punchOut <= f.punchIn) return setRegForm({ ...f, error: 'Punch-out must be after punch-in.' })
    if (f.reason.trim().length < 3) return setRegForm({ ...f, error: 'Give a reason (at least 3 characters).' })
    void run(
      () => requestRegularisation({ date: f.date, punchIn: istIso(f.date, f.punchIn), punchOut: istIso(f.date, f.punchOut), requestedStatus: f.requestedStatus || undefined, reason: f.reason.trim() }),
      'Regularisation request submitted',
      () => setRegForm(null),
      (m) => setRegForm({ ...f, error: m }),
    )
  }
  const submitDecision = () => {
    if (!decide) return
    if (decide.decision === 'Rejected' && !decide.remark.trim()) return setDecide({ ...decide, error: 'A remark is required to reject.' })
    const fn = decide.kind === 'leave' ? () => decideLeave(decide.id, decide.decision, decide.remark) : () => decideRegularisation(decide.id, decide.decision, decide.remark)
    void run(fn, `${decide.id} ${decide.decision.toLowerCase()}`, () => setDecide(null), (m) => setDecide({ ...decide, error: m }))
  }
  const cancel = (kind: 'leave' | 'reg', id: string) => {
    if (kind === 'reg') return void run(() => cancelRegularisation(id), `${id} cancelled`)
    const reason = window.prompt(`Cancel leave ${id}?\n\nReason (required, at least 3 characters):`)
    if (reason === null) return
    if (reason.trim().length < 3) return toast('A reason of at least 3 characters is required.', 'error')
    void run(() => cancelLeave(id, reason.trim()), `${id} cancelled`)
  }
  const decisionCell = (kind: 'leave' | 'reg', r: { status: RequestStatus; userId?: string; empName: string; decidedByName?: string; decidedAt?: string; remark?: string }, id: string) => {
    if (r.status !== 'Pending') return r.decidedByName ? <span className="text-[11.5px] text-ink-2">{r.decidedByName} · {fmtD(r.decidedAt)}{r.remark ? ` — ${r.remark}` : ''}</span> : '—'
    if (isOwnRequest(r)) return <span className="text-[11.5px] text-muted">Your request — another approver decides</span>
    if (!approver) return <span className="text-[11.5px] text-muted">Awaiting approver</span>
    return (
      <span className="inline-flex gap-1.5">
        <Button size="sm" variant="bright" icon={<Check size={12} />} disabled={busy} onClick={() => setDecide({ kind, id, decision: 'Approved', remark: '', error: '' })}>Approve</Button>
        <Button size="sm" variant="danger" icon={<X size={12} />} disabled={busy} onClick={() => setDecide({ kind, id, decision: 'Rejected', remark: '', error: '' })}>Reject</Button>
      </span>
    )
  }

  return (
    <div className="max-w-[1180px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/hrms" className="mb-1 inline-flex items-center gap-1 text-[12px] font-semibold text-[#0066FF]"><ArrowLeft size={13} /> HRMS</Link>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Leave &amp; Regularisation</h1>
          <p className="mt-1 text-[13px] text-muted">Apply for leave or regularise a missed punch. Approvers decide others’ requests — never their own.</p>
        </div>
        <div className="flex gap-2">
          {allow('Create') && (
            <>
              <Button icon={<CalendarPlus size={14} />} onClick={() => setLeaveForm({ type: '', from: todayIso(), to: todayIso(), halfDay: false, reason: '', error: '' })}>Apply leave</Button>
              <Button variant="secondary" icon={<Clock size={14} />} onClick={() => setRegForm({ date: '', punchIn: '09:30', punchOut: '18:30', requestedStatus: '', reason: '', error: '' })}>Regularise attendance</Button>
            </>
          )}
        </div>
      </div>

      {balance && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {balance.types.map((t) => (
            <div key={t.type} className="rounded-xl border border-line bg-white p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t.type}</div>
              <div className="mt-1 text-[22px] font-bold text-ink">{t.available ?? '∞'}<span className="ml-1 text-[12px] font-medium text-muted">available</span></div>
              <div className="text-[11.5px] text-ink-2">Entitled {t.entitled ?? 'unlimited'} · used {t.used} · pending {t.pending} · FY {balance.fy}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(['leave', 'reg'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold ${tab === k ? 'border-[#0066FF] bg-[#0066FF]/10 text-[#0066FF]' : 'border-line bg-white text-ink-2'}`}>
            {k === 'leave' ? `Leave requests (${s.leaves.length})` : `Regularisations (${s.regs.length})`}
          </button>
        ))}
        <select aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value as RequestStatus | '')} className="ml-auto h-8 rounded-md border border-line bg-white px-2 text-[12px]">
          <option value="">All statuses</option>
          {(['Pending', 'Approved', 'Rejected', 'Cancelled'] as const).map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        {tab === 'leave' ? (
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="bg-surface"><tr>{['ID', 'Employee', 'Type', 'Dates', 'Days', 'Reason', 'Status', 'Decision', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.leaveId} className="border-t border-line-soft">
                  <td className={`${td} font-semibold`}>{l.leaveId}</td>
                  <td className={td}>{l.empName}<span className="block text-[11px] text-muted">{l.employeeId} · {l.department}</span></td>
                  <td className={td}>{l.type}</td>
                  <td className={`${td} whitespace-nowrap`}>{fmtD(l.from)}{l.to !== l.from ? ` – ${fmtD(l.to)}` : ''}{l.halfDay ? ' (half day)' : ''}</td>
                  <td className={td}>{l.days}</td>
                  <td className={`${td} max-w-[240px]`}>{l.reason}</td>
                  <td className={td}><Badge tone={TONE[l.status]}>{l.status}</Badge></td>
                  <td className={td}>{decisionCell('leave', l, l.leaveId)}</td>
                  <td className={td}>
                    {isOwnRequest(l) && (l.status === 'Pending' || (l.status === 'Approved' && l.from > todayIso())) && (
                      <button type="button" className="text-[11.5px] font-semibold text-brand-red" disabled={busy} onClick={() => cancel('leave', l.leaveId)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
              {!leaves.length && <tr><td colSpan={9} className="py-6 text-center text-[12px] text-muted">No leave requests.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="bg-surface"><tr>{['ID', 'Employee', 'Date', 'Punch in / out', 'Requested', 'Reason', 'Status', 'Decision', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {regs.map((r) => (
                <tr key={r.regId} className="border-t border-line-soft">
                  <td className={`${td} font-semibold`}>{r.regId}</td>
                  <td className={td}>{r.empName}<span className="block text-[11px] text-muted">{r.employeeId} · {r.department}</span></td>
                  <td className={`${td} whitespace-nowrap`}>{fmtD(r.date)}</td>
                  <td className={`${td} whitespace-nowrap`}>{fmtT(r.punchIn)} – {fmtT(r.punchOut)}</td>
                  <td className={td}>{r.requestedStatus}</td>
                  <td className={`${td} max-w-[240px]`}>{r.reason}</td>
                  <td className={td}><Badge tone={TONE[r.status]}>{r.status}</Badge></td>
                  <td className={td}>{decisionCell('reg', r, r.regId)}</td>
                  <td className={td}>
                    {isOwnRequest(r) && r.status === 'Pending' && (
                      <button type="button" className="text-[11.5px] font-semibold text-brand-red" disabled={busy} onClick={() => cancel('reg', r.regId)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
              {!regs.length && <tr><td colSpan={9} className="py-6 text-center text-[12px] text-muted">No regularisation requests.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {leaveForm && (
        <Modal
          title="Apply for leave"
          sub="Days exclude Sundays; a half day is 0.5 day (single date). Your approver is notified."
          onClose={() => setLeaveForm(null)}
          footer={<><Button variant="secondary" onClick={() => setLeaveForm(null)}>Cancel</Button><Button disabled={busy} onClick={submitLeave}>Submit</Button></>}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField className="sm:col-span-2" label="Leave type" required name="lvType" options={[...LEAVE_TYPES]} value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as LeaveType, error: '' })} />
            <TextField label="From" required type="date" name="lvFrom" value={leaveForm.from} onChange={(e) => setLeaveForm({ ...leaveForm, from: e.target.value, error: '' })} />
            <TextField label="To" required type="date" name="lvTo" disabled={leaveForm.halfDay} value={leaveForm.halfDay ? leaveForm.from : leaveForm.to} onChange={(e) => setLeaveForm({ ...leaveForm, to: e.target.value, error: '' })} />
            <label className="flex items-center gap-2 text-[12.5px] sm:col-span-2">
              <input type="checkbox" checked={leaveForm.halfDay} onChange={(e) => setLeaveForm({ ...leaveForm, halfDay: e.target.checked, error: '' })} /> Half day
              <span className="ml-auto text-muted">{leaveForm.from ? `${leaveDays(leaveForm.from, leaveForm.halfDay ? leaveForm.from : leaveForm.to || leaveForm.from, leaveForm.halfDay)} day(s)` : ''}</span>
            </label>
            <TextAreaField className="sm:col-span-2" label="Reason" required name="lvReason" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value, error: '' })} />
          </div>
          {leaveForm.error && <p className="mt-2 text-[11.5px] text-red-600">{leaveForm.error}</p>}
        </Modal>
      )}

      {regForm && (
        <Modal
          title="Regularise attendance"
          sub="For a past day you missed a punch on (not a leave day). One pending request per day."
          onClose={() => setRegForm(null)}
          footer={<><Button variant="secondary" onClick={() => setRegForm(null)}>Cancel</Button><Button disabled={busy} onClick={submitReg}>Submit</Button></>}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Date" required type="date" name="regDate" max={todayIso()} value={regForm.date} onChange={(e) => setRegForm({ ...regForm, date: e.target.value, error: '' })} />
            <SelectField label="Requested status" name="regStatus" placeholder="Auto (by hours worked)" options={['Present', 'Half Day']} value={regForm.requestedStatus} onChange={(e) => setRegForm({ ...regForm, requestedStatus: e.target.value as '' | 'Present' | 'Half Day', error: '' })} />
            <TextField label="Punch in (IST)" required type="time" name="regIn" value={regForm.punchIn} onChange={(e) => setRegForm({ ...regForm, punchIn: e.target.value, error: '' })} />
            <TextField label="Punch out (IST)" required type="time" name="regOut" value={regForm.punchOut} onChange={(e) => setRegForm({ ...regForm, punchOut: e.target.value, error: '' })} />
            <TextAreaField className="sm:col-span-2" label="Reason" required name="regReason" value={regForm.reason} onChange={(e) => setRegForm({ ...regForm, reason: e.target.value, error: '' })} />
          </div>
          {regForm.error && <p className="mt-2 text-[11.5px] text-red-600">{regForm.error}</p>}
        </Modal>
      )}

      {decide && (
        <Modal
          title={`${decide.decision === 'Approved' ? 'Approve' : 'Reject'} ${decide.id}`}
          sub={decide.kind === 'leave' ? 'Approval marks the dates On Leave / Half Day in attendance.' : 'Approval writes the punches and status into the attendance row.'}
          onClose={() => setDecide(null)}
          footer={<><Button variant="secondary" onClick={() => setDecide(null)}>Cancel</Button><Button variant={decide.decision === 'Approved' ? 'bright' : 'danger'} disabled={busy} onClick={submitDecision}>{decide.decision === 'Approved' ? 'Approve' : 'Reject'}</Button></>}
        >
          <TextAreaField label={decide.decision === 'Rejected' ? 'Remark' : 'Remark (optional)'} required={decide.decision === 'Rejected'} name="decRemark" value={decide.remark} onChange={(e) => setDecide({ ...decide, remark: e.target.value, error: '' })} />
          {decide.error && <p className="mt-2 text-[11.5px] text-red-600">{decide.error}</p>}
        </Modal>
      )}
    </div>
  )
}
