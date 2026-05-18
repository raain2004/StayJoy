import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0]
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]
    const today = now.toISOString().split('T')[0]

    const ACTIVE_STATUSES = ['confirmed', 'check-in', 'checked_in', 'đã cọc', 'đang ở']

    // 1. Total bookings this month (all statuses)
    const { count: totalBookingsThisMonth, error: bookingsCountError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('check_in', firstDayOfMonth)
      .lte('check_in', lastDayOfMonth)

    if (bookingsCountError) throw bookingsCountError

    // 2. Revenue this month: SUM(num_day * gia_dem) for active bookings with check_in in current month
    const { data: revenueRows, error: revenueError } = await supabase
      .from('bookings')
      .select('num_day, gia_dem')
      .in('tinh_trang', ACTIVE_STATUSES)
      .gte('check_in', firstDayOfMonth)
      .lte('check_in', lastDayOfMonth)

    if (revenueError) throw revenueError

    const revenueThisMonth = (revenueRows ?? []).reduce(
      (sum, row) => sum + (row.num_day ?? 0) * (row.gia_dem ?? 0),
      0
    )

    // 3. Pending service requests: trang_thai IN ('Mới', 'Đang xử lý')
    const { count: pendingServiceRequests, error: serviceError } = await supabase
      .from('service_requests')
      .select('*', { count: 'exact', head: true })
      .in('trang_thai', ['Mới', 'Đang xử lý'])

    if (serviceError) throw serviceError

    // 4. Vacancy rate: rooms without active bookings today / total rooms
    const { data: allRooms, error: roomsError } = await supabase
      .from('rooms')
      .select('room_id')

    if (roomsError) throw roomsError

    const totalRooms = allRooms?.length ?? 0

    // Get rooms that have an active booking overlapping today
    const { data: occupiedRooms, error: occupiedError } = await supabase
      .from('bookings')
      .select('so_phong')
      .in('tinh_trang', ACTIVE_STATUSES)
      .lte('check_in', today)
      .gt('check_out', today)

    if (occupiedError) throw occupiedError

    const occupiedRoomIds = new Set((occupiedRooms ?? []).map((b) => b.so_phong))
    const vacantRooms = totalRooms - occupiedRoomIds.size
    const vacancyRate = totalRooms > 0 ? vacantRooms / totalRooms : 0

    return NextResponse.json({
      totalBookingsThisMonth: totalBookingsThisMonth ?? 0,
      revenueThisMonth,
      pendingServiceRequests: pendingServiceRequests ?? 0,
      vacancyRate,
    })
  } catch (error) {
    console.error('[GET /api/dashboard/summary]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
