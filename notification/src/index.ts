import { createServer } from "node:http";
import env from "dotenv";
import { WebSocketServer } from "ws";
import { ConsoleLogger, createStore, WaClient } from "zapo-js";

const environment = process.env.NODE_ENV || "development";
env.config({ path: `.env.${environment}` });
env.config();

const port = Number(process.env.PORT) || 4000;
const authSessionId = process.env.ZAPO_SESSION_ID || "kost-notification";

const store = createStore({});
const zapo = new WaClient({ store, sessionId: authSessionId }, new ConsoleLogger(
  process.env.LOG_LEVEL === "debug" ? "debug" : "info",
));

zapo.on("auth_qr", ({ qr }) => {
  console.log(`Scan this QR code to connect WhatsApp:\n${qr}`);
});

zapo.on("auth_paired", ({ credentials }) => {
  console.log(`WhatsApp paired as ${credentials.meJid}`);
});

zapo.on("connection", ({ status }) => {
  console.log(`WhatsApp connection status: ${status}`);
  if (status === "close") {
    setTimeout(() => void zapo.connect(), 5_000);
  }
});

const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
};

const sendEvent = async (event: Record<string, unknown>): Promise<void> => {
  if (!["invoice_due", "payment_received"].includes(String(event.type))) return;

  const recipient = String(event.type === "invoice_due" ? event.customerPhone : event.ownerPhone);
  if (!recipient) throw new Error("Notification event has no recipient phone number");

  const message = event.type === "invoice_due"
    ? [
        `Halo ${event.customerName},`,
        `tagihan ${event.invoiceNumber} sebesar Rp${event.amount} akan jatuh tempo pada ${event.dueDate}.`,
        `Ini adalah pengingat H-${event.daysBeforeDue}.`,
      ].join("\n")
    : [
        `Pembayaran diterima dari ${event.customerName}.`,
        `Invoice: ${event.invoiceNumber || "-"}`,
        `Jumlah: Rp${event.amount}`,
        `Metode: ${event.paymentMethod}`,
      ].join("\n");

  await zapo.message.send(normalizePhone(recipient), message);
};

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", whatsapp: zapo.getState() }));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ code: 404, message: "Not Found" }));
});

const websocket = new WebSocketServer({ server });
websocket.on("connection", (socket) => {
  socket.on("message", async (raw) => {
    try {
      const event = JSON.parse(raw.toString()) as Record<string, unknown>;
      await sendEvent(event);
    } catch (error) {
      console.error("Failed to process notification event", error);
    }
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Notification service is running on port ${port}`);
  void zapo.connect();
});
