'use client'

import { useState } from 'react'
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
import { Cpu, DollarSign, Activity, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AdminTrendData {
  month: string // 'YYYY-MM'
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  messages: number
}

interface TokenUsageChartProps {
  data: AdminTrendData[]
}

export function TokenUsageChart({ data }: TokenUsageChartProps) {
  const [activeTab, setActiveTab] = useState<'tokens' | 'cost' | 'messages'>('tokens')

  // Format month to Txx/YYYY
  function formatMonth(ym: string): string {
    const [year, month] = ym.split('-')
    return `T${Number(month)}/${year}`
  }

  function formatValue(val: number): string {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`
    return String(val)
  }

  function formatCost(val: number): string {
    const vnd = val * 25000
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(vnd)
  }

  const chartData = data.map((d) => ({
    ...d,
    monthLabel: formatMonth(d.month),
  }))

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Biểu Đồ Xu Hướng Toàn Hệ Thống
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Phân tích lưu lượng, tin nhắn và chi phí AI theo từng tháng.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-muted p-1 rounded-lg text-xs font-semibold self-stretch sm:self-auto">
          <button
            onClick={() => setActiveTab('tokens')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 rounded-md transition-all flex items-center justify-center gap-1.5",
              activeTab === 'tokens'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Cpu className="h-3.5 w-3.5" />
            Tokens
          </button>
          <button
            onClick={() => setActiveTab('cost')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 rounded-md transition-all flex items-center justify-center gap-1.5",
              activeTab === 'cost'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <DollarSign className="h-3.5 w-3.5" />
            Chi Phí
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 rounded-md transition-all flex items-center justify-center gap-1.5",
              activeTab === 'messages'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Activity className="h-3.5 w-3.5" />
            Tin Nhắn
          </button>
        </div>
      </div>

      <div className="h-[300px] w-full">
        {activeTab === 'tokens' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(99, 102, 241)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="rgb(99, 102, 241)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatValue}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const map: Record<string, string> = {
                    totalTokens: 'Tổng Tokens',
                    inputTokens: 'Input Tokens',
                    outputTokens: 'Output Tokens',
                  }
                  return [`${value.toLocaleString()} tokens`, map[name] || name]
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
                dataKey="totalTokens"
                name="totalTokens"
                stroke="rgb(99, 102, 241)"
                fillOpacity={1}
                fill="url(#colorTotal)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="inputTokens"
                name="inputTokens"
                stroke="rgb(16, 185, 129)"
                fill="transparent"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="outputTokens"
                name="outputTokens"
                stroke="rgb(245, 158, 11)"
                fill="transparent"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'cost' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(239, 68, 68)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="rgb(239, 68, 68)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatCost}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                formatter={(value: number) => {
                  const vnd = value * 25000
                  const formatted = new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                    maximumFractionDigits: vnd > 0 && vnd < 10 ? 2 : 0
                  }).format(vnd)
                  return [formatted, 'Chi phí AI']
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="rgb(239, 68, 68)"
                fillOpacity={1}
                fill="url(#colorCost)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'messages' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatValue}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString()} tin nhắn`, 'Tổng số tin nhắn']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
              />
              <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
