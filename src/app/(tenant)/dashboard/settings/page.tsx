'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

interface Property {
  id: string
  name: string
  address: string
  hotline: string
  description: string
  system_prompt_template: string
}

type FormValues = Omit<Property, 'id'>

interface ChannelMapping {
  id: string
  channel: string
  inbox_id: string | null
  is_active: boolean
  created_at: string
}

const CHANNEL_LABELS: Record<string, { label: string; icon: string }> = {
  telegram: { label: 'Telegram', icon: '📱' },
  zalo: { label: 'Zalo OA', icon: '💬' },
  messenger: { label: 'Messenger', icon: '💭' },
  instagram: { label: 'Instagram', icon: '📷' },
  whatsapp: { label: 'WhatsApp', icon: '📞' },
  website: { label: 'Website Widget', icon: '🌐' },
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormValues>({
    name: '',
    address: '',
    hotline: '',
    description: '',
    system_prompt_template: '',
  })
  const [channels, setChannels] = useState<ChannelMapping[]>([])
  const [channelsLoading, setChannelsLoading] = useState(true)
  const { toast } = useToast()

  const fetchProperty = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/properties/me')
      if (!res.ok) throw new Error('Không thể tải thông tin homestay')
      const json = await res.json()
      const p: Property = json.property
      setForm({
        name: p.name ?? '',
        address: p.address ?? '',
        hotline: p.hotline ?? '',
        description: p.description ?? '',
        system_prompt_template: p.system_prompt_template ?? '',
      })
    } catch {
      setError('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchChannels = useCallback(async () => {
    setChannelsLoading(true)
    try {
      const res = await fetch('/api/channels/me')
      if (res.ok) {
        const json = await res.json()
        setChannels(json.channels ?? [])
      }
    } catch {
      // Silently fail — channels section is informational
    } finally {
      setChannelsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProperty()
    fetchChannels()
  }, [fetchProperty, fetchChannels])

  function handleChange(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const snapshot = { ...form }
    setSaving(true)
    try {
      const res = await fetch('/api/properties/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Update failed')
      const json = await res.json()
      const p: Property = json.property
      setForm({
        name: p.name ?? '',
        address: p.address ?? '',
        hotline: p.hotline ?? '',
        description: p.description ?? '',
        system_prompt_template: p.system_prompt_template ?? '',
      })
      toast({ title: 'Đã lưu cài đặt thành công.' })
    } catch {
      setForm(snapshot)
      toast({
        title: 'Lưu thất bại',
        description: 'Không thể cập nhật cài đặt. Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-2xl">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-center max-w-2xl">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchProperty}>Thử lại</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Cài Đặt Homestay</h1>

      {/* Property Info Form */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Thông Tin Cơ Bản</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Tên homestay</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={saving}
              placeholder="Nhập tên homestay"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              disabled={saving}
              placeholder="Nhập địa chỉ"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotline">Hotline</Label>
            <Input
              id="hotline"
              value={form.hotline}
              onChange={(e) => handleChange('hotline', e.target.value)}
              disabled={saving}
              placeholder="Nhập số hotline"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={saving}
              placeholder="Nhập mô tả homestay"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="system_prompt_template">System Prompt Template</Label>
            <Textarea
              id="system_prompt_template"
              value={form.system_prompt_template}
              onChange={(e) => handleChange('system_prompt_template', e.target.value)}
              disabled={saving}
              placeholder="Nhập system prompt template cho AI chatbot"
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </Button>
        </form>
      </section>

      {/* Connected Channels */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Kênh Chatbot Đã Kết Nối</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Các kênh chat được admin cấu hình cho homestay của bạn. Liên hệ admin để thêm hoặc thay đổi kênh.
        </p>

        {channelsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : channels.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            <p>Chưa có kênh chatbot nào được kết nối.</p>
            <p className="text-xs mt-1">Liên hệ admin để thiết lập kênh chat (Zalo, Telegram, Messenger...)</p>
          </div>
        ) : (
          <div className="space-y-3">
            {channels.map((ch) => {
              const info = CHANNEL_LABELS[ch.channel] ?? { label: ch.channel, icon: '📡' }
              return (
                <div
                  key={ch.id}
                  className="flex items-center gap-3 rounded-lg border p-4"
                >
                  <span className="text-2xl" aria-hidden="true">{info.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{info.label}</span>
                      <Badge variant={ch.is_active ? 'default' : 'secondary'}>
                        {ch.is_active ? 'Hoạt động' : 'Tạm tắt'}
                      </Badge>
                    </div>
                    {ch.inbox_id && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Inbox ID: {ch.inbox_id}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
