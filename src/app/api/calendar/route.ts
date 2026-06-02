import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10)
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1), 10)

  const firstDay = new Date(Date.UTC(year, month - 1, 1)).toISOString().split('T')[0]
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0]

  try {
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('room_id, loai_phong, suc_chua, gia_dem')

    if (roomsError) throw roomsError

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .lte('check_in', lastDay)
      .gte('check_out', firstDay)

    if (bookingsError) throw bookingsError

    // Fetch ical bookings
    const { data: icalBookings, error: icalError } = await supabase
      .from('ical_bookings')
      .select('*')
      .lte('check_in', lastDay)
      .gte('check_out', firstDay)

    if (icalError) throw icalError

    // Map ical_bookings to match the Booking structure expected by the client calendar
    const mappedIcalBookings = (icalBookings ?? []).map((ib) => ({
      id: ib.id,
      property_id: ib.property_id,
      so_phong: ib.room_id,
      loai_phong: 'ical',
      ho_ten: `[${ib.source_name}] ${ib.summary || 'Đã khóa lịch'}`,
      sdt: '',
      email: '',
      check_in: ib.check_in,
      check_out: ib.check_out,
      num_day: 0,
      tinh_trang: 'confirmed', // Treat as confirmed so it matches ACTIVE_STATUSES
      timestamp: ib.synced_at,
    }))

    const combinedBookings = [
      ...(bookings ?? []),
      ...mappedIcalBookings,
    ]

    return NextResponse.json({ rooms: rooms ?? [], bookings: combinedBookings })
  } catch (error) {
    console.error('[GET /api/calendar]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
