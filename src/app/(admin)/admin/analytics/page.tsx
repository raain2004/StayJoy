'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  Cpu,
  DollarSign,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Building2,
  TrendingDown,
  HelpCircle,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KPICardSkeleton } from '@/components/dashboard/KPICard'
import { TokenUsageChart, AdminTrendData } from '@/components/admin/TokenUsageChart'

interface GlobalStats {
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  totalCost: number
  totalCalls: number
  totalMessages: number
}

interface ModelStat {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  calls: number
}

interface PropertyStat {
  propertyId: string
  name: string
  plan: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  messages: number
}

interface AnalyticsData {
  global: GlobalStats
  trend: AdminTrendData[]
  models: ModelStat[]
  properties: PropertyStat[]
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/analytics')
      if (!res.ok) throw new Error('Không thể tải báo cáo hệ thống')
      setData(await res.json())
    } catch {
      setError('Đã xảy ra lỗi khi tải dữ liệu báo cáo hệ thống. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  function formatPrice(usd: number): string {
    const vnd = usd * 25000
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: vnd > 0 && vnd < 10 ? 2 : 0
    }).format(vnd)
  }

  function getPlanColor(plan: string): string {
    switch (plan.toUpperCase()) {
      case 'PREMIUM':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/30'
      case 'PRO':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30'
      case 'LITE':
      case 'STANDARD':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-100 dark:border-slate-700'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Báo Cáo Sử Dụng AI & Token</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Thống kê toàn diện lưu lượng chatbot, chi phí token LLM và hoạt động của tất cả homestay trong hệ thống.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Làm Mới Số Liệu
        </Button>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchAnalytics}>Thử lại</Button>
        </div>
      ) : (
        <>
          {/* KPI Summary Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /></>
            ) : data ? (
              <>
                <div className="rounded-xl border bg-card p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-primary">
                    <MessageSquare className="h-5 w-5 opacity-70" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tổng Tin Nhắn AI</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">{data.global.totalMessages.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cuộc gọi thành công: <span className="font-semibold text-foreground">{data.global.totalCalls.toLocaleString()}</span> lượt
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-indigo-500">
                    <Cpu className="h-5 w-5 opacity-70" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tổng Lượng Tokens</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">{data.global.totalTokens.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    In: <span className="font-medium">{data.global.totalInputTokens.toLocaleString()}</span> | Out: <span className="font-medium">{data.global.totalOutputTokens.toLocaleString()}</span>
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-sm relative overflow-hidden bg-gradient-to-br from-card via-card to-rose-50/10 dark:to-rose-950/5">
                  <div className="absolute top-3 right-3 text-rose-500">
                    <DollarSign className="h-5 w-5 opacity-70" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tổng Chi Phí LLM</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{formatPrice(data.global.totalCost)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Phí trung bình/lần gọi: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatPrice(data.global.totalCost / (data.global.totalCalls || 1))}</span>
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-amber-500">
                    <Building2 className="h-5 w-5 opacity-70" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Homestays Kích Hoạt</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">{data.properties.length.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    Số model đang sử dụng: <span className="font-semibold">{data.models.length}</span>
                  </p>
                </div>
              </>
            ) : null}
          </div>

          {/* System Trend Chart */}
          {loading ? (
            <div className="h-[360px] rounded-xl border bg-card p-6 shadow-sm animate-pulse flex flex-col justify-between">
              <div className="h-6 w-48 rounded bg-muted" />
              <div className="h-[260px] w-full rounded bg-muted" />
            </div>
          ) : data ? (
            <TokenUsageChart data={data.trend} />
          ) : null}

          {/* Breakdown Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Leaderboard Table (Homestays) - 2 cols wide */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden lg:col-span-2">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base">Bảng Xếp Hạng Homestay Sử Dụng AI</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Thống kê lưu lượng tin nhắn, token và chi phí tích lũy của từng homestay.
                  </p>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground font-medium border-b text-xs uppercase tracking-wider">
                      <th className="px-6 py-4">Homestay</th>
                      <th className="px-6 py-4">Gói Plan</th>
                      <th className="px-6 py-4 text-right">Số Tin Nhắn</th>
                      <th className="px-6 py-4 text-right">Tổng Tokens</th>
                      <th className="px-6 py-4 text-right font-semibold text-rose-600 dark:text-rose-400">Chi Phí</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs sm:text-sm">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-6 py-4"><div className="h-4 w-36 rounded bg-muted" /></td>
                          <td className="px-6 py-4"><div className="h-5 w-16 rounded bg-muted" /></td>
                          <td className="px-6 py-4"><div className="h-4 w-12 rounded bg-muted ml-auto" /></td>
                          <td className="px-6 py-4"><div className="h-4 w-16 rounded bg-muted ml-auto" /></td>
                          <td className="px-6 py-4"><div className="h-4 w-12 rounded bg-muted ml-auto" /></td>
                        </tr>
                      ))
                    ) : data && data.properties.length > 0 ? (
                      data.properties.map((p, index) => (
                        <tr key={p.propertyId} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">
                            {p.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize inline-block ${getPlanColor(p.plan)}`}>
                              {p.plan}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-muted-foreground font-mono">
                            {p.messages.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right text-muted-foreground font-mono">
                            {p.totalTokens.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-rose-600 dark:text-rose-400 font-mono">
                            {formatPrice(p.cost)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                          Không có homestay nào kích hoạt hoặc sử dụng chatbot AI.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Model stats breakdown - 1 col wide */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-6 border-b flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-base">Thống Kê Theo Model</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tỷ lệ gọi và chi phí phân bổ theo từng dòng AI model.
                    </p>
                  </div>
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="p-4 space-y-4">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-3 border rounded-xl animate-pulse space-y-2">
                        <div className="h-4 w-28 rounded bg-muted" />
                        <div className="h-3 w-40 rounded bg-muted" />
                        <div className="h-3 w-20 rounded bg-muted" />
                      </div>
                    ))
                  ) : data && data.models.length > 0 ? (
                    data.models.map((m) => (
                      <div key={m.model} className="p-4 border rounded-xl bg-gradient-to-r from-card to-background hover:border-indigo-500/30 transition-all flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs font-bold text-foreground truncate max-w-[70%]">{m.model}</span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary rounded-full">
                            {m.calls.toLocaleString()} calls
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs mt-1 text-muted-foreground">
                          <span>Tokens: <strong className="text-foreground font-mono">{m.totalTokens.toLocaleString()}</strong></span>
                          <span>Chi phí: <strong className="text-rose-600 dark:text-rose-400 font-mono">{formatPrice(m.cost)}</strong></span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-10">
                      Chưa ghi nhận dữ liệu cuộc gọi model nào.
                    </p>
                  )}
                </div>
              </div>
              <div className="p-4 border-t bg-muted/20 text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <HelpCircle className="h-3.5 w-3.5" />
                Dữ liệu được cập nhật thời gian thực dựa trên logs api.
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
