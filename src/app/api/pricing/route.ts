import { NextRequest, NextResponse } from 'next/server'
import { getRoutePricing } from '@/lib/dsvn'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Missing required parameters: from, to' },
      { status: 400 }
    )
  }

  const pricing = getRoutePricing(from, to)
  return NextResponse.json({ pricing })
}
