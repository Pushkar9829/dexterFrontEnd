// User rights requests (DPDP §11–14): Access, Correction, Erasure, Grievance, Withdraw consent, Nominate.
import { useState } from 'react'
import { Plus, UserCheck } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { RIGHT_TYPES, logPrivacy, patchItem, rightsOverdue, usePrivacy, type RightsRequest, type RightsStatus } from '@/data/privacy'
import { DataGrid, FormActions, Note, PageShell, Stat, StatRow, type Col } from '../security/kit'
import { actor, fmtD, fmtDT, useNow } from '../security/util'
import { RightsForm } from './RightsForm'

const rightsTone = (s: RightsStatus): Tone => (s === 'Completed' ? 'green' : s === 'Rejected' ? 'red' : s === 'In Progress' ? 'blue' : 'amber')
const NEXT: Record<RightsStatus, RightsStatus[]> = {
  Submitted: ['Identity Verification', 'In Progress', 'Rejected'],
  'Identity Verification': ['In Progress', 'Rejected'],
  'In Progress': ['Completed', 'Rejected'],
  Completed: [],
  Rejected: [],
}

function UpdateModal({ r, onClose }: { r: RightsRequest; onClose: () => void }) {
  const [status, setStatus] = useState<RightsStatus | ''>('')
  const [response, setResponse] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const submit = () => {
    const e: Record<string, string> = {}
    if (!status) e.status = 'Choose the new status.'
    if ((status === 'Completed' || status === 'Rejected') && response.trim().length < 10) e.response = 'A response to the data principal is mandatory (reason / what was done).'
    setErr(e)
    if (Object.keys(e).length || !status) return
    const at = new Date().toISOString()
    const by = actor()
    patchItem('rights', r.id, (x) => {
      const y = x as RightsRequest
      return { ...y, status, response: response.trim() || y.response, closedAt: status === 'Completed' || status === 'Rejected' ? at : undefined, history: [...y.history, { at, actor: by, action: `Status → ${status}`, detail: response.trim() || undefined }] }
    })
    logPrivacy(by, `Rights request ${status.toLowerCase()}`, r.id, response.trim() || undefined)
    toast(`${r.id} → ${status}`)
    onClose()
  }
  return (
    <Modal title={`Update ${r.id}`} sub={`${r.type} · ${r.principal}`} onClose={onClose} width={600}>
      <div className="space-y-3">
        <p className="rounded-md bg-surface px-3 py-2 text-[12.5px] text-ink">{r.details}</p>
        {r.nominee && <Note>Nominee: {r.nominee.name} ({r.nominee.relation}) — {r.nominee.contact}</Note>}
        <SelectField label="New status" required options={NEXT[r.status]} value={status} onChange={(e) => setStatus(e.target.value as RightsStatus)} error={err.status} />
        <TextAreaField label="Response to the data principal" required={status === 'Completed' || status === 'Rejected'} value={response} onChange={(e) => setResponse(e.target.value)} error={err.response} />
        <div className="max-h-40 overflow-y-auto rounded-md border border-line p-2 text-[11.5px]">
          {r.history.map((h, i) => (
            <div key={`${h.at}-${i}`} className="py-0.5 text-muted">
              {fmtDT(h.at)} · <span className="text-ink">{h.action}</span> · {h.actor}
              {h.detail ? ` — ${h.detail}` : ''}
            </div>
          ))}
        </div>
        <FormActions onBack={onClose} onSubmit={submit} submitLabel="Update" />
      </div>
    </Modal>
  )
}

export default function Rights() {
  const p = usePrivacy()
  const now = useNow(60_000)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<RightsRequest | null>(null)
  const open = p.rights.filter((r) => NEXT[r.status].length > 0)

  const cols: Col<RightsRequest>[] = [
    { key: 'id', label: 'Request', value: (r) => r.id, className: 'font-mono text-[11.5px] font-semibold text-[#0066FF]' },
    { key: 'at', label: 'Received', value: (r) => fmtDT(r.createdAt), className: 'whitespace-nowrap text-muted' },
    { key: 'who', label: 'Data principal', value: (r) => `${r.principal} ${r.principalRef}`, render: (r) => (<>{r.principal}<span className="block text-[10.5px] text-muted">{r.principalRef} · {r.source}</span></>) },
    { key: 'type', label: 'Right', value: (r) => r.type, className: 'font-medium' },
    { key: 'det', label: 'Details', value: (r) => r.details, className: 'max-w-[240px] text-muted' },
    { key: 'st', label: 'Status', value: (r) => r.status, render: (r) => <Badge tone={rightsTone(r.status)}>{r.status}</Badge> },
    { key: 'due', label: 'SLA due', value: (r) => (NEXT[r.status].length ? `${fmtD(r.dueAt)}${rightsOverdue(r, now) ? ' (overdue)' : ''}` : `Closed ${fmtD(r.closedAt)}`), render: (r) => (NEXT[r.status].length ? <span className={rightsOverdue(r, now) ? 'font-semibold text-rose-600' : 'text-muted'}>{fmtD(r.dueAt)}{rightsOverdue(r, now) && ' · overdue'}</span> : <span className="text-muted">Closed {fmtD(r.closedAt)}</span>) },
  ]

  return (
    <PageShell back="/governance/privacy" backLabel="Back to DPDP Compliance" Icon={UserCheck} color="text-indigo-600 bg-indigo-50 border-indigo-200" title="User Rights Requests" sub="Track every data-principal request to completion within the configured timeline." actions={<Button icon={<Plus size={15} />} onClick={() => setCreating(true)}>New request</Button>}>
      <StatRow>
        <Stat label="Open requests" value={open.length} tone="blue" />
        <Stat label="Overdue" value={p.rights.filter((r) => rightsOverdue(r, now)).length} tone="red" />
        <Stat label="Completed" value={p.rights.filter((r) => r.status === 'Completed').length} tone="green" />
        <Stat label="Response timeline" value={`${p.settings.rightsSlaDays} days`} tone="purple" />
      </StatRow>
      <DataGrid
        rows={p.rights}
        cols={cols}
        rowKey={(r) => r.id}
        fileName="privacy-rights-requests"
        searchPlaceholder="Search request, principal, details…"
        filters={[
          { key: 'type', label: 'Rights', get: (r) => r.type, options: [...RIGHT_TYPES] },
          { key: 'st', label: 'Statuses', get: (r) => r.status, options: ['Submitted', 'Identity Verification', 'In Progress', 'Completed', 'Rejected'] },
          { key: 'src', label: 'Sources', get: (r) => r.source, options: ['Admin portal', 'Self-service', 'Mobile App'] },
        ]}
        date={(r) => r.createdAt}
        actions={(r) => <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>{NEXT[r.status].length ? 'Update' : 'View'}</Button>}
      />
      {creating && (
        <Modal title="New rights request" sub="Record a request received by email, letter or phone." onClose={() => setCreating(false)} width={720}>
          <RightsForm source="Admin portal" onBack={() => setCreating(false)} onDone={() => setCreating(false)} />
        </Modal>
      )}
      {editing && (NEXT[editing.status].length ? (
        <UpdateModal r={editing} onClose={() => setEditing(null)} />
      ) : (
        <Modal title={editing.id} sub={`${editing.type} · ${editing.status}`} onClose={() => setEditing(null)}>
          <div className="space-y-2 text-[12.5px]">
            <p>{editing.details}</p>
            {editing.response && <Note>Response: {editing.response}</Note>}
            {editing.history.map((h, i) => (
              <div key={`${h.at}-${i}`} className="text-[11.5px] text-muted">{fmtDT(h.at)} · <span className="text-ink">{h.action}</span> · {h.actor}{h.detail ? ` — ${h.detail}` : ''}</div>
            ))}
          </div>
        </Modal>
      ))}
    </PageShell>
  )
}
