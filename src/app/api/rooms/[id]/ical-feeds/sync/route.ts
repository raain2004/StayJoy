import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { fetchAndParseICal } from '@/lib/ical/parser'

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/rooms/[id]/ical-feeds/sync
 * Trigger manual sync for all active feeds of a room (tenant auth).
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

    const propertyId = ownership.property_id

    // Get all active feeds for this room
    const { data: feeds, error: feedsError } = await supabase
      .from('ical_feeds')
      .select('*')
      .eq('room_id', roomId)
      .eq('property_id', propertyId)
      .eq('is_active', true)

    if (feedsError) throw feedsError

    if (!feeds || feeds.length === 0) {
      return NextResponse.json({ synced: 0, errors: [] })
    }

    // Use service client for upsert/delete operations (bypass RLS)
    const serviceClient = createServiceClient()
    let synced = 0
    const errors: string[] = []

    for (const feed of feeds) {
      try {
        const events = await fetchAndParseICal(feed.ical_url)

        // Upsert events into ical_bookings
        if (events.length > 0) {
          const rows = events.map((event) => ({
            feed_id: feed.id,
            room_id: roomId,
            property_id: propertyId,
            uid: event.uid,
            summary: event.summary,
            check_in: event.check_in,
            check_out: event.check_out,
            source_name: feed.source_name,
            synced_at: new Date().toISOString(),
          }))

          const { error: upsertError } = await serviceClient
            .from('ical_bookings')
            .upsert(rows, { onConflict: 'feed_id,uid' })

          if (upsertError) throw upsertError
        }

        // Delete ical_bookings that no longer exist in the feed
        const currentUids = events.map((e) => e.uid)
        const { data: existingBookings } = await serviceClient
          .from('ical_bookings')
          .select('id, uid')
          .eq('feed_id', feed.id)

        if (existingBookings) {
          const toDelete = existingBookings
            .filter((b) => !currentUids.includes(b.uid))
            .map((b) => b.id)

          if (toDelete.length > 0) {
            await serviceClient
              .from('ical_bookings')
              .delete()
              .in('id', toDelete)
          }
        }

        // Update last_synced, clear error
        await serviceClient
          .from('ical_feeds')
          .update({ last_synced: new Date().toISOString(), sync_error: null })
          .eq('id', feed.id)

        synced++
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Feed ${feed.source_name} (${feed.id}): ${errorMsg}`)

        // Update sync_error
        await serviceClient
          .from('ical_feeds')
          .update({ sync_error: errorMsg })
          .eq('id', feed.id)
      }
    }

    return NextResponse.json({ synced, errors })
  } catch (error) {
    console.error('[POST /api/rooms/:id/ical-feeds/sync]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
