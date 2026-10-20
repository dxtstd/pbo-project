import Customer from "../models/customer";
import Invoice from "../models/invoice";
import Room from "../models/room";

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
}) => {
  if (!Number.isInteger(input.months) || input.months < 1 || input.months > 12) {
    throw new Error("Durasi invoice harus antara 1 sampai 12 bulan");
  }
  const [customer, room] = await Promise.all([
    Customer.findOne({ customerId: input.customerId }).select("firstname lastname").lean(),
    Room.findOne({ roomId: input.roomId }).select("name price").lean(),
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
  return Invoice.create({
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
