// Data retention policy (DPDP parameter 12) + secure deletion queue (parameter 13).
import { useState } from 'react'
import { Archive, Pencil, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { DEPARTMENTS, logPrivacy, nextId, patchItem, privacyStore, shortId, usePrivacy, type DeletionItem, type RetentionPolicy } from '@/data/privacy'
import { ConfirmModal, DataGrid, FormActions, Note, PageShell, Stat, StatRow, Tabs, type Col } from '../security/kit'
import { actor, fmtD, useNow } from '../security/util'

type Tab = 'policy' | 'queue'
const AFTER: RetentionPolicy['afterExpiry'][] = ['Secure delete', 'Anonymise', 'Archive (encrypted)', 'Review']
type Act = { kind: 'approve' | 'delete' | 'hold' | 'release'; d: DeletionItem }

function PolicyForm({ initial, onClose }: { initial: RetentionPolicy | null; onClose: () => void }) {
  const [f, setF] = useState({
    category: initial?.category ?? '',
    purpose: initial?.purpose ?? '',
    legalBasis: initial?.legalBasis ?? '',
    periodMonths: initial ? String(initial.periodMonths) : '',
    afterExpiry: initial?.afterExpiry ?? '',
    owner: initial?.owner ?? '',
  })
  const [err, setErr] = useState<Record<string, string>>({})
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }))
  const submit = () => {
    const e: Record<string, string> = {}
    if (!f.category.trim()) e.category = 'Required.'
    if (!f.purpose.trim()) e.purpose = 'Required.'
    if (!f.legalBasis.trim()) e.legalBasis = 'State the law / basis for the period.'
    const m = Number(f.periodMonths)
    if (!Number.isInteger(m) || m < 1 || m > 240) e.periodMonths = 'Whole months, 1–240.'
    if (!f.afterExpiry) e.afterExpiry = 'Required.'
    if (!f.owner) e.owner = 'Required.'
    setErr(e)
    if (Object.keys(e).length) return
    const by = actor()
    const rec: RetentionPolicy = { id: initial?.id ?? shortId('RET'), category: f.category.trim(), purpose: f.purpose.trim(), legalBasis: f.legalBasis.trim(), periodMonths: m, afterExpiry: f.afterExpiry as RetentionPolicy['afterExpiry'], owner: f.owner }
    if (initial) {
      patchItem('retention', initial.id, () => rec)
      const changes = [initial.periodMonths !== m ? `period ${initial.periodMonths} → ${m} months` : '', initial.afterExpiry !== rec.afterExpiry ? `after expiry ${initial.afterExpiry} → ${rec.afterExpiry}` : ''].filter(Boolean).join('; ')
      logPrivacy(by, 'Retention policy updated', rec.category, changes || 'Details edited')
    } else {
      privacyStore.set((s) => ({ ...s, retention: [...s.retention, rec] }))
      logPrivacy(by, 'Retention policy added', rec.category, `${m} months, ${rec.afterExpiry}`)
    }
    toast('Retention policy saved.')
    onClose()
  }
  return (
    <Modal title={initial ? `Edit — ${initial.category}` : 'Add data category'} onClose={onClose} width={640}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Data category" required value={f.category} onChange={(e) => set('category', e.target.value)} error={err.category} />
          <SelectField label="Owner department" required options={[...DEPARTMENTS]} value={f.owner} onChange={(e) => set('owner', e.target.value)} error={err.owner} />
          <TextField label="Purpose" required className="sm:col-span-2" value={f.purpose} onChange={(e) => set('purpose', e.target.value)} error={err.purpose} />
          <TextAreaField label="Legal retention basis" required className="sm:col-span-2" rows={2} value={f.legalBasis} onChange={(e) => set('legalBasis', e.target.value)} error={err.legalBasis} />
          <TextField label="Retention period (months)" required type="number" value={f.periodMonths} onChange={(e) => set('periodMonths', e.target.value)} error={err.periodMonths} />
          <SelectField label="Action after expiry" required options={AFTER} value={f.afterExpiry} onChange={(e) => set('afterExpiry', e.target.value)} error={err.afterExpiry} />
        </div>
        <FormActions onBack={onClose} onSubmit={submit} submitLabel="Save policy" />
      </div>
    </Modal>
  )
}

export default function Retention() {
  const p = usePrivacy()
  const now = useNow(60_000)
  const [tab, setTab] = useState<Tab>('policy')
  const [editing, setEditing] = useState<RetentionPolicy | null | 'new'>(null)
  const [act, setAct] = useState<Act | null>(null)

  const run = (reason: string) => {
    if (!act) return
    const { d } = act
    const at = new Date().toISOString()
    const by = actor()
    if (act.kind === 'approve') {
      patchItem('deletion', d.id, (x) => ({ ...x, status: 'Approved', approvedBy: by, approvedAt: at }))
      logPrivacy(by, 'Deletion approved', d.recordRef, `${d.category} — ${d.principal}`)
      toast(`Deletion of ${d.recordRef} approved.`)
    } else if (act.kind === 'delete') {
      const cert = nextId('DC', privacyStore.get().deletion.filter((x) => x.certificate).map((x) => ({ id: x.certificate! })))
      patchItem('deletion', d.id, (x) => ({ ...x, status: 'Deleted', deletedAt: at, deletedBy: by, certificate: cert }))
      logPrivacy(by, 'Record securely deleted', d.recordRef, `${d.category} — ${d.principal}; certificate ${cert}; primary store + backups queued for purge`)
      toast(`${d.recordRef} securely deleted. Certificate ${cert}.`)
    } else if (act.kind === 'hold') {
      patchItem('deletion', d.id, (x) => ({ ...x, status: 'Legal Hold', hold: { reason, by, at } }))
      logPrivacy(by, 'Legal hold applied', d.recordRef, reason)
      toast(`Legal hold applied to ${d.recordRef}.`)
    } else {
      patchItem('deletion', d.id, (x) => ({ ...x, status: 'Due', hold: undefined }))
      logPrivacy(by, 'Legal hold released', d.recordRef, reason)
      toast(`Legal hold released on ${d.recordRef}.`)
    }
    setAct(null)
  }

  const policyCols: Col<RetentionPolicy>[] = [
    { key: 'cat', label: 'Data category', value: (r) => r.category, className: 'font-medium text-ink' },
    { key: 'purpose', label: 'Purpose', value: (r) => r.purpose, className: 'max-w-[200px] text-muted' },
    { key: 'basis', label: 'Legal retention basis', value: (r) => r.legalBasis, className: 'max-w-[240px] text-[11.5px] text-muted' },
    { key: 'period', label: 'Period', value: (r) => (r.periodMonths % 12 === 0 ? `${r.periodMonths / 12} yr` : `${r.periodMonths} mo`), className: 'whitespace-nowrap font-semibold' },
    { key: 'after', label: 'After expiry', value: (r) => r.afterExpiry, render: (r) => <Badge tone={r.afterExpiry === 'Secure delete' ? 'red' : r.afterExpiry === 'Review' ? 'amber' : 'blue'}>{r.afterExpiry}</Badge> },
    { key: 'owner', label: 'Owner', value: (r) => r.owner, className: 'text-[11.5px]' },
  ]
  const queueCols: Col<DeletionItem>[] = [
    { key: 'ref', label: 'Record', value: (d) => d.recordRef, render: (d) => (<><span className="font-mono text-[11.5px] font-semibold">{d.recordRef}</span><span className="block text-[10.5px] text-muted">{d.id}</span></>) },
    { key: 'cat', label: 'Category', value: (d) => d.category },
    { key: 'who', label: 'Data principal', value: (d) => d.principal },
    { key: 'col', label: 'Collected', value: (d) => fmtD(d.collectedOn), className: 'whitespace-nowrap text-muted' },
    { key: 'exp', label: 'Retention expired', value: (d) => fmtD(d.expiresOn), render: (d) => <span className={new Date(d.expiresOn).getTime() < now && (d.status === 'Due' || d.status === 'Approved') ? 'font-semibold text-rose-600' : 'text-muted'}>{fmtD(d.expiresOn)}</span> },
    { key: 'st', label: 'Status', value: (d) => d.status, render: (d) => (<><Badge tone={d.status === 'Deleted' ? 'green' : d.status === 'Legal Hold' ? 'purple' : d.status === 'Approved' ? 'blue' : 'amber'}>{d.status}</Badge>{d.hold && <span className="mt-0.5 block max-w-[180px] text-[10.5px] text-muted">{d.hold.reason}</span>}</>) },
    { key: 'trail', label: 'Approved / deleted', value: (d) => [d.approvedBy && `approved ${d.approvedBy}`, d.deletedBy && `deleted ${d.deletedBy}`, d.certificate].filter(Boolean).join(' · '), className: 'text-[11px] text-muted' },
  ]
  const due = p.deletion.filter((d) => d.status === 'Due' || d.status === 'Approved')

  return (
    <PageShell
      back="/governance/privacy"
      backLabel="Back to DPDP Compliance"
      Icon={Archive}
      color="text-teal-600 bg-teal-50 border-teal-200"
      title="Data Retention & Deletion"
      sub="Keep personal data only for its purpose and legal period, then delete it securely — unless a legal hold applies."
      actions={tab === 'policy' && <Button icon={<Plus size={15} />} onClick={() => setEditing('new')}>Add category</Button>}
    >
      <StatRow>
        <Stat label="Data categories" value={p.retention.length} />
        <Stat label="Due for deletion" value={due.length} tone="amber" />
        <Stat label="On legal hold" value={p.deletion.filter((d) => d.status === 'Legal Hold').length} tone="purple" />
        <Stat label="Securely deleted" value={p.deletion.filter((d) => d.status === 'Deleted').length} tone="green" />
      </StatRow>
      <Tabs
        tabs={[
          { value: 'policy', label: 'Retention policy', count: p.retention.length },
          { value: 'queue', label: 'Secure deletion queue', count: due.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'policy' ? (
        <DataGrid
          rows={p.retention}
          cols={policyCols}
          rowKey={(r) => r.id}
          fileName="retention-policy"
          searchPlaceholder="Search category, purpose, law…"
          filters={[
            { key: 'after', label: 'Expiry actions', get: (r) => r.afterExpiry, options: AFTER },
            { key: 'owner', label: 'Owners', get: (r) => r.owner },
          ]}
          actions={(r) => <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => setEditing(r)}>Edit</Button>}
        />
      ) : (
        <>
          <Note>Two-step deletion: an approver releases the record, then secure deletion runs (primary store + backup purge) and a deletion certificate is issued. Legal hold blocks deletion until released.</Note>
          <DataGrid
            rows={p.deletion}
            cols={queueCols}
            rowKey={(d) => d.id}
            fileName="secure-deletion-queue"
            searchPlaceholder="Search record, principal…"
            filters={[
              { key: 'st', label: 'Statuses', get: (d) => d.status, options: ['Due', 'Approved', 'Legal Hold', 'Deleted'] },
              { key: 'cat', label: 'Categories', get: (d) => d.category },
            ]}
            date={(d) => d.expiresOn}
            actions={(d) =>
              d.status === 'Due' ? (
                <>
                  <Button size="sm" onClick={() => setAct({ kind: 'approve', d })}>Approve deletion</Button>
                  <Button size="sm" variant="secondary" onClick={() => setAct({ kind: 'hold', d })}>Legal hold</Button>
                </>
              ) : d.status === 'Approved' ? (
                <>
                  <Button size="sm" variant="danger" onClick={() => setAct({ kind: 'delete', d })}>Delete securely</Button>
                  <Button size="sm" variant="secondary" onClick={() => setAct({ kind: 'hold', d })}>Legal hold</Button>
                </>
              ) : d.status === 'Legal Hold' ? (
                <Button size="sm" variant="secondary" onClick={() => setAct({ kind: 'release', d })}>Release hold</Button>
              ) : (
                <span className="text-[11px] text-muted">{fmtD(d.deletedAt)}</span>
              )
            }
          />
        </>
      )}
      {editing && <PolicyForm initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {act && (
        <ConfirmModal
          title={act.kind === 'approve' ? `Approve deletion of ${act.d.recordRef}?` : act.kind === 'delete' ? `Securely delete ${act.d.recordRef}?` : act.kind === 'hold' ? `Legal hold on ${act.d.recordRef}` : `Release legal hold on ${act.d.recordRef}?`}
          sub={act.kind === 'delete' ? 'Permanent: the record is erased from the primary store and purged from backups. This cannot be undone.' : `${act.d.category} — ${act.d.principal}`}
          confirmLabel={act.kind === 'approve' ? 'Approve' : act.kind === 'delete' ? 'Delete permanently' : act.kind === 'hold' ? 'Apply hold' : 'Release'}
          danger={act.kind === 'delete'}
          requireText={act.kind === 'delete' ? 'DELETE' : undefined}
          reasonLabel={act.kind === 'hold' ? 'Legal reason (case / notice reference)' : act.kind === 'release' ? 'Reason for release' : undefined}
          onConfirm={run}
          onClose={() => setAct(null)}
        />
      )}
    </PageShell>
  )
}
