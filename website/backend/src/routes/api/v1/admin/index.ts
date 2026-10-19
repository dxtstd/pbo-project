import { Router } from "express";
import bcrypt from "bcrypt";
import Owner from "../../../../models/owner";
import SiteContent from "../../../../models/siteContent";
import { requireAuth, isAdmin } from "../../../../middlewares/auth";

const admin = Router();

admin.use(
  requireAuth,
  isAdmin,
);

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
  const { ownerId, username, firstname, lastname, email, phoneNumber, password } = req.body;
  if (![ownerId, username, firstname, lastname, email, phoneNumber, password].every(Boolean)) {
    return res.status(400).json({ message: "All owner fields are required" });
  }

  const owner = await Owner.create({
    ownerId,
    username,
    firstname,
    lastname,
    email,
    phoneNumber,
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
