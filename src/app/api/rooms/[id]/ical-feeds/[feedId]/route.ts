import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/rooms/[id]/ical-feeds/[feedId]
 * Remove a feed (tenant auth). Associated ical_bookings are deleted via CASCADE.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; feedId: string } }
) {
  const supabase = createClient()
  const { id: roomId, feedId } = params

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

    // Verify the feed belongs to this room and property
    const { data: feed, error: feedError } = await supabase
      .from('ical_feeds')
      .select('id')
      .eq('id', feedId)
      .eq('room_id', roomId)
      .eq('property_id', ownership.property_id)
      .single()

    if (feedError || !feed) {
      return NextResponse.json({ error: 'Feed not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('ical_feeds')
      .delete()
      .eq('id', feedId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/rooms/:id/ical-feeds/:feedId]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
