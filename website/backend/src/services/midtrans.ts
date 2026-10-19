import crypto from "node:crypto";

export type MidtransPaymentType = "qris" | "bank_transfer";

export interface MidtransCharge {
  transaction_status: string;
  order_id: string;
  gross_amount: string;
  signature_key: string;
  status_code?: string;
  fraud_status?: string;
}

export interface PaymentGateway {
  charge(input: {
    orderId: string;
    amount: number;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    paymentType: MidtransPaymentType;
  }): Promise<{
    orderId: string;
    redirectUrl?: string;
    token?: string;
    actions?: { name: string; url: string }[];
    vaNumbers?: { bank: string; va_number: string }[];
  }>;
  verifyCallback(charge: MidtransCharge): boolean;
}

export class MidtransGateway implements PaymentGateway {
  private readonly serverKey = process.env.MIDTRANS_SERVER_KEY;
  private readonly apiBase = process.env.MIDTRANS_ENVIRONMENT === "production"
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";

  public async charge(input: {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentType: MidtransPaymentType;
  }): Promise<{ orderId: string; redirectUrl?: string; token?: string; actions?: { name: string; url: string }[]; vaNumbers?: { bank: string; va_number: string }[] }> {
  if (!this.serverKey) throw new Error("MIDTRANS_SERVER_KEY is not configured");
  const body = input.paymentType === "qris"
    ? {
        payment_type: "qris",
        transaction_details: { order_id: input.orderId, gross_amount: input.amount },
        customer_details: {
          first_name: input.customerName,
          email: input.customerEmail,
          phone: input.customerPhone,
        },
      }
    : {
        payment_type: "bank_transfer",
        transaction_details: { order_id: input.orderId, gross_amount: input.amount },
        customer_details: {
          first_name: input.customerName,
          email: input.customerEmail,
          phone: input.customerPhone,
        },
        bank_transfer: { bank: "bca" },
      };

  const response = await fetch(`${this.apiBase}/v2/charge`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${this.serverKey}:`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Midtrans charge failed with status ${response.status}: ${await response.text()}`);
  }

  const result = await response.json() as { order_id: string; token?: string; redirect_url?: string; actions?: { name: string; url: string }[]; va_numbers?: { bank: string; va_number: string }[] };
  return { orderId: result.order_id, token: result.token, redirectUrl: result.redirect_url, actions: result.actions, vaNumbers: result.va_numbers };
  }

  public verifyCallback(charge: MidtransCharge): boolean {
  if (!this.serverKey) throw new Error("MIDTRANS_SERVER_KEY is not configured");
  const signature = crypto
    .createHash("sha512")
    .update(`${charge.order_id}${charge.status_code || ""}${charge.gross_amount}${this.serverKey}`)
    .digest("hex");
  const expected = Buffer.from(signature);
  const received = Buffer.from(charge.signature_key || "");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  }
}

export const isSuccessfulMidtransStatus = (status: string): boolean =>
  status === "settlement" || status === "capture";
