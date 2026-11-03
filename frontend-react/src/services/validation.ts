import { z } from 'zod'

/**
 * Validação de URLs seguras para prevenir injeção de esquemas maliciosos
 * (javascript:, data:, vbscript:)
 */
export function isSafeUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false
  const trimmed = rawUrl.trim()
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true

  try {
    const parsed = new URL(trimmed, window.location.origin)
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

export function sanitizeUrl(rawUrl: string, fallback = '#'): string {
  return isSafeUrl(rawUrl) ? rawUrl.trim() : fallback
}

/**
 * Esquema de validação para Login
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'O e-mail é obrigatório.')
    .email('Formato de e-mail inválido.')
    .max(120, 'O e-mail não pode exceder 120 caracteres.'),
  password: z
    .string()
    .min(6, 'A senha deve conter no mínimo 6 caracteres.')
    .max(64, 'A senha não pode exceder 64 caracteres.'),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Esquema para Comandos Remotos MDM
 * Previne command injection, bloqueando operadores de shell arbitrários
 */
export const commandPayloadSchema = z.object({
  deviceId: z
    .string()
    .trim()
    .min(1, 'ID do dispositivo é obrigatório.')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'ID do dispositivo inválido.'),
  command: z
    .string()
    .trim()
    .min(1, 'Comando é obrigatório.')
    .max(50, 'Nome de comando muito longo.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Nome de comando não permitido.'),
  script: z
    .string()
    .max(2000, 'Script não pode exceder 2.000 caracteres.')
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        // Bloqueia padrões óbvios de injeção destrutiva no cliente
        const forbiddenPatterns = [
          /rm\s+-rf\s+\//i,
          /format\s+[a-z]:/i,
          /drop\s+database/i,
          /<script\b/i,
        ]
        return !forbiddenPatterns.some((pattern) => pattern.test(val))
      },
      { message: 'Script contém instruções perigosas ou bloqueadas.' }
    ),
})

export type CommandPayloadInput = z.infer<typeof commandPayloadSchema>

/**
 * Esquema para Cadastro de Usuários
 */
export const userCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres.')
    .max(80, 'Nome muito longo.')
    .regex(/^[a-zA-ZÀ-ÿ\s.-]+$/, 'Nome contém caracteres inválidos.'),
  email: z
    .string()
    .trim()
    .email('E-mail corporativo inválido.')
    .max(120, 'E-mail muito longo.'),
  role: z.enum([
    'super_admin',
    'admin',
    'technician',
    'security_analyst',
    'viewer',
  ]),
  department: z.string().trim().max(60).optional(),
})

export type UserCreateInput = z.infer<typeof userCreateSchema>
