import { Router } from "express";
import { PaymentService } from "../../../../services/payment";

export const createCashRoutes = (paymentService: PaymentService): Router => {
  const cash = Router();
  cash.post("/", async (req, res) => {
    if (req.user?.role !== "customer") return res.status(403).json({ message: "Customer access required" });
    try {
      return res.status(201).json(await paymentService.requestCash(req.body.invoiceNumber, req.user.id));
    } catch (error) {
      return res.status(409).json({ message: error instanceof Error ? error.message : "Cash payment could not be requested" });
    }
  });
  cash.post("/:transactionId/cancel", async (req, res) => {
    if (req.user?.role !== "customer") return res.status(403).json({ message: "Customer access required" });
    try {
      return res.json(await paymentService.cancelCash(req.params.transactionId, req.user.id));
    } catch (error) {
      return res.status(409).json({ message: error instanceof Error ? error.message : "Cash payment could not be cancelled" });
    }
  });
  cash.post("/:transactionId/confirm", async (req, res) => {
    if (req.user?.role !== "owner") return res.status(403).json({ message: "Owner access required" });
    return res.json(await paymentService.confirmCash(req.params.transactionId, req.user.id));
  });
  return cash;
};
