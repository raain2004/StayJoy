import Link from 'next/link'
import { AdminSidebarNav } from '@/components/admin/AdminSidebarNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r bg-card flex flex-col">
        <div className="px-6 py-5 border-b">
          <Link href="/admin" className="text-lg font-semibold tracking-tight">
            StayJoy Admin
          </Link>
        </div>
        <AdminSidebarNav />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
