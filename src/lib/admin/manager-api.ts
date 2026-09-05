/**
 * Violet Manager API Client
 * Proxies all requests through Next.js /api/admin route
 * to the Flask backend at http://localhost:5001
 */

const API_BASE = '/api/admin'

class ApiError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

class ManagerApiClient {
  private token: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('vm_token')
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('vm_token', token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vm_token')
      localStorage.removeItem('vm_user')
    }
  }

  getUser() {
    if (typeof window === 'undefined') return null
    const u = localStorage.getItem('vm_user')
    return u ? JSON.parse(u) : null
  }

  setUser(user: Record<string, unknown>) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vm_user', JSON.stringify(user))
    }
  }

  isAdmin() {
    const user = this.getUser()
    return user?.role === 'admin'
  }

  isViewer() {
    const user = this.getUser()
    return user?.role === 'viewer'
  }

  private async request(
    path: string,
    options: RequestInit = {}
  ): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })

    if (res.status === 401) {
      this.clearToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login'
      }
      throw new ApiError('Unauthorized')
    }
    if (res.status === 403) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(body.error || 'Forbidden', body.code)
    }
    if (res.status === 404) {
      throw new ApiError('Not found')
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(body.error || `Request failed: ${res.status}`)
    }
    return res.json()
  }

  get(path: string, params?: Record<string, string | number | boolean>) {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
    ).toString() : ''
    return this.request(`${path}${qs}`)
  }

  post(path: string, body: Record<string, unknown>) {
    return this.request(path, { method: 'POST', body: JSON.stringify(body) })
  }

  put(path: string, body: Record<string, unknown>) {
    return this.request(path, { method: 'PUT', body: JSON.stringify(body) })
  }

  patch(path: string, body: Record<string, unknown>) {
    return this.request(path, { method: 'PATCH', body: JSON.stringify(body) })
  }

  del(path: string) {
    return this.request(path, { method: 'DELETE' })
  }
}

export const api = new ManagerApiClient()

// Auth
export const loginApi = (username: string, password: string) =>
  api.post('/auth/login', { username, password })
export const getMe = () => api.get('/auth/me')
export const listUsers = () => api.get('/auth/users')
export const registerUser = (data: Record<string, unknown>) => api.post('/auth/register', data)
export const updateUser = (id: number, data: Record<string, unknown>) => api.put(`/auth/users/${id}`, data)

// Bookings
export const listBookings = (params?: Record<string, string | number | boolean>) =>
  api.get('/bookings', params)
export const getBooking = (id: number) => api.get(`/bookings/${id}`)
export const createBooking = (data: Record<string, unknown>) => api.post('/bookings', data)
export const updateBooking = (id: number, data: Record<string, unknown>) =>
  api.put(`/bookings/${id}`, data)
export const deleteBooking = (id: number) => api.del(`/bookings/${id}`)
export const exportBookings = () => `${API_BASE}/bookings/export`

// Train Sales
export const listTrainSales = (params?: Record<string, string | number | boolean>) =>
  api.get('/train-sales', params)
export const createTrainSale = (data: Record<string, unknown>) => api.post('/train-sales', data)
export const updateTrainSale = (id: number, data: Record<string, unknown>) =>
  api.put(`/train-sales/${id}`, data)
export const deleteTrainSale = (id: number) => api.del(`/train-sales/${id}`)
export const exportTrainSales = () => `${API_BASE}/train-sales/export`

// Agent Sales
export const listAgentSales = (params?: Record<string, string | number | boolean>) =>
  api.get('/agent-sales', params)
export const createAgentSale = (data: Record<string, unknown>) => api.post('/agent-sales', data)
export const updateAgentSale = (id: number, data: Record<string, unknown>) =>
  api.put(`/agent-sales/${id}`, data)
export const deleteAgentSale = (id: number) => api.del(`/agent-sales/${id}`)
export const exportAgentSales = () => `${API_BASE}/agent-sales/export`

// Group Tours
export const listGroupTours = (params?: Record<string, string | number | boolean>) =>
  api.get('/group-tours', params)
export const createGroupTour = (data: Record<string, unknown>) => api.post('/group-tours', data)
export const updateGroupTour = (id: number, data: Record<string, unknown>) =>
  api.put(`/group-tours/${id}`, data)
export const deleteGroupTour = (id: number) => api.del(`/group-tours/${id}`)
export const exportGroupTours = () => `${API_BASE}/group-tours/export`

// Bank Transactions
export const listBankTransactions = (params?: Record<string, string | number | boolean>) =>
  api.get('/bank-transactions', params)
export const createBankTransaction = (data: Record<string, unknown>) =>
  api.post('/bank-transactions', data)
export const updateBankTransaction = (id: number, data: Record<string, unknown>) =>
  api.put(`/bank-transactions/${id}`, data)
export const deleteBankTransaction = (id: number) => api.del(`/bank-transactions/${id}`)
export const exportBankTransactions = () => `${API_BASE}/bank-transactions/export`

// Staff
export const listStaff = (params?: Record<string, string | number | boolean>) =>
  api.get('/staff', params)
export const createStaff = (data: Record<string, unknown>) => api.post('/staff', data)
export const updateStaff = (id: number, data: Record<string, unknown>) => api.put(`/staff/${id}`, data)
export const deleteStaff = (id: number) => api.del(`/staff/${id}`)

// Debts
export const listDebts = (params?: Record<string, string | number | boolean>) =>
  api.get('/debts', params)
export const createDebt = (data: Record<string, unknown>) => api.post('/debts', data)
export const updateDebt = (id: number, data: Record<string, unknown>) => api.put(`/debts/${id}`, data)
export const deleteDebt = (id: number) => api.del(`/debts/${id}`)

// Reports
export const getDashboard = () => api.get('/reports/dashboard')
export const getRevenueReport = (params?: Record<string, string | number | boolean>) =>
  api.get('/reports/revenue', params)
export const getStaffReport = (params?: Record<string, string | number | boolean>) =>
  api.get('/reports/staff', params)
