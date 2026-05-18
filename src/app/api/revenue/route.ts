import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateRevenue, calculatePercentChange } from '@/lib/revenue'
import type { Booking } from '@/lib/calendar'

export interface RevenueData {
  currentMonth: {
    total: number
    bookingCount: number
    avgPerBooking: number
  }
  previousMonth: {
    total: number
    bookingCount: number
    avgPerBooking: number
  }
  percentChange: number | null
  dailyBreakdown: Array<{ date: string; revenue: number }>
}

export async function GET(request: NextRequest) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Determine target month from query param or default to current month
  const { searchParams } = request.nextUrl
  const monthParam = searchParams.get('month') // e.g. "2024-03"

  const now = new Date()
  const targetMonth = monthParam
    ? new Date(`${monthParam}-01`)
    : new Date(now.getFullYear(), now.getMonth(), 1)

  const prevMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, 1)

  // Fetch bookings for both months in one query
  const firstDayPrev = prevMonth.toISOString().slice(0, 10)
  const lastDayCurrent = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0
  )
    .toISOString()
    .slice(0, 10)

  const { data, error } = await supabase
    .from('bookings')
    .select('id, property_id, so_phong, tinh_trang, check_in, check_out, num_day, gia_dem')
    .gte('check_in', firstDayPrev)
    .lte('check_in', lastDayCurrent)

  if (error) {
    console.error('[GET /api/revenue]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }

  const bookings = (data ?? []) as Array<Booking & { gia_dem: number }>

  const currentTotal = calculateRevenue(bookings, targetMonth)
  const previousTotal = calculateRevenue(bookings, prevMonth)

  const currentActive = bookings.filter((b) => {
    const [y, m] = b.check_in.split('-').map(Number)
    return y === targetMonth.getFullYear() && m === targetMonth.getMonth() + 1
  })
  const previousActive = bookings.filter((b) => {
    const [y, m] = b.check_in.split('-').map(Number)
    return y === prevMonth.getFullYear() && m === prevMonth.getMonth() + 1
  })

  // Daily breakdown for current month
  const daysInMonth = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0
  ).getDate()

  const dailyBreakdown = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const dateStr = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const revenue = currentActive
      .filter((b) => b.check_in === dateStr)
      .reduce((sum, b) => sum + b.num_day * b.gia_dem, 0)
    return { date: dateStr, revenue }
  })

  const result: RevenueData = {
    currentMonth: {
      total: currentTotal,
      bookingCount: currentActive.length,
      avgPerBooking: currentActive.length > 0 ? Math.round(currentTotal / currentActive.length) : 0,
    },
    previousMonth: {
      total: previousTotal,
      bookingCount: previousActive.length,
      avgPerBooking: previousActive.length > 0 ? Math.round(previousTotal / previousActive.length) : 0,
    },
    percentChange: calculatePercentChange(currentTotal, previousTotal),
    dailyBreakdown,
  }

  return NextResponse.json(result)
}
