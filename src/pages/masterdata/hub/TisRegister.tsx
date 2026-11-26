import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextAreaField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { nowIso, useCategories, useSites, updateSite, type Site } from '@/data/network'
import { useFrMap, useHubRights } from './hooks'
import { actor, fmtDate } from './hubStore'
import { DataTable, FilterSelect, PageShell, ReadOnlyNote, StatStrip, TableBar, type Col } from './ui'

const statusOf = (s: Site) => s.tis?.verification ?? 'Not created'

export default function TisRegister() {
  const { sites } = useSites()
  const cats = useCategories()
  const frMap = useFrMap()
  const rights = useHubRights()
  const frName = useCallback((id: string) => frMap.get(id)?.name ?? id, [frMap])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [by, setBy] = useState('all')
  const [state, setState] = useState('all')
  const [act, setAct] = useState<{ site: Site; mode: 'verify' | 'reject' } | null>(null)

  const states = useMemo(() => [...new Set(sites.map((s) => s.state))].sort(), [sites])
  const counts = useMemo(() => ({ pending: sites.filter((s) => s.tis?.verification === 'Pending').length, verified: sites.filter((s) => s.tis?.verification === 'Verified').length, rejected: sites.filter((s) => s.tis?.verification === 'Rejected').length, none: sites.filter((s) => !s.tis).length }), [sites])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return sites.filter((x) => (status === 'all' || statusOf(x) === status) && (by === 'all' || x.tis?.createdBy === by) && (state === 'all' || x.state === state) && (!s || `${x.siteId} ${x.atmId} ${frName(x.frId)} ${x.tis?.responsible ?? ''} ${x.tis?.otherName ?? ''}`.toLowerCase().includes(s)))
  }, [sites, q, status, by, state, frName])

  const cols: Col<Site>[] = [
    { key: 's', header: 'Site ID', render: (x) => <Link to={`/master-data/sites/${x.siteId}`} className="font-semibold text-[#0066FF] hover:underline">{x.siteId}</Link> },
    { key: 'a', header: 'ATM ID', render: (x) => x.atmId },
    { key: 'c', header: 'TIS created by', render: (x) => (x.tis ? <>{x.tis.createdBy}{x.tis.otherName && <div className="text-[11px] text-slate-500">{x.tis.otherName}</div>}</> : '—') },
    { key: 'r', header: 'Responsible person / entity', render: (x) => x.tis?.responsible ?? '—' },
    { key: 'd', header: 'Creation date', render: (x) => fmtDate(x.tis?.createdOn) },
    { key: 'p', header: 'Photos', render: (x) => (x.tis ? `${x.tis.photos} photo(s)` : '—') },
    { key: 'v', header: 'Verification', render: (x) => <Badge tone={x.tis ? toneFor(x.tis.verification) : 'gray'}>{statusOf(x)}</Badge> },
    { key: 'vb', header: 'Verified by', render: (x) => x.tis?.verifiedBy ?? '—' },
    { key: 'rm', header: 'Remarks', render: (x) => x.tis?.remarks ?? '—' },
    {
      key: 'x',
      header: 'Action',
      render: (x) =>
        rights.project && x.tis && x.tis.verification !== 'Verified' ? (
          <div className="flex gap-1.5">
            <Button size="sm" onClick={() => setAct({ site: x, mode: 'verify' })}>Verify</Button>
            {x.tis.verification === 'Pending' && <Button size="sm" variant="danger" onClick={() => setAct({ site: x, mode: 'reject' })}>Reject</Button>}
          </div>
        ) : (
          '—'
        ),
    },
  ]

  return (
    <PageShell title="TIS Register" sub="TIS creation record for every site (§16): who created it, responsible person, photos, verification and remarks.">
      <StatStrip
        items={[
          { label: 'Verification pending', value: counts.pending, tone: 'amber' },
          { label: 'Verified', value: counts.verified, tone: 'green' },
          { label: 'Rejected', value: counts.rejected, tone: 'red' },
          { label: 'TIS not created', value: counts.none },
        ]}
      />
      {!rights.project && <ReadOnlyNote text="Read-only: only Project users can verify or reject a TIS." />}
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(x) => x.siteId}
        noun="sites"
        toolbar={
          <TableBar search={q} onSearch={setQ} placeholder="Site, ATM, franchise, responsible…" onDownload={() => downloadCsv('tis-register', ['Site ID', 'ATM ID', 'Franchise', 'TIS created by', 'Other name', 'Responsible', 'Creation date', 'Photos', 'Verification', 'Verified by', 'Remarks'], rows.map((x) => [x.siteId, x.atmId, frName(x.frId), x.tis?.createdBy ?? '', x.tis?.otherName ?? '', x.tis?.responsible ?? '', x.tis?.createdOn ?? '', String(x.tis?.photos ?? ''), statusOf(x), x.tis?.verifiedBy ?? '', x.tis?.remarks ?? '']))}>
            <FilterSelect label="Verification" value={status} onChange={setStatus} options={['Pending', 'Verified', 'Rejected', 'Not created']} />
            <FilterSelect label="Created by" value={by} onChange={setBy} options={cats.tisCreatedBy.map((c) => c.name)} />
            <FilterSelect label="State" value={state} onChange={setState} options={states} />
          </TableBar>
        }
      />
      {act && <DecideModal key={act.site.siteId + act.mode} site={act.site} mode={act.mode} onClose={() => setAct(null)} />}
    </PageShell>
  )
}

function DecideModal({ site, mode, onClose }: { site: Site; mode: 'verify' | 'reject'; onClose: () => void }) {
  const [remark, setRemark] = useState('')
  const [err, setErr] = useState('')
  const save = () => {
    if (mode === 'reject' && !remark.trim()) {
      setErr('Give the reason for rejection')
      return
    }
    const before = site.tis?.verification ?? '—'
    updateSite(
      site.siteId,
      (s) => ({
        tis: s.tis ? { ...s.tis, verification: mode === 'verify' ? 'Verified' : 'Rejected', verifiedBy: actor(), remarks: remark.trim() || s.tis.remarks } : s.tis,
        steps: { ...s.steps, tis: { ...s.steps.tis, status: mode === 'verify' ? 'Completed' : 'Pending', remark: remark.trim() || s.steps.tis?.remark, updatedAt: nowIso() } },
      }),
      { action: mode === 'verify' ? 'TIS verified' : 'TIS rejected', before, after: `${mode === 'verify' ? 'Verified' : 'Rejected'}${remark.trim() ? ` — ${remark.trim()}` : ''}` },
    )
    onClose()
    toast(mode === 'verify' ? `TIS for ${site.siteId} verified` : `TIS for ${site.siteId} rejected`)
  }
  return (
    <Modal
      title={mode === 'verify' ? 'Verify TIS' : 'Reject TIS'}
      sub={`${site.siteId} · created by ${site.tis?.createdBy ?? '—'} · ${site.tis?.photos ?? 0} photo(s)`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Back</Button>
          <Button variant={mode === 'verify' ? 'primary' : 'danger'} onClick={save}>{mode === 'verify' ? 'Verify' : 'Reject'}</Button>
        </>
      }
    >
      <TextAreaField label="Remarks" required={mode === 'reject'} value={remark} onChange={(e) => { setRemark(e.target.value); setErr('') }} error={err} />
    </Modal>
  )
}
