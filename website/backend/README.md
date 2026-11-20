# Backend PBO Kost

Backend PBO Kost adalah API Express berbasis TypeScript untuk autentikasi,
manajemen kamar dan penghuni, invoice, transaksi, pembayaran, serta integrasi
notifikasi WhatsApp.

**Bahasa:** Indonesia (utama) | [English](README_en.md)
Dokumentasi workspace: [README utama](../../README.md)

## Fitur

- Autentikasi admin, owner, dan customer menggunakan JWT.
- Otorisasi route berdasarkan peran pengguna.
- Manajemen owner, customer, kamar, invoice, dan transaksi.
- Pembayaran cash dan pembayaran online melalui Midtrans.
- Callback Midtrans untuk memperbarui status transaksi.
- Pembuatan invoice PDF menggunakan Puppeteer.
- Pengingat invoice otomatis.
- Template dan preferensi notifikasi WhatsApp.
- Bridge HTTP dengan fallback WebSocket ke worker notifikasi.
- Seed data development dan penyimpanan MongoDB melalui Mongoose.
- Logging terstruktur menggunakan Pino.

## Teknologi

- Node.js
- Express 5
- TypeScript dan `tsx`
- MongoDB dan Mongoose
- JWT dan bcrypt
- Midtrans
- Puppeteer
- WebSocket (`ws`)
- Pino

## Struktur Source

```text
src/
├── class/              # Class domain PBO dan business behavior
├── config/             # Pembacaan konfigurasi environment
├── infrastructure/     # Koneksi database dan seed development
├── jobs/               # Job pengingat invoice
├── middlewares/        # JWT authentication dan role authorization
├── models/             # Schema dan model Mongoose
├── routes/api/v1/      # Route HTTP API
├── services/           # Invoice, pembayaran, PDF, dan notifikasi
├── utils/              # Logger, nomor telepon, dan identifier
├── app.ts              # Express app dan middleware
└── index.ts            # Entry point server
```

## Endpoint Utama

Semua endpoint API berada di bawah prefix `/api/v1`, kecuali health check.

| Prefix/endpoint | Keterangan | Akses |
| --- | --- | --- |
| `GET /health` | Health check server | Publik |
| `POST /api/v1/auth/login` | Login admin, owner, atau customer | Publik |
| `GET /api/v1/auth/me` | Profil pengguna yang sedang login | JWT |
| `GET /api/v1/site-content` | Konten halaman landing | Publik |
| `/api/v1/dashboard/customer` | Tagihan, transaksi, PDF, dan perpanjangan customer | Customer |
| `/api/v1/dashboard/owner` | Kamar, customer, pembayaran, rekap, dan notifikasi owner | Owner |
| `/api/v1/admin` | Pengelolaan owner, konten, template, dan reset data | Admin |
| `/api/v1/payment/cash` | Request dan konfirmasi pembayaran cash | JWT |
| `/api/v1/payment/charge` | Membuat pembayaran online Midtrans | Customer |
| `POST /api/v1/payment/callback` | Callback status pembayaran Midtrans | Midtrans |

Endpoint yang membutuhkan autentikasi menggunakan header:

```http
Authorization: Bearer <jwt>
```

## Model dan Relasi

Relasi menggunakan ID bisnis agar kompatibel dengan data aplikasi:

- **Owner 1:N Room** — satu owner mengelola banyak kamar.
- **Customer 1:N Room** — customer dapat memiliki riwayat beberapa kamar;
  kamar aktif ditandai dengan `customerId` dan `isOccupied`.
- **Customer 1:N Invoice** — setiap invoice dimiliki satu customer.
- **Room 1:N Invoice** — setiap invoice terkait satu kamar.
- **Customer 1:N Transaction** dan **Room 1:N Transaction** — transaksi
  menyimpan pembayaran customer untuk kamar tertentu.
- **Invoice 1:N Transaction** — satu invoice dapat memiliki beberapa riwayat
  percobaan pembayaran.

Virtual relation Mongoose dapat digunakan melalui `populate()`:

```ts
const customer = await Customer.findOne({ customerId }).populate([
  "rooms",
  "invoices",
  "transactions",
]);
```

Class domain tersedia melalui barrel `src/class`:

```ts
import { Customer, Invoice, Room, Transaction } from "./class";

const customer = new Customer("C001", "budi", "Budi", "Santoso", "08123456789");
const room = new Room({
  roomId: "R001",
  name: "Kamar 1",
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

Class domain memisahkan business behavior dari schema database: `Room`
mengelola okupansi dan harga, `Invoice` mengelola status pembayaran, dan
`Transaction` menyimpan ringkasan pembayaran.

## Konfigurasi Environment

Salin `.env.development.example` menjadi `.env.development`:

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

Konfigurasi opsional `JWT_PRIVATE_KEY` dan `JWT_PUBLIC_KEY` dapat digunakan
untuk penandatanganan RSA SHA-256. Gunakan escaped newline (`\n`) bila
disimpan di file environment.

Pada production, gunakan secret JWT yang panjang dan password admin yang kuat.
Jangan commit file `.env` atau kredensial Midtrans.

## Menjalankan Secara Lokal

Dari root repository:

```sh
npm install
npm run dev:website
```

Atau dari direktori backend:

```sh
npm install
npm run dev
```

Server berjalan pada `http://localhost:3000`. Pastikan MongoDB dan worker
notifikasi tersedia jika fitur pembayaran atau notifikasi sedang digunakan.

## Menjalankan dengan Docker

Development:

```sh
docker compose -f ../../docker-compose.dev.yml up --build backend
```

Production dijalankan bersama frontend, notification worker, Nginx, dan
MongoDB:

```sh
docker compose up --build
```

Backend production tersedia melalui reverse proxy pada prefix `/api/`.
Health check container menggunakan `GET /health`.

## Perintah

```sh
npm run dev    # Menjalankan backend dengan tsx watch
```

Untuk konfigurasi pembayaran, set `MIDTRANS_ENVIRONMENT` ke `sandbox` atau
`production` dan gunakan `MIDTRANS_SERVER_KEY` yang sesuai. Pembayaran online
dianggap berhasil hanya setelah callback `settlement` atau `capture`.
