# PBO Kost

## Run development with Nx

Install workspace dependencies once:

```sh
npm install
```

Run the frontend, backend, and notification worker together:

```sh
npm run dev
```

Run only the website applications:

```sh
npm run dev:website
```

Run only the Zapo.js notification worker:

```sh
npm run dev:notification
```

Nx project names are `frontend`, `backend`, and `notification`. The backend
connects to the local notification worker through
`NOTIFICATION_WS_URL=ws://localhost:4000` in its development environment.

## Run in development

Copy the environment examples:

```sh
cp website/frontend/.env.development.example website/frontend/.env.development
cp website/backend/.env.development.example website/backend/.env.development
cp notification/.env.development.example notification/.env.development
```

Start the development stack with Vite and TypeScript watch mode:

```sh
docker compose -f docker-compose.dev.yml up --build
```

The application is available at `http://localhost:8080`.

## Run in production

Create a `.env` file in the repository root with a non-default JWT secret:

```env
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-admin-password
```

Start the frontend, backend, notification service, Nginx reverse proxy, and
MongoDB:

```sh
docker compose up --build
```

The application is available at `http://localhost:8080` by default. Set
`HTTP_PORT` in `.env` to use a different host port.

Nginx routes requests as follows:

- `/` -> the React frontend
- `/api/` -> the website backend

The notification service is not a frontend API. The backend connects to it
over an internal WebSocket at `ws://notification:4000`. The notification
service owns the Zapo.js WhatsApp session and sends:

- H-7 and due-date reminders to customers for unpaid invoices
- Payment-received notifications to the boarding-house owner

Scan the QR code printed by the notification container on its first start.
The current in-memory Zapo store requires pairing again after the notification
container is recreated; configure a persistent Zapo store before relying on
the service in production.

## Dashboards and payments

- `/dashboard/customer` provides the responsive customer bill and payment view.
- `/dashboard/customer/payment` provides QRIS, Virtual Account, and cash options.
- `/dashboard/owner` provides the responsive occupant and recap view.

Set `MIDTRANS_ENVIRONMENT` to `sandbox` or `production` and configure the
matching `MIDTRANS_SERVER_KEY` in the backend environment. Midtrans callbacks
must target `/api/v1/payment/callback`. Online payments are marked paid only
for Midtrans `settlement` or `capture` callbacks. Cash payments stay pending
until an owner confirms them.

The administrator email is configured with `ADMIN_EMAIL`. Set the actual
`ADMIN_PASSWORD` only in the local or deployment environment file; do not
commit the password to the repository.

MongoDB data is stored in the named `mongodb-data` volume.
