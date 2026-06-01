import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/channels/me
 * Returns channel mappings for the current tenant's property (read-only)
 */
export async function GET() {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get property_id for the current user
    const { data: userProperty, error: ownerError } = await supabase
      .from('users_properties')
      .select('property_id')
      .eq('user_id', session.user.id)
      .single()

    if (ownerError || !userProperty) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Fetch channels for this property
    const { data: channels, error } = await supabase
      .from('channel_mappings')
      .select('id, channel, inbox_id, is_active, created_at')
      .eq('property_id', userProperty.property_id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[GET /api/channels/me]', error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }

    return NextResponse.json({ channels: channels ?? [] })
  } catch (error) {
    console.error('[GET /api/channels/me]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
