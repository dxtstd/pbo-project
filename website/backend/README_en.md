# PBO Kost Backend

The PBO Kost backend is a TypeScript Express API for authentication, room and
occupant management, invoices, transactions, payments, and WhatsApp
notification integration.

**Language:** [Bahasa Indonesia (primary)](README.md) | English  
Workspace documentation: [main README](../../README.md)

## Features

- JWT authentication for admins, owners, and customers.
- Role-based route authorization.
- Owner, customer, room, invoice, and transaction management.
- Cash payments and Midtrans online payments.
- Midtrans callbacks for transaction status updates.
- PDF invoice generation with Puppeteer.
- Automatic invoice reminders.
- WhatsApp notification templates and preferences.
- HTTP notification bridge with a WebSocket fallback.
- Development data seeding and MongoDB persistence through Mongoose.
- Structured logging with Pino.

## Technology

- Node.js
- Express 5
- TypeScript and `tsx`
- MongoDB and Mongoose
- JWT and bcrypt
- Midtrans
- Puppeteer
- WebSocket (`ws`)
- Pino

## Source Structure

```text
src/
├── class/              # PBO domain classes and business behavior
├── config/             # Environment configuration
├── infrastructure/     # Database connection and development seed
├── jobs/               # Invoice reminder jobs
├── middlewares/        # JWT authentication and role authorization
├── models/             # Mongoose schemas and models
├── routes/api/v1/      # HTTP API routes
├── services/           # Invoice, payment, PDF, and notification services
├── utils/              # Logger, phone, and identifier utilities
├── app.ts              # Express app and middleware
└── index.ts            # Server entry point
```

## Main Endpoints

All API endpoints use the `/api/v1` prefix except for the health check.

| Prefix/endpoint | Description | Access |
| --- | --- | --- |
| `GET /health` | Server health check | Public |
| `POST /api/v1/auth/login` | Admin, owner, or customer login | Public |
| `GET /api/v1/auth/me` | Current authenticated user profile | JWT |
| `GET /api/v1/site-content` | Landing page content | Public |
| `/api/v1/dashboard/customer` | Customer bills, transactions, PDFs, and extensions | Customer |
| `/api/v1/dashboard/owner` | Owner rooms, customers, payments, recaps, and notifications | Owner |
| `/api/v1/admin` | Owner, content, template, and data-reset management | Admin |
| `/api/v1/payment/cash` | Cash payment requests and confirmations | JWT |
| `/api/v1/payment/charge` | Create a Midtrans online payment | Customer |
| `POST /api/v1/payment/callback` | Midtrans payment callback | Midtrans |

Authenticated endpoints use this header:

```http
Authorization: Bearer <jwt>
```

## Models and Relationships

Business IDs are used for application-compatible relationships:

- **Owner 1:N Room** — one owner manages multiple rooms.
- **Customer 1:N Room** — a customer may have room history; an active room is
  marked with `customerId` and `isOccupied`.
- **Customer 1:N Invoice** — each invoice belongs to one customer.
- **Room 1:N Invoice** — each invoice belongs to one room.
- **Customer 1:N Transaction** and **Room 1:N Transaction** — transactions
  record a customer's payment for a specific room.
- **Invoice 1:N Transaction** — an invoice may have multiple payment attempts.

Mongoose virtual relationships can be loaded with `populate()`:

```ts
const customer = await Customer.findOne({ customerId }).populate([
  "rooms",
  "invoices",
  "transactions",
]);
```

Domain classes are exported from the `src/class` barrel:

```ts
import { Customer, Invoice, Room, Transaction } from "./class";

const customer = new Customer("C001", "budi", "Budi", "Santoso", "08123456789");
const room = new Room({
  roomId: "R001",
  name: "Room 1",
  type: "standard",
  price: 350000,
});
room.assignCustomer(customer);

const invoice = new Invoice("INV-001", customer, room, room.calculatePrice(), new Date());
invoice.pay();
const transaction = new Transaction(
  "TRX-001",
  customer,
  room,
  invoice.getAmount(),
  "QRIS",
  invoice,
);
```

Domain classes separate business behavior from database schemas: `Room` manages
occupancy and pricing, `Invoice` manages payment status, and `Transaction`
stores payment summaries.

## Environment Configuration

Copy `.env.development.example` to `.env.development`:

```env
NODE_ENV=development
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/kost_db
JWT_SECRET=replace-with-a-development-secret
LOG_LEVEL=debug
NOTIFICATION_WS_URL=ws://localhost:4000
MIDTRANS_ENVIRONMENT=sandbox
MIDTRANS_SERVER_KEY=your-midtrans-sandbox-server-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-admin-password
ADMIN_EMAIL=admin@example.com
```

Optional `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` settings can be used for RSA
SHA-256 signing. Use escaped newlines (`\n`) when storing keys in environment
files.

For production, use a long random JWT secret and a strong admin password. Do
not commit `.env` files or Midtrans credentials.

## Local Development

From the repository root:

```sh
npm install
npm run dev:website
```

Or from the backend directory:

```sh
npm install
npm run dev
```

The server runs at `http://localhost:3000`. MongoDB and the notification worker
must be available when using payment or notification features.

## Running with Docker

Development:

```sh
docker compose -f ../../docker-compose.dev.yml up --build backend
```

Production runs together with the frontend, notification worker, Nginx, and
MongoDB:

```sh
docker compose up --build
```

The production backend is available through the reverse proxy under `/api/`.
The container health check uses `GET /health`.

## Commands

```sh
npm run dev    # Run the backend with tsx watch
```

For payment configuration, set `MIDTRANS_ENVIRONMENT` to `sandbox` or
`production` and provide the matching `MIDTRANS_SERVER_KEY`. Online payments
are considered successful only after a `settlement` or `capture` callback.
