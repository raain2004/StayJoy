'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

interface ICalFeed {
  id: string
  room_id: string
  property_id: string
  source_name: string
  ical_url: string
  is_active: boolean
  last_synced: string | null
  sync_error: string | null
  created_at: string
}

interface ICalFeedManagerProps {
  roomId: string
  propertyId: string
}

const SOURCE_OPTIONS = [
  { value: 'Booking.com', label: 'Booking.com' },
  { value: 'Airbnb', label: 'Airbnb' },
  { value: 'Agoda', label: 'Agoda' },
  { value: 'Google Calendar', label: 'Google Calendar' },
  { value: 'Khác', label: 'Khác' },
]

function getSourceIcon(source: string): string {
  switch (source) {
    case 'Booking.com': return '🅱️'
    case 'Airbnb': return '🏠'
    case 'Agoda': return '🟣'
    case 'Google Calendar': return '📅'
    default: return '🔗'
  }
}

function formatLastSynced(dateStr: string | null): string {
  if (!dateStr) return 'Chưa sync'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} giờ trước`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} ngày trước`
}

function truncateUrl(url: string, maxLen = 40): string {
  if (url.length <= maxLen) return url
  return url.substring(0, maxLen) + '...'
}

export function ICalFeedManager({ roomId, propertyId }: ICalFeedManagerProps) {
  const [feeds, setFeeds] = useState<ICalFeed[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formSource, setFormSource] = useState('Booking.com')
  const [formUrl, setFormUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()

  const exportUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/ical/export/${roomId}?property_id=${propertyId}`
    : ''

  const fetchFeeds = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/ical-feeds`)
      if (!res.ok) throw new Error('Failed to fetch feeds')
      const json = await res.json()
      setFeeds(json.feeds ?? [])
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách iCal feeds.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [roomId, toast])

  useEffect(() => { fetchFeeds() }, [fetchFeeds])

  async function handleAddFeed(e: React.FormEvent) {
    e.preventDefault()
    if (!formUrl.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/ical-feeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_name: formSource, ical_url: formUrl.trim() }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to add feed')
      }
      toast({ title: 'Đã thêm iCal feed thành công.' })
      setFormUrl('')
      setShowForm(false)
      fetchFeeds()
    } catch (err) {
      toast({
        title: 'Thêm feed thất bại',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(feedId: string) {
    if (!confirm('Bạn có chắc muốn xóa feed này? Tất cả booking đã sync từ feed này sẽ bị xóa.')) {
      return
    }

    setDeletingId(feedId)
    try {
      const res = await fetch(`/api/rooms/${roomId}/ical-feeds/${feedId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete feed')
      toast({ title: 'Đã xóa feed.' })
      fetchFeeds()
    } catch {
      toast({
        title: 'Xóa thất bại',
        description: 'Không thể xóa feed. Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSyncAll() {
    setSyncing(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/ical-feeds/sync`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Sync failed')
      const json = await res.json()
      toast({
        title: 'Sync hoàn tất',
        description: `Đã sync ${json.synced} feed(s).${json.errors?.length ? ` ${json.errors.length} lỗi.` : ''}`,
      })
      fetchFeeds()
    } catch {
      toast({
        title: 'Sync thất bại',
        description: 'Không thể sync. Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  function handleCopyExportUrl() {
    navigator.clipboard.writeText(exportUrl).then(() => {
      toast({ title: 'Đã copy URL export.' })
    })
  }

  if (loading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-2">
      {/* Export URL Section */}
      <div className="rounded-md border bg-blue-50 p-3 dark:bg-blue-950/20">
        <p className="mb-1 text-xs font-medium text-blue-700 dark:text-blue-300">
          📤 iCal Export URL (dùng để OTA subscribe)
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs dark:bg-gray-800">
            {exportUrl}
          </code>
          <Button size="sm" variant="outline" onClick={handleCopyExportUrl}>
            Copy
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Hủy' : '+ Thêm iCal Feed'}
        </Button>
        {feeds.length > 0 && (
          <Button size="sm" onClick={handleSyncAll} disabled={syncing}>
            {syncing ? 'Đang sync...' : 'Sync tất cả'}
          </Button>
        )}
      </div>

      {/* Add Feed Form */}
      {showForm && (
        <form onSubmit={handleAddFeed} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
          <div>
            <label htmlFor={`source-select-${roomId}`} className="mb-1 block text-xs font-medium">Nguồn</label>
            <select
              id={`source-select-${roomId}`}
              className="h-8 rounded-md border px-2 text-sm"
              value={formSource}
              onChange={(e) => setFormSource(e.target.value)}
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium">iCal URL</label>
            <Input
              type="url"
              placeholder="https://..."
              className="h-8"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              required
            />
          </div>
          <Button size="sm" type="submit" disabled={submitting}>
            {submitting ? 'Đang thêm...' : 'Thêm'}
          </Button>
        </form>
      )}

      {/* Feeds List */}
      {feeds.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có iCal feed nào.</p>
      ) : (
        <div className="space-y-2">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="flex items-center gap-3 rounded-md border p-2 text-sm"
            >
              <span className="text-lg" title={feed.source_name}>
                {getSourceIcon(feed.source_name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{feed.source_name}</span>
                  {feed.sync_error ? (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      Lỗi
                    </span>
                  ) : feed.is_active ? (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      Active
                    </span>
                  ) : (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground" title={feed.ical_url}>
                  {truncateUrl(feed.ical_url)}
                </p>
                {feed.sync_error && (
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                    {feed.sync_error}
                  </p>
                )}
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {formatLastSynced(feed.last_synced)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(feed.id)}
                disabled={deletingId === feed.id}
              >
                {deletingId === feed.id ? '...' : 'Xóa'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
