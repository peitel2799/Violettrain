import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'

export async function PATCH(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 })
    }

    // Dynamically import to read/write JSON (avoids top-level await)
    const { readFile, writeFile, mkdir } = await import('fs/promises')
    const { existsSync } = await import('fs')
    const path = await import('path')

    const DATA_DIR = path.join(process.cwd(), 'data')
    const LEDGER_FILE = path.join(DATA_DIR, 'ledger.json')

    const ensureDir = async () => {
      if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
    }

    const readEntries = async () => {
      try {
        const content = await readFile(LEDGER_FILE, 'utf-8')
        return JSON.parse(content)
      } catch { return [] }
    }

    const entries = await readEntries()
    const idx = entries.findIndex((e: Record<string, unknown>) => e.id === id)

    if (idx === -1) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const updated = { ...entries[idx], ...updates, updatedAt: new Date().toISOString() }
    entries[idx] = updated

    await ensureDir()
    await writeFile(LEDGER_FILE, JSON.stringify(entries, null, 2), 'utf-8')

    return NextResponse.json({ item: updated })
  } catch (error) {
    console.error('[API /admin/ledger PATCH]', error)
    return NextResponse.json({ error: 'Failed to update ledger entry' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 })
    }

    const { readFile, writeFile, mkdir } = await import('fs/promises')
    const { existsSync } = await import('fs')
    const path = await import('path')

    const DATA_DIR = path.join(process.cwd(), 'data')
    const LEDGER_FILE = path.join(DATA_DIR, 'ledger.json')

    const entries: Record<string, unknown>[] = await readFile(LEDGER_FILE, 'utf-8')
      .then((c) => JSON.parse(c))
      .catch(() => [])

    const filtered = entries.filter((e) => e.id !== id)

    if (filtered.length === entries.length) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
    await writeFile(LEDGER_FILE, JSON.stringify(filtered, null, 2), 'utf-8')

    return NextResponse.json({ deleted: 1, remaining: filtered.length })
  } catch (error) {
    console.error('[API /admin/ledger DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete ledger entry' }, { status: 500 })
  }
}
