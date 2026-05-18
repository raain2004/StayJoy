'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'

interface OnboardFormData {
  property_name: string
  address: string
  hotline: string
  description: string
  inbox_id: string
  owner_email: string
  owner_password: string
}

const INITIAL: OnboardFormData = {
  property_name: '',
  address: '',
  hotline: '',
  description: '',
  inbox_id: '',
  owner_email: '',
  owner_password: '',
}

export function OnboardForm() {
  const { toast } = useToast()
  const router = useRouter()
  const [form, setForm] = useState<OnboardFormData>(INITIAL)
  const [loading, setLoading] = useState(false)

  function handleChange(field: keyof OnboardFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) {
        // Better error messages
        let errorMsg = json.error || 'Lỗi không xác định'
        if (errorMsg.includes('already been registered') || errorMsg.includes('already exists')) {
          errorMsg = 'Email này đã được sử dụng. Vui lòng dùng email khác.'
        }
        toast({ title: 'Onboard thất bại', description: errorMsg, variant: 'destructive' })
        return
      }
      toast({
        title: '✓ Onboard thành công!',
        description: `Đã tạo property "${form.property_name}" với tài khoản ${form.owner_email}`,
      })
      setForm(INITIAL)
      // Refresh server data so admin overview updates without manual page reload
      router.refresh()
    } catch {
      toast({ title: 'Lỗi kết nối', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="property_name">Tên Property *</Label>
        <Input
          id="property_name"
          value={form.property_name}
          onChange={(e) => handleChange('property_name', e.target.value)}
          required
          placeholder="Homestay ABC"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="address">Địa Chỉ</Label>
        <Input
          id="address"
          value={form.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="123 Đường XYZ, TP.HCM"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="hotline">Hotline</Label>
        <Input
          id="hotline"
          value={form.hotline}
          onChange={(e) => handleChange('hotline', e.target.value)}
          placeholder="0901234567"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Mô Tả</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Mô tả ngắn về homestay..."
          rows={3}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="inbox_id">Chatwoot Inbox ID</Label>
        <Input
          id="inbox_id"
          value={form.inbox_id}
          onChange={(e) => handleChange('inbox_id', e.target.value)}
          placeholder="inbox_abc123"
        />
      </div>

      <hr className="my-2" />

      <div className="space-y-1">
        <Label htmlFor="owner_email">Email Chủ Nhà *</Label>
        <Input
          id="owner_email"
          type="email"
          value={form.owner_email}
          onChange={(e) => handleChange('owner_email', e.target.value)}
          required
          placeholder="owner@example.com"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="owner_password">Mật Khẩu *</Label>
        <Input
          id="owner_password"
          type="password"
          value={form.owner_password}
          onChange={(e) => handleChange('owner_password', e.target.value)}
          required
          placeholder="Tối thiểu 8 ký tự"
          minLength={8}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Đang tạo...' : 'Onboard Property Mới'}
      </Button>
    </form>
  )
}
