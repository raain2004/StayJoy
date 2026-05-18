import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .in('trang_thai', ['Mới', 'Đang xử lý'])
      .order('timestamp', { ascending: false })

    if (error) throw error

    return NextResponse.json({ serviceRequests: data ?? [] })
  } catch (error) {
    console.error('[GET /api/service-requests]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
