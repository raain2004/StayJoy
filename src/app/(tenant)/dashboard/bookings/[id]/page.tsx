'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Booking } from '@/components/dashboard/BookingTable'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  'check-in': 'Check-in',
  checked_in: 'Đã check-in',
  'đã cọc': 'Đã cọc',
  'đang ở': 'Đang ở',
  cancelled: 'Đã hủy',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN')
}

function formatVND(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center">
      <div className="w-48 shrink-0 text-sm text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${id}`)
        if (!res.ok) throw new Error('Không tìm thấy booking')
        const json = await res.json()
        setBooking(json.booking)
      } catch {
        setError('Không thể tải thông tin booking.')
      } finally {
        setLoading(false)
      }
    }
    fetchBooking()
  }, [id])

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{error ?? 'Không tìm thấy booking.'}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/dashboard/bookings">Quay lại</Link>
        </Button>
      </div>
    )
  }

  const totalRevenue =
    booking.num_day && booking.gia_dem ? booking.num_day * booking.gia_dem : null

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/bookings">← Quay lại</Link>
        </Button>
        <h1 className="text-2xl font-bold">Chi Tiết Booking #{booking.id}</h1>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Thông Tin Khách</h2>
        </div>
        <div className="divide-y px-6">
          <InfoRow label="Họ tên" value={booking.ho_ten} />
          <InfoRow label="Số điện thoại" value={booking.sdt} />
          <InfoRow label="Email" value={booking.email ?? '—'} />
        </div>

        <div className="border-b border-t px-6 py-4">
          <h2 className="font-semibold">Thông Tin Đặt Phòng</h2>
        </div>
        <div className="divide-y px-6">
          <InfoRow label="Số phòng" value={booking.so_phong} />
          <InfoRow label="Loại phòng" value={booking.loai_phong ?? '—'} />
          <InfoRow label="Check-in" value={formatDate(booking.check_in)} />
          <InfoRow label="Check-out" value={formatDate(booking.check_out)} />
          <InfoRow label="Số đêm" value={`${booking.num_day} đêm`} />
          {booking.gia_dem && (
            <InfoRow label="Giá/đêm" value={formatVND(booking.gia_dem)} />
          )}
          {totalRevenue !== null && (
            <InfoRow label="Tổng tiền" value={formatVND(totalRevenue)} />
          )}
          <InfoRow
            label="Trạng thái"
            value={
              <Badge>{STATUS_LABELS[booking.tinh_trang] ?? booking.tinh_trang}</Badge>
            }
          />
          {booking.conversation_id && (
            <InfoRow
              label="Chatwoot"
              value={
                <a
                  href={`${process.env.NEXT_PUBLIC_CHATWOOT_URL ?? '#'}/conversations/${booking.conversation_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Xem cuộc trò chuyện →
                </a>
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
