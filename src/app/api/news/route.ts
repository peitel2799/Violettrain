import { NextRequest, NextResponse } from 'next/server'
import { fetchNews } from '@/lib/dsvn'
import type { NewsItem } from '@/lib/dsvn-client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10', 10)
  const category = searchParams.get('category')

  try {
    let news = await fetchNews(limit)

    if (category) {
      news = news.filter((item: NewsItem) => item.category === category)
    }

    return NextResponse.json({ news })
  } catch (error) {
    console.error('[API /news]', error)
    return NextResponse.json(
      { error: 'Failed to fetch news', news: [] },
      { status: 500 }
    )
  }
}

export const revalidate = 3600 // Cache for 1 hour
