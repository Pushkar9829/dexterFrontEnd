import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Download, Filter, RotateCw, Search, Table2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { TextAreaField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'
import { planMappingStore, VERTICALS } from '@/data/payout'
import { decideMapping, fmtDate, mappingApprovalBlock, mappingStatus, type MappingX } from './model'
import { SectionBar, StatusBadge, inputCls, tdCls, theadCls, thCls } from './ui'

const STATUSES = ['Pending Approval', 'Active', 'Rejected', 'Expired']
const SOURCES = ['Individual', 'Bulk', 'Rule-based']

/** Mapping register with maker-checker approve / reject and the plan version each mapping uses. */
export function MappingList() {
  const all = planMappingStore.use() as MappingX[]
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [vertical, setVertical] = useState('')
  const [source, setSource] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [rejecting, setRejecting] = useState<MappingX[] | null>(null)
  const [reason, setReason] = useState('')
  const [reasonErr, setReasonErr] = useState('')
  const [report, setReport] = useState<{ title: string; lines: string[] } | null>(null)

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase()
    return all.filter((m) => (!status || mappingStatus(m) === status) && (!vertical || m.vertical === vertical) && (!source || (m.source ?? 'Individual') === source)
      && (!k || `${m.id} ${m.atmId} ${m.siteId} ${m.planCode} ${m.beneficiaryName} ${m.maker}`.toLowerCase().includes(k)))
  }, [all, q, status, vertical, source])
  const pageRows = rows.slice((page - 1) * size, page * size)
  const pendingRows = rows.filter((m) => m.status === 'Pending Approval')
  const allOn = pendingRows.length > 0 && pendingRows.every((m) => picked.has(m.id))
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => setPicked((s) => { const n = new Set(s); pendingRows.forEach((m) => (allOn ? n.delete(m.id) : n.add(m.id))); return n })
  const selected = all.filter((m) => picked.has(m.id) && m.status === 'Pending Approval')

  const approve = (list: MappingX[]) => {
    const failed: string[] = []
    let ok = 0
    list.forEach((m) => {
      const err = decideMapping(m, true)
      if (err) failed.push(`${m.atmId}: ${err}`)
      else ok++
    })
    setPicked(new Set())
    if (failed.length) setReport({ title: `${ok} approved · ${failed.length} not approved`, lines: failed })
    else toast(`${ok} mapping(s) approved`)
  }
  const confirmReject = () => {
    if (!rejecting) return
    if (reason.trim().length < 5) return setReasonErr('Give a reason (at least 5 characters).')
    const failed: string[] = []
    rejecting.forEach((m) => {
      const err = decideMapping(m, false, reason.trim())
      if (err) failed.push(`${m.atmId}: ${err}`)
    })
    const n = rejecting.length - failed.length
    setRejecting(null)
    setReason('')
    setPicked(new Set())
    if (failed.length) setReport({ title: `${n} rejected · ${failed.length} not rejected`, lines: failed })
    else toast(`${n} mapping(s) rejected`, 'info')
  }
  const exportCsv = () => {
    if (!rows.length) return toast('No mappings to export', 'info')
    downloadCsv(`plan-mappings-${new Date().toISOString().slice(0, 10)}`,
      ['Mapping ID', 'ATM ID', 'Site ID', 'Vertical', 'Site Category', 'Plan Code', 'Plan Version', 'Beneficiary Type', 'Beneficiary', 'Effective From', 'Effective To', 'Source', 'Rule', 'Maker', 'Checker', 'Status', 'Remarks'],
      rows.map((m) => [m.id, m.atmId, m.siteId, m.vertical, m.siteCategory, m.planCode, `v${m.planVersion}`, m.beneficiaryType, m.beneficiaryName, m.effectiveFrom, m.effectiveTo ?? 'Open', m.source ?? 'Individual', m.rule ?? '', m.maker, m.checker ?? '', mappingStatus(m), m.remarks ?? '']))
    toast(`${rows.length} mapping(s) exported`)
  }
  const reset = () => { setQ(''); setStatus(''); setVertical(''); setSource(''); setPage(1) }

  return (
    <section className="space-y-3 rounded-xl border border-line bg-white p-3">
      <SectionBar
        icon={<Table2 size={16} />}
        title="Mapping List"
        sub={`${all.filter((m) => m.status === 'Pending Approval').length} waiting for approval`}
        action={
          <>
            <label className="relative">
              <Search size={14} className="pointer-events-none absolute top-2.5 left-2.5 text-muted" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="ATM / Site / Plan / Beneficiary…" aria-label="Search mappings" className={cn(inputCls, 'h-9 w-[240px] border-line pl-8')} />
            </label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Status" className={cn(inputCls, 'h-9 w-[170px] border-line')}>
              <option value="">All Status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <Button variant="secondary" icon={<Filter size={14} />} onClick={() => setShowFilter((s) => !s)} aria-expanded={showFilter}>Filter</Button>
            <Button variant="secondary" icon={<Download size={14} />} onClick={exportCsv}>Download</Button>
            <button type="button" onClick={reset} className="grid h-9 w-9 place-items-center rounded-md border border-[#0066FF] text-[#0066FF] hover:bg-primary-soft" aria-label="Reset filters" title="Reset filters"><RotateCw size={15} /></button>
          </>
        }
      />
      {showFilter && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <select value={vertical} onChange={(e) => { setVertical(e.target.value); setPage(1) }} aria-label="Vertical" className={cn(inputCls, 'h-9 w-[190px] border-line')}>
            <option value="">All Business Vertical</option>{VERTICALS.map((v) => <option key={v}>{v}</option>)}
          </select>
          <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1) }} aria-label="Source" className={cn(inputCls, 'h-9 w-[170px] border-line')}>
            <option value="">All Sources</option>{SOURCES.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#eaf1ff] px-3 py-2 text-[12px]">
          <b>{selected.length}</b> pending mapping(s) selected
          <span className="flex-1" />
          <Button variant="danger" size="sm" className="w-[130px]" icon={<XCircle size={13} />} onClick={() => setRejecting(selected)}>Reject selected</Button>
          <Button size="sm" className="w-[140px] bg-emerald-600 hover:bg-emerald-700" icon={<CheckCircle2 size={13} />} onClick={() => approve(selected)}>Approve selected</Button>
        </div>
      )}
      <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[1400px] border-collapse">
          <thead>
            <tr className={theadCls}>
              <th className={cn(thCls, 'w-10')}><input type="checkbox" checked={allOn} onChange={toggleAll} disabled={!pendingRows.length} aria-label="Select all pending" /></th>
              {['S.N.', 'ATM ID', 'Site ID', 'Vertical', 'Site Category', 'Plan', 'Version', 'Beneficiary', 'Effective From', 'Effective To', 'Source', 'Maker', 'Checker', 'Status', 'Action'].map((h) => <th key={h} className={thCls}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((m, i) => {
              const pending = m.status === 'Pending Approval'
              const block = pending ? mappingApprovalBlock(m) : null
              return (
                <tr key={m.id} className={cn('border-t border-line-soft', picked.has(m.id) && 'bg-[#f3f7ff]')}>
                  <td className={tdCls}>{pending && <input type="checkbox" checked={picked.has(m.id)} onChange={() => toggle(m.id)} aria-label={`Select ${m.atmId}`} />}</td>
                  <td className={tdCls}>{(page - 1) * size + i + 1}</td>
                  <td className={cn(tdCls, 'font-medium')}>{m.atmId}</td>
                  <td className={tdCls}>{m.siteId}</td>
                  <td className={tdCls}>{m.vertical}</td>
                  <td className={tdCls}>{m.siteCategory}</td>
                  <td className={tdCls}><Link to={`/finance/payouts/plans/${m.planCode}?v=${m.planVersion}`} className="font-semibold text-[#0066FF] hover:underline">{m.planCode}</Link></td>
                  <td className={tdCls}>v{m.planVersion}</td>
                  <td className={cn(tdCls, 'text-left')}><span className="font-semibold">{m.beneficiaryType}</span> · {m.beneficiaryName}</td>
                  <td className={tdCls}>{fmtDate(m.effectiveFrom)}</td>
                  <td className={tdCls}>{m.effectiveTo ? fmtDate(m.effectiveTo) : 'Open'}</td>
                  <td className={tdCls} title={m.rule}>{m.source ?? 'Individual'}</td>
                  <td className={tdCls}>{m.maker}</td>
                  <td className={tdCls} title={m.remarks}>{m.checker ?? '—'}</td>
                  <td className={tdCls}><StatusBadge status={mappingStatus(m)} /></td>
                  <td className={tdCls}>
                    {pending ? (
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" disabled={!!block} title={block ?? 'Approve'} onClick={() => approve([m])} className="text-emerald-600 hover:opacity-75 disabled:cursor-not-allowed disabled:text-muted/50" aria-label={`Approve ${m.atmId}`}><CheckCircle2 size={16} /></button>
                        <button type="button" title="Reject" onClick={() => setRejecting([m])} className="text-brand-red hover:opacity-75" aria-label={`Reject ${m.atmId}`}><XCircle size={16} /></button>
                      </div>
                    ) : <span className="text-[11px] text-muted">—</span>}
                  </td>
                </tr>
              )
            })}
            {!pageRows.length && <tr><td colSpan={16} className="px-3 py-8 text-center text-[12px] text-muted">{all.length ? 'No mappings match the filters.' : 'No site mappings yet — map a site above.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={size} total={rows.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1) }} noun="mappings" />

      {rejecting && (
        <Modal title={`Reject ${rejecting.length} mapping(s)?`} sub={rejecting.slice(0, 6).map((m) => m.atmId).join(', ') + (rejecting.length > 6 ? ' …' : '')} onClose={() => { setRejecting(null); setReason(''); setReasonErr('') }}
          footer={<><Button variant="secondary" onClick={() => { setRejecting(null); setReason(''); setReasonErr('') }}>Cancel</Button><Button variant="danger" icon={<XCircle size={14} />} onClick={confirmReject}>Reject</Button></>}>
          <TextAreaField label="Reason" required name="mapReason" value={reason} maxLength={300} onChange={(e) => { setReason(e.target.value); setReasonErr('') }} error={reasonErr} />
        </Modal>
      )}
      {report && (
        <Modal title={report.title} onClose={() => setReport(null)} width={680} footer={<Button onClick={() => setReport(null)}>OK</Button>}>
          <ul className="list-disc space-y-1 pl-5 text-[12.5px] text-ink-2">{report.lines.map((l) => <li key={l}>{l}</li>)}</ul>
        </Modal>
      )}
    </section>
  )
}
