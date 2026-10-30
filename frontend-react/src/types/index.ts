import type { ReactNode } from 'react'

export type PageId =
  | 'dashboard'
  | 'assets'
  | 'device'
  | 'totems'
  | 'totemDetail'
  | 'printers'
  | 'printerDetail'
  | 'provisioning'
  | 'provisionQr'
  | 'commands'
  | 'diagnostics'
  | 'modules'
  | 'policies'
  | 'policyCreate'
  | 'groups'
  | 'groupDetail'
  | 'groupCreate'
  | 'groupRules'
  | 'catalog'
  | 'appCreate'
  | 'agent'
  | 'downloads'
  | 'mobile'
  | 'admin'
  | 'userCreate'
  | 'audit'
  | 'server'
  | 'reports'
  | 'profile'
  | 'iot'

export type IconName =
  | 'grid'
  | 'rocket'
  | 'blocks'
  | 'laptop'
  | 'shield'
  | 'agent'
  | 'user'
  | 'search'
  | 'bell'
  | 'plus'
  | 'arrow'
  | 'check'
  | 'clock'
  | 'warning'
  | 'download'
  | 'filter'
  | 'chevron'
  | 'lock'
  | 'menu'
  | 'close'
  | 'logout'
  | 'eye'
  | 'phone'
  | 'pulse'
  | 'server'
  | 'report'
  | 'terminal'
  | 'printer'
  | 'totem'
  | 'refresh'
  | 'sliders'
  | 'cpu'
  | 'trash'
  | 'edit'

export interface ModuleItem {
  id: string
  name: string
  desc: string
  icon: IconName
  enabled: boolean
  color: string
  stats: string
  pageId?: PageId
  section?: string
  badge?: number | string
  isCustom?: boolean
}

export type StatusTone = 'green' | 'amber' | 'red' | 'blue' | 'gray'

export interface DeviceItem {
  id: string
  name: string
  os: string
  owner: string
  status: string
  tone: StatusTone
  seen: string
  category?: 'desktop' | 'mobile' | 'totem' | 'printer'
  ip?: string
  serial?: string
  department?: string
  model?: string
}

export interface PrinterItem {
  id: string
  name: string
  model: string
  ip: string
  location: string
  status: 'Operacional' | 'Alerta' | 'Offline' | 'Toner Baixo'
  tone: StatusTone
  blackToner: number
  cyanToner: number
  magentaToner: number
  yellowToner: number
  drumLife: number
  paperStatus: 'Normal' | 'Baixo' | 'Vazio'
  queueCount: number
  totalPages: number
  lastCheck: string
}

export interface TotemItem {
  id: string
  unitName: string
  code: string
  location: string
  status: 'Online' | 'Alerta' | 'Offline' | 'Manutenção'
  tone: StatusTone
  os: string
  uptime: string
  peripherals: {
    touchScreen: boolean
    thermalPrinter: boolean
    pinpad: boolean
    barcodeScanner: boolean
  }
  lastPing: string
  cpuTemp: string
  ramUsage: string
}

export interface NavItem {
  id: PageId
  label: string
  icon: IconName
  section?: string
  badge?: number | string
}
