import Invoice from "../models/invoice";
import NotificationTemplate from "../models/notificationTemplate";
import Room from "../models/room";
import Customer from "../models/customer";

/**
 * Resolves an owner's active invoice template and replaces supported placeholders.
 *
 * @param ownerId Owner identifier used to enforce invoice ownership.
 * @param invoiceId MongoDB invoice identifier.
 * @returns A WhatsApp-ready message string.
 * @throws Error when the invoice, owner-owned room/customer, or active template is missing.
 */
export const prepareInvoiceNotification = async (ownerId: string, invoiceId: string): Promise<string> => {
  const invoice = await Invoice.findById(invoiceId).lean();
  if (!invoice) throw new Error("Invoice not found");
  const room = await Room.findOne({ roomId: invoice.roomId, ownerId }).lean();
  const customer = await Customer.findOne({ customerId: invoice.customerId }).lean();
  if (!room || !customer) throw new Error("Invoice is not owned by this owner");
  const template = await NotificationTemplate.findOne({ ownerId, active: true }).sort({ updatedAt: -1 }).lean();
  if (!template) throw new Error("Notification template not found");
  return template.content
    .replace(/\{\{name\}\}/g, `${customer.firstname} ${customer.lastname}`.trim())
    .replace(/\{\{room\}\}/g, room.name)
    .replace(/\{\{total\}\}/g, `Rp${invoice.totalAmount.toLocaleString("id-ID")}`);
};
