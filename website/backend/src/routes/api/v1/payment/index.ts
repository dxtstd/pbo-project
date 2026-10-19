import { Router } from "express";
import { PaymentService } from "../../../../services/payment";
import type { MidtransCharge, MidtransPaymentType } from "../../../../services/midtrans";
import { requireAuth } from "../../../../middlewares/auth";

const payment = Router();
const paymentService = new PaymentService();
payment.use(requireAuth);

payment.post("/cash", async (req, res) => {
  return res.status(201).json(await paymentService.requestCash(req.body.invoiceNumber));
});

payment.post("/charge", async (req, res) => {
  return res.status(201).json(await paymentService.createOnlinePayment(
    req.body.invoiceNumber,
    req.body.paymentType as MidtransPaymentType,
  ));
});

payment.post("/callback", async (req, res) => {
  const callback = req.body as MidtransCharge;
  if (!callback.order_id || !callback.status_code || !callback.gross_amount || !callback.signature_key) {
    return res.status(400).json({ message: "Incomplete Midtrans callback" });
  }
  try {
    await paymentService.processMidtransCallback(callback);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid Midtrans signature") {
      return res.status(401).json({ message: error.message });
    }
    throw error;
  }
  return res.json({ received: true });
});

payment.post("/cash/:transactionId/confirm", async (req, res) => {
  return res.json(await paymentService.confirmCash(req.params.transactionId));
});

export default payment;
