import { createHmac } from 'crypto'

export interface PayOSPaymentLinkRequest {
  orderCode: number
  amount: number
  description: string
  buyerName?: string
  buyerEmail?: string
  buyerPhone?: string
  returnUrl: string
  cancelUrl: string
}

export interface PayOSPaymentLinkResponse {
  bin: string
  accountNumber: string
  accountName: string
  amount: number
  description: string
  orderCode: number
  paymentLinkId: string
  status: string
  checkoutUrl: string
  qrCode: string
}

const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID || 'dummy-client-id'
const PAYOS_API_KEY = process.env.PAYOS_API_KEY || 'dummy-api-key'
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || 'dummy-checksum-key'
const PAYOS_URL = 'https://api-merchant.payos.vn/v2/payment-requests'

/**
 * Computes PayOS signature for request parameters
 */
export function calculateRequestSignature(params: Record<string, any>, checksumKey: string): string {
  // Sort parameters alphabetically by key
  const sortedKeys = Object.keys(params).sort()
  const queryString = sortedKeys
    .map(key => `${key}=${params[key]}`)
    .join('&')

  return createHmac('sha256', checksumKey)
    .update(queryString)
    .digest('hex')
}

/**
 * Creates a payment link via PayOS API
 */
export async function createPayOSPaymentLink(req: PayOSPaymentLinkRequest): Promise<PayOSPaymentLinkResponse> {
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY || PAYOS_CHECKSUM_KEY

  // Sign data parameters required by PayOS
  const signData = {
    amount: req.amount,
    cancelUrl: req.cancelUrl,
    description: req.description,
    orderCode: req.orderCode,
    returnUrl: req.returnUrl
  }

  const signature = calculateRequestSignature(signData, checksumKey)

  const requestBody = {
    ...req,
    signature,
    items: [
      {
        name: 'Nạp Điểm Thưởng StayJoy',
        quantity: 1,
        price: req.amount
      }
    ]
  }

  const response = await fetch(PAYOS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': process.env.PAYOS_CLIENT_ID || PAYOS_CLIENT_ID,
      'x-api-key': process.env.PAYOS_API_KEY || PAYOS_API_KEY
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`PayOS API error: ${response.status} - ${text.slice(0, 300)}`)
  }

  const json = await response.json()
  if (json.code !== '00') {
    throw new Error(`PayOS logic error: ${json.desc} (${json.code})`)
  }

  return json.data
}

/**
 * Verifies PayOS Webhook signature
 */
export function verifyPayOSWebhook(data: Record<string, any>, signature: string): boolean {
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY || PAYOS_CHECKSUM_KEY
  
  // Sort data keys alphabetically
  const sortedKeys = Object.keys(data).sort()
  const queryString = sortedKeys
    .map(key => {
      const val = data[key]
      // Null values are skipped in PayOS signature string calculation
      if (val === null || val === undefined) return ''
      return `${key}=${val}`
    })
    .filter(Boolean)
    .join('&')

  const expectedSignature = createHmac('sha256', checksumKey)
    .update(queryString)
    .digest('hex')

  return expectedSignature === signature
}
