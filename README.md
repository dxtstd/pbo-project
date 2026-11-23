# Project Pemrograman Berorientasi Object (PBO)

> Sistem manajemen rumah kos untuk mengelola kamar, penghuni, tagihan, pembayaran,
> dan notifikasi WhatsApp.

**Bahasa:** Indonesia (utama) | [English](README_en.md)

## Daftar Isi

- [Deskripsi](#deskripsi)
- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Struktur Proyek](#struktur-proyek)
- [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
- [Menjalankan dengan Docker](#menjalankan-dengan-docker)
- [Akun Uji dan Demo](#akun-uji-dan-demo)
- [Dokumentasi Teknis](#dokumentasi-teknis)
- [Catatan Keamanan](#catatan-keamanan)

## Deskripsi

PBO Kost adalah aplikasi web untuk membantu pemilik rumah kos mengelola
operasional kos secara terpusat. Aplikasi menyediakan dashboard penghuni dan
pemilik, pencatatan tagihan serta transaksi, pembayaran melalui Midtrans,
dan pengingat pembayaran melalui WhatsApp.

## Fitur

- Autentikasi dan dashboard berdasarkan peran pengguna.
- Pengelolaan kamar dan data penghuni.
- Pembuatan serta pemantauan status tagihan.
- Pembayaran melalui QRIS, Virtual Account, dan tunai.
- Konfirmasi pembayaran tunai oleh pemilik.
- Callback Midtrans untuk memperbarui status pembayaran online.
- Notifikasi WhatsApp untuk pengingat tagihan dan pembayaran.
- Rekap pembayaran dan laporan untuk pemilik.
- Pembuatan invoice PDF.
- Reset seluruh data melalui dashboard admin dengan konfirmasi berlapis.

## Teknologi

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand
- **Backend:** Node.js, Express, TypeScript, Mongoose
- **Database:** MongoDB
- **Pembayaran:** Midtrans
- **Notifikasi:** Zapo.js melalui WebSocket
- **Reverse proxy:** Nginx
- **Orkestrasi workspace:** Nx dan Docker Compose

## Struktur Proyek

```text
.
├── website/
│   ├── frontend/       # Aplikasi React
│   └── backend/        # API Express dan model MongoDB
├── notification/       # Worker notifikasi WhatsApp
├── docker/             # Konfigurasi Nginx
├── docker-compose.dev.yml
├── docker-compose.yml
└── package.json
```

## Menjalankan Secara Lokal

### Prasyarat

- Node.js dan npm
- MongoDB lokal jika tidak menggunakan Docker
- Docker Desktop (opsional, tetapi direkomendasikan untuk menjalankan seluruh stack)

### Instalasi

```sh
npm install
```

Salin file environment contoh, kemudian sesuaikan nilainya:

```text
website/frontend/.env.development.example  -> website/frontend/.env.development
website/backend/.env.development.example   -> website/backend/.env.development
notification/.env.development.example      -> notification/.env.development
```

Jangan commit file environment yang berisi kredensial atau secret.

### Perintah Nx

Jalankan frontend, backend, dan worker notifikasi:

```sh
npm run dev
```

Jalankan aplikasi website saja:

```sh
npm run dev:website
```

Jalankan worker notifikasi saja:

```sh
npm run dev:notification
```

Nama proyek Nx adalah `frontend`, `backend`, dan `notification`.

## Menjalankan dengan Docker

Untuk mode development:

```sh
docker compose -f docker-compose.dev.yml up --build
```

Untuk mode production:

```sh
docker compose up --build
```

Aplikasi tersedia di `http://localhost:8080` secara default. Port host dapat
diubah dengan `HTTP_PORT`.

Pada first start worker notifikasi, scan QR code yang ditampilkan oleh
container. Mode development menyimpan sesi pada `notification/.auth`. Mode
production menggunakan volume Docker `zapo-auth`.

## Akun Uji dan Demo

- **Live demo:** [Tonton demo aplikasi](https://youtu.be/Upphza8kXHc).
- **URL demo publik:** [https://kost.dxtstd.my.id](https://kost.dxtstd.my.id).
- **Username admin lokal:** `admin` (dapat diubah melalui `ADMIN_USERNAME`).
- **Password admin lokal:** ditentukan melalui `ADMIN_PASSWORD`; jangan
  menyimpan password nyata di repository.

Jika aplikasi dideploy untuk penilaian, tambahkan URL publik dan kredensial
akun uji yang aktif pada bagian ini atau pada dokumen laporan. Jangan gunakan
akun pribadi atau secret produksi.

Rute utama dashboard:

- `/dashboard/customer` — tagihan dan pembayaran penghuni.
- `/dashboard/customer/payment` — pilihan pembayaran.
- `/dashboard/owner` — data penghuni dan rekap pemilik.

## Dokumentasi Teknis

- [Dokumentasi backend dan relasi model](website/backend/README.md)
- [Dokumentasi frontend](website/frontend/README.md)

Callback Midtrans harus diarahkan ke:

```text
/api/v1/payment/callback
```

Atur `MIDTRANS_ENVIRONMENT` ke `sandbox` atau `production`, lalu isi
`MIDTRANS_SERVER_KEY` yang sesuai. Pembayaran online dinyatakan berhasil
setelah callback Midtrans berstatus `settlement` atau `capture`.

## Catatan Keamanan

- Gunakan `JWT_SECRET` yang panjang dan acak pada deployment.
- Simpan seluruh password, API key, dan private key hanya di environment.
- Jangan commit `.env`, folder `node_modules`, data MongoDB, atau sesi
  autentikasi WhatsApp.
- Admin memiliki aksi permanen **Reset semua data**. Aksi ini memerlukan dua
  konfirmasi dan teks tepat `RESET-ALL`.
