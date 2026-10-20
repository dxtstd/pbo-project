import { Router } from "express";
import { PaymentService } from "../../../../services/payment";
import type { MidtransPaymentType } from "../../../../services/midtrans";

export const createOnlineRoutes = (paymentService: PaymentService): Router => {
  const online = Router();
  online.post("/", async (req, res) => {
    if (req.user?.role !== "customer") return res.status(403).json({ message: "Customer access required" });
    try {
      return res.status(201).json(await paymentService.createOnlinePayment(
        req.body.invoiceNumber,
        req.body.paymentType as MidtransPaymentType,
        req.user.id,
      ));
    } catch (error) {
      return res.status(409).json({ message: error instanceof Error ? error.message : "Online payment could not be created" });
    }
  });
  return online;
};
