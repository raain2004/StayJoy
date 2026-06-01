'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Shield, Sparkles, Activity, MessageSquare, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard'
import { UsageChart, HistoricalUsage } from '@/components/dashboard/UsageChart'

interface UsageDetails {
  plan: string
  planStatus: string
  limit: number
  used: number
  remaining: number
  history: HistoricalUsage[]
}

export default function UsagePage() {
  const [data, setData] = useState<UsageDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsageData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/usage')
      if (!res.ok) throw new Error('Không thể tải dữ liệu hạn mức')
      setData(await res.json())
    } catch {
      setError('Đã xảy ra lỗi khi tải dữ liệu hạn mức. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsageData()
  }, [fetchUsageData])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="rounded-lg border p-2 hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Chi Tiết Sử Dụng AI</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Theo dõi hạn mức tin nhắn
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsageData} className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Làm Mới
        </Button>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchUsageData}>Thử lại</Button>
        </div>
      ) : (
        <>
          {/* KPI Summary Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /></>
            ) : data ? (
              <>
                <div className="rounded-xl border bg-card p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-indigo-500">
                    <Shield className="h-5 w-5 opacity-70" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gói AI Hiện Tại</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
                    {data.plan}
                    {data.plan === 'PREMIUM' && <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full inline-block ${data.planStatus === 'cancelled' || data.planStatus === 'expired' ? 'bg-red-500' : 'bg-emerald-500 animate-ping'}`} />
                    Trạng thái: <span className={`font-semibold capitalize ${data.planStatus === 'cancelled' || data.planStatus === 'expired' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{data.planStatus}</span>
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-emerald-500">
                    <MessageSquare className="h-5 w-5 opacity-70" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tin Nhắn Đã Dùng</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">{data.used.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Giới hạn: <span className="font-medium">{data.limit.toLocaleString()}</span> tin nhắn
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-amber-500">
                    <AlertCircle className="h-5 w-5 opacity-70" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tin Nhắn Còn Lại</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">{data.remaining.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tương đương: <span className="font-medium text-emerald-600 dark:text-emerald-400 font-semibold">{Math.round((data.remaining/data.limit)*100)}%</span> hạn mức
                  </p>
                </div>

              </>
            ) : null}
          </div>

          {/* Chart Section */}
          {loading ? (
            <div className="h-[360px] rounded-xl border bg-card p-6 shadow-sm animate-pulse flex flex-col justify-between">
              <div className="h-6 w-48 rounded bg-muted" />
              <div className="h-[260px] w-full rounded bg-muted" />
            </div>
          ) : data ? (
            <UsageChart data={data.history} />
          ) : null}

        </>
      )}
    </div>
  )
}
