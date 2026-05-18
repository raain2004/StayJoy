'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import type { SectionKey, KnowledgeBaseSection, SectionUpdate } from '@/lib/knowledge-base/types'

const MAX_CONTENT_LENGTH = 5000

const DEFAULT_TITLES: Record<SectionKey, string> = {
  general_info: 'Thông Tin Chung',
  rooms_pricing: 'Phòng & Giá',
  policies: 'Chính Sách',
  amenities: 'Tiện Ích & Dịch Vụ',
  upsell: 'Dịch Vụ Upsell',
  faq: 'Câu Hỏi Thường Gặp',
  sister_properties: 'Homestay Liên Kết',
}

interface SectionCardProps {
  sectionKey: SectionKey
  data: KnowledgeBaseSection | null
  onToggle: (key: SectionKey, isActive: boolean) => Promise<void>
  onSave: (key: SectionKey, updates: SectionUpdate) => Promise<void>
  isSaving: boolean
}

export function SectionCard({ sectionKey, data, onToggle, onSave, isSaving }: SectionCardProps) {
  const [isActive, setIsActive] = useState(data?.is_active ?? true)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(data?.title ?? DEFAULT_TITLES[sectionKey])
  const [content, setContent] = useState(data?.content ?? '')
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleToggle(checked: boolean) {
    const previousState = isActive
    setIsActive(checked)

    try {
      await onToggle(sectionKey, checked)
    } catch {
      setIsActive(previousState)
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái. Vui lòng thử lại.',
        variant: 'destructive',
      })
    }
  }

  function handleCancel() {
    setTitle(data?.title ?? DEFAULT_TITLES[sectionKey])
    setContent(data?.content ?? '')
    setError(null)
    setIsEditing(false)
  }

  async function handleSave() {
    // Client-side validation
    if (!content.trim()) {
      setError('Nội dung không được để trống')
      return
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      setError(`Nội dung không được vượt quá 5.000 ký tự (hiện tại: ${content.length} ký tự)`)
      return
    }

    setError(null)

    try {
      await onSave(sectionKey, { title, content })
      toast({ title: 'Đã lưu thành công.' })
      setIsEditing(false)
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu nội dung. Vui lòng thử lại.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold">
            {data?.title ?? DEFAULT_TITLES[sectionKey]}
          </h3>
          {sectionKey === 'rooms_pricing' && (
            <Badge variant="secondary" className="text-xs">
              Dữ liệu phòng tự động
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isActive ? 'Bật' : 'Tắt'}
          </span>
          <Switch
            checked={isActive}
            onCheckedChange={handleToggle}
          />
        </div>
      </div>

      {/* rooms_pricing note */}
      {sectionKey === 'rooms_pricing' && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
          Dữ liệu phòng từ hệ thống luôn được đưa vào chatbot. Toggle này chỉ ảnh hưởng đến nội dung bổ sung bạn viết bên dưới.
        </p>
      )}

      {/* Edit form or edit button */}
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Tiêu đề</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề section"
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Nội dung</label>
            <Textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Nhập nội dung..."
              rows={6}
              disabled={isSaving}
              className="resize-y"
            />
            <div className="flex justify-between items-center mt-1">
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <p className={`text-xs ml-auto ${content.length > MAX_CONTENT_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
                {content.length} / {MAX_CONTENT_LENGTH.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving}>
              Hủy
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {content ? (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{content}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic mb-2">Chưa có nội dung</p>
          )}
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            Chỉnh sửa
          </Button>
        </div>
      )}
    </div>
  )
}
