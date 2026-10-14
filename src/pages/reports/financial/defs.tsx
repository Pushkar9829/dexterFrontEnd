// Definitions of the flat Financial Report sheets (BS, Axis & ICD, CLF, SD, FFM EOD, Overage deposit).
// Each one drives the 3-step Figma flow: consolidated list (v1) → record view with Update (v2) → edit with Save (v3).
import type { ReactNode } from 'react'
import {
  AC_STATUS, CLF_STATUS, DEPOSIT_MODES, FFM_MONTHS, FIN_YEARS, MULTI_SEP, PAYMENT_TYPES, SETTLEMENT_BANKS, SITES, UPLOAD_STATUS,
  axisStore, bsStore, clfStore, ffmStore, fyMonths, inr, monthEnds, monthLabel, overageStore, parseAttachment, sdReportStore,
  type Attachment, type Row,
} from '@/data/reportsFinancial'
import { AttachCell } from './Attachments'
import type { SheetBand, SheetCol } from './ReportSheet'
import { InfoNote, SourceEntries } from './Shell'

export type Mode = 'list' | 'record'
export type FilterDef = { key: string; label: string; options: string[] }
export type DefCtx = {
  mode: Mode
  scope: string
  editing: boolean
  /** S.N. of the record shown on the record page */
  sn: string
  change: (id: string, key: string, value: string) => void
  view: (a: Attachment) => void
}
type Store = { use: () => Row[]; get: () => Row[]; set: (rows: Row[] | ((prev: Row[]) => Row[])) => void }

export type ReportDef = {
  slug: string
  label: string
  sub: (scope: string) => string
  store: Store
  idPrefix: string
  /** [singular, plural] used in counts */
  noun: [string, string]
  /** list scope selector shown as a chip at the right of the tab strip (F.Y. / month) */
  scope?: { key: string; label: string; default: string; options: { value: string; label: string }[] }
  /** deposit-date range filter (Overage deposit) */
  rangeKey?: string
  heading: (scope: string) => string
  chip?: string
  meta: (rows: Row[], scope: string, mode: Mode) => string
  viewNote?: string
  bands: (ctx: DefCtx) => SheetBand[]
  /** list page: band header + the source columns shown before the Action column */
  list: (ctx: DefCtx) => SheetBand
  repeatLead?: boolean
  hideBandHeader?: boolean
  toolbarTitle: string
  searchPlaceholder?: string
  filterDefs?: (rows: Row[]) => FilterDef[]
  newRow: (scope: string) => Omit<Row, 'id'>
  notes: (rows: Row[], scope: string, mode: Mode) => ReactNode
  footerLeft?: (scope: string, mode: Mode) => string | undefined
  footerRight: (scope: string) => string
  empty?: { title: string; text: string }
}

const sum = (rows: Row[], key: string) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)
const uniq = (rows: Row[], key: string) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort()
const plural = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`
const sameRow = (ctx: DefCtx, list: string, record: string) => (ctx.mode === 'list' ? list : `${record} · S.N. ${ctx.sn}`)

// ── BS ────────────────────────────────────────────────────────────────────
const bsFranchise = (months: string[]): SheetCol[] => [
  { key: 'month', label: 'Month', kind: 'enum', options: months, width: 110 },
  { key: 'hitachi', label: 'Hitachi Code', width: 130 },
  { key: 'atmId', label: 'ATM ID', width: 130 },
  { key: 'location', label: 'Location Name', width: 180 },
  { key: 'franchise', label: 'Franchise Name', width: 210 },
  { key: 'contact', label: 'Contact No.', kind: 'phone', width: 130 },
  { key: 'state', label: 'State', width: 130 },
  { key: 'state2', label: 'State', width: 130 },
  { key: 'clDate', label: 'CL Date', kind: 'date', width: 120 },
]

const BS: ReportDef = {
  slug: 'bs',
  label: 'BS',
  sub: () => 'View the supplied franchise account statement and Apna App upload fields.',
  store: bsStore,
  idPrefix: 'BS',
  noun: ['supplied record', 'supplied records'],
  scope: { key: 'fy', label: 'Financial year', default: '26-27', options: FIN_YEARS.map((y) => ({ value: y, label: `F.Y. Year ${y}` })) },
  heading: (fy) => `Franchise Account Statement in Apna App Upload Status - F.Y. Year ${fy}`,
  meta: (rows, _fy, mode) => {
    const entries = mode === 'record' ? (rows[0]?.acStatus ?? '').split(MULTI_SEP).filter(Boolean).length : AC_STATUS.length
    return `${plural(rows.length, BS.noun)} · 14 source columns · ${entries} A/C Status ${entries === 1 ? 'entry' : 'entries'}`
  },
  viewNote: 'Wrapped column view · All fields visible in two bands',
  bands: (ctx) => [
    { title: 'Franchise details', note: sameRow(ctx, 'One row per record', 'Same record'), cols: bsFranchise(fyMonths(ctx.scope)) },
    {
      title: 'Account & upload details',
      extra: 'S.N. repeated for reference',
      note: sameRow(ctx, 'One row per record', 'Same record'),
      cols: [
        { key: 'acStatus', label: 'A/C Status', kind: 'multi', options: AC_STATUS, width: 220 },
        { key: 'upload', label: 'Upload Status', kind: 'enum', options: UPLOAD_STATUS, badge: true, width: 200 },
        { key: 'action', label: 'Action to be taken', width: 260 },
        { key: 'remark', label: 'Remark', width: 240 },
      ],
    },
  ],
  list: (ctx) => ({ title: 'Franchise details', note: 'One row per record', cols: bsFranchise(fyMonths(ctx.scope)).filter((c) => c.key !== 'clDate') }),
  repeatLead: true,
  toolbarTitle: 'BS report',
  filterDefs: () => [
    { key: 'acStatus', label: 'A/C Status', options: AC_STATUS },
    { key: 'upload', label: 'Upload Status', options: UPLOAD_STATUS },
  ],
  newRow: (fy) => ({ fy, month: fyMonths(fy)[0], hitachi: '', atmId: '', location: '', franchise: '', contact: '', state: '', state2: '', clDate: '', acStatus: '', upload: 'Pending', action: '', remark: '' }),
  notes: () => (
    <InfoNote title="Source grouping preserved">
      Current Account, Axis Indent and ICICI SR are continuation entries of A/C Status within a record, not separate franchise records. Blank cells remain unspecified; both State columns are retained as supplied.
    </InfoNote>
  ),
  footerRight: (fy) => `Financial year preserved as supplied · ${fy}`,
}

// ── Axis & ICD ────────────────────────────────────────────────────────────
const AXIS_COLS: SheetCol[] = [
  { key: 'mf', label: 'MF Name', width: 200 },
  { key: 'atmId', label: 'ATM ID', width: 130 },
  { key: 'franchise', label: 'Franchise Name', width: 210 },
  { key: 'mobile', label: 'Mobile Number', kind: 'phone', width: 140 },
  { key: 'email', label: 'Franchise Email ID', kind: 'email', width: 230 },
  { key: 'altEmail', label: 'Franchise Another Email ID', kind: 'email', width: 240 },
]
const AXIS: ReportDef = {
  slug: 'axis-icd',
  label: 'Axis & ICD',
  sub: () => 'View the supplied Axis & ICD franchise report fields.',
  store: axisStore,
  idPrefix: 'AX',
  noun: ['supplied record', 'supplied records'],
  heading: () => 'Axis & ICD',
  meta: (rows) => `${plural(rows.length, AXIS.noun)} · 7 source columns`,
  viewNote: 'All source fields visible',
  bands: () => [{ title: 'Axis & ICD', cols: AXIS_COLS }],
  list: () => ({ title: 'Axis & ICD', cols: AXIS_COLS }),
  hideBandHeader: true,
  toolbarTitle: 'Axis & ICD report',
  filterDefs: (rows) => [{ key: 'mf', label: 'MF Name', options: uniq(rows, 'mf') }],
  newRow: () => ({ mf: '', atmId: '', franchise: '', mobile: '', email: '', altEmail: '' }),
  notes: () => (
    <InfoNote title="Source format preserved">
      All seven column headers are retained in the supplied order. Mobile numbers must be 10 digits and both email fields are validated when a record is updated.
    </InfoNote>
  ),
  footerRight: () => 'Axis & ICD source format',
  empty: { title: 'No Axis & ICD records supplied', text: 'The supplied format contains column headers only. Blank source fields are retained; there are no records to display.' },
}

// ── CLF ───────────────────────────────────────────────────────────────────
const CLF_IDENTITY: SheetCol[] = [
  { key: 'siteId', label: 'Site ID', width: 160 },
  { key: 'atmId', label: 'ATM ID', width: 130 },
  { key: 'franchiseeName', label: 'FRANCHISEE NAME', width: 220 },
  { key: 'franchiseeNo', label: 'FRANCHISEE NO.', kind: 'phone', width: 140 },
  { key: 'cashLiveDate', label: 'Cash Live Date', kind: 'date', width: 130 },
  { key: 'clfStatus', label: 'CLF Status', kind: 'enum', options: CLF_STATUS, width: 120 },
  { key: 'hpyAccount', label: 'HPY Account Number', width: 170 },
]
const CLF: ReportDef = {
  slug: 'clf',
  label: 'CLF',
  sub: () => 'View the supplied CLF payment fields and FR / Sender Details.',
  store: clfStore,
  idPrefix: 'CLF',
  noun: ['supplied source row', 'supplied source rows'],
  heading: () => 'CLF',
  meta: (rows, _s, mode) =>
    `${plural(rows.length, CLF.noun)} · 15 source columns · ${mode === 'record' ? `CLF Amount ${inr(rows[0]?.clfAmount ?? '') || 'unspecified'}` : `CLF total ${inr(sum(rows, 'clfAmount')) || '₹ 0'}`}`,
  viewNote: 'Wrapped column view · All fields visible in two bands',
  bands: (ctx) => [
    { title: 'Identity & CLF fields', note: sameRow(ctx, 'One row per source row', 'Same source row'), cols: CLF_IDENTITY },
    {
      title: 'Payment & sender fields',
      extra: 'Continued',
      note: sameRow(ctx, 'One row per source row', 'Same source row'),
      groupRow: true,
      cols: [
        { key: 'clfAmount', label: 'CLF Amount', kind: 'money', group: 'Payment fields', width: 140 },
        { key: 'paymentDate', label: 'Payment Date', kind: 'date', group: 'Payment fields', width: 130 },
        { key: 'transferTime', label: 'Payment Transfer Time', kind: 'time', group: 'Payment fields', width: 160 },
        { key: 'frBank', label: 'FR Bank Name', group: 'FR / Sender Details', width: 170 },
        { key: 'holder', label: 'Account Holder Name', group: 'FR / Sender Details', width: 190 },
        { key: 'utr', label: 'NEFT-UTR-IMPS Number', group: 'FR / Sender Details', width: 210 },
        { key: 'settlementBank', label: 'Settlement Bank Name', kind: 'enum', options: SETTLEMENT_BANKS, group: 'FR / Sender Details', width: 170 },
      ],
    },
  ],
  list: () => ({ title: 'Identity & CLF fields', note: 'One row per source row', cols: CLF_IDENTITY }),
  repeatLead: false,
  toolbarTitle: 'CLF report',
  filterDefs: () => [
    { key: 'clfStatus', label: 'CLF Status', options: CLF_STATUS },
    { key: 'settlementBank', label: 'Settlement Bank Name', options: SETTLEMENT_BANKS },
  ],
  newRow: () => ({ siteId: '', atmId: '', franchiseeName: '', franchiseeNo: '', cashLiveDate: '', clfStatus: '1st', hpyAccount: '', clfAmount: '', paymentDate: '', transferTime: '', frBank: '', holder: '', utr: '', settlementBank: '' }),
  notes: (_rows, _s, mode) => (
    <>
      {mode === 'record' && (
        <SourceEntries
          sub="Choices / continuations only · Not additional payment transactions"
          groups={[
            { label: 'CLF Status', values: CLF_STATUS },
            { label: 'Settlement Bank Name', values: SETTLEMENT_BANKS },
          ]}
          foot="These lists are the allowed values for CLF Status and Settlement Bank Name when the record is updated."
        />
      )}
      <InfoNote title="Source grouping preserved">
        Both bands show the same source row. Payment Transfer Time is stored as 24-hour time (the source “16:29 PM” mixes 24-hour and AM/PM). Blank cells remain unspecified; no franchise identity, amount, date or transfer reference has been inferred.
      </InfoNote>
    </>
  ),
  footerRight: () => 'CLF source format',
}

// ── SD ────────────────────────────────────────────────────────────────────
const SD_IDENTITY: SheetCol[] = [
  { key: 'siteId', label: 'Site ID', width: 160 },
  { key: 'atmId', label: 'ATM ID', width: 130 },
  { key: 'franchiseeName', label: 'FRANCHISEE NAME', width: 220 },
  { key: 'franchiseeNo', label: 'FRANCHISEE NO.', kind: 'phone', width: 140 },
  { key: 'cashLiveDate', label: 'Cash Live Date', kind: 'date', width: 130 },
  { key: 'hpyAccount', label: 'HPY Account Number', width: 170 },
  { key: 'paymentType', label: 'Payment Type', kind: 'enum', options: PAYMENT_TYPES, width: 120 },
]
const SD: ReportDef = {
  slug: 'sd',
  label: 'SD',
  sub: () => 'View the supplied SD payment fields and franchise bank details.',
  store: sdReportStore,
  idPrefix: 'SD',
  noun: ['supplied source row', 'supplied source rows'],
  heading: () => 'SD',
  meta: (rows, _s, mode) =>
    `${plural(rows.length, SD.noun)} · 16 source columns · ${mode === 'record' ? rows[0]?.franchiseeName || 'Identity unspecified' : `${new Set(rows.map((r) => r.franchiseeName)).size} franchises`}`,
  viewNote: 'Wrapped column view · All fields visible in two bands',
  bands: (ctx) => [
    { title: 'Identity & payment type fields', note: sameRow(ctx, 'One row per source row', 'Same source row'), cols: SD_IDENTITY },
    {
      title: 'Payment & franchise bank fields',
      extra: 'Continued',
      note: sameRow(ctx, 'One row per source row', 'Same source row'),
      cols: [
        { key: 'paymentDate', label: 'Payment Date', kind: 'date', width: 130 },
        { key: 'transferTime', label: 'Payment Transfer Time', kind: 'time', width: 150 },
        { key: 'txnNumber', label: 'TXN Number', width: 200 },
        { key: 'amount', label: 'Amount', kind: 'money', width: 130, render: (r) => (r.amount ? <span className="font-medium">{Number(r.amount).toLocaleString('en-IN')}/-</span> : <span className="text-muted">—</span>) },
        { key: 'frBank', label: 'FR Bank Name', width: 170 },
        { key: 'holder', label: 'Account Holder Name', width: 190 },
        { key: 'frAccount', label: 'FR Account', width: 160, render: (r) => (!r.frAccount ? <span className="text-muted">—</span> : `••••${r.frAccount.slice(-4)}`) },
        { key: 'frIfsc', label: 'FR IFSC', kind: 'ifsc', width: 130 },
      ],
    },
  ],
  list: () => ({ title: 'Identity & payment type fields', note: 'One row per source row', cols: SD_IDENTITY }),
  repeatLead: false,
  toolbarTitle: 'SD report',
  filterDefs: () => [
    { key: 'paymentType', label: 'Payment Type', options: PAYMENT_TYPES },
    { key: 'franchiseeName', label: 'Franchisee', options: [...new Set(SITES.map((s) => s.franchise))].sort() },
  ],
  newRow: () => ({ siteId: '', atmId: '', franchiseeName: '', franchiseeNo: '', cashLiveDate: '', hpyAccount: '', paymentType: 'NEFT', paymentDate: '', transferTime: '', txnNumber: '', amount: '', frBank: '', holder: '', frAccount: '', frIfsc: '' }),
  notes: (rows, _s, mode) => (
    <>
      {mode === 'record' && (
        <SourceEntries
          sub="Source continuations only · Not additional payment transactions"
          groups={[{ label: 'Payment Type', values: PAYMENT_TYPES }]}
          foot="The source places NEFT, RTGS and IMPS under Payment Date; they are the allowed values of Payment Type, and Payment Date holds the calendar date."
        />
      )}
      <InfoNote title="Source format preserved">
        All 16 headers are retained in source order{mode === 'list' ? `; total security deposit ${inr(sum(rows, 'amount')) || '₹ 0'}` : ''}. Both bands show the same source row. FR Account is masked in view mode and shown in full while updating; IFSC is validated (e.g. HDFC0001234).
      </InfoNote>
    </>
  ),
  footerRight: () => 'SD source format',
}

// ── FFM EOD ───────────────────────────────────────────────────────────────
function withVariance(key: string, dmsKey: string) {
  return (r: Row) => {
    const v = r[key]
    if (!v) return <span className="text-muted">—</span>
    const diff = Number(v) - Number(r[dmsKey])
    return (
      <span className="inline-flex items-center justify-end gap-2">
        {r[dmsKey] !== '' && r[dmsKey] != null && diff !== 0 && (
          <span title="Physical balance differs from DMS balance" className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
            Variance {diff > 0 ? '+' : '−'}
            {inr(Math.abs(diff))}
          </span>
        )}
        <span className="font-medium">{inr(v)}</span>
      </span>
    )
  }
}
const money = (key: string, label: string, extra?: Partial<SheetCol>): SheetCol => ({ key, label, kind: 'money', width: 200, ...extra })
const ffmOpening = (o: string): SheetCol[] => [
  { key: 'atmId', label: 'ATM ID', width: 140 },
  { key: 'frName', label: 'FR Name', width: 220 },
  money('openDms', `Machine Balance as per DMS @11:00 PM (${o})`),
  money('openPhys', `Physical Balance as per FR @11:00 PM (${o})`, { width: 230, render: withVariance('openPhys', 'openDms') }),
  money('openOverage', `Actual Overage as on ${o}`, { width: 180 }),
]
const FFM: ReportDef = {
  slug: 'ffm-eod',
  label: 'FFM EOD',
  sub: (m) => `View opening balances, ${monthLabel(m).split(' ')[0]} funding and month-end positions for full funding sites.`,
  store: ffmStore,
  idPrefix: 'FFM',
  noun: ['record', 'records'],
  scope: { key: 'month', label: 'Month', default: '2026-08', options: FFM_MONTHS.map((m) => ({ value: m, label: monthLabel(m) })) },
  heading: (m) => `Full Funding Sites - ${monthLabel(m)} - EOD Report ${monthEnds(m).closing}`,
  chip: 'Source template',
  meta: (rows, _m, mode) => {
    const variance = rows.filter((r) => (r.openPhys && r.openDms && r.openPhys !== r.openDms) || (r.closePhys && r.closeDms && r.closePhys !== r.closeDms)).length
    return mode === 'record'
      ? `13 source columns · 1 record · ATM ID ${rows[0]?.atmId || 'unspecified'}${variance ? ' · DMS / physical variance' : ''}`
      : `13 source columns · ${plural(rows.length, FFM.noun)} · HPY given ${inr(sum(rows, 'hpyFund')) || '₹ 0'} · ${variance} with DMS / physical variance`
  },
  viewNote: 'Wrapped column view · All fields visible in three bands',
  bands: (ctx) => {
    const { opening: o, closing: c } = monthEnds(ctx.scope)
    const ml = monthLabel(ctx.scope)
    const note = sameRow(ctx, 'Same template across bands', 'Same record')
    return [
      { title: 'Identity & opening position', pre: o, note, cols: ffmOpening(o) },
      { title: 'Monthly funding', pre: ml, note, cols: [money('hpyFund', `HPY Given Fund ${ml}`, { width: 240 }), money('frLoading', `FR Loading Fund ${ml}`, { width: 240 }), money('apnaDispense', `Apna App Dispence Fund ${ml}`, { width: 260 })] },
      {
        title: 'Closing position',
        pre: c,
        note,
        cols: [
          money('actualMachine', `Actual Machine Balance ${c}`),
          money('closeDms', `Machine Balance as per DMS @11:00 PM (${c})`),
          money('closePhys', `Physical Balance as per FR @11:00 PM (${c})`, { width: 230, render: withVariance('closePhys', 'closeDms') }),
          money('closeOverage', `Actual Overage as on ${c}`, { width: 180 }),
        ],
      },
    ]
  },
  list: (ctx) => ({ title: 'Identity & opening position', pre: monthEnds(ctx.scope).opening, note: 'Same template across bands', cols: ffmOpening(monthEnds(ctx.scope).opening) }),
  repeatLead: false,
  toolbarTitle: 'FFM EOD report',
  filterDefs: (rows) => [{ key: 'frName', label: 'FR Name', options: uniq(rows, 'frName') }],
  newRow: (month) => ({ month, atmId: '', frName: '', openDms: '', openPhys: '', openOverage: '', hpyFund: '', frLoading: '', apnaDispense: '', actualMachine: '', closeDms: '', closePhys: '', closeOverage: '' }),
  notes: () => (
    <InfoNote title="Source note: fetched with loading database">
      Retained as guidance from the attachment, not a live database connection or sync status. All 13 labels, including “Dispence”, and the 11:00 PM date qualifiers are preserved. A “Variance” chip marks a physical balance that differs from the DMS machine balance.
    </InfoNote>
  ),
  footerLeft: (m, mode) => (mode === 'record' ? `${monthEnds(m).opening} opening position and ${monthEnds(m).closing} closing position are shown separately.` : undefined),
  footerRight: () => 'FFM EOD source format',
}

// ── Overage deposit ───────────────────────────────────────────────────────
const overageCols = (ctx: DefCtx): SheetCol[] => [
  { key: 'depositDate', label: 'Deposit Date', kind: 'date', width: 130 },
  { key: 'atmId', label: 'ATM ID', width: 130 },
  { key: 'frName', label: 'FR Name', width: 220 },
  { key: 'amount', label: 'Overage Amount', kind: 'money', width: 150 },
  { key: 'mode', label: 'Mode', kind: 'enum', options: DEPOSIT_MODES, width: 130 },
  { key: 'utr', label: 'UTR / TXN', width: 200 },
  {
    key: 'attached',
    label: 'Attached',
    editable: false,
    width: 210,
    value: (r) => parseAttachment(r.attached)?.name ?? '',
    render: (r) => <AttachCell row={r} editing={ctx.editing} onChange={(v) => ctx.change(r.id, 'attached', v)} onView={ctx.view} />,
  },
  { key: 'email', label: 'Email', kind: 'email', width: 230 },
]
const OVERAGE: ReportDef = {
  slug: 'overage-deposit',
  label: 'Overage deposit',
  sub: () => 'View overage deposits, payment references and supporting details across franchise sites.',
  store: overageStore,
  idPrefix: 'OD',
  noun: ['deposit record', 'deposit records'],
  rangeKey: 'depositDate',
  heading: () => 'Overage deposit',
  chip: 'Source template',
  meta: (rows, period) => `9 source columns · ${plural(rows.length, OVERAGE.noun)} · ${period || 'No reporting period specified'} · total overage ${inr(sum(rows, 'amount')) || '₹ 0'}`,
  bands: (ctx) => [{ title: 'Deposit details', note: ctx.editing ? 'Use Upload for the Attached file' : 'All 9 fields visible', cols: overageCols(ctx) }],
  list: (ctx) => ({ title: 'Deposit details', note: 'All 9 fields visible', cols: overageCols(ctx) }),
  toolbarTitle: 'Overage deposit report',
  searchPlaceholder: 'Search deposit records',
  filterDefs: () => [{ key: 'mode', label: 'Mode', options: DEPOSIT_MODES }],
  newRow: () => ({ depositDate: new Date().toISOString().slice(0, 10), atmId: '', frName: '', amount: '', mode: 'Cash deposit', utr: '', attached: '', email: '' }),
  notes: (rows, _s, mode) => (
    <InfoNote title={mode === 'list' ? `Source format preserved · ${rows.filter((r) => !r.attached).length} deposits without proof` : 'Source format preserved'}>
      All nine source fields are preserved in order. Attached remains a separate field — the deposit slip or payment screenshot (PDF, JPG or PNG up to 5 MB), uploaded or replaced while updating the record. UTR / TXN is the bank UTR for NEFT / IMPS, the UPI reference for UPI and the machine slip number for cash deposits.
    </InfoNote>
  ),
  footerLeft: (_s, mode) => (mode === 'record' ? 'Source format preserved · No balances or totals inferred' : undefined),
  footerRight: () => 'Overage deposit source format',
}

export const DEFS: Record<string, ReportDef> = { bs: BS, 'axis-icd': AXIS, clf: CLF, sd: SD, 'ffm-eod': FFM, 'overage-deposit': OVERAGE }
