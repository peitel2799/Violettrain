// API client for booking + bank reconciliation system

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

// ─── Types ────────────────────────────────────────────────────────────────────

export type { Booking, BankTransaction, AuditLogEntry, BookingStatus, BankAccount, DebtSummary, DebtBooking, BookingListResponse, BankTransactionListResponse, DebtResponse } from './booking-types'

// ─── Bookings ────────────────────────────────────────────────────────────────

export async function listBookings(params: {
  page?: number; limit?: number; search?: string; status?: string; dateFrom?: string; dateTo?: string; sortField?: string; sortDir?: string
} = {}): Promise<import('./booking-types').BookingListResponse> {
  const sp = new URLSearchParams()
  if (params.page) sp.set('page', String(params.page))
  if (params.limit) sp.set('limit', String(params.limit))
  if (params.search) sp.set('search', params.search)
  if (params.status) sp.set('status', params.status)
  if (params.dateFrom) sp.set('dateFrom', params.dateFrom)
  if (params.dateTo) sp.set('dateTo', params.dateTo)
  if (params.sortField) sp.set('sortField', params.sortField)
  if (params.sortDir) sp.set('sortDir', params.sortDir)
  return request(`/api/admin/bookings?${sp}`)
}

export async function createBooking(data: Record<string, unknown>): Promise<{ item: import('./booking-types').Booking }> {
  return request('/api/admin/bookings', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateBooking(id: string, data: Record<string, unknown>): Promise<{ item: import('./booking-types').Booking }> {
  return request(`/api/admin/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ id, ...data }) })
}

export async function deleteBooking(id: string): Promise<unknown> {
  return request(`/api/admin/bookings/${id}?id=${id}`, { method: 'DELETE' })
}

// ─── Bank Transactions ─────────────────────────────────────────────────────────

export async function listBankTransactions(params: {
  page?: number; limit?: number; search?: string; bank?: string; dateFrom?: string; dateTo?: string
} = {}): Promise<import('./booking-types').BankTransactionListResponse> {
  const sp = new URLSearchParams()
  if (params.page) sp.set('page', String(params.page))
  if (params.limit) sp.set('limit', String(params.limit))
  if (params.search) sp.set('search', params.search)
  if (params.bank) sp.set('bank', params.bank)
  if (params.dateFrom) sp.set('dateFrom', params.dateFrom)
  if (params.dateTo) sp.set('dateTo', params.dateTo)
  return request(`/api/admin/bank?${sp}`)
}

// ─── Reconciliation ───────────────────────────────────────────────────────────

export async function reconcileMatch(bookingId: string, bankTxId: string, amount?: number) {
  return request('/api/admin/reconcile', {
    method: 'POST',
    body: JSON.stringify({ action: 'match', bookingId, bankTxId, amount }),
  })
}

export async function reconcileUnmatch(bookingId: string, bankTxId: string, amount?: number) {
  return request('/api/admin/reconcile', {
    method: 'POST',
    body: JSON.stringify({ action: 'unmatch', bookingId, bankTxId, amount }),
  })
}

export async function reconcileAuto() {
  return request('/api/admin/reconcile', { method: 'POST', body: JSON.stringify({ action: 'auto' }) })
}

// ─── Debts ───────────────────────────────────────────────────────────────────

export async function getDebts(params: { dateFrom?: string; dateTo?: string; showPaid?: boolean } = {}): Promise<import('./booking-types').DebtResponse> {
  const sp = new URLSearchParams()
  if (params.dateFrom) sp.set('dateFrom', params.dateFrom)
  if (params.dateTo) sp.set('dateTo', params.dateTo)
  if (params.showPaid) sp.set('showPaid', 'true')
  return request(`/api/admin/debts?${sp}`)
}

// ─── Export ─────────────────────────────────────────────────────────────────

export function exportBookingsCSV(bookings: import('./booking-types').Booking[]): void {
  const headers = [
    'Mã đoàn', 'Công ty', 'Liên hệ', 'SĐT', 'MST', 'Ngày đặt', 'Ngày khởi hành',
    'Tàu', 'Tuyến', 'Tổng vé', 'Đơn giá', 'Tổng tiền', 'Đã thanh toán', 'Còn nợ',
    'Trạng thái', 'Ghi chú',
  ]
  const rows = bookings.map((b) => [
    b.id, b.companyName, b.companyContact, b.companyPhone, b.taxCode,
    b.bookingDate, b.departureDate, b.trainNumber, b.route,
    b.totalTickets, b.unitPrice, b.totalAmount, b.paidAmount,
    b.totalAmount - b.paidAmount, b.status, b.notes,
  ])
  const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}`).join(','))].join('\n')
  downloadBlob(csv, `bookings_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
}

export function exportDebtsCSV(debts: import('./booking-types').DebtSummary[]): void {
  const headers = ['Công ty', 'Tổng đoàn', 'Tổng tiền', 'Đã thanh toán', 'Còn nợ']
  const rows = debts.map((d) => [d.companyName, d.totalBookings, d.totalAmount, d.totalPaid, d.totalDebt])
  const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}`).join(','))].join('\n')
  downloadBlob(csv, `cong_no_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
}

function downloadBlob(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
