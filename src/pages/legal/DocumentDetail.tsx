import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Clock3, Download, Eye, FileText, History, RefreshCw, Send, ShieldCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import {
  DOC_META, currentVersion, fmtDate, fmtDateTime, fmtShort, fmtTime, getDoc, getSite, istDay, lastAccess, nextVersion, pendingUpload, recordAccess, reviewUpload,
  sendReminder, shareRevision, useLegal, type LegalDoc, type LegalSite,
} from '@/data/legal'
import { BackLink, Fact, StatusBadge } from './ui'

const phrase: Record<string, string> = {
  'Action Required': 'Signed copy pending',
  'Under Review': 'Signed copy under review',
  Approved: 'Signed copy approved',
  'Resubmission Required': 'Resubmission requested',
}

type Dialog = null | 'view' | 'share' | 'approve' | 'reject'

/** Legal document detail — metadata, files & versions, workflow and legal-team actions. */
export default function DocumentDetail() {
  const { siteId = '', docId = '' } = useParams()
  const state = useLegal()
  const [dialog, setDialog] = useState<Dialog>(null)
  const doc = getDoc(state, docId)
  const site = doc && getSite(state, doc.siteId)
  if (!doc || !site) return <Navigate to={siteId ? `/legal/${siteId}` : '/legal'} replace />
  if (doc.siteId !== siteId) return <Navigate to={`/legal/${doc.siteId}/documents/${doc.id}`} replace />

  const m = DOC_META[doc.kind]
  const cur = currentVersion(doc)
  const pending = pendingUpload(doc)
  const access = lastAccess(state, doc.id)
  const base = `/legal/${site.id}/documents/${doc.id}`

  const download = () => {
    recordAccess(doc.id, 'Downloaded', 'Workspace', undefined, cur.file)
    toast(`${cur.file} · download recorded in the audit log (demo: file storage not connected)`, 'info')
  }
  const view = () => {
    recordAccess(doc.id, 'Viewed', 'Workspace', undefined, cur.file)
    setDialog('view')
  }
  const remind = () => {
    sendReminder(doc.id)
    toast(`Reminder sent to ${site.signatory} · recorded in audit history`)
  }

  return (
    <div>
      <BackLink to={`/legal/${site.id}`}>Back to Legal summary</BackLink>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{m.title}</h1>
          <p className="mt-1 text-[14px] text-muted">{doc.id} · Administrative document record</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`${base}/audit`}>
            <Button variant="secondary" icon={<History size={16} />}>
              Audit history
            </Button>
          </Link>
          <Button variant="secondary" icon={<Download size={16} />} onClick={download}>
            Download original
          </Button>
          <Button icon={<Eye size={16} />} onClick={view}>
            View document
          </Button>
        </div>
      </div>

      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <FileText size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-semibold">
                {m.title} · {doc.version}
              </h2>
              <StatusBadge status={doc.status} />
              <StatusBadge status="Current version" />
            </div>
            <p className="mt-1 text-[13px] text-ink-2">
              {site.franchiseName} <span className="text-muted">/</span> {site.location} <span className="text-muted">/</span> {phrase[doc.status]}
            </p>
          </div>
          <div className="sm:text-right">
            {doc.status === 'Approved' ? (
              <>
                <div className="text-[12px] text-muted">Signed copy</div>
                <div className="mt-1 text-[15px] font-semibold text-emerald-700">Approved</div>
              </>
            ) : (
              <>
                <div className="text-[12px] text-muted">Franchisee submission due</div>
                <div className="mt-1 text-[15px] font-semibold">{fmtDate(doc.dueDate)}</div>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <Head title="Document metadata" sub="Site mapping, ownership and version control" />
            <div className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Fact label="Site ID">
                  <Link to={`/legal/${site.id}`} className="hover:text-primary hover:underline">
                    {site.id}
                  </Link>
                </Fact>
                <Fact label="ATM ID">{site.atmId || 'Not mapped'}</Fact>
                <Fact label="Document ID">{doc.id}</Fact>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Fact label="Franchise name">{site.franchiseName}</Fact>
                <Fact label="Franchise ID / Tier">
                  <Link to={`/franchise/master-data/${site.franchiseId}`} className="hover:text-primary hover:underline">
                    {site.franchiseId}
                  </Link>{' '}
                  / {site.tier}
                </Fact>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Fact label="Authorized signatory">{site.signatory}</Fact>
                <Fact label="Document owner">{cur.createdBy}</Fact>
                <Fact label="Version / Status">
                  {doc.version} / {doc.status}
                </Fact>
                <Fact label="Created on">{fmtDateTime(cur.createdAt)}</Fact>
                <Fact label="Shared on">{fmtDateTime(cur.sharedAt)}</Fact>
                <Fact label="Access">Legal team & franchisee</Fact>
              </div>
            </div>
          </Card>

          <FilesCard
            doc={doc}
            site={site}
            onView={view}
            onDownload={download}
            onApprove={() => setDialog('approve')}
            onReject={() => setDialog('reject')}
            onShare={() => setDialog('share')}
          />
        </div>

        <div className="space-y-5">
          <Workflow doc={doc} site={site} />

          <div className="rounded-xl bg-primary-soft p-5">
            <h3 className="text-[16px] font-semibold text-primary">Instructions sent to franchisee</h3>
            <p className="mt-3 text-[13px] text-primary">{doc.instructions}</p>
            {doc.status !== 'Approved' && doc.status !== 'Under Review' ? (
              <Button className="mt-4" variant="secondary" icon={<Send size={15} />} onClick={remind}>
                Send reminder
              </Button>
            ) : (
              <p className="mt-3 text-[12px] text-muted">No reminder needed · {doc.status === 'Approved' ? 'document approved' : 'submission under review'}.</p>
            )}
          </div>

          <Card className="p-5">
            <h3 className="text-[16px] font-semibold">Last accessed</h3>
            {access ? (
              <>
                <p className="mt-3 text-[13px]">
                  {access.event} by {access.actor}
                </p>
                <p className="mt-2 text-[12px] text-muted">
                  {fmtDateTime(access.at)} · {access.source}
                </p>
              </>
            ) : (
              <p className="mt-3 text-[13px] text-muted">Not opened yet.</p>
            )}
            <Link to={`${base}/audit`} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
              Open audit history <ArrowRight size={14} />
            </Link>
          </Card>
        </div>
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-[11px] text-muted">
        <ShieldCheck size={14} className="shrink-0" />
        Every view, download, upload, share and review decision is recorded. Original files cannot be overwritten.
      </p>

      {dialog === 'view' && <ViewDialog doc={doc} site={site} onClose={() => setDialog(null)} onDownload={download} />}
      {dialog === 'share' && <ShareDialog doc={doc} site={site} onClose={() => setDialog(null)} />}
      {dialog === 'approve' && pending && (
        <Modal
          title="Approve signed upload"
          sub={`${m.title} · ${doc.version} · ${pending.file}`}
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                icon={<Check size={16} />}
                onClick={() => {
                  reviewUpload(doc.id, 'Approved')
                  setDialog(null)
                  toast(`${m.short} ${doc.version} approved · audit event recorded`)
                }}
              >
                Approve
              </Button>
            </>
          }
        >
          <p className="text-[13px] text-ink-2">
            Confirm that all {cur.pages} pages are signed by {site.signatory}
            {doc.kind === 'AGR' ? ' and the firm stamp is present on page 8' : ''}. The status changes to <b>Approved</b> and the decision is added to the immutable audit log.
          </p>
        </Modal>
      )}
      {dialog === 'reject' && pending && <RejectDialog doc={doc} file={pending.file} onClose={() => setDialog(null)} />}
    </div>
  )
}

function Head({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="border-b border-line px-6 py-5">
      <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
      {sub && <p className="mt-1.5 text-[13px] text-muted">{sub}</p>}
    </div>
  )
}

function FilesCard({
  doc, site, onView, onDownload, onApprove, onReject, onShare,
}: { doc: LegalDoc; site: LegalSite; onView: () => void; onDownload: () => void; onApprove: () => void; onReject: () => void; onShare: () => void }) {
  const cur = currentVersion(doc)
  const curUploads = doc.uploads.filter((u) => u.version === doc.version)
  const latest = curUploads[curUploads.length - 1]
  const older = doc.versions.filter((v) => v.superseded)
  const audit = `/legal/${site.id}/documents/${doc.id}/audit`
  return (
    <Card>
      <Head title="Files & versions" sub="The original is read-only. Signed uploads create a separate submission." />
      <div className="space-y-4 px-6 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <FileText size={22} className="shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{cur.file}</div>
            <div className="mt-0.5 text-[12px] text-muted">
              Original · PDF · {cur.sizeMb} MB · {cur.pages} pages
            </div>
          </div>
          <Button variant="secondary" icon={<Eye size={15} />} onClick={onView}>
            View
          </Button>
          <Button variant="secondary" icon={<Download size={15} />} onClick={onDownload}>
            Download
          </Button>
        </div>

        {latest ? (
          <div className={cn('flex flex-wrap items-center gap-3 rounded-lg p-4', latest.decision === 'Rejected' ? 'bg-red-50' : latest.decision ? 'bg-emerald-50' : 'bg-blue-50')}>
            {latest.decision === 'Rejected' ? (
              <XCircle size={17} className="shrink-0 text-red-600" />
            ) : latest.decision ? (
              <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
            ) : (
              <FileText size={17} className="shrink-0 text-blue-600" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{latest.file}</div>
              <div className="text-[12px] text-muted">
                Signed upload · {latest.sizeKb >= 1024 ? `${(latest.sizeKb / 1024).toFixed(1)} MB` : `${latest.sizeKb} KB`} · {latest.by} · {fmtDateTime(latest.uploadedAt)} · {latest.source}
              </div>
              {latest.decision && (
                <div className="mt-1 text-[12px]">
                  <b>{latest.decision}</b> by {latest.reviewer} · {fmtDateTime(latest.reviewedAt)}
                  {latest.reason && <span className="text-ink-2"> — “{latest.reason}”</span>}
                </div>
              )}
            </div>
            {!latest.decision && (
              <span className="flex gap-2">
                <Button size="sm" icon={<Check size={14} />} onClick={onApprove}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" icon={<XCircle size={14} />} onClick={onReject}>
                  Reject
                </Button>
              </span>
            )}
          </div>
        ) : (
          <div className="flex gap-3 rounded-lg bg-surface p-4">
            <Clock3 size={17} className="mt-0.5 shrink-0 text-ink-2" />
            <div>
              <div className="text-[13px] font-semibold">Signed version not yet uploaded</div>
              <div className="mt-0.5 text-[12px] text-muted">Awaiting {site.signatory}’s submission from the mobile app.</div>
            </div>
          </div>
        )}
        {doc.status === 'Resubmission Required' && latest?.decision === 'Rejected' && (
          <p className="text-[12px] text-muted">Awaiting a fresh signed upload of {doc.version} from {site.signatory}.</p>
        )}

        {older.map((v) => {
          const up = doc.uploads.filter((u) => u.version === v.version).pop()
          return (
            <div key={v.version} className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
              <span>
                {v.version} · Superseded on {fmtDate(v.superseded!.on)} · {up?.decision === 'Rejected' ? 'Signed upload rejected' : v.superseded!.reason}
              </span>
              <Link to={`${audit}?version=${v.version}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                View history <ArrowRight size={13} />
              </Link>
            </div>
          )
        })}
        <div className="flex justify-end border-t border-line-soft pt-3">
          <button onClick={onShare} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
            <RefreshCw size={13} /> Share revised original
          </button>
        </div>
      </div>
    </Card>
  )
}

function Workflow({ doc, site }: { doc: LegalDoc; site: LegalSite }) {
  const cur = currentVersion(doc)
  const up = doc.uploads.filter((u) => u.version === doc.version).pop()
  type S = 'done' | 'active' | 'todo' | 'alert'
  const steps: { title: string; sub: string; s: S }[] = [
    { title: 'Original prepared', sub: `${cur.createdBy} · ${fmtWhen(cur.createdAt)}`, s: 'done' },
    { title: 'Shared with franchisee', sub: `${site.signatory} · ${fmtWhen(cur.sharedAt)}`, s: cur.sharedAt ? 'done' : 'todo' },
    doc.status === 'Action Required'
      ? { title: 'Signed upload pending', sub: `Due ${fmtDate(doc.dueDate)}`, s: 'active' }
      : doc.status === 'Resubmission Required'
        ? { title: 'Signed upload rejected', sub: `Resubmission due ${fmtDate(doc.dueDate)}`, s: 'alert' }
        : { title: 'Signed upload received', sub: `${up?.by ?? site.signatory} · ${fmtWhen(up?.uploadedAt)}`, s: 'done' },
    doc.status === 'Approved'
      ? { title: 'Legal review & approval', sub: `Approved by ${up?.reviewer ?? '—'} · ${fmtWhen(up?.reviewedAt)}`, s: 'done' }
      : doc.status === 'Under Review'
        ? { title: 'Legal review & approval', sub: 'In review with the legal team', s: 'active' }
        : { title: 'Legal review & approval', sub: 'Starts after signed upload', s: 'todo' },
  ]
  return (
    <Card>
      <div className="border-b border-line px-6 py-5">
        <h3 className="text-[17px] font-semibold">Workflow status</h3>
      </div>
      <ol className="space-y-5 px-6 py-5">
        {steps.map((st) => (
          <li key={st.title} className="flex gap-3">
            <span
              className={cn(
                'grid h-6 w-6 shrink-0 place-items-center rounded-full',
                st.s === 'done' && 'bg-emerald-50 text-emerald-600',
                st.s === 'alert' && 'bg-red-50 text-red-600',
                (st.s === 'active' || st.s === 'todo') && 'bg-surface text-ink-2',
              )}
            >
              {st.s === 'done' ? <Check size={14} strokeWidth={2.5} /> : st.s === 'alert' ? <AlertTriangle size={13} /> : <Clock3 size={14} />}
            </span>
            <div>
              <div className="text-[13px] font-semibold">{st.title}</div>
              <div className="mt-0.5 text-[12px] text-muted">{st.sub}</div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

/** 07 Oct, 14:00 */
const fmtWhen = (iso?: string) => (iso ? `${fmtShort(iso)}, ${fmtTime(iso)}` : '—')

function ViewDialog({ doc, site, onClose, onDownload }: { doc: LegalDoc; site: LegalSite; onClose: () => void; onDownload: () => void }) {
  const cur = currentVersion(doc)
  const m = DOC_META[doc.kind]
  return (
    <Modal
      title={cur.file}
      sub={`Read-only preview · ${m.title} ${doc.version} · ${cur.pages} pages · View recorded in audit log`}
      onClose={onClose}
      width={760}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button icon={<Download size={16} />} onClick={onDownload}>
            Download original
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: cur.pages }, (_, i) => (
          <div key={i} className="relative aspect-[1/1.41] rounded-md border border-line bg-white p-2.5 shadow-sm">
            <div className="text-[8px] font-bold text-primary">DEXTER INDIA</div>
            <div className="mt-1 text-[7px] font-semibold">{m.title.toUpperCase()}</div>
            {Array.from({ length: 9 }, (_, j) => (
              <div key={j} className="mt-1.5 h-[3px] rounded bg-slate-200" style={{ width: `${60 + ((i * 7 + j * 13) % 40)}%` }} />
            ))}
            <div className="absolute right-2 bottom-6 left-2 border-t border-dashed border-slate-300 pt-0.5 text-[6px] text-muted">Signature · {site.signatory}</div>
            <div className="absolute right-2 bottom-1.5 text-[7px] text-muted">
              Page {i + 1} of {cur.pages}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-muted">
        {site.id} · {site.franchiseName} · Original is read-only and cannot be overwritten.
      </p>
    </Modal>
  )
}

const REASONS = ['Signed upload rejected', 'Commercial terms revised', 'Clause correction requested by legal', 'Signatory details changed']

function ShareDialog({ doc, site, onClose }: { doc: LegalDoc; site: LegalSite; onClose: () => void }) {
  const m = DOC_META[doc.kind]
  const v = nextVersion(doc.version)
  const lastRejected = doc.uploads.some((u) => u.version === doc.version && u.decision === 'Rejected')
  const [reason, setReason] = useState(lastRejected ? REASONS[0] : '')
  const [instructions, setInstructions] = useState(`Download ${v}, ${m.sign.charAt(0).toLowerCase()}${m.sign.slice(1)} Upload all ${m.pages} pages as one clear PDF.`)
  const today = istDay(new Date().toISOString())
  const [due, setDue] = useState(istDay(new Date(Date.now() + 5 * 86400e3).toISOString()))
  const [err, setErr] = useState<Record<string, string>>({})

  const submit = () => {
    const e: Record<string, string> = {}
    if (!reason) e.reason = 'Select why the original is being revised'
    if (instructions.trim().length < 15) e.instructions = 'Add clear instructions for the franchisee'
    if (!due || due < today) e.due = 'Due date must be today or later'
    setErr(e)
    if (Object.keys(e).length) return
    shareRevision(doc.id, { instructions: instructions.trim(), dueDate: due, reason })
    toast(`${m.short} ${v} shared with ${site.signatory} · ${doc.version} superseded`)
    onClose()
  }

  return (
    <Modal
      title="Share revised original"
      sub={`${m.title} · creates ${v} and supersedes ${doc.version}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={<Send size={16} />} onClick={submit}>
            Share {v}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {doc.status === 'Approved' && (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            <AlertTriangle size={15} className="shrink-0" /> This document is already approved. Sharing a revision resets it to Action Required.
          </div>
        )}
        <SelectField label="Reason for revision" required options={REASONS} value={reason} onChange={(e) => setReason(e.target.value)} error={err.reason} />
        <TextAreaField label="Instructions to franchisee" required rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} error={err.instructions} />
        <TextField label="Franchisee submission due" required type="date" min={today} value={due} onChange={(e) => setDue(e.target.value)} error={err.due} />
        <p className="text-[12px] text-muted">
          Recipient: {site.signatory} (franchisee mobile app). The previous original stays read-only and is marked Superseded.
        </p>
      </div>
    </Modal>
  )
}

function RejectDialog({ doc, file, onClose }: { doc: LegalDoc; file: string; onClose: () => void }) {
  const m = DOC_META[doc.kind]
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    if (reason.trim().length < 10) return setErr('Give the franchisee a clear reason (at least 10 characters)')
    reviewUpload(doc.id, 'Rejected', reason.trim())
    toast(`${m.short} ${doc.version} rejected · status set to Resubmission Required`)
    onClose()
  }
  return (
    <Modal
      title="Reject signed upload"
      sub={`${m.title} · ${doc.version} · ${file}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" icon={<XCircle size={16} />} onClick={submit}>
            Reject upload
          </Button>
        </>
      }
    >
      <TextAreaField
        label="Reason (shared with the franchisee)"
        required
        rows={4}
        placeholder={doc.kind === 'AGR' ? 'e.g. Firm stamp missing on page 8. Upload the complete signed PDF.' : 'e.g. Scan is not legible. Upload a clearer copy.'}
        value={reason}
        onChange={(e) => {
          setReason(e.target.value)
          setErr('')
        }}
        error={err}
      />
      <p className="mt-2 text-[12px] text-muted">The status changes to Resubmission Required. The reason stays attached to the audit event.</p>
    </Modal>
  )
}
