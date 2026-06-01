import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // RLS automatically filters rooms to only those belonging to the tenant's property
    const { data, error } = await supabase
      .from('rooms')
      .select('room_id, property_id, loai_phong, suc_chua, gia_dem')
      .order('room_id', { ascending: true })

    if (error) throw error

    return NextResponse.json({ rooms: data ?? [] })
  } catch (error) {
    console.error('[GET /api/rooms]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    room_id?: unknown
    loai_phong?: unknown
    suc_chua?: unknown
    gia_dem?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { room_id, loai_phong, suc_chua, gia_dem } = body

  // Validate required fields
  if (!room_id || typeof room_id !== 'string' || room_id.trim() === '') {
    return NextResponse.json({ error: 'room_id is required' }, { status: 400 })
  }
  if (!loai_phong || typeof loai_phong !== 'string' || loai_phong.trim() === '') {
    return NextResponse.json({ error: 'loai_phong is required' }, { status: 400 })
  }
  const sucChuaNum = Number(suc_chua)
  if (!Number.isInteger(sucChuaNum) || sucChuaNum < 1) {
    return NextResponse.json({ error: 'suc_chua must be a positive integer' }, { status: 400 })
  }
  const giaDemNum = Number(gia_dem)
  if (!Number.isInteger(giaDemNum) || giaDemNum < 0) {
    return NextResponse.json({ error: 'gia_dem must be a non-negative integer' }, { status: 400 })
  }

  try {
    // Get the property_id for the current user
    const { data: ownership, error: ownerError } = await supabase
      .from('users_properties')
      .select('property_id')
      .eq('user_id', session.user.id)
      .single()

    if (ownerError || !ownership) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Check if room_id already exists for this property
    const { data: existing } = await supabase
      .from('rooms')
      .select('room_id')
      .eq('room_id', String(room_id).trim())
      .eq('property_id', ownership.property_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Số phòng đã tồn tại' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        room_id: String(room_id).trim(),
        property_id: ownership.property_id,
        loai_phong: String(loai_phong).trim(),
        suc_chua: sucChuaNum,
        gia_dem: giaDemNum,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Số phòng đã tồn tại' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ room: data }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/rooms]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
