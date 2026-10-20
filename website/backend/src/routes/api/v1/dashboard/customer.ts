import { Router } from "express";
import Customer from "../../../../models/customer";
import Invoice from "../../../../models/invoice";
import Room from "../../../../models/room";
import Transaction from "../../../../models/transaction";
import { config } from "../../../../config/env";
import { generateInvoicePdf } from "../../../../services/invoicePdf";
import { createInvoiceForPeriod } from "../../../../services/invoice";

const customerDashboard = Router();

customerDashboard.get("/:customerId", async (req, res) => {
  if (req.user?.role !== "customer" || req.user.id !== req.params.customerId) {
    return res.status(403).json({ message: "Cannot access this dashboard" });
  }

  const customer = await Customer.findOne({ customerId: req.params.customerId }).lean();
  if (!customer) return res.status(404).json({ message: "Customer not found" });

  const room = await Room.findOne({ customerId: customer.customerId }).lean();
  const expiredTransactions = await Transaction.find({
    customerId: customer.customerId,
    status: { $in: ["pending", "cash_pending"] },
    expiresAt: { $lte: new Date() },
  }).select("transactionId invoiceNumber").lean();
  if (expiredTransactions.length) {
    const expiredInvoiceNumbers = expiredTransactions
      .map((transaction) => transaction.invoiceNumber)
      .filter((invoiceNumber): invoiceNumber is string => Boolean(invoiceNumber));
    await Transaction.updateMany(
      { transactionId: { $in: expiredTransactions.map((transaction) => transaction.transactionId) } },
      { $set: { status: "expire" } },
    );
    await Invoice.updateMany(
      { invoiceNumber: { $in: expiredInvoiceNumbers }, status: "pending" },
      { $set: { status: "unpaid" } },
    );
  }
  const invoices = await Invoice.find({ customerId: customer.customerId }).sort({ dueDate: 1 }).lean();
  const transactions = await Transaction.find({ customerId: customer.customerId }).sort({ createdAt: -1 }).limit(20).lean();
  return res.json({ customer, room, invoices, transactions });
});

customerDashboard.post("/:customerId/invoices/extend", async (req, res) => {
  if (req.user?.role !== "customer" || req.user.id !== req.params.customerId) {
    return res.status(403).json({ message: "Cannot request this extension" });
  }
  const months = Number(req.body.months);
  if (!Number.isInteger(months) || months < 1 || months > 12) {
    return res.status(400).json({ message: "Durasi perpanjangan harus antara 1 sampai 12 bulan" });
  }
  const room = await Room.findOne({ customerId: req.params.customerId, isOccupied: true }).lean();
  if (!room) return res.status(404).json({ message: "Kamar aktif tidak ditemukan" });
  const pendingRequest = await Invoice.exists({
    customerId: req.params.customerId,
    roomId: room.roomId,
    status: "pending",
  });
  if (pendingRequest) return res.status(409).json({ message: "Perpanjangan sebelumnya masih menunggu pembayaran atau pembatalan owner" });
  const unpaidInvoice = await Invoice.exists({
    customerId: req.params.customerId,
    roomId: room.roomId,
    status: { $in: ["unpaid", "overdue"] },
  });
  if (unpaidInvoice) return res.status(409).json({ message: "Selesaikan invoice aktif terlebih dahulu sebelum mengajukan perpanjangan" });
  const latestInvoice = await Invoice.findOne({
    customerId: req.params.customerId,
    roomId: room.roomId,
    status: "paid",
  }).sort({ periodEndDate: -1, dueDate: -1 }).lean();
  if (!latestInvoice) return res.status(409).json({ message: "Perpanjangan tersedia setelah pembayaran sewa berhasil dikonfirmasi" });
  const startDate = latestInvoice?.periodEndDate
    ? new Date(latestInvoice.periodEndDate)
    : new Date(room.rentalStartDate || new Date());
  startDate.setMonth(startDate.getMonth() + 1);
  const invoice = await createInvoiceForPeriod({
    customerId: req.params.customerId,
    roomId: room.roomId,
    startDate,
    months,
    status: "pending",
  });
  return res.status(201).json({ invoice });
});

customerDashboard.post("/:customerId/invoices/combined", async (req, res) => {
  if (req.user?.role !== "customer" || req.user.id !== req.params.customerId) {
    return res.status(403).json({ message: "Cannot create this invoice" });
  }
  const months = Number(req.body.months);
  if (!Number.isInteger(months) || months < 2 || months > 12) {
    return res.status(400).json({ message: "Pilih periode pembayaran antara 2 sampai 12 bulan" });
  }
  const room = await Room.findOne({ customerId: req.params.customerId }).lean();
  if (!room) return res.status(404).json({ message: "Kamar aktif tidak ditemukan" });
  const pendingRequest = await Invoice.exists({
    customerId: req.params.customerId,
    roomId: room.roomId,
    status: "pending",
  });
  if (pendingRequest) return res.status(409).json({ message: "Perpanjangan sebelumnya masih menunggu pembayaran atau pembatalan owner" });
  const activeInvoices = await Invoice.find({
    customerId: req.params.customerId,
    roomId: room.roomId,
    status: { $in: ["unpaid", "overdue"] },
  }).sort({ dueDate: 1 }).lean();
  const latestInvoice = await Invoice.findOne({
    customerId: req.params.customerId,
    roomId: room.roomId,
  }).sort({ dueDate: -1 }).lean();
  const startDate = activeInvoices[0]?.periodStartDate
    || activeInvoices[0]?.dueDate
    || (latestInvoice?.periodEndDate || latestInvoice?.dueDate
      ? new Date(latestInvoice.periodEndDate || latestInvoice.dueDate)
      : new Date());
  if (!activeInvoices.length && latestInvoice?.periodEndDate === undefined && latestInvoice?.dueDate) {
    startDate.setMonth(startDate.getMonth() + 1);
  } else if (!activeInvoices.length && latestInvoice?.periodEndDate) {
    startDate.setMonth(startDate.getMonth() + 1);
  }
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + months - 1);
  const overlapping = activeInvoices.filter((invoice) => {
    const invoiceEnd = invoice.periodEndDate || invoice.dueDate;
    return invoice.dueDate <= endDate && invoiceEnd >= startDate;
  });
  const hasActivePayment = await Transaction.exists({
    invoiceNumber: { $in: overlapping.map((invoice) => invoice.invoiceNumber) },
    status: { $in: ["pending", "cash_pending"] },
  });
  if (hasActivePayment) return res.status(409).json({ message: "Selesaikan atau batalkan permintaan pembayaran aktif terlebih dahulu" });
  if (overlapping.length) {
    await Invoice.updateMany(
      { _id: { $in: overlapping.map((invoice) => invoice._id) } },
      { $set: { status: "cancelled" } },
    );
  }
  const invoice = await createInvoiceForPeriod({
    customerId: req.params.customerId,
    roomId: room.roomId,
    startDate,
    months,
    status: "pending",
  });
  return res.status(201).json({ invoice });
});

customerDashboard.get("/:customerId/invoices/:invoiceNumber/pdf", async (req, res) => {
  if (req.user?.role !== "customer" || req.user.id !== req.params.customerId) {
    return res.status(403).json({ message: "Cannot download this invoice" });
  }
  const invoice = await Invoice.findOne({
    invoiceNumber: req.params.invoiceNumber,
    customerId: req.params.customerId,
  }).lean();
  if (!invoice) return res.status(404).json({ message: "Invoice not found" });
  const [customer, room] = await Promise.all([
    Customer.findOne({ customerId: req.params.customerId }).lean(),
    Room.findOne({ roomId: invoice.roomId, customerId: req.params.customerId }).lean(),
  ]);
  const customerName = invoice.customerName || (customer ? `${customer.firstname} ${customer.lastname}`.trim() : "");
  const roomName = invoice.roomName || room?.name || "";
  if (!customerName || !roomName) return res.status(404).json({ message: "Invoice details not found" });
  try {
    const pdf = await generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      status: invoice.status,
      customerName,
      roomName,
      periodStartDate: invoice.periodStartDate,
      periodEndDate: invoice.periodEndDate,
      periodMonths: invoice.periodMonths,
    });
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    return res.send(Buffer.from(pdf));
  } catch (error) {
    console.error("Failed to generate customer invoice PDF", error);
    return res.status(500).json({ message: "Invoice PDF could not be generated" });
  }
});

customerDashboard.post("/:customerId/notification/test", async (req, res) => {
  if (req.user?.role !== "customer" || req.user.id !== req.params.customerId) {
    return res.status(403).json({ message: "Cannot test this notification" });
  }
  const { scenario } = req.body as { scenario?: string };
  if (!["due_date", "h7", "payment_success"].includes(scenario || "")) {
    return res.status(400).json({ message: "Notification scenario tidak valid" });
  }
  const customer = await Customer.findOne({ customerId: req.params.customerId }).lean();
  const invoice = await Invoice.findOne({ customerId: req.params.customerId }).sort({ dueDate: 1 }).lean();
  if (!customer || !invoice) return res.status(404).json({ message: "Data customer atau invoice tidak ditemukan" });
  const date = new Date(invoice.dueDate).toLocaleDateString("id-ID");
  const message = scenario === "h7"
    ? `Kost Lorem Ipsum\nPENGINGAT TAGIHAN\nTagihan ${invoice.invoiceNumber} akan jatuh tempo pada ${date}.\nIni adalah pengingat H-7.`
    : scenario === "due_date"
      ? `Kost Lorem Ipsum\nPEMBERITAHUAN\nHari ini adalah jatuh tempo tagihan ${invoice.invoiceNumber} sebesar Rp ${invoice.amount.toLocaleString("id-ID")}.`
      : `Kost Lorem Ipsum\nPEMBAYARAN BERHASIL\nPembayaran invoice ${invoice.invoiceNumber} sebesar Rp ${invoice.amount.toLocaleString("id-ID")} berhasil diterima.`;
  try {
    const response = await fetch(`${config.notificationHttpUrl}/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipient: customer.phoneNumber, message }),
    });
    if (!response.ok) return res.status(502).json({ message: "Test notification could not be sent" });
    return res.json({ sent: true });
  } catch {
    return res.status(503).json({ message: "Notification service unavailable" });
  }
});

export default customerDashboard;
