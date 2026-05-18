import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildSystemMessage, KnowledgeSection, Room } from '@/lib/knowledge-base/builder'
import { callLLM } from '@/lib/llm/provider'

/**
 * POST /api/ai/test
 *
 * Developer test endpoint — sends a question to Gemini AI using the knowledge
 * base of a specific property and returns the answer.
 *
 * Auth: Supabase session cookie.
 *   - Admin (role='admin') can test any property.
 *   - Tenant (role='owner') can only test their own property.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // --- Auth: validate Supabase session ---
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // --- Parse request body ---
    const body = await request.json()
    let { property_id, question } = body

    // --- Validate question is not empty ---
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 })
    }

    // --- Check user role and permission ---
    const { data: userProperty, error: upError } = await supabase
      .from('users_properties')
      .select('property_id, role')
      .eq('user_id', session.user.id)
      .single()

    if (upError || !userProperty) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If no property_id provided, use the user's own property
    if (!property_id) {
      property_id = userProperty.property_id
    }

    const isAdmin = userProperty.role === 'admin'
    const isOwnProperty = userProperty.property_id === property_id

    // Admin can test any property; tenant can only test their own
    if (!isAdmin && !isOwnProperty) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // --- Build system_message from knowledge base ---
    const [sectionsResult, roomsResult] = await Promise.all([
      supabase
        .from('knowledge_base_sections')
        .select('section_key, title, content, is_active, sort_order')
        .eq('property_id', property_id),
      supabase
        .from('rooms')
        .select('room_id, loai_phong, suc_chua, gia_dem')
        .eq('property_id', property_id),
    ])

    if (sectionsResult.error) throw sectionsResult.error
    if (roomsResult.error) throw roomsResult.error

    const sections: KnowledgeSection[] = sectionsResult.data ?? []
    const rooms: Room[] = roomsResult.data ?? []

    const system_message = buildSystemMessage(sections, rooms)

    // --- Call LLM (with fallback) ---
    try {
      const llmResponse = await callLLM({
        systemMessage: system_message,
        userMessage: question,
      })

      return NextResponse.json({
        answer: llmResponse.answer,
        system_message_used: system_message,
        property_id,
        model: `${llmResponse.provider}/${llmResponse.model}`,
      })
    } catch (llmError) {
      const msg = llmError instanceof Error ? llmError.message : 'LLM unavailable'
      console.error('[POST /api/ai/test] LLM error:', msg)
      return NextResponse.json(
        { error: `AI error: ${msg}` },
        { status: 502 }
      )
    }
  } catch (error) {
    console.error('[POST /api/ai/test]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
