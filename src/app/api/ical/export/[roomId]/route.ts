import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/ical/export/[roomId]?property_id=xxx
 * Public endpoint — OTAs subscribe to this URL to get availability.
 * Generates a valid .ics file from bookings + ical_bookings for the given room.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const roomId = params.roomId
  const { searchParams } = new URL(request.url)
  const propertyId = searchParams.get('property_id')

  if (!propertyId) {
    return NextResponse.json({ error: 'property_id is required' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    // Fetch regular bookings (active statuses)
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, so_phong, ho_ten, check_in, check_out, tinh_trang')
      .eq('property_id', propertyId)
      .eq('so_phong', roomId)
      .in('tinh_trang', ['pending', 'confirmed', 'check-in', 'checked_in', 'đã cọc', 'đang ở'])

    if (bookingsError) throw bookingsError

    // Fetch iCal bookings for this room
    const { data: icalBookings, error: icalError } = await supabase
      .from('ical_bookings')
      .select('uid, summary, check_in, check_out, source_name')
      .eq('property_id', propertyId)
      .eq('room_id', roomId)

    if (icalError) throw icalError

    // Generate .ics content
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StayJoy//iCal Export//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:StayJoy - Room ${roomId}`,
    ]

    // Add regular bookings as VEVENTs
    for (const booking of bookings ?? []) {
      const dtstart = booking.check_in.replace(/-/g, '')
      const dtend = booking.check_out.replace(/-/g, '')
      const uid = `booking-${booking.id}@stayjoy`
      const summary = booking.ho_ten
        ? `${booking.ho_ten} (${booking.tinh_trang})`
        : `Booking #${booking.id}`

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART;VALUE=DATE:${dtstart}`,
        `DTEND;VALUE=DATE:${dtend}`,
        `SUMMARY:${summary}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT'
      )
    }

    // Add iCal-synced bookings as VEVENTs
    for (const ical of icalBookings ?? []) {
      const dtstart = ical.check_in.replace(/-/g, '')
      const dtend = ical.check_out.replace(/-/g, '')
      const summary = ical.summary || `Blocked (${ical.source_name || 'External'})`

      lines.push(
        'BEGIN:VEVENT',
        `UID:${ical.uid}`,
        `DTSTART;VALUE=DATE:${dtstart}`,
        `DTEND;VALUE=DATE:${dtend}`,
        `SUMMARY:${summary}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT'
      )
    }

    lines.push('END:VCALENDAR')

    const icsContent = lines.join('\r\n')

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="room-${roomId}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[GET /api/ical/export]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
