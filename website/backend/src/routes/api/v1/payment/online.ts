import { Router } from "express";
import { PaymentService } from "../../../../services/payment";
import type { MidtransPaymentType } from "../../../../services/midtrans";

export const createOnlineRoutes = (paymentService: PaymentService): Router => {
  const online = Router();
  online.post("/", async (req, res) => res.status(201).json(await paymentService.createOnlinePayment(
    req.body.invoiceNumber,
    req.body.paymentType as MidtransPaymentType,
  )));
  return online;
};
