import Customer from "../models/customer";
import Invoice from "../models/invoice";
import Room from "../models/room";
import { isNotificationCategoryEnabled, publishInvoiceCreated, renderNotificationTemplate } from "./notification";
import logger from "../utils/logger";

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
};

const invoicePeriod = (invoice: { dueDate: Date; periodStartDate?: Date; periodEndDate?: Date; periodMonths?: number }) => {
  const start = invoice.periodStartDate || invoice.dueDate;
  const months = invoice.periodMonths || 1;
  const end = invoice.periodEndDate || addMonths(start, months - 1);
  return { start, end, months };
};

export const createInvoiceForPeriod = async (input: {
  customerId: string;
  roomId: string;
  startDate: Date;
  months: number;
  status?: "pending" | "unpaid";
  notifyCreated?: boolean;
}) => {
  if (!Number.isInteger(input.months) || input.months < 1 || input.months > 12) {
    throw new Error("Durasi invoice harus antara 1 sampai 12 bulan");
  }
  const [customer, room] = await Promise.all([
    Customer.findOne({ customerId: input.customerId }).select("firstname lastname phoneNumber").lean(),
    Room.findOne({ roomId: input.roomId }).select("name price ownerId").lean(),
  ]);
  if (!customer || !room) throw new Error("Customer atau kamar tidak ditemukan");
  const endDate = addMonths(input.startDate, input.months - 1);
  const existing = await Invoice.findOne({
    customerId: input.customerId,
    roomId: input.roomId,
    periodStartDate: input.startDate,
    periodEndDate: endDate,
    status: { $ne: "cancelled" },
  }).lean();
  if (existing) return existing;

  const amount = room.price * input.months;
  const invoice = await Invoice.create({
    invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    customerId: input.customerId,
    roomId: input.roomId,
    basePrice: room.price * input.months,
    additionalFees: 0,
    totalAmount: amount,
    amount,
    dueDate: input.startDate,
    status: input.status || "unpaid",
    customerName: `${customer.firstname} ${customer.lastname}`.trim(),
    roomName: room.name,
    periodStartDate: input.startDate,
    periodEndDate: endDate,
    periodMonths: input.months,
  });
  logger.info({
    invoiceNumber: invoice.invoiceNumber,
    customerId: input.customerId,
    roomId: input.roomId,
    amount: invoice.amount,
    months: input.months,
    status: invoice.status,
  }, "Invoice created");
  const invoiceNotificationEnabled = await isNotificationCategoryEnabled(room.ownerId, "invoice_created");
  logger.info({
    invoiceNumber: invoice.invoiceNumber,
    customerId: input.customerId,
    customerPhone: customer.phoneNumber || undefined,
    ownerId: room.ownerId,
    notificationEnabled: invoiceNotificationEnabled,
    notifyCreated: input.notifyCreated !== false,
  }, "Evaluating invoice-created notification");
  if (input.notifyCreated !== false && customer.phoneNumber && invoiceNotificationEnabled) {
    const message = await renderNotificationTemplate("invoice_created", {
      customer_name: `${customer.firstname} ${customer.lastname}`.trim(),
      invoice_number: invoice.invoiceNumber,
      payment: `Rp${invoice.amount.toLocaleString("id-ID")}`,
      due_date: invoice.dueDate.toLocaleDateString("id-ID"),
      dashboard_link: "/dashboard/customer/payment",
    });
    publishInvoiceCreated({
      invoiceNumber: invoice.invoiceNumber,
      customerName: `${customer.firstname} ${customer.lastname}`.trim(),
      customerPhone: customer.phoneNumber,
      amount: invoice.amount,
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      message,
    });
    logger.info({
      invoiceNumber: invoice.invoiceNumber,
      customerId: input.customerId,
      customerPhone: customer.phoneNumber,
      amount: invoice.amount,
    }, "Invoice-created notification queued for customer");
  } else if (input.notifyCreated !== false) {
    logger.warn({
      invoiceNumber: invoice.invoiceNumber,
      customerId: input.customerId,
      hasCustomerPhone: Boolean(customer.phoneNumber),
      notificationEnabled: invoiceNotificationEnabled,
      ownerId: room.ownerId,
    }, "Invoice notification skipped");
  }
  return invoice;
};

export const createNextInvoice = async (invoice: {
  customerId: string;
  roomId: string;
  dueDate: Date;
  periodEndDate?: Date;
  periodMonths?: number;
}) => {
  const { end, months } = invoicePeriod(invoice);
  return createInvoiceForPeriod({
    customerId: invoice.customerId,
    roomId: invoice.roomId,
    startDate: addMonths(end, 1),
    months,
  });
};
