'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { RoomImageGallery } from '@/components/dashboard/RoomImageGallery'
import { ICalFeedManager } from '@/components/dashboard/ICalFeedManager'

interface Room {
  room_id: string
  property_id: string
  loai_phong: string
  suc_chua: number
  gia_dem: number
}

interface EditState {
  loai_phong: string
  suc_chua: string
  gia_dem: string
}

function formatVND(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} đ/đêm`
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add room form
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ room_id: '', loai_phong: '', suc_chua: '2', gia_dem: '0' })
  const [adding, setAdding] = useState(false)

  // Edit mode
  const [editingRoom, setEditingRoom] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ loai_phong: '', suc_chua: '', gia_dem: '' })
  const [saving, setSaving] = useState<Set<string>>(new Set())

  // Delete
  const [deleting, setDeleting] = useState<Set<string>>(new Set())

  // Expanded panels
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null)
  const [expandedView, setExpandedView] = useState<'images' | 'ical'>('images')

  const { toast } = useToast()

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rooms')
      if (!res.ok) throw new Error('Không thể tải danh sách phòng')
      const json = await res.json()
      setRooms(json.rooms ?? [])
    } catch {
      setError('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  // --- Add Room ---
  async function handleAdd() {
    const { room_id, loai_phong, suc_chua, gia_dem } = addForm
    if (!room_id.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập số phòng.', variant: 'destructive' })
      return
    }
    if (!loai_phong.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập loại phòng.', variant: 'destructive' })
      return
    }
    const sucChuaNum = Number(suc_chua)
    if (!Number.isInteger(sucChuaNum) || sucChuaNum < 1) {
      toast({ title: 'Lỗi', description: 'Sức chứa phải là số nguyên dương.', variant: 'destructive' })
      return
    }
    const giaDemNum = Number(gia_dem)
    if (!Number.isInteger(giaDemNum) || giaDemNum < 0) {
      toast({ title: 'Lỗi', description: 'Giá/đêm phải là số nguyên không âm.', variant: 'destructive' })
      return
    }

    setAdding(true)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: room_id.trim(),
          loai_phong: loai_phong.trim(),
          suc_chua: sucChuaNum,
          gia_dem: giaDemNum,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Thêm phòng thất bại')
      }
      const json = await res.json()
      setRooms((prev) => [...prev, json.room])
      setAddForm({ room_id: '', loai_phong: '', suc_chua: '2', gia_dem: '0' })
      setShowAddForm(false)
      toast({ title: 'Đã thêm phòng mới thành công.' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
      toast({ title: 'Thêm phòng thất bại', description: msg, variant: 'destructive' })
    } finally {
      setAdding(false)
    }
  }

  // --- Edit Room ---
  function startEdit(room: Room) {
    setEditingRoom(room.room_id)
    setEditState({
      loai_phong: room.loai_phong,
      suc_chua: String(room.suc_chua),
      gia_dem: String(room.gia_dem),
    })
  }

  function cancelEdit() {
    setEditingRoom(null)
  }

  async function handleSave(room: Room) {
    const sucChuaNum = Number(editState.suc_chua)
    const giaDemNum = Number(editState.gia_dem)

    if (!editState.loai_phong.trim()) {
      toast({ title: 'Lỗi', description: 'Loại phòng không được để trống.', variant: 'destructive' })
      return
    }
    if (!Number.isInteger(sucChuaNum) || sucChuaNum < 1) {
      toast({ title: 'Lỗi', description: 'Sức chứa phải là số nguyên dương.', variant: 'destructive' })
      return
    }
    if (!Number.isInteger(giaDemNum) || giaDemNum < 0) {
      toast({ title: 'Lỗi', description: 'Giá/đêm phải là số nguyên không âm.', variant: 'destructive' })
      return
    }

    // Check if anything changed
    if (
      editState.loai_phong.trim() === room.loai_phong &&
      sucChuaNum === room.suc_chua &&
      giaDemNum === room.gia_dem
    ) {
      setEditingRoom(null)
      return
    }

    setSaving((prev) => new Set(prev).add(room.room_id))
    try {
      const res = await fetch(`/api/rooms/${room.room_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loai_phong: editState.loai_phong.trim(),
          suc_chua: sucChuaNum,
          gia_dem: giaDemNum,
        }),
      })
      if (!res.ok) throw new Error('Update failed')
      const json = await res.json()
      setRooms((prev) => prev.map((r) => r.room_id === json.room.room_id ? json.room : r))
      setEditingRoom(null)
      toast({ title: 'Đã cập nhật phòng thành công.' })
    } catch {
      toast({
        title: 'Cập nhật thất bại',
        description: 'Không thể cập nhật phòng. Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setSaving((prev) => { const s = new Set(prev); s.delete(room.room_id); return s })
    }
  }

  // --- Delete Room ---
  async function handleDelete(room: Room) {
    if (!confirm(`Xác nhận xóa phòng "${room.room_id}"? Hành động này không thể hoàn tác.`)) return

    setDeleting((prev) => new Set(prev).add(room.room_id))
    try {
      const res = await fetch(`/api/rooms/${room.room_id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setRooms((prev) => prev.filter((r) => r.room_id !== room.room_id))
      if (expandedRoom === room.room_id) setExpandedRoom(null)
      if (editingRoom === room.room_id) setEditingRoom(null)
      toast({ title: `Đã xóa phòng "${room.room_id}".` })
    } catch {
      toast({
        title: 'Xóa thất bại',
        description: 'Không thể xóa phòng. Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(room.room_id); return s })
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Quản Lý Phòng</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Đóng' : '+ Thêm Phòng'}
        </Button>
      </div>

      {/* Add Room Form */}
      {showAddForm && (
        <div className="rounded-lg border p-4 mb-6 space-y-4 bg-muted/30">
          <h2 className="font-semibold">Thêm Phòng Mới</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="add-room-id">Số phòng</Label>
              <Input
                id="add-room-id"
                value={addForm.room_id}
                onChange={(e) => setAddForm((f) => ({ ...f, room_id: e.target.value }))}
                placeholder="VD: P101"
                disabled={adding}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-loai-phong">Loại phòng</Label>
              <Input
                id="add-loai-phong"
                value={addForm.loai_phong}
                onChange={(e) => setAddForm((f) => ({ ...f, loai_phong: e.target.value }))}
                placeholder="VD: Phòng Đôi"
                disabled={adding}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-suc-chua">Sức chứa</Label>
              <Input
                id="add-suc-chua"
                type="number"
                min={1}
                value={addForm.suc_chua}
                onChange={(e) => setAddForm((f) => ({ ...f, suc_chua: e.target.value }))}
                disabled={adding}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-gia-dem">Giá/đêm (VNĐ)</Label>
              <Input
                id="add-gia-dem"
                type="number"
                min={0}
                value={addForm.gia_dem}
                onChange={(e) => setAddForm((f) => ({ ...f, gia_dem: e.target.value }))}
                disabled={adding}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? 'Đang thêm...' : 'Thêm Phòng'}
            </Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)} disabled={adding}>
              Hủy
            </Button>
          </div>
        </div>
      )}

      {/* Room List */}
      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchRooms}>Thử lại</Button>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          <p>Chưa có phòng nào.</p>
          <p className="mt-1">Nhấn &quot;+ Thêm Phòng&quot; để bắt đầu.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Số phòng</TableHead>
                <TableHead>Loại phòng</TableHead>
                <TableHead>Sức chứa</TableHead>
                <TableHead>Giá/đêm</TableHead>
                <TableHead className="w-[280px]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <React.Fragment key={room.room_id}>
                  <TableRow>
                    <TableCell className="font-medium">{room.room_id}</TableCell>
                    <TableCell>
                      {editingRoom === room.room_id ? (
                        <Input
                          className="h-8 w-40"
                          value={editState.loai_phong}
                          onChange={(e) => setEditState((s) => ({ ...s, loai_phong: e.target.value }))}
                          disabled={saving.has(room.room_id)}
                        />
                      ) : (
                        room.loai_phong
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRoom === room.room_id ? (
                        <Input
                          type="number"
                          min={1}
                          className="h-8 w-20"
                          value={editState.suc_chua}
                          onChange={(e) => setEditState((s) => ({ ...s, suc_chua: e.target.value }))}
                          disabled={saving.has(room.room_id)}
                        />
                      ) : (
                        `${room.suc_chua} người`
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRoom === room.room_id ? (
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-32"
                          value={editState.gia_dem}
                          onChange={(e) => setEditState((s) => ({ ...s, gia_dem: e.target.value }))}
                          disabled={saving.has(room.room_id)}
                        />
                      ) : (
                        formatVND(room.gia_dem)
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {editingRoom === room.room_id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSave(room)}
                              disabled={saving.has(room.room_id)}
                            >
                              {saving.has(room.room_id) ? 'Lưu...' : 'Lưu'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              disabled={saving.has(room.room_id)}
                            >
                              Hủy
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => startEdit(room)}>
                              Sửa
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(room)}
                              disabled={deleting.has(room.room_id)}
                            >
                              {deleting.has(room.room_id) ? 'Xóa...' : 'Xóa'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (expandedRoom === room.room_id && expandedView === 'images') {
                                  setExpandedRoom(null)
                                } else {
                                  setExpandedRoom(room.room_id)
                                  setExpandedView('images')
                                }
                              }}
                            >
                              {expandedRoom === room.room_id && expandedView === 'images' ? 'Ẩn hình' : 'Hình'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (expandedRoom === room.room_id && expandedView === 'ical') {
                                  setExpandedRoom(null)
                                } else {
                                  setExpandedRoom(room.room_id)
                                  setExpandedView('ical')
                                }
                              }}
                            >
                              {expandedRoom === room.room_id && expandedView === 'ical' ? 'Ẩn iCal' : 'iCal'}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRoom === room.room_id && editingRoom !== room.room_id && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/30 p-4">
                        {expandedView === 'images' ? (
                          <RoomImageGallery roomId={room.room_id} />
                        ) : (
                          <ICalFeedManager roomId={room.room_id} propertyId={room.property_id} />
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
