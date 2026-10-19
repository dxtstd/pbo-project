import { Router } from "express";
import { PaymentService } from "../../../../services/payment";
import type { MidtransCharge } from "../../../../services/midtrans";

export const createWebhookRoutes = (paymentService: PaymentService): Router => {
  const webhook = Router();
  webhook.post("/", async (req, res) => {
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
  return webhook;
};
