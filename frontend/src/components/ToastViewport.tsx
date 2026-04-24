import { createPortal } from 'react-dom'

type ToastMessage = {
  id: number
  message: string
}

type ToastViewportProps = {
  toasts: ToastMessage[]
  onDismiss: (id: number) => void
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) {
    return null
  }

  return createPortal(
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <button
          type="button"
          className="toast-message"
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
        >
          {toast.message}
        </button>
      ))}
    </div>,
    document.body,
  )
}
