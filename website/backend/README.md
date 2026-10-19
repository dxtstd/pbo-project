# pbo-kost-backend

## Relasi model

Relasi memakai ID bisnis agar kompatibel dengan data yang sudah menggunakan
`customerId`, `roomId`, `ownerId`, dan `invoiceNumber`:

- **Owner 1:N Room**: satu owner mengelola banyak kamar.
- **Customer 1:N Room**: satu customer dapat memiliki riwayat beberapa kamar.
  Kamar yang sedang aktif ditandai dengan `customerId` dan `isOccupied`.
- **Customer 1:N Invoice**: setiap tagihan dimiliki satu customer.
- **Room 1:N Invoice**: setiap tagihan terkait satu kamar.
- **Customer 1:N Transaction** dan **Room 1:N Transaction**: transaksi mencatat
  pembayaran customer untuk kamar tertentu.
- **Invoice 1:N Transaction**: satu invoice dapat memiliki beberapa catatan
  percobaan/riwayat pembayaran.

Virtual relation Mongoose tersedia melalui `populate()`, misalnya:

```ts
const customer = await Customer.findOne({ customerId }).populate([
  'rooms',
  'invoices',
  'transactions',
]);
```

## Class PBO

Class domain dapat diimpor dari satu barrel:

```ts
import { Customer, Invoice, Room, Transaction } from './class';

const customer = new Customer('C001', 'budi', 'Budi', 'Santoso', '08123456789');
const room = new Room({
  roomId: 'R001',
  name: 'Kamar 1',
  type: 'standard',
  price: 350000,
});
room.assignCustomer(customer);

const invoice = new Invoice('INV-001', customer, room, room.calculatePrice(), new Date());
invoice.pay();
const transaction = new Transaction('TRX-001', customer, room, invoice.getAmount(), 'QRIS', invoice);
```

Class tersebut memisahkan perilaku bisnis dari schema database: `Room` mengatur
okupansi dan harga, `Invoice` mengatur status pembayaran, dan `Transaction`
menyimpan ringkasan pembayaran.
