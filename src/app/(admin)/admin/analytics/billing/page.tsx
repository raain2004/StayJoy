'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  DollarSign,
  Coins,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Settings,
  HelpCircle,
  AlertCircle,
  Building,
  Save,
  Loader2,
  LineChart
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { KPICardSkeleton } from '@/components/dashboard/KPICard'

interface GlobalStats {
  totalVNDLoaded: number
  totalPointsLoaded: number
  totalPointsSpent: number
  activeWalletsCount: number
}

interface PropertyStat {
  propertyId: string
  name: string
  totalVnd: number
  totalPointsLoaded: number
  totalPointsSpent: number
  currentBalance: number
}

interface TrendData {
  month: string // 'YYYY-MM'
  amountVnd: number
  pointsSpent: number
}

interface PlanSetting {
  plan: 'lite' | 'pro' | 'premium'
  price_points: number
  message_limit: number
}

interface AnalyticsResponse {
  global: GlobalStats
  trend: TrendData[]
  properties: PropertyStat[]
}

export default function AdminBillingAnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsResponse | null>(null)
  const [plans, setPlans] = useState<PlanSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit states for plans
  const [editingPlan, setEditingPlan] = useState<Record<string, { price_points: string; message_limit: string }>>({})
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null)

  const { toast } = useToast()

  const fetchBillingAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, plansRes] = await Promise.all([
        fetch('/api/admin/billing-stats'),
        fetch('/api/admin/plan-settings')
      ])

      if (!statsRes.ok || !plansRes.ok) throw new Error('Không thể tải báo cáo doanh thu')
      
      const statsJson = await statsRes.json()
      const plansJson = await plansRes.json()

      setStats(statsJson)
      setPlans(plansJson.plans ?? [])

      // Initialize edit fields
      const editMap: Record<string, { price_points: string; message_limit: string }> = {}
      plansJson.plans?.forEach((p: PlanSetting) => {
        editMap[p.plan] = {
          price_points: String(p.price_points),
          message_limit: String(p.message_limit)
        }
      })
      setEditingPlan(editMap)
    } catch {
      setError('Đã xảy ra lỗi khi tải dữ liệu báo cáo doanh thu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBillingAnalytics()
  }, [fetchBillingAnalytics])

  // Formatter helpers
  function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount)
  }

  function formatMonthLabel(ym: string): string {
    const [year, month] = ym.split('-')
    return `Tháng ${Number(month)}`
  }

  function formatShortNumber(val: number): string {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`
    return String(val)
  }

  // Handle plan pricing update
  async function handlePlanUpdate(planName: string) {
    const edit = editingPlan[planName]
    if (!edit) return

    const pricePoints = Number(edit.price_points)
    const messageLimit = Number(edit.message_limit)

    if (isNaN(pricePoints) || pricePoints < 0) {
      toast({
        title: 'Giá trị điểm lỗi',
        description: 'Giá điểm thưởng phải là số nguyên lớn hơn hoặc bằng 0.',
        variant: 'destructive'
      })
      return
    }

    if (isNaN(messageLimit) || messageLimit < 0) {
      toast({
        title: 'Giới hạn tin nhắn lỗi',
        description: 'Giới hạn tin nhắn phải là số nguyên lớn hơn hoặc bằng 0.',
        variant: 'destructive'
      })
      return
    }

    setUpdatingPlan(planName)
    try {
      const res = await fetch('/api/admin/plan-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planName,
          pricePoints,
          messageLimit
        })
      })

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || 'Cập nhật thất bại')
      }

      toast({
        title: 'Cấu hình thành công!',
        description: `Đã cập nhật gói ${planName.toUpperCase()} sang mức giá ${pricePoints} điểm và hạn mức ${messageLimit.toLocaleString()} tin nhắn.`,
        variant: 'default'
      })
      fetchBillingAnalytics()
    } catch (err: any) {
      toast({
        title: 'Lỗi cấu hình',
        description: err.message || 'Cập nhật gói cước thất bại. Vui lòng thử lại.',
        variant: 'destructive'
      })
    } finally {
      setUpdatingPlan(null)
    }
  }

  function handleEditChange(planName: string, field: 'price_points' | 'message_limit', val: string) {
    setEditingPlan(prev => ({
      ...prev,
      [planName]: {
        ...prev[planName],
        [field]: val
      }
    }))
  }

  const chartData = stats?.trend.map(d => ({
    ...d,
    monthName: formatMonthLabel(d.month)
  })) || []

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Doanh Thu & Quản Lý Ví</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quản trị dòng tiền hệ thống, quản lý số dư điểm thưởng homestay và cấu hình động giá các gói dịch vụ AI.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBillingAnalytics} className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Làm Mới Số Liệu
        </Button>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center max-w-xl">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchBillingAnalytics}>Thử lại</Button>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /></>
            ) : stats ? (
              <>
                <div className="rounded-xl border bg-card p-6 shadow-sm relative overflow-hidden bg-gradient-to-br from-card via-card to-emerald-50/10 dark:to-emerald-950/5">
                  <div className="absolute top-3 right-3 text-emerald-500">
                    <DollarSign className="h-5 w-5 opacity-70" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tổng Doanh Thu Nạp</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {formatVND(stats.global.totalVNDLoaded)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Giao dịch PayOS: <span className="font-semibold text-foreground">{stats.global.totalPointsLoaded.toLocaleString()}</span> điểm nạp
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-indigo-500">
                    <Coins className="h-5 w-5 opacity-70" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tổng Điểm Kích Hoạt</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                    {stats.global.totalPointsSpent.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Quy đổi giá trị: <span className="font-semibold text-foreground">{formatVND(stats.global.totalPointsSpent * 1000)}</span> VND
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-amber-500">
                    <Building className="h-5 w-5 opacity-70" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ví Điểm Thưởng Homestay</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">
                    {stats.global.activeWalletsCount.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Số homestay đã có tài khoản ví điểm
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-indigo-500">
                    <TrendingUp className="h-5 w-5 opacity-70" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Điểm Số Dư Hệ Thống</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">
                    {(stats.global.totalPointsLoaded - stats.global.totalPointsSpent).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Số điểm nhàn rỗi đang trong ví owners
                  </p>
                </div>
              </>
            ) : null}
          </div>

          {/* Admin Plan settings configuration row (Dynamic prices!) */}
          <div>
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-500" />
              Cấu Hình Giá Động & Giới Hạn Gói Dịch Vụ AI
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-44 border rounded-xl animate-pulse bg-muted" />
                ))
              ) : plans.length > 0 ? (
                plans.map((p) => {
                  const edit = editingPlan[p.plan] || { price_points: '0', message_limit: '0' }
                  
                  return (
                    <div
                      key={p.plan}
                      className="rounded-xl border bg-card p-5 shadow-sm space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="text-xs font-extrabold uppercase text-muted-foreground">{p.plan}</span>
                          <Badge variant="outline" className="text-[10px] font-bold">Gói AI</Badge>
                        </div>

                        {/* Price update inputs */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-muted-foreground">Giá gói cước (Điểm):</label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={edit.price_points}
                              onChange={(e) => handleEditChange(p.plan, 'price_points', e.target.value)}
                              disabled={updatingPlan !== null}
                              className="font-mono text-sm font-bold pr-12"
                            />
                            <span className="absolute right-3 top-2 text-[10px] font-semibold text-muted-foreground">points</span>
                          </div>
                        </div>

                        {/* Message limits update inputs */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-muted-foreground">Hạn mức (Tin nhắn/tháng):</label>
                          <Input
                            type="number"
                            value={edit.message_limit}
                            onChange={(e) => handleEditChange(p.plan, 'message_limit', e.target.value)}
                            disabled={updatingPlan !== null}
                            className="font-mono text-sm font-bold"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={() => handlePlanUpdate(p.plan)}
                        disabled={updatingPlan !== null}
                        size="sm"
                        className="w-full text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        {updatingPlan === p.plan ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Lưu Cấu Hình
                      </Button>
                    </div>
                  )
                })
              ) : null}
            </div>
          </div>

          {/* Revenue Chart Trend */}
          {loading ? (
            <div className="h-[340px] rounded-xl border bg-card p-6 shadow-sm animate-pulse flex flex-col justify-between">
              <div className="h-6 w-48 rounded bg-muted" />
              <div className="h-[240px] w-full rounded bg-muted" />
            </div>
          ) : stats ? (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-emerald-500" />
                    Biểu Đồ Doanh Thu & Tiêu Dùng
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Xu hướng nạp tiền (VND) và chi tiêu điểm thưởng 6 tháng gần nhất.</p>
                </div>
              </div>
              
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVnd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(16, 185, 129)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="rgb(16, 185, 129)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(99, 102, 241)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="rgb(99, 102, 241)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis
                      dataKey="monthName"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={formatShortNumber}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      width={45}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'amountVnd') return [formatVND(value), 'Doanh thu nạp (VND)']
                        return [`${value.toLocaleString()} điểm`, 'Điểm tiêu dùng']
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="amountVnd"
                      name="amountVnd"
                      stroke="rgb(16, 185, 129)"
                      fillOpacity={1}
                      fill="url(#colorVnd)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="pointsSpent"
                      name="pointsSpent"
                      stroke="rgb(99, 102, 241)"
                      fillOpacity={1}
                      fill="url(#colorSpent)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          {/* Homestay spending Leaderboard */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-gradient-to-r from-card to-background flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Nhật Ký & Bảng Chi Tiêu Homestay</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Bảng thống kê doanh thu nạp, điểm chi tiêu tích lũy và số dư ví từng homestay.</p>
              </div>
              <Building className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground font-semibold border-b text-xs uppercase tracking-wider">
                    <th className="px-5 py-3.5">Homestay</th>
                    <th className="px-5 py-3.5 text-right">Tổng Tiền Nạp (PayOS)</th>
                    <th className="px-5 py-3.5 text-right">Điểm Cộng Tích Lũy</th>
                    <th className="px-5 py-3.5 text-right">Điểm Tiêu Dùng (Renew/Upgrade)</th>
                    <th className="px-5 py-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400">Số Dư Điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs sm:text-sm">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-5 py-3.5"><div className="h-4 w-32 rounded bg-muted" /></td>
                        <td className="px-5 py-3.5"><div className="h-4 w-20 rounded bg-muted ml-auto" /></td>
                        <td className="px-5 py-3.5"><div className="h-4 w-12 rounded bg-muted ml-auto" /></td>
                        <td className="px-5 py-3.5"><div className="h-4 w-12 rounded bg-muted ml-auto" /></td>
                        <td className="px-5 py-3.5"><div className="h-4 w-12 rounded bg-muted ml-auto" /></td>
                      </tr>
                    ))
                  ) : stats && stats.properties.length > 0 ? (
                    stats.properties.map((p) => (
                      <tr key={p.propertyId} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5 font-bold">{p.name}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {formatVND(p.totalVnd)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-muted-foreground">
                          {p.totalPointsLoaded.toLocaleString()}đ
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-muted-foreground">
                          {p.totalPointsSpent.toLocaleString()}đ
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {p.currentBalance.toLocaleString()}đ
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                        Chưa có dữ liệu giao dịch hoặc ví homestay nào được kích hoạt.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
