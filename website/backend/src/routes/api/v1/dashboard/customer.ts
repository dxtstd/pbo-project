import { Router } from "express";
import Customer from "../../../../models/customer";
import Invoice from "../../../../models/invoice";
import Room from "../../../../models/room";
import { config } from "../../../../config/env";
import { generateInvoicePdf } from "../../../../services/invoicePdf";

const customerDashboard = Router();

customerDashboard.get("/:customerId", async (req, res) => {
  if (req.user?.role !== "customer" || req.user.id !== req.params.customerId) {
    return res.status(403).json({ message: "Cannot access this dashboard" });
  }

  const customer = await Customer.findOne({ customerId: req.params.customerId }).lean();
  if (!customer) return res.status(404).json({ message: "Customer not found" });

  const invoices = await Invoice.find({ customerId: customer.customerId }).sort({ dueDate: 1 }).lean();
  const room = await Room.findOne({ customerId: customer.customerId }).lean();
  return res.json({ customer, room, invoices });
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
  if (!customer || !room) return res.status(404).json({ message: "Invoice details not found" });
  try {
    const pdf = await generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      status: invoice.status,
      customerName: `${customer.firstname} ${customer.lastname}`.trim(),
      roomName: room.name,
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
    ? `Kost Camp M2\nPENGINGAT TAGIHAN\nTagihan ${invoice.invoiceNumber} akan jatuh tempo pada ${date}.\nIni adalah pengingat H-7.`
    : scenario === "due_date"
      ? `Kost Camp M2\nPEMBERITAHUAN\nHari ini adalah jatuh tempo tagihan ${invoice.invoiceNumber} sebesar Rp ${invoice.amount.toLocaleString("id-ID")}.`
      : `Kost Camp M2\nPEMBAYARAN BERHASIL\nPembayaran invoice ${invoice.invoiceNumber} sebesar Rp ${invoice.amount.toLocaleString("id-ID")} berhasil diterima.`;
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
