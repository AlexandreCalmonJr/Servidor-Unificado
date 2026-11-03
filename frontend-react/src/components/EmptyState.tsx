import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from '../types'

interface EmptyStateProps {
  icon?: IconName
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({
  icon = 'search',
  title,
  description = 'Nenhum registro encontrado para os critérios selecionados.',
  action,
}: EmptyStateProps) {
  return (
    <div
      style={{
        padding: '48px 20px',
        textAlign: 'center',
        background: 'var(--surface)',
        borderRadius: '12px',
        border: '1px dashed var(--line)',
        margin: '16px 0',
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: 'var(--canvas)',
          color: 'var(--muted)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
        }}
      >
        <Icon name={icon} size={20} />
      </div>

      <h4
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--ink)',
          margin: '0 0 6px',
        }}
      >
        {title}
      </h4>

      {description && (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--muted)',
            margin: '0 auto 16px',
            maxWidth: '380px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}

      {action && <div>{action}</div>}
    </div>
  )
}

