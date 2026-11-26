import { apiEnabled } from '@/lib/api'
// §18 Backup & disaster recovery — run a backup and restore one straight from the UI.
import { useState } from 'react'
import { DatabaseBackup, Play, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { logSecurity, securityStore, sid, usePolicy, useSecurity, type BackupRun } from '@/data/security'
import { ConfirmModal, DataGrid, FormActions, Note, PageShell, Stat, StatRow, type Col } from './kit'
import { actor, fmtDT } from './util'

const SCOPES: BackupRun['scope'][] = ['Full database', 'Security logs', 'Documents']
const SIZE: Record<BackupRun['scope'], number> = { 'Full database': 2390, 'Security logs': 142, Documents: 5120 }

export default function Backup() {
  const sec = useSecurity()
  const policy = usePolicy()
  const [runOpen, setRunOpen] = useState(false)
  const [scope, setScope] = useState<BackupRun['scope'] | ''>('')
  const [note, setNote] = useState('')
  const [scopeErr, setScopeErr] = useState('')
  const [restore, setRestore] = useState<BackupRun | null>(null)

  const completed = sec.backups.filter((b) => b.status === 'Completed')
  const last = completed[0]

  const runNow = () => {
    if (!scope) {
      setScopeErr('Select what to back up.')
      return
    }
    const run: BackupRun = { id: sid('BKP'), at: new Date().toISOString(), kind: 'Manual', scope, sizeMb: SIZE[scope], encrypted: true, status: 'Completed' }
    securityStore.set((s) => ({ ...s, backups: [run, ...s.backups] }))
    logSecurity({ actor: actor(), action: 'Manual backup run', target: run.id, detail: `${scope}, ${run.sizeMb} MB, AES-256 encrypted${note.trim() ? ` — ${note.trim()}` : ''}` })
    toast(`Backup ${run.id} completed (${scope}).`)
    setRunOpen(false)
    setScope('')
    setNote('')
    setScopeErr('')
  }

  const doRestore = (reason: string) => {
    if (!restore) return
    const who = actor()
    const at = new Date().toISOString()
    securityStore.set((s) => ({ ...s, backups: s.backups.map((b) => (b.id === restore.id ? { ...b, restoredAt: at, restoredBy: who } : b)) }))
    logSecurity({ actor: who, action: 'Backup restored', target: restore.id, detail: `${restore.scope} from ${fmtDT(restore.at)} — ${reason}` })
    toast(`Restore of ${restore.id} started. Users will be notified when the system is back.`)
    setRestore(null)
  }

  const cols: Col<BackupRun>[] = [
    { key: 'id', label: 'Backup ID', value: (b) => b.id, className: 'font-mono text-[11.5px] font-semibold text-[#0066FF]' },
    { key: 'at', label: 'Taken at', value: (b) => fmtDT(b.at), className: 'whitespace-nowrap' },
    { key: 'kind', label: 'Type', value: (b) => b.kind },
    { key: 'scope', label: 'Scope', value: (b) => b.scope },
    { key: 'size', label: 'Size', value: (b) => `${b.sizeMb.toLocaleString('en-IN')} MB` },
    { key: 'enc', label: 'Encryption', value: (b) => (b.encrypted ? 'AES-256' : 'Not encrypted'), render: (b) => <Badge tone={b.encrypted ? 'green' : 'red'}>{b.encrypted ? 'AES-256' : 'Not encrypted'}</Badge> },
    { key: 'st', label: 'Status', value: (b) => b.status, render: (b) => <Badge tone={b.status === 'Completed' ? 'green' : b.status === 'Failed' ? 'red' : 'blue'}>{b.status}</Badge> },
    { key: 'rest', label: 'Last restored', value: (b) => (b.restoredAt ? `${fmtDT(b.restoredAt)} by ${b.restoredBy}` : ''), className: 'text-[11px] text-muted' },
  ]

  return (
    <PageShell
      Icon={DatabaseBackup}
      color="text-teal-600 bg-teal-50 border-teal-200"
      title="Backup & Disaster Recovery"
      sub="Encrypted, scheduled backups of the database, security logs and documents. Restore is a simple guided step from this screen."
      actions={
        <Button icon={<Play size={15} />} onClick={() => setRunOpen(true)}>
      {apiEnabled && <Note tone="amber">The backend has no backup endpoints yet — this page still shows demo backup runs stored in this browser.</Note>}
          Run backup now
        </Button>
      }
    >
      <StatRow>
        <Stat label="Schedule" value={policy.backupFrequency} tone="blue" />
        <Stat label="RPO / RTO" value={`${policy.rpoHours}h / ${policy.rtoHours}h`} tone="purple" />
        <Stat label="Last good backup" value={last ? fmtDT(last.at).split(',')[0] : '—'} tone="green" />
        <Stat label="Failed runs" value={sec.backups.filter((b) => b.status === 'Failed').length} tone="red" />
      </StatRow>
      <Note>
        All backups are encrypted (AES-256) and only Super Admin / Admin can run or restore them. Schedule, RPO and RTO come from Central Security Administration. Test a restore periodically on a staging copy (§18).
      </Note>
      <DataGrid
        rows={sec.backups}
        cols={cols}
        rowKey={(b) => b.id}
        fileName="backup-runs"
        searchPlaceholder="Search backup ID, scope…"
        filters={[
          { key: 'scope', label: 'Scopes', get: (b) => b.scope, options: SCOPES },
          { key: 'st', label: 'Statuses', get: (b) => b.status, options: ['Completed', 'Failed', 'Running'] },
          { key: 'kind', label: 'Types', get: (b) => b.kind, options: ['Scheduled', 'Manual'] },
        ]}
        date={(b) => b.at}
        actions={(b) =>
          b.status === 'Completed' ? (
            <Button size="sm" variant="secondary" icon={<RotateCcw size={13} />} onClick={() => setRestore(b)}>
              Restore
            </Button>
          ) : (
            <span className="text-[11px] text-muted">—</span>
          )
        }
      />

      {runOpen && (
        <Modal title="Run backup now" sub="Creates an encrypted manual backup." onClose={() => setRunOpen(false)}>
          <div className="space-y-3">
            <SelectField label="Scope" required options={SCOPES} value={scope} error={scopeErr} onChange={(e) => { setScope(e.target.value as BackupRun['scope']); setScopeErr('') }} />
            <TextAreaField label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Note>Encryption: AES-256 (mandatory, cannot be turned off).</Note>
            <FormActions onBack={() => setRunOpen(false)} onSubmit={runNow} submitLabel="Start backup" />
          </div>
        </Modal>
      )}

      {restore && (
        <ConfirmModal
          title={`Restore ${restore.id}?`}
          sub={`${restore.scope} taken ${fmtDT(restore.at)}. Data changed after this point will be lost.`}
          confirmLabel="Restore"
          danger
          requireText="RESTORE"
          reasonLabel="Reason for restore"
          onConfirm={doRestore}
          onClose={() => setRestore(null)}
        />
      )}
    </PageShell>
  )
}
