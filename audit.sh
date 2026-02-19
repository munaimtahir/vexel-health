#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d_%H%M)"
OUT="${HOME}/vps_audit_${TS}"
EV="${OUT}/evidence/vps"
mkdir -p "${EV}"

log() { echo "[audit] $*"; }

log "Writing evidence to: ${OUT}"

# A) Host identity
{
  echo "whoami: $(whoami)"
  echo "id: $(id)"
  echo
  uname -a
  echo
  lsb_release -a 2>/dev/null || true
  echo
  date
} > "${EV}/ssh_whoami_uname.txt" 2>&1

df -h > "${EV}/df_free.txt" 2>&1 || true
free -h > "${EV}/free_mem.txt" 2>&1 || true

# B) Paths + naming hygiene
{
  echo "=== /home/munaim/srv ==="
  ls -la /home/munaim/srv 2>/dev/null || true
  echo
  echo "=== /home/munaim/srv/apps ==="
  ls -la /home/munaim/srv/apps 2>/dev/null || true
  echo
  echo "=== /home/munaim/srv/proxy ==="
  ls -la /home/munaim/srv/proxy 2>/dev/null || true
  echo
  echo "=== Expected Caddyfile ==="
  ls -la /home/munaim/srv/proxy/caddy/Caddyfile 2>/dev/null || true
} > "${EV}/vps_paths_ls.txt" 2>&1

# detect old name "monorepo"
{
  echo "Searching for folder names matching monorepo under /home/munaim/srv/apps ..."
  find /home/munaim/srv/apps -maxdepth 2 -type d -iname "*monorepo*" 2>/dev/null || true
} > "${EV}/find_monorepo_refs.txt" 2>&1

# C) Git identity (if the deployed app is a working tree)
APP="/home/munaim/srv/apps/vexel-health"
if [ -d "${APP}" ]; then
  {
    echo "APP=${APP}"
    if [ -d "${APP}/.git" ]; then
      cd "${APP}"
      echo "remote:"
      git remote -v || true
      echo
      echo "branch:"
      git rev-parse --abbrev-ref HEAD || true
      echo
      echo "sha:"
      git rev-parse HEAD || true
      echo
      echo "status:"
      git status --porcelain || true
      echo
      echo "log head:"
      git log -n 20 --oneline || true
    else
      echo "No .git directory found at ${APP} (may be image-only deploy)."
    fi
  } > "${EV}/git_identity.txt" 2>&1
else
  echo "Expected app dir not found: ${APP}" > "${EV}/git_identity.txt"
fi

# D) Docker status
docker ps --no-trunc > "${EV}/docker_ps.txt" 2>&1 || true

# Compose discovery: look for docker-compose.yml / compose.yml under /home/munaim/srv/apps/vexel-health
{
  echo "Searching for compose files under ${APP} ..."
  find "${APP}" -maxdepth 3 -type f \( -iname "docker-compose.yml" -o -iname "compose.yml" -o -iname "docker-compose.yaml" -o -iname "compose.yaml" \) 2>/dev/null || true
} > "${EV}/compose_discovery.txt" 2>&1

# If compose exists, run compose commands from that directory (best-effort)
COMPOSE_DIR=""
if [ -d "${APP}" ]; then
  COMPOSE_DIR="$(find "${APP}" -maxdepth 3 -type f \( -iname "docker-compose.yml" -o -iname "compose.yml" -o -iname "docker-compose.yaml" -o -iname "compose.yaml" \) 2>/dev/null | head -n 1 | xargs -r dirname || true)"
fi

if [ -n "${COMPOSE_DIR}" ] && [ -d "${COMPOSE_DIR}" ]; then
  log "Compose directory detected: ${COMPOSE_DIR}"
  (
    cd "${COMPOSE_DIR}"
    docker compose ps > "${EV}/compose_ps.txt" 2>&1 || true
    docker compose config > "${EV}/compose_config.txt" 2>&1 || true
    docker compose logs --since 2h api    > "${EV}/compose_logs_api.txt"    2>&1 || true
    docker compose logs --since 2h web    > "${EV}/compose_logs_web.txt"    2>&1 || true
    docker compose logs --since 2h pdf    > "${EV}/compose_logs_pdf.txt"    2>&1 || true
    docker compose logs --since 2h worker > "${EV}/compose_logs_worker.txt" 2>&1 || true
  )
else
  echo "No compose file detected under ${APP} (skipped docker compose checks)." > "${EV}/compose_ps.txt"
  echo "No compose file detected under ${APP} (skipped docker compose checks)." > "${EV}/compose_config.txt"
fi

# E) Ports / exposure
ss -lntp > "${EV}/ss_listen.txt" 2>&1 || true

# F) Caddy active config path + snippet
{
  echo "systemctl status caddy:"
  systemctl status caddy --no-pager || true
  echo
  echo "systemctl cat caddy:"
  systemctl cat caddy --no-pager || true
} > "${EV}/caddy_service_status.txt" 2>&1

# Attempt to infer active config path from systemd unit (look for --config)
{
  systemctl cat caddy --no-pager | sed -n '1,200p' | grep -E -- '--config|Caddyfile' || true
  echo
  echo "Expected path exists?"
  ls -la /home/munaim/srv/proxy/caddy/Caddyfile 2>/dev/null || true
  echo
  echo "Default path exists?"
  ls -la /etc/caddy/Caddyfile 2>/dev/null || true
} > "${EV}/caddy_active_config_path.txt" 2>&1

# Capture a safe snippet of the intended Caddyfile (first 200 lines) WITHOUT secrets
# (Assumes Caddyfile should not contain secrets; still we limit output)
if [ -f /home/munaim/srv/proxy/caddy/Caddyfile ]; then
  sed -n '1,200p' /home/munaim/srv/proxy/caddy/Caddyfile > "${EV}/caddyfile_snippet.txt" 2>&1 || true
else
  echo "Missing: /home/munaim/srv/proxy/caddy/Caddyfile" > "${EV}/caddyfile_snippet.txt"
fi

# Caddy logs tail (best-effort; may vary by setup)
journalctl -u caddy -n 200 --no-pager > "${EV}/caddy_logs_tail.txt" 2>&1 || true

# G) Health checks (internal + external) — best-effort, won’t fail script
{
  echo "Internal checks (localhost/127.0.0.1) — adjust ports if different"
  echo
  echo "API /health:"
  curl -fsS -D - http://127.0.0.1:4000/health -o /dev/null || true
  echo
  echo "PDF /health:"
  curl -fsS -D - http://127.0.0.1:4010/health -o /dev/null || true
  echo
  echo "WEB /:"
  curl -fsS -D - http://127.0.0.1:3000/ -o /dev/null || true
} > "${EV}/curl_health_internal.txt" 2>&1

{
  echo "External checks via domain (requires DNS + Caddy routing)"
  echo
  echo "https://vexel.alshifalab.pk/:"
  curl -kfsS -D - https://vexel.alshifalab.pk/ -o /dev/null || true
  echo
  echo "https://vexel.alshifalab.pk/api/health:"
  curl -kfsS -D - https://vexel.alshifalab.pk/api/health -o /dev/null || true
  echo
  echo "https://vexel.alshifalab.pk/pdf/health:"
  curl -kfsS -D - https://vexel.alshifalab.pk/pdf/health -o /dev/null || true
} > "${EV}/curl_health_external.txt" 2>&1

# H) Env hygiene (names only, no contents)
{
  echo "Listing env-like files (names only) under ${APP}"
  find "${APP}" -maxdepth 3 -type f \( -iname ".env" -o -iname ".env.*" -o -iname "*env*" \) 2>/dev/null || true
} > "${EV}/env_files_list.txt" 2>&1

# Basic secrets scan summary (no printing file contents)
# We only report filenames + match counts for common token patterns (best-effort)
{
  echo "Secrets scan summary (best-effort, filenames only):"
  if command -v rg >/dev/null 2>&1; then
    rg -n --hidden --no-ignore-vcs \
      -S "(API_KEY|SECRET|PASSWORD|TOKEN|PRIVATE_KEY|BEGIN RSA|BEGIN OPENSSH)" \
      "${APP}" 2>/dev/null \
      | sed -E 's/:.*$/:<redacted>/' \
      | head -n 200 || true
  else
    echo "ripgrep (rg) not installed; skipped."
  fi
} > "${EV}/secrets_scan_summary.txt" 2>&1

# Bundle outputs
tar -czf "${HOME}/vps_audit_${TS}.tar.gz" -C "${OUT}" . >/dev/null 2>&1 || true
log "Done."
log "Bundle created: ${HOME}/vps_audit_${TS}.tar.gz"
