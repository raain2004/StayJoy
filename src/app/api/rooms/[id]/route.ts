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

  let body: {
    loai_phong?: unknown
    suc_chua?: unknown
    gia_dem?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Build update payload with only provided fields
  const updates: Record<string, string | number> = {}

  if (body.loai_phong !== undefined) {
    if (typeof body.loai_phong !== 'string' || body.loai_phong.trim() === '') {
      return NextResponse.json({ error: 'loai_phong must be a non-empty string' }, { status: 400 })
    }
    updates.loai_phong = body.loai_phong.trim()
  }

  if (body.suc_chua !== undefined) {
    const sucChuaNum = Number(body.suc_chua)
    if (!Number.isInteger(sucChuaNum) || sucChuaNum < 1) {
      return NextResponse.json({ error: 'suc_chua must be a positive integer' }, { status: 400 })
    }
    updates.suc_chua = sucChuaNum
  }

  if (body.gia_dem !== undefined) {
    const giaDemNum = Number(body.gia_dem)
    if (!Number.isInteger(giaDemNum) || giaDemNum < 0) {
      return NextResponse.json({ error: 'gia_dem must be a non-negative integer' }, { status: 400 })
    }
    updates.gia_dem = giaDemNum
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    // Verify ownership: fetch the room and check its property_id belongs to this tenant.
    const { data: existing, error: fetchError } = await supabase
      .from('rooms')
      .select('room_id, property_id')
      .eq('room_id', roomId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Confirm the property_id is owned by the authenticated user
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
      .update(updates)
      .eq('room_id', roomId)
      .eq('property_id', ownership.property_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ room: data })
  } catch (error) {
    console.error('[PUT /api/rooms/:id]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
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

  try {
    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('rooms')
      .select('room_id, property_id')
      .eq('room_id', roomId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const { data: ownership, error: ownerError } = await supabase
      .from('users_properties')
      .select('property_id')
      .eq('user_id', session.user.id)
      .eq('property_id', existing.property_id)
      .single()

    if (ownerError || !ownership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('room_id', roomId)
      .eq('property_id', ownership.property_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/rooms/:id]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
