import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Eye } from 'lucide-react'
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

  const rejected = decision?.event === 'Rejected'
  const callout = decision ? (
    <div className={rejected ? 'flex gap-3 rounded-xl bg-red-50 p-5' : 'flex gap-3 rounded-xl bg-emerald-50 p-5'}>
      {rejected ? <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" /> : <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />}
      <div className="min-w-0">
        <div className={rejected ? 'text-[15px] font-semibold text-red-700' : 'text-[15px] font-semibold text-emerald-700'}>
          Signed {decision.version} {decision.event.toLowerCase()} · {fmtDateTime(decision.at)}
        </div>
        {decision.note ? (
          <p className={rejected ? 'mt-1.5 text-[13px] text-red-700' : 'mt-1.5 text-[13px] text-emerald-700'}>
            {decision.actor}: “{decision.note}”
          </p>
        ) : (
          <p className="mt-1.5 text-[13px] text-ink-2">
            {decision.actor} · {decision.role}
          </p>
        )}
        {!signedApproved && (
          <p className="mt-1.5 text-[12px] text-muted">
            {templateApproval ? `${templateApproval.version} approval applies to the original template only. ` : ''}
            No signed {m.short.toLowerCase()} has been approved.
          </p>
        )}
      </div>
    </div>
  ) : undefined

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
            <div className="text-[18px] font-semibold">
              {m.title} · {doc.version}
            </div>
            <div className="mt-1 text-[13px] text-ink-2">
              <Link to={`/legal/${site.id}`} className="text-primary hover:underline">
                {site.id}
              </Link>{' '}
              <span className="text-muted"> / </span>ATM {site.atmId || 'not mapped'}<span className="text-muted"> / </span>
              {site.franchiseName}
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
