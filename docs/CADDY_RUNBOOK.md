# Caddy Runbook

## Validate and Reload Safely
1. Validate source config first.

```bash
sudo caddy validate --config /home/munaim/srv/proxy/caddy/Caddyfile
```

2. Install source config to the active systemd location.

```bash
sudo install -m 0644 -o root -g root /home/munaim/srv/proxy/caddy/Caddyfile /etc/caddy/Caddyfile
```

3. Validate active config.

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

4. Reload service.

```bash
sudo systemctl reload caddy
```

5. Confirm service status and recent logs.

```bash
sudo systemctl status caddy --no-pager -l
sudo journalctl -u caddy -n 120 --no-pager
```

6. Verify target site and routes.

```bash
curl -I https://vexel.alshifalab.pk/
curl -I https://vexel.alshifalab.pk/api/health
curl -sS https://vexel.alshifalab.pk/api/health
```

## Common Permission Pitfalls
- Caddy service user is `caddy`; path traversal to log files under user home directories can fail on restart/reload.
- File-based logs under `/home/<user>/...` are fragile unless directory ACLs are explicitly correct for `caddy`.
- Safer default under systemd: `log { output stdout }` and inspect logs via journald.

## Where Logs Live
- Preferred operational logs:

```bash
sudo journalctl -u caddy -f
```

- If file logs are required instead of journald:
  - Use `/var/log/caddy/...`
  - Ensure ownership and permissions:

```bash
sudo mkdir -p /var/log/caddy
sudo chown -R caddy:caddy /var/log/caddy
sudo chmod 750 /var/log/caddy
```

## Quick Rollback
If the latest change breaks routing:

```bash
sudo install -m 0644 -o root -g root /etc/caddy/Caddyfile.bak.<timestamp> /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```
