import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ArrowLeft,
  Edit3,
  Trash2,
  Building2,
  Truck,
  Landmark,
  FileText,
  Mail,
  User,
  Download,
} from 'lucide-react'
import {
  getChequeRecord,
  deleteChequeRecord,
  type ChequeAcknowledgementStatus,
  type ChequeCollectionType,
} from '@/data/legalCheques'
import { toast } from '@/components/ui/Toast'

export default function FmChecksRecord() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const record = id ? getChequeRecord(id) : undefined

  if (!record) {
    return (
      <div className="max-w-[1000px] mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-[#0066FF] flex items-center justify-center mx-auto shadow-xs">
          <FileText size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Cheque Record Not Found</h2>
        <p className="text-[13px] text-slate-500 max-w-md mx-auto">
          The requested cheque collection record could not be found or may have been deleted.
        </p>
        <div>
          <Link
            to="/legal/fm-checks"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0066FF] text-white text-[13px] font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <ArrowLeft size={14} /> Back to Cheques List
          </Link>
        </div>
      </div>
    )
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete cheque collection record ${record.id}?`)) {
      deleteChequeRecord(record.id)
      toast('Cheque record deleted')
      navigate('/legal/fm-checks')
    }
  }

  const renderAcknowledgementBadge = (status: ChequeAcknowledgementStatus) => {
    switch (status) {
      case 'Acknowledged':
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-md text-[11.5px] font-semibold bg-[#D1FADF] text-[#027A48] border border-[#A6F4C5] shadow-2xs">
            Acknowledged
          </span>
        )
      case 'Pending':
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-md text-[11.5px] font-semibold bg-[#FEF0C7] text-[#B54708] border border-[#FEDF89] shadow-2xs">
            Pending
          </span>
        )
      case 'Received':
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-md text-[11.5px] font-semibold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] shadow-2xs">
            Received
          </span>
        )
      case 'Rejected':
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-md text-[11.5px] font-semibold bg-[#FEE4E2] text-[#B42318] border border-[#FECDCA] shadow-2xs">
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-md text-[11.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            {status}
          </span>
        )
    }
  }

  const renderTypeBadge = (type: ChequeCollectionType) => {
    return (
      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#0066FF] border border-blue-200">
        Type: {type}
      </span>
    )
  }

  return (
    <div className="max-w-[1240px] mx-auto pb-16 space-y-4">
      {/* Top Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-2">
        <Link
          to="/dashboard"
          className="text-[#0066FF] hover:opacity-80 transition-opacity flex items-center"
          title="Home"
        >
          <Home size={14} />
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="text-slate-500">Workspace</span>
        <ChevronRight size={13} className="text-slate-400" />
        <Link to="/legal" className="text-slate-500 hover:text-[#0066FF] transition-colors">
          Legal
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <Link to="/legal/fm-checks" className="text-slate-500 hover:text-[#0066FF] transition-colors">
          Cheques
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="font-semibold text-slate-800">{record.id}</span>
      </nav>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-[13px] font-bold text-[#0066FF] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/80">
                {record.id}
              </span>
              <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">
                {record.franchiseeName}
              </h1>
              {renderAcknowledgementBadge(record.acknowledgement)}
              {renderTypeBadge(record.type)}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Mail size={11} /> Connected with Daak Register
              </span>
            </div>

            <p className="text-[12.5px] text-slate-500 flex items-center gap-2 flex-wrap">
              <span>Site ID: <strong className="text-slate-700">{record.siteId}</strong></span>
              <span>•</span>
              <span>ATM ID: <strong className="text-slate-700">{record.atmId}</strong></span>
              <span>•</span>
              <span>Model: <strong className="text-slate-700">{record.model}</strong></span>
              <span>•</span>
              <span>Mobile: <strong className="text-slate-700">{record.mobileNumber}</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/legal/fm-checks">
              <button
                type="button"
                className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[12.5px] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} /> Back
              </button>
            </Link>
            <Link to={`/legal/fm-checks/${record.id}/edit`}>
              <button
                type="button"
                className="h-9 px-3.5 rounded-lg bg-[#0066FF] hover:bg-blue-700 text-white font-medium text-[12.5px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Edit3 size={14} /> Edit
              </button>
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              className="h-9 px-3 rounded-lg border border-slate-200 hover:border-red-200 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 font-medium text-[12.5px] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Delete record"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Site Information & Dispatch / POD Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Site & Franchise Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 text-[14px] font-bold text-slate-900">
            <Building2 size={16} className="text-[#0066FF]" />
            <h2>Site & Franchise Information</h2>
          </div>

          <div className="space-y-2.5 text-[12.5px]">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Site ID:</span>
              <span className="font-semibold text-[#0066FF]">{record.siteId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">ATM ID:</span>
              <span className="font-medium text-slate-800">{record.atmId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Franchisee Name:</span>
              <span className="font-medium text-slate-800">{record.franchiseeName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Mobile Number:</span>
              <span className="font-mono text-slate-700">{record.mobileNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">ATM Model:</span>
              <span className="text-slate-800">{record.model}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Collection Type:</span>
              <span className="font-semibold text-slate-800">{record.type}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Dispatch & POD Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 text-[14px] font-bold text-slate-900">
            <Truck size={16} className="text-[#0066FF]" />
            <h2>Dispatch & POD Details</h2>
          </div>

          <div className="space-y-2.5 text-[12.5px]">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Dispatched By:</span>
              <span className="font-medium text-slate-800">{record.dispatchedBy || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Received By:</span>
              <span className="font-medium text-slate-800">{record.receivedBy || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">FR POD Number:</span>
              <span className="font-mono text-slate-800 font-semibold">{record.frPod || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">FR POD Date:</span>
              <span className="text-slate-700">{record.frPodDate || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">POD to Bank:</span>
              <span className="font-mono text-slate-800 font-semibold">{record.podToBank || '—'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Bank POD Date:</span>
              <span className="text-slate-700">{record.bankPodDate || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cheques Details Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-[14px] font-bold text-slate-900">
            <Landmark size={16} className="text-[#0066FF]" />
            <h2>Cheque Details ({record.chequeEntries.length} entries)</h2>
          </div>
          <span className="text-[12px] text-slate-500 font-medium">
            Minimum 5 Cheques Verified
          </span>
        </div>

        <div className="overflow-x-auto scroll-thin border border-slate-200 rounded-lg">
          <table className="w-full text-left text-[12px] border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#EEF4FC] text-slate-800 font-bold border-b border-slate-200 text-center">
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] w-12 text-center">S.N.</th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] text-left">FR Bank Name</th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] text-left">Account Number</th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] text-left">Cheque Number</th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] text-center w-36">Allotted to</th>
                <th className="py-2.5 px-3 text-center w-32">Status</th>
              </tr>
            </thead>
            <tbody>
              {record.chequeEntries.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-blue-50/20 text-slate-800">
                  <td className="py-2 px-3 border-r border-slate-100 text-center font-medium text-slate-500">
                    {c.sn}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-100 font-medium">
                    {c.bankName}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-100 font-mono text-[11.5px] text-slate-700">
                    {c.accountNumber}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-100 font-mono font-semibold text-[#0066FF]">
                    {c.chequeNumber}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-100 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {c.allottedTo}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Collected
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Documents, Handover & Remark Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Uploaded Documents */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 text-[14px] font-bold text-slate-900">
            <FileText size={16} className="text-[#0066FF]" />
            <h2>Uploaded Documents</h2>
          </div>

          <div className="space-y-3">
            <div className="text-[12px] text-slate-500">
              Document Category: <strong className="text-slate-800">{record.documentType}</strong>
            </div>

            <div className="space-y-2">
              {record.documents && record.documents.length > 0 ? (
                record.documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 text-[12px]"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-blue-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800">{doc.name}</div>
                        <div className="text-[10.5px] text-slate-400">{doc.sizeKb} KB • PDF Document</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toast(`Downloading ${doc.name}...`)}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Download size={12} /> Download
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400 text-[12px]">
                  No documents attached
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[12px]">
              <span className="text-slate-500">Handover Staff:</span>
              <span className="font-semibold text-slate-800">{record.handoverStaff}</span>
            </div>
          </div>
        </div>

        {/* Remarks & System Timestamps */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 text-[14px] font-bold text-slate-900">
              <User size={16} className="text-[#0066FF]" />
              <h2>Remarks & Record Audit</h2>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[12.5px] text-slate-700 min-h-[70px]">
              {record.remark || 'No remarks recorded for this cheque collection.'}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11.5px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Created On:</span>
              <span className="font-medium text-slate-700">{new Date(record.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span className="font-medium text-slate-700">{new Date(record.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
