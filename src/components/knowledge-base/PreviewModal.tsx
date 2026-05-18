'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface PreviewModalProps {
  open: boolean
  onClose: () => void
  propertyId: string
}

export function PreviewModal({ open, onClose, propertyId }: PreviewModalProps) {
  const [systemMessage, setSystemMessage] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    async function fetchPreview() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/knowledge-base/preview')
        if (!res.ok) throw new Error('Không thể tải preview')
        const data = await res.json()
        setSystemMessage(data.system_message ?? '')
      } catch {
        setError('Đã xảy ra lỗi khi tải preview. Vui lòng thử lại.')
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()
  }, [open, propertyId])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview System Message</DialogTitle>
          <DialogDescription>
            Đây là nội dung system message sẽ được gửi cho chatbot AI.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : systemMessage ? (
            <pre className="whitespace-pre-wrap text-sm bg-muted/50 rounded-md p-4 overflow-auto max-h-[60vh]">
              {systemMessage}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Chưa có nội dung nào. Hãy thêm và bật ít nhất một section.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
