import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  computeDaysUntilExpiry,
  getExpiryState,
  SubscriptionInfo,
} from './subscription'

describe('computeDaysUntilExpiry', () => {
  it('returns null when expires_at is null', () => {
    expect(
      computeDaysUntilExpiry({ plan: 'pro', expires_at: null })
    ).toBeNull()
  })

  it('returns positive value for future expiry', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const expiryDate = new Date('2024-01-08T00:00:00Z') // 7 days later
    const result = computeDaysUntilExpiry(
      { plan: 'pro', expires_at: expiryDate.toISOString() },
      now
    )
    expect(result).toBe(7)
  })

  it('returns 0 or negative for past expiry', () => {
    const now = new Date('2024-01-10T00:00:00Z')
    const expiryDate = new Date('2024-01-09T00:00:00Z')
    const result = computeDaysUntilExpiry(
      { plan: 'pro', expires_at: expiryDate.toISOString() },
      now
    )
    expect(result).not.toBeNull()
    expect(result!).toBeLessThanOrEqual(0)
  })

  it('uses ceil for partial days', () => {
    const now = new Date('2024-01-01T12:00:00Z') // noon
    const expiryDate = new Date('2024-01-02T00:00:00Z') // midnight next day = 0.5 days
    const result = computeDaysUntilExpiry(
      { plan: 'pro', expires_at: expiryDate.toISOString() },
      now
    )
    expect(result).toBe(1) // ceil(0.5) = 1
  })
})

describe('getExpiryState', () => {
  it('returns shouldShow=false for null subscription', () => {
    const state = getExpiryState(null)
    expect(state.shouldShow).toBe(false)
    expect(state.daysLeft).toBeNull()
    expect(state.level).toBeNull()
  })

  it('returns shouldShow=false when daysLeft > 7', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const sub: SubscriptionInfo = {
      plan: 'pro',
      expires_at: new Date('2024-01-10T00:00:00Z').toISOString(), // 9 days
    }
    const state = getExpiryState(sub, now)
    expect(state.shouldShow).toBe(false)
  })

  it('returns warning level for daysLeft = 7', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const sub: SubscriptionInfo = {
      plan: 'pro',
      expires_at: new Date('2024-01-08T00:00:00Z').toISOString(),
    }
    const state = getExpiryState(sub, now)
    expect(state.shouldShow).toBe(true)
    expect(state.level).toBe('warning')
    expect(state.daysLeft).toBe(7)
  })

  it('returns warning level for daysLeft = 4', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const sub: SubscriptionInfo = {
      plan: 'pro',
      expires_at: new Date('2024-01-05T00:00:00Z').toISOString(),
    }
    const state = getExpiryState(sub, now)
    expect(state.level).toBe('warning')
  })

  it('returns urgent level for daysLeft = 3', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const sub: SubscriptionInfo = {
      plan: 'pro',
      expires_at: new Date('2024-01-04T00:00:00Z').toISOString(),
    }
    const state = getExpiryState(sub, now)
    expect(state.level).toBe('urgent')
  })

  it('returns urgent level for daysLeft = 2', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const sub: SubscriptionInfo = {
      plan: 'pro',
      expires_at: new Date('2024-01-03T00:00:00Z').toISOString(),
    }
    const state = getExpiryState(sub, now)
    expect(state.level).toBe('urgent')
  })

  it('returns critical level for daysLeft = 1', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const sub: SubscriptionInfo = {
      plan: 'pro',
      expires_at: new Date('2024-01-02T00:00:00Z').toISOString(),
    }
    const state = getExpiryState(sub, now)
    expect(state.level).toBe('critical')
  })

  it('sets isTrial=true for trial plan', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const sub: SubscriptionInfo = {
      plan: 'trial',
      expires_at: new Date('2024-01-04T00:00:00Z').toISOString(),
    }
    const state = getExpiryState(sub, now)
    expect(state.isTrial).toBe(true)
    expect(state.shouldShow).toBe(true)
  })
})

// ─── Property-Based Tests ─────────────────────────────────────────────────────

describe('Property 1: computeDaysUntilExpiry formula', () => {
  it('result equals Math.ceil((expiryDate - now) / 86_400_000) for any valid dates', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        (expiryDate, now) => {
          const sub: SubscriptionInfo = {
            plan: 'pro',
            expires_at: expiryDate.toISOString(),
          }
          const result = computeDaysUntilExpiry(sub, now)
          const expected = Math.ceil((expiryDate.getTime() - now.getTime()) / 86_400_000)
          return result === expected
        }
      ),
      { numRuns: 100 }
    )
  })

  it('returns null when expires_at is null', () => {
    fc.assert(
      fc.property(
        fc.date(),
        (now) => {
          const sub: SubscriptionInfo = { plan: 'pro', expires_at: null }
          return computeDaysUntilExpiry(sub, now) === null
        }
      ),
      { numRuns: 50 }
    )
  })

  it('returns <= 0 for past expiry dates', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
        (expiryDate) => {
          const now = new Date(expiryDate.getTime() + 86_400_000) // 1 day after expiry
          const sub: SubscriptionInfo = {
            plan: 'pro',
            expires_at: expiryDate.toISOString(),
          }
          const result = computeDaysUntilExpiry(sub, now)
          return result !== null && result <= 0
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 2: monotonicity of Days_Until_Expiry', () => {
  it('result never increases as time moves forward', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2025-01-01'), max: new Date('2030-01-01') }),
        fc.integer({ min: 0, max: 3_600_000 }),
        (expiryDate, offsetMs) => {
          const t1 = new Date('2024-06-01T00:00:00Z')
          const t2 = new Date(t1.getTime() + offsetMs)
          const sub: SubscriptionInfo = {
            plan: 'pro',
            expires_at: expiryDate.toISOString(),
          }
          const r1 = computeDaysUntilExpiry(sub, t1)
          const r2 = computeDaysUntilExpiry(sub, t2)
          return r1 !== null && r2 !== null && r2 <= r1
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 3: severity level mapping', () => {
  it('maps daysLeft in [1,7] to correct severity level', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 7 }),
        (daysLeft) => {
          const now = new Date('2024-01-01T00:00:00Z')
          const expiryDate = new Date(now.getTime() + daysLeft * 86_400_000)
          const sub: SubscriptionInfo = {
            plan: 'pro',
            expires_at: expiryDate.toISOString(),
          }
          const state = getExpiryState(sub, now)
          if (daysLeft >= 4) return state.level === 'warning'
          if (daysLeft >= 2) return state.level === 'urgent'
          return state.level === 'critical'
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 4: banner visibility and daysLeft accuracy', () => {
  it('shows correct daysLeft and isTrial flag for subscriptions in threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 7 }),
        fc.boolean(),
        (daysLeft, isTrial) => {
          const now = new Date('2024-01-01T00:00:00Z')
          const expiryDate = new Date(now.getTime() + daysLeft * 86_400_000)
          const sub: SubscriptionInfo = {
            plan: isTrial ? 'trial' : 'pro',
            expires_at: expiryDate.toISOString(),
          }
          const state = getExpiryState(sub, now)
          return (
            state.shouldShow === true &&
            state.daysLeft === daysLeft &&
            state.isTrial === isTrial
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 5: banner hidden when not needed', () => {
  it('shouldShow=false when daysLeft > 7', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 365 }),
        (daysLeft) => {
          const now = new Date('2024-01-01T00:00:00Z')
          const expiryDate = new Date(now.getTime() + daysLeft * 86_400_000)
          const sub: SubscriptionInfo = {
            plan: 'pro',
            expires_at: expiryDate.toISOString(),
          }
          return getExpiryState(sub, now).shouldShow === false
        }
      ),
      { numRuns: 100 }
    )
  })
})
