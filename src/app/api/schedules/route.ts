import { NextRequest, NextResponse } from 'next/server'
import { searchSchedules } from '@/lib/dsvn'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig, isSupabaseConfigured } from '@/lib/supabase/config'
import type { DsvnSchedule } from '@/lib/types'

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

  const useDatabase = process.env.BOOKING_DATA_SOURCE !== 'reference' && isSupabaseConfigured()

  if (useDatabase) {
    const { url, anonKey } = getSupabaseConfig()
    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await supabase.rpc('search_published_departures', {
      p_from_code: from,
      p_to_code: to,
      p_service_date: date,
      p_locale: locale,
    })

    if (error) {
      console.error('[GET /api/schedules]', error.message)
      return NextResponse.json(
        { error: 'Schedule database is unavailable. Please try again shortly.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const schedules = ((data || []) as Array<Record<string, unknown>>).map((row): DsvnSchedule => {
      const durationMinutes = Number(row.duration_minutes || 0)
      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60
      const products = Array.isArray(row.products) ? row.products : []

      return {
        departureId: Number(row.departure_id),
        scheduleId: String(row.schedule_id),
        trainNumber: String(row.train_number),
        fromStation: String(row.from_station),
        toStation: String(row.to_station),
        departureTime: String(row.departure_time),
        arrivalTime: String(row.arrival_time),
        arrivalDayOffset: Number(row.arrival_day_offset || 0),
        duration: minutes ? `${hours}h ${minutes.toString().padStart(2, '0')}m` : `${hours}h`,
        departureDays: [],
        availableSeats: products.map((product) => {
          const item = product as Record<string, unknown>
          return {
            seatClass: String(item.code),
            seatClassVi: String(item.nameVi),
            seatClassEn: String(item.nameEn),
            ticketPrice: Number(item.ticketPrice),
            price: Number(item.cabinPrice),
            available: Number(item.remainingCabins),
          }
        }),
        hasLanding: true,
        hasRestaurant: false,
      }
    })

    return NextResponse.json({ schedules, source: 'supabase' }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const schedules = searchSchedules(from, to, date, locale)

  return NextResponse.json({ schedules, source: 'reference' }, { headers: { 'Cache-Control': 'no-store' } })
}
