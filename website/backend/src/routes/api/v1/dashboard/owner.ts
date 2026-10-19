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

/**
 * @openapi
 * /api/v1/dashboard/owner/{ownerId}/customers:
 *   get:
 *     summary: List an owner's customers
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: ownerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Customer list }
 *       401: { description: Authentication required }
 *       403: { description: Owner access denied }
 */
ownerDashboard.get("/:ownerId/customers", async (req, res) => {
  if (req.user?.id !== req.params.ownerId) return res.status(403).json({ message: "Cannot access these customers" });
  const rooms = await Room.find({ ownerId: req.params.ownerId }).select("customerId").lean();
  const customerIds = rooms.flatMap((room) => room.customerId ? [room.customerId] : []);
  const customers = await Customer.find({ customerId: { $in: customerIds } }).select("-password").lean();
  return res.json({ customers });
});

/**
 * Checks whether a customer is assigned to one of an owner's rooms.
 *
 * @param ownerId Owner identifier.
 * @param customerId Customer identifier.
 * @returns True when an owner room references the customer.
 */
const customerBelongsToOwner = async (ownerId: string, customerId: string): Promise<boolean> => {
  const room = await Room.exists({ ownerId, customerId });
  return Boolean(room);
};

/**
 * @openapi
 * /api/v1/dashboard/owner/{ownerId}/customers:
 *   post:
 *     summary: Create a customer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: ownerId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [customerId, username, firstname, lastname, phoneNumber, password] }
 *     responses:
 *       201: { description: Customer created }
 *       400: { description: Missing required field }
 *       401: { description: Authentication required }
 *       403: { description: Owner access denied }
 */
ownerDashboard.post("/:ownerId/customers", async (req, res) => {
  if (req.user?.id !== req.params.ownerId) return res.status(403).json({ message: "Cannot manage these customers" });
  const { customerId, username, firstname, lastname, phoneNumber, password } = req.body;
  if (![customerId, username, firstname, lastname, phoneNumber, password].every(Boolean)) {
    return res.status(400).json({ message: "All customer fields are required" });
  }
  const bcrypt = await import("bcrypt");
  const customer = await Customer.create({
    customerId, username, firstname, lastname, phoneNumber,
    password: await bcrypt.hash(String(password), 12),
  });
  const { password: _password, ...safeCustomer } = customer.toObject();
  return res.status(201).json({ customer: safeCustomer });
});

/**
 * @openapi
 * /api/v1/dashboard/owner/{ownerId}/customers/{customerId}:
 *   patch:
 *     summary: Update an assigned customer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: ownerId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, description: Editable customer fields }
 *     responses:
 *       200: { description: Customer updated }
 *       401: { description: Authentication required }
 *       403: { description: Owner access denied }
 *       404: { description: Customer not found or not assigned }
 */
ownerDashboard.patch("/:ownerId/customers/:customerId", async (req, res) => {
  if (req.user?.id !== req.params.ownerId) return res.status(403).json({ message: "Cannot manage these customers" });
  if (!await customerBelongsToOwner(req.params.ownerId, req.params.customerId)) {
    return res.status(404).json({ message: "Customer not found for this owner" });
  }
  const updates = { ...req.body };
  if (updates.password) {
    const bcrypt = await import("bcrypt");
    updates.password = await bcrypt.hash(String(updates.password), 12);
  }
  delete updates.customerId;
  const customer = await Customer.findOneAndUpdate(
    { customerId: req.params.customerId },
    updates,
    { new: true, runValidators: true },
  ).select("-password").lean();
  if (!customer) return res.status(404).json({ message: "Customer not found" });
  return res.json({ customer });
});

/**
 * @openapi
 * /api/v1/dashboard/owner/{ownerId}/customers/{customerId}:
 *   delete:
 *     summary: Delete an assigned customer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: ownerId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Customer deleted }
 *       401: { description: Authentication required }
 *       403: { description: Owner access denied }
 *       404: { description: Customer not found or not assigned }
 */
ownerDashboard.delete("/:ownerId/customers/:customerId", async (req, res) => {
  if (req.user?.id !== req.params.ownerId) return res.status(403).json({ message: "Cannot manage these customers" });
  if (!await customerBelongsToOwner(req.params.ownerId, req.params.customerId)) {
    return res.status(404).json({ message: "Customer not found for this owner" });
  }
  const deleted = await Customer.deleteOne({ customerId: req.params.customerId });
  if (!deleted.deletedCount) return res.status(404).json({ message: "Customer not found" });
  return res.status(204).send();
});

/**
 * @openapi
 * /api/v1/dashboard/owner/{ownerId}/notification:
 *   get:
 *     summary: Get WhatsApp notification status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Notification service status }
 *       401: { description: Authentication required }
 *       403: { description: Owner access denied }
 *       502: { description: Notification service unavailable }
 */
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

/**
 * @openapi
 * /api/v1/dashboard/owner/{ownerId}/notification/pair:
 *   post:
 *     summary: Start WhatsApp pairing
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Pairing state }
 *       401: { description: Authentication required }
 *       403: { description: Owner access denied }
 *       502: { description: Pairing service unavailable }
 */
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

/**
 * @openapi
 * /api/v1/dashboard/owner/{ownerId}/notification/test:
 *   post:
 *     summary: Send an owner notification test
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipient, scenario]
 *             properties:
 *               recipient: { type: string, description: WhatsApp number }
 *               scenario: { type: string, enum: [cash_request, transaction_success] }
 *     responses:
 *       200: { description: Test notification sent }
 *       400: { description: Invalid recipient or scenario }
 *       401: { description: Authentication required }
 *       403: { description: Owner access denied }
 *       502: { description: Notification delivery failed }
 */
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

/**
 * @openapi
 * /api/v1/dashboard/owner/{ownerId}:
 *   get:
 *     summary: Get the owner dashboard
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Owner, rooms, customers, invoices, and transactions }
 *       401: { description: Authentication required }
 *       403: { description: Owner access denied }
 *       404: { description: Owner not found }
 */
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

/**
 * @openapi
 * /api/v1/dashboard/owner/{ownerId}/rooms:
 *   post:
 *     summary: Create a room
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, price]
 *             properties:
 *               name: { type: string }
 *               type: { type: string, enum: [small, medium, large] }
 *               price: { type: number, minimum: 0 }
 *               withFurniture: { type: boolean }
 *     responses:
 *       201: { description: Room created }
 *       400: { description: Invalid room data }
 *       401: { description: Authentication required }
 *       403: { description: Owner access denied }
 */
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

/**
 * @openapi
 * /api/v1/dashboard/owner/{ownerId}/rooms/{roomId}:
 *   patch:
 *     summary: Update an owner's room
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Room updated }
 *       400: { description: Invalid room data }
 *       401: { description: Authentication required }
 *       403: { description: Owner access denied }
 *       404: { description: Room not found }
 */
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
