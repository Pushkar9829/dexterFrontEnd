import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CheckCircle2, ChevronLeft, ChevronRight, Download, FileText, Loader2, Minus, Plus, Sparkles } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/KpiCard'
import { Modal } from '@/components/ui/Modal'
import { TextAreaField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { KYC_DOCS, decide, getKycCase, updateCase, useKycCases, type KycCase, type KycCaseStatus } from '@/data/kyc'

const tone: Record<KycCaseStatus, 'blue' | 'green' | 'red'> = { 'Under Verification': 'blue', Approved: 'green', 'Resubmission requested': 'red' }
const fmt = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

// ── Queue ──────────────────────────────────────────────────────────────
export function KycQueue() {
  const cases = useKycCases()
  const navigate = useNavigate()
  const [tab, setTab] = useState<KycCaseStatus | 'all'>('Under Verification')
  const rows = cases.filter((c) => tab === 'all' || c.status === tab)
  const count = (s: KycCaseStatus) => cases.filter((c) => c.status === s).length

  const columns: GridColumn<KycCase>[] = [
    { key: 'id', header: 'Application', width: 130, sortable: true, render: (c) => <Link to={`/kyc/verification/${c.id}`} className="text-primary hover:underline">{c.id}</Link> },
    { key: 'applicant', header: 'Applicant', width: 240, sortable: true, filterable: true },
    { key: 'franchiseId', header: 'Franchise ID', width: 130, filterable: true },
    { key: 'loi', header: 'Site / LOI', width: 120 },
    { key: 'region', header: 'Region', width: 200, filterable: true },
    { key: 'docs', header: 'Documents', width: 110, value: (c) => c.docs.filter((d) => d.checked).length, render: (c) => `${c.docs.filter((d) => d.checked).length} of ${c.docs.length} checked` },
    { key: 'status', header: 'Status', width: 170, sortable: true, render: (c) => <Badge tone={tone[c.status]}>{c.status}</Badge> },
    { key: 'submittedAt', header: 'Latest upload', width: 150, sortable: true, render: (c) => fmt(c.submittedAt) },
    {
      key: 'act', header: 'Action', label: 'Action', width: 110, value: () => '',
      render: (c) => (
        <button onClick={() => navigate(`/kyc/verification/${c.id}`)} className="text-[12px] font-semibold text-primary hover:underline">
          {c.status === 'Under Verification' ? 'Verify →' : 'Open →'}
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="KYC Verification" sub="Compare uploaded identity documents with extracted details, then approve or request resubmission." />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting verification" value={count('Under Verification')} caption="Oldest first is recommended · 48 h SLA" />
        <StatCard label="Approved" value={count('Approved')} caption="Franchise KYC marked Verified" />
        <StatCard label="Resubmission requested" value={count('Resubmission requested')} caption="Waiting on the franchisee" />
      </div>
      <div className="mb-3 flex gap-2">
        {(['Under Verification', 'Approved', 'Resubmission requested', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('h-8 rounded-full border px-3 text-[13px]', tab === t ? 'border-primary bg-primary font-semibold text-white' : 'border-line bg-white text-ink-2')}
          >
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>
      <ExcelGrid key={tab} title="KYC queue" countLabel={`${rows.length} cases`} rows={rows} columns={columns} rowId={(c) => c.id} searchPlaceholder="Search applicant, ID or region" noun="cases" exportName="kyc-queue" />
    </div>
  )
}

// ── Mock document preview ─────────────────────────────────────────────
function DocPreview({ c, doc, zoom }: { c: KycCase; doc: string; zoom: number }) {
  return (
    <div className="grid h-full min-h-[520px] place-items-center overflow-auto bg-slate-200/70 p-6">
      <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }} className="transition-transform">
        {doc === 'PAN Card' ? (
          <div className="w-[500px] rounded-sm border border-amber-300 bg-[#f6efd9] p-6 shadow-md">
            <div className="flex justify-between text-[11px] font-bold">
              <span>आयकर विभाग<br />INCOME TAX DEPARTMENT</span>
              <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-amber-700/50" />
              <span className="text-right">भारत सरकार<br />GOVT. OF INDIA</span>
            </div>
            <div className="mt-6 flex gap-4">
              <div className="grid h-[112px] w-[92px] place-items-center bg-slate-300 text-[22px] font-semibold text-slate-600">
                {c.fields.nameOnPan.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </div>
              <div className="text-[12px]">
                <div className="text-[9px] text-muted">Name</div>
                <div className="text-[14px] font-bold uppercase">{c.fields.nameOnPan}</div>
                {c.fields.fatherName && (
                  <>
                    <div className="mt-2 text-[9px] text-muted">Father’s Name</div>
                    <div className="uppercase">{c.fields.fatherName}</div>
                  </>
                )}
                <div className="mt-2">DOB: {c.fields.dob.split('-').reverse().join(' / ')}</div>
              </div>
            </div>
            <div className="mt-5 text-[19px] font-bold tracking-wider">{c.fields.pan}</div>
          </div>
        ) : (
          <div className="w-[380px] rounded-sm bg-white p-6 shadow-md">
            <FileText size={28} className="text-primary" />
            <div className="mt-3 text-[15px] font-semibold">{doc}</div>
            <div className="mt-1 text-[12px] text-muted">{c.fields.nameOnPan}</div>
            <div className="mt-4 space-y-2">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="h-2 rounded bg-slate-200" style={{ width: `${95 - ((i * 13) % 40)}%` }} />
              ))}
            </div>
            {doc === 'Aadhaar' && <div className="mt-5 font-mono text-[15px] tracking-widest">XXXX XXXX {c.fields.aadhaarLast4}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Workspace ──────────────────────────────────────────────────────────
export function KycWorkspace() {
  const { caseId = '' } = useParams()
  useKycCases()
  const c = getKycCase(caseId)
  const navigate = useNavigate()
  const [doc, setDoc] = useState<string>('PAN Card')
  const [zoom, setZoom] = useState(100)
  const [verifying, setVerifying] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [openedAt] = useState(() => new Date().toISOString())
  if (!c) return <Navigate to="/kyc/verification" replace />

  const locked = c.status !== 'Under Verification'
  const current = c.docs.find((d) => d.type === doc)!
  const latest = current.versions[0]
  const setField = (k: keyof KycCase['fields'], v: string) => updateCase(c.id, { fields: { ...c.fields, [k]: v } })
  const setCheck = (k: keyof KycCase['checklist']) => updateCase(c.id, { checklist: { ...c.checklist, [k]: !c.checklist[k] } })
  const allChecked = Object.values(c.checklist).every(Boolean)

  const verify = () => {
    setVerifying(true)
    // simulated PAN / Aadhaar API round-trip
    setTimeout(() => {
      updateCase(c.id, {
        api: { at: new Date().toISOString(), nameMatch: 98 },
        checklist: { ...c.checklist, panActive: true, aadhaarConsent: true },
        docs: c.docs.map((d) => (d.type === 'Rent Agreement' ? d : { ...d, checked: true })),
      })
      setVerifying(false)
      toast('PAN & Aadhaar verified via API')
    }, 1100)
  }

  const input = 'h-9 w-full rounded-md border border-line bg-white px-3 text-[12px] outline-none focus:border-primary disabled:bg-surface'
  const field = (label: string, k: keyof KycCase['fields'], type = 'text', prefix?: string) => (
    <label className="block text-[11px] text-muted">
      {label}
      <span className="relative mt-1 block">
        {prefix && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-ink">{prefix}</span>}
        <input type={type} disabled={locked} value={c.fields[k] ?? ''} onChange={(e) => setField(k, e.target.value)} className={cn(input, 'text-ink', prefix && 'pl-12')} />
      </span>
    </label>
  )

  return (
    <div>
      <div className="-mt-1.5 mb-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] text-muted">Franchise / Applications / {c.id}</div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[25px] leading-[34px] font-medium">{c.applicant}</h1>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold', { blue: 'bg-primary-soft text-primary', green: 'bg-emerald-50 text-emerald-700', red: 'bg-red-50 text-brand-red' }[tone[c.status]])}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {c.status}
            </span>
          </div>
          <div className="font-mono text-[11px] text-muted">
            Site / LOI Number: {c.loi} · {c.region}
          </div>
        </div>
        <Button variant="secondary" icon={<ArrowLeft size={15} />} onClick={() => navigate('/kyc/verification')}>
          Back to applications
        </Button>
      </div>
      <div className="mb-4 border-b border-line">
        <span className="-mb-px inline-block border-b-2 border-primary px-1 py-2.5 text-[12px] font-semibold text-primary">KYC Documents</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        {/* documents */}
        <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
            <div>
              <h2 className="text-[15px] font-semibold">Uploaded documents</h2>
              <p className="text-[11px] text-muted">
                {c.docs.length} files · latest upload {fmt(c.submittedAt)} IST
              </p>
            </div>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => toast(`${latest.file} download starts when storage is connected`, 'info')}>
              Download
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 px-4 py-3">
            {KYC_DOCS.map((t) => {
              const d = c.docs.find((x) => x.type === t)!
              return (
                <button
                  key={t}
                  onClick={() => setDoc(t)}
                  className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px]', doc === t ? 'border-primary bg-primary-soft font-semibold text-primary' : 'border-line text-ink-2')}
                >
                  <FileText size={14} />
                  <span className="flex-1 truncate">{t}</span>
                  {d.checked && <CheckCircle2 size={14} className="text-emerald-600" />}
                </button>
              )
            })}
          </div>
          <div className="mx-4 flex items-center justify-between rounded-t-md bg-navy-900 px-3 py-2 font-mono text-[11px] text-white">
            <span className="truncate">{latest.file}</span>
            <span className="flex items-center gap-3">
              <button aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(50, z - 10))}><Minus size={13} /></button>
              {zoom}%
              <button aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(160, z + 10))}><Plus size={13} /></button>
              <ChevronLeft size={13} className="opacity-50" /> Page 1 / 1 <ChevronRight size={13} className="opacity-50" />
            </span>
          </div>
          <div className="relative mx-4 mb-4 flex-1">
            <DocPreview c={c} doc={doc} zoom={zoom} />
            {/* viewer watermark: [User Name] | [Company Name] | [Timestamp] */}
            <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
              <span className="-rotate-[24deg] font-mono text-[13px] whitespace-nowrap text-ink/10 select-none">
                Ananya Sharma | Dexter India | {fmt(openedAt)} IST
              </span>
            </div>
          </div>
        </section>

        {/* verification panel */}
        <section className="space-y-2.5 rounded-xl border border-line bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">PAN verification</h2>
              <p className="text-[11px] text-muted">Compare extracted details with source</p>
            </div>
            {c.api && <Badge tone="green">API matched</Badge>}
          </div>
          <Button size="sm" onClick={verify} disabled={verifying || locked} icon={verifying ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}>
            {verifying ? 'Verifying…' : 'Verify API · PAN & Aadhaar'}
          </Button>
          {c.api && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12px]">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                <Check size={14} /> Identity verified in real time
              </div>
              <div className="mt-1 text-emerald-700">
                PAN active · Name match {c.api.nameMatch}% · Aadhaar last 4 digits matched · Checked {fmt(c.api.at)} IST
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {field('PAN number', 'pan')}
            {field('Entity type', 'entityType')}
          </div>
          {field('Name on PAN', 'nameOnPan')}
          <div className="grid grid-cols-2 gap-3">
            {field('Date of birth', 'dob', 'date')}
            {field('Aadhaar last 4', 'aadhaarLast4', 'text', '••••')}
          </div>
          {field('Registered address', 'address')}
          <label className="block text-[11px] text-muted">
            Verifier note
            <input disabled={locked} value={c.note} onChange={(e) => updateCase(c.id, { note: e.target.value })} placeholder="Name, DOB and address match application records." className={cn(input, 'mt-1 text-ink')} />
          </label>

          <div className="rounded-lg border border-line bg-surface/70 px-3 py-2">
            <div className="mb-1 text-[11px] font-semibold">Verification checklist</div>
            {(
              [
                ['panActive', 'PAN is active and valid'],
                ['aadhaarConsent', 'Aadhaar consent captured'],
                ['addressLegible', 'Address proof is legible'],
                ['rentValid', 'Rent agreement valid through 2029'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 py-0.5 text-[11px]">
                <input type="checkbox" disabled={locked} checked={c.checklist[k]} onChange={() => setCheck(k)} />
                {label}
              </label>
            ))}
          </div>

          <div>
            <div className="mb-1.5 flex justify-between text-[11px]">
              <span className="font-semibold">Version history</span>
              <span className="text-[10px] text-muted">
                {doc} · {current.versions.length} version{current.versions.length > 1 ? 's' : ''}
              </span>
            </div>
            {current.versions.map((v, i) => (
              <div key={v.v} className="mb-1.5 flex items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1 text-[10px] leading-[14px]">
                <div>
                  <div className="font-medium text-ink">{fmt(v.at).replace(',', ' ·')}</div>
                  <div className="text-muted">{v.by}</div>
                </div>
                <span className="flex items-center gap-2">
                  <span className="text-muted">v{v.v}</span>
                  <Badge tone={i === 0 ? 'green' : 'gray'} dot={false}>{i === 0 ? 'Current' : 'Superseded'}</Badge>
                </span>
              </div>
            ))}
          </div>

          {c.decision && (
            <div className="rounded-md bg-surface px-3 py-2 text-[12px] text-ink-2">
              {c.status} by {c.decision.by} · {fmt(c.decision.at)}
              {c.decision.reason && <div className="mt-1 text-muted">“{c.decision.reason}”</div>}
            </div>
          )}

          {!locked && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="danger" onClick={() => setRejecting(true)}>
                Reject &amp; Ask for Resubmission
              </Button>
              <Button
                disabled={!allChecked}
                title={allChecked ? '' : 'Complete the verification checklist first'}
                onClick={() => {
                  decide(c.id, true)
                  toast(`${c.applicant} KYC approved · franchise marked Verified`)
                  navigate('/kyc/verification')
                }}
              >
                Approve
              </Button>
              {!allChecked && <p className="w-full text-[11px] text-muted">Approve unlocks when all checklist items are ticked.</p>}
            </div>
          )}
        </section>
      </div>

      {rejecting && (
        <Modal
          title="Reject & ask for resubmission"
          sub={`${c.applicant} · ${doc}`}
          onClose={() => setRejecting(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setRejecting(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={!reason.trim()}
                onClick={() => {
                  decide(c.id, false, reason.trim())
                  toast('Resubmission requested · franchisee notified', 'info')
                  navigate('/kyc/verification')
                }}
              >
                Send request
              </Button>
            </>
          }
        >
          <TextAreaField label="Reason shown to the franchisee" required name="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. PAN scan is blurred. Upload a clear colour copy." />
        </Modal>
      )}
    </div>
  )
}
