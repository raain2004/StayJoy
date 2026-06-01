import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/wallet/subscribe — handle point deduction, billing log, and plan subscription updates
export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { plan?: unknown; durationMonths?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const requestedPlan = String(body.plan).toLowerCase()
  const durationMonths = Number(body.durationMonths) || 1

  if (!['lite', 'pro', 'premium'].includes(requestedPlan)) {
    return NextResponse.json({ error: 'Gói đăng ký không hợp lệ' }, { status: 400 })
  }

  try {
    // 1. Get property_id
    const { data: propertyData, error: propError } = await supabase
      .from('users_properties')
      .select('property_id')
      .eq('user_id', session.user.id)
      .single()

    if (propError || !propertyData) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const propertyId = propertyData.property_id

    // 2. Fetch dynamic plan settings to get points cost
    const { data: planSettings, error: settingsError } = await supabase
      .from('plan_settings')
      .select('price_points')
      .eq('plan', requestedPlan)
      .single()

    if (settingsError || !planSettings) {
      return NextResponse.json({ error: 'Plan pricing settings not found' }, { status: 404 })
    }

    const costPerMonth = planSettings.price_points
    const totalCostPoints = costPerMonth * durationMonths

    // 3. Fetch current wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('points_balance')
      .eq('property_id', propertyId)
      .maybeSingle()

    const currentBalance = wallet?.points_balance ?? 0
    if (currentBalance < totalCostPoints) {
      return NextResponse.json({
        error: `Số dư điểm thưởng không đủ. Bạn cần ${totalCostPoints} điểm nhưng hiện tại chỉ có ${currentBalance} điểm.`
      }, { status: 400 })
    }

    // 4. Query current active subscription
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('id, plan, expires_at, status')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const now = new Date()
    let newExpiresAt = new Date()
    let isUpgrade = false

    if (currentSub) {
      const currentExpiresAt = currentSub.expires_at ? new Date(currentSub.expires_at) : null
      const isExpired = currentExpiresAt ? currentExpiresAt < now : true

      if (!isExpired && currentSub.plan.toLowerCase() === requestedPlan) {
        // Extend existing subscription expiration date
        newExpiresAt = new Date(currentExpiresAt!.getTime())
        newExpiresAt.setMonth(newExpiresAt.getMonth() + durationMonths)
      } else {
        // Upgrading plan or renewing an expired subscription (starts from NOW)
        newExpiresAt.setMonth(newExpiresAt.getMonth() + durationMonths)
        if (!isExpired && currentSub.plan.toLowerCase() !== requestedPlan) {
          isUpgrade = true
        }
      }
    } else {
      // First time subscription
      newExpiresAt.setMonth(newExpiresAt.getMonth() + durationMonths)
    }

    // 5. Deduct points from wallet (RLS handles update permissions)
    const { error: walletUpdateError } = await supabase
      .from('wallets')
      .update({ points_balance: currentBalance - totalCostPoints })
      .eq('property_id', propertyId)

    if (walletUpdateError) {
      console.error('[POST /api/wallet/subscribe] Failed to deduct wallet points:', walletUpdateError)
      return NextResponse.json({ error: 'Trừ điểm ví thất bại' }, { status: 500 })
    }

    // 6. Write debit transaction history log
    const txType = isUpgrade ? 'upgrade' : 'renew'
    const planLabel = requestedPlan.toUpperCase()
    const description = isUpgrade 
      ? `Nâng cấp lên gói ${planLabel} (${durationMonths} tháng) bằng điểm thưởng`
      : `Gia hạn gói ${planLabel} (${durationMonths} tháng) bằng điểm thưởng`

    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        property_id: propertyId,
        amount_vnd: 0,
        points: totalCostPoints, // record cost
        type: txType,
        status: 'success',
        description
      })

    if (txError) {
      console.error('[POST /api/wallet/subscribe] Failed to write spending log:', txError)
    }

    // 7. Update/Create subscription record in database
    if (currentSub) {
      const { error: subUpdateError } = await supabase
        .from('subscriptions')
        .update({
          plan: requestedPlan,
          status: 'active',
          started_at: now.toISOString(),
          expires_at: newExpiresAt.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', currentSub.id)

      if (subUpdateError) {
        console.error('[POST /api/wallet/subscribe] Failed to update subscription:', subUpdateError)
        return NextResponse.json({ error: 'Cập nhật gói cước thất bại' }, { status: 500 })
      }
    } else {
      const { error: subInsertError } = await supabase
        .from('subscriptions')
        .insert({
          property_id: propertyId,
          plan: requestedPlan,
          status: 'active',
          started_at: now.toISOString(),
          expires_at: newExpiresAt.toISOString()
        })

      if (subInsertError) {
        console.error('[POST /api/wallet/subscribe] Failed to insert subscription:', subInsertError)
        return NextResponse.json({ error: 'Đăng ký gói cước thất bại' }, { status: 500 })
      }
    }

    return NextResponse.json({
      status: 'ok',
      plan: requestedPlan.toUpperCase(),
      expiresAt: newExpiresAt.toISOString(),
      deductedPoints: totalCostPoints
    })

  } catch (error) {
    console.error('[POST /api/wallet/subscribe]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
