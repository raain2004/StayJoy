import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['pending', 'confirmed', 'check-in', 'checked_in', 'đã cọc', 'đang ở', 'cancelled', 'mới', 'đã liên hệ', 'đã xử lý']

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bookingId = parseInt(params.id, 10)
  if (isNaN(bookingId)) {
    return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 })
  }

  let body: { tinh_trang?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { tinh_trang } = body
  if (!tinh_trang || !VALID_STATUSES.includes(tinh_trang)) {
    return NextResponse.json(
      { error: `tinh_trang must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    // Verify ownership via RLS — if the booking doesn't belong to this tenant's property,
    // the select will return nothing and we return 404.
    const { data: existing, error: fetchError } = await supabase
      .from('bookings')
      .select('id, property_id')
      .eq('id', bookingId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ tinh_trang })
      .eq('id', bookingId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ booking: data })
  } catch (error) {
    console.error('[PATCH /api/bookings/:id]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bookingId = parseInt(params.id, 10)
  if (isNaN(bookingId)) {
    return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json({ booking: data })
  } catch (error) {
    console.error('[GET /api/bookings/:id]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
