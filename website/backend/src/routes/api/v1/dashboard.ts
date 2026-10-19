import { Router } from "express";
import Customer from "../../../models/customer";
import Invoice from "../../../models/invoice";
import Owner from "../../../models/owner";
import Room from "../../../models/room";
import Transaction from "../../../models/transaction";
import { requireAuth, requireRole } from "../../../middlewares/auth";

const dashboard = Router();

dashboard.use(requireAuth);
dashboard.get("/customer/:customerId", async (req, res) => {
  if (req.user?.role !== "customer" || req.user.id !== req.params.customerId) return res.status(403).json({ message: "Cannot access this dashboard" });
  const customer = await Customer.findOne({ customerId: req.params.customerId }).lean();
  if (!customer) return res.status(404).json({ message: "Customer not found" });
  const invoices = await Invoice.find({ customerId: customer.customerId }).sort({ dueDate: 1 }).lean();
  const room = await Room.findOne({ customerId: customer.customerId }).lean();
  return res.json({ customer, room, invoices });
});

dashboard.get("/owner/:ownerId", async (req, res) => {
  if (req.user?.role !== "owner" || req.user.id !== req.params.ownerId) return res.status(403).json({ message: "Cannot access this dashboard" });
  const owner = await Owner.findOne({ ownerId: req.params.ownerId }).lean();
  if (!owner) return res.status(404).json({ message: "Owner not found" });
  const rooms = await Room.find({ ownerId: owner.ownerId }).lean();
  const customerIds = rooms.flatMap((room) => room.customerId ? [room.customerId] : []);
  const customers = await Customer.find({ customerId: { $in: customerIds } }).select("-password").lean();
  const invoices = await Invoice.find({ roomId: { $in: rooms.map((room) => room.roomId) } }).sort({ dueDate: 1 }).lean();
  const cashPayments = await Transaction.find({ roomId: { $in: rooms.map((room) => room.roomId) }, status: "cash_pending" }).lean();
  return res.json({ owner, rooms, customers, invoices, cashPayments });
});

export default dashboard;