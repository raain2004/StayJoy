'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

export interface ServiceRequest {
  id: number
  property_id: string
  timestamp: string
  so_phong: string
  tag?: string
  loai_dich_vu?: string
  chi_tiet?: string
  trang_thai: 'Mới' | 'Đang xử lý' | 'Hoàn thành'
  conversation_id?: string
}

interface ServiceRequestListProps {
  initialRequests: ServiceRequest[]
  propertyId: string
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  'Mới': 'default',
  'Đang xử lý': 'secondary',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN')
}

export function ServiceRequestList({ initialRequests, propertyId }: ServiceRequestListProps) {
  const [requests, setRequests] = useState<ServiceRequest[]>(initialRequests)
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set())
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`service_requests:${propertyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_requests',
          filter: `property_id=eq.${propertyId}`,
        },
        (payload) => {
          const newRequest = payload.new as ServiceRequest
          if (newRequest.trang_thai !== 'Hoàn thành') {
            setRequests((prev) => [newRequest, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests',
          filter: `property_id=eq.${propertyId}`,
        },
        (payload) => {
          const updated = payload.new as ServiceRequest
          if (updated.trang_thai === 'Hoàn thành') {
            setRequests((prev) => prev.filter((r) => r.id !== updated.id))
          } else {
            setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [propertyId, supabase])

  async function handleMarkDone(id: number) {
    setLoadingIds((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/service-requests/${id}`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Update failed')
      // Optimistically remove from list
      setRequests((prev) => prev.filter((r) => r.id !== id))
    } catch {
      toast({
        title: 'Cập nhật thất bại',
        description: 'Không thể đánh dấu hoàn thành. Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Không có yêu cầu dịch vụ nào đang chờ xử lý.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-start justify-between rounded-lg border p-4 gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">Phòng {req.so_phong}</span>
              <Badge variant={STATUS_VARIANT[req.trang_thai] ?? 'outline'}>
                {req.trang_thai}
              </Badge>
              {req.tag && (
                <Badge variant="outline" className="text-xs">
                  {req.tag}
                </Badge>
              )}
            </div>
            {req.loai_dich_vu && (
              <p className="text-sm font-medium text-foreground">{req.loai_dich_vu}</p>
            )}
            {req.chi_tiet && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{req.chi_tiet}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{formatTime(req.timestamp)}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={loadingIds.has(req.id)}
            onClick={() => handleMarkDone(req.id)}
          >
            {loadingIds.has(req.id) ? 'Đang xử lý...' : 'Hoàn thành'}
          </Button>
        </div>
      ))}
    </div>
  )
}
