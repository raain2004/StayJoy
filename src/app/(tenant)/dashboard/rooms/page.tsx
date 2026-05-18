'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

function formatVND(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} đ/đêm`
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // editValues: map of room_id -> current input string
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  // saving: set of room_ids currently being saved
  const [saving, setSaving] = useState<Set<string>>(new Set())
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
      const data: Room[] = json.rooms ?? []
      setRooms(data)
      // Initialize edit values from fetched data
      const initial: Record<string, string> = {}
      data.forEach((r) => { initial[r.room_id] = String(r.gia_dem) })
      setEditValues(initial)
    } catch {
      setError('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  async function handleSave(room: Room) {
    const newValue = Number(editValues[room.room_id])
    if (isNaN(newValue) || newValue < 0 || !Number.isInteger(newValue)) {
      toast({
        title: 'Giá không hợp lệ',
        description: 'Vui lòng nhập số nguyên không âm.',
        variant: 'destructive',
      })
      return
    }

    setSaving((prev) => new Set(prev).add(room.room_id))
    try {
      const res = await fetch(`/api/rooms/${room.room_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gia_dem: newValue }),
      })
      if (!res.ok) throw new Error('Update failed')
      const json = await res.json()
      const updated: Room = json.room
      setRooms((prev) => prev.map((r) => r.room_id === updated.room_id ? updated : r))
      setEditValues((prev) => ({ ...prev, [updated.room_id]: String(updated.gia_dem) }))
      toast({ title: 'Đã cập nhật giá phòng thành công.' })
    } catch {
      // Revert input to previous value
      setEditValues((prev) => ({ ...prev, [room.room_id]: String(room.gia_dem) }))
      toast({
        title: 'Cập nhật thất bại',
        description: 'Không thể cập nhật giá phòng. Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setSaving((prev) => { const s = new Set(prev); s.delete(room.room_id); return s })
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Quản Lý Phòng</h1>

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
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Không có phòng nào.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Số phòng</TableHead>
                <TableHead>Loại phòng</TableHead>
                <TableHead>Sức chứa</TableHead>
                <TableHead>Giá/đêm hiện tại</TableHead>
                <TableHead>Cập nhật giá</TableHead>
                <TableHead className="w-[160px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <React.Fragment key={room.room_id}>
                <TableRow>
                  <TableCell className="font-medium">{room.room_id}</TableCell>
                  <TableCell>{room.loai_phong}</TableCell>
                  <TableCell>{room.suc_chua} người</TableCell>
                  <TableCell className="text-muted-foreground">{formatVND(room.gia_dem)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      className="h-8 w-36"
                      value={editValues[room.room_id] ?? ''}
                      onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, [room.room_id]: e.target.value }))
                      }
                      disabled={saving.has(room.room_id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(room)}
                        disabled={
                          saving.has(room.room_id) ||
                          editValues[room.room_id] === String(room.gia_dem)
                        }
                      >
                        {saving.has(room.room_id) ? 'Đang lưu...' : 'Lưu'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (expandedRoom === room.room_id && expandedView === 'images') {
                            setExpandedRoom(null)
                          } else {
                            setExpandedRoom(room.room_id)
                            setExpandedView('images')
                          }
                        }}
                      >
                        {expandedRoom === room.room_id && expandedView === 'images' ? 'Ẩn hình' : 'Hình ảnh'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
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
                    </div>
                  </TableCell>
                </TableRow>
                {expandedRoom === room.room_id && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/30 p-4">
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
