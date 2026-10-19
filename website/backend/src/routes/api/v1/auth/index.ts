import { Router } from "express";
import bcrypt from "bcrypt";
import Customer from "../../../../models/customer";
import Owner from "../../../../models/owner";
import { config } from "../../../../config/env";
import { createToken, requireAuth } from "../../../../middlewares/auth";

const auth = Router();

auth.post("/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) return res.status(400).json({ message: "Username and password are required" });

  if (username === config.adminEmail && password === config.adminPassword) {
    const user = { id: config.adminEmail, role: "admin" as const, username: config.adminEmail };
    return res.json({ token: createToken(user), user });
  }

  const owner = await Owner.findOne({ $or: [{ username }, { email: username }] });
  if (owner && await bcrypt.compare(password, owner.password)) {
    const user = { id: owner.ownerId, role: "owner" as const, username: owner.username };
    return res.json({ token: createToken(user), user });
  }

  const customer = await Customer.findOne({ username });
  if (customer && await bcrypt.compare(password, customer.password)) {
    const user = { id: customer.customerId, role: "customer" as const, username: customer.username };
    return res.json({ token: createToken(user), user });
  }

  return res.status(401).json({ message: "Invalid username or password" });
});

auth.get("/me", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Authentication required" });
  if (user.role === "admin") return res.json({ user });

  const profile = user.role === "owner"
    ? await Owner.findOne({ ownerId: user.id }).select("-password").lean()
    : await Customer.findOne({ customerId: user.id }).select("-password").lean();
  if (!profile) return res.status(401).json({ message: "User no longer exists" });
  return res.json({ user, profile });
});

export default auth;
