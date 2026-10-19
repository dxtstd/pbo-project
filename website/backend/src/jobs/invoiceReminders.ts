import Customer from "../models/customer";
import Invoice from "../models/invoice";
import Owner from "../models/owner";
import Room from "../models/room";
import { notificationBridge } from "../services/notification";

const reminderDays = [7, 0];
const sentReminderKeys = new Set<string>();

export const sendInvoiceReminders = async (): Promise<void> => {
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
        ownerPhone: owner.notificationPhone || owner.phoneNumber,
        amount: invoice.amount,
        dueDate: invoice.dueDate.toISOString().slice(0, 10),
        daysBeforeDue,
      });
      sentReminderKeys.add(reminderKey);
    }
  }
};

export const startInvoiceReminderJob = (): NodeJS.Timeout => {
  void sendInvoiceReminders().catch((error) => {
    console.error("Failed to send initial invoice reminders", error);
  });

  return setInterval(() => {
    void sendInvoiceReminders().catch((error) => {
      console.error("Failed to send invoice reminders", error);
    });
  }, 60 * 60 * 1000);
};
