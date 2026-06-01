# StayJoy — Resources & Acquisition Plan

---

## 1. What are the resources do you need to make your product work?

### A. Cloud Infrastructure

| Resource | Role | Cost |
|----------|------|------|
| **Supabase** | PostgreSQL database + Authentication + File storage | Free → $25/month (Pro) |
| **AWS EC2** (t3.small) | Host app + Chatwoot (Docker) — dùng cho testing | ~$15/month |
| **AWS Elastic IP** | Static IP (không đổi khi restart server) | Free (khi gắn EC2) |
| **Google Gemini API** | Primary LLM cho AI chatbot | Pay-per-use (~$0.075/1M tokens) |
| **Domain + SSL** | URL production (stayjoy.vn) | ~$12/year |

### B. Open-Source Software (miễn phí)

| Software | Role |
|----------|------|
| **Next.js 14** | Full-stack web framework (frontend + backend API + webhook handler) |
| **Chatwoot** (self-hosted) | Omnichannel messaging (nhận tin từ Zalo, Telegram, Web...) |
| **Docker + Docker Compose** | Đóng gói và chạy tất cả services trên 1 server |
| **Terraform** | Infrastructure as Code — tạo server AWS bằng 1 lệnh (dùng cho testing) |
| **Tailwind CSS + shadcn/ui** | UI components cho dashboard |
| **Recharts** | Biểu đồ doanh thu |

### C. Third-Party API Integrations

| API | Purpose | Cost |
|-----|---------|------|
| **Zalo OA API** | Nhận/gửi tin nhắn Zalo | Free (cần xác thực OA) |
| **Telegram Bot API** | Kênh chat Telegram | Free, unlimited |
| **Facebook Messenger API** | Kênh chat Messenger | Free (cần App Review) |
| **OpenAI / Groq API** | Fallback LLM khi Gemini fail (Groq primary fallback, OpenAI secondary) | Pay-per-use |
| **Airbnb/Booking.com iCal** | Sync lịch phòng tránh double-booking | Free (URL công khai) |

### D. Human Resources

| Role | Responsibility |
|------|---------------|
| 1 Full-stack Developer | Next.js + Supabase + API development |
| 1 AI/Automation Engineer | LLM prompt engineering, chatbot logic, Chatwoot integration |
| 1 Business Development | Tiếp cận chủ homestay, hỗ trợ onboarding |

### E. Data & Content (từ khách hàng)

| Data | Source | How |
|------|--------|-----|
| Knowledge base (7 sections) | Chủ homestay tự nhập | Dashboard editor |
| Thông tin phòng + giá | Chủ homestay | Nhập trên dashboard hoặc import Excel |
| Ảnh phòng | Chủ homestay | Upload trên trang quản lý phòng |
| iCal URLs | Airbnb/Booking.com | Copy link từ OTA, paste vào dashboard |

### F. Monitoring & Observability Tools (miễn phí)

| Tool | Theo dõi gì | Chi phí |
|------|-------------|---------|
| **UptimeRobot** | Website online/offline, response time, alert khi down | Free |
| **Netdata** (self-hosted) | CPU, RAM, disk, network realtime trên VPS | Free |
| **Server Logs** (Docker logs) | Chatbot requests: success/fail, latency, LLM provider used | Free (built-in) |
| **Chatwoot Reports** | Số hội thoại, thời gian phản hồi, resolution rate | Free (built-in) |
| **Supabase Dashboard** | DB size, connections, API calls | Free (built-in) |
| **LLM Provider Dashboard** | Token usage, cost, rate limits | Free (Gemini/Groq console) |
| **Docker stats / logs** | RAM/CPU per container, error logs | Free (built-in) |

---

## 2. How do you plan to acquire those resources?

### Phase 1: MVP & Testing (Tuần 1–4) — Bootstrap

| Resource | Cách acquire |
|----------|-------------|
| Supabase | Đăng ký free tier (500MB DB, 1GB storage) |
| AWS EC2 | Dùng t3.small (~$15/month) để test, provisioned bằng Terraform |
| Chatwoot | Self-host trên EC2 (Docker), không tốn license |
| Gemini API | Google AI Studio free tier (60 req/phút) |
| Zalo/Telegram | Đăng ký Zalo OA (free) + tạo Telegram Bot |
| Team | 2 người (founder + dev), dùng AI tools tăng productivity |
| Data | Chủ homestay tự nhập qua dashboard (self-service) |

**Công việc Phase 1:**
- Thiết kế giao diện web dashboard cho Owner (quản lý booking, phòng, chatbot KB, doanh thu)
- Thiết kế giao diện Admin Panel (onboard, subscription, LLM config, channels)
- Thiết kế hệ thống: database schema, API routes, authentication flow
- Cấu hình các ứng dụng kết nối với nhau: Next.js ↔ Supabase ↔ Chatwoot ↔ LLM API
- Phát triển webhook handler: Chatwoot → Next.js API → LLM → reply
- Cấu hình Docker Compose để tất cả services chạy trên 1 server
- Cài đặt monitoring: UptimeRobot (uptime alert) + Netdata (server metrics)
- Test chatbot flow end-to-end: Telegram → Chatwoot → webhook → LLM → reply

**Tổng chi phí: < $30/tháng (chỉ EC2 + domain)**

### Phase 2: Production Launch (Tuần 5–10) — Chuyển sang VPS

| Resource | Cách acquire |
|----------|-------------|
| VPS Production | Mua VPS (Vultr/DigitalOcean/Contabo) 2-4GB RAM, ~$6-12/month |
| Domain + SSL | Mua domain .vn (~400k/năm) + Let's Encrypt SSL (free) |
| Supabase Pro | Upgrade $25/month nếu cần, funded bởi subscription |
| LLM costs | Covered bởi subscription fee từ tenant |
| Onboard khách hàng | Tiếp cận 5-10 homestay đầu tiên, hỗ trợ setup |

**Công việc Phase 2:**
- Migrate từ EC2 sang VPS production (Docker Compose, ~30 phút)
- Mua domain + cấu hình DNS trỏ về VPS
- Cài SSL (Let's Encrypt) cho HTTPS
- Cấu hình Nginx reverse proxy (domain → port 3000/3001/5678)
- Cấu hình Netdata trên VPS mới (monitoring CPU/RAM/disk)
- Cấu hình UptimeRobot alert cho domain production
- Tiếp cận 5-10 chủ homestay đầu tiên, demo sản phẩm
- Hỗ trợ onboarding: giúp owner nhập knowledge base, kết nối kênh chat
- Thu thập feedback, fix bug, cải thiện UX
- Theo dõi metrics: uptime, chatbot response time, error rate, LLM fallback rate

**Revenue model**: Subscription SaaS (trial 14 ngày → basic/pro plan)

### Phase 3: Relaunch (Tuần 11–14) — Nếu cần tiếp cận lại khách hàng

| Resource | Cách acquire |
|----------|-------------|
| Marketing | Chạy lại chiến dịch tiếp cận homestay mới |
| Cải thiện sản phẩm | Fix feedback từ Phase 2, thêm feature theo yêu cầu |
| Mở rộng kênh | Thêm Messenger/Instagram (Facebook App Review) |
| Thêm nhân sự | Hire part-time support nếu có revenue |

**Mục tiêu**: Relaunch & tiếp cận lại khách hàng nếu Phase 2 chưa đạt target.

---

## 4. Production Infrastructure (VPS)

### Spec VPS cho production

| Hạng mục | Yêu cầu | Ghi chú |
|----------|---------|---------|
| CPU | 2 vCPU trở lên | Đủ cho 20 concurrent chatbot requests |
| RAM | 2–4 GB | Next.js ~500MB + Chatwoot ~1GB + PostgreSQL ~300MB + Redis ~100MB |
| Storage | 30–50 GB SSD | OS + Docker images + logs |
| Bandwidth | 1–2 TB/tháng | Đủ cho 15 homestay |
| OS | Ubuntu 22.04 LTS | Stable, Docker support tốt |
| Location | Singapore hoặc Vietnam | Latency thấp cho user VN |

### VPS Provider gợi ý

| Provider | Spec | Giá/tháng | Ghi chú |
|----------|------|-----------|---------|
| Vultr (Singapore) | 2 vCPU, 2GB RAM, 50GB SSD | $6–12 | Phổ biến, stable |
| DigitalOcean (Singapore) | 2 vCPU, 2GB RAM, 50GB SSD | $12 | UI dễ dùng |
| Contabo (Germany/Singapore) | 4 vCPU, 8GB RAM, 200GB SSD | $5–7 | Rẻ nhất, spec cao |
| VNETWORK / Vietnix (VN) | 2 vCPU, 2GB RAM | ~150k–300k VNĐ | Server tại VN, latency thấp nhất |

---

## 5. Chuyển từ EC2 sang VPS (Migration)

### Có phải cấu hình nhiều không?

**Không.** Vì toàn bộ app chạy bằng Docker Compose, việc migrate chỉ cần:

1. Mua VPS mới, SSH vào
2. Cài Docker + Docker Compose (2 lệnh)
3. Copy file lên VPS (scp hoặc git clone)
4. Chạy `docker compose up -d`
5. Trỏ domain về IP mới

### Các bước cụ thể

```bash
# 1. Trên VPS mới — cài Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Copy code lên VPS (hoặc git clone)
scp -r ./stayjoy user@vps-ip:/home/user/stayjoy

# 3. Tạo file .env (copy từ EC2)
cp .env.local .env

# 4. Start tất cả services
cd /home/user/stayjoy
docker compose up -d

# 5. Trỏ domain về IP mới (tại nhà cung cấp domain)
# A record: stayjoy.vn → IP VPS mới
```

**Thời gian migrate: ~30 phút.** Không cần cấu hình lại code, database (Supabase cloud), hay chatbot logic.

### Những gì KHÔNG cần migrate

| Component | Lý do |
|-----------|-------|
| Database (Supabase) | Cloud hosted — không nằm trên EC2, truy cập từ đâu cũng được |
| LLM API keys | Nằm trong .env file, copy sang là xong |
| Chatwoot data | Nằm trong Docker volume (PostgreSQL), cần backup + restore |

---

## 6. Công cụ theo dõi hệ thống trên VPS

### Monitoring (miễn phí)

| Tool | Theo dõi gì | Chi phí |
|------|-------------|---------|
| **UptimeRobot** | Website có đang online không, response time | Free (50 monitors) |
| **Netdata** (self-hosted) | CPU, RAM, disk, network realtime trên VPS | Free, cài 1 lệnh |
| **Server Logs** (Docker logs) | Chatbot requests: success/fail, latency, LLM provider | Free (built-in) |
| **Docker stats** | RAM/CPU per container | Built-in Docker |
| **Supabase Dashboard** | DB size, connections, API calls | Built-in |

### Theo dõi AI Chatbot & Pipeline

| Tool | Theo dõi gì | Chi phí |
|------|-------------|---------|
| **Server Logs** (Next.js console) | Chatbot requests: thành công/fail, thời gian xử lý, LLM provider used | Free (Docker logs) |
| **Chatwoot Reports** | Số hội thoại, thời gian phản hồi, resolution rate, CSAT | Free (built-in Chatwoot) |
| **StayJoy Admin Stats** (`/api/admin/stats`) | Tổng bookings, revenue per property, chatbot conversion | Built-in (đã có) |
| **StayJoy Conversations Page** | Số hội thoại/tháng, open vs resolved, per property | Built-in (đã có) |
| **LLM Provider Logs** (server console) | Provider nào được dùng, fallback rate, latency per request | Console logs + có thể thêm DB logging |
| **Langfuse** (optional, self-hosted) | LLM observability: token usage, cost, latency, prompt quality | Free self-hosted |

### Metrics AI Chatbot nên theo dõi

| Metric | Ý nghĩa | Nguồn | Mục tiêu |
|--------|---------|-------|-----------|
| **Messages/tháng** | Lượng tin nhắn chatbot xử lý | Server logs (webhook count) | Tăng = nhiều khách dùng |
| **Avg Response Time** | Thời gian từ khách nhắn → chatbot reply | Server logs (request duration) | < 5 giây |
| **LLM Fallback Rate** | % request phải dùng provider dự phòng | Server logs | < 5% |
| **Error Rate** | % tin nhắn chatbot không trả lời được | Server logs (5xx responses) | < 1% |
| **Conversation → Booking** | % hội thoại dẫn đến đặt phòng | Bookings có conversation_id / Total conversations | > 10% |
| **Token Usage/tháng** | Lượng token LLM tiêu thụ | LLM provider dashboard (Gemini/Groq) | Theo dõi chi phí |
| **Top Questions** | Khách hỏi gì nhiều nhất | Phân tích message logs | Cải thiện KB |

### Alerting (thông báo khi có vấn đề)

| Tool | Alert khi | Cách nhận |
|------|-----------|-----------|
| **UptimeRobot** | Website down > 1 phút | Email / Telegram |
| **Netdata** | CPU > 90%, RAM > 85%, Disk > 80% | Email |
| **Docker healthcheck** | Container crash/restart | Docker logs |

### Cài Netdata trên VPS (1 lệnh)

```bash
# Cài agent monitoring — dashboard tại http://vps-ip:19999
curl https://get.netdata.cloud/kickstart.sh > /tmp/netdata-kickstart.sh
sh /tmp/netdata-kickstart.sh
```

### Metrics nên theo dõi

| Metric | Ngưỡng bình thường | Cảnh báo khi |
|--------|--------------------|--------------| 
| CPU Usage | < 60% | > 80% liên tục 5 phút |
| RAM Usage | < 70% | > 85% |
| Disk Usage | < 70% | > 80% |
| Response Time (API) | < 2 giây | > 5 giây |
| Chatbot Latency | < 4 giây | > 8 giây |
| Uptime | 99.5%+ | < 99% |
| Error Rate (5xx) | < 0.5% | > 2% |

---

## 7. Chi phí cố định hàng năm

| Hạng mục | Chi phí | Ghi chú |
|----------|---------|---------|
| Tên miền (.vn) | ~300k–500k VNĐ/năm | Mua tại Tenten, Mắt Bão, hoặc Namecheap |
| SSL Certificate | $0 (miễn phí) | Dùng Let's Encrypt — tự động renew, free forever |
| AWS EC2 | ~$180/năm (~4.5tr VNĐ) | t3.small chạy 24/7 |
| Supabase (nếu upgrade Pro) | ~$300/năm (~7.5tr VNĐ) | Chỉ khi vượt free tier |

---

## 5. Chi phí bảo trì

| Hạng mục | Chi phí | Tần suất |
|----------|---------|----------|
| Cập nhật security patches (OS, Docker) | $0 (tự làm) | Hàng tháng |
| Backup database | $0 (Supabase tự backup daily) | Tự động |
| Monitor uptime | $0 (UptimeRobot free plan) | Tự động |
| Renew SSL | $0 (Let's Encrypt auto-renew) | Tự động mỗi 90 ngày |
| Renew tên miền | 300–500k VNĐ | Hàng năm |
| Bug fixes + feature updates | Thời gian developer | Ongoing |
| Cập nhật LLM model mới | $0 (đổi config trên admin panel) | Khi có model tốt hơn |

| Hạng mục | Chi phí | Ghi chú |
|----------|---------|---------|
| Tên miền (.vn) | ~300k–500k VNĐ/năm | Mua tại Tenten, Mắt Bão, hoặc Namecheap |
| SSL Certificate | $0 (miễn phí) | Dùng Let's Encrypt — tự động renew, free forever |
| VPS Production | ~$72–144/năm (~1.8–3.6tr VNĐ) | $6-12/month tùy provider |
| Supabase (nếu upgrade Pro) | ~$300/năm (~7.5tr VNĐ) | Chỉ khi vượt free tier |

---

## 8. Chi phí bảo trì

| Hạng mục | Chi phí | Tần suất |
|----------|---------|----------|
| Cập nhật security patches (OS, Docker) | $0 (tự làm) | Hàng tháng |
| Backup database | $0 (Supabase tự backup daily) | Tự động |
| Monitor uptime | $0 (UptimeRobot free plan) | Tự động |
| Renew SSL | $0 (Let's Encrypt auto-renew) | Tự động mỗi 90 ngày |
| Renew tên miền | 300–500k VNĐ | Hàng năm |
| Bug fixes + feature updates | Thời gian developer | Ongoing |
| Cập nhật LLM model mới | $0 (đổi config trên admin panel) | Khi có model tốt hơn |
