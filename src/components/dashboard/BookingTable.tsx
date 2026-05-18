'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'

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

const ALL_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'check-in',
  'checked_in',
  'đã cọc',
  'đang ở',
  'cancelled',
]

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  'check-in': 'Check-in',
  checked_in: 'Đã check-in',
  'đã cọc': 'Đã cọc',
  'đang ở': 'Đang ở',
  cancelled: 'Đã hủy',
}

const STATUS_VARIANT: Record<BookingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  confirmed: 'default',
  'check-in': 'default',
  checked_in: 'default',
  'đã cọc': 'secondary',
  'đang ở': 'default',
  cancelled: 'destructive',
}

interface BookingTableProps {
  bookings: Booking[]
  onStatusChange: (id: number, status: BookingStatus) => Promise<void>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN')
}

export function BookingTable({ bookings: initialBookings, onStatusChange }: BookingTableProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const { toast } = useToast()

  async function handleStatusChange(id: number, newStatus: BookingStatus) {
    const prev = bookings.find((b) => b.id === id)
    if (!prev) return

    // Optimistic update
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, tinh_trang: newStatus } : b)))

    try {
      await onStatusChange(id, newStatus)
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

  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Không có booking nào.
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Phòng</TableHead>
            <TableHead>Khách</TableHead>
            <TableHead>SĐT</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell className="font-medium">{booking.so_phong}</TableCell>
              <TableCell>{booking.ho_ten}</TableCell>
              <TableCell>{booking.sdt}</TableCell>
              <TableCell>{formatDate(booking.check_in)}</TableCell>
              <TableCell>{formatDate(booking.check_out)}</TableCell>
              <TableCell>
                <Select
                  value={booking.tinh_trang}
                  onValueChange={(val) => handleStatusChange(booking.id, val as BookingStatus)}
                >
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue>
                      <Badge variant={STATUS_VARIANT[booking.tinh_trang]}>
                        {STATUS_LABELS[booking.tinh_trang]}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Link
                  href={`/dashboard/bookings/${booking.id}`}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Chi tiết
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
