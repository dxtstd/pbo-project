import { Router } from "express";
import crypto from "node:crypto";
import Customer from "../../../../models/customer";
import Invoice from "../../../../models/invoice";
import Transaction from "../../../../models/transaction";
import { createMidtransCharge, isSuccessfulMidtransStatus, verifyMidtransSignature, type MidtransPaymentType, type MidtransCharge } from "../../../../services/midtrans";

const payment = Router();

payment.post("/cash", async (req, res) => {
  const invoice = await Invoice.findOne({ invoiceNumber: req.body.invoiceNumber, status: { $ne: "paid" } });
  if (!invoice) return res.status(404).json({ message: "Unpaid invoice not found" });
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
  return res.status(201).json({ transactionId: transaction.transactionId, status: transaction.status });
});

payment.post("/charge", async (req, res) => {
  const invoice = await Invoice.findOne({ invoiceNumber: req.body.invoiceNumber, status: { $ne: "paid" } });
  if (!invoice) return res.status(404).json({ message: "Unpaid invoice not found" });
  const customer = await Customer.findOne({ customerId: invoice.customerId }).lean();
  if (!customer) return res.status(404).json({ message: "Customer not found" });
  const paymentType = req.body.paymentType as MidtransPaymentType;
  if (!["qris", "bank_transfer"].includes(paymentType)) return res.status(400).json({ message: "Unsupported payment type" });
  const orderId = `INV-${invoice.invoiceNumber}-${Date.now()}`;
  const charge = await createMidtransCharge({
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
  return res.status(201).json(charge);
});

payment.post("/callback", async (req, res) => {
  const callback = req.body as MidtransCharge;
  if (!callback.order_id || !callback.status_code || !callback.gross_amount || !callback.signature_key) {
    return res.status(400).json({ message: "Incomplete Midtrans callback" });
  }
  if (!verifyMidtransSignature(callback)) return res.status(401).json({ message: "Invalid Midtrans signature" });
  const transaction = await Transaction.findOneAndUpdate(
    { midtransOrderId: callback.order_id },
    { status: callback.transaction_status },
    { new: true },
  );
  if (transaction && isSuccessfulMidtransStatus(callback.transaction_status)) {
    await Invoice.updateOne({ invoiceNumber: transaction.invoiceNumber }, { status: "paid" });
  }
  return res.json({ received: true });
});

payment.post("/cash/:transactionId/confirm", async (req, res) => {
  const transaction = await Transaction.findOneAndUpdate(
    { transactionId: req.params.transactionId, status: "cash_pending" },
    { status: "confirmed" },
    { new: true },
  );
  if (!transaction) return res.status(404).json({ message: "Cash payment not found or already confirmed" });
  await Invoice.updateOne({ invoiceNumber: transaction.invoiceNumber }, { status: "paid" });
  return res.json({ transactionId: transaction.transactionId, status: transaction.status });
});

export default payment;
