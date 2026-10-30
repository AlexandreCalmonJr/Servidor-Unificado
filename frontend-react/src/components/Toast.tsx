import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { Icon } from './Icon'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  message: string
  tone: ToastTone
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, tone?: ToastTone, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const showToast = (message: string, tone: ToastTone = 'success', duration = 3500) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6)
    const newToast: ToastItem = { id, message, tone, duration }
    setToasts((prev) => [...prev, newToast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  const success = (msg: string) => showToast(msg, 'success')
  const error = (msg: string) => showToast(msg, 'error')
  const warning = (msg: string) => showToast(msg, 'warning')
  const info = (msg: string) => showToast(msg, 'info')

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <aside className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div className={`toast-card toast-${t.tone}`} key={t.id}>
            <span className="toast-icon">
              <Icon
                name={
                  t.tone === 'success'
                    ? 'check'
                    : t.tone === 'error'
                    ? 'warning'
                    : t.tone === 'warning'
                    ? 'warning'
                    : 'pulse'
                }
                size={16}
              />
            </span>
            <p className="toast-msg">{t.message}</p>
            <button
              className="toast-close-btn"
              onClick={() => removeToast(t.id)}
              aria-label="Fechar notificação"
            >
              ✕
            </button>
          </div>
        ))}
      </aside>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback gracioso caso chamado fora do provider
    return {
      showToast: (m) => console.log(m),
      success: (m) => console.log(m),
      error: (m) => console.error(m),
      warning: (m) => console.warn(m),
      info: (m) => console.info(m),
    }
  }
  return ctx
}
