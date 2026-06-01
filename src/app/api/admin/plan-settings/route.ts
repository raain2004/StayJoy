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

// PUT /api/admin/plan-settings — edit dynamic prices and thresholds for subscriptions
export async function PUT(request: NextRequest) {
  const supabase = createClient()

  const user = await getAdminUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { plan?: unknown; pricePoints?: unknown; messageLimit?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const requestedPlan = String(body.plan).toLowerCase()
  const pricePoints = Number(body.pricePoints)
  const messageLimit = body.messageLimit !== undefined ? Number(body.messageLimit) : undefined

  if (!['lite', 'pro', 'premium'].includes(requestedPlan)) {
    return NextResponse.json({ error: 'Gói plan không hợp lệ' }, { status: 400 })
  }

  if (isNaN(pricePoints) || pricePoints < 0) {
    return NextResponse.json({ error: 'Giá điểm thưởng phải là số nguyên >= 0' }, { status: 400 })
  }

  if (messageLimit !== undefined && (isNaN(messageLimit) || messageLimit < 0)) {
    return NextResponse.json({ error: 'Giới hạn tin nhắn phải là số nguyên >= 0' }, { status: 400 })
  }

  try {
    const updates: Record<string, any> = {
      price_points: pricePoints,
      updated_at: new Date().toISOString()
    }
    if (messageLimit !== undefined) {
      updates.message_limit = messageLimit
    }

    // Update in plan_settings table
    const { data: updatedSetting, error: updateError } = await supabase
      .from('plan_settings')
      .update(updates)
      .eq('plan', requestedPlan)
      .select()
      .single()

    if (updateError) {
      console.error('[PUT /api/admin/plan-settings] Failed to update pricing:', updateError)
      return NextResponse.json({ error: 'Cập nhật giá gói cước thất bại' }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      plan: updatedSetting.plan.toUpperCase(),
      pricePoints: updatedSetting.price_points,
      messageLimit: updatedSetting.message_limit
    })

  } catch (error) {
    console.error('[PUT /api/admin/plan-settings]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
export async function GET() {
  const supabase = createClient()

  try {
    const { data: plans, error } = await supabase
      .from('plan_settings')
      .select('plan, price_points, message_limit')
      .order('price_points', { ascending: true })

    if (error) throw error

    return NextResponse.json({ plans })
  } catch (error) {
    console.error('[GET /api/admin/plan-settings]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
