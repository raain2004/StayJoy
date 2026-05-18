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

export default async function AdminPropertiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userProp } = await supabase
    .from('users_properties')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (userProp?.role !== 'admin') redirect('/dashboard')

  const { data: properties } = await supabase
    .from('properties')
    .select(`
      id, name, address, hotline,
      subscriptions (id, plan, status, trial_ends_at, expires_at)
    `)
    .order('name')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Danh Sách Properties</h1>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên Property</TableHead>
              <TableHead>Địa Chỉ</TableHead>
              <TableHead>Hotline</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Trạng Thái</TableHead>
              <TableHead>Hết Hạn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(properties ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Không có property nào
                </TableCell>
              </TableRow>
            ) : (
              (properties ?? []).map((property) => {
                const subs = property.subscriptions as { id: string; plan: string; status: string; trial_ends_at: string | null; expires_at: string | null }[]
                const sub = subs?.[0]
                return (
                  <TableRow key={property.id}>
                    <TableCell className="font-medium">{property.name}</TableCell>
                    <TableCell>{property.address ?? '—'}</TableCell>
                    <TableCell>{property.hotline ?? '—'}</TableCell>
                    <TableCell>{sub?.plan ?? '—'}</TableCell>
                    <TableCell>
                      {sub ? <SubscriptionBadge status={sub.status} /> : '—'}
                    </TableCell>
                    <TableCell>
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
  )
}
