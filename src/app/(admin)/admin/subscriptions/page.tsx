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

interface Subscription {
  id: string
  plan: string
  status: string
  started_at: string | null
  expires_at: string | null
  trial_ends_at: string | null
  property_id: string
  properties: { id: string; name: string } | null
}

const PLANS = ['trial', 'lite', 'pro', 'premium']
const STATUSES = ['trial', 'active', 'expired', 'cancelled']

export default function AdminSubscriptionsPage() {
  const { toast } = useToast()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { plan: string; status: string }>>({})

  useEffect(() => {
    fetch('/api/admin/subscriptions')
      .then((r) => r.json())
      .then((json) => {
        const subs: Subscription[] = json.subscriptions ?? []
        setSubscriptions(subs)
        const initial: Record<string, { plan: string; status: string }> = {}
        subs.forEach((s) => { initial[s.id] = { plan: s.plan, status: s.status } })
        setEdits(initial)
      })
      .catch(() => toast({ title: 'Lỗi tải subscriptions', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  async function handleSave(id: string) {
    setSaving(id)
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits[id]),
      })
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...json.subscription } : s))
      )
      toast({ title: 'Cập nhật thành công' })
    } catch {
      toast({ title: 'Cập nhật thất bại', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Đang tải...</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Quản Lý Subscriptions</h1>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Trạng Thái</TableHead>
              <TableHead>Trial Đến</TableHead>
              <TableHead>Hết Hạn</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Không có subscription nào
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    {sub.properties?.name ?? sub.property_id}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={edits[sub.id]?.plan ?? sub.plan}
                      onValueChange={(v) =>
                        setEdits((prev) => ({ ...prev, [sub.id]: { ...prev[sub.id], plan: v } }))
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLANS.map((p) => (
                          <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={edits[sub.id]?.status ?? sub.status}
                      onValueChange={(v) =>
                        setEdits((prev) => ({ ...prev, [sub.id]: { ...prev[sub.id], status: v } }))
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            <SubscriptionBadge status={s} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {sub.trial_ends_at
                      ? new Date(sub.trial_ends_at).toLocaleDateString('vi-VN')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {sub.expires_at
                      ? new Date(sub.expires_at).toLocaleDateString('vi-VN')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      disabled={saving === sub.id}
                      onClick={() => handleSave(sub.id)}
                    >
                      {saving === sub.id ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
