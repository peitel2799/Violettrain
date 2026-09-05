import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'
import { readFile, writeFile, mkdir, readdir, rm, copyFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const LEDGER_FILE = path.join(DATA_DIR, 'ledger.json')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const BACKUPS_DIR = path.join(DATA_DIR, 'backups')

async function ensureDirs() {
  if (!existsSync(BACKUPS_DIR)) await mkdir(BACKUPS_DIR, { recursive: true })
}

// GET = list backups
export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    await ensureDirs()
    const files = await readdir(BACKUPS_DIR)
    const backups = await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map(async (f) => {
          const filePath = path.join(BACKUPS_DIR, f)
          const { stat } = require('fs').promises
          const s = await stat(filePath)
          const content = await readFile(filePath, 'utf-8')
          let data: Record<string, unknown> = {}
          try { data = JSON.parse(content) } catch {}
          return {
            filename: f,
            createdAt: s.mtime.toISOString(),
            size: s.size,
            entryCount: Array.isArray(data.entries) ? data.entries.length : 0,
            note: (data as Record<string, unknown>).note || '',
          }
        })
    )
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return NextResponse.json({ backups })
  } catch (error) {
    console.error('[API /admin/data/backup GET]', error)
    return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 })
  }
}

// POST = create backup or restore
export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const body = await request.json()
    const { action } = body
    await ensureDirs()

    if (action === 'create') {
      const note = body.note || ''
      const entries = await readFile(LEDGER_FILE, 'utf-8').catch(() => '[]')
      const users = await readFile(USERS_FILE, 'utf-8').catch(() => '[]')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `backup_${timestamp}.json`
      const backupData = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        note,
        entries: JSON.parse(entries),
        users: JSON.parse(users),
      }
      await writeFile(path.join(BACKUPS_DIR, filename), JSON.stringify(backupData, null, 2), 'utf-8')
      return NextResponse.json({ filename, size: JSON.stringify(backupData).length })
    }

    if (action === 'restore') {
      const { filename } = body
      if (!filename) return NextResponse.json({ error: 'Filename required' }, { status: 400 })
      const filePath = path.join(BACKUPS_DIR, filename)
      if (!existsSync(filePath)) return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
      const content = await readFile(filePath, 'utf-8')
      const backup: {
        entries?: Record<string, unknown>[]
        users?: Record<string, unknown>[]
      } = JSON.parse(content)

      if (backup.entries) {
        await writeFile(LEDGER_FILE, JSON.stringify(backup.entries, null, 2), 'utf-8')
      }
      if (backup.users) {
        await writeFile(USERS_FILE, JSON.stringify(backup.users, null, 2), 'utf-8')
      }
      return NextResponse.json({ restored: true, entriesCount: backup.entries?.length || 0 })
    }

    if (action === 'delete') {
      const { filename } = body
      if (!filename) return NextResponse.json({ error: 'Filename required' }, { status: 400 })
      const filePath = path.join(BACKUPS_DIR, filename)
      if (existsSync(filePath)) await rm(filePath)
      return NextResponse.json({ deleted: true })
    }

    if (action === 'download') {
      // Returns the full current ledger as a downloadable backup file
      const entries = await readFile(LEDGER_FILE, 'utf-8').catch(() => '[]')
      const users = await readFile(USERS_FILE, 'utf-8').catch(() => '[]')
      const backupData = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        note: 'Manual download',
        entries: JSON.parse(entries),
        users: JSON.parse(users),
      }
      const content = JSON.stringify(backupData, null, 2)
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="violette_backup_${new Date().toISOString().split('T')[0]}.json"`,
          'Content-Length': String(content.length),
        },
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[API /admin/data/backup POST]', error)
    return NextResponse.json({ error: 'Failed to process backup' }, { status: 500 })
  }
}
