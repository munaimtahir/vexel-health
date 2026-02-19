# Caddy Fix Report — vexel.alshifalab.pk

Date: 2026-02-19
Owner: Platform (single-agent execution)

## Scope
- Restore domain serving for `vexel.alshifalab.pk`.
- Fix brittle logging configuration that depended on file paths under `/home/munaim/...`.
- Validate + reload Caddy safely without breaking other sites.

## B0 Discovery (no changes)
Commands run:

```bash
sudo caddy version
sudo caddy validate --config /home/munaim/srv/proxy/caddy/Caddyfile
sudo systemctl status caddy --no-pager -l
sudo journalctl -u caddy -n 200 --no-pager
sudo caddy fmt --diff --config /home/munaim/srv/proxy/caddy/Caddyfile
```

Key findings:
- Caddy version: `v2.10.2`.
- `validate` passed for `/home/munaim/srv/proxy/caddy/Caddyfile`.
- Active systemd service reload command uses `/etc/caddy/Caddyfile`.
- `vexel.alshifalab.pk` block existed in `/home/.../Caddyfile` but was missing from active `/etc/caddy/Caddyfile`.
- File logging was configured under `/home/munaim/srv/proxy/caddy/logs/*` (permission-sensitive path for service user `caddy`).

## Root Cause
The running Caddy process used `/etc/caddy/Caddyfile`, which did not include `vexel.alshifalab.pk`; therefore TLS/site routing for Vexel was not consistently available. Logging also relied on file output under `/home/...`, which is more fragile than journald for service reload/restart behavior.

## B1/B2 Fix Applied
1. Edited source Caddyfile at `/home/munaim/srv/proxy/caddy/Caddyfile`.
2. Switched logging output to journald/stdout (`output stdout`) for default logger and `std_log` snippet.
3. Synced updated source file to active `/etc/caddy/Caddyfile`.
4. Validated config before and after install.
5. Reloaded Caddy and verified service health and domain routing.

### Before snippet
```caddy
{
    email munaim.tahir@gmail.com
    log {
        output file /home/munaim/srv/proxy/caddy/logs/error.log
        format json
    }
}

(std_log) {
    log {
        output file /home/munaim/srv/proxy/caddy/logs/access.log
        format json
    }
}
```

### After snippet
```caddy
{
    email munaim.tahir@gmail.com
    log {
        output stdout
        format json
    }
}

(std_log) {
    log {
        output stdout
        format json
    }
}
```

### Vexel site block in active config
```caddy
vexel.alshifalab.pk {
    encode zstd gzip

    handle_path /api/* {
        reverse_proxy 127.0.0.1:3000
    }

    handle_path /pdf/* {
        reverse_proxy 127.0.0.1:5000
    }

    handle {
        reverse_proxy 127.0.0.1:3001
    }
}
```

## Validation + Reload Commands
```bash
sudo caddy validate --config /home/munaim/srv/proxy/caddy/Caddyfile
sudo install -m 0644 -o root -g root /home/munaim/srv/proxy/caddy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager -l
sudo journalctl -u caddy -n 120 --no-pager
```

Result:
- Validation passed before and after install.
- Reload succeeded (`status=0/SUCCESS`).
- Logs confirm active TLS management includes `vexel.alshifalab.pk` and certificate obtained successfully.

## Reachability Evidence
Commands:

```bash
curl -I http://vexel.alshifalab.pk/
curl -I https://vexel.alshifalab.pk/
curl -I https://vexel.alshifalab.pk/api/health
curl -sS https://vexel.alshifalab.pk/api/health
curl -sS https://vexel.alshifalab.pk/pdf/health
```

Observed:
- `http://vexel.alshifalab.pk/` -> `308` redirect to HTTPS.
- `https://vexel.alshifalab.pk/` -> `200`.
- `https://vexel.alshifalab.pk/api/health` -> `200`.
- `GET https://vexel.alshifalab.pk/api/health` body: `{"status":"ok","service":"api"}`.
- `GET https://vexel.alshifalab.pk/pdf/health` body: `{"status":"ok"}`.

## Backups / Reversibility
- Source backup created:
  - `/home/munaim/srv/proxy/caddy/Caddyfile.bak.20260219T005236Z`
- Active config backup created:
  - `/etc/caddy/Caddyfile.bak.20260219T005236Z`

Rollback:

```bash
sudo install -m 0644 -o root -g root /etc/caddy/Caddyfile.bak.20260219T005236Z /etc/caddy/Caddyfile
sudo systemctl reload caddy
```
