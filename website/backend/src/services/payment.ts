import crypto from "node:crypto";
import Customer from "../models/customer";
import Invoice from "../models/invoice";
import Transaction from "../models/transaction";
import {
  isSuccessfulMidtransStatus,
  type MidtransCharge,
  type MidtransPaymentType,
  MidtransGateway,
  type PaymentGateway,
} from "./midtrans";

export class PaymentService {
  public constructor(private readonly gateway: PaymentGateway = new MidtransGateway()) {}

  public async requestCash(invoiceNumber: string) {
    const invoice = await this.findUnpaidInvoice(invoiceNumber);
    const transaction = await Transaction.create({
      transactionId: `CASH-${crypto.randomUUID()}`,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      roomId: invoice.roomId,
      paymentMethod: "Cash",
      paymentDate: new Date(),
      totalAmount: invoice.amount,
      status: "cash_pending",
    });
    return { transactionId: transaction.transactionId, status: transaction.status };
  }

  public async createOnlinePayment(invoiceNumber: string, paymentType: MidtransPaymentType) {
    if (!["qris", "bank_transfer"].includes(paymentType)) {
      throw new Error("Unsupported payment type");
    }
    const invoice = await this.findUnpaidInvoice(invoiceNumber);
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
    });
    return charge;
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
    }
  }

  public async confirmCash(transactionId: string) {
    const transaction = await Transaction.findOneAndUpdate(
      { transactionId, status: "cash_pending" },
      { status: "confirmed" },
      { new: true },
    );
    if (!transaction) throw new Error("Cash payment not found or already confirmed");
    await Invoice.updateOne({ invoiceNumber: transaction.invoiceNumber }, { status: "paid" });
    return { transactionId: transaction.transactionId, status: transaction.status };
  }

  private async findUnpaidInvoice(invoiceNumber: string) {
    const invoice = await Invoice.findOne({ invoiceNumber, status: { $ne: "paid" } });
    if (!invoice) throw new Error("Unpaid invoice not found");
    return invoice;
  }
}
