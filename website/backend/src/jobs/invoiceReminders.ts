import Customer from "../models/customer";
import Invoice from "../models/invoice";
import Owner from "../models/owner";
import Room from "../models/room";
import { isNotificationCategoryEnabled, notificationBridge, renderNotificationTemplate } from "../services/notification";
import { createNextInvoice } from "../services/invoice";
import logger from "../utils/logger";

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
      status: { $in: ["unpaid", "overdue"] },
      dueDate: { $gte: dueDate, $lt: nextDay },
    }).lean();

    for (const invoice of invoices) {
      await createNextInvoice(invoice).catch((error) => {
        logger.error({ err: error, invoiceNumber: invoice.invoiceNumber }, "Failed to create next invoice");
      });
      const reminderKey = `${invoice.invoiceNumber}:${daysBeforeDue}:${dueDate.toISOString().slice(0, 10)}`;
      if (sentReminderKeys.has(reminderKey)) continue;

      const [customer, room] = await Promise.all([
        Customer.findOne({ customerId: invoice.customerId }).lean(),
        Room.findOne({ roomId: invoice.roomId }).lean(),
      ]);
      const owner = room?.ownerId
        ? await Owner.findOne({ ownerId: room.ownerId }).lean()
        : undefined;

      if (!customer || !owner || !(await isNotificationCategoryEnabled(owner.ownerId, "invoice_due"))) {
        logger.warn({ invoiceNumber: invoice.invoiceNumber, customerId: invoice.customerId, roomId: invoice.roomId }, "Invoice reminder skipped because recipient data is unavailable or disabled");
        continue;
      }

      const message = await renderNotificationTemplate("invoice_due", {
        customer_name: `${customer.firstname} ${customer.lastname}`.trim(),
        invoice_number: invoice.invoiceNumber,
        payment: `Rp${invoice.amount.toLocaleString("id-ID")}`,
        due_date: invoice.dueDate.toLocaleDateString("id-ID"),
        days_before_due: daysBeforeDue,
        dashboard_link: "/dashboard/customer/payment",
      });
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
        message,
      });
      sentReminderKeys.add(reminderKey);
    }
  }
};

export const startInvoiceReminderJob = (): NodeJS.Timeout => {
  void sendInvoiceReminders().catch((error) => {
    logger.error({ err: error }, "Failed to send initial invoice reminders");
  });

  return setInterval(() => {
    void sendInvoiceReminders().catch((error) => {
      logger.error({ err: error }, "Failed to send invoice reminders");
    });
  }, 60 * 60 * 1000);
};
