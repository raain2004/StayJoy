import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/rooms/[id]/images/public?property_id=xxx
 *
 * Public endpoint for n8n to fetch room images.
 * Auth: X-API-Key header (same as knowledge-base endpoint).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = request.headers.get('X-API-Key')
    if (!apiKey || apiKey !== process.env.KNOWLEDGE_BASE_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roomId = params.id
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')

    if (!propertyId) {
      return NextResponse.json({ error: 'property_id is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: images, error } = await supabase
      .from('room_images')
      .select('id, image_url, sort_order')
      .eq('room_id', roomId)
      .eq('property_id', propertyId)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      room_id: roomId,
      property_id: propertyId,
      images: (images ?? []).map((img) => img.image_url),
    })
  } catch (error) {
    console.error('[GET /api/rooms/:id/images/public]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
