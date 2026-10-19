import { Router } from "express";
import dashboard from "./dashboard";
import payment from "./payment";
import auth from "./auth";
import admin from "./admin";
import { requireAuth } from "../../../middlewares/auth";
import SiteContent from "../../../models/siteContent";

const APIv1 = Router();
APIv1.use("/dashboard", dashboard);
APIv1.use("/payment", payment);
APIv1.use("/auth", auth);
APIv1.use("/admin", admin);
APIv1.use("/", auth);
APIv1.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));
APIv1.get("/site-content", async (_req, res) => {
  const content = await SiteContent.findOne({ key: "landing" }).lean();
  return res.json({ content });
});

export default APIv1;