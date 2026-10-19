import { Router } from "express";
import { PaymentService } from "../../../../services/payment";
import type { MidtransPaymentType } from "../../../../services/midtrans";

export const createOnlineRoutes = (paymentService: PaymentService): Router => {
  const online = Router();
  online.post("/", async (req, res) => {
    if (req.user?.role !== "customer") return res.status(403).json({ message: "Customer access required" });
    return res.status(201).json(await paymentService.createOnlinePayment(
      req.body.invoiceNumber,
      req.body.paymentType as MidtransPaymentType,
      req.user.id,
    ));
  });
  return online;
};
