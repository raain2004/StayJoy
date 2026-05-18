'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

interface RoomImage {
  id: string
  room_id: string
  property_id: string
  image_url: string
  sort_order: number
  created_at: string
}

interface RoomImageGalleryProps {
  roomId: string
}

export function RoomImageGallery({ roomId }: RoomImageGalleryProps) {
  const [images, setImages] = useState<RoomImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const fetchImages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/images`)
      if (!res.ok) throw new Error('Fetch failed')
      const data = await res.json()
      setImages(data.images ?? [])
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải hình ảnh.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [roomId, toast])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Định dạng không hợp lệ',
        description: 'Chỉ chấp nhận file jpg, png, webp.',
        variant: 'destructive',
      })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File quá lớn',
        description: 'File không được vượt quá 5MB.',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/rooms/${roomId}/images`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }

      const data = await res.json()
      setImages((prev) => [...prev, data.image])
      toast({ title: 'Đã tải hình lên thành công.' })
    } catch (err) {
      toast({
        title: 'Upload thất bại',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(imageId: string) {
    if (!confirm('Bạn có chắc muốn xóa hình này?')) return

    setDeletingId(imageId)
    try {
      const res = await fetch(`/api/rooms/${roomId}/images/${imageId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      setImages((prev) => prev.filter((img) => img.id !== imageId))
      toast({ title: 'Đã xóa hình.' })
    } catch {
      toast({
        title: 'Xóa thất bại',
        description: 'Không thể xóa hình. Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Hình ảnh ({images.length}/10)
        </h4>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading || images.length >= 10}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || images.length >= 10}
          >
            {uploading ? 'Đang tải...' : '+ Thêm hình'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Chưa có hình ảnh. Thêm hình để chatbot có thể gửi cho khách.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-video rounded-md overflow-hidden border">
              <img
                src={img.image_url}
                alt={`Phòng ${img.room_id}`}
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => handleDelete(img.id)}
                disabled={deletingId === img.id}
                className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center h-6 w-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 transition-colors"
                title="Xóa hình"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
