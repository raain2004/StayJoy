import { NextRequest, NextResponse } from 'next/server'

// Configuration for local Chatwoot instance deployment
const CHATWOOT_URL = process.env.CHATWOOT_URL || 'http://chatwoot-web:3000'
const CHATWOOT_TOKEN = process.env.CHATWOOT_BOT_TOKEN
const ACCOUNT_ID = '2' // StayJoy primary account ID

// GET /api/cron/auto-resolve — Automatically resolves open conversations with 45 minutes of inactivity
export async function GET() {
  if (!CHATWOOT_TOKEN) {
    console.error('[Cron Auto Resolve] CHATWOOT_BOT_TOKEN not configured')
    return NextResponse.json({ error: 'Missing Chatwoot Token' }, { status: 500 })
  }

  try {
    // 1. Fetch all conversations with "open" status from Chatwoot API
    const listUrl = `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations?status=open`
    const listRes = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'api_access_token': CHATWOOT_TOKEN,
        'Content-Type': 'application/json'
      }
    })

    if (!listRes.ok) {
      const text = await listRes.text()
      throw new Error(`Failed to fetch conversations from Chatwoot: ${listRes.status} - ${text}`)
    }

    const resData = await listRes.json()
    const conversations = Array.isArray(resData) ? resData : (resData.payload || [])
    const now = new Date()
    // Configure threshold: 45 minutes of inactivity
    const FORTY_FIVE_MINUTES_MS = 45 * 60 * 1000
    let autoResolvedCount = 0

    // 2. Iterate through each open conversation to analyze activity age
    for (const conv of conversations) {
      // Use last_activity_at (or updated_at as fallback) to calculate inactive duration
      const lastActivityTime = conv.last_activity_at || conv.updated_at
      if (!lastActivityTime) continue

      const lastActivity = new Date(lastActivityTime)
      const inactiveDuration = now.getTime() - lastActivity.getTime()

      if (inactiveDuration > FORTY_FIVE_MINUTES_MS) {
        console.log(`[Cron Auto Resolve] Conversation ${conv.id} is inactive for ${Math.round(inactiveDuration / 60000)} mins. Resolving...`)

        // 3. Send PUT request to transition status to "resolved" (which fires Chatwoot CSAT survey automatically!)
        const updateUrl = `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conv.id}`
        const updateRes = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'api_access_token': CHATWOOT_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'resolved' })
        })

        if (updateRes.ok) {
          autoResolvedCount++
        } else {
          const errText = await updateRes.text()
          console.error(`[Cron Auto Resolve] Failed to resolve conversation ${conv.id}: ${updateRes.status} - ${errText}`)
        }
      }
    }

    return NextResponse.json({
      status: 'ok',
      activeConversationsChecked: conversations.length,
      autoResolvedCount
    })

  } catch (error: any) {
    console.error('[GET /api/cron/auto-resolve] Cron handler error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
