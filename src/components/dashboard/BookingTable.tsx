'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { 
  Phone, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Building, 
  ExternalLink,
  ChevronRight
} from 'lucide-react'

export type BookingStatus = string

export interface Booking {
  id: number
  property_id: string
  so_phong: string
  loai_phong?: string
  ho_ten: string
  sdt: string
  email?: string
  check_in: string
  check_out: string
  num_day: number
  gia_dem?: number
  tinh_trang: BookingStatus
  timestamp?: string
  conversation_id?: string
}

interface BookingTableProps {
  bookings: Booking[]
  onStatusChange: (id: number, status: BookingStatus) => Promise<void>
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return iso
  }
}

export function BookingTable({ bookings: initialBookings, onStatusChange }: BookingTableProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const { toast } = useToast()

  // Sync state if prop updates
  useEffect(() => {
    setBookings(initialBookings)
  }, [initialBookings])

  async function handleStatusChange(id: number, newStatus: BookingStatus) {
    const prev = bookings.find((b) => b.id === id)
    if (!prev) return

    // Optimistic update
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, tinh_trang: newStatus } : b)))

    try {
      await onStatusChange(id, newStatus)
      toast({
        title: 'Cập nhật thành công',
        description: `Đã cập nhật trạng thái đặt phòng sang "${newStatus === 'đã liên hệ' ? 'Đã liên hệ' : newStatus}".`,
      })
    } catch {
      // Revert on failure
      setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, tinh_trang: prev.tinh_trang } : b)))
      toast({
        title: 'Cập nhật thất bại',
        description: 'Không thể thay đổi trạng thái booking. Vui lòng thử lại.',
        variant: 'destructive',
      })
    }
  }

  // Filter bookings into columns
  // Column 1 (Chờ xử lý / Mới): pending, mới
  const pendingBookings = bookings.filter(
    (b) => b.tinh_trang === 'pending' || b.tinh_trang === 'mới'
  )

  // Column 2 (Đã xử lý / Đã liên hệ): confirmed, đã liên hệ, check-in, checked_in, đã cọc, đang ở, đã xử lý, v.v. (excluding cancelled)
  const processedBookings = bookings.filter(
    (b) => 
      b.tinh_trang !== 'pending' && 
      b.tinh_trang !== 'mới' && 
      b.tinh_trang !== 'cancelled'
  )

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Column 1: Chờ xử lý */}
      <div className="flex flex-col rounded-2xl border border-amber-100 bg-amber-50/10 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b pb-3 border-amber-100/50">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Clock className="h-4.5 w-4.5" />
            </span>
            <h2 className="text-lg font-semibold text-gray-800">Chờ xử lý (Mới)</h2>
          </div>
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-medium">
            {pendingBookings.length} booking
          </Badge>
        </div>

        {pendingBookings.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 px-4 text-center">
            <p className="text-sm text-gray-400 font-medium">Tuyệt vời! Không còn booking nào cần xử lý.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
            {pendingBookings.map((booking) => (
              <div
                key={booking.id}
                className="group relative flex flex-col gap-3 rounded-xl border border-amber-100 bg-white p-4.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-200"
              >
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-900 text-base">
                      <Building className="h-4 w-4 text-amber-500" />
                      Phòng {booking.so_phong}
                    </span>
                    {booking.loai_phong && (
                      <span className="text-xs text-gray-500 font-medium">{booking.loai_phong}</span>
                    )}
                  </div>
                  
                  {/* Glowing Pulse Badge */}
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <Badge className="bg-amber-50 text-amber-700 border border-amber-200/50 font-semibold px-2 hover:bg-amber-50">
                      Mới
                    </Badge>
                  </div>
                </div>

                {/* Body details */}
                <div className="grid grid-cols-1 gap-2 border-y border-gray-50 py-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="font-semibold text-gray-800">{booking.ho_ten}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <a href={`tel:${booking.sdt}`} className="text-amber-600 font-medium hover:underline">
                      {booking.sdt}
                    </a>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>
                      {formatDate(booking.check_in)}
                      <span className="mx-1 text-gray-400">→</span>
                      {formatDate(booking.check_out)}
                    </span>
                    <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600">
                      {booking.num_day} đêm
                    </span>
                  </div>
                </div>

                {/* Footer action buttons */}
                <div className="flex items-center justify-between gap-3 mt-1">
                  <Link
                    href={`/dashboard/bookings/${booking.id}`}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium"
                  >
                    Xem chi tiết <ChevronRight className="h-3 w-3" />
                  </Link>

                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 px-3 py-1.5 h-8.5 rounded-lg shadow-sm shadow-blue-100 transition-all"
                    onClick={() => handleStatusChange(booking.id, 'đã liên hệ')}
                  >
                    Đã liên hệ
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Column 2: Đã xử lý */}
      <div className="flex flex-col rounded-2xl border border-gray-100 bg-gray-50/5 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b pb-3 border-gray-100">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </span>
            <h2 className="text-lg font-semibold text-gray-800">Đã xử lý (Liên hệ xong)</h2>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-medium">
            {processedBookings.length} booking
          </Badge>
        </div>

        {processedBookings.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 px-4 text-center">
            <p className="text-sm text-gray-400 font-medium">Chưa có booking nào được liên hệ xong.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
            {processedBookings.map((booking) => (
              <div
                key={booking.id}
                className="group flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm opacity-90 transition-all hover:opacity-100 hover:shadow-md hover:border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                    <Building className="h-4 w-4 text-emerald-500" />
                    Phòng {booking.so_phong}
                  </span>
                  
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/40 hover:bg-emerald-50 font-medium px-2.5">
                    Đã liên hệ
                  </Badge>
                </div>

                <div className="flex flex-col gap-1 text-xs text-gray-500 border-t border-gray-50 pt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700 text-sm">{booking.ho_ten}</span>
                    <span className="text-gray-600">{booking.sdt}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>
                      {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                    </span>
                    <span className="font-medium text-gray-600">({booking.num_day} đêm)</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2 pt-1 border-t border-gray-50/50">
                  <button
                    onClick={() => handleStatusChange(booking.id, 'mới')}
                    className="text-xs text-gray-400 hover:text-amber-600 transition-colors"
                  >
                    Chuyển lại Chờ xử lý
                  </button>
                  
                  <Link
                    href={`/dashboard/bookings/${booking.id}`}
                    className="flex items-center gap-0.5 text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Chi tiết <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
