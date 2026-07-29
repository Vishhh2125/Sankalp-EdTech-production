# OTT Platform — Production Server Setup Guide (Windows)

Run these commands ONCE on your Windows instance (e.g. EC2 Windows Server) before the first deploy. After this, every git push to main will auto-deploy via GitHub Actions.

## STEP 1 — Install Docker & Docker Compose (Windows Server)

1. Install Docker Desktop for Windows (if using a standard Windows VM) or Docker Engine. You can download it from: [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
2. Ensure WSL 2 (Windows Subsystem for Linux) is installed and enabled, as Docker Desktop relies on it for running Linux containers.
   In PowerShell (Run as Administrator):
   ```powershell
   wsl --install
   ```
3. Restart your server if prompted.
4. Open Docker Desktop once to initialize it and ensure it starts on boot.

Verify in PowerShell or CMD:
```powershell
docker --version
docker compose version
```

## STEP 2 — Setup OpenSSH Server for GitHub Actions

In PowerShell (Run as Administrator):
```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'
```

Open Firewall for SSH (Port 22):
```powershell
New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

Ensure your Windows user has a password set. For key-based authentication, you will need to set up the `authorized_keys` file in your user profile:
`C:\Users\Administrator\.ssh\authorized_keys`
(Paste your public SSH key into this file)

## STEP 3 — Create the deployment directory structure

In PowerShell:
```powershell
New-Item -Path "C:\ott-platform\nginx" -ItemType Directory -Force
```

## STEP 4 — Copy config files to the server (run from your LOCAL machine)

Run this from your local machine to copy files to the Windows Server:
*(Replace Administrator with your Windows username)*

```bash
scp -i your-key.pem docker-compose.prod.yml     Administrator@<SERVER_IP>:C:/ott-platform/
scp -i your-key.pem nginx/nginx.conf            Administrator@<SERVER_IP>:C:/ott-platform/nginx/
scp -i your-key.pem .env.production.example     Administrator@<SERVER_IP>:C:/ott-platform/.env.production
```

On the server, edit the `.env.production` file:
└─ Replace every `CHANGE_ME_*` value with real secrets.

## STEP 5 — Create a GitHub Personal Access Token (PAT) for GHCR

1. Go to: https://github.com/settings/tokens/new
2. Token name:  `ott-ghcr-access`
3. Expiration:  No expiration (or 1 year — set a reminder to rotate)
4. Scopes:      `write:packages`, `read:packages`, `delete:packages` (optional, for cleanup)
5. Click **"Generate token"** — COPY IT IMMEDIATELY (shown only once)

## STEP 6 — Add GitHub Actions Secrets to your repository

Go to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions**
Click **"New repository secret"** for each:

| Secret Name | Value |
|-------------|-------|
| `GHCR_PAT` | The PAT you generated in Step 5 |
| `PROD_SERVER_HOST` | Your Server public IP (e.g. 54.123.45.67) |
| `PROD_SERVER_USER` | Administrator (or your Windows username) |
| `PROD_SERVER_SSH_KEY` | Full content of your private SSH key |
| `PROD_SERVER_PORT` | `22` |

## STEP 7 — Pre-pull GHCR images on the server (first-time auth test)

On the server (CMD or PowerShell), log in to GHCR manually (one-time):
*(Replace YOUR_PAT with your actual PAT)*
```powershell
docker login ghcr.io -u Vishhh2125 -p YOUR_PAT
```

Test pull (do this AFTER first CI run pushes the images):
```powershell
docker pull ghcr.io/vishhh2125/ott-backend:latest
docker pull ghcr.io/vishhh2125/ott-admin:latest
```

## STEP 8 — Start the full stack (first manual run)

```powershell
cd C:\ott-platform

# Pull all images (public + GHCR)
docker compose -f docker-compose.prod.yml pull

# Start everything in detached mode
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# Watch logs (Ctrl+C to stop watching)
docker compose -f docker-compose.prod.yml logs -f backend
```

## STEP 9 — Trigger your first automated deployment

Simply push any commit to the main branch:
```bash
git add .
git commit -m "chore: configure deployment for Windows server"
git push origin main
```

Then watch the workflow run on GitHub Actions.

## USEFUL COMMANDS — Day-to-day server operations

View running containers:
```powershell
docker compose -f docker-compose.prod.yml ps
```

View logs for a specific service:
```powershell
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f worker
```

Manually restart a single service:
```powershell
docker compose -f docker-compose.prod.yml restart backend
```

Nuclear cleanup (removes ALL stopped containers + unused images):
```powershell
docker system prune -af
```
