import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidSectionKey } from '@/lib/knowledge-base/builder'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Authenticate via Supabase session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: userProperty, error: userPropertyError } = await supabase
      .from('users_properties')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (userPropertyError || !userProperty || userProperty.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { property_id, sections } = body

    // Validate payload
    if (!property_id || !sections || !Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json(
        { error: 'No valid sections in payload' },
        { status: 400 }
      )
    }

    // Separate valid and invalid sections
    const validSections: Array<{ section_key: string; title: string; content: string }> = []
    const skipped: string[] = []

    for (const section of sections) {
      if (isValidSectionKey(section.section_key)) {
        validSections.push(section)
      } else {
        skipped.push(section.section_key)
      }
    }

    // If no valid sections after filtering, return 400
    if (validSections.length === 0) {
      return NextResponse.json(
        { error: 'No valid sections in payload' },
        { status: 400 }
      )
    }

    // Upsert each valid section
    let created = 0
    let updated = 0

    for (const section of validSections) {
      // Check if section already exists
      const { data: existing } = await supabase
        .from('knowledge_base_sections')
        .select('id')
        .eq('property_id', property_id)
        .eq('section_key', section.section_key)
        .single()

      if (existing) {
        // Update existing section
        await supabase
          .from('knowledge_base_sections')
          .update({
            title: section.title,
            content: section.content,
          })
          .eq('property_id', property_id)
          .eq('section_key', section.section_key)
        updated++
      } else {
        // Create new section
        await supabase.from('knowledge_base_sections').insert({
          property_id,
          section_key: section.section_key,
          title: section.title,
          content: section.content,
          is_active: true,
          sort_order: 0,
        })
        created++
      }
    }

    return NextResponse.json({ created, updated, skipped })
  } catch (error) {
    console.error('[POST /api/knowledge-base/import]', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
