# StayJoy — Final System Design

> Nền tảng SaaS quản lý homestay tích hợp AI Chatbot đa kênh.
> Chủ homestay quản lý đặt phòng, doanh thu, và chatbot tự động trả lời khách — tất cả trong 1 dashboard.

---

## 1. MAIN FEATURES (Tenant Dashboard)

Mỗi chủ homestay (owner) đăng nhập vào dashboard riêng tại `/dashboard`.

### 1.1 Quản Lý Đặt Phòng
- Bảng danh sách booking với filter theo trạng thái
- Owner **tạo booking thủ công** sau khi nhận thông báo từ chatbot
- Cập nhật trạng thái: pending → confirmed → check-in → đang ở / cancelled
- Xem chi tiết: tên khách, SĐT, phòng, ngày check-in/out

### 1.2 Lịch Phòng (Calendar)
- Grid trực quan: trục X = ngày trong tháng, trục Y = từng phòng
- Màu sắc phân biệt: trống / đã đặt / đang ở
- Điều hướng tháng trước / tháng sau

### 1.3 Quản Lý Phòng
- Thêm / sửa / xóa phòng (mã phòng, loại, sức chứa, giá/đêm)
- Upload ảnh phòng (chatbot có thể gửi ảnh cho khách)

### 1.4 AI Chatbot — Knowledge Base Editor
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
- **Chat Test Widget**: test chatbot ngay trong dashboard (không cần Telegram/Zalo)

### 1.5 Hội Thoại Chatbot
- Danh sách hội thoại từ Chatwoot
- KPI cards: tổng hội thoại, đang mở, đã giải quyết, tháng này
- Filter theo trạng thái (open / resolved / pending)

### 1.6 Yêu Cầu Dịch Vụ
- Hiển thị yêu cầu từ khách (chatbot thu thập info → gửi thông báo)
- Owner cập nhật trạng thái: Mới → Đang xử lý → Hoàn thành

### 1.7 Doanh Thu
- Doanh thu tháng hiện tại vs tháng trước (% thay đổi)
- Biểu đồ line chart theo ngày
- Số booking + trung bình doanh thu/booking

### 1.8 Cài Đặt
- Chỉnh sửa thông tin homestay (tên, địa chỉ, hotline)
- Xem kênh chatbot đã kết nối (read-only, admin quản lý)
- Cảnh báo subscription sắp hết hạn (banner)

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

### 2.4 Cấu Hình AI Model (chỉ admin)
- Chọn LLM provider: Gemini / OpenAI / Anthropic / Groq
- Cấu hình **per-property** hoặc **global** (mặc định)
- Fallback provider: tự động chuyển khi primary fail
- Test connection: gửi câu hỏi test, xem response + latency

### 2.5 Quản Lý Kênh Chatbot
- Thêm / bật-tắt / xóa kênh cho từng property
- 6 kênh: Telegram, Zalo OA, Messenger, Instagram, WhatsApp, Website
- Cấu hình channel-specific (VD: Zalo OA ID + Access Token)

### 2.6 Thống Kê
- Revenue per property (aggregate bookings)
- Total bookings per property

---

## 3. DATABASE DESIGN

### 3.1 Tổng Quan

- **Engine**: PostgreSQL (Supabase hosted)
- **Bảo mật**: Row Level Security (RLS) trên tất cả bảng
- **Multi-tenant**: Mọi data tách biệt qua `property_id`
- **Tổng**: 12 bảng chính + 1 bảng auth (Supabase quản lý)

### 3.2 Sơ Đồ Quan Hệ (ERD)

```
                              ┌─────────────────┐
                              │   auth.users    │
                              └────────┬────────┘
                                       │ 1:N
                                       ▼
                            ┌──────────────────────┐
                            │  users_properties    │
                            │  (user_id + prop_id  │
                            │   + role)            │
                            └──────────┬───────────┘
                                       │ N:1
                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           properties                                │
│                  (Bảng trung tâm — 1 row = 1 homestay)              │
└──┬──────┬──────────┬──────────┬─────────┬─────────┬────────┬────────┘
   │      │          │          │         │         │        │
   ▼      ▼          ▼          ▼         ▼         ▼        ▼
┌──────┐┌────────┐┌─────────┐┌──────┐┌────────┐┌───────┐┌──────────┐
│rooms ││bookings││service_ ││subs- ││channel_││llm_   ││knowledge_│
│      ││        ││requests ││crip- ││mappings││settings│base_     │
│      ││        ││         ││tions ││        ││       ││sections  │
└──┬───┘└────────┘└─────────┘└──────┘└────────┘└───────┘└──────────┘
   │ 1:N
   ├──────────────────┐
   ▼                  ▼
┌──────────┐    ┌──────────┐        ┌──────────────────────────┐   
│room_     │    │ical_     │        │  chatwoot_inbox_mapping  │
│images    │    │feeds     │        │  (inbox_id → property)   │
└──────────┘    └────┬─────┘        └──────────────────────────┘
                     │ 1:N
                     ▼
                ┌──────────┐
                │ical_     │
                │bookings  │
                └──────────┘
         ┌──────────────────────────┐
         │  chatwoot_inbox_mapping  │
         │  (inbox_id → property)   │
         └──────────────────────────┘
```

### 3.3 Chi Tiết Từng Bảng

---

####  `properties` — Homestay (Bảng Trung Tâm)

```sql
CREATE TABLE properties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,      -- "Dalat Pine Hill Homestay"
  address     TEXT,               -- "123 Đường Hoa Hồng, Đà Lạt"
  hotline     TEXT,               -- "0909 123 456"
  description TEXT,               -- Mô tả ngắn
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

> Mỗi row = 1 homestay = 1 tenant. Tất cả bảng khác đều FK (Foreign Key) về đây.
> Bảng properties chứa danh sách homestay. Mỗi dòng (row) là 1 homestay.
> Tenant = khách hàng của StayJoy (chủ homestay).
---

####  `users_properties` — Ai quản lý homestay nào?

```sql
CREATE TABLE users_properties (
  user_id     UUID REFERENCES auth.users(id),
  property_id UUID REFERENCES properties(id),
  role        TEXT DEFAULT 'owner',  -- 'owner' hoặc 'admin'
  PRIMARY KEY (user_id, property_id)
);
```

> **owner** = chủ homestay (chỉ thấy data property mình)
> **admin** = super admin (thấy tất cả, truy cập admin panel)

---

####  `rooms` — Danh sách phòng

```sql
CREATE TABLE rooms (
  room_id     TEXT NOT NULL,       -- "P101", "P102"
  property_id UUID REFERENCES properties(id),
  loai_phong  TEXT NOT NULL,       -- "Phòng Đôi", "Phòng Gia Đình"
  suc_chua    INTEGER NOT NULL,    -- 2, 4 (người)
  gia_dem     INTEGER NOT NULL,    -- 500000, 800000 (VNĐ)
  PRIMARY KEY (room_id, property_id)
);
```

> Chatbot dùng data này trả lời khách về giá. Calendar dùng để hiển thị grid.

---

####  `bookings` — Đặt phòng

```sql
CREATE TABLE bookings (
  id              SERIAL PRIMARY KEY,
  property_id     UUID REFERENCES properties(id),
  so_phong        TEXT NOT NULL,       -- "P101"
  loai_phong      TEXT NOT NULL,       -- "Phòng Đôi"
  ho_ten          TEXT,                -- "Nguyễn Văn A"
  sdt             TEXT,                -- "0909123456"
  email           TEXT,
  check_in        DATE NOT NULL,
  check_out       DATE NOT NULL,
  num_day         INTEGER,             -- Số đêm
  tinh_trang      TEXT DEFAULT 'pending',
  conversation_id TEXT,                -- Link hội thoại chatbot
  timestamp       TIMESTAMPTZ DEFAULT NOW()
);
```

> **Owner tạo thủ công** sau khi chatbot gửi thông báo có khách muốn đặt.
> Trạng thái: `pending` → `confirmed` → `check-in` → `đang ở` / `cancelled`

---

####  `service_requests` — Yêu cầu dịch vụ từ khách

```sql
CREATE TABLE service_requests (
  id              SERIAL PRIMARY KEY,
  property_id     UUID REFERENCES properties(id),
  so_phong        TEXT,            -- Phòng khách đang ở
  loai_dich_vu    TEXT,            -- "Dọn phòng", "Thêm khăn"
  chi_tiet        TEXT,            -- Chi tiết yêu cầu
  trang_thai      TEXT DEFAULT 'Mới',
  conversation_id TEXT,
  timestamp       TIMESTAMPTZ DEFAULT NOW()
);
```

> Chatbot thu thập (họ tên + số phòng) → gửi thông báo → owner xử lý.
> Trạng thái: `Mới` → `Đang xử lý` → `Hoàn thành`

---

####  `subscriptions` — Gói dịch vụ SaaS

```sql
CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID REFERENCES properties(id),
  plan          TEXT NOT NULL,         -- 'trial' | 'basic' | 'pro'
  status        TEXT NOT NULL,         -- 'trial' | 'active' | 'expired' | 'cancelled'
  started_at    TIMESTAMPTZ NOT NULL,
  expires_at    TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ
);
```

> Mỗi property có 1 subscription. Hết hạn → redirect trang "subscription expired".
> Onboard mới = trial 14 ngày. Admin upgrade thủ công.

---

####  `chatwoot_inbox_mapping` — Xác định tin nhắn thuộc homestay nào

```sql
CREATE TABLE chatwoot_inbox_mapping (
  id          SERIAL PRIMARY KEY,
  inbox_id    TEXT UNIQUE NOT NULL,   -- Chatwoot inbox ID
  property_id UUID REFERENCES properties(id)
);
```

> Khi khách nhắn tin → Chatwoot webhook chứa `inbox_id` → lookup bảng này → biết property nào → load đúng knowledge base.

---

####  `channel_mappings` — Kênh chatbot kết nối

```sql
CREATE TABLE channel_mappings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  channel     TEXT NOT NULL,       -- 'telegram'|'zalo'|'messenger'|'instagram'|'whatsapp'|'website'
  inbox_id    TEXT,                -- Chatwoot inbox ID
  config      JSONB DEFAULT '{}', -- VD: {"zalo_oa_id": "xxx", "access_token": "yyy"}
  is_active   BOOLEAN DEFAULT true
);
```

> 1 property có thể kết nối nhiều kênh. Admin quản lý trên `/admin/channels`.

---

####  `llm_settings` — Cấu hình AI (chỉ admin)

```sql
CREATE TABLE llm_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          TEXT DEFAULT 'gemini',        -- 'gemini'|'openai'|'anthropic'|'groq'
  model             TEXT DEFAULT 'gemini-2.0-flash-lite',
  api_key           TEXT NOT NULL,
  fallback_provider TEXT,                         -- Provider dự phòng
  fallback_model    TEXT,
  fallback_api_key  TEXT,
  is_active         BOOLEAN DEFAULT true,
  property_id       UUID REFERENCES properties(id),  -- NULL = global config
  updated_by        UUID REFERENCES auth.users(id)
);
```

> **property_id = NULL** → config mặc định cho tất cả homestay
> **property_id = UUID** → config riêng cho homestay đó
> Fallback: primary fail → tự động thử fallback → thử provider khác

---

####  `knowledge_base_sections` — Nội dung chatbot trả lời

```sql
CREATE TABLE knowledge_base_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  section_key TEXT NOT NULL,       -- 1 trong 7 keys
  title       TEXT NOT NULL,       -- "Chính Sách"
  content     TEXT NOT NULL,       -- Nội dung chi tiết
  is_active   BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  UNIQUE (property_id, section_key)
);
```

> Owner nhập nội dung trên dashboard. Khi chatbot trả lời, hệ thống ghép tất cả section active thành system prompt → gửi cho LLM.

---

####  Bảng `room_images` — Ảnh phòng

```sql
CREATE TABLE room_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     TEXT NOT NULL,
  property_id UUID REFERENCES properties(id),
  image_url   TEXT NOT NULL,          -- URL ảnh (Supabase Storage)
  storage_path TEXT,                  -- Path trong storage bucket
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

> Mỗi phòng có nhiều ảnh. Chatbot dùng để gửi hình cho khách khi hỏi "cho xem phòng". Owner upload ảnh trên trang quản lý phòng.

---

####  Bảng `ical_feeds` — Sync lịch với OTA (Airbnb/Booking.com)

```sql
CREATE TABLE ical_feeds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     TEXT NOT NULL,
  property_id UUID REFERENCES properties(id),
  ical_url    TEXT NOT NULL,           -- URL iCal từ Airbnb/Booking.com
  source_name TEXT,                    -- "Airbnb", "Booking.com"
  is_active   BOOLEAN DEFAULT true,
  last_synced TIMESTAMPTZ,
  sync_error  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

> Cho phép sync lịch phòng 2 chiều với OTA. Hệ thống định kỳ fetch iCal URL → import booking vào `ical_bookings` → tránh double-booking.

---

####  Bảng `ical_bookings` — Booking import từ OTA

```sql
CREATE TABLE ical_bookings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id     UUID REFERENCES ical_feeds(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id),
  room_id     TEXT NOT NULL,
  uid         TEXT NOT NULL,            -- iCal event UID (unique per feed)
  summary     TEXT,                     -- "Airbnb (HM123456)"
  check_in    DATE NOT NULL,
  check_out   DATE NOT NULL,
  source_name TEXT,
  UNIQUE (feed_id, uid)
);
```

> Booking từ Airbnb/Booking.com được import tự động. Hiển thị trên calendar cùng với booking thủ công, giúp owner thấy toàn bộ lịch phòng ở 1 nơi.

### 3.4 Bảng Quan Hệ

| Từ → Đến | Loại | Ý nghĩa |
|-----------|------|---------|
| auth.users → users_properties | 1:N | 1 user quản lý nhiều homestay |
| properties → users_properties | 1:N | 1 homestay có nhiều user (owner + admin) |
| properties → rooms | 1:N | 1 homestay có nhiều phòng |
| properties → bookings | 1:N | 1 homestay có nhiều booking |
| properties → service_requests | 1:N | 1 homestay có nhiều yêu cầu dịch vụ |
| properties → subscriptions | 1:1 | 1 homestay có đúng 1 gói dịch vụ |
| properties → channel_mappings | 1:N | 1 homestay kết nối nhiều kênh chat |
| properties → llm_settings | 0..1 | 1 homestay có tối đa 1 config AI riêng |
| properties → knowledge_base_sections | 1:7 | 1 homestay có tối đa 7 sections |
| properties → chatwoot_inbox_mapping | 1:N | 1 homestay có nhiều inbox |
| rooms → room_images | 1:N | 1 phòng có nhiều ảnh |
| rooms → ical_feeds | 1:N | 1 phòng sync nhiều OTA |
| ical_feeds → ical_bookings | 1:N | 1 feed import nhiều bookings |

### 3.5 Bảo Mật (Row Level Security)

| Ai | Quyền | Cách hoạt động |
|----|-------|----------------|
| **Owner** | Chỉ thấy data property mình | RLS check `property_id` qua `users_properties` |
| **Admin** | Thấy tất cả | RLS check `role = 'admin'` |
| **Server API** (service_role) | Bypass RLS | Dùng service_role key cho webhook handler + chatbot logic |
| **Anonymous** | Không có quyền | Bị block hoàn toàn |

---

## 4. AI CHATBOT FLOW

### 4.1 Nguyên tắc

> **Chatbot KHÔNG tự động tạo booking.** Chatbot chỉ:
> 1. Trả lời FAQ (giá, chính sách, tiện ích...)
> 2. Thu thập thông tin khách hàng
> 3. Gửi thông báo nội bộ cho owner
>
> Owner xác nhận và tạo booking **thủ công** trên dashboard.

### 4.2 Flow

```
Khách nhắn (Zalo/Telegram/Web)
    │
    ▼
Chatwoot nhận → webhook → POST /api/webhooks/chatwoot
    │
    ▼
Server — Message Debounce:
  - Nếu khách nhắn nhiều dòng liên tiếp → gom lại, chờ 3 giây
  - Sau 3 giây không có tin mới → xử lý 1 lần duy nhất
    │
    ▼
Server — Xử lý chính:
  1. inbox_id → lookup property_id (từ chatwoot_inbox_mapping)
  2. Fetch knowledge_base_sections (chỉ lấy section active)
  3. Fetch rooms (giá, loại phòng, ảnh)
  4. Build system prompt (ghép tất cả sections thành 1 prompt)
  5. Gọi LLM (Gemini → nếu fail → Groq → nếu fail → OpenAI)
  6. Parse tag từ AI response
    │
    ▼
Server parse tag:
  ├─ [GENERAL] → Reply FAQ cho khách (gọi Chatwoot API)
  ├─ [BOOK]    → Chatbot hỏi thêm info → gửi thông báo owner (private note)
  ├─ [SERVICE] → Chatbot hỏi họ tên + phòng → gửi thông báo owner
  └─ [CANCEL]  → Gửi thông báo owner
    │
    ▼
Owner nhận thông báo (Chatwoot private note) → xác nhận → tạo booking thủ công
```

### 4.3 Xử lý song song & Debounce

- **Concurrent**: Next.js (Node.js) xử lý tất cả request song song, không phải FIFO. 15 người nhắn cùng lúc → 15 request xử lý đồng thời.
- **Debounce**: Khách nhắn 3 dòng liên tiếp → server gom thành 1 message → gọi AI 1 lần → reply 1 lần (tránh lãng phí 3 lần gọi LLM).

### 4.4 Chatbot thu thập gì?

| Tình huống | Chatbot hỏi khách | Sau khi đủ info |
|------------|-------------------|-----------------|
| Đặt phòng | Họ tên, SĐT, ngày check-in/out, loại phòng | Gửi thông báo cho owner |
| Yêu cầu dịch vụ | Họ tên, số phòng đang ở | Gửi thông báo cho owner |
| Hủy phòng | SĐT hoặc tên đã đặt | Gửi thông báo cho owner |
| FAQ | Không hỏi gì thêm | Reply trực tiếp cho khách |

### 4.5 Ví dụ thông báo cho Owner

```
🚨 THÔNG BÁO (BOT):
Khách muốn đặt phòng.
👤 Tên: Nguyễn Văn A
📱 SĐT: 0909 123 456
🛏️ Loại: Phòng Đôi
📅 Check-in: 15/06/2026
📅 Check-out: 17/06/2026
→ Vui lòng xác nhận và tạo booking trên dashboard.
```

---

## 5. ANALYTICS

### 5.1 Tenant (Owner thấy)

| Metric | Nguồn | Hiển thị |
|--------|-------|----------|
| Doanh thu tháng | SUM(num_day × gia_dem) booking active | Số + line chart |
| % thay đổi so tháng trước | (tháng_này - trước) / trước × 100 | Badge xanh/đỏ |
| Số booking tháng | COUNT bookings | KPI card |
| TB doanh thu/booking | total / count | KPI card |
| Hội thoại tháng | Chatwoot API | KPI card |
| Hội thoại đang mở | Filter status='open' | KPI card |
| Yêu cầu dịch vụ mới | COUNT trang_thai='Mới' | Badge |

### 5.2 Admin (Super admin thấy)

| Metric | Nguồn | Hiển thị |
|--------|-------|----------|
| Tổng properties | COUNT properties | KPI card |
| Active subscriptions | status='active' | KPI card (xanh) |
| Trial | status='trial' | KPI card (vàng) |
| Mới tháng này | started_at >= đầu tháng | KPI card (xanh dương) |
| Expired | status='expired' | KPI card (đỏ) |
| Revenue per property | SUM bookings | Table |
| Bookings per property | COUNT | Table |

### 5.3 Công thức tính doanh thu

```
Active statuses = ['confirmed', 'check-in', 'checked_in', 'đã cọc', 'đang ở']

Doanh thu tháng = SUM(num_day × gia_dem)
  WHERE tinh_trang IN active_statuses
  AND check_in trong tháng target

% thay đổi = (tháng_này - tháng_trước) / tháng_trước × 100
```

---

## 6. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                    KHÁCH HÀNG                        │
│   Zalo │ Telegram │ Messenger │ Website │ WhatsApp  │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│         CHATWOOT (Self-hosted, port 3001)            │
│         Omnichannel messaging platform              │
└────────────────────────┬────────────────────────────┘
                         │ webhook (POST /api/webhooks/chatwoot)
                         ▼
┌─────────────────────────────────────────────────────┐
│         NEXT.JS 14 (App Router, port 3000)          │
│                                                     │
│  ┌─────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │   Tenant    │  │   Admin    │  │  API Routes  │  │
│  │  Dashboard  │  │   Panel    │  │  (/api/...)  │  │
│  └─────────────┘  └────────────┘  └─────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  Webhook Handler (/api/webhooks/chatwoot)    │   │
│  │  + Message Debounce (gom tin nhắn 3s)        │   │
│  │  + Tag Parser + Reply logic                  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  LLM Provider (Multi-model + Auto-fallback)  │   │
│  │  Gemini → Groq → OpenAI → Anthropic          │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│            SUPABASE (Cloud PostgreSQL)               │
│  12 tables │ RLS │ Auth │ Storage │ Realtime        │
└─────────────────────────────────────────────────────┘
```

### Infrastructure

```
VPS Production (2-4GB RAM, Ubuntu 22.04)
├── Docker Compose (4 containers)
│   ├── nextjs         :3000  — Dashboard + API + Webhook Handler
│   ├── chatwoot-web   :3001  — Messaging platform
│   ├── chatwoot-pg    :5432  — Chatwoot database
│   └── redis          :6379  — Cache (shared)
├── Nginx reverse proxy (domain → ports)
├── Let's Encrypt SSL (auto-renew)
└── Netdata monitoring (CPU/RAM/disk)
```

> **Không còn n8n.** Toàn bộ chatbot logic (webhook handler, debounce, LLM call, tag parsing, reply) nằm trong Next.js API route. Giảm 1 container, tiết kiệm ~200MB RAM, ít điểm lỗi hơn.
