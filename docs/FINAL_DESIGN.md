# StayJoy — Final System Design Document

## 1. Product Overview

**StayJoy** là nền tảng SaaS quản lý homestay tích hợp AI Chatbot đa kênh, giúp chủ homestay tự động hóa việc trả lời khách hàng, quản lý đặt phòng, và theo dõi doanh thu — tất cả trong một dashboard duy nhất.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL) + Row Level Security |
| Auth | Supabase Auth (email/password, SSR cookies) |
| AI/LLM | Gemini 2.0 Flash Lite (primary) + OpenAI/Anthropic/Groq (fallback) |
| Automation | n8n (self-hosted workflow engine) |
| Messaging | Chatwoot (omnichannel platform) |
| Infrastructure | AWS EC2 + Terraform + Docker |
| Charts | Recharts |
| Testing | Vitest + React Testing Library |

---

## 2. Main Features (Tenant Dashboard)

Mỗi chủ homestay (tenant) có dashboard riêng với các tính năng:

### 2.1 Booking Management (`/dashboard/bookings`)

- Bảng danh sách booking với filter theo trạng thái
- Cập nhật trạng thái booking: `pending` → `confirmed` → `check-in` → `checked_in` → `đã cọc` → `đang ở` / `cancelled`
- Chi tiết booking: thông tin khách, phòng, ngày check-in/out, số đêm
- Tạo booking mới từ chatbot (tự động qua n8n) hoặc thủ công

### 2.2 Booking Calendar (`/dashboard/calendar`)

- Lịch phòng dạng grid: trục X = ngày trong tháng, trục Y = phòng
- Hiển thị trực quan phòng trống / đã đặt
- Điều hướng tháng trước / tháng sau
- Color-coded theo trạng thái booking

### 2.3 Room Management (`/dashboard/rooms`)

- CRUD phòng: mã phòng, loại phòng, sức chứa, giá/đêm
- Upload ảnh phòng (Supabase Storage)
- Hiển thị trạng thái phòng hiện tại

### 2.4 AI Chatbot Knowledge Base (`/dashboard/ai-chatbot`)

- Editor 7 section có thể bật/tắt độc lập:
  - `general_info` — Thông tin cơ bản (tên, địa chỉ, hotline)
  - `rooms_pricing` — Phòng và bảng giá
  - `policies` — Chính sách check-in/out, hủy phòng, nội quy
  - `amenities` — Tiện ích và dịch vụ
  - `upsell` — Dịch vụ upsell (romance setup, BBQ, thuê xe...)
  - `faq` — Câu hỏi thường gặp
  - `sister_properties` — Homestay liên kết
- Preview system prompt tổng hợp
- Chat Test Widget: test chatbot trực tiếp trong dashboard
- Nội dung knowledge base được inject vào system prompt khi chatbot trả lời

### 2.5 Conversations Monitor (`/dashboard/conversations`)

- Danh sách hội thoại chatbot từ Chatwoot
- KPI cards: tổng hội thoại, đang mở, đã giải quyết, tháng này
- Filter theo trạng thái (open / resolved / pending)
- Link trực tiếp đến Chatwoot để xem chi tiết

### 2.6 Service Requests (`/dashboard/service-requests`)

- Yêu cầu dịch vụ từ khách (đặt qua chatbot): dọn phòng, thêm khăn, gọi xe...
- Trạng thái: `Mới` → `Đang xử lý` → `Hoàn thành`
- Tag phân loại và chi tiết yêu cầu

### 2.7 Revenue Analytics (`/dashboard` — overview)

- Doanh thu tháng hiện tại vs tháng trước
- % thay đổi (tăng/giảm)
- Biểu đồ doanh thu theo ngày (Recharts)
- Số booking và trung bình doanh thu/booking

### 2.8 Settings (`/dashboard/settings`)

- Chỉnh sửa thông tin homestay (tên, địa chỉ, hotline, mô tả)
- Xem danh sách kênh chatbot đã kết nối (read-only, admin quản lý)
- System prompt template (legacy)

### 2.9 Subscription Expiry Alert

- Banner cảnh báo khi subscription sắp hết hạn (≤7 ngày)
- Redirect đến trang `/subscription-expired` khi hết hạn
- Kiểm tra subscription status ở mỗi page load

---

## 3. Admin Panel (`/admin`)

Super admin quản lý toàn bộ nền tảng:

### 3.1 Platform Overview (`/admin`)

- KPI cards: Tổng properties, Active, Trial, Mới tháng này, Expired, Cancelled
- Bảng danh sách tất cả properties với plan và trạng thái subscription
- Ngày hết hạn / trial

### 3.2 Onboard New Property (`/admin/onboard`)

- Form tạo property mới:
  - Thông tin homestay (tên, địa chỉ, hotline)
  - Tài khoản chủ nhà (email, password)
  - Tự động tạo: property + user + users_properties + subscription (trial 14 ngày)
- One-click onboarding workflow

### 3.3 Subscription Management (`/admin/subscriptions`)

- Bảng tất cả subscriptions
- Inline edit: đổi plan (trial/basic/pro) và status (trial/active/expired/cancelled)
- Hiển thị ngày trial_ends_at và expires_at

### 3.4 LLM Settings (`/admin/llm-settings`)

- Cấu hình AI model cho toàn hệ thống hoặc per-property
- Scope selector: Global (mặc định) hoặc chọn property cụ thể
- Primary provider: Gemini / OpenAI / Anthropic / Groq
- Fallback provider: tự động chuyển khi primary fail
- Test Connection: gửi câu hỏi test, hiển thị response + latency
- API key management (masked display, secure storage)

### 3.5 Channel Management (`/admin/channels`)

- Quản lý kênh chatbot cho từng property
- Supported channels: Telegram, Zalo OA, Messenger, Instagram, WhatsApp, Website Widget
- CRUD operations: thêm / bật-tắt / xóa kênh
- Cấu hình channel-specific (VD: Zalo OA ID + Access Token)
- Map Chatwoot inbox_id với property

### 3.6 Admin Stats API (`/api/admin/stats`)

- Aggregate total bookings và revenue per property
- Chỉ tính booking có active statuses (confirmed, check-in, checked_in, đã cọc, đang ở)

---

## 4. Database Design

### 4.1 Entity Relationship Diagram

```
┌─────────────────┐
│   auth.users    │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────────┐         ┌──────────────────┐
│  users_properties   │────────►│    properties    │
│  (user_id, prop_id, │  N:1    │  (id, name,      │
│   role)             │         │   address, ...)  │
└─────────────────────┘         └────────┬─────────┘
                                         │ 1:N
                    ┌────────────────────┼────────────────────┐
                    │          │         │         │          │
                    ▼          ▼         ▼         ▼          ▼
             ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────────────┐
             │  rooms   │ │bookings│ │service │ │subscript-│ │channel_mappings│
             │          │ │        │ │requests│ │  ions    │ │                │
             └──────────┘ └────────┘ └────────┘ └──────────┘ └────────────────┘
                                                      │
                                         ┌────────────┴───────────┐
                                         ▼                        ▼
                                  ┌─────────────┐    ┌──────────────────────┐
                                  │llm_settings │    │knowledge_base_sections│
                                  │(per-property│    │(7 sections per prop) │
                                  │ or global)  │    │                      │
                                  └─────────────┘    └──────────────────────┘
```

### 4.2 Tables Summary

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `properties` | Thông tin homestay (tenant) | id, name, address, hotline, description |
| `rooms` | Danh sách phòng | room_id, property_id, loai_phong, suc_chua, gia_dem |
| `bookings` | Lịch sử đặt phòng | id, property_id, so_phong, check_in, check_out, tinh_trang |
| `service_requests` | Yêu cầu dịch vụ từ khách | id, property_id, loai_dich_vu, chi_tiet, trang_thai |
| `subscriptions` | Gói dịch vụ SaaS | id, property_id, plan, status, expires_at |
| `users_properties` | Liên kết user ↔ property | user_id, property_id, role (owner/admin) |
| `chatwoot_inbox_mapping` | Map inbox → property | inbox_id (UNIQUE), property_id |
| `channel_mappings` | Multi-channel config | property_id, channel, inbox_id, config (JSONB) |
| `llm_settings` | Cấu hình LLM | provider, model, api_key, property_id (NULL=global) |
| `knowledge_base_sections` | AI knowledge base | property_id, section_key, content, is_active |

### 4.3 Security Model (RLS)

- **Row Level Security** bật trên tất cả bảng
- Tenant chỉ đọc/ghi dữ liệu thuộc property của mình
- Admin (role='admin') có quyền truy cập toàn bộ
- n8n dùng `service_role` key (bypass RLS) cho automation
- API keys được lưu encrypted trong database, chỉ hiển thị masked cho admin

---

## 5. Analytics & Reporting

### 5.1 Tenant-Level Analytics

| Metric | Source | Visualization |
|--------|--------|--------------|
| Doanh thu tháng | `bookings` (num_day × gia_dem) | Line chart (daily breakdown) |
| % thay đổi MoM | So sánh tháng hiện tại vs trước | Percentage badge |
| Số booking tháng | Count bookings by check_in month | KPI card |
| Trung bình/booking | total_revenue / booking_count | KPI card |
| Occupancy rate | Bookings vs available room-days | Calendar heatmap |
| Conversations | Chatwoot API aggregation | KPI cards (open/resolved/total) |
| Service requests | Count by trang_thai | Status breakdown |

### 5.2 Admin-Level Analytics

| Metric | Source | Visualization |
|--------|--------|--------------|
| Total properties | Count `properties` | KPI card |
| Active subscriptions | `subscriptions` WHERE status='active' | KPI card |
| Trial subscriptions | `subscriptions` WHERE status='trial' | KPI card |
| New this month | `subscriptions` WHERE started_at ≥ first_of_month | KPI card |
| Expired / Cancelled | Count by status | KPI cards |
| Revenue per property | Aggregate bookings per property_id | Table |
| Total bookings per property | Count active bookings | Table |

### 5.3 Revenue Calculation Logic

```typescript
// Active statuses that count toward revenue
const ACTIVE_STATUSES = ['confirmed', 'check-in', 'checked_in', 'đã cọc', 'đang ở']

// Revenue = sum of (num_day × gia_dem) for active bookings in target month
revenue = bookings
  .filter(b => ACTIVE_STATUSES.includes(b.tinh_trang))
  .filter(b => b.check_in falls within target month)
  .reduce((sum, b) => sum + b.num_day * b.gia_dem, 0)

// Percent change
percentChange = previousTotal > 0
  ? ((currentTotal - previousTotal) / previousTotal) * 100
  : null
```

### 5.4 API Endpoints for Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/revenue?month=YYYY-MM` | GET | Doanh thu tenant (current + previous month + daily breakdown) |
| `/api/admin/stats` | GET | Aggregate bookings & revenue per property (admin only) |
| `/api/conversations?status=all` | GET | Conversation stats from Chatwoot |

---

## 6. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                      │
│  Zalo OA │ Telegram │ Messenger │ Instagram │ WhatsApp │ Website    │
└─────┬────┴────┬─────┴─────┬─────┴─────┬─────┴────┬─────┴─────┬─────┘
      │         │           │           │          │           │
      ▼         ▼           ▼           ▼          ▼           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CHATWOOT (Omnichannel)                          │
│  Unified inbox │ Contact management │ Webhook → n8n                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ webhook (inbox_id, message)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         n8n WORKFLOW                                  │
│  1. Receive Chatwoot webhook                                         │
│  2. POST /api/n8n/chat { inbox_id, message }                        │
│  3. Parse response tags (booking/service_request)                    │
│  4. POST /api/n8n/bookings or /api/n8n/service-requests             │
│  5. Reply to Chatwoot conversation                                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP requests
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APPLICATION                                │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐    │
│  │ Tenant      │  │ Admin Panel  │  │ API Routes              │    │
│  │ Dashboard   │  │              │  │                         │    │
│  │ - Bookings  │  │ - Overview   │  │ /api/n8n/chat           │    │
│  │ - Calendar  │  │ - Onboard    │  │ /api/n8n/bookings       │    │
│  │ - Rooms     │  │ - Subs       │  │ /api/n8n/rooms          │    │
│  │ - AI KB     │  │ - LLM Config │  │ /api/n8n/service-reqs   │    │
│  │ - Convos    │  │ - Channels   │  │ /api/knowledge-base     │    │
│  │ - Revenue   │  │ - Stats      │  │ /api/revenue            │    │
│  │ - Settings  │  │              │  │ /api/webhooks/zalo      │    │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              LLM Provider (Multi-model + Fallback)            │   │
│  │  Gemini ←→ OpenAI ←→ Anthropic ←→ Groq                      │   │
│  │  Config: DB (per-property / global) → Env vars               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                              │
│                                                                      │
│  properties │ rooms │ bookings │ service_requests │ subscriptions    │
│  users_properties │ channel_mappings │ llm_settings                  │
│  knowledge_base_sections │ chatwoot_inbox_mapping                    │
│                                                                      │
│  ✓ Row Level Security │ ✓ Realtime │ ✓ Auth │ ✓ Storage            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Infrastructure (AWS + Terraform)

```
┌──────────────────────────────────────────────┐
│              AWS ap-southeast-1               │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │         EC2 (t3.small, 30GB gp3)      │  │
│  │                                        │  │
│  │  ┌──────────┐  ┌──────────┐           │  │
│  │  │ Next.js  │  │   n8n    │           │  │
│  │  │  :3000   │  │  :5678   │           │  │
│  │  └──────────┘  └──────────┘           │  │
│  │  ┌──────────┐                         │  │
│  │  │ Chatwoot │                         │  │
│  │  │  :3001   │                         │  │
│  │  └──────────┘                         │  │
│  │                                        │  │
│  │  Docker Compose orchestration          │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Elastic IP (static)                         │
│  Security Group: 22, 80, 443, 3000-3001,    │
│                  5678                         │
└──────────────────────────────────────────────┘
```

**Provisioning**: Terraform IaC → `terraform apply` → EC2 + EIP + SG + user_data bootstrap

---

## 8. AI Chatbot Flow (Unified LLM)

```
Guest sends message (Zalo/Telegram/Web)
         │
         ▼
Chatwoot receives → triggers webhook
         │
         ▼
n8n workflow receives webhook payload
         │
         ▼
POST /api/n8n/chat { inbox_id, message }
         │
         ▼
┌─────────────────────────────────────┐
│ API Route Logic:                     │
│ 1. Lookup property_id from inbox_id │
│ 2. Fetch knowledge_base_sections    │
│    (WHERE is_active = true)         │
│ 3. Build system_message from KB     │
│ 4. Fetch rooms data for context     │
│ 5. Call LLM (property config →      │
│    global config → env fallback)    │
│ 6. Return { answer, provider }      │
└─────────────────────────────────────┘
         │
         ▼
n8n parses response:
  - Contains [BOOKING]? → POST /api/n8n/bookings
  - Contains [SERVICE]? → POST /api/n8n/service-requests
  - Reply text → Send back to Chatwoot
         │
         ▼
Guest receives AI response in their channel
```

---

## 9. Multi-Tenancy Design

| Aspect | Implementation |
|--------|---------------|
| Data isolation | `property_id` FK on every table + RLS policies |
| Auth | Supabase Auth → `users_properties` → determine property access |
| Role | `owner` (tenant) vs `admin` (super admin) |
| Config isolation | LLM settings per-property, channels per-property |
| Chatbot isolation | Each property has own knowledge base + inbox mapping |
| Subscription | Per-property billing cycle and plan |

---

## 10. Key Design Decisions

1. **Supabase over custom backend**: Faster development, built-in auth + RLS + realtime
2. **n8n for automation**: Visual workflow builder, easy to modify chatbot logic without code changes
3. **Chatwoot as messaging layer**: Unified inbox for all channels, built-in contact management
4. **Multi-LLM with fallback**: Resilience — if Gemini is down, auto-switch to OpenAI/Groq
5. **Knowledge Base sections**: Modular content management, each section toggleable independently
6. **Terraform IaC**: Reproducible infrastructure, one-command deployment
7. **Per-property LLM config**: Different properties can use different AI models/providers
8. **Next.js App Router**: Server components for admin pages (fast), client components for interactive dashboards
