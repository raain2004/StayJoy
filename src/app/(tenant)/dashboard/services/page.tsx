'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ServiceRequestList, ServiceRequest } from '@/components/dashboard/ServiceRequestList'
import { createClient } from '@/lib/supabase/client'

export default function ServicesPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Get property_id for the current user (needed for Realtime filter)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: up } = await supabase
          .from('users_properties')
          .select('property_id')
          .eq('user_id', session.user.id)
          .single()
        if (up) setPropertyId(up.property_id)
      }

      const res = await fetch('/api/service-requests')
      if (!res.ok) throw new Error('Không thể tải danh sách yêu cầu dịch vụ')
      const json = await res.json()
      setRequests(json.serviceRequests ?? [])
    } catch {
      setError('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Yêu Cầu Dịch Vụ</h1>

      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchRequests}>
            Thử lại
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : propertyId ? (
        <ServiceRequestList initialRequests={requests} propertyId={propertyId} />
      ) : null}
    </div>
  )
}
