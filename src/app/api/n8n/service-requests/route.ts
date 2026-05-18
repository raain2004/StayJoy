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
 * POST /api/n8n/service-requests
 * Creates a new service request (replaces Append_Services Google Sheets node)
 */
export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { property_id, conversation_id, so_phong, tag, loai_dich_vu, chi_tiet } = body

    if (!property_id) {
      return NextResponse.json({ error: 'property_id is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('service_requests')
      .insert({
        property_id,
        conversation_id: conversation_id || null,
        so_phong: so_phong || null,
        tag: tag || null,
        loai_dich_vu: loai_dich_vu || null,
        chi_tiet: chi_tiet || null,
        trang_thai: 'Mới',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ service_request: data }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/n8n/service-requests]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
