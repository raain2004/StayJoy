import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { estimateCost } from '@/lib/llm/pricing'

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

export async function GET() {
  const supabase = createClient()

  const user = await getAdminUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // 1. Fetch properties and their subscription details
    const [propertiesRes, subscriptionsRes] = await Promise.all([
      supabase.from('properties').select('id, name'),
      supabase.from('subscriptions').select('property_id, plan, status')
    ])

    const properties = propertiesRes.data || []
    const subscriptions = subscriptionsRes.data || []

    const propertyInfoMap = properties.reduce((acc, curr) => {
      // Find latest subscription
      const sub = subscriptions
        .filter(s => s.property_id === curr.id)
        .reverse()[0] // Get last one or trial
      acc[curr.id] = {
        name: curr.name,
        plan: sub?.plan?.toUpperCase() || 'TRIAL',
        planStatus: sub?.status || 'active'
      }
      return acc
    }, {} as Record<string, { name: string; plan: string; planStatus: string }>)

    // 2. Fetch past 6 months list
    const now = new Date()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    
    const monthsList: string[] = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1)
      monthsList.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    // 3. Fetch monthly messages for all properties
    const { data: allMonthlyUsages } = await supabase
      .from('monthly_usages')
      .select('property_id, year_month, message_count')
      .in('year_month', monthsList)

    // 4. Fetch past 6 months LLM usage logs for ALL properties
    const { data: logs } = await supabase
      .from('llm_usage_logs')
      .select('property_id, year_month, model, input_tokens, output_tokens, total_tokens')
      .in('year_month', monthsList)

    // 5. Aggregate Global & Trend Metrics
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalTokens = 0
    let totalCost = 0
    let totalCalls = logs?.length ?? 0

    const trendByMonth = monthsList.reduce((acc, m) => {
      acc[m] = { month: m, inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0, messages: 0 }
      return acc
    }, {} as Record<string, { month: string; inputTokens: number; outputTokens: number; totalTokens: number; cost: number; messages: number }>)

    // Add message counts to trend
    allMonthlyUsages?.forEach(u => {
      if (trendByMonth[u.year_month]) {
        trendByMonth[u.year_month].messages += u.message_count
      }
    })

    // Process logs for global, trend, model and property aggregation
    const modelStats: Record<string, { model: string; inputTokens: number; outputTokens: number; totalTokens: number; cost: number; calls: number }> = {}
    const propertyStats: Record<string, { propertyId: string; name: string; plan: string; inputTokens: number; outputTokens: number; totalTokens: number; cost: number; messages: number }> = {}

    // Initialize property stats for all properties
    properties.forEach(p => {
      const info = propertyInfoMap[p.id] || { name: p.name, plan: 'TRIAL' }
      propertyStats[p.id] = {
        propertyId: p.id,
        name: info.name,
        plan: info.plan,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        messages: 0
      }
    })

    // Add messages to property aggregation (sum of months)
    allMonthlyUsages?.forEach(u => {
      if (propertyStats[u.property_id]) {
        propertyStats[u.property_id].messages += u.message_count
      }
    })

    logs?.forEach(log => {
      const cost = estimateCost(log.model, log.input_tokens, log.output_tokens)
      
      // Global totals
      totalInputTokens += log.input_tokens
      totalOutputTokens += log.output_tokens
      totalTokens += log.total_tokens
      totalCost += cost

      // Trend aggregation
      if (trendByMonth[log.year_month]) {
        trendByMonth[log.year_month].inputTokens += log.input_tokens
        trendByMonth[log.year_month].outputTokens += log.output_tokens
        trendByMonth[log.year_month].totalTokens += log.total_tokens
        trendByMonth[log.year_month].cost += cost
      }

      // Model breakdown
      if (!modelStats[log.model]) {
        modelStats[log.model] = { model: log.model, inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0, calls: 0 }
      }
      modelStats[log.model].inputTokens += log.input_tokens
      modelStats[log.model].outputTokens += log.output_tokens
      modelStats[log.model].totalTokens += log.total_tokens
      modelStats[log.model].cost += cost
      modelStats[log.model].calls += 1

      // Property breakdown
      if (propertyStats[log.property_id]) {
        propertyStats[log.property_id].inputTokens += log.input_tokens
        propertyStats[log.property_id].outputTokens += log.output_tokens
        propertyStats[log.property_id].totalTokens += log.total_tokens
        propertyStats[log.property_id].cost += cost
      }
    })

    const trend = Object.values(trendByMonth)
    const models = Object.values(modelStats).sort((a, b) => b.totalTokens - a.totalTokens)
    const propertyLeaderboard = Object.values(propertyStats)
      .sort((a, b) => b.totalTokens - a.totalTokens) // rank by volume
      .map(p => ({
        ...p,
        // Fallback for messages
        messages: p.messages || 0
      }))

    return NextResponse.json({
      global: {
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        totalCost,
        totalCalls,
        totalMessages: propertyLeaderboard.reduce((sum, p) => sum + p.messages, 0)
      },
      trend,
      models,
      properties: propertyLeaderboard
    })

  } catch (error) {
    console.error('[GET /api/admin/analytics]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
