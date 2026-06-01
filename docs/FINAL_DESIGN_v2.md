# StayJoy — Final System Design

---

## 1. MAIN FEATURES (Tenant Dashboard)

Mỗi chủ homestay đăng nhập vào dashboard riêng, có các tính năng:

### 1.1 Quản Lý Đặt Phòng (Booking Management)
- Xem danh sách tất cả booking (filter theo trạng thái)
- Cập nhật trạng thái: pending → confirmed → check-in → checked_in → đã cọc → đang ở / cancelled
- Chi tiết booking: tên khách, SĐT, email, phòng, ngày check-in/out, số đêm
- **Owner tạo booking thủ công** trên dashboard sau khi nhận thông báo từ chatbot

### 1.2 Lịch Phòng (Booking Calendar)
- Grid view: trục X = ngày, trục Y = phòng
- Hiển thị trực quan phòng trống / đã đặt bằng màu sắc
- Điều hướng tháng trước / tháng sau

### 1.3 Quản Lý Phòng (Room Management)
- Thêm / sửa / xóa phòng
- Thông tin: mã phòng, loại phòng, sức chứa, giá/đêm
- Upload ảnh phòng

### 1.4 AI Chatbot Knowledge Base
- Editor 7 section bật/tắt độc lập:
  - general_info (thông tin cơ bản)
  - rooms_pricing (phòng & giá)
  - policies (chính sách)
  - amenities (tiện ích)
  - upsell (dịch vụ thêm)
  - faq (câu hỏi thường gặp)
  - sister_properties (homestay liên kết)
- Preview system prompt tổng hợp
- Chat Test Widget: test chatbot ngay trong dashboard

### 1.5 Hội Thoại Chatbot (Conversations)
- Danh sách hội thoại từ Chatwoot
- KPI: tổng hội thoại, đang mở, đã giải quyết, tháng này
- Filter theo trạng thái
- Link đến Chatwoot để xem chi tiết

### 1.6 Yêu Cầu Dịch Vụ (Service Requests)
- Hiển thị yêu cầu dịch vụ từ khách (được chatbot thu thập và gửi thông báo)
- Trạng thái: Mới → Đang xử lý → Hoàn thành
- Phân loại theo tag

### 1.7 Doanh Thu (Revenue Analytics)
- Doanh thu tháng hiện tại vs tháng trước
- % thay đổi tăng/giảm
- Biểu đồ doanh thu theo ngày
- Số booking và trung bình doanh thu/booking

### 1.8 Cài Đặt (Settings)
- Chỉnh sửa thông tin homestay
- Xem kênh chatbot đã kết nối
- Cảnh báo subscription sắp hết hạn

---

## 2. ADMIN PANEL

Super admin quản lý toàn bộ nền tảng:

### 2.1 Tổng Quan Nền Tảng
- KPI: Tổng properties, Active, Trial, Mới tháng này, Expired, Cancelled
- Bảng danh sách tất cả properties + trạng thái subscription

### 2.2 Onboard Property Mới
- Form tạo property + tài khoản chủ nhà
- Tự động tạo subscription trial 14 ngày

### 2.3 Quản Lý Subscription
- Bảng tất cả subscriptions
- Inline edit: đổi plan (trial/basic/pro) và status

### 2.4 Cấu Hình AI Model (LLM Settings)
- Chọn provider: Gemini / OpenAI / Anthropic / Groq
- Cấu hình per-property hoặc global
- Fallback provider khi primary fail
- Test connection trực tiếp

### 2.5 Quản Lý Kênh Chatbot (Channels)
- Thêm / bật-tắt / xóa kênh cho từng property
- Hỗ trợ: Telegram, Zalo OA, Messenger, Instagram, WhatsApp, Website
- Cấu hình Chatwoot inbox_id + channel-specific config

### 2.6 Thống Kê Toàn Hệ Thống
- Tổng bookings và revenue per property
- Aggregate across all tenants

---

## 3. DATABASE DESIGN (Chi Tiết)

### 3.1 Sơ Đồ Quan Hệ (Entity Relationship Diagram)

```
                            ┌─────────────────────┐
                            │     auth.users       │
                            │─────────────────────│
                            │ id (UUID) PK         │
                            │ email                │
                            │ encrypted_password   │
                            └──────────┬──────────┘
                                       │
                                       │ 1 user có thể quản lý N properties
                                       │ (qua bảng trung gian)
                                       ▼
┌──────────────────────────────────────────────────────────────┐
│                     users_properties                          │
│──────────────────────────────────────────────────────────────│
│ user_id (UUID) FK → auth.users(id)        ┐                 │
│ property_id (UUID) FK → properties(id)    ├─ Composite PK   │
│ role (TEXT): 'owner' | 'admin'            ┘                 │
│──────────────────────────────────────────────────────────────│
│ Chức năng: Liên kết user với property, xác định quyền.      │
│ - owner: chủ homestay, chỉ thấy data của property mình      │
│ - admin: super admin, thấy tất cả data toàn hệ thống        │
└──────────────────────────────────────────────────────────────┘
                                       │
                                       │ N:1
                                       ▼
┌──────────────────────────────────────────────────────────────┐
│                       properties                              │
│──────────────────────────────────────────────────────────────│
│ id (UUID) PK                                                 │
│ name (TEXT) NOT NULL — tên homestay                           │
│ address (TEXT) — địa chỉ                                     │
│ hotline (TEXT) — số điện thoại                               │
│ description (TEXT) — mô tả                                   │
│ created_at (TIMESTAMPTZ)                                     │
│──────────────────────────────────────────────────────────────│
│ Chức năng: Bảng trung tâm, đại diện cho 1 homestay/tenant.  │
│ Tất cả bảng khác đều reference về đây qua property_id.      │
└──────────────┬───────────┬──────────┬──────────┬────────────┘
               │           │          │          │
    ┌──────────┘     ┌─────┘    ┌─────┘    ┌────┘
    ▼                ▼          ▼          ▼
┌────────┐    ┌──────────┐ ┌────────┐ ┌─────────────┐
│ rooms  │    │ bookings │ │service │ │subscriptions│
│        │    │          │ │requests│ │             │
└────────┘    └──────────┘ └────────┘ └─────────────┘
```

### 3.2 Chi Tiết Từng Bảng

---

#### 📋 Bảng `properties` — Homestay (Tenant)

```sql
CREATE TABLE properties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  hotline     TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Chức năng**: Bảng trung tâm của toàn bộ hệ thống. Mỗi row đại diện cho 1 homestay (1 tenant). Tất cả bảng khác đều reference về đây qua `property_id`.

**Quan hệ**:
- `users_properties` → xác định ai quản lý property này
- `rooms` → danh sách phòng
- `bookings` → lịch sử đặt phòng
- `service_requests` → yêu cầu dịch vụ
- `subscriptions` → gói dịch vụ SaaS
- `channel_mappings` → kênh chatbot
- `llm_settings` → cấu hình AI
- `knowledge_base_sections` → nội dung chatbot

---

#### 🏠 Bảng `rooms` — Phòng

```sql
CREATE TABLE rooms (
  room_id     TEXT NOT NULL,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  loai_phong  TEXT NOT NULL,
  suc_chua    INTEGER NOT NULL,
  gia_dem     INTEGER NOT NULL,
  PRIMARY KEY (room_id, property_id)
);
```

**Chức năng**: Lưu danh sách phòng của từng homestay. Chatbot dùng data này để trả lời khách về giá và loại phòng. Calendar dùng để hiển thị grid phòng.

**Quan hệ**: Thuộc về 1 `properties` (qua property_id)

**Ví dụ data**:
| room_id | loai_phong | suc_chua | gia_dem |
|---------|------------|----------|---------|
| P101 | Phòng Đôi | 2 | 500,000đ |
| P102 | Phòng Gia Đình | 4 | 800,000đ |

---

#### 📅 Bảng `bookings` — Đặt Phòng

```sql
CREATE TABLE bookings (
  id              SERIAL PRIMARY KEY,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  so_phong        TEXT NOT NULL,
  loai_phong      TEXT NOT NULL,
  ho_ten          TEXT,
  sdt             TEXT,
  email           TEXT,
  check_in        DATE NOT NULL,
  check_out       DATE NOT NULL,
  num_day         INTEGER,
  tinh_trang      TEXT NOT NULL DEFAULT 'pending',
  timestamp       TIMESTAMPTZ DEFAULT NOW(),
  conversation_id TEXT
);
```

**Chức năng**: Lưu tất cả booking. **Owner tạo thủ công** trên dashboard sau khi nhận thông báo từ chatbot. Dùng để tính doanh thu, hiển thị calendar, check availability.

**Quan hệ**: Thuộc về 1 `properties`. `conversation_id` link đến hội thoại Chatwoot.

**Trạng thái**: `pending` → `confirmed` → `check-in` → `checked_in` → `đã cọc` → `đang ở` / `cancelled`

---

#### 🛎️ Bảng `service_requests` — Yêu Cầu Dịch Vụ

```sql
CREATE TABLE service_requests (
  id              SERIAL PRIMARY KEY,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  timestamp       TIMESTAMPTZ DEFAULT NOW(),
  conversation_id TEXT,
  so_phong        TEXT,
  tag             TEXT,
  loai_dich_vu    TEXT,
  chi_tiet        TEXT,
  trang_thai      TEXT DEFAULT 'Mới'
);
```

**Chức năng**: Khi khách yêu cầu dịch vụ qua chatbot (dọn phòng, thêm khăn, gọi xe...), chatbot thu thập thông tin (họ tên + số phòng) rồi gửi thông báo cho owner. Owner xem và cập nhật trạng thái trên dashboard.

**Quan hệ**: Thuộc về 1 `properties`. `conversation_id` link đến hội thoại.

**Trạng thái**: `Mới` → `Đang xử lý` → `Hoàn thành`

---

#### 💳 Bảng `subscriptions` — Gói Dịch Vụ SaaS

```sql
CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL,
  status        TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL,
  expires_at    TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ
);
```

**Chức năng**: Quản lý billing. Mỗi property có 1 subscription. Hệ thống check status mỗi lần load page — nếu expired thì redirect đến trang "hết hạn".

**Quan hệ**: 1:1 với `properties`.

**Logic**:
- Onboard mới → status='trial', trial_ends_at = now + 14 ngày
- Hết trial → status='expired', owner không truy cập dashboard được
- Admin upgrade → status='active', set expires_at

---

#### 🔗 Bảng `users_properties` — Liên Kết User ↔ Property

```sql
CREATE TABLE users_properties (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'owner',
  PRIMARY KEY (user_id, property_id)
);
```

**Chức năng**: Bảng trung gian (junction table) xác định user nào quản lý property nào, với role gì. RLS policies dùng bảng này để filter data.

**Role**:
- `owner`: chủ homestay — chỉ thấy data của property mình
- `admin`: super admin — truy cập toàn bộ hệ thống + admin panel

---

#### 📨 Bảng `chatwoot_inbox_mapping` — Map Inbox → Property

```sql
CREATE TABLE chatwoot_inbox_mapping (
  id          SERIAL PRIMARY KEY,
  inbox_id    TEXT UNIQUE NOT NULL,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Chức năng**: Khi Chatwoot gửi webhook đến n8n, payload chứa `inbox_id`. Bảng này giúp hệ thống xác định message thuộc property nào → load đúng knowledge base.

**Flow**: `Chatwoot webhook → inbox_id → lookup bảng này → property_id → query data đúng property`

---

#### 📡 Bảng `channel_mappings` — Kênh Chatbot

```sql
CREATE TABLE channel_mappings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL,
  inbox_id    TEXT,
  config      JSONB DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Chức năng**: Quản lý multi-channel. Mỗi property có thể kết nối nhiều kênh chat (Telegram + Zalo + Website...). Admin cấu hình ở đây.

**Channels hỗ trợ**: telegram, zalo, messenger, instagram, whatsapp, website

**Ví dụ config cho Zalo**: `{ "zalo_oa_id": "4318012345", "access_token": "xxx..." }`

---

#### 🤖 Bảng `llm_settings` — Cấu Hình AI

```sql
CREATE TABLE llm_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          TEXT NOT NULL DEFAULT 'gemini',
  model             TEXT NOT NULL DEFAULT 'gemini-2.0-flash-lite',
  api_key           TEXT NOT NULL,
  fallback_provider TEXT,
  fallback_model    TEXT,
  fallback_api_key  TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  property_id       UUID REFERENCES properties(id) ON DELETE CASCADE,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_by        UUID REFERENCES auth.users(id)
);
```

**Chức năng**: Cấu hình LLM provider. **Chỉ admin mới được cấu hình.** Hỗ trợ per-property (mỗi homestay dùng model khác nhau) hoặc global (mặc định cho tất cả).

**Priority khi gọi LLM**:
1. Property-specific config (property_id = X)
2. Global config (property_id IS NULL)
3. Environment variables (fallback cuối cùng)

**Fallback**: Nếu primary fail → tự động thử fallback → thử provider khác có key.

---

#### 📚 Bảng `knowledge_base_sections` — Knowledge Base cho AI

```sql
CREATE TABLE knowledge_base_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (property_id, section_key)
);
```

**Chức năng**: Lưu nội dung knowledge base theo từng section, có thể bật/tắt độc lập. Khi chatbot trả lời, hệ thống ghép tất cả section active thành system prompt gửi cho LLM.

**Section keys** (7 loại):
| Key | Nội dung | Ví dụ |
|-----|----------|-------|
| general_info | Thông tin cơ bản | Tên, địa chỉ, hotline |
| rooms_pricing | Phòng và bảng giá | Bảng giá tự động từ `rooms` |
| policies | Chính sách | Check-in 14h, hủy trước 3 ngày |
| amenities | Tiện ích | Wifi, bể bơi, BBQ |
| upsell | Dịch vụ thêm | Romance setup 500k, thuê xe 150k |
| faq | Câu hỏi thường gặp | Có cho mang thú cưng không? |
| sister_properties | Homestay liên kết | Giới thiệu chi nhánh khác |

---

### 3.3 Bảng Quan Hệ Tổng Hợp

| Từ | Đến | Loại | Mô tả |
|----|-----|------|--------|
| auth.users | users_properties | 1:N | 1 user quản lý nhiều properties |
| properties | users_properties | 1:N | 1 property có nhiều users |
| properties | rooms | 1:N | 1 property có nhiều phòng |
| properties | bookings | 1:N | 1 property có nhiều bookings |
| properties | service_requests | 1:N | 1 property có nhiều yêu cầu |
| properties | subscriptions | 1:1 | 1 property có 1 subscription |
| properties | channel_mappings | 1:N | 1 property nhiều kênh chat |
| properties | llm_settings | 1:1 | 1 property tối đa 1 LLM config |
| properties | knowledge_base_sections | 1:N | 1 property tối đa 7 sections |
| properties | chatwoot_inbox_mapping | 1:N | 1 property nhiều inboxes |

### 3.4 Row Level Security (RLS)

| Role | Quyền |
|------|-------|
| Tenant (owner) | SELECT/INSERT/UPDATE data thuộc property mình |
| Admin | SELECT/UPDATE tất cả + admin panel |
| n8n (service_role) | ALL — bypass RLS |
| Anonymous | Không có quyền |

---

## 4. AI CHATBOT FLOW (Đã cập nhật)

### 4.1 Nguyên tắc hoạt động

**Chatbot KHÔNG tự động tạo booking hay service request.** Chatbot chỉ:
1. Trả lời FAQ (giá, chính sách, tiện ích, hình ảnh phòng...)
2. Thu thập thông tin khách hàng
3. Gửi thông báo nội bộ cho owner qua Chatwoot (private note)

Owner xác nhận và tạo booking/service request **thủ công** trên dashboard.

### 4.2 Flow chi tiết

```
Khách nhắn tin (Zalo/Telegram/Web)
         │
         ▼
Chatwoot nhận tin → gửi webhook đến n8n
         │
         ▼
n8n gọi POST /api/n8n/chat { inbox_id, message }
         │
         ▼
┌─────────────────────────────────────────────┐
│ Server xử lý:                                │
│ 1. Resolve property_id từ inbox_id          │
│ 2. Fetch knowledge_base_sections (active)   │
│ 3. Fetch rooms (giá, loại phòng)            │
│ 4. Build system prompt                       │
│ 5. Gọi LLM (Gemini/OpenAI/Groq)            │
│ 6. Trả về { answer, tag }                   │
└─────────────────────────────────────────────┘
         │
         ▼
n8n parse response:
  ├─ Tag [GENERAL] → Reply trực tiếp cho khách (FAQ)
  ├─ Tag [BOOK] → Chatbot hỏi thêm thông tin (họ tên, SĐT, ngày)
  │                → Khi đủ info → Gửi THÔNG BÁO cho owner (private note)
  ├─ Tag [SERVICE] → Chatbot hỏi họ tên + số phòng
  │                  → Gửi THÔNG BÁO cho owner
  └─ Tag [CANCEL] → Gửi THÔNG BÁO cho owner
         │
         ▼
Owner nhận thông báo trên Chatwoot / Dashboard
  → Xác nhận với khách
  → Tạo booking THỦ CÔNG trên dashboard
```

### 4.3 Chatbot thu thập thông tin

| Tình huống | Chatbot hỏi | Sau khi đủ info |
|------------|-------------|-----------------|
| **Đặt phòng** | Họ tên, SĐT liên hệ, ngày check-in/out, loại phòng | Gửi thông báo cho owner |
| **Yêu cầu dịch vụ** | Họ tên, số phòng đang ở | Gửi thông báo cho owner |
| **Hủy phòng** | SĐT hoặc tên đã đặt | Gửi thông báo cho owner |

### 4.4 Thông báo cho Owner

Khi chatbot thu thập đủ thông tin, n8n gửi **private note** trên Chatwoot:

```
🚨 THÔNG BÁO (BOT):
Khách muốn đặt phòng.
👤 Tên: Nguyễn Văn A
📱 SĐT: 0909 123 456
🛏️ Loại: Phòng Đôi
📅 Check-in: 15/06/2026
📅 Check-out: 17/06/2026
→ Chủ nhà vui lòng xác nhận và tạo booking trên dashboard.
```

Owner thấy thông báo này → liên hệ khách xác nhận → tạo booking trên dashboard.

---

## 5. ANALYTICS

### 5.1 Tenant Analytics

| Metric | Cách tính | Hiển thị |
|--------|-----------|----------|
| Doanh thu tháng | SUM(num_day × gia_dem) cho booking active | Line chart |
| % thay đổi MoM | (tháng_này - tháng_trước) / tháng_trước × 100 | Badge |
| Số booking tháng | COUNT bookings trong tháng | KPI card |
| TB doanh thu/booking | total / count | KPI card |
| Conversations tháng | Count từ Chatwoot API | KPI card |
| Service requests mới | COUNT WHERE trang_thai='Mới' | Badge |

### 5.2 Admin Analytics

| Metric | Cách tính | Hiển thị |
|--------|-----------|----------|
| Tổng properties | COUNT properties | KPI card |
| Active subscriptions | COUNT WHERE status='active' | KPI card |
| Trial subscriptions | COUNT WHERE status='trial' | KPI card |
| Mới tháng này | COUNT WHERE started_at >= đầu tháng | KPI card |
| Revenue per property | SUM bookings per property | Table |

---

## 6. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                    KHÁCH HÀNG                         │
│   Zalo │ Telegram │ Messenger │ Website │ WhatsApp   │
└────────────────────────┬────────────────────────────┘
                         │ messages
                         ▼
┌─────────────────────────────────────────────────────┐
│              CHATWOOT (Omnichannel Hub)               │
│         Unified inbox + Contact management           │
└────────────────────────┬────────────────────────────┘
                         │ webhook
                         ▼
┌─────────────────────────────────────────────────────┐
│                 n8n (6 nodes)                         │
│  Webhook → Filter → Call API → Check Debounce →     │
│  Parse Tag → Reply/Notify                            │
└────────────────────────┬────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────┐
│            NEXT.JS APP (Frontend + API)               │
│                                                      │
│  Tenant Dashboard │ Admin Panel │ API Routes         │
│                                                      │
│  LLM Provider: Gemini → OpenAI → Anthropic → Groq   │
│  (Multi-model fallback, per-property config)         │
└────────────────────────┬────────────────────────────┘
                         │ SQL
                         ▼
┌─────────────────────────────────────────────────────┐
│           SUPABASE (PostgreSQL + Auth)                │
│                                                      │
│  10 tables │ RLS │ Realtime │ Storage │ Auth         │
└─────────────────────────────────────────────────────┘
```

---

## 7. INFRASTRUCTURE

```
AWS EC2 (t3.small, ap-southeast-1, 30GB gp3)
├── Docker Compose
│   ├── Next.js        :3000  (Dashboard + API)
│   ├── n8n            :5678  (Workflow automation)
│   ├── Chatwoot       :3001  (Messaging platform)
│   ├── PostgreSQL     :5432  (Chatwoot DB)
│   └── Redis          :6379  (Shared cache)
├── Elastic IP (static)
└── Security Group: 22, 80, 443, 3000, 3001, 5678
```

Provisioned by **Terraform** (Infrastructure as Code).
