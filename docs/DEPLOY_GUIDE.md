# Hướng Dẫn Deploy Code Lên EC2

## Thông tin server

- **IP**: 47.131.37.143
- **SSH Key**: `infra/.ssh/StayJoy_key.pem`
- **User**: ubuntu
- **App path**: `/opt/stayjoy/`
- **URL**: https://app.stayjoy.io.vn

---

## Các bước deploy (chạy từ thư mục project)

### Bước 1: Nén source code

```powershell
tar -czf src.tar.gz -C . src
```

### Bước 2: Upload lên server

```powershell
scp -i infra/.ssh/StayJoy_key.pem -o StrictHostKeyChecking=no src.tar.gz ubuntu@47.131.37.143:~/src.tar.gz
```

### Bước 3: SSH vào server, extract, build, restart

```powershell
ssh -i infra/.ssh/StayJoy_key.pem -o StrictHostKeyChecking=no ubuntu@47.131.37.143 "rm -rf ~/deploy/src && tar -xzf ~/src.tar.gz -C ~/deploy/ && sudo rm -rf /opt/stayjoy/src && sudo cp -r ~/deploy/src /opt/stayjoy/ && cd /opt/stayjoy && sudo docker compose stop chatwoot-web chatwoot-worker 2>/dev/null && sudo docker compose build nextjs 2>&1 | grep -E '(Built|failed)' && sudo docker compose up -d 2>&1 | tail -5"
```

### Bước 4: Kiểm tra

- Truy cập https://app.stayjoy.io.vn/login
- Hoặc check: `ssh ... "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/login"`

---

## Lệnh 1 dòng (copy-paste)

```powershell
$src = "c:\jupyter\test\n8n\fix_test_n8n_stayjoy"; tar -czf "$src\src.tar.gz" -C "$src" src; scp -i "$src\infra\.ssh\StayJoy_key.pem" -o StrictHostKeyChecking=no "$src\src.tar.gz" "ubuntu@47.131.37.143:~/src.tar.gz"; ssh -i "$src\infra\.ssh\StayJoy_key.pem" -o StrictHostKeyChecking=no ubuntu@47.131.37.143 "rm -rf ~/deploy/src && tar -xzf ~/src.tar.gz -C ~/deploy/ && sudo rm -rf /opt/stayjoy/src && sudo cp -r ~/deploy/src /opt/stayjoy/ && cd /opt/stayjoy && sudo docker compose stop chatwoot-web chatwoot-worker 2>/dev/null && sudo docker compose build nextjs 2>&1 | grep -E '(Built|failed)' && sudo docker compose up -d 2>&1 | tail -5"
```

---

## Lưu ý quan trọng

1. **Stop Chatwoot trước khi build** — Server chỉ có 2GB RAM. Nếu build Docker mà Chatwoot đang chạy → hết RAM → server treo.

2. **Build mất ~2-3 phút** — Đừng ngắt SSH giữa chừng.

3. **Sau deploy, chờ 30 giây** — Chatwoot cần thời gian khởi động.

4. **Nếu server treo** (không SSH được) → Vào AWS Console → Reboot instance.

5. **Nếu 502 Bad Gateway** → Chờ 1-2 phút, container đang start.

---

## Chỉ restart (không build lại)

Nếu chỉ thay đổi env vars (không đổi code):

```powershell
ssh -i infra/.ssh/StayJoy_key.pem ubuntu@47.131.37.143 "cd /opt/stayjoy && sudo docker compose restart nextjs"
```

---

## Xem logs

```powershell
ssh -i infra/.ssh/StayJoy_key.pem ubuntu@47.131.37.143 "cd /opt/stayjoy && sudo docker compose logs nextjs --tail 20 2>&1 | grep -v obsolete"
```
