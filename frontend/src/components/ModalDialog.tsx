import type { ReactNode } from 'react'

type ModalDialogProps = {
  title: string
  description?: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  confirmTone?: 'default' | 'danger'
  isBusy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ModalDialog({
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmTone = 'default',
  isBusy = false,
  onConfirm,
  onCancel,
}: ModalDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-dialog__header">
          <h3 id="modal-title">{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>

        {children ? <div className="modal-dialog__body">{children}</div> : null}

        <div className="modal-dialog__actions">
          <button
            type="button"
            className="modal-dialog__button"
            onClick={onCancel}
            disabled={isBusy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`modal-dialog__button modal-dialog__button--${confirmTone}`}
            onClick={onConfirm}
            disabled={isBusy}
          >
            {isBusy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
