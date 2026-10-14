import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, BellRing, Building2, Download, FileText, History, MapPin, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'
import {
  DOC_META, cardNote, docsForSite, eventsForSite, fmtDate, fmtDateTime, getSite, pendingLine, readiness, sendReminder, siteCompliance, useLegal,
  type LegalDoc, type LegalSite, type LegalState,
} from '@/data/legal'
import { useProjects } from '@/data/projects'
import { BackLink, Fact, Monogram, Note, StatusBadge, Tabs } from './ui'

const TABS = ['Legal summary', 'Site information', 'Franchise details', 'Documents'] as const
type Tab = (typeof TABS)[number]

/** Master Site Record — legal summary plus site / franchise / document tabs. */
export default function SiteRecord() {
  const { siteId = '' } = useParams()
  const state = useLegal()
  const [params, setParams] = useSearchParams()
  const site = getSite(state, siteId)
  if (!site) return <Navigate to="/legal" replace />

  const tab = (TABS.find((t) => t === params.get('tab')) ?? 'Legal summary') as Tab
  const setTab = (t: Tab) => setParams(t === 'Legal summary' ? {} : { tab: t }, { replace: true })
  const docs = docsForSite(state, site.id)
  const events = eventsForSite(state, site.id)
  const compliance = siteCompliance(state, site.id)

  const exportSummary = () => {
    downloadCsv(
      `${site.id}-legal-summary`,
      ['Site ID', 'Location', 'Franchise', 'Document', 'Document ID', 'Version', 'Status', 'Note', 'Due'],
      docs.map((d) => [site.id, site.location, site.franchiseName, DOC_META[d.kind].title, d.id, d.version, d.status, cardNote(d), fmtDate(d.dueDate)]),
    )
    toast('Legal summary exported')
  }

  return (
    <div>
      <BackLink to="/legal">Back to Legal Data</BackLink>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Master Site Record</h1>
          <p className="mt-1 text-[14px] text-muted">Legal summary · One view of site compliance and linked documents</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportSummary}>
            Export summary
          </Button>
          <Button icon={<MapPin size={16} />} onClick={() => setTab('Site information')}>
            View site details
          </Button>
        </div>
      </div>

      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Monogram text={site.franchiseName} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[20px] font-semibold">{site.location}</h2>
              <StatusBadge status={compliance} />
            </div>
            <p className="mt-1 text-[13px] text-ink-2">
              {site.id} <span className="text-muted">/</span> {site.franchiseName} <span className="text-muted">/</span> {site.city}, {site.state}
            </p>
          </div>
          <div className="text-[12px] text-muted sm:text-right">
            <div>Last activity · {fmtDateTime(events[0]?.at)}</div>
            <div className="mt-0.5">Record owner · {site.owner}</div>
          </div>
        </div>
      </Card>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'Legal summary' && <Summary state={state} site={site} docs={docs} />}
      {tab === 'Site information' && <SiteInfo site={site} compliance={compliance} />}
      {tab === 'Franchise details' && <FranchiseInfo site={site} />}
      {tab === 'Documents' && <DocumentsTab site={site} docs={docs} state={state} />}
    </div>
  )
}

function Summary({ state, site, docs }: { state: LegalState; site: LegalSite; docs: LegalDoc[] }) {
  const r = readiness(state, site.id)
  const pending = docs.filter((d) => d.status === 'Action Required' || d.status === 'Resubmission Required')
  const latest = eventsForSite(state, site.id)[0]
  const latestDoc = latest && docs.find((d) => d.id === latest.ref)
  const loi = docs.find((d) => d.kind === 'LOI')
  const remind = () => {
    pending.forEach((d) => sendReminder(d.id))
    toast(`Reminder sent to ${site.signatory} for ${pending.length} document${pending.length > 1 ? 's' : ''}`)
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <Card className="p-5">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-muted">LEGAL READINESS</div>
              <div className="mt-2 text-[24px] font-semibold">
                {r.approved} of {r.total} approved
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                <div className={cn('h-full rounded-full', r.cleared ? 'bg-accent-green' : 'bg-primary')} style={{ width: `${(r.approved / Math.max(1, r.total)) * 100}%` }} />
              </div>
              <p className="mt-2 text-[12px] text-muted">
                {r.cleared
                  ? 'All required documents approved · Site legally cleared'
                  : `${loi?.status === 'Approved' ? 'LOI complete' : 'LOI pending'} · ${r.needAction} document${r.needAction === 1 ? '' : 's'} need action`}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Fact label="Mapped ATM ID">{site.atmId || 'Not mapped'}</Fact>
              <Fact label="Franchise ID">
                <Link to={`/franchise/master-data/${site.franchiseId}`} className="text-primary hover:underline">
                  {site.franchiseId}
                </Link>
              </Fact>
              <Fact label="Franchise tier">
                {site.tier} · {site.atms} ATMs
              </Fact>
              <p className="text-[12px] text-muted sm:col-span-3">
                {site.atmMappedOn
                  ? `ATM mapped on ${fmtDate(site.atmMappedOn)}. ${r.cleared ? 'Legal clearance is complete.' : 'Legal clearance is still pending.'}`
                  : 'No ATM mapped to this site yet.'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Legal documents" icon={<FileText size={18} />} sub={`${r.total} required documents · Latest versions`} />
          <div className="grid gap-3 px-5 pb-5 md:grid-cols-2 2xl:grid-cols-4">
            {docs.map((d) => (
              <DocCard key={d.id} doc={d} siteId={site.id} />
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="p-5">
          <h3 className="text-[15px] font-semibold">Pending with the franchisee</h3>
          {pending.length ? (
            <>
              <ol className="mt-3 space-y-2 text-[13px] text-ink-2">
                {pending.map((d, i) => (
                  <li key={d.id} className="flex gap-2">
                    <span className="font-semibold text-ink">{i + 1}.</span>
                    <Link to={`/legal/${site.id}/documents/${d.id}`} className="hover:text-primary">
                      {pendingLine(d)}
                    </Link>
                  </li>
                ))}
              </ol>
              <button onClick={remind} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
                <BellRing size={14} /> Send reminder to {site.signatory} <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <p className="mt-3 text-[13px] text-muted">Nothing is pending with {site.signatory}.</p>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-[15px] font-semibold">Latest legal activity</h3>
          {latest ? (
            <>
              <p className="mt-3 text-[13px] text-ink">
                {latest.actor} {latest.event === 'Reminder sent' ? 'sent a reminder for' : latest.event.toLowerCase()} {latestDoc ? `${DOC_META[latestDoc.kind].short} ${latest.version}` : latest.context}.
              </p>
              <p className="mt-1 text-[12px] text-muted">
                {fmtDateTime(latest.at)} · {latest.source === 'Mobile app' ? 'Franchisee mobile app' : 'Operator workspace'}
              </p>
              {latestDoc && (
                <Link to={`/legal/${site.id}/documents/${latestDoc.id}/audit`} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
                  View document audit history <ArrowRight size={14} />
                </Link>
              )}
            </>
          ) : (
            <p className="mt-3 text-[13px] text-muted">No activity recorded.</p>
          )}
        </Card>

        <Note>
          <ShieldCheck size={15} className="mb-1 text-primary" />
          Site clearance requires approved LOI, Affidavit and Agreement. ATM mapping does not imply legal approval.
          <div className="mt-1 text-muted">All dates in IST</div>
        </Note>
      </div>
    </div>
  )
}

function DocCard({ doc, siteId }: { doc: LegalDoc; siteId: string }) {
  const m = DOC_META[doc.kind]
  return (
    <div className="flex flex-col rounded-xl border border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[14px] font-semibold">{m.title}</div>
          <div className="text-[12px] text-muted">
            {doc.version}
            {!m.required && ' · Optional'}
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>
      <p className="mt-3 flex-1 text-[12px] text-ink-2">{cardNote(doc)}</p>
      <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3 text-[12px]">
        <span className="text-muted">{doc.id}</span>
        <Link to={`/legal/${siteId}/documents/${doc.id}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          Open document <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}

function SiteInfo({ site, compliance }: { site: LegalSite; compliance: string }) {
  const { projects } = useProjects()
  const project = projects.find((p) => p.siteId === site.id)
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="p-5">
        <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold">
          <MapPin size={17} className="text-primary" /> Site information
        </h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Site/LOI Number">{site.id}</Fact>
          <Fact label="Site location">{site.location}</Fact>
          <Fact label="Compliance">
            <StatusBadge status={compliance} />
          </Fact>
          <Fact label="Address" className="sm:col-span-2">
            {site.address}, {site.city}, {site.state} {site.pincode}
          </Fact>
          <Fact label="Pincode">{site.pincode}</Fact>
          <Fact label="City">{site.city}</Fact>
          <Fact label="State">{site.state}</Fact>
          <Fact label="Model">{site.model}</Fact>
          <Fact label="Mapped ATM ID">{site.atmId || 'Not mapped'}</Fact>
          <Fact label="ATM mapped on">{site.atmMappedOn ? fmtDate(site.atmMappedOn) : '—'}</Fact>
          <Fact label="Site record created">{fmtDate(site.createdOn)}</Fact>
          <Fact label="Record owner">{site.owner}</Fact>
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="text-[15px] font-semibold">Linked records</h3>
        <div className="mt-3 space-y-2 text-[13px]">
          {project ? (
            <Link to={`/projects/${project.archived ? 'archived' : 'active'}/${project.id}`} className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 hover:border-primary/50">
              <span>
                Project record <span className="text-muted">· {project.id}</span>
                {project.archived && <span className="text-muted"> (archived)</span>}
              </span>
              <ArrowRight size={14} className="text-primary" />
            </Link>
          ) : (
            <div className="rounded-lg border border-dashed border-line px-3 py-2.5 text-muted">No project record for this site</div>
          )}
          <Link to={`/cbr/consolidated?site=${site.id}`} className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 hover:border-primary/50">
            Consolidated Datewise CBR <ArrowRight size={14} className="text-primary" />
          </Link>
          <Link to={`/franchise/master-data/${site.franchiseId}`} className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 hover:border-primary/50">
            Franchise record · {site.franchiseId} <ArrowRight size={14} className="text-primary" />
          </Link>
        </div>
      </Card>
    </div>
  )
}

function FranchiseInfo({ site }: { site: LegalSite }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <Building2 size={17} className="text-primary" /> Franchise details
        </h3>
        <Link to={`/franchise/master-data/${site.franchiseId}`} className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
          Open franchise record <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Franchise ID">
          <Link to={`/franchise/master-data/${site.franchiseId}`} className="text-primary hover:underline">
            {site.franchiseId}
          </Link>
        </Fact>
        <Fact label="Name of Franchisee">{site.franchiseName}</Fact>
        <Fact label="Franchise tier">{site.tier}</Fact>
        <Fact label="ATMs in network">{site.atms}</Fact>
        <Fact label="Authorized signatory">{site.signatory}</Fact>
        <Fact label="Contact number">{site.contactNumber}</Fact>
        <Fact label="Email">{site.email}</Fact>
        <Fact label="MF (Master Franchise)">{site.mf}</Fact>
        <Fact label="Region">
          {site.city}, {site.state}
        </Fact>
        <Fact label="App access">Franchisee mobile app · {site.signatory}</Fact>
      </div>
    </Card>
  )
}

function DocumentsTab({ site, docs, state }: { site: LegalSite; docs: LegalDoc[]; state: LegalState }) {
  return (
    <Card>
      <CardHeader title="Documents" icon={<FileText size={18} />} sub={`${docs.length} documents · ${docs.reduce((n, d) => n + d.versions.length, 0)} versions · ${docs.reduce((n, d) => n + d.uploads.length, 0)} signed uploads`} />
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface text-left">
              {['Document', 'Document ID', 'Version', 'Status', 'Versions', 'Latest signed upload', 'Due', 'Events', ''].map((h) => (
                <th key={h} className="border-y border-line px-4 py-2.5 font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const up = d.uploads[d.uploads.length - 1]
              const n = state.audit.filter((e) => e.ref === d.id).length
              return (
                <tr key={d.id} className="hover:bg-surface/70">
                  <td className="border-b border-line-soft px-4 py-3 font-medium">
                    {DOC_META[d.kind].title}
                    {!DOC_META[d.kind].required && <span className="ml-1 text-[11px] text-muted">Optional</span>}
                  </td>
                  <td className="border-b border-line-soft px-4 py-3 text-muted">{d.id}</td>
                  <td className="border-b border-line-soft px-4 py-3">{d.version}</td>
                  <td className="border-b border-line-soft px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="border-b border-line-soft px-4 py-3">{d.versions.map((v) => v.version + (v.superseded ? ' (superseded)' : '')).join(', ')}</td>
                  <td className="border-b border-line-soft px-4 py-3">
                    {up ? (
                      <span>
                        {up.version} · {fmtDate(up.uploadedAt)}
                        <span className="block text-[11px] text-muted">{up.decision ?? 'Awaiting review'}</span>
                      </span>
                    ) : (
                      <span className="text-muted">Not yet uploaded</span>
                    )}
                  </td>
                  <td className="border-b border-line-soft px-4 py-3 whitespace-nowrap">{d.status === 'Approved' ? '—' : fmtDate(d.dueDate)}</td>
                  <td className="border-b border-line-soft px-4 py-3">
                    <Link to={`/legal/${site.id}/documents/${d.id}/audit`} className="inline-flex items-center gap-1 text-primary hover:underline">
                      <History size={13} /> {n}
                    </Link>
                  </td>
                  <td className="border-b border-line-soft px-4 py-3 whitespace-nowrap">
                    <Link to={`/legal/${site.id}/documents/${d.id}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                      Open <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
