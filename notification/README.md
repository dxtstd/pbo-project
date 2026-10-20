# pbo-kost-notif

The notification service listens on port `4000` by default. Its health endpoint
is available at `/health`; when deployed with the root Compose stack, it is
reachable through the Nginx reverse proxy at `/notification/`.

## Persistent WhatsApp session

Zapo stores its authentication state in `/app/.auth/state.sqlite`. The
production Compose file mounts this directory to the named `zapo-auth` volume,
so restarting or recreating the notification container does not require
pairing again.

The owner notification settings expose two controls:

- **Disconnect** closes the current connection while preserving the saved
  session.
- **Pairing ulang** logs out and clears the saved session, then starts a fresh
  QR pairing flow.

The notification service keeps its internal Docker hostname (`notification`)
for backend requests. Nginx also proxies `/notification/` to that service
instead of targeting a container IP, so changing container IPs does not make
the reverse proxy stale.

The notification Docker images install Python, Make, and g++ because
`better-sqlite3` may fall back to compiling through `node-gyp` when its
prebuilt binary is unavailable. Python 3 is configured explicitly for npm.
Dependency installation uses the lockfile, and Docker can reuse the dependency
layer whenever the package manifests are unchanged.
