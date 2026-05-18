'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard'

interface DashboardSummary {
  totalBookingsThisMonth: number
  revenueThisMonth: number
  pendingServiceRequests: number
  vacancyRate: number
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/summary')
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
    fetchSummary()
  }, [fetchSummary])

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Tổng Quan</h1>

      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchSummary}>
            Thử lại
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <>
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
            </>
          ) : data ? (
            <>
              <KPICard
                title="Tổng Booking Tháng"
                value={data.totalBookingsThisMonth}
                subtitle="Tháng hiện tại"
              />
              <KPICard
                title="Doanh Thu Tháng"
                value={formatVND(data.revenueThisMonth)}
                subtitle="Tháng hiện tại"
              />
              <KPICard
                title="Yêu Cầu Dịch Vụ Chờ"
                value={data.pendingServiceRequests}
                subtitle="Mới & Đang xử lý"
              />
              <KPICard
                title="Tỷ Lệ Phòng Trống"
                value={formatPercent(data.vacancyRate)}
                subtitle="Hôm nay"
              />
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
