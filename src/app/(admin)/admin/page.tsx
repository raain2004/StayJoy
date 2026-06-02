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

  // Fetch all properties
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, address, hotline, plan, expires_at, created_at')
    .order('name')

  const allProps = properties ?? []

  // Aggregate subscription stats
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  let active = 0, trial = 0, expired = 0, newThisMonth = 0

  allProps.forEach((p) => {
    const isExpired = p.expires_at ? new Date(p.expires_at) < now : false
    const plan = p.plan?.toLowerCase() || 'trial'
    
    if (isExpired) expired++
    else if (plan === 'trial') trial++
    else active++
    
    if (p.created_at && new Date(p.created_at) >= startOfMonth) newThisMonth++
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
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Expired (Hết Hạn)</p>
          <p className="text-2xl font-bold text-red-500">{expired}</p>
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
              {allProps.map((p) => {
                const isExpired = p.expires_at ? new Date(p.expires_at) < now : false
                const status = isExpired ? 'expired' : (p.plan?.toLowerCase() === 'trial' ? 'trial' : 'active')
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.hotline ?? '—'}</TableCell>
                    <TableCell>{p.plan?.toUpperCase() ?? 'TRIAL'}</TableCell>
                    <TableCell>
                      <SubscriptionBadge status={status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.expires_at
                        ? new Date(p.expires_at).toLocaleDateString('vi-VN')
                        : '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
