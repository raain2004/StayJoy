import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/knowledge-base/sections
 *
 * Dashboard endpoint — returns all knowledge base sections for the tenant's property.
 * Auth: Supabase session cookie.
 *
 * Requirements: 5.1, 5.5
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
      return NextResponse.json({ sections: [] })
    }

    const propertyId = userProperty.property_id

    // Query all sections for this property
    const { data: sections, error: sectionsError } = await supabase
      .from('knowledge_base_sections')
      .select('id, section_key, title, content, is_active, sort_order, updated_at')
      .eq('property_id', propertyId)
      .order('sort_order', { ascending: true })

    if (sectionsError) throw sectionsError

    return NextResponse.json({ sections: sections ?? [] })
  } catch (error) {
    console.error('[GET /api/knowledge-base/sections]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
