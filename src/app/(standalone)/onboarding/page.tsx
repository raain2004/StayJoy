import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/auth/SignOutButton'

export default async function OnboardingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="w-full max-w-md space-y-6 text-center">
      <div className="space-y-2">
        <div className="flex justify-center">
          <div className="rounded-full bg-blue-100 p-4">
            <svg
              className="h-10 w-10 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Tài khoản chưa được thiết lập
        </h1>
        <p className="text-gray-600">
          Tài khoản của bạn chưa được liên kết với bất kỳ property nào. Vui lòng liên hệ admin để được cấp quyền truy cập.
        </p>
      </div>

      {user?.email && (
        <div className="rounded-lg border bg-gray-50 px-4 py-3 text-sm text-gray-700">
          Email tài khoản:{' '}
          <span className="font-medium">{user.email}</span>
        </div>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800 space-y-1 text-left">
        <p className="font-medium">Hướng dẫn liên hệ admin</p>
        <p>Gửi email trên cho admin hệ thống để được liên kết tài khoản với property của bạn. Admin sẽ xác nhận danh tính qua địa chỉ email và hoàn tất thiết lập.</p>
      </div>

      <SignOutButton />
    </div>
  )
}
