'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'

export interface HistoricalUsage {
  month: string // 'YYYY-MM'
  messages: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
}

interface UsageChartProps {
  data: HistoricalUsage[]
}

export function UsageChart({ data }: UsageChartProps) {
  function formatMonthName(ym: string): string {
    const [year, month] = ym.split('-')
    return `T${Number(month)}/${year}`
  }

  function formatNumber(val: number): string {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
    return String(val)
  }

  const chartData = data.map(d => ({
    ...d,
    monthName: formatMonthName(d.month)
  }))

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Xu Hướng Tin Nhắn
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Số tin nhắn chatbot xử lý trong 6 tháng gần nhất.
        </p>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
            <XAxis
              dataKey="monthName"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={formatNumber}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toLocaleString()} tin`, 'Tin nhắn']}
              labelFormatter={(label) => `Tháng: ${label}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="messages"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
