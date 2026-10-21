import { useRef } from 'react'
import { FileText, Paperclip, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fmtSize } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { dmy, parseAttachment, type Attachment, type Row } from '@/data/reportsFinancial'

/** Overage deposit "Attached" cell: Upload / Replace / Remove in edit mode, open the file in view mode. */
export function AttachCell({ row, editing, onChange, onView }: { row: Row; editing: boolean; onChange: (v: string) => void; onView: (a: Attachment) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const att = parseAttachment(row.attached)
  const take = (f?: File) => {
    if (!f) return
    if (f.size > 5 * 1024 * 1024) return toast('Attachment must be 5 MB or smaller', 'info')
    const base: Attachment = { name: f.name, size: f.size, uploadedAt: new Date().toISOString().slice(0, 10), by: 'Paras Dubey' }
    if (f.size > 300 * 1024) return onChange(JSON.stringify(base))
    const reader = new FileReader()
    reader.onload = () => onChange(JSON.stringify({ ...base, dataUrl: String(reader.result) }))
    reader.readAsDataURL(f)
  }
  if (editing)
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        {att && (
          <span className="flex min-w-0 flex-1 items-center gap-1 text-[11px] text-ink-2" title={att.name}>
            <Paperclip size={12} className="shrink-0" /> <span className="truncate">{att.name}</span>
          </span>
        )}
        <button type="button" onClick={() => ref.current?.click()} className="flex shrink-0 items-center gap-1 rounded-md border border-line bg-white px-1.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary-soft">
          <Upload size={12} /> {att ? 'Replace' : 'Upload'}
        </button>
        {att && (
          <button type="button" onClick={() => onChange('')} aria-label="Remove attachment" className="text-muted hover:text-brand-red">
            <X size={13} />
          </button>
        )}
        <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => take(e.target.files?.[0])} />
      </span>
    )
  if (!att) return <span className="text-muted">Not attached</span>
  return (
    <button type="button" onClick={() => onView(att)} title={att.name} className="flex max-w-full items-center gap-1 text-[11px] font-medium text-primary hover:underline">
      <Paperclip size={12} className="shrink-0" /> <span className="truncate">{att.name}</span>
    </button>
  )
}

export function AttachmentModal({ file, onClose }: { file: Attachment; onClose: () => void }) {
  return (
    <Modal
      title={file.name}
      sub={`${file.size ? fmtSize(file.size) : 'Size unknown'}${file.uploadedAt ? ` · uploaded ${dmy(file.uploadedAt)}` : ''}${file.by ? ` by ${file.by}` : ''}`}
      onClose={onClose}
      width={720}
      footer={
        <>
          {file.dataUrl && (
            <a href={file.dataUrl} download={file.name} className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-[13px] font-semibold hover:bg-surface">
              Download
            </a>
          )}
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      {file.dataUrl?.startsWith('data:image') ? (
        <img src={file.dataUrl} alt={file.name} className="mx-auto max-h-[60vh] rounded-lg border border-line" />
      ) : file.dataUrl?.startsWith('data:application/pdf') ? (
        <object data={file.dataUrl} type="application/pdf" className="h-[60vh] w-full rounded-lg border border-line">
          <p className="p-4 text-[13px] text-muted">PDF preview is not supported in this browser — use Download.</p>
        </object>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-5 text-[13px]">
          <FileText size={28} className="text-primary" />
          <div>
            <div className="font-semibold text-ink">{file.name}</div>
            <div className="text-muted">
              {file.dataUrl ? 'This file type cannot be previewed — use Download.' : 'Stored file reference. Files larger than 300 KB and imported records keep metadata only until the document service is connected.'}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
