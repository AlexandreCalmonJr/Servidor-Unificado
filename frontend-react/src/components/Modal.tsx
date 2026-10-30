import { useEffect, type ReactNode } from 'react'
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
  // Fecha ao pressionar tecla ESC
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Trava scroll da página quando o modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="unified-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
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
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
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
}
