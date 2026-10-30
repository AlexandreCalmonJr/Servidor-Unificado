import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName, StatusTone } from '../types'

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`logo ${dark ? 'logo-dark' : ''}`}>
      <span className="logo-mark">
        <span />
      </span>
      <strong>Novara</strong>
      <em>MDM</em>
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  icon,
  onClick,
  className = '',
  disabled = false,
  type = 'button',
  title,
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  icon?: IconName
  onClick?: () => void
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  title?: string
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {icon && <Icon name={icon} size={17} />}
      <span>{children}</span>
    </button>
  )
}

export function Status({
  tone,
  children,
}: {
  tone: StatusTone
  children: ReactNode
}) {
  return (
    <span className={`status status-${tone}`}>
      <i />
      {children}
    </span>
  )
}

export function MetricCard({
  label,
  value,
  delta = '',
  icon = 'pulse',
  tone = 'positive',
  detail = '',
}: {
  label: string
  value: string | number
  delta?: string
  icon?: IconName
  tone?: string
  detail?: string
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon name={icon} />
      </div>
      <div className="metric-copy">
        <p>{label}</p>
        <strong>{value}</strong>
        <small>
          <span>{delta}</span> {detail}
        </small>
      </div>
      <button className="card-more" aria-label="Opções">•••</button>
    </article>
  )
}

export function TableTools({
  placeholder = 'Buscar dispositivo...',
  value,
  onChange,
  onFilterClick,
}: {
  placeholder?: string
  value?: string
  onChange?: (val: string) => void
  onFilterClick?: () => void
}) {
  return (
    <div className="table-tools">
      <label className="search table-search">
        <Icon name="search" />
        <input
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </label>
      <Button variant="secondary" icon="filter" onClick={onFilterClick}>
        Filtros
      </Button>
    </div>
  )
}
