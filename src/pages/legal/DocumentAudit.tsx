import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Eye, Gavel } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DOC_META, eventsFor, fmtDateTime, getDoc, getSite, useLegal } from '@/data/legal'
import { AuditHistory } from './AuditHistory'
import { StatusBadge } from './ui'

/** Audit History · complete lifecycle of one legal document across all versions (read-only). */
export default function DocumentAudit() {
  const { siteId = '', docId = '' } = useParams()
  const [params] = useSearchParams()
  const state = useLegal()
  const doc = getDoc(state, docId)
  const site = doc && getSite(state, doc.siteId)
  if (!doc || !site) return <Navigate to={siteId ? `/legal/${siteId}` : '/legal'} replace />

  const m = DOC_META[doc.kind]
  const events = eventsFor(state, doc.id)
  const decision = events.find((e) => (e.event === 'Rejected' || e.event === 'Approved') && e.context.startsWith('Signed'))
  const signedApproved = events.some((e) => e.event === 'Approved' && e.context.startsWith('Signed'))
  const templateApproval = events.find((e) => e.event === 'Approved' && e.context === 'Original template')
  const detail = `/legal/${site.id}/documents/${doc.id}`

  const callout = (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
        <Gavel size={16} className="text-primary" /> Review decision
      </div>
      {decision ? (
        <>
          <div className={decision.event === 'Rejected' ? 'text-[13px] font-semibold text-red-700' : 'text-[13px] font-semibold text-emerald-700'}>
            Signed {decision.version} {decision.event.toLowerCase()} · {fmtDateTime(decision.at)}
          </div>
          <div className="mt-1 text-[12px] text-muted">
            {decision.actor} · {decision.role}
          </div>
          {decision.note && <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-[12px] text-ink-2">“{decision.note}”</p>}
        </>
      ) : (
        <p className="text-[12px] text-muted">No signed upload has been reviewed yet.</p>
      )}
      {!signedApproved && (
        <p className="mt-2 text-[12px] text-ink-2">
          {templateApproval ? `${templateApproval.version} approval applies to the original template only. ` : ''}
          No signed {m.short.toLowerCase()} has been approved.
        </p>
      )}
    </div>
  )

  return (
    <AuditHistory
      back={{ to: detail, label: 'Back to document detail' }}
      sub={`${m.title} · ${doc.id} · Complete lifecycle across all versions`}
      actions={
        <Link to={detail}>
          <Button icon={<Eye size={16} />}>View document</Button>
        </Link>
      }
      context={
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">
              {m.title} · {doc.version}
            </div>
            <div className="mt-0.5 text-[12px] text-ink-2">
              <Link to={`/legal/${site.id}`} className="text-primary hover:underline">
                {site.id}
              </Link>{' '}
              / ATM {site.atmId || 'not mapped'} / {site.franchiseName}
            </div>
          </div>
          <StatusBadge status={doc.status} />
        </div>
      }
      events={events}
      gridTitle="Document lifecycle"
      exportName={`${doc.id}-audit-log`}
      callout={callout}
      footerRef={doc.id}
      initialVersion={params.get('version') ?? ''}
    />
  )
}
