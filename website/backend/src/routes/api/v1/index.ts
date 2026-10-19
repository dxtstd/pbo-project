import { Router } from "express";
import dashboard from "./dashboard";
import payment from "./payment";
import auth from "./auth";
import admin from "./admin";
import { requireAuth } from "../../../middlewares/auth";

const APIv1 = Router();
APIv1.use("/dashboard", dashboard);
APIv1.use("/payment", payment);
APIv1.use("/auth", auth);
APIv1.use("/admin", admin);
APIv1.use("/", auth);
APIv1.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

export default APIv1;