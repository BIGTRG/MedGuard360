# Reverse-proxy snippets

The on-prem stack binds only `127.0.0.1:8090` (configurable via
`MEDGUARD_GATEWAY_PORT`). Your existing host-level reverse proxy fronts it
with TLS and your domain.

Pick the file that matches your reverse proxy:

| File | When to use |
|------|-------------|
| `nginx.conf`  | Most common Linux servers |
| `Caddyfile`   | Auto-TLS, simpler config |

Either drops into your existing config — search for `← change this` and
update the hostname.

## Traefik (Docker labels) — if your other containers use Traefik

If your existing services route through Traefik on the same Docker network,
add to the `nginx:` service block in `docker-compose.onprem.yml`:

```yaml
  nginx:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.medguard.rule=Host(`medguard360.geniuseye.ai`)"
      - "traefik.http.routers.medguard.entrypoints=websecure"
      - "traefik.http.routers.medguard.tls.certresolver=letsencrypt"
      - "traefik.http.services.medguard.loadbalancer.server.port=80"
    networks:
      - default
      - traefik    # whatever your existing Traefik network is called
```

(And remove the `ports:` block so Traefik handles routing.)

## HAProxy — minimal config

```
backend medguard360
    server gateway 127.0.0.1:8090 check

frontend https-in
    bind *:443 ssl crt /etc/haproxy/certs/medguard360.pem
    acl is_medguard hdr(host) -i medguard360.geniuseye.ai
    use_backend medguard360 if is_medguard
```
