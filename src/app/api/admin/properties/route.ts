import { NextResponse } from 'next/server'
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

// GET /api/admin/properties — all properties with subscription status
export async function GET() {
  const supabase = createClient()

  const user = await getAdminUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        address,
        hotline,
        subscriptions (
          id,
          plan,
          status,
          started_at,
          expires_at,
          trial_ends_at
        )
      `)
      .order('name')

    if (error) throw error

    return NextResponse.json({ properties: data })
  } catch (error) {
    console.error('[GET /api/admin/properties]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
