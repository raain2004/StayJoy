#!/bin/bash
set -e

# --- Install Docker ---
apt-get update -y
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker ubuntu

# --- Create app directory ---
mkdir -p /opt/stayjoy
cd /opt/stayjoy

# --- Write docker-compose.yml ---
cat > docker-compose.yml << 'COMPOSE_EOF'
${docker_compose_content}
COMPOSE_EOF

# --- Write Dockerfile ---
cat > Dockerfile << 'DOCKERFILE_EOF'
${dockerfile_content}
DOCKERFILE_EOF

# --- Write .env ---
cat > .env << 'ENV_EOF'
${env_content}
ENV_EOF

# --- Clone app source (will be replaced by actual deploy) ---
# For now, we'll build from the Dockerfile which expects the source to be copied in

# --- Start services ---
docker compose up -d

echo "StayJoy deployment complete!" > /opt/stayjoy/deploy.log
