import express from "express";
import mongoose from "mongoose";
import env from "dotenv";

import APIv1 from "./routes/api/v1/index";
import Customer from "./models/customer";
import Invoice from "./models/invoice";
import Room from "./models/room";
import Owner from "./models/owner";
import { notificationBridge } from "./services/notification";

const environment = process.env.NODE_ENV || "development";
env.config({ path: `.env.${environment}` });
env.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/kost_db";
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('Failed to connect to MongoDB:', err));

const app = express();
app.use(express.json());
notificationBridge.connect();

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/v1", APIv1);

app.use((req, res, next) => {
  res.status(404).send(({ code: 404, message: "Not Found" }));
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});

const reminderDays = [7, 0];
const sentReminderKeys = new Set<string>();
const sendInvoiceReminders = async (): Promise<void> => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const daysBeforeDue of reminderDays) {
    const dueDate = new Date(startOfToday);
    dueDate.setDate(dueDate.getDate() + daysBeforeDue);
    const nextDay = new Date(dueDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const invoices = await Invoice.find({
      status: "unpaid",
      dueDate: { $gte: dueDate, $lt: nextDay },
    }).lean();

    for (const invoice of invoices) {
      const reminderKey = `${invoice.invoiceNumber}:${daysBeforeDue}:${dueDate.toISOString().slice(0, 10)}`;
      if (sentReminderKeys.has(reminderKey)) continue;

      const [customer, room] = await Promise.all([
        Customer.findOne({ customerId: invoice.customerId }).lean(),
        Room.findOne({ roomId: invoice.roomId }).lean(),
      ]);
      const owner = room?.ownerId
        ? await Owner.findOne({ ownerId: room.ownerId }).lean()
        : undefined;

      if (!customer || !owner) {
        console.error(`Cannot notify invoice ${invoice.invoiceNumber}: customer or owner not found`);
        continue;
      }

      notificationBridge.publish({
        type: "invoice_due",
        invoiceNumber: invoice.invoiceNumber,
        customerName: `${customer.firstname} ${customer.lastname}`,
        customerPhone: customer.phoneNumber,
        ownerName: `${owner.firstname} ${owner.lastname}`,
        ownerPhone: owner.phoneNumber,
        amount: invoice.amount,
        dueDate: invoice.dueDate.toISOString().slice(0, 10),
        daysBeforeDue,
      });
      sentReminderKeys.add(reminderKey);
    }
  }
};

void sendInvoiceReminders().catch((error) => {
  console.error("Failed to send initial invoice reminders", error);
});

setInterval(() => {
  void sendInvoiceReminders().catch((error) => {
    console.error("Failed to send invoice reminders", error);
  });
}, 60 * 60 * 1000);