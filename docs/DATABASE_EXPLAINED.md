# StayJoy — Giải Thích Database

> 13 bảng trên Supabase (PostgreSQL). Mọi data tách biệt theo homestay qua `property_id`.

---

## Từng bảng là gì?

| # | Bảng | Là gì | Ví dụ |
|---|------|-------|-------|
| 1 | **properties** | Danh sách homestay. 1 dòng = 1 homestay. Bảng trung tâm. | "Dalat Pine Hill", "Oak Village" |
| 2 | **users_properties** | Ai quản lý homestay nào + role (owner/admin) | User A → "Dalat Pine Hill" (owner) |
| 3 | **rooms** | Danh sách phòng của từng homestay | P101 - Phòng Đôi - 2 người - 500k/đêm |
| 4 | **bookings** | Yêu cầu đặt phòng từ chatbot (log, không phải booking thật) | Nguyễn Văn A muốn đặt P101, 15-17/06, trạng thái: mới |
| 5 | **service_requests** | Yêu cầu dịch vụ từ khách (dọn phòng, thêm khăn...) | Phòng P101 yêu cầu thêm khăn tắm |
| 6 | **subscriptions** | Gói dịch vụ SaaS của từng homestay (trial/active/expired) | "Dalat Pine Hill" - trial - hết hạn 10/06 |
| 7 | **knowledge_base_sections** | Nội dung chatbot dùng trả lời khách (7 section bật/tắt) | Section "policies": "Check-in 14h, check-out 12h..." |
| 8 | **chatwoot_inbox_mapping** | Map inbox Chatwoot → homestay nào (để chatbot biết load KB nào) | inbox_id "2" → "Dalat Pine Hill" |
| 9 | **channel_mappings** | Kênh chat đã kết nối (Telegram, Zalo...) — admin quản lý | "Dalat Pine Hill" có Telegram + Zalo |
| 10 | **llm_settings** | Cấu hình AI model (provider, API key, fallback) | Global: Groq llama-3.3-70b |
| 11 | **room_images** | Ảnh phòng (owner upload, chatbot gửi cho khách) | P101 có 3 ảnh |
| 12 | **ical_feeds** | URL iCal từ Airbnb/Booking.com (owner paste vào) | P101 → https://airbnb.com/calendar/ical/xxx.ics |
| 13 | **ical_bookings** | Booking import từ OTA (hệ thống tự fetch, 1 chiều) | P101 bận 20-22/06 (từ Airbnb) |

---

## Quan hệ giữa các bảng

```
auth.users (tài khoản đăng nhập)
    │
    └──→ users_properties (ai quản lý homestay nào?)
                │
                ▼
         properties (TRUNG TÂM — 1 homestay)
           │
           ├──→ rooms (phòng)
           │      ├──→ room_images (ảnh phòng)
           │      └──→ ical_feeds (URL iCal OTA)
           │                └──→ ical_bookings (booking từ OTA)
           │
           ├──→ bookings (đặt phòng)
           ├──→ service_requests (yêu cầu dịch vụ)
           ├──→ subscriptions (gói SaaS)
           ├──→ knowledge_base_sections (nội dung chatbot)
           ├──→ channel_mappings (kênh chat kết nối)
           ├──→ chatwoot_inbox_mapping (inbox → property)
           └──→ llm_settings (cấu hình AI)
```

### Giải thích quan hệ

| Quan hệ | Ý nghĩa |
|---------|---------|
| 1 user → nhiều properties | 1 người có thể quản lý nhiều homestay (nhưng thực tế thường 1:1) |
| 1 property → nhiều rooms | 1 homestay có nhiều phòng |
| 1 property → nhiều bookings | 1 homestay có nhiều lượt đặt phòng |
| 1 property → 1 subscription | 1 homestay có đúng 1 gói dịch vụ |
| 1 property → tối đa 7 KB sections | 7 loại nội dung chatbot |
| 1 property → nhiều channels | 1 homestay kết nối nhiều kênh (Telegram + Zalo + ...) |
| 1 property → 0 hoặc 1 llm_settings | Config AI riêng (nếu không có → dùng global) |
| 1 room → nhiều ảnh | Mỗi phòng có gallery ảnh |
| 1 room → nhiều ical_feeds | 1 phòng đăng trên nhiều OTA (Airbnb + Booking.com) |
| 1 ical_feed → nhiều ical_bookings | 1 URL iCal chứa nhiều ngày bận |

---

## Ai dùng bảng nào?

| Vai trò | Bảng sử dụng |
|---------|-------------|
| **Owner** (chủ homestay) | rooms, bookings, service_requests, knowledge_base_sections, room_images, ical_feeds |
| **Admin** (super admin) | properties, users_properties, subscriptions, llm_settings, channel_mappings |
| **Chatbot** (tự động) | chatwoot_inbox_mapping → knowledge_base_sections + rooms + room_images + llm_settings |
| **Middleware** (auth check) | users_properties (role), subscriptions (hết hạn?) |
| **Calendar** (hiển thị lịch) | bookings + ical_bookings (gộp lại xem phòng trống) |
