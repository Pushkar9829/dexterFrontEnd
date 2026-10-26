import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  Building2,
  Calendar,
  FileText,
  MessageSquare,
  ArrowLeft,
  Edit3,
  Download,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { getPvcRecord, type PvcStatus } from '@/data/legalPvc'
import { toast } from '@/components/ui/Toast'

export default function PvcRecord() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const record = id ? getPvcRecord(id) : undefined

  if (!record) {
    return (
      <div className="max-w-[1040px] mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">PVC Record Not Found</h2>
        <p className="text-sm text-slate-500">The requested PVC record does not exist or has been removed.</p>
        <Link
          to="/legal/pvc"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0066FF] text-white text-sm font-medium"
        >
          <ArrowLeft size={16} /> Back to PVC List
        </Link>
      </div>
    )
  }

  const renderStatusBadge = (status: PvcStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-semibold bg-[#D1FADF] text-[#027A48] border border-[#A6F4C5]">
            <CheckCircle2 size={13} /> Active
          </span>
        )
      case 'Pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold bg-[#FEF0C7] text-[#B54708] border border-[#FEDF89]">
            Pending
          </span>
        )
      case 'Not Generated':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold bg-[#FEE4E2] text-[#B42318] border border-[#FECDCA]">
            Not Generated
          </span>
        )
      case 'Signature Pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold bg-[#F4EBFF] text-[#6941C6] border border-[#E9D7FE]">
            Signature Pending
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        )
    }
  }

  const handleDownload = () => {
    toast(`Downloading document: ${record.fileName || 'PVC_Certificate.pdf'}`)
  }

  return (
    <div className="max-w-[1320px] mx-auto pb-16 space-y-4">
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
        <Link to="/legal/pvc" className="text-slate-500 hover:text-[#0066FF] transition-colors">
          PVC
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="font-semibold text-slate-800">{record.siteId}</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              PVC Details — {record.siteId}
            </h1>
            {renderStatusBadge(record.status)}
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Police Verification Certificate (PVC) information and attached records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to={`/legal/pvc/${record.id}/edit`}>
            <button
              type="button"
              className="h-9 px-4 rounded-lg bg-[#0066FF] hover:bg-blue-700 text-white font-medium text-[13px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Edit3 size={15} /> Edit Record
            </button>
          </Link>
          <button
            type="button"
            onClick={() => navigate('/legal/pvc')}
            className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium text-[13px] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft size={15} /> Back to List
          </button>
        </div>
      </div>

      {/* CARD 1: Site Details */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Building2 size={20} />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-slate-900 leading-tight">Site Details</h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Associated franchise and site profile details.
            </p>
          </div>
        </div>

        {/* 6 Grid items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <div className="text-[11.5px] font-semibold text-slate-500 mb-1">Site ID</div>
            <div className="h-10 px-3.5 rounded-xl bg-[#F0F5FA] border border-[#E2ECF8] text-[12.5px] font-medium text-slate-800 flex items-center truncate">
              {record.siteId}
            </div>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold text-slate-500 mb-1">ATM ID</div>
            <div className="h-10 px-3.5 rounded-xl bg-[#F0F5FA] border border-[#E2ECF8] text-[12.5px] font-medium text-slate-800 flex items-center truncate">
              {record.atmId}
            </div>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold text-slate-500 mb-1">Franchisee Name</div>
            <div className="h-10 px-3.5 rounded-xl bg-[#F0F5FA] border border-[#E2ECF8] text-[12.5px] font-medium text-slate-800 flex items-center truncate">
              {record.franchiseName}
            </div>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold text-slate-500 mb-1">Mobile Number</div>
            <div className="h-10 px-3.5 rounded-xl bg-[#F0F5FA] border border-[#E2ECF8] text-[12.5px] font-medium text-slate-800 flex items-center truncate">
              {record.mobileNumber}
            </div>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold text-slate-500 mb-1">Model</div>
            <div className="h-10 px-3.5 rounded-xl bg-[#F0F5FA] border border-[#E2ECF8] text-[12.5px] font-medium text-slate-800 flex items-center truncate">
              {record.model}
            </div>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold text-slate-500 mb-1">Email ID</div>
            <div className="h-10 px-3.5 rounded-xl bg-[#F0F5FA] border border-[#E2ECF8] text-[12.5px] font-medium text-slate-800 flex items-center truncate">
              {record.email}
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: Certificate Dates & Validity */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Calendar size={20} />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-slate-900 leading-tight">PVC Details</h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Issue and expiry validation timeline.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11.5px] font-semibold text-slate-500">PVC Issue Date</span>
            <div className="text-[15px] font-bold text-slate-800 mt-1">{record.pvcDate}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11.5px] font-semibold text-slate-500">Expiry Date</span>
            <div className="text-[15px] font-bold text-slate-800 mt-1">{record.expiryDate}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11.5px] font-semibold text-slate-500">Verification Status</span>
            <div className="mt-1">{renderStatusBadge(record.status)}</div>
          </div>
        </div>
      </div>

      {/* CARD 3: Attached Document */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-slate-900 leading-tight">PVC Document</h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Uploaded police verification certificate file.
            </p>
          </div>
        </div>

        {record.fileName ? (
          <div className="p-4 rounded-xl border border-blue-200 bg-[#F7FAFD] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0066FF]">
                <FileText size={22} />
              </div>
              <div>
                <div className="text-[13.5px] font-bold text-slate-900">{record.fileName}</div>
                <div className="text-[12px] text-slate-500">
                  {((record.fileSizeKb || 1420) / 1024).toFixed(2)} MB · Official certificate
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="h-8.5 px-3.5 rounded-lg bg-[#0066FF] hover:bg-blue-700 text-white font-medium text-[12px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Download size={14} /> Download File
            </button>
          </div>
        ) : (
          <div className="p-6 rounded-xl border-2 border-dashed border-slate-200 text-center text-slate-400 text-sm">
            No document has been uploaded for this record yet.
          </div>
        )}
      </div>

      {/* CARD 4: Remarks */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-slate-900 leading-tight">Remarks</h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Additional notes and verification remarks.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-slate-200 text-[13px] text-slate-700">
          {record.remark && record.remark !== '-' ? record.remark : 'No remarks provided.'}
        </div>
      </div>
    </div>
  )
}
