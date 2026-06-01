'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  Smartphone,
  CalendarDays,
  Inbox
} from 'lucide-react'

interface Conversation {
  id: number
  inbox_id: number
  status: 'open' | 'resolved' | 'pending' | 'snoozed'
  created_at: number
  meta: {
    sender: { name: string; phone_number?: string }
    channel: string
  }
  messages?: { content: string; created_at: number }[]
  last_activity_at: number
}

interface Stats {
  total: number
  open: number
  resolved: number
  thisMonth: number
}

const STATUS_FILTERS = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Đang mở', value: 'open' },
  { label: 'Đã giải quyết', value: 'resolved' },
  { label: 'Chờ xử lý', value: 'pending' },
]

function statusBadge(status: string) {
  switch (status) {
    case 'open': 
      return (
        <Badge className="bg-yellow-50 text-yellow-800 border border-yellow-200 hover:bg-yellow-50 font-semibold px-2.5 py-0.5">
          Đang mở
        </Badge>
      )
    case 'resolved': 
      return (
        <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-50 font-semibold px-2.5 py-0.5">
          Đã giải quyết
        </Badge>
      )
    case 'pending': 
      return (
        <Badge className="bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-50 font-semibold px-2.5 py-0.5">
          Chờ xử lý
        </Badge>
      )
    default: 
      return <Badge variant="outline" className="font-semibold px-2.5 py-0.5">{status}</Badge>
  }
}

function channelBadge(channel: string) {
  const c = (channel || '').toLowerCase()
  if (c.includes('telegram')) {
    return (
      <Badge className="bg-sky-50 text-sky-700 border border-sky-200/50 hover:bg-sky-50 font-semibold px-2.5 py-0.5 gap-1 shrink-0">
        <span className="text-sky-500">🔵</span> Telegram
      </Badge>
    )
  }
  if (c.includes('facebook') || c.includes('messenger') || c.includes('page')) {
    return (
      <Badge className="bg-blue-50 text-blue-700 border border-blue-200/50 hover:bg-blue-50 font-semibold px-2.5 py-0.5 gap-1 shrink-0">
        <span className="text-blue-500">📘</span> Messenger
      </Badge>
    )
  }
  if (c.includes('web') || c.includes('widget') || c.includes('api')) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 hover:bg-emerald-50 font-semibold px-2.5 py-0.5 gap-1 shrink-0">
        <span className="text-emerald-500">🌐</span> Webchat
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="font-semibold text-gray-600 px-2.5 py-0.5 shrink-0">
      💬 {channel.replace('Channel::', '') || 'Webchat'}
    </Badge>
  )
}

function formatTime(ts: number) {
  const d = new Date(ts * 1000)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return `${diff}s trước`
  if (diff < 3600) return `${Math.floor(diff / 60)}m trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`
  return `${Math.floor(diff / 86400)} ngày trước`
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/conversations?status=${status}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setConversations(data.conversations || [])
        setStats(data.stats || null)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [status])

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hội Thoại Chatbot</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">Theo dõi lịch sử nhắn tin của khách qua các kênh liên kết</p>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tháng này</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.thisMonth}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
              <CalendarDays className="h-5 w-5" />
            </span>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tổng cộng</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
              <Inbox className="h-5 w-5" />
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Đang mở</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.open}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-50 text-yellow-500">
              <Clock className="h-5 w-5" />
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Đã giải quyết</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.resolved}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(f => (
          <Button
            key={f.value}
            variant={status === f.value ? 'default' : 'outline'}
            size="sm"
            className={`font-semibold rounded-lg ${status === f.value ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-gray-600 border-gray-200'}`}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="text-sm font-semibold">Đang tải cuộc hội thoại...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 border border-red-100 bg-red-50/50 rounded-2xl">
          <p className="font-semibold">Đã xảy ra lỗi: {error}</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col items-center gap-2">
          <MessageSquare className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-semibold">Không có hội thoại nào được tìm thấy</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-600">
                <tr>
                  <th className="text-left px-5 py-4 font-bold uppercase tracking-wider text-xs">#ID</th>
                  <th className="text-left px-5 py-4 font-bold uppercase tracking-wider text-xs">Khách</th>
                  <th className="text-left px-5 py-4 font-bold uppercase tracking-wider text-xs">Kênh</th>
                  <th className="text-left px-5 py-4 font-bold uppercase tracking-wider text-xs">Trạng thái</th>
                  <th className="text-left px-5 py-4 font-bold uppercase tracking-wider text-xs">Hoạt động cuối</th>
                  <th className="text-left px-5 py-4 font-bold uppercase tracking-wider text-xs">Tạo lúc</th>
                  <th className="px-5 py-4 w-[100px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {conversations.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-5 py-4 text-gray-400 font-semibold">#{c.id}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-gray-800">{c.meta?.sender?.name || 'Khách ẩn danh'}</span>
                        {c.meta?.sender?.phone_number && (
                          <span className="text-xs text-gray-400 font-semibold">{c.meta.sender.phone_number}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">{channelBadge(c.meta?.channel)}</td>
                    <td className="px-5 py-4">{statusBadge(c.status)}</td>
                    <td className="px-5 py-4 text-gray-500 font-medium">{formatTime(c.last_activity_at)}</td>
                    <td className="px-5 py-4 text-gray-500 font-medium">{formatTime(c.created_at)}</td>
                    <td className="px-5 py-4">
                      <a
                        href={`${process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL || 'https://chat.stayjoy.io.vn'}/app/accounts/${process.env.NEXT_PUBLIC_CHATWOOT_ACCOUNT_ID || '2'}/conversations/${c.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 hover:underline font-bold text-xs"
                      >
                        Xem <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
