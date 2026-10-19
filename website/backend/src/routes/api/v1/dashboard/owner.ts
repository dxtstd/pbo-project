import { Router } from "express";
import Customer from "../../../../models/customer";
import Invoice from "../../../../models/invoice";
import Owner from "../../../../models/owner";
import Room from "../../../../models/room";
import Transaction from "../../../../models/transaction";
import { config } from "../../../../config/env";
import { requireRole } from "../../../../middlewares/auth";

const ownerDashboard = Router();
const furnitureFee = 100000;
const roomSizes = ["small", "medium", "large"];

ownerDashboard.use(requireRole("owner"));

ownerDashboard.get("/:ownerId/notification", async (req, res) => {
  if (req.user?.id !== req.params.ownerId) return res.status(403).json({ message: "Cannot access this notification setup" });
  try {
    const response = await fetch(`${config.notificationHttpUrl}/status`);
    if (!response.ok) return res.status(502).json({ message: "Notification service unavailable" });
    return res.json(await response.json());
  } catch {
    return res.status(503).json({ message: "Notification service unavailable" });
  }
});

ownerDashboard.post("/:ownerId/notification/pair", async (req, res) => {
  if (req.user?.id !== req.params.ownerId) return res.status(403).json({ message: "Cannot pair this notification setup" });
  try {
    const response = await fetch(`${config.notificationHttpUrl}/pair`, { method: "POST" });
    if (!response.ok) return res.status(502).json({ message: "Notification pairing could not be started" });
    return res.json(await response.json());
  } catch {
    return res.status(503).json({ message: "Notification service unavailable" });
  }
});

ownerDashboard.post("/:ownerId/notification/test", async (req, res) => {
  if (req.user?.id !== req.params.ownerId) return res.status(403).json({ message: "Cannot test this notification setup" });
  const { recipient, scenario } = req.body as { recipient?: string; scenario?: string };
  if (!["cash_request", "transaction_success"].includes(scenario || "")) {
    return res.status(400).json({ message: "Notification scenario tidak valid" });
  }
  const phone = recipient?.replace(/\D/g, "");
  if (!phone || phone.length < 10 || phone.length > 15) {
    return res.status(400).json({ message: "Nomor WhatsApp tidak valid" });
  }
  try {
    const response = await fetch(`${config.notificationHttpUrl}/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipient: phone,
        message: scenario === "cash_request"
          ? "Kost Camp M2\nPERMINTAAN PEMBAYARAN CASH\nAda customer yang meminta konfirmasi pembayaran cash. Silakan buka dashboard untuk memeriksa."
          : "Kost Camp M2\nTRANSAKSI BERHASIL\nPembayaran customer berhasil diterima dan tercatat di sistem.",
      }),
    });
    if (!response.ok) return res.status(502).json({ message: "Test notification could not be sent" });
    return res.json({ sent: true });
  } catch {
    return res.status(503).json({ message: "Notification service unavailable" });
  }
});

ownerDashboard.get("/:ownerId", async (req, res) => {
  if (req.user?.id !== req.params.ownerId) return res.status(403).json({ message: "Cannot access this dashboard" });
  const owner = await Owner.findOne({ ownerId: req.params.ownerId }).lean();
  if (!owner) return res.status(404).json({ message: "Owner not found" });

  const rooms = await Room.find({ ownerId: owner.ownerId }).lean();
  const roomIds = rooms.map((room) => room.roomId);
  const customerIds = rooms.flatMap((room) => room.customerId ? [room.customerId] : []);
  const customers = await Customer.find({ customerId: { $in: customerIds } }).select("-password").lean();
  const invoices = await Invoice.find({ roomId: { $in: roomIds } }).sort({ dueDate: 1 }).lean();
  const cashPayments = await Transaction.find({ roomId: { $in: roomIds }, status: "cash_pending" }).lean();
  const transactions = await Transaction.find({ roomId: { $in: roomIds } }).sort({ paymentDate: -1 }).limit(100).lean();

  return res.json({ owner, rooms, customers, invoices, cashPayments, transactions });
});

ownerDashboard.post("/:ownerId/rooms", async (req, res) => {
  if (req.user?.id !== req.params.ownerId) return res.status(403).json({ message: "Cannot modify this dashboard" });
  const { name, type, price, withFurniture } = req.body as { name?: string; type?: string; price?: number; withFurniture?: boolean };
  if (!name?.trim() || !type?.trim() || !roomSizes.includes(type) || typeof price !== "number" || price < 0) {
    return res.status(400).json({ message: "Nama, tipe, dan harga kamar wajib diisi" });
  }

  const room = await Room.create({
    roomId: `ROOM-${Date.now().toString(36).toUpperCase()}`,
    ownerId: req.params.ownerId,
    name: name.trim(),
    type: type.trim(),
    price: price + (withFurniture ? furnitureFee : 0),
    withFurniture: Boolean(withFurniture),
    isOccupied: false,
  });
  return res.status(201).json(room);
});

ownerDashboard.patch("/:ownerId/rooms/:roomId", async (req, res) => {
  if (req.user?.id !== req.params.ownerId) return res.status(403).json({ message: "Cannot modify this dashboard" });
  const { name, type, price, withFurniture } = req.body as { name?: string; type?: string; price?: number; withFurniture?: boolean };
  if (!name?.trim() || !type?.trim() || !roomSizes.includes(type) || typeof price !== "number" || price < 0) {
    return res.status(400).json({ message: "Nama, ukuran, dan harga kamar wajib diisi" });
  }

  const room = await Room.findOneAndUpdate(
    { roomId: req.params.roomId, ownerId: req.params.ownerId },
    { name: name.trim(), type: type.trim(), price: price + (withFurniture ? furnitureFee : 0), withFurniture: Boolean(withFurniture) },
    { new: true, runValidators: true },
  ).lean();
  if (!room) return res.status(404).json({ message: "Kamar tidak ditemukan" });
  return res.json(room);
});

export default ownerDashboard;
