import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextAreaField } from '@/components/ui/Form'

/** Confirm dialog with a remark / reason; `required` blocks confirm until a reason is entered. */
export function ReasonModal({
  title, sub, required, label = 'Reason', confirmLabel, danger, onConfirm, onClose,
}: { title: string; sub?: string; required?: boolean; label?: string; confirmLabel: string; danger?: boolean; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const confirm = () => {
    if (required && reason.trim().length < 5) {
      setError('Enter a reason (at least 5 characters)')
      return
    }
    onConfirm(reason.trim())
  }
  return (
    <Modal
      title={title}
      sub={sub}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={confirm}>{confirmLabel}</Button>
        </>
      }
    >
      <TextAreaField
        label={label}
        required={required}
        name="decision-reason"
        value={reason}
        error={error}
        onChange={(e) => {
          setReason(e.target.value)
          if (error) setError('')
        }}
        placeholder={required ? 'Mandatory' : 'Optional'}
      />
    </Modal>
  )
}
