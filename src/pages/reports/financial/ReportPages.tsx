import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarDays, Eye, Plus, X } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { dmy, type Attachment, type Row } from '@/data/reportsFinancial'
import { AttachmentModal } from './Attachments'
import { DEFS, type DefCtx, type ReportDef } from './defs'
import { ReportSheet, type SheetCol } from './ReportSheet'
import { ChipSelect, EditActions, FinancialShell, newId } from './Shell'

const enc = encodeURIComponent

/** v1 — consolidated list: full tab strip, report heading, toolbar, one row per record with an Action → View column. */
export function ReportList({ def }: { def: ReportDef }) {
  const all = def.store.use()
  const navigate = useNavigate()
  const [scope, setScope] = useState(def.scope?.default ?? '')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [viewing, setViewing] = useState<Attachment | null>(null)
  const base = `/reports/financial/${def.slug}`

  const inScope = useMemo(
    () =>
      all.filter((r) => {
        if (def.scope && r[def.scope.key] !== scope) return false
        if (def.rangeKey && ((from && r[def.rangeKey] < from) || (to && r[def.rangeKey] > to))) return false
        return true
      }),
    [all, def, scope, from, to],
  )
  const filterDefs = def.filterDefs?.(all) ?? []
  const rows = inScope.filter((r) =>
    filterDefs.every((f) => {
      const v = filters[f.key]
      if (!v) return true
      return f.key === 'acStatus' ? (r[f.key] ?? '').split('\n').includes(v) : r[f.key] === v
    }),
  )

  const ctx: DefCtx = { mode: 'list', scope, editing: false, sn: '', change: () => {}, view: setViewing }
  const band = def.list(ctx)
  const sn: SheetCol = { key: 'sn', label: 'S.N.', width: 56, editable: false, value: (r) => String(inScope.indexOf(r) + 1) }
  const action: SheetCol = {
    key: '__action',
    label: 'Action',
    virtual: true,
    width: 110,
    render: (r) => (
      <Link to={`${base}/${enc(r.id)}`} className="inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-3 py-1.5 text-[12px] font-semibold text-primary hover:bg-primary hover:text-white">
        <Eye size={14} /> View
      </Link>
    ),
  }
  const period = from || to ? `${from ? dmy(from) : '…'} to ${to ? dmy(to) : '…'}` : ''

  const addRecord = () => {
    const id = newId(def.idPrefix)
    def.store.set((list) => [...list, { ...def.newRow(scope), id } as Row])
    navigate(`${base}/${enc(id)}?edit=1`)
  }

  return (
    <>
      <FinancialShell
        sub={def.sub(scope)}
        tabRight={def.scope && <ChipSelect label={def.scope.label} value={scope} onChange={setScope} options={def.scope.options} />}
        name={def.heading(scope)}
        chip={def.chip}
        meta={def.meta(inScope, def.rangeKey ? period : scope, 'list')}
        metaRight={
          def.rangeKey ? (
            <span className="flex min-h-9 flex-wrap items-center gap-2 rounded-lg border border-line bg-white px-3 py-1 text-[13px] text-ink-2">
              <CalendarDays size={15} className="text-muted" />
              <span className="text-muted">Deposit date:</span>
              <input type="date" aria-label="Deposit date from" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="bg-transparent outline-none" />
              <span className="text-muted">–</span>
              <input type="date" aria-label="Deposit date to" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="bg-transparent outline-none" />
              {(from || to) && (
                <button type="button" onClick={() => { setFrom(''); setTo('') }} aria-label="Clear date range" className="text-muted hover:text-ink">
                  <X size={14} />
                </button>
              )}
            </span>
          ) : (
            def.viewNote
          )
        }
        notes={def.notes(inScope, scope, 'list')}
        footerLeft={def.footerLeft?.(scope, 'list')}
        footerRight={def.footerRight(scope)}
      >
        <ReportSheet
          title={def.toolbarTitle}
          countLabel={`${rows.length} ${rows.length === 1 ? def.noun[0] : def.noun[1]}`}
          rows={rows}
          lead={[sn]}
          bands={[{ ...band, cols: [...band.cols, action] }]}
          editing={false}
          onCellChange={() => {}}
          exportName={`${def.slug}-report`}
          searchPlaceholder={def.searchPlaceholder}
          hideBandHeader={def.hideBandHeader}
          bandRight={(b) => b.note}
          noun={def.noun[1]}
          empty={def.empty}
          filterCount={Object.values(filters).filter(Boolean).length}
          filterPanel={
            filterDefs.length
              ? filterDefs.map((f) => (
                  <select
                    key={f.key}
                    aria-label={f.label}
                    value={filters[f.key] ?? ''}
                    onChange={(e) => setFilters((x) => ({ ...x, [f.key]: e.target.value }))}
                    className="h-9 rounded-lg border border-line bg-white px-2.5 text-[13px] font-medium text-ink outline-none focus:border-primary"
                  >
                    <option value="">All · {f.label}</option>
                    {f.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ))
              : undefined
          }
          toolbarExtra={
            <button type="button" onClick={addRecord} className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-primary hover:bg-primary-soft">
              <Plus size={15} /> Add record
            </button>
          }
        />
      </FinancialShell>
      {viewing && <AttachmentModal file={viewing} onClose={() => setViewing(null)} />}
    </>
  )
}

/** v2 / v3 — one record across all bands; Update → edit cells → Save persists and returns to view mode. */
export function ReportRecord() {
  const { report = '', recordId = '' } = useParams()
  const def = DEFS[report]
  if (!def) return <Navigate to="/reports/financial/bs" replace />
  return <RecordView key={`${report}/${recordId}`} def={def} recordId={recordId} />
}

function RecordView({ def, recordId }: { def: ReportDef; recordId: string }) {
  const all = def.store.use()
  const [params, setParams] = useSearchParams()
  const saved = all.find((r) => r.id === recordId)
  const [draft, setDraft] = useState<Row | null>(() => (params.get('edit') && saved ? { ...saved } : null))
  const [viewing, setViewing] = useState<Attachment | null>(null)
  if (!saved) return <Navigate to={`/reports/financial/${def.slug}`} replace />

  const row = draft ?? saved
  const editing = draft !== null
  const scope = def.scope ? row[def.scope.key] || def.scope.default : ''
  const peers = def.scope ? all.filter((r) => r[def.scope!.key] === saved[def.scope!.key]) : all
  const sn = String(peers.findIndex((r) => r.id === recordId) + 1)
  const leaveEdit = () => {
    setDraft(null)
    if (params.get('edit')) setParams({}, { replace: true })
  }
  const change = (_id: string, key: string, value: string) => setDraft((d) => ({ ...(d ?? saved), [key]: value }))
  const ctx: DefCtx = { mode: 'record', scope, editing, sn, change, view: setViewing }
  const snCol: SheetCol = { key: 'sn', label: 'S.N.', width: 56, editable: false, value: () => sn }

  return (
    <>
      <FinancialShell
        sub={def.sub(scope)}
        only={def.slug}
        tabRight={
          <EditActions
            editing={editing}
            onUpdate={() => setDraft({ ...saved })}
            onCancel={leaveEdit}
            onSave={() => {
              if (draft) def.store.set((list) => list.map((r) => (r.id === recordId ? draft : r)))
              leaveEdit()
              toast(`${def.label} record S.N. ${sn} saved`)
            }}
          />
        }
        name={def.heading(scope)}
        chip={def.chip}
        meta={def.meta([row], def.rangeKey ? dmy(row[def.rangeKey] ?? '') : scope, 'record')}
        metaRight={def.viewNote}
        notes={def.notes([row], scope, 'record')}
        footerLeft={def.footerLeft?.(scope, 'record')}
        footerRight={def.footerRight(scope)}
      >
        <ReportSheet
          title={def.toolbarTitle}
          countLabel={`1 ${def.noun[0]}`}
          rows={[row]}
          lead={[snCol]}
          bands={def.bands(ctx)}
          editing={editing}
          onCellChange={change}
          exportName={`${def.slug}-${recordId}`}
          searchPlaceholder={def.searchPlaceholder}
          repeatLead={def.repeatLead}
          hideBandHeader={def.hideBandHeader}
          bandRight={(b) => b.note}
          noun={def.noun[0]}
        />
      </FinancialShell>
      {viewing && <AttachmentModal file={viewing} onClose={() => setViewing(null)} />}
    </>
  )
}
