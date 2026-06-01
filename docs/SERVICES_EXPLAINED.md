# StayJoy — Các Dịch Vụ Được Sử Dụng Trong Ứng Dụng

---

## Tổng Quan

StayJoy sử dụng 7 dịch vụ/nền tảng chính kết hợp với nhau để tạo thành hệ thống hoàn chỉnh:

```
Khách hàng (Zalo, Telegram, Web)
        │
        ▼
   [Chatwoot] ← Nhận tin nhắn từ mọi kênh
        │
        ▼ webhook
   [Next.js API] ← Xử lý logic + AI chatbot + giao diện dashboard
        │
        ├──→ [Supabase] ← Lưu trữ dữ liệu + xác thực user
        └──→ [Gemini/Groq] ← AI trả lời khách
```

---

## 1. Supabase — Database + Authentication + Storage

### Nó là gì?
Supabase là nền tảng backend-as-a-service, cung cấp database PostgreSQL, hệ thống đăng nhập, và lưu trữ file — tất cả trong 1 dịch vụ cloud.

### Trong StayJoy dùng để làm gì?

**Database (PostgreSQL)**:
- Lưu toàn bộ dữ liệu: thông tin homestay, phòng, booking, yêu cầu dịch vụ, subscription, knowledge base
- 12 bảng, tách biệt data giữa các homestay bằng Row Level Security (RLS)
- Mỗi homestay chỉ thấy data của mình, không thấy data homestay khác

**Authentication (Xác thực)**:
- Quản lý đăng nhập/đăng ký cho owner và admin
- Email + password authentication
- Session management (giữ trạng thái đăng nhập)

**Storage (Lưu trữ file)**:
- Lưu ảnh phòng mà owner upload
- Chatbot gửi ảnh cho khách khi được hỏi "cho xem phòng"

### Tại sao chọn Supabase?
- Free tier đủ cho MVP (500MB database, 1GB storage)
- Có sẵn Row Level Security — bảo mật multi-tenant không cần code thêm
- Real-time subscriptions (data cập nhật tức thì trên dashboard)
- SDK cho JavaScript/TypeScript tích hợp dễ dàng với Next.js

---

## 2. Next.js — Web Framework (Frontend + Backend)

### Nó là gì?
Next.js là framework React cho phép xây dựng cả giao diện web (frontend) và API server (backend) trong cùng 1 project.

### Trong StayJoy dùng để làm gì?

**Frontend (Giao diện)**:
- Dashboard cho Owner: quản lý booking, phòng, lịch, doanh thu, knowledge base
- Admin Panel: onboard homestay mới, quản lý subscription, cấu hình AI, quản lý kênh
- Trang đăng nhập, reset password, onboarding wizard
- Responsive design (hoạt động trên cả desktop và mobile)

**Backend (API)**:
- API routes xử lý logic nghiệp vụ: CRUD booking, rooms, service requests
- Webhook handler (`/api/webhooks/chatwoot`): nhận tin nhắn → gọi LLM → reply
- API cho knowledge base: build system prompt từ database
- Xử lý authentication, authorization, validation
- Message debounce: gom tin nhắn liên tiếp trước khi gọi AI

### Tại sao chọn Next.js?
- Fullstack trong 1 framework — không cần tách frontend/backend riêng
- Server-side rendering — trang load nhanh, SEO tốt
- App Router — routing tự động theo cấu trúc thư mục
- TypeScript — ít bug hơn nhờ type checking

---

## 3. Chatwoot — Omnichannel Messaging Platform

### Nó là gì?
Chatwoot là nền tảng messaging mã nguồn mở, cho phép nhận và gửi tin nhắn từ nhiều kênh (Zalo, Telegram, Messenger, Website...) vào 1 inbox thống nhất.

### Trong StayJoy dùng để làm gì?

**Nhận tin nhắn từ mọi kênh**:
- Khách nhắn qua Telegram → Chatwoot nhận
- Khách nhắn qua Zalo OA → Chatwoot nhận
- Khách nhắn qua Website widget → Chatwoot nhận
- Tất cả vào 1 nơi, không cần xử lý riêng từng kênh

**Gửi tin nhắn trả lời**:
- Chatbot trả lời → gửi qua Chatwoot API → khách nhận trên kênh họ đang dùng
- Owner nhận thông báo nội bộ (private note) khi có khách muốn đặt phòng

**Webhook**:
- Mỗi khi có tin nhắn mới → Chatwoot gửi webhook đến Next.js (`/api/webhooks/chatwoot`)
- Webhook chứa: nội dung tin nhắn, inbox_id (để biết thuộc homestay nào), thông tin khách

**Quản lý contact**:
- Lưu thông tin khách hàng (tên, SĐT, email)
- Lịch sử hội thoại

### Tại sao chọn Chatwoot?
- Open-source, self-hosted — không tốn phí license, data nằm trên server mình
- Hỗ trợ nhiều kênh sẵn (Telegram, Messenger, WhatsApp, Website widget)
- Webhook system — dễ kết nối với Next.js API
- Có API đầy đủ để gửi tin nhắn tự động

---

## 4. Google Gemini API — AI Language Model (Primary)

### Nó là gì?
Gemini là mô hình ngôn ngữ lớn (LLM) của Google, có khả năng hiểu và trả lời câu hỏi bằng ngôn ngữ tự nhiên.

### Trong StayJoy dùng để làm gì?

**Chatbot AI trả lời khách**:
- Nhận system prompt (knowledge base của homestay) + câu hỏi của khách
- Trả lời bằng tiếng Việt tự nhiên: giá phòng, chính sách, tiện ích, FAQ
- Thu thập thông tin khách (họ tên, SĐT, ngày check-in) khi khách muốn đặt phòng
- Gắn tag [BOOK], [SERVICE], [CANCEL] để server biết cần hành động gì

**Model sử dụng**: `gemini-2.0-flash-lite`
- Nhanh (response < 3 giây)
- Rẻ ($0.075/1M tokens)
- Đủ thông minh cho FAQ + thu thập thông tin

### Tại sao chọn Gemini?
- Giá rẻ nhất trong các LLM chất lượng cao
- Free tier 60 requests/phút — đủ cho MVP
- Hỗ trợ tiếng Việt tốt
- System instruction — inject knowledge base dễ dàng

---

## 5. Groq API — AI Language Model (Fallback)

### Nó là gì?
Groq là nền tảng inference LLM cực nhanh, chạy các model open-source (Llama, Mixtral) trên phần cứng chuyên dụng.

### Trong StayJoy dùng để làm gì?

**Backup khi Gemini fail**:
- Nếu Gemini bị lỗi (rate limit, downtime) → hệ thống tự động chuyển sang Groq
- Khách không bị gián đoạn — vẫn nhận được câu trả lời
- Chuyển đổi tự động, không cần can thiệp thủ công

**Model sử dụng**: `llama-3.3-70b-versatile`
- Nhanh (Groq inference speed rất cao)
- Free tier 30 requests/phút
- Chất lượng tương đương Gemini cho task FAQ

### Tại sao cần fallback?
- Không có LLM nào uptime 100%
- Gemini có thể bị rate limit khi nhiều request cùng lúc
- Fallback đảm bảo chatbot luôn hoạt động 24/7

---

## 6. Docker + Docker Compose — Containerization

### Nó là gì?
Docker đóng gói ứng dụng + dependencies vào "container" — chạy giống nhau trên mọi máy. Docker Compose quản lý nhiều containers cùng lúc.

### Trong StayJoy dùng để làm gì?

**Đóng gói toàn bộ hệ thống**:
- Container 1: Next.js (dashboard + API + webhook handler) — port 3000
- Container 2: Chatwoot (messaging) — port 3001
- Container 3: PostgreSQL (Chatwoot database) — port 5432
- Container 4: Redis (cache, shared) — port 6379

**Lợi ích**:
- 1 lệnh `docker compose up -d` → tất cả services chạy
- Migrate sang server khác: copy files + chạy lại → xong
- Mỗi service tách biệt — 1 cái crash không ảnh hưởng cái khác
- Dễ update: pull image mới → restart container

### Tại sao chọn Docker?
- Không cần cài đặt phức tạp trên server (Node.js, Ruby, PostgreSQL...)
- Reproducible — chạy giống nhau trên EC2, VPS, hay laptop
- Isolation — services không conflict với nhau
- Industry standard cho deployment

---

## 7. Terraform — Infrastructure as Code

### Nó là gì?
Terraform cho phép định nghĩa infrastructure (server, network, security) bằng code. Thay vì click tay trên AWS Console, viết file config rồi chạy 1 lệnh.

### Trong StayJoy dùng để làm gì?

**Tạo server AWS tự động**:
- 1 lệnh `terraform apply` → tạo: EC2 instance + Elastic IP + Security Group
- Cấu hình sẵn: mở port 22 (SSH), 3000 (app), 3001 (Chatwoot)
- Tự động cài Docker + deploy app qua user_data script

**Lợi ích**:
- Reproducible — xóa server, chạy lại → tạo lại y hệt
- Version control — thay đổi infrastructure được track trong git
- Không quên config — tất cả ghi trong file, không phụ thuộc trí nhớ

### Tại sao chọn Terraform?
- Dùng cho giai đoạn test trên AWS EC2
- Khi chuyển sang VPS production → không cần Terraform nữa (setup thủ công 1 lần)
- Nhưng vẫn hữu ích nếu cần tạo lại môi trường test nhanh

---

## Tóm Tắt: Mỗi Dịch Vụ Giải Quyết Vấn Đề Gì?

| Dịch vụ | Vấn đề giải quyết |
|---------|-------------------|
| **Supabase** | Lưu data ở đâu? Đăng nhập thế nào? Bảo mật multi-tenant? |
| **Next.js** | Giao diện dashboard + API server + webhook handler chạy bằng gì? |
| **Chatwoot** | Nhận tin nhắn từ Zalo/Telegram/Web vào 1 chỗ thế nào? |
| **Gemini** | AI trả lời khách bằng gì? |
| **Groq** | Nếu Gemini chết thì sao? |
| **Docker** | Deploy lên server thế nào? Migrate thế nào? |
| **Terraform** | Tạo server test nhanh thế nào? |
| **Tailwind CSS + shadcn/ui** | Giao diện đẹp mà không cần viết CSS thủ công? |
| **Cloudflare Tunnel** | HTTPS miễn phí không cần mua SSL? |
| **AWS EC2** | Server chạy ở đâu (testing)? |
| **VPS** | Server chạy ở đâu (production)? |
| **Domain** | Người dùng truy cập bằng URL gì? |

---

## 8. Tailwind CSS + shadcn/ui — Giao Diện

### Tailwind CSS là gì?
Framework CSS viết style trực tiếp trong HTML bằng class names. Thay vì viết file CSS riêng, bạn viết `className="bg-blue-500 text-white p-4 rounded"` → ra nút xanh, chữ trắng, padding, bo góc.

### shadcn/ui là gì?
Bộ component UI đẹp sẵn (Button, Table, Dialog, Select, Toast...) xây trên Tailwind. Copy vào project → dùng luôn, không cần tự thiết kế từ đầu.

### Trong StayJoy dùng để làm gì?
- Tất cả giao diện dashboard (bảng booking, form thêm phòng, calendar, KPI cards...)
- Responsive — tự co giãn trên mobile/desktop
- Dark mode ready (chưa bật nhưng sẵn sàng)
- Consistent design — tất cả trang trông thống nhất

### Tại sao chọn?
- Nhanh — không cần viết CSS từ đầu
- Đẹp — shadcn/ui có design system sẵn
- Nhẹ — chỉ include CSS thực sự dùng (tree-shaking)
- Phổ biến — dễ tìm người maintain

---

## 9. Cloudflare Tunnel — HTTPS Miễn Phí

### Nó là gì?
Cloudflare Tunnel tạo kết nối an toàn từ server của bạn đến mạng Cloudflare. Người dùng truy cập qua Cloudflare (HTTPS) → Cloudflare chuyển tiếp đến server (HTTP nội bộ).

### Trong StayJoy dùng để làm gì?
- `app.stayjoy.io.vn` → Next.js (port 3000) — HTTPS
- `chat.stayjoy.io.vn` → Chatwoot (port 3001) — HTTPS
- Telegram Bot API yêu cầu HTTPS → Cloudflare Tunnel giải quyết

### Tại sao chọn?
- **Miễn phí** — không cần mua SSL certificate
- **Không cần Nginx** — không cần cấu hình reverse proxy
- **Tự động renew** — không lo SSL hết hạn
- **Bảo mật** — server IP ẩn, chỉ expose qua Cloudflare

---

## 10. AWS EC2 — Server Testing

### Nó là gì?
EC2 (Elastic Compute Cloud) là máy chủ ảo trên AWS. Thuê theo giờ, chọn cấu hình (CPU, RAM), chạy Linux.

### Trong StayJoy dùng để làm gì?
- Server chạy toàn bộ hệ thống trong giai đoạn **testing**
- Instance type: t3.small (2 vCPU, 2GB RAM)
- Region: Singapore (ap-southeast-1) — gần Việt Nam
- Elastic IP: IP cố định không đổi khi restart

### Chi phí
- ~$15/tháng (chạy 24/7)
- Provisioned bằng Terraform (1 lệnh tạo/xóa)

### Khi nào bỏ?
- Khi chuyển sang VPS production (rẻ hơn, cùng spec)

---

## 11. VPS — Server Production (dự kiến)

### Nó là gì?
VPS (Virtual Private Server) = máy chủ ảo thuê hàng tháng. Giống EC2 nhưng rẻ hơn, phù hợp cho production lâu dài.

### Trong StayJoy dùng để làm gì?
- Thay thế EC2 khi ra production
- Chạy Docker Compose y hệt (copy files + `docker compose up`)
- Spec: 2 vCPU, 2-4GB RAM, 30-50GB SSD

### Provider gợi ý
- Vultr Singapore: $6-12/tháng
- DigitalOcean Singapore: $12/tháng
- Contabo: $5-7/tháng (spec cao nhất)

### Tại sao chuyển từ EC2 sang VPS?
- EC2 $15/tháng cho t3.small → VPS cùng spec chỉ $6-12
- Không cần tính năng AWS phức tạp (auto-scaling, load balancer...)
- StayJoy chỉ cần 1 server đơn giản

---

## 12. Domain + SSL — Tên Miền

### Domain là gì?
Tên miền (VD: `stayjoy.io.vn`) để người dùng truy cập app bằng URL dễ nhớ thay vì IP (`47.131.37.143`).

### SSL là gì?
Chứng chỉ bảo mật cho HTTPS (ổ khóa xanh trên browser). Mã hóa dữ liệu giữa user và server.

### Trong StayJoy:
- **Domain**: `stayjoy.io.vn` (mua tại Tenten, ~300k VNĐ/năm)
- **Nameservers**: Cloudflare (quản lý DNS)
- **SSL**: Miễn phí qua Cloudflare Tunnel (không cần Let's Encrypt)
- **Subdomains**:
  - `app.stayjoy.io.vn` → Dashboard + API
  - `chat.stayjoy.io.vn` → Chatwoot

### Tại sao cần domain?
- Telegram Bot API **bắt buộc HTTPS** → cần domain + SSL
- Người dùng nhớ `app.stayjoy.io.vn` dễ hơn `47.131.37.143:3000`
- Chuyên nghiệp hơn khi demo cho khách hàng
