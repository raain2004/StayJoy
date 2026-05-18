# StayJoy Infrastructure — AWS EC2 Test Deployment

## Prerequisites

1. **AWS CLI** configured (`aws configure`)
2. **Terraform** installed (v1.5+)
3. **SSH Key Pair** created in AWS EC2 Console (region: ap-southeast-1)

## Quick Start

```bash
cd infra

# 1. Copy and fill in your variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# 2. Initialize Terraform
terraform init

# 3. Preview changes
terraform plan

# 4. Deploy
terraform apply

# 5. Note the outputs (IP, URLs)
# dashboard_url = http://x.x.x.x:3000
# n8n_url       = http://x.x.x.x:5678
# chatwoot_url  = http://x.x.x.x:3001
```

## After Deploy

1. **Update PUBLIC_IP** in terraform.tfvars with the Elastic IP from output
2. **SSH into instance**: `ssh -i ~/.ssh/your-key.pem ubuntu@<IP>`
3. **Check logs**: `cd /opt/stayjoy && docker compose logs -f`
4. **Deploy app code**:
   ```bash
   # From your local machine, copy source code
   scp -i ~/.ssh/your-key.pem -r ../src ../package.json ../package-lock.json ../next.config.js ../tsconfig.json ../tailwind.config.ts ../postcss.config.js ubuntu@<IP>:/opt/stayjoy/

   # SSH in and rebuild
   ssh -i ~/.ssh/your-key.pem ubuntu@<IP>
   cd /opt/stayjoy
   docker compose build nextjs
   docker compose up -d nextjs
   ```

## Services

| Service | Port | URL |
|---------|------|-----|
| Next.js Dashboard | 3000 | http://IP:3000 |
| n8n | 5678 | http://IP:5678 |
| Chatwoot | 3001 | http://IP:3001 |

## n8n Workflow Setup

After Chatwoot is running:
1. Create an inbox in Chatwoot (API channel or Website widget)
2. Set webhook URL to: `http://IP:5678/webhook/chatwoot`
3. In n8n, import the workflow from `test_tele_StayJoy_production.json`
4. Update the HTTP Request node URL to: `http://localhost:3000/api/knowledge-base`

## Destroy

```bash
terraform destroy
```

## Cost

- EC2 t3.medium: ~$0.04/hour (~$30/month)
- EBS 30GB gp3: ~$2.40/month
- Elastic IP (when attached): free
- **Total**: ~$33/month
