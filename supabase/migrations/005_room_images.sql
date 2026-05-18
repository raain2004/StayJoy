-- Migration: Room Images
-- Cho phép lưu hình ảnh phòng để chatbot gửi cho khách

CREATE TABLE room_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      TEXT NOT NULL,
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  image_url    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_room_images_room ON room_images(room_id, property_id);

-- RLS
ALTER TABLE room_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can manage own room images"
  ON room_images
  FOR ALL
  USING (
    property_id IN (
      SELECT property_id FROM users_properties
      WHERE user_id = auth.uid()
    )
  );

-- Tạo Storage bucket (chạy riêng trong SQL Editor nếu cần):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('room-images', 'room-images', true);
