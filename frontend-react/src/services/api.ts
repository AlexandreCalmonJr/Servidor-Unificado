// Serviço unificado de requisições com segurança de tokens e timeout defensivo
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

const TOKEN_SESSION_KEY = 'NOVARA_MDM_SESSION_TOKEN'
let inMemoryToken: string | null = null

export const authStorage = {
  getToken: (): string | null => {
    if (inMemoryToken) return inMemoryToken
    try {
      return sessionStorage.getItem(TOKEN_SESSION_KEY)
    } catch {
      return null
    }
  },
  setToken: (token: string) => {
    inMemoryToken = token
    try {
      sessionStorage.setItem(TOKEN_SESSION_KEY, token)
    } catch {
      // Falha silenciosa em navegadores com storage restrito
    }
  },
  clearToken: () => {
    inMemoryToken = null
    try {
      sessionStorage.removeItem(TOKEN_SESSION_KEY)
    } catch {
      // Ignora erro de storage
    }
  },
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number
}

export async function request<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeoutMs = 10000, headers: customHeaders, ...fetchOptions } = options
  const token = authStorage.getToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(customHeaders || {}),
  }

  // AbortController para prevenir requisições pendentes infinitas / DoS de conexões
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(endpoint, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })

    if (response.status === 401) {
      authStorage.clearToken()
    }

    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: 'Erro desconhecido na resposta do servidor' }))
      throw new Error(errorBody.message || `Erro HTTP ${response.status}`)
    }

    return (await response.json()) as T
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Tempo limite de requisição excedido (${timeoutMs / 1000}s)`)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  // Autenticação
  login: (credentials: { username?: string; email?: string; password?: string }) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  // Dispositivos
  getDevices: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return request(`/api/devices?${query}`)
  },
  getDeviceById: (id: string) => request(`/api/devices/${id}`),

  // Comandos
  executeCommand: (payload: { deviceId: string; command: string; script?: string }) =>
    request('/api/commands', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Totens
  getTotems: () => request('/api/monitoring/totems'),

  // Impressoras
  getPrinters: () => request('/api/printers'),
  syncPrinter: (id: string) =>
    request(`/api/printers/${id}/sync`, {
      method: 'POST',
    }),

  // Diagnóstico
  runDiagnostic: () => request('/api/diagnostic'),

  // Status do servidor
  getServerHealth: () => request('/health'),
}
