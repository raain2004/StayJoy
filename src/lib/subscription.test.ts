import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  computeDaysUntilExpiry,
  getExpiryState,
  SubscriptionInfo,
} from './subscription'

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('computeDaysUntilExpiry', () => {
  it('returns null when expires_at is null (active)', () => {
    expect(
      computeDaysUntilExpiry({ status: 'active', expires_at: null, trial_ends_at: null })
    ).toBeNull()
  })

  it('returns null when trial_ends_at is null (trial)', () => {
    expect(
      computeDaysUntilExpiry({ status: 'trial', expires_at: '2030-01-01', trial_ends_at: null })
    ).toBeNull()
  })

  it('returns positive value for future expiry', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const expiryDate = new Date('2024-01-08T00:00:00Z') // 7 days later
    const result = computeDaysUntilExpiry(
      { status: 'active', expires_at: expiryDate.toISOString(), trial_ends_at: null },
      now
    )
    expect(result).toBe(7)
  })

  it('returns 0 or negative for past expiry', () => {
    const now = new Date('2024-01-10T00:00:00Z')
    const expiryDate = new Date('2024-01-09T00:00:00Z')
    const result = computeDaysUntilExpiry(
      { status: 'active', expires_at: expiryDate.toISOString(), trial_ends_at: null },
      now
    )
    expect(result).not.toBeNull()
    expect(result!).toBeLessThanOrEqual(0)
  })

  it('uses trial_ends_at for trial subscriptions, not expires_at', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const trialEnd = new Date('2024-01-04T00:00:00Z') // 3 days
    const expiresAt = new Date('2024-01-31T00:00:00Z') // 30 days
    const result = computeDaysUntilExpiry(
      { status: 'trial', expires_at: expiresAt.toISOString(), trial_ends_at: trialEnd.toISOString() },
      now
    )
    expect(result).toBe(3)
  })

  it('uses ceil for partial days', () => {
    const now = new Date('2024-01-01T12:00:00Z') // noon
    const expiryDate = new Date('2024-01-02T00:00:00Z') // midnight next day = 0.5 days
    const result = computeDaysUntilExpiry(
      { status: 'active', expires_at: expiryDate.toISOString(), trial_ends_at: null },
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

  it('returns shouldShow=false for cancelled subscription', () => {
    const sub: SubscriptionInfo = { status: 'cancelled', expires_at: '2024-01-10', trial_ends_at: null }
    const state = getExpiryState(sub)
    expect(state.shouldShow).toBe(false)
  })

  it('returns shouldShow=false when daysLeft > 7', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const sub: SubscriptionInfo = {
      status: 'active',
      expires_at: new Date('2024-01-10T00:00:00Z').toISOString(), // 9 days
      trial_ends_at: null,
    }
    const state = getExpiryState(sub, now)
    expect(state.shouldShow).toBe(false)
  })

  it('returns warning level for daysLeft = 7', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const sub: SubscriptionInfo = {
      status: 'active',
      expires_at: new Date('2024-01-08T00:00:00Z').toISOString(),
      trial_ends_at: null,
    }
    const state = getExpiryState(sub, now)
    expect(state.shouldShow).toBe(true)
    expect(state.level).toBe('warning')
    expect(state.daysLeft).toBe(7)
  })

  it('returns warning level for daysLeft = 4', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const sub: SubscriptionInfo = {
      status: 'active',
      expires_at: new Date('2024-01-05T00:00:00Z').toISOString(),
      trial_ends_at: null,
    }
    const state = getExpiryState(sub, now)
    expect(state.level).toBe('warning')
  })

  it('returns urgent level for daysLeft = 3', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const sub: SubscriptionInfo = {
      status: 'active',
      expires_at: new Date('2024-01-04T00:00:00Z').toISOString(),
      trial_ends_at: null,
    }
    const state = getExpiryState(sub, now)
    expect(state.level).toBe('urgent')
  })

  it('returns urgent level for daysLeft = 2', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const sub: SubscriptionInfo = {
      status: 'active',
      expires_at: new Date('2024-01-03T00:00:00Z').toISOString(),
      trial_ends_at: null,
    }
    const state = getExpiryState(sub, now)
    expect(state.level).toBe('urgent')
  })

  it('returns critical level for daysLeft = 1', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const sub: SubscriptionInfo = {
      status: 'active',
      expires_at: new Date('2024-01-02T00:00:00Z').toISOString(),
      trial_ends_at: null,
    }
    const state = getExpiryState(sub, now)
    expect(state.level).toBe('critical')
  })

  it('sets isTrial=true for trial subscriptions', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const sub: SubscriptionInfo = {
      status: 'trial',
      expires_at: null,
      trial_ends_at: new Date('2024-01-04T00:00:00Z').toISOString(),
    }
    const state = getExpiryState(sub, now)
    expect(state.isTrial).toBe(true)
    expect(state.shouldShow).toBe(true)
  })
})

// ─── Property-Based Tests ─────────────────────────────────────────────────────

describe('Property 1: computeDaysUntilExpiry formula', () => {
  /**
   * Validates: Requirements 4.1, 4.2, 4.3
   */
  it('result equals Math.ceil((expiryDate - now) / 86_400_000) for any valid dates', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        (expiryDate, now) => {
          const sub: SubscriptionInfo = {
            status: 'active',
            expires_at: expiryDate.toISOString(),
            trial_ends_at: null,
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
          const sub: SubscriptionInfo = { status: 'active', expires_at: null, trial_ends_at: null }
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
            status: 'active',
            expires_at: expiryDate.toISOString(),
            trial_ends_at: null,
          }
          const result = computeDaysUntilExpiry(sub, now)
          return result !== null && result <= 0
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 2: trial subscription uses trial_ends_at', () => {
  /**
   * Validates: Requirements 4.4
   */
  it('uses trial_ends_at (not expires_at) for trial subscriptions', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        (trialEndsAt, expiresAt, now) => {
          const sub: SubscriptionInfo = {
            status: 'trial',
            expires_at: expiresAt.toISOString(),
            trial_ends_at: trialEndsAt.toISOString(),
          }
          const result = computeDaysUntilExpiry(sub, now)
          const expected = Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000)
          return result === expected
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 3: monotonicity of Days_Until_Expiry', () => {
  /**
   * Validates: Requirements 4.5
   */
  it('result never increases as time moves forward', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2025-01-01'), max: new Date('2030-01-01') }),
        fc.integer({ min: 0, max: 3_600_000 }),
        (expiryDate, offsetMs) => {
          const t1 = new Date('2024-06-01T00:00:00Z')
          const t2 = new Date(t1.getTime() + offsetMs)
          const sub: SubscriptionInfo = {
            status: 'active',
            expires_at: expiryDate.toISOString(),
            trial_ends_at: null,
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

describe('Property 4: severity level mapping', () => {
  /**
   * Validates: Requirements 3.2, 3.3, 3.4
   */
  it('maps daysLeft in [1,7] to correct severity level', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 7 }),
        (daysLeft) => {
          const now = new Date('2024-01-01T00:00:00Z')
          const expiryDate = new Date(now.getTime() + daysLeft * 86_400_000)
          const sub: SubscriptionInfo = {
            status: 'active',
            expires_at: expiryDate.toISOString(),
            trial_ends_at: null,
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

describe('Property 5: banner visibility and daysLeft accuracy', () => {
  /**
   * Validates: Requirements 3.1, 3.5, 3.7
   */
  it('shows correct daysLeft and isTrial flag for subscriptions in threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 7 }),
        fc.boolean(),
        (daysLeft, isTrial) => {
          const now = new Date('2024-01-01T00:00:00Z')
          const expiryDate = new Date(now.getTime() + daysLeft * 86_400_000)
          const sub: SubscriptionInfo = isTrial
            ? { status: 'trial', expires_at: null, trial_ends_at: expiryDate.toISOString() }
            : { status: 'active', expires_at: expiryDate.toISOString(), trial_ends_at: null }
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

describe('Property 6: banner hidden when not needed', () => {
  /**
   * Validates: Requirements 3.8, 3.9
   */
  it('shouldShow=false for cancelled subscriptions', () => {
    fc.assert(
      fc.property(
        fc.option(fc.date().map((d) => d.toISOString()), { nil: null }),
        (expiresAt) => {
          const sub: SubscriptionInfo = {
            status: 'cancelled',
            expires_at: expiresAt,
            trial_ends_at: null,
          }
          return getExpiryState(sub).shouldShow === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('shouldShow=false when daysLeft > 7', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 365 }),
        (daysLeft) => {
          const now = new Date('2024-01-01T00:00:00Z')
          const expiryDate = new Date(now.getTime() + daysLeft * 86_400_000)
          const sub: SubscriptionInfo = {
            status: 'active',
            expires_at: expiryDate.toISOString(),
            trial_ends_at: null,
          }
          return getExpiryState(sub, now).shouldShow === false
        }
      ),
      { numRuns: 100 }
    )
  })
})
