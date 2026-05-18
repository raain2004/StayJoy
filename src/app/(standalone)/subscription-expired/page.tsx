import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/auth/SignOutButton'

export default async function SubscriptionExpiredPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="w-full max-w-md space-y-6 text-center">
      <div className="space-y-2">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <svg
              className="h-10 w-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Subscription đã hết hạn
        </h1>
        <p className="text-gray-600">
          Gói dịch vụ của bạn đã hết hạn. Bạn không thể truy cập dashboard cho đến khi được gia hạn.
        </p>
      </div>

      {user?.email && (
        <div className="rounded-lg border bg-gray-50 px-4 py-3 text-sm text-gray-700">
          Tài khoản: <span className="font-medium">{user.email}</span>
        </div>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800 space-y-1">
        <p className="font-medium">Liên hệ admin để gia hạn</p>
        <p>Vui lòng liên hệ quản trị viên hệ thống để gia hạn gói dịch vụ và khôi phục quyền truy cập.</p>
      </div>

      <SignOutButton />
    </div>
  )
}
