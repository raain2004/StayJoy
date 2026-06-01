import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPayOSWebhook } from '@/lib/payment/payos'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/wallet/payos-webhook — handle PayOS success/cancel webhook triggers asynchronously
export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { data, signature } = body

    if (!data || !signature) {
      return NextResponse.json({ error: 'Missing PayOS data or signature' }, { status: 400 })
    }

    // 1. Verify webhook signature using PayOS Checksum Key (Crypto-based)
    const isValid = verifyPayOSWebhook(data, signature)
    if (!isValid) {
      console.warn('[PayOS Webhook] Invalid webhook signature detected')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('[PayOS Webhook] Valid signature. Processing data:', data)

    const orderCode = Number(data.orderCode)
    const isSuccess = body.code === '00' || data.description?.includes('success')

    const supabase = createServiceClient()

    // 2. Query transaction with order code in database (bypassing RLS with service client)
    const { data: transaction, error: txQueryError } = await supabase
      .from('wallet_transactions')
      .select('id, property_id, points, status')
      .eq('payos_order_code', orderCode)
      .maybeSingle()

    if (txQueryError) {
      console.error('[PayOS Webhook] Database error querying transaction:', txQueryError)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    if (!transaction) {
      console.warn(`[PayOS Webhook] Transaction not found for orderCode=${orderCode}`)
      return NextResponse.json({ status: 'ignored', reason: 'transaction_not_found' })
    }

    // 3. Prevent double processing (Idempotency)
    if (transaction.status !== 'pending') {
      console.log(`[PayOS Webhook] Transaction ${transaction.id} already processed with status: ${transaction.status}`)
      return NextResponse.json({ status: 'ok', reason: 'already_processed' })
    }

    if (isSuccess) {
      // 4. Update transaction to Success
      const { error: updateTxError } = await supabase
        .from('wallet_transactions')
        .update({ status: 'success' })
        .eq('id', transaction.id)

      if (updateTxError) {
        console.error('[PayOS Webhook] Failed to update transaction status:', updateTxError)
        return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
      }

      // 5. Call PostgreSQL RPC function to atomically increment wallet points balance
      const { error: rpcError } = await supabase.rpc('increment_wallet_balance', {
        p_property_id: transaction.property_id,
        p_points: transaction.points
      })

      if (rpcError) {
        console.error('[PayOS Webhook] Failed to increment wallet balance RPC:', rpcError)
        // Rollback transaction to pending or keep success but log error
        return NextResponse.json({ error: 'Failed to credit points' }, { status: 500 })
      }

      console.log(`[PayOS Webhook] Successfully credited ${transaction.points} points to property ${transaction.property_id}`)
      return NextResponse.json({ status: 'success', credited: transaction.points })
    } else {
      // 6. Payment failed/cancelled
      const { error: updateTxError } = await supabase
        .from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id)

      if (updateTxError) {
        console.error('[PayOS Webhook] Failed to update failed transaction status:', updateTxError)
      }

      console.log(`[PayOS Webhook] Transaction ${transaction.id} marked as failed`)
      return NextResponse.json({ status: 'failed' })
    }

  } catch (error) {
    console.error('[POST /api/wallet/payos-webhook] Webhook handler error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
