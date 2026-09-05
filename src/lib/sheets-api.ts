// API client for multi-sheet system

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

export interface SheetColumn {
  key: string
  label: string
  width: string
  editable: boolean
  type: 'text' | 'number' | 'date' | 'select' | 'currency'
  options?: string[]
  align?: 'left' | 'center' | 'right'
}

export interface SheetDefinition {
  id: string
  name: string
  description?: string
  columns: SheetColumn[]
  createdAt: string
  createdBy: string
  rowCount: number
  color: string
}

export interface SheetRow {
  id: string
  _rowNum?: number
  _deleted?: boolean
  _createdBy?: string
  _createdAt?: string
  _updatedBy?: string
  _updatedAt?: string
  [key: string]: unknown
}

// ─── Sheet CRUD ────────────────────────────────────────────────────────────────

export async function listSheets(): Promise<SheetDefinition[]> {
  const data = await request<{ sheets: SheetDefinition[] }>('/api/admin/sheets')
  return data.sheets || []
}

export async function getSheet(sheetId: string): Promise<{ sheet: SheetDefinition; rows: SheetRow[] }> {
  return request(`/api/admin/sheets?sheetId=${sheetId}`)
}

export async function createSheet(params: {
  name: string
  description?: string
  template?: 'blank' | 'booking'
}): Promise<{ sheet: SheetDefinition }> {
  return request('/api/admin/sheets', {
    method: 'POST',
    body: JSON.stringify({ action: 'createSheet', ...params }),
  })
}

export async function deleteSheet(sheetId: string): Promise<void> {
  await request(`/api/admin/sheets?sheetId=${sheetId}`, { method: 'DELETE' })
}

export async function addColumn(sheetId: string, column: Partial<SheetColumn>): Promise<{ sheet: SheetDefinition }> {
  return request('/api/admin/sheets', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'addColumn', sheetId, column }),
  })
}

// ─── Row CRUD ─────────────────────────────────────────────────────────────────

export async function addRow(sheetId: string, data: Record<string, unknown> = {}): Promise<{ row: SheetRow }> {
  return request('/api/admin/sheets', {
    method: 'POST',
    body: JSON.stringify({ action: 'addRow', sheetId, data }),
  })
}

export async function updateRow(
  sheetId: string,
  rowId: string,
  data: Record<string, unknown>
): Promise<{ row: SheetRow }> {
  return request('/api/admin/sheets', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'updateRow', sheetId, rowId, data }),
  })
}

export async function deleteRow(sheetId: string, rowId: string): Promise<void> {
  await request(`/api/admin/sheets?sheetId=${sheetId}&rowId=${rowId}`, { method: 'DELETE' })
}

// ─── Export CSV ────────────────────────────────────────────────────────────────

export function exportSheetCSV(rows: SheetRow[], columns: SheetColumn[], sheetName: string): void {
  const headers = columns.map(c => c.label)
  const csvRows = rows.map(row =>
    columns.map(col => {
      const v = row[col.key]
      if (v === null || v === undefined) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }).join(',')
  )
  const csv = [headers.join(','), ...csvRows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
