import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import type { IconName } from '../types'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: string
  icon?: IconName
  iconColor?: string
  maxWidth?: number | string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconColor = 'blue',
  maxWidth = 520,
  children,
  footer,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Gerenciamento de teclado: ESC para fechar + Focus Trap acessível
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (!firstElement) return

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Foca o primeiro elemento interativo ao abrir
    const timer = setTimeout(() => {
      const firstInteractive = modalRef.current?.querySelector<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])'
      )
      firstInteractive?.focus()
    }, 50)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [isOpen, onClose])

  // Trava scroll da página de forma segura com restauração do valor anterior
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  const modalContent = (
    <div
      className="unified-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unified-modal-title"
    >
      <div
        ref={modalRef}
        className="unified-modal-content"
        style={{ maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="unified-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {icon && (
              <span className={`module-icon ${iconColor}`} style={{ width: '34px', height: '34px' }}>
                <Icon name={icon} size={18} />
              </span>
            )}
            <div>
              <h3
                id="unified-modal-title"
                style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}
              >
                {title}
              </h3>
              {subtitle && (
                <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            className="unified-modal-close"
            onClick={onClose}
            aria-label="Fechar janela"
            type="button"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="unified-modal-body">{children}</div>

        {footer && <div className="unified-modal-footer">{footer}</div>}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
