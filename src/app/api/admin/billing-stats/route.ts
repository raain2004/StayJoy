import { NextResponse } from 'next/server'
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

// GET /api/admin/billing-stats — aggregate revenue logs and historical trends for administration panel
export async function GET() {
  const supabase = createClient()

  const user = await getAdminUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // 1. Fetch properties for name lookup
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name')
    
    if (propError) throw propError

    // 2. Fetch all successful transactions
    const { data: transactions, error: txError } = await supabase
      .from('wallet_transactions')
      .select('property_id, amount_vnd, points, type, status, created_at')
      .eq('status', 'success')

    if (txError) throw txError

    // 3. Fetch wallets for current balance breakdown
    const { data: wallets } = await supabase
      .from('wallets')
      .select('property_id, points_balance')

    const walletBalances = wallets?.reduce((acc, curr) => {
      acc[curr.property_id] = curr.points_balance
      return acc
    }, {} as Record<string, number>) || {}

    // 4. Generate past 6 months list
    const now = new Date()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    
    const monthsList: string[] = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1)
      monthsList.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    // 5. Aggregate metrics
    let totalVNDLoaded = 0
    let totalPointsLoaded = 0
    let totalPointsSpent = 0

    const trendByMonth = monthsList.reduce((acc, m) => {
      acc[m] = { month: m, amountVnd: 0, pointsSpent: 0 }
      return acc
    }, {} as Record<string, { month: string; amountVnd: number; pointsSpent: number }>)

    const propertyAggregates: Record<string, { propertyId: string; name: string; totalVnd: number; totalPointsLoaded: number; totalPointsSpent: number; currentBalance: number }> = {}

    // Initialize property aggregates
    properties?.forEach(p => {
      propertyAggregates[p.id] = {
        propertyId: p.id,
        name: p.name,
        totalVnd: 0,
        totalPointsLoaded: 0,
        totalPointsSpent: 0,
        currentBalance: walletBalances[p.id] || 0
      }
    })

    // Process transactions
    transactions?.forEach(tx => {
      const date = new Date(tx.created_at)
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const amountVnd = Number(tx.amount_vnd) || 0
      const points = tx.points || 0

      // Global aggregates
      if (tx.type === 'deposit') {
        totalVNDLoaded += amountVnd
        totalPointsLoaded += points

        // Trend
        if (trendByMonth[yearMonth]) {
          trendByMonth[yearMonth].amountVnd += amountVnd
        }

        // Property leaderboard
        if (propertyAggregates[tx.property_id]) {
          propertyAggregates[tx.property_id].totalVnd += amountVnd
          propertyAggregates[tx.property_id].totalPointsLoaded += points
        }
      } else if (tx.type === 'upgrade' || tx.type === 'renew') {
        totalPointsSpent += points // points stored in DB as cost positive value

        // Trend
        if (trendByMonth[yearMonth]) {
          trendByMonth[yearMonth].pointsSpent += points
        }

        // Property leaderboard
        if (propertyAggregates[tx.property_id]) {
          propertyAggregates[tx.property_id].totalPointsSpent += points
        }
      }
    })

    const leaderboard = Object.values(propertyAggregates).sort((a, b) => b.totalVnd - a.totalVnd)
    const trend = Object.values(trendByMonth)

    return NextResponse.json({
      global: {
        totalVNDLoaded,
        totalPointsLoaded,
        totalPointsSpent,
        activeWalletsCount: wallets?.length ?? 0
      },
      trend,
      properties: leaderboard
    })

  } catch (error) {
    console.error('[GET /api/admin/billing-stats]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
