import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'
import { readFile } from 'fs/promises'

interface AuditLogEntry {
  at: string
  by: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'
  changes?: Record<string, { from: unknown; to: unknown }>
}

async function readLedger(): Promise<Record<string, unknown>[]> {
  try {
    const content = await readFile(path.join(process.cwd(), 'data', 'ledger.json'), 'utf-8')
    return JSON.parse(content)
  } catch { return [] }
}

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const { searchParams } = request.nextUrl
    const entryId = searchParams.get('entryId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    const entries = await readLedger()

    if (entryId) {
      const entry = entries.find((e) => e.id === entryId)
      if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      const auditLog: AuditLogEntry[] = (entry.auditLog as AuditLogEntry[]) || []
      const total = auditLog.length
      const items = auditLog.slice((page - 1) * limit, page * limit)
      return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) })
    }

    // Collect all audit logs across all entries
    interface FlatLog {
      entryId: string
      entryLabel: string
      source: string
      log: AuditLogEntry
    }
    const allLogs: FlatLog[] = []

    for (const entry of entries) {
      const logs: AuditLogEntry[] = (entry.auditLog as AuditLogEntry[]) || []
      for (const log of logs) {
        allLogs.push({
          entryId: String(entry.id),
          entryLabel: String((entry as Record<string, unknown>).customer || (entry as Record<string, unknown>).customerName || '—'),
          source: String((entry as Record<string, unknown>).source || '—'),
          log,
        })
      }
    }

    // Sort newest first
    allLogs.sort((a, b) => new Date(b.log.at).getTime() - new Date(a.log.at).getTime())

    const total = allLogs.length
    const items = allLogs.slice((page - 1) * limit, page * limit)

    return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[API /admin/data/audit GET]', error)
    return NextResponse.json({ error: 'Failed to read audit log' }, { status: 500 })
  }
}
