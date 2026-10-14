import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Save } from 'lucide-react'
import { BandedSheet, SheetNote, type Band } from '@/components/grid/BandedSheet'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { SD_PAYMENT_TYPES, getFranchise, inr, saveSd, sdFor, sdStore, type SdPayment } from '@/data/franchises'

const BANDS: Band<SdPayment>[] = [
  {
    title: 'Identity & payment type fields',
    columns: [
      { key: 'siteId', header: 'Site ID', sortable: true, width: 170 },
      { key: 'atmId', header: 'ATM ID', sortable: true, filterable: true, width: 140 },
      { key: 'franchiseeName', header: 'FRANCHISEE NAME', filterable: true, width: 220 },
      { key: 'franchiseeNo', header: 'FRANCHISEE NO.', width: 140 },
      { key: 'cashLiveDate', header: 'Cash Live Date', inputType: 'date', width: 140 },
      { key: 'hpyAccount', header: 'HPY Account Number', width: 170 },
      { key: 'paymentType', header: 'Payment Type', options: SD_PAYMENT_TYPES, width: 130 },
    ],
  },
  {
    title: 'Payment & franchise bank fields',
    columns: [
      { key: 'paymentDate', header: 'Payment Date', inputType: 'date', sortable: true, width: 140 },
      { key: 'transferTime', header: 'Payment Transfer Time', inputType: 'time', width: 150 },
      { key: 'txnNumber', header: 'TXN Number', width: 160 },
      { key: 'amount', header: 'Amount', inputType: 'number', align: 'right', width: 130, render: (r) => <b>{inr(r.amount) || '—'}</b> },
      { key: 'frBankName', header: 'FR Bank Name', width: 140 },
      { key: 'accountHolder', header: 'Account Holder Name', width: 200 },
      { key: 'frAccount', header: 'FR Account', width: 170, render: (r) => (r.frAccount ? `••••${r.frAccount.slice(-4)}` : '—') },
      { key: 'frIfsc', header: 'FR IFSC', width: 130 },
    ],
  },
]

/** SD (security deposit) payments for one franchise — view → Edit details → Save. */
export default function SdManagement() {
  const { id = '' } = useParams()
  sdStore.use()
  const fr = getFranchise(id)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<SdPayment[] | null>(null)
  if (!fr) return <Navigate to="/franchise/master-data" replace />
  const rows = draft ?? sdFor(fr)
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  const change = (rowId: string, key: string, value: string) => {
    if (key === 'amount' && value && Number.isNaN(Number(value))) return toast('Amount must be a number', 'info')
    if (key === 'frIfsc' && value && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(value)) return toast('IFSC looks like HDFC0001234', 'info')
    setDraft(rows.map((r) => (r.id === rowId ? { ...r, [key]: key === 'frIfsc' ? value.toUpperCase() : value } : r)))
  }

  return (
    <div>
      <Link to="/franchise/master-data" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
        <ArrowLeft size={15} /> Back to Master Data
      </Link>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">WLA Franchise Application</h1>
          <p className="mt-1 text-[14px] text-muted">
            SD payment fields and franchise bank details · {fr.id} · {fr.name}
          </p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                variant="secondary"
                icon={<Plus size={16} />}
                onClick={() => setDraft([...rows, { ...rows[0], id: `${fr.id}-SD-${rows.length + 1}`, paymentDate: '', transferTime: '', txnNumber: '', amount: '', paymentType: '' }])}
              >
                Add payment
              </Button>
              <Button variant="secondary" onClick={() => { setEditing(false); setDraft(null) }}>
                Cancel
              </Button>
              <Button
                variant="bright"
                icon={<Save size={16} />}
                onClick={() => {
                  saveSd(fr.id, rows)
                  setEditing(false)
                  setDraft(null)
                  toast('SD payments saved')
                }}
              >
                Save
              </Button>
            </>
          ) : (
            <Button icon={<Pencil size={16} />} onClick={() => { setDraft(sdFor(fr)); setEditing(true) }}>
              Edit details
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex border-b border-line">
        <span className="-mb-px border-b-2 border-primary px-3 py-2.5 text-[13px] font-semibold text-primary">SD</span>
      </div>

      <BandedSheet
        bands={BANDS}
        rows={rows}
        rowId={(r) => r.id}
        rowLabel={{ key: 'sn', header: 'S.N.', width: 50, value: (r) => rows.indexOf(r) + 1 }}
        editing={editing}
        onCellChange={change}
        title="SD report"
        countLabel={`${rows.length} payment${rows.length > 1 ? 's' : ''}`}
        searchPlaceholder="Search report fields"
        noun="payments"
        exportName={`${fr.id}-sd`}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SheetNote title={`Total security deposit · ${inr(total) || '₹ 0'}`}>
          Payment Type is one of NEFT, RTGS or IMPS. Payment Date is a calendar date. (The source sheet listed NEFT / RTGS / IMPS under Payment Date — corrected here.)
        </SheetNote>
        <SheetNote title="Audit">Reports respect your workspace permissions. Edits and exports are recorded in the audit trail.</SheetNote>
      </div>
    </div>
  )
}
