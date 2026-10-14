import { useState } from 'react'
import { SheetNote } from '@/components/grid/BandedSheet'
import {
  AC_STATUS, CLF_STATUS, FIN_YEARS, PAYMENT_TYPES, SETTLEMENT_BANKS, SITES, UPLOAD_STATUS,
  axisStore, bsStore, clfStore, fyMonths, inr, sdReportStore, type Row,
} from '@/data/reportsFinancial'
import type { SheetBand } from './ReportSheet'
import { HeaderSelect } from './Shell'
import { SheetReport } from './SheetReport'

const sum = (rows: Row[], key: string) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)
const uniq = (rows: Row[], key: string) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort()

// ── BS ────────────────────────────────────────────────────────────────────
export function BsReport() {
  const [fy, setFy] = useState('26-27')
  const months = fyMonths(fy)
  const bands: SheetBand[] = [
    {
      title: 'Franchise details',
      cols: [
        { key: 'month', label: 'Month', kind: 'enum', options: months, width: 110 },
        { key: 'hitachi', label: 'Hitachi Code', width: 130 },
        { key: 'atmId', label: 'ATM ID', width: 130 },
        { key: 'location', label: 'Location Name', width: 190 },
        { key: 'franchise', label: 'Franchise Name', width: 210 },
        { key: 'contact', label: 'Contact No.', kind: 'phone', width: 130 },
        { key: 'state', label: 'State', width: 140 },
        { key: 'clDate', label: 'CL Date', kind: 'date', width: 120 },
      ],
    },
    {
      title: 'Account & upload details',
      cols: [
        { key: 'acStatus', label: 'A/C Status', kind: 'enum', options: AC_STATUS, badge: true, width: 150 },
        { key: 'upload', label: 'Upload Status', kind: 'enum', options: UPLOAD_STATUS, badge: true, width: 140 },
        { key: 'action', label: 'Action to be taken', width: 260 },
        { key: 'remark', label: 'Remark', width: 220 },
      ],
    },
  ]
  return (
    <SheetReport
      store={bsStore}
      name="BS"
      sub="View the supplied franchise account statement and Apna App upload fields."
      title="BS report"
      idPrefix="BS"
      noun="records"
      bands={bands}
      scope={(r) => r.fy === fy}
      controls={<HeaderSelect label="F.Y." value={fy} onChange={setFy} options={FIN_YEARS.map((y) => ({ value: y, label: `F.Y. ${y}` }))} />}
      filterDefs={[
        { key: 'acStatus', label: 'A/C Status', options: AC_STATUS },
        { key: 'upload', label: 'Upload Status', options: UPLOAD_STATUS },
      ]}
      newRow={() => ({ fy, month: months[0], hitachi: '', atmId: '', location: '', franchise: '', contact: '', state: '', clDate: '', acStatus: '', upload: 'Pending', action: '', remark: '' })}
      meta={(rows) => (
        <>
          <span className="font-semibold text-ink">Franchise Account Statement in Apna App Upload Status - F.Y. {fy}</span>
          <span className="block">
            {rows.length} records · 13 columns · {rows.filter((r) => r.upload === 'Uploaded').length} uploaded · {rows.filter((r) => r.upload !== 'Uploaded').length} pending action
          </span>
        </>
      )}
      notes={() => (
        <>
          <SheetNote title="Source format corrected">
            The supplied sheet repeats the <b>State</b> column (source I and J); a single State column is kept, so source columns after State move up one letter.
            Current Account, Axis Indent and ICICI SR were continuation entries under S.N. 1 — they are now the allowed values of A/C Status on every row.
          </SheetNote>
          <SheetNote title={`Financial year · F.Y. ${fy}`}>Rows are filed by financial year (April–March). Switch F.Y. above; rows added in edit mode are filed under the selected year.</SheetNote>
        </>
      )}
    />
  )
}

// ── Axis & ICD ────────────────────────────────────────────────────────────
export function AxisIcdReport() {
  const all = axisStore.use()
  return (
    <SheetReport
      store={axisStore}
      name="Axis & ICD"
      sub="View the supplied Axis & ICD franchise report fields."
      title="Axis & ICD report"
      idPrefix="AX"
      noun="records"
      bands={[
        {
          title: 'Axis & ICD',
          cols: [
            { key: 'mf', label: 'MF Name', width: 210 },
            { key: 'atmId', label: 'ATM ID', width: 130 },
            { key: 'franchise', label: 'Franchise Name', width: 210 },
            { key: 'mobile', label: 'Mobile Number', kind: 'phone', width: 140 },
            { key: 'email', label: 'Franchise Email ID', kind: 'email', width: 230 },
            { key: 'altEmail', label: 'Franchise Another Email ID', kind: 'email', width: 240 },
          ],
        },
      ]}
      filterDefs={[{ key: 'mf', label: 'MF Name', options: uniq(all, 'mf') }]}
      newRow={() => ({ mf: '', atmId: '', franchise: '', mobile: '', email: '', altEmail: '' })}
      meta={(rows) => `${rows.length} records · 7 source columns · ${rows.filter((r) => !r.altEmail).length} without an alternate email`}
      notes={() => (
        <>
          <SheetNote title="Contact checks">Mobile numbers must be 10 digits (starting 6–9) and both email fields are validated when you edit them.</SheetNote>
          <SheetNote title="Source format">All seven column headers are kept in the supplied order (S.N. to Franchise Another Email ID).</SheetNote>
        </>
      )}
    />
  )
}

// ── CLF ───────────────────────────────────────────────────────────────────
export function ClfReport() {
  return (
    <SheetReport
      store={clfStore}
      name="CLF"
      sub="View the supplied CLF payment fields and FR / Sender Details."
      title="CLF report"
      idPrefix="CLF"
      noun="source rows"
      bands={[
        {
          title: 'Identity & CLF fields',
          cols: [
            { key: 'siteId', label: 'Site ID', width: 160 },
            { key: 'atmId', label: 'ATM ID', width: 130 },
            { key: 'franchiseeName', label: 'FRANCHISEE NAME', width: 220 },
            { key: 'franchiseeNo', label: 'FRANCHISEE NO.', kind: 'phone', width: 140 },
            { key: 'cashLiveDate', label: 'Cash Live Date', kind: 'date', width: 130 },
            { key: 'clfStatus', label: 'CLF Status', kind: 'enum', options: CLF_STATUS, badge: true, width: 120 },
            { key: 'hpyAccount', label: 'HPY Account Number', width: 170 },
          ],
        },
        {
          title: 'Payment & sender fields',
          note: 'Payment fields · I–K  |  FR / Sender Details · L–O',
          cols: [
            { key: 'clfAmount', label: 'CLF Amount', kind: 'money', group: 'Payment fields', width: 140 },
            { key: 'paymentDate', label: 'Payment Date', kind: 'date', group: 'Payment fields', width: 130 },
            { key: 'transferTime', label: 'Payment Transfer Time', kind: 'time', group: 'Payment fields', width: 150 },
            { key: 'frBank', label: 'FR Bank Name', group: 'FR / Sender Details', width: 170 },
            { key: 'holder', label: 'Account Holder Name', group: 'FR / Sender Details', width: 190 },
            { key: 'utr', label: 'NEFT-UTR-IMPS Number', group: 'FR / Sender Details', width: 210 },
            { key: 'settlementBank', label: 'Settlement Bank Name', kind: 'enum', options: SETTLEMENT_BANKS, group: 'FR / Sender Details', width: 170 },
          ],
        },
      ]}
      filterDefs={[
        { key: 'clfStatus', label: 'CLF Status', options: CLF_STATUS },
        { key: 'settlementBank', label: 'Settlement Bank', options: SETTLEMENT_BANKS },
      ]}
      newRow={() => ({ siteId: '', atmId: '', franchiseeName: '', franchiseeNo: '', cashLiveDate: '', clfStatus: '1st', hpyAccount: '', clfAmount: '', paymentDate: '', transferTime: '', frBank: '', holder: '', utr: '', settlementBank: '' })}
      meta={(rows) => `${rows.length} source rows · 15 source columns · CLF total ${inr(sum(rows, 'clfAmount')) || '₹ 0'}`}
      notes={() => (
        <>
          <SheetNote title="Allowed values">
            CLF Status: {CLF_STATUS.join(', ')} (instalment number). Settlement Bank Name: {SETTLEMENT_BANKS.join(', ')}. These were listed as continuation entries in the source and are now dropdowns.
          </SheetNote>
          <SheetNote title="Payment transfer time">Stored as 24-hour time. The source showed “16:29 PM”, which mixes 24-hour and AM/PM — shown here as 16:29.</SheetNote>
        </>
      )}
    />
  )
}

// ── SD (all franchises) ───────────────────────────────────────────────────
export function SdReport() {
  return (
    <SheetReport
      store={sdReportStore}
      name="SD"
      sub="View security deposit payment fields and franchise bank details across all franchises."
      title="SD report"
      idPrefix="SD"
      noun="payments"
      bands={({ editing }) => [
        {
          title: 'Identity & payment type fields',
          cols: [
            { key: 'siteId', label: 'Site ID', width: 160 },
            { key: 'atmId', label: 'ATM ID', width: 130 },
            { key: 'franchiseeName', label: 'FRANCHISEE NAME', width: 220 },
            { key: 'franchiseeNo', label: 'FRANCHISEE NO.', kind: 'phone', width: 140 },
            { key: 'cashLiveDate', label: 'Cash Live Date', kind: 'date', width: 130 },
            { key: 'hpyAccount', label: 'HPY Account Number', width: 170 },
            { key: 'paymentType', label: 'Payment Type', kind: 'enum', options: PAYMENT_TYPES, width: 120 },
          ],
        },
        {
          title: 'Payment & franchise bank fields',
          cols: [
            { key: 'paymentDate', label: 'Payment Date', kind: 'date', width: 130 },
            { key: 'transferTime', label: 'Payment Transfer Time', kind: 'time', width: 150 },
            { key: 'txnNumber', label: 'TXN Number', width: 200 },
            { key: 'amount', label: 'Amount', kind: 'money', width: 130 },
            { key: 'frBank', label: 'FR Bank Name', width: 170 },
            { key: 'holder', label: 'Account Holder Name', width: 190 },
            { key: 'frAccount', label: 'FR Account', width: 160, render: (r) => (!r.frAccount ? <span className="text-muted">—</span> : editing ? r.frAccount : `••••${r.frAccount.slice(-4)}`) },
            { key: 'frIfsc', label: 'FR IFSC', kind: 'ifsc', width: 130 },
          ],
        },
      ]}
      filterDefs={[
        { key: 'paymentType', label: 'Payment Types', options: PAYMENT_TYPES },
        { key: 'franchiseeName', label: 'Franchisees', options: [...new Set(SITES.map((s) => s.franchise))].sort() },
      ]}
      newRow={() => ({ siteId: '', atmId: '', franchiseeName: '', franchiseeNo: '', cashLiveDate: '', hpyAccount: '', paymentType: 'NEFT', paymentDate: '', transferTime: '', txnNumber: '', amount: '', frBank: '', holder: '', frAccount: '', frIfsc: '' })}
      meta={(rows) => `${rows.length} payments · ${new Set(rows.map((r) => r.franchiseeName)).size} franchises · 16 source columns`}
      notes={(rows) => (
        <>
          <SheetNote title={`Total security deposit · ${inr(sum(rows, 'amount')) || '₹ 0'}`}>
            Payment Type is one of NEFT, RTGS or IMPS and Payment Date is a calendar date. (The source sheet listed NEFT / RTGS / IMPS under Payment Date — corrected here.)
          </SheetNote>
          <SheetNote title="Account numbers">FR Account is masked in view mode; the full number is visible while editing. IFSC is validated (e.g. HDFC0001234).</SheetNote>
        </>
      )}
    />
  )
}
