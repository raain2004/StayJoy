import { OnboardForm } from '@/components/admin/OnboardForm'

export default function AdminOnboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Onboard Property Mới</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tạo property mới với subscription trial 14 ngày và tài khoản chủ nhà.
        </p>
      </div>

      <OnboardForm />
    </div>
  )
}
