// Item-wise photo evidence for Site Installation (Project spec §5.4, §5.6).
// Every photo is linked to its Site ID + stage + checklist item. CRM can view, accept, reject (with a
// correction reason sent to the franchise), replace or soft-delete — the original upload, uploader,
// timestamp and action history are always retained.
import { useRef, useState, type ReactNode } from 'react'
import { Check, History, ImagePlus, MapPin, RefreshCw, Trash2, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextAreaField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { activePhotos, addPhoto, deletePhoto, itemLabel, mockGps, readImage, reviewPhoto, type InstallPhoto, type InstallRecord, type PhotoStage } from '@/data/siteInstallation'
import { fmtDT } from './format'

const REVIEW_CLS: Record<InstallPhoto['review'], string> = {
  'Pending Review': 'bg-amber-500',
  Accepted: 'bg-emerald-600',
  Rejected: 'bg-red-600',
}
const REJECT_REASONS = ['Blurred / not readable', 'Irrelevant to this item', 'Duplicate photo', 'Wrong category', 'GPS location missing / mismatch']

export function PhotoStrip({ r, stage, itemKey, canReview, canUpload }: { r: InstallRecord; stage: PhotoStage; itemKey: string; canReview: boolean; canUpload: boolean }) {
  const photos = activePhotos(r, stage, itemKey)
  const removed = r.photos.filter((p) => p.stage === stage && p.itemKey === itemKey && (p.deleted || p.replacedById))
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceFor = useRef<string | undefined>(undefined)
  const [dialog, setDialog] = useState<{ kind: 'reject' | 'delete'; photo: InstallPhoto } | null>(null)
  const [view, setView] = useState<InstallPhoto | null>(null)
  const [showAudit, setShowAudit] = useState(false)

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const replaces = replaceFor.current
    replaceFor.current = undefined
    let ok = 0
    for (const file of Array.from(files).slice(0, replaces ? 1 : 10)) {
      const dataUrl = await readImage(file)
      const res = addPhoto(r.id, { stage, itemKey, name: file.name, dataUrl, source: 'CRM Upload', gps: mockGps(), role: 'CRM', replacesId: replaces, file })
      if (res.ok) ok++
      else toast(res.error, 'error')
    }
    if (ok) toast(replaces ? 'Photo replaced — original kept in the audit log' : `${ok} photo(s) uploaded and linked to ${r.siteId} · ${itemLabel(stage, itemKey)}`)
    if (fileRef.current) fileRef.current.value = ''
  }
  const accept = (p: InstallPhoto) => {
    const res = reviewPhoto(r.id, p.id, 'Accepted')
    toast(res.ok ? 'Photo accepted' : res.error, res.ok ? 'success' : 'error')
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {photos.map((p) => (
          <div key={p.id} className="group relative">
            <button type="button" onClick={() => setView(p)} className="block h-12 w-16 overflow-hidden rounded-md border border-line" title={`${p.name} · ${p.review}`}>
              <img src={p.dataUrl} alt={p.name} className="h-full w-full object-cover" />
            </button>
            <span className={cn('absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white', REVIEW_CLS[p.review])} title={p.review} />
            {canReview && (
              <div className="absolute inset-x-0 bottom-0 hidden justify-center gap-0.5 bg-black/55 py-0.5 group-hover:flex">
                {p.review !== 'Accepted' && (
                  <button type="button" aria-label="Accept photo" title="Accept" onClick={() => accept(p)} className="text-white hover:text-emerald-300">
                    <Check size={12} />
                  </button>
                )}
                {p.review !== 'Rejected' && (
                  <button type="button" aria-label="Reject photo" title="Reject" onClick={() => setDialog({ kind: 'reject', photo: p })} className="text-white hover:text-red-300">
                    <X size={12} />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Replace photo"
                  title="Replace"
                  onClick={() => {
                    replaceFor.current = p.id
                    fileRef.current?.click()
                  }}
                  className="text-white hover:text-sky-300"
                >
                  <RefreshCw size={12} />
                </button>
                <button type="button" aria-label="Delete photo" title="Delete" onClick={() => setDialog({ kind: 'delete', photo: p })} className="text-white hover:text-red-300">
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
        {canUpload && (
          <button
            type="button"
            onClick={() => {
              replaceFor.current = undefined
              fileRef.current?.click()
            }}
            className="grid h-12 w-12 place-items-center rounded-md border border-dashed border-line text-muted hover:border-primary hover:text-primary"
            aria-label="Upload photos"
            title="Upload photos (multiple)"
          >
            <ImagePlus size={16} />
          </button>
        )}
        {!photos.length && !canUpload && <span className="text-[11px] text-muted">No photos</span>}
        {removed.length > 0 && (
          <button type="button" onClick={() => setShowAudit((v) => !v)} className="ml-1 inline-flex items-center gap-0.5 text-[10.5px] text-muted hover:text-primary">
            <History size={11} /> {removed.length} removed
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
      </div>
      {photos.some((p) => p.review === 'Rejected') && (
        <p className="mt-1 text-[10.5px] text-red-600">Rejected: {photos.find((p) => p.review === 'Rejected')?.rejectReason}</p>
      )}
      {showAudit && (
        <ul className="mt-1.5 space-y-1 rounded-md bg-surface p-2 text-[10.5px] text-ink-2">
          {removed.map((p) => (
            <li key={p.id}>
              <span className="font-semibold">{p.name}</span> — uploaded by {p.uploadedBy} ({p.source}) {fmtDT(p.uploadedAt)} ·{' '}
              {p.deleted ? `deleted by ${p.deleted.by} ${fmtDT(p.deleted.at)}: ${p.deleted.reason}` : `replaced by ${p.replacedById}`}
            </li>
          ))}
        </ul>
      )}

      {dialog && <ReasonDialog r={r} dialog={dialog} onClose={() => setDialog(null)} />}
      {view && (
        <Modal title={view.name} sub={`${r.siteId} · ${itemLabel(view.stage, view.itemKey)}`} onClose={() => setView(null)} width={560}>
          <img src={view.dataUrl} alt={view.name} className="mx-auto max-h-[340px] rounded-lg border border-line" />
          <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
            <Meta k="Uploaded by">{`${view.uploadedBy} (${view.uploadedByRole})`}</Meta>
            <Meta k="Uploaded at">{fmtDT(view.uploadedAt)}</Meta>
            <Meta k="Source">{view.source}</Meta>
            <Meta k="GPS">
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} /> {view.gps ?? '—'}
              </span>
            </Meta>
            <Meta k="Review">{view.review}</Meta>
            <Meta k="Reviewed by">{view.reviewedBy ? `${view.reviewedBy} · ${fmtDT(view.reviewedAt)}` : '—'}</Meta>
            {view.rejectReason && <Meta k="Rejection reason">{view.rejectReason}</Meta>}
            {view.replacesId && <Meta k="Replaces">{view.replacesId}</Meta>}
          </dl>
          <p className="mt-3 text-[10.5px] text-muted">AI image checks (blur, duplicate, wrong category) may assist in future; final acceptance or rejection is always by an authorized CRM Executive or Admin.</p>
        </Modal>
      )}
    </div>
  )
}

function Meta({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold text-muted">{k}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  )
}

function ReasonDialog({ r, dialog, onClose }: { r: InstallRecord; dialog: { kind: 'reject' | 'delete'; photo: InstallPhoto }; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const reject = dialog.kind === 'reject'
  const submit = () => {
    const res = reject ? reviewPhoto(r.id, dialog.photo.id, 'Rejected', reason) : deletePhoto(r.id, dialog.photo.id, reason)
    if (!res.ok) {
      toast(res.error, 'error')
      return
    }
    toast(reject ? 'Photo rejected — correction request sent to the franchise' : 'Photo deleted (soft delete) — original kept in the audit log')
    onClose()
  }
  return (
    <Modal
      title={reject ? 'Reject photo' : 'Delete photo'}
      sub={`${dialog.photo.name} · uploaded by ${dialog.photo.uploadedBy} ${fmtDT(dialog.photo.uploadedAt)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} disabled={!reason.trim()}>
            {reject ? 'Reject & request correction' : 'Delete'}
          </Button>
        </>
      }
    >
      {reject && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {REJECT_REASONS.map((x) => (
            <button key={x} type="button" onClick={() => setReason(x)} className={cn('rounded-full border px-2.5 py-1 text-[11px]', reason === x ? 'border-primary bg-primary-soft text-primary' : 'border-line text-ink-2')}>
              {x}
            </button>
          ))}
        </div>
      )}
      <TextAreaField label={reject ? 'Reason & correction request (sent to franchise)' : 'Reason for deletion'} required value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  )
}
