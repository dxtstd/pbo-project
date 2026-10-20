import crypto from "node:crypto";
import Customer from "../models/customer";
import Invoice from "../models/invoice";
import Transaction, { type ITransaction } from "../models/transaction";
import Room from "../models/room";
import {
  isSuccessfulMidtransStatus,
  type MidtransCharge,
  type MidtransPaymentType,
  MidtransGateway,
  type PaymentGateway,
} from "./midtrans";

export class PaymentService {
  public constructor(private readonly gateway: PaymentGateway = new MidtransGateway()) {}

  public async requestCash(invoiceNumber: string, customerId: string) {
    const invoice = await this.findUnpaidInvoice(invoiceNumber, customerId);
    await this.ensureNoActiveTransaction(invoice.invoiceNumber);
    const transaction = await Transaction.create({
      transactionId: `CASH-${crypto.randomUUID()}`,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      roomId: invoice.roomId,
      paymentMethod: "Cash",
      paymentDate: new Date(),
      totalAmount: invoice.amount,
      status: "cash_pending",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return { transactionId: transaction.transactionId, status: transaction.status, expiresAt: transaction.expiresAt };
  }

  public async createOnlinePayment(invoiceNumber: string, paymentType: MidtransPaymentType, customerId: string) {
    if (!["qris", "bank_transfer"].includes(paymentType)) {
      throw new Error("Unsupported payment type");
    }
    const invoice = await this.findUnpaidInvoice(invoiceNumber, customerId);
    await this.ensureNoActiveTransaction(invoice.invoiceNumber);
    const customer = await Customer.findOne({ customerId: invoice.customerId }).lean();
    if (!customer) throw new Error("Customer not found");
    const orderId = `INV-${invoice.invoiceNumber}-${Date.now()}`;
    const charge = await this.gateway.charge({
      orderId,
      amount: invoice.amount,
      customerName: `${customer.firstname} ${customer.lastname}`,
      customerPhone: customer.phoneNumber,
      paymentType,
    });
    await Transaction.create({
      transactionId: orderId,
      midtransOrderId: orderId,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      roomId: invoice.roomId,
      paymentMethod: paymentType === "qris" ? "QRIS" : "Bank Transfer",
      paymentDate: new Date(),
      totalAmount: invoice.amount,
      status: "pending",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      paymentActions: charge.actions,
      vaNumbers: charge.vaNumbers,
    });
    return {
      ...charge,
      transactionId: orderId,
      status: "pending" as const,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  public async processMidtransCallback(callback: MidtransCharge): Promise<void> {
    if (!this.gateway.verifyCallback(callback)) throw new Error("Invalid Midtrans signature");
    const transaction = await Transaction.findOneAndUpdate(
      { midtransOrderId: callback.order_id },
      { status: callback.transaction_status },
      { new: true },
    );
    if (transaction && isSuccessfulMidtransStatus(callback.transaction_status)) {
      await Invoice.updateOne({ invoiceNumber: transaction.invoiceNumber }, { status: "paid" });
    } else if (transaction && ["expire", "cancel", "deny"].includes(callback.transaction_status)) {
      await Invoice.updateOne({ invoiceNumber: transaction.invoiceNumber, status: "pending" }, { status: "unpaid" });
    }
  }

  public async confirmCash(transactionId: string, ownerId: string) {
    const candidate = await Transaction.findOne({ transactionId, status: "cash_pending" }).lean();
    if (!candidate) throw new Error("Cash payment not found or already confirmed");
    const room = await Room.findOne({ roomId: candidate.roomId, ownerId }).select("roomId").lean();
    if (!room) throw new Error("Cash payment does not belong to this owner");
    const transaction = await Transaction.findOneAndUpdate(
      { transactionId, status: "cash_pending" },
      { status: "confirmed" },
      { new: true },
    );
    if (!transaction) throw new Error("Cash payment not found or already confirmed");
    await Invoice.updateOne({ invoiceNumber: transaction.invoiceNumber }, { status: "paid" });
    return { transactionId: transaction.transactionId, status: transaction.status };
  }

  public async cancelCash(transactionId: string, customerId: string) {
    const transaction = await Transaction.findOneAndUpdate(
      { transactionId, customerId, status: "cash_pending" },
      { status: "cancel" },
      { new: true },
    );
    if (!transaction) throw new Error("Cash payment not found or already closed");
    return { transactionId: transaction.transactionId, status: transaction.status };
  }

  private async findUnpaidInvoice(invoiceNumber: string, customerId: string) {
    await this.expireTransactions();
    const invoice = await Invoice.findOne({ invoiceNumber, customerId, status: { $in: ["pending", "unpaid", "overdue"] } });
    if (!invoice) throw new Error("Unpaid invoice not found");
    return invoice;
  }

  private async ensureNoActiveTransaction(invoiceNumber: string) {
    await this.expireTransactions(invoiceNumber);
    const active = await Transaction.exists({
      invoiceNumber,
      $or: [
        { status: "cash_pending" },
        { status: "pending", $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: { $exists: false } }] },
      ],
    });
    if (active) throw new Error("Masih ada permintaan pembayaran aktif. Batalkan atau tunggu transaksi sebelumnya selesai.");
  }

  private async expireTransactions(invoiceNumber?: string) {
    const activeStatuses: ITransaction["status"][] = ["pending", "cash_pending"];
    const filter = {
      status: { $in: activeStatuses },
      expiresAt: { $lte: new Date() },
      ...(invoiceNumber ? { invoiceNumber } : {}),
    };
    const expired = await Transaction.find(filter).select("invoiceNumber").lean();
    if (!expired.length) return;
    await Transaction.updateMany(filter, { $set: { status: "expire" } });
    const invoiceNumbers = expired
      .map((transaction) => transaction.invoiceNumber)
      .filter((value): value is string => Boolean(value));
    await Invoice.updateMany(
      { invoiceNumber: { $in: invoiceNumbers }, status: "pending" },
      { $set: { status: "unpaid" } },
    );
  }
}
