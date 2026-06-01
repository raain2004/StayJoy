'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cpu, AlertTriangle, Sparkles, ArrowRight, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UsageData {
  plan: string
  planStatus: string
  limit: number
  used: number
  remaining: number
}

export function QuotaCard() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch('/api/dashboard/usage')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Error fetching usage data:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchUsage()
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm animate-pulse">
        <div className="flex justify-between items-center mb-4">
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="h-6 w-16 rounded bg-muted" />
        </div>
        <div className="h-3 w-full rounded bg-muted mb-3" />
        <div className="h-4 w-60 rounded bg-muted" />
      </div>
    )
  }

  if (error || !data) {
    return null // Fail silently or display simple error
  }

  const { plan, limit, used, remaining } = data
  const percent = Math.min(100, limit > 0 ? Math.round((used / limit) * 100) : 0)

  // Color logic for premium feeling
  let barColorClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
  let textColorClass = 'text-emerald-500'
  let bgColorClass = 'bg-emerald-50'
  let borderColorClass = 'border-emerald-100'

  if (percent >= 90) {
    barColorClass = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse'
    textColorClass = 'text-rose-500 font-semibold'
    bgColorClass = 'bg-rose-50 dark:bg-rose-950/20'
    borderColorClass = 'border-rose-100 dark:border-rose-900/30'
  } else if (percent >= 70) {
    barColorClass = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
    textColorClass = 'text-amber-500'
    bgColorClass = 'bg-amber-50 dark:bg-amber-950/20'
    borderColorClass = 'border-amber-100 dark:border-amber-900/30'
  }

  const isLow = remaining < 100
  const isExceeded = remaining === 0

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-gradient-to-br from-card to-background p-6 shadow-md transition-all duration-300 hover:shadow-lg hover:border-muted-foreground/20",
      isExceeded && "border-rose-200 dark:border-rose-950"
    )}>
      {/* Decorative top gradient glow line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
        percent >= 90 ? "from-rose-500 to-amber-500" : "from-emerald-500 to-cyan-500"
      )} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Plan Header */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-lg flex items-center justify-center transition-all",
            percent >= 90 ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400" : "bg-primary/10 text-primary"
          )}>
            {percent >= 90 ? <AlertTriangle className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg tracking-tight">Hạn Mức Tin Nhắn AI</h3>
              <span className={cn(
                "px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full flex items-center gap-1",
                plan === 'PREMIUM' ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900" :
                plan === 'PRO' ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300" :
                "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              )}>
                {plan === 'PREMIUM' && <Sparkles className="h-3 w-3 inline" />}
                Gói {plan}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Số lượng tin nhắn của chatbot trợ lý tự động phản hồi trong tháng này.
            </p>
          </div>
        </div>

        {/* Counter Info */}
        <div className="flex items-baseline gap-1 text-right">
          <span className="text-3xl font-extrabold tracking-tight">{used.toLocaleString()}</span>
          <span className="text-muted-foreground text-sm">/ {limit.toLocaleString()} tin nhắn</span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="mt-5">
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted dark:bg-slate-800">
          <div
            className={cn("h-full rounded-full transition-all duration-500 ease-out", barColorClass)}
            style={{ width: `${percent}%` }}
          />
        </div>
        
        {/* Progress percentages and extra information */}
        <div className="flex justify-between items-center mt-2.5 text-xs">
          <span className="font-medium text-muted-foreground">Đã dùng: {percent}%</span>
          <span className={cn("font-medium", textColorClass)}>
            {isExceeded 
              ? "Đã hết lượt tin nhắn! Vui lòng nâng cấp gói."
              : isLow 
                ? `Chỉ còn lại ${remaining} lượt nhắn!`
                : `Còn lại ${remaining.toLocaleString()} lượt nhắn`
            }
          </span>
        </div>
      </div>

      {/* Banner Warn or Action */}
      <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground text-center sm:text-left">
          Hạn mức sẽ tự động được reset vào ngày đầu tiên của tháng tiếp theo.
        </p>
        <Link 
          href="/dashboard/usage" 
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors group"
        >
          Chi tiết sử dụng AI <ArrowRight className="h-4 w-4 transform transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  )
}
