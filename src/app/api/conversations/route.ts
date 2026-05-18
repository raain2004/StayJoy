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
  const statusFilter = status !== 'all' ? `&status=${status}` : ''

  const data = await chatwootFetch(
    `/conversations?page=${page}${inboxFilter}${statusFilter}`
  )

  // Calculate stats for current month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000

  const allConversations = data.data?.payload || []
  const thisMonth = allConversations.filter((c: any) => c.created_at >= startOfMonth)

  const stats = {
    total: data.data?.meta?.all_count || 0,
    open: data.data?.meta?.open_count || 0,
    resolved: data.data?.meta?.resolved_count || 0,
    thisMonth: thisMonth.length,
  }

  return NextResponse.json({
    conversations: allConversations,
    meta: data.data?.meta || {},
    stats,
  })
}
