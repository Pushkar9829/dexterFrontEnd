import { Printer, X } from 'lucide-react'
import type { GstRecord } from '@/data/financeGst'

// Number to words converter for INR
export function amountInWords(val: number | string): string {
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : val
  if (isNaN(num) || num <= 0) return 'Zero Rupees Only'

  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ]
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertGroup = (n: number): string => {
    if (n === 0) return ''
    if (n < 20) return a[n] + ' '
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' '
    return (
      a[Math.floor(n / 100)] +
      ' Hundred ' +
      (n % 100 !== 0 ? 'and ' + convertGroup(n % 100) : '')
    )
  }

  const intPart = Math.floor(num)
  const crores = Math.floor(intPart / 10000000)
  const lakhs = Math.floor((intPart % 10000000) / 100000)
  const thousands = Math.floor((intPart % 100000) / 1000)
  const remaining = intPart % 1000

  let res = ''
  if (crores > 0) res += convertGroup(crores) + 'Crore '
  if (lakhs > 0) res += convertGroup(lakhs) + 'Lakh '
  if (thousands > 0) res += convertGroup(thousands) + 'Thousand '
  if (remaining > 0) res += convertGroup(remaining)

  return (res.trim() || 'Zero') + ' Rupees Only'
}

interface GstInvoiceTemplateProps {
  record?: Partial<GstRecord> | null
  isBlankTemplate?: boolean
  onClose: () => void
}

export default function GstInvoiceTemplate({
  record,
  isBlankTemplate = false,
  onClose,
}: GstInvoiceTemplateProps) {
  // If blank template mode (from "View Invoice Template"), use the exact values from user's PDF sample
  const isSample = isBlankTemplate || !record || !record.franchiseeName

  const invoiceNo = isSample
    ? 'GST/26-27/'
    : record?.invoiceNumber || (record?.invoicePrefix ? `${record.invoicePrefix}${record.invoiceSeq || ''}` : 'GST/26-27/00125')
  const invoiceDate = isSample ? '' : record?.invoiceDate || '05-10-2026'

  // Recipient / Bill To details
  const recipientName = isSample
    ? 'ABC Pvt. Ltd. (your customer)'
    : `${record?.franchiseeName || 'ABC Pvt. Ltd.'} (your customer)`
  const address = isSample
    ? 'Shop No.1st Surajpur \nGreater Noida Uttar Pradesh Pin.201306'
    : record?.address || 'Shop No.1st Surajpur \nGreater Noida Uttar Pradesh Pin.201306'
  const gstin = isSample ? '09AABC134522J1ZE' : record?.gstNumber || '09AABC134522J1ZE'
  const pan = isSample ? 'AAB1325482J' : record?.panNumber || 'AAB1325482J'
  const state = isSample ? 'Uttar Pradesh' : record?.state || 'Uttar Pradesh'
  const stateCode = isSample ? '09' : record?.stateCode || '09'
  const month = isSample ? '' : record?.month || 'October 2026'
  const atmId = isSample ? '' : record?.atmId || 'ATM12345'

  // Amounts
  const basicAmount = isSample ? '000000' : record?.basicAmount || '50,000.00'
  const cgstAmount = isSample ? '0000.00' : record?.cgst || '4,500.00'
  const sgstAmount = isSample ? '0000.00' : record?.sgst || '4,500.00'
  const roundOff = isSample ? '' : record?.roundOff || '0.00'
  const totalAmount = isSample ? '0000000' : record?.invoiceAmount || '59,000.00'

  const words = isSample
    ? '–'
    : amountInWords(record?.invoiceAmount || '59000')

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #gst-invoice-print-area, #gst-invoice-print-area * {
            visibility: visible !important;
          }
          #gst-invoice-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* Outer Card */}
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-auto flex flex-col overflow-hidden animate-in zoom-in-95 border border-slate-300">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-[14px]">
              {isSample ? 'GST Invoice Template' : `Tax Invoice - ${invoiceNo}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[12px] font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <Printer size={14} />
              <span>Print / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Invoice Printable Area */}
        <div className="p-4 sm:p-8 overflow-y-auto text-black font-sans bg-white">
          <div
            id="gst-invoice-print-area"
            className="max-w-[780px] mx-auto border border-black text-[12px] leading-snug bg-white"
          >
            {/* Header: Tax Invoice */}
            <div className="border-b border-black text-center py-1.5 font-bold text-[16px] tracking-wide">
              Tax Invoice
            </div>

            {/* Invoice No. & Invoice Date Row */}
            <div className="grid grid-cols-2 border-b border-black text-[12px]">
              <div className="flex border-r border-black">
                <span className="font-bold px-2 py-1 w-28 shrink-0">Invoice No.</span>
                <span className="px-2 py-1 flex-1 border-l border-black font-medium">{invoiceNo}</span>
              </div>
              <div className="flex">
                <span className="font-bold px-2 py-1 w-28 shrink-0">Invoice Date</span>
                <span className="px-2 py-1 flex-1 border-l border-black font-medium">{invoiceDate}</span>
              </div>
            </div>

            {/* Section Headers (Highlighted Yellow) */}
            <div className="grid grid-cols-2 border-b border-black text-[12px] font-bold">
              <div className="bg-[#fff960] px-2 py-1 border-r border-black">
                Invoice Issuer-
              </div>
              <div className="bg-[#fff960] px-2 py-1">
                Invoice Recipient / Bill To
              </div>
            </div>

            {/* Issuer & Recipient Details Row */}
            <div className="grid grid-cols-2 border-b border-black text-[11.5px]">
              {/* Left Column: Invoice Issuer Details */}
              <div className="border-r border-black flex flex-col justify-between">
                <div>
                  <div className="border-b border-black px-2 py-1 font-bold">Name As Per GST</div>
                  <div className="border-b border-black px-2 py-1 font-bold">Address as per GST</div>
                  <div className="border-b border-black px-2 py-1 font-bold">GSTIN/UIN</div>
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-5 px-2 py-1 font-bold border-r border-black">State Name</div>
                    <div className="col-span-7 px-2 py-1">Uttar Pradesh</div>
                  </div>
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-5 px-2 py-1 font-bold border-r border-black">Code</div>
                    <div className="col-span-7 px-2 py-1">09</div>
                  </div>
                  <div className="border-b border-black px-2 py-1 font-bold">E-Mail</div>
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-5 px-2 py-1 font-bold border-r border-black">
                      Invoice for the <br /> month
                    </div>
                    <div className="col-span-7 px-2 py-1 flex items-center">{month}</div>
                  </div>
                  <div className="px-2 py-1 font-bold">PAN :</div>
                </div>
              </div>

              {/* Right Column: Invoice Recipient / Bill To Details */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="border-b border-black px-2 py-1 font-bold">{recipientName}</div>
                  <div className="border-b border-black px-2 py-1 min-h-[42px] whitespace-pre-line">
                    {address}
                  </div>
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-5 px-2 py-1 font-bold border-r border-black">GSTIN/UIN:</div>
                    <div className="col-span-7 px-2 py-1 font-mono font-medium">{gstin}</div>
                  </div>
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-5 px-2 py-1 font-bold border-r border-black">PAN/IT No :</div>
                    <div className="col-span-7 px-2 py-1 font-mono font-medium">{pan}</div>
                  </div>
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-5 px-2 py-1 font-bold border-r border-black">State Name</div>
                    <div className="col-span-7 px-2 py-1">{state}</div>
                  </div>
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-5 px-2 py-1 font-bold border-r border-black">Code</div>
                    <div className="col-span-7 px-2 py-1">{stateCode}</div>
                  </div>
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-5 px-2 py-1 font-bold border-r border-black">Place of Supply</div>
                    <div className="col-span-7 px-2 py-1">{state}</div>
                  </div>
                  <div className="px-2 py-1 font-bold">E-Mail:</div>
                </div>
              </div>
            </div>

            {/* Line Items Table Header */}
            <div className="grid grid-cols-12 border-b border-black text-center font-bold text-[11.5px] bg-slate-50/50">
              <div className="col-span-1 border-r border-black py-1">S.N.</div>
              <div className="col-span-6 border-r border-black py-1">Description of Service(s)</div>
              <div className="col-span-2 border-r border-black py-1">HSN/SAC</div>
              <div className="col-span-3 py-1">Basic Amount</div>
            </div>

            {/* Row 1: ATM Operating Services */}
            <div className="grid grid-cols-12 border-b border-black text-[11.5px] min-h-[56px]">
              <div className="col-span-1 border-r border-black px-2 py-1.5 text-center">1.</div>
              <div className="col-span-6 border-r border-black px-2 py-1.5">
                <div>ATM Operating Services</div>
                <div>ATM Id- {atmId}</div>
              </div>
              <div className="col-span-2 border-r border-black px-2 py-1.5 text-center">99940</div>
              <div className="col-span-3 px-2 py-1.5 text-right font-medium">{basicAmount}</div>
            </div>

            {/* Row 2: CGST */}
            <div className="grid grid-cols-12 border-b border-black text-[11.5px]">
              <div className="col-span-1 border-r border-black px-2 py-0.5 text-center">2.</div>
              <div className="col-span-6 border-r border-black px-2 py-0.5"></div>
              <div className="col-span-2 border-r border-black px-2 py-0.5 text-right font-medium">
                Output CGST @ 9%
              </div>
              <div className="col-span-3 px-2 py-0.5 text-right font-medium">{cgstAmount}</div>
            </div>

            {/* Row 3: SGST */}
            <div className="grid grid-cols-12 border-b border-black text-[11.5px]">
              <div className="col-span-1 border-r border-black px-2 py-0.5 text-center">3.</div>
              <div className="col-span-6 border-r border-black px-2 py-0.5"></div>
              <div className="col-span-2 border-r border-black px-2 py-0.5 text-right font-medium">
                Output SGST @ 9%
              </div>
              <div className="col-span-3 px-2 py-0.5 text-right font-medium">{sgstAmount}</div>
            </div>

            {/* Row 4: Round Off */}
            <div className="grid grid-cols-12 border-b border-black text-[11.5px]">
              <div className="col-span-1 border-r border-black px-2 py-0.5 text-center">4.</div>
              <div className="col-span-6 border-r border-black px-2 py-0.5"></div>
              <div className="col-span-2 border-r border-black px-2 py-0.5 text-right font-medium">
                Round Off
              </div>
              <div className="col-span-3 px-2 py-0.5 text-right font-medium">{roundOff}</div>
            </div>

            {/* Row 5: Total */}
            <div className="grid grid-cols-12 border-b border-black text-[11.5px] font-bold">
              <div className="col-span-1 border-r border-black px-2 py-1 text-center">5.</div>
              <div className="col-span-6 border-r border-black px-2 py-1"></div>
              <div className="col-span-2 border-r border-black px-2 py-1 text-right">Total</div>
              <div className="col-span-3 px-2 py-1 text-right">{totalAmount}</div>
            </div>

            {/* Amount Chargeable in words */}
            <div className="border-b border-black px-2 py-1 text-[11.5px]">
              <span className="font-bold">Amount Chargeable (in words) – </span>
              <span>{words}</span>
            </div>

            {/* Bottom 2-Column: Declaration and Bank Details */}
            <div className="grid grid-cols-2 text-[11.5px]">
              {/* Left Column: Declaration */}
              <div className="border-r border-black p-2 flex flex-col justify-between">
                <div>
                  <div className="font-bold mb-1">Declaration :</div>
                  <div className="text-[11px] leading-tight mb-1.5">
                    1. Certified that the particulars mentioned above are true and correct.
                  </div>
                  <div className="text-[11px] leading-tight">
                    2. Dispute, if any, are subject to Mainpuri Uttar Pradesh jurisdiction only.
                  </div>
                </div>
              </div>

              {/* Right Column: Bank Details & Signature */}
              <div className="p-2 flex flex-col justify-between min-h-[140px]">
                <div>
                  <div className="font-bold mb-1 border-b border-black/30 pb-0.5">
                    Invoice Issuer 's Bank Details
                  </div>
                  <div className="grid grid-cols-12 text-[11px] py-0.5">
                    <span className="col-span-5 font-bold">Bank Name:</span>
                    <span className="col-span-7">{isSample ? '' : 'HDFC Bank Ltd.'}</span>
                  </div>
                  <div className="grid grid-cols-12 text-[11px] py-0.5">
                    <span className="col-span-5 font-bold">A/c No.:</span>
                    <span className="col-span-7">{isSample ? '' : '50200084729103'}</span>
                  </div>
                  <div className="grid grid-cols-12 text-[11px] py-0.5">
                    <span className="col-span-5 font-bold">Branch & IFS Code:</span>
                    <span className="col-span-7">{isSample ? '' : 'Noida Sector 62 & HDFC0001234'}</span>
                  </div>
                </div>

                {/* Authorized Signatory */}
                <div className="text-right pt-6 pr-2">
                  <div className="text-[11px] font-bold">For: Name As per GST</div>
                  <div className="h-9"></div>
                  <div className="text-[11px] font-bold">Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
