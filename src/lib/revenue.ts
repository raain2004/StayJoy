// Revenue calculation logic
// Requirements: 6.1, 6.2, 6.3, 6.4, 6.6

import type { Booking, BookingStatus } from '@/lib/calendar'

// Statuses considered "active" for revenue calculation
const ACTIVE_STATUSES: BookingStatus[] = [
  'confirmed',
  'check-in',
  'checked_in',
  'đã cọc',
  'đang ở',
]

/**
 * Returns true if the booking's check_in date falls within the given month.
 */
function isInMonth(checkIn: string, month: Date): boolean {
  const [year, mon] = checkIn.split('-').map(Number)
  return year === month.getFullYear() && mon === month.getMonth() + 1
}

/**
 * Calculates total revenue for a given month.
 * Formula: SUM(num_day * gia_dem) for active bookings with check_in in the month.
 *
 * @param bookings - Array of bookings (must include gia_dem field)
 * @param month    - Any Date within the target month
 * @returns Total revenue (0 if no qualifying bookings)
 */
export function calculateRevenue(
  bookings: Array<Booking & { gia_dem: number }>,
  month: Date
): number {
  return bookings
    .filter(
      (b) =>
        ACTIVE_STATUSES.includes(b.tinh_trang) && isInMonth(b.check_in, month)
    )
    .reduce((sum, b) => sum + b.num_day * b.gia_dem, 0)
}

/**
 * Calculates percent change between two revenue values.
 * Returns null when previousMonth is 0 to avoid division by zero.
 *
 * @param current  - Current month revenue
 * @param previous - Previous month revenue
 * @returns Percent change, or null if previous is 0
 */
export function calculatePercentChange(
  current: number,
  previous: number
): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}
