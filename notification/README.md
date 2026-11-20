# Worker Notifikasi PBO Kost

Worker notifikasi bertugas menghubungkan backend PBO Kost dengan WhatsApp
melalui Zapo.js. Worker menerima event dari backend melalui WebSocket dan
mengirim pesan kepada customer atau owner.

**Bahasa:** Indonesia (utama) | [English](README_en.md)
Dokumentasi workspace: [README utama](../README.md)

## Tanggung Jawab

- Menyimpan sesi autentikasi WhatsApp pada SQLite.
- Menampilkan QR code untuk pairing awal.
- Mengirim notifikasi invoice baru, pengingat H-7/jatuh tempo, permintaan
  pembayaran cash, pembayaran berhasil, dan permintaan perpanjangan.
- Menyediakan endpoint untuk status, pairing ulang, disconnect, dan pengujian
  notifikasi.
- Menerima event otomatis dari backend melalui WebSocket internal.

## Endpoint HTTP

Worker berjalan pada port `4000` secara default:

| Method | Path | Keterangan |
| --- | --- | --- |
| `GET` | `/health` | Health check service |
| `GET` | `/status` | Status koneksi dan QR pairing |
| `POST` | `/pair` | Hapus sesi dan mulai pairing baru |
| `POST` | `/disconnect` | Putuskan koneksi tanpa menghapus sesi |
| `POST` | `/test` | Kirim pesan uji dengan payload `recipient` dan `message` |
| `POST` | `/event` | Terima event notifikasi dari backend |

Endpoint tersebut digunakan oleh backend dan dashboard owner. Jangan
mengekspos worker secara langsung ke internet tanpa pengamanan tambahan.

## Konfigurasi Environment

Salin `.env.development.example` menjadi `.env.development`:

```env
NODE_ENV=development
PORT=4000
ZAPO_SESSION_ID=kost-notification-dev
LOG_LEVEL=debug
ZAPO_STORE_PATH=.auth/state.sqlite
```

- `ZAPO_SESSION_ID` membedakan sesi WhatsApp.
- `ZAPO_STORE_PATH` adalah lokasi penyimpanan kredensial dan state sesi.
- `LOG_LEVEL` mengatur tingkat detail log.

Jangan commit folder `.auth` atau file SQLite sesi.

## Menjalankan Secara Lokal

Dari root repository:

```sh
npm install
npm run dev:notification
```

Atau dari direktori ini:

```sh
npm install
npm run dev
```

Saat worker mulai pertama kali, scan QR code yang ditampilkan di terminal.
Setelah pairing berhasil, sesi disimpan sesuai `ZAPO_STORE_PATH`.

## Menjalankan dengan Docker

Mode development:

```sh
docker compose -f ../docker-compose.dev.yml up --build notification
```

Mode production dijalankan bersama seluruh stack:

```sh
docker compose up --build
```

Compose production menggunakan volume `zapo-auth` pada `/app/.auth`, sehingga
container dapat dibuat ulang tanpa pairing ulang.

## Perintah

```sh
npm run dev    # Worker dengan tsx watch
npm run start  # Menjalankan worker tanpa watch
```

Library `better-sqlite3` dapat membutuhkan Python, Make, dan g++ ketika binary
prebuilt tidak tersedia. Dockerfile worker sudah menyiapkan kebutuhan build
tersebut.
