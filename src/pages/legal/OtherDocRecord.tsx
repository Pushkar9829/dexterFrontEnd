import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ArrowLeft,
  Edit3,
  Trash2,
  Building2,
  FolderOpen,
  FileText,
  Download,
  ShieldCheck,
} from 'lucide-react'
import {
  getOtherDocRecord,
  deleteOtherDocRecord,
  type OtherDocCategory,
  type OtherDocStatus,
} from '@/data/legalOtherDocs'
import { toast } from '@/components/ui/Toast'

export default function OtherDocRecord() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const record = id ? getOtherDocRecord(id) : undefined

  if (!record) {
    return (
      <div className="max-w-[1000px] mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-[#0066FF] flex items-center justify-center mx-auto shadow-xs">
          <FolderOpen size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Legal Document Not Found</h2>
        <p className="text-[13px] text-slate-500 max-w-md mx-auto">
          The requested legal document record could not be found or may have been deleted.
        </p>
        <div>
          <Link
            to="/legal/other-documents"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0066FF] text-white text-[13px] font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <ArrowLeft size={14} /> Back to Other Documents
          </Link>
        </div>
      </div>
    )
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete document ${record.id}?`)) {
      deleteOtherDocRecord(record.id)
      toast('Document record deleted')
      navigate('/legal/other-documents')
    }
  }

  const renderStatusBadge = (status: OtherDocStatus) => {
    switch (status) {
      case 'Verified':
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-md text-[11.5px] font-semibold bg-[#D1FADF] text-[#027A48] border border-[#A6F4C5] shadow-2xs">
            Verified
          </span>
        )
      case 'Pending Review':
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-md text-[11.5px] font-semibold bg-[#FEF0C7] text-[#B54708] border border-[#FEDF89] shadow-2xs">
            Pending Review
          </span>
        )
      case 'Action Required':
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-md text-[11.5px] font-semibold bg-[#FEE4E2] text-[#B42318] border border-[#FECDCA] shadow-2xs">
            Action Required
          </span>
        )
      case 'Expired':
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-md text-[11.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs">
            Expired
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

  const renderCategoryBadge = (category: OtherDocCategory) => {
    let color = 'bg-blue-50 text-[#0066FF] border-blue-200/70'
    if (category === 'Rent Agreement') color = 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
    if (category === 'Power of Attorney') color = 'bg-purple-50 text-purple-700 border-purple-200/70'
    if (category === 'NOC Clearance') color = 'bg-amber-50 text-amber-800 border-amber-200/70'
    if (category === 'Indemnity Bond') color = 'bg-rose-50 text-rose-700 border-rose-200/70'
    if (category === 'Board Resolution') color = 'bg-cyan-50 text-cyan-700 border-cyan-200/70'

    return (
      <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded text-[11px] font-semibold border ${color}`}>
        {category}
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
        <Link to="/legal/other-documents" className="text-slate-500 hover:text-[#0066FF] transition-colors">
          Other Legal Documents
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
                {record.docTitle}
              </h1>
              {renderStatusBadge(record.status)}
              {renderCategoryBadge(record.category)}
            </div>

            <p className="text-[12.5px] text-slate-500 flex items-center gap-2 flex-wrap">
              <span>Site ID: <strong className="text-slate-700">{record.siteId}</strong></span>
              <span>•</span>
              <span>ATM ID: <strong className="text-slate-700">{record.atmId}</strong></span>
              <span>•</span>
              <span>Franchisee: <strong className="text-slate-700">{record.franchiseeName}</strong></span>
              <span>•</span>
              <span>Ref: <strong className="text-slate-700 font-mono">{record.docRefNumber}</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/legal/other-documents">
              <button
                type="button"
                className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[12.5px] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} /> Back
              </button>
            </Link>
            <Link to={`/legal/other-documents/${record.id}/edit`}>
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

      {/* Grid: Site Information & Document Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Site Details */}
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
              <span className="text-slate-500">ATM Model:</span>
              <span className="text-slate-700">{record.model}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Mobile Number:</span>
              <span className="font-mono text-slate-700">{record.mobileNumber}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Document Registration Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 text-[14px] font-bold text-slate-900">
            <FolderOpen size={16} className="text-[#0066FF]" />
            <h2>Document Registration Details</h2>
          </div>

          <div className="space-y-2.5 text-[12.5px]">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Category:</span>
              <span className="font-semibold text-slate-800">{record.category}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Reference Number:</span>
              <span className="font-mono text-slate-800 font-semibold">{record.docRefNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Issuing Authority:</span>
              <span className="text-slate-800">{record.issuingAuthority}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Issue Date:</span>
              <span className="font-medium text-slate-800">{record.issueDate}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Expiry Date:</span>
              <span className="font-medium text-slate-800">{record.expiryDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Files & Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 3: Uploaded Files */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 text-[14px] font-bold text-slate-900">
            <FileText size={16} className="text-[#0066FF]" />
            <h2>Attached Documents ({record.documents.length})</h2>
          </div>

          <div className="space-y-2.5">
            {record.documents.map((doc, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-[12px]"
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
            ))}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[12px]">
              <span className="text-slate-500">Verified By Staff:</span>
              <span className="font-semibold text-slate-800">{record.verifiedBy}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-slate-500">Verification Date:</span>
              <span className="text-slate-700">{record.verificationDate}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Remarks & Audit */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 text-[14px] font-bold text-slate-900">
              <ShieldCheck size={16} className="text-[#0066FF]" />
              <h2>Remarks & Verification Audit</h2>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[12.5px] text-slate-700 min-h-[75px]">
              {record.remark || 'No remarks recorded for this document.'}
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
