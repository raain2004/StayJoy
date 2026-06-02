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

// PATCH /api/admin/properties/:id — update property name, address, hotline, plan, expires_at
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const user = await getAdminUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    name?: unknown
    address?: unknown
    hotline?: unknown
    plan?: unknown
    expires_at?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, any> = {}
  if (body.name !== undefined) updates.name = String(body.name)
  if (body.address !== undefined) updates.address = body.address ? String(body.address) : null
  if (body.hotline !== undefined) updates.hotline = body.hotline ? String(body.hotline) : null
  if (body.plan !== undefined) updates.plan = String(body.plan).toLowerCase()
  if (body.expires_at !== undefined) updates.expires_at = body.expires_at ? String(body.expires_at) : null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', params.id)
      .select('id, name, address, hotline, plan, expires_at')
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json({ property: data })
  } catch (error) {
    console.error('[PATCH /api/admin/properties/:id]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
