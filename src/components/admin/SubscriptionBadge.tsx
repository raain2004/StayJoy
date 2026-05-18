import { Badge } from '@/components/ui/badge'

type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled' | string

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  trial: { label: 'Trial', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  expired: { label: 'Expired', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
}

export function SubscriptionBadge({ status }: { status: SubscriptionStatus }) {
  const config = statusConfig[status] ?? { label: status, variant: 'outline' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
