// Serviço unificado de requisições com token JWT
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

const TOKEN_KEY = 'NOVARA_MDM_TOKEN'

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
}

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = authStorage.getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    // Redirecionamento ou emissão de evento de logout
    authStorage.clearToken()
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
    throw new Error(errorBody.message || `Erro HTTP ${response.status}`)
  }

  return response.json()
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
