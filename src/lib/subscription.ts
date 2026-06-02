export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

export type ExpiryAlertLevel = 'warning' | 'urgent' | 'critical'

export interface SubscriptionInfo {
  plan: string
  expires_at: string | null
}

export interface ExpiryState {
  shouldShow: boolean
  daysLeft: number | null
  level: ExpiryAlertLevel | null
  isTrial: boolean
}

export function computeDaysUntilExpiry(
  subscription: SubscriptionInfo,
  now: Date = new Date()
): number | null {
  const expiryDate = subscription.expires_at

  if (!expiryDate) return null

  const diffMs = new Date(expiryDate).getTime() - now.getTime()
  return Math.ceil(diffMs / 86_400_000)
}

const WARNING_THRESHOLD = 7
const URGENT_THRESHOLD = 3
const CRITICAL_THRESHOLD = 1

export function getExpiryState(
  subscription: SubscriptionInfo | null,
  now: Date = new Date()
): ExpiryState {
  if (!subscription) {
    return { shouldShow: false, daysLeft: null, level: null, isTrial: false }
  }

  const daysLeft = computeDaysUntilExpiry(subscription, now)

  if (daysLeft === null || daysLeft > WARNING_THRESHOLD) {
    return { shouldShow: false, daysLeft, level: null, isTrial: false }
  }

  let level: ExpiryAlertLevel
  if (daysLeft <= CRITICAL_THRESHOLD) {
    level = 'critical'
  } else if (daysLeft <= URGENT_THRESHOLD) {
    level = 'urgent'
  } else {
    level = 'warning'
  }

  return {
    shouldShow: true,
    daysLeft,
    level,
    isTrial: subscription.plan?.toLowerCase() === 'trial',
  }
}

