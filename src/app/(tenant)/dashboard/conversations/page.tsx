'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
    case 'open': return <Badge className="bg-yellow-100 text-yellow-800">Đang mở</Badge>
    case 'resolved': return <Badge className="bg-green-100 text-green-800">Đã giải quyết</Badge>
    case 'pending': return <Badge className="bg-blue-100 text-blue-800">Chờ xử lý</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
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

  const chatwootUrl = (id: number) =>
    `${process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL || 'https://app.chatwoot.com'}/app/accounts/${process.env.NEXT_PUBLIC_CHATWOOT_ACCOUNT_ID || '156301'}/conversations/${id}`

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Hội Thoại Chatbot</h1>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Tháng này</p>
            <p className="text-2xl font-bold">{stats.thisMonth}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Tổng cộng</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Đang mở</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Đã giải quyết</p>
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map(f => (
          <Button
            key={f.value}
            variant={status === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Không có hội thoại nào</div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Khách</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Trạng thái</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Hoạt động cuối</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tạo lúc</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {conversations.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">#{c.id}</td>
                  <td className="px-4 py-3 font-medium">
                    {c.meta?.sender?.name || 'Khách ẩn danh'}
                    {c.meta?.sender?.phone_number && (
                      <span className="block text-xs text-gray-400">{c.meta.sender.phone_number}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatTime(c.last_activity_at)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatTime(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://app.chatwoot.com/app/accounts/156301/conversations/${c.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Xem →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
