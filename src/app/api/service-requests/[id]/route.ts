import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requestId = parseInt(params.id, 10)
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid service request ID' }, { status: 400 })
  }

  try {
    // RLS ensures tenant can only access their own property's records
    const { data: existing, error: fetchError } = await supabase
      .from('service_requests')
      .select('id, property_id')
      .eq('id', requestId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('service_requests')
      .update({ trang_thai: 'Hoàn thành' })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ serviceRequest: data })
  } catch (error) {
    console.error('[PATCH /api/service-requests/:id]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
