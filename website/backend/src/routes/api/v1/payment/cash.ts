import { Router } from "express";
import { PaymentService } from "../../../../services/payment";

export const createCashRoutes = (paymentService: PaymentService): Router => {
  const cash = Router();
  cash.post("/", async (req, res) => res.status(201).json(await paymentService.requestCash(req.body.invoiceNumber)));
  cash.post("/:transactionId/confirm", async (req, res) => res.json(await paymentService.confirmCash(req.params.transactionId)));
  return cash;
};
