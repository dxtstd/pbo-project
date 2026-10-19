# pbo-kost-notif

The notification service listens on port `4000` by default. Its health endpoint
is available at `/health`; when deployed with the root Compose stack, it is
reachable through the Nginx reverse proxy at `/notification/`.
