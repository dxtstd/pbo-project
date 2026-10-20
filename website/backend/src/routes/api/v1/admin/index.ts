import { Router } from "express";
import bcrypt from "bcrypt";
import Owner from "../../../../models/owner";
import Customer from "../../../../models/customer";
import Room from "../../../../models/room";
import Invoice from "../../../../models/invoice";
import Transaction from "../../../../models/transaction";
import NotificationTemplate from "../../../../models/notificationTemplate";
import SiteContent from "../../../../models/siteContent";
import { requireAuth, isAdmin } from "../../../../middlewares/auth";
import { isValidPhoneNumber, normalizePhoneNumber } from "../../../../utils/phone";
import { nextOwnerId } from "../../../../utils/identifiers";
import { config } from "../../../../config/env";
import { defaultNotificationTemplates, renderNotificationTemplate, type NotificationAudience, type NotificationTemplateKey } from "../../../../services/notification";

const admin = Router();
const RESET_CONFIRMATION = "RESET-ALL";

admin.use(
  requireAuth,
  isAdmin,
);

admin.post("/reset", async (req, res) => {
  const confirmation = typeof req.body?.confirmation === "string"
    ? req.body.confirmation.trim()
    : "";
  if (confirmation !== RESET_CONFIRMATION) {
    return res.status(400).json({ message: `Ketik ${RESET_CONFIRMATION} untuk menghapus seluruh data aplikasi` });
  }

  const results = await Promise.all([
    Owner.deleteMany({}),
    Customer.deleteMany({}),
    Room.deleteMany({}),
    Invoice.deleteMany({}),
    Transaction.deleteMany({}),
    NotificationTemplate.deleteMany({}),
    SiteContent.deleteMany({}),
  ]);
  const deletedCount = results.reduce((total, result) => total + result.deletedCount, 0);
  return res.json({ message: "Seluruh data aplikasi berhasil dihapus", deletedCount });
});

admin.get("/site-content", async (_req, res) => {
  const content = await SiteContent.findOne({ key: "landing" }).lean();
  return res.json({ content });
});

admin.put("/site-content", async (req, res) => {
  const fields = ["siteName", "heroTitle", "heroDescription", "facilitiesTitle", "facilitiesDescription", "contactTitle", "contactDescription", "location", "whatsapp"] as const;
  const updates = Object.fromEntries(fields.map((field) => [field, String(req.body[field] || "").trim()]));
  if (Object.values(updates).some((value) => !value)) return res.status(400).json({ message: "Semua konten landing page wajib diisi" });
  const content = await SiteContent.findOneAndUpdate(
    { key: "landing" },
    { $set: { ...updates, key: "landing" } },
    { new: true, upsert: true, runValidators: true },
  ).lean();
  return res.json({ content });
});

admin.get("/notification/templates", async (_req, res) => {
  const saved = await NotificationTemplate.find({ ownerId: "__global__" }).lean();
  const eventsByAudience: Record<NotificationAudience, NotificationTemplateKey[]> = {
    customer: ["invoice_created", "invoice_due", "payment_received"],
    owner: ["cash_requested", "payment_received", "extension_requested"],
  };
  const templates = (["customer", "owner"] as NotificationAudience[]).flatMap((audience) =>
    eventsByAudience[audience].map((event) => {
      const fallback = defaultNotificationTemplates[audience][event];
      const item = saved.find((candidate) => candidate.audience === audience && candidate.event === event);
      return { audience, event, header: item?.header ?? fallback.header, content: item?.content ?? fallback.content };
    }),
  );
  return res.json({ templates });
});

admin.put("/notification/templates", async (req, res) => {
  const templates = req.body?.templates;
  if (!templates || typeof templates !== "object") return res.status(400).json({ message: "Format template tidak valid" });
  const eventsByAudience: Record<NotificationAudience, NotificationTemplateKey[]> = {
    customer: ["invoice_created", "invoice_due", "payment_received"],
    owner: ["cash_requested", "payment_received", "extension_requested"],
  };
  for (const audience of ["customer", "owner"] as NotificationAudience[]) {
    for (const event of eventsByAudience[audience]) {
      const value = templates[`${audience}:${event}`];
      if (!value || typeof value.header !== "string" || typeof value.content !== "string" || !value.content.trim()) {
        return res.status(400).json({ message: `Template ${audience}:${event} wajib diisi` });
      }
      await NotificationTemplate.findOneAndUpdate(
        { ownerId: "__global__", audience, event },
        { $set: { ownerId: "__global__", audience, event, name: event, header: value.header.trim(), content: value.content.trim(), active: true } },
        { upsert: true, runValidators: true },
      );
    }
  }
  return res.json({ message: "Template notifikasi berhasil disimpan" });
});

admin.get("/notification/recipients", async (_req, res) => {
  const [owners, customers] = await Promise.all([
    Owner.find().select("ownerId firstname lastname phoneNumber notificationPhone").lean(),
    Customer.find().select("customerId firstname lastname phoneNumber").lean(),
  ]);
  let status: unknown = { status: "unknown" };
  try {
    const response = await fetch(`${config.notificationHttpUrl}/status`);
    if (response.ok) status = await response.json();
  } catch {
    status = { status: "unavailable" };
  }
  return res.json({
    status,
    owners: owners.map((owner) => ({
      id: owner.ownerId,
      label: `Owner: ${owner.firstname} ${owner.lastname}`.trim(),
      phone: owner.notificationPhone || owner.phoneNumber,
    })),
    customers: customers.map((customer) => ({
      id: customer.customerId,
      label: `Customer: ${customer.firstname} ${customer.lastname}`.trim(),
      phone: customer.phoneNumber,
    })),
  });
});

admin.post("/notification/test", async (req, res) => {
  const recipient = typeof req.body?.recipient === "string" ? req.body.recipient.trim() : "";
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!recipient || !message) return res.status(400).json({ message: "Nomor penerima dan pesan wajib diisi" });
  const phone = normalizePhoneNumber(recipient);
  if (!isValidPhoneNumber(phone)) return res.status(400).json({ message: "Nomor WhatsApp tidak valid" });
  try {
    const response = await fetch(`${config.notificationHttpUrl}/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipient: phone, message }),
    });

    admin.post("/notification/test-event", async (req, res) => {
      const recipient = typeof req.body?.recipient === "string" ? req.body.recipient.trim() : "";
      const event = req.body?.event as NotificationTemplateKey;
      const audience = req.body?.audience as NotificationAudience;
      if (!recipient || !Object.keys(defaultNotificationTemplates.customer).includes(event) || !["owner", "customer"].includes(audience)) {
        return res.status(400).json({ message: "Event dan penerima testing tidak valid" });
      }
      const phone = normalizePhoneNumber(recipient);
      if (!isValidPhoneNumber(phone)) return res.status(400).json({ message: "Nomor WhatsApp tidak valid" });
      const message = await renderNotificationTemplate(event, {
        customer_name: "Customer Test",
        owner_name: "Owner Test",
        payment: "Rp500.000",
        invoice_number: "INV-TEST",
        due_date: new Date().toLocaleDateString("id-ID"),
        days_before_due: 7,
        expires_at: new Date(Date.now() + 86400000).toLocaleString("id-ID"),
        payment_method: "Cash",
        room_name: "Kamar Test",
        months: 1,
        dashboard_link: audience === "owner" ? "/dashboard/owner" : "/dashboard/customer/payment",
        name_business: "Kost Lorem Ipsum",
      }, audience);
      try {
        const response = await fetch(`${config.notificationHttpUrl}/test`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ recipient: phone, message }),
        });
        const result = await response.json().catch(() => ({})) as { message?: string };
        if (!response.ok) return res.status(502).json({ message: result.message || "Test event gagal dikirim" });
        return res.json({ sent: true });
      } catch {
        return res.status(503).json({ message: "Notification service unavailable" });
      }
    });
    const result = await response.json().catch(() => ({})) as { message?: string };
    if (!response.ok) return res.status(502).json({ message: result.message || "Test notification gagal dikirim" });
    return res.json({ sent: true });
  } catch {
    return res.status(503).json({ message: "Notification service unavailable" });
  }
});

/**
 * @openapi
 * /api/v1/admin/owners:
 *   get:
 *     summary: List owners
 *     security: [{ bearerAuth: [] }]
 *     description: Admin-only owner listing with passwords excluded.
 *     responses:
 *       200: { description: Owner list }
 *       401: { description: Authentication required }
 *       403: { description: Admin role required }
 */
admin.get("/owners", async (_req, res) => {
  const owners = await Owner.find().select("-password").lean();
  return res.json({ owners });
});

/**
 * @openapi
 * /api/v1/admin/owners:
 *   post:
 *     summary: Create an owner
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ownerId, username, firstname, lastname, email, phoneNumber, password]
 *             properties:
 *               ownerId: { type: string }
 *               username: { type: string }
 *               firstname: { type: string }
 *               lastname: { type: string }
 *               email: { type: string, format: email }
 *               phoneNumber: { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       201: { description: Owner created }
 *       400: { description: Missing required field }
 *       401: { description: Authentication required }
 *       403: { description: Admin role required }
 */
admin.post("/owners", async (req, res) => {
  const { username, firstname, lastname, email, phoneNumber, password } = req.body;
  if (![username, firstname, lastname, email, phoneNumber, password].every(Boolean)) {
    return res.status(400).json({ message: "All owner fields are required" });
  }
  if (!isValidPhoneNumber(String(phoneNumber))) return res.status(400).json({ message: "Nomor telepon tidak valid" });

  const owner = await Owner.create({
    ownerId: await nextOwnerId(),
    username,
    firstname,
    lastname,
    email,
    phoneNumber: normalizePhoneNumber(String(phoneNumber)),
    password: await bcrypt.hash(password, 12),
  });
  const ownerData = owner.toObject();
  const { password: _password, ...safeOwner } = ownerData;
  return res.status(201).json({ owner: safeOwner });
});

/**
 * @openapi
 * /api/v1/admin/owners/{ownerId}:
 *   get:
 *     summary: Get one owner
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: ownerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Owner record }
 *       401: { description: Authentication required }
 *       403: { description: Admin role required }
 *       404: { description: Owner not found }
 */
admin.get("/owners/:ownerId", async (req, res) => {
  const owner = await Owner.findOne({ ownerId: req.params.ownerId }).select("-password").lean();
  if (!owner) return res.status(404).json({ message: "Owner not found" });
  return res.json({ owner });
});

/**
 * @openapi
 * /api/v1/admin/owners/{ownerId}:
 *   patch:
 *     summary: Update an owner
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
 *           schema: { type: object, description: Editable owner fields and optional password }
 *     responses:
 *       200: { description: Owner updated }
 *       401: { description: Authentication required }
 *       403: { description: Admin role required }
 *       404: { description: Owner not found }
 */
admin.patch("/owners/:ownerId", async (req, res) => {
  const allowed = ["username", "firstname", "lastname", "email", "phoneNumber"] as const;
  const updates = Object.fromEntries(
    allowed.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]]),
  );
  if (updates.phoneNumber !== undefined) {
    if (!isValidPhoneNumber(String(updates.phoneNumber))) return res.status(400).json({ message: "Nomor telepon tidak valid" });
    updates.phoneNumber = normalizePhoneNumber(String(updates.phoneNumber));
  }
  if (req.body.password) updates.password = await bcrypt.hash(String(req.body.password), 12);
  const owner = await Owner.findOneAndUpdate(
    { ownerId: req.params.ownerId },
    updates,
    { new: true, runValidators: true },
  ).select("-password").lean();
  if (!owner) return res.status(404).json({ message: "Owner not found" });
  return res.json({ owner });
});

/**
 * @openapi
 * /api/v1/admin/owners/{ownerId}:
 *   delete:
 *     summary: Delete an owner
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: ownerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Owner deleted }
 *       401: { description: Authentication required }
 *       403: { description: Admin role required }
 *       404: { description: Owner not found }
 */
admin.delete("/owners/:ownerId", async (req, res) => {
  const result = await Owner.deleteOne({ ownerId: req.params.ownerId });
  if (!result.deletedCount) return res.status(404).json({ message: "Owner not found" });
  return res.status(204).send();
});

export default admin;
