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

const ACTIVE_STATUSES = ['confirmed', 'check-in', 'checked_in', 'đã cọc', 'đang ở']

// GET /api/admin/stats — aggregate total bookings and revenue per property
export async function GET() {
  const supabase = createClient()

  const user = await getAdminUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Fetch all properties
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name')
      .order('name')

    if (propError) throw propError

    // Fetch all bookings with revenue fields
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select('id, property_id, tinh_trang, num_day, gia_dem')
      .in('tinh_trang', ACTIVE_STATUSES)

    if (bookingError) throw bookingError

    // Aggregate per property
    const stats = (properties ?? []).map((property) => {
      const propertyBookings = (bookings ?? []).filter(
        (b) => b.property_id === property.id
      )
      const totalBookings = propertyBookings.length
      const totalRevenue = propertyBookings.reduce(
        (sum, b) => sum + (b.num_day ?? 0) * (b.gia_dem ?? 0),
        0
      )
      return {
        property_id: property.id,
        property_name: property.name,
        total_bookings: totalBookings,
        total_revenue: totalRevenue,
      }
    })

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('[GET /api/admin/stats]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
