import { Router } from "express";
import bcrypt from "bcrypt";
import Owner from "../../../models/owner";
import { requireAuth, requireRole } from "../../../middlewares/auth";

const admin = Router();
admin.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production") return res.status(404).json({ message: "Admin management is disabled outside production" });
  return next();
}, requireAuth, requireRole("admin"));

admin.post("/owners", async (req, res) => {
  const { ownerId, username, firstname, lastname, email, phoneNumber, password } = req.body;
  if (![ownerId, username, firstname, lastname, email, phoneNumber, password].every(Boolean)) {
    return res.status(400).json({ message: "All owner fields are required" });
  }
  const owner = await Owner.create({
    ownerId, username, firstname, lastname, email, phoneNumber,
    password: await bcrypt.hash(password, 12),
  });
  const ownerData = owner.toObject();
  const { password: _password, ...safeOwner } = ownerData;
  return res.status(201).json({ owner: safeOwner });
});

admin.delete("/owners/:ownerId", async (req, res) => {
  const result = await Owner.deleteOne({ ownerId: req.params.ownerId });
  if (!result.deletedCount) return res.status(404).json({ message: "Owner not found" });
  return res.status(204).send();
});

export default admin;
