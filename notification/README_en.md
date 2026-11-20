# PBO Kost Notification Worker

The notification worker connects the PBO Kost backend to WhatsApp through
Zapo.js. It receives events from the backend over WebSocket and sends messages
to customers or owners.

**Language:** [Bahasa Indonesia (primary)](README.md) | English  
Workspace documentation: [main README](../README.md)

## Responsibilities

- Store WhatsApp authentication sessions in SQLite.
- Display a QR code for initial pairing.
- Send notifications for new invoices, H-7/due-date reminders, cash payment
  requests, successful payments, and extension requests.
- Provide status, pairing, disconnect, and notification test endpoints.
- Receive automatic events from the backend over an internal WebSocket.

## HTTP Endpoints

The worker listens on port `4000` by default:

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Service health check |
| `GET` | `/status` | Connection status and pairing QR |
| `POST` | `/pair` | Clear the session and start new pairing |
| `POST` | `/disconnect` | Disconnect without clearing the session |
| `POST` | `/test` | Send a test message with `recipient` and `message` |
| `POST` | `/event` | Receive notification events from the backend |

These endpoints are used by the backend and owner dashboard. Do not expose the
worker directly to the internet without additional security controls.

## Environment Configuration

Copy `.env.development.example` to `.env.development`:

```env
NODE_ENV=development
PORT=4000
ZAPO_SESSION_ID=kost-notification-dev
LOG_LEVEL=debug
ZAPO_STORE_PATH=.auth/state.sqlite
```

- `ZAPO_SESSION_ID` identifies the WhatsApp session.
- `ZAPO_STORE_PATH` is the location for authentication credentials and session
  state.
- `LOG_LEVEL` controls log verbosity.

Do not commit the `.auth` directory or session SQLite files.

## Local Development

From the repository root:

```sh
npm install
npm run dev:notification
```

Or from this directory:

```sh
npm install
npm run dev
```

When the worker starts for the first time, scan the QR code printed in the
terminal. After pairing, the session is stored at `ZAPO_STORE_PATH`.

## Running with Docker

Development:

```sh
docker compose -f ../docker-compose.dev.yml up --build notification
```

Production runs together with the complete stack:

```sh
docker compose up --build
```

The production Compose setup mounts the `zapo-auth` volume at `/app/.auth`, so
recreating the container does not require pairing again.

## Commands

```sh
npm run dev    # Worker with tsx watch
npm run start  # Run the worker without watch mode
```

`better-sqlite3` may require Python, Make, and g++ when a prebuilt binary is
unavailable. The worker Dockerfile includes these build requirements.
