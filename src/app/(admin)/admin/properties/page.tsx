'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SubscriptionBadge } from '@/components/admin/SubscriptionBadge'
import { useToast } from '@/components/ui/use-toast'

interface Property {
  id: string
  name: string
  address: string | null
  hotline: string | null
  plan: string
  expires_at: string | null
}

const PLANS = ['trial', 'lite', 'pro', 'premium']

export default function AdminPropertiesPage() {
  const { toast } = useToast()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { plan: string; expires_at: string }>>({})

  useEffect(() => {
    fetch('/api/admin/properties')
      .then((r) => r.json())
      .then((json) => {
        const props: Property[] = json.properties ?? []
        setProperties(props)
        const initial: Record<string, { plan: string; expires_at: string }> = {}
        props.forEach((p) => {
          initial[p.id] = {
            plan: p.plan || 'trial',
            expires_at: p.expires_at ? p.expires_at.split('T')[0] : '',
          }
        })
        setEdits(initial)
      })
      .catch(() => toast({ title: 'Lỗi tải danh sách properties', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  async function handleSave(id: string) {
    setSaving(id)
    const payload = {
      plan: edits[id]?.plan,
      expires_at: edits[id]?.expires_at ? new Date(edits[id].expires_at).toISOString() : null,
    }
    try {
      const res = await fetch(`/api/admin/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...json.property } : p))
      )
      toast({ title: 'Cập nhật property thành công!' })
    } catch {
      toast({ title: 'Cập nhật thất bại. Vui lòng thử lại.', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground p-6">Đang tải...</p>
  }

  const now = new Date()

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Quản Lý Properties & Plan</h1>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên Property</TableHead>
              <TableHead>Địa Chỉ</TableHead>
              <TableHead>Hotline</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Trạng Thái</TableHead>
              <TableHead>Ngày Hết Hạn</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Không có property nào
                </TableCell>
              </TableRow>
            ) : (
              properties.map((p) => {
                const isExpired = p.expires_at ? new Date(p.expires_at) < now : false
                const status = isExpired ? 'expired' : (p.plan?.toLowerCase() === 'trial' ? 'trial' : 'active')

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.address ?? '—'}</TableCell>
                    <TableCell>{p.hotline ?? '—'}</TableCell>
                    <TableCell>
                      <Select
                        value={edits[p.id]?.plan ?? p.plan}
                        onValueChange={(v) =>
                          setEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], plan: v } }))
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLANS.map((planOpt) => (
                            <SelectItem key={planOpt} value={planOpt}>
                              {planOpt.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <SubscriptionBadge status={status} />
                    </TableCell>
                    <TableCell>
                      <input
                        type="date"
                        className="rounded border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary w-36"
                        value={edits[p.id]?.expires_at ?? ''}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], expires_at: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        disabled={saving === p.id}
                        onClick={() => handleSave(p.id)}
                      >
                        {saving === p.id ? 'Đang lưu...' : 'Lưu'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
