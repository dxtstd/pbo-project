import { Router } from "express";
import bcrypt from "bcrypt";
import Customer from "../../../../models/customer";
import Owner from "../../../../models/owner";
import { config } from "../../../../config/env";
import { createToken, requireAuth } from "../../../../middlewares/auth";

const auth = Router();

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate an admin, owner, or customer
 *     description: Checks configured admin credentials or bcrypt-hashed MongoDB credentials and returns a role-bearing JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: JWT and authenticated user }
 *       400: { description: Missing username or password }
 *       401: { description: Invalid credentials }
 */
auth.post("/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) return res.status(400).json({ message: "Username and password are required" });

  if (username === config.adminUsername && password === config.adminPassword) {
    const user = { id: config.adminUsername, role: "admin" as const, username: config.adminUsername };
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

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     summary: Get the authenticated user profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User identity and profile }
 *       401: { description: Missing, invalid, or expired JWT }
 */
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
