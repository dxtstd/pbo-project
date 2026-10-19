import Invoice from "../models/invoice";
import Room from "../models/room";

export class InvoiceGenerator {
  /**
   * Calculates and persists a monthly invoice snapshot for a customer's room.
   *
   * @param customerId Customer identifier owning the room.
   * @param roomId Room identifier used for the invoice.
   * @param dueDate Invoice payment deadline.
   * @returns The newly created Mongoose invoice document.
   * @throws Error when the room does not belong to the customer.
   */
  static async generateMonthlyInvoice(customerId: string, roomId: string, dueDate: Date) {
    const room = await Room.findOne({ roomId, customerId }).lean();
    if (!room) throw new Error("Room not found for customer");
    const basePrice = room.price;
    const additionalFees = 0;
    const totalAmount = basePrice + additionalFees;
    return Invoice.create({
      invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
      customerId,
      roomId,
      basePrice,
      additionalFees,
      totalAmount,
      amount: totalAmount,
      dueDate,
      status: "unpaid",
    });
  }
}