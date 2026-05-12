#!/usr/bin/env bash
# Idempotent setup for a fresh Ubuntu 22.04 droplet.
# Installs Docker, FFmpeg, Node, common fonts and the studio repo skeleton.
# Re-running is safe — every step checks before installing.

set -euo pipefail
log() { printf "\n\033[1;36m[setup]\033[0m %s\n" "$*"; }

STUDIO_ROOT="${STUDIO_ROOT:-/opt/studio}"

# -- 1. apt baseline -----------------------------------------------------------
log "Updating apt cache"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg lsb-release git ffmpeg \
  fonts-dejavu fonts-noto fontconfig unzip jq

# -- 2. Docker (official repo) -------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker engine + compose plugin"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

# -- 3. Node 20 (for the oauth helper + local tooling) -------------------------
if ! command -v node >/dev/null 2>&1; then
  log "Installing Node 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# -- 4. Studio dirs ------------------------------------------------------------
log "Preparing ${STUDIO_ROOT}"
mkdir -p "${STUDIO_ROOT}"/{secrets,media/{queue/sora,shots,voice,music,episodes},out,fonts,_data}
chmod 750 "${STUDIO_ROOT}/secrets"

# -- 5. Helpful sysctl knobs ---------------------------------------------------
log "Tuning kernel for FFmpeg/Playwright"
cat >/etc/sysctl.d/99-studio.conf <<EOF
vm.swappiness=10
fs.inotify.max_user_watches=524288
EOF
sysctl --system >/dev/null

# -- 6. Auto-upgrade unattended security patches -------------------------------
DEBIAN_FRONTEND=noninteractive apt-get install -y unattended-upgrades
dpkg-reconfigure -fnoninteractive unattended-upgrades

log "Done. Next: drop your .env into ${STUDIO_ROOT}/.env and run: docker compose up -d"
