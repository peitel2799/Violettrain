import { NextRequest, NextResponse } from 'next/server'
import { searchSchedules } from '@/lib/dsvn'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const date = searchParams.get('date')
  const locale = searchParams.get('locale') === 'en' ? 'en' : 'vi'

  if (!from || !to || !date) {
    return NextResponse.json(
      { error: 'Missing required parameters: from, to, date' },
      { status: 400 }
    )
  }

  const schedules = searchSchedules(from, to, date, locale)

  return NextResponse.json({ schedules }, { headers: { 'Cache-Control': 'no-store' } })
}
