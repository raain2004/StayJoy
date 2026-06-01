import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildSystemMessage, KnowledgeSection, Room } from '@/lib/knowledge-base/builder'
import { callLLM } from '@/lib/llm/provider'

/**
 * POST /api/chatwoot/webhook
 *
 * Receives webhook events from Chatwoot, processes incoming messages,
 * calls LLM with knowledge base context, and replies via Chatwoot API.
 *
 * This replaces n8n workflow entirely.
 */

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface ChatwootWebhookPayload {
  event: string
  message_type?: string
  content?: string
  conversation?: {
    id: number
    inbox_id: number
    status?: string
    contact?: {
      name?: string
      phone_number?: string
    }
  }
  inbox?: {
    id: number
  }
  account?: {
    id: number
  }
}

async function replyToChatwoot(
  accountId: number,
  conversationId: number,
  message: string,
  messageType: 'outgoing' | 'private' = 'outgoing'
) {
  const chatwootUrl = process.env.CHATWOOT_URL || 'http://chatwoot-web:3000'
  const chatwootToken = process.env.CHATWOOT_BOT_TOKEN

  if (!chatwootToken) {
    console.error('[Chatwoot Webhook] CHATWOOT_BOT_TOKEN not configured')
    return
  }

  const url = `${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api_access_token': chatwootToken,
    },
    body: JSON.stringify({
      content: message,
      message_type: messageType,
      private: messageType === 'private',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`[Chatwoot Webhook] Reply failed ${res.status}: ${text.slice(0, 200)}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload: ChatwootWebhookPayload = await request.json()

    // Only process incoming messages (from customer)
    if (payload.message_type !== 'incoming') {
      return NextResponse.json({ status: 'ignored', reason: 'not incoming' })
    }

    // Only process if conversation is pending or open
    const convStatus = payload.conversation?.status
    if (convStatus && !['pending', 'open'].includes(convStatus)) {
      return NextResponse.json({ status: 'ignored', reason: 'conversation not active' })
    }

    const content = payload.content
    if (!content || content.trim() === '') {
      return NextResponse.json({ status: 'ignored', reason: 'empty message' })
    }

    const inboxId = payload.conversation?.inbox_id || payload.inbox?.id
    const conversationId = payload.conversation?.id
    const accountId = payload.account?.id

    if (!inboxId || !conversationId || !accountId) {
      return NextResponse.json({ status: 'ignored', reason: 'missing ids' })
    }

    const supabase = createServiceClient()

    // Lookup property_id from inbox_id
    const { data: mapping } = await supabase
      .from('chatwoot_inbox_mapping')
      .select('property_id')
      .eq('inbox_id', String(inboxId))
      .single()

    if (!mapping) {
      console.error(`[Chatwoot Webhook] No mapping for inbox_id=${inboxId}`)
      return NextResponse.json({ status: 'error', reason: 'inbox not mapped' }, { status: 404 })
    }

    const propertyId = mapping.property_id

    // Check Quota and Limits
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const [subscriptionRes, usageRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('monthly_usages')
        .select('message_count')
        .eq('property_id', propertyId)
        .eq('year_month', yearMonth)
        .maybeSingle()
    ])

    const plan = subscriptionRes.data?.plan?.toLowerCase() || 'trial'
    const messageCount = usageRes.data?.message_count || 0

    const planLimits: Record<string, number> = {
      'trial': 50,
      'lite': 1000,
      'pro': 2500,
      'premium': 4000
    }
    const limit = planLimits[plan] || 1000

    if (messageCount >= limit) {
      console.log(`[Chatwoot Webhook] Quota exceeded for property=${propertyId}, plan=${plan}, count=${messageCount}/${limit}`)
      
      const isTrial = plan === 'trial'
      const exceededMessage = isTrial
        ? `⚠️ Hệ thống tự động: Homestay của bạn đang sử dụng gói dùng thử (TRIAL) và đã sử dụng hết hạn mức 50 tin nhắn miễn phí. Chatbot đã tạm ngưng. Bạn có muốn nâng cấp gói cước hay không? Vui lòng truy cập trang Ví & Thanh toán hoặc liên hệ admin để nâng cấp gói.`
        : `⚠️ Hệ thống tự động: Homestay của bạn đang sử dụng gói ${plan.toUpperCase()} và đã dùng hết giới hạn ${limit} tin nhắn miễn phí của tháng này. Chatbot đã tạm ngưng. Vui lòng chat trực tiếp với khách hoặc nâng cấp gói để tiếp tục sử dụng.`

      await replyToChatwoot(
        accountId, 
        conversationId, 
        exceededMessage,
        'private'
      )
      return NextResponse.json({ status: 'quota_exceeded' })
    }

    // Build system message from knowledge base
    const [sectionsResult, roomsResult] = await Promise.all([
      supabase
        .from('knowledge_base_sections')
        .select('section_key, title, content, is_active, sort_order')
        .eq('property_id', propertyId),
      supabase
        .from('rooms')
        .select('room_id, loai_phong, suc_chua, gia_dem')
        .eq('property_id', propertyId),
    ])

    const sections: KnowledgeSection[] = sectionsResult.data ?? []
    const rooms: Room[] = roomsResult.data ?? []
    const systemMessage = buildSystemMessage(sections, rooms, plan)

    // Call LLM
    const llmResponse = await callLLM(
      { systemMessage, userMessage: content },
      propertyId,
      plan
    )

    // Reply to Chatwoot
    await replyToChatwoot(accountId, conversationId, llmResponse.answer)

    // Increment usage asynchronously
    supabase.rpc('increment_monthly_usage', {
      p_property_id: propertyId,
      p_year_month: yearMonth
    }).then(({ error }) => {
      if (error) console.error('[Chatwoot Webhook] Failed to increment usage:', error)
    })

    // Record LLM usage in logs asynchronously if usage data exists
    if (llmResponse.usage) {
      supabase.from('llm_usage_logs').insert({
        property_id: propertyId,
        provider: llmResponse.provider,
        model: llmResponse.model,
        input_tokens: llmResponse.usage.inputTokens,
        output_tokens: llmResponse.usage.outputTokens,
        total_tokens: llmResponse.usage.totalTokens,
        year_month: yearMonth
      }).then(({ error }) => {
        if (error) console.error('[Chatwoot Webhook] Failed to save LLM usage log:', error)
      })
    }

    return NextResponse.json({
      status: 'ok',
      provider: llmResponse.provider,
      model: llmResponse.model,
    })
  } catch (error) {
    console.error('[POST /api/chatwoot/webhook]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
