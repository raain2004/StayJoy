# StayJoy — Final System Design v4

> Nền tảng SaaS quản lý homestay tích hợp AI Chatbot đa kênh.
> Chủ homestay quản lý đặt phòng, phòng, và chatbot tự động trả lời khách — tất cả trong 1 dashboard.

**Cập nhật**: 28/05/2026 — Bỏ n8n, chatbot chạy trực tiếp trong Next.js. Bỏ trang Settings/Revenue. Thêm Cloudflare Tunnel HTTPS.

---

## 1. MAIN FEATURES (Tenant Dashboard)

Mỗi chủ homestay (owner) đăng nhập vào dashboard riêng tại `/dashboard`.

### 1.1 Tổng Quan (Dashboard Home)
- KPI cards: Tổng Booking Tháng | Tổng Trò Chuyện Tháng | Yêu Cầu Dịch Vụ Chờ | Tỷ Lệ Phòng Trống

### 1.2 Lịch Phòng (Calendar)
- Grid trực quan: trục X = ngày trong tháng, trục Y = từng phòng
- Màu sắc phân biệt: trống / đã đặt / đang ở
- Điều hướng tháng trước / tháng sau

### 1.3 Yêu Cầu Đặt Phòng
- Danh sách khách muốn đặt phòng (chatbot thu thập info → lưu lại)
- **Không phải booking thật** — chủ nhà đặt phòng trên PMS riêng (Airbnb/Booking.com)
- Trạng thái: **Mới** (chatbot vừa gửi) → **Đã liên hệ** (chủ nhà đã gọi khách)
- Xem chi tiết: tên khách, SĐT, phòng muốn đặt, ngày check-in/out

### 1.4 Yêu Cầu Dịch Vụ
- Hiển thị yêu cầu từ khách (chatbot thu thập info → gửi thông báo)
- Owner cập nhật trạng thái: Mới → Đang xử lý → Hoàn thành

### 1.5 Quản Lý Phòng (CRUD đầy đủ)
- **Thêm phòng**: mã phòng, loại phòng, sức chứa, giá/đêm
- **Sửa phòng**: inline edit loại phòng, sức chứa, giá/đêm
- **Xóa phòng**: confirm dialog
- Upload ảnh phòng
- Quản lý iCal feeds (sync Airbnb/Booking.com)

### 1.6 Hội Thoại Chatbot
- Danh sách hội thoại từ Chatwoot (qua API)
- KPI cards: tổng hội thoại, đang mở, đã giải quyết, tháng này
- Filter theo trạng thái (open / resolved / pending)
- Link trực tiếp đến Chatwoot để xem chi tiết

### 1.7 AI Chatbot — Knowledge Base Editor
- 7 section nội dung bật/tắt độc lập:
  | Section | Nội dung |
  |---------|----------|
  | general_info | Tên, địa chỉ, hotline, mô tả homestay |
  | rooms_pricing | Bảng giá phòng (tự động lấy từ DB) |
  | policies | Chính sách check-in/out, hủy phòng, nội quy |
  | amenities | Tiện ích: wifi, bể bơi, BBQ... |
  | upsell | Dịch vụ thêm: romance setup, thuê xe... |
  | faq | Câu hỏi thường gặp |
  | sister_properties | Giới thiệu homestay liên kết |
- Preview system prompt tổng hợp

### Các trang đã xóa khỏi Owner Dashboard:
- ~~Settings~~ (đã xóa — thông tin property chỉnh qua admin)
- ~~Revenue~~ (đã xóa — không cần thiết cho MVP)

---

## 2. ADMIN PANEL

Super admin quản lý toàn bộ nền tảng tại `/admin`.

### 2.1 Tổng Quan
- KPI: Tổng properties | Active | Trial | Mới tháng này | Expired | Cancelled
- Bảng danh sách tất cả properties + plan + trạng thái

### 2.2 Onboard Property Mới
- Form 1 bước: nhập tên homestay + email/password cho owner
- Tự động tạo: property + user + subscription trial 14 ngày

### 2.3 Quản Lý Subscription
- Bảng inline edit: đổi plan (trial/basic/pro) và status
- Gia hạn hoặc hủy subscription

### 2.4 Cấu Hình AI Model
- Chọn LLM provider: Gemini / OpenAI / Anthropic / Groq
- Cấu hình per-property hoặc global
- Fallback provider: tự động chuyển khi primary fail
- Test connection

### 2.5 Quản Lý Kênh Chatbot
- Thêm / bật-tắt / xóa kênh cho từng property
- 6 kênh: Telegram, Zalo OA, Messenger, Instagram, WhatsApp, Website

---

## 3. AI CHATBOT FLOW (Không còn n8n)

### 3.1 Kiến trúc mới

```
Khách nhắn (Telegram/Zalo/Messenger/Web)
    │
    ▼
Chatwoot (nhận tin nhắn, quản lý hội thoại)
    │
    │ webhook (POST http://nextjs:3000/api/chatwoot/webhook)
    ▼
Next.js API Route (/api/chatwoot/webhook)
    │
    ├─ 1. Parse payload (message_type = "incoming"?)
    ├─ 2. Lookup property_id từ inbox_id (chatwoot_inbox_mapping)
    ├─ 3. Build system message từ knowledge_base_sections + rooms
    ├─ 4. Gọi LLM (Groq → Gemini → OpenAI fallback)
    ├─ 5. Reply qua Chatwoot API (POST /conversations/:id/messages)
    │
    ▼
Chatwoot gửi reply → Telegram/Zalo/Messenger
```

### 3.2 Ưu điểm so với n8n

| Trước (n8n) | Sau (Next.js trực tiếp) |
|-------------|------------------------|
| 3 hops: Chatwoot → n8n → Next.js API → n8n → Chatwoot | 1 hop: Chatwoot → Next.js → Chatwoot |
| Cần cấu hình n8n workflow riêng | Code-based, version controlled |
| Thêm 1 container (~300MB RAM) | Không cần container thêm |
| Khó debug (visual workflow) | Dễ debug (server logs) |

### 3.3 Environment Variables cần thiết

```env
# Cho webhook handler reply lại Chatwoot
CHATWOOT_BOT_TOKEN=xxx          # Access token từ Chatwoot profile
CHATWOOT_URL=http://chatwoot-web:3000  # Internal Docker URL

# Cho conversations page (owner xem hội thoại)
CHATWOOT_BASE_URL=http://chatwoot-web:3000
CHATWOOT_ACCOUNT_ID=2
CHATWOOT_API_TOKEN=xxx

# LLM
LLM_PROVIDER=groq
LLM_MODEL=llama-3.3-70b-versatile
GROQ_API_KEY=xxx
```

---

## 4. INFRASTRUCTURE

### 4.1 Kiến trúc hiện tại (Testing)

```
┌─────────────────────────────────────────────────────┐
│              AWS EC2 (t3.small, ap-southeast-1)      │
│              IP: 47.131.37.143                       │
├─────────────────────────────────────────────────────┤
│  Docker Compose:                                     │
│  ├── nextjs          :3000  (Dashboard + API + Bot)  │
│  ├── chatwoot-web    :3001  (Messaging platform)     │
│  ├── chatwoot-worker        (Sidekiq background)     │
│  ├── chatwoot-postgres      (pgvector/pgvector:pg15) │
│  └── redis           :6379  (Cache)                  │
│                                                      │
│  Cloudflare Tunnel (cloudflared service):            │
│  ├── app.stayjoy.io.vn  → localhost:3000             │
│  └── chat.stayjoy.io.vn → localhost:3001             │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│         Supabase Cloud (PostgreSQL + Auth)            │
│         nhxejbjglgxulwlemqaj.supabase.co             │
└─────────────────────────────────────────────────────┘
```

### 4.2 URLs

| Service | URL | Ghi chú |
|---------|-----|---------|
| Owner Dashboard | https://app.stayjoy.io.vn/dashboard | Cloudflare Tunnel |
| Admin Panel | https://app.stayjoy.io.vn/admin | Cloudflare Tunnel |
| Chatwoot | https://chat.stayjoy.io.vn | Cloudflare Tunnel |
| Direct IP (backup) | http://47.131.37.143:3000 | Không HTTPS |

### 4.3 Domain & DNS

- **Domain**: stayjoy.io.vn (mua tại Tenten)
- **Nameservers**: Cloudflare
- **Tunnel ID**: 32ed5f54-07f2-44db-8ed7-cc08c33201a6
- **CNAME records**: app.stayjoy.io.vn, chat.stayjoy.io.vn → tunnel

### 4.4 Docker Compose Services

| Service | Image | Port | RAM ước tính |
|---------|-------|------|-------------|
| nextjs | Custom (node:20-alpine) | 3000 | ~200MB |
| chatwoot-web | chatwoot/chatwoot:latest | 3001 | ~800MB |
| chatwoot-worker | chatwoot/chatwoot:latest | — | ~400MB |
| chatwoot-postgres | pgvector/pgvector:pg15 | 5432 | ~200MB |
| redis | redis:7-alpine | 6379 | ~50MB |
| **n8n** | ~~n8nio/n8n~~ | ~~5678~~ | **Không dùng nữa** |

> **Lưu ý**: n8n vẫn có trong docker-compose.yml nhưng không cần thiết cho chatbot flow. Có thể xóa để tiết kiệm RAM.

### 4.5 Webhook Flow (Internal Docker Network)

```
Telegram → Chatwoot (nhận qua Telegram Bot API webhook HTTPS)
    │
    │ Chatwoot worker gửi webhook
    │ URL: http://nextjs:3000/api/chatwoot/webhook
    │ (Internal Docker network — không cần HTTPS)
    ▼
Next.js container xử lý → gọi LLM → reply qua Chatwoot API
```

---

## 5. ANALYTICS

### 5.1 Owner Dashboard (Tổng Quan — `/dashboard`)

| KPI Card | Nguồn dữ liệu | Công thức |
|----------|---------------|-----------|
| Tổng Booking Tháng | bảng `bookings` | COUNT bookings có check_in trong tháng hiện tại |
| Tổng Trò Chuyện Tháng | bảng `bookings` | COUNT bookings có conversation_id NOT NULL và timestamp trong tháng |
| Yêu Cầu Dịch Vụ Chờ | bảng `service_requests` | COUNT có trang_thai IN ('Mới', 'Đang xử lý') |
| Tỷ Lệ Phòng Trống | bảng `rooms` + `bookings` | (Tổng phòng - Phòng có booking active hôm nay) / Tổng phòng |

### 5.2 Owner — Trang Hội Thoại (`/dashboard/conversations`)

| Metric | Nguồn | Hiển thị |
|--------|-------|----------|
| Tháng này | Chatwoot API (filter created_at >= đầu tháng) | KPI card |
| Tổng cộng | Chatwoot API (all_count) | KPI card |
| Đang mở | Chatwoot API (open_count) | KPI card (vàng) |
| Đã giải quyết | Chatwoot API (resolved_count) | KPI card (xanh) |

### 5.3 Admin Panel (Tổng Quan — `/admin`)

| KPI Card | Nguồn | Công thức |
|----------|-------|-----------|
| Tổng Properties | bảng `properties` | COUNT(*) |
| Active | bảng `subscriptions` | COUNT status = 'active' |
| Trial | bảng `subscriptions` | COUNT status = 'trial' |
| Mới tháng này | bảng `subscriptions` | COUNT started_at >= đầu tháng |
| Expired | bảng `subscriptions` | COUNT status = 'expired' |
| Cancelled | bảng `subscriptions` | COUNT status = 'cancelled' |

### 5.4 Admin — Bảng chi tiết

| Cột | Nguồn |
|-----|-------|
| Tên property | properties.name |
| Plan | subscriptions.plan |
| Status | subscriptions.status |
| Ngày bắt đầu | subscriptions.started_at |
| Hết hạn | subscriptions.expires_at |
| Tổng bookings | COUNT bookings per property |
| Tổng phòng | COUNT rooms per property |

---

## 6. DATABASE (Supabase)

### 6.1 Bảng chính (13 bảng)

| Bảng | Mô tả |
|------|-------|
| properties | Homestay (1 row = 1 tenant) |
| users_properties | User ↔ Property mapping + role |
| rooms | Danh sách phòng |
| bookings | Đặt phòng |
| service_requests | Yêu cầu dịch vụ |
| subscriptions | Gói SaaS |
| knowledge_base_sections | Nội dung chatbot (7 sections) |
| chatwoot_inbox_mapping | inbox_id → property_id |
| channel_mappings | Kênh chat kết nối |
| llm_settings | Cấu hình AI model |
| room_images | Ảnh phòng |
| ical_feeds | URL iCal từ OTA (Airbnb/Booking.com) |
| ical_bookings | Booking import từ OTA (1 chiều) |

### 6.2 Quan hệ giữa các bảng

```
                              ┌─────────────────┐
                              │   auth.users    │
                              └────────┬────────┘
                                       │ 1:N
                                       ▼
                            ┌──────────────────────┐
                            │  users_properties    │
                            │  (user_id, prop_id,  │
                            │   role)              │
                            └──────────┬───────────┘
                                       │ N:1
                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         properties                                  │
│                (Bảng trung tâm — 1 row = 1 homestay)                │
└──┬──────┬──────────┬──────────┬─────────┬─────────┬────────┬────────┘
   │      │          │          │         │         │        │
   ▼      ▼          ▼          ▼         ▼         ▼        ▼
rooms  bookings  service_   subscrip-  channel_  llm_     knowledge_
                 requests   tions      mappings  settings base_sections
  │
  ├── room_images (1:N)
  └── ical_feeds (1:N) → ical_bookings (1:N)

chatwoot_inbox_mapping (inbox_id → property_id)
```

| Từ → Đến | Loại | Ý nghĩa |
|-----------|------|---------|
| auth.users → users_properties | 1:N | 1 user có thể quản lý nhiều homestay |
| properties → users_properties | 1:N | 1 homestay có nhiều user (owner + admin) |
| properties → rooms | 1:N | 1 homestay có nhiều phòng |
| properties → bookings | 1:N | 1 homestay có nhiều booking |
| properties → service_requests | 1:N | 1 homestay có nhiều yêu cầu dịch vụ |
| properties → subscriptions | 1:1 | 1 homestay có đúng 1 gói dịch vụ |
| properties → channel_mappings | 1:N | 1 homestay kết nối nhiều kênh chat |
| properties → llm_settings | 0..1 | 1 homestay có tối đa 1 config AI riêng (NULL = global) |
| properties → knowledge_base_sections | 1:7 | 1 homestay có tối đa 7 sections |
| properties → chatwoot_inbox_mapping | 1:N | 1 homestay có nhiều inbox |
| rooms → room_images | 1:N | 1 phòng có nhiều ảnh |
| rooms → ical_feeds | 1:N | 1 phòng sync nhiều OTA |
| ical_feeds → ical_bookings | 1:N | 1 feed import nhiều bookings |

### 6.3 Booking Status (đổi thành Yêu Cầu Đặt Phòng)

Bảng `bookings` giờ là **log yêu cầu đặt phòng** từ chatbot, không phải booking thật:
- `mới` — Chatbot vừa gửi thông báo cho chủ nhà
- `đã liên hệ` — Chủ nhà đã liên hệ khách

Chủ nhà đặt phòng chính thức trên PMS riêng (Airbnb/Booking.com). StayJoy chỉ import lịch qua iCal để xem phòng trống.

---

## 6. DEPLOYMENT PROCESS

### Deploy code mới lên EC2:

```bash
# 1. Tạo tar từ src/
tar -czf src.tar.gz -C . src

# 2. Upload lên server
scp -i infra/.ssh/StayJoy_key.pem src.tar.gz ubuntu@47.131.37.143:~/src.tar.gz

# 3. SSH vào server, extract, build, restart
ssh -i infra/.ssh/StayJoy_key.pem ubuntu@47.131.37.143
tar -xzf ~/src.tar.gz -C ~/deploy/
sudo rm -rf /opt/stayjoy/src && sudo cp -r ~/deploy/src /opt/stayjoy/
cd /opt/stayjoy && sudo docker compose build nextjs
sudo docker compose up -d --force-recreate nextjs
```

### Thời gian deploy: ~2-3 phút (build Docker image)

---

## 7. THAY ĐỔI SO VỚI v3

| Hạng mục | v3 | v4 (hiện tại) |
|----------|----|----|
| Chatbot engine | n8n workflow | Next.js API route trực tiếp |
| Booking status | 7 trạng thái | 2 trạng thái (pending/confirmed) |
| Owner sidebar | 9 items (có Settings, Revenue) | 7 items (xóa Settings, Revenue) |
| Dashboard KPI | Booking + Revenue + Service + Vacancy | Booking + Conversations + Service + Vacancy |
| Room management | Chỉ sửa giá | CRUD đầy đủ (thêm/sửa/xóa) |
| HTTPS | Không có | Cloudflare Tunnel (app.stayjoy.io.vn) |
| Domain | Chưa có | stayjoy.io.vn (Tenten → Cloudflare) |
| Chatwoot PostgreSQL | postgres:15 | pgvector/pgvector:pg15 |
| Webhook internal | Qua external URL | Docker network (http://nextjs:3000) |
