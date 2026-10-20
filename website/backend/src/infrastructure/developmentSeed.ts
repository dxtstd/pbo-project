import bcrypt from "bcrypt";
import Customer from "../models/customer";
import Invoice from "../models/invoice";
import Owner from "../models/owner";
import Room from "../models/room";
import Transaction from "../models/transaction";
import SiteContent from "../models/siteContent";

export const seedDevelopmentUsers = async (): Promise<void> => {
  if (process.env.NODE_ENV === "production") return;
  const ownerPassword = process.env.DEV_OWNER_PASSWORD || "owner123";
  const customerPassword = process.env.DEV_CUSTOMER_PASSWORD || "customer123";

  const ownerId = "dev-owner";
  const now = new Date();
  const hashedOwnerPassword = await bcrypt.hash(ownerPassword, 12);
  const hashedCustomerPassword = await bcrypt.hash(customerPassword, 12);

  await SiteContent.updateOne(
    { key: "landing" },
    {
      $setOnInsert: {
        key: "landing",
        siteName: "Kost Lorem Ipsum",
        heroTitle: "Kost Lorem Ipsum",
        heroDescription: "Tinggal dengan suasana nyaman di Kost Lorem Ipsum. Lokasi strategis dengan fasilitas lengkap untuk kenyamanan dan ketenangan Anda.",
        facilitiesTitle: "Fasilitas Kost Lorem Ipsum",
        facilitiesDescription: "Nikmati fasilitas lengkap yang dirancang untuk mendukung aktivitas harian, kenyamanan, dan ketenangan Anda.",
        contactTitle: "Contact Us",
        contactDescription: "Hubungi kami untuk informasi lebih lanjut mengenai Kost Lorem Ipsum.",
        location: "Tataaran Satu, Kec. Tondano Sel., Kabupaten Minahasa, Sulawesi Utara, Indonesia",
        whatsapp: "+62 813-9991-2220",
      },
    },
    { upsert: true },
  );

  await Owner.updateOne(
    { ownerId },
    {
      $setOnInsert: {
        ownerId,
        username: process.env.DEV_OWNER_USERNAME || "owner",
        firstname: "Development",
        lastname: "Owner",
        email: process.env.DEV_OWNER_EMAIL || "owner@localhost",
        phoneNumber: "081234567890",
        password: hashedOwnerPassword,
      },
    },
    { upsert: true },
  );

  const customers = [
    {
      customerId: "dev-customer",
      username: process.env.DEV_CUSTOMER_USERNAME || "customer",
      firstname: "Development",
      lastname: "Customer",
      phoneNumber: "081234567891",
    },
    { customerId: "dev-customer-2", username: "customer2", firstname: "Budi", lastname: "Santoso", phoneNumber: "081234567892" },
    { customerId: "dev-customer-3", username: "customer3", firstname: "Siti", lastname: "Aminah", phoneNumber: "081234567893" },
  ];

  for (const customer of customers) {
    await Customer.updateOne(
      { customerId: customer.customerId },
      { $set: { ...customer, ownerId, password: hashedCustomerPassword } },
      { upsert: true },
    );
  }

  const rooms = [
    { roomId: "DEV-ROOM-001", customerId: "dev-customer", name: "Kamar Mawar", type: "small", price: 1_200_000, withFurniture: true, rentalStartDate: new Date(now.getFullYear(), now.getMonth(), 1), monthlyDueDay: 5 },
    { roomId: "DEV-ROOM-002", customerId: "dev-customer-2", name: "Kamar Melati", type: "medium", price: 1_500_000, withFurniture: false, rentalStartDate: new Date(now.getFullYear(), now.getMonth(), 3), monthlyDueDay: 15 },
    { roomId: "DEV-ROOM-003", customerId: "dev-customer-3", name: "Kamar Anggrek", type: "large", price: 2_100_000, withFurniture: true, rentalStartDate: new Date(now.getFullYear(), now.getMonth(), 7), monthlyDueDay: 31 },
  ];

  for (const room of rooms) {
    await Room.updateOne(
      { roomId: room.roomId },
      { $setOnInsert: { ...room, ownerId, isOccupied: true } },
      { upsert: true },
    );
  }

  const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 5);
  const invoices = [
    { invoiceNumber: "DEV-INV-001", customerId: "dev-customer", roomId: "DEV-ROOM-001", basePrice: 1_200_000, additionalFees: 100_000, totalAmount: 1_300_000, status: "unpaid" as const },
    { invoiceNumber: "DEV-INV-002", customerId: "dev-customer-2", roomId: "DEV-ROOM-002", basePrice: 1_500_000, additionalFees: 0, totalAmount: 1_500_000, status: "paid" as const },
    { invoiceNumber: "DEV-INV-003", customerId: "dev-customer-3", roomId: "DEV-ROOM-003", basePrice: 2_100_000, additionalFees: 100_000, totalAmount: 2_200_000, status: "overdue" as const },
  ];

  for (const invoice of invoices) {
    await Invoice.updateOne(
      { invoiceNumber: invoice.invoiceNumber },
      { $setOnInsert: { ...invoice, amount: invoice.totalAmount, dueDate } },
      { upsert: true },
    );
  }

  const transactions = [
    { transactionId: "DEV-TXN-001", customerId: "dev-customer-2", roomId: "DEV-ROOM-002", invoiceNumber: "DEV-INV-002", paymentMethod: "QRIS" as const, totalAmount: 1_500_000, status: "settlement" as const },
    { transactionId: "DEV-TXN-002", customerId: "dev-customer", roomId: "DEV-ROOM-001", invoiceNumber: "DEV-INV-001", paymentMethod: "Cash" as const, totalAmount: 1_300_000, status: "cash_pending" as const },
    { transactionId: "DEV-TXN-003", customerId: "dev-customer-3", roomId: "DEV-ROOM-003", invoiceNumber: "DEV-INV-003", paymentMethod: "Bank Transfer" as const, totalAmount: 2_200_000, status: "deny" as const },
  ];

  for (const transaction of transactions) {
    await Transaction.updateOne(
      { transactionId: transaction.transactionId },
      { $setOnInsert: { ...transaction, paymentDate: now } },
      { upsert: true },
    );
  }
};
