// Calendar cell status logic for Booking Calendar
// Requirements: 3.2, 3.3, 3.4, 3.5, 3.6

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'check-in'
  | 'checked_in'
  | 'đã cọc'
  | 'đang ở'
  | 'cancelled'

export interface Booking {
  id: number
  property_id: string
  so_phong: string
  loai_phong: string
  ho_ten: string
  sdt: string
  email: string
  check_in: string   // ISO date string e.g. "2024-01-15"
  check_out: string  // ISO date string e.g. "2024-01-18"
  num_day: number
  tinh_trang: BookingStatus
  timestamp: string
  conversation_id?: string
}

// Statuses considered "active" for calendar display
const ACTIVE_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'check-in',
  'checked_in',
  'đã cọc',
  'đang ở',
]

/**
 * Normalise a Date to midnight UTC to allow safe date-only comparisons.
 * Accepts either a Date object or an ISO date string ("YYYY-MM-DD").
 */
function toDateOnly(value: Date | string): Date {
  if (typeof value === 'string') {
    // Parse "YYYY-MM-DD" directly to avoid timezone shifts
    const [year, month, day] = value.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day))
  }
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()))
}

/**
 * Returns the calendar cell status for a given (date, room) pair.
 *
 * Priority order (handles 1-night stay where check_in = check_out - 1):
 *   checkin > checkout > occupied > available
 *
 * @param date     - The calendar date to check
 * @param roomId   - The room identifier (so_phong)
 * @param bookings - All bookings to consider
 * @returns 'checkin' | 'checkout' | 'occupied' | 'available'
 */
export function getCalendarCellStatus(
  date: Date,
  roomId: string,
  bookings: Booking[]
): 'available' | 'checkin' | 'checkout' | 'occupied' {
  const target = toDateOnly(date)

  // Filter to active bookings for this room
  const roomBookings = bookings.filter(
    (b) => b.so_phong === roomId && ACTIVE_STATUSES.includes(b.tinh_trang)
  )

  let isCheckout = false
  let isOccupied = false

  for (const booking of roomBookings) {
    const checkIn = toDateOnly(booking.check_in)
    const checkOut = toDateOnly(booking.check_out)

    // check_out - 1 day
    const checkOutMinus1 = new Date(checkOut)
    checkOutMinus1.setUTCDate(checkOutMinus1.getUTCDate() - 1)

    // Req 3.2: date === check_in → checkin (highest priority)
    if (target.getTime() === checkIn.getTime()) {
      return 'checkin'
    }

    // Req 3.3: date === check_out - 1 → checkout
    if (target.getTime() === checkOutMinus1.getTime()) {
      isCheckout = true
    }

    // Req 3.4: check_in < date < check_out (exclusive) → occupied
    if (target > checkIn && target < checkOut) {
      isOccupied = true
    }
  }

  if (isCheckout) return 'checkout'
  if (isOccupied) return 'occupied'

  // Req 3.5: no overlap → available
  return 'available'
}
