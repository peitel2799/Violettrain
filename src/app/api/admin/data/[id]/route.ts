import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const LEDGER_FILE = path.join(DATA_DIR, 'ledger.json')

interface AuditEntry {
  at: string
  by: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'
  changes?: Record<string, { from: unknown; to: unknown }>
}

async function readLedger(): Promise<Record<string, unknown>[]> {
  try {
    const content = await readFile(LEDGER_FILE, 'utf-8')
    return JSON.parse(content)
  } catch { return [] }
}

async function writeLedger(entries: Record<string, unknown>[]) {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(LEDGER_FILE, JSON.stringify(entries, null, 2), 'utf-8')
}

// PATCH = Update entry (with audit log)
export async function PATCH(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 })
    }

    const username = request.headers.get('X-Admin-User') || 'admin'
    const entries = await readLedger()
    const idx = entries.findIndex((e) => e.id === id)

    if (idx === -1) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const old = entries[idx]

    // Build changes map (only what changed)
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    for (const [key, val] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'auditLog' && key !== 'createdAt' && key !== 'createdBy') {
        const oldVal = (old as Record<string, unknown>)[key]
        if (JSON.stringify(oldVal) !== JSON.stringify(val)) {
          changes[key] = { from: oldVal, to: val }
        }
      }
    }

    // Add audit log entry
    const auditLog: AuditEntry[] = (old.auditLog as AuditEntry[]) || []
    auditLog.push({
      at: new Date().toISOString(),
      by: username,
      action: 'UPDATE',
      changes,
    })

    const updated = {
      ...old,
      ...updates,
      updatedBy: username,
      updatedAt: new Date().toISOString(),
      auditLog,
    }
    entries[idx] = updated

    await writeLedger(entries)

    const { auditLog: _al, ...safe } = updated as Record<string, unknown>
    return NextResponse.json({ item: safe, changes: Object.keys(changes) })
  } catch (error) {
    console.error('[API /admin/data PATCH]', error)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}

// DELETE = Soft delete entry (with audit log)
export async function DELETE(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')
    const permanent = searchParams.get('permanent') === 'true'

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 })
    }

    const username = request.headers.get('X-Admin-User') || 'admin'
    let entries = await readLedger()
    const idx = entries.findIndex((e) => e.id === id)

    if (idx === -1) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    if (permanent) {
      // Hard delete
      const entry = entries[idx]
      const auditLog: AuditEntry[] = (entry.auditLog as AuditEntry[]) || []
      auditLog.push({
        at: new Date().toISOString(),
        by: username,
        action: 'DELETE',
      })
      entries = entries.filter((e) => e.id !== id)
      await writeLedger(entries)
      return NextResponse.json({ deleted: 1, remaining: entries.length })
    }

    // Soft delete — mark as deleted
    const old = entries[idx]
    const auditLog: AuditEntry[] = (old.auditLog as AuditEntry[]) || []
    auditLog.push({
      at: new Date().toISOString(),
      by: username,
      action: 'DELETE',
    })

    entries[idx] = {
      ...old,
      deleted: true,
      deletedBy: username,
      deletedAt: new Date().toISOString(),
      updatedBy: username,
      updatedAt: new Date().toISOString(),
      auditLog,
    }
    await writeLedger(entries)

    const { auditLog: _al, ...safe } = entries[idx] as Record<string, unknown>
    return NextResponse.json({ item: safe, softDeleted: true })
  } catch (error) {
    console.error('[API /admin/data DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
