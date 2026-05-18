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

// GET /api/admin/subscriptions — list all subscriptions
export async function GET() {
  const supabase = createClient()

  const user = await getAdminUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        plan,
        status,
        started_at,
        expires_at,
        trial_ends_at,
        property_id,
        properties (
          id,
          name
        )
      `)
      .order('started_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ subscriptions: data })
  } catch (error) {
    console.error('[GET /api/admin/subscriptions]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
