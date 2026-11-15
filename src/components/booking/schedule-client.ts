import type { DsvnSchedule } from '@/lib/types'

type ScheduleSearch = {
  from: string
  to: string
  date: string
  locale: 'vi' | 'en'
  signal?: AbortSignal
}

type ScheduleResponse = {
  schedules?: DsvnSchedule[]
}

export async function fetchSchedules({
  from,
  to,
  date,
  locale,
  signal,
}: ScheduleSearch): Promise<DsvnSchedule[]> {
  const query = new URLSearchParams({ from, to, date, locale })
  const response = await fetch(`/api/schedules?${query}`, {
    cache: 'no-store',
    signal,
  })

  if (!response.ok) {
    throw new Error(`Schedule request failed with status ${response.status}.`)
  }

  const payload = await response.json() as ScheduleResponse
  return Array.isArray(payload.schedules) ? payload.schedules : []
}
