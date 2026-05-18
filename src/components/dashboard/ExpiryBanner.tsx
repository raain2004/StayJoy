import { ExpiryState } from '@/lib/subscription'

interface ExpiryBannerProps {
  state: ExpiryState
}

const levelStyles = {
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: '⚠️',
  },
  urgent: {
    container: 'bg-orange-50 border-orange-200 text-orange-800',
    icon: '🔔',
  },
  critical: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: '🚨',
  },
}

export function ExpiryBanner({ state }: ExpiryBannerProps) {
  if (!state.shouldShow || !state.level) return null

  const styles = levelStyles[state.level]
  const daysText = state.daysLeft === 1 ? '1 ngày' : `${state.daysLeft} ngày`

  const title = state.isTrial
    ? `Gói dùng thử sắp hết hạn — còn ${daysText}`
    : `Subscription sắp hết hạn — còn ${daysText}`

  const description = state.isTrial
    ? 'Gói dùng thử của bạn sắp kết thúc. Vui lòng liên hệ admin để nâng cấp lên gói chính thức và tiếp tục sử dụng dịch vụ.'
    : 'Subscription của bạn sắp hết hạn. Vui lòng liên hệ admin để gia hạn và tránh bị gián đoạn dịch vụ.'

  return (
    <div className={`border px-4 py-3 ${styles.container}`} role="alert">
      <div className="flex items-start gap-2">
        <span aria-hidden="true">{styles.icon}</span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  )
}
