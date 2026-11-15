import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { runDsvnScheduleSync } from '@/lib/dsvn-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function validCronSecret(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!secret || !supplied) return false
  const expectedBuffer = Buffer.from(secret)
  const suppliedBuffer = Buffer.from(supplied)
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer)
}

export async function GET(request: NextRequest) {
  if (!validCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 })
  }

  try {
    const result = await runDsvnScheduleSync('cron')
    return NextResponse.json(result, { status: result.status === 'failed' ? 502 : 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Schedule sync failed.' },
      { status: 500 }
    )
  }
}
