'use client'

import { useState } from 'react'
import { getCalendarCellStatus, type Booking } from '@/lib/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Room {
  room_id: string
  loai_phong: string
  suc_chua: number
  gia_dem: number
}

interface BookingCalendarProps {
  rooms: Room[]
  bookings: Booking[]
  month: Date
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-gray-50',
  checkin: 'bg-green-200 text-green-800',
  checkout: 'bg-orange-200 text-orange-800',
  occupied: 'bg-blue-200 text-blue-800',
}

function getBookingForCell(date: Date, roomId: string, bookings: Booking[]): Booking | undefined {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  return bookings.find((b) => {
    if (b.so_phong !== roomId) return false
    const checkIn = new Date(b.check_in + 'T00:00:00Z')
    const checkOut = new Date(b.check_out + 'T00:00:00Z')
    return target >= checkIn && target < checkOut
  })
}

export function BookingCalendar({ rooms, bookings, month }: BookingCalendarProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  if (rooms.length === 0) {
    return <p className="text-sm text-muted-foreground">Không có phòng nào.</p>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs min-w-max">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white border border-gray-200 px-2 py-1 text-left font-medium min-w-[80px]">
                Phòng
              </th>
              {days.map((d) => (
                <th
                  key={d}
                  className="border border-gray-200 px-1 py-1 text-center font-medium w-8"
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.room_id}>
                <td className="sticky left-0 z-10 bg-white border border-gray-200 px-2 py-1 font-medium whitespace-nowrap">
                  {room.room_id}
                </td>
                {days.map((d) => {
                  const date = new Date(year, monthIndex, d)
                  const status = getCalendarCellStatus(date, room.room_id, bookings)
                  const colorClass = STATUS_COLORS[status]
                  const isClickable = status !== 'available'

                  return (
                    <td
                      key={d}
                      className={`border border-gray-200 w-8 h-7 text-center ${colorClass} ${
                        isClickable ? 'cursor-pointer hover:opacity-75' : ''
                      }`}
                      onClick={() => {
                        if (!isClickable) return
                        const booking = getBookingForCell(date, room.room_id, bookings)
                        if (booking) setSelectedBooking(booking)
                      }}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Chi tiết đặt phòng</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Khách:</span>
                <span className="font-medium">{selectedBooking.ho_ten}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Số phòng:</span>
                <span className="font-medium">{selectedBooking.so_phong}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in:</span>
                <span>{selectedBooking.check_in}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-out:</span>
                <span>{selectedBooking.check_out}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trạng thái:</span>
                <span>{selectedBooking.tinh_trang}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
