import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const roomId = params.id
  if (!roomId) {
    return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 })
  }

  let body: { gia_dem?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { gia_dem } = body
  if (gia_dem === undefined || gia_dem === null) {
    return NextResponse.json({ error: 'gia_dem is required' }, { status: 400 })
  }
  const giaDemNum = Number(gia_dem)
  if (!Number.isInteger(giaDemNum) || giaDemNum < 0) {
    return NextResponse.json({ error: 'gia_dem must be a non-negative integer' }, { status: 400 })
  }

  try {
    // Verify ownership: fetch the room and check its property_id belongs to this tenant.
    // RLS will already restrict results to the tenant's property, so a missing row means
    // either the room doesn't exist or it belongs to another tenant (403/404).
    const { data: existing, error: fetchError } = await supabase
      .from('rooms')
      .select('room_id, property_id')
      .eq('room_id', roomId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Confirm the property_id is owned by the authenticated user via users_properties
    const { data: ownership, error: ownerError } = await supabase
      .from('users_properties')
      .select('property_id')
      .eq('user_id', session.user.id)
      .eq('property_id', existing.property_id)
      .single()

    if (ownerError || !ownership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('rooms')
      .update({ gia_dem: giaDemNum })
      .eq('room_id', roomId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ room: data })
  } catch (error) {
    console.error('[PUT /api/rooms/:id]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
