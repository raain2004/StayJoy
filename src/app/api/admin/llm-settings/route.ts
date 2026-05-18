import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function maskApiKey(key: string | null | undefined): string | null {
  if (!key) return null
  if (key.length <= 4) return '****'
  return '****' + key.slice(-4)
}

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

// GET /api/admin/llm-settings — returns current active LLM settings (masked keys)
export async function GET() {
  const supabase = createClient()

  const user = await getAdminUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Use service client to bypass RLS for reading settings
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await serviceClient
    .from('llm_settings')
    .select('*')
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is fine
    console.error('[GET /api/admin/llm-settings]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ settings: null })
  }

  return NextResponse.json({
    settings: {
      id: data.id,
      provider: data.provider,
      model: data.model,
      api_key_masked: maskApiKey(data.api_key),
      fallback_provider: data.fallback_provider,
      fallback_model: data.fallback_model,
      fallback_api_key_masked: maskApiKey(data.fallback_api_key),
      is_active: data.is_active,
      updated_at: data.updated_at,
    },
  })
}

// PUT /api/admin/llm-settings — upsert LLM settings
export async function PUT(request: NextRequest) {
  const supabase = createClient()

  const user = await getAdminUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    provider?: string
    model?: string
    api_key?: string
    fallback_provider?: string | null
    fallback_model?: string | null
    fallback_api_key?: string | null
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { provider, model, api_key, fallback_provider, fallback_model, fallback_api_key } = body

  if (!provider || !model || !api_key) {
    return NextResponse.json(
      { error: 'provider, model, and api_key are required' },
      { status: 400 }
    )
  }

  const validProviders = ['gemini', 'openai', 'anthropic', 'groq']
  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }
  if (fallback_provider && !validProviders.includes(fallback_provider)) {
    return NextResponse.json({ error: 'Invalid fallback_provider' }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Check if active settings exist
    const { data: existing } = await serviceClient
      .from('llm_settings')
      .select('id')
      .eq('is_active', true)
      .single()

    const settingsData = {
      provider,
      model,
      api_key,
      fallback_provider: fallback_provider || null,
      fallback_model: fallback_model || null,
      fallback_api_key: fallback_api_key || null,
      is_active: true,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }

    if (existing) {
      // Update existing
      const { error } = await serviceClient
        .from('llm_settings')
        .update(settingsData)
        .eq('id', existing.id)

      if (error) throw error
    } else {
      // Insert new
      const { error } = await serviceClient
        .from('llm_settings')
        .insert(settingsData)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PUT /api/admin/llm-settings]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
