import { useState, useMemo } from 'react'
import {
  CheckCircle2,
  Radio,
} from 'lucide-react'
import {
  useBroadcasts,
  approveBroadcast,
  rejectBroadcast,
  requestChangesBroadcast,
} from '@/data/broadcasts'
import { PriorityBadge } from './BroadcastOverview'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

export default function BroadcastApprovalQueue() {
  const { broadcasts } = useBroadcasts()
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'changes'>('pending')

  // Selected item for live preview on right matching Image 5
  const [selectedId, setSelectedId] = useState<string>('BR-2611-1150')
  const [remarks, setRemarks] = useState('')

  const pendingList = useMemo(() => {
    return broadcasts.filter((b) => b.status === 'Pending Approval')
  }, [broadcasts])

  const approvedList = useMemo(() => {
    return broadcasts.filter((b) => b.status === 'Published' || b.status === 'Approved')
  }, [broadcasts])

  const rejectedList = useMemo(() => {
    return broadcasts.filter((b) => b.status === 'Rejected')
  }, [broadcasts])

  const changesList = useMemo(() => {
    return broadcasts.filter((b) => b.status === 'Changes Requested')
  }, [broadcasts])

  const currentList =
    activeTab === 'pending'
      ? pendingList
      : activeTab === 'approved'
      ? approvedList
      : activeTab === 'rejected'
      ? rejectedList
      : changesList

  // Find currently selected broadcast for the right card
  const selectedItem =
    broadcasts.find((b) => b.id === selectedId) ||
    currentList[0] ||
    broadcasts[0]

  const handleApprove = (id: string) => {
    approveBroadcast(id, remarks)
    toast(`Approved & published broadcast ${id}`, 'success')
    setRemarks('')
  }

  const handleReject = (id: string) => {
    rejectBroadcast(id, remarks)
    toast(`Rejected broadcast ${id}`, 'info')
    setRemarks('')
  }

  const handleRequestChanges = (id: string) => {
    requestChangesBroadcast(id, remarks || 'Please revise the recipient list and confirmation cutoff time.')
    toast(`Sent change request for ${id} to author`, 'info')
    setRemarks('')
  }

  const handleBulkApprove = () => {
    pendingList.forEach((b) => approveBroadcast(b.id, 'Bulk approved by HOD'))
    toast(`Bulk approved ${pendingList.length} broadcasts`, 'success')
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header matching Image 5 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100/70 text-[#0066FF]">
            <Radio size={20} className="text-[#0066FF]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Approval Queue</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBulkApprove}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all"
        >
          <CheckCircle2 size={14} className="text-[#0066FF]" />
          <span>Bulk Approve</span>
        </button>
      </div>

      {/* Tabs Bar matching Image 5 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={cn(
            'rounded-xl px-4 py-2 text-xs font-semibold transition-all border shadow-2xs',
            activeTab === 'pending'
              ? 'bg-[#0066FF] text-white border-[#0066FF]'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          )}
        >
          <span>Pending</span>
          <span className={cn('ml-1.5', activeTab === 'pending' ? 'text-blue-100' : 'text-slate-500')}>
            (7)
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('approved')}
          className={cn(
            'rounded-xl px-4 py-2 text-xs font-semibold transition-all border shadow-2xs',
            activeTab === 'approved'
              ? 'bg-[#0066FF] text-white border-[#0066FF]'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          )}
        >
          <span>Approved</span>
          <span className={cn('ml-1.5', activeTab === 'approved' ? 'text-blue-100' : 'text-slate-500')}>
            (412)
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rejected')}
          className={cn(
            'rounded-xl px-4 py-2 text-xs font-semibold transition-all border shadow-2xs',
            activeTab === 'rejected'
              ? 'bg-[#0066FF] text-white border-[#0066FF]'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          )}
        >
          <span>Rejected</span>
          <span className={cn('ml-1.5', activeTab === 'rejected' ? 'text-blue-100' : 'text-slate-500')}>
            (92)
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('changes')}
          className={cn(
            'rounded-xl px-4 py-2 text-xs font-semibold transition-all border shadow-2xs',
            activeTab === 'changes'
              ? 'bg-[#0066FF] text-white border-[#0066FF]'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          )}
        >
          <span>Changes Requested</span>
          <span className={cn('ml-1.5', activeTab === 'changes' ? 'text-blue-100' : 'text-slate-500')}>
            (11)
          </span>
        </button>
      </div>

      {/* 2 Columns: Table on Left + Preview & Approval Flow on Right matching Image 5 */}
      <div className="flex flex-col xl:flex-row gap-5 items-start">
        {/* Left Column: Queue Table */}
        <div className="flex-1 min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2 px-2.5 w-[85px] whitespace-nowrap">ID</th>
                  <th className="py-2 px-2.5 min-w-[120px]">Title</th>
                  <th className="py-2 px-2 w-[85px] whitespace-nowrap">Created By</th>
                  <th className="py-2 px-2 w-[90px] whitespace-nowrap">Audience</th>
                  <th className="py-2 px-1.5 w-[75px] text-center whitespace-nowrap">Priority</th>
                  <th className="py-2 px-1.5 w-[70px] text-center whitespace-nowrap">Submitted</th>
                  <th className="py-2 px-1.5 w-[70px] text-center whitespace-nowrap">Status</th>
                  <th className="py-2 px-2.5 text-center whitespace-nowrap w-[130px] min-w-[130px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {currentList.map((item) => {
                  const isRowActive = item.id === selectedId
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isRowActive ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'
                      )}
                    >
                      <td className="py-2 px-2.5 font-mono font-semibold text-[#0066FF] whitespace-nowrap text-[11px]">
                        {item.id}
                      </td>
                      <td className="py-2 px-2.5 max-w-[160px]">
                        <p className="font-semibold text-slate-900 truncate text-[11.5px]" title={item.title}>
                          {item.title}
                        </p>
                      </td>
                      <td className="py-2 px-2 text-slate-600 whitespace-nowrap text-[11px]">{item.createdBy}</td>
                      <td className="py-2 px-2 text-slate-700 whitespace-nowrap text-[11px]">{item.audience}</td>
                      <td className="py-2 px-1.5 text-center whitespace-nowrap">
                        <PriorityBadge priority={item.priority} />
                      </td>
                      <td className="py-2 px-1.5 text-center text-slate-500 whitespace-nowrap text-[10.5px]">{item.submittedAt}</td>
                      <td className="py-2 px-1.5 text-center whitespace-nowrap">
                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-800 border border-amber-200">
                          {item.status === 'Pending Approval' ? 'Pending' : item.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 text-center whitespace-nowrap w-[130px] min-w-[130px]" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleApprove(item.id)}
                            className="rounded-md bg-[#0066FF] hover:bg-blue-700 px-2.5 py-0.5 text-[10.5px] font-semibold text-white transition-all shadow-2xs whitespace-nowrap"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(item.id)}
                            className="rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2 py-0.5 text-[10.5px] font-semibold text-slate-700 transition-all shadow-2xs whitespace-nowrap"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Live Preview & Approval Flow matching Image 5 (compact sidecard) */}
        <div className="w-full xl:w-[320px] shrink-0 space-y-5">
          {/* Card 1: Live Preview - [ID] */}
          {selectedItem && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#0066FF]" />
                <h3 className="text-xs font-bold text-slate-900">
                  Preview – {selectedItem.id}
                </h3>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900">{selectedItem.title}</h4>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10.5px] font-bold text-rose-700 border border-rose-200">
                    {selectedItem.priority}
                  </span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10.5px] font-bold text-blue-700 border border-blue-200">
                    {selectedItem.recipientsCount} recipients
                  </span>
                  {selectedItem.ackRequired && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10.5px] font-bold text-blue-700 border border-blue-200">
                      Ack required
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs text-slate-700 leading-relaxed font-normal">
                {selectedItem.message}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Reviewer remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add remarks..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] shadow-2xs resize-none"
                />
              </div>

              {/* Action Buttons matching Image 5 */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleApprove(selectedItem.id)}
                  className="flex-1 rounded-xl bg-[#0066FF] hover:bg-blue-700 py-2 px-3 text-xs font-semibold text-white text-center shadow-xs transition-all"
                >
                  Approve & Publish
                </button>
                <button
                  type="button"
                  onClick={() => handleRequestChanges(selectedItem.id)}
                  className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 shadow-2xs transition-all"
                >
                  Request Changes
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(selectedItem.id)}
                  className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 shadow-2xs transition-all"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Card 2: Approval Flow matching Image 5 */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#0066FF]" />
              <h3 className="text-xs font-bold text-slate-900">Approval Flow</h3>
            </div>

            <div className="flex items-center justify-between gap-1 text-[11px] pt-1">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800 border border-emerald-200">
                Created
              </span>
              <span className="text-slate-400">→</span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-800 border border-amber-200">
                HOD Review
              </span>
              <span className="text-slate-400">→</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 border border-slate-200">
                Admin Approval
              </span>
              <span className="text-slate-400">→</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 border border-slate-200">
                Published
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
