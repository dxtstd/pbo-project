import { Router } from "express";
import Customer from "../../../../models/customer";
import Invoice from "../../../../models/invoice";
import Room from "../../../../models/room";
import { config } from "../../../../config/env";

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
