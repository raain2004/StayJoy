'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { BookingCalendar } from '@/components/dashboard/BookingCalendar'
import { type Booking } from '@/lib/calendar'

interface Room {
  room_id: string
  loai_phong: string
  suc_chua: number
  gia_dem: number
}

interface CalendarData {
  rooms: Room[]
  bookings: Booking[]
}

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCalendar = useCallback(async (y: number, m: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/calendar?year=${y}&month=${m}`)
      if (!res.ok) throw new Error('Không thể tải dữ liệu')
      const json = await res.json()
      setData(json)
    } catch {
      setError('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCalendar(year, month)
  }, [fetchCalendar, year, month])

  function prevMonth() {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={prevMonth}>
          &lt; Tháng trước
        </Button>
        <span className="text-lg font-semibold">Tháng {month}/{year}</span>
        <Button variant="outline" size="sm" onClick={nextMonth}>
          Tháng sau &gt;
        </Button>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => fetchCalendar(year, month)}>
            Thử lại
          </Button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
          Đang tải...
        </div>
      ) : data ? (
        <BookingCalendar
          rooms={data.rooms}
          bookings={data.bookings}
          month={new Date(year, month - 1, 1)}
        />
      ) : null}
    </div>
  )
}
