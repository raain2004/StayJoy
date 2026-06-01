'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { BookingTable, Booking, BookingStatus } from '@/components/dashboard/BookingTable'

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/bookings')
      if (!res.ok) throw new Error('Không thể tải danh sách booking')
      const json = await res.json()
      setBookings(json.bookings ?? [])
    } catch {
      setError('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  async function handleStatusChange(id: number, status: BookingStatus) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tinh_trang: status }),
    })
    if (!res.ok) throw new Error('Update failed')
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Yêu Cầu Đặt Phòng</h1>

      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchBookings}>
            Thử lại
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : (
        <BookingTable bookings={bookings} onStatusChange={handleStatusChange} />
      )}
    </div>
  )
}
