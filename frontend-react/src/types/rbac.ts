export type UserRole = 'root' | 'master' | 'gerente' | 'supervisor' | 'tecnico'

export interface RolePermission {
  id: string
  name: string
  description: string
  category: 'system' | 'organization' | 'devices' | 'security' | 'operations'
}

export interface UserProfileData {
  id: string
  name: string
  surname: string
  email: string
  role: UserRole
  roleTitle: string
  sector: string
  phone: string
  avatarInitials: string
  twoFactorEnabled: boolean
  memberSince: string
  lastAccess: string
  sessionsCount: number
  ipAddress: string
  badgeTone: 'red' | 'amber' | 'blue' | 'cyan' | 'green'
  description: string
  permissions: string[]
  accessibleModules: string[]
}
