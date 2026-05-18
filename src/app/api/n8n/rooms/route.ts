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
 * GET /api/n8n/rooms?property_id=xxx
 * Returns room list for a property (replaces Read_RoomList Google Sheets node)
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
    const { data, error } = await supabase
      .from('rooms')
      .select('room_id, loai_phong, suc_chua, gia_dem')
      .eq('property_id', propertyId)

    if (error) throw error

    return NextResponse.json({ rooms: data ?? [] })
  } catch (error) {
    console.error('[GET /api/n8n/rooms]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
