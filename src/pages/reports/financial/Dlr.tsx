import { useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge } from '@/components/ui/Badge'
import { DENOS, dlrDetailStores, dlrRowsFor, dlrSummaryStores, saveDlr, withTotals, type DlrKind, type DlrSummaryRow } from '@/data/reportsDlr'
import { SITES, dmy, inr, type Row } from '@/data/reportsFinancial'
import { ReportSheet, type SheetBand, type SheetCol } from './ReportSheet'
import { EditActions, FinancialShell, HeaderSelect, InfoNote, newId, useDraft } from './Shell'

const SUB: Record<DlrKind, string> = {
  dlr2: 'View funds received, ATM cash balances, dispensing and loading details across source dates.',
  dlr3: 'View denomination-wise counter, physical cash and settlement reconciliation details.',
}
const NAME: Record<DlrKind, string> = { dlr2: 'DLR2', dlr3: 'DLR3' }

// ── Summary (default view) ────────────────────────────────────────────────
export function DlrSummary({ kind }: { kind: DlrKind }) {
  const all = dlrSummaryStores[kind].use()
  const [status, setStatus] = useState('')
  const rows = status ? all.filter((r) => r.uploaded === status) : all
  const uploaded = all.filter((r) => r.uploaded === 'Uploaded').length
  const base = `/reports/financial/${kind}`

  const cols: GridColumn<DlrSummaryRow>[] = [
    {
      key: 'atmId',
      header: 'ATM ID',
      width: 150,
      sortable: true,
      render: (r) => (
        <Link to={`${base}/${encodeURIComponent(r.atmId)}`} className="font-semibold text-primary hover:underline">
          {r.atmId}
        </Link>
      ),
    },
    { key: 'franchise', header: 'Franchise Name', width: 240, sortable: true, filterable: true },
    { key: 'cbrDate', header: 'CBR Date', width: 130, sortable: true, render: (r) => dmy(r.cbrDate) },
    { key: 'uploaded', header: 'CBR Uploaded', width: 140, filterable: true, render: (r) => <Badge tone={r.uploaded === 'Uploaded' ? 'green' : 'amber'}>{r.uploaded}</Badge> },
    {
      key: 'open',
      header: '',
      label: 'Sheet',
      width: 130,
      value: () => '',
      render: (r) => (
        <Link to={`${base}/${encodeURIComponent(r.atmId)}`} className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
          Open sheet <ArrowRight size={13} />
        </Link>
      ),
    },
  ]

  return (
    <FinancialShell
      sub={SUB[kind]}
      name={NAME[kind]}
      chip="Summary"
      meta={`${all.length} ATMs · ${uploaded} CBR uploaded · ${all.length - uploaded} pending`}
      metaRight={
        <HeaderSelect
          label="CBR Uploaded"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All' },
            { value: 'Uploaded', label: 'Uploaded' },
            { value: 'Pending', label: 'Pending' },
          ]}
        />
      }
      notes={
        <>
          <InfoNote title="Open an ATM sheet">Select an ATM ID to open its full {NAME[kind]} sheet. Saving a sheet marks its CBR as Uploaded with the latest sheet date.</InfoNote>
          <InfoNote title="Source format corrected">The source summary listed ATM IDs under “Franchise Name”; ATM ID and Franchise Name are separate columns here.</InfoNote>
        </>
      }
    >
      <ExcelGrid
        title={`${NAME[kind]} Summary`}
        countLabel={`${rows.length} ATMs`}
        rows={rows}
        columns={cols}
        rowId={(r) => r.id}
        searchPlaceholder="Search ATM ID"
        noun="ATMs"
        exportName={`${kind}-summary`}
        rowClassName={(r) => (r.uploaded === 'Pending' ? 'bg-amber-50/30' : undefined)}
      />
    </FinancialShell>
  )
}

// ── Column definitions (EN + Hindi, as in the source) ─────────────────────
const DLR2_BANDS: SheetBand[] = [
  {
    title: 'Funds received and ATM cash',
    toolbarTitle: 'DLR2 · Funds received and ATM cash',
    cols: [
      { key: 'totalFund', label: 'Total Fund', hi: 'फ्रैंचाइज़ी धनराशि', kind: 'money', width: 140 },
      { key: 'fundsDate', label: 'Funds received date', hi: 'इंडेंट / WLA खाते में प्राप्त धनराशि दिनांक', kind: 'date', width: 170 },
      { key: 'fundsReceived', label: 'Funds received in Indent / Settlement in WLA Account / SR received', hi: 'इंडेंट / WLA खाते में प्राप्त कुल धनराशि', kind: 'deno', width: 230 },
      { key: 'wlaBalance', label: 'WLA Account Balance', hi: 'WLA खाता में शेष राशि', kind: 'money', width: 160 },
      { key: 'physical2300', label: 'Physical Cash Balance available in ATM (at 23:00 hours)', hi: 'एटीएम कैसेट में शेष प्राप्त कुल धनराशि (रात्रि 11.00 बजे) (नोटों के प्रकार के साथ)', kind: 'deno', width: 230 },
      { key: 'actualDispense', label: 'Actual dispense from ATM (By Customers) / Apna app as per previous Day', hi: 'पिछले दिन के अनुसार एटीएम से ग्राहक द्वारा हुई निकासी कुल धनराशि (अपना ऐप)', kind: 'money', width: 230 },
    ],
  },
  {
    title: 'Dispensing, settlement and loading',
    extra: 'S.N. repeated from A',
    cols: [
      { key: 'counterDispense', label: 'Dispense as per machine counters', hi: 'एटीएम मशीन काउंटर के अनुसार कुल धनराशि', kind: 'money', width: 190 },
      { key: 'rejectPurge', label: 'Actual Amount in Reject Box / Purge Bin at the time every loading', hi: 'रिजेक्ट बॉक्स / बिन में प्राप्त कुल धनराशि (रात्रि 11.00 बजे) (नोटों के प्रकार के साथ)', kind: 'deno', width: 230 },
      { key: 'excessPurge', label: 'Total Excess Amount in Reject Box / Purge Bin', hi: 'रिजेक्ट बॉक्स/पर्ज बिन में कुल अतिरिक्त राशि', kind: 'money', width: 190 },
      { key: 'settlementDiff', label: 'Difference (Excess/ Shortage) received in Settlement', hi: 'सेटलमेंट राशि में अंतर (अधिक या कम) विवरण', kind: 'signed', width: 200 },
      { key: 'loadingDate', label: 'Loading Date', hi: 'लोडिंग तारीख', kind: 'date', width: 140 },
      { key: 'amountLoaded', label: 'Amount Loaded in ATM (With Note Deno)', hi: 'एटीएम में लोड की गयी कुल धनराशि (नोटों के प्रकार के साथ)', kind: 'deno', width: 220 },
      { key: 'remark', label: 'Remark', width: 230 },
    ],
  },
]

const m3 = (key: string, label: string, hi: string, group?: string, width = 170): SheetCol => ({ key, label, hi, group, kind: 'money', width })
const DLR3_BANDS: SheetBand[] = [
  {
    title: 'Counter and Physical',
    extra: 'Counter: D–E · Physical: F–H',
    toolbarTitle: 'DLR3 · Counter and physical cash',
    cols: [
      m3('opening', 'Opening Balance', 'प्रारंभिक शेष', 'Counter', 150),
      m3('dispensed', 'Cash Dispensed', 'नकद वितरण', 'Counter', 150),
      m3('purge', 'Cash in Purge Bin', 'पर्ज बिन में नकद', 'Physical', 150),
      m3('beforeRepl', 'Physical Cash in ATM before Replenishment', 'पुनःपूर्ति से पहले एटीएम में भौतिक नकद', 'Physical'),
      m3('loaded', 'Amount Loaded in ATM / Cash Replenishment', 'एटीएम में लोड की गयी कुल धनराशि / नकद पुनःपूर्ति', 'Physical'),
      m3('overage', 'Overage', 'अतिरिक्त', undefined, 120),
      m3('shortage', 'Shortage', 'कमी', undefined, 120),
    ],
  },
  {
    title: 'Closing balances and settlement',
    extra: 'S.N., Date and Deno repeated from A–C',
    toolbarTitle: 'DLR3 · Settlement and cash balances',
    cols: [
      m3('closing', 'Closing Balance', 'समापन शेष', undefined, 150),
      m3('fundsReceived', 'Funds received in Indent / Settlement in WLA Account / SR received', 'इंडेंट / WLA खाते में प्राप्त कुल धनराशि / HPY Given Fund', undefined, 220),
      m3('bankWithdrawal', 'Bank Withdrawal Amount', 'बैंक से निकाली गई राशि', undefined, 160),
      m3('wlaClosing', 'WLA Account Closing Balance', 'WLA खाते का अंतिम शेष', undefined, 160),
      m3('cashInHand', 'Cash in Hand', 'फ्रैंचाइज़ी के पास नकदी', undefined, 140),
      m3('actualDispense', 'Actual dispense from ATM (By Customers) / Apna app', 'एटीएम से ग्राहक द्वारा हुई निकासी कुल धनराशि', undefined, 210),
      m3('physical2300', 'Physical Cash Balance available in ATM (at 23:00 hours)', 'एटीएम में शेष कुल धनराशि (रात्रि 11.00 बजे)', undefined, 210),
    ],
  },
]

const nextDay = (isoDate: string) => {
  const [y, m, d] = (isoDate || new Date().toISOString().slice(0, 10)).split('-').map(Number)
  const dt = new Date(y, m - 1, d + (isoDate ? 1 : 0))
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// ── Detail sheet (Figma 211:13259 / 211:14730 DLR2, 211:13087 / 211:16754 DLR3) ──
export function DlrDetail({ kind }: { kind: DlrKind }) {
  const { atmId = '' } = useParams()
  return <DlrSheet key={`${kind}-${atmId}`} kind={kind} atmId={atmId} />
}

const Banner = ({ children }: { children: ReactNode }) => (
  <div className="rounded-xl border border-blue-200 bg-primary-soft/60 px-4 py-3 text-[13px] text-primary">{children}</div>
)
const WideLine = ({ left, right }: { left: string; right: string }) => (
  <div className="mb-3 flex flex-wrap justify-between gap-2 text-[12px]">
    <span className="text-muted">{left}</span>
    <span className="font-semibold text-primary">{right}</span>
  </div>
)
const monthOf = (dates: string[]) =>
  dates.length ? new Date(`${dates[dates.length - 1]}T00:00`).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'not supplied'

function DlrSheet({ kind, atmId }: { kind: DlrKind; atmId: string }) {
  const map = dlrDetailStores[kind].use()
  const summary = dlrSummaryStores[kind].use()
  const saved = useMemo(() => map[atmId] ?? dlrRowsFor(kind, atmId), [map, atmId, kind])
  const d = useDraft(saved, (rows) => saveDlr(kind, atmId, rows), `${NAME[kind]} sheet for ${atmId}`)
  const site = SITES.find((s) => s.atmId === atmId)
  const sum = summary.find((s) => s.atmId === atmId)
  if (!site && !sum) return <Navigate to={`/reports/financial/${kind}`} replace />

  const status = sum ? <Badge tone={sum.uploaded === 'Uploaded' ? 'green' : 'amber'}>CBR {sum.uploaded}</Badge> : null
  const who = `ATM ID ${atmId} · ${site?.franchise ?? sum?.franchise ?? ''}`
  const name = (
    <span className="flex flex-wrap items-center gap-2">
      {NAME[kind]} {status}
    </span>
  )

  if (kind === 'dlr2') {
    const funds = d.rows.map((r) => r.fundsDate).filter(Boolean).sort()
    const loads = d.rows.map((r) => r.loadingDate).filter(Boolean).sort()
    const sn: SheetCol = { key: 'sn', label: 'S.N.', hi: 'क्र.स.', width: 60, editable: false, value: (r) => String(d.rows.indexOf(r) + 1) }
    const diffRows = d.rows.filter((r) => Number(r.settlementDiff)).length
    const n = d.rows.length
    const bands = DLR2_BANDS.map((b, i) => ({ ...b, footer: `${n} source rows · Source columns ${i === 0 ? 'A–G' : 'H–N'} · Blank cells preserved` }))
    return (
      <FinancialShell
        sub={SUB.dlr2}
        only="dlr2"
        tabRight={
          <EditActions
            editing={d.editing}
            onUpdate={d.start}
            onCancel={d.cancel}
            onSave={d.save}
            addLabel="Add day"
            onAdd={() =>
              d.setRows((rows) => {
                const last = rows.map((r) => r.fundsDate).filter(Boolean).sort().pop() ?? ''
                const day = nextDay(last)
                return [...rows, { id: newId(`${atmId}-D2`), totalFund: '', fundsDate: day, fundsReceived: '', wlaBalance: '', physical2300: '', actualDispense: '', counterDispense: '', rejectPurge: '', excessPurge: '', settlementDiff: '', loadingDate: day, amountLoaded: '', remark: '' }]
              })
            }
          />
        }
        name={name}
        chip="Source data"
        meta={`14 source columns · ${n} source rows · Funds received: ${monthOf(funds)} · Loading: ${monthOf(loads)} · ${who}`}
        banner={
          <Banner>
            Cash columns “with note deno” take note × count, e.g. 100×12 / 200×5 / 500×20 — the total ({inr(11200)} for that example) is calculated below each entry. Difference (Excess / Shortage) is
            positive for excess and negative for shortage ({diffRows} this period, shown in red). Received dates and loading dates are shown exactly as supplied; blank cells remain blank.
          </Banner>
        }
      >
        <WideLine left="Wide source table shown in two consecutive column bands; S.N. repeats for row alignment." right={`All 14 fields · All ${n} rows`} />
        <ReportSheet
          title="DLR2"
          rows={d.rows}
          lead={[sn]}
          bands={bands}
          editing={d.editing}
          onCellChange={d.change}
          exportName={`dlr2-${atmId}`}
          searchPlaceholder="Search source rows"
          layout="cards"
          toolbar="first"
          noun="source rows"
        />
      </FinancialShell>
    )
  }

  // DLR3: rows per date × denomination, Total= computed
  const display = withTotals(d.rows)
  const groups = [...new Set(d.rows.map((r) => r.group))]
  const lead: SheetCol[] = [
    { key: 'sn', label: 'S.N.', hi: 'क्र.स.', width: 60, editable: false, value: (r) => (r.deno === '100' ? String(groups.indexOf(r.group) + 1) : '') },
    { key: 'date', label: 'Date', hi: 'तारीख', kind: 'date', width: 130, render: (r) => (r.deno === '100' ? dmy(r.date) : '') },
    { key: 'deno', label: 'Deno', hi: 'मूल्यवर्ग / नोटों के प्रकार', width: 130, editable: false, render: (r) => (r.isTotal ? <b>Total=</b> : r.deno) },
  ]
  const change = (id: string, key: string, value: string) => {
    if (key === 'date') {
      const g = d.rows.find((r) => r.id === id)?.group
      return d.setRows((rows) => rows.map((r) => (r.group === g ? { ...r, date: value } : r)))
    }
    d.change(id, key, value)
  }
  const dates = d.rows.map((r) => r.date).filter(Boolean).sort()
  const bands = DLR3_BANDS.map((b, i) => ({
    ...b,
    footer: i === 0 ? `${groups.length} dates · Denominations 100 / 200 / 500 / Total=` : `${groups.length} dates · Source columns K–Q · Total= rows are calculated`,
  }))

  return (
    <FinancialShell
      sub={SUB.dlr3}
      only="dlr3"
      tabRight={
        <EditActions
          editing={d.editing}
          onUpdate={d.start}
          onCancel={d.cancel}
          onSave={d.save}
          addLabel="Add date"
          onAdd={() =>
            d.setRows((rows) => {
              const day = nextDay(rows.map((r) => r.date).filter(Boolean).sort().pop() ?? '')
              const group = newId(`${atmId}-G`)
              return [...rows, ...DENOS.map((deno) => ({ id: `${group}-${deno}`, group, sn: '', date: day, deno }) as Row)]
            })
          }
        />
      }
      name={name}
      chip="Source data"
      meta={`17 source columns · ${groups.length} source entries · Denominations: 100, 200, 500 and Total= · ${dates.length ? `${dmy(dates[0])} to ${dmy(dates[dates.length - 1])}` : 'Date not supplied'} · ${who}`}
      banner={
        <Banner>
          Each date has one row per denomination (100, 200, 500); the Total= row adds the three and is read-only — edit the denomination rows instead. Changing the Date on any denomination row moves the whole
          date group; Add date creates the next day with blank 100 / 200 / 500 rows.
        </Banner>
      }
    >
      <WideLine left="Wide source table shown in two column bands; S.N., Date and Deno repeat for alignment." right={`All 17 fields · ${display.length} rows`} />
      <ReportSheet
        title="DLR3"
        rows={display}
        lead={lead}
        bands={bands}
        editing={d.editing}
        onCellChange={change}
        readOnlyRow={(r) => (r.isTotal ? 'Total= is calculated from the 100 / 200 / 500 rows' : false)}
        rowClassName={(r) => (r.isTotal ? 'bg-surface font-semibold' : undefined)}
        exportName={`dlr3-${atmId}`}
        searchPlaceholder="Search source rows"
        layout="cards"
        toolbar="each"
        noun="source rows"
      />
    </FinancialShell>
  )
}
