'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import type { RevenueData } from '@/app/api/revenue/route'

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatPercent(value: number | null): string {
  if (value === null) return 'N/A'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const fetchRevenue = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const monthParam = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
      const res = await fetch(`/api/revenue?month=${monthParam}`)
      if (!res.ok) throw new Error('Không thể tải dữ liệu doanh thu')
      setData(await res.json())
    } catch {
      setError('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { fetchRevenue() }, [fetchRevenue])

  function changeMonth(delta: number) {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Báo Cáo Doanh Thu</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>‹</Button>
          <span className="text-sm font-medium w-36 text-center">{getMonthLabel(month)}</span>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>›</Button>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchRevenue}>Thử lại</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /></>
            ) : data ? (
              <>
                <KPICard
                  title="Doanh Thu Tháng Này"
                  value={formatVND(data.currentMonth.total)}
                  subtitle={getMonthLabel(month)}
                />
                <KPICard
                  title="So Với Tháng Trước"
                  value={formatPercent(data.percentChange)}
                  subtitle={getMonthLabel(prevMonth)}
                />
                <KPICard
                  title="Số Booking"
                  value={data.currentMonth.bookingCount}
                  subtitle="Booking active trong tháng"
                />
                <KPICard
                  title="Trung Bình / Booking"
                  value={formatVND(data.currentMonth.avgPerBooking)}
                  subtitle="Doanh thu trung bình"
                />
              </>
            ) : null}
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">Doanh Thu Theo Ngày</h2>
            {loading ? (
              <div className="h-[280px] animate-pulse rounded bg-muted" />
            ) : data ? (
              <RevenueChart data={data.dailyBreakdown} />
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
