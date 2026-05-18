import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/rooms/[id]/ical-feeds
 * List all iCal feeds for a room (tenant auth).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const roomId = params.id

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get tenant's property_id
    const { data: ownership, error: ownerError } = await supabase
      .from('users_properties')
      .select('property_id')
      .eq('user_id', session.user.id)
      .single()

    if (ownerError || !ownership) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const { data: feeds, error } = await supabase
      .from('ical_feeds')
      .select('*')
      .eq('room_id', roomId)
      .eq('property_id', ownership.property_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ feeds: feeds ?? [] })
  } catch (error) {
    console.error('[GET /api/rooms/:id/ical-feeds]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * POST /api/rooms/[id]/ical-feeds
 * Add a new iCal feed for a room (tenant auth).
 * Body: { source_name: string, ical_url: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const roomId = params.id

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { source_name?: string; ical_url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { source_name, ical_url } = body

  if (!source_name || !ical_url) {
    return NextResponse.json({ error: 'source_name and ical_url are required' }, { status: 400 })
  }

  // Validate URL format
  try {
    const url = new URL(ical_url)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol')
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
  }

  try {
    // Get tenant's property_id
    const { data: ownership, error: ownerError } = await supabase
      .from('users_properties')
      .select('property_id')
      .eq('user_id', session.user.id)
      .single()

    if (ownerError || !ownership) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const { data: feed, error } = await supabase
      .from('ical_feeds')
      .insert({
        room_id: roomId,
        property_id: ownership.property_id,
        source_name,
        ical_url,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ feed }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/rooms/:id/ical-feeds]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
