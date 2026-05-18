import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildSystemMessage, KnowledgeSection, Room } from '@/lib/knowledge-base/builder'

/**
 * GET /api/knowledge-base/preview
 *
 * Dashboard endpoint — builds and returns the full system_message for the
 * tenant's property, exactly as n8n would receive it. Used by the PreviewModal
 * so tenants can inspect what the chatbot "sees".
 *
 * Auth: Supabase session cookie.
 *
 * Requirements: 3.10, 5.4, 5.5
 */
export async function GET() {
  try {
    const supabase = createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Lookup property_id from users_properties
    const { data: userProperty, error: upError } = await supabase
      .from('users_properties')
      .select('property_id')
      .eq('user_id', session.user.id)
      .single()

    if (upError || !userProperty) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const propertyId = userProperty.property_id

    // Query knowledge_base_sections and rooms in parallel
    const [sectionsResult, roomsResult] = await Promise.all([
      supabase
        .from('knowledge_base_sections')
        .select('section_key, title, content, is_active, sort_order')
        .eq('property_id', propertyId),
      supabase
        .from('rooms')
        .select('room_id, loai_phong, suc_chua, gia_dem')
        .eq('property_id', propertyId),
    ])

    if (sectionsResult.error) throw sectionsResult.error
    if (roomsResult.error) throw roomsResult.error

    const sections: KnowledgeSection[] = sectionsResult.data ?? []
    const rooms: Room[] = roomsResult.data ?? []

    // Build system message
    const system_message = buildSystemMessage(sections, rooms)

    return NextResponse.json({ system_message, property_id: propertyId })
  } catch (error) {
    console.error('[GET /api/knowledge-base/preview]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
