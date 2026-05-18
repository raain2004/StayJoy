import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SubscriptionBadge } from '@/components/admin/SubscriptionBadge'

export default async function AdminOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userProp } = await supabase
    .from('users_properties')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (userProp?.role !== 'admin') redirect('/dashboard')

  // Fetch all properties with subscriptions
  const { data: properties } = await supabase
    .from('properties')
    .select(`
      id, name, address, hotline,
      subscriptions (id, plan, status, trial_ends_at, expires_at, started_at)
    `)
    .order('name')

  const allProps = properties ?? []

  // Aggregate subscription stats
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  let active = 0, trial = 0, expired = 0, cancelled = 0, newThisMonth = 0

  allProps.forEach((p) => {
    const subs = p.subscriptions as { status: string; started_at: string | null }[]
    const sub = subs?.[0]
    if (!sub) return
    if (sub.status === 'active') active++
    else if (sub.status === 'trial') trial++
    else if (sub.status === 'expired') expired++
    else if (sub.status === 'cancelled') cancelled++
    if (sub.started_at && new Date(sub.started_at) >= startOfMonth) newThisMonth++
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tổng Quan Nền Tảng</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Tổng Properties</p>
          <p className="text-3xl font-bold">{allProps.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Đang Active</p>
          <p className="text-3xl font-bold text-green-600">{active}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Đang Trial</p>
          <p className="text-3xl font-bold text-yellow-600">{trial}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Mới tháng này</p>
          <p className="text-3xl font-bold text-blue-600">{newThisMonth}</p>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Expired</p>
          <p className="text-2xl font-bold text-red-500">{expired}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Cancelled</p>
          <p className="text-2xl font-bold text-gray-400">{cancelled}</p>
        </div>
      </div>

      {/* Properties table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Danh Sách Properties</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên Property</TableHead>
                <TableHead>Hotline</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Trạng Thái</TableHead>
                <TableHead>Hết Hạn / Trial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allProps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Chưa có property nào
                  </TableCell>
                </TableRow>
              ) : (
                allProps.map((p) => {
                  const subs = p.subscriptions as { plan: string; status: string; trial_ends_at: string | null; expires_at: string | null }[]
                  const sub = subs?.[0]
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.hotline ?? '—'}</TableCell>
                      <TableCell>{sub?.plan ?? '—'}</TableCell>
                      <TableCell>
                        {sub ? <SubscriptionBadge status={sub.status} /> : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sub?.expires_at
                          ? new Date(sub.expires_at).toLocaleDateString('vi-VN')
                          : sub?.trial_ends_at
                          ? `Trial đến ${new Date(sub.trial_ends_at).toLocaleDateString('vi-VN')}`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
