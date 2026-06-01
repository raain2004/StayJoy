# StayJoy — Resources & Acquisition Plan v2

**Cập nhật**: 28/05/2026 — Phản ánh kiến trúc mới (bỏ n8n, thêm Cloudflare Tunnel, domain stayjoy.io.vn)

---

## 1. Resources cần thiết

### A. Cloud Infrastructure

| Resource | Role | Cost |
|----------|------|------|
| **Supabase** (Cloud) | PostgreSQL + Auth + Storage | Free tier (500MB DB) |
| **AWS EC2** (t3.small) | Host app + Chatwoot (Docker) — testing | ~$15/month |
| **Cloudflare** (Free plan) | DNS + Tunnel (HTTPS miễn phí) | $0 |
| **Domain** (stayjoy.io.vn) | URL production | ~300k VNĐ/năm |

### B. Open-Source Software (miễn phí)

| Software | Role |
|----------|------|
| **Next.js 14** | Full-stack: dashboard + API + webhook handler + chatbot logic |
| **Chatwoot** (self-hosted) | Omnichannel messaging (Telegram, Zalo, Messenger...) |
| **Docker + Docker Compose** | Container orchestration |
| **Cloudflare Tunnel** (cloudflared) | HTTPS reverse proxy miễn phí |
| **Terraform** | Infrastructure as Code (provisioning EC2) |
| **Tailwind CSS + shadcn/ui** | UI components |

### C. Third-Party APIs

| API | Purpose | Cost |
|-----|---------|------|
| **Groq API** | Primary LLM (llama-3.3-70b-versatile) | Free tier (30 req/min) |
| **Google Gemini API** | Fallback LLM | Free tier (60 req/min) |
| **Telegram Bot API** | Kênh chat Telegram | Free |
| **Zalo OA API** | Kênh chat Zalo | Free (cần xác thực OA) |
| **Airbnb/Booking.com iCal** | Sync lịch phòng | Free (URL công khai) |

### D. Không còn cần

| ~~Resource~~ | Lý do bỏ |
|-------------|-----------|
| ~~n8n~~ | Chatbot logic chạy trực tiếp trong Next.js API route |
| ~~Separate LLM server~~ | LLM gọi qua API (Groq/Gemini), không cần host model |

---

## 2. Kiến trúc hiện tại (đang chạy)

```
Internet (HTTPS)
    │
    ▼
Cloudflare Tunnel
    ├── app.stayjoy.io.vn → EC2:3000 (Next.js)
    └── chat.stayjoy.io.vn → EC2:3001 (Chatwoot)
    
AWS EC2 (t3.small, Singapore)
    ├── Docker: nextjs (Dashboard + API + Chatbot)
    ├── Docker: chatwoot-web + chatwoot-worker
    ├── Docker: chatwoot-postgres (pgvector)
    ├── Docker: redis
    └── cloudflared (system service)

Supabase Cloud (PostgreSQL + Auth)
    └── 12 bảng, RLS enabled
```

### Chi phí hiện tại (testing phase)

| Hạng mục | Chi phí/tháng |
|----------|---------------|
| EC2 t3.small | ~$15 |
| Supabase | $0 (free tier) |
| Cloudflare | $0 (free plan) |
| Groq API | $0 (free tier) |
| Domain | ~25k VNĐ/tháng (~300k/năm) |
| **Tổng** | **~$15/tháng + 25k VNĐ** |

---

## 3. Acquisition Plan

### Phase 1: Testing & Validation (hiện tại — Tuần 1-4)

**Đã hoàn thành:**
- ✅ EC2 provisioned bằng Terraform
- ✅ Docker Compose chạy tất cả services
- ✅ Cloudflare Tunnel setup (HTTPS)
- ✅ Domain stayjoy.io.vn kết nối
- ✅ Chatbot flow end-to-end: Telegram → Chatwoot → Next.js → Groq → reply
- ✅ Owner dashboard: booking, phòng (CRUD), calendar, conversations, AI KB
- ✅ Admin panel: onboard, subscription, LLM config, channels

**Còn lại:**
- [ ] Test với 1-2 homestay thật
- [ ] Thêm kênh Zalo OA
- [ ] Import knowledge base cho homestay test
- [ ] Monitoring (UptimeRobot + Docker logs)

### Phase 2: Production (Tuần 5-10)

| Việc | Chi tiết |
|------|----------|
| Migrate sang VPS | Vultr/DigitalOcean Singapore, 2-4GB RAM, ~$6-12/month |
| SSL | Cloudflare Tunnel đã có HTTPS (không cần Let's Encrypt) |
| Backup | Supabase auto-backup + Chatwoot pg_dump weekly |
| Onboard 5-10 homestay | Demo + hỗ trợ nhập KB |
| Revenue | Subscription SaaS (trial 14 ngày → paid) |

### Phase 3: Scale (Tuần 11+)

- Thêm kênh: Messenger, Instagram (Facebook App Review)
- Thêm tính năng: auto-booking, payment integration
- Marketing: tiếp cận homestay mới

---

## 4. Production Infrastructure (VPS)

### Spec tối thiểu

| Hạng mục | Yêu cầu |
|----------|---------|
| CPU | 2 vCPU |
| RAM | 2-4 GB |
| Storage | 30-50 GB SSD |
| OS | Ubuntu 22.04 LTS |
| Location | Singapore |

### RAM breakdown (ước tính)

| Container | RAM |
|-----------|-----|
| nextjs | ~200MB |
| chatwoot-web | ~800MB |
| chatwoot-worker | ~400MB |
| chatwoot-postgres | ~200MB |
| redis | ~50MB |
| cloudflared | ~30MB |
| **Tổng** | **~1.7GB** |

→ VPS 2GB RAM đủ cho 10-15 homestay. 4GB cho headroom.

### VPS Provider gợi ý

| Provider | Spec | Giá/tháng |
|----------|------|-----------|
| Vultr (Singapore) | 2 vCPU, 2GB RAM | $6-12 |
| DigitalOcean (Singapore) | 2 vCPU, 2GB RAM | $12 |
| Contabo (Singapore) | 4 vCPU, 8GB RAM | $5-7 |

### Migration từ EC2 → VPS

```bash
# 1. Trên VPS mới
curl -fsSL https://get.docker.com | sh
# 2. Copy files
scp -r /opt/stayjoy user@vps:/opt/stayjoy
# 3. Start
cd /opt/stayjoy && docker compose up -d
# 4. Setup cloudflared tunnel (trỏ lại IP mới)
cloudflared tunnel route ip delete <old-ip>
cloudflared tunnel route ip add <new-ip>
```

Thời gian: ~30 phút. Database (Supabase cloud) không cần migrate.

---

## 5. Monitoring

### Tools (tất cả miễn phí)

| Tool | Theo dõi |
|------|----------|
| UptimeRobot | Website online/offline, alert khi down |
| Docker logs | Chatbot requests, errors, LLM latency |
| Chatwoot Reports | Số hội thoại, response time |
| Supabase Dashboard | DB size, connections |
| Cloudflare Analytics | Traffic, requests, bandwidth |

### Metrics quan trọng

| Metric | Mục tiêu |
|--------|-----------|
| Uptime | > 99.5% |
| Chatbot response time | < 5 giây |
| LLM fallback rate | < 5% |
| Error rate (5xx) | < 1% |

---

## 6. Chi phí tổng hợp

### Testing (hiện tại)

| Hạng mục | Chi phí |
|----------|---------|
| EC2 | ~$15/tháng |
| Domain | ~25k VNĐ/tháng |
| Supabase + Groq + Cloudflare | $0 |
| **Tổng** | **~$15/tháng** |

### Production (dự kiến)

| Hạng mục | Chi phí |
|----------|---------|
| VPS (Vultr/DO) | $6-12/tháng |
| Domain | ~25k VNĐ/tháng |
| Supabase Pro (nếu cần) | $25/tháng |
| LLM API (nếu vượt free tier) | $5-20/tháng |
| **Tổng** | **$6-57/tháng** |

### Chi phí cố định hàng năm

| Hạng mục | Chi phí |
|----------|---------|
| Domain stayjoy.io.vn | ~300k VNĐ |
| SSL | $0 (Cloudflare) |
| VPS | $72-144 (~1.8-3.6tr VNĐ) |
| Supabase (nếu Pro) | $300 (~7.5tr VNĐ) |
