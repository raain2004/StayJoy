import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key')
  return apiKey === process.env.KNOWLEDGE_BASE_API_KEY
}

/**
 * GET /api/n8n/bookings?property_id=xxx
 * Returns active bookings for availability check (replaces Read_BookingCalendar + Read_Room_Status)
 */
export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const propertyId = searchParams.get('property_id')

  if (!propertyId) {
    return NextResponse.json({ error: 'property_id is required' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    // Get active bookings (not cancelled)
    const { data, error } = await supabase
      .from('bookings')
      .select('id, so_phong, loai_phong, ho_ten, sdt, check_in, check_out, tinh_trang, conversation_id')
      .eq('property_id', propertyId)
      .in('tinh_trang', ['pending', 'confirmed', 'check-in', 'checked_in', 'đã cọc', 'đang ở'])

    if (error) throw error

    // Also fetch iCal bookings (synced from OTAs)
    const { data: icalBookings } = await supabase
      .from('ical_bookings')
      .select('room_id, check_in, check_out, summary, source_name')
      .eq('property_id', propertyId)

    return NextResponse.json({
      bookings: data ?? [],
      ical_bookings: icalBookings ?? [],
    })
  } catch (error) {
    console.error('[GET /api/n8n/bookings]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * POST /api/n8n/bookings
 * Creates a new booking (replaces Confirm Google Sheets append)
 */
export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { property_id, so_phong, loai_phong, ho_ten, sdt, email, check_in, check_out, conversation_id } = body

    if (!property_id || !check_in || !check_out) {
      return NextResponse.json({ error: 'property_id, check_in, check_out are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Calculate num_day
    const numDay = Math.round(
      (new Date(check_out).getTime() - new Date(check_in).getTime()) / (1000 * 60 * 60 * 24)
    )

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        property_id,
        so_phong: so_phong || '',
        loai_phong: loai_phong || '',
        ho_ten: ho_ten || null,
        sdt: sdt || null,
        email: email || null,
        check_in,
        check_out,
        num_day: numDay,
        tinh_trang: 'pending',
        conversation_id: conversation_id || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ booking: data }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/n8n/bookings]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
