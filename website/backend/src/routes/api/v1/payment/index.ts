import { Router } from "express";
import { requireAuth } from "../../../../middlewares/auth";
import { PaymentService } from "../../../../services/payment";
import { createCashRoutes } from "./cash";
import { createOnlineRoutes } from "./online";
import { createWebhookRoutes } from "./webhook";

const payment = Router();
const paymentService = new PaymentService();

payment.use("/callback", createWebhookRoutes(paymentService));
payment.use(requireAuth);
payment.use("/cash", createCashRoutes(paymentService));
payment.use("/charge", createOnlineRoutes(paymentService));

export default payment;
