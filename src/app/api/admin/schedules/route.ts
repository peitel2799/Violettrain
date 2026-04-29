/**
 * GET /api/admin/schedules
 * Returns all schedules with seat availability.
 *
 * POST /api/admin/schedules
 * Body: { trainNumber, routeId, fromStation, toStation,
 *         departureTime, arrivalTime, duration, departureDays,
 *         hasLanding, hasRestaurant, active, notes }
 * Create a new train schedule entry.
 *
 * PATCH /api/admin/schedules
 * Body: { id, updates }
 * Update schedule details or seat availability.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getSchedules,
  upsertSchedule,
  updateSeatAvailability,
  type AdminSchedule,
} from '@/lib/admin-store'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()
  try {
    const schedules = getSchedules()
    return NextResponse.json({ schedules })
  } catch (error) {
    console.error('[API /admin/schedules GET]', error)
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()
  try {
    const body = await request.json()
    const {
      trainNumber,
      routeId,
      fromStation,
      toStation,
      departureTime,
      arrivalTime,
      duration,
      departureDays,
      hasLanding,
      hasRestaurant,
      active,
      notes,
    } = body

    if (!trainNumber || !routeId || !fromStation || !toStation || !departureTime || !arrivalTime) {
      return NextResponse.json(
        { error: 'Missing required fields: trainNumber, routeId, fromStation, toStation, departureTime, arrivalTime' },
        { status: 400 }
      )
    }

    const id = `${trainNumber.toUpperCase()}-${routeId.replace(/-/g, '').toUpperCase().substring(0, 4)}`

    const newSchedule: AdminSchedule = {
      id,
      trainNumber: trainNumber.toUpperCase(),
      routeId,
      fromStation,
      toStation,
      departureTime,
      arrivalTime,
      duration: duration || '',
      days: (departureDays || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) as AdminSchedule['days'],
      cabinAvailability: { standard: 20, premium: 8 },
      hasLanding: hasLanding ?? false,
      hasRestaurant: hasRestaurant ?? false,
      active: active ?? true,
      notes: notes || '',
    }

    const schedule = upsertSchedule(newSchedule)
    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    console.error('[API /admin/schedules POST]', error)
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()
  try {
    const body = await request.json()
    const { id, action, updates } = body

    if (action === 'update-seats') {
      const { scheduleId, cabinClassId, delta } = updates ?? {}
      if (!scheduleId || !cabinClassId || typeof delta !== 'number') {
        return NextResponse.json(
          { error: 'Missing required fields: scheduleId, cabinClassId, delta' },
          { status: 400 }
        )
      }
      const schedule = updateSeatAvailability(scheduleId, cabinClassId, delta)
      if (!schedule) {
        return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
      }
      return NextResponse.json({ schedule })
    }

    if (action === 'upsert') {
      const schedule = upsertSchedule({ ...updates, id } as AdminSchedule)
      return NextResponse.json({ schedule })
    }

    if (!id || !updates) {
      return NextResponse.json({ error: 'Missing id or updates' }, { status: 400 })
    }

    const schedules = getSchedules()
    const idx = schedules.findIndex((s) => s.id === id)
    if (idx < 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const updated = { ...schedules[idx], ...updates }
    schedules[idx] = updated
    upsertSchedule(updated)
    return NextResponse.json({ schedule: updated })
  } catch (error) {
    console.error('[API /admin/schedules PATCH]', error)
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }
}
