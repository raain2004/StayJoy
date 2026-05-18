import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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

// POST /api/admin/onboard — create property + subscription (trial) + chatwoot_inbox_mapping + auth user + users_properties
// NOTE: We use SUPABASE_SERVICE_ROLE_KEY here because creating auth.users requires admin privileges
// that are not available via the anon key. The service role key is only used server-side in this
// API route and is never exposed to the client.
export async function POST(request: NextRequest) {
  const supabase = createClient()

  const adminUser = await getAdminUser(supabase)
  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    property_name?: unknown
    address?: unknown
    hotline?: unknown
    description?: unknown
    inbox_id?: unknown
    owner_email?: unknown
    owner_password?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { property_name, address, hotline, description, inbox_id, owner_email, owner_password } = body

  if (!property_name || !owner_email || !owner_password) {
    return NextResponse.json(
      { error: 'property_name, owner_email, and owner_password are required' },
      { status: 400 }
    )
  }

  // Service role client — needed to create auth.users
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Track created IDs for rollback
  let propertyId: string | null = null
  let newUserId: string | null = null

  try {
    // Step 1: Create property
    const { data: property, error: propError } = await serviceClient
      .from('properties')
      .insert({
        name: String(property_name),
        address: address ? String(address) : null,
        hotline: hotline ? String(hotline) : null,
        description: description ? String(description) : null,
      })
      .select('id')
      .single()

    if (propError || !property) {
      throw new Error(`Failed to create property: ${propError?.message}`)
    }
    propertyId = property.id

    // Step 2: Create subscription (trial, 14 days)
    const { error: subError } = await serviceClient
      .from('subscriptions')
      .insert({
        property_id: propertyId,
        plan: 'trial',
        status: 'trial',
        started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })

    if (subError) {
      throw new Error(`Failed to create subscription: ${subError.message}`)
    }

    // Step 3: Create chatwoot_inbox_mapping (if inbox_id provided)
    if (inbox_id) {
      const { error: inboxError } = await serviceClient
        .from('chatwoot_inbox_mapping')
        .insert({
          inbox_id: String(inbox_id),
          property_id: propertyId,
        })

      if (inboxError) {
        throw new Error(`Failed to create inbox mapping: ${inboxError.message}`)
      }
    }

    // Step 4: Create auth user
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: String(owner_email),
      password: String(owner_password),
      email_confirm: true,
    })

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authError?.message}`)
    }
    newUserId = authData.user.id

    // Step 5: Link user to property with role = owner
    const { error: upError } = await serviceClient
      .from('users_properties')
      .insert({
        user_id: newUserId,
        property_id: propertyId,
        role: 'owner',
      })

    if (upError) {
      throw new Error(`Failed to link user to property: ${upError.message}`)
    }

    return NextResponse.json({
      success: true,
      property_id: propertyId,
      user_id: newUserId,
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/onboard] Error, rolling back:', error instanceof Error ? error.message : error)

    // Rollback: delete in reverse order
    if (newUserId) {
      await serviceClient.auth.admin.deleteUser(newUserId).catch((e) =>
        console.error('Rollback: failed to delete auth user', e)
      )
    }
    if (propertyId) {
      // Cascade delete will remove subscriptions, chatwoot_inbox_mapping, users_properties
      try {
        await serviceClient.from('properties').delete().eq('id', propertyId)
      } catch (e) {
        console.error('Rollback: failed to delete property', e)
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Onboard failed' },
      { status: 500 }
    )
  }
}
