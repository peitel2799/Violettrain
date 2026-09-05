// API client for admin data management

const getToken = () => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('admin_token') || localStorage.getItem('vm_token') || ''
}
const getUser = () => {
  if (typeof window === 'undefined') return 'admin'
  return localStorage.getItem('admin_user') || 'admin'
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  headers['X-Admin-User'] = getUser()
  const res = await fetch(url, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ─── Ledger Entry (original T1-QV schema) ─────────────────────────────────────────

export interface LedgerEntry {
  id: string
  source: string
  sellDate: string
  seller: string
  customer: string
  customerPhone: string
  customerEmail: string
  departureDate: string
  trainCode: string
  route: string
  carriage: string
  seatInfo: string
  seatCount: number
  unitPrice: number
  totalAmount: number
  paymentMethod: string
  actualTickets: number
  actualUnitPrice: number
  cashAmount: number
  cardAmount: number
  balance: number
  gikaCount: number
  gikaUnitPrice: number
  vatCode: string
  ticketCode: string
  agentCode: string
  trainNumber: string
  carriageNumber: string
  notes: string
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
  auditLog?: unknown[]
  deleted?: boolean
  deletedBy?: string
  deletedAt?: string
}

export interface AuditLogEntry {
  at: string
  by: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'MATCH' | 'UNMATCH'
  changes?: Record<string, { from: unknown; to: unknown }>
}

export interface DataListResponse {
  items: LedgerEntry[]
  total: number
  page: number
  limit: number
  pages: number
  stats: {
    totalRevenue: number
    totalTickets: number
    sheetRevenue: number
    sheetTickets: number
    bySource: Record<string, { count: number; revenue: number }>
    byMonth: Array<{ month: string; revenue: number; count: number }>
    byCustomer: Array<{ customer: string; revenue: number; count: number }>
  }
}

export interface AuditLogResponse {
  items: Array<{ entryId: string; entryLabel: string; source: string; log: AuditLogEntry }>
  total: number
  page: number
  pages: number
}

// ─── Data API ──────────────────────────────────────────────────────────

export async function listData(params: {
  page?: number
  limit?: number
  search?: string
  source?: string
  dateFrom?: string
  dateTo?: string
  sortField?: string
  sortDir?: string
} = {}): Promise<DataListResponse> {
  const sp = new URLSearchParams()
  if (params.page) sp.set('page', String(params.page))
  if (params.limit) sp.set('limit', String(params.limit))
  if (params.search) sp.set('search', params.search)
  if (params.source) sp.set('source', params.source)
  if (params.dateFrom) sp.set('dateFrom', params.dateFrom)
  if (params.dateTo) sp.set('dateTo', params.dateTo)
  if (params.sortField) sp.set('sortField', params.sortField)
  if (params.sortDir) sp.set('sortDir', params.sortDir)
  return request<DataListResponse>(`/api/admin/data?${sp}`)
}

export async function createEntry(data: Partial<LedgerEntry>): Promise<{ item: LedgerEntry }> {
  return request('/api/admin/data', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateEntry(id: string, data: Partial<LedgerEntry>): Promise<{ item: LedgerEntry }> {
  return request(`/api/admin/data/${id}`, { method: 'PATCH', body: JSON.stringify({ id, ...data }) })
}

export async function deleteEntry(id: string): Promise<unknown> {
  return request(`/api/admin/data/${id}`, { method: 'DELETE' })
}

// ─── Audit API ────────────────────────────────────────────────────────

export async function listAuditLogs(entryId?: string, page = 1, limit = 50): Promise<AuditLogResponse> {
  const sp = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (entryId) sp.set('entryId', entryId)
  return request<AuditLogResponse>(`/api/admin/data/audit?${sp}`)
}

export async function getEntryAuditLog(entryId: string): Promise<{ items: AuditLogEntry[]; total: number }> {
  return request(`/api/admin/data/audit?entryId=${entryId}`)
}

// ─── Import / Export ─────────────────────────────────────────────────

export async function importCSV(file: File, source: string): Promise<{ imported: number; total: number }> {
  const token = getToken()
  const user = getUser()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('source', source)
  const res = await fetch('/api/admin/data/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-Admin-User': user },
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Import failed')
  return data
}

export function exportCSV(entries: LedgerEntry[]): void {
  const headers = [
    'source', 'sellDate', 'seller', 'customer', 'customerPhone', 'customerEmail',
    'departureDate', 'trainCode', 'route', 'carriage', 'seatInfo',
    'seatCount', 'unitPrice', 'totalAmount', 'paymentMethod',
    'actualTickets', 'actualUnitPrice', 'cashAmount', 'cardAmount', 'balance',
    'gikaCount', 'gikaUnitPrice', 'vatCode', 'ticketCode', 'agentCode',
    'trainNumber', 'carriageNumber', 'notes',
  ]
  const rows = entries.map((e) =>
    headers.map((h) => {
      const v = (e as unknown as Record<string, unknown>)[h]
      if (v === null || v === undefined) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `so-quy_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Backup API ───────────────────────────────────────────────────────

export async function downloadBackup(): Promise<void> {
  const token = getToken()
  const adminUser = getUser()
  const res = await fetch('/api/admin/data/backup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Admin-User': adminUser,
    },
    body: JSON.stringify({ action: 'download' }),
  })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `violette_backup_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Users API ───────────────────────────────────────────────────────

export interface UserRecord {
  id: string
  username: string
  name: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  createdAt: string
  lastLogin: string | null
  active: boolean
}

export async function listUsers(): Promise<{ users: UserRecord[] }> {
  return request('/api/admin/users')
}

export async function createUser(data: { username: string; password: string; name?: string; email?: string; role?: string }): Promise<{ user: UserRecord }> {
  return request('/api/admin/users', { method: 'POST', body: JSON.stringify({ action: 'create', ...data }) })
}

export async function updateUser(data: { id: string; name?: string; email?: string; role?: string; active?: boolean; password?: string }): Promise<{ user: UserRecord }> {
  return request('/api/admin/users', { method: 'POST', body: JSON.stringify({ action: 'update', ...data }) })
}

export async function deleteUser(id: string): Promise<unknown> {
  return request('/api/admin/users', { method: 'POST', body: JSON.stringify({ action: 'delete', id }) })
}
