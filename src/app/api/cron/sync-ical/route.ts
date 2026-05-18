import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAndParseICal } from '@/lib/ical/parser'

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
 * POST /api/cron/sync-ical
 * Syncs ALL active feeds across all properties.
 * Auth: X-API-Key header (KNOWLEDGE_BASE_API_KEY).
 * Called by n8n scheduled workflow or external cron every 15-30 min.
 */
export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // Get all active feeds
    const { data: feeds, error: feedsError } = await supabase
      .from('ical_feeds')
      .select('*')
      .eq('is_active', true)

    if (feedsError) throw feedsError

    if (!feeds || feeds.length === 0) {
      return NextResponse.json({ total_feeds: 0, synced: 0, errors: [] })
    }

    let synced = 0
    const errors: string[] = []

    // Process feeds in batches of 5 to avoid overwhelming external servers
    const BATCH_SIZE = 5
    for (let i = 0; i < feeds.length; i += BATCH_SIZE) {
      const batch = feeds.slice(i, i + BATCH_SIZE)

      const results = await Promise.allSettled(
        batch.map(async (feed) => {
          try {
            const events = await fetchAndParseICal(feed.ical_url)

            // Upsert events
            if (events.length > 0) {
              const rows = events.map((event) => ({
                feed_id: feed.id,
                room_id: feed.room_id,
                property_id: feed.property_id,
                uid: event.uid,
                summary: event.summary,
                check_in: event.check_in,
                check_out: event.check_out,
                source_name: feed.source_name,
                synced_at: new Date().toISOString(),
              }))

              const { error: upsertError } = await supabase
                .from('ical_bookings')
                .upsert(rows, { onConflict: 'feed_id,uid' })

              if (upsertError) throw upsertError
            }

            // Delete bookings no longer in the feed
            const currentUids = events.map((e) => e.uid)
            const { data: existingBookings } = await supabase
              .from('ical_bookings')
              .select('id, uid')
              .eq('feed_id', feed.id)

            if (existingBookings) {
              const toDelete = existingBookings
                .filter((b) => !currentUids.includes(b.uid))
                .map((b) => b.id)

              if (toDelete.length > 0) {
                await supabase
                  .from('ical_bookings')
                  .delete()
                  .in('id', toDelete)
              }
            }

            // Update last_synced, clear error
            await supabase
              .from('ical_feeds')
              .update({ last_synced: new Date().toISOString(), sync_error: null })
              .eq('id', feed.id)

            return { feedId: feed.id, success: true }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error'

            // Update sync_error on the feed
            await supabase
              .from('ical_feeds')
              .update({ sync_error: errorMsg })
              .eq('id', feed.id)

            throw new Error(`Feed ${feed.source_name} (${feed.id}): ${errorMsg}`)
          }
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          synced++
        } else {
          errors.push(result.reason?.message || 'Unknown error')
        }
      }
    }

    return NextResponse.json({
      total_feeds: feeds.length,
      synced,
      errors,
    })
  } catch (error) {
    console.error('[POST /api/cron/sync-ical]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
