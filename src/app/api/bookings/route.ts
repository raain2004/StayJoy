import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  try {
    let query = supabase
      .from('bookings')
      .select('*')
      .order('check_in', { ascending: false })

    if (status) {
      query = query.eq('tinh_trang', status)
    }
    if (dateFrom) {
      query = query.gte('check_in', dateFrom)
    }
    if (dateTo) {
      query = query.lte('check_in', dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ bookings: data ?? [] })
  } catch (error) {
    console.error('[GET /api/bookings]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
