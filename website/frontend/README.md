# Frontend PBO Kost

Frontend aplikasi PBO Kost dibangun dengan React dan TypeScript. Aplikasi ini
menyediakan halaman publik, login, dashboard customer, dashboard owner, dan
dashboard admin.

**Bahasa:** Indonesia (utama) | [English](README_en.md)
Dokumentasi workspace: [README utama](../../README.md)

## Fitur

- Halaman beranda, fasilitas, dan kontak.
- Login dengan pengalihan berdasarkan peran pengguna.
- Dashboard customer untuk melihat kamar, tagihan, riwayat transaksi, dan
  pembayaran.
- Dashboard owner untuk mengelola kamar, customer, pembayaran, rekap bulanan,
  laporan, serta pengaturan notifikasi.
- Dashboard admin untuk pengelolaan konfigurasi dan notifikasi.
- Proteksi route berdasarkan peran (`admin`, `owner`, dan `customer`).
- Pembuatan dan pengunduhan invoice PDF.
- Tampilan responsif dengan Tailwind CSS.

## Teknologi

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Zustand
- QRCode

## Struktur Source

```text
src/
├── components/     # Komponen bersama dan route protection
├── pages/          # Halaman publik, admin, customer, dan owner
├── stores/         # State autentikasi dan data aplikasi
├── utils/          # Utilitas, termasuk generator invoice
├── config.ts       # URL API, URL notifikasi, dan helper request
├── App.tsx         # Konfigurasi route utama
└── main.tsx        # Entry point aplikasi
```

## Menjalankan Secara Lokal

Dari root repository:

```sh
npm install
npm run dev:website
```

Atau dari direktori ini:

```sh
npm install
npm run dev
```

Vite akan menjalankan frontend pada `http://localhost:5173`. Saat memakai
`npm run dev`, frontend diakses melalui reverse proxy pada
`http://localhost:8080`.

## Environment

Salin `.env.development.example` menjadi `.env.development`:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_NOTIFICATION_URL=http://localhost:4000
```

Pada mode development, nilai tersebut memiliki fallback yang sama. Pada
production, `VITE_API_URL` dan `VITE_NOTIFICATION_URL` wajib dikonfigurasi.
Dengan Docker Compose production, frontend menggunakan path reverse proxy:

```env
VITE_API_URL=/api/v1
VITE_NOTIFICATION_URL=/notification
```

## Perintah

```sh
npm run dev      # Development server dengan HMR
npm run build    # Type-check dan build production
npm run lint     # Jalankan ESLint
npm run preview  # Preview hasil build
```

Build frontend menghasilkan output pada direktori `dist/`.
