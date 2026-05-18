import { describe, it, expect } from 'vitest'
import { getCalendarCellStatus, Booking } from './calendar'

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 1,
  property_id: 'prop-1',
  so_phong: 'P01',
  loai_phong: 'Standard',
  ho_ten: 'Nguyen Van A',
  sdt: '0901234567',
  email: 'a@example.com',
  check_in: '2024-01-10',
  check_out: '2024-01-13',
  num_day: 3,
  tinh_trang: 'confirmed',
  timestamp: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('getCalendarCellStatus', () => {
  const bookings = [makeBooking()]

  // Req 3.2 — check_in date → checkin
  it('returns checkin on check_in date', () => {
    expect(getCalendarCellStatus(new Date('2024-01-10'), 'P01', bookings)).toBe('checkin')
  })

  // Req 3.3 — check_out - 1 → checkout
  it('returns checkout on check_out - 1 day', () => {
    expect(getCalendarCellStatus(new Date('2024-01-12'), 'P01', bookings)).toBe('checkout')
  })

  // Req 3.4 — between check_in and check_out (exclusive) → occupied
  it('returns occupied for days between check_in and check_out', () => {
    expect(getCalendarCellStatus(new Date('2024-01-11'), 'P01', bookings)).toBe('occupied')
  })

  // Req 3.5 — no overlap → available
  it('returns available when no booking overlaps', () => {
    expect(getCalendarCellStatus(new Date('2024-01-09'), 'P01', bookings)).toBe('available')
    expect(getCalendarCellStatus(new Date('2024-01-13'), 'P01', bookings)).toBe('available')
    expect(getCalendarCellStatus(new Date('2024-01-14'), 'P01', bookings)).toBe('available')
  })

  // Req 3.5 — different room → available
  it('returns available for a different room', () => {
    expect(getCalendarCellStatus(new Date('2024-01-11'), 'P02', bookings)).toBe('available')
  })

  // Req 3.6 — 1-night stay: check_in = check_out - 1, checkin takes priority
  it('returns checkin (not checkout) for a 1-night stay', () => {
    const oneNight = [makeBooking({ check_in: '2024-02-05', check_out: '2024-02-06', num_day: 1 })]
    expect(getCalendarCellStatus(new Date('2024-02-05'), 'P01', oneNight)).toBe('checkin')
  })

  // Cancelled bookings should be ignored
  it('ignores cancelled bookings', () => {
    const cancelled = [makeBooking({ tinh_trang: 'cancelled' })]
    expect(getCalendarCellStatus(new Date('2024-01-10'), 'P01', cancelled)).toBe('available')
  })

  // All active statuses should be recognised
  it('treats pending bookings as active', () => {
    const pending = [makeBooking({ tinh_trang: 'pending' })]
    expect(getCalendarCellStatus(new Date('2024-01-10'), 'P01', pending)).toBe('checkin')
  })
})
