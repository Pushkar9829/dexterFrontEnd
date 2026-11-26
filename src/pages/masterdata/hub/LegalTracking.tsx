import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FileDrop, TextAreaField, type FileValue } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { LEGAL_SEQUENCE, nowIso, useSites, updateSite, type LegalDocKey, type LegalTrack, type Site } from '@/data/network'
import { useFrMap, useHubRights } from './hooks'
import { actor } from './hubStore'
import { DataTable, FilterSelect, PageShell, ReadOnlyNote, StatStrip, TableBar, type Col } from './ui'

const DOC_LABEL: Record<LegalDocKey, string> = { LOI: 'LOI / Allotment Letter', Affidavit: 'Affidavit', Agreement: 'Agreement', KYC: 'KYC Verification', PVC: 'Police Verification (PVC)' }
type Row = { key: string; site: Site; doc: LegalDocKey; t: LegalTrack }
type Mode = 'upload' | 'verify' | 'reject' | 'reupload'

export default function LegalTracking() {
  const { sites } = useSites()
  const frMap = useFrMap()
  const rights = useHubRights()
  const frName = useCallback((id: string) => frMap.get(id)?.name ?? id, [frMap])
  const [q, setQ] = useState('')
  const [fr, setFr] = useState('all')
  const [doc, setDoc] = useState('all')
  const [upload, setUpload] = useState('all')
  const [ver, setVer] = useState('all')
  const [fin, setFin] = useState('Pending')
  const [act, setAct] = useState<{ row: Row; mode: Mode } | null>(null)

  const all = useMemo<Row[]>(() => sites.flatMap((s) => LEGAL_SEQUENCE.map((d) => ({ key: `${s.siteId}-${d}`, site: s, doc: d, t: s.legal[d] }))), [sites])
  const frOptions = useMemo(() => [...new Set(sites.map((s) => s.frId))].map((id) => ({ value: id, label: `${frName(id)} (${id})` })).sort((a, b) => a.label.localeCompare(b.label)), [sites, frName])
  const report = useMemo(() => {
    const pend = (d: LegalDocKey) => all.filter((r) => r.doc === d && r.t.final !== 'Complete').length
    return {
      total: all.filter((r) => r.t.final !== 'Complete').length,
      LOI: pend('LOI'), Affidavit: pend('Affidavit'), Agreement: pend('Agreement'), KYC: pend('KYC'), PVC: pend('PVC'),
      rejected: all.filter((r) => r.t.verification === 'Rejected').length,
      reupload: all.filter((r) => r.t.verification === 'Re-upload Required').length,
    }
  }, [all])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter(
      (r) =>
        (fr === 'all' || r.site.frId === fr) &&
        (doc === 'all' || r.doc === doc) &&
        (upload === 'all' || r.t.upload === upload) &&
        (ver === 'all' || r.t.verification === ver) &&
        (fin === 'all' || r.t.final === fin) &&
        (!s || `${r.site.siteId} ${r.site.atmId} ${r.site.frId} ${frName(r.site.frId)}`.toLowerCase().includes(s)),
    )
  }, [all, q, fr, doc, upload, ver, fin, frName])

  const open = (row: Row, mode: Mode) => {
    if (mode === 'verify') {
      const idx = LEGAL_SEQUENCE.indexOf(row.doc)
      const blocking = LEGAL_SEQUENCE.slice(0, idx).find((d) => row.site.legal[d].final !== 'Complete')
      if (blocking) {
        toast(`Follow the legal sequence: ${DOC_LABEL[blocking]} must be complete before ${DOC_LABEL[row.doc]} can be verified`, 'error')
        return
      }
    }
    setAct({ row, mode })
  }

  const cols: Col<Row>[] = [
    { key: 's', header: 'Site ID', render: (r) => <Link to={`/master-data/sites/${r.site.siteId}`} className="font-semibold text-[#0066FF] hover:underline">{r.site.siteId}</Link> },
    { key: 'a', header: 'ATM ID', render: (r) => r.site.atmId },
    { key: 'f', header: 'Franchise', render: (r) => <><div>{frName(r.site.frId)}</div><div className="text-[11px] text-slate-500">{r.site.frId}</div></> },
    { key: 'd', header: 'Document', render: (r) => `${LEGAL_SEQUENCE.indexOf(r.doc) + 1}. ${DOC_LABEL[r.doc]}` },
    { key: 'u', header: 'Upload status', render: (r) => <Badge tone={toneFor(r.t.upload)}>{r.t.upload}</Badge> },
    { key: 'v', header: 'Verification', render: (r) => <Badge tone={r.t.verification === 'Re-upload Required' ? 'red' : toneFor(r.t.verification)}>{r.t.verification}</Badge> },
    { key: 'fi', header: 'Final status', render: (r) => <Badge tone={toneFor(r.t.final)}>{r.t.final}</Badge> },
    {
      key: 'x',
      header: 'Action',
      render: (r) => {
        if (!rights.legal || r.t.final === 'Complete') return '—'
        if (r.t.upload === 'Pending' || r.t.verification === 'Rejected' || r.t.verification === 'Re-upload Required')
          return <Button size="sm" variant="secondary" onClick={() => open(r, 'upload')}>{r.t.upload === 'Pending' ? 'Upload' : 'Upload again'}</Button>
        return (
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" onClick={() => open(r, 'verify')}>Verify</Button>
            <Button size="sm" variant="secondary" onClick={() => open(r, 'reupload')}>Re-upload</Button>
            <Button size="sm" variant="danger" onClick={() => open(r, 'reject')}>Reject</Button>
          </div>
        )
      },
    },
  ]

  const reportItems = [
    { label: 'Total pending documents', value: report.total, tone: 'red' as const },
    { label: 'Pending LOI', value: report.LOI },
    { label: 'Pending Affidavit', value: report.Affidavit },
    { label: 'Pending Agreement', value: report.Agreement },
    { label: 'Pending KYC', value: report.KYC },
    { label: 'Pending Police Verification', value: report.PVC },
    { label: 'Document rejected', value: report.rejected, tone: 'red' as const },
    { label: 'Re-upload required', value: report.reupload, tone: 'amber' as const },
  ]

  return (
    <PageShell
      title="Legal Tracking"
      sub="LOI → Affidavit → Agreement → KYC → PVC for every site (§18). Each stage has its own upload, verification and final status."
      actions={<Button variant="secondary" onClick={() => downloadCsv('department-wise-legal-report', reportItems.map((i) => i.label), [reportItems.map((i) => String(i.value))])}>Download legal report</Button>}
    >
      <div>
        <h2 className="mb-2 text-[13px] font-bold text-slate-900">Department-wise legal report (§18.3)</h2>
        <StatStrip items={reportItems} />
      </div>
      {!rights.legal && <ReadOnlyNote text="Read-only: only the Legal team and Admin can update legal document status." />}
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(r) => r.key}
        noun="documents"
        toolbar={
          <TableBar search={q} onSearch={setQ} placeholder="Site ID, ATM ID, franchise…" onDownload={() => downloadCsv('legal-tracking', ['Site ID', 'ATM ID', 'FR ID', 'Franchise', 'Document', 'Upload status', 'Verification', 'Final status'], rows.map((r) => [r.site.siteId, r.site.atmId, r.site.frId, frName(r.site.frId), DOC_LABEL[r.doc], r.t.upload, r.t.verification, r.t.final]))}>
            <FilterSelect label="Franchise" value={fr} onChange={setFr} options={frOptions} />
            <FilterSelect label="Document" value={doc} onChange={setDoc} options={LEGAL_SEQUENCE.map((d) => ({ value: d, label: DOC_LABEL[d] }))} />
            <FilterSelect label="Upload" value={upload} onChange={setUpload} options={['Uploaded', 'Pending']} />
            <FilterSelect label="Verification" value={ver} onChange={setVer} options={['Pending', 'Verified', 'Rejected', 'Re-upload Required']} />
            <FilterSelect label="Final status" value={fin} onChange={setFin} options={['Complete', 'Pending']} />
          </TableBar>
        }
      />
      {act && <ActionModal key={act.row.key + act.mode} row={act.row} mode={act.mode} onClose={() => setAct(null)} />}
    </PageShell>
  )
}

function ActionModal({ row, mode, onClose }: { row: Row; mode: Mode; onClose: () => void }) {
  const [file, setFile] = useState<FileValue>(null)
  const [remark, setRemark] = useState('')
  const [err, setErr] = useState('')
  const title = { upload: 'Upload document', verify: 'Verify document', reject: 'Reject document', reupload: 'Ask for re-upload' }[mode]

  const save = () => {
    if (mode === 'upload' && !file) return setErr('Attach the document file')
    if ((mode === 'reject' || mode === 'reupload') && !remark.trim()) return setErr('A remark is required')
    const before = `${row.t.upload} / ${row.t.verification} / ${row.t.final}`
    const next: LegalTrack =
      mode === 'upload' ? { upload: 'Uploaded', verification: 'Pending', final: 'Pending' } :
      mode === 'verify' ? { upload: 'Uploaded', verification: 'Verified', final: 'Complete' } :
      mode === 'reject' ? { upload: 'Uploaded', verification: 'Rejected', final: 'Pending' } :
      { upload: 'Uploaded', verification: 'Re-upload Required', final: 'Pending' }
    updateSite(
      row.site.siteId,
      (s) => {
        const legal = { ...s.legal, [row.doc]: next }
        const allDone = LEGAL_SEQUENCE.every((d) => legal[d].final === 'Complete')
        const step = s.steps.legal
        return {
          legal,
          steps: {
            ...s.steps,
            legal: allDone
              ? { ...step, status: 'Completed', assignedTo: actor(), updatedAt: nowIso() }
              : step?.status === 'Not Started' || step?.status === 'Completed'
                ? { ...step, status: 'Pending', updatedAt: nowIso() }
                : step,
          },
        }
      },
      { action: `Legal ${row.doc}: ${title}`, before, after: `${next.upload} / ${next.verification} / ${next.final}${file ? ` (${file.name})` : ''}${remark ? ` — ${remark.trim()}` : ''}` },
    )
    onClose()
    toast(`${DOC_LABEL[row.doc]} for ${row.site.siteId}: ${mode === 'upload' ? 'uploaded, awaiting verification' : mode === 'verify' ? 'verified' : mode === 'reject' ? 'rejected' : 're-upload requested'}`)
  }

  return (
    <Modal
      title={title}
      sub={`${row.site.siteId} · ${DOC_LABEL[row.doc]}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Back</Button>
          <Button variant={mode === 'reject' ? 'danger' : 'primary'} onClick={save}>{mode === 'verify' ? 'Verify' : mode === 'upload' ? 'Upload' : 'Submit'}</Button>
        </>
      }
    >
      <div className="space-y-3">
        {mode === 'upload' && <FileDrop entity="Site" purpose="legal" fileRef={row.site.siteId} value={file} onChange={(v) => { setFile(v); setErr('') }} accept=".pdf,.jpg,.jpeg,.png" />}
        {mode === 'verify' && <p className="text-[12.5px] text-slate-600">You are confirming that the uploaded {DOC_LABEL[row.doc]} has been checked. Its final status becomes Complete.</p>}
        <TextAreaField label="Remark" required={mode === 'reject' || mode === 'reupload'} value={remark} onChange={(e) => { setRemark(e.target.value); setErr('') }} />
        {err && <p className="text-[11.5px] text-brand-red">{err}</p>}
      </div>
    </Modal>
  )
}
