import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const CHATWOOT_BASE = process.env.CHATWOOT_BASE_URL!
const CHATWOOT_ACCOUNT = process.env.CHATWOOT_ACCOUNT_ID!
const CHATWOOT_TOKEN = process.env.CHATWOOT_API_TOKEN!

async function chatwootFetch(path: string) {
  const res = await fetch(`${CHATWOOT_BASE}/api/v1/accounts/${CHATWOOT_ACCOUNT}${path}`, {
    headers: { 'api_access_token': CHATWOOT_TOKEN },
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Chatwoot error: ${res.status}`)
  return res.json()
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get property's inbox_id from chatwoot_inbox_mapping
  const { data: userProp } = await supabase
    .from('users_properties')
    .select('property_id')
    .eq('user_id', user.id)
    .single()

  if (!userProp) return NextResponse.json({ error: 'No property' }, { status: 403 })

  const { data: mapping } = await supabase
    .from('chatwoot_inbox_mapping')
    .select('inbox_id')
    .eq('property_id', userProp.property_id)
    .single()

  // Use mapped inbox_id or fallback to query param
  const { searchParams } = new URL(request.url)
  const page = searchParams.get('page') || '1'
  const status = searchParams.get('status') || 'all'
  const inboxId = mapping?.inbox_id

  const inboxFilter = inboxId ? `&inbox_id=${inboxId}` : ''

  let allConversations: any[] = []
  let meta: any = {}

  if (status === 'all') {
    // Chatwoot doesn't have a true "all" filter — fetch open + pending + resolved
    const [openData, pendingData, resolvedData] = await Promise.all([
      chatwootFetch(`/conversations?page=${page}${inboxFilter}&status=open`),
      chatwootFetch(`/conversations?page=${page}${inboxFilter}&status=pending`),
      chatwootFetch(`/conversations?page=${page}${inboxFilter}&status=resolved`),
    ])

    const openConvs = openData.data?.payload || []
    const pendingConvs = pendingData.data?.payload || []
    const resolvedConvs = resolvedData.data?.payload || []

    allConversations = [...pendingConvs, ...openConvs, ...resolvedConvs]
    meta = {
      all_count: (openData.data?.meta?.all_count || 0) + (pendingData.data?.meta?.all_count || 0) + (resolvedData.data?.meta?.all_count || 0),
      open_count: openData.data?.meta?.all_count || 0,
      resolved_count: resolvedData.data?.meta?.all_count || 0,
    }
  } else {
    const data = await chatwootFetch(
      `/conversations?page=${page}${inboxFilter}&status=${status}`
    )
    allConversations = data.data?.payload || []
    meta = data.data?.meta || {}
  }
  // Calculate stats for current month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000
  const thisMonth = allConversations.filter((c: any) => c.created_at >= startOfMonth)

  const stats = {
    total: meta.all_count || allConversations.length,
    open: meta.open_count || 0,
    resolved: meta.resolved_count || 0,
    thisMonth: thisMonth.length,
  }

  return NextResponse.json({
    conversations: allConversations,
    meta: meta || {},
    stats,
  })
}
