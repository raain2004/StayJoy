import { NextResponse } from 'next/server'
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
