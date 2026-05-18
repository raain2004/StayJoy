import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAdminUser(supabase: ReturnType<typeof createClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: userProperty } = await supabase
    .from('users_properties')
    .select('role')
    .eq('user_id', session.user.id)
    .limit(1)
    .single()

  if (!userProperty || userProperty.role !== 'admin') return null
  return session.user
}

// PATCH /api/admin/subscriptions/:id — update plan/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const user = await getAdminUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { plan?: unknown; status?: unknown; expires_at?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, string> = {}
  if (body.plan !== undefined) updates.plan = String(body.plan)
  if (body.status !== undefined) updates.status = String(body.status)
  if (body.expires_at !== undefined) updates.expires_at = String(body.expires_at)

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', params.id)
      .select('id, plan, status, expires_at, trial_ends_at, property_id')
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    return NextResponse.json({ subscription: data })
  } catch (error) {
    console.error('[PATCH /api/admin/subscriptions/:id]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
