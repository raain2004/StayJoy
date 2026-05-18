import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidSectionKey } from '@/lib/knowledge-base/builder'

/**
 * PUT /api/knowledge-base/sections/[section_key]
 *
 * Dashboard endpoint — upserts a knowledge base section for the tenant's property.
 * Auth: Supabase session cookie.
 *
 * - Validates section_key belongs to VALID_SECTION_KEYS (400 if invalid)
 * - Validates content if provided: not empty/whitespace-only (400), max 5000 chars (400)
 * - Verifies section belongs to tenant's property (403 if not)
 * - Upserts (property_id, section_key) — creates if not exists, updates if exists
 * - Returns { section: { ...updated } } with HTTP 200
 *
 * Requirements: 5.2, 5.3, 5.5, 5.6
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { section_key: string } }
) {
  try {
    const supabase = createClient()

    // --- Auth: validate Supabase session ---
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // --- Validate section_key ---
    const { section_key } = params
    if (!isValidSectionKey(section_key)) {
      return NextResponse.json({ error: 'invalid section_key' }, { status: 400 })
    }

    // --- Parse request body ---
    let body: {
      title?: unknown
      content?: unknown
      is_active?: unknown
      sort_order?: unknown
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // --- Validate content if provided ---
    if (body.content !== undefined) {
      const content = String(body.content)
      if (content.trim().length === 0) {
        return NextResponse.json({ error: 'content is required' }, { status: 400 })
      }
      if (content.length > 5000) {
        return NextResponse.json({ error: 'content exceeds 5000 characters' }, { status: 400 })
      }
    }

    // --- Get tenant's property_id ---
    const { data: ownership, error: ownerError } = await supabase
      .from('users_properties')
      .select('property_id')
      .eq('user_id', session.user.id)
      .single()

    if (ownerError || !ownership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const propertyId = ownership.property_id

    // --- Check if section already exists ---
    const { data: existing } = await supabase
      .from('knowledge_base_sections')
      .select('id')
      .eq('property_id', propertyId)
      .eq('section_key', section_key)
      .single()

    let data
    let error

    if (existing) {
      // --- Update existing section ---
      const updates: Record<string, unknown> = {}
      if (body.title !== undefined) updates.title = String(body.title)
      if (body.content !== undefined) updates.content = String(body.content)
      if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active)
      if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order)

      const result = await supabase
        .from('knowledge_base_sections')
        .update(updates)
        .eq('property_id', propertyId)
        .eq('section_key', section_key)
        .select()
        .single()

      data = result.data
      error = result.error
    } else {
      // --- Create new section (upsert) ---
      const insertData: Record<string, unknown> = {
        property_id: propertyId,
        section_key,
        title: body.title !== undefined ? String(body.title) : section_key,
        content: body.content !== undefined ? String(body.content) : '',
      }
      if (body.is_active !== undefined) insertData.is_active = Boolean(body.is_active)
      if (body.sort_order !== undefined) insertData.sort_order = Number(body.sort_order)

      const result = await supabase
        .from('knowledge_base_sections')
        .insert(insertData)
        .select()
        .single()

      data = result.data
      error = result.error
    }

    if (error) throw error

    return NextResponse.json({ section: data })
  } catch (error) {
    console.error('[PUT /api/knowledge-base/sections/[section_key]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
