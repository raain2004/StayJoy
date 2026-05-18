'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems: { href: string; label: string; icon?: LucideIcon }[] = [
  { href: '/dashboard', label: 'Tổng Quan' },
  { href: '/dashboard/calendar', label: 'Lịch Phòng' },
  { href: '/dashboard/bookings', label: 'Quản Lý Booking' },
  { href: '/dashboard/services', label: 'Yêu Cầu Dịch Vụ' },
  { href: '/dashboard/revenue', label: 'Doanh Thu' },
  { href: '/dashboard/rooms', label: 'Quản Lý Phòng' },
  { href: '/dashboard/conversations', label: 'Hội Thoại' },
  { href: '/dashboard/ai-chatbot', label: 'AI Chatbot', icon: Bot },
  { href: '/dashboard/settings', label: 'Cài Đặt' },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === '/dashboard' ? pathname === href : pathname.startsWith(href)

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
