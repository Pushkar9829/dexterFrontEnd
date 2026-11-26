import { Badge, toneFor } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import type { EmailLog as Mail } from '@/data/workflow'
import { BTN_PRIMARY } from './ui'
import { fmtDT } from './helpers'

export function MailModal({ mail, onClose }: { mail: Mail; onClose: () => void }) {
  return (
    <Modal title={mail.subject} sub={`${mail.id} · ${fmtDT(mail.at)}`} onClose={onClose} width={640} footer={<button type="button" className={BTN_PRIMARY} onClick={onClose}>Close</button>}>
      <dl className="grid grid-cols-[100px_1fr] gap-y-1.5 text-[12px]">
        <dt className="font-semibold text-slate-500">Status</dt><dd><Badge tone={toneFor(mail.status)}>{mail.status}</Badge></dd>
        <dt className="font-semibold text-slate-500">Template</dt><dd>{mail.templateCode} · v{mail.templateVersion}</dd>
        <dt className="font-semibold text-slate-500">Module / event</dt><dd>{mail.module} · {mail.event}</dd>
        <dt className="font-semibold text-slate-500">Record</dt><dd>{mail.refId}{mail.taskId ? ` · Task ${mail.taskId}` : ''}</dd>
        <dt className="font-semibold text-slate-500">To</dt><dd>{mail.to.join(', ') || '—'}</dd>
        <dt className="font-semibold text-slate-500">CC</dt><dd>{mail.cc.join(', ') || '—'}</dd>
      </dl>
      <pre className="mt-3 rounded-lg bg-slate-50 p-3 font-sans text-[12px] whitespace-pre-wrap text-slate-700">{mail.body}</pre>
    </Modal>
  )
}
