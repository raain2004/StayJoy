'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Cpu, LogOut, PieChart, LayoutDashboard, Hotel, Wallet2, MessageSquare, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/admin', label: 'Tổng Quan', icon: LayoutDashboard },
  { href: '/admin/properties', label: 'Properties', icon: Hotel },
  { href: '/admin/channels', label: 'Channels', icon: MessageSquare },
  { href: '/admin/onboard', label: 'Onboard', icon: UserPlus },
  { href: '/admin/llm-settings', label: 'AI Settings', icon: Cpu },
  { href: '/admin/analytics', label: 'AI Analytics', icon: PieChart },
  { href: '/admin/analytics/billing', label: 'Doanh Thu & Ví', icon: Wallet2 },
]

export function AdminSidebarNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === '/admin' || href === '/admin/analytics'
            ? pathname === href
            : pathname.startsWith(href)

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
      <div className="mt-auto pt-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full rounded-md px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </nav>
  )
}
